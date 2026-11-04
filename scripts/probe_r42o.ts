// Q1: T0n konflik-struktur (E ada, side ATAS, mom50 <= -2.5) — T0n-follow outcome?
// Q2: L1 dgn vLpre < 0.5 — fade outcome? (veto → aman?)
// Q3: T11 dgn cN > 1.0 & momAl < 2.0 — follow outcome?
// Q4: L8 dgn vFpre >= 1.15 — WAIT-fade outcome?
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
function baitSafe(breakArah: FboArah, entry: number, horizon: import('../src/lib/exam/generator').Candle[]): boolean {
  const bait = simBaitFbo(breakArah, entry, horizon)
  return bait.stopHit || (bait.netPct ?? 0) <= 0
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
      // Q1: no-E-branch + micro-poke dgn rej < 0.5 + mom50 menentang struktur
      if ((!E || E.maxBeyondAtr < 0.25) && E) {
        const momAlign = E.side === 'ATAS' ? mom50 : -mom50
        if (E.maxBeyondAtr >= 0.10 && E.rejecBodyAtr < 0.5 && momAlign <= -2.5 && E.side === 'ATAS') {
          // T0n akan follow TURUN (mom50 neg) — lawan struktur break-ATAS
          mark('Q1-T0n-konflik-follow', simF('TURUN', e.entry, 1.8, horizon))
        }
        continue
      }
      if (!E || E.maxBeyondAtr < 0.25) continue
      const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
      const momAl = E.side === 'ATAS' ? mom50 : -mom50
      const fadeArah: FboArah = E.side === 'ATAS' ? 'TURUN' : 'NAIK'
      // Q2: L1-shaped dgn vLpre < 0.5 — SKIP aman?
      if (
        E.closeNowAtr <= -0.15 && E.closeNowAtr >= -3.2 && E.maxBeyondAtr >= 0.25 && n - 1 - E.lastPierceIdx <= 11 &&
        E.volRatioBreak >= 0.9 && (E.closesBeyond >= 8 || E.maxBeyondAtr >= 1.0) &&
        (E.crossBack || E.rejecBodyAtr >= 0.35 || E.wickBeyondAtr >= 0.5) &&
        E.volLatePre < 0.5
      ) mark('Q2-L1-vLpre<0.5-SKIP', baitSafe(e.breakArah, e.entry, horizon))
      // Q3: T11-shaped dgn cN > 1.0 & momAl < 2.0
      if (
        E.closeNowAtr >= 1.0 && E.closesBeyond >= 6 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        wickExc <= 1.4 && E.rejecBodyAtr <= 1.0 &&
        E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.85 &&
        momAl < 2.0 && E.dirCons >= 0.30 &&
        fitur.distEma21Atr >= -0.5 && fitur.distEma21Atr <= 2.4
      ) mark('Q3-T11-cN>1-momAl<2 (blokir)', simF(fadeArah === 'NAIK' ? 'TURUN' : 'NAIK', e.entry, 1.8, horizon) === true ? false : true)
      // Q4: L8-shaped dgn vFpre >= 1.15 — WAIT outcome (tak menyala = aman?)
      if (
        E.closeNowAtr <= -1.2 && E.closesBeyond <= 6 && n - 1 - E.lastPierceIdx <= 6 &&
        -E.push7Atr >= 1.0 && E.volLate >= 0.75 &&
        (E.crossBack || E.rejecBodyAtr >= 0.4 || E.wickBeyondAtr >= 0.5) &&
        E.volFollowPre >= 1.15
      ) mark('Q4-L8-vFpre>=1.15-SKIP', baitSafe(e.breakArah, e.entry, horizon))
    }
  }
}
console.log('================ RINGKASAN r42o ================')
for (const k of Object.keys(tab).sort()) {
  const { w, l } = tab[k]
  console.log(`${k.padEnd(32)} n=${String(w + l).padStart(3)} AMAN/WIN=${String(w).padStart(3)} GAGAL/LOSE=${String(l).padStart(3)}`)
}
