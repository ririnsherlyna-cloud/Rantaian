// GET /api/exam/ambisius — UJIAN JUAL-AMBISIUS 50.000 SOAL (DATA RIIL BINANCE)
//
// V301 — permintaan pemilik: "50.000 ujian simulasi dari database sample
// data real, dengan beragam keadaan pasar sideways/bearish/bullish,
// menguji apakah cyborg bisa menentukan rentang jual ambisius yang
// akurat: pasti kena hari itu, tepat di titik longsor, dan saat
// tersentuh harga melonjak turun seketika."
//
// Arsitektur:
//  (1) Kolam data riil: kandang V298-v2 (USDT qv>=3jt) + gerbang V299b
//      lapis 1-2 (getUniverse) + jaring statistik lapis-3 — 1000 bar
//      harian per koin.
//  (2) 50.000 soal terstratifikasi berbibit (mulberry32 seed 50500):
//      SIDE 20.000 · BULL 15.000 · BEAR 15.000, hari-pump ~12%/stratum,
//      10.000 di antaranya VALIDASI DIPEGANG (tak pernah menyetir
//      kalibrasi — vonis anti-overfit).
//  (3) Grading TETAP (hakim tak ikut latihan):
//      SEGI     : high_D>=A & close_D<A & (high_D-close_D)>=0.5 ATR$
//      SEMPURNA : SEGI & tangkap >= 0.5 ekskursi hari itu
//      Gagal    : TAK-KENA | NAIK-LAGI (close_D>A) | LONGSOR-LEMAH
//  (4) Kontestan: V301-F8 (juara kalibrasi) vs proxy rumus lama
//      (k=1.0×ATR ≈ q75-MC) vs DADU — kejujuran V274 dipelihara.
//
//  Kejujuran: hasil di sini adalah ujian ARENA yang menjalankan ulang
//  seluruh mesin di data hidup — angka bisa berbeda tipis dari laporan
//  kalibrasi (kolam bergeser tiap hari) — itu justru bukti hidup.

import { db } from '@/lib/db'
import { getUniverse, isPegStatistik, todayUTC, type Candle } from '@/lib/cyborg/market'
import { ambisiusPctDariFitur } from '@/lib/cyborg/ambisius'
import { mulberry32 } from '@/lib/cyborg/warisan'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SEED = 50500
const QUOTA: Record<string, number> = { SIDE: 20_000, BULL: 15_000, BEAR: 15_000 }
const PUMP_TH = 5.0
const CRASH_TH = -5.0
const JUMLAH_KOIN = 95
const MIN_BAR = 60

const KANDANG_PEGGED = new Set([
  'USDCUSDT', 'FDUSDUSDT', 'TUSDUSDT', 'USDPUSDT', 'DAIUSDT', 'BUSDUSDT',
  'USDSUSDT', 'USDEUSDT', 'USD1USDT', 'USDGUSDT', 'PYUSDUSDT', 'XUSDUSDT',
  'USRUSDT', 'USTCUSDT', 'SUSDEUSDT', 'SUSDUSDT', 'FRAXUSDT', 'USDDUSDT',
  'EURUSDT', 'AEURUSDT', 'EURIUSDT', 'GBPUSDT', 'AUDUSDT', 'PAXGUSDT',
  'XAUTUSDT', 'USDTUSDT',
])
const AKHIRAN_PEGGED = ['USD', 'USDC', 'USDP', 'USDS', 'USDG', 'USDE', 'USD1', 'USDD', 'PYUSD',
  'FDUSD', 'TUSD', 'XUSD', 'SUSD', 'FRAX', 'DAI', 'UST', 'USTC', 'EUR', 'EURI', 'AEUR', 'GBP',
  'AUD', 'PAXG', 'XAUT']

// ---------- klines 1000 bar (host publik, rotasi sederhana) ----------
const HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision', 'https://api1.binance.com']

async function ambilK1000(sym: string): Promise<Candle[] | null> {
  for (let coba = 0; coba < 3; coba++) {
    const host = HOSTS[(coba + sym.length) % HOSTS.length]
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 12_000)
      const res = await fetch(`${host}/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=1d&limit=1000`,
        { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(t)
      if (!res.ok) throw new Error(`http ${res.status}`)
      const raw = (await res.json()) as unknown[][]
      return raw.map((k) => ({
        openTime: k[0] as number,
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
        quoteVolume: parseFloat(k[7] as string),
      }))
    } catch {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  return null
}

async function ambilMeta(kunci: string): Promise<{ day: string; data: unknown } | null> {
  const row = await db.meta.findUnique({ where: { key: kunci } })
  if (!row) return null
  try { return JSON.parse(row.value) as { day: string; data: unknown } } catch { return null }
}

// ---------- fitur & soal (identik kalibrasi Python) ----------
interface Soal {
  atrp14: number; mom7: number; mom30: number; chg24: number; posisi: number
  gap8: number; gap30: number; vs: number; up14: number; sig: number; atr14: number
  p: number
  o: number; h: number; l: number; c: number
  pump: boolean; crash: boolean; rezim: 'SIDE' | 'BULL' | 'BEAR'
  sym: string; hari: number
}

function fiturDariKoin(sym: string, k: Candle[]): Soal[] {
  const out: Soal[] = []
  const n = k.length
  if (n < 31) return out
  const c = k.map((x) => x.close)
  const h = k.map((x) => x.high)
  const l = k.map((x) => x.low)
  const qv = k.map((x) => (Number.isFinite(x.quoteVolume) && x.quoteVolume > 0 ? x.quoteVolume : x.volume))
  const pc = (i: number) => (i <= 0 ? c[0] : c[i - 1])
  const tr: number[] = []
  for (let i = 0; i < n; i++) {
    tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - pc(i)), Math.abs(l[i] - pc(i))))
  }
  for (let t = 30; t < n; t++) {
    const p = c[t - 1]
    if (!Number.isFinite(p) || p <= 0) continue
    let trSum = 0
    for (let i = t - 14; i < t; i++) trSum += tr[i]
    const atr14 = trSum / 14
    const atrp14 = (atr14 / p) * 100
    if (!(atrp14 >= 0.05 && atrp14 <= 40)) continue
    const mom7 = (c[t - 1] / c[t - 8] - 1) * 100
    const mom30 = (c[t - 1] / c[t - 30] - 1) * 100
    const chg24 = (c[t - 1] / c[t - 2] - 1) * 100
    let sw8 = -Infinity, sw30 = -Infinity, lo30 = Infinity
    for (let i = t - 30; i < t; i++) {
      if (h[i] > sw30) sw30 = h[i]
      if (l[i] < lo30) lo30 = l[i]
    }
    for (let i = t - 8; i < t; i++) if (h[i] > sw8) sw8 = h[i]
    const rng30 = sw30 - lo30
    const posisi = rng30 > 0 ? (p - lo30) / rng30 : 0.5
    const gap8 = (sw8 / p - 1) * 100
    const gap30 = (sw30 / p - 1) * 100
    let vs3 = 0, vs30 = 0
    for (let i = t - 3; i < t; i++) vs3 += qv[i]
    for (let i = t - 30; i < t; i++) vs30 += qv[i]
    const vs = vs3 / 3 / Math.max(vs30 / 30, 1e-9)
    let naik = 0
    for (let i = t - 14; i < t; i++) if (c[i] > pc(i)) naik++
    const up14 = naik / 14
    const rets: number[] = []
    for (let i = t - 15; i <= t - 3; i++) rets.push(Math.log(c[i + 1] / c[i]))
    const mR = rets.reduce((a, x) => a + x, 0) / rets.length
    const sig = Math.sqrt(rets.reduce((a, x) => a + (x - mR) ** 2, 0) / rets.length) * 100
    const pump = (h[t] / p - 1) * 100 >= PUMP_TH
    const crash = (l[t] / p - 1) * 100 <= CRASH_TH
    const rezim: 'SIDE' | 'BULL' | 'BEAR' = mom30 >= 8 ? 'BULL' : mom30 <= -8 ? 'BEAR' : 'SIDE'
    out.push({ atrp14, mom7, mom30, chg24, posisi, gap8, gap30, vs, up14, sig, atr14,
      p, o: k[t].open, h: k[t].high, l: k[t].low, c: k[t].close, pump, crash, rezim, sym, hari: k[t].openTime })
  }
  return out
}

// ---------- sampling berbibit (mirror kalibrasi) ----------
function sampel(soal: Soal[]): { train: number[]; val: number[] } {
  const rnd = mulberry32(SEED)
  const train: number[] = []
  const val: number[] = []
  for (const [rezim, quota] of Object.entries(QUOTA)) {
    const ids: number[] = []
    for (let i = 0; i < soal.length; i++) if (soal[i].rezim === rezim) ids.push(i)
    // Fisher-Yates berbibit
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp
    }
    const pm = ids.filter((i) => soal[i].pump)
    const npm = ids.filter((i) => !soal[i].pump)
    const tPm = Math.min(Math.round(quota * 0.12), pm.length)
    const tNpm = Math.min(quota - tPm, npm.length)
    const ambil = [...pm.slice(0, tPm), ...npm.slice(0, tNpm)]
    if (ambil.length < quota) {
      const diambil = new Set(ambil)
      for (const i of ids) { if (ambil.length >= quota) break; if (!diambil.has(i)) ambil.push(i) }
    }
    const nVal = Math.round(quota * 0.2)
    train.push(...ambil.slice(0, quota - nVal))
    val.push(...ambil.slice(quota - nVal, quota))
  }
  return { train, val }
}

// ---------- grading tetap ----------
interface Vonis { n: number; segi: number; sempurna: number; kena: number; takKena: number; naikLagi: number; lemah: number; aRata: number }

function grade(soal: Soal[], idx: number[], apct: (s: Soal) => number): Vonis {
  let segi = 0, semp = 0, kena = 0, naik = 0, lemah = 0, sumA = 0
  const n = idx.length
  for (const i of idx) {
    const s = soal[i]
    const a = Math.max(apct(s), 0.02)
    const A = s.p * (1 + a / 100)
    sumA += a
    const tersentuh = s.h >= A
    if (tersentuh) {
      kena++
      const jatuh = s.h - s.c
      const lansor = s.c < A && jatuh >= 0.5 * s.atr14
      const tangkap = A - s.p >= 0.5 * (s.h - s.p)
      if (lansor) {
        segi++
        if (tangkap) semp++
      } else if (s.c > A) naik++
      else lemah++
    }
  }
  const pct = (v: number) => +((v / n) * 100).toFixed(2)
  return { n, segi: pct(segi), sempurna: pct(semp), kena: pct(kena), takKena: pct(n - kena), naikLagi: pct(naik), lemah: pct(lemah), aRata: +(sumA / n).toFixed(2) }
}

function vektorX(s: Soal): number[] {
  return [1, s.atrp14, s.mom7, s.mom30, s.chg24, s.posisi, s.gap8, s.gap30, s.vs, s.up14, s.sig,
    s.chg24 * s.up14, s.posisi * s.gap8, Math.log1p(Math.max(s.vs, 0))]
}

export async function GET() {
  const t0 = Date.now()
  const hari = todayUTC()

  // fast path: hasil hari ini sudah tersegel
  const tersimpan = await ambilMeta('ujianAmbisius50k')
  if (tersimpan && tersimpan.day === hari) {
    return Response.json(tersimpan.data as Record<string, unknown>)
  }

  // (1) kolam: kandang V298-v2 + gerbang V299b lapis 1-2, lalu lapis-3
  const uni = await getUniverse()
  const kandidat = uni
    .filter((u) => !KANDANG_PEGGED.has(u.symbol))
    .filter((u) => !AKHIRAN_PEGGED.some((sfx) => u.base.endsWith(sfx)))
    .slice(0, JUMLAH_KOIN + 10)

  const pool: { sym: string; k: Candle[] }[] = []
  const gagal: string[] = []
  const CONC = 6
  for (let i = 0; i < kandidat.length && pool.length < JUMLAH_KOIN; i += CONC) {
    const batch = kandidat.slice(i, i + CONC)
    const hasil = await Promise.allSettled(batch.map((u) => ambilK1000(u.symbol)))
    batch.forEach((u, j) => {
      if (hasil[j].status !== 'fulfilled') { gagal.push(u.symbol); return }
      const k = (hasil[j] as PromiseFulfilledResult<Candle[] | null>).value
      if (!k || k.length < MIN_BAR) { gagal.push(u.symbol); return }
      // V299b lapis-3: jaring statistik (hitung dari data riil sendiri)
      const terakhir = k[k.length - 1]
      let trSum = 0
      for (let i2 = Math.max(1, k.length - 15); i2 < k.length; i2++) {
        trSum += Math.max(k[i2].high - k[i2].low, Math.abs(k[i2].high - k[i2 - 1].close), Math.abs(k[i2].low - k[i2 - 1].close))
      }
      const atrp = (trSum / 14) / terakhir.close * 100
      const mom7 = (terakhir.close / k[k.length - 8].close - 1) * 100
      if (isPegStatistik(terakhir.close, atrp, mom7)) { gagal.push(u.symbol + '(jaring)'); return }
      pool.push({ sym: u.symbol, k })
    })
  }

  // (2) bangun semua soal mentah
  const soal: Soal[] = []
  for (const { sym, k } of pool) soal.push(...fiturDariKoin(sym, k))

  // (3) sampling 50.000 berbibit
  const { train, val } = sampel(soal)
  const penuh = [...train, ...val]

  // (4) kontestan
  const lama = grade(soal, penuh, (s) => 1.0 * s.atrp14)
  const lamaVal = grade(soal, val, (s) => 1.0 * s.atrp14)
  const rnd = mulberry32(SEED + 1)
  const dadu = grade(soal, penuh, () => 0.3 + rnd() * 2.7)
  const v301 = grade(soal, penuh, (s) => ambisiusPctDariFitur(vektorX(s), s.atrp14, 'BUY'))
  const v301Val = grade(soal, val, (s) => ambisiusPctDariFitur(vektorX(s), s.atrp14, 'BUY'))

  // (5) bedah V301 & lama per rezim/hari
  const bedah = (apct: (s: Soal) => number) => {
    const out: Record<string, Vonis> = {}
    for (const r of ['SIDE', 'BULL', 'BEAR']) {
      const idx = penuh.filter((i) => soal[i].rezim === r)
      out[`rezim_${r}`] = grade(soal, idx, apct)
    }
    out.hariPump = grade(soal, penuh.filter((i) => soal[i].pump), apct)
    out.hariBiasa = grade(soal, penuh.filter((i) => !soal[i].pump), apct)
    out.hariCrash = grade(soal, penuh.filter((i) => soal[i].crash), apct)
    return out
  }

  // (6) kurva k-kena (peta tangga dari data hidup)
  const kurvaK = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1.0, 1.5].map((k) => {
    const g = grade(soal, penuh, (s) => k * s.atrp14)
    return { k, kena: g.kena, segi: g.segi, sempurna: g.sempurna }
  })

  const hasil = {
    meta: {
      versi: 'V301-AMBISIUS-UJIAN-ARENA', seed: SEED, at: new Date().toISOString(),
      koin: pool.length, soalMentah: soal.length, soal: penuh.length,
      train: train.length, val: val.length,
      durasiDetik: +((Date.now() - t0) / 1000).toFixed(1),
      gagal: gagal.slice(0, 12),
    },
    ringkas: {
      v301: { penuh: v301, validasi: v301Val },
      lama: { penuh: lama, validasi: lamaVal },
      dadu: { penuh: dadu },
    },
    bedahV301: bedah((s) => ambisiusPctDariFitur(vektorX(s), s.atrp14, 'BUY')),
    bedahLama: bedah((s) => 1.0 * s.atrp14),
    kurvaK,
    kejujuran:
      'Tidak ada janji "pasti kena". SEGI = kena hari itu lalu longsor menyusul; ' +
      'SEMPURNA = SEGI + menangkap >= separuh ekskursi hari itu. Angka adalah ' +
      'statistik populasi 50.000 soal riil; hari pump tetap medan terberat ' +
      '(level pra-pemasangan kerap kelewatan) — di situ guard kejut-pump yang menjaga. ' +
      'Ujian ini dijalankan ulang tiap hari pada kolam data hidup — angka bergeser ' +
      'tipis antar hari, itu tanda mesin menghitung, bukan menghafal.',
  }

  await db.meta.upsert({
    where: { key: 'ujianAmbisius50k' },
    update: { value: JSON.stringify({ day: hari, data: hasil }) },
    create: { key: 'ujianAmbisius50k', value: JSON.stringify({ day: hari, data: hasil }) },
  })

  return Response.json(hasil)
}
