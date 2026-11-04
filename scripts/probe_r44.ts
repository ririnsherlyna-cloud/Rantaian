// ============================================================
// PROBE R44 — profil 31 residu HAKIM SEGEL (fbo2500-3000)
// dgn fitur event-terpilih otak (k.brk) utk kalibrasi fix.
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis, FBO_BRAIN_VERSI, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { readFileSync } from 'fs'

const f = (x: number | undefined, d = 2): string => x === undefined ? '—' : x.toFixed(d)
const base = JSON.parse(readFileSync('research/ujian-fbo/r44-hakim-v5.json', 'utf8')) as { residu: { ns: string; num: number; kind: string }[] }

for (const r of base.residu) {
  const suite = r.kind === 'GUARD' ? forgeFboGuardSuite(r.ns) : forgeFboSuite(r.ns)
  const ex = suite.find((x) => x.num === r.num)
  if (!ex) continue
  const cs = ex.candles.slice(0, FBO_VISIBLE)
  const k = fbVonis(cs, FBO_BRAIN_VERSI)
  const brk = k.brk as Omit<FboBreakEvent, 'lvl'> | null
  const fitur = k.fitur
  const momAl = brk ? (brk.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)) : (fitur.mom50Atr ?? 0)
  const wickExc = brk ? brk.maxBeyondAtr - Math.max(0, brk.closeNowAtr) : 0
  const umur = brk ? cs.length - 1 - brk.firstPierceIdx : 0
  console.log(`[${r.ns} #${r.num}] ${ex.fam}/${r.kind === 'GUARD' ? 'G' : 'F'} ${ex.diff} truth=${ex.truth} brain=${k.aksi}/${k.arah} via ${k.pelajaranAktif.join('+')}`)
  if (brk) {
    console.log(`   EV ${brk.side} | cOut=${brk.closesBeyond} cN=${f(brk.closeNowAtr)} maxB=${f(brk.maxBeyondAtr)} wExc=${f(wickExc)} umur=${umur} preT=${brk.preTouches} | vBrk=${f(brk.volRatioBreak)} vF=${f(brk.volFollow)} vL=${f(brk.volLate)} vFP=${f(brk.volFollowPre)} vLPre=${f(brk.volLatePre)} | eff=${f(brk.effAtr)} p7=${f(brk.push7Atr)} dir=${f(brk.dirCons)} lateM=${f(brk.lateMoveAtr)} earlyM=${f(brk.earlyMoveAtr)} momAl=${f(momAl, 1)} rejec=${f(brk.rejecBodyAtr)} wickB=${f(brk.wickBeyondAtr)} climax=${brk.climax ? 1 : 0} retest=${brk.retest ? 1 : 0} | dEma=${f(fitur.distEma21Atr)} mom12=${f(fitur.mom12Atr, 1)}`)
  } else {
    console.log(`   TANPA-EVENT | mom50=${f(fitur.mom50Atr, 1)} mom12=${f(fitur.mom12Atr, 1)} dEma=${f(fitur.distEma21Atr)}`)
  }
}
