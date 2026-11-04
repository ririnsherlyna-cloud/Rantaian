#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DATA-FRESH v1 "MESIN KESEGARAN" — MicroProfita (1 Nov 2026).

Jawaban atas kritik pemilik: "jangan main bekukan-bekukan kalau data tidak
fresh — harusnya inovasi, jangan sampai data kadaluarsa terus; harus FAST,
NEWS SELALU, dan TANGGAP; bukan sekadar tahan informasi."

Prinsip: saat data tua -> JANGAN BEKU. BURU data segar dari sumber hidup
(8 bursa + jembatan z.ai + repo), cap setiap harga dengan WAKTU & SUMBER,
dan sediakan BERITA pasar yang selalu segar. Menolak mengirim angka basi
sebagai angka baru (pelajaran kerugian 1000M).

Semua fungsi stdlib-saja, tanpa kunci API, tanpa ketergantungan balas_telegram
(balas_telegram yang memakai modul ini, bukan sebaliknya).
"""
import json
import time
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
from email.utils import parsedate_to_datetime

WIB = timezone(timedelta(hours=7))
UA = "microprofita-data-fresh/1"

REPO = "ririnsherlyna-cloud/Rantaian"
REPO_RAW = f"https://raw.githubusercontent.com/{REPO}/main"
OTAK_RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"

# Cache harga lokal (agar perintah beruntun instan & tak mengganggu bursa)
_FRESH_CACHE = {"data": {}, "at": 0.0}
CACHE_TTL = 60.0

# Kaskade 8 bursa: harga live, masing-masing distempel waktu (bukan beku!)
SUMBER_BINANCE = ("https://data-api.binance.vision/api/v3/ticker/price",
                  "https://api.binance.com/api/v3/ticker/price",
                  "https://api-gcp.binance.com/api/v3/ticker/price")
FUTURES = "https://fapi.binance.com/fapi/v1/ticker/price"
BYBIT = "https://api.bybit.com/v5/market/tickers?category=spot"
OKX = "https://www.okx.com/api/v5/market/tickers?instType=SPOT"
MEXC = "https://api.mexc.com/api/v3/ticker/price"
GATE = "https://api.gateio.ws/api/v4/spot/tickers"
BITGET = "https://api.bitget.com/api/v2/spot/market/tickers"
KUCOIN = "https://api.kucoin.com/api/v1/market/allTickers"

# Berita: RSS gratis selalu segar + trending CoinGecko
RSS_UMUM = (("Cointelegraph", "https://cointelegraph.com/rss"),
            ("Decrypt", "https://decrypt.co/feed"))
CG_TRENDING = "https://api.coingecko.com/api/v3/search/trending"


def _get(url, timeout=12, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def _get_json(url, timeout=12, headers=None):
    return json.loads(_get(url, timeout, headers))


def sekarang_wib():
    return datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S WIB")


def umur_iso(iso):
    """Umur DETIK nyata dari timestamp ISO; None bila tak terbaca."""
    try:
        s = str(iso or "").replace("Z", "+00:00")
        t = datetime.fromisoformat(s)
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds()
    except Exception:
        return None


def umur_teks(detik):
    if detik is None:
        return "?"
    d = float(detik)
    if d < 90:
        return f"{d:.0f} dtk"
    if d < 5400:
        return f"{d / 60:.0f} mnt"
    if d < 172800:
        return f"{d / 3600:.1f} jam"
    return f"{d / 86400:.1f} hari"


def fmt_harga(p):
    try:
        p = float(p)
    except Exception:
        return str(p)
    if p >= 1000:
        return f"{p:,.2f}"
    if p >= 1:
        return f"{p:.4f}"
    if p == 0:
        return "0"
    return f"{p:.8f}".rstrip("0")


# --------------------------------------------------------------- HARGA LIVE --
def _binance_chunk(chunk):
    q = urllib.parse.quote(json.dumps([f"{b}USDT" for b in chunk], separators=(",", ":")))
    for host in SUMBER_BINANCE:
        try:
            arr = _get_json(f"{host}?symbols={q}", 10)
            if isinstance(arr, list):
                return {x["symbol"].replace("USDT", ""): float(x["price"]) for x in arr}
        except Exception:
            continue
    return {}


def _mexc(bases):
    out = {}
    for b in bases:
        try:
            j = _get_json(f"{MEXC}?symbol={b}USDT", 8)
            if j.get("price"):
                out[b] = float(j["price"])
        except Exception:
            continue
    return out


def _gate(bases):
    out = {}
    for b in bases:
        try:
            arr = _get_json(f"{GATE}?currency_pair={b}_USDT", 8)
            if arr and arr[0].get("last"):
                out[b] = float(arr[0]["last"])
        except Exception:
            continue
    return out


def _bitget(bases):
    try:
        arr = _get_json(f"{BITGET}", 10).get("data") or []
        idx = {x.get("symbol"): float(x["lastPr"]) for x in arr
               if x.get("symbol", "").endswith("USDT") and x.get("lastPr")}
        return {b: idx[f"{b}USDT"] for b in bases if f"{b}USDT" in idx}
    except Exception:
        return {}


def _kucoin(bases):
    try:
        arr = (_get_json(KUCOIN, 12).get("data") or {}).get("ticker") or []
        idx = {x.get("symbol"): float(x["last"]) for x in arr
               if x.get("symbol", "").endswith("-USDT") and x.get("last")}
        return {b: idx[f"{b}-USDT"] for b in bases if f"{b}-USDT" in idx}
    except Exception:
        return {}


def _satu(url, ekstrak, timeout=12):
    return ekstrak(_get_json(url, timeout))


def harga_live(simbol_list, perbarui_paksa=False):
    """Kaskade 8 bursa. Hasil: {SIM: {'harga': float, 'ts': epoch, 'sumber': str}}.
    Setiap harga distempel WAKTU AMBIL — penebus janji 'jangan angka basi'."""
    now = time.time()
    if not perbarui_paksa and _FRESH_CACHE["data"] and now - _FRESH_CACHE["at"] < CACHE_TTL:
        cam = _FRESH_CACHE["data"]
        return {s: dict(cam[s]) for s in simbol_list if s in cam}
    bases = sorted({str(s).split("-")[0].split("USDT")[0].upper() for s in simbol_list if s})
    out = {}
    # 1) binance spot paralel per-chunk
    with ThreadPoolExecutor(max_workers=4) as ex:
        fs = [ex.submit(_binance_chunk, bases[i:i + 5]) for i in range(0, len(bases), 5)]
        for f in fs:
            for b, p in (f.result() or {}).items():
                out[b] = {"harga": p, "ts": now, "sumber": "Binance"}
    # 2) kaskade bursa berikutnya untuk yang masih hilang
    kaskade = ((FUTURES, "Binance Futures", lambda d: {x["symbol"].replace("USDT", ""): float(x["price"])
                                                       for x in d if x.get("symbol", "").endswith("USDT")}),
               (BYBIT, "Bybit", lambda d: {x["symbol"][:-4]: float(x["lastPrice"])
                                           for x in (d.get("result") or {}).get("list") or []
                                           if x.get("symbol", "").endswith("USDT")}),
               (OKX, "OKX", lambda d: {x["instId"][:-5]: float(x["last"])
                                       for x in d.get("data") or [] if x.get("instId", "").endswith("-USDT")}))
    for url, nama, fmt in kaskade:
        hilang = [b for b in bases if b not in out]
        if not hilang:
            break
        try:
            got = _satu(url, fmt, 12)
            for b in hilang:
                if b in got:
                    out[b] = {"harga": got[b], "ts": now, "sumber": nama}
        except Exception:
            continue
    for fn, nama in ((_mexc, "MEXC"), (_gate, "Gate"), (_bitget, "Bitget"), (_kucoin, "KuCoin")):
        hilang = [b for b in bases if b not in out]
        if not hilang:
            break
        for b, p in (fn(hilang) or {}).items():
            out[b] = {"harga": p, "ts": now, "sumber": nama}
    _FRESH_CACHE["data"], _FRESH_CACHE["at"] = out, now
    return {s: dict(out[s]) for s in simbol_list if _basis(s) in out}


def _basis(s):
    s = str(s or "").upper()
    s = s.split("-")[0]
    if s.endswith("USDT") and len(s) > 4:
        s = s[:-4]
    return s


def xau_live():
    """Emas live: gold-api -> Bybit XAUT -> OKX XAUT. (harga, chg%, sumber, ts)"""
    now = time.time()
    try:
        j = _get_json("https://api.gold-api.com/price/XAU", 10)
        p = j.get("price")
        if isinstance(p, (int, float)) and 100 < p < 100000:
            chg = None
            try:
                b = _get_json("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT", 10)
                lst = (b.get("result") or {}).get("list") or []
                pc = float(lst[0].get("price24hPcnt")) if lst else None
                chg = round(pc * 100, 2) if pc is not None else None
            except Exception:
                pass
            return float(p), chg, "gold-api", now
    except Exception:
        pass
    try:
        b = _get_json("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT", 10)
        lst = (b.get("result") or {}).get("list") or []
        if lst:
            return float(lst[0]["lastPrice"]), round(float(lst[0]["price24hPcnt"]) * 100, 2), "Bybit XAUT", now
    except Exception:
        pass
    try:
        o = _get_json("https://www.okx.com/api/v5/market/ticker?instId=XAUT-USDT", 10)
        d0 = ((o.get("data") or []) or [None])[0]
        if d0:
            p, op = float(d0["last"]), float(d0.get("open24h") or 0)
            return p, (round((p / op - 1) * 100, 2) if op > 0 else None), "OKX XAUT", now
    except Exception:
        pass
    return None, None, "gagal", None


# ------------------------------------------------------------- BURU OTAK ----
def buru_otak_segars():
    """Buru otak segar secara AKTIF (bukan beku): semua sumber paralel.
    Return {'zai':…, 'sasaran':…, 'umur_zai': s, 'umur_sasaran': s,
            'status': 'SEGAR' | 'BASIH', 'teks': ringkasan jujur}"""
    def ambil(jalur, jsonl=False):
        try:
            t = _get(f"{REPO_RAW}/{jalur}", 15)
            if jsonl:
                baris = [x for x in t.splitlines() if x.strip()]
                return json.loads(baris[-1]) if baris else None
            return json.loads(t)
        except Exception:
            return None

    out = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        f_zai = ex.submit(ambil, "benteng/sasaran-zai.json")
        f_sas = ex.submit(ambil, "laporan/sasaran-terkini.json")
        f_gen = ex.submit(ambil, "otak/genome-server.json")
        f_den = ex.submit(ambil, "laporan/denyut-server.jsonl", True)
        try:
            out["zai"] = f_zai.result(timeout=25)
        except Exception:
            out["zai"] = None
        try:
            out["sasaran"] = f_sas.result(timeout=25)
        except Exception:
            out["sasaran"] = None
        try:
            out["genome"] = f_gen.result(timeout=25)
        except Exception:
            out["genome"] = None
        try:
            out["denyut"] = f_den.result(timeout=25)
        except Exception:
            out["denyut"] = None
    u_z = umur_iso((out.get("zai") or {}).get("waktu"))
    u_s = umur_iso((out.get("sasaran") or {}).get("dihasilkan"))
    out["umur_zai"], out["umur_sasaran"] = u_z, u_s
    segar = (u_z is not None and u_z <= 12 * 3600) or (u_s is not None and u_s <= 12 * 3600)
    out["status"] = "SEGAR" if segar else "BASIH"
    out["teks"] = (f"otak z.ai {umur_teks(u_z)} · sasaran server {umur_teks(u_s)}")
    return out


# --------------------------------------------------------------- BERITA -----
def _parse_rss(nama, url, batas, max_umur_jam):
    hasil = []
    try:
        root = ET.fromstring(_get(url, 15, {"User-Agent": "Mozilla/5.0"}))
    except Exception:
        return hasil
    for it in root.iter("item"):
        if len(hasil) >= batas:
            break
        judul = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        tgl = it.findtext("pubDate") or ""
        try:
            t = parsedate_to_datetime(tgl)
            umur = (datetime.now(timezone.utc) - (t if t.tzinfo else t.replace(tzinfo=timezone.utc))).total_seconds()
        except Exception:
            umur = None
        if judul and (umur is None or umur <= max_umur_jam * 3600):
            hasil.append({"sumber": nama, "judul": re.sub(r"\s+", " ", judul),
                          "link": link, "umur": umur})
    return hasil


def berita(batas=10, max_umur_jam=24):
    """Berita crypto SELALU SEGAR: gabungan RSS + urut terbaru dulu.
    Feed mati bukan alasan senyap total — yang hidup tetap disajikan."""
    with ThreadPoolExecutor(max_workers=2) as ex:
        fs = [ex.submit(_parse_rss, n, u, batas, max_umur_jam) for n, u in RSS_UMUM]
        gab = []
        for f in fs:
            gab += f.result(timeout=25) or []
    gab.sort(key=lambda x: x["umur"] if x["umur"] is not None else 1e12)
    return gab[:batas]


def trending(batas=7):
    try:
        d = _get_json(CG_TRENDING, 12).get("coins") or []
        out = []
        for c in d[:batas]:
            i = c.get("item") or {}
            out.append({"nama": i.get("name"), "simbol": i.get("symbol"),
                        "rank": i.get("market_cap_rank"), "tren": i.get("score")})
        return out
    except Exception:
        return []


def statistik_24jam(base):
    """Perubahan 24 jam (high/low/vol) live."""
    for url, s in ((f"https://data-api.binance.vision/api/v3/ticker/24hr?symbol={base}USDT", "Binance"),
                   (f"https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={base}USDT", "Binance Futures")):
        try:
            j = _get_json(url, 10)
            return {"chg": float(j["priceChangePercent"]) if j.get("priceChangePercent") else None,
                    "high": float(j["highPrice"]) if j.get("highPrice") else None,
                    "low": float(j["lowPrice"]) if j.get("lowPrice") else None,
                    "sumber": s, "ts": time.time()}
        except Exception:
            continue
    return {}


# ------------------------------------------------------------- OTAK ARENA --
def otak_arena_lokal(url="http://localhost:3000/api/arena", timeout=10):
    """Otak z.ai LANGSUNG dari server arena lokal (sumber sama dilihat pemilik).
    V309 ANTI-BEKU: otak tak perlu menunggu jembatan repo yang bisa basi.
    Return (snap, sumber) — skema sama dengan heartbeat.otak_zai."""
    try:
        d = _get_json(url, timeout)
    except Exception as e:
        return None, f"arena lokal tidak hidup: {repr(e)[:60]}"
    picks = []
    for p in d.get("todayPicks") or []:
        if p.get("competitor") != "MICAPROFITA":
            continue
        sim = p.get("symbol")
        if not sim or not p.get("entryClose"):
            continue
        entri = {"simbol": str(sim).upper(), "arah": str(p.get("direction") or "?").upper(),
                 "keyakinan": p.get("confidence"), "entry": float(p.get("entryClose"))}
        rn = ((p.get("evidence") or {}).get("rencana") or {})
        if isinstance(rn, dict):
            for k_s, k_t in (("target", "target"), ("highAmbisius", "ambisius"),
                             ("powerMax", "powermax"), ("stop", "stop")):
                v = rn.get(k_s)
                if isinstance(v, (int, float)) and v > 0:
                    entri[k_t] = float(v)
        picks.append(entri)
    if not picks:
        return None, "arena lokal tanpa picks MICAPROFITA"
    xau = next((p for p in picks if p["simbol"] == "XAUUSDT"), None)
    if xau is not None:
        xau["wajib"] = True
    else:
        hp, _chg, _s, _ts = xau_live()
        if hp:
            xau = {"simbol": "XAUUSDT", "arah": "BUY", "keyakinan": None,
                   "entry": float(hp), "wajib": True,
                   "ket": "sintesis mesin-kesegaran (arena tak membawa XAU)"}
    koin = [p for p in picks if p["simbol"] != "XAUUSDT"]
    koin.sort(key=lambda x: (x.get("keyakinan") or 0), reverse=True)
    slot = d.get("slotHariIni") or {}
    snap = {"waktu": datetime.now(timezone.utc).isoformat(),
            "sumber": "arena-lokal(mesin-kesegaran)", "regime": d.get("regime"),
            "dianalisa": slot.get("dianalisa"), "lahir": slot.get("lahir"),
            "hariData": d.get("dataDay"), "lag": d.get("dataLagHari"), "stale": d.get("stale"),
            "total": len(koin) + (1 if xau else 0),
            "picks": koin[:120], "xau": xau}
    return snap, (f"arena-lokal (dataDay {d.get('dataDay')}, lag {d.get('dataLagHari')}, "
                  f"{len(koin)} koin)")


# ------------------------------------------------------------- KABAR CEPAT --
def kabar_cepat():
    """Snapshot instan: harga live (distempel umur+sumur) + tren + berita.
    Ini wujud 'fast, news selalu, tanggap' — satu panggilan, segalanya segar."""
    L = [f"⚡ <b>KABAR CEPAT</b> — {sekarang_wib()}", ""]
    with ThreadPoolExecutor(max_workers=4) as ex:
        f_h = ex.submit(harga_live, ["BTC", "ETH"], True)
        f_x = ex.submit(xau_live)
        f_b = ex.submit(berita, 5, 24)
        f_t = ex.submit(trending, 5)
        try:
            h = f_h.result(timeout=30)
        except Exception:
            h = {}
        try:
            x = f_x.result(timeout=20)
        except Exception:
            x = (None, None, "gagal", None)
        try:
            b = f_b.result(timeout=30)
        except Exception:
            b = []
        try:
            t = f_t.result(timeout=20)
        except Exception:
            t = []
    if h:
        for s in ("BTC", "ETH"):
            d = h.get(s)
            if d:
                st = statistik_24jam(s) or {}
                chg = f" ({st['chg']:+.2f}% 24j)" if st.get("chg") is not None else ""
                L.append(f"💰 <b>{s}</b> {fmt_harga(d['harga'])}{chg} "
                         f"<i>[{d['sumber']} · umur {umur_teks(time.time() - d['ts'])}]</i>")
    if isinstance(x, tuple) and x[0]:
        L.append(f"🥇 <b>EMAS/XAU</b> {fmt_harga(x[0])}" + (f" ({x[1]:+.2f}% 24j)" if x[1] is not None else "")
                 + f" <i>[{x[2]}]</i>")
    if t:
        L.append("")
        L.append("🔥 <b>TRENDING</b> " + " · ".join(
            f"{c.get('simbol') or c.get('nama')}" for c in t[:5]))
    if b:
        L.append("")
        L.append("📰 <b>BERITA TERKINI</b>")
        for n in b[:5]:
            L.append(f"• {n['judul']} <i>[{n['sumber']} · {umur_teks(n['umur'])}]</i>")
    if not h and not b:
        L.append("⚠️ Semua sumber tertahan — sedang buru ulang, coba beberapa detik lagi.")
    L.append("")
    L.append("<i>Mesin kesegaran: harga dicetak DENGAN waktu & sumber — angka basi tidak pernah dikirim sebagai angka baru.</i>")
    return "\n".join(L)


if __name__ == "__main__":
    print("=== UJI DATA-FRESH ===")
    h = harga_live(["BTC", "ETH", "SOL"], perbarui_paksa=True)
    for s, d in h.items():
        print(f"{s}: {fmt_harga(d['harga'])} [{d['sumber']}] umur={umur_teks(time.time() - d['ts'])}")
    x = xau_live()
    print(f"XAU: {fmt_harga(x[0])} [{x[2]}]")
    o = buru_otak_segars()
    print(f"OTAK: status={o['status']} ({o['teks']})")
    for n in berita(5)[:5]:
        print(f"BERITA: {n['judul'][:70]} [{n['sumber']}] {umur_teks(n['umur'])}")
    for c in trending(5):
        print(f"TREN: {c['simbol']} ({c['nama']})")
