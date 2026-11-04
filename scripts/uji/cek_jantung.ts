import { db } from '../../src/lib/db'
async function main() {
  const meta = await db.meta.findMany({ where: { key: { in: ['runHeartbeat', 'bootstrapStatus', 'bootstrapError', 'arenaToday'] } } })
  for (const m of meta) {
    const v = m.key === 'runHeartbeat' ? `${m.value} (${((Date.now() - parseInt(m.value)) / 1000).toFixed(0)}s lalu)` : m.value
    console.log(`${m.key} = ${v}`)
  }
  const ev = await db.arenaEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { day: true, kind: true, text: true, createdAt: true } })
  for (const e of ev) console.log(`[${e.createdAt.toISOString().slice(11, 19)}] ${e.kind}: ${e.text.slice(0, 110)}`)
  await db.$disconnect()
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
