// ============================================================
// GENERATOR STOP HUNT B (9-16) — 4 mirror high-side (buy-side
// liquidity) + 4 CONTINUATION/KILLER (grab mengisi bahan bakar
// kelanjutan — pembunuh pembaca "sweep = reversal" yang naif).
// Semua menulis PERSIS 60 visible + 14 horizon.
// ============================================================

import {
  Pen, step, precise, boundRange, upLegs, downLegs, shDump, shStallThenDump, shStallThenRally, shFakeReclaimDump, rescalePoolTo,
  SH_LEGS_DN, SH_LEGS_CONT_DN, SH_LEGS_CONT_UP,
  type ShRng, type ShDiffCfg, type PoolTruth,
} from './stophunt-forge'
import type { BtRng } from './bulltrap-forge'

type Gen = (pen: Pen, r: ShRng, u: number, cfg: ShDiffCfg, pool: PoolTruth) => void

const LEGS_V_DN = [-1.15, -1.0, -0.9, 0.25, -0.85, -0.8, -0.7, -0.6, -0.5, 0.2, -0.55]

/** lilin sentuh high presisi: high TEPAT di H */
function touchHigh(pen: Pen, o: number, H: number, u: number, v = 0.9): void {
  const c = H - 0.18 * u
  precise(pen, o, c, H - Math.max(o, c), 0.1 * u, v)
}

/** lilin sapuan high presisi: menusuk H, tutup RECLAIM di bawahnya */
function sweepHighCandle(pen: Pen, r: BtRng, u: number, H: number, vol = 2.4): void {
  const o = pen.p
  const highT = Math.max(o, H) + r.range(0.6, 0.95) * u
  const c = o - r.range(0.3, 0.55) * u
  precise(pen, o, c, highT - Math.max(o, c), 0.12 * u, vol)
}

/** lilin sapuan high yang MENUTUP DI ATAS H (absorpsi — kontekst cont-up) */
function sweepHighAbsorb(pen: Pen, r: BtRng, u: number, H: number, vol = 2.4): void {
  const o = pen.p
  const c = o + r.range(0.35, 0.55) * u
  const highT = Math.max(o, H) + r.range(0.6, 0.95) * u
  precise(pen, o, c, highT - Math.max(o, c), 0.12 * u, vol)
}

function bounceUp(pen: Pen, dU: number, u: number, v = 1.1): void {
  const o = pen.p
  precise(pen, o, o + dU * u, 0.1 * u, 0.12 * u, v)
}
function bounceDn(pen: Pen, dU: number, u: number, v = 1.0): void {
  const o = pen.p
  // v2.9.2 FIX ANATOMI: bounce dari atap harus MENJAUH ke bawah (cermin bounceUp).
  // Versi lama menambah (+dU) sehingga harga justru melesat DI ATAS pool — sentuhan
  // ke-2/3 runtuh jadi lilin crash, label "equal-highs" tak cocok dgn chart.
  precise(pen, o, o - dU * u, 0.12 * u, 0.1 * u, v)
}

/** 9) Sweep Swing High — pivot tunggal */
export const genShSwingHigh: Gen = (pen, r, u, cfg, pool) => {
  upLegs(pen, r, u, cfg, 5, 0.5, 0.25, 1.0) // 20
  step(pen, r, u, 0.45 * u, 0.14, 0.12, 1.4, cfg) // 21
  step(pen, r, u, 0.3 * u, 0.1, 0.12, 1.2, cfg) // 22 -> puncak H
  let H = -Infinity
  for (const c of pen.candles) H = Math.max(H, c.h)
  downLegs(pen, r, u, cfg, 3, 0.55, 0.22, 0.95) // 12 -> 34 (pantulan jauh)
  for (let i = 0; i < 25; i++) { // 59
    const cap = H - 0.85 * u
    const dC = pen.p > cap - 0.45 * u ? -0.05 * u + r.normal() * 0.07 * u : 0.14 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.1, 0.1, 0.9, cfg)
  }
  sweepHighCandle(pen, r, u, H) // 60
  pool.jenis = 'swing-high'; pool.side = 'ATAS'; pool.level = rescalePoolTo(pen, H, 0.37); pool.sentuhan = 1; pool.sweepIdx = 59
  shDump(pen, r, u, cfg, 0.55, SH_LEGS_DN)
}

/** 10) Raid Equal Highs — 3 sentuhan atap sama */
export const genShEqualHighs: Gen = (pen, r, u, cfg, pool) => {
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.0) // 16
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.35 * u, 0.14, 0.14, 1.15, cfg) // 19
  const H = pen.p + 0.85 * u
  touchHigh(pen, pen.p, H, u) // 20
  bounceDn(pen, 0.75, u); step(pen, r, u, -0.42 * u, 0.14, 0.14, 1.15, cfg); bounceDn(pen, 0.42, u); step(pen, r, u, -0.2 * u, 0.14, 0.14, 0.95, cfg); bounceDn(pen, 0.25, u) // 25
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.3 * u, 0.14, 0.14, 0.95, cfg) // 28
  for (let i = 0; i < 2; i++) step(pen, r, u, 0.4 * u, 0.14, 0.14, 1.1, cfg) // 30
  touchHigh(pen, pen.p, H, u) // 31
  bounceDn(pen, 0.7, u); step(pen, r, u, -0.4 * u, 0.14, 0.14, 1.1, cfg); bounceDn(pen, 0.45, u); step(pen, r, u, -0.18 * u, 0.14, 0.14, 0.9, cfg); bounceDn(pen, 0.25, u) // 36
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.3 * u, 0.14, 0.14, 0.95, cfg) // 39
  for (let i = 0; i < 2; i++) step(pen, r, u, 0.38 * u, 0.14, 0.14, 1.05, cfg) // 41
  touchHigh(pen, pen.p, H, u) // 42
  bounceDn(pen, 0.6, u); step(pen, r, u, -0.35 * u, 0.14, 0.14, 1.0, cfg); bounceDn(pen, 0.4, u); step(pen, r, u, -0.16 * u, 0.14, 0.14, 0.9, cfg) // 46
  for (let i = 0; i < 13; i++) { // 59
    const cap = H - 0.5 * u
    const dC = pen.p > cap - 0.5 * u ? -0.05 * u + r.normal() * 0.07 * u : 0.16 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.16, 0.15, 0.9, cfg)
  }
  sweepHighCandle(pen, r, u, H) // 60
  pool.jenis = 'equal-highs'; pool.side = 'ATAS'; pool.level = rescalePoolTo(pen, H, 0.37); pool.sentuhan = 3; pool.sweepIdx = 59
  shDump(pen, r, u, cfg, 0.6, SH_LEGS_DN)
}

/** 11) Range High Grab — tepi atas range lebar */
export const genShRangeHigh: Gen = (pen, r, u, cfg, pool) => {
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.3 * u, 0.16, 0.16, 1.0, cfg) // 10
  const H = pen.p + 0.5 * u
  touchHigh(pen, pen.p, H, u, 1.2) // 11
  bounceDn(pen, 1.0, u, 1.3); for (let i = 0; i < 6; i++) step(pen, r, u, -0.42 * u, 0.15, 0.15, 1.25, cfg) // 18
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.5 * u, 0.16, 0.14, 1.05, cfg) // 26
  touchHigh(pen, pen.p, H, u, 1.2) // 27
  bounceDn(pen, 0.9, u, 1.25); for (let i = 0; i < 5; i++) step(pen, r, u, -0.4 * u, 0.15, 0.15, 1.2, cfg) // 33
  for (let i = 0; i < 25; i++) { // 58
    const cap = H - 0.85 * u
    const dC = pen.p > cap - 0.6 * u ? -0.04 * u + r.normal() * 0.07 * u : 0.3 * u + r.normal() * 0.07 * u
    step(pen, r, u, dC, 0.1, 0.1, 0.95, cfg)
  }
  step(pen, r, u, r.normal() * 0.06 * u, 0.15, 0.14, 0.9, cfg) // 59
  sweepHighCandle(pen, r, u, H) // 60
  pool.jenis = 'range-high'; pool.side = 'ATAS'; pool.level = rescalePoolTo(pen, H, 0.37); pool.sentuhan = 2; pool.sweepIdx = 59
  shDump(pen, r, u, cfg, 0.7, SH_LEGS_DN)
}

/** 12) Kaskade Short Squeeze — panic pump menembus high mayor, balik turun */
export const genShSqueezeHigh: Gen = (pen, r, u, cfg, pool) => {
  boundRange(pen, r, u, cfg, 98, 104, 30, 0.9, null, 0.6) // 30
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.3 * u, 0.16, 0.15, 1.1, cfg) // 40
  const M = pen.p + 0.4 * u // high mayor
  for (let i = 0; i < 6; i++) step(pen, r, u, r.normal() * 0.14 * u, 0.16, 0.14, 0.9, cfg) // 46
  for (let i = 0; i < 9; i++) step(pen, r, u, 0.85 * u, 0.1, 0.08, 3.1 + 0.12 * i, cfg) // 55: squeeze hijau besar
  for (let i = 0; i < 5; i++) { // 60: 5 hijau klimaks presisi
    const o = pen.p
    precise(pen, o, o + 0.88 * u, 0.12 * u, 0.08 * u, 3.6 + 0.1 * i)
  }
  pool.jenis = 'squeeze-high'; pool.side = 'ATAS'; pool.level = rescalePoolTo(pen, M, 0.37); pool.sentuhan = 1; pool.sweepIdx = 51
  step(pen, r, u, 0.7 * u, 0.08, 0.12, 2.6, { ...cfg, noise: cfg.noise * 0.4 }) // push (1)
  step(pen, r, u, 0.5 * u, 0.08, 0.12, 2.4, { ...cfg, noise: cfg.noise * 0.4 }) // push (2)
  shDump(pen, r, u, cfg, 0.9, LEGS_V_DN) // 1 + 11 = 12; total 14
}

/** 13) Grab Bahan Bakar Turun — equal lows disapu TANPA reclaim -> lanjut TURUN */
export const genShGrabContDn: Gen = (pen, r, u, cfg, pool) => {
  downLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.0) // 16
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.35 * u, 0.14, 0.14, 1.15, cfg) // 19
  const L = pen.p - 0.85 * u
  touchLow(pen, pen.p, L, u) // 20
  bounceUp(pen, 0.75, u); step(pen, r, u, 0.42 * u, 0.14, 0.14, 1.15, cfg); bounceUp(pen, 0.42, u); step(pen, r, u, 0.2 * u, 0.14, 0.14, 0.95, cfg); bounceUp(pen, 0.25, u) // 25
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.95, cfg) // 28
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.4 * u, 0.14, 0.14, 1.1, cfg) // 30
  touchLow(pen, pen.p, L, u) // 31
  bounceUp(pen, 0.7, u); step(pen, r, u, 0.4 * u, 0.14, 0.14, 1.1, cfg); bounceUp(pen, 0.45, u); step(pen, r, u, 0.18 * u, 0.14, 0.14, 0.9, cfg); bounceUp(pen, 0.25, u) // 36
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.95, cfg) // 39
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.38 * u, 0.14, 0.14, 1.05, cfg) // 41
  touchLow(pen, pen.p, L, u) // 42
  bounceUp(pen, 0.6, u); step(pen, r, u, 0.35 * u, 0.14, 0.14, 1.0, cfg); bounceUp(pen, 0.4, u); step(pen, r, u, 0.16 * u, 0.14, 0.14, 0.9, cfg) // 46
  for (let i = 0; i < 11; i++) { // 57
    const cap = L + 0.5 * u
    const dC = pen.p < cap + 0.5 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.16 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.15, 0.16, 0.9, cfg)
  }
  { // 58: sapuan TANPA reclaim — tutup DI BAWAH L (presisi)
    const o = pen.p
    const lowT = L - r.range(0.6, 0.9) * u
    const c = L - r.range(0.35, 0.5) * u
    precise(pen, o, c, 0.12 * u, Math.min(o, c) - lowT, 2.5)
  }
  { // 59-60: bounce LEMAH di bawah L (volume kering, presisi)
    for (let i = 0; i < 2; i++) {
      const o = pen.p
      precise(pen, o, o + 0.12 * u, 0.1 * u, 0.12 * u, 0.55)
    }
  }
  pool.jenis = 'equal-lows'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = 3; pool.sweepIdx = 57
  shStallThenDump(pen, r, u, cfg, [0.12, 0.08, 0.05], 1.15, SH_LEGS_CONT_DN) // 3+1+10 = 14
  // jaga: stall tak boleh reclaim L — dipastikan oleh desain (close60 = L-0.21u, stall <= +0.25u)
}

/** 14) Grab Bahan Bakar Naik — equal highs disapu, tutup di ATAS (absorpsi) -> lanjut NAIK */
export const genShGrabContUp: Gen = (pen, r, u, cfg, pool) => {
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.0) // 16
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.35 * u, 0.14, 0.14, 1.15, cfg) // 19
  const H = pen.p + 0.85 * u
  touchHigh(pen, pen.p, H, u) // 20
  bounceDn(pen, 0.75, u); step(pen, r, u, -0.42 * u, 0.14, 0.14, 1.15, cfg); bounceDn(pen, 0.42, u); step(pen, r, u, -0.2 * u, 0.14, 0.14, 0.95, cfg); bounceDn(pen, 0.25, u) // 25
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.3 * u, 0.14, 0.14, 0.95, cfg) // 28
  for (let i = 0; i < 2; i++) step(pen, r, u, 0.4 * u, 0.14, 0.14, 1.1, cfg) // 30
  touchHigh(pen, pen.p, H, u) // 31
  bounceDn(pen, 0.7, u); step(pen, r, u, -0.4 * u, 0.14, 0.14, 1.1, cfg); bounceDn(pen, 0.45, u); step(pen, r, u, -0.18 * u, 0.14, 0.14, 0.9, cfg); bounceDn(pen, 0.25, u) // 36
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.3 * u, 0.14, 0.14, 0.95, cfg) // 39
  for (let i = 0; i < 2; i++) step(pen, r, u, 0.38 * u, 0.14, 0.14, 1.05, cfg) // 41
  touchHigh(pen, pen.p, H, u) // 42
  bounceDn(pen, 0.6, u); step(pen, r, u, -0.35 * u, 0.14, 0.14, 1.0, cfg); bounceDn(pen, 0.4, u); step(pen, r, u, -0.16 * u, 0.14, 0.14, 0.9, cfg) // 46
  for (let i = 0; i < 11; i++) { // 57
    const cap = H - 0.5 * u
    const dC = pen.p > cap - 0.5 * u ? -0.05 * u + r.normal() * 0.07 * u : 0.16 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.16, 0.15, 0.9, cfg)
  }
  sweepHighAbsorb(pen, r, u, H) // 58: sapuan, tutup DI ATAS H (absorpsi likuiditas short)
  for (let i = 0; i < 2; i++) { // 59-60: fade LEMAH di atas H (presisi, volume kering)
    const o = pen.p
    precise(pen, o, o - 0.12 * u, 0.12 * u, 0.1 * u, 0.55)
  }
  pool.jenis = 'equal-highs'; pool.side = 'ATAS'; pool.level = rescalePoolTo(pen, H, 0.37); pool.sentuhan = 3; pool.sweepIdx = 57
  shStallThenRally(pen, r, u, cfg, [-0.12, -0.08, -0.05], 1.15, SH_LEGS_CONT_UP) // 3+1+10 = 14
}

/** 15) Reclaim Palsu lalu Lanjut TURUN — reclaim lemah terlihat, lalu gagal */
export const genShFakeReclaimDn: Gen = (pen, r, u, cfg, pool) => {
  downLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.0) // 16
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.35 * u, 0.14, 0.14, 1.15, cfg) // 19
  const L = pen.p - 0.85 * u
  touchLow(pen, pen.p, L, u) // 20
  bounceUp(pen, 0.75, u); step(pen, r, u, 0.42 * u, 0.14, 0.14, 1.15, cfg); bounceUp(pen, 0.42, u); step(pen, r, u, 0.2 * u, 0.14, 0.14, 0.95, cfg); bounceUp(pen, 0.25, u) // 25
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.95, cfg) // 28
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.4 * u, 0.14, 0.14, 1.1, cfg) // 30
  touchLow(pen, pen.p, L, u) // 31
  bounceUp(pen, 0.7, u); step(pen, r, u, 0.4 * u, 0.14, 0.14, 1.1, cfg); bounceUp(pen, 0.45, u); step(pen, r, u, 0.18 * u, 0.14, 0.14, 0.9, cfg); bounceUp(pen, 0.25, u) // 36
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.95, cfg) // 39
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.38 * u, 0.14, 0.14, 1.05, cfg) // 41
  touchLow(pen, pen.p, L, u) // 42
  bounceUp(pen, 0.6, u); step(pen, r, u, 0.35 * u, 0.14, 0.14, 1.0, cfg); bounceUp(pen, 0.4, u); step(pen, r, u, 0.16 * u, 0.14, 0.14, 0.9, cfg) // 46
  for (let i = 0; i < 10; i++) { // 56
    const cap = L + 0.5 * u
    const dC = pen.p < cap + 0.5 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.16 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.15, 0.16, 0.9, cfg)
  }
  { // 57: sapuan tutup di bawah L (presisi)
    const o = pen.p
    const lowT = L - r.range(0.6, 0.9) * u
    const c = L - r.range(0.35, 0.5) * u
    precise(pen, o, c, 0.12 * u, Math.min(o, c) - lowT, 2.5)
  }
  { // 58: RECLAIM PALSU — badan kecil, volume di bawah rata-rata, tutup nyaris di L (presisi)
    const o = L - r.range(0.3, 0.45) * u
    precise(pen, o, L + 0.2 * u, 0.08 * u, 0.1 * u, 0.58)
  }
  for (let i = 0; i < 2; i++) { // 59-60: stall lemah di atas L (volume padam)
    const o = pen.p
    precise(pen, o, o + 0.04 * u, 0.1 * u, 0.1 * u, 0.5)
  }
  pool.jenis = 'equal-lows'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, L, 0.37); pool.sentuhan = 3; pool.sweepIdx = 56
  shFakeReclaimDump(pen, r, u, cfg, 0.1, [0.04, 0.02], 1.15, SH_LEGS_CONT_DN) // 1+2+1+10 = 14
}

/** 16) Vakum di Bawah HL — uptrend, tutup di bawah HL tanpa reclaim -> lanjut NAIK */
export const genShVacuumHl: Gen = (pen, r, u, cfg, pool) => {
  upLegs(pen, r, u, cfg, 5, 0.55, 0.24, 1.0) // 20
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.5 * u, 0.15, 0.15, 1.3, cfg) // 28
  let HL = Infinity
  for (const c of pen.candles.slice(16, 21)) HL = Math.min(HL, c.l)
  for (let i = 0; i < 26; i++) { // 54
    const cap = HL + 0.55 * u
    const dC = pen.p < cap + 0.7 * u ? 0.05 * u + r.normal() * 0.07 * u : -0.32 * u + r.normal() * 0.07 * u
    step(pen, r, u, dC, 0.15, 0.16, 1.0, cfg)
  }
  { // 55: sapuan di bawah HL, TUTUP DI BAWAH (tanpa reclaim — presisi)
    const o = pen.p
    const lowT = HL - r.range(0.6, 0.9) * u
    const c = HL - r.range(0.25, 0.4) * u
    precise(pen, o, c, 0.1 * u, Math.min(o, c) - lowT, 2.2)
  }
  for (let i = 0; i < 5; i++) { // 60: bertahan tepat di bawah HL (tanpa kepanikan)
    const ceil = HL - 0.1 * u
    const dC = pen.p > ceil - 0.25 * u ? -0.05 * u + r.normal() * 0.05 * u : r.normal() * 0.08 * u
    step(pen, r, u, dC, 0.12, 0.14, 0.85, cfg)
  }
  pool.jenis = 'hl-structure'; pool.side = 'BAWAH'; pool.level = rescalePoolTo(pen, HL, 0.37); pool.sentuhan = 2; pool.sweepIdx = 54
  shStallThenRally(pen, r, u, cfg, [0.12, 0.08, 0.05], 1.0, SH_LEGS_CONT_UP) // 3+1+10 = 14
}

// helper dipinjam dari gens-a (anatomi low) agar mirror tetap presisi
function touchLow(pen: Pen, o: number, L: number, u: number, v = 0.9): void {
  const c = L + 0.18 * u
  precise(pen, o, c, 0.1 * u, Math.min(o, c) - L, v)
}
