// BEDAH KEGAGALAN h3 — ronde 1 pra-registrasi.
// Pertanyaan: fitur visible apa yang membedakan 20 skenario
// "h3-berlawanan" dari 80 skenario "h3-searah"?
// DILARANG memakai fam/seed sbg fitur (look-ahead) — hanya
// keluaran otak dari 60 candle visible.
import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'

const gagal = new Set([61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90])
const exams = forgeKlSuite('pr100')

// kontrol: 20 skenario pertama yang lulus 4/4 (fam lain)
const lulus4: number[] = []
const rows: string[] = []
for (const u of exams) {
  const visible = u.candles.slice(0, KL_VISIBLE)
  const v = arahVonis(visible)
  const atr = Math.max(buildSgVision(visible).atr, 1e-9)
  const h3 = (u.candles[KL_VISIBLE + 2].c - u.entry) / atr
  const lastClose = visible[visible.length - 1].c
  const trig = v.eksekusi.triggerLevel
  const arahKeTrig = trig == null ? '—' : trig > lastClose ? 'NAIK' : trig < lastClose ? 'TURUN' : 'DI-TEMPAT'
  const isGagal = gagal.has(u.num)
  if (!isGagal && lulus4.length < 20) lulus4.push(u.num)
  if (isGagal || lulus4.includes(u.num)) {
    rows.push([
      isGagal ? 'GAGAL' : 'OK   ',
      `#${String(u.num).padStart(3)}`,
      u.fam.padEnd(15),
      `truth=${u.truth.padEnd(5)}`,
      `aksi=${v.eksekusi.aksi.padEnd(7)}`,
      `arah=${v.arah.padEnd(5)}`,
      `trig=${trig == null ? 'null   ' : arahKeTrig.padEnd(8)}`,
      `lapisan=${v.lapisan.padEnd(14)}`,
      `pool=${v.kl.poolSide.padEnd(9)}/swept=${v.kl.poolSwept ? 1 : 0}`,
      `klAksi=${v.kl.aksi.padEnd(8)}`,
      `grab=${(v as unknown as { kl: { grab?: string } }).kl.grab ?? '—'}`,
      `h3move=${h3.toFixed(2)}`,
    ].join(' '))
  }
}
console.log(rows.join('\n'))
