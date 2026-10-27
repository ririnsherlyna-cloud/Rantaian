/* ============================================================
   V284-PROTOLIFE — LAPIS PENAMPIL (UI)
   Panggung = dunia penuh selalu tampak utuh (fit, tanpa crop/zoom).
   Teks = overlay DOM terpisah total dari kanvas.
   Wujud = peta genom makhluk terdepan yang benar-benar dieksekusi VM.
   ============================================================ */
'use strict';
(function () {
  const K = window.KEHIDUPAN;
  const $ = (id) => document.getElementById(id);

  /* ---------- keadaan UI ---------- */
  let speed = 1, jeda = false, lastText = 0, lastSimpan = 0;
  const KUNCI = 'mp_kehidupan_v284';

  function simpanLokal() {
    try {
      const d = K.simpan();
      if (d) localStorage.setItem(KUNCI, JSON.stringify(d));
    } catch (e) { /* penyimpanan penuh — dunia tetap jalan */ }
  }

  /* ---------- boot ---------- */
  function boot() {
    let muatDari = null;
    try { const s = localStorage.getItem(KUNCI); if (s) muatDari = JSON.parse(s); } catch (e) { muatDari = null; }
    const benih = 'protolife-' + (muatDari ? muatDari.benihStr : Date.now() + '-' + ((Math.random() * 1e9) | 0));
    K.boot(benih, muatDari);
    if (muatDari) tambahLogUI('Dunia dilanjutkan dari ingatan perangkat — denyut ke-' + (muatDari.tick | 0).toLocaleString('id-ID') + '.');
    pasangPasar();
    requestAnimationFrame(loop);
    setInterval(simpanLokal, 8000);
    window.addEventListener('beforeunload', simpanLokal);
    document.addEventListener('visibilitychange', () => { if (document.hidden) simpanLokal(); });
    pasangTab();
    pasangKecepatan();
  }

  /* ---------- pasar nyata ---------- */
  async function pasangPasar() {
    const url = (location.protocol === 'file:') ? null : new URL('arena-keadaan.json', location.href).href;
    if (!url) { setChip('MANDIRI', 'file:// — tanpa pasar'); return; }
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      const r = await fetch(url + '?t=' + Date.now(), { signal: ac.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const tp = Array.isArray(j.todayPicks) ? j.todayPicks : [];
      const bytes = tp.slice(0, 4).map(p => Math.max(0, Math.min(255, Math.round((p.confidence || 0) * 2.55))));
      while (bytes.length < 4) bytes.push(0);
      K.setPasar(bytes, 'todayPicks.confidence ×2,55', 'live');
      setChip('PASAR-LIVE', bytes.join(','));
      const el = $('pasarBytes'); if (el) el.textContent = bytes.join(' , ');
    } catch (e) {
      setChip('MANDIRI', 'pasar tak terjangkau: ' + (e && e.message ? e.message : 'galat'));
    }
  }

  function setChip(judul, detail) {
    const c = $('chipPasar'); if (!c) return;
    c.textContent = judul + (detail ? ' · ' + detail : '');
    c.className = 'chip ' + (judul === 'PASAR-LIVE' ? 'hijau' : 'kelabu');
  }

  function tambahLogUI(teks) {
    const el = $('logList'); if (!el) return;
    const d = document.createElement('div');
    d.className = 'entri'; d.textContent = '[' + new Date().toISOString().slice(11, 19) + '] ' + teks;
    el.prepend(d);
  }

  /* ---------- tab panel ---------- */
  function pasangTab() {
    document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('aktif'));
      document.querySelectorAll('.isi').forEach(x => x.classList.remove('aktif'));
      b.classList.add('aktif');
      const el = $(b.dataset.isi); if (el) el.classList.add('aktif');
    }));
  }
  function pasangKecepatan() {
    document.querySelectorAll('.kecepatan button').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.v === 'jeda') { jeda = !jeda; b.classList.toggle('aktif', jeda); }
      else { speed = +b.dataset.v; jeda = false; document.querySelectorAll('.kecepatan button').forEach(x => { if (x.dataset.v !== 'jeda') x.classList.toggle('aktif', +x.dataset.v === speed); }); }
    }));
  }

  /* ---------- LOOP UTAMA ---------- */
  function loop(ts) {
    if (!jeda) K.denyut(speed);
    gambar();
    if (ts - lastText > 250) { lastText = ts; teks(); }
    if (performance.now() - lastSimpan > 8000) { lastSimpan = performance.now(); simpanLokal(); }
    requestAnimationFrame(loop);
  }

  /* ---------- KANVAS: dunia penuh, selalu utuh ---------- */
  const cv = $('dunia');
  const cx2 = cv.getContext('2d');
  let skala = 1, ox = 0, oy = 0;

  function sesuaikan() {
    const r = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(60, (r.width | 0)) * dpr;
    cv.height = Math.max(60, (r.height | 0)) * dpr;
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    const m = Math.min(cv.width / K.W, cv.height / K.H) * 0.96;
    skala = m; ox = (cv.width - m * K.W) / 2; oy = (cv.height - m * K.H) / 2;
  }
  window.addEventListener('resize', sesuaikan);

  function gambar() {
    const ts = performance.now();
    const st = K.state(); if (!st) return;
    // sinkron ukuran kanvas dengan kotak panggung setiap bingkai (responsif total)
    const dpr0 = Math.min(2, window.devicePixelRatio || 1);
    const kotak = cv.parentElement.getBoundingClientRect();
    if (Math.abs(kotak.width * dpr0 - cv.width) > 2 || Math.abs(kotak.height * dpr0 - cv.height) > 2) sesuaikan();
    if (cv.width < 10 || cv.height < 10) sesuaikan();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cx2.fillStyle = '#04070d';
    cx2.fillRect(0, 0, cv.width, cv.height);
    // bingkai dunia
    cx2.strokeStyle = 'rgba(79,209,197,.18)';
    cx2.lineWidth = 1 * dpr;
    cx2.strokeRect(ox, oy, skala * K.W, skala * K.H);
    // makanan (energi dunia)
    const food = st._food;
    cx2.fillStyle = 'rgba(94,234,168,.55)';
    for (let i = 0; i < food.length; i++) {
      const f = food[i] | 0;
      if (f < 8) continue;
      const x = i % K.W, y = (i / K.W) | 0;
      const a = Math.min(0.8, 0.15 + f / 240);
      cx2.globalAlpha = a;
      cx2.fillRect(ox + x * skala, oy + y * skala, Math.max(1.2, skala * 0.5), Math.max(1.2, skala * 0.5));
    }
    cx2.globalAlpha = 1;
    // struktur
    for (const s of st.strukturDet) {
      const px = ox + (s.x + 0.5) * skala, py = oy + (s.y + 0.5) * skala, r = skala * 1.4;
      cx2.lineWidth = 1.5 * dpr;
      if (s.tipe === 1) { cx2.strokeStyle = '#4fd1c5'; berlian(px, py, r); }
      else if (s.tipe === 2) { cx2.strokeStyle = '#f6c453'; cincin(px, py, r); }
      else if (s.tipe === 3) { cx2.strokeStyle = '#7aa2ff'; segitiga(px, py, r); }
    }
    // makhluk
    let lead = null;
    for (const o of st.orgs) {
      if (!lead || o.gen > lead.gen) lead = o;
      const px = ox + (o.x + 0.5) * skala, py = oy + (o.y + 0.5) * skala;
      const r = Math.max(2, skala * (0.55 + Math.min(1.5, o.e / 160)));
      const hue = (o.id * 47 + o.gen * 13) % 360;
      cx2.globalAlpha = 0.9;
      cx2.fillStyle = 'hsl(' + hue + ',85%,64%)';
      cx2.beginPath(); cx2.arc(px, py, r, 0, 6.2832); cx2.fill();
      cx2.globalAlpha = 0.16;
      cx2.beginPath(); cx2.arc(px, py, r * 1.7, 0, 6.2832); cx2.fill();
      cx2.globalAlpha = 1;
    }
    // WUJUD MAKHLUK TERDEPAN = peta genomnya yang benar-benar berjalan
    if (lead && lead.g) {
      const px = ox + (lead.x + 0.5) * skala, py = oy + (lead.y + 0.5) * skala;
      const n = lead.g.length, denyut = 1 + 0.08 * Math.sin(ts / 220 + st.tick % 7);
      cx2.beginPath();
      for (let i = 0; i <= n; i++) {
        const b = lead.g[i % n];
        const ang = (i / n) * 6.2832 - 1.57 + (st.tick % 360) * 0.002;
        const rr = skala * (2.6 + (b / 15) * 3.4) * denyut;
        const x = px + Math.cos(ang) * rr, y = py + Math.sin(ang) * rr;
        if (i === 0) cx2.moveTo(x, y); else cx2.lineTo(x, y);
      }
      cx2.closePath();
      cx2.strokeStyle = 'rgba(255,255,255,.75)'; cx2.lineWidth = 1.2 * dpr; cx2.stroke();
      cx2.fillStyle = 'rgba(79,209,197,.10)'; cx2.fill();
      // bekas karat nyata: merah di verteks byte yang berbeda dari cetakan lahir
      if (lead.t) {
        cx2.fillStyle = '#ff6b6b';
        for (let i = 0; i < n; i++) if (lead.g[i] !== lead.t[i]) {
          const ang = (i / n) * 6.2832 - 1.57 + (st.tick % 360) * 0.002;
          const rr = skala * (2.6 + (lead.g[i] / 15) * 3.4) * denyut;
          cx2.beginPath(); cx2.arc(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr, 1.6 * dpr, 0, 6.2832); cx2.fill();
        }
      }
    }
  }
  function berlian(x, y, r) { cx2.beginPath(); cx2.moveTo(x, y - r); cx2.lineTo(x + r, y); cx2.lineTo(x, y + r); cx2.lineTo(x - r, y); cx2.closePath(); cx2.stroke(); }
  function cincin(x, y, r) { cx2.beginPath(); cx2.arc(x, y, r, 0, 6.2832); cx2.stroke(); }
  function segitiga(x, y, r) { cx2.beginPath(); cx2.moveTo(x, y - r); cx2.lineTo(x + r, y + r); cx2.lineTo(x - r, y + r); cx2.closePath(); cx2.stroke(); }

  /* ---------- TEKS OVERLAY (terpisah dari kanvas) ---------- */
  function fmt(n) { return (n | 0).toLocaleString('id-ID'); }
  function teks() {
    const st = K.state(); if (!st) return;
    $('tTick').textContent = fmt(st.tick);
    $('tFase').textContent = st.fase;
    $('ringFase').style.strokeDashoffset = String(100 - st.faseProgres * 100);
    $('sPop').textContent = st.pop; $('sE').textContent = st.e;
    $('sFood').textContent = fmt(st.ftot); $('sStruk').textContent = st.struktur;
    $('sRot').textContent = st.rot; $('sLahir').textContent = fmt(st.lahir);
    $('sMati').textContent = fmt(st.mati); $('sBagi').textContent = fmt(st.bagi);
    $('sInstr').textContent = fmt(st.statInstr); $('sLuka').textContent = st.luka;
    $('sCaps').textContent = st.caps.length + '/10'; $('sInjek').textContent = st.injeksi;
    $('wawasan').textContent = st.wawasan || '—';
    // OTAK
    const t = st.target;
    if (t) {
      $('tgNama').textContent = t.id + ' · ' + t.nama + (t.subset ? ' (mode NAND-saja)' : '');
      $('tgDesk').textContent = t.desk + (t.id === 'T9' && st.pasar.mode !== 'live' ? ' — TERKUNCI: menunggu byte pasar nyata.' : '');
      $('tgSkor').textContent = (st.sintesis.skor * 100).toFixed(0) + '%';
      $('tgEval').textContent = fmt(st.sintesis.evals);
      $('tgRest').textContent = fmt(st.sintesis.restarts);
      $('tgBest').textContent = st.sintesis.bestHex || '—';
      $('tgSisa').textContent = (10 - st.targetSelesai) + ' target tersisa';
    }
    // makhluk table
    const tb = $('makhBody');
    if (tb) {
      tb.innerHTML = '';
      st.orgs.slice(0, 8).forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>#' + o.id + '</td><td>G' + o.gen + '</td><td>' + o.e.toFixed(0) + '</td><td>' + (o.luka ? '<b class="merah">' + o.luka + '</b>' : '0') + '</td><td>' + fmt(o.age) + '</td>';
        tb.appendChild(tr);
      });
    }
    // TEMUAN
    const cl = $('capList');
    if (cl) {
      cl.innerHTML = '';
      if (!st.caps.length) cl.innerHTML = '<div class="kosong">Belum ada penemuan — semua kemampuan harus lulus uji vektor dulu. Tidak ada yang dihadiahkan.</div>';
      st.caps.slice().reverse().forEach(c => {
        const d = document.createElement('div');
        d.className = 'cap';
        d.innerHTML = '<div class="cap-j"><b>' + c.id + ' ' + c.nama + '</b>' + (c.buka ? '<span class="tag">' + c.buka + '</span>' : '') + '</div>' +
          '<div class="cap-d">genom <code>' + c.gHex + '</code> · ' + c.vektor + ' vektor lulus · ' + fmt(c.evals) + ' eval · denyut ' + fmt(c.tick) + (c.subset ? ' · NAND-saja' : '') + '</div>';
        cl.appendChild(d);
      });
      gambarSpark(st.hist);
    }
    // LOG
    const lg = $('logList');
    if (lg && lg.dataset.sumber !== 'engine') {
      lg.innerHTML = ''; lg.dataset.sumber = 'engine';
      st.log.slice().reverse().forEach(e => {
        const d = document.createElement('div');
        d.className = 'entri';
        d.innerHTML = '<span class="w">' + e.t + '</span> <span class="f">' + e.fase + '</span> ' + e.teks;
        lg.appendChild(d);
      });
    }
  }

  function gambarSpark(hist) {
    const c = $('spark'); if (!c || !hist || hist.length < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth || 300, h = 64;
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const maxCaps = Math.max(1, hist[hist.length - 1].caps), maxPop = Math.max(8, ...hist.map(x => x.pop)), maxE = Math.max(60, ...hist.map(x => x.e));
    const X = (i) => (i / (hist.length - 1)) * (w - 2) + 1;
    function garis(fn, warna) {
      g.strokeStyle = warna; g.lineWidth = 1.5; g.beginPath();
      hist.forEach((s, i) => { const y = h - 4 - fn(s) * (h - 10); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); });
      g.stroke();
    }
    garis(s => s.caps / maxCaps, '#4fd1c5');
    garis(s => s.pop / maxPop, '#f6c453');
    garis(s => s.e / maxE, '#7aa2ff');
    g.font = '9px monospace'; g.fillStyle = '#8fa3bd';
    g.fillText('kemampuan', 4, 10); g.fillStyle = '#f6c453'; g.fillText('populasi', 62, 10); g.fillStyle = '#7aa2ff'; g.fillText('energi rata', 116, 10);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
