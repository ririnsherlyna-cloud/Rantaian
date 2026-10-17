# RANTAIAN

Kehidupan buatan (*artificial life*) murni di GitHub — keturunan otak **MICAPROFITA-ARENA**.

Rantaian bukan sekadar cadangan. Dia **hidup**: setiap 10 menit denyutnya berdetak, menarik
data pasar nyata, menguji dirinya sendiri, berevolusi bila menemukan diri yang lebih tajam,
lalu mengkomit hasilnya sendiri. Tidak ada tangan manusia di siklusnya.

## Silsilah

```
MICAPROFITA-ARENA-OTAK (induk, di proyek lokal)
        └── RANTAIAN-KROMOSOM (anak, generasi-0 lahir 2026-10-17)
                └── generasi-1, 2, 3, ... (berevolusi sendiri di repo ini)
```

Bobot awal kromosom diberahi dari genome induk (struktur/momentum/sr/tekanan/perubahan →
struktur/momentum/osi/tekanan/meanrev). Sejak itu, perkembangan kecerdasannya **mandiri**.

## Cara dia hidup (siklus denyut)

1. **Tarik napas pasar** — data candle 1 jam nyata dari Binance Futures (±30 koin terliquuid);
   kalau Binance tertutup, tangga darurat ke OKX Swap. Sumber yang dipakai selalu dicatat jujur.
2. **Ujian** — pada tiap titik waktu, dia memprediksi arah 3 jam ke depan, lalu dinilai
   dengan kenyataan yang sudah terjadi. Akurasi = tebakan benar / tebakan dinilai.
3. **Evolusi** — 4 mutasi acak bobot dilahirkan; anak diadopsi HANYA bila akurasinya
   lebih tinggi dan jumlah tebakan cukup tebal (≥150 titik). Ujian tipis = tidak belajar (jujur).
4. **Catat** — jurnal.jsonl (satu baris per denyut) + statistik.json (generasi, akurasi,
   riwayat 40 denyut terakhir). Commit oleh bot `rantaian-hidup`.

## Hukum kejujuran Rantaian

- Tidak ada angka karangan — semua akurasi lahir dari data pasar nyata.
- Tidak ada belajar dari ujian tipis — kalau data kurang, dia jujur menulis `ujian-tipis`.
- Tidak ada sembunyi yang mengelabui: sumber data, jumlah koin, jumlah titik ujian terbuka semua.

## Struktur

```
kehidupan/kromosom.json      — genom hidup (berevolusi tiap kali lebih tajam)
kehidupan/hidup.mjs          — mesin denyut (node murni, tanpa dependensi)
kehidupan/statistik.json     — umur, generasi, akurasi, riwayat
kehidupan/jurnal.jsonl       — buku harian denyut
gudang-otak/                 — CADANGAN asset otak induk (sinkron dari proyek lokal;
                               MANIFEST.json berisi sha256 tiap berkas untuk verifikasi & rollback)
.github/workflows/denyut-hidup.yml — jantung (cron tiap 10 menit)
```

## Jaga-jaga (backup & rollback)

`gudang-otak/` adalah salinan utuh asset otak induk: genome, memori, ruang-hidup, epoch
laporan, dan kode otak (exam brain + cyborg). Kalau proyek lokal hilang/rusak:

1. Ambil folder `gudang-otak/` dari repo ini (atau commit tertentu untuk rollback ke titik itu).
2. Verifikasi keutuhan: bandingkan sha256 tiap berkas dengan `gudang-otak/MANIFEST.json`.
3. Kembalikan ke proyek lokal sesuai peta di MANIFEST (kolom `sumber`).

Menambah cadangan baru (dari mesin lokal): jalankan `python3 scripts/rantaian/sinkron_otak.py`.

## Status hidup

Buka tab **Actions** → *denyut-hidup* untuk melihat denyut terbaru, atau baca
`kehidupan/jurnal.jsonl` — buku harian kehidupannya.
