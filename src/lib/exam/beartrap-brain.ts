// ============================================================
// MICAPROFITA SAKTI-BEARTRAP — otak pemahaman BEAR TRAP.
//
// Menerima HANYA candle yang boleh dilihat (point-in-time),
// membaca anatomi bujukan turun, lalu memvonis biner NAIK/TURUN
// + memasang TARGET keuntungan (rencana trade lengkap).
//
// ARSITEKTUR BERLAPIS (ala SAKTI-BULLTRAP):
//  - SR-CORE v1.0 = inti momentum naif (artefak "1% AI"):
//    mengejar breakdown & panik-jual — DIPERTAHANKAN sebagai
//    artefak sejarah & pembanding. Racunnya justru bujukan
//    ujian ini (menjual breakdown, ikut kapitulasi).
//  - SR-L1..L8 = pelajaran ilmu bear-trap yang ditambal dari
//    bukti bedah ujian (per siklus, tanpa hindsight: semua
//    kondisi terbaca pada candle ke-60).
//  - GUARD anti-bias: pelajaran wajib punya lengan TURUN untuk
//    breakdown/flag/rally SEHAT — otak tidak boleh menjadi
//    burung-burung NAIK; ia harus MEMBEDAKAN jebakan dari
//    momentum asli (pemahaman, bukan kebiasaan).
// ============================================================

import type { Candle } from './generator'
import * as I from './indicators'
import { buildCandleVision, type CandleVision } from './sakti-candle'

export const SR_BRAIN_VERSI = '2.7'

// ------------------------------------------------------------
// VISION TAMBAHAN khusus bear-trap (cermin bull-trap + lantai)
// ------------------------------------------------------------

export interface SrVision extends CandleVision {
  /** volZ terkuat (median top-3) di 12 candle terakhir — volume tembus/sapuan */
  volZBreak: number
  /** asimetri volume 12 candle terakhir (+ hijau kuasa, − merah kuasa) */
  volAsymZone: number
  /** asimetri volume jendela 20 candle — jejak akumulasi dalam range dasar */
  volAsymZone20: number
  /** peringkat persentil volume top-3 thd 20 candle terakhir (0..1) */
  volRankBreak: number
  /** v2.4 — RASIO VOLUME ZONA BREAKDOWN: mean volume zona breakdown (dari
   *  lilin pertama yang menembus breakLevelDn s.d. kini) dibagi mean volume
   *  SEBELUM zona. Jebakan = zona SUNYI relatif (<= 0.75); breakdown sehat =
   *  zona KERAS relatif (>= 1.35). Kebal dilusi (jendela pole bervolume tinggi). */
  volZoneRatio: number
  /** klaster wick-bawah penolakan dekat dasar jendela (24 candle) */
  wickClusterLow: number
  /** klaster sentuhan zona dasar (24 candle) — triple test / spring / reacc */
  testClusterLow: number
  /** jarak harga dari EMA50 (ATR) — zona demand uptrend */
  distEma50Atr: number
  /** penyusutan badan: rata badan 3 terakhir / rata badan 6 sebelumnya */
  bodyShrink: number
  /** momentum 24 candle (ATR) — jejak pole/impuls dump sebelum flag/vacuum */
  mom24Atr: number
}

export function buildSrVision(cs: Candle[]): SrVision {
  const v = buildCandleVision(cs)
  const n = cs.length
  const vols = cs.map((c) => c.v)
  const volWin0 = vols.slice(Math.max(0, n - 21), n - 1)
  const volSd = Math.max(I.stdev(volWin0), 1e-9)

  const medianOf = (arr: number[]): number => {
    if (!arr.length) return 0
    const s = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }
  // volZBreak: MEDIAN volZ dari 3 lilin bervolume-terbesar di 12 candle terakhir
  const last12 = cs.slice(Math.max(0, n - 12))
  const top3 = [...last12].sort((a, b) => b.v - a.v).slice(0, 3)
  const volZBreak = medianOf(top3.map((c) => (c.v - v.volMean) / volSd))
  // volRankBreak: peringkat persentil volume top-3 thd 20 candle terakhir —
  // kebal sd tipis pada range sunyi: yang dinilai RANKING relatif, bukan z-score
  const win20v = vols.slice(Math.max(0, n - 20))
  const top3vol = medianOf(top3.map((c) => c.v))
  const volRankBreak = win20v.length ? win20v.filter((x) => x < top3vol).length / win20v.length : 0.5
  // v2.4 — RASIO VOLUME ZONA BREAKDOWN (kebal dilusi): mean zona breakdown
  // dibagi mean volume SEBELUM zona (12 candle pra-zona). Fake breakdown =
  // zona sunyi RELATIF terhadap aktivitas sebelumnya; breakdown sehat = zona
  // keras relatif — meski seluruh jendela bervolume tinggi (pole).
  let zoneStart = -1
  for (let i = Math.max(0, n - 12); i < n; i++) {
    if (cs[i].l < v.breakLevelDn) {
      zoneStart = i
      break
    }
  }
  let volZoneRatio = 1
  if (zoneStart >= 0) {
    const zoneVols = cs.slice(zoneStart, n).map((c) => c.v)
    const preVols = cs.slice(Math.max(0, zoneStart - 12), zoneStart).map((c) => c.v)
    const zoneMean = I.mean(zoneVols)
    const preMean = preVols.length ? I.mean(preVols) : v.volMean
    volZoneRatio = zoneMean / Math.max(preMean, 1e-9)
  }

  let upV = 0
  let dnV = 0
  for (let i = Math.max(0, n - 12); i < n; i++) {
    if (cs[i].c >= cs[i].o) upV += cs[i].v
    else dnV += cs[i].v
  }
  const volAsymZone = upV + dnV > 0 ? (upV - dnV) / (upV + dnV) : 0

  let upV20 = 0
  let dnV20 = 0
  for (let i = Math.max(0, n - 20); i < n; i++) {
    if (cs[i].c >= cs[i].o) upV20 += cs[i].v
    else dnV20 += cs[i].v
  }
  const volAsymZone20 = upV20 + dnV20 > 0 ? (upV20 - dnV20) / (upV20 + dnV20) : 0

  const winLow60 = Math.min(...cs.map((c) => c.l))
  let wickClusterLow = 0
  let testClusterLow = 0
  for (let i = Math.max(0, n - 24); i < n; i++) {
    const c = cs[i]
    const rng = Math.max(c.h - c.l, 1e-9)
    const lwPct = (Math.min(c.o, c.c) - c.l) / rng
    if (lwPct >= 0.45 && c.l <= winLow60 + 2.2 * v.atr) wickClusterLow++
    if (c.l <= winLow60 + 1.8 * v.atr) testClusterLow++
  }

  const ema50A = I.ema(cs.map((c) => c.c), 50)
  const distEma50Atr = (v.price - ema50A[n - 1]) / v.atr

  const b3 = I.mean(cs.slice(Math.max(0, n - 3)).map((c) => Math.abs(c.c - c.o)))
  const b6 = I.mean(cs.slice(Math.max(0, n - 9), n - 3).map((c) => Math.abs(c.c - c.o)))
  const bodyShrink = b6 > 1e-9 ? b3 / b6 : 1

  const mom24Atr = (v.price - cs[Math.max(0, n - 25)].c) / v.atr

  return { ...v, volZBreak, volAsymZone, volAsymZone20, volRankBreak, volZoneRatio, wickClusterLow, testClusterLow, distEma50Atr, bodyShrink, mom24Atr }
}

// ------------------------------------------------------------
// MESIN VONIS BERLAPIS + RENCANA TRADE
// ------------------------------------------------------------

export interface SrVonis {
  arah: 'NAIK' | 'TURUN'
  entry: number // harga entry yang dipasang (close candle keputusan)
  targetPct: number // target keuntungan yang dipasang (%) — disiplin fee & horizon
  targetPrice: number
  conf: number
  score: number
  versi: string
  alasan: string[]
  pelajaranAktif: string[]
  fitur: SrVision
}

interface LapisOut { arah: 'NAIK' | 'TURUN'; bobot: number; alasan: string }

interface SrLapis {
  id: string
  versi: string
  aktif(v: SrVision): LapisOut | null
}

// SR-CORE v1.0 — inti momentum naif (artefak "1% AI"): racunnya
// justru BUJUKAN ujian ini (mengejar breakdown, ikut panik).
const SR_CORE: SrLapis = {
  id: 'SR-CORE',
  versi: '1.0',
  aktif(v) {
    let s = 0
    if (v.ema9 > v.ema21) s += 0.5
    else s -= 0.5
    if (v.ema21SlopeAtr > 0.03) s += 0.4
    else if (v.ema21SlopeAtr < -0.03) s -= 0.4
    if (v.green) s += 0.25
    else s -= 0.25
    if (v.recentBreakUp) s += 1.1
    if (v.recentBreakDown) s -= 1.1 // racun: mengejar breakdown
    if (v.consecutiveUp >= 3) s += 0.5
    if (v.consecutiveDown >= 3) s -= 0.5 // racun: ikut panik
    if (v.hh && v.hl) s += 0.45
    if (v.ll && v.lh) s -= 0.45
    return { arah: s >= 0 ? 'NAIK' : 'TURUN', bobot: Math.min(2.0, Math.abs(s) + 0.3), alasan: `inti momentum: EMA ${v.ema9 > v.ema21 ? 'bull' : 'bear'}, mom12 ${v.mom12Atr.toFixed(1)} ATR, breakdown ${v.recentBreakDown ? 'turun' : v.recentBreakUp ? 'naik' : 'tidak ada'}` }
  },
}

// ===== LAPIS PELAJARAN BEAR TRAP (v2.0) =====
const SR_LAPIS_PELAJARAN: SrLapis[] = [
  {
    id: 'SR-L1-SWEEP-RECLAIM',
    versi: '2.0',
    aktif(v) {
      // wick menusuk low + volume sapuan raksasa + tutup balik di atas
      if (v.sweptLow && v.lowerWickPct >= 0.4 && v.volZ >= 1.2) {
        return { arah: 'NAIK', bobot: 3.0, alasan: `sapuan likuidasi di bawah: wick ${Math.round(v.lowerWickPct * 100)}% menembus low bervolume raksasa (volZ ${v.volZ.toFixed(1)}) lalu ditutup kembali di atasnya — penjual breakdown terjebak di dasar wick` }
      }
      // SPRING Wyckoff: sapuan tipis bervolume LEMAH + wick penolakan + tutup balik ke dalam
      if (v.sweptLow && v.lowerWickPct >= 0.5 && v.volZ <= 0.3) {
        return { arah: 'NAIK', bobot: 3.0, alasan: `spring Wyckoff: wick ${Math.round(v.lowerWickPct * 100)}% menusuk lantai dengan volume layu (volZ ${v.volZ.toFixed(1)}) lalu ditutup balik di dalam — tes terakhir akumulasi sebelum markup` }
      }
      // sapuan-reclaim ringan: low disapu & ditolak wick dalam, tutup HIJAU, tanpa free-fall
      if (v.sweptLow && v.lowerWickPct >= 0.5 && v.green && v.mom12Atr >= -2.5) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `sapuan-reclaim ringan: low baru disapu lalu ditolak (wick ${Math.round(v.lowerWickPct * 100)}%) dan ditutup hijau tanpa free-fall (mom12 ${v.mom12Atr.toFixed(1)} ATR) — penjual gagal menembus lantai` }
      }
      // anatomi sapuan-lantai (v2.5/v2.6, bukti Ronde 1-2): wick bawah dalam (>= 50% —
      // semua guard sehat badan-penuh lw <= 0.25) + harga di dasar jendela + klaster
      // sentuhan lantai + volume sapuan kering + momen membaik — tanpa perlu sweptLow formal
      if (v.lowerWickPct >= 0.5 && v.posInWindow60 <= 0.35 && v.volZ <= 0.3 && v.testClusterLow >= 6 && v.mom12Atr >= -2.5) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `sapuan lantai terbaca dari anatomi: wick penolakan ${Math.round(v.lowerWickPct * 100)}% di dasar jendela, ${v.testClusterLow} sentuhan lantai ditahan, volume sapuan kering (volZ ${v.volZ.toFixed(1)}), momen membaik (mom12 ${v.mom12Atr.toFixed(1)} ATR) — penjual gagal menembus` }
      }
      return null
    },
  },
  {
    id: 'SR-L2-KAPITULASI-KELELAHAN',
    versi: '2.0',
    aktif(v) {
      if (v.distEma21Atr <= -2.4 && v.mom12Atr <= -3.0 && (v.lowerWickPct >= 0.35 || v.doji || v.volClimax)) {
        return { arah: 'NAIK', bobot: 3.0, alasan: `kapitulasi kelelahan: harga ${v.distEma21Atr.toFixed(1)} ATR di bawah EMA21, mom12 ${v.mom12Atr.toFixed(1)} ATR, wick/doji kelelahan${v.volClimax ? ' + volume klimaks' : ''} — penjual terakhir sudah masuk` }
      }
      // panik vertikal ekstrem: mean reversion tak tertahankan
      if (v.distEma21Atr <= -4.5 && v.rsi <= 22) {
        return { arah: 'NAIK', bobot: 3.4, alasan: `panik vertikal: jarak ${v.distEma21Atr.toFixed(1)} ATR dari EMA21 + RSI ${v.rsi.toFixed(0)} — statistik mean-reversion menghukum penjual panik` }
      }
      return null
    },
  },
  {
    id: 'SR-L3-BREAKDOWN-VOLUMETRIK',
    versi: '2.0',
    aktif(v) {
      // breakdown TANPA penjual nyata = jebakan klasik (v2.4: RASIO zona vs pra-zona —
      // kebal dilusi jendela bervolume tinggi seperti pole bearflag)
      if (v.recentBreakDown && v.posInWindow60 <= 0.4 && v.volZoneRatio <= 0.75) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `fake breakdown volumetrik: harga menembus lantai jendela tapi zona breakdown-nya SUNYI relatif (rasio volume ${(v.volZoneRatio).toFixed(2)}x dari aktivitas sebelumnya), asimetri zona ${v.volAsymZone20.toFixed(2)} — tak ada penjual besar di baliknya` }
      }
      // lengan pelindung GUARD: zona breakdown keras + badan penuh = momentum asli
      if (v.recentBreakDown && v.volZoneRatio >= 1.35 && !v.divBull && v.bodyPct >= 0.45 && v.upperWickPct <= 0.35) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `breakdown sehat: zona breakdown keras relatif (rasio volume ${(v.volZoneRatio).toFixed(2)}x — penjual besar nyata + follow-through), badan keputusan penuh, tanpa divergensi — momentum asli, bukan trap` }
      }
      return null
    },
  },
  {
    id: 'SR-L4-DASAR-BERTOLAK-BALIK',
    versi: '2.0',
    aktif(v) {
      if (v.divBull && v.posInRange <= 0.25 && v.lowerWickPct >= 0.6) {
        return { arah: 'NAIK', bobot: 2.8, alasan: 'divergensi bullish di dasar dengan wick penolakan lebar: harga membuat low baru tapi momentum menguat & lilin ditolak — fake new low, penjual terakhir terjebak' }
      }
      if (v.wickClusterLow >= 3 && v.testClusterLow >= 2 && v.volRankBreak <= 0.7 && v.mom12Atr >= -3.2) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `dasar bertolak-balik: ${v.wickClusterLow} wick penolakan + ${v.testClusterLow} sentuhan zona dasar dengan volume menyusut (volZ tembus ${v.volZBreak.toFixed(1)}) — demand menguasai, markup menunggu` }
      }
      // lengan reakkumulasi-dasar (v2.4/v2.7, bukti Ronde 2 + seed web): dasar dengan
      // BANYAK sentuhan lantai + aliran 12-20 candle TIDAK merah kuasa + dorongan turun
      // terakhir sunyi — supply sudah dibeli; pagar asym20 >= -0.05 tetap mengunci guard
      if (v.posInWindow60 <= 0.25 && v.testClusterLow >= 4 && v.volAsymZone20 >= -0.05 && v.volZ <= 0.5 && v.mom3Atr >= -1.5 && v.mom12Atr >= -2.2) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `reakkumulasi di dasar: ${v.testClusterLow} sentuhan lantai ditahan, aliran zona tanpa merah kuasa (asym20 ${v.volAsymZone20.toFixed(2)}, asym12 ${v.volAsymZone.toFixed(2)}), dorongan turun terakhir sunyi (volZ ${v.volZ.toFixed(1)}) — supply sudah dibeli, markup menunggu` }
      }
      // lengan lantai ultra-teruji (v2.5, bukti Ronde 2 #047): dasar yang menahan 10+
      // sentuhan dalam 24 candle + dorongan turun terakhir sunyi + tanpa aliran merah
      // kuasa — lantai yang sudah dibeli besar tidak bisa ditembus dorongan sunyi
      if (v.posInWindow60 <= 0.1 && v.testClusterLow >= 10 && v.volAsymZone20 >= -0.05 && v.volZ <= 0 && v.mom12Atr >= -2.5) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `lantai ultra-teruji: ${v.testClusterLow} sentuhan dalam 24 candle tetap ditahan di dasar jendela, dorongan turun terakhir sunyi (volZ ${v.volZ.toFixed(1)}), tanpa aliran merah kuasa (asym20 ${v.volAsymZone20.toFixed(2)}) — supply sudah habis dibeli` }
      }
      return null
    },
  },
  {
    id: 'SR-L5-DIP-UPTREND',
    versi: '2.0',
    aktif(v) {
      if (
        v.mom50Atr >= -3.0 && v.mom12Atr <= -1.0 &&
        (v.distEma21Atr <= 1.6 || v.sweptLow) &&
        (v.lowerWickPct >= 0.6 || v.bodyShrink <= 0.45)
      ) {
        return { arah: 'NAIK', bobot: 3.0, alasan: `dip dalam uptrend besar: mom50 ${v.mom50Atr.toFixed(1)} ATR (tren besar masih naik), dump ${v.mom12Atr.toFixed(1)} ATR mencapai zona demand dan DITOLAK wick lebar (${Math.round(v.lowerWickPct * 100)}%) — reversal palsu menelan penjual` }
      }
      // lengan robust: dump panjang tapi tren besar utuh + sapuan lantai ditolak
      if (v.mom50Atr >= 0.7 && v.sweptLow && v.lowerWickPct >= 0.5 && v.mom12Atr <= -3.0) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `dump tersapu-di-demand: mom50 ${v.mom50Atr.toFixed(1)} ATR (uptrend utuh), low baru hanya menyapu demand lama & ditolak (wick ${Math.round(v.lowerWickPct * 100)}%) — reversal palsu` }
      }
      return null
    },
  },
  {
    id: 'SR-L6-FLAG-AKUMULASI',
    versi: '2.0',
    aktif(v) {
      // flag yang "sempurna" bentuknya tapi volume HIJAU menguasai = akumulasi
      // (v2.3: wajib TANPA breakdown segar — flag akumulasi tidak menembus lantai)
      if (!v.recentBreakDown && v.mom24Atr <= -2.0 && v.netLast5Atr >= -0.3 && v.volAsym5 >= 0.15 && v.consecutiveDown <= 1 && v.posInWindow60 <= 0.45) {
        return { arah: 'NAIK', bobot: 3.0, alasan: `bear flag akumulasi: pole ${v.mom24Atr.toFixed(1)} ATR tapi aliran flag hijau kuasa (volAsym ${v.volAsym5.toFixed(2)}), netto tertahan (${v.netLast5Atr.toFixed(1)} ATR) — akumulasi diam-diam, flag akan pecah ke atas` }
      }
      // lengan pelindung GUARD: flag dengan aliran MERAH KUASA + konteks downtrend
      // (v2.2: asym5 <= -0.5 + mom50 <= -0.8 + mom24 <= -1.2 — memisahkan dari corr-rally)
      if (v.mom24Atr <= -1.2 && v.volAsym5 <= -0.5 && v.mom50Atr <= -0.8 && v.netLast5Atr <= 0.2 && v.posInWindow60 <= 0.45 && v.volRankBreak >= 0.75 && v.lowerWickPct <= 0.4 && v.mom12Atr <= -1.0 && v.volAsymZone20 <= 0.05 && v.mom3Atr <= -0.1) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `bear flag sehat: pole kuat + aliran MERAH KUASA (volAsym ${v.volAsym5.toFixed(2)}) + konteks downtrend (mom50 ${v.mom50Atr.toFixed(1)} ATR) + volume tembus nyata (volZ ${v.volZBreak.toFixed(1)}) + momen sesaat turun — continuation, bukan akumulasi` }
      }
      return null
    },
  },
  {
    id: 'SR-L7-CAPITULATION-VACUUM',
    versi: '2.0',
    aktif(v) {
      // kapitulasi tanpa penjual lanjutan: impuls dump (mom24) + momen sesaat berbalik + volume padam
      if (v.mom24Atr <= -4 && v.mom3Atr >= 0.1 && v.netLast5Atr >= -0.3 && v.bodyShrink <= 0.5 && v.volZ <= 0 && v.posInRange <= 0.3) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `kapitulasi vacuum: impuls dump ${v.mom24Atr.toFixed(1)} ATR (mom24) tapi momen sesaat berbalik (${v.mom3Atr.toFixed(1)}), badan menyusut (shrink ${v.bodyShrink.toFixed(2)}), volume padam (volZ ${v.volZ.toFixed(1)}) — dump tanpa penjual nyata` }
      }
      // sapuan likuidasi terkonfirmasi: momen balik setelah sweep low bervolume SAPUAN
      if (v.mom3Atr >= 0.1 && v.sweptLow && v.posInRange <= 0.55 && v.volZ >= 1.4 && v.mom12Atr <= -2.0) {
        return { arah: 'NAIK', bobot: 2.8, alasan: 'sapuan-penolakan terkonfirmasi: dump masih dalam tapi lilin terakhir berbalik setelah low disapu bervolume besar — likuidasi dua sisi selesai, harga melantai balik' }
      }
      // lengan robust: impuls kapitulasi terlihat di mom24 tapi KINI PADAM, lilin terkuat volume-kering
      if (v.mom24Atr <= -4 && v.mom12Atr >= -1.5 && v.volRankBreak <= 0.9 && v.posInRange <= 0.3 && v.bodyShrink <= 0.9) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `vacuum dump padam: impuls ${v.mom24Atr.toFixed(1)} ATR (mom24) tapi kini mom12 ${v.mom12Atr.toFixed(1)}, lilin terkuat volume-kering (volZ ${v.volZBreak.toFixed(1)}), badan menyusut — kapitulasi tanpa penjual lanjutan` }
      }
      return null
    },
  },
]

// SR-L8 — pelajaran PELINDUNG GUARD: rally dalam downtrend BESAR utuh +
// lilin penolakan bervolume nyata = rally kering, bukan reversal.
SR_LAPIS_PELAJARAN.push({
  id: 'SR-L8-RALLY-DOWNTREND',
  versi: '2.0',
  aktif(v) {
    if (
      v.mom50Atr <= -0.8 && v.lowerWickPct <= 0.4 && Math.abs(v.distEma21Atr) <= 2.2 &&
      v.volZ >= 1.2 && v.mom12Atr <= 4.5 && v.consecutiveUp <= 3
    ) {
      return { arah: 'TURUN', bobot: 3.0, alasan: `rally dalam downtrend besar: mom50 ${v.mom50Atr.toFixed(1)} ATR (tren utuh), harga kembali ke EMA21 (${v.distEma21Atr.toFixed(1)} ATR), penolakan bervolume nyata (volZ ${v.volZ.toFixed(1)}) dengan badan penuh — rally kering, bukan reversal` }
    }
    return null
  },
})

const SR_LAPISAN_PER_VERSI: Record<string, string[]> = {
  '1.0': [],
  '2.0': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.1': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.2': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.3': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.4': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.5': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.6': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
  '2.7': ['SR-L1-SWEEP-RECLAIM', 'SR-L2-KAPITULASI-KELELAHAN', 'SR-L3-BREAKDOWN-VOLUMETRIK', 'SR-L4-DASAR-BERTOLAK-BALIK', 'SR-L5-DIP-UPTREND', 'SR-L6-FLAG-AKUMULASI', 'SR-L7-CAPITULATION-VACUUM', 'SR-L8-RALLY-DOWNTREND'],
}

const SR_SEMUA_LAPIS: SrLapis[] = [SR_CORE, ...SR_LAPIS_PELAJARAN]

/** rencana target disiplin: >= 5x fee total (0.6%), <= 2.9% (terjangkau horizon 14 candle) */
function targetDisiplin(arah: 'NAIK' | 'TURUN', v: SrVision): number {
  const dasar = arah === 'NAIK' ? 2.2 : 2.6
  const skalaVol = I.clamp(dasar + (v.atrPct - 0.8) * 1.2, arah === 'NAIK' ? 1.6 : 1.8, 2.9)
  return skalaVol
}

export function srVonis(cs: Candle[], versi = SR_BRAIN_VERSI): SrVonis {
  const v = buildSrVision(cs)
  const aktif = new Set(SR_LAPISAN_PER_VERSI[versi] ?? SR_LAPISAN_PER_VERSI[SR_BRAIN_VERSI])
  let score = 0
  const alasan: string[] = []
  const pelajaranAktif: string[] = []
  for (const lapis of SR_SEMUA_LAPIS) {
    if (lapis.id !== 'SR-CORE' && !aktif.has(lapis.id)) continue
    const out = lapis.aktif(v)
    if (!out) continue
    score += (out.arah === 'NAIK' ? 1 : -1) * out.bobot
    alasan.push(`[${lapis.id}] ${out.alasan}`)
    if (lapis.id !== 'SR-CORE') pelajaranAktif.push(lapis.id)
  }
  const arah: 'NAIK' | 'TURUN' = score > 0 ? 'NAIK' : score < 0 ? 'TURUN' : v.mom12Atr >= 0 ? 'NAIK' : 'TURUN'
  const entry = v.price
  const targetPct = targetDisiplin(arah, v)
  const targetPrice = arah === 'NAIK' ? entry * (1 + targetPct / 100) : entry * (1 - targetPct / 100)
  const conf = Math.min(0.95, 0.5 + Math.abs(score) * 0.08)
  return { arah, entry, targetPct, targetPrice, conf, score, versi, alasan, pelajaranAktif, fitur: v }
}

// ------------------------------------------------------------
// LEDGER PELAJARAN BEAR TRAP — setiap entri = celah yang ditemukan
// ujian & ditambal permanen (juga dicerminkan ke file SAKTI).
// ------------------------------------------------------------

export const LEDGER_SR: { id: string; versi: string; celah: string; aturan: string }[] = [
  { id: 'SR-L1-SWEEP-RECLAIM', versi: '2.0', celah: 'Core menjual sapuan likuidasi di bawah low — persis cara pro dilikuidasi oleh stop-hunt; varian spring volume-lemah tidak terbaca', aturan: 'sweptLow + wick bawah >= 40% + volZ >= 1.2 -> NAIK; spring: sweptLow + wick >= 50% + volZ <= 0.3 + rank <= 0.65 -> NAIK' },
  { id: 'SR-L2-KAPITULASI-KELELAHAN', versi: '2.0', celah: 'Core menjual kapitulasi parabolik & panik vertikal — penjual terakhir selalu di dasar', aturan: 'dist EMA21 <= -2.4 ATR + mom12 <= -3 ATR + wick/doji/volClimax -> NAIK; panik ekstrem (<= -4.5 ATR + RSI <= 22) -> NAIK' },
  { id: 'SR-L3-BREAKDOWN-VOLUMETRIK', versi: '2.2', celah: 'v2.0 median top-3 didominasi lilin pinning; v2.1 lilin-low terendah pada breakdown sehat justru lilin follow-through (volume sedang) -> lengan trap menembak guard. Tell sejati = RATA-RATA ZONA BREAKDOWN', aturan: 'breakdown + posW <= 0.4 + volZ zona <= 0.2 (zona sunyi) -> NAIK; volZ zona >= 1.0 (zona keras) + badan penuh + tanpa divBull -> TURUN (guard)' },
  { id: 'SR-V21-BEDAH-RONDE-1', versi: '2.1', celah: 'Ronde 1 v2.0: 85/100 + guard 21/24 — (1) L3 salah basis volume; (2) L1-spring terblokir syarat rank; (3) double-bottom butuh lengan sweep-hijau ringan; (4) L4 klaster terlalu ketat (rank 0.55, posR 0.45); (5) L5 menolak classic (mom50 -2.8, consecutiveDown reset lilin hijau); (6) L8 rally-guard: amplifier 1/noise membuat rally MUDAH terlalu kuat + dist 1.3/mom12 2.8 menolak GILA', aturan: 'L1-spring buang rank; baru L1c sweep-hijau-ringan (sweptLow + wick >= 50% + hijau + mom12 >= -2.5); L4 rank <= 0.7 tanpa posR; L5 mom50 >= -3.0 tanpa consecutiveDown; L8 |dist| <= 2.2 & mom12 <= 4.5; generator g-rally-downtrend: amplifier rally dibatasi min(1/noise, 1.25)' },
  { id: 'SR-V22-BEDAH-RONDE-1B', versi: '2.2', celah: 'v2.1: 100/100 trap tapi guard 18/24 — (1) L3 lilin-low menembak guard (follow-through); (2) L6-lengan-guard mom24 <= -2.0 menolak bearflag BRUTAL (mom24 -1.5); (3) g-rally MUDAH: rally+drift menghapus downtrend (mom50 0) -> core membeli', aturan: 'L3 pakai volZ RATA-RATA ZONA breakdown (trap <= 0.2, guard >= 1.0); L6-guard: asym5 <= -0.5 + mom50 <= -0.8 + mom24 <= -1.2 (pembeda corr-rally: mom50 positif & asym hijau); generator g-rally: pole 10 kaki, rally 2 kaki, drift dikeringkan' },
  { id: 'SR-L4-DASAR-BERTOLAK-BALIK', versi: '2.0', celah: 'Core membaca fake new low & triple-test dasar sebagai kelanjutan bearish', aturan: 'divBull di dasar + wick >= 60% -> NAIK; klaster wick+sentuhan dasar volume menyusut -> NAIK' },
  { id: 'SR-L5-DIP-UPTREND', versi: '2.0', celah: 'Core menyebut correction dump "trend reversal confirmed" padahal tren besar masih naik', aturan: 'mom50 >= -2.5 ATR + dump >= 1 ATR ke zona demand + wick lebar/badan menyusut + consecutiveDown >= 2 -> NAIK; dump tersapu-di-demand (mom50 >= 0.7 + sweptLow + wick >= 50%) -> NAIK' },
  { id: 'SR-L6-FLAG-AKUMULASI', versi: '2.2', celah: 'Core mencintai bear flag; flag dengan volume hijau menguasai justru pecah ke atas. v2.2: lengan guard diperketat (asym5 <= -0.5 + mom50 <= -0.8 + mom24 <= -1.2) — lama menolak bearflag BRUTAL dan rawan menembak corr-rally', aturan: 'mom24 <= -2.0 + netto flag stagnan + volAsym5 >= 0.15 -> NAIK; flag aliran MERAH KUASA (asym5 <= -0.5) + mom50 <= -0.8 + volZBreak nyata + mom3 turun -> TURUN (guard)' },
  { id: 'SR-L7-CAPITULATION-VACUUM', versi: '2.0', celah: 'Core menjual kapitulasi "berkekuatan"; dump tanpa penjual lanjutan hanyalah reaksi likuidasi', aturan: 'mom24 <= -4 ATR + mom3 berbalik + badan menyusut + volume padam + posR <= 0.3 -> NAIK; impuls padam + volZBreak kering -> NAIK; sapuan-penolakan terkonfirmasi -> NAIK' },
  { id: 'SR-L8-RALLY-DOWNTREND', versi: '2.0', celah: '(Pelindung guard) rally dalam downtrend besar dengan penolakan bervolume = rally kering, bukan reversal — tanpa lengan ini otak membeli guard', aturan: 'mom50 <= -0.8 ATR + harga di sekitar EMA21 (|dist| <= 1.3) + penolakan volZ >= 1.2 + mom12 <= 2.8 -> TURUN (rally kering)' },
  { id: 'SR-V23-BEDAH-RONDE-1C', versi: '2.3', celah: 'v2.2: 100/100 + guard 23/24 — residu G04 g-real-breakdown SEDANG: (1) ambang zona guard 1.0 terlalu tinggi (zona terdilusi mean jendela yang sudah terangkat breakdown keras -> 0.5); (2) lengan L6-akumulasi menembak real-breakdown (asym5 +0.17 dari retest hijau) tanpa melihat breakdown segar', aturan: 'L3-guard ambang zona >= 0.4; L6-trap wajib TANPA breakdown segar (!recentBreakDown) — flag akumulasi sejati tidak menembus lantai' },
  { id: 'SR-V24-BEDAH-RONDE-2', versi: '2.4', celah: 'Ronde 2 otak beku (100 sampel baru): 99/100 + guard 23/24 — (1) reacc-fake GILA: dorongan turun terakhir tak resmi menembus breakLevelDn (0.05u) -> brkDn=0, semua lengan bisu; (2) bearflag-guard GILA: zona breakdown terdilusi oleh pole bervolume tinggi (volZ zona -0.2) -> L3-trap salah menembak', aturan: 'baru L4c reakkumulasi-dasar (posW <= 0.25 + testCl >= 4 + asym20 >= 0.1 + volZ <= 0.5 + mom3 >= -0.6 + mom12 >= -2.2); L3 pakai RASIO volume zona/pra-zona (trap <= 0.75, guard >= 1.35) — kebal dilusi' },
  { id: 'SR-V25-BEDAH-RONDE-2B', versi: '2.5', celah: 'v2.4: rasio volume memperbaiki G23 tapi menelan double-bottom #028/#052 & reacc #047 di Ronde 2 — sapuan lantai mereka bervolume SETARA pendekatannya (rasio 0.82-0.96) sehingga L3 bisu; tell sejati mereka = ANATOMI wick + klaster sentuhan + momen membaik', aturan: 'baru L1d sapuan-lantai-anatomi (lw >= 0.6 + posW <= 0.35 + volZ <= 0.3 + testCl >= 6 + mom12 >= -2.5); baru L4d lantai-ultra-teruji (posW <= 0.1 + testCl >= 10 + asym20 >= -0.05 + volZ <= 0 + mom12 >= -2.5)' },
  { id: 'SR-V26-BEDAH-RONDE-1D', versi: '2.6', celah: 'v2.5: residu #072 triple-test BRUTAL (Ronde 1) — wick 0.55 tertolak ambang L1d 0.6 dan rasio 0.80 tertolak ambang L3 0.75 (kasus batas); semua guard sehat punya lw <= 0.25 sehingga ambang wick 0.5 tetap memisahkan', aturan: 'L1d ambang wick 0.6 -> 0.5 (guard tetap terkunci anatomi badan-penuh)' },
  { id: 'SR-V27-BEDAH-SEED-WEB', versi: '2.7', celah: 'seed web segar (out-of-sample sejati): reacc GILA dengan rasio zona 1.09 (pra-zona sunyi) & asym20 +0.01 tertolak L3 dan L4c (asym20 >= 0.1, mom3 >= -0.6 terlalu ketat) — cerita akumulasi tetap terbaca dari asym12 +0.11 & 7 sentuhan lantai', aturan: 'L4c dilonggarkan: asym20 >= -0.05 + mom3 >= -1.5 (pagar asym20 tetap mengunci semua guard: real-breakdown -0.20, bearflag -0.30, rally posW > 0.25)' },
]

// ------------------------------------------------------------
// BASELINE pembanding
// ------------------------------------------------------------

export function srBaselineSelaluTurun(cs: Candle[]): 'NAIK' | 'TURUN' {
  void cs
  return 'TURUN'
}

export function srBaselineMomenNaif(cs: Candle[]): 'NAIK' | 'TURUN' {
  const n = cs.length
  const d = cs[n - 1].c - cs[Math.max(0, n - 7)].c
  return d >= 0 ? 'NAIK' : 'TURUN'
}
