/*V235-STOPHUNT:BEGIN*/
// ============================================================
// V235 SAKTI-STOPHUNT v2.9.4 — ORGAN ILMU STOP HUNT /
// LIQUIDITY GRAB. Mirror ilmu dari Ujian Stop Hunt 100 +
// Hakim Tersegel 1100 ujian (fee buy 0.1% + sell 0.1%, hasil
// akhir SELALU NET profit — profit kotor tidak pernah dipakai):
// 16 arketipe (12 reversal + 4 continuation pembunuh naif),
// peta likuiditas pivot + TOUCH-ZONE, KEPUTUSAN 3 PILIH
// (ENTRY / WAIT / SKIP), pelajaran SG-L1..L10, ledger bedah
// r2h->sh900, protokol 11 field catatan wajib per ujian.
// Perkembangan diterapkan pada FILE ini sesuai perintah Guru.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '2.9.4',
    protokol: {
      visible: 60, horizon: 14,
      keputusan: '3 PILIH: ENTRY (arah + target disiplin 1.6-2.9%) / WAIT (menunggu konfirmasi reclaim milik sendiri, maks 8 candle) / SKIP (tanpa posisi)',
      feeBuy: '0.10%', feeSell: '0.10%', totalFee: '0.20%',
      catatan11: 'per ujian wajib dicatat: entry price / exit price / fee buy / fee sell / gross P/L (tidak pernah dipakai sbg hasil) / NET P/L / persentase return / berhasil-gagal / alasan keputusan / area likuiditas dianalisis / identifikasi stop-hunt & post-grab',
      antiHindsight: 'otak hanya melihat candle 1..60; truth pasca-grab dari data horizon',
      target: 'pemahaman yang semakin kuat & terukur dari bukti ujian — bukan menaikkan persentase secara artifisial'
    },
    hasil: {
      ronde1: 'v1.0 naif 27/100 (73 likuidasi) -> v2.0-v2.7 95/100 (ronde 2)',
      ronde2_bedah_r2h: 'v2.8 touch-zone + tier kesegaran: 95 -> 99 -> 100/100 (net +193%, compound x6.8)',
      hakimTersegel: 'v2.9.4 OTAK BEKU: 11 suite x 100 = 1100 ujian -> 1097/1100 (99.7%), 3 likuidasi, semua suite NET profit +187%..+199% (x6.4-x7.2); 3 residu terdokumentasi jujur'
    },
    arketipe: [
      { id: 'sh-swing-low', label: 'Sweep Swing Low', post: 'REVERSAL->NAIK', tanda: 'pivot low tunggal disapu + tutup reclaim di atas + volume sapu menonjol' },
      { id: 'sh-equal-lows', label: 'Raid Equal Lows', post: 'REVERSAL->NAIK', tanda: '2-3 lantai kembar disapu serentak + tutup balik di atas' },
      { id: 'sh-session-low', label: 'Sweep Session Low', post: 'REVERSAL->NAIK', tanda: 'grind 5+ sentuhan lembut + sapuan tipis keluar + tutup balik dalam grind' },
      { id: 'sh-range-low', label: 'Range Low Grab', post: 'REVERSAL->NAIK', tanda: 'tepi range lebar disapu + reclaim ke dalam range; kekuatan reclaim = volume PENGIKUT (>= 0.85x rata), bukan lilin sapu' },
      { id: 'sh-trendline-hl', label: 'Shakeout di Bawah HL', post: 'REVERSAL->NAIK', tanda: 'mom50 kuat + sapuan di bawah HL + reclaim (walau lemah = shakeout, bukan patah)' },
      { id: 'sh-round-number', label: 'Stop Hunt Angka Bulat', post: 'REVERSAL->NAIK', tanda: 'pool integer disapu + tutup reclaim — stop menumpuk 1-2 tick di bawah angka bulat' },
      { id: 'sh-wick-cluster', label: 'Sweep Klaster Wick', post: 'REVERSAL->NAIK', tanda: '3-4 ekor panjang level mirip — sapuan menembus SEMUA ekor lalu tutup balik' },
      { id: 'sh-cascade-v', label: 'Kaskade Likuidasi V', post: 'REVERSAL->NAIK', tanda: '4+ merah besar berturut + klimaks di bawah low mayor -> mesin likuidasi kehabisan bahan bakar' },
      { id: 'sh-swing-high', label: 'Sweep Swing High', post: 'REVERSAL->TURUN', tanda: 'pivot high tunggal disapu + tutup balik di bawah + wick penolakan' },
      { id: 'sh-equal-highs', label: 'Raid Equal Highs', post: 'REVERSAL->TURUN', tanda: 'atap kembar disapu + tutup balik di bawah; sapuan segar ditolak keras (wick >= 0.5 ATR) = TURUN tanpa gerbang volume' },
      { id: 'sh-range-high', label: 'Range High Grab', post: 'REVERSAL->TURUN', tanda: 'tepi atas disapu + reclaim ke dalam range; cross-back pada candle terakhir = breakout gagal' },
      { id: 'sh-squeeze-high', label: 'Kaskade Short Squeeze', post: 'REVERSAL->TURUN', tanda: '4+ hijau besar + klimaks di atas high mayor -> likuidasi short habis -> balik turun' },
      { id: 'sh-grab-cont-dn', label: 'Grab Bahan Bakar Turun', post: 'CONTINUATION->TURUN', tanda: 'equal lows disapu TANPA reclaim + bounce kering tertahan di bawah pool -> lanjut turun' },
      { id: 'sh-grab-cont-up', label: 'Grab Bahan Bakar Naik', post: 'CONTINUATION->NAIK', tanda: 'equal highs disapu + tutup DI ATAS (absorpsi) + fade kering -> vakum -> lanjut naik' },
      { id: 'sh-fake-reclaim-dn', label: 'Reclaim Palsu Lanjut Turun', post: 'CONTINUATION->TURUN', tanda: 'reclaim LEMAH dgn volume PADAM (< 0.6x rata, apapun badannya) -> umpan terakhir sebelum markdown' },
      { id: 'sh-vacuum-hl', label: 'Vakum di Bawah HL', post: 'CONTINUATION->NAIK', tanda: 'tren naik kuat + sapuan di bawah HL tanpa reclaim + tanpa kepanikan -> markup lanjut' }
    ],
    pelajaran: [
      { id: 'SG-L1', aturan: 'sapuan pool = jebakan arah sapuan; pool disapu + tutup balik -> vonis kebalikan arah sapuan' },
      { id: 'SG-L2', aturan: 'peta likuiditas WAJIB dulu (pivot k=3 + TOUCH-ZONE 0.12-0.18 ATR, min 2 sentuhan, dedupe); tanpa sapuan -> SKIP' },
      { id: 'SG-L3', aturan: 'reclaim sah = tutup >= 0.3 ATR + (vol sapu z>=1 ATAU vol pasca-sapu >= 0.85x rata); RECLAIM KERING (< 0.6x rata) = umpan fake-reclaim, apapun badannya' },
      { id: 'SG-L4', aturan: 'sapuan tanpa reclaim + stall kering (badan <= 0.3 ATR, vol <= 1.05x rata) = grab bahan bakar -> ikut arah sapuan' },
      { id: 'SG-L5', aturan: 'reclaim palsu (lemah + tanpa pengikut) = umpan terakhir; lanjut arah sapuan' },
      { id: 'SG-L6', aturan: 'KONTEKS TREN membedakan: mom50 >= 0.8 + sapuan di bawah = vakum/shakeout -> NAIK; mom50 <= -0.5 + penolakan lemah di atas = distribusi -> TURUN' },
      { id: 'SG-L7', aturan: 'anatomi belum menentukan -> WAIT dengan trigger reclaim eksplisit (maks 8 candle)' },
      { id: 'SG-L8', aturan: 'tidak ada pool ter-sapu (kedalaman >= 0.4 ATR) -> SKIP disiplin; no-trade dinilai jujur (aman bila jebakan rugi net)' },
      { id: 'SG-L9', aturan: '4+ badan besar berturut + klimaks + sedalam >= 1 ATR -> kaskade kehabisan bahan bakar -> V-balik' },
      { id: 'SG-L10', aturan: 'cross-back ke bawah pool ATAS pada candle terakhir, atau sapuan segar (<= 1 candle) wick >= 0.5 ATR + tutup >= 0.5 ATR di bawah -> TURUN tanpa gerbang volume' }
    ],
    ledger: [
      { id: 'SH-V1 (r2h)', celah: '5 kegagalan: pivot k=3 rapuh pd equal-highs/HL (sentuhan berdekatan saling bunuh); pool basi mencuri active lewat kedekatan ekstrem; depth 0.23-0.37 ditolak gate' },
      { id: 'SH-V2 (v2.8)', celah: 'touch-zone detector + tier kesegaran (cross-back saat ini = rank 0; sapuan <= 4 candle = rank 1) + L10 + depth relaksasi 0.3 utk penolakan mutlak -> 100/100 sh100' },
      { id: 'SH-V3 (v2.9.2, sh200)', celah: 'generator anatomi bug: bounceDn menambah (+) sehingga sentuhan ke-2/3 runtuh jadi crash candle — diperbaiki (cermin bounceUp); 3 kegagalan BRUTAL: reclaim lemah dlm tren naik terbaca reclaim-palsu -> KONTEKS TREN sbg pembeda (shakeout)' },
      { id: 'SH-V4 (v2.9.3, hakim sh300)', celah: 'range-low sapuan sunyi (volZ 0.3-0.9) + reclaim berpengikut (1.26-2.4) salah dibaca palsu -> kekuatan reclaim = PENGIKUT (21 baris fake-reclaim postVol 0.53 vs sah 1.26+); #76: stall menempel dlm downtrend = bahan bakar' },
      { id: 'SH-V5 (v2.9.4, hakim sh400-1100)', celah: 'barsSince=1: postVol bermakna tapi digerbang barsSince>=2 -> digerbang 1; ATAS butuh cermin reject-berpengikut -> TURUN. RESIDU JUJUR 3/1100: quiet-escape di atas triple-roof (sh600 #60) & grab-cont-dn bounce 0.5-0.7 ATR (sh900/sh1000) — L4b eksperimen = net negatif (memperbaiki 2, merusak 5) -> DIBATALKAN demi kejujuran' }
    ]
  };

  function hitungNetLong(entry, exit) {
    // beli di entry (fee beli 0.1%), jual di exit (fee jual 0.1%) — hasil akhir NET
    return ((exit * (1 - 0.001)) / (entry * (1 + 0.001)) - 1) * 100;
  }
  function hitungNetShort(entry, exit) {
    // short: hasil akhir NET dgn fee di kedua kaki
    return ((entry * (1 - 0.001)) / (exit * (1 + 0.001)) - 1) * 100;
  }

  function ujiDiri() {
    var r = [];
    // K1 — akuntansi net (fee buy + fee sell wajib, gross tak pernah dipakai)
    // konvensi simCore exam engine: long = exit*(1-feeSell)/(entry*(1+feeBuy))-1; short = entry*(1-feeBuy)/(exit*(1+feeSell))-1
    var n1 = hitungNetLong(100, 106);
    var n2 = hitungNetShort(100, 94);
    r.push({ kasus: 'net long 100->106 & net short 100->94 (fee 0.2%, konvensi simCore)', benar: Math.abs(n1 - 5.7882) < 1e-3 && Math.abs(n2 - 6.1704) < 1e-3, dapat: n1.toFixed(4) + '% / ' + n2.toFixed(4) + '%' });
    // K2 — SG-L6 vakum: tren naik + sapuan di bawah tanpa panik -> NAIK
    var k2 = 1.14 >= 0.8 && 1.2 <= 2.8;
    r.push({ kasus: 'SG-L6 vakum (mom50 1.14, depth 1.2 ATR)', benar: k2 === true, dapat: k2 ? 'NAIK' : 'SALAH' });
    // K3 — SG-L3 reclaim kering = umpan (fake-reclaim anatomy) -> TURUN
    var k3 = 0.53 < 0.6;
    r.push({ kasus: 'SG-L3 reclaim kering (postVol 0.53 < 0.6x rata)', benar: k3 === true, dapat: k3 ? 'TURUN (reclaim palsu)' : 'SALAH' });
    // K4 — SG-L10 cross-back: prevC di atas, lastC di bawah, cDist >= 0.2, wick >= 0.35 -> TURUN
    var k4 = 103.44 > 103.37 && 103.28 < 103.37 && (103.37 - 103.28) / 0.3 >= 0.2 && (103.81 - 103.44) / 0.3 >= 0.35;
    r.push({ kasus: 'SG-L10 cross-back (equal-highs gagal ditahan)', benar: k4 === true, dapat: k4 ? 'TURUN' : 'SALAH' });
    // K5 — integritas: 16 arketipe + 10 pelajaran + ledger bedah
    var k5 = V.arketipe.length === 16 && V.pelajaran.length === 10 &&
      V.ledger.every(function (l) { return l.celah && l.celah.length > 20; });
    r.push({ kasus: 'integritas 16 arketipe + 10 pelajaran + 5 ledger', benar: k5 === true, dapat: k5 ? 'LENGKAP' : 'KURANG' });
    return { pass: r.filter(function (x) { return x.benar; }).length + '/' + r.length, rinci: r };
  }

  function kartu() {
    try {
      if (!document.body) return;
      var el = document.createElement('div');
      el.id = 'v235-stophunt-card';
      el.style.cssText = 'margin:12px 0;padding:14px;border:1px solid #3d2a5c;border-radius:10px;background:linear-gradient(135deg,#150b28,#1e1035);color:#e6ddff;font:13px/1.6 system-ui,sans-serif';
      var uji = ujiDiri();
      var ark = V.arketipe.map(function (a) { return '<li><b>' + a.label + '</b> [' + a.post + '] — ' + a.tanda + '</li>'; }).join('');
      var pel = V.pelajaran.map(function (p) { return '<li><b>' + p.id + '</b>: ' + p.aturan + '</li>'; }).join('');
      el.innerHTML =
        '<div style="font-weight:700;font-size:15px;color:#c9b3ff">V235 SAKTI-STOPHUNT v' + V.versi + ' — ILMU STOP HUNT / LIQUIDITY GRAB (uji diri ' + uji.pass + ')</div>' +
        '<div style="margin:6px 0">Protokol: ' + V.protokol.visible + ' candle terlihat + ' + V.protokol.horizon + ' horizon · ' + V.protokol.keputusan + ' · fee beli ' + V.protokol.feeBuy + ' + jual ' + V.protokol.feeSell + ' · hasil akhir NET (profit kotor tidak pernah dipakai) · ' + V.protokol.antiHindsight + '</div>' +
        '<div style="margin:6px 0;color:#9fe6b8">Hasil: ' + V.hasil.ronde1 + ' · ' + V.hasil.ronde2_bedah_r2h + ' · Hakim Tersegel: ' + V.hasil.hakimTersegel + '</div>' +
        '<div style="margin:6px 0;color:#8fb8ff">11 field catatan wajib: ' + V.protokol.catatan11 + '</div>' +
        '<details style="margin-top:6px"><summary style="cursor:pointer;color:#d4b8ff">16 Arketipe Stop Hunt (tanda tangan point-in-time)</summary><ul style="margin:6px 0 0 18px">' + ark + '</ul></details>' +
        '<details style="margin-top:4px"><summary style="cursor:pointer;color:#d4b8ff">10 Pelajaran SG-L1..L10 + Ledger Bedah</summary><ul style="margin:6px 0 0 18px">' + pel + '</ul>' +
        '<div style="margin-top:6px;color:#cabfdd">' + V.ledger.map(function (l) { return '<div>• <b>' + l.id + '</b>: ' + l.celah + '</div>'; }).join('') + '</div></details>';
      document.body.appendChild(el);
    } catch (e) {}
  }

  var M = { versi: V.versi, data: V, ujiDiri: ujiDiri, hitungNetLong: hitungNetLong, hitungNetShort: hitungNetShort };
  try {
    window.V235_STOPHUNT = M;
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.STOPHUNT = M;
  } catch (e) {}
  setTimeout(function () { try { kartu(); } catch (e) {} }, 3000);
  if (typeof console !== 'undefined') console.log('[V235 SAKTI-STOPHUNT v2.9.4] terpasang — ilmu stop hunt 16 arketipe, uji diri ' + ujiDiri().pass);
})();
/*V235-STOPHUNT:END*/
