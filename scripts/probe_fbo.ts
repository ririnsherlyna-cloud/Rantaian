// PROBE FBO — bedah satu ujian: level terpetakan, event tersapu,
// gerbang FB-L4 dievaluasi manual. Pakai:
//   bun scripts/probe_fbo.ts <seed> <num> [guards]
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const seed = process.argv[2] ?? 'fbo100'
const num = parseInt(process.argv[3] ?? '45', 10)
const guards = process.argv[4] === 'guards'
const suite = guards ? forgeFboGuardSuite(seed) : forgeFboSuite(seed)
const e = suite.find((x) => x.num === num)
if (!e) { console.log('tidak ada num', num); process.exit(1) }

const visible = e.candles.slice(0, FBO_VISIBLE)
const n = visible.length
const fitur = buildSgVision(visible)
const atr = Math.max(fitur.atr, 1e-9)
console.log(`EXAM ${seed} #${num} fam=${e.fam} diff=${e.diff} kind=${e.kind} truth=${e.truth} breakArah=${e.breakArah}`)
console.log(`truth level=${e.level.level.toFixed(3)} side=${e.level.side} extreme=${e.level.extreme.toFixed(3)} pierceIdx=${e.level.pierceIdx} lastPierce=${e.level.lastPierceIdx}`)
console.log(`entry(close60)=${e.entry.toFixed(3)} u≈${(atr).toFixed(3)} ATR | volMean=${fitur.volMean.toFixed(2)}`)
console.log('\n--- 18 candle terakhir (o h l c v) ---')
for (let i = n - 18; i < n; i++) {
  const c = visible[i]
  const vrel = c.v / fitur.volMean
  const inOut = c.c > e.level.level ? 'LUAR+' : c.c < e.level.level ? 'dalam-' : '='
  console.log(`  [${String(i).padStart(2)}] o=${c.o.toFixed(2)} h=${c.h.toFixed(2)} l=${c.l.toFixed(2)} c=${c.c.toFixed(2)} v=${vrel.toFixed(2)}x ${c.c > c.o ? 'HIJAU' : 'merah'} relLevel=${((c.c - e.level.level) / atr).toFixed(2)}ATR(${inOut})`)
}
console.log('\n--- LEVEL TERPETAKAN ---')
const levels = buildFboLevels(visible)
for (const L of levels.slice(0, 12)) {
  const mark = Math.abs(L.level - e.level.level) <= 0.6 * atr ? ' <== TRUTH' : ''
  console.log(`  ${L.level.toFixed(2)} ${L.jenis} sentuhan=${L.sentuhan} zona=${L.dariZona}${mark}`)
}
console.log('\n--- EVENT BREAK ---')
const events = scanBreakEvents(visible, levels, fitur.volMean, atr)
if (!events.length) console.log('  (TIDAK ADA EVENT)')
for (const ev of events.slice(0, 6)) {
  console.log(`  lvl=${ev.lvl.level.toFixed(2)}(${ev.lvl.jenis}) side=${ev.side} rank=${ev.rank.toFixed(2)} pierce=${ev.firstPierceIdx}..${ev.lastPierceIdx} preT=${ev.preTouches}`)
  console.log(`    closeNow=${ev.closeNowAtr.toFixed(2)} closesOut=${ev.closesBeyond} maxBeyond=${ev.maxBeyondAtr.toFixed(2)} volBrk=${ev.volRatioBreak.toFixed(2)} vF=${ev.volFollow.toFixed(2)} vL=${ev.volLate.toFixed(2)} wick=${ev.wickBeyondAtr.toFixed(2)} rej=${ev.rejecBodyAtr.toFixed(2)} xB=${ev.crossBack} clim=${ev.climax}`)
}
console.log('\n--- VONIS v1.26 ---')
const k = fbVonis(visible, '1.26')
console.log(`aksi=${k.aksi} arah=${k.arah} lvl=${k.level.level.toFixed(2)} rules=[${k.pelajaranAktif.join(',')}]`)
for (const a of k.alasan) console.log('  · ' + a)

// Evaluasi manual gerbang FB-L4 pada event teratas
if (events.length) {
  const E = events[0]
  const last6 = visible.slice(-6)
  const meanBody6 = last6.reduce((a, c) => a + Math.abs(c.c - c.o), 0) / 6 / atr
  const minLow6 = Math.min(...last6.map((c) => c.l))
  const maxHi6 = Math.max(...last6.map((c) => c.h))
  const floatBeyond = E.side === 'ATAS' ? (minLow6 - E.lvl.level) / atr : (E.lvl.level - maxHi6) / atr
  const volFade = E.volLate < 0.7 * Math.max(E.volFollow, 0.01)
  const tiny10 = visible.slice(-10).filter((c) => Math.abs(c.c - c.o) <= 0.2 * atr).length
  const overExt = fitur.distEma21Atr >= 2.4 && fitur.mom12Atr >= 2.4 && meanBody6 < 0.28
  console.log('\n--- GERBANG FB-L4 (manual) ---')
  const g = (nama: string, ok: boolean, detail = '') => console.log(`  ${ok ? 'PASS' : 'FAIL'} ${nama} ${detail}`)
  g('closesBeyond>=2', E.closesBeyond >= 2, `=${E.closesBeyond}`)
  g('closeNow>=0.25', E.closeNowAtr >= 0.25, `=${E.closeNowAtr.toFixed(2)}`)
  g('!crossBack', !E.crossBack)
  g('volFollow>=0.9', E.volFollow >= 0.9, `=${E.volFollow.toFixed(2)}`)
  g('volLate>=0.7', E.volLate >= 0.7, `=${E.volLate.toFixed(2)}`)
  g('!volFade', !volFade, `vL=${E.volLate.toFixed(2)} vs 0.7*vF=${(0.7 * E.volFollow).toFixed(2)}`)
  g('meanBody6>=0.28', meanBody6 >= 0.28, `=${meanBody6.toFixed(2)}`)
  g('floatBeyond>=0.3', floatBeyond >= 0.3, `=${floatBeyond.toFixed(2)}`)
  g('tiny10<=8', tiny10 <= 8, `=${tiny10}`)
  g('!climax', !E.climax, `volBrk=${E.volRatioBreak.toFixed(2)}`)
  g('wick<=0.9', E.wickBeyondAtr <= 0.9, `=${E.wickBeyondAtr.toFixed(2)}`)
  g('maxBeyond>=0.5', E.maxBeyondAtr >= 0.5, `=${E.maxBeyondAtr.toFixed(2)}`)
  g('!overExt', !overExt, `dEma=${fitur.distEma21Atr.toFixed(2)} mom12=${fitur.mom12Atr.toFixed(2)} body6=${meanBody6.toFixed(2)}`)
  g('preT>=2', E.preTouches >= 2, `=${E.preTouches}`)
  const n60 = visible.length
  const mature = n60 - 1 - E.firstPierceIdx >= 25
  g('mature>=25', mature, `=${n60 - 1 - E.firstPierceIdx}`)
  const farOk = E.closeNowAtr <= 3.0 || (mature && (E.effAtr >= 0.4 || (E.lateMoveAtr >= 1.0 && E.lateMoveAtr >= 0.75 * E.earlyMoveAtr)))
  g('farOk', farOk, `eff=${E.effAtr.toFixed(2)} late=${E.lateMoveAtr.toFixed(2)} early=${E.earlyMoveAtr.toFixed(2)}`)
  g('push7>=0.95', E.push7Atr >= 0.95, `=${E.push7Atr.toFixed(2)}`)
  g('dirCons>=0.6', E.dirCons >= 0.6, `=${E.dirCons.toFixed(2)}`)
  g('eff>=0.25', E.effAtr >= 0.25, `=${E.effAtr.toFixed(2)}`)
}
