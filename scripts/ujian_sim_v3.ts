// LAB GERBANG v3 — PROTOKOL MULTI-SUITE anti-chasing-noise.
// 5 suite (A..E) = 500 pasar. Varian dinilai dari AGREGAT (σ kecil),
// gerbang resmi tetap: A held-out >= 60%, B >= 55% & kalahkan v1 & Dadu.
import { generateSuite } from '../src/lib/exam/generator'
import { CONTESTANTS, MICAPROFITA, MICAPROFITA_V3 } from '../src/lib/exam/contestants'
import { gradeContestant, trainHead, applyHead, assembleResult } from '../src/lib/exam/evaluator'

const SUITES = ['A', 'B', 'C', 'D', 'E']
const suites = SUITES.map((s) => generateSuite(s))

const v1all = suites.map((t) => gradeContestant(MICAPROFITA, t))
const v3all = suites.map((t) => gradeContestant(MICAPROFITA_V3, t))
const daduAll = suites.map((t) => gradeContestant(CONTESTANTS.find((c) => c.id === 'DADU')!, t))

const agg = (rs: { acc: number }[] | number[]) =>
  rs.reduce<number>((a, r) => a + (typeof r === 'number' ? r : r.acc), 0) / rs.length
console.log('=== NALURI agregat 5 suite (500 pasar) ===')
console.log(`  v1 naluri : ${(agg(v1all) * 100).toFixed(1)}%`)
console.log(`  v3 naluri : ${(agg(v3all) * 100).toFixed(1)}%`)
console.log(`  Dadu      : ${(agg(daduAll) * 100).toFixed(1)}%`)
for (let i = 0; i < 5; i++) {
  console.log(`  suite ${SUITES[i]}: v1 ${(v1all[i].acc * 100).toFixed(0)}%  v3 ${(v3all[i].acc * 100).toFixed(0)}%`)
}

// per-arketipe agregat v3 naluri (n≈35 → σ≈8%)
console.log('\n=== Per arketipe agregat (v3 naluri, n≈35) vs v1 ===')
const archAgg = new Map<string, { n: number; ok3: number; ok1: number; label: string }>()
for (let s = 0; s < 5; s++) {
  for (let i = 0; i < 100; i++) {
    const id = suites[s][i].arch.id
    const a = archAgg.get(id) ?? { n: 0, ok3: 0, ok1: 0, label: suites[s][i].arch.label }
    a.n++
    if (v3all[s].grades[i].correct) a.ok3++
    if (v1all[s].grades[i].correct) a.ok1++
    archAgg.set(id, a)
  }
}
for (const [id, a] of [...archAgg.entries()].sort((x, y) => x[1].ok3 / x[1].n - y[1].ok3 / y[1].n)) {
  console.log(`  ${a.label.padEnd(22)} n=${String(a.n).padStart(2)}  v3=${((a.ok3 / a.n) * 100).toFixed(0).padStart(3)}%  v1=${((a.ok1 / a.n) * 100).toFixed(0).padStart(3)}%  ${a.ok3 / a.n > a.ok1 / a.n ? 'v3 better' : 'v1 better'}`)
}

// kepala belajar — PROTOKOL WALK-FORWARD per suite:
// latih pada ujian 1-50 SETIAP suite, uji BUTA pada 51-100 suite yang sama.
// 5 evaluasi independen = 250 ujian buta → sinyal jujur tentang kepala belajar.
const helds = suites.map((_, i) => {
  const h = trainHead(v3all[i].grades, 50)
  const held = applyHead({ ...v3all[i], grades: v3all[i].grades.slice(50) }, h, 50, 'v3-terlatih')
  const naluri = v3all[i].grades.slice(50).filter((g) => g.correct).length / 50
  const v1h = v1all[i].grades.slice(50).filter((g) => g.correct).length / 50
  return { h, held, naluri, v1h }
})
const heldA = helds[0].held
const head = helds[0].h
const v1heldA = assembleResult(v1all[0].contestant, v1all[0].grades.slice(50))
console.log('\n=== KEPALA TERLATIH (walk-forward per suite: latih 1-50, buta 51-100) ===')
console.log(`  bobot (suite A): ${head.w.map((x) => x.toFixed(2)).join(' ')}  b=${head.b.toFixed(2)}`)
helds.forEach((x, i) => {
  console.log(
    `  suite ${SUITES[i]}: terlatih ${(x.held.acc * 100).toFixed(0)}% (brier ${x.held.brier.toFixed(3)})  vs naluri ${(x.naluri * 100).toFixed(0)}%  vs v1 ${(x.v1h * 100).toFixed(0)}%  ${x.held.acc > x.naluri ? 'head+' : 'head-'}`,
  )
})
const freshAgg = agg(helds.map((x) => x.held))
const nalAgg = agg(helds.map((x) => x.naluri))
console.log(`  AGREGAT 250 ujian buta: terlatih ${(freshAgg * 100).toFixed(1)}%  vs naluri ${(nalAgg * 100).toFixed(1)}%  vs v1 ${(agg(helds.map((x) => x.v1h)) * 100).toFixed(1)}%`)

// gates resmi
const v1B = v1all[1].acc
const daduB = daduAll[1].acc
const heldB = helds[1].held
const g1 = heldA.acc >= 0.6
const g2 = heldA.brier < 0.25
const g3 = heldB.acc >= 0.55 && heldB.acc > v1B && heldB.acc > daduB
console.log('\n=== GERBANG RESMI ===')
console.log(`  [${g1 ? 'PASS' : 'FAIL'}] held-out A >= 60% → ${(heldA.acc * 100).toFixed(1)}%`)
console.log(`  [${g2 ? 'PASS' : 'FAIL'}] held-out A Brier < 0.25 → ${heldA.brier.toFixed(3)}`)
console.log(`  [${g3 ? 'PASS' : 'FAIL'}] held-out B >= 55% & > v1(${(v1B * 100).toFixed(0)}%) & > Dadu(${(daduB * 100).toFixed(0)}%) → ${(heldB.acc * 100).toFixed(1)}%`)
console.log(`  AGREGAT 500-pasar: naluri-v3 ${(agg(v3all) * 100).toFixed(1)}% | terlatih ${(freshAgg * 100).toFixed(1)}% | v1 ${(agg(v1all) * 100).toFixed(1)}%`)
