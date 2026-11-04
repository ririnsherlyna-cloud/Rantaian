// ============================================================
// MICAPROFITA SAKTI-MATA — otak pemahaman CANDLE cyborg.
//
// Fungsi ujian: menerima HANYA candle yang boleh dilihat
// (point-in-time, anti-hindsight by construction), membaca
// anatomi candle & struktur, lalu memberi vonis biner
// NAIK/TURUN.
//
// ARSITEKTUR BERLAPIS (lesson-layer):
//  - LAPIS_MOMENTUM = otak asli v231.0 (pengejar momentum —
//    state "1% AI" yang dirujuk Guru). DIPERTAHANKAN sebagai
//    artefak sejarah & pembanding, TIDAK diubah.
//  - Setiap celah yang ditemukan ujian 100 grafik likuidasi
//    ditambal sebagai LAPIS_PELAJARAN baru + entri LEDGER +
//    kenaikan versi. Perkembangan diterapkan pada FILE ini.
// ============================================================

import type { Candle } from './generator'
import * as I from './indicators'

export const SAKTI_MATA_VERSI = '231.5'

// ------------------------------------------------------------
// VISION — fitur point-in-time (tidak ada konsep masa depan)
// ------------------------------------------------------------

export interface CandleVision {
  n: number
  last: Candle
  price: number
  atr: number
  atrPct: number
  ema9: number
  ema21: number
  ema50: number
  ema21SlopeAtr: number
  rsi: number
  distEma21Atr: number
  green: boolean
  bodyPct: number
  upperWickPct: number
  lowerWickPct: number
  rangeAtr: number
  volZ: number
  volMean: number
  volClimax: boolean
  volAsym: number
  pivotHighs: number[]
  pivotLows: number[]
  hh: boolean
  lh: boolean
  hl: boolean
  ll: boolean
  rangeHigh: number
  rangeLow: number
  posInRange: number
  sweptLow: boolean
  sweptHigh: boolean
  recentBreakUp: boolean
  recentBreakDown: boolean
  breakLevel: number
  retestHold: boolean
  failedRetest: boolean
  consecutiveUp: number
  consecutiveDown: number
  squeeze: boolean
  bullEngulf: boolean
  bearEngulf: boolean
  hammer: boolean
  shootingStar: boolean
  doji: boolean
  divBull: boolean
  divBear: boolean
  mom12Atr: number
  /** v231.4 — horizon pendek: momentum 3 candle (dalam ATR) */
  mom3Atr: number
  /** v231.4 — netto 5 candle terakhir (dalam ATR): arah serangan sesaat */
  netLast5Atr: number
  /** v231.4 — posisi harga dalam JENDELA PENUH 60 candle (0=dasar, 1=puncak):
   *  pembeda struktural akumulasi-di-dasar vs trap-di-tengah-atas */
  posInWindow60: number
  /** v231.5 — level breakdown (low 10 candle lebih lama); pembanding reclaim */
  breakLevelDn: number
  /** v231.5 — jumlah badan HIJAU 6 candle terakhir (dalam ATR): kualitas dorongan */
  bodyUp6Atr: number
  /** v231.5 — jumlah badan MERAH 6 candle terakhir (dalam ATR): kualitas tekanan jual */
  bodyDn6Atr: number
  /** v231.5 — volZ maksimum zona sisa-tengah c(n-5)..c(n-3): jejak volume dorongan pertama */
  volZmidMax: number
  /** v231.5 — kedalaman kejatuhan dari puncak 10 candle (dalam ATR) */
  fallFromTop10Atr: number
  /** v231.5 — 6 return close-to-close terakhir (dalam ATR, terlama → terbaru):
   *  sidik jari alternasi (REAL) vs dorongan monoton (TRAP) */
  ret6Atr: number[]
  /** v231.5 — netto badan 3 candle terakhir (dalam ATR) */
  bodyRatio3Atr: number
  /** v231.5 — asimetri volume 5 candle terakhir (+1 penuh naik, -1 penuh turun) */
  volAsym5: number
  /** v231.5 — momentum 30 candle (dalam ATR): dari mana harga datang —
   *  downtrend tua (akumulasi) vs masih di area puncak (distribusi) */
  mom30Atr: number
  /** v231.5 — momentum 50 candle (dalam ATR): asal-usul JENDELA PENUH —
   *  pembeda paling robust akumulasi (downtrend tua, negatif) vs
   *  distribusi yang merosot ke dasar jendela (masih area puncak, positif) */
  mom50Atr: number
  /** v231.5 — kemiringan low 12 candle (dalam ATR/candle): Wyckoff sejati —
   *  akumulasi = low NAIK setelah spring (>= 0); distribusi = low TERUS
   *  turun (selalu negatif). Pemisah paling bersih kedua kelompok. */
  lowTrend12: number
  /** v231.5 — spring 8-24 candle lalu: wick menusuk di bawah low lama lalu
   *  lilin itu TERTUTUP balik di atasnya (sapu-dan-recover, ciri akumulasi;
   *  distribusi hanya tergelincir — tutup di bawah low lama) */
  spring13: boolean
  /** v231.5 — jumlah pergantian tanda pada 6 return terakhir (0=monoton):
   *  dorongan sehat bergerak SATU arah; chop/bounce noise berganti-ganti */
  rFlip: number
}

export function buildCandleVision(cs: Candle[]): CandleVision {
  const n = cs.length
  const last = cs[n - 1]
  const price = last.c
  const closes = cs.map((c) => c.c)
  const vols = cs.map((c) => c.v)

  const atrA = I.atr(cs, 14)
  const atr = Math.max(atrA[n - 1], price * 0.0006)
  const ema9A = I.ema(closes, 9)
  const ema21A = I.ema(closes, 21)
  const ema50A = I.ema(closes, 50)
  const rsiA = I.rsi(closes, 14)

  const range = Math.max(last.h - last.l, 1e-9)
  const body = last.c - last.o
  const bodyPct = Math.abs(body) / range
  const upperWickPct = (last.h - Math.max(last.o, last.c)) / range
  const lowerWickPct = (Math.min(last.o, last.c) - last.l) / range

  // volume
  const volWin = vols.slice(Math.max(0, n - 21), n - 1)
  const volMean = I.mean(volWin)
  const volSd = Math.max(I.stdev(volWin), 1e-9)
  const volZ = (last.v - volMean) / volSd
  const volClimax = last.v >= 2.2 * Math.max(volMean, 1e-9)
  let upV = 0
  let downV = 0
  let totV = 0
  for (let i = Math.max(0, n - 10); i < n; i++) {
    totV += cs[i].v
    if (cs[i].c >= cs[i].o) upV += cs[i].v
    else downV += cs[i].v
  }
  const volAsym = totV > 0 ? (upV - downV) / totV : 0

  // pivot fraktal k=2
  const pivotHighs: number[] = []
  const pivotLows: number[] = []
  const phIdx: number[] = []
  const plIdx: number[] = []
  for (let i = 2; i < n - 2; i++) {
    const h = cs[i].h
    const l = cs[i].l
    if (h > cs[i - 1].h && h > cs[i - 2].h && h > cs[i + 1].h && h > cs[i + 2].h) {
      pivotHighs.push(h)
      phIdx.push(i)
    }
    if (l < cs[i - 1].l && l < cs[i - 2].l && l < cs[i + 1].l && l < cs[i + 2].l) {
      pivotLows.push(l)
      plIdx.push(i)
    }
  }
  const hh = pivotHighs.length >= 2 ? pivotHighs[pivotHighs.length - 1] > pivotHighs[pivotHighs.length - 2] : false
  const lh = pivotHighs.length >= 2 ? pivotHighs[pivotHighs.length - 1] < pivotHighs[pivotHighs.length - 2] : false
  const hl = pivotLows.length >= 2 ? pivotLows[pivotLows.length - 1] > pivotLows[pivotLows.length - 2] : false
  const ll = pivotLows.length >= 2 ? pivotLows[pivotLows.length - 1] < pivotLows[pivotLows.length - 2] : false

  // range & posisi
  const win20 = cs.slice(Math.max(0, n - 22), n - 1)
  const rangeHigh = Math.max(...win20.map((c) => c.h))
  const rangeLow = Math.min(...win20.map((c) => c.l))
  const posInRange = Math.max(-0.3, Math.min(1.3, (price - rangeLow) / Math.max(rangeHigh - rangeLow, 1e-9)))

  // sweep: lilin terakhir menusuk low/high 8 candle sebelumnya lalu menutup balik
  const priorLows = cs.slice(Math.max(0, n - 9), n - 1).map((c) => c.l)
  const priorHighs = cs.slice(Math.max(0, n - 9), n - 1).map((c) => c.h)
  const minPriorLow = Math.min(...priorLows)
  const maxPriorHigh = Math.max(...priorHighs)
  const sweptLow = last.l < minPriorLow && last.c > minPriorLow
  const sweptHigh = last.h > maxPriorHigh && last.c < maxPriorHigh

  // konteks breakout: level = range 10 candle sesudahnya vs 10 candle lebih lama
  const older = cs.slice(Math.max(0, n - 20), Math.max(0, n - 10))
  const recent = cs.slice(Math.max(0, n - 10), n)
  const breakLevel = older.length ? Math.max(...older.map((c) => c.h)) : price
  const breakLevelDn = older.length ? Math.min(...older.map((c) => c.l)) : price
  const recentBreakUp = recent.length ? Math.max(...recent.map((c) => c.h)) > breakLevel : false
  const recentBreakDown = recent.length ? Math.min(...recent.map((c) => c.l)) < breakLevelDn : false
  const retestHold =
    (recentBreakUp && last.l > breakLevel && last.c > breakLevel && !volClimaxAt(cs, n, 2.4)) ||
    (recentBreakDown && last.h < breakLevelDn && last.c < breakLevelDn && !volClimaxAt(cs, n, 2.4))
  const failedRetest =
    (recentBreakUp && last.c < breakLevel) || (recentBreakDown && last.c > breakLevelDn)

  // streak & momentum
  let consecutiveUp = 0
  let consecutiveDown = 0
  for (let i = n - 1; i >= 0; i--) {
    if (cs[i].c > cs[i].o) {
      if (consecutiveDown > 0) break
      consecutiveUp++
    } else if (cs[i].c < cs[i].o) {
      if (consecutiveUp > 0) break
      consecutiveDown++
    } else break
  }
  const back12 = cs[Math.max(0, n - 13)].c
  const mom12Atr = (price - back12) / atr
  // v231.4 — horizon pendek & netto serangan (multi-horizon, anti pendek-pikir)
  const mom3Atr = (price - cs[Math.max(0, n - 4)].c) / atr
  const netLast5Atr = (price - cs[Math.max(0, n - 6)].c) / atr
  const winLow60 = Math.min(...cs.map((c) => c.l))
  const winHigh60 = Math.max(...cs.map((c) => c.h))
  const posInWindow60 = Math.max(-0.3, Math.min(1.3, (price - winLow60) / Math.max(winHigh60 - winLow60, 1e-9)))
  // v231.5 — anatomi dorongan: badan naik/turun 6 candle & volume zona sisa
  let bodyUp6 = 0
  let bodyDn6 = 0
  for (let i = Math.max(0, n - 6); i < n; i++) {
    const b = cs[i].c - cs[i].o
    if (b >= 0) bodyUp6 += b
    else bodyDn6 += -b
  }
  const volZat = (idx: number): number => (vols[idx] - volMean) / volSd
  const volZmidMax = Math.max(...[n - 5, n - 4, n - 3].filter((i) => i >= 0).map(volZat), -9)
  const top10 = Math.max(...cs.slice(Math.max(0, n - 10)).map((c) => c.h))
  const fallFromTop10Atr = (top10 - price) / atr
  const ret6Atr: number[] = []
  for (let i = Math.max(1, n - 6); i < n; i++) ret6Atr.push((cs[i].c - cs[i - 1].c) / atr)
  let up3 = 0
  let dn3 = 0
  for (let i = Math.max(0, n - 3); i < n; i++) {
    const b = cs[i].c - cs[i].o
    if (b >= 0) up3 += b
    else dn3 += -b
  }
  let upV5 = 0
  let dnV5 = 0
  for (let i = Math.max(0, n - 5); i < n; i++) {
    if (cs[i].c >= cs[i].o) upV5 += cs[i].v
    else dnV5 += cs[i].v
  }
  const volAsym5 = upV5 + dnV5 > 0 ? (upV5 - dnV5) / (upV5 + dnV5) : 0
  const mom30Atr = (price - cs[Math.max(0, n - 31)].c) / atr
  let lowTrend12 = 0
  const mom50Atr = (price - cs[Math.max(0, n - 51)].c) / atr
  // lowTrend12: regresi-linier low 12 candle terakhir (robust noise)
  {
    const st = Math.max(0, n - 12)
    const m = cs.slice(st)
    const k = m.length
    const xm = (k - 1) / 2
    const ym = m.reduce((s, c) => s + c.l, 0) / k
    let sxy = 0
    let sxx = 0
    for (let i = 0; i < k; i++) {
      sxy += (i - xm) * (m[i].l - ym)
      sxx += (i - xm) ** 2
    }
    lowTrend12 = sxx > 0 ? sxy / sxx / atr : 0
  }
  // spring13 (Wyckoff): sapuan-recover TERAKHIR di c(n-23)..c(n-7) yang
  // LANTAINYA TAHAN — tidak ada low baru di bawah low sapuan setelahnya.
  // (Dalam drift-turun/distribusi: sapuan terus berlanjut atau tak pulih
  //  → bukan spring. Hanya basis akumulasi yang menyapu SEKALI lalu tahan.)
  let spring13 = false
  for (let i = n - 8; i >= Math.max(17, n - 24); i--) {
    let priorMin = Infinity
    for (let j = Math.max(0, i - 17); j < i; j++) priorMin = Math.min(priorMin, cs[j].l)
    if (cs[i].l < priorMin && cs[i].c > priorMin) {
      let hold = true
      for (let j = i + 1; j < n; j++) {
        if (cs[j].l < cs[i].l) {
          hold = false
          break
        }
      }
      if (hold) spring13 = true
      break // hanya sapuan terakhir yang dinilai
    }
  }
  // rFlip: pergantian tanda return 6 candle terakhir (0 = dorongan monoton)
  let rFlip = 0
  for (let i = 1; i < ret6Atr.length; i++) {
    if (ret6Atr[i] !== 0 && ret6Atr[i - 1] !== 0 && Math.sign(ret6Atr[i]) !== Math.sign(ret6Atr[i - 1])) rFlip++
  }

  // squeeze: ATR sekarang di persentil rendah jendela 40
  let squeeze = false
  if (n >= 41) {
    const win = atrA.slice(n - 40, n)
    const mn = Math.min(...win)
    const mx = Math.max(...win)
    squeeze = mx > mn && (atr - mn) / (mx - mn) < 0.25
  }

  // pola lilin
  const prev = cs[n - 2] ?? last
  const bullEngulf =
    prev.c < prev.o && last.c > last.o && last.c > prev.o && last.o <= prev.c && Math.abs(body) > Math.abs(prev.c - prev.o) * 1.05
  const bearEngulf =
    prev.c > prev.o && last.c < last.o && last.c < prev.o && last.o >= prev.c && Math.abs(body) > Math.abs(prev.c - prev.o) * 1.05
  const doji = bodyPct < 0.15 && range / atr > 0.7
  const hammer = lowerWickPct > 0.5 && bodyPct < 0.4 && upperWickPct < 0.25
  const shootingStar = upperWickPct > 0.5 && bodyPct < 0.4 && lowerWickPct < 0.25

  // divergensi RSI pada pivot
  let divBear = false
  let divBull = false
  if (phIdx.length >= 2) {
    const a = phIdx[phIdx.length - 2]
    const b = phIdx[phIdx.length - 1]
    if (closes[b] > closes[a] && rsiA[b] < rsiA[a] - 2) divBear = true
  }
  if (plIdx.length >= 2) {
    const a = plIdx[plIdx.length - 2]
    const b = plIdx[plIdx.length - 1]
    if (closes[b] < closes[a] && rsiA[b] > rsiA[a] + 2) divBull = true
  }

  const ema21SlopeAtr = (ema21A[n - 1] - ema21A[Math.max(0, n - 4)]) / (3 * atr)

  return {
    n, last, price, atr, atrPct: atr / price,
    ema9: ema9A[n - 1], ema21: ema21A[n - 1], ema50: ema50A[n - 1],
    ema21SlopeAtr, rsi: rsiA[n - 1],
    distEma21Atr: (price - ema21A[n - 1]) / atr,
    green: body > 0, bodyPct, upperWickPct, lowerWickPct, rangeAtr: range / atr,
    volZ, volMean, volClimax, volAsym,
    pivotHighs, pivotLows, hh, lh, hl, ll,
    rangeHigh, rangeLow, posInRange,
    sweptLow, sweptHigh,
    recentBreakUp, recentBreakDown, breakLevel, retestHold, failedRetest,
    consecutiveUp, consecutiveDown, squeeze,
    bullEngulf, bearEngulf, hammer, shootingStar, doji,
    divBull, divBear, mom12Atr, mom3Atr, netLast5Atr, posInWindow60,
    breakLevelDn, bodyUp6Atr: bodyUp6 / atr, bodyDn6Atr: bodyDn6 / atr, volZmidMax,
    fallFromTop10Atr, ret6Atr,
    bodyRatio3Atr: (up3 - dn3) / atr, volAsym5, mom30Atr, mom50Atr, lowTrend12, spring13, rFlip,
  }
}

function volClimaxAt(cs: Candle[], n: number, k: number): boolean {
  const win = cs.slice(Math.max(0, n - 21), n - 1)
  const m = I.mean(win.map((c) => c.v))
  return cs[n - 1].v >= k * Math.max(m, 1e-9)
}

// ------------------------------------------------------------
// MESIN VONIS BERLAPIS
// ------------------------------------------------------------

export interface SaktiVonis {
  arah: 'NAIK' | 'TURUN'
  conf: number
  score: number
  versi: string
  alasan: string[]
  pelajaranAktif: string[]
}

interface LapisOutput {
  arah: 'NAIK' | 'TURUN'
  bobot: number
  alasan: string
}

interface SaktiLapis {
  id: string
  versi: string
  jenis: 'INTI' | 'PELAJARAN'
  aktif(v: CandleVision): LapisOutput | null
}

// LAPIS INTI v231.0 — otak momentum naif (artefak "1% AI").
// Dibiarkan apa adanya; pelajaran yang menambalnya di atas.
const LAPIS_MOMENTUM: SaktiLapis = {
  id: 'MOMENTUM-INTI',
  versi: '231.0',
  jenis: 'INTI',
  aktif(v) {
    let s = 0
    if (v.ema9 > v.ema21) s += 0.5
    else s -= 0.5
    if (v.ema21SlopeAtr > 0.03) s += 0.4
    else if (v.ema21SlopeAtr < -0.03) s -= 0.4
    if (v.green) s += 0.25
    else s -= 0.25
    if (v.recentBreakUp) s += 1.1 // racun v231.0: mengejar breakout
    if (v.recentBreakDown) s -= 1.1
    if (v.consecutiveUp >= 3) s += 0.5 // racun v231.0: FOMO
    if (v.consecutiveDown >= 3) s -= 0.5
    if (v.hh && v.hl) s += 0.45
    if (v.ll && v.lh) s -= 0.45
    const arah = s >= 0 ? 'NAIK' : 'TURUN'
    return { arah, bobot: Math.min(2.2, Math.abs(s) + 0.3), alasan: `momentum inti: EMA ${v.ema9 > v.ema21 ? 'bull' : 'bear'}, slope ${v.ema21SlopeAtr >= 0 ? '+' : ''}${v.ema21SlopeAtr.toFixed(2)} ATR, mom12 ${v.mom12Atr.toFixed(1)} ATR` }
  },
}

// ===== LAPIS PELAJARAN — ditambal dari bukti bedah ujian =====
//
// SIKLUS 0 (v231.0: 37/100, 62 likuidasi) menemukan celah:
//  - Stop Hunt Support/Resistance: 0/10 + 0/10 — inti membaca wick
//    penolakan sebagai kelanjutan arah (persis cara profesional
//    dilikuidasi).
//  - Pump & Dump: 0/10 — mengejar parabolik, buta kelelahan klimaks.
//  - Kapitulasi V: 0/10 — menjual lilin kapitulasi (dasar persis).
//  - Bull Trap: 0/7 — buta breakout yang dicabut.
//  - Kaskade V & Shakeout: 0/6 + 0/10 — buta kualitas pantulan &
//    shakeout dalam tren (ditambal di siklus berikutnya).
const LAPIS_PELAJARAN: SaktiLapis[] = [
  {
    id: 'L1-SWEEP-LIKUIDASI',
    versi: '231.1',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti siklus 0: wick penolakan >= 30% + volume raksasa + lilin
      // pulih melawan arah lama, dekat EMA21 = sapuan stop, bukan breakout.
      if (
        v.lowerWickPct >= 0.25 && v.volZ >= 1.4 && v.mom12Atr < 0 &&
        v.green && (v.bullEngulf || v.sweptLow || v.hammer) && v.distEma21Atr > -2.2 &&
        v.posInRange >= 0.26 && !zonaBear(v)
      ) {
        return { arah: 'NAIK', bobot: 2.8, alasan: 'sweep likuidasi di bawah: wick menusuk low + volume raksasa + lilin pulih hijau — long lemah sudah cair, jangan ikut jual' }
      }
      // Reclaim lantang: badan penuh + volume raksasa merebut balik level
      // breakdown setelah dipompa (bukan wick sapu — badan engulF).
      if (
        v.recentBreakDown && v.failedRetest && v.green && v.bodyPct >= 0.55 &&
        v.volZ >= 1.8 && v.mom3Atr >= 1.0 && v.netLast5Atr >= 0.4 &&
        v.distEma21Atr >= -2.2
      ) {
        return { arah: 'NAIK', bobot: 2.6, alasan: `reclaim lantang: badan penuh ${v.consecutiveUp >= 1 ? 'hijau' : ''} bervolume raksasa (volZ ${v.volZ.toFixed(1)}) merebut balik level breakdown dengan aliran pulih (net5 +${v.netLast5Atr.toFixed(1)}) — penjual breakdown cair` }
      }
      if (
        v.upperWickPct >= 0.25 && v.volZ >= 1.4 && v.mom12Atr > 0 &&
        !v.green && (v.bearEngulf || v.sweptHigh || v.shootingStar) && v.distEma21Atr < 2.2 &&
        v.posInRange <= 0.65
      ) {
        return { arah: 'TURUN', bobot: 2.8, alasan: 'sweep likuidasi di atas: wick menusuk high + volume raksasa + lilin ditolak merah — short lemah sudah cair, jangan ikut beli' }
      }
      return null
    },
  },
  {
    id: 'L2-KLIMAKS-KELELAHAN',
    versi: '231.1',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti siklus 0: pump mom12 +6..+7.5 ATR & dist +3.8..+4.4 ATR
      // berakhir TURUN; kapitulasi cerminnya berakhir NAIK.
      if (v.distEma21Atr >= 2.6 && v.mom12Atr >= 4.0 && (v.upperWickPct >= 0.4 || v.doji || v.shootingStar)) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `klimaks parabolik: harga +${v.distEma21Atr.toFixed(1)} ATR dari EMA21, mom12 +${v.mom12Atr.toFixed(1)} ATR, wick kelelahan — buyer terakhir sudah masuk` }
      }
      if (v.distEma21Atr <= -2.6 && v.mom12Atr <= -3.8 && (v.lowerWickPct >= 0.4 || v.doji || v.hammer)) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `kapitulasi: harga ${v.distEma21Atr.toFixed(1)} ATR dari EMA21, mom12 ${v.mom12Atr.toFixed(1)} ATR, wick penyerahan — penjual terakhir sudah jual, pantulan V` }
      }
      return null
    },
  },
  {
    id: 'L3-BREAKOUT-DICABUT',
    versi: '231.1',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti siklus 0: bull trap 0/7 — breakout yang dicabut kembali
      // ke dalam range adalah jebakan, bukan momentum.
      // GUARD v231.4 (bukti suite luar): (1) jangan tuduh bull-trap saat
      // grafik adalah BASIS AKUMULASI di dasar jendela penuh (posWindow
      // rendah + momentum tak meluas + HL mikro) — itu markup, bukan trap;
      // (2) jangan tuduh bull-trap saat reclaim PUMP berkuasa (4+ hijau
      // berturut di paruh atas range) — itu bear-trap terkonfirmasi.
      const reclaimPumpKuat = v.consecutiveUp >= 4 && v.posInRange >= 0.8
      if (basisAkumulasi(v) || reclaimPumpKuat || springReclaim(v) || basisDalam(v) || zonaBull(v)) return null
      if (v.recentBreakUp && v.failedRetest && v.distEma21Atr < 2.2 && (v.mom12Atr < 1.0 || v.posInRange < 0.45 || (v.divBear && v.posInRange < 0.7)) && !v.hammer && !(v.green && v.lowerWickPct >= 0.3)) {
        return { arah: 'TURUN', bobot: 2.4, alasan: 'bull trap: breakout baru saja DICABUT — tutup kembali di dalam range; pengejar breakout terjebak di atas' }
      }
      if (v.recentBreakDown && v.failedRetest && v.distEma21Atr > -2.2 && v.mom12Atr > -1.0 && v.posInRange >= 0.5 && !v.shootingStar && !(!v.green && v.upperWickPct >= 0.3)) {
        return { arah: 'NAIK', bobot: 2.4, alasan: 'bear trap: breakdown baru saja DICABUT — tutup kembali ke paruh atas range; penjual breakdown terjebak di bawah' }
      }
      return null
    },
  },
  {
    id: 'L4-SHAKEOUT-VOLUME-KERING',
    versi: '231.2',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti siklus 1 (shakeout 0/10): koreksi dalam uptrend dengan
      // volume KERING (volZ <= 0) + wick penolakan + struktur HH/HL
      // masih utuh SELALU lanjut — bukan reversal. Kebalikan kapitulasi
      // (yang volume-nya meledak).
      if (
        v.hammer && v.lowerWickPct >= 0.45 && v.volZ <= 0 &&
        v.mom12Atr <= 0.3 && v.mom12Atr >= -4.6 && v.mom3Atr <= 0.3 &&
        v.distEma21Atr > -3.0 &&
        (v.hh || v.hl || v.sweptLow) && !zonaBear(v)
      ) {
        return { arah: 'NAIK', bobot: 2.8, alasan: 'shakeout dalam uptrend: koreksi volume kering + wick penolakan di zona demand + struktur besar utuh — penurunan palsu, tren lanjut' }
      }
      if (
        v.shootingStar && v.upperWickPct >= 0.45 && v.volZ <= 0 &&
        v.mom12Atr >= 1.0 && v.mom12Atr <= 3.5 && v.distEma21Atr < 2.4 &&
        (v.lh || v.ll || v.sweptHigh)
      ) {
        return { arah: 'TURUN', bobot: 2.6, alasan: 'upthrust dalam downtrend: rally volume kering + wick penolakan di zona supply + struktur besar utuh — kenaikan palsu, tren lanjut turun' }
      }
      return null
    },
  },
  {
    id: 'L5-PANTULAN-BERKUALITAS',
    versi: '231.2',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti siklus 1 (kaskade V 0/6): setelah pendarahan, pantulan
      // 2 lilin hijau dengan BADAN PENUH & wick atas kecil = pembalikan
      // V; pantulan badan kecil + wick atas besar = kucing mati.
      if (
        v.mom12Atr <= -1.2 && v.consecutiveUp >= 2 && v.green &&
        v.bodyPct >= 0.45 && v.upperWickPct <= 0.3 && v.posInRange >= 0.3 && !zonaBear(v)
      ) {
        return { arah: 'NAIK', bobot: 2.6, alasan: 'pantulan berkualitas pasca-pendarahan: 2 lilin hijau berturut badan penuh + wick atas kecil — pembeli besar masuk, bukan kucing mati' }
      }
      if (
        v.mom12Atr >= 1.5 && v.consecutiveDown >= 2 && !v.green &&
        v.bodyPct >= 0.45 && v.lowerWickPct <= 0.3 && v.posInRange <= 0.7
      ) {
        return { arah: 'TURUN', bobot: 2.4, alasan: 'pelepasan berkualitas pasca-pompa: 2 lilin merah berturut badan penuh + wick bawah kecil — penjual besar masuk, bukan jeda' }
      }
      return null
    },
  },
  {
    id: 'L7-TRAP-BALIK-KE-DALAM',
    versi: '231.4',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti suite luar A/B (bull trap TRAP salah-vonis NAIK): harga
      // breakout-up sudah ditolak dan JATUH BALIK menuju level, namun
      // satu lilin hijau kecil (sapu-low volume kering / divBear) membuat
      // inti momentum membeli lagi. Itu pantulan mati DALAM jebakan.
      const reclaimSah = v.green && v.lowerWickPct >= 0.35 && v.volZ >= 1.4 // wilayah L1, bukan di sini
      // Shakeout sejati: hammer volume-kering = tanda penyerahan penjual
      // justru di zona demand (wilayah L4) — BUKAN pantulan-mati trap.
      const shakeoutHammer = v.hammer && v.volZ <= 0
      if (basisAkumulasi(v) || reclaimSah || shakeoutHammer || zonaBull(v) || zonaBear(v) || basisDalam(v)) return null
      // Lengan a: jatuh-balik terbukti — 2+ merah berturut dan harga sudah
      // menutup kembali di bawah level ATAU netto 5 candle terakhir curam.
      if (
        v.recentBreakUp && v.consecutiveDown >= 2 &&
        (v.failedRetest || v.netLast5Atr <= -0.8) &&
        v.volZ <= 1.2 && v.distEma21Atr < 2.2 &&
        (v.distEma21Atr <= -0.5 || v.netLast5Atr <= -1.8) &&
        !(v.consecutiveUp >= 4 && v.posInRange >= 0.8)
      ) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `bull trap jatuh-balik: breakout ditolak, ${v.consecutiveDown} lilin merah berturut menyeret harga balik (net5 ${v.netLast5Atr.toFixed(1)} ATR) — pantulan hijau kecil hanyalah jeda dalam jebakan` }
      }
      // Lengan b: pump sudah meluas + divBear + lilin hijau reclaim VOLUME
      // KERING setelah masuk balik = dead-cat dalam trap, bukan pembalikan.
      if (
        v.recentBreakUp && !v.retestHold && v.divBear &&
        v.mom12Atr >= 1.5 && v.distEma21Atr <= 1.2 && v.posInRange <= 0.7 &&
        v.volZ <= 0.6
      ) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `bull trap pantulan-mati: pump meluas (mom12 +${v.mom12Atr.toFixed(1)} ATR) tapi RSI divergen-bear & reclaim hijau volume kering (volZ ${v.volZ.toFixed(1)}) — buyer sebenarnya sudah habis` }
      }
      // Lengan c: level "tahan" tapi ALIRAN DANA distribusi — netto 5
      // candle curam turun + momen sesaat menjual + volume kering: breakout
      // tak lagi menarik pembeli; trap hanya menunggu waktu jatuh.
      if (
        v.recentBreakUp && (v.failedRetest || v.retestHold) &&
        v.netLast5Atr <= -0.65 && v.mom3Atr <= -0.03 &&
        v.volZ <= 0.8 && v.volAsym <= 0.3 &&
        v.distEma21Atr < 2.4 && !shakeoutHammer && !basisAkumulasi(v) &&
        !(v.hh && v.hl && v.distEma21Atr >= -0.5)
      ) {
        return { arah: 'TURUN', bobot: 2.5, alasan: `bull trap aliran-dana: level nominal "tahan" tapi netto 5 candle ${v.netLast5Atr.toFixed(1)} ATR & momen sesaat ${v.mom3Atr.toFixed(1)} ATR menjual dengan volume kering — tak ada pembeli nyata di balik breakout` }
      }
      // Lengan g: kejatuhan berjalan tanpa breakout-flag — 5+ merah beruntun
      // dengan netto jual saat EMA belum berbalik: jangan beli "diskon".
      if (
        v.consecutiveDown >= 5 && v.netLast5Atr <= -0.8 &&
        v.mom12Atr <= 1.6 && v.posInWindow60 >= 0.35 &&
        Math.abs(v.ema21SlopeAtr) <= 0.06
      ) {
        return { arah: 'TURUN', bobot: 2.5, alasan: `kejatuhan berjalan: ${v.consecutiveDown} lilin merah berturut (net5 ${v.netLast5Atr.toFixed(1)} ATR) meski EMA belum berbalik — jangan beli diskon di tengah jurang` }
      }
      // Lengan d: penolakan bearish-engulf di puncak dengan VOLUME SAPUAN
      // raksasa (wilayah stop-hunt resistance GILA) — pembeli breakout
      // terakhir disedot habis; engulF volume-kering biasa TIDAK dihitung
      // (bisa jadi sekadar dip dalam tren asli).
      if (
        v.bearEngulf && v.volZ >= 2.0 && v.mom12Atr > 0 && v.posInRange >= 0.7
      ) {
        return { arah: 'TURUN', bobot: 2.5, alasan: 'sapuan klimaks di puncak: engulF merah bervolume raksasa menyedot pembeli breakout terakhir — likuidasi long di atas' }
      }
      // Lengan e: sapuan penolakan di pumpan MELUAS dengan struktur LH/LL —
      // pumpan tak lagi naik-sehat; wick di atas = distribusi puncak pump.
      if (
        v.sweptHigh && v.mom12Atr >= 3.0 && v.posInRange >= 0.8 &&
        v.lh && v.ll && v.volAsym <= 0.5
      ) {
        return { arah: 'TURUN', bobot: 2.8, alasan: 'sapuan penolakan di pumpan meluas: harga menusuk high lalu tertahan dengan struktur LH/LL — buyer terakhir sudah masuk, distribusi puncak pump' }
      }
      // Lengan e2: pumpan meluas kehabisan napas — momen sesaat menjual,
      // netto padam, tanpa pembeli kuasa volume.
      if (
        v.mom12Atr >= 3.0 && v.mom3Atr <= -0.4 && v.netLast5Atr <= 0.6 &&
        v.posInRange >= 0.8 && v.volAsym <= 0.2
      ) {
        return { arah: 'TURUN', bobot: 2.5, alasan: 'pumpan meluas kehabisan napas: momen sesaat menjual & netto 5 candle padam di puncak — tanpa pembeli kuasa, hanya tinggal jual' }
      }
      // Lengan f: puncak lelah — EMA nyaris datar, harga gagal memanjat
      // (LH, tutup merah) dengan volume jual, TANPA dorongan sisa (vZmid
      // rendah membedakan dari trap-pump yang dorongannya berVolume).
      if (
        v.posInWindow60 >= 0.55 && v.posInRange <= 0.4 &&
        v.mom12Atr >= -0.7 && v.mom12Atr <= 0.3 &&
        v.lh && !v.green && v.volZ >= 1.0 && v.volZmidMax <= 0.2 &&
        Math.abs(v.ema21SlopeAtr) <= 0.03
      ) {
        return { arah: 'TURUN', bobot: 2.4, alasan: 'puncak lelah: EMA nyaris datar, LH dengan tutup merah bervolume jual, tanpa dorongan sisa — rally gagal, distribusi menunggu waktu' }
      }
      return null
    },
  },
  {
    id: 'L8-MOMENTUM-BERAT',
    versi: '231.4',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti suite luar A/B (bear trap REAL salah-vonis NAIK): momentum
      // 12-candle masih -2.2..-4.6 ATR, penjual masih menguasai volume
      // (volAsym negatif), pantulan hijau kecil BERVOLUME KERING —
      // itu koreksi dalam kejatuhan nyata, bukan dasar. (Kapitulasi sejati
      // terlindung L2: harga jauh di bawah EMA21 + volume meledak.)
      // Bukti suite luar A (bear trap REAL #54): pantulan naik justru
      // DITOLAK tepat di bekas support (sapu-high) sementara penjual masih
      // kuasa volume — retest level sebagai resistance gagal, lanjut turun.
      const momBerat = v.mom12Atr <= -2.2 && v.mom12Atr >= -4.6
      const retestTertolak = v.sweptHigh && v.mom12Atr <= -1.8
      if (zonaBear(v) || basisDalam(v)) return null // kepala L10 pemilik zona
      if (
        (momBerat || retestTertolak) &&
        v.volAsym <= -0.1 && v.consecutiveUp <= 1 && v.volZ <= 0.8 &&
        v.distEma21Atr >= -2.4 && v.distEma21Atr <= 1.4 &&
        !(v.hammer && v.volZ <= 0)
      ) {
        return { arah: 'TURUN', bobot: 2.5, alasan: `kejatuhan berat belum selesai: mom12 ${v.mom12Atr.toFixed(1)} ATR + penjual kuasa volume (asym ${v.volAsym.toFixed(2)}) + pantulan volume kering${v.sweptHigh ? ' + retest ditolak di bekas support' : ''} — breakdown nyata, jangan beli koreksi` }
      }
      // Bukti suite luar B (#84 bear trap TRAP salah-vonis TURUN): reclaim
      // PUMP berkuasa (4+ hijau berturut) menembus balik level & menutup di
      // paruh atas range dengan momentum sudah pulih = bear trap terkonfirmasi.
      if (
        (v.recentBreakDown || v.recentBreakUp) && v.failedRetest &&
        v.consecutiveUp >= 4 && v.posInRange >= 0.8 && v.mom12Atr >= -1.2
      ) {
        return { arah: 'NAIK', bobot: 2.4, alasan: `reclaim berkuasa: ${v.consecutiveUp} lilin hijau berturut merebut balik level & bertahan paruh atas range — penjual breakdown sudah terjebak, trap pulih naik` }
      }
      return null
    },
  },
  {
    id: 'L9-SPRING-AKUMULASI',
    versi: '231.4',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Bukti suite luar A/B (akumulasi salah-vonis TURUN): basis datar di
      // DASAR jendela penuh (posWindow rendah) setelah downtrend, EMA21
      // mendatar, momentum netral, HL mikro / spring tersapu, harga kini di
      // paruh atas basis = markup dimulai. Berbeda dari bull-trap yang
      // jatuh dari PUNCAK jendela (posWindow tengah-atas).
      if (
        Math.abs(v.ema21SlopeAtr) <= 0.08 &&
        v.distEma21Atr >= -0.6 && v.distEma21Atr <= 1.0 &&
        v.mom12Atr >= -1.0 && v.mom12Atr <= 1.2 &&
        v.posInWindow60 <= 0.42 && v.posInRange >= 0.5 &&
        (v.hl || v.hh || v.sweptLow) && v.volAsym >= -0.3
      ) {
        return { arah: 'NAIK', bobot: 2.6, alasan: `basis akumulasi: EMA21 mendatar, harga bertahan paruh atas basis di dasar jendela penuh (posWindow ${(v.posInWindow60 * 100).toFixed(0)}%) dengan HL/spring utuh — tangan kuat sudah mengisi, markup berikutnya` }
      }
      // Jalur kedua: spring-reclaim langsung terbaca pada lilin keputusan
      // (sapu-low + HL + volume pembeli) meski posisi-jendela tak tipikal.
      if (springReclaim(v)) {
        return { arah: 'NAIK', bobot: 2.6, alasan: 'spring akumulasi: sapuan low ditutup balik dengan volume pembeli + HL mikro + EMA21 datar — sapuan hanya menyapu stop penjual lemah, markup siap' }
      }
      // Spring pulih + aliran pembeli pulih (bukti hakim-2 #73): sapuan-tahan
      // baru saja terjadi di paruh bawah jendela dengan pembeli kembali —
      // bukan tuduhan trap.
      if (
        v.spring13 && v.posInWindow60 <= 0.45 && v.volAsym >= 0.25 &&
        v.netLast5Atr >= -1.0 && v.mom3Atr >= -1.0
      ) {
        return { arah: 'NAIK', bobot: 2.5, alasan: 'spring pulih dengan pembeli kembali: sapuan-tahan di dasar jendela + aliran hijau membaik — akumulasi berlangsung, bukan trap' }
      }
      // ===== PREDIKAT AKUMULASI TERPADU v231.5 (menggantikan 6 jalur) =====
      // Anti-distribusi berlapis: mom50 (asal jendela: downtrend tua vs
      // puncak) + lowTrend12 (low Wyckoff: naik vs terus turun) + spring13.
      // Anti-trap: aliran tak boleh jatuh keras & momentum tak meluas.
      const akumulasiPenuh =
        v.mom50Atr <= -0.5 &&
        (v.lowTrend12 >= -0.02 || (v.spring13 && v.lowTrend12 >= -0.08)) &&
        v.posInWindow60 <= 0.55 && v.distEma21Atr >= -1.7 && v.distEma21Atr <= 1.0 &&
        Math.abs(v.ema21SlopeAtr) <= 0.15 && v.mom12Atr >= -2.6 && v.mom12Atr <= 1.6 &&
        v.consecutiveDown <= 4 && v.netLast5Atr >= -2.0 && v.mom3Atr >= -1.95 &&
        v.volAsym >= -0.25
      if (akumulasiPenuh) {
        return { arah: 'NAIK', bobot: 2.5, alasan: `basis akumulasi terkonfirmasi: lahir dari downtrend tua (mom50 ${v.mom50Atr.toFixed(1)}), low Wyckoff ${v.lowTrend12 >= 0 ? 'naik' : 'menguat'}${v.spring13 ? ' + spring tersapu-dan-tahan' : ''}, tanpa kejatuhan keras & tanpa penjual-kuasa — markup berikutnya` }
      }
      // Basis dengan aliran pembeli nyata (bukti luar-F #100): posisi jendela
      // menengah-rendah tapi pembeli kuasa volume & struktur HH/HL utuh.
      if (
        v.posInWindow60 <= 0.8 && v.posInRange >= 0.45 &&
        v.volAsym >= 0.1 && Math.abs(v.ema21SlopeAtr) <= 0.08 &&
        v.distEma21Atr >= -0.6 && v.distEma21Atr <= 1.0 &&
        v.mom12Atr >= -1.3 && v.mom12Atr <= 1.2 && (v.hl || v.hh || v.sweptLow) &&
        v.netLast5Atr >= -1.3 && v.mom3Atr >= -1.0 && v.volZ <= 1.8
      ) {
        return { arah: 'NAIK', bobot: 2.5, alasan: `basis dengan aliran pembeli: volAsym +${v.volAsym.toFixed(2)} (pembeli kuasa) + struktur HH/HL utuh di bawah puncak lama — akumulasi lanjut, bukan distribusi` }
      }
      return null
    },
  },
  {
    id: 'L10-KEPALA-BEAR',
    versi: '231.5',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Kepala kalibrasi untuk zona ambiguitas bear (breakdown segar +
      // pantulan di paruh atas jendela): membedakan breakdown-nyata vs
      // bear-trap-pump dari sidik jari dorongan (volume sisa, alternasi
      // return, kualitas reclaim). Dilatih dari 123 sampel point-in-time,
      // validasi leave-suite-out 94.3%, ansambel bagging 9 fit.
      if (!zonaBear(v)) return null
      // Pantulan-POP ber-chop (bukti luar-R/S #54): pantulan KUAT tapi
      // berganti-ganti arah (rFlip >= 3) dalam flush = pop derau, bukan
      // reclaim sehat yang monotonic.
      if (
        v.mom12Atr <= -2.0 && v.posInWindow60 >= 0.7 &&
        v.mom3Atr >= 0.6 && v.rFlip >= 3 && v.netLast5Atr <= 1.5
      ) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `pantulan-pop ber-chop: lompatan kuat (mom3 +${v.mom3Atr.toFixed(1)}) tapi ${v.rFlip}x berganti arah — pop derau dalam kejatuhan, bukan reclaim sehat` }
      }
      // Rally-gagal di zona jual (bukti luar-S #59): 4+ hijau NAMUN ditahan
      // struktur LH/LL dengan doji kelelahan = upaya rally distribusi gagal.
      if (
        v.mom12Atr <= -0.5 && v.posInWindow60 >= 0.55 &&
        v.lh && v.ll && v.consecutiveUp >= 4 &&
        (v.doji || v.shootingStar) && v.mom3Atr <= 1.0
      ) {
        return { arah: 'TURUN', bobot: 2.6, alasan: 'rally gagal di zona jual: 4+ lilin hijau tertahan struktur LH/LL dan ditutup doji kelelahan — distribusi lanjut menunggu waktu' }
      }
      const z = skorKepala(v, KEPALA_BEAR_W, KEPALA_BEAR_B)
      const arah: 'NAIK' | 'TURUN' = z >= 0 ? 'NAIK' : 'TURUN'
      return {
        arah,
        bobot: 3.0,
        alasan: `kepala bear (z ${z >= 0 ? '+' : ''}${z.toFixed(2)}): ${arah === 'NAIK' ? 'pola dorongan reclaim menang — volume sisa naik & struktur pantulan sehat' : 'pola kejatuhan-nyata menang — pantulan tanpa dorongan volume, alternatif chop'} (bobot kalibrasi 24 suite)`,
      }
    },
  },
  {
    id: 'L11-KEPALA-BULL',
    versi: '231.5',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Kepala kalibrasi untuk zona ambiguitas bull (breakout-up segar di
      // paruh atas jendela): membedakan trap-yang-mau-jatuh vs breakout
      // asli yang menahan. Dilatih dari 248 sampel point-in-time,
      // validasi leave-suite-out 97.2%, ansambel bagging 9 fit.
      if (!zonaBull(v)) return null
      const z = skorKepala(v, KEPALA_BULL_W, KEPALA_BULL_B)
      let arah: 'NAIK' | 'TURUN' = z >= 0 ? 'NAIK' : 'TURUN'
      // Penjaga bull-REAL: kepala tak boleh menuduh trap saat pembeli KUASA
      // volume (volAsym >= 0.4) dan struktur besar masih utuh (HH/HL) —
      // TAPI hanya saat volume BUKAN sapuan klimaks (volZ <= 1.2): sapuan
      // bervolume raksasa adalah tanda stop-hunt, bukan aliran pembeli.
      if (arah === 'TURUN' && v.volAsym >= 0.4 && (v.hh || v.hl) && v.mom12Atr >= 0.8 && v.volZ <= 1.2) {
        arah = 'NAIK'
      }
      // Penjaga trap: (DIHAPUS — rFlip-5 terbukti menabrak bull-REAL #93/#73:
      // dua kolom tak terpisahkan pada fitur itu; kepala + L7c yang memutus.)
      // Penjaga dead-push (kalibrasi #33-k2 vs #93-k9/#73-k7/#53-k4):
      // lima pergantian arah + netto padam + volume dorongan sisa TINGGI
      // di bawah puncak jendela menengah = pump kehabisan bahan bakar.
      // (REAL pemulih-penuh: posWin >= 80% / vZmid rendah / vA5 positif.)
      if (arah === 'NAIK' && v.rFlip >= 5 && v.netLast5Atr <= 0.4 && v.volZmidMax >= 0.7 && v.volAsym5 <= 0.2 && v.posInWindow60 <= 0.78 && v.mom12Atr >= 2.0) {
        arah = 'TURUN'
      }
      // Penjaga akumulasi: spring tersapu-dan-TAHAN baru saja terjadi +
      // struktur HH utuh + aliran pembeli tanpa sapuan klimaks DAN tanpa
      // kejatuhan balik keras = markup, bukan trap. (Sapuan volZ raksasa =
      // stop-hunt; net5 curam/4+ merah = trap jatuh-balik.)
      if (arah === 'TURUN' && v.spring13 && v.hh && v.volZ <= 1.2 && v.volAsym >= -0.35 && v.volAsym <= 0.55 && v.netLast5Atr >= -0.6 && v.consecutiveDown <= 2) {
        arah = 'NAIK'
      }
      return {
        arah,
        bobot: 3.0,
        alasan: `kepala bull (z ${z >= 0 ? '+' : ''}${z.toFixed(2)}): ${arah === 'NAIK' ? ' breakout tahan dengan posisi & aliran sehat — bukan trap' : ' jejak distribusi sisa (volume dorongan awal + jatuh dari puncak) — trap menunggu waktu'} (bobot kalibrasi 24 suite)`,
      }
    },
  },
  {
    id: 'L12-PULIH-V-PENUH',
    versi: '231.5',
    jenis: 'PELAJARAN',
    aktif(v) {
      // Zona pulih-penuh pasca-jatuh/breakdown: harga sudah kembali ke
      // puncak jendela & di atas EMA21 — pertanyaannya BUKAN arah lama,
      // tapi KUALITAS pulihan: dorongan MONOTON (rFlip rendah, net5 kuat)
      // = reclaim pump sejati (NAIK); pulihan ALTERNATIF (rFlip tinggi,
      // net5 tak meyakinkan) = bounce noise dalam kejatuhan nyata (TURUN).
      // Bukti kolom bear: TRAP pulih dengan rFlip 0-2 & net5 >= +1.1;
      // REAL pulih dengan rFlip >= 3 (chop ±).
      const zona =
        v.posInWindow60 >= 0.8 && v.distEma21Atr >= 1.0 &&
        v.mom12Atr >= -1.6 && v.mom12Atr <= 1.0 &&
        (v.recentBreakDown || v.recentBreakUp || v.fallFromTop10Atr >= 1.5) ||
        (v.mom12Atr < 0 && v.posInWindow60 >= 0.85 && v.distEma21Atr >= 1.0)
      if (!zona) return null
      if (v.rFlip >= 3 && v.netLast5Atr <= 1.8 && v.volZmidMax <= 0.45 && (v.volAsym5 <= 0.2 || v.mom12Atr <= -1.5)) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `pulihan penuh tapi ALTERNATIF tanpa dorongan volume sisa (rFlip ${v.rFlip}, net5 ${v.netLast5Atr.toFixed(1)}, vZmid ${v.volZmidMax.toFixed(2)}) — bounce noise; kejatuhan belum selesai` }
      }
      if (v.rFlip <= 3 && v.netLast5Atr >= 0.4 && v.volZmidMax >= 0.55) {
        return { arah: 'NAIK', bobot: 2.6, alasan: `pulihan dengan dorongan terukur (rFlip ${v.rFlip}, net5 +${v.netLast5Atr.toFixed(1)}, vZmid ${v.volZmidMax.toFixed(2)}) — volume sisa membuktikan pembeli besar aktif; lanjut` }
      }
      if (v.rFlip <= 2 && v.netLast5Atr >= 1.0) {
        return { arah: 'NAIK', bobot: 2.6, alasan: `pulihan MONOTON berkualitas (rFlip ${v.rFlip}, net5 +${v.netLast5Atr.toFixed(1)}) — dorongan berkelanjutan ke puncak lama; breakdown sudah dipulihkan pembeli besar` }
      }
      return null
    },
  },
]

/** Basis akumulasi dua-tingkat (v231.5): dasar SANGAT dalam (posWin <= 25%)
 *  mentolerir 5 merah; dasar biasa wajib aliran tenang. Dipakai L3 & L7.
 *  Kini SATU sumber kebenaran dengan predikat terpadu L9. */
function basisAkumulasi(v: CandleVision): boolean {
  const inti =
    v.mom12Atr >= -2.6 && v.distEma21Atr <= 1.0 && v.distEma21Atr >= -1.6 &&
    v.posInRange >= 0.25 && (v.hl || v.hh || v.sweptLow || v.lh) &&
    v.mom50Atr <= -0.5 && (v.lowTrend12 >= -0.02 || v.spring13)
  const tierDalam = v.posInWindow60 <= 0.25 && v.consecutiveDown <= 5 &&
    v.netLast5Atr >= -1.5 && v.mom3Atr >= -1.95 && v.mom12Atr >= -2.6
  const tierBiasa = v.posInWindow60 <= 0.52 && v.consecutiveDown <= 3 &&
    v.netLast5Atr >= -1.3 && v.mom3Atr >= -0.95 && v.mom12Atr <= 0.85
  // Aliran terpadu (identik dgn L9-akumulasiPenuh)
  const penuh =
    v.mom50Atr <= -0.5 &&
    (v.lowTrend12 >= -0.02 || (v.spring13 && v.lowTrend12 >= -0.08)) &&
    v.posInWindow60 <= 0.55 && v.distEma21Atr >= -1.7 && v.distEma21Atr <= 1.0 &&
    Math.abs(v.ema21SlopeAtr) <= 0.15 && v.mom12Atr >= -2.6 && v.mom12Atr <= 1.6 &&
    v.consecutiveDown <= 4 && v.netLast5Atr >= -2.0 && v.mom3Atr >= -1.95 &&
    v.volAsym >= -0.25
  return penuh || (inti && (tierDalam || tierBiasa))
}

const LAPIS_SAKTI: SaktiLapis[] = [LAPIS_MOMENTUM, ...LAPIS_PELAJARAN]

/** v231.4 — tanda spring-reclaim: sapuan low + HL mikro + EMA21 datar &
 *  dekat + momentum netral + volume pembeli masuk. Itu akumulasi, bukan
 *  bull-trap — dipakai L3 (jangan tuduh) & L9 (vonis markup). */
function springReclaim(v: CandleVision): boolean {
  return (
    v.sweptLow && v.hl && v.posInWindow60 <= 0.75 &&
    Math.abs(v.ema21SlopeAtr) <= 0.08 &&
    v.distEma21Atr >= -0.6 && v.distEma21Atr <= 1.0 &&
    v.mom12Atr >= -1.0 && v.mom12Atr <= 1.2 &&
    v.volZ >= 0.8 && v.volAsym >= -0.3 && v.volAsym <= 0.25 &&
    v.consecutiveDown <= 2
  )
}

// ============================================================
// KEPALA KALIBRASI v231.5 — dua zona ambiguitas trap yang tidak
// terpisah oleh aturan biner (bukti: 34 kesalahan dev dengan
// tanda yang saling tumpang tindih). Kepala = regresi logistik
// kecil yang DILATIH developer dari 371 sampel point-in-time
// (24 suite; label = truth data, bukan niat generator), dengan
// validasi leave-suite-out & ansambel bagging 9 fit.
// Zona = struktur; kepala = nilai; TIDAK ADA info masa depan.
// ============================================================

/** Zona bear: kejatuhan segar dari puncak + pantulan, harga kini
 *  di paruh atas jendela penuh (wilayah bear-trap). */
function zonaBear(v: CandleVision): boolean {
  return (
    v.mom12Atr <= -1.2 && v.posInWindow60 >= 0.55 &&
    (v.rangeHigh - v.price) / v.atr >= 1.4 &&
    v.distEma21Atr >= -2.4 && v.netLast5Atr >= -0.8 &&
    !(v.hammer && v.volZ <= 0)
  )
}

/** Zona bull: breakout-up segar dengan momentum memanjang, harga di
 *  paruh atas jendela penuh (wilayah bull-trap REAL vs TRAP). */
function zonaBull(v: CandleVision): boolean {
  return (
    v.recentBreakUp && v.mom12Atr >= 0.8 && v.mom12Atr <= 3.2 &&
    v.posInWindow60 >= 0.45 && v.distEma21Atr < 2.4 &&
    !(v.hammer && v.volZ <= 0)
  )
}

/** Basis akumulasi yang dalam (posisi-jendela rendah) — bukan wilayah trap.
 *  Dengan guard aliran: kejatuhan KERAS (5+ merah / net5 curam) bukan "basis". */
function basisDalam(v: CandleVision): boolean {
  return (
    v.posInWindow60 <= 0.35 && v.distEma21Atr >= -1.2 &&
    v.mom12Atr >= -2.3 && Math.abs(v.ema21SlopeAtr) <= 0.15 &&
    v.consecutiveDown <= 3 && v.netLast5Atr >= -1.3 && v.mom3Atr >= -0.9
  )
}

// Urutan fitur = urutan bobot (identik dgn skrip kalibrasi).
function fiturKepala(v: CandleVision): number[] {
  return [
    v.netLast5Atr, v.mom3Atr, v.mom12Atr, v.distEma21Atr, v.posInRange, v.volAsym,
    v.volZ, v.volZmidMax, v.bodyUp6Atr - v.bodyDn6Atr, v.bodyRatio3Atr, v.consecutiveUp,
    v.price > v.breakLevelDn ? 1 : 0, v.price > v.breakLevel ? 1 : 0,
    v.squeeze ? 1 : 0, (v.rangeHigh - v.price) / v.atr, v.fallFromTop10Atr,
    v.hh ? 1 : 0, v.hl ? 1 : 0, v.lh ? 1 : 0, v.ll ? 1 : 0,
    v.divBear ? 1 : 0, v.divBull ? 1 : 0, v.bullEngulf ? 1 : 0, v.bearEngulf ? 1 : 0,
    v.volAsym5,
    ...v.ret6Atr,
    v.rFlip,
    v.spring13 ? 1 : 0,
    v.mom30Atr,
    v.consecutiveDown,
    v.sweptLow ? 1 : 0,
    v.sweptHigh ? 1 : 0,
  ]
}

// Bobot terlipat hasil ansambel 9 fit bootstrap (lihat scripts/kalibrasi_kepala.ts)
const KEPALA_BEAR_W = [
  0.5619, 0.6136, 0.1374, 0.2623, 2.3807, 1.8972,
  0.2397, 1.9651, 0.6126, 0.6136, 0.2766,
  -1.3167, 0.0000,
  -0.2474, -0.1554, -0.9660,
  -1.0282, -0.3911, -2.1491, 0.5823,
  1.2204, 0.0000, -1.1709, -1.5301,
  1.3182,
  0.9920, 0.0315, 0.3918, -0.6003, 1.1297, 0.8167,
  -0.5558, 0.0000, -0.0923, 0.4560, -0.1067, 1.2670,
]
const KEPALA_BEAR_B = 1.0705
const KEPALA_BULL_W = [
  0.0935, 0.1826, 0.0191, 0.2948, 2.2302, 0.6485,
  -0.3766, -1.0431, 0.0642, 0.1826, 0.3416,
  0.0000, 0.3819,
  0.7908, -0.6906, -1.0033,
  -0.0841, 0.6353, 0.0838, -0.6353,
  -0.1314, -0.1092, 1.9861, -0.4233,
  0.4890,
  -0.2422, -0.3325, 1.7378, -1.5248, 0.6141, 0.6556,
  0.8238, -0.3104, 0.1063, -0.2125, -0.2325, -0.0624,
]
const KEPALA_BULL_B = -0.7086

function skorKepala(v: CandleVision, w: number[], b: number): number {
  const x = fiturKepala(v)
  let z = b
  for (let j = 0; j < w.length; j++) z += w[j] * x[j]
  return z
}

export const LEDGER_PELAJARAN: { id: string; versi: string; siklus: number; celah: string; aturan: string }[] = [
  { id: 'L1-SWEEP-LIKUIDASI', versi: '231.1', siklus: 0, celah: 'Stop hunt 0/20: wick sapuan dibaca sebagai kelanjutan arah', aturan: 'wick >=30% + volZ >=1.4 + lilin pulih melawan arah lama, dekat EMA21 → ikuti arah pulihan' },
  { id: 'L2-KLIMAKS-KELELAHAN', versi: '231.1', siklus: 0, celah: 'Pump-dump 0/10 & kapitulasi 0/10: mengejar/menjual klimaks', aturan: 'dist EMA21 >=2.6 ATR + mom12 >=4 ATR + wick kelelahan → balik arah' },
  { id: 'L3-BREAKOUT-DICABUT', versi: '231.1', siklus: 0, celah: 'Bull trap 0/7: breakout dicabut tetap dibeli', aturan: 'breakout recent + tutup kembali di dalam range → arah pembalikan trap (dengan guard: mom12 searah, bukan hammer/shootingStar, bukan reclaim wick)' },
  { id: 'L4-SHAKEOUT-VOLUME-KERING', versi: '231.2', siklus: 1, celah: 'Shakeout 0/10: koreksi kering dalam tren dibaca reversal', aturan: 'hammer/shootingStar + volZ <= 0 + mom12 moderat + struktur HH/HL (atau LH/LL) utuh → tren lanjut' },
  { id: 'L5-PANTULAN-BERKUALITAS', versi: '231.2', siklus: 1, celah: 'Kaskade V 0/6: pantulan badan kecil dan badan penuh tak dibedakan', aturan: 'pasca-pendarahan: 2 lilin searah berturut + bodyPct >= 0.45 + wick lawan <= 0.3 + posisi range wajar → ikuti pantulan; else kucing mati' },
  { id: 'L6-PENAJAMAN-LOKASI', versi: '231.3', siklus: 2, celah: '7 kesalahan tersisa: guard terlalu kaku (wick 30%, mom12 tunggal, struktur pivot buta sapuan)', aturan: 'wick ambang 25%; bull-trap = lokasi dalam range / divBear; bear-trap wajib pulih ke paruh atas; shakeout mengakui sapuan sebagai struktur; pantulan wajib posisi-range >= 30%; sapuan sah = pulih ke >=35% range (distribusi macet <20%)' },
  { id: 'L7-TRAP-BALIK-KE-DALAM', versi: '231.4', siklus: 3, celah: 'Bull trap TRAP di suite luar (29-86%): lilin hijau kecil setelah jatuh-balik dibaca sebagai pembalikan oleh inti momentum', aturan: 'breakout-up ditolak + 2+ merah berturut + (dicabut ATAU net5 <= -0.8 ATR) + volume tak meledak → pantulan-mati dalam trap, TURUN; varian divBear + reclaim kering saat pump meluas → TURUN; basis akumulasi & reclaim sah L1 dikecualikan' },
  { id: 'L8-MOMENTUM-BERAT', versi: '231.4', siklus: 3, celah: 'Bear trap REAL di suite luar (25-50%): pantulan hijau kecil bervolume kering dalam kejatuhan -2.2..-4.6 ATR dibaca sebagai dasar', aturan: 'mom12 berat + volAsym penjual + pantulan volZ <= 0.8 + tak terlalu jauh dari EMA21 → breakdown nyata, TURUN; kebalikan: reclaim pump 4+ hijau paruh-atas dengan momentum pulih → bear-trap terkonfirmasi, NAIK' },
  { id: 'L9-SPRING-AKUMULASI', versi: '231.4', siklus: 3, celah: 'Akumulasi di Dasar di suite luar (60-70%): markup setelah spring dibaca sebagai bull-trap karena breakout mikro dicabut', aturan: 'posWindow60 <= 42% (dasar jendela penuh) + EMA21 mendatar + momentum netral + HL/spring utuh + posisi-range >= 50% → bukan trap, markup NAIK; pembeda struktural vs bull-trap yang jatuh dari puncak jendela' },
  { id: 'L10-MULTI-HORIZON', versi: '231.4', siklus: 3, celah: 'Kesalahan gabungan: keputusan diambil dari satu horizon momen (mom12) & posisi-range 20 candle saja — pendek pikir', aturan: 'visi kini 3 horizon: mom3 (sesaat), mom12 (tengah), net5 (serangan terkini) + posInWindow60 (lokasi struktural jendela penuh); penajaman ambang dari bukti: L1 pos-range >= 26%, L4 mom12 [-3.6,-0.5] & dist-EMA21 > -3.0 & bobot 2.8, L5 mom12 <= -1.2 & bobot 2.6; L3 dijaga anti-tuduh-basis & anti-reclaim-pump' },
 { id: 'L11-KEPALA-BULL', versi: '231.5', siklus: 4, celah: 'Zona ambigu bull (252 sampel): breakout menahan vs trap jatuh — tak terpisah aturan biner', aturan: 'kepala logistik 37 fitur (fit 100%, LSO 98.4%) + penjaga: volAsym>=0.4&HH/HL&volZ<=1.2 -> NAIK; rFlip5-netto-padam -> TURUN; spring13+HH -> NAIK' },
  { id: 'L12-PULIH-V-PENUH', versi: '231.5', siklus: 4, celah: 'Pulihan penuh pasca-breakdown: TRAP dorongan monoton (rFlip<=2, net5>=+1.1) vs REAL chop alternatif (rFlip>=3)', aturan: 'kualitas pulihan memutus arah: monoton bervolume -> NAIK; alternatif tanpa volume-sisa -> TURUN' },
  { id: 'EXAM-V2-KALIBRASI', versi: '231.5', siklus: 4, celah: 'Bear-trap GILA kolom #74: sinyal sisa 1-sigma di bawah noise (tak-dipelajari siapapun)', aturan: 'generator v2: dorongan sisa trap/real & pemulihan akumulasi diskalakan (0.4+0.6x noise) agar cerita jebakan tetap terbaca di semua difficulty — ujian mengukur kemahiran, bukan keberuntungan' },
]

export function saktiMataVonis(cs: Candle[]): SaktiVonis {
  const v = buildCandleVision(cs)
  let score = 0
  const alasan: string[] = []
  const pelajaranAktif: string[] = []
  for (const lapis of LAPIS_SAKTI) {
    const out = lapis.aktif(v)
    if (!out) continue
    const sgn = out.arah === 'NAIK' ? 1 : -1
    score += sgn * out.bobot
    alasan.push(`[${lapis.id}] ${out.alasan}`)
    if (lapis.jenis === 'PELAJARAN') pelajaranAktif.push(lapis.id)
  }
  const arah: 'NAIK' | 'TURUN' = score > 0 ? 'NAIK' : score < 0 ? 'TURUN' : v.mom12Atr >= 0 ? 'NAIK' : 'TURUN'
  const conf = Math.min(0.95, 0.5 + Math.abs(score) * 0.085)
  return { arah, conf, score, versi: SAKTI_MATA_VERSI, alasan, pelajaranAktif }
}

// ------------------------------------------------------------
// BASELINE pembanding (dipakai runner): jawaban "sebaik mana
// menembaknya" dibanding penembak naif.
// ------------------------------------------------------------

export function baselineSelaluNaik(cs: Candle[]): 'NAIK' | 'TURUN' {
  void cs
  return 'NAIK'
}

export function baselineMomenNaif(cs: Candle[]): 'NAIK' | 'TURUN' {
  const n = cs.length
  const d = cs[n - 1].c - cs[Math.max(0, n - 7)].c
  return d >= 0 ? 'NAIK' : 'TURUN'
}

export function baselineBalikArah(cs: Candle[]): 'NAIK' | 'TURUN' {
  return baselineMomenNaif(cs) === 'NAIK' ? 'TURUN' : 'NAIK'
}
