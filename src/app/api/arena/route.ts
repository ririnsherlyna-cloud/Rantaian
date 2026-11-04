// GET  /api/arena  → status arena lengkap (memicu sinkronisasi di belakang)
// POST /api/arena  → aksi: { action: 'rebuild' | 'runnow' }

import { db } from '@/lib/db'
import { ensureArena, getArenaState } from '@/lib/cyborg/arena'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  // picu sinkronisasi arena di latar (idempoten, terkunci)
  void ensureArena().catch(() => {})
  const state = await getArenaState()
  return Response.json(state)
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string }
  if (body.action === 'rebuild') {
    await db.pick.deleteMany()
    await db.battleDay.deleteMany()
    await db.genomeState.deleteMany()
    await db.genomeLog.deleteMany()
    await db.memoryEpisode.deleteMany()
    await db.arenaEvent.deleteMany()
    await db.meta.deleteMany()
    void ensureArena().catch(() => {})
    return Response.json({ ok: true, message: 'Arena direset — pembangkitan ulang dimulai.' })
  }
  if (body.action === 'runnow') {
    const r = await ensureArena()
    return Response.json({ ok: true, ...r })
  }
  return Response.json({ ok: false, message: 'Aksi tidak dikenal' }, { status: 400 })
}
