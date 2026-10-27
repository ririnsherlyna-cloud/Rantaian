import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/fbo-forge'
import { genWeak, horWeak } from '../../src/lib/exam/fbo-gens'
for (let a = 0; a < 3; a++) {
  try {
    const pen = new Pen(100, 0.5)
    const cfg = { noise: 0.55, subtle: 1.15, conviction: 0 }
    const lv = genWeak(pen, makeRng(`fbo100::fbo-weak::ATAS::${a}`), 0.5, cfg, 'ATAS')
    horWeak(pen, makeRng(`fbo100::fbo-weak::ATAS::${a}`), 0.5, cfg, 'ATAS')
    console.log('ok attempt', a, pen.candles.length, 'lvl', lv.level.toFixed(2))
  } catch (e) { console.error('ERR attempt', a, (e as Error).message) }
}
