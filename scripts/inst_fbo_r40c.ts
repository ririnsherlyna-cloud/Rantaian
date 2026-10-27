// ============================================================
// DATASET FALLTHROUGH — semua ujian yang jatuh ke WAIT-fade
// (FB-L7/FB-L3/FB-L6) atau SKIP, dgn fitur lengkap dari event
// teratas + event level-sejati. Untuk pencarian pemisah
// follow-vs-fade berbasis data.
//   bun scripts/inst_fbo_r40c.ts > research/ujian-fbo/fall-r40.csv
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE, simFboTrade, simBaitFbo } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis, type FboBreakEvent } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

interface Feat {
  ns: string; num: number; fam: string; kind: string; diff: string; truth: string
  perluFollow: boolean // guard gagal yang butuh follow
  // fitur event TOP
  t_pT: number; t_umur: number; t_cOut: number; t_cN: number; t_maxB: number; t_vBrk: number
  t_vF: number; t_vL: number; t_wick: number; t_rej: number; t_xB: number; t_eff: number
  t_p7: number; t_dir: number; t_late: number; t_early: number; t_rank: number
  t_lvlJenis: string; t_lvlDist: number // jarak level top dari truth level (ATR)
  // fitur event SEJATI (dekat truthLevel)
  s_ada: boolean; s_pT: number; s_umur: number; s_cOut: number; s_cN: number; s_vBrk: number
  s_vF: number; s_vL: number; s_eff: number; s_p7: number; s_dir: number; s_maxB: number; s_rank: number
  // fitur harga global
  mom12: number; mom50: number; dEma21: number; net10: number; net20: number
  mB12: number; up12: number; eff20: number
}

const out: Feat[] = []
for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600']) {
  const suite = forgeFboSuite(ns)
  const guards = forgeFboGuardSuite(ns)
  for (const e of [...suite, ...guards]) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const horizon = e.candles.slice(FBO_VISIBLE)
    const k = fbVonis(visible, '1.27')
    // hanya fallthrough: WAIT-fade / WAIT momentum / SKIP
    if (!['FB-L7', 'FB-L3', 'FB-L6', 'FB-L9'].some((r) => k.pelajaranAktif.includes(r))) continue
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
    let hasil: 'BERHASIL' | 'GAGAL'
    if (led.mode === 'NO-TRADE') {
      const bait = simBaitFbo(e.breakArah, e.entry, e.candles.slice(FBO_VISIBLE))
      hasil = (bait.stopHit || (bait.netPct ?? 0) <= 0) ? 'BERHASIL' : 'GAGAL'
    } else hasil = (led.netPct ?? -1) > 0 && !led.stopHit ? 'BERHASIL' : 'GAGAL'
    const perluFollow = e.kind === 'GUARD' && hasil === 'GAGAL'
    // trap yang lulus via WAIT-fade juga masuk dataset (harus TETAP fade)
    const n = visible.length
    const fitur = buildSgVision(visible)
    const atr = Math.max(fitur.atr, 1e-9)
    const levels = buildFboLevels(visible)
    const events = scanBreakEvents(visible, levels, fitur.volMean, atr)
    const E = events[0] ?? null
    const S = events.find((ev) => Math.abs(ev.lvl.level - e.level.level) <= 0.6 * atr && ev.side === e.level.side) ?? null
    const fx = (ev: FboBreakEvent | null) => ev ? {
      pT: ev.preTouches, umur: n - 1 - ev.firstPierceIdx, cOut: ev.closesBeyond,
      cN: ev.closeNowAtr, maxB: ev.maxBeyondAtr, vBrk: ev.volRatioBreak, vF: ev.volFollow,
      vL: ev.volLate, wick: ev.wickBeyondAtr, rej: ev.rejecBodyAtr, xB: ev.crossBack ? 1 : 0,
      eff: ev.effAtr, p7: ev.push7Atr, dir: ev.dirCons, late: ev.lateMoveAtr, early: ev.earlyMoveAtr,
    } : null
    const t = fx(E)
    const s = fx(S)
    const closes = visible.map((c) => c.c)
    const netK = (kk: number): number => ((e.breakArah === 'NAIK' ? 1 : -1) * (closes[n - 1] - closes[n - 1 - kk])) / atr
    const body = (i: number): number => Math.abs(visible[i].c - visible[i].o) / atr
    let mB12 = 0
    for (let i = n - 12; i < n; i++) mB12 += body(i)
    mB12 /= 12
    let up12 = 0
    for (let i = n - 12; i < n; i++) if (((visible[i].c - visible[i].o) / atr) * (e.breakArah === 'NAIK' ? 1 : -1) > 0) up12++
    let churn = 0
    for (let i = n - 19; i < n; i++) churn += Math.abs(closes[i] - closes[i - 1]) / atr
    const net20 = netK(20)
    out.push({
      ns, num: e.num, fam: e.fam, kind: e.kind, diff: e.diff, truth: e.truth, perluFollow,
      t_pT: t?.pT ?? -1, t_umur: t?.umur ?? -1, t_cOut: t?.cOut ?? -1, t_cN: t?.cN ?? -9,
      t_maxB: t?.maxB ?? -1, t_vBrk: t?.vBrk ?? -1, t_vF: t?.vF ?? -1, t_vL: t?.vL ?? -1,
      t_wick: t?.wick ?? -1, t_rej: t?.rej ?? -1, t_xB: t?.xB ?? -1, t_eff: t?.eff ?? -1,
      t_p7: t?.p7 ?? -9, t_dir: t?.dir ?? -1, t_late: t?.late ?? -9, t_early: t?.early ?? -1,
      t_rank: E?.rank ?? -1, t_lvlJenis: E?.lvl.jenis ?? 'none',
      t_lvlDist: E ? Math.abs(E.lvl.level - e.level.level) / atr : -1,
      s_ada: !!S, s_pT: s?.pT ?? -1, s_umur: s?.umur ?? -1, s_cOut: s?.cOut ?? -1,
      s_cN: s?.cN ?? -9, s_vBrk: s?.vBrk ?? -1, s_vF: s?.vF ?? -1, s_vL: s?.vL ?? -1,
      s_eff: s?.eff ?? -1, s_p7: s?.p7 ?? -9, s_dir: s?.dir ?? -1, s_maxB: s?.maxB ?? -1,
      s_rank: S?.rank ?? -1,
      mom12: fitur.mom12Atr, mom50: fitur.mom50Atr ?? 0, dEma21: fitur.distEma21Atr,
      net10: netK(10), net20, mB12, up12: up12 / 12, eff20: churn > 0 ? net20 / churn : 0,
    })
  }
}

// CSV
const cols = Object.keys(out[0]) as (keyof Feat)[]
console.log(cols.join(','))
for (const r of out) console.log(cols.map((c) => String(r[c])).join(','))

// ringkasan cepat ke stderr
console.error(`\nTOTAL fallthrough: ${out.length}; perlu-follow: ${out.filter((r) => r.perluFollow).length}`)
const famCount = new Map<string, number>()
for (const r of out) famCount.set(r.fam, (famCount.get(r.fam) ?? 0) + 1)
console.error([...famCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '))
