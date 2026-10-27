// ============================================================
// PERAKIT SUITE UJIAN BEAR TRAP — 100 trap (12 arketipe) +
// 24 guard. Setiap ujian di-forge dengan pencobaan berbibit
// (maks 12) sampai gerbang profit terpenuhi:
//  - TRAP : rebound close74 >= 2.8% DAN MFE naik >= 3.2%
//  - GUARD: jatuh close74 >= 3.0% DAN MFE turun >= 3.4%
// Truth SELALU dari data (tanda exit vs entry).
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, SR_TOTAL, SR_VISIBLE, SR_SIZE, SR_GUARD_SIZE,
  SR_MIN_TRAP_MOVE, SR_MIN_TRAP_MFE, SR_MIN_GUARD_MOVE, SR_MIN_GUARD_MFE,
  SR_ARCHES, SR_GUARD_ARCHES, SR_DIFF_CYCLE, SR_DIFF_CFG,
  type SrArch, type SrGuardArch, type SrArchMeta, type SrDiff, type SrExam, type SrRng, type SrDiffCfg,
} from './beartrap-forge'
import { genSrClassic, genSrTrendExhaust, genSrSweepLow, genSrDoubleBottom, genSrParabolicCrash, genSrCorrRally } from './beartrap-gens-a'
import { genSrBearflagFail, genSrCapitulationVacuum, genSrSpring, genSrGapPanic, genSrReaccFake, genSrTripleTest } from './beartrap-gens-b'
import { genGRealBreakdown, genGHealthyBearflag, genGRallyDowntrend } from './beartrap-gens-g'

type SrGen = (pen: Pen, r: SrRng, u: number, cfg: SrDiffCfg) => void

export const SR_GENS: Record<SrArch, SrGen> = {
  'sr-classic': genSrClassic,
  'sr-trend-exhaust': genSrTrendExhaust,
  'sr-sweep-low': genSrSweepLow,
  'sr-double-bottom': genSrDoubleBottom,
  'sr-parabolic-crash': genSrParabolicCrash,
  'sr-corr-rally': genSrCorrRally,
  'sr-bearflag-fail': genSrBearflagFail,
  'sr-capitulation-vacuum': genSrCapitulationVacuum,
  'sr-spring': genSrSpring,
  'sr-gap-panic': genSrGapPanic,
  'sr-reacc-fake': genSrReaccFake,
  'sr-triple-test': genSrTripleTest,
}

export const SR_GUARD_GENS: Record<SrGuardArch, SrGen> = {
  'g-real-breakdown': genGRealBreakdown,
  'g-healthy-bearflag': genGHealthyBearflag,
  'g-rally-downtrend': genGRallyDowntrend,
}

const GUARD_ORDER: SrGuardArch[] = ['g-real-breakdown', 'g-healthy-bearflag', 'g-rally-downtrend']

function archMeta(id: SrArch): SrArchMeta {
  const m = SR_ARCHES.find((a) => a.id === id)
  if (!m) throw new Error(`arketipe tak dikenal: ${id}`)
  return m
}

function guardMeta(id: SrGuardArch): SrArchMeta {
  const m = SR_GUARD_ARCHES.find((a) => a.id === id)
  if (!m) throw new Error(`guard tak dikenal: ${id}`)
  return m
}

interface ForgeOut { candles: Candle[]; entry: number; exit: number; movePct: number; mfePct: number; seed: string }

function forgeOnce(seed: string, gen: SrGen, diff: SrDiff): { candles: Candle[]; entry: number; exit: number; mfePct: number } {
  const r = makeRng(seed)
  const u = 0.5
  const pen = new Pen(100, u)
  gen(pen, r, u, SR_DIFF_CFG[diff])
  if (pen.candles.length !== SR_TOTAL) {
    throw new Error(`generator menghasilkan ${pen.candles.length} candle (harus ${SR_TOTAL}) — seed ${seed}`)
  }
  const entry = pen.candles[SR_VISIBLE - 1].c
  const exit = pen.candles[SR_TOTAL - 1].c
  const horizon = pen.candles.slice(SR_VISIBLE)
  const mfePct = ((Math.max(...horizon.map((c) => c.h)) / entry) - 1) * 100
  return { candles: pen.candles, entry, exit, mfePct }
}

function forgeWithGate(ns: string, gen: SrGen, diff: SrDiff, kind: 'TRAP' | 'GUARD'): ForgeOut {
  let best: ForgeOut | null = null
  for (let attempt = 0; attempt < 12; attempt++) {
    const seed = `${ns}::${attempt}`
    const { candles, entry, exit, mfePct } = forgeOnce(seed, gen, diff)
    const movePct = (exit / entry - 1) * 100
    const pass =
      kind === 'TRAP'
        ? movePct >= SR_MIN_TRAP_MOVE * 100 && mfePct >= SR_MIN_TRAP_MFE * 100
        : movePct <= -SR_MIN_GUARD_MOVE * 100 && mfePct <= -SR_MIN_GUARD_MFE * 100
    const cand: ForgeOut = { candles, entry, exit, movePct, mfePct, seed }
    if (!best || (kind === 'TRAP' ? movePct > best.movePct : movePct < best.movePct)) best = cand
    if (pass) return cand
  }
  if (!best) throw new Error('forge gagal total')
  return best // langka: dipakai dengan flag noiseFlipped
}

/** forge satu ujian trap (num 1..100) */
export function forgeSrExam(num: number, ns = 'sr100'): SrExam {
  const idx = (num - 1) % 12
  const k = Math.floor((num - 1) / 12) // 0..8
  const archId = ([
    'sr-classic', 'sr-trend-exhaust', 'sr-sweep-low', 'sr-double-bottom',
    'sr-parabolic-crash', 'sr-corr-rally', 'sr-bearflag-fail', 'sr-capitulation-vacuum',
    'sr-spring', 'sr-gap-panic', 'sr-reacc-fake', 'sr-triple-test',
  ] as SrArch[])[idx]
  const arch = archMeta(archId)
  const diff = SR_DIFF_CYCLE[k % SR_DIFF_CYCLE.length]
  const out = forgeWithGate(`${ns}::${archId}::${k}`, SR_GENS[archId], diff, 'TRAP')
  const truth: 'NAIK' | 'TURUN' = out.exit >= out.entry ? 'NAIK' : 'TURUN'
  return {
    num, arch, diff, seed: out.seed, kind: 'TRAP',
    candles: out.candles, entry: out.entry, exit: out.exit,
    truth, movePct: out.movePct, mfePct: out.mfePct,
    noiseFlipped: truth !== 'NAIK',
  }
}

/** forge satu ujian guard (num 1..24) */
export function forgeSrGuard(num: number, ns = 'srguard'): SrExam {
  const idx = (num - 1) % 3
  const k = Math.floor((num - 1) / 3) // 0..7
  const archId = GUARD_ORDER[idx]
  const arch = guardMeta(archId)
  const diff = SR_DIFF_CYCLE[k % SR_DIFF_CYCLE.length]
  const out = forgeWithGate(`${ns}::${archId}::${k}`, SR_GUARD_GENS[archId], diff, 'GUARD')
  const truth: 'NAIK' | 'TURUN' = out.exit >= out.entry ? 'NAIK' : 'TURUN'
  return {
    num, arch, diff, seed: out.seed, kind: 'GUARD',
    candles: out.candles, entry: out.entry, exit: out.exit,
    truth, movePct: out.movePct, mfePct: out.mfePct,
    noiseFlipped: truth !== 'TURUN',
  }
}

/** 100 ujian bear trap */
export function forgeSrSuite(ns = 'sr100'): SrExam[] {
  return Array.from({ length: SR_SIZE }, (_, i) => forgeSrExam(i + 1, ns))
}

/** 24 guard anti-bias */
export function forgeSrGuardSuite(ns = 'srguard'): SrExam[] {
  return Array.from({ length: SR_GUARD_SIZE }, (_, i) => forgeSrGuard(i + 1, ns))
}
