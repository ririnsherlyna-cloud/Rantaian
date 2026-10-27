// ============================================================
// GENERATOR BULL TRAP 7-12 — flag gagal, squeeze vacuum, UTAD,
// gap chase, re-accumulation fake, triple test. 60 visible +
// 14 horizon persis. Momen keputusan = puncak bujukan.
// ============================================================

import { Pen, step, precise, volCalm, boundRange, upLegs, downLegs, collapseHorizon, type BtRng, type DiffCfg } from './bulltrap-forge'

/** 7) Bull Flag yang Gagal — flag buku-teks tapi volume MERAH menguasai */
export function genBtFlagFail(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 14; i++) step(pen, r, u, -0.22 * u, 0.18, 0.2, volCalm(r), cfg)
  const lo = pen.p - 0.3 * u
  boundRange(pen, r, u, cfg, lo, lo + 1.2 * u, 16, 0.8)
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.7 * u, 0.15, 0.12, 2.0, cfg) // pole
  // flag 20: drift turun landai, volume MERAH naik (distribusi), sesekali hijau kecil
  for (let i = 0; i < 19; i++) {
    if (i % 5 === 4) step(pen, r, u, 0.08 * u, 0.3, 0.25, 0.75, cfg)
    else step(pen, r, u, -0.15 * u, 0.3, 0.28, 1.2 + 0.02 * i, cfg)
  }
  const o = pen.p
  precise(pen, o, o - 0.15 * u, 0.4 * u * cfg.subtle, 0.3 * u, 1.5)
  collapseHorizon(pen, r, u, cfg, 0.75, [-0.65, -0.6, 0.2, -0.6, -0.55, -0.5, 0.15, -0.45, -0.4, -0.35, 0.1, -0.3, -0.25])
}

/** 8) Short Squeeze Vacuum — squeeze vertikal likuidasi short lalu stall di udara */
export function genBtSqueezeVacuum(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  downLegs(pen, r, u, cfg, 5, 0.55, 0.22, 1.1)
  step(pen, r, u, -0.2 * u, 0.18, 0.22, 1.2, cfg)
  step(pen, r, u, -0.2 * u, 0.18, 0.22, 1.2, cfg)
  const lo = pen.p - 0.2 * u
  boundRange(pen, r, u, cfg, lo, lo + 1.1 * u, 12, 0.8)
  // sapu low (likuidasi long lemah) — bahan bakar squeeze
  {
    const o = pen.p
    const lowT = lo - r.range(0.5, 0.9) * u
    const c = lo + 0.15 * u
    precise(pen, o, c, 0.1 * u, Math.min(o, c) - lowT, 2.0)
  }
  for (let i = 0; i < 14; i++) step(pen, r, u, 0.5 * u, 0.12, 0.12, 1.7 + 0.05 * i, cfg)
  for (let i = 0; i < 10; i++) {
    step(pen, r, u, r.normal() * 0.12 * u - 0.01 * u, 0.4 + 0.05 * i, 0.15, 1.3 - 0.08 * i, cfg)
  }
  const o = pen.p
  precise(pen, o, o - 0.12 * u, 0.85 * u * cfg.subtle, 0.1 * u, 0.55)
  collapseHorizon(pen, r, u, cfg, 0.7, [-0.7, -0.65, 0.2, -0.65, -0.6, -0.55, 0.15, -0.5, -0.45, -0.4, 0.1, -0.35, -0.3])
}

/** 9) UTAD — dorongan terakhir menusuk tepi atas range distribusi dengan volume LEMAH */
export function genBtUtad(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  upLegs(pen, r, u, cfg, 6, 0.38, 0.2, 1.0)
  const top = pen.p + 0.3 * u
  // range dengan wick penolakan PENDEK & tepi di bawah top — wick GILA tak boleh
  // menembus top sebelum UTAD (anatomi sweptHigh wajib utuh)
  boundRange(pen, r, u, cfg, top - 3.2 * u, top - 0.55 * u, 24, 0.85, 'atas', 0.3)
  // approach TERIKAT di bawah top — dilarang menembus sebelum UTAD
  for (let i = 0; i < 10; i++) {
    const cap = top - 0.6 * u
    const dC = pen.p > cap - 0.15 * u ? -0.05 * u + r.normal() * 0.07 * u : 0.1 * u + r.normal() * 0.05 * u
    step(pen, r, u, dC, 0.16, 0.14, 0.8, cfg)
  }
  // tarik-harga PRESISI ke bawah top (kebal noise) lalu UTAD:
  precise(pen, pen.p, top - 0.55 * u, 0.1 * u, 0.12 * u, 0.75)
  // UTAD (candle keputusan): wick menusuk top, tutup KEMBALI JAUH di dalam, volume 0.7x
  const o = top - 0.55 * u
  const highT = top + r.range(0.4, 0.7) * u
  const c = top - r.range(0.6, 0.8) * u
  precise(pen, o, c, highT - Math.max(o, c), 0.12 * u, 0.7)
  collapseHorizon(pen, r, u, cfg, 0.65, [-0.7, -0.65, 0.2, -0.7, -0.6, -0.55, 0.15, -0.55, -0.5, -0.4, 0.1, -0.35, -0.3])
}

/** 10) Vertical Chase — jarak ekstrem dari EMA, mean reversion menanti */
export function genBtGapChase(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 44; i++) step(pen, r, u, 0.03 * u, 0.14, 0.14, volCalm(r), cfg)
  for (let i = 0; i < 12; i++) step(pen, r, u, (0.8 + 0.15 * i) * u, 0.08, 0.08, 1.6 + 0.18 * i, cfg)
  step(pen, r, u, 1.2 * u, 0.12, 0.1, 3.4, cfg)
  step(pen, r, u, 0.9 * u, 0.2, 0.12, 3.7, cfg)
  step(pen, r, u, 0.5 * u, 0.6 * cfg.subtle, 0.15, 4.0, cfg)
  const o = pen.p
  precise(pen, o, o + 0.3 * u, 1.5 * u * cfg.subtle, 0.2 * u, 4.8)
  collapseHorizon(pen, r, u, cfg, 1.0, [-1.1, -1.0, 0.3, -1.05, -0.95, -0.9, 0.25, -0.85, -0.8, -0.7, 0.2, -0.65, -0.6])
}

/** 11) Fake Re-Accumulation — range puncak dengan volume merah menguasai */
export function genBtReaccFake(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  upLegs(pen, r, u, cfg, 5, 0.42, 0.22, 1.0)
  const top = pen.p + 0.2 * u
  const lo = top - 3.6 * u
  // 28: siklus rally-gagal: 3 naik lemah -> 1 penolakan wick bervolume merah -> 3 turun
  for (let i = 0; i < 28; i++) {
    const ph = i % 7
    if (ph < 3) {
      const nearTop = pen.p > top - 0.6 * u
      step(pen, r, u, nearTop ? -0.05 * u : 0.15 * u, 0.2, 0.2, 0.7, cfg)
    } else if (ph === 3) {
      const o = pen.p
      const c = o - 0.1 * u
      precise(pen, o, c, 1.0 * u * cfg.subtle, 0.12 * u, 1.3)
    } else {
      const nearBot = pen.p < lo + 0.4 * u
      step(pen, r, u, nearBot ? 0.12 * u : -0.2 * u, 0.2, 0.2, 1.0, cfg)
    }
  }
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.1 * u, 0.18, 0.16, 0.75, cfg)
  step(pen, r, u, 0.35 * u, 0.2, 0.15, 0.85, cfg)
  // candle keputusan: menembus tepi atas tanpa keyakinan, wick atas
  const o = pen.p
  precise(pen, o, o + 0.3 * u, 0.7 * u * cfg.subtle, 0.15 * u, 0.9)
  collapseHorizon(pen, r, u, cfg, 0.7, [-0.7, -0.65, 0.2, -0.65, -0.6, -0.5, 0.15, -0.5, -0.45, -0.4, 0.1, -0.35, -0.3])
}

/** 12) Triple Test Puncak — tiga tolakan dengan volume & badan menyusut */
export function genBtTripleTest(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  upLegs(pen, r, u, cfg, 4, 0.42, 0.22, 1.0)
  step(pen, r, u, 0.15 * u, 0.15, 0.15, 1.0, cfg)
  step(pen, r, u, 0.15 * u, 0.15, 0.15, 1.0, cfg)
  const L = pen.p + 0.2 * u
  // tes 1
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.25 * u, 0.15, 0.15, 1.2, cfg)
  {
    const o = pen.p
    precise(pen, o, o - 0.25 * u, Math.max(0.3, L + 0.35 * u - Math.max(o, o - 0.25 * u)), 0.12 * u, 1.8)
  }
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.3 * u, 0.2, 0.2, 1.0, cfg)
  for (let i = 0; i < 8; i++) step(pen, r, u, -0.22 * u, 0.2, 0.2, 0.95, cfg)
  // tes 2 — volume lebih kecil
  for (let i = 0; i < 3; i++) step(pen, r, u, 0.2 * u, 0.15, 0.15, 1.0, cfg)
  {
    const o = pen.p
    precise(pen, o, o - 0.35 * u, Math.max(0.3, L + 0.45 * u - Math.max(o, o - 0.35 * u)), 0.15 * u, 1.25)
  }
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.28 * u, 0.2, 0.2, 0.9, cfg)
  for (let i = 0; i < 8; i++) step(pen, r, u, -0.19 * u, 0.2, 0.2, 0.9, cfg)
  // tes 3 — grind TERIKAT di bawah level (tak boleh menembus sebelum tolakan)
  for (let i = 0; i < 12; i++) {
    const cap = L - 0.35 * u
    const dC = pen.p > cap - 0.15 * u ? -0.04 * u + r.normal() * 0.08 * u : 0.1 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.25, 0.2, 0.8, cfg)
  }
  step(pen, r, u, 0.08 * u, 0.25, 0.2, 0.85, cfg)
  {
    const o = Math.min(pen.p, L - 0.25 * u)
    precise(pen, o, o - 0.3 * u, Math.max(0.3, L + 0.25 * u - Math.max(o, o - 0.3 * u)), 0.12 * u, 0.9)
  }
  collapseHorizon(pen, r, u, cfg, 0.65, [-0.6, -0.55, 0.2, -0.6, -0.55, -0.5, 0.15, -0.45, -0.4, -0.35, 0.1, -0.3, -0.25])
}
