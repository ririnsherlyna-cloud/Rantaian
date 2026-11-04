// ============================================================
// PANEN JUAL AMBISIUS — tambang soal dari data REAL Binance
// ============================================================
// Tahapan: universe (USDT, qv≥3jt, V298-v2) → klines penuh
// (cache disk per 1000 candle, resumable) → deteksi episode
// kenaikan lintas rezim → episode-index-<frame>.jsonl.
// Semua deterministik dari data; tanpa Math.random.
// Dua frame waktu = dua keluarga soal yang sah (ritme beda):
//   1j (ritme jam) dan 4j (ritme 4-jam). TIDAK ada hitung ganda:
//   dedup per (simbol, startTs); horizon tahap longgar ditandai.
// Jalankan: bun scripts/ja_panen.ts --tahap 1..4 [--frame 1h|4h]
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import {
  type JaCandle,
  type JaRezim,
  type JaEpisodeMeta,
  fiturDari,
  rezimDari,
  pemicuPanen,
} from '../src/lib/exam/ja-inti'

const ROOT = '/home/z/my-project'
const DIR_IDX = path.join(ROOT, 'data', 'jual-ambisius')
const DIR_CACHE = path.join(ROOT, 'data', 'ja-cache')
const FILE_UNIVERSE = path.join(DIR_IDX, 'universe.json')
const FILE_STATUS = path.join(DIR_IDX, 'panen-status.json')
const SARAN_SOAL = 50_000

const args = process.argv.slice(2)
const tahap = args.includes('--tahap') ? parseInt(args[args.indexOf('--tahap') + 1] || '1', 10) : 1
const frame = args.includes('--frame') ? args[args.indexOf('--frame') + 1] || '1h' : '1h'
const INTERVAL = frame === '4h' ? '4h' : '1h'
const DIR_KLINES = path.join(DIR_CACHE, frame === '4h' ? 'klines-4h' : 'klines')
const FILE_INDEX = path.join(DIR_IDX, `episode-index-${frame}.jsonl`)

// horizon & bar fitur per frame (fisika 24 jam dijaga)
const HORIZON_BAR = frame === '4h' ? 24 : 48 // 4j×24=96 jam margin; 1j×48=48 jam
const BAR24 = frame === '4h' ? 6 : 24 // momentum 24 jam
const BAR6 = frame === '4h' ? 2 : 6 // momentum pendek (8 jam vs 6 jam)

interface CfgTahap {
  sidewaysRun: number
  spacing: number
  overlap: boolean
  bearLembut?: boolean
  bullAmbang?: number
  pumpAmbang?: number
}
const TAHAP: Record<string, CfgTahap> = {
  '1h-1': { sidewaysRun: 0.08, spacing: 48, overlap: false },
  '1h-2': { sidewaysRun: 0.07, spacing: 42, overlap: false },
  '1h-3': { sidewaysRun: 0.06, spacing: 36, overlap: true },
  '1h-4': { sidewaysRun: 0.06, spacing: 36, overlap: true, bearLembut: true, bullAmbang: 0.1, pumpAmbang: 0.12 },
  '4h-1': { sidewaysRun: 0.08, spacing: 12, overlap: false },
  '4h-2': { sidewaysRun: 0.07, spacing: 10, overlap: true },
  '4h-3': { sidewaysRun: 0.06, spacing: 9, overlap: true, bearLembut: true, bullAmbang: 0.1, pumpAmbang: 0.12 },
}
const cfg = TAHAP[`${frame}-${tahap}`] ?? TAHAP[`${frame}-1`]

const HOSTS = [
  'https://api-gcp.binance.com', // sehat saat api.binance.com ter-ban 418 (forensik 2026-10-13)
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
  'https://api.binance.com',
  'https://data-api.binance.vision',
]
let hostIdx = 0

async function bfetchJson(url: string, timeoutMs = 15_000, coba = 4): Promise<unknown> {
  for (let i = 0; i < coba; i++) {
    const host = HOSTS[hostIdx % HOSTS.length]
    try {
      const res = await fetch(host + url, { signal: AbortSignal.timeout(timeoutMs) })
      if (res.status === 429 || res.status === 418) {
        hostIdx++
        await new Promise((r) => setTimeout(r, 4000 * (i + 1))) // ban/limit → mundur lebih sopan
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as unknown
    } catch (e) {
      if (i === coba - 1) throw e
      hostIdx++
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw new Error('bfetch gagal')
}

function tidur(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------- universe: pasangan USDT likuid qv ≥ 3jt ----------
interface BarisUniverse {
  simbol: string
  qv: number
  harga: number
}

async function ambilUniverse(): Promise<BarisUniverse[]> {
  const raw = (await bfetchJson('/api/v3/ticker/24hr')) as Record<string, unknown>[]
  const daftar: BarisUniverse[] = []
  for (const r of raw) {
    const s = String(r.symbol ?? '')
    if (!s.endsWith('USDT')) continue
    if (/(UP|DOWN|BULL|BEAR)USDT$/.test(s)) continue // token leveraged: bukan kandang
    const qv = parseFloat(String(r.quoteVolume ?? '0'))
    if (!(qv >= 3_000_000)) continue
    daftar.push({ simbol: s, qv, harga: parseFloat(String(r.lastPrice ?? '0')) })
  }
  daftar.sort((a, b) => b.qv - a.qv)
  return daftar
}

// ---------- klines: cache disk + resumable ----------
const KELIPATAN_JAM = 3_600_000

async function ambilKlinesPenuh(simbol: string): Promise<JaCandle[]> {
  const dirSim = path.join(DIR_KLINES, simbol)
  fs.mkdirSync(dirSim, { recursive: true })
  const tanda = path.join(dirSim, 'SELESAI')

  const muatCache = (): JaCandle[] => {
    const semua: JaCandle[] = []
    const file = fs.readdirSync(dirSim).filter((f) => f.endsWith('.json')).sort()
    for (const f of file) {
      const baris = JSON.parse(fs.readFileSync(path.join(dirSim, f), 'utf8')) as unknown[][]
      for (const b of baris) {
        semua.push({ t: Number(b[0]), o: Number(b[1]), h: Number(b[2]), l: Number(b[3]), c: Number(b[4]), v: Number(b[5]) })
      }
    }
    return semua
  }

  if (fs.existsSync(tanda)) return muatCache()

  const semua: unknown[][] = []
  let startTime = 0
  for (;;) {
    const jendela = (await bfetchJson(
      `/api/v3/klines?symbol=${simbol}&interval=${INTERVAL}&limit=1000&startTime=${startTime}`,
    )) as unknown[][]
    if (!Array.isArray(jendela) || jendela.length === 0) break
    semua.push(...jendela)
    const terakhir = jendela[jendela.length - 1] as unknown[]
    const tTerakhir = Number(terakhir[0])
    if (jendela.length < 1000) break
    startTime = tTerakhir + KELIPATAN_JAM * (frame === '4h' ? 4 : 1)
    await tidur(90) // tempo sopan terhadap Binance (anti 418/429)
  }

  // tulis cache per 1000 candle
  for (let i = 0, ci = 0; i < semua.length; i += 1000, ci++) {
    fs.writeFileSync(path.join(dirSim, `${String(ci).padStart(4, '0')}.json`), JSON.stringify(semua.slice(i, i + 1000)))
  }
  if (semua.length > 0) {
    const terakhir = semua[semua.length - 1] as unknown[]
    fs.writeFileSync(tanda, JSON.stringify({ lastOpenTime: Number(terakhir[0]), fetchedAt: new Date().toISOString() }))
  }
  return muatCache()
}

// ---------- panen episode per simbol ----------
function tambangEpisode(simbol: string, candles: JaCandle[]): JaEpisodeMeta[] {
  const out: JaEpisodeMeta[] = []
  const minLen = 60 + HORIZON_BAR + 10
  if (candles.length < minLen) return out
  let startTerakhir = -1_000_000
  for (let i = 59; i <= candles.length - HORIZON_BAR - 1; i++) {
    if (i - startTerakhir < cfg.spacing) continue
    const jendela = candles.slice(i - 59, i + 1)
    if (jendela.some((x) => !(x.c > 0) || !(x.h >= x.l))) continue // data rusak → lompat
    const f = fiturDari(jendela, BAR24, BAR6)
    const rezim = rezimDari(f)
    if (!pemicuPanen(rezim, f, cfg)) continue
    out.push({
      num: 0, // diberi nomor setelah urut kronologis global
      simbol,
      startTs: jendela[0].t,
      rezim,
      run24: Math.round(f.run24 * 10000) / 10000,
      run6: Math.round(f.run6 * 10000) / 10000,
      volClimax: Math.round(f.volClimax * 100) / 100,
      posisi: Math.round(f.posisi * 1000) / 1000,
      frame,
    })
    startTerakhir = i
  }
  return out
}

// ---------- arus utama ----------
async function utama() {
  fs.mkdirSync(DIR_IDX, { recursive: true })
  fs.mkdirSync(DIR_KLINES, { recursive: true })
  console.log(`[PANEN] frame=${frame} tahap=${tahap} spacing=${cfg.spacing} sidewaysRun=${cfg.sidewaysRun} bearLembut=${!!cfg.bearLembut}`)

  // universe: pakai snapshot tersimpan bila masih segar (< 12 jam)
  let daftar: BarisUniverse[]
  const uLama = fs.existsSync(FILE_UNIVERSE)
    ? (JSON.parse(fs.readFileSync(FILE_UNIVERSE, 'utf8')) as { waktu: number; daftar: BarisUniverse[] })
    : null
  if (uLama && Date.now() - uLama.waktu < 12 * 3_600_000) {
    daftar = uLama.daftar
    console.log(`[PANEN] universe tersimpan: ${daftar.length} simbol`)
  } else {
    daftar = await ambilUniverse()
    fs.writeFileSync(
      FILE_UNIVERSE,
      JSON.stringify({ waktu: Date.now(), kriteria: 'USDT & qv>=3jt & bukan leveraged (V298-v2)', daftar }, null, 1),
    )
    console.log(`[PANEN] universe segar: ${daftar.length} simbol`)
  }

  // indeks lama = akumulasi (dedup per simbol+startTs, TIDAK ada hitung ganda)
  const sudah = new Set<string>()
  const semua: JaEpisodeMeta[] = []
  if (fs.existsSync(FILE_INDEX)) {
    for (const l of fs.readFileSync(FILE_INDEX, 'utf8').split('\n')) {
      if (!l.trim()) continue
      const e = JSON.parse(l) as JaEpisodeMeta
      sudah.add(`${e.simbol}|${e.startTs}`)
      semua.push(e)
    }
    console.log(`[PANEN] indeks lama: ${semua.length} episode → ditambah, bukan diganti`)
  }

  const perRezim: Record<string, number> = { SIDEWAYS: 0, BEARISH: 0, BULLISH: 0, PUMP: 0 }
  const mulai = Date.now()

  for (let s = 0; s < daftar.length; s++) {
    const { simbol } = daftar[s]
    try {
      const candles = await ambilKlinesPenuh(simbol)
      const eps = tambangEpisode(simbol, candles)
      let baru = 0
      for (const e of eps) {
        if (sudah.has(`${e.simbol}|${e.startTs}`)) continue
        sudah.add(`${e.simbol}|${e.startTs}`)
        semua.push(e)
        baru++
        perRezim[e.rezim]++
      }
      candles.length = 0 // lepas memori
      if (baru > 0) perRezim.__baru = (perRezim.__baru ?? 0) + baru
    } catch (e) {
      console.log(`[PANEN] ${simbol} tersandung: ${(e as Error).message}`)
    }
    if ((s + 1) % 25 === 0 || s === daftar.length - 1) {
      const menit = ((Date.now() - mulai) / 60000).toFixed(1)
      console.log(`[PANEN] ${s + 1}/${daftar.length} simbol | episode total: ${semua.length} | ${menit} menit`)
      fs.writeFileSync(
        FILE_STATUS,
        JSON.stringify({ updatedAt: new Date().toISOString(), frame, tahap, simbolProses: s + 1, simbolTotal: daftar.length, episode: semua.length, perRezim }, null, 1),
      )
    }
  }

  // nomor urut kronologis global — exam berjalan maju waktu
  semua.sort((a, b) => a.startTs - b.startTs || a.simbol.localeCompare(b.simbol))
  for (let i = 0; i < semua.length; i++) semua[i].num = i + 1

  fs.writeFileSync(FILE_INDEX, semua.map((e) => JSON.stringify(e)).join('\n'))
  const totalLintas = ['1h', '4h'].reduce((acc, fr) => {
    const p = path.join(DIR_IDX, `episode-index-${fr}.jsonl`)
    if (!fs.existsSync(p)) return acc
    return acc + fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).length
  }, 0)
  fs.writeFileSync(
    FILE_STATUS,
    JSON.stringify({ updatedAt: new Date().toISOString(), frame, tahap, selesai: true, simbolTotal: daftar.length, episode: semua.length, totalLintasFrame: totalLintas, perRezim, sasaran: SARAN_SOAL }, null, 1),
  )
  console.log(`[PANEN] SELESAI frame=${frame}: ${semua.length} episode | TOTAL lintas frame: ${totalLintas} (sasaran ${SARAN_SOAL})`)
  console.log(`[PANEN] per rezim baru: ${JSON.stringify(perRezim)}`)
}

utama().catch((e) => {
  console.error('[PANEN] fatal:', e)
  process.exit(1)
})
