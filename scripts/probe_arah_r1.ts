// ============================================================
// PROBE BEDAH R1 — UJIAN KEPASTIAN-ARAH
// 10 likuidasi (arah benar TAPI stop tersentuh sebelum target):
// siapa mereka, dari lapisan mana, anatomi pool-nya bagaimana,
// dan apa yang tracker bersertifikat lakukan (ENTRY/WAIT/SKIP).
// ============================================================

import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { simKlTrade, KL_VISIBLE } from '../src/lib/exam/kompleks-forge'

const ns = process.argv[2] || 'ar100'
const suite = forgeKlSuite(ns)

console.log(`=== BEDAH LIKUIDASI [${ns}] ===`)
let n = 0
for (const u of suite) {
  const visible = u.candles.slice(0, KL_VISIBLE)
  const horizon = u.candles.slice(KL_VISIBLE)
  const v = arahVonis(visible)
  const kl = klVonis(visible)
  const led = simKlTrade({ aksi: 'ENTRY', arah: v.arah, targetPct: v.eksekusi.targetPct, stopPct: v.eksekusi.stopPct }, u.entry, horizon, u.bait)
  if (!led.stopHit) continue
  n++
  const P = kl.pool
  const ext = P.swept && P.side === 'BAWAH' ? P.level - P.depthAtr * kl.fitur.atr : P.swept ? P.level + P.depthAtr * kl.fitur.atr : 0
  const cd = (P as unknown as { closeDistAtr?: number }).closeDistAtr ?? 0
  const pb = (P as unknown as { postBounceMaxBodyAtr?: number }).postBounceMaxBodyAtr ?? 0
  const vz = (P as unknown as { volZSweep?: number }).volZSweep ?? 0
  const cb = (P as unknown as { crossBack?: boolean }).crossBack ?? false
  const dipHorizon = u.truth === 'NAIK' ? Math.min(...horizon.map((c) => c.l)) : Math.max(...horizon.map((c) => c.h))
  console.log(`\n#${u.num} ${u.fam} [${u.diff}] truth=${u.truth} vonis=${v.vonis} kepastian=${v.kepastian} net=${led.netPct?.toFixed(2)}%`)
  console.log(`  lapisan=${v.lapisan} kl.aksi=${kl.aksi} kl.arah=${kl.arah} kl.pelajaran=[${kl.pelajaranAktif.join(',')}]`)
  console.log(`  pool: side=${P.side} swept=${P.swept} bars=${P.barsSince} depth=${P.depthAtr.toFixed(2)} closeDist=${cd.toFixed(2)} reclaimed=${P.reclaimed} crossBack=${cb} postBody=${pb.toFixed(2)} volZ=${vz.toFixed(1)}`)
  console.log(`  stop=${led.stop?.toFixed(2)} (${v.eksekusi.stopPct.toFixed(2)}%) ekstrem=${ext.toFixed(2)} dip-horizon=${dipHorizon.toFixed(2)} (guard ekstrem-0.7ATR=${(ext - 0.7 * kl.fitur.atr).toFixed(2)})`)
  console.log(`  triggerKl=${kl.triggerLevel?.toFixed(2) ?? '—'} entry60=${u.entry.toFixed(2)} mom50=${kl.fitur.mom50Atr.toFixed(2)} lastVolZ=${kl.fitur.lastVolZ.toFixed(1)}`)
}
console.log(`\ntotal likuidasi: ${n}`)
