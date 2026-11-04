import { forgeCandleSuite, CH_VISIBLE } from '../../src/lib/exam/candle-exam'
import { buildCandleVision } from '../../src/lib/exam/sakti-candle'
const NSS = ['candle','luar-A','luar-B','luar-C','luar-D','luar-E','luar-F','luar-G','luar-H','luar-I','luar-J','luar-K','latih-A','latih-B','latih-C','latih-D','latih-E','latih-F','latih-G','latih-H','latih-I','latih-J','latih-K','latih-L']
function slopeLow(cs: { l: number }[], atr: number): number {
  const n = cs.length
  const start = Math.max(0, n - 20)
  const m = cs.slice(start)
  const k = m.length
  const xm = (k - 1) / 2
  const ym = m.reduce((s, c) => s + c.l, 0) / k
  let sxy = 0, sxx = 0
  for (let i = 0; i < k; i++) { sxy += (i - xm) * (m[i].l - ym); sxx += (i - xm) ** 2 }
  return (sxy / sxx) / atr
}
for (const arch of ['distribution-top', 'accumulation-base'] as const) {
  const vals: number[] = []
  for (const ns of NSS) for (const e of forgeCandleSuite(ns)) {
    if (e.arch.id !== arch) continue
    const v = buildCandleVision(e.candles.slice(0, CH_VISIBLE))
    if (v.posInWindow60 <= 0.45) vals.push(slopeLow(e.candles.slice(0, CH_VISIBLE), v.atr))
  }
  vals.sort((a, b) => a - b)
  console.log(`${arch}: n=${vals.length} min=${vals[0].toFixed(3)} p10=${vals[Math.floor(vals.length*0.1)].toFixed(3)} median=${vals[Math.floor(vals.length/2)].toFixed(3)} p90=${vals[Math.floor(vals.length*0.9)].toFixed(3)} max=${vals[vals.length-1].toFixed(3)}`)
}
