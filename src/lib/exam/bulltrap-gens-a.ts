// ============================================================
// GENERATOR BULL TRAP 1-6 — klasik fakeout, exhaustion, sweep,
// double top, parabolic, relief rally. Semua menulis PERSIS
// 60 candle visible + 14 horizon (74). Momen keputusan selalu
// di PUNCAK BUKJUKAN (candle ke-60).
// ============================================================

import { Pen, step, precise, volCalm, boundRange, upLegs, downLegs, collapseHorizon, type BtRng, type DiffCfg } from './bulltrap-forge'

/** 1) Classic Fakeout — breakout di atas resistance dengan VOLUME LEMAH */
export function genBtClassic(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 14; i++) step(pen, r, u, 0.12 * u, 0.18, 0.18, volCalm(r), cfg)
  const hi = pen.p + 0.3 * u
  boundRange(pen, r, u, cfg, hi - 4.6 * u, hi, 34, 0.85, 'atas')
  // breakout 2 lilin PRESISI — volume LEMAH deterministik (0.35-0.4x): tell utama tak boleh terkubur noise
  precise(pen, pen.p, pen.p + 0.9 * u, 0.1 * u, 0.1 * u, 0.35)
  precise(pen, pen.p, pen.p + 1.1 * u, 0.08 * u, 0.1 * u, 0.4)
  // push singkat lalu stall di udara — SEMUA volume lemah PRESISI (deterministik,
  // kebal noise): tak ada pembeli nyata di balik breakout; candle keputusan = stall terakhir
  precise(pen, pen.p, pen.p + 0.25 * u, 0.2 * u, 0.2 * u, 0.38)
  precise(pen, pen.p, pen.p + 0.1 * u, 0.25 * u, 0.25 * u, 0.36)
  for (let i = 0; i < 8; i++) {
    const o = pen.p
    const c = o + r.normal() * 0.12 * u + 0.02 * u
    precise(pen, o, c, (0.3 + 0.03 * i) * u * cfg.subtle, 0.2 * u, 0.42 - 0.02 * i)
  }
  collapseHorizon(pen, r, u, cfg, 1.15, [-0.85, -0.7, 0.3, -0.75, -0.65, -0.5, 0.25, -0.55, -0.45, -0.4, 0.2, -0.35, -0.3])
}

/** 2) Breakout Kuat di Tren Tua — exhaustion (RSI ekstrem + jarak EMA) */
export function genBtStrongExhaust(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  upLegs(pen, r, u, cfg, 9, 0.42, 0.22, 1.0)
  for (let i = 0; i < 16; i++) step(pen, r, u, (0.35 + 0.05 * i) * u, 0.1, 0.08, 1.4 + 0.12 * i, cfg)
  step(pen, r, u, 0.9 * u, 0.1, 0.08, 2.4, cfg)
  step(pen, r, u, 0.7 * u, 0.12, 0.1, 2.7, cfg)
  for (let i = 0; i < 6; i++) {
    step(pen, r, u, 0.03 * u + r.normal() * 0.08 * u, 0.5 + 0.08 * i, 0.15, 2.4 - 0.15 * i, cfg)
  }
  collapseHorizon(pen, r, u, cfg, 0.6, [-0.9, -0.85, 0.3, -0.85, -0.8, -0.7, 0.25, -0.7, -0.6, -0.55, 0.2, -0.5, -0.45])
}

/** 3) Stop Hunt Sweep di Atas High — wick menusuk, tutup kembali di bawah */
export function genBtSweepHigh(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 16; i++) step(pen, r, u, 0.28 * u, 0.2, 0.18, volCalm(r), cfg)
  let H = -Infinity
  for (const c of pen.candles) H = Math.max(H, c.h)
  boundRange(pen, r, u, cfg, H - 3.4 * u, H - 0.5 * u, 28, 0.85, 'atas')
  // approach TERIKAT di bawah high — jangan pernah menembus H sebelum sapuan
  for (let i = 0; i < 15; i++) {
    const cap = H - 0.45 * u
    const dC = pen.p > cap - 0.3 * u ? -0.06 * u + r.normal() * 0.08 * u : 0.12 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.16, 0.15, 0.9, cfg)
  }
  // lilin sapuan (candle keputusan): menusuk high, ditutup MERAH di bawahnya —
  // relatif thd harga kini agar anatomi kebal noise difficulty apa pun
  const o = pen.p
  const highT = o + r.range(0.9, 1.4) * u
  const c = o - r.range(0.35, 0.6) * u
  precise(pen, o, c, highT - Math.max(o, c), 0.15 * u, 2.4)
  collapseHorizon(pen, r, u, cfg, 0.55, [-0.7, -0.65, 0.25, -0.7, -0.6, -0.5, 0.2, -0.5, -0.45, -0.4, 0.15, -0.35, -0.3])
}

/** 4) Double Top dengan Fake New High — rally kedua menyusut + divBear */
export function genBtDoubleTop(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  upLegs(pen, r, u, cfg, 6, 0.45, 0.25, 1.05)
  for (let i = 0; i < 12; i++) step(pen, r, u, -0.24 * u, 0.2, 0.2, 0.9, cfg)
  // rally kedua: badan menyusut, volume layu (divergensi)
  for (let i = 0; i < 14; i++) step(pen, r, u, (0.42 - 0.028 * i) * u, 0.12, 0.12, 1.35 - 0.04 * i, cfg)
  for (let i = 0; i < 9; i++) {
    step(pen, r, u, r.normal() * 0.12 * u - 0.03 * u, 0.55 + 0.04 * i, 0.15, 0.85, cfg)
  }
  // candle keputusan: stall merah kecil dengan wick atas di puncak palsu
  const o = pen.p
  precise(pen, o, o - 0.18 * u, 0.85 * u * cfg.subtle, 0.1 * u, 0.9)
  collapseHorizon(pen, r, u, cfg, 0.7, [-0.8, -0.75, 0.25, -0.75, -0.7, -0.6, 0.2, -0.6, -0.55, -0.45, 0.15, -0.4, -0.35])
}

/** 5) Parabolic Blow-Off — klimaks volume raksasa + wick kelelahan */
export function genBtParabolic(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 42; i++) step(pen, r, u, 0.05 * u, 0.16, 0.16, volCalm(r), cfg)
  for (let i = 0; i < 16; i++) step(pen, r, u, (0.2 + 0.09 * i) * u, 0.1, 0.08, 1.4 + 0.15 * i, cfg)
  step(pen, r, u, 1.2 * u, 0.25, 0.15, 3.6, cfg)
  const o = pen.p
  precise(pen, o, o + 0.5 * u, 1.35 * u * cfg.subtle, 0.15 * u, 4.6)
  collapseHorizon(pen, r, u, cfg, 0.9, [-1.0, -0.9, 0.3, -0.95, -0.85, -0.8, 0.25, -0.8, -0.7, -0.65, 0.2, -0.6, -0.55])
}

/** 6) Relief Rally dalam Downtrend — reversal palsu di zona supply */
export function genBtReliefRally(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  upLegs(pen, r, u, cfg, 6, 0.32, 0.18, 0.95)
  downLegs(pen, r, u, cfg, 6, 0.5, 0.2, 1.1)
  for (let i = 0; i < 11; i++) step(pen, r, u, (0.55 - 0.03 * i) * u, 0.12, 0.14, 1.5 - 0.05 * i, cfg)
  // candle keputusan: lilin hijau kecil bervolume layu dengan wick atas — rally kehabisan napas di zona supply
  const o = pen.p
  precise(pen, o, o + 0.1 * u, 0.75 * u * cfg.subtle, 0.12 * u, 0.95)
  collapseHorizon(pen, r, u, cfg, 0.6, [-0.75, -0.7, 0.2, -0.75, -0.7, -0.6, 0.15, -0.6, -0.5, -0.5, 0.1, -0.45, -0.4])
}
