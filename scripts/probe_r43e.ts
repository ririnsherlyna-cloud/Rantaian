// ============================================================
// PROBE R43e — dump SEMUA kasus yang keputusannya FB-T4 / FB-L8
// di 24 seed (fitur event-terpilih dari k.brk) + kasus fbo1100 #48.
// Utk kalibrasi veto T4 (momAl) & L8->SKIP (dir/momAl).
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis, FBO_BRAIN_VERSI } from '../src/lib/exam/fbo-brain'

const f = (x: number | undefined, d = 2): string => x === undefined ? '—' : x.toFixed(d)

function hasil(ns: string, num: number, kind: string): { ok: boolean; fam: string; diff: string } | null {
  const suite = kind === 'GUARD' ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const ex = suite.find((x) => x.num === num)
  if (!ex) return null
  const cs = ex.candles.slice(0, FBO_VISIBLE)
  const k = fbVonis(cs, FBO_BRAIN_VERSI)
  const led = simFboTrade({ aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel }, ex.entry, ex.candles.slice(FBO_VISIBLE))
  let ok: boolean
  if (led.mode === 'NO-TRADE') {
    const bait = simBaitFbo(ex.breakArah, ex.entry, ex.candles.slice(FBO_VISIBLE))
    ok = bait.stopHit || (bait.netPct ?? 0) <= 0
  } else ok = (led.netPct ?? -1) > 0 && !led.stopHit
  return { ok, fam: ex.fam, diff: ex.diff }
}

function dumpAll(pelajaran: string): void {
  console.log(`\n======== SEMUA KEPUTUSAN ${pelajaran} (24 seed) ========`)
  for (let s = 100; s <= 2400; s += 100) {
    const ns = `fbo${s}`
    for (const kind of ['FBO', 'GUARD'] as const) {
      const suite = kind === 'FBO' ? forgeFboSuite(ns) : forgeFboGuardSuite(ns)
      for (const ex of suite) {
        const cs = ex.candles.slice(0, FBO_VISIBLE)
        const k = fbVonis(cs, FBO_BRAIN_VERSI)
        if (!k.pelajaranAktif.includes(pelajaran)) continue
        const brk = k.brk
        const fitur = k.fitur
        const momAl = brk ? (brk.side === 'ATAS' ? (fitur.mom50Atr ?? 0) : -(fitur.mom50Atr ?? 0)) : (fitur.mom50Atr ?? 0)
        const h = hasil(ns, ex.num, kind)
        const tag = h?.ok ? 'LULUS ' : 'GAGAL '
        if (pelajaran === 'FB-T4') {
          console.log(`${tag} [${ns} #${ex.num}] ${ex.fam}/${kind === 'GUARD' ? 'G' : 'F'} ${ex.diff} truth=${ex.truth} aksi=${k.aksi}/${k.arah} | momAl=${f(momAl, 1)} dEma=${f(fitur.distEma21Atr)} | cOut=${brk?.closesBeyond} cN=${f(brk?.closeNowAtr)} maxB=${f(brk?.maxBeyondAtr)} umur=${brk ? cs.length - 1 - brk.firstPierceIdx : '—'} | vFP=${f(brk?.volFollowPre)} vBrk=${f(brk?.volRatioBreak)} p7=${f(brk?.push7Atr)} dir=${f(brk?.dirCons)} eff=${f(brk?.effAtr)} rejec=${f(brk?.rejecBodyAtr)} climax=${brk?.climax ? 1 : 0}`)
        } else {
          console.log(`${tag} [${ns} #${ex.num}] ${ex.fam}/${kind === 'GUARD' ? 'G' : 'F'} ${ex.diff} truth=${ex.truth} aksi=${k.aksi}/${k.arah} | momAl=${f(momAl, 1)} dir=${f(brk?.dirCons)} | cOut=${brk?.closesBeyond} cN=${f(brk?.closeNowAtr)} maxB=${f(brk?.maxBeyondAtr)} | vFP=${f(brk?.volFollowPre)} vBrk=${f(brk?.volRatioBreak)} p7=${f(brk?.push7Atr)} rejec=${f(brk?.rejecBodyAtr)} wickB=${f(brk?.wickBeyondAtr)} lateM=${f(brk?.lateMoveAtr)} retest=${brk?.retest ? 1 : 0}`)
        }
      }
    }
  }
}

dumpAll('FB-T4')
dumpAll('FB-L8')
