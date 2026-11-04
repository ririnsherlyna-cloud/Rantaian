// ============================================================
// V304-TELEGRAM — NEGARA (ingatan ringan sisi Telegram)
// Disimpan db/telegram-negara.json (atomik: tmp + rename).
// Chat pemilik terdaftar otomatis pada pesan pertama (/start).
// ============================================================
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface ChatTg {
  id: number
  nama: string
  sejak: string
}

export interface NegaraTg {
  chats: ChatTg[]
  laporanTerakhir: string // YYYY-MM-DD (hari WIB laporan pagi terakhir terkirim)
  sirens: Record<string, number> // "<hariUTC>:<SYMBOL>" -> epoch ms
  offsetUpdate: number // offset getUpdates (update_id terakhir + 1)
  pollingHidup: number // epoch ms terakhir loop polling terlihat
}

const FILE = join(process.cwd(), 'db', 'telegram-negara.json')
let cache: NegaraTg | null = null

function baku(): NegaraTg {
  return { chats: [], laporanTerakhir: '', sirens: {}, offsetUpdate: 0, pollingHidup: 0 }
}

export function bacaNegara(): NegaraTg {
  if (cache) return cache
  try {
    if (existsSync(FILE)) {
      const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<NegaraTg>
      cache = { ...baku(), ...parsed }
      return cache
    }
  } catch { /* rusak → mulai bersih */ }
  cache = baku()
  return cache
}

export function simpanNegara(n?: NegaraTg): void {
  const neg = n ?? cache ?? baku()
  cache = neg
  try {
    const tmp = `${FILE}.tmp`
    writeFileSync(tmp, JSON.stringify(neg, null, 1), 'utf8')
    renameSync(tmp, FILE)
  } catch (e) {
    console.error('[telegram] simpan negara gagal:', (e as Error).message)
  }
}

export function daftarChat(): number[] {
  return bacaNegara().chats.map((c) => c.id)
}

/** true bila chat BENAR-BENAR baru (perlu sambutan). */
export function daftarChatBaru(id: number, nama: string): boolean {
  const n = bacaNegara()
  if (n.chats.some((c) => c.id === id)) return false
  n.chats.push({ id, nama, sejak: new Date().toISOString() })
  simpanNegara(n)
  return true
}

export function sirenSudah(kunci: string): boolean {
  return bacaNegara().sirens[kunci] !== undefined
}

export function catatSiren(kunci: string): void {
  const n = bacaNegara()
  n.sirens[kunci] = Date.now()
  // pangkas siren > 3 hari (hemat)
  const batas = Date.now() - 3 * 86_400_000
  for (const k of Object.keys(n.sirens)) {
    if (n.sirens[k] < batas) delete n.sirens[k]
  }
  simpanNegara(n)
}

export function tandaiLaporan(hariWib: string): void {
  const n = bacaNegara()
  n.laporanTerakhir = hariWib
  simpanNegara(n)
}

export function simpanOffset(o: number): void {
  const n = bacaNegara()
  n.offsetUpdate = o
  n.pollingHidup = Date.now()
  simpanNegara(n)
}
