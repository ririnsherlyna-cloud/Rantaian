// VALIDASI PR-L2 = (WAIT || poolLawan) && pagar-jarak (sisi aman
// masih dalam 1.25 ATR dari level pool). Uji di 5 namespace
// (pr100, b, c = lama; d, e = segar murni utk generalisasi).
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { nilaiKoherensi } from '../src/lib/exam/prareg'
import type { FaseCek } from '../src/lib/exam/prareg'

const THETA = 1.25

function uji(ns: string, rincian: boolean): void {
  const exams = forgeKlSuite(ns)
  let b3 = 0, s4 = 0, kohSum = 0
  const salah: string[] = []
  for (const u of exams) {
    const visible = u.candles.slice(0, KL_VISIBLE)
    const v = arahVonis(visible)
    const kl = klVonis(visible)
    const atr = Math.max(buildSgVision(visible).atr, 1e-9)
    const d = kl.pool.side === 'TAK-JELAS' ? null : (visible[59].c - kl.pool.level) / atr
    const poolLawan = kl.pool.side !== 'TAK-JELAS' &&
      ((v.arah === 'NAIK' && kl.pool.side === 'ATAS') || (v.arah === 'TURUN' && kl.pool.side === 'BAWAH'))
    const sisiAman = d === null ? null
      : kl.pool.side === 'BAWAH' ? (d > 0 ? d : null) : (d < 0 ? -d : null)
    const dalamRadius = sisiAman !== null && sisiAman < THETA
    const flip = (v.eksekusi.aksi === 'WAIT' || poolLawan) && dalamRadius
    const fArah: FaseCek = v.arah === 'NAIK' ? 'NAIK' : 'TURUN'
    const fUmpan: FaseCek = v.arah === 'NAIK' ? 'TURUN' : 'NAIK'
    const cek: [FaseCek, FaseCek, FaseCek, FaseCek] = flip ? [fUmpan, fArah, fArah, fArah] : [fArah, fArah, fArah, fArah]
    const moves = [3, 7, 11, 14].map((h) => (u.candles[KL_VISIBLE + h - 1].c - u.entry) / atr)
    const koh = nilaiKoherensi(cek, moves)
    kohSum += koh.rasio
    if (koh.cek[0].cocok) b3++
    if (koh.skor === 4) s4++
    if (koh.skor < 4 && rincian) salah.push(`#${String(u.num).padStart(3)} ${u.fam.padEnd(15)} truth=${u.truth} d=${d === null ? 'null' : d.toFixed(2)} flip=${flip ? 1 : 0} skor=${koh.skor}`)
  }
  console.log(`[${ns}] h3 ${b3}/100 · skor-4 ${s4}/100 · koh ${((kohSum / 100) * 100).toFixed(2)}%${rincian && salah.length ? '\n  sisa salah (zona kabut):\n' + salah.map((s) => '  ' + s).join('\n') : ''}`)
}

for (const ns of ['pr100', 'pr100b', 'pr100c', 'pr100d', 'pr100e']) uji(ns, false)
console.log('\n--- rincian pr100d ---')
uji('pr100d', true)
