// Diagnosa pool-kandidat utk 5 kegagalan r2h (sh100)
import { forgeShSuite } from '../../src/lib/exam/stophunt-suite'
import { SH_VISIBLE } from '../../src/lib/exam/stophunt-forge'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'

const FAIL = [55, 59, 82, 94, 100]
const suite = forgeShSuite('sh100')
for (const num of FAIL) {
  const e = suite.find((s) => s.num === num)!
  const vis = e.candles.slice(0, SH_VISIBLE)
  const v = buildSgVision(vis)
  console.log(`\n=========== #${num} ${e.arch.id} [${e.diff}] truth=${e.truth} post=${e.postGrab}`)
  console.log(`  pool TRUTH: ${e.pool.jenis}/${e.pool.side}@${e.pool.level.toFixed(2)} sentuh=${e.pool.sentuhan} sweepIdx=${e.pool.sweepIdx}`)
  console.log(`  ACTIVE otak: ${v.active ? `${v.active.jenis}/${v.active.side}@${v.active.level.toFixed(2)} since=${v.active.barsSince} depth=${v.active.depthAtr.toFixed(2)} cDist=${v.active.closeDistAtr.toFixed(2)} reclaim=${v.active.reclaimed} volZ=${v.active.volZSweep.toFixed(2)} volRatio=${v.active.volRatioSweep.toFixed(2)} sentuh=${v.active.sentuhan}` : 'NULL'}`)
  console.log('  --- SEMUA KLASTER (termasuk tak-terfilter):')
  for (const p of v.pools) {
    const qual = p.swept && p.depthAtr >= 0.4 && p.sentuhan >= 1 && (p.volZSweep >= 0.5 || p.volRatioSweep >= 1.15)
    const why: string[] = []
    if (!p.swept) why.push('tak-swept')
    if (p.depthAtr < 0.4) why.push(`depth(${p.depthAtr.toFixed(2)})<0.4`)
    if (p.sentuhan < 1) why.push(`sentuh(${p.sentuhan})<1`)
    if (p.volZSweep < 0.5 && p.volRatioSweep < 1.15) why.push(`volZ(${p.volZSweep.toFixed(2)})<0.5 && ratio(${p.volRatioSweep.toFixed(2)})<1.15`)
    console.log(`    ${p.jenis}/${p.side}@${p.level.toFixed(2)} since=${p.barsSince} depth=${p.depthAtr.toFixed(2)} cDist=${p.closeDistAtr.toFixed(2)} reclaim=${p.reclaimed ? 1 : 0} volZ=${p.volZSweep.toFixed(2)} ratio=${p.volRatioSweep.toFixed(2)} sentuh=${p.sentuhan} pbody=${p.postBounceMaxBodyAtr.toFixed(2)} pvol=${p.postVolMean.toFixed(2)} ${qual ? '<QUAL>' : `<GAGAL: ${why.join(',')}>`}`)
  }
}
