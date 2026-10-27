// BEDAH fbo400 #4/#6/#8 — anatomi level kembar: event otak (97.00 ATAS)
// vs truth (97.70 BAWAH). Dump konteks candle + kedua kandidat level.
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const ns = process.argv[2] ?? 'fbo400'
const nums = (process.argv[3] ?? '4,6,8').split(',').map((s) => parseInt(s, 10))
const suite = process.argv[4] === "guards" ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
for (const num of nums) {
  const e = suite.find((x) => x.num === num)!
  const cs = e.candles.slice(0, FBO_VISIBLE)
  const n = cs.length
  const fitur = buildSgVision(cs)
  const atr = Math.max(fitur.atr, 1e-9)
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, atr)
  console.log(`\n########## ${ns} #${num} ${e.fam} [${e.diff}] truth=${e.truth} truthLevel=${e.truthLevel?.toFixed(2)} ##########`)
  console.log(`ATR=${atr.toFixed(3)} close=${cs[n - 1].c.toFixed(2)} mom50=${(fitur.mom50Atr ?? 0).toFixed(1)}`)
  console.log(`LEVEL OTAK (top 6):`)
  for (const L of levels.slice(0, 6)) console.log(`  ${L.jenis} ${L.side} ${L.level.toFixed(2)} sentuhan=${L.sentuhan} dariZona=${L.dariZona}`)
  console.log(`EVENT BREAK (top 3):`)
  for (const ev of events.slice(0, 3)) {
    console.log(`  lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis}) side=${ev.side} rank=${ev.rank.toFixed(2)} preT=${ev.preTouches} umur=${n - 1 - ev.firstPierceIdx} lastPierce=${n - 1 - ev.lastPierceIdx}`)
    console.log(`    cN=${ev.closeNowAtr.toFixed(2)} closesOut=${ev.closesBeyond} maxB=${ev.maxBeyondAtr.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} xB=${ev.crossBack} vBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} p7=${ev.push7Atr.toFixed(2)} dir=${ev.dirCons.toFixed(2)}`)
  }
  const k = fbVonis(cs, '1.28')
  console.log(`VONIS: ${k.aksi}/${k.arah} trigger=${k.triggerLevel?.toFixed(2)} stop=${k.stopPct} pelajaran=${(k.pelajaranAktif ?? []).join('+')}`)
  console.log(`ALASAN: ${(k.alasan ?? []).join(' | ')}`)
  console.log(`10 CANDLE TERAKHIR (o h l c v):`)
  for (let i = n - 10; i < n; i++) console.log(`  #${i} ${cs[i].o.toFixed(2)} ${cs[i].h.toFixed(2)} ${cs[i].l.toFixed(2)} ${cs[i].c.toFixed(2)} ${cs[i].v.toFixed(0)}`)
  console.log(`HORIZON (max up/down dari close visible):`)
  const horizon = e.candles.slice(FBO_VISIBLE)
  let mx = -1e9, mn = 1e9
  for (const c of horizon) { mx = Math.max(mx, c.h); mn = Math.min(mn, c.l) }
  console.log(`  high=${mx.toFixed(2)} low=${mn.toFixed(2)} | truth entry=${e.entry} target~${(e.entry * 1.02).toFixed(2)}/${(e.entry * 0.98).toFixed(2)}`)
}
