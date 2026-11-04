import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../../src/lib/exam/fbo-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const suite = forgeFboGuardSuite('fbo100')
for (const e of suite.slice(0, 6)) {
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(visible)
  const levels = buildFboLevels(visible)
  const evs = scanBreakEvents(visible, levels, fitur.volMean, fitur.atr)
  const k = fbVonis(visible)
  console.log(`#${e.num} ${e.fam} truth=${e.truth} lvl=${e.level.level.toFixed(2)} | events=${evs.length} top: ${evs.slice(0, 2).map((v) => `${v.lvl.jenis}@${v.lvl.level.toFixed(2)} ${v.side} preT=${v.preTouches} outer? closeNow=${v.closeNowAtr.toFixed(2)} out=${v.closesBeyond} vFol=${evs ? v.volFollow.toFixed(2) : '-'} vLate=${v.volLate.toFixed(2)} climax=${v.climax ? 'Y' : 'n'} wick=${v.wickBeyondAtr.toFixed(2)}`).join(' | ')}`)
  console.log(`   VONIS ${k.aksi}/${k.arah} stop=${k.stopPct.toFixed(2)} | ${k.alasan[0]?.slice(0, 110)}`)
}
