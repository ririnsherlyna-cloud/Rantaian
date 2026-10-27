// ============================================================
// PROBE R45 — bedah 2 residu flat-total (fbo2600 #112/#116,
// g-retest-hold GILA): anatomi candle, level truth, fitur otak,
// hasil bait, dan perjalanan horizon.
// Pakai: bun scripts/probe_r45_flat.ts
// ============================================================
import { forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simBaitFbo, simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis, FBO_BRAIN_VERSI } from '../src/lib/exam/fbo-brain'
import type { Candle } from '../src/lib/cyborg/market'

const f = (x: number | undefined, d = 2): string => (x === undefined ? '—' : x.toFixed(d))
const KASUS = [
  { ns: 'fbo2600', num: 112 },
  { ns: 'fbo2600', num: 116 },
]

function anatomi(cs: Candle[], mulai: number): string {
  // bar-histogram: H-L range relative + posisi close dlm range (O..C)
  // candle ujian pakai field pendek: t,o,h,l,c,v
  return cs.map((c: any, i: number) => {
    const rng = c.h - c.l || 1e-9
    const posC = (c.c - c.l) / rng // 0=close di low, 1=close di high
    const arahC = c.c >= c.o ? 'n' : 't'
    return `${mulai + i}:${c.c.toFixed(1)}${arahC}${posC.toFixed(1)}`
  }).join(' ')
}

for (const { ns, num } of KASUS) {
  const suite = forgeFboGuardSuite(ns)
  const e = suite.find((x) => x.num === num)!
  const cs = e.candles.slice(0, FBO_VISIBLE)
  const hor = e.candles.slice(FBO_VISIBLE)
  const k = fbVonis(cs, FBO_BRAIN_VERSI)
  const bait = simBaitFbo(e.breakArah, e.entry, hor)

  console.log(`\n================ [${ns} #${num}] ${e.fam} G ${e.label} ================`)
  console.log(`truth=${e.truth} breakArah=${e.breakArah} movePct=${f(e.movePct)} mfePct=${f(e.mfePct)} entry=${e.entry.toFixed(1)} exit=${e.exit.toFixed(1)}`)
  console.log(`LEVEL TRUTH: jenis=${e.level.jenis} side=${e.level.side} level=${e.level.level.toFixed(1)} sentuhan=${(e.level as any).sentuhan ?? '—'} dariZona=${(e.level as any).dariZona ?? '—'}`)
  console.log(`BRAIN v${k.versi}: aksi=${k.aksi} arah=${k.arah} pelajaran=${k.pelajaranAktif.join('+')}`)
  console.log(`  level-terdeteksi: jenis=${k.level.jenis} side=${k.level.side} lvl=${k.level.level?.toFixed(1)} sentuhan=${k.level.sentuhan} dariZona=${k.level.dariZona}`)
  console.log(`  brk=${k.brk ? 'ADA' : 'NULL'} falseSinyal=[${k.falseSinyal.join(';')}] konfirmasi=${k.konfirmasi}`)
  if (k.brk) {
    const b = k.brk
    console.log(`  EV ${b.side} cOut=${b.closesBeyond} cN=${f(b.closeNowAtr)} maxB=${f(b.maxBeyondAtr)} vBrk=${f(b.volRatioBreak)} vF=${f(b.volFollow)} retest=${b.retest ? 1 : 0}`)
  }
  console.log(`  FITUR: ${Object.entries(k.fitur as any).filter(([, v]) => typeof v === 'number').map(([kk, v]) => `${kk}=${f(v as number, 2)}`).join(' ')}`)
  console.log(`  ALASAN: ${k.alasan.join(' | ')}`)
  console.log(`BAIT (fade, apa yg terjadi bila otak SKIP): mode=${bait.mode} net=${f(bait.netPct, 2)}% stopHit=${bait.stopHit} -> guard GAGAL krn bait untung`)
  // sim aksi alternatif: ENTRY ikut truth (TURUN)
  const ikut = simFboTrade({ aksi: 'ENTRY', arah: e.truth, targetPct: 2.2, stopPct: 2.2, triggerLevel: null } as any, e.entry, hor)
  console.log(`HIPOTESIS ENTRY-ikut-truth: mode=${ikut.mode} net=${f(ikut.netPct, 2)}% stopHit=${ikut.stopHit}`)
  console.log(`ANATOMI visible (58..59): ${anatomi(cs.slice(58), 58)}`)
  console.log(`HORIZON (60..${59 + hor.length}): ${anatomi(hor, 60)}`)
  const minHor = Math.min(...hor.map((c: any) => c.l))
  const maxHor = Math.max(...hor.map((c: any) => c.h))
  console.log(`HORIZON range: low=${minHor.toFixed(1)} high=${maxHor.toFixed(1)} | level truth=${e.level.level.toFixed(1)} | turun-dari-entry=${(((minHor - e.entry) / e.entry) * 100).toFixed(2)}%`)
}
