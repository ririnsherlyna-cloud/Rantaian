// ============================================================
// DIFF r43 — bandingkan residu tiap fix vs baseline (v2 prefix).
// Pakai: bun scripts/diff_r43.ts [prefix]
// ============================================================
import { readFileSync } from 'fs'

interface Residu { ns: string; num: number; fam: string; diff: string; kind: string; truth: string; aksi: string; arah: string }
interface Batch { versi: string; total: number; max: number; residu: Residu[] }

const pref = process.argv[2] ?? 'r43v2-'
const base = JSON.parse(readFileSync('research/ujian-fbo/r43-baseline.json', 'utf8')) as Batch
const key = (r: Residu): string => `${r.ns}#${r.num}`
const baseKeys = new Map(base.residu.map((r) => [key(r), r]))

const fixFiles = ['T4VETO', 'L8SKIP', 'T16M12', 'T1DEMA2', 'FDECAY', 'L7DUAL']
for (const fx of fixFiles) {
  try {
    const b = JSON.parse(readFileSync(`research/ujian-fbo/${pref}${fx}.json`, 'utf8')) as Batch
    const fixed = new Set(b.residu.map(key))
    const healed: string[] = []
    const broken: string[] = []
    for (const [k, r] of baseKeys) if (!fixed.has(k)) healed.push(`${k}(${r.kind === 'GUARD' ? 'G' : 'F'})`)
    for (const r of b.residu) if (!baseKeys.has(key(r))) broken.push(`${key(r)} ${r.fam}/${r.kind} ${r.aksi}/${r.arah} truth=${r.truth}`)
    console.log(`\n=== ${pref}${fx}: ${b.total}/${b.max} (vs baseline ${b.total - base.total >= 0 ? '+' : ''}${b.total - base.total}) ===`)
    console.log(`  SEMBUH (${healed.length}): ${healed.join(', ') || '—'}`)
    console.log(`  PECAH  (${broken.length}): ${broken.slice(0, 10).join(' | ') || '—'}${broken.length > 10 ? ` +${broken.length - 10} lagi` : ''}`)
  } catch {
    console.log(`\n=== ${pref}${fx}: file belum ada ===`)
  }
}
