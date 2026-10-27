// Kalibrasi r41b — fitur lengkap semua pemenang sah via T1/T2/T3 & FB-L1
// di 9 seed bagus, utk menentukan cap/veto tanpa membunuh pemenang.
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE, simFboTrade } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600', 'fbo700', 'fbo800', 'fbo900']) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const visible = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const k = fbVonis(visible, '1.29')
      const les = k.pelajaranAktif ?? []
      const gate = les.find((p) => ['FB-T1', 'FB-T2', 'FB-T3', 'FB-L1'].includes(p))
      if (!gate) continue
      const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
      const profit = (led.netPct ?? -1) > 0 && !led.stopHit
      const cs = visible
      const n = cs.length
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const events = scanBreakEvents(cs, buildFboLevels(cs), fitur.volMean, atr)
      // cari event yang dipakai gate (cocokkan arah & level) — pakai top-2
      for (const ev of events.slice(0, 2)) {
        const umur = n - 1 - ev.firstPierceIdx
        const wickExc = ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)
        const momAl = ev.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
        const searah = (ev.side === 'ATAS' && e.truth === 'NAIK') || (ev.side === 'BAWAH' && e.truth === 'TURUN')
        console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.fam}[${e.diff}] gate=${gate} ${profit ? 'MENANG' : 'kalah'} searah=${searah} | umur=${umur} cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} maxB=${ev.maxBeyondAtr.toFixed(2)} wickExc=${wickExc.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} eff=${ev.effAtr.toFixed(2)} momAl=${momAl.toFixed(1)} preT=${ev.preTouches} clim=${ev.climax}`)
      }
    }
  }
}
