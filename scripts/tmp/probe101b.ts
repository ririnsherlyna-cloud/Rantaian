import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildFboLevels, scanBreakEvents } from '../../src/lib/exam/fbo-brain'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const e = forgeFboGuardSuite('fbo100')[0]
const cs = e.candles.slice(0, FBO_VISIBLE)
const v = buildSgVision(cs)
const levels = buildFboLevels(cs)
const evs = scanBreakEvents(cs, levels, v.volMean, v.atr)
console.log(`#101 truth lvl=${e.level.level.toFixed(2)} atr=${v.atr.toFixed(3)}`)
console.log('levels near truth:', levels.filter((l) => Math.abs(l.level - e.level.level) <= 1.0 * v.atr).map((l) => `${l.jenis}@${l.level.toFixed(2)}(s${l.sentuhan})`).join(' '))
console.log('events:', evs.map((x) => `${x.lvl.jenis}@${x.lvl.level.toFixed(2)}${x.side} fp=${x.firstPierceIdx} preT=${x.preTouches} cNow=${x.closeNowAtr.toFixed(2)} r=${(x.rank ?? 0).toFixed(2)}`).join('\n  '))
