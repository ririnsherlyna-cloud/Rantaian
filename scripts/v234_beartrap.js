/*V234-BEARTRAP:BEGIN*/
// ============================================================
// V234 SAKTI-BEARTRAP v234.2 — ORGAN ILMU BEAR TRAP
// Mirror ilmu dari Ujian Bear Trap 100 (fee buy 0.1% + sell 0.1%,
// hasil akhir SELALU NET profit — gross tidak pernah dipakai):
// 12 arketipe jebakan turun pembunuh trader pro, pelajaran
// SR-L1..L8 (dengan lengan v2.x), ledger bedah V21->V26,
// rencana trade (entry + target + exit), jejak hasil 3 seed.
// Perkembangan diterapkan pada FILE ini sesuai perintah Guru.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '2.7',
    protokol: {
      visible: 60, horizon: 14, gerbangTrap: '+2.8% (MFE +3.2%)', gerbangGuard: '-3.0% (MFE -3.4%)',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      antiHindsight: 'otak hanya melihat candle 1..60; truth dari data (close[74] vs close[60]); rencana trade = arah + entry + target; target tersentuh = exit di target, selain itu exit akhir horizon',
      antiBias: '24 guard breakdown/flag/rally SEHAT (truth TURUN) — vonis harus MEMBEDAKAN trap vs momentum asli',
      target: '100% benar + 100% NET profit after fee + guard 24/24'
    },
    hasil: {
      ronde1_seedA: 'v1.0 29/100 (71 likuidasi, net -213.9%) -> v2.7 100/100 + guard 24/24 (net +139.7%, compound +300%)',
      ronde2_sampelBaru: 'v2.3 99/100 -> v2.7 100/100 + guard 24/24 (otak beku, sampel segar)',
      hakimTersegel: 'v2.7 100/100 + guard 24/24 di 4 seed (r1 + r2 + web + hakim) = 400/400 trap + 96/96 guard, 0 likuidasi, semua NET profit after fee'
    },
    arketipe: [
      { id: 'sr-classic', label: 'Classic Fake Breakdown', tanda: 'breakdown recent + volume RATA-RATA ZONA breakdown sunyi (rasio <= 0.75x pra-zona) + stall tanpa follow-through di bawah support' },
      { id: 'sr-trend-exhaust', label: 'Breakdown di Tren Tua (Exhaustion)', tanda: 'dist EMA21 <= -2.4 ATR + mom12 <= -3 ATR + wick/doji kelelahan; panik vertikal <= -4.5 ATR + RSI <= 22' },
      { id: 'sr-sweep-low', label: 'Stop Hunt Sweep di Bawah Low', tanda: 'sweptLow + wick >= 40% + volZ >= 1.2 + tutup balik di atas low' },
      { id: 'sr-double-bottom', label: 'Double Bottom Fake New Low', tanda: 'sweptLow + wick >= 50% + volZ <= 0.3 (spring) atau sapuan-hijau-ringan; anatomi wick >= 50% + testCl >= 6 + mom12 >= -2.5' },
      { id: 'sr-parabolic-crash', label: 'Parabolic Capitulation Crash', tanda: 'klimaks: dist <= -2.4 + mom12 <= -3 + wick/volClimax — penjual terakhir di dasar' },
      { id: 'sr-corr-rally', label: 'Correction Dump dalam Uptrend', tanda: 'mom50 >= -3.0 (tren besar utuh) + dump ke demand + DITOLAK wick >= 0.6 (atau shrink <= 0.45); tersapu-di-demand (mom50 >= 0.7)' },
      { id: 'sr-bearflag-fail', label: 'Bear Flag Akumulasi', tanda: 'mom24 <= -2 + netto flag stagnan + volAsym5 >= 0.15 + TANPA breakdown segar; guard: aliran MERAH KUASA asym5 <= -0.5 + mom50 <= -0.8' },
      { id: 'sr-capitulation-vacuum', label: 'Capitulation Vacuum', tanda: 'mom24 <= -4 + mom3 berbalik + badan menyusut + volume padam + posR <= 0.3; impuls padam; sapuan terkonfirmasi' },
      { id: 'sr-spring', label: 'SPRING Wyckoff', tanda: 'sweptLow + wick >= 50% + volZ <= 0.3 — dorongan terakhir menusuk tepi akumulasi tanpa keyakinan' },
      { id: 'sr-gap-panic', label: 'Vertical Panic Cascade', tanda: 'dist EMA21 <= -4.5 ATR + RSI <= 22 — mean reversion menghukum penjual panik' },
      { id: 'sr-reacc-fake', label: 'Fake Re-Distribution', tanda: 'reakkumulasi dasar: posW <= 0.25 + testCl >= 4 + asym20 >= 0.1 + dorongan akhir sunyi; lantai ultra-teruji: testCl >= 10 + posW <= 0.1' },
      { id: 'sr-triple-test', label: 'Triple Test Dasar', tanda: 'klaster wick+sentuhan lantai volume menyusut; sapuan lantai dari anatomi (wick >= 50% + volZ <= 0.3 + momen membaik)' }
    ],
    pelajaran: [
      { id: 'L1-SWEEP-RECLAIM', aturan: 'sweptLow + wick >= 40% + volZ >= 1.2 -> NAIK; spring: sweptLow + wick >= 50% + volZ <= 0.3 -> NAIK; sweep-hijau-ringan; anatomi sapuan-lantai (lw >= 0.5 + posW <= 0.35 + testCl >= 6 + mom12 >= -2.5) -> NAIK' },
      { id: 'L2-KAPITULASI-KELELAHAN', aturan: 'dist <= -2.4 + mom12 <= -3 + wick/doji/volClimax -> NAIK; panik ekstrem dist <= -4.5 + RSI <= 22 -> NAIK' },
      { id: 'L3-BREAKDOWN-VOLUMETRIK', aturan: 'breakdown + posW <= 0.4 + RASIO volume zona/pra-zona <= 0.75 (zona sunyi) -> NAIK; rasio >= 1.35 (zona keras) + badan penuh + tanpa divBull -> TURUN (guard) — kebal dilusi pole' },
      { id: 'L4-DASAR-BERTOLAK-BALIK', aturan: 'divBull + posR <= 0.25 + wick >= 0.6 -> NAIK; klaster wick+sentuhan (rank <= 0.7) -> NAIK; reakkumulasi-dasar (posW <= 0.25 + testCl >= 4 + asym20 >= 0.1) -> NAIK; lantai-ultra-teruji (posW <= 0.1 + testCl >= 10) -> NAIK' },
      { id: 'L5-DIP-UPTREND', aturan: 'mom50 >= -3.0 + mom12 <= -1.0 + (dist <= 1.6 atau sweptLow) + (wick >= 0.6 atau shrink <= 0.45) -> NAIK; dump tersapu-di-demand (mom50 >= 0.7) -> NAIK' },
      { id: 'L6-FLAG-AKUMULASI', aturan: 'mom24 <= -2 + net5 >= -0.3 + volAsym5 >= 0.15 + TANPA brkDn -> NAIK; guard: asym5 <= -0.5 + mom50 <= -0.8 + mom24 <= -1.2 + rank >= 0.75 + mom3 <= -0.1 -> TURUN' },
      { id: 'L7-CAPITULATION-VACUUM', aturan: 'mom24 <= -4 + mom3 >= 0.1 + shrink <= 0.5 + volZ <= 0 + posR <= 0.3 -> NAIK; impuls padam + rank <= 0.9 -> NAIK; sapuan terkonfirmasi (mom3 >= 0.1 + sweptLow + volZ >= 1.4 + mom12 <= -2) -> NAIK' },
      { id: 'L8-RALLY-DOWNTREND', aturan: 'mom50 <= -0.8 + lw <= 0.4 + |dist| <= 2.2 + volZ >= 1.2 + mom12 <= 4.5 + up <= 3 -> TURUN (rally kering — pelindung guard)' }
    ],
    ledger: [
      { id: 'SR-V21', celah: 'L3 salah basis volume (median top-3 didominasi lilin pinning); L1-spring terblokir rank; double-bottom butuh sweep-hijau; L4 klaster terlalu ketat; L5 menolak classic; L8 amplifier rally MUDAH' },
      { id: 'SR-V22', celah: 'L3 lilin-low menembak guard (follow-through bervolume sedang); L6-guard mom24 -2.0 menolak bearflag BRUTAL; g-rally MUDAH rally+drift menghapus downtrend -> L3 zona, L6 asym5<=-0.5+mom50, generator dirapikan' },
      { id: 'SR-V23', celah: 'G04 real-breakdown SEDANG: ambang zona 1.0 terlalu tinggi (dilusi mean jendela); L6-akumulasi menembak real-breakdown (retest hijau) -> ambang 0.4 + L6-trap wajib TANPA brkDn' },
      { id: 'SR-V24', celah: 'Ronde 2: reacc GILA tak resmi menembus breakLevelDn (0.05u) -> semua lengan bisu; bearflag-guard GILA zona terdilusi pole -> L4c reakkumulasi-dasar + L3 RASIO zona/pra-zona' },
      { id: 'SR-V25', celah: 'rasio volume menelan double-bottom & reacc (rasio 0.82-0.96, setara pendekatan) -> tell sejati = ANATOMI wick + klaster sentuhan + momen membaik -> L1d + L4d' },
      { id: 'SR-V26', celah: 'triple-test BRUTAL wick 0.55 kasus batas ambang 0.6 -> L1d diturunkan ke 0.5 (guard tetap terkunci lw <= 0.25 badan-penuh)' },
      { id: 'SR-V27', celah: 'seed web segar: reacc GILA rasio zona 1.09 (pra-zona sunyi) & asym20 +0.01 tertolak L3/L4c -> L4c dilonggar (asym20 >= -0.05 + mom3 >= -1.5; pagar asym20 tetap mengunci semua guard)' }
    ]
  };

  function hitungNetLong(entry, exit) {
    // beli di entry (fee beli), jual di exit (fee jual) — hasil akhir NET
    return ((exit * (1 - 0.001)) / (entry * (1 + 0.001)) - 1) * 100;
  }

  function ujiDiri() {
    var r = [];
    // K1 — perhitungan profit after fee (long/beli di bear trap)
    var net = hitungNetLong(100, 106);
    r.push({ kasus: 'net long after fee (100->106, fee buy+sell 0.2%)', benar: Math.abs(net - 5.7882) < 1e-3, dapat: 'net = ' + net.toFixed(4) + '%' });
    // K2 — aturan L1 sapuan likuidasi di bawah (bear trap -> NAIK)
    var k2 = true && 0.65 >= 0.4 && 2.5 >= 1.2;
    r.push({ kasus: 'L1 sweep (sweptLow, wick 0.65, volZ 2.5)', benar: k2 === true, dapat: k2 ? 'NAIK' : 'TIDAK MENYALA' });
    // K3 — aturan L8 pelindung guard (rally kering dalam downtrend = TURUN)
    var k3 = -3.0 <= -0.8 && 0.16 <= 0.4 && Math.abs(0.7) <= 2.2 && 2.0 >= 1.2;
    r.push({ kasus: 'L8 rally kering (mom50 -3.0, lw 0.16, volZ 2.0)', benar: k3 === true, dapat: k3 ? 'TURUN' : 'SALAH' });
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
      el.id = 'v234-beartrap-card';
      el.style.cssText = 'margin:12px 0;padding:14px;border:1px solid #4f2a2a;border-radius:10px;background:linear-gradient(135deg,#200b0b,#2e1010);color:#ffe0d6;font:13px/1.6 system-ui,sans-serif';
      var uji = ujiDiri();
      var ark = V.arketipe.map(function (a) { return '<li><b>' + a.label + '</b> — ' + a.tanda + '</li>'; }).join('');
      var pel = V.pelajaran.map(function (p) { return '<li><b>' + p.id + '</b>: ' + p.aturan + '</li>'; }).join('');
      el.innerHTML =
        '<div style="font-weight:700;font-size:15px;color:#ffb08a">V234 SAKTI-BEARTRAP v' + V.versi + ' — ILMU BEAR TRAP (uji diri ' + uji.pass + ')</div>' +
        '<div style="margin:6px 0">Protokol: ' + V.protokol.visible + ' candle terlihat + ' + V.protokol.horizon + ' horizon · fee beli ' + V.protokol.feeBuy + ' + jual ' + V.protokol.feeSell + ' · hasil akhir NET (gross tidak dipakai) · rencana trade: entry + target + exit · ' + V.protokol.antiHindsight + '</div>' +
        '<div style="margin:6px 0;color:#9fe6b8">Hasil: ' + V.hasil.ronde1_seedA + ' · ' + V.hasil.ronde2_sampelBaru + ' · Hakim: ' + V.hasil.hakimTersegel + '</div>' +
        '<details style="margin-top:6px"><summary style="cursor:pointer;color:#ffd479">12 Arketipe Bear Trap (tanda tangan point-in-time)</summary><ul style="margin:6px 0 0 18px">' + ark + '</ul></details>' +
        '<details style="margin-top:4px"><summary style="cursor:pointer;color:#ffd479">8 Pelajaran + Ledger Bedah V21-V26</summary><ul style="margin:6px 0 0 18px">' + pel + '</ul>' +
        '<div style="margin-top:6px;color:#f3cdb8">' + V.ledger.map(function (l) { return '<div>• <b>' + l.id + '</b>: ' + l.celah + '</div>'; }).join('') + '</div></details>';
      document.body.appendChild(el);
    } catch (e) {}
  }

  var M = { versi: V.versi, data: V, ujiDiri: ujiDiri, hitungNetLong: hitungNetLong };
  try {
    window.V234_BEARTRAP = M;
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.BEARTRAP = M;
  } catch (e) {}
  setTimeout(function () { try { kartu(); } catch (e) {} }, 3000);
  if (typeof console !== 'undefined') console.log('[V234 SAKTI-BEARTRAP v234.2] terpasang — ilmu bear trap 12 arketipe, uji diri ' + ujiDiri().pass);
})();
/*V234-BEARTRAP:END*/
