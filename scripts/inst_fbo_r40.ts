// ============================================================
// INSTRUMENTASI RULE-FIRING FBO — tabel fitur + aturan yang
// menyala utk SEMUA ujian 6 seed (untuk pemisahan berbasis data
// antara guard-lulus vs trap-PUNISH).
//   bun scripts/inst_fbo_r40.ts > research/ujian-fbo/inst-r40.csv
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE, simFboTrade, simBaitFbo } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const rows: string[] = []
rows.push('ns,num,fam,kind,diff,hasil,aksi,arah,aturan,mode,net,likuidasi,mom12,mom50,dEma21,closeNow,closesOut,maxBeyond,volBrk,vF,vL,wick,rej,xB,climax,eff,push7,dirCons,late,early,umurBreak,preT,ret,floatB6,recentUp,recentDn')

for (const ns of ['fbo100', 'fbo200', 'fbo300', 'fbo400', 'fbo500', 'fbo600']) {
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
    const fitur = buildSgVision(visible)
    const atr = Math.max(fitur.atr, 1e-9)
    const levels = buildFboLevels(visible)
    const events = scanBreakEvents(visible, levels, fitur.volMean, atr)
    const E = events[0] ?? null
    const last6 = visible.slice(-6)
    const minLow6 = Math.min(...last6.map((c) => c.l))
    const maxHi6 = Math.max(...last6.map((c) => c.h))
    const floatB6 = E ? (E.side === 'ATAS' ? (minLow6 - E.lvl.level) / atr : (E.lvl.level - maxHi6) / atr) : 0
    const n = visible.length
    const umurBreak = E ? n - 1 - E.firstPierceIdx : -1
    const r = [
      ns, e.num, e.fam, e.kind, e.diff, hasil, k.aksi, k.arah,
      k.pelajaranAktif.join('|'), led.mode,
      led.netPct === null ? 'NA' : led.netPct.toFixed(2), led.stopHit ? 1 : 0,
      fitur.mom12Atr.toFixed(2), (fitur.mom50Atr ?? 0).toFixed(2), fitur.distEma21Atr.toFixed(2),
      E ? E.closeNowAtr.toFixed(2) : 'NA', E ? E.closesBeyond : 'NA', E ? E.maxBeyondAtr.toFixed(2) : 'NA',
      E ? E.volRatioBreak.toFixed(2) : 'NA', E ? E.volFollow.toFixed(2) : 'NA', E ? E.volLate.toFixed(2) : 'NA',
      E ? E.wickBeyondAtr.toFixed(2) : 'NA', E ? E.rejecBodyAtr.toFixed(2) : 'NA',
      E ? (E.crossBack ? 1 : 0) : 'NA', E ? (E.climax ? 1 : 0) : 'NA',
      E ? E.effAtr.toFixed(2) : 'NA', E ? E.push7Atr.toFixed(2) : 'NA', E ? E.dirCons.toFixed(2) : 'NA',
      E ? E.lateMoveAtr.toFixed(2) : 'NA', E ? E.earlyMoveAtr.toFixed(2) : 'NA',
      umurBreak, E ? E.preTouches : 'NA', E ? (E.retest ? 1 : 0) : 'NA',
      floatB6.toFixed(2), fitur.recentBreakUp ? 1 : 0, fitur.recentBreakDown ? 1 : 0,
    ]
    rows.push(r.join(','))
  }
}
console.log(rows.join('\n'))
