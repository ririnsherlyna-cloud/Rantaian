import { forgeCandleSuite, CH_VISIBLE } from '../../src/lib/exam/candle-exam'
import { buildCandleVision, saktiMataVonis } from '../../src/lib/exam/sakti-candle'
const NSS = ['candle','luar-A','luar-B','luar-C','luar-D','luar-E','luar-F','luar-G','luar-H','luar-I','luar-J','luar-K','latih-A','latih-B','latih-C','latih-D','latih-E','latih-F','latih-G','latih-H','latih-I','latih-J','latih-K','latih-L']
for (const ns of NSS) {
  for (const exam of forgeCandleSuite(ns)) {
    const vis = exam.candles.slice(0, CH_VISIBLE)
    const v = buildCandleVision(vis)
    const vonis = saktiMataVonis(vis)
    if (vonis.arah !== exam.truth) {
      console.log(`${ns} #${exam.num} [${exam.arch.id}/${exam.variant}/${exam.diff}] truth=${exam.truth} SAKTI=${vonis.arah} move=${exam.moveAtr.toFixed(1)}`)
      console.log(`  mom12 ${v.mom12Atr.toFixed(2)} mom3 ${v.mom3Atr.toFixed(2)} net5 ${v.netLast5Atr.toFixed(2)} rFlip ${v.rFlip} posWin ${(v.posInWindow60*100).toFixed(0)}% posRng ${(v.posInRange*100).toFixed(0)}% d21 ${v.distEma21Atr.toFixed(2)} slope ${v.ema21SlopeAtr.toFixed(3)} volZ ${v.volZ.toFixed(2)} vZmid ${v.volZmidMax.toFixed(2)} vAsym ${v.volAsym.toFixed(2)} vA5 ${v.volAsym5.toFixed(2)} ${v.consecutiveUp}↑/${v.consecutiveDown}↓ boUp:${v.recentBreakUp?1:0}${v.failedRetest?'D':v.retestHold?'t':''} boDn:${v.recentBreakDown?1:0}${v.failedRetest?'D':v.retestHold?'t':''} sapuL:${v.sweptLow?1:0} sapuH:${v.sweptHigh?1:0} HH:${v.hh?1:0} HL:${v.hl?1:0} LH:${v.lh?1:0} LL:${v.ll?1:0} sqz:${v.squeeze?1:0} spr:${v.spring13?1:0} dB:${v.divBull?1:0} dS:${v.divBear?1:0} eB:${v.bullEngulf?1:0} eS:${v.bearEngulf?1:0} doji:${v.doji?1:0}`)
      console.log(`  ${vonis.alasan.join(' | ')}`)
    }
  }
}
