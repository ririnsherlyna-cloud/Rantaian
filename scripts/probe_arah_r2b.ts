// Bedah fitur PERSIS klaster cascade-SKIP yang gagal: apa yang
// gagal memenuhi AR-L3? (consecUpBig? body crossback? volZ?)
import { forgeKlExam } from '../src/lib/exam/kompleks-suite'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { deteksiKaskadeVoid } from '../src/lib/exam/arah-brain'

const cases: [string, number[]][] = [
  ['ar-hakim2', [16, 18, 19, 20]],
  ['ar-hakim6', [16, 18, 19]],
  ['ar-hakim8', [16, 18, 19]],
  ['ar-hakim3', [14]],
  // pembanding: cascade yang BENAR (slot NAIK #11-15) di hakim2
  ['ar-hakim2', [11, 12, 13, 14, 15]],
]
for (const [ns, nums] of cases) {
  for (const num of nums) {
    const u = forgeKlExam(num, ns)
    const vis = u.candles.slice(0, KL_VISIBLE)
    const kl = klVonis(vis)
    const f = kl.fitur
    const atr = Math.max(f.atr, 1e-9)
    const last = vis[vis.length - 1]
    const lastBody = (last.c - last.o) / atr
    const kv = deteksiKaskadeVoid(vis, f, kl)
    console.log(
      `${ns} #${num} truth=${u.truth} kl=${kl.aksi}/${kl.arah} | consecUp=${f.consecUpBig} consecDn=${f.consecDownBig} lastBody=${lastBody.toFixed(2)}ATR lastVolZ=${f.lastVolZ.toFixed(1)} mom50=${f.mom50Atr.toFixed(2)} mom12=${f.mom12Atr.toFixed(2)} posWin=${f.posInWindow60.toFixed(2)} rangeAtr=${f.rangeAtr.toFixed(2)} mom30=${f.mom30Atr.toFixed(2)} poolSwept=${kl.pool.swept} | AR-L3=${kv.aktif ? 'AKTIF->' + kv.arah : 'tidak'}`,
    )
    // jejak 6 lilin terakhir (badan ATR + warna)
    const trail = vis.slice(-6).map((c) => `${c.c >= c.o ? '+' : '-'}${((c.c - c.o) / atr).toFixed(2)}`).join(' ')
    console.log(`   jejak6: ${trail} | close60=${u.entry.toFixed(2)} high60=${Math.max(...vis.map((c) => c.h)).toFixed(2)} low60=${Math.min(...vis.map((c) => c.l)).toFixed(2)}`)
  }
}
