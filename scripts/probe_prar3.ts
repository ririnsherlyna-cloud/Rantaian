// BEDAH h3 RONDE 3 — uji kandidat aturan v1.2:
//   flip h3 = UMPAN IFF salah satu:
//   (a) momentum akhir (net 3 candle terakhir, ATR) BERLAWANAN arah
//       vonis  → umpan sedang menyala (cont-absorb)
//   (b) eksekusi WAIT + pool RECLAIMED segar → retest-ganda tertunda
//       (wait-double)
//   selain itu h3 = arah vonis.
// Cetak semua fitur utk verifikasi manual + hitung akurasi kandidat.
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { nilaiKoherensi } from '../src/lib/exam/prareg'
import type { FaseCek } from '../src/lib/exam/prareg'

function ujiNs(ns: string, cetakSemua: boolean): void {
  const exams = forgeKlSuite(ns)
  let b3 = 0, s4 = 0, kohSum = 0
  const detail: string[] = []
  for (const u of exams) {
    const visible = u.candles.slice(0, KL_VISIBLE)
    const v = arahVonis(visible)
    const kl = klVonis(visible)
    const atr = Math.max(buildSgVision(visible).atr, 1e-9)
    const n = visible.length
    const c = visible.map((x) => x.c)
    const m1 = (c[n - 1] - visible[n - 1].o) / atr // badan candle terakhir
    const m3 = (c[n - 1] - c[n - 4]) / atr // net 3 candle terakhir
    const h3 = (u.candles[KL_VISIBLE + 2].c - u.entry) / atr
    const fArah: FaseCek = v.arah === 'NAIK' ? 'NAIK' : 'TURUN'
    const fUmpan: FaseCek = v.arah === 'NAIK' ? 'TURUN' : 'NAIK'
    const momLawan = (v.arah === 'NAIK' && m3 < -0.15) || (v.arah === 'TURUN' && m3 > 0.15)
    const flip = momLawan || (v.eksekusi.aksi === 'WAIT' && kl.pool.reclaimed)
    const cek: [FaseCek, FaseCek, FaseCek, FaseCek] = flip ? [fUmpan, fArah, fArah, fArah] : [fArah, fArah, fArah, fArah]
    const moves = [3, 7, 11, 14].map((h) => (u.candles[KL_VISIBLE + h - 1].c - u.entry) / atr)
    const koh = nilaiKoherensi(cek, moves)
    kohSum += koh.rasio
    if (koh.cek[0].cocok) b3++
    if (koh.skor === 4) s4++
    const h3Real = Math.abs(h3) < 0.15 ? 'DATAR' : h3 > 0 ? 'NAIK' : 'TURUN'
    if (!koh.cek[0].cocok || cetakSemua) {
      detail.push([
        `#${String(u.num).padStart(3)}`, u.fam.padEnd(14), `truth=${u.truth.padEnd(5)}`,
        `arah=${v.arah.padEnd(5)}`, `aksi=${v.eksekusi.aksi.padEnd(6)}`,
        `recl=${kl.pool.reclaimed ? 1 : 0}`, `bs=${String(kl.pool.barsSince).padStart(2)}`,
        `m1=${m1.toFixed(2)}`, `m3=${m3.toFixed(2)}`,
        `momLawan=${momLawan ? 1 : 0}`, `flip=${flip ? 1 : 0}`,
        `h3=${h3Real.padEnd(5)}`, koh.cek[0].cocok ? 'OK' : 'SALAH',
      ].join(' '))
    }
  }
  console.log(`[${ns}] h3 benar ${b3}/100 · skor-4 ${s4}/100 · koh rata ${((kohSum / 100) * 100).toFixed(2)}%`)
  if (detail.length) console.log(detail.join('\n'))
}

console.log('=== pr100 (set ronde 1) — hanya salah ===')
ujiNs('pr100', false)
console.log('\n=== pr100b (segar) — hanya salah ===')
ujiNs('pr100b', false)
console.log('\n=== pr100c (segar) — hanya salah ===')
ujiNs('pr100c', false)
