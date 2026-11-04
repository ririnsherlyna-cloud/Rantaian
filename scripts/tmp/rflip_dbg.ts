import { forgeCandleSuite, CH_VISIBLE } from '../../src/lib/exam/candle-exam'
import { buildCandleVision } from '../../src/lib/exam/sakti-candle'
const NSS = ['candle','luar-A','luar-B','luar-C','luar-D','luar-E','luar-F','luar-G','luar-H','luar-I','luar-J','luar-K','latih-A','latih-B','latih-C','latih-D','latih-E','latih-F','latih-G','latih-H','latih-I','latih-J','latih-K','latih-L']
function flips(rets: number[]): number {
  let f = 0
  for (let i = 1; i < rets.length; i++) if (Math.sign(rets[i]) !== Math.sign(rets[i-1]) && rets[i] !== 0) f++
  return f
}
// bear-trap: regim pulih penuh (posWin >= 0.8, mom12 >= -1.6, d21 >= 1.0)
console.log('BEAR posWin>=80% mom12>=-1.6 d21>=1.0 (REAL=harus TURUN, TRAP=harus NAIK):')
for (const ns of NSS) for (const e of forgeCandleSuite(ns)) {
  if (e.arch.id !== 'bear-trap') continue
  const v = buildCandleVision(e.candles.slice(0, CH_VISIBLE))
  if (v.posInWindow60 >= 0.8 && v.mom12Atr >= -1.6 && v.distEma21Atr >= 1.0) {
    console.log(`  ${ns} #${e.num} ${e.variant} rFlip=${flips(v.ret6Atr)} net5=${v.netLast5Atr.toFixed(2)} vZmid=${v.volZmidMax.toFixed(2)} truth=${e.truth}`)
  }
}
console.log('BEAR deep-flush (mom12<=-3.2, posRng<=0.25):')
for (const ns of NSS) for (const e of forgeCandleSuite(ns)) {
  if (e.arch.id !== 'bear-trap') continue
  const v = buildCandleVision(e.candles.slice(0, CH_VISIBLE))
  if (v.mom12Atr <= -3.2 && v.posInRange <= 0.25) {
    console.log(`  ${ns} #${e.num} ${e.variant} vZmid=${v.volZmidMax.toFixed(2)} truth=${e.truth}`)
  }
}
