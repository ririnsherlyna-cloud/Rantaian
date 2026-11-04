// PROBE r42c — uji presisi aturan veto/redirect sebelum menyuntik ke otak:
// 1) FB-L1/L2 reached: veto V1 (p7+vFpre+cOut) & V2/V3 (tren-dry) → outcome fade vs follow
// 2) FB-R #40/#44: kedalaman minimum close 8-candle horizon vs level
// 3) C6b dgn momAl >= 2.8: WIN/LOSE di 18 seed
// 4) T9 ketat (vL>=0.90 & vLpre>=0.85): pemenang lolos? #48 keluar?
//    bun scripts/probe_r42c.ts
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { buildFboLevels, scanBreakEvents, fbVonis } from '../src/lib/exam/fbo-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import type { FboArah } from '../src/lib/exam/fbo-forge'
import type { Candle } from '../src/lib/exam/generator'

type Arah = FboArah
const seeds: string[] = []
for (let i = 1; i <= 18; i++) seeds.push(`fbo${i * 100}`)

function simEntry(arah: Arah, entry: number, stopPct: number, horizon: Candle[]): { r: string; net: number } {
  const led = simFboTrade({ aksi: 'ENTRY', arah, targetPct: 2.2, stopPct }, entry, horizon)
  return led.mode === 'NO-TRADE' ? { r: 'NT', net: 0 } : { r: (led.netPct ?? -1) > 0 && !led.stopHit ? 'WIN' : 'LOSE', net: led.netPct ?? 0 }
}

for (const ns of seeds) {
  for (const guards of [false, true]) {
    const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const horizon = e.candles.slice(FBO_VISIBLE)
      const n = cs.length
      const fitur = buildSgVision(cs)
      const atr = Math.max(fitur.atr, 1e-9)
      const events = scanBreakEvents(cs, buildFboLevels(cs), fitur.volMean, atr)
      const E = events[0] ?? null
      const k = fbVonis(cs, '1.32')
      const pel = (k.pelajaranAktif ?? []).join('+')
      if (!E) continue
      const umur = n - 1 - E.firstPierceIdx
      const momAl = E.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
      const breakArah: Arah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
      const fadeArah: Arah = breakArah === 'NAIK' ? 'TURUN' : 'NAIK'
      const stopF = breakArah === 'NAIK'
        ? Math.min(2.6, Math.max(0.8, ((e.entry - (E.lvl.level - 0.7 * atr)) / e.entry) * 100))
        : Math.min(2.6, Math.max(0.8, (((E.lvl.level + 0.7 * atr) - e.entry) / e.entry) * 100))
      const flw = simEntry(breakArah, e.entry, stopF, horizon)

      // ---- (1) FB-L1/L2 reached ----
      if (pel.startsWith('FB-L1') || pel.startsWith('FB-L2')) {
        const ledA = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct }, e.entry, horizon)
        const fadeR = ledA.mode === 'NO-TRADE' ? 'NT' : (ledA.netPct ?? -1) > 0 && !ledA.stopHit ? 'WIN' : 'LOSE'
        const V1 = E.push7Atr >= 0.2 && E.volFollowPre >= 1.05 && E.closesBeyond >= 15
        const V2 = momAl >= 3.5 && E.volLate <= 0.85
        const V3 = momAl >= 3.2 && E.volFollow <= 0.88 && E.volLate <= 0.88
        if (fadeR === 'LOSE' || V1 || V2 || V3 || guards) {
          console.log(`L1L2|${ns}|${guards ? 'G' : 'F'}#${e.num}|${e.fam}|truth=${e.truth}|fade=${fadeR}|follow=${flw.r}|V1=${V1 ? 1 : 0}|V2=${V2 ? 1 : 0}|V3=${V3 ? 1 : 0}|p7=${E.push7Atr.toFixed(2)}|vFpre=${E.volFollowPre.toFixed(2)}|vLpre=${E.volLatePre.toFixed(2)}|cOut=${E.closesBeyond}|momAl=${momAl.toFixed(1)}|vF=${E.volFollow.toFixed(2)}|vL=${E.volLate.toFixed(2)}|cN=${E.closeNowAtr.toFixed(2)}|umur=${umur}|dEma=${fitur.distEma21Atr.toFixed(2)}`)
        }
      }

      // ---- (2) FB-R reached: kedalaman re-break ----
      if (pel.startsWith('FB-R ') || pel === 'FB-R' || pel.startsWith('FB-R+')) {
        const lvl = k.level?.level ?? 0
        let minC = 99
        for (let i = 0; i < Math.min(8, horizon.length); i++) {
          const c = horizon[i].c
          const d = k.arah === 'NAIK' ? (c - lvl) / atr : (lvl - c) / atr
          if (k.arah === 'NAIK' ? c >= lvl : c <= lvl) minC = Math.min(minC, d)
        }
        const c60d = k.arah === 'NAIK' ? (cs[n - 1].c - lvl) / atr : (lvl - cs[n - 1].c) / atr
        console.log(`FBR|${ns}|${guards ? 'G' : 'F'}#${e.num}|${e.fam}|truth=${e.truth}|arah=${k.arah}|trig=${k.triggerLevel?.toFixed(2)}|lvl=${lvl.toFixed(2)}|c60d=${c60d.toFixed(2)}|minHor=${minC === 99 ? 'x' : minC.toFixed(2)}`)
      }

      // ---- (3) C6b momAl >= 2.8 ----
      const momAlign0 = E.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)
      if (
        E.maxBeyondAtr <= 0.7 && E.closeNowAtr >= -1.0 && E.closeNowAtr < 0 &&
        momAlign0 >= 2.8 && E.volFollow >= 0.9 && E.preTouches >= 2 && !E.climax
      ) {
        console.log(`C6B|${ns}|${guards ? 'G' : 'F'}#${e.num}|${e.fam}|truth=${e.truth}|follow=${flw.r}|momAl=${momAlign0.toFixed(1)}|maxB=${E.maxBeyondAtr.toFixed(2)}|cN=${E.closeNowAtr.toFixed(2)}|preT=${E.preTouches}|vF=${E.volFollow.toFixed(2)}`)
      }

      // ---- (4) T9 ketat ----
      if (pel.startsWith('FB-T9')) {
        const lolos = E.volLate >= 0.90 && E.volLatePre >= 0.85
        console.log(`T9|${ns}|${guards ? 'G' : 'F'}#${e.num}|${e.fam}|vL=${E.volLate.toFixed(2)}|vLpre=${E.volLatePre.toFixed(2)}|ketatLolos=${lolos ? 1 : 0}`)
      }
    }
  }
}
