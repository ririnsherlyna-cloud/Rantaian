// ============================================================
// JA-STORE — gudang abadi kalibrasi JUAL AMBISIUS (server-side)
// ============================================================
// Sumber kebenaran = FILE DI DISK (data/jual-ambisius/kalibrasi.json),
// BUKAN memori, BUKAN localStorage (Tugas F: localStorage = 0).
// - muatKalibrasi() : baca file + cache globalThis dengan penjaga
//   mtime — file berubah otomatis dimuat ulang.
// - Auto-load saat startup: PENJAGA menimba /api/kesehatan begitu
//   server nyala → keberadaan file diverifikasi sejak detik pertama,
//   dan /api/exam memuatnya pada request pertama.
// - Tahan restart server: file tetap di disk; hidup lagi = termuat lagi.
// ============================================================

import fs from 'node:fs'
import path from 'node:path'

export interface JaDaunTampil {
  kunci: string
  aktif: boolean
  areaPct: number
  slPct: number
  ambisiusPct: number
  n?: number
  nFill?: number
  nSukses?: number
  nGagal?: number
  netMedianPct?: number
  sasaranMedianPct?: number
}

export interface JaKalibrasi {
  protokol: string
  versi: string
  computedAt: string
  sasaranSoal: number
  rondeTempa: number
  konvergen: boolean
  nSoal: number
  nLulus: number
  nLulusEntry: number
  nLulusKosong: number
  nGagal: number
  passRate: number
  parameter: Record<string, unknown>
  perRezim: Record<string, unknown>
  jenisGagal: Record<string, number>
  tabel: JaDaunTampil[]
  ledger: { id: string; celah: string; aturan: string }[]
  riwayatRonde: { ronde: number; gagal: number; sukses: number; daunAktif: number }[]
  contohSukses: { num: number; simbol: string; startTs: number; rezim: string; netPct: number }[]
  kejujuran: string
}

const g = globalThis as unknown as {
  __jaKalibrasi?: JaKalibrasi | null
  __jaMtimeMs?: number
}

export function jalurKalibrasi(): string {
  return path.join(process.cwd(), 'data', 'jual-ambisius', 'kalibrasi.json')
}

/** Muat kalibrasi dari DISK. Cache memori hanya cermin — mtime berubah = muat ulang. */
export function muatKalibrasi(): JaKalibrasi | null {
  try {
    const p = jalurKalibrasi()
    if (!fs.existsSync(p)) {
      g.__jaKalibrasi = null
      g.__jaMtimeMs = 0
      return null
    }
    const mtime = fs.statSync(p).mtimeMs
    if (g.__jaKalibrasi && g.__jaMtimeMs === mtime) return g.__jaKalibrasi
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as JaKalibrasi
    if (parsed?.protokol !== 'JA-KALIBRASI') return null // file asing → tolak
    g.__jaKalibrasi = parsed
    g.__jaMtimeMs = mtime
    return parsed
  } catch {
    return null // gagal baca → jangan pernah meruntuhkan pemanggil
  }
}

/** Ringkasan aman untuk API: null bila belum ditempa. */
export function ringkasKalibrasi() {
  const k = muatKalibrasi()
  if (!k) return null
  return {
    protokol: k.protokol,
    versi: k.versi,
    computedAt: k.computedAt,
    sasaranSoal: k.sasaranSoal,
    rondeTempa: k.rondeTempa,
    konvergen: k.konvergen,
    nSoal: k.nSoal,
    nLulus: k.nLulus,
    nLulusEntry: k.nLulusEntry,
    nLulusKosong: k.nLulusKosong,
    nGagal: k.nGagal,
    passRate: k.passRate,
    perRezim: k.perRezim,
    jenisGagal: k.jenisGagal,
    ledger: k.ledger,
    kejujuran: k.kejujuran,
    daunAktif: k.tabel.filter((d) => d.aktif).length,
    daunTotal: k.tabel.length,
    topDaun: k.tabel
      .filter((d) => d.aktif && (d.nSukses ?? 0) > 0)
      .slice(0, 12)
      .map((d) => ({
        kunci: d.kunci,
        ambisiusPct: d.ambisiusPct,
        slPct: d.slPct,
        areaPct: d.areaPct,
        n: d.n,
        nSukses: d.nSukses,
        netMedianPct: d.netMedianPct,
        sasaranMedianPct: d.sasaranMedianPct,
      })),
    contohSukses: k.contohSukses.slice(0, 12),
  }
}
