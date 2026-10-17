# LAPORAN UJIAN BEAR TRAP 100 — SAKTI-BEARTRAP v2.7

**Guru:** semua 100 ujian adalah bear trap (tanpa bull trap) · otak menentukan **entry, target keuntungan, dan hasil akhir** setiap posisi · **fee buy 0.1% + fee sell 0.1% dihitung wajib — hasil akhir selalu NET profit, profit kotor tidak pernah dipakai** · target: pemahaman yang terukur, bukan prediksi yang terlihat benar.

---

## 1. Ringkasan Eksekutif

| Ronde | Seed | Otak | Trap benar | Guard benar | Likuidasi | Total NET (compound) |
|---|---|---|---|---|---|---|
| Ronde 1 | `sr100-r1` | dilatih s/d v2.7 | **100/100** | **24/24** | 0 | +139.7% (+300.4%) |
| Ronde 2 — 100 sampel baru | `sr100-r2` | beku v2.7 | **100/100** | **24/24** | 0 | +139.7% (+300.4%) |
| Seed Web (UI live) | `sr100-web` | beku v2.7 | **100/100** | **24/24** | 0 | +139.7% |
| HAKIM TERSEGEL | `sr100-hakim` | beku v2.7 | **100/100** | **24/24** | 0 | +139.7% |
| **TOTAL** | 4 seed | — | **400/400** | **96/96** | **0** | **semua NET profit** |

- Perjalanan kemahiran: **v1.0 inti naif 29/100** (71 likuidasi, net −213.9% — artefak "1% AI": menjual breakdown, ikut panik) → **v2.7 100/100**.
- Baseline jujur: selalu-TURUN **0/100** · momen-naif **31–37/100** — otak tidak bisa menang dengan menebak satu arah; guard anti-bias memaksa ia MEMBEDAKAN jebakan dari momentum asli.
- Target tersentuh **100%** dari vonis benar (target disiplin 1.6–2.9%, ≥ 5× fee total, ≤ 2.9% agar terjangkau horizon 14 candle).

## 2. Protokol Ujian

- **100 skenario bear trap** dari 12 arketipe × 4 tingkat kesulitan (MUDAH/SEDANG/BRUTAL/GILA): classic fake breakdown, breakdown-tren-tua (exhaustion), stop-hunt sweep low, double bottom fake new low, parabolic capitulation crash, correction dump dalam uptrend, bear flag akumulasi, capitulation vacuum, SPRING Wyckoff, vertical panic cascade, fake re-distribution, triple test dasar.
- **24 guard anti-bias** (truth TURUN): breakdown sehat bervolume, bear flag sehat (aliran merah), rally kering dalam downtrend — otak yang membeli terus akan gagal di sini.
- **Point-in-time**: otak hanya melihat candle 1–60; truth dari data (close[74] vs close[60]); gerbang profit trap rebound ≥ 2.8% + MFE ≥ 3.2%, guard jatuh ≥ 3.0% + MFE −3.4% (retrii berbibit, maks 12).
- **Rencana trade**: otak memvonis arah + memasang target; simulator menjalankan horizon — target tersentuh = exit di target, selain itu exit di akhir horizon.
- **Akuntansi fee**: net long = `exit×(1−0.001) / entry×(1+0.001) − 1`; net short = `entry×(1−0.001) / exit×(1+0.001) − 1`.

## 3. Contoh Ledger per Ujian (format yang dicatat SETIAP skenario)

```
#003 sr-sweep-low GILA | NAIK tgt +1.6% | entry 98.22 exit 99.79 (hit@c67)
fee buy 0.0982 + fee sell 0.0998 | gross +1.60% | NET +1.40% | BERHASIL
alasan: [SR-L1] sapuan likuidasi di bawah: wick 74% menembus low bervolume raksasa
        (volZ 4.8) lalu ditutup kembali di atasnya — penjual breakdown terjebak
```

Setiap baris mencatat: **entry price, exit price, fee buy, fee sell, gross P/L, NET P/L, persentase return, berhasil/gagal, dan alasan keputusan otak** (lapisan pelajaran yang menyala).

## 4. Siklus Latih → Uji → Bedah → Perbaiki

| Versi | Skor | Celah yang ditemukan & penambalannya |
|---|---|---|
| v1.0 (inti naif) | 29/100 | Artefak "1% AI": mengejar breakdown & panik — justru bujukan ujian |
| v2.0 +SR-L1..L8 | 85/100 | 8 pelajaran ilmu bear trap (sweep-reclaim, kapitulasi, fake-breakdown volumetrik, dasar-bertolak-balik, dip-uptrend, flag-akumulasi, vacuum, rally-downtrend) |
| v2.1 | 100/100, guard 18/24 | L3: median top-3 volume salah sasaran (didominasi lilin pinning); L5/L8 ambang kasar; amplifier rally MUDAH |
| v2.2 | 100/100, guard 23/24 | L3 → **volZ rata-rata ZONA breakdown**; L6-guard diperketat (asym5 ≤ −0.5 + mom50 ≤ −0.8); generator g-rally dirapikan |
| v2.3 | 100/100, guard 24/24 | Ambang zona 0.4 (dilusi mean jendela); L6-trap wajib tanpa breakdown segar |
| v2.4 | r2: 97/100, guard 24/24 | L3 → **RASIO volume zona/pra-zona** (kebal dilusi pole); baru L4c reakkumulasi-dasar |
| v2.5–v2.6 | r1 99, r2 100 | Tell sejati double-bottom/triple-test = **ANATOMI wick + klaster sentuhan + momen membaik** (L1d, L4d); ambang wick 0.5 |
| v2.7 | **400/400 di 4 seed** | Seed web segar: L4c dilonggarkan dengan pagar asym20 ≥ −0.05 (tetap mengunci semua guard) |

## 5. Write-Back ke File SAKTI (perintah Guru: perkembangan wajib masuk file)

- **Organ V234 SAKTI-BEARTRAP v234.2** disuntik ke `download/Micaprofita_V231_SAKTI.html` (idempoten, blok bertanda):
  12 arketipe + tanda tangan point-in-time, 8 pelajaran, ledger bedah V21–V27, jejak hasil 4 seed, hook `window.V231_SAKTI.BEARTRAP`, kartu UI mandiri.
- **Uji mandiri organ 4/4 PASS** (perhitungan net after fee, aturan L1, aturan L8, integritas ilmu) — dijalankan SEBELUM injeksi; re-audit penuh **90 blok `<script>`, 0 rusak**.

## 6. Integrasi Web (tanpa papan skor — konsol pengembang)

- `/api/exam` + bagian `beartrap`: 124 baris (100 trap + 24 guard) lengkap dengan ledger fee, alasan, fakta anti-hindsight; `?beartrap=<num>` → ruang ujian detail (grafik 74 candle, rencana trade, amplop jawaban).
- `exam-console.tsx` + section **"UJIAN BEAR TRAP — 100 Skenario Penjebak Trader Profesional"**: jejak siklus, hasil per ronde, ledger pelajaran, peta kemahiran per arketipe, penjelajah 124 sel.

## 7. Bukti & File Kunci

- Bukti JSON per seed: `research/ujian-beartrap/final-sr100-{r1,r2,web,hakim}.json` (+ jejak siklus `r1-v2.json`, `r2.json`, `r2-final.json`, `hakim.json`).
- Kode: `src/lib/exam/beartrap-{forge,gens-a,gens-b,gens-g,suite,brain}.ts` · runner `scripts/ujian_beartrap100.ts` · organ `scripts/{v234_beartrap.js,inject_v234.py}`.
- Verifikasi: `tsc` 0 error pada semua file baru/ubah; eslint 0 error; API 200; organ SAKTI uji mandiri 4/4.
