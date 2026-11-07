#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GALI-ATH v2 (7 Nov 2026) — TURUN DARI PUNCAK SEGAR (KEJADIAN MASA KINI).

Sebab lahir v2 (keluhan pemilik 7 Nov): "daftar ath turun dari tahun lama...
maksud saya yang terjadi di hari ini, misal ada yang turun dari ATH hari ini;
bukan ATH tertinggi dari semua waktu, tapi ATH yang turun saat ini terjadi."
v1 memang riset ATH SEJARAH (lilin mingguan ~15 th, puncak bisa ratusan minggu
lalu) — sesuai mandat lama, tapi bukan yang dimaksud pemilik sekarang.

ATURAN BARU v2 (hukum pemilik 7 Nov):
  • Puncak = high tertinggi 30 lilin HARIAN terakhir, umur puncak WAJIB <= 7
    hari. Puncak lebih tua = kejadian sudah lampau -> TIDAK dilaporkan.
  • Penurunan diukur dari puncak segar itu ke harga KINI (ticker live), ambang
    lapor -10%; puncak tanggal dicantumkan agar bisa dicocokkan ke grafik.
  • Bukan sinyal beli — pemetaan kejadian sedang berjalan.
Digali otomatis tiap 24 jam dari heartbeat (hook tetap: jalankan/gali_due).
Jurnal: data/gali_ath_journal.jsonl · state: data/gali_ath_terakhir.json
"""
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = "/home/z/my-project"
DATA = os.path.join(ROOT, "data")
F_STATE = os.path.join(DATA, "gali_ath_terakhir.json")
F_JURNAL = os.path.join(DATA, "gali_ath_journal.jsonl")
F_TOKEN = os.path.join(ROOT, ".token-telegram")
F_CHAT = os.path.join(DATA, "telegram_chat_id")
UMUR_KIRIM = 86400  # 1x per 24 jam

PUNCAK_LILIN = 30      # jendela lilin harian utk mencari puncak kejadian
PUNCAK_UMUR_MAKS = 7   # hari; puncak lebih tua = kejadian lampau, dibuang
TURUN_MIN = 10.0       # % minimum dari puncak segar untuk dilaporkan

HDR = {"User-Agent": "microprofita-gali/1.0", "Accept": "application/json"}


def ambil(url, timeout=12):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=timeout) as r:
        return json.loads(r.read().decode())


def muat_universe():
    sim = set()
    try:
        z = json.load(open(os.path.join(DATA, "zai_picks_last.json")))
        for p in z.get("picks") or []:
            s = (p.get("simbol") if isinstance(p, dict) else p) or ""
            if s.endswith("USDT"):
                sim.add(s)
    except Exception:
        pass
    try:
        s = json.load(open(os.path.join(DATA, "remote_sasaran.json")))
        for e in (s.get("sasaranHariIni") or []):
            q = (e.get("simbol") or "")
            if q.endswith("USDT"):
                sim.add(q)
    except Exception:
        pass
    sim.discard("XAUUSDT")
    return sorted(sim)


def lilin_binance(sym):
    d = ambil(f"https://api.binance.com/api/v3/klines?symbol={sym}&interval=1d&limit={PUNCAK_LILIN}")
    return [(int(k[0]) / 1000, float(k[2]), float(k[4]), float(k[7])) for k in d]  # t, high, close, qvol


def lilin_gate(sym):
    pair = sym.replace("USDT", "_USDT")
    d = ambil(f"https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair={pair}&interval=1d&limit={PUNCAK_LILIN}")
    out = []
    for k in d:
        hi = max(float(k[3]), float(k[5]), float(k[2]))  # high vs open vs close
        out.append((int(k[0]), hi, float(k[2]), float(k[6])))
    return out


def lilin_mexc(sym):
    d = ambil(f"https://api.mexc.com/api/v3/klines?symbol={sym}&interval=1d&limit={PUNCAK_LILIN}")
    return [(int(k[0]) / 1000, float(k[2]), float(k[4]), float(k[7])) for k in d]


SUMBER = [("binance", lilin_binance), ("gate", lilin_gate), ("mexc", lilin_mexc)]


def gali_satu(sym):
    terakhir = "tak terbaca"
    for nama, fn in SUMBER:
        try:
            c = fn(sym)
            if len(c) >= 8:
                return sym, c, nama, None
            terakhir = f"{nama} lilin<8"
        except Exception as e:
            terakhir = f"{nama}: {repr(e)[:60]}"
    return sym, None, "gagal", terakhir


def harga_kini_map():
    """Ticker live semua simbol Binance spot (1 panggilan); fallback kline close."""
    try:
        arr = ambil("https://api.binance.com/api/v3/ticker/price", 15)
        return {x["symbol"]: float(x["price"]) for x in arr if x.get("price")}
    except Exception:
        return {}


def analisa(sym, c, px):
    puncak_i = max(range(len(c)), key=lambda i: c[i][1])
    peak = c[puncak_i][1]
    umur = len(c) - 1 - puncak_i
    if umur > PUNCAK_UMUR_MAKS:
        return {"simbol": sym, "kejadian": False, "alasan": "puncak lampau",
                "umur": umur}
    kini = px.get(sym) or c[-1][2]
    dd = (kini / peak - 1.0) * 100.0 if (kini and peak) else 0.0
    tgl = time.strftime("%d %b", time.gmtime(c[puncak_i][0] + 7 * 3600))  # +7 = WIB
    era = [c[i][3] for i in range(max(0, puncak_i - 2), min(len(c), puncak_i + 3))]
    vol_era = sum(era) / len(era) if era else 0.0
    vol_kini = sum(x[3] for x in c[-3:]) / 3.0
    rasio = (vol_kini / vol_era) if vol_era > 0 else None
    return {"simbol": sym, "kejadian": True, "peak": peak, "kini": kini, "dd": dd,
            "umur": umur, "tgl": tgl, "rasio": rasio,
            "panik": bool(rasio is not None and rasio >= 1.5),
            "sepi": bool(rasio is not None and rasio < 0.5)}


def fmt_harga(p):
    if p >= 100:
        return f"{p:,.2f}"
    if p >= 1:
        return f"{p:.4f}"
    if p >= 0.01:
        return f"{p:.6f}"
    s = f"{p:.12f}".rstrip("0")
    return s if len(s.split(".")[-1]) >= 8 else f"{p:.8f}"


def jalankan(sumber="manual", kirim=True):
    t0 = time.time()
    univ = muat_universe()
    if not univ:
        univ = ["BTCUSDT", "ETHUSDT"]
    with ThreadPoolExecutor(max_workers=8) as ex:
        hasil = list(ex.map(gali_satu, univ))
        gagal_pertama = [h[0] for h in hasil if h[1] is None]
        if gagal_pertama:
            ulang = dict(zip(gagal_pertama, ex.map(gali_satu, gagal_pertama)))
            hasil = [ulang.get(h[0], h) if h[1] is None else h for h in hasil]
    px = harga_kini_map()
    baris, hit_sumber, gagal, gagal_list, lampau, sukses = [], {}, 0, [], 0, 0
    for sym, c, nama, err in hasil:
        if c is None:
            gagal += 1
            gagal_list.append(sym)
            continue
        hit_sumber[nama] = hit_sumber.get(nama, 0) + 1
        sukses += 1
        r = analisa(sym, c, px)
        if not r.get("kejadian"):
            lampau += 1
            continue
        baris.append(r)
    turun = sorted([b for b in baris if b["dd"] <= -TURUN_MIN], key=lambda b: b["dd"])
    terdalam = turun[:10]
    n = sukses

    from datetime import datetime, timezone, timedelta
    jam_wib = datetime.now(timezone(timedelta(hours=7))).strftime("%d %b %Y %H:%M")
    L = ["📉 <b>GALI-ATH v2 — TURUN DARI PUNCAK SEGAR (KEJADIAN KINI)</b>",
         f"<b>Puncak ≤{PUNCAK_UMUR_MAKS} hari terakhir; bukan ATH sejak listing</b> (hukum pemilik 7 Nov)",
         f"📅 {jam_wib} WIB · 🔬 {n} simbol terbaca / {len(univ)} (sumber: " +
         ", ".join(f"{k} {v}" for k, v in sorted(hit_sumber.items())) +
         (f" · gagal {gagal}" if gagal else "") +
         f") · ⏳ {lampau} koin puncaknya sudah lampau (tidak dilaporkan)",
         f"🎯 Sedang turun ≥{TURUN_MIN:.0f}% dari puncak segar: <b>{len(turun)}</b> koin",
         "", "<b>TERDALAM dulu (maks 10):</b>"]
    if terdalam:
        for b in terdalam:
            rasio_s = ""
            if b["rasio"] is not None:
                r = b["rasio"]
                rasio_s = (" · vol 🔥 " + ("&gt;100×" if r > 100 else f"{r:.1f}×") + " era puncak (kepanikan)"
                           if b["panik"] else (" · vol sepi " + f"{r:.1f}× era puncak" if b["sepi"] else ""))
            tanda_hari = " · <b>puncak HARI INI</b>" if b["umur"] == 0 else ""
            L.append(f"• <b>{b['simbol'].replace('USDT','')}</b> <b>{b['dd']:.1f}%</b> — puncak {fmt_harga(b['peak'])} "
                     f"(lilin {b['tgl']}, {b['umur']} hari lalu{tanda_hari}) → kini {fmt_harga(b['kini'])}{rasio_s}")
    else:
        L.append("• (belum ada yang turun ≥10% dari puncak ≤7 hari — jujur, kosong lebih baik daripada mengarang kejadian)")
    L += ["",
          "⚖️ Jujur: puncak = high tertinggi 30 lilin harian terakhir, umur wajib ≤7 hari — puncak lebih tua "
          "(ATH 2021 dll) TIDAK dilaporkan lagi sesuai keluhan pemilik 7 Nov. Pemetaan kejadian sedang berjalan, "
          "BUKAN sinyal beli. Organ lama 'runtuh ATH sejarah −80..−100%' (v1) dipensiunkan; riset -80..-100% "
          "kejadian-kini tetap hidup di laporan ATH harian (v10.7/v10.8).",
          "🩺 \"Yang dilaporkan hanya yang sedang terjadi — bukan luka lama.\""]
    teks = "\n".join(L)

    state = {"ts": time.time(), "versi": 2, "sumber": sumber, "universe": len(univ), "terbaca": n,
             "turun_kini": len(turun), "puncak_lampau": lampau,
             "terdalam": [{"s": b["simbol"], "dd": round(b["dd"], 2)} for b in terdalam],
             "gagal": gagal, "gagal_list": gagal_list, "detik": round(time.time() - t0, 1)}
    with open(F_STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)
    with open(F_JURNAL, "a", encoding="utf-8") as f:
        f.write(json.dumps(state, ensure_ascii=False) + "\n")

    msg_id = None
    if kirim:
        try:
            token = open(F_TOKEN).read().strip()
            chat = open(F_CHAT).read().strip()
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{token}/sendMessage",
                data=json.dumps({"chat_id": chat, "text": teks, "parse_mode": "HTML",
                                 "disable_web_page_preview": True}).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=20) as r:
                j = json.loads(r.read().decode())
            msg_id = (j.get("result") or {}).get("message_id")
        except Exception as e:
            with open(os.path.join(DATA, "send_failures"), "a", encoding="utf-8") as f:
                f.write(f"{time.time()}|gali_ath:{repr(e)[:120]}\n")

    print(f"GALI-ATH v2 ({sumber}): univ {len(univ)} terbaca {n} gagal {gagal} | turun_kini {len(turun)} "
          f"puncak_lampau {lampau} | {state['detik']}s | sumber {hit_sumber} | "
          f"kirim={'msg ' + str(msg_id) if msg_id else ('GAGAL' if kirim else 'cetak-saja')}")
    return state, teks


def gali_due():
    try:
        d = json.load(open(F_STATE))
        return (time.time() - d.get("ts", 0)) > UMUR_KIRIM
    except Exception:
        return True


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "--kirim"
    st, tx = jalankan(sumber="manual", kirim=(mode == "--kirim"))
    if mode == "--cetak":
        print("---- TEKS ----")
        print(tx)
