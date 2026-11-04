// ============================================================
// GENERATOR UJIAN PUMP & DUMP — 14 arketipe (10 dump-side +
// 4 pump-side guard). Semua menulis PERSIS 60 visible + 14
// horizon. Anatomi presisi (precise) wajib untuk lilin kunci:
// klimaks, absorpsi, wick-penolakan, breakdown, reclaim.
// ============================================================

import type { Candle } from './generator'
import {
  Pen, step, precise, boundRange, upLegs, downLegs,
  pdDump, pdPumpOn, pdFlushCascade, pdStallDumpDeep,
  rescalePeakTo,
  PD_LEGS_DN, PD_LEGS_UP, PD_LEGS_CASCADE, PD_LEGS_DN_DEEP,
  type PdRng, type PdCfg, type PdLevels,
} from './pumpdump-forge'

type Gen = (pen: Pen, r: PdRng, u: number, cfg: PdCfg, lv: PdLevels) => void

// ---------- helper anatomi ----------

/** merah besar presisi (badan dominan) — kaskade / flush */
function bigRed(pen: Pen, u: number, dC: number, vol: number): void {
  const o = pen.p
  precise(pen, o, o - dC * u, 0.08 * u, 0.1 * u, vol)
}
/** hijau besar presisi — reclaim / launch */
function bigGreen(pen: Pen, u: number, dC: number, vol: number): void {
  const o = pen.p
  precise(pen, o, o + dC * u, 0.1 * u, 0.08 * u, vol)
}
/** hijau kering (badan kecil, volume padam) — deadcat / retest */
function dryGreen(pen: Pen, r: PdRng, u: number, dC: number, vol = 0.55): void {
  const o = pen.p
  precise(pen, o, o + dC * u, 0.12 * u, 0.12 * u, vol + r.next() * 0.15)
}
/** wick penolakan atas (badan kecil, ekor atas panjang) */
function rejectTop(pen: Pen, r: PdRng, u: number, vol: number): void {
  const o = pen.p
  const c = o + (r.chance(0.5) ? 0.06 : -0.08) * u
  precise(pen, o, c, 0.72 * u + r.next() * 0.2 * u, 0.12 * u, vol)
}
/** absorpsi: badan kecil, wick dua sisi, volume besar — progres nol */
function absorbCandle(pen: Pen, r: PdRng, u: number, vol: number): void {
  const o = pen.p
  const c = o + (r.chance(0.5) ? 1 : -1) * (0.06 + r.next() * 0.08) * u
  precise(pen, o, c, (0.3 + r.next() * 0.15) * u, (0.3 + r.next() * 0.15) * u, vol)
}
/** lilin basis (range terikat) */

// ============================================================
// DUMP-SIDE (truth TURUN)
// ============================================================

/** 1) Klimaks Blow-Off — klimaks volume raksasa di lilin keputusan */
export const genPdClimaxBlowoff: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 104, 14, 0.8) // 14 basis
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.3 * u, 0.14, 0.14, 1.0, cfg) // 24 rise
  upLegs(pen, r, u, cfg, 3, 0.5, 0.25, 1.3) // 36 pump
  for (let i = 0; i < 12; i++) step(pen, r, u, 0.85 * u, 0.1, 0.08, 2.6 + 0.08 * i, cfg) // 48 parabolik
  for (let i = 0; i < 6; i++) step(pen, r, u, r.normal() * 0.16 * u, 0.12, 0.12, 2.1, cfg) // 54 stall puncak
  for (let i = 0; i < 5; i++) step(pen, r, u, 0.55 * u, 0.1, 0.08, 3.0, cfg) // 59 push puncak
  { // 60: KLIMAKS — wick atas lebar, volume terbesar sejarah
    const o = pen.p
    precise(pen, o, o + 0.22 * u, 1.05 * u, 0.12 * u, 4.6)
  }
  lv.dasar = Math.min(...pen.candles.slice(0, 14).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.7, PD_LEGS_DN)
}

/** 2) Vertikal Tanpa Napas — 15+ lilin naik nyaris tanpa koreksi */
export const genPdExhaustVertical: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 16, 0.8) // 16 basis
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.35 * u, 0.14, 0.14, 1.1, cfg) // 26 mild rise
  for (let i = 0; i < 34; i++) { // 60: vertikal — dip sesekali, tanpa koreksi berarti
    const dC = i % 6 === 5 ? -0.12 * u : 0.62 * u
    const vol = i < 20 ? 2.2 + 0.05 * i : 3.0 + 0.06 * i
    step(pen, r, u, dC, 0.08, 0.07, vol, cfg)
  }
  lv.dasar = Math.min(...pen.candles.slice(0, 16).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.9, PD_LEGS_DN)
}

/** 3) Absorpsi di Puncak — volume besar, progres nol */
export const genPdAbsorbTop: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 104, 14, 0.8) // 14
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.32 * u, 0.14, 0.14, 1.0, cfg) // 24
  upLegs(pen, r, u, cfg, 3, 0.5, 0.25, 1.3) // 36
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.75 * u, 0.1, 0.08, 2.6, cfg) // 46 parabolik
  for (let i = 0; i < 4; i++) step(pen, r, u, 0.5 * u, 0.1, 0.08, 2.8, cfg) // 50 push puncak
  for (let i = 0; i < 10; i++) absorbCandle(pen, r, u, 2.5 + r.next() * 0.5) // 60 ABSORPSI
  lv.dasar = Math.min(...pen.candles.slice(0, 14).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.65, PD_LEGS_DN)
}

/** 4) Divergensi Volume pada Higher-High — dorongan makin kering */
export const genPdDivergenceHh: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 104, 14, 0.8) // 14
  upLegs(pen, r, u, cfg, 3, 0.55, 0.25, 1.7) // 26 push A (volume terbesar)
  downLegs(pen, r, u, cfg, 1, 0.4, 0.2, 0.85) // 30 pullback
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.3 * u, 0.14, 0.14, 0.8, cfg) // 32
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.5 * u, 0.12, 0.12, 1.25, cfg) // 42 push B (HH, vol lebih kecil)
  for (let i = 0; i < 4; i++) step(pen, r, u, -0.32 * u, 0.14, 0.14, 0.75, cfg) // 46
  for (let i = 0; i < 10; i++) { // 56 push C: badan menyusut, volume terkering — HH marginal
    const dC = i < 6 ? 0.34 * u : 0.2 * u
    step(pen, r, u, dC, 0.12, 0.12, 0.85, cfg)
  }
  for (let i = 0; i < 4; i++) step(pen, r, u, r.normal() * 0.1 * u, 0.12, 0.12, 0.8, cfg) // 60 stall
  lv.dasar = Math.min(...pen.candles.slice(0, 14).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.55, PD_LEGS_DN)
}

/** 5) Klaster Penolakan Wick di Atap */
export const genPdWickReject: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 104, 14, 0.8) // 14
  upLegs(pen, r, u, cfg, 5, 0.5, 0.25, 1.35) // 34 pump
  for (let i = 0; i < 6; i++) step(pen, r, u, 0.4 * u, 0.14, 0.14, 1.2, cfg) // 40 rise
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.4 * u, 0.1, 0.08, 2.0, cfg) // 50 approach top
  for (let i = 0; i < 10; i++) rejectTop(pen, r, u, 1.9 + r.next() * 0.5) // 60 KLASTER PENOLAKAN
  lv.dasar = Math.min(...pen.candles.slice(0, 14).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.6, PD_LEGS_DN)
}

/** 6) Lower-High Distribusi Pasca-Pump */
export const genPdLhDistribution: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 104, 14, 0.8) // 14
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.4) // 30 pump
  for (let i = 0; i < 6; i++) step(pen, r, u, 0.42 * u, 0.12, 0.12, 1.5, cfg) // 36 puncak P1
  for (let i = 0; i < 6; i++) step(pen, r, u, -0.5 * u, 0.14, 0.16, 0.95, cfg) // 42 pullback
  for (let i = 0; i < 10; i++) { // 52 rally kedua: badan & volume MENYUSUT, berhenti di bawah P1
    const dC = i < 5 ? 0.4 * u : 0.18 * u
    step(pen, r, u, dC, 0.12, 0.12, 0.85, cfg)
  }
  for (let i = 0; i < 6; i++) step(pen, r, u, -0.06 * u + r.normal() * 0.08 * u, 0.12, 0.12, 0.7, cfg) // 58 melemah
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.12 * u, 0.12, 0.12, 0.75, cfg) // 60
  lv.dasar = Math.min(...pen.candles.slice(0, 14).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.slice(0, 42).map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.6, PD_LEGS_DN)
}

/** 7) Breakdown Support Distribusi — lantai range puncak patah */
export const genPdBreakSupport: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 12, 0.8) // 12
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.4) // 28
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.7 * u, 0.1, 0.08, 2.5, cfg) // 36 puncak
  for (let i = 0; i < 16; i++) { // 52 distribusi: range sempit, merah menguasai volume
    const dC = r.normal() * 0.18 * u
    step(pen, r, u, dC, 0.18, 0.18, r.chance(0.6) ? 1.35 : 0.85, cfg)
  }
  const S = Math.min(...pen.candles.slice(36, 52).map((c) => c.l)) // support distribusi
  for (let i = 0; i < 5; i++) step(pen, r, u, -0.14 * u, 0.12, 0.14, 1.2, cfg) // 57 mendarat di support
  { // 58: BREAKDOWN — tutup di bawah S, volume merah dominan
    const o = pen.p
    precise(pen, o, S - 0.45 * u, 0.1 * u, 0.1 * u, 2.8)
  }
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.3 * u, 0.1, 0.12, 2.1, cfg) // 60 follow-through (tanpa reclaim)
  lv.dasar = Math.min(...pen.candles.slice(0, 12).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdDump(pen, r, u, cfg, 0.7, PD_LEGS_DN)
}

/** 8) Kaskade Dump Berjalan (PEMBUNUH dip-buyer) */
export const genPdCascadeContinue: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 12, 0.8) // 12
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.35) // 28
  for (let i = 0; i < 12; i++) step(pen, r, u, 0.42 * u, 0.12, 0.12, 1.5, cfg) // 40 puncak
  for (let i = 0; i < 5; i++) step(pen, r, u, r.normal() * 0.15 * u, 0.12, 0.12, 1.9, cfg) // 45 stall
  for (let i = 0; i < 4; i++) bigRed(pen, u, 0.5 + r.next() * 0.15, 2.2 + 0.1 * i) // 49 red pertama
  for (let i = 0; i < 11; i++) bigRed(pen, u, 0.82 + r.next() * 0.15, 2.6 + 0.09 * i) // 60 KASKADE
  lv.dasar = Math.min(...pen.candles.slice(0, 12).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdFlushCascade(pen, r, u, cfg, [-0.9, -0.85], PD_LEGS_CASCADE)
}

/** 9) Dead Cat Bounce (PEMBUNUH bounce-buyer) */
export const genPdDeadcatBounce: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 10, 0.8) // 10
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.35) // 26
  for (let i = 0; i < 4; i++) step(pen, r, u, 0.45 * u, 0.12, 0.12, 1.6, cfg) // 30 puncak
  for (let i = 0; i < 16; i++) bigRed(pen, u, 0.72 + r.next() * 0.18, 2.4 + r.next() * 0.4) // 46 DUMP besar
  for (let i = 0; i < 9; i++) dryGreen(pen, r, u, i === 4 ? -0.12 : 0.14 + r.next() * 0.08, 0.5) // 55 bounce KERING
  for (let i = 0; i < 5; i++) step(pen, r, u, r.normal() * 0.06 * u, 0.1, 0.1, 0.45, cfg) // 60 flat kering
  lv.dasar = Math.min(...pen.candles.slice(0, 10).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdStallDumpDeep(pen, r, u, cfg, [0.08, 0.05, 0.03], 0.7, PD_LEGS_DN_DEEP)
}

/** 10) Flush Pertama dari Puncak — dump resmi dimulai */
export const genPdPumpFlushTop: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 12, 0.8) // 12
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.35) // 28
  for (let i = 0; i < 18; i++) step(pen, r, u, 0.7 * u, 0.1, 0.08, 2.5, cfg) // 46 parabolik
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.55 * u, 0.1, 0.08, 2.9, cfg) // 54 push puncak
  { // 55: FLUSH — mencabut 2+ kaki pump sekaligus, volume klimaks
    const o = pen.p
    precise(pen, o, o - 2.3 * u, 0.12 * u, 0.14 * u, 3.9)
  }
  for (let i = 0; i < 3; i++) dryGreen(pen, r, u, 0.22, 0.9) // 58 bounce lemah (LH mikro)
  for (let i = 0; i < 2; i++) bigRed(pen, u, 0.32, 2.0) // 60 tekanan kedua (tanpa reclaim)
  lv.dasar = Math.min(...pen.candles.slice(0, 12).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdFlushCascade(pen, r, u, cfg, [-0.85, -0.9], PD_LEGS_CASCADE)
}

// ============================================================
// PUMP-SIDE GUARD (truth NAIK)
// ============================================================

/** 11) Breakout Bervolume dari Basis Panjang (GUARD markup asli) */
export const genPdBreakoutMarkup: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 38, 0.7) // 38 basis SUNYI
  for (let i = 0; i < 12; i++) step(pen, r, u, r.normal() * 0.12 * u, 0.14, 0.14, 0.6, cfg) // 50 coil
  for (let i = 0; i < 6; i++) step(pen, r, u, i < 2 ? 0.3 * u : 0.42 * u, 0.12, 0.12, 1.9, cfg) // 56 BREAKOUT volume nyata
  for (let i = 0; i < 3; i++) step(pen, r, u, -0.16 * u, 0.12, 0.14, 1.0, cfg) // 59 dip kecil
  step(pen, r, u, 0.45 * u, 0.1, 0.1, 1.8, cfg) // 60 push
  lv.dasar = Math.min(...pen.candles.slice(0, 38).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdPumpOn(pen, r, u, cfg, 0.5, PD_LEGS_UP)
}

/** 12) Retest Tahan (GUARD pullback kering) */
export const genPdRetestContinue: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 12, 0.8) // 12
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.35) // 28
  for (let i = 0; i < 6; i++) step(pen, r, u, 0.45 * u, 0.12, 0.12, 1.6, cfg) // 34 zona breakout
  for (let i = 0; i < 6; i++) step(pen, r, u, 0.5 * u, 0.1, 0.08, 2.2, cfg) // 40 breakout push
  downLegs(pen, r, u, cfg, 2, 0.38, 0.16, 0.7) // 48 pullback KERING
  for (let i = 0; i < 4; i++) step(pen, r, u, -0.1 * u, 0.12, 0.12, 0.6, cfg) // 52
  for (let i = 0; i < 6; i++) step(pen, r, u, r.normal() * 0.09 * u, 0.1, 0.1, 0.6, cfg) // 58 HOLD di atas level
  for (let i = 0; i < 2; i++) step(pen, r, u, 0.3 * u, 0.1, 0.1, 1.3, cfg) // 60 berbalik naik
  lv.dasar = Math.min(...pen.candles.slice(0, 12).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdPumpOn(pen, r, u, cfg, 0.55, PD_LEGS_UP)
}

/** 13) Flick Dump yang Direbut Balik (PEMBUNUH naive short) */
export const genPdFlickReclaim: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 10, 0.8) // 10
  upLegs(pen, r, u, cfg, 5, 0.5, 0.25, 1.4) // 30
  for (let i = 0; i < 10; i++) step(pen, r, u, 0.42 * u, 0.12, 0.12, 1.55, cfg) // 40 pump lanjut
  for (let i = 0; i < 8; i++) step(pen, r, u, 0.52 * u, 0.1, 0.08, 2.1, cfg) // 48 push tinggi
  const zonaPutus = pen.p - 1.4 * u // zona yang di-flick
  for (let i = 0; i < 7; i++) bigRed(pen, u, 0.55 + r.next() * 0.2, 2.0 + 0.08 * i) // 55 FICK dump
  { // 56: RECLAIM — hijau BESAR volume tinggi merebut balik zona
    const o = pen.p
    precise(pen, o, Math.max(o, zonaPutus) + 0.55 * u, 0.14 * u, 0.1 * u, 3.4)
  }
  for (let i = 0; i < 4; i++) step(pen, r, u, i === 1 ? -0.14 * u : 0.32 * u, 0.1, 0.1, 2.0, cfg) // 60 lanjut naik
  lv.dasar = Math.min(...pen.candles.slice(0, 10).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdPumpOn(pen, r, u, cfg, 0.6, PD_LEGS_UP)
}

/** 14) Gelombang Kedua dari Higher-Low (GUARD markup W2) */
export const genPdSecondWave: Gen = (pen, r, u, cfg, lv) => {
  boundRange(pen, r, u, cfg, 98, 103, 10, 0.8) // 10
  upLegs(pen, r, u, cfg, 4, 0.5, 0.25, 1.5) // 26
  for (let i = 0; i < 6; i++) step(pen, r, u, 0.45 * u, 0.12, 0.12, 1.7, cfg) // 32 puncak W1
  downLegs(pen, r, u, cfg, 3, 0.42, 0.18, 0.75) // 44 retrace terkendali
  for (let i = 0; i < 2; i++) step(pen, r, u, -0.1 * u, 0.12, 0.12, 0.65, cfg) // 46 HL
  for (let i = 0; i < 7; i++) step(pen, r, u, i < 4 ? 0.22 * u : 0.1 * u, 0.1, 0.1, 0.9, cfg) // 53 turn HL
  for (let i = 0; i < 7; i++) step(pen, r, u, 0.5 * u, 0.1, 0.08, 1.5 + 0.14 * i, cfg) // 60 LAUNCH W2 (volume menaik)
  lv.dasar = Math.min(...pen.candles.slice(0, 10).map((c) => c.l))
  lv.puncak = Math.max(...pen.candles.map((c) => c.h))
  pdPumpOn(pen, r, u, cfg, 0.55, PD_LEGS_UP)
}

export type { Candle }
export { rescalePeakTo }
