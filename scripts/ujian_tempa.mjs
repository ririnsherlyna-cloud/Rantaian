// PELARI UJIAN RAHASIA — jalankan penempaan tanpa server Next.js
// Pemakaian: node scripts/ujian_tempa.mjs [tempa|lapor]
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(import.meta.url)
const R = (f) => require(path.join(process.cwd(), '.ujian-build', f))
const data = R('rahasia-data.js')
const nilai = R('rahasia-nilai.js')

const aksi = process.argv[2] || 'tempa'
const t0 = Date.now()
const bekal = nilai.siapkanBekal()
const iterasi = (nilai.bacaHasilTerakhir()?.iterasiTempa ?? 0) + 1
const hasil = nilai.nilaiUjian(bekal, iterasi)
nilai.simpanHasil(hasil)

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
console.log(`ITERASI TEMPA ke-${iterasi} · ${hasil.totalSoal} SOAL DATA NYATA`)
console.log(`BENAR ${hasil.benar} · SALAH ${hasil.salah} · SKOR ${hasil.persen}% · ${hasil.lulus ? '★ LULUS PENUH ★' : 'belum — tempa lagi'}`)
for (const [t, v] of Object.entries(hasil.perTipe)) console.log(`  ${t.padEnd(10)} ${v.benar}/${v.total}`)
console.log('═'.repeat(64))

if (hasil.gagal.length) {
  console.log(`CONTOH ${Math.min(30, hasil.gagal.length)} GAGAL:`)
  for (const g of hasil.gagal.slice(0, 30)) {
    console.log(`  [${g.id}] ${g.tipe} ${g.simbol}: jawab="${g.jawaban}" kunci="${g.kunci}"`)
    console.log(`        ${g.penjelasan.slice(0, 150)}`)
  }
}

if (aksi === 'lapor') {
  const p = nilai.tulisLaporan(hasil, bekal.kebenaran)
  console.log('LAPORAN DITULIS:', p)
}
console.log(`(dihitung ${Date.now() - t0} ms)`)
