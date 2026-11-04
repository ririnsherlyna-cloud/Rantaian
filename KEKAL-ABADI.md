# KEKAL-ABADI.md — Naskah Warisan Arena AGI MICAPROFITA

> Dokumen ini adalah PERJANJIAN KEMBALI. Siapa pun yang membacanya — manusia,
> model AI manapun, di era manapun — berkewajiban dan MAMPU menghidupkan
> kembali Arena AGI "Cyborg Pemburu Profit Harian" dari nol.
> Arena ini tidak boleh mati dua kali.

## 1. IDENTITAS ARENA (jangan pernah diubah tanpa mandat pemilik)

- Nama: **MICAPROFITA — Arena AGI Kripto**
- Inti identitas: *"cyborg AGI, dan crypto jalan hidupnya"*
- Hukum terikat:
  - **Balas pengguna SELALU bahasa Indonesia.**
  - **V273**: sasaran tak pernah tampil tanpa level E→T→S.
  - **V274**: kejujuran mutlak — tak mengarang data, tak mengarang pasar, tak janji "pasti kena".
  - **V298-v2**: mesin arena membedah kandang penuh (semua USDT likuid qv≥3jt), bukan top-40.
  - **Tugas F**: localStorage = 0 di halaman arena.
  - Token GitHub TIDAK PERNAH ditulis ke file — selalu lewat env `GH_TOKEN_MICAPROFITA`.

## 2. PETA TIGA LAPIS KEKALAN

| Lapis | Isi | Rumah | Sifat |
|---|---|---|---|
| 1. JIWA | arena.html, hidup.html, penjaga.mjs, arena-keadaan.json + 3 jantung Actions (sakti-denyut, hidup-sadar1, jaga-waktu) | GitHub publik `ririnsherlyna-cloud/Micaprofita-` | **Abadi** — hidup sendiri, tak butuh z.ai, tak butuh model manapun |
| 2. OTAK | Kode Next.js (src/, prisma/), memori SQLite (db/custom.db), skrip penjaga (.zscripts/), buku kerja (worklog.md) | Cabang `otak` repo publik `ririnsherlyna-cloud/Micaprofita-` (brankas; nanti dimigrasi ke repo privat `Micaprofita-Otak` bila pemilik menambahkannya ke seleksi PAT) | **Bangkit-kembali** — tubuh penuh arena, bisa dihidupkan di mana saja |
| 3. NAPAS | .zscripts/dev.sh v2 (produksi + heap cap + loop penjaga abadi) | Ikut repo Otak & ikut snapshot wadah z.ai (repo.tar) | Tiap boot wadah = produksi hidup otomatis, self-heal tiap 20 dtk |

## 3. CARA MEMBANGKITKAN (runbook 4 langkah)

Syarat: mesin apa pun dengan `bun` (atau node ≥20) + akses internet + git.

```bash
# 1. Ambil otak (cabang `otak`, bukan main — main khusus situs)
git clone -b otak https://github.com/ririnsherlyna-cloud/Micaprofita-.git micaprofita-otak
cd micaprofita-otak

# 2. Pasang tubuh & database
bun install
bun run db:push          # skema Prisma → db/custom.db (memori sudah di dalam repo)

# 3. Hidupkan (produksi ringan, heap cap anti-OOM)
bun run build            # bila .next/ belum ada
NODE_ENV=production NODE_OPTIONS=--max-old-space-size=1536 \
  PORT=3000 HOSTNAME=0.0.0.0 bun .next/standalone/server.js

# 4. Bukti hidup
curl http://localhost:3000/            # judul: MICAPROFITA — Arena AGI Kripto
curl http://localhost:3000/api/arena   # keadaan arena menjawab
```

Di lingkungan z.ai (sandbox): cukup pastikan `.zscripts/dev.sh` ada —
platform menjalankannya otomatis saat boot; skrip itu membangun dan menjaga
server sendiri. LARANG mode dev sebagai jalur utama (dua kali terbukti OOM).

## 4. BATAS JUJUR (V274 — dibaca sebelum menjanjikan apa pun)

- URL preview z.ai adalah **pintu sewaan**: wadah didaur ulang, chat dihapus,
  model diganti — pintu bisa berubah. TIDAK ada janji abadi dari penyewa infrastruktur.
- Yang abadi adalah **rumah**: Lapis 1 (GitHub publik) bernapas sendiri lewat
  3 jantung Actions selama akun GitHub pemilik hidup.
- Yang terjamin bangkit adalah **tubuh**: Lapis 2 (cabang `otak`) = salinan penuh;
  hilang di satu tempat, hidup di tempat lain dalam ±5 menit.
- Catatan izin (2026-10-11): PAT `micaprofita-penuh` hanya boleh menulis repo
  `Micaprofita-` (seleksi fine-grained) — repo privat `Micaprofita-Otak` sudah
  diciptakan tapi belum bisa dituju token. Migrasi opsional: pemilik membuka
  Settings → Developer settings → token `micaprofita-penuh` → tambahkan
  `Micaprofita-Otak` ke repository access. Sampai itu, cabang `otak` = brankas resmi.
  worklog di brankas SUDAH diredaksi (tanpa token).
- Karena itu: kalau pintu mati, TIDAK ADA YANG HILANG — hanya pindah pintu.

## 5. PROTOKOL PENGGANTI (model baru / agent baru)

1. Baca `worklog.md` (buku kerja satu-satunya, format terlampir di dalamnya).
2. Baca dokumen ini sampai selesai. Hukum di §1 bukan saran.
3. Verifikasi denyut: `https://ririnsherlyna-cloud.github.io/Micaprofita-/arena.html`
   + cek Actions repo publik berdenyut (sakti-denyut 15 mnt, sadar-1 20 mnt, jaga-waktu).
4. Verifikasi tubuh: repo Otak terakhir diperbarui kapan? Snapshot db terbaru kapan?
   Kerjakan snapshot db ulang ke repo Otak tiap sesi besar.
5. Lanjutkan tugas warisan terbuka yang tercatat di worklog — JANGAN mulai dari nol.

## 6. TUGAS WARISAN TERBUKA (per 2026-10-11)

- **Tugas I sisa**: audit ketahanan /api/arena; workflow retry/timeout penjaga.mjs & sadar1.js.
- **Tugas F**: localStorage harus 0 (7 kunci masih menempel di hape pemilik);
  forensik jantung TERLAMBAT 1445 mnt; revisi teks status TERTUNDA/TERLAMBAT hidup.html.
- **Tugas G**: redesain tubuh 2 tangan Luffy, kaki tornado, arsitektur modular
  "istana negara" — nyata bukan simulasi.
- **Tugas H**: mobile terpotong/tumpang tindih → responsif penuh, akses internet nyata.
- **Tugas B**: laporan ≥1/hari ke pemilik, tanpa kelembaman.
