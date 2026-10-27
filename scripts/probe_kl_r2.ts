// PROBE BEDAH r2 — deteksi pump&dump (18 gagal) & level FBO (40 lebar)
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'

const suite = forgeKlSuite('kl100')
let pdGagal = 0, fboLebar = 0
for (const e of suite) {
  const vis = e.candles.slice(0, KL_VISIBLE)
  const v = buildSgVision(vis)
  const n = vis.length
  const atr = Math.max(v.atr, 1e-9)
  // replikasi klPdScan inti
  const f0 = Math.min(24, Math.max(0, n - 36))
  const f1 = Math.min(40, n - 14)
  const midHi = Math.max(...vis.slice(f0, f1).map((c) => c.h))
  const midLo = Math.min(...vis.slice(f0, f1).map((c) => c.l))
  const midMove = (midHi - midLo) / atr
  const momTengah = (vis[f1 - 1].c - vis[f0].c) / atr
  const pumpArah = momTengah >= 1.5 ? 'NAIK' : momTengah <= -1.5 ? 'TURUN' : 'TIDAK-JELAS'
  const volPeak = Math.max(...vis.slice(f0, f1).map((c) => c.v))
  const vols = vis.map((c) => c.v)
  const mean30 = vols.slice(Math.max(0, n - 30)).reduce((a, b) => a + b, 0) / Math.max(1, vols.slice(Math.max(0, n - 30)).length)
  const sd30 = Math.max(Math.sqrt(vols.slice(Math.max(0, n - 30)).reduce((a, b) => a + (b - mean30) ** 2, 0) / Math.max(1, vols.slice(Math.max(0, n - 30)).length - 1)), 1e-9)
  const volPeakZ = (volPeak - v.volMean) / sd30
  const pump = midMove >= 2.2 && pumpArah !== 'TIDAK-JELAS' && volPeakZ >= 0.8
  const lastC = vis[n - 1].c
  const fall = (midHi - lastC) / atr
  const rise = (lastC - midLo) / atr
  const dump = pump && (pumpArah === 'NAIK' ? fall >= 1.2 : rise >= 1.2)
  const pd = pump && dump
  if (!pd) {
    pdGagal++
    console.log(`PD-n #${e.num} ${e.fam} [${e.diff}] gDir=${e.truth} | midMove=${midMove.toFixed(2)} momTengah=${momTengah.toFixed(2)} arah=${pumpArah} volZ=${volPeakZ.toFixed(2)} pump=${pump} fall=${fall.toFixed(2)} rise=${rise.toFixed(2)} dump=${dump}`)
  }
  // FBO level
  const strukEnd = Math.max(6, n - 31)
  const struk = vis.slice(Math.max(0, n - 58), strukEnd)
  const fboHi = Math.max(...struk.map((c) => c.h))
  const fboLo = Math.min(...struk.map((c) => c.l))
  const dHi = Math.abs(fboHi - e.lvlFbo)
  const dLo = Math.abs(fboLo - e.lvlFbo)
  const dmin = Math.min(dHi, dLo)
  if (dmin > 1.2 * atr) {
    fboLebar++
    console.log(`FBO-lebar #${e.num} ${e.fam} | truth.lvlFbo=${e.lvlFbo.toFixed(2)} fboHi=${fboHi.toFixed(2)} (d=${dHi.toFixed(2)}) fboLo=${fboLo.toFixed(2)} (d=${dLo.toFixed(2)}) atr=${atr.toFixed(2)} puncakPump=${e.puncakPump.toFixed(2)} pl=${e.pl.toFixed(2)}`)
  }
}
console.log(`\nPD gagal: ${pdGagal}/100 | FBO level lebar: ${fboLebar}/100`)
