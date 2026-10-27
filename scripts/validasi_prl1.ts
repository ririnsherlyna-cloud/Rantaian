// VALIDASI ATURAN PR-L1 (hFlip) — sebelum dijadikan otak v1.1.
// Aturan kandidat: titik cek h3 = arah UMPAN (kebalikan vonis)
// bila (a) eksekusi WAIT, ATAU (b) pool tersapu di sisi
// BERLAWANAN arah vonis; selain itu h3 = arah vonis.
// Divalidasi di ns asli (pr100) + 2 namespace SEGAR (anti-overfit).
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { nilaiKoherensi } from '../src/lib/exam/prareg'
import type { FaseCek } from '../src/lib/exam/prareg'

function ujiNs(ns: string): void {
  const exams = forgeKlSuite(ns)
  let benarH3 = 0, skor4 = 0, skor3 = 0, skor2 = 0, skorRendah = 0
  let kohSum = 0
  const salah: string[] = []
  for (const u of exams) {
    const visible = u.candles.slice(0, KL_VISIBLE)
    const v = arahVonis(visible)
    const atr = Math.max(buildSgVision(visible).atr, 1e-9)
    const poolLawan = v.kl.poolSide !== 'TAK-JELAS' &&
      ((v.arah === 'NAIK' && v.kl.poolSide === 'ATAS') || (v.arah === 'TURUN' && v.kl.poolSide === 'BAWAH'))
    const flip = v.eksekusi.aksi === 'WAIT' || poolLawan
    const fArah: FaseCek = v.arah === 'NAIK' ? 'NAIK' : 'TURUN'
    const fUmpan: FaseCek = v.arah === 'NAIK' ? 'TURUN' : 'NAIK'
    const cek: [FaseCek, FaseCek, FaseCek, FaseCek] = flip ? [fUmpan, fArah, fArah, fArah] : [fArah, fArah, fArah, fArah]
    const moves = [3, 7, 11, 14].map((h) => (u.candles[KL_VISIBLE + h - 1].c - u.entry) / atr)
    const koh = nilaiKoherensi(cek, moves)
    kohSum += koh.rasio
    if (koh.cek[0].cocok) benarH3++
    if (koh.skor === 4) skor4++
    else if (koh.skor === 3) skor3++
    else if (koh.skor === 2) skor2++
    else skorRendah++
    if (koh.skor < 4) salah.push(`#${u.num} ${u.fam} truth=${u.truth} skor=${koh.skor} ${koh.cek.map((c) => `h${c.h}:${c.commit}>${c.terwujud}${c.cocok ? '' : 'X'}`).join(' ')}`)
  }
  console.log(`[${ns}] h3 benar ${benarH3}/100 · skor 4:${skor4} 3:${skor3} 2:${skor2} <2:${skorRendah} · koh rata ${((kohSum / 100) * 100).toFixed(2)}%`)
  if (salah.length) console.log('  sisa gagal:\n' + salah.map((s) => '  ' + s).join('\n'))
}

ujiNs('pr100')
ujiNs('pr100b')
ujiNs('pr100c')
