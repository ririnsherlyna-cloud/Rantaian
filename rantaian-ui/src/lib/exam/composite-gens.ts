// ============================================================
// GENERATOR GAUNTLET GABUNGAN — 8 keluarga x mirror NAIK/TURUN.
// Setiap ujian membawa EMPAT aspek sekaligus:
//   1. BULL TRAP  — tembus atas -> dicabut (pool atas tertabung)
//   2. BEAR TRAP  — tembus bawah -> dipulihkan (pool bawah)
//   3. STOP HUNT  — sapuan final pool rantai (kaskade stop)
//   4. CANDLE MENIPU — fake engulf / doji / pin salah arah (5 buah)
//
// Tata letak candle (0-based, 60 visible):
//   A  0..27   base range (band dua sisi + tilt utk vacuum)
//   B  28..33  TRAP #1 (cermin sesuai arah)
//   C  34..36  regroup (doji menipu)
//   D  37..42  TRAP #2 — melahirkan POOL RANTAI (target sapuan)
//   E  43..45  regroup lemah
//   F  46..55  grind menekan ke pool rantai
//   G  56..59  STOP HUNT FINAL (anatomi presisi, vol klimaks)
//   HORIZON 14 — resolusi dari data
// ============================================================

import type { Candle } from './generator'
import {
  Pen, step, precise, volCalm,
  deceitEngulfMerah, deceitEngulfHijau, deceitDoji, deceitPinAtas, deceitPinBawah,
  type CgRng, type CgCfg, type AspekTruth, type DeceitKind,
} from './composite-forge'

export interface GauntOpts {
  dir: 'NAIK' | 'TURUN'
  post: 'REVERSAL' | 'FAKE' | 'VACUUM' | 'DOUBLE' | 'CASCADE'
  wide?: boolean // range lebar (bounce antar tepi >= 2.6 ATR)
  wickCluster?: boolean // klaster wick di tepi yang disapu
  round?: boolean // pool rantai di angka bulat (rescale)
  tilt?: number // kemiringan tren base (u/candle) utk vacuum
}

export interface GauntOut {
  pl: number // level pool rantai (btLow / btHigh)
  extreme: number // ekstrem sapuan final (jangkar stop struktural)
  aspek: AspekTruth
}

const A_N = 28
const B_N = 6
const C_N = 3
const D_N = 6
const E_N = 3
const GRIND_N = 8
const G_N = 4
const CG_U = 0.5

export function genGauntlet(pen: Pen, r: CgRng, u: number, cfg: CgCfg, opts: GauntOpts): GauntOut {
  const s = opts.dir === 'NAIK' ? 1 : -1
  const half = (opts.wide ? 1.9 : 1.3) * u
  const tiltAbs = Math.abs(opts.tilt ?? 0) * u // tilt = magnitudo; arah oleh s (anti mirror-ganda)
  const p0 = pen.p
  const deceit: { i: number; kind: DeceitKind }[] = []
  const half_ = half

  const mir = (dC: number, wu: number, wl: number, vol: number): void =>
    step(pen, r, u, s * dC, s === 1 ? wu : wl, s === 1 ? wl : wu, vol, cfg)
  const precM = (dCu: number, wu: number, wl: number, vol: number): void => {
    const o = pen.p
    precise(pen, o, o + s * dCu * u, s === 1 ? wu : wl, s === 1 ? wl : wu, vol)
  }
  const deceitUp = (): { engulf: (p: Pen, r: CgRng, u: number) => void; pin: (p: Pen, r: CgRng, u: number) => void } =>
    s === 1 ? { engulf: deceitEngulfMerah, pin: deceitPinAtas } : { engulf: deceitEngulfHijau, pin: deceitPinBawah }

  // ---------- FASE A: BASE RANGE ----------
  const dUp = deceitUp()
  for (let i = 0; i < A_N; i++) {
    const midI = p0 + s * tiltAbs * i
    const hiI = midI + half_
    const loI = midI - half_
    const slot = deceit.length < 3 && (i === 5 || i === 12 || i === 19)
    const wickSlot = opts.wickCluster && (i === 8 || i === 14 || i === 20)
    if (slot) {
      const kind: DeceitKind = i === 12 ? 'doji-purba' : i === 19 ? 'pin-salah-arah' : s === 1 ? 'fake-engulf-merah' : 'fake-engulf-hijau'
      if (kind === 'doji-purba') deceitDoji(pen, r, u)
      else if (kind === 'pin-salah-arah') dUp.pin(pen, r, u)
      else dUp.engulf(pen, r, u)
      deceit.push({ i: pen.candles.length - 1, kind })
      continue
    }
    if (wickSlot) {
      // paksa sentuhan tepi-yang-akan-disapu dgn ekor wick panjang (klaster wick)
      if (s === 1) {
        const dToLo = Math.max(-0.45 * u, Math.min(0.45 * u, loI + 0.12 * u - pen.p))
        step(pen, r, u, dToLo, 0.14, 0.58, 1.0, cfg)
      } else {
        const dToHi = Math.max(-0.45 * u, Math.min(0.45 * u, hiI - 0.12 * u - pen.p))
        step(pen, r, u, dToHi, 0.58, 0.14, 1.0, cfg)
      }
      continue
    }
    const pull = Math.max(-0.5, Math.min(0.5, (midI - pen.p) / u)) * 0.6 * u
    let dC = pull + r.normal() * 0.2 * u
    const nearTop = pen.p > hiI - 0.4 * u
    const nearBot = pen.p < loI + 0.4 * u
    if (nearTop) dC = -Math.abs(dC) - 0.1 * u
    if (nearBot) dC = Math.abs(dC) + 0.1 * u
    const wu = nearTop ? 0.5 : 0.16
    const wl = nearBot ? 0.5 : 0.16
    step(pen, r, u, dC, wu, wl, volCalm(r), cfg)
  }
  // ---------- FASE B: TRAP #1 (cermin) ----------
  const bDari = pen.candles.length
  // naik/piercing di atas band atas (UP) — dicermin utk TURUN
  mir(0.8, 0.16, 0.18, 1.5)
  mir(0.7, 0.15, 0.15, 1.7)
  precM(0.15, 0.18, 0.14, 0.55) // "breakout hold" volume KERING
  mir(-1.15, 0.2, 0.16, 1.85) // pencabutan
  mir(-0.45, 0.22, 0.18, 1.1)
  mir(-0.05, 0.2, 0.2, 0.9)
  const bKe = pen.candles.length - 1

  // ---------- FASE C: REGROUP ----------
  for (let i = 0; i < C_N; i++) {
    if (i === 1) {
      deceitDoji(pen, r, u)
      deceit.push({ i: pen.candles.length - 1, kind: 'doji-purba' })
    } else mir(0.12, 0.18, 0.18, 0.9)
  }

  // ---------- FASE D: TRAP #2 — PELAHIR POOL RANTAI ----------
  const dDari = pen.candles.length
  // UP: bear trap di bawah band (bull trap dicermin utk TURUN)
  mir(-0.8, 0.16, 0.2, 1.6)
  mir(-0.7, 0.16, 0.2, 1.75)
  const pierceIdxD = pen.candles.length
  mir(-0.9, 0.16, 0.3, 1.95) // tusukan
  precM(-0.05, 0.14, 0.2, 0.6) // bertahan di luar (umpan breakdown)
  mir(1.25, 0.14, 0.3, 1.95) // pemulihan — jebakan resmi
  mir(0.3, 0.16, 0.16, 1.0)
  const dKe = pen.candles.length - 1
  const dCandles = pen.candles.slice(dDari, dKe + 1)
  const pl = s === 1 ? Math.min(...dCandles.map((c) => c.l)) : Math.max(...dCandles.map((c) => c.h))

  // ---------- FASE E: REGROUP LEMAH ----------
  precM(0.2, 0.12, 0.14, 0.62)
  precM(0.15, 0.12, 0.12, 0.58)
  precM(0.1, 0.12, 0.12, 0.58)

  // ---------- FASE F: GRIND menekan ke pool ----------
  for (let i = 0; i < GRIND_N; i++) {
    if (i === 2) {
      dUp.pin(pen, r, u)
      deceit.push({ i: pen.candles.length - 1, kind: 'pin-salah-arah' })
    } else {
      step(pen, r, u, s * (-0.14 * u + r.normal() * 0.05 * u), 0.14, 0.16, 0.7 + r.next() * 0.25, cfg)
    }
  }
  // penyeteman agar jarak ke pool terkendali
  const need = pl + s * 0.9 * u - pen.p
  step(pen, r, u, need * 0.5, 0.14, 0.16, 0.85, cfg)
  step(pen, r, u, need * 0.5, 0.14, 0.16, 0.85, cfg)

  // ---------- FASE G: STOP HUNT FINAL (anatomi presisi) ----------
  const gDari = pen.candles.length
  const pierce = (0.55 + r.next() * 0.3) * u
  let extreme = pl
  if (opts.post === 'REVERSAL') {
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg) // pendekatan
    precM(-0.05, 0.14, 0.14, 1.0) // seteleman
    const o = pen.p
    const cTgt = pl + s * 1.3 * u // badan reclaim dominan — TERJANGKAR KE LEVEL POOL
    const extremeTgt = pl - s * pierce
    if (s === 1) precise(pen, o, cTgt, 0.12 * u, Math.max(0.05 * u, o - extremeTgt), 3.1)
    else precise(pen, o, cTgt, Math.max(0.05 * u, extremeTgt - o), 0.12 * u, 3.1)
    precM(0.3, 0.12, 0.14, 1.5) // tindak lanjut
  } else if (opts.post === 'FAKE') {
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg)
    precM(-0.05, 0.14, 0.14, 1.0)
    const o = pen.p
    const extremeTgt = pl - s * pierce
    // sapuan ditutup SECEKIL di sisi reclaim (terjangkar level) — lemah, tanpa kekuatan
    if (s === 1) precise(pen, o, pl + 0.1 * u, 0.1 * u, Math.max(0.05 * u, o - extremeTgt), 2.1)
    else precise(pen, o, pl - 0.1 * u, Math.max(0.05 * u, extremeTgt - o), 0.1 * u, 2.1)
    precM(-0.35, 0.1, 0.1, 0.58) // LH/HL mikro — reclaim gagal extend (umpan terakhir)
  } else if (opts.post === 'VACUUM') {
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg)
    precM(-0.05, 0.14, 0.14, 1.0)
    const o = pen.p
    const extremeTgt = pl - s * pierce
    // sapuan ditutup DI LUAR pool (terjangkar level — TANPA reclaim) lalu bertahan di luar
    if (s === 1) precise(pen, o, pl - 0.15 * u, 0.12 * u, Math.max(0.05 * u, o - extremeTgt), 2.6)
    else precise(pen, o, pl + 0.15 * u, Math.max(0.05 * u, extremeTgt - o), 0.12 * u, 2.6)
    precM(-0.05, 0.12, 0.12, 0.8) // bertahan di luar — TANPA reclaim
  } else if (opts.post === 'CASCADE') {
    // kaskade panik 3 lilin besar menembus pool (likuidasi berantai) + klimaks,
    // lalu reclaim V raksasa pada lilin terakhir — crossBack saat ini
    mir(-0.8, 0.12, 0.24, 2.5)
    mir(-0.85, 0.1, 0.22, 2.9)
    mir(-0.9, 0.1, 0.2, 3.3)
    const o = pen.p
    if (s === 1) precise(pen, o, pl + 0.7 * u, 0.12 * u, 0.25 * u, 3.5)
    else precise(pen, o, pl - 0.7 * u, 0.25 * u, 0.12 * u, 3.5)
  } else {
    // DOUBLE: sweep + pantulan rapuh (badan kering) — sapuan kedua lahir di horizon
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg)
    precM(-0.05, 0.14, 0.14, 1.0)
    const o = pen.p
    const extremeTgt = pl - s * pierce
    if (s === 1) precise(pen, o, pl + 0.6 * u, 0.35 * u, Math.max(0.05 * u, o - extremeTgt), 2.2)
    else precise(pen, o, pl - 0.6 * u, Math.max(0.05 * u, extremeTgt - o), 0.35 * u, 2.2)
    precM(0.3, 0.12, 0.12, 0.6) // pantulan kering naik pelan
  }
  const gKe = pen.candles.length - 1
  const gCandles = pen.candles.slice(gDari)
  extreme = s === 1 ? Math.min(...gCandles.map((c) => c.l)) : Math.max(...gCandles.map((c) => c.h))

  const bullTrap = s === 1 ? { dari: bDari, ke: bKe } : { dari: dDari, ke: dKe }
  const bearTrap = s === 1 ? { dari: dDari, ke: dKe } : { dari: bDari, ke: bKe }
  return { pl, extreme, aspek: { bullTrap, bearTrap, stopHunt: { dari: gDari, ke: gKe, poolLevel: pl }, deceit } }
}

// ------------------------------------------------------------
// HORIZON 14 candle per keluarga (resolusi dari data)
// ------------------------------------------------------------

function assertTotal(pen: Pen): void {
  if (pen.candles.length !== 74) throw new Error(`horizon: ${pen.candles.length} candle (harus 74)`)
}

/** REVERSAL: engulf searah + kaki kuat dengan dip kecil */
export function cgHorizonRev(pen: Pen, r: CgRng, u: number, cfg: CgCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  const o = pen.p
  if (s === 1) precise(pen, o, o + 0.6 * u, 0.1 * u, 0.14 * u, 2.9)
  else precise(pen, o, o - 0.6 * u, 0.14 * u, 0.1 * u, 2.9)
  const legs = [1.1, 0.95, -0.28, 0.95, 0.85, -0.22, 0.75, 0.65, 0.6, 0.55, -0.18, 0.5, 0.45]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.22 : 0.14, relief ? 0.16 : 0.2, relief ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

/** FAKE-RECLAIM: stall kering 2 lilin lalu engulF + kaki dump/rally lanjutan */
export function cgHorizonFake(pen: Pen, r: CgRng, u: number, cfg: CgCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1 // arah LANJUTAN (truth)
  const o = pen.p
  precise(pen, o, o + s * 0.15 * u, 0.1 * u, 0.1 * u, 0.62)
  precise(pen, pen.p, pen.p + s * -0.1 * u, 0.1 * u, 0.1 * u, 0.56)
  const o2 = pen.p
  if (s === 1) precise(pen, o2, o2 + s * 0.7 * u, 0.1 * u, 0.14 * u, 2.7)
  else precise(pen, o2, o2 + s * 0.7 * u, 0.14 * u, 0.1 * u, 2.7)
  const legs = [1.05, 0.9, -0.28, 0.9, 0.8, -0.22, 0.7, 0.6, 0.55, 0.5, 0.45]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.22 : 0.14, relief ? 0.16 : 0.2, relief ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

/** VACUUM: tahan 1 lilin lalu engulF + kaki kelanjutan tren */
export function cgHorizonVacuum(pen: Pen, r: CgRng, u: number, cfg: CgCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  const o = pen.p
  precise(pen, o, o - s * 0.05 * u, 0.12 * u, 0.12 * u, 0.8)
  const o2 = pen.p
  if (s === 1) precise(pen, o2, o2 + s * 0.7 * u, 0.1 * u, 0.14 * u, 2.8)
  else precise(pen, o2, o2 + s * 0.7 * u, 0.14 * u, 0.1 * u, 2.8)
  const legs = [1.0, 0.9, -0.25, 0.85, 0.75, -0.2, 0.65, 0.6, 0.5, 0.45, 0.4, 0.35]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.22 : 0.14, relief ? 0.16 : 0.2, relief ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

/** DOUBLE-SWEEP: sapuan kedua LEBIH DALAM dulu (menghukum entry dini),
 *  baru reclaim klimaks + kaki rally — menguji disiplin WAIT. */
export function cgHorizonDouble(pen: Pen, r: CgRng, u: number, cfg: CgCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  // sapuan kedua (2 lilin dump/burst melampaui ekstrem pertama)
  step(pen, r, u, s * -1.25 * u, 0.14, 0.3, 2.0, { ...cfg, noise: cfg.noise * 0.5 })
  step(pen, r, u, s * -1.5 * u, 0.12, 0.28, 2.7, { ...cfg, noise: cfg.noise * 0.5 })
  // reclaim klimaks
  const o = pen.p
  if (s === 1) precise(pen, o, o + 2.15 * u, 0.12 * u, 0.3 * u, 3.6)
  else precise(pen, o, o - 2.15 * u, 0.3 * u, 0.12 * u, 3.6)
  const legs = [1.25, 1.1, -0.28, 1.0, 0.9, -0.22, 0.75, 0.65, 0.55, 0.5, 0.45]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.22 : 0.14, relief ? 0.16 : 0.2, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

/** CASCADE: V-setelah-flush — kaki V panjang dari reclaim klimaks */
export function cgHorizonCascade(pen: Pen, r: CgRng, u: number, cfg: CgCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  const legs = [1.3, 1.15, -0.25, 1.0, 0.9, 0.8, -0.22, 0.7, 0.65, 0.55, 0.5, 0.45, 0.4, 0.35]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.24 : 0.14, relief ? 0.16 : 0.22, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

export type { Candle }
