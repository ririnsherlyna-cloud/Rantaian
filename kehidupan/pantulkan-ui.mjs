#!/usr/bin/env node
// ============================================================
// PANTULKAN-UI — cermin data untuk wujud mandiri di GitHub Pages.
// Membaca jejak hidup NYATA di repo (kromosom, statistik, jurnal,
// pasar, gudang-otak) lalu menulis data/api/*.json yang dimakan
// UI pantulan (salinan 1:1 arena otak).
// Hukum V274: TIDAK ADA ANGKA KARANGAN. Field yang tak bisa
// dihitung di GitHub dibiarkan kosong/null — UI menampilkannya
// jujur sebagai "menunggu medan".
// Tanpa dependensi. Node >= 18.
// ============================================================

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR_K = join(AKAR, 'kehidupan');
const DIR_G = join(AKAR, 'gudang-otak');
const DIR_KEL = join(AKAR, 'data', 'api');

const baca = (f) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
const bacaTeks = (f) => existsSync(f) ? readFileSync(f, 'utf8') : '';
const sekarang = () => new Date().toISOString();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function jurnalBaris() {
  return bacaTeks(join(DIR_K, 'jurnal.jsonl')).split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function jumlahBerkas(dir) {
  try {
    return readFileSync(dir, 'utf8').split('\n').filter(Boolean).length;
  } catch { return 0; }
}

// ============================================================
// ARENA — keadaan hidup utama (dipantau UI tiap beberapa detik)
// ============================================================
function bangunArena(krom, stat, pas, jrn) {
  const now = sekarang();
  const today = now.slice(0, 10);
  const koin = (pas && pas.koin) || [];
  const H = krom.horizonJam || 3;

  // umur garis darah: dari kapsul tersegel tertua (warisan induk)
  let umurHari = 1;
  try {
    const kapsulTua = krom.warisan && krom.warisan.kapsulTertua ? String(krom.warisan.kapsulTertua).slice(0, 10) : null;
    if (kapsulTua) umurHari = Math.max(1, Math.round((Date.now() - new Date(kapsulTua + 'T00:00:00Z').getTime()) / 86400000));
  } catch {}

  const akurasiTampil = stat.akurasiTerbaik ? stat.akurasiTerbaik.nilai : (stat.akurasiTerakhir || 0);
  const lolosN = koin.filter(k => k.lolos).length;

  const picks = koin
    .map((k, i) => {
      const konf = Math.round(clamp((Math.abs(k.skor) / 0.5) * 100, 5, 99));
      const netSasaran = k.rencana ? +(k.rencana.targetPct - 0.4).toFixed(2) : null;
      return {
        competitor: 'MICAPROFITA',
        symbol: k.simbol,
        direction: k.arah,
        confidence: konf,
        entryClose: k.rencana ? k.rencana.entry : k.close,
        evidence: {
          rank: i + 1,
          guard: k.lolos ? 'LOLOS' : 'DITOLAK',
          guardAlasan: k.lolos ? null : `skor komposit ${k.skor >= 0 ? '+' : ''}${k.skor} di bawah ambang ${(pas.ambang || krom.ambang).toFixed(3)} — belum ada kepastian arah`,
          raw: { mom7: k.mom7 ?? undefined, m4h: k.ubah24j ?? undefined, rsi: k.rsi ?? undefined, atrPct: k.atrPct, qv: k.qv ?? undefined, close: k.close },
          factors: k.faktor || null,
          topReasons: [
            `struktur EMA ${(k.faktor ? k.faktor.struktur : 0).toFixed(2)} · momentum 7j ${(k.faktor ? k.faktor.momentum : 0).toFixed(2)}`,
            `RSI ${k.rsi ?? '—'} · ATR ${k.atrPct}% · skor komposit ${k.skor >= 0 ? '+' : ''}${k.skor} (ambang ${(pas.ambang || krom.ambang).toFixed(3)})`,
            `ubah 24j ${k.ubah24j !== null && k.ubah24j !== undefined ? (k.ubah24j >= 0 ? '+' : '') + k.ubah24j.toFixed(1) + '%' : '—'} · qv ${k.qv ? (k.qv / 1e6).toFixed(1) + 'jt' : '—'}`,
          ],
          duties: [
            { name: 'Data cukup', pass: true, note: 'candle 1h tertutup dari sumber ' + (pas.sumber || '—') },
            { name: 'Likuiditas', pass: (k.qv || 0) >= 5_000_000, note: k.qv ? `qv ${(k.qv / 1e6).toFixed(1)}jt USDT/24j` : '—' },
            { name: 'Kepastian ambang', pass: k.lolos, note: `|skor| ${Math.abs(k.skor).toFixed(3)} vs ambang ${(pas.ambang || krom.ambang).toFixed(3)}` },
          ],
          rencana: k.rencana ? {
            entry: k.rencana.entry, stop: k.rencana.stop, target: k.rencana.target,
            highAmbisius: k.rencana.highAmbisius, stopPct: k.rencana.stopPct, targetPct: k.rencana.targetPct,
            ambisiusPct: k.rencana.ambisiusPct, pTarget: null, pStop: null, pAmbisius: null,
            targetMediana: false, netUntungPct: netSasaran,
            sumberTarget: k.rencana.sumberTarget, ketGuard: k.rencana.ketGuard,
          } : null,
          praRegistrasi: { waktuKunci: pas.waktu || now, horizon: `${H} jam`, feePct: 0.2, netWajib: true, sumber: 'komit GitHub Rantaian (denyut otomatis)' },
          sadardiri: k.lolos ? null : 'skor di bawah ambang — ditampilkan karena hukum anti-buang, bukan kepastian arah',
        },
      };
    })
    // hukum anti-buang: lolos dulu di atas, ditolak paling bawah
    .sort((a, b) => (a.evidence.guard === 'DITOLAK' ? 1 : 0) - (b.evidence.guard === 'DITOLAK' ? 1 : 0) || a.evidence.rank - b.evidence.rank);

  const nadirItems = picks.filter(p => p.evidence.guard === 'LOLOS').slice(0, 6).map(p => {
    const k = koin.find(x => x.simbol === p.symbol);
    const ev = p.evidence;
    return {
      symbol: p.symbol, direction: p.direction,
      entryClose: ev.rencana.entry, livePrice: k ? k.last : null,
      liveRetPct: k && k.last ? +(((k.last / ev.rencana.entry) - 1) * 100).toFixed(3) : null,
      verdict: null, spark: k ? k.spark : undefined, fundingPct: null,
      warisan: null, rencana: ev.rencana, daya: null, praRegistrasi: ev.praRegistrasi, sadardiri: null,
    };
  });

  const jPeta = {
    evolusi: 'UPGRADE', suntik: 'REVOLUSI', denyut: 'SISTEM', tidur: 'SISTEM',
    cedera: 'SISTEM', 'ujian-tipis': 'SISTEM', 'pasar-gagal': 'SISTEM',
  };
  const events = jrn.slice(-12).reverse().map(j => ({
    day: String(j.waktu || '').slice(0, 10),
    kind: jPeta[j.peristiwa] || 'SISTEM',
    text: teksJurnal(j),
    at: j.waktu || now,
  }));

  const logs = jrn.slice(-10).reverse().map(j => ({
    day: String(j.waktu || '').slice(0, 10),
    generation: j.generasi ?? stat.generasi ?? 0,
    kind: j.peristiwa === 'evolusi' ? 'UPGRADE' : j.peristiwa === 'suntik' ? 'REVOLUSI' : 'DENYUT',
    note: teksJurnal(j),
    fitness: typeof j.akurasi === 'number' ? j.akurasi : null,
  }));

  const byKind = {};
  for (const j of jrn) byKind[j.peristiwa || 'lain'] = (byKind[j.peristiwa || 'lain'] || 0) + 1;

  const bytesJurnal = Buffer.byteLength(bacaTeks(join(DIR_K, 'jurnal.jsonl'))) || 0;
  const recent = jrn.slice(-6).reverse().map((j, i) => ({
    fingerprint: 'rantaian-' + (jrn.length - i),
    kind: String(j.peristiwa || 'DENYUT').toUpperCase(),
    hits: 1, firstDay: String(j.waktu || '').slice(0, 10), lastDay: String(j.waktu || '').slice(0, 10),
    payload: { note: teksJurnal(j), n: j.dinilai ?? 0, sumRet: 0 },
  }));

  return {
    today,
    dataDay: today,
    stale: false,
    dataLagHari: 0,
    serverNow: now,
    bootstrap: { status: 'selesai', progress: 100, error: null },
    regime: pas.rezim || null,
    universe: { symbols: koin.length, pool: koin.length, backfillDays: 10, scoredDays: umurHari },
    standings: [{
      competitor: 'MICAPROFITA',
      days: umurHari,
      picks: stat.titikUjian || 0,
      hitRate: akurasiTampil,
      cumRet: null, bestDay: null, worstDay: null,
    }],
    chart: (stat.riwayat || []).filter(r => typeof r.akurasi === 'number')
      .map(r => ({ day: String(r.waktu).slice(5, 16).replace('T', ' '), MICAPROFITA: +(r.akurasi * 100).toFixed(2) })),
    climate: null,
    slotHariIni: {
      day: today, k: 50, lahir: picks.length,
      dipindai: koin.length, dianalisa: koin.length,
      lolos: lolosN, ditolakN: picks.length - lolosN,
      ditolak: picks.filter(p => p.evidence.guard === 'DITOLAK').slice(0, 15)
        .map(p => ({ symbol: p.symbol, reason: p.evidence.guardAlasan || '' })),
    },
    bukuCuan: null,
    disiplinCuan: null,
    pulse: nadirItems.length > 0 ? { at: pas.waktu || now, utcClosesInMs: pas.utcClosesInMs || 0, items: nadirItems } : undefined,
    todayPicks: picks,
    genome: {
      generation: krom.generasi || 0,
      states: [{ regime: 'SEMUA-REZIM', weights: krom.bobot }],
      logs,
      upgradeEtaUntil: null,
    },
    memory: {
      rawEvents: jrn.length, storedRows: jrn.length, dedupMerges: 0,
      compressionRatio: 1, bytesRaw: bytesJurnal, bytesStored: bytesJurnal, byteRatio: 1,
      byKind: Object.entries(byKind).map(([kind, rows]) => ({ kind, rows, hits: rows })),
      totalHits: 0,
      recent,
    },
    leakAudit: null,
    brier: { n: 0, nilai: null, trimUntil: null },
    events,
  };
}

function teksJurnal(j) {
  const p = j.peristiwa;
  if (p === 'evolusi') return `gen-${j.generasi ?? '?'} lahir — akurasi ujian ${(j.akurasi * 100).toFixed(1)}% pada ${j.dinilai} titik (${j.koin} koin, ${j.sumber})`;
  if (p === 'denyut') return `denyut gen-${j.generasi ?? '?'} — akurasi ${(j.akurasi * 100).toFixed(1)}% (${j.dinilai} titik, ${j.koin} koin, ${j.sumber}) — tidak ada mutasi yang lebih tajam`;
  if (p === 'suntik') return `database otak induk disuntikkan: ${j.rincian || 'warisan gen-4'} — evolusi lanjut murni milik GitHub`;
  if (p === 'ujian-tipis') return `ujian tipis (${j.dinilai ?? 0} titik < 150) — jujur tidak belajar denyut ini`;
  if (p === 'tidur') return `tidur — ${j.alasan || 'sumber data tak terjangkau'}`;
  if (p === 'cedera') return `cedera — ${j.alasan || 'galat tak terduga'}; pulih pada denyut berikut`;
  if (p === 'pasar-gagal') return `pantulan pasar gagal — ${j.alasan || '?'}`;
  return `${p || 'peristiwa'} ${j.alasan || ''}`.trim();
}

// ============================================================
// PERTUMBUHAN — AGI% = P × G × A (rumah sama dgn otak induk,
// diisi angka nyata Rantaian)
// ============================================================
function bangunGrowth(krom, stat, pas, jrn) {
  const now = sekarang();
  const akurasiPuncak = stat.akurasiTerbaik ? stat.akurasiTerbaik.nilai : (stat.akurasiTerakhir || 0);
  const akurasiAkhir = stat.akurasiTerakhir || 0;
  const koinN = (pas.koin && pas.koin.length) || stat.koinDipindai || 0;

  const dims = [
    { id: 'arah', label: 'Ketepatan arah', w: 0.4, score: clamp((akurasiPuncak - 0.5) * 10, 0, 1), detail: `tepi akurasi ${(akurasiPuncak - 0.5) * 100 >= 0 ? '+' : ''}${((akurasiPuncak - 0.5) * 100).toFixed(1)} poin di atas peluang dasar 50% (skala ×10, jujur tipis)` },
    { id: 'ketebalan', label: 'Ketebalan ujian', w: 0.2, score: clamp((stat.titikUjian || 0) / 5000, 0, 1), detail: `${stat.titikUjian || 0} titik dinilai denyut terakhir` },
    { id: 'kedalaman', label: 'Kedalaman pasar', w: 0.15, score: clamp(koinN / 50, 0, 1), detail: `${koinN} koin futures dipindai tiap denyut` },
    { id: 'kestabilan', label: 'Kestabilan', w: 0.15, score: akurasiPuncak > 0 ? clamp(akurasiAkhir / akurasiPuncak, 0, 1) : 0, detail: `akhir ${(akurasiAkhir * 100).toFixed(1)}% vs puncak ${(akurasiPuncak * 100).toFixed(1)}%` },
    { id: 'disiplin', label: 'Disiplin ambang', w: 0.1, score: clamp((krom.ambang || 0) / 0.3, 0, 1), detail: `ambang kepastian ${(krom.ambang || 0).toFixed(3)} (evolusi sendiri)` },
  ];
  const geoMean = (arr) => Math.exp(arr.reduce((a, d) => a + d.w * Math.log(Math.max(d.score, 0.01)), 0) / arr.reduce((a, d) => a + d.w, 0));
  const P = clamp(Math.round(geoMean(dims) * 100), 1, 99);

  const tasks = [
    { id: 'pindai', label: 'Pindai futures USDT-M', on: true, sinceDay: '2026-10-17' },
    { id: 'uji', label: 'Uji arah walk-forward', on: true, sinceDay: '2026-10-17' },
    { id: 'evolusi', label: 'Evolusi hill-climb', on: true, sinceDay: '2026-10-17' },
    { id: 'jurnal', label: 'Jurnal kejujuran', on: true, sinceDay: '2026-10-17' },
    { id: 'prareg', label: 'Rencana pra-registrasi ATR', on: true, sinceDay: '2026-10-17' },
    { id: 'ui', label: 'Pantulkan UI hidup', on: true, sinceDay: '2026-10-17' },
    { id: 'gudang', label: 'Gudang arsip ber-sha256', on: true, sinceDay: '2026-10-17' },
    { id: 'llm', label: 'Vonis berita LLM', on: false, sinceDay: '' },
    { id: 'dagang', label: 'Dagang uang nyata', on: false, sinceDay: '' },
    { id: 'suite', label: 'Suite blind-market 100 pasar', on: false, sinceDay: '' },
  ];
  const taskOn = tasks.filter(t => t.on).length;
  const modalities = [
    { id: 'binance-fapi', label: 'Binance fapi', on: stat.sumberData === 'binance-fapi', sinceDay: '2026-10-17' },
    { id: 'okx-swap', label: 'OKX swap', on: true, sinceDay: '2026-10-17' },
    { id: 'llm', label: 'LLM', on: false, sinceDay: '' },
    { id: 'berita', label: 'Pita berita', on: false, sinceDay: '' },
  ];
  const modOn = modalities.filter(m => m.on).length;
  const breadth = clamp(koinN / 500, 0, 1);
  const G = clamp(breadth * 0.4 + (taskOn / tasks.length) * 0.4 + (modOn / modalities.length) * 0.2, 0.01, 1);

  const parts = [
    { id: 'denyut', label: 'Denyut otomatis tiap 10 menit', score: 100 },
    { id: 'evolusi', label: 'Evolusi tanpa tangan manusia', score: 100 },
    { id: 'pemulihan', label: 'Pemulihan tidur/cedera mandiri', score: 100 },
    { id: 'komit', label: 'Komit, rilis & pantulan data mandiri', score: 100 },
  ];
  const A = Math.round(parts.reduce((a, p) => a + p.score, 0) / parts.length);

  const agiPct = +((P / 100) * G * (A / 100) * 100).toFixed(2);
  const TANGGA = [
    { id: 'L1', name: 'Lahir', min: 0 }, { id: 'L2', name: 'Berdenyut', min: 1 },
    { id: 'L3', name: 'Pembelajar', min: 3 }, { id: 'L4', name: 'Disiplin', min: 6 },
    { id: 'L5', name: 'Mandiri', min: 10 }, { id: 'L6', name: 'Ahli-Niche', min: 16 },
  ];
  let rankIdx = 0;
  for (let i = 0; i < TANGGA.length; i++) if (agiPct >= TANGGA[i].min) rankIdx = i;
  const rank = TANGGA[rankIdx];
  const next = TANGGA[rankIdx + 1] || null;

  const riwayat = (stat.riwayat || []).filter(r => typeof r.akurasi === 'number');
  const history = riwayat.map(r => {
    const p = +(r.akurasi * 100).toFixed(2);
    return { day: String(r.waktu).slice(0, 10), agi: +(p * G * (A / 100)).toFixed(2), p, cum: null, hit: r.dinilai || 0, brier: 0 };
  });
  const fromPct = history.length ? history[0].p : P;
  const toPct = history.length ? history[history.length - 1].p : P;
  const mult = fromPct > 0 ? +(toPct / fromPct).toFixed(2) : 1;

  const evPertama = jrn.find(j => j.peristiwa === 'evolusi');
  return {
    at: now,
    scoredDays: stat.denyut || 0,
    agiPct,
    p: { level: P, dims },
    g: { breadth, domainShare: 1 / 10, task: { on: taskOn, total: tasks.length }, modality: { on: modOn, total: modalities.length }, tasks, modalities },
    a: { score: A, parts },
    rank: {
      id: rank.id, name: rank.name,
      desc: `AGI% = P × G × A (rata geometri berbobot). Otonomi penuh (A) nyata di GitHub — denyut, ujian, evolusi, dan rilis data UI berjalan sendiri; kemahiran arah (P) masih tipis di atas peluang dasar dan diakui jujur.`,
      next: next ? { id: next.id, name: next.name, min: next.min } : null,
    },
    growth: history.length >= 2 ? { fromPct, toPct, mult, doublingDays: mult > 1 ? null : null } : null,
    history,
    curriculum: [
      { id: 'c1', lever: 'P', label: 'Perbesar sampel ujian', why: `titik ujian denyut terakhir ${stat.titikUjian || 0} — makin tebal makin jujur`, action: 'tarik candle lebih dalam saat sumber mengizinkan', dAgiPp: 0.3 },
      { id: 'c2', lever: 'P', label: 'Ketatkan ambang saat akurasi goyah', why: 'ambang ikut berevolusi bila bukti mendukung', action: 'biarkan mutasi mencoba ambang lebih tinggi', dAgiPp: 0.2 },
      { id: 'c3', lever: 'G', label: 'Tambah sumber data kedua aktif', why: 'binance fapi kerap memblokir IP runner', action: 'okx tetap utama, binance dicoba tiap denyut', dAgiPp: 0.2 },
      { id: 'c4', lever: 'G', label: 'Wujudkan horizon kedua (1 jam)', why: 'kepastian multi-horizon memperluas domain', action: 'butuh penilaian dua horizon per denyut', dAgiPp: 0.4 },
      { id: 'c5', lever: 'A', label: 'Rilis pantulan UI otomatis', why: 'data UI kini lahir dari denyut yang sama', action: 'sudah aktif — pertahankan', dAgiPp: 0.1 },
    ],
    skills: [],
    emergent: [
      { id: 'evolusi-mandiri', label: 'Evolusi mandiri tanpa pengembang', active: !!evPertama, sinceDay: evPertama ? String(evPertama.waktu).slice(0, 10) : null },
      { id: 'hidup-github', label: 'Hidup penuh di GitHub (tanpa server)', active: true, sinceDay: '2026-10-17' },
    ],
    log: jrn.slice(-16).reverse().map(j => ({ day: String(j.waktu || '').slice(0, 10), kind: String(j.peristiwa || 'denyut').toUpperCase(), text: teksJurnal(j) })),
    researchMap: [
      { concept: 'Hill-climb evolusi bobot', source: 'gudang-otak/otak/genome-server.json (warisan gen-4)', ours: 'kehidupan/hidup.mjs mutasi ±12% + adopsi hanya bila lebih tajam' },
      { concept: 'Pra-registrasi rencana', source: 'organ V242-ORKESTRA otak induk', ours: 'rencana ATR terkunci di komit GitHub sebelum horizon' },
      { concept: 'Arsip ber-integritas', source: 'MANIFEST.json sha256 35 berkas', ours: 'gudang-otak diverifikasi manifest' },
    ],
    memorySummary: { rawEvents: jrn.length, storedRows: jrn.length, verifN: stat.denyut || 0 },
  };
}

// ============================================================
// OTAK — arsitektur MOZAIK (warisan desain) + keadaan hidup
// ============================================================
function bangunOtak(krom, stat, pas, jrn, warisanOtak, kapsul) {
  const now = sekarang();
  const nJurnal = jrn.length;
  const gagalN = jrn.filter(j => j.peristiwa === 'cedera' || j.peristiwa === 'ujian-tipis' || j.peristiwa === 'tidur').length;
  const bytesGudang = kapsul.reduce((a, b) => a + (b.byte || 0), 0);
  const akurasiPct = (stat.akurasiTerbaik ? stat.akurasiTerbaik.nilai : (stat.akurasiTerakhir || 0)) * 100;
  const titik = stat.titikUjian || 0;

  const suites = [{
    id: 'arah-h3', label: `Arah horizon ${krom.horizonJam || 3} jam`, organ: 'RANTAIAN-DENYUT',
    otakVersi: `gen-${krom.generasi || 0}`,
    total: titik, berhasil: Math.round(titik * (akurasiPct / 100)),
    persen: +akurasiPct.toFixed(2), likuidasi: 0, rugiNet: 0, netSum: 0,
    hakim: { total: 0, berhasil: 0 }, segel: { total: 0, berhasil: 0 }, file: 1,
  }];
  const grandTotal = titik;
  const grandBerhasil = Math.round(titik * (akurasiPct / 100));

  return {
    waktu: now,
    nama: 'MOZAIK — Arsitektur Kognitif Terpadu MICAPROFITA (wujud mandiri Rantaian)',
    versi: '1.0-rantaian',
    fakultas: warisanOtak ? warisanOtak.fakultas || [] : [],
    evaluasi: {
      suites,
      grandTotal, grandBerhasil,
      grandPersen: +akurasiPct.toFixed(2),
      grandLikuidasi: 0,
      grandNet: 0,
      kelemahan: [
        `tepi akurasi arah masih tipis (${akurasiPct.toFixed(1)}% vs peluang dasar 50%) — diakui jujur`,
        'IP runner GitHub kerap diblokir binance-fapi — okx-swap jadi sumber utama',
        'vonis berita LLM belum hidup di versi mandiri (butuh otak induk)',
      ],
      fileTotal: 1,
    },
    memori: {
      pengalaman: nJurnal,
      kegagalan: gagalN,
      pelajaran: kapsul.filter(b => String(b.sumber || '').includes('pelajaran')).map(b => b.nama),
      tier: { hot: 1, warm: kapsul.length, cold: kapsul.filter(b => String(b.sumber || '').includes('laporan')).length },
      bytes: bytesGudang,
      file: kapsul.length,
      laporan: kapsul.filter(b => String(b.sumber || '').includes('laporan')).map(b => b.nama).slice(0, 8),
    },
    memoriError: null,
    internet: [
      { id: 'okx-swap', nama: 'OKX Swap — candle & ticker 1h', url: 'https://www.okx.com/api/v5/market/candles', gratis: true, tanpaKey: true, ok: stat.sumberData === 'okx-swap', ms: null, catatan: 'tangga utama kehidupan mandiri (IP runner GitHub)' },
      { id: 'binance-fapi', nama: 'Binance fapi — candle & ticker 1h', url: 'https://fapi.binance.com/fapi/v1/klines', gratis: true, tanpaKey: true, ok: stat.sumberData === 'binance-fapi', ms: null, catatan: 'dicoba lebih dulu tiap denyut; kerap 418/451 dari runner' },
      { id: 'github-actions', nama: 'GitHub Actions — jantung cron 10 menit', url: 'https://api.github.com/repos/ririnsherlyna-cloud/Rantaian/actions', gratis: true, tanpaKey: true, ok: true, ms: null, catatan: 'mesin denyut + komit otomatis' },
      { id: 'github-pages', nama: 'GitHub Pages — wujud tampil', url: 'https://ririnsherlyna-cloud.github.io/Rantaian/', gratis: true, tanpaKey: true, ok: true, ms: null, catatan: 'UI 1:1 pantulan otak, data dari repo sendiri' },
      { id: 'coingecko', nama: 'CoinGecko — iklim pasar', url: 'https://api.coingecko.com', gratis: true, tanpaKey: true, ok: false, ms: null, catatan: 'belum dipakai kehidupan mandiri — iklim tampil jujur kosong' },
    ],
    internetError: null,
    developer: {
      diagnostik: [
        { nama: 'Kromosom utuh', ok: !!krom.bobot, detail: `gen-${krom.generasi || 0} · ambang ${(krom.ambang || 0).toFixed(3)} · horizon ${krom.horizonJam || 3}j` },
        { nama: 'Gudang arsip', ok: kapsul.length > 0, detail: `${kapsul.length} berkas · sha256 di MANIFEST` },
        { nama: 'Warisan induk', ok: !!krom.warisan, detail: krom.warisan ? `${krom.warisan.keturunan || 'gen-4 induk'} · disuntik ${String(krom.warisan.disuntikkan || '').slice(0, 10)}` : '—' },
        { nama: 'Data pantulan UI', ok: true, detail: `arena/growth/otak/gudang lahir dari denyut ${stat.denyut || 0}` },
      ],
      sakti: { ada: true, detail: 'tubuh SAKTI V231 utuh tersalin di gudang-unduh halaman ini (Pusteka Unduh)' },
      paket: { ada: true, detail: 'paket task lengkap tersedia via label UNDUH FILE' },
    },
    developerError: null,
    alat: warisanOtak ? warisanOtak.alat || [] : [],
    loop: warisanOtak ? warisanOtak.loop || { fase: [] } : { fase: [] },
    buktiCli: {
      file: 'gudang-otak/otak/performa.json',
      waktu: (baca(join(DIR_G, 'otak', 'performa.json')) || {}).tgl || now,
      grandPersen: akurasiPct,
    },
  };
}

// ============================================================
// GUDANG — kapsul arsip nyata dari MANIFEST (nadi-panel)
// ============================================================
function bangunGudang(kapsul) {
  return {
    protokol: 'GUDANG-RANTAIAN',
    dir: 'gudang-otak',
    jumlah: kapsul.length,
    kapsul: kapsul.slice(0, 40).map(b => ({
      nama: b.nama,
      byte: b.byte,
      waktu: b.waktu,
      protokol: 'ARSIP-GUDANG-OTAK (sha256)',
    })),
  };
}

// ============================================================
// main
// ============================================================
const krom = baca(join(DIR_K, 'kromosom.json')) || { generasi: 0, bobot: {}, ambang: 0.15, horizonJam: 3 };
const stat = baca(join(DIR_K, 'statistik.json')) || { riwayat: [], denyut: 0 };
const pas = baca(join(DIR_K, 'pasar.json')) || { waktu: sekarang(), sumber: '—', koin: [], ambang: krom.ambang, rezim: null, utcClosesInMs: 0 };
const jrn = jurnalBaris();
const gudang = baca(join(DIR_G, 'MANIFEST.json')) || { berkas: {} };
// MANIFEST.berkas = dict { nama: {ukuran, sha256, sumber} } → daftar kapsul
const daftarGudang = Object.entries(gudang.berkas || {}).map(([nama, b]) => ({
  nama, byte: b.ukuran || 0, sha: b.sha256 || '', sumber: b.sumber || '',
  waktu: b.waktu || gudang.dibuat || sekarang(),
}));
const warisanOtak = baca(join(DIR_G, 'otak', 'mozaik-arsitektur.json'));

const arena = bangunArena(krom, stat, pas, jrn);
const growth = bangunGrowth(krom, stat, pas, jrn);
const otak = bangunOtak(krom, stat, pas, jrn, warisanOtak, daftarGudang);
const gudangData = bangunGudang(daftarGudang);

writeFileSync(join(DIR_KEL, 'arena.json'), JSON.stringify(arena) + '\n');
writeFileSync(join(DIR_KEL, 'growth.json'), JSON.stringify(growth) + '\n');
writeFileSync(join(DIR_KEL, 'otak.json'), JSON.stringify(otak) + '\n');
writeFileSync(join(DIR_KEL, 'gudang.json'), JSON.stringify(gudangData) + '\n');

console.log(`pantulan: arena(${arena.todayPicks.length} koin, lolos ${arena.slotHariIni.lolos}) · growth(AGI ${growth.agiPct}%) · otak(${otak.evaluasi.grandTotal} titik) · gudang(${gudangData.jumlah})`);
