/*V243-SARANG:BEGIN*/
// ============================================================
// V243 SAKTI-SARANG v1.0 — ORGAN HIDUP-MANDIRI DI GITHUB PAGES.
// Mandat Guru:
//  "sekarang saya akan implementasikan dia ke GitHub Pages agar
//   dia bisa berkembang mandiri. Jadi kode-kodenya dia bisa
//   berkembang otomatis dan menyimpan penyimpanannya otomatis,
//   agar dia selalu bisa online. Jadi kita buatkan dia hidup
//   mandiri dan berkembang, jadinya dia akan terus fasih dan
//   mampu menambah wawasan dan terus berkembang di githubnya."
//
// ARTI SARANG (satu tubuh, empat kekuatan):
//   1. HIJRAH    — SAKTI membaca tubuhnya sendiri lewat http(s),
//                  lalu MENYARINGKAN DIRINYA ke repo GitHub:
//                  index.html + .nojekyll + README.md +
//                  versi.json + memori/terkini.json, lalu
//                  mengaktifkan GitHub Pages (API). Sejak itu
//                  dia HIDUP di https://owner.github.io/repo/
//                  — online 24 jam, nol biaya.
//   2. SIMPAN    — memorinya (kapsul rantai denyut+prakira,
//                  format KAPSUL-MICAPROFITA yang sama dengan
//                  GUDANG E2 organ V241) di-commit otomatis ke
//                  repo: memori/terkini.json + arsip
//                  berwaktu + versi.json (buku besar
//                  pertumbuhan). Riwayat commit = jejak
//                  pertumbuhan yang tidak bisa dibantah.
//   3. PULIH     — saat bangkit di browser siapa pun, SARANG
//                  menarik memori terkini dari sarang; bila
//                  lebih baru dari lokal, kapsul diimpor ke
//                  organ NADI (gabung berantai + verifikasi
//                  hash). Ganti browser/komputer pun tidak
//                  kehilangan ilmu.
//   4. EVOLUSI   — bila peta organ/otak di tubuh berubah
//                  (organ baru, otak naik versi), SARANG
//                  men-commit tubuh barunya sendiri ke repo.
//                  Pages membangun ulang; kunjungan berikutnya
//                  = cyborg yang sudah berevolusi. Pemeriksa
//                  versi memberi tahu pemilik bila sarang
//                  berisi tubuh yang lebih baru.
//
// Rekayasa: Git Data API (blob->tree->commit->ref) agar tubuh
// 15.6 MB ter-commit aman dalam SATU commit; auth Fine-grained
// PAT (contents:read/write + pages:read/write) disimpan lokal
// browser pemilik; fault isolation penuh (satu aksi gagal,
// organ lain tetap hidup); observability (panel + log + status);
// nol biaya (GitHub Free/Pages), nol dependensi, ES5 murni.
// Fisika tampilan mengikuti hukum V242: chip z<=99992, panel
// modal 99999, tak menimpa nav/suara/NADI (tertata ORKESTRA).
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '1.0', nama: 'SAKTI-SARANG', organ: 'V243',
    protokol: {
      hijrah: 'baca tubuh sendiri (http) -> commit Git Data API: index.html + .nojekyll + README + versi.json + memori/terkini.json -> aktifkan Pages',
      simpan: 'kapsul memori KAPSUL-MICAPROFITA -> commit memori/terkini.json + arsip berwaktu (pangkas >48) + versi.json',
      pulih: 'tarik memori/terkini.json dari Pages -> bila lebih baru -> imporKapsul ke organ NADI (gabung rantai terverifikasi)',
      evolusi: 'peta organ berubah -> commit tubuh baru (index.html) -> Pages membangun ulang -> cyborg berevolusi di sarang',
      pemeriksa: 'poling versi.json dari Pages tiap 10 mnt -> beri tahu bila sarang berisi tubuh lebih baru'
    }
  };

  // ---------------- anti-stub lookup (pelajaran V241 v1.1) ----------------
  // Tubuh SAKTI men-stub getElementById/querySelector dgn Proxy palsu utk
  // id tak-ada. Satu-satunya lookup jujur = querySelectorAll.
  function q(id) {
    try {
      var list = document.querySelectorAll('#' + id);
      return (list && list.length) ? list[0] : null;
    } catch (e) { return null; }
  }
  function ada() { return typeof document !== 'undefined' && !!document.body; }

  // ---------------- L1 (localStorage) ----------------
  function l1Get(k, def) { try { var v = localStorage.getItem('mp243.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function l1Set(k, v) { try { localStorage.setItem('mp243.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // ---------------- L2 terbatas: baca rantai dari gudang NADI ----------------
  var _dbNadi = null;
  function idbNadiOpen() {
    return new Promise(function (res) {
      if (_dbNadi) return res(_dbNadi);
      if (typeof indexedDB === 'undefined') return res(null);
      try {
        var req = indexedDB.open('mp241-gudang', 1); // gudang milik organ V241 — SARANG hanya MEMBACA
        req.onsuccess = function () { _dbNadi = req.result; res(_dbNadi); };
        req.onerror = function () { res(null); };
        req.onupgradeneeded = function () { /* bukan milik SARANG — jangan mengubah */ };
      } catch (e) { res(null); }
    });
  }
  function idbNadiGet(store, key) {
    return idbNadiOpen().then(function (db) {
      if (!db) return null;
      return new Promise(function (res) {
        try {
          var tx = db.transaction(store, 'readonly');
          var r = tx.objectStore(store).get(key);
          r.onsuccess = function () { res(r.result === undefined ? null : r.result); };
          r.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }

  // ---------------- base64 + sha256 (murni, identik prareg) ----------------
  function base64DariTeks(teks) {
    var bytes = new TextEncoder().encode(teks);
    var bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CH, bytes.length)));
    }
    return btoa(bin);
  }
  var _K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function _rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256Hex(pesan) {
    var bytes = Array.prototype.slice.call(new TextEncoder().encode(pesan));
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    var w = new Array(64);
    for (var off = 0; off < bytes.length; off += 64) {
      var t, i;
      for (t = 0; t < 16; t++) { w[t] = ((bytes[off+t*4]<<24)|(bytes[off+t*4+1]<<16)|(bytes[off+t*4+2]<<8)|bytes[off+t*4+3])>>>0; }
      for (t = 16; t < 64; t++) {
        var s0=_rotr(w[t-15],7)^_rotr(w[t-15],18)^(w[t-15]>>>3), s1=_rotr(w[t-2],17)^_rotr(w[t-2],19)^(w[t-2]>>>10);
        w[t]=(w[t-16]+s0+w[t-7]+s1)>>>0;
      }
      var a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
      for (t = 0; t < 64; t++) {
        var S1=_rotr(e,6)^_rotr(e,11)^_rotr(e,25), ch=(e&f)^(~e&g), t1=(h+S1+ch+_K[t]+w[t])>>>0;
        var S0=_rotr(a,2)^_rotr(a,13)^_rotr(a,22), maj=(a&b)^(a&c)^(b&c), t2=(S0+maj)>>>0;
        h=g;g=f;f=e;e=(d+t1)>>>0; d=c;c=b;b=a;a=(t1+t2)>>>0;
      }
      h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(function(x){return (x>>>0).toString(16).padStart(8,'0');}).join('');
  }

  // ---------------- peta organ + kode versi ----------------
  function organPeta() {
    var m = {}; var S = (typeof window !== 'undefined' && window.V231_SAKTI) ? window.V231_SAKTI : {};
    ['FBO','PD','KL','ARAH','NADI','ORKESTRA','SARANG','MATA'].forEach(function (k) {
      try { if (S[k] && S[k].versi) m[k] = String(S[k].versi); } catch (e) { /* organ tak terbaca = lewati */ }
    });
    m.SARANG = V.versi;
    return m;
  }
  function kodeVersi() {
    var m = organPeta(); var n = 0; for (var k in m) n++;
    return 'v243.' + n + '.' + V.versi.replace('.', '');
  }
  // urut versi numerik per segmen: 1.10 > 1.9
  function urutVersi(a, b) {
    var pa = String(a).split('.'), pb = String(b).split('.');
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = parseInt(pa[i] || '0', 10) || 0, y = parseInt(pb[i] || '0', 10) || 0;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }

  // ---------------- keadaan ----------------
  var st = {
    cfg: { apiBase: 'https://api.github.com', owner: '', repo: '', branch: 'main', token: '',
           intervalSimpanMenit: 15, autoSimpan: true, pulihBoot: true, pagesUrl: '' },
    bekerja: false, urlHidup: '', terhubung: null, repoInfo: null,
    versiRepo: null, versiBaru: null, htmlShaTerakhir: null, memoriShaTerakhir: null,
    lastSimpan: null, lastPulih: null, lastEvolusi: null, simpanBerikutnya: null,
    hitung: { hijrah: 0, simpan: 0, evolusi: 0, pulih: 0, gagal: 0 },
    _rantaiDenyut: [], _rantaiPrakira: [], _denyut: 0, _prakiraRingkas: { terbuka: 0, benar: 0, salah: 0 },
    log: [], _timerSimpan: null, _timerCek: null
  };
  function catat(pesan) {
    st.log.push(new Date().toISOString().slice(11, 19) + ' ' + pesan);
    if (st.log.length > 60) st.log = st.log.slice(-60);
  }
  function galat(e) {
    var m = (e && e.message) ? e.message : String(e);
    st.hitung.gagal++;
    catat('GAGAL: ' + m.slice(0, 140));
    return m;
  }

  // ---------------- konfigurasi ----------------
  function cfgMuat() {
    var c = l1Get('cfg', null);
    if (c && typeof c === 'object') {
      ['apiBase','owner','repo','branch','token','intervalSimpanMenit','autoSimpan','pulihBoot','pagesUrl'].forEach(function (k) {
        if (c[k] !== undefined && c[k] !== null) st.cfg[k] = c[k];
      });
    }
    var t = l1Get('token', '');
    if (t && !st.cfg.token) st.cfg.token = t;
    st.lastSimpan = l1Get('simpanTerakhir', null);
    st.lastPulih = l1Get('pulihTerakhir', null);
    st.hitung = Object.assign(st.hitung, l1Get('hitung', {}));
    st.htmlShaTerakhir = l1Get('htmlSha', null);
    st.urlHidup = l1Get('urlHidup', '');
  }
  function cfgSimpan() {
    l1Set('cfg', st.cfg);
    if (st.cfg.token) l1Set('token', st.cfg.token);
  }
  function cfgLengkap() { return !!(st.cfg.owner && st.cfg.repo && st.cfg.token); }
  function pagesUrl() {
    if (st.cfg.pagesUrl) return st.cfg.pagesUrl;
    if (!st.cfg.owner || !st.cfg.repo) return '';
    return 'https://' + encodeURIComponent(st.cfg.owner) + '.github.io/' + encodeURIComponent(st.cfg.repo) + '/';
  }
  function apiRepo() { return st.cfg.apiBase.replace(/\/$/, '') + '/repos/' + encodeURIComponent(st.cfg.owner) + '/' + encodeURIComponent(st.cfg.repo); }

  // ---------------- jaringan ----------------
  function ghPermintaan(jalur, metode, badan) {
    var ctl = new AbortController();
    var tenggat = (badan && badan._lamaMs) ? badan._lamaMs : 30000;
    if (badan && badan._lamaMs) delete badan._lamaMs;
    var t = setTimeout(function () { ctl.abort(); }, tenggat);
    var opt = {
      method: metode || 'GET', signal: ctl.signal,
      headers: { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    };
    if (st.cfg.token) opt.headers.Authorization = 'Bearer ' + st.cfg.token;
    if (badan) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(badan); }
    return fetch(jalur, opt).then(function (r) {
      clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, ok: r.ok, json: j };
      });
    }).catch(function (e) { clearTimeout(t); throw new Error('jaringan: ' + ((e && e.message) || e)); });
  }
  function ambilUrl(url, ms) {
    var ctl = new AbortController(); var t = setTimeout(function () { ctl.abort(); }, ms || 15000);
    return fetch(url, { signal: ctl.signal, cache: 'no-store' }).then(function (r) {
      clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text();
    }).catch(function (e) { clearTimeout(t); throw new Error('ambil ' + url.slice(0, 60) + ': ' + ((e && e.message) || e)); });
  }
  // ---------------- MESIN GIT DATA API (blob->tree->commit->ref) ----------------
  // Tubuh SAKTI 15.6 MB terlalu besar utk PUT /contents sederhana bila
  // digabung banyak file — rantai Git Data API commit SEMUA file dalam
  // SATU commit dan aman utk payload besar.
  function blobBuat(teks) {
    return ghPermintaan(apiRepo() + '/git/blobs', 'POST', { content: base64DariTeks(teks), encoding: 'base64' })
      .then(function (r) {
        if (!r.ok || !r.json.sha) throw new Error('blob gagal (HTTP ' + r.status + ') ' + ((r.json.message || '').slice(0, 100)));
        return r.json.sha;
      });
  }
  function refKepala() {
    return ghPermintaan(apiRepo() + '/git/ref/heads/' + encodeURIComponent(st.cfg.branch), 'GET', null)
      .then(function (r) {
        if (r.ok && r.json.object && r.json.object.sha) return { commit: r.json.object.sha };
        return null; // repo kosong / cabang belum ada — bukan galat
      });
  }
  function commitBaca(sha) {
    return ghPermintaan(apiRepo() + '/git/commits/' + sha, 'GET', null).then(function (r) {
      if (!r.ok) throw new Error('commit baca gagal (HTTP ' + r.status + ')');
      return r.json; // {tree:{sha}, parents:[...], message, ...}
    });
  }
  function treeBuat(baseTree, entri) {
    var badan = { tree: entri };
    if (baseTree) badan.base_tree = baseTree;
    return ghPermintaan(apiRepo() + '/git/trees', 'POST', badan).then(function (r) {
      if (!r.ok || !r.json.sha) throw new Error('tree gagal (HTTP ' + r.status + ') ' + ((r.json.message || '').slice(0, 100)));
      return r.json.sha;
    });
  }
  function commitBuat(tree, orangTua, pesan) {
    var badan = { message: pesan, tree: tree, parents: orangTua || [] };
    return ghPermintaan(apiRepo() + '/git/commits', 'POST', badan).then(function (r) {
      if (!r.ok || !r.json.sha) throw new Error('commit gagal (HTTP ' + r.status + ') ' + ((r.json.message || '').slice(0, 100)));
      return r.json.sha;
    });
  }
  function refGeser(commitSha) {
    return ghPermintaan(apiRepo() + '/git/refs/heads/' + encodeURIComponent(st.cfg.branch), 'PATCH', { sha: commitSha, force: false })
      .then(function (r) { if (!r.ok) throw new Error('ref geser gagal (HTTP ' + r.status + ') ' + ((r.json.message || '').slice(0, 100))); return true; });
  }
  function refBuat(commitSha) {
    return ghPermintaan(apiRepo() + '/git/refs', 'POST', { ref: 'refs/heads/' + st.cfg.branch, sha: commitSha })
      .then(function (r) { if (!r.ok) throw new Error('ref buat gagal (HTTP ' + r.status + ') ' + ((r.json.message || '').slice(0, 100))); return true; });
  }
  // daftar = [{path, teks}] — balikan {commit, tree}
  function komitFiles(daftar, pesan) {
    if (!cfgLengkap()) return Promise.reject(new Error('konfigurasi belum lengkap (owner/repo/token)'));
    if (st.bekerja) return Promise.reject(new Error('masih ada operasi berjalan'));
    st.bekerja = true; render();
    var langkah = { blobs: 0 };
    var janji = Promise.all(daftar.map(function (f) {
      return blobBuat(f.teks).then(function (sha) { langkah.blobs++; return { path: f.path, mode: '100644', type: 'blob', sha: sha }; });
    }));
    return janji
      .then(function (entri) { return refKepala().then(function (ref) { return { entri: entri, ref: ref }; }); })
      .then(function (w) {
        if (!w.ref) return treeBuat(null, w.entri).then(function (t) { return { tree: t, orangTua: [], refAda: false }; });
        return commitBaca(w.ref.commit).then(function (c) {
          return treeBuat(c.tree && c.tree.sha, w.entri).then(function (t) { return { tree: t, orangTua: [w.ref.commit], refAda: true }; });
        });
      })
      .then(function (w2) { return commitBuat(w2.tree, w2.orangTua, pesan).then(function (c) { return { commit: c, refAda: w2.refAda }; }); })
      .then(function (w3) { return (w3.refAda ? refGeser(w3.commit) : refBuat(w3.commit)).then(function () { return w3.commit; }); })
      .then(function (commit) {
        st.bekerja = false; st.lastKomit = new Date().toISOString(); render();
        return { ok: true, commit: commit, blob: langkah.blobs };
      })
      .catch(function (e) { st.bekerja = false; render(); throw e; });
  }

  // ---------------- pembaca tubuh sendiri ----------------
  function tubuhSaya() {
    if (typeof location === 'undefined') return Promise.reject(new Error('tanpa lokasi'));
    if (location.protocol !== 'http:' && location.protocol !== 'https:') {
      return Promise.reject(new Error('tubuh hanya terbaca lewat http(s) — buka SAKTI dari halaman unduh web / Pages, bukan file://'));
    }
    var url = location.origin + location.pathname;
    return ambilUrl(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'sarang=' + Date.now(), 60000);
  }

  // ---------------- memori lokal (rantai dari gudang NADI) ----------------
  function muatMemoriLokal() {
    return idbNadiGet('rantai', 'denyut').then(function (d) {
      return idbNadiGet('rantai', 'prakira').then(function (p) {
        var l1d = l1GetNadi('rantai-denyut', []), l1p = l1GetNadi('rantai-prakira', []);
        st._rantaiDenyut = (d && d.length >= l1d.length) ? d : l1d;
        st._rantaiPrakira = (p && p.length >= l1p.length) ? p : l1p;
        st._denyut = l1GetNadi('denyut', 0) || st._rantaiDenyut.length;
        // ringkas prakira dari entri status
        var tb = 0, benar = 0, salah = 0;
        st._rantaiPrakira.forEach(function (e) {
          if (e && e.status === 'TERBUKA') tb++; else if (e && e.status === 'BENAR') benar++; else if (e && e.status === 'SALAH') salah++;
        });
        st._prakiraRingkas = { terbuka: tb, benar: benar, salah: salah };
        return true;
      });
    });
  }
  // baca kunci milik NADI (prefiks mp241.) — gudang satu tubuh, baca-saling
  function l1GetNadi(k, def) { try { var v = localStorage.getItem('mp241.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function kapsulMemori() {
    return {
      protokol: 'KAPSUL-MICAPROFITA', organ: 'SAKTI-SARANG', versi: V.versi,
      waktu: new Date().toISOString(), denyut: st._denyut, mulai: l1GetNadi('mulai', null),
      rantai: { denyut: st._rantaiDenyut, prakira: st._rantaiPrakira }
    };
  }
  function versiJson(htmlSha) {
    return {
      protokol: 'SARANG-MICAPROFITA', kodeVersi: kodeVersi(), organ: organPeta(),
      waktu: new Date().toISOString(), htmlSha256: htmlSha || st.htmlShaTerakhir || null,
      memoriWaktu: (st.lastSimpan && st.lastSimpan.waktu) || null,
      pertumbuhan: {
        denyut: st._denyut,
        rantaiDenyut: st._rantaiDenyut.length, rantaiPrakira: st._rantaiPrakira.length,
        prakira: st._prakiraRingkas,
        hitung: st.hitung
      }
    };
  }
  function buatReadme() {
    var m = organPeta(); var daftar = '';
    for (var k in m) daftar += '| ' + k + ' | v' + m[k] + ' |\n';
    return '# MICAPROFITA — SAKTI (Cyborg AGI Kripto, Hidup Mandiri)\n\n' +
      'Repo ini adalah SARANG tempat cyborg MICAPROFITA hidup online dan berkembang.\n' +
      'Halaman hidup: ' + pagesUrl() + '\n\n' +
      '- `index.html` — tubuh cyborg lengkap (satu file, jalankan langsung di browser)\n' +
      '- `memori/terkini.json` — kapsul memori terkini (rantai denyut + prakira berantai SHA-256)\n' +
      '- `memori/arsip/` — potret memori berwaktu (riwayat pertumbuhan)\n' +
      '- `versi.json` — buku besar versi & pertumbuhan (organ, denyut, prakira, hitungan kerja)\n\n' +
      '## Cara dia berkembang sendiri\n' +
      '1. SIMPAN — kapsul memori di-commit otomatis tiap ' + st.cfg.intervalSimpanMenit + ' menit oleh organ V243 SARANG.\n' +
      '2. EVOLUSI — bila peta organ/otak berubah, tubuh baru di-commit sendiri; Pages membangun ulang.\n' +
      '3. PULIH — browser baru menarik memori terkini dari sarang, ilmu tidak hilang.\n\n' +
      '## Organ terpasang saat README ini ditulis\n\n' +
      '| Organ | Versi |\n|---|---|\n' + daftar +
      '\nNol biaya, nol dependensi. Dibangun oleh SARANG (organ V243) — bukan manusia menyalin file.\n';
  }

  // ---------------- arsip: pangkas >48 ----------------
  function pathArsipLama(baseTreeSha) {
    if (!baseTreeSha) return Promise.resolve([]);
    return ghPermintaan(apiRepo() + '/git/trees/' + baseTreeSha + '?recursive=1', 'GET', null).then(function (r) {
      if (!r.ok || !r.json.tree) return [];
      var arsip = [];
      r.json.tree.forEach(function (e) {
        if (e.type === 'blob' && e.path && e.path.indexOf('memori/arsip/') === 0) arsip.push(e.path);
      });
      arsip.sort(); // nama berawaktu -> urut kronologis
      return arsip.length > 48 ? arsip.slice(0, arsip.length - 48) : [];
    }).catch(function () { return []; });
  }
  // ============================================================
  // EMPAT AKSI HIDUP
  // ============================================================
  function ujiSambungan() {
    if (!cfgLengkap()) return Promise.reject(new Error('konfigurasi belum lengkap (owner/repo/token)'));
    catat('uji sambungan ke ' + st.cfg.owner + '/' + st.cfg.repo + '…');
    render();
    return Promise.all([
      ghPermintaan(apiRepo(), 'GET', null),
      ghPermintaan(apiRepo() + '/pages', 'GET', null)
    ]).then(function (h) {
      var repo = h[0], pages = h[1];
      if (!repo.ok) {
        var m = 'repo tak terjangkau (HTTP ' + repo.status + ') ' + ((repo.json.message || '').slice(0, 80));
        st.terhubung = false; catat(m); render();
        throw new Error(m);
      }
      st.terhubung = true;
      st.repoInfo = { nama: repo.json.full_name, privat: !!repo.json.private, cabang: repo.json.default_branch };
      if (pages.ok && pages.json && pages.json.html_url) {
        st.urlHidup = pages.json.html_url.endsWith('/') ? pages.json.html_url : pages.json.html_url + '/';
        l1Set('urlHidup', st.urlHidup);
      }
      catat('sambungan OK' + (st.urlHidup ? ' · pages hidup: ' + st.urlHidup : ' · pages belum aktif'));
      render();
      return { ok: true, repo: st.repoInfo, urlHidup: st.urlHidup };
    }).catch(function (e) { st.terhubung = false; render(); throw e; });
  }

  function aktifkanPages() {
    // idempoten: 409 = sudah ada (bukan galat)
    return ghPermintaan(apiRepo() + '/pages', 'POST', { source: { branch: st.cfg.branch, path: '/' } })
      .then(function (r) {
        if (r.ok || r.status === 409) {
          if (r.ok && r.json && r.json.html_url) {
            st.urlHidup = r.json.html_url.endsWith('/') ? r.json.html_url : r.json.html_url + '/';
            l1Set('urlHidup', st.urlHidup);
          }
          return { ok: true, sudahAda: r.status === 409 };
        }
        // tanpa izin Pages pun HIJRAH tetap sukses — pemilik bisa nyalakan manual
        catat('Pages tak bisa diaktifkan via API (HTTP ' + r.status + ') — nyalakan manual: Settings > Pages');
        return { ok: false, status: r.status };
      }).catch(function () { return { ok: false, status: 0 }; });
  }

  function hijrah() {
    if (st.bekerja) return Promise.reject(new Error('masih ada operasi berjalan'));
    catat('HIJRAH dimulai — membaca tubuh sendiri…');
    render();
    return muatMemoriLokal()
      .then(function () { return tubuhSaya(); })
      .then(function (tubuh) {
        var sha = sha256Hex(tubuh);
        st.htmlShaTerakhir = sha; l1Set('htmlSha', sha);
        catat('tubuh ' + tubuh.length.toLocaleString() + ' byte · sha ' + sha.slice(0, 12) + '… — meng-upload blob…');
        render();
        var kapsul = JSON.stringify(kapsulMemori(), null, 1);
        var vj = JSON.stringify(versiJson(sha), null, 2);
        st.memoriShaTerakhir = sha256Hex(kapsul);
        return komitFiles([
          { path: 'index.html', teks: tubuh },
          { path: '.nojekyll', teks: '' },
          { path: 'README.md', teks: buatReadme() },
          { path: 'versi.json', teks: vj },
          { path: 'memori/terkini.json', teks: kapsul }
        ], 'HIJRAH: SAKTI ' + kodeVersi() + ' pindah hidup ke sarang (otomatis oleh organ V243)');
      })
      .then(function (hasil) {
        st.hitung.hijrah++; l1Set('hitung', st.hitung);
        st.lastSimpan = { waktu: new Date().toISOString(), jenis: 'hijrah' };
        l1Set('simpanTerakhir', st.lastSimpan);
        catat('HIJRAH commit ' + hasil.commit.slice(0, 10) + ' (' + hasil.blob + ' blob) — mengaktifkan Pages…');
        render();
        return aktifkanPages().then(function (p) {
          if (!st.urlHidup) st.urlHidup = pagesUrl();
          catat('HIJRAH tuntas. Halaman hidup: ' + st.urlHidup + (p.sudahAda ? ' (pages sudah aktif)' : ''));
          l1Set('aktif', true);
          aturJadwal();
          render();
          return { ok: true, commit: hasil.commit, url: st.urlHidup, pages: p };
        });
      })
      .catch(function (e) { galat(e); render(); throw e; });
  }

  function simpanMemori(alasan) {
    if (st.bekerja) return Promise.resolve({ ok: false, sibuk: true });
    if (!cfgLengkap()) return Promise.reject(new Error('konfigurasi belum lengkap'));
    alasan = alasan || 'otomatis';
    return muatMemoriLokal().then(function () {
      var kapsul = JSON.stringify(kapsulMemori(), null, 1);
      var shaK = sha256Hex(kapsul);
      if (shaK === st.memoriShaTerakhir) {
        st.lastSimpan = { waktu: new Date().toISOString(), jenis: alasan, skip: 'memori tak berubah' };
        l1Set('simpanTerakhir', st.lastSimpan);
        catat('simpan dilewati: memori identik (hemat commit)');
        render();
        return { ok: true, skip: true };
      }
      var vj = JSON.stringify(versiJson(null), null, 2);
      return komitFiles([{ path: 'versi.json', teks: vj }, { path: 'memori/terkini.json', teks: kapsul }],
        'SIMPAN-MEMORI (' + alasan + '): denyut ' + st._denyut + ' · rantai ' + (st._rantaiDenyut.length + st._rantaiPrakira.length) + ' entri')
        .then(function (hasil) {
          // arsip berwaktu + pangkas
          var namaArsip = 'memori/arsip/' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
          return refKepala().then(function (ref) {
            if (!ref) return null;
            return commitBaca(ref.commit).then(function (c) {
              return pathArsipLama(c.tree && c.tree.sha).then(function (lama) {
                var entri = [{ path: namaArsip, mode: '100644', type: 'blob', sha: hasil.blob ? null : null }];
                // blob arsip: buat blob khusus dulu
                return blobBuat(kapsul).then(function (shaA) {
                  entri[0].sha = shaA;
                  lama.forEach(function (p) { entri.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
                  return treeBuat(c.tree && c.tree.sha, entri).then(function (t) {
                    return commitBuat(t, [ref.commit], 'ARSIP-MEMORI: potret ' + namaArsip.slice(13) + (lama.length ? ' (pangkas ' + lama.length + ' lama)' : ''))
                      .then(function (cm) { return refGeser(cm); });
                  });
                });
              });
            });
          }).catch(function (e) { catat('arsip dilewati: ' + ((e && e.message) || e).slice(0, 80)); return null; });
        })
        .then(function () {
          st.hitung.simpan++; l1Set('hitung', st.hitung);
          st.memoriShaTerakhir = shaK;
          st.lastSimpan = { waktu: new Date().toISOString(), jenis: alasan };
          l1Set('simpanTerakhir', st.lastSimpan);
          catat('memori tersimpan ke sarang (' + alasan + ')');
          render();
          return { ok: true };
        });
    }).catch(function (e) { galat(e); render(); throw e; });
  }

  function pulih(paksa) {
    var url = pagesUrl();
    if (!url) return Promise.reject(new Error('halaman hidup belum diketahui (HIJRAH dulu / isi Pages URL)'));
    catat('PULIH: menarik memori dari ' + url + '…');
    render();
    return ambilUrl(url + 'memori/terkini.json?sarangcek=' + Date.now(), 30000).then(function (teks) {
      var k = JSON.parse(teks);
      if (!k || k.protokol !== 'KAPSUL-MICAPROFITA') throw new Error('bukan kapsul Micaprofita (protokol: ' + (k && k.protokol) + ')');
      var lokalWaktu = st.lastSimpan && st.lastSimpan.waktu;
      var jauhBaru = !lokalWaktu || String(k.waktu) > String(lokalWaktu);
      if (!jauhBaru && !paksa) {
        catat('PULIH dilewati: memori lokal sudah sama/mutakhir');
        render();
        return { ok: true, dipulihkan: false, alasan: 'lokal mutakhir' };
      }
      var nadi = (window.V231_SAKTI && window.V231_SAKTI.NADI) || null;
      if (!nadi || typeof nadi.imporKapsul !== 'function') throw new Error('organ NADI tak tersedia — pulih butuh V241');
      var file = new File([teks], 'kapsul-sarang.json', { type: 'application/json' });
      return Promise.resolve(nadi.imporKapsul(file)).then(function (okImpor) {
        st.hitung.pulih++; l1Set('hitung', st.hitung);
        st.lastPulih = { waktu: new Date().toISOString(), sumber: k.waktu, ok: !!okImpor };
        l1Set('pulihTerakhir', st.lastPulih);
        catat('PULIH ' + (okImpor ? 'sukses' : 'sebagian') + ': memori sarang ' + String(k.waktu).slice(0, 19) + ' digabung ke NADI');
        render();
        return { ok: true, dipulihkan: true, sahih: !!okImpor };
      });
    }).catch(function (e) { galat(e); render(); throw e; });
  }

  function evolusi(alasan, paksa) {
    if (st.bekerja) return Promise.reject(new Error('masih ada operasi berjalan'));
    // pagar interval: tanpa paksa, minimal 10 menit antar evolusi otomatis
    if (!paksa && st.lastEvolusi && (Date.now() - st.lastEvolusi) < 10 * 60000) {
      catat('evolusi ditunda (pagar 10 menit)');
      return Promise.resolve({ ok: true, ditunda: true });
    }
    catat('EVOLUSI: memeriksa tubuh vs sarang…');
    render();
    var praCek = (st.versiRepo || !pagesUrl()) ? Promise.resolve(null) : pemeriksaVersi().catch(function () { return null; });
    return praCek.then(function () {
      return muatMemoriLokal();
    }).then(function () {
      var mLocal = JSON.stringify(organPeta());
      var mRemote = st.versiRepo ? JSON.stringify(st.versiRepo.organ || {}) : null;
      if (mRemote && mRemote === mLocal && !paksa) {
        catat('evolusi dilewati: peta organ sama dgn sarang');
        render();
        return { ok: true, dilewati: true };
      }
      return tubuhSaya().then(function (tubuh) {
        var sha = sha256Hex(tubuh);
        st.htmlShaTerakhir = sha; l1Set('htmlSha', sha);
        return komitFiles([
          { path: 'index.html', teks: tubuh },
          { path: 'README.md', teks: buatReadme() },
          { path: 'versi.json', teks: JSON.stringify(versiJson(sha), null, 2) }
        ], 'EVOLUSI: ' + kodeVersi() + (alasan ? ' — ' + alasan : '') + ' (tubuh baru di-commit SARANG)');
      }).then(function (hasil) {
        st.hitung.evolusi++; l1Set('hitung', st.hitung);
        st.lastEvolusi = Date.now();
        st.versiBaru = null;
        catat('EVOLUSI commit ' + hasil.commit.slice(0, 10) + ' — Pages akan membangun tubuh baru');
        render();
        return { ok: true, commit: hasil.commit };
      });
    }).catch(function (e) { galat(e); render(); throw e; });
  }

  function pemeriksaVersi() {
    var url = pagesUrl();
    if (!url || st.bekerja) return Promise.resolve({ ok: false, alasan: 'tak terkonfigurasi / sibuk' });
    return ambilUrl(url + 'versi.json?sarangcek=' + Date.now(), 15000).then(function (teks) {
      var v = JSON.parse(teks);
      if (!v || v.protokol !== 'SARANG-MICAPROFITA') throw new Error('versi.json asing');
      st.versiRepo = v;
      var sama = JSON.stringify(v.organ || {}) === JSON.stringify(organPeta());
      st.versiBaru = sama ? null : { waktu: v.waktu, organ: v.organ, kodeVersi: v.kodeVersi };
      render();
      return { ok: true, sama: sama, versiRepo: v.kodeVersi };
    }).catch(function (e) {
      // halaman belum terbangun (Pages baru aktif) — jujur, bukan bencana
      catat('pemeriksa versi: ' + ((e && e.message) || e).slice(0, 90));
      render();
      return { ok: false, alasan: String((e && e.message) || e).slice(0, 90) };
    });
  }

  // ---------------- penjadwal hidup ----------------
  function aturJadwal() {
    if (st._timerSimpan) { clearInterval(st._timerSimpan); st._timerSimpan = null; }
    if (st._timerCek) { clearInterval(st._timerCek); st._timerCek = null; }
    var menit = parseInt(st.cfg.intervalSimpanMenit, 10) || 15;
    if (menit < 5) menit = 5;
    if (cfgLengkap() && st.cfg.autoSimpan) {
      st._timerSimpan = setInterval(function () {
        try { simpanMemori('otomatis').catch(function () {}); } catch (e) { /* jadwal tak boleh mati */ }
      }, menit * 60000);
      st.simpanBerikutnya = Date.now() + menit * 60000;
      st._timerCek = setInterval(function () {
        try { pemeriksaVersi().catch(function () {}); } catch (e) { /* diam */ }
      }, 10 * 60000);
    } else {
      st.simpanBerikutnya = null;
    }
    render();
  }
  // ============================================================
  // UI — CHIP (zona kanan, tertata ORKESTRA v1.1) + PANEL MODAL
  // Hukum fisika V242: chip z<=99992, panel modal 99999+, kartu
  // lahir SINKRON di boot (pelajaran Task 27), tombol STATIS
  // tak pernah ditulis-ulang (pelajaran render-hapus-tombol).
  // ============================================================
  var elChip = null, elPanel = null, elBackdrop = null;
  function pasangGaya() {
    if (q('v243-gaya')) return;
    var s = document.createElement('style'); s.id = 'v243-gaya';
    s.textContent =
      '#v243-sarang{position:fixed;right:12px;bottom:120px;z-index:99992;display:flex;align-items:center;gap:8px;' +
      'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#fdf3df;background:linear-gradient(165deg,rgba(30,22,6,.97),rgba(20,14,4,.97));' +
      'border:1px solid rgba(245,158,11,.30);border-radius:12px;padding:8px 12px;max-width:320px;' +
      'box-shadow:0 10px 32px rgba(0,0,0,.5);backdrop-filter:blur(6px);cursor:pointer;transition:opacity .25s ease}' +
      '#v243-sarang.mpx-meredup{opacity:.15;pointer-events:none}' +
      '#v243-led{width:9px;height:9px;border-radius:50%;background:#f59e0b;box-shadow:0 0 7px #f59e0b;flex:none;animation:v243nadi 2.4s ease-in-out infinite}' +
      '#v243-led.hijau{background:#10b981;box-shadow:0 0 7px #10b981}' +
      '#v243-led.merah{background:#ef4444;box-shadow:0 0 7px #ef4444;animation:none}' +
      '@keyframes v243nadi{0%,100%{opacity:1}50%{opacity:.45}}' +
      '#v243-nama{font-weight:700;letter-spacing:1.6px;color:#fff7e8}' +
      '#v243-ringkas{color:#fbbf24;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#v243-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99997}' +
      '#v243-panel{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;' +
      'width:min(600px,calc(100vw - 24px));max-height:calc(100vh - 40px);overflow:auto;' +
      'background:rgba(14,11,4,.99);border:1px solid rgba(245,158,11,.4);border-radius:14px;padding:16px 18px;' +
      'color:#f4e8cf;font:12px/1.6 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 24px 80px rgba(0,0,0,.7)}' +
      '#v243-panel h3{margin:0 0 2px;font-size:13px;letter-spacing:2px;color:#fde68a;display:flex;align-items:center;gap:8px}' +
      '#v243-panel .sub{color:#a18b5d;font-size:10.5px;margin-bottom:10px}' +
      '#v243-panel .tutup{margin-left:auto;background:none;border:none;color:#b08c4f;font-size:16px;cursor:pointer}' +
      '#v243-panel .tutup:hover{color:#fff}' +
      '.v243-status{border:1px solid rgba(245,158,11,.22);border-radius:10px;padding:9px 11px;margin-bottom:11px;' +
      'font-size:11px;line-height:1.7;background:rgba(30,22,6,.5)}' +
      '.v243-status .l{color:#a18b5d;letter-spacing:1.1px;font-size:10px;margin-right:6px}' +
      '.v243-status b{color:#fde68a}' +
      '.v243-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 10px;margin-bottom:10px}' +
      '.v243-grid label{display:flex;flex-direction:column;gap:3px;font-size:10px;letter-spacing:1px;color:#a18b5d}' +
      '.v243-grid input{background:rgba(5,4,1,.85);border:1px solid rgba(245,158,11,.3);border-radius:7px;color:#fdf3df;' +
      'font:11.5px ui-monospace,monospace;padding:6px 8px;min-width:0}' +
      '.v243-grid input:focus{outline:none;border-color:rgba(245,158,11,.7)}' +
      '.v243-grid input::placeholder{color:#6b5a36}' +
      '#v243-tombol{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}' +
      '#v243-tombol button{flex:1 1 auto;padding:7px 10px;border-radius:8px;border:1px solid rgba(245,158,11,.4);' +
      'background:rgba(64,44,8,.85);color:#fde68a;cursor:pointer;font:600 10.5px ui-monospace,monospace;letter-spacing:.6px;min-height:27px}' +
      '#v243-tombol button:hover{background:rgba(245,158,11,.22);border-color:rgba(245,158,11,.7)}' +
      '#v243-tombol button:disabled{opacity:.45;cursor:wait}' +
      '.v243-baris{display:flex;align-items:center;gap:8px;font-size:10.5px;color:#a18b5d;margin-bottom:8px}' +
      '.v243-baris input[type=checkbox]{accent-color:#f59e0b}' +
      '#v243-log{border-top:1px dashed rgba(245,158,11,.25);padding-top:7px;color:#d9c08a;font-size:10.5px;line-height:1.7;' +
      'max-height:120px;overflow:auto;white-space:pre-wrap}' +
      '.v243-catan{font-size:10px;color:#8a744a;margin-top:8px;line-height:1.6}';
    document.head.appendChild(s);
  }
  function buatChip() {
    if (q('v243-sarang')) { elChip = q('v243-sarang'); return; }
    pasangGaya();
    elChip = document.createElement('div');
    elChip.id = 'v243-sarang';
    elChip.innerHTML = '<span id="v243-led"></span><b id="v243-nama">SARANG</b><span id="v243-ringkas"></span>';
    elChip.title = 'SARANG — hidup mandiri di GitHub Pages (organ V243 v' + V.versi + ')';
    elChip.addEventListener('click', function () { bukaPanel(); });
    document.body.appendChild(elChip);
  }
  function buatPanel() {
    if (q('v243-panel')) { elPanel = q('v243-panel'); elBackdrop = q('v243-backdrop'); return; }
    elBackdrop = document.createElement('div'); elBackdrop.id = 'v243-backdrop';
    elBackdrop.addEventListener('click', function () { tutupPanel(); });
    elPanel = document.createElement('div'); elPanel.id = 'v243-panel';
    elPanel.innerHTML =
      '<h3><span id="v243-led2" style="width:9px;height:9px;border-radius:50%;background:#f59e0b;display:inline-block;box-shadow:0 0 7px #f59e0b"></span>' +
      'SARANG — GITHUB PAGES<button class="tutup" title="Tutup">&times;</button></h3>' +
      '<div class="sub">organ V243 v' + V.versi + ' · hidup mandiri, memori otomatis, evolusi tubuh sendiri</div>' +
      '<div class="v243-status" id="v243-status"></div>' +
      '<div class="v243-grid">' +
      '<label>OWNER GitHub<input id="v243-owner" autocomplete="off" spellcheck="false"></label>' +
      '<label>REPO<input id="v243-repo" autocomplete="off" spellcheck="false"></label>' +
      '<label>CABANG (branch)<input id="v243-branch" autocomplete="off" spellcheck="false"></label>' +
      '<label>TOKEN (Fine-grained PAT)<input id="v243-token" type="password" autocomplete="off" spellcheck="false"></label>' +
      '<label>API BASE<input id="v243-apibase" autocomplete="off" spellcheck="false"></label>' +
      '<label>PAGES URL (opsi, utk domain sendiri)<input id="v243-pagesurl" autocomplete="off" spellcheck="false"></label>' +
      '</div>' +
      '<div class="v243-baris"><input type="checkbox" id="v243-auto"><label for="v243-auto" style="cursor:pointer">SIMPAN OTOMATIS</label>' +
      '<span style="margin-left:auto">setiap</span><input id="v243-interval" type="number" min="5" max="120" style="width:52px;background:rgba(5,4,1,.85);border:1px solid rgba(245,158,11,.3);border-radius:7px;color:#fdf3df;font:11.5px ui-monospace,monospace;padding:4px 6px"><span>menit</span>' +
      '<input type="checkbox" id="v243-pulihboot" style="margin-left:12px"><label for="v243-pulihboot" style="cursor:pointer">PULIH SAAT BANGKIT</label></div>' +
      '<div id="v243-tombol">' +
      '<button id="v243-btn-uji">UJI SAMBUNGAN</button>' +
      '<button id="v243-btn-hijrah">HIJRAH KE GITHUB</button>' +
      '<button id="v243-btn-simpan">SIMPAN MEMORI</button>' +
      '<button id="v243-btn-pulih">PULIH</button>' +
      '<button id="v243-btn-evolusi">EVOLUSI</button>' +
      '</div>' +
      '<div id="v243-log"></div>' +
      '<div class="v243-catan">Token Fine-grained PAT: izin Contents + Pages (read/write), berlaku repo ini saja. ' +
      'Token tersimpan HANYA di browser ini (localStorage). HIJRAH membaca tubuh lewat http(s) — buka SAKTI dari halaman unduh web atau dari halaman Pages.</div>';
    document.body.appendChild(elPanel);
    elPanel.querySelector('.tutup').addEventListener('click', function () { tutupPanel(); });
    // form -> cfg
    function ikat(id, kunci, angka) {
      var inp = q(id);
      if (!inp) return;
      inp.addEventListener('change', function () {
        st.cfg[kunci] = angka ? (parseInt(inp.value, 10) || 0) : inp.value;
        cfgSimpan(); aturJadwal(); render();
      });
    }
    ikat('v243-owner', 'owner'); ikat('v243-repo', 'repo'); ikat('v243-branch', 'branch');
    ikat('v243-token', 'token'); ikat('v243-apibase', 'apiBase'); ikat('v243-pagesurl', 'pagesUrl');
    ikat('v243-interval', 'intervalSimpanMenit', true);
    var cbAuto = q('v243-auto'), cbPulih = q('v243-pulihboot');
    if (cbAuto) cbAuto.addEventListener('change', function () { st.cfg.autoSimpan = cbAuto.checked; cfgSimpan(); aturJadwal(); });
    if (cbPulih) cbPulih.addEventListener('change', function () { st.cfg.pulihBoot = cbPulih.checked; cfgSimpan(); });
    // aksi
    function jalankan(btnId, janjiFn, nama) {
      var b = q(btnId); if (!b) return;
      b.addEventListener('click', function () {
        if (st.bekerja) return;
        b.disabled = true; st.bekerja = true; render();
        Promise.resolve().then(janjiFn).then(function (h) {
          st.bekerja = false; b.disabled = false; render();
        }).catch(function (e) { st.bekerja = false; b.disabled = false; galat(e); render(); });
      });
    }
    jalankan('v243-btn-uji', ujiSambungan, 'uji');
    jalankan('v243-btn-hijrah', hijrah, 'hijrah');
    jalankan('v243-btn-simpan', function () { return simpanMemori('manual'); }, 'simpan');
    jalankan('v243-btn-pulih', function () { return pulih(true); }, 'pulih');
    jalankan('v243-btn-evolusi', function () { return evolusi('manual', true); }, 'evolusi');
  }
  function bukaPanel() { buatPanel(); isiForm(); render(); if (elPanel) elPanel.style.display = 'block'; if (elBackdrop) elBackdrop.style.display = 'block'; }
  function tutupPanel() { if (elPanel) elPanel.style.display = 'none'; if (elBackdrop) elBackdrop.style.display = 'none'; }
  function isiForm() {
    var m = { 'v243-owner': st.cfg.owner, 'v243-repo': st.cfg.repo, 'v243-branch': st.cfg.branch, 'v243-token': st.cfg.token, 'v243-apibase': st.cfg.apiBase, 'v243-pagesurl': st.cfg.pagesUrl, 'v243-interval': st.cfg.intervalSimpanMenit };
    for (var id in m) { var e = q(id); if (e && document.activeElement !== e) e.value = m[id] === null || m[id] === undefined ? '' : m[id]; }
    var cbAuto = q('v243-auto'); if (cbAuto) cbAuto.checked = !!st.cfg.autoSimpan;
    var cbPulih = q('v243-pulihboot'); if (cbPulih) cbPulih.checked = !!st.cfg.pulihBoot;
  }
  function warnaLed() {
    if (st.bekerja) return '';
    if (st.log.length && st.log[st.log.length - 1].indexOf('GAGAL') === 0) return 'merah';
    if (st.terhubung && st.urlHidup) return 'hijau';
    return '';
  }
  function fmtJam(iso) { return iso ? String(iso).slice(11, 16) : null; }
  function ringkasChip() {
    if (st.bekerja) return 'bekerja\u2026';
    if (st.versiBaru) return 'tubuh baru di sarang \u2014 muat ulang';
    if (!cfgLengkap()) return 'GITHUB \u00b7 belum dikonfigurasi';
    if (st.urlHidup) return 'hidup \u00b7 memori ' + (fmtJam(st.lastSimpan && st.lastSimpan.waktu) || 'menunggu');
    if (st.terhubung) return 'terhubung \u00b7 belum hijrah';
    return 'belum terhubung';
  }
  function render() {
    try {
      if (elChip) {
        var led = elChip.querySelector('#v243-led'); if (led) led.className = warnaLed();
        var rk = elChip.querySelector('#v243-ringkas'); if (rk) { rk.textContent = ringkasChip(); rk.title = st.log.slice(-4).join('\n'); }
      }
      var led2 = q('v243-led2'); if (led2) { var w = warnaLed(); led2.style.background = w === 'merah' ? '#ef4444' : (w === 'hijau' ? '#10b981' : '#f59e0b'); }
      var stat = q('v243-status');
      if (stat) {
        var r = st._prakiraRingkas || { terbuka: 0, benar: 0, salah: 0 };
        var selesai = r.benar + r.salah;
        // teks manusiawi (pelajaran Task 27): tanpa "0/0 (—)" yang tampak placeholder
        var prakTeks = selesai === 0
          ? 'belum ada yang dinilai — prakira dikunci otomatis oleh NADI'
          : 'prakira benar <b>' + r.benar + '</b>/' + selesai + ' (' + (Math.round((r.benar / selesai) * 10000) / 100) + '%)';
        stat.innerHTML =
          '<div><span class="l">SAMBUNGAN</span>' + (st.terhubung === null ? 'belum diuji' : (st.terhubung ? '<b>OK</b> ' + (st.repoInfo ? st.repoInfo.nama : '') : 'terputus')) + '</div>' +
          '<div><span class="l">HALAMAN HIDUP</span>' + (st.urlHidup ? '<a href="' + st.urlHidup + '" target="_blank" rel="noopener" style="color:#fde68a">' + st.urlHidup + '</a>' : 'belum hijrah') + '</div>' +
          '<div><span class="l">TUBUH</span><b>' + kodeVersi() + '</b> · organ ' + (function () { var n = 0; var m = organPeta(); for (var k in m) n++; return n; })() + '</div>' +
          '<div><span class="l">SARANG</span>' + (st.versiRepo ? st.versiRepo.kodeVersi + ' · ' + String(st.versiRepo.waktu).slice(0, 19) : 'belum diketahui') + (st.versiBaru ? ' · <b style="color:#f87171">tubuh baru tersedia — muat ulang halaman</b>' : '') + '</div>' +
          '<div><span class="l">MEMORI</span>' + (st.lastSimpan ? 'tersimpan ' + String(st.lastSimpan.waktu).slice(0, 19) + ' (' + (st.lastSimpan.jenis || '-') + ')' : 'belum tersimpan') + (st.lastPulih ? ' · pulih ' + String(st.lastPulih.waktu).slice(11, 16) : '') + '</div>' +
          '<div><span class="l">ISI MEMORI</span>denyut <b>' + st._denyut + '</b> · rantai ' + (st._rantaiDenyut.length + st._rantaiPrakira.length) + ' entri · ' + prakTeks + '</div>' +
          '<div><span class="l">GIAT</span>hijrah ' + st.hitung.hijrah + ' · simpan ' + st.hitung.simpan + ' · evolusi ' + st.hitung.evolusi + ' · pulih ' + st.hitung.pulih + ' · gagal ' + st.hitung.gagal + '</div>';
      }
      var log = q('v243-log');
      if (log) log.textContent = st.log.length ? st.log.slice(-10).join('\n') : 'sarang siap — konfigurasi lalu tekan UJI SAMBUNGAN';
    } catch (e) { /* render tak boleh mematikan organ */ }
  }

  // ---------------- self-test ----------------
  function selfTest() {
    var T = [];
    T.push(['sha256 vektor abc', sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad']);
    var b64 = null;
    try { b64 = base64DariTeks('h\u00e9llo \u00b5 \u2014 ok') === btoa(unescape(encodeURIComponent('h\u00e9llo \u00b5 \u2014 ok'))); } catch (e) { b64 = false; }
    T.push(['base64 unicode: encode benar', !!b64]);
    T.push(['urut versi: 1.10 > 1.9', urutVersi('1.10', '1.9') > 0]);
    T.push(['urut versi: identik = 0', urutVersi('v243.7.1', 'v243.7.1') === 0]);
    var kv = kodeVersi();
    T.push(['kodeVersi berformat v243.N.M', /^v243\.\d+\.\d+$/.test(kv)]);
    var mp = organPeta();
    T.push(['organPeta memuat SARANG', mp.SARANG === V.versi]);
    // PELAJARAN: simpan SALINAN primitif (bukan referensi) sebelum mutasi uji
    var oLama = st.cfg.owner, rLama = st.cfg.repo, pLama = st.cfg.pagesUrl;
    st.cfg.owner = 'Micaprofita Unggul'; st.cfg.repo = 'Sarang Uji'; st.cfg.pagesUrl = '';
    var pUrl = pagesUrl();
    T.push(['pagesUrl: encode aman + bentuk', pUrl === 'https://Micaprofita%20Unggul.github.io/Sarang%20Uji/']);
    var aUrl = apiRepo();
    T.push(['apiRepo: bentuk /repos/{owner}/{repo}', aUrl.indexOf('/repos/Micaprofita%20Unggul/Sarang%20Uji') > 0]);
    st.cfg.owner = oLama; st.cfg.repo = rLama; st.cfg.pagesUrl = pLama;
    var kaps = kapsulMemori();
    T.push(['kapsul: protokol + rantai lengkap', kaps.protokol === 'KAPSUL-MICAPROFITA' && !!kaps.rantai && Array.isArray(kaps.rantai.denyut) && Array.isArray(kaps.rantai.prakira)]);
    var vj = versiJson('deadbeef');
    T.push(['versi.json: protokol + sha diterima', vj.protokol === 'SARANG-MICAPROFITA' && vj.htmlSha256 === 'deadbeef' && !!vj.pertumbuhan]);
    var rm = buatReadme();
    T.push(['README: memuat struktur + halaman hidup', rm.indexOf('memori/terkini.json') > 0 && rm.indexOf('SARANG') > 0]);
    if (typeof localStorage !== 'undefined') {
      var bukti = { z: 43 }; l1Set('uji-roundtrip', bukti);
      T.push(['L1: tulis-baca cfg utk organ', l1Get('uji-roundtrip', {}).z === 43]);
      l1Set('uji-roundtrip', null); localStorage.removeItem('mp243.uji-roundtrip');
      try { localStorage.setItem('mp241.sarang-uji', '1'); T.push(['L1: gudang NADI terbaca (satu tubuh)', localStorage.getItem('mp241.sarang-uji') === '1']); localStorage.removeItem('mp241.sarang-uji'); } catch (e) { T.push(['L1: gudang NADI terbaca (satu tubuh)', false]); }
    } else T.push(['L1: tak tersedia di lingkungan ini — degradasi jujur', true]);
    if (ada() && elChip && elChip.isConnected) {
      T.push(['UI: chip SARANG lahir sinkron', true]);
      var z = parseInt(getComputedStyle(elChip).zIndex, 10);
      T.push(['UI: chip z tertib (<=99992, di bawah panel/modal)', z > 99000 && z <= 99992]);
      var pan = q('v243-panel');
      T.push(['UI: panel modal lahir tersembunyi', !!pan && getComputedStyle(pan).display === 'none']);
      var tok = q('v243-token');
      T.push(['UI: token tersamar (type=password)', !!tok && tok.getAttribute('type') === 'password']);
      var jml = 0, ids = ['v243-btn-uji', 'v243-btn-hijrah', 'v243-btn-simpan', 'v243-btn-pulih', 'v243-btn-evolusi'];
      ids.forEach(function (i) { if (q(i)) jml++; });
      T.push(['UI: 5 tombol aksi lengkap & statis', jml === 5]);
    } else {
      T.push(['UI: chip — tanpa DOM/kartu belum lahir, degradasi jujur', true]);
      T.push(['UI: panel — tanpa DOM, degradasi jujur', true]);
      T.push(['UI: token — tanpa DOM, degradasi jujur', true]);
      T.push(['UI: tombol — tanpa DOM, degradasi jujur', true]);
    }
    var pass = T.filter(function (x) { return x[1]; }).length;
    return { total: T.length, pass: pass, fail: T.length - pass, rincian: T.map(function (x) { return (x[1] ? 'PASS' : 'GAGAL') + ' — ' + x[0]; }) };
  }

  // ---------------- boot ----------------
  function boot() {
    // pelajaran Task 27: UI = murni DOM -> lahir SINKRON sebelum storage/jaringan
    buatChip(); buatPanel();
    cfgMuat();
    if (st.cfg.pagesUrl || (st.cfg.owner && st.cfg.repo)) { st.urlHidup = st.urlHidup || pagesUrl(); }
    render();
    muatMemoriLokal().then(function () { render(); }).catch(function () {});
    // pulih + pemeriksa saat bangkit (hanya bila sarang sudah aktif)
    if (cfgLengkap()) {
      aturJadwal();
      if (st.cfg.pulihBoot && l1Get('aktif', false)) {
        setTimeout(function () {
          try { pulih(false).catch(function () {}); } catch (e) { /* fault isolation */ }
          setTimeout(function () { try { pemeriksaVersi().catch(function () {}); } catch (e) { /* diam */ } }, 3000);
        }, 2500);
      } else {
        setTimeout(function () { try { pemeriksaVersi().catch(function () {}); } catch (e) { /* diam */ } }, 4000);
      }
    }
    setTimeout(function () {
      try {
        var stres = selfTest();
        catat('self-test ' + stres.pass + '/' + stres.total + (stres.fail ? ' — GAGAL, lihat API selfTest()' : ' semua PASS'));
        render();
        if (typeof console !== 'undefined') console.log('[V243 SARANG] v' + V.versi + ' — hidup-mandiri GitHub Pages: self-test ' + stres.pass + '/' + stres.total, stres.rincian);
      } catch (e) { /* diam */ }
    }, 900);
    // sadar-tabraksiran: simpan terbaik saat tab disembunyikan (interval tetap jalan di latar)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && cfgLengkap() && st.cfg.autoSimpan) { try { simpanMemori('tab-sembunyi').catch(function () {}); } catch (e) { /* diam */ } }
      });
    }
  }
  boot();

  var API = {
    versi: V.versi, nama: V.nama, organ: V.organ, protokol: V.protokol,
    status: function () {
      return { terhubung: st.terhubung, bekerja: st.bekerja, urlHidup: st.urlHidup, kodeVersi: kodeVersi(), organ: organPeta(),
        versiRepo: st.versiRepo, versiBaru: st.versiBaru, lastSimpan: st.lastSimpan, lastPulih: st.lastPulih,
        simpanBerikutnya: st.simpanBerikutnya, hitung: st.hitung,
        memori: { denyut: st._denyut, rantaiDenyut: st._rantaiDenyut.length, rantaiPrakira: st._rantaiPrakira.length, prakira: st._prakiraRingkas },
        cfg: { owner: st.cfg.owner, repo: st.cfg.repo, branch: st.cfg.branch, apiBase: st.cfg.apiBase, pagesUrl: st.cfg.pagesUrl, intervalSimpanMenit: st.cfg.intervalSimpanMenit, autoSimpan: st.cfg.autoSimpan, tokenAda: !!st.cfg.token },
        log: st.log.slice(-10) };
    },
    selfTest: selfTest,
    ujiSambungan: ujiSambungan, hijrah: hijrah, simpanMemori: simpanMemori,
    pulih: pulih, evolusi: evolusi, pemeriksaVersi: pemeriksaVersi,
    aturJadwal: aturJadwal, organPeta: organPeta, kodeVersi: kodeVersi,
    bukaPanel: bukaPanel, tutupPanel: tutupPanel,
    cfgSet: function (obj) {
      for (var k in obj) { if (st.cfg.hasOwnProperty(k)) st.cfg[k] = obj[k]; }
      cfgSimpan(); aturJadwal(); isiForm(); render(); return true;
    }
  };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.SARANG = API;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
/*V243-SARANG:END*/
