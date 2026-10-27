// ============================================================
// PERAKIT SUITE UJIAN BULL TRAP — 100 trap (12 arketipe) +
// 24 guard. Setiap ujian di-forge dengan pencobaan berbibit
// (maks 12) sampai gerbang profit terpenuhi: trap runtuh
// >= 2.8%, guard naik >= 3.0% (fee 0.2% tertlampa nyaman).
// Truth SELALU dari data (tanda exit vs entry).
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, BT_TOTAL, BT_VISIBLE, BT_SIZE, BT_GUARD_SIZE, BT_MIN_TRAP_MOVE, BT_MIN_GUARD_MOVE,
  BT_ARCHES, BT_GUARD_ARCHES, DIFF_CYCLE, BT_DIFF_CFG,
  type BtArch, type BtGuardArch, type BtArchMeta, type BtDiff, type BtExam, type BtRng, type DiffCfg,
} from './bulltrap-forge'
import { genBtClassic, genBtStrongExhaust, genBtSweepHigh, genBtDoubleTop, genBtParabolic, genBtReliefRally } from './bulltrap-gens-a'
import { genBtFlagFail, genBtSqueezeVacuum, genBtUtad, genBtGapChase, genBtReaccFake, genBtTripleTest } from './bulltrap-gens-b'
import { genGRealBreak, genGHealthyFlag, genGPullback } from './bulltrap-gens-g'

type BtGen = (pen: Pen, r: BtRng, u: number, cfg: DiffCfg) => void

export const BT_GENS: Record<BtArch, BtGen> = {
  'bt-classic': genBtClassic,
  'bt-strong-exhaust': genBtStrongExhaust,
  'bt-sweep-high': genBtSweepHigh,
  'bt-double-top': genBtDoubleTop,
  'bt-parabolic': genBtParabolic,
  'bt-relief-rally': genBtReliefRally,
  'bt-flag-fail': genBtFlagFail,
  'bt-squeeze-vacuum': genBtSqueezeVacuum,
  'bt-utad': genBtUtad,
  'bt-gap-chase': genBtGapChase,
  'bt-reacc-fake': genBtReaccFake,
  'bt-triple-test': genBtTripleTest,
}

export const BT_GUARD_GENS: Record<BtGuardArch, BtGen> = {
  'g-real-break': genGRealBreak,
  'g-healthy-flag': genGHealthyFlag,
  'g-pullback': genGPullback,
}

const GUARD_ORDER: BtGuardArch[] = ['g-real-break', 'g-healthy-flag', 'g-pullback']

function archMeta(id: BtArch): BtArchMeta {
  const m = BT_ARCHES.find((a) => a.id === id)
  if (!m) throw new Error(`arketipe tak dikenal: ${id}`)
  return m
}

function guardMeta(id: BtGuardArch): BtArchMeta {
  const m = BT_GUARD_ARCHES.find((a) => a.id === id)
  if (!m) throw new Error(`guard tak dikenal: ${id}`)
  return m
}

interface ForgeOut { candles: Candle[]; entry: number; exit: number; movePct: number; seed: string }

function forgeOnce(seed: string, gen: BtGen, diff: BtDiff): { candles: Candle[]; entry: number; exit: number } {
  const r = makeRng(seed)
  const u = 0.5
  const pen = new Pen(100, u)
  gen(pen, r, u, BT_DIFF_CFG[diff])
  if (pen.candles.length !== BT_TOTAL) {
    throw new Error(`generator menghasilkan ${pen.candles.length} candle (harus ${BT_TOTAL}) — seed ${seed}`)
  }
  const entry = pen.candles[BT_VISIBLE - 1].c
  const exit = pen.candles[BT_TOTAL - 1].c
  return { candles: pen.candles, entry, exit }
}

function forgeWithGate(ns: string, gen: BtGen, diff: BtDiff, kind: 'TRAP' | 'GUARD'): ForgeOut {
  let best: ForgeOut | null = null
  for (let attempt = 0; attempt < 12; attempt++) {
    const seed = `${ns}::${attempt}`
    const { candles, entry, exit } = forgeOnce(seed, gen, diff)
    const movePct = (exit / entry - 1) * 100
    const pass = kind === 'TRAP' ? movePct <= -BT_MIN_TRAP_MOVE * 100 : movePct >= BT_MIN_GUARD_MOVE * 100
    const cand: ForgeOut = { candles, entry, exit, movePct, seed }
    if (!best || Math.abs(movePct) > Math.abs(best.movePct)) best = cand
    if (pass) return cand
  }
  if (!best) throw new Error('forge gagal total')
  return best // langka: dipakai dengan flag noiseFlipped
}

/** forge satu ujian trap (num 1..100) */
export function forgeBtExam(num: number, ns = 'bt100'): BtExam {
  const idx = (num - 1) % 12
  const k = Math.floor((num - 1) / 12) // 0..8
  const archId = ([
    'bt-classic', 'bt-strong-exhaust', 'bt-sweep-high', 'bt-double-top',
    'bt-parabolic', 'bt-relief-rally', 'bt-flag-fail', 'bt-squeeze-vacuum',
    'bt-utad', 'bt-gap-chase', 'bt-reacc-fake', 'bt-triple-test',
  ] as BtArch[])[idx]
  const arch = archMeta(archId)
  const diff = DIFF_CYCLE[k % DIFF_CYCLE.length]
  const out = forgeWithGate(`${ns}::${archId}::${k}`, BT_GENS[archId], diff, 'TRAP')
  const truth: 'NAIK' | 'TURUN' = out.exit < out.entry ? 'TURUN' : 'NAIK'
  return {
    num, arch, diff, seed: out.seed, kind: 'TRAP',
    candles: out.candles, entry: out.entry, exit: out.exit,
    truth, movePct: out.movePct,
    noiseFlipped: truth !== 'TURUN',
  }
}

/** forge satu ujian guard (num 1..24) */
export function forgeBtGuard(num: number, ns = 'btguard'): BtExam {
  const idx = (num - 1) % 3
  const k = Math.floor((num - 1) / 3) // 0..7
  const archId = GUARD_ORDER[idx]
  const arch = guardMeta(archId)
  const diff = DIFF_CYCLE[k % DIFF_CYCLE.length]
  const out = forgeWithGate(`${ns}::${archId}::${k}`, BT_GUARD_GENS[archId], diff, 'GUARD')
  const truth: 'NAIK' | 'TURUN' = out.exit < out.entry ? 'TURUN' : 'NAIK'
  return {
    num, arch, diff, seed: out.seed, kind: 'GUARD',
    candles: out.candles, entry: out.entry, exit: out.exit,
    truth, movePct: out.movePct,
    noiseFlipped: truth !== 'NAIK',
  }
}

/** 100 ujian bull trap */
export function forgeBtSuite(ns = 'bt100'): BtExam[] {
  return Array.from({ length: BT_SIZE }, (_, i) => forgeBtExam(i + 1, ns))
}

/** 24 guard anti-bias */
export function forgeBtGuardSuite(ns = 'btguard'): BtExam[] {
  return Array.from({ length: BT_GUARD_SIZE }, (_, i) => forgeBtGuard(i + 1, ns))
}
