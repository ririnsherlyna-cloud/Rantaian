#!/usr/bin/env node
// ============================================================
// LAB UJI "POWER MAX AMBISIUS" (PMA) — bebas kebocoran
// ------------------------------------------------------------
// Pelajaran pemilik (MAGMA +23% → +70%, AXIS +400%): "ujung
// ambisius" sering TERJANGKAU — data yang kurang digali. PMA =
// level di ATAS ambisius, tapi WAJIB TERUJI dulu (mandat: harus
// benar-benar yakin teruji & punya potensi pasti).
//
// Metode: replay hari-per-hari (entry = open hari D), semua level
// dihitung HANYA dari candle tertutup sebelum entry (bebas
// kebocoran), lalu dinilai medan 72 jam ke depan:
//   target → ambisius → PMA, barier STOP dulu (konservatif).
// Gerbang pompa (kapan PMA boleh tayang) dipilih dari data,
// bukan rasa: dilaporkan P(PMA tersentuh | ambisius tersentuh)
// per gerbang kandidat, global vs bersyarat.
// 0 dependensi, data publik, fee 0.2% pulang-pergi.
// ============================================================
import { writeFileSync } from 'node:fs'

const FEE = 0.002
const HARI = 100          // panjang sejarah per koin (hari)
const HORIZON = 72        // penilaian medan 72 jam (3 hari)
const MIN_CANDLE = 60

// ---- mesin identik penjaga (dipotret, bukan diubah) ----
const WARISAN = { MC_LINTASAN: 2000, MC_LANGKAH: 24, LAMBDA_EWMA: 0.94 }

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}
function garch11(closes) {
  const r = []
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]))
  const n = r.length
  if (n < 60) throw new Error('lilin kurang')
  const var0 = r.reduce((a, x) => a + x * x, 0) / n
  let terbaik = null
  for (const al of [0.02, 0.05, 0.08, 0.12, 0.16, 0.2]) {
    for (const be of [0.7, 0.8, 0.88, 0.93, 0.97]) {
      if (al + be >= 0.999) continue
      const om = var0 * (1 - al - be)
      let ll = 0, h = var0
      for (const x of r) { ll += -Math.log(h) - (x * x) / h; h = om + al * x * x + be * h }
      if (!terbaik || ll > terbaik.ll) terbaik = { ll, al, be, om }
    }
  }
  const { al, be, om } = terbaik
  let h = var0
  for (const x of r.slice(-60)) h = om + al * x * x + be * h
  let jumlahH = 0, hk = h
  for (let k = 0; k < WARISAN.MC_LANGKAH; k++) { jumlahH += hk; hk = om + (al + be) * hk }
  return { sigma1j: Math.sqrt(h), sigma24jPct: Math.sqrt(jumlahH) * 100 }
}
function monteCarlo24j(candles, seed) {
  const closes = candles.map((x) => x.c)
  const n = closes.length
  let varEw = closes.slice(1).reduce((a, x, i) => a + Math.log(x / closes[i]) ** 2, 0) / (n - 1)
  const res = []
  for (let i = 1; i < n; i++) {
    const rr = Math.log(closes[i] / closes[i - 1])
    varEw = WARISAN.LAMBDA_EWMA * varEw + (1 - WARISAN.LAMBDA_EWMA) * rr * rr
    res.push(rr / Math.max(Math.sqrt(varEw), 1e-9))
  }
  const g = garch11(closes)
  const rnd = mulberry32(seed)
  const maksNaik = []
  for (let L = 0; L < WARISAN.MC_LINTASAN; L++) {
    let lp = 0, up = 0
    for (let t = 0; t < WARISAN.MC_LANGKAH; t++) {
      lp += res[(rnd() * res.length) | 0] * g.sigma1j
      if (lp > up) up = lp
    }
    maksNaik.push(up)
  }
  maksNaik.sort((a, b) => a - b)
  const ku = (q) => maksNaik[Math.min(maksNaik.length - 1, Math.floor(q * maksNaik.length))]
  return {
    q75: ku(0.75), q90: ku(0.9),
    pLevel: (fraksi) => maksNaik.filter((x) => x >= Math.log(1 + fraksi)).length / maksNaik.length,
  }
}

// ---- pengambil data publik (3 host, pola penjaga) ----
const tunda = (ms) => new Promise((r) => setTimeout(r, ms))
async function ambilBinance(s) {
  const out = []
  for (let i = 0; i < 3; i++) {
    const end = Date.now() - i * 3600_000_000 // mundur 1000 jam per halaman
    const u = `https://data-api.binance.vision/api/v3/klines?symbol=${s}USDT&interval=1h&limit=1000&endTime=${end}`
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) })
    const d = await r.json()
    if (!Array.isArray(d)) break
    out.unshift(...d.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], qv: +k[7] })))
    await tunda(150)
  }
  return out
}
async function ambilBybit(s) {
  const out = []
  let end = Date.now()
  for (let i = 0; i < 4; i++) {
    const u = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${s}USDT&interval=60&limit=1000&end=${end}`
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) })
    const d = await r.json()
    const ls = d?.result?.list || []
    if (!ls.length) break
    const page = ls.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], qv: +k[6] }))
    out.unshift(...page)
    end = page[0].t - 1
    if (page.length < 1000) break
    await tunda(150)
  }
  return out
}
async function ambilOkxSwap(s) {
  const out = []
  let after = ''
  for (let i = 0; i < 4; i++) {
    const u = `https://www.okx.com/api/v5/market/candles?instId=${s}-USDT-SWAP&bar=1H&limit=300${after ? `&after=${after}` : ''}`
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) })
    const d = await r.json()
    const ls = d?.data || []
    if (!ls.length) break
    const page = ls.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], qv: +k[7] }))
    out.unshift(...page)
    after = page[0].t
    await tunda(150)
  }
  return out
}

const UNIVERSE = [
  ['BTC', 'binance'], ['ETH', 'binance'], ['SOL', 'binance'], ['BNB', 'binance'], ['XRP', 'binance'],
  ['DOGE', 'binance'], ['ADA', 'binance'], ['AVAX', 'binance'], ['LINK', 'binance'], ['TRX', 'binance'],
  ['SUI', 'binance'], ['PEPE', 'binance'], ['WIF', 'binance'], ['FET', 'binance'], ['INJ', 'binance'],
  ['APT', 'binance'], ['ARB', 'binance'], ['OP', 'binance'], ['NEAR', 'binance'], ['SEI', 'binance'],
  ['TON', 'binance'], ['HBAR', 'binance'], ['ONE', 'binance'], ['SYN', 'binance'],
  ['MAGMA', 'bybit'], ['AXIS', 'okx'],
]

// ---- fitur & level pada MOMEN KUNCI (hanya candle tertutup) ----
function fitur(c, idxEntry) {
  const w = c.slice(0, idxEntry)             // window kunci: candle tertutup
  if (w.length < MIN_CANDLE) return null
  const closes = w.map((x) => x.c)
  const la = closes.length - 1
  const entry = closes[la]
  const d24 = w.slice(-24)
  const hi24 = Math.max(...d24.map((x) => x.h)), lo24 = Math.min(...d24.map((x) => x.l))
  const posisi = hi24 > lo24 ? (entry - lo24) / (hi24 - lo24) : 0.5
  let atr = 0
  for (let i = w.length - 14; i < w.length; i++) {
    const tr = Math.max(w[i].h - w[i].l, Math.abs(w[i].h - closes[i - 1]), Math.abs(w[i].l - closes[i - 1]))
    atr += tr
  }
  atr /= 14
  const atrPct = atr / entry * 100
  const ubah24 = entry / closes[la - 24] - 1
  const naik6 = entry / closes[la - 6] - 1
  const vol6 = w.slice(-6).reduce((a, x) => a + x.v, 0)
  const vol48 = w.slice(-54, -6).reduce((a, x) => a + x.v, 0) / 48
  const volSpike = vol48 > 0 ? vol6 / (vol48 * 6) : 1
  const swing7h = w.length >= 168 ? Math.max(...w.slice(-168).map((x) => x.h)) : hi24
  return { entry, hi24, lo24, posisi, atrPct, ubah24, naik6, volSpike, swing7h }
}

function susunLevel(f, mc, seed) {
  const batas = f.entry * 1.12
  void seed
  const tengah = f.lo24 + (f.hi24 - f.lo24) * 0.5
  const kandidat = [tengah, f.hi24, Math.min(f.swing7h, batas)]
    .filter((x) => x > f.entry * 1.004).sort((a, b) => a - b)
  const target = kandidat.find((x) => x / f.entry - 1 - FEE >= 0.01) ?? null
  const ambisius = Math.min(f.swing7h, batas) > f.entry * 1.02 ? Math.min(f.swing7h, batas) : null
  const pmaStruktur = f.swing7h > f.entry * 1.12 ? f.swing7h : null
  const pmaMc = f.entry * (1 + mc.q90)
  const pmaGabung = Math.max(pmaStruktur ?? 0, pmaMc) > Math.max(ambisius ?? 0, f.entry * 1.12)
    ? Math.max(pmaStruktur ?? 0, pmaMc) : null
  return {
    entry: f.entry, target, ambisius,
    pmaStruktur, pmaMc, pmaGabung,
    pmaMcFraksi: mc.q90, pmaGabungFraksi: pmaGabung ? pmaGabung / f.entry - 1 : null,
    stop: Math.min(f.entry * (1 - 1.8 * f.atrPct / 100), f.lo24 - 0.25 * f.atrPct / 100 * f.entry),
  }
}

// ---- penilaian medan: barier pertama (konservatif: STOP menang bila satu candle menyentuh dua) ----
function nilaiMedan(c, idxEntry, lv) {
  const depan = c.slice(idxEntry, idxEntry + HORIZON)
  if (!depan.length) return null
  const sentuh = (lvl) => {
    for (const b of depan) {
      if (b.l <= lv.stop) return { kena: false, barier: 'STOP' }
      if (b.h >= lvl.level) return { kena: true, barier: 'LEVEL' }
    }
    return { kena: false, barier: 'WAKTU' }
  }
  const mfe = (Math.max(...depan.map((x) => x.h)) / lv.entry - 1)
  const mae = (Math.min(...depan.map((x) => x.l)) / lv.entry - 1)
  return {
    targetKena: lv.target ? sentuh({ level: lv.target, stop: lv.stop }).kena : null,
    ambisiusKena: lv.ambisius ? sentuh({ level: lv.ambisius, stop: lv.stop }).kena : null,
    pmaKena: lv.pmaGabung ? sentuh({ level: lv.pmaGabung, stop: lv.stop }).kena : null,
    mfe, mae,
  }
}

// ---- gerbang pompa kandidat (dievaluasi dari fitur saat kunci) ----
const GERBANG = {
  'G1 ubah24>=8%': (f) => f.ubah24 >= 0.08,
  'G2 ubah24>=12%': (f) => f.ubah24 >= 0.12,
  'G3 naik6>=5% & vol>=1.8x': (f) => f.naik6 >= 0.05 && f.volSpike >= 1.8,
  'G4 ubah24>=8% & vol>=1.5x': (f) => f.ubah24 >= 0.08 && f.volSpike >= 1.5,
  'G5 posisi>=60% & ubah24>=10%': (f) => f.posisi >= 0.6 && f.ubah24 >= 0.1,
  'G6 ubah24>=15%': (f) => f.ubah24 >= 0.15,
}

// ================= JALANKAN =================
const kasus = []
for (const [sym, host] of UNIVERSE) {
  let c = []
  try {
    c = host === 'binance' ? await ambilBinance(sym) : host === 'bybit' ? await ambilBybit(sym) : await ambilOkxSwap(sym)
  } catch (e) { console.log(`[${sym}] gagal ambil: ${String(e).slice(0, 60)}`); continue }
  c.sort((a, b) => a.t - b.t)
  // normalkan ke batas hari UTC
  const hari = new Map()
  for (const x of c) { const k = new Date(x.t).toISOString().slice(0, 10); if (!hari.has(k)) hari.set(k, []); hari.get(k).push(x) }
  const daftarHari = [...hari.keys()].sort()
  if (daftarHari.length < 4) { console.log(`[${sym}] data terlalu pendek (${c.length} candle)`); continue }
  for (let d = 2; d < daftarHari.length - 1; d++) {
    const idxEntry = c.findIndex((x) => x.t >= Date.parse(daftarHari[d] + 'T00:00:00Z'))
    if (idxEntry < MIN_CANDLE + 2) continue
    const f = fitur(c, idxEntry)
    if (!f) continue
    let mc
    try { mc = monteCarlo24j(c.slice(0, idxEntry), fnv1a(`PMA|${sym}|${daftarHari[d]}`)) } catch { continue }
    const lv = susunLevel(f, mc)
    const sisa = c.length - idxEntry
    if (sisa < 24) continue   // jendela maju terlalu pendek — jangan dinilai setengah hati
    const penilaian = nilaiMedan(c, idxEntry, lv)
    if (!penilaian) continue
    kasus.push({ sym, hari: daftarHari[d], host, f, lv, ...penilaian })
  }
  console.log(`[${sym}] ${c.length} candle · ${kasus.length} kasus kumulatif`)
}
console.log(`\nTOTAL KASUS: ${kasus.length}`)

// ---- agregasi ----
const pct = (x) => (x * 100).toFixed(1) + '%'
function rekap(sub, label) {
  const n = sub.length
  if (!n) return console.log(`${label}: 0 kasus`)
  const tKena = sub.filter((k) => k.targetKena)
  const aKena = tKena.filter((k) => k.ambisiusKena)
  const pmaDariAmbisius = aKena.filter((k) => k.pmaKena)
  const ekor40 = aKena.filter((k) => k.mfe >= 0.4)
  const ekor70 = aKena.filter((k) => k.mfe >= 0.7)
  const hilang10 = aKena.filter((k) => k.mfe >= (k.lv.ambisius / k.lv.entry - 1) + 0.1)
  const hilang30 = aKena.filter((k) => k.mfe >= (k.lv.ambisius / k.lv.entry - 1) + 0.3)
  console.log(`${label}
  n=${n} · target kena ${tKena.length} (${pct(tKena.length / n)})
  ambisius kena setelah target: ${aKena.length} (${aKena.length ? pct(aKena.length / tKena.length) : '—'} dari target)
  PMA kena setelah ambisius:    ${pmaDariAmbisius.length} (${aKena.length ? pct(pmaDariAmbisius.length / aKena.length) : '—'} dari ambisius)
  ekor ≥+40% dari ambisius:     ${ekor40.length} (${aKena.length ? pct(ekor40.length / aKena.length) : '—'})
  ekor ≥+70% dari ambisius:     ${ekor70.length} (${aKena.length ? pct(ekor70.length / aKena.length) : '—'})
  rugi-lanjutan ≥+10% lewat ambisius: ${hilang10.length} (${aKena.length ? pct(hilang10.length / aKena.length) : '—'})
  rugi-lanjutan ≥+30% lewat ambisius: ${hilang30.length} (${aKena.length ? pct(hilang30.length / aKena.length) : '—'})
  median PMA fraksi: ${aKena.length && pmaDariAmbisius.length ? pct(pmaDariAmbisius.reduce((a, k) => a + k.lv.pmaGabungFraksi, 0) / pmaDariAmbisius.length) : '—'}`)
}
rekap(kasus, '\n== GLOBAL (semua hari-koin) ==')
for (const [g, tes] of Object.entries(GERBANG)) {
  rekap(kasus.filter((k) => tes(k.f)), `== GERBANG ${g} ==`)
}

// ---- kasus MAGMA & AXIS spesifik ----
for (const sym of ['MAGMA', 'AXIS']) {
  const sub = kasus.filter((k) => k.sym === sym)
  console.log(`\n== ${sym} (${sub.length} hari) ==`)
  for (const k of sub) {
    const f = k.f, lv = k.lv
    console.log(`${k.hari} entry=${f.entry.toPrecision(6)} ubah24=${pct(f.ubah24)} vol=${f.volSpike.toFixed(1)}x pos=${pct(f.posisi)} | target=${lv.target ? lv.target.toPrecision(6) : '—'} ambisius=${lv.ambisius ? lv.ambisius.toPrecision(6) : '—'} PMA=${lv.pmaGabung ? lv.pmaGabung.toPrecision(6) + ` (+${pct(lv.pmaGabungFraksi)})` : '—'} | targetKena=${k.targetKena} ambisiusKena=${k.ambisiusKena} pmaKena=${k.pmaKena} MFE72=${pct(k.mfe)}`)
  }
}

writeFileSync('/home/z/my-project/scripts/ujian-pma/hasil_lab.json',
  JSON.stringify({ dihasilkan: new Date().toISOString(), HORIZON, n: kasus.length,
    kasus: kasus.map((k) => ({ sym: k.sym, hari: k.hari, host: k.host, entry: k.f.entry, ubah24: +k.f.ubah24.toFixed(4), naik6: +k.f.naik6.toFixed(4), volSpike: +k.f.volSpike.toFixed(2), posisi: +k.f.posisi.toFixed(3), atrPct: +k.f.atrPct.toFixed(2), target: k.lv.target, ambisius: k.lv.ambisius, pma: k.lv.pmaGabung, pmaFraksi: k.lv.pmaGabungFraksi, pmaMcFraksi: k.lv.pmaMcFraksi, targetKena: k.targetKena, ambisiusKena: k.ambisiusKena, pmaKena: k.pmaKena, mfe: +k.mfe.toFixed(4), mae: +k.mae.toFixed(4) })) }, null, 1))
console.log('\nhasil_lab.json tersimpan')
