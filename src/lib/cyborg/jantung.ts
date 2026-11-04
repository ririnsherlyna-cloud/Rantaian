// ============================================================
// V302 JANTUNG — Detak hidup satu tubuh z.ai
// ------------------------------------------------------------
// Dipanggil dari instrumentation.ts setiap server menyala.
// Tugasnya:
//   1. NADI      : tiap 60 dtk cek pergantian hari UTC →
//                  begitu hari berganti, seluruh cache harian
//                  dibuang seketika (kesegaran pasar).
//   2. DETAK     : tiap 2 menit tulis data/nadi.json
//                  (bukti hidup + versi + hitungan detak).
//   3. PENYEMBUH : tiap 10 menit pastikan file-file inti masih
//                  ada di disk; yang hilang disalin ulang dari
//                  benih/ — jadi walau ada file terhapus, server
//                  berikutnya tetap menyala sehat.
// Semua dalam try/catch: jantung TIDAK BOLEH jatuhkan server.
// ============================================================

// V303: fs/path diambil lewat eval('require') — tak terlihat oleh
// bundler statis. Sebab: webpack menyusun instrumentation untuk
// runtime edge yang tak punya fs (Module not found), padahal jantung
// hanya pernah berdetak di runtime nodejs. eval('require') menyembunyikan
// ketergantungan dari analisis bundel tanpa mengubah perilaku.
/* eslint-disable no-eval */
const fs = (eval('require')('fs')) as typeof import('fs')
const path = (eval('require')('path')) as typeof import('path')
import { hariIniUTC, purgeCache } from './waktu'

const NADI = path.join(process.cwd(), 'data', 'nadi.json')
const BENIH = path.join(process.cwd(), 'benih')

const g = globalThis as unknown as {
  __jantungNyalakan?: boolean
  __jantungHari?: string
  __jantungDetak?: number
  __jantungPulih?: number
}

// daftar file inti yang wajib selalu ada (relatif terhadap root proyek)
const FILE_INTI = [
  'src/lib/cyborg/waktu.ts',
  'src/lib/cyborg/gerbang.ts',
  'src/lib/cyborg/kalibrasi.ts',
  'src/lib/cyborg/sapu10.ts',
  'src/lib/cyborg/kalibrasi-ambisius.json',
  'src/app/api/sapu10/route.ts',
  'src/components/arena/sapu10-panel.tsx',
]

function tulisNadi(catatan?: string): void {
  try {
    if (!fs.existsSync(path.dirname(NADI))) fs.mkdirSync(path.dirname(NADI), { recursive: true })
    const dulu = fs.existsSync(NADI)
      ? (JSON.parse(fs.readFileSync(NADI, 'utf8')) as { detak?: number; pulih?: number; lahir?: string; catatan?: string })
      : {}
    const nadi = {
      versi: 'V302-SATU-TUBUH',
      hidup: true,
      lahir: dulu.lahir ?? new Date().toISOString(),
      detak: (dulu.detak ?? 0) + 1,
      pulih: dulu.pulih ?? 0,
      hariUTC: hariIniUTC(),
      terakhirHidup: new Date().toISOString(),
      catatan: catatan ?? dulu.catatan ?? '',
    }
    fs.writeFileSync(NADI, JSON.stringify(nadi, null, 2), 'utf8')
  } catch {
    // diam — nadi gagal menulis tidak boleh menjatuhkan server
  }
}

function sembuhkan(): number {
  let pulih = 0
  for (const rel of FILE_INTI) {
    try {
      const target = path.join(process.cwd(), rel)
      if (fs.existsSync(target)) continue
      const sumber = path.join(BENIH, path.basename(rel))
      if (!fs.existsSync(sumber)) continue
      if (!fs.existsSync(path.dirname(target))) fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(sumber, target)
      pulih++
    } catch {
      // satu file gagal pulih tidak boleh menghentikan sisanya
    }
  }
  return pulih
}

export function nyalakanJantung(): void {
  if (g.__jantungNyalakan) return
  g.__jantungNyalakan = true
  g.__jantungHari = hariIniUTC()
  g.__jantungDetak = 0

  // detak pertama: pulihkan file inti yang hilang + tulis nadi
  const pulihAwal = sembuhkan()
  if (pulihAwal > 0) {
    g.__jantungPulih = (g.__jantungPulih ?? 0) + pulihAwal
    tulisNadi(`menyala — memulihkan ${pulihAwal} file inti dari benih`)
  } else {
    tulisNadi('menyala — semua file inti utuh')
  }

  // NADI: penjaga pergantian hari (tiap 30 dtk — kesegaran pasar)
  setInterval(() => {
    try {
      const hari = hariIniUTC()
      if (hari !== g.__jantungHari) {
        purgeCache() // buang SEMUA cache harian — pasar wajib fresh
        g.__jantungHari = hari
        tulisNadi(`hari berganti → ${hari}, cache dibuang, data segar`)
      }
    } catch {
      // diam
    }
  }, 30_000)

  // DETAK: bukti hidup (tiap 2 menit)
  setInterval(() => {
    try {
      g.__jantungDetak = (g.__jantungDetak ?? 0) + 1
      tulisNadi()
    } catch {
      // diam
    }
  }, 120_000)

  // PENYEMBUH: jaga file inti (tiap 10 menit)
  setInterval(() => {
    try {
      const n = sembuhkan()
      if (n > 0) {
        g.__jantungPulih = (g.__jantungPulih ?? 0) + n
        tulisNadi(`menyembuhkan ${n} file inti dari benih`)
      }
    } catch {
      // diam
    }
  }, 600_000)
}
