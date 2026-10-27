// BUKTI PARITAS: kebenaran kolektor Python vs deteksi mandiri otak TS
// Bandingkan gainPct + tanggalPuncak per koin (494 koin) — harus identik.
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(import.meta.url)
const R = (f) => require(path.join(process.cwd(), '.ujian-build-harian', f))
const data = R('harian-data.js')
const otak = R('harian-otak.js')

const keb = data.bacaKebenaranHarian()
const simbol2 = data.daftarSimbolCacheHarian()
let sama = 0
let beda = 0
const contohBeda = []
for (const s of simbol2) {
  const kl = data.bacaKlinesHarian(s)
  if (!kl) continue
  const d = otak.deteksiLonjakanHarian(s, kl)
  const k = keb.koin.find((x) => x.simbol === s)
  if (!k) continue
  const okGain = Math.abs(d.gainPct - k.gainPct) < 1e-6
  const okTgl = (d.tanggalPuncak ?? null) === (k.tanggalPuncak ?? null)
  const okG100 = d.jumlahHariGila100 === k.jumlahHariGila100
  if (okGain && okTgl && okG100) sama++
  else {
    beda++
    if (contohBeda.length < 10)
      contohBeda.push({ s, TS: { g: d.gainPct, t: d.tanggalPuncak, g100: d.jumlahHariGila100 }, PY: { g: k.gainPct, t: k.tanggalPuncak, g100: k.jumlahHariGila100 } })
  }
}
console.log(`PARITAS PYTHON↔TS: SAMA ${sama} · BEDA ${beda} (dari ${sama + beda} koin)`)
if (contohBeda.length) {
  console.log('CONTOH BEDA:')
  for (const b of contohBeda) console.log(' ', JSON.stringify(b))
}
