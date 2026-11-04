import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildFboLevels, scanBreakEvents } from '../../src/lib/exam/fbo-brain'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const e = forgeFboGuardSuite('fbo100')[0]
const visible = e.candles.slice(0, FBO_VISIBLE)
const atr = buildSgVision(visible).atr
const levels = buildFboLevels(visible)
console.log(`truth=${e.level.level.toFixed(2)} atr=${atr.toFixed(3)}`)
console.log('ALL LEVELS:', levels.map((l) => `${l.jenis}@${l.level.toFixed(2)}(s${l.sentuhan})`).join(' '))
const evs = scanBreakEvents(visible, levels, buildSgVision(visible).volMean, atr)
console.log('EVENTS:', evs.map((v) => `${v.lvl.jenis}@${v.lvl.level.toFixed(2)}${v.side} fp=${v.firstPierceIdx} preT=${v.preTouches} outer<=3? cNow=${v.closeNowAtr.toFixed(2)}`).join('\n  '))
