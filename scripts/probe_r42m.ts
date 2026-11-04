// H2: T11-blokir (dir<0.45) — fitur 9 WIN utk cari pemisah dgn 2 LOSE
// I2: L4b-bypass blokir (umur >= 10) — WIN/LOSE?
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import type { FboArah } from '../src/lib/exam/fbo-forge'
const seeds: string[] = []
for (let i = 1; i <= 24; i++) seeds.push(`fbo${i * 100}`)
function simF(arah: FboArah, entry: number, stop: number, horizon: import('../src/lib/exam/generator').Candle[]): boolean {
  const led = simFboTrade({ aksi: 'ENTRY', arah, targetPct: 2.2, stopPct: stop }, entry, horizon)
  return (led.netPct ?? -1) > 0 && !led.stopHit
}
let i2w = 0, i2l = 0
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
      if (
        E.closeNowAtr >= 0.05 && E.closesBeyond >= 8 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        wickExc <= 1.4 && E.rejecBodyAtr <= 1.0 &&
        E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.85 &&
        momAl <= 14 && fitur.distEma21Atr >= -0.5 && fitur.distEma21Atr <= 2.4 &&
        E.dirCons < 0.45
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        console.log(`H2 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} ok=${ok ? 1 : 0} dir=${E.dirCons.toFixed(2)} p7=${E.push7Atr.toFixed(2)} eff=${E.effAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} cOut=${E.closesBeyond} momAl=${momAl.toFixed(1)} umur=${umur} wExc=${wickExc.toFixed(2)} lateM=${E.lateMoveAtr.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)}`)
      }
      // I2: L4b bypass dgn umur >= 10 utk maxB > 1.6
      const last6 = cs.slice(Math.max(0, n - 6))
      const minLow6 = Math.min(...last6.map((c) => c.l))
      const maxHi6 = Math.max(...last6.map((c) => c.h))
      const fb = E.side === 'ATAS' ? (minLow6 - E.lvl.level) / atr : (E.lvl.level - maxHi6) / atr
      if (
        E.closesBeyond >= 2 && E.closeNowAtr >= 0.25 && E.closeNowAtr <= 3.2 && !E.crossBack &&
        E.volFollowPre >= 0.85 && E.volLatePre >= 0.7 && !E.climax &&
        E.maxBeyondAtr > 1.6 && E.push7Atr >= 2.0 &&
        fb >= -0.5 && fb <= 0.55 && E.rejecBodyAtr <= 0.6 && E.wickBeyondAtr <= 0.7 &&
        (E.effAtr >= 0.15 || (E.closesBeyond >= 8 && E.volFollowPre >= 0.9)) &&
        umur >= 10
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        if (ok) i2w++; else i2l++
        console.log(`I2 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} ok=${ok ? 1 : 0} umur=${umur} maxB=${E.maxBeyondAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} dir=${E.dirCons.toFixed(2)}`)
      }
    }
  }
}
console.log(`I2 (L4b-bypass umur>=10): WIN=${i2w} LOSE=${i2l}`)
