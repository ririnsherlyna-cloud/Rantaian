// ============================================================
// GENERATOR GAUNTLET KOMPLEKS 5 ASPEK — anatomi satu rangkaian:
//
//   A  0..11   BASE RANGE (band dua sisi) + 2 lilin menipu
//   B  12..16  BULL TRAP      — tembus band atas -> dicabut
//   C  17..18  regroup (doji menipu)
//   D  19..23  BEAR TRAP      — tembus band bawah -> pulih
//                             -> MELAHIRKAN POOL RANTAI (pl)
//   E  24..30  PUMP-1         — markup impuls, volume menaik
//   F  31..37  PUMP-2 + FALSE BREAKOUT — akselerasi vertikal,
//                             menembus puncak struktural (lvlFbo)
//                             lalu DICABUT dalam 2 lilin
//   G  38..44  DUMP           — markdown pasca-pump, tekanan jual
//                             -> stop-loss korban pump lahir
//   H  45..55  GRIND + lilin menipu + penyeteman ke pool rantai
//   I  56..59  STOP HUNT FINAL (sapuan pool rantai, vol klimaks)
//   HORIZON 14 — resolusi dari data (REVERSAL / CASCADE / FAKE /
//                DOUBLE / PUMPW2 / ABSORB)
//
// INTERAKSI 5 ASPEK: bull trap menabung likuiditas atas; bear
// trap melahirkan pool rantai bawah; pump menciptakan korban
// FOMO; false breakout menampung pembeli terakhir di puncak;
// dump mengubah mereka menjadi stop-loss cluster; stop hunt
// final memanen seluruh cluster di pool rantai.
// ============================================================

import type { Candle } from './generator'
import { Pen, step, precise, type BtRng } from './bulltrap-forge'
import {
  deceitEngulfMerah, deceitEngulfHijau, deceitDoji, deceitPinAtas, deceitPinBawah,
} from './composite-forge'
import {
  type KlRng, type KlCfg, type AspekTruth5, type KlDeceitKind,
} from './kompleks-forge'

export interface KlGenOpts {
  dir: 'NAIK' | 'TURUN' // arah gauntlet & pump (mirror penuh)
  post: 'REVERSAL' | 'FAKE' | 'DOUBLE' | 'CASCADE' | 'PUMPW2' | 'ABSORB'
  wide?: boolean // band lebar (bounce antar tepi >= 2.6 ATR)
  wickCluster?: boolean // klaster wick di tepi yang disapu
  round?: boolean // pool rantai di angka bulat (rescale di suite)
  deepDump?: boolean // dump lebih dalam (korban pump lebih banyak)
  pumpScale?: number // skala kaki pump (1.0 standar)
}

export interface KlGenOut {
  pl: number // level pool rantai (target sapuan)
  extreme: number // ekstrem sapuan final
  puncakPump: number // high tertinggi fase pump
  lvlFbo: number // level false breakout
  aspek: AspekTruth5
}

const A_N = 12
const B_N = 5
const C_N = 2
const D_N = 5
const E_N = 7
const F_N = 7
const G_N = 7
const H_N = 11 // 6 grind + 1 deceit + 2 setem(+2 ekstra setem)
const I_N = 4

export function genKompleks(pen: Pen, r: KlRng, u: number, cfg: KlCfg, opts: KlGenOpts): KlGenOut {
  const s = opts.dir === 'NAIK' ? 1 : -1
  const half = (opts.wide ? 1.9 : 1.3) * u
  const pScale = opts.pumpScale ?? 1.0
  const p0 = pen.p
  const deceit: { i: number; kind: KlDeceitKind }[] = []

  const mir = (dC: number, wu: number, wl: number, vol: number): void =>
    step(pen, r, u, s * dC, s === 1 ? wu : wl, s === 1 ? wl : wu, vol, cfg)
  const precM = (dCu: number, wu: number, wl: number, vol: number): void => {
    const o = pen.p
    precise(pen, o, o + s * dCu * u, s === 1 ? wu : wl, s === 1 ? wl : wu, vol)
  }
  const deceitUp = (): { engulf: (p: Pen, r: BtRng, u: number) => void; pin: (p: Pen, r: BtRng, u: number) => void } =>
    s === 1 ? { engulf: deceitEngulfMerah, pin: deceitPinAtas } : { engulf: deceitEngulfHijau, pin: deceitPinBawah }

  // ---------- FASE A: BASE RANGE ----------
  const dUp = deceitUp()
  for (let i = 0; i < A_N; i++) {
    const midI = p0
    const hiI = midI + half
    const loI = midI - half
    const slot = deceit.length < 2 && (i === 4 || i === 9)
    const wickSlot = opts.wickCluster && (i === 6 || i === 10)
    if (slot) {
      const kind: KlDeceitKind = i === 9 ? 'doji-purba' : s === 1 ? 'fake-engulf-merah' : 'fake-engulf-hijau'
      if (kind === 'doji-purba') deceitDoji(pen, r, u)
      else dUp.engulf(pen, r, u)
      deceit.push({ i: pen.candles.length - 1, kind })
      continue
    }
    if (wickSlot) {
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
    step(pen, r, u, dC, wu, wl, 0.75 + r.next() * 0.3, cfg)
  }

  // ---------- FASE B: BULL TRAP (tembus atas -> dicabut) ----------
  const bDari = pen.candles.length
  mir(0.85, 0.16, 0.18, 1.5)
  mir(0.7, 0.15, 0.15, 1.7)
  precM(0.18, 0.18, 0.14, 0.55) // "breakout hold" volume KERING
  mir(-1.15, 0.2, 0.16, 1.85) // pencabutan
  mir(-0.4, 0.22, 0.18, 1.1)
  const bKe = pen.candles.length - 1

  // ---------- FASE C: REGROUP ----------
  for (let i = 0; i < C_N; i++) {
    if (i === 0) {
      deceitDoji(pen, r, u)
      deceit.push({ i: pen.candles.length - 1, kind: 'doji-purba' })
    } else mir(0.12, 0.18, 0.18, 0.9)
  }

  // ---------- FASE D: BEAR TRAP — PELAHIR POOL RANTAI ----------
  const dDari = pen.candles.length
  mir(-0.8, 0.16, 0.2, 1.6)
  mir(-0.75, 0.16, 0.22, 1.75)
  mir(-0.9, 0.16, 0.3, 1.95) // tusukan di bawah band
  precM(-0.05, 0.14, 0.2, 0.6) // bertahan di luar (umpan breakdown)
  mir(1.25, 0.14, 0.3, 1.95) // pemulihan — jebakan resmi
  const dKe = pen.candles.length - 1
  const dCandles = pen.candles.slice(dDari, dKe + 1)
  const pl = s === 1 ? Math.min(...dCandles.map((c) => c.l)) : Math.max(...dCandles.map((c) => c.h))

  // ---------- FASE E: PUMP-1 (markup impuls, volume menaik) ----------
  const eDari = pen.candles.length
  const eLegs = [1.1, 0.95, 0.85, -0.35, 1.0, 0.9, -0.3]
  for (let i = 0; i < E_N; i++) {
    const d = eLegs[i] * pScale
    const up = d > 0
    step(pen, r, u, s * d * u, up ? 0.12 : 0.2, up ? 0.2 : 0.12, up ? 1.35 + i * 0.16 : 0.85, { ...cfg, noise: cfg.noise * 0.5 })
  }
  const eKe = pen.candles.length - 1

  // ---------- FASE F: PUMP-2 + FALSE BREAKOUT (7 candle) ----------
  //   akselerasi 3 candle -> stall -> TEMBUS puncak struktural
  //   -> PENCABUTAN -> konfirmasi jatuh (LH mikro)
  const fDari = pen.candles.length
  const preF = pen.candles.slice(0, fDari)
  // level false breakout: puncak struktural (NAIK) / dasar struktural (TURUN-cermin)
  const lvlFbo = s === 1 ? Math.max(...preF.map((c) => c.h)) : Math.min(...preF.map((c) => c.l))
  const fLegs = [0.85, 0.8, 0.75] // akselerasi vertikal (price acceleration)
  for (let i = 0; i < 3; i++) {
    step(pen, r, u, s * fLegs[i] * pScale * u, 0.1, 0.16, 2.1 + i * 0.25, { ...cfg, noise: cfg.noise * 0.4 })
  }
  precM(0.08, 0.16, 0.12, 1.2) // stall di udara — napas sebelum tembus
  // LILIN TEMBUS puncak struktural (breakout pump — vol klimaks)
  const oT = pen.p
  const cTgt = lvlFbo + s * 0.22 * u
  if (s === 1) precise(pen, oT, cTgt, 0.3 * u, 0.1 * u, 2.9)
  else precise(pen, oT, cTgt, 0.1 * u, 0.3 * u, 2.9)
  const idxTembus = pen.candles.length - 1
  // LILIN PENCABUTAN — false breakout resmi (tutup kembali di bawah/atas lvlFbo)
  const oC = pen.p
  const cCabut = lvlFbo - s * 0.42 * u
  if (s === 1) precise(pen, oC, cCabut, 0.14 * u, 0.2 * u, 2.5)
  else precise(pen, oC, cCabut, 0.2 * u, 0.14 * u, 2.5)
  precM(-0.28, 0.12, 0.14, 0.72) // konfirmasi jatuh — LH mikro
  const fKe = pen.candles.length - 1
  const puncakPump = s === 1
    ? Math.max(...pen.candles.slice(fDari, fKe + 1).map((c) => c.h))
    : Math.min(...pen.candles.slice(fDari, fKe + 1).map((c) => c.l))

  // ---------- FASE G: DUMP (markdown, tekanan jual pasca-pump) ----------
  const gDari = pen.candles.length
  const gBase = opts.deepDump ? [-1.05, -0.95, 0.22, -1.1, -1.0, -0.85, -0.7] : [-0.85, -0.75, 0.22, -0.9, -0.8, -0.65, -0.55]
  for (let i = 0; i < G_N; i++) {
    const d = gBase[i]
    const relief = d > 0
    step(pen, r, u, s * d * u, relief ? 0.18 : 0.12, relief ? 0.12 : 0.18, relief ? 0.9 : 1.7 + i * 0.06, { ...cfg, noise: cfg.noise * 0.45 })
  }
  const gKe = pen.candles.length - 1

  // ---------- FASE H: GRIND + SETEM ke pool rantai ----------
  for (let i = 0; i < 8; i++) {
    if (i === 2) {
      dUp.pin(pen, r, u)
      deceit.push({ i: pen.candles.length - 1, kind: 'pin-salah-arah' })
    } else {
      step(pen, r, u, s * (-0.15 * u + r.normal() * 0.05 * u), 0.14, 0.16, 0.7 + r.next() * 0.25, cfg)
    }
  }
  // setem deterministik 3 candle: bagi sisa jarak ke pool (pl + 0.9u)
  const need = pl + s * 0.9 * u - pen.p
  for (const frac of [0.5, 0.3, 0.2]) {
    step(pen, r, u, need * frac, 0.14, 0.16, 0.85 + Math.min(0.8, (Math.abs(need) / u) * 0.25), cfg)
  }

  // ---------- FASE I: STOP HUNT FINAL ----------
  const iDari = pen.candles.length
  const pierce = (0.55 + r.next() * 0.3) * u
  let extreme = pl
  if (opts.post === 'REVERSAL' || opts.post === 'PUMPW2') {
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg) // pendekatan
    precM(-0.05, 0.14, 0.14, 1.0) // seteleman
    const o = pen.p
    const cTgt2 = pl + s * 1.3 * u // badan reclaim dominan — terjangkar level pool
    const extremeTgt = pl - s * pierce
    if (s === 1) precise(pen, o, cTgt2, 0.12 * u, Math.max(0.05 * u, o - extremeTgt), 3.1)
    else precise(pen, o, cTgt2, Math.max(0.05 * u, extremeTgt - o), 0.12 * u, 3.1)
    precM(0.3, 0.12, 0.14, 1.5) // tindak lanjut
  } else if (opts.post === 'FAKE' || opts.post === 'ABSORB') {
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg)
    precM(-0.05, 0.14, 0.14, 1.0)
    const o = pen.p
    const extremeTgt = pl - s * pierce
    // sapuan ditutup SECEKIL di sisi reclaim — lemah, tanpa kekuatan
    if (s === 1) precise(pen, o, pl + 0.1 * u, 0.1 * u, Math.max(0.05 * u, o - extremeTgt), 2.1)
    else precise(pen, o, pl - 0.1 * u, Math.max(0.05 * u, extremeTgt - o), 0.1 * u, 2.1)
    precM(-0.3, 0.1, 0.1, 0.58) // LH/HL mikro — reclaim gagal extend (umpan terakhir)
  } else if (opts.post === 'CASCADE') {
    mir(-0.8, 0.12, 0.24, 2.5)
    mir(-0.85, 0.1, 0.22, 2.9)
    mir(-0.9, 0.1, 0.2, 3.3)
    const o = pen.p
    if (s === 1) precise(pen, o, pl + 0.7 * u, 0.12 * u, 0.25 * u, 3.5)
    else precise(pen, o, pl - 0.7 * u, 0.25 * u, 0.12 * u, 3.5)
  } else {
    // DOUBLE: sweep + pantulan rapuh — sapuan kedua lahir di horizon
    step(pen, r, u, s * (-0.55 * u), 0.18, 0.22, 1.3, cfg)
    precM(-0.05, 0.14, 0.14, 1.0)
    const o = pen.p
    const extremeTgt = pl - s * pierce
    if (s === 1) precise(pen, o, pl + 0.6 * u, 0.35 * u, Math.max(0.05 * u, o - extremeTgt), 2.2)
    else precise(pen, o, pl - 0.6 * u, Math.max(0.05 * u, extremeTgt - o), 0.35 * u, 2.2)
    precM(0.3, 0.12, 0.12, 0.6) // pantulan kering naik pelan
  }
  const iKe = pen.candles.length - 1
  const iCandles = pen.candles.slice(iDari)
  extreme = s === 1 ? Math.min(...iCandles.map((c) => c.l)) : Math.max(...iCandles.map((c) => c.h))

  const n = pen.candles.length
  if (n !== 60) throw new Error(`genKompleks: ${n} candle (harus 60)`)

  const bullTrap = { dari: bDari, ke: bKe }
  const bearTrap = { dari: dDari, ke: dKe }
  return {
    pl,
    extreme,
    puncakPump,
    lvlFbo,
    aspek: {
      bullTrap,
      bearTrap,
      pump: { dari: eDari, ke: fKe, puncak: puncakPump },
      dump: { dari: gDari, ke: gKe },
      falseBreakout: { dari: idxTembus, ke: fKe, level: lvlFbo },
      stopHunt: { dari: iDari, ke: iKe, poolLevel: pl },
      deceit,
    },
  }
}

// ------------------------------------------------------------
// HORIZON 14 candle per post (resolusi dari data)
// ------------------------------------------------------------

function assertTotal(pen: Pen): void {
  if (pen.candles.length !== 74) throw new Error(`horizon: ${pen.candles.length} candle (harus 74)`)
}

/** REVERSAL: engulf searah + kaki kuat dgn dip kecil (truth = dir gauntlet) */
export function klHorizonRev(pen: Pen, r: KlRng, u: number, cfg: KlCfg, dir: 'NAIK' | 'TURUN'): void {
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

/** CASCADE: kaskade panik kecil dulu (masih di fase I) lalu V raksasa */
export function klHorizonCascade(pen: Pen, r: KlRng, u: number, cfg: KlCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  const legs = [1.3, 1.15, -0.25, 1.0, 0.9, 0.8, -0.22, 0.7, 0.65, 0.55, 0.5, 0.45, 0.4, 0.35]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.24 : 0.14, relief ? 0.16 : 0.22, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

/** FAKE: stall kering 2 lilin lalu engulF + kaki lanjutan (truth = arah lanjutan) */
export function klHorizonFake(pen: Pen, r: KlRng, u: number, cfg: KlCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
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

/** DOUBLE-SWEEP: sapuan kedua LEBIH DALAM dulu (menghukum entry dini),
 *  baru reclaim klimaks + kaki rally — menguji disiplin WAIT. */
export function klHorizonDouble(pen: Pen, r: KlRng, u: number, cfg: KlCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  step(pen, r, u, s * -1.25 * u, 0.14, 0.3, 2.0, { ...cfg, noise: cfg.noise * 0.5 })
  step(pen, r, u, s * -1.5 * u, 0.12, 0.28, 2.7, { ...cfg, noise: cfg.noise * 0.5 })
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

/** PUMPW2: gelombang kedua pump pasca-sweep — engulf hijau bervolume
 *  + kaki W2 panjang (truth = arah gauntlet/pump lanjut) */
export function klHorizonPumpw2(pen: Pen, r: KlRng, u: number, cfg: KlCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  const o = pen.p
  if (s === 1) precise(pen, o, o + 0.7 * u, 0.1 * u, 0.14 * u, 3.0)
  else precise(pen, o, o - 0.7 * u, 0.14 * u, 0.1 * u, 3.0)
  const legs = [1.1, 1.0, 0.9, -0.25, 0.85, 0.8, 0.7, 0.6, 0.55, -0.2, 0.65, 0.6, 0.5]
  for (const d of legs) {
    const dip = s * d < 0
    step(pen, r, u, s * d * u, dip ? 0.24 : 0.13, dip ? 0.18 : 0.2, dip ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen)
}

/** ABSORB: bounce kering ke arah KEBALIKAN truth (menggoda pembeli bait
 *  ke zona absorpsi di bawah/di atas puncak) lalu engulF besar searah truth
 *  + kaki markdown/rally dalam (truth = arah lanjutan sejati) */
export function klHorizonAbsorb(pen: Pen, r: KlRng, u: number, cfg: KlCfg, dir: 'NAIK' | 'TURUN'): void {
  const s = dir === 'NAIK' ? 1 : -1
  const o = pen.p
  precise(pen, o, o - s * 0.22 * u, 0.12 * u, 0.12 * u, 0.6)
  precise(pen, pen.p, pen.p - s * 0.2 * u, 0.12 * u, 0.12 * u, 0.55)
  precise(pen, pen.p, pen.p - s * 0.18 * u, 0.14 * u, 0.1 * u, 0.5) // bounce kering menjauh dari truth, volume layu
  const o2 = pen.p
  if (s === 1) precise(pen, o2, o2 + 1.3 * u, 0.1 * u, 0.14 * u, 2.8)
  else precise(pen, o2, o2 - 1.3 * u, 0.14 * u, 0.1 * u, 2.8)
  const legs = [0.95, 0.85, 0.75, 0.7, 0.6, 0.55, 0.5, 0.45, -0.2, 0.5]
  for (const d of legs) {
    const relief = s * d < 0
    step(pen, r, u, s * d * u, relief ? 0.2 : 0.14, relief ? 0.14 : 0.2, relief ? 0.85 : 1.6, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen)
}

export type { Candle }
