import { forgeFboSuite } from '../../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const nums = process.argv.slice(2).map(Number)
const suite = forgeFboSuite('fbo100')
for (const num of nums) {
  const e = suite.find((x) => x.num === num)!
  console.log(`#${num} ${e.fam} truthLvl=${e.level.level.toFixed(2)} ext=${e.level.extreme.toFixed(2)} entry=${e.entry.toFixed(2)}`)
  for (let i = 44; i < FBO_VISIBLE; i++) {
    const c = e.candles[i]
    console.log(`  ${String(i).padStart(2)} o=${c.o.toFixed(2)} h=${c.h.toFixed(2)} l=${c.l.toFixed(2)} c=${c.c.toFixed(2)} v=${c.v.toFixed(2)} ${c.c > c.o ? 'hijau' : 'merah'}`)
  }
  console.log('  HORIZON:')
  for (let i = FBO_VISIBLE; i < e.candles.length; i++) {
    const c = e.candles[i]
    console.log(`  ${String(i).padStart(2)} o=${c.o.toFixed(2)} h=${c.h.toFixed(2)} l=${c.l.toFixed(2)} c=${c.c.toFixed(2)} v=${c.v.toFixed(2)}`)
  }
}
