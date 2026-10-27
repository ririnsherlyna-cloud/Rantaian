// GET /api/koin?q=periksa+opg → BEDAH-KOIN mentah dalam JSON.
// Pintu diagnostik V297: memisahkan "apa yang dihitung mesin" dari
// "apa yang dinarasikan LLM" — kalau narasi menyimpang, blok ini
// menunjukkan kebenarannya apa adanya.

import { bedahKoin } from '@/lib/cyborg/koin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (!q) return Response.json({ error: 'Parameter q kosong — contoh: /api/koin?q=periksa+koin+opg' }, { status: 400 })
  if (q.length > 600) return Response.json({ error: 'Pertanyaan terlalu panjang (maks 600 karakter)' }, { status: 400 })

  try {
    const bedah = await bedahKoin(q)
    return Response.json({ ok: true, q, bedah })
  } catch (e) {
    return Response.json({ ok: false, error: `bedah gagal: ${(e as Error).message.slice(0, 140)}` }, { status: 502 })
  }
}
