// ============================================================
// EVALUATOR UJIAN SIMULASI — pemberi vonis anti-hindsight.
//
// Yang dinilai BUKAN "terlihat benar setelah kejadian", melainkan:
//  1. Akurasi keputusan yang dibuat dengan informasi jam 1..144 saja
//  2. Brier score — apakah keyakinannya jujur
//  3. Kalibrasi per-bucket keyakinan
//  4. Peta kekuatan/kelemahan per rezim pasar
//  5. "Tembakan yakin tapi meleset" — kesombongan berbiaya mahal
// ============================================================

import type { Contestant, Prediction } from './contestants'
import type { ArchMeta, ExamTest } from './generator'
import { clamp } from './indicators'

export interface Grade {
  test: ExamTest
  pred: Prediction
  correct: boolean
  brier: number
  conv: number // ±(2·conf−1): skor tertimbang keyakinan
}

export interface CalBucket {
  label: string
  lo: number
  hi: number
  n: number
  avgConf: number
  acc: number
}

export type Verdict = 'KUAT' | 'SEDANG' | 'LEMAH' | 'TIPIS'

export interface RegimeGrade {
  archId: string
  label: string
  family: ArchMeta['family']
  n: number
  acc: number
  avgConf: number
  brier: number
  verdict: Verdict
}

export interface Finding {
  severity: 'FATAL' | 'SERIUS' | 'PERINGATAN' | 'KUAT'
  title: string
  detail: string
  rec: string
}

export interface ContestantResult {
  contestant: Contestant
  grades: Grade[]
  acc: number
  brier: number
  convTotal: number
  convCurve: number[]
  upShare: number
  cal: CalBucket[]
  byRegime: RegimeGrade[]
  hardFails: Grade[]
  findings: Finding[]
  streakBest: number
  streakWorst: number
  labelNaikShare: number
}

const BUCKETS: { label: string; lo: number; hi: number }[] = [
  { label: '50–60%', lo: 0.5, hi: 0.6 },
  { label: '60–70%', lo: 0.6, hi: 0.7 },
  { label: '70–80%', lo: 0.7, hi: 0.8 },
  { label: '80–90%', lo: 0.8, hi: 0.9 },
  { label: '90–100%', lo: 0.9, hi: 1.001 },
]

const COINFLIP_ARCH = new Set(['konsolidasi', 'whipsaw', 'shock-berita'])

export function gradeContestant(c: Contestant, tests: ExamTest[]): ContestantResult {
  const grades: Grade[] = tests.map((test) => {
    const visible = test.candles.slice(0, test.candles.length - 24) // keras: buang horizon
    const pred = c.predict(visible, test)
    const correct = pred.dir === test.label
    const y = test.label === 'NAIK' ? 1 : 0
    const brier = (pred.pUp - y) * (pred.pUp - y)
    const conv = (correct ? 1 : -1) * (2 * pred.conf - 1)
    return { test, pred, correct, brier, conv }
  })
  return assembleResult(c, grades)
}

/** agregasi + diagnosis dari grade siap-pakai (dipakai juga oleh model terlatih) */
export function assembleResult(c: Contestant, grades: Grade[]): ContestantResult {
  const n = grades.length
  const nCorrect = grades.filter((g) => g.correct).length
  const acc = n ? nCorrect / n : 0
  const brier = n ? grades.reduce((a, g) => a + g.brier, 0) / n : 0
  const upShare = n ? grades.filter((g) => g.pred.dir === 'NAIK').length / n : 0

  const convCurve: number[] = []
  let cum = 0
  for (const g of grades) {
    cum += g.conv
    convCurve.push(cum)
  }
  const convTotal = cum

  const cal: CalBucket[] = BUCKETS.map((b) => {
    const inB = grades.filter((g) => g.pred.conf >= b.lo && g.pred.conf < b.hi)
    return {
      label: b.label,
      lo: b.lo,
      hi: b.hi,
      n: inB.length,
      avgConf: inB.length ? inB.reduce((a, g) => a + g.pred.conf, 0) / inB.length : 0,
      acc: inB.length ? inB.filter((g) => g.correct).length / inB.length : 0,
    }
  })

  const archMap = new Map<string, ArchMeta>()
  for (const g of grades) archMap.set(g.test.arch.id, g.test.arch)
  const byRegime: RegimeGrade[] = [...archMap.keys()].map((id) => {
    const gs = grades.filter((g) => g.test.arch.id === id)
    const a = gs.length ? gs.filter((g) => g.correct).length / gs.length : 0
    const ac = gs.length ? gs.reduce((x, g) => x + g.pred.conf, 0) / gs.length : 0
    const br = gs.length ? gs.reduce((x, g) => x + g.brier, 0) / gs.length : 0
    const verdict: Verdict =
      gs.length < 5 ? 'TIPIS' : a >= 0.6 ? 'KUAT' : a >= 0.46 ? 'SEDANG' : 'LEMAH'
    return {
      archId: id,
      label: archMap.get(id)!.label,
      family: archMap.get(id)!.family,
      n: gs.length,
      acc: a,
      avgConf: ac,
      brier: br,
      verdict,
    }
  })
  byRegime.sort((x, y) => x.acc - y.acc) // terlemah dulu — celah di depan

  const hardFails = grades.filter((g) => !g.correct && g.pred.conf >= 0.72)

  let streakBest = 0
  let streakWorst = 0
  let cur = 0
  for (const g of grades) {
    cur = g.correct ? Math.max(1, cur + 1) : Math.min(-1, cur - 1)
    streakBest = Math.max(streakBest, cur)
    streakWorst = Math.min(streakWorst, cur)
  }

  const labelNaikShare = n ? grades.filter((g) => g.test.label === 'NAIK').length / n : 0
  const findings = buildFindings(c.id, {
    acc,
    brier,
    upShare,
    cal,
    byRegime,
    hardFails,
    n,
    labelNaikShare,
  })

  return {
    contestant: c,
    grades,
    acc,
    brier,
    convTotal,
    convCurve,
    upShare,
    cal,
    byRegime,
    hardFails,
    findings,
    streakBest,
    streakWorst,
    labelNaikShare,
  }
}

function buildFindings(
  cid: string,
  x: {
    acc: number
    brier: number
    upShare: number
    cal: CalBucket[]
    byRegime: RegimeGrade[]
    hardFails: Grade[]
    n: number
    labelNaikShare: number
  },
): Finding[] {
  const f: Finding[] = []

  if (x.acc < 0.5) {
    f.push({
      severity: 'FATAL',
      title: 'Di bawah lempar koin',
      detail: `Akurasi total ${(x.acc * 100).toFixed(1)}% dari ${x.n} ujian — lebih buruk dari Dadu (50%). Kemahiran inti gagal.`,
      rec: 'Bongkar ulang bobot ansambel: jalankan ablation per faktor, buang faktor anti-alpha, uji ulang suite yang sama.',
    })
  } else if (x.acc < 0.56) {
    f.push({
      severity: 'SERIUS',
      title: 'Tepi masih tipis',
      detail: `Akurasi ${(x.acc * 100).toFixed(1)}% — di atas koin, tapi belum setara kemahiran trader senior (target ≥ 60% dengan keyakinan jujur).`,
      rec: 'Perkuat sumber sinyal: struktur swing multi-skala + konteks volatilitas BTC per jam sebagai faktor ke-8.',
    })
  } else if (x.acc >= 0.65) {
    f.push({
      severity: 'KUAT',
      title: 'Tepi nyata terbukti',
      detail: `Akurasi ${(x.acc * 100).toFixed(1)}% pada ${x.n} pasar buta — jauh di atas lempar koin.`,
      rec: 'Pertahankan. Lanjutkan pengujian berkala untuk memastikan tepi tidak tergerus.',
    })
  }

  for (const r of x.byRegime) {
    if (r.verdict === 'LEMAH') {
      f.push({
        severity: 'SERIUS',
        title: `Celah rezim: ${r.label}`,
        detail: `Akurasi ${(r.acc * 100).toFixed(1)}% (n=${r.n}), keyakinan rata-rata ${(r.avgConf * 100).toFixed(0)}%. Otak salah membaca karakter rezim ini.`,
        rec: recForRegime(r.archId),
      })
    }
  }

  for (const b of x.cal) {
    if (b.n >= 8 && b.avgConf - b.acc > 0.12) {
      f.push({
        severity: 'SERIUS',
        title: `Kalibrasi bohong di bucket ${b.label}`,
        detail: `Klaim keyakinan ${(b.avgConf * 100).toFixed(0)}% tapi realita hanya ${(b.acc * 100).toFixed(0)}% (n=${b.n}). Gap ${(100 * (b.avgConf - b.acc)).toFixed(0)} poin.`,
        rec: 'Perkuat penyusutan keyakinan (shrinkage) atau turunkan penguat sigmoid saat sinyal saling bertentangan.',
      })
    } else if (b.n >= 8 && b.acc - b.avgConf > 0.1 && b.acc > 0.75) {
      f.push({
        severity: 'PERINGATAN',
        title: `Terlalu rendah hati di bucket ${b.label}`,
        detail: `Realita ${(b.acc * 100).toFixed(0)}% tapi hanya yakin ${(b.avgConf * 100).toFixed(0)}% — profit size tertinggal.`,
        rec: 'Naikkan penguat saat ≥4 faktor searah dan rezim cocok.',
      })
    }
  }

  const upBias = x.upShare - x.labelNaikShare
  if (Math.abs(upBias) > 0.15) {
    f.push({
      severity: 'PERINGATAN',
      title: upBias > 0 ? 'Bias naik (bull-biased)' : 'Bias turun (bear-biased)',
      detail: `${(x.upShare * 100).toFixed(0)}% keputusan NAIK padahal label NAIK hanya ${(x.labelNaikShare * 100).toFixed(0)}% — selisih ${(upBias * 100).toFixed(0)} poin.`,
      rec: 'Sentralisasi faktor: kurangi bobot tren saat ADX rendah; audit ambang rezim.',
    })
  }

  if (x.hardFails.length >= 8) {
    const worst = [...x.hardFails].sort((a, b) => b.pred.conf - a.pred.conf)[0]
    f.push({
      severity: 'SERIUS',
      title: `Nembak yakin tapi meleset: ${x.hardFails.length} kasus`,
      detail: `Keyakinan ≥72% namun salah, termasuk ${worst.test.id} (${worst.test.arch.label}) yakin ${(worst.pred.conf * 100).toFixed(0)}% padahal ${worst.test.label} ${(worst.test.outcomeRet * 100).toFixed(1)}%.`,
      rec: 'Wajibkan kesepakatan faktor: blok keyakinan >80% bila ≥2 faktor utama bertentangan.',
    })
  }

  const coin = x.byRegime.filter((r) => COINFLIP_ARCH.has(r.archId))
  const coinN = coin.reduce((a, r) => a + r.n, 0)
  const coinAcc = coinN ? coin.reduce((a, r) => a + r.acc * r.n, 0) / coinN : 0
  const coinConf = coinN ? coin.reduce((a, r) => a + r.avgConf * r.n, 0) / coinN : 0
  if (coinN > 0 && coinConf > 0.62 && coinAcc < 0.56) {
    f.push({
      severity: 'PERINGATAN',
      title: 'Sombong di medan nyaris acak',
      detail: `Pada rezim konsolidasi/cambuk/guncangan (n=${coinN}): keyakinan rata-rata ${(coinConf * 100).toFixed(0)}% vs realita ${(coinAcc * 100).toFixed(0)}%. Di medan tanpa tepi, keyakinan = kemerosotan.`,
      rec: 'Detektor "tanpa-tepi": bila ADX<18 & bandwidth sempit & volume datar → turunkan keyakinan mendekati 50%.',
    })
  }

  const best = x.byRegime.filter((r) => r.n >= 5).sort((a, b) => b.acc - a.acc)[0]
  if (best && best.acc >= 0.72) {
    f.push({
      severity: 'KUAT',
      title: `Kemahiran terkuat: ${best.label}`,
      detail: `Akurasi ${(best.acc * 100).toFixed(1)}% (n=${best.n}) — rezim ini adalah mesin uangnya.`,
      rec: 'Jaga & dalami: tambah variasi seed rezim ini di suite berikutnya untuk memastikan bukan kebetulan.',
    })
  }

  if (cid === 'MICAPROFITA' && x.brier > 0.26) {
    f.push({
      severity: 'PERINGATAN',
      title: 'Brier tinggi',
      detail: `Brier ${x.brier.toFixed(3)} (>0.26) — prediksi probabilitas kurang informatif dibanding "selalu jawab 50/50".`,
      rec: 'Kalibrasi ulang peta skor→probabilitas dengan isotonic-style shrinkage per rezim.',
    })
  }

  return f.sort((a, b) => rank(a.severity) - rank(b.severity))
}

function rank(s: Finding['severity']): number {
  return s === 'FATAL' ? 0 : s === 'SERIUS' ? 1 : s === 'PERINGATAN' ? 2 : 3
}

function recForRegime(archId: string): string {
  switch (archId) {
    case 'parabolik':
      return 'Pasang detektor blowoff: percepatan kemiringan EMA9/EMA21 + RSI>78 + volume klimaks → paksa bias TURUN setelah lilin klimaks.'
    case 'distribusi':
      return 'Pantau Volume vs momentum: harga mendatar di puncak + OBV melemah + lower-high berturut → turunkan keyakinan NAIK.'
    case 'pump-dump':
      return 'Sensor "terlalu bagus untuk benar": kenaikan >25% dalam 48 jam → aktifkan mode waspada, jangan ikut momentum telat.'
    case 'whipsaw':
      return 'Filter cambuk: ATR% tinggi + tanpa konsistensi arah → keyakinan mendekati 50%, ukuran posisi nol.'
    case 'konsolidasi':
      return 'Detektor range: bandwidth sempit + ADX<18 → mainkan tepi balik-rezim di tepi range saja, bukan tengah.'
    case 'shock-berita':
      return 'Deteksi gap: lilin |ret|>4σ → tunda vonis 2-3 jam, ikuti arah drift pasca-gangguan, bukan arah gap pertama.'
    case 'crash-v':
      return 'Bedakan pantulan-V vs kucing-mati: volume kapitulasi + candle reversal + reclaim EMA21 → baru bias naik.'
    case 'squeeze-breakout':
      return 'Latih pembacaan squeeze: bandwidth persentil <15% + breakout volume → keyakinan tinggi searah breakout.'
    case 'osilasi':
      return 'Deteksi periodisitas: autokorelasi ret pada lag 30-70 jam → fade ke tengah di ekstrem siklus.'
    case 'bull-koreksi':
      return 'Koreksi tren sehat vs pembalikan: koreksi di atas EMA50 + volume turun → tetap bias naik.'
    case 'akumulasi':
      return 'Basis Wyckoff: volatilitas menyusut + volume kering lalu markup volume-tinggi → konfirmasi bias naik.'
    default:
      return 'Review bobot faktor untuk rezim ini; tambah sumber sinyal spesifik karakter rezim.'
  }
}

export interface SuiteRun {
  tests: ExamTest[]
  results: ContestantResult[]
  mica: ContestantResult
  v3: ContestantResult | null
  evolved: EvolvedModel
}

export function runSuite(tests: ExamTest[], contestants: Contestant[]): SuiteRun {
  const results = contestants.map((c) => gradeContestant(c, tests))
  const mica = results.find((r) => r.contestant.id === 'MICAPROFITA')!
  const v3 = results.find((r) => r.contestant.id === 'MICAPROFITA-V3') ?? null
  const evolved = evolveOnExam(v3 ?? mica, Math.floor(tests.length / 2))
  return { tests, results, mica, v3, evolved }
}

// ============================================================
// MESIN PERTUMBUHAN v2 — otak belajar dari pengalaman ujian.
//
// Logistic regression atas 9 faktor + 4 interaksi rezim,
// dilatih KRONOLOGIS pada ujian 1..50, lalu diuji BUTA pada
// ujian 51..100 (held-out, tanpa kebocoran). Inilah siklus
// "ujian → belajar → tanding lagi" dalam satu suite.
// ============================================================

export const FEATURE_NAMES = [
  'tren',
  'mom',
  'rev',
  'struct',
  'sq',
  'exh',
  'trap',
  'dev',
  'vol',
  'devOsc', // jarak-mean × rezim osilasi (fade ekstrem siklus)
  'devTren', // jarak-mean × rezim tren (diredam)
  'momTren', // momentum × rezim tren (ikut tren)
  'revOsc', // balik-rezim × osilasi
] as const
// Catatan Ujian #9: versi 20-fitur (tambahan ret24n/roc48n/rsi/ext/bw + interaksi)
// terbukti OVERFIT — akurasi latih 74% tapi held-out anjlok ke 52%.
// 13 fitur ringkas menggeneralisasi lebih baik (58% held-out). Pelajaran
// penting untuk sistem pertumbuhan: otak kecil + fitur kaya > otak gemuk.

export interface EvolvedModel {
  w: number[]
  b: number
  featureNames: string[]
  trainN: number
  trainAcc: number
  heldout: ContestantResult
  heldoutV1: ContestantResult // v1 naluri pada 50 ujian yang sama — pembanding kejujuran
}

// ------------------------------------------------------------
// KEPALA BELAJAR — regresi logistik 13 fitur (dipisahkan agar bisa
// dipakai ulang: latih di suite A, uji buta di suite B segar).
// ------------------------------------------------------------

export function featsOf(pred: Prediction): number[] {
  const v = (k: string) => pred.factors.find((f) => f.key === k)?.value ?? 0
  const osc = pred.flags.osc ? 1 : 0
  const tren = pred.flags.trend ? 1 : 0
  return [
    v('tren'),
    v('mom'),
    v('rev'),
    v('struct'),
    v('sq'),
    v('exh'),
    v('trap'),
    v('dev'),
    v('vol'),
    v('dev') * osc,
    v('dev') * tren,
    v('mom') * tren,
    v('rev') * osc,
  ]
}

export interface TrainedHead {
  w: number[]
  b: number
  trainAcc: number
}

export function trainHead(grades: Grade[], trainN: number, iters = 900, lr = 0.14, l2 = 0.004): TrainedHead {
  const d = FEATURE_NAMES.length
  const X: number[][] = []
  const Y: number[] = []
  for (let i = 0; i < trainN && i < grades.length; i++) {
    X.push(featsOf(grades[i].pred))
    Y.push(grades[i].test.label === 'NAIK' ? 1 : 0)
  }
  const w = new Array<number>(d).fill(0)
  let b = 0
  for (let it = 0; it < iters; it++) {
    const gw = new Array<number>(d).fill(0)
    let gb = 0
    for (let i = 0; i < X.length; i++) {
      let z = b
      for (let j = 0; j < d; j++) z += w[j] * X[i][j]
      const p = 1 / (1 + Math.exp(-z))
      const e = p - Y[i]
      for (let j = 0; j < d; j++) gw[j] += e * X[i][j]
      gb += e
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / X.length + l2 * w[j])
    b -= lr * (gb / X.length)
  }
  let ok = 0
  for (let i = 0; i < X.length; i++) {
    let z = b
    for (let j = 0; j < d; j++) z += w[j] * X[i][j]
    if ((z >= 0 ? 'NAIK' : 'TURUN') === grades[i].test.label) ok++
  }
  return { w, b, trainAcc: X.length ? ok / X.length : 0 }
}

/** vonis ulang dengan kepala terlatih — dipakai utk held-out MAUPUN suite segar */
export function applyHead(res: ContestantResult, head: TrainedHead, trainN: number, label: string): ContestantResult {
  const held: Grade[] = res.grades.map((g) => {
    const x = featsOf(g.pred)
    let z = head.b
    for (let j = 0; j < x.length; j++) z += head.w[j] * x[j]
    let p = 1 / (1 + Math.exp(-z))
    p = 0.5 + (p - 0.5) * 0.82 // penyusutan — model kecil, jujur pada ketidakpastian
    p = clamp(p, 0.08, 0.92)
    const dir: 'NAIK' | 'TURUN' = p >= 0.5 ? 'NAIK' : 'TURUN'
    const conf = Math.max(p, 1 - p)
    const pred: Prediction = {
      ...g.pred,
      dir,
      pUp: p,
      conf,
      score: (p - 0.5) * 2,
      reasons: [
        `${g.pred.reasons[0] ?? ''}`,
        `${label}: bobot 9 faktor + interaksi rezim dipelajari via regresi logistik. p(NAIK) = ${(p * 100).toFixed(0)}%`,
      ],
    }
    const correct = dir === g.test.label
    const y = g.test.label === 'NAIK' ? 1 : 0
    return {
      test: g.test,
      pred,
      correct,
      brier: (p - y) * (p - y),
      conv: (correct ? 1 : -1) * (2 * conf - 1),
    }
  })
  return assembleResult(res.contestant, held)
}

export function evolveOnExam(res: ContestantResult, trainN = 50): EvolvedModel {
  const head = trainHead(res.grades, trainN)
  const d = FEATURE_NAMES.length

  // akurasi latih (in-sample, hanya pelaporan)
  let trainOk = 0
  for (let i = 0; i < trainN && i < res.grades.length; i++) {
    const x = featsOf(res.grades[i].pred)
    let z = head.b
    for (let j = 0; j < d; j++) z += head.w[j] * x[j]
    if ((z >= 0 ? 'NAIK' : 'TURUN') === res.grades[i].test.label) trainOk++
  }

  // held-out buta: ujian trainN..99 dinilai ulang dengan bobot hasil belajar
  const heldGrades = res.grades.slice(trainN)
  const heldout = applyHead(
    { ...res, grades: heldGrades },
    head,
    trainN,
    `Otak v2 (terlatih pada ${trainN} ujian pertama)`,
  )
  const heldoutV1 = assembleResult(res.contestant, heldGrades.map((g) => ({ ...g })))
  return {
    w: head.w,
    b: head.b,
    featureNames: [...FEATURE_NAMES],
    trainN,
    trainAcc: head.trainAcc,
    heldout,
    heldoutV1,
  }
}
