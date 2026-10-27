
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
