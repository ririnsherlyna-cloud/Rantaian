// Validasi 12 suite LATIH (bukan tuning, bukan hakim) — harus 100% semua
import { forgeCandleSuite, CH_VISIBLE } from '../src/lib/exam/candle-exam'
import { saktiMataVonis, SAKTI_MATA_VERSI } from '../src/lib/exam/sakti-candle'
const LATIH = ['latih-A','latih-B','latih-C','latih-D','latih-E','latih-F','latih-G','latih-H','latih-I','latih-J','latih-K','latih-L']
let tot = 0, benar = 0
for (const ns of LATIH) {
  const suite = forgeCandleSuite(ns)
  let b = 0
  const miss: string[] = []
  for (const exam of suite) {
    const v = saktiMataVonis(exam.candles.slice(0, CH_VISIBLE))
    if (v.arah === exam.truth) b++
    else miss.push(`#${exam.num} ${exam.arch.id}/${exam.variant}/${exam.diff} SAKTI=${v.arah} truth=${exam.truth}`)
  }
  tot += 100; benar += b
  console.log(`${ns} ${b}/100${miss.length ? '  ✗ ' + miss.join(' | ') : ''}`)
}
console.log(`TOTAL LATIH: ${benar}/${tot} (v${SAKTI_MATA_VERSI})`)
