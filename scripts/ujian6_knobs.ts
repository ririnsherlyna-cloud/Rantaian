// Cek knob trajectory + keputusan hari pump
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const knobs = await db.genomeLog.findMany({ where: { kind: 'KNOB' }, orderBy: { day: 'asc' } })
  for (const k of knobs) console.log(`${k.day} KNOB ${k.note.slice(0, 160)}`)
  console.log('--- semua log kind count:')
  const all = await db.genomeLog.findMany({ orderBy: { day: 'asc' } })
  const kinds: Record<string, number> = {}
  for (const l of all) kinds[l.kind] = (kinds[l.kind] ?? 0) + 1
  console.log(kinds)

  for (const day of ['2026-09-16', '2026-09-17', '2026-09-15', '2026-09-05']) {
    const bd = await db.battleDay.findUnique({ where: { day }, include: { picks: true } })
    if (!bd) continue
    console.log(`\n=== ${day} (${bd.regime}) ===`)
    for (const p of bd.picks.filter((x) => x.competitor === 'MICAPROFITA')) {
      let ev: { policy?: string[]; duties?: { name: string; pass: boolean; note: string }[] } = {}
      try { ev = JSON.parse(p.evidence ?? '{}') } catch { /* */ }
      console.log(`  ${p.direction} ${p.symbol} conf=${Math.round(p.confidence)} ret=${((p.ret ?? 0) * 100).toFixed(1)}%`)
      for (const pl of ev.policy ?? []) console.log(`     POLICY: ${pl}`)
    }
  }
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
