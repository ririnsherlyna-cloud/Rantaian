// bedah FBO v2: kenapa level tak terpetakan / vonis salah
import { forgeFboSuite } from '../../src/lib/exam/fbo-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../../src/lib/exam/fbo-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'

const nums = process.argv.slice(2).map(Number)
const suite = forgeFboSuite('fbo100')
for (const num of nums) {
  const e = suite.find((x) => x.num === num)
  if (!e) continue
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(visible)
  const atr = fitur.atr
  const levels = buildFboLevels(visible)
  console.log(`\n=== #${num} ${e.fam} [${e.diff}] side=${e.level.side} truth=${e.truth} ===`)
  console.log(`truth level=${e.level.level.toFixed(2)} extreme=${e.level.extreme.toFixed(2)} | atr=${atr.toFixed(3)} close60=${e.entry.toFixed(2)}`)
  const near = levels.filter((l) => Math.abs(l.level - e.level.level) <= 1.2 * atr)
  console.log(`LEVELS dekat truth: ${levels.length} total; dekat: ${near.map((l) => `${l.jenis}@${l.level.toFixed(2)}(s${l.sentuhan})`).join(', ') || 'TIDAK ADA'}`)
  const evs = scanBreakEvents(visible, levels, fitur.volMean, atr)
  console.log(`EVENTS (${evs.length}):`)
  for (const ev of evs.slice(0, 6)) {
    console.log(`  ${ev.lvl.jenis.padEnd(16)} ${ev.side.padEnd(6)} lvl=${ev.lvl.level.toFixed(2)} preT=${ev.preTouches} beyond=${ev.maxBeyondAtr.toFixed(2)} closeNow=${ev.closeNowAtr.toFixed(2)} out=${ev.closesBeyond} vBrk=${ev.volRatioBreak.toFixed(1)} vFol=${ev.volFollow.toFixed(2)} vLate=${ev.volLate.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} rejec=${ev.rejecBodyAtr.toFixed(2)} xB=${ev.crossBack ? 'Y' : 'n'}`)
  }
  const k = fbVonis(visible)
  console.log(`VONIS: ${k.aksi}/${k.arah} trig=${k.triggerLevel?.toFixed(2) ?? '-'} | ${k.alasan[0]?.slice(0, 120)}`)
}
