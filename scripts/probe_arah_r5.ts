// Bedah fitur 3 residu segar: hakim25 #13/#14, hakim28 #18
import { forgeKlExam } from '../src/lib/exam/kompleks-suite'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { deteksiKaskadeVoid } from '../src/lib/exam/arah-brain'

const cases: [string, number[]][] = [
  ['ar-hakim25', [13, 14]],
  ['ar-hakim28', [18]],
  // pembanding cascade SEHAT segar: slot NAIK dan TURUN yang lulus
  ['ar-hakim25', [11, 12, 15, 16, 17, 19, 20]],
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
    const trail = vis.slice(-6).map((c) => `${c.c >= c.o ? '+' : '-'}${((c.c - c.o) / atr).toFixed(2)}`).join(' ')
    const trailV = vis.slice(-6).map((c) => c.v.toFixed(2)).join(' ')
    console.log(
      `${ns} #${num} truth=${u.truth} vonisSalah=${u.truth !== 'NAIK' ? '' : ''} kl=${kl.aksi}/${kl.arah} | lastBody=${lastBody.toFixed(2)} lastVolZ=${f.lastVolZ.toFixed(1)} mom50=${f.mom50Atr.toFixed(2)} mom30=${f.mom30Atr.toFixed(2)} mom12=${f.mom12Atr.toFixed(2)} dEma=${f.distEma21Atr.toFixed(2)} posWin=${f.posInWindow60.toFixed(2)} rangeAtr=${f.rangeAtr.toFixed(2)} poolSwept=${kl.pool.swept} | AR-L3=${kv.aktif ? 'AKTIF->' + kv.arah : '-'}`,
    )
    console.log(`   jejak6: ${trail} | vol6: ${trailV}`)
  }
}
