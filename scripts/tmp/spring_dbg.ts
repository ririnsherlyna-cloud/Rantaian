import { forgeCandleExam, CH_VISIBLE } from '../../src/lib/exam/candle-exam'
import { buildCandleVision } from '../../src/lib/exam/sakti-candle'
for (const [ns, num] of [['candle', 79], ['luar-A', 39], ['luar-K', 29], ['luar-E', 60], ['luar-H', 80]] as const) {
  const exam = forgeCandleExam(num, ns)
  const vis = exam.candles.slice(0, CH_VISIBLE)
  const v = buildCandleVision(vis)
  console.log(`${ns} #${num} [${exam.arch.id}] spring13=${v.spring13} posWin=${(v.posInWindow60*100).toFixed(0)}% net5=${v.netLast5Atr.toFixed(2)} mom3=${v.mom3Atr.toFixed(2)} label=${exam.truth}`)
  // low tiap candle c30..c60 dgn penanda sapu-recover
  for (let i = 29; i < 60; i++) {
    let priorMin = Infinity
    for (let j = Math.max(0, i - 17); j < i; j++) priorMin = Math.min(priorMin, vis[j].l)
    const sweep = vis[i].l < priorMin
    const recover = vis[i].c > priorMin
    if (sweep) console.log(`   c${i+1} low ${vis[i].l.toFixed(2)} priorMin ${priorMin.toFixed(2)} sweep=${sweep} recover=${recover} close=${vis[i].c.toFixed(2)}`)
  }
}
