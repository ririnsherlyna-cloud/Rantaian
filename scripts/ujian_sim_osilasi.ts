// BEDAH OSILASI: v1 vs v3 per ujian — di mana v3 salah dan v1 benar?
import { generateSuite } from '../src/lib/exam/generator'
import { MICAPROFITA, MICAPROFITA_V3 } from '../src/lib/exam/contestants'

const suites = ['A', 'B', 'C'].map((s) => generateSuite(s))
let v1ok = 0
let v3ok = 0
let n = 0
for (const suite of suites) {
  for (const t of suite) {
    if (t.arch.id !== 'osilasi') continue
    n++
    const vis = t.candles.slice(0, 144)
    const p1 = MICAPROFITA.predict(vis, t)
    const p3 = MICAPROFITA_V3.predict(vis, t)
    const ok1 = p1.dir === t.label
    const ok3 = p3.dir === t.label
    if (ok1) v1ok++
    if (ok3) v3ok++
    if (!ok3) {
      console.log(
        `${t.suite} ${t.id} label=${t.label.padEnd(5)} ret24=${(t.outcomeRet * 100).toFixed(1).padStart(6)}% | v1=${p1.dir}(${(p1.conf * 100).toFixed(0)}%) ${ok1 ? 'OK' : 'XX'} rezim=${p1.regime} | v3=${p3.dir}(${(p3.conf * 100).toFixed(0)}%) XX rezim=${p3.regime} score=${p3.score.toFixed(2)}`,
      )
      console.log('   v3 faktor: ' + p3.factors.map((f) => `${f.key}=${f.value.toFixed(2)}(w${f.weight})`).join(' '))
    }
  }
}
console.log(`\nosilasi: v1 ${v1ok}/${n}  v3 ${v3ok}/${n}`)
