// PROBE r42b — per-case dumps utk menemukan pemisah presisi:
// 1) C5 steady-accept: fitur per fam (pemisah guard-winner vs FBO-trap)
// 2) Trace pipeline nyata: kasus yang SAMPAI ke FB-L1 (menang vs kalah)
// 3) #123 SKIP-fallback: fitur lengkap
// 4) C2 T9: fitur vL/dir per firing
// 5) #40/#44: kedalaman re-break nyata di horizon
//   bun scripts/probe_r42b.ts
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, scanRetestOfBroken, fbVonis, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

type Arah = 'NAIK' | 'TURUN'
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)

function outcomeOf(plan: ReturnType<typeof fbVonis>, entry: number, horizon: import("../src/lib/exam/generator").Candle[], breakArah: Arah): string {
  const led = simFboTrade({ aksi: plan.aksi, arah: plan.arah, targetPct: plan.targetPct, stopPct: plan.stopPct, triggerLevel: plan.triggerLevel }, entry, horizon)
  if (led.mode === 'NO-TRADE') {
    const bait = simBaitFbo(breakArah, entry, horizon)
    return bait.stopHit || (bait.netPct ?? 0) <= 0 ? 'AMAN-NT' : 'RUGI-NT'
  }
  return (led.netPct ?? -1) > 0 && !led.stopHit ? 'MENANG' : 'KALAH'
}

let sec = ''
function h(s: string): void { if (sec !== s) { console.log(`\n======== ${s} ========`); sec = s } }

for (const ns of seeds) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const n = cs.length
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const levels = buildFboLevels(cs)
      const events = scanBreakEvents(cs, levels, fitur.volMean, atr)
      const fbr = scanRetestOfBroken(cs, levels, atr)
      const E = events[0] ?? null
      const mom50 = fitur.mom50Atr ?? 0
      const breakArah: Arah = E ? (E.side === 'ATAS' ? 'NAIK' : 'TURUN') : e.breakArah
      const fadeArah: Arah = breakArah === 'NAIK' ? 'TURUN' : 'NAIK'
      const momAl = E ? (E.side === 'ATAS' ? mom50 : -mom50) : 0
      const k = fbVonis(cs, '1.32')
      const out = outcomeOf(k, e.entry, horizon, e.breakArah)
      const pel = (k.pelajaranAktif ?? []).join('+')

      // ---- (1) C5 steady-accept per-case ----
      if (E) {
        const umur = n - 1 - E.firstPierceIdx
        const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
        if (
          E.closeNowAtr >= 0.05 && E.closesBeyond >= 8 && !E.crossBack &&
          E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
          wickExc <= 1.4 && E.rejecBodyAtr <= 1.0 && E.volRatioBreak <= 2.2
        ) {
          h('C5-PER-CASE')
          // hipotesis: ENTRY follow-break dgn stop di balik level
          const stopF = breakArah === 'NAIK' ? Math.min(2.6, Math.max(0.8, ((e.entry - (E.lvl.level - 0.7 * atr)) / e.entry) * 100)) : Math.min(2.6, Math.max(0.8, (((E.lvl.level + 0.7 * atr) - e.entry) / e.entry) * 100))
          const ledF = simFboTrade({ aksi: 'ENTRY', arah: breakArah, targetPct: 2.2, stopPct: stopF }, e.entry, horizon)
          const flw = ledF.mode === 'NO-TRADE' ? 'NT' : (ledF.netPct ?? -1) > 0 && !ledF.stopHit ? 'WIN' : 'LOSE'
          console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} out=${out} flw=${flw} | cN=${E.closeNowAtr.toFixed(2)} cOut=${E.closesBeyond} umur=${umur} maxB=${E.maxBeyondAtr.toFixed(2)} wExc=${wickExc.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} vBrk=${E.volRatioBreak.toFixed(2)} vF=${E.volFollow.toFixed(2)} vL=${E.volLate.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)} vLpre=${E.volLatePre.toFixed(2)} p7=${E.push7Atr.toFixed(2)} dir=${E.dirCons.toFixed(2)} eff=${E.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)} dEma=${fitur.distEma21Atr.toFixed(2)} mom12=${fitur.mom12Atr.toFixed(2)} preT=${E.preTouches} | pip=${pel}`)
        }
      }

      // ---- (2) pipeline nyata: FB-L1 reached ----
      if (pel.startsWith('FB-L1') || pel.includes('+FB-L1') || pel === 'FB-L1') {
        h('PIPELINE-FB-L1')
        if (out === 'KALAH' || guards) {
          if (E) {
            const umur = n - 1 - E.firstPierceIdx
            const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)
            console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} out=${out} aksi=${k.aksi}/${k.arah} | cN=${E.closeNowAtr.toFixed(2)} cOut=${E.closesBeyond} umur=${umur} lastP=${n - 1 - E.lastPierceIdx} maxB=${E.maxBeyondAtr.toFixed(2)} wExc=${wickExc.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} vBrk=${E.volRatioBreak.toFixed(2)} vF=${E.volFollow.toFixed(2)} vL=${E.volLate.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)} vLpre=${E.volLatePre.toFixed(2)} p7=${E.push7Atr.toFixed(2)} dir=${E.dirCons.toFixed(2)} eff=${E.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)} preT=${E.preTouches} xB=${E.crossBack ? 1 : 0}`)
          }
        }
      }

      // ---- (3) #123 SKIP-fallback & semua SKIP dgn event ----
      if (pel.startsWith('FB-L9') && out !== 'MENANG' && E) {
        h('SKIP-DGN-EVENT')
        const umur = n - 1 - E.firstPierceIdx
        console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} out=${out} | cN=${E.closeNowAtr.toFixed(2)} cOut=${E.closesBeyond} umur=${umur} lastP=${n - 1 - E.lastPierceIdx} maxB=${E.maxBeyondAtr.toFixed(2)} vF=${E.volFollow.toFixed(2)} vL=${E.volLate.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)} vLpre=${E.volLatePre.toFixed(2)} p7=${E.push7Atr.toFixed(2)} dir=${E.dirCons.toFixed(2)} eff=${E.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)} preT=${E.preTouches} rej=${E.rejecBodyAtr.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} dEma=${fitur.distEma21Atr.toFixed(2)}`)
      }

      // ---- (4) T9 firings (pipeline) utk vL/dir ----
      if (pel.startsWith('FB-T9')) {
        h('PIPELINE-T9')
        if (E) console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam} out=${out} vL=${E.volLate.toFixed(2)} dir=${E.dirCons.toFixed(2)} vF=${E.volFollow.toFixed(2)} vFpre=${E.volFollowPre.toFixed(2)} vLpre=${E.volLatePre.toFixed(2)} p7=${E.push7Atr.toFixed(2)} eff=${E.effAtr.toFixed(2)} cN=${E.closeNowAtr.toFixed(2)}`)
      }

      // ---- (5) #40/#44-like: FB-R pipeline + re-break depth nyata ----
      if (pel.startsWith('FB-R ') || pel.startsWith('FB-R+') || pel === 'FB-R' || (k.triggerLevel !== undefined && pel.startsWith('FB-R'))) {
        h('PIPELINE-FB-R')
        const L = k.level
        // kedalaman re-break: dalam 8 candle horizon, seberapa dalam close menembus trigger searah rencana?
        let deep = -99
        for (let i = 0; i < Math.min(8, horizon.length); i++) {
          const c = horizon[i].c
          const d = k.arah === 'NAIK' ? (c - (L?.level ?? 0)) / atr : ((L?.level ?? 0) - c) / atr
          if (k.arah === 'NAIK' ? c >= (k.triggerLevel ?? 0) : c <= (k.triggerLevel ?? 0)) deep = Math.max(deep, d)
        }
        console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} out=${out} aksi=${k.aksi}/${k.arah} trig=${k.triggerLevel?.toFixed(2)} lvl=${L?.level.toFixed(2)} deepTrig=${deep.toFixed(2)}ATR fbrHist=${fbr ? `${fbr.histCloses}c/${fbr.histDepth.toFixed(2)}` : '-'} momAl=${momAl.toFixed(1)} dEma=${fitur.distEma21Atr.toFixed(2)} vL=${E?.volLate.toFixed(2)} dir=${E?.dirCons.toFixed(2)}`)
      }
    }
  }
}
