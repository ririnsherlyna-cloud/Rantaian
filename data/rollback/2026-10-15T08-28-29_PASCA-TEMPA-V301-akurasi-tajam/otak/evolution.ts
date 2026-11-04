// ============================================================
// EVOLUSI V2 — genome berevolusi dari vonis nyata.
//   • MUTASI BOBOT : setiap hari teradili, bobot komposit digeser
//     oleh keselarasan faktor↔hasil (learning rate kecil).
//   • MUTASI KNOB STRUKTUR : K, ambang breadth, ambang parabolik,
//     ATR cap — digeser oleh performa 3 hari terakhir:
//       rugi beruntun → makin defensif; profit beruntun → makin berani.
//   • REVOLUSI : hit rate memburuk 6 hari → rekonstruksi dari memori.
//   • UPGRADE : tertinggal dari rival → distilasi pola pemenang.
// Tanpa kebocoran: mutasi HANYA diterapkan SETELAH hari dinilai.
// ============================================================

import { FACTOR_IDS, FactorId } from './factors'
import { DEFAULT_WEIGHTS, DEFAULT_GENOME_V2, GenomeV2, sanitizeGenomeV2, Weights } from './brain'

const W_MIN = 0.25
const W_MAX = 2.75

export function clampW(v: number): number {
  return Math.min(W_MAX, Math.max(W_MIN, v))
}

export function defaultClone(): Weights {
  return { ...DEFAULT_WEIGHTS }
}

export function defaultGenomeV2Clone(): GenomeV2 {
  return sanitizeGenomeV2({ ...DEFAULT_GENOME_V2 })
}

/**
 * Mutasi bobot harian. episodes: faktor ternormalisasi + hasil.
 * Selaras (faktor dan hasil searah) → bobot naik; lawan → turun.
 */
export function mutate(
  w: Weights,
  episodes: { factors: Record<string, number>; ret: number | null }[],
  eta: number,
): { weights: Weights; delta: number } {
  const next = { ...w }
  if (episodes.length === 0) return { weights: next, delta: 0 }

  for (const id of FACTOR_IDS) {
    let contrib = 0
    for (const e of episodes) {
      const f = (e.factors as Record<FactorId, number>)[id] ?? 0
      const ret = e.ret ?? 0
      if (f === 0 || ret === 0) continue
      contrib += Math.sign(f) * Math.sign(ret) * Math.abs(f)
    }
    contrib /= episodes.length
    next[id] = clampW(next[id] * (1 + eta * contrib))
    next[id] = clampW(next[id] + (1 - next[id]) * 0.015)
  }

  let delta = 0
  for (const id of FACTOR_IDS) delta += Math.abs(next[id] - w[id])
  return { weights: next, delta }
}

/**
 * Mutasi KNOB STRUKTUR — dipicu performa 3 hari terakhir (ret3).
 * PELAJARAN dari replay pertama: drift liar merusak kebijakan lab-optimal
 * (paraK hanyut 60→140, breadthK1 naik 32→44 → hari pump besar terlewat).
 * Kini: batas KETAT di sekitar titik optimal lab, langkah kecil (±2),
 * jalan tiap 2 hari, arah defensif/ofensif yang benar.
 */
export function mutateKnobs(
  g: GenomeV2,
  ret3: number,       // total return 3 hari terakhir (fraksi)
  hitRate6: number,   // hit rate 6 hari terakhir
  daySeed: string,
): { genome: GenomeV2; notes: string[] } {
  const notes: string[] = []
  let h = 2166136261
  for (let i = 0; i < daySeed.length; i++) { h ^= daySeed.charCodeAt(i); h = Math.imul(h, 16777619) }
  h = (h ^ (h << 13)) >>> 0; h = (h ^ (h >>> 17)) >>> 0; h = (h ^ (h << 5)) >>> 0
  if (h % 2 === 0) return { genome: g, notes: [] } // evolusi pelan: hanya tiap 2 hari

  const n = { ...g }
  // batas aman sekitar titik optimal lab X5 (+146.6%)
  const PARA = [45, 90] as const
  const BK2 = [38, 52] as const
  const BK1 = [26, 40] as const
  const ATR = [12, 18] as const

  if (ret3 < -0.04) {
    // defensif: perketat guard breadth, butuh parabola lebih kuat utk fokus
    n.breadthK2 = Math.min(BK2[1], n.breadthK2 + 2)
    n.breadthK1 = Math.min(Math.min(BK1[1], n.breadthK2 - 8), n.breadthK1 + 2)
    n.atrCap = Math.max(ATR[0], n.atrCap - 0.5)
    n.paraK = Math.min(PARA[1], n.paraK + 2)
    notes.push(`3 hari merugi → guard diperketat (brK2=${n.breadthK2}, brK1=${n.breadthK1}, ATR≤${n.atrCap.toFixed(1)})`)
  } else if (ret3 > 0.06) {
    // ofensif: turunkan ambang parabolik agar pelari lebih mudah dinaiki
    n.paraK = Math.max(PARA[0], n.paraK - 2)
    n.breadthK2 = Math.max(BK2[0], n.breadthK2 - 2)
    n.breadthK1 = Math.max(BK1[0], n.breadthK1 - 2)
    n.atrCap = Math.min(ATR[1], n.atrCap + 0.25)
    notes.push(`3 hari profit → mode berburu diperluas (paraK=${n.paraK}, brK1=${n.breadthK1})`)
  } else if (hitRate6 < 0.4) {
    n.minNorm = Math.min(0.7, n.minNorm + 0.03)
    notes.push(`hit rate rendah → standar kualitas leader naik (minNorm=${n.minNorm.toFixed(2)})`)
  } else {
    // sehat: drift mikro menuju titik optimal lab (paraK 60)
    const pull = n.paraK > 60 ? -1 : 1
    n.paraK = Math.min(PARA[1], Math.max(PARA[0], n.paraK + pull))
  }
  return { genome: sanitizeGenomeV2(n), notes }
}

/**
 * REVOLUSI: rekonstruksi bobot dari agregat memori pola per rezim
 * + reset knob ke baseline terbukti (V2 lab).
 */
export function revolutionize(patternStats: Record<string, { align: number; n: number }> | null): { weights: Weights; genome: GenomeV2; note: string } {
  const w = defaultClone()
  const g = defaultGenomeV2Clone()
  if (!patternStats) {
    for (const id of FACTOR_IDS) w[id] = clampW(0.7 + ((id.length % 5) * 0.15))
    return { weights: w, genome: g, note: 'revolusi dari baseline prospektif (memori pola kosong)' }
  }
  let used = 0
  for (const id of FACTOR_IDS) {
    const st = patternStats[id]
    if (!st || st.n < 3) continue
    const acc = st.align / st.n // -1..1
    w[id] = clampW(1.0 + acc * 1.1)
    used++
  }
  return {
    weights: w,
    genome: g,
    note: used > 0
      ? `revolusi dari ${used} faktor bermemori + knob kembali ke baseline lab V2`
      : 'revolusi ke baseline lab V2 (memori pola belum cukup n≥3)',
  }
}

/** Fitness sederhana: hit rate window terakhir. */
export function fitnessFromResults(results: (boolean | null)[]): number | null {
  const valid = results.filter((r): r is boolean => r !== null)
  if (valid.length === 0) return null
  return valid.filter(Boolean).length / valid.length
}
