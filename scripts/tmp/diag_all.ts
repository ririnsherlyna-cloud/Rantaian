import { forgeFboSuite, forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
import { buildSgVision } from '../../src/lib/exam/stophunt-brain'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../../src/lib/exam/fbo-brain'
import { simFboTrade, FBO_VISIBLE } from '../../src/lib/exam/fbo-forge'
const suiteF = forgeFboSuite('fbo100')
const suiteG = forgeFboGuardSuite('fbo100')
const all = [...suiteF, ...suiteG]
const pat: Record<string, number> = {}
for (const e of all) {
  const visible = e.candles.slice(0, FBO_VISIBLE)
  const fitur = buildSgVision(visible)
  const levels = buildFboLevels(visible)
  const evs = scanBreakEvents(visible, levels, fitur.volMean, fitur.atr)
  const k = fbVonis(visible)
  const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, e.entry, e.candles.slice(FBO_VISIBLE))
  const ok = led.mode !== 'NO-TRADE' && (led.netPct ?? -1) > 0 && !led.stopHit
  if (ok) continue
  const atr = fitur.atr
  const dLvl = k.level.level > 0 ? ((k.level.level - e.level.level) / atr) : 99
  // kategorikan
  let cat: string
  if (evs.length === 0) cat = 'A:no-event'
  else if (dLvl > 0.6) cat = 'B:level-salah'
  else if (k.aksi === 'SKIP') cat = 'C:skip-dgn-level-benar'
  else if (led.mode === 'NO-TRADE') cat = 'D:trigger-tak-menyala'
  else if (led.stopHit) cat = 'E:likuidasi'
  else cat = 'F:rugi'
  const key = `${cat} ${e.kind} ${k.aksi}`
  pat[key] = (pat[key] ?? 0) + 1
  if ((pat[key] ?? 0) <= 2) {
    const top = evs[0]
    console.log(`#${e.num} ${e.fam}[${e.diff}] ${cat} | otak ${k.aksi}/${k.arah} lvl=${k.level.level > 0 ? k.level.level.toFixed(2) : '-'} (dTruth=${dLvl.toFixed(2)} ATR) | evTop: ${top ? `${top.lvl.jenis}@${top.lvl.level.toFixed(2)} ${top.side} fp=${top.firstPierceIdx} lp=${top.lastPierceIdx} preT=${top.preTouches} cNow=${top.closeNowAtr.toFixed(2)} out=${top.closesBeyond} vFol=${top.volFollow.toFixed(2)} vLate=${top.volLate.toFixed(2)} xB=${top.crossBack ? 'Y' : 'n'} wick=${top.wickBeyondAtr.toFixed(2)} rejec=${top.rejecBodyAtr.toFixed(2)} climax=${top.climax ? 'Y' : 'n'}` : '-'} | truth lvl=${e.level.level.toFixed(2)} side=${e.level.side} ext=${e.level.extreme.toFixed(2)} lp=${e.level.lastPierceIdx} | ${k.alasan[0]?.slice(0, 90)}`)
  }
}
console.log('\nPOLA:', Object.entries(pat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' | '))
