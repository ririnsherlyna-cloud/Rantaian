// ============================================================
// UJIAN #1 — Bedah forensik: mengapa MICAPROFITA kalah?
// Analisis DB: head-to-head harian, SELL drag, alignment faktor,
// overlap dengan MOMENTUM, profil pick pemenang vs pick kita.
// ============================================================
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const pc = (x: number) => `${(x * 100).toFixed(1)}%`

async function main() {
  const days = await db.battleDay.findMany({ orderBy: { day: 'asc' }, include: { picks: true } })
  const scored = days.filter((d) => d.status === 'SCORED')
  console.log(`Hari teradili: ${scored.length} (${scored[0]?.day} → ${scored[scored.length - 1]?.day})`)

  // ---------- A. per-hari head-to-head ----------
  console.log('\n== A. Return harian per kompetitor (avg ret per hari) ==')
  console.log('day        |rezim        |MICA        |MOMENTUM    |AI_ANALIS   |pemenang hari')
  let micaWins = 0, momWins = 0
  for (const d of scored) {
    const ret = (c: string) => {
      const rs = d.picks.filter((p) => p.competitor === c && p.ret !== null)
      return rs.length ? rs.reduce((s, p) => s + (p.ret ?? 0), 0) / rs.length : NaN
    }
    const mi = ret('MICAPROFITA'), mo = ret('MOMENTUM'), ai = ret('AI_ANALIS')
    const best = Math.max(mi, mo, ai)
    const winner = best === mi ? 'MICA' : best === mo ? 'MOM' : 'AI'
    if (winner === 'MICA') micaWins++; if (winner === 'MOM') momWins++
    console.log(`${d.day} |${(d.regime ?? '').padEnd(13)}|${pc(mi).padStart(10)} |${pc(mo).padStart(10)} |${pc(ai).padStart(10)} |${winner}`)
  }
  console.log(`Hari menang: MICA ${micaWins}, MOMENTUM ${momWins} dari ${scored.length}`)

  // ---------- B. drag SELL ----------
  console.log('\n== B. Performa SELL vs BUY MICAPROFITA ==')
  const mica = await db.pick.findMany({ where: { competitor: 'MICAPROFITA', ret: { not: null } } })
  const buys = mica.filter((p) => p.direction === 'BUY')
  const sells = mica.filter((p) => p.direction === 'SELL')
  const avg = (arr: typeof mica) => arr.length ? arr.reduce((s, p) => s + (p.ret ?? 0), 0) / arr.length : 0
  console.log(`BUY : n=${buys.length} avg=${pc(avg(buys))} hit=${pc(buys.filter((p) => p.hit).length / Math.max(1, buys.length))}`)
  console.log(`SELL: n=${sells.length} avg=${pc(avg(sells))} hit=${pc(sells.filter((p) => p.hit).length / Math.max(1, sells.length))}`)
  for (const p of sells) {
    const day = days.find((d) => d.id === p.battleDayId)
    console.log(`   SELL ${p.symbol.padEnd(12)} ${day?.day} ${day?.regime?.padEnd(12)} ret=${pc(p.ret ?? 0)}`)
  }

  // ---------- C. alignment faktor (dari evidence MICAPROFITA) ----------
  console.log('\n== C. Keselarasan faktor ↔ hasil (semua pick MICA teradili) ==')
  const FACT = ['mom7', 'mom30', 'emaAlign', 'rsi', 'volSurge', 'atrInv', 'distHigh', 'btcCorr']
  const acc: Record<string, { sx: number; sy: number; sxx: number; sxy: number; n: number; hi: number[]; lo: number[] }> = {}
  for (const f of FACT) acc[f] = { sx: 0, sy: 0, sxx: 0, sxy: 0, n: 0, hi: [], lo: [] }
  for (const p of mica) {
    let ev: { factors?: Record<string, number> } = {}
    try { ev = JSON.parse(p.evidence ?? '{}') } catch { /* */ }
    if (!ev.factors || p.ret === null) continue
    for (const f of FACT) {
      const x = ev.factors[f]
      if (typeof x !== 'number') continue
      const a = acc[f]
      a.sx += x; a.sy += p.ret; a.sxx += x * x; a.sxy += x * p.ret; a.n++
      if (x > 0.5) a.hi.push(p.ret)
      if (x < -0.5) a.lo.push(p.ret)
    }
  }
  for (const f of FACT) {
    const a = acc[f]
    if (a.n < 5) continue
    const mx = a.sx / a.n, my = a.sy / a.n
    const cov = a.sxy / a.n - mx * my
    const vx = a.sxx / a.n - mx * mx
    const corrF = vx > 1e-9 ? cov / Math.sqrt(vx) : 0 // korelasi ~Pearson dgn var(ret)≈konstan
    const hi = a.hi.length ? avgR(a.hi) : 0, lo = a.lo.length ? avgR(a.lo) : 0
    console.log(`${f.padEnd(10)} n=${String(a.n).padStart(3)} corr=${corrF.toFixed(3)} | ret(f>+.5)=${pc(hi)} (n=${a.hi.length}) ret(f<-.5)=${pc(lo)} (n=${a.lo.length})`)
  }
  function avgR(xs: number[]) { return xs.reduce((s, x) => s + x, 0) / xs.length }

  // ---------- D. overlap dgn MOMENTUM ----------
  console.log('\n== D. Overlap pick MICAPROFITA vs MOMENTUM ==')
  let sameDays = 0, micaSym = 0, momSym = 0
  const momAvgByRank: number[][] = [[], [], []]
  for (const d of scored) {
    const m = d.picks.filter((p) => p.competitor === 'MOMENTUM' && p.ret !== null)
    const k = d.picks.filter((p) => p.competitor === 'MICAPROFITA' && p.ret !== null)
    m.sort((a, b) => (b.ret ?? 0) - (a.ret ?? 0))
    // urutkan MOMENTUM berdasarkan urutan asli (mom7 rank 1..3) — evidence reason sama, jadi pakai ret
    const inter = m.filter((p) => k.some((q) => q.symbol === p.symbol))
    momSym += m.length; micaSym += k.length; sameDays += inter.length
    m.forEach((p, i) => { if (i < 3) momAvgByRank[i].push(p.ret ?? 0) })
  }
  console.log(`pick MICA=${micaSym}, pick MOM=${momSym}, irisan=${sameDays} (${pc(sameDays / Math.max(1, Math.max(micaSym, momSym)))} dari pick MOM)`)
  console.log(`avg ret MOMENTUM rank1=${pc(avgR(momAvgByRank[0]))} rank2=${pc(avgR(momAvgByRank[1]))} rank3=${pc(avgR(momAvgByRank[2]))}`)

  // ---------- E. apa yang MICA pilih sbg faktor top vs hasil ----------
  console.log('\n== E. Kegagalan confidence tinggi MICA ==')
  const fails = mica.filter((p) => p.hit === false && p.confidence >= 70)
  for (const p of fails) {
    const day = days.find((d) => d.id === p.battleDayId)
    console.log(`   ${day?.day} ${p.direction} ${p.symbol.padEnd(12)} conf=${Math.round(p.confidence)} ret=${pc(p.ret ?? 0)} rezim=${day?.regime}`)
  }

  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
