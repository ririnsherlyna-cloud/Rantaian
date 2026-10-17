#!/usr/bin/env node
// ============================================================
// RANTAIAN — kehidupan mandiri di GitHub
// Siklus tiap denyut (10 menit oleh workflow):
//   1. baca kromosom (genom sendiri)
//   2. tarik data pasar NYATA (binance fapi → okx swap sebagai
//      tangga darurat; sumber dicatat jujur di jurnal)
//   3. bangun ujian: dari candle 1 jam, pada tiap titik t
//      tebak arah t+3 jam; bandingkan dengan kenyataan
//   4. evolusi: mutasi bobot (hill-climb); anak diadopsi hanya
//      bila akurasinya lebih TINGGI dan jumlah tebakan cukup
//   5. catat jurnal + statistik; workflow mengkomit sendiri
// Hukum: tanpa dependensi, tanpa karangan angka, tanpa jaring
//        gagal diam-diam — semua peristiwa ditulis jujur.
// Node >= 18 (fetch bawaan).
// ============================================================

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR_K = join(AKAR, 'kehidupan');
const F_KROM = join(DIR_K, 'kromosom.json');
const F_STAT = join(DIR_K, 'statistik.json');
const F_JURNAL = join(DIR_K, 'jurnal.jsonl');

const sekarang = () => new Date().toISOString();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const tanh = Math.tanh;

// ---------- jaring dengan timeout keras ----------
async function ambil(url, ms = 12000) {
  const k = new AbortController();
  const t = setTimeout(() => k.abort(), ms);
  try {
    const r = await fetch(url, { signal: k.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

// ---------- sumber data (dicoba berurutan, sumber dicatat) ----------
const KOIN_STABLE = new Set(['USDC', 'FDUSD', 'TUSD', 'DAI', 'BUSD', 'EUR', 'USDP', 'AEUR', 'USD1', 'XUSD', 'USDE']);
const kotor = (n) => /(UP|DOWN|BULL|BEAR)USDT$/.test(n) || KOIN_STABLE.has(n.replace(/USDT$/, ''));

async function sumberBinance() {
  const hosts = ['https://fapi.binance.com', 'https://fapi1.binance.com', 'https://fapi2.binance.com'];
  let info = null, host = null;
  for (const h of hosts) {
    try { info = await ambil(`${h}/fapi/v1/exchangeInfo`); host = h; break; } catch {}
  }
  if (!info) throw new Error('binance tak terjangkau');
  const sah = new Set(info.symbols.filter(s => s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL' && s.status === 'TRADING').map(s => s.symbol));
  const tick = await ambil(`${host}/fapi/v1/ticker/24hr`);
  const vol = new Map(tick.map(t => [t.symbol, parseFloat(t.quoteVolume)]));
  const koin = [...sah]
    .filter(s => vol.get(s) >= 5_000_000 && !kotor(s))
    .sort((a, b) => vol.get(b) - vol.get(a))
    .slice(0, 30);
  return {
    nama: 'binance-fapi',
    koin,
    candle: async (s) => {
      const raw = await ambil(`${host}/fapi/v1/klines?symbol=${s}&interval=1h&limit=260`);
      return raw.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
    }
  };
}

async function sumberOkx() {
  const ins = await ambil('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
  const usdt = ins.data.filter(i => i.settleCcy === 'USDT' && i.state === 'live').map(i => i.instId);
  const tick = await ambil('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
  const vol = new Map(tick.data.map(t => [t.instId, parseFloat(t.last) * parseFloat(t.volCcy24h || 0)]));
  const koin = usdt
    .filter(s => (vol.get(s) || 0) >= 5_000_000 && !kotor(s.replace('-SWAP', '') + 'X'))
    .sort((a, b) => vol.get(b) - vol.get(a))
    .slice(0, 30);
  return {
    nama: 'okx-swap',
    koin,
    candle: async (s) => {
      const raw = await ambil(`https://www.okx.com/api/v5/market/candles?instId=${s}&bar=1H&limit=280`);
      // okx mengirim menurun; balik agar naik
      return raw.data.map(k => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] })).reverse();
    }
  };
}

// ---------- matematika faktor (satu rumah dengan arena) ----------
function emaSeri(arr, n) {
  const out = new Array(arr.length).fill(NaN);
  if (arr.length < n) return out;
  let s = 0;
  for (let i = 0; i < n; i++) s += arr[i];
  let e = s / n;
  out[n - 1] = e;
  const k = 2 / (n + 1);
  for (let i = n; i < arr.length; i++) { e = arr[i] * k + e * (1 - k); out[i] = e; }
  return out;
}

function rsiSeri(c, n = 14) {
  const out = new Array(c.length).fill(NaN);
  if (c.length <= n) return out;
  let naik = 0, turun = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[i] - c[i - 1];
    if (d > 0) naik += d; else turun -= d;
  }
  let ra = naik / n, rd = turun / n;
  out[n] = rd === 0 ? 100 : 100 - 100 / (1 + ra / rd);
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    ra = (ra * (n - 1) + (d > 0 ? d : 0)) / n;
    rd = (rd * (n - 1) + (d < 0 ? -d : 0)) / n;
    out[i] = rd === 0 ? 100 : 100 - 100 / (1 + ra / rd);
  }
  return out;
}

function atrSeri(cnd, n = 14) {
  const tr = cnd.map((k, i) => i === 0 ? k.h - k.l :
    Math.max(k.h - k.l, Math.abs(k.h - cnd[i - 1].c), Math.abs(k.l - cnd[i - 1].c)));
  const out = new Array(cnd.length).fill(NaN);
  if (cnd.length <= n) return out;
  let s = 0;
  for (let i = 1; i <= n; i++) s += tr[i];
  let a = s / n;
  out[n] = a;
  for (let i = n + 1; i < cnd.length; i++) { a = (a * (n - 1) + tr[i]) / n; out[i] = a; }
  return out;
}

// hitung nilai faktor [-1..1] pada titik t
function faktorPada(cnd, t, pra) {
  const c = cnd.map(k => k.c);
  const { e20, e50, rsi, atr } = pra;
  if (t < 60 || !isFinite(e20[t]) || !isFinite(e50[t]) || !isFinite(rsi[t]) || !isFinite(atr[t]) || atr[t] <= 0) return null;
  const atrA = atr[t];
  const struktur = tanh((e20[t] - e50[t]) / atrA);
  const c7 = c[t - 7];
  const momentum = c7 > 0 ? tanh(((c[t] / c7) - 1) / (0.02 * Math.sqrt(7))) : 0;
  const osi = clamp((rsi[t] - 50) / 30, -1, 1);
  let lo = Infinity, hi = -Infinity;
  for (let i = t - 19; i <= t; i++) { if (cnd[i].l < lo) lo = cnd[i].l; if (cnd[i].h > hi) hi = cnd[i].h; }
  const tekanan = hi > lo ? 2 * (c[t] - lo) / (hi - lo) - 1 : 0;
  const meanrev = -tanh((c[t] - e20[t]) / (1.5 * atrA));
  return { struktur, momentum, osi, tekanan, meanrev };
}

function skorDari(f, bobot) {
  return bobot.struktur * f.struktur + bobot.momentum * f.momentum + bobot.osi * f.osi +
    bobot.tekanan * f.tekanan + bobot.meanrev * f.meanrev;
}

// ---------- ujian: tebak arah t+H, nilai dengan kenyataan ----------
function ujian(koinCandles, bobot, ambang, H) {
  let benar = 0, dinilai = 0, naikBenar = 0, naikTotal = 0, turunBenar = 0, turunTotal = 0;
  for (const cnd of koinCandles) {
    if (!cnd || cnd.length < 80) continue;
    const c = cnd.map(k => k.c);
    const pra = {
      e20: emaSeri(c, 20), e50: emaSeri(c, 50),
      rsi: rsiSeri(c, 14), atr: atrSeri(cnd, 14)
    };
    for (let t = 60; t < cnd.length - H; t += 2) {
      const f = faktorPada(cnd, t, pra);
      if (!f) continue;
      const skor = skorDari(f, bobot);
      const arah = skor >= ambang ? 1 : skor <= -ambang ? -1 : 0;
      if (arah === 0) continue;
      const nyata = c[t + H] > c[t] ? 1 : c[t + H] < c[t] ? -1 : 0;
      if (nyata === 0) continue;
      dinilai++;
      if (arah === nyata) benar++;
      if (arah === 1) { naikTotal++; if (nyata === 1) naikBenar++; }
      else { turunTotal++; if (nyata === -1) turunBenar++; }
    }
  }
  return {
    benar, dinilai,
    akurasi: dinilai > 0 ? benar / dinilai : 0,
    naik: naikTotal > 0 ? naikBenar / naikTotal : null,
    turun: turunTotal > 0 ? turunBenar / turunTotal : null
  };
}

// ---------- mutasi (hill-climb) ----------
function mutasi(k) {
  const bobot = {};
  let total = 0;
  for (const [kunci, v] of Object.entries(k.bobot)) {
    const nv = Math.max(0.02, v * (1 + (Math.random() * 2 - 1) * 0.12));
    bobot[kunci] = nv; total += nv;
  }
  for (const kunci of Object.keys(bobot)) bobot[kunci] = bobot[kunci] / total;
  const ambang = clamp(k.ambang * (1 + (Math.random() * 2 - 1) * 0.08), 0.05, 0.5);
  return { bobot, ambang };
}

function acakKromosomLama(k) { return { bobot: { ...k.bobot }, ambang: k.ambang }; }

// ---------- tulis file ----------
function tulisStatistik(s) { writeFileSync(F_STAT, JSON.stringify(s, null, 2) + '\n'); }
function jurnal(obj) {
  try {
    appendFileSync(F_JURNAL, JSON.stringify(obj) + '\n');
    // rapikan: simpan 500 denyut terakhir — repo & halaman tetap ringan selamanya
    const isi = readFileSync(F_JURNAL, 'utf8').split('\n').filter(Boolean);
    if (isi.length > 500) writeFileSync(F_JURNAL, isi.slice(-500).join('\n') + '\n');
  } catch {}
}

// ---------- denyut utama ----------
async function denyut() {
  const krom = JSON.parse(readFileSync(F_KROM, 'utf8'));
  const H = krom.horizonJam || 3;

  // statistik lama (bila ada) untuk melanjutkan umur & riwayat
  const stat = existsSync(F_STAT) ? JSON.parse(readFileSync(F_STAT, 'utf8')) : {
    diperbarui: sekarang(), generasi: krom.generasi || 0,
    akurasiTerakhir: null, akurasiTerbaik: null, denyut: 0, riwayat: []
  };

  // 1. tarik data pasar
  let sumber = null, candles = [];
  const percobaan = [sumberBinance, sumberOkx];
  for (const buat of percobaan) {
    try {
      const s = await buat();
      const hasil = [];
      let gagal = 0;
      for (const simbol of s.koin) {
        try { const c = await s.candle(simbol); if (c && c.length >= 80) hasil.push(c); }
        catch { gagal++; }
        if (hasil.length >= 30) break;
      }
      if (hasil.length >= 10) { sumber = s; candles = hasil; break; }
    } catch {}
  }

  if (!sumber) {
    // jujur: tidur, tidak mengarang apa pun
    stat.denyut = (stat.denyut || 0) + 1;
    stat.diperbarui = sekarang();
    tulisStatistik(stat);
    jurnal({ waktu: sekarang(), peristiwa: 'tidur', alasan: 'semua sumber data pasar tak terjangkau' });
    console.log('tidur: tidak ada data pasar — jurnal dicatat, evolusi tidak dijalankan');
    return;
  }

  // 2. ujian kromosom sekarang
  const induk = acakKromosomLama(krom);
  const hasilInduk = ujian(candles, induk.bobot, induk.ambang, H);
  const MIN_TEBakan = 150;
  let peristiwa = 'denyut';
  let mutasiDicatat = null;

  // 3. evolusi hanya bila ujian cukup tebal (jujur: ujian tipis = tidak belajar)
  if (hasilInduk.dinilai >= MIN_TEBakan) {
    let terbaik = { ...induk, hasil: hasilInduk };
    for (let a = 0; a < 4; a++) {
      const m = mutasi(krom);
      const hm = ujian(candles, m.bobot, m.ambang, H);
      if (hm.dinilai >= MIN_TEBakan && hm.akurasi > terbaik.hasil.akurasi) {
        terbaik = { bobot: m.bobot, ambang: m.ambang, hasil: hm };
      }
    }
    if (terbaik !== induk && terbaik.hasil && terbaik.bobot && terbaik.bobot !== induk.bobot) {
      // anak lebih tajam — adopsi
      krom.bobot = terbaik.bobot;
      krom.ambang = terbaik.ambang;
      krom.generasi = (krom.generasi || 0) + 1;
      writeFileSync(F_KROM, JSON.stringify(krom, null, 2) + '\n');
      peristiwa = 'evolusi';
      mutasiDicatat = { dari: { ...induk.bobot, ambang: induk.ambang }, ke: { ...krom.bobot, ambang: krom.ambang } };
      stat.generasi = krom.generasi;
    }
    stat.akurasiTerakhir = hasilInduk.akurasi;
    if (!stat.akurasiTerbaik || hasilInduk.akurasi > stat.akurasiTerbaik.nilai) {
      stat.akurasiTerbaik = { nilai: hasilInduk.akurasi, waktu: sekarang(), generasi: stat.generasi };
    }
  } else {
    peristiwa = 'ujian-tipis';
  }

  // 4. catat
  stat.denyut = (stat.denyut || 0) + 1;
  stat.diperbarui = sekarang();
  stat.koinDipindai = candles.length;
  stat.titikUjian = hasilInduk.dinilai;
  stat.sumberData = sumber.nama;
  stat.horizonJam = H;
  stat.riwayat = [
    ...(stat.riwayat || []),
    { waktu: sekarang(), generasi: stat.generasi, akurasi: hasilInduk.dinilai > 0 ? hasilInduk.akurasi : null,
      dinilai: hasilInduk.dinilai, sumber: sumber.nama, peristiwa }
  ].slice(-40);
  tulisStatistik(stat);

  jurnal({
    waktu: sekarang(), peristiwa,
    generasi: stat.generasi,
    akurasi: hasilInduk.dinilai > 0 ? +hasilInduk.akurasi.toFixed(4) : null,
    dinilai: hasilInduk.dinilai,
    naik: hasilInduk.naik !== null ? +hasilInduk.naik.toFixed(4) : null,
    turun: hasilInduk.turun !== null ? +hasilInduk.turun.toFixed(4) : null,
    koin: candles.length, sumber: sumber.nama,
    mutasi: mutasiDicatat
  });

  console.log(`${peristiwa} · gen-${stat.generasi} · akurasi ${(hasilInduk.akurasi * 100).toFixed(1)}% ` +
    `(${hasilInduk.benar}/${hasilInduk.dinilai}) · ${candles.length} koin · sumber ${sumber.nama}`);
}

denyut().catch(e => {
  try { jurnal({ waktu: sekarang(), peristiwa: 'cedera', alasan: String(e && e.message || e) }); } catch {}
  console.error('cedera:', e);
  process.exit(0); // jangan buat workflow gagal — jurnal tetap dikomit
});
