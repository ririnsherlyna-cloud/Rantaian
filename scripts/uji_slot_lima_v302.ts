/* UJI V302 SLOT-LIMA — cyborg chat ini wajib menampilkan 5 koin sasaran.
 * Dua skenario:
 *   A) pasar sehat (breadth tinggi, momentum moderat) → 5 pick PENUH (k=5)
 *   B) pasar sempit (breadth rendah → kebijakan K=2) → 2 penuh + 3 PENGAWASAN
 * Fixture sintetis — diberi label FIKSTUR UJI (bukan data pasar, V274 aman). */
import { decidePredator, DEFAULT_GENOME_V2, DEFAULT_WEIGHTS } from '../src/lib/cyborg/brain'
import type { CoinFactors } from '../src/lib/cyborg/factors'
import type { RegimeInfo } from '../src/lib/cyborg/market'

function faktor(n: number, mom7: number, mom30: number, atrPct = 6, emaAlign = 1): CoinFactors {
  return { symbol: `KOIN${n}`, mom7, mom30, emaAlign, rsi: 55, volSurge: 1.2, atrPct, distHigh: -3, btcCorr: 0.5, close: 1 + n / 100 }
}

function regime(breadth: number): RegimeInfo {
  return { regime: 'TREND_NAIK', btcEma20: 2, btcEma50: 1, btcAtrPct: 2, btcMom7: 1, breadth, note: 'FIKSTUR UJI' }
}

function ctxB(faktorList: CoinFactors[], breadth: number, genome = DEFAULT_GENOME_V2) {
  const norm = new Map(faktorList.map((f) => [f.symbol, { mom7: f.mom7 / 20, mom30: f.mom30 / 40, emaAlign: 1, rsi: 0.5, volSurge: 0.6, atrInv: 0.7, distHigh: 0.8, btcCorr: 0.5 }]))
  // fase berbeda per koin — korelasi antar-koin < 0.95 (guard anti-tumpang-tindih sah)
  const closes = new Map(faktorList.map((f, idx) => [f.symbol, Array.from({ length: 60 }, (_, i) => 1 + i * 0.002 + 0.10 * Math.sin(i / 4 + idx * 1.1) + 0.05 * Math.sin(i / 2.3 + idx * 2.3))]))
  const m4h = new Map(faktorList.map((f) => [f.symbol, f.mom7 * 0.8]))
  return { factors: faktorList, norm, universeCloses: closes, regime: regime(breadth), generation: 30, genome: genome, weights: DEFAULT_WEIGHTS, m4h } as const
}

// ---- SKENARIO A: pasar sehat, 12 koin → wajib 5 pick tanpa pengawasan ----
const A = decidePredator(ctxB(
  Array.from({ length: 12 }, (_, i) => faktor(i + 1, 14 - i, 30 - i, 5 + (i % 3))),
  70,
))
console.log('A) SEHAT: lahir', A.picks.length, '| pengawasan', A.picks.filter((p) => (p.evidence as { pengawasan?: boolean }).pengawasan).length)
console.log('   symbols:', A.picks.map((p) => `${p.symbol}@${p.confidence}%`).join(' '))

// ---- SKENARIO B: pasar sempit (breadth 30 < breadthK1 32 → K=1 fokus) ----
const B = decidePredator(ctxB(
  Array.from({ length: 12 }, (_, i) => faktor(i + 1, 14 - i, 30 - i, 5 + (i % 3))),
  30,
))
const bPeng = B.picks.filter((p) => (p.evidence as { pengawasan?: boolean }).pengawasan)
console.log('B) SEMPIT: lahir', B.picks.length, '| pengawasan', bPeng.length, '| policy:', B.rejected.length ? '' : '')
console.log('   symbols:', B.picks.map((p) => `${p.symbol}@${p.confidence}%${(p.evidence as { pengawasan?: boolean }).pengawasan ? '(PENGAWASAN)' : ''}`).join(' '))

// ---- SKENARIO C: determinisme — data sama → vonis identik ----
const C1 = JSON.stringify(decidePredator(ctxB(Array.from({ length: 12 }, (_, i) => faktor(i + 1, 14 - i, 30 - i)), 70)).picks)
const C2 = JSON.stringify(decidePredator(ctxB(Array.from({ length: 12 }, (_, i) => faktor(i + 1, 14 - i, 30 - i)), 70)).picks)
console.log('C) DETERMINISME:', C1 === C2 ? 'SAH (identik)' : 'GAGAL (beda!)')

const aLulus = A.picks.length === 5 && A.picks.every((p) => !(p.evidence as { pengawasan?: boolean }).pengawasan)
// breadth 30 < breadthK1 32 → kebijakan K=1 fokus: 1 penuh + 4 pengawasan
const bLulus = B.picks.length === 5 && bPeng.length === 4 && B.picks[0] && !(B.picks[0].evidence as { pengawasan?: boolean }).pengawasan
  && B.picks.slice(1).every((p) => (p.evidence as { pengawasan?: boolean }).pengawasan)
console.log('VONIS A (5 penuh):', aLulus ? 'LULUS' : 'GAGAL', '| VONIS B (1 penuh + 4 pengawasan):', bLulus ? 'LULUS' : 'GAGAL')
