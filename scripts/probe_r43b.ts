// ============================================================
// PROBE R43b — bedah SEMUA event utk kasus residu tertentu.
// Utk memahami event mana yang dipilih otak (bisa events[0..2]).
// Pakai: bun scripts/probe_r43b.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { scanBreakEvents, buildFboLevels, fbVonis, FBO_BRAIN_VERSI, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const f = (x: number | undefined, d = 2): string => x === undefined ? '—' : x.toFixed(d)

function dumpKasus(ns: string, num: number, kind: string): void {
  const suite = kind === 'GUARD' ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const ex = suite.find((x) => x.num === num)
  if (!ex) { console.log(`${ns} #${num} TIDAK DITEMUKAN`); return }
  const cs = ex.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(cs)
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))
  const k = fbVonis(cs, FBO_BRAIN_VERSI)
  console.log(`\n##### [${ns} #${num}] ${ex.fam} [${ex.diff}] ${ex.kind} truth=${ex.truth} breakArah=${ex.breakArah} brain=${k.aksi}/${k.arah} via ${k.pelajaranAktif.join('+')}`)
  console.log(`  mom50=${f(fitur.mom50Atr, 1)} mom12=${f(fitur.mom12Atr, 1)} dEma=${f(fitur.distEma21Atr)} atr=${f(fitur.atr, 3)} entry=${cs[cs.length - 1].c.toFixed(2)}`)
  for (const e of events.slice(0, 3)) {
    const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
    const wickExc = e.maxBeyondAtr - Math.max(0, e.closeNowAtr)
    console.log(`  EV ${e.lvl.jenis}/${e.side} lvl=${e.lvl.level.toFixed(2)} sentuh=${e.lvl.sentuhan} | maxBey=${f(e.maxBeyondAtr)} closeNow=${f(e.closeNowAtr)} cOut=${e.closesBeyond} umur=${cs.length - 1 - e.firstPierceIdx} lastP=${cs.length - 1 - e.lastPierceIdx} preT=${e.preTouches}`)
    console.log(`     vBrk=${f(e.volRatioBreak)} vF=${f(e.volFollow)} vL=${f(e.volLate)} vFP=${f(e.volFollowPre)} vLPre=${f(e.volLatePre)} vLPreL=${f(e.volLatePre)} climax=${e.climax} retest=${e.retest}`)
    console.log(`     eff=${f(e.effAtr)} p7=${f(e.push7Atr)} dir=${f(e.dirCons)} lateM=${f(e.lateMoveAtr)} earlyM=${f(e.earlyMoveAtr)} momAl=${f(momAl, 1)} wickBey=${f(e.wickBeyondAtr)} rejec=${f(e.rejecBodyAtr)} wickExc=${f(wickExc)} crossBack=${e.crossBack}`)
  }
  // horizon ringkas: kemana harga pergi?
  const hz = ex.candles.slice(FBO_VISIBLE)
  const e0 = hz[0]?.c ?? 0
  const eMax = Math.max(...hz.map((c) => c.h))
  const eMin = Math.min(...hz.map((c) => c.l))
  const akhir = hz[hz.length - 1]?.c ?? 0
  console.log(`  HORIZON: awal=${e0.toFixed(2)} min=${eMin.toFixed(2)} max=${eMax.toFixed(2)} akhir=${akhir.toFixed(2)} (${((akhir / e0 - 1) * 100).toFixed(1)}%)`)
  console.log(`  TRUTH-level: ${ex.level.jenis} ${ex.level.level.toFixed(2)} | movePct=${ex.movePct} baitMfe=${ex.baitMfePct} earlyFadeStop=${ex.earlyFadeStopped}`)
}

// kasus yang butuh kejelasan event-terpilih & horizon
const kasus: [string, number, string][] = [
  ['fbo2000', 66, 'FBO'],     // T4 salah — event mana yang dipilih?
  ['fbo2200', 23, 'FBO'],     // T1 jalur-b — lateMove vs earlyMove?
  ['fbo2200', 67, 'FBO'],     // L8 salah arah — episode atas ada?
  ['fbo2400', 103, 'GUARD'],  // g-accept pullback — opsi re-break?
  ['fbo2300', 121, 'GUARD'],  // L9 SKIP — opsi FB-R re-break?
  ['fbo2300', 120, 'GUARD'],  // T16 kandidat
  ['fbo2200', 121, 'GUARD'],  // T14 kandidat
  ['fbo800', 114, 'GUARD'],   // T6X kandidat
  ['fbo2100', 111, 'GUARD'],  // T0NLEV kandidat
  ['fbo2200', 101, 'GUARD'],  // T15 kandidat
]
for (const [ns, num, kind] of kasus) dumpKasus(ns, num, kind)
