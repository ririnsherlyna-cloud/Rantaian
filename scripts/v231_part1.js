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
