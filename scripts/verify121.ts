// Verifikasi #121 fbo1600 — fitur & gate mana yang men-veto
import { forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

const suite = forgeFboGuardSuite('fbo1600')
const ex = suite.find((x) => x.num === 121)!
const cs = ex.candles.slice(0, FBO_VISIBLE)
const k = fbVonis(cs, '1.37b')
const b = k.brk
const fitur = k.fitur
console.log('truth:', ex.truth, '| brain:', k.aksi, k.arah, '| via:', k.pelajaranAktif.join('+'))
if (b) {
  const momAl = b.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
  console.log(`cOut=${b.closesBeyond} cN=${b.closeNowAtr.toFixed(2)} maxB=${b.maxBeyondAtr.toFixed(2)} umur=${cs.length - 1 - b.firstPierceIdx} preT=${b.preTouches}`)
  console.log(`vBrk=${b.volRatioBreak.toFixed(2)} vF=${b.volFollow.toFixed(2)} vL=${b.volLate.toFixed(2)} vFP=${b.volFollowPre.toFixed(2)} vLPre=${b.volLatePre.toFixed(2)}`)
  console.log(`eff=${b.effAtr.toFixed(2)} p7=${b.push7Atr.toFixed(2)} dir=${b.dirCons.toFixed(2)} lateM=${b.lateMoveAtr.toFixed(2)} earlyM=${b.earlyMoveAtr.toFixed(2)} momAl=${momAl.toFixed(1)} rejec=${b.rejecBodyAtr.toFixed(2)} wickB=${b.wickBeyondAtr.toFixed(2)} climax=${b.climax ? 1 : 0} retest=${b.retest ? 1 : 0}`)
  console.log(`dEma=${fitur.distEma21Atr.toFixed(2)} mom12=${fitur.mom12Atr.toFixed(1)} mom50=${(fitur.mom50Atr ?? 0).toFixed(1)}`)
  // cek syarat T11-WICK
  console.log('T11-WICK veto?', b.wickBeyondAtr >= 0.3 && b.closeNowAtr <= 1.0 && b.dirCons <= 0.55 && b.volLate >= 1.15)
  console.log('T11-REJ veto?', b.rejecBodyAtr > 0.72)
}
