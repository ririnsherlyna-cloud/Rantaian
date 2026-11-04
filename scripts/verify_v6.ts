// Bedah pecah-latihan v6 + spring-hl kontrol
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

for (const [ns, num, kind] of [
  ['fbo2600', 83, 'FBO'], ['fbo2600', 85, 'FBO'],
  ['fbo1800', 120, 'GUARD'], ['fbo2000', 123, 'GUARD'], ['fbo1900', 57, 'FBO'],
  ['fbo3000', 85, 'FBO'],
] as const) {
  const suite = kind === 'GUARD' ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const ex = suite.find((x) => x.num === num)!
  const cs = ex.candles.slice(0, FBO_VISIBLE)
  const k = fbVonis(cs, '1.37b')
  const b = k.brk!
  const fitur = k.fitur
  const momAl = b.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
  console.log(`[${ns} #${num}] ${ex.fam}/${kind === 'GUARD' ? 'G' : 'F'} ${ex.diff} truth=${ex.truth} brain=${k.aksi}/${k.arah} via ${k.pelajaranAktif.join('+')}`)
  console.log(`  cOut=${b.closesBeyond} cN=${b.closeNowAtr.toFixed(2)} wExc=${(b.maxBeyondAtr - Math.max(0, b.closeNowAtr)).toFixed(2)} umur=${cs.length - 1 - b.firstPierceIdx} preT=${b.preTouches} p7=${b.push7Atr.toFixed(2)} dir=${b.dirCons.toFixed(2)} vF=${b.volFollow.toFixed(2)} vFP=${b.volFollowPre.toFixed(2)} vLpre=${b.volLatePre.toFixed(2)} vL=${b.volLate.toFixed(2)} vBrk=${b.volRatioBreak.toFixed(2)} rejec=${b.rejecBodyAtr.toFixed(2)} wickB=${b.wickBeyondAtr.toFixed(2)} momAl=${momAl.toFixed(1)} dEma=${fitur.distEma21Atr.toFixed(2)} lateM=${b.lateMoveAtr.toFixed(2)} earlyM=${b.earlyMoveAtr.toFixed(2)} climax=${b.climax ? 1 : 0} retest=${b.retest ? 1 : 0}`)
}
