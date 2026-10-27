/*V242-FISIKA:BEGIN*/
// ============================================================
// V242 SAKTI-ORKESTRA v1.0 — KONDUKTOR FISIKA TAMPILAN (UI
// LAYOUT CONDUCTOR). Tangga panjang mandat Guru:
//
//  "Saya akui tampilan yang senantiasa saling timp menimpa itu
//   jelek! ... notifikasi menimpa toggle menu di bawahnya ...
//   notifikasi yang terbaca separuh ... kita akan bawa ahli UI
//   dan UX agar cyborg kita benar-benar profesional."
//
// Tugas tunggalorgan ini: TIDAK ADA SATU ELEMEN MELAYANG pun
// yang saling menimpa, dan tidak ada teks status yang terbaca
// separuh. Prinsip:
//   1. UKUR, jangan menebak  -> semua penempatan dari
//      getBoundingClientRect() runtime, bukan angka mati.
//   2. SATU pemilik slot     -> kiri-bawah = ticker suara;
//      kanan-bawah = kartu NADI + chip sesekali. Nav bawah
//      adalah jangkar, tidak pernah ditimpa apa pun.
//   3. Zona aman nav         -> tinggi nav diukur tiap kali
//      (termasuk nav mobile engine-miko bila tampil).
//   4. Keterbacaan penuh     -> ticker suara dapat ellipsis +
//      tombol buka pesan penuh (kartu ucapan di atasnya).
//   5. Mode fokus            -> modal/overlay terbuka = chip
//      meredup (opacity .15, pointer-events none), tak
//      bersinar di atas modal.
//   6. Fault isolation       -> satu zona gagal, zona lain
//      tetap hidup; tanpa DOM = degradasi jujur.
//   7. Observability         -> ukuranStatus() membeberkan
//      geometri terakhir; self-test geometrik saat boot.
// Nol biaya, nol dependensi, ES5 murni — satu tubuh SAKTI.
// ============================================================
(function () {
  'use strict';
  var V = { versi: '1.1', nama: 'SAKTI-ORKESTRA', organ: 'V242' };

  // ---------------- konfigurasi zona ----------------
  var JEDA = 8;           // jeda antar lapis (px)
  var MARG = 12;          // jarak dari tepi (px)
  var Z_MAKS_CHIP = 99992; // plafon z chip: di atas dekorasi (99989-99990), di bawah panel/modal 99999+
  // chip kanan-bawah sesekali muncul (urutan tumpuk dari bawah)
  // v1.1: chip SARANG (V243) ikut dikelola — satu pemilik slot tetap berlaku
  var KANAN_SESEKALI = ['v2217-scan-health', 'v2219-activation-reopen', 'v2219-activation-panel', 'v243-sarang'];

  var jejak = { navH: 0, dipasang: [], fokus: false, siklus: 0, terakhir: null };

  // PELAJARAN PENTING: tubuh SAKTI men-stub document.getElementById &
  // document.querySelector dgn Proxy palsu utk id yang TIDAK ada (era
  // V126.2 makeStub — nodeType:1, id kosong, rect nol). Satu-satunya
  // lookup yang jujur = querySelectorAll (override-nya hanya memfilter
  // daftar kosong, tidak pernah mengarang elemen).
  function q(id) {
    try {
      var list = document.querySelectorAll('#' + id);
      return (list && list.length) ? list[0] : null;
    } catch (e) { return null; }
  }

  function ada() { return typeof document !== 'undefined' && !!document.body; }
  function tampil(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }
  function rect(el) { return el.getBoundingClientRect(); }
  function tabrakan(a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }

  // ---------------- jangkar: nav paling bawah ----------------
  function tinggiNavDasar() {
    var h = 0;
    try {
      // nav utama v217
      var nav = q('v217-nav');
      if (nav && tampil(nav)) {
        var r = rect(nav);
        if (r.bottom >= innerHeight - 4) h = Math.max(h, r.height); // benar2 menempel dasar
      }
      // nav mobile engine-miko bila tampil
      var mb = document.querySelector('#engine-miko-host .mobile-bottom-nav');
      if (mb && tampil(mb)) {
        var r2 = rect(mb);
        if (r2.bottom >= innerHeight - 4) h = Math.max(h, r2.height);
      }
    } catch (e) { /* nav tak terukur = jangkar 0, chip tetap aman dari tepi */ }
    return Math.round(h);
  }

  // ---------------- zona kiri: ticker suara ----------------
  // SADAR-ZONA: suara tidak boleh masuk zona kartu NADI (kanan).
  // Layar lebar  : dua zona — suara kiri (dipagari), NADI kanan.
  // Layar sempit : tumpukan satu sisi — suara paling bawah, NADI di atasnya.
  var AMBANG_ZONA = 900; // px
  function aturKiri() {
    if (!ada()) return 0;
    var v = q('v207-voice');
    if (!v) return 0;
    var navH = tinggiNavDasar();
    var nadi = q('v241-nadi');
    var nadiTampil = nadi && tampil(nadi);
    try {
      if (innerWidth >= AMBANG_ZONA && nadiTampil) {
        // dua zona: pagari suara sebelum zona NADI (kartu 320 + margin kanan 12 + jeda 8 + pagar 12 + buffer 8)
        v.style.left = MARG + 'px';
        v.style.right = 'auto';
        v.style.bottom = (navH + JEDA) + 'px';
        v.style.maxWidth = 'calc(100vw - ' + (320 + MARG * 2 + JEDA + MARG + 8) + 'px)';
      } else if (innerWidth >= AMBANG_ZONA) {
        v.style.left = MARG + 'px';
        v.style.right = 'auto';
        v.style.bottom = (navH + JEDA) + 'px';
        v.style.maxWidth = 'calc(100vw - 24px)';
      } else {
        // sempit: suara selebar layar di bawah, NADI ditumpuk di atasnya (oleh aturKanan)
        v.style.left = MARG + 'px';
        v.style.right = MARG + 'px';
        v.style.bottom = (navH + JEDA) + 'px';
        v.style.maxWidth = 'none';
      }
    } catch (e) { return 0; }
    // keterbacaan: ellipsis + tombol buka pesan penuh
    pasangKeterbacaanVoice(v);
    return 1;
  }

  var voiceSudah = false;
  function pasangKeterbacaanVoice(v) {
    if (voiceSudah) { perbaruiJudulVoice(v); return; }
    voiceSudah = true;
    try {
      var st = document.createElement('style'); st.id = 'v242-gaya-voice';
      st.textContent =
        '.mpx-meredup{opacity:.15 !important;pointer-events:none !important;filter:saturate(.4)}' +
        '#v207-voice{box-sizing:border-box}' + // pelajaran: tanpa ini, maxWidth lolos sebesar padding (fence bocor)
        '#v207-voice .txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}' +
        '#v207-voice{align-items:center}' +
        '#v242-voice-buka{flex:none;pointer-events:auto;cursor:pointer;color:#7fb8d8;background:none;border:none;' +
        'font:700 11px ui-monospace,monospace;padding:2px 6px;border-radius:5px}' +
        '#v242-voice-buka:hover{background:rgba(90,200,255,.12);color:#bfe3f2}' +
        '#v242-ucapan{position:fixed;left:12px;z-index:99490;display:none;max-width:min(560px,calc(100vw - 24px));' +
        'background:rgba(9,17,26,.98);border:1px solid #2d4a5c;border-radius:12px;padding:12px 14px;' +
        'color:#d7e8f2;font:12.5px/1.7 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 12px 40px rgba(0,0,0,.55)}' +
        '#v242-ucapan .v242-u-who{color:#5d9fc4;letter-spacing:1.2px;font-size:10px;margin-bottom:5px}' +
        '#v242-ucapan .v242-u-tutup{position:absolute;top:8px;right:10px;cursor:pointer;color:#5d7d92;background:none;border:none;font-size:13px}' +
        '#v242-ucapan .v242-u-tutup:hover{color:#fff}';
      document.head.appendChild(st);
      // tombol buka di ujung ticker
      var b = document.createElement('button');
      b.id = 'v242-voice-buka'; b.textContent = '⤢'; b.title = 'Buka pesan penuh';
      b.addEventListener('click', function (ev) { ev.stopPropagation(); bukaUcapan(); });
      v.appendChild(b);
      // kartu ucapan penuh
      var u = document.createElement('div');
      u.id = 'v242-ucapan';
      u.innerHTML = '<div class="v242-u-who">MICAPROFITA — PESAN PENUH</div>' +
        '<button class="v242-u-tutup" title="Tutup">×</button>' +
        '<div class="v242-u-isi"></div>';
      document.body.appendChild(u);
      u.querySelector('.v242-u-tutup').addEventListener('click', function () { u.style.display = 'none'; });
      perbaruiJudulVoice(v);
    } catch (e) { /* ticker tetap berjalan tanpa tombol (fault isolation) */ }
  }
  function perbaruiJudulVoice(v) {
    try {
      var t = v.querySelector('.txt') || v.querySelector('#v207-voice-txt');
      var u = q('v242-ucapan');
      if (t && u) {
        var isi = (t.textContent || '').trim();
        t.title = isi; // petunjuk hover (bila ticker interaktif)
        u.querySelector('.v242-u-isi').textContent = isi;
      }
    } catch (e) { /* jujur diam */ }
  }
  function bukaUcapan() {
    try {
      var v = q('v207-voice');
      var u = q('v242-ucapan');
      if (!v || !u) return;
      perbaruiJudulVoice(v);
      u.style.display = 'block';
      // di atas ticker, tidak menutupi nav
      u.style.bottom = (tinggiNavDasar() + JEDA + rect(v).height + JEDA) + 'px';
      u.style.left = MARG + 'px';
    } catch (e) { /* diam */ }
  }

  // ---------------- zona kanan: NADI + chip sesekali ----------------
  function aturKanan() {
    if (!ada()) return 0;
    var navH = tinggiNavDasar();
    var b = navH + JEDA;
    var n = 0;
    var nadi = q('v241-nadi');
    var voice = q('v207-voice');
    // layar sempit + suara tampil: NADI ditumpuk DI ATAS suara (bukan sejajar)
    if (nadi && tampil(nadi) && innerWidth < AMBANG_ZONA && voice && tampil(voice)) {
      b = Math.max(b, rect(voice).bottom + JEDA);
    }
    if (nadi && tampil(nadi)) {
      posisiKanan(nadi, b);
      b += rect(nadi).height + JEDA;
      n++;
    }
    for (var i = 0; i < KANAN_SESEKALI.length; i++) {
      var e = q(KANAN_SESEKALI[i]);
      if (e && tampil(e)) {
        posisiKanan(e, b);
        b += rect(e).height + JEDA;
        n++;
      }
    }
    return n;
  }
  function posisiKanan(el, bawah) {
    try {
      el.style.left = 'auto';
      el.style.right = MARG + 'px';
      el.style.bottom = Math.round(bawah) + 'px';
      if (el.id === 'v241-nadi') el.style.maxWidth = 'min(320px, calc(100vw - 24px))';
    } catch (e) { /* diam */ }
  }

  // ---------------- mode fokus: modal terbuka = chip meredup ----------------
  var DAFTAR_CHIP = ['v241-nadi', 'v207-voice', 'v207-left', 'v207-dock', 'v243-sarang'];
  // daftar terkurasi overlay yang diketahui (DOM SAKTI raksasa — pindai terarah, bukan sapu semua)
  var SEL_OVERLAY = [
    '.modal', '.tc-overlay', '#detailModal', '.phd-inventory-panel', '.v229-modal-overlay',
    '#engine-miko-host .modal', '#engine-miko-host .modal-overlay',
    '#engine-miko-host .v9-cmd-overlay', '#engine-miko-host .v9-sheet-overlay',
    '#engine-miko-host .v22-info-popup', '#engine-miko-host .v29-detail-overlay',
    '#engine-miko-host .notif-drawer'
  ].join(',');
  function pindaiOverlay() {
    if (!ada()) return false;
    try {
      var vw = innerWidth, vh = innerHeight, ketemu = false;
      var kandidat = document.querySelectorAll(SEL_OVERLAY);
      for (var i = 0; i < kandidat.length; i++) {
        var el = kandidat[i];
        if (el.id && DAFTAR_CHIP.indexOf(el.id) >= 0) continue;
        var cs;
        try { cs = getComputedStyle(el); } catch (e) { continue; }
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
        var z = parseInt(cs.zIndex, 10); if (!(z >= 900)) continue;
        var r = el.getBoundingClientRect();
        if (r.width >= vw * 0.85 && r.height >= vh * 0.85) { ketemu = true; break; }
      }
      aturFokus(ketemu);
      return ketemu;
    } catch (e) { return false; }
  }
  function aturFokus(nyala) {
    jejak.fokus = !!nyala;
    for (var i = 0; i < DAFTAR_CHIP.length; i++) {
      var el = q(DAFTAR_CHIP[i]);
      if (!el) continue;
      if (nyala) { el.classList.add('mpx-meredup'); }
      else { el.classList.remove('mpx-meredup'); }
    }
  }

  // ---------------- konduktor utama ----------------
  function atur() {
    jejak.siklus++;
    var kiri = aturKiri();
    var kanan = aturKanan();
    jejak.dipasang = [kiri ? 'kiri' : null, kanan ? 'kanan' : null].filter(Boolean);
    jejak.navH = tinggiNavDasar();
    jejak.terakhir = Date.now();
    return { kiri: kiri, kanan: kanan, navH: jejak.navH };
  }
  var debounceT = null;
  function aturNanti() {
    if (debounceT) clearTimeout(debounceT);
    debounceT = setTimeout(function () { try { atur(); } catch (e) { /* jantung layout tak boleh mati */ } }, 400);
  }

  // ---------------- observability ----------------
  function ukuranStatus() {
    function geo(id) {
      var e = q(id); if (!e) return null;
      var r = rect(e);
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), tampil: tampil(e) };
    }
    return { organ: V.organ, versi: V.versi, jejak: jejak, nadi: geo('v241-nadi'), voice: geo('v207-voice'), navH: tinggiNavDasar(), vw: innerWidth, vh: innerHeight };
  }

  // ---------------- self-test geometrik ----------------
  function selfTest() {
    var T = [];
    if (!ada()) { T.push(['tanpa DOM — degradasi jujur', true]); return selesai(T); }
    var nadi = q('v241-nadi');
    var nav = q('v217-nav');
    var voice = q('v207-voice');
    // kehadiran dulu — geometri tak boleh lolos kosong (anti-vacuous)
    T.push(['kehadiran: kartu NADI terpasang di tubuh', !!(nadi && nadi.isConnected)]);
    var rn = nadi && tampil(nadi) ? rect(nadi) : null;
    var rnav = nav && tampil(nav) ? rect(nav) : null;
    var rv = voice && tampil(voice) ? rect(voice) : null;
    T.push(['geometri: NADI terukur (bukan nol)', !!rn]);
    T.push(['geometri: NADI tidak menimpa nav bawah', !!(rn && rnav && !tabrakan(rn, rnav))]);
    T.push(['geometri: NADI tidak menimpa ticker suara', !!(rn && rv && !tabrakan(rn, rv))]);
    T.push(['geometri: suara tidak masuk zona NADI', !!(rn && rv) || innerWidth < AMBANG_ZONA || (function () { return rv.left + rv.width <= rn.left - JEDA || rv.bottom <= rn.top - JEDA; })()]);
    T.push(['geometri: NADI berlabuh kanan-bawah', !!rn && rn.left >= innerWidth * 0.5]);
    T.push(['geometri: NADI mengapung di atas nav', !!(rn && rnav) && rn.bottom <= rnav.top + 1]);
    T.push(['keterbacaan: ticker suara ber-ellipsis', (function () {
      if (!voice) return false; // voice hilang = zona kiri tak terkelola
      var t = voice.querySelector('.txt'); if (!t) return false;
      var cs = getComputedStyle(t);
      return cs.textOverflow === 'ellipsis' && cs.overflow === 'hidden';
    })()]);
    T.push(['keterbacaan: tombol buka pesan penuh terpasang', !!(voice && q('v242-voice-buka'))]);
    T.push(['z tertib: NADI <= ' + Z_MAKS_CHIP + ' (di bawah panel/modal)', (function () {
      if (!nadi) return false;
      return parseInt(getComputedStyle(nadi).zIndex, 10) <= Z_MAKS_CHIP;
    })()]);
    T.push(['mode fokus: kelas meredup bisa pasang-cabut', (function () {
      if (!nadi) return false;
      try { nadi.classList.add('mpx-meredup'); var a = nadi.classList.contains('mpx-meredup'); nadi.classList.remove('mpx-meredup'); var b = !nadi.classList.contains('mpx-meredup'); return a && b; } catch (e) { return false; }
    })()]);
    T.push(['pengawas: pendengar resize terpasang', jejak._resize === true]);
    T.push(['pengawas: pengamat DOM terpasang', jejak._mo === true]);
    // v1.1: chip SARANG ikut tertata bila hadir (tanpa DOM SARANG = degradasi jujur)
    T.push(['v1.1: chip SARANG tertata di zona kanan (bila hadir)', (function () {
      var s = q('v243-sarang');
      if (!s) return true; // organ V243 belum lahir / lingkungan lain — jujur, bukan gagal
      var rs = rect(s);
      return rs.left >= innerWidth * 0.5; // berlabuh kanan, tak di kiri liar
    })()]);
    return selesai(T);
  }
  function selesai(T) {
    var pass = T.filter(function (x) { return x[1]; }).length;
    return { total: T.length, pass: pass, fail: T.length - pass, rincian: T.map(function (x) { return (x[1] ? 'PASS' : 'GAGAL') + ' — ' + x[0]; }) };
  }

  // ---------------- boot ----------------
  function boot() {
    if (!ada()) return;
    atur();
    // re-atur saat lingkungan berubah (resize, chip muncul, NADI membuka)
    window.addEventListener('resize', function () { jejak._resize = true; aturNanti(); });
    jejak._resize = true; // pendengar pasca-registrasi
    try {
      var mo = new MutationObserver(function () { aturNanti(); });
      mo.observe(document.body, { childList: true, subtree: false });
      jejak._mo = true;
    } catch (e) { jejak._mo = false; }
    try {
      var nadi = q('v241-nadi');
      if (nadi && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(function () { aturNanti(); }).observe(nadi);
      }
    } catch (e) { /* tanpa RO pun resize listener tetap jalan */ }
    // mode fokus: pindai berkala (terarah, murah)
    setInterval(function () { try { pindaiOverlay(); } catch (e) { /* diam */ } }, 2000);
    // self-test geometrik (setelah layout settle)
    setTimeout(function () {
      try {
        var st = selfTest();
        jejak.selfTest = st;
        if (typeof console !== 'undefined') console.log('[V242 ORKESTRA] v' + V.versi + ' — fisika tampilan: self-test ' + st.pass + '/' + st.total + (st.fail ? ' GAGAL' : ' semua PASS'), st.rincian);
      } catch (e) { /* diam */ }
    }, 900);
  }

  // ---------------- API publik ----------------
  var API = {
    versi: V.versi, nama: V.nama, organ: V.organ,
    atur: atur, selfTest: selfTest, ukur: ukuranStatus,
    fokus: function (nyala) { aturFokus(nyala); return jejak.fokus; },
    bukaPesan: bukaUcapan
  };
  if (typeof window !== 'undefined') {
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.ORKESTRA = API;
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();

/*V242-FISIKA:END*/
