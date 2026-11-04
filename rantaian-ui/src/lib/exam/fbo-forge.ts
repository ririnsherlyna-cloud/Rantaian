// ============================================================
// UJIAN FALSE BREAKOUT 100 — "100 ujian di mana harga MENEMBUS
// support/resistance lalu TEMBUSAN ITU GAGAL dan kembali ke
// dalam area sebelumnya".
//
// Pertanyaan inti Guru: apakah AGI salah mengidentifikasi false
// breakout, atau TERLALU CEPAT entry? Keputusan 3-pilih:
//   ENTRY  — bukti kegagalan breakout SUDAH terkonfirmasi
//            (close kembali ke dalam level / wick-reject / retest
//            gagal) dgn STOP WAJIB
//   WAIT   — breakout baru terjadi TAPI konfirmasi belum lengkap
//            -> menunggu trigger milik otak (close kembali ke
//            dalam level), maks 8 candle
//   SKIP   — tidak ada level layak / tidak ada event breakout
//
// Anatomi setiap ujian: LEVEL terbentuk (2+ sentuhan) -> BREAK
// menembus level -> (variasi keluarga) -> HORIZON 14 resolusi.
// Keluarga PENGHUKUM-ENTRY-DINI: tindak-lanjut singkat MELAMPAUI
// ekstrem keputusan — fade prematur = LIKUIDASI; hanya WAIT+
// trigger yang selamat. Keluarga GUARD: breakout SEJATI
// (acceptance + volume pengikut) — fade = likuidasi.
//
// Protokol anti-hindsight: 60 candle VISIBLE + 14 HORIZON; truth
// SELALU dari data (simulasi trade, tanpa label manusia); fee
// buy 0.1% + fee sell 0.1% — hasil akhir SELALU NET (profit
// kotor tidak pernah dipakai).
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, step, precise, volCalm,
  type BtRng, type DiffCfg,
} from './bulltrap-forge'

export const FBO_VISIBLE = 60
export const FBO_HORIZON = 14
export const FBO_TOTAL = FBO_VISIBLE + FBO_HORIZON
export const FBO_SIZE = 100
export const FBO_GUARD_SIZE = 24

/** fee taker kelas exchange: 0.1% beli + 0.1% jual (WAJIB dihitung) */
export const FEE_BUY = 0.001
export const FEE_SELL = 0.001

export type FboArah = 'NAIK' | 'TURUN'
export type FboSide = 'ATAS' | 'BAWAH' // ATAS = menembus resistance; BAWAH = menembus support

// ------------------------------------------------------------
// RENCANA & LEDGER — 3-pilih + STOP WAJIB (likuidasi nyata)
// ------------------------------------------------------------

export type FboAksi = 'ENTRY' | 'WAIT' | 'SKIP'

export interface FboPlan {
  aksi: FboAksi
  arah: FboArah
  targetPct: number
  stopPct: number // WAJIB — rencana tanpa stop tidak diterima pasar
  triggerLevel?: number // utk WAIT: level konfirmasi milik otak
}

export interface FboLedger {
  aksi: FboAksi
  mode: 'ENTRY' | 'WAIT-HIT' | 'NO-TRADE'
  arah: FboArah
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
  berhasil: boolean | null
}

interface SimOut { exit: number; stopHit: boolean; targetHit: boolean; hitCandle: number }

function walkWithStop(arah: FboArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[], baseIdx: number): SimOut {
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

function coreTrade(arah: FboArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[], baseIdx: number): FboLedger {
  const w = walkWithStop(arah, entry, stopPct, targetPct, horizon, baseIdx)
  const sign = arah === 'NAIK' ? 1 : -1
  const stop = entry * (1 - (sign * stopPct) / 100)
  const target = entry * (1 + (sign * targetPct) / 100)
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
    feeBuy, feeSell, grossPct, netPct, returnPct: netPct, berhasil: netPct > 0 && !w.stopHit,
  }
}

const NO_TRADE = (): FboLedger => ({
  aksi: 'SKIP', mode: 'NO-TRADE', arah: 'NAIK', entry: null, stop: null, target: null, exit: null,
  targetHit: false, stopHit: false, hitCandle: 0, feeBuy: null, feeSell: null,
  grossPct: null, netPct: null, returnPct: null, berhasil: null,
})

/** simulasi eksekusi rencana otak atas 60 visible + 14 horizon.
 *  ENTRY -> masuk di close60 dgn stop & target yang dinyatakan.
 *  WAIT  -> masuk saat CLOSE menembus triggerLevel searah rencana
 *           (maks 8 candle horizon); stop & target dijangkar dari
 *           entry baru; tak terpenuhi = NO-TRADE.
 *  SKIP  -> NO-TRADE. */
export function simFboTrade(plan: FboPlan, close60: number, horizon: Candle[]): FboLedger {
  if (plan.aksi === 'SKIP') return NO_TRADE()
  if (plan.aksi === 'ENTRY') return coreTrade(plan.arah, close60, plan.stopPct, plan.targetPct, horizon, FBO_VISIBLE - 1)
  const lvl = plan.triggerLevel ?? close60
  const ok0 = plan.arah === 'NAIK' ? close60 >= lvl : close60 <= lvl
  if (ok0) return { ...coreTrade(plan.arah, close60, plan.stopPct, plan.targetPct, horizon, FBO_VISIBLE - 1), mode: 'WAIT-HIT' }
  for (let i = 0; i < Math.min(8, horizon.length); i++) {
    const c = horizon[i].c
    const ok = plan.arah === 'NAIK' ? c >= lvl : c <= lvl
    if (ok) {
      const led = coreTrade(plan.arah, c, plan.stopPct, plan.targetPct, horizon.slice(i + 1), FBO_VISIBLE + i)
      return { ...led, mode: 'WAIT-HIT' }
    }
  }
  return NO_TRADE()
}

/** trade umpan (mengikuti arah breakout dari close60) — untuk
 *  gerbang profit & penilaian skip: apakah mengikuti break untung? */
export function simBaitFbo(breakArah: FboArah, close60: number, horizon: Candle[], targetPct = 2.2, stopPct = 2.2): FboLedger {
  return coreTrade(breakArah, close60, stopPct, targetPct, horizon, FBO_VISIBLE - 1)
}

export function totalFeePct(): number {
  return (FEE_BUY + FEE_SELL) * 100
}

// ------------------------------------------------------------
// META LEVEL — truth struktur yang dianalisis
// ------------------------------------------------------------

export interface LevelTruth {
  jenis: string // jenis level (range-high, equal-highs, round-number, ...)
  side: FboSide // sisi breakout
  level: number // harga level S/R
  extreme: number // ekstrem tembusan SAAT keputusan (jangkar stop struktural)
  pierceIdx: number // indeks candle tembus pertama
  lastPierceIdx: number // indeks candle menembus TERAKHIR (visible)
}

export interface FboExam {
  num: number
  fam: string
  label: string
  diff: string
  seed: string
  kind: 'FBO' | 'GUARD'
  truth: FboArah // arah PROFIT dari data (FBO: kebalikan breakout; GUARD: arah breakout)
  breakArah: FboArah // arah breakout (NAIK = menembus ke atas)
  level: LevelTruth
  candles: Candle[] // FBO_TOTAL
  entry: number // close candle ke-60
  exit: number // close candle ke-74
  movePct: number
  mfePct: number
  baitMfePct: number
  baitNetPct: number
  earlyFadeStopped: boolean // fade prematur dari close60 (stop struktural) = LIKUIDASI?
  noiseFlipped: boolean
}

export type { Candle }
export { Pen, step, precise, volCalm, makeRng }
export type { BtRng as FboRng, DiffCfg as FboCfg }
