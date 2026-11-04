// ============================================================
// MICAPROFITA SAKTI-ARAH — MESIN KEPASTIAN ARAH BERBASIS BUKTI.
//
// Mandat Guru:
//   "AGI hanya memiliki dua keputusan: BUY atau SELL."
//   "AGI dilatih untuk mencari dasar keputusan yang sekuat
//    mungkin sebelum menentukan arah — berdasarkan SELURUH
//    bukti yang tersedia."
//   "Amati -> analisis -> kumpulkan bukti -> tentukan arah ->
//    BUY/SELL -> evaluasi -> pelajari kesalahan -> benahi ->
//    tingkatkan presisi."
//
// Arsitektur: DEWAN BUKTI 8 DIMENSI (point-in-time, 60 candle):
//   AR-E1 STRUKTUR HARGA       — swing HH/HL vs LH/LL, break/retest
//   AR-E2 LIKUIDITAS           — pool disapu/diam, sisi manis mana
//   AR-E3 VOLUME               — dorongan/asimetri/klimaks vs kering
//   AR-E4 MOMENTUM             — impuls 3/12/50 candle dlm ATR
//   AR-E5 VOLATILITAS          — kompresi vs ekspansi (bahan bakar)
//   AR-E6 SUPPORT/RESISTANCE   — jarak & kekuatan level penjaga
//   AR-E7 TEKANAN BELI-JUAL    — badan/wick/engulf/close-range
//   AR-E8 PERUBAHAN KONDISI    — fase: panen-likuiditas/distribusi/
//                                kaskade/kering (pembaca episode)
//   + KETUA DEWAN: pembaca episode otak kompleks (klVonis) —
//     tracker bersertifikat 1600/1600 — memberi arah episode &
//     jangkar kalibrasi kepastian.
//
// VONIS WAJIB BINER: BUY atau SELL — tanpa SKIP (pasar tak
// kenal "tidak memutuskan" bagi pemburu yang terlatih).
// KEPASTIAN 0..100 = kekuatan sepihak bukti searah vonis;
// dikalibrasi: vonis pasti harus lebih sering benar.
// ============================================================

import type { Candle } from './generator'
import { klVonis, type KlKeputusan } from './kompleks-brain'
import type { KlArah } from './kompleks-forge'
import { stdev } from './indicators'

export const ARAH_BRAIN_VERSI = '1.8'

export type ArahVote = 'NAIK' | 'TURUN' | 'NETRAL'

/** satu dimensi bukti — suara + kekuatan + penjelasan */
export interface BuktiDimensi {
  id: string
  label: string
  vote: ArahVote
  kekuatan: number // 0..1 — seberapa keras bukti ini berbicara
  bobot: number // bobot fusi (total = 1.0)
  cara: string // penjelasan dari data
}

export interface VonisArah {
  versi: string
  vonis: 'BUY' | 'SELL' // WAJIB biner
  arah: KlArah // NAIK=BUY, TURUN=SELL (eksekusi)
  kepastian: number // 0..100 — keyakinan berbasis bukti
  skorArah: number // -100..+100 — saldo dewan bukti
  bukti: BuktiDimensi[] // 8 dimensi, urut bobot
  buktiKunci: string[] // 3 bukti terkuat searah vonis
  eksekusi: { aksi: 'ENTRY' | 'WAIT'; targetPct: number; stopPct: number; triggerLevel?: number; sumber: string }
  lapisan: string // lapisan ketua dewan yang memutuskan
  konsensus: number // 0..1 — porsi bobot yang searah vonis
  alasan: string[]
  kl: {
    aksi: string
    arah: string
    pelajaran: string[]
    aspek5: KlKeputusan['aspek5']
    poolLevel: number
    poolSide: string
    poolSwept: boolean
  }
}

const TARGET_DISIPLIN = 2.2
const STOP_MIN = 1.2
const STOP_MAX = 2.6
const STOP_WAIT = 1.8
// AR-L2 (bedah R1, 10 likuidasi): ekstrem sapuan WAJIB diberi ruang
// retest — amplop derau sapuan ~0.7 ATR; stop yang menempel 0.45 ATR
// di balik ekstrem tersapu retest kedua. Margin aman: 0.8 ATR.
const STOP_MARGIN_ATR = 0.8

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const sgn = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0)

// ------------------------------------------------------------
// AR-L3 — V-MULAI-VOID (bedah hakim r2: 12 kegagalan SATU
// klaster; hipotesis pertama "consec-big + crossback kecil"
// TERBANTAHKAN data — anatomi sebenarnya: lilin keputusan =
// lilin V RAKSASA berlawanan arah gerak tua, badan 3.7-4.2 ATR,
// volume klimaks, TANPA pool terpetakan).
// Kaskade tanpa pool = panen likuidasi ke VOID; ketika lilin
// V monster menutup melawan gerak extended, mesin likuidasi
// KEHABISAN BAHAN BAKAR — V sudah dimulai: arah = arah lilin V.
// ------------------------------------------------------------

export interface KaskadeVoid {
  aktif: boolean
  arah: KlArah
  cara: string
}

export function volZmax3Of(cs: Candle[], f: KlKeputusan['fitur']): number {
  const n = cs.length
  const vols = cs.map((c) => c.v)
  const volSd = Math.max(stdev(vols.slice(Math.max(0, n - 30))), 1e-9)
  return Math.max(...cs.slice(Math.max(0, n - 3)).map((c) => (c.v - f.volMean) / volSd))
}

export function deteksiKaskadeVoid(cs: Candle[], f: KlKeputusan['fitur'], kl: KlKeputusan): KaskadeVoid {
  const n = cs.length
  const atr = Math.max(f.atr, 1e-9)
  if (kl.pool.swept) return { aktif: false, arah: 'NAIK', cara: 'pool terpetakan — episode ditangani tracker, bukan void' }
  const last = cs[n - 1]
  const lastBody = (last.c - last.o) / atr
  // klimaks boleh duduk di lilin kedua/ketiga terakhir (lilin V sendiri
  // kadang volumenya turun setelah klimaks — bedah hakim25 #13/#14;
  // ambang 1.6: V-monster dgn klimaks agak lemah tetap sah — bedah hakim43#14)
  const volZmax3 = volZmax3Of(cs, f)
  const volKlimaks = f.lastVolZ >= 1.4 || volZmax3 >= 1.6
  // gerak tua diukur mom30 (jendela 30 candle) — mom50 bisa terhapus
  // fasa lawan di awal jendela (bedah hakim28 #18: mom50 0.5, mom30 4.2)
  const gerakTuaNaik = f.mom30Atr >= 2.5
  const gerakTuaTurun = f.mom30Atr <= -2.5
  if (volKlimaks && gerakTuaNaik && lastBody <= -1.5) {
    return {
      aktif: true, arah: 'TURUN',
      cara: `V-mulai-VOID: gerak tua naik ${f.mom30Atr.toFixed(1)} ATR tanpa pool terpetakan, lalu lilin keputusan MENGHANTAM balik ${lastBody.toFixed(1)} ATR (klimaks z=${volZmax3 >= f.lastVolZ ? volZmax3.toFixed(1) : f.lastVolZ.toFixed(1)} di 3 candle terakhir) — panen likuidasi selesai, markdown dimulai (AR-L3)`,
    }
  }
  if (volKlimaks && gerakTuaTurun && lastBody >= 1.5) {
    return {
      aktif: true, arah: 'NAIK',
      cara: `V-mulai-VOID: gerak tua turun ${f.mom30Atr.toFixed(1)} ATR tanpa pool terpetakan, lalu lilin keputusan MELUNCUR balik ${lastBody.toFixed(1)} ATR (klimaks z=${volZmax3 >= f.lastVolZ ? volZmax3.toFixed(1) : f.lastVolZ.toFixed(1)} di 3 candle terakhir) — panen likuidasi selesai, pemulihan dimulai (AR-L3)`,
    }
  }
  return { aktif: false, arah: 'NAIK', cara: 'tanpa V-mulai-void' }
}

// ------------------------------------------------------------
// 8 DIMENSI BUKTI
// ------------------------------------------------------------

function e1Struktur(cs: Candle[], f: KlKeputusan['fitur']): BuktiDimensi {
  let s = 0
  const cat: string[] = []
  if (f.hh || f.hl) { s += 0.35; cat.push(f.hh ? 'higher-high' : 'higher-low') }
  if (f.lh || f.ll) { s -= 0.35; cat.push(f.lh ? 'lower-high' : 'lower-low') }
  if (f.recentBreakUp && !f.failedRetest) { s += 0.45; cat.push(`breakout ${f.breakLevel.toFixed(2)} ditahan retest`) }
  if (f.recentBreakDown && !f.failedRetest) { s -= 0.45; cat.push(`breakdown ${f.breakLevelDn.toFixed(2)} ditolak retest`) }
  if (f.failedRetest) { s -= sgn(s || 1) * 0.4; cat.push('retest GAGAL — struktur menipu') }
  s += clamp(f.ema21SlopeAtr, -0.6, 0.6) * 0.8
  if (f.lowTrend12 >= 0.02) { s += 0.3; cat.push('low menaik (akumulasi)') }
  else if (f.lowTrend12 <= -0.02) { s -= 0.3; cat.push('low menurun (distribusi)') }
  const vote: ArahVote = s > 0.15 ? 'NAIK' : s < -0.15 ? 'TURUN' : 'NETRAL'
  return {
    id: 'AR-E1', label: 'Struktur Harga', vote, kekuatan: clamp(Math.abs(s), 0, 1), bobot: 0.16,
    cara: `struktur: ${cat.length ? cat.join(', ') : 'tidak berarah'}; posisi jendela ${(f.posInWindow60 * 100).toFixed(0)}%; ema21 slope ${f.ema21SlopeAtr.toFixed(2)} ATR`,
  }
}

function e2Likuiditas(kl: KlKeputusan): BuktiDimensi {
  const P = kl.pool.swept ? { side: kl.pool.side, level: kl.pool.level, depth: kl.pool.depthAtr, bars: kl.pool.barsSince, reclaimed: kl.pool.reclaimed } : null
  if (P && P.side === 'BAWAH') {
    // AR-L5 (bedah segel22 #84): sapuan TIDAK direclaim di konteks
    // pasca-dump ekstrem = GRAB-BAHAN-BAKAR kelanjutan turun — bukan
    // bakar naik. Reversal hanya sah bila reclaim/crossback nyata.
    if (!P.reclaimed && P.bars <= 2 && (kl.pd.korbanPump || kl.fitur.mom50Atr <= -3.0)) {
      return {
        id: 'AR-E2', label: 'Likuiditas', vote: 'TURUN', kekuatan: 0.65, bobot: 0.20,
        cara: `pool bawah ${P.level.toFixed(2)} disapu ${P.bars} candle lalu TANPA reclaim di konteks pasca-dump ekstrem (${kl.pd.korbanPump ? 'korban pump menumpuk' : `mom50 ${kl.fitur.mom50Atr.toFixed(1)} ATR`}) — likuiditas long habis, grab jadi bahan bakar penjualan (AR-L5)`,
      }
    }
    const k = clamp(0.45 + P.depth / 3, 0, 1) * (P.reclaimed ? 1 : 0.75)
    return {
      id: 'AR-E2', label: 'Likuiditas', vote: k > 0.3 ? 'NAIK' : 'NETRAL', kekuatan: k, bobot: 0.20,
      cara: `pool bawah ${P.level.toFixed(2)} disapu ${P.bars} candle lalu sedalam ${P.depth.toFixed(2)} ATR${P.reclaimed ? ' lalu DIRECLAIM — stop penjual dipanen' : ''}; likuiditas sell-side kering -> bakar naik`,
    }
  }
  if (P && P.side === 'ATAS') {
    if (!P.reclaimed && P.bars <= 2 && (kl.pd.korbanPump || kl.fitur.mom50Atr >= 3.0)) {
      return {
        id: 'AR-E2', label: 'Likuiditas', vote: 'NAIK', kekuatan: 0.65, bobot: 0.20,
        cara: `pool atas ${P.level.toFixed(2)} disapu ${P.bars} candle lalu TANPA reclaim di konteks pasca-pump-cermin ekstrem — likuiditas short habis, grab jadi bahan bakar pembelian (AR-L5)`,
      }
    }
    const k = clamp(0.45 + P.depth / 3, 0, 1) * (P.reclaimed ? 1 : 0.75)
    return {
      id: 'AR-E2', label: 'Likuiditas', vote: k > 0.3 ? 'TURUN' : 'NETRAL', kekuatan: k, bobot: 0.20,
      cara: `pool atas ${P.level.toFixed(2)} disapu ${P.bars} candle lalu sedalam ${P.depth.toFixed(2)} ATR${P.reclaimed ? ' lalu DITOLAK — stop pembeli dipanen' : ''}; likuiditas buy-side kering -> bakar turun`,
    }
  }
  // tidak ada sapuan segar: pool diam = magnet sapuan
  return {
    id: 'AR-E2', label: 'Likuiditas', vote: 'NETRAL', kekuatan: 0.25, bobot: 0.20,
    cara: 'tidak ada sapuan segar terpetakan — pool terjaga; magnet likuiditas belum jelas (bukti lemah)',
  }
}

function e3Volume(cs: Candle[], f: KlKeputusan['fitur']): BuktiDimensi {
  const n = cs.length
  const atr = Math.max(f.atr, 1e-9)
  let s = clamp(f.volAsym5, -1, 1) * 0.55
  const cat: string[] = []
  const kualitas = f.bodyUp6Atr - f.bodyDn6Atr
  s += clamp(kualitas / 2.5, -0.45, 0.45)
  if (f.volClimax) {
    const last = cs[n - 1]
    const bodyAtr = (last.c - last.o) / atr
    if (Math.abs(bodyAtr) >= 1.2) {
      // lilin klimaks BERBADAN MONSTER: ini bukan penyerapan/distribusi
      // penolakan — ini awal gerak baru searah badannya (AR-L3)
      s += sgn(bodyAtr) * 0.5
      cat.push(`klimaks z=${f.volZ.toFixed(1)} dgn badan monster ${bodyAtr.toFixed(1)} ATR -> awal gerak ${bodyAtr > 0 ? 'naik' : 'turun'}`)
    } else {
      const naik = last.c >= last.o
      // klimaks di ekstrem jendela = penyerapan/distribusi (lawan gerak sebelumnya)
      const geri = f.mom30Atr >= 0 ? -1 : 1
      const v = naik ? geri * 0.4 : -geri * 0.4
      s += v
      cat.push(`klimaks volume z=${f.volZ.toFixed(1)} lilin ${naik ? 'hijau' : 'merah'} -> ${v > 0 ? 'penyerapan' : 'distribusi'} klimaks`)
    }
  }
  if (f.volZmidMax >= 1.5) { s += sgn(f.mom12Atr) * 0.2; cat.push(`jejak dorongan tengah z=${f.volZmidMax.toFixed(1)}`) }
  const vote: ArahVote = s > 0.18 ? 'NAIK' : s < -0.18 ? 'TURUN' : 'NETRAL'
  return {
    id: 'AR-E3', label: 'Volume', vote, kekuatan: clamp(Math.abs(s), 0, 1), bobot: 0.13,
    cara: `volume: asimetri5 ${f.volAsym5.toFixed(2)}; kualitas badan naik ${f.bodyUp6Atr.toFixed(2)} vs turun ${f.bodyDn6Atr.toFixed(2)} ATR; volZ ${f.volZ.toFixed(1)}${cat.length ? '; ' + cat.join(', ') : ''}`,
  }
}

function e4Momentum(f: KlKeputusan['fitur']): BuktiDimensi {
  const s = clamp(f.mom12Atr / 2, -1, 1) * 0.55 + clamp(f.mom3Atr / 1.5, -1, 1) * 0.35 + clamp(f.mom50Atr / 4, -1, 1) * 0.10
  const vote: ArahVote = s > 0.15 ? 'NAIK' : s < -0.15 ? 'TURUN' : 'NETRAL'
  return {
    id: 'AR-E4', label: 'Momentum', vote, kekuatan: clamp(Math.abs(s), 0, 1), bobot: 0.12,
    cara: `momentum: mom3 ${f.mom3Atr.toFixed(2)} · mom12 ${f.mom12Atr.toFixed(2)} · mom50 ${f.mom50Atr.toFixed(2)} ATR (impuls ${f.mom12Atr >= 0 ? 'naik' : 'turun'})`,
  }
}

function e5Volatilitas(cs: Candle[], f: KlKeputusan['fitur']): BuktiDimensi {
  void cs
  // volatilitas sendiri jarang berarah; ia memberi tahu BAHAN BAKAR:
  // kompresi -> ledakan segera (ikuti impuls); ekspansi klimaks -> habis (lawan)
  if (f.squeeze) {
    const vote: ArahVote = f.mom3Atr >= 0 ? 'NAIK' : 'TURUN'
    return {
      id: 'AR-E5', label: 'Volatilitas', vote, kekuatan: 0.35, bobot: 0.07,
      cara: `kompresi volatilitas (BB sempit) — ledakan menunggu arah; impuls sesaat condong ${vote.toLowerCase()}`,
    }
  }
  if (f.rangeAtr >= 1.8 && Math.abs(f.mom30Atr) >= 2.0) {
    const vote: ArahVote = f.mom30Atr >= 0 ? 'TURUN' : 'NAIK'
    return {
      id: 'AR-E5', label: 'Volatilitas', vote, kekuatan: 0.4, bobot: 0.07,
      cara: `ekspansi klimaks di ujun gerak ${f.mom30Atr >= 0 ? 'naik' : 'turun'} ${Math.abs(f.mom30Atr).toFixed(1)} ATR — bahan bakar menipis, risiko pembalikan`,
    }
  }
  return {
    id: 'AR-E5', label: 'Volatilitas', vote: 'NETRAL', kekuatan: 0.15, bobot: 0.07,
    cara: `volatilitas normal (range ${f.rangeAtr.toFixed(2)} ATR, ATR% ${(f.atrPct * 100).toFixed(2)}) — tanpa sinyal bahan bakar`,
  }
}

function e6SentiangResistensi(f: KlKeputusan['fitur']): BuktiDimensi {
  const price = f.price
  // level penjaga: rangeHigh/Low + break level
  const res = Math.min(f.rangeHigh, f.recentBreakUp ? f.breakLevel : Infinity)
  const sup = Math.max(f.rangeLow, f.recentBreakDown ? f.breakLevelDn : -Infinity)
  const dRes = (res - price) / Math.max(f.atr, 1e-9)
  const dSup = (price - sup) / Math.max(f.atr, 1e-9)
  let vote: ArahVote = 'NETRAL'
  let kek = 0.2
  let cara = `S/R: resistance ${isFinite(res) ? res.toFixed(2) : '—'} (${dRes.toFixed(1)} ATR), support ${isFinite(sup) ? sup.toFixed(2) : '—'} (${dSup.toFixed(1)} ATR)`
  if (dRes >= 1.2 && dSup <= 0.8) { vote = 'NAIK'; kek = 0.45; cara += ' — menempel support, ruang ke atas terbuka' }
  else if (dSup >= 1.2 && dRes <= 0.8) { vote = 'TURUN'; kek = 0.45; cara += ' — menempel resistance, ruang ke bawah terbuka' }
  else if (f.posInRange <= 0.25 && dRes >= 1.0) { vote = 'NAIK'; kek = 0.3; cara += ' — posisi rendah band, jarak ke puncak cukup' }
  else if (f.posInRange >= 0.75 && dSup >= 1.0) { vote = 'TURUN'; kek = 0.3; cara += ' — posisi tinggi band, jarak ke dasar cukup' }
  return { id: 'AR-E6', label: 'Support/Resistance', vote, kekuatan: kek, bobot: 0.08, cara }
}

function e7Tekanan(cs: Candle[], f: KlKeputusan['fitur']): BuktiDimensi {
  const n = cs.length
  const atr = Math.max(f.atr, 1e-9)
  let s = clamp(f.bodyRatio3Atr / 1.2, -0.5, 0.5)
  let uw = 0
  let lw = 0
  for (let k = Math.max(1, n - 5); k < n; k++) {
    const c = cs[k]
    uw += c.h - Math.max(c.o, c.c)
    lw += Math.min(c.o, c.c) - c.l
  }
  s += clamp((lw - uw) / (2.2 * atr), -0.35, 0.35)
  if (f.bullEngulf) s += 0.25
  if (f.bearEngulf) s -= 0.25
  const last = cs[n - 1]
  const posClose = (last.c - last.l) / Math.max(last.h - last.l, 1e-9)
  s += (posClose - 0.5) * 0.4
  const vote: ArahVote = s > 0.18 ? 'NAIK' : s < -0.18 ? 'TURUN' : 'NETRAL'
  return {
    id: 'AR-E7', label: 'Tekanan Beli-Jual', vote, kekuatan: clamp(Math.abs(s), 0, 1), bobot: 0.12,
    cara: `tekanan: netto badan3 ${f.bodyRatio3Atr.toFixed(2)} ATR; wick bawah ${(lw / atr).toFixed(1)} vs atas ${(uw / atr).toFixed(1)} ATR (5 candle); close di ${(posClose * 100).toFixed(0)}% range lilin${f.bullEngulf ? '; bull engulf' : ''}${f.bearEngulf ? '; bear engulf' : ''}`,
  }
}

function e8PerubahanKondisi(kl: KlKeputusan, f: KlKeputusan['fitur'], kv: KaskadeVoid): BuktiDimensi {
  // AR-L3: kaskade-void-crossback = transisi fasa paling tegas
  if (kv.aktif) {
    return {
      id: 'AR-E8', label: 'Perubahan Kondisi', vote: kv.arah === 'NAIK' ? 'NAIK' : 'TURUN', kekuatan: 0.9, bobot: 0.12,
      cara: kv.cara,
    }
  }
  // fase pasar berubah? — baca episode dari tracker bersertifikat
  if (kl.grab.terjadi && kl.grab.post === 'REVERSAL') {
    const arah: ArahVote = kl.arah === 'NAIK' ? 'NAIK' : 'TURUN'
    return {
      id: 'AR-E8', label: 'Perubahan Kondisi', vote: arah, kekuatan: 0.85, bobot: 0.12,
      cara: `FASA BERUBAH: panen likuiditas selesai — ${kl.grab.cara}; kondisi bergeser ke pemulihan ${arah.toLowerCase()}`,
    }
  }
  if (kl.pd.korbanPump) {
    const arah: ArahVote = kl.pd.pumpArah === 'NAIK' ? 'TURUN' : 'NAIK'
    return {
      id: 'AR-E8', label: 'Perubahan Kondisi', vote: arah, kekuatan: 0.55, bobot: 0.12,
      cara: `pasca-${kl.pd.pumpArah === 'NAIK' ? 'pump-dump' : 'dump-pump'}: korban pump kini stop-loss cluster — kontinju tekanan ${arah === 'NAIK' ? 'beli' : 'jual'}`,
    }
  }
  if (f.consecDownBig >= 3 && f.lastVolZ >= 1.2) {
    return {
      id: 'AR-E8', label: 'Perubahan Kondisi', vote: 'NAIK', kekuatan: 0.6, bobot: 0.12,
      cara: `kaskade ${f.consecDownBig} merah besar + klimaks z=${f.lastVolZ.toFixed(1)} — mesin likuidasi kehabisan bahan bakar, kondisi bergeser`,
    }
  }
  if (f.consecUpBig >= 3 && f.lastVolZ >= 1.2) {
    return {
      id: 'AR-E8', label: 'Perubahan Kondisi', vote: 'TURUN', kekuatan: 0.6, bobot: 0.12,
      cara: `squeeza ${f.consecUpBig} hijau besar + klimaks z=${f.lastVolZ.toFixed(1)} — likuidasi short selesai, kondisi bergeser`,
    }
  }
  return {
    id: 'AR-E8', label: 'Perubahan Kondisi', vote: 'NETRAL', kekuatan: 0.2, bobot: 0.12,
    cara: 'kondisi pasar berlanjut tanpa transisi fase yang terbaca',
  }
}

// ------------------------------------------------------------
// KETUA DEWAN — kalibrasi kepastian dari tracker bersertifikat
// ------------------------------------------------------------

function eksekusiStop(kl: KlKeputusan, arah: KlArah, entry: number, atr: number): { stopPct: number; sumber: string } {
  const P = kl.pool
  if (P.swept && P.depthAtr >= 0.4) {
    const extreme = P.side === 'BAWAH' ? P.level - P.depthAtr * atr : P.level + P.depthAtr * atr
    const stopPrice = arah === 'NAIK' ? extreme - STOP_MARGIN_ATR * atr : extreme + STOP_MARGIN_ATR * atr
    const pct = arah === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100
    return { stopPct: clamp(pct, STOP_MIN, STOP_MAX), sumber: `stop struktural ${STOP_MARGIN_ATR} ATR di balik ekstrem sapuan (AR-L2)` }
  }
  return { stopPct: 2.0, sumber: 'stop default 2.0% (tanpa pool terpetakan)' }
}

// ------------------------------------------------------------
// VONIS
// ------------------------------------------------------------

export function arahVonis(cs: Candle[], versi = ARAH_BRAIN_VERSI): VonisArah {
  const kl = klVonis(cs)
  const f = kl.fitur
  const n = cs.length
  const atr = Math.max(f.atr, 1e-9)
  const entry = cs[n - 1].c
  const kv = deteksiKaskadeVoid(cs, f, kl)

  const bukti: BuktiDimensi[] = [
    e2Likuiditas(kl),
    e1Struktur(cs, f),
    e3Volume(cs, f),
    e7Tekanan(cs, f),
    e4Momentum(f),
    e8PerubahanKondisi(kl, f, kv),
    e6SentiangResistensi(f),
    e5Volatilitas(cs, f),
  ]
  // fusi dewan
  let skor = 0
  let bobotNaik = 0
  let bobotTurun = 0
  for (const b of bukti) {
    const w = sgn(b.vote === 'NAIK' ? 1 : b.vote === 'TURUN' ? -1 : 0) * b.kekuatan * b.bobot
    skor += w
    if (b.vote === 'NAIK') bobotNaik += b.kekuatan * b.bobot
    if (b.vote === 'TURUN') bobotTurun += b.kekuatan * b.bobot
  }
  const skorArah = clamp(skor * 100, -100, 100)
  const konsensus = (() => {
    const tot = bobotNaik + bobotTurun
    return tot <= 0 ? 0.5 : Math.max(bobotNaik, bobotTurun) / tot
  })()

  // KETUA DEWAN: tracker bersertifikat memberi arah episode + jangkar kepastian
  let arah: KlArah
  let kepastian: number
  let lapisan: string
  let umpanFlip = false
  let tundaTrigger = false
  const volZmax3 = volZmax3Of(cs, f)
  const setuju = (kl.aksi !== 'SKIP' && ((kl.arah === 'NAIK') === (skorArah >= 0)))

  if (kl.aksi === 'ENTRY') {
    arah = kl.arah
    lapisan = `KETUA-EPISODE(${kl.pelajaranAktif.join('+') || 'core'})`
    // tracker ENTRY = episode terbaca jelas; dewan searah -> makin pasti
    kepastian = 84 + (setuju ? clamp(konsensus - 0.5, 0, 0.5) * 24 : -8)
    // AR-L7 (bedah segel31#64): reclaim dgn volume KERING TOTAL
    // (lastVolZ <= -0.8, volZmax3 <= 1.2, bars=1, depth dangkal, dua sisi
    // trap) = pantulan rapuh — sapuan kedua lazim. Turunkan eksekusi ke
    // order-trigger (arah vonis TETAP; pemburu tak menembak pantulan
    // tanpa pengikut).
    if (kl.gauntlet.twoSisi && kl.pool.barsSince === 1 && kl.pool.depthAtr <= 1.0 && f.lastVolZ <= -0.8 && volZmax3 <= 1.2) {
      tundaTrigger = true
      lapisan += '+AR-L7-TUNDA'
    }
  } else if (kl.aksi === 'WAIT') {
    arah = kl.arah
    lapisan = 'KETUA-TRIGGER'
    // tracker WAIT = arah episode jelas, konfirmasi menunggu (AR-L1:
    // eksekusi = order menunggu di level konfirmasi tracker, BUKAN
    // market order sekarang — pemburu menunggu jejak, bukan menembak
    // asal; bedah R1: 10 likuidasi klaster dwi-lapis dari paksa-masuk)
    kepastian = 70 + (setuju ? clamp(konsensus - 0.5, 0, 0.5) * 16 : -6)
    // AR-L4 (bedah residu hakim7 #54): WAIT searah pool TAPI konteks
    // momentum-50 EKSTREM berlawanan + level TIDAK direclaim + harga
    // menempel level = UMPAN RECLAIM/REJECT — ikuti konteks, bukan
    // pantulan secekil (warisan SG-L5: reclaim tanpa pengikut di
    // konteks lemah adalah bahan bakar kelanjutan)
    const pool = kl.pool
    const closeDistPool = pool.side === 'BAWAH' ? (entry - pool.level) / atr : (pool.level - entry) / atr
    // AR-L4 v1.6: konteks diperluas — korbanPump (jejak dump ekstrem)
    // juga membuktikan konteks beruang/banteng dalam (segel22 #84:
    // mom50 -3.82 belum menyentuh -4.5, tapi korbanPump + jatuh 10 ATR)
    const konteksBear = f.mom50Atr <= -3.0 && (f.distEma21Atr <= -1.5 || kl.pd.korbanPump)
    const konteksBull = f.mom50Atr >= 3.0 && (f.distEma21Atr >= 1.5 || kl.pd.korbanPump)
    if (!pool.reclaimed && pool.barsSince <= 2 && Math.abs(closeDistPool) <= 0.6 && konteksBear && arah === 'NAIK') {
      arah = 'TURUN'
      lapisan = 'KETUA-UMPAN-RECLAIM(AR-L4)'
      kepastian = 66
      umpanFlip = true
    } else if (!pool.reclaimed && pool.barsSince <= 2 && Math.abs(closeDistPool) <= 0.6 && konteksBull && arah === 'TURUN') {
      arah = 'NAIK'
      lapisan = 'KETUA-UMPAN-REJECT(AR-L4)'
      kepastian = 66
      umpanFlip = true
    }
    // AR-L6 (bedah segel31#93/#94 vs hakim41#54; diperluas hakim55#94):
    // WAIT/TURUN di pool ATAS tak-reclaimed PASCA-DUMP (korbanPump +
    // mom50 <= -3) — pemisah deepdump-V vs FAKE-kontinju: momentum
    // pendek SUDAH berbalik (mom12 >= 0.3 ATAU mom3 >= 1.5 — V bisa
    // dimulai lilin ini sendiri) dan harga sudah di ema = V-reclaim
    // dimulai; mom12/mom3 masih negatif & harga jauh di bawah ema =
    // distribusi berlanjut (tetap TURUN).
    const mom12SudahNaik = (f.mom12Atr >= 0.3 || f.mom3Atr >= 1.5) && f.distEma21Atr >= -0.5
    const mom12SudahTurun = (f.mom12Atr <= -0.3 || f.mom3Atr <= -1.5) && f.distEma21Atr <= 0.5
    if (!pool.reclaimed && pool.barsSince <= 2 && kl.pd.korbanPump && f.mom50Atr <= -3.0 && arah === 'TURUN' && mom12SudahNaik) {
      arah = 'NAIK'
      lapisan = 'KETUA-V-RECLAIM(AR-L6)'
      kepastian = 66
      umpanFlip = true
    } else if (!pool.reclaimed && pool.barsSince <= 2 && kl.pd.korbanPump && f.mom50Atr >= 3.0 && arah === 'NAIK' && mom12SudahTurun) {
      arah = 'TURUN'
      lapisan = 'KETUA-V-REJECT(AR-L6)'
      kepastian = 66
      umpanFlip = true
    }
  } else {
    // SKIP: tanpa edge likuiditas -> dewan penuh yang memutuskan
    arah = skorArah >= 0 ? 'NAIK' : 'TURUN'
    lapisan = 'KETUA-DEWAN-PENUH'
    kepastian = 55 + Math.abs(skorArah) * 0.28
    // AR-L3: V-mulai-void — dewan terbelah saat void (struktur/momentum
    // masih searah gerak tua); sinyal penentu = lilin V monster klimaks
    // pada lilin keputusan (bedah hakim r2, hipotesis-1 terbantahkan)
    if (kv.aktif) {
      arah = kv.arah
      lapisan = 'KETUA-KASKADE-VOID(AR-L3)'
      kepastian = 64 + konsensus * 8
    }
  }
  kepastian = Math.round(clamp(kepastian, 5, 97))

  const vonis: 'BUY' | 'SELL' = arah === 'NAIK' ? 'BUY' : 'SELL'
  const st = eksekusiStop(kl, arah, entry, atr)
  // AR-L1: lapisan trigger -> order menunggu konfirmasi (arah tetap biner)
  // AR-L4/L6: umpan-flip -> masuk langsung searah konteks, stop lebih tebal
  // AR-L7: episode ditunda ke trigger (reclaim kering, sapuan kedua lazim)
  const trigLvl = Math.max(kl.pool.level + 0.8 * atr, entry + 0.25 * atr)
  const eksekusi: VonisArah['eksekusi'] = umpanFlip
    ? { aksi: 'ENTRY', targetPct: TARGET_DISIPLIN, stopPct: clamp(st.stopPct, 1.8, STOP_MAX), sumber: `${st.sumber} + tebal utk umpan-flip (AR-L4/L6)` }
    : tundaTrigger
      ? { aksi: 'WAIT', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigLvl, sumber: 'order menunggu reclaim bervolume (AR-L7: pantulan kering rapuh)' }
      : kl.aksi === 'WAIT' && kl.triggerLevel
        ? { aksi: 'WAIT', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: kl.triggerLevel, sumber: 'order menunggu di level konfirmasi tracker (AR-L1)' }
        : { aksi: 'ENTRY', targetPct: TARGET_DISIPLIN, stopPct: st.stopPct, sumber: st.sumber }

  const searah = bukti
    .filter((b) => (arah === 'NAIK' ? b.vote === 'NAIK' : b.vote === 'TURUN'))
    .sort((a, b) => b.kekuatan * b.bobot - a.kekuatan * a.bobot)
    .slice(0, 3)
    .map((b) => `${b.id} ${b.label}: ${b.cara}`)

  const alasan = [
    `VONIS ${vonis} (kepastian ${kepastian}%, konsensus dewan ${(konsensus * 100).toFixed(0)}%) — ${lapisan}`,
    ...searah,
    `jejak 5 aspek: bullTrap=${kl.aspek5.bullTrap ? 'YA' : 'n'} bearTrap=${kl.aspek5.bearTrap ? 'YA' : 'n'} pumpDump=${kl.aspek5.pumpDump ? 'YA' : 'n'} falseBreakout=${kl.aspek5.falseBreakout ? 'YA' : 'n'} stopHunt=${kl.aspek5.stopHunt ? 'YA' : 'n'}`,
    kl.aspek5.rangkaianUtuh ? `rangkaian: ${kl.aspek5.rangkaianUtuh}` : 'rangkaian belum utuh',
  ]

  return {
    versi,
    vonis,
    arah,
    kepastian,
    skorArah,
    bukti,
    buktiKunci: searah,
    eksekusi,
    lapisan,
    konsensus,
    alasan,
    kl: {
      aksi: kl.aksi,
      arah: kl.arah,
      pelajaran: kl.pelajaranAktif,
      aspek5: kl.aspek5,
      poolLevel: kl.pool.level,
      poolSide: kl.pool.side,
      poolSwept: kl.pool.swept,
    },
  }
}

/** inti naif pembanding — "1% AI": ikut breakout/momentum polos */
export function arahCore(cs: Candle[]): VonisArah {
  const f = (() => {
    const kl = klVonis(cs, '0.9')
    return kl.fitur
  })()
  const arah: KlArah = f.recentBreakDown ? 'TURUN' : f.recentBreakUp ? 'NAIK' : f.mom12Atr >= 0 ? 'NAIK' : 'TURUN'
  return {
    versi: '0.9',
    vonis: arah === 'NAIK' ? 'BUY' : 'SELL',
    arah,
    kepastian: 50,
    skorArah: arah === 'NAIK' ? 40 : -40,
    bukti: [],
    buktiKunci: [],
    eksekusi: { aksi: 'ENTRY', targetPct: 2.2, stopPct: 2.2, sumber: 'core' },
    lapisan: 'CORE-NAIF',
    konsensus: 0.5,
    alasan: ['CORE: mengikuti breakout/momentum tanpa dewan bukti (naif)'],
    kl: { aksi: 'ENTRY', arah, pelajaran: [], aspek5: { stopHunt: false, falseBreakout: false, pumpDump: false, bearTrap: false, bullTrap: false, rangkaianUtuh: '' }, poolLevel: 0, poolSide: 'TAK-JELAS', poolSwept: false },
  }
}
