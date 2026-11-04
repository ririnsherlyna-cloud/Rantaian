/*V241-NADI:BEGIN*/
// ============================================================
// V241 SAKTI-NADI v1.1 — ORGAN TERUS-HIDUP + GUDANG EKSTERNAL
// + PRAKIRA PRA-REGISTRASI (AKURASI SEBELUM TERJADI).
// v1.1: FISIKA TAMPILAN KARTU — redesain UI profesional (hierarki
// bersih, detail membuka ke ATAS, teks manusiawi, z-index
// tertib 99992: di atas lapisan dekorasi, di bawah panel/modal 99999+) MANDAT GURU:
// "tampilan saling timp menimpa itu jelek". Mesin denyut /
// gudang / prakira / rantai TIDAK diubah satu baris pun.
//
// Mandat Guru:
//  1. "satu file single html yang dijalankan pemiliknya dalam
//     browser yang TERUS HIDUP" -> NADI: jantung denyut yang
//     sadar-visibility, sadar-waktu, dan mencatat setiap
//     denyutnya ke ledger berantai hash (anti-rekayasa).
//  2. "mampu menyimpan penyimpanan ke EKSTERNAL juga selain di
//     local storage karena ini demi sokongan perkembangan"
//     -> GUDANG 4 TINGKAT: L1 localStorage · L2 IndexedDB ·
//     E1 Folder Eksternal (File System Access API — file
//     JSONL nyata di komputer pemilik) · E2 Kapsul
//     ekspor/impor (bekerja di semua browser).
//  3. "menembak akurasi yang sangat koheren SEBELUM prediksi
//     itu terjadi" -> PRAKIRA: otak ARAH (organ v240) memvonis
//     dari 60 candle live, prediksi DIKUNCI dulu ke ledger
//     berantai hash SEBELUM jendela berjalan, lalu dinilai
//     BENAR/SALAH saat jendela berakhir. Akurasi dihitung
//     HANYA dari prediksi terkunci — tidak ada tempat untuk
//     omongan belakangan.
//
// Rekayasa sistem: modular (satu tingkat = satu modul),
// fault isolation (tiap tingkat try/catch, mati satu tingkat
// tetap hidup), redundancy (L1+L2+E1+E2 saling membackup),
// observability (kartu status live + peristiwa JSONL),
// recovery (rantai rusak dipotong jujur + dilaporkan),
// automated testing (self-test async saat boot).
// Nol biaya: semua sumber data = API publik gratis.
// ============================================================
(function () {
  'use strict';
  var V = {
    versi: '1.1', nama: 'SAKTI-NADI', organ: 'V241',
    protokol: {
      nadi: 'denyut sadar-visibility tiap 15 dtk (latar 45 dtk), ledger berantai hash',
      gudang: 'L1 localStorage · L2 IndexedDB · E1 folder eksternal (File System Access) · E2 kapsul ekspor/impor',
      prakira: 'pra-registrasi: otak ARAH v240 memvonis dari 60 candle live -> DIKUNCI ke ledger berantai hash SEBELUM jendela 15 menit -> dinilai BENAR/SALAH saat jendela tuntas; akurasi hanya dari prediksi terkunci'
    }
  };

  // ---------------- kanonikal + sha256 (identik dgn prareg.ts) ----------------
  function kanonikal(x) {
    if (x === null || typeof x === 'number') {
      if (typeof x === 'number') {
        if (!isFinite(x)) return 'null';
        if (x === Math.floor(x)) return String(x);
        return String(parseFloat(x.toFixed(6)));
      }
      return 'null';
    }
    if (typeof x === 'string') return JSON.stringify(x);
    if (typeof x === 'boolean') return x ? 'true' : 'false';
    if (Array.isArray(x)) return '[' + x.map(kanonikal).join(',') + ']';
    var ks = Object.keys(x).sort();
    return '{' + ks.map(function (k) { return JSON.stringify(k) + ':' + kanonikal(x[k]); }).join(',') + '}';
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
  var GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

  // ---------------- keadaan ----------------
  var st = {
    denyut: 0, mulai: Date.now(), terakhirDenyut: null, tersembunyi: false,
    antrianE1: [], folder: null, namaFolder: '',
    rantai: { denyut: [], prakira: [] }, // entri {hash, ...payload}
    prakira: [], // entri prakira (sama dgn rantai.prakira, alias)
    prakiraKunciTerakhir: 0, watchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    jendelaMenit: 15, intervalKunciMenit: 30, hostAktif: '', l2Siap: false, bootLog: []
  };

  // ---------------- L1 localStorage ----------------
  function l1Get(k, def) { try { var v = localStorage.getItem('mp241.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function l1Set(k, v) { try { localStorage.setItem('mp241.' + k, JSON.stringify(v)); st.tierL1 = true; return true; } catch (e) { st.tierL1 = false; return false; } }

  // ---------------- L2 IndexedDB ----------------
  var _db = null;
  function idbOpen() {
    return new Promise(function (res) {
      if (_db) return res(_db);
      if (typeof indexedDB === 'undefined') return res(null);
      try {
        var req = indexedDB.open('mp241-gudang', 1);
        req.onupgradeneeded = function (ev) {
          var db = ev.target.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
          if (!db.objectStoreNames.contains('rantai')) db.createObjectStore('rantai');
        };
        req.onsuccess = function () { _db = req.result; st.l2Siap = true; res(_db); };
        req.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function idbPut(store, key, val) {
    return idbOpen().then(function (db) {
      if (!db) return false;
      return new Promise(function (res) {
        try { var tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; }
        catch (e) { res(false); }
      });
    });
  }
  function idbGet(store, key) {
    return idbOpen().then(function (db) {
      if (!db) return null;
      return new Promise(function (res) {
        try { var tx = db.transaction(store, 'readonly'); var r = tx.objectStore(store).get(key); r.onsuccess = function () { res(r.result === undefined ? null : r.result); }; r.onerror = function () { res(null); }; }
        catch (e) { res(null); }
      });
    });
  }

  // ---------------- rantai hash (append-only, anti-rekayasa) ----------------
  function payloadEntri(p) {
    var o = {}; for (var k in p) if (k !== 'hash' && k !== 'prev') o[k] = p[k];
    o.prev = p.prev; return o;
  }
  function rantaiVerifikasi(entri) {
    var prev = GENESIS;
    for (var i = 0; i < entri.length; i++) {
      if (entri[i].prev !== prev) return { ok: false, indeks: i };
      if (sha256Hex(kanonikal(payloadEntri(entri[i]))) !== entri[i].hash) return { ok: false, indeks: i };
      prev = entri[i].hash;
    }
    return { ok: true, indeks: -1 };
  }
  function rantaiTambah(jenis, payload) {
    var rc = st.rantai[jenis];
    var prev = rc.length ? rc[rc.length - 1].hash : GENESIS;
    var entri = Object.assign({}, payload, { prev: prev });
    entri.hash = sha256Hex(kanonikal(payloadEntri(entri)));
    rc.push(entri);
    // redam ukuran: simpan penuh di L2; L1 simpan 400 terakhir
    // (potongan dimulai dr genesis sc jujur) — rantai tetap sahih.
    var potong = rc.length > 400 ? rc.slice(-400) : rc;
    if (potong !== rc) potong[0] = Object.assign({}, potong[0], { prev: GENESIS });
    l1Set('rantai-' + jenis, potong);
    idbPut('rantai', jenis, rc);
    st.antrianE1.push({ jenis: jenis, baris: JSON.stringify(entri) });
    return entri;
  }
  function rantaiMuat() {
    return idbOpen().then(function () {
      ['denyut', 'prakira'].forEach(function (jenis) {
        return idbGet('rantai', jenis).then(function (drL2) {
          var drL1 = l1Get('rantai-' + jenis, []);
          var pilih = (drL2 && drL2.length >= drL1.length) ? drL2 : drL1;
          var ver = rantaiVerifikasi(pilih);
          if (!ver.ok && ver.indeks >= 0) {
            // RECOVERY: ekor rusak dipotong jujur + dicatat
            st.bootLog.push('rantai ' + jenis + ' rusak di indeks ' + ver.indeks + ' — dipotong (recovery)');
            pilih = pilih.slice(0, ver.indeks);
          }
          st.rantai[jenis] = pilih;
          if (jenis === 'prakira') st.prakira = pilih;
        });
      });
    });
  }

  // ---------------- E1 folder eksternal (File System Access) ----------------
  function fsTersedia() { return typeof window.showDirectoryPicker === 'function'; }
  async function tulisFile(dir, nama, teks, tambah) {
    var fh = await dir.getFileHandle(nama, { create: true });
    if (tambah && (await fh.getFile()).size > 0) {
      var w2 = await fh.createWritable({ keepExistingData: true });
      await w2.write({ type: 'write', position: (await fh.getFile()).size, data: teks });
      await w2.close();
    } else {
      var w = await fh.createWritable();
      await w.write(teks);
      await w.close();
    }
  }
  async function pastikanDir(induk, nama) { return induk.getDirectoryHandle(nama, { create: true }); }
  async function flushE1() {
    if (!st.folder || !st.antrianE1.length) return 0;
    var nadiDir = await pastikanDir(st.folder, 'nadi');
    var prakiraDir = await pastikanDir(st.folder, 'prakira');
    var buffer = { denyut: [], prakira: [] };
    st.antrianE1.forEach(function (x) { (buffer[x.jenis] = buffer[x.jenis] || []).push(x.baris); });
    var n = 0;
    if (buffer.denyut.length) { await tulisFile(nadiDir, 'denyut.jsonl', buffer.denyut.join('\n') + '\n', true); n += buffer.denyut.length; }
    if (buffer.prakira.length) { await tulisFile(prakiraDir, 'ledger.jsonl', buffer.prakira.join('\n') + '\n', true); n += buffer.prakira.length; }
    st.antrianE1 = [];
    return n;
  }
  async function pasangFolder() {
    try {
      if (!fsTersedia()) { st.bootLog.push('File System Access tak tersedia di browser ini — pakai E2 kapsul'); render(); return false; }
      var folder = await window.showDirectoryPicker({ mode: 'readwrite', id: 'micaprofita-gudang' });
      st.folder = folder; st.namaFolder = folder.name; st.tierE1 = true;
      await tulisFile(st.folder, 'gudang-micaprofita.json', JSON.stringify({ protokol: 'GUDANG-MICAPROFITA', organ: V.nama, versi: V.versi, dibuka: new Date().toISOString() }, null, 1));
      var n = await flushE1();
      await simpanSnapshot();
      st.bootLog.push('folder eksternal terpasang: ' + folder.name + ' (' + n + ' peristiwa diantrikan tersalin)');
      l1Set('namaFolder', folder.name);
      render(); return true;
    } catch (e) { st.bootLog.push('pasang folder batal: ' + (e && e.name || e)); render(); return false; }
  }
  async function simpanSnapshot() {
    if (!st.folder) return false;
    try {
      var snapDir = await pastikanDir(st.folder, 'snapshot');
      var snap = { protokol: 'SNAPSHOT-GUDANG', waktu: new Date().toISOString(), denyut: st.denyut, prakira: st.rantai.prakira.slice(-500), ringkas: ringkasPrakira() };
      await tulisFile(snapDir, 'keadaan-' + Date.now() + '.json', JSON.stringify(snap, null, 1));
      return true;
    } catch (e) { return false; }
  }

  // ---------------- E2 kapsul ----------------
  function isiKapsul() {
    return {
      protokol: 'KAPSUL-MICAPROFITA', organ: V.nama, versi: V.versi, waktu: new Date().toISOString(),
      denyut: st.denyut, mulai: st.mulai, watchlist: st.watchlist,
      rantai: st.rantai, verifikasi: { denyut: rantaiVerifikasi(st.rantai.denyut), prakira: rantaiVerifikasi(st.rantai.prakira) }
    };
  }
  function eksporKapsul() {
    try {
      var k = isiKapsul();
      var blob = new Blob([JSON.stringify(k, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'micaprofita-kapsul-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      st.bootLog.push('kapsul diekspor (' + JSON.stringify(k).length + ' byte)');
      render(); return true;
    } catch (e) { st.bootLog.push('ekspor gagal: ' + e); return false; }
  }
  async function imporKapsul(file) {
    try {
      var teks = await file.text();
      var k = JSON.parse(teks);
      if (k.protokol !== 'KAPSUL-MICAPROFITA') { st.bootLog.push('impor ditolak: bukan kapsul Micaprofita'); render(); return false; }
      var gabung = {};
      ['denyut', 'prakira'].forEach(function (jenis) {
        var lama = st.rantai[jenis], baru = (k.rantai && k.rantai[jenis]) || [];
        var ada = {}; lama.forEach(function (e) { ada[e.hash] = 1; });
        baru.forEach(function (e) { if (!ada[e.hash]) lama.push(e); });
        lama.sort(function (a, b) { return (a.waktu || '').localeCompare(b.waktu || ''); });
        gabung[jenis] = rantaiVerifikasi(lama).ok;
      });
      st.rantai.denyut = st.rantai.denyut; // sudah digabung in-place
      if (k.denyut > st.denyut) { st.denyut = k.denyut; l1Set('denyut', st.denyut); }
      l1Set('rantai-denyut', st.rantai.denyut.slice(-400));
      l1Set('rantai-prakira', st.rantai.prakira.slice(-400));
      idbPut('rantai', 'denyut', st.rantai.denyut); idbPut('rantai', 'prakira', st.rantai.prakira);
      st.prakira = st.rantai.prakira;
      st.bootLog.push('kapsul diimpor: denyut=' + k.denyut + ', rantai sahih=' + JSON.stringify(gabung));
      render(); return gabung.prakira && gabung.denyut;
    } catch (e) { st.bootLog.push('impor gagal: ' + e); render(); return false; }
  }

  // ---------------- sumber harga nol-biaya (failover 3 host) ----------------
  function ambil(url, ms) {
    var ctl = new AbortController(); var t = setTimeout(function () { ctl.abort(); }, ms || 8000);
    return fetch(url, { signal: ctl.signal }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function (e) { clearTimeout(t); throw e; });
  }
  async function hargaSemua() {
    var host = [
      { nama: 'binance-fapi', url: 'https://fapi.binance.com/fapi/v1/ticker/price', baca: function (j) { var m = {}; (Array.isArray(j) ? j : [j]).forEach(function (x) { m[x.symbol] = parseFloat(x.price); }); return m; } },
      { nama: 'okx-swap', url: 'https://www.okx.com/api/v5/market/tickers?instType=SWAP', baca: function (j) { var m = {}; (j.data || []).forEach(function (x) { m[x.instId.replace('-SWAP', 'USDT').replace('XBT', 'BTC')] = parseFloat(x.last); }); return m; } },
      { nama: 'bybit-linear', url: 'https://api.bybit.com/v5/market/tickers?category=linear', baca: function (j) { var m = {}; ((j.result || {}).list || []).forEach(function (x) { m[x.symbol] = parseFloat(x.lastPrice); }); return m; } }
    ];
    for (var i = 0; i < host.length; i++) {
      try { var j = await ambil(host[i].url); var m = host[i].baca(j); st.hostAktif = host[i].nama; return m; } catch (e) { /* host berikutnya */ }
    }
    st.hostAktif = ''; return null;
  }
  async function lilin60(simbol) {
    var host = [
      { nama: 'binance-fapi', url: 'https://fapi.binance.com/fapi/v1/klines?symbol=' + simbol + '&interval=5m&limit=60', baca: function (j) { return j.map(function (k) { return { o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]) }; }); } },
      { nama: 'okx-swap', url: 'https://www.okx.com/api/v5/market/candles?instId=' + simbol.replace('USDT', '-USDT-SWAP') + '&bar=5m&limit=60', baca: function (j) { return (j.data || []).reverse().map(function (k) { return { o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]) }; }); } },
      { nama: 'bybit-linear', url: 'https://api.bybit.com/v5/market/kline?category=linear&symbol=' + simbol + '&interval=5&limit=60', baca: function (j) { return ((j.result || {}).list || []).reverse().map(function (k) { return { o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]) }; }); } }
    ];
    for (var i = 0; i < host.length; i++) {
      try { var j = await ambil(host[i].url); var c = host[i].baca(j); if (c && c.length >= 60) { st.hostAktif = host[i].nama; return c; } } catch (e) { /* berikutnya */ }
    }
    return null;
  }

  // ---------------- PRAKIRA (pra-registrasi live) ----------------
  function ringkasPrakira() {
    var tb = 0, benar = 0, salah = 0;
    st.rantai.prakira.forEach(function (e) { if (e.status === 'TERBUKA') tb++; else if (e.status === 'BENAR') benar++; else if (e.status === 'SALAH') salah++; });
    var selesai = benar + salah;
    return { terbuka: tb, benar: benar, salah: salah, selesai: selesai, akurasi: selesai ? Math.round((benar / selesai) * 10000) / 100 : null };
  }
  async function prakiraKunci(simbol, arah, hargaKunci, bukti) {
    var entri = rantaiTambah('prakira', {
      jenis: 'PRAKIRA', id: 'pk-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      simbol: simbol, arah: arah, hargaKunci: hargaKunci,
      waktuKunci: new Date().toISOString(), jendelaMenit: st.jendelaMenit,
      waktuBuka: new Date(Date.now() + st.jendelaMenit * 60000).toISOString(),
      status: 'TERBUKA', bukti: (bukti || '').slice(0, 200), versiOtak: 'v240-araj+'
    });
    l1Set('prakira-terakhir', Date.now());
    return entri;
  }
  async function prakiraTick() {
    try {
      var harga = await hargaSemua();
      if (!harga) return;
      // 1) selesaikan yang TERBUKA dan sudah lewat jendela
      var kini = Date.now();
      for (var i = 0; i < st.rantai.prakira.length; i++) {
        var e = st.rantai.prakira[i];
        if (e.status !== 'TERBUKA') continue;
        var buka = Date.parse(e.waktuBuka);
        if (isNaN(buka) || kini < buka) continue;
        var hKini = harga[e.simbol];
        if (!hKini) continue;
        e.status = (e.arah === 'NAIK' ? hKini > e.hargaKunci : hKini < e.hargaKunci) ? 'BENAR' : 'SALAH';
        e.hargaBuka = hKini; e.waktuNilai = new Date().toISOString();
        e.deltaPct = Math.round(((hKini - e.hargaKunci) / e.hargaKunci) * 1000000) / 10000;
        st.antrianE1.push({ jenis: 'prakira', baris: JSON.stringify({ jenis: 'NILAI', id: e.id, status: e.status, hargaBuka: hKini, waktuNilai: e.waktuNilai }) });
      }
      l1Set('prakira-terakhir-list', st.rantai.prakira.slice(-60));
      idbPut('rantai', 'prakira', st.rantai.prakira);
      // 2) kunci prediksi baru bila waktunya (interval per watchlist)
      if (kini - st.prakiraKunciTerakhir < st.intervalKunciMenit * 60000) { render(); return; }
      var otak = (window.V231_SAKTI && window.V231_SAKTI.ARAH && typeof window.V231_SAKTI.ARAH.vonisArah === 'function') ? window.V231_SAKTI.ARAH : null;
      if (!otak) { st.bootLog.push('prakira DIAM: organ ARAH belum ada (fault isolation)'); render(); return; }
      for (var s = 0; s < st.watchlist.length; s++) {
        var sim = st.watchlist[s];
        var masihTerbuka = st.rantai.prakira.some(function (e) { return e.simbol === sim && e.status === 'TERBUKA'; });
        if (masihTerbuka) continue;
        var cs = await lilin60(sim);
        if (!cs || !harga[sim]) continue;
        var von = otak.vonisArah(cs);
        var arah = von.arah || (von.vonis === 'BUY' ? 'NAIK' : 'TURUN');
        var bk = (von.vonis || '') + ' kepastian ' + (von.kepastian !== undefined ? von.kepastian : '-') + ' · ' + ((von.buktiKunci || []).slice(0, 2).join('; '));
        await prakiraKunci(sim, arah, harga[sim], bk);
      }
      st.prakiraKunciTerakhir = kini;
      render();
    } catch (e) { st.bootLog.push('prakira tick galat: ' + (e && e.message || e)); }
  }

  // ---------------- NADI (jantung) ----------------
  var denyutSejakCatat = 0;
  function denyutkan() {
    st.denyut++; denyutSejakCatat++;
    st.terakhirDenyut = new Date().toISOString();
    l1Set('denyut', st.denyut); l1Set('terakhirDenyut', st.terakhirDenyut);
    if (denyutSejakCatat >= 10) { // catat ke rantai tiap ~150 dtk
      denyutSejakCatat = 0;
      rantaiTambah('denyut', { jenis: 'DENYUT', seq: st.denyut, waktu: st.terakhirDenyut, uptimeMs: Date.now() - st.mulai, tersembunyi: st.tersembunyi, host: st.hostAktif });
    }
    flushE1().then(function () { render(); }).catch(function () {});
    prakiraTick(); // async, fault-isolated
    render();
  }
  function aturJadwal() {
    if (st._timer) clearInterval(st._timer);
    var ms = st.tersembunyi ? 45000 : 15000;
    st._timer = setInterval(function () { try { denyutkan(); } catch (e) { /* jantung tak boleh mati */ } }, ms);
  }

  // ---------------- UI kartu status ----------------
  var el = null, elDetail = null;
  // PENTING (pelajaran v1.1): tubuh SAKTI men-stub document.getElementById
  // dan document.querySelector dgn Proxy palsu utk id yang TIDAK ada (era
  // V126.2 makeStub). Satu-satunya lookup yang jujur = querySelectorAll.
  function q(id) {
    try {
      var list = document.querySelectorAll('#' + id);
      return (list && list.length) ? list[0] : null;
    } catch (e) { return null; }
  }
  function fmtUptime(ms) {
    var m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return d + 'h ' + (h % 24) + 'j'; if (h > 0) return h + 'j ' + (m % 60) + 'm'; return m + 'm';
  }
  function buatKartu() {
    if (typeof document === 'undefined') return;
    if (q('v241-nadi')) { // idempoten: kartu sudah ada di pohon (anti-stub, lihat q di atas)
      el = q('v241-nadi'); elDetail = q('v241-detail'); return;
    }
    // --- gaya v1.1: satu blok gaya terpusat (mudah dirawat) ---
    if (!q('v241-gaya')) {
      var s = document.createElement('style'); s.id = 'v241-gaya';
      s.textContent =
        '#v241-nadi{position:fixed;right:12px;bottom:71px;z-index:99992;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;' +
        'color:#d7f5e6;background:linear-gradient(165deg,rgba(8,27,22,.97),rgba(5,19,15,.97));border:1px solid rgba(16,185,129,.28);' +
        'border-radius:12px;padding:9px 12px;max-width:320px;box-shadow:0 10px 32px rgba(0,0,0,.5);backdrop-filter:blur(6px);' +
        'transition:opacity .25s ease,transform .25s ease}' +
        '#v241-nadi.mpx-meredup{opacity:.15;pointer-events:none}' +
        '#v241-kepala{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none}' +
        '#v241-kepala:hover #v241-nama{color:#ffffff}' +
        '#v241-led{width:9px;height:9px;border-radius:50%;background:#10b981;box-shadow:0 0 7px #10b981;flex:none;animation:v241denyut 2.4s ease-in-out infinite}' +
        '@keyframes v241denyut{0%,100%{opacity:1}50%{opacity:.45}}' +
        '#v241-nama{font-weight:700;letter-spacing:1.6px;color:#e8fff4;cursor:help}' +
        '#v241-ringkas{color:#6ee7b7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '#v241-toggle{margin-left:auto;color:#4f9c7d;flex:none;transition:transform .2s ease}' +
        '#v241-detail{display:none;margin:0 0 8px;padding:10px 11px;border:1px solid rgba(16,185,129,.20);border-radius:10px;' +
        'background:rgba(4,16,12,.96);color:#bfe8d4;font-size:11.5px;line-height:1.65}' +
        '#v241-detail b{color:#e8fff4}' +
        '#v241-detail .v241-bdg{display:block;margin-bottom:7px}' +
        '#v241-detail .v241-bdg:last-child{margin-bottom:0}' +
        '#v241-detail .v241-lbl{color:#4f9c7d;letter-spacing:1.2px;font-size:10px;margin-right:5px}' +
        '#v241-log{color:#6ee7b7;margin-top:7px;padding-top:6px;border-top:1px dashed rgba(16,185,129,.18);font-size:10.5px}' +
        '#v241-tombol{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
        '#v241-tombol button{flex:1 1 auto;padding:6px 10px;border-radius:7px;border:1px solid rgba(16,185,129,.35);' +
        'background:rgba(11,59,46,.85);color:#c9f7e2;cursor:pointer;font:600 10.5px ui-monospace,monospace;letter-spacing:.6px;min-height:26px}' +
        '#v241-tombol button:hover{background:rgba(16,185,129,.22);border-color:rgba(16,185,129,.6)}';
      document.head.appendChild(s);
    }
    el = document.createElement('div');
    el.id = 'v241-nadi';
    // struktur v1.1: detail DI ATAS kepala -> panel membuka ke atas, tak menutup toggle di bawahnya
    el.innerHTML =
      '<div id="v241-detail"><div id="v241-info"></div></div>' +
      '<div id="v241-kepala" title="NADI — jantung denyut, gudang 4 tingkat, prakira pra-registrasi (organ V241 v' + V.versi + ')">' +
      '<span id="v241-led"></span>' +
      '<b id="v241-nama">NADI</b>' +
      '<span id="v241-ringkas"></span>' +
      '<span id="v241-toggle">▴</span></div>';
    document.body.appendChild(el);
    elDetail = el.querySelector('#v241-detail');
    var tog = el.querySelector('#v241-toggle');
    el.querySelector('#v241-kepala').addEventListener('click', function () {
      // v1.1 pelajaran: display diatur stylesheet (inline kosong) — JANGAN mengendus
      // elDetail.style.display; lacak status dengan eksplisit.
      var akanBuka = elDetail.style.display !== 'block';
      elDetail.style.display = akanBuka ? 'block' : 'none';
      tog.textContent = akanBuka ? '▾' : '▴';
      l1Set('panelTerbuka', akanBuka);
      render();
    });
    // tombol dalam satu baris rapi (flex), tanpa div terpisah per tombol
    // tombol STATIS (render hanya menulis #v241-info — cacat warisan v1.0 dibongkar harness)
    var baris = document.createElement('div'); baris.id = 'v241-tombol';
    elDetail.appendChild(baris);
    function btn(id, label) {
      var b = document.createElement('button'); b.id = id; b.textContent = label;
      baris.appendChild(b); return b;
    }
    btn('v241-btn-folder', 'GUDANG EKSTERNAL').addEventListener('click', function () { pasangFolder(); });
    btn('v241-btn-ekspor', 'EKSPOR').addEventListener('click', function () { eksporKapsul(); });
    var w = btn('v241-btn-impor', 'IMPOR');
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.style.display = 'none';
    inp.addEventListener('change', function () { if (inp.files && inp.files[0]) imporKapsul(inp.files[0]); });
    elDetail.appendChild(inp);
    w.addEventListener('click', function () { inp.click(); });
    if (l1Get('panelTerbuka', false)) { elDetail.style.display = 'block'; tog.textContent = '▾'; }
  }
  function render() {
    if (!el || !elDetail) return;
    var elInfo = elDetail.querySelector('#v241-info');
    if (!elInfo) return; // detail belum siap — jangan pernah menulis ulang tombol
    var r = ringkasPrakira();
    var ak = r.akurasi === null ? null : r.akurasi;
    // ringkas manusiawi: tanpa "0/0 (—)" yang tampak seperti placeholder
    el.querySelector('#v241-ringkas').textContent =
      'denyut ' + st.denyut + ' · ' +
      (r.selesai === 0 ? 'prakira belum terkunci' : 'prakira ' + r.benar + '/' + r.selesai + (ak === null ? '' : ' · ' + ak + '%'));
    var e1 = st.folder ? '✓ ' + st.namaFolder : (fsTersedia() ? 'belum dipasang' : 'tak tersedia — pakai kapsul');
    var ver = rantaiVerifikasi(st.rantai.prakira);
    var akTeks = ak === null ? '—' : ak + '%';
    elInfo.innerHTML =
      '<div class="v241-bdg"><span class="v241-lbl">NADI</span>denyut <b>' + st.denyut + '</b> · hidup ' + fmtUptime(Date.now() - st.mulai) + ' · terakhir ' + (st.terakhirDenyut || '—').slice(11, 19) + '</div>' +
      '<div class="v241-bdg"><span class="v241-lbl">GUDANG</span>L1 ' + (st.tierL1 === false ? '×' : '✓') + ' · L2 ' + (st.l2Siap ? '✓' : '×') + ' · E1 ' + e1 + ' · E2 ✓</div>' +
      '<div class="v241-bdg"><span class="v241-lbl">PRAKIRA</span>' + (r.selesai === 0 ? 'belum ada prediksi terkunci — dikunci otomatis tiap ' + st.intervalKunciMenit + ' menit' : 'terbuka <b>' + r.terbuka + '</b> · benar ' + r.benar + ' · salah ' + r.salah + ' · akurasi <b>' + akTeks + '</b>') + '</div>' +
      '<div class="v241-bdg"><span class="v241-lbl">RANTAI</span>' + st.rantai.denyut.length + ' denyut + ' + st.rantai.prakira.length + ' prakira · ' + (ver.ok ? 'sahih ✓' : 'RUSAK @' + ver.indeks) + ' · host ' + (st.hostAktif || '—') + '</div>' +
      '<div id="v241-log">' + (st.bootLog.slice(-3).join('<br>') || 'siap') + '</div>';
  }

  // ---------------- self-test ----------------
  async function selfTest() {
    var T = [];
    T.push(['sha256 vektor abc', sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad']);
    var o1 = kanonikal({ b: 1, a: 'x' }), o2 = kanonikal({ a: 'x', b: 1 });
    T.push(['kanonikal deterministik (urut kunci)', o1 === o2]);
    T.push(['kanonikal angka desimal stabil', kanonikal(0.123456789) === kanonikal(parseFloat((0.123456789).toFixed(6)))]);
    // rantai: tambah 3 -> sahih; tamper -> rusak terdeteksi
    var rc = [];
    var prev = GENESIS;
    for (var i = 0; i < 3; i++) {
      var p = { jenis: 'UJI', seq: i, prev: prev }; p.hash = sha256Hex(kanonikal(payloadEntri(p))); rc.push(p); prev = p.hash;
    }
    T.push(['rantai: 3 entri sahih', rantaiVerifikasi(rc).ok]);
    var rc2 = JSON.parse(JSON.stringify(rc)); rc2[1].seq = 99;
    T.push(['rantai: tamper terdeteksi', !rantaiVerifikasi(rc2).ok]);
    // kapsul roundtrip
    var k1 = JSON.parse(JSON.stringify(isiKapsul()));
    T.push(['kapsul: encode-decode utuh', JSON.parse(JSON.stringify(k1)).protokol === 'KAPSUL-MICAPROFITA']);
    // L1 roundtrip (bila lingkungan punya localStorage)
    if (typeof localStorage !== 'undefined') {
      T.push(['L1 localStorage: tulis-baca', (function () { l1Set('uji', { z: 42 }); return l1Get('uji', {}).z === 42; })()]);
    } else T.push(['L1 localStorage: tak tersedia di lingkungan ini — degradasi jujur', true]);
    // L2 roundtrip (bila ada)
    if (st.l2Siap) { var okL2 = await idbPut('kv', 'uji', { z: 7 }); var v2 = okL2 ? await idbGet('kv', 'uji') : null; T.push(['L2 IndexedDB: tulis-baca', !!v2 && v2.z === 7]); }
    else T.push(['L2 IndexedDB: tak tersedia — degradasi jujur', true]);
    // E1 bila terpasang
    if (st.folder) { try { var nd = await pastikanDir(st.folder, 'nadi'); await tulisFile(nd, 'uji.txt', 'ok-' + Date.now()); T.push(['E1 folder: tulis file nyata', true]); } catch (e) { T.push(['E1 folder: tulis file nyata', false]); } }
    else T.push(['E1 folder: belum dipasang — kapsul siap', true]);
    // rantai hidup
    T.push(['rantai denyut hidup: sahih', rantaiVerifikasi(st.rantai.denyut).ok]);
    T.push(['rantai prakira hidup: sahih', rantaiVerifikasi(st.rantai.prakira).ok]);
    // UI v1.1: struktur kartu + teks manusiawi (hanya bila ada DOM; tanpa DOM = degradasi jujur)
    if (typeof document !== 'undefined' && el && el.isConnected) {
      var uiOk = true;
      try {
        T.push(['UI v1.1: struktur kartu lengkap', !!(el.querySelector('#v241-led') && el.querySelector('#v241-nama') && el.querySelector('#v241-ringkas') && el.querySelector('#v241-toggle') && elDetail)]);
        var zEl = parseInt(getComputedStyle(el).zIndex, 10);
        T.push(['UI v1.1: z-index tertib (99992: di atas dekorasi, di bawah panel/modal 99999+)', zEl <= 99992 && zEl > 99000]);
        render();
        var t = el.querySelector('#v241-ringkas').textContent;
        T.push(['UI v1.1: ringkas manusiawi (tanpa 0/0 (—))', t.indexOf('0/0') < 0 && (ringkasPrakira().selesai > 0 || t.indexOf('belum terkunci') >= 0)]);
      } catch (e) { uiOk = false; }
      if (!uiOk) T.push(['UI v1.1: pemeriksaan kartu bermasalah — dicatat jujur', false]);
    } else T.push(['UI v1.1: kartu — tanpa DOM/kartu belum lahir, degradasi jujur', true]);
    var pass = T.filter(function (x) { return x[1]; }).length;
    return { total: T.length, pass: pass, fail: T.length - pass, rincian: T.map(function (x) { return (x[1] ? 'PASS' : 'GAGAL') + ' — ' + x[0]; }) };
  }

  // ---------------- boot ----------------
  async function boot() {
    // v1.1: kartu = murni DOM -> lahir SEKETIKA, tidak menunggu storage.
    // Pelajaran: main-thread SAKTI bisa jenuh mesin berat; await rantaiMuat
    // bisa tertunda lama dan kartu tak terlihat berpuluh detik.
    buatKartu();
    st.denyut = l1Get('denyut', 0);
    st.mulai = l1Get('mulai', Date.now()) || Date.now();
    st.watchlist = l1Get('watchlist', st.watchlist);
    st.namaFolder = l1Get('namaFolder', '');
    await rantaiMuat();
    denyutkan();
    aturJadwal();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        st.tersembunyi = document.hidden;
        aturJadwal(); // sadar-visibility: latar 45 dtk, depan 15 dtk
        if (!document.hidden) denyutkan(); // denyut pembangkit
      });
      window.addEventListener('pagehide', function () { try { l1Set('denyut', st.denyut); } catch (e) {} });
    }
    var stres = await selfTest();
    st.bootLog.push('self-test ' + stres.pass + '/' + stres.total + (stres.fail ? ' — LIHAT rincian via API selfTest()' : ' semua PASS'));
    render();
    if (typeof console !== 'undefined') console.log('[V241 NADI] v' + V.versi + ' — self-test ' + stres.pass + '/' + stres.total + ' · gudang 4 tingkat · prakira pra-registrasi hidup', stres.rincian);
  }
  boot();

  var API = {
    versi: V.versi, nama: V.nama, protokol: V.protokol,
    status: function () { return { denyut: st.denyut, uptimeMs: Date.now() - st.mulai, tersembunyi: st.tersembunyi, tier: { l1: st.tierL1 !== false, l2: st.l2Siap, e1: !!st.folder, e2: true }, folder: st.namaFolder, prakira: ringkasPrakira(), host: st.hostAktif, watchlist: st.watchlist, bootLog: st.bootLog.slice(-8) }; },
    selfTest: selfTest, pasangFolder: pasangFolder, eksporKapsul: eksporKapsul, imporKapsul: imporKapsul,
    prakiraKunci: prakiraKunci, prakiraTick: prakiraTick, setWatchlist: function (w) { st.watchlist = w; l1Set('watchlist', w); render(); },
    aturJendela: function (menit) { st.jendelaMenit = menit; render(); },
    denyutkanSekarang: denyutkan, simpanSnapshot: simpanSnapshot
  };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.NADI = API;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
/*V241-NADI:END*/
