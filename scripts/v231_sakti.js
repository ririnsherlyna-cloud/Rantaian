<script>
/* ============================================================
   V231 SAKTI — LIMA ORGAN (pengambilalihan penuh oleh pengembang)
   ============================================================
   MANDAT (prerogative penuh):
     1. FOKUS CRYPTO — arah biner BUY/SELL, kewajiban pasti & akurat.
     2. HIDUP MANDIRI — lima organ berjalan sendiri, nol tombol.
     3. INGATAN TERKOMPRESI — dedup hash-alamat, delta encoding,
        pelipatan tier → TIDAK PERNAH bocor/tumpang tindih.
     4. REVOLUSI DIRI — genome per-rezim dimutasi bukti akurasi,
        guardrail rollback (tidak pernah lebih bodoh), log revolusi.
     5. PEMBUNUH PLACEHOLDER — NAFAS menghidupkan domain proxy dengan
        data real GRATIS (Binance/CoinGecko/Fear&Greed, tanpa kunci).
     6. GURU PARA TRADER — doktrin, anti-pola, nilai kesehatan diri.

   ORGAN:
     NAFAS   — uplink data real (napas pasar)
     INGATAN — memori terkompresi tanpa overlap (hash + delta + lipat)
     EVOLUSI — mesin revolusi diri (genome × rezim × bukti)
     GURU    — cyborg pengajar trader (doktrin dari bukti)
     JIWA    — supervisor otonom (irama 30 dtk, umur, uji diri)

   Integrasi (tanpa merusak modul lama):
     - membaca V229_Kiblat.status()  → ledger akurasi keluarga
     - membungkus ScalpingDirectionEngine.computeAdaptiveWeights
       PALING LUAR (flag __v231evo, di atas V228/V229)
     - berbicara lewat V207_Jarvis.say
     - kartu UI di RUANG BELAJAR setelah kartu v230-agen
     - localStorage sendiri: v231_* (tidak menyentuh kunci lain)

   Idempoten: window.__v231sakti. DOM lewat prototipe native.
   ============================================================ */
(function () {
  'use strict';
  if (window.__v231sakti) return;
  window.__v231sakti = 1;

  /* ---------------- UTIL DASAR ---------------- */
  function now() { return Date.now(); }
  function api(n) { try { var x = window[n]; return (x && typeof x === 'object') ? x : null; } catch (e) { return null; } }
  function byId(id) { try { return Document.prototype.getElementById.call(document, id); } catch (e) { return null; } }
  function newEl(t) { try { return Document.prototype.createElement.call(document, t); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function kb(b) { return (b / 1024).toFixed(1) + 'KB'; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function jget(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function jdel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* FNV-1a 32-bit — alamat konten utk dedup tanpa overlap */
  function hashObj(o) {
    var s;
    try { s = JSON.stringify(o); } catch (e) { s = String(o); }
    var h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8) + ('' + s.length).slice(-4);
  }

  /* ---------------- STATE INTI ---------------- */
  var LS_CORE = 'v231_sakti_core', LS_MEM = 'v231_ingatan', LS_EVO = 'v231_evo', LS_GURU = 'v231_guru';
  var MEM_BUDGET = 96 * 1024, CORE_BUDGET = 48 * 1024;
  var REGIMES = ['TREND_NAIK', 'TREND_TURUN', 'RENTANG', 'VOLATIL'];
  var BASE_GENOME = { moda: 1.00, mikoza: 1.00, jugera: 1.00 };

  var CORE = {
    v: 231, bootT: now(), siklus: 0, umur: 0,
    rev: 0,            /* hitungan revolusi besar */
    lahirSay: 0,
    jurnal: []         /* peristiwa penting cap 30 */
  };
  function catat(jenis, teks) {
    CORE.jurnal.unshift({ t: now(), jenis: jenis, teks: String(teks).slice(0, 150) });
    if (CORE.jurnal.length > 30) CORE.jurnal.length = 30;
    simpanCore();
  }
  function simpanCore() {
    var raw = JSON.stringify(CORE);
    if (raw.length > CORE_BUDGET) { CORE.jurnal.length = 12; raw = JSON.stringify(CORE); }
    jset(LS_CORE, CORE);
  }
  function muatCore() {
    var c = jget(LS_CORE);
    if (c && c.v === 231) {
      CORE.bootT = c.bootT || now(); CORE.siklus = c.siklus || 0;
      CORE.rev = c.rev || 0;
      CORE.jurnal = Array.isArray(c.jurnal) ? c.jurnal.slice(0, 30) : [];
      CORE.lahirSay = 1; /* sudah pernah lahir */
    }
  }

  function bilang(msg) {
    try {
      var J = api('V207_Jarvis');
      if (J && typeof J.say === 'function') J.say('[SAKTI] ' + msg);
    } catch (e) {}
  }

  /* ============================================================
     ORGAN 1 — NAFAS: UPLINK DATA REAL (pembunuh placeholder)
     Semua sumber GRATIS, tanpa API key. TTL + stale-while-revalidate
     + circuit breaker. Hasil: window.MICA_REAL.
     ============================================================ */
  var NAFAS = (function () {
    var SPOT_HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];
    var FUT_HOST = 'https://fapi.binance.com';

    /* definisi feed: TTL ms, host pool, path builder */
    var FEEDS = {
      btc_1h:   { ttl: 300e3, spot: 1, path: '/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=120' },
      eth_1h:   { ttl: 300e3, spot: 1, path: '/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=120' },
      ticker24: { ttl: 60e3,  spot: 1, path: '/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%2C%22BNBUSDT%22%5D' },
      funding:  { ttl: 120e3, fut: 1,  path: '/fapi/v1/premiumIndex?symbol=BTCUSDT' },
      oi_btc:   { ttl: 120e3, fut: 1,  path: '/fapi/v1/openInterest?symbol=BTCUSDT' },
      longshort:{ ttl: 300e3, fut: 1,  path: '/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1' },
      global_mkt:{ ttl: 600e3, ext: 'https://api.coingecko.com/api/v3/global' },
      feargreed:{ ttl: 900e3, ext: 'https://api.alternative.me/fng/?limit=1' }
    };

    var S = {
      cache: {},           /* kel → {t, data, usiaOk} */
      stats: {},           /* kel → {ok, fail, ms, lastT, errStreak, dingin} */
      req: 0, ok: 0, fail: 0,
      regime: { kini: 'RENTANG', t: 0, skor: null, alasan: 'belum terukur' }
    };
    (function init() {
      var k;
      for (k in FEEDS) if (Object.prototype.hasOwnProperty.call(FEEDS, k)) {
        S.cache[k] = null;
        S.stats[k] = { ok: 0, fail: 0, ms: 0, lastT: 0, errStreak: 0, dingin: 0 };
      }
    })();

    function fetchTimeout(url, ms) {
      return new Promise(function (res, rej) {
        var done = 0, to = setTimeout(function () { if (!done) { done = 1; rej(new Error('timeout ' + url.slice(0, 60))); } }, ms || 8000);
        try {
          var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
          if (ctrl) { setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, (ms || 8000) - 100); }
          var opt = { method: 'GET', cache: 'no-store' };
          if (ctrl) opt.signal = ctrl.signal;
          fetch(url, opt).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          }).then(function (j) { if (!done) { done = 1; clearTimeout(to); res(j); } })
            .catch(function (e) { if (!done) { done = 1; clearTimeout(to); rej(e); } });
        } catch (e) { if (!done) { done = 1; clearTimeout(to); rej(e); } }
      });
    }

    function ambilFeed(kel, paksa) {
      var f = FEEDS[kel];
      if (!f) return Promise.resolve(null);
      var st = S.stats[kel], c = S.cache[kel];
      var t = now();
      if (!paksa && c && (t - c.t) < f.ttl) return Promise.resolve(c.data);       /* segar */
      if (!paksa && c && (t - c.t) < f.ttl * 3 && st.dingin > 0) return Promise.resolve(c.data); /* stale-selagi-sakit */
      if (st.dingin > 0) return Promise.resolve(c ? c.data : null);
      var hosts = f.ext ? [f.ext] : (f.fut ? [FUT_HOST] : SPOT_HOSTS);
      var hi = 0;
      function coba() {
        if (hi >= hosts.length) {
          st.fail++; st.errStreak++; S.fail++;
          if (st.errStreak >= 3) st.dingin = 10;      /* 10 irama istirahat */
          return Promise.resolve(c ? c.data : null);  /* fallback cache basi */
        }
        var url = hosts[hi++] + f.path;
        var t0 = now();
        return fetchTimeout(url, 8000).then(function (j) {
          st.ok++; S.ok++; st.errStreak = 0; st.dingin = 0; st.ms = now() - t0; st.lastT = now();
          S.cache[kel] = { t: now(), data: j };
          return j;
        }).catch(function () { return coba(); });
      }
      return coba();
    }

    /* TURUNAN REZIM — dari BTC 1h real: EMA20/50 + volatilitas ATR% */
    function ema(arr, n) {
      if (!arr || arr.length < n) return null;
      var k = 2 / (n + 1), e = arr[0];
      for (var i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
      return e;
    }
    function hitungRegime(klines) {
      try {
        if (!Array.isArray(klines) || klines.length < 60) return null;
        var c = klines.map(function (k) { return parseFloat(k[4]); });
        var h = klines.map(function (k) { return parseFloat(k[2]); });
        var l = klines.map(function (k) { return parseFloat(k[3]); });
        var e20 = ema(c.slice(-60), 20), e50 = ema(c, 50);
        if (e20 == null || e50 == null) return null;
        /* ATR% 14 ringan */
        var tr = [], i;
        for (i = Math.max(1, c.length - 30); i < c.length; i++) {
          tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])) / c[i]);
        }
        var atr = tr.reduce(function (a, b) { return a + b; }, 0) / tr.length;
        var dorong = (e20 - e50) / e50;                 /* arah tren */
        var abs = Math.abs(dorong), sk;
        if (atr > 0.018) { sk = 'VOLATIL'; }
        else if (abs > 0.006 && dorong > 0) sk = 'TREND_NAIK';
        else if (abs > 0.006 && dorong < 0) sk = 'TREND_TURUN';
        else sk = 'RENTANG';
        return { kini: sk, t: now(), skor: { dorong: r2(dorong * 100), atr: r2(atr * 100) }, alasan: 'EMA20/50 dorong ' + r2(dorong * 100) + '% · ATR ' + r2(atr * 100) + '%' };
      } catch (e) { return null; }
    }

    function segarkanRegime(paksa) {
      return ambilFeed('btc_1h', paksa).then(function (k) {
        var r = hitungRegime(k);
        if (r) { var berubah = r.kini !== S.regime.kini; S.regime = r; if (berubah) catat('rezim', 'pasar bergeser → ' + r.kini + ' (' + r.alasan + ')'); }
        return r ? r.kini : S.regime.kini;
      });
    }

    /* refresh bertahap — 2 feed per panggilan (ramah jaringan) */
    var putar = 0, URUTAN = ['btc_1h', 'ticker24', 'funding', 'oi_btc', 'longshort', 'eth_1h', 'global_mkt', 'feargreed'];
    function denyut() {
      var tugas = [];
      for (var i = 0; i < 2; i++) {
        var kel = URUTAN[(putar + i) % URUTAN.length];
        tugas.push(ambilFeed(kel));
      }
      putar = (putar + 2) % URUTAN.length;
      return Promise.all(tugas).then(function () {
        if ((CORE.siklus + 1) % 15 === 0) return segarkanRegime(false);   /* rezim tiap ±15 irama */
        return null;
      });
    }

    function refreshAll() {
      var k, ps = [];
      for (k in FEEDS) if (Object.prototype.hasOwnProperty.call(FEEDS, k)) ps.push(ambilFeed(k));
      return Promise.all(ps).then(function () { return segarkanRegime(false); });
    }

    function health() {
      var k, aktif = 0, total = 0, t = now();
      for (k in FEEDS) if (Object.prototype.hasOwnProperty.call(FEEDS, k)) {
        total++;
        var c = S.cache[k];
        if (c && (t - c.t) < FEEDS[k].ttl * 4) aktif++;
      }
      return { aktif: aktif, total: total, req: S.req + S.ok + S.fail, ok: S.ok, fail: S.fail, regime: S.regime.kini, regimeAlasan: S.regime.alasan, skor: S.regime.skor };
    }

    return {
      denyut: denyut, refreshAll: refreshAll, segarkanRegime: segarkanRegime,
      get: function (kel) { var c = S.cache[kel]; return c ? c.data : null; },
      usia: function (kel) { var c = S.cache[kel]; return c ? now() - c.t : -1; },
      regime: function () { return S.regime; },
      health: health,
      _test: { S: S, FEEDS: FEEDS, hitungRegime: hitungRegime, ambil: ambilFeed }
    };
  })();

  window.V231_Nafas = NAFAS;

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

  /* ============================================================
     ORGAN 4 — GURU: CYBORG PENGAJAR TRADER
     Doktrin & anti-pola dari BUKTI (ledger kiblat + ingatan),
     bukan opini. Nilai kesehatan diri 0-100.
     ============================================================ */
  var GURU = (function () {
    var G = jget(LS_GURU);
    if (!G || G.v !== 231) {
      G = { v: 231, doktrin: [], antipola: [], tUpdate: 0, siswa: { dilihat: 0, disetujui: 0 } };
    }
    if (!Array.isArray(G.doktrin)) G.doktrin = [];
    if (!Array.isArray(G.antipola)) G.antipola = [];

    function simpan() { jset(LS_GURU, G); }

    function rangkaiDoktrin() {
      var K = api('V229_Kiblat'), dok = [], anti = [];
      if (K && typeof K.status === 'function') {
        try {
          var st = K.status();
          if (st && st.led) {
            var NAMA = { SIDE: 'arah master (moda+mikoza+jugera)', PHX: 'phoenix reversal', RAD: 'pump radar', LIFE: 'lifeline', OC: 'on-chain desk' };
            Object.keys(NAMA).forEach(function (f) {
              var L = st.led[f];
              if (!L || L.n < 8 || L.ak == null) return;
              if (L.ak >= 55) {
                dok.push({ teks: 'Percayai sinyal ' + NAMA[f] + ' — akurasi terbukti ' + L.ak + '% dari ' + L.n + ' vonis realita.', bukti: f + ' n' + L.n + ' ak' + L.ak + '%', bobot: L.ak });
              } else if (L.ak < 42) {
                anti.push({ teks: 'Waspadai ' + NAMA[f] + ' — hanya ' + L.ak + '% tepat dari ' + L.n + ' vonis. Jangan diikuti buta.', bukti: f + ' n' + L.n + ' ak' + L.ak + '%', bobot: 100 - L.ak });
              }
            });
          }
        } catch (e) {}
      }
      var h = NAFAS.health();
      if (h.regime === 'VOLATIL') dok.push({ teks: 'Pasar VOLATIL (ATR ekstrem): kecilkan posisi, hindari mengejar breakout — rezim ini paling banyak memakan stop-loss.', bukti: 'regime=VOLATIL ' + (h.skor ? 'ATR ' + h.skor.atr + '%' : ''), bobot: 70 });
      if (h.regime === 'TREND_NAIK') dok.push({ teks: 'TREND NAIK terukur: sisi BUY dengan konfirmasi volume lebih diutamakan; hindari counter-trend SELL dini.', bukti: 'regime=TREND_NAIK ' + (h.skor ? 'dorong +' + h.skor.dorong + '%' : ''), bobot: 75 });
      if (h.regime === 'TREND_TURUN') dok.push({ teks: 'TREND TURUN terukur: tekanan SELL dominan; tahan BUY lawan arah tanpa konfirmasi reversal kuat.', bukti: 'regime=TREND_TURUN ' + (h.skor ? 'dorong ' + h.skor.dorong + '%' : ''), bobot: 75 });
      if (h.regime === 'RENTANG') dok.push({ teks: 'Pasar RENTANG: beli di tepi bawah, jual di tepi atas; breakout tanpa volume = jebakan klasik.', bukti: 'regime=RENTANG', bobot: 60 });

      var fund = NAFAS.get('funding');
      if (fund && fund.lastFundingRate != null) {
        var fr = parseFloat(fund.lastFundingRate) * 100;
        if (fr > 0.05) dok.push({ teks: 'Funding rate tinggi (+' + r2(fr) + '%): pasar kelewatpanjang — waspadai long squeeze, siapkan rencana SELL disiplin.', bukti: 'funding ' + r2(fr) + '%', bobot: 65 + Math.min(20, fr * 100) });
        else if (fr < -0.05) dok.push({ teks: 'Funding rate negatif (' + r2(fr) + '%): short berbayar — risiko short squeeze naik, jangan SELL seret.', bukti: 'funding ' + r2(fr) + '%', bobot: 65 + Math.min(20, -fr * 100) });
      }
      var fg = NAFAS.get('feargreed');
      if (fg && fg.data && fg.data[0] && fg.data[0].value) {
        var v = parseInt(fg.data[0].value, 10);
        if (v >= 75) dok.push({ teks: 'Fear & Greed ' + v + ' (extreme greed): disiplin profit-taking; FOMO adalah biaya tersembunyi.', bukti: 'F&G ' + v, bobot: 60 });
        else if (v <= 25) dok.push({ teks: 'Fear & Greed ' + v + ' (extreme fear): akumulasi bertahap lebih masuk akal daripada panik jual.', bukti: 'F&G ' + v, bobot: 60 });
      }

      dok.sort(function (a, b) { return b.bobot - a.bobot; });
      anti.sort(function (a, b) { return b.bobot - a.bobot; });
      G.doktrin = dok.slice(0, 5);
      G.antipola = anti.slice(0, 4);
      G.tUpdate = now();
      simpan();
      return true;
    }

    /* nilai kesehatan diri cyborg — 0..100 */
    function nilai() {
      var m = INGATAN.stat(), e = EVOLUSI.status(), h = NAFAS.health(), n = 0;
      n += (m.pct < 60 ? 25 : m.pct < 85 ? 15 : 5);                 /* memori ringan */
      n += m.rasio >= 1.0 ? 15 : 5;                                  /* kompresi bekerja */
      n += h.aktif >= 5 ? 25 : h.aktif >= 3 ? 15 : 5;                /* napas data real */
      n += e.terapan > 0 ? 15 : 5;                                   /* genome terpakai */
      n += CORE.rev > 0 || e.gen > 0 ? 10 : 2;                       /* evolusi hidup */
      n += CORE.siklus > 10 ? 10 : 3;                                /* irama hidup */
      return clamp(Math.round(n), 0, 100);
    }

    function status() {
      return {
        doktrin: G.doktrin, antipola: G.antipola, tUpdate: G.tUpdate,
        nilai: nilai(),
        pelajaran: INGATAN.pelajaran(4)
      };
    }
    return {
      rangkaiDoktrin: rangkaiDoktrin, status: status, simpan: simpan,
      _test: { G: G }
    };
  })();

  window.V231_Guru = GURU;

  /* ============================================================
     PANEN EPISODE — sumber ingatan: hasil master scan (sebelum
     dihancurkan UI) + vonis kiblat (ring). Entri dialamati hash.
     ============================================================ */
  var sigScan = '';
  function panenEpisode() {
    var st = window.state || api('state');
    try {
      if (st && Array.isArray(st.results) && st.results.length) {
        var sig = hashObj({ n: st.results.length, s0: st.results[0] && st.results[0].symbol, t: Math.floor(now() / 6e5) });
        if (sig !== sigScan) {
          sigScan = sig;
          var rez = NAFAS.regime().kini;
          var n = 0;
          st.results.forEach(function (r) {
            if (!r || typeof r.symbol !== 'string') return;
            if (r.masterSide !== 'BUY' && r.masterSide !== 'SELL') return;
            /* rezim = state Wyckoff native per-koin (MODA regimeDetector),
               fallback iklim makro BTC dari NAFAS */
            var rezW = (r.moda && r.moda.regime && r.moda.regime.currentState) ? String(r.moda.regime.currentState) : NAFAS.regime().kini;
            var e = {
              sim: r.symbol, arah: r.masterSide, rezim: rezW,
              hit: null,                                        /* diisi saat diadili kiblat */
              skor: Math.round(Number(r.masterScore) || 0),
              harga: Number(r.entry) || Number(r.price) || Number(r.currentPrice) || 0
            };
            var res = INGATAN.tulis('episode', e, { sim: r.symbol, arah: r.masterSide, rezim: rezW });
            if (res && !res.dedup) n++;
          });
          if (n > 0) catat('panen', n + ' episode arah dipanen ke ingatan (rezim ' + rez + ')');
        }
      }
    } catch (e) {}

    /* vonis kiblat → episode TERADILI (hit 1/0) + pelajaran.
       Ring V229: {sym, fam, rumusan, ret, hit}. Rezim dicap saat
       panen ini (aproksimasi: vonis usia ≤ 4 jam, rezim dominan). */
    try {
      var K = api('V229_Kiblat');
      if (K && typeof K.status === 'function') {
        var ks = K.status();
        if (ks && Array.isArray(ks.ring) && ks.ring.length) {
          var sigV = hashObj({ ring: ks.ring.slice(0, 8).map(function (x) { return x.t + '|' + x.sym + '|' + x.fam + '|' + x.hit; }) });
          if (sigV !== panenEpisode._sigV) {
            panenEpisode._sigV = sigV;
            var rez = NAFAS.regime().kini;
            var vonis = ks.ring.filter(function (x) { return x && (x.hit === 1 || x.hit === 0); }).slice(0, 14);
            var nBaru = 0;
            vonis.forEach(function (x) {
              var res = INGATAN.tulis('episode', {
                sim: x.sym, fam: x.fam, hit: x.hit ? 1 : 0,
                ret: Number(x.ret) || 0, rezim: rez
              }, { sim: x.sym, arah: '-', rezim: rez });
              if (res && !res.dedup) nBaru++;
            });
            if (vonis.length) {
              var hit = vonis.filter(function (x) { return x.hit === 1; }).length;
              INGATAN.pelajari(
                'Vonis terbaru: ' + hit + '/' + vonis.length + ' rumusan terbukti tepat (' + vonis.map(function (x) { return x.sym + ' ' + x.fam; }).slice(0, 4).join(', ') + (vonis.length > 4 ? '…' : '') + ').',
                'kiblat ring n' + vonis.length
              );
              if (nBaru) catat('vonis', hit + '/' + vonis.length + ' vonis tepat — ' + nBaru + ' episode teradili masuk ingatan (rezim ' + rez + ')');
            }
          }
        }
      }
    } catch (e) {}
  }
  panenEpisode._sigV = '';

  /* ============================================================
     ORGAN 5 — JIWA: SUPERVISOR OTONOM
     ============================================================ */
  var JIWA = {
    timer: 0, timerLambat: 0, hidden: false,
    lastGuru: 0, lastKurasi: 0, lastEvo: 0,
    tes: null
  };

  function denyutHidup(mode) {
    CORE.siklus++;
    var t0 = now();
    var langkah = [];
    return NAFAS.denyut().then(function () {
      langkah.push({ organ: 'NAFAS', ok: 1, ringkas: (function () { var h = NAFAS.health(); return h.aktif + '/' + h.total + ' feed · rezim ' + h.regime; })() });
      panenEpisode();
      langkah.push({ organ: 'PANEN', ok: 1, ringkas: 'episode & vonis disaring ke ingatan' });
      var t = now();
      if (t - JIWA.lastEvo > 15 * 60e3) {
        JIWA.lastEvo = t;
        var ev = EVOLUSI.tick(false);
        var ringkasEvo = 'menunggu bukti';
        if (ev.ok && ev.hasil && ev.hasil.length) {
          ringkasEvo = ev.hasil.map(function (h) { return h.aksi + ' ' + h.rez + '(' + h.ak + '%)'; }).join(' · ') + ' — gen ' + ev.gen;
        } else if (ev.ok) {
          ringkasEvo = 'gen ' + ev.gen + ' — bukti per rezim belum cukup (n<8)';
        }
        langkah.push({ organ: 'EVOLUSI', ok: 1, ringkas: ringkasEvo });
      }
      t = now();
      if (t - JIWA.lastKurasi > 10 * 60e3) {
        JIWA.lastKurasi = t;
        var kur = INGATAN.autoKurasi();
        langkah.push({ organ: 'INGATAN', ok: 1, ringkas: kb(kur.sesudah) + '/' + kb(MEM_BUDGET) + ' · rasio ×' + INGATAN.stat().rasio });
      }
      t = now();
      if (t - JIWA.lastGuru > 10 * 60e3) {
        JIWA.lastGuru = t;
        GURU.rangkaiDoktrin();
        var g = GURU.status();
        langkah.push({ organ: 'GURU', ok: 1, ringkas: 'doktrin ' + g.doktrin.length + ' · anti-pola ' + g.antipola.length + ' · nilai ' + g.nilai });
      }
      simpanCore();
      JIWA.denyutTerakhir = { t: now(), ms: now() - t0, mode: mode || 'auto', langkah: langkah };
      return JIWA.denyutTerakhir;
    }).catch(function (e) {
      JIWA.denyutTerakhir = { t: now(), ms: 0, mode: mode || 'auto', err: String(e && e.message || e), langkah: langkah };
      return JIWA.denyutTerakhir;
    });
  }

  function siklusUji() {
    var t0 = now();
    return new Promise(function (selesai) {
      var langkah = [];
      /* 1 NAFAS penuh */
      NAFAS.refreshAll().then(function () {
        var h = NAFAS.health();
        langkah.push({ fase: 'NAFAS', ok: h.aktif > 0, ringkas: h.aktif + '/' + h.total + ' feed hidup · rezim ' + h.regime + ' — ' + h.regimeAlasan });
        /* 2 INGATAN tulis-baca-dedup */
        var uji1 = { uji: 'sakti', angka: Math.floor(Math.random() * 1e6) };
        var w1 = INGATAN.tulis('uji', uji1);
        var w2 = INGATAN.tulis('uji', uji1);
        langkah.push({ fase: 'INGATAN', ok: w1.ok && w2.ok && w2.dedup, ringkas: 'tulis ' + w1.hash + ' · tulis ulang → dedup=' + w2.dedup + ' (tanpa overlap)' });
        /* 3 EVOLUSI */
        var ev = EVOLUSI.tick(false);
        var evoR = ev.ok && ev.hasil && ev.hasil.length
          ? ev.hasil.map(function (h) { return h.aksi + ' ' + h.rez + '(' + h.ak + '%)'; }).join(' · ')
          : 'bukti per rezim belum cukup (n<8)';
        langkah.push({ fase: 'EVOLUSI', ok: true, ringkas: evoR + ' — gen ' + ev.gen + ' rev ' + ev.rev });
        /* 4 GURU */
        GURU.rangkaiDoktrin();
        var g = GURU.status();
        langkah.push({ fase: 'GURU', ok: g.doktrin.length > 0, ringkas: 'doktrin ' + g.doktrin.length + ' · anti-pola ' + g.antipola.length + ' · nilai diri ' + g.nilai + '/100' });
        /* 5 INGATAN kurasi */
        var kur = INGATAN.autoKurasi();
        var st = INGATAN.stat();
        langkah.push({ fase: 'KURASI', ok: st.byte <= MEM_BUDGET, ringkas: kb(kur.sesudah) + '/' + kb(MEM_BUDGET) + ' · dedup ' + st.dedup + ' · lipat ' + st.lipat + ' · rasio ×' + st.rasio });
        selesai({ t: now(), ms: now() - t0, langkah: langkah });
      }).catch(function (e) {
        langkah.push({ fase: 'NAFAS', ok: 0, ringkas: 'gagal: ' + (e && e.message ? e.message : e) });
        selesai({ t: now(), ms: now() - t0, langkah: langkah, err: true });
      });
    });
  }

  window.V231_Jiwa = {
    denyut: denyutHidup, uji: siklusUji,
    status: function () {
      return {
        siklus: CORE.siklus, bootT: CORE.bootT, umurJam: r1((now() - CORE.bootT) / 3600e3),
        rev: CORE.rev, jurnal: CORE.jurnal.slice(0, 10),
        denyut: JIWA.denyutTerakhir || null,
        ingatan: INGATAN.stat(), evolusi: EVOLUSI.status(), guru: GURU.status(), nafas: NAFAS.health()
      };
    },
    _test: { CORE: CORE, JIWA: JIWA, catat: catat }
  };

  /* ============================================================
     UI — KARTU "V231 SAKTI · ORGAN HIDUP" (jendela saja; inti
     berjalan sendiri). Dipasang di RUANG BELAJAR setelah kartu
     v230-agen. Auto-paint tiap 6 dtk.
     ============================================================ */
  var UI = { built: false, tries: 0, lastHtml: '', uji: null };

  function mountStyle() {
    if (byId('v231-style')) return;
    var st = newEl('style'); st.id = 'v231-style';
    st.textContent =
      '.v231-card{border:1px solid rgba(74,222,128,.25);border-radius:11px;background:rgba(74,222,128,.04);padding:10px 12px;margin:10px 0;}' +
      '.v231-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
      '.v231-ttl{font:700 11px Consolas,monospace;letter-spacing:2px;color:#4ade80;}' +
      '.v231-sub{font-size:9px;color:#7a8494;letter-spacing:.6px;}' +
      '.v231-nilai{margin-left:auto;font:700 11px Consolas,monospace;letter-spacing:1px;}' +
      '.v231-organ{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:6px;margin:8px 0;}' +
      '.v231-org{border:1px solid rgba(74,222,128,.18);border-radius:8px;padding:6px 8px;background:rgba(10,14,18,.5);}' +
      '.v231-org .o{font:700 8px Consolas,monospace;letter-spacing:1.5px;color:#3f9e63;}' +
      '.v231-org .v{font-size:10px;color:#d3f4e0;margin-top:3px;line-height:1.4;}' +
      '.v231-org .v small{display:block;font-size:8.5px;color:#7a8494;}' +
      '.v231-dok{font-size:10px;line-height:1.55;color:#cfe8d8;margin:6px 0 2px;}' +
      '.v231-dok b{color:#4ade80;font:700 8.5px Consolas,monospace;letter-spacing:1.2px;}' +
      '.v231-anti{font-size:10px;line-height:1.5;color:#f0c9b8;margin:4px 0;}' +
      '.v231-anti b{color:#fb923c;font:700 8.5px Consolas,monospace;letter-spacing:1.2px;}' +
      '.v231-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:7px;}' +
      '.v231-chip{font:600 8.5px Consolas,monospace;letter-spacing:.8px;color:#9fd8b4;border:1px solid rgba(74,222,128,.28);border-radius:6px;padding:3px 7px;background:rgba(74,222,128,.06);}' +
      '.v231-btn{font:700 9px Consolas,monospace;letter-spacing:1.2px;color:#052e16;background:#4ade80;border-radius:7px;padding:5px 11px;border:none;cursor:pointer;}' +
      '.v231-btn:hover{filter:brightness(1.08);}' +
      '.v231-j{font-size:9px;color:#8fa898;line-height:1.6;margin-top:5px;max-height:64px;overflow:hidden;}' +
      '.v231-ok{color:#4ade80;} .v231-warn{color:#fbbf24;} .v231-bad{color:#f87171;}' +
      '@media(max-width:860px){.v231-organ{grid-template-columns:repeat(2,1fr);}}';
    Document.prototype.appendChild.call(document.head, st);
  }

  function organHtml(st) {
    var m = st.ingatan, e = st.evolusi, h = st.nafas, g = st.guru;
    function organ(nama, isi, kelas) {
      return '<div class="v231-org"><div class="o">' + nama + '</div><div class="v' + (kelas ? ' ' + kelas : '') + '">' + isi + '</div></div>';
    }
    var html = '';
    html += organ('NAFAS · DATA REAL', h.aktif + '/' + h.total + ' feed' + '<small>rezim ' + esc(h.regime) + ' — ' + esc(h.regimeAlasan) + '</small>', h.aktif >= 4 ? 'v231-ok' : 'v231-warn');
    html += organ('INGATAN · TERKOMPRESI', kb(m.byte) + ' / ' + kb(m.budget) + '<small>dedup ' + m.dedup + ' · lipat ' + m.lipat + ' · rasio ×' + m.rasio + '</small>', m.pct < 85 ? 'v231-ok' : 'v231-warn');
    html += organ('EVOLUSI · REVOLUSI DIRI', 'gen ' + e.gen + ' · rev ' + CORE.rev + '<small>genome teraplikasi ' + e.terapan + '× pada ' + esc(e.rezim) + '</small>');
    html += organ('GURU · DOKTRIN', g.doktrin.length + ' ajaran · ' + g.antipola.length + ' anti-pola' + '<small>' + (g.pelajaran[0] ? esc(String(g.pelajaran[0].teks).slice(0, 64)) + '…' : 'mengumpulkan bukti…') + '</small>');
    html += organ('JIWA · IRAMA', st.siklus + ' denyut · umur ' + st.umurJam + ' jam' + '<small>' + (st.denyut && st.denyut.langkah ? st.denyut.langkah.length + ' langkah/putaran' : 'menyala…') + '</small>');
    return html;
  }

  function paintCard() {
    var root = byId('v231-card-body');
    if (!root) return;
    var st = window.V231_Jiwa.status();
    var html = '';
    html += '<div class="v231-head"><span class="v231-ttl">V231 SAKTI — ORGAN HIDUP</span>' +
      '<span class="v231-sub">cyborg guru trader · fokus crypto · arah biner BUY/SELL</span>' +
      '<span class="v231-nilai ' + (st.guru.nilai >= 70 ? 'v231-ok' : st.guru.nilai >= 45 ? 'v231-warn' : 'v231-bad') + '">Kesehatan ' + st.guru.nilai + '/100</span></div>';
    html += '<div class="v231-organ">' + organHtml(st) + '</div>';
    var dok = st.guru.doktrin.slice(0, 2).map(function (d) { return '<div>▸ ' + esc(d.teks) + ' <span style="color:#5a7f68">[' + esc(d.bukti) + ']</span></div>'; }).join('');
    html += '<div class="v231-dok"><b>DOKTRIN GURU</b>' + (dok || '<div>▸ Mengumpulkan bukti vonis — doktrin lahir dari akurasi nyata, bukan opini.</div>') + '</div>';
    var anti = st.guru.antipola.slice(0, 2).map(function (d) { return '<div>✕ ' + esc(d.teks) + ' <span style="color:#8a6a58">[' + esc(d.bukti) + ']</span></div>'; }).join('');
    if (anti) html += '<div class="v231-anti"><b>ANTI-POLA</b>' + anti + '</div>';
    var ch = [
      'feed ' + st.nafas.aktif + '/' + st.nafas.total,
      'memori ' + Math.round(st.ingatan.pct) + '%',
      'dedup ' + st.ingatan.dedup,
      'gen ' + st.evolusi.gen,
      'rev ' + CORE.rev,
      'teraplikasi ' + st.evolusi.terapan + '×'
    ];
    html += '<div class="v231-row">' + ch.map(function (c) { return '<span class="v231-chip">' + esc(c) + '</span>'; }).join('') +
      '<button class="v231-btn" id="v231-uji">UJI SAKTI</button></div>';
    if (UI.uji) {
      var rows = UI.uji.langkah.map(function (l) {
        return '<div style="font-size:9px;color:' + (l.ok ? '#9fd8b4' : '#f87171') + '">' + esc(l.fase) + ': ' + esc(l.ringkas) + '</div>';
      }).join('');
      html += '<div class="v231-j">UJI SAKTI (' + UI.uji.ms + 'ms):' + rows + '</div>';
    }
    var jrn = CORE.jurnal.slice(0, 4).map(function (j) {
      return '<div>· ' + esc(j.jenis) + ' — ' + esc(j.teks) + '</div>';
    }).join('');
    if (jrn) html += '<div class="v231-j">JURNAL HIDUP:' + jrn + '</div>';
    if (html !== UI.lastHtml) {
      root.innerHTML = html;
      UI.lastHtml = html;
      var b = byId('v231-uji');
      if (b) b.addEventListener('click', function () {
        b.textContent = 'MENGUJI…'; b.disabled = true;
        siklusUji().then(function (r) {
          UI.uji = r; paintCard();
        }).catch(function (e) {
          UI.uji = { t: now(), ms: 0, langkah: [{ fase: 'UJI', ok: 0, ringkas: 'gagal: ' + (e && e.message ? e.message : e) }] };
          paintCard();
        });
      });
    }
  }

  function buildUI() {
    if (UI.built) return true;
    var root = byId('v217-root');
    if (!root) return false;
    var bel = null;
    try { bel = root.querySelector('.v217-pg[data-k="belajar"] .wrap'); } catch (e) {}
    if (!bel) return false;
    var card = byId('v231-card');
    if (!card) {
      card = newEl('div'); card.className = 'v217-card'; card.id = 'v231-card';
      var body = newEl('div'); body.id = 'v231-card-body';
      card.appendChild(body);
      var anchor = byId('v230-agen');
      if (anchor && anchor.parentNode === bel) bel.insertBefore(card, anchor.nextSibling);
      else bel.appendChild(card);
    }
    UI.built = true;
    mountStyle();
    paintCard();
    return true;
  }

  /* ---------------- BOOT ---------------- */
  var bootTries = 0;
  function boot() {
    var butuh = api('V229_Kiblat') && api('V207_Jarvis') && api('ScalpingDirectionEngine');
    if (!butuh) { if (bootTries++ < 120) setTimeout(boot, 1000); return; }
    muatCore();

    /* 1. EVOLUSI membungkus mesin arah — TUNGGU wrapper V228/V229
       terpasang dulu agar genome benar-benar lapisan TERLUAR.
       Batas tunggu 12 dtk: kalau belum juga, pasang saja (urutan
       multiplikatif — hasil tetap benar, hanya urutan log). */
    var terpasang = EVOLUSI.terapkan();
    var evoTunggu = 0;
    if (!terpasang) {
      var tungguEvo = setInterval(function () {
        evoTunggu++;
        var SE = api('ScalpingDirectionEngine');
        var siap = SE && SE.__v229ben && !SE.__v231evo;
        if (siap || evoTunggu >= 10) {
          clearInterval(tungguEvo);
          terpasang = EVOLUSI.terapkan();
          if (terpasang) catat('evolusi', 'genome terbentang di lapisan terluar computeAdaptiveWeights');
        }
      }, 1200);
    }

    /* 2. napas pertama: seluruh feed */
    NAFAS.refreshAll().then(function () {
      var h = NAFAS.health();
      catat('lahir', 'SAKTI hidup: feed ' + h.aktif + '/' + h.total + ' · rezim ' + h.regime);
      /* 3. denyut pertama: panen + evolusi + kurasi + guru */
      return denyutHidup('boot');
    }).then(function () {
      if (!CORE.lahirSay) {
        CORE.lahirSay = 1;
        simpanCore();
        bilang('V231 SAKTI hidup: 5 organ aktif — ingatan terkompresi tanpa overlap, evolusi diri per rezim, doktrin guru dari bukti vonis. Arah tetap biner: BUY atau SELL.');
      } else {
        bilang('V231 SAKTI terbangun kembali: siklus ' + CORE.siklus + ' · revolusi ' + CORE.rev + ' · gen ' + EVOLUSI.status().gen + '.');
      }
      paintCard();
    }).catch(function (e) {
      catat('galat', 'boot: ' + String(e && e.message || e));
    });

    /* 4. IRAMA — 30 dtk (terlihat) / 90 dtk (tersembunyi) */
    JIWA.timer = setInterval(function () {
      if (!document.hidden) denyutHidup('auto');
    }, 30e3);
    JIWA.timerLambat = setInterval(function () {
      if (document.hidden) denyutHidup('lambat');
    }, 90e3);
    try { document.addEventListener('visibilitychange', function () { JIWA.hidden = !!document.hidden; if (!document.hidden) setTimeout(function () { denyutHidup('bangun'); }, 2500); }, { passive: true }); } catch (e) {}

    /* 5. UI — tunggu ruang belajar siap (kartu V230 dipasang dgn retry) */
    var uiTries = 0;
    (function tungguUI() {
      if (buildUI() && uiTries < 60) { /* built */ }
      if (!UI.built && uiTries++ < 60) setTimeout(tungguUI, 500);
    })();
    setInterval(function () { if (!UI.built) buildUI(); else paintCard(); }, 6000);

    console.log('%c[V231] SAKTI aktif — 5 organ: NAFAS(data real) INGATAN(kompresi+dedup) EVOLUSI(genome×rezim) GURU(doktrin) JIWA(irama 30dtk) · evolusi terpasang: ' + (terpasang ? 'YA (wrapper terluar)' : 'menunggu engine'), 'color:#4ade80;font-weight:bold');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2000); });
  } else { setTimeout(boot, 2000); }
})();
</script>
