// ============================================================
// PROBE r45b-G1SCAN — semua tembakan FB-L7/FB-L1p di 30 seed:
// status lulus-saat-ini vs kelayakan follow + fitur pembeda.
// Pakai: bun scripts/probe_r45b_g1scan.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

const f = (x: number | undefined, d = 2) => (x === undefined ? '—' : x.toFixed(d))

interface Baris { ns: string; num: number; kind: string; fam: string; diff: string; lulusLama: boolean; followMenang: boolean; truth: string; breakArah: string; cOut: number; cN: number; rejec: number; vF: number; vL: number; dir: number; umur: number; pel: string }

const rows: Baris[] = []
const DARI = parseInt(process.argv[2] || '100', 10), SAMPAI = parseInt(process.argv[3] || '3600', 10)
for (let s = DARI; s <= SAMPAI; s += 100) {
  const ns = `fbo${s}`
  for (const kind of ['FBO', 'GUARD'] as const) {
    const suite = kind === 'FBO' ? forgeFboSuite(ns) : forgeFboGuardSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const hor = e.candles.slice(FBO_VISIBLE)
      const k = fbVonis(cs, '1.38')
      const pel = k.pelajaranAktif
      if (!pel.includes('FB-L7') && !pel.includes('FB-L1p')) continue
      // status saat ini persis seperti batch
      const led0 = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, hor)
      let lulus: boolean
      if (led0.mode === 'NO-TRADE') {
        const bait = simBaitFbo(e.breakArah, e.entry, hor)
        lulus = bait.stopHit || (bait.netPct ?? 0) <= 0
      } else {
        lulus = (led0.netPct ?? -1) > 0 && !led0.stopHit
      }
      // hipotesis G1: follow breakArah stop 1.6 target 2.2
      const led1 = simFboTrade({ aksi: 'ENTRY', arah: e.breakArah, targetPct: 2.2, stopPct: 1.6, triggerLevel: null } as any, e.entry, hor)
      const followMenang = led1.mode !== 'NO-TRADE' && (led1.netPct ?? -1) > 0 && !led1.stopHit
      const b = k.brk
      const umur = b ? cs.length - 1 - b.firstPierceIdx : -1
      rows.push({ ns, num: e.num, kind, fam: e.fam, diff: e.diff, lulusLama: lulus, followMenang, truth: e.truth, breakArah: e.breakArah, cOut: b?.closesBeyond ?? -1, cN: b?.closeNowAtr ?? 9, rejec: b?.rejecBodyAtr ?? 9, vF: b?.volFollow ?? 0, vL: b?.volLate ?? 0, dir: b?.dirCons ?? 0, umur, pel: pel.join('+') })
    }
  }
}

console.log(`Total tembakan L7/L1p: ${rows.length}`)
const pecah = rows.filter(r => !r.lulusLama)
console.log(`  lulus-lama: ${rows.length - pecah.length} | residu: ${pecah.length}`)
const healed = pecah.filter(r => r.followMenang)
const takTerobat = pecah.filter(r => !r.followMenang)
const dicuri = rows.filter(r => r.lulusLama && !r.followMenang)
console.log(`  G1-stop1.6: healed ${healed.length} | residu-sisa ${takTerobat.length} | DICURI(lulus->gagal) ${dicuri.length}`)
console.log('\n--- SEMUA baris (P=pass, R=residu | F=follow-menang, X=follow-kalah) ---')
for (const r of rows) {
  const st = (r.lulusLama ? 'P' : 'R') + (r.followMenang ? 'F' : 'X')
  console.log(`${st} [${r.ns} #${r.num}] ${r.kind} ${r.fam} ${r.diff} truth=${r.truth} cOut=${r.cOut} cN=${f(r.cN)} rejec=${f(r.rejec)} vF=${f(r.vF)} vL=${f(r.vL)} dir=${f(r.dir)} umur=${r.umur} ${r.pel}`)
}
