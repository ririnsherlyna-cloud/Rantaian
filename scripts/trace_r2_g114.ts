// Trace presisi FB-R2 utk fbo1000 G#114
import { forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanRetestOfBroken } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const suite = forgeFboGuardSuite('fbo1000')
const e = suite.find((x) => x.num === 114)!
const cs = e.candles.slice(0, FBO_VISIBLE)
const n = cs.length
const fitur = buildSgVision(cs)
const atr = Math.max(fitur.atr, 1e-9)
const levels = buildFboLevels(cs)
console.log(`close=${cs[n - 1].c.toFixed(2)} ATR=${atr.toFixed(3)} truth=${e.truth} truthLevel=${e.level.level.toFixed(2)} side=${e.level.side}`)
console.log('LEVELS:', levels.slice(0, 8).map((L) => `${L.jenis}:${L.level.toFixed(2)}(${L.sentuhan})`).join(' '))
const fbr = scanRetestOfBroken(cs, levels, atr)
console.log('scanRetestOfBroken:', fbr ? `lvl=${fbr.lvl.level.toFixed(2)} side=${fbr.side} approach=${fbr.approachAtr.toFixed(2)}` : 'null')

for (const L2 of levels.slice(0, 8)) {
  if (L2.sentuhan < 2) continue
  for (const side of ['ATAS', 'BAWAH'] as const) {
    const sign = side === 'ATAS' ? 1 : -1
    const dist2 = (c: typeof cs[0]): number => (sign * (c.c - L2.level)) / atr
    let histC = 0, histD = 0, lastOut = -1, firstIn = -1, maxInside = 0
    for (let i = 15; i <= n - 1; i++) {
      const d = dist2(cs[i])
      if (d > 0.3) { histC++; histD = Math.max(histD, d); lastOut = i; firstIn = -1; maxInside = 0 }
      else if (d <= -0.15 && lastOut >= 0) { if (firstIn < 0) firstIn = i; maxInside = Math.max(maxInside, -d) }
    }
    const dNow2 = dist2(cs[n - 1])
    const p7al = ((side === 'ATAS' ? 1 : -1) * (cs[n - 1].c - cs[n - 8].c)) / atr
    const c1 = histC >= 3, c2 = histD >= 0.5, c3 = lastOut >= 0 && n - 1 - lastOut <= 14, c4 = firstIn >= 0 && n - 1 - firstIn <= 10, c5 = maxInside <= 1.0, c6 = dNow2 <= -0.3, c7 = p7al >= 0.5, c8 = Math.abs(fitur.distEma21Atr) < 2.4
    if (!(c1 && c2)) continue
    const allok = c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8
    console.log(`lvl=${L2.level.toFixed(2)}(${L2.jenis}) ${side}: histC=${histC} histD=${histD.toFixed(2)} lastOutAgo=${lastOut >= 0 ? n - 1 - lastOut : '—'} firstInAgo=${firstIn >= 0 ? n - 1 - firstIn : '—'} maxIn=${maxInside.toFixed(2)} dNow=${dNow2.toFixed(2)} p7al=${p7al.toFixed(2)} | ${c1 ? '✓' : '✗'}c1 ${c2 ? '✓' : '✗'}c2 ${c3 ? '✓' : '✗'}c3 ${c4 ? '✓' : '✗'}c4 ${c5 ? '✓' : '✗'}c5 ${c6 ? '✓' : '✗'}c6 ${c7 ? '✓' : '✗'}c7 ${c8 ? '✓' : '✗'}c8 ${allok ? '★ FIRE' : ''}`)
  }
}
