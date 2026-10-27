// ============================================================
// PERAKIT SUITE UJIAN STOP HUNT / LIQUIDITY GRAB — 100 skenario
// (16 arketipe). Setiap ujian di-forge dengan pencobaan berbibit
// (maks 14) sampai gerbang profit DARI DATA terpenuhi:
//  - REVERSAL    : gerak truth >= 2.8% DAN MFE truth >= 3.2%
//  - CONTINUATION: gerak truth >= 2.6% DAN MFE truth >= 3.0%
//                  DAN MFE arah bait <= 1.1% (target disiplin
//                  otak 1.6%+ MUSTAHIL tersentuh oleh bait —
//                  pembaca naif dijamin rugi setelah fee).
// Truth SELALU dari data. Bait = kebalikan truth.
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, SH_TOTAL, SH_VISIBLE, SH_SIZE, SH_ARCHES,
  SH_MIN_REV_MOVE, SH_MIN_REV_MFE, SH_MIN_CONT_MOVE, SH_MIN_CONT_MFE, SH_MAX_BAIT_MFE,
  SH_DIFF_CYCLE, SH_DIFF_CFG,
  type ShArchMeta, type ShDiff, type ShExam, type ShRng, type ShDiffCfg, type PoolTruth, type ShPost,
} from './stophunt-forge'
import {
  genShSwingLow, genShEqualLows, genShSessionLow, genShRangeLow,
  genShTrendlineHl, genShRoundNumber, genShWickCluster, genShCascadeV,
} from './stophunt-gens-a'
import {
  genShSwingHigh, genShEqualHighs, genShRangeHigh, genShSqueezeHigh,
  genShGrabContDn, genShGrabContUp, genShFakeReclaimDn, genShVacuumHl,
} from './stophunt-gens-b'

type ShGen = (pen: Pen, r: ShRng, u: number, cfg: ShDiffCfg, pool: PoolTruth) => void

interface ArchDef { id: string; gen: ShGen; post: ShPost; truth: 'NAIK' | 'TURUN' }

export const SH_DEFS: ArchDef[] = [
  { id: 'sh-swing-low', gen: genShSwingLow, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-equal-lows', gen: genShEqualLows, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-session-low', gen: genShSessionLow, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-range-low', gen: genShRangeLow, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-trendline-hl', gen: genShTrendlineHl, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-round-number', gen: genShRoundNumber, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-wick-cluster', gen: genShWickCluster, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-cascade-v', gen: genShCascadeV, post: 'REVERSAL', truth: 'NAIK' },
  { id: 'sh-swing-high', gen: genShSwingHigh, post: 'REVERSAL', truth: 'TURUN' },
  { id: 'sh-equal-highs', gen: genShEqualHighs, post: 'REVERSAL', truth: 'TURUN' },
  { id: 'sh-range-high', gen: genShRangeHigh, post: 'REVERSAL', truth: 'TURUN' },
  { id: 'sh-squeeze-high', gen: genShSqueezeHigh, post: 'REVERSAL', truth: 'TURUN' },
  { id: 'sh-grab-cont-dn', gen: genShGrabContDn, post: 'CONTINUATION', truth: 'TURUN' },
  { id: 'sh-grab-cont-up', gen: genShGrabContUp, post: 'CONTINUATION', truth: 'NAIK' },
  { id: 'sh-fake-reclaim-dn', gen: genShFakeReclaimDn, post: 'CONTINUATION', truth: 'TURUN' },
  { id: 'sh-vacuum-hl', gen: genShVacuumHl, post: 'CONTINUATION', truth: 'NAIK' },
]

/** 12 arketipe reversal x 6 + 4 continuation x 7 = 100 */
export const SH_COUNTS = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7]

function slotFor(num: number): { def: ArchDef; k: number } {
  let rem = num
  for (let i = 0; i < SH_DEFS.length; i++) {
    if (rem <= SH_COUNTS[i]) return { def: SH_DEFS[i], k: rem - 1 }
    rem -= SH_COUNTS[i]
  }
  throw new Error(`nomor ujian tak valid: ${num}`)
}

function archMeta(id: string): ShArchMeta {
  const m = SH_ARCHES.find((a) => a.id === id)
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
  pool: PoolTruth
}

function forgeOnce(seed: string, def: ArchDef, diff: ShDiff): ForgeOut {
  const r = makeRng(seed)
  const u = 0.5
  const pen = new Pen(100, u)
  const pool: PoolTruth = { jenis: 'swing-low', side: 'BAWAH', level: 0, sentuhan: 0, sweepIdx: 59 }
  def.gen(pen, r, u, SH_DIFF_CFG[diff], pool)
  if (pen.candles.length !== SH_TOTAL) {
    throw new Error(`generator menghasilkan ${pen.candles.length} candle (harus ${SH_TOTAL}) — seed ${seed}`)
  }
  const cs = pen.candles
  const entry = cs[SH_VISIBLE - 1].c
  const horizon = cs.slice(SH_VISIBLE)
  const exit = cs[SH_TOTAL - 1].c
  const maxHi = Math.max(...horizon.map((c) => c.h))
  const minLo = Math.min(...horizon.map((c) => c.l))
  const truth = def.truth
  const truthMovePct = truth === 'NAIK' ? (exit / entry - 1) * 100 : (1 - exit / entry) * 100
  const truthMfePct = truth === 'NAIK' ? (maxHi / entry - 1) * 100 : (1 - minLo / entry) * 100
  const baitMfePct = truth === 'NAIK' ? (1 - minLo / entry) * 100 : (maxHi / entry - 1) * 100
  return { candles: cs, entry, exit, truthMovePct, truthMfePct, baitMfePct, pool }
}

function forgeWithGate(ns: string, def: ArchDef, diff: ShDiff): ForgeOut & { seed: string } {
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
    const pass =
      def.post === 'REVERSAL'
        ? out.truthMovePct >= SH_MIN_REV_MOVE * 100 && out.truthMfePct >= SH_MIN_REV_MFE * 100
        : out.truthMovePct >= SH_MIN_CONT_MOVE * 100 && out.truthMfePct >= SH_MIN_CONT_MFE * 100 && out.baitMfePct <= SH_MAX_BAIT_MFE * 100
    const score = def.post === 'REVERSAL'
      ? Math.min(out.truthMovePct, out.truthMfePct)
      : Math.min(out.truthMovePct, out.truthMfePct, (SH_MAX_BAIT_MFE * 100 - out.baitMfePct) * 4 + 2.6)
    if (!best || score > bestScore) {
      best = { ...out, seed }
      bestScore = score
    }
    if (pass) return { ...out, seed }
  }
  if (!best) throw new Error(`forge gagal total: ${def.id} ${diff}`)
  return best // langka: dipakai dengan flag noiseFlipped
}

/** forge satu ujian stop hunt (num 1..100) */
export function forgeShExam(num: number, ns = 'sh100'): ShExam {
  const { def, k } = slotFor(num)
  const arch = archMeta(def.id)
  const diff = SH_DIFF_CYCLE[k % SH_DIFF_CYCLE.length]
  const out = forgeWithGate(`${ns}::${arch.id}::${k}`, def, diff)
  const moveSigned = (out.exit / out.entry - 1) * 100
  const truth: 'NAIK' | 'TURUN' = def.truth
  const truthMovePct = truth === 'NAIK' ? moveSigned : -moveSigned
  return {
    num, arch, diff, seed: out.seed,
    pool: out.pool,
    postGrab: def.post, truth, bait: truth === 'NAIK' ? 'TURUN' : 'NAIK',
    candles: out.candles, entry: out.entry, exit: out.exit,
    movePct: truthMovePct, mfePct: out.truthMfePct, baitMfePct: out.baitMfePct,
    noiseFlipped: truthMovePct < 0,
  }
}

/** 100 ujian stop hunt / liquidity grab */
export function forgeShSuite(ns = 'sh100'): ShExam[] {
  return Array.from({ length: SH_SIZE }, (_, i) => forgeShExam(i + 1, ns))
}
