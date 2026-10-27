// ============================================================
// RUNNER UJIAN BEAR TRAP 100 — memvonis 100 jebakan + 24 guard,
// menyusun RENCANA TRADE (arah + entry + target), mensimulasikan
// eksekusi horizon, lalu mencatat per ujian:
//   entry, exit, fee buy, fee sell, gross P/L, NET P/L (fee buy +
//   fee sell dihitung WAJIB), persentase return, berhasil/gagal,
//   dan ALASAN keputusan otak.
// Profit kotor TIDAK PERNAH dipakai sebagai hasil akhir.
//
// Pakai: bun scripts/ujian_beartrap100.ts --ns sr100 --versi 2.0 \
//          --tag ronde1 [--dump] [--save research/ujian-beartrap/r1.json]
// ============================================================

import { forgeSrSuite, forgeSrGuardSuite } from '../src/lib/exam/beartrap-suite'
import { simulasiTrade, totalFeePct, SR_SIZE, SR_GUARD_SIZE, SR_VISIBLE, type FeeLedger } from '../src/lib/exam/beartrap-forge'
import { srVonis, srBaselineMomenNaif, srBaselineSelaluTurun, type SrVision } from '../src/lib/exam/beartrap-brain'
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
  const a: Args = { ns: 'sr100', versi: '2.0', tag: 'ronde', dump: false, save: '', guardsOnly: false, trapsOnly: false }
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
  ledger: FeeLedger
  movePct: number
  mfePct: number
  score: number
  pelajaran: string[]
  fitur: SrVision
  alasan: string[]
}

function runSuite(exams: ReturnType<typeof forgeSrSuite>, versi: string): Row[] {
  return exams.map((e) => {
    const visible = e.candles.slice(0, SR_VISIBLE)
    const vonis = srVonis(visible, versi)
    const horizon = e.candles.slice(SR_VISIBLE)
    const ledger = simulasiTrade(vonis.arah, vonis.entry, vonis.targetPct, horizon)
    return {
      num: e.num,
      kind: e.kind,
      arch: e.arch.id,
      label: e.arch.label,
      diff: e.diff,
      vonis: vonis.arah,
      truth: e.truth,
      benar: vonis.arah === e.truth,
      ledger,
      movePct: e.movePct,
      mfePct: e.mfePct,
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

function fiturDump(f: SrVision): string {
  return [
    `dist21=${f.distEma21Atr.toFixed(1)}`, `mom12=${f.mom12Atr.toFixed(1)}`, `mom3=${f.mom3Atr.toFixed(1)}`,
    `net5=${f.netLast5Atr.toFixed(1)}`, `mom24=${f.mom24Atr.toFixed(1)}`, `mom50=${f.mom50Atr.toFixed(1)}`,
    `rsi=${f.rsi.toFixed(0)}`, `volZ=${f.volZ.toFixed(1)}`, `volZBrk=${f.volZBreak.toFixed(1)}`, `zonaR=${f.volZoneRatio.toFixed(2)}`,
    `asym5=${f.volAsym5.toFixed(2)}`, `asymZn=${f.volAsymZone.toFixed(2)}`, `asymZn20=${f.volAsymZone20.toFixed(2)}`,
    `shrink=${f.bodyShrink.toFixed(2)}`, `lw=${f.lowerWickPct.toFixed(2)}`, `sweptL=${f.sweptLow ? 1 : 0}`,
    `divBull=${f.divBull ? 1 : 0}`, `posR=${f.posInRange.toFixed(2)}`, `posW=${f.posInWindow60.toFixed(2)}`,
    `wickCl=${f.wickClusterLow}`, `testCl=${f.testClusterLow}`, `brkDn=${f.recentBreakDown ? 1 : 0}`,
    `failRetest=${f.failedRetest ? 1 : 0}`, `up=${f.consecutiveUp}`, `dn=${f.consecutiveDown}`,
  ].join(' ')
}

function main(): void {
  const args = parseArgs()
  const feePct = totalFeePct()
  console.log('='.repeat(110))
  console.log(`UJIAN BEAR TRAP — MICAPROFITA SAKTI-SR v${args.versi} | ns=${args.ns} | tag=${args.tag}`)
  console.log(`Fee model: buy 0.10% + sell 0.10% = ${feePct.toFixed(2)}% per posisi — HASIL AKHIR SELALU NET (profit kotor tidak dipakai)`)
  console.log('='.repeat(110))

  let rows: Row[] = []
  if (!args.guardsOnly) rows = rows.concat(runSuite(forgeSrSuite(args.ns), args.versi))
  if (!args.trapsOnly) rows = rows.concat(runSuite(forgeSrGuardSuite(`${args.ns}-guard`), args.versi))

  const traps = rows.filter((r) => r.kind === 'TRAP')
  const guards = rows.filter((r) => r.kind === 'GUARD')

  // ---- LEDGER PER UJIAN: entry, exit, fee, gross, net, return, hasil, alasan
  console.log('\n--- 100 UJIAN BEAR TRAP (truth dari data; keputusan hanya boleh melihat 60 candle) ---')
  let cum = 0
  let comp = 1
  for (const r of traps) {
    const L = r.ledger
    cum += L.netPct
    comp *= 1 + L.netPct / 100
    const status = L.netPct > 0 ? 'BERHASIL' : 'GAGAL'
    const hit = L.targetHit ? `hit@c${L.hitCandle}` : 'no-hit(end)'
    console.log(
      `#${String(r.num).padStart(3, '0')} ${r.arch.padEnd(21)} ${r.diff.padEnd(6)} | ${r.vonis.padEnd(5)} tgt ${pct(r.ledger.target - r.ledger.entry === 0 ? 0 : ((r.ledger.target / r.ledger.entry) - 1) * 100 * (r.vonis === 'NAIK' ? 1 : -1), 1)} | entry ${L.entry.toFixed(2)} exit ${L.exit.toFixed(2)} (${hit}) | feeB ${L.feeBuy.toFixed(3)} feeS ${L.feeSell.toFixed(3)} | gross ${pct(L.grossPct, 2)} | NET ${pct(L.netPct, 2)} | kum ${pct(cum)} | ${status}`,
    )
  }

  // ---- ringkasan
  const benar = traps.filter((r) => r.benar).length
  const profitable = traps.filter((r) => r.ledger.netPct > 0).length
  const totalNet = traps.reduce((s, r) => s + r.ledger.netPct, 0)
  const compounded = (comp - 1) * 100
  const totalFee = traps.reduce((s, r) => s + ((r.ledger.feeBuy + r.ledger.feeSell) / r.ledger.entry) * 100, 0)
  const hitCount = traps.filter((r) => r.ledger.targetHit).length
  console.log('\n--- RINGKASAN 100 TRAP ---')
  console.log(`Vonis benar      : ${benar}/${SR_SIZE} (${((benar / SR_SIZE) * 100).toFixed(1)}%)`)
  console.log(`Net profit > 0   : ${profitable}/${SR_SIZE} ujian (setelah fee buy + fee sell)`)
  console.log(`Target tersentuh : ${hitCount}/${benar} dari vonis benar`)
  console.log(`Total fee dibayar: ${pct(totalFee)} (akumulasi fee buy + fee sell)`)
  console.log(`Total NET profit : ${pct(totalNet)} (sederhana) | ${pct(compounded)} (compound)`)
  console.log(`Likuidasi cyborg : ${SR_SIZE - benar} kali`)

  // ---- per arketipe
  const perArch = new Map<string, { n: number; benar: number; net: number; hit: number }>()
  for (const r of traps) {
    const m = perArch.get(r.arch) ?? { n: 0, benar: 0, net: 0, hit: 0 }
    m.n++
    if (r.benar) m.benar++
    if (r.ledger.targetHit) m.hit++
    m.net += r.ledger.netPct
    perArch.set(r.arch, m)
  }
  console.log('\n--- KEMAMPUAN PER ARKETIPE ---')
  for (const [arch, m] of perArch) {
    console.log(`${arch.padEnd(23)} ${String(m.benar).padStart(2)}/${m.n}  target-hit ${String(m.hit).padStart(2)}/${m.n}  net ${pct(m.net)}`)
  }

  // ---- guard
  if (guards.length) {
    const gBenar = guards.filter((r) => r.benar).length
    const gNet = guards.reduce((s, r) => s + r.ledger.netPct, 0)
    console.log(`\n--- GUARD ANTI-BIAS (${SR_GUARD_SIZE} grafik SEHAT, truth TURUN) ---`)
    for (const r of guards) {
      const L = r.ledger
      console.log(
        `G${String(r.num).padStart(2, '0')} ${r.arch.padEnd(19)} ${r.diff.padEnd(6)} | vonis ${r.vonis.padEnd(5)} | ${r.benar ? 'BENAR' : 'BUTA-BEDA  '} | entry ${L.entry.toFixed(2)} exit ${L.exit.toFixed(2)} | NET ${pct(L.netPct)} | ${L.netPct > 0 ? 'PROFIT' : 'RUGI'}`,
      )
    }
    console.log(`Guard benar: ${gBenar}/${SR_GUARD_SIZE} | net ${pct(gNet)}`)
  }

  // ---- bedah kegagalan
  const gagal = traps.filter((r) => !r.benar)
  const guardGagal = guards.filter((r) => !r.benar)
  if (gagal.length || guardGagal.length) {
    console.log('\n--- BEDAH CELAH (fakta point-in-time saat keputusan) ---')
    for (const r of [...gagal, ...guardGagal]) {
      console.log(`#${String(r.num).padStart(3, '0')} ${r.arch} ${r.diff} | vonis ${r.vonis} vs truth ${r.truth} | score ${r.score.toFixed(2)} | net ${pct(r.ledger.netPct)}`)
      console.log(`   fitur: ${fiturDump(r.fitur)}`)
      console.log(`   alasan: ${r.alasan.join(' || ') || '-'}`)
    }
  } else {
    console.log('\n--- BEDAH CELAH ---')
    console.log('TIDAK ADA KEGAGALAN — 100/100 trap + semua guard benar, semua net profit.')
  }

  // ---- baseline
  const trapExams = forgeSrSuite(args.ns)
  const bTurun = trapExams.filter((e) => srBaselineSelaluTurun(e.candles.slice(0, SR_VISIBLE)) === e.truth).length
  const bMomen = trapExams.filter((e) => srBaselineMomenNaif(e.candles.slice(0, SR_VISIBLE)) === e.truth).length
  console.log(`\nBaseline (pembanding jujur): selalu-TURUN ${bTurun}/100 | momen-naif ${bMomen}/100`)

  // ---- contoh ALASAN lengkap (10 pertama) bila --dump
  if (args.dump) {
    console.log('\n--- SAMPEL ALASAN KEPUTUSAN (10 ujian pertama) ---')
    for (const r of traps.slice(0, 10)) {
      console.log(`#${String(r.num).padStart(3, '0')} ${r.label} [${r.diff}] -> ${r.vonis} (target ${pct(((r.ledger.target / r.ledger.entry) - 1) * 100 * (r.vonis === 'NAIK' ? 1 : -1), 1)})`)
      for (const a of r.alasan) console.log(`   - ${a}`)
    }
  }

  // ---- simpan bukti
  if (args.save) {
    const dir = args.save.substring(0, args.save.lastIndexOf('/'))
    if (dir) mkdirSync(dir, { recursive: true })
    const evidence = {
      tag: args.tag,
      ns: args.ns,
      versi: args.versi,
      feeModel: { buy: 0.001, sell: 0.001, keterangan: 'net profit wajib, gross tidak dipakai sebagai hasil akhir' },
      ringkasan: {
        trapBenar: benar, trapTotal: SR_SIZE, trapProfitable: profitable,
        targetHit: hitCount, totalFeePct: totalFee,
        totalNetPct: totalNet, compoundedPct: compounded,
        guardBenar: guards.filter((r) => r.benar).length, guardTotal: guards.length,
        baselineSelaluTurun: bTurun, baselineMomenNaif: bMomen,
      },
      perArketipe: Array.from(perArch.entries()).map(([arch, m]) => ({ arch, ...m })),
      rows: rows.map((r) => ({
        num: r.num, kind: r.kind, arch: r.arch, label: r.label, diff: r.diff,
        vonis: r.vonis, truth: r.truth, benar: r.benar,
        entry: r.ledger.entry, exit: r.ledger.exit, target: r.ledger.target,
        targetHit: r.ledger.targetHit, hitCandle: r.ledger.hitCandle,
        feeBuy: r.ledger.feeBuy, feeSell: r.ledger.feeSell,
        grossPct: r.ledger.grossPct, netPct: r.ledger.netPct, returnPct: r.ledger.netPct,
        berhasil: r.ledger.berhasil, movePct: r.movePct, mfePct: r.mfePct,
        score: r.score, pelajaran: r.pelajaran, alasan: r.alasan,
      })),
    }
    writeFileSync(args.save, JSON.stringify(evidence, null, 1))
    console.log(`\nBukti tersimpan: ${args.save}`)
  }

  console.log('='.repeat(110))
  void join
}

main()
