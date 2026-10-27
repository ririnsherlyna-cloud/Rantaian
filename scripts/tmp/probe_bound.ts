import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/fbo-forge'
import { Mir, boundUnder } from '../../src/lib/exam/fbo-gens'
const pen = new Pen(100, 0.5)
const m = new Mir(pen, makeRng('x'), 0.5, { noise: 1.0, subtle: 1.0, conviction: 0 }, 'BAWAH')
const L = 97.8
boundUnder(m, L, 36, 2.5, 0.9, [8, 22])
console.log('bound-end p =', pen.p.toFixed(2), '(L =', L, ')')
console.log('min low =', Math.min(...pen.candles.map((c) => c.l)).toFixed(2), 'max high =', Math.max(...pen.candles.map((c) => c.h)).toFixed(2))
console.log('closes:', pen.candles.filter((_, i) => i % 4 === 0).map((c) => c.c.toFixed(1)).join(','))
