import { forgeFboSuite, forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../../src/lib/exam/fbo-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const numsG = process.argv.slice(2).map(Number)
const suiteF = forgeFboSuite('fbo100')
const suiteG = forgeFboGuardSuite('fbo100')
for (const num of numsG) {
  const e = num > 100 ? suiteG.find((x) => x.num === num) : suiteF.find((x) => x.num === num)
  if (!e) continue
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(visible)
  const levels = buildFboLevels(visible)
  const evs = scanBreakEvents(visible, levels, fitur.volMean, fitur.atr)
  const k = fbVonis(visible)
  console.log(`\n=== #${num} ${e.fam} truth=${e.truth} lvl=${e.level.level.toFixed(2)} close60=${e.entry.toFixed(2)} atr=${fitur.atr.toFixed(3)} ===`)
  const near = levels.filter((l) => Math.abs(l.level - e.level.level) <= 1.2 * fitur.atr)
  console.log(`levels dekat: ${near.map((l) => `${l.jenis}@${l.level.toFixed(2)}(s${l.sentuhan})`).join(', ') || 'TIDAK ADA'}`)
  for (const ev of evs.slice(0, 5)) {
    console.log(`  ev ${ev.lvl.jenis}@${ev.lvl.level.toFixed(2)} ${ev.side} fp=${ev.firstPierceIdx} lp=${ev.lastPierceIdx} preT=${ev.preTouches} beyond=${ev.maxBeyondAtr.toFixed(2)} closeNow=${ev.closeNowAtr.toFixed(2)} out=${ev.closesBeyond} vFol=${ev.volFollow.toFixed(2)} vLate=${ev.volLate.toFixed(2)} xB=${ev.crossBack ? 'Y' : 'n'} wick=${ev.wickBeyondAtr.toFixed(2)} rejec=${ev.rejecBodyAtr.toFixed(2)}`)
  }
  console.log(`VONIS ${k.aksi}/${k.arah} | ${k.alasan[0]?.slice(0, 110)}`)
}
