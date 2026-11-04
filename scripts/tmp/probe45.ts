import { forgeFboSuite } from '../../src/lib/exam/fbo-suite'
import { buildFboLevels, scanBreakEvents } from '../../src/lib/exam/fbo-brain'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const e = forgeFboSuite('fbo100').find((x) => x.num === 45)!
const cs = e.candles.slice(0, FBO_VISIBLE)
const v = buildSgVision(cs)
const levels = buildFboLevels(cs)
const evs = scanBreakEvents(cs, levels, v.volMean, v.atr)
console.log(`#45 truth=${e.truth} lvl=${e.level.level.toFixed(2)} close60=${e.entry.toFixed(2)} atr=${v.atr.toFixed(3)}`)
console.log('levels:', levels.filter((l) => Math.abs(l.level - e.level.level) <= 2 * v.atr || Math.abs(l.level - 100.45) <= 0.6).map((l) => `${l.jenis}@${l.level.toFixed(2)}(s${l.sentuhan})`).join(' '))
for (const ev of evs) console.log(`  ev ${ev.lvl.jenis}@${ev.lvl.level.toFixed(2)} ${ev.side} fp=${ev.firstPierceIdx} lp=${ev.lastPierceIdx} preT=${ev.preTouches} cNow=${ev.closeNowAtr.toFixed(2)} beyond=${ev.maxBeyondAtr.toFixed(2)}`)
console.log('closes 50-59:', cs.slice(50).map((c) => c.c.toFixed(2)).join(','))
console.log('highs 50-59:', cs.slice(50).map((c) => c.h.toFixed(2)).join(','))
