#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bandingkan dua sapuan V300-SAPU10 — menilai waktu berlalu."""
import json

a = json.load(open("/home/z/my-project/scripts/out-prev.json"))   # sapuan lampau
b = json.load(open("/home/z/my-project/scripts/out-sapu10.json")) # sapuan kini

pa = {s["symbol"]: s for s in a["top10"]}
pb = {s["symbol"]: s for s in b["top10"]}

print(f"Lama : {a['waktu_scan']}")
print(f"Kini : {b['waktu_scan']}")
print()
masuk = [s["symbol"] for s in b["top10"] if s["symbol"] not in pa]
keluar = [s["symbol"] for s in a["top10"] if s["symbol"] not in pb]
print(f"MASUK baru        : {', '.join(masuk) if masuk else '-'}")
print(f"KELUAR dari daftar: {', '.join(keluar) if keluar else '-'}")
print()
print("Pergerakan sasaran yang tetap (lama -> kini):")
for s in b["top10"]:
    sym = s["symbol"]
    if sym in pa:
        o = pa[sym]
        dp = (s["harga"] / o["harga"] - 1) * 100
        print(f"  {sym:<11} harga {dp:+.2f}% | mom7 {o['mom7']:+.2f}% -> {s['mom7']:+.2f}% "
              f"| skor {o['skor']} -> {s['skor']} | bias {o['bias']} -> {s['bias']}")

da, db = a["denyut"], b["denyut"]
print()
print(f"Denyut kandidat : {da['naik']} naik/{da['turun']} turun -> {db['naik']} naik/{db['turun']} turun")
print(f"Median 24 jam   : {da['median_chg24']:+.2f}% -> {db['median_chg24']:+.2f}%")
print(f"Porsi likuiditas: BTC {da['porsi_btc']:.1f}% -> {db['porsi_btc']:.1f}% | ETH {da['porsi_eth']:.1f}% -> {db['porsi_eth']:.1f}%")
