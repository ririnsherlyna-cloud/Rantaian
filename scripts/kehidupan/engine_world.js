/* ============================================================
   V284-PROTOLIFE — DUNIA + PIKIRAN (bebas DOM)
   Ekologi energi nyata, mutasi & karat bit nyata, sembilan fase
   siklus sadar, sintesis pencarian nyata (hill-climb + restart).
   ============================================================ */
'use strict';
(function (root) {
  const CORE = root.__KEHIDUPAN_CORE ||
    (typeof require === 'function' ? require('./engine_core.js') : null);
  if (!CORE) throw new Error('V284: engine_core belum dimuat');
  const W = 80, H = 45, NCELL = W * H, GEN_LEN = 24, POP_MAX = 26;
  const FASE = ['MENGAMATI', 'MEMAHAMI', 'MENCOBA', 'MELAKUKAN', 'MENGEVALUASI', 'MENEMUKAN', 'MEMBANGUN', 'MENINGKATKAN', 'MENGAMATI-KEMBALI'];
  const DURASI = 120; // denyut per fase
  const STRUK = ['', 'stasiun-perbaiki', 'ekstraktor', 'relai'];

  function hex(g) { let s = ''; for (let i = 0; i < g.length; i++) s += (g[i] & 15).toString(16); return s; }
  function dariHex(s) { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = parseInt(s[i], 16) & 15; return a; }

  let S = null; // state dunia

  function duniaBaru(benihStr, waktu) {
    const seed = CORE.fnv1a(benihStr);
    const rnd = CORE.mulberry32(seed);
    const food = new Float32Array(NCELL);
    for (let i = 0; i < NCELL; i++) if (rnd() < 0.055) food[i] = 30 + rnd() * 90;
    S = {
      v: 284, benihStr: benihStr, seed: seed, rnd: rnd, tick: 0,
      food: food, struktur: [], orgs: [], caps: [], targetIdx: 0,
      sintesis: { best: null, bestHex: '', skor: 0, evals: 0, restarts: 0, stall: 0, kandidatBaru: null },
      log: [], hist: [], idOrg: 1,
      rot: 0, lahir: 0, mati: 0, bagi: 0, bangunan: 0, injeksi: 0,
      statInstr: 0, snapshot: null, wawasan: '', faseKini: -1,
      pasar: { mode: 'mandiri', bytes: null, sumber: '', diAt: 0 },
      waktuSimpan: waktu || Date.now(), mengejar: 0
    };
    for (let i = 0; i < 8; i++) lahirkan(genomAcak(), (rnd() * W) | 0, (rnd() * H) | 0, 0, 36 + rnd() * 20);
    catat('LAHIR', 'Dunia Protolife dibangkitkan dari benih nyata: ' + benihStr.slice(0, 40) + (benihStr.length > 40 ? '…' : '') + ' — 8 organisme acak, ekologi energi berjalan.');
    jalankan(0); // amati awal
  }

  function genomAcak() {
    const g = new Uint8Array(GEN_LEN);
    for (let i = 0; i < GEN_LEN; i++) g[i] = (S.rnd() * 16) | 0;
    return g;
  }

  function lahirkan(g, x, y, gen, energi) {
    if (S.orgs.length >= POP_MAX) return null;
    const o = {
      id: S.idOrg++, g: new Uint8Array(g), t: new Uint8Array(g),
      e: energi, x: x, y: y, age: 0, gen: gen, luka: 0,
      mem: new Uint8Array(16), st: { ip: 0, r0: 0, r1: 0, r2: 0, r3: 0 }, eksekusi: 0, makanTick: 0, bagiTick: 0
    };
    S.orgs.push(o); S.lahir++;
    return o;
  }

  function idx(x, y) { return ((y + H) % H) * W + ((x + W) % W); }
  function foodAt(x, y) { return S.food[idx(x, y)]; }
  function adaStruktur(x, y, tipe) {
    for (const st of S.struktur) if (st.x === x && st.y === y && (tipe === undefined || st.tipe === tipe)) return true;
    return false;
  }
  function punya(buka) {
    if (!buka) return true;
    return S.caps.some(c => c.buka === buka);
  }
  function regrowFaktor(x, y) {
    let f = 1;
    for (const st of S.struktur) {
      if (st.tipe !== 2) continue;
      const dx = st.x - x, dy = st.y - y;
      if (dx * dx + dy * dy <= 16) f = Math.max(f, 4);
    }
    return f;
  }

  /* ---------- LOG & SEJARAH ---------- */
  function catat(fase, teks) {
    S.log.push({ t: new Date().toISOString().slice(11, 19), tick: S.tick, fase: fase, teks: teks });
    if (S.log.length > 90) S.log.splice(0, S.log.length - 90);
  }
  function sampelHist() {
    let e = 0; for (const o of S.orgs) e += o.e;
    S.hist.push({ tick: S.tick, pop: S.orgs.length, e: S.orgs.length ? +(e / S.orgs.length).toFixed(1) : 0, caps: S.caps.length, evals: S.sintesis.evals });
    if (S.hist.length > 260) S.hist.splice(0, S.hist.length - 260);
  }
  function pearson(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 4) return null;
    let sa = 0, sb = 0;
    for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
    const ma = sa / n, mb = sb / n;
    let num = 0, da = 0, dbv = 0;
    for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; num += xa * xb; da += xa * xa; dbv += xb * xb; }
    const den = Math.sqrt(da * dbv);
    return den > 0 ? +(num / den).toFixed(2) : null;
  }

  /* ---------- VM MAKHLUK ---------- */
  function ioUntuk(o) {
    return {
      sense: Math.min(255, S.food[idx(o.x, o.y)] | 0),
      tick: S.tick,
      luka: o.luka,
      makan_cb: function () {
        const i = idx(o.x, o.y);
        if (S.food[i] >= 12) { S.food[i] -= 12; o.e = Math.min(240, o.e + 12); o.makanTick = S.tick; }
      },
      bagi_cb: function () {
        if (o.e < 34 || S.orgs.length >= POP_MAX) return;
        const anak = new Uint8Array(o.g);
        let mut = 0;
        const nMut = 1 + ((S.rnd() * 2) | 0);
        for (let k = 0; k < nMut; k++) {
          const p = (S.rnd() * GEN_LEN) | 0;
          const baru = punya('fabrikasi-genom') ? ((S.rnd() * 16) | 0) : ((anak[p] + 1 + ((S.rnd() * 15) | 0)) & 15);
          if (baru !== anak[p]) { anak[p] = baru; mut++; }
        }
        o.e -= 20;
        let bx = o.x, by = o.y;
        for (let coba = 0; coba < 4; coba++) {
          const nx = o.x + ((S.rnd() * 5) | 0) - 2, ny = o.y + ((S.rnd() * 5) | 0) - 2;
          if (foodAt(nx, ny) > foodAt(bx, by)) { bx = nx; by = ny; }
        }
        const anakO = lahirkan(anak, (bx + W) % W, (by + H) % H, o.gen + 1, 14);
        if (anakO) { S.bagi++; o.bagiTick = S.tick; }
      },
      bangun_cb: function (tipe) {
        if (tipe < 1 || tipe > 3) return false;
        if (!punya(STRUK[tipe])) return false;
        if (S.struktur.length >= 22) return false; // lahan terbatas — dunia nyata
        if (o.e < 12 || adaStruktur(o.x, o.y)) return false;
        o.e -= 10;
        S.struktur.push({ x: o.x, y: o.y, tipe: tipe, lahir: S.tick });
        catat('DUNIA', 'Makhluk #' + o.id + ' membangun ' + STRUK[tipe] + ' di (' + o.x + ',' + o.y + ') — kemampuan terverifikasi dipakai di dunia nyata.');
        return true;
      },
      perbaiki_cb: function () {
        if (o.e < 5) return false;
        for (let i = 0; i < GEN_LEN; i++) {
          if (o.g[i] !== o.t[i]) { o.g[i] = o.t[i]; o.e -= 4; o.luka = Math.max(0, o.luka - 1); return true; }
        }
        return false;
      },
      tulisdiri_cb: function (val) {
        const p = val % GEN_LEN;
        o.g[p] = val & 15;
        return true;
      }
    };
  }

  function langkahMakhluk(o) {
    const io = ioUntuk(o);
    const h = CORE.runVM(o.g, o.mem, 2, false, io, o.st);
    S.statInstr += h.steps;
    o.eksekusi += h.steps;
    o.e -= 0.05 * h.steps;
    o.age++;
    // kemotaksis pasif — fisika dunia, sama untuk semua
    if (S.tick % 6 === 0 && S.rnd() < 0.8) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let best = foodAt(o.x, o.y), bx = o.x, by = o.y;
      for (const d of dirs) {
        const f = foodAt(o.x + d[0], o.y + d[1]);
        if (f > best) { best = f; bx = o.x + d[0]; by = o.y + d[1]; }
      }
      if (bx !== o.x || by !== o.y) { o.x = (bx + W) % W; o.y = (by + H) % H; }
    }
  }

  function karatBit() {
    if (!S.orgs.length) return;
    const o = S.orgs[(S.rnd() * S.orgs.length) | 0];
    // stasiun-perbaiki di dekatnya mencegah karat (kerja struktur nyata)
    for (const st of S.struktur) {
      if (st.tipe !== 1) continue;
      const dx = st.x - o.x, dy = st.y - o.y;
      if (dx * dx + dy * dy <= 25 && S.rnd() < 0.5) return;
    }
    const p = (S.rnd() * GEN_LEN) | 0, bit = 1 << ((S.rnd() * 4) | 0);
    o.g[p] = (o.g[p] ^ bit) & 15;
    o.luka++;
    S.rot++;
  }

  function regrow() {
    const mulai = (S.tick % 4) * (NCELL / 4);
    for (let i = mulai; i < mulai + NCELL / 4; i++) {
      const x = i % W, y = (i / W) | 0;
      // pertumbuhan + peluruhan nutrisi — keseimbangan ekologi, bukan akumulasi abadi
      S.food[i] = Math.max(0, Math.min(255, S.food[i] + 0.03 * regrowFaktor(x, y) - S.food[i] * 0.0006));
    }
    if (S.tick % 30 === 0) {
      for (const st of S.struktur) {
        if (st.tipe !== 3) continue;
        const c = idx(st.x, st.y), tot = 4, rata = S.food[c] / 2;
        S.food[c] = rata + S.food[c] / 4;
        const tet = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const d of tet) { const j = idx(st.x + d[0], st.y + d[1]); S.food[j] = Math.min(255, S.food[j] + rata / 8); }
      }
    }
  }

  /* ---------- PIKIRAN: SINTESIS PENCARIAN NYATA (pool elit μ+λ) ---------- */
  function targetKini() { return CORE.TARGETS[S.targetIdx]; }

  function mutasi(g) {
    const c = new Uint8Array(g);
    const n = 1 + ((S.rnd() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const p = (S.rnd() * GEN_LEN) | 0;
      if (S.rnd() < 0.5) c[p] = (S.rnd() * 16) | 0;
      else c[p] = (c[p] + 1 + ((S.rnd() * 15) | 0)) & 15;
    }
    return c;
  }

  function poolBaru(warisan) {
    // warisan = genom target sebelumnya yang terverifikasi — fondasi nyata;
    // anak-anaknya bermutasi bebas, seleksi murni lewat uji vektor.
    const pool = [];
    if (warisan) {
      pool.push({ g: new Uint8Array(warisan), skor: 0 });
      pool.push({ g: mutasi(warisan), skor: 0 });
      pool.push({ g: mutasi(warisan), skor: 0 });
    }
    while (pool.length < 5) pool.push({ g: genomAcak(), skor: 0 });
    return pool;
  }

  function langkahSintesis(budget) {
    const t = targetKini();
    if (!t) return;
    const sin = S.sintesis;
    if (!sin.pool || !sin.pool.length) sin.pool = poolBaru(null);
    for (let i = 0; i < budget; i++) {
      const induk = sin.pool[(S.rnd() * sin.pool.length) | 0];
      const kandidat = mutasi(induk.g);
      const e = CORE.evalTarget(t, kandidat);
      sin.evals++; S.statInstr += e.total * 40;
      let terburuk = 0;
      for (let j = 1; j < sin.pool.length; j++) if (sin.pool[j].skor < sin.pool[terburuk].skor) terburuk = j;
      if (e.skor >= sin.pool[terburuk].skor) sin.pool[terburuk] = { g: kandidat, skor: e.skor };
      if (e.skor > sin.skor) {
        sin.skor = e.skor; sin.best = kandidat; sin.bestHex = hex(kandidat); sin.stall = 0; sin.verGagal = false;
        if (e.skor === 1) { sin.kandidatBaru = kandidat; return; } // tunggu verifikasi formal
      } else sin.stall++;
      if (sin.stall > 700) {
        // stagnasi: simpan 3 terbaik, tarik napas acak baru — diversifikasi nyata
        sin.pool.sort((a, b) => b.skor - a.skor);
        sin.pool.length = 3;
        while (sin.pool.length < 5) sin.pool.push({ g: genomAcak(), skor: 0 });
        sin.stall = 0; sin.restarts++;
      }
    }
  }

  function verifikasiFormal() {
    const t = targetKini(), sin = S.sintesis;
    if (!t || !sin.best || sin.skor < 1) return;
    const e = CORE.verifikasiPenuh(t, sin.best);
    if (e) {
      S.caps.push({ id: t.id, nama: t.nama, buka: t.buka || '', gHex: sin.bestHex, vektor: e.total, evals: sin.evals, tick: S.tick, waktu: new Date().toISOString(), subset: !!t.subset });
      catat('PENEMUAN', t.id + ' ' + t.nama + ' TERTERIFIKASI — genom ' + sin.bestHex + ' lulus ' + e.total + '/' + e.total + ' vektor uji setelah ' + sin.evals.toLocaleString('id-ID') + ' eval pencarian nyata' + (t.subset ? ' (mode NAND-saja)' : '') + '. Kemampuan terbuka: ' + (t.buka || 'dasar'));
      const warisan = sin.best;
      S.targetIdx++;
      S.sintesis = { best: null, bestHex: '', skor: 0, evals: 0, restarts: 0, stall: 0, kandidatBaru: null, verGagal: false, pool: poolBaru(warisan) };
    } else if (!sin.verGagal) {
      sin.verGagal = true;
      catat('EVALUASI', t.id + ' kandidat skor ' + (sin.skor * 100).toFixed(0) + '% GAGAL verifikasi formal — kembali mencari (kejujuran menang).');
    }
  }

  function bangunOlehPikiran() {
    if (S.struktur.length >= 22) return; // lahan penuh — kepadatan dijaga
    const terbuka = STRUK.filter(s => s && punya(s));
    if (!terbuka.length) return;
    const pilihan = [];
    if (punya('ekstraktor')) {
      let bi = -1, bv = -1;
      for (let c = 0; c < 60; c++) { const i = (S.rnd() * NCELL) | 0; if (S.food[i] > bv && !S.struktur.some(st => st.x === i % W && st.y === (i / W) | 0)) { bv = S.food[i]; bi = i; } }
      if (bi >= 0) pilihan.push({ tipe: 2, x: bi % W, y: (bi / W) | 0, alasan: 'zona makanan terkaya (' + (bv | 0) + ') → regrow x4' });
    }
    if (punya('stasiun-perbaiki') && S.orgs.length) {
      let cx = 0, cy = 0; for (const o of S.orgs) { cx += o.x; cy += o.y; }
      cx = (cx / S.orgs.length) | 0; cy = (cy / S.orgs.length) | 0;
      if (!adaStruktur(cx, cy)) pilihan.push({ tipe: 1, x: cx, y: cy, alasan: 'pusat massa ' + S.orgs.length + ' makhluk → perisai karat radius 5' });
    }
    if (punya('relai')) {
      const x = (S.rnd() * W) | 0, y = (S.rnd() * H) | 0;
      if (!adaStruktur(x, y)) pilihan.push({ tipe: 3, x: x, y: y, alasan: 'menyebar energi miskin → keseimbangan ekologi' });
    }
    if (!pilihan.length) return;
    const p = pilihan[(S.rnd() * pilihan.length) | 0];
    S.struktur.push({ x: p.x, y: p.y, tipe: p.tipe, lahir: S.tick });
    S.food[idx(p.x, p.y)] = Math.max(0, S.food[idx(p.x, p.y)] - 40);
    S.bangunan++;
    catat('BANGUN', 'Pikiran membangun ' + STRUK[p.tipe] + ' di (' + p.x + ',' + p.y + ') — ' + p.alasan + '; biaya material 40 energi dunia.');
  }

  function tingkatkan() {
    if (!S.caps.length || S.orgs.length >= POP_MAX) return;
    const terakhir = S.caps[S.caps.length - 1];
    const g = dariHex(terakhir.gHex);
    const o = lahirkan(g, (S.rnd() * W) | 0, (S.rnd() * H) | 0, terakhir.tick % 1000, 40);
    if (o) {
      S.injeksi++;
      catat('TINGKATKAN', 'Genom terverifikasi ' + terakhir.id + ' (' + terakhir.gHex + ') dilepas ke ekologi sebagai makhluk #' + o.id + ' — pengetahuan hidup di dunia, bukan hanya di arsip.');
    }
  }

  function amati() {
    let e = 0, makan = 0; for (const o of S.orgs) { e += o.e; if (S.tick - o.makanTick < 120) makan++; }
    let ftot = 0; for (let i = 0; i < NCELL; i++) ftot += S.food[i];
    return { pop: S.orgs.length, e: S.orgs.length ? +(e / S.orgs.length).toFixed(1) : 0, makan: makan, ftot: (ftot | 0), struktur: S.struktur.length, rot: S.rot, caps: S.caps.length, evals: S.sintesis.evals, luka: S.orgs.reduce((a, o) => a + o.luka, 0) };
  }

  function pahami() {
    if (S.hist.length < 6) { S.wawasan = 'sejarah masih pendek (' + S.hist.length + ' sampel) — mengumpulkan data dulu'; return; }
    const pop = S.hist.map(h => h.pop), en = S.hist.map(h => h.e), caps = S.hist.map(h => h.caps);
    const rp = pearson(pop, en), rc = pearson(caps, en);
    const rotRate = S.tick > 0 ? +(S.rot * 1000 / S.tick).toFixed(2) : 0;
    S.wawasan = 'korelasi pop↔energi ' + (rp === null ? '—' : rp) + ', caps↔energi ' + (rc === null ? '—' : rc) + ', laju karat ' + rotRate + '/1000 denyut, generasi maks ' + S.orgs.reduce((a, o) => Math.max(a, o.gen), 0);
  }

  function amatiLagi() {
    if (!S.snapshot) return;
    const k = amati();
    catat('MENGAMATI-KEMBALI', 'Delta siklus: pop ' + (k.pop - S.snapshot.pop) + ', energi rata ' + (k.e - S.snapshot.e) + ', makanan ' + (k.ftot - S.snapshot.ftot) + ', karat +' + (k.rot - S.snapshot.rot) + ' — siklus penuh, kembali mengamati.');
  }

  /* ---------- DENYUT DUNIA ---------- */
  function faseEntry(f) {
    switch (f) {
      case 0: S.snapshot = amati(); catat('MENGAMATI', 'pop ' + S.snapshot.pop + ', energi rata ' + S.snapshot.e + ', makanan total ' + S.snapshot.ftot + ', struktur ' + S.snapshot.struktur + ', karat kumulatif ' + S.snapshot.rot + ', luka tubuh ' + S.snapshot.luka); break;
      case 1: pahami(); catat('MEMAHAMI', S.wawasan); break;
      case 4: if (S.sintesis.skor >= 1 || S.sintesis.kandidatBaru) verifikasiFormal(); break;
      case 6: bangunOlehPikiran(); break;
      case 7: tingkatkan(); break;
      case 8: amatiLagi(); break;
    }
  }

  function jalankan(n) {
    for (let k = 0; k < n; k++) {
      S.tick++;
      regrow();
      const n0 = S.orgs.length;
      for (let i = 0; i < n0; i++) langkahMakhluk(S.orgs[i]);
      for (let i = S.orgs.length - 1; i >= 0; i--) {
        const o = S.orgs[i];
        if (o.e <= 0.5) {
          S.food[idx(o.x, o.y)] += 10; S.mati++;
          S.orgs.splice(i, 1);
          catat('MATI', 'Makhluk #' + o.id + ' (gen ' + o.gen + ', umur ' + o.age + ', luka ' + o.luka + ') kehabisan energi — jasad menyuburkan sel (' + o.x + ',' + o.y + ') +10.');
        }
      }
      // ABIOGENESIS — jaring pengaman asal-usul: dunia tanpa kehidupan
      // mengondensasi energi ambientnya menjadi protosel baru (dibayar
      // dari makanan sel kelahiran — peristiwa nyata, bukan keajaiban).
      if (S.orgs.length === 0) {
        S.tanpaHidup = (S.tanpaHidup || 0) + 1;
        if (S.tanpaHidup >= 300) {
          S.tanpaHidup = 0;
          let cipta = 0;
          for (let j = 0; j < 8; j++) {
            const x = (S.rnd() * W) | 0, y = (S.rnd() * H) | 0;
            if (S.food[idx(x, y)] >= 15) {
              S.food[idx(x, y)] -= 15;
              if (lahirkan(genomAcak(), x, y, 0, 30)) cipta++;
            }
          }
          if (cipta) catat('ABIOGENESIS', 'Dunia kosong 300 denyut — energi ambient dikondensasi menjadi ' + cipta + ' protosel baru. Asal-usul terjadi lagi.');
        }
      } else S.tanpaHidup = 0;
      if (S.tick % 90 === 0) karatBit();
      const f = ((S.tick / DURASI) | 0) % 9;
      if (f !== S.faseKini) { S.faseKini = f; faseEntry(f); }
      if (f === 2) langkahSintesis(60); // MENCOBA: pencarian nyata tiap denyut fase
      if (f === 4 && (S.sintesis.skor >= 1 || S.sintesis.kandidatBaru)) verifikasiFormal();
      if (S.tick % 90 === 0) sampelHist();
    }
  }

  /* ---------- PERSISTENSI ---------- */
  function serialize() {
    return {
      v: 284, benihStr: S.benihStr, tick: S.tick,
      food: Array.from(S.food, v => Math.round(v)),
      struktur: S.struktur, caps: S.caps, targetIdx: S.targetIdx,
      sintesis: { bestHex: S.sintesis.bestHex, skor: S.sintesis.skor, evals: S.sintesis.evals, restarts: S.sintesis.restarts, stall: S.sintesis.stall },
      orgs: S.orgs.map(o => ({ g: hex(o.g), t: hex(o.t), e: +o.e.toFixed(2), x: o.x, y: o.y, age: o.age, gen: o.gen, luka: o.luka, s: [o.st.ip, o.st.r0, o.st.r1, o.st.r2, o.st.r3] })),
      log: S.log.slice(-70), hist: S.hist.slice(-260),
      idOrg: S.idOrg, rot: S.rot, lahir: S.lahir, mati: S.mati, bagi: S.bagi, bangunan: S.bangunan, injeksi: S.injeksi,
      statInstr: S.statInstr, wawasan: S.wawasan, faseKini: S.faseKini,
      pasar: S.pasar, waktuSimpan: Date.now()
    };
  }

  function muat(d) {
    if (!d || d.v !== 284) return false;
    const seed = CORE.fnv1a(d.benihStr);
    S = {
      v: 284, benihStr: d.benihStr, seed: seed, rnd: CORE.mulberry32(seed ^ 0x9E3779B9 ^ d.tick),
      tick: d.tick, food: Float32Array.from(d.food), struktur: d.struktur || [], orgs: [],
      caps: d.caps || [], targetIdx: d.targetIdx || 0,
      sintesis: { best: d.sintesis && d.sintesis.bestHex ? dariHex(d.sintesis.bestHex) : null, bestHex: d.sintesis ? d.sintesis.bestHex : '', skor: d.sintesis ? d.sintesis.skor : 0, evals: d.sintesis ? d.sintesis.evals : 0, restarts: d.sintesis ? d.sintesis.restarts : 0, stall: d.sintesis ? d.sintesis.stall : 0, kandidatBaru: null },
      log: d.log || [], hist: d.hist || [], idOrg: d.idOrg || 1,
      rot: d.rot || 0, lahir: d.lahir || 0, mati: d.mati || 0, bagi: d.bagi || 0, bangunan: d.bangunan || 0, injeksi: d.injeksi || 0,
      statInstr: d.statInstr || 0, snapshot: null, wawasan: d.wawasan || '', faseKini: -1,
      pasar: d.pasar || { mode: 'mandiri', bytes: null, sumber: '', diAt: 0 },
      waktuSimpan: d.waktuSimpan || Date.now(), mengejar: 0
    };
    for (const od of (d.orgs || [])) {
      const s = od.s || [0, 0, 0, 0, 0];
      S.orgs.push({ id: S.idOrg++, g: dariHex(od.g), t: dariHex(od.t), e: od.e, x: od.x, y: od.y, age: od.age, gen: od.gen, luka: od.luka, mem: new Uint8Array(16), st: { ip: s[0] | 0, r0: s[1] | 0, r1: s[2] | 0, r2: s[3] | 0, r3: s[4] | 0 }, eksekusi: 0, makanTick: 0, bagiTick: 0 });
    }
    if (S.pasar && S.pasar.bytes) CORE.pasarBytes = S.pasar.bytes;
    // mengejar waktu nyata yang terlewat (jujur: dunia tak berhenti, tapi dibatasi)
    const detik = Math.max(0, (Date.now() - S.waktuSimpan) / 1000);
    const n = Math.min(2400, (detik * 2) | 0);
    if (n > 0) { S.mengejar = n; jalankan(n); catat('WAKTU', 'Dunia berjalan terus saat kamu pergi — mengejar ' + n + ' denyut yang terlewat (' + (detik | 0) + ' detik nyata).'); }
    return true;
  }

  /* ---------- API ---------- */
  const API = {
    boot: function (benihStr, muatDari) { if (muatDari && muat(muatDari)) return true; duniaBaru(benihStr); return false; },
    setPasar: function (bytes, sumber, mode) {
      if (!S) return;
      S.pasar = { mode: mode, bytes: bytes, sumber: sumber || '', diAt: S.tick };
      CORE.pasarBytes = bytes;
      if (bytes) catat('PASAR', 'Data pasar arena masuk: ' + Array.from(bytes).join(',') + ' (' + sumber + ') — target TAUTAN-PASAR memakai byte ini sebagai bahan uji nyata.');
    },
    denyut: function (n) { if (S) jalankan(n || 1); },
    simpan: function () { return S ? serialize() : null; },
    state: function () {
      if (!S) return null;
      const a = amati();
      const t = targetKini();
      return {
        tick: S.tick, fase: FASE[Math.max(0, S.faseKini)], faseIdx: Math.max(0, S.faseKini), faseProgres: (S.tick % DURASI) / DURASI,
        pop: a.pop, e: a.e, ftot: a.ftot, struktur: a.struktur, rot: S.rot, lahir: S.lahir, mati: S.mati, bagi: S.bagi, bangunan: S.bangunan, injeksi: S.injeksi,
        statInstr: S.statInstr, luka: a.luka, mengejar: S.mengejar,
        caps: S.caps, target: t ? { id: t.id, nama: t.nama, desk: t.desk, subset: !!t.subset } : null,
        targetSelesai: S.targetIdx, sintesis: { skor: S.sintesis.skor, evals: S.sintesis.evals, restarts: S.sintesis.restarts, bestHex: S.sintesis.bestHex },
        orgs: S.orgs.map(o => ({ id: o.id, gen: o.gen, e: +o.e.toFixed(1), x: o.x, y: o.y, age: o.age, luka: o.luka, g: o.g, t: o.t, ip: 0, eksekusi: o.eksekusi })),
        strukturDet: S.struktur, hist: S.hist, log: S.log, wawasan: S.wawasan, _food: S.food,
        pasar: S.pasar, benih: S.benihStr.slice(0, 12), langkahPerFase: DURASI
      };
    },
    OPN: CORE.OPN, W: W, H: H, GEN_LEN: GEN_LEN, POP_MAX: POP_MAX, FASE: FASE
  };

  root.KEHIDUPAN = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
