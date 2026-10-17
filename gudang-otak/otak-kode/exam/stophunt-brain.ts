// ============================================================
// MICAPROFITA SAKTI-STOPHUNT — otak pemahaman STOP HUNTING /
// LIQUIDITY GRAB.
//
// Menerima HANYA candle yang boleh dilihat (point-in-time),
// MEMETAKAN area likuiditas (pool), MEMBACA anatomi sapuan,
// lalu memilih SATU dari TIGA keputusan:
//   ENTRY  — masuk sekarang (arah + target disiplin)
//   WAIT   — menunggu konfirmasi reclaim miliknya sendiri
//   SKIP   — tidak mengambil posisi
//
// ARSITEKTUR BERLAPIS:
//  - SG-CORE v1.0 = inti momentum naif (artefak "1% AI"):
//    mengejar breakdown/breakout — DIPERTAHANKAN sebagai
//    artefak sejarah & pembanding. Racunnya justru sapuan.
//  - SG-L1..L10 = pelajaran ilmu stop-hunt yang ditambal dari
//    bukti bedah ujian (semua kondisi terbaca pada candle ke-60).
//
// v2.8 (bedah r2h): (1) TOUCH-ZONE detector — pivot k=3 rapuh pada
//    equal-highs/HL (sentuhan berdekatan saling bunuh) -> kini pool
//    juga ditambang dari ZONA SENTUH (klaster harga h/l dalam 0.18
//    ATR, min 2 sentuhan, dedupe thd pool pivot); (2) SORT BARU
//    berbasis KESEGARAN: peristiwa penolakan-balik yang TERJADI pada
//    candle terakhir = rank 0, sapuan <= 4 candle = rank 1 — pool
//    basi tak lagi mencuri 'active' lewat kedekatan ekstrem;
//    (3) SG-L10: sapuan atas yang gagal ditahan (cross-back) atau
//    sapuan segar ditolak keras = TURUN, tanpa gerbang volume;
//    (4) L6 vakum diperluas: mom50 >= 0.8 (uptrend + sapuan di
//    bawah + tanpa kepanikan = vakum likuiditas).
// ============================================================

import type { Candle } from './generator'
import * as I from './indicators'
import { buildCandleVision, type CandleVision } from './sakti-candle'
import type { ShPlan } from './stophunt-forge'

export const SG_BRAIN_VERSI = '2.9.4'

// ------------------------------------------------------------
// VISION — peta likuiditas point-in-time
// ------------------------------------------------------------

export interface SgPool {
  side: 'BAWAH' | 'ATAS'
  jenis: string // swing-low | equal-lows | session-low | range-low | hl-structure | round-number | wick-cluster | cascade-low | swing-high | equal-highs | range-high | squeeze-high
  level: number
  sentuhan: number // jumlah kunjungan ke pool
  maxBounceAtr: number // pantulan terbesar antar kunjungan (ATR)
  swept: boolean
  reclaimed: boolean
  barsSince: number // candle sejak sapuan terakhir
  depthAtr: number // kedalaman sapuan (ATR)
  closeDistAtr: number // jarak close terakhir dari level (ATR; + = di atas level utk BAWAH)
  volZSweep: number // volume lilin sapuan (z)
  volRatioSweep: number // volume lilin sapu / rata2 volume 12 candle PRA-episode
  sweepBodyAtr: number
  postBounceMaxBodyAtr: number // badan terbesar lilin pasca-sapu (ATR)
  postVolMean: number // volume rata-rata pasca-sapu
  crossBack: boolean // penolakan-balik TERJADI pada candle terakhir (prevClose di luar, lastClose kembali)
  dariZona: boolean // ditambang dari touch-zone (bukan pivot)
}

export interface SgVision extends CandleVision {
  atrSd: number
  pools: SgPool[] // kandidat pool TERPETAKAN (terurut: ter-sapu paling baru dulu)
  active: SgPool | null // pool aktif (baru disapu)
  consecDownBig: number // merah besar berturut (badan >= 0.55 ATR)
  consecUpBig: number
  lastVolZ: number
}

function sdOf(arr: number[]): number {
  return arr.length > 1 ? I.stdev(arr) : 1e-9
}

/** tier kesegaran pool utk pemilihan active:
 *  0 = peristiwa penolakan-balik TERJADI pada candle terakhir, atau sapuan
 *      <= 1 candle yang langsung ditutup balik jauh (>= 0.5 ATR)
 *  1 = sapuan <= 4 candle  ·  2 = <= 8 candle  ·  3 = lebih tua */
function rankOf(p: SgPool): number {
  if (p.crossBack) return 0
  if (p.barsSince <= 1 && p.reclaimed && Math.abs(p.closeDistAtr) >= 0.5) return 0
  if (p.barsSince <= 4) return 1
  if (p.barsSince <= 8) return 2
  return 3
}

/** deteksi pivot index (k=3) */
function pivotIdx(cs: Candle[], kind: 'low' | 'high'): number[] {
  const out: number[] = []
  const n = cs.length
  for (let i = 3; i < n - 3; i++) {
    let ok = true
    for (let k = 1; k <= 3; k++) {
      if (kind === 'low' ? cs[i].l > cs[i - k].l || cs[i].l > cs[i + k].l : cs[i].h < cs[i - k].h || cs[i].h < cs[i + k].h) {
        ok = false
        break
      }
    }
    if (ok) out.push(i)
  }
  return out
}

interface Cluster { level: number; idxs: number[] }

/** klaster pivot ke dalam pool (toleransi 0.3 ATR); level = MEDIAN harga pivot
 *  (kebal pivot derau tunggal yang menggeser min/max) */
function clusterPivots(cs: Candle[], idxs: number[], kind: 'low' | 'high', atr: number): Cluster[] {
  const px = (i: number) => (kind === 'low' ? cs[i].l : cs[i].h)
  const sorted = [...idxs].sort((a, b) => px(a) - px(b))
  const clusters: Cluster[] = []
  for (const i of sorted) {
    const last = clusters[clusters.length - 1]
    if (last && Math.abs(px(i) - last.level) <= 0.3 * atr) {
      last.idxs.push(i)
    } else clusters.push({ level: px(i), idxs: [i] })
  }
  for (const cl of clusters) {
    const prices = cl.idxs.map(px).sort((a, b) => a - b)
    // MODE: harga sentuhan presisi (lilin anatomi exact) mengulang nilai yang sama —
    // pivot derau bernilai unik. Mode dipakai bila dominan; kalau tidak, median.
    const counts = new Map<number, number>()
    for (const p of prices) counts.set(p, (counts.get(p) ?? 0) + 1)
    let modeVal = prices[0]
    let modeCnt = 0
    for (const [val, cnt] of counts) {
      if (cnt > modeCnt || (cnt === modeCnt && Math.abs(val - prices[Math.floor(prices.length / 2)]) < Math.abs(modeVal - prices[Math.floor(prices.length / 2)]))) {
        modeVal = val
        modeCnt = cnt
      }
    }
    const mid = Math.floor(prices.length / 2)
    const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2
    cl.level = modeCnt >= 2 && modeCnt * 2 >= prices.length ? modeVal : median
  }
  return clusters
}

/** TOUCH-ZONE: tambang klaster harga (h & l candle) dalam toleransi
 *  kecil — kebal pivot k=3 yang rapuh pada equal-highs/HL (sentuhan
 *  berdekatan saling bunuh). Dua tahap: pasangan benih (<= 0.12 ATR),
 *  lalu serap sentuhan berikutnya dalam 0.18 ATR dari median. */
function mineTouchZones(win: Candle[], atr: number): { level: number; touches: number[] }[] {
  const touches: { px: number; close: boolean }[] = []
  const zWin = win.slice(0, Math.max(0, win.length - 6)) // 6 candle terakhir = episode sapu, bukan sejarah pool
  for (const c of zWin) {
    touches.push({ px: c.h, close: false }, { px: c.l, close: false }, { px: c.c, close: true })
    // close di level ikut MENEMUKAN zona (sentuhan badan), tapi LEVEL akhir dihitung
    // dari h/l saja agar tak digeser close yang sedikit lepas
  }
  const sorted = [...touches].sort((a, b) => a.px - b.px)
  const seedTol = 0.12 * atr
  const growTol = 0.18 * atr
  const zones: { level: number; touches: number[] }[] = []
  let i = 0
  while (i < sorted.length - 1) {
    if (sorted[i + 1].px - sorted[i].px <= seedTol) {
      const grp = [sorted[i], sorted[i + 1]]
      i += 2
      while (i < sorted.length && sorted[i].px - medianOf(grp.map((t) => t.px)) <= growTol) {
        grp.push(sorted[i])
        i++
      }
      const strukt = grp.filter((t) => !t.close).map((t) => t.px)
      const src = strukt.length ? strukt : grp.map((t) => t.px)
      zones.push({ level: medianOf(src), touches: src })
    } else i++
  }
  return zones.filter((z) => z.touches.length >= 2)
}

function medianOf(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** kunjungan ke pool + pantulan antar kunjungan */
function visitsOf(cs: Candle[], level: number, side: 'BAWAH' | 'ATAS', atr: number): { visits: number; maxBounceAtr: number } {
  let visits = 0
  let inVisit = false
  let excursion = 0
  let maxBounce = 0
  for (const c of cs) {
    const near = side === 'BAWAH' ? c.l <= level + 0.22 * atr : c.h >= level - 0.22 * atr
    if (near && !inVisit) {
      visits++
      inVisit = true
      excursion = 0
    }
    if (inVisit) {
      const exc = side === 'BAWAH' ? (c.h - level) / atr : (level - c.l) / atr
      excursion = Math.max(excursion, exc)
      const left = side === 'BAWAH' ? (c.h - level) / atr > 0.55 : (level - c.l) / atr > 0.55
      if (left && !near) {
        maxBounce = Math.max(maxBounce, excursion)
        inVisit = false
      }
    }
  }
  maxBounce = Math.max(maxBounce, inVisit ? excursion : 0)
  return { visits, maxBounceAtr: maxBounce }
}

function nearestIntDist(x: number): number {
  return Math.abs(x - Math.round(x))
}

/** klasifikasi jenis pool (presedensi disepakati dgn anatomi generator) */
function classifyPool(cs: Candle[], v: CandleVision, level: number, side: 'BAWAH' | 'ATAS', atr: number, visits: number, maxBounceAtr: number, consecBig: number, distPullAtr: number, trendStruct: boolean): string {
  if (nearestIntDist(level) <= 0.12 * atr) return 'round-number'
  // klaster wick: >= 3 lilin ber-wick-panjang dalam RENTANG 10 candle (klaster waktu),
  // wick >= 0.35 ATR & >= 45% range, ujungnya dekat level — sentuhan session/equal
  // tersebar jauh sehingga tak pernah 3-dalam-10
  const n = cs.length
  const wickIdx: number[] = []
  for (let i = Math.max(0, n - 26); i < n; i++) {
    const c = cs[i]
    const range = Math.max(c.h - c.l, 1e-9)
    const wl = (Math.min(c.o, c.c) - c.l) / atr
    const wu = (c.h - Math.max(c.o, c.c)) / atr
    const edgeOk = side === 'BAWAH' ? Math.abs(c.l - level) <= 0.4 * atr : Math.abs(c.h - level) <= 0.4 * atr
    if (edgeOk && side === 'BAWAH' && wl >= 0.35 && wl / range >= 0.45) wickIdx.push(i)
    if (edgeOk && side === 'ATAS' && wu >= 0.35 && wu / range >= 0.45) wickIdx.push(i)
  }
  let wickSpan = false
  for (let a = 0; a < wickIdx.length; a++) {
    let cnt = 0
    for (let b = a; b < wickIdx.length; b++) {
      if (wickIdx[b] - wickIdx[a] <= 10) cnt++
      else break
    }
    if (cnt >= 3) { wickSpan = true; break }
  }
  if (wickSpan) return 'wick-cluster'
  // kaskade / squeeze: dorongan panik badan-besar berturut (kebal dilusi volume)
  if (side === 'BAWAH' && consecBig >= 4) return 'cascade-low'
  if (side === 'ATAS' && consecBig >= 4) return 'squeeze-high'
  // struktur HL/LH: pullback dalam ke level + konteks tren HH/LL (shakeout struktur)
  if (side === 'BAWAH' && distPullAtr >= 4 && trendStruct) return 'hl-structure'
  if (side === 'ATAS' && distPullAtr >= 4 && trendStruct) return 'hl-structure'
  // struktur sentuhan
  if (visits >= 5) return 'session-low'
  if (visits >= 2 && maxBounceAtr >= 2.15) return side === 'BAWAH' ? 'range-low' : 'range-high'
  if (visits >= 2 && maxBounceAtr >= 1) return side === 'BAWAH' ? 'equal-lows' : 'equal-highs'
  return side === 'BAWAH' ? 'swing-low' : 'swing-high'
}

export function buildSgVision(cs: Candle[]): SgVision {
  const v = buildCandleVision(cs)
  const atr = Math.max(v.atr, 1e-9)
  const n = cs.length
  const vols = cs.map((c) => c.v)
  const volSd = Math.max(sdOf(vols.slice(Math.max(0, n - 30))), 1e-9)
  const lastVolZ = (cs[n - 1].v - v.volMean) / volSd

  // dorongan panik besar
  let cd = 0, cu = 0, cdBig = 0, cuBig = 0
  for (let i = Math.max(1, n - 20); i < n; i++) {
    const red = cs[i].c < cs[i - 1].c
    const body = Math.abs(cs[i].c - cs[i].o) / atr
    if (red) { cd++; cdBig = body >= 0.55 ? cdBig + 1 : 0 } else { cd = 0; cdBig = 0 }
    if (!red) { cu++; cuBig = body >= 0.55 ? cuBig + 1 : 0 } else { cu = 0; cuBig = 0 }
  }
  v.consecutiveDown = Math.max(v.consecutiveDown, cd)
  v.consecutiveUp = Math.max(v.consecutiveUp, cu)

  const pools: SgPool[] = []
  const win = cs.slice(Math.max(0, n - 58))
  const wOff = n - win.length
  const recentExtreme = Math.min(...cs.slice(Math.max(0, n - 8)).map((c) => c.l))
  const recentExtremeHi = Math.max(...cs.slice(Math.max(0, n - 8)).map((c) => c.h))
  for (const side of ['BAWAH', 'ATAS'] as const) {
    const kind = side === 'BAWAH' ? 'low' : 'high'
    // pivot DIKECUALIKAN 3 candle terakhir: wick sapuan & lilin pasca-sapu bukan
    // sejarah pool — mereka tidak boleh membentuk/menggeser klaster
    const pivWin = win.slice(0, Math.max(0, win.length - 3))
    const piv = pivotIdx(pivWin, kind)
    const clusters = clusterPivots(pivWin, piv, kind, atr)
    for (const cl of clusters) {
      const level = cl.level
      const margin = 0.12 * atr
      const pierce = (i: number) => (side === 'BAWAH' ? cs[i].l < level - margin : cs[i].h > level + margin)
      // EPISODE SAPUAN: pierce terakhir dalam 14 candle, lalu mundur selama harga
      // menembus / bertahan di luar level — awal episode = lilin sapuan sejati
      let lastPierce = -1
      for (let i = n - 1; i >= Math.max(0, n - 14); i--) {
        if (pierce(i)) { lastPierce = i; break }
      }
      let sweepStart = -1
      if (lastPierce >= 0) {
        sweepStart = lastPierce
        while (sweepStart - 1 >= 0 && n - sweepStart <= 22) {
          const prev = cs[sweepStart - 1]
          // lanjut mundur hanya bila lilin sebelumnya juga menembus ATAU jelas berada
          // DI LUAR level searah sapuan (bukan sekadar di dekat level)
          const beyond = side === 'BAWAH' ? prev.c < level - margin : prev.c > level + margin
          if (pierce(sweepStart - 1) || beyond) sweepStart--
          else break
        }
        if (n - sweepStart > 22) sweepStart = -1
      }
      const swept = sweepStart >= 0
      // kunjungan dihitung SEBELUM sapuan dan excl. 2 candle tepat sebelum sapu
      // (sentuhan yang menempel ke sapuan = bagian episode, bukan sejarah pool)
      const vWin = swept ? win.slice(0, Math.max(0, sweepStart - wOff - 2)) : win
      const { visits, maxBounceAtr } = visitsOf(vWin, level, side, atr)
      // kedalaman pullback: jarak level dari puncak/lembah 30 candle (struktur HL
      // sejati = sapuan JAUH di bawah puncak terkini; range/equal = dekat)
      const win30 = cs.slice(Math.max(0, n - 30))
      const distPullAtr = side === 'BAWAH'
        ? (Math.max(...win30.map((c) => c.h)) - level) / atr
        : (level - Math.min(...win30.map((c) => c.l))) / atr
      // struktur tren: puncak 32 candle terakhir > puncak jendela sebelumnya (HH) —
      // ciri uptrend utk pool bawah; cermin utk pool atas (LL)
      const recent = cs.slice(Math.max(0, n - 32))
      const older = cs.slice(0, Math.max(0, n - 32))
      const hhStruct = older.length > 10 && Math.max(...recent.map((c) => c.h)) > Math.max(...older.map((c) => c.h))
      const llStruct = older.length > 10 && Math.min(...recent.map((c) => c.l)) < Math.min(...older.map((c) => c.l))
      const consecBig = side === 'BAWAH' ? cdBig : cuBig
      const jenis = classifyPool(win, v, level, side, atr, visits, maxBounceAtr, consecBig, distPullAtr, side === 'BAWAH' ? hhStruct : llStruct)
      const pool: SgPool = {
        side, jenis, level, sentuhan: visits, maxBounceAtr,
        swept, reclaimed: false, barsSince: swept ? n - 1 - sweepStart : -1,
        depthAtr: 0, closeDistAtr: 0, volZSweep: 0, volRatioSweep: 0, sweepBodyAtr: 0,
        postBounceMaxBodyAtr: 0, postVolMean: 0, crossBack: false, dariZona: false,
      }
      if (swept) {
        const prevClose = n >= 2 ? cs[n - 2].c : cs[n - 1].c
        const lastClose = cs[n - 1].c
        pool.crossBack =
          side === 'ATAS'
            ? prevClose > level && lastClose < level && (level - lastClose) / atr >= 0.2
            : prevClose < level && lastClose > level && (lastClose - level) / atr >= 0.2
        const after = cs.slice(sweepStart)
        const extreme = side === 'BAWAH' ? Math.min(...after.map((c) => c.l)) : Math.max(...after.map((c) => c.h))
        pool.depthAtr = side === 'BAWAH' ? (level - extreme) / atr : (extreme - level) / atr
        pool.closeDistAtr = side === 'BAWAH' ? (lastClose - level) / atr : (level - lastClose) / atr
        pool.reclaimed = pool.closeDistAtr >= 0.12
        pool.volZSweep = (cs[sweepStart].v - v.volMean) / volSd
        const preVols = cs.slice(Math.max(0, sweepStart - 12), sweepStart).map((c) => c.v)
        const preMean = preVols.length ? I.mean(preVols) : v.volMean
        pool.volRatioSweep = cs[sweepStart].v / Math.max(preMean, 1e-9)
        pool.sweepBodyAtr = Math.abs(cs[sweepStart].c - cs[sweepStart].o) / atr
        const post = cs.slice(sweepStart + 1)
        pool.postBounceMaxBodyAtr = post.length ? Math.max(...post.map((c) => Math.abs(c.c - c.o))) / atr : 0
        pool.postVolMean = post.length ? I.mean(post.map((c) => c.v)) : 0
      }
      pools.push(pool)
    }
  }
  // ---- TAMBANG TOUCH-ZONE (dedupe thd pool pivot: level sama ~ 0.22 ATR) ----
  const zones = mineTouchZones(win, atr)
  for (const z of zones) {
    if (pools.some((p) => Math.abs(p.level - z.level) <= 0.22 * atr)) continue
    const level = z.level
    const margin = 0.12 * atr
    // episode dwi-arah: sapuan TERAKHIR ke atas atau ke bawah
    let lastUp = -1
    let lastDn = -1
    for (let i = n - 1; i >= Math.max(0, n - 14); i--) {
      if (lastUp < 0 && cs[i].h > level + margin) lastUp = i
      if (lastDn < 0 && cs[i].l < level - margin) lastDn = i
      if (lastUp >= 0 && lastDn >= 0) break
    }
    const upNewer = lastUp >= lastDn
    const lastPierce = Math.max(lastUp, lastDn)
    if (lastPierce < 0) continue // tak pernah disapu -> tidak relevan sbg kandidat aktif
    let sweepStart = lastPierce
    while (sweepStart - 1 >= 0 && n - sweepStart <= 22) {
      const prev = cs[sweepStart - 1]
      const beyond = upNewer ? prev.c > level + margin : prev.c < level - margin
      const piercePrev = upNewer ? prev.h > level + margin : prev.l < level - margin
      if (piercePrev || beyond) sweepStart--
      else break
    }
    if (n - sweepStart > 22) continue
    const side: 'BAWAH' | 'ATAS' = upNewer ? 'ATAS' : 'BAWAH'
    const kind: 'low' | 'high' = side === 'BAWAH' ? 'low' : 'high'
    const vWin = win.slice(0, Math.max(0, sweepStart - wOff - 2))
    const { visits, maxBounceAtr } = visitsOf(vWin, level, side, atr)
    const win30 = cs.slice(Math.max(0, n - 30))
    const distPullAtr = side === 'BAWAH'
      ? (Math.max(...win30.map((c) => c.h)) - level) / atr
      : (level - Math.min(...win30.map((c) => c.l))) / atr
    const recent = cs.slice(Math.max(0, n - 32))
    const older = cs.slice(0, Math.max(0, n - 32))
    const hhStruct = older.length > 10 && Math.max(...recent.map((c) => c.h)) > Math.max(...older.map((c) => c.h))
    const llStruct = older.length > 10 && Math.min(...recent.map((c) => c.l)) < Math.min(...older.map((c) => c.l))
    const consecBig = side === 'BAWAH' ? cdBig : cuBig
    const jenis = classifyPool(win, v, level, side, atr, Math.max(visits, Math.min(z.touches.length, 4)), Math.max(maxBounceAtr, 0.4), consecBig, distPullAtr, side === 'BAWAH' ? hhStruct : llStruct)
    const pool: SgPool = {
      side, jenis, level, sentuhan: Math.max(visits, z.touches.length - 1), maxBounceAtr,
      swept: true, reclaimed: false, barsSince: n - 1 - sweepStart,
      depthAtr: 0, closeDistAtr: 0, volZSweep: 0, volRatioSweep: 0, sweepBodyAtr: 0,
      postBounceMaxBodyAtr: 0, postVolMean: 0, crossBack: false, dariZona: true,
    }
    const after = cs.slice(sweepStart)
    const extreme = side === 'BAWAH' ? Math.min(...after.map((c) => c.l)) : Math.max(...after.map((c) => c.h))
    pool.depthAtr = side === 'BAWAH' ? (level - extreme) / atr : (extreme - level) / atr
    const lastClose = cs[n - 1].c
    const prevClose = cs[n - 2].c
    pool.closeDistAtr = side === 'BAWAH' ? (lastClose - level) / atr : (level - lastClose) / atr
    pool.reclaimed = pool.closeDistAtr >= 0.12
    pool.volZSweep = (cs[sweepStart].v - v.volMean) / volSd
    const preVols = cs.slice(Math.max(0, sweepStart - 12), sweepStart).map((c) => c.v)
    const preMean = preVols.length ? I.mean(preVols) : v.volMean
    pool.volRatioSweep = cs[sweepStart].v / Math.max(preMean, 1e-9)
    pool.sweepBodyAtr = Math.abs(cs[sweepStart].c - cs[sweepStart].o) / atr
    const post = cs.slice(sweepStart + 1)
    pool.postBounceMaxBodyAtr = post.length ? Math.max(...post.map((c) => Math.abs(c.c - c.o))) / atr : 0
    pool.postVolMean = post.length ? I.mean(post.map((c) => c.v)) : 0
    pool.crossBack =
      side === 'ATAS'
        ? prevClose > level && lastClose < level && pool.closeDistAtr >= 0.2
        : prevClose < level && lastClose > level && pool.closeDistAtr >= 0.2
    pools.push(pool)
  }

  // pool aktif — kandidat SAH:
  //  · kedalaman >= 0.4 ATR (anti phantom); RELAKSASI 0.3 ATR bila penolakan
  //    MUTLAK (tutup >= 0.5 ATR di luar level + volume sapu z >= 2) — penolakan
  //    sekuat itu sendiri membuktikan stop telah dipanen
  //  · bukti stop terpicu: volume sapu >= 0.5 sigma ATAU rasio thd pra-episode >= 1.15
  //  · pool pivot butuh sejarah (sentuhan >= 1); pool zona dibuktikan sapuannya
  const sweptPools = pools.filter((p) =>
    p.swept &&
    (p.depthAtr >= 0.4 || (p.depthAtr >= 0.3 && Math.abs(p.closeDistAtr) >= 0.5 && p.volZSweep >= 2)) &&
    (p.dariZona || p.sentuhan >= 1) &&
    (p.volZSweep >= 0.5 || p.volRatioSweep >= 1.15))
  sweptPools.sort((a, b) => {
    // 1) TIER KESEGARAN: peristiwa penolakan-balik saat ini / sapuan baru
    const ra = rankOf(a)
    const rbv = rankOf(b)
    if (ra !== rbv) return ra - rbv
    // 2) terdekat ke ekstrem 8 candle terakhir (sapuan terjadi DI ekstrem)
    const da = Math.abs(a.level - (a.side === 'BAWAH' ? recentExtreme : recentExtremeHi))
    const dbv = Math.abs(b.level - (b.side === 'BAWAH' ? recentExtreme : recentExtremeHi))
    if (da !== dbv) return da - dbv
    // 3) paling segar
    return a.barsSince - b.barsSince
  })
  const active = sweptPools[0] ?? null
  return { ...v, atrSd: volSd, pools, active, consecDownBig: cdBig, consecUpBig: cuBig, lastVolZ }
}

// ------------------------------------------------------------
// KEPUTUSAN
// ------------------------------------------------------------

export interface SgKeputusan extends ShPlan {
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
  pelajaranAktif: string[]
  alasan: string[]
  fitur: SgVision
}

const TARGET_DISIPLIN = 2.2

/** inti naif v1.0 — artefak "1% AI" (mengejar breakout/breakdown) */
function sgCore(cs: Candle[], fitur: SgVision): SgKeputusan {
  const alasan: string[] = []
  let arah: 'NAIK' | 'TURUN'
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
  return {
    versi: '1.0', aksi: 'ENTRY', arah, targetPct: TARGET_DISIPLIN, score: 0,
    pool: { jenis: 'tak-jelas', side: 'TAK-JELAS', level: 0, sentuhan: 0, swept: false, reclaimed: false, depthAtr: 0, barsSince: -1 },
    grab: { terjadi: false, post: 'BELUM-JELAS', cara: 'CORE tidak memetakan likuiditas' },
    pelajaranAktif: [], alasan, fitur,
  }
}

/** vonis utama — versi pelajaran (v2.x) */
export function sgVonis(cs: Candle[], versi = SG_BRAIN_VERSI): SgKeputusan {
  const fitur = buildSgVision(cs)
  if (versi.startsWith('1')) return sgCore(cs, fitur)

  const alasan: string[] = []
  const pelajaran: string[] = []
  const P = fitur.active
  const atr = fitur.atr

  // ===== TIDAK ADA POOL TER-SAPU =====
  if (!P) {
    pelajaran.push('SG-L8')
    alasan.push('SG-L8 SKIP-DISCIPLIN: tidak ada pool likuiditas yang baru disapu (kedalaman >= 0.2 ATR) -> tanpa edge likuiditas, tidak mengambil posisi')
    return {
      versi, aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, score: 0,
      pool: { jenis: 'tak-jelas', side: 'TAK-JELAS', level: 0, sentuhan: 0, swept: false, reclaimed: false, depthAtr: 0, barsSince: -1 },
      grab: { terjadi: false, post: 'BELUM-JELAS', cara: 'tidak ada sapuan teridentifikasi' },
      pelajaranAktif: pelajaran, alasan, fitur,
    }
  }

  const poolRec = {
    jenis: P.jenis, side: P.side, level: P.level, sentuhan: P.sentuhan,
    swept: P.swept, reclaimed: P.reclaimed, depthAtr: P.depthAtr, barsSince: P.barsSince,
  }
  const grabTerjadi = true
  const cara = `pool ${P.jenis} (${P.side.toLowerCase()}, ${P.sentuhan} sentuhan, level ${P.level.toFixed(2)}) disapu ${P.barsSince} candle lalu sedalam ${P.depthAtr.toFixed(2)} ATR; volZ sapu ${P.volZSweep.toFixed(1)}; close kini ${P.closeDistAtr >= 0 ? '+' : ''}${P.closeDistAtr.toFixed(2)} ATR dari level -> ${P.reclaimed ? 'RECLAIMED' : 'BELUM reclaim'}`

  if (P.side === 'BAWAH') {
    if (P.reclaimed) {
      // ===== ANATOMI RECLAIM (v2.9.3, bedah hakim-sh300) =====
      // Kekuatan reclaim diukur dari PENGIKUT (volume pasca-sapu), bukan hanya
      // dari lilin sapu: sapuan sunyi + reclaim berpengikut = sah (range-low);
      // reclaim KERING (vol padam < 0.6x rata) = umpan fake-reclaim, apapun
      // badannya (bukti: 21 baris fake-reclaim postVol 0.53 vs sah 1.26-2.4).
      const pengikut = P.barsSince >= 1 && P.postVolMean >= fitur.volMean * 0.85
      const kering = P.barsSince >= 1 && P.postVolMean < fitur.volMean * 0.6
      const kuat = P.closeDistAtr >= 0.3 && P.volZSweep >= 1 && (P.barsSince === 0 || pengikut)
      if (kuat) {
        pelajaran.push('SG-L1', 'SG-L2', 'SG-L3')
        alasan.push(`SG-L3 TANDA-REVERSAL: sapuan pool ${P.jenis} ditutup balik DI ATAS level (tutup +${P.closeDistAtr.toFixed(2)} ATR, volume sapu nyata z=${P.volZSweep.toFixed(1)}${pengikut ? ', reclaim berpengikut' : ''}) -> stop long sudah dipanen, penjual trap terjebak -> ENTRY NAIK`)
        return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
      }
      if (kering) {
        pelajaran.push('SG-L1', 'SG-L2', 'SG-L5')
        alasan.push(`SG-L5 RECLAIM-PALSU: reclaim TANPA PENGIKUT (vol pasca-sapu ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)} = kering) — badan reclaim apapun adalah umpan -> grab bahan bakar penjualan -> ENTRY TURUN`)
        return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
      }
      const sah =
        (P.closeDistAtr >= 0.3 && (P.volZSweep >= 1 || pengikut)) ||
        (pengikut && P.postBounceMaxBodyAtr >= 0.65 && P.closeDistAtr >= 0.1)
      if (sah) {
        pelajaran.push('SG-L1', 'SG-L2', 'SG-L3')
        alasan.push(`SG-L3 RECLAIM-BERPENGIKUT: tutup +${P.closeDistAtr.toFixed(2)} ATR di atas level, volume pasca-sapu ${P.postVolMean.toFixed(2)} (rata ${fitur.volMean.toFixed(2)}) + badan tindak-lanjut ${P.postBounceMaxBodyAtr.toFixed(2)} ATR -> sapuan ${P.jenis} benar-benar ditolak -> ENTRY NAIK`)
        return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
      }
      // v2.9.2 (bedah sh200): KONTEKS TREN pembeda reclaim-palsu vs shakeout.
      if (fitur.mom50Atr >= 0.5) {
        pelajaran.push('SG-L1', 'SG-L2', 'SG-L6')
        alasan.push(`SG-L6 SHAKEOUT-RECLAIM: reclaim lemah (+${P.closeDistAtr.toFixed(2)} ATR) TAPI konteks tren naik (mom50 ${fitur.mom50Atr.toFixed(1)} ATR) -> sapuan di bawah ${P.jenis} adalah shakeout, bukan patah; grab = bahan bakar markup -> ENTRY NAIK`)
        return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
      }
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L5')
      alasan.push(`SG-L5 RECLAIM-PALSU: tutup hanya +${P.closeDistAtr.toFixed(2)} ATR di atas level, reclaim tanpa kekuatan & tanpa pengikut -> grab berubah bahan bakar penjualan -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
    }
    // belum reclaim
    if (fitur.consecDownBig >= 4 && P.depthAtr >= 1.0) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L9')
      alasan.push(`SG-L9 KASKADE-LIKUIDASI: ${fitur.consecutiveDown} merah berturut + klimaks (z=${fitur.lastVolZ.toFixed(1)}) sedalam ${P.depthAtr.toFixed(1)} ATR di bawah pool ${P.jenis} -> mesin likuidasi kehabisan bahan bakar -> ENTRY NAIK (tangkap kepanikan)`)
      return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
    }
    if ((fitur.mom50Atr >= 0.8 || (P.jenis === 'hl-structure' && fitur.mom50Atr >= 0.3)) && P.depthAtr <= 2.8) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L6')
      alasan.push(`SG-L6 VAKUM-TREN: konteks tren naik (mom50 ${fitur.mom50Atr.toFixed(1)} ATR${P.jenis === 'hl-structure' ? ', pullback dalam ke struktur HL' : ''}), sapuan di bawah ${P.jenis} tanpa panik = vakum likuiditas -> bahan bakar markup -> ENTRY NAIK`)
      return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
    }
    const gagalBounce = P.barsSince >= 2 && P.postBounceMaxBodyAtr <= 0.3 && P.postVolMean <= fitur.volMean * 1.05 &&
      (P.closeDistAtr <= -0.08 || (P.closeDistAtr < 0.12 && fitur.mom50Atr <= -0.5))
    if (gagalBounce) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L4')
      alasan.push(`SG-L4 GRAB-BAHAN-BAKAR: sapuan TANPA reclaim, bounce pasca-sapu kering (badan maks ${P.postBounceMaxBodyAtr.toFixed(2)} ATR, vol ${P.postVolMean.toFixed(2)} vs rata ${fitur.volMean.toFixed(2)}), harga bertahan di bawah level${P.closeDistAtr >= -0.08 ? ' (menempel tanpa reclaim) dalam tren turun' : ''} -> likuiditas long habis, lanjut turun -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
    }
    pelajaran.push('SG-L1', 'SG-L2', 'SG-L7')
    alasan.push(`SG-L7 SABAR-MENUNGGU: pool ${P.jenis} baru disapu (${P.barsSince} candle) belum ada reclaim dan anatomi belum menentukan -> WAIT, masuk hanya bila tutup reclaim di atas level ${P.level.toFixed(2)}`)
    return mk(versi, 'WAIT', 'NAIK', TARGET_DISIPLIN, P.level, poolRec, grabTerjadi, 'BELUM-JELAS', cara, pelajaran, alasan, fitur, 2)
  }

  // ===== SIDE ATAS (buy-side liquidity) =====
  if (P.reclaimed) {
    const kuat = P.closeDistAtr >= 0.3 && P.volZSweep >= 1 && (P.barsSince === 0 || P.postVolMean >= fitur.volMean * 0.85)
    if (kuat) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L3')
      alasan.push(`SG-L3 TANDA-REVERSAL (cermin): sapuan pool ${P.jenis} ditutup balik DI BAWAH level (tutup ${P.closeDistAtr.toFixed(2)} ATR, volume sapu z=${P.volZSweep.toFixed(1)}) -> stop short sudah dipanen, buyer trap terjebak -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
    }
    // SG-L10a: sapuan segar (<= 1 candle) yang DITOLAK KERAS — wick atas panjang,
    // tutup jauh di bawah level — penolakan itu sendiri adalah bukti (tanpa gerbang volume)
    const idxSweep = cs.length - 1 - P.barsSince
    const swC = cs[idxSweep]
    const wickSweep = swC ? (swC.h - Math.max(swC.o, swC.c)) / atr : 0
    if (P.barsSince <= 1 && P.closeDistAtr >= 0.5 && wickSweep >= 0.5) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L10')
      alasan.push(`SG-L10 SAPUAN-DITOLAK: sapuan ${P.jenis} segar (${P.barsSince} candle) ditolak keras — wick atas ${wickSweep.toFixed(2)} ATR, tutup ${P.closeDistAtr.toFixed(2)} ATR di bawah level -> stop short terpanen, buyer breakout terjebak -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
    }
    // SG-L10b: harga WANNA di atas pool lalu candle terakhir CROSS-BACK ke bawah
    // = breakout gagal — penolakan terjadi SAAT INI (tanpa gerbang volume)
    const last = cs[cs.length - 1]
    const prevC = cs.length >= 2 ? cs[cs.length - 2].c : last.c
    const wickLast = (last.h - Math.max(last.o, last.c)) / atr
    if (prevC > P.level && last.c < P.level && P.closeDistAtr >= 0.2 && wickLast >= 0.35) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L10')
      alasan.push(`SG-L10 CROSS-BACK: harga bertahan di atas pool ${P.jenis} (${P.level.toFixed(2)}) lalu candle terakhir ditutup balik DI BAWAHNYA (wick atas ${wickLast.toFixed(2)} ATR) = breakout gagal, likuiditas short sudah diambil -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
    }
    // v2.9.4 (bedah hakim-sh400 #54): penolakan DENGAN PENGIKUT (volume jual
    // pasca-sapu >= 0.85x rata + badan tindak-lanjut >= 0.65 ATR) = reversal sah
    // -> TURUN, walau sapuannya sunyi (volZ rendah).
    const pengikutT = P.barsSince >= 1 && P.postVolMean >= fitur.volMean * 0.85
    if (pengikutT && P.postBounceMaxBodyAtr >= 0.65 && P.closeDistAtr >= 0.1) {
      pelajaran.push('SG-L1', 'SG-L2', 'SG-L3')
      alasan.push(`SG-L3 REJECT-BERPENGIKUT (cermin): tutup ${P.closeDistAtr.toFixed(2)} ATR di bawah level, volume jual pasca-sapu ${P.postVolMean.toFixed(2)} (rata ${fitur.volMean.toFixed(2)}) + badan tindak-lanjut ${P.postBounceMaxBodyAtr.toFixed(2)} ATR -> penolakan ${P.jenis} disupport penjualan -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
    }
    // v2.9.2 (cermin): penolakan lemah di TREN TURUN (mom50 <= -0.5) = distribusi
    // setelah grab buy-side -> lanjut TURUN; di konteks netral/naik = bahan bakar beli.
    if (fitur.mom50Atr <= -0.5) {
      pelajaran.push('SG-L6')
      alasan.push(`SG-L6 DISTRIBUSI-REJECT: penolakan lemah (${P.closeDistAtr.toFixed(2)} ATR) di bawah level TAPI konteks tren turun (mom50 ${fitur.mom50Atr.toFixed(1)} ATR) -> sapuan di atas ${P.jenis} adalah distribusi; likuiditas beli habis -> ENTRY TURUN`)
      return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
    }
    pelajaran.push('SG-L1', 'SG-L2', 'SG-L5')
    alasan.push(`SG-L5 RECLAIM-PALSU (cermin): tutup hanya ${P.closeDistAtr.toFixed(2)} ATR di bawah level = penolakan tanpa kekuatan -> grab jadi bahan bakar pembelian -> ENTRY NAIK`)
    return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
  }
  if (fitur.consecUpBig >= 4 && P.depthAtr >= 1.0) {
    pelajaran.push('SG-L1', 'SG-L2', 'SG-L9')
    alasan.push(`SG-L9 SHORT-SQUEEZE: ${fitur.consecutiveUp} hijau berturut + klimaks (z=${fitur.lastVolZ.toFixed(1)}) di atas pool ${P.jenis} -> likuidasi short berantai habis -> ENTRY TURUN (tangkap puncak squeeze)`)
    return mk(versi, 'ENTRY', 'TURUN', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'REVERSAL', cara, pelajaran, alasan, fitur, 3)
  }
  if (fitur.mom50Atr >= 1.2 && P.depthAtr <= 2.8) {
    pelajaran.push('SG-L1', 'SG-L2', 'SG-L6')
    alasan.push(`SG-L6 VAKUM-ATAP: tren naik kuat (mom50 ${fitur.mom50Atr.toFixed(1)} ATR), sapuan di atas ${P.jenis} diserap tanpa kepanikan = launchpad kelanjutan -> ENTRY NAIK`)
    return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
  }
  const gagalFade = P.barsSince >= 2 && P.postBounceMaxBodyAtr <= 0.3 && P.postVolMean <= fitur.volMean * 1.05 && P.closeDistAtr >= 0.08
  if (gagalFade) {
    pelajaran.push('SG-L1', 'SG-L2', 'SG-L4')
    alasan.push(`SG-L4 GRAB-BAHAN-BAKAR (cermin): sapuan di atas atap TANPA ditutup balik, fade kering (badan maks ${P.postBounceMaxBodyAtr.toFixed(2)} ATR) -> vakum likuiditas -> lanjut naik -> ENTRY NAIK`)
    return mk(versi, 'ENTRY', 'NAIK', TARGET_DISIPLIN, undefined, poolRec, grabTerjadi, 'CONTINUATION', cara, pelajaran, alasan, fitur, 3)
  }
  pelajaran.push('SG-L1', 'SG-L2', 'SG-L7')
  alasan.push(`SG-L7 SABAR-MENUNGGU (cermin): pool ${P.jenis} baru disapu ke atas, belum ditutup balik -> WAIT, masuk short hanya bila tutup kembali di bawah level ${P.level.toFixed(2)}`)
  return mk(versi, 'WAIT', 'TURUN', TARGET_DISIPLIN, P.level, poolRec, grabTerjadi, 'BELUM-JELAS', cara, pelajaran, alasan, fitur, 2)
}

function mk(
  versi: string, aksi: 'ENTRY' | 'WAIT' | 'SKIP', arah: 'NAIK' | 'TURUN', targetPct: number,
  triggerLevel: number | undefined, pool: SgKeputusan['pool'], terjadi: boolean,
  post: 'REVERSAL' | 'CONTINUATION' | 'BELUM-JELAS', cara: string, pelajaran: string[],
  alasan: string[], fitur: SgVision, score: number,
): SgKeputusan {
  return {
    versi, aksi, arah, targetPct, triggerLevel, score, pool,
    grab: { terjadi, post, cara }, pelajaranAktif: pelajaran, alasan, fitur,
  }
}

// ------------------------------------------------------------
// BASELINE jujur untuk pembanding
// ------------------------------------------------------------

/** selalu ikut arah breakdown/breakout tanpa otak (sudah = CORE) */
export const sgBaselineCore = sgCore
