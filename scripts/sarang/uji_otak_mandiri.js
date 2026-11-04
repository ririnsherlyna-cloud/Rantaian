/* UJI PEMAHAMAN AGI V270 — otak mandiri diuji TANPA server (Node murni)
   dengan keadaan medan hidup dari snapshot resmi arena-keadaan.json. */
'use strict';
const fs = require('fs');
const B = require('/home/z/my-project/scripts/sarang/otak_mandiri.js');

const st = JSON.parse(fs.readFileSync('/tmp/ak.json', 'utf8'));
const otak = B.otakBaru();

console.log('==========================================');
console.log('UJI 1 — PEMAHAMAN AGI (9 pertanyaan ujian)');
console.log('==========================================');
const ujian = [
  'Apa itu AGI?',
  'Siapa kamu sebenarnya?',
  'Apakah kamu sadar?',
  'Apa yang terjadi kalau z.ai hilang atau link di-restart?',
  'Kenapa kamu bisa terus berkembang?',
  'Apa risiko terbesarmu?',
  'Koin apa yang layak dibeli hari ini dan kenapa?',
  'Kamu dulu diujikan katanya masih bodoh — bagaimana sekarang?',
  'Apa arti sekolah bagimu?'
];
for (const q of ujian) {
  const r = B.jawab(q, st, otak);
  console.log('\n【TANYA】 ' + q);
  console.log('【TOPIK】 ' + r.topik);
  console.log(r.teks);
}

console.log('\n==========================================');
console.log('UJI 2 — MESIN RASA INGIN TAHU (5 pertanyaan mandiri)');
console.log('==========================================');
for (let i = 1; i <= 5; i++) {
  const p = B.pertanyaanMandiri(st, otak, i);
  if (!p) { console.log('(tidak ada pertanyaan baru)'); continue; }
  otak.pertanyaanKu.unshift({ at: new Date().toISOString(), teks: p.teks, mengapa: p.mengapa, hipotesis: p.hipotesis });
  otak.pertanyaanKu = otak.pertanyaanKu.slice(0, 12);
  B.xpTambah(otak, 3, 'bertanya');
  console.log('\n【PERTANYAANKU #' + i + '】 ' + p.teks);
  console.log('【kenapa kutanya】 ' + p.mengapa);
  console.log('【hipotesisku】 ' + p.hipotesis);
}

console.log('\n==========================================');
console.log('UJI 3 — SEKOLAH MANDIRI (4 kelas)');
console.log('==========================================');
for (let i = 0; i < 4; i++) {
  const k = B.kerjakanKelas(st, otak, i);
  console.log('\n【KELAS ' + k.n + ' · ' + k.fakultas + '】 ' + k.soal);
  console.log('【jawab-ku】 ' + k.jawab);
  console.log('【skor】 ' + k.skor + (k.lulus ? ' (LULUS)' : ' (ULANG)'));
}

console.log('\n==========================================');
console.log('Pertumbuhan otak: xp=' + otak.xp + ', level=' + B.levelDari(otak.xp) + ', progres ' + B.xpProgres(otak.xp) + '%');
console.log('UJI SELESAI — SEMUA TANGGAPAN LAHIR TANPA SERVER');
