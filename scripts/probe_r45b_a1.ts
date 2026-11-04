// ============================================================
// PROBE r45b-A1 — ukur stop minimum utk 4 kasus drift-snap A1
// (3200#49, 3500#46/52, 3600#48): arah benar, stop 0.8% kena
// sebelum snap. Scan stopPct 0.8->3.0 cari minimal menang.
// Pakai: bun scripts/probe_r45b_a1.ts
// ============================================================
import { forgeFboSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'

const KASUS = [
  { ns: 'fbo3200', num: 49 },
  { ns: 'fbo3500', num: 46 },
  { ns: 'fbo3500', num: 52 },
  { ns: 'fbo3600', num: 48 },
]

for (const { ns, num } of KASUS) {
  const e = forgeFboSuite(ns).find((x) => x.num === num)!
  const cs = e.candles.slice(0, FBO_VISIBLE)
  const hor = e.candles.slice(FBO_VISIBLE)
  // rekonstruksi keputusan asli
  const { fbVonis } = await import('../src/lib/exam/fbo-brain')
  const k = fbVonis(cs, '1.38')
  console.log(`[${ns} #${num}] ${e.fam} truth=${e.truth} brain=${k.aksi}/${k.arah} pelajaran=${k.pelajaranAktif.join('+')} stop-asli=${k.stopPct?.toFixed(2)}%`)
  const baris: string[] = []
  for (let s = 0.8; s <= 3.001; s += 0.1) {
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: Math.round(s * 10) / 10, triggerLevel: k.triggerLevel }, e.entry, hor)
    const menang = led.mode !== 'NO-TRADE' && (led.netPct ?? -1) > 0 && !led.stopHit
    baris.push(`${s.toFixed(1)}:${menang ? 'MENANG' : 'kalah'}`)
  }
  console.log('   ' + baris.join(' '))
}
