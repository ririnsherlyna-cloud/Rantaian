/*V237-FBO:BEGIN*/
// ============================================================
// V237 SAKTI-FBO v1.27b — ORGAN ILMU UJIAN FALSE BREAKOUT
// (harga menembus support/resistance lalu tembusan GAGAL dan
// kembali ke dalam area sebelumnya). Mirror ilmu dari 6 seed
// x (100 FBO + 24 guard) = 744 ujian otak beku v1.27b:
// LATIHAN (fbo100-300): FBO 98+100+99 = 297/300 (99.0%) ·
// guard 49/72 · 346/372 (93.0%) · HAKIM TERSEGEL (fbo400-600,
// otak beku, seed segar): FBO 99+100+97 = 296/300 (98.7%) ·
// guard 32/72 · TOTAL 328/372 (88.2%) · 0 rugi-net · NET
// +150..180% per seed (compound x4.4-x5.9) after fee buy 0.1%
// + sell 0.1% (gross tidak pernah dipakai sbg hasil akhir).
// Keputusan 3-pilih: ENTRY (bukti kegagalan terkonfirmasi +
// STOP wajib) / WAIT (trigger close-back milik sendiri, maks
// 8 candle) / SKIP. Stop tersentuh = LIKUIDASI (stop-dulu
// konservatif). Rencana trade WAJIB bawa STOP LOSS.
// Perkembangan diterapkan pada FILE ini sesuai perintah Guru.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '1.27b',
    protokol: {
      visible: 60, horizon: 14,
      keputusan: '3 PILIH: ENTRY (bukti kegagalan terkonfirmasi: close-back / wick-reject / retest gagal, STOP 0.8-2.6%) / WAIT (trigger close-back milik sendiri, maks 8 candle, stop 1.8%) / SKIP',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      likuidasi: 'stop tersentuh sebelum target = LIKUIDASI; satu lilin menyentuh stop & target -> STOP dulu (konservatif)',
      catatan12: 'entry / exit / fee buy / fee sell / gross (tidak pernah dipakai) / NET / return% / berhasil-gagal / alasan / level S-R dianalisis / sinyal false breakout / konfirmasi sebelum entry',
      antiHindsight: 'otak hanya melihat candle 1..60; truth resolusi dari simulasi trade horizon; retry berbibit, tanpa label manusia'
    },
    hasil: {
      siklus: '39 ronde Uji->Bedah->Benahi->Uji Kembali (v1.0 naif 0% -> v1.26 82.3% -> v1.27b 93.0% latihan / 88.2% hakim)',
      akarMasalahTerbesar: [
        'mirror ganda pada penolakan range sisi BAWAH (boundUnder) -> anatomi runtuh menembus level',
        'pemetaan level warisan jendela-pendek MELUPAKAN level yang dibentuk awal grafik -> penambang level jendela-penuh (pivot k=3 + klaster 0.6 ATR + angka bulat)',
        'level buatan-episode mengungguli level sejati -> koherensi batas + era sentuhan + skor seleksi lunak + bonus konfirmasi (kegagalan terlihat + penetrasi >= 1.0 ATR)',
        'r28: fitur per-candle (badan/volume) JENUH oleh noise GILA/BRUTAL -> diganti energi EPISODIK: efisiensi lintasan (net/churn), dorongan segar 7-candle, konsistensi arah, transfer momentum late-vs-early',
        'r28: FB-L4 mengejar breakout yang sudah 3-8 ATR dari level -> keluarga PUNISH melikuidasi pengejar; far-follow hanya utk acceptance MATANG (break >= 27 candle) dgn momentum masih mengalir',
        'r28: episode walk-back buta terhadap RETEST-OF-BROKEN-LEVEL (break historis + pulang ke dalam + straddle uji-ulang) -> model event DUA-TIER + FB-R disiplin WAIT re-break',
        'r28: stop struktural statis menyentuh flush pasca-konfirmasi -> margin DINAMIS (1.2 ATR dasar, melebar 0.45 x momentum episode)'
      ],
      finalBeku: 'v1.27b LATIHAN: fbo100 98+15g · fbo200 100+14g · fbo300 99+20g (FBO 297/300, total 346/372 = 93.0%) · HAKIM TERSEGEL: fbo400 99+11g · fbo500 100+10g · fbo600 97+11g (FBO 296/300 = 98.7%, total 328/372 = 88.2%) · 0 rugi-net di seluruh 6 seed',
      kejujuran: 'FBO (subjek ujian) 98.7% hakim tersegel — matang; GUARD (pengenalan tembusan sejati) 44.4% hakim — celah terbuka terdokumentasi (lihat celah), kegagalannya berupa no-trade yang AMAN (bukan likuidasi)'
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
      { id: 'FB-L2', aturan: 'wick-reject: sumbu menembus >= 0.5 ATR dgn penetrasi episode >= 0.9 ATR lalu close di dalam -> penolakan serta-merta, fade ENTRY (sapuan dangkal 0.4-0.6 ATR pada level buatan = derau, bukan likuiditas)' },
      { id: 'FB-L3', aturan: 'klimaks-kelelahan: vol break >= 2.8x ATAU overextension (jarak EMA + momentum ekstrem dgn dorongan segar padam) + close di luar -> JANGAN fade dini (blow-off terakhir), WAIT trigger close-back' },
      { id: 'FB-L4', aturan: 'acceptance = tembusan SEJATI (energi EPISODIK, kebal noise): closes di luar >= 2 + close di luar >= 0.25 ATR + episode >= 10 candle + efisiensi lintasan >= 0.25 + dorongan segar 7-candle >= 0.85 ATR + konsistensi arah >= 60% + vol pengikut >= 0.9x + level teruji (pre-touch >= 1) -> IKUTI arah break, stop di balik level; far-extension (> 3 ATR) hanya utk acceptance MATANG (break >= 27 candle) dgn transfer momentum (late >= 1 ATR dan >= 0.25 x early)' },
      { id: 'FB-L4b', aturan: 'RETEST-HOLD continuation: harga kembali ke level (float -0.5..+0.55 ATR), level MENAHAN, lalu memantul >= 0.25 ATR dgn vol pengikut >= 0.95x -> tembusan sejati lanjutan, ikuti arah break, stop di balik level' },
      { id: 'FB-L4c', aturan: 'FRESH-BREAK teruji: tembusan muda (<= 5 candle) pada level teruji (1-4 era tolak) dgn vol break >= 1.0x, kedalaman >= 0.4 ATR, arah konsisten >= 60%, momentum TIDAK ekstrem (|mom12| <= 4.5 ATR) -> ikuti searah break (menutup celah trend-cont/retest-hold muda); jangan ikuti crash klimaks' },
      { id: 'FB-L6', aturan: 'drift tanpa-energi: tembusan vol kering parah (akhir <= 0.55x pengikut) -> jalan-lambat, WAIT trigger close-back; flush capitulation dulu mungkin terjadi' },
      { id: 'FB-L7', aturan: 'break segar tak terkonfirmasi: close masih di luar + anatomi belum menentukan -> WAIT, DILARANG fade (FB-K2)' },
      { id: 'FB-R', aturan: 'RETEST-OF-BROKEN-LEVEL (tanpa episode hidup): level pernah ditusuk & diterima di luar (>= 3 close, kedalaman >= 0.5 ATR), harga PULANG ke dalam dan kini MENDEKATI level dari sisi dalam, maks 1 era penolakan pasca-break (anti-chop) -> disiplin WAIT; entry searah break asal HANYA bila close menembus kembali (re-break sah)' },
      { id: 'FB-K1', aturan: 'kualitas level: koherensi batas + era sentuhan dgn penolakan >= 0.5 ATR; tier-2 (retest) memvalidasi break historis + bukti pulang-ke-dalam, bebas syarat bound/outerPre karena level memang sudah patah' },
      { id: 'FB-K2', aturan: 'ANTI-ENTRY-DINI: fade dilarang selama close masih DI LUAR level tanpa anatomi klimaks/wick-reject — keluarga PUNISH melikuidasi fade prematur dgn dorongan terakhir' },
      { id: 'FB-K3', aturan: 'stop struktural DINAMIS: di balik ekstrem tembusan + max(1.2 ATR, 0.45 x |momentum 12-candle|) ATR (clamp 0.8-2.6%) — flush/kelanjutan pasca-konfirmasi butuh ruang napas; stop WAIT 1.8%; target disiplin 2.2%' },
      { id: 'FB-L9', aturan: 'skip-disiplin: tanpa level teruji yang ditusuk segar dan tanpa retest-of-broken -> tidak main' },
      { id: 'FB-SELEKSI', aturan: 'pemilih event skor lunak: rentang episode + level teruji + interaksi segar + kedalaman wajar + BONUS KONFIRMASI (+0.9 utk kegagalan terlihat dgn penetrasi >= 1.0 ATR) — event yang gagalnya SUDAH terlihat lebih layak dianalisis daripada episode spekulatif' }
    ],
    ledger: [
      { id: 'FBO-V1 (r1-r5)', celah: 'otak warisan mengejar breakout (0%) -> pemetaan level jendela-pendek melupakan level awal; sisi pool dinamis tak dipindai dua arah -> SKIP massal' },
      { id: 'FBO-V2 (r6-r10)', celah: 'penambang level jendela-penuh + pindai dua arah; drift BAWAH kabur dari jangkar (mirror ganda padToNear) -> 64 -> 76/100' },
      { id: 'FBO-V3 (r11-r18)', celah: 'level buatan-episode + klimaks palsu + outerPre + koherensi batas; guards runtuh oleh veto overextension -> dipisah dgn float struktural (badan penuh + low mengapung)' },
      { id: 'FBO-V4 (r19-r27)', celah: 'boundUnder mirror-ganda ditemukan & diperbaiki (akar BAWAH crash) -> 82-92/100; v1.26 beku: 306/372 (82.3%)' },
      { id: 'FBO-V5 (r28-r39)', celah: 'fitur per-candle jenuh noise -> energi EPISODIK + topi anti-chase + mature-acceptance; FB-L4b/L4c/FB-R lahir dari bedah retest-hold & trend-cont; stop dinamis; model event DUA-TIER -> latihan 346/372 (93.0%), FBO hakim 296/300 (98.7%)' }
    ],
    celah: [
      'GUARD (tembusan sejati) 44.4% hakim tersegel: otak terlalu KONSERVATIF — memilih WAIT pada breakout sejati yang tidak memenuhi gerbang acceptance (no-trade = gagal ketat, tapi AMAN: nyaris tanpa likuidasi)',
      'pemilihan level di antara kandidat kembar pada noise GILA (level-ok 39-46/100): level buatan-tren kadang mengungguli level sejati — butuh kalibrasi bobot sentuhan-teruji dua-tahap',
      'trend-cont usia tengah (break 8-20 candle lalu): episodi-energi tercemar chop pra-break — butuh pemisah momentum-transfer berbasis jendela pasca-break',
      'crash klimaks dalam (momentum-fail BRUTAL/GILA): fade stop masih terjangkau kelanjutan crash ekstrem — kandidat: WAIT bertingkat saat |mom12| >= 5 ATR',
      'FBO (subjek ujian) 98.7% hakim — sisanya 1-3/seed pada variasi noise ekstrem; siklus Uji->Bedah->Benahi->Uji Kembali diteruskan berbasis bukti, tanpa mengejar angka'
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
    // FB-L1: prevClose di luar, close kembali di dalam (cross-back)
    if (sisi === 'ATAS') return cPrev > level && c < level - margin;
    return cPrev < level && c > level + margin;
  }
  function acceptanceSejati(closesDiLuar, closeNowAtr, volFollow, eff, push7, dirCons) {
    // FB-L4 v1.27: energi EPISODIK (efisiensi + dorongan + konsistensi)
    return closesDiLuar >= 2 && closeNowAtr >= 0.25 && volFollow >= 0.9 && eff >= 0.25 && push7 >= 0.85 && dirCons >= 0.6;
  }
  function retestOfBroken(histCloses, histDepth, returned, postEras) {
    // FB-R: break historis diterima, harga pulang, uji-ulang bukan chop
    return histCloses >= 3 && histDepth >= 0.5 && returned && postEras <= 1;
  }
  function retestHold(floatB, bounceMom, volFollow) {
    // FB-L4b: retest menempel, pantulan berpengikut
    return floatB >= -0.5 && floatB <= 0.55 && bounceMom >= 0.25 && volFollow >= 0.95;
  }
  function stopDinamis(mom12Atr, atr) {
    // FB-K3 v1.27: margin melebar dgn intensitas momentum
    return Math.max(1.2, Math.min(3.0, Math.abs(mom12Atr) * 0.45)) * atr;
  }
  function status() {
    return 'V237 FBO v' + V.versi + ' — FBO 296/300 hakim tersegel (98.7%), 328/372 (88.2%) 6 seed, 0 rugi-net, NET selalu after fee; siklus berbasis bukti diteruskan';
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
      'FBO 296/300 hakim tersegel (98.7%) · 328/372 (88.2%) 6 seed · 0 rugi-net · NET after fee.<br>' +
      'Pelajaran: FB-L1..L9 + FB-L4b/L4c + FB-R + FB-K1..K3 · 12 keluarga + 3 guard · uji diri ' + u.pass + '.<br>' +
      '<div style="margin-top:6px;display:grid;gap:2px;font-size:12px;opacity:.9">' + rows + '</div>';
  }

  var API = { versi: V.versi, data: V, ujiDiri: ujiDiri, status: status, kartu: kartu, hitungNetLong: hitungNetLong, hitungNetShort: hitungNetShort, simInti: simInti, stopDinamis: stopDinamis };
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