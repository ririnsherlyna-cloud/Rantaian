// ============================================================
// HARNESS MULTI-SUITE UJIAN CANDLE — protokol anti-overfit.
//
//   TUNING  : candle (in-sample) + luar-A + luar-B  → boleh dibedah
//   DEV     : luar-C .. luar-K                      → hakim pengembangan
//   SEALED  : luar-L, luar-M, hakim-1, hakim-2      → SEGEL: hanya dibuka
//             setelah otak dibekukan (tidak boleh jadi bahan tuning)
//
// Pakai: bun scripts/ujian_multi.ts <tuning|dev|sealed|all> [--detail]
// ============================================================

import { mkdirSync, writeFileSync } from 'fs'
import { forgeCandleSuite, CH_VISIBLE } from '../src/lib/exam/candle-exam'
import {
  saktiMataVonis, buildCandleVision, baselineSelaluNaik, baselineMomenNaif,
  baselineBalikArah, SAKTI_MATA_VERSI,
} from '../src/lib/exam/sakti-candle'
import { makeRng } from '../src/lib/exam/rng'

const mode = process.argv[2] ?? 'tuning'
const detail = process.argv.includes('--detail')

const TUNING = ['candle', 'luar-A', 'luar-B']
const DEV = ['luar-C', 'luar-D', 'luar-E', 'luar-F', 'luar-G', 'luar-H', 'luar-I', 'luar-J', 'luar-K']
const SEALED = ['luar-L', 'luar-M', 'hakim-1', 'hakim-2']

const suites =
  mode === 'tuning' ? TUNING :
  mode === 'dev' ? DEV :
  mode === 'sealed' ? SEALED :
  [...TUNING, ...DEV, ...SEALED]

// ------------------------------------------------------------
interface Baris {
  ns: string; num: number; arch: string; label: string; variant: string; diff: string
  truth: 'NAIK' | 'TURUN'; vonis: 'NAIK' | 'TURUN'; conf: number; correct: boolean
  moveAtr: number; noiseFlipped: boolean; likuidasi: boolean
  fakta: string; alasan: string[]
}

function fakta(cs: ReturnType<typeof buildCandleVision> extends infer V ? V : never): string {
  void cs
  return ''
}

function faktaDari(v: ReturnType<typeof buildCandleVision>): string {
  const bits: string[] = []
  bits.push(`mom12 ${v.mom12Atr >= 0 ? '+' : ''}${v.mom12Atr.toFixed(2)}`)
  bits.push(`mom3 ${(v as any).mom3Atr !== undefined ? ((v as any).mom3Atr >= 0 ? '+' : '') + (v as any).mom3Atr.toFixed(2) : '?'}`)
  if ((v as any).netLast5Atr !== undefined) bits.push(`net5 ${((v as any).netLast5Atr >= 0 ? '+' : '') + (v as any).netLast5Atr.toFixed(2)}`)
  if ((v as any).posInWindow60 !== undefined) bits.push(`posWin ${((v as any).posInWindow60 * 100).toFixed(0)}%`)
  bits.push(`posRng ${(v.posInRange * 100).toFixed(0)}%`)
  bits.push(`d21 ${v.distEma21Atr >= 0 ? '+' : ''}${v.distEma21Atr.toFixed(1)}`)
  bits.push(`volZ ${v.volZ.toFixed(1)}`)
  bits.push(`vAsym ${v.volAsym >= 0 ? '+' : ''}${v.volAsym.toFixed(2)}`)
  bits.push(`${v.consecutiveUp}↑/${v.consecutiveDown}↓`)
  if (v.sweptLow) bits.push('sapuL')
  if (v.sweptHigh) bits.push('sapuH')
  if (v.recentBreakUp) bits.push(v.failedRetest ? 'boUp-DICABUT' : v.retestHold ? 'boUp-tahan' : 'boUp')
  if (v.recentBreakDown) bits.push(v.failedRetest ? 'boDn-DICABUT' : v.retestHold ? 'boDn-tahan' : 'boDn')
  bits.push(`HH:${v.hh ? 1 : 0} HL:${v.hl ? 1 : 0} LH:${v.lh ? 1 : 0} LL:${v.ll ? 1 : 0}`)
  if (v.divBull) bits.push('divBull')
  if (v.divBear) bits.push('divBear')
  if (v.hammer) bits.push('hammer')
  if (v.shootingStar) bits.push('star')
  if (v.doji) bits.push('doji')
  if (v.bullEngulf) bits.push('engB')
  if (v.bearEngulf) bits.push('engS')
  if (v.squeeze) bits.push('sqz')
  return bits.join(' · ')
}

const hasil: Record<string, unknown>[] = []
let totalBenar = 0
let totalSoal = 0

for (const ns of suites) {
  const suite = forgeCandleSuite(ns)
  const baris: Baris[] = []
  let bn = 0, bm = 0, bb = 0, bd = 0
  for (const exam of suite) {
    const visible = exam.candles.slice(0, CH_VISIBLE)
    const v = buildCandleVision(visible)
    const vonis = saktiMataVonis(visible)
    const correct = vonis.arah === exam.truth
    baris.push({
      ns, num: exam.num, arch: exam.arch.id, label: exam.arch.label, variant: exam.variant, diff: exam.diff,
      truth: exam.truth, vonis: vonis.arah, conf: vonis.conf, correct,
      moveAtr: exam.moveAtr, noiseFlipped: exam.noiseFlipped,
      likuidasi: !correct && Math.abs(exam.moveAtr) > 1.5,
      fakta: faktaDari(v), alasan: vonis.alasan,
    })
    if (baselineSelaluNaik(visible) === exam.truth) bn++
    if (baselineMomenNaif(visible) === exam.truth) bm++
    if (baselineBalikArah(visible) === exam.truth) bb++
    if (makeRng(`dadu:${exam.seed}`).next() < 0.5 ? exam.truth === 'NAIK' : exam.truth === 'TURUN') bd++
  }
  const benar = baris.filter((b) => b.correct).length
  const likuidasi = baris.filter((b) => b.likuidasi).length
  // ceiling: soal yang mungkin tak-dipelajari = noise membalik niat + gerakan tipis
  const takYakin = baris.filter((b) => b.noiseFlipped && Math.abs(b.moveAtr) < 0.9)
  const salah = baris.filter((b) => !b.correct)
  totalBenar += benar
  totalSoal += baris.length
  const pct = ((benar / baris.length) * 100).toFixed(0)
  console.log(`${ns.padEnd(9)} ${String(benar).padStart(3)}/100 (${pct}%) · likuidasi ${likuidasi} · langit-langit ≤ ${100 - takYakin.length} (noise-flip tipis: ${takYakin.length}) · baseline S/M/B/D ${bn}/${bm}/${bb}/${bd}`)
  if (salah.length && (detail || mode !== 'sealed')) {
    for (const s of salah.slice(0, 40)) {
      console.log(`   ✗ #${s.num} [${s.label}/${s.variant}/${s.diff}] SAKTI=${s.vonis}(conf ${s.conf.toFixed(2)}) truth=${s.truth} move=${s.moveAtr >= 0 ? '+' : ''}${s.moveAtr.toFixed(1)}ATR${s.noiseFlipped ? ' [NOISE-FLIP]' : ''}`)
      console.log(`     ${s.fakta}`)
      console.log(`     ${s.alasan.join(' | ')}`)
    }
  }
  hasil.push({ ns, benar, pct: (benar / baris.length) * 100, likuidasi, ceiling: 100 - takYakin.length, takYakin: takYakin.length, baseline: { selaluNaik: bn, momenNaif: bm, balikArah: bb, dadu: bd }, salah: salah.map((s) => ({ num: s.num, arch: s.arch, variant: s.variant, diff: s.diff, truth: s.truth, vonis: s.vonis, conf: s.conf, moveAtr: s.moveAtr, noiseFlipped: s.noiseFlipped, fakta: s.fakta, alasan: s.alasan })) })
}

console.log('─'.repeat(72))
console.log(`TOTAL ${mode.toUpperCase()}: ${totalBenar}/${totalSoal} (${((totalBenar / Math.max(1, totalSoal)) * 100).toFixed(1)}%) · otak v${SAKTI_MATA_VERSI}`)
mkdirSync('/home/z/my-project/research/ujian-candle', { recursive: true })
writeFileSync(`/home/z/my-project/research/ujian-candle/multi-${mode}-v${SAKTI_MATA_VERSI}.json`, JSON.stringify({ mode, versi: SAKTI_MATA_VERSI, total: totalSoal, benar: totalBenar, suites: hasil }, null, 2))
void fakta
