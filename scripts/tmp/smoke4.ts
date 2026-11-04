import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/fbo-forge'
import { genWeak, horWeak } from '../../src/lib/exam/fbo-gens'
import { FBO_FAMILIES } from '../../src/lib/exam/fbo-suite'
const fam = FBO_FAMILIES[0]
const cfg = { noise: 0.55, subtle: 1.15, conviction: 0 }
for (let a = 0; a < 4; a++) {
  try {
    const pen = new Pen(100, 0.5)
    const r = makeRng(`fbo100::${fam.id}::ATAS::${a}`)
    const lv = fam.gen(pen, r, 0.5, cfg, 'ATAS')
    fam.hor(pen, r, 0.5, cfg, 'ATAS')
    console.log('ok', a, 'gen/hor ok; fam.gen === genWeak?', fam.gen === genWeak, 'fam.hor === horWeak?', fam.hor === horWeak, 'lvl', lv.level.toFixed(2))
  } catch (e) { console.error('ERR', a, (e as Error).message) }
}
