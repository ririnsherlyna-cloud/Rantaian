import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../../src/lib/exam/fbo-brain'
import { simFboTrade, FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
import { mean } from '../../src/lib/exam/indicators'
for (const e of forgeFboGuardSuite('fbo100')) {
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(visible)
  const levels = buildFboLevels(visible)
  const evs = scanBreakEvents(visible, levels, fitur.volMean, fitur.atr)
  const k = fbVonis(visible)
  const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, e.candles.slice(FBO_VISIBLE))
  const ok = led.mode !== 'NO-TRADE' && (led.netPct ?? -1) > 0 && !led.stopHit
  if (ok) continue
  const atr = fitur.atr
  const near = evs.find((v) => Math.abs(v.lvl.level - e.level.level) <= 0.9 * atr)
  const n = FBO_VISIBLE
  const last6 = visible.slice(n - 6)
  const meanBody6 = mean(last6.map((c) => Math.abs(c.c - c.o))) / atr
  const minLow6 = Math.min(...last6.map((c) => c.l))
  const maxHi6 = Math.max(...last6.map((c) => c.h))
  const fb = near ? (near.side === 'ATAS' ? (minLow6 - near.lvl.level) / atr : (near.lvl.level - maxHi6) / atr) : 0
  const tiny10 = visible.slice(n - 10).filter((c) => Math.abs(c.c - c.o) <= 0.2 * atr).length
  console.log(`#${e.num} ${e.fam} ${k.aksi}/${k.arah} | evNear: ${near ? `cNow=${near.closeNowAtr.toFixed(2)} out=${near.closesBeyond} vFol=${near.volFollow.toFixed(2)} vLate=${near.volLate.toFixed(2)} vFade=${(near.volLate < 0.7 * near.volFollow) ? 'Y' : 'n'} body6=${meanBody6.toFixed(2)} float=${fb.toFixed(2)} tiny10=${tiny10} climax=${near.climax ? 'Y' : 'n'} wick=${near.wickBeyondAtr.toFixed(2)} xB=${near.crossBack ? 'Y' : 'n'} oE=${(fitur.distEma21Atr >= 2.4 && fitur.mom12Atr >= 2.4 && meanBody6 < 0.28) ? 'Y' : 'n'}` : 'TIDAK ADA'} | vonisOK-level: ${k.level.level > 0 && Math.abs(k.level.level - e.level.level) <= 0.6 * atr ? 'Y' : 'n'}`)
}
