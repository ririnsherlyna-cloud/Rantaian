// ============================================================
// UJIAN #5 — LAB v3: MENEMBUS +90% DENGAN KECERDASAN TAMBAHAN.
// Dasar W1 (top-momentum, universe dinamis) + lapisan:
//   X2 K=2 · X3 breadth-guard · X4/X5 konsentrasi parabolik
//   X6 anchor kualitas · X7 SELL rezim turun
// Semua keputusan hanya dari candle < hari-D (bebas kebocoran).
// ============================================================
import { PrismaClient } from '@prisma/client'
import {
  Candle, dayOpenTs, getKlinesBulk, getRegime, getUniverse, candlesBefore,
} from '../src/lib/cyborg/market'
import { CoinFactors, computeFactors, rankNormalize } from '../src/lib/cyborg/factors'

const db = new PrismaClient()
const pc = (x: number) => `${(x * 100).toFixed(1)}%`

interface DayCtx {
  day: string
  regime: Awaited<ReturnType<typeof getRegime>>
  factors: CoinFactors[]
  norm: Map<string, Record<string, number>>
  closes: Map<string, number[]>
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

async function buildCtx(day: string, klines: Map<string, Candle[]>, btcAll: Candle[]): Promise<DayCtx> {
  const ts = dayOpenTs(day)
  const volRanked: { sym: string; qv: number }[] = []
  for (const [sym, ks] of klines) {
    const before = candlesBefore(ks, day)
    if (before.length < 35) continue
    volRanked.push({ sym, qv: before[before.length - 1].quoteVolume })
  }
  volRanked.sort((a, b) => b.qv - a.qv)
  const universe = volRanked.slice(0, 40).map((x) => x.sym)
  if (!universe.includes('BTCUSDT')) universe.unshift('BTCUSDT')

  const btcBefore = candlesBefore(btcAll, day)
  const factors: CoinFactors[] = []
  const closes = new Map<string, number[]>()
  for (const sym of universe) {
    const before = candlesBefore(klines.get(sym) ?? [], day)
    if (before.length < 35) continue
    const f = computeFactors(sym, before, btcBefore)
    if (f) { factors.push(f); closes.set(sym, before.map((c) => c.close)) }
  }
  const regime = await getRegime(btcBefore, closes)
  return { day, regime, factors, norm: rankNormalize(factors), closes }
}

interface Cfg { name: string; kBase: number; breadthGuard: boolean; paraK2: number; anchor: boolean; sellDown: boolean }

function decideX(ctx: DayCtx, cfg: Cfg): { symbol: string; direction: 'BUY' | 'SELL' }[] {
  const { regime } = ctx
  const breadth = regime.breadth
  const momSorted = [...ctx.factors].sort((a, b) => b.mom7 - a.mom7)
  const bySym = new Map(ctx.factors.map((f) => [f.symbol, f]))
  const picks: { symbol: string; direction: 'BUY' | 'SELL' }[] = []

  let k = cfg.kBase
  if (cfg.breadthGuard) {
    if (breadth < 45) k = Math.min(k, 2)
    if (breadth < 32) k = Math.min(k, 1)
    if (regime.regime === 'TREND_TURUN' && breadth < 40) k = Math.min(k, 1)
    if (regime.regime === 'JATUH') k = Math.min(k, 1)
  }
  if (cfg.paraK2 > 0 && momSorted.length && momSorted[0].mom7 > cfg.paraK2) k = Math.min(k, 2)

  const closesOk = (sym: string) => (ctx.closes.get(sym) ?? []).length >= 30
  const atrOk = (sym: string) => (bySym.get(sym)?.atrPct ?? 99) <= 16
  const corrOk = (sym: string) => {
    const cl = ctx.closes.get(sym) ?? []
    for (const p of picks) {
      if (Math.abs(corrC(cl.slice(-30), (ctx.closes.get(p.symbol) ?? []).slice(-30))) > 0.95) return false
    }
    return true
  }

  // kandidat BUY: leader mom7
  const buys: string[] = []
  for (const f of momSorted) {
    if (buys.length >= k) break
    if (!atrOk(f.symbol) || !closesOk(f.symbol) || !corrOk(f.symbol)) continue
    buys.push(f.symbol)
  }
  // anchor kualitas: slot terakhir = komposit struktur+volume (bukan mom teratas)
  if (cfg.anchor && k >= 3 && buys.length === k - 1) {
    const rest = ctx.factors
      .filter((f) => !buys.includes(f.symbol) && momSorted.slice(0, k).every((m) => m.symbol !== f.symbol))
      .map((f) => {
        const n = ctx.norm.get(f.symbol) as unknown as Record<string, number>
        return { sym: f.symbol, s: n.emaAlign * 1.0 + n.volSurge * 0.9 + n.mom7 * 0.6 }
      })
      .sort((a, b) => b.s - a.s)
    for (const a of rest) {
      if (atrOk(a.sym) && closesOk(a.sym) && corrOk(a.sym)) { buys.push(a.sym); break }
    }
  }
  for (const sym of buys) picks.push({ symbol: sym, direction: 'BUY' })

  // SELL hanya saat rezim turun (k/turun) — bukan di bull
  if (cfg.sellDown && (regime.regime === 'TREND_TURUN' || regime.regime === 'JATUH' || (regime.regime === 'SIDEWAYS' && breadth < 40))) {
    const worst = [...ctx.factors].sort((a, b) => a.mom7 - b.mom7)
    let sells = 0
    for (const f of worst) {
      if (sells >= (regime.regime === 'JATUH' ? 2 : 1)) break
      if (f.mom7 > -2) break
      if (!atrOk(f.symbol) || picks.some((p) => p.symbol === f.symbol)) continue
      picks.push({ symbol: f.symbol, direction: 'SELL' }); sells++
    }
  }
  return picks
}

async function main() {
  const universeNow = (await getUniverse()).slice(0, 120)
  const pool = new Set(universeNow.map((u) => u.symbol))
  const dbPicks = await db.pick.findMany({ select: { symbol: true } })
  for (const p of dbPicks) pool.add(p.symbol)
  pool.add('BTCUSDT')
  const klines = await getKlinesBulk([...pool])
  const btcAll = klines.get('BTCUSDT') ?? []

  const realDays = await db.battleDay.findMany({ where: { status: 'SCORED' }, orderBy: { day: 'asc' } })
  const days = realDays.map((d) => d.day)
  const ctxs = new Map<string, DayCtx>()
  for (const d of days) ctxs.set(d, await buildCtx(d, klines, btcAll))

  const exitPrice = (sym: string, day: string): number | null => {
    const c = (klines.get(sym) ?? []).find((k) => k.openTime === dayOpenTs(day))
    return c ? c.close : null
  }
  const allP = await db.pick.findMany({ where: { ret: { not: null } } })
  const momDay = new Map<string, number>()
  for (const p of allP.filter((x) => x.competitor === 'MOMENTUM')) {
    const d = realDays.find((x) => x.id === p.battleDayId)?.day
    if (!d) continue
    momDay.set(d, (momDay.get(d) ?? 0) + (p.ret ?? 0))
  }
  for (const [d, v] of momDay) momDay.set(d, v / 3)

  const CFGS: Cfg[] = [
    { name: 'X1_K3(mom dasar)', kBase: 3, breadthGuard: false, paraK2: 0, anchor: false, sellDown: false },
    { name: 'X2_K2', kBase: 2, breadthGuard: false, paraK2: 0, anchor: false, sellDown: false },
    { name: 'X3_K3+guard', kBase: 3, breadthGuard: true, paraK2: 0, anchor: false, sellDown: false },
    { name: 'X4_K3+para100', kBase: 3, breadthGuard: false, paraK2: 100, anchor: false, sellDown: false },
    { name: 'X5_K3+para60+guard', kBase: 3, breadthGuard: true, paraK2: 60, anchor: false, sellDown: false },
    { name: 'X6_K3+anchor+guard', kBase: 3, breadthGuard: true, paraK2: 60, anchor: true, sellDown: false },
    { name: 'X7_X6+SELLturun', kBase: 3, breadthGuard: true, paraK2: 60, anchor: true, sellDown: true },
  ]

  for (const cfg of CFGS) {
    let cum = 0, hits = 0, n = 0, wins = 0
    const detail: string[] = []
    for (const day of days) {
      const ctx = ctxs.get(day)!
      const picks = decideX(ctx, cfg)
      let dayRet = 0
      for (const p of picks) {
        const e = ctx.factors.find((x) => x.symbol === p.symbol)?.close ?? null
        const x = exitPrice(p.symbol, day)
        if (e === null || x === null) continue
        const ret = ((x - e) / e) * (p.direction === 'BUY' ? 1 : -1)
        dayRet += ret; n++
        if (ret > 0) hits++
      }
      dayRet = picks.length ? dayRet / picks.length : 0
      cum += dayRet
      detail.push(`${dayRet >= 0 ? '+' : ''}${(dayRet * 100).toFixed(1)}`)
      if (dayRet > (momDay.get(day) ?? 0)) wins++
    }
    console.log(`${cfg.name.padEnd(26)} cum=${pc(cum).padStart(8)} hit=${pc(hits / Math.max(1, n))} menangVsMOM=${wins}/${days.length}`)
    console.log(`${''.padEnd(26)} ${detail.join(' ')}`)
  }
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
