// bedah lengkap semua kegagalan v1.33 di seed mana pun
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, scanRetestOfBroken, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
const seeds = process.argv.slice(2)
for (const ns of seeds) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const n = cs.length
      const k = fbVonis(cs, '1.33')
      const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
      let berhasil: boolean
      if (led.mode === 'NO-TRADE') {
        const bait = simBaitFbo(e.breakArah, e.entry, horizon)
        berhasil = bait.stopHit || (bait.netPct ?? 0) <= 0
      } else berhasil = (led.netPct ?? -1) > 0 && !led.stopHit
      if (berhasil) continue
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const events = scanBreakEvents(cs, buildFboLevels(cs), fitur.volMean, atr)
      const fbr = scanRetestOfBroken(cs, buildFboLevels(cs), atr)
      console.log(`\n### ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} breakArah=${e.breakArah} | ${led.mode} ${k.aksi}/${k.arah} ${led.stopHit ? 'LIKUIDASI' : ''} ${led.netPct !== null ? led.netPct.toFixed(2) + '%' : ''} | pel=${(k.pelajaranAktif ?? []).join('+')}`)
      console.log(`  close=${cs[n - 1].c.toFixed(2)} ATR=${atr.toFixed(3)} mom12=${fitur.mom12Atr.toFixed(2)} mom50=${(fitur.mom50Atr ?? 0).toFixed(1)} dEma21=${fitur.distEma21Atr.toFixed(2)} | fbr=${fbr ? `${fbr.brkArah}/${fbr.histCloses}c/${fbr.histDepth.toFixed(2)}/appr${fbr.approachAtr.toFixed(2)}` : 'tidak-ada'}`)
      for (const ev of events.slice(0, 2)) {
        const umur = n - 1 - ev.firstPierceIdx
        const wickExc = ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)
        const momAl = ev.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
        console.log(`  EV lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis},${ev.lvl.sentuhan}s) side=${ev.side} preT=${ev.preTouches} umur=${umur} lastP=${n - 1 - ev.lastPierceIdx} cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} maxB=${ev.maxBeyondAtr.toFixed(2)} wExc=${wickExc.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} xB=${ev.crossBack ? 1 : 0} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} vFpre=${ev.volFollowPre.toFixed(2)} vLpre=${ev.volLatePre.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} eff=${ev.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)} lateM=${ev.lateMoveAtr.toFixed(2)} earlyM=${ev.earlyMoveAtr.toFixed(2)}`)
      }
      if (!events.length) console.log('  TANPA-EVENT')
      console.log(`  ALASAN: ${(k.alasan ?? []).join(' | ')}`)
    }
  }
}
