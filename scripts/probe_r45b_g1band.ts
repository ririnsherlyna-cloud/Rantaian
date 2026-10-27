// ============================================================
// ANALISIS PEMISAH G1 — cari band fitur: mencakup target R,
// mencakup 0 kasus P (dari file scan a+b).
// Pakai: bun scripts/probe_r45b_g1band.ts
// ============================================================
import { readFileSync } from 'fs'

type Row = { st: string; ns: string; num: number; kind: string; fam: string; diff: string; truth: string; cOut: number; cN: number; rejec: number; vF: number; vL: number; dir: number; umur: number }

function parse(file: string): Row[] {
  const out: Row[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^(P|R)[FX] \[(fbo\d+) #(\d+)\] (FBO|GUARD) ([\w-]+) (\w+) truth=(\w+) cOut=(-?\d+) cN=([\d.]+) rejec=([\d.]+) vF=([\d.]+) vL=([\d.]+) dir=([\d.]+) umur=(-?\d+)/)
    if (m) out.push({ st: m[1], ns: m[2], num: +m[3], kind: m[4] as any, fam: m[5], diff: m[6], truth: m[7], cOut: +m[8], cN: +m[9], rejec: +m[10], vF: +m[11], vL: +m[12], dir: +m[13], umur: +m[14] })
  }
  return out
}

const rows = [...parse('research/ujian-fbo/probe-r45b-g1scan-a.txt'), ...parse('research/ujian-fbo/probe-r45b-g1scan-b.txt')]
const target = rows.filter(r => r.st === 'R')
const aman = rows.filter(r => r.st === 'P')
console.log(`rows: ${rows.length} | target(RX): ${target.length} | aman(PX): ${aman.length}`)
for (const r of target) console.log(`  T [${r.ns} #${r.num}] ${r.kind} ${r.fam} cOut=${r.cOut} cN=${r.cN} rejec=${r.rejec} vF=${r.vF} vL=${r.vL} dir=${r.dir} umur=${r.umur}`)

// grid search band: umur<=U && cOut<=C && rejec<=Rj && cN>=N && dir>=D && vF>=F
// dicari: maksimalkan target-tercakup dgn nol aman-tercakup
let terbaik: { n: number; U: number; C: number; Rj: number; N: number; D: number; F: number; cakup: string[] } | null = null
for (const U of [4, 6, 8, 10, 12, 15]) {
  for (const C of [4, 6, 8, 12, 20, 40]) {
    for (const Rj of [0.15, 0.3, 0.5, 0.75, 1.0]) {
      for (const N of [0, 0.5, 1.0, 1.5, 2.0]) {
        for (const D of [0.3, 0.45, 0.6, 0.7]) {
          for (const F of [0.8, 0.9, 1.0]) {
            const cakup = target.filter(t => t.umur <= U && t.cOut <= C && t.rejec <= Rj && t.cN >= N && t.dir >= D && t.vF >= F)
            if (cakup.length < 3) continue
            const tabrak = aman.filter(a => a.umur <= U && a.cOut <= C && a.rejec <= Rj && a.cN >= N && a.dir >= D && a.vF >= F)
            if (tabrak.length === 0) {
              if (!terbaik || cakup.length > terbaik.n) terbaik = { n: cakup.length, U, C, Rj, N, D, F, cakup: cakup.map(c => `${c.ns}#${c.num}`) }
            }
          }
        }
      }
    }
  }
}
console.log('\n=== BAND TERBAIK (0 tabrakan) ===')
if (terbaik) {
  console.log(`umur<=${terbaik.U} && cOut<=${terbaik.C} && rejec<=${terbaik.Rj} && cN>=${terbaik.N} && dir>=${terbaik.D} && vF>=${terbaik.F}`)
  console.log(`target tercakup: ${terbaik.n} -> ${terbaik.cakup.join(', ')}`)
} else console.log('TIDAK ADA band dgn >=3 target & 0 tabrakan')

// apakah #105/#114/#123 mungkin? uji tiap target: berapa aman dlm ball fitur-nya
console.log('\n=== KELAYAKAN PER-TARGET (ball sekitar fitur target) ===')
for (const t of target) {
  const tol = { cOut: 3, cN: 0.6, rejec: 0.15, vF: 0.15, vL: 0.2, dir: 0.12, umur: 4 }
  const tabrak = aman.filter(a =>
    Math.abs(a.umur - t.umur) <= tol.umur && Math.abs(a.cOut - t.cOut) <= tol.cOut &&
    Math.abs(a.cN - t.cN) <= tol.cN && Math.abs(a.rejec - t.rejec) <= tol.rejec &&
    Math.abs(a.vF - t.vF) <= tol.vF && Math.abs(a.vL - t.vL) <= tol.vL && Math.abs(a.dir - t.dir) <= tol.dir)
  console.log(`[${t.ns} #${t.num}] ${t.fam} umur=${t.umur}: ${tabrak.length} aman dlm ball fitur ${tabrak.length === 0 ? '-> MUNGKIN' : '-> tak terpisahkan'}`)
}
