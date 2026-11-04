// DEBUG: bedah prediksi per-ujian untuk arketipe lemah
import { generateSuite } from '../src/lib/exam/generator'
import { MICAPROFITA } from '../src/lib/exam/contestants'

const suite = generateSuite('A')
const targets = new Set(['konsolidasi', 'parabolik', 'pump-dump', 'osilasi', 'distribusi'])
for (const t of suite) {
  if (!targets.has(t.arch.id)) continue
  const visible = t.candles.slice(0, 144)
  const p = MICAPROFITA.predict(visible, t)
  const ret24 = t.outcomeRet * 100
  console.log(
    `${t.id} ${t.arch.id.padEnd(12)} label=${t.label.padEnd(5)} ret24=${ret24.toFixed(1).padStart(6)}%  pred=${p.dir.padEnd(5)} conf=${(p.conf * 100).toFixed(0)}%  rezim=${p.regime.padEnd(18)} score=${p.score.toFixed(2)}`,
  )
  console.log(
    '    faktor: ' +
      p.factors.map((f) => `${f.key}=${f.value.toFixed(2)}(w${f.weight})`).join(' '),
  )
}
