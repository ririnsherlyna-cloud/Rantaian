// Probe aturan yang menyala untuk ujian tertentu pada v1.28
//   bun scripts/probe_v128.ts <ns> <num> [<num2> ...]
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const ns = process.argv[2] ?? 'fbo100'
const nums = process.argv.slice(3).map((x) => parseInt(x, 10))
const suite = forgeFboSuite(ns)
const guards = forgeFboGuardSuite(ns)
for (const num of nums) {
  const e = [...suite, ...guards].find((x) => x.num === num)
  if (!e) continue
  const vis = e.candles.slice(0, FBO_VISIBLE)
  const n = vis.length
  const fitur = buildSgVision(vis)
  const atr = Math.max(fitur.atr, 1e-9)
  const levels = buildFboLevels(vis)
  const events = scanBreakEvents(vis, levels, fitur.volMean, atr)
  const k = fbVonis(vis, '1.28')
  console.log(`#${num} ${e.fam} [${e.diff}] truth=${e.truth} breakArah=${e.breakArah} mom50=${(fitur.mom50Atr ?? 0).toFixed(2)} mom12=${fitur.mom12Atr.toFixed(2)} dEma=${fitur.distEma21Atr.toFixed(2)} | aturan=${k.pelajaranAktif.join(',')} aksi=${k.aksi}/${k.arah}`)
  for (const ev of events.slice(0, 3)) {
    const umur = n - 1 - ev.firstPierceIdx
    console.log(`   ev lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis.slice(0, 8)}) side=${ev.side} rank=${ev.rank.toFixed(2)} cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} umur=${umur} vBrk=${ev.volRatioBreak.toFixed(2)} vFpre=${ev.volFollowPre.toFixed(2)} vLpre=${ev.volLatePre.toFixed(2)} pT=${ev.preTouches} wickB=${ev.wickBeyondAtr.toFixed(2)} wickExc=${(ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)).toFixed(2)} maxB=${ev.maxBeyondAtr.toFixed(2)} xB=${ev.crossBack ? 1 : 0} clim=${ev.climax ? 1 : 0} dir=${ev.dirCons.toFixed(2)} p7=${ev.push7Atr.toFixed(2)}`)
  }
}
