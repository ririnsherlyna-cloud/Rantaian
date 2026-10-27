// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA — DATA & KEBENARAN (bahan uji dari data NYATA Binance)
// ═══════════════════════════════════════════════════════════════════
// Sumber kebenaran = db/ujian-rahasia/kebenaran.json yang dihitung
// kolektor (scripts/ujian_kumpul.py) langsung dari klines bulanan
// api.binance.com. TIDAK ADA fabrikasi. Otak (rahasia-otak.ts) tidak
// boleh membaca berkas ini saat menjawab — ia hanya boleh membaca
// candle mentah lalu mendeteksi sendiri.
import fs from 'fs'
import path from 'path'

export interface KebenaranKoin {
  simbol: string
  gainPct: number
  bulanLow: string | null
  bulanPuncak: string | null
  hargaLow: number | null
  hargaHigh: number | null
  jumlahBulan: number
  catatan: string
}

export interface Kebenaran {
  sumber: string
  caraHitung: string
  diambil: string
  jumlah: number
  koin: KebenaranKoin[]
}

export interface CandleBulan {
  bulan: string // YYYY-MM
  open: number
  high: number
  low: number
  close: number
}

export function akarData(): string {
  return path.join(process.cwd(), 'db', 'ujian-rahasia')
}

export function bacaKebenaran(): Kebenaran | null {
  const p = path.join(akarData(), 'kebenaran.json')
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as Kebenaran
  } catch {
    return null
  }
}

export function bacaKlines(simbol: string): CandleBulan[] | null {
  const p = path.join(akarData(), 'klines', `${simbol}.json`)
  if (!fs.existsSync(p)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as unknown[][]
    const keluar: CandleBulan[] = []
    for (const k of raw) {
      const t = Number(k[0])
      const open = parseFloat(String(k[1]))
      const high = parseFloat(String(k[2]))
      const low = parseFloat(String(k[3]))
      const close = parseFloat(String(k[4]))
      if (!isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) continue
      keluar.push({ bulan: new Date(t).toISOString().slice(0, 7), open, high, low, close })
    }
    return keluar
  } catch {
    return null
  }
}

export function daftarSimbolCache(): string[] {
  const d = path.join(akarData(), 'klines')
  if (!fs.existsSync(d)) return []
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort()
}
