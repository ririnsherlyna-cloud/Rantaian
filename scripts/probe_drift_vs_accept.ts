// Pemisah: g-accept drift-lanjut (truth searah break) vs fbo-drift-snap
// (drift lalu snap balik). Dump fitur event utk dua keluarga ini.
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600', 'fbo700', 'fbo800', 'fbo900']) {
  const fams: Array<[string, ReturnType<typeof forgeFboGuardSuite>]> = [['F', forgeFboSuite(ns)], ['G', forgeFboGuardSuite(ns)]]
  for (const [tag, suite] of fams) {
    for (const e of suite) {
      if (!/drift-snap/.test(e.fam) && !/g-accept/.test(e.fam)) continue
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const n = cs.length
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const events = scanBreakEvents(cs, buildFboLevels(cs), fitur.volMean, atr)
      const ev = events[0]
      if (!ev) continue
      const mom50 = Math.abs(fitur.mom50Atr ?? 0)
      const momAl = ev.side === 'ATAS' ? mom50 : -mom50
      const searah = (ev.side === 'ATAS' && e.truth === 'NAIK') || (ev.side === 'BAWAH' && e.truth === 'TURUN')
      console.log(`${ns} ${tag}#${e.num} ${e.fam}[${e.diff}] searah=${searah} | cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} umur=${n - 1 - ev.firstPierceIdx} maxB=${ev.maxBeyondAtr.toFixed(2)} wickExc=${(ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)).toFixed(2)} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} eff=${ev.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)} preT=${ev.preTouches} lastP=${n - 1 - ev.lastPierceIdx}`)
    }
  }
}
