// Bedah 5 kegagalan r2h — stop hunt
import { forgeShSuite } from '../../src/lib/exam/stophunt-suite'
import { SH_VISIBLE } from '../../src/lib/exam/stophunt-forge'

const d = (await Bun.file('research/ujian-stophunt/r2h.json').json()) as any
const gagal = d.rows.filter((r: any) => r.hasil === 'GAGAL')
console.log('FAILED:', gagal.map((r: any) => `#${r.num} ${r.arch}[${r.diff}] aksi=${r.aksi}/${r.arah} truth=${r.truth} post=${r.post} net=${r.netPct} mode=${r.mode}`).join('\n'))
console.log('\nsalahPost:', d.rows.filter((r: any) => !r.identifikasiGrab.benarPost).map((r: any) => `#${r.num} ${r.arch}[${r.diff}] brain=${r.identifikasiGrab.post ?? '-'} truth=${r.post} aksi=${r.aksi}`).join('\n'))
console.log('\nsalahJenis:', d.rows.filter((r: any) => !r.areaLikuiditas.benarJenis).map((r: any) => `#${r.num} ${r.arch}[${r.diff}] brain=${r.areaLikuiditas.jenis} truth=${r.poolTruth.jenis}`).join('\n'))

// detail candles utk gagal
const suite = forgeShSuite('sh100')
for (const r of gagal) {
  const e = suite.find((s: any) => s.num === r.num)
  if (!e) continue
  const vis = e.candles.slice(0, SH_VISIBLE)
  const hor = e.candles.slice(SH_VISIBLE)
  const last10 = vis.slice(-10).map((c: any) => `${c.o.toFixed(2)}/${c.h.toFixed(2)}/${c.l.toFixed(2)}/${c.c.toFixed(2)}v${c.v.toFixed(0)}`).join(' | ')
  const horN = hor.slice(0, 14).map((c: any) => c.c.toFixed(2)).join(',')
  console.log(`\n=== #${r.num} ${r.arch} [${r.diff}] truth=${e.truth} bait=${e.bait} post=${e.postGrab} pool=${e.pool.jenis}/${e.pool.side}@${e.pool.level.toFixed(2)} sweepIdx=${e.pool.sweepIdx}`)
  console.log(`  entryRef=${e.entry} movePct=${e.movePct.toFixed(2)} mfe=${e.mfePct.toFixed(2)} baitMfe=${e.baitMfePct.toFixed(2)}`)
  console.log(`  last10: ${last10}`)
  console.log(`  horizon14 close: ${horN}`)
  console.log(`  fitur: ${JSON.stringify(r.fiturRingkas)}`)
  console.log(`  alasan: ${r.alasan.join(' | ')}`)
}
