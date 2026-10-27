// ============================================================
// RUNNER UJIAN STOP HUNT / LIQUIDITY GRAB 100 — otak memvonis
// ENTRY / WAIT / SKIP atas setiap skenario, lalu dicatat per
// ujian (11 field wajib Guru):
//   1. Entry price          7. Persentase return
//   2. Exit price           8. Hasil berhasil/gagal
//   3. Fee buy              9. Alasan keputusan AGI
//   4. Fee sell            10. Area likuiditas yang dianalisis
//   5. Gross profit/loss   11. Identifikasi stop-hunt/grab
//   6. NET profit/loss (hasil akhir — profit kotor tidak
//      pernah dipakai; fee buy + fee sell dihitung WAJIB)
//
// Pakai: bun scripts/ujian_stophunt100.ts --ns sh100 --versi 2.0 \
//          --tag ronde1 [--save research/ujian-stophunt/r1.json] [--gagal-saja]
// ============================================================

import { forgeShSuite } from '../src/lib/exam/stophunt-suite'
import { simShTrade, totalFeePct, SH_VISIBLE, type ShLedger } from '../src/lib/exam/stophunt-forge'
import { sgVonis, type SgKeputusan } from '../src/lib/exam/stophunt-brain'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface Args { ns: string; versi: string; tag: string; save: string; gagalSaja: boolean; dumpFitur: boolean }

function parseArgs(): Args {
  const a: Args = { ns: 'sh100', versi: '2.0', tag: 'ronde', save: '', gagalSaja: false, dumpFitur: false }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ns') a.ns = argv[++i]
    else if (argv[i] === '--versi') a.versi = argv[++i]
    else if (argv[i] === '--tag') a.tag = argv[++i]
    else if (argv[i] === '--save') a.save = argv[++i]
    else if (argv[i] === '--gagal-saja') a.gagalSaja = true
    else if (argv[i] === '--fitur') a.dumpFitur = true
  }
  return a
}

interface Row {
  num: number
  arch: string
  label: string
  diff: string
  post: string
  truth: 'NAIK' | 'TURUN'
  bait: 'NAIK' | 'TURUN'
  poolTruth: { jenis: string; side: string; level: number; sentuhan: number; sweepIdx: number }
  aksi: string
  arah: string
  benarArah: boolean
  // 11 field wajib
  entryPrice: number | null
  exitPrice: number | null
  feeBuy: number | null
  feeSell: number | null
  grossPct: number | null
  netPct: number | null
  returnPct: number | null
  hasil: 'BERHASIL' | 'GAGAL'
  mode: string
  alasan: string[]
  areaLikuiditas: SgKeputusan['pool'] & { benarJenis: boolean; benarLevel: boolean; benarSide: boolean }
  identifikasiGrab: SgKeputusan['grab'] & { benarPost: boolean; benarTerjadi: boolean }
  pelajaran: string[]
  movePct: number
  mfePct: number
  baitMfePct: number
  fiturRingkas: Record<string, number | string | boolean>
}

function fiturRingkas(k: SgKeputusan): Record<string, number | string | boolean> {
  const P = k.fitur.active
  return {
    mom50: +k.fitur.mom50Atr.toFixed(2), mom12: +k.fitur.mom12Atr.toFixed(2), rsi: +k.fitur.rsi.toFixed(0),
    consDn: k.fitur.consecutiveDown, consUp: k.fitur.consecutiveUp, climax: k.fitur.volClimax,
    pool: P ? P.jenis : '-', level: P ? +P.level.toFixed(2) : 0, sentuh: P ? P.sentuhan : 0,
    bounce: P ? +P.maxBounceAtr.toFixed(2) : 0, depth: P ? +P.depthAtr.toFixed(2) : 0,
    since: P ? P.barsSince : -1, reclaim: P ? P.reclaimed : false, cDist: P ? +P.closeDistAtr.toFixed(2) : 0,
    volZswp: P ? +P.volZSweep.toFixed(1) : 0, postBody: P ? +P.postBounceMaxBodyAtr.toFixed(2) : 0,
    postVol: P ? +P.postVolMean.toFixed(2) : 0,
  }
}

function runSuite(ns: string, versi: string, gagalSaja: boolean): Row[] {
  const suite = forgeShSuite(ns)
  const rows: Row[] = []
  for (const e of suite) {
    const visible = e.candles.slice(0, SH_VISIBLE)
    const horizon = e.candles.slice(SH_VISIBLE)
    const k = sgVonis(visible, versi)
    const led: ShLedger = simShTrade(
      { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, triggerLevel: k.triggerLevel },
      e.entry, horizon, e.bait,
    )
    // penilaian identifikasi
    const atr = k.fitur.atr
    const benarSide = k.pool.side === e.pool.side
    const benarJenis = k.pool.jenis === e.pool.jenis
    const benarLevel = k.pool.level > 0 && Math.abs(k.pool.level - e.pool.level) <= 0.6 * atr
    const benarPost = k.grab.post === e.postGrab
    const benarTerjadi = k.grab.terjadi === true
    // hasil: trade = net > 0; no-trade = aman bila trade bait akan rugi net
    let hasil: 'BERHASIL' | 'GAGAL'
    if (led.mode === 'NO-TRADE') hasil = led.noTradeAman ? 'BERHASIL' : 'GAGAL'
    else hasil = (led.netPct ?? -1) > 0 ? 'BERHASIL' : 'GAGAL'
    const row: Row = {
      num: e.num, arch: e.arch.id, label: e.arch.label, diff: e.diff, post: e.postGrab,
      truth: e.truth, bait: e.bait,
      poolTruth: { jenis: e.pool.jenis, side: e.pool.side, level: +e.pool.level.toFixed(2), sentuhan: e.pool.sentuhan, sweepIdx: e.pool.sweepIdx },
      aksi: k.aksi, arah: k.arah, benarArah: k.arah === e.truth,
      entryPrice: led.entry !== null ? +led.entry.toFixed(4) : null,
      exitPrice: led.exit !== null ? +led.exit.toFixed(4) : null,
      feeBuy: led.feeBuy !== null ? +led.feeBuy.toFixed(4) : null,
      feeSell: led.feeSell !== null ? +led.feeSell.toFixed(4) : null,
      grossPct: led.grossPct !== null ? +led.grossPct.toFixed(3) : null,
      netPct: led.netPct !== null ? +led.netPct.toFixed(3) : null,
      returnPct: led.returnPct !== null ? +led.returnPct.toFixed(3) : null,
      hasil, mode: led.mode, alasan: k.alasan,
      areaLikuiditas: { ...k.pool, benarJenis, benarLevel, benarSide },
      identifikasiGrab: { ...k.grab, benarPost, benarTerjadi },
      pelajaran: k.pelajaranAktif, movePct: +e.movePct.toFixed(2), mfePct: +e.mfePct.toFixed(2), baitMfePct: +e.baitMfePct.toFixed(2),
      fiturRingkas: fiturRingkas(k),
    }
    if (gagalSaja && row.hasil === 'BERHASIL' && benarJenis && benarPost) continue
    rows.push(row)
  }
  return rows
}

function pct(x: number | null, d = 2): string {
  return x === null ? '  —  ' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}%`
}

function main(): void {
  const args = parseArgs()
  const feePct = totalFeePct()
  console.log('='.repeat(118))
  console.log(`UJIAN STOP HUNT / LIQUIDITY GRAB 100 — MICAPROFITA SAKTI-SH v${args.versi} | ns=${args.ns} | tag=${args.tag}`)
  console.log(`Fee model: buy 0.10% + sell 0.10% = ${feePct.toFixed(2)}% per posisi — HASIL AKHIR SELALU NET (profit kotor tidak pernah dipakai)`)
  console.log('Keputusan: ENTRY / WAIT (trigger reclaim sendiri, maks 8 candle) / SKIP. NO-TRADE dinilai jujur: aman bila trade arah jebakan akan rugi net.')
  console.log('='.repeat(118))

  const rows = runSuite(args.ns, args.versi, args.gagalSaja)

  // ---- LEDGER 100 UJIAN
  console.log('\n--- 100 UJIAN (truth dari data; keputusan hanya melihat 60 candle) ---')
  console.log('num arch                 diff   aksi  arah   truth | entry    exit     feeBuy feeSell gross    NET      return  hasil     | jenis-ok lvl-ok post-ok')
  let cum = 0, comp = 1, berhasil = 0, likuidasi = 0, noTrade = 0
  for (const r of rows) {
    if (r.mode === 'NO-TRADE') noTrade++
    else { cum += r.netPct ?? 0; comp *= 1 + (r.netPct ?? 0) / 100; if ((r.netPct ?? 0) <= 0) likuidasi++ }
    if (r.hasil === 'BERHASIL') berhasil++
    const L = r
    console.log(
      `${String(r.num).padStart(3)} ${r.arch.padEnd(20)} ${r.diff.padEnd(6)} ${r.aksi.padEnd(5)} ${r.arah.padEnd(6)} ${r.truth.padEnd(6)}| ` +
      `${L.entryPrice !== null ? L.entryPrice.toFixed(2) : '  —  '} ${L.exitPrice !== null ? L.exitPrice.toFixed(2) : '  —  '} ` +
      `${L.feeBuy !== null ? L.feeBuy.toFixed(3) : ' — '} ${L.feeSell !== null ? L.feeSell.toFixed(3) : ' — '} ` +
      `${pct(L.grossPct).padStart(8)} ${pct(L.netPct).padStart(8)} ${pct(L.returnPct).padStart(8)} ${r.hasil.padEnd(9)} | ` +
      `${r.areaLikuiditas.benarJenis ? 'Y' : 'N'}        ${r.areaLikuiditas.benarLevel ? 'Y' : 'N'}       ${r.identifikasiGrab.benarPost ? 'Y' : 'N'}`,
    )
  }

  // ---- RINGKASAN
  const trades = rows.filter((r) => r.mode !== 'NO-TRADE')
  const jenisOk = rows.filter((r) => r.areaLikuiditas.benarJenis).length
  const levelOk = rows.filter((r) => r.areaLikuiditas.benarLevel).length
  const postOk = rows.filter((r) => r.identifikasiGrab.benarPost).length
  const terjadiOk = rows.filter((r) => r.identifikasiGrab.benarTerjadi).length
  console.log('\n--- RINGKASAN ---')
  console.log(`BERHASIL: ${berhasil}/100 | likuidasi (net<=0): ${likuidasi} | no-trade: ${noTrade}`)
  console.log(`NET kumulatif: ${cum.toFixed(1)}% | compound: ×${comp.toFixed(2)} | rata2 net per trade: ${(trades.length ? cum / trades.length : 0).toFixed(2)}%`)
  console.log(`IDENTIFIKASI: jenis pool benar ${jenisOk}/100 | level pool benar (<=0.6 ATR) ${levelOk}/100 | pasca-grab benar ${postOk}/100 | grab terdeteksi ${terjadiOk}/100`)
  console.log(`ARAH benar: ${rows.filter((r) => r.benarArah).length}/100 (no-trade dihitung salah arah)`)

  // ---- PER ARKETIPE
  console.log('\n--- PER ARKETIPE ---')
  const byArch = new Map<string, { n: number; ok: number; jenis: number; post: number; net: number; noTrade: number }>()
  for (const r of rows) {
    const b = byArch.get(r.arch) ?? { n: 0, ok: 0, jenis: 0, post: 0, net: 0, noTrade: 0 }
    b.n++
    if (r.hasil === 'BERHASIL') b.ok++
    if (r.areaLikuiditas.benarJenis) b.jenis++
    if (r.identifikasiGrab.benarPost) b.post++
    if (r.mode !== 'NO-TRADE') b.net += r.netPct ?? 0
    else b.noTrade++
    byArch.set(r.arch, b)
  }
  for (const [k, b] of byArch) {
    console.log(`${k.padEnd(20)} n=${String(b.n).padStart(2)} berhasil=${String(b.ok).padStart(2)} jenis=${String(b.jenis).padStart(2)} post=${String(b.post).padStart(2)} noTrade=${b.noTrade} net=${b.net >= 0 ? '+' : ''}${b.net.toFixed(1)}%`)
  }

  // ---- DAFTAR KEGAGALAN (bahan bedah)
  const gagal = rows.filter((r) => r.hasil === 'GAGAL' || !r.areaLikuiditas.benarJenis || !r.identifikasiGrab.benarPost)
  console.log(`\n--- KEGAGALAN / SALAH-IDENTIFIKASI (${gagal.length}) ---`)
  for (const r of gagal.slice(0, 40)) {
    console.log(`#${r.num} ${r.arch} [${r.diff}] aksi=${r.aksi}/${r.arah} truth=${r.truth} post=${r.post} | pool otak=${r.areaLikuiditas.jenis}(side ${r.areaLikuiditas.side}, lvl ${r.areaLikuiditas.level}) vs truth=${r.poolTruth.jenis}(lvl ${r.poolTruth.level}) | fitur: ${JSON.stringify(r.fiturRingkas)}`)
    for (const a of r.alasan) console.log(`     · ${a}`)
  }

  if (args.save) {
    mkdirSync(join(process.cwd(), 'research/ujian-stophunt'), { recursive: true })
    const path = join(process.cwd(), 'research/ujian-stophunt', args.save)
    writeFileSync(path, JSON.stringify({ versi: args.versi, ns: args.ns, tag: args.tag, ringkasan: { berhasil, likuidasi, noTrade, cum, comp, jenisOk, levelOk, postOk }, rows }, null, 1))
    console.log(`\nDisimpan: ${path}`)
  }
}

main()
