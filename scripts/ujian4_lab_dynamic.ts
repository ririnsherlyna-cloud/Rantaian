// ============================================================
// UJIAN #4 — LAB v2: UNIVERSE DINAMIS PER HARI (bebas kebocoran).
// Pool kandidat luas (top-120 volume sekarang + semua simbol DB),
// per hari-D: universe = top-40 by quoteVolume candle TERAKHIR SEBELUM D.
// Uji varian runner-riding & pump-cluster melawan MOMENTUM riil.
// ============================================================
import { PrismaClient } from '@prisma/client'
import {
  Candle, dayOpenTs, dayOfTs, getKlinesBulk, getRegime, getUniverse, candlesBefore,
} from '../src/lib/cyborg/market'
import { CoinFactors, computeFactors, rankNormalize } from '../src/lib/cyborg/factors'

const db = new PrismaClient()
const pc = (x: number) => `${(x * 100).toFixed(1)}%`

interface DayCtx {
  day: string
  regime: Awaited<ReturnType<typeof getRegime>>
  universe: string[]
  factors: CoinFactors[]
  norm: Map<string, Record<string, number>>
  closes: Map<string, number[]>
  lastCandle: Map<string, Candle>
}

function corrC(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 10) return 0
  const x = a.slice(-n), y = b.slice(-n)
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0
}

async function buildCtxDynamic(
  day: string, klines: Map<string, Candle[]>, btcAll: Candle[], UNIVERSE_N: number,
): Promise<DayCtx> {
  const ts = dayOpenTs(day)
  // universe dinamis: top-N by quoteVolume candle sebelum D (bebas kebocoran)
  const volRanked: { sym: string; qv: number }[] = []
  for (const [sym, ks] of klines) {
    const before = candlesBefore(ks, day)
    if (before.length < 35) continue
    volRanked.push({ sym, qv: before[before.length - 1].quoteVolume })
  }
  volRanked.sort((a, b) => b.qv - a.qv)
  const universe = volRanked.slice(0, UNIVERSE_N).map((x) => x.sym)
  if (!universe.includes('BTCUSDT')) universe.unshift('BTCUSDT')

  const btcBefore = candlesBefore(btcAll, day)
  const factors: CoinFactors[] = []
  const closes = new Map<string, number[]>()
  const lastCandle = new Map<string, Candle>()
  for (const sym of universe) {
    const ks = klines.get(sym) ?? []
    const before = candlesBefore(ks, day)
    if (before.length < 35) continue
    const f = computeFactors(sym, before, btcBefore)
    if (f) { factors.push(f); closes.set(sym, before.map((c) => c.close)); lastCandle.set(sym, before[before.length - 1]) }
  }
  const regime = await getRegime(btcBefore, closes)
  const norm = rankNormalize(factors)
  return { day, regime, universe, factors, norm, closes, lastCandle }
}

// ---------- varian ----------
interface Pick { symbol: string; direction: 'BUY' | 'SELL'; score: number }
interface Cfg {
  name: string
  kind: 'MOM3' | 'GUARD' | 'CLUSTER' | 'LEADER' | 'BASIS'
  atrCap: number
  ejectDoubleBlowoff: boolean
}

function decideW(ctx: DayCtx, cfg: Cfg, prevPicks: Map<string, number>): Pick[] {
  const { regime, norm } = ctx
  const breadth = regime.breadth
  const picks: Pick[] = []
  const bySym = new Map(ctx.factors.map((f) => [f.symbol, f]))
  const momSorted = [...ctx.factors].sort((a, b) => b.mom7 - a.mom7)

  const pumpers = momSorted.filter((f) => f.mom7 > 30)
  const giantLast = [...ctx.lastCandle.entries()]
    .map(([sym, c]) => ({ sym, lr: c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0, cp: c.high > c.low ? (c.close - c.low) / (c.high - c.low) : 0.5 }))
    .sort((a, b) => b.lr - a.lr)

  const atrOk = (sym: string, cap: number) => (bySym.get(sym)?.atrPct ?? 99) <= cap
  const closesOk = (sym: string) => (ctx.closes.get(sym) ?? []).length >= 30

  const corrOk = (sym: string, cap: number) => {
    const cl = ctx.closes.get(sym) ?? []
    for (const p of picks) {
      const clp = ctx.closes.get(p.symbol) ?? []
      if (Math.abs(corrC(cl.slice(-30), clp.slice(-30))) > cap) return false
    }
    return true
  }

  if (cfg.kind === 'BASIS') {
    // repro otak lama: weighted 8 faktor dgn default weights
    const w: Record<string, number> = { mom7: 1.0, mom30: 0.8, emaAlign: 1.0, rsi: 0.6, volSurge: 0.7, atrInv: 0.5, distHigh: 0.6, btcCorr: 0.3 }
    const ids = Object.keys(w)
    const scored = ctx.factors.map((f) => {
      const n = norm.get(f.symbol)!
      let s = 0, tot = 0
      for (const id of ids) { s += (n as Record<string, number>)[id] * w[id]; tot += w[id] }
      return { symbol: f.symbol, score: s / tot }
    }).sort((a, b) => b.score - a.score)
    let buys = 0
    for (const s of scored) {
      if (buys >= 3 || s.score < 0.08) break
      const f = bySym.get(s.symbol)!
      if (f.atrPct > 12) continue
      if (regime.regime === 'JATUH') break
      if (!closesOk(s.symbol) || !corrOk(s.symbol, 0.92)) continue
      picks.push({ symbol: s.symbol, direction: 'BUY', score: s.score }); buys++
    }
    // 1 SELL seperti otak lama
    for (let i = scored.length - 1; i >= 0; i--) {
      const s = scored[i]
      if (s.score > -0.15) break
      const f = bySym.get(s.symbol)!
      if (f.atrPct > 16) continue
      if (regime.regime === 'TREND_NAIK' && s.score > -0.35) continue
      picks.push({ symbol: s.symbol, direction: 'SELL', score: s.score })
      break
    }
    return picks
  }

  // keluarga momentum
  const cap = cfg.atrCap
  let kBuy = 3
  let candidates = momSorted.map((f) => f.symbol)

  if (cfg.kind === 'LEADER') {
    // 1 slot pelari (top mom7) + 2 slot komposit kualitas
    const leader = momSorted[0]?.symbol
    const rest = momSorted.slice(1).map((f) => f.symbol)
    const n = norm
    const comp = [...rest].sort((a, b) => {
      const na = n.get(a) as unknown as Record<string, number>
      const nb = n.get(b) as unknown as Record<string, number>
      const sa = na.mom7 * 1.2 + na.emaAlign * 1.0 + na.volSurge * 0.8
      const sb = nb.mom7 * 1.2 + nb.emaAlign * 1.0 + nb.volSurge * 0.8
      return sb - sa
    })
    candidates = [leader, ...comp].filter(Boolean)
  }

  if (cfg.kind === 'CLUSTER' && pumpers.length >= 2) {
    // mode berburu: fokus pada klaster pumper, korbankan slot ketiga utk pumper ke-3 bila ada
    candidates = [...new Set([...pumpers.map((f) => f.symbol), ...momSorted.slice(0, 3).map((f) => f.symbol)])]
    kBuy = Math.min(3, Math.max(2, pumpers.length))
  }

  let buys = 0
  for (const sym of candidates) {
    if (buys >= kBuy) break
    if (!atrOk(sym, cap) || !closesOk(sym) || !corrOk(sym, 0.95)) continue
    // eject: blow-off ganda + close lemah
    if (cfg.ejectDoubleBlowoff) {
      const g = giantLast.find((x) => x.sym === sym)
      if (g && g.lr > 30 && g.cp < 0.35) continue
    }
    picks.push({ symbol: sym, direction: 'BUY', score: 1 }); buys++
  }

  // SELL sesuai rezim (semua varian momentum memakai policy sama)
  const kSell = regime.regime === 'TREND_NAIK' ? (breadth > 55 ? 0 : 1) : regime.regime === 'SIDEWAYS' ? 1 : 2
  if (kSell > 0 && cfg.kind !== 'MOM3') {
    const n = norm
    const worst = [...ctx.factors].sort((a, b) => {
      const na = n.get(a.symbol) as unknown as Record<string, number>
      const nb = n.get(b.symbol) as unknown as Record<string, number>
      const sa = na.mom7 * 1.0 + na.emaAlign * 0.8
      const sb = nb.mom7 * 1.0 + nb.emaAlign * 0.8
      return sa - sb
    })
    let sells = 0
    for (const f of worst) {
      if (sells >= kSell) break
      const na = n.get(f.symbol) as unknown as Record<string, number>
      if (na.mom7 > -0.2) break
      if (f.atrPct > 16) continue
      if (picks.some((p) => p.symbol === f.symbol)) continue
      picks.push({ symbol: f.symbol, direction: 'SELL', score: -1 }); sells++
    }
  }
  return picks
}

async function main() {
  const UNIVERSE_N = 40
  const universeNow = (await getUniverse()).slice(0, 120)
  const pool = new Set(universeNow.map((u) => u.symbol))
  const dbPicks = await db.pick.findMany({ select: { symbol: true } })
  for (const p of dbPicks) pool.add(p.symbol)
  pool.add('BTCUSDT')
  const symbols = [...pool]
  console.log(`Pool kandidat: ${symbols.length} simbol — mengambil klines...`)
  const klines = await getKlinesBulk(symbols)
  const btcAll = klines.get('BTCUSDT') ?? []

  const realDays = await db.battleDay.findMany({ where: { status: 'SCORED' }, orderBy: { day: 'asc' } })
  const days = realDays.map((d) => d.day)
  console.log(`Hari simulasi: ${days.length} (${days[0]} → ${days[days.length - 1]})`)

  const ctxs = new Map<string, DayCtx>()
  for (const d of days) ctxs.set(d, await buildCtxDynamic(d, klines, btcAll, UNIVERSE_N))
  console.log('Context selesai dibangun.\n')

  const exitPrice = (sym: string, day: string): number | null => {
    const c = (klines.get(sym) ?? []).find((k) => k.openTime === dayOpenTs(day))
    return c ? c.close : null
  }

  // rival riil (official metric: mean per hari)
  const rivalDay = new Map<string, Map<string, number>>()
  for (const d of realDays) {
    for (const p of await db.pick.findMany({ where: { battleDayId: d.id, ret: { not: null } } })) {
      if (!rivalDay.has(p.competitor)) rivalDay.set(p.competitor, new Map())
      const m = rivalDay.get(p.competitor)!
      m.set(d.day, (m.get(d.day) ?? 0) + (p.ret ?? 0))
    }
  }
  const CFGS: Cfg[] = [
    { name: 'W0_BASIS(univ-dinamis)', kind: 'BASIS', atrCap: 12, ejectDoubleBlowoff: false },
    { name: 'W1_MOM3(top3mom7)', kind: 'MOM3', atrCap: 16, ejectDoubleBlowoff: false },
    { name: 'W2_GUARD', kind: 'GUARD', atrCap: 16, ejectDoubleBlowoff: true },
    { name: 'W3_CLUSTER', kind: 'CLUSTER', atrCap: 16, ejectDoubleBlowoff: true },
    { name: 'W4_LEADER', kind: 'LEADER', atrCap: 16, ejectDoubleBlowoff: true },
  ]

  for (const cfg of CFGS) {
    const prev = new Map<string, number>()
    let cum = 0, hits = 0, n = 0, winsVsMom = 0
    const detail: string[] = []
    for (const day of days) {
      const ctx = ctxs.get(day)!
      const picks = decideW(ctx, cfg, prev)
      let dayRet = 0
      for (const p of picks) {
        const f = ctx.factors.find((x) => x.symbol === p.symbol)
        const e = f?.close ?? null
        const x = exitPrice(p.symbol, day)
        if (e === null || x === null) continue
        const ret = ((x - e) / e) * (p.direction === 'BUY' ? 1 : -1)
        dayRet += ret; n++
        if (ret > 0) hits++
      }
      dayRet = picks.length ? dayRet / picks.length : 0
      cum += dayRet
      detail.push(`${dayRet >= 0 ? '+' : ''}${(dayRet * 100).toFixed(1)}`)
      const momRet = (rivalDay.get('MOMENTUM')?.get(day) ?? 0) / 3
      if (dayRet > momRet) winsVsMom++
    }
    console.log(`${cfg.name.padEnd(28)} cum=${pc(cum).padStart(8)} hit=${pc(hits / Math.max(1, n))} hariMenangVsMOM=${winsVsMom}/${days.length}`)
    console.log(`${''.padEnd(28)} ${detail.join(' ')}`)
  }

  console.log('\n--- Riil (official metric: mean per hari) ---')
  const allP = await db.pick.findMany({ where: { ret: { not: null } } })
  for (const comp of ['MOMENTUM', 'AI_ANALIS', 'MICAPROFITA', 'MEANREV', 'BNH_BTC', 'ACAK']) {
    const perDay = new Map<string, number[]>()
    for (const p of allP.filter((x) => x.competitor === comp)) {
      const d = realDays.find((x) => x.id === p.battleDayId)?.day
      if (!d) continue
      if (!perDay.has(d)) perDay.set(d, [])
      perDay.get(d)!.push(p.ret ?? 0)
    }
    let s = 0
    for (const [, rets] of perDay) s += rets.reduce((a, b) => a + b, 0) / rets.length
    console.log(`${comp.padEnd(28)} cum=${pc(s).padStart(8)}`)
  }
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
