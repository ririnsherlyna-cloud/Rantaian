import { evaluasiDiri } from '../../src/lib/otak/evaluasi'
const h = await evaluasiDiri()
for (const s of h.suites) {
  console.log(`${s.id.padEnd(10)} ${s.otakVersi.padEnd(7)} ${String(s.berhasil).padStart(6)}/${String(s.total).padEnd(6)} ${s.persen.toFixed(2).padStart(7)}%  lik=${s.likuidasi}  net=${s.netSum.toFixed(1)}  file=${s.file}  segel=${s.segel.berhasil}/${s.segel.total}`)
}
console.log('GRAND:', h.grandBerhasil, '/', h.grandTotal, '=', h.grandPersen.toFixed(3) + '%', 'net', h.grandNet.toFixed(1))
console.log('KELEMAHAN:'); h.kelemahan.forEach(k => console.log(' -', k))
