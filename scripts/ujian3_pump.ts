// Bedah hari-hari pump raksasa: siapa koinnya, apa candle-nya,
// apa yang dipilih MOMENTUM DB vs lab V7, dan mengapa.
import { PrismaClient } from '@prisma/client'
import { Candle, dayOpenTs, dayOfTs, getKlinesBulk, getUniverse, candlesBefore } from '../src/lib/cyborg/market'
import { computeFactors } from '../src/lib/cyborg/factors'

const db = new PrismaClient()
const pc = (x: number) => `${(x * 100).toFixed(1)}%`

async function main() {
  const universe = (await getUniverse()).slice(0, 40)
  const symbols = universe.map((u) => u.symbol)
  if (!symbols.includes('BTCUSDT')) symbols.unshift('BTCUSDT')
  const klines = await getKlinesBulk(symbols)

  const targetDays = ['2026-09-04', '2026-09-05', '2026-09-16', '2026-09-17', '2026-09-18']
  const days = await db.battleDay.findMany({ include: { picks: true } })

  for (const day of targetDays) {
    const ts = dayOpenTs(day)
    console.log(`\n===== ${day} =====`)
    const row = days.find((d) => d.day === day)
    const mom = row?.picks.filter((p) => p.competitor === 'MOMENTUM') ?? []
    for (const p of mom) {
      console.log(`  DB MOMENTUM: ${p.symbol} ${p.direction} entry=${p.entryClose} exit=${p.exitClose} ret=${pc(p.ret ?? 0)}`)
    }
    // top-7 mom7 menurut data hari ini (universe sekarang)
    const btcAll = klines.get('BTCUSDT') ?? []
    const btcBefore = candlesBefore(btcAll, day)
    const cand: { sym: string; mom7: number; lastRet: number; closePos: number; atr: number }[] = []
    for (const [sym, ks] of klines) {
      const before = candlesBefore(ks, day)
      if (before.length < 35) continue
      const f = computeFactors(sym, before, btcBefore)
      if (!f) continue
      const lc = before[before.length - 1]
      const rng = lc.high - lc.low
      cand.push({ sym, mom7: f.mom7, lastRet: ((lc.close - lc.open) / lc.open) * 100, closePos: rng > 0 ? (lc.close - lc.low) / rng : 0.5, atr: f.atrPct })
    }
    cand.sort((a, b) => b.mom7 - a.mom7)
    console.log('  Top-7 mom7 (universe hari-ini):')
    for (const c of cand.slice(0, 7)) {
      const inUniv = universe.some((u) => u.symbol === c.sym) ? '' : ' [LUAR-40]'
      console.log(`    ${c.sym.padEnd(14)} mom7=${c.mom7.toFixed(1)}% lastDay=${c.lastRet.toFixed(1)}% closePos=${c.closePos.toFixed(2)} ATR=${c.atr.toFixed(1)}%${inUniv}`)
    }
    // candle 4 hari terakhir utk 2 koin mom7 teratas
    for (const c of cand.slice(0, 2)) {
      const ks = (klines.get(c.sym) ?? []).filter((k) => k.openTime < ts).slice(-4)
      console.log(`  candle ${c.sym}: ${ks.map((k) => `${dayOfTs(k.openTime).slice(5)}:+${(((k.close - k.open) / k.open) * 100).toFixed(0)}%`).join(' ')}`)
    }
  }
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
