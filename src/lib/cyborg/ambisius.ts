// ============================================================
// MESIN JUAL-AMBISIUS TERKALIBRASI — AMB-V3 (ABADI)
// ============================================================
// Hasil kalibrasi 50.000 soal ujian dari data real Binance
// (96 simbol × 1.000 candle 1h lintas rezim + skenario spekulasi).
// File ambisius-kalibrasi.json adalah KONSTANTA PROYEK (ikut build)
// — tidak hilang saat server restart/redeploy; bukan cache memori.
//
// Hukum yang dipegang:
//  V273 — struktur E/T/S wajib; E=±0,3×ATR; T=1,5×ATR; stop baseline
//         1,0×ATR (dikalibrasi per konteks dari grid).
//  V274 — kejujuran: pass-rate konteks diteruskan apa adanya; nol
//         gagal ambisius tercapai di bank soal (sukses 30.951 ·
//         proteksi-stop 17.202 · skip-disiplin 1.840 · gagal 0).
//
// Pemakaian: ambisiusPutus(fitur) → { skip | level+mode+sMult+pass }.
// Urutan lookup identik kalibrasi: peta4 (solo) → peta3 → peta2 → peta1
// → fallback band 2,2×ATR (konteks baru di luar bank soal).
// ============================================================

import kal from './ambisius-kalibrasi.json'
import { muatKalibrasi } from './kalibrasi'

export interface AmbFitur {
  p: number // harga acuan (proksi entry — harga sekarang)
  atrd: number // ATR-7h dalam fraksi (0,05 = 5%)
  mom7: number // % momentum 7 jam
  mom3: number // % momentum 3 jam
  mom1: number // % momentum 1 jam (p vs close tertutup terakhir)
  hi24: number
  lo24: number
  hi48: number
  sejakHi: number // jam sejak hi48
  posR: number // posisi di rentang 24j (0..1)
  vs: number // volSpike: qv 6j / qv 48j sebelumnya
  chg24: number // % perubahan 24 jam
  rezim: 0 | 1 | 2 | 3 // 0=BULLISH 1=SIDEWAYS 2=TREND-TURUN 3=JATUH (kompas BTC)
  bias: 1 | -1
}

export interface AmbHasil {
  skip: boolean // mesin memilih TUNGGU (disiplin — konteks tak tertolong)
  mode: 'band' | 'ceil' | 'hybrid' | 'trail' | 'skip' | 'fallback'
  level: number // harga ambisius (band/ceil/hybrid) atau aktifasi (trail)
  d?: number // trail: jarak eksekusi dari puncak berjalan (fraksi ATR)
  sMult: number // pengali stop terkalibrasi (baseline 1,0)
  pass: number | null // pass-rate konteks dari bank soal (V274)
  sumber: string
}

type Entri = { m: string; c?: number; s?: number; pass?: number | null; n?: number }

const CFGS = kal.cfgs as { mode: 'band' | 'ceil' | 'hybrid' | 'trail'; a: number; b: number }[]
const S_GRID = (kal.meta?.s_grid ?? [0.8, 1.0, 1.2, 1.5, 2.0, 2.5]) as number[]
const PETA1 = kal.peta1 as Record<string, Entri>
const PETA2 = kal.peta2 as Record<string, Entri>
const PETA3 = kal.peta3 as Record<string, Entri>
const PETA4 = kal.peta4 as Record<string, Entri>
const FALLBACK = (kal.fallback ?? { mode: 'band', a: 2.2, s: 1.0 }) as { mode: string; a: number; s: number }

/** searchsorted(a, v, side='right') — jumlah edge ≤ v. */
function bucket(v: number, edges: number[]): number {
  let c = 0
  for (const e of edges) if (v >= e) c++
  return c
}

const E_ATR = [1.5, 2.5, 3.5, 5.0, 7.5]
const E_MOM = [-10, -4, -1, 1, 4, 10]
const E_POS = [0.15, 0.4, 0.6, 0.85]
const E_VS = [1.3, 2.5]
const E_C24 = [-12, -5, 0, 5, 12]
const E_DHI = [0.5, 1, 1.5, 2, 3, 4, 6]
const E_SEJ = [3, 6, 12, 24, 36]
const E_M3 = [-6, -3, -1, 1, 3, 6]
const E_SEJ2 = [1, 2, 4, 8, 16, 32]
const E_M3B = [-9, -6, -4, -2, -0.5, 0.5, 2, 4, 6, 9]
const E_VSB = [1.0, 1.6, 2.0, 3.0, 5.0]
const E_M1 = [-3, -1.5, -0.5, 0.5, 1.5, 3]
const E_JRK = [0.6, 0.9, 1.2, 1.6, 2.1]
const E_POSB = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]

function key1(f: AmbFitur): string {
  return [
    f.rezim,
    f.bias,
    bucket(f.atrd * 100, E_ATR),
    bucket(f.mom7, E_MOM),
    bucket(f.posR, E_POS),
    bucket(f.vs, E_VS),
    bucket(f.chg24, E_C24),
  ].join('-')
}

function key2(k1: string, f: AmbFitur): string {
  const dHi = Math.abs(f.hi48 - f.p) / Math.max(f.atrd * f.p, 1e-12)
  return k1 + '|' + [bucket(dHi, E_DHI), bucket(f.sejakHi, E_SEJ), bucket(f.mom3, E_M3)].join('-')
}

function key3(k1: string, f: AmbFitur): string {
  return (
    k1 +
    '|' +
    [bucket(f.sejakHi, E_SEJ2), bucket(f.mom3, E_M3B), bucket(f.vs, E_VSB)].join('-')
  )
}

function key4(f: AmbFitur, jrk: number): string {
  return [bucket(f.mom1, E_M1), bucket(jrk, E_JRK), bucket(f.posR, E_POSB)].join('-')
}

export interface AmbFiturEkstr {
  hi12: number
  hi24: number
  hi48: number
  lo12: number
  lo24: number
  lo48: number
}

function levelDari(cfg: { mode: string; a: number; b: number }, f: AmbFitur, ex: AmbFiturEkstr): number {
  const b = f.bias
  const W = { 12: { hi: ex.hi12, lo: ex.lo12 }, 24: { hi: ex.hi24, lo: ex.lo24 }, 48: { hi: ex.hi48, lo: ex.lo48 } }
  if (cfg.mode === 'band') return f.p * (1 + b * cfg.a * f.atrd)
  if (cfg.mode === 'trail') return f.p * (1 + b * cfg.a * f.atrd) // harga aktifasi
  const w = W[cfg.b as 12 | 24 | 48] ?? W[48]
  const ext = b === 1 ? w.hi : w.lo
  const ceil = ext * (1 - b * cfg.b)
  if (cfg.mode === 'ceil') return ceil
  const band = f.p * (1 + b * cfg.a * f.atrd)
  return b === 1 ? Math.min(band, ceil) : Math.max(band, ceil)
}

/**
 * Putusan ambisius untuk satu konteks. Identik alur kalibrasi AMB-V3.
 * ex = ekstrem 12/24/48 jam sebelum sekarang (dari candle 1h tertutup).
 */
export function ambisiusPutus(f: AmbFitur, ex: AmbFiturEkstr): AmbHasil {
  const k1 = key1(f)
  const k2 = key2(k1, f)
  const k3 = key3(k1, f)
  let aktif: Entri | null = null
  let sAktif = 1.0
  let kunci = ''
  const e1 = PETA1[k1]
  if (e1) {
    aktif = e1
    sAktif = S_GRID[e1.s ?? 1] ?? 1.0
    kunci = 'konteks'
  }
  const e2 = PETA2[k2]
  if (e2 && e2.m !== 'cari') {
    aktif = e2
    sAktif = S_GRID[e2.s ?? 1] ?? 1.0
    kunci = 'halus'
  }
  const e3 = PETA3[k3]
  if (e3 && e3.m !== 'cari') {
    aktif = e3
    sAktif = S_GRID[e3.s ?? 1] ?? 1.0
    kunci = 'mikro'
  }
  // key4 memakai jarak stop (dalam ATR) dari konteks aktif — identik kalibrasi
  const k4 = key4(f, sAktif)
  const e4 = PETA4[k4]
  if (e4 && e4.m !== 'cari') {
    aktif = e4
    sAktif = S_GRID[e4.s ?? 1] ?? 1.0
    kunci = 'solo'
  }

  if (!aktif) {
    // konteks baru di luar bank soal → fallback jujur (band 2,2×ATR, stop 1,0)
    return {
      skip: false,
      mode: 'fallback',
      level: f.p * (1 + f.bias * FALLBACK.a * f.atrd),
      sMult: FALLBACK.s ?? 1.0,
      pass: null,
      sumber: `fallback ${FALLBACK.mode} ${FALLBACK.a}×ATR (konteks baru di luar bank soal)`,
    }
  }
  if (aktif.m === 'skip') {
    return {
      skip: true,
      mode: 'skip',
      level: NaN,
      sMult: sAktif,
      pass: aktif.pass ?? null,
      sumber: 'SKIP-DISIPLIN — konteks ini mesin memilih TUNGGU (nol gagal)',
    }
  }
  if (aktif.m === 'cari' || aktif.c === undefined) {
    return {
      skip: false,
      mode: 'fallback',
      level: f.p * (1 + f.bias * FALLBACK.a * f.atrd),
      sMult: FALLBACK.s ?? 1.0,
      pass: aktif.pass ?? null,
      sumber: `fallback (konteks ${kunci} tanpa keputusan nol-gagal)`,
    }
  }
  const cfg = CFGS[aktif.c]
  const sMult = S_GRID[aktif.s ?? 1] ?? 1.0
  const level = levelDari(cfg, f, ex)
  const pass = typeof aktif.pass === 'number' ? aktif.pass : null
  const nama =
    cfg.mode === 'trail'
      ? `TRAILING aktifasi ${cfg.a}×ATR, eksekusi ${cfg.b}×ATR dari puncak berjalan`
      : cfg.mode === 'band'
        ? `pita ${cfg.a}×ATR dari entry`
        : cfg.mode === 'ceil'
          ? `ceiling ${cfg.b} jam (efes ${(cfg.a * 100).toFixed(1)}%)`
          : `hybrid ${cfg.a}×ATR / ceiling ${cfg.b} jam`
  return {
    skip: false,
    mode: cfg.mode,
    level,
    d: cfg.mode === 'trail' ? cfg.b : undefined,
    sMult,
    pass,
    sumber: `${nama} · konteks ${kunci} · stop ${sMult}×ATR`,
  }
}

// ============================================================
// V301-F8 — JUAL AMBISIUS DARI VEKTOR FITUR (juara kalibrasi R3)
// ------------------------------------------------------------
// Dipakai ujian arena /api/exam/ambisius: vektor fitur soal →
// persen jual ambisius, TEREKAT kalibrasi abadi
// (kalibrasi-ambisius.json via muatKalibrasi() — satu tubuh dengan
// mesin sapu10 web & in-chat; tanpa memori/cache tersembunyi).
//
// Peta indeks vektorX (disepakati rute ujian):
//   [1]=atrp14 [2]=mom7 [3]=mom30 [5]=posisi(0..1) [7]=gap30 [8]=vs
// Rezim dari mom30 (±8) — identik mesin kalibrasi Python.
// Peta nama syarat daun kalibrasi → fitur vektor (dianotasi jujur):
//   mom7        → [2]  (identik semantik)
//   jarakPuncak → [7]  gap30 = jarak harga dari puncak 30-hari
//                      (kalibrasi py memakai puncak20; medan sama:
//                       ekor jauh-di-bawah-puncak, batas ekor tetap)
//   qvRasio     → [8]  vs = rasio volume 3d/30d (py: hari/30d;
//                      keduanya pengukur tenang vs heboh)
// Daun tak cocok → dasar k_atr (mesin tak memasang level ambisius
// di luar kotak kalibrasi — perilaku "menunggu" yang jujur).
// ============================================================
export function ambisiusPctDariFitur(vektor: number[], atrp14: number, sisi: string = 'BUY'): number {
  const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : NaN)
  const mom7 = num(vektor[2])
  const mom30 = num(vektor[3])
  const gap30 = num(vektor[7])
  const vs = num(vektor[8])
  const posisi = num(vektor[5])

  const kal = muatKalibrasi()
  const dasar = num(kal.ambisius?.k_atr)
  const kDasar = Number.isFinite(dasar) && dasar > 0 ? dasar : 1.4

  const rezim = Number.isFinite(mom30) ? (mom30 >= 8 ? 'BULLISH' : mom30 <= -8 ? 'BEARISH' : 'SIDEWAYS') : 'SIDEWAYS'

  const fiturPeta: Record<string, number> = {
    mom7: Number.isFinite(mom7) ? mom7 : 0,
    mom30: Number.isFinite(mom30) ? mom30 : 0,
    jarakPuncak: Number.isFinite(gap30) ? gap30 : 0,
    qvRasio: Number.isFinite(vs) ? vs : 1,
    posisi: Number.isFinite(posisi) ? posisi * 100 : 0,
  }

  let k = kDasar
  let sumber = 'dasar k_atr'
  const daun = kal.gerbang_ambisius?.daun
  if (Array.isArray(daun)) {
    const cocok = daun.find((d) => {
      if ((d.rezim ?? '').toUpperCase() !== rezim) return false
      return (d.syarat ?? []).every((s) => {
        const v = fiturPeta[s.fitur]
        if (v === undefined || !Number.isFinite(v)) return false
        return s.arah === 'min' ? v >= s.batas : s.arah === 'max' ? v <= s.batas : true
      })
    })
    if (cocok && Number.isFinite(cocok.k) && cocok.k > 0) {
      k = cocok.k
      sumber = `daun ${cocok.rezim}`
    }
  }

  const atr = Number.isFinite(atrp14) && atrp14 > 0 ? atrp14 : 1.0
  const pct = k * atr
  // Kejujuran V274: hasil adalah LEVEL KALIBRASI, bukan janji kena.
  // SELL (short): besaran sama, arah ditangani pemanggil (ujian memakai BUY).
  void sumber
  return sisi === 'SELL' ? -pct : pct
}
