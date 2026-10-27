// T0d standalone: cN in [-1.6,0) & momAlign in [3.5,6.5) & vF<=0.92 & vL<=0.88 -> follow?
// plus varian band: [-1.6,0) momAlign>=3.5 (tanpa batas atas 6.5)
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)
let w1 = 0, l1 = 0, w2 = 0, l2 = 0
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
      if (!E || E.climax) continue
      const momAlign = E.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
      const breakArah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
      const stop = breakArah === 'NAIK'
        ? Math.min(2.6, Math.max(0.8, ((e.entry - (E.lvl.level - 0.7 * atr)) / e.entry) * 100))
        : Math.min(2.6, Math.max(0.8, (((E.lvl.level + 0.7 * atr) - e.entry) / e.entry) * 100))
      const g1 = E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 && momAlign >= 3.5 && momAlign < 6.5 &&
        E.volFollow <= 0.92 && E.volLate <= 0.88
      const g2 = E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 && momAlign >= 3.5 &&
        E.volFollow <= 0.92 && E.volLate <= 0.88
      if (g1 || g2) {
        const led = simFboTrade({ aksi: 'ENTRY', arah: breakArah, targetPct: 2.2, stopPct: stop }, e.entry, horizon)
        const ok = (led.netPct ?? -1) > 0 && !led.stopHit
        const tag = `${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} momAl=${momAlign.toFixed(1)} cN=${E.closeNowAtr.toFixed(2)} vF=${E.volFollow.toFixed(2)} vL=${E.volLate.toFixed(2)} p7=${E.push7Atr.toFixed(2)} umur=${n - 1 - E.firstPierceIdx} lastP=${n - 1 - E.lastPierceIdx} cOut=${E.closesBeyond}`
        if (g1) { if (ok) w1++; else { l1++; console.log('G1-LOSE ' + tag) } if (g2) { if (ok) w2++; else l2++ } }
        else { if (ok) w2++; else { l2++; console.log('G2-LOSE ' + tag) } }
        if (ok) console.log('WIN    ' + tag)
      }
    }
  }
}
console.log(`G1 [3.5,6.5): WIN=${w1} LOSE=${l1} | G2 >=3.5: WIN=${w2} LOSE=${l2}`)
