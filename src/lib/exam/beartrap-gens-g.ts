// ============================================================
// GUARD ANTI-BIAS — 3 arketipe breakdown/flag/rally SEHAT
// (truth TURUN). Otak yang menjawab NAIK tanpa membaca anatomi
// akan gagal di sini. Membedakan jebakan dari momentum asli =
// bukti pemahaman sejati, bukan tebakan satu-arah.
// ============================================================

import {
  Pen, step, precise, volCalm, boundRange, upLegs, downLegs,
  dumpHorizon, SR_LEGS_DUMP,
  type SrDiffCfg,
} from './beartrap-forge'
import type { BtRng } from './bulltrap-forge'

/** G1) Breakdown Sehat — volume >= 1.5 sigma, retest GAGAL (tahan di bawah) */
export function genGRealBreakdown(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 6; i++) step(pen, r, u, -0.12 * u, 0.18, 0.18, volCalm(r), cfg)
  const S = pen.p - 0.3 * u
  boundRange(pen, r, u, cfg, S - 3.8 * u, S, 38, 0.85, 'bawah', 0.6)
  // pinning: naik ke area lantai-range agar breakdown PASTI menembus support
  for (let i = 0; i < 8; i++) {
    const dC = pen.p > S - 0.8 * u ? -0.25 * u + r.normal() * 0.06 * u : -0.04 * u + r.normal() * 0.06 * u
    step(pen, r, u, dC, 0.15, 0.15, 0.8, cfg)
  }
  // breakdown 2 lilin PRESISI — volume KUAT deterministik (3.2-3.5x): pembeda tegas dari fake breakdown
  precise(pen, pen.p, pen.p - 0.9 * u, 0.1 * u, 0.1 * u, 3.2)
  precise(pen, pen.p, pen.p - 1.1 * u, 0.08 * u, 0.1 * u, 3.5)
  for (let i = 0; i < 4; i++) step(pen, r, u, -0.15 * u, 0.15, 0.15, 1.6, cfg)
  // retest GAGAL: pantulan tipis TAPI tetap di bawah level (high tak menembus lantai range)
  step(pen, r, u, 0.35 * u, 0.2, 0.3, 1.1, cfg)
  // lilin keputusan: penolakan merah badan penuh di bawah level — breakdown lanjut
  const o = pen.p
  precise(pen, o, o - 0.35 * u, 0.1 * u, 0.12 * u, 1.25)
  dumpHorizon(pen, r, u, cfg, 0.7, SR_LEGS_DUMP)
}

/** G2) Bear Flag Sehat — volume MERAH tetap menguasai dalam flag */
export function genGHealthyBearflag(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  for (let i = 0; i < 12; i++) step(pen, r, u, 0.18 * u, 0.18, 0.2, volCalm(r), cfg)
  const hi = pen.p + 0.5 * u
  boundRange(pen, r, u, cfg, hi - 1.2 * u, hi, 14, 0.8)
  for (let i = 0; i < 10; i++) step(pen, r, u, -0.55 * u, 0.15, 0.12, 2.0, cfg) // pole turun kuat
  // flag 14: drift landai TAPI volume merah dominan (pembeda dari flag akumulasi)
  for (let i = 0; i < 14; i++) {
    if (i % 3 === 2) step(pen, r, u, 0.35 * u, 0.25, 0.25, 0.85, cfg)
    else step(pen, r, u, -0.05 * u, 0.2, 0.25, 1.0, cfg)
  }
  step(pen, r, u, -0.85 * u, 0.1, 0.1, 2.1, cfg) // breakdown flag
  step(pen, r, u, -0.55 * u, 0.12, 0.1, 1.8, cfg)
  for (let i = 0; i < 7; i++) step(pen, r, u, -0.18 * u, 0.15, 0.15, 1.4, cfg)
  // lilin keputusan: lanjutan merah badan penuh bervolume
  const o = pen.p
  precise(pen, o, o - 0.5 * u, 0.12 * u, 0.12 * u, 1.5)
  dumpHorizon(pen, r, u, cfg, 0.65, SR_LEGS_DUMP)
}

/** G3) Rally dalam Downtrend — rally kering ditolak di EMA jatuh.
 *  EXAM-v2: kaki turun & rally DISKALAKAN terhadap noise (0.7 + 0.3x noise utk
 *  impuls, 1/noise utk rally) agar cerita "downtrend + rally kering" tetap
 *  terbaca di GILA — ujian mengukur kemahiran, bukan keberuntungan. */
export function genGRallyDowntrend(pen: Pen, r: BtRng, u: number, cfg: SrDiffCfg): void {
  const dnScale = 0.7 + 0.3 * cfg.noise
  const upScale = Math.min(1 / cfg.noise, 1.25) // v2.1: amplifier rally DIBATASI — tanpa batas, rally MUDAH jadi terlalu kuat (mom50 positif)
  downLegs(pen, r, u, cfg, 10, 0.38 * dnScale, 0.18 * upScale, 1.0)
  upLegs(pen, r, u, cfg, 2, 0.32 * upScale, 0.18 * upScale, 0.7) // rally volume kering (2 kaki — v2.2: rally tak boleh menghapus downtrend)
  for (let i = 0; i < 11; i++) step(pen, r, u, (0.15 - 0.012 * i) * u * upScale, 0.12, 0.16, 0.65, cfg) // rally melemah menuju EMA jatuh (drift kering)
  // lilin keputusan: penolakan merah badan penuh di supply
  const o = pen.p
  precise(pen, o, o - 0.65 * u, 0.15 * u, 0.15 * u, 1.6)
  dumpHorizon(pen, r, u, cfg, 0.6, SR_LEGS_DUMP)
}
