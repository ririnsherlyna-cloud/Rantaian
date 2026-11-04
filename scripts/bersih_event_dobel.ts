// Bersihkan event CUAN dobel warisan bug slice(-60) — sisakan satu per teks unik.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const evs = await db.arenaEvent.findMany({ where: { kind: 'CUAN' }, orderBy: { createdAt: 'asc' } })
  const seen = new Set<string>()
  let hapus = 0
  for (const e of evs) {
    const kunci = `${e.day}|${e.text}`
    if (seen.has(kunci)) {
      await db.arenaEvent.delete({ where: { id: e.id } })
      hapus++
    } else seen.add(kunci)
  }
  console.log(`Event CUAN: ${evs.length} total, ${hapus} dobel dihapus, ${seen.size} unik disisakan`)
}
main().finally(() => db.$disconnect())
