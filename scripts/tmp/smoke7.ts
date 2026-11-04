import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/fbo-forge'
import { genDriftSnap, horDriftSnap, genSpringHl, horSpringHl } from '../../src/lib/exam/fbo-gens'
const cfg = { noise: 1.5, subtle: 0.88, conviction: 1 }
for (const [name, gen, hor] of [['drift', genDriftSnap, horDriftSnap], ['spring', genSpringHl, horSpringHl]] as const) {
  for (const side of ['ATAS', 'BAWAH'] as const) {
    try {
      const pen = new Pen(100, 0.5)
      const r = makeRng(`t-${name}-${side}`)
      const lv = gen(pen, r, 0.5, cfg, side)
      hor(pen, r, 0.5, cfg, side)
      console.log(`${name} ${side} ok lvl=${lv.level.toFixed(2)} ext=${lv.extreme.toFixed(2)} side=${lv.side}`)
    } catch (e) { console.error(`${name} ${side} ERR:`, (e as Error).message) }
  }
}
