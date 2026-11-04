// ============================================================
// PERAKIT SUITE UJIAN FALSE BREAKOUT — 100 ujian FBO + 24 guard.
// Gerbang profit dari DATA (truth dari simulasi trade, retry
// berbibit, tanpa label manusia):
//   FBO (semua)   : fade = kebalikan breakout. Trade fade dari
//                   close60 dgn stop struktural (clamp 0.5-2.6%)
//                   WAJIB kena target 2.2% tanpa stop tersentuh;
//                   bait (mengikuti breakout) WAJIB gagal
//                   (baitMfe <= 1.3% & baitNet <= 0.3%).
//   KELUARGA WAIT : trigger close-back (masuk level >= 0.1 ATR)
//                   menyala <= 8 candle & trade pasca-trigger
//                   (stop 1.8%, target 2.2%) kena target.
//   KELUARGA PUNISH: fade prematur dari close60 = LIKUIDASI
//                   (dorongan terakhir melampaui ekstrem).
//   GUARD         : follow (arah break) kena target; fade =
//                   likuidasi / rugi net.
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import { Pen, type FboRng, type FboCfg } from './fbo-forge'
import {
  FBO_VISIBLE, FBO_TOTAL, FBO_SIZE, FBO_GUARD_SIZE,
  FEE_BUY, FEE_SELL,
  type FboArah, type FboExam, type LevelTruth, type FboSide,
} from './fbo-forge'
import {
  genWeak, horWeak, genSpikeWick, horSpikeWick, genFollowFail, horFollowFail,
  genClimaxFail, horClimaxFail, genRetestFail, horRetestFail, genDriftSnap, horDriftSnap,
  genRangeEdge, horRangeEdge, genEqual, horEqual, genRound, horRound,
  genSpringHl, horSpringHl, genTwoCandle, horTwoCandle, genMomentumFail, horMomentumFail,
  genGuardAccept, horGuardAccept, genGuardRetestHold, horGuardRetestHold, genGuardTrendCont, horGuardTrendCont,
  type FamGen, type FamHorizon,
} from './fbo-gens'

export const FBO_DIFF_CYCLE = ['MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG', 'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL'] as const

const DIFF_CFG: Record<string, FboCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface FboFamDef {
  id: string
  label: string
  kind: 'ENTRY' | 'WAIT' // bukti kegagalan sudah terlihat (ENTRY) vs konfirmasi belum lengkap (WAIT)
  punish: boolean // fade prematur dari close60 = LIKUIDASI
  ilmu: string
  jebakan: string
  tanda: string // tanda tangan point-in-time pada candle keputusan
  gen: FamGen
  hor: FamHorizon
  up: number
  dn: number
}

export const FBO_FAMILIES: FboFamDef[] = [
  {
    id: 'fbo-weak', label: 'Breakout Volume Lemah (Stall di Udara)', kind: 'WAIT', punish: false,
    ilmu: 'Harga menembus resistance TAPI volume breakout di bawah rata-rata dan badan lilin mengecil — energi beli kering; tembusan tanpa bahan bakar biasanya dicabut.',
    jebakan: 'Trader pro melihat "breakout confirmed" dan membeli; volume tipis yang mengkhianati diabaikan karena FOMO struktur.',
    tanda: 'closes di luar level + volZ break <= 0 + badan stall mengecil + tanpa dorongan',
    gen: genWeak, hor: horWeak, up: 5, dn: 5,
  },
  {
    id: 'fbo-spike-wick', label: 'Sapuan Wick Tunggal (Penolakan Serta-merta)', kind: 'ENTRY', punish: false,
    ilmu: 'Satu lilin menusuk level dengan ekor panjang dan close KEMBALI DI DALAM — penolakan total pada tembusan; wick = jejak likuidasi stop yang selesai.',
    jebakan: 'Breakout-buy terpicu di atas level oleh wick; short dilikuidasi; keduanya terjebak saat harga ditolak balik.',
    tanda: 'wick tembus >= 0.9 ATR + close kembali di dalam level + vol sapuan klimaks',
    gen: genSpikeWick, hor: horSpikeWick, up: 5, dn: 5,
  },
  {
    id: 'fbo-follow-fail', label: 'Tindak-Lanjut Singkat lalu Gagal (Penghukum Entry Dini)', kind: 'WAIT', punish: true,
    ilmu: 'Breakout terlihat sah (volume baik, tindak-lanjut ada) TAPI dorongan berhenti tepat setelah likuiditas habis — lalu dicabut. Fade sebelum close-back = dilikuidasi dorongan terakhir.',
    jebakan: 'Paling licik: konfirmasi "tampak datang" — pro masuk lebih awal dan DILIKUIDASI oleh lilin lanjutan terakhir; hanya penunggu close-back yang selamat.',
    tanda: 'close MASIH di luar level + tindak-lanjut memudar (vol stall < 0.7x break) + tanpa close-back',
    gen: genFollowFail, hor: horFollowFail, up: 4, dn: 4,
  },
  {
    id: 'fbo-climax-fail', label: 'Break Klimaks di Ujung Tren Tua (Exhaustion)', kind: 'WAIT', punish: true,
    ilmu: 'Breakout di atas high lama dengan VOLUME KLIMAKS saat harga sudah sangat jauh dari EMA21 — pembeli terakhir masuk di puncak; klimaks di ujung tren = kelelahan, bukan kekuatan.',
    jebakan: 'Dogma "volume mengonfirmasi breakout" memakan pro: klimaks justru tanda distribusi; blow-off terakhir melikuidasi fade prematur.',
    tanda: 'volZ klimaks >= 2.2 + jarak EMA21 >= 2 ATR + wick kelelahan + close di luar level',
    gen: genClimaxFail, hor: horClimaxFail, up: 4, dn: 4,
  },
  {
    id: 'fbo-retest-fail', label: 'Retest Gagal (Acceptance Palsu)', kind: 'ENTRY', punish: false,
    ilmu: 'Breakout bertahan lama (acceptance) sehingga tampak sejati — TAPI saat retest dari sisi lain, level DITOLAK: harga menusuk balik dan close di dalam; acceptance palsu terbongkar.',
    jebakan: 'Pro menunggu "retest konfirmasi" — dan justru retest itulah yang membongkar jebakan; yang membeli retest menanggung seluruh reversal.',
    tanda: '2+ closes di luar lama + retest menusuk balik + close kembali di dalam + badan penolakan',
    gen: genRetestFail, hor: horRetestFail, up: 4, dn: 4,
  },
  {
    id: 'fbo-drift-snap', label: 'Drift Sunyi Tanpa Energi (Snap-Back)', kind: 'WAIT', punish: true,
    ilmu: 'Harga merambat menembus level dengan volume KERING dan badan kecil — jalan-lambat tanpa energi; flush terakhir (capitulation wick) melikuidasi fade prematur sebelum snap-back.',
    jebakan: 'Tembusan sunyi membuat pro percaya "breakout pelan yang sehat"; flush capitulation mengambil stop mereka tepat sebelum V-snap.',
    tanda: 'badan mungil beruntun + vol kering parah + close di luar level + tanpa energi',
    gen: genDriftSnap, hor: horDriftSnap, up: 4, dn: 4,
  },
  {
    id: 'fbo-range-edge', label: 'Tepi Range Lebar Ditusuk lalu Dicabut', kind: 'ENTRY', punish: false,
    ilmu: 'Tepi range lebar adalah bank likuiditas; tusukan tepi mengambil stop kedua sisi lalu dicabut ke dalam range — mean reversion range tetap berkuasa.',
    jebakan: 'Pro menjual "range broken" / membeli "range breakout"; tepi yang ditusuk = jebakan klasik pencari-likuiditas.',
    tanda: 'range lebar (>= 2.5 ATR) + tusukan tepi + close-back besar ke dalam range',
    gen: genRangeEdge, hor: horRangeEdge, up: 5, dn: 5,
  },
  {
    id: 'fbo-equal', label: 'Equal Highs: Fake New High (Badan Menyusut)', kind: 'WAIT', punish: false,
    ilmu: 'Tiga dorongan ke level yang sama: badan & volume makin menyusut — divergensi struktural; fake new high menipu pembeli "breakout all-time high".',
    jebakan: '"Breakout ATH" dengan badan layu; momentum yang tersimpan di struktur tidak dilihat; stall di puncak = distribusi.',
    tanda: 'equal highs 2+ sentuhan + tembusan tipis + badan menyusut + vol kering',
    gen: genEqual, hor: horEqual, up: 4, dn: 4,
  },
  {
    id: 'fbo-round', label: 'Angka Bulat: Stop Cluster Disapu', kind: 'ENTRY', punish: false,
    ilmu: 'Stop cluster menumpuk di balik angka psikologis; sapuan menembus angka memanen stop lalu ditutup balik — likuiditas, bukan arah.',
    jebakan: 'Pro menaruh stop 1-2 tick di balik angka bulat; sapuan angka = panen massal; close-back membongkarnya.',
    tanda: 'level integer + wick sapu menembus angka + close kembali di bawah/di atasnya + vol klimaks',
    gen: genRound, hor: horRound, up: 4, dn: 4,
  },
  {
    id: 'fbo-spring-hl', label: 'Patahan Support Tren Palsu (Spring HL)', kind: 'ENTRY', punish: false,
    ilmu: 'Breakdown menembus support tren (HL structure) memicu panik — TAPI flush terakhir menemukan permintaan: SPRING reclaim menutup balik di atas level; tren belum selesai.',
    jebakan: 'Pro menjual "trendline broken"; breakdown panik adalah panen stop terakhir sebelum lanjutan; spring mengambil mereka.',
    tanda: 'support HL teruji + breakdown panik + flush sumbu panjang + reclaim close di atas level',
    gen: genSpringHl, hor: horSpringHl, up: 4, dn: 4,
  },
  {
    id: 'fbo-two-candle', label: 'Acceptance lalu Engulf Pencabut', kind: 'ENTRY', punish: false,
    ilmu: 'Breakout bertahan beberapa lilin lalu SATU engulf raksasa menembus balik level dan menutup di dalam — pencabut resmi; segala acceptance sebelumnya palsu.',
    jebakan: 'Yang membeli "acceptance 3 lilin" jatuh bersama engulf; close-back badan besar adalah vonis pasar atas breakout.',
    tanda: 'closes di luar + engulf besar menembus balik level + close di dalam + vol tinggi',
    gen: genTwoCandle, hor: horTwoCandle, up: 4, dn: 4,
  },
  {
    id: 'fbo-momentum-fail', label: 'Momentum Break di Overextension Ekstrem', kind: 'WAIT', punish: true,
    ilmu: 'Breakout dengan momentum kuat TAPI harga sudah terlalu jauh dari EMA (>= 2.6 ATR) — mean reversion tak tertahankan; blow-off terakhir melikuidasi fade prematur.',
    jebakan: '"Momentum adalah kebenaran" — pro mengejar break momentum; jarak ekstrem dari EMA membaliknya sekaligus.',
    tanda: 'mom12 tinggi + jarak EMA >= 2.6 ATR + tembusan level + tanpa konfirmasi balik',
    gen: genMomentumFail, hor: horMomentumFail, up: 3, dn: 3,
  },
]

export interface FboGuardDef {
  id: string
  label: string
  ilmu: string
  tanda: string
  gen: FamGen
  hor: FamHorizon
  up: number
  dn: number
}

export const FBO_GUARDS: FboGuardDef[] = [
  {
    id: 'g-accept', label: 'GUARD: Breakout Sejati — Acceptance + Volume Pengikut',
    ilmu: '(Kontrol anti-bias) closes beruntun di luar level dengan volume pengikut nyata = ACCEPTANCE — tembusan sejati; fade pada acceptance bervolume = melawan momentum asli.',
    tanda: 'closes di luar >= 2 + vol pengikut >= rata + badan penuh + tanpa penolakan',
    gen: genGuardAccept, hor: horGuardAccept, up: 5, dn: 5,
  },
  {
    id: 'g-retest-hold', label: 'GUARD: Breakout Sejati — Retest Tahan (Level Baru)',
    ilmu: '(Kontrol anti-bias) retest yang DITAHAN (wick menahan di level, pantulan berpengikut) membuktikan level menjadi support/resistance baru — kelanjutan, bukan jebakan.',
    tanda: 'break bervolume + retest menempel level + pantulan bervolume + closes kembali menjauh',
    gen: genGuardRetestHold, hor: horGuardRetestHold, up: 4, dn: 4,
  },
  {
    id: 'g-trend-cont', label: 'GUARD: Patahan Minor dalam Tren Sehat',
    ilmu: '(Kontrol anti-bias) patahan lower-high minor dalam tren kuat dengan volume = kelanjutan tren; fade pada tren sehat tanpa jejak penolakan = salah baca.',
    tanda: 'tren mom50 kuat + break level minor bervolume + jarak EMA moderat + tanpa penolakan',
    gen: genGuardTrendCont, hor: horGuardTrendCont, up: 3, dn: 3,
  },
]

// ------------------------------------------------------------
// slots
// ------------------------------------------------------------

interface Slot { fam: FboFamDef | FboGuardDef; dir: FboSide; kind: 'FBO' | 'GUARD' }

const SLOTS: Slot[] = [
  ...FBO_FAMILIES.flatMap((fam) => {
    const out: Slot[] = []
    const n = Math.max(fam.up, fam.dn)
    for (let i = 0; i < n; i++) {
      if (i < fam.up) out.push({ fam, dir: 'ATAS', kind: 'FBO' })
      if (i < fam.dn) out.push({ fam, dir: 'BAWAH', kind: 'FBO' })
    }
    return out
  }),
  ...FBO_GUARDS.flatMap((g) => {
    const out: Slot[] = []
    const n = Math.max(g.up, g.dn)
    for (let i = 0; i < n; i++) {
      if (i < g.up) out.push({ fam: g, dir: 'ATAS', kind: 'GUARD' })
      if (i < g.dn) out.push({ fam: g, dir: 'BAWAH', kind: 'GUARD' })
    }
    return out
  }),
]

export const FBO_SLOT_COUNT = SLOTS.length // 124

// ------------------------------------------------------------
// util gerbang
// ------------------------------------------------------------

function atrVis(cs: Candle[]): number {
  const trs: number[] = []
  for (let i = Math.max(1, cs.length - 14); i < cs.length; i++) {
    const p = cs[i - 1]
    const c = cs[i]
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)))
  }
  return trs.reduce((a, b) => a + b, 0) / Math.max(1, trs.length)
}

function clampStop(pct: number): number {
  return Math.min(2.6, Math.max(0.5, pct))
}

function simWalk(arah: FboArah, entry: number, stopPct: number, targetPct: number, horizon: Candle[]): { stopHit: boolean; targetHit: boolean; exit: number } {
  const sign = arah === 'NAIK' ? 1 : -1
  const stop = entry * (1 - (sign * stopPct) / 100)
  const target = entry * (1 + (sign * targetPct) / 100)
  for (const c of horizon) {
    const stopT = arah === 'NAIK' ? c.l <= stop : c.h >= stop
    const tgtT = arah === 'NAIK' ? c.h >= target : c.l <= target
    if (stopT) return { stopHit: true, targetHit: false, exit: stop }
    if (tgtT) return { stopHit: false, targetHit: true, exit: target }
  }
  return { stopHit: false, targetHit: false, exit: horizon[horizon.length - 1].c }
}

function netPctOf(arah: FboArah, entry: number, exit: number): number {
  return arah === 'NAIK'
    ? ((exit * (1 - FEE_SELL)) / (entry * (1 + FEE_BUY)) - 1) * 100
    : ((entry * (1 - FEE_BUY)) / (exit * (1 + FEE_SELL)) - 1) * 100
}

interface ForgeOut {
  candles: Candle[]
  level: LevelTruth
  truth: FboArah
  breakArah: FboArah
  entry: number
  exit: number
  movePct: number
  mfePct: number
  baitMfePct: number
  baitNetPct: number
  earlyFadeStopped: boolean
  score: number
}

function structuralStopPct(e: LevelTruth, entry: number, atr: number, fadeArah: FboArah): number {
  // stop struktural = melampaui ekstrem tembusan dgn margin 0.45 ATR
  const margin = 0.45 * atr
  const stopPrice = e.side === 'ATAS' ? e.extreme + margin : e.extreme - margin
  const pct = fadeArah === 'TURUN' ? ((stopPrice - entry) / entry) * 100 : ((entry - stopPrice) / entry) * 100
  return clampStop(pct)
}

export function forgeOnce(seed: string, fam: FboFamDef | FboGuardDef, side: FboSide, diff: string, kind: 'FBO' | 'GUARD'): ForgeOut {
  const r = makeRng(seed)
  const u = 0.5
  const cfg = DIFF_CFG[diff]
  const pen = new Pen(100, u)
  const level = fam.gen(pen, r, u, cfg, side)
  fam.hor(pen, r, u, cfg, side)
  const cs = pen.candles
  const visible = cs.slice(0, FBO_VISIBLE)
  const horizon = cs.slice(FBO_VISIBLE)
  const atr = Math.max(atrVis(visible), 1e-9)
  const entry = visible[FBO_VISIBLE - 1].c
  const exit = cs[FBO_TOTAL - 1].c

  const breakArah: FboArah = side === 'ATAS' ? 'NAIK' : 'TURUN'
  const truth: FboArah = kind === 'FBO' ? (breakArah === 'NAIK' ? 'TURUN' : 'NAIK') : breakArah
  const fadeArah = truth

  const stopPct = structuralStopPct(level, entry, atr, fadeArah)
  const fade = simWalk(fadeArah, entry, stopPct, 2.2, horizon)
  const fadeNet = netPctOf(fadeArah, entry, fade.exit)

  const bait = simWalk(breakArah, entry, 2.2, 2.2, horizon)
  const baitNet = netPctOf(breakArah, entry, bait.exit)
  const sign = breakArah === 'NAIK' ? 1 : -1
  const bestBreak = breakArah === 'NAIK' ? Math.max(...horizon.map((c) => c.h)) : Math.min(...horizon.map((c) => c.l))
  const baitMfePct = sign * ((bestBreak - entry) / entry) * 100

  // gerbang WAIT: trigger close-back (masuk level >= 0.1 ATR) <= 8 candle
  let trigIdx = -1
  const trigLvl = side === 'ATAS' ? level.level - 0.1 * atr : level.level + 0.1 * atr
  for (let i = 0; i < Math.min(8, horizon.length); i++) {
    const c = horizon[i].c
    if (side === 'ATAS' ? c <= trigLvl : c >= trigLvl) { trigIdx = i; break }
  }
  let waitOk = false
  if (trigIdx >= 0) {
    const entryT = horizon[trigIdx].c
    const w = simWalk(fadeArah, entryT, 1.8, 2.2, horizon.slice(trigIdx + 1))
    waitOk = w.targetHit && !w.stopHit
  }

  const movePct = (fadeArah === 'NAIK' ? 1 : -1) * ((exit / entry) - 1) * 100
  const bestFade = fadeArah === 'NAIK' ? Math.max(...horizon.map((c) => c.h)) : Math.min(...horizon.map((c) => c.l))
  const mfePct = (fadeArah === 'NAIK' ? 1 : -1) * ((bestFade - entry) / entry) * 100

  let gateOk: boolean
  let score: number
  if (kind === 'GUARD') {
    const follow = simWalk(breakArah, entry, 2.2, 2.2, horizon)
    gateOk = follow.targetHit && !follow.stopHit && (fade.stopHit || fadeNet <= 0)
    score = (follow.targetHit ? 1 : 0) * 10 - (fade.stopHit || fadeNet <= 0 ? 0 : 3) - (baitMfePct < 0 ? 0 : 1)
  } else {
    const isWaitFam = (fam as FboFamDef).kind === 'WAIT'
    const punish = (fam as FboFamDef).punish
    const fadeOk = fade.targetHit && !fade.stopHit
    gateOk = fadeOk && baitMfePct <= 1.3 && baitNet <= 0.3 && (!isWaitFam || waitOk) && (!punish || fade.stopHit)
    score = Math.min(movePct, mfePct) - (baitMfePct > 1.3 ? (baitMfePct - 1.3) * 4 : 0) - (baitNet > 0.3 ? (baitNet - 0.3) * 4 : 0) - (!isWaitFam || waitOk ? 0 : 3) - (punish && !fade.stopHit ? 3 : 0)
  }

  return {
    candles: cs, level, truth, breakArah, entry, exit,
    movePct, mfePct, baitMfePct, baitNetPct: baitNet,
    earlyFadeStopped: fade.stopHit, score,
  }
}

function forgeWithGate(ns: string, fam: FboFamDef | FboGuardDef, side: FboSide, diff: string, kind: 'FBO' | 'GUARD'): ForgeOut & { seed: string } {
  let best: (ForgeOut & { seed: string }) | null = null
  for (let attempt = 0; attempt < 24; attempt++) {
    const seed = `${ns}::${fam.id}::${side}::${attempt}`
    let out: ForgeOut
    try {
      out = forgeOnce(seed, fam, side, diff, kind)
    } catch {
      continue
    }
    if (!best || out.score > best.score) best = { ...out, seed }
    if (out.score >= 2.2) return { ...out, seed }
  }
  if (!best) throw new Error(`forge gagal total: ${fam.id} ${side} ${diff}`)
  return best
}

function noiseFlippedOf(out: ForgeOut, fam: FboFamDef | FboGuardDef, kind: 'FBO' | 'GUARD'): boolean {
  if (kind === 'GUARD') return false
  const f = fam as FboFamDef
  return f.kind === 'WAIT' ? !(out.movePct >= 2.2 && out.mfePct >= 2.2) : !(out.movePct >= 2.2 && out.mfePct >= 2.2)
}

export function forgeFboExam(num: number, ns = 'fbo100'): FboExam {
  const slot = SLOTS[(num - 1) % SLOTS.length]
  const fam = slot.fam
  const kind = slot.kind
  const diff = FBO_DIFF_CYCLE[(num - 1) % FBO_DIFF_CYCLE.length]
  const out = forgeWithGate(ns, fam, slot.dir, diff, kind)
  return {
    num,
    fam: fam.id,
    label: fam.label,
    diff,
    seed: out.seed,
    kind,
    truth: out.truth,
    breakArah: out.breakArah,
    level: out.level,
    candles: out.candles,
    entry: out.entry,
    exit: out.exit,
    movePct: out.movePct,
    mfePct: out.mfePct,
    baitMfePct: out.baitMfePct,
    baitNetPct: out.baitNetPct,
    earlyFadeStopped: out.earlyFadeStopped,
    noiseFlipped: noiseFlippedOf(out, fam, kind),
  }
}

export function forgeFboSuite(ns = 'fbo100'): FboExam[] {
  return Array.from({ length: FBO_SIZE }, (_, i) => forgeFboExam(i + 1, ns))
}

export function forgeFboGuardSuite(ns = 'fbo100'): FboExam[] {
  return Array.from({ length: FBO_GUARD_SIZE }, (_, i) => forgeFboExam(FBO_SIZE + 1 + i, ns))
}
