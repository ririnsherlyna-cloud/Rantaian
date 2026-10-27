// ============================================================
// KALIBRASI KEPALA RECLAIM/TRAP — regresi logistik kecil pada
// ZONA AMBIGUITAS bear-trap & bull-trap (fitur 100% point-in-time).
//
// Protokol:
//  - Data: suite tuning (candle, luar-A, luar-B) + dev (luar-C..K) = 12 suite.
//    Label = truth dari data (bukan niat generator).
//  - Leave-suite-out: latih 11 suite, uji 1 suite, putar — estimasi
//    generalisasi yang jujur.
//  - Bobot akhir = fit ulang pada SEMUA 12 suite, lalu DILIPAT
//    (standardisasi dimasukkan ke bobot mentah) supaya otak bisa
//    memakainya tanpa statistik tambahan.
// ============================================================

import { forgeCandleSuite, CH_VISIBLE } from '../src/lib/exam/candle-exam'
import { buildCandleVision } from '../src/lib/exam/sakti-candle'

const TUNING = ['candle', 'luar-A', 'luar-B']
const DEV = ['luar-C', 'luar-D', 'luar-E', 'luar-F', 'luar-G', 'luar-H', 'luar-I', 'luar-J', 'luar-K']
const LATIH = ['latih-A', 'latih-B', 'latih-C', 'latih-D', 'latih-E', 'latih-F', 'latih-G', 'latih-H', 'latih-I', 'latih-J', 'latih-K', 'latih-L']
const SEMUA = [...TUNING, ...DEV, ...LATIH]

interface Sampel {
  ns: string; num: number; label: number // 1 = NAIK
  x: number[]
}

const FITUR = [
  'net5', 'mom3', 'mom12', 'd21', 'posRng', 'vAsym',
  'volZlast', 'volZmidMax', 'bodyRatio', 'bodyRatio3', 'consUp', 'reclaimDn', 'reclaimUp',
  'sqz', 'fallTop20', 'fallTop10', 'HH', 'HL', 'LH', 'LL',
  'divBear', 'divBull', 'engB', 'engS', 'volAsym5',
  'r1', 'r2', 'r3', 'r4', 'r5', 'r6',
  'rFlip', 'spring13', 'mom30', 'consDn', 'sapuL', 'sapuH',
] as const

function fiturDari(v: ReturnType<typeof buildCandleVision>, cs: { o: number; c: number; v: number }[]): number[] {
  const n = cs.length
  let up3 = 0, dn3 = 0, upV5 = 0, dnV5 = 0
  for (let i = Math.max(0, n - 3); i < n; i++) {
    const b = cs[i].c - cs[i].o
    if (b >= 0) up3 += b
    else dn3 += -b
  }
  for (let i = Math.max(0, n - 5); i < n; i++) {
    if (cs[i].c >= cs[i].o) upV5 += cs[i].v
    else dnV5 += cs[i].v
  }
  const atr = Math.max(v.atr, 1e-9)
  return [
    v.netLast5Atr,
    v.mom3Atr,
    v.mom12Atr,
    v.distEma21Atr,
    v.posInRange,
    v.volAsym,
    v.volZ,
    v.volZmidMax,
    v.bodyUp6Atr - v.bodyDn6Atr,
    (up3 - dn3) / atr,
    v.consecutiveUp,
    v.price > v.breakLevelDn ? 1 : 0,
    v.price > v.breakLevel ? 1 : 0,
    v.squeeze ? 1 : 0,
    (v.rangeHigh - v.price) / atr,
    v.fallFromTop10Atr,
    v.hh ? 1 : 0,
    v.hl ? 1 : 0,
    v.lh ? 1 : 0,
    v.ll ? 1 : 0,
    v.divBear ? 1 : 0,
    v.divBull ? 1 : 0,
    v.bullEngulf ? 1 : 0,
    v.bearEngulf ? 1 : 0,
    (() => { const t = upV5 + dnV5; return t > 0 ? (upV5 - dnV5) / t : 0 })(),
    ...(v.ret6Atr.length === 6 ? v.ret6Atr : [0, 0, 0, 0, 0, 0]),
    v.rFlip,
    v.spring13 ? 1 : 0,
    v.mom30Atr,
    v.consecutiveDown,
    v.sweptLow ? 1 : 0,
    v.sweptHigh ? 1 : 0,
  ]
}

// zona ambigu — sama yang dipakai otak (harus identik!)
function zonaBear(v: ReturnType<typeof buildCandleVision>): boolean {
  return (
    v.mom12Atr <= -1.2 && v.posInWindow60 >= 0.55 &&
    (v.rangeHigh - v.price) / v.atr >= 1.4 &&
    v.distEma21Atr >= -2.4 && v.netLast5Atr >= -0.8 &&
    !(v.hammer && v.volZ <= 0)
  )
}
function zonaBull(v: ReturnType<typeof buildCandleVision>): boolean {
  return (
    v.recentBreakUp && v.mom12Atr >= 0.8 && v.mom12Atr <= 3.2 &&
    v.posInWindow60 >= 0.45 && v.distEma21Atr < 2.4 &&
    !(v.hammer && v.volZ <= 0)
  )
}

// ---------- kumpulkan sampel ----------
const bear: Sampel[] = []
const bull: Sampel[] = []
for (const ns of SEMUA) {
  for (const exam of forgeCandleSuite(ns)) {
    const v = buildCandleVision(exam.candles.slice(0, CH_VISIBLE))
    const label = exam.truth === 'NAIK' ? 1 : 0
    if (zonaBear(v)) bear.push({ ns, num: exam.num, label, x: fiturDari(v, exam.candles.slice(0, CH_VISIBLE)) })
    else if (zonaBull(v)) bull.push({ ns, num: exam.num, label, x: fiturDari(v, exam.candles.slice(0, CH_VISIBLE)) })
  }
}

// ---------- regresi logistik (GD batch + L2) ----------
function fitLogistik(data: Sampel[], epochs = 4000, lr = 0.35, lam = 0.02) {
  const d = data.length
  const k = FITUR.length
  const mean = new Array<number>(k).fill(0)
  const sd = new Array<number>(k).fill(1)
  for (let j = 0; j < k; j++) {
    mean[j] = data.reduce((s, r) => s + r.x[j], 0) / d
    const varr = data.reduce((s, r) => s + (r.x[j] - mean[j]) ** 2, 0) / Math.max(1, d - 1)
    sd[j] = Math.max(Math.sqrt(varr), 1e-6)
  }
  const z = data.map((r) => r.x.map((xj, j) => (xj - mean[j]) / sd[j]))
  const w = new Array<number>(k).fill(0)
  let b = 0
  for (let ep = 0; ep < epochs; ep++) {
    const gw = new Array<number>(k).fill(0)
    let gb = 0
    for (let i = 0; i < d; i++) {
      let s = b
      for (let j = 0; j < k; j++) s += w[j] * z[i][j]
      const p = 1 / (1 + Math.exp(-s))
      const err = p - data[i].label
      gb += err
      for (let j = 0; j < k; j++) gw[j] += err * z[i][j]
    }
    b -= lr * gb / d
    for (let j = 0; j < k; j++) w[j] -= lr * (gw[j] / d + lam * w[j])
  }
  return { w, b, mean, sd }
}

function akurasi(model: ReturnType<typeof fitLogistik>, data: Sampel[]): number {
  let benar = 0
  for (const r of data) {
    let s = model.b
    for (let j = 0; j < FITUR.length; j++) s += model.w[j] * ((r.x[j] - model.mean[j]) / model.sd[j])
    const pred = s >= 0 ? 1 : 0
    if (pred === r.label) benar++
  }
  return benar / data.length
}

function laporan(nama: string, data: Sampel[]): void {
  console.log(`\n===== ${nama}: ${data.length} sampel (NAIK ${data.filter((r) => r.label === 1).length} / TURUN ${data.filter((r) => r.label === 0).length}) =====`)
  if (data.length < 20) {
    console.log('sampel terlalu sedikit — lewati')
    return
  }
  const suites = [...new Set(data.map((r) => r.ns))]
  // cari (lam, lr) terbaik via leave-suite-out
  let terbaik = { lam: 0.02, lr: 0.35, acc: -1 }
  for (const lam of [0.004, 0.01, 0.02, 0.05, 0.1]) {
    for (const lr of [0.2, 0.35, 0.6]) {
      let benar = 0
      for (const s of suites) {
        const latih = data.filter((r) => r.ns !== s)
        const uji = data.filter((r) => r.ns === s)
        const m = fitLogistik(latih, 5000, lr, lam)
        benar += akurasi(m, uji) * uji.length
      }
      const acc = benar / data.length
      if (acc > terbaik.acc) terbaik = { lam, lr, acc }
    }
  }
  console.log(`Hyperparam terbaik (LSO): lam=${terbaik.lam} lr=${terbaik.lr} → LSO ${(terbaik.acc * 100).toFixed(1)}%`)
  // BAGGING: 9 fit bootstrap, rata-rata bobot — batas keputusan lebih halus
  const rngBoot = (n0: number) => { let a = 1234567; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216 } }
  const next0 = rngBoot(1)
  const nBoot = data.length
  const ansambel: ReturnType<typeof fitLogistik>[] = []
  for (let b = 0; b < 9; b++) {
    const sampel: Sampel[] = []
    for (let i = 0; i < nBoot; i++) sampel.push(data[Math.floor(next0() * nBoot)])
    ansambel.push(fitLogistik(sampel, 8000, terbaik.lr, terbaik.lam * 0.7))
  }
  const gabung = {
    w: ansambel[0].w.map((_, j) => ansambel.reduce((s, m) => s + m.w[j], 0) / 9),
    b: ansambel.reduce((s, m) => s + m.b, 0) / 9,
    mean: ansambel[0].mean,
    sd: ansambel[0].sd,
  }
  const accGab = akurasi(gabung, data)
  const final = gabung
  console.log(`Ansambel bagging (9 fit): fit-gabung ${(accGab * 100).toFixed(1)}%`)
  // lipat standardisasi ke bobot mentah: z = b' + Σ w'_j x_j
  const wRaw = final.w.map((wj, j) => wj / final.sd[j])
  const bRaw = final.b - final.w.reduce((s, wj, j) => s + wj * final.mean[j] / final.sd[j], 0)
  const koef = FITUR.map((f, j) => ({ f, wRaw: wRaw[j], wStd: final.w[j] })).sort((a, b) => Math.abs(b.wStd) - Math.abs(a.wStd))
  console.log('Bobot terlipat (pakai langsung pada fitur mentah):')
  for (const c of koef) console.log(`  ${c.f.padEnd(10)} ${c.wRaw >= 0 ? '+' : ''}${c.wRaw.toFixed(4)}  (z: ${c.wStd >= 0 ? '+' : ''}${c.wStd.toFixed(2)})`)
  console.log(`  intercept  ${bRaw >= 0 ? '+' : ''}${bRaw.toFixed(4)}`)
  // kesalahan fit penuh utk inspeksi
  const salah = data.filter((r) => {
    let s = bRaw
    for (let j = 0; j < FITUR.length; j++) s += wRaw[j] * r.x[j]
    return (s >= 0 ? 1 : 0) !== r.label
  })
  for (const s of salah.slice(0, 12)) console.log(`  miss ${s.ns} #${s.num} label=${s.label === 1 ? 'NAIK' : 'TURUN'}`)
}

laporan('ZONA BEAR (breakdown + pantulan, posWindow >= 55%)', bear)
laporan('ZONA BULL (breakout + dorongan, posWindow >= 50%)', bull)
