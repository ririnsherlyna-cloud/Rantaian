// verifikasi #40/#44: posisi close60 vs level & jalur min-close horizon
import { forgeFboSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
for (const ns of ['fbo1700']) {
  const suite = forgeFboSuite(ns)
  for (const e of suite.filter((x) => x.num === 40 || x.num === 44)) {
    const cs = e.candles.slice(0, FBO_VISIBLE)
    const horizon = e.candles.slice(FBO_VISIBLE)
    const fitur = buildSgVision(cs)
    const atr = Math.max(fitur.atr, 1e-9)
    const k = fbVonis(cs, '1.32')
    const lvl = k.level?.level ?? 0
    const c60 = cs[cs.length - 1].c
    console.log(`#${e.num} ${e.fam} arah=${k.arah} trig=${k.triggerLevel?.toFixed(3)} lvl=${lvl.toFixed(3)} c60=${c60.toFixed(3)} atr=${atr.toFixed(3)}`)
    console.log(`  c60 vs level: ${(lvl - c60) / atr >= 0 ? '+' : ''}${((lvl - c60) / atr).toFixed(2)} ATR di bawah level (searah TURUN)`)
    for (const dep of [0.18, 0.35, 0.5, 0.6, 0.8]) {
      const trig = lvl - dep * atr
      const ok0 = c60 <= trig
      let hit = -1
      if (!ok0) for (let i = 0; i < Math.min(8, horizon.length); i++) if (horizon[i].c <= trig) { hit = i; break }
      console.log(`  dep=${dep}: trig=${trig.toFixed(3)} ok0=${ok0 ? 'YA(instant)' : 'tidak'} horizonHit=${hit}`)
    }
    // min close horizon 8 candle
    let mn = 99
    for (let i = 0; i < Math.min(8, horizon.length); i++) mn = Math.min(mn, (lvl - horizon[i].c) / atr)
    console.log(`  min (lvl-close)/atr 8-candle = ${mn.toFixed(2)} ATR | truth=${e.truth}`)
  }
}
