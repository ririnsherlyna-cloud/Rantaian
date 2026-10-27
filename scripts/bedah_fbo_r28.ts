// ============================================================
// BEDAH FORENSIK R28 — kategorisasi SEMUA kegagalan otak v1.26
// di 3 seed (fbo100/fbo200/fbo300) utk siklus Uji->Bedah->Benahi.
//
// Kategori:
//   A. GUARD-SKIP     : guard sejati di-SKIP (tak ada event)
//   B. GUARD-WAIT     : guard sejati di-WAIT tapi trigger tak menyala
//   C. FBO-FADE-LIQ   : fade terkonfirmasi tapi stop tersentuh (PUNISH timing)
//   D. FBO-FOLLOW-LIQ : FB-L4 mengikuti breakout palsu (drift-vs-acceptance bocor)
//   E. FBO-WAIT-MISS  : WAIT trigger tak menyala padahal false breakout nyata
//   F. FBO-SKIP       : FBO tergerbang di-SKIP (tak ada event)
// ============================================================

import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

const VERSI = '1.27'

interface F { seed: string; num: number; fam: string; diff: string; kind: string; cat: string
  aksi: string; mode: string; truth: string; net: number | null
  lvlFound: number; lvlTruth: number; preT: number; pierce: number; lastP: number
  closeNow: number; closesBeyond: number; volBrk: number; volFollow: number; volLate: number
  maxBeyond: number; wickB: number; rejecB: number; crossBack: boolean; climax: boolean
  baitNet: number; trigFired: boolean; horizonMaxBeyondExtreme: number; rules: string; body6: number; floatB: number }

function horizonMaxBeyond(e: ReturnType<typeof forgeFboSuite>[number], arah: string): number {
  const atr = 1
  const ext = e.level.extreme
  let m = 0
  for (let i = FBO_VISIBLE; i < e.candles.length; i++) {
    const c = e.candles[i]
    const b = e.breakArah === 'NAIK' ? (c.h - ext) : (ext - c.l)
    m = Math.max(m, b)
  }
  return m
}

function run(seed: string): F[] {
  const out: F[] = []
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(seed) : forgeFboSuite(seed)
    for (const e of suite) {
      const visible = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const k = fbVonis(visible, VERSI)
      const led = simFboTrade(
        { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel },
        e.entry, horizon,
      )
      let hasil: 'B' | 'G'
      if (led.mode === 'NO-TRADE') {
        const bait = simBaitFbo(e.breakArah, e.entry, horizon)
        hasil = bait.stopHit || (bait.netPct ?? 0) <= 0 ? 'B' : 'G'
      } else hasil = (led.netPct ?? -1) > 0 && !led.stopHit ? 'B' : 'G'
      if (hasil === 'B') continue
      // kategori
      let cat: string
      if (e.kind === 'GUARD') cat = k.aksi === 'SKIP' ? 'A-GUARD-SKIP' : 'B-GUARD-WAIT'
      else if (led.mode === 'ENTRY' && led.stopHit) cat = k.arah === e.truth ? 'C-FADE-LIQ' : 'D-FOLLOW-LIQ'
      else if (led.mode === 'WAIT-HIT' && led.stopHit) cat = k.arah === e.truth ? 'C-FADE-LIQ' : 'D-FOLLOW-LIQ'
      else if (k.aksi === 'WAIT') cat = 'E-WAIT-MISS'
      else if (k.aksi === 'SKIP') cat = 'F-FBO-SKIP'
      else cat = 'X-LAIN'
      // apakah trigger WAIT akan menyala di horizon (fisik)?
      let trigFired = false
      if (k.aksi === 'WAIT' && k.triggerLevel) {
        trigFired = k.arah === 'NAIK'
          ? horizon.slice(0, 8).some((c) => c.c >= (k.triggerLevel as number))
          : horizon.slice(0, 8).some((c) => c.c <= (k.triggerLevel as number))
      }
      const bait = simBaitFbo(e.breakArah, e.entry, horizon)
      out.push({
        seed, num: e.num, fam: e.fam, diff: e.diff, kind: e.kind, cat,
        aksi: `${k.aksi}/${k.arah}`, mode: led.mode, truth: e.truth, net: led.netPct,
        lvlFound: k.level.level, lvlTruth: e.level.level, preT: k.brk?.preTouches ?? 0,
        pierce: k.brk?.firstPierceIdx ?? -1, lastP: k.brk?.lastPierceIdx ?? -1,
        closeNow: k.brk?.closeNowAtr ?? 0, closesBeyond: k.brk?.closesBeyond ?? 0,
        volBrk: k.brk?.volRatioBreak ?? 0, volFollow: k.brk?.volFollow ?? 0, volLate: k.brk?.volLate ?? 0,
        maxBeyond: k.brk?.maxBeyondAtr ?? 0, wickB: k.brk?.wickBeyondAtr ?? 0, rejecB: k.brk?.rejecBodyAtr ?? 0,
        crossBack: k.brk?.crossBack ?? false, climax: k.brk?.climax ?? false,
        baitNet: bait.netPct ?? 0, trigFired,
        horizonMaxBeyondExtreme: horizonMaxBeyond(e, k.arah),
        rules: k.pelajaranAktif.join(','),
        body6: (() => { const l6 = visible.slice(-6); const atr = k.fitur.atr || 1; return l6.reduce((a, c) => a + Math.abs(c.c - c.o), 0) / l6.length / atr })(),
        floatB: (() => { const atr = k.fitur.atr || 1; const l6 = visible.slice(-6); return k.level.side === 'ATAS' ? (Math.min(...l6.map((c) => c.l)) - k.level.level) / atr : (k.level.level - Math.max(...l6.map((c) => c.h))) / atr })(),
      })
    }
  }
  return out
}

const all = [...run(process.argv[2] ?? 'fbo100'), ...run(process.argv[3] ?? 'fbo200'), ...run(process.argv[4] ?? 'fbo300')]
const byCat = new Map<string, F[]>()
for (const f of all) {
  const a = f.cat.split('-')[0]
  byCat.set(a, [...(byCat.get(a) ?? []), f])
}

console.log('='.repeat(110))
console.log(`BEDAH R28 — total kegagalan v1.26 di 3 seed: ${all.length} (dari 372)`)
for (const [c, fs] of [...byCat.entries()].sort()) {
  console.log(`\n### ${c} — ${fs.length} kegagalan`)
  // distribusi fam/diff
  const byFam = new Map<string, number>()
  const byDiff = new Map<string, number>()
  for (const f of fs) {
    byFam.set(f.fam, (byFam.get(f.fam) ?? 0) + 1)
    byDiff.set(f.diff, (byDiff.get(f.diff) ?? 0) + 1)
  }
  console.log('  fam:', [...byFam.entries()].map(([k, v]) => `${k}=${v}`).join(' '))
  console.log('  diff:', [...byDiff.entries()].map(([k, v]) => `${k}=${v}`).join(' '))
  for (const f of fs) {
    console.log(
      `  ${f.seed} #${String(f.num).padStart(3)} ${f.fam.padEnd(16)} ${f.diff.padEnd(6)} aksi=${f.aksi.padEnd(5)} mode=${f.mode.padEnd(9)} truth=${f.truth} net=${f.net !== null ? f.net.toFixed(2) : '—'}` +
      ` | lvl ${f.lvlFound.toFixed(2)} vs ${f.lvlTruth.toFixed(2)} preT=${f.preT} pierce=${f.pierce} lastP=${f.lastP}` +
      ` | closeNow=${f.closeNow.toFixed(2)} closesOut=${f.closesBeyond} volBrk=${f.volBrk.toFixed(1)} vF=${f.volFollow.toFixed(2)} vL=${f.volLate.toFixed(2)}` +
      ` | maxBeyond=${f.maxBeyond.toFixed(2)} wick=${f.wickB.toFixed(2)} rej=${f.rejecB.toFixed(2)} xB=${f.crossBack ? 'Y' : 'n'} clim=${f.climax ? 'Y' : 'n'}` +
      ` | bait=${f.baitNet.toFixed(1)} trigFired=${f.trigFired ? 'Y' : 'n'} hMaxBeyondExt=${f.horizonMaxBeyondExtreme.toFixed(2)} body6=${f.body6.toFixed(2)} floatB=${f.floatB.toFixed(2)} rules=[${f.rules}]`,
    )
  }
}
