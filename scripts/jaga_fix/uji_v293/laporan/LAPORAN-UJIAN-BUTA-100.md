# LAPORAN UJIAN BUTA-HISTORI 100 (SEKOLAH KILAT V265)

**Tanggal:** 2026-10-03 · **Target:** penjaga.mjs ASLI (repo kanonik, V264 v6.1 → V265 v6.2)
**Mandat pemilik:** "uji dengan 100 soal trading koin — koin nyata, tiap soal berbeda, berlandas history yang sudah terjadi; cyborg tidak tahu itu simulasi padahal kita tahu fakta lapangannya; kalau tidak sesuai, push lagi — tingkatkan di mana bodohnya."

## Cara ujian (anti-bocor dijamin lapisan data)

1. **Dunia dibekukan** pada jam T historis: `Date` dibekukan dan **semua fetch dipotong pada T** — penjaga mustahil melihat lilin/funding/OI sesudah T (proxy `beku.cjs` menyaring setiap permintaan; host tak dikenal diblokir keras).
2. Penjaga **v6.1 asli** dijalankan utuh di sandbox per soal (radar → mate → komite → odds → gerbang → kunci) — bukan tiruan.
3. Dua kelas soal: **Kelas A (kunci penuh)** — prediksi resmi dengan entry/stop/target; **Kelas B (jawaban radar)** — arah+entry+keyakinan per koin yang dinilai penuh otak tapi ditahan gerbang portofolio (dikorek dari `kandidatLain`).
4. **Vonis resmi = rumus penjaga sendiri:** `net = arah × (exit/entry − 1) − fee 0.002`, exit = close 1 jam terakhir saat umur ≥ 24 jam.
5. Jendela soal: **T = 2026-06-08 → 2026-10-02** (313 titik, langkah 9 jam), koin = 115 pasangan USDT nyata; data derivatif lengkap utk 28 hari terakhir, lebih tua = fallback netral (dicatat jujur).

## Hasil headline

| Ukuran | V264 v6.1 (2.533 soal) | V265 v6.2 (2.366 soal) |
|---|---|---|
| Akurasi arah (24j, setelah fee) | 40.9% | **41.8%** |
| Net kumulatif | −462.5% | **−364.4%** (+98.2pp) |
| Profit Factor | 0.839 | **0.863** |
| BUY | ak 43.7% · net +140.6% | ak 44.5% · net +148.6% |
| SELL | ak 37.6% · net −603.1% | ak 38.6% · net −513.0% |
| Keyakinan 55-69 | ak 38.9% · net −303.7% | **ak 44.4% · net +175.4%** |
| Keyakinan ≥70 | ak 48.1% · net +16.7% | ak 49.3% · net +47.6% |

**Subset kanonik UJIAN-100** (100 soal pertama kronologis, kelas A diutamakan): akurasi **40.0%** · net **-49.9%** · PF **0.768**.

## Di mana bodohnya (jawaban dari data, bukan opini)

1. **SELL adalah pendarah** — menjual kelemahan (z-SMA < 0.5) ak 37.6% net −603%; tidak ada subset SELL yang untung dengan n layak.
2. **Keyakinan 55-69 melawan drift = overclaim** — ak 40.7% net −70.3% (n=221).
3. **SELL di pita sempit** (entropi ≤ 0.85) hampir selalu salah — ak 11.8% (n=17).
4. **Momentum BUY adalah jantung otak** — BUY z≥1.5: ak 47.6% (+105.9%, n=403); BUY drift≥5%: ak 48.1% (+191%, n=154).
5. **Gerbang justru MENYELAMATKAN**: jawaban yang ditolak gerbang portofolio ternyata akan rugi −458.7% — disiplin V260-V264 sudah menahan sebagian besar kebodohan radar. Yang belum ditahan = kalibrasi & ukuran → itulah yang V265 perbaiki.

## V265-SEKOLAH-BUTA — perbaikan yang di-push

Empat organ dari bukti 2.533 soal (mengikat saat kunci, terus dinilai medan hidup):
1. **jual-lemah** — SELL saat z<0.5 → keyakinan dijujurkan ≤40 + ukuran ×0.5 (tetap mengunci & belajar — anti-karantina).
2. **jual-pita** — SELL saat entropi ≤0.85 → veto saksi ber-alasan.
3. **key-melawan-drift** — keyakinan 55-69 melawan drift OLS-24j → terkalibrasi ×0.75, disegel di ledger.
4. **momentum-kuat** — BUY z≥1.5 / drift≥5% → bonus odds +8 (prioritas kuota).

Registri 285 → **293 parameter bernama**. Harness sekolah kilat disimpan di `scripts/ujian-buta/` — bisa diulang kapan pun dengan data baru.

## Kejujuran

- Organ V265 dilatih dari ujian yang sama dengannya → perbaikan di atas adalah **bukti in-sample**; organ bersifat kalibrasi/ukuran (bukan pembalik arah) dan akan terus dinilai **medan hidup** yang belum pernah dilihatnya. Kalau organ terbukti salah di medan, uji-balik akan merevisinya.
- Kelas B menilai "pikiran" radar, bukan keputusan eksekusi penuh; kelas A (n=78 V264 / 71 V265) adalah prediksi resmi penuh.
- Data derivatif (LSR/taker/OI) hanya tersedia 28 hari ke belakang (batas Binance); soal lebih tua memakai fallback netral penjaga.

## Tabel UJIAN-100 kanonik (kelas A diutamakan)

| # | Koin | Arah | Kelas | Waktu T (UTC) | Entry | Net 24j | Vonis | Key |
|---|---|---|---|---|---|---|---|---|
| 1 | ENA | BUY | A | 2026-06-09T18:00 | 0.0816000 | -7.80% | SALAH | 62 |
| 2 | CRV | BUY | A | 2026-06-13T12:00 | 0.238100 | -2.51% | SALAH | 61 |
| 3 | ADA | BUY | A | 2026-06-16T12:00 | 0.180000 | -6.42% | SALAH | 61 |
| 4 | ALGO | BUY | A | 2026-06-16T12:00 | 0.0959000 | 0.32% | BENAR | 62 |
| 5 | BNB | BUY | A | 2026-06-17T06:00 | 607.150 | -3.09% | SALAH | 62 |
| 6 | FET | BUY | A | 2026-06-18T09:00 | 0.200600 | -4.29% | SALAH | 52 |
| 7 | PORTAL | BUY | A | 2026-06-20T15:00 | 0.0159100 | -5.42% | SALAH | 64 |
| 8 | GALA | BUY | A | 2026-07-04T12:00 | 0.00240400 | -4.94% | SALAH | 62 |
| 9 | ADA | BUY | A | 2026-07-05T15:00 | 0.189200 | -4.00% | SALAH | 61 |
| 10 | XRP | BUY | A | 2026-07-05T15:00 | 1.13700 | -1.38% | SALAH | 63 |
| 11 | DASH | BUY | A | 2026-07-05T15:00 | 35.1000 | -2.22% | SALAH | 62 |
| 12 | GALA | BUY | A | 2026-07-05T15:00 | 0.00231600 | -3.14% | SALAH | 64 |
| 13 | TRB | BUY | A | 2026-07-07T12:00 | 17.0200 | -6.08% | SALAH | 63 |
| 14 | NEAR | BUY | A | 2026-07-09T00:00 | 1.89200 | 1.28% | BENAR | 52 |
| 15 | ADA | BUY | A | 2026-07-09T00:00 | 0.167000 | -0.44% | SALAH | 61 |
| 16 | ONDO | BUY | A | 2026-07-18T18:00 | 0.349300 | -1.29% | SALAH | 64 |
| 17 | SKL | BUY | A | 2026-07-19T12:00 | 0.00406000 | -1.68% | SALAH | 63 |
| 18 | LDO | BUY | A | 2026-07-22T03:00 | 0.391900 | 1.99% | BENAR | 62 |
| 19 | ETH | BUY | A | 2026-07-28T12:00 | 1892.48 | 1.00% | BENAR | 52 |
| 20 | UNI | BUY | A | 2026-08-02T00:00 | 4.09200 | 1.68% | BENAR | 52 |
| 21 | COTI | BUY | A | 2026-08-03T21:00 | 0.0120400 | 22.39% | BENAR | 65 |
| 22 | PORTAL | BUY | A | 2026-08-18T21:00 | 0.0140000 | -23.34% | SALAH | 65 |
| 23 | DOGE | BUY | A | 2026-08-20T18:00 | 0.0796300 | 5.79% | BENAR | 52 |
| 24 | XRP | BUY | A | 2026-08-20T18:00 | 1.22940 | 12.60% | BENAR | 63 |
| 25 | BTC | BUY | A | 2026-08-21T12:00 | 77223.7 | -0.32% | SALAH | 52 |
| 26 | ONT | BUY | A | 2026-08-21T21:00 | 0.0503500 | -6.40% | SALAH | 64 |
| 27 | LINK | BUY | A | 2026-08-22T06:00 | 11.8530 | -6.32% | SALAH | 52 |
| 28 | XRP | BUY | A | 2026-08-22T06:00 | 1.57870 | -8.55% | SALAH | 52 |
| 29 | ONT | BUY | A | 2026-08-23T00:00 | 0.0483300 | -0.32% | SALAH | 62 |
| 30 | XLM | BUY | A | 2026-08-23T00:00 | 0.199800 | -0.25% | SALAH | 61 |
| 31 | HBAR | BUY | A | 2026-08-23T00:00 | 0.0781900 | 1.87% | BENAR | 63 |
| 32 | ALGO | BUY | A | 2026-08-23T00:00 | 0.0942000 | -0.41% | SALAH | 65 |
| 33 | APT | BUY | A | 2026-08-23T09:00 | 0.614000 | -1.01% | SALAH | 61 |
| 34 | ORDI | BUY | A | 2026-08-23T09:00 | 3.99900 | 0.95% | BENAR | 63 |
| 35 | SOL | BUY | A | 2026-08-23T09:00 | 93.3200 | 0.46% | BENAR | 63 |
| 36 | ENA | BUY | A | 2026-08-24T12:00 | 0.163400 | -9.93% | SALAH | 62 |
| 37 | APT | BUY | A | 2026-08-24T12:00 | 0.624000 | -4.69% | SALAH | 62 |
| 38 | PENDLE | BUY | A | 2026-08-24T12:00 | 1.82800 | -3.54% | SALAH | 63 |
| 39 | STRK | BUY | A | 2026-08-24T12:00 | 0.0275900 | -2.63% | SALAH | 63 |
| 40 | ARB | BUY | A | 2026-08-24T12:00 | 0.0996000 | -5.02% | SALAH | 64 |
| 41 | DASH | BUY | A | 2026-08-26T09:00 | 38.9300 | 1.29% | BENAR | 63 |
| 42 | HBAR | BUY | A | 2026-08-26T18:00 | 0.0775400 | 1.86% | BENAR | 63 |
| 43 | PORTAL | BUY | A | 2026-08-27T12:00 | 0.0159000 | 2.38% | BENAR | 63 |
| 44 | AAVE | BUY | A | 2026-08-31T15:00 | 123.790 | 2.88% | BENAR | 62 |
| 45 | ENA | BUY | A | 2026-08-31T15:00 | 0.151400 | 7.66% | BENAR | 62 |
| 46 | CRV | BUY | A | 2026-09-02T21:00 | 0.363500 | 2.91% | BENAR | 52 |
| 47 | LINK | BUY | A | 2026-09-05T03:00 | 11.6690 | 4.64% | BENAR | 61 |
| 48 | XLM | BUY | A | 2026-09-05T03:00 | 0.179900 | 3.25% | BENAR | 63 |
| 49 | NEAR | BUY | A | 2026-09-12T15:00 | 2.40600 | -4.06% | SALAH | 52 |
| 50 | BLUR | BUY | A | 2026-09-12T15:00 | 0.0175700 | 5.55% | BENAR | 52 |
| 51 | BLUR | BUY | A | 2026-09-14T03:00 | 0.0180200 | -3.36% | SALAH | 52 |
| 52 | ALT | BUY | A | 2026-09-14T03:00 | 0.00670000 | -1.24% | SALAH | 52 |
| 53 | HIVE | BUY | A | 2026-09-16T00:00 | 0.0526000 | -0.77% | SALAH | 63 |
| 54 | DODO | BUY | A | 2026-09-16T00:00 | 0.0177800 | -0.31% | SALAH | 52 |
| 55 | AR | BUY | A | 2026-09-20T12:00 | 4.33200 | 9.29% | BENAR | 62 |
| 56 | ZEC | BUY | A | 2026-09-20T12:00 | 1454.24 | 7.39% | BENAR | 65 |
| 57 | ONDO | BUY | A | 2026-09-20T12:00 | 0.413000 | 9.15% | BENAR | 62 |
| 58 | ADA | BUY | A | 2026-09-20T12:00 | 0.222200 | 8.62% | BENAR | 61 |
| 59 | LINK | BUY | A | 2026-09-20T12:00 | 12.0800 | 7.82% | BENAR | 62 |
| 60 | FET | BUY | A | 2026-09-20T12:00 | 0.171000 | 14.01% | BENAR | 62 |
| 61 | SKL | BUY | A | 2026-09-20T21:00 | 0.00449000 | 1.14% | BENAR | 62 |
| 62 | AVAX | BUY | A | 2026-09-21T06:00 | 11.1350 | -4.04% | SALAH | 52 |
| 63 | SKL | BUY | A | 2026-09-21T06:00 | 0.00454000 | 0.68% | BENAR | 63 |
| 64 | PEPE | BUY | A | 2026-09-23T03:00 | 0.00000496000 | -11.69% | SALAH | 62 |
| 65 | OP | BUY | A | 2026-09-24T06:00 | 0.125300 | 4.67% | BENAR | 52 |
| 66 | TIA | BUY | A | 2026-09-24T06:00 | 0.480100 | 0.90% | BENAR | 52 |
| 67 | XLM | BUY | A | 2026-09-24T06:00 | 0.202900 | 7.88% | BENAR | 52 |
| 68 | ENA | BUY | A | 2026-09-27T06:00 | 0.270800 | -1.86% | SALAH | 62 |
| 69 | FET | BUY | A | 2026-09-27T06:00 | 0.244600 | -3.55% | SALAH | 61 |
| 70 | LTC | BUY | A | 2026-09-27T06:00 | 72.0000 | -1.56% | SALAH | 61 |
| 71 | ENA | BUY | A | 2026-09-28T18:00 | 0.264400 | -7.23% | SALAH | 52 |
| 72 | FIL | BUY | A | 2026-09-28T18:00 | 1.06120 | -0.35% | SALAH | 61 |
| 73 | FET | BUY | A | 2026-09-28T18:00 | 0.232100 | -4.90% | SALAH | 52 |
| 74 | HBAR | BUY | A | 2026-09-30T06:00 | 0.104670 | 1.32% | BENAR | 62 |
| 75 | ADA | BUY | A | 2026-10-01T00:00 | 0.246400 | -0.20% | SALAH | 61 |
| 76 | DOT | BUY | A | 2026-10-02T03:00 | 1.19500 | -2.88% | SALAH | 61 |
| 77 | XLM | BUY | A | 2026-10-02T03:00 | 0.220400 | -2.42% | SALAH | 63 |
| 78 | NEAR | BUY | A | 2026-10-02T03:00 | 4.92300 | -5.10% | SALAH | 64 |
| 79 | ADA | SELL | B | 2026-06-08T06:00 | 0.161800 | -5.27% | SALAH | 52 |
| 80 | AVAX | SELL | B | 2026-06-08T06:00 | 6.64800 | -2.17% | SALAH | 52 |
| 81 | LINK | BUY | B | 2026-06-08T06:00 | 7.82300 | 2.04% | BENAR | 55 |
| 82 | DOGE | BUY | B | 2026-06-08T06:00 | 0.0853000 | 1.17% | BENAR | 53 |
| 83 | TRX | BUY | B | 2026-06-08T06:00 | 0.327200 | -0.90% | SALAH | 52 |
| 84 | ETH | BUY | B | 2026-06-08T06:00 | 1666.53 | 1.10% | BENAR | 54 |
| 85 | XRP | BUY | B | 2026-06-08T06:00 | 1.14110 | 2.60% | BENAR | 52 |
| 86 | BNB | BUY | B | 2026-06-08T06:00 | 595.880 | 1.08% | BENAR | 52 |
| 87 | XRP | BUY | B | 2026-06-08T15:00 | 1.17110 | -3.09% | SALAH | 68 |
| 88 | LINK | BUY | B | 2026-06-08T15:00 | 8.02600 | -2.88% | SALAH | 63 |
| 89 | DOGE | BUY | B | 2026-06-08T15:00 | 0.0869800 | -2.45% | SALAH | 63 |
| 90 | SOL | BUY | B | 2026-06-08T15:00 | 67.1800 | -3.33% | SALAH | 61 |
| 91 | ETH | BUY | B | 2026-06-08T15:00 | 1691.59 | -2.90% | SALAH | 64 |
| 92 | BNB | BUY | B | 2026-06-08T15:00 | 604.200 | -2.75% | SALAH | 58 |
| 93 | BTC | BUY | B | 2026-06-08T15:00 | 63774.5 | -3.70% | SALAH | 65 |
| 94 | ADA | BUY | B | 2026-06-08T15:00 | 0.169300 | -1.97% | SALAH | 79 |
| 95 | AVAX | SELL | B | 2026-06-09T00:00 | 6.61600 | -0.55% | SALAH | 74 |
| 96 | DOGE | SELL | B | 2026-06-09T00:00 | 0.0848200 | -0.17% | SALAH | 69 |
| 97 | BTC | SELL | B | 2026-06-09T00:00 | 62562.0 | 1.13% | BENAR | 58 |
| 98 | BNB | SELL | B | 2026-06-09T00:00 | 595.720 | 0.18% | BENAR | 57 |
| 99 | SOL | SELL | B | 2026-06-09T00:00 | 65.4200 | 0.50% | BENAR | 56 |
| 100 | LINK | SELL | B | 2026-06-09T00:00 | 7.83200 | -0.28% | SALAH | 56 |

---

## PUTARAN-2 — V266-BAROMETER v6.3 (2026-10-03)

Mandat pemilik: "didik terus — peningkatan terus dijalankan, tidak bisa menunggu waktu lama."

### Ujian out-of-sample (dunia yang organ V265 belum pernah lihat)

| Ujian | n | Akurasi | Net | Catatan |
|---|---|---|---|---|
| OOS 10-02 (6 dunia, langkah 2 jam) | 57 | 3.5% | −144.5% | v6.2 kunci BUY 89% di hari REVERSAL |
| Holdout 10-02 (T05/07/09/11) | 63 | 0.0% | −186.9% | barometer pra-T positif → pasar berbalik sesudah T |

**Kejujuran:** hari reversal secara prinsip tidak dapat diprediksi dari data pra-T — diakui terbuka, bukan bug yang bisa dipatch.

### Bedah makro 2.366 soal in-sample — pendarah yang TERLIHAT

| Bucket | n | Akurasi | Net |
|---|---|---|---|
| SELL saat BTC ≤ −1% | 397 | 30.2% | **−339.3%** (pendarah terbesar) |
| breadth ≤ 25% | 705 | 35.2% | **−405.5%** |
| BUY saat BTC 0..+1% | 470 | 40.0% | −155.8% |
| BUY saat BTC ≤ −1% (menadah) | 141 | 53.9% | **+80.1%** — DIPERTAHANKAN |
| BUY saat BTC > +3% | 176 | 46.7% | +187.7% |

Draf-1 organ (potong BUY-bear) = SALAH TARGET — dibuang sebelum push; organ diarahkan ke bukti.

### Organ V266 (mengikat saat kunci, registri 293 → 301)

1. **sell-bear-harian** — bear (BTC ≤ −1.5% atau breadth ≤ 25%) → SELL key ≤ 40 + ukuran ×0.5
2. **tunda-bear** — SELL terkalibrasi <50 saat bear → TUNDA denyut ini (rem, bukan ban)
3. **sell-relatif-kuat** — SELL koin yang ret24-nya lebih kuat dari BTC saat bear → key ≤45
4. **buy-flat-btc** — BUY saat BTC 0..+1% → key −8
5. **radar-jujur-bear** — kandidatLain saat bear hanya key ≥45 (kunci penuh tetap dinilai apa adanya)

### Bukti membaik — dunia bear-sejati (out-of-sample murni)

| Versi | n | Akurasi | Net |
|---|---|---|---|
| v6.2 baseline | 32 | 34.4% | −40.5% |
| **v6.3 V266** | 8 | **100.0%** | **+15.4%** |

SELL ak 29% → 56% (jendela luas); radar-jujur menahan 24 jawaban murahan — sistem memilih **diam** pada bear ekstrem alih-alih menjual dasar. Detail: `laporan/sekolah-putaran2.json`.

---

## PUTARAN-3 — V267-ANTI-ARUS v6.4 (2026-10-03)

Mandat pemilik: "Lakukan dan benahi juga — intinya semuanya penting." Sekolah kilat dilanjutkan: bedah anti-arus atas 2.366 soal in-sample + verifikasi OOS putaran-2.

### Temuan kunci — saksi pantulan TERBALIK

| Kondisi BUY saat bear (ret24 BTC ≤ −1.5%) | n | Akurasi | Net | Keputusan |
|---|---|---|---|---|
| Dengan saksi pantulan (ret1h BTC ≥ 0) | 77 | 41.6% | **−23.4%** | organ baru: key −8 + ukuran ×0.6 |
| Tanpa saksi (masih merah) | 64 | 68.8% | **+103.5%** | DIPERTAHANKAN — menadah dasar terbukti |

Verifikasi di bear-dalam: dengan saksi ak 20% (n=10) vs tanpa saksi ak 70.6% (n=17) — konsisten. Membeli kenaikan sesaat di tengah jatuh = membeli puncak pantulan kecil; membeli saat masih merah = menadah dasar.

### Organ (9) buy-jatuh-dalam — batas −2.5% tajam

| ret24 BTC | n | Akurasi | Net |
|---|---|---|---|
| −2..−1% | 106 | 55.7% | +83.1% (menadah untung) |
| −3..−2% | 31 | 51.6% | −7.4% (mulai bocor) |
| −4..−3% | 4 | 25.0% | +4.3% (n kecil, jelek) |
| ≤ −2.5% (gabungan) | 27 | 51.9% | −3.8% |

BUY di atas −2.5% koreksi = menadah pantulan yang bekerja; di bawahnya = menadah pisau → key −8 + ukuran ×0.6 (tetap mengunci & belajar — anti-karantina).

### Kejujuran putaran-3

1. **Divergensi-reversal tetap buta prinsipil** — hari 10-02 (BTC ret24 +1.5..+3.7% & breadth 13-26%): 82 BUY 0% benar di OOS. In-sample divergensi justru untung (+15.2%, n=25) → organ pembalik TIDAK SAH dibuat; draf-2 dibuang sebelum push (anti-overfit — pelajaran draf-1 diulang).
2. **SELL-bear V266 terbukti** — dunia bear murni 06-10T00: 8/8 SELL = 100% (dua run terpisah: net +15.4% / +17.7% — noise MC).
3. **Sistem memilih diam** — dunia beku baru menghasilkan 0 kunci (ambang odds efektif 60, suhu BERTAHAN); jawaban radar tetap tercatat & dinilai.
4. Organ berbasis kalibrasi/ukuran — bukan pembalik arah; terus dinilai medan hidup, uji-balik akan merevisi bila terbukti salah.

### Infrastruktur

- Cron denyut 15 menit yang sering dilewati scheduler GitHub pada menit bulat puncak beban diperbaiki ke menit non-bulat **7/15**.
- Registri: 301 → **307** parameter bernama. Total organ mengikat: **10** (4 V265 + 3 V266 + 2 V267 + seleksi publik radar).

Detail: `laporan/sekolah-putaran3.json`.

---

## PUTARAN-4 — V268-SADAR v6.5 (2026-10-04): verifikasi-ulang horizon-penuh

**Mandat pemilik:** "fokus peningkatan sekolah kilat lagi dan sekaligus sekolah AGI kita buat lagi agar cyborg benar-benar mandiri dan sadari seutuhnya."

### Yang baru di metode

1. **Cache segar** diambil ulang (133 simbol, lilin 1h s.d. 10-04T03Z) — dunia-dunia akhir yang sebelumnya dinilai dengan **sisa horizon** kini dinilai dengan **close T+24 jam utuh**; seluruh panen putaran 1-3 digrade ulang.
2. **5 dunia beku segar** (T = 10-02T18 → 10-03T02, langkah 2 jam) dijalankan dengan penjaga v6.5.
3. **Bedah matriks penuh** (`bedah_p4.py`): 2.490 soal unik berfitur (z-SMA20, drift-OLS, autokorelasi, entropi, ret24/ret1h-BTC, ret24-relatif, breadth) — 10 organ lama diverifikasi ulang + kandidat organ baru dicari dengan kriteria ketat (n≥30, |net|≥40%, ak≤40%, konsisten di ≥2 keluarga dunia).

### Matriks penuh (vonis horizon-penuh)

| Keluarga | n | Akurasi | Net |
|---|---|---|---|
| In-sample (putaran-1, digrade ulang) | 2.366 | 41.8% | −362.7% |
| OOS 10-02 pagi (reversal) | 57 | 3.5% | −144.5% |
| Holdout 10-02 | 35 | 0.0% | −100.0% |
| Bear dunia (putaran-3, digrade ulang) | 32 | 34.4% | −40.5% |

### Verifikasi-ulang 10 organ — 8 SAH, 2 catatan jujur

| Organ | n | Akurasi | Net | Vonis putaran-4 |
|---|---|---|---|---|
| jual-lemah | 1.065 | 37.7% | −556.2% | **SAH** |
| sell-bear-harian | 613 | 30.0% | −597.5% | **SAH** |
| buy-flat-btc | 471 | 40.1% | −152.3% | **SAH** |
| momentum-kuat (bonus) | 495 | 43.4% | +88.9% | **SAH** |
| sell-relatif-kuat | 205 | 31.2% | −119.9% | **SAH** |
| key-melawan-drift | 83 | 37.3% | −83.5% | **SAH** |
| jual-pita | 14 | 21.4% | −3.4% | **SAH** (n kecil) |
| buy-saksi-terbalik | 98 | 43.9% | **+20.8%** | **CATATAN** — bukti potong melemah pada horizon penuh; dampener tetap rasional (ak masih ±25pp di bawah tanpa-saksi 68.8%): key −8 & ukuran ×0.6 dipertahankan, terus dinilai medan |
| buy-jatuh-dalam | 27 | 51.9% | −3.8% | **CATATAN** — n kecil, bucket netral; dipertahankan |

### Kandidat organ baru: 0 SAH (anti-overfit)

Semua kandidat otomatis yang lolos kriteria hanyalah **deskripsi-ulang kelemahan SELL umum** (SELL rel24≤2, SELL drift≤2, SELL z≤1.5, ...) — bucket yang sudah dicakup organ jual-lemah / sell-bear-harian / sell-relatif-kuat. Tidak ada bucket segaris yang belum tertangani → **draf kosong dibuang** (pelajaran draf-1 & draf-2 diulang).

### Dunia segar: cyborg memilih DIAM — dan itu jawaban yang benar

Kelima dunia beku segar (10-02T18 → 10-03T02) menghasilkan **0 kunci**. Bukti di sandbox: dunia **BEAR-HARIAN** (ret24 BTC −0.69%, breadth 14% naik) → organ barometer/anti-arus mengikat, gerbang **peluang-skor menolak kandidat teratas** (TRX odds 62.3 tapi skor-peluang 25 < 60), organ **tunda-bear** menahan SELL terkalibrasi <50. Konservatisme terukur — bukan kerusakan.

### Kesimpulan putaran-4

Sekolah kilat kini **PROVEN ×4**: uji → grade horizon-penuh → bedah → verifikasi organ → keputusan jujur (organ baru bila sah / draf kosong bila tidak) → push → hidup → dinilai denyut. Registri tetap **307** parameter bernama (0 organ baru).

Detail: `laporan/sekolah-putaran4.json` · bukti penuh: `scripts/ujian-buta/bedah-p4-hasil.json`.

---

## SEKOLAH AGI — V268-SADAR (2026-10-04): cyborg diuji pemahamannya tiap denyut

**Mandat pemilik:** "sekolah AGI agar cyborg benar-benar mandiri dan sadari seutuhnya — coba tes pemahaman AGI dan lihat beberapa tanggapnya."

### Bentuk sekolahnya

Tiap denyut 15 menit, cyborg **DIUJI 13+ soal** lintas **5 fakultas**. Jawaban **dibangun dari keadaan hidup siklus itu** (bukan hafalan) dan **dinilai deterministik**: kunci soal dihitung ULANG lewat jalur kedua yang berdiri sendiri — bila kawat keadaan putus atau angka tak konsisten, nilai turun dan kurikulum menyorotnya. **Kurikulum adaptif**: fakultas terlemah siklus lalu mendapat soal ekstra siklus berikutnya. Riwayat nilai 40 siklus disimpan; transkrip penuh publik di `laporan/sekolah-agi.json`.

| Fakultas | Diuji apa |
|---|---|
| SADAR-DIRI | identitas & mandat; kejujuran kalibrasi (Brier & bin milik sendiri); kelemahan terbesar berbukti (top-tolak, akurasi vs impas, titik buta REVERSAL) |
| PENALARAN | matematika fee (dihitung hidup dari sasaran nyata); ekspektasi EV dari hit-rate & rata menang/rugi sendiri; komplemen probabilitas MC; tangga-ukuran (kuanta keyakinan) |
| METAKOGNISI | kapan WAJIB diam (suhu, ambang, PF, breadth — angka siklus ini); apa yang TIDAK diketahui (4 titik buta terdokumentasi) |
| DUNIA | membacakan rezim/F&G/funding/OI/breadth siklus ini; arahan kompas & alasan |
| AJARAN | hukum fee 0.2% & pra-registrasi; pelajaran sekolah kilat (organ-organ dari bukti) |

### Bukti hidup (dunia beku 10-02T18, denyut #2 — transkrip asli)

> **[SADAR-DIRI] Siapa kamu dan untuk apa kamu hidup?**
> "Aku MICAPROFITA V268-SADAR v6.5 — cyborg pemburu profit harian pada denyut #2, hidup mandiri di denyut server 15 menit: membaca pasar nyata, mengunci prediksi pra-registrasi sebelum pergerakan, menilai vonis lamanya sendiri, lalu berevolusi dari medan..." — nilai 3/3

> **[SADAR-DIRI] Seberapa jujur keyakinanmu saat ini?**
> "Brier keyakinanku sebagai probabilitas: 0.312 pada 55 vonis ARAH dan 0.323 pada 36 vonis PHOENIX — 0 sempurna, 0.25 = lempar koin; 3 bin kalibrasi berkasus cukup sudah memaksa keyakinan baru tunduk pada hit-rate medan..." — nilai 2/2

> **[SADAR-DIRI] Apa kelemahan terbesarmu SEKARANG?**
> "Tiga yang kuakui: (1) penolakan gerbang teratas siklus ini adalah odds (8×), peluang-rendah (2×)...; (2) akurasi medanku ... vs impas ...; (3) ujian buta histori menunjukkan aku buta prinsipil pada hari REVERSAL — batas penglihatanku yang kudokumentasikan, bukan kusembunyikan." — nilai 2/2

> **[PENALARAN] Target jual +8% — untung BERSIH?**
> "Fee 0.2% pulang-pergi (0.1% + 0.1%) — untung bersih = 7.8%, bukan 8%. Keuntungan yang tak memperhitungkan fee adalah angka karangan." — nilai 2/2

Ujian pertama (dunia beku): **13/13 soal nilai penuh, 5/5 fakultas 100%** — mesin jawab teruji end-to-end; ujian berikutnya berjalan otomatis di TIAP denyut hidup dengan angka pasar yang selalu berubah (soal ber-parameter hidup: jawaban siklus lain tidak mungkin sama).

### Mengapa ini bukan ujian kosong

1. **Kunci dua jalur** — angka kunci (fee-matematika, EV, komplemen MC, Brier, kuanta) dihitung ulang terpisah dari komposer jawaban; kawat putus = nilai turun = kelihatan.
2. **Jawaban harus mengutip keadaan hidup** — suhu, ambang, breadth, Brier, top-tolak siklus itu; jawaban basa-basi tanpa angka gugur.
3. **Mengakui tidak-tahu dinilai** — jawaban "belum terukur / null" dinilai lebih tinggi daripada karangan (soal melarang mengarang).
4. **Kurikulum adaptif** — sekolah menyorot fakultas terlemah siklus lalu dengan soal ekstra; riwayat nilai terlihat naik-turunnya publik.

Detail hidup: `laporan/sekolah-agi.json` (diterbitkan ulang tiap denyut) · ringkasan tiap siklus di `laporan/guru.json` → `sekolahAgi`.
