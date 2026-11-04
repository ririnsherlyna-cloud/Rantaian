#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Intip struktur sasaran hidup: kunci utama + 1 contoh sasaran + cari level TP/Ambisius/PowerMax."""
import json
import urllib.request

RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"


def get_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "microprofita-diag"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", "replace")
    except Exception as e:
        print("gagal:", repr(e))
        return None


s = get_text(f"{RAW}/laporan/sasaran-terkini.json")
if not s:
    raise SystemExit(1)
d = json.loads(s)
print("=== KUNCI UTAMA ===")
print(sorted(d.keys()))
print("\n=== META ===")
print("siklus:", d.get("siklus"), "| dihasilkan:", d.get("dihasilkan"),
      "| rezimBTC:", d.get("rezimBTC"), "| akurasi:", d.get("akurasi") if not isinstance(d.get("akurasi"), dict) else d["akurasi"].get("akurasiPct"))

for kunci_k in ("sasaranHariIni", "sasaran", "daftar", "sasaranTerkini"):
    arr = d.get(kunci_k)
    if isinstance(arr, list) and arr:
        print(f"\n=== CONTOH ENTRI '{kunci_k}' (1 dari {len(arr)}) ===")
        print(json.dumps(arr[0], ensure_ascii=False, indent=1)[:1600])
        # cari kunci yang menyebut tp/ambisius/power
        flat = json.dumps(arr[0], ensure_ascii=False).lower()
        for kata in ("tp", "ambisius", "power", "target", "harga"):
            if kata in flat:
                print(f"[mengandung kata: {kata}]")
        break
