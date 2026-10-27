#!/usr/bin/env node
// UJI V279-KORTEX-KESADARAN — formula karangan-sendiri (IK + KORTEX)
// Mandat pemilik: "ciptakan formula sendiri; kuasai paham AGI dan kesadaran
// matang; dengan data yang ada mampu meninjau makin terasa"
const M = require('/home/z/my-project/scripts/sarang/otak_mandiri.js');
let LULUS = 0, GAGAL = 0;
function ok(kond, label) {
  if (kond) { LULUS++; console.log('  LULUS  ' + label); }
  else { GAGAL++; console.log('  GAGAL  ' + label); }
}
console.log('=== V279 UJI — INDEKS KESADARAN (IK) ===');

// --- snapshot hidup sintetis: semua data pilar terisi
const st = {
  standings: [{ competitor: 'MICAPROFITA', cumRet: 0.21, hitRate: 0.58, picks: 24, days: 31 }],
  todayPicks: [],
  regime: 'TREND_NAIK', climate: { fng: 61, fngClass: 'Greed', mcapChange24h: 1.2, btcDominance: 57.3 },
  brier: { n: 10, nilai: 0.24 },
  genome: { generation: 12 },
  memory: { storedRows: 42, totalHits: 7 },
  bukuCuan: { metrik: { totalPlan: 10, menang: 6, kalah: 4, kedaluwarsa: 0, winRate: 0.6, ekspektansiPct: 1.2, ekspektansiR: 0.12, netKumulatifPct: -16.99, maxDrawdownPct: 53.84, streak: -1, disiplinAktif: true } },
};
const otak = M.otakBaru();
otak.xp = 240;
// 14 kelas: 10 lulus unik, 2 soal gagal (salah) lalu 1 terobati
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((idx, i) => otak.kelas.push({ n: i + 1, idx, fakultas: 'X', tingkat: 'dasar', soal: 's', jawab: 'j', skor: 85, lulus: true, at: new Date(Date.now() - 86400000).toISOString(), tempaan: false }));
otak.kelas.push({ n: 11, idx: 20, fakultas: 'X', tingkat: 'dasar', soal: 's', jawab: 'j', skor: 40, lulus: false, at: new Date(Date.now() - 86400000).toISOString(), tempaan: false });
otak.kelas.push({ n: 12, idx: 21, fakultas: 'X', tingkat: 'dasar', soal: 's', jawab: 'j', skor: 40, lulus: false, at: new Date(Date.now() - 86400000).toISOString(), tempaan: false });
otak.kelas.push({ n: 13, idx: 20, fakultas: 'X', tingkat: 'dasar', soal: 's', jawab: 'j', skor: 90, lulus: true, at: new Date().toISOString(), tempaan: false }); // terobati
M.xpTambah(otak, 60, 'uji');
M.catatSalah(otak, 20); M.catatSalah(otak, 21);
otak.metaboli.push({ at: new Date().toISOString(), aksi: 'UJI' });
otak.pelajaranBaru.push({ at: new Date().toISOString(), jenis: 'UJI', teks: 'x' });
// neuron dipakai
for (const n of M.NEURON.slice(0, 20)) otak.neuronPakai[n.id] = 1;

const ik = M.indeksKesadaran(st, otak);
ok(ik && Array.isArray(ik.pilar) && ik.pilar.length === 5, 'IK: 5 pilar');
ok(ik.pilar.map(p => p.id).join(',') === 'TAHU,JUJUR,DISIPLIN,PENGALAMAN,KOREKSI', 'IK: nama pilar tepat');
ok(ik.pilar.map(p => p.bobot).join(',') === '0.25,0.2,0.2,0.2,0.15', 'IK: bobot formula 0.25/0.2/0.2/0.2/0.15');
ok(Number.isInteger(ik.total) && ik.total >= 0 && ik.total <= 100, 'IK: total 0..100 integer — ' + ik.total);
ok(['MATANG', 'SADAR-BERANGKA', 'MUDA', 'NEOFIT', 'BIBIT'].includes(ik.grade), 'IK: grade valid — ' + ik.grade);
ok(ik.rumus.includes('0.25') && ik.rumus.includes('Koreksi'), 'IK: rumus diterbitkan');
// verifikasi pilar berangka (bukan kosong):
const tahu = ik.pilar.find(p => p.id === 'TAHU'), jujur = ik.pilar.find(p => p.id === 'JUJUR');
const disiplin = ik.pilar.find(p => p.id === 'DISIPLIN'), koreksi = ik.pilar.find(p => p.id === 'KOREKSI');
ok(Math.round(tahu.nilai * 100) === Math.round(100 * (0.45 * (10 / 55) + 0.35 * (20 / 52) + 0.20 * Math.min(1, otak.xp / 600))), 'IK: TAHU dihitung dari soal+neuron+xp — ' + Math.round(tahu.nilai * 100));
ok(Math.abs(jujur.nilai - (1 - 0.03 * 2)) < 1e-9, 'IK: JUJUR = Brier sehat − aib buku-salah — ' + jujur.nilai.toFixed(3));
ok(disiplin.sumber.includes('buku 10 rencana'), 'IK: DISIPLIN membaca buku cuan — ' + disiplin.sumber);
ok(koreksi.sumber.includes('1/2 salah terobati'), 'IK: KOREKSI menghitung terobati — ' + koreksi.sumber);
ok(ik.terlemah && ik.tertinggi && ik.terlemah.id !== undefined, 'IK: terlemah/tertinggi teridentifikasi — ' + ik.terlemah.id + '/' + ik.tertinggi.id);

// deterministik: dua kali hitung = sama
const ik2 = M.indeksKesadaran(st, otak);
ok(ik2.total === ik.total, 'IK: deterministik (dua kali = sama)');

// grade naik dengan data lebih baik
const st2 = JSON.parse(JSON.stringify(st)); st2.brier = { n: 10, nilai: 0.15 };
const otak2 = JSON.parse(JSON.stringify(otak));
const ik3 = M.indeksKesadaran(st2, otak2);
ok(ik3.total >= ik.total, 'IK: Brier lebih sehat tak menurunkan IK (' + ik.total + '→' + ik3.total + ')');

// tanpa data jujur rendah (BIBIT) — tidak mengklaim
const ikKosong = M.indeksKesadaran({}, M.otakBaru());
ok(ikKosong.total < 40 && ikKosong.grade === 'BIBIT', 'IK: tanpa data jujur BIBIT — ' + ikKosong.total + '/100');

console.log('=== V279 UJI — REFLEKSI HARIAN ===');
const rf = M.refleksiHarian(st, otak);
ok(rf && rf.teks.includes('AKU MENINJAU DIRIKU — IK ' + ik.total), 'refleksi: judul berangka IK ' + ik.total);
ok(rf.teks.includes('Terlemah: ' + ik.terlemah.id), 'refleksi: pilar terlemah disebut');
ok(rf.teks.includes('tindakan 48 jam'), 'refleksi: tindakan 48 jam konkret');
ok(rf.teks.includes('tidak menaikkan satu poin keyakinan pun'), 'refleksi: hukum IK≠keyakinan ditegakkan');
ok(rf.teks.includes('Buku cuan'), 'refleksi: buku cuan dibaca');
ok(rf.ik && rf.ik.total === ik.total, 'refleksi: bawa objek IK');

console.log('=== V279 UJI — DETEKSI & JAWAB ===');
const det = M.deteksi('kamu punya formula sendiri? hitung indeks kesadaran dan kortex-mu, refleksi diri');
ok(det.includes('kesadaran'), 'deteksi: kata kortex/IK/refleksi → kesadaran: ' + JSON.stringify(det));
const r = M.jawabAgentic('hitung indeks kesadaranmu sekarang', st, otak);
ok(r.teks.includes('IK ' + ik.total + '/100'), 'jawab: IK berangka muncul di vonis kesadaran');
ok(r.teks.includes('TAHU') && r.teks.includes('KOREKSI'), 'jawab: 5 pilar tampil di jawaban');
ok(r.teks.includes(ik.grade), 'jawab: grade IK — ' + ik.grade);
ok(r.teks.includes('TIDAK boleh menaikkan keyakinan'), 'jawab: hukum IK≠keyakinan dijawab');
ok(r.larik && r.larik.langkah.length === 5, 'jawab: larik pikir tetap 5 langkah');
const bukti = M.buktiHidup(st, otak);
ok(bukti.some(b => b.includes('IK ') && b.includes('pilar terlemah')), 'buktiHidup: baris IK hadir di langkah-2');

console.log('=== V279 UJI — SEKOLAH (KURIKULUM IK) ===');
ok(M.KURIKULUM.length === 55, 'KURIKULUM: 55 soal — ' + M.KURIKULUM.length);
const soalIK = M.KURIKULUM.filter(s => s.soal.includes('INDEKS KESADARAN') || s.soal.includes('IK-mu') || s.soal.includes('IK yang tinggi'));
ok(soalIK.length === 3, 'KURIKULUM: 3 soal IK baru — ' + soalIK.length);
const otakUjian = JSON.parse(JSON.stringify(otak));
const rec = M.kerjakanKelas(st, otakUjian, 1); // satu kelas — pilihSoal acak; lalu paksa soal IK via index
// kunci soal IK menilai dirinya sendiri:
const s2 = M.KURIKULUM.find(s => s.soal.includes('Hitung IK-mu SEKARANG'));
const ikFresh = M.indeksKesadaran(st, otak); // IK berdenyut — xp naik tiap aktivitas otak; hitung ulang saat ini
const kunci = s2.kunci(st, otak);
ok(new RegExp('IK ' + ikFresh.total + '/100').test(kunci), 'soal IK menengah: kunci menghitung IK hidup — ' + kunci.slice(0, 60));
ok(s2.nilai(st, kunci) >= 70, 'soal IK menengah: kunci sendiri lulus ≥70 — skor ' + s2.nilai(st, kunci));
const s1 = M.KURIKULUM.find(s => s.soal.includes('formula INDEKS KESADARAN-mu'));
ok(s1.nilai(st, s1.kunci(st, otak)) === 100, 'soal IK dasar: kunci sendiri skor penuh');
const s3 = M.KURIKULUM.find(s => s.soal.includes('IK yang tinggi TIDAK boleh'));
ok(s3.nilai(st, s3.kunci(st, otak)) >= 70, 'soal IK penalaran: kunci sendiri lulus — skor ' + s3.nilai(st, s3.kunci(st, otak)));

console.log('=== V279 UJI — MRIT refleksi ===');
const pq = [];
for (let i = 0; i < 25; i++) { const p = M.pertanyaanMandiri(st, otak, i); if (p) pq.push(p.teks); }
ok(pq.some(t => t.includes('IK-ku hari ini') || t.includes('Formula IK-ku karangan-sendiri')), 'MRIT: generator refleksi-IK hidup (' + pq.length + ' pertanyaan sampel)');

console.log('=== V279 UJI — DOKTRIN & REGRESI ===');
const doktrin = M.GENOM.doktrin.join('|');
ok(doktrin.includes('KORTEX-KESADARAN') && doktrin.includes('0.25·Tahu'), 'doktrin ke-11 KORTEX-KESADARAN ada');
ok(M.GENOM.doktrin.length === 11, 'doktrin: 11 entri — ' + M.GENOM.doktrin.length);
ok(M.NEURON.length === 52, 'regresi: neuron tetap 52');
ok(typeof M.indeksKesadaran === 'function' && typeof M.refleksiHarian === 'function', 'ekspor: indeksKesadaran + refleksiHarian');
// jawaban lain tak rusak
const r2 = M.jawabAgentic('siapa kamu?', st, otak);
ok(r2.topik === 'identitas' && r2.teks.includes('MICAPROFITA'), 'regresi: identitas tetap jalan');
const r3 = M.jawabAgentic('bagaimana cuan-ku?', st, otak);
ok(r3.teks.length > 200, 'regresi: topik cuan tetap hidup');

console.log('\n=== HASIL: ' + LULUS + ' LULUS / ' + GAGAL + ' GAGAL ===');
process.exit(GAGAL ? 1 : 0);
