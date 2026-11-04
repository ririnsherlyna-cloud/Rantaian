// ============================================================
// KONTESTAN UJIAN SIMULASI.
//
// MICAPROFITA (profil ujian): otak biner NAIK/TURUN 24 jam yang
// mendistilasi kemahiran cyborg — deteksi rezim dulu, lalu ansambel
// 7 faktor. HANYA menerima candle yang boleh dilihat (anti-hindsight
// by construction: tipe datanya tidak memuat masa depan).
//
// 4 baseline untuk menjawab "sebaik mana nembaknya":
// SELALU-NAIK (dogma), MOMEN-NAIF, BALIK-ARAH-NAIF, DADU (lantai keberuntungan).
// ============================================================

import type { Candle, ExamTest } from './generator'
import * as I from './indicators'
import { makeRng } from './rng'

export interface FactorBar {
  key: string
  label: string
  value: number // -1..1
  weight: number
}

export interface Prediction {
  dir: 'NAIK' | 'TURUN'
  conf: number // 0.5..0.95
  score: number // -1..1 (positif = bias naik)
  regime: string
  reasons: string[]
  factors: FactorBar[]
  pUp: number
  flags: { osc: boolean; trend: boolean; squeeze: boolean }
  extra?: Record<string, number>
}

export interface Contestant {
  id: string
  name: string
  short: string
  color: string
  desc: string
  predict(visible: Candle[], test: ExamTest): Prediction
}

// ------------------------------------------------------------
// OTAK MICAPROFITA — profil ujian
// ------------------------------------------------------------

export const MICAPROFITA: Contestant = {
  id: 'MICAPROFITA',
  name: 'MICAPROFITA',
  short: 'CYBORG',
  color: '#f59e0b',
  desc: 'Deteksi rezim → ansambel 9 faktor: tren EMA, momentum, struktur swing, balik-rezim, squeeze, kelelahan, sensor jebakan puncak, jarak-mean, volume',
  predict(visible, test) {
    const closes = visible.map((c) => c.c)
    const n = closes.length
    const px = closes[n - 1]

    const e9 = I.ema(closes, 9)
    const e21 = I.ema(closes, 21)
    const e50 = I.ema(closes, 50)
    const atrA = I.atr(visible, 14)
    const atr = Math.max(atrA[n - 1], px * 0.0008)
    const atrPct = atr / px
    const rsiA = I.rsi(closes, 14)
    const r = rsiA[n - 1]
    const m = I.macd(closes)
    const hist = m.hist[n - 1]
    const bb = I.bollinger(closes, 20, 2)
    const pctB = bb.pctB[n - 1]
    const bwRank = I.percentileRank(bb.bw.slice(-120), bb.bw[n - 1])
    const r12 = I.roc(closes, 12)[n - 1]
    const r24 = I.roc(closes, 24)[n - 1]
    const adx = I.adx(visible, 14)[n - 1]
    const obvA = I.obv(visible)
    const obvWin = obvA.slice(-24)
    const obvSlope = I.linreg(obvWin).slope
    const obvScale = I.stdev(obvWin) || 1
    const fVol = I.clamp((obvSlope * 12) / obvScale, -1, 1)
    const lr = I.linreg(closes.slice(-72).map((v) => Math.log(v)))

    const rets48: number[] = []
    for (let i = n - 47; i < n; i++) rets48.push(Math.log(closes[i] / closes[i - 1]))
    const posShare = rets48.filter((x) => x > 0).length / rets48.length

    const sw = I.findSwings(closes.slice(-120), 5)
    const struct = I.structureScore(sw, atr)

    // ---- deteksi rezim (dipakai juga untuk peredaman faktor) ----
    const trendScore = I.clamp(0.55 * (adx / 40) + 0.45 * lr.r2 * (posShare > 0.6 || posShare < 0.4 ? 1 : 0.35), 0, 1)
    const chop = adx < 20 && lr.r2 < 0.35

    // mean panjang & sebaran (dipakai osilasi + jarak-mean)
    const sma96 = I.mean(closes.slice(-96))
    const sd96 = I.stdev(closes.slice(-96)) || atr

    // UJIAN #9c — detektor osilasi: penyeberangan SMA96 dalam 48 jam terakhir.
    // ≥2 penyeberangan = harga berayun di sekitar mean panjang, bukan seri tren.
    let cross = 0
    for (let i = n - 47; i < n; i++) {
      const s0 = Math.sign(closes[i - 1] - sma96)
      const s1 = Math.sign(closes[i] - sma96)
      if (s0 !== 0 && s1 !== 0 && s0 !== s1) cross++
    }
    const osc = cross >= 2

    // ---- 9 faktor (-1..1) ----
    const emaAlign = (e9[n - 1] > e21[n - 1] ? 0.5 : -0.5) + (e21[n - 1] > e50[n - 1] ? 0.5 : -0.5)
    const slope21 = (e21[n - 1] - e21[n - 7]) / (7 * atr)
    const fTrend = I.clamp(emaAlign * 0.55 + I.clamp(slope21, -1.2, 1.2) * 0.45, -1, 1)

    const zMom = I.clamp((r12 / (atrPct * 12)) * 0.5 + (r24 / (atrPct * 24)) * 0.5, -1.2, 1.2)
    const histNorm = I.clamp(hist / (atr * 0.8), -1, 1)
    const fMom = I.clamp(zMom * 0.6 + histNorm * 0.4, -1, 1)

    let fRev = 0
    if (pctB > 0.85) fRev = -(pctB - 0.85) / 0.15
    else if (pctB < 0.15) fRev = (0.15 - pctB) / 0.15
    if (r > 78) fRev -= (r - 78) / 22
    else if (r < 22) fRev += (22 - r) / 22
    fRev = I.clamp(fRev, -1, 1)

    const last6 = (closes[n - 1] - closes[n - 7]) / closes[n - 7]
    const run0 = Math.log(closes[n - 1] / closes[n - 2])
    const squeezeOn = bwRank < 0.15
    const freshBreak =
      !squeezeOn &&
      bwRank < 0.45 &&
      Math.abs(last6) > 2.2 * atrPct &&
      Math.abs(closes[n - 1] / closes[n - 25] - 1) > 3.5 * atrPct
    const squeezeActive = squeezeOn || freshBreak
    const fSq = squeezeOn
      ? I.clamp(Math.sign(last6) * (1 - bwRank / 0.15) * 0.9, -1, 1)
      : freshBreak
        ? I.clamp(Math.sign(last6) * 0.6, -1, 1)
        : 0

    const ext = (px - e21[n - 1]) / (atr * 3)
    // UJIAN #9b — kelelahan komposit: RSI panas + ekstensi + akselerasi parabolik
    // + lilin klimaks. Semua terbaca di cutoff, tanpa masa depan.
    const slope9a = (e9[n - 1] - e9[n - 7]) / (6 * atr)
    const slope9b = (e9[n - 7] - e9[n - 13]) / (6 * atr)
    const para = slope9a > 0.9 && slope9a > 1.5 * slope9b
    const climax = (visible[n - 1].h - visible[n - 1].l) / atr > 2.2 || Math.abs(run0) > 2.6 * atrPct
    let fExh = 0
    if (r > 70) {
      let s = 0
      if (ext > 0.9) s += 0.35
      if (r > 78) s += 0.25
      if (para) s += 0.3
      if (climax) s += 0.3
      fExh = -I.clamp(s, 0, 1)
    } else if (r < 30) {
      let s = 0
      if (ext < -0.9) s += 0.35
      if (r < 22) s += 0.25
      if (climax) s += 0.3
      fExh = I.clamp(s, 0, 1)
    }
    fExh = I.clamp(fExh, -1, 1)

    // UJIAN #9 — organ: JARAK-MEAN PANJANG (sinyal balik-rezim sejati).
    // Normalisasi σ96: berapa banyak simpangan harga vs sebarannya sendiri.
    // Diredam saat tren kuat — di tren, jarak jauh itu SEHAT.
    const fDev = I.clamp(-(((px - sma96) / sd96) / 1.5) * (1 - 0.55 * trendScore) * (osc ? 1.25 : 1), -1, 1)

    // UJIAN #9 — organ: SENSOR JEBAKAN puncak/dasar.
    // Hanya aktif bila rentang 96 jam benar-benar melebar (bukan range sempit).
    const hi96 = Math.max(...closes.slice(-96))
    const lo96 = Math.min(...closes.slice(-96))
    const spread96 = hi96 / lo96 - 1
    const run72 = px / closes[n - 73] - 1
    let fTrap = 0
    if (spread96 > 0.06) {
      if (run72 > 0.12 && r12 < r24 * 0.8 && px < hi96 * 0.985) fTrap = -Math.min(1, run72 / 0.22)
      else if (run72 < -0.12 && r12 > r24 * 1.25 && px > lo96 * 1.015) fTrap = Math.min(1, -run72 / 0.22)
      if (fTrap === 0 && px > hi96 * 0.97 && struct < -0.15 && fMom < 0.1) fTrap = -0.55
      if (fTrap === 0 && px < lo96 * 1.03 && struct > 0.15 && fMom > -0.1) fTrap = 0.45
      if (para && r > 72 && ext > 1.0) fTrap = Math.min(fTrap - 0.45, -0.45)
    }
    fTrap = I.clamp(fTrap, -1, 1)

    // ---- pembobotan per rezim (jumlah bobot = 1) ----
    let regime: string
    let w: Record<string, number>
    if (freshBreak || (squeezeActive && !osc)) {
      regime = 'SQUEEZE→BREAKOUT'
      w = { trend: 0.14, mom: 0.24, rev: 0, struct: 0.06, sq: 0.28, exh: 0.06, trap: 0.06, dev: 0.1, vol: 0.06 }
    } else if (osc) {
      regime = 'OSILASI/RANGE'
      w = { trend: 0.03, mom: 0.08, rev: 0.14, struct: 0.1, sq: 0, exh: 0.13, trap: 0.14, dev: 0.32, vol: 0.06 }
    } else if (trendScore > 0.55) {
      regime = 'TREN'
      w = { trend: 0.28, mom: 0.2, rev: 0.04, struct: 0.12, sq: 0, exh: 0.16, trap: 0.14, dev: 0.02, vol: 0.04 }
    } else if (chop) {
      regime = 'BERGENTAK'
      w = { trend: 0.03, mom: 0.08, rev: 0.14, struct: 0.1, sq: 0, exh: 0.13, trap: 0.14, dev: 0.32, vol: 0.06 }
    } else {
      regime = 'TRANSISI'
      w = { trend: 0.16, mom: 0.14, rev: 0.1, struct: 0.12, sq: 0, exh: 0.12, trap: 0.14, dev: 0.16, vol: 0.06 }
    }

    let score =
      w.trend * fTrend +
      w.mom * fMom +
      w.rev * fRev +
      w.struct * struct +
      w.sq * fSq +
      w.exh * fExh +
      w.trap * fTrap +
      w.dev * fDev +
      w.vol * fVol
    score = I.clamp(score * 1.25, -1, 1)

    let p = 1 / (1 + Math.exp(-2.6 * score))
    p = 0.5 + (p - 0.5) * 0.94 // penyusutan kalibrasi — jangan sombong
    p = I.clamp(p, 0.06, 0.94)
    const dir: 'NAIK' | 'TURUN' = p >= 0.5 ? 'NAIK' : 'TURUN'
    const conf = Math.max(p, 1 - p)

    const factors: FactorBar[] = [
      { key: 'tren', label: 'Tren EMA', value: fTrend, weight: w.trend },
      { key: 'mom', label: 'Momentum', value: fMom, weight: w.mom },
      { key: 'rev', label: 'Balik-Rezim', value: fRev, weight: w.rev },
      { key: 'struct', label: 'Struktur Swing', value: struct, weight: w.struct },
      { key: 'sq', label: 'Squeeze', value: fSq, weight: w.sq },
      { key: 'exh', label: 'Kelelahan', value: fExh, weight: w.exh },
      { key: 'trap', label: 'Sensor Jebakan', value: fTrap, weight: w.trap },
      { key: 'dev', label: 'Jarak-Mean', value: fDev, weight: w.dev },
      { key: 'vol', label: 'Volume OBV', value: fVol, weight: w.vol },
    ]

    const reasons: string[] = [
      `Rezim terdeteksi: ${regime} (ADX ${adx.toFixed(0)}, R² log-tren 72j ${lr.r2.toFixed(2)}, BW persentil ${(bwRank * 100).toFixed(0)}%)`,
    ]
    const ranked = [...factors].sort((a, b) => Math.abs(b.value * b.weight) - Math.abs(a.value * a.weight))
    for (const f of ranked.slice(0, 4)) {
      if (Math.abs(f.value) < 0.06) continue
      reasons.push(describeFactor(f, { r, pctB, atrPct, adx, bwRank, slope21, last6 }))
    }
    reasons.push(
      `Vonis: ${dir} (keyakinan ${(conf * 100).toFixed(0)}%) untuk 24 jam dari ${test.symbol} pada jam ke-${n}`,
    )
    const ret24 = px / closes[n - 25] - 1
    const roc48 = px / closes[n - 49] - 1
    return {
      dir,
      conf,
      score,
      regime,
      reasons,
      factors,
      pUp: dir === 'NAIK' ? conf : 1 - conf,
      flags: { osc, trend: trendScore > 0.55, squeeze: squeezeActive },
      extra: {
        ret24n: I.clamp(ret24 / 0.06, -1.5, 1.5),
        roc48n: I.clamp(roc48 / 0.12, -1.5, 1.5),
        rsiN: (r - 50) / 50,
        extN: I.clamp(ext, -1.5, 1.5),
        bwRank,
        atrPct,
      },
    }
  },
}

function describeFactor(
  f: FactorBar,
  ctx: { r: number; pctB: number; atrPct: number; adx: number; bwRank: number; slope21: number; last6: number },
): string {
  const v = f.value
  const arah = v > 0 ? 'naik' : 'turun'
  switch (f.key) {
    case 'tren':
      return `EMA selaras ${arah} · kemiringan EMA21 ${(ctx.slope21 * 100).toFixed(2)}%/jam (${v >= 0 ? 'bullish' : 'bearish'})`
    case 'mom':
      return `Momentum ${arah}: ROC12 & MACD-hist searah (kekuatan ${Math.abs(v).toFixed(2)})`
    case 'rev':
      return `Ekstrem balik-rezim: %B ${ctx.pctB.toFixed(2)} · RSI ${ctx.r.toFixed(0)} → fade ke tengah`
    case 'struct':
      return `Struktur swing ${arah}: ${v > 0 ? 'higher-high + higher-low' : 'lower-high + lower-low'}`
    case 'sq':
      return `Squeeze terdeteksi (BW p${(ctx.bwRank * 100).toFixed(0)}) → ikut arah breakout 6 jam ${(ctx.last6 * 100).toFixed(1)}%`
    case 'exh':
      return `Kelelahan ${v < 0 ? 'di puncak (RSI panas, harga melar dari EMA)' : 'di dasar (capitulasi, pantulan wajar)'}`
    case 'trap':
      return `Sensor jebakan: ${v < 0 ? 'puncak telat / distribusi / blowoff terdeteksi → waspadai pembalikan turun' : 'dasar akumulasi terdeteksi → waspadai pantulan naik'}`
    case 'dev':
      return `Jarak dari mean 96 jam ${devTxt(Math.abs(v))} → ${v > 0 ? 'tarikan balik ke atas' : 'tarikan balik ke bawah'}`
    case 'vol':
      return `Aliran OBV ${arah} (konfirmasi volume ${Math.abs(v).toFixed(2)})`
    default:
      return f.label
  }
}

function devTxt(x: number): string {
  return x > 0.66 ? 'jauh (ekstrem)' : x > 0.33 ? 'sedang' : 'dekat'
}

// ------------------------------------------------------------
// OTAK MICAPROFITA v3 — hasil bedah Ujian Simulasi.
//
// Tiga perbaikan struktural atas v1 (dibuktikan diag per rezim):
//  1. DETEKSI OSILASI JUJUR: harga dibandingkan dg MEAN BERJALAN 96j
//     (v1 memakai skalar rata-rata statis → hampir semua pasar
//     terdeteksi "OSILASI/RANGE" → faktor jarak-mean mendominasi
//     dan mem-fade tren yang seharusnya diikuti).
//  2. DRIFT-Z STATISTIK: kekuatan tren = log-return 96j dibagi
//     sebaran noise-nya (z-score). Tren diakui dari data, bukan
//     dari ADX yang tumpul pada noise per jam.
//  3. KEADAAN SQUEEZE/REAKSI: kompresi bandwidth vs sejarah 120j
//     + ekspansi pasca-breakout → rezim "ikut arah breakout",
//     plus status BLOWOFF eksplisit (akselerasi + RSI panas +
//     harga melar) yang memaksa waspada turun.
// Semua faktor tetap terhitung HANYA dari 144 jam terlihat.
// ------------------------------------------------------------

export const MICAPROFITA_V3: Contestant = {
  id: 'MICAPROFITA-V3',
  name: 'MICAPROFITA v3',
  short: 'CYBORG v3',
  color: '#fbbf24',
  desc: 'v3: mean berjalan + drift-Z + keadaan squeeze/blowoff — rezim terbaca jujur, tren diikuti, jebakan puncak diwaspadai',
  predict(visible, test) {
    const closes = visible.map((c) => c.c)
    const n = closes.length
    const px = closes[n - 1]

    const e9 = I.ema(closes, 9)
    const e21 = I.ema(closes, 21)
    const e50 = I.ema(closes, 50)
    const atrA = I.atr(visible, 14)
    const atr = Math.max(atrA[n - 1], px * 0.0008)
    const atrPct = atr / px
    const rsiA = I.rsi(closes, 14)
    const r = rsiA[n - 1]
    const m = I.macd(closes)
    const hist = m.hist[n - 1]
    const bb = I.bollinger(closes, 20, 2)
    const pctB = bb.pctB[n - 1]
    const bwRank = I.percentileRank(bb.bw.slice(-120), bb.bw[n - 1])
    const r12 = I.roc(closes, 12)[n - 1]
    const r24 = I.roc(closes, 24)[n - 1]
    const obvA = I.obv(visible)
    const obvWin = obvA.slice(-24)
    const obvSlope = I.linreg(obvWin).slope
    const obvScale = I.stdev(obvWin) || 1
    const fVol = I.clamp((obvSlope * 12) / obvScale, -1, 1)

    // ---- FIX 2: drift-Z (z-score log-return 96 jam) ----
    const logRets: number[] = []
    for (let i = n - 96; i < n; i++) logRets.push(Math.log(closes[i] / closes[i - 1]))
    const sd1 = Math.max(I.stdev(logRets), atrPct * 0.4)
    const drift96 = Math.log(px / closes[n - 97])
    const driftZ = drift96 / (sd1 * Math.sqrt(96))
    const driftStrength = I.clamp(Math.abs(driftZ) / 1.7, 0, 1)
    const lr96 = I.linreg(logRets)
    const trendScore = I.clamp(0.6 * driftStrength + 0.25 * lr96.r2 + 0.15 * I.clamp(adxv(visible) / 40, 0, 1), 0, 1)

    // ---- FIX 1: osilasi vs MEAN BERJALAN ----
    const sma96Series = rollingMean(closes, 96)
    const sma96 = sma96Series[n - 1]
    const sd96 = I.stdev(closes.slice(-96)) || atr
    let cross = 0
    for (let i = n - 47; i < n; i++) {
      const s0 = Math.sign(closes[i - 1] - sma96Series[i - 1])
      const s1 = Math.sign(closes[i] - sma96Series[i])
      if (s0 !== 0 && s1 !== 0 && s0 !== s1) cross++
    }
    const dist96 = Math.abs(px - sma96) / sd96
    // osc ditentukan setelah cross96 dihitung (lihat bawah)

    // ---- FIX 3: keadaan squeeze & breakout ----
    const bwNow = bb.bw[n - 1]
    const bwMin7 = Math.min(...bb.bw.slice(-7))
    const bwExpand = bwMin7 > 0 ? bwNow / bwMin7 : 1
    const bw30 = bb.bw[n - 31] || bwNow
    const bwExpand30 = bw30 > 0 ? bwNow / bw30 : 1
    const last6 = (px - closes[n - 7]) / closes[n - 7]
    const squeezeOn = bwRank < 0.2 && bwExpand < 1.35
    const freshBreak = bwExpand >= 1.45 && Math.abs(last6) > 1.9 * atrPct * Math.sqrt(6) && Math.abs(driftZ) > 0.5

    // ---- keadaan pasar bernama (pelajaran nyata crypto) ----
    const hi96 = Math.max(...closes.slice(-96))
    const lo96 = Math.min(...closes.slice(-96))
    const run72 = px / closes[n - 73] - 1
    const run96 = px / closes[n - 97] - 1
    const stall12 = Math.abs(px / closes[n - 13] - 1)
    // VERTIKAL: kenaikan menyala — "terlalu bagus untuk benar"
    const hyped = run72 > 0.22 || run96 > 0.3
    // PUNCAK-RUNTUH: blowoff lalu jatuh >8% dari puncak — jangan beli jatuhnya
    const postBlow = px < hi96 * 0.92 && hi96 / lo96 > 1.3 && (run96 > 0.25 || run72 > 0.18)
    // STALL-TOP: rally lalu mendatar di puncak + OBV divergen = distribusi
    const stall = run96 > 0.12 && stall12 < 0.035 && fVol < -0.05 && px > hi96 * 0.95 && !hyped
    // PEMULIHAN-V: jatuh dalam lalu reclaim bermomentum
    const dd96 = px / hi96 - 1
    const recovery = dd96 <= -0.12 && r12 > 0.02 && !hyped && !postBlow
    // range jujur: lintas-mean sering tapi tak liar (osilasi teratur, bukan cambuk)
    const crossIdx: number[] = []
    for (let i = n - 119; i < n; i++) {
      const s0 = Math.sign(closes[i - 1] - sma96Series[i - 1])
      const s1 = Math.sign(closes[i] - sma96Series[i])
      if (s0 !== 0 && s1 !== 0 && s0 !== s1) crossIdx.push(i)
    }
    const cross96 = crossIdx.filter((x) => x >= n - 95).length
    // postBreak tunduk pada osc lewat urutan prioritas rezim di bawah
    const postBreak = bwExpand30 >= 1.5 && !hyped && !postBlow
    // OSILASI/PERIODISITAS — organ pembeda paling penting:
    // bukan sekadar "sering lintas mean" (tren berisik juga bisa),
    // melainkan lintas yang BERATURAN — interval antar-lintas stabil
    // (koefisien variasi kecil) = gelombang sejati, bukan tren berisik.
    // Pelajaran mahal dari bedah Ujian Simulasi: kalau deteksi ini kalah
    // oleh keadaan TREN/PASCA-SQUEEZE, otak membeli puncak gelombang
    // dan menjual dasarnya — kebalikan tepi. Dan kalau terlalu longgar,
    // tren sehat ikut ter-fade — sama fatalnya.
    let osc = false
    if (crossIdx.length >= 3) {
      const gaps: number[] = []
      for (let i = 1; i < crossIdx.length; i++) gaps.push(crossIdx[i] - crossIdx[i - 1])
      const mg = I.mean(gaps)
      const cv = mg > 0 ? I.stdev(gaps) / mg : 9
      // jalur tunggal — RITME: interval lintas beraturan = gelombang sejati;
      // guard drift-Z menjaga tren berisik berinterval semi-reguler
      // (dip berkala) agar tidak ikut ter-fade.
      // CELAH TERUKUR (diag 500 pasar): osilasi period-panjang (drift-Z
      // > 1.8 di 1,5 siklus) & konsolidasi Poisson (CV tinggi) masih
      // lolos ke TREN/TRANSISI → celah terdokumentasi utk upgrade berikut.
      const rhythmic = cv < 0.55 && Math.abs(driftZ) < 1.8
      osc = rhythmic
    }

    // ---- 9 faktor (-1..1) ----
    const emaAlign = (e9[n - 1] > e21[n - 1] ? 0.5 : -0.5) + (e21[n - 1] > e50[n - 1] ? 0.5 : -0.5)
    const slope21 = (e21[n - 1] - e21[n - 7]) / (7 * atr)
    const fTrend = I.clamp(emaAlign * 0.5 + I.clamp(slope21, -1.2, 1.2) * 0.3 + Math.sign(driftZ) * driftStrength * 0.4, -1, 1)

    const zMom = I.clamp((r12 / (atrPct * 12)) * 0.5 + (r24 / (atrPct * 24)) * 0.5, -1.2, 1.2)
    const histNorm = I.clamp(hist / (atr * 0.8), -1, 1)
    const fMom = I.clamp(zMom * 0.6 + histNorm * 0.4, -1, 1)

    let fRev = 0
    if (pctB > 0.85) fRev = -(pctB - 0.85) / 0.15
    else if (pctB < 0.15) fRev = (0.15 - pctB) / 0.15
    if (r > 78) fRev -= (r - 78) / 22
    else if (r < 22) fRev += (22 - r) / 22
    fRev = I.clamp(fRev, -1, 1)

    const run0 = Math.log(closes[n - 1] / closes[n - 2])
    const freshBreakDir = Math.sign(last6) || Math.sign(driftZ) || 1

    const ext = (px - e21[n - 1]) / (atr * 3)
    const slope9a = (e9[n - 1] - e9[n - 7]) / (6 * atr)
    const slope9b = (e9[n - 7] - e9[n - 13]) / (6 * atr)
    const para = slope9a > 0.9 && slope9a > 1.5 * slope9b
    const climax = (visible[n - 1].h - visible[n - 1].l) / atr > 2.2 || Math.abs(run0) > 2.6 * atrPct
    const blowoff = para && r > 70 && ext > 0.85
    let fExh = 0
    if (r > 70) {
      let s = 0
      if (ext > 0.9) s += 0.35
      if (r > 78) s += 0.25
      if (para) s += 0.3
      if (climax) s += 0.3
      fExh = -I.clamp(s, 0, 1)
    } else if (r < 30) {
      let s = 0
      if (ext < -0.9) s += 0.35
      if (r < 22) s += 0.25
      if (climax) s += 0.3
      fExh = I.clamp(s, 0, 1)
    }
    fExh = I.clamp(fExh, -1, 1)
    // pelajaran: RSI rendah SETELAH blowoff runtuh = pisau jatuh, bukan dasar
    if (postBlow && r < 40) fExh *= 0.3

    // di osilasi: fade kekuatan penuh (pelajaran v1 yang terbukti 86%);
    // di luar osilasi: diredam sebanding kekuatan drift (jarak jauh itu sehat di tren)
    const fDev = I.clamp(-(((px - sma96) / sd96) / 1.5) * (osc ? 1.25 : 1 - 0.8 * driftStrength) * (freshBreak || postBreak ? 0.15 : 1), -1, 1)

    // sensor jebakan: puncak distribusi / dasar akumulasi / blowoff / puncak-runtuh
    const spread96 = hi96 / lo96 - 1
    let fTrap = 0
    if (spread96 > 0.06) {
      if (postBlow) {
        // puncak meledak lalu runtuh — pembalikan terkonfirmasi, bukan pantulan
        fTrap = -0.9
      } else {
        if (run72 > 0.12 && r12 < r24 * 0.8 && px < hi96 * 0.985) fTrap = -Math.min(1, run72 / 0.22)
        else if (run72 < -0.12 && r12 > r24 * 1.25 && px > lo96 * 1.015) fTrap = Math.min(1, -run72 / 0.22)
        if (fTrap === 0 && px > hi96 * 0.97 && fMom < 0.1 && (fVol < -0.1 || osc)) fTrap = -0.55
        if (fTrap === 0 && px < lo96 * 1.03 && fMom > -0.1 && (fVol > 0.1 || osc)) fTrap = 0.45
        if (blowoff) fTrap = Math.min(fTrap - 0.45, -0.45)
        if (stall) fTrap = Math.min(fTrap, -0.6)
      }
    }
    fTrap = I.clamp(fTrap, -1, 1)

    // squeeze: ikut arah breakout; saat mampet arah = drift halus
    const fSq = freshBreak || postBreak
      ? I.clamp(freshBreakDir * (0.55 + 0.35 * I.clamp((freshBreak ? bwExpand : bwExpand30) / 3, 0, 1)), -1, 1)
      : squeezeOn
        ? I.clamp(Math.sign(last6) * (1 - bwRank / 0.2) * 0.55, -1, 1)
        : 0

    // ---- rezim & bobot (jumlah = 1) — urutan prioritas keadaan ----
    // PERIODISITAS dinilai lebih dulu daripada keadaan breakout/tren:
    // pasar yang terbukti berayun teratur tidak boleh dibaca sebagai tren.
    let regime: string
    let w: Record<string, number>
    if (postBlow) {
      regime = 'PUNCAK-RUNTUH'
      w = { trend: 0.1, mom: 0.18, rev: 0.08, struct: 0.06, sq: 0.04, exh: 0.08, trap: 0.3, dev: 0.1, vol: 0.06 }
    } else if (blowoff) {
      regime = 'BLOWOFF'
      w = { trend: 0.04, mom: 0.05, rev: 0.13, struct: 0.04, sq: 0, exh: 0.28, trap: 0.26, dev: 0.12, vol: 0.08 }
    } else if (hyped) {
      regime = 'VERTIKAL'
      w = { trend: 0.04, mom: 0.06, rev: 0.16, struct: 0.04, sq: 0, exh: 0.22, trap: 0.26, dev: 0.14, vol: 0.08 }
    } else if (stall) {
      regime = 'STALL-TOP'
      w = { trend: 0.04, mom: 0.06, rev: 0.14, struct: 0.06, sq: 0, exh: 0.16, trap: 0.24, dev: 0.18, vol: 0.12 }
    } else if (osc) {
      regime = 'OSILASI/RANGE'
      w = { trend: 0.03, mom: 0.07, rev: 0.15, struct: 0.1, sq: 0, exh: 0.14, trap: 0.13, dev: 0.3, vol: 0.08 }
    } else if (freshBreak) {
      regime = 'REAKSI/SQUEEZE'
      w = { trend: 0.17, mom: 0.22, rev: 0, struct: 0.1, sq: 0.33, exh: 0.03, trap: 0.05, dev: 0.02, vol: 0.08 }
    } else if (postBreak) {
      regime = 'PASCA-SQUEEZE'
      w = { trend: 0.18, mom: 0.2, rev: 0.02, struct: 0.1, sq: 0.3, exh: 0.04, trap: 0.06, dev: 0.02, vol: 0.08 }
    } else if (recovery) {
      regime = 'PEMULIHAN-V'
      w = { trend: 0.2, mom: 0.26, rev: 0.02, struct: 0.14, sq: 0.04, exh: 0.08, trap: 0.08, dev: 0.06, vol: 0.12 }
    } else if (driftStrength > 0.45) {
      regime = 'TREN'
      w = { trend: 0.3, mom: 0.22, rev: 0.03, struct: 0.13, sq: 0.04, exh: 0.11, trap: 0.11, dev: 0.02, vol: 0.04 }
    } else {
      regime = 'TRANSISI'
      w = { trend: 0.18, mom: 0.17, rev: 0.09, struct: 0.12, sq: 0.03, exh: 0.11, trap: 0.13, dev: 0.12, vol: 0.05 }
    }

    let score =
      w.trend * fTrend +
      w.mom * fMom +
      w.rev * fRev +
      w.struct * structOf(closes, atr) +
      w.sq * fSq +
      w.exh * fExh +
      w.trap * fTrap +
      w.dev * fDev +
      w.vol * fVol
    score = I.clamp(score * 1.25, -1, 1)

    let p = 1 / (1 + Math.exp(-2.6 * score))
    p = 0.5 + (p - 0.5) * 0.94
    // kerendahan hati: medan nyaris acak — range rapat tanpa ritme teratur
    // (konsolidasi/cambuk padat) → keyakinan merapat ke 50%;
    // osilasi BERATURAN tidak didamas — di sanalah tepinya nyata.
    if (osc && dist96 < 0.5 && cross96 >= 6) p = 0.5 + (p - 0.5) * 0.75
    if (squeezeOn && !freshBreak) p = 0.5 + (p - 0.5) * 0.7
    p = I.clamp(p, 0.06, 0.94)
    const dir: 'NAIK' | 'TURUN' = p >= 0.5 ? 'NAIK' : 'TURUN'
    const conf = Math.max(p, 1 - p)

    const sw = I.findSwings(closes.slice(-120), 5)
    const struct = I.structureScore(sw, atr)
    const factors: FactorBar[] = [
      { key: 'tren', label: 'Tren EMA', value: fTrend, weight: w.trend },
      { key: 'mom', label: 'Momentum', value: fMom, weight: w.mom },
      { key: 'rev', label: 'Balik-Rezim', value: fRev, weight: w.rev },
      { key: 'struct', label: 'Struktur Swing', value: struct, weight: w.struct },
      { key: 'sq', label: 'Squeeze', value: fSq, weight: w.sq },
      { key: 'exh', label: 'Kelelahan', value: fExh, weight: w.exh },
      { key: 'trap', label: 'Sensor Jebakan', value: fTrap, weight: w.trap },
      { key: 'dev', label: 'Jarak-Mean', value: fDev, weight: w.dev },
      { key: 'vol', label: 'Volume OBV', value: fVol, weight: w.vol },
    ]

    const reasons: string[] = [
      `Rezim terdeteksi: ${regime} (drift-Z ${driftZ.toFixed(2)}, lintas-mean 48j ${cross}×/96j ${cross96}×, jarak mean ${dist96.toFixed(2)}σ, BW p${(bwRank * 100).toFixed(0)}${squeezeOn ? ', squeeze AKTIF' : ''}${freshBreak ? ', breakout baru' : ''}${postBreak ? ', pasca-ekspansi' : ''}${blowoff ? ', BLOWOFF' : ''}${postBlow ? ', PUNCAK-RUNTUH' : ''}${hyped ? ', VERTIKAL' : ''}${stall ? ', STALL-TOP' : ''}${recovery ? ', PEMULIHAN-V' : ''})`,
    ]
    const ranked = [...factors].sort((a, b) => Math.abs(b.value * b.weight) - Math.abs(a.value * a.weight))
    for (const f of ranked.slice(0, 4)) {
      if (Math.abs(f.value) < 0.06) continue
      reasons.push(describeFactor(f, { r, pctB, atrPct, adx: adxv(visible), bwRank, slope21, last6 }))
    }
    reasons.push(
      `Vonis: ${dir} (keyakinan ${(conf * 100).toFixed(0)}%) untuk 24 jam dari ${test.symbol} pada jam ke-${n}`,
    )
    const ret24 = px / closes[n - 25] - 1
    const roc48 = px / closes[n - 49] - 1
    return {
      dir,
      conf,
      score,
      regime,
      reasons,
      factors,
      pUp: dir === 'NAIK' ? conf : 1 - conf,
      flags: { osc, trend: driftStrength > 0.45, squeeze: squeezeOn || freshBreak },
      extra: {
        ret24n: I.clamp(ret24 / 0.06, -1.5, 1.5),
        roc48n: I.clamp(roc48 / 0.12, -1.5, 1.5),
        rsiN: (r - 50) / 50,
        extN: I.clamp(ext, -1.5, 1.5),
        bwRank,
        atrPct,
      },
    }
  },
}

/** rata-rata berjalan window W (untuk deteksi lintas-mean yang jujur) */
function rollingMean(vals: number[], w: number): number[] {
  const out = new Array<number>(vals.length).fill(0)
  let acc = 0
  for (let i = 0; i < vals.length; i++) {
    acc += vals[i]
    if (i >= w) acc -= vals[i - w]
    out[i] = acc / Math.min(i + 1, w)
  }
  return out
}

/** ADX sekali hitung (helper kecil agar panggilan eksplisit) */
function adxv(candles: Candle[]): number {
  return I.adx(candles, 14)[candles.length - 1]
}

/** struktur swing terpisah agar urutan deklarasi aman */
function structOf(closes: number[], atrVal: number): number {
  const sw = I.findSwings(closes.slice(-120), 5)
  return I.structureScore(sw, atrVal)
}

// ------------------------------------------------------------
// BASELINE
// ------------------------------------------------------------

export const SELALU_NAIK: Contestant = {
  id: 'SELAGAL-NAIK',
  name: 'Selalu-Naik',
  short: 'BULL DOGMA',
  color: '#94a3b8',
  desc: 'Dogma abadi: kripto pasti naik. Patokan bias optimisme.',
  predict() {
    return {
      dir: 'NAIK',
      conf: 0.52,
      score: 0.08,
      regime: '—',
      reasons: ['Dogma: kripto selalu naik jangka panjang.'],
      factors: [],
      pUp: 0.52,
      flags: { osc: false, trend: false, squeeze: false },
    }
  },
}

export const MOMEN_NAIF: Contestant = {
  id: 'MOMEN-NAIF',
  name: 'Momen Naif',
  short: 'MOMEN',
  color: '#a78bfa',
  desc: 'Ikuti arah 24 jam terakhir, titik. Tanpa konteks rezim.',
  predict(visible) {
    const c = visible.map((x) => x.c)
    const ret = c[c.length - 1] / c[c.length - 25] - 1
    const dir: 'NAIK' | 'TURUN' = ret >= 0 ? 'NAIK' : 'TURUN'
    return {
      dir,
      conf: 0.58,
      score: ret >= 0 ? 0.16 : -0.16,
      regime: '—',
      reasons: [`24 jam terakhir ${ret >= 0 ? 'naik' : 'turun'} ${Math.abs(ret * 100).toFixed(1)}% → ikuti.`],
      factors: [],
      pUp: dir === 'NAIK' ? 0.58 : 0.42,
      flags: { osc: false, trend: false, squeeze: false },
    }
  },
}

export const BALIK_ARAH: Contestant = {
  id: 'BALIK-ARAH',
  name: 'Balik-Arah Naif',
  short: 'MEANREV',
  color: '#2dd4bf',
  desc: 'Selalu lawan arah 12 jam terakhir — percaya semua harus memantul.',
  predict(visible) {
    const c = visible.map((x) => x.c)
    const ret = c[c.length - 1] / c[c.length - 13] - 1
    const dir: 'NAIK' | 'TURUN' = ret < 0 ? 'NAIK' : 'TURUN'
    return {
      dir,
      conf: 0.56,
      score: ret < 0 ? 0.12 : -0.12,
      regime: '—',
      reasons: [`12 jam terakhir ${ret >= 0 ? 'naik' : 'turun'} → pasti memantul.`],
      factors: [],
      pUp: dir === 'NAIK' ? 0.56 : 0.44,
      flags: { osc: false, trend: false, squeeze: false },
    }
  },
}

export const DADU: Contestant = {
  id: 'DADU',
  name: 'Dadu Berbibit',
  short: 'ACAK',
  color: '#fb7185',
  desc: 'Lempar koin deterministik per ujian — lantai keberuntungan murni.',
  predict(_visible, test) {
    const rng = makeRng(`dadu/${test.seed}`)
    const naik = rng.chance(0.5)
    return {
      dir: naik ? 'NAIK' : 'TURUN',
      conf: 0.5,
      score: naik ? 0.02 : -0.02,
      regime: '—',
      reasons: [`Lemparan koin berbibit untuk ${test.id}.`],
      factors: [],
      pUp: naik ? 0.5 : 0.5,
      flags: { osc: false, trend: false, squeeze: false },
    }
  },
}

export const CONTESTANTS: Contestant[] = [MICAPROFITA, MICAPROFITA_V3, MOMEN_NAIF, BALIK_ARAH, SELALU_NAIK, DADU]
