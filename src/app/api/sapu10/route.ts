// ============================================================
// V302 API SAPU10 — Sapuan 10 koin, sadar hari, tak pernah 500
// ------------------------------------------------------------
// GET  /api/sapu10          → hasil sapuan (cache harian 5 menit)
// GET  /api/sapu10?force=1  → paksa sapuan segar dari jaringan
// Selalu balas JSON valid — jaringan mati pun data SIMPANAN
// berlabel jujur tetap tampil (bukan layar error).
// ============================================================

import { jalankanSapu10 } from '@/lib/cyborg/sapu10'
import { hariIniUTC, jamUTC } from '@/lib/cyborg/waktu'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === '1'
    const hasil = await jalankanSapu10(force)
    return Response.json(hasil, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Hari-UTC': hariIniUTC(),
        'X-Jam-UTC': jamUTC(),
      },
    })
  } catch (e) {
    // benteng terakhir: meski semuanya runtuh, balas JSON valid
    return Response.json(
      {
        hari: hariIniUTC(),
        jam: jamUTC(),
        pada: new Date().toISOString(),
        mode: 'SIMPANAN',
        usang: false,
        dariSimpangan: false,
        funnel: { pasanganUsdt: 0, likuid: 0, lolosGerbang: 0, dinilai: 0, terpilih: 0 },
        koin: [],
        kalibrasi: { status: 'TAK DIKETAHUI', versi: '-', terkalibrasi: false, sumber: '-', catatan: 'benteng terakhir rute' },
        catatan: [`galat tak terduga: ${e instanceof Error ? e.message : 'tidak diketahui'}`],
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }
}
