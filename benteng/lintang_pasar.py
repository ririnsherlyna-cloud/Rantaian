#!/usr/bin/env python3
# LINTANG-PASAR v3: lapisan intel pasar lintas-sumber GRATIS (tanpa API berbayar)
# Mandat pemilik 6 Nov: "perbanyak sumber daya, api ini api itu api lain lain,
# langsung jangan Tanya — jangan buta arah senantiasa!"
# Sumber: CoinGecko (market cap + ATH + ath_date), CoinPaprika (fallback mcap/ath
#         + ath_date), harga & 24h chg 8 exchange: Binance, Bybit, OKX, HTX,
#         MEXC, Gate, KuCoin, Bitget, + Fear&Greed alternative.me (bebas).
# v3 BARU (kesadaran lintas bursa yang dimaksud pemilik):
#   - chg 24h PER BURSA -> deteksi DIVERGENSI ARAH:
#     "Binance turun tapi di yang lain naik" (dan sebaliknya) — bukan cuma
#     beda harga statis, tapi arah pergerakan yang berseberangan.
#   - ath_date (tanggal puncak) ikut disimpan.
# Mode: --sekali (ambil sekali, simpan data/pasar_lintas.json) | --jaga (loop daemon tiap 30 menit)
import json, time, sys, os, math, statistics

BASE = "/home/z/my-project"
OUT_JSON = f"{BASE}/data/pasar_lintas.json"
NYALA = f"{BASE}/data/lintang_nyala"
INTERVAL = 1800  # 30 menit
UA = {"User-Agent": "Mozilla/5.0 (compatible; MicroProfita-Lintang/2.0)"}

def http_json(url, timeout=15):
    import urllib.request
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def _float(v):
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None

def ambil_coingecko(sumber):
    """Top 500 koin: market cap, ATH, ath_date, % dari ATH, chg24h. 2 panggilan gratis."""
    out = {}
    for page in (1, 2):
        try:
            rows = http_json(f"https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page={page}&price_change_percentage=24h")
            for r in rows or []:
                sym = (r.get("symbol") or "").upper()
                if not sym or sym in out:  # urut mcap desc: entri pertama = yang benar
                    continue
                out[sym] = {
                    "market_cap": r.get("market_cap"),
                    "ath": r.get("ath"),
                    "ath_date": r.get("ath_date"),
                    "ath_pct": r.get("ath_change_percentage"),
                    "rank": r.get("market_cap_rank"),
                    "chg24h": r.get("price_change_percentage_24h"),
                }
        except Exception:
            pass
    if out:
        sumber["coingecko"] = len(out)
    return out

def ambil_coinpaprika(sumber):
    """Fallback market cap + ATH + ath_date dari CoinPaprika (gratis, 1 panggilan)."""
    out = {}
    try:
        rows = http_json("https://api.coinpaprika.com/v1/tickers?quotes=USD")
        for r in rows or []:
            sym = (r.get("symbol") or "").upper()
            q = r.get("quotes", {}).get("USD", {})
            if not sym:
                continue
            cand = {
                "market_cap": q.get("market_cap"),
                "ath": q.get("ath_price"),
                "ath_date": q.get("ath_date"),
                "ath_pct": q.get("percent_from_price_ath"),
                "chg24h": q.get("percent_change_24h"),
                "rank": r.get("rank"),
            }
            prev = out.get(sym)
            # simbol bentrok antar-token: simpan yang market cap terbesar (koin asli)
            if prev is None or (cand.get("market_cap") or 0) > (prev.get("market_cap") or 0):
                out[sym] = cand
        if out:
            sumber["coinpaprika"] = len(out)
    except Exception:
        pass
    return out

# ---------------- 8 bursa: harga + chg 24h per bursa ----------------
def _chg_open(last, open_):
    """chg % dari last vs open 24h."""
    last, open_ = _float(last), _float(open_)
    if last and open_ and open_ > 0 and last > 0:
        return (last - open_) / open_ * 100.0
    return None

def harga_binance(sumber):
    """Binance spot 24hr: harga + priceChangePercent. Mirror dulu (vision)."""
    out = {}
    for host in ("https://data-api.binance.vision", "https://api.binance.com"):
        try:
            rows = http_json(host + "/api/v3/ticker/24hr")
            for r in rows or []:
                sym = (r.get("symbol") or "").upper()
                if sym.endswith("USDT") and _float(r.get("lastPrice")):
                    out[sym] = {"p": float(r["lastPrice"]),
                                "chg": _float(r.get("priceChangePercent"))}
            if out:
                sumber["binance"] = len(out)
            return out
        except Exception:
            continue
    return out

def harga_bybit(sumber):
    """Bybit USDT perpetual: lastPrice + price24hPcnt (fraksi -> %)."""
    try:
        d = http_json("https://api.bybit.com/v5/market/tickers?category=linear")
        out = {}
        for r in d.get("result", {}).get("list", []) or []:
            sym = (r.get("symbol") or "").upper()
            p = _float(r.get("lastPrice"))
            if sym.endswith("USDT") and p:
                frac = _float(r.get("price24hPcnt"))
                out[sym] = {"p": p, "chg": frac * 100.0 if frac is not None else None}
        if out:
            sumber["bybit"] = len(out)
        return out
    except Exception:
        return {}

def harga_okx(sumber):
    """OKX USDT perpetual swap: last + open24h -> chg."""
    try:
        d = http_json("https://www.okx.com/api/v5/market/tickers?instType=SWAP")
        out = {}
        for r in d.get("data", []) or []:
            sym = (r.get("instId") or "").upper()          # contoh BTC-USDT-SWAP
            if sym.endswith("-USDT-SWAP") and _float(r.get("last")):
                out[sym.replace("-USDT-SWAP", "USDT")] = {
                    "p": float(r["last"]), "chg": _chg_open(r.get("last"), r.get("open24h"))}
        if out:
            sumber["okx"] = len(out)
        return out
    except Exception:
        return {}

def harga_htx(sumber):
    """HTX (Huobi) spot: close + open -> chg."""
    try:
        d = http_json("https://api.huobi.pro/market/tickers")
        out = {}
        for r in d.get("data", []) or []:
            sym = (r.get("symbol") or "").upper()           # contoh btcusdt
            if sym.endswith("USDT") and _float(r.get("close")):
                out[sym] = {"p": float(r["close"]), "chg": _chg_open(r.get("close"), r.get("open"))}
        if out:
            sumber["htx"] = len(out)
        return out
    except Exception:
        return {}

def harga_mexc(sumber):
    """MEXC spot 24hr: harga + priceChangePercent."""
    try:
        rows = http_json("https://api.mexc.com/api/v3/ticker/24hr")
        out = {}
        for r in rows or []:
            sym = (r.get("symbol") or "").upper()
            if sym.endswith("USDT") and _float(r.get("lastPrice")):
                out[sym] = {"p": float(r["lastPrice"]), "chg": _float(r.get("priceChangePercent"))}
        if out:
            sumber["mexc"] = len(out)
        return out
    except Exception:
        return {}

def harga_gate(sumber):
    """Gate.io spot: last + change_percentage (sudah %)."""
    try:
        rows = http_json("https://api.gateio.ws/api/v4/spot/tickers")
        out = {}
        for r in rows or []:
            pair = (r.get("currency_pair") or "").upper()   # contoh BTC_USDT
            if pair.endswith("_USDT") and _float(r.get("last")):
                out[pair.replace("_USDT", "USDT")] = {"p": float(r["last"]),
                                                      "chg": _float(r.get("change_percentage"))}
        if out:
            sumber["gate"] = len(out)
        return out
    except Exception:
        return {}

def harga_kucoin(sumber):
    """KuCoin spot: last + changeRate (fraksi -> %)."""
    try:
        d = http_json("https://api.kucoin.com/api/v1/market/allTickers")
        out = {}
        for r in (d.get("data", {}) or {}).get("ticker", []) or []:
            sym = (r.get("symbol") or "").upper()           # contoh BTC-USDT
            if sym.endswith("-USDT") and _float(r.get("last")):
                frac = _float(r.get("changeRate"))
                out[sym.replace("-USDT", "USDT")] = {"p": float(r["last"]),
                                                     "chg": frac * 100.0 if frac is not None else None}
        if out:
            sumber["kucoin"] = len(out)
        return out
    except Exception:
        return {}

def harga_bitget(sumber):
    """Bitget spot: lastPr + open24h -> chg (fallback change24h)."""
    try:
        d = http_json("https://api.bitget.com/api/v2/spot/market/tickers")
        out = {}
        for r in d.get("data", []) or []:
            sym = (r.get("symbol") or "").upper()
            p = _float(r.get("lastPr"))
            if sym.endswith("USDT") and p:
                chg = _chg_open(p, r.get("open24h"))
                if chg is None:
                    c = _float(r.get("change24h"))
                    if c is not None:
                        chg = c * 100.0 if abs(c) <= 1.0 else c
                out[sym] = {"p": p, "chg": chg}
        if out:
            sumber["bitget"] = len(out)
        return out
    except Exception:
        return {}

def ambil_fear_greed():
    """Fear & Greed Index alternative.me — sumber bebas, tak tergantung Coinglass."""
    try:
        d = http_json("https://api.alternative.me/fng/?limit=1", timeout=10)
        e = (d.get("data") or [{}])[0]
        if e.get("value") is not None:
            return {"nilai": int(e["value"]), "label": e.get("value_classification", "")}
    except Exception:
        pass
    return None

# ---------------- divergensi ARAH (inti mandat pemilik) ----------------
def divergensi_arah(chg_map):
    """'Binance turun tapi di yang lain naik' (dan sebaliknya).
    chg_map: {bursa: chg%} (binance harus ada, >=2 bursa lain).
    Kembalikan (flag, median_lain)."""
    b = chg_map.get("binance")
    lain = [v for k, v in chg_map.items() if k != "binance" and isinstance(v, (int, float))]
    if not isinstance(b, (int, float)) or len(lain) < 2:
        return None, None
    med = statistics.median(lain)
    if b <= -1.0 and med >= 0.5:
        flag = "BINANCE-TURUN-LAIN-NAIK"
    elif b >= 1.0 and med <= -0.5:
        flag = "BINANCE-NAIK-LAIN-TURUN"
    else:
        flag = None
    return flag, med

def gabung_pasar(sumber, cg, cp, ex):
    """Gabung semua. ex = {'binance': {PAIR: {'p': harga, 'chg': chg24h%}}, ...}"""
    pasar = {}
    simbol = set(cg) | set(cp)
    ex_nama = list(ex.keys())
    for sym in simbol:
        e, chg_map = {}, {}
        for exn in ex_nama:
            hit = ex[exn].get(sym + "USDT")
            if isinstance(hit, dict) and hit.get("p") and hit["p"] > 0:
                e[exn] = hit["p"]
                if hit.get("chg") is not None:
                    chg_map[exn] = hit["chg"]
        if len(e) >= 2:
            lo, hi = min(e.values()), max(e.values())
            diverg = (hi - lo) / lo * 100 if lo > 0 else 0.0
        else:
            diverg = 0.0
        suspect = diverg > 20.0  # >20% hampir pasti tabrakan simbol antar-bursa, bukan divergensi nyata
        flag_arah, med_lain = (None, None)
        if not suspect and "binance" in chg_map:
            flag_arah, med_lain = divergensi_arah(chg_map)
        g = cg.get(sym) or {}
        p = cp.get(sym) or {}
        pasar[sym] = {
            "market_cap": g.get("market_cap") or p.get("market_cap"),
            "ath": g.get("ath") or p.get("ath"),
            "ath_date": g.get("ath_date") or p.get("ath_date"),
            "ath_pct": g.get("ath_pct") if g.get("ath_pct") is not None else p.get("ath_pct"),
            "rank": g.get("rank") or p.get("rank"),
            "chg24h": g.get("chg24h") if g.get("chg24h") is not None else p.get("chg24h"),
            "harga_exchange": e,
            "chg_bursa": {k: round(v, 3) for k, v in chg_map.items()},
            "chg_binance": chg_map.get("binance"),
            "chg_median_lain": round(med_lain, 3) if med_lain is not None else None,
            "divergensi_pct": round(diverg, 3),
            "divergensi_arah": flag_arah,
            "jumlah_exchange": len(e),
            "suspect": suspect,
        }
    return pasar

def tulis_nyala():
    try:
        with open(NYALA, "w") as f:
            f.write(f"{time.time()}")
    except Exception:
        pass

def satu_siklus():
    sumber = {}
    cg = ambil_coingecko(sumber)
    cp = ambil_coinpaprika(sumber)
    ex = {
        "binance": harga_binance(sumber),
        "bybit": harga_bybit(sumber),
        "okx": harga_okx(sumber),
        "htx": harga_htx(sumber),
        "mexc": harga_mexc(sumber),
        "gate": harga_gate(sumber),
        "kucoin": harga_kucoin(sumber),
        "bitget": harga_bitget(sumber),
    }
    pasar = gabung_pasar(sumber, cg, cp, ex)
    fng = ambil_fear_greed()
    div_tinggi = sorted(
        [(s, d.get("divergensi_pct", 0.0)) for s, d in pasar.items()
         if d.get("jumlah_exchange", 0) >= 2 and not d.get("suspect")],
        key=lambda x: -x[1])[:10]
    # DIVERGENSI ARAH — top berdasarkan |Binance vs median lain| (koin ber-lapis kokoh dulu)
    daftar_arah = []
    for s, d in pasar.items():
        if d.get("divergensi_arah") and d.get("jumlah_exchange", 0) >= 3 and not d.get("suspect"):
            daftar_arah.append({
                "simbol": s,
                "flag": d["divergensi_arah"],
                "binance_pct": d.get("chg_binance"),
                "lain_pct": d.get("chg_median_lain"),
                "n_bursa": d.get("jumlah_exchange"),
                "skor": abs((d.get("chg_binance") or 0) - (d.get("chg_median_lain") or 0)),
                "rank": d.get("rank") or 99999,
            })
    daftar_arah.sort(key=lambda x: (-x["skor"], x["rank"]))
    data = {
        "ts": time.time(),
        "sumber": sumber,
        "ringkas": {
            "jumlah_koin": len(pasar),
            "dengan_market_cap": sum(1 for v in pasar.values() if v.get("market_cap")),
            "dengan_ath": sum(1 for v in pasar.values() if v.get("ath")),
            "multi_exchange": sum(1 for v in pasar.values() if v.get("jumlah_exchange", 0) >= 3),
            "fear_greed": fng,
            "divergensi_tinggi": [{"simbol": s, "pct": round(p, 2)} for s, p in div_tinggi[:5]],
            "divergensi_arah": daftar_arah[:8],
            "n_divergensi_arah": len(daftar_arah),
        },
        "pasar": pasar,
    }
    os.makedirs(f"{BASE}/data", exist_ok=True)
    tmp = OUT_JSON + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, OUT_JSON)
    tulis_nyala()
    return data

def main():
    if "--jaga" in sys.argv:
        os.chdir(BASE)
        while True:
            try:
                d = satu_siklus()
                r = d["ringkas"]
                print(f"[lintang] koin={r['jumlah_koin']} mcap={r['dengan_market_cap']} ath={r['dengan_ath']} "
                      f"arah={r['n_divergensi_arah']} sumber={d['sumber']}", flush=True)
            except Exception as e:
                print(f"[lintang] err: {e}", flush=True)
            time.sleep(INTERVAL)
    else:
        d = satu_siklus()
        r = d["ringkas"]
        print(f"SUMBER={d['sumber']}")
        print(f"KOIN={r['jumlah_koin']} MCAP={r['dengan_market_cap']} ATH={r['dengan_ath']}")
        print(f"DIVERGENSI_TOP={r['divergensi_tinggi']}")
        print(f"ARAH={r['divergensi_arah']}")
        print(f"MULTI_EXCHANGE={r['multi_exchange']} FEAR_GREED={r['fear_greed']}")

if __name__ == "__main__":
    main()
