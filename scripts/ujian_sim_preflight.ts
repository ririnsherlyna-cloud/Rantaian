// PREFLIGHT UJIAN SIMULASI — determinisme, keseimbangan label, skill engine.
// Jalankan: bun scripts/ujian_sim_preflight.ts
import { generateSuite, SUITE_ID } from '../src/lib/exam/generator'
import { runSuite } from '../src/lib/exam/evaluator'
import { CONTESTANTS } from '../src/lib/exam/contestants'

let fail = 0
const ok = (cond: boolean, label: string, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
  if (!cond) fail++
}

// 1. determinisme
const s1 = generateSuite(SUITE_ID)
const s2 = generateSuite(SUITE_ID)
const h1 = s1.map((t) => t.outcomeRet.toFixed(10)).join('|')
const h2 = s2.map((t) => t.outcomeRet.toFixed(10)).join('|')
ok(h1 === h2, 'Determinisme: dua generateSuite identik')
ok(s1.length === 100, 'Jumlah ujian = 100', `n=${s1.length}`)
ok(s1.every((t) => t.candles.length === 168), 'Semua pasar 168 candle')
ok(
  s1.every((t) => t.candles.every((c) => Number.isFinite(c.c) && c.c > 0 && c.v > 0)),
  'Semua candle finite & harga positif',
)

// 2. tidak ada NaN di prediksi
const run = runSuite(s1, CONTESTANTS)
const allPred = run.results.flatMap((r) => r.grades)
ok(
  allPred.every((g) => Number.isFinite(g.pred.pUp) && Number.isFinite(g.brier) && g.pred.conf >= 0.5 && g.pred.conf <= 0.95),
  'Semua prediksi finite, conf dalam [0.5, 0.95]',
)

// 3. keseimbangan label
const naikShare = s1.filter((t) => t.label === 'NAIK').length / s1.length
ok(naikShare >= 0.4 && naikShare <= 0.6, 'Keseimbangan label global 40-60%', `NAIK=${(naikShare * 100).toFixed(0)}%`)

// 4. skill vs baseline
for (const r of run.results) {
  console.log(
    `  ${r.contestant.id.padEnd(14)} acc=${(r.acc * 100).toFixed(1)}%  brier=${r.brier.toFixed(3)}  conv=${r.convTotal.toFixed(1)}  up=${(r.upShare * 100).toFixed(0)}%  hardfail=${r.hardFails.length}`,
  )
}
const mica = run.v3 ?? run.mica
const dadu = run.results.find((r) => r.contestant.id === 'DADU')!
ok(mica.acc > dadu.acc, 'CYBORG (v3) > DADU (full)', `${(mica.acc * 100).toFixed(0)}% vs ${(dadu.acc * 100).toFixed(0)}%`)

// 4b. gerbang resmi v3 — akurasi full-suite & Brier
const v1res = run.results.find((r) => r.contestant.id === 'MICAPROFITA')!
ok(mica.acc >= 0.6, 'CYBORG v3 suite A >= 60%', `${(mica.acc * 100).toFixed(1)}% (v1 ${(v1res.acc * 100).toFixed(1)}%)`)
ok(mica.brier < 0.26, 'CYBORG v3 Brier A < 0,26', mica.brier.toFixed(3))

// 4c. eksperimen kepala belajar (walk-forward, jujur — boleh tidak diadopsi)
const ev = run.evolved
console.log(
  `\n  kepala belajar: trainAcc=${(ev.trainAcc * 100).toFixed(0)}%  buta 51-100 terlatih=${(ev.heldout.acc * 100).toFixed(1)}%  vs naluri=${(ev.heldoutV1.acc * 100).toFixed(1)}%  ${ev.heldout.acc > ev.heldoutV1.acc ? '(DIADOPSI)' : '(TIDAK DIADOPSI — pelajaran: 50 sampel terlalu sedikit)'}`,
)

console.log('\nPer rezim v3 (full suite A):')
for (const r of mica.byRegime) {
  console.log(
    `  ${r.label.padEnd(22)} n=${String(r.n).padStart(2)}  acc=${(r.acc * 100).toFixed(0)}%  conf=${(r.avgConf * 100).toFixed(0)}%  ${r.verdict}`,
  )
}

// 5. peta per rezim
console.log('\nPer rezim (MICAPROFITA):')
for (const r of mica.byRegime) {
  console.log(
    `  ${r.label.padEnd(22)} n=${String(r.n).padStart(2)}  acc=${(r.acc * 100).toFixed(0)}%  conf=${(r.avgConf * 100).toFixed(0)}%  ${r.verdict}`,
  )
}

// 6. temuan
console.log('\nTemuan celah:')
for (const f of mica.findings) console.log(`  [${f.severity}] ${f.title}`)

// 7. label balance per arketipe (cek tidak degenerate)
console.log('\nLabel per arketipe:')
const archs = new Map<string, { n: number; naik: number }>()
for (const t of s1) {
  const e = archs.get(t.arch.id) ?? { n: 0, naik: 0 }
  e.n++
  if (t.label === 'NAIK') e.naik++
  archs.set(t.arch.id, e)
}
for (const [id, e] of archs) {
  const share = e.naik / e.n
  console.log(`  ${id.padEnd(18)} n=${e.n}  NAIK=${(share * 100).toFixed(0)}%`)
}

if (fail) {
  console.error(`\n${fail} pemeriksaan GAGAL`)
  process.exit(1)
}
console.log('\nSEMUA PREFLIGHT PASS')
