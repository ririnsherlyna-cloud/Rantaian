import { forgeCandleExam, CH_VISIBLE } from '../../src/lib/exam/candle-exam'
import { buildCandleVision, saktiMataVonis } from '../../src/lib/exam/sakti-candle'
const cases: [string, number][] = [
  ['latih-A', 53], ['latih-B', 24], ['latih-C', 33], ['latih-E', 34],
  ['latih-F', 4], ['latih-G', 94], ['latih-I', 40], ['latih-J', 80], ['latih-L', 80],
]
for (const [ns, num] of cases) {
  const exam = forgeCandleExam(num, ns)
  const vis = exam.candles.slice(0, CH_VISIBLE)
  const v = buildCandleVision(vis)
  const vonis = saktiMataVonis(vis)
  console.log(`${ns} #${num} [${exam.arch.id}/${exam.variant}/${exam.diff}] truth=${exam.truth} SAKTI=${vonis.arah}`)
  console.log(`  mom12 ${v.mom12Atr.toFixed(2)} mom3 ${v.mom3Atr.toFixed(2)} net5 ${v.netLast5Atr.toFixed(2)} rFlip ${v.rFlip} posWin ${(v.posInWindow60*100).toFixed(0)}% posRng ${(v.posInRange*100).toFixed(0)}% d21 ${v.distEma21Atr.toFixed(2)} slope ${v.ema21SlopeAtr.toFixed(3)} volZ ${v.volZ.toFixed(2)} vZmid ${v.volZmidMax.toFixed(2)} vAsym ${v.volAsym.toFixed(2)} vAsym5 ${v.volAsym5.toFixed(2)} ${v.consecutiveUp}↑/${v.consecutiveDown}↓ boUp:${v.recentBreakUp?1:0}${v.failedRetest?'-DIC':v.retestHold?'-tahan':''} boDn:${v.recentBreakDown?1:0}${v.failedRetest?'-DIC':v.retestHold?'-tahan':''} sapuL:${v.sweptLow?1:0} sapuH:${v.sweptHigh?1:0} HH:${v.hh?1:0} HL:${v.hl?1:0} LH:${v.lh?1:0} LL:${v.ll?1:0} sqz:${v.squeeze?1:0} spring:${v.spring13?1:0} divB:${v.divBull?1:0} divS:${v.divBear?1:0} engB:${v.bullEngulf?1:0} engS:${v.bearEngulf?1:0} doji:${v.doji?1:0}`)
  console.log(`  ${vonis.alasan.join(' | ')}`)
}
