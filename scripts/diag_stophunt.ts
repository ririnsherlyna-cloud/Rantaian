// DIAGNOSTIK: utk setiap ujian, cari klaster pool terdekat dgn TRUTH level,
// lalu cetak fitur aktualnya (visits, bounce, mom50, depth, volZ, barsSince,
// keputusan otak) — bahan kalibrasi ambang empiris.
import { forgeShSuite } from '../src/lib/exam/stophunt-suite'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { SH_VISIBLE } from '../src/lib/exam/stophunt-forge'

const suite = forgeShSuite('sh100')
const byArch = new Map<string, string[]>()
for (const e of suite) {
  const vis = buildSgVision(e.candles.slice(0, SH_VISIBLE))
  // klaster terdekat ke truth level pada sisi truth
  const cands = vis.pools.filter((p) => p.side === e.pool.side)
  cands.sort((a, b) => Math.abs(a.level - e.pool.level) - Math.abs(b.level - e.pool.level))
  const P = cands[0]
  const A = vis.active
  const row = [
    `#${e.num}`, e.diff,
    `truthPool=${e.pool.jenis}@${e.pool.level.toFixed(2)}`,
    P ? `near=${P.jenis}@${P.level.toFixed(2)} v=${P.sentuhan} b=${P.maxBounceAtr.toFixed(2)} d=${P.depthAtr.toFixed(2)} sw=${P.swept ? 1 : 0} bs=${P.barsSince} vz=${P.volZSweep.toFixed(1)} cD=${P.closeDistAtr.toFixed(2)} pV=${P.postVolMean.toFixed(2)}` : 'near=-',
    `mom50=${vis.mom50Atr.toFixed(2)} cdB=${vis.consecDownBig} cuB=${vis.consecUpBig}`,
    A ? `AKTIF=${A.jenis}@${A.level.toFixed(2)}` : 'AKTIF=-',
  ].join(' | ')
  const arr = byArch.get(e.arch.id) ?? []
  arr.push(row)
  byArch.set(e.arch.id, arr)
}
for (const [k, rows] of byArch) {
  console.log(`\n=== ${k} ===`)
  for (const r of rows) console.log(' ' + r)
}
