// Diagnosis mendalam: tiru alur perkayaWarisan untuk SATU koin, tangkap stack.
import { db } from '../src/lib/db'
import { mesinWarisan, monteCarlo24j, rangkaiRencana, fnv1a } from '../src/lib/cyborg/warisan'
import { fnv1a } from '../src/lib/cyborg/brain'
import { getKlines1hDeep, getKlines, atrPct, candlesBefore } from '../src/lib/cyborg/market'

const today = (await db.meta.findUnique({ where: { key: 'arenaToday' } }))!.value!
const bd = await db.battleDay.findUnique({ where: { day: today }, include: { picks: true } })
const p = bd!.picks.find((x) => x.competitor === 'MICAPROFITA' && x.symbol === '0GUSDT')!
console.log('koin', p.symbol, 'entry', p.entryClose, 'dir', p.direction)
try {
  const c = (await getKlines1hDeep(p.symbol)).filter((x: any) => x.openTime + 3600_000 <= Date.now())
  console.log('candle1h:', c.length)
  const war = mesinWarisan(c, c)
  console.log('warisan ok, sigma', war.garch.sigma24jPct)
  const seed = fnv1a(`WARISAN|${p.symbol}|${today}`)
  const mc = monteCarlo24j(c, war.garch, seed)
  console.log('mc ok')
  const ks = await getKlines(p.symbol)
  const atr = atrPct(candlesBefore(ks, today))
  const rencana = rangkaiRencana(p.direction as 'BUY'|'SELL', p.entryClose, atr, war, mc)
  console.log('rencana ok: entry', rencana.entry, 'ambisius', rencana.highAmbisius, 'powerMax', rencana.powerMax, 'stop', rencana.stop)
} catch (e) {
  console.error('GAGAL:', (e as Error).stack?.slice(0, 600))
}
process.exit(0)
