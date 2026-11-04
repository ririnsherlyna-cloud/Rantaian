// ============================================================
// GENERATOR PASAR SIMULASI — "pasar tersendiri" untuk ujian buta.
//
// Prinsip anti-hindsight:
//  - Setiap ujian = 168 candle jam. Mesin HANYA menerima candle
//    1..144 (VISIBLE). Vonis diambil dari candle 145..168 (HORIZON 24 jam).
//  - Seluruh lintasan lahir dari seed deterministik -> bisa diaudit,
//    direproduksi, dan tidak mungkin bocor ke masa depan.
//  - 14 arketipe rezim pasar crypto nyata: sebagian mudah dibaca,
//    sebagian jebakan, sebagian sengaja hampir lempar-koin.
// ============================================================

import { makeRng, type Rng } from './rng'

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type ArchId =
  | 'bull-lurus'
  | 'parabolik'
  | 'bull-koreksi'
  | 'distribusi'
  | 'bear-lurus'
  | 'crash-v'
  | 'pendarahan'
  | 'konsolidasi'
  | 'whipsaw'
  | 'squeeze-breakout'
  | 'pump-dump'
  | 'akumulasi'
  | 'shock-berita'
  | 'osilasi'

export interface ArchMeta {
  id: ArchId
  label: string
  family: 'TREN' | 'REZIM-BALIK' | 'PERISTIWA'
  desc: string
  kesulitan: 1 | 2 | 3
}

export const ARCHETYPES: ArchMeta[] = [
  { id: 'bull-lurus', label: 'Bull Lurus', family: 'TREN', desc: 'Tren naik sehat dengan koreksi kecil — rezim paling terbaca.', kesulitan: 1 },
  { id: 'parabolik', label: 'Parabolik Blowoff', family: 'TREN', desc: 'Pump semakin curam lalu jenuh — jebakan klasik di puncak.', kesulitan: 3 },
  { id: 'bull-koreksi', label: 'Bull Berkoreksi', family: 'TREN', desc: 'Naik tapi dipukul balik berkala; uji kesabaran tren.', kesulitan: 2 },
  { id: 'distribusi', label: 'Distribusi Puncak', family: 'REZIM-BALIK', desc: 'Mendatar di puncak sambil diam-diam dilepas — jebakan tenang.', kesulitan: 3 },
  { id: 'bear-lurus', label: 'Bear Lurus', family: 'TREN', desc: 'Turun konsisten dengan relief rally sesekali.', kesulitan: 1 },
  { id: 'crash-v', label: 'Crash lalu V', family: 'PERISTIWA', desc: 'Jatuh keras, kapitulasi, lalu memantul — atau cuma kucing mati.', kesulitan: 2 },
  { id: 'pendarahan', label: 'Pendarahan Perlahan', family: 'TREN', desc: 'Pendarahan sunyi dengan lilin kapitulasi berkala.', kesulitan: 1 },
  { id: 'konsolidasi', label: 'Konsolidasi Sempit', family: 'REZIM-BALIK', desc: 'Range hampir tanpa arah — hampir lempar koin; uji kerendahan hati.', kesulitan: 3 },
  { id: 'whipsaw', label: 'Cambuk Ganda', family: 'REZIM-BALIK', desc: 'Ayunan tajam bolak-balik — pemakan stop-loss dua arah.', kesulitan: 3 },
  { id: 'squeeze-breakout', label: 'Squeeze → Breakout', family: 'REZIM-BALIK', desc: 'Volatilitas mampet lalu meledak satu arah — hadiah bagi pembaca squeeze.', kesulitan: 2 },
  { id: 'pump-dump', label: 'Pump & Dump', family: 'PERISTIWA', desc: 'Naik ±40% lalu dibuang — lilin akhir sering masih terlihat bullish.', kesulitan: 3 },
  { id: 'akumulasi', label: 'Akumulasi → Markup', family: 'REZIM-BALIK', desc: 'Basis datar sunyi lalu markup — pola Wyckoff kanonik.', kesulitan: 2 },
  { id: 'shock-berita', label: 'Guncangan Berita', family: 'PERISTIWA', desc: 'Gap tajam mendadak lalu lanjut atau berbalik — dunia nyata yang kejam.', kesulitan: 3 },
  { id: 'osilasi', label: 'Osilasi Range', family: 'REZIM-BALIK', desc: 'Ayunan periodik teratur — terprediksi bila rezimnya dikenali.', kesulitan: 2 },
]

export const VISIBLE = 144 // jam yang boleh dilihat mesin
export const HORIZON = 24 // jam vonis setelah cutoff
export const TOTAL = VISIBLE + HORIZON // 168
export const SUITE_SIZE = 100
export const SUITE_ID = 'A'

export interface ExamTest {
  id: string
  num: number
  suite: string
  seed: string
  symbol: string
  arch: ArchMeta
  candles: Candle[]
  entry: number
  outcomeRet: number
  mfe: number
  mae: number
  label: 'NAIK' | 'TURUN'
}

const SYMBOLS = [
  'NOVA', 'VOLT', 'ZENQ', 'KRAI', 'MIRA', 'ORBE', 'LUMA', 'HYDR', 'AXON', 'PULS',
  'GEKO', 'TITN', 'NEBL', 'QORV', 'FLUX', 'DUNA', 'KRYPT', 'SYLP', 'VRTX', 'ARQO',
]

type ArchSim = (rng: Rng) => { rets: number[]; vm: number[] }

const zeros = (n: number) => new Array<number>(n).fill(0)
const ones = (n: number) => new Array<number>(n).fill(1)

// ---------- arketipe ----------

const simBullLurus: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  let dipAt = 18 + rng.int(0, 22)
  for (let t = 0; t < TOTAL; t++) {
    let mu = 0.0011
    if (t >= dipAt && t < dipAt + 3) mu = -0.007 - rng.next() * 0.005
    if (t === dipAt + 3) dipAt = t + 24 + rng.int(0, 16)
    rets[t] = mu + 0.011 * rng.normal()
    vm[t] = 1 + Math.min(1.5, Math.abs(rets[t]) / 0.011)
  }
  return { rets, vm }
}

const simParabolik: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const dump = rng.chance(0.78)
  const blowT = 134 + rng.int(0, 8)
  for (let t = 0; t < TOTAL; t++) {
    let mu: number
    let sig: number
    if (t < 90) {
      mu = 0.0005
      sig = 0.013
    } else if (t < blowT) {
      const k = (t - 90) / Math.max(1, blowT - 90)
      mu = 0.0008 + 0.0068 * k * k
      sig = 0.013 + 0.02 * k
    } else if (t < blowT + 2) {
      mu = 0.013
      sig = 0.028
    } else if (dump) {
      if (t < blowT + 7) {
        mu = -0.018
        sig = 0.028
      } else {
        mu = -0.0035
        sig = 0.017
      }
    } else {
      mu = 0.0035
      sig = 0.019
    }
    rets[t] = mu + sig * rng.normal()
    vm[t] = 1 + 2.2 * Math.abs(rets[t]) / 0.015 + (t >= blowT && t < blowT + 7 ? 1.8 : 0)
  }
  return { rets, vm }
}

const simBullKoreksi: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  let pullAt = 20 + rng.int(0, 12)
  for (let t = 0; t < TOTAL; t++) {
    let mu = 0.0012
    if (t >= pullAt && t < pullAt + 3) mu = -0.012 - rng.next() * 0.008
    if (t === pullAt + 3) pullAt = t + 20 + rng.int(0, 12)
    rets[t] = mu + 0.01 * rng.normal()
    vm[t] = 1 + Math.min(1.4, Math.abs(rets[t]) / 0.01)
  }
  return { rets, vm }
}

const simDistribusi: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const bs = 130 + rng.int(0, 26) // breakdown mulai 130..156
  for (let t = 0; t < TOTAL; t++) {
    let mu: number
    let sig: number
    if (t < 100) {
      mu = 0.0013
      sig = 0.011
    } else if (t < bs) {
      mu = 0.0001 - 0.0000032 * (t - 100)
      sig = 0.008
    } else {
      mu = -0.0033
      sig = 0.015
    }
    rets[t] = mu + sig * rng.normal()
    vm[t] = t >= bs ? 1.7 : 1
  }
  return { rets, vm }
}

const simBearLurus: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  let reliefAt = 16 + rng.int(0, 18)
  for (let t = 0; t < TOTAL; t++) {
    let mu = -0.0011
    if (t >= reliefAt && t < reliefAt + 2) mu = 0.01 + rng.next() * 0.006
    if (t === reliefAt + 2) reliefAt = t + 22 + rng.int(0, 14)
    rets[t] = mu + 0.013 * rng.normal()
    vm[t] = 1 + Math.min(1.6, Math.abs(rets[t]) / 0.013)
  }
  return { rets, vm }
}

const simCrashV: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const recover = rng.chance(0.62)
  const capT = 106 + rng.int(0, 14)
  for (let t = 0; t < TOTAL; t++) {
    let mu: number
    let sig: number
    if (t < 95) {
      mu = 0.0006
      sig = 0.01
    } else if (t < capT) {
      mu = -0.0065
      sig = 0.025
    } else if (t < capT + 2) {
      mu = -0.042
      sig = 0.02
    } else if (recover) {
      mu = t < capT + 9 ? 0.0062 : 0.0026
      sig = 0.014
    } else {
      mu = t < capT + 7 ? 0.0026 : -0.0028
      sig = 0.016
    }
    rets[t] = mu + sig * rng.normal()
    vm[t] = t >= capT - 5 && t <= capT + 10 ? 2.3 : 1
  }
  return { rets, vm }
}

const simPendarahan: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  let capAt = 12 + rng.int(0, 12)
  for (let t = 0; t < TOTAL; t++) {
    let mu = -0.0007
    if (t >= capAt && t < capAt + 1) {
      mu = -0.034 - rng.next() * 0.012
      vm[t] = 2.4
    }
    if (t === capAt + 1) capAt = t + 14 + rng.int(0, 10)
    rets[t] = mu + 0.009 * rng.normal()
  }
  return { rets, vm }
}

const simKonsolidasi: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  let logp = 0
  for (let t = 0; t < TOTAL; t++) {
    const r = -0.24 * logp + 0.0047 * rng.normal()
    logp += r
    rets[t] = r
    vm[t] = 0.75
  }
  return { rets, vm }
}

const simWhipsaw: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  let sign = rng.chance(0.5) ? 1 : -1
  let segEnd = 7 + rng.int(0, 7)
  for (let t = 0; t < TOTAL; t++) {
    if (t >= segEnd) {
      sign = -sign
      segEnd = t + 7 + rng.int(0, 7)
    }
    rets[t] = sign * 0.0034 + 0.016 * rng.normal()
    vm[t] = 1.4
  }
  return { rets, vm }
}

const simSqueeze: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const bs = 124 + rng.int(0, 24)
  const d = rng.chance(0.5) ? 1 : -1
  const fail = rng.chance(0.14)
  let logp = 0
  for (let t = 0; t < TOTAL; t++) {
    let r: number
    if (t < bs) {
      const k = t / bs
      const sig = 0.009 - 0.0065 * k
      r = -0.3 * logp * (0.5 + 0.5 * k) + sig * rng.normal()
      vm[t] = 0.7
    } else if (t === bs) {
      r = d * (0.02 + rng.next() * 0.016)
      vm[t] = 3.2
    } else {
      const mu = fail && t > bs + 10 ? -d * 0.0012 : d * 0.0044
      r = mu + 0.0095 * rng.normal()
      vm[t] = 1.5
    }
    logp += r
    rets[t] = r
  }
  return { rets, vm }
}

const simPumpDump: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const ds = 128 + rng.int(0, 24) // dump mulai 128..152
  for (let t = 0; t < TOTAL; t++) {
    let mu: number
    let sig: number
    if (t < 85) {
      mu = 0.0007
      sig = 0.01
    } else if (t < 118) {
      mu = 0.0094
      sig = 0.02
    } else if (t < ds) {
      mu = 0.0014
      sig = 0.027
    } else if (t < ds + 4) {
      mu = -0.021
      sig = 0.024
    } else {
      mu = -0.0038
      sig = 0.017
    }
    rets[t] = mu + sig * rng.normal()
    vm[t] = t >= 85 && t < 128 ? 1.9 : t >= ds ? 2.5 : 1
  }
  return { rets, vm }
}

const simAkumulasi: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const ms = 96 + rng.int(0, 26)
  let logp = 0
  for (let t = 0; t < TOTAL; t++) {
    let r: number
    if (t < ms) {
      const k = t / ms
      r = -0.26 * logp + (0.006 - 0.0032 * k) * rng.normal()
      vm[t] = 0.7
    } else {
      r = 0.0034 + 0.0088 * rng.normal()
      vm[t] = 1.6
    }
    logp += r
    rets[t] = r
  }
  return { rets, vm }
}

const simShock: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const sc = 112 + rng.int(0, 26)
  const d = rng.chance(0.5) ? 1 : -1
  const lanjut = rng.chance(0.62)
  for (let t = 0; t < TOTAL; t++) {
    let mu: number
    let sig: number
    if (t < sc) {
      mu = 0.0002
      sig = 0.008
    } else if (t === sc) {
      mu = d * (0.05 + rng.next() * 0.04)
      sig = 0.006
    } else if (t < sc + 3) {
      mu = d * 0.006
      sig = 0.012
    } else {
      mu = lanjut ? d * 0.0022 : -d * 0.0018
      sig = 0.011
    }
    rets[t] = mu + sig * rng.normal()
    vm[t] = t >= sc && t < sc + 4 ? 3.4 : 1
  }
  return { rets, vm }
}

const simOsilasi: ArchSim = (rng) => {
  const rets = zeros(TOTAL)
  const vm = ones(TOTAL)
  const period = 38 + rng.next() * 26
  const amp = 0.05 + rng.next() * 0.06
  const phase = rng.next() * 2 * Math.PI
  let prevTarget = amp * Math.sin(phase)
  for (let t = 0; t < TOTAL; t++) {
    const target = amp * Math.sin((2 * Math.PI * t) / period + phase)
    const r = target - prevTarget + 0.0026 * rng.normal()
    prevTarget = target
    rets[t] = r
    vm[t] = 0.85 + 0.6 * Math.abs(r) / 0.006
  }
  return { rets, vm }
}

const ARCH_SIM: Record<ArchId, ArchSim> = {
  'bull-lurus': simBullLurus,
  parabolik: simParabolik,
  'bull-koreksi': simBullKoreksi,
  distribusi: simDistribusi,
  'bear-lurus': simBearLurus,
  'crash-v': simCrashV,
  pendarahan: simPendarahan,
  konsolidasi: simKonsolidasi,
  whipsaw: simWhipsaw,
  'squeeze-breakout': simSqueeze,
  'pump-dump': simPumpDump,
  akumulasi: simAkumulasi,
  'shock-berita': simShock,
  osilasi: simOsilasi,
}

// ---------- pembangun candle ----------

function buildCandles(rng: Rng, rets: number[], vm: number[], p0: number): Candle[] {
  const out: Candle[] = []
  let c = p0
  for (let t = 0; t < rets.length; t++) {
    const o = c
    c = o * Math.exp(rets[t])
    const wick = Math.abs(rets[t]) * 0.55 + 0.0035 * (0.4 + vm[t])
    const h = Math.max(o, c) * (1 + Math.abs(rng.normal()) * wick)
    const l = Math.min(o, c) * (1 - Math.abs(rng.normal()) * wick)
    const v = Math.round((0.55 + 0.9 * rng.next()) * vm[t] * (1 + 26 * Math.abs(rets[t])) * 1e6)
    out.push({ t, o, h, l, c, v })
  }
  return out
}

export function generateTest(i: number, suite = SUITE_ID): ExamTest {
  const num = i + 1
  const seed = `MICAPROFITA/UJIAN-SIM/${suite}/${String(num).padStart(3, '0')}`
  const rng = makeRng(seed)
  const arch = ARCHETYPES[i % ARCHETYPES.length]
  const p0 = Math.exp(rng.range(Math.log(0.05), Math.log(300)))
  const { rets, vm } = ARCH_SIM[arch.id](rng)
  const candles = buildCandles(rng, rets, vm, p0)
  const entry = candles[VISIBLE - 1].c
  const end = candles[TOTAL - 1].c
  const outcomeRet = end / entry - 1
  let mfe = 0
  let mae = 0
  for (let t = VISIBLE; t < TOTAL; t++) {
    mfe = Math.max(mfe, candles[t].h / entry - 1)
    mae = Math.min(mae, candles[t].l / entry - 1)
  }
  const sym = SYMBOLS[(i * 7 + 3) % SYMBOLS.length]
  return {
    id: `U-${String(num).padStart(3, '0')}`,
    num,
    suite,
    seed,
    symbol: `${sym}-${num}`,
    arch,
    candles,
    entry,
    outcomeRet,
    mfe,
    mae,
    label: outcomeRet > 0 ? 'NAIK' : 'TURUN',
  }
}

const suiteCache = new Map<string, ExamTest[]>()

export function generateSuite(suite = SUITE_ID): ExamTest[] {
  const hit = suiteCache.get(suite)
  if (hit) return hit
  const tests = Array.from({ length: SUITE_SIZE }, (_, i) => generateTest(i, suite))
  suiteCache.set(suite, tests)
  return tests
}
