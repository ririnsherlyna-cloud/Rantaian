// ============================================================
// UJIAN GABUNGAN 4 ASPEK — "1 ujian = 1 koin = SEMUA jebakan
// BEKERJA BERSAMAAN": STOP HUNT / LIQUIDITY GRAB + BULL TRAP +
// BEAR TRAP + CANDLE DECEPTION dalam satu chart. Inilah kondisi
// yang membuat trader profesional dilikuidasi & frustrasi.
//
// Anatomi gauntlet (setiap ujian, urutan bervariasi):
//   A. BASE RANGE      — pool likuiditas dua sisi (equal highs/lows
//                        atau tepi range lebar) + LILIN MENIPU
//                        (fake engulf, doji, pin bar salah arah)
//   B. TRAP #1         — BULL TRAP (tembus atas lalu dicabut) /
//                        BEAR TRAP (cermin) — menabung likuiditas
//   C. TRAP #2         — cerminnya — melahirkan pool rantai
//   D. STOP HUNT FINAL — sapuan mendalam pool rantai (kaskade
//                        stop) dgn volume klimaks
//   E. KEPUTUSAN       — otak memilih ENTRY / WAIT / SKIP +
//                        MENYATAKAN STOP LOSS (bisa DILIKUIDASI!)
//   F. HORIZON 14      — resolusi dari DATA
//
// BEDA DARI UJIAN SEBELUMNYA: rencana trade kini WAJIB membawa
// STOP LOSS. Stop tersentuh sebelum target = LIKUIDASI. Inilah
// pertanyaan Guru: "apakah kita terliquidasi ataukah lulus?"
//
// Protokol anti-hindsight: 60 candle VISIBLE + 14 HORIZON; truth
// SELALU dari data; fee buy 0.1% + fee sell 0.1% — hasil akhir
// SELALU NET (profit kotor tidak pernah dipakai).
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, step, precise, volCalm,
  type BtRng, type DiffCfg,
} from './bulltrap-forge'

export const CG_VISIBLE = 60
export const CG_HORIZON = 14
export const CG_TOTAL = CG_VISIBLE + CG_HORIZON
export const CG_SIZE = 100

/** fee taker kelas exchange: 0.1% beli + 0.1% jual (WAJIB dihitung) */
export const FEE_BUY = 0.001
export const FEE_SELL = 0.001

export type CgArah = 'NAIK' | 'TURUN'

// ------------------------------------------------------------
// RENCANA & LEDGER — dengan STOP LOSS (likuidasi nyata)
// ------------------------------------------------------------

export type CgAksi = 'ENTRY' | 'WAIT' | 'SKIP'

export interface CgPlan {
  aksi: CgAksi
  arah: CgArah
  targetPct: number
  stopPct: number // WAJIB — rencana tanpa stop tidak diterima pasar
  triggerLevel?: number // utk WAIT: level konfirmasi milik otak
}

export interface CgLedger {
  aksi: CgAksi
  mode: 'ENTRY' | 'WAIT-HIT' | 'NO-TRADE'
  arah: CgArah
  entry: number | null
  stop: number | null
  target: number | null
  exit: number | null
  targetHit: boolean
  stopHit: boolean // LIKUIDASI — stop tersentuh sebelum target
  hitCandle: number // 0 = tak tersentuh / no-trade; 61..74
  feeBuy: number | null
  feeSell: number | null
  grossPct: number | null // profit kotor — TIDAK dipakai sbg hasil akhir
  netPct: number | null // profit BERSIH setelah fee buy + fee sell
  returnPct: number | null
  berhasil: boolean | null // trade: netPct > 0 && !stopHit; no-trade: null
  noTradeAman: boolean | null // no-trade: true bila trade jebakan akan LIKUIDASI/rugi net
  noTradeLabel: 'AMAN-HINDARI' | 'KELEWAT-PELUANG' | null
}

interface SimOut { exit: number; stopHit: boolean; targetHit: boolean; hitCandle: number }

function walkWithStop(arah: CgArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[], baseIdx: number): SimOut {
  const sign = arah === 'NAIK' ? 1 : -1
  const stop = entry * (1 - (sign * stopPct) / 100)
  const target = entry * (1 + (sign * targetPct) / 100)
  for (let i = 0; i < horizon.length; i++) {
    const c = horizon[i]
    const stopTouched = arah === 'NAIK' ? c.l <= stop : c.h >= stop
    const targetTouched = arah === 'NAIK' ? c.h >= target : c.l <= target
    // KONSERVATIF & JUJUR: satu lilin menyentuh keduanya -> STOP dulu (kita bukan pembaca keberuntungan)
    if (stopTouched) return { exit: stop, stopHit: true, targetHit: false, hitCandle: baseIdx + i + 1 }
    if (targetTouched) return { exit: target, stopHit: false, targetHit: true, hitCandle: baseIdx + i + 1 }
  }
  return { exit: horizon[horizon.length - 1].c, stopHit: false, targetHit: false, hitCandle: 0 }
}

function coreTrade(arah: CgArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[], baseIdx: number): CgLedger {
  const w = walkWithStop(arah, entry, stopPct, targetPct, horizon, baseIdx)
  const stop = entry * (1 - ((arah === 'NAIK' ? 1 : -1) * stopPct) / 100)
  const target = entry * (1 + ((arah === 'NAIK' ? 1 : -1) * targetPct) / 100)
  const feeBuy = entry * FEE_BUY
  const feeSell = w.exit * FEE_SELL
  const grossPct = arah === 'NAIK' ? (w.exit / entry - 1) * 100 : (1 - w.exit / entry) * 100
  const netPct =
    arah === 'NAIK'
      ? ((w.exit * (1 - FEE_SELL)) / (entry * (1 + FEE_BUY)) - 1) * 100
      : ((entry * (1 - FEE_BUY)) / (w.exit * (1 + FEE_SELL)) - 1) * 100
  return {
    aksi: 'ENTRY', mode: 'ENTRY', arah, entry, stop, target, exit: w.exit,
    targetHit: w.targetHit, stopHit: w.stopHit, hitCandle: w.hitCandle,
    feeBuy, feeSell, grossPct, netPct, returnPct: netPct,
    berhasil: netPct > 0 && !w.stopHit, noTradeAman: null, noTradeLabel: null,
  }
}

const NO_TRADE = (aman: boolean): CgLedger => ({
  aksi: 'SKIP', mode: 'NO-TRADE', arah: 'NAIK', entry: null, stop: null, target: null, exit: null,
  targetHit: false, stopHit: false, hitCandle: 0, feeBuy: null, feeSell: null,
  grossPct: null, netPct: null, returnPct: null, berhasil: null,
  noTradeAman: aman, noTradeLabel: aman ? 'AMAN-HINDARI' : 'KELEWAT-PELUANG',
})

/** rencana jebakan utk menilai no-trade: seandainya ikut umpan (arah bait)
 *  dgn disiplin standar — apakah ia LIKUIDASI / rugi net? */
export function simBaitTrade(arah: CgArah, close60: number, horizon: Candle[], targetPct = 2.2, stopPct = 2.2): CgLedger {
  return coreTrade(arah, close60, stopPct, targetPct, horizon, CG_VISIBLE - 1)
}

/** simulasi eksekusi rencana otak atas 60 visible + 14 horizon.
 *  ENTRY -> masuk di close60 dgn stop & target yang dinyatakan.
 *  WAIT  -> masuk saat close menembus triggerLevel searah (maks 8
 *           candle horizon); stop & target dijangkar dari entry baru;
 *           tak terpenuhi = NO-TRADE.
 *  SKIP  -> NO-TRADE; dinilai jujur dari data (aman bila umpan likuidasi/rugi). */
export function simCgTrade(plan: CgPlan, close60: number, horizon: Candle[], bait: CgArah): CgLedger {
  if (plan.aksi === 'SKIP') {
    const b = simBaitTrade(bait, close60, horizon)
    return NO_TRADE((b.netPct ?? 0) <= 0 || b.stopHit)
  }
  if (plan.aksi === 'ENTRY') return coreTrade(plan.arah, close60, plan.stopPct, plan.targetPct, horizon, CG_VISIBLE - 1)
  const lvl = plan.triggerLevel ?? close60
  const ok0 = plan.arah === 'NAIK' ? close60 >= lvl : close60 <= lvl
  if (ok0) return { ...coreTrade(plan.arah, close60, plan.stopPct, plan.targetPct, horizon, CG_VISIBLE - 1), mode: 'WAIT-HIT' }
  for (let i = 0; i < Math.min(8, horizon.length); i++) {
    const c = horizon[i].c
    const ok = plan.arah === 'NAIK' ? c >= lvl : c <= lvl
    if (ok) {
      const led = coreTrade(plan.arah, c, plan.stopPct, plan.targetPct, horizon.slice(i + 1), CG_VISIBLE + i)
      return { ...led, mode: 'WAIT-HIT' }
    }
  }
  const b = simBaitTrade(bait, close60, horizon)
  return NO_TRADE((b.netPct ?? 0) <= 0 || b.stopHit)
}

export function totalFeePct(): number {
  return (FEE_BUY + FEE_SELL) * 100
}

// ------------------------------------------------------------
// LILIN MENIPU (aspek 4) — disuntik di fase base/regroup
// ------------------------------------------------------------

export type DeceitKind = 'fake-engulf-merah' | 'fake-engulf-hijau' | 'doji-purba' | 'pin-salah-arah'

/** engulf MERAH besar di tengah range (menggoda SELL) — kebalikan truth NAIK */
export function deceitEngulfMerah(pen: Pen, r: BtRng, u: number): void {
  const o = pen.p
  precise(pen, o, o - 0.85 * u, 0.06 * u, 0.08 * u, 1.35 + r.next() * 0.3)
}
export function deceitEngulfHijau(pen: Pen, r: BtRng, u: number): void {
  const o = pen.p
  precise(pen, o, o + 0.85 * u, 0.08 * u, 0.06 * u, 1.35 + r.next() * 0.3)
}
export function deceitDoji(pen: Pen, r: BtRng, u: number): void {
  const o = pen.p
  precise(pen, o, o + (r.chance(0.5) ? 0.03 : -0.03) * u, 0.34 * u, 0.34 * u, 0.7 + r.next() * 0.25)
}
/** pin bar menjulang (shooting-star look) — umpan SELL di dasar range */
export function deceitPinAtas(pen: Pen, r: BtRng, u: number): void {
  const o = pen.p
  precise(pen, o, o - 0.12 * u, 0.62 * u, 0.07 * u, 0.95 + r.next() * 0.3)
}
export function deceitPinBawah(pen: Pen, r: BtRng, u: number): void {
  const o = pen.p
  precise(pen, o, o + 0.12 * u, 0.07 * u, 0.62 * u, 0.95 + r.next() * 0.3)
}

// ------------------------------------------------------------
// META ASPEK — bukti 4 aspek dalam setiap ujian
// ------------------------------------------------------------

export interface AspekTruth {
  bullTrap: { dari: number; ke: number } // indeks candle fase bull trap
  bearTrap: { dari: number; ke: number }
  stopHunt: { dari: number; ke: number; poolLevel: number }
  deceit: { i: number; kind: DeceitKind }[]
}

export interface CgExam {
  num: number
  fam: string
  label: string
  diff: string
  seed: string
  truth: CgArah
  bait: CgArah
  post: 'REVERSAL' | 'CONTINUATION' | 'DOUBLE-SWEEP'
  aspek: AspekTruth
  candles: Candle[] // CG_TOTAL
  entry: number // close candle ke-60
  exit: number // close candle ke-74
  extreme: number // ekstrem sapuan final (stop struktural otak)
  movePct: number // gerakan truth dari data
  mfePct: number
  baitMfePct: number
  noiseFlipped: boolean
}

export type { Candle }
export { Pen, step, precise, volCalm, makeRng }
export type { BtRng as CgRng, DiffCfg as CgCfg }
