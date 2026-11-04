import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildFboLevels } from '../../src/lib/exam/fbo-brain'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const e = forgeFboGuardSuite('fbo100')[0]
const cs = e.candles.slice(0, FBO_VISIBLE)
const atr = buildSgVision(cs).atr
const levels = buildFboLevels(cs)
console.log('levels 101.5..102.6:', levels.filter((l) => l.level > 101.5 && l.level < 102.6).map((l) => `${l.jenis}@${l.level.toFixed(3)}(s${l.sentuhan})`).join(' '))
// probe level terdekat 102.2
const L = levels.reduce((a, b) => Math.abs(b.level - 102.2) < Math.abs(a.level - 102.2) ? b : a)
console.log(`probe ${L.jenis}@${L.level.toFixed(3)}: margin=${(0.12 * atr).toFixed(3)}`)
const n = cs.length
let lastUp = -1
for (let i = n - 1; i >= n - 45; i--) { if (cs[i].h > L.level + 0.12 * atr) { lastUp = i; break } }
console.log('lastUp =', lastUp)
let firstPierce = lastUp
for (let j = lastUp; j >= n - 45; j--) {
  const beyond = cs[j].h > L.level + 0.12 * atr
  const closeBeyond = cs[j].c > L.level
  if (beyond || closeBeyond) firstPierce = j; else break
}
console.log('firstPierce =', firstPierce)
let preT = 0
for (let i = 1; i < firstPierce; i++) {
  if (cs[i].h >= L.level - 0.25 * atr && cs[i].c < L.level) preT++
}
let outerPre = 0
for (let i = 1; i < firstPierce; i++) if (cs[i].c > L.level + 0.12 * atr) outerPre++
const seg = cs.slice(firstPierce)
const maxBeyond = Math.max(...seg.map((c) => (c.h - L.level) / atr))
console.log(`preT=${preT} outerPre=${outerPre} maxBeyond=${maxBeyond.toFixed(2)}`)
console.log('candle highs 44-59:', cs.slice(44).map((c) => c.h.toFixed(2)).join(','))
console.log('candle closes 44-59:', cs.slice(44).map((c) => c.c.toFixed(2)).join(','))
