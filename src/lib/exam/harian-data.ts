// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA HARIAN — DATA & KEBENARAN (data NYATA Binance)
// ═══════════════════════════════════════════════════════════════════
// Mandat pemilik: "1230 soal ujian gila koin terbang harian" — koin
// yang dalam SEHARI melonjak 100% hingga 24000%+.
//
// Sumber kebenaran = db/ujian-rahasia/harian/kebenaran-harian.json,
// dihitung kolektor (scripts/ujian_harian_kumpul.py) langsung dari
// klines HARIAN api.binance.com. TIDAK ADA fabrikasi.
// Otak (harian-otak.ts) dilarang membaca berkas ini saat menjawab —
// ia hanya membaca candle harian mentah lalu mendeteksi sendiri.
import fs from 'fs'
import path from 'path'

export interface KebenaranHarianKoin {
  simbol: string
  gainPct: number
  tanggalPuncak: string | null
  closeSebelum: number | null
  highHari: number | null
  jumlahHari: number
  jumlahHariGila100: number
  jumlahHariGila50: number
  hariGila?: Array<{ tanggal: string; gainPct: number; closeSebelum: number; highHari: number }>
  catatan: string
}

export interface KebenaranHarian {
  sumber: string
  caraHitung: string
  diambil: string
  jumlah: number
  koin: KebenaranHarianKoin[]
}

export interface CandleHarian {
  tanggal: string // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
}

export function akarData(): string {
  // HUKUM STANDALONE: server chdir ke .next/standalone → ROOT wajib dari env
  const root = process.env.PENJAGA_ROOT || process.cwd()
  return path.join(root, 'db', 'ujian-rahasia', 'harian')
}

export function bacaKebenaranHarian(): KebenaranHarian | null {
  const p = path.join(akarData(), 'kebenaran-harian.json')
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as KebenaranHarian
  } catch {
    return null
  }
}

export function bacaKlinesHarian(simbol: string): CandleHarian[] | null {
  const p = path.join(akarData(), 'klines', `${simbol}.json`)
  if (!fs.existsSync(p)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as unknown[][]
    const keluar: CandleHarian[] = []
    for (const k of raw) {
      const t = Number(k[0])
      const open = parseFloat(String(k[1]))
      const high = parseFloat(String(k[2]))
      const low = parseFloat(String(k[3]))
      const close = parseFloat(String(k[4]))
      if (!isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) continue
      keluar.push({ tanggal: new Date(t).toISOString().slice(0, 10), open, high, low, close })
    }
    return keluar
  } catch {
    return null
  }
}

export function daftarSimbolCacheHarian(): string[] {
  const d = path.join(akarData(), 'klines')
  if (!fs.existsSync(d)) return []
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort()
}
