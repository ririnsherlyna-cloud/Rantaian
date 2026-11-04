// ============================================================
// MICAPROFITA SAKTI-GABUNGAN — otak UJIAN GABUNGAN 4 ASPEK.
//
// Menerima HANYA candle visible (point-in-time), memetakan
// likuiditas (warisan SG v2.9.4: pivot + touch-zone), lalu
// LAPIS KOREKSI EPISODE (v1.1, dari bedah ronde-1):
//   · lilin sapu SEJATI = lilin volume MAKSIMUM dalam episode
//     (kilatan derau tidak lagi menggeser anatomi)
//   · lilin yang MENGAMBIL DUA SISI zona ditetapkan sisinya
//     dari posisi close (bukti reclaim > ambiguity)
//   · pemilihan pool aktif milik sendiri (kedalaman <= 3.4
//     ATR, episode <= 10 candle — pool hantu episode panjang
//     tidak bisa mencuri 'active')
// lalu memilih: ENTRY (arah + target + STOP WAJIB) / WAIT
// (trigger reclaim miliknya) / SKIP.
//
// LAPISAN PELAJARAN:
//  - CG-L1 kaskade-gauntlet  · CG-L2 reclaim/reject dominan
//  - CG-L3 umpan reclaim-gagal (mikro) · CG-L4 vakum/gagal-bounce
//  - CG-L5 sapuan dwi-lapis (WAIT disiplin) · CG-L6 skip-disiplin
//  - warisan SG-L1/L2/L3/L4/L5/L7/L8/L9 (stophunt v2.9.4)
// ============================================================

import type { Candle } from './generator'
import { mean, stdev } from './indicators'
import { buildSgVision, type SgVision, type SgPool } from './stophunt-brain'
import type { CgPlan, CgArah } from './composite-forge'

export const CG_BRAIN_VERSI = '1.6'

const TARGET_DISIPLIN = 2.2
const STOP_MIN = 1.2
const STOP_MAX = 2.6
const STOP_WAIT = 1.8

// ------------------------------------------------------------
// LAPIS KOREKSI EPISODE — anatomi sapuan sejati
// ------------------------------------------------------------

export interface CgPool extends SgPool {
  idxSweep: number // lilin volume-maksimum dalam episode (sapuan sejati)
  episodeLen: number
}

function koreksiPools(cs: Candle[], v: SgVision): CgPool[] {
  const n = cs.length
  const atr = Math.max(v.atr, 1e-9)
  const vols = cs.map((c) => c.v)
  const volSd = Math.max(stdev(vols.slice(Math.max(0, n - 30))), 1e-9)
  const winStart = Math.max(0, n - 22)
  const out: CgPool[] = []
  for (const p of v.pools) {
    if (!p.swept) {
      out.push({ ...p, idxSweep: -1, episodeLen: 0 })
      continue
    }
    const margin = 0.12 * atr
    // SISI POOL = sisi likuiditas dari anatomi pembentukan (raw).
    // Zona dwi-arah yang TIE (satu lilin menusuk dua sisi) diputuskan
    // ekskursi terdalam lilin penusuk terakhir (bukti bedah r3: pool
    // hantu climb-through tidak boleh dibalik jadi 'reclaimed BAWAH').
    let side = p.side
    if (p.dariZona) {
      let lastUp = -1
      let lastDn = -1
      for (let i = n - 1; i >= Math.max(0, n - 14); i--) {
        if (lastUp < 0 && cs[i].h > p.level + margin) lastUp = i
        if (lastDn < 0 && cs[i].l < p.level - margin) lastDn = i
        if (lastUp >= 0 && lastDn >= 0) break
      }
      if (lastUp >= 0 && lastDn >= 0 && lastUp !== lastDn) side = lastUp > lastDn ? 'ATAS' : 'BAWAH'
      else if (lastUp >= 0 && lastUp === lastDn) {
        const c = cs[lastUp]
        side = (p.level - c.l) >= (c.h - p.level) ? 'BAWAH' : 'ATAS'
      }
    }
    // EPISODE diturunkan dari PIERCE TERAKHIR dgn sisi final (bukan
    // barsSince mentah — pool hantu tidak boleh mencuri volume spike
    // pool sejati)
    let lastPierce = -1
    for (let i = n - 1; i >= winStart; i--) {
      const pierce = side === 'BAWAH' ? cs[i].l < p.level - margin : cs[i].h > p.level + margin
      if (pierce) { lastPierce = i; break }
    }
    if (lastPierce < 0) {
      out.push({ ...p, idxSweep: -1, episodeLen: 0, barsSince: 99, volZSweep: 0, volRatioSweep: 0 })
      continue
    }
    let a = lastPierce
    while (a - 1 >= winStart) {
      const prev = cs[a - 1]
      const pierce = side === 'BAWAH' ? prev.l < p.level - margin : prev.h > p.level + margin
      const beyond = side === 'BAWAH' ? prev.c < p.level - margin : prev.c > p.level + margin
      if (pierce || beyond) a--
      else break
    }
    const run = cs.slice(a, lastPierce + 1)
    let best = a
    let vmax = -1
    for (let i = 0; i < run.length; i++) {
      if (run[i].v > vmax) { vmax = run[i].v; best = a + i }
    }
    const idxSweep = best
    const sw = cs[idxSweep]
    const episode = cs.slice(a)
    const extreme = side === 'BAWAH' ? Math.min(...episode.map((c) => c.l)) : Math.max(...episode.map((c) => c.h))
    const depthAtr = side === 'BAWAH' ? (p.level - extreme) / atr : (extreme - p.level) / atr
    const lastClose = cs[n - 1].c
    const closeDistAtr = side === 'BAWAH' ? (lastClose - p.level) / atr : (p.level - lastClose) / atr
    const post = cs.slice(idxSweep + 1)
    const postBounceMaxBodyAtr = post.length ? Math.max(...post.map((c) => Math.abs(c.c - c.o))) / atr : 0
    const postVolMean = post.length ? mean(post.map((c) => c.v)) : 0
    const prevClose = n >= 2 ? cs[n - 2].c : lastClose
    const crossBack =
      side === 'ATAS'
        ? prevClose > p.level && lastClose < p.level && closeDistAtr >= 0.2
        : prevClose < p.level && lastClose > p.level && closeDistAtr >= 0.2
    out.push({
      ...p,
      side,
      idxSweep,
      episodeLen: episode.length,
      depthAtr,
      closeDistAtr,
      reclaimed: closeDistAtr >= 0.12,
      barsSince: n - 1 - lastPierce,
      volZSweep: (vmax - v.volMean) / volSd,
      volRatioSweep: vmax / Math.max(mean(cs.slice(Math.max(0, idxSweep - 12), idxSweep).map((c) => c.v)), 1e-9),
      sweepBodyAtr: Math.abs(sw.c - sw.o) / atr,
      postBounceMaxBodyAtr,
      postVolMean,
      crossBack,
    })
  }
  return out
}

function rankOf(p: CgPool): number {
  if (p.crossBack) return 0
  if (p.barsSince <= 1 && p.reclaimed && Math.abs(p.closeDistAtr) >= 0.5) return 0
  if (p.barsSince <= 4) return 1
  if (p.barsSince <= 8) return 2
  return 3
}

function pilihAktif(cs: Candle[], pools: CgPool[], atr: number): CgPool | null {
  const n = cs.length
  const recentExtremeLo = Math.min(...cs.slice(Math.max(0, n - 8)).map((c) => c.l))
  const recentExtremeHi = Math.max(...cs.slice(Math.max(0, n - 8)).map((c) => c.h))
  const valid = pools.filter((p) =>
    p.swept &&
    (p.depthAtr >= 0.4 || (p.depthAtr >= 0.3 && Math.abs(p.closeDistAtr) >= 0.5 && p.volZSweep >= 2)) &&
    p.depthAtr <= 3.4 &&
    p.episodeLen > 0 && p.episodeLen <= 8 && // sapuan = serangan terbatas, bukan jalan-lambat menembus level
    p.barsSince <= 10 &&
    (p.dariZona || p.sentuhan >= 1) &&
    (p.volZSweep >= 0.5 || p.volRatioSweep >= 1.15))
  valid.sort((a, b) => {
    const ra = rankOf(a)
    const rb = rankOf(b)
    if (ra !== rb) return ra - rb
    const da = Math.abs(a.level - (a.side === 'BAWAH' ? recentExtremeLo : recentExtremeHi))
    const db = Math.abs(b.level - (b.side === 'BAWAH' ? recentExtremeLo : recentExtremeHi))
    if (da !== db) return da - db
    return a.barsSince - b.barsSince
  })
  return valid[0] ?? null
}

// ------------------------------------------------------------
// JEJAK GAUNTLET — pemindaian trap bebas-umur (point-in-time)
// ------------------------------------------------------------

export interface GauntletScan {
  bullTrap: boolean
  bearTrap: boolean
  twoSisi: boolean
  cara: string
  deceitCount: number
  deceitCara: string
}

function trapScan(cs: Candle[], v: SgVision): GauntletScan {
  const n = cs.length
  const atr = Math.max(v.atr, 1e-9)
  const win = cs.slice(Math.max(0, n - 30))
  let bullTrap = false
  let bearTrap = false
  const catatan: string[] = []
  for (const p of v.pools) {
    const margin = 0.15 * atr
    if (p.side === 'ATAS') {
      let pierce = -1
      for (let i = 0; i < win.length - 1; i++) {
        if (win[i].h > p.level + margin) { pierce = i; break }
      }
      if (pierce >= 0) {
        for (let j = pierce + 1; j < win.length; j++) {
          if (win[j].c < p.level - 0.1 * atr) {
            bullTrap = true
            catatan.push(`bull trap: tembus ${p.level.toFixed(2)} (pool ${p.jenis}) lalu ditutup balik di bawahnya`)
            break
          }
        }
      }
    } else {
      let pierce = -1
      for (let i = 0; i < win.length - 1; i++) {
        if (win[i].l < p.level - margin) { pierce = i; break }
      }
      if (pierce >= 0) {
        for (let j = pierce + 1; j < win.length; j++) {
          if (win[j].c > p.level + 0.1 * atr) {
            bearTrap = true
            catatan.push(`bear trap: tembus ${p.level.toFixed(2)} (pool ${p.jenis}) lalu dipulihkan ke atasnya`)
            break
          }
        }
      }
    }
  }
  let deceitCount = 0
  const dWin = cs.slice(Math.max(0, n - 34))
  for (let i = 1; i < dWin.length; i++) {
    const c = dWin[i]
    const range = Math.max(c.h - c.l, 1e-9)
    const body = Math.abs(c.c - c.o)
    const uw = c.h - Math.max(c.o, c.c)
    const lw = Math.min(c.o, c.c) - c.l
    if (range >= 0.5 * atr && body <= 0.18 * atr) deceitCount++
    else if (uw >= 0.5 * atr && uw >= 2.2 * body) deceitCount++
    else if (lw >= 0.5 * atr && lw >= 2.2 * body) deceitCount++
    const p = dWin[i - 1]
    const pBody = Math.abs(p.c - p.o)
    const engulf = body >= 0.7 * atr && body >= pBody * 1.1 &&
      ((c.c > c.o && p.c < p.o && c.o <= p.c && c.c >= p.o) || (c.c < c.o && p.c > p.o && c.o >= p.c && c.c <= p.o))
    if (engulf) deceitCount++
  }
  return {
    bullTrap, bearTrap, twoSisi: bullTrap && bearTrap,
    cara: catatan.slice(0, 2).join(' | ') || 'tidak ada jejak trap terpetakan',
    deceitCount,
    deceitCara: deceitCount >= 2
      ? `${deceitCount} lilin menipu terbaca (doji purba / pin salah arah / engulf ekstrem) — sinyal candle tidak ditelan mentah`
      : `${deceitCount} lilin menipu terbaca`,
  }
}

// ------------------------------------------------------------
// KEPUTUSAN
// ------------------------------------------------------------

export interface CgKeputusan extends CgPlan {
  versi: string
  score: number
  pool: {
    jenis: string
    side: 'BAWAH' | 'ATAS' | 'TAK-JELAS'
    level: number
    sentuhan: number
    swept: boolean
    reclaimed: boolean
    depthAtr: number
    barsSince: number
  }
  grab: { terjadi: boolean; post: 'REVERSAL' | 'CONTINUATION' | 'BELUM-JELAS'; cara: string }
  gauntlet: GauntletScan
  pelajaranAktif: string[]
  alasan: string[]
  fitur: SgVision
}

function stopStruktural(arah: CgArah, entry: number, P: CgPool, atr: number): number {
  const extreme = P.side === 'BAWAH' ? P.level - P.depthAtr * atr : P.level + P.depthAtr * atr
  const stopPrice = arah === 'NAIK' ? extreme - 0.45 * atr : extreme + 0.45 * atr
  const pct = arah === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100
  return Math.min(STOP_MAX, Math.max(STOP_MIN, pct))
}

function mk(versi: string, p: CgPlan, rest: Omit<CgKeputusan, keyof CgPlan | 'versi' | 'score'>, score: number): CgKeputusan {
  return { versi, score, ...p, ...rest }
}

function poolRec(P: CgPool | null): CgKeputusan['pool'] {
  if (!P) return { jenis: 'tak-jelas', side: 'TAK-JELAS', level: 0, sentuhan: 0, swept: false, reclaimed: false, depthAtr: 0, barsSince: -1 }
  return { jenis: P.jenis, side: P.side, level: P.level, sentuhan: P.sentuhan, swept: P.swept, reclaimed: P.reclaimed, depthAtr: P.depthAtr, barsSince: P.barsSince }
}

/** inti naif — artefak "1% AI" (mengejar breakout/breakdown) */
export function cgCore(cs: Candle[], fitur: SgVision): CgKeputusan {
  const alasan: string[] = []
  let arah: CgArah
  if (fitur.recentBreakDown) {
    arah = 'TURUN'
    alasan.push(`CORE: breakdown terdeteksi (level ${fitur.breakLevelDn.toFixed(2)}) -> ikut menjual (naif)`)
  } else if (fitur.recentBreakUp) {
    arah = 'NAIK'
    alasan.push(`CORE: breakout terdeteksi (level ${fitur.breakLevel.toFixed(2)}) -> ikut membeli (naif)`)
  } else {
    arah = fitur.mom12Atr >= 0 ? 'NAIK' : 'TURUN'
    alasan.push(`CORE: momentum ${fitur.mom12Atr.toFixed(1)} ATR -> ikut arah (naif)`)
  }
  const g = trapScan(cs, fitur)
  return mk('0.9', { aksi: 'ENTRY', arah, targetPct: TARGET_DISIPLIN, stopPct: 2.2 }, {
    pool: poolRec(null),
    grab: { terjadi: false, post: 'BELUM-JELAS', cara: 'CORE tidak memetakan likuiditas' },
    gauntlet: g, pelajaranAktif: [], alasan, fitur,
  }, 0)
}

export function cgVonis(cs: Candle[], versi = CG_BRAIN_VERSI): CgKeputusan {
  const fitur = buildSgVision(cs)
  if (versi.startsWith('0')) return cgCore(cs, fitur)
  const n = cs.length
  const atr = Math.max(fitur.atr, 1e-9)
  const entry = cs[n - 1].c
  const g = trapScan(cs, fitur)
  const lastC = cs[n - 1].c
  const prevC = cs[n - 2].c

  const pools = koreksiPools(cs, fitur)
  const P = pilihAktif(cs, pools, atr)

  if (!P) {
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      pool: poolRec(null),
      grab: { terjadi: false, post: 'BELUM-JELAS', cara: 'tidak ada sapuan teridentifikasi' },
      gauntlet: g,
      pelajaranAktif: ['CG-L6', 'SG-L8'],
      alasan: ['CG-L6 SKIP-DISIPLIN: tidak ada pool likuiditas yang baru disapu (episode segar + volume nyata) -> tanpa edge likuiditas, gauntlet 4 aspek tidak dimainkan'],
      fitur,
    }, 0)
  }

  const cara = `pool ${P.jenis} (${P.side.toLowerCase()}, ${P.sentuhan} sentuhan, level ${P.level.toFixed(2)}) disapu ${P.barsSince} candle lalu sedalam ${P.depthAtr.toFixed(2)} ATR; volZ sapu ${P.volZSweep.toFixed(1)}; close kini ${P.closeDistAtr >= 0 ? '+' : ''}${P.closeDistAtr.toFixed(2)} ATR dari level -> ${P.reclaimed ? 'RECLAIMED' : 'BELUM reclaim'}; gauntlet: bullTrap=${g.bullTrap ? 'YA' : 'tidak'}, bearTrap=${g.bearTrap ? 'YA' : 'tidak'}, ${g.deceitCara}`
  const poolR = poolRec(P)
  const pengikut = P.barsSince >= 1 && P.postVolMean >= fitur.volMean * 0.85
  const kering = P.barsSince >= 1 && P.postVolMean < fitur.volMean * 0.6
  const sweepBody = P.barsSince <= 1 ? P.sweepBodyAtr : 0
  const bodyDominan = Math.max(P.postBounceMaxBodyAtr, sweepBody)
  const lastClosePos = (c: Candle): number => (c.h - c.l) > 0 ? (c.c - c.l) / (c.h - c.l) : 0.5

  if (P.side === 'BAWAH') {
    // ===== CG-L1: KASKADE-LIKUIDASI (V-reversal) =====
    if (fitur.consecDownBig >= 3 && fitur.lastVolZ >= 1.5 && P.depthAtr >= 0.8 && (P.crossBack || P.reclaimed)) {
      const stop = stopStruktural('NAIK', entry, P, atr)
      return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
        pool: poolR,
        grab: { terjadi: true, post: 'REVERSAL', cara },
        gauntlet: g,
        pelajaranAktif: ['CG-L1', 'SG-L9', 'SG-L1', 'SG-L2'],
        alasan: [`CG-L1 KASKADE-GAUNTLET: ${fitur.consecutiveDown} merah berturut + klimaks (z=${fitur.lastVolZ.toFixed(1)}) menyapu pool rantai sedalam ${P.depthAtr.toFixed(1)} ATR lalu ${P.crossBack ? 'cross-back' : 'reclaim'} — mesin likuidasi kehabisan bahan bakar; jejak bull trap=${g.bullTrap ? 'ada' : '-'}/bear trap=${g.bearTrap ? 'ada' : '-'} = gauntlet penuh -> ENTRY NAIK, stop struktural ${stop.toFixed(2)}% di bawah ekstrem sapuan`],
        fitur,
      }, 3)
    }
    // ===== CG-L4a: VAKUM TREN (sapuan tanpa reclaim + tren kuat) =====
    if (!P.reclaimed && P.closeDistAtr >= -2.6 && P.closeDistAtr <= 0.06 && P.barsSince <= 2 && fitur.mom50Atr >= 0.8 && P.depthAtr <= 2.8 && P.postBounceMaxBodyAtr <= 0.5) {
      return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('NAIK', entry, P, atr) }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pelajaranAktif: ['CG-L4', 'SG-L6', 'SG-L1', 'SG-L2'],
        alasan: [`CG-L4 VAKUM-GAUNTLET: sapuan di bawah pool rantai TANPA reclaim (tutup ${P.closeDistAtr.toFixed(2)} ATR, badan lanjut ${P.postBounceMaxBodyAtr.toFixed(2)} ATR) TAPI konteks tren naik (mom50 ${fitur.mom50Atr.toFixed(1)} ATR) tanpa panik — vakum likuiditas, bahan bakar markup; jejak dua trap = distribusi selesai -> ENTRY NAIK, stop di bawah ekstrem sapuan`],
        fitur,
      }, 3)
    }
    // ===== CG-L2: RECLAIM DOMINAN (reversal sah) =====
    if (P.reclaimed && P.closeDistAtr >= 0.3 && P.closeDistAtr <= 2.2 && bodyDominan >= 0.55 && P.barsSince <= 2 && (P.barsSince === 0 || pengikut) && P.volZSweep >= 0.5) {
      const stop = stopStruktural('NAIK', entry, P, atr)
      return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
        pool: poolR,
        grab: { terjadi: true, post: 'REVERSAL', cara },
        gauntlet: g,
        pelajaranAktif: ['CG-L2', 'SG-L3', 'SG-L1', 'SG-L2'],
        alasan: [`CG-L2 RECLAIM-DOMINAN: sapuan pool rantai ditutup balik +${P.closeDistAtr.toFixed(2)} ATR DI ATAS level dgn badan dominan ${bodyDominan.toFixed(2)} ATR (vol sapu z=${P.volZSweep.toFixed(1)}${pengikut ? ', reclaim berpengikut' : ''}) — stop long & short dipanen, trap terjebak; ${g.cara} -> ENTRY NAIK, stop struktural ${stop.toFixed(2)}%`],
        fitur,
      }, 3)
    }
    // ===== CG-L3: UMPAN RECLAIM-GAGAL (mikro + kering) =====
    if (P.closeDistAtr >= -0.6 && P.closeDistAtr <= 0.45 && P.postBounceMaxBodyAtr <= 0.4 && lastC <= prevC && P.postVolMean <= fitur.volMean * 0.8 && P.depthAtr <= 2.6 && P.barsSince <= 3) {
      const stop = stopStruktural('TURUN', entry, P, atr)
      return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pelajaranAktif: ['CG-L3', 'SG-L5', 'SG-L1', 'SG-L2'],
        alasan: [`CG-L3 UMPAN-RECLAIM: reclaim secekil TAPI gagal extend — tutup hanya ${P.closeDistAtr.toFixed(2)} ATR dari level, badan pasca-sapu ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, LH mikro (close terakhir turun), volume kering ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)} — umpan terakhir setelah bull trap & bear trap -> grab jadi bahan bakar penjualan -> ENTRY TURUN, stop ${stop.toFixed(2)}% di atas pantulan gagal`],
        fitur,
      }, 3)
    }
    // ===== CG-L4b: GRAB BAHAN BAKAR (tanpa reclaim + tren turun) =====
    if (!P.reclaimed && P.closeDistAtr <= -0.05 && P.barsSince <= 3 && fitur.mom50Atr <= -0.5 && P.depthAtr <= 2.8 && P.postBounceMaxBodyAtr <= 0.35) {
      return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('TURUN', entry, P, atr) }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pelajaranAktif: ['CG-L4', 'SG-L4', 'SG-L1', 'SG-L2'],
        alasan: [`CG-L4 GRAB-BAHAN-BAKAR: sapuan tanpa reclaim (tutup ${P.closeDistAtr.toFixed(2)} ATR di bawah level) di konteks tren turun (mom50 ${fitur.mom50Atr.toFixed(1)} ATR), bounce kering (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR) -> likuiditas long habis, lanjut turun -> ENTRY TURUN`],
        fitur,
      }, 3)
    }
    // ===== CG-L5: SAPUAN DWI-LAPIS (pantulan rapuh -> WAIT) =====
    if (P.closeDistAtr >= 0.05 && P.closeDistAtr <= 1.6 && P.postBounceMaxBodyAtr <= 0.4 && lastC > prevC && g.twoSisi && P.barsSince <= 3 && P.depthAtr <= 2.6) {
      const trig = Math.max(P.level + 0.8 * atr, entry + 0.25 * atr)
      return mk(versi, { aksi: 'WAIT', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
        pool: poolR,
        grab: { terjadi: true, post: 'BELUM-JELAS', cara },
        gauntlet: g,
        pelajaranAktif: ['CG-L5', 'SG-L7', 'SG-L1', 'SG-L2'],
        alasan: [`CG-L5 SAPUAN-DWI-LAPIS: pantulan pasca-sapu RAPUH (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, vol ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)}, close posisi ${lastClosePos(cs[n - 1]).toFixed(2)}) sementara gauntlet dua sisi terkonfirmasi (${g.cara}) — struktur belum aman; sapuan kedua lebih dalam = risiko likuidasi stop sempit -> WAIT, masuk NAIK hanya bila tutup reclaim di atas ${trig.toFixed(2)}, stop ${STOP_WAIT}%`],
        fitur,
      }, 2)
    }
    if (kering && fitur.mom50Atr <= -0.3 && P.closeDistAtr <= 1.6) {
      return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('TURUN', entry, P, atr) }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pelajaranAktif: ['SG-L5', 'SG-L1', 'SG-L2'],
        alasan: [`SG-L5 RECLAIM-PALSU (warisan): reclaim TANPA PENGIKUT (vol pasca-sapu ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)}) di konteks lemah (mom50 ${fitur.mom50Atr.toFixed(1)} ATR) -> grab bahan bakar penjualan -> ENTRY TURUN`],
        fitur,
      }, 3)
    }
    const trig = Math.max(P.level + 0.8 * atr, entry + 0.25 * atr)
    return mk(versi, { aksi: 'WAIT', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      pool: poolR,
      grab: { terjadi: true, post: 'BELUM-JELAS', cara },
      gauntlet: g,
      pelajaranAktif: ['SG-L7', 'SG-L1', 'SG-L2'],
      alasan: [`SG-L7 SABAR-MENUNGGU: pool rantai baru disapu (${P.barsSince} candle), anatomi belum menentukan (badan ${bodyDominan.toFixed(2)} ATR, close ${P.closeDistAtr.toFixed(2)} ATR) -> WAIT, masuk NAIK hanya bila tutup di atas ${trig.toFixed(2)}`],
      fitur,
    }, 2)
  }

  // ================= SIDE ATAS (buy-side liquidity) — cermin =================
  if (fitur.consecUpBig >= 3 && fitur.lastVolZ >= 1.5 && P.depthAtr >= 0.8 && (P.crossBack || P.reclaimed)) {
    const stop = stopStruktural('TURUN', entry, P, atr)
    return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      pool: poolR,
      grab: { terjadi: true, post: 'REVERSAL', cara },
      gauntlet: g,
      pelajaranAktif: ['CG-L1', 'SG-L9', 'SG-L1', 'SG-L2'],
      alasan: [`CG-L1 SHORT-SQUEEZE-GAUNTLET: ${fitur.consecutiveUp} hijau berturut + klimaks (z=${fitur.lastVolZ.toFixed(1)}) menyapu pool rantai atas sedalam ${P.depthAtr.toFixed(1)} ATR lalu ${P.crossBack ? 'cross-back' : 'ditolak'} — likuidasi short berantai habis; jejak bull trap=${g.bullTrap ? 'ada' : '-'}/bear trap=${g.bearTrap ? 'ada' : '-'} -> ENTRY TURUN, stop ${stop.toFixed(2)}%`],
      fitur,
    }, 3)
  }
  if (!P.reclaimed && P.closeDistAtr <= 0.06 && P.closeDistAtr >= -2.6 && P.barsSince <= 2 && fitur.mom50Atr <= -0.8 && P.depthAtr <= 2.8 && P.postBounceMaxBodyAtr <= 0.5) {
    return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('TURUN', entry, P, atr) }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pelajaranAktif: ['CG-L4', 'SG-L6', 'SG-L1', 'SG-L2'],
      alasan: [`CG-L4 VAKUM-GAUNTLET (cermin): sapuan di atas pool rantai TANPA reclaim (tutup ${P.closeDistAtr.toFixed(2)} ATR) di konteks tren turun (mom50 ${fitur.mom50Atr.toFixed(1)} ATR) tanpa panik — vakum likuiditas, bahan bakar markdown -> ENTRY TURUN, stop di atas ekstrem sapuan`],
      fitur,
    }, 3)
  }
  if (P.reclaimed && P.closeDistAtr >= 0.3 && P.closeDistAtr <= 2.2 && bodyDominan >= 0.55 && P.barsSince <= 2 && (P.barsSince === 0 || pengikut) && P.volZSweep >= 0.5) {
    const stop = stopStruktural('TURUN', entry, P, atr)
    return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      pool: poolR,
      grab: { terjadi: true, post: 'REVERSAL', cara },
      gauntlet: g,
      pelajaranAktif: ['CG-L2', 'SG-L3', 'SG-L1', 'SG-L2'],
      alasan: [`CG-L2 REJECT-DOMINAN (cermin): sapuan pool rantai atas ditolak keras — tutup ${P.closeDistAtr.toFixed(2)} ATR DI BAWAH level, badan dominan ${bodyDominan.toFixed(2)} ATR (z=${P.volZSweep.toFixed(1)}${pengikut ? ', berpengikut' : ''}) — buyer breakout & short lama dipanen; ${g.cara} -> ENTRY TURUN, stop ${stop.toFixed(2)}%`],
      fitur,
    }, 3)
  }
  if (P.closeDistAtr >= -0.45 && P.closeDistAtr <= 0.6 && P.postBounceMaxBodyAtr <= 0.4 && lastC >= prevC && P.postVolMean <= fitur.volMean * 0.8 && P.depthAtr <= 2.6 && P.barsSince <= 3) {
    const stop = stopStruktural('NAIK', entry, P, atr)
    return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pelajaranAktif: ['CG-L3', 'SG-L5', 'SG-L1', 'SG-L2'],
      alasan: [`CG-L3 UMPAN-REJECT (cermin): penolakan secekil TAPI gagal extend — tutup ${P.closeDistAtr.toFixed(2)} ATR dari level, badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, HL mikro (close terakhir naik), volume kering ${P.postVolMean.toFixed(2)} — umpan terakhir setelah dua trap -> vakum beli -> ENTRY NAIK, stop ${stop.toFixed(2)}%`],
      fitur,
    }, 3)
  }
  if (!P.reclaimed && P.closeDistAtr <= -0.05 && P.barsSince <= 3 && fitur.mom50Atr >= 0.5 && P.depthAtr <= 2.8 && P.postBounceMaxBodyAtr <= 0.35) {
    return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('NAIK', entry, P, atr) }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pelajaranAktif: ['CG-L4', 'SG-L4', 'SG-L1', 'SG-L2'],
      alasan: [`CG-L4 GRAB-BAHAN-BAKAR (cermin): sapuan atas tanpa reclaim (tutup ${P.closeDistAtr.toFixed(2)} ATR di atas level) di tren naik (mom50 ${fitur.mom50Atr.toFixed(1)} ATR), fade kering (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR) -> vakum likuiditas, lanjut naik -> ENTRY NAIK`],
      fitur,
    }, 3)
  }
  if (P.closeDistAtr >= 0.05 && P.closeDistAtr <= 1.6 && P.postBounceMaxBodyAtr <= 0.4 && lastC < prevC && g.twoSisi && P.barsSince <= 3 && P.depthAtr <= 2.6) {
    const trig = Math.min(P.level - 0.8 * atr, entry - 0.25 * atr)
    return mk(versi, { aksi: 'WAIT', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      pool: poolR,
      grab: { terjadi: true, post: 'BELUM-JELAS', cara },
      gauntlet: g,
      pelajaranAktif: ['CG-L5', 'SG-L7', 'SG-L1', 'SG-L2'],
      alasan: [`CG-L5 SAPUAN-DWI-LAPIS (cermin): penolakan pasca-sapu RAPUH (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, vol ${P.postVolMean.toFixed(2)}) + gauntlet dua sisi terkonfirmasi — sapuan kedua ke atas = risiko likuidasi stop sempit -> WAIT, masuk TURUN hanya bila tutup di bawah ${trig.toFixed(2)}, stop ${STOP_WAIT}%`],
      fitur,
    }, 2)
  }
  if (kering && fitur.mom50Atr >= 0.3 && P.closeDistAtr >= -1.6) {
    return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('NAIK', entry, P, atr) }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pelajaranAktif: ['SG-L5', 'SG-L1', 'SG-L2'],
      alasan: [`SG-L5 RECLAIM-PALSU (cermin, warisan): penolakan tanpa pengikut (vol ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)}) di konteks kuat -> grab bahan bakar pembelian -> ENTRY NAIK`],
      fitur,
    }, 3)
  }
  const trigT = Math.min(P.level - 0.8 * atr, entry - 0.25 * atr)
  return mk(versi, { aksi: 'WAIT', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigT }, {
    pool: poolR,
    grab: { terjadi: true, post: 'BELUM-JELAS', cara },
    gauntlet: g,
    pelajaranAktif: ['SG-L7', 'SG-L1', 'SG-L2'],
    alasan: [`SG-L7 SABAR-MENUNGGU (cermin): pool rantai atas baru disapu, anatomi belum menentukan (badan ${bodyDominan.toFixed(2)} ATR) -> WAIT, masuk TURUN hanya bila tutup di bawah ${trigT.toFixed(2)}`],
    fitur,
  }, 2)
}
