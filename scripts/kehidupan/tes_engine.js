/* ============================================================
   UJI SMOKE NODE — V284-PROTOLIFE
   Buktikan di luar browser: penemuan BENAR-BENAR terjadi lewat
   pencarian nyata (bukan jadwal), dunia hidup, persistensi utuh.
   ============================================================ */
'use strict';
const core = require('/home/z/my-project/scripts/kehidupan/engine_core.js');
const K = require('/home/z/my-project/scripts/kehidupan/engine_world.js');

let lulus = 0, gagal = 0;
function uji(nama, kondisi, detail) {
  if (kondisi) { lulus++; console.log('  LULUS  ' + nama); }
  else { gagal++; console.log('  GAGAL  ' + nama + (detail ? ' — ' + detail : '')); }
}

console.log('== 1. VERIFIKATOR: genom buatan tangan harus lulus ==');
function gDari(hexs) { const a = new Uint8Array(hexs.length); for (let i = 0; i < hexs.length; i++) a[i] = parseInt(hexs[i], 16) & 15; return a; }
// NOT: LOAD(m0), MOVA, NAND  — r2=~x
const gNOT = gDari('1' + 'a' + '7' + '00000000000000000000');
const eNOT = core.evalTarget(core.TARGETS[1], gNOT, 48);
uji('NOT terverifikasi penuh (15 vektor)', eNOT.skor === 1, JSON.stringify(eNOT));
// AND: LDI0, LOAD, MOVA, LDI1, LOAD, AND
const gAND = gDari('9' + '0' + '1' + 'a' + '9' + '1' + '1' + '4' + '0000000000000000');
const eAND = core.evalTarget(core.TARGETS[2], gAND, 48);
uji('AND terverifikasi penuh (14 vektor)', eAND.skor === 1, JSON.stringify(eAND));
// XOR-DARI-NAND (subset): a^b = NAND(NAND(a,NAND(a,b)), NAND(b,NAND(a,b)))
// r0=a: LDI0,LOAD,MOVA(r1=a),LOAD(r0=b)... bangun manual:
// mem0=a mem1=b; t=NAND(a,b)=~(a&b); u=NAND(a,t)=~(a&~(a&b)); v=NAND(b,t)=~(b&~(a&b)); out=NAND(u,v)=a^b
// program: LDI0;LOAD(a);MOVA(r1=a);LDI1;LOAD(b);NAND(t);MOVC(r2=t)? perlu simpan t ke mem: LDI2;MOVB(r0=t);STORE(m2=t)
// lalu: LDI0;LOAD(a);MOVA(r1=a)?? r1=a, r0=a; LD? butuh t: LDI2;LOAD(r0=m2=t); NAND(r2=~(a&t)=u); MOVB(r0=u); ... panjang. Uji via pencarian saja.
console.log('== 2. XOR-DARI-NAND harus ditemukan oleh PENCARIAN (bukan tangan) ==');
(function () {
  const t = core.TARGETS[5];
  let best = null, skor = 0, evals = 0;
  const rnd = core.mulberry32(20261006);
  function acak() { const g = new Uint8Array(24); for (let i = 0; i < 24; i++) g[i] = (rnd() * 16) | 0; return g; }
  function mut(g) { const c = new Uint8Array(g); const n = 1 + ((rnd() * 3) | 0); for (let k = 0; k < n; k++) { const p = (rnd() * 24) | 0; c[p] = rnd() < 0.5 ? (rnd() * 16) | 0 : (c[p] + 1 + ((rnd() * 15) | 0)) & 15; } return c; }
  let stall = 0;
  while (skor < 1 && evals < 400000) {
    const kandidat = (!best || stall > 350) ? acak() : mut(best);
    if (stall > 350) { best = null; stall = 0; }
    const e = core.evalTarget(t, kandidat, 48);
    evals++;
    if (e.skor > skor) { skor = e.skor; best = kandidat; stall = 0; } else stall++;
  }
  console.log('   eval terpakai: ' + evals.toLocaleString('id-ID') + ', skor akhir ' + (skor * 100).toFixed(0) + '%');
  uji('XOR-DARI-NAND ditemukan murni oleh pencarian', skor === 1, 'skor=' + skor);
  if (skor === 1) console.log('   genom: ' + Array.from(best).map(x => x.toString(16)).join(''));
})();

console.log('== 3. DUNIA: hidup, berevolusi, tanpa NaN ==');
K.boot('uji-node-' + Date.now());
K.setPasar([66, 41, 90, 12], 'uji', 'live');
K.denyut(6000);
const st = K.state();
uji('dunia berjalan 6000 denyut', st.tick >= 6000);
uji('populasi hidup dalam batas', st.pop > 0 && st.pop <= K.POP_MAX, 'pop=' + st.pop);
let nanAda = false;
for (const o of st.orgs) if (!isFinite(o.e) || isNaN(o.e)) nanAda = true;
uji('energi semua makhluk finit', !nanAda);
uji('energi dunia finit', isFinite(st.e) && isFinite(st.ftot));
uji('sejarah terekam', st.hist.length > 20, 'hist=' + st.hist.length);
uji('jurnal hidup', st.log.length > 5, 'log=' + st.log.length);
uji('karat bit terjadi (kerusakan nyata)', st.rot > 10, 'rot=' + st.rot);
uji('kelahiran & kematian nyata', st.lahir > 20 && st.mati > 0, 'lahir=' + st.lahir + ' mati=' + st.mati);

console.log('== 4. PENEMUAN DI DUNIA: kemampuan harus terkumpul via pencarian ==');
console.log('   caps: ' + st.caps.map(c => c.id + ':' + c.nama + '(' + c.evals + 'eval)').join(', ') || '(belum ada)');
uji('minimal 5 kemampuan terverifikasi dalam 6000 denyut', st.caps.length >= 5, 'caps=' + st.caps.length);
uji('semua penemuan punya bukti genom + vektor', st.caps.every(c => c.gHex && c.vektor > 0 && c.evals > 0));

console.log('== 5. PERSISTENSI: simpan → muat → lanjut mulus ==');
const d = K.simpan();
uji('serialize menghasilkan data', !!d && d.v === 284 && d.orgs.length > 0);
const tickSebelum = d.tick;
uji('muat ulang diterima', K.boot('uji-node-' + Date.now(), d) === true);
const st2 = K.state();
uji('tick lanjut dari posisi simpan', st2.tick >= tickSebelum, st2.tick + ' vs ' + tickSebelum);
uji('kemampuan tak hilang setelah muat', st2.caps.length === d.caps.length, st2.caps.length + ' vs ' + d.caps.length);
uji('populasi pulih', st2.pop === d.orgs.length, st2.pop + ' vs ' + d.orgs.length);
K.denyut(500);
uji('dunia tetap hidup setelah muat', K.state().tick > st2.tick);

console.log('== 6. TAUTAN-PASAR: vektor = byte pasar nyata ==');
core.pasarBytes = [200, 100, 50, 25];
const t9 = core.TARGETS[9];
const v9 = t9.buatVektor(core.mulberry32(7), core.pasarBytes);
uji('vektor pertama = byte pasar', JSON.stringify(v9[0]) === '[200,100,50,25]');
uji('uji T9 menghitung jumlah byte', (() => {
  const mem = new Uint8Array(16); [200, 100, 50, 25].forEach((b, i) => mem[i] = b);
  return t9.uji({ r2: (200 + 100 + 50 + 25) & 255 }, mem) === true;
})());
const terkunci0 = core.pasarBytes; core.pasarBytes = null;
const terkunci = core.evalTarget(t9, gDari('000000000000000000000000'), 48);
core.pasarBytes = terkunci0;
uji('T9 terkunci tanpa byte pasar', terkunci.terkunci === true && terkunci.skor === 0);

console.log('\nHASIL: ' + lulus + ' lulus, ' + gagal + ' gagal');
process.exit(gagal ? 1 : 0);
