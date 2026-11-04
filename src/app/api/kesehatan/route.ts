// GET /api/kesehatan — nadi server untuk PENJAGA.
// Wajib: cepat, ringan, TIDAK PERNAH gagal (semua dibungkus aman).
// Dipakai penjaga untuk memutuskan server hidup/hang/mati.

import fs from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function keadaanKalibrasi() {
  try {
    const p = path.join(process.cwd(), 'data', 'jual-ambisius', 'kalibrasi.json')
    if (!fs.existsSync(p)) return { ada: false }
    const st = fs.statSync(p)
    return { ada: true, bytes: st.size, mtime: st.mtimeMs }
  } catch {
    return { ada: false }
  }
}

export async function GET() {
  const mulai = Date.now()
  const g = globalThis as unknown as { __arenaSejak?: number }
  if (!g.__arenaSejak) g.__arenaSejak = Date.now()

  let db = 'tak-diketahui'
  try {
    const { db: prisma } = await import('@/lib/db')
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, tolak) => setTimeout(() => tolak(new Error('db lambat')), 2500)),
    ])
    db = 'hidup'
  } catch {
    db = 'terkendala' // jangan gagalkan kesehatan hanya karena db sedang sibuk
  }

  const memori = process.memoryUsage()
  const badan = {
    ok: true,
    layanan: 'MICAPROFITA-ARENA',
    sejak: g.__arenaSejak,
    umurDetik: Math.round((Date.now() - g.__arenaSejak) / 1000),
    waktu: new Date().toISOString(),
    db,
    memoriMb: Math.round(memori.rss / 1024 / 1024),
    kalibrasi: keadaanKalibrasi(),
    responsMs: Date.now() - mulai,
  }

  return new Response(JSON.stringify(badan), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
