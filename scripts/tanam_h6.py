#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tanam H6 (tanda hidup terlihat di Telegram) ke hukum pemilik, v10.5 -> v10.6."""
import json

J = "/home/z/my-project/data/hukum_pemilik.json"
M = "/home/z/my-project/data/HUKUM_PEMILIK.md"

H6 = {
    "id": "H6",
    "judul": "Tanda hidup terlihat di Telegram (mandat 2 Nov v10.6)",
    "isi": "Pemilik tidak bisa melihat status online bot (Telegram memang tidak pernah "
           "menampilkan status online untuk bot), jadi kehidupan WAJIB terlihat sebagai "
           "PESAN: tiap 6 jam heartbeat mengirim satu pesan pendek '💓 TANDA HIDUP' berisi "
           "bukti angka (siklus denyut, gap, jumlah sasaran dipantau, harga tersedia, "
           "gagal kirim 24 jam, umur genome, akurasi). Antara tanda hidup, Telegram tetap "
           "senyap sesuai H5 — notifikasi level + laporan ATH tidak berubah."
}

with open(J, "r", encoding="utf-8") as f:
    d = json.load(f)
d["versi"] = "v10.6-2nov"
d["hukum"] = [h for h in d["hukum"] if h.get("id") != "H6"] + [H6]
with open(J, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=1)

MD6 = """
## H6 — Tanda hidup terlihat di Telegram (mandat 2 Nov v10.6)
Pemilik tidak bisa melihat status online bot (Telegram tidak pernah menampilkan status
online untuk bot), jadi kehidupan **wajib terlihat sebagai pesan**: tiap 6 jam heartbeat
mengirim satu pesan pendek **💓 TANDA HIDUP** berisi bukti angka (siklus denyut, gap,
sasaran dipantau, harga tersedia, gagal kirim 24 jam, umur genome, akurasi). Antara tanda
hidup Telegram tetap senyap sesuai H5 — notifikasi level + laporan ATH tidak berubah.
Implementasi: blok TANDA HIDUP di `scripts/heartbeat.py` V305 (penanda `tanda_hidup_terakhir`).
"""
with open(M, "r", encoding="utf-8") as f:
    md = f.read()
if "H6 — Tanda hidup" not in md:
    with open(M, "a", encoding="utf-8") as f:
        f.write(MD6)

print("hukum versi:", d["versi"], "| hukum:", [h["id"] for h in d["hukum"]])
print("md H6 tertanam:", "H6 — Tanda hidup" in open(M, encoding="utf-8").read())
