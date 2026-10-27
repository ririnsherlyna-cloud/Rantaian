// DIAGNOSTIK: distribusi rezim + rata-rata faktor per arketipe (benar vs salah)
import { generateSuite } from '../src/lib/exam/generator'
import { MICAPROFITA } from '../src/lib/exam/contestants'

const suite = generateSuite('A')
const agg = new Map<string, { n: number; regimes: Map<string, number>; fx: Record<string, { ok: number; bad: number; nOk: number; nBad: number }> }>()
const KEYS = ['tren', 'mom', 'rev', 'struct', 'sq', 'exh', 'trap', 'dev', 'vol']
for (const t of suite) {
  const visible = t.candles.slice(0, 144)
  const p = MICAPROFITA.predict(visible, t)
  const a = agg.get(t.arch.id) ?? { n: 0, regimes: new Map(), fx: {} }
  a.n++
  a.regimes.set(p.regime, (a.regimes.get(p.regime) ?? 0) + 1)
  const ok = p.dir === t.label
  for (const f of p.factors) {
    a.fx[f.key] ??= { ok: 0, bad: 0, nOk: 0, nBad: 0 }
    if (ok) {
      a.fx[f.key].ok += f.value * f.weight
      a.fx[f.key].nOk++
    } else {
      a.fx[f.key].bad += f.value * f.weight
      a.fx[f.key].nBad++
    }
  }
  agg.set(t.arch.id, a)
}
for (const [id, a] of agg) {
  const regimes = [...a.regimes.entries()].map(([k, v]) => `${k}:${v}`).join(', ')
  console.log(`\n== ${id} (n=${a.n}) rezim: ${regimes}`)
  const parts = KEYS.filter((k) => a.fx[k])
    .map((k) => {
      const f = a.fx[k]
      const mOk = f.nOk ? f.ok / f.nOk : 0
      const mBad = f.nBad ? f.bad / f.nBad : 0
      return `${k}: ok${mOk >= 0 ? '+' : ''}${mOk.toFixed(2)}/salah${mBad >= 0 ? '+' : ''}${mBad.toFixed(2)}`
    })
  console.log('   ' + parts.join('  '))
}
