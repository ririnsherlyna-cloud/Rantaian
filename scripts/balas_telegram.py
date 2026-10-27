#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BENTENG-BALAS v7 "BOT-CHAT" — pembalas pesan Telegram pemilik MicroProfita.
Dua tempat jalan sekaligus (doktrin benteng-total):
  1. GitHub Actions tiap 5 menit (lapis abadi — selalu hidup walau sandbox tidur)
  2. Sandbox lokal: mode --jaga (loop 10 detik) + --sekali (tiap kunjungan cron)
     -> balasan DETIK-DETIK saat tubuh hidup; Actions menutup sisa waktunya.

v7 (28 Okt) — respons keluhan pemilik "bot lambat & tidak tanggap":
  + PERINTAH LENGKAP: /start /menu /status /laporan /harga <koin> /sasaran
    /peluang /akurasi /bantuan — plus teks bebas ("harga btc", "menu", dst)
  + TOMBOL INLINE (menu profesional, callback dijawab + pesan diedit di tempat)
  + CEPAT: data otak & harga diambil PARALEL (thread) + cache TTL 60s,
    typing indicator segera, long-poll singkat (8s) agar tak tabrak Actions
  + TAHAN BANTING: offset selalu dicocokkan dengan repo (rollback disk lokal
    tak membuat bot membalas ulang pesan lama); 429/409 ditangani sopan
  + JUJUR: setiap jawaban diberi label sumber & umur data; TIDAK mengarang angka
Hukum tetap: hanya membalas chat pemilik (8340502683);
TP SASARAN ≠ JUAL AMBISIUS ≠ POWER MAX ≠ STOP — selalu beda baris & beda makna.
"""
import json
import os
import re
import html
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor

ROOT = os.environ.get("GITHUB_WORKSPACE", "/home/z/my-project")
F_NYAWA_REPO = os.path.join(ROOT, "benteng", "nyawa.json")      # mode Actions
F_TOKEN_LOKAL = "/home/z/my-project/.token-telegram"            # mode lokal
F_CHAT_LOKAL = "/home/z/my-project/data/telegram_chat_id"
F_STATE = os.path.join(ROOT, "data", "offset_telegram.json")
REPO = "ririnsherlyna-cloud/Rantaian"
REPO_RAW = f"https://raw.githubusercontent.com/{REPO}/main"
REPO_API = f"https://api.github.com/repos/{REPO}/contents"
OTAK_RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"
ZAI_RAW = f"{REPO_RAW}/benteng/sasaran-zai.json"
WIB = timezone(timedelta(hours=7))
PEMILIK = "8340502683"
LIMIT_BALAS_PER_RUN = 20
TTL_OTAK = 60.0
JAGA_INTERVAL = 10
LONG_POLL = {"actions": 25, "jaga": 8}

_g = {"otak": None, "otak_at": 0.0, "token_rantaian": None,
      "offset_repo": None, "offset_repo_at": 0.0}


def sekarang_wib():
    return datetime.now(WIB).strftime("%H:%M:%S WIB, %d %b %Y")


def muat_json(p):
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def simpan_json(p, obj):
    try:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
    except Exception:
        pass


def nyawa():
    n = muat_json(F_NYAWA_REPO)
    if n and n.get("bot_token"):
        return n["bot_token"], str(n["chat_id"])
    tok = chat = None
    try:
        with open(F_TOKEN_LOKAL) as f:
            tok = f.read().strip()
    except Exception:
        pass
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


def fmt_pct(v):
    return f"{v:+.2f}%" if isinstance(v, (int, float)) else "-"


def _basis_simbol(s):
    s = str(s).strip().upper()
    if s.endswith("USDT") and len(s) > 4:
        s = s[:-4]
    return s if s.isalnum() else None


def umur_jam(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600.0
    except Exception:
        return None


def _token_rantaian():
    if _g["token_rantaian"]:
        return _g["token_rantaian"]
    try:
        with open("/home/z/my-project/.token-rantaian") as f:
            _g["token_rantaian"] = f.read().strip()
    except Exception:
        _g["token_rantaian"] = os.environ.get("GITHUB_TOKEN", "")
    return _g["token_rantaian"]


# ---------------------------------------------------------------- TELEGRAM --
def tg(token, method, params, coba=2):
    """Panggil API Telegram; 429 menunggu retry_after; 409 dilempar khusus."""
    payload = urllib.parse.urlencode(params).encode()
    terakhir = None
    for i in range(coba + 1):
        try:
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{token}/{method}", data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"})
            with urllib.request.urlopen(req, timeout=35) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            if e.code == 409:
                raise
            if e.code == 429 and i < coba:
                try:
                    wait = float(json.loads(body).get("parameters", {}).get("retry_after", 3))
                except Exception:
                    wait = 3
                time.sleep(min(wait + 1, 15))
                continue
            terakhir = f"HTTP {e.code}: {body[:120]}"
        except Exception as e:
            terakhir = repr(e)
        if i < coba:
            time.sleep(1 + i)
    print(f"TG_GAGAL {method}: {terakhir}")
    return {"ok": False, "error": terakhir}


def kirim(token, chat_id, text, reply_markup=None, reply_to=None, edit_mid=None):
    if edit_mid is not None:
        params = {"chat_id": chat_id, "message_id": edit_mid, "text": text,
                  "parse_mode": "HTML", "disable_web_page_preview": "true"}
        if reply_markup:
            params["reply_markup"] = json.dumps(reply_markup)
        r = tg(token, "editMessageText", params)
        if r.get("ok"):
            return r
    params = {"chat_id": chat_id, "text": text[:4096], "parse_mode": "HTML",
              "disable_web_page_preview": "true"}
    if reply_markup:
        params["reply_markup"] = json.dumps(reply_markup)
    if reply_to:
        params["reply_to_message_id"] = reply_to
    return tg(token, "sendMessage", params)


def ketik(token, chat_id):
    try:
        tg(token, "sendChatAction", {"chat_id": chat_id, "action": "typing"}, coba=0)
    except Exception:
        pass


# --------------------------------------------------------- OFFSET (REPO) ----
def offset_repo(max_umur=120.0):
    """Offset kebenaran dari repo (raw) — rollback disk lokal tak bisa menipu."""
    now = time.time()
    if _g["offset_repo"] is not None and now - _g["offset_repo_at"] < max_umur:
        return _g["offset_repo"]
    try:
        req = urllib.request.Request(f"{REPO_RAW}/data/offset_telegram.json",
                                     headers={"User-Agent": "benteng-balas"})
        with urllib.request.urlopen(req, timeout=12) as r:
            _g["offset_repo"] = int((json.loads(r.read().decode()) or {}).get("offset") or 0)
        _g["offset_repo_at"] = now
    except Exception:
        if _g["offset_repo"] is None:
            _g["offset_repo"] = 0
    return _g["offset_repo"]


def dorong_offset_repo(offset):
    """Commit offset ke repo (mode lokal; Actions memakai git commit biasa)."""
    tok = _token_rantaian()
    if not tok:
        return False
    try:
        req = urllib.request.Request(f"{REPO_API}/data%2Foffset_telegram.json",
                                     headers={"Authorization": f"Bearer {tok}",
                                              "User-Agent": "benteng-balas",
                                              "Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            sha = json.loads(r.read().decode()).get("sha")
        body = json.dumps({
            "message": "offset balas lokal [skip ci]",
            "content": __import__("base64").b64encode(json.dumps(
                {"offset": offset, "waktu": time.time(),
                 "waktu_iso": datetime.now(timezone.utc).isoformat()}).encode()).decode(),
            **({"sha": sha} if sha else {})}).encode()
        req = urllib.request.Request(f"{REPO_API}/data%2Foffset_telegram.json", data=body,
                                     method="PUT",
                                     headers={"Authorization": f"Bearer {tok}",
                                              "User-Agent": "benteng-balas",
                                              "Accept": "application/vnd.github+json",
                                              "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=25) as r:
            json.loads(r.read().decode())
        _g["offset_repo"] = offset
        _g["offset_repo_at"] = time.time()
        return True
    except Exception as e:
        print("OFFSET_REPO_GAGAL:", repr(e))
        return False


# ------------------------------------------------------------ DATA OTAK ----
def _ambil_url(jalur, jsonl=False, timeout=15):
    req = urllib.request.Request(f"{OTAK_RAW}/{jalur}", headers={"User-Agent": "benteng-balas"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        t = r.read().decode("utf-8", "replace")
    if jsonl:
        lines = [l for l in t.splitlines() if l.strip()]
        return json.loads(lines[-1])
    return json.loads(t)


def _zai_jembatan():
    """Snapshot otak z.ai: file lokal dulu (instan), jatuh ke raw benteng."""
    z = muat_json(os.path.join(ROOT, "benteng", "sasaran-zai.json"))
    if z and z.get("picks"):
        return z, "file benteng (lokal)"
    try:
        req = urllib.request.Request(ZAI_RAW, headers={"User-Agent": "benteng-balas"})
        with urllib.request.urlopen(req, timeout=12) as r:
            z = json.loads(r.read().decode("utf-8", "replace"))
        return z, "raw benteng (repo)"
    except Exception:
        return None, "tidak tersedia"


def ambil_otak(paksa=False):
    """Semua sumber otak diambil PARALEL; cache TTL 60s agar perintah beruntun instan."""
    now = time.time()
    if not paksa and _g["otak"] is not None and now - _g["otak_at"] < TTL_OTAK:
        return _g["otak"]
    out = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        f_sasaran = ex.submit(_ambil_url, "laporan/sasaran-terkini.json")
        f_genome = ex.submit(_ambil_url, "otak/genome-server.json")
        f_denyut = ex.submit(_ambil_url, "laporan/denyut-server.jsonl", True)
        f_odds = ex.submit(_ambil_url, "laporan/odds.json")
        f_zai = ex.submit(_zai_jembatan)
        try:
            out["sasaran"] = f_sasaran.result(timeout=30)
        except Exception:
            out["sasaran"] = None
        try:
            out["genome"] = f_genome.result(timeout=30)
        except Exception:
            out["genome"] = None
        try:
            out["denyut"] = f_denyut.result(timeout=30)
        except Exception:
            out["denyut"] = None
        try:
            out["odds"] = f_odds.result(timeout=30)
        except Exception:
            out["odds"] = None
        try:
            z, sumber_z = f_zai.result(timeout=30)
        except Exception:
            z, sumber_z = None, "tidak tersedia"
    out["zai"], out["zai_sumber"] = z, sumber_z
    out["waktu_ambil"] = now
    _g["otak"] = out
    _g["otak_at"] = now
    return out


# ---------------------------------------------------------------- HARGA ----
def _tickers_satu(url, ekstrak, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "benteng-balas"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return ekstrak(json.loads(r.read().decode()))


def harga_binance(simbol_list):
    """Chunk 5 simbol/chunk + fallback per-simbol + cadangan futures/OKX/Bybit.
    (pola terbukti dari benteng_telegram.py — 1 simbol sakit tak membunuh batch)"""
    if not simbol_list:
        return {}
    bases = sorted({b for b in (_basis_simbol(s) for s in simbol_list) if b})
    if not bases:
        return {}
    hosts = ("https://data-api.binance.vision/api/v3/ticker/price",
             "https://api.binance.com/api/v3/ticker/price",
             "https://api-gcp.binance.com/api/v3/ticker/price")
    out = {}
    kerja = []

    def _chunk(chunk):
        q = urllib.parse.quote(json.dumps([f"{b}USDT" for b in chunk], separators=(",", ":")))
        for host in hosts:
            try:
                req = urllib.request.Request(f"{host}?symbols={q}", headers={"User-Agent": "benteng-balas"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    arr = json.loads(r.read().decode())
                if isinstance(arr, list):
                    return {x["symbol"].replace("USDT", ""): float(x["price"]) for x in arr}
            except Exception:
                continue
        return {}

    with ThreadPoolExecutor(max_workers=4) as ex:
        for i in range(0, len(bases), 5):
            kerja.append(ex.submit(_chunk, bases[i:i + 5]))
        for f in kerja:
            out.update(f.result() or {})
    hilang = [b for b in bases if b not in out]
    if hilang and out:
        try:
            fut = _tickers_satu("https://fapi.binance.com/fapi/v1/ticker/price",
                                lambda a: {x["symbol"].replace("USDT", ""): float(x["price"])
                                           for x in a if x.get("symbol", "").endswith("USDT")
                                           and x["symbol"][:-4] in set(hilang)})
            out.update(fut or {})
        except Exception:
            pass
    hilang = [b for b in bases if b not in out]
    if hilang:
        try:
            cad = _tickers_satu("https://api.bybit.com/v5/market/tickers?category=spot",
                                lambda d: {x["symbol"][:-4]: float(x["lastPrice"])
                                           for x in ((d.get("result") or {}).get("list") or [])
                                           if x.get("symbol", "").endswith("USDT")
                                           and x["symbol"][:-4] in set(hilang)})
            out.update(cad or {})
        except Exception:
            pass
        try:
            cad2 = _tickers_satu("https://www.okx.com/api/v5/market/tickers?instType=SPOT",
                                 lambda d: {x["instId"][:-5]: float(x["last"])
                                            for x in (d.get("data") or [])
                                            if x.get("instId", "").endswith("-USDT")
                                            and x["instId"][:-5] in set(hilang)})
            out.update(cad2 or {})
        except Exception:
            pass
    return out


def statistik_24jam(base):
    """Perubahan 24 jam: high/low/volume dari ticker 24hr (spot; futures cadangan)."""
    for url, fmt in (
        (f"https://data-api.binance.vision/api/v3/ticker/24hr?symbol={base}USDT", "spot"),
        (f"https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={base}USDT", "futures"),
    ):
        try:
            j = _tickers_satu(url, lambda d: d, timeout=10)
            chg = j.get("priceChangePercent")
            return {"chg": float(chg) if chg is not None else None,
                    "high": float(j["highPrice"]) if j.get("highPrice") else None,
                    "low": float(j["lowPrice"]) if j.get("lowPrice") else None,
                    "vol": j.get("quoteVolume"), "sumber": fmt}
        except Exception:
            continue
    return {}


def harga_xau():
    """Rantai fallback emas: gold-api -> Bybit XAUTUSDT -> OKX."""
    def _get(url, timeout=10):
        req = urllib.request.Request(url, headers={"User-Agent": "benteng-balas"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    try:
        j = _get("https://api.gold-api.com/price/XAU")
        p = j.get("price") if isinstance(j, dict) else None
        if isinstance(p, (int, float)) and 100 < p < 100000:
            chg = None
            try:
                b = _get("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT")
                lst = (b.get("result") or {}).get("list") or []
                pc = float(lst[0].get("price24hPcnt")) if lst else None
                chg = round(pc * 100, 2) if pc is not None else None
            except Exception:
                pass
            return float(p), chg, "gold-api XAU spot"
    except Exception:
        pass
    try:
        b = _get("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT")
        lst = (b.get("result") or {}).get("list") or []
        if lst:
            return float(lst[0]["lastPrice"]), round(float(lst[0]["price24hPcnt"]) * 100, 2), "Bybit XAUTUSDT"
    except Exception:
        pass
    try:
        o = _get("https://www.okx.com/api/v5/market/ticker?instId=XAUT-USDT")
        d0 = ((o.get("data") or []) or [None])[0]
        if d0:
            p, op = float(d0["last"]), float(d0.get("open24h") or 0)
            return p, (round((p / op - 1) * 100, 2) if op > 0 else None), "OKX XAUT-USDT"
    except Exception:
        pass
    return None, None, "gagal"


# ---------------------------------------------------------------- TAMPILAN --
def menu_utama():
    """Tombol inline menu profesional (2 kolom x 3 baris)."""
    return {"inline_keyboard": [
        [{"text": "📊 Status", "callback_data": "cmd:status"},
         {"text": "📋 Laporan", "callback_data": "cmd:laporan"}],
        [{"text": "🎯 Sasaran", "callback_data": "cmd:sasaran"},
         {"text": "💥 Peluang", "callback_data": "cmd:peluang"}],
        [{"text": "📈 Akurasi", "callback_data": "cmd:akurasi"},
         {"text": "🥇 Emas", "callback_data": "cmd:emas"}],
        [{"text": "❓ Bantuan", "callback_data": "cmd:bantuan"}],
    ]}


KAKI = ("<i>Klaim jujur: saya akan terus berkembang menjadi master pasar; "
        "profit adalah yang saya pelajari.</i>\n"
        "<i>Saat tubuh sandbox tidur, lapis abadi GitHub menjawab ≤ ±5 menit.</i>")


def baris_pick(i, p, h):
    """Satu baris sasaran: simbol arah keyakinan + entry/kini/jarak + 3 level."""
    basis = _basis_simbol(p.get("simbol")) or p.get("simbol")
    arah = str(p.get("arah") or "?").upper()
    ikon_arah = "🟢" if arah == "BUY" else ("🔴" if arah == "SELL" else "⚪")
    ent = p.get("entry")
    kini = h.get(basis)
    jarak = fmt_pct((kini / ent - 1) * 100) if (kini and ent) else "-"
    lvl = []
    if p.get("target"):
        j = (kini / p["target"] - 1) * 100 if kini else None
        lvl.append(f"TP {fmt_harga(p['target'])}" + (f" ({fmt_pct(j)})" if j is not None else ""))
    if p.get("ambisius"):
        lvl.append(f"🔥 {fmt_harga(p['ambisius'])}")
    if p.get("powermax"):
        lvl.append(f"💥 {fmt_harga(p['powermax'])}")
    if p.get("stop"):
        lvl.append(f"🛑 {fmt_harga(p['stop'])}")
    baris = (f"{i}. {ikon_arah} <b>{html.escape(str(basis))}</b> {html.escape(arah)} "
             f"{p.get('keyakinan', '-')}% · entry <code>{fmt_harga(ent)}</code> · "
             f"kini <code>{fmt_harga(kini)}</code> ({jarak})")
    if lvl:
        baris += "\n    " + " · ".join(lvl)
    return baris


def cmd_start():
    return ("🤖 <b>MICROPROFITA — BOT CHAT v7</b>\n"
            f"🕐 {sekarang_wib()}\n\n"
            "Saya penjaga & asisten pasar dagangmu. Ketik perintah atau pakai tombol:\n"
            "• <b>status</b> — kondisi sistem sekilas\n"
            "• <b>laporan</b> — laporan lengkap\n"
            "• <b>harga BTC</b> — harga koin apa pun + 24 jam\n"
            "• <b>sasaran</b> — daftar sasaran otak (dengan 4 level)\n"
            "• <b>peluang</b> — peluang profit terbesar\n"
            "• <b>akurasi</b> — rekam jejak otak & genome\n"
            "• <b>emas</b> — XAU (koin wajib abadi)\n\n"
            + KAKI)


def cmd_status():
    o = ambil_otak()
    z = o.get("zai") or {}
    denyut = o.get("denyut") or {}
    picks = z.get("picks") or []
    L = ["📊 <b>STATUS MICROPROFITA</b>", f"🕐 {sekarang_wib()}", ""]
    if z:
        umur_z = umur_jam(z.get("waktu"))
        L.append(f"🧠 Otak z.ai: <b>HIDUP</b> — {len(picks)} sasaran + XAU · regim {html.escape(str(z.get('regime') or '?'))}"
                 + (f" · snapshot {umur_z:.1f} jam lalu" if umur_z is not None else ""))
        L.append(f"🔗 Sumber snapshot: {html.escape(str(o.get('zai_sumber')))}")
    else:
        L.append("🧠 Otak z.ai: snapshot belum tersedia — saya akui jujur")
    if denyut:
        uw = denyut.get("waktu") or denyut.get("dihasilkan")
        u = umur_jam(uw)
        if u is not None:
            L.append(f"💓 Denyut otak server: {'HIDUP ✅' if u < 1.5 else f'terhenti {u:.0f} jam ⚠️'} ({u*60:.0f} menit lalu)")
    L.append(f"🛡️ Lapis abadi: <b>HIDUP</b> (detak 30 menit + balasan 5 menit)")
    L.append(f"📡 Sumber otak server: {'live ✅' if o.get('sasaran') else 'cache/gagal ⚠️'}")
    L.append("")
    L.append(KAKI)
    return "\n".join(L)


def cmd_laporan():
    o = ambil_otak()
    sasaran = o.get("sasaran") or {}
    genome = o.get("genome") or {}
    denyut = o.get("denyut") or {}
    daftar = sasaran.get("sasaranHariIni") or []
    syms = [e.get("simbol") for e in daftar if e.get("simbol")]
    h = harga_binance(syms[:40])
    L = ["📋 <b>LAPORAN MICROPROFITA</b>", f"🕐 {sekarang_wib()}", "",
         f"🎯 <b>{len(daftar)} sasaran hari ini</b> — TP ≠ Ambisius ≠ PowerMax ≠ Stop:"]
    for e in daftar[:25]:
        sim = e.get("simbol")
        base = _basis_simbol(sim)
        harga = h.get(base)
        baris = (f"• <b>{html.escape(str(sim))}</b> ({html.escape(str(e.get('arah', '?')))}) "
                 f"kini <code>{fmt_harga(harga)}</code>")
        d = []
        if e.get("target"):
            d.append(f"TP {fmt_harga(e['target'])}")
        if e.get("highAmbisius"):
            d.append(f"🔥 {fmt_harga(e['highAmbisius'])}")
        pw = next((v for k, v in e.items()
                   if isinstance(v, (int, float)) and v > 0 and "power" in str(k).lower()), None)
        if pw:
            d.append(f"💥 {fmt_harga(pw)}")
        if e.get("stop"):
            d.append(f"🛑 {fmt_harga(e['stop'])}")
        if e.get("entry") and harga:
            d.append(f"({fmt_pct((harga / e['entry'] - 1) * 100)} dari entry)")
        L.append(baris + ("\n    " + " · ".join(d) if d else ""))
    if len(daftar) > 25:
        L.append(f"<i>… {len(daftar) - 25} sasaran lain (ketik 'sasaran' untuk daftar otak z.ai)</i>")
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
        L.append(f"💓 Denyut: siklus {denyut.get('siklus', '?')}")
    terbaru, gm, tb = None, 0, 0

    def telusur(d):
        nonlocal terbaru, gm, tb
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru is None or umur_jam(iso) < umur_jam(terbaru)):
                terbaru = iso
            gm = max(gm, int(d.get("generasi") or 0))
            tb += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)

    telusur(genome)
    if terbaru:
        L.append(f"🧬 Genome: generasi {gm} · {tb} pembelajaran · tumbuh {umur_jam(terbaru)/24:.0f} hari lalu")
    L.append("")
    L.append(KAKI)
    return "\n".join(L)


def cmd_harga(arg):
    if not arg:
        return ("💡 Ketik: <b>harga BTC</b> (atau BTCUSDT, sol, xau, emas)\n"
                "Contoh: <i>harga pepe</i>, <i>harga bitcoin</i>")
    k = arg.strip().lower()
    if k in ("xau", "emas", "gold"):
        h, chg, src = harga_xau()
        if h:
            return (f"🥇 <b>XAU (EMAS)</b>\n🕐 {sekarang_wib()}\n\n"
                    f"Kini: <code>{fmt_harga(h)}</code>"
                    + (f" · 24 jam {fmt_pct(chg)}" if chg is not None else "")
                    + f"\nSumber: {html.escape(src)}\n\n" + KAKI)
        return "⚠️ Gagal mengambil harga emas dari semua sumber — saya akui jujur."
    alias = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL"}
    base = _basis_simbol(alias.get(k, k))
    if not base:
        return f"⚠️ Simbol '{html.escape(arg)}' tidak sah. Contoh benar: <b>harga BTC</b>"
    ketik_data = statistik_24jam(base)
    h = harga_binance([base]).get(base)
    if not h:
        return (f"⚠️ Harga <b>{html.escape(base)}</b> tidak ditemukan di Binance/Bybit/OKX. "
                "Coba simbol lain (contoh: harga BTC).")
    L = [f"💰 <b>{base}/USDT</b>", f"🕐 {sekarang_wib()}", "",
         f"Harga kini: <code>{fmt_harga(h)}</code>"]
    if ketik_data:
        if ketik_data.get("chg") is not None:
            L.append(f"24 jam: <b>{fmt_pct(ketik_data['chg'])}</b>"
                     + (f" · tinggi {fmt_harga(ketik_data['high'])} · rendah {fmt_harga(ketik_data['low'])}"
                        if ketik_data.get("high") else ""))
        L.append(f"Sumber: Binance {html.escape(ketik_data.get('sumber', 'spot'))}")
    # bila koin ada di daftar sasaran, tampilkan levelnya
    z = (ambil_otak().get("zai") or {})
    cocok = next((p for p in (z.get("picks") or [])
                  if (_basis_simbol(p.get("simbol")) or "") == base), None)
    if cocok:
        L.append("")
        L.append(f"🎯 Koin ini ada di sasaran otak ({html.escape(str(cocok.get('arah', '?')))} "
                 f"{cocok.get('keyakinan', '-')}%):")
        L.append(baris_pick(1, cocok, {base: h}))
    L.append("")
    L.append(KAKI)
    return "\n".join(L)


def cmd_sasaran():
    o = ambil_otak()
    z = o.get("zai") or {}
    picks = (z.get("picks") or [])[:15]
    if not picks:
        return ("⚠️ Snapshot sasaran otak belum tersedia — saya akui jujur.\n\n" + KAKI)
    syms = [p.get("simbol") for p in picks if p.get("simbol")]
    h = harga_binance(syms)
    xau = z.get("xau") or {}
    xh, xchg, xsrc = harga_xau()
    umur_z = umur_jam(z.get("waktu"))
    L = [f"🎯 <b>SASARAN OTAK — {len(z.get('picks') or [])} koin + XAU</b>",
         f"🧭 Regim {html.escape(str(z.get('regime') or '?'))}"
         + (f" · snapshot {umur_z:.1f} jam lalu" if umur_z is not None else ""),
         f"🕐 {sekarang_wib()}", "",
         "🥇 <b>XAU (EMAS) — WAJIB ABADI</b>"]
    if xau.get("entry") or xh:
        ent = xau.get("entry") or xh
        kini = xh or xau.get("entry")
        L.append(f"<b>XAUUSDT</b> {html.escape(str(xau.get('arah') or '?'))} {xau.get('keyakinan', '-')}% · "
                 f"entry <code>{fmt_harga(ent)}</code> · kini <code>{fmt_harga(kini)}</code> "
                 f"({fmt_pct((kini / ent - 1) * 100) if (kini and ent) else '-'})"
                 + (f" · 24 jam {fmt_pct(xchg)}" if xchg is not None else ""))
        lvl = [f"TP {fmt_harga(xau.get('target'))}", f"🔥 {fmt_harga(xau.get('ambisius'))}",
               f"💥 {fmt_harga(xau.get('powermax'))}", f"🛑 {fmt_harga(xau.get('stop'))}"]
        L.append("    " + " · ".join(lvl))
    L.append("")
    for i, p in enumerate(picks, 1):
        L.append(baris_pick(i, p, h))
    L.append("")
    L.append("<i>TP sasaran ≠ Jual Ambisius ≠ Power Max ≠ Stop — empat level, empat keputusan.</i>")
    L.append(KAKI)
    return "\n".join(L)


def cmd_peluang():
    """PELUANG PROFIT TERBESAR — urut murni % jarak kini -> JUAL AMBISIUS."""
    o = ambil_otak()
    z = o.get("zai") or {}
    picks = z.get("picks") or []
    if not picks:
        return ("⚠️ Snapshot peluang belum tersedia — saya akui jujur.\n\n" + KAKI)
    syms = [p.get("simbol") for p in picks if p.get("simbol")]
    h = harga_binance(syms)
    skala = []
    for p in picks:
        basis = _basis_simbol(p.get("simbol"))
        amb, kini = p.get("ambisius"), h.get(basis)
        arah = str(p.get("arah") or "?").upper()
        if not (amb and kini):
            continue
        pot = ((amb / kini - 1) * 100) if arah == "BUY" else ((kini / amb - 1) * 100)
        skala.append((pot, p, kini))
    skala.sort(key=lambda x: -x[0])
    L = ["💥 <b>PELUANG PROFIT TERBESAR</b> (jarak kini → JUAL AMBISIUS)",
         f"🧭 Regim {html.escape(str(z.get('regime') or '?'))} · 🕐 {sekarang_wib()}", ""]
    for i, (pot, p, kini) in enumerate(skala[:10], 1):
        basis = _basis_simbol(p.get("simbol")) or p.get("simbol")
        ikon = "🟢" if str(p.get("arah", "")).upper() == "BUY" else "🔴"
        bonus = " 💥POWERMAX" if p.get("powermax") and (
            (p["powermax"] / kini - 1) * 100 > 3) else ""
        L.append(f"{i}. {ikon} <b>{html.escape(str(basis))}</b> {html.escape(str(p.get('arah', '?')))} "
                 f"{p.get('keyakinan', '-')}% — potensi <b>{pot:+.2f}%</b>{bonus}\n"
                 f"    kini <code>{fmt_harga(kini)}</code> → 🔥 <code>{fmt_harga(p.get('ambisius'))}</code>")
    L.append("")
    L.append("<i>Potensi = jarak harga ke level, BUKAN janji profit. SELL dihitung arah-aware.</i>")
    L.append(KAKI)
    return "\n".join(L)


def cmd_akurasi():
    o = ambil_otak()
    sasaran = o.get("sasaran") or {}
    genome = o.get("genome") or {}
    a_raw = sasaran.get("akurasi")
    if isinstance(a_raw, dict):
        akur, net_k = a_raw.get("akurasiPct"), a_raw.get("netKumulatifPct")
    else:
        akur, net_k = a_raw, None
    L = ["📈 <b>REKAM JEJAK OTAK</b>", f"🕐 {sekarang_wib()}", ""]
    if akur is not None:
        L.append(f"Akurasi terkunci: <b>{float(akur):.1f}%</b>"
                 + (f" · net kumulatif {float(net_k):+.1f}%" if net_k is not None else ""))
    else:
        L.append("Akurasi: data server belum tersedia — saya tidak mengarang angka")
    L.append(f"💓 Denyut: siklus {(o.get('denyut') or {}).get('siklus', '?')}")
    terbaru, gm, tb = None, 0, 0

    def telusur(d):
        nonlocal terbaru, gm, tb
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru is None or umur_jam(iso) < umur_jam(terbaru)):
                terbaru = iso
            gm = max(gm, int(d.get("generasi") or 0))
            tb += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)

    telusur(genome)
    if terbaru:
        u = umur_jam(terbaru) / 24.0
        L.append(f"🧬 Genome: generasi <b>{gm}</b> · {tb} pembelajaran · tumbuh {u:.0f} hari lalu"
                 + (" — <b>STAGNAN, sedang saya bedahi</b>" if u > 7 else ""))
    L.append("")
    L.append(KAKI)
    return "\n".join(L)


def cmd_emas():
    return cmd_harga("xau")


def cmd_bantuan():
    return ("❓ <b>BANTUAN — PERINTAH BOT CHAT v7</b>\n\n"
            "/start · /menu — menu utama\n"
            "/status — kondisi sistem sekilas\n"
            "/laporan — laporan lengkap sasaran server\n"
            "/harga &lt;koin&gt; — harga + statistik 24 jam (contoh: /harga btc)\n"
            "/sasaran — daftar sasaran otak z.ai + 4 level\n"
            "/peluang — peluang profit terbesar (arah-aware)\n"
            "/akurasi — rekam jejak & genome\n"
            "/emas — harga emas XAU\n\n"
            "Atau ketik apa saja: <i>harga pepe</i>, <i>menu</i>, <i>status</i>.\n"
            "Saya hanya membalas chat pemilik — data jujur, tanpa angka karangan.\n\n"
            + KAKI)


FALLBACK = ("🙏 Saya belum paham perintah itu.\nKetik <b>menu</b> untuk daftar perintah, "
            "atau coba: <i>harga BTC</i>, <i>status</i>, <i>sasaran</i>, <i>peluang</i>.")


def route(teks):
    t = teks.strip()
    tl = t.lower()
    if not t:
        return None
    if t.startswith("/"):
        tl = tl[1:].split("@")[0].split()[0] if tl[1:].strip() else "start"
        arg = t[1:].split(None, 1)[1] if len(t.split(None, 1)) > 1 else ""
        if tl in ("start", "menu"):
            return cmd_start()
        if tl == "status":
            return cmd_status()
        if tl in ("laporan", "report"):
            return cmd_laporan()
        if tl == "harga":
            return cmd_harga(arg)
        if tl in ("sasaran", "picks"):
            return cmd_sasaran()
        if tl in ("peluang", "profit"):
            return cmd_peluang()
        if tl in ("akurasi",):
            return cmd_akurasi()
        if tl in ("emas", "xau", "gold"):
            return cmd_emas()
        if tl in ("bantuan", "help"):
            return cmd_bantuan()
        return ("⚠️ Perintah /" + html.escape(tl) + " belum kukenal.\n" + FALLBACK)
    m = re.match(r"^(?:harga|price)\s+(.+)$", tl)
    if m:
        return cmd_harga(m.group(1))
    if re.match(r"^(btc|eth|sol|\w+usdt)\s*$", tl):
        return cmd_harga(tl)
    if "periksa" in tl or "aktivasi" in tl:
        return ("✅ <b>SAYA HIDUP</b> — merespons pesanmu langsung.\n"
                f"🕐 {sekarang_wib()}\n\n" + FALLBACK)
    if tl in ("menu", "mulai", "start", "halo", "hai", "hi", "assalamualaikum", "pagi", "siang", "malam"):
        return cmd_start()
    if "laporan" in tl or "status" in tl or "report" in tl:
        return cmd_laporan()
    if "sasaran" in tl or "picks" in tl:
        return cmd_sasaran()
    if "peluang" in tl or "profit" in tl:
        return cmd_peluang()
    if "akurasi" in tl:
        return cmd_akurasi()
    if "emas" in tl or "xau" in tl or "gold" in tl:
        return cmd_emas()
    if "bantuan" in tl or "help" in tl or "bantu" in tl:
        return cmd_bantuan()
    return FALLBACK + "\n\n" + cmd_start()


# ------------------------------------------------------------------ MESIN ---
def proses_update(token, u, sudah_dijawab):
    uid = u.get("update_id", 0)
    if uid in sudah_dijawab or uid <= offset_repo():
        return uid, False
    cq = u.get("callback_query") or {}
    m = u.get("message") or {}
    if cq:
        chat = str(((cq.get("message") or {}).get("chat") or {}).get("id") or "")
        data = str(cq.get("data") or "")
        pesan_id = (cq.get("message") or {}).get("message_id")
        if chat != PEMILIK:
            return uid, False
        cmd = data[4:] if data.startswith("cmd:") else data
        ketik(token, chat)
        jawab = route("/" + cmd)
        r = kirim(token, chat, jawab, reply_markup=menu_utama(), edit_mid=pesan_id)
        tg(token, "answerCallbackQuery", {"callback_query_id": cq.get("id")}, coba=0)
        print(f"BALAS-CB uid={uid} '{cmd}' {'OK' if r.get('ok') else 'GAGAL'}")
        return uid, r.get("ok")
    teks = (m.get("text") or "").strip()
    chat = str((m.get("chat") or {}).get("id") or "")
    if not teks or chat != PEMILIK:
        return uid, False
    ketik(token, chat)
    jawab = route(teks)
    if not jawab:
        return uid, False
    r = kirim(token, chat, jawab, reply_markup=menu_utama(),
              reply_to=m.get("message_id", 0))
    print(f"BALAS uid={uid} '{teks[:30]}' {'OK' if r.get('ok') else 'GAGAL'}")
    return uid, r.get("ok")


def jalankan(mode, lama_longpoll):
    token, chat_id = nyawa()
    if not token or not chat_id:
        print("NYAWA_HILANG")
        return 2
    repo_off = offset_repo()
    lokal = (muat_json(F_STATE) or {}).get("offset") or 0
    offset = max(repo_off, lokal)
    try:
        d = tg(token, "getUpdates", {"offset": offset, "timeout": lama_longpoll, "limit": 20})
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print("GETUPDATES 409 (lapis lain sedang long-poll) — mundur sopan")
            return 0
        print("GETUPDATES_GAGAL:", repr(e))
        return 2
    except Exception as e:
        print("GETUPDATES_GAGAL:", repr(e))
        return 2
    if not d.get("ok"):
        print("GETUPDATES_ERR:", str(d)[:200])
        return 2
    ups = d.get("result", [])
    diproses = 0
    max_id = offset - 1 if offset else 0
    sudah = set()
    for u in ups:
        uid, ok = proses_update(token, u, sudah)
        max_id = max(max_id, uid)
        if ok:
            diproses += 1
            sudah.add(uid)
        if diproses >= LIMIT_BALAS_PER_RUN:
            break
    if ups:
        baru = max_id + 1
        simpan_json(F_STATE, {"offset": baru, "waktu": time.time(),
                              "waktu_iso": datetime.now(timezone.utc).isoformat(),
                              "mode": mode})
        if mode != "actions":
            dorong_offset_repo(baru)
        print(f"OFFSET -> {baru} | diproses: {diproses} | mode: {mode}")
    else:
        print(f"TIDAK ADA PESAN BARU (offset {offset}, mode {mode})")
    return 0


def main():
    mode = "actions"
    if "--jaga" in sys.argv:
        mode = "jaga"
    elif "--sekali" in sys.argv:
        mode = "sekali"
    if mode == "jaga":
        print(f"BOT-CHAT JAGA mulai {sekarang_wib()} — loop {JAGA_INTERVAL}s")
        while True:
            try:
                jalankan(mode, LONG_POLL["jaga"])
            except Exception as e:
                print("LOOP_ERR:", repr(e))
            time.sleep(JAGA_INTERVAL)
    return jalankan(mode, LONG_POLL["actions"])


if __name__ == "__main__":
    import sys
    raise SystemExit(main())
