// ============================================================
// PROBE R43c — profil pembanding: kasus SEMBUH vs PECAH tiap fix
// utk menemukan pemisah yang tepat (kalibrasi batas, bukan patch).
// Pakai: bun scripts/probe_r43c.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { scanBreakEvents, buildFboLevels, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const f = (x: number | undefined, d = 2): string => x === undefined ? '—' : x.toFixed(d)

function profil(ns: string, num: number, kind: string, tag: string): void {
  const suite = kind === 'GUARD' ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const ex = suite.find((x) => x.num === num)
  if (!ex) { console.log(`${tag}: TIDAK ADA`); return }
  const cs = ex.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(cs)
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, Math.max(fitur.atr, 1e-9))
  const e = events[0] as FboBreakEvent | undefined
  if (!e) {
    console.log(`${tag} | TANPA-EVENT mom50=${f(fitur.mom50Atr, 1)} mom12=${f(fitur.mom12Atr, 1)} dEma=${f(fitur.distEma21Atr)} | lvl-teruji: ${levels.filter((l) => l.sentuhan >= 8).map((l) => `${l.jenis}@${l.level.toFixed(2)}(${l.sentuhan})`).join(' ')}`)
    return
  }
  const momAl = e.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
  const wickExc = e.maxBeyondAtr - Math.max(0, e.closeNowAtr)
  console.log(`${tag} | momAl=${f(momAl, 1)} dEma=${f(fitur.distEma21Atr)} mom12=${f(fitur.mom12Atr, 1)} | cOut=${e.closesBeyond} cN=${f(e.closeNowAtr)} maxB=${f(e.maxBeyondAtr)} wExc=${f(wickExc)} umur=${cs.length - 1 - e.firstPierceIdx} preT=${e.preTouches} | vBrk=${f(e.volRatioBreak)} vF=${f(e.volFollow)} vL=${f(e.volLate)} vFP=${f(e.volFollowPre)} vLPre=${f(e.volLatePre)} | eff=${f(e.effAtr)} p7=${f(e.push7Atr)} dir=${f(e.dirCons)} lateM=${f(e.lateMoveAtr)} earlyM=${f(e.earlyMoveAtr)} rejec=${f(e.rejecBodyAtr)} wickB=${f(e.wickBeyondAtr)} climax=${e.climax ? 1 : 0} retest=${e.retest ? 1 : 0} ${e.side}`)
}

console.log('======== T9: SEMBUH #102/#108 vs PECAH fbo1200 #22/#26 ========')
profil('fbo2100', 102, 'GUARD', 'SEMBUH fbo2100#102 g-accept')
profil('fbo1200', 22, 'FBO', 'PECAH  fbo1200#22  follow-fail')
profil('fbo1200', 26, 'FBO', 'PECAH  fbo1200#26  follow-fail')

console.log('\n======== T11: SEMBUH #63/#69 vs PECAH fbo1700 #103/#107 ========')
profil('fbo2200', 63, 'FBO', 'SEMBUH fbo2200#63 equal')
profil('fbo1700', 103, 'GUARD', 'PECAH  fbo1700#103 g-accept')
profil('fbo1700', 107, 'GUARD', 'PECAH  fbo1700#107 g-accept')

console.log('\n======== T6X: SEMBUH #114 vs PECAH fbo800 #46/#52 ========')
profil('fbo800', 114, 'GUARD', 'SEMBUH fbo800#114 retest-hold')
profil('fbo800', 46, 'FBO', 'PECAH  fbo800#46  drift-snap')
profil('fbo800', 52, 'FBO', 'PECAH  fbo800#52  drift-snap')

console.log('\n======== T1DEMA: sample PECAH (g-trend-cont T1-wins) ========')
profil('fbo100', 120, 'GUARD', 'PECAH  fbo100#120 g-trend-cont')
profil('fbo100', 122, 'GUARD', 'PECAH  fbo100#122 g-trend-cont')
profil('fbo100', 124, 'GUARD', 'PECAH  fbo100#124 g-trend-cont')
profil('fbo300', 124, 'GUARD', 'PECAH  fbo300#124 g-trend-cont')
profil('fbo500', 121, 'GUARD', 'PECAH  fbo500#121 g-trend-cont')

console.log('\n======== T0NLEV: SEMBUH #111 vs PECAH fbo1300 #119/#123 ========')
profil('fbo2100', 111, 'GUARD', 'SEMBUH fbo2100#111 retest-hold')
profil('fbo1300', 119, 'GUARD', 'PECAH  fbo1300#119 g-trend-cont')
profil('fbo1300', 123, 'GUARD', 'PECAH  fbo1300#123 g-trend-cont')

console.log('\n======== R2MIKRO: cek kasus serupa FBO (proteksi) ========')
profil('fbo2300', 121, 'GUARD', 'SEMBUH fbo2300#121 trend-cont')
profil('fbo800', 46, 'FBO', 'pecah-T6X fbo800#46 drift-snap')

console.log('\n======== T15-PECAH-KONTROL: climax-fail PUNISH sample ========')
profil('fbo300', 95, 'FBO', 'control fbo300#95 (climax-fail?)')
profil('fbo500', 95, 'FBO', 'control fbo500#95 (climax-fail?)')
