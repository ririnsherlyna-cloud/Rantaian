// PROBE r42h — penyempurnaan 4 kandidat tersisa:
// (a) T1: fitur penuh pemenang vs jebakan di eff>=0.7
// (b) T2: veto vLpre < 0.9 utk #28
// (c) K7': micro-poke-fade dgn rej >= 0.5
// (d) K8': L4-veto dEma<=-0.8 & preT >= 6
// (e) T0-veto varian: utk kasus dgn bukti penolakan — hitung fallback fade
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import type { FboArah } from '../src/lib/exam/fbo-forge'
import type { Candle } from '../src/lib/exam/generator'

type Arah = FboArah
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)
function simF(arah: Arah, entry: number, stop: number, horizon: Candle[]): boolean {
  const led = simFboTrade({ aksi: 'ENTRY', arah, targetPct: 2.2, stopPct: stop }, entry, horizon)
  return (led.netPct ?? -1) > 0 && !led.stopHit
}
function stopFol(arah: Arah, entry: number, level: number, atr: number): number {
  const sp = arah === 'NAIK' ? level - 0.7 * atr : level + 0.7 * atr
  const pct = arah === 'NAIK' ? ((entry - sp) / entry) * 100 : ((sp - entry) / entry) * 100
  return Math.min(2.6, Math.max(0.8, pct))
}
function stopStruk(arah: Arah, entry: number, ev: FboBreakEvent, cs: Candle[], atr: number, mom12: number): number {
  const seg = cs.slice(Math.max(0, ev.lastPierceIdx - 12))
  const ext = ev.side === 'ATAS' ? Math.max(...seg.map((c) => c.h)) : Math.min(...seg.map((c) => c.l))
  const margin = Math.max(1.2, Math.min(3.0, Math.abs(mom12) * 0.45)) * atr
  const sp = arah === 'TURUN' ? ext + margin : ext - margin
  const pct = arah === 'TURUN' ? ((sp - entry) / entry) * 100 : ((entry - sp) / entry) * 100
  return Math.min(2.6, Math.max(0.8, pct))
}

let t1win = 0, t1lose = 0
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
      const E: FboBreakEvent | undefined = events[0]
      const mom50 = fitur.mom50Atr ?? 0
      const noE = !E || E.maxBeyondAtr < 0.25

      // (c) K7' micro-poke-fade rej >= 0.5
      if (noE && E) {
        const momAlign = E.side === 'ATAS' ? mom50 : -mom50
        if (E.maxBeyondAtr >= 0.10 && E.closeNowAtr < 0 && Math.abs(momAlign) <= 3.0 && E.rejecBodyAtr >= 0.5) {
          const fade: Arah = E.side === 'ATAS' ? 'TURUN' : 'NAIK'
          const stop = stopStruk(fade, e.entry, E, cs, atr, fitur.mom12Atr)
          const ok = simF(fade, e.entry, stop, horizon)
          console.log(`K7p ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} fade=${ok ? 'WIN' : 'LOSE'} maxB=${E.maxBeyondAtr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} momAl=${momAlign.toFixed(1)} rej=${E.rejecBodyAtr.toFixed(2)}`)
        }
      }
      if (noE) continue
      const umur = n - 1 - E.firstPierceIdx
      const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
      const momAl = E.side === 'ATAS' ? mom50 : -mom50
      const breakArah: Arah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
      const fadeArah: Arah = breakArah === 'NAIK' ? 'TURUN' : 'NAIK'
      const sf = stopFol(breakArah, e.entry, E.lvl.level, atr)

      // (a) T1 full — dump features for eff >= 0.7
      const t1fire =
        E.closeNowAtr >= 0.2 && E.volFollowPre >= 0.85 && E.volLatePre >= 0.72 &&
        E.closesBeyond >= 9 && umur <= 30 && momAl >= 2.8 && momAl <= 14 && E.volRatioBreak <= 2.2 &&
        E.effAtr <= 0.88 &&
        (E.volLate <= 1.15 || E.push7Atr <= 0.5) &&
        (E.dirCons >= 0.3 || momAl >= 6.0 || (E.push7Atr <= -0.5 && E.effAtr <= 0.1)) &&
        ((wickExc >= 0.6 && wickExc <= 2.2 && E.preTouches <= 4 && (momAl >= 3.2 || E.volFollowPre >= 1.05)) ||
         (wickExc < 0.6 && E.preTouches <= 4 && E.volFollowPre >= 0.9 && E.volRatioBreak <= 1.9))
      if (t1fire && E.effAtr >= 0.7) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        if (ok) t1win++; else t1lose++
        console.log(`T1hi ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} ok=${ok ? 1 : 0} | dir=${E.dirCons.toFixed(2)} eff=${E.effAtr.toFixed(2)} vL=${E.volLate.toFixed(2)} vLpre=${E.volLatePre.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)} p7=${E.push7Atr.toFixed(2)} lateM=${E.lateMoveAtr.toFixed(2)} earlyM=${E.earlyMoveAtr.toFixed(2)} mom12=${fitur.mom12Atr.toFixed(2)} dEma=${fitur.distEma21Atr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} umur=${umur} cN=${E.closeNowAtr.toFixed(2)} momAl=${momAl.toFixed(1)} wExc=${wickExc.toFixed(2)}`)
      }

      // (b) T2 vLpre veto
      if (
        E.closeNowAtr >= 3.2 && E.closesBeyond >= 26 && umur >= 24 && umur <= 34 &&
        E.volFollowPre >= 0.9 && E.volLatePre >= 0.72 &&
        E.volRatioBreak <= 2.45 && momAl >= 3.2 && momAl <= 11.5 && wickExc <= 1.2 &&
        E.volLate <= 1.25 && E.volLatePre < 0.9
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        console.log(`T2vlp ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 'WIN' : 'LOSE'} vLpre=${E.volLatePre.toFixed(2)} eff=${E.effAtr.toFixed(2)} dir=${E.dirCons.toFixed(2)} lateM=${E.lateMoveAtr.toFixed(2)} earlyM=${E.earlyMoveAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)}`)
      }

      // (d) K8' L4-veto dEma<=-0.8 & preT >= 6
      if (
        n - E.firstPierceIdx >= 10 && E.closesBeyond >= 2 && E.closeNowAtr >= 0.25 &&
        E.closeNowAtr <= 3.0 && E.preTouches >= 6 &&
        E.volFollowPre >= 1.0 && E.volLatePre >= 0.7 &&
        E.effAtr >= 0.25 && E.push7Atr >= 0.85 && E.dirCons >= 0.6 &&
        E.wickBeyondAtr <= 0.9 && E.maxBeyondAtr >= 0.5 &&
        fitur.distEma21Atr < -0.8 && fitur.distEma21Atr >= -2.4
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        console.log(`K8p ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${ok ? 'WIN' : 'LOSE'} dEma=${fitur.distEma21Atr.toFixed(2)} preT=${E.preTouches} cN=${E.closeNowAtr.toFixed(2)}`)
      }

      // (e) T0-veto: kasus T0-shape dgn bukti penolakan — follow vs fade vs fallback NT
      const t0shape =
        ((E.closeNowAtr >= -0.9 && E.closeNowAtr < 0) ||
         (momAl >= 6.5 && momAl < 14 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0) ||
         (momAl >= 3.5 && momAl < 6.5 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 && E.volFollow <= 0.92 && E.volLate <= 0.88)) &&
        E.closesBeyond >= 3 && momAl >= 2.0 && momAl <= 14 && E.volFollow >= 0.7 &&
        E.maxBeyondAtr <= 2.6 && !E.climax && umur <= 14 &&
        (E.wickBeyondAtr >= 0.9 || (E.crossBack && E.rejecBodyAtr >= 0.5))
      if (t0shape) {
        const okF = simF(breakArah, e.entry, sf, horizon)
        const ledFade = simFboTrade({ aksi: 'ENTRY', arah: fadeArah, targetPct: 2.2, stopPct: stopStruk(fadeArah, e.entry, E, cs, atr, fitur.mom12Atr) }, e.entry, horizon)
        const okFade = (ledFade.netPct ?? -1) > 0 && !ledFade.stopHit
        // fallback no-trade: bait-safety
        const bait = simBaitFbo(e.breakArah, e.entry, horizon)
        const amanNT = bait.stopHit || (bait.netPct ?? 0) <= 0
        console.log(`T0v ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} follow=${okF ? 1 : 0} fade=${okFade ? 1 : 0} amanNT=${amanNT ? 1 : 0} | wick=${E.wickBeyondAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} xB=${E.crossBack ? 1 : 0} cN=${E.closeNowAtr.toFixed(2)} momAl=${momAl.toFixed(1)} cOut=${E.closesBeyond} umur=${umur} dEma=${fitur.distEma21Atr.toFixed(2)} vF=${E.volFollow.toFixed(2)} vL=${E.volLate.toFixed(2)}`)
      }
    }
  }
}
console.log(`\nT1hi total: WIN=${t1win} LOSE=${t1lose}`)
