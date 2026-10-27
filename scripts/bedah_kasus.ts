// ============================================================
// BEDAH KASUS — dump candle mentah + metrik utk (ns, num) tertentu.
// PAKAI: bun scripts/bedah_kasus.ts <ns> <num> [<ns> <num> ...]
// Catatan: horizon (candle 61-72) dicetak HANYA untuk analisis
// fisika generator oleh developer — otak TIDAK pernah melihatnya.
// ============================================================

import { forgeCandleExam, CH_VISIBLE } from '../src/lib/exam/candle-exam'
import { buildCandleVision } from '../src/lib/exam/sakti-candle'

const args = process.argv.slice(2)
for (let i = 0; i + 1 < args.length; i += 2) {
  const ns = args[i]
  const num = Number(args[i + 1])
  const exam = forgeCandleExam(num, ns)
  const vis = exam.candles.slice(0, CH_VISIBLE)
  const v = buildCandleVision(vis)
  console.log(`\n=== ${ns} #${num} [${exam.arch.label} / ${exam.variant} / ${exam.diff}] truth=${exam.truth} move=${exam.moveAtr.toFixed(2)} ATR intent=${exam.intent} noiseFlipped=${exam.noiseFlipped}`)
  console.log(`METRIK: mom12 ${v.mom12Atr.toFixed(2)} mom3 ${v.mom3Atr.toFixed(2)} net5 ${v.netLast5Atr.toFixed(2)} posWin ${(v.posInWindow60 * 100).toFixed(0)}% posRng ${(v.posInRange * 100).toFixed(0)}% d21 ${v.distEma21Atr.toFixed(2)} slope ${v.ema21SlopeAtr.toFixed(3)} volZ ${v.volZ.toFixed(2)} vAsym ${v.volAsym.toFixed(2)} ${v.consecutiveUp}↑/${v.consecutiveDown}↓ boUp:${v.recentBreakUp}${v.failedRetest ? '-DICABUT' : v.retestHold ? '-tahan' : ''} boDn:${v.recentBreakDown}${v.failedRetest ? '-DICABUT' : v.retestHold ? '-tahan' : ''} sapuL:${v.sweptLow} sapuH:${v.sweptHigh} HH:${v.hh} HL:${v.hl} LH:${v.lh} LL:${v.ll} sqz:${v.squeeze}`)
  console.log(`LEVEL: breakLevel ${v.breakLevel.toFixed(2)} breakLevelDn ${(v as any).breakLevelDn?.toFixed(2) ?? '-'} price ${v.price.toFixed(2)} ATR ${v.atr.toFixed(3)} range20 [${v.rangeLow.toFixed(2)}, ${v.rangeHigh.toFixed(2)}]`)
  // volZ per candle 5 terakhir (deteksi lonjakan sisa)
  const vols = vis.map((c) => c.v)
  const vm = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20
  const vs = Math.sqrt(vols.slice(-21, -1).reduce((a, b) => a + (b - vm) ** 2, 0) / 19) || 1e-9
  const z5 = vols.slice(-5).map((x) => ((x - vm) / vs).toFixed(2))
  console.log(`volZ 5 terakhir: [${z5.join(', ')}]`)
  console.log('c45..c60 (VISIBLE, o/h/l/c/v):')
  for (let j = 44; j < CH_VISIBLE; j++) {
    const c = vis[j]
    const bar = c.c >= c.o ? '▲' : '▼'
    console.log(`  c${String(j + 1).padStart(2)} ${bar} o ${c.o.toFixed(2)} h ${c.h.toFixed(2)} l ${c.l.toFixed(2)} c ${c.c.toFixed(2)} v ${c.v.toFixed(2)}`)
  }
  console.log('HORIZON c61..c72 (hanya analisis developer):')
  for (let j = CH_VISIBLE; j < exam.candles.length; j++) {
    const c = exam.candles[j]
    const bar = c.c >= c.o ? '▲' : '▼'
    console.log(`  c${String(j + 1).padStart(2)} ${bar} o ${c.o.toFixed(2)} h ${c.h.toFixed(2)} l ${c.l.toFixed(2)} c ${c.c.toFixed(2)} v ${c.v.toFixed(2)}`)
  }
}
