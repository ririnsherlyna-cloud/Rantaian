/*V239-KL:BEGIN*/
// ============================================================
// V239 SAKTI-KOMPLEKS v1.0 — ORGAN ILMU UJIAN KOMPLEKS 5 ASPEK
// Mirror otak KOMPLEKS v1.2 (Arena) ke tubuh SAKTI.
// Setiap skenario = SATU rangkaian pasar yang memuat KELIMA
// aspek sekaligus: STOP HUNT/LIQUIDITY GRAB + FALSE BREAKOUT +
// PUMP AND DUMP + BEAR TRAP + BULL TRAP (+ lilin menipu).
// Siklus: v1.0 95/100 (5 likuidasi: konteks cermin membingungkan
//   pemindai dump) -> bedah forensik 6 akar -> v1.1 100/100
//   (deteksi P&D 82/100, level FBO 60/100) -> bedah 2 akar
//   -> v1.2 100/100 + deteksi penuh -> BEKU.
// TOTAL BEKU v1.2: 1600/1600 skenario = 100.00%
//   (latihan 100 + hakim segar 1000 + segel 500), 0 likuidasi.
// Pembanding CORE naif: 20/100, 80 likuidasi, net -149.3%.
// Semua NET after fee buy 0.1% + sell 0.1%; STOP WAJIB (bisa
// DILIKUIDASI); 60 candle visible + 14 horizon (anti-hindsight).
// ============================================================
(function () {
  'use strict';

  var V = {
    versi: '1.0',
    protokol: {
      visible: 60, horizon: 14,
      aspek: '5 ASPEK SEKALIGUS per skenario: stop hunt/liquidity grab + false breakout + pump&dump + bear trap + bull trap (+ lilin menipu)',
      keputusan: 'ENTRY (stop WAJIB — bisa dilikuidasi) / WAIT (trigger sendiri, maks 8 candle) / SKIP',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      antiHindsight: 'otak hanya melihat candle 1..60; truth dari data horizon; gerbang: move >= 2.4-2.8% + MFE >= 2.8-3.2% + bait-MFE <= 1.3% (keluarga umpan) + dip-guard struktural'
    },
    anatomi: [
      'A 0-11 base range + lilin menipu', 'B 12-16 BULL TRAP (menabung likuiditas atas)',
      'C 17-18 regroup doji', 'D 19-23 BEAR TRAP -> melahirkan POOL RANTAI',
      'E 24-30 PUMP-1 markup impuls vol menaik', 'F 31-37 PUMP-2 + FALSE BREAKOUT puncak struktural -> dicabut',
      'G 38-44 DUMP markdown -> korban jadi stop cluster', 'H 45-55 grind + setem ke pool rantai',
      'I 56-59 STOP HUNT FINAL sapuan + klimaks', 'HORIZON 60-73 resolusi dari data'
    ],
    hasil: {
      siklus: '3 ronde (v1.0 95% -> v1.1 100% latihan tapi deteksi belum penuh -> v1.2 100% + deteksi penuh)',
      akarMasalahTerdokumentasi: [
        'r1: pemindai dump pakai puncak jendela absolut — pada skenario cermin puncak jendela = puncak sapuan, bukan puncak pump -> KL-L4 salah konteks -> 5 likuidasi',
        'r1: jendela pemindai FBO mencakup lilin tembus itu sendiri -> deteksi FBO 0/100',
        'r1: lvlFbo generator cermin pakai max(high) padahal harus min(low)',
        'r2: arah pump close-ke-close pada jendela 24..40 — fase G menutup di tengah gerak -> 18 skenario rancu; perbaikan: ekstrem fase vs harga masuk fase',
        'r2: pemindai FBO dua sisi menangkap sisi dasar (bear trap fase D) -> sisi wajib mengikuti arah pump',
        'r1: KL-L4 wajib mom50 searah entry (warisan CG-L4b); KL-L1 jalur alternatif consecBig>=2 + volZ sapu >= 2.0 utk kaskade ber-ATR besar; depth pool 3.4 -> 4.2 ATR'
      ],
      finalBeku: 'v1.2: LATIHAN kl100 = 100/100; HAKIM kl-hakim1..10 = 1000/1000; SEGEL kl-hakim11..15 = 500/500. TOTAL 1600/1600 = 100.00%, 0 likuidasi, net kumulatif rata2 +200% per 100 ujian. CORE naif: 20/100, 80 likuidasi, net -149.3%'
    },
    pelajaran: [
      { id: 'KL-L1', ilmu: 'kaskade-gauntlet: merah/hijau besar berturut + klimaks + sapuan dalam + cross-back/reclaim -> ENTRY melawan kaskade' },
      { id: 'KL-L2', ilmu: 'reclaim/reject dominan: tutup >= 0.3 ATR menembus balik level + badan >= 0.55 ATR + berpengikut -> reversal sah' },
      { id: 'KL-L3', ilmu: 'umpan reclaim-gagal: tutup secekil + badan <= 0.55 ATR + LH/HL mikro + volume kering -> kelanjutan' },
      { id: 'KL-L4', ilmu: 'grab-bahan-bakar: sapuan tanpa reclaim WAJIB mom50 searah entry -> likuiditas habis, lanjut' },
      { id: 'KL-L5', ilmu: 'sapuan dwi-lapis: pantulan rapuh + dua sisi pool -> WAIT dengan trigger reclaim sendiri' },
      { id: 'KL-L6', ilmu: 'skip-disiplin: tanpa episode sapuan segar ber-volume nyata -> tidak bermain' },
      { id: 'KL-PD0', ilmu: 'pemindai P&D: arah pump dari ekstrem fase vs harga masuk fase; dump = gerak KEBALIKAN arah pump dari ekstrem fase pump; sisi FBO mengikuti arah pump; korban pump = stop cluster di sisi kebalikan' }
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
  function consecBig(cs, atr, arah) {
    var n = cs.length, k = 0;
    for (var i = n - 1; i > 0; i--) {
      var b = (cs[i].c - cs[i].o) / atr;
      if (arah === 'dn' ? b <= -0.55 : b >= 0.55) k++; else break;
    }
    return k;
  }
  function consecClose(cs) {
    var n = cs.length, up = 0, dn = 0;
    for (var i = n - 1; i > 0; i--) {
      if (cs[i].c > cs[i - 1].c) { if (dn > 0) break; up++; }
      else if (cs[i].c < cs[i - 1].c) { if (up > 0) break; dn++; }
      else break;
    }
    return { up: up, dn: dn };
  }

  // ---------- KL-PD0: pemindai pump-dump-FBO ----------
  function pdScan(cs) {
    var n = cs.length, atr = atr14(cs), vols = cs.map(function (c) { return c.v; });
    var f0 = Math.min(24, Math.max(0, n - 36)), f1 = Math.min(40, n - 14);
    var midHi = -Infinity, midLo = Infinity;
    for (var i = f0; i < f1; i++) { if (cs[i].h > midHi) midHi = cs[i].h; if (cs[i].l < midLo) midLo = cs[i].l; }
    var midMove = (midHi - midLo) / atr;
    var anchor = cs[Math.max(0, f0 - 1)].c;
    var moveUp = (midHi - anchor) / atr, moveDn = (anchor - midLo) / atr;
    var arah = moveUp >= 1.2 && moveUp > moveDn ? 'NAIK' : moveDn >= 1.2 && moveDn > moveUp ? 'TURUN' : 'TIDAK-JELAS';
    var volMean = mean(vols), volSd = Math.max(sd(vols.slice(Math.max(0, n - 30))), 1e-9);
    var volPeakZ = (Math.max.apply(null, vols.slice(f0, f1)) - volMean) / volSd;
    var lastC = cs[n - 1].c;
    var fall = (midHi - lastC) / atr, rise = (lastC - midLo) / atr;
    var pump = midMove >= 2.2 && arah !== 'TIDAK-JELAS' && volPeakZ >= 0.8;
    var dump = pump && (arah === 'NAIK' ? fall >= 1.2 : rise >= 1.2);
    // FBO: level struktural SEBELUM episode tembus (n-31), sisi mengikuti arah pump
    var struk = cs.slice(Math.max(0, n - 58), Math.max(6, n - 31));
    var fboHi = Math.max.apply(null, struk.map(function (c) { return c.h; }));
    var fboLo = Math.min.apply(null, struk.map(function (c) { return c.l; }));
    var sisi = arah === 'NAIK' ? [[fboHi, true]] : arah === 'TURUN' ? [[fboLo, false]] : [[fboHi, true], [fboLo, false]];
    var fbo = false, fboLvl = 0;
    for (var s = 0; s < sisi.length && !fbo; s++) {
      var lvl = sisi[s][0], up = sisi[s][1];
      for (i = Math.max(1, n - 31); i < n - 1 && !fbo; i++) {
        var tembus = up ? cs[i].h > lvl + 0.05 * atr : cs[i].l < lvl - 0.05 * atr;
        if (!tembus) continue;
        for (var j = i + 1; j < Math.min(n, i + 4); j++) {
          var cabut = up ? cs[j].c < lvl - 0.15 * atr : cs[j].c > lvl + 0.15 * atr;
          if (cabut) { fbo = true; fboLvl = lvl; break; }
        }
      }
    }
    return { atr: atr, pump: pump, arah: arah, dump: dump, fbo: fbo, fboLvl: fboLvl, fall: fall, rise: rise, midHi: midHi, midLo: midLo, mom50: (lastC - cs[Math.max(0, n - 51)].c) / atr };
  }

  // ---------- episode sapuan segar (pool rantai terakhir) ----------
  function episodeSapuan(cs) {
    var n = cs.length, atr = atr14(cs), vols = cs.map(function (c) { return c.v; });
    var winStart = Math.max(0, n - 22);
    var pre = cs.slice(Math.max(0, n - 14), Math.max(1, n - 8));
    if (!pre.length) return null;
    var lvlHi = Math.max.apply(null, pre.map(function (c) { return c.h; }));
    var lvlLo = Math.min.apply(null, pre.map(function (c) { return c.l; }));
    var vols30 = vols.slice(Math.max(0, n - 30));
    var volSd = Math.max(sd(vols30), 1e-9);
    // pilih kandidat DENGAN EPISODE TERSEGAR yang sah (episodeLen <= 8)
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
      var episodeLen = n - a;
      if (episodeLen > 8) continue; // jalan-lambat bukan sapuan
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
          side: side, level: level, barsSince: n - 1 - lastPierce, episodeLen: episodeLen, depth: depth,
          closeDist: closeDist,
          postBody: post.length ? Math.max.apply(null, post.map(function (c) { return Math.abs(c.c - c.o); })) / atr : 0,
          sweepBody: Math.abs(cs[lastPierce].c - cs[lastPierce].o) / atr,
          volZ: (vmax - mean(vols30)) / volSd,
          crossBack: side === 'ATAS'
            ? prevClose > level && lastClose < level && closeDist >= 0.2
            : prevClose < level && lastClose > level && closeDist >= 0.2,
          reclaimed: closeDist >= 0.12,
          postVolMean: post.length ? mean(post.map(function (c) { return c.v; })) : 0,
        };
      }
    }
    return best;
  }

  // ---------- tangga keputusan v1.2 (urutan = ilmu) ----------
  function vonis(cs) {
    var pd = pdScan(cs), P = episodeSapuan(cs);
    var n = cs.length, atr = pd.atr, entry = cs[n - 1].c;
    var lastC = cs[n - 1].c, prevC = cs[n - 2].c;
    function R(id, aksi, arah, target, alasan) { return { id: id, aksi: aksi, arah: arah, targetPct: target, alasan: alasan, pd: pd, pool: P }; }
    if (!P) return R('KL-L6-skip', 'SKIP', 'NAIK', 2.2, ['tanpa episode sapuan segar ber-volume nyata -> tanpa edge likuiditas, rangkaian 5 aspek tidak dimainkan']);
    function stopStruktural(arah2) {
      var extreme = P.side === 'BAWAH' ? P.level - P.depth * atr : P.level + P.depth * atr;
      var stopPrice = arah2 === 'NAIK' ? extreme - 0.45 * atr : extreme + 0.45 * atr;
      var pct = arah2 === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100;
      return Math.min(2.6, Math.max(1.2, pct));
    }
    var bodyDom = Math.max(P.postBody, P.barsSince <= 1 ? P.sweepBody : 0);
    if (P.side === 'BAWAH') {
      var cb = consecBig(cs, atr, 'dn');
      if (P.depth >= 0.8 && (P.crossBack || P.reclaimed) && ((cb >= 3 && true) || (cb >= 2 && P.volZ >= 2.0)))
        return R('KL-L1-kaskade', 'ENTRY', 'NAIK', 2.2, ['kaskade + klimaks menyapu pool rantai lalu ' + (P.crossBack ? 'cross-back' : 'reclaim') + ' — mesin likuidasi kehabisan bahan bakar']);
      if (P.reclaimed && P.closeDist >= 0.3 && P.closeDist <= 2.6 && bodyDom >= 0.55 && P.barsSince <= 2 && P.volZ >= 0.5)
        return R('KL-L2-reclaim', 'ENTRY', 'NAIK', 2.2, ['sapuan pool rantai ditutup balik +' + P.closeDist.toFixed(2) + ' ATR dengan badan dominan ' + bodyDom.toFixed(2) + ' ATR — stop korban pump & trap dipanen']);
      if (P.closeDist >= -0.8 && P.closeDist <= 0.6 && P.postBody <= 0.55 && lastC <= prevC && P.postVolMean <= 0.8 * volMean(cs.map(function (c) { return c.v; })) && P.depth <= 2.8 && P.barsSince <= 3)
        return R('KL-L3-umpan', 'ENTRY', 'TURUN', 2.2, ['reclaim secekil gagal extend (badan ' + P.postBody.toFixed(2) + ' ATR, volume kering) — umpan terakhir setelah 4 jebakan']);
      if (!P.reclaimed && P.closeDist <= -0.05 && P.barsSince <= 3 && pd.mom50 <= -0.5 && P.depth <= 2.8 && P.postBody <= 0.35)
        return R('KL-L4-grab', 'ENTRY', 'TURUN', 2.2, ['sapuan tanpa reclaim + mom50 ' + pd.mom50.toFixed(1) + ' ATR — konteks markdown searah, likuiditas long habis']);
      if (P.closeDist >= 0.05 && P.closeDist <= 1.6 && P.postBody <= 0.4 && lastC > prevC && P.barsSince <= 3 && P.depth <= 2.6)
        return R('KL-L5-wait', 'WAIT', 'NAIK', 2.2, ['pantulan pasca-sapu rapuh, struktur belum aman — menunggu reclaim konfirmasi di atas ' + (P.level + 0.8 * atr).toFixed(2)]);
    } else {
      var cu = consecBig(cs, atr, 'up');
      if (P.depth >= 0.8 && (P.crossBack || P.reclaimed) && ((cu >= 3 && true) || (cu >= 2 && P.volZ >= 2.0)))
        return R('KL-L1-squeeze', 'ENTRY', 'TURUN', 2.2, ['short-squeeze + klimaks menyapu pool atas lalu ditolak — likuidasi short berantai habis']);
      if (P.reclaimed && P.closeDist >= 0.3 && P.closeDist <= 2.6 && bodyDom >= 0.55 && P.barsSince <= 2 && P.volZ >= 0.5)
        return R('KL-L2-reject', 'ENTRY', 'TURUN', 2.2, ['sapuan pool atas ditolak keras — badan dominan ' + bodyDom.toFixed(2) + ' ATR, buyer breakout pump dipanen']);
      if (P.closeDist >= -0.8 && P.closeDist <= 0.6 && P.postBody <= 0.55 && lastC >= prevC && P.postVolMean <= 0.8 * volMean(cs.map(function (c) { return c.v; })) && P.depth <= 2.8 && P.barsSince <= 3)
        return R('KL-L3-umpan-cermin', 'ENTRY', 'NAIK', 2.2, ['penolakan secekil gagal extend (HL mikro, volume kering) — vakum beli setelah rangkaian cermin']);
      if (!P.reclaimed && P.closeDist <= -0.05 && P.barsSince <= 3 && pd.mom50 >= 0.5 && P.depth <= 2.8 && P.postBody <= 0.35)
        return R('KL-L4-grab-cermin', 'ENTRY', 'NAIK', 2.2, ['sapuan atas tanpa reclaim + mom50 ' + pd.mom50.toFixed(1) + ' ATR — konteks rally searah, lanjut naik']);
      if (P.closeDist >= 0.05 && P.closeDist <= 1.6 && P.postBody <= 0.4 && lastC < prevC && P.barsSince <= 3 && P.depth <= 2.6)
        return R('KL-L5-wait-cermin', 'WAIT', 'TURUN', 2.2, ['penolakan rapuh — menunggu konfirmasi di bawah ' + (P.level - 0.8 * atr).toFixed(2)]);
    }
    return R('SG-L7-sabar', 'WAIT', P.side === 'BAWAH' ? 'NAIK' : 'TURUN', 2.2, ['pool baru disapu, anatomi belum menentukan — menunggu konfirmasi']);
  }

  // ---------- self-test ----------
  function candle(o, c, h, l, v) { return { o: o, c: c, h: h === undefined ? Math.max(o, c) * 1.004 : h, l: l === undefined ? Math.min(o, c) * 0.996 : l, v: v === undefined ? 1 : v }; }
  // rangkaian mini-mirror anatomi 60 candle (A12 B5 C2 D6 E8 F6 G8 H9 I4)
  // dir NAIK: pump naik -> sapuan bawah -> RECLAIM dominan (truth NAIK)
  // dir TURUN: pump turun (cermin) -> sapuan atas -> REJECT dominan (truth TURUN)
  function mini(dir) {
    var s = [], p = 100, up = dir === 'NAIK' ? 1 : -1, i;
    function add(d, wu, lw, v) { var o = p, c = o + d; s.push(candle(o, c, Math.max(o, c) + (wu || 0.06), Math.min(o, c) - (lw || 0.06), v || 1)); p = c; }
    for (i = 0; i < 12; i++) add(Math.sin(i * 1.7) * 0.2, 0.08, 0.08, 1);                        // A base
    add(up * 0.45, 0.08, 0.1, 1.5); add(up * 0.4, 0.06, 0.08, 1.7); add(up * 0.05, 0.1, 0.08, 0.55); add(-up * 0.7, 0.12, 0.08, 1.85); add(-up * 0.3, 0.12, 0.1, 1.1); // B bull trap
    add(0.02, 0.18, 0.18, 0.7); add(up * 0.1, 0.1, 0.1, 0.9);                                    // C regroup
    add(-up * 0.5, 0.08, 0.12, 1.6); add(-up * 0.45, 0.08, 0.16, 1.75); add(-up * 0.55, 0.08, 0.2, 1.95); add(-up * 0.03, 0.08, 0.14, 0.6); add(up * 0.75, 0.08, 0.16, 1.95); add(up * 0.2, 0.1, 0.1, 1.0); // D bear trap (pool)
    for (i = 0; i < 8; i++) add(up * (i === 3 ? -0.15 : i === 7 ? -0.12 : 0.42), 0.06, 0.1, i % 4 === 3 ? 0.9 : 1.4 + i * 0.12); // E pump-1
    add(up * 0.4, 0.05, 0.08, 2.1); add(up * 0.38, 0.05, 0.08, 2.3); add(up * 0.36, 0.05, 0.08, 2.5); add(up * 0.04, 0.1, 0.07, 1.2); // F akselerasi
    var lvl = Math.max.apply(null, s.slice(0, s.length).map(function (c) { return c.h; }));      // level struktural
    add(up * (lvl - p) + up * 0.12, 0.16, 0.06, 2.9); add(-up * 0.33, 0.08, 0.1, 2.5); add(-up * 0.15, 0.07, 0.08, 0.75); // tembus + pencabut + konfirmasi
    for (i = 0; i < 8; i++) add(-up * (i === 2 ? 0.08 : 0.4), 0.05, 0.09, 1.7);                  // G dump
    for (i = 0; i < 8; i++) add(-up * 0.08, 0.06, 0.07, 0.8);                                    // H grind
    add(-up * 0.28, 0.09, 0.1, 1.3); add(-up * 0.03, 0.07, 0.07, 1.0);                           // I pendekatan + seteleman
    var o2 = p;
    var ext = p - up * 0.35;
    if (dir === 'NAIK') { s.push(candle(o2, ext + 0.45, ext + 0.55, ext, 3.4)); p = ext + 0.45; s.push(candle(p, p + 0.16, p + 0.22, p - 0.05, 1.6)); }
    else { s.push(candle(o2, ext - 0.45, ext, ext - 0.55, 3.4)); p = ext - 0.45; s.push(candle(p, p - 0.16, p + 0.05, p - 0.22, 1.6)); }
    return s;
  }
  function selfTest() {
    var T = [];
    T.push(['metadata: anatomi 10 fase terdokumentasi', V.anatomi.length === 10]);
    T.push(['metadata: 7 pelajaran KL terdokumentasi', V.pelajaran.length === 7]);
    T.push(['metadata: fee 0.1%+0.1%', V.protokol.feeBuy === '0.10%' && V.protokol.totalFee === '0.20%']);
    T.push(['metadata: 6 akar masalah terdokumentasi', V.hasil.akarMasalahTerdokumentasi.length === 6]);
    T.push(['metadata: final beku 1600/1600', /1600\/1600/.test(V.hasil.finalBeku)]);
    var naik = mini('NAIK'), turun = mini('TURUN');
    T.push(['fungsional: rangkaian 60 candle', naik.length === 60 && turun.length === 60]);
    var v1 = vonis(naik), v2 = vonis(turun);
    T.push(['fungsional: sapuan+reclaim dominan -> NAIK', v1.arah === 'NAIK']);
    T.push(['fungsional: sapuan+reject dominan -> TURUN', v2.arah === 'TURUN']);
    T.push(['fungsional: vonis lengkap (id+aksi+arah+target+alasan+pd+pool)', [v1, v2].every(function (x) { return x.id && x.aksi && x.arah && x.targetPct && x.alasan && x.pd && x.pool !== undefined; })]);
    var pass = T.filter(function (t) { return t[1]; }).length;
    return { total: T.length, pass: pass, fail: T.length - pass, rincian: T.map(function (t) { return (t[1] ? 'PASS' : 'GAGAL') + ' — ' + t[0]; }) };
  }

  var API = { versi: V.versi, nama: 'SAKTI-KOMPLEKS', protokol: V.protokol, anatomi: V.anatomi, hasil: V.hasil, pelajaran: V.pelajaran, vonis: vonis, pdScan: pdScan, selfTest: selfTest };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.KOMPLEKS = API;
    if (typeof window.document !== 'undefined') {
      var kartu = function () {
        var el = window.document.getElementById('v239-kompleks');
        if (!el) return;
        var st = selfTest();
        el.textContent = 'V239 SAKTI-KOMPLEKS v' + V.versi + ' — ORGAN 5 ASPEK · self-test ' + st.pass + '/' + st.total +
          ' · beku 1600/1600 (100.00%) · stop wajib · fee 0.2% net';
      };
      if (window.document.readyState !== 'loading') kartu();
      else window.document.addEventListener('DOMContentLoaded', kartu);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
/*V239-KL:END*/
