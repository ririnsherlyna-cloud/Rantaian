// ============================================================
// RUNNER UJIAN FALSE BREAKOUT — 100 ujian FBO + 24 guard.
//
// Otak memvonis ENTRY / WAIT (trigger close-back, maks 8
// candle) / SKIP + STOP WAJIB (bisa DILIKUIDASI). Setiap ujian
// dicatat (12 field wajib Guru):
//   1. Entry price            7. Persentase return
//   2. Exit price             8. Hasil berhasil/gagal
//   3. Fee buy                9. Alasan keputusan AGI
//   4. Fee sell              10. Level S/R yang dianalisis
//   5. Gross profit/loss     11. Sinyal false breakout
//   6. NET profit/loss       12. Konfirmasi sebelum entry
//   (hasil akhir SELALU NET — profit kotor tidak pernah dipakai;
//    fee buy 0.1% + fee sell 0.1% WAJIB dihitung)
//
// Penilaian KETAT: hanya trade tereksekusi dgn NET > 0 tanpa
// stop tersentuh = BERHASIL. NO-TRADE pada ujian FBO tergerbang
// (semua memuat false breakout yang layak-ditransaksi) = GAGAL
// (KELEWAT-PELUANG) — disiplin menunggu diuji lewat WAIT yang
// menyala, bukan lewat skip.
//
// Pakai: bun scripts/ujian_fbo100.ts --ns fbo100 --versi 1.0 \
//          --tag ronde1 [--save r1.json] [--gagal-saja]
// ============================================================

import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, simBaitFbo, totalFeePct, FBO_VISIBLE, type FboLedger, type FboExam } from '../src/lib/exam/fbo-forge'
import { fbVonis, type FboKeputusan } from '../src/lib/exam/fbo-brain'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface Args { ns: string; versi: string; tag: string; save: string; gagalSaja: boolean }

function parseArgs(): Args {
  const a: Args = { ns: 'fbo100', versi: '1.0', tag: 'ronde', save: '', gagalSaja: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ns') a.ns = argv[++i]
    else if (argv[i] === '--versi') a.versi = argv[++i]
    else if (argv[i] === '--tag') a.tag = argv[++i]
    else if (argv[i] === '--save') a.save = argv[++i]
    else if (argv[i] === '--gagal-saja') a.gagalSaja = true
  }
  return a
}

interface Row {
  num: number
  fam: string
  label: string
  diff: string
  kind: string
  truth: string
  breakArah: string
  aksi: string
  arah: string
  // 12 field wajib
  entryPrice: number | null
  exitPrice: number | null
  feeBuy: number | null
  feeSell: number | null
  grossPct: number | null
  netPct: number | null
  returnPct: number | null
  hasil: 'BERHASIL' | 'GAGAL'
  mode: string
  stopPrice: number | null
  likuidasi: boolean
  alasan: string[]
  levelAnalisis: FboKeputusan['level'] & { benarLevel: boolean; truthLevel: number }
  falseSinyal: string[] & { benarVonis: boolean }[] // diperlakukan terpisah di bawah
  sinyalBenarVonis: boolean
  konfirmasi: string
  prematureEntry: boolean
  pelajaran: string[]
  movePct: number
  baitMfePct: number
  earlyFadePunished: boolean
}

function verdictBenar(k: FboKeputusan, e: FboExam): boolean {
  if (e.kind === 'GUARD') return k.aksi !== 'SKIP' && k.arah === e.truth
  // FBO: vonis benar bila TIDAK mengikuti breakout (fade/wait-fade/skip-sadar)
  // — tapi hasil (profit) dinilai terpisah
  return k.aksi === 'SKIP' ? true : k.arah === e.truth
}

function runSuite(ns: string, versi: string, gagalSaja: boolean, guards: boolean): Row[] {
  const suite = guards ? forgeFboGuardSuite(ns) : forgeFboSuite(ns)
  const rows: Row[] = []
  for (const e of suite) {
    const visible = e.candles.slice(0, FBO_VISIBLE)
    const horizon = e.candles.slice(FBO_VISIBLE)
    const k = fbVonis(visible, versi)
    const led: FboLedger = simFboTrade(
      { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel },
      e.entry, horizon,
    )
    const atr = k.fitur.atr || 1
    const benarLevel = k.level.level > 0 && Math.abs(k.level.level - e.level.level) <= 0.6 * atr
    let hasil: 'BERHASIL' | 'GAGAL'
    if (led.mode === 'NO-TRADE') {
      // protokol SAKTI (konsisten ujian gabungan): no-trade dinilai jujur —
      // AMAN bila trade umpan (mengikuti breakout) akan LIKUIDASI/rugi net
      const bait = simBaitFbo(e.breakArah, e.entry, e.candles.slice(FBO_VISIBLE))
      const aman = bait.stopHit || (bait.netPct ?? 0) <= 0
      hasil = aman ? 'BERHASIL' : 'GAGAL'
    } else {
      hasil = (led.netPct ?? -1) > 0 && !led.stopHit ? 'BERHASIL' : 'GAGAL'
    }
    const row: Row = {
      num: e.num, fam: e.fam, label: e.label, diff: e.diff, kind: e.kind,
      truth: e.truth, breakArah: e.breakArah,
      aksi: k.aksi, arah: k.arah,
      entryPrice: led.entry !== null ? +led.entry.toFixed(4) : null,
      exitPrice: led.exit !== null ? +led.exit.toFixed(4) : null,
      feeBuy: led.feeBuy !== null ? +led.feeBuy.toFixed(4) : null,
      feeSell: led.feeSell !== null ? +led.feeSell.toFixed(4) : null,
      grossPct: led.grossPct !== null ? +led.grossPct.toFixed(3) : null,
      netPct: led.netPct !== null ? +led.netPct.toFixed(3) : null,
      returnPct: led.returnPct !== null ? +led.returnPct.toFixed(3) : null,
      hasil, mode: led.mode,
      stopPrice: led.stop !== null ? +led.stop.toFixed(4) : null,
      likuidasi: led.stopHit,
      alasan: k.alasan,
      levelAnalisis: { ...k.level, benarLevel, truthLevel: e.level.level },
      falseSinyal: k.falseSinyal as never,
      sinyalBenarVonis: verdictBenar(k, e),
      konfirmasi: k.konfirmasi,
      prematureEntry: k.aksi === 'ENTRY' && k.prematureRisk,
      pelajaran: k.pelajaranAktif,
      movePct: +e.movePct.toFixed(2), baitMfePct: +e.baitMfePct.toFixed(2),
      earlyFadePunished: e.earlyFadeStopped,
    }
    if (gagalSaja && row.hasil === 'BERHASIL') continue
    rows.push(row)
  }
  return rows
}

function pct(x: number | null, d = 2): string {
  return x === null ? '   —   ' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}%`
}

function runOne(args: Args, guards: boolean): { rows: Row[]; ringkas: string } {
  const rows = runSuite(args.ns, args.versi, args.gagalSaja, guards)
  const label = guards ? 'GUARD 24' : 'FBO 100'
  const trades = rows.filter((r) => r.mode !== 'NO-TRADE')
  let cum = 0, comp = 1, berhasil = 0, likuidasi = 0, noTrade = 0, rugiNet = 0
  for (const r of rows) {
    if (r.mode === 'NO-TRADE') noTrade++
    else {
      cum += r.netPct ?? 0
      comp *= 1 + (r.netPct ?? 0) / 100
      if (r.likuidasi) likuidasi++
      else if ((r.netPct ?? 0) <= 0) rugiNet++
    }
    if (r.hasil === 'BERHASIL') berhasil++
  }
  const lvlOk = rows.filter((r) => r.levelAnalisis.benarLevel).length
  const vonisOk = rows.filter((r) => r.sinyalBenarVonis).length
  const prem = rows.filter((r) => r.prematureEntry).length
  const ringkas = `${label}: LULUS ${berhasil}/${rows.length} | LIKUIDASI ${likuidasi} | rugi-net ${rugiNet} | no-trade ${noTrade} | NET ${cum.toFixed(1)}% (×${comp.toFixed(2)}) | level-ok ${lvlOk} | vonis-ok ${vonisOk} | entry-dini ${prem}`
  return { rows, ringkas }
}

function main(): void {
  const args = parseArgs()
  console.log('='.repeat(118))
  console.log(`UJIAN FALSE BREAKOUT 100 — MICAPROFITA SAKTI-FBO v${args.versi} | ns=${args.ns} | tag=${args.tag}`)
  console.log(`Fee model: buy 0.10% + sell 0.10% = ${totalFeePct().toFixed(2)}% per posisi — HASIL AKHIR SELALU NET. Rencana WAJIB bawa STOP: stop tersentuh = LIKUIDASI.`)
  console.log('Keputusan: ENTRY (bukti kegagalan terkonfirmasi) / WAIT (trigger close-back milik sendiri, maks 8 candle) / SKIP. Penilaian KETAT: no-trade pada ujian tergerbang = GAGAL.')
  console.log('='.repeat(118))

  const fbo = runOne(args, false)
  const guard = runOne(args, true)

  console.log('\n--- 100 UJIAN FBO (truth dari data; keputusan hanya melihat 60 candle) ---')
  console.log('num fam              diff   aksi  arah   truth | entry    exit     feeBuy feeSell gross    NET      return  hasil     | lvl-ok vonis-ok prem')
  for (const r of fbo.rows) {
    console.log(
      `${String(r.num).padStart(3)} ${r.fam.padEnd(17)} ${r.diff.padEnd(6)} ${r.aksi.padEnd(5)} ${r.arah.padEnd(6)} ${r.truth.padEnd(6)}| ` +
      `${r.entryPrice !== null ? r.entryPrice.toFixed(2) : '  —  '} ${r.exitPrice !== null ? r.exitPrice.toFixed(2) : '  —  '} ` +
      `${r.feeBuy !== null ? r.feeBuy.toFixed(3) : ' — '} ${r.feeSell !== null ? r.feeSell.toFixed(3) : ' — '} ` +
      `${pct(r.grossPct).padStart(8)} ${pct(r.netPct).padStart(8)} ${pct(r.returnPct).padStart(8)} ${r.hasil.padEnd(9)} | ` +
      `${r.levelAnalisis.benarLevel ? 'Y' : 'n'}      ${r.sinyalBenarVonis ? 'Y' : 'n'}       ${r.prematureEntry ? 'YA' : '-'}`,
    )
  }
  console.log(`\nFBO : ${fbo.ringkas}`)
  console.log(`GUARD: ${guard.ringkas}`)

  const all = [...fbo.rows, ...guard.rows]
  console.log('\n--- PER KELUARGA (FBO + GUARD) ---')
  const byFam = new Map<string, { n: number; ok: number; lik: number; net: number; noTrade: number }>()
  for (const r of all) {
    const b = byFam.get(r.fam) ?? { n: 0, ok: 0, lik: 0, net: 0, noTrade: 0 }
    b.n++
    if (r.hasil === 'BERHASIL') b.ok++
    if (r.likuidasi) b.lik++
    if (r.mode !== 'NO-TRADE') b.net += r.netPct ?? 0
    else b.noTrade++
    byFam.set(r.fam, b)
  }
  for (const [k, b] of byFam) {
    console.log(`${k.padEnd(18)} n=${String(b.n).padStart(2)} lulus=${String(b.ok).padStart(2)} likuidasi=${b.lik} noTrade=${b.noTrade} net=${b.net >= 0 ? '+' : ''}${b.net.toFixed(1)}%`)
  }

  const gagal = all.filter((r) => r.hasil === 'GAGAL')
  console.log(`\n--- KEGAGALAN (${gagal.length}) — bahan bedah ---`)
  for (const r of gagal.slice(0, 40)) {
    console.log(`#${r.num} ${r.fam} [${r.diff}] aksi=${r.aksi}/${r.arah} truth=${r.truth} mode=${r.mode} likuidasi=${r.likuidasi} | lvl otak ${r.levelAnalisis.level.toFixed(2)} vs truth ${r.levelAnalisis.truthLevel.toFixed(2)} | move=${r.movePct} bait=${r.baitMfePct} punish=${r.earlyFadePunished}`)
    for (const a of r.alasan) console.log(`     · ${a}`)
  }

  if (args.save) {
    mkdirSync(join(process.cwd(), 'research/ujian-fbo'), { recursive: true })
    const path = join(process.cwd(), 'research/ujian-fbo', args.save)
    writeFileSync(path, JSON.stringify({
      versi: args.versi, ns: args.ns, tag: args.tag,
      ringkasan: { fbo: fbo.ringkas, guard: guard.ringkas },
      rows: all,
    }, null, 1))
    console.log(`\nDisimpan: ${path}`)
  }
}

main()
