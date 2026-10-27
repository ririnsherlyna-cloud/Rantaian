#!/usr/bin/env node
// ============================================================
// UJI HARNESS V245 SARANG-BAWAAN — Node murni (vm sandbox).
// - mock SARANG (signature identik dgn API V243 asli)
// - DOM stub minimal (pelajaran Task 27: degradasi jujur)
// - jaringan NYATA: baca laporan dari Pages ririnsherlyna-cloud
// ============================================================
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert';

const ORGAN = '/home/z/my-project/scripts/sarang/organ_v245.js';
const teksOrgan = fs.readFileSync(ORGAN, 'utf8');

// ---------------- stub DOM ----------------
function buatEl(id) {
  return {
    id: id || '', innerHTML: '', textContent: '', style: {},
    parentNode: null, appendChild() {}, insertBefore() {},
    addEventListener() {}, querySelector() { return null; },
  };
}
const registry = {};
['v243-panel', 'v243-status', 'v245-bawaan', 'v245-led', 'v245-ringkas',
 'v245-daftar', 'v245-lain', 'v245-denyut', 'v245-catatan'].forEach(id => registry[id] = buatEl(id));
const panel = registry['v243-panel'], statusEl = registry['v243-status'];
panel.appendChild = (el) => { registry[el.id] = el; };
statusEl.parentNode = { insertBefore: (el) => { registry[el.id] = el; } };

const document = {
  getElementById: (id) => registry[id] || null,
  createElement: () => buatEl(),
  addEventListener() {}, hidden: false,
};

// ---------------- mock SARANG (signature = API V243 asli) ----------------
const keadaanMock = {
  cfg: { apiBase: 'https://api.github.com', owner: '', repo: '', branch: 'main', token: '',
         intervalSimpanMenit: 15, autoSimpan: true, pulihBoot: true, pagesUrl: '' },
  cfgSetCalls: [], pulihCalls: 0, versiCalls: 0,
};
const SARANG = {
  versi: '1.0', nama: 'SAKTI-SARANG',
  status() { return { cfg: { ...keadaanMock.cfg } }; },
  cfgSet(obj) { keadaanMock.cfgSetCalls.push({ ...obj }); Object.assign(keadaanMock.cfg, obj); return true; },
  pulih() { keadaanMock.pulihCalls++; return Promise.resolve({ ok: true, dipulihkan: false, alasan: 'mock' }); },
  pemeriksaVersi() { keadaanMock.versiCalls++; return Promise.resolve({ ok: true, sama: true }); },
};

// ---------------- localStorage stub ----------------
const l1 = new Map();
const localStorage = {
  getItem: (k) => (l1.has(k) ? l1.get(k) : null),
  setItem: (k, v) => { l1.set(k, String(v)); },
  removeItem: (k) => { l1.delete(k); },
};

const window = { V231_SAKTI: { SARANG } };

const sandbox = {
  window, document, localStorage,
  location: undefined, // disengaja: organ harus degradasi jujur tanpa location
  fetch: globalThis.fetch.bind(globalThis),
  AbortController, Promise, Date, Math, JSON, Number, String, isNaN, isFinite, setInterval: () => 0,
  clearInterval() {}, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 5000)),
  clearTimeout, console,
};
vm.createContext(sandbox);
vm.runInContext(teksOrgan, sandbox, { filename: 'organ_v245.js' });

const API = window.V231_SAKTI.SASARAN;
assert(API && /^1\.\d+$/.test(API.versi) && API.organ === 'V245', 'API terpasang di window.V231_SAKTI.SASARAN (v' + (API && API.versi) + ')');
assert(API.versi === '1.1', 'T0 organ v1.1 (misi + TUJUAN.md)');
console.log('T0 PASS — organ lahir, API SASARAN terekspos (v' + API.versi + ')');

// ---------------- T1: pasang pertama tanpa isian ----------------
// boot() organ sudah memasang saat load — reset total utk simulasi browser BARU
keadaanMock.cfg.owner = ''; keadaanMock.cfg.repo = ''; keadaanMock.cfg.pagesUrl = '';
keadaanMock.cfgSetCalls.length = 0;
l1.delete('mp245.bawaan');
const t1 = API.pasangBawaan();
assert(t1.ok === true && t1.cara === 'pasang pertama — tanpa isian', 'T1 cara pasang: ' + t1.cara);
assert(keadaanMock.cfgSetCalls.length === 1, 'T1 cfgSet tepat 1 kali');
const c1 = keadaanMock.cfgSetCalls[0];
assert(c1.owner === 'ririnsherlyna-cloud' && c1.repo === 'Micaprofita-' && c1.branch === 'main', 'T1 alamat bawaan benar');
assert(c1.pagesUrl === 'https://ririnsherlyna-cloud.github.io/Micaprofita-/', 'T1 pagesUrl benar');
assert(!('token' in c1), 'T1 token TIDAK disentuh organ bawaan');
assert(JSON.parse(l1.get('mp245.bawaan')).owner === 'ririnsherlyna-cloud', 'T1 mp245.bawaan tercatat');
console.log('T1 PASS — pasang pertama: sarang terpasang otomatis, token tak disentuh');

// ---------------- T2: konfigurasi manual pemilik dihormati ----------------
keadaanMock.cfgSetCalls.length = 0;
l1.delete('mp245.bawaan'); // simulasi browser lain dgn config manual
SARANG.cfgSet({ owner: 'pemilik-manual', repo: 'repo-lain', token: 'TOKENDIRAHASIA' });
keadaanMock.cfgSetCalls.length = 0; // jejak setup dibersihkan — yang dinilai hanya pasangBawaan
const t2 = API.pasangBawaan();
assert(t2.ok && t2.cara.indexOf('dihormati') > 0, 'T2 cara: ' + t2.cara);
assert(keadaanMock.cfgSetCalls.length === 0, 'T2 cfgSet TIDAK dipanggil');
assert(keadaanMock.cfg.owner === 'pemilik-manual', 'T2 config manual utuh');
console.log('T2 PASS — aturan pemilik manual dihormati, tidak ditimpa');

// ---------------- T3: konfig bawaan mengikuti halaman (sinkron) ----------------
keadaanMock.cfgSetCalls.length = 0;
SARANG.cfgSet({ owner: 'pemilik-manual', repo: 'repo-lain', token: '' }); // reset manual
l1.set('mp245.bawaan', JSON.stringify({ owner: 'ririnsherlyna-cloud', repo: 'Micaprofita-' }));
SARANG.cfgSet({ owner: 'ririnsherlyna-cloud', repo: 'Micaprofita-' }); // config milik bawaan
const t3 = API.pasangBawaan();
assert(t3.ok && (t3.cara === 'sudah sinkron dengan alamat halaman' || t3.cara === 'mengikuti alamat halaman'), 'T3 cara: ' + t3.cara);
console.log('T3 PASS — konfig milik bawaan terkelola (tanpa merusak config manual): ' + t3.cara);

// ---------------- T4: baca otak server NYATA dari Pages ----------------
SARANG.cfgSet({ owner: 'ririnsherlyna-cloud', repo: 'Micaprofita-', pagesUrl: 'https://ririnsherlyna-cloud.github.io/Micaprofita-/', token: '' });
l1.set('mp245.bawaan', JSON.stringify({ owner: 'ririnsherlyna-cloud', repo: 'Micaprofita-' }));
const t4 = await API.bacaServer();
assert(t4.ok === true, 'T4 bacaServer ok, galat: ' + (t4.galat || '-'));
assert(Number.isInteger(t4.siklus) && t4.siklus >= 1, 'T4 siklus: ' + t4.siklus);
const k = API.keadaan();
assert(k.server && k.server.sasaranHariIni && k.server.sasaranHariIni.length >= 1, 'T4 sasaran tersaji: ' + (k.server ? k.server.sasaranHariIni.length : 0));
const daftar = registry['v245-daftar'].innerHTML;
for (const s of k.server.sasaranHariIni) {
  assert(daftar.includes('>' + s.simbol + '<'), 'T4 daftar memuat ' + s.simbol);
  assert(daftar.includes('v245-arah ' + s.arah), 'T4 arah ' + s.arah + ' utk ' + s.simbol);
  assert(daftar.includes('width:' + s.keyakinan + '%'), 'T4 bar keyakinan ' + s.keyakinan + '% utk ' + s.simbol);
}
const sampel = k.server.sasaranHariIni[0];
if (sampel.ketBukti) {
  const salahSatu = Object.values(sampel.ketBukti)[0];
  assert(registry['v245-daftar'].innerHTML.includes(salahSatu.slice(0, 24)), 'T4 tooltip ketBukti tersaji');
}
const ringkas = registry['v245-ringkas'].innerHTML;
assert(ringkas.includes('denyut <b>#' + t4.siklus + '</b>'), 'T4 ringkas memuat denyut #' + t4.siklus);
const a = k.server.akurasi;
const dinilai = (a.benar || 0) + (a.salah || 0);
if (dinilai === 0) assert(ringkas.indexOf('belum ada') < 0, 'T4 ringkas fokus rezim (akurasi diceritakan di baris lain)');
const lainTeks = registry['v245-lain'].innerHTML;
if (dinilai === 0) assert(lainTeks.includes('belum ada yang dinilai'), 'T4 akurasi jujur saat belum dinilai');
else assert(lainTeks.includes('%'), 'T4 akurasi persen tersaji');
const dn = registry['v245-denyut'].textContent;
assert(dn.includes('#' + k.denyut[0].siklus), 'T4 garis waktu denyut tersaji');
assert(registry['v245-catatan'].innerHTML.includes('tanpa token'), 'T4 catatan jujur tersaji');
console.log(`T4 PASS — otak server nyata terbaca: siklus ${t4.siklus}, ${t4.sasaran} sasaran, ${k.denyut.length} denyut`);

// ---------------- T5: galat jaringan = jujur, tidak meledak ----------------
SARANG.cfgSet({ pagesUrl: 'https://alamat-tak-ada.invalid/' });
const t5 = await API.bacaServer();
assert(t5.ok === false && t5.galat.length > 0, 'T5 galat tercatat: ' + t5.galat);
assert(registry['v245-ringkas'].innerHTML.includes('belum terjangkau'), 'T5 pesan jujur tampil');
console.log('T5 PASS — galat jaringan ditangani jujur: "' + t5.galat + '"');

// ---------------- T6: self-test organ ----------------
const t6 = API.selfTest();
assert(t6.pass === t6.total && t6.fail === 0, 'T6 self-test ' + t6.pass + '/' + t6.total + ' gagal: ' + t6.rincian.join('; '));
console.log(`T6 PASS — self-test organ ${t6.pass}/${t6.total}`);

// ---------------- T7: pulih + pemeriksa versi dipicu (jalur tanpa token) ----------------
await new Promise(r => setTimeout(r, 3400));
assert(keadaanMock.pulihCalls >= 1 && keadaanMock.versiCalls >= 1, `T7 pulih=${keadaanMock.pulihCalls} versi=${keadaanMock.versiCalls}`);
console.log('T7 PASS — pulih memori + pemeriksa tubuh baru ikut menyala tanpa token');

console.log('\nSEMUA UJI V245 LULUS — terima-pasang terbukti: sarang otomatis, sasaran langsung, satu keadaan untuk semua.');
