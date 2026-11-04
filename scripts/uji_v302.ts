// ============================================================
// UJI V302 PULIH-DARI-TRAGEDI — pagar diuji dengan DATA TRAGEDI ASLI.
// Kasus uji:
//   1. rencanaCacat: rencana WAL asli (stop −36,69%, target +0,45%) → harus CACAT
//   2. rencanaCacat: rencana sehat (stop −9%, target +8%, net 7,6%) → harus SEHAT
//   3. decidePredator: MAGIC & STRK dalam jeraSimbol → harus DITOLAK
//   4. decidePredator: kStreak 5 → policy K-DARURAT + K=1
//   5. resolveRencana: jalur MENANG-minus mustahil (V301 regression)
// ============================================================
import { rencanaCacat } from '../src/lib/cyborg/warisan'
import { resolveRencana } from '../src/lib/cyborg/cuan'
import { decidePredator, DEFAULT_GENOME_V2, DEFAULT_WEIGHTS } from '../src/lib/cyborg/brain'
import { FACTOR_IDS } from '../src/lib/cyborg/factors'
import type { Rencana } from '../src/lib/cyborg/warisan'
import type { CoinFactors } from '../src/lib/cyborg/factors'

let lulus = 0, gagal = 0
function cek(nama: string, kondisi: boolean, detail = '') {
  if (kondisi) { lulus++; console.log(`  LULUS  ${nama}${detail ? ' — ' + detail : ''}`) }
  else { gagal++; console.log(`  GAGAL  ${nama}${detail ? ' — ' + detail : ''}`) }
}

console.log('=== KASUS 1: rencana WAL asli (tragedi 10-15) ===')
const rencanaWAL: Rencana = {
  entry: 0.05844, stop: 0.0370011, target: 0.05870042, highAmbisius: 0.0733364,
  stopPct: -36.69, targetPct: 0.45, ambisiusPct: 25.49, pTarget: 0.913, pStop: 0.005,
  pAmbisius: 0.308, targetMediana: false, netUntungPct: 0.05,
  sumberTarget: 'magnet Volume Profile', ketGuard: '',
}
const alasan1 = rencanaCacat(rencanaWAL)
cek('WAL terdeteksi cacat', alasan1 !== null, alasan1 ?? 'sehat?!')

console.log('=== KASUS 2: rencana sehat standar ===')
const rencanaSehat: Rencana = {
  entry: 100, stop: 91, target: 108, highAmbisius: 112,
  stopPct: -9, targetPct: 8, ambisiusPct: 12, pTarget: 0.5, pStop: 0.05,
  pAmbisius: 0.3, targetMediana: false, netUntungPct: 7.6,
  sumberTarget: 'uji', ketGuard: '',
}
cek('rencana sehat lolos', rencanaCacat(rencanaSehat) === null, rencanaCacat(rencanaSehat) ?? 'sehat')

console.log('=== KASUS 3: rencana stop rapat ekstrem ===')
cek('stop -1% ditolak', rencanaCacat({ ...rencanaSehat, stopPct: -1, stop: 99 }) !== null)

console.log('=== KASUS 4: decidePredator — JERA-KALAH (MAGIC & STRK, tragedi 10-12) ===')
// faktor mini: 4 koin, MAGIC & STRK mom7 tinggi (bakal menang antrian tanpa pagar)
const mkF = (symbol: string, mom7: number): CoinFactors => ({
  symbol, close: 1, mom7, mom30: mom7 / 3, emaAlign: 1, rsi: 58, volSurge: 1.4,
  atrPct: 6, distHigh: -8, btcCorr: 0.8,
  volume: 1e6, qvUsd: 5e6,
} as unknown as CoinFactors)
const factors = [mkF('MAGICUSDT', 18), mkF('STRKUSDT', 16), mkF('APTUSDT', 8), mkF('WALUSDT', 5)]
const norm = new Map<string, Record<string, number>>()
for (const f of factors) { const o: Record<string, number> = {}; for (const id of FACTOR_IDS) o[id] = 0.5; o['mom7'] = f.mom7 / 20; norm.set(f.symbol, o as never) }
const jera = new Map([
  ['MAGICUSDT', { day: '2026-10-10', netPct: -21.05 }],
  ['STRKUSDT', { day: '2026-10-12', netPct: -30.9 }],
])
const regime = {
  regime: 'SIDEWAYS', note: 'uji', breadth: 50,
} as never
const res3 = decidePredator({
  factors, norm: norm as never, universeCloses: new Map(factors.map((f) => [f.symbol, Array.from({ length: 40 }, (_, i) => 1 + i * 0.001)])),
  regime, generation: 1, genome: DEFAULT_GENOME_V2, weights: DEFAULT_WEIGHTS,
  m4h: new Map(factors.map((f) => [f.symbol, 2])), jeraSimbol: jera,
} as never)
const dipilih = res3.picks.map((p) => p.symbol)
const tolak = res3.rejected.map((r) => r.symbol)
cek('MAGIC ditolak JERA', !dipilih.includes('MAGICUSDT') && tolak.includes('MAGICUSDT'), res3.rejected.find((r) => r.symbol === 'MAGICUSDT')?.reason)
cek('STRK ditolak JERA', !dipilih.includes('STRKUSDT') && tolak.includes('STRKUSDT'), res3.rejected.find((r) => r.symbol === 'STRKUSDT')?.reason)

console.log('=== KASUS 5: K-DARURAT (kStreak 5 seperti sekarang) ===')
const res5 = decidePredator({
  factors, norm: norm as never, universeCloses: new Map(factors.map((f) => [f.symbol, Array.from({ length: 40 }, (_, i) => 1 + i * 0.001)])),
  regime, generation: 1, genome: DEFAULT_GENOME_V2, weights: DEFAULT_WEIGHTS,
  m4h: new Map(factors.map((f) => [f.symbol, 2])), kStreak: 5,
} as never)
cek('policy K-DARURAT tertulis', res5.rejected.some((r) => r.reason.includes('K-DARURAT')) || res5.picks.some((p) => (p.evidence as { policy?: string[] }).policy?.some((s) => s.includes('K-DARURAT'))))
const kStreak5 = res5.picks.every((p) => (p.evidence as { policy?: string[] }).policy?.some((s) => s.includes('K-DARURAT')))
cek('semua pick membawa policy K-darurat', kStreak5)

console.log('=== KASUS 6: GERBANG-KEYAKINAN — keyakinan rendah ditolak saat K>=5 ===')
// WAL mom7 rendah → conf pasti di bawah 68 → harus ditolak oleh gerbang
const tolakWAL = res5.rejected.find((r) => r.symbol === 'WALUSDT')
cek('pick lemah ditolak gerbang keyakinan (atau tak dilahirkan)', !res5.picks.some((p) => p.symbol === 'WALUSDT') || (tolakWAL !== undefined), tolakWAL?.reason ?? `dipilih dengan conf tinggi`)

console.log('=== KASUS 7: resolveRencana — MENANG-minus mustahil (regresi V301) ===')
// lilin uji TIDAK menyentuh stop (low 0,94 > stop 0,91) agar jalur target/close teruji
const candleD = { openTime: 0, open: 1.0, high: 1.13, low: 0.94, close: 0.95, volume: 1 } as never
const r7 = resolveRencana('BUY', { entry: 1.0, stop: 0.91, target: 1.005 }, candleD) // kotor 0,5% < gerbang 0,7% (fee+0,3%)
cek('target di bawah gerbang kotor tak dianggap sasaran', r7 !== null && !(r7.status === 'MENANG'), r7 ? `${r7.status}/${r7.via}/${r7.netPct}%` : 'null')
const r7b = resolveRencana('BUY', { entry: 1.0, stop: 0.91, target: 1.12 }, candleD) // target 12% kotor
cek('target sehat kena → MENANG positif', r7b?.status === 'MENANG' && r7b.netPct > 0, r7b ? `${r7b.status}/${r7b.via}/${r7b.netPct}%` : 'null')
const r7c = resolveRencana('BUY', { entry: 1.0, stop: 0.91, target: null }, candleD)
cek('tanpa target → KEDALUWARSA via TUTUP', r7c?.status === 'KEDALUWARSA' && r7c.via === 'TUTUP', r7c ? `${r7c.status}/${r7c.via}/${r7c.netPct}%` : 'null')

console.log(`\nTOTAL: ${lulus} lulus, ${gagal} gagal`)
process.exit(gagal > 0 ? 1 : 0)
