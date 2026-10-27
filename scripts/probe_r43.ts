// ============================================================
// PROBE R43 — bedah fitur 20 residu v1.36d + kontrol lulus.
// Dump fitur event terpilih per kasus utk menemukan pembeda
// UMUM (bukan patch per-kasus).
// Pakai: bun scripts/probe_r43.ts --kasus r43-baseline.json
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { scanBreakEvents, buildFboLevels, fbVonis, FBO_BRAIN_VERSI, type FboBreakEvent, type FboLevel } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { readFileSync } from 'fs'

interface Residu { ns: string; num: number; fam: string; diff: string; kind: string; truth: string; breakArah: string; aksi: string; arah: string; mode: string; likuidasi: boolean; netPct: number | null }

interface Baseline { residu: Residu[] }
const baseline: Baseline = JSON.parse(readFileSync('research/ujian-fbo/r43-baseline.json', 'utf8'))

const f = (x: number | undefined, d = 2): string => x === undefined ? '—' : x.toFixed(d)

function dump(csAll: ReturnType<typeof forgeFboSuite>[number], tag: string): void {
  const cs = csAll.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(cs)
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))
  const e = events[0] as FboBreakEvent | undefined
  if (!e) {
    console.log(`${tag} | mom50=${f(fitur.mom50Atr, 1)} mom12=${f(fitur.mom12Atr, 1)} dEma=${f(fitur.distEma21Atr)} atr=${f(fitur.atr, 3)} | TANPA-EVENT | levels=${levels.length}`)
    for (const L of levels.slice(0, 4)) console.log(`   lvl ${L.jenis} ${L.side} ${f(L.level, 2)} sentuh=${L.sentuhan}`)
    return
  }
  const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
  console.log(`${tag} | mom50=${f(fitur.mom50Atr, 1)} mom12=${f(fitur.mom12Atr, 1)} dEma=${f(fitur.distEma21Atr)} vF=${f(fitur.vF, 2)} push7=${f(fitur.push7Atr, 2)}`)
  console.log(`   EVENT ${e.lvl.jenis}/${e.side} lvl=${f(e.lvl.level, 2)} sentuhPra=${e.preTouches} lastPierce=${csAll.candles.length - FBO_VISIBLE + e.lastPierceIdx - (csAll.candles.length - FBO_VISIBLE)} idx=${e.lastPierceIdx}/${cs.length - 1}`)
  console.log(`   maxBey=${f(e.maxBeyondAtr)} closeNow=${f(e.closeNowAtr)} closesBey=${e.closesBeyond} wickBey=${f(e.wickBeyondAtr)} rejec=${f(e.rejecBodyAtr)} crossBack=${e.crossBack}`)
  console.log(`   volBrk=${f(e.volRatioBreak)} volFoll=${f(e.volFollow)} volLate=${f(e.volLate)} volFollPre=${f(e.volFollowPre)} volLatePre=${f(e.volLatePre)} climax=${e.climax} retest=${e.retest}`)
  console.log(`   eff=${f(e.effAtr)} push7=${f(e.push7Atr)} dirCons=${f(e.dirCons)} lateMove=${f(e.lateMoveAtr)} earlyMove=${f(e.earlyMoveAtr)} momAlign=${f(momAl, 1)}`)
  for (const L of levels.slice(0, 5)) console.log(`   lvl ${L.jenis} ${L.side} ${f(L.level, 2)} sentuh=${L.sentuhan}`)
}

// ---- 1. dump semua 20 residu ----
console.log(`=========== RESIDU (20) v${FBO_BRAIN_VERSI} ===========`)
for (const r of baseline.residu) {
  const ns = r.ns
  const suite = r.kind === 'GUARD' ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const ex = suite.find((x) => x.num === r.num)
  if (!ex) { console.log(`${ns} #${r.num} TIDAK-DITEMUKAN`); continue }
  dump(ex, `[${ns} #${r.num}] ${r.fam} [${r.diff}] ${r.kind} truth=${r.truth} brain=${r.aksi}/${r.arah} lik=${r.likuidasi}`)
  console.log('')
}

// ---- 2. kontrol: kasus LULUS serupa utk pembanding ----
// (a) fbo-equal yang lulus via T11 / fade (pemisah equal-highs trap)
console.log(`=========== KONTROL fbo-equal (lulus, pembanding T11) ===========`)
for (const ns of ['fbo100', 'fbo300', 'fbo600', 'fbo1300']) {
  for (const ex of forgeFboSuite(ns).filter((x) => x.fam === 'fbo-equal')) {
    const cs = ex.candles.slice(0, FBO_VISIBLE)
    const k = fbVonis(cs, FBO_BRAIN_VERSI)
    const fitur = buildSgVision(cs)
    const levels = buildFboLevels(cs)
    const e = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))[0] as FboBreakEvent | undefined
    if (!e) continue
    const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
    console.log(`[${ns} #${ex.num}] ${ex.diff} truth=${ex.truth} brain=${k.aksi}/${k.arah} ${k.pelajaranAktif.join('+')} | momAl=${f(momAl, 1)} dEma=${f(fitur.distEma21Atr)} dirCons=${f(e.dirCons)} vF=${f(e.volFollow)} vL=${f(e.volLate)} vFP=${f(e.volFollowPre)} vBrk=${f(e.volRatioBreak)} closeNow=${f(e.closeNowAtr)} closesBey=${e.closesBeyond} preT=${e.preTouches} ekskursi=${f(e.maxBeyondAtr - Math.max(0, e.closeNowAtr))} rejec=${f(e.rejecBodyAtr)}`)
  }
}

// (b) g-accept yang lulus (pembanding guard no-trade)
console.log(`\n=========== KONTROL g-accept (lulus) ===========`)
for (const ns of ['fbo100', 'fbo300', 'fbo600', 'fbo1300', 'fbo1900']) {
  for (const ex of forgeFboGuardSuite(ns).filter((x) => x.fam === 'g-accept')) {
    const cs = ex.candles.slice(0, FBO_VISIBLE)
    const k = fbVonis(cs, FBO_BRAIN_VERSI)
    const fitur = buildSgVision(cs)
    const levels = buildFboLevels(cs)
    const e = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))[0] as FboBreakEvent | undefined
    if (!e) continue
    const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
    console.log(`[${ns} #${ex.num}] ${ex.diff} truth=${ex.truth} brain=${k.aksi}/${k.arah} ${k.pelajaranAktif.join('+')} | momAl=${f(momAl, 1)} dEma=${f(fitur.distEma21Atr)} dirCons=${f(e.dirCons)} vF=${f(e.volFollow)} vL=${f(e.volLate)} vFP=${f(e.volFollowPre)} vBrk=${f(e.volRatioBreak)} closeNow=${f(e.closeNowAtr)} closesBey=${e.closesBeyond} preT=${e.preTouches}`)
  }
}

// (c) g-retest-hold yang lulus (pembanding fbo800 #114, fbo2300 #112/#116)
console.log(`\n=========== KONTROL g-retest-hold (lulus) ===========`)
for (const ns of ['fbo100', 'fbo300', 'fbo600', 'fbo1300']) {
  for (const ex of forgeFboGuardSuite(ns).filter((x) => x.fam === 'g-retest-hold')) {
    const cs = ex.candles.slice(0, FBO_VISIBLE)
    const k = fbVonis(cs, FBO_BRAIN_VERSI)
    const fitur = buildSgVision(cs)
    const levels = buildFboLevels(cs)
    const e = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))[0] as FboBreakEvent | undefined
    if (!e) continue
    const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
    console.log(`[${ns} #${ex.num}] ${ex.diff} truth=${ex.truth} brain=${k.aksi}/${k.arah} ${k.pelajaranAktif.join('+')} | momAl=${f(momAl, 1)} dEma=${f(fitur.distEma21Atr)} dirCons=${f(e.dirCons)} vF=${f(e.volFollow)} vL=${f(e.volLate)} closeNow=${f(e.closeNowAtr)} closesBey=${e.closesBeyond} preT=${e.preTouches} vBrk=${f(e.volRatioBreak)}`)
  }
}
