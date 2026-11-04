/* UJI SEKOLAH KILAT V271 — 30 soal, 3 tingkat, pemilih adaptif fakultas terlemah,
   kelas kilat 3 soal per denyut, XP pemupukan, MRIT silang. Tanpa server (Node). */
'use strict';
const fs = require('fs');
const B = require('/home/z/my-project/scripts/sarang/otak_mandiri.js');
const st = JSON.parse(fs.readFileSync('/tmp/ak.json', 'utf8'));
const otak = B.otakBaru();

console.log('=== 1) INVENTARIS KURIKULUM ===');
const perFak = {};
for (const s of B.KURIKULUM) { perFak[s.fakultas] = perFak[s.fakultas] || { dasar: 0, menengah: 0, mahir: 0 }; perFak[s.fakultas][s.tingkat]++; }
for (const f of Object.keys(perFak)) console.log('  ' + f + ':', JSON.stringify(perFak[f]));
console.log('  TOTAL:', B.KURIKULUM.length, 'soal');

console.log('\n=== 2) KELAS KILAT: 3 PUTARAN x 3 SOAL ===');
for (let putaran = 1; putaran <= 3; putaran++) {
  console.log('\n-- Putaran ' + putaran + ' --');
  for (const k of B.kelasKilat(st, otak, 3)) {
    console.log('  [' + k.tingkat.toUpperCase() + '] ' + k.fakultas + ' · skor ' + k.skor + (k.skor >= 70 ? ' LULUS' : ' ULANG'));
    console.log('    soal   : ' + k.soal.slice(0, 95));
    console.log('    jawabku: ' + k.jawab.slice(0, 110));
  }
}

console.log('\n=== 3) RINGKASAN FAKULTAS (terlemah dulu) ===');
for (const f of B.fakultasRingkas(otak)) console.log('  ' + f.fakultas + ': avg ' + f.avg.toFixed(0) + ' (' + f.n + ' kelas, ' + f.lulus + ' lulus)');

console.log('\n=== 4) ADAPTIF: ULANGI 8x — fakultas terlemah menerima terbanyak? ===');
const sebelum = {};
for (let i = 0; i < 8; i++) B.kerjakanKelas(st, otak, i);
for (const f of B.fakultasRingkas(otak)) console.log('  ' + f.fakultas + ': n=' + f.n + ' avg=' + f.avg.toFixed(0));

console.log('\n=== 5) TINGKAT GATE: pilihSoal langsung di level 1 (xp nol, tak naik) ===');
const otakLv1 = B.otakBaru(); // xp 0 → level 1
const tingkatKeluar = { dasar: 0, menengah: 0, mahir: 0 };
for (let i = 0; i < 40; i++) { const p = B.pilihSoal(st, otakLv1); tingkatKeluar[p.soal.tingkat]++; }
console.log('  40 pemilihan di level 1 →', JSON.stringify(tingkatKeluar), '(menengah+mahir harus 0)');
const otakLv3 = B.otakBaru(); otakLv3.xp = 400; otakLv3.level = 3;
const t3 = { dasar: 0, menengah: 0, mahir: 0 };
for (let i = 0; i < 40; i++) { const p = B.pilihSoal(st, otakLv3); t3[p.soal.tingkat]++; }
console.log('  40 pemilihan di level 3 →', JSON.stringify(t3), '(mahir harus > 0)');

console.log('\n=== 6) XP/LEVEL PEMUPUKAN ===');
console.log('  xp=' + otak.xp + ', level=' + B.levelDari(otak.xp) + ', progres=' + B.xpProgres(otak.xp) + '%');

console.log('\n=== 7) MRIT SILANG: kelas memicu pertanyaan mandiri ===');
for (let i = 1; i <= 4; i++) {
  const p = B.pertanyaanMandiri(st, otak, 'silang' + i);
  if (p) { otak.pertanyaanKu.unshift({ teks: p.teks, mengapa: p.mengapa, hipotesis: p.hipotesis }); otak.pertanyaanKu = otak.pertanyaanKu.slice(0, 12); }
  console.log('  #' + i + ': ' + (p ? p.teks.slice(0, 110) : '(kosong)'));
}

console.log('\n=== 8) SOAL "SEKOLAH" DI RUANG JAWAB ikut nyebut 30-soal? ===');
const r = B.jawab('Apa arti sekolah bagimu?', st, otak);
console.log('  ' + r.teks.slice(0, 420).replace(/\n+/g, ' | '));
console.log('\nSEKOLAH KILAT V271 SELESAI DIUJI');
