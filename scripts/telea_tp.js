// TELAAH TP — kenapa TP sekarang kecil? Bandingkan distribusi targetPct
// hari hidup vs hari-hari lampau (era 20%–73%).
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

function evOf(p) {
  try {
    const e = JSON.parse(p.evidence || '{}')
    const r = e.rencana || {}
    return {
      sym: p.symbol, dir: p.direction, conf: p.confidence,
      targetPct: r.targetPct ?? null, ambisiusPct: r.ambisiusPct ?? null,
      pTarget: r.pTarget ?? null, pAmbisius: r.pAmbisius ?? null,
      sumber: r.sumberTarget ?? null, mediana: r.targetMediana ?? null,
      sigma: e.warisan?.sigma24jPct ?? null,
      net: r.netUntungPct ?? null,
    }
  } catch { return null }
}

function stat(arr) {
  const a = arr.filter((x) => x !== null).sort((x, y) => x - y)
  if (!a.length) return { n: 0 }
  const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))]
  return {
    n: a.length,
    min: +a[0].toFixed(2), max: +a[a.length - 1].toFixed(2),
    med: +q(0.5).toFixed(2), rata: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2),
    p90: +q(0.9).toFixed(2),
    gt5: a.filter((x) => x > 5).length, gt20: a.filter((x) => x > 20).length,
    lt2: a.filter((x) => x <= 2).length,
  }
}

async function main() {
  const days = await db.battleDay.findMany({ orderBy: { day: 'desc' }, take: 70 })
  console.log(`total BattleDay terakhir diambil: ${days.length}`)
  const perDay = []
  for (const d of days) {
    const picks = await db.pick.findMany({ where: { battleDayId: d.id } })
    const evs = picks.map(evOf).filter(Boolean)
    const tp = evs.map((e) => e.targetPct)
    const amb = evs.map((e) => e.ambisiusPct)
    const sg = evs.map((e) => e.sigma)
    perDay.push({
      day: d.day, status: d.status, n: evs.length,
      tp: stat(tp), amb: stat(amb),
      sigmaMed: stat(sg).med ?? null,
      sumberTop: (() => { const m = {}; evs.forEach((e) => { if (e.sumber) m[e.sumber] = (m[e.sumber] || 0) + 1 }); const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 2); return top.map(([k, v]) => `${k}×${v}`).join(' | ') })(),
      medianaN: evs.filter((e) => e.mediana).length,
    })
  }
  console.log('\n=== PER HARI (terbaru dulu) ===')
  for (const d of perDay) {
    if (!d.tp || d.tp.n === 0) { console.log(`${d.day} [${d.status}] n=0`); continue }
    console.log(
      `${d.day} [${d.status}] n=${d.tp.n} · TP med=${d.tp.med} rata=${d.tp.rata} max=${d.tp.max} min=${d.tp.min} · >5%:${d.tp.gt5} >20%:${d.tp.gt20} ≤2%:${d.tp.lt2}` +
      ` · AMBISIUS med=${d.amb.med} max=${d.amb.max}` +
      ` · σ24j med=${d.sigmaMed} · mediana:${d.medianaN}`
    )
    if (d.sumberTop) console.log(`    sumber: ${d.sumberTop}`)
  }
  //Detail hari hidup
  const hidup = perDay[0]
  if (hidup) {
    const d0 = days[0]
    const picks = await db.pick.findMany({ where: { battleDayId: d0.id }, orderBy: { confidence: 'desc' }, take: 12 })
    console.log(`\n=== DETAIL ${d0.day} (12 pick teratas) ===`)
    for (const p of picks) {
      const e = evOf(p); if (!e) continue
      console.log(`${p.symbol.padEnd(14)} ${e.dir} conf=${String(e.conf).padStart(3)} TP=${e.targetPct}% p=${e.pTarget} [${e.sumber}] σ24j=${e.sigma}% AMB=${e.ambisiusPct}% pA=${e.pAmbisius}`)
    }
  }
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
