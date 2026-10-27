// PELARI UJIAN RAHASIA HARIAN — penempaan tanpa server Next.js
// Pemakaian: node scripts/ujian_tempa_harian.mjs [tempa|lapor|cegah]
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(import.meta.url)
const R = (f) => require(path.join(process.cwd(), '.ujian-build-harian', f))
const nilai = R('harian-nilai.js')
const soalMod = R('harian-soal.js')

const aksi = process.argv[2] || 'tempa'
const t0 = Date.now()

if (aksi === 'cegah') {
  // Uji generator: berapa soal terbentuk & distribusi tipe (tanpa menjawab)
  const data = R('harian-data.js')
  const keb = data.bacaKebenaranHarian()
  const s = soalMod.bikinSoalHarian(keb)
  const per = {}
  for (const q of s) per[q.tipe] = (per[q.tipe] ?? 0) + 1
  console.log('SOAL:', s.length, JSON.stringify(per))
  process.exit(0)
}

const bekal = nilai.siapkanBekalHarian()
const iterasi = (nilai.bacaHasilHarianTerakhir()?.iterasiTempa ?? 0) + 1
const hasil = nilai.nilaiUjianHarian(bekal, iterasi)
nilai.simpanHasilHarian(hasil)

// ── PENEMPAAN MULTI-SEED: N set soal berbeda, tiap set 1230 soal ──
function tempaMulti(nSet = 12) {
  const data = R('harian-data.js')
  const keb = data.bacaKebenaranHarian()
  let total = 0
  let benar = 0
  const perTipeAgg = {}
  const gagalContoh = []
  for (let s = 1; s <= nSet; s++) {
    const soalSet = soalMod.bikinSoalHarianDenganSeed(keb, 1000 + s * 77)
    for (const q of soalSet) {
      const jaw = soalMod.jawabSoalHarian(q, bekal.deteksi)
      const ok = String(jaw.jawaban).trim().toUpperCase() === String(q.kunci).trim().toUpperCase()
      total++
      if (ok) benar++
      else if (gagalContoh.length < 20) gagalContoh.push({ seed: 1000 + s * 77, id: q.id, tipe: q.tipe, simbol: q.simbol, jawab: jaw.jawaban, kunci: q.kunci })
      const t = (perTipeAgg[q.tipe] ??= { total: 0, benar: 0 })
      t.total++
      if (ok) t.benar++
    }
  }
  return { total, benar, perTipeAgg, gagalContoh, persen: total ? Math.round((benar / total) * 10000) / 100 : 0 }
}

const ringkas = {
  iterasi,
  totalSoal: hasil.totalSoal,
  benar: hasil.benar,
  salah: hasil.salah,
  persen: hasil.persen,
  lulus: hasil.lulus,
  durasiMs: hasil.durasiMs,
  perTipe: hasil.perTipe,
}
console.log('═'.repeat(64))
console.log(`ITERASI TEMPA HARIAN ke-${iterasi} · ${hasil.totalSoal} SOAL GILA KOIN TERBANG (DATA NYATA)`)
console.log(`BENAR ${hasil.benar} · SALAH ${hasil.salah} · SKOR ${hasil.persen}% · ${hasil.lulus ? '★ LULUS PENUH ★' : 'belum — tempa lagi'}`)
for (const [t, v] of Object.entries(hasil.perTipe)) console.log(`  ${t.padEnd(12)} ${v.benar}/${v.total}`)
console.log('═'.repeat(64))

if (hasil.gagal.length) {
  console.log(`CONTOH ${Math.min(30, hasil.gagal.length)} GAGAL:`)
  for (const g of hasil.gagal.slice(0, 30)) {
    console.log(`  [${g.id}] ${g.tipe} ${g.simbol}: jawab="${g.jawaban}" kunci="${g.kunci}"`)
    console.log(`        ${g.penjelasan.slice(0, 150)}`)
  }
}

if (aksi === 'lapor') {
  const p = nilai.tulisLaporanHarian(hasil, bekal.kebenaran)
  console.log('LAPORAN DITULIS:', p)
}
console.log(`(dihitung ${Date.now() - t0} ms)`)

// Aksi tempa-multi: tempa keras dgn N seed berbeda (default 12 → 14760 soal)
if (aksi === 'multi' || aksi === 'multi-lapor') {
  const nSet = Number(process.argv[3] || '12')
  const m = tempaMulti(nSet)
  console.log('▓'.repeat(64))
  console.log(`PENEMPAAN MULTI-SEED: ${nSet} set × 1230 soal = ${m.total} soal`)
  console.log(`BENAR ${m.benar} · SALAH ${m.total - m.benar} · SKOR ${m.persen}% · ${m.benar === m.total ? '★ TEMPA MULTI 100% PENUH ★' : 'ADA YANG GAGAL'}`)
  for (const [t, v] of Object.entries(m.perTipeAgg)) console.log(`  ${t.padEnd(12)} ${v.benar}/${v.total}`)
  if (m.gagalContoh.length) {
    console.log('CONTOH GAGAL:')
    for (const g of m.gagalContoh) console.log(`  [seed ${g.seed}] ${g.tipe} ${g.simbol}: "${g.jawab}" vs kunci "${g.kunci}"`)
  }
  if (aksi === 'multi-lapor') {
    // tulis juga lampiran multi-seed ke laporan
    const fs = await import('fs')
    const p = path.join(process.cwd(), 'db', 'ujian-rahasia', 'harian', 'hasil-multi-seed.json')
    fs.writeFileSync(p, JSON.stringify({ nSet, ...m, waktu: new Date().toISOString() }, null, 1))
    console.log('BUKTI MULTI-SEED:', p)
  }
  console.log('▓'.repeat(64))
}
