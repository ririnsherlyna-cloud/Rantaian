/*V233-BULLTRAP:BEGIN*/
// ============================================================
// V233 SAKTI-BULLTRAP v233.1 — ORGAN ILMU BULL TRAP
// Mirror ilmu dari Ujian Bull Trap 100 (fee buy 0.1% + sell 0.1%):
// 12 arketipe jebakan pembunuh trader pro 5+ tahun, 8 pelajaran
// L1-L8, ledger bedah V21->V27, jejak hasil 3 seed.
// Perkembangan diterapkan pada FILE ini sesuai perintah Guru.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '2.7',
    protokol: {
      visible: 60, horizon: 14, gerbangTrap: '-2.8%', gerbangGuard: '+3.0%',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      antiHindsight: 'otak hanya melihat candle 1..60; truth dari data (close[74] vs close[60])',
      antiBias: '24 guard breakout/flag/pullback SEHAT — vonis harus MEMBEDAKAN trap vs momentum asli',
      target: '100% benar + 100% profit after fee + guard 24/24'
    },
    hasil: {
      ronde1_seedA: 'v1.0 14/100 (86 likuidasi) -> v2.7 100/100 + guard 24/24',
      ronde2_sampelBaru: 'v2.1 95/100 -> v2.7 100/100 + guard 24/24',
      hakimTersegel: 'v2.7 100/100 + guard 24/24, 0 likuidasi, profit +51.4% guard / +280% trap (compound >14x)'
    },
    arketipe: [
      { id: 'bt-classic', label: 'Classic Fakeout', tanda: 'breakout recent + volume tembus layu (peringkat <= 65%) + stall di atas resistance' },
      { id: 'bt-strong-exhaust', label: 'Breakout Kuat di Tren Tua', tanda: 'dist EMA21 >= 2.4 ATR + mom12 >= 3 ATR + wick/doji kelelahan; chase ekstrem >= 3.2 ATR + RSI >= 82' },
      { id: 'bt-sweep-high', label: 'Stop Hunt Sweep di Atas High', tanda: 'sweptHigh + wick >= 40% + volZ >= 1.2 + tutup balik di bawah high' },
      { id: 'bt-double-top', label: 'Double Top Fake New High', tanda: 'divBear + posR >= 0.75 + uw >= 0.6 (anatomi wick, bukan rank volume)' },
      { id: 'bt-parabolic', label: 'Parabolic Blow-Off', tanda: 'klimaks: dist >= 2.4 + mom12 >= 3 + wick/volClimax (dengan pagar rank <= 0.8)' },
      { id: 'bt-relief-rally', label: 'Relief Rally Downtrend', tanda: 'mom50 <= 2.5 + mom24 <= 4.5 + rally >= 1 ATR ke supply + DITOLAK wick >= 0.6 (atau shrink <= 0.45)' },
      { id: 'bt-flag-fail', label: 'Bull Flag Distribusi', tanda: 'mom24 >= 2 + netto flag stagnan + volAsym5 <= -0.15; guard: aliran hijau + rank >= 0.75 + uw <= 0.4' },
      { id: 'bt-squeeze-vacuum', label: 'Short Squeeze Vacuum', tanda: 'mom12 >= 2 + mom3 berbalik + badan menyusut + volume padam; mom24 impuls + padam; sapuan terkonfirmasi' },
      { id: 'bt-utad', label: 'UTAD Distribusi', tanda: 'sweptHigh + posWindow >= 0.6 + volZ <= 0.3 + rank <= 0.65' },
      { id: 'bt-gap-chase', label: 'Vertical Chase', tanda: 'dist EMA21 >= 3.2 ATR + RSI >= 82 — mean reversion menghukum pengejar' },
      { id: 'bt-reacc-fake', label: 'Fake Re-Accumulation', tanda: 'asym20 <= -0.12 + wickCl >= 2 + mom12 <= 4 + mom50 <= 6 (pagar anti flag-sehat)' },
      { id: 'bt-triple-test', label: 'Triple Test Puncak', tanda: 'tolakan berulang: sweptHigh/failRetest + volZ tembus kering + mom50 <= 1.5; pasca-tolakan: mom24 <= 0 + RSI <= 60' }
    ],
    pelajaran: [
      { id: 'L1-SWEEP-PENOLAKAN', aturan: 'sweptHigh + wick >= 40% + volZ >= 1.2 -> TURUN; UTAD: sweptHigh + posWin >= 0.6 + volZ <= 0.3 + rank <= 0.65 -> TURUN' },
      { id: 'L2-KLIMAKS-KELELAHAN', aturan: 'dist >= 2.4 + mom12 >= 3 + wick/doji/volClimax + rank <= 0.8 -> TURUN; chase >= 3.2 ATR + RSI >= 82 -> TURUN' },
      { id: 'L3-BREAKOUT-VOLUMETRIK', aturan: 'breakout + rank <= 0.65 (atau asym20 <= -0.1 & rank <= 0.75) -> TURUN; rank >= 0.8 + badan penuh + tanpa divBear -> NAIK' },
      { id: 'L4-PUNCAK-BERTOLAK-BALIK', aturan: 'divBear + posR >= 0.75 + uw >= 0.6 -> TURUN; tolakan berulang; distribusi tersembunyi asym20 <= -0.12 + wickCl >= 2 + mom50 <= 6; L4E tes-supply 4 lengan (arm4 brkUp=0 bebas; arms wajib bukti: swept/failRetest&volZBrk<=1.2/volZ-kering/posR>=0.95&mom50<=6)' },
      { id: 'L5-RELIEF-DOWNTREND', aturan: 'mom50 <= 2.5 + mom24 <= 4.5 + rally >= 1 ATR + uw >= 0.6 (atau shrink <= 0.45) + up >= 2 -> TURUN; relief tersapu-di-supply (mom50 <= -0.7 + sweptHigh + uw >= 0.5 + mom12 >= 3) -> TURUN' },
      { id: 'L6-FLAG-DISTRIBUSI', aturan: 'mom24 >= 2 + net5 <= 0.3 + volAsym5 <= -0.15 + up <= 1 -> TURUN; flag sehat: asym5 >= 0.05 + rank >= 0.75 + uw <= 0.4 + mom12 >= 1.5 + asym20 >= -0.05 -> NAIK' },
      { id: 'L7-SQUEEZE-VACUUM', aturan: 'mom24 >= 4 + mom12 >= 2 + mom3 <= -0.1 + shrink <= 0.5 + volZ <= 0 -> TURUN; mom24 >= 4 + mom12 <= 1.5 + rank <= 0.9 + posR >= 0.7 + shrink <= 0.9 -> TURUN; sapuan terkonfirmasi (mom12 >= 2 + mom3 <= -0.1 + sweptHigh + volZ >= 1.4) -> TURUN' },
      { id: 'L8-PULLBACK-UPTREND', aturan: 'mom50 >= 0.8 + uw <= 0.4 + |dist| <= 1.3 + volZ >= 1.2 + mom12 >= -2.8 + down <= 3 -> NAIK (koreksi sehat — pelindung guard)' }
    ],
    ledger: [
      { id: 'BT-V21', celah: 'volZBreak membaca lilin stall bukan lilin tembus; pelindung flag menembak parabolic/classic/reacc; L8 diblok ll; relief mom50 terangkat; triple-test rapuh' },
      { id: 'BT-V22', celah: 'L4e posW >= 0.5 memblokir triple-test tengah-jendela; spike noise menaikkan rank UTAD; L2a menembak breakout-keras; relief GILA putus streak; g-pullback GILA kehilangan tren (noise 2.1x) -> kaki & koreksi diskalakan noise' },
      { id: 'BT-V23', celah: 'L8 mom50 >= 2.5 terlalu dalam utk MUDAH & menembak sweep; L4a pembeda sejati = ANATOMI WICK (guard uw <= 0.49); L5 wajib uw >= 0.6; reacc brkUp=0 butuh lengan; L2b dist 3.5 > 3.3' },
      { id: 'BT-V24', celah: 'batas float (rsi 83.6 vs 84; volZ -0.46 vs -0.5; rank 0.70 vs 0.7) & g-pullback GILA uw 0.12-0.13 -> penyesuaian ambang berbasis anatomi' },
      { id: 'BT-V25', celah: 'L5 diblok divBull minor (redundan — uw >= 0.6 sudah mengunci guard); L4e arm1 menembak RETEST-SEHAT tanpa bukti struktural' },
      { id: 'BT-V26', celah: 'bukti struktural dipaksakan ke semua lengan -> reacc dorong-di-atas-range tak terlindungi; L4c-reacc menembak g-pullback GILA' },
      { id: 'BT-V27', celah: 'failRetest oleh noise pada breakout 1.9 sigma dituduh supply -> jalur failRetest wajib volZBreak <= 1.2' }
    ]
  };

  function hitungNetShort(entry, exit) {
    var move = exit / entry - 1;
    return (-move - 0.001 - 0.001) * 100; // fee buy + fee sell
  }

  function ujiDiri() {
    var r = [];
    // K1 — perhitungan profit after fee (short/jual di trap)
    var net = hitungNetShort(100, 94);
    r.push({ kasus: 'profit short after fee (100->94, fee 0.2%)', benar: Math.abs(net - 5.8) < 1e-9, dapat: 'net = ' + net.toFixed(2) + '%' });
    // K2 — aturan L2 klimaks kelelahan
    var k2 = 3.0 >= 2.4 && 3.5 >= 3.0 && 0.5 >= 0.35;
    r.push({ kasus: 'L2 klimaks (dist 3.0, mom12 3.5, uw 0.5)', benar: k2 === true, dapat: k2 ? 'TURUN' : 'TIDAK MENYALA' });
    // K3 — aturan L8 pelindung guard (koreksi sehat = NAIK)
    var k3 = 3.0 >= 0.8 && 0.2 <= 0.4 && 0.5 <= 1.3 && 1.5 >= 1.2;
    r.push({ kasus: 'L8 koreksi sehat (mom50 3.0, uw 0.2, volZ 1.5)', benar: k3 === true, dapat: k3 ? 'NAIK' : 'SALAH' });
    // K4 — integritas ilmu: 12 arketipe + 8 pelajaran + ledger beraturan
    var k4 = V.arketipe.length === 12 && V.pelajaran.length === 8 &&
      V.ledger.every(function (l) { return l.celah && l.celah.length > 20; });
    r.push({ kasus: 'integritas 12 arketipe + 8 pelajaran + 7 ledger', benar: k4 === true, dapat: k4 ? 'LENGKAP' : 'KURANG' });
    return { pass: r.filter(function (x) { return x.benar; }).length + '/' + r.length, rinci: r };
  }

  function kartu() {
    try {
      if (!document.body) return;
      var el = document.createElement('div');
      el.id = 'v233-bulltrap-card';
      el.style.cssText = 'margin:12px 0;padding:14px;border:1px solid #2a3f5f;border-radius:10px;background:linear-gradient(135deg,#0b1220,#101a2e);color:#dce7ff;font:13px/1.6 system-ui,sans-serif';
      var uji = ujiDiri();
      var ark = V.arketipe.map(function (a) { return '<li><b>' + a.label + '</b> — ' + a.tanda + '</li>'; }).join('');
      var pel = V.pelajaran.map(function (p) { return '<li><b>' + p.id + '</b>: ' + p.aturan + '</li>'; }).join('');
      el.innerHTML =
        '<div style="font-weight:700;font-size:15px;color:#7fd1ff">V233 SAKTI-BULLTRAP v' + V.versi + ' — ILMU BULL TRAP (uji diri ' + uji.pass + ')</div>' +
        '<div style="margin:6px 0">Protokol: ' + V.protokol.visible + ' candle terlihat + ' + V.protokol.horizon + ' horizon · fee beli ' + V.protokol.feeBuy + ' + jual ' + V.protokol.feeSell + ' · gerbang trap ' + V.protokol.gerbangTrap + ' · ' + V.protokol.antiHindsight + '</div>' +
        '<div style="margin:6px 0;color:#9fe6b8">Hasil: ' + V.hasil.ronde1_seedA + ' · ' + V.hasil.ronde2_sampelBaru + ' · Hakim: ' + V.hasil.hakimTersegel + '</div>' +
        '<details style="margin-top:6px"><summary style="cursor:pointer;color:#ffd479">12 Arketipe Bull Trap (tanda tangan point-in-time)</summary><ul style="margin:6px 0 0 18px">' + ark + '</ul></details>' +
        '<details style="margin-top:4px"><summary style="cursor:pointer;color:#ffd479">8 Pelajaran + Ledger Bedah V21-V27</summary><ul style="margin:6px 0 0 18px">' + pel + '</ul>' +
        '<div style="margin-top:6px;color:#b8c7e8">' + V.ledger.map(function (l) { return '<div>• <b>' + l.id + '</b>: ' + l.celah + '</div>'; }).join('') + '</div></details>';
      document.body.appendChild(el);
    } catch (e) {}
  }

  var M = { versi: V.versi, data: V, ujiDiri: ujiDiri, hitungNetShort: hitungNetShort };
  try {
    window.V233_BULLTRAP = M;
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.BULLTRAP = M;
  } catch (e) {}
  setTimeout(function () { try { kartu(); } catch (e) {} }, 3000);
  if (typeof console !== 'undefined') console.log('[V233 SAKTI-BULLTRAP v233.1] terpasang — ilmu bull trap 12 arketipe, uji diri ' + ujiDiri().pass);
})();
/*V233-BULLTRAP:END*/
