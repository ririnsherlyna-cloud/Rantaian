// PROBE r42 — kalibrasi kandidat perbaikan utk 11 residu hakim segel
// (fbo1600-1800). Setiap kandidat aturan disimulasikan di SEMUA 18 seed
// (FBO+GUARD) dan diukur: menang/kalah/no-trade-aman per kind & family.
//   bun scripts/probe_r42.ts
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE, type FboPlan, type FboLedger } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, scanRetestOfBroken, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import type { Candle } from '../src/lib/exam/generator'

type Arah = 'NAIK' | 'TURUN'

interface Ctx {
  ns: string; kind: string; fam: string; diff: string; num: number
  truth: Arah; breakArah: Arah
  cs: Candle[]; horizon: Candle[]; entry: number
  fitur: ReturnType<typeof buildSgVision>; atr: number
  E: FboBreakEvent | null; ev2: FboBreakEvent | null
  fbr: ReturnType<typeof scanRetestOfBroken>
  mom50: number; mom12: number; dEma: number
}

function simPlan(c: Ctx, plan: FboPlan): { hasil: 'MENANG' | 'KALAH' | 'AMAN-NOTRADE' | 'RUGI-NOTRADE'; net: number } {
  const led: FboLedger = simFboTrade(plan, c.entry, c.horizon)
  if (led.mode === 'NO-TRADE') {
    const bait = simBaitFbo(c.breakArah, c.entry, c.horizon)
    const aman = bait.stopHit || (bait.netPct ?? 0) <= 0
    return { hasil: aman ? 'AMAN-NOTRADE' : 'RUGI-NOTRADE', net: bait.netPct ?? 0 }
  }
  const win = (led.netPct ?? -1) > 0 && !led.stopHit
  return { hasil: win ? 'MENANG' : 'KALAH', net: led.netPct ?? 0 }
}

function planEntry(arah: Arah, stopPct: number): FboPlan {
  return { aksi: 'ENTRY', arah, targetPct: 2.2, stopPct }
}
function planWait(arah: Arah, trig: number, stopPct = 1.8): FboPlan {
  return { aksi: 'WAIT', arah, targetPct: 2.2, stopPct, triggerLevel: trig }
}

function stopFollowPx(arah: Arah, entry: number, level: number, atr: number): number {
  const stopPrice = arah === 'NAIK' ? level - 0.7 * atr : level + 0.7 * atr
  const pct = arah === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100
  return Math.min(2.6, Math.max(0.8, pct))
}
function extremeOf(c: Ctx, ev: FboBreakEvent): number {
  const seg = c.cs.slice(Math.max(0, ev.lastPierceIdx - 12))
  return ev.side === 'ATAS' ? Math.max(...seg.map((x) => x.h)) : Math.min(...seg.map((x) => x.l))
}
function stopStrukPx(c: Ctx, arah: Arah, ev: FboBreakEvent): number {
  const entry = c.entry
  const extreme = extremeOf(c, ev)
  const margin = Math.max(1.2, Math.min(3.0, Math.abs(c.mom12) * 0.45)) * c.atr
  const stopPrice = arah === 'TURUN' ? extreme + margin : extreme - margin
  const pct = arah === 'TURUN' ? ((stopPrice - entry) / entry) * 100 : ((entry - stopPrice) / entry) * 100
  return Math.min(2.6, Math.max(0.8, pct))
}

const T = new Map<string, { n: number; win: number; lose: number; aman: number; rugi: number }>()
function tab(key: string, r: { hasil: string }): void {
  const b = T.get(key) ?? { n: 0, win: 0, lose: 0, aman: 0, rugi: 0 }
  b.n++
  if (r.hasil === 'MENANG') b.win++
  else if (r.hasil === 'KALAH') b.lose++
  else if (r.hasil === 'AMAN-NOTRADE') b.aman++
  else b.rugi++
  T.set(key, b)
}

const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)

for (const ns of seeds) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const levels = buildFboLevels(cs)
      const events = scanBreakEvents(cs, levels, fitur.volMean, atr)
      const fbr = scanRetestOfBroken(cs, levels, atr)
      const c: Ctx = {
        ns, kind: guards ? 'GUARD' : 'FBO', fam: e.fam, diff: e.diff, num: e.num,
        truth: e.truth, breakArah: e.breakArah, cs, horizon, entry: e.entry,
        fitur, atr, E: events[0] ?? null, ev2: events[1] ?? null, fbr,
        mom50: fitur.mom50Atr ?? 0, mom12: fitur.mom12Atr, dEma: fitur.distEma21Atr,
      }
      const n = cs.length
      const E = c.E
      const breakArah = E ? (E.side === 'ATAS' ? 'NAIK' : 'TURUN') : c.breakArah
      const fadeArah: Arah = breakArah === 'NAIK' ? 'TURUN' : 'NAIK'
      const momAl = E ? (E.side === 'ATAS' ? c.mom50 : -c.mom50) : 0

      // ---------- C1: no-E parabola (T0n dgn |mom50| > 14) ----------
      if (!E || E.maxBeyondAtr < 0.25) {
        if (!fbr && Math.abs(c.mom50) >= 2.5 && Math.abs(c.dEma) <= 2.4 && Math.abs(c.mom50) > 14) {
          tab('C1-T0n-parabola SKIP', simPlan(c, { aksi: 'SKIP', arah: 'NAIK', targetPct: 2.2, stopPct: 1.8 }))
          // WAIT fade-reversal: trigger = ekstrem 3 candle + 0.35 ATR searah fade
          const seg3 = cs.slice(Math.max(0, n - 3))
          const trigFade = fadeArah === 'NAIK' ? Math.max(...seg3.map((x) => x.h)) + 0.35 * atr : Math.min(...seg3.map((x) => x.l)) - 0.35 * atr
          tab('C1-T0n-parabola WAIT-fade-rev', simPlan(c, planWait(fadeArah, trigFade)))
          // WAIT searah break (kelanjutan setelah jeda)
          const trigBrk = breakArah === 'NAIK' ? Math.max(...seg3.map((x) => x.h)) + 0.35 * atr : Math.min(...seg3.map((x) => x.l)) - 0.35 * atr
          tab('C1-T0n-parabola WAIT-break', simPlan(c, planWait(breakArah, trigBrk)))
        }
        continue // sisa kandidat butuh E
      }
      const umur = n - 1 - E.firstPierceIdx
      const wickExc = E.maxBeyondAtr - Math.max(0, E.closeNowAtr)

      // ---------- C2: T9 split by vL & dir ----------
      if (
        umur >= 12 && umur <= 24 && E.closesBeyond >= 14 &&
        E.closeNowAtr >= 1.0 && E.closeNowAtr <= 5.5 &&
        E.dirCons >= 0.6 && E.effAtr >= 0.6 && E.volRatioBreak <= 2.1 &&
        E.volFollow >= 0.9 && E.volFollow <= 1.2 && E.volLate >= 0.85 &&
        wickExc <= 0.6 && E.push7Atr >= 0.5 && momAl >= 5.0 && momAl <= 14
      ) {
        const r = simPlan(c, planEntry(breakArah, stopFollowPx(breakArah, c.entry, E.lvl.level, atr)))
        tab(`C2-T9 vL>=0.95`, r) // placeholder both; split below
        if (E.volLate >= 0.95 && E.dirCons >= 0.68) tab('C2-T9-KETAT(vL>=.95,dir>=.68)', r)
        else tab('C2-T9-LONGGAR(sisa)', r)
        tab(`C2-T9 kind=${c.kind}`, r)
      }

      // ---------- C3: FB-L1 vetoes ----------
      const acceptanceKuat = E.closesBeyond >= 8 && E.volFollow >= 0.9
      const buktiKuat = E.closeNowAtr <= -0.5 && E.rejecBodyAtr >= 0.5
      const momAlignL1 = E.side === 'ATAS' ? c.mom50 : -c.mom50
      if (
        E.closeNowAtr <= -0.15 && E.closeNowAtr >= -3.2 && E.maxBeyondAtr >= 0.25 && n - 1 - E.lastPierceIdx <= 11 &&
        E.volRatioBreak >= 0.9 &&
        (E.closesBeyond >= 8 || E.maxBeyondAtr >= 1.0) &&
        (E.crossBack || E.rejecBodyAtr >= 0.35 || E.wickBeyondAtr >= 0.5) &&
        (!acceptanceKuat || buktiKuat) &&
        momAlignL1 <= 6.5
      ) {
        const rFade = simPlan(c, planEntry(fadeArah, stopStrukPx(c, fadeArah, E)))
        const rFollow = simPlan(c, planEntry(breakArah, stopFollowPx(breakArah, c.entry, E.lvl.level, atr)))
        tab('C3-L1-SEMUA fade', rFade)
        tab('C3-L1-SEMUA follow', rFollow)
        if (E.closesBeyond >= 20 && E.volLate >= 1.0) {
          tab('C3-L1-VETO-aksep-mapan(vL naik) fade', rFade)
          tab('C3-L1-VETO-aksep-mapan(vL naik) follow', rFollow)
        } else tab('C3-L1-TANPA-VETO fade', rFade)
        if (umur <= 3 && E.preTouches <= 1) {
          tab('C3-L1-VETO-fresh-preT1 fade', rFade)
          tab('C3-L1-VETO-fresh-preT1 follow', rFollow)
        }
        tab(`C3-L1 kind=${c.kind} fade`, rFade)
      }

      // ---------- C4: FB-R trigger depth ----------
      if (fbr) {
        const Lr = fbr.lvl
        for (const dep of [0.18, 0.4, 0.6, 0.9]) {
          const trigR = fbr.brkArah === 'NAIK' ? Lr.level + dep * atr : Lr.level - dep * atr
          tab(`C4-FBR dep=${dep}`, simPlan(c, planWait(fbr.brkArah, trigR)))
        }
        tab(`C4-FBR kind=${c.kind} dep=0.6`, simPlan(c, planWait(fbr.brkArah, fbr.brkArah === 'NAIK' ? Lr.level + 0.6 * atr : Lr.level - 0.6 * atr)))
      }

      // ---------- C5: T11 steady-accept kandidat ----------
      if (
        E.closeNowAtr >= 0.05 && E.closesBeyond >= 8 && !E.crossBack &&
        E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
        wickExc <= 1.4 && E.rejecBodyAtr <= 1.0 && E.volRatioBreak <= 2.2
      ) {
        const r = simPlan(c, planEntry(breakArah, stopFollowPx(breakArah, c.entry, E.lvl.level, atr)))
        tab(`C5-T11 dasar kind=${c.kind}`, r)
        tab(`C5-T11 dasar fam=${c.fam}`, r)
        if (E.dirCons >= 0.55 && umur >= 8) tab('C5-T11 +dir.55+umur8 kind=' + c.kind, r)
        if (E.dirCons >= 0.55 && umur >= 8 && E.volLatePre >= 0.85) tab('C5-T11 +vLpre.85 kind=' + c.kind, r)
        if (E.dirCons >= 0.55 && umur >= 8 && E.volLatePre >= 0.85 && E.wickBeyondAtr <= 0.5) tab('C5-T11 +wick.5 kind=' + c.kind, r)
      }

      // ---------- C6: FB-T0 perluasan ----------
      const momAlign0 = E.side === 'ATAS' ? c.mom50 : -c.mom50
      // (a) dip dalam dgn momAlign moderat
      if (
        E.closeNowAtr >= -1.6 && E.closeNowAtr < -0.9 && momAlign0 >= 2.0 && momAlign0 <= 14 &&
        E.closesBeyond >= 3 && E.volFollow >= 0.7 && E.maxBeyondAtr <= 2.6 && !E.climax &&
        n - 1 - E.firstPierceIdx <= 14
      ) {
        tab(`C6a-T0-dipdalam momAl[${momAlign0.toFixed(1)}] kind=${c.kind}`, simPlan(c, planEntry(breakArah, stopFollowPx(breakArah, c.entry, E.lvl.level, atr))))
      }
      // (b) tusuk-tiny cOut=0 dlm tren kuat
      if (
        E.maxBeyondAtr <= 0.7 && E.closeNowAtr >= -1.0 && E.closeNowAtr < 0 &&
        momAlign0 >= 3.2 && E.volFollow >= 0.9 && E.preTouches >= 2 && !E.climax
      ) {
        tab(`C6b-T0-tinypoke kind=${c.kind}`, simPlan(c, planEntry(breakArah, stopFollowPx(breakArah, c.entry, E.lvl.level, atr))))
      }
    }
  }
}

console.log('================ HASIL PROBE r42 (18 seed = 2232 ujian) ================')
const keys = [...T.keys()].sort()
for (const k of keys) {
  const b = T.get(k)!
  const tot = b.n
  const score = b.win + b.aman
  console.log(`${k.padEnd(52)} n=${String(tot).padStart(3)} MENANG=${String(b.win).padStart(3)} KALAH=${String(b.lose).padStart(2)} amanNT=${String(b.aman).padStart(3)} rugiNT=${b.rugi} | skor ${((score / tot) * 100).toFixed(1)}%`)
}
