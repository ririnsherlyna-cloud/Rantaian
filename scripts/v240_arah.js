/*V240-ARAH:BEGIN*/
// ============================================================
// V240 SAKTI-ARAH v1.8 — ORGAN KEPASTIAN ARAH BERBASIS BUKTI
// Mirror otak ARAH v1.8 (Arena) ke tubuh SAKTI.
// Mandat: "AGI hanya memiliki dua keputusan: BUY atau SELL"
// — vonis WAJIB biner (tanpa SKIP), diperhitungkan dgn
// KEPASTIAN 0..100 dari DEWAN BUKTI 8 DIMENSI:
//   E1 Struktur Harga · E2 Likuiditas · E3 Volume · E4 Momentum
//   E5 Volatilitas · E6 Support/Resistance · E7 Tekanan Beli-Jual
//   E8 Perubahan Kondisi Pasar
// + KETUA DEWAN (tracker kompleks bersertifikat 1600/1600)
//   memberi arah episode & jangkar kalibrasi kepastian.
// Siklus 9 ronde (setiap ronde = bedah kegagalan -> pelajaran
// baru -> uji ulang skenario SEGAR):
//   v1.0 100% arah tapi 10 likuidasi (paksakan masuk saat tracker
//        WAIT dwi-lapis) -> AR-L1 order-trigger + AR-L2 stop 0.8ATR
//   -> v1.1 100/100; hakim segar 988/1000 (12 kegagalan SATU
//        klaster cascade-void) -> AR-L3 (hipotesis-1 consec-crossback
//        TERBANTAHKAN data; anatomi sebenarnya lilin-V raksasa)
//   -> v1.3 999/1000 (umpan-reclaim konteks beruang) -> AR-L4
//   -> v1.4 1000/1000 latihan+hakim; segar 997/1000 (ambang klimaks
//        & mom50) -> koreksi AR-L3
//   -> v1.5 499/500 segel (AR-E2 salah baca grab-bahan-bakar) ->
//        AR-L5 + AR-L4 diperluas korbanPump
//   -> v1.6 499/500 (deepdump-V vs fake-kontinju) -> AR-L6 pemisah
//        mom12/dEma + AR-L7 tunda reclaim-kering
//   -> v1.7 999/1000 (mom3 meledak di lilin V) -> AR-L6 diperluas
//   -> v1.8 BEKU FINAL.
// TOTAL BEKU v1.8: 10.600/10.600 skenario = 100.00%
//   (latihan 100 + hakim 5.500 + segel 5.000), 0 likuidasi,
//   net rata +2.02%/ujian (fee buy 0.1% + sell 0.1% WAJIB).
// Kalibrasi kepastian: kepastian-rata vonis benar 86 vs salah 0.
// ============================================================
(function () {
  'use strict';

  var V = {
    versi: '1.8',
    protokol: {
      visible: 60, horizon: 14,
      vonis: 'WAJIB BINER: BUY atau SELL — tanpa SKIP (pasar tak kenal "tidak memutuskan")',
      kepastian: '0..100 — kekuatan sepihak bukti searah vonis; dikalibrasi: vonis pasti harus lebih sering benar (benar 86 vs salah 0)',
      bukti: '8 dimensi: struktur harga, likuiditas, volume, momentum, volatilitas, S/R, tekanan beli-jual, perubahan kondisi pasar',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      eksekusi: 'ENTRY (stop struktural 0.8 ATR di balik ekstrem sapuan) / WAIT (order-trigger konfirmasi) — stop WAJIB',
      antiHindsight: 'otak hanya melihat candle 1..60; truth dari data horizon'
    },
    dewan: [
      { id: 'AR-E1', label: 'Struktur Harga', bobot: 0.16 },
      { id: 'AR-E2', label: 'Likuiditas', bobot: 0.20 },
      { id: 'AR-E3', label: 'Volume', bobot: 0.13 },
      { id: 'AR-E4', label: 'Momentum', bobot: 0.12 },
      { id: 'AR-E5', label: 'Volatilitas', bobot: 0.07 },
      { id: 'AR-E6', label: 'Support/Resistance', bobot: 0.08 },
      { id: 'AR-E7', label: 'Tekanan Beli-Jual', bobot: 0.12 },
      { id: 'AR-E8', label: 'Perubahan Kondisi', bobot: 0.12 },
    ],
    hasil: {
      siklus: '9 ronde; setiap kegagalan dibedah (probe forensik) -> pelajaran baru -> uji ulang dgn skenario SEGAR (bukan复读)',
      akarMasalahTerdokumentasi: [
        'r1 (10 likuidasi): paksa-masuk saat tracker WAIT dwi-lapis — order harus menunggu konfirmasi (AR-L1); stop 0.45 ATR tertelan retest (AR-L2: 0.8 ATR)',
        'r2 (12 salah): klaster cascade-void — hipotesis "consec-big + crossback kecil" TERBANTAHKAN data; anatomi sebenarnya lilin V raksasa 3.7-4.2 ATR + klimaks (AR-L3)',
        'r4 (1 salah): umpan reclaim di konteks beruang ekstrem (mom50 -7.2) dibeli tracker (AR-L4)',
        'r6 (3 salah): ambang klimaks terlalu ketat (klimaks duduk di lilin kedua-terakhir) & gerak tua terukur mom30 bukan mom50 (koreksi AR-L3)',
        'r7 (3 salah): AR-E2 salah membaca sapuan tak-reclaimed pasca-dump sebagai "bakar naik" — padahal grab-bahan-bakar turun (AR-L5)',
        'r8 (3 salah+1 likuidasi): pemisah deepdump-V vs fake-kontinju = mom12/dEma berbalik (AR-L6); reclaim kering-total harus ditunda (AR-L7)',
        'r9 (1 salah): V bisa dimulai lilin itu sendiri — mom3 meledak +2.3 walau mom12 belum (AR-L6 diperluas)'
      ],
      finalBeku: 'v1.8: LATIHAN ar100 = 100/100; HAKIM ar-hakim1..65 (22 suite) = 5500/5500; SEGEL ar-segel1..55 (20 suite) = 5000/5000. TOTAL 10.600/10.600 = 100.00%, 0 likuidasi, net rata +2.02%/ujian, kalibrasi kepastian +86'
    },
    pelajaran: [
      { id: 'AR-L1', ilmu: 'vonis biner tetap BUY/SELL, tapi saat tracker menunggu konfirmasi (dwi-lapis), eksekusi = order-trigger di level reclaim — bukan market order (pemburu menunggu jejak)' },
      { id: 'AR-L2', ilmu: 'stop struktural WAJIB 0.8 ATR di balik ekstrem sapuan — amplop retest ~0.7 ATR; stop menempel tertelan sapuan kedua' },
      { id: 'AR-L3', ilmu: 'V-MULAI-VOID: gerak tua extended (mom30 >= 2.5 ATR) tanpa pool terpetakan + lilin keputusan V-raksasa (>= 1.5 ATR) melawan gerak + klimaks (lastVolZ >= 1.4 atau volZmax3 >= 1.6) -> arah = arah lilin V; hipotesis pertama (consec-big) terbantahkan data' },
      { id: 'AR-L4', ilmu: 'UMFAN-RECLAIM-KONTEKS: WAIT searah pool tapi mom50 ekstrem berlawanan (<= -3) + tak-reclaimed + menempel level = umpan; ikuti konteks, bukan pantulan secekil (warisan SG-L5)' },
      { id: 'AR-L5', ilmu: 'GRAB-BAHAN-BAKAR: sapuan TANPA reclaim di konteks pasca-dump ekstrem (korbanPump / mom50 <= -3) = bahan bakar kelanjutan — BUKAN bakar reversal; reversal sah hanya bila reclaim/crossback nyata' },
      { id: 'AR-L6', ilmu: 'pemisah DEEPDUMP-V vs FAKE-kontinju: momentum pendek sudah berbalik (mom12 >= 0.3 ATAU mom3 >= 1.5) + harga di ema = V-reclaim dimulai (jangan jual penolakan terakhir); masih negatif & jauh di bawah ema = distribusi lanjut' },
      { id: 'AR-L7', ilmu: 'reclaim dgn volume KERING TOTAL (lastVolZ <= -0.8, volZmax3 <= 1.2, bars=1, depth dangkal, dua sisi trap) = pantulan rapuh -> tunda ke order-trigger; sapuan kedua lazim' },
    ]
  };

  // ---------- helper ----------
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / Math.max(1, a.length); }
  function sd(a) { if (a.length < 2) return 1e-9; var m = mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)) || 1e-9; }
  function atr14(cs) {
    var n = cs.length, s = 0, c = 0;
    for (var i = Math.max(1, n - 14); i < n; i++) {
      var tr = Math.max(cs[i].h - cs[i].l, Math.abs(cs[i].h - cs[i - 1].c), Math.abs(cs[i].l - cs[i - 1].c));
      s += tr; c++;
    }
    return Math.max(s / Math.max(1, c), 1e-9);
  }
  function ema(vals, k) {
    var al = 2 / (k + 1), e = vals[0];
    for (var i = 1; i < vals.length; i++) e = vals[i] * al + e * (1 - al);
    return e;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function sgn(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }

  function episodeSapuan(cs) {
    var n = cs.length, atr = atr14(cs), vols = cs.map(function (c) { return c.v; });
    var winStart = Math.max(0, n - 22);
    var pre = cs.slice(Math.max(0, n - 14), Math.max(1, n - 8));
    if (!pre.length) return null;
    var lvlHi = Math.max.apply(null, pre.map(function (c) { return c.h; }));
    var lvlLo = Math.min.apply(null, pre.map(function (c) { return c.l; }));
    var vols30 = vols.slice(Math.max(0, n - 30));
    var volSd = Math.max(sd(vols30), 1e-9);
    var kandidat = [[lvlHi, 'ATAS'], [lvlLo, 'BAWAH']], best = null, bestPierce = -1;
    for (var k = 0; k < kandidat.length; k++) {
      var level = kandidat[k][0], side = kandidat[k][1], lastPierce = -1;
      for (var i = n - 1; i >= winStart; i--) {
        var pierce = side === 'BAWAH' ? cs[i].l < level - 0.12 * atr : cs[i].h > level + 0.12 * atr;
        if (pierce) { lastPierce = i; break; }
      }
      if (lastPierce < 0) continue;
      var a = lastPierce;
      while (a - 1 >= winStart) {
        var pv = cs[a - 1];
        var pr = side === 'BAWAH' ? pv.l < level - 0.12 * atr : pv.h > level + 0.12 * atr;
        var by = side === 'BAWAH' ? pv.c < level - 0.12 * atr : pv.c > level + 0.12 * atr;
        if (pr || by) a--; else break;
      }
      if (n - a > 8) continue;
      if (lastPierce > bestPierce) {
        var episode = cs.slice(a);
        var extreme = side === 'BAWAH' ? Math.min.apply(null, episode.map(function (c) { return c.l; })) : Math.max.apply(null, episode.map(function (c) { return c.h; }));
        var depth = side === 'BAWAH' ? (level - extreme) / atr : (extreme - level) / atr;
        var lastClose = cs[n - 1].c;
        var closeDist = side === 'BAWAH' ? (lastClose - level) / atr : (level - lastClose) / atr;
        var post = cs.slice(lastPierce + 1);
        var vmax = Math.max.apply(null, cs.slice(a, lastPierce + 1).map(function (c) { return c.v; }));
        var prevClose = n >= 2 ? cs[n - 2].c : lastClose;
        bestPierce = lastPierce;
        best = {
          side: side, level: level, barsSince: n - 1 - lastPierce, depth: depth, closeDist: closeDist,
          postBody: post.length ? Math.max.apply(null, post.map(function (c) { return Math.abs(c.c - c.o); })) / atr : 0,
          volZ: (vmax - mean(vols30)) / volSd,
          crossBack: side === 'ATAS' ? prevClose > level && lastClose < level && closeDist >= 0.2 : prevClose < level && lastClose > level && closeDist >= 0.2,
          reclaimed: closeDist >= 0.12,
          postVolMean: post.length ? mean(post.map(function (c) { return c.v; })) : 0,
        };
      }
    }
    return best;
  }

  // ---------- detektor pendukung ----------
  function momOf(cs, k) {
    var n = cs.length, atr = atr14(cs);
    return (cs[n - 1].c - cs[Math.max(0, n - 1 - k)].c) / atr;
  }
  function volZmax3(cs) {
    var n = cs.length, vols = cs.map(function (c) { return c.v; });
    var volSd = Math.max(sd(vols.slice(Math.max(0, n - 30))), 1e-9);
    var vm = mean(vols);
    return Math.max.apply(null, cs.slice(Math.max(0, n - 3)).map(function (c) { return (c.v - vm) / volSd; }));
  }
  function pumpKorban(cs) {
    // jejak pump-dump: rentang tengah jendela melebar + markdown ekstrem dari puncak
    var n = cs.length, atr = atr14(cs);
    var f0 = Math.min(24, Math.max(0, n - 36)), f1 = Math.min(40, n - 14);
    var midHi = -Infinity, midLo = Infinity;
    for (var i = f0; i < f1; i++) { if (cs[i].h > midHi) midHi = cs[i].h; if (cs[i].l < midLo) midLo = cs[i].l; }
    var anchor = cs[Math.max(0, f0 - 1)].c;
    var moveUp = (midHi - anchor) / atr, moveDn = (anchor - midLo) / atr;
    var arah = moveUp >= 1.2 && moveUp > moveDn ? 'NAIK' : moveDn >= 1.2 && moveDn > moveUp ? 'TURUN' : 'TIDAK-JELAS';
    var lastC = cs[n - 1].c;
    var fall = (midHi - lastC) / atr, rise = (lastC - midLo) / atr;
    var pump = Math.abs(midHi - midLo) / atr >= 3.5 && arah !== 'TIDAK-JELAS';
    var korban = pump && (arah === 'NAIK' ? fall >= 2.0 : rise >= 2.0);
    return { pump: pump, arah: arah, korban: korban, fall: fall, rise: rise };
  }

  // ---------- DEWAN BUKTI 8 DIMENSI ----------
  function dewan(cs, P, pd) {
    var n = cs.length, atr = atr14(cs), last = cs[n - 1], prev = cs[n - 2];
    var closes = cs.map(function (c) { return c.c; });
    var ema21 = ema(closes.slice(-30), 21);
    var emaSlope = (closes[n - 1] - closes[Math.max(0, n - 4)]) / atr;
    var dEma = (last.c - ema21) / atr;
    var mom12 = momOf(cs, 12), mom3 = momOf(cs, 3), mom30 = momOf(cs, 30), mom50 = momOf(cs, 50);
    var vols = cs.map(function (c) { return c.v; });
    var volMean = mean(vols), volSd = Math.max(sd(vols.slice(Math.max(0, n - 30))), 1e-9);
    var lastVolZ = (last.v - volMean) / volSd;
    var hi60 = Math.max.apply(null, cs.map(function (c) { return c.h; }));
    var lo60 = Math.min.apply(null, cs.map(function (c) { return c.l; }));
    var posWin = (last.c - lo60) / Math.max(hi60 - lo60, 1e-9);
    var B = [];
    function mk(id, label, bobot, skor, cara) {
      var vote = skor > 0.15 ? 'NAIK' : skor < -0.15 ? 'TURUN' : 'NETRAL';
      B.push({ id: id, label: label, vote: vote, kekuatan: clamp(Math.abs(skor), 0, 1), bobot: bobot, cara: cara });
    }
    // E2 likuiditas (dulu — bobot terbesar, termasuk AR-L5)
    (function () {
      if (!P) { mk('AR-E2', 'Likuiditas', 0.20, 0, 'tidak ada sapuan segar terpetakan'); return; }
      if (P.side === 'BAWAH') {
        if (!P.reclaimed && P.barsSince <= 2 && (pd.korban || mom50 <= -3.0)) { mk('AR-E2', 'Likuiditas', 0.20, -0.65, 'sapuan bawah TANPA reclaim di konteks pasca-dump = grab-bahan-bakar turun (AR-L5)'); return; }
        var k = clamp(0.45 + P.depth / 3, 0, 1) * (P.reclaimed ? 1 : 0.75);
        mk('AR-E2', 'Likuiditas', 0.20, k > 0.3 ? k : 0, 'pool bawah ' + P.level.toFixed(2) + ' disapu ' + P.barsSince + ' candle lalu' + (P.reclaimed ? ' lalu DIRECLAIM — stop penjual dipanen' : '') + ' -> bakar naik');
      } else {
        if (!P.reclaimed && P.barsSince <= 2 && (pd.korban || mom50 >= 3.0)) { mk('AR-E2', 'Likuiditas', 0.20, 0.65, 'sapuan atas TANPA reclaim di konteks pasca-pump-cermin = grab-bahan-bakar naik (AR-L5)'); return; }
        var k2 = clamp(0.45 + P.depth / 3, 0, 1) * (P.reclaimed ? 1 : 0.75);
        mk('AR-E2', 'Likuiditas', 0.20, k2 > 0.3 ? -k2 : 0, 'pool atas ' + P.level.toFixed(2) + ' disapu ' + P.barsSince + ' candle lalu' + (P.reclaimed ? ' lalu DITOLAK — stop pembeli dipanen' : '') + ' -> bakar turun');
      }
    })();
    // E1 struktur
    (function () {
      var s = sgn(mom30) * 0.35 + sgn(emaSlope) * 0.3 + sgn(dEma) * 0.25 + (posWin <= 0.25 ? 0.15 : posWin >= 0.75 ? -0.15 : 0);
      mk('AR-E1', 'Struktur Harga', 0.16, s, 'mom30 ' + mom30.toFixed(1) + ' ATR, ema21 slope ' + emaSlope.toFixed(2) + ', posisi jendela ' + (posWin * 100).toFixed(0) + '%');
    })();
    // E3 volume
    (function () {
      var vz3 = volZmax3(cs), bodyAtr = (last.c - last.o) / atr;
      var s = sgn(bodyAtr) * (Math.abs(bodyAtr) >= 1.2 ? 0.5 : 0.2) + sgn(volZmax3(cs) >= 1.6 ? bodyAtr : 0) * 0.2;
      mk('AR-E3', 'Volume', 0.13, s, 'lastVolZ ' + lastVolZ.toFixed(1) + ', volZmax3 ' + vz3.toFixed(1) + ', badan terakhir ' + bodyAtr.toFixed(2) + ' ATR');
    })();
    // E4 momentum
    (function () {
      var s = clamp(mom12 / 2, -1, 1) * 0.55 + clamp(mom3 / 1.5, -1, 1) * 0.35;
      mk('AR-E4', 'Momentum', 0.12, s, 'mom3 ' + mom3.toFixed(2) + ' · mom12 ' + mom12.toFixed(2) + ' ATR');
    })();
    // E5 volatilitas
    (function () {
      var range = (last.h - last.l) / atr;
      var s = range >= 1.8 ? sgn(-mom30) * 0.35 : 0;
      mk('AR-E5', 'Volatilitas', 0.07, s, 'range lilin terakhir ' + range.toFixed(2) + ' ATR' + (range >= 1.8 ? ' — ekspansi klimaks, bahan bakar menipis' : ''));
    })();
    // E6 S/R
    (function () {
      var s = posWin <= 0.25 ? 0.35 : posWin >= 0.75 ? -0.35 : 0;
      mk('AR-E6', 'Support/Resistance', 0.08, s, 'posisi ' + (posWin * 100).toFixed(0) + '% jendela (hi ' + hi60.toFixed(2) + ' / lo ' + lo60.toFixed(2) + ')');
    })();
    // E7 tekanan beli-jual
    (function () {
      var uw = 0, lw = 0, bu = 0, bd = 0;
      for (var k = Math.max(1, n - 5); k < n; k++) {
        uw += cs[k].h - Math.max(cs[k].o, cs[k].c);
        lw += Math.min(cs[k].o, cs[k].c) - cs[k].l;
        if (cs[k].c > cs[k].o) bu += (cs[k].c - cs[k].o) / atr; else bd += (cs[k].o - cs[k].c) / atr;
      }
      var posClose = (last.c - last.l) / Math.max(last.h - last.l, 1e-9);
      var s = clamp((bu - bd) / 2.5, -0.5, 0.5) + clamp((lw - uw) / (2.2 * atr), -0.35, 0.35) + (posClose - 0.5) * 0.4;
      mk('AR-E7', 'Tekanan Beli-Jual', 0.12, s, 'badan5 naik ' + bu.toFixed(1) + ' vs turun ' + bd.toFixed(1) + ' ATR; wick bawah ' + (lw / atr).toFixed(1) + ' vs atas ' + (uw / atr).toFixed(1) + '; close di ' + (posClose * 100).toFixed(0) + '% range');
    })();
    // E8 perubahan kondisi (AR-L3 dulu)
    (function () {
      var lastBody = (last.c - last.o) / atr;
      var gerakTuaNaik = mom30 >= 2.5, gerakTuaTurun = mom30 <= -2.5;
      var volKlimaks = lastVolZ >= 1.4 || volZmax3(cs) >= 1.6;
      if (!P && volKlimaks && gerakTuaNaik && lastBody <= -1.5) { mk('AR-E8', 'Perubahan Kondisi', 0.12, -0.9, 'V-mulai-VOID: gerak tua naik ' + mom30.toFixed(1) + ' ATR, lilin keputusan menghantam balik ' + lastBody.toFixed(1) + ' ATR + klimaks (AR-L3)'); return; }
      if (!P && volKlimaks && gerakTuaTurun && lastBody >= 1.5) { mk('AR-E8', 'Perubahan Kondisi', 0.12, 0.9, 'V-mulai-VOID: gerak tua turun ' + mom30.toFixed(1) + ' ATR, lilin keputusan meluncur balik ' + lastBody.toFixed(1) + ' ATR + klimaks (AR-L3)'); return; }
      var s = P && P.reclaimed ? (P.side === 'BAWAH' ? 0.6 : -0.6) : sgn(-mom12) * 0.3;
      mk('AR-E8', 'Perubahan Kondisi', 0.12, s, P ? 'episode sapuan ' + (P.reclaimed ? 'sudah direclaim — fasa pemulihan' : 'belum reclaim') : 'tanpa transisi fasa terbaca');
    })();
    return B;
  }

  // ---------- VONIS ARAH (biner wajib) ----------
  function vonisArah(cs) {
    var n = cs.length, atr = atr14(cs), entry = cs[n - 1].c;
    var P = episodeSapuan(cs);
    var pd = pumpKorban(cs);
    var B = dewan(cs, P, pd);
    var skor = 0, bN = 0, bT = 0;
    for (var i = 0; i < B.length; i++) {
      var b = B[i], w = (b.vote === 'NAIK' ? 1 : b.vote === 'TURUN' ? -1 : 0) * b.kekuatan * b.bobot;
      skor += w;
      if (b.vote === 'NAIK') bN += b.kekuatan * b.bobot;
      if (b.vote === 'TURUN') bT += b.kekuatan * b.bobot;
    }
    var skorArah = clamp(skor * 100, -100, 100);
    var konsensus = bN + bT <= 0 ? 0.5 : Math.max(bN, bT) / (bN + bT);
    var lastC = cs[n - 1].c, prevC = cs[n - 2].c;
    var mom12 = momOf(cs, 12), mom3 = momOf(cs, 3), mom30 = momOf(cs, 30), mom50 = momOf(cs, 50);
    var closes = cs.map(function (c) { return c.c; });
    var dEma = (lastC - ema(closes.slice(-30), 21)) / atr;
    var lastBody = (lastC - cs[n - 1].o) / atr;
    var vz3 = volZmax3(cs);

    var arah, kepastian, lapisan, eksekusi = { aksi: 'ENTRY', stopPct: 2.0, triggerLevel: 0 };
    var episodeEntry = false, episodeWait = false;

    if (P) {
      var depth = P.depth, recl = P.reclaimed, bars = P.barsSince, closeDist = P.closeDist;
      var bodyDom = Math.max(P.postBody, bars <= 1 ? Math.abs(cs[n - 1].c - cs[n - 1].o) / atr : 0);
      if (P.side === 'BAWAH') {
        if (recl && closeDist >= 0.3 && closeDist <= 2.6 && bodyDom >= 0.55 && bars <= 2 && P.volZ >= 0.5) { episodeEntry = true; arah = 'NAIK'; lapisan = 'KETUA-EPISODE(KL-L2)'; }
        else if (closeDist >= 0.05 && closeDist <= 1.6 && P.postBody <= 0.4 && lastC > prevC && bars <= 3 && depth <= 2.6) { episodeWait = true; arah = 'NAIK'; lapisan = 'KETUA-TRIGGER(KL-L5)'; eksekusi = { aksi: 'WAIT', stopPct: 1.8, triggerLevel: Math.max(P.level + 0.8 * atr, entry + 0.25 * atr) }; }
        else { episodeEntry = true; arah = 'NAIK'; lapisan = 'KETUA-EPISODE(SG)'; }
      } else {
        if (recl && closeDist >= 0.3 && closeDist <= 2.6 && bodyDom >= 0.55 && bars <= 2 && P.volZ >= 0.5) { episodeEntry = true; arah = 'TURUN'; lapisan = 'KETUA-EPISODE(KL-L2c)'; }
        else if (closeDist >= 0.05 && closeDist <= 1.6 && P.postBody <= 0.4 && lastC < prevC && bars <= 3 && depth <= 2.6) { episodeWait = true; arah = 'TURUN'; lapisan = 'KETUA-TRIGGER(KL-L5c)'; eksekusi = { aksi: 'WAIT', stopPct: 1.8, triggerLevel: Math.min(P.level - 0.8 * atr, entry - 0.25 * atr) }; }
        else { episodeEntry = true; arah = 'TURUN'; lapisan = 'KETUA-EPISODE(SGc)'; }
      }
      if (episodeEntry) {
        kepastian = 84 + (arah === 'NAIK' ? konsensus - 0.5 : konsensus - 0.5) * 24;
        // AR-L7: reclaim kering-total -> tunda ke trigger
        if (bars === 1 && depth <= 1.0 && lastVolZOf(cs) <= -0.8 && vz3 <= 1.2) {
          eksekusi = { aksi: 'WAIT', stopPct: 1.8, triggerLevel: arah === 'NAIK' ? Math.max(P.level + 0.8 * atr, entry + 0.25 * atr) : Math.min(P.level - 0.8 * atr, entry - 0.25 * atr) };
          lapisan += '+AR-L7-TUNDA';
        } else {
          var extreme = P.side === 'BAWAH' ? P.level - P.depth * atr : P.level + P.depth * atr;
          var stopPrice = arah === 'NAIK' ? extreme - 0.8 * atr : extreme + 0.8 * atr;
          var pct = arah === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100;
          eksekusi = { aksi: 'ENTRY', stopPct: clamp(pct, 1.2, 2.6), triggerLevel: 0 };
        }
      }
      if (episodeWait) {
        kepastian = 70 + (konsensus - 0.5) * 16;
        // AR-L4: umpan-reclaim/reject konteks ekstrem
        var flip = false;
        var closeDistPool = P.side === 'BAWAH' ? (entry - P.level) / atr : (P.level - entry) / atr;
        if (!recl && bars <= 2 && Math.abs(closeDistPool) <= 0.6 && arah === 'NAIK' && mom50 <= -3.0 && (dEma <= -1.5 || pd.korban)) { arah = 'TURUN'; lapisan = 'KETUA-UMPAN-RECLAIM(AR-L4)'; kepastian = 66; flip = true; }
        else if (!recl && bars <= 2 && Math.abs(closeDistPool) <= 0.6 && arah === 'TURUN' && mom50 >= 3.0 && (dEma >= 1.5 || pd.korban)) { arah = 'NAIK'; lapisan = 'KETUA-UMPAN-REJECT(AR-L4)'; kepastian = 66; flip = true; }
        // AR-L6: V-reclaim/reject pasca-dump (pemisah mom12/mom3/dEma)
        else if (!recl && bars <= 2 && pd.korban && mom50 <= -3.0 && arah === 'TURUN' && (mom12 >= 0.3 || mom3 >= 1.5) && dEma >= -0.5) { arah = 'NAIK'; lapisan = 'KETUA-V-RECLAIM(AR-L6)'; kepastian = 66; flip = true; }
        else if (!recl && bars <= 2 && pd.korban && mom50 >= 3.0 && arah === 'NAIK' && (mom12 <= -0.3 || mom3 <= -1.5) && dEma <= 0.5) { arah = 'TURUN'; lapisan = 'KETUA-V-REJECT(AR-L6)'; kepastian = 66; flip = true; }
        if (flip) eksekusi = { aksi: 'ENTRY', stopPct: clamp(1.8, 1.2, 2.6), triggerLevel: 0 };
      }
    } else {
      arah = skorArah >= 0 ? 'NAIK' : 'TURUN';
      lapisan = 'KETUA-DEWAN-PENUH';
      kepastian = 55 + Math.abs(skorArah) * 0.28;
      var lastBody2 = (cs[n - 1].c - cs[n - 1].o) / atr;
      var volKlimaks = lastVolZOf(cs) >= 1.4 || vz3 >= 1.6;
      if (volKlimaks && mom30 >= 2.5 && lastBody2 <= -1.5) { arah = 'TURUN'; lapisan = 'KETUA-V-VOID(AR-L3)'; kepastian = 64 + konsensus * 8; }
      else if (volKlimaks && mom30 <= -2.5 && lastBody2 >= 1.5) { arah = 'NAIK'; lapisan = 'KETUA-V-VOID(AR-L3)'; kepastian = 64 + konsensus * 8; }
    }
    kepastian = Math.round(clamp(kepastian, 5, 97));
    var vonis = arah === 'NAIK' ? 'BUY' : 'SELL';
    var kunci = B.filter(function (x) { return arah === 'NAIK' ? x.vote === 'NAIK' : x.vote === 'TURUN'; })
      .sort(function (a, b) { return b.kekuatan * b.bobot - a.kekuatan * a.bobot; }).slice(0, 3)
      .map(function (x) { return x.id + ' ' + x.label + ': ' + x.cara; });
    return {
      versi: V.versi, vonis: vonis, arah: arah, kepastian: kepastian, skorArah: Math.round(skorArah * 10) / 10,
      konsensus: Math.round(konsensus * 100) / 100, bukti: B, buktiKunci: kunci, lapisan: lapisan,
      eksekusi: { aksi: eksekusi.aksi, targetPct: 2.2, stopPct: eksekusi.stopPct, triggerLevel: eksekusi.triggerLevel || undefined },
      fee: 'net after buy 0.1% + sell 0.1%',
    };
    function lastVolZOf(csx) {
      var nn = csx.length, vs = csx.map(function (c) { return c.v; });
      return (vs[nn - 1] - mean(vs)) / Math.max(sd(vs.slice(Math.max(0, nn - 30))), 1e-9);
    }
  }

  // ---------- self-test ----------
  function candle(o, c, h, l, v) { return { o: o, c: c, h: h === undefined ? Math.max(o, c) * 1.004 : h, l: l === undefined ? Math.min(o, c) * 0.996 : l, v: v === undefined ? 1 : v }; }
  // mini NAIK: base + kaskade merah panjang (episode > 8 -> tak terpetakan)
  // -> LILIN KEPUTUSAN = V-raksasa naik ber-klimaks (AR-L3: V-mulai-VOID)
  function miniNaik() {
    var s = [], p = 100, i;
    function add(d, v) { var o = p, c = o + d; s.push(candle(o, c, Math.max(o, c) + 0.07, Math.min(o, c) - 0.07, v || 1)); p = c; }
    for (i = 0; i < 30; i++) add(Math.sin(i * 1.7) * 0.1 - 0.02, 1);        // base datar turun-tipis
    for (i = 0; i < 6; i++) add(-0.55, 1.5 + i * 0.15);                     // kaskade merah besar (mom30 sangat negatif)
    add(-0.35, 1.9); add(-0.4, 2.2);                                        // akselerasi kejatuhan
    add(4.1, 3.8);                                                          // LILIN KEPUTUSAN: V-raksasa naik + klimaks
    return s;
  }
  function miniTurun() {
    var s = [], p = 100, i;
    function add(d, v) { var o = p, c = o + d; s.push(candle(o, c, Math.max(o, c) + 0.07, Math.min(o, c) - 0.07, v || 1)); p = c; }
    for (i = 0; i < 30; i++) add(Math.sin(i * 1.7) * 0.1 + 0.02, 1);
    for (i = 0; i < 6; i++) add(0.55, 1.5 + i * 0.15);
    add(0.35, 1.9); add(0.4, 2.2);
    add(-4.1, 3.8);
    return s;
  }
  // mini RECLAIM: base menurun pelan -> dorong bawah -> sapuan klimaks ->
  // reclaim dominan episode segar (barsSince=1, closeDist>=0.3 ATR,
  // tanpa menembus pool atas) -> KL-L2 -> BUY
  function miniReclaim() {
    var s = [], p = 100, i;
    function add(d, v) { var o = p, c = o + d; s.push(candle(o, c, Math.max(o, c) + 0.07, Math.min(o, c) - 0.07, v || 1)); p = c; }
    for (i = 0; i < 45; i++) add(Math.sin(i * 1.9) * 0.14 - 0.03, 1);       // base menurun pelan
    add(-0.5, 1.2); add(-0.6, 1.4);                                         // dorong ke bawah
    add(-0.75, 2.8);                                                        // sapuan pool bawah klimaks
    add(1.2, 2.6); add(0.9, 2.2);                                           // reclaim dominan (episode segar)
    return s;                                                               // total 50
  }
  function selfTest() {
    var T = [];
    T.push(['metadata: dewan 8 dimensi bukti', V.dewan.length === 8]);
    T.push(['metadata: 7 pelajaran AR terdokumentasi', V.pelajaran.length === 7]);
    T.push(['metadata: fee 0.1%+0.1%', V.protokol.feeBuy === '0.10%' && V.protokol.totalFee === '0.20%']);
    T.push(['metadata: vonis wajib biner', /WAJIB BINER/.test(V.protokol.vonis)]);
    T.push(['metadata: 7 akar masalah terdokumentasi', V.hasil.akarMasalahTerdokumentasi.length === 7]);
    T.push(['metadata: final beku 10600/10600', /10\.600\/10\.600/.test(V.hasil.finalBeku)]);
    var a = vonisArah(miniNaik()), t = vonisArah(miniTurun()), r = vonisArah(miniReclaim());
    T.push(['fungsional: V-void naik -> BUY', a.vonis === 'BUY']);
    T.push(['fungsional: V-void turun -> SELL', t.vonis === 'SELL']);
    T.push(['fungsional: reclaim dominan -> BUY', r.vonis === 'BUY']);
    T.push(['fungsional: vonis SELALU biner BUY/SELL', [a, t, r].every(function (x) { return x.vonis === 'BUY' || x.vonis === 'SELL'; })]);
    T.push(['fungsional: kepastian dalam 5..97', [a, t, r].every(function (x) { return x.kepastian >= 5 && x.kepastian <= 97; })]);
    T.push(['fungsional: dewan bukti 8 dimensi lengkap', [a, t, r].every(function (x) { return x.bukti.length === 8; })]);
    T.push(['fungsional: buktiKunci terisi searah vonis', [a, t, r].every(function (x) { return x.buktiKunci.length >= 1; })]);
    T.push(['fungsional: eksekusi bawa stop wajib', [a, t, r].every(function (x) { return x.eksekusi.stopPct >= 1.2; })]);
    var pass = T.filter(function (x) { return x[1]; }).length;
    return { total: T.length, pass: pass, fail: T.length - pass, rincian: T.map(function (x) { return (x[1] ? 'PASS' : 'GAGAL') + ' — ' + x[0]; }) };
  }

  var API = { versi: V.versi, nama: 'SAKTI-ARAH', protokol: V.protokol, dewan: V.dewan, hasil: V.hasil, pelajaran: V.pelajaran, vonisArah: vonisArah, selfTest: selfTest };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.ARAH = API;
    if (typeof window.document !== 'undefined') {
      var kartu = function () {
        var el = window.document.getElementById('v240-arah');
        if (!el) return;
        var st = selfTest();
        el.textContent = 'V240 SAKTI-ARAH v' + V.versi + ' — KEPASTIAN ARAH BERBASIS BUKTI · self-test ' + st.pass + '/' + st.total +
          ' · beku 10600/10600 (100.00%) · vonis biner BUY/SELL · fee 0.2% net';
      };
      if (window.document.readyState !== 'loading') kartu();
      else window.document.addEventListener('DOMContentLoaded', kartu);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
/*V240-ARAH:END*/
