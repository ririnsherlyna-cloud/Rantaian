// ============================================================
// PEMISAH GUARD vs PUNISH — ukur fitur badan/momentum float
// pada keluarga: follow-fail, climax-fail, momentum-fail,
// weak (harus TIDAK follow) vs g-accept, g-trend-cont,
// g-retest-hold (harus follow).
//   bun scripts/inst_fbo_r40b.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

interface Row {
  ns: string; num: number; fam: string; diff: string
  mB6: number; mB12: number; mB20: number
  net10: number; net20: number; churn20: number; eff20: number
  upFrac12: number; vL: number; vF: number; closeNow: number; cOut: number
  wick: number; rej: number; xB: number; mom50: number; dEma: number
  eDema21: number
}

const out: Row[] = []
for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600']) {
  const suite = forgeFboSuite(ns)
  const guards = forgeFboGuardSuite(ns)
  for (const e of [...suite, ...guards]) {
    if (!['fbo-follow-fail', 'fbo-climax-fail', 'fbo-momentum-fail', 'fbo-weak', 'g-accept', 'g-trend-cont', 'g-retest-hold'].includes(e.fam)) continue
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const n = visible.length
    const fitur = buildSgVision(visible)
    const atr = Math.max(fitur.atr, 1e-9)
    const levels = buildFboLevels(visible)
    const events = scanBreakEvents(visible, levels, fitur.volMean, atr)
    const E = events[0] ?? null
    if (!E) continue
    const body = (i: number): number => Math.abs(visible[i].c - visible[i].o) / atr
    const sgn = (i: number): number => (visible[i].c - visible[i].o) / atr
    const mB = (k: number): number => {
      let s = 0
      for (let i = n - k; i < n; i++) s += body(i)
      return s / k
    }
    const closes = visible.map((c) => c.c)
    const netK = (k: number): number => ((E.side === 'ATAS' ? 1 : -1) * (closes[n - 1] - closes[n - 1 - k])) / atr
    let churn = 0
    for (let i = n - 20 + 1; i < n; i++) churn += Math.abs(closes[i] - closes[i - 1]) / atr
    const net20 = netK(20)
    let up12 = 0
    for (let i = n - 12; i < n; i++) if (sgn(i) * (E.side === 'ATAS' ? 1 : -1) > 0) up12++
    out.push({
      ns, num: e.num, fam: e.fam, diff: e.diff,
      mB6: mB(6), mB12: mB(12), mB20: mB(20),
      net10: netK(10), net20, churn20: churn, eff20: churn > 0 ? net20 / churn : 0,
      upFrac12: up12 / 12, vL: E.volLate, vF: E.volFollow, closeNow: E.closeNowAtr,
      cOut: E.closesBeyond, wick: E.wickBeyondAtr, rej: E.rejecBodyAtr, xB: E.crossBack ? 1 : 0,
      mom50: fitur.mom50Atr ?? 0, dEma: fitur.distEma21Atr, eDema21: E.side === 'ATAS' ? fitur.distEma21Atr : -fitur.distEma21Atr,
    })
  }
}

// cetak tabel per keluarga
for (const fam of ['g-accept', 'g-trend-cont', 'g-retest-hold', 'fbo-follow-fail', 'fbo-climax-fail', 'fbo-momentum-fail', 'fbo-weak']) {
  const rows = out.filter((r) => r.fam === fam)
  console.log(`\n=== ${fam} (n=${rows.length}) ===`)
  console.log('ns_num          diff    mB6   mB12  mB20  net10  net20  eff20  up12  vL    vF    cN     cOut wick rej  xB mom50  dEma')
  for (const r of rows) {
    console.log(
      `${r.ns}_${String(r.num).padStart(3)} ${r.diff.padEnd(7)} ` +
      `${r.mB6.toFixed(2)}  ${r.mB12.toFixed(2)}  ${r.mB20.toFixed(2)}  ${r.net10.toFixed(2).padStart(5)}  ${r.net20.toFixed(2).padStart(5)}  ${r.eff20.toFixed(2).padStart(5)}  ` +
      `${r.upFrac12.toFixed(2)} ${r.vL.toFixed(2)} ${r.vF.toFixed(2)}  ${r.closeNow.toFixed(2).padStart(5)} ${String(r.cOut).padStart(4)} ` +
      `${r.wick.toFixed(2)} ${r.rej.toFixed(2)}  ${r.xB}  ${r.mom50.toFixed(1).padStart(5)} ${r.dEma.toFixed(2)}`,
    )
  }
}
