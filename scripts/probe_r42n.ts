// P-A: T1 jalur-a relax utk momAl [2.4,3.2) dgn vFpre >= 0.90
// P-B: T9 alt (vLpre < 0.85 requires dir >= 0.70)
// P-C: fbo2400 G#102/108-type — T11 cOut[6,8) fires? dEma check
// P-D: T8 relax (cN >= 0.5, momAl >= 1.5) utk fbo2400 G#103/107-type
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
const tab: Record<string, { w: number; l: number }> = {}
function mark(k: string, ok: boolean): void { tab[k] = tab[k] ?? { w: 0, l: 0 }; if (ok) tab[k].w++; else tab[k].l++ }
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
      // P-A: T1 utk momAl [2.4,3.2) jalur-a dgn vFpre >= 0.90
      if (
        E.closeNowAtr >= 0.2 && E.volFollowPre >= 0.85 && E.volLatePre >= 0.72 &&
        E.closesBeyond >= 9 && umur <= 30 && momAl >= 2.4 && momAl < 3.2 && E.volRatioBreak <= 2.2 &&
        E.effAtr <= 0.88 && (E.volLate <= 1.15 || E.push7Atr <= 0.5) && E.dirCons >= 0.3 &&
        wickExc >= 0.6 && wickExc <= 2.2 && E.preTouches <= 4 && E.volFollowPre >= 0.90 &&
        (E.effAtr < 0.7 || E.push7Atr >= 1.0) &&
        (E.push7Atr >= 0 || (E.lateMoveAtr <= 0.7 && E.volFollowPre >= 0.90 && E.volLatePre >= 0.80))
      ) mark('PA-T1-momAl[2.4,3.2)-vFpre.9', simF(breakArah, e.entry, sf, horizon))
      // P-B: T9 dgn vLpre < 0.85 tapi dir >= 0.70
      if (
        umur >= 12 && umur <= 24 && E.closesBeyond >= 14 &&
        E.closeNowAtr >= 1.0 && E.closeNowAtr <= 5.5 &&
        E.dirCons >= 0.70 && E.effAtr >= 0.4 && E.volRatioBreak <= 2.1 &&
        E.volFollow >= 0.9 && E.volFollow <= 1.2 && E.volLate >= 0.78 &&
        E.volLatePre >= 0.60 && E.volLatePre < 0.85 &&
        wickExc <= 0.6 && E.push7Atr >= 0.45 && momAl >= 5.0 && momAl <= 14
      ) mark('PB-T9-dir.70-vLpre[0.6,0.85)', simF(breakArah, e.entry, sf, horizon))
      // P-C: T11 cOut[6,8) — kenapa fbo2400 G#102 tidak menyala? dump dEma
      if (
        E.closeNowAtr >= 0.05 && E.closesBeyond >= 6 && E.closesBeyond < 8 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        wickExc <= 1.4 && E.rejecBodyAtr <= 1.0 &&
        E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.85 &&
        momAl <= 14 && E.dirCons >= 0.30
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        console.log(`PC ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} ok=${ok ? 1 : 0} dEma=${fitur.distEma21Atr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} dir=${E.dirCons.toFixed(2)} momAl=${momAl.toFixed(1)}`)
      }
      // P-D: T8 relax: cN [0.5,4.5], momAl >= 1.5
      if (
        E.closeNowAtr >= 0.5 && E.closeNowAtr <= 4.5 && E.closesBeyond >= 15 &&
        umur >= 12 && umur <= 34 && wickExc >= 1.5 &&
        E.rejecBodyAtr >= 0.6 && E.push7Atr <= -0.8 && momAl >= 1.5 && momAl < 4.0 &&
        E.volLate >= 0.8 && E.volRatioBreak <= 2.5
      ) mark('PD-T8-relax', simF(breakArah, e.entry, sf, horizon))
    }
  }
}
console.log('================ RINGKASAN r42n ================')
for (const k of Object.keys(tab).sort()) {
  const { w, l } = tab[k]
  console.log(`${k.padEnd(32)} n=${String(w + l).padStart(3)} WIN=${String(w).padStart(3)} LOSE=${String(l).padStart(3)}`)
}
