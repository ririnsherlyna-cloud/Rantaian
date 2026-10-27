// ============================================================
// UJIAN STOP HUNTING / LIQUIDITY GRAB 100 — "100 skenario saat
// harga MENYAPU AREA LIKUIDITAS, memicu stop-loss, lalu bergerak
// BALIK atau MELANJUTKAN arah tertentu".
//
// Semua 100 ujian adalah STOP HUNT / LIQUIDITY GRAB SEJATI:
//  - POOL LIKUIDITAS nyata (swing low/high, equal lows/highs,
//    session low, range edge, struktur HL, angka bulat, klaster
//    wick, kaskade mayor) — SETIAP ujian membawa GROUND TRUTH
//    pool: jenis, sisi, level, jumlah sentuhan.
//  - SAPUAN: wick menusuk pool, stop-loss terpicu (volume).
//  - PASCA-SAPU DUA KEMUNGKINAN (dari DATA):
//      REVERSAL    — harga berbalik (bait = arah sapuan)
//      CONTINUATION— grab mengisi bahan bakar, harga MELANJUTKAN
//                    arah (bait = pembalik naif) — pembunuh pro.
//  - KEPUTUSAN OTAK 3 PILIH: ENTRY / MENUNGGU KONFIRMASI
//    (trigger reclaim miliknya sendiri) / TIDAK MENGAMBIL POSISI.
//  - FEE MODEL: fee buy 0.1% + fee sell 0.1% — HASIL AKHIR
//    SELALU NET PROFIT. Profit kotor TIDAK PERNAH dipakai.
//  - Protokol anti-hindsight: 60 candle VISIBLE + 14 HORIZON,
//    otak hanya melihat 1..60. Truth SELALU dari DATA.
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import {
  Pen, step, precise, volCalm, boundRange, upLegs, downLegs,
  type BtRng, type DiffCfg,
} from './bulltrap-forge'

// alias lokal (export-rename tidak membuat binding lokal — dipakai tanda tangan horizon di bawah)
type ShRng = BtRng
type ShCfg = DiffCfg

export const SH_VISIBLE = 60
export const SH_HORIZON = 14
export const SH_TOTAL = SH_VISIBLE + SH_HORIZON
export const SH_SIZE = 100

/** fee taker kelas exchange: 0.1% beli + 0.1% jual (WAJIB dihitung) */
export const FEE_BUY = 0.001
export const FEE_SELL = 0.001

/** gerbang profit (dari DATA): REVERSAL >= 2.8% + MFE 3.2%; CONTINUATION >= 2.6% + MFE 3.0% + bait MFE <= 1.1% */
export const SH_MIN_REV_MOVE = 0.028
export const SH_MIN_REV_MFE = 0.032
export const SH_MIN_CONT_MOVE = 0.026
export const SH_MIN_CONT_MFE = 0.03
export const SH_MAX_BAIT_MFE = 0.011

export type ShPoolJenis =
  | 'swing-low' | 'equal-lows' | 'session-low' | 'range-low'
  | 'hl-structure' | 'round-number' | 'wick-cluster' | 'cascade-low'
  | 'swing-high' | 'equal-highs' | 'range-high' | 'squeeze-high'

export interface PoolTruth {
  jenis: ShPoolJenis
  side: 'BAWAH' | 'ATAS'
  level: number // harga pool (ground truth dari data)
  sentuhan: number // jumlah sentuhan pool sebelum sapuan
  sweepIdx: number // indeks candle sapuan (0-based)
}

export type ShPost = 'REVERSAL' | 'CONTINUATION'

export interface ShArchMeta {
  id: string
  label: string
  poolJenis: ShPoolJenis
  post: ShPost
  ilmu: string // anatomi grab (ilmu keilmuan)
  jebakan: string // bagaimana trader profesional dilikuidasi
  tandaTangan: string // tanda tangan point-in-time pada candle keputusan
}

export const SH_ARCHES: ShArchMeta[] = [
  { id: 'sh-swing-low', label: 'Sweep Swing Low (Pivot Tunggal)', poolJenis: 'swing-low', post: 'REVERSAL', ilmu: 'Pivot low tunggal (1 sentuhan, pantulan jauh) -> harga ditarik balik ke dekat pool -> wick menusuk low, stop long tersapu -> tutup kembali di atas low.', jebakan: 'Breakdown-sell terpicu di bawah swing low; likuiditas long diambil; harga ditolak balik ke atas.', tandaTangan: 'pool pivot 1 sentuhan + sapuan wick >= 0.5 ATR + tutup reclaim di atas level + volume sapu menonjol' },
  { id: 'sh-equal-lows', label: 'Raid Equal Lows (Lantai Kembar)', poolJenis: 'equal-lows', post: 'REVERSAL', ilmu: '2-3 sentuhan di level sama (pantulan 1.2-2.2 ATR di antara) -> stop long menumpuk di bawah lantai kembar -> sapuan menembus semua sekaligus -> tutup balik di atas.', jebakan: 'Pro menjual "breakdown lantai kembar"; justru di situlah stop cluster terbesar — makanan likuiditas.', tandaTangan: 'klaster 2-3 sentuhan level sama (bounce 1.2-2.2 ATR) + sapuan serentak + reclaim' },
  { id: 'sh-session-low', label: 'Sweep Session Low (Dasar Grind)', poolJenis: 'session-low', post: 'REVERSAL', ilmu: 'Dasar sesi/harian: 5+ sentuhan lembut dalam grind sempit (pantulan <= 1 ATR) -> low hari menjadi magnet stop -> sapuan di luar grind -> kembali ke dalam.', jebakan: '"Low hari pecah = momentum" — padahal grind sempit menandakan akumulasi; sapuan hanya panen stop.', tandaTangan: 'grind 5+ sentuhan lembut (bounce <= 1 ATR) + sapuan tipis keluar + tutup balik dalam grind' },
  { id: 'sh-range-low', label: 'Range Low Grab (Tepi Range Lebar)', poolJenis: 'range-low', post: 'REVERSAL', ilmu: 'Range lebar (bounce antar-tepi >= 2.6 ATR), lantai tersentuh 2x -> sapuan di luar tepi bawah -> ditolak -> rally menuju tepi atas.', jebakan: 'Pro menjual "range broken"; tepi range justru bank likuiditas — sapuan = distribusi stop, bukan tren.', tandaTangan: 'range lebar >= 2.6 ATR antar sentuhan + sapuan tepi + reclaim ke dalam range' },
  { id: 'sh-trendline-hl', label: 'Shakeout di Bawah HL (Tren Naik)', poolJenis: 'hl-structure', post: 'REVERSAL', ilmu: 'Uptrend HH/HL (mom50 kuat) -> koreksi menembus HL terakhir, stop trend-follower tersapu -> tutup reclaim di atas HL -> markup lanjut.', jebakan: '"Struktur HL patah = reversal" — shakeout di bawah HL adalah tes likuiditas, bukan patah tren.', tandaTangan: 'mom50 >= 1.5 ATR + sapuan di bawah HL + tutup RECLAIM di atas HL + wick penolakan' },
  { id: 'sh-round-number', label: 'Stop Hunt Angka Bulat', poolJenis: 'round-number', post: 'REVERSAL', ilmu: 'Stop cluster menumpuk di bawah angka psikologis (integer) -> sapuan menusuk angka bulat, panen stop massal -> tutup kembali di atasnya.', jebakan: 'Pro menaruh stop 1-2 tick di bawah angka bulat; market maker melihat tumpukan itu dari orderbook.', tandaTangan: 'pool TEPAT di level integer + sapuan menembus angka + tutup reclaim + level terlihat di chart semua orang' },
  { id: 'sh-wick-cluster', label: 'Sweep Klaster Wick Lantai', poolJenis: 'wick-cluster', post: 'REVERSAL', ilmu: '3-4 lilin wick-bawah panjang (>= 55% range) di level mirip = stop terlihat jelas di bawah ekor -> sapuan menembus SEMUA ekor -> tutup balik di atas.', jebakan: '"Support terbukti 4x" — padahal setiap ekor adalah stop baru; sapuan keempat mengambil semuanya.', tandaTangan: 'klaster >= 3 wick panjang level mirip + sapuan di bawah seluruh ekor + tutup reclaim' },
  { id: 'sh-cascade-v', label: 'Kaskade Likuidasi Mayor (V-Balik)', poolJenis: 'cascade-low', post: 'REVERSAL', ilmu: 'Panic dump 4-5 lilin merah besar berturut menembus low mayor + volume klimaks -> likuidasi berantai -> kehampaan penjual -> V-reversal.', jebakan: 'Pro short "momentum kaskade"; kaskade adalah mesin likuidasi — habis bahan bakarnya ia berbalik keras.', tandaTangan: '4+ merah besar berturut (>= 0.7 ATR) + volClimax + di bawah low mayor + belum reclaim saat keputusan' },
  { id: 'sh-swing-high', label: 'Sweep Swing High (Pivot Tunggal)', poolJenis: 'swing-high', post: 'REVERSAL', ilmu: 'Pivot high tunggal -> harga ditarik balik ke dekat pool -> wick menusuk high, stop short tersapu -> tutup kembali di bawah high.', jebakan: 'Breakout-buy terpicu di atas swing high; likuiditas short diambil; harga ditolak turun.', tandaTangan: 'pool pivot 1 sentuhan + sapuan wick atas >= 0.5 ATR + tutup reclaim di bawah level' },
  { id: 'sh-equal-highs', label: 'Raid Equal Highs (Atap Kembar)', poolJenis: 'equal-highs', post: 'REVERSAL', ilmu: '2-3 sentuhan di atap sama -> stop short menumpuk di atasnya -> sapuan menembus semua -> tutup balik di bawah atap.', jebakan: 'Pro membeli "breakout atap kembar"; di atasnya stop cluster short = makanan likuiditas, lalu ditolak.', tandaTangan: 'klaster 2-3 sentuhan atap sama + sapuan serentak + tutup reclaim di bawah' },
  { id: 'sh-range-high', label: 'Range High Grab (Tepi Atas Lebar)', poolJenis: 'range-high', post: 'REVERSAL', ilmu: 'Range lebar, atap tersentuh 2x -> sapuan di luar tepi atas -> ditolak -> drop menuju tepi bawah.', jebakan: 'Pro membeli "range broken ke atas"; tepi atas = bank likuiditas short, sapuan = panen, bukan tren.', tandaTangan: 'range lebar >= 2.6 ATR antar sentuhan + sapuan tepi atas + reclaim ke dalam range' },
  { id: 'sh-squeeze-high', label: 'Kaskade Short Squeeze (Balik Turun)', poolJenis: 'squeeze-high', post: 'REVERSAL', ilmu: 'Short squeeze 4-5 lilin hijau besar berturut menembus high mayor + klimaks -> likuidasi short berantai -> kehampaan pembeli -> balik turun.', jebakan: 'Pro FOMO beli "squeeze breakout"; squeeze adalah mesin likuidasi short — habis bahan bakarnya ia jatuh.', tandaTangan: '4+ hijau besar berturut (>= 0.7 ATR) + volClimax + di atas high mayor + belum reclaim saat keputusan' },
  { id: 'sh-grab-cont-dn', label: 'Grab Bahan Bakar Turun (Lanjut TURUN)', poolJenis: 'equal-lows', post: 'CONTINUATION', ilmu: 'Equal lows disapu -> bounce LEMAH tertahan di bawah pool (LH mikro, volume layu) -> grab hanya mengisi bahan bakar penjualan -> harga LANJUT TURUN.', jebakan: 'Naif membeli "sweep = reversal"; pembeda sejati: reclaim TIDAK terjadi + bounce kering. Grab berakhir jadi fuel markdown.', tandaTangan: 'swept UNRECLAIMED + bounce di bawah pool kering (asym merah, tanpa reclaim) -> arah lanjutan TURUN' },
  { id: 'sh-grab-cont-up', label: 'Grab Bahan Bakar Naik (Lanjut NAIK)', poolJenis: 'equal-highs', post: 'CONTINUATION', ilmu: 'Equal highs disapu -> fade LEMAH di bawah atap (volume kering) -> stop short sudah panen, vakum di atas -> harga LANJUT NAIK.', jebakan: 'Naif men-short "sweep gagal = reversal"; padahal sapuan di atas atap adalah launchpad — likuiditas short jadi bahan bakar markup.', tandaTangan: 'swept UNRECLAIMED ke bawah + fade kering -> arah lanjutan NAIK' },
  { id: 'sh-fake-reclaim-dn', label: 'Reclaim Palsu lalu Lanjut TURUN', poolJenis: 'equal-lows', post: 'CONTINUATION', ilmu: 'Equal lows disapu -> lilin RECLAIM muncul TAPI lemah (badan kecil, volume di bawah rata-rata, tutup nyaris menyentuh level) -> reclaim gagal -> lanjut TURUN.', jebakan: 'Paling licik: penunggu-konfirmasi pun tertipu — reclaim tanpa volume adalah umpan terakhir sebelum markdown.', tandaTangan: 'reclaim LEMAH (badan < 0.3 ATR, volZ rendah, tutup < 0.3 ATR di atas level) -> arah lanjutan TURUN' },
  { id: 'sh-vacuum-hl', label: 'Vakum di Bawah HL (Tren Naik Lanjut)', poolJenis: 'hl-structure', post: 'CONTINUATION', ilmu: 'Uptrend kuat -> koreksi menyapu likuiditas di bawah HL (tutup di bawah, TANPA reclaim) -> likuiditas long terkumpul -> markup LANJUT NAIK.', jebakan: 'Pro men-short "HL patah"; di tren kuat, sapuan di bawah HL adalah vakum likuiditas — launchpad kelanjutan.', tandaTangan: 'mom50 >= 1.5 ATR + swept UNRECLAIMED di bawah HL + tanpa kepanikan -> arah lanjutan NAIK' },
]

export type ShDiff = 'MUDAH' | 'SEDANG' | 'BRUTAL' | 'GILA'

export const SH_DIFF_CYCLE: ShDiff[] = ['MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG', 'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL']

export type ShDiffCfg = DiffCfg

export const SH_DIFF_CFG: Record<ShDiff, ShDiffCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface ShExam {
  num: number
  arch: ShArchMeta
  diff: ShDiff
  seed: string
  pool: PoolTruth
  postGrab: ShPost
  truth: 'NAIK' | 'TURUN' // arah pasca-grab DARI DATA
  bait: 'NAIK' | 'TURUN' // jebakan = kebalikan truth (semua arketipe mengumpan menjauh dari truth)
  candles: Candle[] // SH_TOTAL
  entry: number // close candle ke-60
  exit: number // close candle ke-74
  movePct: number // gerakan truth (close74 vs close60)
  mfePct: number // ekskursi maksimum arah truth
  baitMfePct: number // ekskursi maksimum arah bait (pembatas continuation)
  noiseFlipped: boolean
}

export type { Candle }
export { Pen, step, precise, volCalm, boundRange, upLegs, downLegs, makeRng }
export type { BtRng as ShRng, DiffCfg as ShCfg }

// ------------------------------------------------------------
// pena horizons (14 candle, total wajib SH_TOTAL)
// ------------------------------------------------------------

/** kaki rebound standar (unit u): sum +5.92u */
export const SH_LEGS_UP = [0.95, 0.8, -0.25, 0.85, 0.75, 0.65, -0.2, 0.65, 0.55, 0.5, -0.18, 0.45, 0.4]
/** kaki dump standar: sum -5.92u */
export const SH_LEGS_DN = [-0.95, -0.8, 0.25, -0.85, -0.75, -0.65, 0.2, -0.65, -0.55, -0.5, 0.18, -0.45, -0.4]
/** kaki V-setelah-flush (11): sum +6.6u — dipakai cascade-v */
export const SH_LEGS_V = [1.15, 1.0, 0.9, -0.25, 0.85, 0.8, 0.7, 0.6, 0.5, -0.2, 0.55]
/** kaki dump-setelah-stall (10): sum -5.8u — dipakai continuation turun */
export const SH_LEGS_CONT_DN = [-0.85, -0.75, -0.7, -0.65, -0.6, -0.5, -0.45, -0.35, -0.5, -0.45]
/** kaki rally-setelah-stall (10): sum +5.8u — dipakai continuation naik */
export const SH_LEGS_CONT_UP = [0.85, 0.75, 0.7, 0.65, 0.6, 0.5, 0.45, 0.35, 0.5, 0.45]

function assertTotal(pen: Pen, siapa: string): void {
  if (pen.candles.length !== SH_TOTAL) {
    throw new Error(`horizon ${siapa}: ${pen.candles.length} candle (harus ${SH_TOTAL})`)
  }
}

/** HORIZON rebound (truth NAIK): engulf hijau + kaki naik dip kecil */
export function shRebound(pen: Pen, r: ShRng, u: number, cfg: ShCfg, engulf: number, legs: number[]): void {
  const o = pen.p
  pen.add(o, o + engulf * u, 0.12 * u, 0.14 * u, 2.8 + r.next() * 0.8)
  for (const d of legs) {
    const dip = d < 0
    step(pen, r, u, d * u, dip ? 0.26 : 0.14, dip ? 0.2 : 0.22, dip ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen, 'rebound')
}

/** HORIZON dump (truth TURUN): engulf merah + kaki turun relief kecil */
export function shDump(pen: Pen, r: ShRng, u: number, cfg: ShCfg, engulf: number, legs: number[]): void {
  const o = pen.p
  pen.add(o, o - engulf * u, 0.14 * u, 0.12 * u, 2.8 + r.next() * 0.8)
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.25, relief ? 0.24 : 0.2, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  assertTotal(pen, 'dump')
}

/** HORIZON flush lalu V (kaskade): 1-2 flush merah + engulf hijau + kaki V */
export function shFlushThenV(pen: Pen, r: ShRng, u: number, cfg: ShCfg, flush: number[], engulf: number, legs: number[]): void {
  for (const d of flush) step(pen, r, u, d * u, 0.1, 0.14, 2.6, { ...cfg, noise: cfg.noise * 0.4 })
  const o = pen.p
  pen.add(o, o + engulf * u, 0.1 * u, 0.2 * u, 3.2 + r.next() * 0.8)
  for (const d of legs) {
    const dip = d < 0
    step(pen, r, u, d * u, dip ? 0.24 : 0.13, dip ? 0.18 : 0.2, dip ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen, 'flush-then-V')
}

/** HORIZON stall lemah lalu dump (continuation turun): bounce kering + engulf + kaki dump */
export function shStallThenDump(pen: Pen, r: ShRng, u: number, cfg: ShCfg, stall: number[], engulf: number, legs: number[]): void {
  for (const d of stall) {
    // lilin bounce LEMAH: badan kecil, volume kering — presisi agar "kering" tak terkubur noise
    const o = pen.p
    precise(pen, o, o + d * u, 0.12 * u, 0.14 * u, 0.55 + r.next() * 0.2)
  }
  const o = pen.p
  pen.add(o, o - engulf * u, 0.14 * u, 0.12 * u, 2.6 + r.next() * 0.7)
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.24, relief ? 0.22 : 0.2, relief ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen, 'stall-then-dump')
}

/** HORIZON stall lemah lalu rally (continuation naik): fade kering + engulf + kaki rally */
export function shStallThenRally(pen: Pen, r: ShRng, u: number, cfg: ShCfg, stall: number[], engulf: number, legs: number[]): void {
  for (const d of stall) {
    const o = pen.p
    precise(pen, o, o + d * u, 0.14 * u, 0.12 * u, 0.55 + r.next() * 0.2)
  }
  const o = pen.p
  pen.add(o, o + engulf * u, 0.1 * u, 0.14 * u, 2.6 + r.next() * 0.7)
  for (const d of legs) {
    const dip = d < 0
    step(pen, r, u, d * u, dip ? 0.22 : 0.13, dip ? 0.24 : 0.2, dip ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen, 'stall-then-rally')
}

/** HORIZON reclaim palsu lalu dump (fake-reclaim): reclaim lemah presisi + stall + dump */
export function shFakeReclaimDump(pen: Pen, r: ShRng, u: number, cfg: ShCfg, reclaimUp: number, stall: number[], engulf: number, legs: number[]): void {
  // lilin reclaim LEMAH: badan kecil, volume di bawah rata-rata — presisi (anatomi wajib)
  const o = pen.p
  precise(pen, o, o + reclaimUp * u, 0.1 * u, 0.12 * u, 0.6)
  for (const d of stall) {
    const o2 = pen.p
    precise(pen, o2, o2 + d * u, 0.12 * u, 0.12 * u, 0.5 + r.next() * 0.15)
  }
  const o3 = pen.p
  pen.add(o3, o3 - engulf * u, 0.14 * u, 0.12 * u, 2.4 + r.next() * 0.6)
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.24, relief ? 0.22 : 0.2, relief ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.45 })
  }
  assertTotal(pen, 'fake-reclaim-dump')
}

// ------------------------------------------------------------
// AKUNTANSI TRADE — fee buy + fee sell WAJIB, hasil akhir NET
// ------------------------------------------------------------

export type ShAksi = 'ENTRY' | 'WAIT' | 'SKIP'

export interface ShPlan {
  aksi: ShAksi
  arah: 'NAIK' | 'TURUN'
  targetPct: number // disiplin 1.6-2.9
  triggerLevel?: number // utk WAIT: level reclaim milik otak
}

export interface ShLedger {
  aksi: ShAksi
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
  returnPct: number | null // persentase return (= net, dicatat eksplisit)
  berhasil: boolean | null // netPct > 0; no-trade: null -> dinilai terpisah
  noTradeAman: boolean | null // no-trade: true bila trade bait (arah jebakan) akan rugi net
  noTradeLabel: 'AMAN-HINDARI' | 'KELEWAT-PELUANG' | null
}

function simCore(arah: 'NAIK' | 'TURUN', entry: number, targetPct: number, horizon: Candle[], baseIdx: number): ShLedger {
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

const NO_TRADE = (aman: boolean): ShLedger => ({
  aksi: 'SKIP', mode: 'NO-TRADE', arah: 'NAIK', entry: null, exit: null, target: null,
  targetHit: false, hitCandle: 0, feeBuy: null, feeSell: null, grossPct: null, netPct: null,
  returnPct: null, berhasil: null, noTradeAman: aman, noTradeLabel: aman ? 'AMAN-HINDARI' : 'KELEWAT-PELUANG',
})

/** simulasi eksekusi rencana otak atas 60 visible + 14 horizon.
 *  ENTRY  -> masuk di close60, exit di target/akhir horizon (fee penuh).
 *  WAIT   -> masuk saat trigger reclaim terpenuhi (maks 8 candle horizon),
 *            kalau tak terpenuhi = NO-TRADE.
 *  SKIP   -> NO-TRADE.
 *  Penilaian NO-TRADE: jujur dari DATA — berhasil(aman) bila trade
 *  arah BAIT (jebakan) akan rugi net. */
export function simShTrade(
  plan: ShPlan,
  close60: number,
  horizon: Candle[],
  bait: 'NAIK' | 'TURUN',
  baitTargetPct = 1.9,
): ShLedger {
  if (plan.aksi === 'SKIP') return NO_TRADE(simCore(bait, close60, baitTargetPct, horizon, SH_VISIBLE - 1).netPct !== null && (simCore(bait, close60, baitTargetPct, horizon, SH_VISIBLE - 1).netPct as number) <= 0)
  if (plan.aksi === 'ENTRY') return simCore(plan.arah, close60, plan.targetPct, horizon, SH_VISIBLE - 1)
  // WAIT: cari trigger reclaim
  const lvl = plan.triggerLevel ?? close60
  const dir = plan.arah
  // sudah terpenuhi di keputusan? -> entry di close60
  const ok0 = dir === 'NAIK' ? close60 >= lvl : close60 <= lvl
  if (ok0) return { ...simCore(dir, close60, plan.targetPct, horizon, SH_VISIBLE - 1), mode: 'WAIT-HIT' }
  for (let i = 0; i < Math.min(8, horizon.length); i++) {
    const c = horizon[i].c
    const ok = dir === 'NAIK' ? c >= lvl : c <= lvl
    if (ok) {
      const led = simCore(dir, c, plan.targetPct, horizon.slice(i + 1), SH_VISIBLE + i)
      return { ...led, mode: 'WAIT-HIT' }
    }
  }
  return NO_TRADE((simCore(bait, close60, baitTargetPct, horizon, SH_VISIBLE - 1).netPct as number) <= 0)
}

export function totalFeePct(): number {
  return (FEE_BUY + FEE_SELL) * 100
}

/** RESCALE seluruh candle agar pool tepat di fraksi target (mis. X.37 = bukan angka
 *  psikologis) — memisahkan sinyal "angka bulat" dari arketipe lain secara bersih. */
export function rescalePoolTo(pen: Pen, L0: number, frac: number): number {
  const target = Math.floor(L0) + frac
  const f = target / L0
  for (const c of pen.candles) {
    c.o *= f
    c.h *= f
    c.l *= f
    c.c *= f
  }
  return target
}
