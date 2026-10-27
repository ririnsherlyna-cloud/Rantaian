// ============================================================
// GENERATOR FALSE BREAKOUT — 12 keluarga + 3 guard, mirror
// ATAS (menembus resistance) / BAWAH (menembus support).
//
// Konvensi: s = +1 utk ATAS (break ke atas, fade = TURUN),
// s = -1 utk BAWAH (break ke bawah, fade = NAIK). mir()/precM()
// mencerminkan arah & wick otomatis.
//
// TATA LETAK (60 visible): level dibentuk (2-3 sentuhan) ->
// approach -> BREAK menembus level -> variasi keluarga.
//   KELUARGA ENTRY  : bukti kegagalan SUDAH terlihat pada
//                     candle 60 (close kembali ke dalam level,
//                     crossBack / wick-reject / retest gagal).
//   KELUARGA WAIT   : close 60 masih DI LUAR level; trigger
//                     close-back menyala di horizon (uji sabar).
//   KELUARGA PUNISH : dorongan terakhir MELAMPAUI ekstrem
//                     keputusan — fade prematur = LIKUIDASI.
//   GUARD           : breakout SEJATI (acceptance + volume
//                     pengikut / retest tahan) — fade = rugi.
// ============================================================

import type { Candle } from './generator'
import {
  Pen, step, precise,
  type FboRng, type FboCfg, type LevelTruth, type FboSide,
} from './fbo-forge'

export const FBO_U = 0.5

export interface FamGen {
  (pen: Pen, r: FboRng, u: number, cfg: FboCfg, side: FboSide): LevelTruth
}
export interface FamHorizon {
  (pen: Pen, r: FboRng, u: number, cfg: FboCfg, side: FboSide): void
}

function assertVis(pen: Pen): void {
  if (pen.candles.length !== 60) throw new Error(`visible: ${pen.candles.length} candle (harus 60)`)
}
function assertHor(pen: Pen): void {
  if (pen.candles.length !== 74) throw new Error(`horizon: ${pen.candles.length} candle (harus 74)`)
}

// ------------------------------------------------------------
// helper mirror
// ------------------------------------------------------------

export class Mir {
  constructor(public pen: Pen, public r: FboRng, public u: number, public cfg: FboCfg, public side: FboSide) {}
  get s(): number { return this.side === 'ATAS' ? 1 : -1 }
  /** candle generik: dC dalam satuan u, arah s (badan + noise) */
  mir(dC: number, wu: number, wl: number, vol: number): void {
    const s = this.s
    step(this.pen, this.r, this.u, s * dC * this.u, s === 1 ? wu : wl, s === 1 ? wl : wu, vol, this.cfg)
  }
  /** candle presisi: badan dCu (u) arah s, tanpa noise (anatomi wajib terbaca) */
  precM(dCu: number, wu: number, wl: number, vol: number): void {
    const s = this.s
    const o = this.pen.p
    precise(this.pen, o, o + s * dCu * this.u, s === 1 ? wu * this.u : wl * this.u, s === 1 ? wl * this.u : wu * this.u, vol)
  }
  /** candle presisi absolut: open o, close c, wick unit u (TANPA mirror) */
  precAbs(o: number, c: number, uwU: number, lwU: number, vol: number): void {
    precise(this.pen, o, c, uwU * this.u, lwU * this.u, Math.max(0.25, vol))
  }
}

/** range terikat di bawah L (ATAS) / di atas L (BAWAH) dengan sentuhan level.
 *  Sentuhan = lilin presisi dgn wick menyentuh L lalu tolak. */
export function boundUnder(m: Mir, L: number, n: number, dipLo: number, vol: number, touches: number[]): void {
  const s = m.s
  for (let i = 0; i < n; i++) {
    if (touches.includes(i)) {
      const o = s === 1 ? L - 0.55 * m.u : L + 0.55 * m.u
      if (s === 1) m.precAbs(o, o - 0.12 * m.u, 0.62, 0.2, vol * 1.1)
      else m.precAbs(o, o + 0.12 * m.u, 0.2, 0.62, vol * 1.1)
      continue
    }
    const nearL = s === 1 ? m.pen.p > L - 0.7 * m.u : m.pen.p < L + 0.7 * m.u
    const farL = s === 1 ? m.pen.p < L - dipLo * m.u : m.pen.p > L + dipLo * m.u
    let dC = m.r.normal() * 0.2
    // relatif-s: negatif = MENJAUH dari level (tolakan), positif = mendekat
    if (nearL) dC = -(0.22 + Math.abs(m.r.normal()) * 0.15)
    if (farL) dC = +(0.2 + Math.abs(m.r.normal()) * 0.15)
    m.mir(dC, nearL ? 0.45 : 0.16, nearL ? 0.16 : 0.45, vol * (0.85 + m.r.next() * 0.3))
  }
}

/** kaki tren searah s: cnt kaki x (3 impuls + 1 koreksi) */
export function trendLegs(m: Mir, legs: number, imp: number, corr: number, vol: number): void {
  for (let k = 0; k < legs; k++) {
    for (let i = 0; i < 3; i++) m.mir(imp * (0.85 + m.r.next() * 0.3), 0.15, 0.15, vol * (1 + i * 0.08))
    m.mir(-corr, 0.18, 0.22, vol * 0.7)
  }
}

/** padding: lilin kecil mengapung (bias dCu per candle) sampai jumlah tercapai */
export function padTo(m: Mir, total: number, dCu: number, wu: number, wl: number, vol: number): void {
  while (m.pen.candles.length < total) {
    m.mir(dCu + m.r.normal() * 0.09, wu, wl, vol + m.r.next() * 0.15)
  }
}

/** padding berjangkar: merambat menuju harga target dalam RUANG HARGA
 *  (tanpa mirror s) — drift tetap dekat level sehingga close-back terjangkau */
export function padToNear(m: Mir, total: number, target: number, vol: number): void {
  while (m.pen.candles.length < total) {
    const pull = Math.max(-0.18, Math.min(0.18, (target - m.pen.p) / m.u))
    step(m.pen, m.r, m.u, pull * m.u + m.r.normal() * 0.03 * m.u, 0.13, 0.13, vol + m.r.next() * 0.15, m.cfg)
  }
}

/** fase acceptance mengapung: badan PENUH bergantian (naik kecil, koreksi
 *  mungil) di sisi luar level — acceptance sejati mengapung, bukan meringkuk */
export function floatAbove(m: Mir, n: number, vol: number): void {
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) m.mir(-0.16, 0.12, 0.14, vol * 0.85)
    else m.mir(0.38 - i * 0.018, 0.13, 0.13, vol)
  }
}

/** HORIZON fade: 1 lilin akselerasi searah fade + kaki-kaki fade (relief kecil). */
function horizonFade(m: Mir, accelVol: number, legs: number[]): void {
  const s = m.s
  const o = m.pen.p
  if (s === 1) m.precAbs(o, o - 0.65 * m.u, 0.12, 0.18, accelVol)
  else m.precAbs(o, o + 0.65 * m.u, 0.18, 0.12, accelVol)
  for (const d of legs) {
    const relief = d < 0
    m.mir(-d * (0.9 + m.r.next() * 0.2), relief ? 0.14 : 0.22, relief ? 0.22 : 0.14, relief ? 0.85 : 1.5)
  }
  assertHor(m.pen)
}

// ============================================================
// 12 KELUARGA FALSE BREAKOUT
// ============================================================

/** 1. fbo-weak — breakout VOLUME LEMAH, stall di udara (WAIT) */
export const genWeak: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.6 * u
  boundUnder(m, L, 30, 2.6, 0.9, [8, 20]) // A: range + 2 sentuhan
  m.mir(0.5, 0.16, 0.16, 1.0); m.mir(0.45, 0.15, 0.15, 1.0); m.mir(0.3, 0.16, 0.14, 0.95) // B: approach
  m.mir(0.65, 0.14, 0.2, 0.85) // C: break — vol LEMAH (di bawah rata)
  m.precM(0.3, 0.12, 0.16, 0.5)
  m.mir(0.15, 0.14, 0.16, 0.5)
  const pierceIdx = pen.candles.length - 3
  padToNear(m, 60, L + m.s * 0.55 * u, 0.45) // D: stall merambat TERJANGKAR dekat level (vol kering)
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((c) => c.h)) : Math.min(...pen.candles.slice(pierceIdx).map((c) => c.l))
  assertVis(pen)
  return { jenis: 'range-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horWeak: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(0.95, 0.12, 0.2, 1.15) // tindak-lanjut terakhir (kecil — non-punish)
  m.precM(-3.3, 0.14, 0.24, 2.2) // close-back besar ke dalam level (trigger menyala)
  horizonFade(m, 2.0, [0.95, 0.85, -0.25, 0.8, 0.7, -0.2, 0.6, 0.55, 0.5, 0.4, 0.35])
}

/** 2. fbo-spike-wick — sapuan wick tunggal, close kembali ke dalam (ENTRY) */
export const genSpikeWick: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.2 * u
  boundUnder(m, L, 48, 2.4, 0.9, [8, 24, 40]) // A: range panjang + 3 sentuhan
  m.mir(0.5, 0.16, 0.15, 1.05); m.mir(0.4, 0.15, 0.15, 1.1) // B: push mendekat
  m.precM(0.12, 0.14, 0.16, 0.9) // seteleman tepat di bawah level
  const o = pen.p // SPIKE: menembus L dgn wick panjang, close KEMBALI DI DALAM
  const c = o - m.s * 1.6 * u
  if (side === 'ATAS') m.precAbs(o, c, 1.85, 0.18, 3.0)
  else m.precAbs(o, c, 0.18, 1.85, 3.0)
  const pierceIdx = pen.candles.length - 1
  m.mir(-0.5, 0.2, 0.16, 1.35); m.mir(-0.45, 0.2, 0.16, 1.2) // konfirmasi merah
  padTo(m, 60, -0.06, 0.14, 0.14, 0.65) // drift di dalam
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'wick-sweep', side, level: L, extreme, pierceIdx, lastPierceIdx: pierceIdx }
}
export const horSpikeWick: FamHorizon = (pen, r, u, cfg, side) => {
  horizonFade(new Mir(pen, r, u, cfg, side), 2.1, [0.9, 0.85, -0.25, 0.8, 0.75, -0.2, 0.65, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3])
}

/** 3. fbo-follow-fail — break + tindak-lanjut singkat lalu GAGAL
 *  (PUNISH: dorongan terakhir melampaui ekstrem keputusan) */
export const genFollowFail: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.4 * u
  boundUnder(m, L, 34, 2.6, 0.9, [8, 24])
  m.mir(0.5, 0.15, 0.16, 1.05); m.mir(0.4, 0.16, 0.15, 1.0); m.mir(0.35, 0.15, 0.15, 1.0)
  m.mir(0.75, 0.14, 0.2, 1.5) // break candle — vol BAIK (terlihat sah!)
  m.mir(0.6, 0.14, 0.18, 1.55) // tindak-lanjut 1
  m.precM(0.25, 0.12, 0.14, 1.0)
  const pierceIdx = pen.candles.length - 3
  m.mir(0.5, 0.14, 0.16, 1.2); m.precM(0.3, 0.12, 0.14, 0.9) // extend
  padTo(m, 54, 0.05, 0.12, 0.12, 0.55) // stall di luar (vol memudar)
  padTo(m, 60, 0.02, 0.14, 0.14, 0.5) // mini-flag di puncak
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'range-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horFollowFail: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(2.1, 0.1, 0.26, 2.4) // DORONGAN TERAKHIR — likuidasi fade prematur
  m.precM(-4.9, 0.16, 0.2, 2.6) // close-back raksasa ke dalam level (trigger menyala)
  horizonFade(m, 2.2, [1.0, 0.9, -0.25, 0.85, 0.75, -0.2, 0.65, 0.6, 0.5, 0.45, 0.4])
}

/** 4. fbo-climax-fail — break VOLUME KLIMAKS di ujung tren tua
 *  (WAIT; punish: blow-off terakhir) */
export const genClimaxFail: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  trendLegs(m, 3, 0.55, 0.3, 1.05) // tren awal
  const L = pen.p + m.s * 0.9 * u
  m.precM(0.5, 0.6, 0.2, 1.2); m.precM(-0.5, 0.2, 0.6, 1.0) // puncak konsolidasi = LEVEL (sentuhan 1)
  trendLegs(m, 3, 0.55, 0.3, 1.1)
  m.mir(0.4, 0.5, 0.2, 1.15); m.precM(-0.35, 0.2, 0.5, 0.95) // sentuhan ke-2
  trendLegs(m, 4, 0.6, 0.28, 1.2) // rally menuju level
  m.mir(0.7, 0.14, 0.2, 1.8); m.mir(0.6, 0.14, 0.18, 2.0); m.mir(0.55, 0.14, 0.18, 2.1) // BREAK berakselerasi
  const pierceIdx = pen.candles.length - 4
  m.mir(0.5, 0.14, 0.16, 2.3)
  const o = pen.p // KLIMAKS: vol raksasa, wick kelelahan, close di luar
  if (side === 'ATAS') m.precAbs(o, o + 0.3 * u, 0.85, 0.16, 3.5)
  else m.precAbs(o, o - 0.3 * u, 0.16, 0.85, 3.5)
  padTo(m, 60, 0.04, 0.13, 0.13, 0.7) // stall di luar (vol memudar dari klimaks)
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'swing-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horClimaxFail: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(2.0, 0.08, 0.3, 2.7) // blow-off terakhir (likuidasi fade prematur)
  m.precM(-2.5, 0.2, 0.18, 2.4); m.precM(-2.7, 0.18, 0.16, 2.2) // close-back ke dalam level (trigger menyala)
  horizonFade(m, 2.1, [0.9, 0.8, -0.22, 0.75, 0.65, -0.2, 0.6, 0.5, 0.45, 0.4])
}

/** 5. fbo-retest-fail — acceptance lama lalu RETEST GAGAL (ENTRY) */
export const genRetestFail: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.3 * u
  boundUnder(m, L, 26, 2.4, 0.9, [6, 16])
  m.mir(0.7, 0.14, 0.2, 1.55); m.mir(0.4, 0.14, 0.16, 1.35); m.precM(0.2, 0.12, 0.14, 0.95) // break
  const pierceIdx = pen.candles.length - 3
  m.mir(0.12 + r.normal() * 0.1, 0.16, 0.16, 1.1); m.mir(0.1 + r.normal() * 0.1, 0.16, 0.16, 1.05) // acceptance
  padTo(m, 49, -0.14, 0.16, 0.18, 0.85) // mundur pelan ke level
  padTo(m, 54, -0.03, 0.2, 0.2, 0.75) // hover tepat di atas level
  const o = pen.p // RETEST GAGAL: menusuk balik ke dalam, close DI DALAM
  if (side === 'ATAS') m.precAbs(o, o - 0.85 * u, 0.12, 0.4, 1.95)
  else m.precAbs(o, o + 0.85 * u, 0.4, 0.12, 1.95)
  const lastPierceIdx = pen.candles.length - 1
  m.mir(-0.35, 0.18, 0.16, 1.5)
  padTo(m, 60, -0.06, 0.14, 0.14, 0.8) // drift di dalam
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'retest-fail', side, level: L, extreme, pierceIdx, lastPierceIdx }
}
export const horRetestFail: FamHorizon = (pen, r, u, cfg, side) => {
  horizonFade(new Mir(pen, r, u, cfg, side), 2.0, [0.9, 0.85, -0.25, 0.8, 0.7, -0.2, 0.65, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3])
}

/** 6. fbo-drift-snap — jalan-lambat tanpa energi menembus level
 *  (WAIT; punish: flush terakhir) */
export const genDriftSnap: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 2.2 * u
  boundUnder(m, L, 26, 2.2, 0.85, [6, 18])
  for (let i = 0; i < 8; i++) m.mir(m.s * 0.18 + r.normal() * 0.08, 0.16, 0.16, 0.8) // approach
  const pierceIdx = pen.candles.length
  padToNear(m, 60, L + m.s * 1.15 * u, 0.42) // DRIFT menembus TERJANGKAR dekat level (tanpa energi, vol kering)
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'range-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horDriftSnap: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(0.5, 0.12, 0.14, 0.5) // drift terakhir
  const o = pen.p // FLUSH: sumbu panjang MELAMPAUI ekstrem (arah break), close menempel
  if (side === 'ATAS') m.precAbs(o, o + 0.15 * u, 1.9, 0.1, 2.3)
  else m.precAbs(o, o - 0.15 * u, 0.1, 1.9, 2.3)
  m.precM(-2.3, 0.16, 0.18, 2.4) // reclaim besar ke dalam level (trigger menyala)
  horizonFade(m, 2.0, [0.9, 0.85, -0.25, 0.8, 0.7, -0.2, 0.6, 0.55, 0.5, 0.4])
}

/** 7. fbo-range-edge — tepi range lebar ditusuk lalu dicabut (ENTRY) */
export const genRangeEdge: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 5.2 * u
  boundUnder(m, L, 44, 5.2, 0.95, [6, 22, 36]) // range LEBAR (>= 2.5 ATR antar tepi)
  for (let i = 0; i < 5; i++) m.mir(0.55, 0.16, 0.18, 1.15) // rally ke tepi
  m.mir(0.7, 0.14, 0.2, 1.6); m.precM(0.2, 0.12, 0.14, 1.0) // break tepi
  m.mir(0.4, 0.14, 0.16, 1.3); m.precM(0.1, 0.12, 0.12, 0.85) // hold tipis di luar
  const pierceIdx = pen.candles.length - 4
  const o = pen.p // CLOSE-BACK: dicabut ke dalam range (menembus balik level)
  if (side === 'ATAS') m.precAbs(o, o - 3.7 * u, 0.14, 0.2, 2.1)
  else m.precAbs(o, o + 3.7 * u, 0.2, 0.14, 2.1)
  const lastPierceIdx = pen.candles.length - 1
  padTo(m, 60, -0.14, 0.16, 0.16, 0.85) // drift di dalam range
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'range-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx }
}
export const horRangeEdge: FamHorizon = (pen, r, u, cfg, side) => {
  horizonFade(new Mir(pen, r, u, cfg, side), 2.1, [1.0, 0.95, -0.25, 0.85, 0.8, -0.2, 0.7, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35])
}

/** 8. fbo-equal — equal-highs, fake new high dgn badan menyusut (WAIT) */
export const genEqual: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  trendLegs(m, 2, 0.6, 0.3, 1.05) // rally pertama
  const L = pen.p + m.s * 0.45 * u
  m.precM(0.35, 0.62, 0.2, 1.25); m.precM(-0.45, 0.2, 0.6, 1.0) // high pertama = LEVEL
  padTo(m, 14, -0.28, 0.2, 0.2, 0.88) // pullback
  m.mir(0.55, 0.15, 0.16, 1.1); m.mir(0.5, 0.15, 0.16, 1.15); m.mir(0.35, 0.16, 0.16, 1.0); m.mir(0.3, 0.16, 0.16, 0.95) // rally kedua
  m.precM(0.18, 0.58, 0.2, 1.15); m.precM(-0.4, 0.2, 0.55, 0.95) // EQUAL HIGH (sentuhan ke-2)
  padTo(m, 24, -0.22, 0.2, 0.2, 0.88) // pullback kedua
  m.mir(0.45, 0.15, 0.16, 1.05); m.mir(0.45, 0.15, 0.16, 1.1); m.mir(0.42, 0.14, 0.18, 1.2) // push ke-3 MENEMBUS sedikit
  m.precM(0.22, 0.12, 0.14, 0.62) // fake new high (badan kecil)
  const pierceIdx = pen.candles.length - 1
  padToNear(m, 60, L + m.s * 0.5 * u, 0.5) // stall TERJANGKAR tepat di luar level — badan menyusut, vol layu
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx - 2).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx - 2).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'equal-highs/lows', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horEqual: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(0.7, 0.12, 0.18, 0.9) // push terakhir kecil (non-punish ringan)
  m.precM(-1.5, 0.18, 0.16, 1.9); m.precM(-1.1, 0.16, 0.16, 1.6) // close-back (trigger menyala)
  horizonFade(m, 1.9, [0.85, 0.8, -0.22, 0.75, 0.65, -0.2, 0.6, 0.5, 0.45, 0.4])
}

/** 9. fbo-round — angka bulat: stop cluster disapu lalu ditutup balik (ENTRY) */
export const genRound: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L0 = pen.p + m.s * 4.3 * u
  boundUnder(m, L0, 48, 2.5, 0.9, [8, 24, 40])
  m.mir(0.5, 0.16, 0.15, 1.05); m.mir(0.35, 0.15, 0.15, 1.0)
  m.precM(0.1, 0.14, 0.16, 0.9) // seteleman tepat di bawah angka
  const o = pen.p // SWEEP angka bulat: wick menembus, close kembali di dalam
  const c = o - m.s * 1.4 * u
  if (side === 'ATAS') m.precAbs(o, c, 1.3, 0.16, 3.1)
  else m.precAbs(o, c, 0.16, 1.3, 3.1)
  const pierceIdx = pen.candles.length - 1
  m.mir(-0.45, 0.2, 0.16, 1.4); m.mir(-0.4, 0.18, 0.16, 1.25)
  padTo(m, 60, -0.05, 0.14, 0.14, 0.7)
  const all = pen.candles
  const tgt = Math.round(L0)
  const f = tgt / L0
  for (const cc of all) { cc.o *= f; cc.h *= f; cc.l *= f; cc.c *= f }
  const extreme = side === 'ATAS' ? Math.max(...all.slice(pierceIdx).map((x) => x.h)) : Math.min(...all.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'round-number', side, level: tgt, extreme, pierceIdx, lastPierceIdx: pierceIdx }
}
export const horRound: FamHorizon = (pen, r, u, cfg, side) => {
  horizonFade(new Mir(pen, r, u, cfg, side), 2.1, [0.9, 0.85, -0.25, 0.8, 0.7, -0.2, 0.65, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3])
}

/** 10. fbo-spring-hl — patahan level struktur tren palsu: break panik
 *  lalu SPRING reclaim (ENTRY) — sepenuhnya termirror arah s */
export const genSpringHl: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  trendLegs(m, 3, 0.6, 0.3, 1.1) // tren menuju level
  const L = pen.p + m.s * 0.35 * u // level struktur tepat di depan harga
  m.precM(0.3, 0.55, 0.2, 1.0); m.precM(-0.55, 0.2, 0.55, 1.2) // sentuhan level (dorong & tolak)
  trendLegs(m, 3, 0.55, 0.3, 1.1) // lanjut mendekat
  padTo(m, 30, -0.16, 0.2, 0.2, 0.9) // tarik napas menjauh level
  m.mir(0.6, 0.18, 0.22, 1.5); m.mir(0.55, 0.18, 0.2, 1.55); m.precM(0.3, 0.16, 0.18, 1.1) // BREAK panik menembus level
  const pierceIdx = pen.candles.length - 3
  padTo(m, 53, 0.05, 0.18, 0.2, 1.05) // grind panik di luar (tidak berlebihan)
  const o = pen.p // FLUSH (spring): sumbu panjang MELAMPAUI (arah break), close menempel
  if (side === 'ATAS') m.precAbs(o, o + 0.25 * u, 1.0, 0.12, 2.4)
  else m.precAbs(o, o - 0.25 * u, 0.12, 1.0, 2.4)
  m.precM(-2.05, 0.16, 0.18, 2.3) // SPRING reclaim — close kembali DI DALAM level
  const lastPierceIdx = pen.candles.length - 2
  padTo(m, 60, -0.05, 0.14, 0.14, 0.8) // drift di dalam
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'hl-structure', side, level: L, extreme, pierceIdx, lastPierceIdx }
}
export const horSpringHl: FamHorizon = (pen, r, u, cfg, side) => {
  horizonFade(new Mir(pen, r, u, cfg, side), 2.0, [0.95, 0.9, -0.25, 0.85, 0.75, -0.2, 0.7, 0.6, 0.55, 0.5, 0.4, 0.35, 0.3])
}

/** 11. fbo-two-candle — acceptance lalu ENGULF pencabut besar (ENTRY) */
export const genTwoCandle: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.4 * u
  boundUnder(m, L, 36, 2.5, 0.9, [8, 22])
  m.mir(0.7, 0.14, 0.2, 1.5); m.mir(0.45, 0.14, 0.16, 1.35); m.precM(0.2, 0.12, 0.14, 0.95) // break
  const pierceIdx = pen.candles.length - 3
  m.mir(0.1 + r.normal() * 0.1, 0.16, 0.16, 1.1); m.mir(0.08 + r.normal() * 0.1, 0.16, 0.16, 1.05) // acceptance
  padTo(m, 54, 0.045, 0.16, 0.16, 0.95) // drift di luar (closes di luar)
  const o = pen.p // ENGULF PENCABUT: badan besar menembus balik level
  if (side === 'ATAS') m.precAbs(o, o - 3.4 * u, 0.12, 0.3, 2.7)
  else m.precAbs(o, o + 3.4 * u, 0.3, 0.12, 2.7)
  const lastPierceIdx = pen.candles.length - 1
  m.mir(-0.35, 0.18, 0.16, 1.5); m.mir(-0.3, 0.18, 0.16, 1.3)
  padTo(m, 60, -0.03, 0.14, 0.14, 0.78)
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'range-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx }
}
export const horTwoCandle: FamHorizon = (pen, r, u, cfg, side) => {
  horizonFade(new Mir(pen, r, u, cfg, side), 2.1, [0.95, 0.9, -0.25, 0.85, 0.75, -0.2, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3])
}

/** 12. fbo-momentum-fail — momentum break di overextension ekstrem
 *  (WAIT; punish: blow-off terakhir) */
export const genMomentumFail: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  trendLegs(m, 1, 0.55, 0.3, 1.05)
  const L = pen.p + m.s * 0.7 * u
  m.precM(0.4, 0.6, 0.2, 1.2); m.precM(-0.45, 0.2, 0.55, 1.0) // puncak konsolidasi = LEVEL
  trendLegs(m, 6, 0.72, 0.26, 1.25) // rally KUAT (momentum, distEma membesar)
  padTo(m, 32, -0.14, 0.2, 0.2, 0.9)
  trendLegs(m, 3, 0.7, 0.26, 1.3) // rally lanjutan
  m.mir(0.7, 0.14, 0.2, 1.75); m.mir(0.65, 0.14, 0.18, 1.8) // BREAK momentum
  m.precM(0.3, 0.12, 0.14, 1.35)
  const pierceIdx = pen.candles.length - 3
  m.mir(0.25, 0.14, 0.16, 1.3)
  const o = pen.p // blow-off wick
  if (side === 'ATAS') m.precAbs(o, o + 0.15 * u, 0.5, 0.16, 2.9)
  else m.precAbs(o, o - 0.15 * u, 0.16, 0.5, 2.9)
  padTo(m, 60, 0.04, 0.13, 0.13, 0.75) // stall di luar
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'swing-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horMomentumFail: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(2.3, 0.08, 0.3, 3.0) // blow-off terakhir (likuidasi fade prematur)
  m.precM(-2.7, 0.2, 0.18, 2.8); m.precM(-2.5, 0.18, 0.16, 2.3) // close-back ke dalam level (trigger menyala)
  horizonFade(m, 2.1, [0.9, 0.8, -0.22, 0.8, 0.7, -0.2, 0.65, 0.55, 0.5, 0.45])
}

// ============================================================
// 3 GUARD — BREAKOUT SEJATI (anti-bias: fade = rugi/likuidasi)
// ============================================================

/** g-accept — breakout nyata: acceptance + volume pengikut (truth = arah break) */
export const genGuardAccept: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.4 * u
  boundUnder(m, L, 30, 2.6, 0.9, [8, 20])
  m.mir(0.5, 0.16, 0.16, 1.1); m.mir(0.4, 0.15, 0.15, 1.05)
  m.mir(0.75, 0.14, 0.2, 1.9); m.mir(0.55, 0.14, 0.18, 1.85) // BREAK vol KUAT
  const pierceIdx = pen.candles.length - 2
  floatAbove(m, 18, 1.18) // ACCEPTANCE: badan penuh mengapung di luar level
  floatAbove(m, 8, 1.05) // mini-flag sehat
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'range-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horGuardAccept: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(0.8, 0.14, 0.18, 1.9)
  for (const d of [0.9, 0.85, -0.25, 0.8, 0.75, -0.2, 0.7, 0.6, 0.55, 0.5, 0.45, 0.4, 0.3]) {
    const relief = d < 0
    m.mir(d, relief ? 0.14 : 0.2, relief ? 0.2 : 0.14, relief ? 0.8 : 1.5)
  }
  assertHor(m.pen)
}

/** g-retest-hold — breakout nyata + retest TAHAN (level jadi support baru) */
export const genGuardRetestHold: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  const L = pen.p + m.s * 4.3 * u
  boundUnder(m, L, 22, 2.5, 0.9, [6, 16])
  m.mir(0.7, 0.14, 0.2, 1.7); m.mir(0.45, 0.14, 0.16, 1.5); m.precM(0.2, 0.12, 0.14, 1.0) // break
  const pierceIdx = pen.candles.length - 3
  padTo(m, 37, 0.07, 0.18, 0.16, 1.12) // acceptance
  padTo(m, 53, -0.13, 0.16, 0.18, 0.9) // mundur ke level (retest)
  const o = pen.p // RETEST TAHAN: menempel level, wick menahan, close memantul
  if (side === 'ATAS') m.precAbs(o, o + 0.08 * u, 0.14, 0.42, 1.15)
  else m.precAbs(o, o - 0.08 * u, 0.42, 0.14, 1.15)
  m.mir(0.45, 0.16, 0.16, 1.3); m.mir(0.4, 0.15, 0.16, 1.35) // pantulan berpengikut
  padTo(m, 60, 0.12, 0.15, 0.16, 1.2)
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'retest-hold', side, level: L, extreme, pierceIdx, lastPierceIdx: 55 }
}
export const horGuardRetestHold: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(0.7, 0.14, 0.18, 1.8)
  for (const d of [0.85, 0.8, -0.25, 0.75, 0.7, -0.2, 0.65, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3]) {
    const relief = d < 0
    m.mir(d, relief ? 0.14 : 0.2, relief ? 0.2 : 0.14, relief ? 0.8 : 1.5)
  }
  assertHor(m.pen)
}

/** g-trend-cont — patahan minor dalam tren sehat: kelanjutan (truth = arah break) */
export const genGuardTrendCont: FamGen = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  trendLegs(m, 4, 0.6, 0.3, 1.1) // tren sehat
  const L = pen.p + m.s * 0.4 * u
  m.precM(0.45, 0.55, 0.2, 1.2); m.precM(-0.55, 0.2, 0.5, 0.95) // lower-high minor = LEVEL (sentuh lalu tolak, close di dalam)
  padTo(m, 38, -0.08, 0.16, 0.18, 0.85) // konsolidasi di bawah
  m.mir(0.55, 0.15, 0.16, 1.15); m.mir(0.5, 0.15, 0.16, 1.2)
  m.mir(0.75, 0.14, 0.2, 1.85); m.mir(0.6, 0.14, 0.18, 1.8) // BREAK tegas vol kuat
  const pierceIdx = pen.candles.length - 2
  floatAbove(m, 18, 1.15) // hold mengapung badan penuh di luar
  const extreme = side === 'ATAS' ? Math.max(...pen.candles.slice(pierceIdx).map((x) => x.h)) : Math.min(...pen.candles.slice(pierceIdx).map((x) => x.l))
  assertVis(pen)
  return { jenis: 'swing-high/low', side, level: L, extreme, pierceIdx, lastPierceIdx: 59 }
}
export const horGuardTrendCont: FamHorizon = (pen, r, u, cfg, side) => {
  const m = new Mir(pen, r, u, cfg, side)
  m.mir(0.75, 0.14, 0.18, 1.85)
  for (const d of [0.85, 0.8, -0.25, 0.75, 0.7, -0.2, 0.65, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3]) {
    const relief = d < 0
    m.mir(d, relief ? 0.14 : 0.2, relief ? 0.2 : 0.14, relief ? 0.8 : 1.5)
  }
  assertHor(m.pen)
}

export type { Candle }
