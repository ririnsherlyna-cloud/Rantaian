// ============================================================
// GENERATOR BEAR TRAP 1-6 — classic fake breakdown, exhaustion,
// sweep low, double bottom, parabolic crash, correction dump.
// Semua menulis PERSIS 60 candle visible + 14 horizon (74).
// Momen keputusan selalu di DASAR BUKJUKAN (candle ke-60).
// ============================================================

import {
  Pen, step, precise, volCalm, boundRange, upLegs, downLegs,
  reboundHorizon, SR_LEGS_REBOUND,
  type SrRng, type SrDiffCfg,
} from './beartrap-forge'
import type { BtRng } from './bulltrap-forge'

/** 1) Classic Fake Breakdown — breakdown di bawah support dengan VOLUME LEMAH */
export function genSrClassic(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 12; i++) step(pen, r, u, -0.1 * u, 0.16, 0.16, volCalm(r), cfg)
  const base = pen.p
  boundRange(pen, r, u, cfg, base, base + 4.4 * u, 36, 0.85, 'bawah', 0.7)
  // pinning: turun ke area lantai agar breakdown PASTI menembus support
  for (let i = 0; i < 6; i++) {
    const dC = pen.p > base + 0.8 * u ? -0.3 * u + r.normal() * 0.06 * u : -0.05 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.15, 0.15, 0.8, cfg)
  }
  // breakdown 2 lilin PRESISI — volume LEMAH deterministik (0.34-0.38x): tell utama tak boleh terkubur noise
  precise(pen, pen.p, pen.p - 0.95 * u, 0.12 * u, 0.1 * u, 0.34)
  precise(pen, pen.p, pen.p - 1.15 * u, 0.1 * u, 0.12 * u, 0.38)
  // stall 4 lilin di bawah support — TANPA low baru berarti (tak ada follow-through),
  // SEMUA volume lemah PRESISI (kebal noise): tak ada penjual nyata di balik breakdown
  for (let i = 0; i < 4; i++) {
    const o = pen.p
    const c = o + r.normal() * 0.12 * u + 0.03 * u
    precise(pen, o, c, 0.16 * u, 0.2 * u, 0.42 - 0.02 * i)
  }
  reboundHorizon(pen, r, u, cfg, 1.05, SR_LEGS_REBOUND)
}

/** 2) Breakdown Kuat di Tren Tua — exhaustion (RSI ekstrem + jarak EMA) */
export function genSrTrendExhaust(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  downLegs(pen, r, u, cfg, 9, 0.42, 0.22, 1.0)
  for (let i = 0; i < 21; i++) step(pen, r, u, (-0.35 - 0.032 * i) * u, 0.1, 0.08, 1.4 + 0.08 * i, cfg)
  step(pen, r, u, -0.9 * u, 0.1, 0.12, 2.4, cfg)
  step(pen, r, u, -0.7 * u, 0.12, 0.1, 2.7, cfg)
  // lilin kelelahan: wick bawah dalam (flat, kebal noise) + tutup hijau kecil — penjual terakhir habis
  const o = pen.p
  precise(pen, o, o + 0.18 * u, 0.15 * u, 0.95 * u, 3.2)
  reboundHorizon(pen, r, u, cfg, 0.6, SR_LEGS_REBOUND)
}

/** 3) Stop Hunt Sweep di Bawah Low — wick menusuk, tutup kembali di atas */
export function genSrSweepLow(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 16; i++) step(pen, r, u, -0.28 * u, 0.2, 0.18, volCalm(r), cfg)
  let L = Infinity
  for (const c of pen.candles) L = Math.min(L, c.l)
  boundRange(pen, r, u, cfg, L + 0.5 * u, L + 3.4 * u, 28, 0.85, 'bawah', 0.7)
  // approach TERIKAT di atas low — jangan pernah menembus L sebelum sapuan
  for (let i = 0; i < 15; i++) {
    const cap = L + 0.45 * u
    const dC = pen.p < cap + 0.3 * u ? 0.06 * u + r.normal() * 0.08 * u : -0.12 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.15, 0.16, 0.9, cfg)
  }
  // lilin sapuan (candle keputusan): menusuk low, ditutup HIJAU di atasnya —
  // relatif thd harga kini agar anatomi kebal noise difficulty apa pun
  const o = pen.p
  const lowT = o - r.range(0.9, 1.4) * u
  const c = o + r.range(0.35, 0.6) * u
  precise(pen, o, c, 0.15 * u, Math.max(o, c) - lowT, 2.4)
  reboundHorizon(pen, r, u, cfg, 0.55, SR_LEGS_REBOUND)
}

/** 4) Double Bottom dengan Fake New Low — dump kedua menyusut + divBull */
export function genSrDoubleBottom(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  downLegs(pen, r, u, cfg, 6, 0.45, 0.25, 1.05)
  for (let i = 0; i < 12; i++) step(pen, r, u, 0.24 * u, 0.2, 0.2, 0.9, cfg)
  // dump kedua: badan menyusut, volume layu (divergensi)
  for (let i = 0; i < 14; i++) step(pen, r, u, (-0.42 + 0.028 * i) * u, 0.12, 0.12, 1.35 - 0.04 * i, cfg)
  // grind di dasar: wick bawah memanjang (terbatas) — lantai menahan
  for (let i = 0; i < 6; i++) {
    step(pen, r, u, r.normal() * 0.12 * u + 0.03 * u, 0.15, (0.3 + 0.03 * i) * cfg.subtle, 0.85, cfg)
  }
  for (let i = 0; i < 3; i++) {
    step(pen, r, u, r.normal() * 0.1 * u + 0.02 * u, 0.14, 0.2 * cfg.subtle, 0.75, cfg)
  }
  // lilin keputusan: sapuan dalam dasar palsu (flat, kebal noise), tutup hijau kecil
  const o = pen.p
  precise(pen, o, o + 0.18 * u, 0.1 * u, 1.15 * u, 0.9)
  reboundHorizon(pen, r, u, cfg, 0.7, SR_LEGS_REBOUND)
}

/** 5) Parabolic Capitulation Crash — klimaks volume raksasa + wick kapitulasi */
export function genSrParabolicCrash(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 42; i++) step(pen, r, u, -0.05 * u, 0.16, 0.16, volCalm(r), cfg)
  for (let i = 0; i < 16; i++) step(pen, r, u, (-0.2 - 0.09 * i) * u, 0.1, 0.08, 1.4 + 0.15 * i, cfg)
  step(pen, r, u, -1.2 * u, 0.15, 0.25, 3.6, cfg)
  const o = pen.p
  precise(pen, o, o + 0.1 * u, 0.15 * u, 1.35 * u, 4.6)
  reboundHorizon(pen, r, u, cfg, 0.9, SR_LEGS_REBOUND)
}

/** 6) Correction Dump dalam Uptrend — reversal palsu di zona demand */
export function genSrCorrRally(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  upLegs(pen, r, u, cfg, 8, 0.5, 0.22, 0.95) // uptrend besar HH/HL
  downLegs(pen, r, u, cfg, 4, 0.55, 0.2, 1.1) // dump tajam menembus HL minor
  for (let i = 0; i < 11; i++) step(pen, r, u, (-0.5 + 0.036 * i) * u, 0.12, 0.14, 1.5 - 0.045 * i, cfg)
  // lilin keputusan: merah kecil bervolume layu dengan wick bawah (flat) — dump kehabisan penjual di zona demand
  const o = pen.p
  precise(pen, o, o - 0.1 * u, 0.12 * u, 0.95 * u, 0.95)
  reboundHorizon(pen, r, u, cfg, 0.6, SR_LEGS_REBOUND)
}
