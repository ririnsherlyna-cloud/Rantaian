// HAKIM AKHIR — 10 suite segar total (1000 grafik belum pernah dilihat
// saat desain/iterasi terakhir), otak v231.5 DIBEKUKAN.
import { forgeCandleSuite, CH_VISIBLE } from '../src/lib/exam/candle-exam'
import { saktiMataVonis, SAKTI_MATA_VERSI } from '../src/lib/exam/sakti-candle'
import { writeFileSync } from 'fs'
const SEGEL = ['luar-L','luar-M','hakim-1','hakim-2','luar-N','luar-O','luar-P','luar-Q','luar-R','luar-S']
let tot = 0, benar = 0, likuid = 0
const rows: string[] = []
for (const ns of SEGEL) {
  const suite = forgeCandleSuite(ns)
  let b = 0, lq = 0
  const miss: string[] = []
  for (const exam of suite) {
    const v = saktiMataVonis(exam.candles.slice(0, CH_VISIBLE))
    const ok = v.arah === exam.truth
    if (ok) b++
    else {
      lq += Math.abs(exam.moveAtr) > 1.5 ? 1 : 0
      miss.push(`#${exam.num} ${exam.arch.id}/${exam.variant}/${exam.diff} SAKTI=${v.arah} truth=${exam.truth}`)
    }
  }
  tot += 100; benar += b; likuid += lq
  rows.push(`${ns}|${b}|${miss.join(' ; ') || '-'}`)
  console.log(`${ns} ${b}/100${miss.length ? '  ✗ ' + miss.join(' | ') : ''}`)
}
console.log(`\nHAKIM AKHIR: ${benar}/${tot} (${((benar/tot)*100).toFixed(1)}%) · likuidasi ${likuid} · otak v${SAKTI_MATA_VERSI} (beku)`)
writeFileSync('/home/z/my-project/research/ujian-candle/hakim-akhir.json', JSON.stringify({ versi: SAKTI_MATA_VERSI, total: tot, benar, likuidasi: likuid, rows }, null, 2))
