#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GALI-ATH v1 (V308, 2 Nov 2026) — ORGAN PENCARUAN MENDALAM KOIN RUNTUH
ATH SEJARAH -80%..-100%.

Sebab lahir (pertanggungjawaban kepada pemilik, 2 Nov): riset runtuh ATH
v10.1 pernah hidup (universe 1013, kandidat 297, hidup 285), lalu tersesat
ketika wasiat #1 (daftar ATH harus kejadian naik KINI, diukur puncak 7 hari)
ditafsir terlalu jauh sampai koin yang runtuhnya kejadian masa lalu tidak
pernah dilaporkan lagi — pipeline menyusut ke ~2 kandidat/hari. Pemilik
menagih "pencaruan mendalam koin penurunan ATH 80-100%". Organ ini MEMISAHKAN
dua produk supaya aturan tak lagi memakan risetnya:
  1) Daftar ATH-NAIK      : tetap ath_cepat (puncak 7 hari) — wasiat #1 utuh.
  2) GALI-ATH (organ ini) : riset populasi runtuh sejarah — ATH diambil dari
    maksimum candle MINGGUAN (~15 tahun), bukan untuk daftar ATH naik melainkan
    pemetaan: kedalaman runtuh, umur puncak, denyut volume vs era puncak,
    klasifikasi mayat/denyut/luka-baru. BUKAN sinyal beli.
Digali otomatis tiap 24 jam dari heartbeat (V308). Jurnal:
data/gali_ath_journal.jsonl · state: data/gali_ath_terakhir.json
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
    d = ambil(f"https://api.binance.com/api/v3/klines?symbol={sym}&interval=1w&limit=800")
    return [(int(k[0]) / 1000, float(k[2]), float(k[4]), float(k[7])) for k in d]  # t, high, close, qvol


def lilin_gate(sym):
    pair = sym.replace("USDT", "_USDT")
    d = ambil(f"https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair={pair}&interval=1w&limit=800")
    out = []
    for k in d:
        hi = max(float(k[3]), float(k[5]), float(k[2]))  # high vs open vs close
        out.append((int(k[0]), hi, float(k[2]), float(k[6])))
    return out


def lilin_mexc(sym):
    d = ambil(f"https://api.mexc.com/api/v3/klines?symbol={sym}&interval=1w&limit=800")
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


def analisa(sym, c):
    puncak_i = max(range(len(c)), key=lambda i: c[i][1])
    ath = c[puncak_i][1]
    dasar = "high"
    maks_close = max(x[2] for x in c)
    if maks_close > 0 and ath > 20 * maks_close:
        # lilin kotor (glitch tinggi tidak masuk akal vs seluruh sejarah close)
        # -> puncak berbasis close (lebih awet) supaya kedalaman runtuh jujur
        puncak_i = max(range(len(c)), key=lambda i: c[i][2])
        ath = c[puncak_i][2]
        dasar = "close"
    kini = c[-1][2]
    dd = (kini / ath - 1.0) * 100.0
    mgg_puncak = (c[-1][0] - c[puncak_i][0]) / 604800.0
    era = [c[i][3] for i in range(max(0, puncak_i - 2), min(len(c), puncak_i + 3))]
    vol_era = sum(era) / len(era) if era else 0.0
    vol_kini = sum(x[3] for x in c[-4:]) / 4.0
    rasio = (vol_kini / vol_era) if vol_era > 0 else None
    zona = "99" if dd <= -99 else ("90" if dd <= -90 else ("80" if dd <= -80 else None))
    return {"simbol": sym, "ath": ath, "kini": kini, "dd": dd, "mgg": mgg_puncak,
            "rasio": rasio, "zona": zona, "dasar": dasar,
            "denyut": bool(rasio is not None and rasio >= 1.5),
            "mayat": bool(rasio is not None and rasio < 0.3),
            "luka_baru": bool(mgg_puncak <= 13)}


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
        # coba sekali lagi simbol gagal (gangguan jaringan/418 sementara)
        gagal_pertama = [h[0] for h in hasil if h[1] is None]
        if gagal_pertama:
            ulang = dict(zip(gagal_pertama, ex.map(gali_satu, gagal_pertama)))
            hasil = [ulang.get(h[0], h) if h[1] is None else h for h in hasil]
    baris, hit_sumber, gagal, gagal_list = [], {}, 0, []
    for sym, c, nama, err in hasil:
        if c is None:
            gagal += 1
            gagal_list.append(sym)
            continue
        hit_sumber[nama] = hit_sumber.get(nama, 0) + 1
        baris.append(analisa(sym, c))
    zona99 = [b for b in baris if b["zona"] == "99"]
    zona90 = [b for b in baris if b["zona"] == "90"]
    zona80 = [b for b in baris if b["zona"] == "80"]
    terdalam = sorted(zona99 + zona90 + zona80, key=lambda b: b["dd"])[:7]
    denyut = sorted([b for b in zona80 + zona90 + zona99 if b["denyut"]],
                    key=lambda b: -(b["rasio"] or 0))[:3]
    mayat = sum(1 for b in zona80 + zona90 + zona99 if b["mayat"])
    luka = sum(1 for b in zona80 + zona90 + zona99 if b["luka_baru"])
    total_zona = len(zona80) + len(zona90) + len(zona99)
    n = len(baris)

    from datetime import datetime, timezone, timedelta
    jam_wib = datetime.now(timezone(timedelta(hours=7))).strftime("%d %b %Y %H:%M")
    L = [f"⛏️ <b>GALI-ATH v1 — PENCARUAN MENDALAM (V308)</b>",
         f"<b>Koin runtuh -80%..-100% dari ATH sejarah</b>",
         f"📅 {jam_wib} WIB · 🔬 {n} simbol terbaca / {len(univ)} (candle mingguan ~15 th; sumber: " +
         ", ".join(f"{k} {v}" for k, v in sorted(hit_sumber.items())) +
         (f" · gagal {gagal}" if gagal else "") + ")",
         f"📊 ZONA: ≥99%: <b>{len(zona99)}</b> · 90-99%: <b>{len(zona90)}</b> · 80-90%: <b>{len(zona80)}</b> "
         f"→ total <b>{total_zona}/{n}</b> ({(total_zona / n * 100):.0f}% populasi)",
         f"❤️ Denyut volume kembali (≥1.5× era puncak): <b>{sum(1 for b in zona80+zona90+zona99 if b['denyut'])}</b> koin",
         f"🪦 Mayat senyap (&lt;0.3× era puncak): <b>{mayat}</b> · 🩸 luka baru (puncak ≤13 mgg): <b>{luka}</b>",
         "", "<b>TERDALAM 7:</b>"]
    for b in terdalam:
        rasio_s = ("&gt;100×" if (b["rasio"] or 0) > 100 else
                   ("≈0×" if (b["rasio"] or 0) < 0.05 else f"{b['rasio']:.1f}×")) \
            if b["rasio"] is not None else "?"
        L.append(f"• <b>{b['simbol'].replace('USDT','')}</b> <b>{b['dd']:.1f}%</b> — ATH ${fmt_harga(b['ath'])} → "
                 f"${fmt_harga(b['kini'])} · puncak {b['mgg']:.0f} mgg lalu · vol {rasio_s} era puncak")
    L += ["", "<b>🔥 DENYUT (runtuh dalam + volume pulang):</b>"]
    if denyut:
        for b in denyut:
            r = b["rasio"] or 0
            L.append(f"• <b>{b['simbol'].replace('USDT','')}</b> {b['dd']:.1f}% · vol "
                     f"<b>{('&gt;100×' if r > 100 else f'{r:.1f}×')}</b> era puncak")
    else:
        L.append("• (belum ada di zona runtuh yang volumenya menyala minggu ini)")
    L += ["",
          "⚖️ Jujur: pemetaan data, BUKAN sinyal beli. Daftar ATH-NAIK tetap ath_cepat puncak 7 hari (wasiat #1); "
          "organ ini riset populasi runtuh sejarah — kini digali otomatis tiap 24 jam.",
          "🩺 \"Mati lama ≠ murah; volume adalah denyut nyawa.\""]
    teks = "\n".join(L)

    state = {"ts": time.time(), "sumber": sumber, "universe": len(univ), "terbaca": n,
             "zona99": len(zona99), "zona90": len(zona90), "zona80": len(zona80),
             "total_zona": total_zona, "denyut": sum(1 for b in zona80+zona90+zona99 if b['denyut']),
             "mayat": mayat, "luka_baru": luka, "gagal": gagal, "gagal_list": gagal_list,
             "detik": round(time.time() - t0, 1)}
    with open(F_STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)
    with open(F_JURNAL, "a", encoding="utf-8") as f:
        f.write(json.dumps({**state, "terdalam": [{"s": b["simbol"], "dd": round(b["dd"], 2)} for b in terdalam],
                            "denyut_list": [b["simbol"] for b in denyut]}, ensure_ascii=False) + "\n")

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

    print(f"GALI-ATH v1 ({sumber}): univ {len(univ)} terbaca {n} gagal {gagal} | zona99 {len(zona99)} "
          f"zona90 {len(zona90)} zona80 {len(zona80)} total {total_zona} | denyut {state['denyut']} mayat {mayat} "
          f"luka_baru {luka} | {state['detik']}s | sumber {hit_sumber} | kirim={'msg ' + str(msg_id) if msg_id else ('GAGAL' if kirim else 'cetak-saja')}")
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
