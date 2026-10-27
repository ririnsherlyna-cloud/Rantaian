// Diagnostik 2: replikasi persis guard harvestDay untuk satu hari
import { db } from '../src/lib/db'
import { getKlinesBulk, getUniverse, candlesBefore, getRegime } from '../src/lib/cyborg/market'
import { computeFactors, rankNormalize, factorBucket } from '../src/lib/cyborg/factors'

async function main() {
  const dayStr = '2026-09-12'
  const universe = await getUniverse()
  const symbols = universe.slice(0, 40).map((u) => u.symbol)
  if (!symbols.includes('BTCUSDT')) symbols.unshift('BTCUSDT')
  const klines = await getKlinesBulk(symbols)
  const btcAll = klines.get('BTCUSDT') ?? []

  // build context seperti buildDayContext
  const btcBefore = candlesBefore(btcAll, dayStr)
  console.log('BTC candles before day:', btcBefore.length)
  const factors = []
  const closes = new Map<string, number[]>()
  for (const [sym, ks] of klines) {
    const before = candlesBefore(ks, dayStr)
    if (before.length < 35) continue
    const f = computeFactors(sym, before, btcBefore)
    if (f) { factors.push(f); closes.set(sym, before.map((c) => c.close)) }
  }
  console.log('factors count:', factors.length)
  const norm = rankNormalize(factors)
  console.log('norm map size:', norm.size)
  console.log('norm symbols sample:', [...norm.keys()].slice(0, 8))

  const dayRow = await db.battleDay.findUnique({ where: { day: dayStr }, include: { picks: true } })
  const mine = dayRow!.picks.filter((p) => p.competitor === 'MICAPROFITA')
  console.log('MICAPROFITA picks:', mine.length)
  for (const p of mine) {
    const n = norm.get(p.symbol)
    console.log(`  ${p.symbol} ret=${p.ret} norm=${n ? factorBucket(n) : 'TIDAK_ADA_DI_NORM'} entry=${p.entryClose}`)
  }
  await db.$disconnect()
}
main().catch((e) => { console.error('DIAG ERROR:', e); process.exit(1) })
