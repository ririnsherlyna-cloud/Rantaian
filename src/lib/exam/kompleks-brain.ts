// ============================================================
// MICAPROFITA SAKTI-KOMPLEKS — otak UJIAN KOMPLEKS 5 ASPEK.
//
// Menerima HANYA 60 candle visible (point-in-time). Tugas otak:
// mengenali KELIMA aspek SEKALIGUS dalam satu rangkaian —
//   1. STOP HUNT / LIQUIDITY GRAB (sapuan pool rantai)
//   2. FALSE BREAKOUT (tembus puncak struktural lalu dicabut)
//   3. PUMP AND DUMP (markup impuls + markdown pasca-pump)
//   4. BEAR TRAP (tembus bawah lalu dipulihkan)
//   5. BULL TRAP (tembus atas lalu dicabut)
// memahami HUBUNGAN & URUTANNYA (trap menabung likuiditas ->
// pump menciptakan korban -> false breakout menampung pembeli
// terakhir -> dump menciptakan stop cluster -> stop hunt
// memanen), lalu memilih ENTRY / WAIT / SKIP + STOP WAJIB.
//
// LAPISAN PELAJARAN v1.0:
//  - KL-L1 kaskade-gauntlet     · KL-L2 reclaim/reject dominan
//  - KL-L3 umpan reclaim-gagal  · KL-L4 grab-bahan-bakar dump
//  - KL-L5 sapuan dwi-lapis (WAIT disiplin) · KL-L6 skip-disiplin
//  - KL-PD0 pemindai jejak pump-dump-false-breakout (konteks aspek)
//  - warisan SG-L1..L9 (stophunt v2.9.4) & CG v1.6 (gabungan)
// ============================================================

import type { Candle } from './generator'
import { mean, stdev } from './indicators'
import { buildSgVision, type SgVision, type SgPool } from './stophunt-brain'
import type { KlPlan, KlArah } from './kompleks-forge'

export const KL_BRAIN_VERSI = '1.2'

const TARGET_DISIPLIN = 2.2
const STOP_MIN = 1.2
const STOP_MAX = 2.6
const STOP_WAIT = 1.8

// ------------------------------------------------------------
// LAPIS KOREKSI EPISODE — anatomi sapuan sejati
// ------------------------------------------------------------

export interface KlPool extends SgPool {
  idxSweep: number
  episodeLen: number
}

function koreksiPools(cs: Candle[], v: SgVision): KlPool[] {
  const n = cs.length
  const atr = Math.max(v.atr, 1e-9)
  const vols = cs.map((c) => c.v)
  const volSd = Math.max(stdev(vols.slice(Math.max(0, n - 30))), 1e-9)
  const winStart = Math.max(0, n - 22)
  const out: KlPool[] = []
  for (const p of v.pools) {
    if (!p.swept) {
      out.push({ ...p, idxSweep: -1, episodeLen: 0 })
      continue
    }
    const margin = 0.12 * atr
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

function rankOf(p: KlPool): number {
  if (p.crossBack) return 0
  if (p.barsSince <= 1 && p.reclaimed && Math.abs(p.closeDistAtr) >= 0.5) return 0
  if (p.barsSince <= 4) return 1
  if (p.barsSince <= 8) return 2
  return 3
}

function pilihAktif(cs: Candle[], pools: KlPool[], atr: number): KlPool | null {
  const n = cs.length
  const recentExtremeLo = Math.min(...cs.slice(Math.max(0, n - 8)).map((c) => c.l))
  const recentExtremeHi = Math.max(...cs.slice(Math.max(0, n - 8)).map((c) => c.h))
  const valid = pools.filter((p) =>
    p.swept &&
    (p.depthAtr >= 0.4 || (p.depthAtr >= 0.3 && Math.abs(p.closeDistAtr) >= 0.5 && p.volZSweep >= 2)) &&
    p.depthAtr <= 3.4 &&
    p.episodeLen > 0 && p.episodeLen <= 8 &&
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
// KL-PD0 — pemindai jejak PUMP-DUMP-FALSE-BREAKOUT (point-in-time)
// ------------------------------------------------------------

export interface KlPdScan {
  pump: boolean
  pumpArah: 'NAIK' | 'TURUN' | 'TIDAK-JELAS' // arah markup impuls (dari data)
  pumpCara: string
  dump: boolean
  dumpCara: string
  falseBreakout: boolean
  fboLevel: number
  fboCara: string
  fallFromPuncakAtr: number
  korbanPump: boolean // korban pump kini menumpuk di sisi kebalikan arah pump
}

function klPdScan(cs: Candle[], v: SgVision): KlPdScan {
  const n = cs.length
  const atr = Math.max(v.atr, 1e-9)
  const vols = cs.map((c) => c.v)
  // PUMP: jejak markup impuls di tengah jendela (fase ~24..40):
  // rentang melebar + ARAH jelas + volume dorongan menonjol
  const f0 = Math.min(24, Math.max(0, n - 36))
  const f1 = Math.min(40, n - 14)
  const midHi = Math.max(...cs.slice(f0, f1).map((c) => c.h))
  const midLo = Math.min(...cs.slice(f0, f1).map((c) => c.l))
  const midMove = (midHi - midLo) / atr
  // r2 bedah: arah pump diukur dari EKSTREM fase terhadap harga masuk fase
  // (close-ke-close menutup di tengah dump/rally fase G — membingungkan cermin)
  const anchor = cs[Math.max(0, f0 - 1)].c
  const moveUpAtr = (midHi - anchor) / atr
  const moveDnAtr = (anchor - midLo) / atr
  const pumpArah: KlPdScan['pumpArah'] =
    moveUpAtr >= 1.2 && moveUpAtr > moveDnAtr ? 'NAIK'
    : moveDnAtr >= 1.2 && moveDnAtr > moveUpAtr ? 'TURUN'
    : 'TIDAK-JELAS'
  const volPeak = Math.max(...cs.slice(f0, f1).map((c) => c.v))
  const volSd = Math.max(stdev(vols.slice(Math.max(0, n - 30))), 1e-9)
  const volPeakZ = (volPeak - v.volMean) / volSd
  const pump = midMove >= 2.2 && pumpArah !== 'TIDAK-JELAS' && volPeakZ >= 0.8
  // DUMP: pergerakan KEBALIKAN arah pump dari ekstrem fase pump
  // (pump naik -> markdown dari puncak; pump turun-cermin -> rally dari dasar)
  const lastC = cs[n - 1].c
  const fallFromPuncakAtr = (midHi - lastC) / atr
  const riseDariDasarAtr = (lastC - midLo) / atr
  const dump = pump && (pumpArah === 'NAIK' ? fallFromPuncakAtr >= 1.2 : riseDariDasarAtr >= 1.2)
  // FALSE BREAKOUT: puncak/dasar struktural SEBELUM episode tembus
  // (strukEnd = n-31: fase tembus berada di ~30..37) ditembus lalu
  // DITUTUP BALIK di sisi asal dalam <= 3 candle
  const strukEnd = Math.max(6, n - 31)
  const strukStart = Math.max(0, n - 58)
  const struk = cs.slice(strukStart, strukEnd)
  const fboHi = struk.length ? Math.max(...struk.map((c) => c.h)) : 0
  const fboLo = struk.length ? Math.min(...struk.map((c) => c.l)) : 0
  let falseBreakout = false
  let fboCara = ''
  let fboLvl = 0
  // r2 bedah: sisi FBO mengikuti arah pump (FBO puncak utk pump naik,
  // FBO dasar utk pump cermin) — sisi lawan adalah trap fase D, bukan FBO
  const sisi: [number, boolean][] =
    pumpArah === 'NAIK' ? [[fboHi, true]]
    : pumpArah === 'TURUN' ? [[fboLo, false]]
    : [[fboHi, true], [fboLo, false]]
  for (const [lvl, up] of sisi) {
    if (lvl <= 0) continue
    for (let i = Math.max(1, strukEnd); i < n - 1; i++) {
      const tembus = up ? cs[i].h > lvl + 0.05 * atr : cs[i].l < lvl - 0.05 * atr
      if (!tembus) continue
      for (let j = i + 1; j < Math.min(n, i + 4); j++) {
        const cabut = up ? cs[j].c < lvl - 0.15 * atr : cs[j].c > lvl + 0.15 * atr
        if (cabut) {
          falseBreakout = true
          fboLvl = lvl
          fboCara = `${up ? 'puncak' : 'dasar'} struktural ${lvl.toFixed(2)} ${up ? 'ditembus ke atas (candle ' : 'ditembus ke bawah (candle '}${i + 1}) lalu DITUTUP BALIK (candle ${j + 1}) — pembeli/penjual breakout ditampung di luar`
          break
        }
      }
      if (falseBreakout) break
    }
    if (falseBreakout) break
  }
  const korbanPump = pump && midMove >= 3.5 && (pumpArah === 'NAIK' ? fallFromPuncakAtr >= 2.0 : riseDariDasarAtr >= 2.0)
  return {
    pump,
    pumpArah,
    pumpCara: pump
      ? `jejak pump terbaca: rentang tengah jendela ${midMove.toFixed(1)} ATR arah ${pumpArah} dengan volume puncak z=${volPeakZ.toFixed(1)} — markup impuls, bukan gerak organik`
      : 'tanpa jejak pump impuls di tengah jendela',
    dump,
    dumpCara: dump
      ? pumpArah === 'NAIK'
        ? `markdown pasca-pump: harga ${fallFromPuncakAtr.toFixed(1)} ATR di bawah puncak pump ${midHi.toFixed(2)} — korban pump kini stop-loss cluster`
        : `rally pasca-pump-cermin: harga ${riseDariDasarAtr.toFixed(1)} ATR di atas dasar pump ${midLo.toFixed(2)} — korban short pump kini stop-loss cluster`
      : 'tanpa markdown pasca-pump',
    falseBreakout,
    fboLevel: fboLvl,
    fboCara: falseBreakout ? fboCara : 'tanpa false breakout terbaca pada episode terbaru',
    fallFromPuncakAtr,
    korbanPump,
  }
}

// ------------------------------------------------------------
// JEJAK GAUNTLET — pemindaian trap bebas-umur (point-in-time)
// ------------------------------------------------------------

export interface KlGauntletScan {
  bullTrap: boolean
  bearTrap: boolean
  twoSisi: boolean
  cara: string
  deceitCount: number
  deceitCara: string
}

function trapScan(cs: Candle[], v: SgVision): KlGauntletScan {
  const n = cs.length
  const atr = Math.max(v.atr, 1e-9)
  const win = cs.slice(Math.max(0, n - 34))
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
      ? `${deceitCount} lilin menipu terbaca (doji purba / pin salah arah / engulf ekstrem)`
      : `${deceitCount} lilin menipu terbaca`,
  }
}

// ------------------------------------------------------------
// KEPUTUSAN
// ------------------------------------------------------------

export interface KlKeputusan extends KlPlan {
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
  gauntlet: KlGauntletScan
  pd: KlPdScan
  aspek5: {
    stopHunt: boolean
    falseBreakout: boolean
    pumpDump: boolean
    bearTrap: boolean
    bullTrap: boolean
    rangkaianUtuh: string
  }
  pelajaranAktif: string[]
  alasan: string[]
  fitur: SgVision
}

function stopStruktural(arah: KlArah, entry: number, P: KlPool, atr: number): number {
  const extreme = P.side === 'BAWAH' ? P.level - P.depthAtr * atr : P.level + P.depthAtr * atr
  const stopPrice = arah === 'NAIK' ? extreme - 0.45 * atr : extreme + 0.45 * atr
  const pct = arah === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100
  return Math.min(STOP_MAX, Math.max(STOP_MIN, pct))
}

function mk(versi: string, p: KlPlan, rest: Omit<KlKeputusan, keyof KlPlan | 'versi' | 'score'>, score: number): KlKeputusan {
  return { versi, score, ...p, ...rest }
}

function poolRec(P: KlPool | null): KlKeputusan['pool'] {
  if (!P) return { jenis: 'tak-jelas', side: 'TAK-JELAS', level: 0, sentuhan: 0, swept: false, reclaimed: false, depthAtr: 0, barsSince: -1 }
  return { jenis: P.jenis, side: P.side, level: P.level, sentuhan: P.sentuhan, swept: P.swept, reclaimed: P.reclaimed, depthAtr: P.depthAtr, barsSince: P.barsSince }
}

function aspek5Rec(g: KlGauntletScan, pd: KlPdScan, P: KlPool | null): KlKeputusan['aspek5'] {
  const stopHunt = !!P && P.swept && P.barsSince <= 10
  const rangkaian: string[] = []
  if (g.bullTrap) rangkaian.push('bull trap menabung likuiditas atas')
  if (g.bearTrap) rangkaian.push('bear trap melahirkan pool rantai')
  if (pd.pump) rangkaian.push('pump markup menciptakan korban FOMO')
  if (pd.falseBreakout) rangkaian.push('false breakout menampung pembeli terakhir di puncak')
  if (pd.dump) rangkaian.push('dump mengubah korban jadi stop-loss cluster')
  if (stopHunt) rangkaian.push('stop hunt final memanen pool rantai')
  return {
    stopHunt,
    falseBreakout: pd.falseBreakout,
    pumpDump: pd.pump && pd.dump,
    bearTrap: g.bearTrap,
    bullTrap: g.bullTrap,
    rangkaianUtuh: rangkaian.join(' -> '),
  }
}

/** inti naif — artefak "1% AI" (mengejar breakout/breakdown) */
export function klCore(cs: Candle[], fitur: SgVision): KlKeputusan {
  const alasan: string[] = []
  let arah: KlArah
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
  const pd = klPdScan(cs, fitur)
  return mk('0.9', { aksi: 'ENTRY', arah, targetPct: TARGET_DISIPLIN, stopPct: 2.2 }, {
    pool: poolRec(null),
    grab: { terjadi: false, post: 'BELUM-JELAS', cara: 'CORE tidak memetakan likuiditas' },
    gauntlet: g,
    pd,
    aspek5: aspek5Rec(g, pd, null),
    pelajaranAktif: [],
    alasan,
    fitur,
  }, 0)
}

export function klVonis(cs: Candle[], versi = KL_BRAIN_VERSI): KlKeputusan {
  const fitur = buildSgVision(cs)
  if (versi.startsWith('0')) return klCore(cs, fitur)
  const n = cs.length
  const atr = Math.max(fitur.atr, 1e-9)
  const entry = cs[n - 1].c
  const g = trapScan(cs, fitur)
  const pd = klPdScan(cs, fitur)
  const lastC = cs[n - 1].c
  const prevC = cs[n - 2].c

  const pools = koreksiPools(cs, fitur)
  const P = pilihAktif(cs, pools, atr)

  if (!P) {
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      pool: poolRec(null),
      grab: { terjadi: false, post: 'BELUM-JELAS', cara: 'tidak ada sapuan teridentifikasi' },
      gauntlet: g,
      pd,
      aspek5: aspek5Rec(g, pd, null),
      pelajaranAktif: ['KL-L6', 'SG-L8'],
      alasan: ['KL-L6 SKIP-DISIPLIN: tidak ada pool likuiditas yang baru disapu (episode segar + volume nyata) -> tanpa edge likuiditas, rangkaian 5 aspek tidak dimainkan'],
      fitur,
    }, 0)
  }

  const cara = `pool ${P.jenis} (${P.side.toLowerCase()}, ${P.sentuhan} sentuhan, level ${P.level.toFixed(2)}) disapu ${P.barsSince} candle lalu sedalam ${P.depthAtr.toFixed(2)} ATR; volZ sapu ${P.volZSweep.toFixed(1)}; close kini ${P.closeDistAtr >= 0 ? '+' : ''}${P.closeDistAtr.toFixed(2)} ATR dari level -> ${P.reclaimed ? 'RECLAIMED' : 'BELUM reclaim'}; jejak 5 aspek: bullTrap=${g.bullTrap ? 'YA' : 'n'}, bearTrap=${g.bearTrap ? 'YA' : 'n'}, ${pd.pumpCara}, ${pd.dumpCara}, ${pd.fboCara}`
  const poolR = poolRec(P)
  const a5 = aspek5Rec(g, pd, P)
  const pengikut = P.barsSince >= 1 && P.postVolMean >= fitur.volMean * 0.85
  const kering = P.barsSince >= 1 && P.postVolMean < fitur.volMean * 0.6
  const sweepBody = P.barsSince <= 1 ? P.sweepBodyAtr : 0
  const bodyDominan = Math.max(P.postBounceMaxBodyAtr, sweepBody)
  const konteksPd = pd.korbanPump ? 'rangkaian pump-dump-false-breakout terkonfirmasi: stop-loss korban pump menumpuk di bawah — sapuan final adalah panen likuiditas' : 'konteks pasca-markdown'

  if (P.side === 'BAWAH') {
    // ===== KL-L1: KASKADE-LIKUIDASI (V-reversal) =====
    // r1: syarat volZ 1.5 terlalu ketat utk kaskade ber-ATR besar —
    // tambah jalur alternatif: consecDownBig >= 2 + volZ sapu >= 2.0
    if (P.depthAtr >= 0.8 && (P.crossBack || P.reclaimed) &&
      ((fitur.consecDownBig >= 3 && fitur.lastVolZ >= 1.2) || (fitur.consecDownBig >= 2 && P.volZSweep >= 2.0))) {
      const stop = stopStruktural('NAIK', entry, P, atr)
      return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
        pool: poolR,
        grab: { terjadi: true, post: 'REVERSAL', cara },
        gauntlet: g,
        pd,
        aspek5: a5,
        pelajaranAktif: ['KL-L1', 'SG-L9', 'SG-L1', 'SG-L2'],
        alasan: [`KL-L1 KASKADE-GAUNTLET: ${fitur.consecutiveDown} merah berturut + klimaks (z=${fitur.lastVolZ.toFixed(1)}) menyapu pool rantai sedalam ${P.depthAtr.toFixed(1)} ATR lalu ${P.crossBack ? 'cross-back' : 'reclaim'} — mesin likuidasi kehabisan bahan bakar; ${konteksPd}; jejak trap bull=${g.bullTrap ? 'ada' : '-'}/bear=${g.bearTrap ? 'ada' : '-'}, ${g.deceitCara} -> ENTRY NAIK, stop struktural ${stop.toFixed(2)}% di bawah ekstrem sapuan`],
        fitur,
      }, 3)
    }
    // ===== KL-L2: RECLAIM DOMINAN (reversal sah) =====
    if (P.reclaimed && P.closeDistAtr >= 0.3 && P.closeDistAtr <= 2.6 && bodyDominan >= 0.55 && P.barsSince <= 2 && (P.barsSince === 0 || pengikut) && P.volZSweep >= 0.5) {
      const stop = stopStruktural('NAIK', entry, P, atr)
      return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
        pool: poolR,
        grab: { terjadi: true, post: 'REVERSAL', cara },
        gauntlet: g,
        pd,
        aspek5: a5,
        pelajaranAktif: ['KL-L2', 'SG-L3', 'SG-L1', 'SG-L2'],
        alasan: [`KL-L2 RECLAIM-DOMINAN: sapuan pool rantai ditutup balik +${P.closeDistAtr.toFixed(2)} ATR DI ATAS level dgn badan dominan ${bodyDominan.toFixed(2)} ATR (vol sapu z=${P.volZSweep.toFixed(1)}${pengikut ? ', reclaim berpengikut' : ''}) — stop long & short dipanen, trap terjebak; ${konteksPd}; ${g.cara} -> ENTRY NAIK, stop struktural ${stop.toFixed(2)}%`],
        fitur,
      }, 3)
    }
    // ===== KL-L3: UMPAN RECLAIM-GAGAL (mikro + kering) =====
    // r1: badan pasca-sapu LH mikro anatomi baru mencapai ~0.5 ATR —
    // band diperlebar -0.8..0.6 dan bodyDom 0.55 (dari bedah #56-60)
    if (P.closeDistAtr >= -0.8 && P.closeDistAtr <= 0.6 && P.postBounceMaxBodyAtr <= 0.55 && lastC <= prevC && P.postVolMean <= fitur.volMean * 0.8 && P.depthAtr <= 2.8 && P.barsSince <= 3) {
      const stop = stopStruktural('TURUN', entry, P, atr)
      return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pd,
        aspek5: a5,
        pelajaranAktif: ['KL-L3', 'SG-L5', 'SG-L1', 'SG-L2'],
        alasan: [`KL-L3 UMPAN-RECLAIM: reclaim secekil TAPI gagal extend — tutup hanya ${P.closeDistAtr.toFixed(2)} ATR dari level, badan pasca-sapu ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, LH mikro (close terakhir turun), volume kering ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)} — umpan terakhir setelah bull trap, bear trap, pump & false breakout; ${pd.dumpCara} -> grab jadi bahan bakar penjualan -> ENTRY TURUN, stop ${stop.toFixed(2)}% di atas pantulan gagal`],
        fitur,
      }, 3)
    }
    // ===== KL-L4b: GRAB BAHAN BAKAR (tanpa reclaim + konteks dump searah) =====
    // r1 bedah #56-60: pd.dump saja TIDAK cukup (cermin membingungkan) —
    // WAJIB mom50 searah entry (warisan CG-L4b yang terbukti)
    if (!P.reclaimed && P.closeDistAtr <= -0.05 && P.barsSince <= 3 && fitur.mom50Atr <= -0.5 && P.depthAtr <= 2.8 && P.postBounceMaxBodyAtr <= 0.35) {
      return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('TURUN', entry, P, atr) }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pd,
        aspek5: a5,
        pelajaranAktif: ['KL-L4', 'SG-L4', 'SG-L1', 'SG-L2'],
        alasan: [`KL-L4 GRAB-BAHAN-BAKAR: sapuan tanpa reclaim (tutup ${P.closeDistAtr.toFixed(2)} ATR di bawah level) di konteks markdown pasca-pump (${pd.dumpCara}), bounce kering (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR) -> likuiditas long habis, lanjut turun -> ENTRY TURUN`],
        fitur,
      }, 3)
    }
    // ===== KL-L5: SAPUAN DWI-LAPIS (pantulan rapuh -> WAIT) =====
    if (P.closeDistAtr >= 0.05 && P.closeDistAtr <= 1.6 && P.postBounceMaxBodyAtr <= 0.4 && lastC > prevC && g.twoSisi && P.barsSince <= 3 && P.depthAtr <= 2.6) {
      const trig = Math.max(P.level + 0.8 * atr, entry + 0.25 * atr)
      return mk(versi, { aksi: 'WAIT', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
        pool: poolR,
        grab: { terjadi: true, post: 'BELUM-JELAS', cara },
        gauntlet: g,
        pd,
        aspek5: a5,
        pelajaranAktif: ['KL-L5', 'SG-L7', 'SG-L1', 'SG-L2'],
        alasan: [`KL-L5 SAPUAN-DWI-LAPIS: pantulan pasca-sapu RAPUH (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, vol ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)}) sementara rangkaian dua sisi terkonfirmasi (${g.cara}) — struktur belum aman; sapuan kedua lebih dalam = risiko likuidasi stop sempit -> WAIT, masuk NAIK hanya bila tutup reclaim di atas ${trig.toFixed(2)}, stop ${STOP_WAIT}%`],
        fitur,
      }, 2)
    }
    if (kering && fitur.mom50Atr <= -0.3 && P.closeDistAtr <= 1.6) {
      return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('TURUN', entry, P, atr) }, {
        pool: poolR,
        grab: { terjadi: true, post: 'CONTINUATION', cara },
        gauntlet: g,
        pd,
        aspek5: a5,
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
      pd,
      aspek5: a5,
      pelajaranAktif: ['SG-L7', 'SG-L1', 'SG-L2'],
      alasan: [`SG-L7 SABAR-MENUNGGU: pool rantai baru disapu (${P.barsSince} candle), anatomi belum menentukan (badan ${bodyDominan.toFixed(2)} ATR, close ${P.closeDistAtr.toFixed(2)} ATR) -> WAIT, masuk NAIK hanya bila tutup di atas ${trig.toFixed(2)}`],
      fitur,
    }, 2)
  }

  // ================= SIDE ATAS (buy-side liquidity) — cermin =================
  if (P.depthAtr >= 0.8 && (P.crossBack || P.reclaimed) &&
    ((fitur.consecUpBig >= 3 && fitur.lastVolZ >= 1.2) || (fitur.consecUpBig >= 2 && P.volZSweep >= 2.0))) {
    const stop = stopStruktural('TURUN', entry, P, atr)
    return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      pool: poolR,
      grab: { terjadi: true, post: 'REVERSAL', cara },
      gauntlet: g,
      pd,
      aspek5: a5,
      pelajaranAktif: ['KL-L1', 'SG-L9', 'SG-L1', 'SG-L2'],
      alasan: [`KL-L1 SHORT-SQUEEZE-GAUNTLET (cermin): ${fitur.consecutiveUp} hijau berturut + klimaks (z=${fitur.lastVolZ.toFixed(1)}) menyapu pool rantai atas sedalam ${P.depthAtr.toFixed(1)} ATR lalu ${P.crossBack ? 'cross-back' : 'ditolak'} — likuidasi short berantai habis; ${konteksPd}; jejak trap bull=${g.bullTrap ? 'ada' : '-'}/bear=${g.bearTrap ? 'ada' : '-'} -> ENTRY TURUN, stop ${stop.toFixed(2)}%`],
      fitur,
    }, 3)
  }
  if (P.reclaimed && P.closeDistAtr >= 0.3 && P.closeDistAtr <= 2.6 && bodyDominan >= 0.55 && P.barsSince <= 2 && (P.barsSince === 0 || pengikut) && P.volZSweep >= 0.5) {
    const stop = stopStruktural('TURUN', entry, P, atr)
    return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      pool: poolR,
      grab: { terjadi: true, post: 'REVERSAL', cara },
      gauntlet: g,
      pd,
      aspek5: a5,
      pelajaranAktif: ['KL-L2', 'SG-L3', 'SG-L1', 'SG-L2'],
      alasan: [`KL-L2 REJECT-DOMINAN (cermin): sapuan pool rantai atas ditolak keras — tutup ${P.closeDistAtr.toFixed(2)} ATR DI BAWAH level, badan dominan ${bodyDominan.toFixed(2)} ATR (z=${P.volZSweep.toFixed(1)}${pengikut ? ', berpengikut' : ''}) — buyer breakout pump & short lama dipanen; ${g.cara} -> ENTRY TURUN, stop ${stop.toFixed(2)}%`],
      fitur,
    }, 3)
  }
  if (P.closeDistAtr >= -0.8 && P.closeDistAtr <= 0.6 && P.postBounceMaxBodyAtr <= 0.55 && lastC >= prevC && P.postVolMean <= fitur.volMean * 0.8 && P.depthAtr <= 2.8 && P.barsSince <= 3) {
    const stop = stopStruktural('NAIK', entry, P, atr)
    return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pd,
      aspek5: a5,
      pelajaranAktif: ['KL-L3', 'SG-L5', 'SG-L1', 'SG-L2'],
      alasan: [`KL-L3 UMPAN-REJECT (cermin): penolakan secekil TAPI gagal extend — tutup ${P.closeDistAtr.toFixed(2)} ATR dari level, badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, HL mikro (close terakhir naik), volume kering ${P.postVolMean.toFixed(2)} — umpan terakhir setelah pump cermin & false breakdown -> vakum beli -> ENTRY NAIK, stop ${stop.toFixed(2)}%`],
      fitur,
    }, 3)
  }
  if (!P.reclaimed && P.closeDistAtr <= -0.05 && P.barsSince <= 3 && fitur.mom50Atr >= 0.5 && P.depthAtr <= 2.8 && P.postBounceMaxBodyAtr <= 0.35) {
    return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('NAIK', entry, P, atr) }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pd,
      aspek5: a5,
      pelajaranAktif: ['KL-L4', 'SG-L4', 'SG-L1', 'SG-L2'],
      alasan: [`KL-L4 GRAB-BAHAN-BAKAR (cermin): sapuan atas tanpa reclaim (tutup ${P.closeDistAtr.toFixed(2)} ATR di atas level) di konteks markdown cer (${pd.dumpCara}), fade kering (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR) -> vakum likuiditas, lanjut naik -> ENTRY NAIK`],
      fitur,
    }, 3)
  }
  if (P.closeDistAtr >= 0.05 && P.closeDistAtr <= 1.6 && P.postBounceMaxBodyAtr <= 0.4 && lastC < prevC && g.twoSisi && P.barsSince <= 3 && P.depthAtr <= 2.6) {
    const trig = Math.min(P.level - 0.8 * atr, entry - 0.25 * atr)
    return mk(versi, { aksi: 'WAIT', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      pool: poolR,
      grab: { terjadi: true, post: 'BELUM-JELAS', cara },
      gauntlet: g,
      pd,
      aspek5: a5,
      pelajaranAktif: ['KL-L5', 'SG-L7', 'SG-L1', 'SG-L2'],
      alasan: [`KL-L5 SAPUAN-DWI-LAPIS (cermin): penolakan pasca-sapu RAPUH (badan ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, vol ${P.postVolMean.toFixed(2)}) + rangkaian dua sisi terkonfirmasi — sapuan kedua ke atas = risiko likuidasi stop sempit -> WAIT, masuk TURUN hanya bila tutup di bawah ${trig.toFixed(2)}, stop ${STOP_WAIT}%`],
      fitur,
    }, 2)
  }
  if (kering && fitur.mom50Atr >= 0.3 && P.closeDistAtr >= -1.6) {
    return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: stopStruktural('NAIK', entry, P, atr) }, {
      pool: poolR,
      grab: { terjadi: true, post: 'CONTINUATION', cara },
      gauntlet: g,
      pd,
      aspek5: a5,
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
    pd,
    aspek5: a5,
    pelajaranAktif: ['SG-L7', 'SG-L1', 'SG-L2'],
    alasan: [`SG-L7 SABAR-MENUNGGU (cermin): pool rantai atas baru disapu, anatomi belum menentukan (badan ${bodyDominan.toFixed(2)} ATR) -> WAIT, masuk TURUN hanya bila tutup di bawah ${trigT.toFixed(2)}`],
    fitur,
  }, 2)
}
