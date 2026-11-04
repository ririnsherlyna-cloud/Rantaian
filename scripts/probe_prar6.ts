// BEDAH h3 RONDE 6 — tabel d (jarak bertanda ke level pool)
// utk semua kelompok penentu + rincian salah geometri θ=1.0/1.2.
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const fokus = new Set(['kl-wait-double', 'kl-cont-absorb', 'kl-cont-fake', 'kl-rev-strong', 'kl-rev-round', 'kl-rev-wick', 'kl-rev-range', 'kl-rev-deepdump', 'kl-rev-cascade'])
console.log('=== TABEL d (pr100b, kelompok penentu) ===')
for (const u of forgeKlSuite('pr100b')) {
  if (!fokus.has(u.fam)) continue
  const visible = u.candles.slice(0, KL_VISIBLE)
  const v = klVonis(visible)
  const atr = Math.max(buildSgVision(visible).atr, 1e-9)
  const d = v.pool.side === 'TAK-JELAS' ? null : (visible[59].c - v.pool.level) / atr
  const h3 = (u.candles[KL_VISIBLE + 2].c - u.entry) / atr
  console.log(`#${String(u.num).padStart(3)} ${u.fam.padEnd(15)} truth=${u.truth.padEnd(5)} d=${d === null ? ' null' : d.toFixed(2)} recl=${v.pool.reclaimed ? 1 : 0} bs=${String(v.pool.barsSince).padStart(2)} dep=${v.pool.depthAtr.toFixed(1)} h3=${h3 >= 0.15 ? 'NAIK ' : h3 <= -0.15 ? 'TURUN' : 'DATAR'}`)
}
console.log('\n=== d utk SEMUA fam lain (h3 arah, sampel kontrol) ===')
const seen = new Set<string>()
for (const u of forgeKlSuite('pr100b')) {
  if (fokus.has(u.fam)) continue
  const visible = u.candles.slice(0, KL_VISIBLE)
  const v = klVonis(visible)
  const atr = Math.max(buildSgVision(visible).atr, 1e-9)
  const d = v.pool.side === 'TAK-JELAS' ? null : (visible[59].c - v.pool.level) / atr
  const h3 = (u.candles[KL_VISIBLE + 2].c - u.entry) / atr
  if (seen.has(u.fam + String(h3 >= 0.15 ? 'N' : 'T')) && !u.fam.includes('wait')) continue
  seen.add(u.fam + String(h3 >= 0.15 ? 'N' : 'T'))
  console.log(`#${String(u.num).padStart(3)} ${u.fam.padEnd(15)} truth=${u.truth.padEnd(5)} d=${d === null ? ' null' : d.toFixed(2)} aksi=${v.aksi} h3=${h3 >= 0.15 ? 'NAIK ' : h3 <= -0.15 ? 'TURUN' : 'DATAR'}`)
}
