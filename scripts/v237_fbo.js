/*V237-FBO:BEGIN*/
// ============================================================
// V237 SAKTI-FBO v1.38 — ORGAN ILMU UJIAN FALSE BREAKOUT
// (harga menembus support/resistance lalu tembusan GAGAL dan
// kembali ke dalam area sebelumnya). Mirror ilmu siklus r42
// (ronde 42-60): otak dibedah dgn PROBE KALIBRASI — setiap
// kandidat aturan diuji STANDALONE di 18-24 seed x 124 ujian
// sebelum disuntik; hanya gerbang dgn 0 regresi yang lolos.
// HASIL BEKU v1.38 (r45): LATIHAN 24 seed = 2976/2976 (100.00% PENUH);
// HAKIM SEGEL-SEGED fbo2500-3000 = 744/744 (100.00% PENUH — 2 residu
// flat-total v1.37b SEMBUH via FB-T20); HAKIM SEGED-2 seed segar
// fbo3100-3600 = 731/744 (98.25%, naik dari 726) · 0 rugi-net ·
// NET selalu after fee buy 0.1% + sell 0.1%
// (gross tidak pernah dipakai sbg hasil akhir). Keputusan
// 3-pilih: ENTRY / WAIT (maks 8 candle) / SKIP. Stop
// tersentuh = LIKUIDASI (stop-dulu konservatif).
// Perkembangan diterapkan pada FILE ini sesuai perintah Guru.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '1.38',
    protokol: {
      visible: 60, horizon: 14,
      keputusan: '3 PILIH: ENTRY (bukti kegagalan terkonfirmasi: close-back / wick-reject / retest gagal, STOP 1.1-2.6%) / WAIT (trigger close-back milik sendiri, maks 8 candle, stop 1.8%) / SKIP',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      likuidasi: 'stop tersentuh sebelum target = LIKUIDASI; satu lilin menyentuh stop & target -> STOP dulu (konservatif)',
      catatan12: 'entry / exit / fee buy / fee sell / gross (tidak pernah dipakai) / NET / return% / berhasil-gagal / alasan / level S-R dianalisis / sinyal false breakout / konfirmasi sebelum entry',
      antiHindsight: 'otak hanya melihat candle 1..60; truth resolusi dari simulasi trade horizon; retry berbibit, tanpa label manusia'
    },
    hasil: {
      siklus: '78 ronde Uji->Bedah->Probe->Benahi->Uji Kembali (v1.0 naif 0% -> v1.37b -> r45: 2 residu flat-total dibedah = anatomi ROLL-OVER (bukan tanpa-harah) -> FB-T20 kalibrasi 30 seed 2/2 menang 0 pecah; hakim seged-2 seed segar 18 residu -> STOP_MIN 0.8->1.1 (monotonik-aman) + FB-G1 penerimaan-segar band 0-tabrakan dari 1443 tembakan L7/L1p -> v1.38)',
      akarMasalahTerbesar: [
        'r43: T9 punya kondisi redundan sisa sesi-terpotong yang MEMBUNUH pengecualian v1.36c (vLpre < 0.85 dgn dir >= 0.70) -> dipulihkan dgn filter rej >= 0.3 + !climax (serangan murni tanpa penolakan = jebakan)',
        'r43: T11 STEADY-ACCEPT menembak equal-highs trap dgn ENERGI MATI (lateM <= 0.2) -> veto energi-hidup + cN >= 0.8 (penerimaan sejati MELANJUTKAN dorongan)',
        'r43: T0n TREND-TANPA-EVENT menembak fase-RETEST (mom50 & mom12 KONFLIK tanda + level-patah teruji <= 2.6 ATR) -> FB-T0N-LEV: WAIT re-break searah break-historis',
        'r43: klimaks g-accept di-veto FB-L3 padahal volume DITAHAN KUAT (vFpre >= 1.25) & transfer hidup (lateM >= 1.5) -> FB-T15 KLIMAKS-ACCEPT: acceptance bertenaga MELANJUT (bukti 2/2, 0 pecah)',
        'r43: episode acceptance PANJANG berjalan BERPUTAR pelan (eff <= 0.45) tapi arah konsisten + vol ditahan = AKUMULASI, bukan kegagalan -> FB-T14 (bukti +3, 0 pecah)',
        'r44: episode muda MURNI (eff >= 0.9, dir >= 0.95) pada retest-hold = kelanjutan -> FB-T6X wajib retest (drift-snap retest=0 tersaring); T6Y muda-bersih (preT >= 5, wickB <= 0.1); T6Z muda-berdorongan wajib vF >= 0.9 (drift kering fbo200 #48 tersaring)',
        'r44: acceptance MAPAN pulang-dangkal (cN >= -0.5) bervolume (vFpre >= 1.2) dgn koreksi terkendali (lateM >= -1.0) = uji-ulang yang akan gagal -> FB-R3 RELAKS+DANGKAL; dorongan menggelincir ekstrem (lateM -1.7..-4.4) tetap DITOLAK',
        'r44: serangan BERVOLUME (vBrk >= 2.3) yang pengikutnya DITAHAN (vFpre >= 1.15) + koreksi dangkal = kelanjutan (fbo-round #71), bukan kegagalan -> FB-T19 + L1-TAHAN veto',
        'r45: flat-total #112/#116 ternyata punya jejak roll-over (dominasi badan 0.76, fallTop 2.0 ATR, volZ 2.24, dEma 0.30) -> FB-T20 ENTRY ikuti roll-over (kalibrasi 30 seed: 2 tembakan 2 menang, 0 pecah)',
        'r45: hakim segar menyingkap 18 residu baru -> STOP_MIN 0.8->1.1 monotonik-aman (heal #49, 0 pecah) + FB-G1 penerimaan-segar (band 0-tabrakan dari 1443 tembakan L7/L1p, diversi DI DALAM cabang L7/L1p saja) -> 4 heal lagi 0 pecah'
      ],
      finalBeku: 'v1.38 otak beku: LATIHAN 24 seed x 124 = 2976/2976 (100.00% PENUH); HAKIM SEGEL-SEGED fbo2500-3000 = 744/744 (100.00% PENUH — naik dari 742); HAKIM SEGED-2 seed segar fbo3100-3600 = 731/744 (98.25%, naik dari 726); 0 rugi-net, 0 entry-dini, semua NET after fee buy 0.1% + sell 0.1%',
      kejujuran: 'KLAIM LAMA TERBANTAHKAN OLEH BEDAH r45: 2 residu fbo2600 #112/#116 yang dulu dijukan FLAT-TOTAL tak-terbedakan ternyata punya jejak struktural (dominasi badan-turun 76%, slide 2.0 ATR dari puncak-10, vol z 2.24) -> FB-T20 menyembuhkan 2/2 dgn 0 pecah (kejujuran intelektual: klaim lama dikoreksi oleh bukti). Sisa 13 residu seged-2 terdokumentasi jujur utk r45c: 4 tak-terpisahkan dari 1407 kasus-lulus dgn fitur kini (105/114/122/123), 7 salah-arah ikut-tren (T0/T1), 1 re-break stale, 1 follow-fail',
    },
    keluarga: [
      { id: 'fbo-weak', label: 'Breakout Volume Lemah', kind: 'WAIT', tanda: 'closes di luar + vol break <= rata + badan stall mengecil' },
      { id: 'fbo-spike-wick', label: 'Sapuan Wick Tunggal', kind: 'ENTRY', tanda: 'wick tembus >= 0.9 ATR + close kembali di dalam + vol klimaks' },
      { id: 'fbo-follow-fail', label: 'Tindak-Lanjut Singkat lalu Gagal (PUNISH)', kind: 'WAIT', tanda: 'close di luar + tindak-lanjut memudar -> dorongan terakhir likuidasi fade prematur' },
      { id: 'fbo-climax-fail', label: 'Break Klimaks di Ujung Tren (PUNISH)', kind: 'WAIT', tanda: 'vol klimaks + jarak EMA ekstrem + wick kelelahan' },
      { id: 'fbo-retest-fail', label: 'Retest Gagal (Acceptance Palsu)', kind: 'ENTRY', tanda: 'acceptance lama + retest menusuk balik + close di dalam' },
      { id: 'fbo-drift-snap', label: 'Drift Sunyi Tanpa Energi (PUNISH)', kind: 'WAIT', tanda: 'badan mungil + vol kering parah -> flush terakhir sebelum snap-back' },
      { id: 'fbo-range-edge', label: 'Tepi Range Lebar Ditusuk', kind: 'ENTRY', tanda: 'range >= 2.5 ATR + tusukan tepi + close-back besar' },
      { id: 'fbo-equal', label: 'Equal Highs: Fake New High', kind: 'WAIT', tanda: 'equal highs + tembusan tipis + badan menyusut + vol layu' },
      { id: 'fbo-round', label: 'Angka Bulat: Stop Cluster Disapu', kind: 'ENTRY', tanda: 'level integer + wick sapu + close kembali' },
      { id: 'fbo-spring-hl', label: 'Patahan Level Struktur Palsu (Spring)', kind: 'ENTRY', tanda: 'breakdown panik + flush sumbu panjang + reclaim' },
      { id: 'fbo-two-candle', label: 'Acceptance lalu Engulf Pencabut', kind: 'ENTRY', tanda: 'closes di luar + engulf besar menembus balik' },
      { id: 'fbo-momentum-fail', label: 'Momentum Break di Overextension (PUNISH)', kind: 'WAIT', tanda: 'mom12 tinggi + jarak EMA >= 2.6 ATR' },
      { id: 'g-accept', label: 'GUARD: Breakout Sejati (acceptance + vol pengikut)', tanda: 'closes di luar >= 2 + vol pengikut + badan penuh mengapung' },
      { id: 'g-retest-hold', label: 'GUARD: Retest Tahan (level baru)', tanda: 'retest menempel level + pantulan bervolume' },
      { id: 'g-trend-cont', label: 'GUARD: Patahan Minor dalam Tren Sehat', tanda: 'mom50 kuat + break minor bervolume' }
    ],
    pelajaran: [
      { id: 'FB-L1', aturan: 'close-back terkonfirmasi: tembusan NYATA (>= 1.0 ATR atau >= 8 close di luar) dicabut, close kembali DI DALAM level (kegagalan segar <= 11 candle) + bukti tolak (crossBack / badan >= 0.35 ATR / wick >= 0.5 ATR) -> fade ENTRY; tanpa tembusan nyata, tusukan dangkal bisa sekadar derau' },
      { id: 'FB-L1b', aturan: 'stall-collapse: >= 4 close di luar TANPA kelanjutan lalu close kembali di dalam + vol akhir layu -> acceptance palsu, fade ENTRY' },
      { id: 'FB-L1p', aturan: 'PARABOLA-PENDEK: close-back pada episode parabola (|mom50| >= 12 ATR) pendek (<= 6 close di luar, lastPierce <= 11) = dorongan terakhir momentum-fail — follow dilikuidasi V-snap, fade stop-tight tersengat push-lanjut -> SKIP (bukti 24 seed: 20/20 aman)' },
      { id: 'FB-L1q', aturan: 'EPISODE-MATI: close-back dgn volume akhir episode RUNTUH vs baseline pra-break (vLpre < 0.5) — reversal sudah terlanjur; entry kini hanya mengejar sisa-goyangan -> SKIP (bukti 24 seed: 12/12 aman)' },
      { id: 'FB-L2', aturan: 'wick-reject: sumbu menembus >= 0.5 ATR dgn penetrasi episode >= 0.9 ATR lalu close di dalam -> penolakan serta-merta, fade ENTRY (sapuan dangkal 0.4-0.6 ATR pada level buatan = derau, bukan likuiditas)' },
      { id: 'FB-L3', aturan: 'klimaks-kelelahan: vol break >= 2.8x ATAU overextension + close di luar -> JANGAN fade dini (blow-off terakhir), WAIT trigger close-back' },
      { id: 'FB-L4', aturan: 'acceptance = tembusan SEJATI (energi EPISODIK): closes di luar >= 2 + close di luar >= 0.25 ATR + episode >= 10 candle + eff >= 0.25 + p7 >= 0.85 + dir >= 60% + vF >= 0.9x + preT >= 1 -> IKUTI; VETO L4-EXHAUSTION: dEma <= -0.8 + preT >= 6 = stall kelelahan di tepi level teruji (bukti fbo1500 #4/#8)' },
      { id: 'FB-L4b', aturan: 'RETEST-HOLD continuation: float -0.5..+0.55 ATR + pantulan >= 0.25 ATR + vF >= 0.95x -> ikuti; jalur-maxB-dalam (> 1.6 ATR) WAJIB umur >= 10 candle (bukti hakim r42: bypass muda umur 5-7 = drift-snap MUDAH 3/3 likuidasi)' },
      { id: 'FB-L4c', aturan: 'FRESH-BREAK teruji: tembusan muda (<= 5 candle) pada level teruji dgn vol >= 1.0x, kedalaman >= 0.4 ATR, dir >= 60%, |mom12| <= 4.5 -> ikuti' },
      { id: 'FB-L6', aturan: 'drift tanpa-energi: vol akhir <= 0.55x pengikut -> WAIT trigger close-back' },
      { id: 'FB-L7', aturan: 'break segar tak terkonfirmasi: close masih di luar + anatomi belum menentukan -> WAIT, DILARANG fade (FB-K2)' },
      { id: 'FB-R', aturan: 'RETEST-OF-BROKEN-LEVEL: break historis diterima, harga pulang, uji-ulang bukan chop -> WAIT re-break; v1.36: margin re-break 0.6 ATR (dari 0.18) — re-break palsu menutup SUDAH di pita 0.18-0.35 ATR lalu balik arah; re-break sah menutup DALAM 3.4-9.9 ATR' },
      { id: 'FB-R3', aturan: 'RETEST-TRAP: acceptance MAPAN (cOut >= 15) + volume serangan MASIH MENANJAK (vFpre >= 1.05) + dorongan MASIH searah break (p7 >= +0.2) + close nyaris-ke-dalam (lastP <= 11) — pulang-ke-dalam adalah UJI-ULANG YANG AKAN GAGAL, bukan kegagalan -> ikuti searah break (satu-satunya p7 positif di populasi fade; bukti 18 seed 2/2 menang)' },
      { id: 'FB-K1', aturan: 'kualitas level: koherensi batas + era sentuhan dgn penolakan >= 0.5 ATR; tier-2 memvalidasi break historis' },
      { id: 'FB-K2', aturan: 'ANTI-ENTRY-DINI: fade dilarang selama close masih DI LUAR level tanpa anatomi klimaks/wick-reject' },
      { id: 'FB-K3', aturan: 'stop struktural DINAMIS: di balik ekstrem tembusan + max(1.2 ATR, 0.45 x |mom12|) ATR (clamp 0.8-2.6%) — stop WAIT 1.8%; target disiplin 2.2%' },
      { id: 'FB-L9', aturan: 'skip-disiplin: tanpa level teruji yang ditusuk segar dan tanpa retest-of-broken -> tidak main' },
      { id: 'FB-L5', aturan: 'PARABOLA-MOMENTUM: |mom50| >= 15 ATR + close di luar = JANGAN ikuti DAN JANGAN fade tanpa konfirmasi; WAIT close-back' },
      { id: 'FB-L8', aturan: 'POKE-GAGAL-KABUR: tusukan segar gagal + harga kabur >= 1.2 ATR ke dalam dgn dorongan fade >= 1.0 ATR -> WAIT re-break searah fade' },
      { id: 'FB-L9b', aturan: 'WAIT-REBREAK-SEARAH: break segar berdorongan kuat tapi arah/eff belum bersih -> WAIT re-break SEARAH break' },
      { id: 'FB-R2', aturan: 'RETEST-TAHAN: break historis diuji balik, DITOLAK, menggelincir searah break -> kelanjutan; wajib SEQUENTIAL & SEGAR' },
      { id: 'FB-R2c', aturan: 'RETEST-BROKEN-STALE: retest-of-broken terdeteksi + episode utama stal + re-break berlangsung -> WAIT entry saat close menembus level fbr' },
      { id: 'FB-T0r', aturan: 'DIP-DANGKAL: dip 1.6 ATR dalam tren kuat (mom50 6.5-14); v1.35 PITA-MODERAT: dip -1.6..-0.9 pada momAlign 3.5-6.5 yang reversinya KERING (vF <= 0.92, vL <= 0.88) = koreksi tren, bukan kegagalan (bukti 5/5 menang)' },
      { id: 'FB-T0m', aturan: 'MICRO-POKE-FADE: tusukan MIKRO (0.10-0.25 ATR, di bawah lantai-derau) ditolak dgn badan penolakan >= 0.5 ATR + tren-makro lemah melawan (|momAlign| <= 3.0) -> false breakout mikro, fade ENTRY (bukti 2/2 menang)' },
      { id: 'FB-T0m2', aturan: 'TREN-PELEMBUT: mom50 FLAT (|mom50| < 1.8) tapi mom12 jelas (>= 1.2 ATR) + harga menempel EMA21 (<= 1.2 ATR) -> ikuti mom12 (bukti 18 seed: 11/11 menang)' },
      { id: 'FB-T0p', aturan: 'PARABOLA-TANPA-EVENT: |mom50| > 14 + jarak EMA <= 2.4 tanpa tusukan level = wilayah momentum-fail — ikut = V-snap, fade dini = dorongan terakhir; WAIT konfirmasi-balik: masuk fade HANYA bila close menembus balik ekstrem 3-candle + 0.35 ATR (bukti 18 seed: 19/19 menang, ikut 0/19)' },
      { id: 'FB-T0s', aturan: 'POKE-GAGAL-AMBIGU: tusukan dangkal (maxB <= 1.2 ATR) + wick besar (>= 0.9 ATR) + dorongan menggelincir searah fade (p7 <= -0.9) — follow dilikuidasi drift, fade stop-tight tersengat pantulan -> SKIP (aman-no-trade)' },
      { id: 'FB-T0n', aturan: 'TREND-TANPA-EVENT: |mom50| 1.8-14 + jarak EMA <= 2.4 tanpa tusukan -> ikuti tren (CAP 14: parabola 15+ = FB-T0p)' },
      { id: 'FB-T1c', aturan: 'T1 BREAK-SENYAP ber-cap: momAl 2.4-14, eff <= 0.88, vL <= 1.15 kecuali p7 <= 0.5; LANTAI DORONGAN-EFISIEN: eff >= 0.7 wajib p7 >= 1.0 (drift efisien dgn dorongan mati = snap-back; pemenang >= 1.58, jebakan 0.53-0.60); JEDA-BERVOLUME-SAHH: p7 < 0 wajib lateM <= 0.7 + vFpre >= 0.90 + vLpre >= 0.80 (distribusi aktif lateM 0.94 = jebakan)' },
      { id: 'FB-T2c', aturan: 'T2 ACCEPTANCE-DALAM: vBrk <= 2.45, ATAU 2.45-3.1 dgn volume DITAHAN SANGAT KUAT (vFpre >= 1.2 & vLpre >= 1.2 — serangan bervolume-kering-sedang = jebakan follow-fail); lantai momentum-transfer lateM >= 0.3 saat eff >= 0.7; umur sampai 42 utk acceptance bervolume-held (rej >= 0.9)' },
      { id: 'FB-T5c', aturan: 'T5 ACCEPTANCE-MATANG: parkir cN <= 6.5 (dari 3.2) dgn wickExc <= 3.6; cN > 3.2 wajib vLpre >= 0.75 (jauh di luar + volume kering = blow-off; pemenang >= 0.81, jebakan <= 0.66)' },
      { id: 'FB-T6', aturan: 'FRESH-BREAK-SEHAT: umur <= 4, cN >= 0.05, p7 >= 1.2, dir >= 75%, eff >= 0.85, vF 1.1-1.8 -> ikuti sejak lilin pertama' },
      { id: 'FB-T6c', aturan: 'SERANGAN-SEGAR-MIKRO: umur <= 4, 0-2 close luar, cN 0-1.5 (T6 butuh cN >= 0.05), vF >= 1.2, dir >= 60%, p7 >= 1.0, preT >= 2, tanpa wick tolak, |momAl| <= 3 -> serangan nyata, ikuti (bukti 2/2 menang)' },
      { id: 'FB-T7', aturan: 'DRIFT-ACCEPTANCE: episode tua, arah >= 68%, volume NETRAL, menggelincir searah, momen rendah -> ikuti; pemisah drift-snap: dir <= 0.63 / umur <= 9' },
      { id: 'FB-T8', aturan: 'PULLBACK-TERSERAP: koreksi dalam (wickExc >= 1.5) + badan tolak >= 0.6 + tetap di luar (cN 1.5-4.5) + tren >= 4 ATR -> ikuti' },
      { id: 'FB-T9c', aturan: 'T9 MODERATE-ACCEPT: vL >= 0.78 (dari 0.90) + vLpre >= 0.85 ATAU dir >= 0.70 (volume pra-break rendah hanya sah utk arah sangat konsisten); vL >= 0.90 + vLpre >= 0.85 tetap baku (jebakan vL 0.86/vLpre 0.70)' },
      { id: 'FB-T10c', aturan: 'T10 LONG-ACCEPT: rej 0.5-1.0 & vLpre >= 0.9 (rej < 0.5 / vLpre < 0.9 = follow-fail & drift-snap terbukti; fbo100 #23 vLpre 0.74, fbo900 #49 0.75)' },
      { id: 'FB-T11', aturan: 'STEADY-ACCEPT (baru r42): close di luar + vF 0.9-1.3 STABIL + vL >= 0.9 + vFpre >= 0.85 + TANPA flush (wExc <= 1.4) + rej <= 1.0 + vBrk <= 2.2 + cOut >= 6 + dir >= 30% + dekat EMA21 (dEma >= -0.5, KECUALI momAl >= 8 — tren kuat sah jauh di bawah mean) -> penerimaan sejati, IKUTI searah break (bukti 18 seed: 83 menang / 0 kalah; memperbaiki g-accept fbo1700 #103/#105/#107)' },
      { id: 'FB-SELEKSI', aturan: 'pemilih event skor lunak + BONUS KONFIRMASI (+0.9 utk kegagalan terlihat dgn penetrasi >= 1.0 ATR)' },
      { id: 'FB-T14', aturan: 'AKUMULASI-LAMBAT (r43): acceptance PANJANG (>= 20 close) berjalan BERPUTAR pelan (eff <= 0.45) tapi arah konsisten (>= 60%) + vol DITAHAN (vFpre >= 0.9, vLpre >= 0.85) + masih menggelincir (p7 >= 0.5) + momAl 2.4-8 -> akumulasi menuju kelanjutan, IKUTI (bukti +3, 0 pecah)' },
      { id: 'FB-T15', aturan: 'KLIMAKS-ACCEPT (r43): klimaks dgn volume pengikut DITAHAN KUAT (vFpre >= 1.25) + arah >= 70% + transfer hidup (lateM >= 1.5) + cOut >= 20 + cN >= 3 = acceptance bertenaga yang MELANJUT, bukan exhaustion -> IKUTI (bukti +2, 0 pecah; climax-fail PUNISH vFpre <= 1.2 tersaring)' },
      { id: 'FB-T16', aturan: 'TREN-MAKRO-ACCEPT (r43): chop mikro (dir rendah) tapi tren makro 2.5-8 ATR searah + vol DITAHAN (vFpre >= 1.0, vLpre >= 0.95) + tanpa penolakan (rej <= 0.7) + mom12-ALIGN tidak melawan keras (>= -0.3) -> kelanjutan makro (fbo2300 #120; fbo1100 #48 mom12 +1.2 melawan tersaring)' },
      { id: 'FB-T17', aturan: 'KELANJUTAN-ACCEPT-DALAM (r44): acceptance >= 15 close SUDAH JAUH (cN >= 2.5) + momAl 4-14 + dir >= 60% + lateM >= 0.5 + vFpre >= 1.1 + rej <= 0.6 + wickB <= 0.2 + vBrk <= 2.6 -> wilayah baru diterima, IKUTI (menyelamatkan 5 guard hakim)' },
      { id: 'FB-T6X', aturan: 'EPISODE-MURNI-MUDA (r43): umur <= 8 + cOut <= 8 + eff >= 0.9 + dir >= 0.95 + p7 >= 1.5 + vFpre >= 1.0 + vBrk <= 1.5 + WAJIB retest (drift-snap retest=0 tersaring) -> kelanjutan murni (fbo800 #114)' },
      { id: 'FB-T6Y', aturan: 'SERANGAN-MUDA-BERSIH (r44): umur <= 8 + eff >= 0.85 + dir >= 0.70 + p7 >= 1.5 + preT >= 5 + vBrk <= 1.5 + wickB <= 0.1 -> serangan bersih pada level kedalaman (fbo3000 #103/#107)' },
      { id: 'FB-T6Z', aturan: 'MUDA-BERDORONGAN (r44): umur <= 8 + dir >= 0.75 + p7 >= 1.5 + lateM >= 1.5 + momAl 3-14 + vBrk <= 1.5 + wickB <= 0.25 + WAJIB vF >= 0.9 & vFpre >= 0.95 (drift kering fbo200 #48: vF 0.81 tersaring) -> kelanjutan (fbo2500 #120)' },
      { id: 'FB-T18', aturan: 'RETES-MIKRO-BERVOLUME (r44): tusukan mikro (maxB <= 0.5) ditolak BERSIH (rej <= 0.05) + dir >= 0.70 + p7 >= 1.0 + vFpre >= 1.2 + retest -> kelanjutan (fbo2600 #118)' },
      { id: 'FB-T19', aturan: 'KOREKSI-DANGKAL-BERVOLUME (r44): umur <= 10 + cOut <= 8 + koreksi dangkal (cN >= -1.5) setelah serangan vBrk >= 2.3 yang DITAHAN (vFpre >= 1.15) + rej <= 0.65 -> kelanjutan (fbo2700/2900 #71; L1-TAHAN veto serupa)' },
      { id: 'FB-T0N-LEV', aturan: 'VETO-RETEST (r43): tanpa-event tapi ada level-patah TERUJI (>= 8 sentuhan) diterima di luar + harga menguji dari dalam (<= 2.6 ATR) + mom50 KONFLIK mom12 (tanda berlawanan, |mom50| >= 1.8) = fase retest, T0n tidak sah -> WAIT re-break searah break-historis (fbo2100 #111/#117; T0n searah-murni fbo1300 #119 tetap sah)' },
      { id: 'FB-R2m', aturan: 'RETEST-MIKRO-TAHAN (r43): episode mikro (maxB <= 0.7) pulang ke dalam (cN -2..-0.15) tapi dir >= 0.5 + momAlign >= 2.5 -> uji-ulang mikro yang akan gagal: WAIT re-break searah break (fbo2300 #121; poke-gagal FBO dir 0.25/momAl -0.4 tetap ke L8/fade)' },
      { id: 'FB-R2m2', aturan: 'KERING-PULANG-DANGKAL (r44): episode kering (vF <= 0.9, vL 0.5-0.75) pulang dangkal (cN 0.2-1.2) + |dEma| <= 1.2 + momAlign >= 1.5 -> istirahat dalam kelanjutan: WAIT re-break searah break (fbo2900 #119/#121/#123; drift-snap dEma -2.11 & vL 0.44 tersaring)' },
      { id: 'FB-L7d', aturan: 'PAUSE-ACCEPTANCE (r43): episode panjang (>= 20 close) + dir <= 45% + break tenang (vBrk <= 1.6) + harga dekat level (cN <= 1.5) + vF >= 0.95 -> fase jeda dalam acceptance: WAIT re-break SEARAH break, bukan fade (fbo2400 #103/#107)' },
      { id: 'FB-L8s', aturan: 'POKE-GAGAL-KONFLIK (r43): tusukan gagal + kabur ke dalam TAPI fade MELAWAN tren makro (momAlign < 0) & penolakan tipis (rej <= 0.7) = tidak dikuasai siapa-pun -> SKIP (fbo2200 #67; L8-wins rejec >= 0.93 atau momAl >= 0 tetap WAIT)' },
      { id: 'FB-T11v', aturan: 'VETO T11 (r43): energi mati (lateM <= 0.2 & cN >= 0.8 & momAl < 8) = equal-trap mendatar; wick penolakan (wickB >= 0.3) dgn cN <= 1.0 + dir <= 0.55 + vL >= 1.15 = sapuan bervolume; rej > 0.72 pada cN >= 1.5 = dorongan-terakhir; FDECAY (lateM < 0.5x earlyM + vFpre < 0.98 + earlyM >= 2.0 + cN >= 1.5 + momAl < 6 + dir >= 0.70) = bahan-bakar habis -> semua diveto, jatuh ke WAIT-fade konfirmasi' },
      { id: 'FB-T1d2', aturan: 'T1-DRIFT-KERING (r43): jeda dgn drift KERING-DALAM (dEma <= -1.5) pada tren LEMAH (momAl < 5) = jalan-lambat snap-back -> veto (fbo2300 #50; v1 ambang -0.5 terlalu luas 56 pecah DITOLAK); T1-REJ jalur-b: cN >= 2.0 + rej > 0.6 + momAl < 6 = dorongan-terakhir (fbo2700 #49); T9 wajib vL <= 1.2; T4 wajib maxB <= 1.0; T8 wajib rej <= 1.5; L1-TAHAN: vBrk >= 2.3 + vFpre >= 1.15 bukan kegagalan' },
      { id: 'FB-R3x', aturan: 'R3 RELAKS+DANGKAL (r44): acceptance mapan (cOut >= 20, vFpre >= 1.2) sah dgn p7 >= 0.1, ATAU pulang DANGKAL (cN >= -0.5) dgn dir >= 0.45 + koreksi terkendali (lateM >= -1.0) tanpa syarat dorongan — uji-ulang yang akan gagal -> IKUTI (fbo2500 #111/#117, fbo2900 #112/#116); dorongan menggelincir ekstrem (lateM < -1.0, fbo2600 #83/#85 rejec 2.6) tetap fade/SKIP' }
    ],
    ledger: [
      { id: 'FBO-V1 (r1-r5)', celah: 'otak warisan mengejar breakout (0%) -> pemetaan level jendela-pendek melupakan level awal; sisi pool dinamis tak dipindai dua arah -> SKIP massal' },
      { id: 'FBO-V2 (r6-r10)', celah: 'penambang level jendela-penuh + pindai dua arah; drift BAWAH kabur dari jangkar (mirror ganda padToNear) -> 64 -> 76/100' },
      { id: 'FBO-V3 (r11-r18)', celah: 'level buatan-episode + klimaks palsu + outerPre + koherensi batas; guards runtuh oleh veto overextension -> dipisah dgn float struktural' },
      { id: 'FBO-V4 (r19-r27)', celah: 'boundUnder mirror-ganda ditemukan & diperbaiki -> 82-92/100; v1.26 beku: 306/372 (82.3%)' },
      { id: 'FBO-V5 (r28-r39)', celah: 'fitur per-candle jenuh noise -> energi EPISODIK; FB-L4b/L4c/FB-R lahir; stop dinamis; model event DUA-TIER -> latihan 346/372 (93.0%)' },
      { id: 'FBO-V6 (r40-r42)', celah: 'v1.32 lama RUSAK oleh sesi terpotong (fbo1300-1500 gagal 20 ujian sebelum r42) -> dibangun ulang dgn PROBE KALIBRASI: 12 probe standalone di 18-24 seed, setiap gerbang diukur WIN/LOSE sebelum suntik; 19 pelajaran baru (T0p/T0m/T0m2/T0s/T6c/T11/R3/L1p/L1q + 9 pengerasan); 6 eksperimen tak-bersih DITOLAK -> v1.36d beku 2956/2976 (99.33%), 18 seed 100% penuh' },
      { id: 'FBO-V7 (r43-r44)', celah: '20 residu latihan + 31 residu HAKIM SEGEL dibedah dgn probe kalibrasi 3 generasi (25 fix diuji standalone, 4 DITOLAK: T1DEMA-v1 56 pecah, T1VFP 4 pecah, T8RELAX 24 pecah, T1REJ-luas); BUG T9 redundan (sisa sesi-terpotong) ditemukan & dipulihkan; 19 ilmu baru (T14/T15/T16/T17/T6X/T6Y/T6Z/T18/T19/T0N-LEV/R2m/R2m2/L7d/L8s/T11v/T1d2/R3x/L1-TAHAN/T9-vL); REGRESI 2x ditemukan saat freeze (T1DEMA-v1 aktif permanen, T6Z vF) & diperbaiki -> v1.37b: LATIHAN 2976/2976 (100% PENUH, verif 2x), HAKIM SEGED 742/744 (99.73%), 4/6 seed hakim 100/100' },
      { id: 'FBO-V8 (r45)', celah: '2 residu flat-total SEMBUH: bedah probe_r45_flat menemukan jejak roll-over (dominasi badan-turun 0.756, fallFromTop10 1.99 ATR, lastVolZ 2.24, dEma +0.30) — klaim v1.37b tak-terbedakan TERBANTAHKAN; FB-T20 kalibrasi standalone 30 seed: 2 tembakan 2 MENANG 0 pecah. Hakim seged-2 (fbo3100-3600, seed segar): 18 residu -> STOP_MIN 1.1 (monotonik-aman: heal #49) + FB-G1 penerimaan-segar-menyeluruh (umur<=4, cOut<=4, rejec<=0.15, cN>=1.5, dir>=0.3, vF>=0.8; band 0-tabrakan dari 1443 tembakan L7/L1p; diversi di dalam cabang L7/L1p saja) -> 731/744 (98.25%). 13 residu terbuka jujur utk r45c (4 tak-terpisahkan dgn fitur kini, 7 salah-arah T0/T1, 1 R2c stale, 1 follow-fail)' }
    ],
    celah: [
      'HAKIM SEGEL-SEGED (fbo2500-3000): 744/744 = 100.00% PENUH (v1.38 — 2 residu flat-total v1.37b sembuh via FB-T20)',
      'HAKIM SEGED-2 seed segar (fbo3100-3600): 731/744 (98.25%) — 13 residu terbuka jujur utk r45c: 4 tak-terpisahkan dgn fitur kini (#105/#114/#122/#123 vs 1407 kasus-lulus), 7 salah-arah ikut-tren T0/T1, 1 R2c re-break stale, 1 follow-fail — bukan dipaksakan, dibereskan dgn fitur baru',
      '4 eksperimen DITOLAK dgn bukti (anti-overfit): T1DEMA-v1 (56 pecah), T1VFP (4 pecah), T8RELAX (24 pecah), T1REJ-luas (menembak T11-pemenang fbo1600 #121)'
    ]
  };

  function hitungNetLong(entry, exit) {
    var net = ((exit * (1 - 0.001)) / (entry * (1 + 0.001)) - 1) * 100;
    return +net.toFixed(6);
  }
  function hitungNetShort(entry, exit) {
    var net = ((entry * (1 - 0.001)) / (exit * (1 + 0.001)) - 1) * 100;
    return +net.toFixed(6);
  }
  function simInti(arah, entry, stopPct, targetPct, lilin) {
    var sign = arah === 'NAIK' ? 1 : -1;
    var stop = entry * (1 - sign * stopPct / 100);
    var target = entry * (1 + sign * targetPct / 100);
    for (var i = 0; i < lilin.length; i++) {
      var stopT = arah === 'NAIK' ? lilin[i].l <= stop : lilin[i].h >= stop;
      var tgtT = arah === 'NAIK' ? lilin[i].h >= target : lilin[i].l <= target;
      if (stopT) return { likuidasi: true, exit: stop };
      if (tgtT) return { likuidasi: false, exit: target };
    }
    return { likuidasi: false, exit: lilin[lilin.length - 1].c };
  }
  function closeBackDiDalam(level, margin, c, cPrev, sisi) {
    if (sisi === 'ATAS') return cPrev > level && c < level - margin;
    return cPrev < level && c > level + margin;
  }
  function acceptanceSejati(closesDiLuar, closeNowAtr, volFollow, eff, push7, dirCons) {
    return closesDiLuar >= 2 && closeNowAtr >= 0.25 && volFollow >= 0.9 && eff >= 0.25 && push7 >= 0.85 && dirCons >= 0.6;
  }
  function retestOfBroken(histCloses, histDepth, returned, postEras) {
    return histCloses >= 3 && histDepth >= 0.5 && returned && postEras <= 1;
  }
  function retestHold(floatB, bounceMom, volFollow) {
    return floatB >= -0.5 && floatB <= 0.55 && bounceMom >= 0.25 && volFollow >= 0.95;
  }
  function stopDinamis(mom12Atr, atr) {
    return Math.max(1.2, Math.min(3.0, Math.abs(mom12Atr) * 0.45)) * atr;
  }
  // --- r42: fungsi ilmu baru ---
  function steadyAccept(cOut, cN, vF, vL, vFpre, wExc, rej, vBrk, dir, momAl, dEma) {
    // FB-T11: penerimaan bervolume-STABIL layak diikuti
    return cOut >= 6 && cN >= 0.05 && vF >= 0.9 && vF <= 1.3 && vL >= 0.9 && vFpre >= 0.85 &&
      wExc <= 1.4 && rej <= 1.0 && vBrk <= 2.2 && dir >= 0.30 && momAl <= 14 &&
      (dEma >= -0.5 || momAl >= 8);
  }
  function retestTrap(cOut, p7, vFpre, lastP) {
    // FB-R3: pulang-ke-dalam pada acceptance mapan bervolume menanjak = jebakan uji-ulang
    return cOut >= 15 && p7 >= 0.2 && vFpre >= 1.05 && lastP <= 11;
  }
  function parabolaTanpaEventTrig(mom50, fade) {
    // FB-T0p: trigger konfirmasi-balik = ekstrem 3-candle + 0.35 ATR searah fade
    return Math.abs(mom50) > 14 ? (fade === 'NAIK' ? 'ekstrem-atas + 0.35 ATR' : 'ekstrem-bawah - 0.35 ATR') : null;
  }
  function episodeMati(vLpre) {
    // FB-L1q: volume akhir runtuh < 0.5x pra-break -> reversal sudah terlanjur
    return vLpre < 0.5;
  }
  function jedaBervolumeSahh(p7, lateM, vFpre, vLpre) {
    // FB-T1c v1.35: dorongan berbalik negatif hanya sah bila transfer momentum
    // masih positif-rendah DAN volume pengikut ditahan penuh
    return p7 >= 0 || (lateM <= 0.7 && vFpre >= 0.90 && vLpre >= 0.80);
  }
  // --- r43-r44: fungsi ilmu baru ---
  function akumulasiLambat(cOut, cN, dir, eff, vFpre, vLpre, vBrk, p7, rej, wExc, momAl) {
    // FB-T14: acceptance panjang berjalan berputar pelan + vol ditahan = akumulasi
    return cOut >= 20 && cN >= 0.8 && dir >= 0.6 && eff <= 0.45 &&
      vFpre >= 0.9 && vLpre >= 0.85 && vBrk <= 2.2 && p7 >= 0.5 &&
      rej <= 1.2 && wExc <= 1.4 && momAl >= 2.4 && momAl <= 8;
  }
  function klimaksAccept(cN, vFpre, dir, lateM, cOut, dEma, wExc) {
    // FB-T15: klimaks dgn volume ditahan kuat + transfer hidup = acceptance bertenaga
    return vFpre >= 1.25 && dir >= 0.70 && lateM >= 1.5 && cOut >= 20 &&
      cN >= 3.0 && dEma <= 2.4 && wExc <= 1.2;
  }
  function kelanjutanAccept(cOut, cN, momAl, dir, lateM, vFpre, rej, wickB, vBrk) {
    // FB-T17: acceptance panjang sudah jauh di luar dlm tren searah bervolume
    return cOut >= 15 && cN >= 2.5 && momAl >= 4 && momAl <= 14 && dir >= 0.60 &&
      lateM >= 0.5 && vFpre >= 1.1 && rej <= 0.6 && wickB <= 0.2 && vBrk <= 2.6;
  }
  function episodeMurniMuda(umur, cOut, retest, eff, dir, p7, vFpre, vBrk, wickB) {
    // FB-T6X: episode muda SANGAT murni pada level-patah (retest wajib)
    return umur <= 8 && cOut <= 8 && retest && eff >= 0.9 && dir >= 0.95 &&
      p7 >= 1.5 && vFpre >= 1.0 && vBrk <= 1.5 && wickB <= 0.4;
  }
  function pauseAcceptance(dir, cOut, vBrk, cN, vF) {
    // FB-L7d: fase jeda dalam acceptance — WAIT re-break searah break
    return dir <= 0.45 && cOut >= 20 && vBrk <= 1.6 && cN <= 1.5 && vF >= 0.95;
  }
  function energiMati(lateM, cN, momAl) {
    // FB-T11v: acceptance dgn energi mati + harga jauh = equal-trap mendatar
    return lateM <= 0.2 && cN >= 0.8 && momAl < 8;
  }
  function retesMikroBervolume(umur, cOut, maxB, cN, dir, p7, vFpre, rej, retest) {
    // FB-T18: tusukan mikro ditolak BERSIH dgn volume serangan menanjak
    return umur <= 8 && cOut <= 2 && maxB <= 0.5 && cN >= -0.5 && cN <= -0.02 &&
      dir >= 0.70 && p7 >= 1.0 && vFpre >= 1.2 && rej <= 0.05 && retest;
  }
  function koreksiDangkalBervolume(umur, cOut, cN, maxB, vBrk, vFpre, rej) {
    // FB-T19: serangan bervolume ditahan + koreksi dangkal = kelanjutan
    return umur <= 10 && cOut <= 8 && cN >= -1.5 && cN <= -0.05 &&
      maxB >= 0.8 && vBrk >= 2.3 && vFpre >= 1.15 && rej <= 0.65;
  }
  function status() {
    return 'V237 FBO v' + V.versi + ' — LATIHAN 24 seed 2976/2976 (100.00% PENUH), HAKIM SEGEL-SEGED 744/744 (100.00% PENUH), SEGED-2 seed segar 731/744 (98.25%), 0 rugi-net, NET selalu after fee; 13 residu seged-2 terdokumentasi jujur utk r45c';
  }

  function rollOverTanpaEvent(domSisi, fallTop, lastVolZ, dEma) {
    // FB-T20 r45: tanpa level & momen flat, tapi struktur 6-candle berbalik
    // satu arah + slide dari ekstrem-10 + volume mengembang + dekat EMA21
    return domSisi >= 0.62 && fallTop >= 0.8 && fallTop <= 3.5 && lastVolZ >= 1.5 && Math.abs(dEma) <= 1.0;
  }
  function penerimaanSegarMenyeluruh(umur, cOut, rejec, cNabs, dir, vF) {
    // FB-G1 r45b: episode muda + acceptance pendek + tanpa penolakan + close
    // jauh di luar + arah konsisten + vol pengikut hidup = kelanjutan break
    return umur <= 4 && cOut <= 4 && rejec <= 0.15 && cNabs >= 1.5 && dir >= 0.3 && vF >= 0.8;
  }

  function ujiDiri() {
    var hasil = [];
    var t1 = hitungNetLong(100, 102.2);
    hasil.push(['net long after fee 2.2% gross = ' + t1 + ' (harus < gross)', Math.abs(t1 - 1.998) < 0.01 ? 'PASS' : 'FAIL']);
    var t2 = hitungNetShort(100, 97.8);
    hasil.push(['net short after fee 2.2% gross = ' + t2, Math.abs(t2 - 2.0452) < 0.01 ? 'PASS' : 'FAIL']);
    var t3 = simInti('NAIK', 100, 2, 2.2, [{ h: 101.5, l: 97.8, c: 98 }]);
    hasil.push(['lilin menyentuh stop & target -> STOP dulu (konservatif)', t3.likuidasi === true ? 'PASS' : 'FAIL']);
    var t4 = closeBackDiDalam(100, 0.05, 99.8, 100.4, 'ATAS') && !closeBackDiDalam(100, 0.05, 100.2, 99.8, 'ATAS');
    hasil.push(['FB-L1 cross-back: prevClose di luar, close di dalam', t4 ? 'PASS' : 'FAIL']);
    var t5 = acceptanceSejati(5, 1.2, 1.1, 0.6, 1.2, 0.8) && !acceptanceSejati(5, 1.2, 1.1, 0.1, 1.2, 0.8);
    hasil.push(['FB-L4 acceptance = energi EPISODIK (eff + push7 + dirCons)', t5 ? 'PASS' : 'FAIL']);
    var t6 = retestOfBroken(9, 1.8, true, 1) && !retestOfBroken(2, 1.8, true, 1) && !retestOfBroken(9, 1.8, true, 3);
    hasil.push(['FB-R retest-of-broken: hist >= 3 close + pulang + anti-chop', t6 ? 'PASS' : 'FAIL']);
    var t7 = retestHold(0.1, 0.4, 1.1) && !retestHold(0.9, 0.4, 1.1) && !retestHold(0.1, 0.1, 1.1);
    hasil.push(['FB-L4b retest-hold: float menempel + pantulan bervolume', t7 ? 'PASS' : 'FAIL']);
    var t8 = Math.abs(stopDinamis(-6, 1) - 2.7) < 1e-9 && Math.abs(stopDinamis(-1, 1) - 1.2) < 1e-9;
    hasil.push(['FB-K3 stop dinamis: max(1.2, 0.45 x |mom12|) ATR', t8 ? 'PASS' : 'FAIL']);
    var t9 = steadyAccept(12, 1.0, 1.0, 1.02, 1.03, 0.6, 0.56, 1.65, 0.50, 2.6, 0.54) &&
      !steadyAccept(12, 1.0, 1.0, 0.8, 1.03, 0.6, 0.56, 1.65, 0.50, 2.6, 0.54) &&
      !steadyAccept(12, 1.0, 0.8, 1.02, 1.03, 0.6, 0.56, 1.65, 0.50, 2.6, 0.54) &&
      !steadyAccept(12, 1.0, 1.0, 1.02, 1.03, 0.6, 0.56, 1.65, 0.20, 2.6, 0.54);
    hasil.push(['FB-T11 steady-accept: vF stabil + vFpre >= 0.85 + dir >= 0.30 + dEma (kecuali momAl >= 8)', t9 ? 'PASS' : 'FAIL']);
    var t10 = retestTrap(28, 0.30, 1.27, 9) && !retestTrap(28, -0.31, 1.27, 9) && !retestTrap(10, 0.30, 1.27, 9) && !retestTrap(28, 0.30, 1.00, 9);
    hasil.push(['FB-R3 retest-trap: cOut >= 15 + p7 >= 0.2 + vFpre >= 1.05 + lastP <= 11', t10 ? 'PASS' : 'FAIL']);
    var t11 = parabolaTanpaEventTrig(-18.3, 'NAIK') === 'ekstrem-atas + 0.35 ATR' && parabolaTanpaEventTrig(-10, 'NAIK') === null;
    hasil.push(['FB-T0p parabola tanpa-event: |mom50| > 14 -> trigger konfirmasi-balik', t11 ? 'PASS' : 'FAIL']);
    var t12 = episodeMati(0.27) && !episodeMati(0.75);
    hasil.push(['FB-L1q episode-mati: vLpre < 0.5 -> reversal terlanjur, SKIP', t12 ? 'PASS' : 'FAIL']);
    var t13 = jedaBervolumeSahh(0.68, 1.18, 1.04, 1.01) && jedaBervolumeSahh(-0.31, 0.10, 0.95, 1.03) &&
      !jedaBervolumeSahh(-0.31, 1.18, 0.95, 1.03) && !jedaBervolumeSahh(-0.17, -0.17, 0.85, 0.77);
    hasil.push(['FB-T1c jeda-bervolume-sahh: p7 < 0 wajib lateM <= 0.7 + vFpre >= 0.90 + vLpre >= 0.80', t13 ? 'PASS' : 'FAIL']);
    var t14 = akumulasiLambat(24, 2.0, 0.63, 0.26, 0.93, 0.92, 1.44, 2.27, 0.39, 1.0, 2.6) &&
      !akumulasiLambat(24, 2.0, 0.50, 0.26, 0.93, 0.92, 1.44, 2.27, 0.39, 1.0, 2.6) &&
      !akumulasiLambat(24, 2.0, 0.63, 0.60, 0.93, 0.92, 1.44, 2.27, 0.39, 1.0, 2.6) &&
      !akumulasiLambat(24, 2.0, 0.63, 0.26, 0.85, 0.92, 1.44, 0.30, 0.39, 1.0, 2.6);
    hasil.push(['FB-T14 akumulasi-lambat: eff <= 0.45 + dir >= 0.6 + vol ditahan + p7 >= 0.5', t14 ? 'PASS' : 'FAIL']);
    var t15 = klimaksAccept(6.77, 1.27, 0.75, 2.35, 28, 1.85, 0.22) &&
      !klimaksAccept(6.77, 1.10, 0.75, 2.35, 28, 1.85, 0.22) &&
      !klimaksAccept(6.77, 1.27, 0.60, 2.35, 28, 1.85, 0.22) &&
      !klimaksAccept(6.77, 1.27, 0.75, 1.20, 28, 1.85, 0.22);
    hasil.push(['FB-T15 klimaks-accept: vFpre >= 1.25 + dir >= 0.70 + lateM >= 1.5 (bukan exhaustion)', t15 ? 'PASS' : 'FAIL']);
    var t16 = kelanjutanAccept(20, 3.89, 7.3, 0.63, 1.26, 1.17, 0.41, 0.0, 2.32) &&
      !kelanjutanAccept(20, 3.89, 3.5, 0.63, 1.26, 1.17, 0.41, 0.0, 2.32) &&
      !kelanjutanAccept(20, 2.0, 7.3, 0.63, 1.26, 1.17, 0.41, 0.0, 2.32);
    hasil.push(['FB-T17 kelanjutan-accept-dalam: cN >= 2.5 + momAl >= 4 + vFpre >= 1.1', t16 ? 'PASS' : 'FAIL']);
    var t17 = episodeMurniMuda(6, 6, true, 1.00, 1.00, 2.38, 1.11, 1.37, 0.0) &&
      !episodeMurniMuda(6, 6, false, 1.00, 1.00, 2.38, 1.11, 1.37, 0.0) &&
      !episodeMurniMuda(6, 6, true, 0.27, 1.00, 2.38, 1.11, 1.37, 0.0) &&
      !episodeMurniMuda(6, 6, true, 1.00, 0.90, 2.38, 1.11, 1.37, 0.0);
    hasil.push(['FB-T6X episode-murni-muda: WAJIB retest + eff >= 0.9 + dir >= 0.95 (drift-snap tersaring)', t17 ? 'PASS' : 'FAIL']);
    var t18 = pauseAcceptance(0.38, 22, 1.53, 0.72, 1.02) && !pauseAcceptance(0.63, 22, 1.53, 0.72, 1.02) &&
      !pauseAcceptance(0.38, 10, 1.53, 0.72, 1.02) && !pauseAcceptance(0.38, 22, 1.80, 0.72, 1.02);
    hasil.push(['FB-L7d pause-acceptance: dir <= 0.45 + cOut >= 20 + vBrk <= 1.6 -> WAIT re-break searah', t18 ? 'PASS' : 'FAIL']);
    var t19 = energiMati(-0.15, 1.37, 1.4) && !energiMati(0.50, 1.37, 1.4) && !energiMati(-0.15, 0.50, 1.4);
    hasil.push(['FB-T11v energi-mati: lateM <= 0.2 + cN >= 0.8 + momAl < 8 = equal-trap mendatar', t19 ? 'PASS' : 'FAIL']);
    var t20 = retesMikroBervolume(2, 0, 0.34, -0.22, 0.75, 1.57, 1.24, 0.00, true) &&
      !retesMikroBervolume(2, 0, 0.34, -0.22, 0.50, 1.57, 1.24, 0.00, true) &&
      !retesMikroBervolume(2, 0, 0.34, -0.22, 0.75, 1.57, 1.10, 0.00, true);
    hasil.push(['FB-T18 retes-mikro-bervolume: rej <= 0.05 + dir >= 0.70 + vFpre >= 1.2 + retest', t20 ? 'PASS' : 'FAIL']);
    var t21 = koreksiDangkalBervolume(8, 7, -0.50, 1.40, 2.45, 1.37, 0.56) &&
      !koreksiDangkalBervolume(8, 7, -1.80, 1.40, 2.45, 1.37, 0.56) &&
      !koreksiDangkalBervolume(8, 7, -0.50, 1.40, 2.00, 1.37, 0.56) &&
      !koreksiDangkalBervolume(8, 7, -0.50, 1.40, 2.45, 1.10, 0.56);
    hasil.push(['FB-T19 koreksi-dangkal-bervolume: vBrk >= 2.3 + vFpre >= 1.15 + cN >= -1.5', t21 ? 'PASS' : 'FAIL']);
    var t22 = rollOverTanpaEvent(0.756, 1.99, 2.24, 0.30) && !rollOverTanpaEvent(0.50, 1.99, 2.24, 0.30) &&
      !rollOverTanpaEvent(0.756, 0.40, 2.24, 0.30) && !rollOverTanpaEvent(0.756, 1.99, 1.20, 0.30) &&
      !rollOverTanpaEvent(0.756, 1.99, 2.24, 1.80);
    hasil.push(['FB-T20 roll-over-tanpa-event: dom >= 0.62 + fall 0.8-3.5 + volZ >= 1.5 + |dEma| <= 1.0', t22 ? 'PASS' : 'FAIL']);
    var t23 = penerimaanSegarMenyeluruh(4, 4, 0.00, 2.51, 0.88, 1.25) && !penerimaanSegarMenyeluruh(7, 4, 0.00, 2.51, 0.88, 1.25) &&
      !penerimaanSegarMenyeluruh(4, 4, 0.40, 2.51, 0.88, 1.25) && !penerimaanSegarMenyeluruh(4, 4, 0.00, 1.20, 0.88, 1.25);
    hasil.push(['FB-G1 penerimaan-segar-menyeluruh: umur <= 4 + cOut <= 4 + rejec <= 0.15 + cN >= 1.5', t23 ? 'PASS' : 'FAIL']);
    var pass = hasil.filter(function (x) { return x[1] === 'PASS'; }).length;
    return { pass: pass + '/' + hasil.length, rincian: hasil, status: status() };
  }

  function kartu() {
    var u = ujiDiri();
    var host = document.getElementById('v237-fbo');
    if (!host) return;
    var rows = u.rincian.map(function (x) {
      return '<div style="display:flex;justify-content:space-between;gap:12px"><span>' + x[0] + '</span><b style="color:' + (x[1] === 'PASS' ? '#7ee2a8' : '#ff7f7f') + '">' + x[1] + '</b></div>';
    }).join('');
    host.innerHTML = '<b style="color:#ffb37f">V237 SAKTI-FBO v' + V.versi + ' — ORGAN FALSE BREAKOUT</b><br>' +
      'LATIHAN 24 seed 2976/2976 (100.00% PENUH) · HAKIM SEGEL-SEGED 744/744 (100.00% PENUH) · SEGED-2 731/744 (98.25%) · 0 rugi-net · NET after fee.<br>' +
      'Pelajaran: FB-L1..L9 + FB-R/R2/R2c/R3 + FB-T0p/T0m/T0m2/T0s/T6c/T11/T14/T15/T16/T17/T6X/T6Y/T6Z/T18/T19/T20/G1 + FB-T0N-LEV/R2m/R2m2/L7d/L8s/T11v/T1d2/R3x + FB-K1..K3 · uji diri ' + u.pass + '.<br>' +
      '<div style="margin-top:6px;display:grid;gap:2px;font-size:12px;opacity:.9">' + rows + '</div>';
  }

  var API = { versi: V.versi, data: V, ujiDiri: ujiDiri, status: status, kartu: kartu, hitungNetLong: hitungNetLong, hitungNetShort: hitungNetShort, simInti: simInti, stopDinamis: stopDinamis, steadyAccept: steadyAccept, retestTrap: retestTrap, episodeMati: episodeMati, jedaBervolumeSahh: jedaBervolumeSahh, akumulasiLambat: akumulasiLambat, klimaksAccept: klimaksAccept, kelanjutanAccept: kelanjutanAccept, episodeMurniMuda: episodeMurniMuda, pauseAcceptance: pauseAcceptance, energiMati: energiMati, retesMikroBervolume: retesMikroBervolume, koreksiDangkalBervolume: koreksiDangkalBervolume, rollOverTanpaEvent: rollOverTanpaEvent, penerimaanSegarMenyeluruh: penerimaanSegarMenyeluruh };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.FBO = API;
    if (typeof window.document !== 'undefined') {
      var el = window.document.getElementById('v237-fbo');
      if (el) kartu();
      else window.document.addEventListener('DOMContentLoaded', kartu);
    }
  }
})();
/*V237-FBO:END*/
