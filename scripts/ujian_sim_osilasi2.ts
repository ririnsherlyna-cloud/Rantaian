// Bedah rezim v3 untuk osilasi & konsolidasi: di rezim apa tiap ujian jatuh?
import { generateSuite } from '../src/lib/exam/generator'
import { MICAPROFITA, MICAPROFITA_V3 } from '../src/lib/exam/contestants'

const suites = ['A', 'B', 'C', 'D', 'E'].map((s) => generateSuite(s))
for (const target of ['osilasi', 'konsolidasi']) {
  const regStat = new Map<string, { n: number; ok: number; ok1: number }>()
  for (const suite of suites) {
    for (const t of suite) {
      if (t.arch.id !== target) continue
      const vis = t.candles.slice(0, 144)
      const p3 = MICAPROFITA_V3.predict(vis, t)
      const p1 = MICAPROFITA.predict(vis, t)
      const s = regStat.get(p3.regime) ?? { n: 0, ok: 0, ok1: 0 }
      s.n++
      if (p3.dir === t.label) s.ok++
      if (p1.dir === t.label) s.ok1++
      regStat.set(p3.regime, s)
    }
  }
  console.log(`\n== ${target} (n=35, v1 total ok=${[...regStat.values()].reduce((a, x) => a + x.ok1, 0)}) ==`)
  for (const [r, s] of regStat) console.log(`  ${r.padEnd(16)} n=${String(s.n).padStart(2)}  v3ok=${s.ok}  (v1 benar di ${s.ok1} tes ini)`)
}
