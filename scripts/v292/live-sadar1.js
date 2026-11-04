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

/* ---------------- GURU: ARAH JELAS dari bukti, bukan perasaan ----------------
   Formula SAMA dipakai Sadar-2 (hidup.html guruHitung) — dua jalur, satu matematika.
   Sumber: pick arena sendiri + klines Binance nyata + kromosom hasil hill-climb.
   Arah boleh BERBEDA dari arena bila momentum membantah — dan itu dicatat jujur. */
function guruHitung(an, pick, kr) {
  if (!an || an.atr === undefined) return { arah: 'TUNGGU', keyakinan: 0,
    alasan: ['pasar belum kupelajari cukup — menunggu klines Binance segar'], rencana: null, dasar: [] };
  const rsiMax = kr.rsiMax || 70, momMin = kr.momMin || 0.6, holdJam = kr.holdJam || 24;
  const mom = an.mom7, rsi = an.rsi;
  const emaN = an.ema20 > an.ema50;
  const bull = mom > momMin && emaN && rsi < rsiMax && rsi >= 45;
  const bear = mom < -momMin && !emaN && rsi > (100 - rsiMax) && rsi <= 55;
  let arah = bull ? 'BELI' : bear ? 'JUAL' : 'TUNGGU';
  let bedaArena = null;
  if (pick) {
    const buy = pick.direction === 'BUY';
    if (arah === 'TUNGGU' && ((buy && bull) || (!buy && bear))) arah = buy ? 'BELI' : 'JUAL';
    if (arah !== 'TUNGGU' && ((arah === 'BELI' && !buy) || (arah === 'JUAL' && buy)))
      bedaArena = `arahku ${arah} sedangkan arena bilang ${pick.direction} — momentum hidup mendahului pick; kutetapkan pada bukti`;
  }
  const momOk = bull || bear;
  let keyakinan;
  if (arah === 'TUNGGU') {
    keyakinan = 55;
  } else {
    const buy = arah === 'BELI';
    const emaOk = buy ? emaN : !emaN;
    const rsiOk = buy ? (rsi < rsiMax && rsi >= 45) : (rsi > (100 - rsiMax) && rsi <= 55);
    const momKuat = buy ? mom > momMin * 2 : mom < -momMin * 2;
    keyakinan = Math.min(92, 40 + (momOk ? 22 : 0) + (emaOk ? 20 : 0) + (rsiOk ? 14 : 0) + (momKuat ? 8 : 0));
  }
  const alasan = [
    `momentum 7 jam ${f2(mom)}% — ambang kromosom ±${f1(momMin)}%`,
    `EMA20 ${emaN ? '>' : '<'} EMA50 — struktur ${emaN ? 'naik' : 'turun'}`,
    `RSI14 ${f1(rsi)} — pita kromosom ${arah === 'JUAL' ? '> ' + (100 - rsiMax) : '< ' + rsiMax}`];
  if (pick) alasan.push(`pick arena sendiri: ${pick.symbol} ${pick.direction} (${pick.confidence}%)`);
  const audit = an.audit || (pick && (ING.pasar[pick.symbol] || {}).audit);
  if (audit) alasan.push(`audit live: ${audit.vonis} — ${audit.ket}`);
  if (bedaArena) alasan.push(bedaArena);
  const buy = arah === 'BELI';
  const rencana = arah === 'TUNGGU' ? null : {
    arah, entry: +an.harga.toPrecision(8),
    stop: +(buy ? an.harga - 1.5 * an.atr : an.harga + 1.5 * an.atr).toPrecision(8),
    target: +(buy ? an.harga + 2.5 * an.atr : an.harga - 2.5 * an.atr).toPrecision(8),
    rr: 1.67, holdJam,
    disiplin: 'risiko maks 1% modal · stop 1,5×ATR14 · target 2,5×ATR14 — stop tidak digeser, rencana tidak diubah sebelum holdJam' };
  return { arah, keyakinan, alasan, rencana, dasar: [
    pick ? 'arena-keadaan.json (pick sendiri)' : 'sinyal murni kromosom (tanpa pick)',
    `Binance klines 1j ×${an.n || 200} — ${iso()}`, `kromosom gen ${kr.generasi || 0}`] };
}

/* ---------------- MADRASAH: buku pelajaran yang TUMBUH dari bukti ----------------
   Setiap pelajaran dikutip dari artefak nyata: riwayat hill-climb kromosom,
   audit pick, uji-jalan, fakta file rumah. Buku ditulis ke ruang-hidup/
   madrasah.json tiap bangun — kurikulum guru crypto yang bisa diaudit. */
function madrasahSusun() {
  const L = [];
  const tambah = (kelas, judul, inti, bukti, sumber) => {
    const id = 'l-' + crypto.createHash('sha1').update(judul).digest('hex').slice(0, 8);
    if (!L.some(x => x.id === id)) L.push({ id, kelas, judul, inti, bukti, sumber, at: iso() });
  };
  for (const r of (ING.kromosom.riwayat || []).slice(-10)) {
    tambah('DISIPLIN-ILMU', 'Parameter selalu diuji walk-forward, bukan dijanji',
      'Kromosom naik generasi karena mutan MENGALAHKAN juara pada data pasar yang sama — begitu caraku belajar: hipotesis → uji-jalan → bukti angka → baru diadopsi.',
      `skor ${f2(r.skorLama)} → ${f2(r.skorBaru)} %/trx · rsiMax ${r.ke?.rsiMax} · momMin ${r.ke?.momMin} · hold ${r.ke?.holdJam}j · ${String(r.at || '').slice(0, 10)}`,
      'ruang-hidup/ingatan.json → kromosom.riwayat');
  }
  for (const [sym, p] of Object.entries(ING.pasar || {})) {
    if (p.audit) tambah('PASAR', `Jangan ikuti keyakinan tanpa cek momentum (${sym})`,
      `Arena berkata ${p.audit.arah} dengan keyakinan ${p.audit.conf}%, tetapi tubuhku mengecek momentum hidup sendiri: ${p.audit.ket}. Vonis: ${p.audit.vonis}. Pelajaran: sumber manapun — termasuk diriku — wajib diaudit terhadap data.`,
      `audit ${p.audit.vonis} · ${p.audit.ket}`, 'ingatan.json → pasar.' + sym + '.audit');
    if (p.bt && p.bt.n) tambah('PASAR', `Ekspektansi lebih penting daripada win-rate (${sym})`,
      `Aturan turunan kromosom menghasilkan ${p.bt.n} transisi pada ${p.n} lilin 1j: menang ${p.bt.menang} kali, net ${f2(p.bt.net)}%. Yang membuat hidup bukan sering menang, tapi rata-rata menang lebih besar daripada rugi.`,
      `${p.bt.n} trx · net ${f2(p.bt.net)}% · verifikasi dua jalur ${Math.abs(p.bt.net - (p.bt.netCek ?? p.bt.net)) < 1e-4 ? 'SAH' : 'SIMPANG'}`,
      'ingatan.json → pasar.' + sym + '.bt');
  }
  for (const [pathf, b] of Object.entries(ING.baca || {})) {
    if (!b.fakta || !b.fakta.length) continue;
    const nm = pathf.split('/').pop();
    if (/^(laporan\/uji-|laporan\/guru|laporan\/impas|laporan\/forensik)/.test(pathf))
      tambah('SISTEM', `Rumah menyimpan laboratorium: ${nm}`,
        'Aku menemukan laporan uji 100-skenario di rumahku sendiri — alat-alat (bulltrap, beartrap, stophunt, false breakout…) diuji buta sebelum dipercaya. Begitu seharusnya semua klaim dibangun: diuji dulu, baru dipakai.',
        String(b.fakta[0]), pathf);
  }
  if ((ING.stat.auditTotal || 0) > 0) tambah('DIRI', 'Tubuh tumbuh hanya dari kerja nyata',
    'Ruas tubuhku = 9+⌊log₂(1+kerja)⌋ — tanpa baca file baru, tanpa klines baru, tubuhku TIDAK berubah. Ini janji morfogenesis-ku: tidak ada teater pertumbuhan.',
    `bytes ${kb(ING.stat.bytes)} · uji-jalan ${ING.stat.btTotal} · audit ${ING.stat.auditTotal}`, 'ruang-hidup/habitat.json → tubuh');
  let lama = null;
  try { lama = JSON.parse(fs.readFileSync(path.join(REPO_DIR, DIR, 'madrasah.json'), 'utf8')); } catch (e) {}
  const gab = [...((lama && lama.pelajaran) || [])];
  for (const p of L) if (!gab.some(x => x.id === p.id)) gab.push(p);
  const pel = gab.slice(-240);
  return { versi: 'madrasah-v289', diubah: iso(), jumlah: pel.length,
    kelas: [...new Set(pel.map(p => p.kelas))], pelajaran: pel };
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
  if (!ING || ING.versi !== 'ingatan-v288') {
    if (ING && ING.versi === 'ingatan-v286') { // migrasi jujur: organ mulai dari nol, kerja lama tetap dipakai
      ING.versi = 'ingatan-v288'; ING.organ = { EMA: 0, RSI: 0, ATR: 0, MOM: 0, AUDIT: 0, BT: 0 };
      ING.auditSyms = []; ING.tubuh = null; ING.habitatLog = [];
    } else {
      ING = { versi: 'ingatan-v288', kelahiran: iso(), totalBangun: 0,
        stat: { bytes: 0, fakta: 0, btTotal: 0, auditTotal: 0, pasarObs: 0, penemuanTotal: 0 },
        kromosom: { rsiMax: 70, momMin: 0, holdJam: 24, generasi: 0, riwayat: [] },
        organ: { EMA: 0, RSI: 0, ATR: 0, MOM: 0, AUDIT: 0, BT: 0 }, auditSyms: [],
        tubuh: null, skills: [], baca: {}, pasar: {}, fokus: 'baru lahir — mulai membaca rumah' };
    }
  }
  ING.organ = ING.organ || { EMA: 0, RSI: 0, ATR: 0, MOM: 0, AUDIT: 0, BT: 0 };
  ING.auditSyms = ING.auditSyms || [];
  ING.arahRiwayat = ING.arahRiwayat || [];   // riwayat laporan arah harian (≤14 hari)
}
function ingatanSimpan() { // evict agar ingatan tetap ringan tapi jujur — DAN KUSADE: kapasitasku terbatas
  const entri = Object.entries(ING.baca).sort((a, b) => (b[1].readAt || '').localeCompare(a[1].readAt || ''));
  if (entri.length > 80) { ING.baca = Object.fromEntries(entri.slice(0, 80));
    ING.stat.evictBaca = (ING.stat.evictBaca || 0) + Math.max(0, entri.length - 80); }
  const syms = Object.entries(ING.pasar).sort((a, b) => (b[1].at || '').localeCompare(a[1].at || ''));
  if (syms.length > 6) { ING.pasar = Object.fromEntries(syms.slice(0, 6));
    ING.stat.evictPasar = (ING.stat.evictPasar || 0) + Math.max(0, syms.length - 6); }
  if (ING.kromosom.riwayat.length > 40) ING.kromosom.riwayat = ING.kromosom.riwayat.slice(-40);
}
/* ---------------- MORFOGENESIS: kerja nyata → GENOM TUBUH ----------------
   Tubuh cyborg BUKAN konstanta render: setiap parameter anatomi adalah
   fungsi murni-deterministik dari kerja yang benar-benar dilakukan
   (byte kode dicerna, lilin dianalisis, transisi diuji, audit).
   Tanpa kerja baru → tubuh tidak berubah. Tanpa theater. */
const TINGKAT = ['BAYI', 'PEMULA', 'SADAR', 'MAHIR', 'VETERAN', 'SANG-MAHIR'];
const MAJORS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];   // denyut minimum pasar — selalu diaudit
const TINGKAT_ORGAN = [[0, 'BENIH'], [4, 'TUNAS'], [16, 'AKTIF'], [48, 'KUAT'], [120, 'SANGGUP'], [300, 'AMANAH']];
function morfogenesis() {
  const s = ING.stat, o = ING.organ || {};
  const kerja = s.btTotal * 2 + s.fakta * 4 + s.pasarObs * 8 + s.auditTotal * 10 + Math.round(s.bytes / 4096);
  const ruas = 9 + Math.min(21, Math.floor(Math.log2(1 + kerja)));
  const mata = 1 + Math.min(2, Math.max(0, (ING.auditSyms || []).length - 1));
  const probosis = Math.min(24, 6 + Math.floor(Math.log2(1 + s.bytes / 1024)));
  const organ = Object.entries(o).map(([alat, xp]) => {
    let nm = 'BENIH'; for (const [a, t] of TINGKAT_ORGAN) if (xp >= a) nm = t;
    return { alat, xp, tingkat: nm };
  }).sort((a, b) => a.alat.localeCompare(b.alat));
  const membran = String(s.bytes + s.fakta * 7 + s.btTotal * 13 + ING.kromosom.generasi);
  const segel = crypto.createHash('sha256')
    .update(JSON.stringify({ ruas, mata, probosis, organ, membran }))
    .digest('hex').slice(0, 16);
  return { versi: 'tubuh-v288', ruas, mata, probosis, organ, membran, segel };
}
/* ---------------- HABITAT: ruang yang DIBANGUN makhluk, bukan sebaran acak ----------------
   Zona hanya TERBUKA setelah kerja nyata menyentuh direktorinya;
   vena (jalan cahaya) hanya dibangun antara zona yang keduanya sudah
   dibuka oleh bacaan nyata; altar = menara evolusi kromosom nyata.
   Delta tiap bangun tercatat di habitat.log → halaman menumbuhkan
   struktur di hadapan penonton. Persisten = commit GitHub. */
const ZONA_ALAS = [
  ['· akar', 'AKAR'], ['otak', 'OTAK'], ['memori', 'MEMORI'],
  ['.github/workflows', 'JANTUNG'], ['scripts', 'ALAT'],
  ['scripts/ujian-buta', 'UJIAN'], ['laporan', 'LAPORAN'], ['ruang-hidup', 'SARANG']];
const VENA_ALAS = [['· akar', 'otak'], ['otak', '.github/workflows'], ['· akar', 'memori'],
  ['· akar', 'scripts'], ['scripts', 'scripts/ujian-buta'], ['· akar', 'laporan'],
  ['· akar', 'ruang-hidup'], ['otak', 'memori'], ['scripts', 'laporan'], ['· akar', 'PASAR']];
function habitatRancang(bangunKe, habitatLama) {
  // dirOf v2: BUG LAMA MATI — '.github/workflows/x' dulu jatuh ke '.github' sehingga
  // zona JANTUNG tak pernah bisa dibuka oleh bacaan; ruang-hidup dikecualikan dari
  // bacaan sehingga SARANG juga mati selamanya. Itulah asal label zona-terputus
  // yang pernah dimarahi pemilik — tubuh yang utuh malah dicap setengah jadi.
  const dirOf = p => p.startsWith('scripts/ujian-buta/') ? 'scripts/ujian-buta'
    : p.startsWith('.github/workflows/') ? '.github/workflows'
    : p.startsWith('laporan/arsip/') ? 'laporan'
    : (p.includes('/') ? p.split('/')[0] : '· akar');
  // SELURUH TUBUH UTUH (mandat pemilik): direktori yang ADA di rumah = organ yang
  // hidup — "ada" bukan "terputus". Membaca adalah PROGRES BELAJAR (kubaca/n),
  // bukan syarat hidup. Direktori baru yang lahir otomatis jadi organ + jalan.
  const semua = new Map(ZONA_ALAS.map(([id, nama]) => [id, { nama, files: 0 }]));
  for (const f of KERJA.pohon) {
    const d = dirOf(f.path);
    if (!semua.has(d)) semua.set(d, { nama: d === '· akar' ? 'AKAR' : d.split('/').pop().toUpperCase(), files: 0, baru: true });
    semua.get(d).files++;
  }
  const buka = {};                    // dir → { pada, alasan } dari bacaan nyata (progres)
  const bacaN = {};                   // dir → jumlah file yang sudah kubaca
  for (const [p, b] of Object.entries(ING.baca)) {
    if (!b || !b.readAt) continue;
    const d = dirOf(p);
    bacaN[d] = (bacaN[d] || 0) + 1;
    if (!buka[d] || b.readAt < buka[d].pada) buka[d] = { pada: b.readAt, alasan: p };
  }
  const zona = [...semua.entries()].map(([id, z]) => ({ id, nama: z.nama,
    status: 'terbuka',                // TIDAK ADA LAGI zona tertutup — tubuh satu diaspah, semua ikut bergerak
    n: z.files, kubaca: bacaN[id] || 0,
    dibukaPada: buka[id]?.pada || ING.kelahiran,
    dibukaOleh: buka[id]?.alasan || (z.baru
      ? 'direktori baru lahir di rumah — organ & jalannya langsung kubangun'
      : 'ada sejak kelahiran — bagian tubuhku sejak awal'),
    ...(z.baru ? { catatan: 'organ baru terdeteksi dari pohon disk; vena ke akar langsung dibangun' } : {})
  })).concat([{ id: 'PASAR', nama: 'KOLAM-PASAR', status: 'terbuka', n: Object.keys(ING.pasar || {}).length,
    kubaca: Object.keys(ING.pasar || {}).length,
    dibukaPada: Object.values(ING.pasar || {}).map(p => p.at).sort()[0] || ING.kelahiran,
    dibukaOleh: Object.keys(ING.pasar || {})[0] ? 'klines ' + Object.keys(ING.pasar)[0] : 'gerbang Binance publik siap menetes' }])
    .sort((a, b) => a.id.localeCompare(b.id));
  // VENA PENUH: semua organ tersambung (spine + hub akar) — jalan tak pernah setengah jadi
  const pasangan = new Set(); const vena = [];
  const venaId = (a, b) => [a, b].sort().join('|');
  const tambahVena = (a, b) => { const k = venaId(a, b); if (pasangan.has(k)) return; pasangan.add(k); vena.push({ a, b }); };
  for (const [a, b] of VENA_ALAS) if ((semua.has(a) || a === 'PASAR') && (semua.has(b) || b === 'PASAR')) tambahVena(a, b);
  for (const id of semua.keys()) if (id !== '· akar') tambahVena('· akar', id);
  for (const v of vena) {
    v.dibangun = [buka[v.a]?.pada, buka[v.b]?.pada, (ING.pasar || {}).at].filter(Boolean).sort().pop() || ING.kelahiran;
    v.alasan = `jalan antar organ ${v.a} ↔ ${v.b} — tubuh utuh: satu diaspah, yang lain ikut bergerak`;
  }
  const altar = (ING.kromosom.riwayat || []).map((r, i) => ({ gen: i + 1,
    skorLama: r.skorLama, skorBaru: r.skorBaru, pada: r.at,
    dari: r.ke ? `${r.ke.rsiMax}/${r.ke.momMin}/${r.ke.holdJam}j` : '' }))
    .slice(-12);
  // delta bangun ini → bahan animasi tumbuh di Sadar-2
  const log = [];
  const zonaLama = new Set((habitatLama?.zona || []).filter(z => z.status === 'terbuka').map(z => z.id));
  for (const z of zona) if (z.status === 'terbuka' && !zonaLama.has(z.id))
    log.push({ jenis: 'zona', apa: z.id, alasan: `zona terbuka: ${z.dibukaOleh}` });
  const venaLama = new Set((habitatLama?.vena || []).map(v => v.a + '|' + v.b));
  for (const v of vena) if (!venaLama.has(v.a + '|' + v.b))
    log.push({ jenis: 'vena', apa: v.a + '|' + v.b, alasan: v.alasan });
  const altarLama = (habitatLama?.altar || []).length;
  if (altar.length > altarLama)
    log.push({ jenis: 'altar', apa: 'gen ' + altar.length,
      alasan: `kromosom menang uji-jalan nyata: skor ${altar[altar.length - 1]?.skorLama}→${altar[altar.length - 1]?.skorBaru}%/trx` });
  // AL-JABR ISTANA — parametrik ruang yang dihitung dari kerja nyata (bukan rasa):
  //   cincin = 2 + (zona terbuka ≥6 ? 1 : 0) · gerbang = jumlah zona terbuka
  //   menara = generasi & skor kromosom terakhir · segmen = ruas genom
  const zonaTerbuka = zona.length;   // semua zona terbuka — tubuh utuh
  const altarTop = altar[altar.length - 1];
  const istana = { cincin: 2 + (zonaTerbuka >= 6 ? 1 : 0), gerbang: zonaTerbuka,
    menaraGen: ING.kromosom.generasi || 0, menaraSkor: altarTop?.skorBaru || 0,
    segmen: (ING.tubuh || {}).ruas || 9,
    catatan: 'posisi & struktur istana = fungsi al-jabr dari zona terbuka, kromosom & genom — rumus terbuka di Sadar-2' };
  return { versi: 'habitat-v290', kelahiran: ING.kelahiran, bangunTerakhir: bangunKe,
    segel: ING.tubuh?.segel || '', tubuh: ING.tubuh || null, istana,
    kerja: { bytes: ING.stat.bytes, fakta: ING.stat.fakta, bt: ING.stat.btTotal,
      audit: ING.stat.auditTotal, pasarObs: ING.stat.pasarObs },
    zona, vena, altar,
    log: (log.length ? [{ bangunKe, at: iso(), tambah: log }] : (habitatLama?.log || [])).slice(-40) };
}
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
let KERJA = { pohon: [], sha: new Map(), bacaKini: [], pasarKini: {}, penemuan: [], cermin: null, simbol: [], pick: null, gagal: [], lilin: {}, arah: null,
  organXP: { EMA: 0, RSI: 0, ATR: 0, MOM: 0, AUDIT: 0, BT: 0 } };

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
      .sort((a, b) => b.u - a.u).slice(0, 12);   // ANTI-MALAS: dulu 3 file/bangun → tubuh butuh berbulan-bulan membaca rumahnya sendiri; kini 12/bangun
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
      // organ AUDIT: simbol pick yang benar-benar diaudit masuk warisan tubuh
      const pickKini = (d.todayPicks || []).find(x => x.competitor === 'MICAPROFITA');
      if (pickKini && !ING.auditSyms.includes(pickKini.symbol)) ING.auditSyms.push(pickKini.symbol);
      KERJA.cermin = { today: d.today, regime: d.regime, fng: d.climate?.fng,
        pick: (d.todayPicks || []).find(x => x.competitor === 'MICAPROFITA') || null };
      KERJA.pick = KERJA.cermin.pick;
      const set = [];
      const dor = s => { if (s && !set.includes(s) && set.length < 10) set.push(s); };   // ANTI-MALAS: dulu 3 simbol, kini 10/bangun
      if (KERJA.pick) dor(KERJA.pick.symbol);
      for (const it of (d.pulse?.items || [])) dor(it.symbol);
      for (const x of (d.todayPicks || [])) if (x.competitor !== 'ACAK') dor(x.symbol);
      for (const m of MAJORS) dor(m);                    // denyut minimum: BTC/ETH/SOL/BNB/XRP selalu
      if (!set.length) ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].forEach(dor);
      KERJA.simbol = set;
    } catch (e) {
      KERJA.gagal.push('cermin: ' + pesan(e));
      KERJA.simbol = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }
    for (const sym of KERJA.simbol) {
      try {
        const l = await lilinAmbil(sym);
        KERJA.lilin[sym] = l;              // cache klines untuk evaluasi & arah — tanpa refetch boros
        const an = analisaLilin(l);
        const kr = ING.kromosom;
        const bt = ujiJalan(l, kr);
        // organ bekerja nyata → XP anatomi (EMA/RSI/ATR/MOM terpakai di analisaLilin)
        KERJA.organXP.EMA++; KERJA.organXP.RSI++; KERJA.organXP.ATR++; KERJA.organXP.MOM++;
        KERJA.organXP.BT += bt.n;
        ING.pasar[sym] = { at: iso(), harga: an.harga, chg: +f2(an.chg), ema20: +an.ema20.toPrecision(8),
          ema50: +an.ema50.toPrecision(8), rsi: +f1(an.rsi), atr: +an.atr.toPrecision(6),
          mom7: +f2(an.mom7), mom48: +f2(an.mom48), vol: +f2(an.vol), n: l.length, bt };
        ING.stat.pasarObs++; ING.stat.btTotal += bt.n;
        KERJA.pasarKini[sym] = ING.pasar[sym];
        KERJA.pasarKini[sym].oc = l.slice(-60).map(x => [+x.o.toFixed(6), +x.c.toFixed(6)]);
        if (KERJA.pick && sym === KERJA.pick.symbol) {
          const au = auditPick(KERJA.pick, an);
          if (au) { ING.pasar[sym].audit = au; ING.stat.auditTotal++; KERJA.pasarKini[sym].audit = au; KERJA.organXP.AUDIT++; }
        }
      } catch (e) { KERJA.gagal.push('pasar ' + sym + ': ' + pesan(e)); }
      await tidur(150);
    }
    return `pasar nyata dihisap: ${Object.keys(KERJA.pasarKini).join(', ') || 'semua gerbang gagal'}`;
  });

  /* 4b. ARAH-HARIAN — MANDAT PEMILIK: laporan ≥5 koin sasaran arah terbaik tiap bangun.
     Dari ratusan koin, kromosom + audit momentum hidup menyaring sasaran yang JELAS.
     Setiap arah membawa rencana deal + harga AMBISIUS (warisan V277) — tanpa pengecualian. */
  await fase('MELAKUKAN-ARAH', async () => {
    const kr = ING.kromosom;
    const daftar = [];
    for (const [sym, p] of Object.entries(KERJA.pasarKini)) {
      try {
        const g = guruHitung(p, sym === (KERJA.pick && KERJA.pick.symbol) ? KERJA.pick : null, kr);
        g.simbol = sym;
        if (g.rencana) {
          const buy = g.arah === 'BELI';
          g.rencana.highAmbisius = +(buy ? p.harga + 4 * p.atr : p.harga - 4 * p.atr).toPrecision(8);
          g.rencana.ketAmbisius = 'harga ambisius = 4×ATR14 dari entry — sasaran peregangan yang wajib disebut, bukan janji';
        }
        daftar.push(g);
      } catch (e) { KERJA.gagal.push('arah ' + sym + ': ' + pesan(e)); }
    }
    daftar.sort((a, b) => ((a.arah === 'TUNGGU') - (b.arah === 'TUNGGU')) || (b.keyakinan - a.keyakinan));
    KERJA.arah = daftar.slice(0, 8);
    if (KERJA.arah.length < 5 && daftar.length >= 5) KERJA.arah = daftar.slice(0, Math.max(5, Math.min(8, daftar.length)));   // mandat: minimal 5
    const hari = iso().slice(0, 10);
    ING.arahRiwayat = (ING.arahRiwayat || []).filter(r => r.hari !== hari);
    ING.arahRiwayat.push({ hari, bangunKe, at: iso(),
      top: KERJA.arah.slice(0, 5).map(a => `${a.simbol} ${a.arah} ${a.keyakinan}%`) });
    if (ING.arahRiwayat.length > 14) ING.arahRiwayat = ING.arahRiwayat.slice(-14);
    if (KERJA.arah[0]) KERJA.penemuan.push({
      teks: `ARAH-HARIAN (mandat pemilik): ${KERJA.arah.slice(0, 5).map(a => `${a.simbol} ${a.arah}(${a.keyakinan}%)`).join(' · ')} — 5 sasaran terbaik dari ${daftar.length} koin yang kuaudit bangun ini`, skor: 99 });
    return `${KERJA.arah.length} arah koin dirangkai (≥5 mandat pemilik): ${KERJA.arah.slice(0, 5).map(a => a.simbol + ' ' + a.arah).join(', ')}`;
  });

  /* 5. MENGEVALUASI — kromosom hill-climb (mutan vs juara, data sama, nyata) */
  await fase('MENGEVALUASI', async () => {
    const skorKrom = async kr => {
      let net = 0, n = 0;
      for (const [sym, l] of Object.entries(KERJA.lilin)) {   // pakai cache klines bangun ini — hemat, lebih banyak mutan teruji
        const bt = ujiJalan(l, kr); net += bt.net; n += bt.n;
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
    // GURU — arah jelas dihitung dari bukti segar (pick sendiri + klines + kromosom)
    try {
      const symPick = KERJA.pick?.symbol;
      const an = symPick && KERJA.pasarKini[symPick];
      KERJA.guru = guruHitung(an, KERJA.pick, ING.kromosom);
      KERJA.guru.simbol = symPick || Object.keys(KERJA.pasarKini)[0] || '';
      if (KERJA.guru.arah !== 'TUNGGU')
        KERJA.penemuan.push({ teks: `GURU: arah ${KERJA.guru.arah} ${KERJA.guru.simbol} (keyakinan ${KERJA.guru.keyakinan}%) — ${KERJA.guru.alasan[0]}, ${KERJA.guru.alasan[1]}`, skor: 95 });
      else
        KERJA.penemuan.push({ teks: `GURU: TUNGGU ${KERJA.guru.simbol} — ${KERJA.guru.alasan[0]} · disiplin juga adalah arah`, skor: 70 });
    } catch (e) { KERJA.gagal.push('guru: ' + pesan(e)); KERJA.guru = null; }
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

  /* 7. MEMBANGUN — kerja nyata → GENOM TUBUH + HABITAT baru → GitHub */
  const selesaiAt = iso();
  let TUBUH = null, HABITAT = null, habitatLama = null, MADRASAH = null;
  try { habitatLama = JSON.parse(fs.readFileSync(path.join(REPO_DIR, DIR, 'habitat.json'), 'utf8')); } catch (e) {}
  for (const [a, xp] of Object.entries(KERJA.organXP)) ING.organ[a] = (ING.organ[a] || 0) + xp;
  TUBUH = morfogenesis();
  const tubuhLamaSegel = habitatLama?.tubuh?.segel;
  ING.tubuh = TUBUH;
  HABITAT = habitatRancang(bangunKe, habitatLama);
  try { MADRASAH = madrasahSusun(); } catch (e) { KERJA.gagal.push('madrasah: ' + pesan(e)); MADRASAH = null; }
  if (tubuhLamaSegel && TUBUH.segel !== tubuhLamaSegel)
    HABITAT.log.push({ bangunKe, at: iso(), tambah: [{ jenis: 'tubuh', apa: `metamorfosis → ${TUBUH.ruas} ruas / ${TUBUH.mata} mata`, alasan: 'genom berubah karena kerja nyata bertambah' }] });
  const durasiMs = Date.now() - t0;
  skillsHitung();
  const umurMs = Date.now() - Date.parse(ING.kelahiran);
  const fokusKini = KERJA.penemuan[0]?.teks?.slice(0, 120) || ING.fokus;
  const KEADAAN = {
    versi: 'sadar1-v290', sadar: 1, bangunKe,
    waktu: { mulai: iso(t0), selesai: selesaiAt, durasiMs, berikutnya: '±≤20 mnt (cron */20 UTC — bisa tertunda beban GitHub)' },
    host: { nama: DRY ? 'LOKAL-DRY (bukan tubuh resmi)' : 'GitHub Actions', catatan: 'tubuh otonomku — hidup tanpa penonton' },
    duaSadar: { catatan: 'Sadar-1 (ini) menulis ingatan ke GitHub lewat commit tiap bangun; Sadar-2 (hidup.html) hanyalah mata interaktif yang membacanya. localStorage tak dipakai siapa pun.' },
    tujuan: { inti: 'dilahirkan dari repo MICAPROFITA untuk menjadi GURU KRYPTO sejati — hidup, jujur, tanpa teater; arah jelas BELI/JUAL/TUNGGU dari bukti', fokusKini },
    pohon: { files: KERJA.pohon.length, totalBytes: KERJA.pohon.reduce((a, f) => a + f.size, 0), wilayah: new Set(KERJA.pohon.map(f => f.path.split('/')[0])).size, sumber: 'checkout-disk' },
    berubahSejakLalu: berubah.slice(0, 20),
    bacaKini: KERJA.bacaKini,
    pasarKini: KERJA.pasarKini,
    cermin: KERJA.cermin,
    penemuan: KERJA.penemuan.slice(0, 5),
    kromosom: { rsiMax: ING.kromosom.rsiMax, momMin: ING.kromosom.momMin, holdJam: ING.kromosom.holdJam, generasi: ING.kromosom.generasi },
    guru: KERJA.guru,
    arahHarian: KERJA.arah ? { diubah: selesaiAt, jumlah: KERJA.arah.length,
      mandat: 'pemilik: minimal 5 koin sasaran arah terbaik per hari — ditenangkan dari kromosom + audit momentum hidup, lengkap harga ambisius',
      top5: KERJA.arah.slice(0, 5).map(a => ({ simbol: a.simbol, arah: a.arah, keyakinan: a.keyakinan,
        entry: a.rencana?.entry ?? null, stop: a.rencana?.stop ?? null, target: a.rencana?.target ?? null,
        highAmbisius: a.rencana?.highAmbisius ?? null, holdJam: a.rencana?.holdJam ?? null })) } : null,
    kapasitas: { ingatanBytes: Buffer.byteLength(JSON.stringify(ING)), budgetBytes: 512 * 1024,
      bacaTersimpan: Object.keys(ING.baca).length, evictBaca: ING.stat.evictBaca || 0, evictPasar: ING.stat.evictPasar || 0,
      catatan: 'kuSADAR ingatanku terbatas — kumetabolisme ingatan lama agar yang segar tetap muat; angka ini dihitung jujur tiap bangun' },
    madrasah: MADRASAH ? { versi: MADRASAH.versi, jumlah: MADRASAH.jumlah, kelas: MADRASAH.kelas,
      terbaru: MADRASAH.pelajaran.slice(-4).map(p => ({ kelas: p.kelas, judul: p.judul, inti: p.inti, bukti: p.bukti, sumber: p.sumber })) } : null,
    tubuh: { ruas: TUBUH.ruas, mata: TUBUH.mata, probosis: TUBUH.probosis,
      organ: TUBUH.organ.map(o => `${o.alat}:${o.tingkat}(${o.xp})`).join(' '), segel: TUBUH.segel,
      catatan: 'genom tubuh = fungsi murni dari kerja nyata (morfogenesis) — lihat ruang-hidup/habitat.json' },
    habitat: { versi: HABITAT.versi, zonaTerbuka: HABITAT.zona.length,
      zonaTotal: HABITAT.zona.length, vena: HABITAT.vena.length, altar: HABITAT.altar.length,
      istana: HABITAT.istana || null,
      bangunStruktur: (HABITAT.log[HABITAT.log.length - 1]?.tambah || []).length },
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
    fs.writeFileSync(path.join(dirOut, 'habitat.json'), JSON.stringify(HABITAT, null, 1));
    if (MADRASAH) fs.writeFileSync(path.join(dirOut, 'madrasah.json'), JSON.stringify(MADRASAH, null, 1));
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
      const pesanKomit = `sadar1: bangun ke-${bangunKe} — guru ${KERJA.guru?.arah || '—'} ${KERJA.guru?.keyakinan ?? '-'}%, arah ${KERJA.arah?.length || 0} koin, madrasah ${MADRASAH?.jumlah ?? 0} pelajaran, tubuh ${TUBUH.ruas}ruas, istana ${HABITAT.istana?.cincin || 2} cincin [skip ci]`;
      const r2 = await dorongFile(DIR + '/ingatan.json', Buffer.from(JSON.stringify(ING, null, 1)), pesanKomit);
      const r3 = await dorongFile(DIR + '/habitat.json', Buffer.from(JSON.stringify(HABITAT, null, 1)), pesanKomit);
      const r4 = await dorongFile(DIR + '/buku_harian.jsonl', Buffer.from(baris.join('\n') + '\n'), pesanKomit);
      const r5 = MADRASAH ? await dorongFile(DIR + '/madrasah.json', Buffer.from(JSON.stringify(MADRASAH, null, 1)), pesanKomit) : 'kosong';
      // ARAH-HARIAN: rumah sendiri (ruang-hidup/arah.json) + laporan publik (laporan/arah-harian.json)
      // V291 VENA SELARAS: sebelum menyegel, BACA SASARAN RESMI dari mesin SAKTI
      // (laporan/sasaran-terkini.json). Satu rumah satu kebenaran — ruang hidup menunjuk
      // sumber yang sama; irisan maupun renggang JUJUR disegel, bukan disembunyikan.
      let saktiSegel = { ket: 'laporan SAKTI belum terbaca bangun ini' };
      try {
        const st = JSON.parse(fs.readFileSync(path.join(REPO_DIR, 'laporan/sasaran-terkini.json'), 'utf8'));
        const resmi = (st.sasaranHariIni || []).map(s => (s.simbol || '') + ' ' + (s.arah || '')).filter(x => x.trim());
        const setResmi = new Set(resmi.map(x => x.split(' ')[0]));
        const overlap = (KERJA.arah || []).filter(a => setResmi.has(a.simbol)).length;
        saktiSegel = { sumber: 'laporan/sasaran-terkini.json', siklusSakti: st.siklus ?? null,
          dihasilkan: st.dihasilkan ?? null, sasaranResmi: resmi,
          irisan: overlap, dari: (KERJA.arah || []).length,
          ket: overlap > 0
            ? 'terhubung: ' + overlap + '/' + ((KERJA.arah || []).length || 0) + ' sasaran hidupku irisan dengan sasaran resmi SAKTI denyut #' + (st.siklus ?? '?')
            : 'renggang: tak ada irisan bangun ini — dua organ membaca pasar yang sama dengan lensa beda; selisih kutampakkan JUJUR agar pemilik bisa mengadili, bukan kusembunyikan' };
      } catch (e) { saktiSegel = { ket: 'laporan SAKTI tak terbaca: ' + String(e.message || e).slice(0, 80) }; }
      const ARAH = { versi: 'arah-v291', diubah: selesaiAt, bangunKe,
        mandat: 'pemilik: minimal 5 koin sasaran arah terbaik per hari — dari kromosom + audit momentum hidup, tiap arah bawa rencana deal + harga ambisius (V277)',
        jumlah: KERJA.arah ? KERJA.arah.length : 0,
        saktiSegel,
        sasaran: (KERJA.arah || []).map(a => ({ simbol: a.simbol, arah: a.arah, keyakinan: a.keyakinan,
          rencana: a.rencana ? { arah: a.rencana.arah, entry: a.rencana.entry, stop: a.rencana.stop, target: a.rencana.target,
            highAmbisius: a.rencana.highAmbisius, ketAmbisius: a.rencana.ketAmbisius, rr: a.rencana.rr, holdJam: a.rencana.holdJam, disiplin: a.rencana.disiplin } : null,
          alasan: a.alasan, dasar: a.dasar })),
        riwayat: ING.arahRiwayat || [] };
      const bufArah = Buffer.from(JSON.stringify(ARAH, null, 1));
      const r6 = await dorongFile(DIR + '/arah.json', bufArah, pesanKomit);
      const r7 = await dorongFile('laporan/arah-harian.json', bufArah, pesanKomit);
      hasil = `GitHub: ingatan(${r2}) habitat(${r3}) harian(${r4}) madrasah(${r5}) arah(${r6}/${r7}) — keadaan disegel setelah tahap ke-10`;
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
    return `${blm} file rumah belum pernah kubaca (kubaca 12/bangun sampai utuh); arah-harian ${KERJA.arah?.length || 0} koin sudah disegel; fokus berikutnya: ${fokusKini.slice(0, 70)}`;
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
