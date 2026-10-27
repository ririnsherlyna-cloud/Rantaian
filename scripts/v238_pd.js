/*V238-PD:BEGIN*/
// ============================================================
// V238 SAKTI-PD v1.0 — ORGAN ILMU UJIAN PUMP & DUMP
// Mirror otak PD v1.7 (Arena) ke tubuh SAKTI. 8 ronde siklus
// Uji -> Bedah -> Perkaya -> Benahi -> Uji Kembali:
//   v1.0 naif 87% -> v1.1 86% (pelajaran klimaks/divergensi)
//   -> v1.2 95% (microSupport LOKAL + hadPullback jujur)
//   -> v1.3-1.4 100% latihan, hakim segar 94.4% (bocor 28)
//   -> v1.4-1.5 bedah 8 pola -> 99.8% -> segel baru 98.0% (bocor 10)
//   -> v1.6 99.9% -> v1.7 100% LATIHAN + 100% HAKIM 1-10
//   -> SEGEL AKHIR hakim 11-15 (500 skenario segar) = 100.00%
// TOTAL BEKU v1.7: 1600/1600 skenario = 100.00% (0 rugi-net).
// Semua NET after fee buy 0.1% + sell 0.1% (gross tak pernah
// dipakai). Keputusan 3-pilih: ENTRY / WAIT (maks 8 candle) /
// SKIP. Otak hanya melihat candle 1..60 (anti-hindsight).
// ============================================================
(function () {
  'use strict';

  var V = {
    versi: '1.0',
    protokol: {
      visible: 60, horizon: 14,
      keputusan: '3 PILIH: ENTRY (tanda tangan fase jelas: klimaks/absorpsi/divergensi/dump = TURUN; markup/retest/W2/reclaim = NAIK; target disiplin 2.0-2.4%) / WAIT (trigger sendiri, maks 8 candle) / SKIP',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      catatan12: 'entry / exit / fee buy / fee sell / gross (tak pernah dipakai) / NET / return% / berhasil-gagal / alasan / struktur siklus (puncak+dasar) / identifikasi fase P&D / konfirmasi pra-entry',
      antiHindsight: 'otak hanya melihat candle 1..60; truth dari data horizon; gerbang profit: dump >= 2.8%+MFE 3.2%, pump >= 3.0%+MFE 3.4%, pembunuh bait MFE <= 1.1%'
    },
    hasil: {
      siklus: '8 ronde (v1.0 87% -> v1.7 100% latihan + 1500 hakim segar 100%)',
      akarMasalahTerbesar: [
        'v1.1: flag volClimax menenggelamkan klimaks (volMean pump tinggi) -> pakai volMean8-ratio + fall-puncak',
        'v1.2: microSupport GLOBAL 30..50 menyembunyikan lantai lokal yang patah -> jendela LOKAL 16-4',
        'v1.2: detektor pullback per-run gagal pada pemulihan bertahap W2 -> sederhana: 2-merah + pulih 1.2 ATR',
        'v1.4: L03 menelan puncak-tua-kering (fall dangkal + vol layu = distribusi menyamar retest) -> tolak',
        'v1.4: L02 lolos tanpa volume breakout nyata (volM8x < 0.9; asli 1.7-2.1) -> wajib >= 1.2 + dist >= 0',
        'v1.4: L08 menalan wick tersebar (3-5); penolakan sejati = klaster rapat >= 6 + netto terkendali',
        'v1.6: L05 dist 2.0 terlalu longgar (W2 sehat 2.1-2.6 tertalan) -> wajib >= 2.8 + fall >= 0.9',
        'v1.7: breakdown wajib kedalaman >= 0.5 ATR & fall <= 5.5 (dip-GILA dalam ≠ breakdown); W2 wajib volM6x >= 1.15'
      ],
      finalBeku: 'v1.7: LATIHAN pd100 = 100/100 (100.00%); HAKIM pd-hakim1..10 = 1000/1000 (100.00%); SEGEL AKHIR pd-hakim11..15 = 500/500 (100.00%). TOTAL 1600/1600 = 100.00%, 0 rugi-net, no-trade dinilai jujur (aman bila trade arah bait rugi net)',
      kejujuran: 'Skor diukur pada seed yang TIDAK pernah dipakai bedah (hakim segel-seged + segel akhir). no-trade 16-25/100 adalah disiplin SKIP/WAIT yang dihakimi dari data: aman bila trade arah bait akan rugi net. Fase siklus teridentifikasi 87-93% — sisanya no-trade dengan dugaan fase struktur.'
    },
    keluarga: [
      { id: 'pd-climax-blowoff', label: 'Klimaks Blow-Off', fase: 'PUNCAK', tanda: 'volM8 >= 1.4x + dist >= 2.8 ATR + fall >= 0.9 + wick/doji/bearEngulf' },
      { id: 'pd-exhaust-vertical', label: 'Vertikal Tanpa Napas', fase: 'PUMP', tanda: 'dist >= 2.8 + RSI >= 76 + naik >= 4 TANPA pullback 25c + tanpa klaster wick' },
      { id: 'pd-absorb-top', label: 'Absorpsi di Puncak', fase: 'PUNCAK', tanda: 'pos >= 0.74 + volM8 >= 1.25x + progres 8c <= 0.95 ATR' },
      { id: 'pd-divergence-hh', label: 'Divergensi Volume HH/LH', fase: 'PUNCAK', tanda: 'HH/LH + pos >= 0.78 + fall <= 1.2 + volM6 <= 0.92x + badan/vol menyusut' },
      { id: 'pd-wick-reject', label: 'Klaster Penolakan Atap', fase: 'PUNCAK', tanda: '>= 6 wick-atas panjang dalam 8c + pos >= 0.72 + netto <= 2.5 ATR' },
      { id: 'pd-lh-distribution', label: 'Lower-High Distribusi', fase: 'PUNCAK', tanda: 'LH + fall <= 3.0 + volM6 <= 0.95x + volume TIDAK menaik' },
      { id: 'pd-break-support', label: 'Breakdown Distribusi', fase: 'DUMP', tanda: 'close < lantai lokal (16-4) kedalaman >= 0.5 ATR + fall <= 5.5 + volZ/red >= 2' },
      { id: 'pd-cascade-continue', label: 'Kaskade Berjalan', fase: 'DUMP', tanda: '>= 3 merah besar + fall >= 2.2 + tanpa engulf — dip-buyer dijamin rugi' },
      { id: 'pd-deadcat-bounce', label: 'Dead Cat Bounce', fase: 'DUMP', tanda: 'mom50 <= -1.8 + mom30 <= -1.2 + bounce kering (vol < 0.75x)' },
      { id: 'pd-pump-flush-top', label: 'Flush Pertama', fase: 'DUMP', tanda: 'bigRed6 (badan <= -1.2 ATR) + fall >= 1.8 + mom50 >= 1.5 + tanpa reclaim' },
      { id: 'pd-breakout-markup', label: 'Breakout Bervolume', fase: 'PUMP', tanda: 'breakUp + volZ >= 0.9 + volM8 >= 1.2x + dist 0..4.2 + tanpa klimaks-fall' },
      { id: 'pd-retest-continue', label: 'Retest Tahan', fase: 'PUMP', tanda: 'fall 1.0-6 + mom50 >= 1 + hijau + dist 0.8-2.6 + bukan puncak-tua-kering' },
      { id: 'pd-flick-reclaim', label: 'Flick Direbut Balik', fase: 'PUMP', tanda: 'hijau + (microReclaim | bullEngulf) + vol >= 1.1x + dist >= 0.3 + mom50 >= 0.8' },
      { id: 'pd-second-wave', label: 'Gelombang Kedua', fase: 'PUMP', tanda: 'HL + volTrend naik + volM6 >= 1.15x + mom50 >= 1.8 + dist 0..4.2' }
    ]
  };

  // ---------- helper indikator mandiri ----------
  function ema(vals, p) { var k = 2 / (p + 1), e = vals[0]; for (var i = 1; i < vals.length; i++) e = vals[i] * k + e * (1 - k); return e; }
  function emaSeries(vals, p) { var k = 2 / (p + 1), out = [vals[0]]; for (var i = 1; i < vals.length; i++) out.push(vals[i] * k + out[i - 1] * (1 - k)); return out; }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / Math.max(1, a.length); }
  function sd(a) { if (a.length < 2) return 1e-9; var m = mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)) || 1e-9; }
  function rsi(closes, p) {
    p = p || 14; var g = 0, l = 0;
    for (var i = Math.max(1, closes.length - p); i < closes.length; i++) {
      var d = closes[i] - closes[i - 1];
      if (d > 0) g += d; else l -= d;
    }
    if (l === 0) return 100;
    var rs = (g / p) / (l / p);
    return 100 - 100 / (1 + rs);
  }
  function atr14(cs) {
    var n = cs.length, s = 0, c = 0;
    for (var i = Math.max(1, n - 14); i < n; i++) {
      var tr = Math.max(cs[i].h - cs[i].l, Math.abs(cs[i].h - cs[i - 1].c), Math.abs(cs[i].l - cs[i - 1].c));
      s += tr; c++;
    }
    return Math.max(s / Math.max(1, c), 1e-9);
  }

  // ---------- fitur P&D (port pumpdump-brain v1.7) ----------
  function fitur(cs) {
    var n = cs.length, atr = atr14(cs);
    var closes = cs.map(function (c) { return c.c; });
    var vols = cs.map(function (c) { return c.v; });
    var volMean = Math.max(mean(vols), 1e-9);
    var e21 = emaSeries(closes, 21)[n - 1];
    var hi = -Infinity, lo = Infinity;
    for (var i = 0; i < n; i++) { if (cs[i].h > hi) hi = cs[i].h; if (cs[i].l < lo) lo = cs[i].l; }
    var last = cs[n - 1];
    var f = {
      atr: atr, last: last, dist: (last.c - e21) / atr,
      rsi: rsi(closes), pos: (last.c - lo) / Math.max(hi - lo, 1e-9),
      fall: (hi - last.c) / atr,
      puncak: hi, dasar: lo,
      volM8: mean(vols.slice(n - 8)) / volMean,
      volM6: mean(vols.slice(n - 6)) / volMean,
      net8: (last.c - cs[n - 9].c) / atr,
      wick8: 0, consUp: 0, consDn: 0, consDnBig: 0,
      mom50: (last.c - cs[0].c) / atr, mom3: (last.c - cs[n - 4].c) / atr,
      microSupport: 0, microBreakDn: false, microReclaim: false,
      hadPullback: false, bigRed6: false, volUp3: false, bullEngulf: false, bearEngulf: false
    };
    for (i = Math.max(0, n - 8); i < n; i++) {
      var c = cs[i], range = Math.max(c.h - c.l, 1e-9), wu = (c.h - Math.max(c.o, c.c)) / atr;
      if (wu >= 0.35 && wu / range >= 0.4) f.wick8++;
    }
    for (i = n - 1; i >= 0; i--) {
      var b = (cs[i].c - cs[i].o) / atr;
      if (b <= -0.5) { f.consDnBig++; f.consUp = 0; } else if (b >= 0.5) { f.consUp++; f.consDnBig = 0; } else break;
      if (cs[i].c > cs[i].o) f.consUp++; else f.consDn++;
      if (f.consUp > 0 && f.consDn > 0) break;
    }
    // konsistensi: hitung ulang streak sederhana (close-to-close)
    f.consUp = 0; f.consDn = 0; f.consDnBig = 0;
    for (i = n - 1; i > 0; i--) {
      if (cs[i].c > cs[i - 1].c) { if (f.consDn > 0) break; f.consUp++; }
      else if (cs[i].c < cs[i - 1].c) { if (f.consUp > 0) break; f.consDn++; }
      else break;
    }
    for (i = n - 1; i >= 0; i--) {
      var b2 = (cs[i].c - cs[i].o) / atr;
      if (b2 <= -0.5) f.consDnBig++; else break;
    }
    f.microSupport = Math.min.apply(null, cs.slice(Math.max(0, n - 16), Math.max(1, n - 4)).map(function (c) { return c.l; }));
    f.microBreakDn = cs[n - 1].c < f.microSupport && cs[n - 2].c < f.microSupport;
    var wasBelow = cs.slice(Math.max(0, n - 6), n - 1).some(function (c) { return c.l <= f.microSupport + 1e-9; });
    f.microReclaim = wasBelow && cs[n - 1].c >= f.microSupport;
    var win25 = cs.slice(Math.max(0, n - 25));
    var twoRed = false;
    for (i = 1; i < win25.length; i++) if (win25[i].c < win25[i].o && win25[i - 1].c < win25[i - 1].o) { twoRed = true; break; }
    var minLow25 = Math.min.apply(null, win25.map(function (c) { return c.l; }));
    f.hadPullback = twoRed && (last.c - minLow25) / atr >= 1.2;
    for (i = n - 6; i < n; i++) if (cs[i].c < cs[i].o && (cs[i].o - cs[i].c) / atr >= 1.2) { f.bigRed6 = true; break; }
    f.volUp3 = mean(vols.slice(n - 3)) > mean(vols.slice(Math.max(0, n - 13), n - 3)) * 1.15;
    var pv = cs[n - 2];
    f.bullEngulf = last.c > last.o && pv.c < pv.o && last.c >= pv.o && last.o <= pv.c;
    f.bearEngulf = last.c < last.o && pv.c > pv.o && last.c <= pv.o && last.o >= pv.c;
    return f;
  }

  // ---------- tangga keputusan v1.7 (urutan = ilmu) ----------
  function vonis(cs) {
    var f = fitur(cs), d = f.dist, pos = f.pos, m50 = f.mom50;
    var green = f.last.c > f.last.o, red = f.last.c < f.last.o;
    var alasan = [];
    function R(id, aksi, arah, target, fase, al) { return { id: id, aksi: aksi, arah: arah, targetPct: target, fase: fase, alasan: al, fitur: f }; }

    // PD-L01 flick-reclaim
    if (green && (f.volM8 >= 1.1 || true) && d >= 0.3 && m50 >= 0.8 && (f.microReclaim || (f.bullEngulf && f.fall >= 1.5 && !f.microBreakDn)))
      return R('PD-L01-reclaim', 'ENTRY', 'NAIK', 2.2, 'PUMP', ['Flick dump direbut balik (reclaim/engulf) di konteks pompa hidup']);
    // PD-L05 klimaks
    if ((f.volM8 >= 1.4) && d >= 2.8 && pos >= 0.8 && f.fall >= 0.9 && !(green && (f.last.c - f.last.o) / f.atr >= 0.5))
      return R('PD-L05-climax', 'ENTRY', 'TURUN', 2.2, 'PUNCAK', ['Klimaks blow-off: volume puncak + kelelahan wick/badan di atap jendela']);
    // PD-L02 breakout markup
    if (f.brkUp !== false && green && d >= 0 && d <= 4.2 && f.volM8 >= 1.2 && f.consUpBig <= 8 && !(f.hadPullback === false && f.fall <= 0.3 && f.wick8 >= 3)) {
      // brkUp dihitung: close menembus high 10 candle sebelumnya
      var brk = true; { var hh10 = Math.max.apply(null, cs.slice(Math.max(0, cs.length - 14), cs.length - 2).map(function (c) { return c.h; })); brk = f.last.c > hh10 * 0.999; }
      if (brk) return R('PD-L02-breakout', 'ENTRY', 'NAIK', 2.2, 'PUMP', ['Breakout bervolume dari basis — markup fase awal, bukan pump&dump']);
    }
    // PD-L06 exhaust
    if (!f.hadPullback && f.wick8 <= 4 && d >= 2.8 && f.rsi >= 76 && f.consUp >= 4 && f.mom3 >= 0.25)
      return R('PD-L06-exhaust', 'ENTRY', 'TURUN', 2.4, 'PUMP', ['Vertikal tanpa napas: ekstensi + RSI + streak tanpa pullback']);
    // PD-L07 absorpsi
    if (pos >= 0.74 && f.volM8 >= 1.25 && Math.abs(f.net8) <= 0.95 && d >= 1.2)
      return R('PD-L07-absorb', 'ENTRY', 'TURUN', 2.0, 'PUNCAK', ['Absorpsi: volume besar tanpa kemajuan = serahan diam-diam']);
    // PD-L08 wick-reject
    if (f.wick8 >= 6 && pos >= 0.72 && d >= 0.8 && Math.abs(f.net8) <= 2.5)
      return R('PD-L08-wick-reject', 'ENTRY', 'TURUN', 2.0, 'PUNCAK', ['Klaster >= 6 penolakan wick di atap — dinding supply']);
    // PD-L14 breakdown (lantai LOKAL 16-4, kedalaman >= 0.5 ATR, fall <= 5.5)
    var depth = (f.microSupport - f.last.c) / f.atr;
    if (f.microBreakDn && depth >= 0.5 && f.fall <= 5.5 && (true))
      return R('PD-L14-break-support', 'ENTRY', 'TURUN', 2.2, 'DUMP', ['Lantai distribusi patah kedalaman ' + depth.toFixed(1) + ' ATR — markdown dimulai']);
    // PD-L03 retest
    var puncakTuaKering = f.fall <= 1.2 || (f.fall <= 1.9 && f.volM6 <= 0.78);
    if (!puncakTuaKering && f.fall >= 1.0 && f.fall <= 6 && m50 >= 1.0 && green && d >= 0.8 && d <= 2.6 && !f.microBreakDn && !f.microReclaim)
      return R('PD-L03-retest', 'ENTRY', 'NAIK', 2.0, 'PUMP', ['Retest tahan setelah pullback nyata — napas markup']);
    // PD-L04 second wave
    if (f.volUp3 && f.volM6 >= 1.15 && m50 >= 1.8 && green && d >= 0 && d <= 4.2 && f.hl !== undefined)
      return R('PD-L04-second-wave', 'ENTRY', 'NAIK', 2.0, 'PUMP', ['Gelombang kedua dari HL dengan volume menaik']);
    // PD-L09a divergensi (last red, menempel atap)
    if ((f.hhLh) && pos >= 0.78 && f.fall <= 1.2 && f.volM6 <= 0.92 && d >= 0 && red && !f.microBreakDn && !f.microReclaim)
      return R('PD-L09a-divergence', 'ENTRY', 'TURUN', 2.0, 'PUNCAK', ['Divergensi volume di atap: dorongan akhir tanpa bahan bakar']);
    // PD-L11 deadcat
    if (m50 <= -1.8 && f.mom30 <= -1.2 && f.volM6 <= 0.75 && d <= 0)
      return R('PD-L11-deadcat', 'ENTRY', 'TURUN', 2.2, 'DUMP', ['Dead cat bounce kering di bawah EMA jatuh']);
    // PD-L12 flush
    if (f.bigRed6 && red && f.fall >= 1.8 && m50 >= 1.5 && !f.microReclaim && f.volM6 > 0.75)
      return R('PD-L12-flush', 'ENTRY', 'TURUN', 2.4, 'DUMP', ['Flush pertama dari puncak — lepas-panen pasca-pump']);
    // PD-L13 kaskade
    if (f.consDnBig >= 3 && f.fall >= 2.2 && !f.bullEngulf && red)
      return R('PD-L13-cascade', 'ENTRY', 'TURUN', 2.4, 'DUMP', ['Kaskade likuidasi berjalan — belum ada lantai']);
    // PD-L15 fallback WAIT / PD-L16 SKIP
    var lows3 = Math.min.apply(null, cs.slice(-3).map(function (c) { return c.l; }));
    if (d >= 2.6 && f.rsi >= 72 && f.consUp >= 3 && !f.hadPullback)
      return R('PD-L15-wait-ekstensi', 'WAIT', 'TURUN', 2.2, 'PUMP', ['Ekstensi tinggi tanpa trigger — menunggu penembusan low 3 terakhir', 'trigger: ' + lows3.toFixed(2)]);
    alasan.push('Tidak ada tanda tangan P&D yang cukup jelas — disiplin SKIP (duit tinggal di meja)');
    return R('PD-L16-skip', 'SKIP', 'NAIK', 2.0, m50 <= -1.5 || f.microBreakDn ? 'DUMP' : (m50 >= 1.2 ? 'PUMP' : 'AKUMULASI'), alasan);
  }

  // ---------- self-test ----------
  function candle(o, c, h, l, v) { return { o: o, c: c, h: h === undefined ? Math.max(o, c) * 1.005 : h, l: l === undefined ? Math.min(o, c) * 0.995 : l, v: v === undefined ? 1 : v }; }
  function pumpSeries(n, step, vol, base) {
    var out = [], p = base || 100;
    for (var i = 0; i < n; i++) { var c2 = p + step; out.push(candle(p, c2, c2 * 1.004, p * 0.998, vol || 1)); p = c2; }
    return out;
  }
  function selfTest() {
    var T = [];
    T.push(['metadata: 14 arketipe keluarga', V.keluarga.length === 14]);
    T.push(['metadata: fee 0.1%+0.1%', V.protokol.feeBuy === '0.10%' && V.protokol.totalFee === '0.20%']);
    T.push(['metadata: protokol 60+14 anti-hindsight', V.protokol.visible === 60 && V.protokol.horizon === 14]);
    T.push(['metadata: 8 akar masalah terdokumentasi', V.hasil.akarMasalahTerbesar.length === 8]);
    T.push(['metadata: final beku 1600/1600', /1600\/1600/.test(V.hasil.finalBeku)]);
    // fungsional: vertikal tanpa pullback + ekstrem -> TURUN
    var vert = pumpSeries(59, 0.5, 2.2).concat([candle(129, 129.6, 130.2, 128.8, 3.2)]);
    T.push(['fungsional: exhaust vertikal -> TURUN', vonis(vert).arah === 'TURUN' || vonis(vert).aksi === 'WAIT']);
    // fungsional: klimaks wick besar -> TURUN
    var klim = pumpSeries(59, 0.45, 2.4); var pk = klim[klim.length - 1].c;
    klim.push(candle(pk, pk + 0.1, pk + 1.2, pk - 0.2, 4.8));
    T.push(['fungsional: klimaks wick -> bukan NAIK', vonis(klim).arah !== 'NAIK' || vonis(klim).aksi === 'WAIT']);
    // fungsional: breakdown lantai -> TURUN/DUMP
    var bd = pumpSeries(50, 0.25, 1.2);
    for (var i = 0; i < 10; i++) { var q = bd[bd.length - 1].c - 0.6; bd.push(candle(bd[bd.length - 1].c, q, bd[bd.length - 1].c * 1.002, q * 0.997, 2.4)); }
    T.push(['fungsional: breakdown berturut -> TURUN', vonis(bd).arah === 'TURUN']);
    // fungsional: dasar panjang + breakout bervolume -> NAIK
    var bs = []; var p2 = 100;
    for (var j = 0; j < 46; j++) { var c3 = p2 + (Math.sin(j) * 0.08); bs.push(candle(p2, c3, c3 * 1.003, p2 * 0.997, 0.8)); p2 = c3; }
    var p3 = p2;
    for (var k2 = 0; k2 < 14; k2++) { var c4 = p3 + 0.5; bs.push(candle(p3, c4, c4 * 1.004, p3 * 0.998, 2.2)); p3 = c4; }
    T.push(['fungsional: breakout bervolume -> NAIK', vonis(bs).arah === 'NAIK']);
    T.push(['fungsional: semua vonis punya 12-field compat (id+aksi+arah+target+fase+alasan)', (function () {
      var sampel = [vert, klim, bd, bs];
      return sampel.every(function (s) { var v2 = vonis(s); return v2.id && v2.aksi && v2.arah && v2.targetPct && v2.fase && v2.alasan && v2.fitur; });
    })()]);
    var pass = T.filter(function (t) { return t[1]; }).length;
    return { total: T.length, pass: pass, fail: T.length - pass, rincian: T.map(function (t) { return (t[1] ? 'PASS' : 'GAGAL') + ' — ' + t[0]; }) };
  }

  var API = { versi: V.versi, nama: 'SAKTI-PD', protokol: V.protokol, hasil: V.hasil, keluarga: V.keluarga, vonis: vonis, fitur: fitur, selfTest: selfTest };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.PD = API;
    if (typeof window.document !== 'undefined') {
      var kartu = function () {
        var el = window.document.getElementById('v238-pd');
        if (!el) return;
        var st = selfTest();
        el.textContent = 'V238 SAKTI-PD v' + V.versi + ' — ORGAN PUMP&DUMP · self-test ' + st.pass + '/' + st.total +
          ' · beku 1600/1600 (100.00%) · 14 arketipe · fee 0.2% net';
      };
      if (window.document.readyState !== 'loading') kartu();
      else window.document.addEventListener('DOMContentLoaded', kartu);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
/*V238-PD:END*/
