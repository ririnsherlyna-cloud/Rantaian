// PROBE r42l — kandidat generalisasi utk 32 kegagalan hakim segel
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
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
      const mom50 = fitur.mom50Atr ?? 0
      // (f) L1b/L2 parabola veto kandidat: event dgn |momAlign| >= 12 & cN < 0 & cOut <= 6
      // -> outcome SKIP (bait-safety)
      if (E && E.closeNowAtr < 0 && E.closesBeyond <= 6 && Math.abs(E.side === 'ATAS' ? mom50 : -mom50) >= 12 && E.maxBeyondAtr >= 0.25 && n - 1 - E.lastPierceIdx <= 11) {
        const bait = simBaitFbo(e.breakArah, e.entry, horizon)
        const aman = bait.stopHit || (bait.netPct ?? 0) <= 0
        mark('F-L1bL2-parabola->SKIP', aman)
      }
      if (!E || E.maxBeyondAtr < 0.25) continue
      const umur = n - 1 - E.firstPierceIdx
      const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
      const momAl = E.side === 'ATAS' ? mom50 : -mom50
      const breakArah: FboArah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
      const sp = breakArah === 'NAIK' ? E.lvl.level - 0.7 * atr : E.lvl.level + 0.7 * atr
      const sf = Math.min(2.6, Math.max(0.8, breakArah === 'NAIK' ? ((e.entry - sp) / e.entry) * 100 : ((sp - e.entry) / e.entry) * 100))
      // (b1) T2 vBrk <= 3.1 (dari 2.45)
      if (
        E.closeNowAtr >= 3.2 && E.closesBeyond >= 26 && umur >= 24 && umur <= 34 &&
        E.volFollowPre >= 0.9 && E.volLatePre >= 0.72 &&
        E.volRatioBreak > 2.45 && E.volRatioBreak <= 3.1 && momAl >= 3.2 && momAl <= 11.5 && wickExc <= 1.2 &&
        E.volLate <= 1.25 && (E.push7Atr >= 0 || (E.lateMoveAtr <= 0.7 && E.volFollowPre >= 0.90 && E.volLatePre >= 0.80))
      ) mark('B1-T2-vBrk[2.45,3.1]', simF(breakArah, e.entry, sf, horizon))
      // (b2) T10 rej [0.2,1.1] (dari [0.5,1.0])
      if (
        umur >= 24 && E.closesBeyond >= 24 &&
        E.closeNowAtr >= 2.5 && E.closeNowAtr <= 8.5 &&
        E.dirCons >= 0.7 && E.rejecBodyAtr >= 0.2 && E.rejecBodyAtr < 0.5 && wickExc <= 1.0 &&
        E.push7Atr >= 1.0 && E.volRatioBreak <= 3.0 &&
        E.volFollow >= 0.95 && E.volFollow <= 1.2 && E.volLate >= 0.9 &&
        momAl >= 4.0 && momAl <= 14 && E.effAtr >= 0.25
      ) mark('B2-T10-rej[0.2,0.5)', simF(breakArah, e.entry, sf, horizon))
      // (c) T1 momAl [2.4,2.8)
      if (
        E.closeNowAtr >= 0.2 && E.volFollowPre >= 0.85 && E.volLatePre >= 0.72 &&
        E.closesBeyond >= 9 && umur <= 30 && momAl >= 2.4 && momAl < 2.8 && E.volRatioBreak <= 2.2 &&
        E.effAtr <= 0.88 &&
        (E.volLate <= 1.15 || E.push7Atr <= 0.5) &&
        (E.dirCons >= 0.3 || momAl >= 6.0 || (E.push7Atr <= -0.5 && E.effAtr <= 0.1)) &&
        ((wickExc >= 0.6 && wickExc <= 2.2 && E.preTouches <= 4 && (momAl >= 3.2 || E.volFollowPre >= 1.05)) ||
         (wickExc < 0.6 && E.preTouches <= 4 && E.volFollowPre >= 0.9 && E.volRatioBreak <= 1.9)) &&
        (E.effAtr < 0.7 || E.push7Atr >= 1.0) &&
        (E.push7Atr >= 0 || (E.lateMoveAtr <= 0.7 && E.volFollowPre >= 0.90 && E.volLatePre >= 0.80))
      ) mark('C-T1-momAl[2.4,2.8)', simF(breakArah, e.entry, sf, horizon))
      // (e) T11 cOut [6,8)
      if (
        E.closeNowAtr >= 0.05 && E.closesBeyond >= 6 && E.closesBeyond < 8 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        E.maxBeyondAtr - Math.max(0, E.closeNowAtr) <= 1.4 && E.rejecBodyAtr <= 1.0 &&
        E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.85 &&
        momAl <= 14 && fitur.distEma21Atr >= -0.5 && fitur.distEma21Atr <= 2.4
      ) mark('E-T11-cOut[6,8)', simF(breakArah, e.entry, sf, horizon))
      // (h) T11 dgn dir >= 0.45: berapa pemenang 83 yang hilang? ukur sisi blokir:
      if (
        E.closeNowAtr >= 0.05 && E.closesBeyond >= 8 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        E.maxBeyondAtr - Math.max(0, E.closeNowAtr) <= 1.4 && E.rejecBodyAtr <= 1.0 &&
        E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.85 &&
        momAl <= 14 && fitur.distEma21Atr >= -0.5 && fitur.distEma21Atr <= 2.4 &&
        E.dirCons < 0.45
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        mark('H-T11-dir<0.45 (blokir)', ok)
      }
      // (g) T0 band-1 dgn dir < 0.25 (blokir kandidat — fbo2000 F#4/8 dir 0.13)
      if (
        E.closeNowAtr >= -0.9 && E.closeNowAtr < 0 && E.closesBeyond >= 3 &&
        (E.side === 'ATAS' ? mom50 : -mom50) >= 2.0 && (E.side === 'ATAS' ? mom50 : -mom50) <= 14 && E.volFollow >= 0.7 &&
        E.maxBeyondAtr <= 2.6 && !E.climax && umur <= 14 &&
        !(E.wickBeyondAtr >= 0.9 && E.push7Atr <= -0.9) &&
        !(E.crossBack && E.rejecBodyAtr >= 0.5 && E.closesBeyond >= 8 && (E.side === 'ATAS' ? mom50 : -mom50) < 3.0) &&
        E.dirCons < 0.25
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        mark('G-T0-dir<0.25 (blokir)', ok)
        if (!ok) console.log(`G-fix ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} dir=${E.dirCons.toFixed(2)} p7=${E.push7Atr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)}`)
      }
      // (i) L4b bypass p7 >= 2.5 (dari 2.0): yang terblokir = maxB > 1.6 & p7 [2.0,2.5)
      if (
        E.closesBeyond >= 2 && E.closeNowAtr >= 0.25 && E.closeNowAtr <= 3.2 && !E.crossBack &&
        E.volFollowPre >= 0.85 && E.volLatePre >= 0.7 && !E.climax &&
        E.maxBeyondAtr > 1.6 && E.push7Atr >= 2.0 && E.push7Atr < 2.5 &&
        ( (() => { const last6 = cs.slice(Math.max(0, n - 6)); const minLow6 = Math.min(...last6.map((c) => c.l)); const maxHi6 = Math.max(...last6.map((c) => c.h)); const fb = E.side === 'ATAS' ? (minLow6 - E.lvl.level) / atr : (E.lvl.level - maxHi6) / atr; return fb >= -0.5 && fb <= 0.55 })() ) && E.rejecBodyAtr <= 0.6 && E.wickBeyondAtr <= 0.7 &&
        (E.effAtr >= 0.15 || (E.closesBeyond >= 8 && E.volFollowPre >= 0.9))
      ) mark('I-L4b-p7[2.0,2.5) (blokir)', simF(breakArah, e.entry, sf, horizon))
      // (j) p7<0 & cOut<20 T1 population
      if (
        E.closeNowAtr >= 0.2 && E.volFollowPre >= 0.85 && E.volLatePre >= 0.72 &&
        E.closesBeyond >= 9 && umur <= 30 && momAl >= 2.8 && momAl <= 14 && E.volRatioBreak <= 2.2 &&
        E.effAtr <= 0.88 &&
        (E.volLate <= 1.15 || E.push7Atr <= 0.5) &&
        (E.dirCons >= 0.3 || momAl >= 6.0 || (E.push7Atr <= -0.5 && E.effAtr <= 0.1)) &&
        ((wickExc >= 0.6 && wickExc <= 2.2 && E.preTouches <= 4 && (momAl >= 3.2 || E.volFollowPre >= 1.05)) ||
         (wickExc < 0.6 && E.preTouches <= 4 && E.volFollowPre >= 0.9 && E.volRatioBreak <= 1.9)) &&
        (E.effAtr < 0.7 || E.push7Atr >= 1.0) &&
        E.push7Atr < 0 && E.closesBeyond < 20
      ) mark('J-T1-p7neg-cOut<20', simF(breakArah, e.entry, sf, horizon))
      // (k) T9 vL >= 0.78 (dari 0.90) — kasus vL [0.78,0.90)
      if (
        umur >= 12 && umur <= 24 && E.closesBeyond >= 14 &&
        E.closeNowAtr >= 1.0 && E.closeNowAtr <= 5.5 &&
        E.dirCons >= 0.6 && E.effAtr >= 0.4 && E.volRatioBreak <= 2.1 &&
        E.volFollow >= 0.9 && E.volFollow <= 1.2 && E.volLate >= 0.78 && E.volLate < 0.90 &&
        E.volLatePre >= 0.85 &&
        wickExc <= 0.6 && E.push7Atr >= 0.45 && momAl >= 5.0 && momAl <= 14
      ) mark('K-T9-vL[0.78,0.90)', simF(breakArah, e.entry, sf, horizon))
    }
  }
}
console.log('================ RINGKASAN r42l (24 seed) ================')
for (const k of Object.keys(tab).sort()) {
  const { w, l } = tab[k]
  console.log(`${k.padEnd(30)} n=${String(w + l).padStart(3)} WIN=${String(w).padStart(3)} LOSE=${String(l).padStart(3)}`)
}
