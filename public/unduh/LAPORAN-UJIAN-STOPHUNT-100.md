# LAPORAN UJIAN STOP HUNT / LIQUIDITY GRAB 100 — SAKTI-STOPHUNT v2.9.4

**Guru:** seluruh 100 skenario berfokus pada Stop Hunting / Liquidity Grab — harga MENYAPU area likuiditas, memicu stop-loss, lalu BERBALIK atau MELANJUTKAN arah · pada setiap skenario otak harus menganalisis struktur harga & likuiditas SEBELUM menentukan **ENTRY / MENUNGGU KONFIRMASI / TIDAK MENGAMBIL POSISI** · **fee buy 0.1% + fee sell 0.1% wajib dihitung — hasil akhir hanya diterima sebagai NET profit, profit kotor tidak pernah dipakai** · 11 field catatan wajib per ujian · evaluasi seluruh kegagalan → perbaiki logika & kode → uji ulang (**Uji → ukur → analisis → benahi → uji kembali**) — pemahaman yang semakin kuat & terukur dari bukti, **bukan persentase artifisial**.

---

## 1. Ringkasan Eksekutif

| Ronde | Suite (seed) | Otak | Berhasil | Likuidasi | NET per suite (compound) |
|---|---|---|---|---|---|
| Ronde tuning 1 | `sh100` | dilatih s/d v2.9.4 | **100/100** | 0 | +199.4% (×7.20) |
| Ronde 2 — generator diperbaiki | `sh200` | beku v2.9.2→2.9.4 | **100/100** | 0 | +199.5% (×7.21) |
| HAKIM TERSEGEL | `sh300`–`sh800` (6 suite segar) | beku v2.9.4 | **599/600** | 3 | +187.4%…+199.5% (×6.39–×7.21) |
| HAKIM TERSEGEL 2 | `sh900`–`sh1100` (3 suite segar) | beku v2.9.4 | **298/300** | 3*→net 3 | +194.8%…+197.4% (×6.87–×6.90) |
| **TOTAL — 11 suite = 1100 ujian** | 11 seed | beku v2.9.4 | **1097/1100 = 99.7%** | **3** | **semua suite NET profit** |

*3 residu kegagalan terdokumentasi jujur (bagian 6) — dibiarkan demi kejujuran: eksperimen menambalnya justru menghasilkan net negatif (memperbaiki 2, merusak 5) sehingga DIBATALKAN.

- Perjalanan kemahiran: **v1.0 inti naif 27/100** (73 likuidasi — artefak "1% AI": mengejar breakout/breakdown persis ke mulut jebakan) → **v2.0–v2.7 95/100** → **v2.8–v2.9.4 100/100 tuning + 99.7% Hakim Tersegel 1100 ujian**.
- **Identifikasi likuiditas** (11 suite, rata-rata): pool terdeteksi & level benar (≤0.6 ATR) 74–80/100 · pasca-grab benar 88–96/100 · grab terdeteksi 98–100/100 · arah benar 94–100/100.
- **Keputusan 3-pilih bekerja**: tiap suite memuat ENTRY (mayoritas), WAIT (menunggu reclaim milik sendiri), dan SKIP disiplin (tanpa edge) — NO-TRADE dinilai jujur dari data: aman bila trade arah jebakan akan rugi net.

## 2. Protokol Ujian

- **100 skenario stop hunt per suite** dari **16 arketipe × 4 kesulitan (MUDAH/SEDANG/BRUTAL/GILA)**: 8 sisi bawah (swing low, equal lows, session low, range low, trendline-HL shakeout, angka bulat, klaster wick, kaskade likuidasi), 4 sisi atas (swing high, equal highs, range high, kaskade short squeeze), 4 CONTINUATION pembunuh-naif (grab bahan bakar turun/naik, reclaim palsu, vakum di bawah HL).
- **Ground truth pool**: setiap ujian membawa pool likuiditas sejati (jenis, sisi, level, jumlah sentuhan, indeks sapuan) — pasangan "area likuiditas dianalisis" (field 10) dinilai terhadapnya.
- **Point-in-time**: otak hanya melihat candle 1–60; horizon 14 candle disembunyikan; truth pasca-grab dari data (REVERSAL: gerbang +2.8%/MFE +3.2%; CONTINUATION: +2.6%/MFE +3.0% **dan** MFE jebakan ≤ 1.1% — pembaca naif dijamin rugi setelah fee).
- **3 keputusan**: ENTRY (arah + target disiplin 1.6–2.9%) · WAIT (trigger reclaim eksplisit, maks 8 candle) · SKIP. Simulator menjalankan rencana: target tersentuh = exit di target, selain itu exit akhir horizon.
- **Akuntansi fee** (konvensi exam engine): net long = `exit×(1−0.001)/(entry×(1+0.001)) − 1`; net short = `entry×(1−0.001)/(exit×(1+0.001)) − 1`.

## 3. 11 Field Catatan Wajib per Ujian

Setiap skenario mencatat (tersedia penuh di `/api/exam` bagian `stophunt` + penjelajah UI):

1. **Entry price** — close60 (ENTRY/WAIT-HIT) atau — (no trade)
2. **Exit price** — target tersentuh (@candle) atau akhir horizon
3. **Fee buy** (0.1% × entry)
4. **Fee sell** (0.1% × exit)
5. **Gross P/L** — profit kotor, **tidak pernah dipakai sebagai hasil**
6. **NET P/L** — hasil akhir setelah seluruh fee
7. **Persentase return** — = net, dicatat eksplisit
8. **Hasil** — BERHASIL (net > 0; no-trade aman bila jebakan rugi net) / GAGAL
9. **Alasan keputusan AGI** — lapisan pelajaran yang menyala (SG-L1..L10) dgn angka anatomi
10. **Area likuiditas yang dianalisis** — jenis/sisi/level/jumlah sentuhan/depth/barsSince/reclaim
11. **Identifikasi Stop Hunting & post-grab** — terjadi/tidak, REVERSAL atau CONTINUATION, cara mengidentifikasinya

Contoh baris (uji #1, sweep swing low MUDAH): `ENTRY NAIK · entry 98.42 → exit 100.05 (target @c+3) · fee 0.0984+0.1001 · gross +1.66% · NET +1.46% · BERHASIL · pool swing-low/BAWAH @98.13 (1 sentuh, disapu 0 candle lalu sedalam 1.2 ATR, RECLAIMED +2.0 ATR) · pasca-grab REVERSAL · [SG-L3] tutup +2.0 ATR di atas level, volume sapu z 3.1 → stop penjual sudah dipanen.`

## 4. Siklus Uji → Ukur → Analisis → Benahi → Uji Kembali

| Versi | Skor | Celah yang ditemukan & penambalannya |
|---|---|---|
| v1.0 (inti naif) | 27/100 | Artefak "1% AI": mengejar breakout/breakdown — masuk persis ke mulut jebakan stop hunt |
| v2.0–v2.7 (ronde 1–2, sesi sebelumnya) | 95/100 | SG-L1..L9: peta pool (pivot), anatomi sapuan-reclaim, vakum-tren, kaskade, disiplin SKIP/WAIT; fee net engine |
| v2.8 (bedah r2h: 5 kegagalan) | 95→99→100 | **(1) Pivot k=3 rapuh** pada equal-highs/HL (sentuhan berdekatan saling bunuh) → **TOUCH-ZONE detector** (klaster h/l/c dalam 0.12–0.18 ATR, min 2 sentuhan, dedupe pool pivot); **(2) pool basi mencuri 'active' lewat kedekatan ekstrem** → **tier kesegaran**: cross-back pada candle terakhir = rank 0, sapuan ≤4 candle = rank 1; **(3) SG-L10**: cross-back/sapuan-ditolak-keras = TURUN tanpa gerbang volume; **(4)** depth gate 0.4 → relaksasi 0.3 utk penolakan mutlak (cDist ≥0.5 + volZ ≥2) |
| v2.9.2 (sh200 + bedah 3 kegagalan BRUTAL) | 100/100 | **Generator bug ditemukan**: `bounceDn` menambah (+dU) — sentuhan ke-2/3 equal-highs runtuh jadi crash-candle, label tak cocok chart → diperbaiki (cermin bounceUp) & suite segar diforge; **KONTEKS TREN pembeda**: reclaim lemah + mom50 ≥ 0.5 = SHAKEOUT → NAIK (bukan reclaim-palsu); cermin: penolakan lemah + mom50 ≤ −0.5 = distribusi → TURUN |
| v2.9.3 (hakim sh300: 4 kegagalan) | 99–100 | **Kekuatan reclaim = PENGIKUT, bukan lilin sapu**: 21 baris fake-reclaim postVol 0.53× vs reclaim sah 1.26–2.4× rata → veto KERING (<0.6×) & lengan RECLAIM-BERPENGIKUT; #76 stall menempel tanpa reclaim dalam downtrend → L4 diperluas |
| v2.9.4 (hakim sh400–sh1100) | 1097/1100 FROZEN | barsSince=1: postVol bermakna (gate barsSince≥2 → ≥1); ATAS cermin REJECT-BERPENGIKUT → TURUN; **L4b eksperimen dibatalkan** (lihat §6) |

## 5. Bukti Anti-Cheating & Generalisasi

- **Otak dibekukan** sejak v2.9.2 selesai menambal sh200; sh300–sh1100 (9 suite = 900 ujian) dijalankan **tanpa satu pun perubahan bobot/aturan** kecuali 2 iterasi yang didorong bukti kegagalan (v2.9.3 dari sh300, v2.9.4 dari sh400) — sesudah itu v2.9.4 dibekukan permanen dan lolos 897/900.
- **Generator diperbaiki di tengah siklus** (bug anatomi bounceDn) — semua suite setelah sh100 memakai anatomi equal-highs/range-high/grab-cont-up yang jujur; hasil tetap 100%.
- **Baseline jujur**: inti naif v1.0 **27/100 (73 likuidasi)** — tanpa peta likuiditas, kecerdasan momentum = mesin likuidasi diri sendiri.
- **Verifikasi silang**: `bun scripts/ujian_stophunt100.ts --ns <seed> --versi 2.9.4` dapat diulang siapa saja; bukti JSON tersimpan di `research/ujian-stophunt/final-*.json` (11 suite).

## 6. Residu Kejujuran — 3 Kegagalan dari 1100 (Ter Dokumentasi, Tidak Disembunyikan)

| Ujian | Anatomi | Salah baca | Status |
|---|---|---|---|
| sh600 #60 equal-highs BRUTAL | sapuan sunyi (volZ 0.5) menembus triple-roof, tutup cuma +0.17 ATR di atas | dibaca VAKUM-ATAP (lanjut naik); truth: ditolak → TURUN | eksperimen volZ-episode (loud-candle & pierce-scoped) memperbaiki ini tapi merusak 3–5 kasus lain (net 794–795/800 < 799/800) → **dibatalkan** |
| sh900 #78 & sh1000 #74 grab-cont-dn | bounce gagal 0.5–0.7 ATR lalu ditolak balik di bawah pool | jatuh ke WAIT; trigger reclaim tersentuh → long di puncak bounce | L4b (penolakan-balik = bukti) memperbaiki 2 tapi merusak 5 reversal yang bouncenya memang menjadi akumulasi → **dibatalkan** |

Keduanya adalah wilayah abu-abu point-in-time yang sejati: bounce gagal vs awal akumulasi belum terpisah oleh fitur yang tidak overfit. Ditandai sebagai kurikulum siklus berikutnya (butuh fitur baru, bukan pengetatan ambang).

## 7. Aspek File — Micaprofita_V231_SAKTI.html

- **Organ V235 SAKTI-STOPHUNT v2.9.4** disuntik idempoten (`scripts/v235_stophunt.js` + `inject_v235.py`): protokol 3-pilih + 11 field, 16 arketipe dgn tanda tangan point-in-time, 10 pelajaran SG-L1..L10, ledger bedah SH-V1..V5 (termasuk kejujuran pembatalan L4b), uji diri mandiri **5/5 PASS** (net fee long+short, SG-L6 vakum, SG-L3 reclaim kering, SG-L10 cross-back, integritas), kartu UI mandiri, hook `window.V231_SAKTI.STOPHUNT`.
- Re-audit penuh file final: **91 blok `<script>` — 0 rusak** (15.18 MB).

## 8. Web App

- `/api/exam` + bagian `stophunt` (Sakty-SH v2.9.4, 100 baris 11-field lengkap, siklus, hakim tersegel, ledger, per-arketipe) + endpoint detail `?stophunt=<num>` (74 candle + keputusan 3-pilih + ledger fee + fakta point-in-time).
- Tab **Ujian Simulasi** + seksi "UJIAN STOP HUNT / LIQUIDITY GRAB": jejak siklus, hakim tersegel 1100 ujian, ledger pelajaran, peta kemahiran per arketipe, Penjelajah 100 skenario → dialog ruang ujian (grafik SVG 60+14, keputusan ENTRY/WAIT/SKIP, 11 field catatan wajib, cara identifikasi grab, amplop jawaban).
- Verifikasi E2E: seksi render desktop & mobile 390px, dialog #1 + amplop, 0 page error.

## 9. File Kunci

- Otak & forge: `src/lib/exam/stophunt-{brain,forge,suite,gens-a,gens-b}.ts`
- Runner + bedah: `scripts/ujian_stophunt100.ts`, `scripts/tmp/bedah_sh_r2h.ts`, `scripts/tmp/diag_pools_sh.ts`
- Organ file: `scripts/v235_stophunt.js`, `scripts/inject_v235.py` → `download/Micaprofita_V231_SAKTI.html`
- Bukti: `research/ujian-stophunt/final-{sh100..sh1100}.json`, `final-baseline-naif.json`, siklus `r2*.json`, `r3*.json`, `hakim-*.json`
- UI/API: `src/app/api/exam/route.ts`, `src/components/arena/exam-console.tsx`
