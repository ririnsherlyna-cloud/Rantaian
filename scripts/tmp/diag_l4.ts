import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { buildFboLevels, scanBreakEvents } from '../../src/lib/exam/fbo-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
import { mean } from '../../src/lib/exam/indicators'
const suite = forgeFboGuardSuite('fbo100')
for (const e of suite.slice(0, 8)) {
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(visible)
  const levels = buildFboLevels(visible)
  const evs = scanBreakEvents(visible, levels, fitur.volMean, fitur.atr)
  // cari event level dekat truth
  const atr = fitur.atr
  const near = evs.filter((v) => Math.abs(v.lvl.level - e.level.level) <= 0.9 * atr)
  const v = near[0]
  const n = FBO_VISIBLE
  const last6 = visible.slice(n - 6)
  const meanBody6 = mean(last6.map((c) => Math.abs(c.c - c.o))) / atr
  const minLow6 = Math.min(...last6.map((c) => c.l))
  const maxHi6 = Math.max(...last6.map((c) => c.h))
  const floatBeyond = v ? (v.side === 'ATAS' ? (minLow6 - v.lvl.level) / atr : (v.lvl.level - maxHi6) / atr) : 0
  console.log(`#${e.num} ${e.fam} truth=${e.truth} lvl=${e.level.level.toFixed(2)} | ev-near: ${near.length} | ${v ? `L4: cNow=${v.closeNowAtr.toFixed(2)}(>=0.25) out=${v.closesBeyond}(>=2) vFol=${v.volFollow.toFixed(2)}(>=0.9) vLate=${v.volLate.toFixed(2)}(>=0.7) body6=${meanBody6.toFixed(2)}(>=0.35) float=${floatBeyond.toFixed(2)}(>=0.3) climax=${v.climax} wick=${v.wickBeyondAtr.toFixed(2)} xB=${v.crossBack} vFade=${(v.volLate < 0.7 * v.volFollow) ? 'Y' : 'n'} overExt=${(fitur.distEma21Atr >= 2.4 && fitur.mom12Atr >= 2.4) ? 'Y' : 'n'} fp=${v.firstPierceIdx}` : 'TIDAK ADA EVENT'}`)
  if (!v && near.length === 0) console.log(`   events: ${evs.slice(0, 3).map((x) => `${x.lvl.jenis}@${x.lvl.level.toFixed(2)}${x.side} fp=${x.firstPierceIdx}`).join(' | ')}`)
}
