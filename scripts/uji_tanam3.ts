import { db } from '../src/lib/db'
import { getKlines, atrPct, candlesBefore } from '../src/lib/cyborg/market'
const today = (await db.meta.findUnique({ where: { key: 'arenaToday' } }))!.value!
const bd = await db.battleDay.findUnique({ where: { day: today }, include: { picks: true } })
console.log('today', today, 'bd?', !!bd, 'picks', bd?.picks.length)
const kurang = bd!.picks.filter((p) => {
  if (p.competitor !== 'MICAPROFITA') return false
  if (typeof p.entryClose !== 'number' || !Number.isFinite(p.entryClose)) return false
  try { return !(p.evidence as { rencana?: unknown } | null)?.rencana } catch { return false }
})
console.log('kurang:', kurang.length, 'contoh entryClose type:', typeof bd!.picks[0].entryClose, bd!.picks[0].entryClose)
const p0 = kurang[0]
const t0 = Date.now()
const ks = await getKlines(p0.symbol)
console.log('kline', p0.symbol, ks.length, 'ATR', atrPct(candlesBefore(ks, today)), 'dalam', Date.now()-t0, 'ms')
process.exit(0)
