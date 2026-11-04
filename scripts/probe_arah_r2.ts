// ============================================================
// PROBE BEDAH R2 — kegagalan hakim segar (arah salah / likuidasi)
// Kategorisasi otomatis + anatomi lengkap per kegagalan.
// Pakai: bun scripts/probe_arah_r2.ts ar-hakim2
// ============================================================

import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { simKlTrade, KL_VISIBLE } from '../src/lib/exam/kompleks-forge'

const ns = process.argv[2] || 'ar-hakim2'
const suite = forgeKlSuite(ns)

interface Kasus {
  num: number; fam: string; diff: string; jenis: 'ARAH-SALAH' | 'LIKUIDASI'
  truth: string; vonis: string; kepastian: number; lapisan: string
  klAksi: string; klArah: string; klPel: string[]; trigger?: number
  pool: string; post: string; net: number
  mom50: number; lastVolZ: number; dEma: number; mom12: number
  horizonDipAtr: number; secondSweep: boolean
  volPost: string; bodyPost: string
}

const kasus: Kasus[] = []
for (const u of suite) {
  const visible = u.candles.slice(0, KL_VISIBLE)
  const horizon = u.candles.slice(KL_VISIBLE)
  const v = arahVonis(visible)
  const kl = klVonis(visible)
  const led = simKlTrade(
    { aksi: v.eksekusi.aksi, arah: v.arah, targetPct: v.eksekusi.targetPct, stopPct: v.eksekusi.stopPct, triggerLevel: v.eksekusi.triggerLevel },
    u.entry, horizon, u.bait)
  const salah = v.arah !== u.truth
  if (!salah && !led.stopHit) continue
  const P = kl.pool
  const atr = Math.max(kl.fitur.atr, 1e-9)
  const ext = P.swept ? (P.side === 'BAWAH' ? P.level - P.depthAtr * atr : P.level + P.depthAtr * atr) : 0
  const s = u.truth === 'NAIK' ? 1 : -1
  const dipHorizon = u.truth === 'NAIK' ? Math.min(...horizon.map((c) => c.l)) : Math.max(...horizon.map((c) => c.h))
  const dipAtr = Math.abs(dipHorizon - u.entry) / atr
  const awal5 = horizon.slice(0, 5)
  const awalExt = u.truth === 'NAIK' ? Math.min(...awal5.map((c) => c.l)) : Math.max(...awal5.map((c) => c.h))
  const secondSweep = P.swept && (u.truth === 'NAIK' ? awalExt <= ext - 0.4 * atr : awalExt >= ext + 0.4 * atr)
  kasus.push({
    num: u.num, fam: u.fam, diff: u.diff, jenis: salah ? 'ARAH-SALAH' : 'LIKUIDASI',
    truth: u.truth, vonis: v.vonis, kepastian: v.kepastian, lapisan: v.lapisan,
    klAksi: kl.aksi, klArah: kl.arah, klPel: kl.pelajaranAktif, trigger: kl.triggerLevel,
    pool: P.swept ? `${P.side} bars=${P.barsSince} depth=${P.depthAtr.toFixed(2)} reclaimed=${P.reclaimed} crossBack=${(P as unknown as { crossBack?: boolean }).crossBack}` : 'tak-ada',
    post: u.post, net: led.netPct ?? 0,
    mom50: kl.fitur.mom50Atr, lastVolZ: kl.fitur.lastVolZ, dEma: kl.fitur.distEma21Atr, mom12: kl.fitur.mom12Atr,
    horizonDipAtr: Math.round(dipAtr * 100) / 100, secondSweep,
    volPost: 'postVolMean' in P ? (P as unknown as { postVolMean: number }).postVolMean.toFixed(2) : '-',
    bodyPost: 'postBounceMaxBodyAtr' in P ? (P as unknown as { postBounceMaxBodyAtr: number }).postBounceMaxBodyAtr.toFixed(2) : '-',
  })
}

console.log(`=== BEDAH KEGAGALAN [${ns}] total=${kasus.length} ===`)
for (const k of kasus) {
  console.log(`\n#${k.num} ${k.fam} [${k.diff}] post=${k.post} ${k.jenis} truth=${k.truth} vonis=${k.vonis} kepastian=${k.kepastian} net=${k.net.toFixed(2)}%`)
  console.log(`  lapisan=${k.lapisan} | kl: ${k.klAksi}/${k.klArah} [${k.klPel.join(',')}] trigger=${k.trigger?.toFixed(2) ?? '—'}`)
  console.log(`  pool: ${k.pool} | volPost=${k.volPost} bodyPost=${k.bodyPost}`)
  console.log(`  fitur: mom50=${k.mom50.toFixed(2)} mom12=${k.mom12.toFixed(2)} dEma=${k.dEma.toFixed(2)} lastVolZ=${k.lastVolZ.toFixed(1)} | dip-horizon=${k.horizonDipAtr} ATR sapuan-kedua-di-5-awal=${k.secondSweep}`)
}
const byJenis = { 'ARAH-SALAH': kasus.filter((k) => k.jenis === 'ARAH-SALAH'), LIKUIDASI: kasus.filter((k) => k.jenis === 'LIKUIDASI') }
console.log(`\nRINGKAS: ARAH-SALAH=${byJenis['ARAH-SALAH'].length} LIKUIDASI=${byJenis.LIKUIDASI.length}`)
for (const [j, list] of Object.entries(byJenis)) {
  const fams = new Map<string, number>()
  const lapis = new Map<string, number>()
  for (const k of list) { fams.set(k.fam, (fams.get(k.fam) ?? 0) + 1); lapis.set(k.lapisan.split('(')[0], (lapis.get(k.lapisan.split('(')[0]) ?? 0) + 1) }
  console.log(`  ${j}: fam=${JSON.stringify([...fams.entries()])} lapisan=${JSON.stringify([...lapis.entries()])}`)
}
