// PROBE T1/T2/T3/T5 — kumpulkan distribusi momAl + fitur keputusan FOLLOW
// (pelajaranAktif FB-T*) pada SEMUA guard 3 seed, utk kalibrasi cap mom50.
import { forgeFboGuardSuite, forgeFboSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'
import { simFboTrade } from '../src/lib/exam/fbo-forge'

interface Baris { ns: string; num: number; fam: string; diff: string; g: string; mom50: number; aksi: string; arah: string; hasil: string; net: number | null }
const baris: Baris[] = []
for (const ns of ['fbo100', 'fbo200', 'fbo300']) {
  const gs = forgeFboGuardSuite(ns)
  for (const e of gs) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const horizon = e.candles.slice(FBO_VISIBLE)
    const k = fbVonis(visible, '1.27')
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
    const tGate = (k.pelajaranAktif ?? []).find((p) => p.startsWith('FB-T')) ?? '-'
    const mom50 = Math.abs((k as unknown as { fitur?: { mom50Atr?: number } }).fitur?.mom50Atr ?? 0)
    baris.push({ ns, num: e.num, fam: e.family, diff: e.diff, g: tGate, mom50, aksi: k.aksi, arah: k.arah, hasil: led.mode === 'NO-TRADE' ? (led.hasil as string) ?? 'NO-TRADE' : ((led.netPct ?? 0) > 0 ? 'PROFIT' : 'RUGI'), net: led.netPct })
  }
}
console.log('=== GUARD yang diikuti gerbang FB-T* ===')
for (const b of baris.filter((x) => x.g !== '-')) {
  console.log(`${b.ns} #${b.num} ${b.fam} [${b.diff}] gate=${b.g} |mom50|=${b.mom50.toFixed(1)} ${b.aksi}/${b.arah} -> ${b.hasil} ${b.net !== null ? b.net.toFixed(2) + '%' : ''}`)
}
console.log('\n=== distribusi |mom50| guard-FOLLOW ===')
const mom = baris.filter((x) => x.g !== '-').map((x) => x.mom50).sort((a, b) => a - b)
console.log(mom.map((m) => m.toFixed(1)).join(', '))

// Juga FBO winners yang pakai T-gate (agar cap tidak membunuh FBO profit)
console.log('\n=== FBO yang diikuti gerbang FB-T* ===')
const fboT: Baris[] = []
for (const ns of ['fbo100', 'fbo200', 'fbo300']) {
  const suite = forgeFboSuite(ns)
  for (const e of suite) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const horizon = e.candles.slice(FBO_VISIBLE)
    const k = fbVonis(visible, '1.27')
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, horizon)
    const tGate = (k.pelajaranAktif ?? []).find((p) => p.startsWith('FB-T')) ?? '-'
    if (tGate === '-') continue
    const mom50 = Math.abs((k as unknown as { fitur?: { mom50Atr?: number } }).fitur?.mom50Atr ?? 0)
    fboT.push({ ns, num: e.num, fam: e.family, diff: e.diff, g: tGate, mom50, aksi: k.aksi, arah: k.arah, hasil: led.mode === 'NO-TRADE' ? 'NO-TRADE' : ((led.netPct ?? 0) > 0 ? 'PROFIT' : 'RUGI'), net: led.netPct })
  }
}
for (const b of fboT) console.log(`${b.ns} #${b.num} ${b.fam} [${b.diff}] gate=${b.g} |mom50|=${b.mom50.toFixed(1)} ${b.aksi}/${b.arah} -> ${b.hasil} ${b.net !== null ? b.net.toFixed(2) + '%' : ''}`)
