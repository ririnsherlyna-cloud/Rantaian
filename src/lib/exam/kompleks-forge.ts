// ============================================================
// UJIAN KOMPLEKS 5 ASPEK — "1 ujian = 1 rangkaian pasar
// KOMPLEKS: KELIMA aspek bekerja BERSAMAAN dan BERURUTAN":
//   1. STOP HUNT / LIQUIDITY GRAB — sapuan final pool rantai
//   2. FALSE BREAKOUT             — tembus puncak struktural lalu dicabut
//   3. PUMP AND DUMP              — markup impuls volume + markdown
//   4. BEAR TRAP                  — tembus bawah lalu dipulihkan
//   5. BULL TRAP                  — tembus atas lalu dicabut
//   + LILIN MENIPU (deceit) sebagai perekat antar fase.
//
// Otak wajib mengenali HUBUNGAN, URUTAN, dan INTERAKSI kelimanya:
// bull trap menabung likuiditas di atas -> bear trap melahirkan
// pool rantai di bawah -> pump menciptakan korban FOMO + likuiditas
// breakout -> FALSE BREAKOUT di puncak pump menampung pembeli
// terakhir -> DUMP menciptakan stop-loss korban pump -> grind
// menekan semuanya ke pool rantai -> STOP HUNT FINAL memanen
// seluruh stop cluster -> resolusi dari data (reclaim atau lanjut).
//
// Protokol anti-hindsight: 60 candle VISIBLE + 14 HORIZON.
// Fee buy 0.1% + fee sell 0.1% — hasil akhir SELALU NET.
// Rencana WAJIB membawa STOP LOSS (stop tersentuh = LIKUIDASI).
// ============================================================

import type { Candle } from './generator'
import type { BtRng, DiffCfg } from './bulltrap-forge'

export const KL_VISIBLE = 60
export const KL_HORIZON = 14
export const KL_TOTAL = KL_VISIBLE + KL_HORIZON
export const KL_SIZE = 100

/** fee taker kelas exchange: 0.1% beli + 0.1% jual (WAJIB dihitung) */
export const FEE_BUY = 0.001
export const FEE_SELL = 0.001

export type KlArah = 'NAIK' | 'TURUN'

export type KlDeceitKind = 'fake-engulf-merah' | 'fake-engulf-hijau' | 'doji-purba' | 'pin-salah-arah'

// ------------------------------------------------------------
// META ASPEK — bukti 5 aspek dalam setiap ujian (dari data)
// ------------------------------------------------------------

export interface AspekTruth5 {
  bullTrap: { dari: number; ke: number }
  bearTrap: { dari: number; ke: number }
  pump: { dari: number; ke: number; puncak: number } // markup impuls
  dump: { dari: number; ke: number } // markdown pasca-pump
  falseBreakout: { dari: number; ke: number; level: number } // tembus puncak struktural -> dicabut
  stopHunt: { dari: number; ke: number; poolLevel: number }
  deceit: { i: number; kind: KlDeceitKind }[]
}

// ------------------------------------------------------------
// RENCANA & LEDGER — dengan STOP LOSS (likuidasi nyata)
// ------------------------------------------------------------

export type KlAksi = 'ENTRY' | 'WAIT' | 'SKIP'

export interface KlPlan {
  aksi: KlAksi
  arah: KlArah
  targetPct: number
  stopPct: number // WAJIB — rencana tanpa stop tidak diterima pasar
  triggerLevel?: number // utk WAIT: level konfirmasi milik otak
}

export interface KlLedger {
  aksi: KlAksi
  mode: 'ENTRY' | 'WAIT-HIT' | 'NO-TRADE'
  arah: KlArah
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

function walkWithStop(arah: KlArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[], baseIdx: number): SimOut {
  const sign = arah === 'NAIK' ? 1 : -1
  const stop = entry * (1 - (sign * stopPct) / 100)
  const target = entry * (1 + (sign * targetPct) / 100)
  for (let i = 0; i < horizon.length; i++) {
    const c = horizon[i]
    const stopTouched = arah === 'NAIK' ? c.l <= stop : c.h >= stop
    const targetTouched = arah === 'NAIK' ? c.h >= target : c.l <= target
    // KONSERVATIF & JUJUR: satu lilin menyentuh keduanya -> STOP dulu
    if (stopTouched) return { exit: stop, stopHit: true, targetHit: false, hitCandle: baseIdx + i + 1 }
    if (targetTouched) return { exit: target, stopHit: false, targetHit: true, hitCandle: baseIdx + i + 1 }
  }
  return { exit: horizon[horizon.length - 1].c, stopHit: false, targetHit: false, hitCandle: 0 }
}

function coreTrade(arah: KlArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[], baseIdx: number): KlLedger {
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

const NO_TRADE = (aman: boolean): KlLedger => ({
  aksi: 'SKIP', mode: 'NO-TRADE', arah: 'NAIK', entry: null, stop: null, target: null, exit: null,
  targetHit: false, stopHit: false, hitCandle: 0, feeBuy: null, feeSell: null,
  grossPct: null, netPct: null, returnPct: null, berhasil: null,
  noTradeAman: aman, noTradeLabel: aman ? 'AMAN-HINDARI' : 'KELEWAT-PELUANG',
})

/** rencana jebakan utk menilai no-trade: seandainya ikut umpan (arah bait)
 *  dgn disiplin standar — apakah ia LIKUIDASI / rugi net? */
export function simBaitTrade(arah: KlArah, close60: number, horizon: Candle[], targetPct = 2.2, stopPct = 2.2): KlLedger {
  return coreTrade(arah, close60, stopPct, targetPct, horizon, KL_VISIBLE - 1)
}

/** simulasi eksekusi rencana otak atas 60 visible + 14 horizon.
 *  ENTRY -> masuk di close60 dgn stop & target yang dinyatakan.
 *  WAIT  -> masuk saat close menembus triggerLevel searah (maks 8
 *           candle horizon); stop & target dijangkar dari entry baru;
 *           tak terpenuhi = NO-TRADE.
 *  SKIP  -> NO-TRADE; dinilai jujur dari data. */
export function simKlTrade(plan: KlPlan, close60: number, horizon: Candle[], bait: KlArah): KlLedger {
  if (plan.aksi === 'SKIP') {
    const b = simBaitTrade(bait, close60, horizon)
    return NO_TRADE((b.netPct ?? 0) <= 0 || b.stopHit)
  }
  if (plan.aksi === 'ENTRY') return coreTrade(plan.arah, close60, plan.stopPct, plan.targetPct, horizon, KL_VISIBLE - 1)
  const lvl = plan.triggerLevel ?? close60
  const ok0 = plan.arah === 'NAIK' ? close60 >= lvl : close60 <= lvl
  if (ok0) return { ...coreTrade(plan.arah, close60, plan.stopPct, plan.targetPct, horizon, KL_VISIBLE - 1), mode: 'WAIT-HIT' }
  for (let i = 0; i < Math.min(8, horizon.length); i++) {
    const c = horizon[i].c
    const ok = plan.arah === 'NAIK' ? c >= lvl : c <= lvl
    if (ok) {
      const led = coreTrade(plan.arah, c, plan.stopPct, plan.targetPct, horizon.slice(i + 1), KL_VISIBLE + i)
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
// UJIAN
// ------------------------------------------------------------

export type KlPost = 'REVERSAL' | 'FAKE' | 'DOUBLE' | 'CASCADE' | 'PUMPW2' | 'ABSORB'

export interface KlExam {
  num: number
  fam: string
  label: string
  diff: string
  seed: string
  truth: KlArah // arah lanjutan DARI DATA
  bait: KlArah // jebakan = kebalikan truth
  post: KlPost
  aspek: AspekTruth5
  candles: Candle[] // KL_TOTAL
  entry: number // close candle ke-60
  exit: number // close candle ke-74
  extreme: number // ekstrem sapuan final (jangkar stop struktural)
  puncakPump: number // puncak pump (high tertinggi fase pump)
  lvlFbo: number // level false breakout (puncak struktural yang ditembus)
  pl: number // pool rantai (level stop hunt final)
  movePct: number
  mfePct: number
  baitMfePct: number
  noiseFlipped: boolean
}

export type { Candle }
export type { BtRng as KlRng, DiffCfg as KlCfg }
