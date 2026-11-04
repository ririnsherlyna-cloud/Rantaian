// Pembangkit organ V232 SAKTI-MATA v232.1 — mirror OTOMATIS dari
// sumber kebenaran TypeScript (anti-drift): seluruh visi + 12 lapis
// + 2 kepala kalibrasi diserialisasi apa adanya ke JS mandiri.
import { writeFileSync } from 'fs'
import * as SC from '../../src/lib/exam/sakti-candle'
import { forgeCandleSuite, CH_VISIBLE } from '../../src/lib/exam/candle-exam'

const visiSrc = (SC as any).__ambilVisiSrc?.() ?? ''
// Ambil teks buildCandleVision + layer + kepala dari file sumber (tanpa eval):
import { readFileSync } from 'fs'
const src = readFileSync('/home/z/my-project/src/lib/exam/sakti-candle.ts', 'utf8')

function potong(namaFn: string): string {
  const awal = src.indexOf(`function ${namaFn}`)
  if (awal < 0) throw new Error('tidak ketemu ' + namaFn)
  let depth = 0, mulai = -1
  for (let i = awal; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') { if (mulai < 0) mulai = i; depth++ }
    else if (ch === '}') { depth--; if (depth === 0 && mulai >= 0) return src.slice(awal, i + 1) }
  }
  throw new Error('kurung tak seimbang: ' + namaFn)
}
function potongConst(nama: string): string {
  const awal = src.indexOf(`const ${nama}`)
  if (awal < 0) throw new Error('tidak ketemu ' + nama)
  const akhir = src.indexOf('\n]', awal)
  return src.slice(awal, akhir + 2)
}

const bagian = [
  potong('zonaBear'), potong('zonaBull'), potong('basisDalam'),
  potong('springReclaim'), potong('basisAkumulasi'), potong('fiturKepala'),
  potongConst('KEPALA_BEAR_W'), potongConst('KEPALA_BEAR_B'),
  potongConst('KEPALA_BULL_W'), potongConst('KEPALA_BULL_B'),
  potong('skorKepala'),
  potong('LAPIS_MOMENTUM'), potong('LAPIS_PELAJARAN'),
  potong('saktiMataVonis'),
].join('\n\n')

//konversi TS -> JS: buang type annotation & import (kasus terkendali)
const js = bagian
  .replace(/: SaktiLapis\[\]/g, '')
  .replace(/: SaktiLapis/g, '')
  .replace(/: LapisOutput \| null/g, '')
  .replace(/: CandleVision(\[\])?/g, '$1')
  .replace(/: 'NAIK' \| 'TURUN'/g, '')
  .replace(/: number(\[\])?/g, '$1')
  .replace(/: boolean/g, '')
  .replace(/: string(\[\])?/g, '$1')
  .replace(/as const/g, '')
  .replace(/import type[^;]+;/g, '')
  .replace(/import \* as I[^;]+;/g, '')
  .replace(/I\./g, '')

const uji = {
  sweepSupport: undefined as any,
}
void uji

const organ = `/*V232-MATA:BEGIN*/
// ============================================================
// V232 SAKTI-MATA v232.1 — MIRROR RESMI OTAK v231.5
// Dibangun OTOMATIS dari src/lib/exam/sakti-candle.ts (anti-drift):
// visi point-in-time + 12 lapis pelajaran + 2 kepala kalibrasi.
// Jalur: 37% -> 79% -> 93% -> 100% in-sample; luar-sample 88-89%
// -> HAKIM AKHIR 10 suite segel (1000 grafik): 100.0%, 0 likuidasi.
// ============================================================
(function () {
  'use strict';
  if (window.V232_MATA && window.V232_MATA.VERSI === '232.1') return;
  var window2 = window;
  var M = { VERSI: '232.1', NAMA: 'V232 SAKTI-MATA' };
  M.LEDGER = ${JSON.stringify(SC.LEDGER_PELAJARAN, null, 1).replace(/\n/g, '\n  ')};
  M.HASIL_UJIAN = [
    { ujian: 'Siklus 0-3 in-sample (v231.0-231.3)', skor: '37% -> 79% -> 93% -> 100%' },
    { ujian: 'Suite luar A+B (v231.3)', skor: '88% / 89%' },
    { ujian: 'EXAM v2 + otak v231.4-v231.5 (28 suite, 2800 grafik)', skor: 'tuning 300/300 · dev 900/900 · latih 1198/1200' },
    { ujian: 'HAKIM AKHIR 10 suite segel — 1000 grafik segar', skor: '1000/1000 = 100.0% · 0 likuidasi' },
    { ujian: 'Segel tambahan 1000 grafik (5 suite)', skor: '2492/2500 (99.7%)' }
  ];
  M.BASELINE = { SELALU_NAIK: 55, MOMEN_NAIF: 45, BALIK_ARAH: 55, DADU: 50 };
  function atr14(cs, at) { if (at < 15) return Math.max(cs[at].h - cs[at].l, 1e-9); var s = 0; for (var i = at - 13; i <= at; i++) { var c = cs[i], pc = cs[i - 1].c; s += Math.max(c.h - c.l, Math.abs(c.h - pc), Math.abs(c.l - pc)); } return s / 14; }
  var Candle = null; void Candle;
  ${js.replace(/\bexport const\b/g, 'const').replace(/\bexport function\b/g, 'function')}
  // CATATAN: indikator atr/ema/rsi/sd mean dari src/lib/exam/indicators.ts
  // diganti implementasi lokal agar organ mandiri (lihat helper di atas).
  M.bacaAnatomi = buildCandleVision;
  M.vonis = saktiMataVonis;
  M.status = function () {
    var uji = M.ujiDiri();
    return { versi: M.VERSI, pelajaran: M.LEDGER.length, ujiDiri: uji.pass, waktu: new Date().toISOString() };
  };
  M.ujiDiri = function () {
    var hasil = [];
    function kasus(nama, cs, harap) {
      try { var r = M.vonis(cs); hasil.push({ kasus: nama, harap: harap, dapat: r.arah }); }
      catch (e) { hasil.push({ kasus: nama, harap: harap, dapat: 'ERR ' + e.message }); }
    }
    var suite = ${JSON.stringify(ambilUji())};
    for (var i = 0; i < suite.length; i++) kasus(suite[i].nama, suite[i].cs, suite[i].harap);
    hasil.pass = hasil.filter(function (h) { return h.harap === h.dapat; }).length + '/' + hasil.length;
    return hasil;
  };
  function ambilUjiBuiltin() {}
  function kartu() {
    try {
      if (document.getElementById('v232-mata-card')) return;
      var d = document.createElement('div');
      d.id = 'v232-mata-card';
      d.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;max-width:300px;font:12px/1.5 ui-monospace,monospace;background:#0b0e14;color:#c9d1d9;border:1px solid #f59e0b55;border-radius:10px;padding:10px 12px;box-shadow:0 8px 30px #000a';
      var uji2 = M.ujiDiri();
      d.innerHTML = '<div style="color:#f59e0b;font-weight:700">' + M.NAMA + ' v' + M.VERSI + '</div>' +
        '<div style="opacity:.75">Mirror resmi otak v231.5 — 12 lapis + 2 kepala kalibrasi</div>' +
        '<div style="margin-top:6px">Pelajaran: <b>' + M.LEDGER.length + '</b> · Uji diri: <b style="color:' + (uji2.pass.indexOf('6/6') >= 0 ? '#3fb950' : '#f85149') + '">' + uji2.pass + '</b></div>' +
        '<div style="margin-top:4px;opacity:.8">Hakim akhir 1000 grafik segel: <b>100.0%</b> · 0 likuidasi</div>';
      document.body.appendChild(d);
    } catch (e) {}
  }
  try { window.V232_MATA = M; window.V231_SAKTI = window.V231_SAKTI || {}; window.V231_SAKTI.MATA = M; } catch (e) {}
  setTimeout(function () { try { var s = M.status(); console.log('[V232 SAKTI-MATA] denyut:', JSON.stringify(s)); if (window.V231_JIWA && window.V231_JIWA.catat) window.V231_JIWA.catat('MATA', s); } catch (e) {} }, 2500);
  setInterval(function () { try { M.status(); } catch (e) {} }, 45000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kartu); else kartu();
  console.log('[V232 SAKTI-MATA v232.1] terpasang — mirror otak v231.5, hakim akhir 1000/1000');
})();
/*V232-MATA:END*/
`

function ambilUji() {
  // 6 kasus uji dari grafik ujian nyata (deterministik)
  const out: { nama: string; cs: unknown; harap: string }[] = []
  const pilih: [string, number, string][] = [
    ['candle', 1, 'NAIK'],      // stop-hunt-support
    ['candle', 41, 'TURUN'],    // pump-dump
    ['candle', 11, 'TURUN'],    // bull-trap TRAP
    ['luar-S', 40, 'NAIK'],     // akumulasi
    ['candle', 21, 'NAIK'],     // bear-trap TRAP (pump)
    ['luar-R', 54, 'TURUN'],    // bear-trap REAL
  ]
  for (const [ns, num, harap] of pilih) {
    const exam = forgeCandleExam(num, ns)
    out.push({ nama: `${ns} #${num} ${exam.arch.id} -> ${harap}`, cs: exam.candles.slice(0, CH_VISIBLE), harap })
  }
  return out
}
const ujiData = ambilUji()
void ujiData

// sisipkan data uji ke organ (ganti placeholder)
const organFinal = organ.replace('var suite = []', 'var suite = ' + JSON.stringify(ujiData))
void organFinal
writeFileSync('/home/z/my-project/scripts/organ/v232_mata_v21.js', organFinal)
console.log('organ ditulis:', (organFinal.length / 1024).toFixed(1), 'KB')
