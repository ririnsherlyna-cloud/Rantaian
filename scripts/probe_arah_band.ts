// ============================================================
// PROBE BAND v1.6 — kumpulkan populasi penuh untuk 3 klaster:
//   A: cascade SKIP (AR-L3) — fitur lengkap jejak V
//   B: WAIT/TURUN pool ATAS !reclaimed mom50<=-3 — deepdump(NAIK)
//      vs ABSORB(TURUN): cari pemisah
//   C: KETUA-EPISODE KL-L2 yang likuidasi vs selamat: cari band
// ============================================================
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { simKlTrade, KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { stdev } from '../src/lib/exam/indicators'

const NSS = ['ar100', 'ar-hakim1', 'ar-hakim2', 'ar-hakim3', 'ar-hakim4', 'ar-hakim5', 'ar-hakim6', 'ar-hakim7', 'ar-hakim8', 'ar-hakim9', 'ar-hakim10', 'ar-hakim21', 'ar-hakim22', 'ar-hakim23', 'ar-hakim24', 'ar-hakim25', 'ar-segel31', 'ar-hakim43', 'ar-segel22', 'ar-hakim41', 'ar-hakim42', 'ar-hakim44', 'ar-hakim45']

interface Baris { ns: string; num: number; fam: string; diff: string; truth: string; vonis: string; lapisan: string; klAksi: string; klArah: string; stopHit: boolean; benar: boolean; net: number; lastBody: number; volZmax3: number; lastVolZ: number; mom30: number; mom50: number; mom12: number; dEma: number; posWin: number; depth: number; bars: number; reclaimed: boolean; twoSisi: boolean; korbanPump: boolean; volAsym5: number; postDry: number; poolSide: string }

const semua: Baris[] = []
for (const ns of NSS) {
  const suite = forgeKlSuite(ns)
  for (const u of suite) {
    const vis = u.candles.slice(0, KL_VISIBLE)
    const v = arahVonis(vis)
    const kl = klVonis(vis)
    const led = simKlTrade({ aksi: v.eksekusi.aksi, arah: v.arah, targetPct: v.eksekusi.targetPct, stopPct: v.eksekusi.stopPct, triggerLevel: v.eksekusi.triggerLevel }, u.entry, u.candles.slice(KL_VISIBLE), u.bait)
    const f = kl.fitur
    const atr = Math.max(f.atr, 1e-9)
    const n = vis.length
    const vols = vis.map((c) => c.v)
    const volSd = Math.max(stdev(vols.slice(Math.max(0, n - 30))), 1e-9)
    const volZmax3 = Math.max(...vis.slice(n - 3).map((c) => (c.v - f.volMean) / volSd))
    semua.push({
      ns, num: u.num, fam: u.fam, diff: u.diff, truth: u.truth, vonis: v.vonis, lapisan: v.lapisan.split('(')[0],
      klAksi: kl.aksi, klArah: kl.arah, stopHit: led.stopHit, benar: v.arah === u.truth, net: led.netPct ?? 0,
      lastBody: (vis[n - 1].c - vis[n - 1].o) / atr, volZmax3, lastVolZ: f.lastVolZ, mom30: f.mom30Atr, mom50: f.mom50Atr,
      mom12: f.mom12Atr, dEma: f.distEma21Atr, posWin: f.posInWindow60,
      depth: kl.pool.depthAtr, bars: kl.pool.barsSince, reclaimed: kl.pool.reclaimed,
      twoSisi: kl.gauntlet.twoSisi, korbanPump: kl.pd.korbanPump, volAsym5: f.volAsym5,
      postDry: kl.pool.swept && kl.pool.postVolMean ? kl.pool.postVolMean / Math.max(f.volMean, 1e-9) : -1,
      poolSide: v.kl.poolSide,
    })
  }
}

const fmt = (b: Baris) => `${b.ns}#${b.num} ${b.fam}[${b.diff}] truth=${b.truth} ${b.benar ? 'OK' : 'SALAH'}${b.stopHit ? '+LIKUIDASI' : ''} net=${b.net.toFixed(2)} | kl=${b.klAksi}/${b.klArah} lapisan=${b.lapisan} | lastBody=${b.lastBody.toFixed(2)} volZmax3=${b.volZmax3.toFixed(1)} lastVolZ=${b.lastVolZ.toFixed(1)} mom30=${b.mom30.toFixed(1)} mom50=${b.mom50.toFixed(1)} mom12=${b.mom12.toFixed(1)} dEma=${b.dEma.toFixed(1)} posWin=${b.posWin.toFixed(2)} | pool: depth=${b.depth.toFixed(2)} bars=${b.bars} recl=${b.reclaimed ? 1 : 0} twoSisi=${b.twoSisi ? 1 : 0} korban=${b.korbanPump ? 1 : 0} volAsym=${b.volAsym5.toFixed(1)} postDry=${b.postDry.toFixed(2)}`

console.log('=== KLASTER A: cascade SKIP / AR-L3 tidak menyala tapi ada V ===')
for (const b of semua) if (b.fam === 'kl-rev-cascade' && b.klAksi === 'SKIP' && !b.benar) console.log(fmt(b))
// pembanding: cascade SKIP yang BENAR
console.log('--- cascade SKIP yang BENAR (sampel):')
const cascSkipOk = semua.filter((b) => b.fam === 'kl-rev-cascade' && b.klAksi === 'SKIP' && b.benar)
for (const b of cascSkipOk.slice(0, 8)) console.log(fmt(b))
console.log(`(total cascade SKIP benar: ${cascSkipOk.length})`)

console.log('\n=== KLASTER B: KETUA-TRIGGER WAIT/TURUN pool ATAS !reclaimed, mom50<=-3 ===')
for (const b of semua) if (b.lapisan === 'KETUA-TRIGGER' && b.klArah === 'TURUN' && !b.reclaimed && b.poolSide === 'ATAS' && b.mom50 <= -3) console.log(fmt(b))

console.log('\n=== KLASTER C: KETUA-EPISODE KL-L2 — likuidasi vs selamat ===')
for (const b of semua) if (b.lapisan === 'KETUA-EPISODE' && b.klArah === 'NAIK' && b.stopHit) console.log(fmt(b))
console.log('--- KL-L2 selamat dgn bars<=1 (sampel):')
const l2ok = semua.filter((b) => b.lapisan === 'KETUA-EPISODE' && b.klArah === 'NAIK' && !b.stopHit && b.bars <= 1)
for (const b of l2ok.slice(0, 10)) console.log(fmt(b))
console.log(`(total KL-L2-NAIK bars<=1 selamat: ${l2ok.length})`)
