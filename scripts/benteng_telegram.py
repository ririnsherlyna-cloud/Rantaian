#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BENTENG-TELEGRAM — lapis abadi MicroProfita (rumah: repo Rantaian, jalan di GitHub Actions).
Tubuh sandbox (agent) bisa tidur/mati; tubuh ini (server GitHub) tidak bergantung sandbox.
Tiap 30 menit (cron 7,37):
  1. Baca nyawa (bot token + chat id) dari benteng/nyawa.json di repo sendiri
  2. Tarik data otak hidup dari repo Micaprofita- via raw (publik):
     laporan/sasaran-terkini.json, otak/genome-server.json, laporan/denyut-server.jsonl
  3. Tarik harga kini dari Binance (data-api.binance.vision, publik, tanpa kunci)
  4. Deteksi sentuhan TP / JUAL AMBISIUS / POWER MAX / STOP vs state detak lalu
  5. Kirim laporan jujur ke Telegram pemilik
  6. Simpan state + jurnal kematian ke repo (workflow commit [skip ci])
Hukum: gap antar detak abadi > 45 menit = lapis ini sempat terhenti -> diakui jujur.
Harga mikro < 0.0001 WAJIB tampil utuh (contoh 0.00001234), bukan 0, bukan notasi ilmiah.
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
F_NYAWA = os.path.join(ROOT, "benteng", "nyawa.json")
F_STATE = os.path.join(ROOT, "data", "penjaga_state.json")
F_JURNAL = os.path.join(ROOT, "data", "death_journal.jsonl")
F_CACHE = os.path.join(ROOT, "data")
OTAK_RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"
GAP_MATI_MENIT = 45
WIB = timezone(timedelta(hours=7))
LABEL_LEVEL = {"TP": "TP", "JUAL AMBISIUS": "JUAL AMBISIUS",
               "POWER MAX AMBISIUS": "JUAL POWER MAX AMBISIUS", "STOP": "STOP (batal)"}


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


def muat_otak(jalur, nama_cache):
    """Data otak dari repo Micaprofita- (publik); gagal jaringan -> cache detak lalu."""
    cache = os.path.join(F_CACHE, nama_cache)
    try:
        req = urllib.request.Request(f"{OTAK_RAW}/{jalur}", headers={"User-Agent": "benteng-abadi"})
        with urllib.request.urlopen(req, timeout=25) as r:
            obj = json.loads(r.read().decode("utf-8", "replace"))
        simpan_json(cache, obj)
        return obj, True
    except Exception:
        return muat_json(cache), False


def denyut_terakhir(nama_cache):
    cache = os.path.join(F_CACHE, nama_cache)
    try:
        req = urllib.request.Request(f"{OTAK_RAW}/laporan/denyut-server.jsonl",
                                     headers={"User-Agent": "benteng-abadi"})
        with urllib.request.urlopen(req, timeout=25) as r:
            lines = [l for l in r.read().decode("utf-8", "replace").splitlines() if l.strip()]
        d = json.loads(lines[-1])
        simpan_json(cache, d)
        return d, True
    except Exception:
        return muat_json(cache), False


def jurnal(tulis_obj):
    try:
        os.makedirs(os.path.dirname(F_JURNAL), exist_ok=True)
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
    nyawa = muat_json(F_NYAWA) or {}
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or nyawa.get("bot_token")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID") or str(nyawa.get("chat_id") or "")
    if not token or not chat_id:
        print("NYAWA_HILANG: token/chat tidak ditemukan")
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

    # gap panjang antar run Actions (server kadang antre) -> jujur + jurnal
    if gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        jurnal({"waktu": datetime.now(timezone.utc).isoformat(), "peristiwa": "MATI-terdeteksi",
                "gap_menit": round(gap_menit, 1), "lapis_penjinak": "benteng-abadi",
                "status_kirim": "menyusul"})

    sasaran, sasaran_hidup = muat_otak("laporan/sasaran-terkini.json", "cache_sasaran.json")
    genome, genome_hidup = muat_otak("otak/genome-server.json", "cache_genome.json")
    denyut, denyut_hidup = denyut_terakhir("cache_denyut.json")

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

    daftar = (sasaran or {}).get("sasaranHariIni") or []
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

    jam = datetime.now(WIB)
    L = ["🛡️ <b>BENTENG ABADI — MICROPROFITA</b> (lapis GitHub, tanpa tidur)",
         f"🕐 {jam.strftime('%H:%M:%S WIB, %d %b %Y')}"]
    if gap_menit is None:
        L.append("Status: <b>HIDUP</b> — detak pertama lapis abadi (benteng terpasang)")
    elif gap_menit > GAP_MATI_MENIT:
        L.append(f"⚠️ <b>Lapis abadi sempat terhenti {gap_menit:.0f} menit (server GitHub antre) — saya akui jujur</b>")
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
        segar = "live" if sasaran_hidup else "cache"
        L.append(f"📡 Otak server ({segar}): denyut siklus {sasaran.get('siklus', '?')} · "
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
    print("OTAK_HIDUP:", sasaran_hidup, genome_hidup, denyut_hidup)
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
