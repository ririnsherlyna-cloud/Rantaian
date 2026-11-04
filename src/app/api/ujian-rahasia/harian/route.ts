// ═══════════════════════════════════════════════════════════════════
// API UJIAN RAHASIA HARIAN — gila koin terbang 1-hari 100%–24000%+
// ═══════════════════════════════════════════════════════════════════
// GET                  → status (cache, kebenaran, hasil terakhir)
// POST {aksi:"tempa"}  → ujian penuh 1230 soal, nilai, simpan
// POST {aksi:"multi"}  → penempaan keras 12 seed = 14760 soal
// POST {aksi:"lapor"}  → tulis download/laporan_ujian_rahasia_harian.md
import { NextResponse } from 'next/server'
import { bacaKebenaranHarian, daftarSimbolCacheHarian } from '@/lib/exam/harian-data'
import {
  siapkanBekalHarian,
  nilaiUjianHarian,
  simpanHasilHarian,
  bacaHasilHarianTerakhir,
  tulisLaporanHarian,
  type HasilUjianHarian,
} from '@/lib/exam/harian-nilai'
import { bikinSoalHarianDenganSeed, jawabSoalHarian } from '@/lib/exam/harian-soal'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

let iterasi = 0

export async function GET() {
  const keb = bacaKebenaranHarian()
  const hasil = bacaHasilHarianTerakhir()
  return NextResponse.json({
    mode: 'harian',
    cache: daftarSimbolCacheHarian().length,
    kebenaranAda: !!keb,
    jumlahKoinKebenaran: keb?.jumlah ?? 0,
    diambil: keb?.diambil ?? null,
    topGila: keb?.koin.slice(0, 10).map((k) => ({ s: k.simbol, g: k.gainPct, t: k.tanggalPuncak })) ?? [],
    hasilTerakhir: hasil
      ? {
          persen: hasil.persen,
          total: hasil.totalSoal,
          benar: hasil.benar,
          salah: hasil.salah,
          lulus: hasil.lulus,
          waktu: hasil.waktu,
          iterasi: hasil.iterasiTempa,
        }
      : null,
  })
}

export async function POST(req: Request) {
  let aksi = 'tempa'
  try {
    const b = (await req.json().catch(() => ({}))) as { aksi?: string }
    aksi = b.aksi ?? 'tempa'
  } catch {}

  const keb = bacaKebenaranHarian()
  if (!keb) {
    return NextResponse.json(
      { error: 'kebenaran harian belum siap — kolektor data nyata masih berjalan', cache: daftarSimbolCacheHarian().length },
      { status: 503 },
    )
  }

  try {
    const bekal = siapkanBekalHarian()

    if (aksi === 'multi') {
      // Penempaan keras: 12 seed × 1230 soal = 14760 jawaban
      const N = 12
      let total = 0
      let benar = 0
      const perTipe: Record<string, { total: number; benar: number }> = {}
      const gagal: Array<Record<string, unknown>> = []
      for (let s = 1; s <= N; s++) {
        const setSoal = bikinSoalHarianDenganSeed(keb, 1000 + s * 77)
        for (const q of setSoal) {
          const jaw = jawabSoalHarian(q, bekal.deteksi)
          const ok = jaw.jawaban.trim().toUpperCase() === q.kunci.trim().toUpperCase()
          total++
          const t = (perTipe[q.tipe] ??= { total: 0, benar: 0 })
          t.total++
          if (ok) {
            benar++
            t.benar++
          } else if (gagal.length < 20) {
            gagal.push({ seed: 1000 + s * 77, id: q.id, tipe: q.tipe, simbol: q.simbol, jawaban: jaw.jawaban, kunci: q.kunci })
          }
        }
      }
      return NextResponse.json({
        mode: 'multi-seed',
        nSet: N,
        total,
        benar,
        salah: total - benar,
        persen: total ? Math.round((benar / total) * 10000) / 100 : 0,
        lulus: benar === total,
        perTipe,
        jumlahGagal: total - benar,
        contohGagal: gagal,
      })
    }

    iterasi++
    const hasil: HasilUjianHarian = nilaiUjianHarian(bekal, iterasi)
    simpanHasilHarian(hasil)

    if (aksi === 'lapor') {
      const berkas = tulisLaporanHarian(hasil, keb)
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
      topGila: keb.koin.slice(0, 10).map((k) => ({ s: k.simbol, g: k.gainPct, t: k.tanggalPuncak })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
