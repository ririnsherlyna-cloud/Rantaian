// Diagnostik: uji harvestDay untuk satu hari nyata dari DB
import { db } from '../src/lib/db'
import { getKlines, getKlinesBulk, getUniverse } from '../src/lib/cyborg/market'

async function main() {
  const dayStr = '2026-09-12'
  const universe = await getUniverse()
  const symbols = universe.slice(0, 40).map((u) => u.symbol)
  if (!symbols.includes('BTCUSDT')) symbols.unshift('BTCUSDT')
  const klines = await getKlinesBulk(symbols)

  const dayRow = await db.battleDay.findUnique({ where: { day: dayStr }, include: { picks: true } })
  console.log('dayRow:', dayRow?.day, dayRow?.status, 'picks:', dayRow?.picks.length)

  const btcAll = klines.get('BTCUSDT') ?? []
  const { candleForDay } = await import('../src/lib/cyborg/market')
  const eth = klines.get('ETHUSDT') ?? []
  console.log('ETHUSDT candles:', eth.length, '| candle 09-12:', candleForDay(eth, dayStr)?.close ?? 'TIDAK ADA')

  // cek fingerprint deterministik
  const { episodeFingerprint } = await import('../src/lib/cyborg/brain')
  console.log('fingerprint contoh:', episodeFingerprint('TREND_NAIK', 'ETHUSDT', 'PPNNPPPP', 'BUY').toString(16))

  // coba remember langsung
  const { remember } = await import('../src/lib/cyborg/memory')
  const r = await remember('EPISODE', 'diagtest123', { n: 1, sumRet: 0.01, hitCount: 1 }, dayStr)
  console.log('remember diag:', r)
  await db.memoryEpisode.delete({ where: { fingerprint: 'diagtest123' } })

  await db.$disconnect()
}
main().catch((e) => { console.error('DIAG ERROR:', e); process.exit(1) })
