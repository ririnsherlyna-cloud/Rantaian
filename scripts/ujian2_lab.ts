// ============================================================
// UJIAN #2 — LABORATORIUM STRATEGI (bebas kebocoran).
// Simulasi varian otak MICAPROFITA pada 21 hari yang SAMA
// dengan arena nyata, faktor hanya dari candle < hari-D.
// Tujuan: bukti empiris desain otak V2 sebelum dipasang.
// ============================================================
import { PrismaClient } from '@prisma/client'
import {
  Candle, dayOpenTs, dayOfTs, getKlinesBulk, getRegime, getUniverse, candlesBefore,
} from '../src/lib/cyborg/market'
import { CoinFactors, computeFactors, rankNormalize } from '../src/lib/cyborg/factors'

const db = new PrismaClient()
const pc = (x: number) => `${(x * 100).toFixed(1)}%`
const FAPI = 'https://fapi.binance.com'

// ---------- sensor baru: funding + taker flow ----------
interface FundingEvt { fundingTime: number; fundingRate: string }
interface TakerRow { timestamp: number; buySellRatio: string }

async function fetchJson(url: string): Promise<unknown> {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url)
      if (r.ok) return r.json()
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 800))
  }
  return []
}

async function getFundingMap(symbols: string[]): Promise<Map<string, FundingEvt[]>> {
  const out = new Map<string, FundingEvt[]>()
  const CONC = 6
  for (let i = 0; i < symbols.length; i += CONC) {
    const batch = symbols.slice(i, i + CONC)
    const res = await Promise.all(batch.map((s) => fetchJson(`${FAPI}/fapi/v1/fundingRate?symbol=${s}&limit=1000`) as Promise<FundingEvt[]>))
    batch.forEach((s, j) => out.set(s, Array.isArray(res[j]) ? res[j] : []))
  }
  return out
}

async function getTakerMap(symbols: string[]): Promise<Map<string, TakerRow[]>> {
  const out = new Map<string, TakerRow[]>()
  const CONC = 6
  for (let i = 0; i < symbols.length; i += CONC) {
    const batch = symbols.slice(i, i + CONC)
    const res = await Promise.all(batch.map((s) => fetchJson(`${FAPI}/futures/data/takerlongshortRatio?symbol=${s}&period=1d&limit=30`) as Promise<TakerRow[]>))
    batch.forEach((s, j) => out.set(s, Array.isArray(res[j]) ? res[j] : []))
  }
  return out
}

// funding level sebelum hari-D: avg rate 6 event terakhir (< D), netral jika data kurang
function fundingLevelBefore(evts: FundingEvt[], day: string): number | null {
  const ts = dayOpenTs(day)
  const before = evts.filter((e) => e.fundingTime < ts)
  if (before.length < 12) return null
  const last6 = before.slice(-6).map((e) => parseFloat(e.fundingRate))
  const avg = last6.reduce((s, v) => s + v, 0) / last6.length
  return Number.isFinite(avg) ? avg : null
}

// taker ratio hari D-1 (hari lengkap terakhir sebelum D)
function takerBefore(rows: TakerRow[], day: string): number | null {
  const ts = dayOpenTs(day)
  const before = rows.filter((e) => e.timestamp < ts)
  const last = before[before.length - 1]
  if (!last) return null
  const v = parseFloat(last.buySellRatio)
  return Number.isFinite(v) ? v : null
}

// ---------- konteks hari ----------
interface DayCtx {
  day: string
  regime: Awaited<ReturnType<typeof getRegime>>
  factors: CoinFactors[]
  norm: Map<string, Record<string, number>>
  closes: Map<string, number[]>
  fundingRank: Map<string, number> // rank [-1,1], 0 = netral
  takerRank: Map<string, number>
  lastCandle: Map<string, Candle>
}

const OFF_BASE = ['mom7', 'mom30', 'emaAlign', 'rsi', 'volSurge', 'distHigh']

function rankMap(values: Map<string, number>): Map<string, number> {
  const entries = [...values.entries()].filter(([, v]) => v !== null && Number.isFinite(v))
  const sorted = entries.sort((a, b) => a[1] - b[1])
  const pos = new Map<string, number>()
  sorted.forEach(([sym], i) => pos.set(sym, i))
  const n = sorted.size
  const out = new Map<string, number>()
  for (const [sym, p] of pos) out.set(sym, n <= 1 ? 0 : (p / (n - 1)) * 2 - 1)
  return out
}

async function buildCtx(
  day: string, klines: Map<string, Candle[]>, btcAll: Candle[],
  funding: Map<string, FundingEvt[]>, taker: Map<string, TakerRow[]>,
): Promise<DayCtx> {
  const btcBefore = candlesBefore(btcAll, day)
  const factors: CoinFactors[] = []
  const closes = new Map<string, number[]>()
  const lastCandle = new Map<string, Candle>()
  for (const [sym, ks] of klines) {
    const before = candlesBefore(ks, day)
    if (before.length < 35) continue
    const f = computeFactors(sym, before, btcBefore)
    if (f) { factors.push(f); closes.set(sym, before.map((c) => c.close)); lastCandle.set(sym, before[before.length - 1]) }
  }
  const regime = await getRegime(btcBefore, closes)
  const normRaw = rankNormalize(factors)
  const norm = new Map<string, Record<string, number>>()
  for (const [sym, n8] of normRaw) norm.set(sym, { ...n8 })

  // sensor rank
  const fRaw = new Map<string, number>()
  const tRaw = new Map<string, number>()
  for (const f of factors) {
    const fl = fundingLevelBefore(funding.get(f.symbol) ?? [], day)
    if (fl !== null) fRaw.set(f.symbol, -fl) // funding tinggi (crowd) = negatif
    const tk = takerBefore(taker.get(f.symbol) ?? [], day)
    if (tk !== null) tRaw.set(f.symbol, Math.min(2.5, tk))
  }
  const fRank = rankMap(fRaw)
  const tRank = rankMap(tRaw)
  for (const f of factors) {
    norm.get(f.symbol)!.fundMomo = fRank.get(f.symbol) ?? 0
    norm.get(f.symbol)!.takerFlow = tRank.get(f.symbol) ?? 0
    const lc = lastCandle.get(f.symbol)!
    const rng = lc.high - lc.low
    norm.get(f.symbol)!.closePos = rng > 0 ? (lc.close - lc.low) / rng : 0.5
    norm.get(f.symbol)!.lastRet = lc.close > 0 ? ((lc.close - lc.open) / lc.open) * 100 : 0
  }
  return { day, regime, factors, norm, closes, fundingRank: fRank, takerRank: tRank, lastCandle }
}

// ---------- konfigurasi varian ----------
interface Cfg {
  name: string
  weights: Record<string, number>
  atrCap: (regime: string, breadth: number) => number
  corrCap: number
  minScore: number
  kBuy: (regime: string, breadth: number, gap: number) => number
  kSell: (regime: string, breadth: number) => number
  sellMinScore: number
  blowoff: boolean
  streak: number
  sensors: boolean
  atrFloorVeto?: boolean // atrInv sebagai veto ekstrem (bukan skor)
}

const BASE_W: Record<string, number> = { mom7: 1.5, mom30: 0.8, emaAlign: 1.0, rsi: 0.5, volSurge: 0.9, distHigh: 0.7 }

function policy(regime: string, breadth: number): { atr: number; kSell: number; sellMin: number } {
  if (regime === 'TREND_NAIK') return { atr: breadth > 60 ? 15 : 13, kSell: breadth > 55 ? 0 : 1, sellMin: 0.35 }
  if (regime === 'SIDEWAYS') return { atr: 12, kSell: 1, sellMin: 0.30 }
  if (regime === 'TREND_TURUN') return { atr: 12, kSell: 2, sellMin: 0.15 }
  return { atr: 12, kSell: 2, sellMin: 0.10 } // JATUH
}

function mkCfg(name: string, over: Partial<Cfg>): Cfg {
  return {
    name,
    weights: BASE_W,
    atrCap: (r, b) => policy(r, b).atr,
    corrCap: 0.94,
    minScore: 0.12,
    kBuy: (_r, _b, _g) => 3,
    kSell: (r, b) => policy(r, b).kSell,
    sellMinScore: 0.15,
    blowoff: false,
    streak: 0,
    sensors: false,
    ...over,
  }
}

const CONFIGS: Cfg[] = [
  mkCfg('V0_BASIS(lama)', {
    weights: { mom7: 1.0, mom30: 0.8, emaAlign: 1.0, rsi: 0.6, volSurge: 0.7, atrInv: 0.5, distHigh: 0.6, btcCorr: 0.3 },
    atrCap: () => 12, corrCap: 0.92, minScore: 0.08,
    kBuy: () => 3, kSell: (r) => (r === 'TREND_TURUN' ? 2 : 1), sellMinScore: 0.15,
  }),
  mkCfg('V1_OFENSIF', {}),
  mkCfg('V2_FOKUS', { kBuy: (_r, b, g) => (g > 0.10 && b > 60 ? 2 : 3) }),
  mkCfg('V3_GUARD', { kBuy: (_r, b, g) => (g > 0.10 && b > 60 ? 2 : 3), blowoff: true }),
  mkCfg('V4_PENALTI', { kBuy: (_r, b, g) => (g > 0.10 && b > 60 ? 2 : 3), blowoff: true, streak: 0.08 }),
  mkCfg('V5_SENSOR', { kBuy: (_r, b, g) => (g > 0.10 && b > 60 ? 2 : 3), blowoff: true, streak: 0.08, sensors: true,
    weights: { ...BASE_W, fundMomo: 0.5, takerFlow: 0.5 } }),
  mkCfg('V6_PREDATOR', { kBuy: (_r, b, g) => (g > 0.10 && b > 60 ? 2 : 3), blowoff: true, streak: 0.08, sensors: true,
    weights: { mom7: 1.8, mom30: 0.7, emaAlign: 1.0, rsi: 0.45, volSurge: 1.0, distHigh: 0.8, fundMomo: 0.5, takerFlow: 0.55 } }),
  mkCfg('V7_KUALITAS', { weights: { mom7: 1.0 }, blowoff: true, minScore: 0.5 }),
]

// ---------- otak varian ----------
interface Pick { symbol: string; direction: 'BUY' | 'SELL'; score: number }
function decideV2(ctx: DayCtx, cfg: Cfg, streakMap: Map<string, number>): Pick[] {
  const { regime } = ctx
  const ids = Object.keys(cfg.weights)
  const wsum = ids.reduce((s, id) => s + Math.abs(cfg.weights[id]), 0) || 1
  const scored = ctx.factors.map((f) => {
    const n = ctx.norm.get(f.symbol) ?? {}
    let s = 0
    for (const id of ids) s += (n[id] ?? 0) * cfg.weights[id]
    const pen = cfg.streak * (streakMap.get(f.symbol) ?? 0)
    return { symbol: f.symbol, score: s / wsum - pen, bySym: f }
  })
  scored.sort((a, b) => b.score - a.score)
  const picks: Pick[] = []
  const rejected = new Set<string>()

  // mom7 top-3 set (untuk analisis)
  const topMom7 = new Set([...ctx.factors].sort((a, b) => b.mom7 - a.mom7).slice(0, 3).map((f) => f.symbol))

  // BUY
  const breadth = ctx.regime.breadth
  const kBuy = cfg.kBuy(regime.regime, breadth, scored.length > 1 ? scored[0].score - scored[1].score : 0)
  for (const s of scored) {
    if (picks.filter((p) => p.direction === 'BUY').length >= kBuy) break
    if (s.score < cfg.minScore) break
    const f = s.bySym
    if (f.atrPct > cfg.atrCap(regime.regime, breadth)) { rejected.add(s.symbol); continue }
    if (cfg.blowoff) {
      const n = ctx.norm.get(f.symbol)!
      const lr = n.lastRet ?? 0, cp = n.closePos ?? 0.5
      if ((lr > 27 && cp < 0.35) || lr > 45) { rejected.add(s.symbol); continue }
      if ((n.rsi ?? 0) > 0.9 && f.distHigh > -2 && f.rsi > 84) { rejected.add(s.symbol); continue }
    }
    if ((ctx.closes.get(s.symbol) ?? []).length < 30) { rejected.add(s.symbol); continue }
    // anti-korelasi
    const cl = ctx.closes.get(s.symbol)!
    let dup = false
    for (const p of picks) {
      if (p.direction !== 'BUY') continue
      const clp = ctx.closes.get(p.symbol)!
      const c = corrC(cl.slice(-30), clp.slice(-30))
      if (Math.abs(c) > cfg.corrCap) { dup = true; rejected.add(s.symbol); break }
    }
    if (dup) continue
    picks.push({ symbol: s.symbol, direction: 'BUY', score: s.score })
  }
  // SELL
  const kSell = cfg.kSell(regime.regime, breadth)
  let sells = 0
  for (let i = scored.length - 1; i >= 0 && sells < kSell; i--) {
    const s = scored[i]
    if (s.score > -cfg.sellMinScore) break
    const f = s.bySym
    if (f.atrPct > 16) { continue }
    if (regime.regime === 'TREND_NAIK' && s.score > -0.35) continue
    picks.push({ symbol: s.symbol, direction: 'SELL', score: s.score })
    sells++
  }
  return picks
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

// ---------- simulasi ----------
async function main() {
  const universe = (await getUniverse()).slice(0, 40)
  const symbols = universe.map((u) => u.symbol)
  if (!symbols.includes('BTCUSDT')) symbols.unshift('BTCUSDT')
  console.log(`Mengambil klines ${symbols.length} simbol + sensor funding/taker...`)
  const klines = await getKlinesBulk(symbols)
  const btcAll = klines.get('BTCUSDT') ?? []
  const [funding, taker] = await Promise.all([getFundingMap(symbols), getTakerMap(symbols)])

  const live = btcAll[btcAll.length - 1]
  const today = dayOfTs(live.openTime)

  // hari teradili dari DB (arena nyata) — supaya perbandingan apple-to-apple
  const realDays = await db.battleDay.findMany({ where: { status: 'SCORED' }, orderBy: { day: 'asc' } })
  const days = realDays.map((d) => d.day)
  console.log(`Hari simulasi: ${days.length} (${days[0]} → ${days[days.length - 1]})\n`)

  const ctxs = new Map<string, DayCtx>()
  for (const d of days) ctxs.set(d, await buildCtx(d, klines, btcAll, funding, taker))

  // harga exit per hari per simbol (close hari-D)
  const exitPrice = (sym: string, day: string): number | null => {
    const ks = klines.get(sym) ?? []
    const c = ks.find((k) => k.openTime === dayOpenTs(day))
    return c ? c.close : null
  }
  const entryPrice = (ctx: DayCtx, sym: string): number | null => {
    const f = ctx.factors.find((x) => x.symbol === sym)
    return f ? f.close : null
  }

  interface Res { name: string; cum: number; hits: number; n: number; momOverlap: number; winsVsMom: number }
  const results: Res[] = []

  // hasil riil rival dari DB utk perbandingan
  const realRival = new Map<string, Map<string, number>>() // comp -> day -> ret
  for (const d of realDays) {
    for (const p of await db.pick.findMany({ where: { battleDayId: d.id, ret: { not: null } } })) {
      if (!realRival.has(p.competitor)) realRival.set(p.competitor, new Map())
      const m = realRival.get(p.competitor)!
      m.set(d.day, (m.get(d.day) ?? 0) + (p.ret ?? 0))
    }
  }

  for (const cfg of CONFIGS) {
    const streakMap = new Map<string, number>()
    let cum = 0, hits = 0, n = 0, momOverlap = 0, winsVsMom = 0
    const perDay: { day: string; ret: number }[] = []
    for (const day of days) {
      const ctx = ctxs.get(day)!
      const picks = decideV2(ctx, cfg, streakMap)
      let dayRet = 0
      const momTop3 = new Set([...ctx.factors].sort((a, b) => b.mom7 - a.mom7).slice(0, 3).map((f) => f.symbol))
      for (const p of picks) {
        const e = entryPrice(ctx, p.symbol)
        const x = exitPrice(p.symbol, day)
        if (e === null || x === null) continue
        const ret = ((x - e) / e) * (p.direction === 'BUY' ? 1 : -1)
        dayRet += ret; n++
        if (ret > 0) hits++
        if (p.direction === 'BUY' && momTop3.has(p.symbol)) momOverlap++
      }
      dayRet = picks.length ? dayRet / picks.length : 0
      cum += dayRet
      perDay.push({ day, ret: dayRet })
      // update streak (kronologis, tanpa kebocoran)
      for (const p of picks) {
        const e = entryPrice(ctx, p.symbol)
        const x = exitPrice(p.symbol, day)
        if (e === null || x === null) continue
        const ret = ((x - e) / e) * (p.direction === 'BUY' ? 1 : -1)
        const cur = streakMap.get(p.symbol) ?? 0
        streakMap.set(p.symbol, ret > 0 ? 0 : Math.min(5, cur + 1))
      }
      const momRet = realRival.get('MOMENTUM')?.get(day) ?? 0
      if (dayRet > momRet) winsVsMom++
    }
    results.push({ name: cfg.name, cum, hits, n, momOverlap, winsVsMom })
    const detail = perDay.map((d) => `${d.ret >= 0 ? '+' : ''}${(d.ret * 100).toFixed(1)}`).join(' ')
    console.log(`${cfg.name.padEnd(18)} cum=${pc(cum).padStart(8)} hit=${pc(hits / Math.max(1, n))} hariMenangVsMOM=${winsVsMom}/${days.length} overlapMom7Top3=${(momOverlap / Math.max(1, days.length * 2)).toFixed(1)}/hari`)
    console.log(`${''.padEnd(18)} ${detail}`)
  }

  // hasil riil utk pembanding
  console.log('\n--- Riil (DB) ---')
  for (const [comp, m] of realRival) {
    const cum = [...m.values()].reduce((s, v) => s + v, 0)
    console.log(`${comp.padEnd(18)} cum=${pc(cum).padStart(8)}`)
  }

  // rekomendasi genome
  console.log('\nRekomendasi: pilih varian terbaik → genome seed V2 + brain policy baru.')
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
