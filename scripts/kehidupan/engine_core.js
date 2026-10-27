/* ============================================================
   V284-PROTOLIFE — INTI MESIN (bebas DOM, bisa diuji di Node)
   VM 16-opcode sungguhan + verifikator target berbasis vektor.
   Tidak ada penemuan yang dijadwalkan: kemampuan hanya dicatat
   setelah genom lulus SEMUA vektor uji pada VM yang sama.
   ============================================================ */
'use strict';
(function (root) {
  const CORE = {};

  /* ---------- PRNG deterministik dari benih nyata ---------- */
  function fnv1a(str) {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  CORE.fnv1a = fnv1a; CORE.mulberry32 = mulberry32;

  /* ---------- ISA 16 opcode ----------
     reg: r0 akumulator, r1 cadangan, r2 alamat/keluaran, r3 bebas
     mem: 16 sel (0..11 data, 11 = sasaran-lompat, 12..15 MMIO)
     0  NOP    -                                    8  SUB r2=(r0-r1)&255
     1  LOAD   r0=mem[r2&15]                        9  LDI r2=imm, ip+=2
     2  STORE  mem[r2&15]=r0                       10  MOVA r1=r0
     3  ADD    r2=(r0+r1)&255                      11  MOVB r0=r2
     4  AND    r2=r0&r1                            12  MOVC r2=r0
     5  OR     r2=r0|r1                            13  JMPZ r0==0 -> ip=mem[11]%len
     6  XOR    r2=r0^r1                            14  EAT
     7  NAND   r2=~(r0&r1)&255                     15  DIVIDE                    */
  const OPN = ['NOP','LOAD','STORE','ADD','AND','OR','XOR','NAND','SUB','LDI','MOVA','MOVB','MOVC','JMPZ','EAT','DIVIDE'];
  CORE.OPN = OPN;

  /* io: {sense, tick, luka, makan_cb, bagi_cb, bangun_cb, perbaiki_cb, tulisdiri_cb}
     st (opsional): {ip,r0,r1,r2,r3} — keadaan lanjutan untuk makhluk hidup.
     Verifikator (tanpa st): berhenti saat ip mencapai ujung genom (HALT di akhir)
     sehingga hasil akhir deterministik — program lulus/seragam atas satu jalanan penuh. */
  function runVM(g, mem, maxSteps, subset, io, st) {
    const len = g.length;
    let ip, r0, r1, r2, r3, lanjut;
    if (st) { ip = st.ip | 0; r0 = st.r0 | 0; r1 = st.r1 | 0; r2 = st.r2 | 0; r3 = st.r3 | 0; }
    else { ip = 0; r0 = 0; r1 = 0; r2 = 0; r3 = 0; }
    let steps = 0, berhenti = false;
    const m = mem;
    io = io || {};
    while (steps < maxSteps && !berhenti && (st ? true : (ip < len))) {
      const op = g[ip % len] & 15;
      ip++; steps++;
      switch (op) {
        case 0: break;
        case 1: r0 = m[r2 & 15]; if ((r2 & 15) === 14) r0 = io.sense | 0; else if ((r2 & 15) === 15) r0 = (io.tick | 0) & 255; else if ((r2 & 15) === 13) r0 = io.luka | 0; break;
        case 2: {
          const adr = r2 & 15;
          let ditangani = false;
          if (adr === 12) { if (io.tulisdiri_cb) { io.tulisdiri_cb(r0); ditangani = true; } }
          else if (adr === 13) { if (io.perbaiki_cb) { if (io.perbaiki_cb(r0)) m[13] = Math.max(0, (m[13] | 0) - 1); ditangani = true; } }
          else if (adr === 14) { if (io.bangun_cb) { io.bangun_cb(r0 & 3); ditangani = true; } }
          if (!ditangani) m[adr] = r0 & 255; // tanpa callback (verifikator): memori data biasa
          break;
        }
        case 3: r2 = (r0 + r1) & 255; break;
        case 4: r2 = subset ? 0 : (r0 & r1); break;
        case 5: r2 = subset ? 0 : (r0 | r1); break;
        case 6: r2 = subset ? 0 : (r0 ^ r1); break;
        case 7: r2 = (~(r0 & r1)) & 255; break;
        case 8: r2 = (r0 - r1) & 255; break;
        case 9: r2 = g[ip % len] & 15; ip++; break;
        case 10: r1 = r0; break;
        case 11: r0 = r2; break;
        case 12: r2 = r0; break;
        case 13: if (r0 === 0) ip = (m[11] | 0) % len; break;
        case 14: if (io.makan_cb) io.makan_cb(); break;
        case 15: if (io.bagi_cb) { io.bagi_cb(); berhenti = true; } break;
      }
    }
    if (st) { st.ip = ip % len; st.r0 = r0 & 255; st.r1 = r1 & 255; st.r2 = r2 & 255; st.r3 = r3 & 255; }
    return { r0: r0 & 255, r1: r1 & 255, r2: r2 & 255, steps: steps, mem: m, ip: ip % len };
  }
  CORE.runVM = runVM;

  /* ---------- RANTAI TARGET — definisi, bukan jadwal ----------
     Setiap target = fungsi verifikasi murni atas vektor uji nyata.
     Lulus = SEMUA vektor benar. Tidak ada probabilitas, tidak ada
     formula peluang, tidak ada timer. Penemuan hanya lewat uji. */
  function vektorAcak(n, rnd) {
    const v = [];
    for (let i = 0; i < n; i++) v.push((rnd() * 256) | 0);
    return v;
  }

  /* Tiap target: {id, nama, desk, subset, buatVektor(rnd)->[mem0..15], uji(hasil,mem)->bool, buka:string} */
  const TARGETS = [
    {
      id: 'T0', nama: 'BIT-1', subset: false,
      desk: 'Menghasilkan nilai ganjil (bit 1) dari memori acak — bukti pertama bahwa jas bisa menulis angka.',
      buka: null,
      buatVektor: (rnd) => { const v = []; for (let i = 0; i < 6; i++) v.push(vektorAcak(12, rnd)); return v; },
      uji: (h) => (h.r2 & 1) === 1
    },
    {
      id: 'T1', nama: 'NOT', subset: false,
      desk: 'Pembalik byte: keluaran = 255 - masukan. Dasar seluruh logika.',
      buka: 'stasiun-perbaiki',
      buatVektor: (rnd) => { let v = [0, 1, 85, 170, 255, 128, 127]; for (let i = 0; i < 8; i++) v.push((rnd() * 256) | 0); return v.map(x => [x]); },
      uji: (h, memIn) => h.r2 === ((255 - memIn[0]) & 255)
    },
    {
      id: 'T2', nama: 'AND', subset: false,
      desk: 'Gerbang AND byte: mem[0] & mem[1].',
      buka: 'ekstraktor',
      buatVektor: (rnd) => { const v = [[0, 0], [0, 1], [1, 0], [1, 1], [255, 255], [255, 0], [170, 85]]; for (let i = 0; i < 7; i++) v.push([vektorAcak(1, rnd)[0], vektorAcak(1, rnd)[0]]); return v; },
      uji: (h, memIn) => h.r2 === (memIn[0] & memIn[1])
    },
    {
      id: 'T3', nama: 'OR', subset: false,
      desk: 'Gerbang OR byte: mem[0] | mem[1].',
      buka: 'relai',
      buatVektor: (rnd) => { const v = [[0, 0], [0, 1], [1, 0], [1, 1], [255, 0], [170, 85], [128, 127]]; for (let i = 0; i < 7; i++) v.push([vektorAcak(1, rnd)[0], vektorAcak(1, rnd)[0]]); return v; },
      uji: (h, memIn) => h.r2 === (memIn[0] | memIn[1])
    },
    {
      id: 'T4', nama: 'XOR', subset: false,
      desk: 'Gerbang XOR byte: pembeda sejati. Kunci penjumlahan.',
      buka: 'fabrikasi-genom',
      buatVektor: (rnd) => { const v = [[0, 0], [0, 1], [1, 0], [1, 1], [255, 255], [170, 85], [128, 128]]; for (let i = 0; i < 7; i++) v.push([vektorAcak(1, rnd)[0], vektorAcak(1, rnd)[0]]); return v; },
      uji: (h, memIn) => h.r2 === (memIn[0] ^ memIn[1])
    },
    {
      id: 'T5', nama: 'XOR-DARI-NAND', subset: true,
      desk: 'Ujian NANd-lengkap: gerbang AND/OR/XOR DIMATIKAN; XOR harus dibangun murni dari NAND + pemipaan — sejarah komputasi nyata.',
      buka: 'benang-nand',
      buatVektor: (rnd) => { const v = [[0, 0], [0, 1], [1, 0], [1, 1], [255, 255], [170, 85], [15, 240]]; for (let i = 0; i < 6; i++) v.push([vektorAcak(1, rnd)[0], vektorAcak(1, rnd)[0]]); return v; },
      uji: (h, memIn) => h.r2 === (memIn[0] ^ memIn[1])
    },
    {
      id: 'T6', nama: 'PENJUMLAH-PARUH', subset: false,
      desk: 'Half-adder: bit-0 keluaran = jumlah (a^b), bit-1 = simpanan (a&b) — dipacking satu byte.',
      buka: 'menara-logika',
      buatVektor: (rnd) => { const v = [[0, 0], [0, 1], [1, 0], [1, 1]]; for (let i = 0; i < 6; i++) v.push([rnd() < 0.5 ? 0 : 1, rnd() < 0.5 ? 0 : 1]); return v; },
      uji: (h, memIn) => {
        const a = memIn[0], b = memIn[1];
        return h.r2 === (((a ^ b) & 1) | ((a & b) << 1));
      }
    },
    {
      id: 'T7', nama: 'AKUMULATOR', subset: false,
      desk: 'Register nyata: tiga kali jalanan berturut, mem[13] harus bernilai 3x masukan — baca-ubah-tulis yang tersimpan lintas jalanan.',
      buka: 'bank-memori',
      buatVektor: (rnd) => { let v = [0, 1, 5, 17, 100, 255, 128, 200]; for (let i = 0; i < 5; i++) v.push(vektorAcak(1, rnd)[0]); return v.map(x => [x]); },
      uji: (h, memIn) => (memIn[13] | 0) === ((memIn[0] * 3) & 255) && h.r2 === ((memIn[0] * 3) & 255)
    },
    {
      id: 'T8', nama: 'SALIN-MEMORI', subset: false,
      desk: 'Menyalin 4 kata mem[0..3] ke mem[8..11] tanpa merusak sumber — dasar pemindahan pengetahuan.',
      buka: 'arsip',
      buatVektor: (rnd) => { const v = [[7, 0, 255, 128]]; for (let i = 0; i < 6; i++) v.push(vektorAcak(4, rnd)); return v; },
      uji: (h, memIn, vin) => {
        for (let i = 0; i < 4; i++) { if ((memIn[8 + i] | 0) !== (vin[i] | 0)) return false; }
        for (let i = 0; i < 4; i++) { if ((memIn[i] | 0) !== (vin[i] | 0)) return false; }
        return true;
      }
    },
    {
      id: 'T9', nama: 'TAUTAN-PASAR', subset: false,
      desk: 'Puncak: keluaran = jumlah 4 byte yang benar-benar diturunkan dari skor pasar arena (arena-keadaan.json) — sinyal pasar gabungan dihitung oleh jas sendiri, bukan dibacakan.',
      buka: 'portal-pasar',
      buatVektor: (rnd, pasar) => {
        const v = [];
        if (pasar && pasar.length === 4) v.push(pasar.slice());
        v.push([1, 2, 3, 4], [200, 100, 50, 25], [0, 255, 0, 0], [9, 9, 9, 9]);
        for (let i = 0; i < 10; i++) v.push(vektorAcak(4, rnd));
        return v;
      },
      uji: (h, memIn) => h.r2 === ((memIn[0] + memIn[1] + memIn[2] + memIn[3]) & 255)
    }
  ];
  CORE.TARGETS = TARGETS;

  /* Evaluasi satu genom terhadap satu target: skor = fraksi vektor lulus */
  function evalTarget(target, g, langkahMax) {
    if (target.id === 'T9' && !CORE.pasarBytes) return { lulus: 0, total: 1, skor: 0, terkunci: true };
    const rndKecil = CORE.mulberry32(0xA5A5A5 ^ CORE.fnv1a(target.id));
    let lulus = 0, total = 0;
    const pas = target.buatVektor(rndKecil, CORE.pasarBytes || null);
    for (const vin of pas) {
      total++;
      const mem = new Uint8Array(16);
      for (let i = 0; i < Math.min(vin.length, 14); i++) mem[i] = vin[i] & 255;
      let h;
      const batas = langkahMax || (g.length * 2 + 8);
      if (target.id === 'T7') {
        // AKUMULATOR: tiga jalanan dengan mem persisten
        let ok = true;
        for (let k = 1; k <= 3; k++) {
          h = runVM(g, mem, batas, target.subset, { sense: 0, tick: k });
          if (((mem[13] | 0) !== ((vin[0] * k) & 255))) { ok = false; break; }
        }
        if (ok && h && h.r2 === ((vin[0] * 3) & 255)) lulus++;
      } else {
        h = runVM(g, mem, batas, target.subset, { sense: 0, tick: 0 });
        if (target.uji(h, mem, vin)) lulus++;
      }
    }
    return { lulus: lulus, total: total, skor: total ? lulus / total : 0 };
  }
  CORE.evalTarget = evalTarget;

  /* Verifikasi formal untuk pencatatan penemuan — jalur terpisah dari pencarian,
     batas langkah IDENTIK dengan pencarian (definisi lulus yang konsisten). */
  function verifikasiPenuh(target, g) {
    const e = evalTarget(target, g);
    return e.skor === 1 ? e : null;
  }
  CORE.verifikasiPenuh = verifikasiPenuh;

  root.__KEHIDUPAN_CORE = CORE;
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
})(typeof window !== 'undefined' ? window : globalThis);
