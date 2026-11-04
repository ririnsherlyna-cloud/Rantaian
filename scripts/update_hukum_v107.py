#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Perbarui HUKUM PEMILIK H1 -> v10.7 (2 Nov, keluhan pemilik
"pegangannya athnya masa lampau, gak selaras"):
- hukum_pemilik.json : versi + isi H1
- HUKUM_PEMILIK.md   : bagian H1
Master = server; cangkang ditanam terpisah oleh tanam_v107_2nov.py."""
import json

F_JSON = "/home/z/my-project/data/hukum_pemilik.json"
F_MD = "/home/z/my-project/data/HUKUM_PEMILIK.md"

ISI_H1_V107 = (
    "Laporan ATH/koin runtuh wajib mengukur penurunan dari PUNCAK KEJADIAN "
    "MASA KINI: high tertinggi 30 lilin harian terakhir yang umurnya <= 14 hari; "
    "puncak lebih tua = runtuhan itu kejadian masa lampau, koin TIDAK dilaporkan "
    "(bukan ATH sejak listing, bukan pula jendela buta pendek yang bisa salah "
    "puncak). Tanggal lilin puncak dicantumkan di laporan agar penurunan bisa "
    "dicocokkan satu-per-satu dengan kejadian di grafik ('penurunannya sama "
    "persis terjadi dari kejadian masa kini'). Perintah pemilik (paksa=True) "
    "menembus dedup harian untuk kirim ulang yang sah. Implementasi: "
    "ath_cepat() v10.7 di scripts/balas_telegram.py."
)

d = json.load(open(F_JSON, encoding="utf-8"))
d["versi"] = "v10.7-2nov"
for h in d.get("hukum", []):
    if h.get("id") == "H1":
        h["judul"] = "Daftar koin runtuh = penurunan dari PUNCAK KEJADIAN MASA KINI"
        h["isi"] = ISI_H1_V107
json.dump(d, open(F_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("hukum_pemilik.json -> versi", d["versi"])

md = open(F_MD, encoding="utf-8").read()
awal = md.index("## H1 ")
akhir = md.index("## H2 ")
md_baru = (
    "# HUKUM PEMILIK MICROPROFITA — v10.7 (ditetapkan 2 Nov 2026)\n\n"
    "Sumber: wasiat lisan pemilik via chat z.ai, 2 Nov 2026. Status: **mengikat semua tubuh/organ**.\n"
    "Salinan mesin: `data/hukum_pemilik.json`. Salinan cangkang: `benteng/hukum_pemilik.json` (repo Rantaian).\n\n"
    "## H1 — Daftar koin runtuh = penurunan dari PUNCAK KEJADIAN MASA KINI\n"
    "Keluhan pemilik 2 Nov: \"pegangannya athnya masa lampau, gak selaras\". Maka penurunan WAJIB\n"
    "diukur dari **PUNCAK KEJADIAN MASA KINI** — high tertinggi 30 lilin harian terakhir yang\n"
    "umurnya **<= 14 hari**; puncak lebih tua = kejadian masa lampau, koin **tidak dilaporkan**.\n"
    "Bukan ATH sejak listing (masa lampau), bukan jendela buta pendek. Tanggal lilin puncak\n"
    "**dicantumkan** di laporan agar angka bisa dicocokkan satu-per-satu dengan grafik.\n"
    "Perintah langsung pemilik (`paksa=True`) menembus dedup harian.\n"
    "Implementasi: `ath_cepat()` v10.7 di `scripts/balas_telegram.py` (futures diuji dari kline\n"
    "harian; koin paprika tanpa futures wajib lolos verifikasi kline spot — tak terverifikasi dibuang).\n\n"
)
open(F_MD, "w", encoding="utf-8").write(md_baru + md[akhir:])
print("HUKUM_PEMILIK.md -> H1 v10.7 ditulis ulang")
