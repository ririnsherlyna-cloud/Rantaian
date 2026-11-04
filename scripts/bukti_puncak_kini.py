#!/usr/bin/env python3
"""Bukti 'sama persis dengan kejadian masa kini': pindai seluruh perpetual
USDT Binance, ambil puncak 30 lilin harian (umur <=14 hari), tampilkan koin
yang kini -80..-100% dari puncak itu BESERTA tanggal lilin puncaknya, lalu
cocokkan dengan kline mentah."""
import json, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta

WIB = timezone(timedelta(hours=7))

def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "uji-v107"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

ex = get("https://fapi.binance.com/fapi/v1/exchangeInfo", 25)
sym_ok = {s["symbol"] for s in ex.get("symbols") or []
          if s.get("contractType") == "PERPETUAL" and s.get("quoteAsset") == "USDT"
          and s.get("status") == "TRADING"}
tick = get("https://fapi.binance.com/fapi/v1/ticker/24hr", 25)
harga = {t["symbol"]: float(t.get("lastPrice") or 0) for t in tick if t["symbol"] in sym_ok}
harga = {s: p for s, p in harga.items() if p > 0}
print(f"perpetual aktif: {len(harga)}")

def puncak(sym):
    try:
        kl = get(f"https://fapi.binance.com/fapi/v1/klines?symbol={sym}&interval=1d&limit=30", 15)
        hs = [(float(k[2]), int(k[0])) for k in kl]
        hi, ms = max(hs)
        umur = len(hs) - 1 - hs.index((hi, ms))
        return sym, hi, umur, ms
    except Exception:
        return sym, 0.0, None, None

hasil = []
with ThreadPoolExecutor(max_workers=12) as ex2:
    for sym, hi, umur, ms in ex2.map(puncak, list(harga)):
        if hi > 0 and umur is not None and umur <= 14:
            d = (1 - harga[sym] / hi) * 100.0
            if 80.0 <= d <= 100.0:
                hasil.append((sym, hi, umur, ms, d))

hasil.sort(key=lambda x: -x[4])
print(f"\nkoin -80..-100% dari PUNCAK KEJADIAN (umur<=14 hari): {len(hasil)}")
for sym, hi, umur, ms, d in hasil[:15]:
    tgl = datetime.fromtimestamp(ms / 1000, WIB).strftime("%d %b")
    print(f"  {sym}: puncak {tgl} ({umur} hari lalu) = {hi} | kini {harga[sym]} | turun {d:.1f}%")
if not hasil:
    print("  (kosong — tidak ada runtuhan yang SEDANG terjadi dari kejadian masa kini)")
