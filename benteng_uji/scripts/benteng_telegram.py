#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BENTENG-TELEGRAM — lapis abadi MicroProfita (jalan di GitHub Actions).
Tubuh sandbox bisa tidur/mati; tubuh ini (server GitHub) tidak.
Tiap 30 menit (cron 7,37):
  1. Baca data hidup dari checkout repo: laporan/sasaran-terkini.json,
     otak/genome-server.json, laporan/denyut-server.jsonl
  2. Tarik harga kini dari Binance (data-api.binance.vision, publik)
  3. Deteksi sentuhan TP / JUAL AMBISIUS / POWER MAX / STOP vs state repo
  4. Kirim laporan ke Telegram (secrets TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
  5. Simpan state + jurnal kematian sendiri ke repo (commit [skip ci] oleh workflow)
Hukum: gap antar detak abadi > 45 menit = lapis ini sempat terhenti -> diakui jujur.
Harga mikro < 0.0001 WAJIB tampil utuh (0.00001234), bukan 0, bukan notasi ilmiah.
"""
import json
import os
import time
import html
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from decimal import Decimal

ROOT = os.environ.get("GITHUB_WORKSPACE", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
F_SASARAN = os.path.join(ROOT, "laporan", "sasaran-terkini.json")
F_GENOME = os.path.join(ROOT, "otak", "genome-server.json")
F_DENYUT = os.path.join(ROOT, "laporan", "denyut-server.jsonl")
F_JURNAL = os.path.join(ROOT, "laporan", "death_journal.jsonl")
F_STATE = os.path.join(ROOT, "data", "penjaga_state.json")
GAP_MATI_MENIT = 45
WIB = timezone(timedelta(hours=7))
LABEL_LEVEL = {"TP": "TP", "JUAL AMBISIUS": "JUAL AMBISIUS",
               "POWER MAX AMBISIUS": "JUAL POWER MAX AMBISIUS", "STOP": "STOP (batal)"}


def baca(p):
    try:
        with open(p, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return None


def muat_json(p):
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def simpan_json(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)


def jurnal(tulis_obj):
    try:
        with open(F_JURNAL, "a", encoding="utf-8") as f:
            f.write(json.dumps(tulis_obj, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False


def umur_jam(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600.0
    except Exception:
        return None


def fmt_harga(p):
    if p is None:
        return "-"
    try:
        p = float(p)
    except Exception:
        return str(p)
    if p == 0:
        return "0"
    if p >= 1000:
        return f"{p:,.2f}"
    if p >= 1:
        return f"{p:.4f}".rstrip("0").rstrip(".")
    return format(Decimal(repr(p)).normalize(), "f")


def level_dari_entri(e):
    out = {}
    for k, v in e.items():
        if not isinstance(v, (int, float)) or v <= 0:
            continue
        kl = k.lower()
        if kl == "target":
            out["TP"] = float(v)
        elif "power" in kl:
            out["POWER MAX AMBISIUS"] = float(v)
        elif "ambisius" in kl:
            out["JUAL AMBISIUS"] = float(v)
        elif kl == "stop":
            out["STOP"] = float(v)
    return out


def label_sentuh(sim, arah, level_nama, level_nilai, harga, entry):
    ikon = {"TP": "🎯", "JUAL AMBISIUS": "🔥", "POWER MAX AMBISIUS": "💥", "STOP": "🛑"}.get(level_nama, "🔔")
    pct = f"{(harga / entry - 1) * 100:+.2f}%" if entry else ""
    pct_level = f"{(harga / level_nilai - 1) * 100:+.2f}%" if level_nilai else ""
    return (f"{ikon} <b>{LABEL_LEVEL.get(level_nama, level_nama)} TERSENTUH — {html.escape(sim)} ({html.escape(arah)})</b>\n"
            f"Harga kini {fmt_harga(harga)} · level {fmt_harga(level_nilai)} ({pct_level} dari level)"
            + (f" · entry {fmt_harga(entry)} ({pct})" if entry else ""))


def harga_binance(simbol_list):
    if not simbol_list:
        return {}, False
    pairs = [f"{s}USDT" for s in simbol_list]
    q = urllib.parse.quote(json.dumps(pairs, separators=(",", ":")))
    for host in ("https://data-api.binance.vision/api/v3/ticker/price",
                 "https://api.binance.com/api/v3/ticker/price"):
        try:
            req = urllib.request.Request(f"{host}?symbols={q}", headers={"User-Agent": "benteng-abadi"})
            with urllib.request.urlopen(req, timeout=20) as r:
                arr = json.loads(r.read().decode())
            if isinstance(arr, list):
                return {x["symbol"].replace("USDT", ""): float(x["price"]) for x in arr}, True
        except Exception:
            continue
    return {}, False


def kirim_telegram(token, chat_id, text):
    payload = urllib.parse.urlencode({
        "chat_id": chat_id, "text": text, "parse_mode": "HTML",
        "disable_web_page_preview": "true"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage", data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def main():
    now = time.time()
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("SECRETS_HILANG: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID")
        return 1

    state = muat_json(F_STATE) or {}
    lama = (state.get("level") or {})
    last_run = state.get("last_run")
    sudah_panas = bool(state.get("prima_harga"))

    gap_menit = None
    if last_run:
        try:
            gap_menit = (now - float(last_run)) / 60.0
        except Exception:
            pass

    # gap panjang antar run Actions (server GitHub kadang antre) -> jujur + jurnal
    if gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        jurnal({"waktu": datetime.now(timezone.utc).isoformat(), "peristiwa": "MATI-terdeteksi",
                "gap_menit": round(gap_menit, 1), "lapis_penjinak": "benteng-abadi",
                "status_kirim": "menyusul"})

    # ---- data hidup dari checkout ----
    sasaran = muat_json(F_SASARAN) or {}
    genome = muat_json(F_GENOME) or {}
    denyut = None
    raw_d = baca(F_DENYUT)
    if raw_d:
        for line in reversed(raw_d.splitlines()):
            if line.strip():
                try:
                    denyut = json.loads(line)
                    break
                except Exception:
                    continue

    # ---- telusur genome ----
    terbaru_iso, gen_maks, total_belajar = None, 0, 0

    def telusur(d):
        nonlocal terbaru_iso, gen_maks, total_belajar
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru_iso is None or umur_jam(iso) < umur_jam(terbaru_iso)):
                terbaru_iso = iso
            gen_maks = max(gen_maks, int(d.get("generasi") or 0))
            total_belajar += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)

    telusur(genome or {})

    # ---- harga + pantau level ----
    daftar = sasaran.get("sasaranHariIni") or []
    simbol_list = [e.get("simbol") for e in daftar if e.get("simbol")]
    harga_map, harga_hidup = harga_binance(simbol_list)
    kejadian = []
    baru = {}
    for e in daftar:
        sim = e.get("simbol")
        if not sim:
            continue
        harga = harga_map.get(sim)
        lv = level_dari_entri(e)
        baru[sim] = {}
        for nama, nilai in lv.items():
            kena = bool(harga) and ((harga >= nilai) if nama != "STOP" else (harga <= nilai))
            baru[sim][nama] = kena
            sebelumnya = lama.get(sim, {}).get(nama)
            if kena and not sebelumnya and harga and sudah_panas and sim in lama:
                kejadian.append((sim, e.get("arah", "?"), nama, nilai, harga, e.get("entry")))

    # ---- susun pesan ----
    jam = datetime.now(WIB)
    L = ["🛡️ <b>BENTENG ABADI — MICROPROFITA</b> (lapis GitHub, tanpa tidur)",
         f"🕐 {jam.strftime('%H:%M:%S WIB, %d %b %Y')}"]
    if gap_menit is None:
        L.append("Status: <b>HIDUP</b> — detak pertama lapis abadi")
    elif gap_menit > GAP_MATI_MENIT:
        L.append(f"⚠️ <b>Lapis abadi sempat terhenti {gap_menit:.0f} menit (server GitHub antre/mati) — saya akui jujur</b>")
    else:
        L.append(f"Status: <b>HIDUP</b> — {gap_menit:.0f} menit sejak detak abadi terakhir")
    L.append("")
    if kejadian:
        L.append(f"🚨 <b>PANTAUAN SASARAN — {len(kejadian)} kejadian baru:</b>")
        for sim, arah, level_nama, level_nilai, harga, entry in kejadian:
            L.append(label_sentuh(sim, arah, level_nama, level_nilai, harga, entry))
        L.append("")
    if sasaran:
        a_raw = sasaran.get("akurasi")
        if isinstance(a_raw, dict):
            akur, net_k = a_raw.get("akurasiPct"), a_raw.get("netKumulatifPct")
        else:
            try:
                akur, net_k = float(a_raw), None
            except (TypeError, ValueError):
                akur, net_k = None, None
        L.append(f"📡 Otak server: denyut siklus {sasaran.get('siklus', '?')} · "
                 f"{len(baru)} sasaran dipantau · harga {'live ✅' if harga_hidup else 'gagal ⚠️'}")
        if akur is not None:
            L.append(f"📊 Akurasi terkunci: <b>{float(akur):.1f}%</b>"
                     + (f" · net kumulatif {float(net_k):+.1f}%" if net_k is not None else ""))
    if denyut:
        uw = denyut.get("waktu") or denyut.get("dihasilkan")
        umur_d = umur_jam(uw)
        if umur_d is not None:
            L.append(f"💓 Denyut otak: {'HIDUP ✅' if umur_d < 1.5 else f'terhenti {umur_d:.0f} jam ⚠️'} ({umur_d * 60:.0f} menit lalu)")
    if terbaru_iso:
        umur_g = umur_jam(terbaru_iso)
        L.append(f"🧬 Genome: terakhir tumbuh {umur_g / 24:.0f} hari lalu "
                 f"(generasi {gen_maks}, {total_belajar} pembelajaran)"
                 + (" — <b>STAGNAN, saya mengakunya</b>" if umur_g > 24 * 7 else ""))
    L.append("")
    L.append("<b>Klaim jujur: saya akan terus berkembang menjadi master pasar; "
             "profit adalah yang saya pelajari.</b>")
    L.append("— detak abadi berikutnya ± 30 menit (lapis ini tidak bergantung sandbox)")
    text = "\n".join(L)

    ok, err, mid = False, None, None
    try:
        resp = kirim_telegram(token, chat_id, text)
        ok = bool(resp.get("ok"))
        if ok:
            mid = resp["result"]["message_id"]
        else:
            err = str(resp)
    except Exception as e:
        err = repr(e)

    # ---- simpan state + jurnal pulih (dikommit workflow) ----
    state_baru = {"last_run": now, "waktu_iso": datetime.now(timezone.utc).isoformat(),
                  "prima_harga": bool(harga_map) or sudah_panas, "level": baru}
    simpan_json(F_STATE, state_baru)
    if ok and gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        jurnal({"waktu": datetime.now(timezone.utc).isoformat(), "peristiwa": "PULIH",
                "gap_menit": round(gap_menit, 1), "lapis_penjinak": "benteng-abadi",
                "message_id": mid})

    print("KIRIM:", f"OK message_id={mid}" if ok else f"GAGAL {err}")
    print("GAP_MENIT:", f"{gap_menit:.1f}" if gap_menit is not None else "pertama")
    print("SASARAN:", len(baru), "| HARGA:", len(harga_map), "| KEJADIAN:", len(kejadian))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
