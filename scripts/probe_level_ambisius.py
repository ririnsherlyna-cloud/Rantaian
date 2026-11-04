#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contoh konkret: level jual-ambisius V301 untuk beberapa koin saat ini."""
import json
import urllib.request

import numpy as np

BASE = "/home/z/my-project/scripts/data"
konst = json.load(open(f"{BASE}/ambisius_juara.json"))
UA = {"User-Agent": "MICAPROFITA-V301-probe/1.0"}


def klines(sym, limit=1000):
    url = f"https://api.binance.com/api/v3/klines?symbol={sym}&interval=1d&limit={limit}"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=15) as r:
        raw = json.loads(r.read().decode())
    return raw


def fitur_x(raw):
    c = np.array([float(k[4]) for k in raw])
    h = np.array([float(k[2]) for k in raw])
    l = np.array([float(k[3]) for k in raw])
    qv = np.array([float(k[7]) for k in raw])
    n = len(c)
    t = n
    p = c[t - 1]
    pc = np.concatenate([[c[0]], c[:-1]])
    tr = np.maximum(h - l, np.maximum(abs(h - pc), abs(l - pc)))
    atr14 = tr[t - 14:t].mean()
    atrp14 = atr14 / p * 100
    mom7 = (c[t - 1] / c[t - 8] - 1) * 100
    mom30 = (c[t - 1] / c[t - 30] - 1) * 100
    chg24 = (c[t - 1] / c[t - 2] - 1) * 100
    sw8 = h[t - 8:t].max(); sw30 = h[t - 30:t].max(); lo30 = l[t - 30:t].min()
    rng30 = sw30 - lo30
    posisi = (p - lo30) / rng30 if rng30 > 0 else 0.5
    gap8 = (sw8 / p - 1) * 100
    gap30 = (sw30 / p - 1) * 100
    vs = qv[t - 3:t].mean() / max(qv[t - 30:t].mean(), 1e-9)
    up14 = (c[t - 14:t] > pc[t - 14:t]).mean()
    sig = np.std(np.diff(np.log(c[t - 15:t - 1]))) * 100
    x = [1.0, atrp14, mom7, mom30, chg24, posisi, gap8, gap30, vs, up14, sig,
         chg24 * up14, posisi * gap8, float(np.log1p(max(vs, 0)))]
    return x, atrp14, p, raw[t - 1]


def pred(x, koef, mu, sd, q, atrp):
    prediksi = koef[0] + sum(koef[i] * ((x[i] - mu[i - 1]) / sd[i - 1]) for i in range(1, len(koef)))
    xhat = np.expm1(np.clip(prediksi, -2.0, 4.0))
    return xhat * atrp * q


def fmt(px):
    if px >= 1:
        return f"{px:,.4f}".rstrip("0").rstrip(".")
    return f"{px:.8f}".rstrip("0")


for sym in ("BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT"):
    raw = klines(sym)
    x, atrp, p, bar = fitur_x(raw)
    ka = konst["atas"]["params"]; kb = konst["bawah"]["params"]
    a_atas = pred(x, ka["_koef"], ka["_mu"], ka["_sd"], ka["q"], atrp)
    a_bawah = pred(x, kb["_koef"], kb["_mu"], kb["_sd"], kb["q"], atrp)
    A = p * (1 + a_atas / 100)
    Adn = p * (1 - min(10, max(0.15, a_bawah)) / 100)
    import datetime
    hari = datetime.datetime.utcfromtimestamp(bar[0] / 1000).strftime("%Y-%m-%d")
    print(f"{sym:<10} close({hari}) {fmt(p):>12} | ATR% {atrp:5.2f} | "
          f"JUAL-AMBISIUS {fmt(A):>12} (+{a_atas:.2f}%) | ambisius-beli {fmt(Adn):>12} (-{min(10, max(0.15, a_bawah)):.2f}%)")
