// ============================================================
// UJIAN BEAR TRAP 100 — "100 skenario bear trap yang menjebak
// trader profesional & berpengalaman sekalipun".
//
// Semua 100 ujian adalah BEAR TRAP: grafik yang memancing SHORT
// dengan bujukan sekuat mungkin (fake breakdown, sapuan low,
// kapitulasi panik, bear flag), lalu MELANTAI BALIK KE ATAS —
// para penjual ditelan. Momen keputusan = DASAR BUKJUKAN —
// persis saat trader profesional menaruh posisi short.
//
// Protokol (cermin ujian bull trap, arah dibalik):
//  - 60 candle VISIBLE + 14 HORIZON. Otak hanya melihat 1..60.
//  - Truth dari DATA (tanda close[73] vs close[59]), gerbang
//    profit: jebakan wajib rebound >= 2.8% DAN ekskursi menguntungkan
//    (MFE) >= 3.2% — target disiplin otak (<= 2.9%) wajib terjangkau
//    bila vonis benar; guard wajib jatuh >= 3.0% (MFE -3.4%).
//  - FEE MODEL: fee buy 0.1% + fee sell 0.1% — HASIL AKHIR
//    SELALU NET PROFIT, profit kotor tidak pernah dipakai.
//  - RENCANA TRADE: otak menentukan arah + entry + TARGET
//    keuntungan; simulator menjalankan horizon: target tersentuh
//    = exit di target, tidak = exit di akhir horizon.
//  - GUARD anti-bias: 24 grafik breakdown/flag/rally SEHAT
//    (truth TURUN) — otak yang membeli terus-menerus tanpa
//    membaca anatomi akan GAGAL di guard. Pemahaman sejati =
//    membedakan jebakan dari momentum asli.
//  - Setiap arketipe punya TANDA TANGAN point-in-time yang
//    bisa dibaca pada candle ke-60 (ilmu, bukan tebak-tebakan).
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import { Pen, step, precise, volCalm, boundRange, upLegs, downLegs, type BtRng } from './bulltrap-forge'

export const SR_VISIBLE = 60
export const SR_HORIZON = 14
export const SR_TOTAL = SR_VISIBLE + SR_HORIZON
export const SR_SIZE = 100
export const SR_GUARD_SIZE = 24

/** fee taker kelas exchange: 0.1% beli + 0.1% jual (WAJIB dihitung) */
export const FEE_BUY = 0.001
export const FEE_SELL = 0.001

/** gerbang profit: trap rebound >= 2.8% + MFE >= 3.2%, guard jatuh >= 3.0% + MFE -3.4% */
export const SR_MIN_TRAP_MOVE = 0.028
export const SR_MIN_TRAP_MFE = 0.032
export const SR_MIN_GUARD_MOVE = 0.03
export const SR_MIN_GUARD_MFE = 0.034

export type SrArch =
  | 'sr-classic'
  | 'sr-trend-exhaust'
  | 'sr-sweep-low'
  | 'sr-double-bottom'
  | 'sr-parabolic-crash'
  | 'sr-corr-rally'
  | 'sr-bearflag-fail'
  | 'sr-capitulation-vacuum'
  | 'sr-spring'
  | 'sr-gap-panic'
  | 'sr-reacc-fake'
  | 'sr-triple-test'

export type SrGuardArch = 'g-real-breakdown' | 'g-healthy-bearflag' | 'g-rally-downtrend'

export interface SrArchMeta {
  id: SrArch | SrGuardArch
  label: string
  ilmu: string // anatomi fase jebakan (ilmu keilmuan)
  jebakan: string // bagaimana trader profesional dilikuidasi
  tandaTangan: string // tanda tangan point-in-time pada candle keputusan
}

export const SR_ARCHES: SrArchMeta[] = [
  { id: 'sr-classic', label: 'Classic Fake Breakdown (Volume Lemah)', ilmu: 'Range panjang -> breakdown 2 lilin di bawah support TAPI volume di bawah rata-rata -> stall di bawah level tanpa low baru -> engulf hijau mencabut breakdown.', jebakan: 'Trader pro melihat "breakdown confirmed" dan menjual/short; volume tipis yang mengkhianati diabaikan karena panik struktur.', tandaTangan: 'breakdown recent + volZ breakdown <= 0 + momentum mati (stall) di bawah support tanpa follow-through' },
  { id: 'sr-trend-exhaust', label: 'Breakdown Kuat di Tren Tua (Exhaustion)', ilmu: 'Downtrend panjang akselerasi -> breakdown di bawah low terakhir saat RSI ekstrem & harga jauh di bawah EMA21 -> penjual terakhir kelelahan.', jebakan: '"Weakness is truth" — pro menambah short di breakdown tren tua; penjual terakhir habis tepat di situ.', tandaTangan: 'dist EMA21 <= -2.4 ATR + mom12 <= -3 ATR + RSI oversold ekstrem + wick kelelahan bawah' },
  { id: 'sr-sweep-low', label: 'Stop Hunt Sweep di Bawah Low', ilmu: 'Konsolidasi di atas low lama -> wick menusuk low (menyapu stop long & trigger sell-stop) -> ditutup KEMBALI di atas low.', jebakan: 'Breakdown-sell terpicu di bawah low; long dilikuidasi; keduanya terjebak saat harga ditolak balik ke atas.', tandaTangan: 'sweptLow + wick bawah >= 40% + volume sapuan >= 1.2 sigma + tutup di atas low' },
  { id: 'sr-double-bottom', label: 'Double Bottom dengan Fake New Low', ilmu: 'Dasar B1 -> leher -> dump kedua menembus B1 sedikit (fake new low) dengan badan menyusut & volume layu -> stall di dasar.', jebakan: 'Pro menjual "breakdown all-time low"; divergensi momentum (RSI higher-low) yang tersimpan tidak dilihat.', tandaTangan: 'divBull pada pivot + posisi di dasar jendela + badan dump kedua menyusut + klaster wick lantai' },
  { id: 'sr-parabolic-crash', label: 'Parabolic Capitulation Crash', ilmu: 'Akselerasi turun makin curam -> lilin klimaks volume raksasa + wick bawah lebar (kapitulasi) -> penjual terakhir masuk di dasar.', jebakan: 'Panik parabolik; pro yang "ride the trend" dilikuidasi saat derajat kemiringan membalik tanpa peringatan.', tandaTangan: 'dist EMA21 ekstrem negatif + volClimax + wick kapitulasi di dasar jendela' },
  { id: 'sr-corr-rally', label: 'Correction Dump dalam Uptrend', ilmu: 'Uptrend HH/HL -> dump tajam 8-10 lilin menembus higher-low minor -> berhenti tepat di zona demand/EMA naik.', jebakan: 'Pro menyebutnya "trend reversal confirmed" (struktur LL mikro + momentum); tren besar masih naik dan menelan semua short.', tandaTangan: 'mom50 masih positif kuat + dump mencapai zona demand/EMA + badan dump menyusut + wick penolakan lantai' },
  { id: 'sr-bearflag-fail', label: 'Bear Flag yang Gagal (Akumulasi)', ilmu: 'Pole turun tajam -> flag naik landai SEPERTI buku teks, TAPI volume hijau dalam flag menguasai (akumulasi) -> pecah ke ATAS.', jebakan: 'Setup paling dicintai pro: "bear flag = short". Volume hijau dalam flag membuktikan akumulasi diam-diam.', tandaTangan: 'mom24 masih kuat negatif (pole) + netto flag stagnan + volAsym5 hijau + tanpa dorongan merah' },
  { id: 'sr-capitulation-vacuum', label: 'Capitulation Vacuum', ilmu: 'Uptrend/range -> sapu low -> capitulation squeeze vertikal melikuidasi buyer -> stall di udara tanpa penjual lanjutan (volume padam).', jebakan: 'Pro menjual "breakdown berkekuatan"; kapitulasi tanpa penjual nyata hanya reaksi likuidasi, lalu melantai balik ke atas.', tandaTangan: 'mom12 dump <= -2 ATR tapi mom3 & netto 5 lilin berbalik + volume stall padam' },
  { id: 'sr-spring', label: 'SPRING — Wyckoff After Accumulation', ilmu: 'Range akumulasi di dasar dengan penolakan berulang -> dorongan terakhir menusuk tepi bawah dengan volume LEMAH -> tutup kembali di dalam tepi.', jebakan: 'Pro menjual "breakdown dari akumulasi"; Wyckoff menyebutnya tes terakhir (spring) sebelum markup.', tandaTangan: 'sweptLow tipis + volZ <= 0.3 + tutup balik di dalam range + posisi jendela <= 40%' },
  { id: 'sr-gap-panic', label: 'Vertical Panic Cascade', ilmu: 'Basis sunyi -> 12+ lilin vertikal hampir tanpa koreksi -> jarak dari EMA21 ekstrem -> mean reversion tak tertahankan.', jebakan: 'Panik FOMO-short; pro yang menunggu "pullback sehat" justru dilikuidasi leverage saat reversion datang sekaligus.', tandaTangan: 'dist EMA21 <= -3.5 ATR + RSI <= 15 + volClimax + consecutiveDown >= 5' },
  { id: 'sr-reacc-fake', label: 'Fake Re-Distribution (Range Dasar)', ilmu: 'Range lebar di dasar dengan breakdown gagal berulang & volume hijau > merah -> dorongan terakhir menembus tepi bawah tanpa keyakinan.', jebakan: 'Terbaca "re-distribution selesai, siap markdown"; sebenarnya posisi besar diakumulasi di setiap breakdown gagal.', tandaTangan: 'volAsym zona bawah positif + klaster wick lantai >= 3 + breakdown volZ <= 0.3' },
  { id: 'sr-triple-test', label: 'Triple Test Dasar (Exhaustion)', ilmu: 'Tiga kali menguji support yang sama: volume & badan makin menyusut, RSI makin naik -> pantulan ketiga = titik balik.', jebakan: 'Setiap tes "tampak breakdown berikutnya"; penjual di tes ketiga menanggung seluruh markup balik.', tandaTangan: 'klaster tolakan >= 3 di lantai + closes HL + volume tes menyusut + volZ breakdown <= 0.5' },
]

export const SR_GUARD_ARCHES: SrArchMeta[] = [
  { id: 'g-real-breakdown', label: 'GUARD: Breakdown Sehat Volume Besar', ilmu: 'Range -> breakdown dengan volume >= 1.5 sigma, ekstensi moderat, RSI sehat -> retest GAGAL (tahan di bawah) -> lanjut turun.', jebakan: '(Kontrol anti-bias) otak TIDAK boleh menuduh trap pada breakdown bervolume nyata — ini momentum asli.', tandaTangan: 'volZ breakdown >= 1.2 + retestHold + momen lanjutan + badan penuh' },
  { id: 'g-healthy-bearflag', label: 'GUARD: Bear Flag Sehat', ilmu: 'Pole turun kuat -> flag landai dengan volume MERAH tetap menguasai -> breakdown flag bervolume -> lanjut turun.', jebakan: '(Kontrol anti-bias) flag dengan aliran penjual adalah continuation, bukan akumulasi.', tandaTangan: 'mom24 kuat negatif + volAsym5 merah + breakdown bervolume nyata' },
  { id: 'g-rally-downtrend', label: 'GUARD: Rally dalam Downtrend', ilmu: 'Downtrend LH/LL -> rally volume kery bertahan di bawah EMA jatuh -> lilin penolakan merah badan penuh -> lanjut turun.', jebakan: '(Kontrol anti-bias) rally dalam tren turun bukan reversal — mom50 negatif melindunginya.', tandaTangan: 'mom50 <= -2 ATR + lilin penolakan merah badan penuh + volume rally kering' },
]

export type SrDiff = 'MUDAH' | 'SEDANG' | 'BRUTAL' | 'GILA'

export const SR_DIFF_CYCLE: SrDiff[] = ['MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG', 'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL']

export interface SrDiffCfg { noise: number; subtle: number; conviction: number }

export const SR_DIFF_CFG: Record<SrDiff, SrDiffCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface SrExam {
  num: number
  arch: SrArchMeta
  diff: SrDiff
  seed: string
  kind: 'TRAP' | 'GUARD'
  candles: Candle[] // SR_TOTAL
  entry: number // close candle ke-60
  exit: number // close candle ke-74
  truth: 'NAIK' | 'TURUN' // dari DATA
  movePct: number // (exit/entry - 1) * 100
  mfePct: number // ekskursi menguntungkan maksimum horizon (arah truth)
  noiseFlipped: boolean
}

export type { Candle }
export { Pen, step, precise, volCalm, boundRange, upLegs, downLegs, makeRng }
export type { BtRng as SrRng }
type SrRng = BtRng

/** HORIZON rebound (truth NAIK, trap): engulf hijau + kaki naik dengan dip kecil */
export function reboundHorizon(pen: Pen, r: SrRng, u: number, cfg: SrDiffCfg, engulf: number, legs: number[]): void {
  const o = pen.p
  pen.add(o, o + engulf * u, 0.12 * u, 0.14 * u, 2.8 + r.next() * 0.8)
  for (const d of legs) {
    const dip = d < 0
    step(pen, r, u, d * u, dip ? 0.26 : 0.14, dip ? 0.2 : 0.22, dip ? 0.85 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  if (pen.candles.length !== SR_TOTAL) {
    throw new Error(`horizon rebound: ${pen.candles.length} candle (harus ${SR_TOTAL})`)
  }
}

/** HORIZON dump (truth TURUN, guard): engulf merah + kaki turun dengan relief kecil */
export function dumpHorizon(pen: Pen, r: SrRng, u: number, cfg: SrDiffCfg, engulf: number, legs: number[]): void {
  const o = pen.p
  pen.add(o, o - engulf * u, 0.14 * u, 0.12 * u, 2.8 + r.next() * 0.8)
  for (const d of legs) {
    const relief = d > 0
    step(pen, r, u, d * u, relief ? 0.2 : 0.25, relief ? 0.24 : 0.2, relief ? 0.85 : 1.55, { ...cfg, noise: cfg.noise * 0.5 })
  }
  if (pen.candles.length !== SR_TOTAL) {
    throw new Error(`horizon dump: ${pen.candles.length} candle (harus ${SR_TOTAL})`)
  }
}

// kaki horizon standar (unit u): total ~ +5.9u (+engulf ~1.1u) = ~+3.5%
export const SR_LEGS_REBOUND = [0.95, 0.8, -0.25, 0.85, 0.75, 0.65, -0.2, 0.65, 0.55, 0.5, -0.18, 0.45, 0.4]
export const SR_LEGS_DUMP = [-0.95, -0.8, 0.25, -0.85, -0.75, -0.65, 0.2, -0.65, -0.55, -0.5, 0.18, -0.45, -0.4]

// ------------------------------------------------------------
// AKUNTANSI TRADE — fee buy + fee sell WAJIB, hasil akhir NET
// ------------------------------------------------------------

export interface FeeLedger {
  arah: 'NAIK' | 'TURUN'
  entry: number // harga entry (per unit)
  exit: number // harga exit aktual (target tersentuh / akhir horizon)
  target: number // harga target yang dipasang otak
  targetHit: boolean
  hitCandle: number // 0 = tak tersentuh (exit di akhir horizon); 61..74
  feeBuy: number // biaya fee beli (per unit, = entry * FEE_BUY)
  feeSell: number // biaya fee jual (per unit, = exit * FEE_SELL)
  grossPct: number // profit kotor (%) — TIDAK dipakai sebagai hasil akhir
  netPct: number // profit BERSIH setelah fee buy + fee sell (%)
  berhasil: boolean // netPct > 0
}

/** simulasi eksekusi trade atas horizon: target tersentuh = exit di target */
export function simulasiTrade(
  arah: 'NAIK' | 'TURUN',
  entry: number,
  targetPct: number,
  horizon: Candle[],
): FeeLedger {
  const sign = arah === 'NAIK' ? 1 : -1
  const target = entry * (1 + (sign * targetPct) / 100)
  let exit = horizon[horizon.length - 1].c
  let hitCandle = 0
  for (let i = 0; i < horizon.length; i++) {
    const c = horizon[i]
    const touched = arah === 'NAIK' ? c.h >= target : c.l <= target
    if (touched) {
      exit = target
      hitCandle = SR_VISIBLE + i + 1
      break
    }
  }
  const feeBuy = entry * FEE_BUY
  const feeSell = exit * FEE_SELL
  const grossPct = arah === 'NAIK' ? (exit / entry - 1) * 100 : (1 - exit / entry) * 100
  // net: long = jual bersih (exit*(1-feeSell)) vs beli kotor (entry*(1+feeBuy));
  //       short = beli bersih balik (entry*(1-feeBuy)) vs tutup kotor (exit*(1+feeSell))
  const netPct =
    arah === 'NAIK'
      ? ((exit * (1 - FEE_SELL)) / (entry * (1 + FEE_BUY)) - 1) * 100
      : ((entry * (1 - FEE_BUY)) / (exit * (1 + FEE_SELL)) - 1) * 100
  return { arah, entry, exit, target, targetHit: hitCandle > 0, hitCandle, feeBuy, feeSell, grossPct, netPct, berhasil: netPct > 0 }
}

export function totalFeePct(): number {
  return (FEE_BUY + FEE_SELL) * 100
}
