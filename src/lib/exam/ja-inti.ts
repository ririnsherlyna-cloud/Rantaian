// ============================================================
// JUAL AMBISIUS — INTI (v1.0)
// ============================================================
// Soalnya nyata: profit sering diambil terlalu rendah. Dua cara
// lama gagal: (a) target ambisius tak pernah tersentuh, atau
// (b) tersentuh tapi koin malah terus naik melewatinya.
//
// Jawaban: kalibrasi dari DATA REAL Binance. Tiap soal = satu
// episode kenaikan nyata (sideways / bearish / bullish / pump
// berita). Sistem hanya boleh melihat 60 jam PERTAMA (anti-
// hindsight), lalu memasang rencana:
//   area entry (limit beli di bawah harga), stop loss,
//   jual sasaran (kecil-disiplin), jual AMBISIUS (matang).
// LULUS hanya bila:
//   ambisius tersentuh dalam sehari (24 jam) sejak entry,
//   lalu harga LONGSOR turun di bawahnya segera,
//   dan tidak DILAMPAUI (naik lagi melewatinya).
// Kalau rencana bilang SKIP / area tak terisi, soal dihitung
// lulus-kosong — asal tidak ada trade yang rusak janjinya.
// NOL kegagalan adalah standar penempaannya (V-fokus-50rb).
// ============================================================

// ---------- bentuk data ----------
export interface JaCandle {
  t: number // openTime ms (epoch) — data real, bukan indeks sintetis
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type JaRezim = 'SIDEWAYS' | 'BEARISH' | 'BULLISH' | 'PUMP'

export type JaHasil =
  | 'SUkses' // entry terisi → ambisius tersentuh → longsor → tak dilampaui
  | 'SL-DULUAN' // stop loss kena sebelum ambisius
  | 'TAK-TERSENTUH' // ambisius tak tersentuh dalam jendela sehari
  | 'DILAMPAUI' // ambisius tersentuh tapi harga terus menembus jauh
  | 'TAK-LONGSOR' // tersentuh, tak dilampaui, tapi harga ngambang tak longsor
  | 'AREA-TAK-TERISI' // limit tak tersentuh → tidak ada trade
  | 'SKIP'

export interface JaEpisodeMeta {
  num: number
  simbol: string
  startTs: number // openTime candle pertama jendela 60 jam
  rezim: JaRezim
  run24: number
  run6: number
  volClimax: number
  posisi: number
  frame?: '1h' | '4h' // keluarga soal: ritme 1-jam atau 4-jam
}

// ---------- parameter tetap (jujur & tercatat di hasil) ----------
export const JA_PARAM = {
  feePct: 0.1, // beli + jual, tiap sisi 0,1% (Binance spot)
  visible: 60, // jam yang boleh dilihat
  fillWindow: 12, // area entry harus terisi ≤ 12 jam (order limit dipasang setengah hari)
  sentuhMax: 24, // ambisius wajib tersentuh ≤ 24 jam sejak terisi ("di hari itu")
  longsorWindow: 24, // setelah tersentuh, longsor dinilai 24 jam
  longsorMinPct: 1.5, // longsor = close turun ≤ ambisius×(1−1,5%)
  epsDilampauiPct: 0.3, // toleransi duri 0,3% di atas ambisius; lewat itu = dilampaui
  sasaranPct: 2.0, // pembanding disiplin-kecil
  slMin: 2.5, // batas bawah stop loss (%)
  slMax: 9.0,
  ambMin: 3.0, // batas bawah ambisius (%)
  ambMax: 45.0,
  areaMin: 0.2,
  areaMax: 3.0,
} as const

// ---------- fitur point-in-time (hanya jendela visible) ----------
export interface JaFitur {
  run24: number
  run6: number
  volClimax: number
  posisi: number
  ema21Slope: number
  atrPct: number // ATR14 / harga × 100 — skala volatilitas
  jarakEmaAtr: number // jarak harga dari EMA21 dalam satuan ATR
  accel: number // akselerasi 3 candle terakhir
}

export function ema(nilai: number[], periode: number): number[] {
  const k = 2 / (periode + 1)
  const out: number[] = []
  let prev = nilai[0]
  for (let i = 0; i < nilai.length; i++) {
    prev = i === 0 ? nilai[0] : nilai[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

export function fiturDari(candles: JaCandle[], bar24 = 24, bar6 = 6): JaFitur {
  const n = candles.length
  const close = candles.map((x) => x.c)
  const c0 = close[n - 1]
  const run24 = c0 / close[n - 1 - bar24] - 1
  const run6 = c0 / close[n - 1 - bar6] - 1
  const volMean12 = candles.slice(n - 13, n - 1).reduce((s, x) => s + x.v, 0) / 12
  const volClimax = volMean12 > 0 ? candles[n - 1].v / volMean12 : 1
  const lo = Math.min(...candles.map((x) => x.l))
  const hi = Math.max(...candles.map((x) => x.h))
  const posisi = hi > lo ? (c0 - lo) / (hi - lo) : 0.5
  const e = ema(close, 21)
  const ema21Slope = e[n - 1] / e[n - 1 - 8] - 1
  // ATR14 (true range rata-rata) sebagai skala volatilitas
  let atrSum = 0
  for (let i = n - 14; i < n; i++) {
    const tr = Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - candles[i - 1].c), Math.abs(candles[i].l - candles[i - 1].c))
    atrSum += tr
  }
  const atrPct = (atrSum / 14 / c0) * 100
  const jarakEmaAtr = atrPct > 0 ? (Math.abs(c0 / e[n - 1] - 1) * 100) / atrPct : 0
  const accel = c0 / close[n - 4] - 1 // akselerasi 3 candle terakhir
  return { run24, run6, volClimax, posisi, ema21Slope, atrPct, jarakEmaAtr, accel }
}

export function rezimDari(f: JaFitur): JaRezim {
  if (f.run6 >= 0.07 && f.volClimax >= 2.5) return 'PUMP'
  if (f.ema21Slope >= 0.012 && f.posisi >= 0.6) return 'BULLISH'
  if (f.ema21Slope <= -0.012 && f.posisi <= 0.45) return 'BEARISH'
  return 'SIDEWAYS'
}

// pemicu panen per rezim — PEMICU DINI: masuk saat lonjakan MULAI
// (momentum 6 jam), bukan sesudah 24 jam selesai. Inilah posisi
// tempat "jual ambisius tersentuh di hari itu" itu mungkin fisik.
// cfg tahap memungkinkan relaksasi terdokumentasi (bear lembut, dll).
export function pemicuPanen(
  rezim: JaRezim,
  f: JaFitur,
  cfg?: { sidewaysRun?: number; bearLembut?: boolean; bullAmbang?: number; pumpAmbang?: number },
): boolean {
  const sRun = cfg?.sidewaysRun ?? 0.035
  const bAmb = cfg?.bullAmbang ?? 0.05
  const pAmb = cfg?.pumpAmbang ?? 0.08
  switch (rezim) {
    case 'SIDEWAYS':
      return f.run6 >= sRun && f.posisi >= 0.6
    case 'BEARISH':
      return cfg?.bearLembut ? f.run6 >= 0.03 : f.run6 >= 0.04
    case 'BULLISH':
      return f.run6 >= bAmb && f.posisi >= 0.6
    case 'PUMP':
      return f.run6 >= pAmb && f.volClimax >= 2.2
  }
}

// ---------- daun keputusan (tabel yang ditempa) ----------
export interface JaDaun {
  kunci: string
  aktif: boolean
  areaPct: number // limit beli dipasang sedalam ini di bawah harga
  slPct: number // stop loss dari harga terisi
  ambisiusPct: number
  // statistik hasil penempaan (diisi mesin tempa)
  n?: number
  nFill?: number
  nSukses?: number
  nGagal?: number
  netMedianPct?: number
  sasaranMedianPct?: number
}

export function kunciDaun(rezim: JaRezim, f: JaFitur, frame = '1h'): string {
  const bRun = f.run24 < 0.1 ? 0 : f.run24 < 0.15 ? 1 : f.run24 < 0.25 ? 2 : 3
  const bVol = f.volClimax < 1.5 ? 0 : f.volClimax < 3 ? 1 : 2
  const bPos = f.posisi < 0.5 ? 0 : f.posisi < 0.8 ? 1 : 2
  const bSlope = f.ema21Slope < -0.01 ? 0 : f.ema21Slope < 0.01 ? 1 : 2
  const bRun6 = f.run6 < 0.03 ? 0 : f.run6 < 0.05 ? 1 : f.run6 < 0.08 ? 2 : 3
  const bAtr = f.atrPct < 1.5 ? 0 : f.atrPct < 3 ? 1 : f.atrPct < 6 ? 2 : 3
  const bJarak = f.jarakEmaAtr < 0.5 ? 0 : f.jarakEmaAtr < 1.5 ? 1 : f.jarakEmaAtr < 3 ? 2 : 3
  const bAcc = f.accel < 0 ? 0 : f.accel < 0.02 ? 1 : f.accel < 0.05 ? 2 : 3
  return `${frame}|${rezim}|run${bRun}|vol${bVol}|pos${bPos}|slp${bSlope}|m6${bRun6}|atr${bAtr}|jr${bJarak}|ac${bAcc}`
}

export function daunAwal(kunci: string): JaDaun {
  // titik berangkat konservatif-matang; akan ditempa per rezim
  const rezim = kunci.split('|')[1] as JaRezim
  const awal: Record<JaRezim, { area: number; sl: number; amb: number }> = {
    SIDEWAYS: { area: 1.5, sl: 4.0, amb: 5 },
    BEARISH: { area: 1.8, sl: 4.5, amb: 6 },
    BULLISH: { area: 1.2, sl: 5.0, amb: 8 },
    PUMP: { area: 1.0, sl: 5.5, amb: 10 },
  }
  const a = awal[rezim] ?? awal.SIDEWAYS
  // skala ATR: koin volatil butuh target & stop lebih lebar
  const bAtr = parseInt(kunci.split('|').find((s) => s.startsWith('atr'))?.slice(3) ?? '1', 10)
  const skalaAtr = [0.7, 1, 1.5, 2][bAtr] ?? 1
  return {
    kunci,
    aktif: true,
    areaPct: Math.min(JA_PARAM.areaMax, a.area * skalaAtr),
    slPct: Math.min(JA_PARAM.slMax, a.sl * skalaAtr),
    ambisiusPct: Math.min(JA_PARAM.ambMax, a.amb * skalaAtr),
  }
}

// ---------- simulasi satu trade (jantung ujian) ----------
export interface JaLedger {
  hasil: JaHasil
  netPct: number // hasil bersih bila jual di ambisius (atau 0 bila tak terisi/skip)
  sasaranNetPct: number // pembanding: bila jual disiplin di sasaran kecil
  hargaTerisi: number
  hargaAmbisius: number
  ambisiusTerisiJam: number // -1 bila tidak; jam sejak terisi sampai tersentuh
  longsorJam: number // -1 bila tidak; jam sampai close turun di bawah ambisius
  puncakPascaPct: number // kenaikan maksimum pasca-sentuh di atas ambisius (%)
}

const KET_GAGAL: ReadonlySet<JaHasil> = new Set(['SL-DULUAN', 'TAK-TERSENTUH', 'DILAMPAUI', 'TAK-LONGSOR'])

export function isGagal(h: JaHasil): boolean {
  return KET_GAGAL.has(h)
}

export function simJaTrade(
  visibleClose: number,
  horizon: JaCandle[],
  daun: Pick<JaDaun, 'aktif' | 'areaPct' | 'slPct' | 'ambisiusPct'>,
  opsi?: { fillWindow?: number; sentuhMax?: number; longsorWindow?: number },
): JaLedger {
  const kosong: JaLedger = {
    hasil: 'SKIP',
    netPct: 0,
    sasaranNetPct: 0,
    hargaTerisi: 0,
    hargaAmbisius: 0,
    ambisiusTerisiJam: -1,
    longsorJam: -1,
    puncakPascaPct: 0,
  }
  if (!daun.aktif) return { ...kosong, hasil: 'SKIP' }

  // jendela fisik: sama 24 jam di 1j maupun 4j (6 candle 4j = 24 jam)
  const P = {
    ...JA_PARAM,
    fillWindow: opsi?.fillWindow ?? JA_PARAM.fillWindow,
    sentuhMax: opsi?.sentuhMax ?? JA_PARAM.sentuhMax,
    longsorWindow: opsi?.longsorWindow ?? JA_PARAM.longsorWindow,
  }
  const areaHarga = visibleClose * (1 - daun.areaPct / 100)

  // 1) area entry harus terisi dalam jendela fill
  let fIdx = -1
  for (let i = 0; i < Math.min(P.fillWindow, horizon.length); i++) {
    if (horizon[i].l <= areaHarga) {
      fIdx = i
      break
    }
  }
  if (fIdx === -1) return { ...kosong, hasil: 'AREA-TAK-TERISI' }
  const terisi = areaHarga
  const beli = terisi * (1 + P.feePct / 100)
  const sl = terisi * (1 - daun.slPct / 100)
  const ambisius = terisi * (1 + daun.ambisiusPct / 100)
  const sasaran = terisi * (1 + P.sasaranPct / 100)

  // 2) gesek SL vs sentuh ambisius — candle per candle
  let hIdx = -1
  for (let i = fIdx; i < horizon.length; i++) {
    const b = horizon[i]
    if (b.l <= sl) return { ...kosong, hasil: 'SL-DULUAN', hargaTerisi: terisi, hargaAmbisius: ambisius }
    if (b.h >= ambisius) {
      hIdx = i
      break
    }
    if (i - fIdx + 1 >= P.sentuhMax) break // lewat sehari → gagal "di hari itu"
  }
  if (hIdx === -1) return { ...kosong, hasil: 'TAK-TERSENTUH', hargaTerisi: terisi, hargaAmbisius: ambisius }

  // 3) janji longsor: 24 jam sesudah sentuh
  const akhir = Math.min(hIdx + P.longsorWindow, horizon.length - 1)
  let longsorJam = -1
  let puncak = ambisius
  for (let i = hIdx + 1; i <= akhir; i++) {
    if (horizon[i].h > puncak) puncak = horizon[i].h
    if (longsorJam === -1 && horizon[i].c <= ambisius * (1 - P.longsorMinPct / 100)) longsorJam = i - hIdx
  }
  const puncakPascaPct = (puncak / ambisius - 1) * 100
  if (puncakPascaPct > P.epsDilampauiPct) {
    return {
      ...kosong,
      hasil: 'DILAMPAUI',
      hargaTerisi: terisi,
      hargaAmbisius: ambisius,
      ambisiusTerisiJam: hIdx - fIdx,
      puncakPascaPct,
    }
  }
  if (longsorJam === -1) {
    return {
      ...kosong,
      hasil: 'TAK-LONGSOR',
      hargaTerisi: terisi,
      hargaAmbisius: ambisius,
      ambisiusTerisiJam: hIdx - fIdx,
      puncakPascaPct,
    }
  }

  const jual = ambisius * (1 - P.feePct / 100)
  const netPct = (jual / beli - 1) * 100
  const sasaranNetPct = (sasaran * (1 - P.feePct / 100) / beli - 1) * 100
  return {
    hasil: 'SUkses',
    netPct,
    sasaranNetPct,
    hargaTerisi: terisi,
    hargaAmbisius: ambisius,
    ambisiusTerisiJam: hIdx - fIdx,
    longsorJam,
    puncakPascaPct,
  }
}

// ---------- median aman ----------
export function median(nilai: number[]): number {
  if (nilai.length === 0) return 0
  const s = [...nilai].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
