// PROBE r42g — uji 10 kandidat perbaikan utk 20 kegagalan warisan
// (fbo1300-1500) secara STANDALONE di 18 seed. Setiap kandidat:
// tembakan WIN/LOSE + daftar kasus utk gerbang kecil.
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
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

const tab: Record<string, { w: number; l: number }> = {}
function mark(k: string, ok: boolean): void {
  tab[k] = tab[k] ?? { w: 0, l: 0 }
  if (ok) tab[k].w++
  else tab[k].l++
}

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

      // ===== K6: no-E branch — T0n-ext (|mom50| >= 1.8) =====
      if (noE) {
        const fbrE = false
        if (!fbrE) {
          if (Math.abs(mom50) >= 1.8 && Math.abs(mom50) < 2.5 && Math.abs(fitur.distEma21Atr) <= 2.4) {
            const arah: Arah = mom50 > 0 ? 'NAIK' : 'TURUN'
            mark('K6-T0n-ext(1.8-2.5)', simF(arah, e.entry, 1.8, horizon))
            if (tab['K6-T0n-ext(1.8-2.5)']!.w + tab['K6-T0n-ext(1.8-2.5)']!.l <= 30) console.log(`K6 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} mom50=${mom50.toFixed(1)} mom12=${fitur.mom12Atr.toFixed(2)} dEma=${fitur.distEma21Atr.toFixed(2)} arah=${arah}`)
          }
          // K6b: mom50 flat -> ikuti mom12
          if (Math.abs(mom50) < 2.5 && Math.abs(fitur.mom12Atr) >= 1.2 && Math.abs(fitur.distEma21Atr) <= 1.2) {
            const arah: Arah = fitur.mom12Atr > 0 ? 'NAIK' : 'TURUN'
            mark('K6b-follow-mom12', simF(arah, e.entry, 1.8, horizon))
            if (tab['K6b-follow-mom12']!.w + tab['K6b-follow-mom12']!.l <= 30) console.log(`K6b ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} mom50=${mom50.toFixed(1)} mom12=${fitur.mom12Atr.toFixed(2)} dEma=${fitur.distEma21Atr.toFixed(2)} arah=${arah}`)
          }
        }
      }

      // ===== K7: micro-poke fade (no-E branch, event kecil ada) =====
      if (noE && E) {
        const momAlign = E.side === 'ATAS' ? mom50 : -mom50
        if (
          E.maxBeyondAtr >= 0.10 && E.closeNowAtr < 0 && Math.abs(momAlign) <= 3.0 &&
          (E.rejecBodyAtr >= 0.4 || E.wickBeyondAtr >= 0.35)
        ) {
          const fade: Arah = E.side === 'ATAS' ? 'TURUN' : 'NAIK'
          const ext = E.side === 'ATAS' ? Math.max(...cs.slice(Math.max(0, E.lastPierceIdx - 12)).map((c) => c.h)) : Math.min(...cs.slice(Math.max(0, E.lastPierceIdx - 12)).map((c) => c.l))
          const margin = Math.max(1.2, Math.min(3.0, Math.abs(fitur.mom12Atr) * 0.45)) * atr
          const stopP = fade === 'TURUN' ? ext + margin : ext - margin
          const stop = Math.min(2.6, Math.max(0.8, fade === 'TURUN' ? ((stopP - e.entry) / e.entry) * 100 : ((e.entry - stopP) / e.entry) * 100))
          mark('K7-micro-poke-fade', simF(fade, e.entry, stop, horizon))
          if (tab['K7-micro-poke-fade']!.w + tab['K7-micro-poke-fade']!.l <= 30) console.log(`K7 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} maxB=${E.maxBeyondAtr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} momAl=${momAlign.toFixed(1)} rej=${E.rejecBodyAtr.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} fade=${fade}`)
        }
      }
      if (noE) continue

      // fitur turunan
      const umur = n - 1 - E.firstPierceIdx
      const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
      const momAl = E.side === 'ATAS' ? mom50 : -mom50
      const breakArah: Arah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
      const fadeArah: Arah = breakArah === 'NAIK' ? 'TURUN' : 'NAIK'
      const sf = stopFol(breakArah, e.entry, E.lvl.level, atr)

      // ===== K1: T1 split by eff =====
      if (
        E.closeNowAtr >= 0.2 && E.volFollowPre >= 0.85 && E.volLatePre >= 0.72 &&
        E.closesBeyond >= 9 && umur <= 30 && momAl >= 2.8 && momAl <= 14 && E.volRatioBreak <= 2.2 &&
        E.effAtr <= 0.88 &&
        (E.volLate <= 1.15 || E.push7Atr <= 0.5) &&
        (E.dirCons >= 0.3 || momAl >= 6.0 || (E.push7Atr <= -0.5 && E.effAtr <= 0.1)) &&
        ((wickExc >= 0.6 && wickExc <= 2.2 && E.preTouches <= 4 && (momAl >= 3.2 || E.volFollowPre >= 1.05)) ||
         (wickExc < 0.6 && E.preTouches <= 4 && E.volFollowPre >= 0.9 && E.volRatioBreak <= 1.9))
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        if (E.effAtr >= 0.7) { mark('K1-T1-eff>=0.7', ok); if (tab['K1-T1-eff>=0.7']!.w + tab['K1-T1-eff>=0.7']!.l <= 25) console.log(`K1hi ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} eff=${E.effAtr.toFixed(2)} ok=${ok ? 1 : 0}`) }
        else if (E.effAtr >= 0.5) mark('K1-T1-eff[0.5,0.7)', ok)
        else mark('K1-T1-eff<0.5', ok)
      }

      // ===== K2: T2 veto (eff>=0.7 & rej<=0.6) + extend umur<=42 =====
      if (
        E.closeNowAtr >= 3.2 && E.closesBeyond >= 26 && umur >= 24 && umur <= 42 &&
        E.volFollowPre >= 0.9 && E.volLatePre >= 0.72 &&
        E.volRatioBreak <= 2.45 && momAl >= 3.2 && momAl <= 11.5 && wickExc <= 1.2 &&
        E.volLate <= 1.25
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        const veto = E.effAtr >= 0.7 && E.rejecBodyAtr <= 0.6
        if (umur <= 34) mark('K2-T2-dasar', ok)
        else mark('K2-T2-umur[34,42]', ok)
        if (veto) { mark('K2-T2-VETO(eff>=.7,rej<=.6)', ok); if (tab['K2-T2-VETO(eff>=.7,rej<=.6)']!.w + tab['K2-T2-VETO(eff>=.7,rej<=.6)']!.l <= 25) console.log(`K2veto ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} eff=${E.effAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} umur=${umur} ok=${ok ? 1 : 0}`) }
      }

      // ===== K3: T5 extend wickExc <= 3.6 =====
      if (
        umur >= 24 && E.closesBeyond >= 30 && E.volFollowPre >= 1.0 &&
        E.closeNowAtr >= 0.2 && E.closeNowAtr <= 3.2 &&
        Math.abs(fitur.distEma21Atr) <= 2.4 && !E.climax &&
        wickExc > 3.0 && wickExc <= 3.6 && E.volRatioBreak <= 2.45 && E.push7Atr >= 0
      ) {
        mark('K3-T5-wExc[3.0,3.6]', simF(breakArah, e.entry, sf, horizon))
        console.log(`K3 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} wExc=${wickExc.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} umur=${umur}`)
      }

      // ===== K4: T9 relax (eff 0.4-0.6 atau p7 0.45-0.5) =====
      if (
        umur >= 12 && umur <= 24 && E.closesBeyond >= 14 &&
        E.closeNowAtr >= 1.0 && E.closeNowAtr <= 5.5 &&
        E.dirCons >= 0.6 && E.volRatioBreak <= 2.1 &&
        E.volFollow >= 0.9 && E.volFollow <= 1.2 && E.volLate >= 0.90 &&
        E.volLatePre >= 0.85 &&
        wickExc <= 0.6 && E.push7Atr >= 0.45 && momAl >= 5.0 && momAl <= 14 &&
        (E.effAtr >= 0.4 && E.effAtr < 0.6 || (E.push7Atr >= 0.45 && E.push7Atr < 0.5 && E.effAtr >= 0.6))
      ) {
        mark('K4-T9-relax', simF(breakArah, e.entry, sf, horizon))
        console.log(`K4 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} eff=${E.effAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)} momAl=${momAl.toFixed(1)} dEma=${fitur.distEma21Atr.toFixed(2)}`)
      }

      // ===== K5: T11 relax (vFpre 0.80-0.85 atau dEma [2.4,2.6]) =====
      if (
        E.closeNowAtr >= 0.05 && E.closesBeyond >= 8 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        wickExc <= 1.4 && E.rejecBodyAtr <= 1.0 &&
        E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.80 &&
        momAl <= 14 && fitur.distEma21Atr >= -0.5 && fitur.distEma21Atr <= 2.6
      ) {
        const ok = simF(breakArah, e.entry, sf, horizon)
        const baru = E.volFollowPre < 0.85 || fitur.distEma21Atr > 2.4
        if (baru) { mark('K5-T11-relax-baru', ok); if (tab['K5-T11-relax-baru']!.w + tab['K5-T11-relax-baru']!.l <= 25) console.log(`K5 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} vFpre=${E.volFollowPre.toFixed(2)} dEma=${fitur.distEma21Atr.toFixed(2)} ok=${ok ? 1 : 0}`) }
      }

      // ===== K8: L4 veto dEma <= -0.8 =====
      if (
        n - E.firstPierceIdx >= 10 && E.closesBeyond >= 2 && E.closeNowAtr >= 0.25 &&
        E.closeNowAtr <= 3.0 && E.preTouches >= 1 &&
        E.volFollowPre >= 1.0 && E.volLatePre >= 0.7 &&
        E.effAtr >= 0.25 && E.push7Atr >= 0.85 && E.dirCons >= 0.6 &&
        E.wickBeyondAtr <= 0.9 && E.maxBeyondAtr >= 0.5 &&
        fitur.distEma21Atr < -0.8 && fitur.distEma21Atr >= -2.4
      ) {
        mark('K8-L4-dEma[-2.4,-0.8)', simF(breakArah, e.entry, sf, horizon))
        console.log(`K8 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} dEma=${fitur.distEma21Atr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)} preT=${E.preTouches}`)
      }

      // ===== K9: T0 rejection-veto (wick>=0.9 || rej>=0.9) =====
      if (
        ((E.closeNowAtr >= -0.9 && E.closeNowAtr < 0) ||
         (momAl >= 6.5 && momAl < 14 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0) ||
         (momAl >= 3.5 && momAl < 6.5 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 && E.volFollow <= 0.92 && E.volLate <= 0.88)) &&
        E.closesBeyond >= 3 && momAl >= 2.0 && momAl <= 14 && E.volFollow >= 0.7 &&
        E.maxBeyondAtr <= 2.6 && !E.climax && umur <= 14 &&
        (E.wickBeyondAtr >= 0.9 || E.rejecBodyAtr >= 0.9)
      ) {
        mark('K9-T0-reject-veto', simF(breakArah, e.entry, sf, horizon))
        console.log(`K9 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} wick=${E.wickBeyondAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} momAl=${momAl.toFixed(1)} cN=${E.closeNowAtr.toFixed(2)}`)
      }

      // ===== K10: fresh-attack follow (g-retest-hold #111/117) =====
      if (
        umur <= 4 && E.closesBeyond <= 2 && E.closeNowAtr >= 0.0 && E.closeNowAtr <= 1.5 &&
        E.maxBeyondAtr >= 0.5 && E.push7Atr >= 1.0 && E.volFollow >= 1.2 &&
        E.dirCons >= 0.6 && E.preTouches >= 2 && E.wickBeyondAtr <= 0.5 &&
        E.volRatioBreak <= 1.9 && Math.abs(momAl) <= 3.0 && E.effAtr <= 0.85
      ) {
        mark('K10-fresh-attack', simF(breakArah, e.entry, sf, horizon))
        console.log(`K10 ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} truth=${e.truth} umur=${umur} cN=${E.closeNowAtr.toFixed(2)} p7=${E.push7Atr.toFixed(2)} vF=${E.volFollow.toFixed(2)} dir=${E.dirCons.toFixed(2)} eff=${E.effAtr.toFixed(2)}`)
      }
    }
  }
}

console.log('\n================ RINGKASAN ================')
for (const k of Object.keys(tab).sort()) {
  const { w, l } = tab[k]
  console.log(`${k.padEnd(30)} n=${String(w + l).padStart(3)} WIN=${String(w).padStart(3)} LOSE=${String(l).padStart(3)} | ${(w + l) ? ((w / (w + l)) * 100).toFixed(1) + '%' : '-'}`)
}
