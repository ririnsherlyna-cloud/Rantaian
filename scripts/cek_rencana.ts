import { db } from '../src/lib/db'
import { bacaEvidence } from '../src/lib/cyborg/evidence'
const meta = await db.meta.findUnique({ where: { key: 'arenaToday' } })
const day = meta?.value ?? new Date().toISOString().slice(0, 10)
const bd = await db.battleDay.findUnique({ where: { day }, include: { picks: true } })
const mine = bd!.picks.filter((p) => p.competitor === 'MICAPROFITA')
let rencana = 0, ambisius = 0, pmax = 0
let contoh: any = null
for (const p of mine) {
  const r = (bacaEvidence(p.evidence).rencana ?? null) as any
  if (!r) continue
  rencana++
  if (Number.isFinite(r.highAmbisius)) ambisius++
  if (Number.isFinite(r.powerMax)) pmax++
  if (!contoh && Number.isFinite(r.powerMax)) contoh = { sym: p.symbol, dir: p.direction, entry: r.entry, sasaran: r.target, ambisius: r.highAmbisius, powerMax: r.powerMax, stop: r.stop }
}
console.log(`hari=${day} · MICAPROFITA=${mine.length} · rencana=${rencana} · ambisius=${ambisius} · powerMax=${pmax}`)
if (contoh) console.log('contoh:', JSON.stringify(contoh))
process.exit(0)
