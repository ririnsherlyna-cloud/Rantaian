import { forgeCandleSuite, CH_VISIBLE } from '../../src/lib/exam/candle-exam'
import { buildCandleVision } from '../../src/lib/exam/sakti-candle'
const NSS = ['candle','luar-A','luar-B','luar-C','luar-D','luar-E','luar-F','luar-G','luar-H','luar-I','luar-J','luar-K','latih-A','latih-B','latih-C','latih-D','latih-E','latih-F','latih-G','latih-H','latih-I','latih-J','latih-K','latih-L']
// distribusi & akumulasi dengan posWin <= 0.45 (zona konflik)
for (const arch of ['distribution-top', 'accumulation-base'] as const) {
  const vals: number[] = []
  for (const ns of NSS) for (const e of forgeCandleSuite(ns)) {
    if (e.arch.id !== arch) continue
    const v = buildCandleVision(e.candles.slice(0, CH_VISIBLE))
    if (v.posInWindow60 <= 0.45) {
      const ftw = (Math.max(...e.candles.slice(0, CH_VISIBLE).map(c => c.h)) - v.price) / v.atr
      vals.push(ftw)
    }
  }
  vals.sort((a, b) => a - b)
  console.log(`${arch} (posWin<=45%): n=${vals.length} min=${vals[0]?.toFixed(1)} p25=${vals[Math.floor(vals.length*0.25)]?.toFixed(1)} median=${vals[Math.floor(vals.length/2)]?.toFixed(1)} p75=${vals[Math.floor(vals.length*0.75)]?.toFixed(1)} max=${vals[vals.length-1]?.toFixed(1)}`)
}
