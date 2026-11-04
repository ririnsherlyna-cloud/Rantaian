// ============================================================
// BERSIH-BERSIH V302 — hapus pick simbol korup (mis. “龙虾USDT” —
// simbol mustahil ada di Binance, hasil data korup masa lalu) dari
// pool keputusan + ingatan, dan catat JUJUR di ArenaEvent.
// Prinsip: data korup bukan pengalaman sah otak — memeliharanya
// berarti membiarkan memori palsu & pemicu circuit-open tetap hidup.
// Jalankan: bun scripts/uji/bersih_simbol_korup.ts
// ============================================================
import { db } from '../../src/lib/db'

async function main() {
  const semua = await db.pick.findMany({ select: { symbol: true }, distinct: ['symbol'] })
  const korup = semua.map((r) => r.symbol).filter((s) => !/^[A-Z0-9]{2,20}$/.test(s))
  if (korup.length === 0) {
    console.log('tidak ada simbol korup — selesai')
    await db.$disconnect()
    return
  }
  console.log('simbol korup:', JSON.stringify(korup))

  const pickHapus = await db.pick.deleteMany({ where: { symbol: { in: korup } } })
  console.log('pick dihapus:', pickHapus.count)

  // ingatan yang mengutip simbol korup = memori palsu — dibuang
  let epHapus = 0
  for (const s of korup) {
    const r = await db.memoryEpisode.deleteMany({ where: { payload: { contains: s } } })
    epHapus += r.count
  }
  console.log('episode memori palsu dihapus:', epHapus)

  const today = new Date().toISOString().slice(0, 10)
  await db.arenaEvent.create({
    data: {
      day: today,
      kind: 'SISTEM',
      text: `V302 BERSIH-BERSIH: ${pickHapus.count} pick simbol korup (${korup.join(', ')} — simbol mustahil ada di Binance, sisipan data rusak masa lalu) dihapus dari pool & ingatan. Sebelumnya simbol zombie ini memicu kegagalan sumber data berulang tiap denyut (salah satu akar "circuit open" tiap pergantian hari). Pemjaga cerdas + guard simbol-sah kini memblokirnya permanen.`,
    },
  })
  console.log('ArenaEvent SISTEM dicatat')
  await db.$disconnect()
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
