// BEDAH v1.0 — dump vision mentah untuk ujian yang gagal
import { forgeCgSuite } from '../src/lib/exam/composite-suite'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { CG_VISIBLE } from '../src/lib/exam/composite-forge'
import { cgVonis } from '../src/lib/exam/composite-brain'

const nums = process.argv.slice(2).map(Number)
const suite = forgeCgSuite('cg100')
for (const num of nums) {
  const e = suite[num - 1]
  const vis = e.candles.slice(0, CG_VISIBLE)
  const v = buildSgVision(vis)
  const k = cgVonis(vis, '1.0')
  console.log(`\n=== #${num} ${e.fam} [${e.diff}] dir-truth=${e.truth} post=${e.post} pl=${e.aspek.stopHunt.poolLevel.toFixed(3)} extreme=${e.extreme.toFixed(3)} entry60=${e.entry.toFixed(3)} move=${e.movePct.toFixed(2)} ===`)
  console.log(`mom50=${v.mom50Atr.toFixed(2)} mom12=${v.mom12Atr.toFixed(2)} posInRange=${v.posInRange.toFixed(2)} consDnBig=${v.consecDownBig} consUpBig=${v.consecUpBig} lastVolZ=${v.lastVolZ.toFixed(1)} volMean=${v.volMean.toFixed(2)} atr=${v.atr.toFixed(3)}`)
  console.log(`AKTIF: ${k.pool.jenis}/${k.pool.side} lvl=${k.pool.level.toFixed(3)} swept=${k.pool.swept} rec=${k.pool.reclaimed} depth=${k.pool.depthAtr.toFixed(2)} since=${k.pool.barsSince} cDist=${k.fitur.active?.closeDistAtr.toFixed(2) ?? '-'} volZswp=${k.fitur.active?.volZSweep.toFixed(1) ?? '-'} postBody=${k.fitur.active?.postBounceMaxBodyAtr.toFixed(2) ?? '-'} postVol=${k.fitur.active?.postVolMean.toFixed(2) ?? '-'} swBody=${k.fitur.active?.sweepBodyAtr.toFixed(2) ?? '-'} crossBack=${k.fitur.active?.crossBack ?? '-'}`)
  for (const p of v.pools) {
    console.log(`  pool ${p.side}/${p.jenis} lvl=${p.level.toFixed(3)} swept=${p.swept} rec=${p.reclaimed} depth=${p.depthAtr.toFixed(2)} since=${p.barsSince} cDist=${p.closeDistAtr.toFixed(2)} volZ=${p.volZSweep.toFixed(1)} swBody=${p.sweepBodyAtr.toFixed(2)} touch=${p.sentuhan} zona=${p.dariZona} cB=${p.crossBack} rank=${p.crossBack ? 0 : p.barsSince <= 1 && p.reclaimed && Math.abs(p.closeDistAtr) >= 0.5 ? 0 : p.barsSince <= 4 ? 1 : p.barsSince <= 8 ? 2 : 3}`)
  }
  console.log(`VONIS: ${k.aksi}/${k.arah} stop=${k.stopPct?.toFixed(2)} trig=${k.triggerLevel?.toFixed(3) ?? '-'} | ${k.alasan[0]?.slice(0, 150)}`)
  // 12 candle terakhir untuk anatomi
  const tail = vis.slice(-8)
  console.log('TAIL: ' + tail.map((c) => `${c.o.toFixed(2)}>${c.c.toFixed(2)} h${c.h.toFixed(2)} l${c.l.toFixed(2)} v${c.v.toFixed(1)}`).join(' | '))
}
