import { forgeCandleSuite, CH_VISIBLE } from '../src/lib/exam/candle-exam'
import { saktiMataVonis, SAKTI_MATA_VERSI } from '../src/lib/exam/sakti-candle'
const SEGEL = ['luar-N', 'luar-O', 'hakim-3', 'hakim-4', 'hakim-5']
let tot = 0, benar = 0
for (const ns of SEGEL) {
  const suite = forgeCandleSuite(ns)
  let b = 0
  const miss: string[] = []
  for (const exam of suite) {
    const v = saktiMataVonis(exam.candles.slice(0, CH_VISIBLE))
    if (v.arah === exam.truth) b++
    else miss.push(`#${exam.num} ${exam.arch.id}/${exam.variant}/${exam.diff} SAKTI=${v.arah} truth=${exam.truth} move=${exam.moveAtr.toFixed(1)}`)
  }
  tot += 100; benar += b
  console.log(`${ns} ${b}/100${miss.length ? '  ✗ ' + miss.join(' | ') : ''}`)
}
console.log(`TOTAL SEGEL BARU: ${benar}/${tot} (otak v${SAKTI_MATA_VERSI}, DIBEKUKAN sebelum segel dibuka)`)
