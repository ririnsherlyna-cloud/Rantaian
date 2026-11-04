// ============================================================
// V303-TELEGRAM — Status saraf Telegram (untuk UI / inspeksi).
// Token TIDAK PERNAH ikut respons — hanya keterangan keberadaan.
// ============================================================

import { NextResponse } from 'next/server'
import { daftarPenerima, tgAktif } from '@/lib/cyborg/tg'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  let laporanTerakhir: string | null = null
  try {
    laporanTerakhir = (await db.meta.findUnique({ where: { key: 'tgLaporanTerakhir' } }))?.value ?? null
  } catch { /* non-vital */ }

  return NextResponse.json({
    aktif: tgAktif(),
    token: tgAktif() ? 'tersimpan (.token-telegram, chmod 600)' : 'kosong',
    penerima: daftarPenerima(),
    laporanTerakhir,
    jadwal: 'laporan pagi 07:05 WIB harian',
    notifikasi: 'jual ambisius tersentuh → siaran otomatis',
  })
}
