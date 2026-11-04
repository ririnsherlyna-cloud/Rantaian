// BEDAH h3 RONDE 5 — ATURAN GEOMETRI TANDA (satu hukum, tanpa
// melihat fam/aksi/recl secara terpisah):
//   d = jarak BERTANDA close terakhir ke level pool aktif (ATR),
//       positif = di atas level, negatif = di bawah.
//   pool BAWAH (setup panjang): harga DI ATAS level = sisi aman.
//   pool ATAS  (setup pendek): harga DI BAWAH level = sisi aman.
//   Hukum kandidat:
//     - harga MELAMPAUI level ke sisi sapuan (d<0 utk BAWAH,
//       d>0 utk ATAS)            -> kelanjutan langsung (h3=ARAH)
//     - harga di sisi aman TAPI masih menempel (|sisi aman| < θ)
//       -> pantulan/umpan terakhir dulu (h3=UMPAN)
//     - harga di sisi aman JAUH (>= θ) -> kelanjutan (h3=ARAH)
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { nilaiKoherensi } from '../src/lib/exam/prareg'
import type { FaseCek } from '../src/lib/exam/prareg'

function uji(ns: string, theta: number, cetakSalah: boolean): { b3: number; s4: number; koh: number } {
  const exams = forgeKlSuite(ns)
  let b3 = 0, s4 = 0, kohSum = 0
  const salah: string[] = []
  for (const u of exams) {
    const visible = u.candles.slice(0, KL_VISIBLE)
    const v = klVonis(visible)
    const atr = Math.max(buildSgVision(visible).atr, 1e-9)
    const d = v.pool.side === 'TAK-JELAS' ? null : (visible[59].c - v.pool.level) / atr
    const fArah: FaseCek = v.arah === 'NAIK' ? 'NAIK' : 'TURUN'
    const fUmpan: FaseCek = v.arah === 'NAIK' ? 'TURUN' : 'NAIK'
    // sisi aman utk pool BAWAH = d>0; utk pool ATAS = d<0
    const amanTerkini = d !== null && (
      (v.pool.side === 'BAWAH' && d > 0 && d < theta) ||
      (v.pool.side === 'ATAS' && d < 0 && -d < theta)
    )
    const flip = amanTerkini
    const cek: [FaseCek, FaseCek, FaseCek, FaseCek] = flip ? [fUmpan, fArah, fArah, fArah] : [fArah, fArah, fArah, fArah]
    const moves = [3, 7, 11, 14].map((h) => (u.candles[KL_VISIBLE + h - 1].c - u.entry) / atr)
    const koh = nilaiKoherensi(cek, moves)
    kohSum += koh.rasio
    if (koh.cek[0].cocok) b3++
    if (koh.skor === 4) s4++
    if (koh.skor < 4 && cetakSalah) {
      const h3 = moves[0]
      salah.push(`#${String(u.num).padStart(3)} ${u.fam.padEnd(14)} truth=${u.truth.padEnd(5)} d=${d === null ? 'null' : d.toFixed(2).padStart(5)} flip=${flip ? 1 : 0} h3=${h3 >= 0.15 ? 'NAIK ' : h3 <= -0.15 ? 'TURUN' : 'DATAR'} skor=${koh.skor}`)
    }
  }
  return { b3, s4, koh: kohSum / 100 }
}

for (const theta of [0.5, 0.8, 1.0, 1.2]) {
  console.log(`--- θ=${theta} ---`)
  for (const ns of ['pr100', 'pr100b', 'pr100c']) {
    const r = uji(ns, theta, false)
    console.log(`  [${ns}] h3 benar ${r.b3}/100 · skor-4 ${r.s4}/100 · koh ${((r.koh) * 100).toFixed(2)}%`)
  }
}
console.log('\n--- rincian salah θ=0.8 ---')
for (const ns of ['pr100', 'pr100b', 'pr100c']) {
  console.log(`[${ns}]`)
  uji(ns, 0.8, true).s4
  const exams = forgeKlSuite(ns)
  void exams
}
