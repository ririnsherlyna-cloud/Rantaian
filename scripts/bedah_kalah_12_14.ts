// ============================================================
// BEDAH TRAGEDI 12–14 OKT — telaah kalah beruntun dari DB nyata.
// Output: daftar rencana MICAPROFITA per hari + vonis + konteks.
// ============================================================
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function safeJson(s: string | null): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) as Record<string, unknown> } catch { return {} }
}

async function main() {
  const days = await db.battleDay.findMany({
    orderBy: { day: 'asc' },
    include: { picks: true },
  })
  console.log(`TOTAL BattleDay: ${days.length}`)
  for (const d of days) {
    const mp = d.picks.filter((p) => p.competitor === 'MICAPROFITA')
    console.log(`\n=== ${d.day} | rezim=${d.regime} | status=${d.status} | pick MICAPROFITA=${mp.length} | total pick=${d.picks.length}`)
    for (const p of mp) {
      const ev = safeJson(p.evidence) as Record<string, unknown>
      const rencana = ev.rencana as Record<string, unknown> | undefined
      const alasan = (ev.alasan ?? ev.reasons ?? []) as string[]
      console.log(`  ${p.symbol} ${p.direction} conf=${Math.round(p.confidence)}% entry=${p.entryClose} exit=${p.exitClose} ret=${p.ret} hit=${p.hit}`)
      if (rencana) {
        console.log(`    rencana: entry=${rencana.entry} stop=${rencana.stop} target=${rencana.target} targetPct=${rencana.targetPct} stopPct=${rencana.stopPct}`)
      } else {
        console.log(`    rencana: TIDAK ADA kunci 'rencana' → kunci evidence: ${Object.keys(ev).join(',')}`)
      }
      if (alasan.length) console.log(`    alasan: ${alasan.slice(0, 3).join(' | ')}`)
    }
  }
  // events terakhir
  const events = await db.arenaEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
  console.log(`\n=== 30 ARENA EVENT TERAKHIR ===`)
  for (const e of events) console.log(`  [${e.day}] ${e.kind}: ${e.text.slice(0, 180)}`)
  const meta = await db.meta.findMany()
  console.log(`\n=== META ===`)
  for (const m of meta) console.log(`  ${m.key} = ${m.value.slice(0, 140)}`)
}

main().finally(() => db.$disconnect())
