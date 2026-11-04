// ============================================================
// RUNNER UJIAN BULL TRAP 100 — memvonis 100 jebakan + 24 guard,
// menghitung PROFIT per ujian SETELAH fee buy (0.1%) + fee sell
// (0.1%), lalu melaporkan akurasi, profit kumulatif, dan CELAH
// per arketipe (bahan siklus bedah -> upgrade -> uji ulang).
//
// Pakai: bun scripts/ujian_bulltrap100.ts --ns bt100-r1 --versi 1.0 \
//          --tag ronde1-v1 [--dump] [--save research/ujian-bulltrap/r1.json]
// ============================================================

import { forgeBtSuite, forgeBtGuardSuite } from '../src/lib/exam/bulltrap-suite'
import { btNetProfitPct, totalFeePct, BT_SIZE, BT_GUARD_SIZE } from '../src/lib/exam/bulltrap-forge'
import { btVonis, btBaselineMomenNaif, btBaselineSelaluNaik, type BtVision } from '../src/lib/exam/bulltrap-brain'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface Args {
  ns: string
  versi: string
  tag: string
  dump: boolean
  save: string
  guardsOnly: boolean
  trapsOnly: boolean
}

function parseArgs(): Args {
  const a: Args = { ns: 'bt100-r1', versi: '2.0', tag: 'ronde', dump: false, save: '', guardsOnly: false, trapsOnly: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ns') a.ns = argv[++i]
    else if (argv[i] === '--versi') a.versi = argv[++i]
    else if (argv[i] === '--tag') a.tag = argv[++i]
    else if (argv[i] === '--dump') a.dump = true
    else if (argv[i] === '--save') a.save = argv[++i]
    else if (argv[i] === '--guards-only') a.guardsOnly = true
    else if (argv[i] === '--traps-only') a.trapsOnly = true
  }
  return a
}

interface Row {
  num: number
  kind: 'TRAP' | 'GUARD'
  arch: string
  label: string
  diff: string
  vonis: 'NAIK' | 'TURUN'
  truth: 'NAIK' | 'TURUN'
  benar: boolean
  movePct: number
  netProfitPct: number
  score: number
  pelajaran: string[]
  fitur: BtVision
  alasan: string[]
}

function runSuite(exams: ReturnType<typeof forgeBtSuite>, versi: string): Row[] {
  return exams.map((e) => {
    const visible = e.candles.slice(0, 60)
    const vonis = btVonis(visible, versi)
    const net = btNetProfitPct(vonis.arah, e.entry, e.exit)
    return {
      num: e.num,
      kind: e.kind,
      arch: e.arch.id,
      label: e.arch.label,
      diff: e.diff,
      vonis: vonis.arah,
      truth: e.truth,
      benar: vonis.arah === e.truth,
      movePct: e.movePct,
      netProfitPct: net,
      score: vonis.score,
      pelajaran: vonis.pelajaranAktif,
      fitur: vonis.fitur,
      alasan: vonis.alasan,
    }
  })
}

function pct(x: number, d = 2): string {
  return `${x >= 0 ? '+' : ''}${x.toFixed(d)}%`
}

function fiturDump(f: BtVision): string {
  return [
    `dist21=${f.distEma21Atr.toFixed(1)}`, `mom12=${f.mom12Atr.toFixed(1)}`, `mom3=${f.mom3Atr.toFixed(1)}`,
    `net5=${f.netLast5Atr.toFixed(1)}`, `mom24=${f.mom24Atr.toFixed(1)}`, `mom50=${f.mom50Atr.toFixed(1)}`,
    `rsi=${f.rsi.toFixed(0)}`, `volZ=${f.volZ.toFixed(1)}`, `volZBrk=${f.volZBreak.toFixed(1)}`,
    `asym5=${f.volAsym5.toFixed(2)}`, `asymZn=${f.volAsymZone.toFixed(2)}`, `shrink=${f.bodyShrink.toFixed(2)}`,
    `uw=${f.upperWickPct.toFixed(2)}`, `sweptH=${f.sweptHigh ? 1 : 0}`, `divBear=${f.divBear ? 1 : 0}`,
    `posR=${f.posInRange.toFixed(2)}`, `posW=${f.posInWindow60.toFixed(2)}`, `wickCl=${f.wickClusterHigh}`,
    `testCl=${f.testCluster}`, `brkUp=${f.recentBreakUp ? 1 : 0}`, `failRetest=${f.failedRetest ? 1 : 0}`,
    `up=${f.consecutiveUp}`, `dn=${f.consecutiveDown}`,
  ].join(' ')
}

function main(): void {
  const args = parseArgs()
  const feePct = totalFeePct()
  console.log('='.repeat(100))
  console.log(`UJIAN BULL TRAP — MICAPROFITA SAKTI-BT v${args.versi} | ns=${args.ns} | tag=${args.tag}`)
  console.log(`Fee model: buy 0.10% + sell 0.10% = ${feePct.toFixed(2)}% per posisi (WAJIB melebihi ini bila vonis benar)`)
  console.log('='.repeat(100))

  let rows: Row[] = []
  if (!args.guardsOnly) rows = rows.concat(runSuite(forgeBtSuite(args.ns), args.versi))
  if (!args.trapsOnly) rows = rows.concat(runSuite(forgeBtGuardSuite(`${args.ns}-guard`), args.versi))

  const traps = rows.filter((r) => r.kind === 'TRAP')
  const guards = rows.filter((r) => r.kind === 'GUARD')

  // ---- baris per ujian
  console.log('\n--- 100 UJIAN BULL TRAP (semua truth dari data; keputusan hanya boleh melihat 60 candle) ---')
  let cum = 0
  let comp = 1
  for (const r of traps) {
    cum += r.netProfitPct
    comp *= 1 + r.netProfitPct / 100
    const status = r.benar ? 'BENAR' : 'LIQUIDASI'
    console.log(
      `#${String(r.num).padStart(3, '0')} ${r.arch.padEnd(18)} ${r.diff.padEnd(6)} | vonis ${r.vonis.padEnd(5)} | truth ${r.truth.padEnd(5)} | ${status.padEnd(9)} | gerak ${pct(r.movePct, 1)} | fee ${feePct.toFixed(2)}% | net ${pct(r.netProfitPct)} | kum ${pct(cum)}`,
    )
  }

  // ---- ringkasan trap
  const benar = traps.filter((r) => r.benar).length
  const profitable = traps.filter((r) => r.netProfitPct > 0).length
  const totalNet = traps.reduce((s, r) => s + r.netProfitPct, 0)
  const compounded = (comp - 1) * 100
  console.log('\n--- RINGKASAN 100 TRAP ---')
  console.log(`Vonis benar      : ${benar}/${BT_SIZE} (${((benar / BT_SIZE) * 100).toFixed(1)}%)`)
  console.log(`Profit after fee : ${profitable}/${BT_SIZE} ujian positif`)
  console.log(`Total profit     : ${pct(totalNet)} (sederhana) | ${pct(compounded)} (compound)`)
  console.log(`Likuidasi cyborg : ${BT_SIZE - benar} kali`)

  // ---- per arketipe
  const perArch = new Map<string, { n: number; benar: number; net: number }>()
  for (const r of traps) {
    const m = perArch.get(r.arch) ?? { n: 0, benar: 0, net: 0 }
    m.n++
    if (r.benar) m.benar++
    m.net += r.netProfitPct
    perArch.set(r.arch, m)
  }
  console.log('\n--- KEMAMPIAN PER ARKETIPE ---')
  for (const [arch, m] of perArch) {
    console.log(`${arch.padEnd(20)} ${String(m.benar).padStart(2)}/${m.n}  net ${pct(m.net)}`)
  }

  // ---- guard
  if (guards.length) {
    const gBenar = guards.filter((r) => r.benar).length
    const gNet = guards.reduce((s, r) => s + r.netProfitPct, 0)
    console.log(`\n--- GUARD ANTI-BIAS (${BT_GUARD_SIZE} grafik SEHAT, truth NAIK) ---`)
    for (const r of guards) {
      console.log(
        `G${String(r.num).padStart(2, '0')} ${r.arch.padEnd(16)} ${r.diff.padEnd(6)} | vonis ${r.vonis.padEnd(5)} | ${r.benar ? 'BENAR' : 'BUTA-BEDA  '} | net ${pct(r.netProfitPct)}`,
      )
    }
    console.log(`Guard benar: ${gBenar}/${BT_GUARD_SIZE} | net ${pct(gNet)}`)
  }

  // ---- bedah kegagalan
  const gagal = traps.filter((r) => !r.benar)
  const guardGagal = guards.filter((r) => !r.benar)
  if (gagal.length || guardGagal.length) {
    console.log('\n--- BEDAH CELAH (point-in-time facts saat keputusan) ---')
    for (const r of [...gagal, ...guardGagal]) {
      console.log(`#${String(r.num).padStart(3, '0')} ${r.arch} ${r.diff} | vonis ${r.vonis} vs truth ${r.truth} | score ${r.score.toFixed(2)}`)
      console.log(`   fitur: ${fiturDump(r.fitur)}`)
      console.log(`   alasan: ${r.alasan.join(' || ') || '-'}`)
    }
  } else {
    console.log('\n--- BEDAH CELAH ---')
    console.log('TIDAK ADA KEGAGALAN — 100/100 trap + semua guard benar.')
  }

  // ---- baseline
  const trapExams = forgeBtSuite(args.ns)
  const bNaik = trapExams.filter((e) => btBaselineSelaluNaik(e.candles.slice(0, 60)) === e.truth).length
  const bMomen = trapExams.filter((e) => btBaselineMomenNaif(e.candles.slice(0, 60)) === e.truth).length
  console.log(`\nBaseline (pembanding jujur): selalu-NAIK ${bNaik}/100 | momen-naif ${bMomen}/100`)

  // ---- simpan bukti
  if (args.save) {
    const dir = args.save.substring(0, args.save.lastIndexOf('/'))
    if (dir) mkdirSync(dir, { recursive: true })
    const evidence = {
      tag: args.tag,
      ns: args.ns,
      versi: args.versi,
      feeModel: { buy: 0.001, sell: 0.001 },
      ringkasan: {
        trapBenar: benar, trapTotal: BT_SIZE, trapProfitable: profitable,
        totalNetPct: totalNet, compoundedPct: compounded,
        guardBenar: guards.filter((r) => r.benar).length, guardTotal: guards.length,
        baselineSelaluNaik: bNaik, baselineMomenNaif: bMomen,
      },
      perArketipe: Array.from(perArch.entries()).map(([arch, m]) => ({ arch, ...m })),
      rows: rows.map((r) => ({
        num: r.num, kind: r.kind, arch: r.arch, diff: r.diff, vonis: r.vonis, truth: r.truth,
        benar: r.benar, movePct: r.movePct, netProfitPct: r.netProfitPct, score: r.score,
        pelajaran: r.pelajaran, alasan: r.alasan,
        fitur: {
          distEma21Atr: r.fitur.distEma21Atr, mom12Atr: r.fitur.mom12Atr, mom3Atr: r.fitur.mom3Atr,
          netLast5Atr: r.fitur.netLast5Atr, mom24Atr: r.fitur.mom24Atr, mom50Atr: r.fitur.mom50Atr,
          rsi: r.fitur.rsi, volZ: r.fitur.volZ, volZBreak: r.fitur.volZBreak, volAsym5: r.fitur.volAsym5,
          volAsymZone: r.fitur.volAsymZone, bodyShrink: r.fitur.bodyShrink, upperWickPct: r.fitur.upperWickPct,
          sweptHigh: r.fitur.sweptHigh, divBear: r.fitur.divBear, posInRange: r.fitur.posInRange,
          posInWindow60: r.fitur.posInWindow60, wickClusterHigh: r.fitur.wickClusterHigh,
          testCluster: r.fitur.testCluster, recentBreakUp: r.fitur.recentBreakUp,
          failedRetest: r.fitur.failedRetest, consecutiveUp: r.fitur.consecutiveUp,
          consecutiveDown: r.fitur.consecutiveDown,
        },
      })),
    }
    writeFileSync(args.save, JSON.stringify(evidence, null, 1))
    console.log(`\nBukti tersimpan: ${args.save}`)
  }

  console.log('='.repeat(100))
}

main()
