// ============================================================
// RUNNER UJIAN PUMP & DUMP 100 — otak memvonis ENTRY / WAIT /
// SKIP atas setiap skenario siklus P&D, lalu dicatat per ujian
// (12 field wajib Guru):
//   1. Entry price           7. Persentase return
//   2. Exit price            8. Hasil berhasil/gagal
//   3. Fee buy               9. Alasan keputusan AGI
//   4. Fee sell             10. Struktur siklus yang dianalisis
//   5. Gross profit/loss    11. Identifikasi fase P&D
//   6. NET profit/loss      12. Konfirmasi pra-entry
//   (hasil akhir SELALU net — fee buy 0.1% + fee sell 0.1%
//    dihitung WAJIB; profit kotor tidak pernah dipakai)
//
// Pakai: bun scripts/ujian_pumpdump100.ts --ns pd100 --versi 1.0 \
//          --tag ronde1 [--save r1.json] [--gagal-saja]
// ============================================================

import { forgePdSuite } from '../src/lib/exam/pumpdump-suite'
import { simPdTrade, totalFeePct, PD_VISIBLE, type PdLedger } from '../src/lib/exam/pumpdump-forge'
import { pdVonis, type PdKeputusan } from '../src/lib/exam/pumpdump-brain'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface Args { ns: string; versi: string; tag: string; save: string; gagalSaja: boolean }

function parseArgs(): Args {
  const a: Args = { ns: 'pd100', versi: '1.0', tag: 'ronde', save: '', gagalSaja: false }
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
  arch: string
  label: string
  diff: string
  faseTruth: string
  truth: 'NAIK' | 'TURUN'
  bait: 'NAIK' | 'TURUN'
  levelsTruth: { puncak: number; dasar: number }
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
  alasan: string[]
  struktur: { puncakEst: number; dasarEst: number; puncakOk: boolean; dasarOk: boolean }
  identifikasi: { faseDuga: string; faseBenar: boolean; rule: string[] }
  konfirmasiPraEntry: { ada: boolean; label: string }
  movePct: number
  mfePct: number
  baitMfePct: number
  fiturRingkas: Record<string, number | string | boolean>
}

function fiturRingkas(k: PdKeputusan): Record<string, number | string | boolean> {
  const f = k.fitur
  return {
    dist21: +f.distEma21Atr.toFixed(2), rsi: +f.rsi.toFixed(0), pos: +f.posInWindow60.toFixed(2),
    mom50: +f.mom50Atr.toFixed(1), mom12: +f.mom12Atr.toFixed(2), mom3: +f.mom3Atr.toFixed(2),
    consUp: f.consecutiveUp, consDn: f.consecutiveDown, consDnBig: f.consecDownBig, consUpBig: f.consecUpBig,
    climax: f.volClimax, volZ: +f.volZ.toFixed(1), volM8x: +f.volMean8Ratio.toFixed(2), volM6x: +f.volMean6Ratio.toFixed(2),
    net8: +f.net8Atr.toFixed(2), wick8: f.wickTop8, fall: +f.fallPuncakAtr.toFixed(1),
    brkUp: f.recentBreakUp, brkDn: f.recentBreakDown, microBrk: f.microBreakDn, microRecl: f.microReclaim,
    retest: f.retestHold, engulf: f.bearEngulf ? 'bear' : f.bullEngulf ? 'bull' : '-',
    hh: f.hh, lh: f.lh, hl: f.hl, wickUp: +f.upperWickPct.toFixed(2), body: +f.bodyPct.toFixed(2),
    asym5: +f.volAsym5.toFixed(2), dry6: f.bounceDry6, volUp3: f.volTrendUp3,
  }
}

function runSuite(ns: string, versi: string, gagalSaja: boolean): Row[] {
  const suite = forgePdSuite(ns)
  const rows: Row[] = []
  for (const e of suite) {
    const visible = e.candles.slice(0, PD_VISIBLE)
    const horizon = e.candles.slice(PD_VISIBLE)
    const k = pdVonis(visible, versi)
    const led: PdLedger = simPdTrade(
      { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, triggerLevel: k.triggerLevel },
      e.entry, horizon, e.bait,
    )
    // penilaian struktur & identifikasi
    const atr = Math.max(k.fitur.atr, 1e-9)
    const puncakOk = Math.abs(k.puncakEst - e.levels.puncak) <= 1.2 * atr
    const dasarOk = Math.abs(k.dasarEst - e.levels.dasar) <= 1.6 * atr
    const faseBenar = k.fase === e.fase
    let hasil: 'BERHASIL' | 'GAGAL'
    if (led.mode === 'NO-TRADE') hasil = led.noTradeAman ? 'BERHASIL' : 'GAGAL'
    else hasil = (led.netPct ?? -1) > 0 ? 'BERHASIL' : 'GAGAL'
    const row: Row = {
      num: e.num, arch: e.arch.id, label: e.arch.label, diff: e.diff,
      faseTruth: e.fase, truth: e.truth, bait: e.bait,
      levelsTruth: { puncak: +e.levels.puncak.toFixed(2), dasar: +e.levels.dasar.toFixed(2) },
      aksi: k.aksi, arah: k.arah, benarArah: k.arah === e.truth,
      entryPrice: led.entry !== null ? +led.entry.toFixed(4) : null,
      exitPrice: led.exit !== null ? +led.exit.toFixed(4) : null,
      feeBuy: led.feeBuy !== null ? +led.feeBuy.toFixed(4) : null,
      feeSell: led.feeSell !== null ? +led.feeSell.toFixed(4) : null,
      grossPct: led.grossPct !== null ? +led.grossPct.toFixed(3) : null,
      netPct: led.netPct !== null ? +led.netPct.toFixed(3) : null,
      returnPct: led.returnPct !== null ? +led.returnPct.toFixed(3) : null,
      hasil, mode: led.mode, alasan: k.alasan,
      struktur: { puncakEst: +k.puncakEst.toFixed(2), dasarEst: +k.dasarEst.toFixed(2), puncakOk, dasarOk },
      identifikasi: { faseDuga: k.fase, faseBenar, rule: k.pelajaranAktif },
      konfirmasiPraEntry: k.konfirmasi,
      movePct: +e.movePct.toFixed(2), mfePct: +e.mfePct.toFixed(2), baitMfePct: +e.baitMfePct.toFixed(2),
      fiturRingkas: fiturRingkas(k),
    }
    if (gagalSaja && row.hasil === 'BERHASIL' && faseBenar) continue
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
  console.log(`UJIAN PUMP & DUMP 100 — MICAPROFITA SAKTI-PD v${args.versi} | ns=${args.ns} | tag=${args.tag}`)
  console.log(`Fee model: buy 0.10% + sell 0.10% = ${feePct.toFixed(2)}% per posisi — HASIL AKHIR SELALU NET (profit kotor tidak pernah dipakai)`)
  console.log('Keputusan: ENTRY / WAIT (trigger sendiri, maks 8 candle) / SKIP. NO-TRADE dinilai jujur: aman bila trade arah jebakan akan rugi net.')
  console.log('='.repeat(118))

  const rows = runSuite(args.ns, args.versi, args.gagalSaja)

  // ---- LEDGER 100 UJIAN
  console.log('\n--- 100 UJIAN (truth dari data; keputusan hanya melihat 60 candle) ---')
  console.log('num arch                    diff   aksi  arah   truth | entry    exit     feeBuy feeSell gross    NET      return  hasil     | fase-ok lvl-ok')
  let cum = 0, comp = 1, berhasil = 0, rugi = 0, noTrade = 0
  for (const r of rows) {
    if (r.mode === 'NO-TRADE') noTrade++
    else { cum += r.netPct ?? 0; comp *= 1 + (r.netPct ?? 0) / 100; if ((r.netPct ?? 0) <= 0) rugi++ }
    if (r.hasil === 'BERHASIL') berhasil++
    console.log(
      `${String(r.num).padStart(3)} ${r.arch.padEnd(23)} ${r.diff.padEnd(6)} ${r.aksi.padEnd(5)} ${r.arah.padEnd(6)} ${r.truth.padEnd(6)}| ` +
      `${r.entryPrice !== null ? r.entryPrice.toFixed(2) : '  —  '} ${r.exitPrice !== null ? r.exitPrice.toFixed(2) : '  —  '} ` +
      `${r.feeBuy !== null ? r.feeBuy.toFixed(3) : ' — '} ${r.feeSell !== null ? r.feeSell.toFixed(3) : ' — '} ` +
      `${pct(r.grossPct).padStart(8)} ${pct(r.netPct).padStart(8)} ${pct(r.returnPct).padStart(8)} ${r.hasil.padEnd(9)} | ` +
      `${r.identifikasi.faseBenar ? 'Y' : 'N'}       ${r.struktur.puncakOk && r.struktur.dasarOk ? 'Y' : 'N'}`,
    )
  }

  // ---- RINGKASAN
  const trades = rows.filter((r) => r.mode !== 'NO-TRADE')
  const faseOk = rows.filter((r) => r.identifikasi.faseBenar).length
  const lvlOk = rows.filter((r) => r.struktur.puncakOk && r.struktur.dasarOk).length
  const arahOk = rows.filter((r) => r.benarArah).length
  console.log('\n--- RINGKASAN ---')
  console.log(`BERHASIL: ${berhasil}/100 | rugi (net<=0): ${rugi} | no-trade: ${noTrade}`)
  console.log(`NET kumulatif: ${cum.toFixed(1)}% | compound: ×${comp.toFixed(2)} | rata2 net per trade: ${(trades.length ? cum / trades.length : 0).toFixed(2)}%`)
  console.log(`IDENTIFIKASI: fase benar ${faseOk}/100 | level puncak+dasar benar ${lvlOk}/100 | arah benar ${arahOk}/100`)
  console.log(`PEMBUNUH (bait MFE <= 1.1%): ${rows.filter((r) => r.baitMfePct <= 1.1).length} skenario`)

  // ---- PER ARKETIPE
  console.log('\n--- PER ARKETIPE ---')
  const byArch = new Map<string, { n: number; ok: number; fase: number; net: number; noTrade: number; rugi: number }>()
  for (const r of rows) {
    const b = byArch.get(r.arch) ?? { n: 0, ok: 0, fase: 0, net: 0, noTrade: 0, rugi: 0 }
    b.n++
    if (r.hasil === 'BERHASIL') b.ok++
    if (r.identifikasi.faseBenar) b.fase++
    if (r.mode !== 'NO-TRADE') { b.net += r.netPct ?? 0; if ((r.netPct ?? 0) <= 0) b.rugi++ }
    else b.noTrade++
    byArch.set(r.arch, b)
  }
  for (const [k2, b] of byArch) {
    console.log(`${k2.padEnd(23)} n=${String(b.n).padStart(2)} berhasil=${String(b.ok).padStart(2)} fase=${String(b.fase).padStart(2)} noTrade=${b.noTrade} rugi=${b.rugi} net=${b.net >= 0 ? '+' : ''}${b.net.toFixed(1)}%`)
  }

  // ---- DAFTAR KEGAGALAN (bahan bedah)
  const gagal = rows.filter((r) => r.hasil === 'GAGAL' || !r.identifikasi.faseBenar)
  console.log(`\n--- KEGAGALAN / SALAH-IDENTIFIKASI (${gagal.length}) ---`)
  for (const r of gagal.slice(0, 45)) {
    console.log(`#${r.num} ${r.arch} [${r.diff}] aksi=${r.aksi}/${r.arah} truth=${r.truth} fase=${r.faseTruth}/${r.identifikasi.faseDuga} rule=${(r.identifikasi.rule ?? []).join(',')} | fitur: ${JSON.stringify(r.fiturRingkas)}`)
    for (const a of r.alasan) console.log(`     · ${a}`)
  }

  if (args.save) {
    mkdirSync(join(process.cwd(), 'research/ujian-pumpdump'), { recursive: true })
    const path = join(process.cwd(), 'research/ujian-pumpdump', args.save)
    writeFileSync(path, JSON.stringify({ versi: args.versi, ns: args.ns, tag: args.tag, ringkasan: { berhasil, rugi, noTrade, cum, comp, faseOk, lvlOk, arahOk }, rows }, null, 1))
    console.log(`\nDisimpan: ${path}`)
  }
}

main()
