// ============================================================
// UJIAN PUMP AND DUMP 100 — "100 skenario siklus PUMP & DUMP:
// AKUMULASI -> PUMP (markup vertikal) -> PUNCAK (klimaks/
// distribusi) -> DUMP (markdown). Otak harus MENENTUKAN FASE
// dan mengambil keputusan tepat di momen keputusan (candle 60)".
//
// Semua 100 ujian adalah PUMP & DUMP SEJATI (atau PUMP SEHAT
// yang belum selesai — guard anti-bias): setiap ujian membawa
// GROUND TRUTH fase, anatomi pump, dan arah lanjutan DARI DATA.
//
//  - ANATOMI P&D nyata: akselerasi harga ekstrem, lonjakan
//    volume, momentum tak wajar, perubahan likuiditas
//    (kering->banjir->kering), percepatan vertikal, tekanan
//    jual pasca-pump.
//  - PUMB-SIDE GUARD: breakout bervolume dari basis panjang,
//    retest sehat, flick-reclaim, gelombang kedua — truth NAIK.
//    Otak yang menjawab "TURUN" terus-menerus pada semua yang
//    naik cepat akan GAGAL di guard. Pemahaman sejati =
//    membedakan pump yang SEDANG DISTRIBUSIKAN vs pump yang
//    MASIH BERJALAN.
//  - KEPUTUSAN OTAK 3 PILIH: ENTRY / MENUNGGU KONFIRMASI
//    (trigger miliknya sendiri) / TIDAK MENGAMBIL POSISI.
//  - FEE MODEL: fee buy 0.1% + fee sell 0.1% — HASIL AKHIR
//    SELALU NET PROFIT. Profit kotor TIDAK PERNAH dipakai.
//  - Protokol anti-hindsight: 60 candle VISIBLE + 14 HORIZON,
//    otak hanya melihat 1..60. Truth SELALU dari DATA.
// ============================================================

import type { Candle } from './generator'
import {
  Pen, step, precise, boundRange, upLegs, downLegs,
  type BtRng, type DiffCfg,
} from './bulltrap-forge'

export const PD_VISIBLE = 60
export const PD_HORIZON = 14
export const PD_TOTAL = PD_VISIBLE + PD_HORIZON
export const PD_SIZE = 100

/** fee taker kelas exchange: 0.1% beli + 0.1% jual (WAJIB dihitung) */
export const FEE_BUY = 0.001
export const FEE_SELL = 0.001

/** gerbang profit (dari DATA):
 *  DUMP (truth turun)  : gerak >= 2.8% + MFE >= 3.2%
 *  PUMP (truth naik)   : gerak >= 3.0% + MFE >= 3.4%
 *  PEMBUNUH            : + MFE arah bait <= 1.1% (target disiplin
 *  otak 1.6%+ MUSTAHIL tersentuh oleh bait — pembaca naif
 *  dijamin rugi setelah fee). */
export const PD_MIN_DUMP_MOVE = 0.028
export const PD_MIN_DUMP_MFE = 0.032
export const PD_MIN_PUMP_MOVE = 0.03
export const PD_MIN_PUMP_MFE = 0.034
export const PD_MAX_BAIT_MFE = 0.011

export type PdFase = 'AKUMULASI' | 'PUMP' | 'PUNCAK' | 'DUMP'

/** level kunci ground truth (diisi generator, dari data) */
export interface PdLevels {
  puncak: number // harga puncak pump
  dasar: number // dasar akumulasi
}
export interface PdArchMeta {
  id: string
  label: string
  fase: PdFase
  pembunuh: boolean // arketipe yang mengumpan pembacaan naif TERJADI LALU BERBALIK
  ilmu: string // anatomi siklus (ilmu keilmuan)
  jebakan: string // bagaimana trader profesional dilikuidasi
  tandaTangan: string // tanda tangan point-in-time pada candle ke-60
}

export const PD_ARCHES: PdArchMeta[] = [
  // ---------- DUMP-SIDE (truth TURUN) ----------
  { id: 'pd-climax-blowoff', label: 'Klimaks Blow-Off di Puncak Pump', fase: 'PUNCAK', pembunuh: false,
    ilmu: 'Pump berakselerasi -> lilin klimaks volume raksasa + wick atas lebar di puncak jendela -> pembeli terakhir menyerap semua -> bahan bakar habis -> markdown.',
    jebakan: 'FOMO klimaks: "pump sekuat ini pasti lanjut". Volume terbesar sejarah justru tanda distribusi pemegang besar ke pengejar.',
    tandaTangan: 'volClimax + dist EMA21 >= 2.2 ATR + wick atas/doji/bearEngulf + pos puncak jendela >= 0.85' },
  { id: 'pd-exhaust-vertical', label: 'Vertikal Tanpa Napas (Exhaustion)', fase: 'PUMP', pembunuh: false,
    ilmu: '12+ lilin naik nyaris tanpa koreksi, jarak dari EMA21 ekstrem, RSI mengunci overbought -> mean reversion tak tertahankan.',
    jebakan: 'Chase vertikal; pro menunggu pullback yang TIDAK PERNAH datang sebelum harga memangkas seluruh kaki terakhir.',
    tandaTangan: 'dist EMA21 >= 3.0 ATR + RSI >= 78 + consecutiveUp >= 5 + tanpa koreksi berarti' },
  { id: 'pd-absorb-top', label: 'Absorpsi di Puncak (Stall Bervolume)', fase: 'PUNCAK', pembunuh: false,
    ilmu: 'Pump berhenti di puncak: 6-8 lilin volume TETAP BESAR tapi harga stagnan — setiap buy order ditampung penjual besar (distribusi diam-diam).',
    jebakan: '"Stall = konsolidasi sebelum moon" — padahal volume besar tanpa progres = serahan diam-diam; begitu buyer habis, lantai hilang.',
    tandaTangan: 'volMean 8 terakhir tinggi + |net 8| <= 0.9 ATR + pos puncak jendela >= 0.78' },
  { id: 'pd-divergence-hh', label: 'Divergensi Volume pada Higher-High', fase: 'PUNCAK', pembunuh: false,
    ilmu: 'Pump membuat HH berikutnya TAPI volume tiap dorongan makin menyusut dan badan lilin makin kecil — dorongan kehabisan bensin.',
    jebakan: '"HH = trend intact"; divergensi volume adalah suara pertama pompa yang kehabisan udara.',
    tandaTangan: 'hh + volume dorongan terakhir < dorongan sebelumnya + badan menyusut + mom3 melambat' },
  { id: 'pd-wick-reject', label: 'Klaster Penolakan Wick di Atap', fase: 'PUNCAK', pembunuh: false,
    ilmu: '3+ lilin wick-atas panjang di zona puncak: setiap dorongan ditolak keras oleh supply — pembeli habis di atap yang sama.',
    jebakan: 'Setiap wick dibaca "tes yang lolos"; klaster penolakan adalah dinding supply — tolakan ketiga memulai markdown.',
    tandaTangan: '>= 3 wick atas >= 45% range dalam 8 lilin + pos puncak jendela >= 0.8 + tanpa breakout' },
  { id: 'pd-lh-distribution', label: 'Lower-High Distribusi Pasca-Pump', fase: 'PUNCAK', pembunuh: false,
    ilmu: 'Puncak P1 -> pullback -> rally kedua berhenti DI BAWAH P1 dengan badan & volume menyusut (LH) — struktur distribusi klasik.',
    jebakan: '"Pullback selesai, siap push baru" — LH menyusut adalah momen pemegang besar melepas sisa posisi.',
    tandaTangan: 'lh + pos jendela >= 0.7 + badan rally kedua menyusut + volume layu + tanpa divBull' },
  { id: 'pd-break-support', label: 'Breakdown Support Distribusi', fase: 'DUMP', pembunuh: false,
    ilmu: 'Pump -> range distribusi sempit di puncak (merah menguasai) -> tutup MENEMBUS support range dengan volume merah dominan -> markdown dimulai.',
    jebakan: '"Breakdown tipis = shakeout" — distribusi lantai hilang; breakout-buys jebakan dan holder ditawan bersama.',
    tandaTangan: 'recentBreakDown + volZ merah >= 0.5 + tanpa reclaim + pos turun dari puncak' },
  { id: 'pd-cascade-continue', label: 'Kaskade Dump Berjalan (Belum Selesai)', fase: 'DUMP', pembunuh: true,
    ilmu: 'Kaskade jual 4+ merah besar berturut, volume banjir, harga jatuh dari puncak — kaskade likuidasi BELUM menemukan lantai saat keputusan.',
    jebakan: 'Paling klasik: dip-buyer "sudah -8%, murah" — kaskade tidak peduli murah; tanpa reclaim & tanpa engulf, ia lanjut mengosongkan.',
    tandaTangan: 'consecDownBig >= 3 + vol tinggi + TANPA bullEngulf/reclaim + pos jendela anjlok' },
  { id: 'pd-deadcat-bounce', label: 'Dead Cat Bounce (Rebound Kering)', fase: 'DUMP', pembunuh: true,
    ilmu: 'Dump besar -> bounce 3-4 lilin hijau LEMAH (volume kering, badan kecil) tertahan jauh di bawah puncak dan di bawah EMA21 jatuh -> lanjut turun.',
    jebakan: '"Reversal! Hijau muncul" — bounce tanpa volume adalah napas mayat; pemegang memakai bounce untuk lepas, bukan pembeli baru.',
    tandaTangan: 'mom50 <= -2 ATR + volZ bounce <= 0.2 + badan kecil + masih di bawah EMA21 turun & puncak' },
  { id: 'pd-pump-flush-top', label: 'Flush Pertama dari Puncak', fase: 'DUMP', pembunuh: false,
    ilmu: 'Pump vertikal -> SATU lilin flush merah besar mencabut beberapa kaki pump sekaligus (tutup jauh di bawah puncak) dengan volume klimaks — dump resmi dimulai.',
    jebakan: '"Cuma shakeout biasa" — flush pertama dari pump vertikal adalah lepas-panen; menunggu "pulih" berarti menikah dengan posisi rugi.',
    tandaTangan: 'bearEngulf besar + volClimax + mencabut >= 2 kaki pump + tanpa reclaim saat keputusan' },
  // ---------- PUMP-SIDE GUARD (truth NAIK) ----------
  { id: 'pd-breakout-markup', label: 'Breakout Bervolume dari Basis Panjang', fase: 'PUMP', pembunuh: false,
    ilmu: 'Basis akumulasi sunyi 30+ lilin -> breakout dengan volume NYATA (>= 1.2 sigma) dari rentang sempit -> markup Wyckoff dimulai.',
    jebakan: '(Guard anti-bias) otak TIDAK boleh menuduh "pump&dump" pada breakout bervolume dari basis panjang — ini markup asli fase awal.',
    tandaTangan: 'basis panjang sempit + recentBreakUp + volZ >= 1.2 + dist EMA21 masih <= 2.6 ATR + slope EMA berbalik naik' },
  { id: 'pd-retest-continue', label: 'Retest Tahan (Pullback Kering)', fase: 'PUMP', pembunuh: false,
    ilmu: 'Pump -> pullback dangkal ke zona breakout, volume KERING, harga bertahan di atas level -> markup kedua dimulai.',
    jebakan: '(Guard anti-bias) "pump selesai, waktunya dump" — pullback kering yang menahan level adalah napas markup, bukan dump.',
    tandaTangan: 'retestHold + mom24/mom50 positif + vol pullback kering + struktur HL utuh' },
  { id: 'pd-flick-reclaim', label: 'Flick Dump yang Direbut Balik', fase: 'PUMP', pembunuh: true,
    ilmu: 'Pump -> FICK dump 2-3 merah tajam memicu panik -> SATU lilin hijau besar volume tinggi merebut kembali zona putus (reclaim) -> pompa menyala lagi.',
    jebakan: 'Pembunuh pembaca naif: men-short "dump dimulai" tepat sebelum candle reclaim — panik yang dijual justru dibeli institusi.',
    tandaTangan: 'recentBreakDown TAPI last bullEngulf volZ >= 1 merebut balik level + mom50 masih positif' },
  { id: 'pd-second-wave', label: 'Gelombang Kedua dari Higher-Low', fase: 'PUMP', pembunuh: false,
    ilmu: 'Pump W1 -> koreksi terkendali (retrace 40-60%, HL) -> launch W2: dorongan hijau volume menaik menembus mikro-HH -> W2 berjalan.',
    jebakan: '(Guard anti-bias) koreksi W1 dibaca "dump" padahal HL + volume naik = pompa isi bahan bakar gelombang kedua.',
    tandaTangan: 'HL + volume dorongan menaik + break mikro-HH + mom50 positif kuat' },
]

export type PdDiff = 'MUDAH' | 'SEDANG' | 'BRUTAL' | 'GILA'

export const PD_DIFF_CYCLE: PdDiff[] = ['MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG', 'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL']

export type PdDiffCfg = DiffCfg

export const PD_DIFF_CFG: Record<PdDiff, PdDiffCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface PdExam {
  num: number
  arch: PdArchMeta
  diff: PdDiff
  seed: string
  fase: PdFase // fase ground truth saat keputusan
  truth: 'NAIK' | 'TURUN' // arah lanjutan DARI DATA
  bait: 'NAIK' | 'TURUN' // jebakan = kebalikan truth
  candles: Candle[] // PD_TOTAL
  levels: PdLevels // puncak & dasar ground truth
  entry: number // close candle ke-60
  exit: number // close candle ke-74
  movePct: number // gerakan truth (close74 vs close60)
  mfePct: number // ekskursi maksimum arah truth
  baitMfePct: number // ekskursi maksimum arah bait (pembatas pembunuh)
  noiseFlipped: boolean
}

export type { Candle }
export { Pen, step, precise, boundRange, upLegs, downLegs }
// alias lokal DIPAKAI juga di dalam file (bukan sekadar re-ekspor)
export type PdRng = BtRng
export type PdCfg = DiffCfg

// ------------------------------------------------------------
// pena horizons (14 candle, total wajib PD_TOTAL)
// ------------------------------------------------------------

/** kaki dump standar (13): sum -5.92u */
export const PD_LEGS_DN = [-0.95, -0.8, 0.25, -0.85, -0.75, -0.65, 0.2, -0.65, -0.55, -0.5, 0.18, -0.45, -0.4]
/** kaki pump lanjut standar (13): sum +5.92u */
export const PD_LEGS_UP = [0.95, 0.8, -0.25, 0.85, 0.75, 0.65, -0.2, 0.65, 0.55, 0.5, -0.18, 0.45, 0.4]
/** kaki kaskade tajam (12): sum -6.9u — pasca 2 flush */
export const PD_LEGS_CASCADE = [-1.15, -1.0, -0.9, 0.25, -0.85, -0.8, -0.7, -0.6, -0.5, 0.2, -0.55, -0.3]
/** kaki pump W2 (12): sum +6.7u */
export const PD_LEGS_W2 = [1.1, 1.0, 0.9, -0.25, 0.85, 0.8, 0.7, 0.6, 0.55, -0.2, 0.65, 0.6]
/** kaki dump dalam (10): sum -5.8u — pasca bounce/deadcat */
export const PD_LEGS_DN_DEEP = [-0.85, -0.75, -0.7, -0.65, -0.6, -0.5, -0.45, -0.35, -0.5, -0.45]

function assertTotal(pen: Pen, siapa: string): void {
  if (pen.candles.length !== PD_TOTAL) {
    throw new Error(`horizon ${siapa}: ${pen.candles.length} candle (harus ${PD_TOTAL})`)
  }
}

/** HORIZON dump (truth TURUN): engulf merah + kaki dump dip kecil */
export function pdDump(pen: Pen, r: PdRng, u: number, cfg: PdCfg, engulf: number, legs: number[]): void {
  const o = pen.p
  pen.add(o, o - engulf * u, 0.14 * u, 0.12 * u, 2.8 + r.next() * 0.8)
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.25, relief ? 0.24 : 0.2, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen, 'dump')
}

/** HORIZON pump lanjut (truth NAIK): engulf hijau + kaki naik dip kecil */
export function pdPumpOn(pen: Pen, r: PdRng, u: number, cfg: PdCfg, push: number, legs: number[]): void {
  const o = pen.p
  pen.add(o, o + push * u, 0.12 * u, 0.14 * u, 2.8 + r.next() * 0.8)
  for (const d of legs) {
    const dip = d < 0
    step(pen, r, u, d * u, dip ? 0.26 : 0.14, dip ? 0.2 : 0.22, dip ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen, 'pump-on')
}

/** HORIZON flush kaskade (2 flush besar + kaki kaskade): utk cascade-continue & pump-flush-top */
export function pdFlushCascade(pen: Pen, r: PdRng, u: number, cfg: PdCfg, flush: number[], legs: number[]): void {
  for (const d of flush) step(pen, r, u, d * u, 0.1, 0.14, 2.6, { ...cfg, noise: cfg.noise * 0.4 })
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.25, relief ? 0.24 : 0.2, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen, 'flush-cascade')
}

/** HORIZON stall lemah + dump dalam (deadcat: 3 stall kering + engulf + kaki dalam) */
export function pdStallDumpDeep(pen: Pen, r: PdRng, u: number, cfg: PdCfg, stall: number[], engulf: number, legs: number[]): void {
  for (const d of stall) {
    const o = pen.p
    precise(pen, o, o + d * u, 0.12 * u, 0.14 * u, 0.55 + r.next() * 0.2)
  }
  const o = pen.p
  pen.add(o, o - engulf * u, 0.14 * u, 0.12 * u, 2.4 + r.next() * 0.7)
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.24, relief ? 0.22 : 0.2, relief ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen, 'stall-dump-deep')
}

// ------------------------------------------------------------
// AKUNTANSI TRADE — fee buy + fee sell WAJIB, hasil akhir NET
// ------------------------------------------------------------

export type PdAksi = 'ENTRY' | 'WAIT' | 'SKIP'

export interface PdPlan {
  aksi: PdAksi
  arah: 'NAIK' | 'TURUN'
  targetPct: number // disiplin 1.6-2.9
  triggerLevel?: number // utk WAIT: level konfirmasi milik otak
}

export interface PdLedger {
  aksi: PdAksi
  mode: 'ENTRY' | 'WAIT-HIT' | 'NO-TRADE'
  arah: 'NAIK' | 'TURUN'
  entry: number | null
  exit: number | null
  target: number | null
  targetHit: boolean
  hitCandle: number // 0 = tak tersentuh / no-trade; 60..74
  feeBuy: number | null
  feeSell: number | null
  grossPct: number | null // profit kotor — TIDAK dipakai sebagai hasil akhir
  netPct: number | null // profit BERSIH setelah fee buy + fee sell
  returnPct: number | null
  berhasil: boolean | null
  noTradeAman: boolean | null // no-trade: true bila trade bait (arah jebakan) akan rugi net
  noTradeLabel: 'AMAN-HINDARI' | 'KELEWAT-PELUANG' | null
}

function simCore(arah: 'NAIK' | 'TURUN', entry: number, targetPct: number, horizon: Candle[], baseIdx: number): PdLedger {
  const sign = arah === 'NAIK' ? 1 : -1
  const target = entry * (1 + (sign * targetPct) / 100)
  let exit = horizon[horizon.length - 1].c
  let hitCandle = 0
  for (let i = 0; i < horizon.length; i++) {
    const c = horizon[i]
    const touched = arah === 'NAIK' ? c.h >= target : c.l <= target
    if (touched) {
      exit = target
      hitCandle = baseIdx + i + 1
      break
    }
  }
  const feeBuy = entry * FEE_BUY
  const feeSell = exit * FEE_SELL
  const grossPct = arah === 'NAIK' ? (exit / entry - 1) * 100 : (1 - exit / entry) * 100
  const netPct =
    arah === 'NAIK'
      ? ((exit * (1 - FEE_SELL)) / (entry * (1 + FEE_BUY)) - 1) * 100
      : ((entry * (1 - FEE_BUY)) / (exit * (1 + FEE_SELL)) - 1) * 100
  return {
    aksi: 'ENTRY', mode: hitCandle > 0 ? 'WAIT-HIT' : 'ENTRY', arah, entry, exit, target,
    targetHit: hitCandle > 0, hitCandle, feeBuy, feeSell, grossPct, netPct, returnPct: netPct,
    berhasil: netPct > 0, noTradeAman: null, noTradeLabel: null,
  }
}

const NO_TRADE = (aman: boolean): PdLedger => ({
  aksi: 'SKIP', mode: 'NO-TRADE', arah: 'NAIK', entry: null, exit: null, target: null,
  targetHit: false, hitCandle: 0, feeBuy: null, feeSell: null, grossPct: null, netPct: null,
  returnPct: null, berhasil: null, noTradeAman: aman, noTradeLabel: aman ? 'AMAN-HINDARI' : 'KELEWAT-PELUANG',
})

function baitNet(arah: 'NAIK' | 'TURUN', close60: number, horizon: Candle[]): number {
  return simCore(arah, close60, 1.9, horizon, PD_VISIBLE - 1).netPct ?? 0
}

/** simulasi eksekusi rencana otak atas 60 visible + 14 horizon.
 *  ENTRY  -> masuk di close60, exit di target/akhir horizon (fee penuh).
 *  WAIT   -> masuk saat trigger konfirmasi terpenuhi (maks 8 candle horizon),
 *            kalau tak terpenuhi = NO-TRADE.
 *  SKIP   -> NO-TRADE.
 *  Penilaian NO-TRADE: jujur dari DATA — berhasil(aman) bila trade
 *  arah BAIT (jebakan) akan rugi net. */
export function simPdTrade(
  plan: PdPlan,
  close60: number,
  horizon: Candle[],
  bait: 'NAIK' | 'TURUN',
  baitTargetPct = 1.9,
): PdLedger {
  if (plan.aksi === 'SKIP') return NO_TRADE(baitNet(bait, close60, horizon) <= 0)
  if (plan.aksi === 'ENTRY') return simCore(plan.arah, close60, plan.targetPct, horizon, PD_VISIBLE - 1)
  // WAIT: cari trigger konfirmasi
  const lvl = plan.triggerLevel ?? close60
  const dir = plan.arah
  const ok0 = dir === 'NAIK' ? close60 >= lvl : close60 <= lvl
  if (ok0) return { ...simCore(dir, close60, plan.targetPct, horizon, PD_VISIBLE - 1), mode: 'WAIT-HIT' }
  for (let i = 0; i < Math.min(8, horizon.length); i++) {
    const c = horizon[i].c
    const ok = dir === 'NAIK' ? c >= lvl : c <= lvl
    if (ok) {
      const led = simCore(dir, c, plan.targetPct, horizon.slice(i + 1), PD_VISIBLE + i)
      return { ...led, mode: 'WAIT-HIT' }
    }
  }
  return NO_TRADE(baitNet(bait, close60, horizon) <= 0)
}

export function totalFeePct(): number {
  return (FEE_BUY + FEE_SELL) * 100
}

/** RESCALE seluruh candle agar puncak pump tepat di fraksi target (mis. X.43) —
 *  memisahkan anatomi arketipe dari kebetulan angka secara bersih. */
export function rescalePeakTo(pen: Pen, P0: number, frac: number): number {
  const target = Math.floor(P0) + frac
  const f = target / P0
  for (const c of pen.candles) {
    c.o *= f
    c.h *= f
    c.l *= f
    c.c *= f
  }
  return target
}
