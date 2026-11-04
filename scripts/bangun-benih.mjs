#!/usr/bin/env node
// ============================================================
// V302 BANGUN-BENIH — Pembuat lumbung benih satu tubuh z.ai
// ------------------------------------------------------------
// Menyalin SEMUA file inti ke benih/ + manifest.json (sha256).
// benih/ ikut commit git → walau workspace di-rollback/update,
// benih ikut pulih, dan penjaga menanam ulang file inti darinya.
// Jalankan setiap kali file inti diubah: node scripts/bangun-benih.mjs
// ============================================================

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BENIH = path.join(ROOT, 'benih')

const PETA = [
  ['src/lib/cyborg/waktu.ts', 'waktu.ts'],
  ['src/lib/cyborg/gerbang.ts', 'gerbang.ts'],
  ['src/lib/cyborg/kalibrasi.ts', 'kalibrasi.ts'],
  ['src/lib/cyborg/sapu10.ts', 'sapu10.ts'],
  ['src/lib/cyborg/jantung.ts', 'jantung.ts'],
  ['src/lib/cyborg/kalibrasi-ambisius.json', 'kalibrasi-ambisius.json'],
  ['src/app/api/sapu10/route.ts', 'route-sapu10.ts'],
  ['src/components/arena/sapu10-panel.tsx', 'sapu10-panel.tsx'],
  ['src/instrumentation.ts', 'instrumentation.ts'],
]

try {
  if (!fs.existsSync(BENIH)) fs.mkdirSync(BENIH, { recursive: true })
  const manifest = []
  for (const [rel, benihNama] of PETA) {
    const sumber = path.join(ROOT, rel)
    if (!fs.existsSync(sumber)) {
      console.log(`[BENIH] lewati (tidak ada): ${rel}`)
      continue
    }
    const isi = fs.readFileSync(sumber)
    fs.writeFileSync(path.join(BENIH, benihNama), isi)
    manifest.push({
      file: rel,
      benih: benihNama,
      sha256: crypto.createHash('sha256').update(isi).digest('hex'),
      byte: isi.length,
    })
  }
  fs.writeFileSync(path.join(BENIH, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`[BENIH] tersimpan ${manifest.length} file inti + manifest.json`)
} catch (e) {
  console.error(`[BENIH] gagal: ${e?.message ?? e}`)
  process.exit(1)
}
