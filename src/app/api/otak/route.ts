// ============================================================
// API MOZAIK — snapshot arsitektur kognitif terpadu.
// GET /api/otak → 9 fakultas + matriks kemampuan + memori +
// kesehatan sumber internet (probe langsung) + diagnostik dev.
//
// Prinsip: FAULT ISOLATION (tiap fakultas aman), CACHE (TTL 60s
// — probe jaringan & sapu disk tidak diulang tiap klik),
// OBSERVABILITY (waktu snapshot + ms per proses tersimpan).
// ============================================================

import { NextResponse } from 'next/server'
import { snapshotArsitektur } from '@/lib/otak/indeks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TTL_MS = 60_000
const g = globalThis as unknown as { __mozaikCache?: { at: number; data: unknown } }

export async function GET() {
  try {
    const now = Date.now()
    if (g.__mozaikCache && now - g.__mozaikCache.at < TTL_MS) {
      return NextResponse.json(g.__mozaikCache.data)
    }
    const snap = await snapshotArsitektur({ probeInternet: true, memoriLengkap: false })
    g.__mozaikCache = { at: now, data: snap }
    return NextResponse.json(snap)
  } catch (e) {
    // RECOVERY: snapshot gagal total pun mengembalikan laporan jujur
    return NextResponse.json(
      { error: 'snapshot-gagal', pesan: (e as Error).message, waktu: new Date().toISOString() },
      { status: 500 },
    )
  }
}
