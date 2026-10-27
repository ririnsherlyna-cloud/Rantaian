import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/fbo-forge'
import { genWeak, horWeak } from '../../src/lib/exam/fbo-gens'
try {
  const pen = new Pen(100, 0.5)
  const lv = genWeak(pen, makeRng('t1'), 0.5, { noise: 0.55, subtle: 1.15, conviction: 0 }, 'ATAS')
  console.log('gen ok', lv.level.toFixed(2), lv.extreme.toFixed(2), pen.candles.length)
  horWeak(pen, makeRng('t2'), 0.5, { noise: 0.55, subtle: 1.15, conviction: 0 }, 'ATAS')
  console.log('hor ok', pen.candles.length)
} catch (e) { console.error('ERR', e) }
