// ============================================================
// GUARD ANTI-BIAS — 3 arketipe breakout/pullback SEHAT (truth
// NAIK). Otak yang menjawab TURUN tanpa membaca anatomi akan
// gagal di sini. Membedakan jebakan dari momentum asli = bukti
// pemahaman sejati, bukan tebakan satu-arah.
// ============================================================

import { Pen, step, precise, volCalm, boundRange, upLegs, rallyHorizon, type BtRng, type DiffCfg } from './bulltrap-forge'

/** G1) Breakout Sehat — volume >= 1.5 sigma, retest TAHAN */
export function genGRealBreak(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 6; i++) step(pen, r, u, 0.12 * u, 0.18, 0.18, volCalm(r), cfg)
  const R = pen.p + 0.3 * u
  boundRange(pen, r, u, cfg, R - 4.6 * u, R, 42, 0.85, 'atas')
  // breakout 2 lilin PRESISI — volume KUAT deterministik (3.2-3.5x): pembeda tegas dari fakeout
  precise(pen, pen.p, pen.p + 0.9 * u, 0.1 * u, 0.1 * u, 3.2)
  precise(pen, pen.p, pen.p + 1.1 * u, 0.08 * u, 0.1 * u, 3.5)
  for (let i = 0; i < 4; i++) step(pen, r, u, 0.15 * u, 0.15, 0.15, 1.6, cfg)
  // retest: turun ke R, TAHAN di atasnya (low tak menembus)
  step(pen, r, u, -0.4 * u, 0.2, 0.3, 1.1, cfg)
  step(pen, r, u, -0.1 * u, 0.2, 0.35, 1.0, cfg)
  for (let i = 0; i < 4; i++) step(pen, r, u, 0.3 * u, 0.15, 0.12, 1.5, cfg)
  rallyHorizon(pen, r, u, cfg, 0.7, [0.5, 0.45, -0.2, 0.5, 0.4, 0.45, -0.15, 0.4, 0.35, 0.4, -0.1, 0.35, 0.3])
}

/** G2) Bull Flag Sehat — volume HIJAU tetap menguasai dalam flag */
export function genGHealthyFlag(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  for (let i = 0; i < 12; i++) step(pen, r, u, -0.18 * u, 0.18, 0.2, volCalm(r), cfg)
  const lo = pen.p - 0.5 * u
  boundRange(pen, r, u, cfg, lo, lo + 1.2 * u, 14, 0.8)
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.7 * u, 0.15, 0.12, 2.0, cfg) // pole
  // flag 14: drift landai TAPI volume hijau dominan (pembeda dari flag distribusi)
  for (let i = 0; i < 14; i++) {
    if (i % 3 === 2) step(pen, r, u, -0.35 * u, 0.25, 0.25, 0.85, cfg)
    else step(pen, r, u, 0.05 * u, 0.25, 0.2, 1.0, cfg)
  }
  step(pen, r, u, 0.85 * u, 0.1, 0.1, 2.1, cfg) // breakout flag
  step(pen, r, u, 0.55 * u, 0.12, 0.1, 1.8, cfg)
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.2 * u, 0.15, 0.15, 1.4, cfg)
  rallyHorizon(pen, r, u, cfg, 0.65, [0.45, 0.4, -0.15, 0.45, 0.4, 0.35, -0.1, 0.4, 0.35, 0.35, -0.1, 0.3, 0.3])
}

/** G3) Pullback Sehat dalam Uptrend — koreksi kering, pembalikan hijau.
 *  EXAM-v2: kaki naik & koreksi DISKALAKAN terhadap noise (0.7 + 0.3x noise utk
 *  dorongan, 1/noise utk koreksi) agar cerita "uptrend + koreksi sehat" tetap
 *  terbaca di GILA — ujian mengukur kemahiran, bukan keberuntungan. */
export function genGPullback(pen: Pen, r: BtRng, u: number, cfg: DiffCfg): void {
  const upScale = 0.7 + 0.3 * cfg.noise
  const dnScale = 1 / cfg.noise
  upLegs(pen, r, u, cfg, 11, 0.38 * upScale, 0.18 * dnScale, 1.0)
  for (let i = 0; i < 11; i++) step(pen, r, u, -0.22 * u * dnScale, 0.18, 0.25, 0.65, cfg) // koreksi volume kering
  for (let i = 0; i < 4; i++) step(pen, r, u, 0.05 * u, 0.2, 0.3, 0.7, cfg)
  // candle keputusan: pembalikan hijau badan penuh dengan wick bawah
  const o = pen.p
  precise(pen, o, o + 0.65 * u, 0.15 * u, 0.4 * u * cfg.subtle, 1.6)
  rallyHorizon(pen, r, u, cfg, 0.6, [0.5, 0.45, -0.15, 0.5, 0.45, 0.4, -0.1, 0.45, 0.4, 0.35, -0.1, 0.35, 0.3])
}
