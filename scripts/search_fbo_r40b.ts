// ============================================================
// PENCARIAN KOMBINATORIAL PENUH — aturan follow 2 & 3 fitur
// dengan validasi latihan (fbo100-300) dan hakim (fbo400-600).
//   bun scripts/search_fbo_r40b.ts
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
const latihan = rows.filter((r) => ['fbo100', 'fbo200', 'fbo300'].includes(r.ns as string))
const hakim = rows.filter((r) => ['fbo400', 'fbo500', 'fbo600'].includes(r.ns as string))

type Feat = string
const feats: Feat[] = [
  't_pT', 't_umur', 't_cOut', 't_cN', 't_maxB', 't_vBrk', 't_vF', 't_vL', 't_wick', 't_rej',
  't_eff', 't_p7', 't_dir', 't_late', 't_early', 't_rank', 't_lvlDist',
  's_pT', 's_umur', 's_cOut', 's_cN', 's_vBrk', 's_vF', 's_vL', 's_eff', 's_p7', 's_dir', 's_maxB', 's_rank',
  'mom12', 'mom50', 'dEma21', 'net10', 'net20', 'mB12', 'up12', 'eff20',
]

// fitur turunan: nilai terbaik dari event top vs sejati (maks untuk "kekuatan acceptance")
const deriv = (r: Record<string, string | number | boolean>): Record<string, number> => {
  const d: Record<string, number> = {}
  for (const f of feats) d[f] = r[f] as number
  d['b_cOut'] = Math.max(r.t_cOut as number, r.s_cOut as number)
  d['b_cN'] = Math.max(r.t_cN as number, r.s_cN as number)
  d['b_vF'] = Math.max(r.t_vF as number, r.s_vF as number)
  d['b_vL'] = Math.max(r.t_vL as number, r.s_vL as number)
  d['b_vBrk'] = Math.min(...[r.t_vBrk as number, r.s_vBrk as number].filter((x) => x > 0), 99)
  d['b_pT'] = Math.max(r.t_pT as number, r.s_pT as number)
  d['decay'] = (r.t_vL as number) / Math.max(0.01, r.t_vBrk as number)
  d['sdecay'] = (r.s_vL as number) / Math.max(0.01, r.s_vBrk as number)
  d['lateRatio'] = (r.t_late as number) / Math.max(0.1, r.t_early as number)
  return d
}
const D = rows.map(deriv)
const dFeats = [...feats, 'b_cOut', 'b_cN', 'b_vF', 'b_vL', 'b_vBrk', 'b_pT', 'decay', 'sdecay', 'lateRatio']

interface Cond { f: string; op: '>=' | '<='; th: number }
const evalCond = (rs: typeof rows, ds: Record<string, number>[], c: Cond, idx: number[]): boolean =>
  c.op === '>=' ? ds[idx][c.f] >= c.th : ds[idx][c.f] <= c.th

// kumpulkan threshold kandidat per fitur (kuantil)
const thresholds = new Map<string, number[]>()
for (const f of dFeats) {
  const vals = [...new Set(D.map((d) => d[f]))].filter((v) => v > -50).sort((a, b) => a - b)
  const ths: number[] = []
  for (let i = 1; i <= 20; i++) ths.push(vals[Math.floor((i / 21) * (vals.length - 1))])
  thresholds.set(f, [...new Set(ths.map((t) => +t.toFixed(3)))])
}

function errOn(rs: typeof rows, ds: Record<string, number>[], rule: Cond[]): { miss: number; fp: number } {
  let miss = 0
  let fp = 0
  for (let i = 0; i < rs.length; i++) {
    const m = rule.every((c) => (c.op === '>=' ? ds[i][c.f] >= c.th : ds[i][c.f] <= c.th))
    const perlu = rs[i].perluFollow as boolean
    if (perlu && !m) miss++
    if (!perlu && m) fp++
  }
  return { miss, fp }
}

// ---- tahap 1: 2-fitur AND pada LATIHAN, pilih yang fp kecil ----
const conds: Cond[] = []
for (const f of dFeats) for (const th of thresholds.get(f)!) { conds.push({ f, op: '>=', th }); conds.push({ f, op: '<=', th }) }
console.log(`kondisi: ${conds.length}`)
const cand2: { rule: Cond[]; miss: number; fp: number; tot: number }[] = []
for (let i = 0; i < conds.length; i++) {
  for (let j = i + 1; j < conds.length; j++) {
    if (conds[i].f === conds[j].f) continue
    const e = errOn(latihan, latihan.map(deriv), [conds[i], conds[j]])
    if (e.miss + e.fp <= 14) cand2.push({ rule: [conds[i], conds[j]], miss: e.miss, fp: e.fp, tot: e.miss + e.fp })
  }
}
cand2.sort((a, b) => a.tot - b.tot)
console.log(`\n=== 2-FITUR (latihan, top) ===`)
for (const c of cand2.slice(0, 15)) {
  const eh = errOn(hakim, hakim.map(deriv), c.rule)
  const s = (x: Cond): string => `${x.f}${x.op}${x.th}`
  console.log(`${s(c.rule[0])} & ${s(c.rule[1])} | LAT m=${c.miss} f=${c.fp} | HAKIM m=${eh.miss} f=${eh.fp}`)
}

// ---- tahap 2: 3-fitur dari 40 kandidat 2-fitur terbaik ----
const best2 = cand2.slice(0, 40)
const cand3: { rule: Cond[]; miss: number; fp: number; tot: number; eh: { miss: number; fp: number } }[] = []
for (const b of best2) {
  for (const c of conds) {
    if (b.rule.some((x) => x.f === c.f)) continue
    const rule = [...b.rule, c]
    const e = errOn(latihan, latihan.map(deriv), rule)
    if (e.miss + e.fp <= 8) {
      const eh = errOn(hakim, hakim.map(deriv), rule)
      cand3.push({ rule, miss: e.miss, fp: e.fp, tot: e.miss + e.fp, eh })
    }
  }
}
cand3.sort((a, b) => (a.eh.miss + a.eh.fp) - (b.eh.miss + b.eh.fp))
console.log(`\n=== 3-FITUR (diurut utk HAKIM, top) ===`)
for (const c of cand3.slice(0, 15)) {
  const s = (x: Cond): string => `${x.f}${x.op}${x.th}`
  console.log(`${s(c.rule[0])} & ${s(c.rule[1])} & ${s(c.rule[2])} | LAT m=${c.miss} f=${c.fp} | HAKIM m=${c.eh.miss} f=${c.eh.fp}`)
}
