// V1: T1 cN <= 4.2 — ada pemenang di (3.75, 4.2]?
// V2: SKIP poke-bervolume-gagal (cN<0 & wick>=0.9 & p7<=-0.9) — bait-safety semua?
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import type { FboArah } from '../src/lib/exam/fbo-forge'
function simF(arah: FboArah, entry: number, stop: number, horizon: import('../src/lib/exam/generator').Candle[]): boolean {
  const led = simFboTrade({ aksi: 'ENTRY', arah, targetPct: 2.2, stopPct: stop }, entry, horizon)
  return (led.netPct ?? -1) > 0 && !led.stopHit
}
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)
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
      for (const ev of events.slice(0, 2)) {
        const umur = n - 1 - ev.firstPierceIdx
        const wickExc = ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)
        const momAl = ev.side === 'ATAS' ? mom50 : -mom50
        const breakArah: FboArah = ev.side === 'ATAS' ? 'NAIK' : 'TURUN'
        const sp = breakArah === 'NAIK' ? ev.lvl.level - 0.7 * atr : ev.lvl.level + 0.7 * atr
        const sf = Math.min(2.6, Math.max(0.8, breakArah === 'NAIK' ? ((e.entry - sp) / e.entry) * 100 : ((sp - e.entry) / e.entry) * 100))
        const t1fire =
          ev.closeNowAtr >= 0.2 && ev.volFollowPre >= 0.85 && ev.volLatePre >= 0.72 &&
          ev.closesBeyond >= 9 && umur <= 30 && momAl >= 2.8 && momAl <= 14 && ev.volRatioBreak <= 2.2 &&
          ev.effAtr <= 0.88 &&
          (ev.volLate <= 1.15 || ev.push7Atr <= 0.5) &&
          (ev.dirCons >= 0.3 || momAl >= 6.0 || (ev.push7Atr <= -0.5 && ev.effAtr <= 0.1)) &&
          ((wickExc >= 0.6 && wickExc <= 2.2 && ev.preTouches <= 4 && (momAl >= 3.2 || ev.volFollowPre >= 1.05)) ||
           (wickExc < 0.6 && ev.preTouches <= 4 && ev.volFollowPre >= 0.9 && ev.volRatioBreak <= 1.9)) &&
          (ev.effAtr < 0.7 || ev.push7Atr >= 1.0)
        if (t1fire && ev.push7Atr < 0 && ev.closesBeyond >= 20) {
          const ok = simF(breakArah, e.entry, sf, horizon)
          console.log(`V1 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 1 : 0} cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} p7=${ev.push7Atr.toFixed(2)} lateM=${ev.lateMoveAtr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} eff=${ev.effAtr.toFixed(2)} vFpre=${ev.volFollowPre.toFixed(2)} vLpre=${ev.volLatePre.toFixed(2)} vL=${ev.volLate.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} momAl=${momAl.toFixed(1)} umur=${umur} dEma=${fitur.distEma21Atr.toFixed(2)}`)
        }
      }
      const E = events[0]
      if (E && E.maxBeyondAtr >= 0.25 && E.closeNowAtr < 0 && E.wickBeyondAtr >= 0.9 && E.push7Atr <= -0.9 && E.maxBeyondAtr <= 1.2) {
        const bait = simBaitFbo(e.breakArah, e.entry, horizon)
        const aman = bait.stopHit || (bait.netPct ?? 0) <= 0
        console.log(`V2 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} amanNT=${aman ? 1 : 0} baitNet=${(bait.netPct ?? 0).toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)}`)
      }
    }
  }
}
