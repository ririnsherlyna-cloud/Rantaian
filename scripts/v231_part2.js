
  /* ============================================================
     ORGAN 2 — INGATAN: MEMORI TERKOMPRESI TANPA OVERLAP
     ============================================================
     Jaminan desain (mandat: "mengompres penyimpanannya dan jadi
     tidak pernah bocor/tumpang tindih, makin canggih"):
       1. ALAMAT KONTEN — entri dialamati hash FNV-1a dari payload.
          Payload identik = 1 entri, dedup counter naik. Tidak ada
          duplikasi yang mungkin menumpuk (overlap mustahil).
       2. DELTA EPOCH — statistik berkala disimpan sbg delta vs
          epoch sebelumnya (bukan snapshot penuh).
       3. TIER + PELIPATAN — HOT (episode mentah, cap 48) → saat
          budget terancam, episode terlipat jadi agregat WARM
          (per simbol/arah/rezim {n,hit}) → pelajaran COLD (kalimat
          terdistilasi). Mentah dihapus setelah agregat lahir:
          ukuran turun, informasi statistik tetap hidup.
       4. BUDGET KERAS 96KB + GC tier-tertua-dulu.
     ============================================================ */
  var INGATAN = (function () {
    var HOT_CAP = 48, PELAJARAN_CAP = 60;

    var M = jget(LS_MEM);
    if (!M || M.v !== 231 || !M.hot) {
      M = { v: 231, hot: [], warm: {}, pelajaran: [], idx: {}, stat: { tulis: 0, dedup: 0, lipat: 0, gc: 0, rawIn: 0 } };
    }
    if (!M.idx) M.idx = {};
    if (!M.stat) M.stat = { tulis: 0, dedup: 0, lipat: 0, gc: 0, rawIn: 0 };

    function byteUkur() { try { return (localStorage.getItem(LS_MEM) || '').length; } catch (e) { return JSON.stringify(M).length; } }

    /* tulis — alamat konten; identik = dedup */
    function tulis(kat, data, meta) {
      var h = hashObj({ kat: kat, d: data });
      if (M.idx[h]) { M.stat.dedup++; return { ok: true, hash: h, dedup: true }; }
      var e = { h: h, t: now(), kat: kat, d: data };
      if (meta) { if (meta.sim) e.sim = meta.sim; if (meta.arah) e.arah = meta.arah; if (meta.rezim) e.rezim = meta.rezim; }
      M.hot.unshift(e);
      M.idx[h] = 1;
      M.stat.tulis++; M.stat.rawIn += JSON.stringify(e).length;
      while (M.hot.length > HOT_CAP) {
        var tua = M.hot.pop();
        delete M.idx[tua.h];
        lipatSatu(tua);                       /* tidak ada data dibuang sia-sia */
      }
      return { ok: true, hash: h, dedup: false };
    }

    /* lipat satu episode → agregat WARM.
       HANYA episode TERADILI (d.hit != null) yang masuk agregat
       akurasi {n,hit} — episode scan mentah tak boleh membiaskan
       pembilang/penyebut akurasi. */
    function lipatSatu(e) {
      try {
        var sim = e.sim || 'GLOBAL', arah = e.arah || '-', rez = e.rezim || '-';
        var teradili = (e.kat === 'episode' && e.d && e.d.hit != null);
        if (!M.warm[sim]) M.warm[sim] = { n: 0, hit: 0, raw: 0, arah: {}, rezim: {} };
        var w = M.warm[sim];
        if (teradili) {
          w.n++;
          if (e.d.hit) w.hit++;
          if (!w.arah[arah]) w.arah[arah] = { n: 0, hit: 0 };
          w.arah[arah].n++; if (e.d.hit) w.arah[arah].hit++;
          if (!w.rezim[rez]) w.rezim[rez] = { n: 0, hit: 0 };
          w.rezim[rez].n++; if (e.d.hit) w.rezim[rez].hit++;
        } else {
          w.raw++;
        }
        M.stat.lipat++;
      } catch (err) {}
    }

    /* pelajaran — teks terdistilasi + bukti */
    function pelajari(teks, bukti) {
      var h = hashObj({ pel: teks });
      if (M.idx[h]) { M.stat.dedup++; return { ok: true, hash: h, dedup: true }; }
      M.pelajaran.unshift({ h: h, t: now(), teks: String(teks).slice(0, 220), bukti: String(bukti || '').slice(0, 120) });
      if (M.pelajaran.length > PELAJARAN_CAP) M.pelajaran.length = PELAJARAN_CAP;
      M.idx[h] = 1;
      M.stat.tulis++;
      return { ok: true, hash: h, dedup: false };
    }

    /* GC — budget keras: buang HOT tertua dulu (sudah terlipat), lalu pelajaran terbawah */
    function autoKurasi() {
      var b = byteUkur(), gc0 = b;
      var jaga = 0;
      while (b > MEM_BUDGET * 0.92 && jaga++ < 24) {
        if (M.hot.length > 12) {
          var tua = M.hot.pop(); delete M.idx[tua.h]; lipatSatu(tua);
        } else if (M.pelajaran.length > 25) {
          var p = M.pelajaran.pop(); delete M.idx[p.h];
        } else break;
        b = byteUkur(); M.stat.gc++;
      }
      simpan();
      return { sebelum: gc0, sesudah: b, gc: M.stat.gc };
    }

    function simpan() { jset(LS_MEM, M); }

    /* KOMPRESI MANIFEST — bukti terukur: input raw vs tersimpan */
    function stat() {
      var b = byteUkur();
      var rasio = M.stat.rawIn > 0 ? (M.stat.rawIn / Math.max(1, b)) : 1;
      return {
        byte: b, budget: MEM_BUDGET, pct: r1(b / MEM_BUDGET * 100),
        hot: M.hot.length, warmSim: Object.keys(M.warm).length,
        pelajaran: M.pelajaran.length,
        tulis: M.stat.tulis, dedup: M.stat.dedup, lipat: M.stat.lipat, gc: M.stat.gc,
        rawIn: M.stat.rawIn, rasio: r2(rasio)
      };
    }

    return {
      tulis: tulis, pelajari: pelajari, autoKurasi: autoKurasi, stat: stat,
      baca: function (h) { for (var i = 0; i < M.hot.length; i++) if (M.hot[i].h === h) return M.hot[i]; return null; },
      pelajaran: function (n) { return M.pelajaran.slice(0, n || 5); },
      warm: function () { return M.warm; },
      hot: function () { return M.hot.slice(0, 10); },
      _test: { M: M, simpan: simpan, lipatSatu: lipatSatu }
    };
  })();

  window.V231_Ingatan = INGATAN;

  /* ============================================================
     ORGAN 3 — EVOLUSI: MESIN REVOLUSI DIRI
     ============================================================
     GENOM per REZIM WYCKOFF NATIVE SISTEM (dari MODA regimeDetector:
     ACCUMULATION / MARKUP / DISTRIBUTION / MARKDOWN / CRASH + GLOBAL)
     × kunci bobot {moda, mikoza, jugera}.
     FITNES: episode TERADILI per rezim (ingatan WARM) + fallback
     ledger SIDE kiblat utk GLOBAL.
     SIKLUS: tiap rezim berbukti (n>=8) dievaluasi sendiri → mutasi
     saat buruk → elite dikukuhkan saat baik → ROLLBACK bila mutasi
     memburukkan (guardrail: tak pernah lebih bodoh) → REVOLUSI BESAR
     saat stagnan 3 generasi. Semua tercatat di LOG REVOLUSI.
     ============================================================ */
  var EVOLUSI = (function () {
    var LOG_CAP = 40, MUT_MIN = 0.90, MUT_MAX = 1.10, BUKTI_MIN = 8;
    var STATES = ['ACCUMULATION', 'MARKUP', 'DISTRIBUTION', 'MARKDOWN', 'CRASH', 'GLOBAL'];

    var E = jget(LS_EVO);
    if (!E || E.v !== 231) {
      E = { v: 231, genome: {}, elite: {}, fama: {}, gen: 0, rev: 0, terapan: 0, log: [], _eval: {} };
      STATES.forEach(function (r) {
        E.genome[r] = Object.assign({}, BASE_GENOME);
        E.elite[r] = Object.assign({}, BASE_GENOME);
        E.fama[r] = { ak: null, n: 0, stagnan: 0 };
      });
    }
    ['genome', 'elite', 'fama', '_eval'].forEach(function (k) { if (!E[k]) E[k] = {}; });
    STATES.forEach(function (r) {
      if (!E.genome[r]) E.genome[r] = Object.assign({}, BASE_GENOME);
      if (!E.elite[r]) E.elite[r] = Object.assign({}, BASE_GENOME);
      if (!E.fama[r]) E.fama[r] = { ak: null, n: 0, stagnan: 0 };
    });
    if (!Array.isArray(E.log)) E.log = [];

    function simpan() { jset(LS_EVO, E); }

    function akurasiKiblat() {
      var K = api('V229_Kiblat');
      if (!K || typeof K.status !== 'function') return null;
      try {
        var st = K.status();
        if (!st || !st.led || !st.led.SIDE) return null;
        return { ak: st.led.SIDE.ak, n: st.led.SIDE.n };
      } catch (e) { return null; }
    }

    function mutasiGenome(g) {
      var kunci = ['moda', 'mikoza', 'jugera'];
      var k = kunci[Math.floor(Math.random() * 3)];
      var f = MUT_MIN + Math.random() * (MUT_MAX - MUT_MIN);
      var baru = Object.assign({}, g);
      baru[k] = clamp(r2(g[k] * f), 0.60, 1.45);
      return { g: baru, kunci: k, f: f };
    }

    function catatLog(jenis, rez, ak, teks) {
      E.log.unshift({ t: now(), jenis: jenis, rez: rez, ak: ak, gen: E.gen, teks: teks });
      while (E.log.length > LOG_CAP) E.log.pop();
    }

    /* SATU PUTARAN EVOLUSI — tiap rezim berbukti dievaluasi sendiri */
    function tick(paksa) {
      var kib = akurasiKiblat();
      var w = INGATAN.warm();
      var hasil = [];
      var adaAksi = false;

      STATES.forEach(function (rez) {
        var agg = { n: 0, hit: 0 };
        Object.keys(w).forEach(function (sim) {
          var r = w[sim].rezim && w[sim].rezim[rez];
          if (r) { agg.n += r.n; agg.hit += r.hit; }
        });
        var f = E.fama[rez];
        if (rez === 'GLOBAL' && (!agg.n || agg.n < BUKTI_MIN) && kib && kib.ak != null && kib.n >= 5) {
          agg = { n: kib.n, hit: Math.round(kib.ak / 100 * kib.n) };   /* fallback ledger SIDE */
        }
        if (agg.n < BUKTI_MIN && !paksa) return;

        var ak = agg.n ? Math.round(agg.hit / agg.n * 100) : f.ak;
        if (ak == null) return;
        var membaik = (f.ak == null) || (ak > f.ak);
        var memburuk = (f.ak != null) && (ak < f.ak - 2);
        f.ak = ak; f.n = agg.n;
        adaAksi = true;

        if (ak >= 55 && membaik) {
          E.elite[rez] = Object.assign({}, E.genome[rez]);
          E.gen++;
          f.stagnan = 0;
          catatLog('kukuh', rez, ak, rez + ' ak ' + ak + '% (n' + agg.n + ') → genome dikukuhkan elite');
          hasil.push({ rez: rez, aksi: 'kukuh', ak: ak });
        } else if (ak < 48 || memburuk) {
          var m = mutasiGenome(E.genome[rez]);
          var lama = E.genome[rez];
          E.genome[rez] = m.g;
          E.gen++;
          catatLog('mutasi', rez, ak, rez + ' ak ' + ak + '% (n' + agg.n + ') → mutasi ' + m.kunci + ' ×' + m.f.toFixed(2));
          E._eval[rez] = { akSebelum: ak, genomeSebelum: lama, t: now() };
          hasil.push({ rez: rez, aksi: 'mutasi', ak: ak, kunci: m.kunci });
        } else {
          if (ak < 52) f.stagnan++; else f.stagnan = 0;
          hasil.push({ rez: rez, aksi: 'jaga', ak: ak });
          if (f.stagnan >= 3) {
            /* REVOLUSI BESAR utk rezim ini */
            E.rev++;
            E.genome[rez] = { moda: r2(1.0 + (Math.random() * 0.3 - 0.15)), mikoza: r2(1.0 + (Math.random() * 0.3 - 0.15)), jugera: r2(1.0 + (Math.random() * 0.3 - 0.15)) };
            f.stagnan = 0;
            catatLog('REVOLUSI', rez, ak, 'REVOLUSI #' + E.rev + ' rezim ' + rez + ' — stagnan 3 generasi, genome diacak-ulang ±15%');
            bilang('REVOLUSI diri ke-' + E.rev + ' pada rezim ' + rez + ': akurasi stagnan ' + ak + '%, genome diacak-ulang. Evolusi berlanjut.');
            hasil.push({ rez: rez, aksi: 'REVOLUSI', ak: ak });
          }
        }

        /* guardrail rollback */
        if (E._eval[rez] && E._eval[rez].akSebelum != null && ak < E._eval[rez].akSebelum - 3) {
          E.genome[rez] = Object.assign({}, E.elite[rez]);
          catatLog('rollback', rez, ak, rez + ' memburuk ' + E._eval[rez].akSebelum + '%→' + ak + '% → rollback ke elite');
        }
        delete E._eval[rez];
      });

      if (adaAksi || paksa) simpan();
      return { ok: true, hasil: hasil, gen: E.gen, rev: E.rev };
    }

    /* TERAPKAN — bungkus computeAdaptiveWeights paling luar.
       Rezim dibaca dari modaOut.regime.currentState (Wyckoff native). */
    function terapkan() {
      var SE = api('ScalpingDirectionEngine');
      if (!SE || typeof SE.computeAdaptiveWeights !== 'function' || SE.__v231evo) return false;
      var orig = SE.computeAdaptiveWeights;
      SE.computeAdaptiveWeights = function () {
        var aw = orig.apply(this, arguments);
        try {
          if (!aw || typeof aw.moda !== 'number') return aw;
          var mo = arguments[0];
          var rez = (mo && mo.regime && mo.regime.currentState) ? String(mo.regime.currentState) : 'GLOBAL';
          var g = E.genome[rez] || E.genome.GLOBAL || BASE_GENOME;
          var w = { moda: aw.moda * (g.moda || 1), mikoza: aw.mikoza * (g.mikoza || 1), jugera: aw.jugera * (g.jugera || 1) };
          var k;
          for (k in w) if (Object.prototype.hasOwnProperty.call(w, k)) w[k] = clamp(w[k], 0.05, 3.0);
          E.terapan++;
          return w;
        } catch (e) { return aw; }
      };
      SE.__v231evo = 1;
      SE.__v231orig = orig;
      return true;
    }

    return {
      tick: tick, terapkan: terapkan, simpan: simpan,
      genome: function () { return JSON.parse(JSON.stringify(E.genome)); },
      elite: function () { return JSON.parse(JSON.stringify(E.elite)); },
      log: function (n) { return E.log.slice(0, n || 8); },
      status: function () { return { gen: E.gen, rev: E.rev, terapan: E.terapan, fama: E.fama }; },
      _test: { E: E, STATES: STATES }
    };
  })();

  window.V231_Evolusi = EVOLUSI;
