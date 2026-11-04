// PETAKAN pemakaian gerbang FB-R/FB-R2 di SEMUA pemenang (seed 100-600)
// sebelum pengerasan — agar fix tidak membunuh pemenang sah.
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE, simFboTrade } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600']) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const visible = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const k = fbVonis(visible, '1.28')
      const les = k.pelajaranAktif ?? []
      if (!les.some((p) => p === 'FB-R' || p === 'FB-R2')) continue
      const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
      const hasil = led.mode === 'NO-TRADE' ? 'NO-TRADE' : ((led.netPct ?? 0) > 0 ? 'PROFIT' : 'RUGI')
      console.log(`${ns} ${guards ? 'G' : 'F'}#${e.num} ${e.family}[${e.diff}] ${k.aksi}/${k.arah} trig=${k.triggerLevel?.toFixed(2)} -> ${hasil} ${led.netPct !== null && led.netPct !== undefined ? led.netPct.toFixed(2) + '%' : ''} | truth=${e.truth}`)
    }
  }
}
