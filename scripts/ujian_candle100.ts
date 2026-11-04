// ============================================================
// RUNNER UJIAN CANDLE LIKUIDASI — 100 grafik.
// Pakai: bun scripts/ujian_candle100.ts <siklus>
// Menghasilkan: skor, peta per-arketipe/varian/difficulty,
// hitungan likuidasi, kalibrasi, ekstraksi CELAH (lift fitur
// pada kesalahan), narasi kegagalan, dan JSON bukti.
// ============================================================

import { writeFileSync, mkdirSync } from 'fs'
import { forgeCandleSuite, CH_VISIBLE, type CandleExam } from '../src/lib/exam/candle-exam'
import type { Candle } from '../src/lib/exam/generator'
import {
  saktiMataVonis, buildCandleVision, baselineSelaluNaik, baselineMomenNaif, baselineBalikArah,
  SAKTI_MATA_VERSI, type CandleVision,
} from '../src/lib/exam/sakti-candle'
import { makeRng } from '../src/lib/exam/rng'

const siklus = Number(process.argv[2] ?? 0)
// arg ke-2 "luar" = suite segar out-of-sample (seed belum pernah dilihat saat tuning)
const LUAR = process.argv[3] === 'luar'
const NS = LUAR ? `luar-${process.argv[4] ?? 'A'}` : 'candle'

// ------------------------------------------------------------
function dadu(exam: CandleExam): 'NAIK' | 'TURUN' {
  return makeRng(`dadu:${exam.seed}`).next() < 0.5 ? 'NAIK' : 'TURUN'
}

function faktaSaatItu(cs: Candle[]): string {
  const v = buildCandleVision(cs)
  const bits: string[] = []
  bits.push(`wickAtas ${(v.upperWickPct * 100).toFixed(0)}%`)
  bits.push(`wickBawah ${(v.lowerWickPct * 100).toFixed(0)}%`)
  if (v.sweptLow) bits.push('SAPU-LOW(panic tertutup balik)')
  if (v.sweptHigh) bits.push('SAPU-HIGH(tolak balik)')
  if (v.recentBreakUp) bits.push(v.failedRetest ? 'breakout-DICABUT' : v.retestHold ? 'breakout-tahan' : 'breakout-recent')
  if (v.recentBreakDown) bits.push(v.failedRetest ? 'breakdown-DICABUT' : v.retestHold ? 'breakdown-tahan' : 'breakdown-recent')
  if (v.volClimax) bits.push(`vol-klimaks(z ${v.volZ.toFixed(1)})`)
  else bits.push(`volZ ${v.volZ.toFixed(1)}`)
  bits.push(`volAsym ${v.volAsym >= 0 ? '+' : ''}${v.volAsym.toFixed(2)}`)
  bits.push(`jarakEMA21 ${v.distEma21Atr >= 0 ? '+' : ''}${v.distEma21Atr.toFixed(1)} ATR`)
  bits.push(`posisi-range ${(v.posInRange * 100).toFixed(0)}%`)
  if (v.doji) bits.push('doji')
  if (v.hammer) bits.push('hammer')
  if (v.shootingStar) bits.push('bintang-jatuh')
  if (v.bullEngulf) bits.push('engulf-bull')
  if (v.bearEngulf) bits.push('engulf-bear')
  if (v.divBull) bits.push('divBull')
  if (v.divBear) bits.push('divBear')
  bits.push(`${v.consecutiveUp}x naik / ${v.consecutiveDown}x turun`)
  bits.push(`HH:${v.hh ? 1 : 0} HL:${v.hl ? 1 : 0} LH:${v.lh ? 1 : 0} LL:${v.ll ? 1 : 0}`)
  bits.push(`mom12 ${v.mom12Atr >= 0 ? '+' : ''}${v.mom12Atr.toFixed(1)} ATR`)
  return bits.join(' · ')
}

interface FiturDef { key: string; test: (v: CandleVision) => boolean }
const FITUR: FiturDef[] = [
  { key: 'sapuLow', test: (v) => v.sweptLow },
  { key: 'sapuHigh', test: (v) => v.sweptHigh },
  { key: 'breakoutUp', test: (v) => v.recentBreakUp },
  { key: 'breakoutDn', test: (v) => v.recentBreakDown },
  { key: 'retestGagal', test: (v) => v.failedRetest },
  { key: 'retestTahan', test: (v) => v.retestHold },
  { key: 'volKlimaks', test: (v) => v.volClimax },
  { key: 'wickBawah>=40%', test: (v) => v.lowerWickPct >= 0.4 },
  { key: 'wickAtas>=40%', test: (v) => v.upperWickPct >= 0.4 },
  { key: 'doji', test: (v) => v.doji },
  { key: 'hammer', test: (v) => v.hammer },
  { key: 'bintangJatuh', test: (v) => v.shootingStar },
  { key: 'engulfBull', test: (v) => v.bullEngulf },
  { key: 'engulfBear', test: (v) => v.bearEngulf },
  { key: 'divBull', test: (v) => v.divBull },
  { key: 'divBear', test: (v) => v.divBear },
  { key: 'jarakEMA21>+2.5', test: (v) => v.distEma21Atr > 2.5 },
  { key: 'jarakEMA21<-2.5', test: (v) => v.distEma21Atr < -2.5 },
  { key: 'posisiRange>75%', test: (v) => v.posInRange > 0.75 },
  { key: 'posisiRange<25%', test: (v) => v.posInRange < 0.25 },
  { key: 'volAsym<-0.15', test: (v) => v.volAsym < -0.15 },
  { key: 'volAsym>0.15', test: (v) => v.volAsym > 0.15 },
  { key: 'streakNaik>=4', test: (v) => v.consecutiveUp >= 4 },
  { key: 'streakTurun>=4', test: (v) => v.consecutiveDown >= 4 },
  { key: 'squeeze', test: (v) => v.squeeze },
  { key: 'LH+LL', test: (v) => v.lh && v.ll },
  { key: 'HH+HL', test: (v) => v.hh && v.hl },
]

// ------------------------------------------------------------
const suite = forgeCandleSuite(NS)

interface Row {
  num: number
  arch: string
  label: string
  variant: string
  diff: string
  truth: 'NAIK' | 'TURUN'
  vonis: 'NAIK' | 'TURUN'
  conf: number
  correct: boolean
  moveAtr: number
  liquidated: boolean
  alasan: string[]
  fakta: string
}

const rows: Row[] = []
for (const exam of suite) {
  const visible = exam.candles.slice(0, CH_VISIBLE)
  const vonis = saktiMataVonis(visible)
  const correct = vonis.arah === exam.truth
  const liquidated =
    !correct && Math.abs(exam.moveAtr) > 1.5 // salah arah + gerakan besar = posisi kebalik dicairkan
  rows.push({
    num: exam.num,
    arch: exam.arch.id,
    label: exam.arch.label,
    variant: exam.variant,
    diff: exam.diff,
    truth: exam.truth,
    vonis: vonis.arah,
    conf: vonis.conf,
    correct,
    moveAtr: exam.moveAtr,
    liquidated,
    alasan: vonis.alasan,
    fakta: faktaSaatItu(visible),
  })
}

// skor agregat
const benar = rows.filter((r) => r.correct).length
const total = rows.length
const likuidasi = rows.filter((r) => r.liquidated).length
const confBenar = rows.filter((r) => r.correct).reduce((s, r) => s + r.conf, 0) / Math.max(1, rows.filter((r) => r.correct).length)
const confSalah = rows.filter((r) => !r.correct).reduce((s, r) => s + r.conf, 0) / Math.max(1, rows.filter((r) => !r.correct).length)

function skorBy<T>(key: (r: Row) => T): { k: T; n: number; benar: number; pct: number }[] {
  const map = new Map<T, { n: number; benar: number }>()
  for (const r of rows) {
    const k = key(r)
    const e = map.get(k) ?? { n: 0, benar: 0 }
    e.n++
    if (r.correct) e.benar++
    map.set(k, e)
  }
  return [...map.entries()]
    .map(([k, e]) => ({ k, n: e.n, benar: e.benar, pct: (e.benar / e.n) * 100 }))
    .sort((a, b) => a.pct - b.pct)
}

const perArch = skorBy((r) => `${r.label} [${r.variant}]`)
const perDiff = skorBy((r) => r.diff)
const perArah = skorBy((r) => r.truth)

// baseline pembanding
let bn = 0
let bm = 0
let bb = 0
let bd = 0
for (const exam of suite) {
  const visible = exam.candles.slice(0, CH_VISIBLE)
  if (baselineSelaluNaik(visible) === exam.truth) bn++
  if (baselineMomenNaif(visible) === exam.truth) bm++
  if (baselineBalikArah(visible) === exam.truth) bb++
  if (dadu(exam) === exam.truth) bd++
}

// ------------------------------------------------------------
// EKSTRAKSI CELAH: lift fitur pada KESALAHAN
// ------------------------------------------------------------
const salah = rows.filter((r) => !r.correct)
const celah = FITUR.map((f) => {
  const visionCache = new Map<number, CandleVision>()
  const vis = (num: number) => {
    if (!visionCache.has(num)) {
      const exam = suite[num - 1]
      visionCache.set(num, buildCandleVision(exam.candles.slice(0, CH_VISIBLE)))
    }
    return visionCache.get(num)!
  }
  const nSalah = salah.filter((r) => f.test(vis(r.num))).length
  const nSemua = rows.filter((r) => f.test(vis(r.num))).length
  const pSalah = nSalah / Math.max(1, salah.length)
  const pSemua = nSemua / total
  return { fitur: f.key, nSalah, nSemua, pSalah, pSemua, lift: pSalah / Math.max(0.02, pSemua) }
})
  .filter((c) => c.nSalah >= 3)
  .sort((a, b) => b.lift - a.lift)

// ------------------------------------------------------------
// LAPORAN
// ------------------------------------------------------------
const L: string[] = []
L.push(`# UJIAN CANDLE LIKUIDASI — SIKLUS ${siklus}${LUAR ? ` [SUITE LUAR ${NS.toUpperCase()} — OUT-OF-SAMPLE]` : ''} (SAKTI-MATA v${SAKTI_MATA_VERSI})`)
L.push('')
L.push(`**Total: ${benar}/${total} (${((benar / total) * 100).toFixed(1)}%)** · likuidasi: ${likuidasi} · kalibrasi: conf-benar ${confBenar.toFixed(2)} vs conf-salah ${confSalah.toFixed(2)}`)
L.push('')
L.push(`| Penembak | Benar | Skor |`)
L.push(`|---|---|---|`)
L.push(`| **SAKTI-MATA v${SAKTI_MATA_VERSI}** | ${benar}/${total} | **${((benar / total) * 100).toFixed(1)}%** |`)
L.push(`| SELALU-NAIK | ${bn}/${total} | ${((bn / total) * 100).toFixed(1)}% |`)
L.push(`| MOMEN-NAIF | ${bm}/${total} | ${((bm / total) * 100).toFixed(1)}% |`)
L.push(`| BALIK-ARAH | ${bb}/${total} | ${((bb / total) * 100).toFixed(1)}% |`)
L.push(`| DADU | ${bd}/${total} | ${((bd / total) * 100).toFixed(1)}% |`)
L.push('')
L.push(`## Peta per arketipe (terlemah dulu)`)
L.push('')
L.push(`| Arketipe [varian] | Benar | Skor |`)
L.push(`|---|---|---|`)
for (const a of perArch) L.push(`| ${a.k} | ${a.benar}/${a.n} | ${a.pct.toFixed(0)}% |`)
L.push('')
L.push(`## Per difficulty`)
L.push('')
for (const d of perDiff) L.push(`- ${d.k}: ${d.benar}/${d.n} (${d.pct.toFixed(0)}%)`)
L.push('')
L.push(`## Per jawaban benar`)
for (const a of perArah) L.push(`- truth ${a.k}: ${a.benar}/${a.n} (${a.pct.toFixed(0)}%)`)
L.push('')
L.push(`## CELAH TERDETEKSI (lift fitur pada kesalahan, n>=3)`)
L.push('')
for (const c of celah.slice(0, 10)) {
  L.push(`- **${c.fitur}** — muncul ${(c.pSalah * 100).toFixed(0)}% di kesalahan vs ${(c.pSemua * 100).toFixed(0)}% populasi (lift ${c.lift.toFixed(1)}x, ${c.nSalah} kesalahan)`)
}
L.push('')
L.push(`## NARASI KEGAGALAN (14 teratas)`)
L.push('')
for (const r of salah.slice(0, 14)) {
  L.push(`- **#${r.num}** [${r.label} / ${r.variant} / ${r.diff}] SAKTI=${r.vonis} (conf ${r.conf.toFixed(2)}) — fakta saat itu: ${r.fakta} → jawaban: **${r.truth}** (${r.moveAtr >= 0 ? '+' : ''}${r.moveAtr.toFixed(1)} ATR)`)
  L.push(`  - alasan mesin: ${r.alasan.join(' | ')}`)
}
L.push('')

const report = L.join('\n')
console.log(report)

mkdirSync('/home/z/my-project/research/ujian-candle', { recursive: true })
writeFileSync(
  `/home/z/my-project/research/ujian-candle/siklus-${siklus}${LUAR ? `-luar-${NS.split('-')[1]}` : ''}.json`,
  JSON.stringify({ siklus, versi: SAKTI_MATA_VERSI, luar: LUAR, namespace: NS, total, benar, pct: (benar / total) * 100, likuidasi, confBenar, confSalah, baseline: { selaluNaik: bn, momenNaif: bm, balikArah: bb, dadu: bd }, perArch, perDiff, celah, rows }, null, 2),
)
writeFileSync(`/home/z/my-project/research/ujian-candle/siklus-${siklus}${LUAR ? `-luar-${NS.split('-')[1]}` : ''}.md`, report)
console.log(`JSON: research/ujian-candle/siklus-${siklus}${LUAR ? `-luar-${NS.split('-')[1]}` : ''}.json`)
