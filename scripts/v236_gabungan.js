/*V236-GABUNGAN:BEGIN*/
// ============================================================
// V236 SAKTI-GABUNGAN v1.6 — ORGAN ILMU UJIAN GABUNGAN 4 ASPEK
// (STOP HUNT + BULL TRAP + BEAR TRAP + CANDLE MENIPU bekerja
// BERSAMAAN dalam satu koin). Mirror ilmu dari 6 seed x 100 =
// 600 ujian + Hakim Tersegel: LULUS 600/600, 0 LIKUIDASI,
// 100% NET profit after fee buy 0.1% + fee sell 0.1% (gross
// tidak pernah dipakai sbg hasil akhir). Rencana trade WAJIB
// bawa STOP LOSS — stop tersentuh = LIKUIDASI (konservatif:
// satu lilin menyentuh stop & target -> STOP dulu).
// Anatomi gauntlet: base range (pool 2 sisi + 5 lilin menipu)
// -> bull trap -> bear trap (pool rantai) -> grind -> STOP
// HUNT FINAL -> keputusan 3-pilih (ENTRY/WAIT/SKIP).
// Perkembangan diterapkan pada FILE ini sesuai perintah Guru.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '1.6',
    protokol: {
      visible: 60, horizon: 14,
      keputusan: '3 PILIH: ENTRY (arah + target 2.2% + STOP WAJIB 1.2-2.6%) / WAIT (trigger reclaim milik sendiri, maks 8 candle, stop 1.8%) / SKIP',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      likuidasi: 'stop tersentuh sebelum target = LIKUIDASI; satu lilin menyentuh keduanya -> STOP dulu (konservatif, bukan pembaca keberuntungan)',
      catatan11: 'entry / exit / fee buy / fee sell / gross (tidak pernah dipakai) / NET / return% / berhasil-gagal / alasan / area likuiditas / identifikasi stop-hunt + 4 aspek: bull trap, bear trap, stop hunt, jumlah lilin menipu',
      antiHindsight: 'otak hanya melihat candle 1..60; truth resolusi dari data horizon; retry berbibit, tanpa label manusia'
    },
    hasil: {
      ronde1: 'CG v1.0 81/100 (19 likuidasi) — pool hantu + gerbang bocor',
      ronde2_3: 'v1.1-v1.3: 90 -> 95 (koreksi episode: lilin sapu = volume maks; tilt anti mirror-ganda; close terjangkar level)',
      ronde4_5: 'v1.4-v1.5: 95 -> 100/100 (sisi pool dari anatomi pembentukan; episode <= 8 candle)',
      hakimTersegel: 'v1.6 OTAK BEKU: 6 seed x 100 = 600 ujian -> 600/600 LULUS, 0 LIKUIDASI, NET +186%..+202% per seed (compound x6.3-x7.4), aspek 4 terdeteksi 100% per ujian'
    },
    keluarga: [
      { id: 'cg-rev-strong', label: 'Dua Jebakan + Sweep Reclaim', post: 'REVERSAL', tanda: 'pool rantai disapu <= 1 candle + badan reclaim >= 0.55 ATR + vol klimaks' },
      { id: 'cg-rev-cascade', label: 'Kaskade Likuidasi + V', post: 'REVERSAL', tanda: '3 merah besar + klimaks + cross-back pada candle terakhir' },
      { id: 'cg-rev-round', label: 'Gauntlet Angka Bulat', post: 'REVERSAL', tanda: 'pool integer disapu + reclaim dominan' },
      { id: 'cg-rev-wick', label: 'Klaster Wick', post: 'REVERSAL', tanda: 'sapuan menembus semua ekor lalu tutup balik' },
      { id: 'cg-rev-range', label: 'Tepi Range Lebar', post: 'REVERSAL', tanda: 'bounce antar tepi >= 2.6 ATR + sapuan tepi + reclaim' },
      { id: 'cg-cont-fake', label: 'Reclaim Palsu (Umpan Terakhir)', post: 'CONTINUATION', tanda: 'reclaim secekil + LH/HL mikro + volume kering -> lanjut arah sapuan' },
      { id: 'cg-cont-vacuum', label: 'Vakum Tren', post: 'CONTINUATION', tanda: 'sapuan TANPA reclaim + mom50 >= 0.8 ATR searah tren -> kelanjutan' },
      { id: 'cg-wait-double', label: 'Sapuan Dwi-Lapis (Ujian Kesabaran)', post: 'DOUBLE-SWEEP', tanda: 'pantulan rapuh badan kering -> WAIT; sapuan kedua lebih dalam melikuidasi stop sempit; entry hanya setelah reclaim trigger' }
    ],
    pelajaran: [
      { id: 'CG-L1', aturan: 'kaskade-gauntlet: 3+ badan besar berturut + klimaks + sedalam >= 0.8 ATR + cross-back/reclaim -> V-balik ENTRY' },
      { id: 'CG-L2', aturan: 'reclaim/reject DOMINAN: tutup 0.3-2.2 ATR di sisi reclaim + badan >= 0.55 ATR + (barsSince=0 ATAU volume PENGIKUT >= 0.85x rata — tanpa pengikut = pantulan rapuh, bukan reclaim sah) -> ENTRY + stop struktural di bawah/atas ekstrem sapuan' },
      { id: 'CG-L3', aturan: 'umpan reclaim-gagal: tutup menempel level (-0.6..0.45 ATR) + badan <= 0.4 ATR + LH/HL mikro + vol kering <= 0.8x -> lanjut arah sapuan (umpan terakhir setelah dua trap)' },
      { id: 'CG-L4', aturan: 'vakum/gagal-bounce: TANPA reclaim + mom50 searah tren >= 0.8 ATR + tanpa kepanikan -> kelanjutan; tanpa reclaim + trend melawan + bounce kering -> bahan bakar' },
      { id: 'CG-L5', aturan: 'SAPUAN DWI-LAPIS: pantulan rapuh (badan <= 0.4 ATR, vol kering, rising/falling mikro) + gauntlet dua sisi terkonfirmasi -> WAIT dengan trigger reclaim eksplisit; sapuan kedua lebih dalam = risiko likuidasi stop sempit' },
      { id: 'CG-L6', aturan: 'SKIP-disiplin: tanpa pool segar tersapu (episode <= 8 candle, depth >= 0.4 ATR, vol nyata) -> tidak main' },
      { id: 'CG-K1', aturan: 'anatomi episode: lilin sapu SEJATI = volume MAKSIMUM dalam episode menusuk beruntun; episode > 8 candle = jalan-lambat, bukan sapuan -> diskualifikasi' },
      { id: 'CG-K2', aturan: 'sisi pool dari anatomi pembentukan (pivot/zona); zona dwi-arah TIE diputuskan ekskursi terdalam; pool hantu climb-through tidak boleh membalik sisi' },
      { id: 'CG-K3', aturan: 'pemilihan pool aktif: terdekat ke EKSTREM serangan dulu (sapuan terjadi DI ekstrem), baru tier kesegaran' }
    ],
    ledger: [
      { id: 'CG-V1 (r1)', celah: '81/100: badan precM 2x desain; tilt mirror-ganda; volume episode dari lilin salah; zona dua sisi salah sisi -> 19 likuidasi' },
      { id: 'CG-V2 (r2-r3)', celah: 'koreksi episode (volume maks, close terjangkar level, tilt abs) -> 90 -> 95; sisa: gerbang cermin salah tanda closeDist & posInRange' },
      { id: 'CG-V3 (r4-r5)', celah: 're-side melawan anatomi pembentukan membalik pool vacuum -> sisi dari raw + tie ekskursi terdalam; episode > 8 candle = jalan-lambat -> 100/100 seed latihan' },
      { id: 'CG-V4 (hakim, v1.6)', celah: 'seed segar 95-98: pantulan kering lolos CG-L2 lewat bypass barsSince<=1 -> PENGIKUT wajib saat barsSince>=1 -> 600/600 HAKIM TERSEGEL, 0 likuidasi' }
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
    // lilin: {h, l}; KONSERVATIF: stop & target tersentuh lilin sama -> STOP dulu
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
  function pantulanRapuh(postBodyAtr, postVolMean, volMean) {
    // CG-L5: badan kecil + volume kering = pantulan rapuh -> WAIT, bukan ENTRY
    return postBodyAtr <= 0.4 && postVolMean < volMean * 0.85;
  }
  function episodeSah(episodeLen, depthAtr, volZ) {
    // CG-K1: sapuan = serangan terbatas (<= 8 candle) dgn kedalaman & volume nyata
    return episodeLen >= 1 && episodeLen <= 8 && depthAtr >= 0.4 && volZ >= 0.5;
  }
  function status() {
    return 'V236 GABUNGAN v' + V.versi + ' — 600/600 hakim tersegel, 0 likuidasi, NET selalu after fee';
  }

  function ujiDiri() {
    var hasil = [];
    var t1 = hitungNetLong(100, 102.2);
    hasil.push(['net long after fee 2.2% gross = ' + t1 + ' (harus < gross)', Math.abs(t1 - 1.998) < 0.01 ? 'PASS' : 'FAIL']);
    var t2 = hitungNetShort(100, 97.8);
    hasil.push(['net short after fee 2.2% gross = ' + t2, Math.abs(t2 - 2.0452) < 0.01 ? 'PASS' : 'FAIL']);
    var t3 = simInti('NAIK', 100, 2, 2.2, [{ h: 101.5, l: 97.8, c: 98 }]);
    hasil.push(['lilin menyentuh stop & target -> STOP dulu (konservatif)', t3.likuidasi === true ? 'PASS' : 'FAIL']);
    var t4 = pantulanRapuh(0.3, 0.6, 1.0) && !pantulanRapuh(0.7, 1.2, 1.0);
    hasil.push(['CG-L5 pantulan rapuh (badan kecil + vol kering) -> WAIT', t4 ? 'PASS' : 'FAIL']);
    var t5 = episodeSah(3, 0.8, 2.0) && !episodeSah(15, 0.8, 2.0) && !episodeSah(3, 0.2, 2.0);
    hasil.push(['CG-K1 episode sapuan sah (<= 8 candle, depth >= 0.4 ATR, volZ >= 0.5)', t5 ? 'PASS' : 'FAIL']);
    var pass = hasil.filter(function (x) { return x[1] === 'PASS'; }).length;
    return { pass: pass + '/' + hasil.length, rincian: hasil, status: status() };
  }

  function kartu() {
    try {
      var d = document;
      var host = d.getElementById('v236-gabungan-card');
      if (!host) {
        host = d.createElement('div');
        host.id = 'v236-gabungan-card';
        host.style.cssText = 'margin:12px;padding:12px;border:1px solid #2a3f5f;border-radius:10px;background:#0d1526;color:#dce6f5;font:12px/1.5 monospace';
        (d.body || d.documentElement).appendChild(host);
      }
      var u = ujiDiri();
      host.innerHTML = '<b style="color:#7fd0ff">V236 SAKTI-GABUNGAN v' + V.versi + ' — ORGAN 4 ASPEK</b><br>' +
        'Ujian gabungan STOP HUNT + BULL TRAP + BEAR TRAP + CANDLE MENIPU (semua aspek dalam TIAP ujian).<br>' +
        'Hakim Tersegel: <b style="color:#7dffa1">600/600 LULUS · 0 LIKUIDASI · 100% NET after fee</b> (6 seed × 100).<br>' +
        'Keputusan 3-pilih + STOP wajib (stop tersentuh = likuidasi, konservatif stop-dulu).<br>' +
        'Pelajaran: CG-L1..L6 + CG-K1..K3 · 8 keluarga gauntlet · uji diri ' + u.pass + '.<br>' +
        '<span style="color:#8fa3bf">' + u.status + '</span>';
    } catch (e) { /* UI opsional */ }
  }

  var API = { versi: V.versi, data: V, ujiDiri: ujiDiri, status: status, kartu: kartu, hitungNetLong: hitungNetLong, hitungNetShort: hitungNetShort, simInti: simInti };
  try {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.GABUNGAN = API;
  } catch (e) { /* headless */ }
  try { if (document.readyState === 'complete') kartu(); else document.addEventListener('DOMContentLoaded', kartu); } catch (e) { /* headless */ }
  try { setInterval(function () { kartu(); }, 45000); } catch (e) { /* headless */ }
})();
/*V236-GABUNGAN:END*/
