// Debug R3 gate utk fbo2500 #111 — evaluasi tiap kondisi eksplisit
import { forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis, scanBreakEvents, buildFboLevels } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const ex = forgeFboGuardSuite('fbo2500').find((x) => x.num === 111)!
const cs = ex.candles.slice(0, FBO_VISIBLE)
const k = fbVonis(cs, '1.37b')
const fitur = buildSgVision(cs)
const levels = buildFboLevels(cs)
const events = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))
console.log('brain:', k.aksi, k.arah, k.pelajaranAktif.join('+'))
console.log('jumlah events:', events.length)
events.forEach((e, i) => {
  const cN = e.closeNowAtr
  const p7 = e.push7Atr
  const vFP = e.volFollowPre
  const cOut = e.closesBeyond
  const lastP = cs.length - 1 - e.lastPierceIdx
  const r3main = cN < 0 && p7 >= 0.2 && vFP >= 1.05 && cOut >= 15 && lastP <= 11
  const r3relax = p7 >= 0.2 || (cOut >= 20 && vFP >= 1.2 && p7 >= 0.1)
  console.log(`EV[${i}] ${e.side} cN=${cN.toFixed(2)} p7=${p7.toFixed(3)} vFP=${vFP.toFixed(3)} cOut=${cOut} lastP=${lastP} | R3main=${r3main} R3relax=${r3relax}`)
})
const b = k.brk!
console.log(`brain-event: cN=${b.closeNowAtr.toFixed(3)} p7=${b.push7Atr.toFixed(3)} vFP=${b.volFollowPre.toFixed(3)} cOut=${b.closesBeyond} lastP=${cs.length - 1 - b.lastPierceIdx}`)
