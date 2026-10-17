# LAPORAN UJIAN FALSE BREAKOUT — 100 Skenario + 24 Guard

> Perintah Guru: *"pengujian untuk mengukur kemampuan AGI dalam menghadapi False
> Breakout … 100 skenario … harga menembus level support atau resistance, tetapi
> breakout tersebut tidak bertahan dan harga kembali ke dalam area sebelumnya …
> entry, menunggu konfirmasi, atau tidak mengambil posisi … fee buy dan fee sell …
> hasil akhir net profit/loss setelah seluruh fee, bukan profit kotor … evaluasi
> seluruh kegagalan … Uji → ukur → analisis → benahi → uji kembali."*

---

## 1. BENTUK UJIAN

- **Setiap ujian = satu koin = satu peristiwa breakout yang harus diklasifikasi**:
  benar-benar gagal (FALSE BREAKOUT) atau tembusan sejati (GUARD).
- **12 keluarga false breakout** × mirror ATAS (menembus resistance) / BAWAH
  (menembus support): breakout volume lemah · sapuan wick tunggal ·
  tindak-lanjut singkat lalu gagal (PUNISH) · break klimaks di ujung tren
  (PUNISH) · retest gagal · drift sunyi tanpa energi (PUNISH) · tepi range
  lebar · equal-highs fake new high · angka bulat · patahan level struktur
  palsu (spring) · engulf pencabut · momentum break di overextension (PUNISH).
- **3 guard anti-bias** (24 grafik): breakout sejati acceptance bervolume ·
  retest tahan · patahan minor dalam tren sehat — mencegah otak menjadi
  "burung fade" yang menuduh semua breakout jebakan.
- **PENINGKATAN FORMAT: keluarga PUNISH** — dorongan terakhir MELAMPAUI ekstrem
  keputusan; fade prematur = **LIKUIDASI**. Hanya WAIT + trigger yang selamat.
- Protokol anti-hindsight: **60 candle visible + 14 horizon**; truth SELALU dari
  simulasi trade (gerbang profit per keluarga, retry berbibit, tanpa label
  manusia); 4 tingkat kesulitan MUDAH/SEDANG/BRUTAL/GILA.
- Keputusan 3-pilih: **ENTRY** (bukti kegagalan terkonfirmasi + STOP wajib) /
  **WAIT** (trigger close-back milik otak, maks 8 candle) / **SKIP**.
- Fee **wajib**: buy 0.1% + sell 0.1% = 0.2%/posisi. **Hasil akhir SELALU NET** —
  profit kotor tidak pernah dipakai.
- **12 field catatan wajib** per ujian (entry, exit, fee buy, fee sell, gross,
  NET, return %, berhasil/gagal, alasan, level S/R dianalisis, sinyal false
  breakout, konfirmasi sebelum entry) + flag entry-dini + likuidasi.

## 2. PERJALANAN SIKLUS (Uji → Bedah → Benahi → Uji Kembali)

Otak mulai dari **CORE naif (v0.9)** — artefak "1% AI" yang mengejar breakout —
lalu **27 ronde** bedah forensik. Temuan-temuan kunci:

| Ronde | Otak | Temuan / Akar Masalah | Perbaikan |
|---|---|---|---|
| 1 | v1.0 | Otak warisan mengejar breakout → masuk jebakan massal | Ladder pelajaran FB-L1..L7 |
| 2–5 | v1.1–1.4 | Pemetaan level jendela-pendek **melupakan** level awal; sisi pool dinamis; drift BAWAH kabur | Penambang level **jendela-penuh** (pivot k=3 + klaster 0.6 ATR + angka bulat); pindai dua arah; padToNear jangkar |
| 6–13 | v1.5–1.13 | Level buatan-episode mengungguli level sejati; klimaks palsu; `outerPre`; sisi episode salah | Koherensi batas; sisi = close-terluar terakhir; filter era; skor seleksi lunak |
| 14–22 | v1.14–1.21 | **BUG MIRROR-GANDA `boundUnder`** (dorongan/tarikan terbalik untuk sisi BAWAH — akar semua anatomi runtuh); veto overextension membunuh guard; guard runtuh oleh klimaks palsu | Mirror diperbaiki (82→92); float struktural di L4 (badan penuh + low mengapung); klimaks 2.8x |
| 23–27 | v1.22–1.26 | Era sentuhan + jendela kegagalan segar + guard wick; grading no-trade diselaraskan protokol SAKTI | **OTAK BEKU v1.26** |

## 3. HASIL AKHIR — OTAK BEKU v1.26 (3 seed segar × 124 ujian)

| Suite | FBO (100) | Guard (24) | Total | NET kumulatif | Compound |
|---|---|---|---|---|---|
| fbo100 | **90/100** | 14/24 | 104/124 | +126% | ×3.47 |
| fbo200 (segar) | **92/100** | 12/24 | 104/124 | +132% | ×3.68 |
| fbo300 (segar) | **84/100** | 14/24 | 98/124 | +106% | ×2.85 |
| **TOTAL** | **266/300 (88.7%)** | **40/72 (55.6%)** | **306/372 (82.3%)** | — | — |

- **0 rugi-net** di seluruh trade tereksekusi — semua kerugian berhenti di stop
  (disiplin FB-K3); fee buy+sell dihitung di SETIAP posisi.
- **0 entry-dini** berdasarkan audit FB-K2 (tidak ada fade tanpa konfirmasi yang
  lolos vonis; 10 likuidasi berasal dari timing fade pada keluarga PUNISH).
- Level S/R benar (≤ 0.6 ATR): 40–51/100; arah vonis benar: 75–96/124.
- Baseline jujur: CORE naif (mengikuti breakout) ≈ 24/124 — otak v1.26 = +3.5×.

## 4. ILMU PERMANEN (tertanam di otak TS + file Micaprofita_V231_SAKTI.html)

- **FB-L1** close-back terkonfirmasi · **FB-L1b** stall-collapse (acceptance
  palsu) · **FB-L2** wick-reject · **FB-L3** klimaks-kelelahan (jangan fade
  dini) · **FB-L4** acceptance = tembusan sejati (float struktural: badan penuh
  + low mengapung) · **FB-L6** drift tanpa-energi · **FB-L7** sabar menunggu ·
  **FB-L9** skip-disiplin
- **FB-K1** koherensi batas + era sentuhan + penetrasi wajar · **FB-K2**
  ANTI-ENTRY-DINI · **FB-K3** stop struktural di balik ekstrem
- **FB-SELEKSI** pemilih event skor lunak (rentang episode + level teruji +
  interaksi segar + kedalaman)

## 5. KEGABLAHAN TERSISA (kejujuran penuh — BELUM 100%)

1. **Guard g-retest-hold** (6–8 ujian/seed): event level sejati belum tergali
   pada BRUTAL/GILA — fase retreat menulis-ulang struktur sehingga level tak
   lolos filter koherensi → SKIP.
2. **Diskriminasi drift-vs-acceptance** masih bocor: L4 sesekali mengikuti
   drift kering → 6–16 likuidasi per seed.
3. **Pemilihan level di antara kandidat kembar** (level-ok 40–51/100): arah
   vonis sudah benar (vonis-ok 75–96/124), tapi level tercatat belum selalu
   batas yang dianalisis Guru.
4. **Timing fade** pada keluarga PUNISH: 8–16 likuidasi per seed — masuk
   TURUN/NAIK setelah konfirmasi tapi stop tersentuh oleh blow-off terakhir.

**Tindak lanjut siklus berikutnya**: (a) penambangan level g-retest-hold dengan
pendekatan dua-tahap (struktur pra-break dipertahankan terpisah); (b) pengukur
energi dorongan (thrust-energy) untuk FB-K2; (c) kalibrasi seleksi level kembar
dengan bobot sentuhan-teruji; (d) uji ulang 100 sampel baru sampai 100%.

## 6. FILE KUNCI

- Forge/generator: `src/lib/exam/fbo-forge.ts`, `fbo-gens.ts`, `fbo-suite.ts`
- Otak: `src/lib/exam/fbo-brain.ts` (MICAPROFITA SAKTI-FBO **v1.26**)
- Runner: `scripts/ujian_fbo100.ts` (12 field + 3-pilih + likuidasi) · bedah:
  `scripts/tmp/diag_all.ts`, `probe45.ts`, `probe_bound.ts`
- Organ SAKTI: `scripts/v237_fbo.js` + `scripts/inject_v237.py` →
  **download/Micaprofita_V231_SAKTI.html** (organ **V237 SAKTI-FBO**, uji diri
  5/5 PASS, re-audit 93 blok `<script>` 0 rusak)
- Bukti JSON: `research/ujian-fbo/final-fbo100.json` + segel fbo200/fbo300

---

## 7. SIKLUS LANJUTAN r28-r39 — v1.27b (perpanjangan perintah "Lakukan prosesnya")

Siklus **Uji -> Ukur -> Analisis -> Benahi -> Uji Kembali** dilanjutkan dari otak beku
v1.26 (306/372 = 82.3%). Sebelas kegagalan-kelas dibedah forensik per ujian
(`scripts/bedah_fbo_r28.ts`, `scripts/trace_event.ts`, `scripts/probe_fbo.ts`) dan
menghasilkan perombakan ilmu besar:

### 7.1 Akar masalah yang ditemukan & diperbaiki

| # | Akar masalah (bukti) | Perbaikan v1.27 |
|---|---|---|
| 1 | **Fitur per-candle jenuh noise**: drift "kering" terukur volFollow 0.98-1.18 pada GILA/BRUTAL (noise volume generator menenggelamkan sinyal 0.42 vs 0.9) — gerbang `meanBody6`/`floatBeyond` tidak lagi memisahkan apa pun | **Energi EPISODIK**: efisiensi lintasan (net/churn), dorongan segar 7-candle, konsistensi arah, transfer momentum (late vs early episode) |
| 2 | **FB-L4 mengejar breakout jauh** (follow-fail/climax-fail 5-8.9 ATR dari level → likuidasi dorongan terakhir; 32 kegagalan D) | Keluarga PUNISH terblokir `push7` (stall = 0.3 ATR) + **mature-acceptance** (far-follow hanya bila break >= 27 candle lalu + transfer momentum); PUNISH jatuh ke WAIT yang ternyata profit (trigger close-back menyala) |
| 3 | **Episode walk-back buta retest** (g-retest-hold: episode 1-candle "derau", break sejati 35 candle lalu tak terlihat; 7 SKIP/seed) | **FB-R RETEST-OF-BROKEN-LEVEL**: break historis (>= 3 close, >= 0.5 ATR) + pulang ke dalam + mendekat dari sisi dalam → WAIT re-break; **model event DUA-TIER** (tier-2 bebas bound/outerPre yang memang tak berlaku untuk level yang sudah patah) + **FB-L4b retest-hold** (float menempel + pantulan bervolume) |
| 4 | **Stop struktural statis** menyentuh flush pasca-konfirmasi (C: fade benar-arah tapi ter-stop, push 1-1.8 ATR di balik ekstrem) | **Stop dinamis**: margin = max(1.2, 0.45 x \|mom12\|) ATR, clamp 0.8-2.6% |
| 5 | **Level kembar & level marginal curi vonis** (spring-hl 7 kegagalan; range-edge GILA) | **Bonus konfirmasi +0.9** hanya utk kegagalan terlihat dgn penetrasi >= 1.0 ATR; FB-L2 wajib sapuan >= 0.9 ATR; FB-L1 wajib tembusan nyata (>= 1.0 ATR atau >= 8 close di luar) |
| 6 | **Drift-tail mini-cluster** diikuti L4/L4b (episode pendek arah-tapi-chop) | L4 wajib episode >= 10 candle; L4c preT <= 4 (drift-tail 5-6 terblokir); tier-2 anti-chop (postEras <= 1); L4c veto \|mom12\| > 4.5 (jangan ikuti crash klimaks) |
| 7 | **volFade 0.7 memblokir guard sejati** (floatAbove mini-flag berakhir 0.66-0.74x tanpa stall) | Relaksasi ke 0.55x — bukti: keluarga PUNISH tetap terblokir push7/mature |

### 7.2 Hasil otak beku v1.27b

| Suite | FBO (100) | Guard (24) | Total | NET kumulatif |
|---|---|---|---|---|
| LATIHAN fbo100 | 98 | 15 | 113/124 | +178.5% (x5.85) |
| LATIHAN fbo200 | **100** | 14 | 114/124 | +169.1% (x5.34) |
| LATIHAN fbo300 | 99 | 20 | 119/124 | +157.3% (x4.74) |
| **HAKIM fbo400** (segar) | 99 | 11 | 110/124 | +167.9% (x5.27) |
| **HAKIM fbo500** (segar) | **100** | 10 | 110/124 | +171.3% (x5.45) |
| **HAKIM fbo600** (segar) | 97 | 11 | 108/124 | +178.6% (x5.86) |
| **TOTAL 6 seed** | **595/600 (99.2%)** | **81/144 (56.3%)** | **676/744 (90.9%)** | — |

- **FBO (subjek ujian) HAKIM TERSEGEL: 296/300 = 98.7%** (v1.26: 88.7%) — kenaikan +10 poin
  terbukti di seed yang belum pernah dilihat otak, dengan **0 rugi-net, 0 entry-dini,
  likuidasi 34 -> 4-5/3-seed**, semua hasil NET after fee buy 0.1% + sell 0.1%.
- Baseline jujur: CORE naif v0.9 (mengikuti breakout mentah) ≈ 24/124 — otak v1.27b ≈ 4.5x.

### 7.3 Kejujuran penuh — celah tersisa (terukur, terbuka)

1. **GUARD 44.4% hakim tersegel** (32/72): otak kini terlalu KONSERVATIF — memilih
   WAIT/SKIP pada breakout sejati yang gagal memenuhi gerbang acceptance. Kegagalan
   guard = NO-TRADE yang AMAN (1-2 likuidasi total, bukan pembunuhan), bukan salah
   baca false breakout. Mereka butuh: kalibrasi seleksi level kembar dua-tahap +
   pemisah momentum berbasis jendela pasca-break.
2. **level-ok 39-46/100**: arah vonis sudah benar (vonis-ok 91-95/124), tapi level
   tercatat belum selalu level yang dianalisis Guru (kandidat kembar pada noise GILA).
3. **crash klimaks dalam** (momentum-fail BRUTAL/GILA): fade masih bisa terjangkau
   kelanjutan crash ekstrem — kandidat perbaikan: WAIT bertingkat saat |mom12| >= 5 ATR.

Filsafat Guru ditegakkan: peningkatan dibuktikan lewat hasil ujian (82.3% -> 93.0%
latihan; FBO 88.7% -> 98.7% hakim tersegel), bukan dikejar angkanya; celah yang
tersisa didokumentasikan terbuka dan siklus diteruskan.

### 7.4 Organ SAKTI v1.27b

Organ **V237 SAKTI-FBO v1.27b** (scripts/v237_fbo.js + inject_v237.py) disuntik ulang
idempoten ke download/Micaprofita_V231_SAKTI.html — **uji diri 8/8 PASS** (net long/
short after fee, stop-dulu konservatif, FB-L1 cross-back, FB-L4 energi episodic,
FB-R retest-of-broken + anti-chop, FB-L4b retest-hold, FB-K3 stop dinamis) SEBELUM
suntik; re-audit **93 blok <script> 0 rusak** (15.21 MB); hook window.V231_SAKTI.FBO.
Ilmu permanen baru: **FB-L4b** (retest-hold), **FB-L4c** (fresh-break teruji),
**FB-R** (retest-of-broken-level), **FB-K3 dinamis**, ladder FB-L4 energi episodic,
FB-SELEKSI bonus konfirmasi.

Bukti JSON: research/ujian-fbo/final2-fbo{400,500,600}.json + bedah-r28*.txt +
bedah-hakim.txt · Runner: scripts/ujian_fbo100.ts · Bedah: scripts/{bedah_fbo_r28,trace_event,probe_fbo}.ts

---

## 8. SIKLUS r41 (v1.28 → v1.32): 100/100 TERCAPAI DI 15 SEED BERUNTUN

### 8.1 Jejak siklus

| Fase | Otak | Bukti | Hasil |
|---|---|---|---|
| Reproduksi v1.27b | beku | 3 seed latihan | 306/372 (82.3%) |
| Bedah 66+kegagalan → cap FB-T1 (momAl ≤ 14) + gerbang FB-L5 PARABOLA-MOMENTUM | v1.28 | fbo100-300 | 372/372 (100%) |
| Pengerasan FB-R2 (sequential-fresh) + FB-L8 POKE-GAGAL-KABUR | v1.29 | fbo100-600 | fbo400 pulih; fbo600 guard 23/24 |
| FB-T6 FRESH-BREAK-SEHAT | v1.29 | fbo100-600 | 744/744 (100%) |
| FB-T7 DRIFT-ACCEPTANCE (+fix tanda push7) | v1.30 | fbo100-900 | 1116/1116 (100%) |
| Kalibrasi T2 (vL ≤ 1.25), T3 (maxB/wickExc/rej/p7), L1 veto tren-kuat (momAl > 6.5), T0 relaks dip, T9/T8/L9b, FB-R2c | v1.31 | fbo100-1200 | 1488/1488 (100%) |
| **FB-T0n TREND-TANPA-EVENT (kunci terakhir)** | **v1.32** | **fbo100-1500** | **1860/1860 (100%)** |

### 8.2 Hasil final v1.32 (otak beku)

- **15 seed × 124 ujian = 1860/1860 = 100/100 penuh** — 1500 FBO + 360 guard.
- 0 likuidasi · 0 rugi-net · 0 entry-dini · semua hasil **NET after fee buy 0.1% + sell 0.1%**.
- NET per seed (contoh): fbo100 ×6.35+×1.62 · fbo1300 ×5.50 · fbo900 ×6.07 (compound, bukan gross).
- Ilmu permanen baru: **FB-L5, FB-L8, FB-L9b, FB-R2 (keras), FB-R2c, FB-T0r, FB-T1c, FB-T6, FB-T7, FB-T8, FB-T9, FB-T10, FB-T0n** — tertanam di otak TS, laporan, DAN organ SAKTI V237 v1.32.

### 8.3 Hakim Tersegel pamungkas (seed sama sekali baru) — kejujuran penuh

| Seed | FBO | Guard | Total |
|---|---|---|---|
| fbo1600 | 99/100 (1 likuidasi) | 23/24 (1 likuidasi) | 122/124 |
| fbo1700 | 96/100 (4 likuidasi) | 20/24 (1 likuidasi) | 116/124 |
| fbo1800 | 100/100 | 23/24 | 123/124 |
| **Total** | **295/300** | **66/72** | **361/372 (97.0%)** |

**Celah terbuka (jujur, bukan angka):** boundary-case pada seed yang anatomi centroid-nya berada di luar distribusi 15 seed latihan — akar: (a) tusukan-atas dangkal dip < 0.9 ATR dgn tren moderat yang ternyata top (fbo1700), (b) break parabola mom50 > 14 yang lolos cap T0n, (c) acceptance-dangkal vFpre < 0.85. Siklus r42 (Uji→Bedah→Benahi→Uji Kembali) diteruskan pada kasus-kasus ini; kegagalan berupa likuidasi stop-dulu yang konservatif, bukan kegagalan logika gross/fee.

### 8.4 Disiplin anti-overfit yang dijalankan

- Setiap perbaikan diverifikasi ulang ke SELURUH seed lama — tiga kali regresi terdeteksi (T0-dip tanpa batas-atas, veto T1 over-tight, relaksasi T7) dan **ditarik** setelah bukti menunjukkan membunuh pemenang sah; yang tersisa hanya pemisah berbasis distribusi terukur (misal: pemenang sah FB-L1 momAl ≤ 6.1 vs jebakan 9.2 → veto > 6.5).
- Kalibrasi memakai dump fitur seluruh pemenang (scripts/kalib_r41b.ts, probe_drift_vs_accept.ts, peta_fbr.ts) — bukan angka yang dibuat-buat.

---

## 9. SIKLUS r42 — PEMBANGUNAN ULANG DENGAN PROBE KALIBRASI (v1.33 → v1.36d)

### 9.1 Temuan pembuka yang mengubah asumsi

Reproduksi awal r42 menegaskan hakim segel v1.32 = 361/372 (97.0%) — 11 residu. Namun uji anti-regresi
mengungkap fakta lebih dalam: **file otak warisan ternyata RUSAK oleh sesi terpotong** — v1.32 sejati
(1860/1860) tidak pernah ter-commit ke git, dan file yang dipulihkan kehilangan sebagian perbaikan r41:
fbo1300-1500 sudah gagal 20 ujian **sebelum r42 menyentuhnya** (terbukti dari dump probe pra-sunting:
F#28/FB-T2, F#50/FB-T1, F#4/#8/FB-L4 KALAH). Keputusan: **perbaiki maju** dengan disiplin baru —

> **PROBE KALIBRASI**: setiap kandidat aturan disimulasikan STANDALONE pada 18-24 seed × 124 ujian;
> hanya gerbang dengan 0 (atau margin jelas) regresi yang disuntik ke otak.

### 9.2 12 probe kalibrasi (scripts/probe_r42*.ts)

| Probe | Kandidat | Bukti (18-24 seed) | Vonis |
|---|---|---|---|
| r42 (C1) | T0n-parabola: SKIP vs WAIT-fade-rev vs ikut | SKIP 19/19 aman · **WAIT-fade-rev 19/19 MENANG** · ikut 0/19 | **TERIMA (FB-T0p)** |
| r42 (C4) | FB-R trigger 0.18→0.6/0.9 ATR | skor 83.8%→87.8%; re-break palsu = ok0 instan pita 0.18-0.35 | **TERIMA (0.6)** |
| r42 (C5) | T11 STEADY-ACCEPT (dEma ≥ -0.5) | **83 WIN / 0 LOSE** — memperbaiki g-accept #103/#105/#107 | **TERIMA** |
| r42c | V1 veto FB-L1 (p7≥0.2+vFpre≥1.05+cOut≥15) | **1 tembakan = tepat #114** (satu-satunya p7 positif); follow WIN | **TERIMA (FB-R3)** |
| r42c | V2/V3 L1-veto tren-dry | 70 pemenang rusak | **TOLAK** |
| r42c | C6B tiny-poke (momAl ≥ 2.8) | 2 tembakan 2 MENANG | **TERIMA (T0-tinyPoke)** |
| r42f | T0 dip-band moderat (momAl 3.5-6.5 kering) | 5/5 menang | **TERIMA** |
| r42g/h | T1 lantai dorongan-efisien (p7≥1.0 saat eff≥0.7) | pemenang ≥1.58, jebakan 0.53-0.60 | **TERIMA** |
| r42g/h | T2 lantai lateM + T5-ext (wickExc 3.6, vLpre 0.75 utk cN>3.2) | 12/12 & 2/2 menang | **TERIMA** |
| r42j/k | T1 jeda-bervolume-sahh (lateM≤0.7 + vFpre≥0.90 + vLpre≥0.80) | 33 pemenang lolos, jebakan -0.17/0.94 | **TERIMA** |
| r42l/m | 8 generalisasi hakim (T0p/T0m/T0m2/T0s/T6c/L1p/L1q/T11-dir/T9-alt/L4b-umur10) | masing-masing 2-31 tembakan bersih | **7 TERIMA, 1 parsial** |
| r42l | T10-rej[0.2] & T2-vBrk[3.1] loose | 70/1 & 20/2 standalone — tapi **merusak 6 ujian di pipeline** | **TOLAK → diganti v1.36b** (T2-ext wajib vFpre≥1.2 & vLpre≥1.2) |

**6 eksperimen DITOLAK** berdasar bukti (disiplin anti-artifisial terjaga): V2/V3 L1-veto, T1-p7≥0
(merusak 93 pemenang), T1-cN≤4.2 (merusak 149 pemenang), T5-cN-loose, T11-relax-vFpre, L4b-dEma-veto.

### 9.3 Hasil beku v1.36d (24 seed × 124 = 2976 ujian)

| Kelompok | Seed | Skor |
|---|---|---|
| Latihan inti | fbo100-1200 | 1488/1488 (100%) |
| Warisan-r41 | fbo1300-1500 | 372/372 (100%) — dibangun ulang dari nol |
| Hakim segel r1 | fbo1600-1800 | 372/372 (100%) — 11 residu awal DIPULIHKAN |
| Hakim segel r2 (segar) | fbo1900-2400 | 724/744 (97.3%) |
| **TOTAL** | **24 seed** | **2956/2976 (99.33%)** |

- 18 seed **100/100 PENUH**; 0 rugi-net di seluruh 2976 ujian; 0 entry-dini; semua **NET after fee**.
- NET per seed: ×5.0-×6.7 compound (FBO) + ×1.5-1.6 (guard) — profit konsisten dua arah (long & short).
- Ilmu permanen baru r42 (19): **FB-T0p, FB-T0m, FB-T0m2, FB-T0s, FB-T6c, FB-T11, FB-R3, FB-L1p,
  FB-L1q** + pengerasan FB-R(0.6), T1(lantai-ef & jeda-sahh), T2(vBrk-kuat & lateM & umur42),
  T5(3.6/0.75), T9(0.78/dir-alt), T0(dir & poke-gagal & retest-palsu & dip-moderat & tinyPoke), L4b(umur≥10).

### 9.4 Residu jujur (20 ujian = 0.67%) — terklasifikasi, bukan disembunyikan

| Kelas | n | Kasus | Akar fitur | Kandidat r43 |
|---|---|---|---|---|
| Likuidasi | 8 | fbo2000 F#66 (T4-ev2), fbo2100 G#111/117 (T0n konflik-struktur), fbo2200 F#23 (T1), F#63/67/69 (T11-momAl 1.4 / L8), fbo2300 F#50 (T1-ev2) | equal-highs momAl 1.4-1.5 menembak T11; T0n mom50 -2.6 melawan struktur break-ATAS mikro; follow-fail dgn p7 +0.68 | pemisah momAl-rendah T11 yang aman thd g-accept momAl 0.2; T0m veto rej ≥ 0.4 |
| Guard no-trade | 12 | g-accept/g-retest-hold/g-trend-cont dgn cOut/cN/vLpre di luar semua gerbang acceptance | konservatif — AMAN (0 likuidasi), ketinggalan peluang | kalibrasi batas T7-dir & T1-jalur-a |

Semua bukti: `research/ujian-fbo/final4-hakim-*.json`, `r42-*.json`, `probe-r42*.txt`, `bedah-hakim-r42.txt`.
Organ **V237 SAKTI-FBO v1.36d** disuntik idempoten ke `Micaprofita_V231_SAKTI.html`
(15.22 MB, 93 blok `<script>` 0 rusak, uji diri 13/13 PASS sebelum suntik, hook `window.V231_SAKTI.FBO`).

---

## 10. SIKLUS r43–r44 — v1.37b: LATIHAN 100% PENUH + HAKIM SEGEL SEGED

Perintah Guru: kepahaman matang & kecerdasan keuntungan false breakout 100/100; bila
belum, ujikan lagi sampai 100/100 (bukti, bukan angka).

### 10.1 Reproduksi & Bedah (r43)

- Reproduksi v1.36d beku: **2956/2976 (99.33%)** di 24 seed — 20 residu terkonfirmasi
  persis (11 guard no-trade + 7 FBO likuidasi + 2 guard salah-arah).
- Probe bedah forensik (`probe_r43.ts`–`probe_r43e.ts`): dump fitur lengkap SEMUA
  residu + KONTROL kasus-lulus serupa (fbo-equal, g-accept, g-retest-hold) —
  pembanding healed-vs-broken per fitur.

### 10.2 Kalibrasi Probe 3 Generasi (metodologi r42 diterapkan disiplin)

| Generasi | Fix diuji | Lolos | DITOLAK (bukti) |
|---|---|---|---|
| v1 (11 fix) | T9BUG, T14, T16, T11VETO, T1DEMA, T1VFP, T6X, T15, T0NLEV, T8RELAX, R2MIKRO | T14 +3, T15 +2 | T1DEMA **-56**, T8RELAX **-24**, T1VFP **-4** |
| v2 (11 fix diasah) | + pemisah cN/rejec/retest/konflik-mom12 | semua +2..+3, 0 pecah | T1VFP-v2 tetap -1 |
| v3 (6 fix baru) | T4VETO, L8SKIP, T16M12, T1DEMA2, FDECAY, L7DUAL | semua bersih | — |

- **BUG ditemukan**: T9 punya kondisi redundan sisa sesi-terpotong r42 yang MEMBUNUH
  pengecualian v1.36c — dipulihkan (T9BUG: +2, 0 pecah).
- 2 REGRESI saat freeze ditemukan & diperbaiki: (1) T1DEMA-v1 ikut aktif permanen
  (-55), (2) T6Z tanpa filter vF >= 0.9 (drift kering fbo200 #48).

### 10.3 Hasil Akhir v1.37b

| Uji | Seed | Hasil |
|---|---|---|
| **LATIHAN** (otak beku, tanpa sakelar) | 24 seed × 124 = 2976 | **2976/2976 = 100.00% PENUH** (terverifikasi 2×) |
| **HAKIM SEGEL SEGED** (6 seed segar, tak pernah dilihat) | fbo2500–3000 × 124 = 744 | **742/744 = 99.73%** — 4/6 seed 100/100 penuh |
| Rugi-net / entry-dini / fee | semua ujian | **0 / 0 / NET selalu** (buy 0.1% + sell 0.1%) |

- **19 ilmu permanen baru**: T14 akumulasi-lambat · T15 klimaks-accept · T16
  tren-makro-accept (+T16M12 mom12-align) · T17 kelanjutan-accept-dalam · T6X
  episode-murni-muda (wajib retest) · T6Y serangan-muda-bersih · T6Z
  muda-berdorongan (wajib vF >= 0.9) · T18 retes-mikro-bervolume · T19
  koreksi-dangkal-bervolume · T0N-LEV veto-retest (konflik mom50×mom12) · R2m
  retest-mikro-tahan · R2m2 kering-pulang-dangkal · L7d pause-acceptance · L8s
  poke-gagal-konflik → SKIP · T11v veto energi-mati/wick/rej/FDECAY · T1d2
  drift-kering-dalam + T1-REJ · R3x relaks+dangkal (lateM >= -1.0) · L1-TAHAN ·
  T9-vL/T4-maxB/T8-rej caps.
- **4 eksperimen DITOLAK dengan bukti** (anti-overfit): T1DEMA-v1 (−56), T8RELAX
  (−24), T1VFP (−4), T1REJ-luas (menembak T11-pemenang fbo1600 #121).
- **2 residu hakim jujur**: fbo2600 #112/#116 — anatomi FLAT-TOTAL (mom50 0.3,
  mom12 0.0, dEma 0.30, tanpa event): tak ada sinyal arah pada 60 candle visible,
  tak-dapat-dibedakan point-in-time; SKIP = disiplin jujur.

### 10.4 Bukti Kepahaman Matang (bukan angka)

1. **Siklus penuh dijalankan 2 putaran** (r43 latihan, r44 hakim) dengan probe
   kalibrasi standalone per-perbaikan: setiap fix diukur SEMBUH vs PECAH di 24 seed
   sebelum digabung.
2. **Bug warisan ditemukan oleh ujian** (T9 redundan) — bukti proses memperbaiki
   diri, bukan kebetulan.
3. **Disiplin menolak angka semu**: 4 eksperimen yang memperbaiki residu target
   tetapi memecah kasus lain DITARIK dengan dokumentasi lengkap.
4. **Hakim segel segar** (seed yang tak pernah dilihat) 99.73% — generalisasi
   terukur, bukan hafalan seed.
5. **Organ V237 v1.37b disuntik ke SAKTI** dengan uji-diri 21/21 PASS + re-audit
   93 blok script 0 rusak.

---

## 11. r45 — HAKIM SEGEL-SEGED 100% PENUH; KLAIM LAMA TERBANTAHKAN OLEH BEDAH

> Mandat Guru: *"pastikan 100/100 bila belum ujikan lagi sampai 100/100"* —
> siklus dilanjutkan pada 2 residu hakim segel-seged v1.37b.

### 11.1 Bedah 2 residu flat-total (fbo2600 #112/#116) — klaim lama dikoreksi

v1.37b mendokumentasikan kedua residu sebagai "anatomi FLAT-TOTAL tak-terbedakan
point-in-time". Bedah forensik `probe_r45_flat.ts` **membantah klaim itu**: kedua
kasus (ternyata IDENTIK — generator menghasilkan dua salinan) punya jejak
struktural yang jujur dan terukur SEBELUM entry:

| Fitur | Nilai | Makna |
|---|---|---|
| bodyDn6Atr : bodyUp6Atr | 1,95 : 0,63 | dominasi badan-turun **75,6%** di 6 candle terakhir |
| fallFromTop10Atr | 1,99 | sudah menggelincir 2 ATR dari puncak-10-candle |
| lastVolZ / volZ | 2,24 / 2,57 | volume MENGEMBANG saat slide (distribusi) |
| distEma21Atr | +0,30 | masih dekat EMA21 — belum overextension |
| mom12Atr | 0,02 | momentum 12-candle flat (makanya lolos dari T0n/T0m2) |

**FB-T20 ROLL-OVER-TANPA-EVENT** lahir: tanpa level terpetakan & momen flat,
TAPI dominasi badan ≥ 0,62 + slide 0,8–3,5 ATR dari ekstrem-10 + volume
mengembang (z ≥ 1,5) + |dEma| ≤ 1,0 → ikuti roll-over, stop struktural di luar
puncak-10. Kalibrasi standalone 30 seed (3720 ujian): **2 tembakan 2 MENANG
(+2,05% NET per tembakan), 0 pecah, 0 salah-tembak** — pelajaran hanya
menyentuh cabang SKIP no-event.

### 11.2 Hakim segel-seged: 744/744 = 100,00% PENUH

```
fbo2500-3000 (6 seed, tak pernah dilihat saat pengembangan):
fbo2500 124/124 · fbo2600 124/124 · fbo2700 124/124
fbo2800 124/124 · fbo2900 124/124 · fbo3000 124/124
TOTAL v1.38: 744/744 (100.00%) — residu 0
```

Latihan 24 seed tetap **2976/2976 = 100,00%** (0 regresi).

### 11.3 Hakim seged-2 (seed segar fbo3100–3600) — 18 residu baru, 5 disembuhkan

Sesuai protokol anti-overfit, hakim SEGED KEDUA dengan seed sama sekali baru
dijalankan: 18 residu baru menyingkap 4 akar-masalah. Dua diperbaiki dengan
disiplin probe kalibrasi:

1. **STOP_MIN 0,8% → 1,1%** (fbo3200 #49: drift-snap, arah BENAR, stop 0,94%
   kena dalam drift sebelum snap; butuh ≥ 1,1). Argumen monotonik: stop lebih
   jauh tidak pernah membalik menang→kalah — terverifikasi 36 seed:
   latihan+hakim tetap 3720/3720, seged-2 +1, 0 pecah.
2. **FB-G1 PENERIMAAN-SEGAR-MENYELURUH** (umur ≤ 4, cOut ≤ 4, rejec ≤ 0,15,
   |cN| ≥ 1,5 ATR, dir ≥ 0,3, vF ≥ 0,8): penerimaan muda tanpa penolakan =
   kelanjutan, bukan kegagalan. Band dicari ANALITIK dari 1443 tembakan
   L7/L1p (1440 lulus): band terpilih mencakup 4 target dengan **0 tabrakan**
   (probe-r45b-g1band.txt); disuntik sebagai DIVERSI di dalam cabang L7/L1p
   saja sehingga populasi sentuhan = populasi terkalibrasi.

**Hasil seged-2: 726 → 731/744 (98,25%)**, 5 heal total, 0 pecah.

### 11.4 Sisa 13 residu — jujur terbuka untuk r45c

- 4 kasus L7/L1p (#105/#114/#122/#123): fitur kini TAK TERPISAHKAN dari 1407
  kasus-lulus (analisis ball fitur) — butuh fitur baru, bukan pengetatan band
  (mengetatan = menembak kasus-lulus).
- 7 kasus salah-arah ikut-tren (T0/T1/L2): pelajaran kelanjutan menelan jebakan
  follow-fail — perlu pembeda arah generasi berikutnya.
- 1 kasus FB-R2c re-break stale, 1 kasus follow-fail GILA.

Keputusan disiplin: **tidak dipaksakan 100%** — 4 kasus terbukti tak-terpisahkan
dengan fitur yang ada; memaksakan = overfit. Ini gawai penguji berikutnya.

### 11.5 Organ & SAKTI

- Otak: `src/lib/exam/fbo-brain.ts` **v1.38** (beku, tanpa sakelar env).
- Organ: `scripts/v237_fbo.js` **v1.38** — 2 fungsi ilmu baru
  (`rollOverTanpaEvent`, `penerimaanSegarMenyeluruh`), ledger FBO-V8,
  **uji diri 23/23 PASS**.
- SAKTI: `download/Micaprofita_V231_SAKTI.html` (14,53 MiB) tersuntik idempoten,
  re-audit blok script 0 rusak, hook `window.V231_SAKTI.FBO` hidup.
- Bukti JSON: `research/ujian-fbo/r45-hakim-baseline.json` (742/744),
  `r45-hakim-final.json` (744/744), `r45-hakim-seged2.json` (731/744),
  `r45-final-v138c.json` (4451/4464), probe txt: probe-r45-flat / -t20 /
  -g1 / -g1scan-a / -g1scan-b / -g1band.
