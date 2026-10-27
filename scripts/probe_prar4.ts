// BEDAH h3 RONDE 4 — narasi episode: apakah pembacaan otak
// (dari visible) sudah membedakan kelompok h3-umpan vs h3-langsung?
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const exams = forgeKlSuite('pr100b')
const fokus = new Set(['kl-wait-double', 'kl-cont-absorb', 'kl-cont-fake', 'kl-rev-round', 'kl-rev-strong', 'kl-rev-wick', 'kl-rev-range', 'kl-rev-deepdump'])
for (const u of exams) {
  if (!fokus.has(u.fam)) continue
  const visible = u.candles.slice(0, KL_VISIBLE)
  const v = klVonis(visible)
  const atr = Math.max(buildSgVision(visible).atr, 1e-9)
  const h3 = (u.candles[KL_VISIBLE + 2].c - u.entry) / atr
  const h3Real = Math.abs(h3) < 0.15 ? 'DATAR' : h3 > 0 ? 'NAIK' : 'TURUN'
  // jarak harga sekarang ke level pool (ATR) & ke ekstrem sapuan
  const distPool = v.pool.side !== 'TAK-JELAS' ? Math.abs((visible[59].c - v.pool.level) / atr) : -1
  if (u.num > 70 && u.num < 81) continue
  console.log([
    `#${String(u.num).padStart(3)}`, u.fam.padEnd(14), `truth=${u.truth.padEnd(5)}`,
    `h3=${h3Real.padEnd(5)}`,
    `aksi=${v.aksi.padEnd(6)}`, `pool=${v.pool.side.padEnd(5)}/jenis=${v.pool.jenis.padEnd(10)}`,
    `recl=${v.pool.reclaimed ? 1 : 0}`, `dPool=${distPool.toFixed(1)}`,
    `grab=${v.grab.terjadi ? 1 : 0}/${v.grab.post.padEnd(12)}/${v.grab.cara.padEnd(22)}`,
    `pd=${v.pd.pump ? 'P' : '-'}${v.pd.dump ? 'D' : '-'}${v.pd.falseBreakout ? 'F' : '-'}`,
    `dumpCara=${v.pd.dumpCara.padEnd(20)}`, `fboCara=${v.pd.fboCara.padEnd(18)}`,
    `rangkaian=${v.aspek5.rangkaianUtuh}`,
  ].join(' '))
}
