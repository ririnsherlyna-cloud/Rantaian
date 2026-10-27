// PROBE BEDAH r1 — kasus #14 (SKIP salah), #56 (FAKE cermin salah arah), #80 (WAIT arah bait)
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'

const suite = forgeKlSuite('kl100')
for (const num of [14, 56, 80]) {
  const e = suite[num - 1]
  const vis = e.candles.slice(0, KL_VISIBLE)
  const v = buildSgVision(vis)
  const n = vis.length
  const atr = Math.max(v.atr, 1e-9)
  console.log(`\n===== #${num} ${e.fam} [${e.diff}] truth=${e.truth} post=${e.post} entry=${e.entry.toFixed(2)} =====`)
  console.log(`atr=${atr.toFixed(3)} mom50=${v.mom50Atr.toFixed(2)} mom30=${v.mom30Atr.toFixed(2)} mom12=${v.mom12Atr.toFixed(2)} posWin=${v.posInWindow60.toFixed(2)} consecUp=${v.consecutiveUp}/big=${v.consecUpBig} consecDn=${v.consecutiveDown}/big=${v.consecDownBig} lastVolZ=${v.lastVolZ.toFixed(1)} volMean=${v.volMean.toFixed(2)}`)
  // klPdScan manual
  const midHi = Math.max(...vis.slice(24, 40).map((c) => c.h))
  const midLo = Math.min(...vis.slice(24, 40).map((c) => c.l))
  const momTengah = (vis[39].c - vis[24].c) / atr
  const puncakPumpFase = Math.max(...vis.slice(24, 40).map((c) => c.h))
  const dasarPumpFase = Math.min(...vis.slice(24, 40).map((c) => c.l))
  const fallDariPuncakPump = (puncakPumpFase - vis[n - 1].c) / atr
  const riseDariDasarPump = (vis[n - 1].c - dasarPumpFase) / atr
  console.log(`P&D: midMove=${((midHi - midLo) / atr).toFixed(1)} momTengah=${momTengah.toFixed(2)} puncakFase=${puncakPumpFase.toFixed(2)} dasarFase=${dasarPumpFase.toFixed(2)} fallDariPuncakPump=${fallDariPuncakPump.toFixed(2)} riseDariDasarPump=${riseDariDasarPump.toFixed(2)}`)
  // pools
  const winStart = Math.max(0, n - 22)
  for (const p of v.pools) {
    if (!p.swept) continue
    const margin = 0.12 * atr
    let lastPierce = -1
    for (let i = n - 1; i >= winStart; i--) {
      const pierce = p.side === 'BAWAH' ? vis[i].l < p.level - margin : vis[i].h > p.level + margin
      if (pierce) { lastPierce = i; break }
    }
    if (lastPierce < 0) continue
    let a = lastPierce
    while (a - 1 >= winStart) {
      const prev = vis[a - 1]
      const pierce = p.side === 'BAWAH' ? prev.l < p.level - margin : prev.h > p.level + margin
      const beyond = p.side === 'BAWAH' ? prev.c < p.level - margin : prev.c > p.level + margin
      if (pierce || beyond) a--
      else break
    }
    const episode = vis.slice(a)
    const extreme = p.side === 'BAWAH' ? Math.min(...episode.map((c) => c.l)) : Math.max(...episode.map((c) => c.h))
    const depth = p.side === 'BAWAH' ? (p.level - extreme) / atr : (extreme - p.level) / atr
    const closeDist = p.side === 'BAWAH' ? (vis[n - 1].c - p.level) / atr : (p.level - vis[n - 1].c) / atr
    const post = vis.slice(lastPierce + 1)
    const postBody = post.length ? Math.max(...post.map((c) => Math.abs(c.c - c.o))) / atr : 0
    const postVol = post.length ? post.reduce((s, c) => s + c.v, 0) / post.length : 0
    console.log(`POOL ${p.side} ${p.jenis} lvl=${p.level.toFixed(2)} sent=${p.sentuhan} dariZona=${p.dariZona} | barsSince=${n - 1 - lastPierce} episodeLen=${episode.length} depth=${depth.toFixed(2)} closeDist=${closeDist.toFixed(2)} postBody=${postBody.toFixed(2)} postVol=${postVol.toFixed(2)} (${(postVol / v.volMean).toFixed(2)}x)`)
  }
  // truth aspek untuk pembanding
  console.log(`TRUTH: pl=${e.pl.toFixed(2)} lvlFbo=${e.lvlFbo.toFixed(2)} puncakPump=${e.puncakPump.toFixed(2)} extreme=${e.extreme.toFixed(2)}`)
}
