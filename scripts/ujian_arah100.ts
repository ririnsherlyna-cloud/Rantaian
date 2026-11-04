// ============================================================
// RUNNER UJIAN KEPASTIAN-ARAH — 100 skenario KOMPLEKS (tiap
// skenario memuat KELIMA aspek sekaligus). Otak WAJIB memvonis
// BINER: BUY atau SELL (tanpa SKIP) + KEPASTIAN 0..100 berbasis
// DEWAN BUKTI 8 DIMENSI.
//
// Dinilai:
//   1. KEPASTIAN ARAH — vonis vs arah kebenaran dari data
//   2. NET profit/loss — fee buy 0.1% + fee sell 0.1% WAJIB,
//      stop wajib (bisa dilikuidasi), eksekusi konservatif
//   3. KALIBRASI — kepastian harus jujur: vonis "pasti" harus
//      lebih sering benar daripada vonis ragu
//   + 12 field wajib Guru per ujian + dewan bukti lengkap
//
// Pakai: bun scripts/ujian_arah100.ts --ns ar100 --versi 1.0 \
//          --tag ronde1 [--save r1.json] [--core] [--ringkas]
//        bun scripts/ujian_arah100.ts --multi ar-hakim:10 ...
// ============================================================

import { forgeKlSuite } from '../src/lib/exam/kompleks-suite'
import { simKlTrade, KL_VISIBLE, FEE_BUY, FEE_SELL, type KlExam, type KlLedger, type KlPlan } from '../src/lib/exam/kompleks-forge'
import { arahVonis, arahCore, ARAH_BRAIN_VERSI, type VonisArah } from '../src/lib/exam/arah-brain'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface Args { ns: string; versi: string; tag: string; save: string; core: boolean; ringkas: boolean; multi: string; outdir: string }

function parseArgs(): Args {
  const a: Args = { ns: 'ar100', versi: ARAH_BRAIN_VERSI, tag: 'ronde', save: '', core: false, ringkas: false, multi: '', outdir: 'research/ujian-arah' }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ns') a.ns = argv[++i]
    else if (argv[i] === '--versi') a.versi = argv[++i]
    else if (argv[i] === '--tag') a.tag = argv[++i]
    else if (argv[i] === '--save') a.save = argv[++i]
    else if (argv[i] === '--core') a.core = true
    else if (argv[i] === '--ringkas') a.ringkas = true
    else if (argv[i] === '--multi') a.multi = argv[++i]
    else if (argv[i] === '--outdir') a.outdir = argv[++i]
  }
  return a
}

const potong = (s: string, m: number) => (s.length <= m ? s : s.slice(0, m) + '…')

interface BarisUjian {
  num: number; fam: string; label: string; diff: string; seed: string
  truth: string; vonis: string; arahBenar: boolean
  kepastian: number; skorArah: number; konsensus: number; lapisan: string
  aksiKl: string; arahKl: string; pelajaranKl: string[]
  entry: number; exit: number; stop: number; target: number
  targetHit: boolean; stopHit: boolean; hitCandle: number
  feeBuy: number; feeSell: number; grossPct: number; netPct: number; berhasil: boolean
  movePct: number; mfePct: number; baitMfePct: number
  aspek5: KlExam['aspek']
  bukti: { id: string; label: string; vote: string; kekuatan: number; cara: string }[]
  buktiKunci: string[]
  alasan: string
}

function ujiSatu(u: KlExam, core: boolean, ringkas: boolean): BarisUjian {
  const visible = u.candles.slice(0, KL_VISIBLE)
  const horizon = u.candles.slice(KL_VISIBLE)
  const v: VonisArah = core ? arahCore(visible) : arahVonis(visible)
  const plan: KlPlan = {
    aksi: v.eksekusi.aksi, // MANDAT: vonis biner; eksekusi disiplin (AR-L1: order trigger bila tracker menunggu konfirmasi)
    arah: v.arah,
    targetPct: v.eksekusi.targetPct,
    stopPct: v.eksekusi.stopPct,
    triggerLevel: v.eksekusi.triggerLevel,
  }
  const led: KlLedger = simKlTrade(plan, u.entry, horizon, u.bait)
  const m = (x: number | null) => x ?? 0
  return {
    num: u.num, fam: u.fam, label: u.label, diff: u.diff, seed: u.seed,
    truth: u.truth, vonis: v.vonis, arahBenar: v.arah === u.truth,
    kepastian: v.kepastian, skorArah: Math.round(v.skorArah * 10) / 10, konsensus: Math.round(v.konsensus * 100) / 100, lapisan: v.lapisan,
    aksiKl: v.kl.aksi, arahKl: v.kl.arah, pelajaranKl: v.kl.pelajaran,
    entry: u.entry, exit: m(led.exit), stop: m(led.stop), target: m(led.target),
    targetHit: led.targetHit, stopHit: led.stopHit, hitCandle: led.hitCandle,
    feeBuy: m(led.feeBuy), feeSell: m(led.feeSell), grossPct: Math.round(m(led.grossPct) * 10000) / 10000, netPct: Math.round(m(led.netPct) * 10000) / 10000,
    berhasil: led.berhasil === true,
    movePct: Math.round(u.movePct * 100) / 100, mfePct: Math.round(u.mfePct * 100) / 100, baitMfePct: Math.round(u.baitMfePct * 100) / 100,
    aspek5: u.aspek,
    bukti: v.bukti.map((b) => ({ id: b.id, label: b.label, vote: b.vote, kekuatan: Math.round(b.kekuatan * 100) / 100, cara: ringkas ? potong(b.cara, 110) : b.cara })),
    buktiKunci: v.buktiKunci.map((s) => (ringkas ? potong(s, 130) : s)),
    alasan: potong(v.alasan.join(' || '), ringkas ? 400 : 1200),
  }
}

interface Hasil {
  meta: Record<string, unknown>
  ringkasan: Record<string, unknown>
  ujian: BarisUjian[]
}

function jalankanSuite(ns: string, a: Args): Hasil {
  const suite = forgeKlSuite(ns)
  const ujian = suite.map((u) => ujiSatu(u, a.core, a.ringkas))
  const total = ujian.length
  const benar = ujian.filter((x) => x.arahBenar).length
  const netSum = ujian.reduce((s, x) => s + x.netPct, 0)
  const berhasil = ujian.filter((x) => x.berhasil).length
  const likuidasi = ujian.filter((x) => x.stopHit).length
  const certBenar = ujian.filter((x) => x.arahBenar)
  const certSalah = ujian.filter((x) => !x.arahBenar)
  const mean = (arr: BarisUjian[]) => (arr.length ? arr.reduce((s, x) => s + x.kepastian, 0) / arr.length : 0)
  const BUCKETS = [[50, 60], [60, 70], [70, 80], [80, 90], [90, 101]] as const
  const bucket = BUCKETS.map(([lo, hi]) => {
    const g = ujian.filter((x) => x.kepastian >= lo && x.kepastian < hi)
    return {
      rentang: `${lo}-${hi === 101 ? '100' : hi - 1}`,
      jumlah: g.length,
      benar: g.filter((x) => x.arahBenar).length,
      akurasi: g.length ? Math.round((g.filter((x) => x.arahBenar).length / g.length) * 10000) / 100 : null,
      netSum: Math.round(g.reduce((s, x) => s + x.netPct, 0) * 100) / 100,
    }
  })
  const byFam = new Map<string, { fam: string; total: number; benar: number; net: number }>()
  for (const x of ujian) {
    const e = byFam.get(x.fam) ?? { fam: x.fam, total: 0, benar: 0, net: 0 }
    e.total++; if (x.arahBenar) e.benar++; e.net += x.netPct
    byFam.set(x.fam, e)
  }
  const aspekLengkap = ujian.filter((x) =>
    x.aspek5.bullTrap && x.aspek5.bearTrap && x.aspek5.pump && x.aspek5.dump && x.aspek5.falseBreakout && x.aspek5.stopHunt).length
  return {
    meta: {
      ns, versi: a.versi, core: a.core, tag: a.tag, tanggal: new Date().toISOString(),
      feeBuyPct: FEE_BUY * 100, feeSellPct: FEE_SELL * 100,
      protokol: '60 visible + 14 horizon, anti-hindsight; vonis BINER BUY/SELL wajib; stop wajib',
      sumberSkenario: 'forgeKlSuite kompleks 5-aspek (10 keluarga x 5 NAIK + 5 TURUN)',
    },
    ringkasan: {
      total, arahBenar: benar, arahAkurasi: Math.round((benar / total) * 10000) / 100,
      netSum: Math.round(netSum * 100) / 100, netMean: Math.round((netSum / total) * 10000) / 10000,
      berhasil, likuidasi,
      kepastianMeanBenar: Math.round(mean(certBenar) * 10) / 10,
      kepastianMeanSalah: Math.round(mean(certSalah) * 10) / 10,
      kalibrasiBenarMinusSalah: Math.round((mean(certBenar) - mean(certSalah)) * 10) / 10,
      bucket, aspekLengkapDariTotal: aspekLengkap,
      perKeluarga: [...byFam.values()].map((e) => ({ ...e, net: Math.round(e.net * 100) / 100 })),
    },
    ujian,
  }
}

function main() {
  const a = parseArgs()
  mkdirSync(a.outdir, { recursive: true })
  if (a.multi) {
    // format --multi prefix:count -> jalankan prefix1..prefixN, gabung
    const [prefix, cntS] = a.multi.split(':')
    const cnt = parseInt(cntS || '10', 10)
    const semua: Hasil[] = []
    for (let i = 1; i <= cnt; i++) {
      const h = jalankanSuite(`${prefix}${i}`, a)
      semua.push(h)
      console.log(`  [${prefix}${i}] arah ${h.ringkasan.arahBenar}/${h.ringkasan.total} (${h.ringkasan.arahAkurasi}%) · net ${h.ringkasan.netSum}% · berhasil ${h.ringkasan.berhasil} · likuidasi ${h.ringkasan.likuidasi}`)
    }
    const gab: Hasil = {
      meta: { ...semua[0].meta, ns: `${prefix}1..${prefix}${cnt}`, multi: cnt },
      ringkasan: (() => {
        const ujian = semua.flatMap((h) => h.ujian)
        const total = ujian.length
        const benar = ujian.filter((x) => x.arahBenar).length
        const netSum = ujian.reduce((s, x) => s + x.netPct, 0)
        const certB = ujian.filter((x) => x.arahBenar)
        const certS = ujian.filter((x) => !x.arahBenar)
        const mb = certB.length ? certB.reduce((s, x) => s + x.kepastian, 0) / certB.length : 0
        const ms = certS.length ? certS.reduce((s, x) => s + x.kepastian, 0) / certS.length : 0
        const BUCKETS = [[50, 60], [60, 70], [70, 80], [80, 90], [90, 101]] as const
        return {
          total, arahBenar: benar, arahAkurasi: Math.round((benar / total) * 10000) / 100,
          netSum: Math.round(netSum * 100) / 100, netMean: Math.round((netSum / total) * 10000) / 10000,
          berhasil: ujian.filter((x) => x.berhasil).length, likuidasi: ujian.filter((x) => x.stopHit).length,
          kepastianMeanBenar: Math.round(mb * 10) / 10, kepastianMeanSalah: Math.round(ms * 10) / 10,
          kalibrasiBenarMinusSalah: Math.round((mb - ms) * 10) / 10,
          bucket: BUCKETS.map(([lo, hi]) => {
            const g = ujian.filter((x) => x.kepastian >= lo && x.kepastian < hi)
            return { rentang: `${lo}-${hi === 101 ? '100' : hi - 1}`, jumlah: g.length, benar: g.filter((x) => x.arahBenar).length, akurasi: g.length ? Math.round((g.filter((x) => x.arahBenar).length / g.length) * 10000) / 100 : null, netSum: Math.round(g.reduce((s, x) => s + x.netPct, 0) * 100) / 100 }
          }),
          perSuite: semua.map((h) => ({ ns: h.meta.ns, ...(h.ringkasan as Record<string, unknown>) })),
        }
      })(),
      ujian: semua.flatMap((h) => h.ujian),
    }
    const save = a.save || join(a.outdir, `${prefix}1-${cnt}-${a.tag}.json`)
    writeFileSync(save, JSON.stringify(gab, null, 1))
    const r = gab.ringkasan as Record<string, number>
    console.log(`GABUNGAN ${prefix}1..${cnt}: arah ${r.arahBenar}/${r.total} = ${r.arahAkurasi}% · net ${r.netSum}% · berhasil ${r.berhasil} · likuidasi ${r.likuidasi} · kalibrasi +${r.kalibrasiBenarMinusSalah}`)
    console.log(`disimpan: ${save}`)
    return
  }
  const h = jalankanSuite(a.ns, a)
  const save = a.save || join(a.outdir, `${a.ns}-${a.tag}.json`)
  writeFileSync(save, JSON.stringify(h, null, 1))
  const r = h.ringkasan as Record<string, any>
  console.log(`=== UJIAN KEPASTIAN-ARAH [${a.ns}] versi ${a.versi}${a.core ? ' (CORE NAIF)' : ''} ===`)
  console.log(`ARAH BENAR : ${r.arahBenar}/${r.total} = ${r.arahAkurasi}%`)
  console.log(`NET        : ${r.netSum}% (rata ${r.netMean}%/ujian) · berhasil ${r.berhasil} · likuidasi ${r.likuidasi}`)
  console.log(`KALIBRASI  : kepastian benar ${r.kepastianMeanBenar} vs salah ${r.kepastianMeanSalah} (selisih ${r.kalibrasiBenarMinusSalah})`)
  for (const b of r.bucket) console.log(`  kepastian ${b.rentang}: ${String(b.jumlah).padStart(3)} ujian -> akurasi ${b.akurasi === null ? '—' : b.akurasi + '%'}, net ${b.netSum}%`)
  console.log(`ASPEK-5 lengkap: ${r.aspekLengkapDariTotal}/${r.total}`)
  const gagal = h.ujian.filter((x) => !x.arahBenar)
  if (gagal.length) {
    console.log(`\nGAGAL ARAH (${gagal.length}):`)
    for (const g of gagal) console.log(`  #${g.num} ${g.fam} [${g.diff}] truth=${g.truth} vonis=${g.vonis} kepastian=${g.kepastian} kl=${g.aksiKl}/${g.arahKl} net=${g.netPct}%`)
  }
  console.log(`disimpan: ${save}`)
}

main()
