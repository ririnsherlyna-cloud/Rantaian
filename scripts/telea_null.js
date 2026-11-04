// Cek detail: pick TP=null hari ini + volatilitas pasar lintas era
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const d = await db.battleDay.findUnique({ where: { day: '2026-10-27' }, include: { picks: true } })
  const picks = d.picks
  let nullRencana = 0, adaWarisan = 0
  const nullSyms = []
  for (const p of picks) {
    try {
      const e = JSON.parse(p.evidence || '{}')
      if (e.rencana) { nullRencana++ } else { nullSyms.push(`${p.symbol}(conf${p.confidence})`) }
      if (e.warisan) adaWarisan++
    } catch { nullSyms.push(p.symbol + ' [JSON rusak]') }
  }
  console.log(`2026-10-27: total pick=${picks.length} · punya rencana=${nullRencana} · punya warisan=${adaWarisan}`)
  console.log(`TANPA rencana (${nullSyms.length}): ${nullSyms.slice(0, 30).join(', ')}`)
  // Competitor?
  const komp = {}
  for (const p of picks) komp[p.competitorId || '?'] = (komp[p.competitorId || '?'] || 0) + 1
  console.log('per kompetitor:', JSON.stringify(komp))
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
