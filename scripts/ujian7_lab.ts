// ============================================================
// UJIAN #7 — LAB V3: radar "leader mati" 4 jam (bebas kebocoran).
// V2 (guard off) vs V3a (-3) vs V3b (-5) vs V3c (-8), 21 hari sama,
// candle 1d + 4h riil Binance. Pick diputuskan HANYA dari candle
// selesai sebelum hari-D (4h: openTime < buka hari-D).
// ============================================================
import {
  Candle, addDays, candlesBefore, dayOfTs, dayOpenTs, dynamicUniverse, getKlines4hBulk, getKlinesBulk,
  getRegime, getUniverse, mom4hFrom,
} from '../src/lib/cyborg/market'
import { CoinFactors, computeFactors, rankNormalize } from '../src/lib/cyborg/factors'
import { DEFAULT_GENOME_V2, DEFAULT_WEIGHTS, decidePredator } from '../src/lib/cyborg/brain'

const DAYS = 21
const UNIVERSE_N = 40
const today = dayOfTs(Date.now())
const firstDay = addDays(today, -DAYS)

interface Variant { name: string; m4hReject: number; zeroM4h?: boolean; sums: number; hits: number; n: number; perDay: Map<string, number> }
const variants: Variant[] = [
  { name: 'V2-pure (tanpa info 4h)', m4hReject: 0, zeroM4h: true, sums: 0, hits: 0, n: 0, perDay: new Map() },
  { name: 'V3-tie (info 4h, tanpa reject)', m4hReject: 0, sums: 0, hits: 0, n: 0, perDay: new Map() },
  { name: 'V3c reject<-8', m4hReject: -8, sums: 0, hits: 0, n: 0, perDay: new Map() },
]

async function main() {
  console.log('Mengambil data riil...')
  const universe = await getUniverse()
  const pool = universe.slice(0, 120).map((u) => u.symbol)
  if (!pool.includes('BTCUSDT')) pool.unshift('BTCUSDT')
  const klines = await getKlinesBulk(pool)
  const klines4h = await getKlines4hBulk(pool)
  const btcAll = klines.get('BTCUSDT') ?? []
  console.log(`pool=${pool.length} klines=${klines.size} k4h=${klines4h.size}`)

  for (let i = 0; i < DAYS; i++) {
    const day = addDays(firstDay, i)
    const ts = dayOpenTs(day)
    const universeSyms = dynamicUniverse(klines, day, UNIVERSE_N)
    const btcBefore = candlesBefore(btcAll, day)
    const factors: CoinFactors[] = []
    const closes = new Map<string, number[]>()
    const m4h = new Map<string, number>()
    for (const sym of universeSyms) {
      const before = candlesBefore(klines.get(sym) ?? [], day)
      if (before.length < 35) continue
      const f = computeFactors(sym, before, btcBefore)
      if (!f) continue
      factors.push(f)
      closes.set(sym, before.map((c) => c.close))
      m4h.set(sym, mom4hFrom(klines4h.get(sym), ts))
    }
    if (factors.length < 10) { console.log(`${day} skip: faktor ${factors.length}`); continue }
    const norm = rankNormalize(factors)
    const regime = await getRegime(btcBefore, closes)
    const entryOf = (sym: string) => factors.find((f) => f.symbol === sym)?.close ?? NaN
    const exitOf = (sym: string) => (klines.get(sym) ?? []).find((c) => c.openTime === ts)?.close ?? null

    for (const v of variants) {
      const m4hUse = v.zeroM4h ? new Map([...m4h.keys()].map((k) => [k, 0])) : m4h
      const brain = decidePredator({
        factors, norm, universeCloses: closes, regime, generation: 1,
        genome: { ...DEFAULT_GENOME_V2, m4hReject: v.m4hReject }, weights: { ...DEFAULT_WEIGHTS }, m4h: m4hUse,
      })
      let sum = 0, cnt = 0
      for (const p of brain.picks) {
        const entry = entryOf(p.symbol), exit = exitOf(p.symbol)
        if (!Number.isFinite(entry) || exit === null) continue
        const ret = ((exit - entry) / entry) * (p.direction === 'BUY' ? 1 : -1)
        v.sums += ret; sum += ret; v.n++
        cnt++
        if (ret > 0) v.hits++
        if (v.m4hReject < 0 && p.direction === 'BUY' && (m4h.get(p.symbol) ?? 0) < v.m4hReject) console.log(`  !! ${v.name} ${day} ${p.symbol} lolos guard (${(m4h.get(p.symbol) ?? 0).toFixed(1)})`)
      }
      v.perDay.set(day, cnt ? sum / cnt : 0)
    }
    const v2 = variants[0].perDay.get(day) ?? 0
    console.log(`${day} ${regime.regime.padEnd(11)} V2=${(v2 * 100).toFixed(1)}% | ` +
      variants.slice(1).map((v) => `${v.name.slice(0, 3)}=${((v.perDay.get(day) ?? 0) * 100).toFixed(1)}%`).join(' '))
  }

  console.log('\n=== HASIL 21 HARI (rata-rata per pick per hari, kumulatif) ===')
  for (const v of variants) {
    const cum = [...v.perDay.values()].reduce((s, r) => s + r, 0)
    const hit = v.n ? Math.round((v.hits / v.n) * 100) : 0
    console.log(`${v.name.padEnd(14)} kumulatif=${(cum * 100).toFixed(1)}%  pick=${v.n}  hit=${hit}%`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
