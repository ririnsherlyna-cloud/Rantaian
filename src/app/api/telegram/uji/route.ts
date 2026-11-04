// ============================================================
// V303-TELEGRAM — Kirim pesan uji (POST { chatId? }).
// Tanpa body → siaran ke semua penerima terdaftar.
// ============================================================

import { NextResponse } from 'next/server'
import { kirimTg, siarkan } from '@/lib/cyborg/tg'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { chatId?: number }
    const teks = [
      '🧪 <b>Uji denyut V303 → Telegram</b>',
      'Saraf hidup. Laporan pagi 07:05 WIB + notifikasi JUAL AMBISIUS aktif.',
      'Coba tanya: «cek BTC» atau «sol beli di 150 tahan atau cut loss?»',
    ].join('\n')
    const n = body?.chatId
      ? ((await kirimTg(Number(body.chatId), teks)) ? 1 : 0)
      : await siarkan(teks)
    return NextResponse.json({ ok: n > 0, terkirim: n })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 })
  }
}
