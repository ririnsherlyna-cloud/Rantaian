// ============================================================
// V302 SAPU10 — Mesin sapuan mandiri 10 koin (satu tubuh z.ai)
// ------------------------------------------------------------
// Warisan V300-SAPU10 (rekonstruksi penuh setelah rollback
// workspace membuktikan kerja tanpa lapisan keabadian musnah):
//   • Funnel V298-v2 : semua pasangan USDT likuid (qv ≥ 3 jt)
//   • Gerbang V299b  : 3 lapis anti-pegged
//   • Skor terkunci  : 35% likuiditas + 30% volatilitas sehat
//                      + 20% momentum + 15% kesejajaran
//   • Level V273     : E → T → S dari ATR-7 hari
//   • JUAL AMBISIUS  : dari kalibrasi ABADI (kalibrasi.ts)
// Perbedaan mutlak vs V300:
//   • Semua cache sadar pergantian hari (waktu.ts) — label
//     tanggal tidak pernah lagi macet di hari lama.
//   • Engine tidak pernah melempar error ke rute — semua
//     kegagalan jaringan berujung data SIMPANAN berlabel jujur.
//   • Snapshot disk tiap sapuan sukses → restart server = data
//     langsung tampil, bukan layar kosong.
// ============================================================

import fs from 'fs'
import path from 'path'
import { cacheHarian, hariIniUTC, jamUTC } from './waktu'
import { tertangkapGerbang } from './gerbang'
import { muatKalibrasi, statusKalibrasi } from './kalibrasi'

// ---------- tipe publik ----------

export interface LevelKoin {
  entry: number
  sasaran: number
  stop: number
  ambisius: number | null
  ambisiusAlasan: string
  ambisiusLulus: boolean
}

export interface KoinSapuan {
  simbol: string
  nama: string
  skor: number
  harga: number
  perubahan24h: number
  qv24h: number
  atr7Pct: number
  mom7: number
  rsi14: number
  bias: 'NAIK' | 'TURUN' | 'NETRAL'
  rezimKoin: 'SIDEWAYS' | 'BEARISH' | 'BULLISH'
  level: LevelKoin
  kalibrasiLabel: string
}

export interface HasilSapuan {
  hari: string
  jam: string
  pada: string
  mode: 'HIDUP' | 'SIMPANAN'
  usang: boolean
  dariSimpangan: boolean
  funnel: { pasanganUsdt: number; likuid: number; lolosGerbang: number; dinilai: number; terpilih: number }
  koin: KoinSapuan[]
  kalibrasi: { status: string; versi: string; terkalibrasi: boolean; sumber: string; catatan: string }
  catatan: string[]
}

// ---------- jaringan: rantai mirror Binance publik ----------

const HOST_SPOT = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api-gcp.binance.com',
  'https://data-api.binance.vision',
]
const gHost = globalThis as unknown as { __sapu10Host?: string; __sapu10Putus?: number }

async function ambil<T>(jalur: string, timeoutMs = 12_000): Promise<T> {
  if (gHost.__sapu10Putus && Date.now() < gHost.__sapu10Putus) throw new Error('sirkuit-terbuka')
  let galat: unknown
  const hosts = gHost.__sapu10Host
    ? [gHost.__sapu10Host, ...HOST_SPOT.filter((h) => h !== gHost.__sapu10Host)]
    : HOST_SPOT
  for (const host of hosts) {
    try {
      const res = await fetch(host + jalur, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) throw new Error(`${res.status} ${jalur} @ ${host}`)
      if (gHost.__sapu10Host !== host) gHost.__sapu10Host = host
      gHost.__sapu10Putus = 0
      return (await res.json()) as T
    } catch (e) {
      galat = e
    }
  }
  const g2 = globalThis as unknown as { __sapu10Gagal?: number }
  g2.__sapu10Gagal = (g2.__sapu10Gagal ?? 0) + 1
  if (g2.__sapu10Gagal >= 3) gHost.__sapu10Putus = Date.now() + 60_000
  throw galat
}

// ---------- pembantu hitung ----------

interface Candle1d {
  t: number; o: number; h: number; l: number; c: number; qv: number
}

function ema(v: number[], n: number): number {
  if (!v.length) return NaN
  const k = 2 / (n + 1)
  let e = v[0]
  for (let i = 1; i < v.length; i++) e = v[i] * k + e * (1 - k)
  return e
}

function rsi(c: number[], n = 14): number {
  if (c.length < n + 1) return 50
  let naik = 0, turun = 0
  for (let i = c.length - n; i < c.length; i++) {
    const d = c[i] - c[i - 1]
    if (d >= 0) naik += d; else turun -= d
  }
  if (turun === 0) return 100
  const rs = naik / n / (turun / n)
  return 100 - 100 / (1 + rs)
}

/** ATR% (14) dari candle harian. */
function atrPct(c: Candle1d[]): number {
  if (c.length < 2) return 0
  const ambil = Math.min(15, c.length)
  let sum = 0, n = 0
  for (let i = c.length - ambil + 1; i < c.length; i++) {
    const p = c[i - 1] ?? c[i]
    const tr = Math.max(c[i].h - c[i].l, Math.abs(c[i].h - p.c), Math.abs(c[i].l - p.c))
    sum += tr; n++
  }
  const akhir = c[c.length - 1]
  return akhir.c > 0 ? (sum / n / akhir.c) * 100 : 0
}

/** ATR absolut 7 hari (satuan harga) — dasar level E/T/S warisan V273. */
function atr7(c: Candle1d[]): number {
  if (c.length < 8) return 0
  let sum = 0
  for (let i = c.length - 7; i < c.length; i++) {
    const p = c[i - 1] ?? c[i]
    sum += Math.max(c[i].h - c[i].l, Math.abs(c[i].h - p.c), Math.abs(c[i].l - p.c))
  }
  return sum / 7
}

/** ATR absolut 30 hari — penyebut rasio ekspansi volatilitas. */
function atr30abs(c: Candle1d[]): number {
  if (c.length < 31) return 0
  let sum = 0
  for (let i = c.length - 30; i < c.length; i++) {
    const p = c[i - 1] ?? c[i]
    sum += Math.max(c[i].h - c[i].l, Math.abs(c[i].h - p.c), Math.abs(c[i].l - p.c))
  }
  return sum / 30
}

function mom7(c: Candle1d[]): number {
  if (c.length < 8) return 0
  const kini = c[c.length - 1].c
  const dulu = c[c.length - 8].c
  return dulu > 0 ? ((kini - dulu) / dulu) * 100 : 0
}

function fmtHarga(h: number): string {
  if (!Number.isFinite(h)) return '-'
  if (h >= 1000) return h.toFixed(2)
  if (h >= 1) return h.toFixed(4)
  if (h >= 0.01) return h.toFixed(5)
  return h.toFixed(8)
}

// ---------- funnel ----------

interface Pasangan { simbol: string; base: string; qv: number; harga: number; perubahan: number }

async function tarikPasangan(): Promise<Pasangan[]> {
  const [info, ticker] = await Promise.all([
    ambil<{ symbols: { symbol: string; baseAsset: string; quoteAsset: string; status: string }[] }>('/api/v3/exchangeInfo'),
    ambil<{ symbol: string; lastPrice: string; quoteVolume: string; priceChangePercent: string }[]>('/api/v3/ticker/24hr'),
  ])
  const qvMap = new Map<string, { qv: number; harga: number; perubahan: number }>()
  for (const t of ticker) {
    const qv = parseFloat(t.quoteVolume)
    const harga = parseFloat(t.lastPrice)
    if (Number.isFinite(qv)) qvMap.set(t.symbol, { qv, harga, perubahan: parseFloat(t.priceChangePercent) || 0 })
  }
  const out: Pasangan[] = []
  for (const s of info.symbols) {
    if (s.quoteAsset !== 'USDT' || s.status !== 'TRADING') continue
    const m = qvMap.get(s.symbol)
    if (!m || m.qv < 3_000_000) continue
    const base = s.baseAsset
    if (/(UP|DOWN|BULL|BEAR)$/.test(base)) continue // leveraged token
    out.push({ simbol: s.symbol, base, qv: m.qv, harga: m.harga, perubahan: m.perubahan })
  }
  out.sort((a, b) => b.qv - a.qv)
  return out
}

interface Kandidat extends Pasangan {
  candle: Candle1d[]
  atrPct14: number
  mom7: number
  rasioMa: number
  rentang7: number
  rsi14: number
  gapPct: number
  posisiKemarin: number
  atrRasio: number
}

async function tarikKandidat(daftar: Pasangan[], batas = 220): Promise<Kandidat[]> {
  const pool = daftar.slice(0, batas)
  const hasil: Kandidat[] = []
  const CONC = 6
  for (let i = 0; i < pool.length; i += CONC) {
    const batch = pool.slice(i, i + CONC)
    const settled = await Promise.allSettled(
      batch.map(async (p) => {
        const raw = await ambil<unknown[][]>(`/api/v3/klines?symbol=${encodeURIComponent(p.simbol)}&interval=1d&limit=60`, 10_000)
        const candle: Candle1d[] = raw.map((k) => ({
          t: k[0] as number, o: parseFloat(k[1] as string), h: parseFloat(k[2] as string),
          l: parseFloat(k[3] as string), c: parseFloat(k[4] as string), qv: parseFloat(k[7] as string),
        }))
        if (candle.length < 35) throw new Error('kurang-sejarah')
        const closes = candle.map((x) => x.c)
        const ema20 = ema(closes, 20)
        const hi7 = Math.max(...candle.slice(-7).map((x) => x.h))
        const lo7 = Math.min(...candle.slice(-7).map((x) => x.l))
        const atr14 = atrPct(candle)
        const m7 = mom7(candle)
        const kemarin = candle[candle.length - 2] ?? candle[candle.length - 1]
        const hariIni = candle[candle.length - 1]
        const rngKemarin = kemarin.h - kemarin.l
        const a30 = atr30abs(candle)
        return {
          ...p,
          candle,
          atrPct14: atr14,
          mom7: m7,
          rasioMa: ema20 > 0 ? closes[closes.length - 1] / ema20 : 1,
          rentang7: lo7 > 0 ? ((hi7 - lo7) / lo7) * 100 : 999,
          rsi14: rsi(closes),
          gapPct: kemarin.c > 0 ? ((hariIni.o - kemarin.c) / kemarin.c) * 100 : 0,
          posisiKemarin: rngKemarin > 0 ? (kemarin.c - kemarin.l) / rngKemarin : 0.5,
          atrRasio: a30 > 0 ? atr7(candle) / a30 : 1,
        }
      }),
    )
    for (let j = 0; j < batch.length; j++) {
      const r = settled[j]
      if (r.status === 'fulfilled') hasil.push(r.value)
    }
  }
  return hasil
}

// ---------- skor kualitas 35/30/20/15 ----------

function skorKualitas(k: Kandidat): number {
  const likuid = Math.min(1, Math.max(0, Math.log10(k.qv) - 6.5) / (Math.log10(500_000_000) - 6.5)) // 3jt..500jt
  const volSehat = Math.exp(-0.5 * Math.pow((k.atrPct14 - 4.5) / 2.8, 2)) // Gaussian sekitar 4,5%/hari
  const momen = Math.min(1, Math.max(0, Math.abs(k.mom7) / 12)) // bergerak berarti dua arah
  const sejajar = k.rasioMa > 1.02 ? 1 : k.rasioMa > 0.98 ? 0.6 : k.rasioMa > 0.9 ? 0.3 : 0.1
  return 100 * (0.35 * likuid + 0.30 * volSehat + 0.20 * momen + 0.15 * sejajar)
}

function rezimKoin(k: Kandidat): { rezim: KoinSapuan['rezimKoin']; bias: KoinSapuan['bias'] } {
  if (k.mom7 > 3 && k.rasioMa > 1.01) return { rezim: 'BULLISH', bias: 'NAIK' }
  if (k.mom7 < -3 && k.rasioMa < 0.99) return { rezim: 'BEARISH', bias: 'TURUN' }
  return { rezim: 'SIDEWAYS', bias: 'NETRAL' }
}

// ---------- JUAL AMBISIUS (kalibrasi abadi) ----------

function hitungAmbisius(k: Kandidat, e: number, sasaran: number): { harga: number | null; alasan: string; lulus: boolean } {
  const kal = muatKalibrasi()
  const atr = atr7(k.candle)
  const label = kal.sertifikat
    ? `terkalibrasi ${kal.versi} (ujian ${kal.sertifikat.lulus}/${kal.sertifikat.total_soal} lulus)`
    : 'belum terkalibrasi ujian 50.000 soal — angka warisan, label observasi BUKAN janji'

  // fitur keputusan (semua diketahui SEBELUM/SAAT hari berjalan — bebas kebocoran)
  const qvRata = k.candle.slice(-30).reduce((s, x) => s + x.qv, 0) / Math.max(1, k.candle.slice(-30).length)
  const qvRasio = qvRata > 0 ? k.candle[k.candle.length - 1].qv / qvRata : 1
  const puncak20 = Math.max(...k.candle.slice(-20).map((x) => x.h))
  const fitur: Record<string, number> = {
    atrPct: k.atrPct14,
    mom7: k.mom7,
    rasioMa: k.rasioMa,
    rsi: k.rsi14,
    qvRasio,
    jarakPuncak: k.harga > 0 ? ((puncak20 - k.harga) / k.harga) * 100 : 0,
    gapPct: k.gapPct,
    posisiKemarin: k.posisiKemarin,
    atrRasio: k.atrRasio,
    range7: k.rentang7,
  }

  const cegah: string[] = []
  const daun = (kal.gerbang_ambisius as { daun?: { k: number; tol: number; rezim: string; syarat: { fitur: string; arah: 'max' | 'min'; batas: number }[] }[] }).daun
  if (Array.isArray(daun) && daun.length > 0) {
    // format daun ujian: cari daun pertama yang cocok (pra-hari + rezim koin)
    const cocok = daun.find((d) => {
      if (d.rezim && d.rezim !== rezimKoin(k).rezim) return false
      return d.syarat.every((s) => {
        const v = fitur[s.fitur]
        if (!Number.isFinite(v)) return false
        return s.arah === 'max' ? v <= s.batas : v >= s.batas
      })
    })
    if (!cocok) {
      return { harga: null, alasan: 'gerbang menutup: di luar kotak kalibrasi (tak ada daun yang cocok)', lulus: false }
    }
    const amb = e + cocok.k * atr
    const final = kal.ambisius.butuh_sasaran_dulu ? Math.max(amb, sasaran) : amb
    const sert = kal.sertifikat
    const labelDaun = sert
      ? `janji longsor terkalibrasi: ${sert.lulus_pct ?? 100}% ditepati (${sert.tercapai ?? '-'} sentuhan, salah ${sert.salah ?? 0}) — sentuhan milik pasar`
      : label
    return { harga: final, alasan: labelDaun, lulus: true }
  }
  const syarat = kal.gerbang_ambisius.syarat
  if (Array.isArray(syarat) && syarat.length > 0) {
    // format kalibrasi ujian: daftar syarat {fitur, arah, batas}
    for (const s of syarat) {
      const v = fitur[s.fitur]
      if (!Number.isFinite(v)) {
        cegah.push(`${s.fitur} tak terukur`)
        continue
      }
      const buruk = s.arah === 'max' ? v > s.batas : v < s.batas
      if (buruk) cegah.push(`${s.fitur}=${v.toFixed(2)} ${s.arah === 'max' ? '>' : '<'} ${Number(s.batas).toFixed(2)}`)
    }
  } else {
    // format warisan (pra-kalibrasi) — angka tetap dari JSON
    const ger = kal.gerbang_ambisius as unknown as Record<string, number>
    if (k.atrPct14 > (ger.maks_atr_pct ?? 9)) cegah.push(`ATR ${k.atrPct14.toFixed(1)}% > batas`)
    if (k.mom7 > (ger.maks_mom7 ?? 18)) cegah.push(`mom7 ${k.mom7.toFixed(1)}% > batas`)
    const jarakPuncak = fitur.jarakPuncak
    if (jarakPuncak < -(ger.maks_jarak_dari_puncak20_pct ?? 22)) cegah.push(`harga ${Math.abs(jarakPuncak).toFixed(1)}% di bawah puncak20 > batas`)
    if (k.rsi14 > (ger.maks_rsi14 ?? 78)) cegah.push(`RSI ${k.rsi14.toFixed(0)} > batas`)
    if (qvRasio < (ger.min_qv_rasio ?? 0.7)) cegah.push(`volume hari ini ${qvRasio.toFixed(2)}× rata-rata < batas`)
  }
  if (cegah.length > 0) return { harga: null, alasan: `gerbang menutup: ${cegah[0]}`, lulus: false }

  const amb = e + kal.ambisius.k_atr * atr
  const bawah = e + kal.ambisius.k_atr_min * atr
  const atas = e + kal.ambisius.k_atr_maks * atr
  const jepit = Math.min(Math.max(amb, bawah), atas)
  const final = kal.ambisius.butuh_sasaran_dulu ? Math.max(jepit, sasaran) : jepit
  return { harga: final, alasan: label, lulus: true }
}

// ---------- level E→T→S ----------

function hitungLevel(k: Kandidat): LevelKoin {
  const atr = atr7(k.candle)
  const harga = k.harga
  const { bias } = rezimKoin(k)
  const e = bias === 'TURUN' ? harga + 0.3 * atr : harga - 0.3 * atr
  const sasaran = bias === 'TURUN' ? e - 1.5 * atr : e + 1.5 * atr
  const stop = bias === 'TURUN' ? e + 1.0 * atr : e - 1.0 * atr
  const amb = hitungAmbisius(k, e, Math.abs(sasaran - e) > 0 ? sasaran : e + 1.5 * atr)
  return {
    entry: e,
    sasaran,
    stop,
    ambisius: amb.harga,
    ambisiusAlasan: amb.alasan,
    ambisiusLulus: amb.lulus,
  }
}

// ---------- snapshot disk (keabadian) ----------

const SNAP = path.join(process.cwd(), 'data', 'sapu10-terakhir.json')

function simpanSnapshot(hasil: HasilSapuan): void {
  try {
    if (!fs.existsSync(path.dirname(SNAP))) fs.mkdirSync(path.dirname(SNAP), { recursive: true })
    fs.writeFileSync(SNAP, JSON.stringify(hasil), 'utf8')
  } catch {
    // penyimpanan gagal — jangan pernah crash karena ini
  }
}

function bacaSnapshot(): HasilSapuan | null {
  try {
    if (!fs.existsSync(SNAP)) return null
    const j = JSON.parse(fs.readFileSync(SNAP, 'utf8')) as HasilSapuan
    return j && j.koin ? j : null
  } catch {
    return null
  }
}

// ---------- mesin utama ----------

async function sapuMurni(): Promise<HasilSapuan> {
  const catatan: string[] = []
  const pasangan = await tarikPasangan()
  const likuid = pasangan.length
  const kandidat = await tarikKandidat(pasangan)
  const lolosGerbang = kandidat.filter((k) =>
    !tertangkapGerbang(k.simbol, {
      atrPct: k.atrPct14, mom7: k.mom7, rasioMa: k.rasioMa, rentang7: k.rentang7,
    }),
  )
  if (lolosGerbang.length < 40) catatan.push('kandidat sedikit — gerbang statistik menangkap banyak koin pendam')

  const dinilai = lolosGerbang
    .map((k) => ({ k, skor: skorKualitas(k) }))
    .sort((a, b) => b.skor - a.skor)
  const sepuluh = dinilai.slice(0, 10)

  const koin: KoinSapuan[] = sepuluh.map(({ k, skor }) => {
    const { rezim, bias } = rezimKoin(k)
    const statKal = statusKalibrasi()
    return {
      simbol: k.simbol,
      nama: k.base,
      skor: Math.round(skor * 10) / 10,
      harga: k.harga,
      perubahan24h: k.perubahan,
      qv24h: k.qv,
      atr7Pct: Math.round(k.atrPct14 * 100) / 100,
      mom7: Math.round(k.mom7 * 100) / 100,
      rsi14: Math.round(k.rsi14),
      bias,
      rezimKoin: rezim,
      level: hitungLevel(k),
      kalibrasiLabel: statKal.terkalibrasi
        ? `ambisius terkalibrasi (${statKal.versi})`
        : 'ambisius observasi — belum terkalibrasi ujian 50.000 soal',
    }
  })

  const hasil: HasilSapuan = {
    hari: hariIniUTC(),
    jam: jamUTC(),
    pada: new Date().toISOString(),
    mode: 'HIDUP',
    usang: false,
    dariSimpangan: false,
    funnel: {
      pasanganUsdt: pasangan.length,
      likuid,
      lolosGerbang: lolosGerbang.length,
      dinilai: dinilai.length,
      terpilih: koin.length,
    },
    koin,
    kalibrasi: { ...statusKalibrasi(), catatan: muatKalibrasi().kejujuran },
    catatan,
  }
  simpanSnapshot(hasil)
  return hasil
}

/** Sapuan publik: sadar hari, tak pernah gagal, punya simpanan. */
export async function jalankanSapu10(force = false): Promise<HasilSapuan> {
  if (force) {
    try {
      const h = await sapuMurni()
      return h
    } catch (e) {
      const snap = bacaSnapshot()
      if (snap) {
        return {
          ...snap,
          mode: 'SIMPANAN',
          usang: snap.hari !== hariIniUTC(),
          dariSimpangan: true,
          catatan: [...(snap.catatan ?? []), `jaringan gagal (${e instanceof Error ? e.message : 'galat'}) — data simpangan disk`],
        }
      }
      return hasilKosong(`jaringan gagal & belum ada simpangan (${e instanceof Error ? e.message : 'galat'})`)
    }
  }

  const { data, hari, umurMs, usang } = await cacheHarian<HasilSapuan>('sapu10', 5 * 60_000, sapuMurni)
  if (data) {
    if (usang && hari !== hariIniUTC()) {
      // data lintas hari dari cache memori — beri label jujur, jangan disamarkan
      return { ...data, mode: 'SIMPANAN', usang: true, catatan: [...(data.catatan ?? []), `cache hari ${hari} — menunggu sapuan segar hari ${hariIniUTC()}`] }
    }
    return data
  }
  const snap = bacaSnapshot()
  if (snap) {
    return {
      ...snap,
      mode: 'SIMPANAN',
      usang: snap.hari !== hariIniUTC(),
      dariSimpangan: true,
      catatan: [...(snap.catatan ?? []), `sapuan hidup gagal — data simpangan disk`],
    }
  }
  return hasilKosong('sapuan hidup gagal & belum ada simpangan — coba tombol SAPU ULANG')
}

function hasilKosong(pesan: string): HasilSapuan {
  return {
    hari: hariIniUTC(),
    jam: jamUTC(),
    pada: new Date().toISOString(),
    mode: 'SIMPANAN',
    usang: false,
    dariSimpangan: false,
    funnel: { pasanganUsdt: 0, likuid: 0, lolosGerbang: 0, dinilai: 0, terpilih: 0 },
    koin: [],
    kalibrasi: { ...statusKalibrasi(), catatan: muatKalibrasi().kejujuran },
    catatan: [pesan],
  }
}
