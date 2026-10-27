// panggil forgeOnce via re-implementasi utk menemukan letak error
import { makeRng } from '../../src/lib/exam/rng'
import { Pen } from '../../src/lib/exam/fbo-forge'
import { FBO_FAMILIES } from '../../src/lib/exam/fbo-suite'
import { forgeFboExam } from '../../src/lib/exam/fbo-suite'
try {
  const e = forgeFboExam(1, 'fbo100')
  console.log('OK', e.fam, e.diff, e.movePct.toFixed(2))
} catch (e) { console.error('FAIL1', (e as Error).message) }
// sekarang manual langkah demi langkah
const fam = FBO_FAMILIES[0]
const cfg = { noise: 0.55, subtle: 1.15, conviction: 0 }
const pen = new Pen(100, 0.5)
const r = makeRng('fbo100::fbo-weak::ATAS::0')
try {
  const level = fam.gen(pen, r, 0.5, cfg, 'ATAS')
  console.log('gen ok; candles', pen.candles.length)
  fam.hor(pen, r, 0.5, cfg, 'ATAS')
  console.log('hor ok; candles', pen.candles.length)
} catch (e) { console.error('FAIL2', (e as Error).message, (e as Error).stack?.split('\n')[1]) }
