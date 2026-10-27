// Probe: daftar guard yang GAGAL utk satu seed + jejak keputusan
import { forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE, simFboTrade } from '../src/lib/exam/fbo-forge'
import { fbVonis, buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const ns = process.argv[2] ?? 'fbo600'
const suite = forgeFboGuardSuite(ns)
for (const e of suite) {
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const horizon = e.candles.slice(FBO_VISIBLE)
  const k = fbVonis(visible, '1.29')
  const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
  const ok = led.mode === 'NO-TRADE' ? false : true // guard = wajib trade
  const profit = led.netPct !== null && led.netPct !== undefined && led.netPct > 0
  if (ok && profit) continue
  console.log(`\n### ${ns} G#${e.num} ${e.fam}[${e.diff}] truth=${e.truth} -> ${led.mode} ${led.netPct ?? ''} ${led.hasil ?? ''}`)
  const cs = visible
  const n = cs.length
  const fitur = buildSgVision(cs)
  const atr = Math.max(fitur.atr, 1e-9)
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, atr)
  console.log(`close=${cs[n - 1].c.toFixed(2)} ATR=${atr.toFixed(3)} mom50=${(fitur.mom50Atr ?? 0).toFixed(1)} truthLevel=${e.truthLevel?.toFixed(2)}`)
  for (const ev of events.slice(0, 2)) {
    console.log(`  EVENT lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis}) side=${ev.side} rank=${ev.rank.toFixed(2)} preT=${ev.preTouches} umur=${n - 1 - ev.firstPierceIdx} lastP=${n - 1 - ev.lastPierceIdx} cN=${ev.closeNowAtr.toFixed(2)} cOut=${ev.closesBeyond} maxB=${ev.maxBeyondAtr.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} xB=${ev.crossBack} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)} eff=${ev.effAtr.toFixed(2)}`)
  }
  console.log(`VONIS: ${k.aksi}/${k.arah} trig=${k.triggerLevel?.toFixed(2)} pelajaran=${(k.pelajaranAktif ?? []).join('+')}`)
  console.log(`ALASAN: ${(k.alasan ?? []).join(' | ')}`)
}
