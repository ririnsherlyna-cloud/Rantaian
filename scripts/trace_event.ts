// TRACE EVENT — replikasi filter scanBreakEvents dgn log per-tahap
// utk satu level/side. Pakai: bun scripts/trace_event.ts <seed> <num> <lvl> <side> [guards]
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const seed = process.argv[2] ?? 'fbo200'
const num = parseInt(process.argv[3] ?? '111', 10)
const target = parseFloat(process.argv[4] ?? '102.23')
const sideArg = (process.argv[5] ?? 'ATAS') as 'ATAS' | 'BAWAH'
const guards = process.argv[6] === 'guards'
const suite = guards ? forgeFboGuardSuite(seed) : forgeFboSuite(seed)
const e = suite.find((x) => x.num === num)!
const cs = e.candles.slice(0, FBO_VISIBLE)
const n = cs.length
const fitur = buildSgVision(cs)
const atr = Math.max(fitur.atr, 1e-9)
const L = { level: target, jenis: 'trace', sentuhan: 9, dariZona: true }
const side = sideArg
const margin = 0.12 * atr
const winStart = Math.max(0, n - 45)
const log = (s: string, ok: boolean, d = '') => console.log(`${ok ? 'PASS' : 'KILL'} ${s} ${d}`)

let lastPierce = -1
for (let i = n - 1; i >= winStart; i--) {
  const beyond = side === 'ATAS' ? cs[i].h > L.level + margin : cs[i].l < L.level - margin
  if (beyond) { lastPierce = i; break }
}
log('lastPierce ada', lastPierce >= 0, `=${lastPierce}`)
if (lastPierce >= 0) {
  log('event hidup (lastPierce >= n-12)', lastPierce >= n - 12, `lastPierce=${lastPierce} n-12=${n - 12}`)
  let firstPierce = lastPierce
  for (let j = lastPierce; j >= winStart; j--) {
    const beyond = side === 'ATAS' ? cs[j].h > L.level + margin : cs[j].l < L.level - margin
    const closeBeyond = side === 'ATAS' ? cs[j].c > L.level : cs[j].c < L.level
    if (beyond || closeBeyond) firstPierce = j
    else break
  }
  log('firstPierce', true, `=${firstPierce}`)
  let preTouches = 0
  let eraStart = -1
  let eraEnd = -1
  const eras: string[] = []
  for (let i = 1; i < firstPierce + 1; i++) {
    const visit = i <= firstPierce && (side === 'ATAS' ? cs[i].h >= L.level - 0.25 * atr : cs[i].l <= L.level + 0.25 * atr)
    const inner = i < firstPierce && (side === 'ATAS' ? cs[i].c < L.level : cs[i].c > L.level)
    if (visit && inner) {
      if (eraStart < 0) eraStart = i
      eraEnd = i
    } else if (eraStart >= 0 && (!visit || i >= firstPierce)) {
      let rejected = false
      for (let j = eraStart; j <= Math.min(eraEnd + 3, firstPierce - 1); j++) {
        const away = side === 'ATAS' ? cs[j].c < L.level - 0.5 * atr : cs[j].c > L.level + 0.5 * atr
        if (away) { rejected = true; break }
      }
      eras.push(`era[${eraStart}..${eraEnd}] reject=${rejected}`)
      if (rejected) preTouches++
      eraStart = -1
    }
  }
  log('preTouches >= 1', preTouches >= 1, `${preTouches} | ${eras.join(' ')}`)
  let outerPre = 0
  for (let i = 1; i < firstPierce; i++) {
    const oc = side === 'ATAS' ? cs[i].c > L.level + 0.5 * atr : cs[i].c < L.level - 0.5 * atr
    if (oc) outerPre++
  }
  log('outerPre <= 7', outerPre <= 7, `=${outerPre}`)
  let bound = true
  for (let i = 1; i < firstPierce; i++) {
    if (side === 'ATAS' && cs[i].c > L.level + 1.0 * atr) { bound = false; break }
    if (side === 'BAWAH' && cs[i].c < L.level - 1.0 * atr) { bound = false; break }
  }
  log('koherensi batas', bound)
  const seg = cs.slice(firstPierce)
  log('seg >= 3', seg.length >= 3, `=${seg.length}`)
  log('firstPierce >= 15', firstPierce >= 15, `=${firstPierce}`)
  log('firstPierce >= n-52', firstPierce >= n - 52, `=${firstPierce} vs ${n - 52}`)
  const beyondA = seg.map((c) => (side === 'ATAS' ? (c.h - L.level) / atr : (L.level - c.l) / atr))
  const maxBeyond = Math.max(...beyondA)
  log('maxBeyond <= 11', maxBeyond <= 11, `=${maxBeyond.toFixed(2)}`)
  const last = cs[n - 1]
  const closeNowAtr = side === 'ATAS' ? (last.c - L.level) / atr : (L.level - last.c) / atr
  log('|closeNow| <= 8.5', Math.abs(closeNowAtr) <= 8.5, `=${closeNowAtr.toFixed(2)}`)
}
