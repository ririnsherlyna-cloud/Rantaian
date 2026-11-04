// ============================================================
// PERAKIT SUITE UJIAN PUMP & DUMP — 100 skenario (14 arketipe).
// Setiap ujian di-forge dengan pencobaan berbibit (maks 14)
// sampai gerbang profit DARI DATA terpenuhi:
//  - DUMP (truth turun): gerak >= 2.8% DAN MFE >= 3.2%
//  - PUMP (truth naik) : gerak >= 3.0% DAN MFE >= 3.4%
//  - PEMBUNUH          : + MFE arah bait <= 1.1% (target disiplin
//    otak 1.6%+ MUSTAHIL tersentuh oleh bait — pembaca naif
//    dijamin rugi setelah fee).
// Truth SELALU dari data. Bait = kebalikan truth.
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, PD_TOTAL, PD_VISIBLE, PD_SIZE, PD_ARCHES,
  PD_MIN_DUMP_MOVE, PD_MIN_DUMP_MFE, PD_MIN_PUMP_MOVE, PD_MIN_PUMP_MFE, PD_MAX_BAIT_MFE,
  PD_DIFF_CYCLE, PD_DIFF_CFG, rescalePeakTo,
  type PdArchMeta, type PdDiff, type PdExam, type PdRng, type PdDiffCfg, type PdLevels,
} from './pumpdump-forge'
import {
  genPdClimaxBlowoff, genPdExhaustVertical, genPdAbsorbTop, genPdDivergenceHh,
  genPdWickReject, genPdLhDistribution, genPdBreakSupport, genPdCascadeContinue,
  genPdDeadcatBounce, genPdPumpFlushTop,
} from './pumpdump-gens'
import {
  genPdBreakoutMarkup, genPdRetestContinue, genPdFlickReclaim, genPdSecondWave,
} from './pumpdump-gens'

type PdGen = (pen: Pen, r: PdRng, u: number, cfg: PdDiffCfg, lv: PdLevels) => void

interface ArchDef { id: string; gen: PdGen; truth: 'NAIK' | 'TURUN' }

export const PD_DEFS: ArchDef[] = [
  // dump-side
  { id: 'pd-climax-blowoff', gen: genPdClimaxBlowoff, truth: 'TURUN' },
  { id: 'pd-exhaust-vertical', gen: genPdExhaustVertical, truth: 'TURUN' },
  { id: 'pd-absorb-top', gen: genPdAbsorbTop, truth: 'TURUN' },
  { id: 'pd-divergence-hh', gen: genPdDivergenceHh, truth: 'TURUN' },
  { id: 'pd-wick-reject', gen: genPdWickReject, truth: 'TURUN' },
  { id: 'pd-lh-distribution', gen: genPdLhDistribution, truth: 'TURUN' },
  { id: 'pd-break-support', gen: genPdBreakSupport, truth: 'TURUN' },
  { id: 'pd-cascade-continue', gen: genPdCascadeContinue, truth: 'TURUN' },
  { id: 'pd-deadcat-bounce', gen: genPdDeadcatBounce, truth: 'TURUN' },
  { id: 'pd-pump-flush-top', gen: genPdPumpFlushTop, truth: 'TURUN' },
  // pump-side guard
  { id: 'pd-breakout-markup', gen: genPdBreakoutMarkup, truth: 'NAIK' },
  { id: 'pd-retest-continue', gen: genPdRetestContinue, truth: 'NAIK' },
  { id: 'pd-flick-reclaim', gen: genPdFlickReclaim, truth: 'NAIK' },
  { id: 'pd-second-wave', gen: genPdSecondWave, truth: 'NAIK' },
]

/** 10 dump-side (73) + 4 pump-side (27) = 100 */
export const PD_COUNTS = [8, 7, 8, 8, 6, 7, 8, 8, 6, 7, 7, 7, 6, 7]

function slotFor(num: number): { def: ArchDef; k: number } {
  let rem = num
  for (let i = 0; i < PD_DEFS.length; i++) {
    if (rem <= PD_COUNTS[i]) return { def: PD_DEFS[i], k: rem - 1 }
    rem -= PD_COUNTS[i]
  }
  throw new Error(`nomor ujian tak valid: ${num}`)
}

function archMeta(id: string): PdArchMeta {
  const m = PD_ARCHES.find((a) => a.id === id)
  if (!m) throw new Error(`arketipe tak dikenal: ${id}`)
  return m
}

interface ForgeOut {
  candles: Candle[]
  entry: number
  exit: number
  truthMovePct: number
  truthMfePct: number
  baitMfePct: number
  levels: PdLevels
}

function forgeOnce(seed: string, def: ArchDef, diff: PdDiff): ForgeOut {
  const r = makeRng(seed)
  const u = 0.5
  const pen = new Pen(100, u)
  const lv: PdLevels = { puncak: 0, dasar: 0 }
  def.gen(pen, r, u, PD_DIFF_CFG[diff], lv)
  if (pen.candles.length !== PD_TOTAL) {
    throw new Error(`generator menghasilkan ${pen.candles.length} candle (harus ${PD_TOTAL}) — seed ${seed}`)
  }
  // rescale: puncak pump tepat di fraksi acak (memutus kebetulan angka)
  const puncak0 = Math.max(...pen.candles.map((c) => c.h))
  const frac = 0.31 + r.next() * 0.5
  const target = rescalePeakTo(pen, puncak0, frac)
  const f = target / puncak0
  lv.puncak = target
  lv.dasar = lv.dasar > 0 ? lv.dasar * f : Math.min(...pen.candles.slice(0, 14).map((c) => c.l))
  const cs = pen.candles
  const entry = cs[PD_VISIBLE - 1].c
  const horizon = cs.slice(PD_VISIBLE)
  const exit = cs[PD_TOTAL - 1].c
  const maxHi = Math.max(...horizon.map((c) => c.h))
  const minLo = Math.min(...horizon.map((c) => c.l))
  const truth = def.truth
  const truthMovePct = truth === 'NAIK' ? (exit / entry - 1) * 100 : (1 - exit / entry) * 100
  const truthMfePct = truth === 'NAIK' ? (maxHi / entry - 1) * 100 : (1 - minLo / entry) * 100
  const baitMfePct = truth === 'NAIK' ? (1 - minLo / entry) * 100 : (maxHi / entry - 1) * 100
  return { candles: cs, entry, exit, truthMovePct, truthMfePct, baitMfePct, levels: lv }
}

function forgeWithGate(ns: string, def: ArchDef, pembunuh: boolean, diff: PdDiff): ForgeOut & { seed: string } {
  let best: (ForgeOut & { seed: string }) | null = null
  let bestScore = -Infinity
  for (let attempt = 0; attempt < 14; attempt++) {
    const seed = `${ns}::${def.id}::${attempt}`
    let out: ForgeOut
    try {
      out = forgeOnce(seed, def, diff)
    } catch {
      continue
    }
    const pumpSide = def.truth === 'NAIK'
    const passMove = pumpSide ? out.truthMovePct >= PD_MIN_PUMP_MOVE * 100 : out.truthMovePct >= PD_MIN_DUMP_MOVE * 100
    const passMfe = pumpSide ? out.truthMfePct >= PD_MIN_PUMP_MFE * 100 : out.truthMfePct >= PD_MIN_DUMP_MFE * 100
    const passBait = !pembunuh || out.baitMfePct <= PD_MAX_BAIT_MFE * 100
    const pass = passMove && passMfe && passBait
    const score = Math.min(
      out.truthMovePct,
      out.truthMfePct,
      pembunuh ? (PD_MAX_BAIT_MFE * 100 - out.baitMfePct) * 4 + 2.6 : Infinity,
    )
    if (!best || score > bestScore) {
      best = { ...out, seed }
      bestScore = score
    }
    if (pass) return { ...out, seed }
  }
  if (!best) throw new Error(`forge gagal total: ${def.id} ${diff}`)
  return best // langka: dipakai dengan flag noiseFlipped
}

/** forge satu ujian pump & dump (num 1..100) */
export function forgePdExam(num: number, ns = 'pd100'): PdExam {
  const { def, k } = slotFor(num)
  const arch = archMeta(def.id)
  const diff = PD_DIFF_CYCLE[k % PD_DIFF_CYCLE.length]
  const out = forgeWithGate(`${ns}::${arch.id}::${k}`, def, arch.pembunuh, diff)
  const moveSigned = (out.exit / out.entry - 1) * 100
  const truth: 'NAIK' | 'TURUN' = def.truth
  const truthMovePct = truth === 'NAIK' ? moveSigned : -moveSigned
  return {
    num, arch, diff, seed: out.seed,
    fase: arch.fase, truth, bait: truth === 'NAIK' ? 'TURUN' : 'NAIK',
    candles: out.candles, levels: out.levels, entry: out.entry, exit: out.exit,
    movePct: truthMovePct, mfePct: out.truthMfePct, baitMfePct: out.baitMfePct,
    noiseFlipped: truthMovePct < 0,
  }
}

/** 100 ujian pump & dump */
export function forgePdSuite(ns = 'pd100'): PdExam[] {
  return Array.from({ length: PD_SIZE }, (_, i) => forgePdExam(i + 1, ns))
}
