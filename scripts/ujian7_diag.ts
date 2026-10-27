// UJIAN #7 — Bedah kelemahan terbaru MICAPROFITA + uji hipotesis
// "leader mati intraday": mom7 tinggi tapi momentum 4-jam sudah membalik.
// Jika pick dengan mom4h negatif jauh lebih buruk → sumber informasi 4h layak dipasang.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BIN = 'https://api.binance.com'

interface K { openTime: number; close: number }
async function k4h(sym: string, limit = 200): Promise<K[]> {
  const r = await fetch(`${BIN}/api/v3/klines?symbol=${sym}&interval=4h&limit=${limit}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`k4h ${sym} ${r.status}`)
  const raw = (await r.json()) as unknown[][]
  return raw.map((k) => ({ openTime: k[0] as number, close: parseFloat(k[4] as string) }))
}

async function main() {
  // 1. standings
  const picks = await db.pick.findMany({ include: { battleDay: true } })
  const comps = new Map<string, { sum: number; n: number; hits: number; hn: number }>()
  for (const p of picks) {
    if (p.ret === null) continue
    const c = comps.get(p.competitor) ?? { sum: 0, n: 0, hits: 0, hn: 0 }
    c.sum += p.ret; c.n++
    if (p.hit !== null) { c.hn++; if (p.hit) c.hits++ }
    comps.set(p.competitor, c)
  }
  console.log('=== STANDING (semua hari teradili) ===')
  for (const [k, v] of [...comps.entries()].sort((a, b) => b[1].sum - a[1].sum))
    console.log(`${k.padEnd(12)} ${(v.sum * 100).toFixed(1)}%  hit=${v.hn ? Math.round((v.hits / v.hn) * 100) : 0}%  pick=${v.n}`)

  // 2. hari berdarah MICAPROFITA (6 hari terakhir)
  const days = await db.battleDay.findMany({ where: { status: 'SCORED' }, orderBy: { day: 'asc' } })
  console.log('\n=== 8 HARI TERAKHIR — MICAPROFITA ===')
  const mine = picks.filter((p) => p.competitor === 'MICAPROFITA' && p.ret !== null)
  const recent = days.slice(-8)
  for (const d of recent) {
    const dp = mine.filter((p) => p.battleDayId === d.id)
    const sum = dp.reduce((s, p) => s + (p.ret ?? 0), 0)
    console.log(`${d.day} ${d.regime.padEnd(11)} sum=${(sum * 100).toFixed(1)}%`)
    for (const p of dp) {
      let ev: { factors?: Record<string, number>; policy?: string[] } = {}
      try { ev = JSON.parse(p.evidence ?? '{}') } catch { /* */ }
      const m7 = ev.factors?.mom7
      console.log(`   ${p.direction} ${p.symbol.padEnd(12)} ret=${((p.ret ?? 0) * 100).toFixed(1)}% mom7=${m7?.toFixed(1) ?? '?'}%`)
    }
  }

  // 3. UJI HIPOTESIS: mom4h (24 jam, 6 candle 4h SEBELUM hari-D) vs hasil
  //    pick diputuskan dengan data < hari-D; entry = close T-1; exit = close D.
  const scoredMine = mine.slice(-80)
  const syms = [...new Set(scoredMine.map((p) => p.symbol))]
  const cache4 = new Map<string, K[]>()
  const CONC = 6
  for (let i = 0; i < syms.length; i += CONC) {
    await Promise.all(syms.slice(i, i + CONC).map(async (s) => {
      try { cache4.set(s, await k4h(s)) } catch { cache4.set(s, []) }
    }))
  }
  interface Row { day: string; sym: string; m7: number; m4h: number; ret: number }
  const rows: Row[] = []
  for (const p of scoredMine) {
    const dayOpen = Date.parse(`${p.battleDay.day}T00:00:00.000Z`)
    const k = (cache4.get(p.symbol) ?? []).filter((c) => c.openTime < dayOpen)
    if (k.length < 7) continue
    const m4h = ((k[k.length - 1].close - k[k.length - 7].close) / k[k.length - 7].close) * 100
    let m7 = 0
    try { m7 = ((JSON.parse(p.evidence ?? '{}').factors)?.mom7) ?? 0 } catch { /* */ }
    rows.push({ day: p.battleDay.day, sym: p.symbol, m7, m4h, ret: (p.ret ?? 0) * 100 })
  }
  console.log(`\n=== UJI MOM4H (n=${rows.length} pick terakhir) ===`)
  const seg = (lo: number, hi: number, label: string) => {
    const g = rows.filter((r) => r.m4h >= lo && r.m4h < hi)
    if (!g.length) { console.log(`${label}: n=0`); return }
    const avg = g.reduce((s, r) => s + r.ret, 0) / g.length
    const hit = (g.filter((r) => r.ret > 0).length / g.length) * 100
    console.log(`${label}: n=${g.length} avg=${avg.toFixed(1)}% hit=${hit.toFixed(0)}%`)
  }
  seg(-999, -5, 'm4h < -5%   (leader mati)')
  seg(-5, 0, '-5% ≤ m4h < 0  (melemah)')
  seg(0, 5, '0 ≤ m4h < 5%   (tenang)')
  seg(5, 999, 'm4h ≥ 5%    (masih akselerasi)')

  // 4. khusus: mom7 tinggi (>10%) tapi m4h negatif = "pump sudah basi"
  const dying = rows.filter((r) => r.m7 > 10 && r.m4h < 0)
  const alive = rows.filter((r) => r.m7 > 10 && r.m4h >= 0)
  const avg = (a: Row[]) => (a.length ? (a.reduce((s, r) => s + r.ret, 0) / a.length).toFixed(1) : '-')
  console.log(`\nLEADER mom7>10%: MATI-4h n=${dying.length} avg=${avg(dying)}% vs HIDUP-4h n=${alive.length} avg=${avg(alive)}%`)
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
