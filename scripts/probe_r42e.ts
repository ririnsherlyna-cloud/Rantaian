// FB-R3 standalone: E.closeNowAtr<0 & p7>=0.2 & vFpre>=1.05 & cOut>=15 & lastP<=11
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)
let win = 0, lose = 0
for (const ns of seeds) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const n = cs.length
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const events = scanBreakEvents(cs, buildFboLevels(cs), fitur.volMean, atr)
      const E = events[0]
      if (!E) continue
      if (
        E.closeNowAtr < 0 && E.push7Atr >= 0.2 && E.volFollowPre >= 1.05 &&
        E.closesBeyond >= 15 && n - 1 - E.lastPierceIdx <= 11
      ) {
        const breakArah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
        const stop = breakArah === 'NAIK'
          ? Math.min(2.6, Math.max(0.8, ((e.entry - (E.lvl.level - 0.7 * atr)) / e.entry) * 100))
          : Math.min(2.6, Math.max(0.8, (((E.lvl.level + 0.7 * atr) - e.entry) / e.entry) * 100))
        const led = simFboTrade({ aksi: 'ENTRY', arah: breakArah, targetPct: 2.2, stopPct: stop }, e.entry, horizon)
        const ok = (led.netPct ?? -1) > 0 && !led.stopHit
        if (ok) win++; else lose++
        console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 'WIN' : 'LOSE'} cN=${E.closeNowAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)} cOut=${E.closesBeyond} lastP=${n - 1 - E.lastPierceIdx}`)
      }
    }
  }
}
console.log(`FB-R3 standalone: WIN=${win} LOSE=${lose}`)
