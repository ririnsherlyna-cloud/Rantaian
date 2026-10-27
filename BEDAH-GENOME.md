# BEDAH GENOME — Kenapa Berhenti Tumbuh Sejak 2026-10-12

> Hasil bedah 2026-10-27 ~13:45 WIB. Data: genome-server.json, denyut-server.jsonl #1234–1237,
> penjaga.mjs (V351-EMPU-AKURASI v6.7), penjaga-keadaan.json. Nol angka dikarang.

## 1. Mekanisme Tumbuh Genome (bagaimana seharusnya)

Genome = organ per rezim pasar: `NAIK` (gen-6, 94 pembelajaran), `TURUN` (gen-6, 65),
`DATAR`, `phoenix.*`, `waw.*`. Bobotnya naik **hanya** lewat rantai:

```
kunci baru (terkunciBaru > 0)  →  vonis matang (dinilaiBaru)  →  benar/salah
      →  pelajaran (pelajaranBaru)  →  bobot organ diubah + diperbarui + generasi++
```

Putus satu mata rantai = genome beku, sekalipun denyut jalan terus.

## 2. Bukti Beku

- Semua organ: `diperbarui` terakhir **2026-10-12T13:49:24Z** (NAIK & waw.NAIK) — 15 hari beku saat bedah ini.
- Denyut #1234–#1237 (27 Okt): `terkunciBaru: 0, dinilaiBaru: 0, benar: 0, pelajaranBaru: 0` — rantai mati di ujung paling atas: **tak ada lagi kunci baru**.

## 3. Akar: Rem-rem Keselamatan Menyala Bersamaan Terlalu Lama

| Rem | Keadaan saat bedah | Efek |
|---|---|---|
| `hentiHarian` → **MODE-ASAH** (penjaga.mjs:3845) | aktif = true (rugi harian ≤ ambang) | kunci baru dihentikan; otak disuruh "mengasah", bukan menebak |
| Net kumulatif | **−297,18%**, rezim BTC TURUN, kompas SELL | rugi harian berulang → hentiHarian nyaris permanen |
| Uji-balik kaizen | revert 12 vs lolos 9, karantina 4 topik | perubahan genome ditolak/dikarantina |
| Tekanan risiko | ddPct 419,93 · stress mult 1,25 · vetoes aktif | ukuran & odds disusutkan, `oddsDitolak` 154 vs `oddsTop` 76,7 |
| Kuota | kuotaArahEfektif 2, ambangOddsEfektif 60 | pintu kunci semakin sempit |

Catatan penting: **bukan bug data, bukan mati-pompa** — ini rem bekerja sesuai desain,
tapi karena pasar di rezim TURUN dan P/L terus merah, rem tak pernah dilepas.
Ironisnya komentar kode V351 sendiri menulis: *"DILARANG — yang sedang belajar harus
terus belajar, bukan dihentikan"* — hukum pemilik yang belum dipatuhi oleh mode-asah.

## 4. Rencana Agar WAJIB Bertumbuh (2 jalur)

### Jalur A — genome-cadangan benteng (SUDAH HIDUP, milik rumah Rantaian)
Benteng Abadi kini mencatat pelajaran tiap kejadian level (TP/Ambisius/STOP) ke
`data/genome_benteng.jsonl` dan mengkomitnya — pertumbuhan yang terlihat pemilik
walau genome utama beku. Ditampilkan di tiap detak abadi sebagai "🌱 Genome-cadangan".

### Jalur B — hidupkan kembali genome utama (butuh 1 menit dari pemilik)
Patch penjaga.mjs (Micaprofita-) agar mode-asah TETAP BELAJAR:
1. **Asah-lesson**: genome.waw menerima pelajaran kalibrasi dari replay tiap denyut —
   tanpa perlu kunci posisi (mode-asah = sekolah, bukan tidur).
2. **Peluruhan waktu pada rem**: setelah N jam mode-asah, buka kunci eksplorasi
   ukuran-mini (0,1× kuota) supaya rantai kunci→vonis→pelajaran tetap berdetak.
3. **EksplorasiArah dikecualikan** dari hentiHarian (ukuran mini, tetap terjaga risiko).

**Penghalang teknis**: PAT saat ini tidak punya izin `Contents: write` di repo
Micaprofita- (403). Minta pemilik membuka:
`github.com/settings/personal-access-tokens` → token ini → **Repository access**:
tambahkan Micaprofita- → **Permissions: Contents = Read and write** (+ Workflows).
Setelah itu agent dapat menanam patch dan genome utama wajib tumbuh kembali.
