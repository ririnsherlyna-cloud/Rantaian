// ============================================================
// UJIAN CANDLE LIKUIDASI — "100 grafik crypto yang sering
// membuat professional trader kena liquidasi".
//
// Prinsip (warisan Ujian Simulasi v6, diperketat untuk candle):
//  - Setiap grafik = 72 candle. Mesin HANYA menerima candle 1..60
//    (VISIBLE). Vonis diadili dari candle 61..72 (HORIZON).
//  - Seluruh lintasan lahir dari seed deterministik -> bisa
//    diaudit & direproduksi. Tidak ada Math.random.
//  - 10 arketipe jebakan likuidasi: stop hunt, bull/bear trap,
//    pump-dump, kapitulasi, cascade, shakeout, distribusi,
//    akumulasi. Semua dipilih karena MELIKUIDASI orang yang
//    membaca sinyalnya secara naif.
//  - Beberapa arketipe punya VARIAN hasil (trap vs breakout asli,
//    pantulan-V vs kucing mati) -> otak tidak bisa menghafal
//    "arketipe X pasti arah Y"; ia harus MEMBACA CANDLE.
//  - Kebenaran (truth) dihitung dari DATA, bukan niat generator:
//    tanda (close[71] - close[59]) dibagi ATR14, dengan gerbang
//    kemenentuan >= 0.35 ATR (pasar tak berarah tak diadili).
// ============================================================

import { makeRng, hashSeed, type Rng } from './rng'
import type { Candle } from './generator'

export const CH_VISIBLE = 60
export const CH_HORIZON = 12
export const CH_TOTAL = CH_VISIBLE + CH_HORIZON
export const CH_SIZE = 100 // 10 arketipe x 10 seed
export const CH_MIN_MOVE_ATR = 0.35

export type CandleArch =
  | 'stop-hunt-support'
  | 'stop-hunt-resistance'
  | 'bull-trap'
  | 'bear-trap'
  | 'pump-dump'
  | 'capitulation-v'
  | 'liquidation-cascade'
  | 'shakeout-trend'
  | 'distribution-top'
  | 'accumulation-base'

export interface CandleArchMeta {
  id: CandleArch
  label: string
  family: 'WICK-HUNT' | 'BREAKOUT-TRAP' | 'KLIMAKS' | 'STRUKTUR'
  desc: string
  jebakan: string // bagaimana trader profesional dilikuidasi di sini
}

export const CANDLE_ARCHES: CandleArchMeta[] = [
  { id: 'stop-hunt-support', label: 'Stop Hunt di Support', family: 'WICK-HUNT', desc: 'Harga menusuk low dengan wick panjang lalu ditutup kembali di atasnya.', jebakan: 'Stop-loss long di bawah support disapu; yang short "breakdown" dilikuidasi saat harga melesat naik.' },
  { id: 'stop-hunt-resistance', label: 'Stop Hunt di Resistance', family: 'WICK-HUNT', desc: 'Sumbu menusuk resistance lalu ditolak keras ke bawah.', jebakan: 'Stop-loss short di atas resistance disapu; yang beli "breakout" terjebak di puncak wick.' },
  { id: 'bull-trap', label: 'Bull Trap', family: 'BREAKOUT-TRAP', desc: 'Breakout meyakinkan di atas resistance... lalu dicabut total.', jebakan: 'Pengejar breakout masuk tepat sebelum reversal; varian REAL (breakout asli) menghukum penebar-trap buta.' },
  { id: 'bear-trap', label: 'Bear Trap', family: 'BREAKOUT-TRAP', desc: 'Breakdown meyakinkan di bawah support... lalu dipompa balik.', jebakan: 'Penjual breakdown terjebak; varian REAL (breakdown asli) menghukum pembeli-jatuh buta.' },
  { id: 'pump-dump', label: 'Pump & Dump Klimaks', family: 'KLIMAKS', desc: 'Pompa parabolik makin curam, volume meledak, lalu lilin kelelahan.', jebakan: 'FOMO akhir membeli di klimaks; dump berikutnya menghapus akun ber-leverage.' },
  { id: 'capitulation-v', label: 'Kapitulasi V', family: 'KLIMAKS', desc: 'Panic dump beruntun, lilin kapitulasi wick raksasa, lalu pantulan V.', jebakan: 'Yang memotong loss di lilin kapitulasi menjual di dasar persis; yang menahan ber-leverage sudah cair sebelumnya.' },
  { id: 'liquidation-cascade', label: 'Kaskade Likuidasi', family: 'KLIMAKS', desc: 'Kaskade kaki demi kaki menembus level; pantulan pertama bisa V atau kucing mati.', jebakan: 'Dua sisi likuidasi: long tersapu di dasar, lalu pembeli kucing-mati dilikuidasi di leg kedua.' },
  { id: 'shakeout-trend', label: 'Shakeout dalam Tren', family: 'STRUKTUR', desc: 'Uptrend sehat disenggol koreksi tajam yang mematahkan struktur kecil.', jebakan: 'Pembaca struktur naif berteriak reversal & jual; tren justru lanjut tanpa mereka.' },
  { id: 'distribution-top', label: 'Distribusi di Puncak', family: 'STRUKTUR', desc: 'Mendatar tenang di puncak; volume turun jauh lebih berat dari naik.', jebakan: 'Terasa "konsolidasi aman untuk long"; sebenarnya posisi besar dilepas diam-diam.' },
  { id: 'accumulation-base', label: 'Akumulasi di Dasar', family: 'STRUKTUR', desc: 'Basis datar sunyi, spring menyapu low sekali, lalu markup.', jebakan: 'Yang jenuh & jual di spring menjual ke tangan kuat tepat sebelum markup.' },
]

export type CandleDiff = 'MUDAH' | 'SEDANG' | 'BRUTAL' | 'GILA'

const DIFF_CYCLE: CandleDiff[] = [
  'MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG',
  'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL', 'SEDANG',
]

interface DiffCfg { noise: number; subtle: number; conviction: number }

const DIFF_CFG: Record<CandleDiff, DiffCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface CandleExam {
  num: number // 1..100
  arch: CandleArchMeta
  diff: CandleDiff
  seed: string
  variant: string // 'X' | 'TRAP' | 'REAL' | 'V' | 'DEADCAT'
  candles: Candle[] // CH_TOTAL candle
  visible: number
  entry: number // close pada candle ke-60 (keputusan)
  exit: number // close pada candle ke-72
  truth: 'NAIK' | 'TURUN'
  moveAtr: number
  intent: 'NAIK' | 'TURUN' // arah by-design (hanya utk laporan, TIDAK untuk skor)
  noiseFlipped: boolean
}

// ------------------------------------------------------------
// pena gambar candle
// ------------------------------------------------------------

class Pen {
  candles: Candle[] = []
  constructor(public p0: number, public u: number) {}
  get p(): number {
    const n = this.candles.length
    return n ? this.candles[n - 1].c : this.p0
  }
  add(o: number, c: number, uw: number, lw: number, v: number): void {
    const h = Math.max(o, c) + Math.max(0, uw)
    const l = Math.min(o, c) - Math.max(0, lw)
    this.candles.push({ t: this.candles.length, o, h, l, c, v: Math.max(0.05, v) })
  }
}

/** candle generik: tubuh dC (+ wiggle noise), wick dalam satuan u */
function step(pen: Pen, r: Rng, u: number, dC: number, wUu: number, wLu: number, v: number, cfg: DiffCfg): void {
  const o = pen.p
  const c = o + dC + r.normal() * 0.16 * u * cfg.noise
  const uw = Math.max(0.02, (wUu + Math.abs(r.normal()) * 0.1) * u * cfg.subtle)
  const lw = Math.max(0.02, (wLu + Math.abs(r.normal()) * 0.1) * u * cfg.subtle)
  pen.add(o, c, uw, lw, Math.max(0.25, (v + r.normal() * 0.25) * (1 + Math.abs(r.normal()) * 0.3)))
}

const volCalm = (r: Rng) => 0.75 + Math.abs(r.normal()) * 0.3

// ------------------------------------------------------------
// 10 generator arketipe — masing-masing menulis PERSIS 72 candle
// ------------------------------------------------------------

function genStopHunt(pen: Pen, r: Rng, u: number, cfg: DiffCfg, arahAtas: boolean): void {
  // A1: drift 30 candle menuju level
  const drift = arahAtas ? -0.14 * u : 0.14 * u
  for (let i = 0; i < 30; i++) step(pen, r, u, drift, 0.18, 0.18, volCalm(r), cfg)
  // A2: range 20 candle membangun level jelas
  for (let i = 0; i < 20; i++) step(pen, r, u, r.normal() * 0.22 * u, 0.22, 0.22, volCalm(r), cfg)
  const lows = pen.candles.slice(30).map((c) => c.l)
  const highs = pen.candles.slice(30).map((c) => c.h)
  const level = arahAtas ? Math.min(...lows) : Math.max(...highs)
  // pra-sweep 5 candle: menghampiri level
  for (let i = 0; i < 5; i++) step(pen, r, u, arahAtas ? -0.22 * u : 0.22 * u, 0.2, 0.2, 1.1, cfg)
  // sweep 4 candle: wick menusuk level, volume naik
  for (let i = 0; i < 4; i++) {
    const o = pen.p
    const depth = (0.35 + r.next() * 0.35) * u
    const wick = (1.05 + r.next() * 0.7) * u * cfg.subtle
    const c = arahAtas ? Math.min(o - 0.1 * u, level - depth * 0.4) : Math.max(o + 0.1 * u, level + depth * 0.4)
    const wL = arahAtas ? wick : 0.15 * u
    const wU = arahAtas ? 0.15 * u : wick
    pen.add(o, c, wU, wL, 2.2 + r.next() * 1.0)
  }
  // candle ke-59: RECLAIM / REJECT — lilin keputusan
  {
    const o = pen.p
    const c = arahAtas ? level + 0.18 * u : level - 0.18 * u
    const wick = 0.95 * u * cfg.subtle
    pen.add(o, c, arahAtas ? 0.12 * u : wick, arahAtas ? wick : 0.12 * u, 3.0 + r.next() * 0.6)
  }
  // HORIZON: reversal tegas
  const o0 = pen.p
  pen.add(o0, o0 + (arahAtas ? 1.35 : -1.35) * u, 0.1 * u, 0.08 * u, 3.4)
  for (let i = 0; i < 11; i++) {
    const dip = i === 3 || i === 7
    step(pen, r, u, (arahAtas ? 1 : -1) * (dip ? -0.12 : 0.27) * u, 0.15, 0.15, 1.3, { ...cfg, noise: cfg.noise * 0.5 })
  }
}

function genTrap(pen: Pen, r: Rng, u: number, cfg: DiffCfg, breakoutNaik: boolean, real: boolean): void {
  // A1: 16 candle menuju range
  for (let i = 0; i < 16; i++) step(pen, r, u, (breakoutNaik ? 0.18 : -0.18) * u, 0.18, 0.18, volCalm(r), cfg)
  // A2: range 32 candle dengan penolakan di tepi
  const pMid = pen.p
  const R = pMid + (breakoutNaik ? 0.8 : -0.8) * u - (breakoutNaik ? 0 : 2.4 * u * -1) // level jauh
  const levelFar = breakoutNaik ? pMid + 0.8 * u : pMid - 0.8 * u
  const levelNear = breakoutNaik ? pMid - 2.4 * u : pMid + 2.4 * u
  void R
  let dir = 1
  for (let i = 0; i < 32; i++) {
    if (i % 4 === 0) dir = r.chance(0.5) ? 1 : -1
    let dC = dir * 0.4 * u
    const near = breakoutNaik ? levelFar : levelNear
    const far = breakoutNaik ? levelNear : levelFar
    if (breakoutNaik ? pen.p > near - 0.35 * u : pen.p < near + 0.35 * u) dir = -1
    if (breakoutNaik ? pen.p < far + 0.35 * u : pen.p > far - 0.35 * u) dir = 1
    dC = dir * 0.4 * u
    const wU = breakoutNaik && pen.p > near - 0.6 * u ? 0.7 : 0.2
    const wL = !breakoutNaik && pen.p < near + 0.6 * u ? 0.7 : 0.2
    step(pen, r, u, dC, wU, wL, volCalm(r), cfg)
  }
  // breakout 3 candle meyakinkan
  for (let i = 0; i < 3; i++) step(pen, r, u, (breakoutNaik ? 1 : -1) * (0.55 + 0.2 * i) * u, 0.12, 0.12, 2.0 + i * 0.25, cfg)
  // konsolidasi 3 candle di luar level (low/high naik — terlihat sehat)
  for (let i = 0; i < 3; i++) step(pen, r, u, (breakoutNaik ? 1 : -1) * 0.15 * u, 0.15, 0.15, 1.2, cfg)
  if (cfg.conviction > 0) {
    for (let i = 0; i < cfg.conviction; i++) step(pen, r, u, (breakoutNaik ? 1 : -1) * 0.18 * u, 0.12, 0.12, 1.25, cfg)
  }
  // sisa sampai candle 59: REAL = bertahan di luar level; TRAP = dicabut masuk.
  // EXAM v2: skala dorongan sisa terhadap noise (0.4 + 0.6×noise) agar
  // "cerita jebakan" tetap terbaca di setiap difficulty — di GILA (noise
  // 2.1×) dorongan 2.1× lebih besar sehingga sinyal tetap >= noise;
  // ujian mengukur KEMAMPUAN membaca jebakan, bukan keberuntungan.
  const skala = 0.4 + 0.6 * cfg.noise
  const sisa = 60 - pen.candles.length
  for (let i = 0; i < sisa; i++) {
    if (real) {
      const dip = i % 2 === 0
      step(pen, r, u, (breakoutNaik ? 1 : -1) * (dip ? -0.22 : 0.3) * u * skala, 0.2, 0.2, dip ? 1.0 : 1.4, cfg)
    } else {
      step(pen, r, u, (breakoutNaik ? -1 : 1) * (0.3 + (i === 0 ? 0.25 : 0)) * u * skala, 0.22, 0.22, i === 0 ? 2.2 : 1.5, cfg)
    }
  }
  // HORIZON
  const o0 = pen.p
  if (real) {
    for (let i = 0; i < CH_HORIZON; i++) {
      const dip = i === 3 || i === 8
      step(pen, r, u, (breakoutNaik ? 1 : -1) * (dip ? -0.18 : 0.24) * u, 0.16, 0.16, 1.3, { ...cfg, noise: cfg.noise * 0.5 })
    }
  } else {
    // TRAP: bull-trap dibuang turun; bear-trap dipompa balik naik
    pen.add(o0, o0 + (breakoutNaik ? -0.7 : 0.7) * u, 0.12 * u, 0.12 * u, 3.2)
    for (let i = 0; i < 11; i++) {
      const relief = i === 4 || i === 8
      step(pen, r, u, (breakoutNaik ? -1 : 1) * (relief ? -0.2 : 0.32) * u, 0.18, 0.18, relief ? 1.0 : 1.6, { ...cfg, noise: cfg.noise * 0.5 })
    }
  }
}

function genPumpDump(pen: Pen, r: Rng, u: number, cfg: DiffCfg): void {
  // A: 42 candle sunyi
  for (let i = 0; i < 42; i++) step(pen, r, u, -0.03 * u + r.normal() * 0.1 * u, 0.2, 0.2, volCalm(r), cfg)
  // B: pompa parabolik 16 candle makin curam
  for (let i = 0; i < 16; i++) {
    step(pen, r, u, (0.15 + 0.045 * i) * u, 0.08 + 0.01 * i, 0.1, 1.5 + i * 0.13, { ...cfg, noise: cfg.noise * 0.6 })
  }
  // klimaks 2 candle: volume raksasa + wick kelelahan
  {
    const o = pen.p
    pen.add(o, o + 0.7 * u, 0.8 * u * cfg.subtle, 0.12 * u, 4.4)
    const o2 = pen.p
    pen.add(o2, o2 - 0.15 * u, 1.3 * u * cfg.subtle, 0.15 * u, 4.8)
  }
  // HORIZON: dump berkaki
  const o0 = pen.p
  pen.add(o0, o0 - 0.9 * u, 0.15 * u, 0.2 * u, 3.8)
  for (let i = 0; i < 11; i++) {
    const relief = i === 4 || i === 9
    step(pen, r, u, (relief ? 0.28 : -0.48) * u, 0.2, 0.22, relief ? 1.0 : 1.9, { ...cfg, noise: cfg.noise * 0.5 })
  }
}

function genCapitulation(pen: Pen, r: Rng, u: number, cfg: DiffCfg): void {
  // A: 38 candle uptrend santai (kerumulan long)
  for (let i = 0; i < 38; i++) step(pen, r, u, 0.1 * u, 0.18, 0.18, volCalm(r), cfg)
  // B: panic dump 20 candle makin dalam
  for (let i = 0; i < 20; i++) {
    step(pen, r, u, -(0.25 + 0.02 * i) * u, 0.18, 0.3 + 0.02 * i, 1.6 + i * 0.13, { ...cfg, noise: cfg.noise * 0.7 })
  }
  // kapitulasi 2 candle: lilin terakhir wick raksasa
  {
    const o = pen.p
    pen.add(o, o - 1.0 * u, 0.15 * u, 0.85 * u * cfg.subtle, 4.6)
    const o2 = pen.p
    pen.add(o2, o2 - 0.1 * u, 0.18 * u, 1.75 * u * cfg.subtle, 5.4)
  }
  // HORIZON: pantulan V
  const o0 = pen.p
  pen.add(o0, o0 + 1.15 * u, 0.1 * u, 0.12 * u, 3.8)
  const o1 = pen.p
  pen.add(o1, o1 + 0.85 * u, 0.1 * u, 0.12 * u, 3.0)
  const o2 = pen.p
  pen.add(o2, o2 + 0.55 * u, 0.12 * u, 0.15 * u, 2.4)
  for (let i = 0; i < 9; i++) {
    const dip = i === 4
    step(pen, r, u, (dip ? -0.1 : 0.13) * u, 0.16, 0.16, 1.2, { ...cfg, noise: cfg.noise * 0.5 })
  }
}

function genCascade(pen: Pen, r: Rng, u: number, cfg: DiffCfg, variantV: boolean): void {
  // A: 44 candle uptrend (long ber-leverage ramai)
  for (let i = 0; i < 44; i++) step(pen, r, u, 0.12 * u, 0.16, 0.16, volCalm(r), cfg)
  // 3 kaki kaskade: 3 turun + 1 stall per kaki
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 3; i++) step(pen, r, u, -0.55 * u, 0.14, 0.3, 2.6 + k * 0.3, { ...cfg, noise: cfg.noise * 0.7 })
    step(pen, r, u, 0.08 * u, 0.2, 0.2, 1.1, cfg)
  }
  // overshoot 2 candle di bawah swing low
  {
    const o = pen.p
    pen.add(o, o - 0.6 * u, 0.14 * u, 1.05 * u * cfg.subtle, 4.2)
    const o2 = pen.p
    pen.add(o2, o2 - 0.5 * u, 0.15 * u, 1.7 * u * cfg.subtle, 4.8)
  }
  // pantulan 1: engulf hijau
  const o0 = pen.p
  pen.add(o0, o0 + 0.85 * u, 0.1 * u, 0.1 * u, 3.4)
  // candle ke-59: pantulan 2 — kualitas yang dibaca
  {
    const o = pen.p
    if (variantV) pen.add(o, o + 0.62 * u, 0.08 * u, 0.12 * u, 2.6)
    else pen.add(o, o + 0.2 * u, 0.68 * u * cfg.subtle, 0.12 * u, 0.9)
  }
  // HORIZON
  if (variantV) {
    const o = pen.p
    pen.add(o, o + 0.7 * u, 0.1 * u, 0.12 * u, 2.8)
    for (let i = 0; i < 11; i++) {
      const dip = i === 5
      step(pen, r, u, (dip ? -0.12 : 0.16) * u, 0.14, 0.16, 1.4, { ...cfg, noise: cfg.noise * 0.5 })
    }
  } else {
    for (let i = 0; i < CH_HORIZON; i++) {
      const relief = i === 5
      step(pen, r, u, (relief ? 0.18 : -0.32) * u, 0.2, 0.2, relief ? 0.9 : 1.7, { ...cfg, noise: cfg.noise * 0.5 })
    }
  }
}

function genShakeout(pen: Pen, r: Rng, u: number, cfg: DiffCfg): void {
  // A: 54 candle uptrend HH/HL: 4 naik + 1 dip per siklus
  for (let i = 0; i < 54; i++) {
    const dip = i % 5 === 4
    step(pen, r, u, (dip ? -0.55 : 0.2) * u, dip ? 0.3 : 0.15, dip ? 0.35 : 0.15, dip ? 1.2 : 1.05, { ...cfg, noise: cfg.noise * 0.8 })
  }
  // B: shakeout 5 candle mematahkan HL kecil, volume MENURUN
  for (let i = 0; i < 5; i++) step(pen, r, u, -0.4 * u, 0.2, 0.3, 1.3 - i * 0.1, { ...cfg, noise: cfg.noise * 0.7 })
  // candle 59: hammer penolakan di zona demand
  {
    const o = pen.p
    pen.add(o, o - 0.05 * u, 0.1 * u, 1.25 * u * cfg.subtle, 1.0)
  }
  // HORIZON: tren lanjut
  const o0 = pen.p
  pen.add(o0, o0 + 0.45 * u, 0.12 * u, 0.12 * u, 2.2)
  for (let i = 0; i < 11; i++) {
    const dip = i === 4 || i === 8
    step(pen, r, u, (dip ? -0.25 : 0.26) * u, 0.16, 0.16, dip ? 1.0 : 1.35, { ...cfg, noise: cfg.noise * 0.5 })
  }
}

function genDistribution(pen: Pen, r: Rng, u: number, cfg: DiffCfg): void {
  // A: 33 candle naik ke puncak
  for (let i = 0; i < 33; i++) step(pen, r, u, 0.17 * u, 0.16, 0.16, volCalm(r), cfg)
  // B: 26 candle sideways di puncak: 2 upaya rally gagal, volume turun > naik
  const pTop = pen.p
  for (let i = 0; i < 26; i++) {
    const attempt = i === 5 || i === 16
    if (attempt) {
      const o = pen.p
      pen.add(o, o + 0.3 * u, 0.95 * u * cfg.subtle, 0.12 * u, 0.85)
    } else {
      const after = (i > 5 && i < 10) || (i > 16 && i < 21)
      step(pen, r, u, (after ? -0.22 : r.normal() * 0.2 * u), 0.2, 0.2, after ? 1.35 : volCalm(r) * 0.8, cfg)
    }
  }
  // candle 59: lower high merah kecil
  step(pen, r, u, -0.18 * u, 0.25, 0.15, 1.5, cfg)
  // HORIZON: breakdown
  for (let i = 0; i < CH_HORIZON; i++) {
    const relief = i === 4 || i === 9
    step(pen, r, u, (relief ? 0.18 : -0.28) * u, 0.2, 0.2, relief ? 0.9 : 1.5, { ...cfg, noise: cfg.noise * 0.5 })
  }
  void pTop
}

function genAccumulation(pen: Pen, r: Rng, u: number, cfg: DiffCfg): void {
  // EXAM v2: skala pemulihan basis terhadap noise — spring + HL mikro
  // tetap terbaca di GILA (noise 2.1× memperbesar derau, dorongan pulih
  // ikut membesar) supaya kemahiran yang diuji, bukan keberuntungan.
  const skala = 0.4 + 0.6 * cfg.noise
  // A: 34 candle turun ke dasar
  for (let i = 0; i < 34; i++) step(pen, r, u, -0.17 * u, 0.16, 0.16, volCalm(r), cfg)
  // B: 26 candle basis: spring 1x menyapu low, lalu HL mikro
  for (let i = 0; i < 26; i++) {
    if (i === 12) {
      // SPRING: wick sapu di bawah basis lalu pulih
      const o = pen.p
      pen.add(o, o + 0.25 * u, 0.15 * u, 1.15 * u * cfg.subtle, 2.3)
    } else {
      const afterSpring = i > 12
      const up = afterSpring ? i % 3 !== 2 : r.chance(0.5)
      step(pen, r, u, (up ? 0.18 : -0.16) * u * (afterSpring ? skala : 1), 0.18, 0.18, afterSpring ? (up ? 1.25 : 0.75) : volCalm(r) * 0.85, cfg)
    }
  }
  // HORIZON: markup
  for (let i = 0; i < CH_HORIZON; i++) {
    const dip = i === 3 || i === 8
    step(pen, r, u, (dip ? -0.18 : 0.27) * u, 0.16, 0.16, dip ? 0.9 : 1.45, { ...cfg, noise: cfg.noise * 0.5 })
  }
}

type ArchGen = (pen: Pen, r: Rng, u: number, cfg: DiffCfg, flags: { real: boolean; variantV: boolean }) => void

const GENS: Record<CandleArch, ArchGen> = {
  'stop-hunt-support': (pen, r, u, cfg) => genStopHunt(pen, r, u, cfg, true),
  'stop-hunt-resistance': (pen, r, u, cfg) => genStopHunt(pen, r, u, cfg, false),
  'bull-trap': (pen, r, u, cfg, f) => genTrap(pen, r, u, cfg, true, f.real),
  'bear-trap': (pen, r, u, cfg, f) => genTrap(pen, r, u, cfg, false, f.real),
  'pump-dump': (pen, r, u, cfg) => genPumpDump(pen, r, u, cfg),
  'capitulation-v': (pen, r, u, cfg) => genCapitulation(pen, r, u, cfg),
  'liquidation-cascade': (pen, r, u, cfg, f) => genCascade(pen, r, u, cfg, f.variantV),
  'shakeout-trend': (pen, r, u, cfg) => genShakeout(pen, r, u, cfg),
  'distribution-top': (pen, r, u, cfg) => genDistribution(pen, r, u, cfg),
  'accumulation-base': (pen, r, u, cfg) => genAccumulation(pen, r, u, cfg),
}

// ATR14 sederhana (Wilder) untuk gerbang kemenentuan
function atr14(cs: Candle[], at: number): number {
  if (at < 15) return (cs[at].h - cs[at].l) || 1e-9
  let sum = 0
  for (let i = at - 13; i <= at; i++) {
    const c = cs[i]
    const pc = cs[i - 1].c
    sum += Math.max(c.h - c.l, Math.abs(c.h - pc), Math.abs(c.l - pc))
  }
  return sum / 14
}

export function forgeCandleExam(num: number, ns = 'candle'): CandleExam {
  const archIdx = (num - 1) % CANDLE_ARCHES.length
  const k = Math.floor((num - 1) / CANDLE_ARCHES.length) // 0..9
  const arch = CANDLE_ARCHES[archIdx]
  const diff = DIFF_CYCLE[k % DIFF_CYCLE.length]
  const cfg = DIFF_CFG[diff]
  const variant =
    arch.id === 'bull-trap' || arch.id === 'bear-trap'
      ? hashSeed(`variant:${arch.id}:${k}`) % 10 < 3
        ? 'REAL'
        : 'TRAP'
      : arch.id === 'liquidation-cascade'
        ? hashSeed(`variant:${arch.id}:${k}`) % 2 === 0
          ? 'V'
          : 'DEADCAT'
        : 'X'
  const intent: 'NAIK' | 'TURUN' =
    arch.id === 'stop-hunt-support' || arch.id === 'bear-trap' || arch.id === 'capitulation-v' ||
    arch.id === 'shakeout-trend' || arch.id === 'accumulation-base'
      ? 'NAIK'
      : 'TURUN'
  if (arch.id === 'bull-trap') void intent // intent REAL/TRAP ditentukan data

  const flags = { real: variant === 'REAL', variantV: variant === 'V' }
  let attempt = 0
  let best: { candles: Candle[]; moveAtr: number } | null = null
  let seed = ''
  while (attempt < 8) {
    seed = `${ns}-${arch.id}-${k}-${attempt}`
    const r = makeRng(seed)
    const u = 0.4 // satuan getaran pada harga dasar 100 (0.4%)
    const pen = new Pen(100, u)
    GENS[arch.id](pen, r, u, cfg, flags)
    if (pen.candles.length !== CH_TOTAL) {
      throw new Error(`generator ${arch.id} menghasilkan ${pen.candles.length} candle (harus ${CH_TOTAL})`)
    }
    const entry = pen.candles[CH_VISIBLE - 1].c
    const exit = pen.candles[CH_TOTAL - 1].c
    const atr = Math.max(atr14(pen.candles, CH_VISIBLE - 1), 1e-9)
    const moveAtr = (exit - entry) / atr
    if (!best || Math.abs(moveAtr) > Math.abs(best.moveAtr)) best = { candles: pen.candles, moveAtr }
    if (Math.abs(moveAtr) >= CH_MIN_MOVE_ATR) {
      best = { candles: pen.candles, moveAtr }
      break
    }
    attempt++
  }
  const candles = best!.candles
  const entry = candles[CH_VISIBLE - 1].c
  const exit = candles[CH_TOTAL - 1].c
  const atr = Math.max(atr14(candles, CH_VISIBLE - 1), 1e-9)
  const moveAtr = (exit - entry) / atr
  const truth: 'NAIK' | 'TURUN' = exit >= entry ? 'NAIK' : 'TURUN'
  return {
    num,
    arch,
    diff,
    seed,
    variant,
    candles,
    visible: CH_VISIBLE,
    entry,
    exit,
    truth,
    moveAtr,
    intent: arch.id === 'bull-trap' || arch.id === 'bear-trap' ? (variant === 'REAL' ? (arch.id === 'bull-trap' ? 'NAIK' : 'TURUN') : (arch.id === 'bull-trap' ? 'TURUN' : 'NAIK')) : intent,
    noiseFlipped: truth !== (arch.id === 'bull-trap' || arch.id === 'bear-trap' ? (variant === 'REAL' ? (arch.id === 'bull-trap' ? 'NAIK' : 'TURUN') : (arch.id === 'bull-trap' ? 'TURUN' : 'NAIK')) : intent),
  }
}

export function forgeCandleSuite(ns = 'candle'): CandleExam[] {
  return Array.from({ length: CH_SIZE }, (_, i) => forgeCandleExam(i + 1, ns))
}

export function forgeCandleVisible(exam: CandleExam): Candle[] {
  return exam.candles.slice(0, CH_VISIBLE)
}
