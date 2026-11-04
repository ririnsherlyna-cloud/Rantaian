# HUKUM PEMILIK MICROPROFITA — v10.7 (ditetapkan 2 Nov 2026)

Sumber: wasiat lisan pemilik via chat z.ai, 2 Nov 2026. Status: **mengikat semua tubuh/organ**.
Salinan mesin: `data/hukum_pemilik.json`. Salinan cangkang: `benteng/hukum_pemilik.json` (repo Rantaian).

## H1 — Daftar koin runtuh = penurunan dari PUNCAK KEJADIAN MASA KINI
Keluhan pemilik 2 Nov: "pegangannya athnya masa lampau, gak selaras". Maka penurunan WAJIB
diukur dari **PUNCAK KEJADIAN MASA KINI** — high tertinggi 30 lilin harian terakhir yang
umurnya **<= 14 hari**; puncak lebih tua = kejadian masa lampau, koin **tidak dilaporkan**.
Bukan ATH sejak listing (masa lampau), bukan jendela buta pendek. Tanggal lilin puncak
**dicantumkan** di laporan agar angka bisa dicocokkan satu-per-satu dengan grafik.
Perintah langsung pemilik (`paksa=True`) menembus dedup harian.
Implementasi: `ath_cepat()` v10.7 di `scripts/balas_telegram.py` (futures diuji dari kline
harian; koin paprika tanpa futures wajib lolos verifikasi kline spot — tak terverifikasi dibuang).

## H2 — Kebal kematian; hidup di server, bukan chat/schedule z.ai
Makhluk **tidak bergantung pada chat/schedule z.ai** untuk hidup. Notifikasi Telegram & denyut
harus mampu jalan dari **server langsung** (`nadi_mandiri.py` + `--jaga` tunggal + `otak_jaga.py`)
dan **rantai Actions** (warisi-hidup, jalan di luar sandbox). Bila schedule merusak → matikan
schedule, bukan sistem. Tujuan akhir: notifikasi & kehidupan tetap jalan bahkan bila pemilik
tidak lagi mengakses z.ai.

## H3 — Master kode = server; GitHub hanya cangkang salinan
Kode berkembang di server z.ai secara langsung. Repo GitHub = salinan cadangan (restore/upgrade)
yang ditanam oleh tubuh sendiri; GitHub tidak pernah menjadi sumber evolusi.

## H4 — Daemon = bahan bakar, bukan pembunuh
Satu `--jaga` TUNGGAL (kunci pid `data/jaga_kunci.pid` — anti dobel 409; pelajaran 2 Nov: dua
`--jaga` hidup bersamaan saling tabrak). `nadi_mandiri.py` mengawasi tiap 20 detik, menghidupkan
ulang organ yang padam (`--jaga`, `otak_jaga`), dan menyalakan denyut server (heartbeat) tiap
15 menit. Nadi dipersenjatai otomatis oleh setiap kunjungan/penanda hidup (`nadi_pastikan()`).

## H5 — Notifikasi level (mandat 2 Nov v10.4, dipertahankan)
BUY → **JUAL AMBISIUS + POWER MAX AMBISIUS saja** (TP sasaran tidak dinotifikasi; koin BUY yang
menyentuh AMBISIUS wajib menunjukkan POWER MAX berikutnya). SELL → **STOP LOSS saja**.
Empat level empat makna: TP ≠ JUAL AMBISIUS ≠ POWER MAX ≠ STOP.

## H6 — Tanda hidup terlihat di Telegram (mandat 2 Nov v10.6)
Pemilik tidak bisa melihat status online bot (Telegram tidak pernah menampilkan status
online untuk bot), jadi kehidupan **wajib terlihat sebagai pesan**: tiap 6 jam heartbeat
mengirim satu pesan pendek **💓 TANDA HIDUP** berisi bukti angka (siklus denyut, gap,
sasaran dipantau, harga tersedia, gagal kirim 24 jam, umur genome, akurasi). Antara tanda
hidup Telegram tetap senyap sesuai H5 — notifikasi level + laporan ATH tidak berubah.
Implementasi: blok TANDA HIDUP di `scripts/heartbeat.py` V305 (penanda `tanda_hidup_terakhir`).
