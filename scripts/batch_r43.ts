// ============================================================
// BATCH R43 — verifikasi 24 seed otak beku v1.36d + kumpul residu.
// Pakai: bun scripts/batch_r43.ts --dari fbo100 --sampai fbo2400
//        bun scripts/batch_r43.ts --dari fbo1900 --sampai fbo2400 --save r43-baseline.json
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE, type FboExam } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface Args { dari: number; sampai: number; save: string }
function parseArgs(): Args {
  const a: Args = { dari: 100, sampai: 2400, save: '' }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dari') a.dari = parseInt(argv[++i].replace('fbo', ''), 10)
    else if (argv[i] === '--sampai') a.sampai = parseInt(argv[++i].replace('fbo', ''), 10)
    else if (argv[i] === '--save') a.save = argv[++i]
  }
  return a
}

interface Residu { ns: string; num: number; fam: string; diff: string; kind: string; truth: string; breakArah: string; aksi: string; arah: string; mode: string; likuidasi: boolean; netPct: number | null; alasan: string[] }

function satu(ns: string): { fboOk: number; guardOk: number; residu: Residu[] } {
  const residu: Residu[] = []
  let fboOk = 0
  for (const e of forgeFboSuite(ns)) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const k = fbVonis(visible, FBO_BRAIN_VERSI)
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, e.candles.slice(FBO_VISIBLE))
    let hasil: boolean
    if (led.mode === 'NO-TRADE') {
      const bait = simBaitFbo(e.breakArah, e.entry, e.candles.slice(FBO_VISIBLE))
      hasil = bait.stopHit || (bait.netPct ?? 0) <= 0
    } else {
      hasil = (led.netPct ?? -1) > 0 && !led.stopHit
    }
    if (hasil) fboOk++
    else residu.push({ ns, num: e.num, fam: e.fam, diff: e.diff, kind: e.kind, truth: e.truth, breakArah: e.breakArah, aksi: k.aksi, arah: k.arah, mode: led.mode, likuidasi: led.stopHit, netPct: led.netPct, alasan: k.alasan.slice(0, 4) })
  }
  let guardOk = 0
  for (const e of forgeFboGuardSuite(ns)) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const k = fbVonis(visible, FBO_BRAIN_VERSI)
    const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, e.candles.slice(FBO_VISIBLE))
    let hasil: boolean
    if (led.mode === 'NO-TRADE') {
      const bait = simBaitFbo(e.breakArah, e.entry, e.candles.slice(FBO_VISIBLE))
      hasil = bait.stopHit || (bait.netPct ?? 0) <= 0
    } else {
      hasil = (led.netPct ?? -1) > 0 && !led.stopHit
    }
    if (hasil) guardOk++
    else residu.push({ ns, num: e.num, fam: e.fam, diff: e.diff, kind: e.kind, truth: e.truth, breakArah: e.breakArah, aksi: k.aksi, arah: k.arah, mode: led.mode, likuidasi: led.stopHit, netPct: led.netPct, alasan: k.alasan.slice(0, 4) })
  }
  return { fboOk, guardOk, residu }
}

import { FBO_BRAIN_VERSI } from '../src/lib/exam/fbo-brain'

const args = parseArgs()
let total = 0, max = 0
const semuaResidu: Residu[] = []
const perSeed: { ns: string; fbo: string; guard: string }[] = []
for (let s = args.dari; s <= args.sampai; s += 100) {
  const ns = `fbo${s}`
  const r = satu(ns)
  const tot = r.fboOk + r.guardOk
  total += tot
  max += 124
  perSeed.push({ ns, fbo: `${r.fboOk}/100`, guard: `${r.guardOk}/24` })
  const tandai = tot === 124 ? ' 100% penuh' : ` <-- RESIDU ${124 - tot}`
  console.log(`${ns}: FBO ${r.fboOk} · GUARD ${r.guardOk} · ${tot}/124${tandai}`)
  semuaResidu.push(...r.residu)
}
console.log(`\nTOTAL v${FBO_BRAIN_VERSI}: ${total}/${max} (${((total / max) * 100).toFixed(2)}%)`)
console.log(`\n--- RESIDU (${semuaResidu.length}) ---`)
for (const r of semuaResidu) {
  console.log(`[${r.ns} #${r.num}] ${r.fam} [${r.diff}] ${r.kind} aksi=${r.aksi}/${r.arah} truth=${r.truth} mode=${r.mode} lik=${r.likuidasi} net=${r.netPct !== null ? r.netPct.toFixed(1) : '—'}`)
  for (const a of r.alasan) console.log(`   · ${a}`)
}
if (args.save) {
  writeFileSync(join(process.cwd(), 'research/ujian-fbo', args.save), JSON.stringify({ versi: FBO_BRAIN_VERSI, total, max, perSeed, residu: semuaResidu }, null, 1))
  console.log(`\nDisimpan: research/ujian-fbo/${args.save}`)
}
