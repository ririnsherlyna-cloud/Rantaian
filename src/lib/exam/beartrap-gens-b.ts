// ============================================================
// GENERATOR BEAR TRAP 7-12 — bear flag gagal, capitulation
// vacuum, spring Wyckoff, panic cascade, fake re-distribution,
// triple test dasar. 60 visible + 14 horizon (74).
// ============================================================

import {
  Pen, step, precise, volCalm, boundRange, upLegs, downLegs,
  reboundHorizon, SR_LEGS_REBOUND,
  type SrRng, type SrDiffCfg,
} from './beartrap-forge'
import type { BtRng } from './bulltrap-forge'

/** 7) Bear Flag yang Gagal — flag naik dengan volume HIJAU menguasai (akumulasi) */
export function genSrBearflagFail(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.14 * u, 0.18, 0.2, volCalm(r), cfg)
  const hi = pen.p + 0.5 * u
  boundRange(pen, r, u, cfg, hi - 1.2 * u, hi, 13, 0.8)
  downLegs(pen, r, u, cfg, 6, 0.62, 0.2, 1.2) // pole turun kuat
  // flag naik landai — lilin hijau dominan dengan volume meningkat (akumulasi)
  for (let i = 0; i < 14; i++) step(pen, r, u, (0.17 + 0.015 * i) * u, 0.14, 0.14, 1.05 + 0.04 * i, cfg)
  // lilin keputusan: breakout flag hijau badan penuh bervolume
  precise(pen, pen.p, pen.p + 0.85 * u, 0.1 * u, 0.1 * u, 1.7)
  reboundHorizon(pen, r, u, cfg, 0.55, SR_LEGS_REBOUND)
}

/** 8) Capitulation Vacuum — squeeze kapitulasi vertikal lalu stall volume padam */
export function genSrCapitulationVacuum(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 12; i++) step(pen, r, u, 0.12 * u, 0.16, 0.16, volCalm(r), cfg)
  upLegs(pen, r, u, cfg, 6, 0.3, 0.18, 0.9)
  downLegs(pen, r, u, cfg, 2, 0.5, 0.2, 1.15)
  // kapitulasi vertikal: melikuidasi buyer — impuls dump mom24
  for (let i = 0; i < 12; i++) step(pen, r, u, (-0.75 - 0.05 * i) * u, 0.08, 0.14, 1.9 + 0.08 * i, cfg)
  // stall di udara — volume padam PRESISI (kebal noise), badan menyusut, momen berbalik
  for (let i = 0; i < 4; i++) {
    const o = pen.p
    const c = o + r.normal() * 0.08 * u + 0.05 * u
    precise(pen, o, c, 0.12 * u, 0.16 * u, 0.32 - 0.03 * i)
  }
  reboundHorizon(pen, r, u, cfg, 0.7, SR_LEGS_REBOUND)
}

/** 9) SPRING — dorongan terakhir menusuk tepi bawah akumulasi, volume LEMAH */
export function genSrSpring(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 10; i++) step(pen, r, u, -0.18 * u, 0.18, 0.18, 0.95, cfg)
  const fl = pen.p
  // range akumulasi — TANPA wick penolakan dalam (agar sapuan spring jadi low terendah yang jelas)
  boundRange(pen, r, u, cfg, fl, fl + 3.8 * u, 40, 0.8)
  // pinning: kembali ke TENGAH range agar wick spring pasti menjadi low terendah
  for (let i = 0; i < 9; i++) {
    const dC = pen.p > fl + 2.0 * u ? -0.09 * u + r.normal() * 0.05 * u : 0.07 * u + r.normal() * 0.05 * u
    step(pen, r, u, dC, 0.14, 0.16, 0.8, cfg)
  }
  // lilin spring (candle keputusan): wick raksasa menusuk lantai (flat, kebal noise), volume LEMAH, tutup balik di dalam
  const o = pen.p
  precise(pen, o, o + 0.15 * u, 0.12 * u, 2.6 * u, 0.45)
  reboundHorizon(pen, r, u, cfg, 0.6, SR_LEGS_REBOUND)
}

/** 10) Vertical Panic Cascade — basis sunyi -> 15 lilin panik tanpa koreksi */
export function genSrGapPanic(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 44; i++) step(pen, r, u, 0.03 * u, 0.14, 0.14, volCalm(r), cfg)
  for (let i = 0; i < 15; i++) step(pen, r, u, (-0.55 - 0.05 * i) * u, 0.08, 0.16, 1.5 + 0.12 * i, cfg)
  // lilin keputusan: klimaks panik, wick bawah lebar (flat, kebal noise), tutup hijau kecil
  const o = pen.p
  precise(pen, o, o + 0.1 * u, 0.14 * u, 1.1 * u, 3.8)
  reboundHorizon(pen, r, u, cfg, 0.95, SR_LEGS_REBOUND)
}

/** 11) Fake Re-Distribution — range dasar, breakdown gagal berulang, hijau > merah */
export function genSrReaccFake(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  downLegs(pen, r, u, cfg, 5, 0.5, 0.22, 1.05)
  // range dasar lebar: 7x siklus breakdown-tipis -> reclaim-hijau (akumulasi tersembunyi)
  const base = pen.p
  for (let k = 0; k < 7; k++) {
    precise(pen, pen.p, pen.p - 0.55 * u, 0.1 * u, 0.1 * u, 0.45) // breakdown tipis merah lemah
    precise(pen, pen.p, pen.p + 0.62 * u, 0.1 * u, 0.1 * u, 0.78) // reclaim hijau lebih kuat
    for (let i = 0; i < 2; i++) step(pen, r, u, r.normal() * 0.14 * u + 0.04 * u, 0.14, 0.14, 0.75, cfg)
  }
  void base
  // drift naik kecil ke tepi dalam range
  for (let i = 0; i < 11; i++) step(pen, r, u, 0.05 * u + r.normal() * 0.08 * u, 0.13, 0.13, 0.7, cfg)
  // lilin keputusan: dorongan terakhir menembus tepi bawah TANPA keyakinan (volume lemah)
  precise(pen, pen.p, pen.p - 1.1 * u, 0.12 * u, 0.1 * u, 0.5)
  reboundHorizon(pen, r, u, cfg, 0.85, SR_LEGS_REBOUND)
}

/** 12) Triple Test Dasar — tiga tes support, volume & badan menyusut, RSI naik */
export function genSrTripleTest(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  downLegs(pen, r, u, cfg, 7, 0.5, 0.25, 1.05)
  const lo = pen.p
  for (let i = 0; i < 5; i++) step(pen, r, u, -0.1 * u, 0.14, 0.14, 0.8, cfg) // drift ke area lantai
  // tiga tes lantai dengan volume menyusut (1.15 -> 0.8 -> 0.5) & badan menyusut
  const vol = [1.15, 0.8, 0.5]
  for (let k = 0; k < 3; k++) {
    // approach turun ke lantai (badan menyusut antar-tes)
    for (let i = 0; i < 4; i++) step(pen, r, u, (-0.3 + 0.04 * k) * u, 0.1, 0.12, vol[k] + 0.15, cfg)
    // lilin tes: wick bawah menyentuh lantai (flat), tutup balik di atas; wick menyusut
    const o = pen.p
    precise(pen, o, o + (0.14 + 0.04 * k) * u, 0.1 * u, Math.max(0.25, 0.62 - 0.14 * k) * u, vol[k])
    // pantulan kecil (menyusut)
    for (let i = 0; i < 4; i++) step(pen, r, u, (0.3 - 0.03 * k) * u, 0.12, 0.12, 0.7, cfg)
  }
  void lo
  reboundHorizon(pen, r, u, cfg, 0.55, SR_LEGS_REBOUND)
}
