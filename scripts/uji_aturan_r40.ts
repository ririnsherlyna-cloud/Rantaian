// ============================================================
// UJI ATURAN FINAL T1/T2/T3 pada dataset fallthrough.
//   bun scripts/uji_aturan_r40.ts
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
const M = Math.abs
const T1 = (r: Record<string, string | number | boolean>): boolean =>
  r.s_ada && r.s_vBrk <= 1.9 && r.s_vF >= 0.85 && r.s_cOut >= 9 && r.s_umur <= 30 && (M(r.mom50) >= 4.6 || r.s_pT <= 2) && (r.s_maxB - r.s_cN) <= 1.5
const T2 = (r: Record<string, string | number | boolean>): boolean =>
  r.s_ada && r.s_cOut >= 26 && r.s_vF >= 0.95 && r.s_umur >= 24 && r.s_vBrk <= 2.45 && M(r.mom50) >= 3.2 && (r.s_maxB - r.s_cN) <= 1.2 && r.s_pT <= 3
const T3 = (r: Record<string, string | number | boolean>): boolean =>
  !r.s_ada && r.t_cN >= 3 && r.t_cOut >= 15 && r.t_vF >= 0.9 && r.t_wick <= 0.05 && M(r.mom50) >= 9 && r.t_vBrk <= 1.9

function uji(nama: string, rule: (r: Record<string, string | number | boolean>) => boolean): void {
  let miss = 0
  let fp = 0
  let missL = 0
  let fpL = 0
  let missH = 0
  let fpH = 0
  const fpFam = new Map<string, number>()
  const missFam = new Map<string, number>()
  for (const r of rows) {
    const m = rule(r)
    const latihan = ['fbo100', 'fbo200', 'fbo300'].includes(r.ns as string)
    if (r.perluFollow && !m) { miss++; missFam.set(r.fam as string, (missFam.get(r.fam as string) ?? 0) + 1); if (latihan) missL++; else missH++ }
    if (!r.perluFollow && m) { fp++; fpFam.set(r.fam as string, (fpFam.get(r.fam as string) ?? 0) + 1); if (latihan) fpL++; else fpH++ }
  }
  console.log(`${nama}\n   TOTAL miss=${miss} fp=${fp} | LAT m=${missL}/f=${fpL} | HAKIM m=${missH}/f=${fpH}\n   fp: ${[...fpFam.entries()].map(([k, v]) => `${k}:${v}`).join(' ') || '-'}\n   miss: ${[...missFam.entries()].map(([k, v]) => `${k}:${v}`).join(' ') || '-'}`)
}
uji("T1'", T1)
uji("T2'", T2)
uji("T3'", T3)
uji('T1+T2+T3 final', (r) => T1(r) || T2(r) || T3(r))
console.log('\n-- T3 fp rows --')
for (const r of rows) if (!r.perluFollow && T3(r)) console.log(`${r.fam} ${r.ns}_${r.num} mom50=${r.mom50} t_vBrk=${r.t_vBrk} t_cOut=${r.t_cOut} t_cN=${r.t_cN}`)
