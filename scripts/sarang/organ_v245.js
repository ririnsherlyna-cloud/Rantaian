/*V245-SARANG-BAWAAN:BEGIN*/
// ============================================================
// V245 SAKTI-SARANG-BAWAAN v1.0 — ORGAN "TERIMA PASANG".
// Mandat Guru:
//  "inovasi sarang GitHub Pages sudah langsung terintegrasi —
//   user yang buka gak perlu isi-isi owner GitHub, cabang dan
//   lainnya... user hanya tahu terima pasang. Saat buka browser
//   kapan pun itu sudah tertera jelas perkembangan dan
//   perubahannya. Semua memiliki versi yang sama. Waktu dibuka,
//   sasaran sudah ada — tidak mulai dari nol perkembangan lagi;
//   kapan pun dibuka, ya mengikuti perkembangan yang sudah
//   terjadi."
//
// ARTI BAWAAN (tiga kekuatan, tanpa satu pun isian):
//   1. SARANG OTOMATIS — alamat sarang diturunkan sendiri dari
//      URL halaman (owner.github.io/repo); bila URL tak bisa
//      dibaca (file://, localhost), memakai alamat bawaan yang
//      tertanam. Konfigurasi lama pemilik TIDAK ditimpa, dan
//      TOKEN tidak pernah disentuh organ ini.
//   2. SASARAN LANGSUNG — saat halaman dibuka kapan pun, otak
//      server (V244 SARANG-PENJAGA) dibaca PUBLIK tanpa token:
//      laporan sasaran terkini, akurasi jujur, rezim BTC,
//      kandidat, genome, denyut — langsung tampil di panel
//      SARANG. Tidak pernah mulai dari nol lagi.
//   3. SATU KEADAAN UNTUK SEMUA — pulih memori + pemeriksa
//      tubuh baru (organ V243) kini ikut menyala tanpa token
//      karena keduanya sebenarnya baca publik; setiap browser
//      melihat keadaan yang sama dari satu sumber kebenaran:
//      repo di sarang. Evolusi rutin dikerjakan PENJAGA di
//      server tiap 30 menit — browser cukup menjadi mata.
// ============================================================
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var V = { versi: '1.1', nama: 'SAKTI-SARANG-BAWAAN', organ: 'V245' };

  function q(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }

  // ---------------- alamat bawaan tertanam ----------------
  // Dipakai HANYA bila URL halaman tak bisa dibaca (file://, uji).
  var BAWAAN = {
    owner: 'ririnsherlyna-cloud', repo: 'Micaprofita-', branch: 'main',
    pagesUrl: 'https://ririnsherlyna-cloud.github.io/Micaprofita-/'
  };

  // ---------------- L1 kecil (kunci sendiri mp245.*) ----------------
  function l1Get(k, def) { try { var v = localStorage.getItem('mp245.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function l1Set(k, v) { try { localStorage.setItem('mp245.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // ---------------- turunkan alamat sarang dari URL (murni — dapat diuji) ----------------
  function turun(host, path) {
    if (!host || String(host).indexOf('github.io') < 0) return null;
    var bag = String(host).split('.');
    var owner = bag[0];
    if (!owner || owner === 'www' || owner === 'pages') return null;
    var repo = '';
    if (path) {
      var p = String(path).replace(/^\/+/, '');
      if (p) repo = decodeURIComponent(p.split('/')[0] || '');
    }
    if (!repo) return null;
    return { owner: owner, repo: repo, branch: 'main', pagesUrl: 'https://' + host + '/' + repo + '/' };
  }
  function turunDariUrl() {
    try { return turun(location.hostname, location.pathname); } catch (e) { return null; }
  }

  function sarang() { return (window.V231_SAKTI && window.V231_SAKTI.SARANG) || null; }

  // ---------------- keadaan ----------------
  var keadaan = {
    dipasang: null,      // hasil pasangBawaan
    server: null,        // laporan SASARAN-MICAPROFITA terbaca
    denyut: [],          // denyut server terakhir (maks 4)
    galat: '', waktuBaca: null, _polling: null, _jmlBaca: 0
  };

  // ---------------- KEKUATAN 1: pasang sarang otomatis ----------------
  function pasangBawaan() {
    var S = sarang();
    if (!S) return { ok: false, cara: 'organ SARANG belum lahir — baca server tetap jalan mandiri' };
    var st = S.status() || {};
    var cfg = st.cfg || {};
    var target = turunDariUrl() || BAWAAN;
    var milikku = l1Get('bawaan', null); // konfig yang dulu DIPASANG organ ini
    var hasil;
    if (cfg.owner && milikku && cfg.owner === milikku.owner && cfg.repo === milikku.repo) {
      // konfig lahir dari bawaan — boleh mengikuti alamat halaman baru (fork/domain)
      if (cfg.owner !== target.owner || cfg.repo !== target.repo || (cfg.pagesUrl || '') !== target.pagesUrl) {
        S.cfgSet({ owner: target.owner, repo: target.repo, branch: target.branch, pagesUrl: target.pagesUrl });
        l1Set('bawaan', { owner: target.owner, repo: target.repo });
        hasil = { ok: true, cara: 'mengikuti alamat halaman', target: target };
      } else {
        hasil = { ok: true, cara: 'sudah sinkron dengan alamat halaman', target: target };
      }
    } else if (!cfg.owner) {
      // pasang pertama — tanpa satu pun isian
      S.cfgSet({ owner: target.owner, repo: target.repo, branch: target.branch, pagesUrl: target.pagesUrl });
      l1Set('bawaan', { owner: target.owner, repo: target.repo });
      hasil = { ok: true, cara: 'pasang pertama — tanpa isian', target: target };
    } else {
      hasil = { ok: true, cara: 'aturan pemilik dihormati (' + cfg.owner + '/' + cfg.repo + ')', target: target };
    }
    keadaan.dipasang = hasil;
    return hasil;
  }

  // ---------------- jaringan publik (tanpa token) ----------------
  function ambil(url, ms) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms || 15000);
    return fetch(url, { signal: ctl.signal, cache: 'no-store' }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).catch(function (e) {
      clearTimeout(t);
      throw new Error(String((e && e.message) || e));
    });
  }

  // ---------------- KEKUATAN 2: baca otak server ----------------
  function alamatSarang() {
    var S = sarang();
    var cfg = (S && S.status() && S.status().cfg) || {};
    if (cfg.pagesUrl) return cfg.pagesUrl;
    var t = turunDariUrl() || BAWAAN;
    return t.pagesUrl;
  }

  function bacaServer() {
    var base = alamatSarang();
    var cb = '?bawaancek=' + Date.now();
    return Promise.all([
      ambil(base + 'laporan/sasaran-terkini.json' + cb),
      ambil(base + 'laporan/denyut-server.jsonl' + cb)
    ]).then(function (h) {
      var l = null;
      try { l = JSON.parse(h[0]); } catch (e) { throw new Error('laporan bukan JSON sah'); }
      if (!l || l.protokol !== 'SASARAN-MICAPROFITA') throw new Error('laporan asing (protokol: ' + ((l && l.protokol) || '?') + ')');
      keadaan.server = l;
      var baris = String(h[1] || '').split('\n');
      keadaan.denyut = [];
      for (var i = baris.length - 1; i >= 0 && keadaan.denyut.length < 4; i--) {
        var b = baris[i].trim();
        if (!b) continue;
        try { keadaan.denyut.push(JSON.parse(b)); } catch (e) { /* baris rusak = lewati (fault isolation) */ }
      }
      keadaan.galat = '';
      keadaan.waktuBaca = new Date().toISOString();
      keadaan._jmlBaca++;
      render();
      return { ok: true, siklus: l.siklus, sasaran: (l.sasaranHariIni || []).length };
    }).catch(function (e) {
      keadaan.galat = String((e && e.message) || e).slice(0, 140);
      render();
      return { ok: false, galat: keadaan.galat };
    });
  }

  // ---------------- util tampilan ----------------
  function escapeH(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function fmtHarga(v) {
    var n = Number(v);
    if (!isFinite(n)) return '-';
    var d = n >= 1000 ? 2 : (n >= 1 ? 4 : 6);
    var bag = n.toFixed(d).split('.');
    bag[0] = bag[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return bag.join('.');
  }
  function teksAkurasi(a) {
    if (!a) return 'belum ada data akurasi';
    var dinilai = (a.benar || 0) + (a.salah || 0);
    if (dinilai === 0) return 'belum ada yang dinilai — ' + (a.terkunci || 0) + ' prediksi terkunci, menunggu horizon 24 jam';
    var persen = isFinite(a.akurasiPct) ? a.akurasiPct + '%' : '-';
    var j = a.jendela7h || {};
    var jd = (j.benar || 0) + (j.salah || 0);
    var jteks = jd > 0 ? (isFinite(j.akurasiPct) ? j.akurasiPct + '%' : '-') + ' (' + jd + ')' : 'belum ada';
    var net = isFinite(a.netKumulatifPct) ? (a.netKumulatifPct > 0 ? '+' : '') + a.netKumulatifPct + '%' : '-';
    return '<b>' + persen + '</b> (' + a.benar + ' benar / ' + a.salah + ' salah) · 7 hari: ' + jteks + ' · net kumulatif: ' + net + ' (fee 0,2% pulang-pergi dihitung)';
  }

  // ---------------- UI: satu seksi di dalam panel SARANG (V243) ----------------
  var CSS = '<style>' +
    '#v245-bawaan{margin:10px 0 12px;padding:10px 10px 8px;border:1px solid rgba(245,158,11,.25);border-radius:10px;background:rgba(10,7,2,.55)}' +
    '#v245-bawaan .v245-judul{display:flex;align-items:center;gap:8px;font-size:11.5px;letter-spacing:2px;color:#fde68a;margin-bottom:2px}' +
    '#v245-bawaan .v245-sub{color:#a18b5d;font-size:10px;margin-bottom:8px;line-height:1.5}' +
    '#v245-bawaan .v245-led{width:8px;height:8px;border-radius:50%;background:#f59e0b;box-shadow:0 0 6px #f59e0b;flex:none}' +
    '#v245-bawaan .v245-led.hijau{background:#10b981;box-shadow:0 0 6px #10b981}' +
    '#v245-bawaan .v245-led.merah{background:#ef4444;box-shadow:0 0 6px #ef4444}' +
    '#v245-bawaan .v245-ringkas{font-size:11px;color:#fdf3df;margin-bottom:6px}' +
    '#v245-bawaan .v245-baris{display:flex;align-items:center;gap:7px;padding:4px 0;border-top:1px dashed rgba(245,158,11,.14);font-size:11px;color:#e7d9bd}' +
    '#v245-bawaan .v245-arah{flex:none;width:44px;text-align:center;font-weight:700;border-radius:5px;padding:2px 0;font-size:10px}' +
    '#v245-bawaan .v245-arah.BUY{background:rgba(16,185,129,.18);color:#34d399;border:1px solid rgba(16,185,129,.4)}' +
    '#v245-bawaan .v245-arah.SELL{background:rgba(239,68,68,.16);color:#f87171;border:1px solid rgba(239,68,68,.4)}' +
    '#v245-bawaan .v245-sim{flex:none;width:52px;font-weight:700;color:#fdf3df}' +
    '#v245-bawaan .v245-bar{flex:1;height:7px;border-radius:4px;background:rgba(245,158,11,.12);overflow:hidden}' +
    '#v245-bawaan .v245-bar i{display:block;height:100%;background:linear-gradient(90deg,rgba(245,158,11,.55),#f59e0b)}' +
    '#v245-bawaan .v245-ang{flex:none;width:38px;text-align:right;color:#fde68a;font-weight:700}' +
    '#v245-bawaan .v245-entry{flex:none;width:92px;text-align:right;color:#a18b5d;font:10.5px ui-monospace,monospace}' +
    '#v245-bawaan .v245-lain{font-size:10.5px;color:#a18b5d;margin-top:7px;line-height:1.6}' +
    '#v245-bawaan .v245-denyut{font:10px ui-monospace,monospace;color:#8a7a55;margin-top:6px;line-height:1.65;white-space:pre-line}' +
    '#v245-bawaan .v245-catatan{font-size:9.5px;color:#7c6c46;margin-top:8px;line-height:1.55;font-style:italic}' +
    '#v245-bawaan a{color:#fde68a}' +
    '</style>';

  function sisipUI() {
    var panel = q('v243-panel');
    if (!panel || q('v245-bawaan')) return false; // idempoten + degradasi jujur tanpa panel
    var div = document.createElement('div');
    div.id = 'v245-bawaan';
    div.innerHTML = CSS +
      '<div class="v245-judul"><span class="v245-led" id="v245-led"></span>OTAK SERVER — SARANG-PENJAGA</div>' +
      '<div class="v245-sub">MISI: guru trader profesional — sasaran harian makin jarang meleset menuju selalu-untung, diukur jujur dari ledger · terima-pasang: sarang terpasang otomatis dari alamat halaman · laporan dibaca publik tanpa token · semua browser melihat keadaan yang sama</div>' +
      '<div class="v245-ringkas" id="v245-ringkas">membaca otak server…</div>' +
      '<div id="v245-daftar"></div>' +
      '<div class="v245-lain" id="v245-lain"></div>' +
      '<div class="v245-denyut" id="v245-denyut"></div>' +
      '<div class="v245-catatan" id="v245-catatan"></div>';
    var status = q('v243-status');
    if (status && status.parentNode) status.parentNode.insertBefore(div, status.nextSibling);
    else panel.appendChild(div);
    return true;
  }

  function render() {
    try {
      var led = q('v245-led');
      if (led) led.className = 'v245-led ' + (keadaan.galat ? 'merah' : (keadaan.server ? 'hijau' : ''));
      var rk = q('v245-ringkas');
      if (rk) {
        if (keadaan.galat) {
          rk.innerHTML = 'otak server belum terjangkau — <span style="color:#f87171">' + escapeH(keadaan.galat) + '</span><br>buka halaman dari alamat Pages (https) agar laporan terbaca.';
        } else if (!keadaan.server) {
          rk.innerHTML = 'membaca otak server…';
        } else {
          var l = keadaan.server;
          var rb = l.rezimBTC || {};
          rk.innerHTML = 'denyut <b>#' + escapeH(l.siklus) + '</b> · rezim BTC <b>' + escapeH(rb.rezim || '-') + '</b>' +
            (rb.harga ? ' · BTC ' + fmtHarga(rb.harga) : '') +
            (rb.atrPct !== undefined ? ' · ATR ' + escapeH(rb.atrPct) + '%' : '') +
            ' · <span style="color:#a18b5d">dibaca ' + String(keadaan.waktuBaca || '').slice(11, 19) + 'Z</span>';
        }
      }
      var daftar = q('v245-daftar');
      if (daftar) {
        var html = '';
        if (keadaan.server && keadaan.server.sasaranHariIni && keadaan.server.sasaranHariIni.length) {
          var ss = keadaan.server.sasaranHariIni;
          for (var i = 0; i < ss.length; i++) {
            var s = ss[i];
            var ket = '';
            if (s.ketBukti) {
              var bag = [];
              for (var k in s.ketBukti) { if (s.ketBukti.hasOwnProperty(k)) bag.push(k + ': ' + s.ketBukti[k]); }
              ket = escapeH(bag.join(' · '));
            }
            html += '<div class="v245-baris" title="' + ket + '">' +
              '<span class="v245-arah ' + escapeH(s.arah) + '">' + escapeH(s.arah) + '</span>' +
              '<span class="v245-sim">' + escapeH(s.simbol) + '</span>' +
              '<span class="v245-bar"><i style="width:' + escapeH(Math.max(0, Math.min(100, Number(s.keyakinan) || 0))) + '%"></i></span>' +
              '<span class="v245-ang">' + escapeH(s.keyakinan) + '%</span>' +
              '<span class="v245-entry">@' + fmtHarga(s.entry) + '</span></div>';
          }
        } else if (keadaan.server) {
          html = '<div class="v245-baris"><span style="color:#a18b5d">sasaran hari ini belum diterbitkan penjaga — tunggu denyut berikutnya (maks 30 menit)</span></div>';
        }
        daftar.innerHTML = html;
      }
      var lain = q('v245-lain');
      if (lain) {
        if (keadaan.server) {
          var l2 = keadaan.server;
          var kandidat = l2.kandidatLain || [];
          var kt = '';
          for (var i2 = 0; i2 < kandidat.length; i2++) {
            kt += (i2 ? ' · ' : '') + '<b>' + escapeH(kandidat[i2].simbol) + '</b> ' + escapeH(kandidat[i2].arah) + ' ' + escapeH(kandidat[i2].keyakinan) + '%';
          }
          lain.innerHTML = 'akurasi net: ' + teksAkurasi(l2.akurasi) +
            (kt ? '<br>kandidat lain: ' + kt : '') +
            '<br><a href="' + escapeH(alamatSarang()) + 'laporan/" target="_blank" rel="noopener">dasbor laporan lengkap</a> · <a href="' + escapeH(alamatSarang()) + 'laporan/sasaran-terkini.json" target="_blank" rel="noopener">mentah JSON</a>';
        } else {
          lain.innerHTML = '';
        }
      }
      var dn = q('v245-denyut');
      if (dn) {
        var t = '';
        for (var i3 = 0; i3 < keadaan.denyut.length; i3++) {
          var d = keadaan.denyut[i3];
          t += '#' + escapeH(d.siklus) + ' · ' + String(d.waktu || '').slice(11, 19) + 'Z · ' + escapeH(d.sumber || '-') +
            ' · koin ' + escapeH(d.simbolOK) + ' · terkunci +' + escapeH(d.terkunciBaru) + ' · dinilai +' + escapeH(d.dinilaiBaru) + '\n';
        }
        dn.textContent = t || '';
      }
      var ct = q('v245-catatan');
      if (ct) {
        var dasar = 'baca publik tanpa token — evolusi rutin dikerjakan SARANG-PENJAGA di server GitHub tiap 30 menit tanpa browser; tombol tulis (hijrah/simpan/evolusi) tetap butuh token pemilik. Tujuan lengkap cyborg ini: <a href="' + escapeH(alamatSarang()) + 'TUJUAN.md" target="_blank" rel="noopener">TUJUAN.md</a>.';
        if (keadaan.server && keadaan.server.catatanJujur && keadaan.server.catatanJujur.length) {
          var cj = keadaan.server.catatanJujur;
          var gab = [];
          for (var i4 = 0; i4 < cj.length; i4++) gab.push(escapeH(cj[i4]));
          ct.innerHTML = dasar + '<br>' + gab.join('<br>'); // dasar sudah aman (teks organ + taut sah); catatanJujur server tetap di-escape
        } else {
          ct.innerHTML = dasar; // teks statis organ sendiri (aman)
        }
      }
    } catch (e) { /* render tak boleh mematikan organ */ }
  }

  // ---------------- self-test (murni, tanpa DOM/jaringan) ----------------
  function selfTest() {
    var T = [];
    var a1 = turun('ririnsherlyna-cloud.github.io', '/Micaprofita-/laporan/');
    T.push(['turun: owner+repo dari URL Pages', !!a1 && a1.owner === 'ririnsherlyna-cloud' && a1.repo === 'Micaprofita-' && a1.branch === 'main']);
    T.push(['turun: pagesUrl benar', !!a1 && a1.pagesUrl === 'https://ririnsherlyna-cloud.github.io/Micaprofita-/']);
    T.push(['turun: repo kosong (root) = null', turun('owner.github.io', '/') === null]);
    T.push(['turun: bukan github.io = null', turun('localhost', '/x/') === null && turun('', '/') === null]);
    T.push(['turun: www/pages dijaga', turun('www.github.io', '/a/') === null && turun('pages.github.io', '/a/') === null]);
    T.push(['turun: subpath dalam = repo tetap benar', (function () { var b = turun('satu.github.io', '/Dua-/laporan/denyut-server.jsonl'); return !!b && b.repo === 'Dua-'; })()]);
    T.push(['escapeH: html aman', escapeH('<b>&"\'</b>') === '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;']);
    T.push(['fmtHarga: ribuan berkoma', fmtHarga(83437.18) === '83,437.18']);
    T.push(['fmtHarga: koin kecil 6 desimal', fmtHarga(0.0000123) === '0.000012']);
    T.push(['fmtHarga: tak-sahih jujur "-"', fmtHarga(undefined) === '-' && fmtHarga(NaN) === '-']);
    T.push(['teksAkurasi: nol dinilai = jujur menunggu', teksAkurasi({ terkunci: 10, benar: 0, salah: 0 }).indexOf('belum ada yang dinilai') === 0]);
    T.push(['teksAkurasi: kosong jujur', teksAkurasi(null) === 'belum ada data akurasi']);
    var pass = 0, rincian = [];
    for (var i = 0; i < T.length; i++) { if (T[i][1]) pass++; else rincian.push(T[i][0]); }
    return { pass: pass, total: T.length, fail: T.length - pass, rincian: rincian };
  }

  // ---------------- boot (pelajaran Task 27: UI sinkron, jaringan asinkron) ----------------
  function boot() {
    sisipUI();
    try { pasangBawaan(); } catch (e) { keadaan.dipasang = { ok: false, cara: String((e && e.message) || e) }; }
    render();
    setTimeout(function () { try { bacaServer(); } catch (e) { /* fault isolation */ } }, 1200);
    // KEKUATAN 3: pulih memori + pemeriksa tubuh baru — keduanya baca publik, kini menyala tanpa token
    setTimeout(function () {
      var S = sarang();
      if (!S) return;
      try { if (typeof S.pulih === 'function') S.pulih(false).catch(function () {}); } catch (e) { /* diam */ }
      try { if (typeof S.pemeriksaVersi === 'function') S.pemeriksaVersi().catch(function () {}); } catch (e) { /* diam */ }
    }, 2600);
    keadaan._polling = setInterval(function () {
      try { bacaServer(); } catch (e) { /* diam */ }
      var S2 = sarang();
      if (S2 && typeof S2.pemeriksaVersi === 'function') { try { S2.pemeriksaVersi().catch(function () {}); } catch (e) { /* diam */ } }
    }, 600000);
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        try { if (!document.hidden) bacaServer(); } catch (e) { /* diam */ }
      });
    }
    setTimeout(function () {
      try {
        var t = selfTest();
        if (typeof console !== 'undefined') console.log('[V245 SARANG-BAWAAN] v' + V.versi + ' — terima-pasang: self-test ' + t.pass + '/' + t.total + (t.fail ? ' GAGAL: ' + t.rincian.join('; ') : ' semua PASS'), t.rincian);
      } catch (e) { /* diam */ }
    }, 1100);
  }
  boot();

  var API = {
    versi: V.versi, nama: V.nama, organ: V.organ,
    pasangBawaan: pasangBawaan, bacaServer: bacaServer, alamatSarang: alamatSarang,
    render: render, selfTest: selfTest,
    keadaan: function () {
      return {
        dipasang: keadaan.dipasang, galat: keadaan.galat, waktuBaca: keadaan.waktuBaca, jmlBaca: keadaan._jmlBaca,
        server: keadaan.server ? {
          siklus: keadaan.server.siklus, dihasilkan: keadaan.server.dihasilkan,
          rezimBTC: keadaan.server.rezimBTC, sasaranHariIni: keadaan.server.sasaranHariIni,
          akurasi: keadaan.server.akurasi, genome: keadaan.server.genome
        } : null,
        denyut: keadaan.denyut
      };
    }
  };
  window.V231_SAKTI = window.V231_SAKTI || {};
  window.V231_SAKTI.SASARAN = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
/*V245-SARANG-BAWAAN:END*/
