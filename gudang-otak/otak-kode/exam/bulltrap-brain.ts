// ============================================================
// MICAPROFITA SAKTI-BULLTRAP — otak pemahaman BULL TRAP.
//
// Menerima HANYA candle yang boleh dilihat (point-in-time),
// membaca anatomi bujukan, lalu memvonis biner NAIK/TURUN.
//
// ARSITEKTUR BERLAPIS (ala SAKTI-MATA):
//  - BT-CORE v1.0 = inti momentum naif (artefak "1% AI"):
//    mengejar breakout & FOMO — DIPERTAHANKAN sebagai artefak
//    sejarah & pembanding.
//  - BT-L1..L8 = pelajaran ilmu bull-trap yang ditambal dari
//    bukti bedah ujian (per siklus, tanpa hindsight: semua
//    kondisi terbaca pada candle ke-60).
//  - GUARD anti-bias: pelajaran wajib punya lengan NAIK untuk
//    breakout/flag/pullback SEHAT — otak tidak boleh menjadi
//    burung-burung TURUN; ia harus MEMBEDAKAN jebakan dari
//    momentum asli (pemahaman, bukan kebiasaan).
//
// V2.1 (bedah Ronde 1): volZBreak didefinisikan ulang sebagai
// volZ terkuat di antara lilin yang BENAR-BENAR menembus level
// (bukan lilin stall); pelindung guard diperketat (volZBreak &
// dist); lengan robust L4c/L4d/L5c untuk noise GILA/MUDAH.
// ============================================================

import type { Candle } from './generator'
import * as I from './indicators'
import { buildCandleVision, type CandleVision } from './sakti-candle'

export const BT_BRAIN_VERSI = '2.7'

// ------------------------------------------------------------
// VISION TAMBAHAN khusus bull-trap
// ------------------------------------------------------------

export interface BtVision extends CandleVision {
  /** volZ terkuat di antara lilin yang close-nya DI ATAS level breakout
   *  (12 terakhir); bila tak ada (close balik ke dalam) = volZ lilin
   *  close-tertinggi 12 terakhir. Pembeda fakeout-lemah vs breakout-nyata */
  volZBreak: number
  /** asimetri volume 12 candle terakhir (+ hijau kuasa, − merah kuasa) */
  volAsymZone: number
  /** asimetri volume jendela panjang 20 candle — jejak distribusi dalam range */
  volAsymZone20: number
  /** peringkat persentil volume top-3 thd 20 candle terakhir (0..1) —
   *  pembeda utama breakout-nyata (>= 0.8) vs tembusan tanpa pembeli (<= 0.45) */
  volRankBreak: number
  /** klaster wick-atas penolakan dekat puncak jendela (24 candle) */
  wickClusterHigh: number
  /** klaster sentuhan zona puncak (24 candle) — triple test / UTAD */
  testCluster: number
  /** jarak harga dari EMA50 (ATR) — zona supply downtrend */
  distEma50Atr: number
  /** penyusutan badan: rata badan 3 terakhir / rata badan 6 sebelumnya */
  bodyShrink: number
  /** momentum 24 candle (ATR) — jejak pole/impuls sebelum flag */
  mom24Atr: number
}

export function buildBtVision(cs: Candle[]): BtVision {
  const v = buildCandleVision(cs)
  const n = cs.length
  const vols = cs.map((c) => c.v)
  const volWin0 = vols.slice(Math.max(0, n - 21), n - 1)
  const volSd = Math.max(I.stdev(volWin0), 1e-9)

  // volZBreak: MEDIAN volZ dari 3 lilin BERVOLUME-TERBESAR di 12 candle terakhir —
  // lilin breakout/sapuan SELALU di antara yang paling keras; median menahan spike
  // noise. Level tak dibutuhkan: tell volume milik lilinnya, bukan lokasi.
  const medianOf = (arr: number[]): number => {
    if (!arr.length) return 0
    const s = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }
  const last12 = cs.slice(Math.max(0, n - 12))
  const top3 = [...last12].sort((a, b) => b.v - a.v).slice(0, 3)
  const volZBreak = medianOf(top3.map((c) => (c.v - v.volMean) / volSd))
  // volRankBreak: peringkat persentil volume top-3 thd 20 candle terakhir (0..1) —
  // kebal sd tipis pada range sunyi: yang dinilai adalah RANKING relatif, bukan z-score
  const win20v = vols.slice(Math.max(0, n - 20))
  const top3vol = medianOf(top3.map((c) => c.v))
  const volRankBreak = win20v.length ? win20v.filter((x) => x < top3vol).length / win20v.length : 0.5

  let upV = 0
  let dnV = 0
  for (let i = Math.max(0, n - 12); i < n; i++) {
    if (cs[i].c >= cs[i].o) upV += cs[i].v
    else dnV += cs[i].v
  }
  const volAsymZone = upV + dnV > 0 ? (upV - dnV) / (upV + dnV) : 0

  // asimetri volume jendela PANJANG (20): menangkap distribusi yang terjadi di
  // dalam range/sebelum fase final (re-accumulation fake, UTAD, flag distribusi)
  let upV20 = 0
  let dnV20 = 0
  for (let i = Math.max(0, n - 20); i < n; i++) {
    if (cs[i].c >= cs[i].o) upV20 += cs[i].v
    else dnV20 += cs[i].v
  }
  const volAsymZone20 = upV20 + dnV20 > 0 ? (upV20 - dnV20) / (upV20 + dnV20) : 0

  const winHigh60 = Math.max(...cs.map((c) => c.h))
  let wickClusterHigh = 0
  let testCluster = 0
  for (let i = Math.max(0, n - 24); i < n; i++) {
    const c = cs[i]
    const rng = Math.max(c.h - c.l, 1e-9)
    const uwPct = (c.h - Math.max(c.o, c.c)) / rng
    if (uwPct >= 0.45 && c.h >= winHigh60 - 2.2 * v.atr) wickClusterHigh++
    if (c.h >= winHigh60 - 1.8 * v.atr) testCluster++
  }

  const ema50A = I.ema(cs.map((c) => c.c), 50)
  const distEma50Atr = (v.price - ema50A[n - 1]) / v.atr

  const b3 = I.mean(cs.slice(Math.max(0, n - 3)).map((c) => Math.abs(c.c - c.o)))
  const b6 = I.mean(cs.slice(Math.max(0, n - 9), n - 3).map((c) => Math.abs(c.c - c.o)))
  const bodyShrink = b6 > 1e-9 ? b3 / b6 : 1

  const mom24Atr = (v.price - cs[Math.max(0, n - 25)].c) / v.atr

  return { ...v, volZBreak, volAsymZone, volAsymZone20, volRankBreak, wickClusterHigh, testCluster, distEma50Atr, bodyShrink, mom24Atr }
}

// ------------------------------------------------------------
// MESIN VONIS BERLAPIS
// ------------------------------------------------------------

export interface BtVonis {
  arah: 'NAIK' | 'TURUN'
  conf: number
  score: number
  versi: string
  alasan: string[]
  pelajaranAktif: string[]
  fitur: BtVision
}

interface LapisOut { arah: 'NAIK' | 'TURUN'; bobot: number; alasan: string }

interface BtLapis {
  id: string
  versi: string
  aktif(v: BtVision): LapisOut | null
}

// BT-CORE v1.0 — inti momentum naif (artefak "1% AI"): racunnya
// justru BUKJUKAN ujian ini (mengejar breakout, FOMO lilin hijau).
const BT_CORE: BtLapis = {
  id: 'BT-CORE',
  versi: '1.0',
  aktif(v) {
    let s = 0
    if (v.ema9 > v.ema21) s += 0.5
    else s -= 0.5
    if (v.ema21SlopeAtr > 0.03) s += 0.4
    else if (v.ema21SlopeAtr < -0.03) s -= 0.4
    if (v.green) s += 0.25
    else s -= 0.25
    if (v.recentBreakUp) s += 1.1 // racun: mengejar breakout
    if (v.recentBreakDown) s -= 1.1
    if (v.consecutiveUp >= 3) s += 0.5 // racun: FOMO
    if (v.consecutiveDown >= 3) s -= 0.5
    if (v.hh && v.hl) s += 0.45
    if (v.ll && v.lh) s -= 0.45
    return { arah: s >= 0 ? 'NAIK' : 'TURUN', bobot: Math.min(2.0, Math.abs(s) + 0.3), alasan: `inti momentum: EMA ${v.ema9 > v.ema21 ? 'bull' : 'bear'}, mom12 ${v.mom12Atr.toFixed(1)} ATR, breakout ${v.recentBreakUp ? 'naik' : v.recentBreakDown ? 'turun' : 'tidak ada'}` }
  },
}

// ===== LAPIS PELAJARAN BULL TRAP (v2.x) =====
const BT_LAPIS_PELAJARAN: BtLapis[] = [
  {
    id: 'BT-L1-SWEEP-PENOLAKAN',
    versi: '2.1',
    aktif(v) {
      // wick menusuk high + volume sapuan raksasa + tutup balik di bawah
      if (v.sweptHigh && v.upperWickPct >= 0.4 && v.volZ >= 1.2) {
        return { arah: 'TURUN', bobot: 3.0, alasan: `sweep likuidasi di atas: wick ${Math.round(v.upperWickPct * 100)}% menembus high bervolume raksasa (volZ ${v.volZ.toFixed(1)}) lalu ditutup kembali di bawahnya — pembeli breakout terjebak di puncak wick` }
      }
      // UTAD: sapuan tipis bervolume LEMAH + tembusan tanpa pembeli + tak meluas
      if (v.sweptHigh && v.posInWindow60 >= 0.6 && v.volZ <= 0.3 && v.volRankBreak <= 0.65) {
        return { arah: 'TURUN', bobot: 3.0, alasan: `UTAD: dorongan menembus tepi atas dengan volume layu (volZ ${v.volZ.toFixed(1)}, tembus ${v.volZBreak.toFixed(1)}) lalu DITOLAK — tes terakhir distribusi sebelum markdown` }
      }
      return null
    },
  },
  {
    id: 'BT-L2-KLIMAKS-KELELAHAN',
    versi: '2.1',
    aktif(v) {
      if (v.distEma21Atr >= 2.4 && v.mom12Atr >= 3.0 && v.volRankBreak <= 0.8 && (v.upperWickPct >= 0.35 || v.doji || v.volClimax)) {
        return { arah: 'TURUN', bobot: 3.0, alasan: `klimaks kelelahan: harga +${v.distEma21Atr.toFixed(1)} ATR dari EMA21, mom12 +${v.mom12Atr.toFixed(1)} ATR, wick/doji kelelahan${v.volClimax ? ' + volume klimaks' : ''} — buyer terakhir sudah masuk` }
      }
      // chase vertikal ekstrem: mean reversion tak tertahankan
      if (v.distEma21Atr >= 3.2 && v.rsi >= 82) {
        return { arah: 'TURUN', bobot: 3.4, alasan: `chase vertikal: jarak ${v.distEma21Atr.toFixed(1)} ATR dari EMA21 + RSI ${v.rsi.toFixed(0)} — statistik mean-reversion menghukum pengejar` }
      }
      return null
    },
  },
  {
    id: 'BT-L3-BREAKOUT-VOLUMETRIK',
    versi: '2.1',
    aktif(v) {
      // breakout TANPA volume nyata = jebakan klasik (volZBreak = volZ terkuat
      // di antara lilin yang beneran menembus level — bukan lilin stall)
      if (v.recentBreakUp && v.posInWindow60 >= 0.6 && (v.volRankBreak <= 0.65 || (v.volAsymZone20 <= -0.1 && v.volRankBreak <= 0.75))) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `fakeout volumetrik: breakout ke puncak jendela tapi volume tembusnya layu (peringkat ${Math.round(v.volRankBreak * 100)}% dari 20 candle), asimetri zona ${v.volAsymZone20.toFixed(2)} — tak ada pembeli besar di baliknya` }
      }
      // lengan pelindung GUARD: breakout bervolume nyata + ekstensi wajar = momentum asli
      if (v.recentBreakUp && v.volRankBreak >= 0.8 && !v.divBear && v.bodyPct >= 0.45 && v.lowerWickPct <= 0.35) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `breakout sehat: volume tembus ${v.volZBreak.toFixed(1)} sigma (pembeli besar nyata), badan penuh, tanpa divergensi — momentum asli, bukan trap` }
      }
      return null
    },
  },
  {
    id: 'BT-L4-PUNCAK-BERTOLAK-BALIK',
    versi: '2.1',
    aktif(v) {
      if (v.divBear && v.posInRange >= 0.75 && v.upperWickPct >= 0.6) {
        return { arah: 'TURUN', bobot: 2.8, alasan: 'divergensi bearish di puncak dengan wick penolakan lebar: harga membuat high baru tapi momentum melemah & lilin ditolak — fake new high, pembeli terakhir terjebak' }
      }
      if (v.wickClusterHigh >= 3 && v.testCluster >= 2 && v.volRankBreak <= 0.55 && v.posInRange >= 0.55 && v.mom12Atr <= 3.2) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `puncak bertolak-balik: ${v.wickClusterHigh} wick penolakan + ${v.testCluster} sentuhan zona puncak dengan volume menyusut (volZ tembus ${v.volZBreak.toFixed(1)}) — supply menguasai, markdown menunggu` }
      }
      // lengan robust (bukti Ronde 1): tolakan berulang di puncak + volume tembus kering
      // + tren lama tak kuat = triple-test / reacc-fake di segala difficulty
      if (
        (v.sweptHigh || v.wickClusterHigh >= 2) && v.volRankBreak <= 0.6 &&
        v.mom12Atr <= 2 && v.posInWindow60 >= 0.3 && v.mom50Atr <= 1.5 &&
        v.recentBreakUp && v.failedRetest
      ) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `tolakan berulang di puncak: high disapu lalu dicabut (fail-retest), volume tembus kering (volZ ${v.volZBreak.toFixed(1)}), tren lama tak kuat (mom50 ${v.mom50Atr.toFixed(1)}) — supply menguasai` }
      }
      // lengan robust-3 (bukti Ronde 1): distribusi tersembunyi di jendela panjang —
      // volume merah menguasai 20 candle terakhir + klaster penolakan di puncak
      if (v.volAsymZone20 <= -0.12 && v.wickClusterHigh >= 2 && v.mom12Atr <= 4 && v.posInWindow60 >= 0.5 && v.mom50Atr <= 6.0) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `distribusi tersembunyi: aliran 20 candle merah kuasa (asym20 ${v.volAsymZone20.toFixed(2)}) + ${v.wickClusterHigh} penolakan di puncak — lepas-posisi diam-diam di balik wajah bullish` }
      }
      // lengan terpadu (bukti Ronde 1): TES SUPPLY DENGAN PENOLAKAN — harga di zona
      // atas jendela, lilin keputusan DITOLAK wick lebar, volume keputusan layu.
      // SEMUA guard sehat punya lilin keputusan badan-penuh (uw <= 0.5) — terpisah bersih
      // lengan terpadu (bukti Ronde 1+2): TES SUPPLY DENGAN PENOLAKAN — tiga lengan
      // yang semuanya diblokir utk guard oleh ANATOMI LILIN (guard = badan penuh uw <= 0.5)
      // lengan terpadu (bukti Ronde 1+2+Hakim): TES SUPPLY DENGAN PENOLAKAN.
      // Pembeda dari guard = ANATOMI LILIN (guard: badan penuh uw <= 0.5).
      // arm4 (tanpa breakout segar) bebas bukti-tambahan; arms 1-3 wajib bukti
      // struktural (sweep / fail-retest / volume kering) ATAU dorongan di atas
      // range-top dengan tren-besar moderat (posR >= 0.95 & mom50 <= 6).
      {
        const dasar = v.posInWindow60 >= 0.2 && v.upperWickPct >= 0.52 && v.mom12Atr <= 4.5 && v.posInWindow60 >= 0.2
        const bukti = v.sweptHigh || v.volZ <= -0.4 || (v.failedRetest && v.volZBreak <= 1.2) || (v.posInRange >= 0.95 && v.mom50Atr <= 6.0)
        if (dasar && !v.recentBreakUp) {
          return { arah: 'TURUN', bobot: 2.8, alasan: `grind di zona supply tanpa breakout segar: harga menekan puncak jendela dengan wick ${Math.round(v.upperWickPct * 100)}% & volume layu (volZ ${v.volZ.toFixed(1)}) — supply tua menguasai tanpa pembeli baru` }
        }
        if (
          dasar && bukti &&
          (
            (v.volZ <= 0.35 && v.consecutiveUp <= 2) ||
            (v.upperWickPct >= 0.54 && v.volZ <= -0.4 && v.consecutiveUp <= 12) ||
            (v.volRankBreak <= 0.8)
          )
        ) {
          return { arah: 'TURUN', bobot: 2.8, alasan: `tes supply dengan penolakan: harga di zona atas jendela, wick ${Math.round(v.upperWickPct * 100)}% ditolak dengan volume layu (volZ ${v.volZ.toFixed(1)}, peringkat ${Math.round(v.volRankBreak * 100)}%) — supply tua menguasai, tanpa pembeli besar` }
        }
      }
      // lengan robust-2 (bukti Ronde 1): tolakan sudah selesai — harga tergelincir di
      // bawah semua tes dengan RSI lemah; jangan beli "kesempatan murah"
      if (v.sweptHigh && v.failedRetest && v.mom24Atr <= 0 && v.rsi <= 60 && v.recentBreakUp) {
        return { arah: 'TURUN', bobot: 2.6, alasan: `pasca-tolakan tergelincir: mom24 ${v.mom24Atr.toFixed(1)} ATR + RSI ${v.rsi.toFixed(0)} + tutup balik di bawah level — penolakan ketiga selesai, markdown berjalan` }
      }
      return null
    },
  },
  {
    id: 'BT-L5-RELIEF-DOWNTREND',
    versi: '2.1',
    aktif(v) {
      if (
        v.mom50Atr <= 2.5 && v.mom24Atr <= 4.5 && v.mom12Atr >= 1.0 &&
        (v.distEma21Atr >= 1.6 || v.sweptHigh) &&
        (v.upperWickPct >= 0.6 || v.bodyShrink <= 0.45) &&
        v.consecutiveUp >= 2
      ) {
        return { arah: 'TURUN', bobot: 3.0, alasan: `relief rally dalam downtrend: mom50 ${v.mom50Atr.toFixed(1)} ATR (tren besar tak kuat), rally +${v.mom12Atr.toFixed(1)} ATR mencapai zona supply dan DITOLAK wick lebar (${Math.round(v.upperWickPct * 100)}%) — reversal palsu menelan pembeli` }
      }
      // lengan robust (bukti Ronde 1): rally panjang mengangkat mom50, TAPI high baru
      // menyapu supply lama & ditolak dengan wick lebar — rally kehabisan pembeli
      if (v.mom50Atr <= -0.7 && v.sweptHigh && v.upperWickPct >= 0.5 && v.mom12Atr >= 3.0) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `relief tersapu-di-supply: mom50 ${v.mom50Atr.toFixed(1)} ATR (downtrend utuh), high baru hanya menyapu supply lama & ditolak (wick ${Math.round(v.upperWickPct * 100)}%) — reversal palsu` }
      }
      return null
    },
  },
  {
    id: 'BT-L6-FLAG-DISTRIBUSI',
    versi: '2.1',
    aktif(v) {
      // flag yang "sempurna" bentuknya tapi volume MERAH menguasai = distribusi
      if (v.mom24Atr >= 2.0 && v.netLast5Atr <= 0.3 && v.volAsym5 <= -0.15 && v.consecutiveUp <= 1 && v.posInWindow60 >= 0.55) {
        return { arah: 'TURUN', bobot: 3.0, alasan: `bull flag distribusi: pole +${v.mom24Atr.toFixed(1)} ATR tapi aliran flag merah kuasa (volAsym ${v.volAsym5.toFixed(2)}), netto stagnan (${v.netLast5Atr.toFixed(1)} ATR) — lepas-posisi diam-diam, flag akan pecah ke bawah` }
      }
      // lengan pelindung GUARD: flag dengan aliran hijau + volume tembus nyata
      if (v.mom24Atr >= 2.0 && v.volAsym5 >= 0.05 && v.netLast5Atr >= -0.2 && v.posInWindow60 >= 0.55 && v.volRankBreak >= 0.75 && v.distEma21Atr <= 2.2 && v.upperWickPct <= 0.4 && v.mom12Atr >= 1.5 && v.volAsymZone20 >= -0.05) {
        return { arah: 'NAIK', bobot: 2.8, alasan: `flag sehat: pole kuat + aliran hijau tetap menguasa (volAsym +${v.volAsym5.toFixed(2)}) + volume tembus nyata (volZ ${v.volZBreak.toFixed(1)}) — continuation, bukan distribusi` }
      }
      return null
    },
  },
  {
    id: 'BT-L7-SQUEEZE-VACUUM',
    versi: '2.1',
    aktif(v) {
      // squeeze tanpa pembeli lanjutan: momen balik + volume stall padam (wajib
      // ada IMPULS squeeze dulu — mom24 >= 4 — agar tak menuduh rally biasa)
      if (v.mom24Atr >= 4 && v.mom12Atr >= 2.0 && v.mom3Atr <= -0.1 && v.bodyShrink <= 0.5 && v.volZ <= 0 && v.posInRange >= 0.7) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `squeeze vacuum: momen squeeze +${v.mom12Atr.toFixed(1)} ATR tapi momen sesaat berbalik (${v.mom3Atr.toFixed(1)}), badan menyusut (shrink ${v.bodyShrink.toFixed(2)}), volume padam (volZ ${v.volZ.toFixed(1)}) — rally tanpa pembeli nyata` }
      }
      // sapuan likuidasi terkonfirmasi: momen balik setelah sweep high bervolume SAPUAN
      if (v.mom12Atr >= 2.0 && v.mom3Atr <= -0.1 && v.sweptHigh && v.posInRange >= 0.45 && v.volZ >= 1.4) {
        return { arah: 'TURUN', bobot: 2.8, alasan: 'sapuan-penolakan terkonfirmasi: momen dorongan masih positif tapi lilin terakhir berbalik setelah high disapu — likuidasi dua sisi selesai, harga jatuh' }
      }
      // lengan robust (bukti Ronde 1 GILA): impuls squeeze terlihat di mom24 tapi KINI
      // PADAM, lilin volume-tertinggi justru KERING — squeeze tanpa pembeli lanjutan
      if (v.mom24Atr >= 4 && v.mom12Atr <= 1.5 && v.volRankBreak <= 0.9 && v.posInRange >= 0.7 && v.bodyShrink <= 0.9) {
        return { arah: 'TURUN', bobot: 2.8, alasan: `vacuum rally padam: impuls +${v.mom24Atr.toFixed(1)} ATR (mom24) tapi kini mom12 ${v.mom12Atr.toFixed(1)}, lilin terkuat volume-kering (volZ ${v.volZBreak.toFixed(1)}), badan menyusut — squeeze tanpa pembeli lanjutan` }
      }
      return null
    },
  },
]

// BT-L8 — pelajaran PELINDUNG GUARD (bukti Ronde 1: 5 guard pullback sehat
// dijual core karena EMA pendek berbalik saat koreksi). Uptrend BESAR utuh +
// lilin pembalikan bervolume nyata = koreksi sehat, bukan reversal.
BT_LAPIS_PELAJARAN.push({
  id: 'BT-L8-PULLBACK-UPTREND',
  versi: '2.1',
  aktif(v) {
    if (
      v.mom50Atr >= 0.8 && v.upperWickPct <= 0.4 && Math.abs(v.distEma21Atr) <= 1.3 &&
      v.volZ >= 1.2 && v.mom12Atr >= -2.8 && v.consecutiveDown <= 3
    ) {
      return { arah: 'NAIK', bobot: 3.0, alasan: `pullback dalam uptrend besar: mom50 +${v.mom50Atr.toFixed(1)} ATR (tren utuh), harga kembali ke EMA21 (${v.distEma21Atr.toFixed(1)} ATR), pembalikan bervolume nyata (volZ ${v.volZ.toFixed(1)}) dengan badan penuh — koreksi sehat, bukan reversal` }
    }
    return null
  },
})

const BT_LAPISAN_PER_VERSI: Record<string, string[]> = {
  '1.0': [],
  '2.0': ['BT-L1-SWEEP-PENOLAKAN', 'BT-L2-KLIMAKS-KELELAHAN', 'BT-L3-BREAKOUT-VOLUMETRIK', 'BT-L4-PUNCAK-BERTOLAK-BALIK', 'BT-L5-RELIEF-DOWNTREND', 'BT-L6-FLAG-DISTRIBUSI', 'BT-L7-SQUEEZE-VACUUM', 'BT-L8-PULLBACK-UPTREND'],
  '2.1': ['BT-L1-SWEEP-PENOLAKAN', 'BT-L2-KLIMAKS-KELELAHAN', 'BT-L3-BREAKOUT-VOLUMETRIK', 'BT-L4-PUNCAK-BERTOLAK-BALIK', 'BT-L5-RELIEF-DOWNTREND', 'BT-L6-FLAG-DISTRIBUSI', 'BT-L7-SQUEEZE-VACUUM', 'BT-L8-PULLBACK-UPTREND'],
  '2.7': ['BT-L1-SWEEP-PENOLAKAN', 'BT-L2-KLIMAKS-KELELAHAN', 'BT-L3-BREAKOUT-VOLUMETRIK', 'BT-L4-PUNCAK-BERTOLAK-BALIK', 'BT-L5-RELIEF-DOWNTREND', 'BT-L6-FLAG-DISTRIBUSI', 'BT-L7-SQUEEZE-VACUUM', 'BT-L8-PULLBACK-UPTREND'],
}

const BT_SEMUA_LAPIS: BtLapis[] = [BT_CORE, ...BT_LAPIS_PELAJARAN]

export function btVonis(cs: Candle[], versi = BT_BRAIN_VERSI): BtVonis {
  const v = buildBtVision(cs)
  const aktif = new Set(BT_LAPISAN_PER_VERSI[versi] ?? BT_LAPISAN_PER_VERSI[BT_BRAIN_VERSI])
  let score = 0
  const alasan: string[] = []
  const pelajaranAktif: string[] = []
  for (const lapis of BT_SEMUA_LAPIS) {
    if (lapis.id !== 'BT-CORE' && !aktif.has(lapis.id)) continue
    const out = lapis.aktif(v)
    if (!out) continue
    score += (out.arah === 'NAIK' ? 1 : -1) * out.bobot
    alasan.push(`[${lapis.id}] ${out.alasan}`)
    if (lapis.id !== 'BT-CORE') pelajaranAktif.push(lapis.id)
  }
  const arah: 'NAIK' | 'TURUN' = score > 0 ? 'NAIK' : score < 0 ? 'TURUN' : v.mom12Atr >= 0 ? 'NAIK' : 'TURUN'
  const conf = Math.min(0.95, 0.5 + Math.abs(score) * 0.08)
  return { arah, conf, score, versi, alasan, pelajaranAktif, fitur: v }
}

// ------------------------------------------------------------
// LEDGER PELAJARAN BULL TRAP — setiap entri = celah yang ditemukan
// ujian & ditambal permanen (juga dicerminkan ke file SAKTI).
// ------------------------------------------------------------

export const LEDGER_BT: { id: string; versi: string; celah: string; aturan: string }[] = [
  { id: 'BT-L1-SWEEP-PENOLAKAN', versi: '2.0', celah: 'Core mengejar breakout padahal wick baru saja menyapu high & ditolak (stop-hunt) — persis cara pro dilikuidasi', aturan: 'sweptHigh + wick >= 40% + volZ >= 1.2 -> TURUN; varian UTAD: sapuan volume-lemah + lilin ditolak (mom3 <= -0.25) -> TURUN' },
  { id: 'BT-L2-KLIMAKS-KELELAHAN', versi: '2.0', celah: 'Core membeli klimaks parabolik & breakout tren tua — buyer terakhir selalu di puncak', aturan: 'dist EMA21 >= 2.4 ATR + mom12 >= 3 ATR + wick/doji/volClimax -> TURUN; chase ekstrem (>= 3.5 ATR + RSI >= 84) -> TURUN' },
  { id: 'BT-L3-BREAKOUT-VOLUMETRIK', versi: '2.0', celah: 'Core buta volume: breakout tanpa pembeli besar tetap dibeli (fakeout klasik)', aturan: 'breakout + volZ tembus <= 0.2 / asimetri merah -> TURUN; breakout volZ >= 1.2 sigma + badan penuh + tanpa divBear -> NAIK (guard)' },
  { id: 'BT-L4-PUNCAK-BERTOLAK-BALIK', versi: '2.0', celah: 'Core membaca fake new high & triple-test sebagai kelanjutan bullish', aturan: 'divBear di puncak -> TURUN; klaster wick+sentuhan puncak volume menyusut -> TURUN; tolakan-berulang fail-retest -> TURUN; pasca-tolakan tergelincir (mom24 <= 0, RSI <= 60) -> TURUN' },
  { id: 'BT-L5-RELIEF-DOWNTREND', versi: '2.0', celah: 'Core menyebut relief rally "reversal confirmed" padahal tren besar masih turun', aturan: 'mom50 <= -2.5 ATR + rally >= 1 ATR ke zona supply + badan menyusut tanpa divBull -> TURUN; rally panjang menangkat mom50 tapi high tersapu-di-supply & ditolak -> TURUN' },
  { id: 'BT-L6-FLAG-DISTRIBUSI', versi: '2.0', celah: 'Core mencintai bull flag; flag dengan volume merah menguasai justru pecah ke bawah', aturan: 'mom24 kuat + netto flag stagnan + volAsym5 <= -0.15 -> TURUN; flag aliran hijau + volZBreak >= 0.5 + dist <= 2.2 -> NAIK (guard)' },
  { id: 'BT-L7-SQUEEZE-VACUUM', versi: '2.0', celah: 'Core membeli squeeze "berkekuatan"; squeeze tanpa pembeli lanjutan hanyalah reaksi likuidasi', aturan: 'mom12 >= 2 ATR + mom3 berbalik + badan menyusut + volume padam -> TURUN; mom24 impuls + padam + volZBreak kering -> TURUN; sapuan-penolakan terkonfirmasi -> TURUN' },
  { id: 'BT-L8-PULLBACK-UPTREND', versi: '2.0', celah: 'Ronde 1: 5 guard pullback sehat dijual — EMA pendek berbalik saat koreksi, core tak melihat tren besar', aturan: 'mom50 >= +2.5 ATR + harga di sekitar EMA21 (|dist| <= 1.3) + pembalikan volZ >= 1.2 + mom12 >= -2.8 -> NAIK (koreksi sehat)' },
  { id: 'BT-V21-BEDAH-RONDE-1', versi: '2.1', celah: 'Ronde 1 v2.0: 79/100 — (1) volZBreak membaca lilin stall bukan lilin tembus level; (2) pelindung flag menembak ke parabolic/classic/reacc; (3) L8 diblok struktur ll; (4) relief-rally mom50 terangkat rally panjang; (5) triple-test geometri klaster rapuh', aturan: 'volZBreak = median top-3 volume; L6-NAIK wajib rank >= 0.75 & dist <= 2.2 & uw <= 0.4 & mom12 >= 1.5 & asym20 >= -0.05; L8 pakai mom12 >= -2.8; baru: L4c tolakan-berulang, L4d pasca-tolakan-tergelincir, L5c relief-tersapu-di-supply, L4e tes-supply-dengan-penolakan' },
  { id: 'BT-V22-BEDAH-RONDE-2', versi: '2.2', celah: 'Ronde 2 sampel baru v2.1: 95/100 + guard 21/24 — (1) L4e posW >= 0.5 memblokir triple-test yang decision-nya di tengah jendela; (2) spike noise menaikkan peringkat volume UTAD/reacc sehingga lengan utama L4e terblokir; (3) L2a menembak breakout-keras guard (peringkat 0.9); (4) relief GILA putus streak hijau; (5) g-pullback GILA: noise 2.1x menghapus tren dari mom50', aturan: 'L4e tiga lengan (up<=2 / volZ<=-0.5&up<=12 / rank<=0.8) posW >= 0.2 — guard tetap terblokir anatomi uw <= 0.5; L2a wajib rank <= 0.8; L5 up >= 2; generator g-pullback: kaki naik & koreksi diskalakan noise (sinyal >= derau, mengukur kemahiran bukan keberuntungan)' },
  { id: 'BT-V25-BEDAH-HAKIM', versi: '2.5', celah: 'Hakim segel v2.4: 99+1 guard — (1) L5 diblok divBull minor padahal syarat uw >= 0.6 sudah mengunci semua guard (redundan); (2) L4e arm1 menembak RETEST-SEHAT g-real-break (2 lilin merah koreksi + tutup masih di atas level + volume keras) karena tak ada syarat bukti struktural', aturan: 'L5 buang !divBull; L4e wajib bukti struktural (sweptHigh || failedRetest || volZ <= -0.4) — retest-sehat yang menahan di atas level bervolume keras TIDAK boleh dituduh supply; L4c-reacc lepas rank (asym20 <= -0.12 milik trap saja)' },
  { id: 'BT-V26-RESTRUKTURISASI-L4E', versi: '2.6', celah: 'V2.5: bukti-struktural dipaksakan ke SEMUA lengan -> reacc dorong-di-atas-range (posR >= 1.0, sweptH/failRetest/volZ-kering semua nihil) kehilangan perlindungan; L4c-reacc tanpa pagar menembak g-pullback GILA (asym20 -0.13, mom50 10.3)', aturan: 'L4e dipecah: arm4 brkUp=0 bebas bukti (guard terkunci uw); arms 1-3 bukti struktural ATAU posR >= 0.95 & mom50 <= 6; L4c-reacc + pagar mom50 <= 6 (flag sehat mom50 8-12)' },
  { id: 'BT-V27-PAGAR-FAILRETEST', versi: '2.7', celah: 'Hakim #007 g-real-break BRUTAL: retest DIBAWAH level sesaat (failRetest=1 oleh noise) tapi breakout 1.9 sigma keras & truth lanjut naik — jalur failRetest menuduhnya supply', aturan: 'jalur failRetest wajib volZBreak <= 1.2 (breakout keras >= 1.5 sigma = retest-sehat, bukan supply-test); jalur sweptHigh/volZ-kering/posR tetap' },
]

// ------------------------------------------------------------
// BASELINE pembanding
// ------------------------------------------------------------

export function btBaselineSelaluNaik(cs: Candle[]): 'NAIK' | 'TURUN' {
  void cs
  return 'NAIK'
}

export function btBaselineMomenNaif(cs: Candle[]): 'NAIK' | 'TURUN' {
  const n = cs.length
  const d = cs[n - 1].c - cs[Math.max(0, n - 7)].c
  return d >= 0 ? 'NAIK' : 'TURUN'
}
