import { decidePredator, DEFAULT_GENOME_V2, DEFAULT_WEIGHTS } from '/home/z/my-project/src/lib/cyborg/brain'
import type { CoinFactors } from '/home/z/my-project/src/lib/cyborg/factors'
import type { RegimeInfo } from '/home/z/my-project/src/lib/cyborg/market'

function faktor(n: number, mom7: number, mom30: number, atrPct = 6, emaAlign = 1): CoinFactors {
  return { symbol: `KOIN${n}`, mom7, mom30, emaAlign, rsi: 55, volSurge: 1.2, atrPct, distHigh: -3, btcCorr: 0.5, close: 1 + n / 100 }
}
function regime(breadth: number): RegimeInfo {
  return { regime: 'TREND_NAIK', btcEma20: 2, btcEma50: 1, btcAtrPct: 2, btcMom7: 1, breadth, note: 'FIKSTUR' }
}
const L = Array.from({ length: 12 }, (_, i) => faktor(i + 1, 14 - i, 30 - i, 5 + (i % 3)))
const norm = new Map(L.map((f) => [f.symbol, { mom7: f.mom7 / 20, mom30: f.mom30 / 40, emaAlign: 1, rsi: 0.5, volSurge: 0.6, atrInv: 0.7, distHigh: 0.8, btcCorr: 0.5 }]))
const closes = new Map(L.map((f, idx) => [f.symbol, Array.from({ length: 60 }, (_, i) => 1 + i * 0.002 + 0.10 * Math.sin(i / 4 + idx * 1.1) + 0.05 * Math.sin(i / 2.3 + idx * 2.3))]))
const m4h = new Map(L.map((f) => [f.symbol, f.mom7 * 0.8]))
const res = decidePredator({ factors: L, norm, universeCloses: closes, regime: regime(70), generation: 30, genome: DEFAULT_GENOME_V2, weights: DEFAULT_WEIGHTS, m4h })
console.log('picks:', res.picks.map((p) => p.symbol).join(','))
console.log('rejected:')
res.rejected.forEach((r) => console.log('  -', r.symbol, '::', r.reason))
