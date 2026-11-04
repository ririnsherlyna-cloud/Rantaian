// BEDAH r41 — semua kegagalan utk seed apa pun (FBO + GUARD),
// dgn fitur event + vonis + alasan lengkap per ujian.
//   tsx scripts/bedah_fbo_r41.ts fbo1000 fbo1100 fbo1200
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo } from '../src/lib/exam/fbo-forge'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['fbo100', 'fbo200', 'fbo300']
let total = 0
let gagal = 0
for (const ns of seeds) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      total++
      const visible = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const k = fbVonis(visible, '1.29')
      const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
      let berhasil: boolean
      if (led.mode === 'NO-TRADE') {
        const bait = simBaitFbo(e.breakArah, e.entry, horizon)
        berhasil = bait.stopHit || (bait.netPct ?? 0) <= 0
      } else berhasil = (led.netPct ?? -1) > 0 && !led.stopHit
      if (berhasil) continue
      gagal++
      const cs = visible
      const n = cs.length
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const events = scanBreakEvents(cs, buildFboLevels(cs), fitur.volMean, atr)
      console.log(`\n### ${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} breakArah=${e.breakArah} | ${led.mode} ${k.aksi}/${k.arah} ${led.stopHit ? 'LIKUIDASI' : ''} ${led.netPct !== null && led.netPct !== undefined ? led.netPct.toFixed(2) + '%' : ''}`)
      console.log(`  truthLevel=${e.level.level.toFixed(2)} side=${e.level.side} | close=${cs[n - 1].c.toFixed(2)} ATR=${atr.toFixed(3)} mom12=${fitur.mom12Atr.toFixed(2)} mom50=${(fitur.mom50Atr ?? 0).toFixed(1)} dEma21=${fitur.distEma21Atr.toFixed(2)}`)
      for (const ev of events.slice(0, 2)) {
        const umur = n - 1 - ev.firstPierceIdx
        const wickExc = ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)
        const momAl = ev.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
        console.log(`  EVENT lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis}) side=${ev.side} rank=${ev.rank.toFixed(2)} preT=${ev.preTouches} umur=${umur} lastP=${n - 1 - ev.lastPierceIdx} cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} maxB=${ev.maxBeyondAtr.toFixed(2)} wickExc=${wickExc.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} xB=${ev.crossBack} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} eff=${ev.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)}`)
      }
      if (!events.length) console.log('  TANPA EVENT')
      console.log(`  VONIS: ${k.aksi}/${k.arah} trig=${k.triggerLevel?.toFixed(2)} stop=${k.stopPct} pelajaran=${(k.pelajaranAktif ?? []).join('+')}`)
      console.log(`  ALASAN: ${(k.alasan ?? []).join(' | ')}`)
    }
  }
}
console.log(`\nTOTAL: ${gagal} gagal / ${total} ujian (${seeds.length} seed)`)
