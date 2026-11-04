// Smoke test suite KOMPLEKS-5: gerbang profit, metrik, distribusi fitur
import { forgeKlSuite } from '../../src/lib/exam/kompleks-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { KL_VISIBLE } from '../../src/lib/exam/kompleks-forge'

const suite = forgeKlSuite('kl100')
let noise = 0
const flip: string[] = []
for (const e of suite) {
  if (e.noiseFlipped) { noise++; flip.push(`#${e.num} ${e.fam} move=${e.movePct.toFixed(2)} mfe=${e.mfePct.toFixed(2)} baitMfe=${e.baitMfePct.toFixed(2)}`) }
}
console.log(`noiseFlipped: ${noise}/100`)
for (const f of flip.slice(0, 25)) console.log('  ' + f)

// distribusi fitur otak pada 60 visible (utk kalibrasi brain v1.0)
const fets: Record<string, number[]> = { closeDistAtr: [], depthAtr: [], barsSince: [], bodyDom: [], postVolRatio: [], mom50: [], posInWin: [], volZSweep: [] }
for (const e of suite) {
  const vis = e.candles.slice(0, KL_VISIBLE)
  const v = buildSgVision(vis)
  const n = vis.length
  const winStart = Math.max(0, n - 22)
  const pool = v.pools.find((p) => p.swept && p.barsSince <= 10)
  fets.mom50.push(v.mom50Atr)
  fets.posInWin.push(v.posInWindow60)
  if (!pool) continue
  fets.closeDistAtr.push(pool.closeDistAtr)
  fets.depthAtr.push(pool.depthAtr)
  fets.barsSince.push(pool.barsSince)
  fets.volZSweep.push(pool.volZSweep)
  const swIdx = n - 1 - pool.barsSince
  const post = vis.slice(swIdx + 1)
  const bodyDom = post.length ? Math.max(...post.map((c) => Math.abs(c.c - c.o))) / v.atr : 0
  fets.bodyDom.push(bodyDom)
  fets.postVolRatio.push(post.length ? Math.max(...post.map((c) => c.v)) / v.volMean : 0)
}
for (const [k, arr] of Object.entries(fets)) {
  if (!arr.length) { console.log(`${k}: (kosong)`); continue }
  const s = [...arr].sort((a, b) => a - b)
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2)
  console.log(`${k}: n=${s.length} min=${q(0)} p10=${q(0.1)} med=${q(0.5)} p90=${q(0.9)} max=${q(1)}`)
}
console.log('\ncontoh ujian #1:', suite[0].fam, suite[0].diff, suite[0].truth, 'pl=', suite[0].pl.toFixed(2), 'puncakPump=', suite[0].puncakPump.toFixed(2), 'lvlFbo=', suite[0].lvlFbo.toFixed(2), 'extreme=', suite[0].extreme.toFixed(2))
