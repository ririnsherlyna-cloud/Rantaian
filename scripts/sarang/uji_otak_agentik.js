// UJI OTAK AGENTIK V275 — pemahaman kripto, larik pikir, neuron, sekolah
// Jalankan: node scripts/sarang/uji_otak_agentik.js  (snapshot: /tmp/ak.json)
const fs = require('fs');
const path = require('path');
const M = require('./otak_mandiri.js');

const st = JSON.parse(fs.readFileSync('/tmp/ak.json', 'utf8'));
const otak = M.otakBaru();

let lulus = 0, total = 0;
function uji(nama, cond, detail) {
  total++;
  console.log((cond ? '  OK ' : '!! GAGAL ') + nama + (cond ? '' : ' — ' + (detail || '')));
  if (cond) lulus++;
}

console.log('=== V275 OTAK AGENTIK — UJI PEMAHAMAN & LARIK PIKIR ===');

// 1. LARIK PIKIR lengkap di jawaban spesialis
const r1 = M.jawabAgentic('kenapa stop loss wajib dipasang sebelum entry?', st, otak);
uji('larik 5 langkah (V278: +SERANG-DIRIKU)', r1.larik && r1.larik.langkah.length === 5, JSON.stringify(r1.larik && r1.larik.langkah && r1.larik.langkah.length));
uji('langkah-5 serang diriku ada', /SERANG DIRIKU/.test(r1.larik.langkah[4].n) && r1.larik.langkah[4].t.length > 20, r1.larik.langkah[4] && r1.larik.langkah[4].t);
uji('langkah-1 memahami', /MEMAHAMI/.test(r1.larik.langkah[0].n) && r1.larik.langkah[0].t.length > 15);
uji('langkah-2 bukti angka hidup', r1.larik.buktiN > 0, 'buktiN=' + (r1.larik && r1.larik.buktiN));
uji('neuron menyala', r1.larik.neuron.length > 0 && r1.larik.neuron.some(n => n.label));
uji('jawaban sebut stop+entry', /stop/i.test(r1.teks) && /entry/i.test(r1.teks));
uji('cek silang ada', /CEK SILANG/.test(r1.teks));

// 2. Kepahaman kripto — pertanyaan funding (dulu "bodoh", kini neuron bicara)
const r2 = M.jawabAgentic('funding rate tinggi itu bahaya nggak buat posisi long?', st, otak);
uji('funding dipahami', /funding/i.test(r2.teks) && r2.teks.length > 350, 'len=' + r2.teks.length);
uji('neuron funding/PASAR aktif', r2.larik.neuron.some(n => ['funding', 'kelelahanArah', 'ukuran'].includes(n.id)), JSON.stringify(r2.larik.neuron.map(n => n.id)));

// 3. Ukuran posisi & risiko
const r3 = M.jawabAgentic('kapan ukuran posisi harus dikecilkan?', st, otak);
uji('ukuran dipahami dari bukti', /ukuran|mikro|keyakinan/i.test(r3.teks) && r3.teks.length > 350, 'len=' + r3.teks.length);

// 4. Monte Carlo
const r4 = M.jawabAgentic('apa arti P(tembus sasaran) di Monte Carlo?', st, otak);
uji('MC dipahami', /monte carlo|lintasan|probabilitas|distribusi/i.test(r4.teks), 'len=' + r4.teks.length);

// 5. Pertanyaan aneh — fallback AGENTIK tak boleh dangkal
const r5 = M.jawabAgentic('bagaimana pendapatmu tentang zero knowledge proof buat privasi onchain?', st, otak);
uji('fallback tetap kaya (>600 char)', r5.teks.length > 600, 'len=' + r5.teks.length);
uji('fallback jujur mengaku', /belum punya fakultas|mengaku/i.test(r5.teks));
uji('fallback tetap bawa bukti medan', /rezim|F&G|rekor|pick/i.test(r5.teks));
uji('fallback larik lengkap', r5.larik.langkah.length === 5);

// 6. Neuron: aktivasi menyebar lewat edge
const akt = M.aktifkanNeuron('kenapa korelasi antar koin bahaya?', st);
uji('benih korelasi', akt.benih.includes('korelasi'));
uji('aktivasi menyebar ke ukuran/breadth', akt.list.some(x => x.n.id === 'ukuran') && akt.list.some(x => x.n.id === 'breadth'), JSON.stringify(akt.list.map(x => x.n.id)));

// 7. buktiHidup: angka nyata
const bk = M.buktiHidup(st);
uji('bukti hidup >= 5 angka', bk.length >= 5, 'n=' + bk.length);

// 8. NEURON jaring utuh: semua edge menunjuk neuron yang ada
const ids = new Set(M.NEURON.map(n => n.id));
const edgeRusak = M.NEURON.flatMap(n => (n.edge || []).filter(e => !ids.has(e)));
uji('edge tanpa neuron hantu', edgeRusak.length === 0, JSON.stringify(edgeRusak));
uji('44+ neuron, gugus >= 6 (V276: +CUAN = 7)', M.NEURON.length >= 40 && new Set(M.NEURON.map(n => n.kl)).size >= 6, 'n=' + M.NEURON.length + ' gugus=' + new Set(M.NEURON.map(n => n.kl)).size);

// 9. Sekolah kilat: KRIPTO-MAHIR hidup + adaptif
uji('kurikulum 39+ soal', M.KURIKULUM.length >= 39, 'n=' + M.KURIKULUM.length);
uji('fakultas KRIPTO-MAHIR ada', M.KURIKULUM.some(s => s.fakultas === 'KRIPTO-MAHIR'));
const kripto = M.KURIKULUM.filter(s => s.fakultas === 'KRIPTO-MAHIR');
uji('soal kripto pakai bukti hidup', kripto.some(s => s.kunci(st).includes('entry') || /koin|universe/i.test(s.kunci(st))));
// kerjakan kelas beberapa kali — fakultas baru ikut terpilih
const fakTerpilih = new Set();
for (let i = 0; i < 8; i++) { const r = M.kerjakanKelas(st, otak, i); if (r) fakTerpilih.add(r.fakultas); }
uji('kelas kilat jalan 8x', otak.kelas.length === 8);
console.log('  fakultas terpilih:', [...fakTerpilih].join(', '));
uji('kuas terekam (fakultasRingkas)', M.fakultasRingkas(otak).length > 0);

// 10. MRIT: neuron-lapar generator hidup
const p = M.pertanyaanMandiri(st, otak, 1);
uji('pertanyaan mandiri tetap lahir', p && p.teks && p.mengapa && p.hipotesis);
// paksa semua neuron terpakai → generator lapar mengundurkan diri (null → generator lain)
otak.neuronPakai = {}; M.NEURON.forEach(n => otak.neuronPakai[n.id] = 1);
const p2x = M.pertanyaanMandiri(st, otak, 77);
uji('neuron-lapar mundur saat kenyang (generator lain jalan)', p2x !== null);

// 11. XP & otak sehat
uji('xp bertumbuh', otak.xp > 20, 'xp=' + otak.xp);
uji('neuronPakai tercatat', Object.keys(otak.neuronPakai || {}).length > 0);

// 12. Doktrin AGENTIK di GENOM
uji('doktrin AGENTIK tertanam', M.GENOM.doktrin.some(d => /AGENTIK/.test(d)));
uji('doktrin lama tak bergeser (idx3 = KONSERVATISME)', /KONSERVATISME/.test(M.GENOM.doktrin[3]));

// 13. V278-DEBAT-TEMPUR — tim merah, mahkota, buku-salah
uji('doktrin DEBAT-AGENTIK tertanam', M.GENOM.doktrin.some(d => /DEBAT-AGENTIK/.test(d)), 'doktrin ke-10');
uji('neuron 50+ (V278: +kelly/variansiDrag/betaBtc)', M.NEURON.length >= 50, 'n=' + M.NEURON.length);
uji('neuron kelly hidup', M.NEURON.some(n => n.id === 'kelly' && n.kl === 'CUAN'));
uji('neuron variansiDrag hidup', M.NEURON.some(n => n.id === 'variansiDrag' && n.kl === 'CUAN'));
uji('neuron betaBtc hidup', M.NEURON.some(n => n.id === 'betaBtc' && n.kl === 'PASAR'));
uji('52 soal × 4 tingkat (mahkota)', M.KURIKULUM.length >= 51 && M.KURIKULUM.some(s => s.tingkat === 'mahkota'), 'n=' + M.KURIKULUM.length);
uji('mahkota: tugas tempur + kelly + batas', M.KURIKULUM.filter(s => s.tingkat === 'mahkota').length >= 3);
const r6 = M.jawabAgentic('apa pendapatmu soal pick hari ini?', st, M.otakBaru());
uji('larik-5 menyerang pick hidup', /SERANG DIRIKU/.test(r6.larik.langkah[4].n) && r6.larik.langkah[4].t.length > 20, r6.larik.langkah[4] && r6.larik.langkah[4].t.slice(0, 60));
const rt = M.seranganRedTeam(M.pickKu(st), st);
uji('seranganRedTeam struktur', rt && Array.isArray(rt.serangan) && Array.isArray(rt.bertahan) && typeof rt.tekanan === 'number');
uji('seranganRedTeam hidup (pick punya bukti)', rt.serangan.length + rt.bertahan.length > 0, 'serangan=' + rt.serangan.length + ' bertahan=' + rt.bertahan.length + ' tekanan=' + rt.tekanan);
const otakS = M.otakBaru();
M.catatSalah(otakS, 3); M.catatSalah(otakS, 3); M.catatSalah(otakS, 7);
const bs = M.bukuSalah(otakS);
uji('buku-salah catat & urut gagal', bs.length === 2 && bs[0].idx === 3 && bs[0].gagal === 2, JSON.stringify(bs));
const kls = M.kelasKilat(st, otakS, 6);
const adaMahkotaRec = kls.some(k => k.tingkat === 'mahkota');
uji('kelas kilat jalan (6 soal)', kls.length === 6 && kls.every(k => k.jawab && k.jawab.length > 30), 'n=' + kls.length);
uji('mahkota terbuka saat level cukup', otakS.level >= 4 ? kls.some(k => k.tingkat === 'mahkota' || k.tingkat === 'mahir') : true, 'level=' + otakS.level);
uji('MRIT debat-lapar menyala', (() => { for (let i = 0; i < 40; i++) { const q = M.pertanyaanMandiri(st, M.otakBaru(), i); if (q && /tim merah|serangan/i.test(q.teks)) return true; } return false; })());
uji('soal mahkota kunci bawa rencana+serangan', (() => { const s2 = M.KURIKULUM.find(x => x.tingkat === 'mahkota' && x.fakultas === 'KRIPTO-MAHIR'); const j = s2.kunci(st, M.otakBaru()); return /RENCANA|arah|entry/i.test(j) && /SERANGAN|serangan/i.test(j); })());

console.log('=== HASIL: ' + lulus + '/' + total + ' LULUS ===');
process.exit(lulus === total ? 0 : 1);
