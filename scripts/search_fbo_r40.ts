// ============================================================
// GREEDY SEARCH pemisah follow-vs-fade pada dataset fallthrough.
//   bun scripts/search_fbo_r40.ts
// ============================================================
import { readFileSync } from 'fs'

const raw = readFileSync('research/ujian-fbo/fall-r40.csv', 'utf8').trim().split('\n')
const head = raw[0].split(',')
const rows = raw.slice(1).map((l) => {
  const v = l.split(',')
  const o: Record<string, string | number | boolean> = {}
  head.forEach((h, i) => {
    const s = v[i]
    o[h] = s === 'true' ? true : s === 'false' ? false : isNaN(+s) ? s : +s
  })
  return o
})
console.log(`rows=${rows.length} follow=${rows.filter((r) => r.perluFollow).length}`)

const numFeats = [
  't_pT', 't_umur', 't_cOut', 't_cN', 't_maxB', 't_vBrk', 't_vF', 't_vL', 't_wick', 't_rej',
  't_eff', 't_p7', 't_dir', 't_late', 't_early', 't_rank', 't_lvlDist',
  's_ada', 's_pT', 's_umur', 's_cOut', 's_cN', 's_vBrk', 's_vF', 's_vL', 's_eff', 's_p7', 's_dir', 's_maxB', 's_rank',
  'mom12', 'mom50', 'dEma21', 'net10', 'net20', 'mB12', 'up12', 'eff20',
]

function err(rule: (r: Record<string, string | number | boolean>) => boolean): { miss: number; falsePos: number } {
  let miss = 0
  let falsePos = 0
  for (const r of rows) {
    const m = rule(r)
    if (r.perluFollow && !m) miss++
    if (!r.perluFollow && m) falsePos++
  }
  return { miss, falsePos }
}

// ---- pencarian 1-fitur ----
console.log('\n=== 1-FITUR (threshold terbaik per fitur) ===')
const best1: { f: string; op: string; th: number; miss: number; fp: number }[] = []
for (const f of numFeats) {
  for (const op of ['>=', '<='] as const) {
    const vals = [...new Set(rows.map((r) => r[f] as number))].sort((a, b) => a - b)
    for (const th of vals) {
      const e = err((r) => (op === '>=' ? (r[f] as number) >= th : (r[f] as number) <= th))
      best1.push({ f, op, th: th as number, miss: e.miss, fp: e.falsePos })
    }
  }
}
best1.sort((a, b) => a.miss + a.fp - (b.miss + b.fp))
for (const b of best1.slice(0, 12)) console.log(`${b.f} ${b.op} ${b.th} -> miss=${b.miss} fp=${b.fp} total=${b.miss + b.fp}`)

// ---- pencarian 2-fitur AND di sekitar kandidat 1-fitur terbaik ----
console.log('\n=== 2-FITUR AND (dari 12 kandidat terbaik) ===')
const top12 = best1.slice(0, 12)
const best2: { c: string; miss: number; fp: number }[] = []
for (let i = 0; i < top12.length; i++) {
  for (let j = i; j < top12.length; j++) {
    const A = top12[i]
    const B = top12[j]
    const e = err((r) =>
      (A.op === '>=' ? (r[A.f] as number) >= A.th : (r[A.f] as number) <= A.th) &&
      (B.op === '>=' ? (r[B.f] as number) >= B.th : (r[B.f] as number) <= B.th),
    )
    best2.push({ c: `${A.f}${A.op}${A.th} & ${B.f}${B.op}${B.th}`, miss: e.miss, fp: e.falsePos })
  }
}
best2.sort((a, b) => a.miss + a.fp - (b.miss + b.fp))
for (const b of best2.slice(0, 10)) console.log(`${b.c} -> miss=${b.miss} fp=${b.fp}`)

// ---- 3-fitur dari 6 kandidat 2-fitur terbaik ----
console.log('\n=== 3-FITUR AND ===')
const cond2 = best2.slice(0, 6).map((b) => {
  const [p1, p2] = b.c.split(' & ')
  const mk = (p: string) => {
    const m = p.match(/(\w+)(>=|<=)(-?[\d.]+)/)!
    return { f: m[1], op: m[2], th: +m[3] }
  }
  return [mk(p1), mk(p2)]
})
const best3: { c: string; miss: number; fp: number }[] = []
for (const [A, B] of cond2) {
  for (const C of top12) {
    const e = err((r) =>
      (A.op === '>=' ? (r[A.f] as number) >= A.th : (r[A.f] as number) <= A.th) &&
      (B.op === '>=' ? (r[B.f] as number) >= B.th : (r[B.f] as number) <= B.th) &&
      (C.op === '>=' ? (r[C.f] as number) >= C.th : (r[C.f] as number) <= C.th),
    )
    best3.push({ c: `${A.f}${A.op}${A.th} & ${B.f}${B.op}${B.th} & ${C.f}${C.op}${C.th}`, miss: e.miss, fp: e.falsePos })
  }
}
best3.sort((a, b) => a.miss + a.fp - (b.miss + b.fp))
for (const b of best3.slice(0, 10)) console.log(`${b.c} -> miss=${b.miss} fp=${b.fp}`)
