// ============================================================
// PROBE R43d — dump SEMUA event utk kasus pecah yang belum jelas
// jalur event-nya (events.slice(0,2) dipindai otak).
// ============================================================
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
  console.log(`\n${tag} [${ns} #${num}] ${ex.fam} truth=${ex.truth} brain=${k.aksi}/${k.arah} via ${k.pelajaranAktif.join('+')}`)
  events.forEach((e, i) => {
    const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
    const wickExc = e.maxBeyondAtr - Math.max(0, e.closeNowAtr)
    if (i > 2) return
    console.log(`  EV[${i}] ${e.lvl.jenis}/${e.side} ${e.lvl.level.toFixed(2)} s=${e.lvl.sentuhan} | cOut=${e.closesBeyond} cN=${f(e.closeNowAtr)} maxB=${f(e.maxBeyondAtr)} wExc=${f(wickExc)} umur=${cs.length - 1 - e.firstPierceIdx} lastP=${cs.length - 1 - e.lastPierceIdx} preT=${e.preTouches} | vBrk=${f(e.volRatioBreak)} vF=${f(e.volFollow)} vL=${f(e.volLate)} vFP=${f(e.volFollowPre)} vLPre=${f(e.volLatePre)} | eff=${f(e.effAtr)} p7=${f(e.push7Atr)} dir=${f(e.dirCons)} lateM=${f(e.lateMoveAtr)} earlyM=${f(e.earlyMoveAtr)} momAl=${f(momAl, 1)} rejec=${f(e.rejecBodyAtr)} wickB=${f(e.wickBeyondAtr)} climax=${e.climax ? 1 : 0} retest=${e.retest ? 1 : 0}`)
  })
}

dump('fbo1200', 22, 'FBO', 'T9-PECAH')
dump('fbo1200', 26, 'FBO', 'T9-PECAH')
dump('fbo800', 46, 'FBO', 'T6X-PECAH')
dump('fbo800', 52, 'FBO', 'T6X-PECAH')
dump('fbo500', 123, 'GUARD', 'T1VFP-PECAH')
dump('fbo1900', 124, 'GUARD', 'T1VFP-PECAH')
