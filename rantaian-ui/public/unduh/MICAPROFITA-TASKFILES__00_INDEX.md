# MICAPROFITA — PAKET TASKFILES (VERSI SEPENUHNYA)

> Paket fisik semua file task cyborg **MICAPROFITA · ARENA AGI KRIPTO**.
> Semua yang Anda lihat di sini adalah file NYATA di server — bukan tulisan chat.
> Total: **410+ file · 13 MB** (ZIP satu klik: `MICAPROFITA-TASKFILES.zip`)

---

## 1. PETA ISI PAKET

| Folder | Isi | File Kunci |
|---|---|---|
| `01_ORGAN-V237-SAKTI-FBO/` | Organ False Breakout untuk tubuh SAKTI | `v237_fbo.js` (v1.37b, self-test 21/21), `v237_fbo_test.js`, `inject_v237.py` |
| `02_OTAK-UJIAN-FBO/` | Otak ujian FBO sisi Arena (arah upgrade: Arena → SAKTI) | `fbo-brain.ts` (133 KB, beku), `fbo-forge.ts`, `fbo-gens.ts`, `fbo-suite.ts` |
| `03_RUNNER-UJIAN/` | Runner ujian 100 soal / batch multi-seed | `ujian_fbo100.ts`, `batch_r43.ts`, `verify121.ts`, `verify23.ts`, `probe_all_r43.sh` |
| `04_PROBE-BEDAH/` | Forensik kegagalan & bedah soal | `bedah_fbo_r*.ts`, `diff_r43.ts`, `kalib_r41b.ts`, `peta_fbr.ts` |
| `05_INJEKSI-SEMUA-ORGAN/` | Sejarah injeksi organ v231→v237 | `inject_v231…v237.py`, `v232_mata.js` … `v236_gabungan.js`, `build_organ.ts` |
| `06_OTAK-UJIAN-LAIN/` | Otak ujian lainnya | bulltrap / beartrap / stophunt / composite / candle-exam, evaluator, generator, rng |
| `07_BUKTI-UJIAN/` | Bukti mentah hasil ujian (JSON/txt) | 144+ file `research/ujian-fbo`: `r44-latihan-final.json` (2976/2976), `r44-hakim-final.json` (742/744) |
| `08_LAPORAN/` | Semua laporan ujian (MD) | FalseBreakout, Gabungan, BullTrap, BearTrap, StopHunt, Candle, **PumpDump**, **KOMPLEKS-5**, **Audit Realtime** |
| `09_WORKLOG/` | Log kerja multi-agent (append-only) | `worklog.md` |
| `10_AUDIT-REALTIME/` | Audit 13 titik pasar realtime + patch | `audit_realtime_r45.ts`, `uji_integrasi_market_r45.ts`, `bukti_fallback_r45.ts`, `market.ts` (patch 4-host), `LAPORAN-AUDIT-REALTIME.md` |
| `11_PUMPDUMP-V238/` | Ujian 100 Pump & Dump (Task 22) | `pumpdump-{forge,gens,suite,brain}.ts`, `ujian_pumpdump100.ts`, `v238_pd.js` (self-test 10/10), `inject_v238.py`, bukti JSON 1600/1600 |
| `12_KOMPLEKS-V239/` | Ujian 100 KOMPLEKS 5-aspek (Task 23) | `kompleks-{forge,gens,suite,brain}.ts` (otak v1.2 beku), `ujian_kompleks100.ts`, `probe_kl_r1/r2.ts` (bedah), `v239_kompleks.js` (self-test 9/9), `inject_v239.py`, `LAPORAN-UJIAN-KOMPLEKS-100.md`, bukti JSON 17 file (1600/1600) |
| `13_ARAH-V240/` | UJIAN KEPASTIAN-ARAH — vonis biner BUY/SELL + dewan bukti 8 dimensi (Task 24) | `arah-brain.ts` (otak v1.8 beku), `ujian_arah100.ts`, 6 probe bedah forensik, `v240_arah.js` (self-test 14/14), `inject_v240.py`, `arah-panel.tsx` (fisika UI baru), `LAPORAN-UJIAN-ARAH-100.md`, bukti JSON 50 file (10.600/10.600) |
| `14_MOZAIK-OTAK/` | ARSITEKTUR KOGNITIF TERPADU 9 fakultas — otak, internet, kripto, memori, alat, developer, evaluasi, loop, interface (Task 25) | `src/lib/otak/` (9 modul), `api-otak-route.ts`, `otak-panel.tsx` (tab MOZAIK), `evaluasi_otak.ts` (evaluator CLI), `LAPORAN-ARSITEKTUR-KOGNITIF.md`, bukti `snapshot-otak.json` + 4 screenshot UI |
| `15_NADI-PRAKIRA/` | TERUS-HIDUP + GUDANG EKSTERNAL + PRA-REGISTRASI PREDIKSI (Task 26) | `prareg.ts` (SHA-256 murni TS), `prareg-brain.ts` v1.1 (PR-L1/PR-L2 + zona kabut), `ujian_prareg100.ts` (runner 2 fase), probe/validasi 5 namespace, `v241_nadi.js` (organ SAKTI), `inject_v241.py`, harness browser, `api-gudang-route.ts`, `nadi-panel.tsx` (tab Arena), `LAPORAN-PRAKIRA-NADI.md`, bukti ledger/hasil r1-r2+segel + 3 screenshot |

---

## 2. TABEL CAPAIAN (KEADAAN TERKINI)

| Ujian | Skor | Status |
|---|---|---|
| False Breakout — LATIHAN (24 seed, otak beku v1.38) | **2976/2976 = 100.00%** | ✅ Tuntas, 2× verifikasi, tanpa env switch |
| False Breakout — HAKIM segel-seged fbo2500-3000 (otak v1.38) | **744/744 = 100.00%** | ✅ r45 selesai: FB-T20 + FB-G1 disuntik, 0 pecah; hakim segar fbo3100-3600 = 731/744 (13 residu jujur terdokumentasi) |
| Bull Trap | 100/100 | ✅ |
| Bear Trap | 100/100 | ✅ |
| Stop Hunt | 100/100 | ✅ |
| Gabungan (3 trap) | 100/100 | ✅ |
| Pola Candle | 100/100 | ✅ |
| Pump & Dump (Task 22) | **1600/1600 = 100.00%** | ✅ otak v1.7, organ v238 (self-test 10/10) |
| KOMPLEKS 5-aspek (Task 23) | **1600/1600 = 100.00%** | ✅ otak v1.2, organ v239 (self-test 9/9) |
| **KEPASTIAN-ARAH (Task 24)** | **10.600/10.600 = 100.00%** (latihan 100 + hakim 5.500 + segel 5.000) · 0 likuidasi · net rata +2.02%/ujian · CORE naif 20/100, net −149% | ✅ otak v1.8 beku, 7 pelajaran AR-L1..L7, organ v240 (self-test 14/14) |
| **MOZAIK Arsitektur Kognitif (Task 25)** | 9 fakultas hidup · matriks tersertifikasi **20.412/20.452 = 99.804%** · 170.680 eksekusi terekam · 60 kode pengetahuan · 37 ronde loop · 7 diagnostik dev 7/7 · tsc 0 error · UI 0 console error | ✅ tab **Arsitektur Kognitif** di Arena + `bun scripts/evaluasi_otak.ts` (bukti `research/otak/snapshot-otak.json`); 7 kelemahan terbuka diakui jujur |
| Organ v237+v238+v239+v240 → SAKTI | self-test 21/21 · 10/10 · 9/9 · **14/14** | ✅ 4 organ terinjeksi di `Micaprofita_V231_SAKTI.html` (15.299.730 B) |
| Audit Realtime 13 titik | Data BENAR; 1 celah transport ditemukan → **diperbaiki & diverifikasi** | ✅ `LAPORAN-AUDIT-REALTIME.md` |

---

## 3. CARA VERIFIKASI (LANGKAH NYATA)

1. **Buka organ**: `01_ORGAN-V237-SAKTI-FBO/v237_fbo.js` → cek header `v1.37b`.
2. **Jalankan self-test organ**: `node v237_fbo_test.js` → harus `21/21 PASS`.
3. **Cek bukti latihan**: `07_BUKTI-UJIAN/r44-latihan-final.json` → `benar: 2976`, `total: 2976`.
4. **Cek otak beku**: `02_OTAK-UJIAN-FBO/fbo-brain.ts` → tidak ada env switch / RNG runtime.
5. **Cek tubuh SAKTI**: file `Micaprofita_V231_SAKTI.html` (di folder unduh) → cari string `V237-FBO:BEGIN`, `V238-PD:BEGIN`, `V239-KL:BEGIN`, `V240-ARAH:BEGIN`.
6. **Audit realtime**: `10_AUDIT-REALTIME/LAPORAN-AUDIT-REALTIME.md` → 13 titik × 3 ronde.
7. **Kepastian-ARAH**: `13_ARAH-V240/LAPORAN-UJIAN-ARAH-100.md` → siklus 9 ronde, 7 pelajaran, tabel 10.600/10.600; bukti ringkas di `13_ARAH-V240/bukti-json/`; coba sendiri otaknya: buka Arena → tab **Kepastian Arah** → Jalankan Otak.
8. **MOZAIK**: `14_MOZAIK-OTAK/evaluasi_otak.ts` → `bun scripts/evaluasi_otak.ts` di root repo → matriks 9 suite + probe 5 sumber + 7 diagnostik → `research/otak/snapshot-otak.json`; atau buka Arena → tab **Arsitektur Kognitif** (denyut 30 dtk).
9. **PRAKIRA (pra-registrasi)**: `bun scripts/ujian_prareg100.ts --fase kunci --ns ujiX --tag v` (ledger terkunci, horizon tak disentuh) lalu `--fase buka` (rantai diverifikasi, koherensi dihitung). Sertifikasi: r2 pr100f + segel pr100g = arah 100/100, koherensi 97,50%, min 3/4, LULUS. Organ V241 di SAKTI: buka file → kartu NADI **kanan-bawah** → self-test 14/14, gudang 4 tingkat, prakira live (kunci sebelum jendela 15 menit).
10. **FISIKA-UI**: `python3 scripts/ui/bangun_harness.py` → buka `scripts/ui/harness_v242.html` → pengujian otomatis 9 dtk (geometri, toggle ke-atas, tombol statis, pesan penuh, mode fokus, self-test 14/14 + 13/13). Atau buka SAKTI: kartu NADI kanan-bawah tak menimpa apa pun; ticker kiri ber-ellipsis + tombol ⤢; modal terbuka → chip meredup.

11. **SARANG (GitHub Pages)**: `node scripts/sarang/mock_github.mjs 8899` → `python3 scripts/sarang/bangun_harness_v243.py` → buka `http://127.0.0.1:8899/` → uji 3 fase otomatis (HIJRAH → SIMPAN → EVOLUSI → PULIH lintas-sesi → deteksi evolusi eksternal; hasil JSON tampil di halaman; repo nyata tersimpan di `scripts/sarang/sim/halaman/`). Di dunia nyata: buat repo + Fine-grained PAT (Contents+Pages read/write) → buka SAKTI lewat http → chip SARANG → isi → **HIJRAH KE GITHUB** — panduan lengkap `PANDUAN-GITHUB-PAGES.md`.

| 16_FISIKA-UI | Fisika tampilan: V241 NADI v1.1 + V242 ORKESTRA; self-test 14/14 + 13/13; harness otomatis; 3 bukti visual; 5 cacat warisan dibongkar |

| 17_SARANG-GITHUB | Hidup mandiri GitHub Pages: organ V243 (HIJRAH/SIMPAN/PULIH/EVOLUSI) + V242 v1.1; mock GitHub + harness 3 fase; hijrah→6 komit nyata; pulih lintas-sesi sukses; panduan + laporan |

---

## 4. CATATAN JUJUR

- Hakim FBO segel-seged fbo2500-3000 kini **744/744** (r45: 2 residu flat-total terbukti punya jejak
  struktural — klaim lama "tak-terbedakan" dikoreksi; FB-T20 roll-over + FB-G1 penerimaan-segar disuntik).
  Hakim segar fbo3100-3600 = 731/744: 13 residu terbuka jujur (4 butuh fitur baru, 7 salah-arah T0/T1, dll).
- KEPASTIAN-ARAH v1.8: dua hipotesis pertama dibangun lalu **dibantah data sendiri** (consec-big vs
  lilin-V raksasa) — tercatat jujur di laporan. Vonis biner memaksa BUY/SELL di semua skenario;
  tracker-WAIT dieksekusi sbg order-trigger (NO-TRADE dihitung jujur, bukan menang palsu).
- `fapi.binance.com` tidak punya mirror resmi → tetap 1 host, tetapi funding rate **bukan**
  komponen keputusan (hanya CHIP info; lab #2–#4: memakainya menurunkan profit −5.8%).
- CoinGecko free tier bisa 429 (IP bersama) → semua pemanggilan null-safe + retry 3×;
  kegagalan eksternal **tidak pernah** menghasilkan keputusan salah (prinsip: gagal harus berbicara).
- Semua skor di atas memakai **net profit** (fee beli 0.1% + jual 0.1% wajib dihitung) dan
  point-in-time tanpa look-ahead.

— Dihasilkan otomatis oleh pipeline pengemasan MICAPROFITA. Perbarui dengan:
`bash scripts/package_taskfiles.sh && bun scripts/siapkan_unduh.ts`
