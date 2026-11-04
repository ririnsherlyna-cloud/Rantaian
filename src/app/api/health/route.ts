// PENJAGA ABADI V1 — organ denyut server.
// Watchdog luar-proses menebak hidup-mati server lewat endpoint ini.
// Sengaja TANPA dependensi berat (tanpa prisma/fetch luar) supaya
// mustahil gagal menjawab.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const lahir = Date.now()

export async function GET() {
  return NextResponse.json({
    status: 'hidup',
    penjaga: 'PENJAGA-ABADI-V1',
    waktu: new Date().toISOString(),
    uptimeDetik: Math.round((Date.now() - lahir) / 1000),
    layanan: ['server', 'arena', 'telegram-jaga', 'ujian-rahasia'],
  })
}
