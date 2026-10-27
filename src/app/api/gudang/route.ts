// ============================================================
// API GUDANG — penyimpanan eksternal sisi-server nol-biaya.
// Kapsul keadaan SAKTI (dari organ V241 NADI) dapat disalin ke
// disk server sebagai REDUNDANSI tingkat-E di luar browser:
//   GET  /api/gudang        → daftar kapsul (nama, byte, waktu)
//   POST /api/gudang        → simpan kapsul {nama?, isi}
//   GET  /api/gudang?nama=x → isi kapsul utuh
// Fault isolation: semua operasi try/catch + laporan jujur.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DIR = join(process.cwd(), 'data', 'gudang')

function pastikanDir(): void {
  mkdirSync(DIR, { recursive: true })
}

export async function GET(req: NextRequest) {
  try {
    pastikanDir()
    const nama = req.nextUrl.searchParams.get('nama')
    if (nama) {
      // anti path-traversal: hanya nama aman
      const aman = nama.replace(/[^a-zA-Z0-9._-]/g, '')
      const isi = readFileSync(join(DIR, aman), 'utf-8')
      return new NextResponse(isi, { headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    const daftar = readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const s = statSync(join(DIR, f))
        let protokol = ''
        try { protokol = String(JSON.parse(readFileSync(join(DIR, f), 'utf-8')).protokol || '') } catch { /* kapsul rusak tetap terdaftar */ }
        return { nama: f, byte: s.size, waktu: s.mtime.toISOString(), protokol }
      })
      .sort((a, b) => b.waktu.localeCompare(a.waktu))
    return NextResponse.json({ protokol: 'GUDANG-SERVER', dir: 'data/gudang', jumlah: daftar.length, kapsul: daftar })
  } catch (e) {
    return NextResponse.json({ error: 'gudang-gagal', pesan: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { nama?: string; isi?: unknown }
    const isi = body?.isi
    if (!isi || typeof isi !== 'object') {
      return NextResponse.json({ error: 'isi-wajib-objek' }, { status: 400 })
    }
    const obj = isi as Record<string, unknown>
    if (obj.protokol !== 'KAPSUL-MICAPROFITA') {
      return NextResponse.json({ error: 'bukan-kapsul-micaprofita', terima: String(obj.protokol || '') }, { status: 400 })
    }
    pastikanDir()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const nama = (typeof body.nama === 'string' && body.nama.length ? body.nama : `kapsul-${ts}`).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80) + '.json'
    writeFileSync(join(DIR, nama), JSON.stringify(obj, null, 1), 'utf-8')
    return NextResponse.json({ ok: true, nama, byte: statSync(join(DIR, nama)).size, waktu: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ error: 'simpan-gagal', pesan: (e as Error).message }, { status: 500 })
  }
}
