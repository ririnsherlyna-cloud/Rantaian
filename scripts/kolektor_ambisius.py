#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# KOLEKTOR DATA RIIL — UJIAN JUAL-AMBISIUS 50.000 (V301-AMBISIUS)
# Hukum yang diwarisi (tidak diturunkan):
#   V298-v2: bedah kandang penuh — semua pasangan USDT likuid qv>=3jt
#   V299b  : gerbang anti-pegged 3 lapis (daftar eksplisit + pola akhir
#            base + jaring statistik ATR<1.5% & |mom7|<1% & dekat peg)
# Output: scripts/data/ambisius_pool.npz + ambisius_meta.json
# ============================================================
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np

BASE = "/home/z/my-project/scripts"
DATA_DIR = os.path.join(BASE, "data")
os.makedirs(DATA_DIR, exist_ok=True)

MIRRORS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api4.binance.com",
    "https://data-api.binance.vision",
]
UA = {"User-Agent": "MICAPROFITA-V301-ambisius-collector/1.0"}

# ---- V299b lapis-1: daftar pegged eksplisit (identik sapu10.py) ----
PEGGED_L1 = {
    "USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "BUSDUSDT",
    "USDSUSDT", "USDEUSDT", "USD1USDT", "USDGUSDT", "PYUSDUSDT", "XUSDUSDT",
    "USRUSDT", "USTCUSDT", "SUSDEUSDT", "SUSDUSDT", "FRAXUSDT", "USDDUSDT",
    "EURUSDT", "AEURUSDT", "EURIUSDT", "GBPUSDT", "AUDUSDT", "PAXGUSDT",
    "XAUTUSDT", "USDTUSDT",
}
# ---- V299b lapis-2: pola akhir base ----
PEGGED_SUFFIX = (
    "USD", "USDC", "USDP", "USDS", "USDG", "USDE", "USD1", "USDD", "PYUSD",
    "FDUSD", "TUSD", "XUSD", "SUSD", "FRAX", "DAI", "UST", "USTC", "EUR",
    "EURI", "AEUR", "GBP", "AUD", "PAXG", "XAUT",
)
LEVERAGED = ("UP", "DOWN", "BULL", "BEAR")
MIN_QV = 3_000_000          # V298-v2
TARGET_POOL = 150           # koin untuk ditarik 1000 bar hariannya
MIN_BARS = 60               # koin dengan sejarah pendek dibuang


def fetch_json(path, timeout=15):
    last = None
    for attempt in range(3):
        mirror = MIRRORS[(attempt + hash(path) % len(MIRRORS)) % len(MIRRORS)]
        url = mirror + path
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(0.4 * (attempt + 1))
    raise RuntimeError(f"gagal fetch {path}: {last}")


def ambil_universe():
    """Funnel V298-v2 + gerbang V299b lapis-1 & lapis-2 (lapis-3 statis menyusul)."""
    info = fetch_json("/api/v3/exchangeInfo")
    ok = set()
    for s in info["symbols"]:
        if s.get("status") != "TRADING":
            continue
        if s.get("quoteAsset") != "USDT":
            continue
        base = s.get("baseAsset", "")
        if base.endswith(LEVERAGED) and len(base) > len(LEVERAGED[0]) and base[:-2] in ("", ):
            continue
        # buang leveraged token: pola UP/DOWN/BULL/BEAR di akhir base
        if base.endswith("UP") or base.endswith("DOWN") or base.endswith("BULL") or base.endswith("BEAR"):
            continue
        ok.add(s["symbol"])

    tick = fetch_json("/api/v3/ticker/24hr")
    rows = []
    for t in tick:
        sym = t.get("symbol", "")
        if sym not in ok:
            continue
        qv = float(t.get("quoteVolume", 0) or 0)
        if qv < MIN_QV:
            continue
        base = sym[:-4]  # buang 'USDT'
        if sym in PEGGED_L1:                       # lapis-1
            continue
        if base.endswith(PEGGED_SUFFIX):           # lapis-2
            continue
        rows.append((sym, qv))
    rows.sort(key=lambda x: -x[1])
    return [r[0] for r in rows[: TARGET_POOL + 20]]


def jaring_statis(sym, close, atrp, mom7):
    """V299b lapis-3: jaring statistik + jaring rapat (diterapkan per koin)."""
    p = close[-1]
    if 0.97 <= p <= 1.03 and atrp < 1.5 and abs(mom7) < 1.0:
        return True
    if 0.97 <= p <= 1.03 and atrp < 0.5 and abs(mom7) < 0.3:
        return True
    return False


def tarik_klines(sym):
    raw = fetch_json(f"/api/v3/klines?symbol={urllib.parse.quote(sym)}&interval=1d&limit=1000")
    out = {
        "openTime": np.array([int(k[0]) for k in raw], dtype=np.int64),
        "open": np.array([float(k[1]) for k in raw], dtype=np.float64),
        "high": np.array([float(k[2]) for k in raw], dtype=np.float64),
        "low": np.array([float(k[3]) for k in raw], dtype=np.float64),
        "close": np.array([float(k[4]) for k in raw], dtype=np.float64),
        "volume": np.array([float(k[5]) for k in raw], dtype=np.float64),
        "qv": np.array([float(k[7]) for k in raw], dtype=np.float64),
    }
    return out


def hitung_atrp_mom7(k):
    c, h, l = k["close"], k["high"], k["low"]
    pc = np.concatenate([[c[0]], c[:-1]])
    tr = np.maximum(h - l, np.maximum(abs(h - pc), abs(l - pc)))
    if len(c) < 30:
        return 99.0, 0.0
    atrp = float(np.mean(tr[-15:-1]) / c[-1] * 100)
    mom7 = float((c[-1] / c[-8] - 1) * 100)
    return atrp, mom7


def main():
    t0 = time.time()
    print("[1/3] Menyusun universe (V298-v2 + V299b lapis 1-2)...")
    kandidat = ambil_universe()
    print(f"      kandidat: {len(kandidat)} koin (qv>=3jt, bebas pegged lapis 1-2)")

    print("[2/3] Menarik 1000 bar harian per koin (multi-mirror)...")
    pool = {}
    gagal = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        hasil = list(ex.map(tarik_klines_safe, kandidat))
        time.sleep(0.1)
    for sym, k in hasil:
        if k is None:
            gagal.append(sym)
            continue
        if len(k["close"]) < MIN_BARS:
            gagal.append(sym + f"(bar {len(k['close'])}<{MIN_BARS})")
            continue
        atrp, mom7 = hitung_atrp_mom7(k)
        if jaring_statis(sym, k["close"], atrp, mom7):   # lapis-3
            gagal.append(sym + "(jaring-statistik)")
            continue
        pool[sym] = k
    # jaga ukuran TARGET_POOL terbaik (sudah terurut qv)
    symbols = [s for s in kandidat if s in pool][:TARGET_POOL]
    pool = {s: pool[s] for s in symbols}
    print(f"      pool murni: {len(pool)} koin | dibuang/gagal: {len(gagal)}")

    print("[3/3] Menyimpan NPZ + meta...")
    arrays = {}
    idx = {}
    for i, s in enumerate(symbols):
        k = pool[s]
        for f in ("openTime", "open", "high", "low", "close", "volume", "qv"):
            arrays[f"{f}__{i}"] = k[f]
        idx[s] = i
    np.savez_compressed(os.path.join(DATA_DIR, "ambisius_pool.npz"), **arrays)
    meta = {
        "versi": "V301-AMBISIUS-KOLEKTOR",
        "at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "symbols": symbols,
        "idx": idx,
        "dibuang": gagal,
        "jumlah_bar_min": int(min(len(pool[s]["close"]) for s in symbols)),
        "detik": round(time.time() - t0, 1),
    }
    with open(os.path.join(DATA_DIR, "ambisius_meta.json"), "w") as f:
        json.dump(meta, f, indent=1)
    total_bar = sum(len(pool[s]["close"]) for s in symbols)
    print(f"      SELESAI {meta['detik']}s — {len(symbols)} koin, {total_bar} bar total")
    print(f"      contoh 10 koin teratas: {symbols[:10]}")


def tarik_klines_safe(sym):
    try:
        return sym, tarik_klines(sym)
    except Exception as e:  # noqa: BLE001
        print(f"      [skip] {sym}: {str(e)[:80]}")
        return sym, None


if __name__ == "__main__":
    sys.exit(main())
