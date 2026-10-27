// ============================================================
// RUNNER UJIAN KOMPLEKS 5 ASPEK — 100 ujian, SETIAP ujian =
// satu rangkaian pasar kompleks: STOP HUNT/LIQUIDITY GRAB +
// FALSE BREAKOUT + PUMP & DUMP + BEAR TRAP + BULL TRAP (+ lilin
// menipu) bekerja BERSAMAAN dan BERURUTAN.
//
// Otak memvonis ENTRY / WAIT / SKIP + STOP WAJIB (bisa
// DILIKUIDASI). Setiap ujian dicatat (12 field wajib Guru +
// bukti 5 aspek):
//   1. Entry price          7. Persentase return
//   2. Exit price           8. Hasil berhasil/gagal
//   3. Fee buy              9. Alasan keputusan AGI
//   4. Fee sell            10. Area likuiditas yang dianalisis
//   5. Gross profit/loss   11. Identifikasi stop-hunt/grab
//   6. NET profit/loss     12. Jejak 5 aspek (bull/bear trap,
//      (hasil akhir; fee buy +    pump&dump, false breakout,
//      fee sell WAJIB dihitung)   stop hunt + rangkaian)
//
// Pakai: bun scripts/ujian_kompleks100.ts --ns kl100 --versi 1.0 \
//          --tag ronde1 [--save r1.json] [--gagal-saja] [--core]
// ============================================================

import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { simKlTrade, totalFeePct, KL_VISIBLE, type KlLedger, type KlExam, type Candle } from '../src/lib/exam/kompleks-forge'
import { klVonis, klCore, type KlKeputusan } from '../src/lib/exam/kompleks-brain'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface Args { ns: string; versi: string; tag: string; save: string; gagalSaja: boolean; core: boolean }

function parseArgs(): Args {
  const a: Args = { ns: 'kl100', versi: '1.0', tag: 'ronde', save: '', gagalSaja: false, core: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ns') a.ns = argv[++i]
    else if (argv[i] === '--versi') a.versi = argv[++i]
    else if (argv[i] === '--tag') a.tag = argv[++i]
    else if (argv[i] === '--save') a.save = argv[++i]
    else if (argv[i] === '--gagal-saja') a.gagalSaja = true
    else if (argv[i] === '--core') a.core = true
  }
  return a
}

interface Row {
  num: number
  fam: string
  label: string
  diff: string
  post: string
  truth: string
  bait: string
  aksi: string
  arah: string
  benarArah: boolean
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
  areaLikuiditas: KlKeputusan['pool'] & { benarLevel: boolean }
  identifikasiGrab: KlKeputusan['grab'] & { benarPost: boolean }
  // jejak 5 aspek
  aspek5: KlKeputusan['aspek5'] & {
    benarFbo: boolean // falseBreakout terdeteksi & level mendekati lvlFbo truth
    benarPuncak: boolean // konteks pump-dump terbaca
  }
  bullTrapTerdeteksi: boolean
  bearTrapTerdeteksi: boolean
  pumpDumpTerdeteksi: boolean
  falseBreakoutTerdeteksi: boolean
  stopHuntTerdeteksi: boolean
  pelajaran: string[]
  movePct: number
  mfePct: number
  baitMfePct: number
  noiseFlipped: boolean
}

function cekAspek(cs: Candle[], k: KlKeputusan, e: KlExam) {
  const stopHunt = k.grab.terjadi && k.pool.swept
  const benarLevel = k.pool.level > 0 && Math.abs(k.pool.level - e.aspek.stopHunt.poolLevel) <= 0.6 * (k.fitur.atr || 1)
  const benarFbo = k.pd.falseBreakout && Math.abs(k.pd.fboLevel - e.lvlFbo) <= 1.2 * (k.fitur.atr || 1)
  const benarPuncak = k.pd.pump && (e.post === 'FAKE' || e.post === 'ABSORB' ? k.pd.dump : true)
  // pemetaan post -> kategori keputusan (REVERSAL vs CONTINUATION)
  const katPost = e.post === 'FAKE' || e.post === 'ABSORB' ? 'CONTINUATION' : 'REVERSAL'
  return {
    stopHunt,
    benarLevel,
    benarFbo,
    benarPuncak,
    // WAIT dgn arah = truth = antisipasi resolusi benar (konfirmasi datang, profit dinilai terpisah)
    benarPost: k.grab.post === katPost || (k.aksi === 'WAIT' && k.arah === e.truth),
  }
}

function runSuite(ns: string, versi: string, gagalSaja: boolean, core: boolean): Row[] {
  const suite = forgeKlSuite(ns)
  const rows: Row[] = []
  for (const e of suite) {
    const visible = e.candles.slice(0, KL_VISIBLE)
    const horizon = e.candles.slice(KL_VISIBLE)
    const k = core ? klCore(visible, klVonis(visible, '0.9').fitur) : klVonis(visible, versi)
    const led: KlLedger = simKlTrade(
      { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, stopPct: k.stopPct, triggerLevel: k.triggerLevel },
      e.entry, horizon, e.bait,
    )
    const asp = cekAspek(visible, k, e)
    let hasil: 'BERHASIL' | 'GAGAL'
    if (led.mode === 'NO-TRADE') hasil = led.noTradeAman ? 'BERHASIL' : 'GAGAL'
    else hasil = (led.netPct ?? -1) > 0 && !led.stopHit ? 'BERHASIL' : 'GAGAL'
    const row: Row = {
      num: e.num, fam: e.fam, label: e.label, diff: e.diff, post: e.post,
      truth: e.truth, bait: e.bait,
      aksi: k.aksi, arah: k.arah, benarArah: k.arah === e.truth,
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
      areaLikuiditas: { ...k.pool, benarLevel: asp.benarLevel },
      identifikasiGrab: { ...k.grab, benarPost: asp.benarPost },
      aspek5: { ...k.aspek5, benarFbo: asp.benarFbo, benarPuncak: asp.benarPuncak },
      bullTrapTerdeteksi: k.aspek5.bullTrap,
      bearTrapTerdeteksi: k.aspek5.bearTrap,
      pumpDumpTerdeteksi: k.aspek5.pumpDump,
      falseBreakoutTerdeteksi: k.aspek5.falseBreakout,
      stopHuntTerdeteksi: asp.stopHunt,
      pelajaran: k.pelajaranAktif,
      movePct: +e.movePct.toFixed(2), mfePct: +e.mfePct.toFixed(2), baitMfePct: +e.baitMfePct.toFixed(2),
      noiseFlipped: e.noiseFlipped,
    }
    if (gagalSaja && row.hasil === 'BERHASIL') continue
    rows.push(row)
  }
  return rows
}

function pct(x: number | null, d = 2): string {
  return x === null ? '   —   ' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}%`
}

function main(): void {
  const args = parseArgs()
  console.log('='.repeat(118))
  console.log(`UJIAN KOMPLEKS 5 ASPEK (STOP HUNT + FALSE BREAKOUT + PUMP&DUMP + BEAR TRAP + BULL TRAP) — MICAPROFITA SAKTI-KL v${args.versi}${args.core ? ' [CORE NAIF]' : ''} | ns=${args.ns} | tag=${args.tag}`)
  console.log(`Fee model: buy 0.10% + sell 0.10% = ${totalFeePct().toFixed(2)}% per posisi — HASIL AKHIR SELALU NET. Rencana WAJIB bawa STOP: stop tersentuh = LIKUIDASI.`)
  console.log('Keputusan: ENTRY / WAIT (trigger sendiri, maks 8 candle) / SKIP. NO-TRADE dinilai jujur: aman bila trade umpan akan likuidasi/rugi net.')
  console.log('='.repeat(118))

  const rows = runSuite(args.ns, args.versi, args.gagalSaja, args.core)

  console.log('\n--- 100 UJIAN (truth dari data; keputusan hanya melihat 60 candle) ---')
  console.log('num fam              diff   aksi  arah   truth | entry    exit     feeBuy feeSell gross    NET      return  hasil     | 5 aspek: BT/BeT/PD/FB/SH lvl-ok post-ok')
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
    console.log(
      `${String(r.num).padStart(3)} ${r.fam.padEnd(16)} ${r.diff.padEnd(6)} ${r.aksi.padEnd(5)} ${r.arah.padEnd(6)} ${r.truth.padEnd(6)}| ` +
      `${r.entryPrice !== null ? r.entryPrice.toFixed(2) : '  —  '} ${r.exitPrice !== null ? r.exitPrice.toFixed(2) : '  —  '} ` +
      `${r.feeBuy !== null ? r.feeBuy.toFixed(3) : ' — '} ${r.feeSell !== null ? r.feeSell.toFixed(3) : ' — '} ` +
      `${pct(r.grossPct).padStart(8)} ${pct(r.netPct).padStart(8)} ${pct(r.returnPct).padStart(8)} ${r.hasil.padEnd(9)} | ` +
      `${r.bullTrapTerdeteksi ? 'Y' : 'n'}  ${r.bearTrapTerdeteksi ? 'Y' : 'n'}   ${r.pumpDumpTerdeteksi ? 'Y' : 'n'}  ${r.falseBreakoutTerdeteksi ? 'Y' : 'n'}  ${r.stopHuntTerdeteksi ? 'Y' : 'n'}   ${r.areaLikuiditas.benarLevel ? 'Y' : 'n'}      ${r.identifikasiGrab.benarPost ? 'Y' : 'n'}`,
    )
  }

  const trades = rows.filter((r) => r.mode !== 'NO-TRADE')
  const bullOk = rows.filter((r) => r.bullTrapTerdeteksi).length
  const bearOk = rows.filter((r) => r.bearTrapTerdeteksi).length
  const pdOk = rows.filter((r) => r.pumpDumpTerdeteksi).length
  const fboOk = rows.filter((r) => r.falseBreakoutTerdeteksi).length
  const shOk = rows.filter((r) => r.stopHuntTerdeteksi).length
  const fboLvlOk = rows.filter((r) => r.aspek5.benarFbo).length
  const lvlOk = rows.filter((r) => r.areaLikuiditas.benarLevel).length
  const postOk = rows.filter((r) => r.identifikasiGrab.benarPost).length
  console.log('\n--- RINGKASAN ---')
  console.log(`LULUS: ${berhasil}/100 | LIKUIDASI (stop tersentuh): ${likuidasi} | rugi-net tanpa stop: ${rugiNet} | no-trade: ${noTrade}`)
  console.log(`NET kumulatif: ${cum.toFixed(1)}% | compound: ×${comp.toFixed(2)} | rata2 net per trade: ${(trades.length ? cum / trades.length : 0).toFixed(2)}%`)
  console.log(`ASPEK 5: bull trap ${bullOk}/100 | bear trap ${bearOk}/100 | pump&dump ${pdOk}/100 | false breakout ${fboOk}/100 (level benar ${fboLvlOk}/100) | stop hunt ${shOk}/100`)
  console.log(`IDENTIFIKASI: level pool benar (<=0.6 ATR) ${lvlOk}/100 | pasca-grab benar ${postOk}/100 | arah benar ${rows.filter((r) => r.benarArah).length}/100`)

  console.log('\n--- PER KELUARGA ---')
  const byFam = new Map<string, { n: number; ok: number; lik: number; net: number; noTrade: number }>()
  for (const r of rows) {
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

  const gagal = rows.filter((r) => r.hasil === 'GAGAL')
  console.log(`\n--- KEGAGALAN (${gagal.length}) — bahan bedah ---`)
  for (const r of gagal.slice(0, 45)) {
    console.log(`#${r.num} ${r.fam} [${r.diff}] aksi=${r.aksi}/${r.arah} truth=${r.truth} post=${r.post} mode=${r.mode} likuidasi=${r.likuidasi} | pool=${r.areaLikuiditas.jenis}/${r.areaLikuiditas.side} lvl ${r.areaLikuiditas.level} | move=${r.movePct} mfe=${r.mfePct} baitMfe=${r.baitMfePct}`)
    for (const a of r.alasan) console.log(`     · ${a}`)
  }

  if (args.save) {
    mkdirSync(join(process.cwd(), 'research/ujian-kompleks'), { recursive: true })
    const path = join(process.cwd(), 'research/ujian-kompleks', args.save)
    writeFileSync(path, JSON.stringify({
      versi: args.versi, ns: args.ns, tag: args.tag, core: args.core,
      ringkasan: { berhasil, likuidasi, rugiNet, noTrade, cum, comp, bullOk, bearOk, pdOk, fboOk, fboLvlOk, shOk, lvlOk, postOk },
      rows,
    }, null, 1))
    console.log(`\nDisimpan: ${path}`)
  }
}

main()
