// UJI UNIT V302 — POWER-MAX-AMBISIUS di mesin arena (warisan.ts)
// Skenario: (A) koin pompa +20%/24 jam → PMA WAJIB tayang di atas ambisius
//           (B) koin datar +2%/24 jam → PMA WAJIB dorman (null)
//           (C) SELL saat dump −18%/24 jam → PMA cermin bawah tayang
import { mesinWarisan, monteCarlo24j, rangkaiRencana, fnvSeed } from './pma_helper'

const buatCandle = (mulai: number, perJam: number[], btcDrift = 0.0005) =>
  perJam.map((r, i) => {
    const close = mulai * Math.exp(perJam.slice(0, i + 1).reduce((a, x) => a + x, 0))
    const open = i === 0 ? mulai : mulai * Math.exp(perJam.slice(0, i).reduce((a, x) => a + x, 0))
    return {
      openTime: Date.UTC(2026, 9, 1) + i * 3600_000,
      open, close,
      high: Math.max(open, close) * 1.004, low: Math.min(open, close) * 0.996,
      volume: 1000 + (i % 24) * 50, quoteVolume: 0,
    }
  })

// BTC pendamping (candles cukup untuk beta)
const btc = buatCandle(80000, Array.from({ length: 200 }, (_, i) => 0.0005 + Math.sin(i / 5) * 0.001))

// (A) POMPA: 200 jam datar tipis lalu 30 jam terakhir roket +0.9%/jam (≈+31% dalam 30 jam; 24-jam ≈ +24%)
const perJamPompa = Array.from({ length: 170 }, () => 0.0004)
  .concat(Array.from({ length: 30 }, (_, i) => 0.008 + (i % 3) * 0.002))
const cPompa = buatCandle(0.25, perJamPompa)
const warA = mesinWarisan(cPompa, btc)
const mcA = monteCarlo24j(cPompa, warA.garch, 12345)
const rA = rangkaiRencana('BUY', cPompa[cPompa.length - 1].close, 4.5, warA, mcA)

console.log('=== A) BUY pompa +%.1f%%/24j ===', (warA.ubah24 * 100).toFixed(1))
console.log('entry=%s target=%s ambisius=%s (%s%%) powerMax=%s (%s%%) pPowerMax=%s',
  rA.entry.toPrecision(6), rA.target?.toPrecision(6), rA.highAmbisius?.toPrecision(6), rA.ambisiusPct,
  rA.powerMaxAmbisius?.toPrecision(6) ?? 'NULL', rA.powerMaxPct, rA.pPowerMax)
if (rA.powerMaxAmbisius == null) throw new Error('GAGAL: pompa ≥12% harus menyalakan PMA')
if (rA.powerMaxAmbisius! <= (rA.highAmbisius ?? 0)) throw new Error('GAGAL: PMA harus DI ATAS ambisius')

// (B) DATAR: 200 jam tipis — ubah24 ≈ +1%
const perJamDatar = Array.from({ length: 200 }, () => 0.0004)
const cDatar = buatCandle(0.25, perJamDatar)
const warB = mesinWarisan(cDatar, btc)
const mcB = monteCarlo24j(cDatar, warB.garch, 67890)
const rB = rangkaiRencana('BUY', cDatar[cDatar.length - 1].close, 2.0, warB, mcB)
console.log('\n=== B) BUY datar +%.1f%%/24j ===', (warB.ubah24 * 100).toFixed(1))
console.log('ambisius=%s powerMax=%s', rB.highAmbisius?.toPrecision(6), rB.powerMaxAmbisius)
console.log('ketPowerMax: %s', rB.ketPowerMax.slice(0, 90) + '…')
if (rB.powerMaxAmbisius != null) throw new Error('GAGAL: koin datar harus PMA dorman (null)')

// (C) SELL saat dump: 30 jam terakhir turun berbising (ubah24 ≈ −15%) — bising realistis
// (residual dua-sisi, bukan deret degenerate) — pola seperti koin nyata yang dibuang
const perJamDump = Array.from({ length: 170 }, (_, i) => 0.0004 + Math.sin(i / 3) * 0.002)
  .concat(Array.from({ length: 30 }, (_, i) => -0.004 - (i % 4) * 0.003 - Math.sin(i * 1.7) * 0.004))
const cDump = buatCandle(0.25, perJamDump)
const warC = mesinWarisan(cDump, btc)
const mcC = monteCarlo24j(cDump, warC.garch, 424242)
const rC = rangkaiRencana('SELL', cDump[cDump.length - 1].close, 3.0, warC, mcC)
console.log('\n=== C) SELL dump %.1f%%/24j (q75Dn=%s q90Dn=%s) ===', (warC.ubah24 * 100).toFixed(1), mcC.q75Dn, mcC.q90Dn)
console.log('entry=%s ambisius=%s powerMax(bawah)=%s (%s%%)',
  rC.entry.toPrecision(6), rC.highAmbisius?.toPrecision(6), rC.powerMaxAmbisius?.toPrecision(6) ?? 'NULL', rC.powerMaxPct)
if (rC.powerMaxAmbisius == null) throw new Error('GAGAL: dump ≤−12% harus menyalakan PMA cermin SELL')
if (rC.powerMaxAmbisius! >= (rC.highAmbisius ?? 0)) throw new Error('GAGAL: PMA SELL harus DI BAWAH ambisius')

console.log('\nSEMUA SKENARIO PASS — PMA perilakunya benar (tayang hanya saat gerbang pompa)')
void fnvSeed
