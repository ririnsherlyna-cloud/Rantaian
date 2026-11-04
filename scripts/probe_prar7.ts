// EKSTRAK TABEL FITUR penuh (TSV) utk analisis pembeda h3.
// Semua fitur dari visible saja. Output: scripts/tmp/fitur_h3.tsv
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { writeFileSync, mkdirSync } from 'fs'

const nsList = ['pr100', 'pr100b', 'pr100c']
const rows: string[] = ['ns\tnum\tfam\tarah\th3\td\trecl\tbs\tdep\tm1\tm3\tvolZ1\tbody1\twt1\twb1\tpost\tvolZsapu\tbsSweep']
for (const ns of nsList) {
  for (const u of forgeKlSuite(ns)) {
    const visible = u.candles.slice(0, KL_VISIBLE)
    const v = klVonis(visible)
    const f = buildSgVision(visible)
    const atr = Math.max(f.atr, 1e-9)
    const n = visible.length
    const c = visible.map((x) => x.c)
    const d = v.pool.side === 'TAK-JELAS' ? null : (c[n - 1] - v.pool.level) / atr
    const m1 = (c[n - 1] - visible[n - 1].o) / atr
    const m3 = (c[n - 1] - c[n - 4]) / atr
    const volMean = visible.slice(-20).reduce((s, x) => s + x.v, 0) / 20
    const volSd = Math.max(Math.sqrt(visible.slice(-20).reduce((s, x) => s + (x.v - volMean) ** 2, 0) / 20), 1e-9)
    const volZ1 = (visible[n - 1].v - volMean) / volSd
    const body1 = (visible[n - 1].c - visible[n - 1].o) / atr
    const rng = Math.max(visible[n - 1].h - visible[n - 1].l, 1e-9)
    const wt1 = (visible[n - 1].h - Math.max(visible[n - 1].c, visible[n - 1].o)) / rng
    const wb1 = (Math.min(visible[n - 1].c, visible[n - 1].o) - visible[n - 1].l) / rng
    // sapuan terakhir (dari kl pool idxSweep)
    const idxSweep = v.pool.side === 'TAK-JELAS' ? -1 : v.pool.barsSince // approx: barsSince sapuan
    rows.push([ns, u.num, u.fam, v.arah, h3fase(u, KL_VISIBLE, atr, u.entry), d === null ? 'NA' : d.toFixed(3),
      v.pool.reclaimed ? 1 : 0, v.pool.barsSince, v.pool.depthAtr.toFixed(2),
      m1.toFixed(3), m3.toFixed(3), volZ1.toFixed(2), body1.toFixed(3), wt1.toFixed(2), wb1.toFixed(2),
      v.grab.post, v.kl ? '' : '', String(idxSweep)].join('\t'))
  }
}
function h3fase(u: { candles: { c: number }[] }, KL_VISIBLE: number, atr: number, entry: number): string {
  const mv = (u.candles[KL_VISIBLE + 2].c - entry) / atr
  return Math.abs(mv) < 0.15 ? 'DATAR' : mv > 0 ? 'NAIK' : 'TURUN'
}
mkdirSync('scripts/tmp', { recursive: true })
writeFileSync('scripts/tmp/fitur_h3.tsv', rows.join('\n'))
console.log(`ditulis scripts/tmp/fitur_h3.tsv (${rows.length - 1} baris)`)
