import { forgeFboSuite } from '../../src/lib/exam/fbo-suite'
const e = forgeFboSuite('fbo100').find((x) => x.num === 90)!
console.log(`#90 ${e.fam} truthLvl=${e.level.level.toFixed(2)} ext=${e.level.extreme.toFixed(2)}`)
for (let i = 26; i < 46; i++) {
  const c = e.candles[i]
  console.log(`  ${String(i).padStart(2)} o=${c.o.toFixed(2)} h=${c.h.toFixed(2)} l=${c.l.toFixed(2)} c=${c.c.toFixed(2)} v=${c.v.toFixed(2)}`)
}
