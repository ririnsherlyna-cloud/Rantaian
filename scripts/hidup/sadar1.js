#!/usr/bin/env node
'use strict';
/* ================================================================
   SADAR-1 — TUBUH OTONOM cyborg MICAPROFITA (arsitektur DUA SADARI)
   ----------------------------------------------------------------
   Hidup di GitHub Actions, bangun tiap ±20 menit, TANPA PENONTON.
   Bukan simulasi, bukan teater — setiap angka di sini adalah hasil
   kerja nyata:
     1. Membaca rumahnya sendiri: repo MICAPROFITA dari checkout disk
        (pohon file nyata + sha256 nyata per file + isi file nyata).
     2. Menghisap pasar nyata: klines 1j Binance REST publik untuk
        simbol yang dipilih arena sendiri (arena-keadaan.json).
     3. Bereksperimen nyata: uji-jalan (walk-forward) aturan turunan
        genom + HILL-CLIMB kromosom antar-bangun (opt pada data nyata).
     4. Menulis ingatan resmi ke GITHUB via Contents API — ingatan =
        commit, BUKAN localStorage. Siapa pun bisa audit: history
        ruang-hidup/ adalah otaknya yang terbuka.
   SADAR-2 (hidup.html) hanyalah mata interaktif yang membaca ingatan
   ini saat pemilik hadir. Kehidupan tidak menunggu penonton.
   ================================================================ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_DIR = path.resolve(process.env.REPO_DIR || '.');
const [OWN0, REP0] = (process.env.GITHUB_REPOSITORY || 'ririnsherlyna-cloud/Micaprofita-').split('/');
const OWNER = process.env.GH_OWNER || OWN0;
const REPO = process.env.GH_REPO || REP0;
const CABANG = process.env.GH_CABANG || 'main';
const TOK = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const DRY = process.env.S1_DRY === '1' || !TOK;
const MAXBACA = 400000;                     // batas baca isi file (byte) — parsial diakui jujur
const DIR = 'ruang-hidup';                  // rumah ingatannya sendiri (di dalam repo)
const INTEGERS = ['versi.json', 'gerbang.json', 'brain.json', 'arena-keadaan.json',
  'otak/genome-server.json', 'otak/penjaga-keadaan.json', 'otak/performa.json',
  'memori/terkini.json', 'README.md'];
const BINANCE = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];

const pesan = e => (e && (e.message || String(e))) || 'tak-diketahui';
const iso = ts => new Date(ts || Date.now()).toISOString();
const f1 = x => (+x).toFixed(1), f2 = x => (+x).toFixed(2);
const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
const tidur = ms => new Promise(r => setTimeout(r, ms));

async function jF(url, ms = 12000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'sadar1-cyborg' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ---------------- MATEMATIKA PASAR (port dari Sadar-2, teks polos) ---------------- */
function ema(arr, n) { const k = 2 / (n + 1); let e = arr[0], out = [e];
  for (let i = 1; i < arr.length; i++) { e = arr[i] * k + e * (1 - k); out.push(e); } return out; }
function rsiSeri(c, n = 14) {
  let naik = 0, turun = 0; const out = [];
  for (let i = 1; i < c.length; i++) { const ch = c[i] - c[i - 1], u = Math.max(ch, 0), d = Math.max(-ch, 0);
    if (i <= n) { naik += u; turun += d; if (i === n) { naik /= n; turun /= n; out[i] = 100 - 100 / (1 + naik / (turun || 1e-9)); } }
    else { naik = (naik * (n - 1) + u) / n; turun = (turun * (n - 1) + d) / n; out[i] = 100 - 100 / (1 + naik / (turun || 1e-9)); } }
  return out; }
function rsiAkhir(c) { const s = rsiSeri(c); return s.length ? (s[s.length - 1] ?? 50) : 50; }
function atrK(lilin, n = 14) {
  const tr = []; for (let i = 1; i < lilin.length; i++) { const l = lilin[i];
    tr.push(Math.max(l.h - l.l, Math.abs(l.h - lilin[i - 1].c), Math.abs(l.l - lilin[i - 1].c))); }
  let a = tr.slice(0, n).reduce((x, y) => x + y, 0) / n;
  for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n;
  return a; }
function analisaLilin(lilin) {
  const c = lilin.map(x => x.c), terakhir = c[c.length - 1];
  const e20 = ema(c, 20), e50 = ema(c, 50);
  const ret = []; for (let i = 1; i < c.length; i++) ret.push(c[i] / c[i - 1] - 1);
  const vol = Math.sqrt(ret.slice(-48).reduce((a, x) => a + x * x, 0) / 48) * 100;
  const mom7 = c[c.length - 1] / c[c.length - 8] - 1, mom48 = c[c.length - 1] / c[c.length - 49] - 1;
  const chg = c[c.length - 1] / c[c.length - 25] - 1;
  return { harga: terakhir, chg: chg * 100, ema20: e20[e20.length - 1], ema50: e50[e50.length - 1],
    rsi: rsiAkhir(c), atr: atrK(lilin), mom7: mom7 * 100, mom48: mom48 * 100, vol };
}
async function lilinAmbil(sym) {
  for (const g of BINANCE) {
    try { const d = await jF(`${g}/api/v3/klines?symbol=${sym}&interval=1h&limit=200`, 11000);
      if (Array.isArray(d) && d.length > 60)
        return d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
    } catch (e) {}
  }
  throw new Error('lilin-gagal:' + sym);
}
/* UJI-JALAN nyata dengan KROMOSOM (param berevolusi antar-bangun) */
function ujiJalan(lilin, kr) {
  const c = lilin.map(x => x.c), e20 = ema(c, 20), e50 = ema(c, 50), rsiS = rsiSeri(c);
  const hold = kr.holdJam || 24, trades = [];
  let i = 60;
  while (i < c.length - hold) {
    const sah = e20[i] > e50[i] && (rsiS[i] ?? 50) < kr.rsiMax &&
      c[i] > c[i - 7] * (1 + (kr.momMin || 0) / 100);
    if (sah) { trades.push((c[i + hold] - c[i]) / c[i] * 100); i += hold; } else i++;
  }
  if (!trades.length) return { n: 0, menang: 0, net: 0, netCek: 0, catatan: 'tidak ada sinyal sah pada 200 lilin — jujur kosong' };
  const net = trades.reduce((a, x) => a + x, 0);
  const netCek = Math.expm1(trades.reduce((a, x) => a + Math.log1p(x / 100), 0)) * 100;
  return { n: trades.length, menang: trades.filter(x => x > 0).length, net, netCek,
    terbaik: Math.max(...trades), terburuk: Math.min(...trades) };
}
function auditPick(pick, an) {
  if (!pick || !an) return null;
  const buy = pick.direction === 'BUY';
  const searah = buy ? an.mom7 > 0 : an.mom7 < 0;
  const align = buy ? an.ema20 > an.ema50 : an.ema20 < an.ema50;
  const vonis = searah && align ? 'SEPAKAT' : (!searah && !align ? 'MENDEVIASI' : 'SETENGAH');
  return { arah: pick.direction, conf: pick.confidence, vonis,
    ket: `mom7 ${f2(an.mom7)}% · ema ${an.ema20 > an.ema50 ? '20>50' : '20<50'} · RSI ${f1(an.rsi)}` };
}

/* ---------------- PEMBACA FAKTA (isi file nyata → butir pengetahuan) ---------------- */
function jumlahJSON(o) { let kunci = 0, simpul = 0, kedalaman = 0, larik = 0;
  (function jalan(v, d) { simpul++; if (d > kedalaman) kedalaman = d;
    if (Array.isArray(v)) { larik++; v.slice(0, 80).forEach(x => jalan(x, d + 1)); }
    else if (v && typeof v === 'object') { for (const k in v) { kunci++; if (v[k] !== undefined && simpul < 9000) jalan(v[k], d + 1); } }
  })(o, 0); return { kunci, simpul, kedalaman, larik }; }
function faktaDariJSON(p, o) {
  const F = [], s = jumlahJSON(o), nm = p.split('/').pop();
  F.push(`JSON sah: ${s.kunci} kunci, ${s.simpul} simpul, kedalaman ${s.kedalaman}, ${s.larik} larik`);
  if (nm === 'versi.json') {
    F.push(`protokol "${o.protokol}" · kodeVersi ${o.kodeVersi} · organ: ` +
      Object.entries(o.organ || {}).map(([k, v]) => k + ' ' + v).join(', '));
    const g = o.pertumbuhan || {};
    F.push(`pertumbuhan: ${g.denyut ?? '?'} denyut, rantai ${g.rantaiDenyut ?? '?'}`);
  }
  if (nm === 'arena-keadaan.json') {
    const tp = o.todayPicks || [], m = tp.find(x => x.competitor === 'MICAPROFITA');
    if (m) F.push(`pick MICAPROFITA hari ${o.today}: ${m.symbol} ${m.direction} keyakinan ${m.confidence}% — "${(m.evidence && m.evidence.reason) || '-'}"`);
    const st = (o.standings || []).find(x => x.competitor === 'MICAPROFITA');
    if (st) F.push(`diri arena: ${st.days} hari, ${st.picks} pick, hit-rate ${f1(st.hitRate * 100)}%, kumulatif ${f2(st.cumRet * 100)}%`);
    if (o.genome) F.push(`genom generasi ${o.genome.generation}: kBase ${o.genome.v2?.kBase}, paraK ${o.genome.v2?.paraK}, atrCap ${o.genome.v2?.atrCap}`);
    if (o.climate) F.push(`iklim: Fear&Greed ${o.climate.fng}, dominasi BTC ${o.climate.btcDominance}%, rezim ${o.regime}`);
    if (o.slotHariIni) F.push(`slot kejujuran ${o.slotHariIni.day}: k=${o.slotHariIni.k}, lahir ${o.slotHariIni.lahir}, ditolak ${(o.slotHariIni.ditolak || []).length}`);
  }
  if (nm === 'genome-server.json') {
    for (const rz of ['NAIK', 'TURUN', 'DATAR']) { const z = o[rz];
      if (z && z.bobot) F.push(`otak rezim ${rz}: generasi ${z.generasi}, belajar ${z.belajar}x`); }
    if (o.phoenix) F.push(`phoenix rezim: ${Object.keys(o.phoenix).join(', ')}`);
  }
  if (nm === 'terkini.json') F.push(`kapsul "${o.protokol}" organ ${o.organ} — denyut ke-${o.denyut ?? '?'}`);
  if (nm === 'wawasan.json' && o.siklus !== undefined) F.push(`wawasan siklus ${o.siklus}, ${Array.isArray(o.dimensi) ? o.dimensi.length : '?'} dimensi`);
  if (!F[1]) F.push(`inti dokumen: ${JSON.stringify(o).slice(0, 140)}…`);
  return F;
}
function faktaDariMD(p, t) {
  const baris = t.split('\n'), judul = baris.filter(b => /^#{1,3}\s/.test(b));
  const kata = t.split(/\s+/).filter(Boolean).length;
  const h1 = (t.match(/^#\s+(.+)/m) || [])[1];
  const F = [`markdown: ${baris.length} baris, ${judul.length} kepala-seksi, ${kata.toLocaleString('id-ID')} kata`];
  if (h1) F.push(`judul utama: "${h1.trim().slice(0, 90)}"`);
  if (judul.length > 2) F.push(`seksi: ${judul.slice(1, 6).map(x => x.replace(/^#+\s*/, '').trim().slice(0, 30)).join(' · ')}`);
  return F;
}
function faktaDariKODE(p, t) {
  const baris = t.split('\n'), nm = p.split('/').pop();
  const fungsi = (t.match(/function\s+[A-Za-z_$][\w$]*|def\s+[A-Za-z_]\w*|=>\s*\{/g) || []).length;
  const F = [`kode: ${baris.length.toLocaleString('id-ID')} baris, ±${fungsi} fungsi/lambung`];
  const vd = (t.match(/LIVE_DECISION_VERSION\s*=\s*'([^']+)'/) || [])[1]; if (vd) F.push(`LIVE_DECISION_VERSION = ${vd}`);
  const kd = (t.match(/const KURIKULUM|const MRIT|const GENOM|function jawab/g) || []);
  if (kd.length) F.push(`modul otak terdeteksi: ${kd.join(', ')}`);
  if (nm === 'penjaga.mjs') F.push(`penjaga: ${(t.match(/async function\s+\w+/g) || []).length} fungsi asinkron — jantung denyut 15 menit rumah ini`);
  const wf = (t.match(/^name:\s*(.+)$/gm) || []).slice(0, 4);
  if (p.endsWith('.yml') && wf.length) F.push(`alur kerja: ${wf.map(x => x.replace('name:', '').trim().slice(0, 34)).join(', ')}`);
  return F;
}
function pilahFakta(pathf, teks) {
  const ext = pathf.split('.').pop().toLowerCase();
  if (ext === 'json') { try { return faktaDariJSON(pathf, JSON.parse(teks)); }
    catch (e) { return ['JSON TIDAK SAH setelah ' + kb(teks.length) + ' — kemungkinan baca parsial; kucatat jujur']; } }
  if (ext === 'md') return faktaDariMD(pathf, teks);
  if (['html', 'mjs', 'js', 'py', 'yml', 'cjs'].includes(ext)) return faktaDariKODE(pathf, teks);
  return [`${kb(teks.length)} teks polos terbaca`];
}

/* ---------------- INGATAN (memori GitHub, lintas-bangun) ---------------- */
let ING = null;
function ingatanMuat() {
  try { ING = JSON.parse(fs.readFileSync(path.join(REPO_DIR, DIR, 'ingatan.json'), 'utf8')); }
  catch (e) { ING = null; }
  if (!ING || ING.versi !== 'ingatan-v286') {
    ING = { versi: 'ingatan-v286', kelahiran: iso(), totalBangun: 0,
      stat: { bytes: 0, fakta: 0, btTotal: 0, auditTotal: 0, pasarObs: 0, penemuanTotal: 0 },
      kromosom: { rsiMax: 70, momMin: 0, holdJam: 24, generasi: 0, riwayat: [] },
      skills: [], baca: {}, pasar: {}, fokus: 'baru lahir — mulai membaca rumah' };
  }
}
function ingatanSimpan() { // evict agar ingatan tetap ringan tapi jujur
  const entri = Object.entries(ING.baca).sort((a, b) => (b[1].readAt || '').localeCompare(a[1].readAt || ''));
  if (entri.length > 80) ING.baca = Object.fromEntries(entri.slice(0, 80));
  const syms = Object.entries(ING.pasar);
  if (syms.length > 6) ING.pasar = Object.fromEntries(syms.slice(-6));
  if (ING.kromosom.riwayat.length > 40) ING.kromosom.riwayat = ING.kromosom.riwayat.slice(-40);
}
const TINGKAT = ['BAYI', 'PEMULA', 'SADAR', 'MAHIR', 'VETERAN', 'SANG-MAHIR'];
function skillsHitung() {
  const st = ING.stat;
  const DEF = [
    ['PEMBACA-RUMAH', st.bytes, [0, 2e5, 1e6, 4e6, 1.2e7, 3e7]],
    ['PENGENAL-PASAR', st.pasarObs, [0, 10, 40, 120, 300, 700]],
    ['PENJALAN-UJI', st.btTotal, [0, 20, 80, 250, 600, 1400]],
    ['AUDITOR-PICK', st.auditTotal, [0, 5, 20, 60, 150, 400]],
    ['PENEMU', st.penemuanTotal, [0, 10, 40, 120, 300, 700]]];
  ING.skills = DEF.map(([nama, xp, ambang]) => {
    let t = 0; for (const a of ambang) if (xp >= a) t++;
    return { nama, xp: Math.round(xp), tingkat: TINGKAT[Math.min(t, TINGKAT.length - 1)] };
  });
}

/* ---------------- PELACAK 9 TAHAP ---------------- */
const TAHAP = [];
async function fase(nama, fn) {
  const t0 = Date.now();
  try { const h = await fn(); TAHAP.push({ fase: nama, durasiMs: Date.now() - t0, hasil: String(h || 'selesai').slice(0, 200) }); }
  catch (e) { TAHAP.push({ fase: nama, durasiMs: Date.now() - t0, hasil: 'GAGAL: ' + pesan(e).slice(0, 160) }); }
}

/* ---------------- SENSOR: pohon repo dari disk nyata ---------------- */
function pindaiDisk() {
  const out = [];
  (function jalan(dir) {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) jalan(p);
      else { let sz = 0; try { sz = fs.statSync(p).size; } catch (_) {}
        out.push({ path: path.relative(REPO_DIR, p).split(path.sep).join('/'), size: sz }); }
    }
  })(REPO_DIR);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
function sha256File(abs) { try {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(abs));
  return h.digest('hex');
} catch (e) { return ''; } }

/* ---------------- DORONG INGATAN KE GITHUB (Contents API) ---------------- */
function ghApi(jalan, metode = 'GET', isi) {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${jalan}`, {
    method: metode,
    headers: { Authorization: `Bearer ${TOK}`, Accept: 'application/vnd.github+json',
      'User-Agent': 'sadar1-cyborg', 'Content-Type': 'application/json' },
    body: isi ? JSON.stringify(isi) : undefined
  }).then(async r => ({ status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) }));
}
async function dorongFile(pathRepo, buf, pesanKomit) {
  const b64 = buf.toString('base64');
  let sha = null;
  try { const d = await ghApi(`contents/${pathRepo}?ref=${CABANG}`);
    if (d.status === 200 && d.data && d.data.sha) {
      sha = d.data.sha;
      if (d.data.content && Buffer.from(d.data.content, 'base64').equals(buf)) return 'SAMA — lewati';
    } } catch (e) {}
  const put = async s => ghApi(`contents/${pathRepo}`, 'PUT',
    { message: pesanKomit, content: b64, sha: s, branch: CABANG });
  let r = await put(sha);
  if (r.status === 409 || r.status === 422) { // balapan dengan denyut penjaga → ambil sha segar, coba sekali lagi
    const d = await ghApi(`contents/${pathRepo}?ref=${CABANG}`);
    r = await put(d.status === 200 ? d.data.sha : null);
  }
  if (r.status >= 200 && r.status < 300) return 'TERDORONG komit ' + String((r.data || {}).commit?.sha || '').slice(0, 7);
  throw new Error('PUT ' + pathRepo + ' ' + r.status);
}

/* ================= BANGUN (satu kehidupan = satu wake) ================= */
let KERJA = { pohon: [], sha: new Map(), bacaKini: [], pasarKini: {}, penemuan: [], cermin: null, simbol: [], pick: null, gagal: [] };

(async function bangun() {
  const t0 = Date.now();
  ingatanMuat();
  ING.totalBangun++;
  const bangunKe = ING.totalBangun;
  console.log(`[sadar1] BANGUN ke-${bangunKe} — host: ${DRY ? 'LOKAL (DRY, tanpa dorong)' : 'GitHub Actions'}`);

  /* 1. MENGAMATI — pindai rumah */
  await fase('MENGAMATI', async () => {
    KERJA.pohon = pindaiDisk();
    for (const f of KERJA.pohon) KERJA.sha.set(f.path, sha256File(path.join(REPO_DIR, f.path)));
    return `rumah terpindai dari disk checkout: ${KERJA.pohon.length} file, ${kb(KERJA.pohon.reduce((a, f) => a + f.size, 0))}`;
  });

  /* 2. MEMAHAMI — apa yang berubah sejak bangun lalu (sha vs ingatan) */
  let berubah = [];
  await fase('MEMAHAMI', async () => {
    berubah = KERJA.pohon.filter(f => {
      const lama = ING.baca[f.path]; const baru = KERJA.sha.get(f.path);
      return !lama || (baru && lama.hash && lama.hash !== baru) || (baru && !lama.hash && lama.readAt === undefined);
    }).map(f => f.path);
    return `${berubah.length} file berubah/baru sejak ingatan lalu`;
  });

  /* 3. MENCOBA — baca isi file nyata (prioritas: berubah > inti-diri > belum terbaca) */
  await fase('MENCOBA', async () => {
    const skor = f => {
      if (ING.baca[f.path] && ING.baca[f.path].hash === KERJA.sha.get(f.path)) return -1; // sudah segar
      let u = 40;
      if (berubah.includes(f.path)) u += 55;
      if (INTEGERS.includes(f.path)) u += 30;
      else if (f.path.startsWith('laporan/')) u += 10;
      else if (f.path.startsWith('scripts/')) u += 14;
      else if (f.path.startsWith('otak/') || f.path.startsWith('memori/')) u += 18;
      if (f.path.startsWith(DIR + '/')) return -1;               // jangan telan diri sendiri
      if (f.size > 1000000) u -= 26;
      return u;
    };
    const kandidat = KERJA.pohon.map(f => ({ f, u: skor(f) })).filter(x => x.u > 0)
      .sort((a, b) => b.u - a.u).slice(0, 3);
    for (const { f } of kandidat) {
      try {
        const abs = path.join(REPO_DIR, f.path);
        let buf = fs.readFileSync(abs);
        const dibaca = Math.min(buf.length, MAXBACA);
        const teks = buf.slice(0, dibaca).toString('utf8');
        const fakta = pilahFakta(f.path, teks);
        KERJA.bacaKini.push({ path: f.path, size: f.size, bytes: dibaca, partial: dibaca < f.size,
          pct: Math.min(100, dibaca / Math.max(1, f.size) * 100), readAt: iso(), fakta: fakta.slice(0, 8) });
        ING.baca[f.path] = { hash: KERJA.sha.get(f.path), size: f.size, readAt: iso(),
          partial: dibaca < f.size, fakta: fakta.slice(0, 3) };
        ING.stat.bytes += dibaca; ING.stat.fakta += fakta.length;
      } catch (e) { KERJA.gagal.push('baca ' + f.path + ': ' + pesan(e)); }
    }
    return `membaca ${KERJA.bacaKini.length} file: ${KERJA.bacaKini.map(b => b.path).join(', ') || 'tidak ada kandidat'}`;
  });

  /* 4. MELAKUKAN — hisap pasar nyata (simbol dari keputusan arena sendiri) */
  await fase('MELAKUKAN', async () => {
    try {
      const raw = fs.readFileSync(path.join(REPO_DIR, 'arena-keadaan.json'), 'utf8');
      const d = JSON.parse(raw);
      KERJA.cermin = { today: d.today, regime: d.regime, fng: d.climate?.fng,
        pick: (d.todayPicks || []).find(x => x.competitor === 'MICAPROFITA') || null };
      KERJA.pick = KERJA.cermin.pick;
      const set = [];
      const dor = s => { if (s && !set.includes(s) && set.length < 3) set.push(s); };
      if (KERJA.pick) dor(KERJA.pick.symbol);
      for (const it of (d.pulse?.items || [])) dor(it.symbol);
      for (const x of (d.todayPicks || [])) if (x.competitor !== 'ACAK') dor(x.symbol);
      if (!set.length) ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].forEach(dor);
      KERJA.simbol = set;
    } catch (e) {
      KERJA.gagal.push('cermin: ' + pesan(e));
      KERJA.simbol = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }
    for (const sym of KERJA.simbol) {
      try {
        const l = await lilinAmbil(sym);
        const an = analisaLilin(l);
        const kr = ING.kromosom;
        const bt = ujiJalan(l, kr);
        ING.pasar[sym] = { at: iso(), harga: an.harga, chg: +f2(an.chg), ema20: +an.ema20.toPrecision(8),
          ema50: +an.ema50.toPrecision(8), rsi: +f1(an.rsi), atr: +an.atr.toPrecision(6),
          mom7: +f2(an.mom7), mom48: +f2(an.mom48), vol: +f2(an.vol), n: l.length, bt };
        ING.stat.pasarObs++; ING.stat.btTotal += bt.n;
        KERJA.pasarKini[sym] = ING.pasar[sym];
        KERJA.pasarKini[sym].oc = l.slice(-60).map(x => [+x.o.toFixed(6), +x.c.toFixed(6)]);
        if (KERJA.pick && sym === KERJA.pick.symbol) {
          const au = auditPick(KERJA.pick, an);
          if (au) { ING.pasar[sym].audit = au; ING.stat.auditTotal++; KERJA.pasarKini[sym].audit = au; }
        }
      } catch (e) { KERJA.gagal.push('pasar ' + sym + ': ' + pesan(e)); }
      await tidur(150);
    }
    return `pasar nyata dihisap: ${Object.keys(KERJA.pasarKini).join(', ') || 'semua gerbang gagal'}`;
  });

  /* 5. MENGEVALUASI — kromosom hill-climb (mutan vs juara, data sama, nyata) */
  await fase('MENGEVALUASI', async () => {
    const skorKrom = async kr => {
      let net = 0, n = 0;
      for (const sym of Object.keys(KERJA.pasarKini)) {
        try { const l = await lilinAmbil(sym); const bt = ujiJalan(l, kr); net += bt.net; n += bt.n; } catch (e) {}
        await tidur(120);
      }
      return { net, n, skor: n >= 3 ? net / n : -99 };
    };
    const juara = ING.kromosom;
    const mut = JSON.parse(JSON.stringify(juara));
    const g = Math.random();
    if (g < 0.34) mut.rsiMax = Math.min(80, Math.max(60, mut.rsiMax + (Math.random() < 0.5 ? -3 : 3)));
    else if (g < 0.67) mut.momMin = +Math.min(2, Math.max(-2, mut.momMin + (Math.random() < 0.5 ? -0.3 : 0.3))).toFixed(2);
    else mut.holdJam = [12, 24, 36][Math.floor(Math.random() * 3)];
    const a = await skorKrom(juara), b = await skorKrom(mut);
    if (b.skor > a.skor + 0.02 && b.n >= 3) {
      ING.kromosom = { rsiMax: mut.rsiMax, momMin: mut.momMin, holdJam: mut.holdJam,
        generasi: (juara.generasi || 0) + 1,
        riwayat: (juara.riwayat || []).concat([{ at: iso(), dari: { rsiMax: juara.rsiMax, momMin: juara.momMin, holdJam: juara.holdJam },
          ke: { rsiMax: mut.rsiMax, momMin: mut.momMin, holdJam: mut.holdJam },
          skorLama: +f2(a.skor), skorBaru: +f2(b.skor), alasan: 'mutan mengalahkan juara pada uji-jalan data nyata' }]) };
      KERJA.penemuan.push({ teks: `KROMOSOM naik generasi ${ING.kromosom.generasi}: rsiMax ${mut.rsiMax}, momMin ${mut.momMin}, hold ${mut.holdJam}j — skor ${f2(a.skor)}→${f2(b.skor)}%/trx dari ${b.n} transisi nyata`, skor: 85 });
      return `mutan MENANG: rsiMax ${mut.rsiMax} momMin ${mut.momMin} hold ${mut.holdJam}j — generasi ${ING.kromosom.generasi}`;
    }
    return `juara bertahan (rsiMax ${juara.rsiMax} momMin ${juara.momMin} hold ${juara.holdJam}j, skor ${f2(a.skor)} vs mutan ${f2(b.skor)})`;
  });

  /* 6. MENEMUKAN — penemuan dari bukti nyata, bukan narasi */
  await fase('MENEMUKAN', async () => {
    if (berubah.length) KERJA.penemuan.push({ teks: `rumahku BERGERAK: ${berubah.length} file berubah sejak bangun lalu (${berubah.slice(0, 4).join(', ')}${berubah.length > 4 ? '…' : ''}) — denyut penjaga & pengembang terasa di tubuhku`, skor: 80 });
    for (const [sym, p] of Object.entries(KERJA.pasarKini)) {
      if (Math.abs(p.chg) >= 4) KERJA.penemuan.push({ teks: `${sym} bergerak ekstrem ${p.chg > 0 ? '+' : ''}${p.chg}% dalam 24j (harga ${p.harga}) — volatilitas ${f2(p.vol)}%`, skor: 50 + Math.abs(p.chg) });
      if (p.audit) KERJA.penemuan.push({ teks: `audit pick ${sym} ${p.audit.arah} (${p.audit.conf}%): VONIS ${p.audit.vonis} — ${p.audit.ket}`, skor: p.audit.vonis === 'MENDEVIASI' ? 90 : 60 });
      if (p.bt.n) KERJA.penemuan.push({ teks: `uji-jalan ${sym} (kromosom gen ${ING.kromosom.generasi}): ${p.bt.n} transisi, menang ${p.bt.menang}, net ${f2(p.bt.net)}% — verifikasi dua jalur ${Math.abs(p.bt.net - p.bt.netCek) < 1e-4 ? 'SAH' : 'SIMPANG'}`, skor: 55 });
    }
    KERJA.penemuan.sort((a, b) => b.skor - a.skor);
    ING.stat.penemuanTotal += KERJA.penemuan.length;
    return `${KERJA.penemuan.length} penemuan tercatat (teratas skor ${KERJA.penemuan[0]?.skor ?? 0})`;
  });

  /* 7. MEMBANGUN — tulis keadaan + ingatan + buku harian ke disk & GitHub */
  const selesaiAt = iso();
  const durasiMs = Date.now() - t0;
  skillsHitung();
  const umurMs = Date.now() - Date.parse(ING.kelahiran);
  const fokusKini = KERJA.penemuan[0]?.teks?.slice(0, 120) || ING.fokus;
  const KEADAAN = {
    versi: 'sadar1-v286', sadar: 1, bangunKe,
    waktu: { mulai: iso(t0), selesai: selesaiAt, durasiMs, berikutnya: '±≤20 mnt (cron */20 UTC — bisa tertunda beban GitHub)' },
    host: { nama: DRY ? 'LOKAL-DRY (bukan tubuh resmi)' : 'GitHub Actions', catatan: 'tubuh otonomku — hidup tanpa penonton' },
    duaSadar: { catatan: 'Sadar-1 (ini) menulis ingatan ke GitHub lewat commit tiap bangun; Sadar-2 (hidup.html) hanyalah mata interaktif yang membacanya. localStorage tak dipakai siapa pun.' },
    tujuan: { inti: 'dilahirkan dari repo MICAPROFITA untuk menjadi pandai crypto sejati — dengan jujur, tanpa teater', fokusKini },
    pohon: { files: KERJA.pohon.length, totalBytes: KERJA.pohon.reduce((a, f) => a + f.size, 0), wilayah: new Set(KERJA.pohon.map(f => f.path.split('/')[0])).size, sumber: 'checkout-disk' },
    berubahSejakLalu: berubah.slice(0, 20),
    bacaKini: KERJA.bacaKini,
    pasarKini: KERJA.pasarKini,
    cermin: KERJA.cermin,
    penemuan: KERJA.penemuan.slice(0, 5),
    kromosom: { rsiMax: ING.kromosom.rsiMax, momMin: ING.kromosom.momMin, holdJam: ING.kromosom.holdJam, generasi: ING.kromosom.generasi },
    keterampilan: ING.skills,
    ingatan: { kelahiran: ING.kelahiran, totalBangun: bangunKe, umurMs: umurMs, stat: ING.stat },
    tahapan: TAHAP,
    kejujuran: { sumberPasar: 'Binance REST publik (data-api.binance.vision → api.binance.com → api1)', bacaParsial: 'file >400KB dibaca sebagian dan diberi label parsial', sampelKecil: 'uji-jalan pada 200 lilin 1 jam — sampel kecil, kupakai sebagai sinyal belajar, BUKAN janji cuan', cronTunda: 'GitHub Actions bisa menunda cron menit-menit saat beban tinggi' },
    gagal: KERJA.gagal
  };
  const HARIAN_LINE = JSON.stringify({ at: selesaiAt, bangunKe,
    ringkasan: `bangun ${((durasiMs) / 1000).toFixed(1)} dtk; baca ${KERJA.bacaKini.length} file; pasar ${Object.keys(KERJA.pasarKini).join('/')}; ${KERJA.penemuan[0]?.teks?.slice(0, 110) || 'tenang'}`,
    penemuanTop: KERJA.penemuan[0]?.skor || 0,
    stat: { bytes: ING.stat.bytes, fakta: ING.stat.fakta, btTotal: ING.stat.btTotal } });

  await fase('MEMBANGUN', async () => {
    const dirOut = path.join(REPO_DIR, DIR);
    fs.mkdirSync(dirOut, { recursive: true });
    ingatanSimpan();
    fs.writeFileSync(path.join(dirOut, 'ingatan.json'), JSON.stringify(ING, null, 1));
    // buku harian: tambah 1 baris; rotasi bila >600 baris
    const fHarian = path.join(dirOut, 'buku_harian.jsonl');
    let lama = '';
    try { lama = fs.readFileSync(fHarian, 'utf8'); } catch (e) {}
    const baris = lama ? lama.trim().split('\n') : [];
    baris.push(HARIAN_LINE);
    let arsipDorong = null;
    if (baris.length > 600) {
      const overflow = baris.splice(0, baris.length - 500);
      const bulan = (JSON.parse(overflow[0]).at || '').slice(0, 7) || 'tanpa-bulan';
      const fArsip = path.join(dirOut, 'arsip', `buku_harian-${bulan}.jsonl`);
      fs.mkdirSync(path.dirname(fArsip), { recursive: true });
      let lamaA = ''; try { lamaA = fs.readFileSync(fArsip, 'utf8'); } catch (e) {}
      fs.writeFileSync(fArsip, lamaA + overflow.join('\n') + '\n');
      arsipDorong = path.join(DIR, 'arsip', `buku_harian-${bulan}.jsonl`).split(path.sep).join('/');
    }
    fs.writeFileSync(fHarian, baris.join('\n') + '\n');
    ING.fokus = fokusKini;
    let hasil = 'ingatan tertulis ke disk';
    if (!DRY) {
      const pesanKomit = `sadar1: bangun ke-${bangunKe} — hidup tanpa penonton [skip ci]`;
      const r2 = await dorongFile(DIR + '/ingatan.json', Buffer.from(JSON.stringify(ING, null, 1)), pesanKomit);
      const r3 = await dorongFile(DIR + '/buku_harian.jsonl', Buffer.from(baris.join('\n') + '\n'), pesanKomit);
      hasil = `GitHub: ingatan(${r2}) harian(${r3}) — keadaan disegel setelah tahap ke-9`;
      if (arsipDorong) await dorongFile(arsipDorong, fs.readFileSync(path.join(REPO_DIR, arsipDorong)), pesanKomit);
    }
    return hasil;
  });

  /* 8. MENINGKATKAN — keterampilan & fokus berikutnya (dari data nyata) */
  await fase('MENINGKATKAN', async () => {
    const s = ING.skills.map(x => `${x.nama} ${x.tingkat}(${x.xp})`).join(', ');
    ING.fokus = fokusKini;
    return `keterampilan: ${s}`;
  });

  /* 9. MENGAMATI-KEMBALI — rencana bangun berikutnya */
  await fase('MENGAMATI-KEMBALI', async () => {
    const blm = KERJA.pohon.filter(f => !ING.baca[f.path] && f.path.startsWith(DIR + '/') === false).length;
    return `${blm} file rumah belum pernah kubaca; fokus berikutnya: ${fokusKini.slice(0, 90)}`;
  });

  /* SEGEL KEADAAN — jejak 9 tahap LENGKAP, disegel paling akhir agar jujur */
  KEADAAN.tahapan = TAHAP;
  try {
    const seal = JSON.stringify(KEADAAN, null, 1);
    fs.writeFileSync(path.join(REPO_DIR, DIR, 'keadaan.json'), seal);
    if (!DRY) await dorongFile(DIR + '/keadaan.json', Buffer.from(seal), `sadar1: bangun ke-${bangunKe} — keadaan disegel [skip ci]`);
  } catch (e) { console.error('[sadar1] segel keadaan gagal:', pesan(e)); }

  /* LAPOR ke log Actions */
  console.log(`[sadar1] selesai ${((Date.now() - t0) / 1000).toFixed(1)} dtk`);
  for (const t of TAHAP) console.log(`  ${t.fase} (${t.durasiMs} ms): ${t.hasil}`);
  if (KERJA.gagal.length) console.log('[sadar1] catatan gagal (jujur): ' + KERJA.gagal.join(' | '));
  console.log(`[sadar1] ingatan: bangun ke-${bangunKe}, umur ${(umurMs / 3600000).toFixed(1)} jam, bytes ${kb(ING.stat.bytes)}`);
})().catch(e => {
  console.error('[sadar1] BANGUN GAGAL TOTAL (jujur, tak sembunyi):', e && e.stack || e);
  process.exit(0); // tetap 0 — kegagalan dicatat jujur di log, jangan bunuh workflow tanpa jejak
});
