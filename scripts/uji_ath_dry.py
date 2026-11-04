#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Uji DRY mandat 2 Nov: universe ATH -80..-100% masih hidup + cek magma/ain/idol.
dry=True -> tidak kirim Telegram, tidak tulis state. Aman."""
import sys, os
sys.path.insert(0, "/home/z/my-project/scripts")
os.chdir("/home/z/my-project")
import balas_telegram as bt

tok, chat = bt.nyawa()
print("TOKEN_ADA:", bool(tok))
print("DRY:", bt.ath_cepat(tok, dry=True))

# cek contoh pemilik dari sumber yang sama
try:
    req = bt.urllib.request.Request(f"{bt.PAPRIKA_81}/tickers?limit=500&start=0",
                                    headers={"User-Agent": "benteng-balas"})
    arr = bt.json.loads(bt.urllib.request.urlopen(req, timeout=25).read().decode())
    print("PAPRIKA_JUMLAH:", len(arr))
    for x in arr:
        s = str(x.get("symbol") or "").split("-")[0].upper()
        if s in ("MAGMA", "AIN", "IDOL", "MAGM"):
            usd = x.get("quotes", {}).get("USD", {})
            drop = usd.get("percent_from_price_ath")
            print(f"PAPRIKA {s}: price={usd.get('price')} ath={usd.get('ath_price')} "
                  f"drop={drop} vol24j={usd.get('volume_24h')}")
except Exception as e:
    print("paprika cek err:", repr(e))
try:
    ex = bt.json.loads(bt.urllib.request.urlopen(bt.urllib.request.Request(
        "https://fapi.binance.com/fapi/v1/exchangeInfo",
        headers={"User-Agent": "benteng-balas"}), timeout=25).read().decode())
    fut = [si["symbol"] for si in ex.get("symbols", [])
           if si.get("contractType") == "PERPETUAL" and si.get("quoteAsset") == "USDT"
           and si.get("status") == "TRADING"]
    print("BINANCE_FUT_JUMLAH:", len(fut))
    print("FUT_CONTAIN:", [s for s in ("MAGMAUSDT", "AINUSDT", "IDOLUSDT") if s in fut])
except Exception as e:
    print("binance cek err:", repr(e))
