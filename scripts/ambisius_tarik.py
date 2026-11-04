#!/usr/bin/env python3
# ============================================================
# AMBISIUS — FASE 1a: PENARIK DATA REAL (Binance spot publik)
# Bank data klines 1h untuk mesin ujian 50.000 soal jual-ambisius.
# - Universe: funnel ringan V298-v2 (USDT TRADING, qv>=3jt, buang
#   leveraged + gerbang pegged sederhana) → ambil TOP 130 likuid.
# - Klines 1h × 1000 candle (~41,7 hari) + BTC sebagai kompas rezim.
# - Multi-mirror + ThreadPoolExecutor(12), percobaan per-host.
# - Simpan pickle: scripts/ambisius_data/klines.pkl
# ============================================================
import json
import pickle
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

MIRRORS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api4.binance.com",
    "https://data-api.binance.vision",
]
OUT = "/home/z/my-project/scripts/ambisius_data/klines.pkl"

# --- gerbang pegged sederhana (subset L1/L2 yang relevan untuk pool besar) ---
PEGGED_L1 = {
    "USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "BUSDUSDT",
    "USDSUSDT", "USDEUSDT", "USD1USDT", "USDGUSDT", "PYUSDUSDT", "XUSDUSDT",
    "USRUSDT", "USTCUSDT", "SUSDEUSDT", "SUSDUSDT", "FRAXUSDT", "USDDUSDT",
    "EURUSDT", "AEURUSDT", "EURIUSDT", "GBPUSDT", "AUDUSDT", "PAXGUSDT",
    "XAUTUSDT", "USDTUSDT",
}
import re
PEGGED_SUB = re.compile(r"USD|EUR|GHO|XAUT|PAXG|DAI|FRAX|USTC|XAG")
FIAT_EXACT = {"GBP", "AUD", "USD", "EUR", "TRY", "BRL", "JPY", "ZAR", "USDT"}


def pegged(base: str, sym: str) -> bool:
    if sym in PEGGED_L1 or base in FIAT_EXACT:
        return True
    return bool(PEGGED_SUB.search(base))


def get(url: str, timeout: int = 20):
    last = None
    for m in MIRRORS:
        try:
            req = urllib.request.Request(m + url, headers={"User-Agent": "micaprofita/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa: BLE001
            last = e
    raise last


def ambil_simbol_top(n_top=130):
    ex = get("/api/v3/exchangeInfo?permissions=SPOT")
    sah = {s["symbol"] for s in ex["symbols"] if s["status"] == "TRADING" and s["quoteAsset"] == "USDT"}
    tk = get("/api/v3/ticker/24hr")
    kand = []
    for t in tk:
        sym = t["symbol"]
        if not sym.endswith("USDT") or sym not in sah:
            continue
        base = sym[:-4]
        if re.search(r"(UP|DOWN|BULL|BEAR)$", base):
            continue
        if pegged(base, sym):
            continue
        qv = float(t["quoteVolume"])
        if qv < 3_000_000:
            continue
        kand.append((sym, qv))
    kand.sort(key=lambda x: -x[1])
    top = [s for s, _ in kand[:n_top]]
    return top


def tarik_klines(sym: str, interval="1h", limit=1000):
    url = f"/api/v3/klines?symbol={urllib.parse.quote(sym)}&interval={interval}&limit={limit}"
    raw = get(url)
    out = []
    for k in raw:
        out.append(
            (
                int(k[0]),          # openTime
                float(k[1]),        # open
                float(k[2]),        # high
                float(k[3]),        # low
                float(k[4]),        # close
                float(k[5]),        # volume
                float(k[7]),        # quoteVolume
            )
        )
    return out


def main():
    t0 = time.time()
    top = ambil_simbol_top(130)
    if "BTCUSDT" not in top:
        top.append("BTCUSDT")
    print(f"[1] {len(top)} simbol terpilih (top likuid qv>=3jt, gerbang pegged aktif)")

    hasil = {}
    gagal = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futs = {pool.submit(tarik_klines, s): s for s in top}
        done = 0
        for f in as_completed(futs):
            s = futs[f]
            try:
                kl = f.result()
                if len(kl) >= 200:
                    hasil[s] = kl
                else:
                    gagal.append((s, f"kurang candle: {len(kl)}"))
            except Exception as e:  # noqa: BLE001
                gagal.append((s, str(e)[:80]))
            done += 1
            if done % 20 == 0:
                print(f"    ...{done}/{len(top)} simbol ({time.time()-t0:.0f} dtk)")

    with open(OUT, "wb") as f:
        pickle.dump(hasil, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"[2] SELESAI: {len(hasil)} simbol tersimpan, {len(gagal)} gagal → {OUT}")
    for s, al in gagal[:8]:
        print(f"    GAGAL {s}: {al}")
    btc = hasil.get("BTCUSDT", [])
    if btc:
        rentang_h = (btc[-1][0] - btc[0][0]) / 3_600_000
        print(f"    kedalaman ~{rentang_h:.0f} jam (~{rentang_h/24:.0f} hari) per simbol")
    print(f"    waktu total: {time.time()-t0:.1f} dtk")
    return 0 if len(hasil) >= 80 else 1


if __name__ == "__main__":
    sys.exit(main())
