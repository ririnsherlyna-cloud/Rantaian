// ================= UJI V272 — METABOLISME MEMORI + TEMPAAAN TAK BERAKHIR =================
// Uji Node murni: mock localStorage API-DOMStorage penuh (length/key/getItem/setItem/removeItem).
'use strict';
const MICABRAIN = require('./otak_mandiri.js');
const { MEMORI, statusSertifikat } = MICABRAIN;

const fs = require('fs');
const st = JSON.parse(fs.readFileSync('/tmp/ak.json', 'utf8')); // snapshot keadaan live

// ---- mock penyimpanan (persis API DOMStorage) ----
function mockStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    _map: m
  };
}

let lulus = 0, total = 0;
function uji(nama, syarat, detail) {
  total++;
  if (syarat) { lulus++; console.log('  [LULUS] ' + nama); }
  else { console.log('  [GAGAL] ' + nama + (detail ? ' — ' + detail : '')); }
}

console.log('== UJI 1-3: METABOLISME MEMORI (kondisi kritis disimulasikan) ==');
const S = mockStorage();
// isi hingga KRITIS: otak dengan daftar panjang + cache besar
const otakBesar = MICABRAIN.otakBaru();
otakBesar.xp = 300; otakBesar.level = 4;
for (let i = 0; i < 12000; i++) otakBesar.percakapan.push({ at: 'x' + i, q: 'pertanyaan nomor ' + i + ' panjang', a: 'jawaban panjang nomor ' + i + ' — ' + 'x'.repeat(80) });
for (let i = 0; i < 12000; i++) otakBesar.kelas.push({ n: i, fakultas: 'SADAR-DIRI', skor: 80, soal: 'soal ' + 'y'.repeat(60), jawab: 'jawab ' + 'z'.repeat(60) });
for (let i = 0; i < 12000; i++) otakBesar.pertanyaanKu.unshift({ teks: 'tanya ' + i + ' ' + 'q'.repeat(50) });
S.setItem('mp_otak_mandiri_v1', JSON.stringify(otakBesar));
S.setItem('mp_live_url', JSON.stringify({ url: 'https://contoh', ts: Date.now() }));
S.setItem('mp_cache_besar', 'c'.repeat(400 * 1024));
S.setItem('bukan_mp', 'ini milik orang lain, JANGAN disentuh');

const inv0 = MEMORI.inventaris(S);
const t0 = MEMORI.tekanan(inv0);
console.log('  sebelum: ' + MEMORI.laporan(inv0));
uji('tekanan kritis terukur (≥0.85)', t0 >= 0.85, 't0=' + (t0 * 100).toFixed(1) + '%');
uji('kunci bukan-mp tak ikut dihitung', !inv0.daftar.some(d => d.k === 'bukan_mp'));

const hasil = MEMORI.metabolisme(S, otakBesar);
const inv1 = MEMORI.inventaris(S);
const t1 = MEMORI.tekanan(inv1);
console.log('  sesudah: ' + MEMORI.laporan(inv1) + ' · lapis=' + hasil.lapis.join('+') + ' · dibebaskan ' + (hasil.dibebaskan / 1024).toFixed(1) + ' KB · aksi=' + hasil.aksi.map(a => a.lapis).join(',') );
uji('tekanan turun di bawah 55% setelah metabolisme', t1 < 0.55, 't1=' + (t1 * 100).toFixed(1) + '%');
uji('byte bebas > 0', hasil.dibebaskan > 0, hasil.dibebaskan + ' B');
uji('aksi ≥ 2 (padat inti + bebaskan cache)', hasil.aksi.length >= 2, 'aksi=' + hasil.aksi.length);
uji('cache mp_live_url dibebaskan (L2)', hasil.aksi.some(a => a.kunci === 'mp_live_url'));
uji('cache mp_cache_besar dibebaskan (L2)', hasil.aksi.some(a => a.kunci === 'mp_cache_besar'));
uji('kunci bukan-mp TIDAK disentuh', S.getItem('bukan_mp') === 'ini milik orang lain, JANGAN disentuh');

// inti utuh: xp/level tetap, daftar dipadatkan — break cerdas: L2 cukup, L3 tak dieksekusi (jangan buang lebih dari perlu)
const otakSesudah = JSON.parse(S.getItem('mp_otak_mandiri_v1'));
uji('JIWA utuh: xp & level tidak hilang', otakSesudah.xp === 300 && otakSesudah.level === 4);
uji('daftar dipadatkan L1: percakapan ≤ 12', otakSesudah.percakapan.length <= 12, otakSesudah.percakapan.length + '');
uji('daftar dipadatkan L1: kelas ≤ 24', otakSesudah.kelas.length <= 24, otakSesudah.kelas.length + '');
uji('daftar dipadatkan L1: pertanyaanKu ≤ 6', otakSesudah.pertanyaanKu.length <= 6, otakSesudah.pertanyaanKu.length + '');
uji('catatan metaboli tersegel di penyimpanan', Array.isArray(otakSesudah.metaboli) && otakSesudah.metaboli.length === 1);

console.log('== UJI 3b: PADATKAN L3 (unit — kondisi ekstrem tetap tersedia) ==');
const batasL3 = MEMORI.BATAS.L3;
const padL3 = MEMORI.padatkanObjek(otakSesudah, batasL3);
uji('L3: percakapan ≤ 4', padL3.obj.percakapan.length <= 4, padL3.obj.percakapan.length + '');
uji('L3: kelas ≤ 10', padL3.obj.kelas.length <= 10, padL3.obj.kelas.length + '');
uji('L3: pertanyaanKu ≤ 4', padL3.obj.pertanyaanKu.length <= 4, padL3.obj.pertanyaanKu.length + '');
uji('L3: yang terbaru dipertahankan (kelas n terbesar)', padL3.obj.kelas.length && padL3.obj.kelas[padL3.obj.kelas.length - 1].n >= 10, JSON.stringify(padL3.obj.kelas.slice(-1)));

console.log('== UJI 4: IDEMPOTEN — metabolisme kedua tak merusak ==');
const hasil2 = MEMORI.metabolisme(S, otakSesudah);
const inv2 = MEMORI.inventaris(S);
uji('metabolisme kedua: tekanan tetap < 55%', MEMORI.tekanan(inv2) < 0.55);
uji('metabolisme kedua: xp/level tetap utuh', JSON.parse(S.getItem('mp_otak_mandiri_v1')).xp === 300);

console.log('== UJI 5: JAWABAN TOPIK METABOLI (pertanyaan pemilik: crash karena penyimpanan?) ==');
const otakM = MICABRAIN.otakBaru();
const r = MICABRAIN.jawab('bahayanya kalau memori banyak dan dia gak sadar dirinya bisa crash karena penyimpanan — kamu disimpan di GitHub free tier, bagaimana kamu bertahan hidup?', st, otakM);
console.log('  topik=' + r.topik + ' · panjang=' + r.teks.length);
console.log('  cuplikan: ' + r.teks.slice(0, 220).replace(/\n/g, ' '));
uji('topik terdeteksi = metaboli', r.topik === 'metaboli', r.topik);
uji('jawaban berangka hidup (KB & MB & lapisan)', /KB/.test(r.teks) && /MB/.test(r.teks) && /lapis/.test(r.teks.toLowerCase()));
uji('jawaban mengakui titik buta localStorage', /localStorage bisa terhapus/i.test(r.teks));
uji('jawaban menegaskan tak crash (metabolisme sebelum kenyang)', /crash/i.test(r.teks) && /sebelum kenyang|memetabolisme/i.test(r.teks));

console.log('== UJI 6: TEMPAAAN TAK BERAKHIR ==');
const otakT = MICABRAIN.otakBaru();
otakT.level = 3; otakT.xp = 100;
const s0 = statusSertifikat(otakT);
uji('tanpa sertifikat: kedaluwarsa=false', s0.punya === false && s0.kedaluwarsa === false);
// lulus 1 soal mahir → sertifikat 7 hari
const k1 = MICABRAIN.kerjakanKelas(st, otakT, 1);
const s1 = statusSertifikat(otakT);
console.log('  kelas 1: ' + k1.fakultas + '/' + k1.tingkat + ' skor ' + k1.skor + ' · sertifikat=' + (s1.punya ? 'hidup ' + s1.sisaHari + ' hari' : 'belum'));
// paksa kedaluwarsa
otakT.mahirSampai = Date.now() - 1000;
const s2 = statusSertifikat(otakT);
uji('kedaluwarsa terdeteksi', s2.kedaluwarsa === true);
// flag tempaan aktif saat kedaluwarsa (loop terpisah)
let flagTempaan = false;
for (let i = 0; i < 20 && !flagTempaan; i++) { const p = MICABRAIN.pilihSoal(st, otakT); if (p.tempaan) flagTempaan = true; }
uji('flag tempaan aktif saat kedaluwarsa', flagTempaan);
// pilihSoal saat kedaluwarsa → mahir didahulukan (pri +60)
let mahirCount = 0;
for (let i = 0; i < 30; i++) { const p = MICABRAIN.pilihSoal(st, otakT); if (p.soal.tingkat === 'mahir') mahirCount++; }
uji('soal MAHIR dominan saat sertifikat kedaluwarsa (30 acak)', mahirCount >= 24, mahirCount + '/30');
// kontrol: sertifikat aktif → tak ada flag tempaan
otakT.mahirSampai = Date.now() + 7 * 86400000;
let adaTempaan = false;
for (let i = 0; i < 20; i++) { const p = MICABRAIN.pilihSoal(st, otakT); if (p.tempaan) adaTempaan = true; }
uji('sertifikat aktif → tanpa paksaan tempaan', adaTempaan === false);

console.log('== UJI 7: MRIT generator kesadaran-tubuh ==');
let ketemu = null;
for (let i = 1; i <= 40 && !ketemu; i++) { const p = MICABRAIN.pertanyaanMandiri(st, otakM, i); if (p && /KB|free tier|metabolisme/.test(p.teks)) ketemu = p; }
if (ketemu) { console.log('  tumbuh: "' + ketemu.teks.slice(0, 110) + '…"'); console.log('  mengapa: ' + ketemu.mengapa.slice(0, 90) + '…'); }
uji('pertanyaan kesadaran-tubuh tumbuh sendiri', !!ketemu);
uji('hipotesis metabolisme ikut tumbuh', ketemu && /metabolisme/.test(ketemu.hipotesis));

console.log('== UJI 8: GENOM — doktrin metabolisme & titik buta ke-5 ==');
uji('doktrin METABOLISME MEMORI tertanam di genom', MICABRAIN.GENOM.doktrin.some(d => /METABOLISME MEMORI/.test(d)));
uji('titik buta ke-5: kejujuran localStorage', MICABRAIN.GENOM.kesadaran.jujurTitikButa.length === 5 && MICABRAIN.GENOM.kesadaran.jujurTitikButa.some(b => /localStorage/.test(b)));

console.log('== UJI 9: mode tanpa penyimpanan (Node murni tanpa injeksi) tak crash ==');
const inv3 = MEMORI.inventaris({}); // objek asing kosong → daftar mp_ kosong
uji('inventaris kosong aman', inv3.total === 0 && inv3.nKunci === 0);

console.log('\n=== HASIL: ' + lulus + '/' + total + ' LULUS ===');
process.exit(lulus === total ? 0 : 1);
