// ============================================================
// PROBE LEVEL-SEJATI — utk tiap ujian guard/trap, temukan EVENT
// pada level mendekati truthLevel (±0.6 ATR) dan dump fiturnya.
//   bun scripts/probe_fbo_true.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const fams = process.argv[2] ?? 'g-accept,g-trend-cont,g-retest-hold,fbo-follow-fail,fbo-climax-fail,fbo-momentum-fail,fbo-weak,fbo-drift-snap,fbo-equal'

for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600']) {
  const suite = forgeFboSuite(ns)
  const guards = forgeFboGuardSuite(ns)
  for (const e of [...suite, ...guards]) {
    if (!fams.split(',').includes(e.fam)) continue
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const n = visible.length
    const fitur = buildSgVision(visible)
    const atr = Math.max(fitur.atr, 1e-9)
    const levels = buildFboLevels(visible)
    const events = scanBreakEvents(visible, levels, fitur.volMean, atr)
    // event level-sejati: level otak dekat truthLevel
    const tru = events.find((ev) => Math.abs(ev.lvl.level - e.level.level) <= 0.6 * atr && ev.side === e.level.side)
    const top = events[0] ?? null
    const fmt = (ev: typeof top): string =>
      ev ? `lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis.slice(0, 6)}) pT=${ev.preTouches} umur=${n - 1 - ev.firstPierceIdx} cOut=${ev.closesBeyond} cN=${ev.closeNowAtr.toFixed(2)} maxB=${ev.maxBeyondAtr.toFixed(2)} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} xB=${ev.crossBack ? 1 : 0} eff=${ev.effAtr.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} rank=${ev.rank.toFixed(2)}` : 'TIDAK-ADA'
    console.log(`${ns}_${String(e.num).padStart(3)} ${e.fam.padEnd(16)} ${e.diff.padEnd(6)} TRUTH=${e.level.level.toFixed(2)}`)
    console.log(`   SEJATI: ${fmt(tru)}`)
    console.log(`   TOP   : ${fmt(top)}`)
  }
}
