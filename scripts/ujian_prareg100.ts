// ============================================================
// RUNNER UJIAN PRA-REGISTRASI — 100 SKENARIO KOMPLEKS (ASPEK-5).
//
// Mandat Guru: "mampu menembak akurasi yang sangat koheren
// SEBELUM prediksi itu terjadi."
//
// PROTOKOL DUA FASE (dua file bukti terpisah):
//   FASE KUNCI — otak HANYA melihat 60 candle visible, lalu
//     mengunci: arah + kepastian + TRAJEKTORI 4 titik cek
//     (h=3/7/11/14). Entri dirantai SHA-256 (prev-hash) dan
//     LEDGER DITULIS KE DISK. Horizon TIDAK disentuh sama sekali.
//   FASE BUKA — ledger dibaca ulang, rantai diverifikasi,
//     otak beku direproduksi (vonis ulang harus identik), lalu
//     horizon dibuka: koherensi trajektori + trade bersih
//     (fee buy 0.1% + fee sell 0.1%) dihitung.
//
// BAR LULUS (ditetapkan SEBELUM pengukuran, tidak boleh
// digeser): arah 100/100  &&  koherensi rata-rata >= 0.90  &&
// tidak ada skenario dengan skor cek < 2/4.
//
// Pakai:
//   bun scripts/ujian_prareg100.ts --fase kunci --ns pr100 --tag r1
//   bun scripts/ujian_prareg100.ts --fase buka --ns pr100 --tag r1
// ============================================================

import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { simKlTrade, KL_VISIBLE, type KlExam, type KlPlan } from '../src/lib/exam/kompleks-forge'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { trajektoriVonis, vonisUlang, PRAKIRA_BRAIN_VERSI } from '../src/lib/exam/prareg-brain'
import {
  LedgerPra, tambahEntri, verifikasiRantai, nilaiKoherensi, H_CEK, sha256Hex, GENESIS,
} from '../src/lib/exam/prareg'
import { buildSgVision } from '../src/lib/exam/stophunt-brain'
import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const OUTDIR = 'research/pra-registrasi'

interface Args { fase: string; ns: string; tag: string; ledger: string; outdir: string }

function parseArgs(): Args {
  const a: Args = { fase: '', ns: 'pr100', tag: 'r1', ledger: '', outdir: OUTDIR }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--fase') a.fase = argv[++i]
    else if (argv[i] === '--ns') a.ns = argv[++i]
    else if (argv[i] === '--tag') a.tag = argv[++i]
    else if (argv[i] === '--ledger') a.ledger = argv[++i]
    else if (argv[i] === '--outdir') a.outdir = argv[++i]
  }
  return a
}

// ------------------------------------------------------------
// FASE KUNCI
// ------------------------------------------------------------
function faseKunci(a: Args): void {
  mkdirSync(a.outdir, { recursive: true })
  const exams: KlExam[] = forgeKlSuite(a.ns)
  const led: LedgerPra = {
    protokol: 'PRA-REGISTRASI-MICAPROFITA',
    ns: a.ns, tag: a.tag, versiOtak: PRAKIRA_BRAIN_VERSI,
    dibuat: new Date().toISOString(), jumlah: 0, rantai: [],
  }
  for (const u of exams) {
    const visible = u.candles.slice(0, KL_VISIBLE) // HANYA visible — horizon dilarang
    const v = arahVonis(visible)
    const t = trajektoriVonis(v, visible)
    tambahEntri(led, {
      nomor: u.num, ns: a.ns, seed: u.seed, simbol: `KL-${u.fam}`,
      arah: t.arah, kepastian: t.kepastian, cek: t.cek, dasar: t.dasar,
      versiOtak: t.versi, waktu: new Date().toISOString(),
    })
  }
  const ver = verifikasiRantai(led)
  if (!ver.ok) {
    console.error(`FATAL: rantai ledger rusak segera setelah pembuatan (indeks ${ver.indeksRusak})`)
    process.exit(1)
  }
  const file = join(a.outdir, `ledger-${a.ns}-${a.tag}.json`)
  writeFileSync(file, JSON.stringify(led, null, 1))
  console.log(`=== FASE KUNCI [${a.ns}/${a.tag}] otak ${PRAKIRA_BRAIN_VERSI} ===`)
  console.log(`terkunci   : ${led.jumlah} prediksi (arah + kepastian + trajektori 4 titik cek h=${H_CEK.join('/')})`)
  console.log(`rantai     : VERIFIKASI OK · genesis ${GENESIS.slice(0, 12)}… · kepala ${led.rantai[led.rantai.length - 1].hash.slice(0, 16)}…`)
  console.log(`ledger     : ${file} (ditulis SEBELUM horizon dibuka)`)
  console.log(`waktu      : ${led.dibuat}`)
}

// ------------------------------------------------------------
// FASE BUKA
// ------------------------------------------------------------
interface BarisBuka {
  num: number; fam: string; label: string; diff: string; seed: string
  truth: string; arahKunci: string; arahBenar: boolean; kepastian: number
  cekKunci: string[]; moveAtr: number[]; cekHasil: { h: number; commit: string; terwujud: string; moveAtr: number; cocok: boolean }[]
  skorCek: number; rasioKoherensi: number
  waktuKunci: string; hashKunci: string
  entry: number; exit: number | null; stopHit: boolean; targetHit: boolean; hitCandle: number
  feeBuy: number | null; feeSell: number | null; grossPct: number | null; netPct: number | null
  berhasil: boolean | null; movePct: number
  vonisUlangSama: boolean; alasan: string
}

function faseBuka(a: Args): void {
  const fileLed = a.ledger || join(a.outdir, `ledger-${a.ns}-${a.tag}.json`)
  const raw = readFileSync(fileLed, 'utf-8')
  const led = JSON.parse(raw) as LedgerPra
  if (led.protokol !== 'PRA-REGISTRASI-MICAPROFITA') {
    console.error('FATAL: bukan ledger pra-registrasi'); process.exit(1)
  }
  const ver = verifikasiRantai(led)
  if (!ver.ok) {
    console.error(`FATAL: RANTAI RUSAK pada indeks ${ver.indeksRusak} — ledger tidak sahih`); process.exit(1)
  }
  const exams: KlExam[] = forgeKlSuite(led.ns)
  const byNomor = new Map<number, KlExam>(exams.map((u) => [u.num, u]))
  const shaLedger = sha256Hex(raw)

  const rows: BarisBuka[] = []
  let integritasOtak = true
  for (const entri of led.rantai) {
    const k = entri.kunci
    const u = byNomor.get(k.nomor)
    if (!u) { console.error(`FATAL: nomor ${k.nomor} tak ditemukan di suite ${led.ns}`); process.exit(1) }
    if (u.seed !== k.seed) {
      console.error(`FATAL: seed #${k.nomor} tidak cocok (ledger ${k.seed} vs suite ${u.seed}) — suite tertukar`); process.exit(1)
    }
    const visible = u.candles.slice(0, KL_VISIBLE)
    const v = vonisUlang(visible)
    if (v.arah !== k.arah || v.kepastian !== k.kepastian) integritasOtak = false

    const atr = Math.max(buildSgVision(visible).atr, 1e-9)
    const moveAtr = H_CEK.map((h) => (u.candles[KL_VISIBLE + h - 1].c - u.entry) / atr)
    const koh = nilaiKoherensi(k.cek, moveAtr)

    const plan: KlPlan = {
      aksi: v.eksekusi.aksi, arah: v.arah,
      targetPct: v.eksekusi.targetPct, stopPct: v.eksekusi.stopPct,
      triggerLevel: v.eksekusi.triggerLevel,
    }
    const l = simKlTrade(plan, u.entry, u.candles.slice(KL_VISIBLE), u.bait)

    rows.push({
      num: k.nomor, fam: u.fam, label: u.label, diff: u.diff, seed: u.seed,
      truth: u.truth, arahKunci: k.arah, arahBenar: k.arah === u.truth, kepastian: k.kepastian,
      cekKunci: [...k.cek], moveAtr: moveAtr.map((m) => Math.round(m * 1000) / 1000),
      cekHasil: koh.cek.map((c) => ({ h: c.h, commit: c.commit, terwujud: c.terwujud, moveAtr: c.moveAtr, cocok: c.cocok })),
      skorCek: koh.skor, rasioKoherensi: koh.rasio,
      waktuKunci: k.waktu, hashKunci: entri.hash,
      entry: u.entry, exit: l.exit, stopHit: l.stopHit, targetHit: l.targetHit, hitCandle: l.hitCandle,
      feeBuy: l.feeBuy, feeSell: l.feeSell, grossPct: l.grossPct, netPct: l.netPct,
      berhasil: l.berhasil, movePct: u.movePct,
      vonisUlangSama: v.arah === k.arah && v.kepastian === k.kepastian,
      alasan: (v.alasan[0] || '').slice(0, 160),
    })
  }

  const total = rows.length
  const benar = rows.filter((r) => r.arahBenar).length
  const kohMean = rows.reduce((s, r) => s + r.rasioKoherensi, 0) / total
  const skorDist = [4, 3, 2, 1, 0].map((s) => ({ skor: s, jumlah: rows.filter((r) => r.skorCek === s).length }))
  const minSkor = Math.min(...rows.map((r) => r.skorCek))
  const netSum = rows.reduce((s, r) => s + (r.netPct ?? 0), 0)
  const lulus = benar === total && kohMean >= 0.9 && minSkor >= 2 && integritasOtak

  const hasil = {
    protokol: 'PRA-REGISTRASI-BUKA-MICAPROFITA',
    ns: led.ns, tag: led.tag, versiOtak: led.versiOtak,
    waktuBuka: new Date().toISOString(),
    ledger: { file: fileLed, sha256: shaLedger, verifikasi: ver, entri: led.jumlah, dibuat: led.dibuat },
    bar: { arah: '100/100', koherensiMin: 0.9, skorCekMin: 2 },
    ringkasan: {
      total, arahBenar: benar, arahAkurasi: Math.round((benar / total) * 10000) / 100,
      koherensiMean: Math.round(kohMean * 10000) / 10000, skorDist, minSkor,
      integritasOtak, berhasilTrade: rows.filter((r) => r.berhasil === true).length,
      likuidasi: rows.filter((r) => r.stopHit).length,
      netSum: Math.round(netSum * 100) / 100,
      LULUS: lulus,
    },
    ujian: rows,
  }
  mkdirSync(a.outdir, { recursive: true })
  const file = join(a.outdir, `hasil-${led.ns}-${led.tag}.json`)
  writeFileSync(file, JSON.stringify(hasil, null, 1))

  console.log(`=== FASE BUKA [${led.ns}/${led.tag}] otak ${led.versiOtak} ===`)
  console.log(`ledger     : ${fileLed} · sha256 ${shaLedger.slice(0, 16)}… · rantai OK (${led.jumlah} entri, dikunci ${led.dibuat})`)
  console.log(`integritas : vonis-ulang-beku ${integritasOtak ? 'IDENTIK' : 'BEDA (FATAL)'}`)
  console.log(`ARAH       : ${benar}/${total} = ${Math.round((benar / total) * 10000) / 100}%`)
  console.log(`KOHERENSI  : rata ${(kohMean * 100).toFixed(2)}% · min skor ${minSkor}/4 · dist ${skorDist.map((d) => `${d.skor}:${d.jumlah}`).join(' ')}`)
  console.log(`TRADE      : net ${Math.round(netSum * 100) / 100}% · berhasil ${rows.filter((r) => r.berhasil === true).length} · likuidasi ${rows.filter((r) => r.stopHit).length}`)
  console.log(`VONIS BAR  : ${lulus ? 'LULUS ✔ (arah 100% + koherensi ≥90% + min skor ≥2/4)' : 'BELUM LULUS ✘'}`)
  const gagalArah = rows.filter((r) => !r.arahBenar)
  if (gagalArah.length) {
    console.log(`\nGAGAL ARAH (${gagalArah.length}):`)
    for (const g of gagalArah) console.log(`  #${g.num} ${g.fam} [${g.diff}] truth=${g.truth} kunci=${g.arahKunci} kepastian=${g.kepastian} net=${g.netPct}%`)
  }
  const kohRendah = rows.filter((r) => r.skorCek < 4).sort((x, y) => x.skorCek - y.skorCek)
  if (kohRendah.length) {
    console.log(`\nKOHERENSI < 4/4 (${kohRendah.length} skenario) — bahan bedah:`)
    for (const g of kohRendah.slice(0, 25)) {
      const det = g.cekHasil.map((c) => `h${c.h}:${c.commit}>${c.terwujud}${c.cocok ? '' : '✘'}`).join(' ')
      console.log(`  #${g.num} ${g.fam} [${g.diff}] truth=${g.truth} skor=${g.skorCek}/4 ${det}`)
    }
  }
  console.log(`disimpan: ${file}`)
}

function main(): void {
  const a = parseArgs()
  if (a.fase === 'kunci') { faseKunci(a); return }
  if (a.fase === 'buka') { faseBuka(a); return }
  console.error('pakai: --fase kunci | --fase buka'); process.exit(1)
}

main()
