import { db } from '../../src/lib/db'
async function main() {
  const rows = await db.pick.findMany({ select: { symbol: true }, distinct: ['symbol'] })
  const aneh = rows.map((r) => r.symbol).filter((s) => !/^[A-Z0-9]{2,20}$/.test(s))
  console.log('total simbol unik pernah-pick:', rows.length)
  console.log('simbol TIDAK SAH:', JSON.stringify(aneh))
  if (aneh.length > 0) {
    const n = await db.pick.count({ where: { symbol: { in: aneh } } })
    console.log('jumlah baris pick simbol tidak sah:', n)
  }
  await db.$disconnect()
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
