// Debug satu forgeOnce KOMPLEKS
import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/bulltrap-forge'
import { genKompleks, klHorizonRev } from '../../src/lib/exam/kompleks-gens'

const r = makeRng('dbg::kl-rev-strong::NAIK::0')
const u = 0.5
const pen = new Pen(100, u)
const cfg = { noise: 0.55, subtle: 1.15, conviction: 0 }
try {
  const g = genKompleks(pen, r, u, cfg, { dir: 'NAIK', post: 'REVERSAL' })
  console.log('genKompleks OK, candles =', pen.candles.length, '| pl=', g.pl.toFixed(2), 'extreme=', g.extreme.toFixed(2), 'puncakPump=', g.puncakPump.toFixed(2), 'lvlFbo=', g.lvlFbo.toFixed(2))
  klHorizonRev(pen, r, u, cfg, 'NAIK')
  console.log('horizon OK, total =', pen.candles.length)
} catch (err) {
  console.log('ERROR:', (err as Error).message)
  console.log('candles saat error =', pen.candles.length)
}
