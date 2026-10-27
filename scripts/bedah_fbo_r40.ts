// ============================================================
// BEDAH FORENSIK FBO r40 — semua kegagalan 3 seed latihan,
// dikategorikan + jejak gerbang lengkap per ujian.
//   bun scripts/bedah_fbo_r40.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE, type FboExam } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, scanRetestOfBroken, fbVonis, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { simFboTrade, simBaitFbo } from '../src/lib/exam/fbo-forge'

interface Fail {
  ns: string; num: number; fam: string; diff: string; kind: string
  truth: string; aksi: string; arah: string; mode: string; likuidasi: boolean
  kat: string // kategori akar
}

function kategorikan(e: FboExam, aksi: string, arah: string, mode: string, likuidasi: boolean): string {
  if (e.kind === 'GUARD') {
    if (mode === 'NO-TRADE') return aksi === 'SKIP' ? 'G-SKIP-tak-ada-event' : 'G-WAIT-terkonservatif'
    if (likuidasi) return arah === e.truth ? 'G-fade-salah-tren' : 'G-follow-terstop'
    return 'G-rugi-net'
  }
  // FBO
  if (mode === 'NO-TRADE') return 'F-no-trade-umpan-layar'
  if (likuidasi) return arah === e.truth ? 'F-fade-benar-terstop' : 'F-ikut-breakout-palsu'
  return 'F-rugi-net'
}

const all: Fail[] = []
for (const ns of ['fbo100', 'fbo200', 'fbo300']) {
  const suite = forgeFboSuite(ns)
  const guards = forgeFboGuardSuite(ns)
  for (const e of [...suite, ...guards]) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const horizon = e.candles.slice(FBO_VISIBLE)
    const k = fbVonis(visible, '1.27')
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
    let hasil: 'BERHASIL' | 'GAGAL'
    if (led.mode === 'NO-TRADE') {
      const bait = simBaitFbo(e.breakArah, e.entry, e.candles.slice(FBO_VISIBLE))
      hasil = (bait.stopHit || (bait.netPct ?? 0) <= 0) ? 'BERHASIL' : 'GAGAL'
    } else hasil = (led.netPct ?? -1) > 0 && !led.stopHit ? 'BERHASIL' : 'GAGAL'
    if (hasil === 'GAGAL') {
      all.push({ ns, num: e.num, fam: e.fam, diff: e.diff, kind: e.kind, truth: e.truth, aksi: k.aksi, arah: k.arah, mode: led.mode, likuidasi: led.stopHit, kat: kategorikan(e, k.aksi, k.arah, led.mode, led.stopHit) })
    }
  }
}

console.log(`TOTAL GAGAL: ${all.length}/372\n`)
const byKat = new Map<string, Fail[]>()
for (const f of all) { const a = byKat.get(f.kat) ?? []; a.push(f); byKat.set(f.kat, a) }
for (const [k, v] of [...byKat.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${k}: ${v.length}`)
  for (const f of v) console.log(`   ${f.ns} #${f.num} ${f.fam} [${f.diff}] aksi=${f.aksi}/${f.arah} truth=${f.truth} likuidasi=${f.likuidasi}`)
}

// ---- jejak gerbang lengkap utk setiap kegagalan (dump detail) ----
console.log('\n' + '='.repeat(100))
console.log('JEJAK GERBANG PER KEGAGALAN')
console.log('='.repeat(100))
for (const f of all) {
  const suite = f.num > 100 ? forgeFboGuardSuite(f.ns) : forgeFboSuite(f.ns)
  const e = suite.find((x) => x.num === f.num)!
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const n = visible.length
  const fitur = buildSgVision(visible)
  const atr = Math.max(fitur.atr, 1e-9)
  const levels = buildFboLevels(visible)
  const events = scanBreakEvents(visible, levels, fitur.volMean, atr)
  const fbr = scanRetestOfBroken(visible, levels, atr)
  console.log(`\n### ${f.ns} #${f.num} ${f.fam} [${f.diff}] ${f.kat} | truth=${e.truth} breakArah=${e.breakArah}`)
  console.log(`  truthLevel=${e.level.level.toFixed(2)} side=${e.level.side} | mom12=${fitur.mom12Atr.toFixed(2)} mom50=${fitur.mom50Atr?.toFixed(2) ?? '—'} dEma21=${fitur.distEma21Atr.toFixed(2)} dEma50=${fitur.distEma50Atr?.toFixed(2) ?? '—'} recentBreakUp=${fitur.recentBreakUp} recentBreakDn=${fitur.recentBreakDown}`)
  if (!events.length) {
    console.log(`  TANPA EVENT break | FB-R ${fbr ? `ADA lvl=${fbr.lvl.level.toFixed(2)} side=${fbr.side} approach=${fbr.approachAtr.toFixed(2)} hist=${fbr.histCloses}` : 'tidak ada'}`)
    continue
  }
  const E: FboBreakEvent = events[0]
  console.log(`  EVENT#0 lvl=${E.lvl.level.toFixed(2)}(${E.lvl.jenis}) side=${E.side} rank=${E.rank.toFixed(2)} pierce=${E.firstPierceIdx}..${E.lastPierceIdx} umurBreak=${n - 1 - E.firstPierceIdx} preT=${E.preTouches} retest=${E.retest}`)
  console.log(`    closeNow=${E.closeNowAtr.toFixed(2)} closesOut=${E.closesBeyond} maxBeyond=${E.maxBeyondAtr.toFixed(2)} volBrk=${E.volRatioBreak.toFixed(2)} vF=${E.volFollow.toFixed(2)} vL=${E.volLate.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)} rej=${E.rejecBodyAtr.toFixed(2)} xB=${E.crossBack} clim=${E.climax}`)
  console.log(`    eff=${E.effAtr.toFixed(2)} push7=${E.push7Atr.toFixed(2)} dirCons=${E.dirCons.toFixed(2)} late=${E.lateMoveAtr.toFixed(2)} early=${E.earlyMoveAtr.toFixed(2)}`)
  // jejak gerbang L4
  const last6 = visible.slice(-6)
  const minLow6 = Math.min(...last6.map((c) => c.l))
  const maxHi6 = Math.max(...last6.map((c) => c.h))
  const floatB6 = E.side === 'ATAS' ? (minLow6 - E.lvl.level) / atr : (E.lvl.level - maxHi6) / atr
  const tiny10 = visible.slice(-10).filter((c) => Math.abs(c.c - c.o) <= 0.2 * atr).length
  const matureAccept = n - 1 - E.firstPierceIdx >= 25
  const momentumTransfer = E.lateMoveAtr >= 1.0 && E.lateMoveAtr >= 0.25 * E.earlyMoveAtr
  const farOk = E.closeNowAtr <= 3.0 || (n - 1 - E.firstPierceIdx >= 27 && E.effAtr >= 0.25 && momentumTransfer)
  const volFade = E.volLate < 0.55 * Math.max(E.volFollow, 0.01)
  const overExt = fitur.distEma21Atr >= 2.4 && fitur.mom12Atr >= 2.4 && E.push7Atr < 0.8
  const g = (nama: string, ok: boolean, detail = '') => console.log(`    ${ok ? 'PASS' : 'FAIL'} ${nama} ${detail}`)
  if (f.kind === 'GUARD') {
    console.log('  GERBANG FB-L4 (acceptance follow):')
    g('umur>=10', n - E.firstPierceIdx >= 10, `=${n - E.firstPierceIdx}`)
    g('closesOut>=2', E.closesBeyond >= 2, `=${E.closesBeyond}`)
    g('closeNow>=0.25', E.closeNowAtr >= 0.25, `=${E.closeNowAtr.toFixed(2)}`)
    g('farOk', farOk, `closeNow<=3 atau mature27+eff+transfer | late=${E.lateMoveAtr.toFixed(2)} early=${E.earlyMoveAtr.toFixed(2)} mature=${n - 1 - E.firstPierceIdx}`)
    g('!crossBack', !E.crossBack)
    g('vF>=0.9', E.volFollow >= 0.9, `=${E.volFollow.toFixed(2)}`)
    g('vL>=0.7', E.volLate >= 0.7, `=${E.volLate.toFixed(2)}`)
    g('!volFade', !volFade, `vL=${E.volLate.toFixed(2)} vs 0.55vF=${(0.55 * E.volFollow).toFixed(2)}`)
    g('eff>=0.25', E.effAtr >= 0.25, `=${E.effAtr.toFixed(2)}`)
    g('push7>=0.85', E.push7Atr >= 0.85, `=${E.push7Atr.toFixed(2)}`)
    g('dirCons>=0.6', E.dirCons >= 0.6, `=${E.dirCons.toFixed(2)}`)
    g('tiny10<=8', tiny10 <= 8, `=${tiny10}`)
    g('!climax', !E.climax, `volBrk=${E.volRatioBreak.toFixed(2)}`)
    g('wick<=0.9', E.wickBeyondAtr <= 0.9, `=${E.wickBeyondAtr.toFixed(2)}`)
    g('!overExt', !overExt, `dEma=${fitur.distEma21Atr.toFixed(2)} mom12=${fitur.mom12Atr.toFixed(2)} push7=${E.push7Atr.toFixed(2)}`)
    console.log('  GERBANG FB-L4b (retest-hold):')
    g('floatB6 in [-0.5,0.55]', floatB6 >= -0.5 && floatB6 <= 0.55, `=${floatB6.toFixed(2)}`)
    g('vF>=0.95', E.volFollow >= 0.95, `=${E.volFollow.toFixed(2)}`)
  } else {
    console.log('  GERBANG FB-L1 (close-back):')
    g('closeNow in [-3.2,-0.15]', E.closeNowAtr <= -0.15 && E.closeNowAtr >= -3.2, `=${E.closeNowAtr.toFixed(2)}`)
    g('umurLastPierce<=11', n - 1 - E.lastPierceIdx <= 11, `=${n - 1 - E.lastPierceIdx}`)
    g('bukti xB/rej/wick', E.crossBack || E.rejecBodyAtr >= 0.35 || E.wickBeyondAtr >= 0.5, `xB=${E.crossBack} rej=${E.rejecBodyAtr.toFixed(2)} wick=${E.wickBeyondAtr.toFixed(2)}`)
    g('(closesOut>=8 | maxB>=1.0)', E.closesBeyond >= 8 || E.maxBeyondAtr >= 1.0, `closesOut=${E.closesBeyond} maxB=${E.maxBeyondAtr.toFixed(2)}`)
    const acceptanceKuat = E.closesBeyond >= 8 && E.volFollow >= 0.9
    const buktiKuat = E.closeNowAtr <= -0.5 && E.rejecBodyAtr >= 0.5
    g('veto-acceptance', !acceptanceKuat || buktiKuat, `acceptKuat=${acceptanceKuat} buktiKuat=${buktiKuat}`)
    console.log('  GERBANG FB-L2 (wick-reject):')
    g('wick>=0.5 & maxB>=0.9', E.wickBeyondAtr >= 0.5 && E.maxBeyondAtr >= 0.9, `wick=${E.wickBeyondAtr.toFixed(2)} maxB=${E.maxBeyondAtr.toFixed(2)}`)
    console.log('  GERBANG FB-L4c (fresh-break):')
    g('umur<=5', n - 1 - E.firstPierceIdx <= 5, `=${n - 1 - E.firstPierceIdx}`)
    g('mom12<=4.5', Math.abs(fitur.mom12Atr) <= 4.5, `=${fitur.mom12Atr.toFixed(2)}`)
    g('dEma21 veto (BARU)', fitur.distEma21Atr < 2.4, `=${fitur.distEma21Atr.toFixed(2)}`)
  }
}
