// PROBE R43f — profil kasus tersisa: fbo1100 #48 (T16-pecah), fbo2300 #50,
// fbo2200 #23, fbo2400 #103 (L7DUAL target) + kontrol fbo-equal lulus serupa.
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { scanBreakEvents, buildFboLevels, fbVonis, FBO_BRAIN_VERSI, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const f = (x: number | undefined, d = 2): string => x === undefined ? '—' : x.toFixed(d)

function dump(ns: string, num: number, kind: string, tag: string): void {
  const suite = kind === 'GUARD' ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const ex = suite.find((x) => x.num === num)
  if (!ex) { console.log(`${tag}: TIDAK ADA`); return }
  const cs = ex.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(cs)
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))
  const k = fbVonis(cs, FBO_BRAIN_VERSI)
  console.log(`\n${tag} [${ns} #${num}] ${ex.fam}/${kind === 'GUARD' ? 'G' : 'F'} ${ex.diff} truth=${ex.truth} breakArah=${ex.breakArah} brain=${k.aksi}/${k.arah} via ${k.pelajaranAktif.join('+')}`)
  console.log(`  mom50=${f(fitur.mom50Atr, 1)} mom12=${f(fitur.mom12Atr, 1)} dEma=${f(fitur.distEma21Atr)} | HORIZON min=${f(Math.min(...ex.candles.slice(FBO_VISIBLE).map((c) => c.l)))} max=${f(Math.max(...ex.candles.slice(FBO_VISIBLE).map((c) => c.h)))} level-truth=${ex.level.level.toFixed(2)}`)
  events.forEach((e, i) => {
    if (i > 2) return
    const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
    const wickExc = e.maxBeyondAtr - Math.max(0, e.closeNowAtr)
    console.log(`  EV[${i}] ${e.lvl.jenis}/${e.side} ${e.lvl.level.toFixed(2)} s=${e.lvl.sentuhan} | cOut=${e.closesBeyond} cN=${f(e.closeNowAtr)} maxB=${f(e.maxBeyondAtr)} wExc=${f(wickExc)} umur=${cs.length - 1 - e.firstPierceIdx} preT=${e.preTouches} | vBrk=${f(e.volRatioBreak)} vF=${f(e.volFollow)} vL=${f(e.volLate)} vFP=${f(e.volFollowPre)} vLPre=${f(e.volLatePre)} | eff=${f(e.effAtr)} p7=${f(e.push7Atr)} dir=${f(e.dirCons)} lateM=${f(e.lateMoveAtr)} earlyM=${f(e.earlyMoveAtr)} momAl=${f(momAl, 1)} rejec=${f(e.rejecBodyAtr)} wickB=${f(e.wickBeyondAtr)} climax=${e.climax ? 1 : 0} retest=${e.retest ? 1 : 0}`)
  })
}

dump('fbo1100', 48, 'FBO', 'T16-PECAH')
dump('fbo2300', 50, 'FBO', 'T1-DEMA-target')
dump('fbo2200', 23, 'FBO', 'T1VFP-target')
dump('fbo2400', 103, 'GUARD', 'L7DUAL-target')
dump('fbo2400', 107, 'GUARD', 'L7DUAL-target')
dump('fbo1900', 124, 'GUARD', 'T1VFP-PECAH')
