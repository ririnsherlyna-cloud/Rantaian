// ============================================================
// PROBE r45b-G1 — kelayakan follow-break utk 8 residu klaster B/C
// (L7-WAIT / L1p-SKIP pada guard penerimaan-dalam). Scan stop.
// Pakai: bun scripts/probe_r45b_g1.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

const KASUS = [
  { ns: 'fbo3100', num: 105 }, { ns: 'fbo3100', num: 122 },
  { ns: 'fbo3200', num: 112 }, { ns: 'fbo3200', num: 116 },
  { ns: 'fbo3400', num: 103 }, { ns: 'fbo3400', num: 107 },
  { ns: 'fbo3400', num: 114 }, { ns: 'fbo3500', num: 123 },
]

for (const { ns, num } of KASUS) {
  const e = forgeFboGuardSuite(ns).find((x) => x.num === num)!
  const cs = e.candles.slice(0, FBO_VISIBLE)
  const hor = e.candles.slice(FBO_VISIBLE)
  const k = fbVonis(cs, '1.38')
  const b = k.brk
  const f = (x: number | undefined, d = 2) => (x === undefined ? '—' : x.toFixed(d))
  console.log(`[${ns} #${num}] ${e.fam} truth=${e.truth} breakArah=${e.breakArah} brain=${k.aksi}/${k.arah} ${k.pelajaranAktif.join('+')}`)
  if (b) {
    const umur = cs.length - 1 - b.firstPierceIdx
    console.log(`   EV ${b.side} cOut=${b.closesBeyond} cN=${f(b.closeNowAtr)} maxB=${f(b.maxBeyondAtr)} umur=${umur} vBrk=${f(b.volRatioBreak)} vF=${f(b.volFollow)} vL=${f(b.volLate)} vFP=${f(b.volFollowPre)} vLPre=${f(b.volLatePre)} rejec=${f(b.rejecBodyAtr)} dir=${f(b.dirCons)} momAl=${f(b.side === 'ATAS' ? 1 : -1) === 'x' ? '' : ''}`)
  }
  // bait gate saat ini (apa yg membuat guard gagal)
  const bait = simBaitFbo(e.breakArah, e.entry, hor)
  console.log(`   bait-ikut-break: net=${f(bait.netPct)}% stop=${bait.stopHit} (bait untung -> guard gagal bila NO-TRADE)`)
  const baris: string[] = []
  for (let s = 1.1; s <= 3.001; s += 0.1) {
    const led = simFboTrade({ aksi: 'ENTRY', arah: e.breakArah, targetPct: 2.2, stopPct: Math.round(s * 10) / 10, triggerLevel: null } as any, e.entry, hor)
    const menang = led.mode !== 'NO-TRADE' && (led.netPct ?? -1) > 0 && !led.stopHit
    baris.push(`${s.toFixed(1)}:${menang ? 'M' : 'k'}`)
  }
  console.log('   follow ' + baris.join(' '))
}
