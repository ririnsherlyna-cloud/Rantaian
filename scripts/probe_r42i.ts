// (3) T5 cN-ext [3.2,6.5] utk fbo1300 G#112/116; (10) veto T0 wick>=0.9 & p7<=-0.9
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import type { FboArah } from '../src/lib/exam/fbo-forge'
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)
function simF(arah: FboArah, entry: number, stop: number, horizon: import('../src/lib/exam/generator').Candle[]): boolean {
  const led = simFboTrade({ aksi: 'ENTRY', arah, targetPct: 2.2, stopPct: stop }, entry, horizon)
  return (led.netPct ?? -1) > 0 && !led.stopHit
}
let a = { w: 0, l: 0 }, b = { w: 0, l: 0 }
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
      if (!E || E.maxBeyondAtr < 0.25) continue
      const umur = n - 1 - E.firstPierceIdx
      const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
      const momAl = E.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
      const breakArah: FboArah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
      const sp = breakArah === 'NAIK' ? E.lvl.level - 0.7 * atr : E.lvl.level + 0.7 * atr
      const sf = Math.min(2.6, Math.max(0.8, breakArah === 'NAIK' ? ((e.entry - sp) / e.entry) * 100 : ((sp - e.entry) / e.entry) * 100))
      // (3) T5 cN-ext
      if (
        umur >= 24 && E.closesBeyond >= 30 && E.volFollowPre >= 1.0 &&
        E.closeNowAtr > 3.2 && E.closeNowAtr <= 6.5 &&
        Math.abs(fitur.distEma21Atr) <= 2.4 && !E.climax &&
        wickExc <= 3.0 && E.volRatioBreak <= 2.45 && E.push7Atr >= 0
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        if (ok) a.w++; else a.l++
        console.log(`T5cnext ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} ok=${ok ? 1 : 0} cN=${E.closeNowAtr.toFixed(2)} umur=${umur} cOut=${E.closesBeyond} wExc=${wickExc.toFixed(2)} p7=${E.push7Atr.toFixed(2)} dir=${E.dirCons.toFixed(2)} lateM=${E.lateMoveAtr.toFixed(2)}`)
      }
      // (10) T0-veto kandidat: wick>=0.9 & p7<=-0.9 → follow outcome
      if (
        ((E.closeNowAtr >= -0.9 && E.closeNowAtr < 0) ||
         (momAl >= 6.5 && momAl < 14 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0) ||
         (momAl >= 3.5 && momAl < 6.5 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 && E.volFollow <= 0.92 && E.volLate <= 0.88)) &&
        E.closesBeyond >= 3 && momAl >= 2.0 && momAl <= 14 && E.volFollow >= 0.7 &&
        E.maxBeyondAtr <= 2.6 && !E.climax && umur <= 14 &&
        E.wickBeyondAtr >= 0.9 && E.push7Atr <= -0.9
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        if (ok) b.w++; else b.l++
        console.log(`T0veto ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 1 : 0} wick=${E.wickBeyondAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} momAl=${momAl.toFixed(1)} cOut=${E.closesBeyond}`)
      }
    }
  }
}
console.log(`T5-cN-ext: WIN=${a.w} LOSE=${a.l} | T0-veto(wick+p7): follow-WIN=${b.w} follow-LOSE=${b.l}`)
