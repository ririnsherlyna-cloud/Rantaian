// ═══════════════════════════════════════════════════════════════════
// API UJIAN RAHASIA — lonjakan nyata Binance 100% s.d. 24000%+
// ═══════════════════════════════════════════════════════════════════
// GET            → status (cache, kebenaran, hasil terakhir)
// POST {aksi:"tempa"}  → jalankan ujian penuh, nilai, simpan hasil
// POST {aksi:"lapor"}  → tulis download/laporan_ujian_rahasia.md
import { NextResponse } from 'next/server'
import { bacaKebenaran, daftarSimbolCache } from '@/lib/exam/rahasia-data'
import {
  siapkanBekal,
  nilaiUjian,
  simpanHasil,
  bacaHasilTerakhir,
  tulisLaporan,
  type HasilUjian,
} from '@/lib/exam/rahasia-nilai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

let iterasi = 0

export async function GET() {
  const keb = bacaKebenaran()
  const hasil = bacaHasilTerakhir()
  return NextResponse.json({
    cache: daftarSimbolCache().length,
    kebenaranAda: !!keb,
    jumlahKoinKebenaran: keb?.jumlah ?? 0,
    diambil: keb?.diambil ?? null,
    hasilTerakhir: hasil
      ? { persen: hasil.persen, total: hasil.totalSoal, benar: hasil.benar, salah: hasil.salah, lulus: hasil.lulus, waktu: hasil.waktu, iterasi: hasil.iterasiTempa }
      : null,
  })
}

export async function POST(req: Request) {
  let aksi = 'tempa'
  try {
    const b = (await req.json().catch(() => ({}))) as { aksi?: string }
    aksi = b.aksi ?? 'tempa'
  } catch {}

  const keb = bacaKebenaran()
  if (!keb) {
    return NextResponse.json(
      { error: 'kebenaran belum siap — kolektor data nyata masih berjalan', cache: daftarSimbolCache().length },
      { status: 503 },
    )
  }

  try {
    const bekal = siapkanBekal()
    iterasi++
    const hasil: HasilUjian = nilaiUjian(bekal, iterasi)
    simpanHasil(hasil)

    if (aksi === 'lapor') {
      const berkas = tulisLaporan(hasil, keb)
      return NextResponse.json({ ...hasil, laporan: berkas })
    }

    return NextResponse.json({
      persen: hasil.persen,
      lulus: hasil.lulus,
      total: hasil.totalSoal,
      benar: hasil.benar,
      salah: hasil.salah,
      durasiMs: hasil.durasiMs,
      iterasi: hasil.iterasiTempa,
      perTipe: hasil.perTipe,
      jumlahGagal: hasil.gagal.length,
      contohGagal: hasil.gagal.slice(0, 25),
      topGila: keb.koin.filter((k) => k.gainPct >= 10000 && k.catatan === 'ok').slice(0, 10).map((k) => ({ s: k.simbol, g: k.gainPct })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
