import { forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildFboLevels } from '../../src/lib/exam/fbo-brain'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const e = forgeFboGuardSuite('fbo100')[0]
const cs = e.candles.slice(0, FBO_VISIBLE)
const atr = buildSgVision(cs).atr
const L = buildFboLevels(cs).find((l) => Math.abs(l.level - 102.1) < 0.3)!
const margin = 0.12 * atr
const n = FBO_VISIBLE
let lastUp = -1
for (let i = n - 1; i >= n - 45; i--) if (cs[i].h > L.level + margin) { lastUp = i; break }
let fp = lastUp
for (let j = lastUp; j >= n - 45; j--) {
  if (cs[j].h > L.level + margin || cs[j].c > L.level) fp = j; else break
}
let preT = 0, eraStart = -1, eraEnd = -1
for (let i = 1; i < fp + 1; i++) {
  const visit = i <= fp && cs[i].h >= L.level - 0.25 * atr
  const inner = i < fp && cs[i].c < L.level
  if (visit && inner) { if (eraStart < 0) eraStart = i; eraEnd = i }
  else if (eraStart >= 0 && (!visit || i >= fp)) {
    let rej = false
    for (let j = eraStart; j <= Math.min(eraEnd + 3, fp - 1); j++) if (cs[j].c < L.level - 0.5 * atr) { rej = true; break }
    if (rej) preT++
    eraStart = -1
  }
}
let outerPre = 0
for (let i = 1; i < fp; i++) if (cs[i].c > L.level + margin) outerPre++
let bound = true
for (let i = 1; i < fp; i++) if (cs[i].c > L.level + 1.0 * atr) { bound = false; break }
const seg = cs.slice(fp)
const maxBeyond = Math.max(...seg.map((c) => (c.h - L.level) / atr))
const cNow = (cs[n - 1].c - L.level) / atr
console.log(`L=${L.level.toFixed(2)} fp=${fp} lp=${lastUp} preT=${preT} outerPre=${outerPre} bound=${bound} segLen=${seg.length} maxBeyond=${maxBeyond.toFixed(2)} cNow=${cNow.toFixed(2)}`)
console.log(`filters: lastUp<${n - 12}? ${lastUp < n - 12} | fp>=15? ${fp >= 15} | fp>=${n - 52}? ${fp >= n - 52} | seg>=3? ${seg.length >= 3} | preT>=1? ${preT >= 1} | outer<=3? ${outerPre <= 3} | bound? ${bound} | beyond<=11? ${maxBeyond <= 11} | |cNow|<=5.5? ${Math.abs(cNow) <= 5.5}`)
