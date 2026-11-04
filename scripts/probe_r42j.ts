// P1: T1 dgn p7 < 0 → outcome?  P2: T5-ext (cN>3.2) vLpre/vL → outcome?
// P3: T0-shape momAlign [2.0,3.0) & xB & rej>=0.5 & cOut>=8 → outcome?
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
let p1 = { w: 0, l: 0 }, p3 = { w: 0, l: 0 }
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
      const mom50 = fitur.mom50Atr ?? 0
      // P1 & P2: kedua event (T1/T5 loop slice(0,2))
      for (const ev of events.slice(0, 2)) {
        const umur = n - 1 - ev.firstPierceIdx
        const wickExc = ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)
        const momAl = ev.side === 'ATAS' ? mom50 : -mom50
        const breakArah: FboArah = ev.side === 'ATAS' ? 'NAIK' : 'TURUN'
        const sp = breakArah === 'NAIK' ? ev.lvl.level - 0.7 * atr : ev.lvl.level + 0.7 * atr
        const sf = Math.min(2.6, Math.max(0.8, breakArah === 'NAIK' ? ((e.entry - sp) / e.entry) * 100 : ((sp - e.entry) / e.entry) * 100))
        // T1 shape (v1.34 dgn lantai eff)
        const t1fire =
          ev.closeNowAtr >= 0.2 && ev.volFollowPre >= 0.85 && ev.volLatePre >= 0.72 &&
          ev.closesBeyond >= 9 && umur <= 30 && momAl >= 2.8 && momAl <= 14 && ev.volRatioBreak <= 2.2 &&
          ev.effAtr <= 0.88 &&
          (ev.volLate <= 1.15 || ev.push7Atr <= 0.5) &&
          (ev.dirCons >= 0.3 || momAl >= 6.0 || (ev.push7Atr <= -0.5 && ev.effAtr <= 0.1)) &&
          ((wickExc >= 0.6 && wickExc <= 2.2 && ev.preTouches <= 4 && (momAl >= 3.2 || ev.volFollowPre >= 1.05)) ||
           (wickExc < 0.6 && ev.preTouches <= 4 && ev.volFollowPre >= 0.9 && ev.volRatioBreak <= 1.9)) &&
          (ev.effAtr < 0.7 || ev.push7Atr >= 1.0)
        if (t1fire && ev.push7Atr < 0) {
          const ok = simF(breakArah, e.entry, sf, horizon)
          if (ok) p1.w++; else p1.l++
          console.log(`P1 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 1 : 0} p7=${ev.push7Atr.toFixed(2)} lateM=${ev.lateMoveAtr.toFixed(2)} eff=${ev.effAtr.toFixed(2)} cN=${ev.closeNowAtr.toFixed(2)} momAl=${momAl.toFixed(1)}`)
        }
        // T5-ext shape (cN > 3.2)
        if (
          umur >= 24 && ev.closesBeyond >= 30 && ev.volFollowPre >= 1.0 &&
          ev.closeNowAtr > 3.2 && ev.closeNowAtr <= 6.5 &&
          Math.abs(fitur.distEma21Atr) <= 2.4 && !ev.climax &&
          wickExc <= 3.6 && ev.volRatioBreak <= 2.45 && ev.push7Atr >= 0
        ) {
          const ok = simF(breakArah, e.entry, sf, horizon)
          console.log(`P2 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 1 : 0} vLpre=${ev.volLatePre.toFixed(2)} vL=${ev.volLate.toFixed(2)} vFpre=${ev.volFollowPre.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} lateM=${ev.lateMoveAtr.toFixed(2)} cN=${ev.closeNowAtr.toFixed(2)} momAl=${momAl.toFixed(1)}`)
        }
      }
      // P3
      const E = events[0]
      if (E && E.maxBeyondAtr >= 0.25) {
        const umur = n - 1 - E.firstPierceIdx
        const momAl = E.side === 'ATAS' ? mom50 : -mom50
        if (
          ((E.closeNowAtr >= -0.9 && E.closeNowAtr < 0) ||
           (momAl >= 6.5 && momAl < 14 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0) ||
           (momAl >= 3.5 && momAl < 6.5 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 && E.volFollow <= 0.92 && E.volLate <= 0.88)) &&
          E.closesBeyond >= 3 && momAl >= 2.0 && momAl <= 14 && E.volFollow >= 0.7 &&
          E.maxBeyondAtr <= 2.6 && !E.climax && umur <= 14 &&
          E.crossBack && E.rejecBodyAtr >= 0.5 && E.closesBeyond >= 8 && momAl < 3.0
        ) {
          const breakArah: FboArah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
          const sp = breakArah === 'NAIK' ? E.lvl.level - 0.7 * atr : E.lvl.level + 0.7 * atr
          const sf = Math.min(2.6, Math.max(0.8, breakArah === 'NAIK' ? ((e.entry - sp) / e.entry) * 100 : ((sp - e.entry) / e.entry) * 100))
          const ok = simF(breakArah, e.entry, sf, horizon)
          if (ok) p3.w++; else p3.l++
          console.log(`P3 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 1 : 0} momAl=${momAl.toFixed(1)} cOut=${E.closesBeyond} rej=${E.rejecBodyAtr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)}`)
        }
      }
    }
  }
}
console.log(`P1 (T1 p7<0): follow-WIN=${p1.w} LOSE=${p1.l} | P3 (T0-veto momAlign<3): follow-WIN=${p3.w} LOSE=${p3.l}`)
