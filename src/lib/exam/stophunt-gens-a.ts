// ============================================================
// GENERATOR STOP HUNT A (1-8) — pool di BAWAH (sell-side
// liquidity), pasca-grab REVERSAL ke ATAS. Semua menulis
// PERSIS 60 candle visible + 14 horizon (74). Lilin anatomi
// kunci (sentuhan, sapuan, bounce penentu jenis pool) memakai
// `precise` agar kebal noise difficulty.
// ============================================================

import {
  Pen, step, precise, boundRange, upLegs, downLegs, shRebound, shFlushThenV, rescalePoolTo,
  SH_LEGS_UP, SH_LEGS_V,
  type ShRng, type ShDiffCfg, type PoolTruth,
} from './stophunt-forge'
import type { BtRng } from './bulltrap-forge'

type Gen = (pen: Pen, r: ShRng, u: number, cfg: ShDiffCfg, pool: PoolTruth) => void

/** lilin sentuh presisi: low TEPAT di level L */
function touchLow(pen: Pen, o: number, L: number, u: number, v = 0.9): void {
  const c = L + 0.18 * u
  precise(pen, o, c, 0.1 * u, Math.min(o, c) - L, v)
}

/** lilin sapuan low presisi: menusuk L, tutup reclaim di atasnya */
function sweepLowCandle(pen: Pen, r: BtRng, u: number, L: number, vol = 2.4): void {
  const o = pen.p
  const lowT = Math.min(o, L) - r.range(0.6, 0.95) * u
  const c = o + r.range(0.3, 0.55) * u
  precise(pen, o, c, 0.12 * u, Math.max(o, c) - lowT, vol)
}

/** lilin bounce presisi (badan pasti, kebal noise) */
function bounceUp(pen: Pen, dU: number, u: number, v = 1.1): void {
  const o = pen.p
  precise(pen, o, o + dU * u, 0.1 * u, 0.12 * u, v)
}
function bounceDn(pen: Pen, dU: number, u: number, v = 1.0): void {
  const o = pen.p
  precise(pen, o, o + dU * u, 0.12 * u, 0.1 * u, v)
}

/** 1) Sweep Swing Low — pivot tunggal 1 sentuhan */
export const genShSwingLow: Gen = (pen, r, u, cfg, pool) => {
  downLegs(pen, r, u, cfg, 5, 0.5, 0.25, 1.0) // 20
  step(pen, r, u, -0.45 * u, 0.12, 0.14, 1.4, cfg) // 21
  step(pen, r, u, -0.3 * u, 0.12, 0.1, 1.2, cfg) // 22 -> dasar L
  let L = Infinity
  for (const c of pen.candles) L = Math.min(L, c.l)
  upLegs(pen, r, u, cfg, 3, 0.55, 0.22, 0.95) // 12 -> 34 (pantulan jauh: 1 sentuhan)
  for (let i = 0; i < 25; i++) { // 25 -> 59: pendekatan terikat di atas L (tidak pernah mendekat < 0.3 ATR)
    const cap = L + 0.85 * u
    const dC = pen.p < cap + 0.45 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.14 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.1, 0.1, 0.9, cfg)
  }
  sweepLowCandle(pen, r, u, L) // 60
  pool.jenis = 'swing-low'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = 1; pool.sweepIdx = 59
  shRebound(pen, r, u, cfg, 0.55, SH_LEGS_UP)
}

/** 2) Raid Equal Lows — 3 sentuhan level sama, bounce 1.6-2.2u */
export const genShEqualLows: Gen = (pen, r, u, cfg, pool) => {
  downLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.0) // 16
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.35 * u, 0.14, 0.14, 1.15, cfg) // 19
  const L = pen.p - 0.85 * u
  touchLow(pen, pen.p, L, u) // 20 (sentuh 1)
  bounceUp(pen, 0.75, u); step(pen, r, u, 0.42 * u, 0.14, 0.14, 1.15, cfg); bounceUp(pen, 0.42, u); step(pen, r, u, 0.2 * u, 0.14, 0.14, 0.95, cfg); bounceUp(pen, 0.25, u) // 25
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.95, cfg) // 28
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.4 * u, 0.14, 0.14, 1.1, cfg) // 30
  touchLow(pen, pen.p, L, u) // 31 (sentuh 2)
  bounceUp(pen, 0.7, u); step(pen, r, u, 0.4 * u, 0.14, 0.14, 1.1, cfg); bounceUp(pen, 0.45, u); step(pen, r, u, 0.18 * u, 0.14, 0.14, 0.9, cfg); bounceUp(pen, 0.25, u) // 36
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.95, cfg) // 39
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.38 * u, 0.14, 0.14, 1.05, cfg) // 41
  touchLow(pen, pen.p, L, u) // 42 (sentuh 3)
  bounceUp(pen, 0.6, u); step(pen, r, u, 0.35 * u, 0.14, 0.14, 1.0, cfg); bounceUp(pen, 0.4, u); step(pen, r, u, 0.16 * u, 0.14, 0.14, 0.9, cfg) // 46
  for (let i = 0; i < 13; i++) { // 59: pendekatan
    const cap = L + 0.5 * u
    const dC = pen.p < cap + 0.5 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.16 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.15, 0.16, 0.9, cfg)
  }
  sweepLowCandle(pen, r, u, L) // 60
  pool.jenis = 'equal-lows'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = 3; pool.sweepIdx = 59
  shRebound(pen, r, u, cfg, 0.6, SH_LEGS_UP)
}

/** 3) Sweep Session Low — grind sempit 5+ sentuhan lembut (bounce <= 0.9u) */
export const genShSessionLow: Gen = (pen, r, u, cfg, pool) => {
  for (let i = 0; i < 12; i++) step(pen, r, u, -0.18 * u, 0.16, 0.16, 0.9, cfg) // 12
  const L = pen.p - 0.55 * u
  touchLow(pen, pen.p, L, u, 1.0) // 13 (sentuh 1)
  let touches = 1
  for (let i = 0; i < 29; i++) { // 46: grind di atas L (29 langkah + 4 sentuhan = 33 candle)
    const pos = pen.p - L
    const dC = pos < 0.3 * u ? 0.12 * u + r.normal() * 0.05 * u : pos > 0.95 * u ? -0.14 * u + r.normal() * 0.05 * u : r.normal() * 0.09 * u
    step(pen, r, u, dC, 0.13, 0.15, 0.85, cfg)
    if (i % 6 === 5) { touchLow(pen, pen.p, L, u, 0.95); touches++ }
  }
  for (let i = 0; i < 13; i++) { // 59
    const cap = L + 0.42 * u
    const dC = pen.p < cap + 0.4 * u ? 0.05 * u + r.normal() * 0.06 * u : -0.12 * u + r.normal() * 0.05 * u
    step(pen, r, u, dC, 0.14, 0.15, 0.9, cfg)
  }
  sweepLowCandle(pen, r, u, L, 2.2) // 60
  pool.jenis = 'session-low'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = touches; pool.sweepIdx = 59
  shRebound(pen, r, u, cfg, 0.5, SH_LEGS_UP)
}

/** 4) Range Low Grab — tepi bawah range lebar, bounce >= 4.2u */
export const genShRangeLow: Gen = (pen, r, u, cfg, pool) => {
  for (let i = 0; i < 10; i++) step(pen, r, u, -0.3 * u, 0.16, 0.16, 1.0, cfg) // 10
  const L = pen.p - 0.5 * u
  touchLow(pen, pen.p, L, u, 1.2) // 11 (sentuh 1)
  bounceUp(pen, 1.0, u, 1.3); for (let i = 0; i < 6; i++) step(pen, r, u, 0.42 * u, 0.15, 0.15, 1.25, cfg) // 18 (puncak H)
  for (let i = 0; i < 8; i++) step(pen, r, u, -0.5 * u, 0.14, 0.16, 1.05, cfg) // 26
  touchLow(pen, pen.p, L, u, 1.2) // 27 (sentuh 2)
  bounceUp(pen, 0.9, u, 1.25); for (let i = 0; i < 5; i++) step(pen, r, u, 0.4 * u, 0.15, 0.15, 1.2, cfg) // 33
  for (let i = 0; i < 25; i++) { // 58: turun balik menuju lantai
    const cap = L + 0.85 * u
    const dC = pen.p < cap + 0.6 * u ? 0.04 * u + r.normal() * 0.07 * u : -0.3 * u + r.normal() * 0.07 * u
    step(pen, r, u, dC, 0.1, 0.1, 0.95, cfg)
  }
  step(pen, r, u, r.normal() * 0.06 * u, 0.14, 0.15, 0.9, cfg) // 59
  sweepLowCandle(pen, r, u, L) // 60
  pool.jenis = 'range-low'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = 2; pool.sweepIdx = 59
  shRebound(pen, r, u, cfg, 0.7, SH_LEGS_UP)
}

/** 5) Shakeout di Bawah HL — uptrend, sapuan di bawah HL lalu reclaim */
export const genShTrendlineHl: Gen = (pen, r, u, cfg, pool) => {
  upLegs(pen, r, u, cfg, 5, 0.55, 0.24, 1.0) // 20
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.5 * u, 0.15, 0.15, 1.3, cfg) // 28
  let HL = Infinity
  for (const c of pen.candles.slice(16, 21)) HL = Math.min(HL, c.l) // HL koreksi terakhir
  for (let i = 0; i < 26; i++) { // 54: koreksi turun terkendali berhenti di atas HL
    const cap = HL + 0.55 * u
    const dC = pen.p < cap + 0.7 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.32 * u + r.normal() * 0.07 * u
    step(pen, r, u, dC, 0.15, 0.16, 1.0, cfg)
  }
  { // 55: sapuan di bawah HL + tutup RECLAIM di atasnya (presisi)
    const o = pen.p
    const lowT = HL - r.range(0.6, 0.9) * u
    const c = HL + r.range(0.3, 0.5) * u
    precise(pen, o, c, 0.12 * u, Math.max(o, c) - lowT, 2.6)
  }
  for (let i = 0; i < 5; i++) { // 60: bertahan di atas HL
    const floor = HL + 0.25 * u
    const dC = pen.p < floor + 0.3 * u ? 0.14 * u + r.normal() * 0.05 * u : r.normal() * 0.1 * u
    step(pen, r, u, dC, 0.14, 0.16, 1.1, cfg)
  }
  pool.jenis = 'hl-structure'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, HL, 0.37); pool.sentuhan = 2; pool.sweepIdx = 54
  shRebound(pen, r, u, cfg, 0.5, SH_LEGS_UP)
}

/** 6) Stop Hunt Angka Bulat — pool TEPAT di integer (rescale) */
export const genShRoundNumber: Gen = (pen, r, u, cfg, pool) => {
  downLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.0) // 16
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.35 * u, 0.14, 0.14, 1.15, cfg) // 19
  const L0 = pen.p - 0.85 * u
  touchLow(pen, pen.p, L0, u) // 20
  bounceUp(pen, 0.75, u); step(pen, r, u, 0.42 * u, 0.14, 0.14, 1.15, cfg); bounceUp(pen, 0.42, u); step(pen, r, u, 0.2 * u, 0.14, 0.14, 0.95, cfg); bounceUp(pen, 0.25, u) // 25
  for (let i = 0; i < 4; i++) step(pen, r, u, -0.32 * u, 0.14, 0.14, 1.0, cfg) // 29
  touchLow(pen, pen.p, L0, u) // 30
  bounceUp(pen, 0.65, u); step(pen, r, u, 0.38 * u, 0.14, 0.14, 1.1, cfg); bounceUp(pen, 0.4, u); step(pen, r, u, 0.18 * u, 0.14, 0.14, 0.9, cfg) // 34
  for (let i = 0; i < 25; i++) { // 59
    const cap = L0 + 0.85 * u
    const dC = pen.p < cap + 0.5 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.15 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.1, 0.1, 0.9, cfg)
  }
  sweepLowCandle(pen, r, u, L0) // 60
  shRebound(pen, r, u, cfg, 0.55, SH_LEGS_UP)
  // RESCALE: pool TEPAT di angka bulat (integer) — semua candle ikut
  const R = Math.round(L0)
  const f = R / L0
  for (const c of pen.candles) { c.o *= f; c.h *= f; c.l *= f; c.c *= f }
  pool.jenis = 'round-number'; pool.side = 'BAWAH'; pool.level = R; pool.sentuhan = 2; pool.sweepIdx = 59
}

/** 7) Sweep Klaster Wick Lantai — 4 wick panjang level mirip */
export const genShWickCluster: Gen = (pen, r, u, cfg, pool) => {
  for (let i = 0; i < 8; i++) step(pen, r, u, -0.25 * u, 0.16, 0.16, 0.95, cfg) // 8
  bounceUp(pen, 0.6, u); for (let i = 0; i < 5; i++) step(pen, r, u, 0.28 * u, 0.15, 0.15, 1.1, cfg) // 14
  for (let i = 0; i < 8; i++) step(pen, r, u, -0.32 * u, 0.14, 0.16, 1.05, cfg) // 22
  const L = pen.p - 0.45 * u
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.15 * u, 0.14, 0.14, 0.9, cfg) // 30 (naik landai)
  for (let i = 0; i < 8; i++) step(pen, r, u, -0.3 * u, 0.14, 0.16, 1.0, cfg) // 38
  for (let i = 0; i < 4; i++) { // 45: klaster wick (wick, naik kecil, wick, ...)
    const o = L + (1.08 - i * 0.02) * u
    pen.add(o, o - 0.35 * u, 0.06 * u, Math.min(o, o - 0.35 * u) - L, 1.05) // wick ~0.7u >= 55% range, low TEPAT di L
    pen.add(pen.p, pen.p + 0.16 * u, 0.1 * u, 0.1 * u, 0.8)
  }
  bounceUp(pen, 0.55, u); step(pen, r, u, 0.3 * u, 0.14, 0.14, 1.0, cfg); bounceUp(pen, 0.4, u); step(pen, r, u, 0.15 * u, 0.14, 0.14, 0.9, cfg) // 49
  for (let i = 0; i < 9; i++) { // 58
    const cap = L + 0.85 * u
    const dC = pen.p < cap + 0.6 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.22 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.1, 0.1, 0.95, cfg)
  }
  sweepLowCandle(pen, r, u, L) // 59->60
  pool.jenis = 'wick-cluster'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = 4; pool.sweepIdx = 59
  shRebound(pen, r, u, cfg, 0.6, SH_LEGS_UP)
}

/** 8) Kaskade Likuidasi Mayor — panic dump menembus low mayor, V-balik */
export const genShCascadeV: Gen = (pen, r, u, cfg, pool) => {
  boundRange(pen, r, u, cfg, 96, 102, 30, 0.9, null, 0.6) // 30
  for (let i = 0; i < 10; i++) step(pen, r, u, -0.3 * u, 0.15, 0.16, 1.1, cfg) // 40
  const M = pen.p - 0.4 * u // low mayor
  for (let i = 0; i < 6; i++) step(pen, r, u, r.normal() * 0.14 * u, 0.14, 0.16, 0.9, cfg) // 46
  for (let i = 0; i < 9; i++) step(pen, r, u, -0.85 * u, 0.08, 0.1, 3.1 + 0.12 * i, cfg) // 55: panic merah besar
  { // 56-60: 5 merah klimaks presisi (badan besar tetap, kebal noise)
    for (let i = 0; i < 5; i++) {
      const o = pen.p
      precise(pen, o, o - 0.88 * u, 0.08 * u, 0.12 * u, 3.6 + 0.1 * i)
    }
  }
  pool.jenis = 'cascade-low'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, M, 0.37); pool.sentuhan = 1; pool.sweepIdx = 51
  shFlushThenV(pen, r, u, cfg, [-0.7, -0.5], 0.9, SH_LEGS_V) // 2+1+11 = 14
}
