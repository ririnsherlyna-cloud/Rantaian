// BEDAH h3 RONDE 2 — cari pembeda antara:
//   A) FLIP-BENAR  : wait-double, cont-absorb (h3 = umpan)
//   B) FLIP-SALAH  : rev-range, rev-round, rev-wick, rev-deepdump
//                    (aturan saya flip, padahal h3 = arah)
//   C) TAK-FLIP-SALAH: cont-fake (h3 = umpan, aturan saya tidak flip)
//   D) TAK-FLIP-BENAR: sisanya
// Semua fitur HANYA dari otak atas 60 candle visible.
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const exams = forgeKlSuite('pr100b')
const baris: string[] = []
for (const u of exams) {
  const visible = u.candles.slice(0, KL_VISIBLE)
  const v = klVonis(visible)
  const atr = Math.max(buildSgVision(visible).atr, 1e-9)
  const h3 = (u.candles[KL_VISIBLE + 2].c - u.entry) / atr
  const fArah = v.arah === 'NAIK' ? 'NAIK' : 'TURUN'
  const fUmpan = v.arah === 'NAIK' ? 'TURUN' : 'NAIK'
  const poolLawan = v.pool.side !== 'TAK-JELAS' &&
    ((v.arah === 'NAIK' && v.pool.side === 'ATAS') || (v.arah === 'TURUN' && v.pool.side === 'BAWAH'))
  const ruleFlip = v.aksi === 'WAIT-HIT' || poolLawan
  const h3Real = Math.abs(h3) < 0.15 ? 'DATAR' : h3 > 0 ? 'NAIK' : 'TURUN'
  const h3CocokArah = h3Real === fArah
  const grup = ruleFlip ? (h3CocokArah ? 'B-flip-salah' : 'A-flip-benar') : (h3CocokArah ? 'D-ok' : 'C-takflip-salah')
  if (grup === 'D-ok') continue
  baris.push([
    grup.padEnd(15), `#${String(u.num).padStart(3)}`, u.fam.padEnd(14),
    `truth=${u.truth.padEnd(5)}`, `aksi=${v.aksi.padEnd(8)}`,
    `pool=${v.pool.side.padEnd(9)}`, `swept=${v.pool.swept ? 1 : 0}`, `recl=${v.pool.reclaimed ? 1 : 0}`,
    `bs=${String(v.pool.barsSince).padStart(2)}`, `dep=${v.pool.depthAtr.toFixed(1)}`,
    `sentuh=${v.pool.sentuhan}`,
    `grab=${v.grab.terjadi ? 1 : 0}/${v.grab.post.padEnd(11)}`,
    `bullT=${v.gauntlet.bullTrap ? 1 : 0}`, `bearT=${v.gauntlet.bearTrap ? 1 : 0}`,
    `deceit=${v.gauntlet.deceitCount}`,
    `pump=${v.pd.pump ? 1 : 0}`, `fbo=${v.pd.falseBreakout ? 1 : 0}`, `korban=${v.pd.korbanPump ? 1 : 0}`,
    `fallP=${v.pd.fallFromPuncakAtr.toFixed(1)}`,
    `h3=${h3.toFixed(2)}(${h3Real})`, `arah=${v.arah}`,
  ].join(' '))
}
console.log(baris.join('\n'))
