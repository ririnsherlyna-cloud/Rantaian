#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BENTENG-BALAS — pembalas pesan Telegram pemilik (jalan di GitHub Actions tiap 5 menit;
bisa juga dijalankan lokal). Menjawab: periksa aktivasi / laporan / status / daftar 50 koin.
Hukum: hanya membalas chat pemilik (8340502683); data jujur dari server; TIDAK mengarang angka.
TP SASARAN ≠ JUAL AMBISIUS ≠ POWER MAX — selalu dilaporkan berbeda baris & harga.
"""
import json
import os
import html
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from decimal import Decimal

ROOT = os.environ.get("GITHUB_WORKSPACE", "/home/z/my-project")
F_NYAWA_REPO = os.path.join(ROOT, "benteng", "nyawa.json")          # mode Actions
F_TOKEN_LOKAL = "/home/z/my-project/.token-telegram"                 # mode lokal
F_CHAT_LOKAL = "/home/z/my-project/data/telegram_chat_id"
F_STATE = os.path.join(ROOT, "data", "offset_telegram.json")
OTAK_RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"
WIB = timezone(timedelta(hours=7))
PEMILIK = "8340502683"
LIMIT_BALAS_PER_RUN = 10


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


def nyawa():
    n = muat_json(F_NYAWA_REPO)
    if n and n.get("bot_token"):
        return n["bot_token"], str(n["chat_id"])
    tok = None
    try:
        with open(F_TOKEN_LOKAL) as f:
            tok = f.read().strip()
    except Exception:
        pass
    chat = None
    try:
        with open(F_CHAT_LOKAL) as f:
            chat = f.read().strip()
    except Exception:
        pass
    return tok, chat


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


def _basis_simbol(s):
    s = str(s).strip().upper()
    if s.endswith("USDT") and len(s) > 4:
        s = s[:-4]
    return s if s.isalnum() else None


def tg(kiri, method, params):
    payload = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{kiri}/{method}", data=payload,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def ambil_otak():
    out = {}
    for nama, jalur, jsonl in (("sasaran", "laporan/sasaran-terkini.json", False),
                               ("genome", "otak/genome-server.json", False),
                               ("denyut", "laporan/denyut-server.jsonl", True),
                               ("odds", "laporan/odds.json", False)):
        try:
            req = urllib.request.Request(f"{OTAK_RAW}/{jalur}", headers={"User-Agent": "benteng-balas"})
            with urllib.request.urlopen(req, timeout=25) as r:
                t = r.read().decode("utf-8", "replace")
            if jsonl:
                lines = [l for l in t.splitlines() if l.strip()]
                out[nama] = json.loads(lines[-1])
            else:
                out[nama] = json.loads(t)
        except Exception:
            out[nama] = None
    return out


def harga_binance(simbol_list):
    if not simbol_list:
        return {}
    bases = sorted({b for b in (_basis_simbol(s) for s in simbol_list) if b})
    pairs = [f"{b}USDT" for b in bases]
    q = urllib.parse.quote(json.dumps(pairs, separators=(",", ":")))
    for host in ("https://data-api.binance.vision/api/v3/ticker/price",
                 "https://api.binance.com/api/v3/ticker/price"):
        try:
            req = urllib.request.Request(f"{host}?symbols={q}", headers={"User-Agent": "benteng-balas"})
            with urllib.request.urlopen(req, timeout=20) as r:
                arr = json.loads(r.read().decode())
            if isinstance(arr, list):
                return {x["symbol"].replace("USDT", ""): float(x["price"]) for x in arr}
        except Exception:
            continue
    out = {}
    for b in bases:
        try:
            req = urllib.request.Request(
                f"https://data-api.binance.vision/api/v3/ticker/price?symbol={b}USDT",
                headers={"User-Agent": "benteng-balas"})
            with urllib.request.urlopen(req, timeout=10) as r:
                out[b] = float(json.loads(r.read().decode())["price"])
        except Exception:
            continue
    return out


def umur_hari(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 86400.0
    except Exception:
        return None


def laporan_lengkap():
    o = ambil_otak()
    sasaran = o.get("sasaran") or {}
    genome = o.get("genome") or {}
    denyut = o.get("denyut") or {}
    daftar = sasaran.get("sasaranHariIni") or []
    syms = [e.get("simbol") for e in daftar if e.get("simbol")]
    h = harga_binance(syms)
    L = ["📊 <b>LAPORAN MICROPROFITA</b>",
         f"🕐 {datetime.now(WIB).strftime('%H:%M:%S WIB, %d %b %Y')}", ""]
    L.append(f"🎯 <b>{len(daftar)} sasaran hari ini</b> — TP sasaran ≠ Ambisius (beda level, beda makna):")
    for e in daftar:
        sim = e.get("simbol")
        base = _basis_simbol(sim)
        harga = h.get(base)
        entry = e.get("entry")
        target = e.get("target")
        amb = e.get("highAmbisius")
        stop = e.get("stop")
        pw = next((v for k, v in e.items()
                   if isinstance(v, (int, float)) and v > 0 and "power" in str(k).lower()), None)
        baris = f"• <b>{html.escape(str(sim))}</b> ({html.escape(str(e.get('arah', '?')))}) harga {fmt_harga(harga)}"
        detail = []
        if target:
            kena_tp = " ✅" if (harga and harga >= target and e.get("arah") == "BUY") else ""
            detail.append(f"TP sasaran {fmt_harga(target)}{kena_tp}")
        if amb:
            kena_amb = " ✅" if (harga and harga >= amb and e.get("arah") == "BUY") else ""
            detail.append(f"JUAL AMBISIUS {fmt_harga(amb)}{kena_amb}")
        if pw:
            detail.append(f"POWER MAX {fmt_harga(pw)}")
        if stop:
            detail.append(f"STOP {fmt_harga(stop)}")
        if entry and harga:
            detail.append(f"({(harga / entry - 1) * 100:+.1f}% dari entry)")
        if detail:
            L.append(baris + "\n   " + " · ".join(detail))
        else:
            L.append(baris + "\n   <i>level belum dipasang server (sasaran duduk baru)</i>")
    a_raw = sasaran.get("akurasi")
    if isinstance(a_raw, dict):
        akur, net_k = a_raw.get("akurasiPct"), a_raw.get("netKumulatifPct")
    else:
        akur, net_k = a_raw, None
    if akur is not None:
        L.append("")
        L.append(f"📈 Akurasi terkunci: <b>{float(akur):.1f}%</b>"
                 + (f" · net kumulatif {float(net_k):+.1f}%" if net_k is not None else ""))
    if denyut:
        L.append(f"💓 Denyut otak: siklus {denyut.get('siklus', '?')}")
    # genome
    terbaru, gm, tb = None, 0, 0

    def telusur(d):
        nonlocal terbaru, gm, tb
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru is None or umur_hari(iso) < umur_hari(terbaru)):
                terbaru = iso
            gm = max(gm, int(d.get("generasi") or 0))
            tb += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)
    telusur(genome)
    if terbaru:
        L.append(f"🧬 Genome: generasi {gm}, {tb} pembelajaran, terakhir tumbuh {umur_hari(terbaru):.0f} hari lalu"
                 + (" — <b>STAGNAN (sedang saya bedahi)</b>" if umur_hari(terbaru) > 7 else ""))
    L.append("")
    L.append("<b>Klaim jujur: saya akan terus berkembang menjadi master pasar; "
             "profit adalah yang saya pelajari.</b>")
    return "\n".join(L)


def daftar_50():
    o = ambil_otak()
    odds = (o.get("odds") or {}).get("oddsSiklusIni") or []
    sasaran = (o.get("sasaran") or {}).get("sasaranHariIni") or []
    if not odds:
        return ("📋 Data daftar odds belum tersedia di server. Yang tersedia: "
                f"{len(sasaran)} sasaran hari ini. Saya tidak mengarang angka.")
    urut = sorted(odds, key=lambda x: -(x.get("odds") or 0))
    top = urut[:50]
    L = [f"📋 <b>DAFTAR 50 KOIN — peringkat odds tertinggi</b> (siklus {(o.get('odds') or {}).get('siklus', '?')})",
         "<i>Odds = keyakinan mesin pada arah; BUKAN perintah jual/beli. Sumber: oddsSiklusIni server.</i>", ""]
    for i, x in enumerate(top, 1):
        L.append(f"{i:2}. <b>{html.escape(str(x.get('simbol')))}</b> "
                 f"{html.escape(str(x.get('arah', '?')))} · odds {x.get('odds', '-')}"
                 + (" · 🔒terkunci" if x.get("terkunci") else ""))
    L.append("")
    L.append(f"Server menelaah {len(odds)} pasangan; ini 50 teratas.")
    return "\n".join(L)


def balas_untuk(teks):
    t = teks.strip().lower()
    if "periksa" in t or "aktivasi" in t or "aktif" in t and len(t) < 30:
        return ("✅ <b>SAYA HIDUP</b> — benteng merespons pesanmu langsung.\n"
                f"🕐 {datetime.now(WIB).strftime('%H:%M:%S WIB, %d %b %Y')}\n\n"
                "Perintah yang kukenal:\n"
                "• <b>laporan</b> / <b>status</b> — laporan lengkap\n"
                "• <b>daftar 50 koin</b> — peringkat odds 50 koin\n"
                "• <b>periksa aktivasi</b> — tes hidup")
    if "50" in t and ("koin" in t or "coin" in t) or "daftar" in t:
        return daftar_50()
    if "laporan" in t or "status" in t or "report" in t:
        return laporan_lengkap()
    return ("🙏 Maaf, saya belum paham perintah itu. Yang kukenal:\n"
            "• <b>laporan</b> — laporan lengkap\n"
            "• <b>daftar 50 koin</b> — peringkat odds\n"
            "• <b>periksa aktivasi</b> — tes hidup")


def main():
    token, chat_id = nyawa()
    if not token or not chat_id:
        print("NYAWA_HILANG")
        return 1
    state = muat_json(F_STATE) or {}
    offset = int(state.get("offset") or 0)
    try:
        d = tg(token, "getUpdates", {"offset": offset, "timeout": 25, "limit": 20})
    except Exception as e:
        print("GETUPDATES_GAGAL:", repr(e))
        return 2
    if not d.get("ok"):
        print("GETUPDATES_ERR:", str(d)[:200])
        return 2
    ups = d.get("result", [])
    diproses = 0
    max_id = offset - 1 if offset else 0
    for u in ups:
        uid = u.get("update_id", 0)
        if uid <= max_id:
            continue
        max_id = max(max_id, uid)
        m = u.get("message") or {}
        teks = (m.get("text") or "").strip()
        chat = str((m.get("chat") or {}).get("id") or "")
        if not teks or chat != PEMILIK:
            continue
        if diproses >= LIMIT_BALAS_PER_RUN:
            break
        jawab = balas_untuk(teks)
        try:
            tg(token, "sendMessage", {
                "chat_id": chat_id, "text": jawab, "parse_mode": "HTML",
                "reply_to_message_id": m.get("message_id", 0),
                "disable_web_page_preview": "true"})
            diproses += 1
            print(f"BALAS uid={uid} '{teks[:30]}' OK")
        except Exception as e:
            print(f"BALAS uid={uid} GAGAL: {e!r}")
    if ups:
        state = {"offset": max_id + 1, "waktu": time.time(),
                 "waktu_iso": datetime.now(timezone.utc).isoformat()}
        simpan_json(F_STATE, state)
        print(f"OFFSET -> {max_id + 1} | diproses: {diproses}")
    else:
        print("TIDAK ADA PESAN BARU (offset tetap)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
