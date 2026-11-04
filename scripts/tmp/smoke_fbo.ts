import { forgeFboSuite, forgeFboGuardSuite } from '../../src/lib/exam/fbo-suite'
const suite = forgeFboSuite('fbo100')
const guards = forgeFboGuardSuite('fbo100')
const byFam = new Map<string, { n: number; ok: number; move: number; mfe: number; bait: number; punish: number }>()
for (const e of suite) {
  const b = byFam.get(e.fam) ?? { n: 0, ok: 0, move: 0, mfe: 0, bait: 0, punish: 0 }
  b.n++
  if (!e.noiseFlipped) b.ok++
  b.move += e.movePct; b.mfe += e.mfePct; b.bait += e.baitMfePct
  if (e.earlyFadeStopped) b.punish++
  byFam.set(e.fam, b)
}
console.log('FAM | n | gate-ok | avg move | avg mfe | avg baitMfe | punish-earlyfade')
for (const [k, b] of byFam) console.log(`${k.padEnd(18)} n=${String(b.n).padStart(2)} gate=${String(b.ok).padStart(2)} move=${(b.move / b.n).toFixed(2)} mfe=${(b.mfe / b.n).toFixed(2)} baitMfe=${(b.bait / b.n).toFixed(2)} punish=${b.punish}`)
const gok = guards.filter((g) => !g.noiseFlipped).length
console.log(`GUARDS: ${gok}/24 noiseFlipped; baits:`, guards.map((g) => g.baitMfePct.toFixed(1)).join(','))
const bad = suite.filter((e) => e.noiseFlipped)
console.log('noiseFlipped:', bad.length, bad.slice(0, 8).map((e) => `#${e.num} ${e.fam}/${e.diff} m=${e.movePct.toFixed(2)} mfe=${e.mfePct.toFixed(2)} bait=${e.baitMfePct.toFixed(2)}`).join(' | '))
