#!/usr/bin/env python3
"""Uji v10.7 PUNCAK KEJADIAN MASA KINI:
1) ath_cepat(dry=True) — jalur nyata tanpa kirim;
2) sampel kandidat: puncak & tanggal lilin dicocokkan dengan kline mentah
   (bukti 'sama persis dengan kejadian masa kini')."""
import sys, json, urllib.request
sys.path.insert(0, "/home/z/my-project/scripts")
import balas_telegram as bt

token, chat_id = bt.nyawa()
print("== DRY RUN v10.7 ==")
print(bt.ath_cepat(token, dry=True))

print("\n== SAMPEL PUNCAK vs KLINE MENTAH ==")
def kline(sym, n=30):
    u = f"https://fapi.binance.com/fapi/v1/klines?symbol={sym}USDT&interval=1d&limit={n}"
    req = urllib.request.Request(u, headers={"User-Agent": "uji"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())

from datetime import datetime, timezone, timedelta
wib = timezone(timedelta(hours=7))
for sym in ("MAGMAUSDT", "AINUSDT", "IDOLUSDT", "MOVEUSDT"):
    try:
        kl = kline(sym)
    except Exception as e:
        print(f"{sym}: gagal {repr(e)[:60]}")
        continue
    highs = [(float(k[2]), int(k[0])) for k in kl]
    last = float(kl[-1][4])  # close lilin terakhir (berjalan)
    hi, ms = max(highs)
    idx = highs.index((hi, ms))
    umur = len(highs) - 1 - idx
    tgl = datetime.fromtimestamp(ms / 1000, wib).strftime("%d %b")
    d = (1 - last / hi) * 100 if hi else 0
    layak = "LOLOS(umur<=14)" if umur <= 14 else "DIBUANG(>14 hari = masa lampau)"
    print(f"{sym}: puncak {hi} lilin {tgl} (umur {umur} hari) | kini {last} | turun {d:.1f}% -> {layak}")
