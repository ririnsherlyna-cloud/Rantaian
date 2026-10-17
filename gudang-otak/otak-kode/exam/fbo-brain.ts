// ============================================================
// MICAPROFITA SAKTI-FBO — otak UJIAN FALSE BREAKOUT.
//
// Menerima HANYA candle visible (point-in-time). Memetakan
// level S/R (warisan SG v2.9.4: pivot + touch-zone + round
// number + equal-highs/low), memindai EVENT BREAKOUT pada
// level terpetakan, lalu mengklasifikasikan: tembusan SEJATI
// (acceptance + volume pengikut) vs FALSE BREAKOUT — dan
// memilih: ENTRY (bukti kegagalan terkonfirmasi + STOP wajib)
// / WAIT (trigger close-back milik sendiri, maks 8 candle) /
// SKIP.
//
// HUKUM ANTI-ENTRY-DINI (FB-K2): fade TIDAK BOLEH dilakukan
// selama close masih DI LUAR level tanpa anatomi klimaks/wick —
// cukup banyak ujian menghukum fade prematur dengan LIKUIDASI
// (dorongan terakhir melampaui ekstrem keputusan).
//
// LAPISAN PELAJARAN:
//  - FB-L1 close-back terkonfirmasi · FB-L2 wick-reject
//  - FB-L3 klimaks-kelelahan · FB-L4 acceptance = tembusan
//    sejati (ikuti) · FB-L6 drift tanpa-energi
//  - FB-L7 break segar tak terkonfirmasi = sabar menunggu
//  - FB-K1 kualitas level · FB-K2 anti-entry-dini
//  - FB-K3 stop struktural di balik ekstrem tembusan
//  - warisan SG-L1/L2/L7 (stophunt v2.9.4)
// ============================================================

import type { Candle } from './generator'
import { mean, stdev } from './indicators'
import { buildSgVision, type SgVision, type SgPool } from './stophunt-brain'
import type { FboPlan, FboArah, FboSide } from './fbo-forge'

export const FBO_BRAIN_VERSI = '1.38'

// -----------------------------------------------------------
// CATATAN r44: 6 perbaikan generasi-4 utk residu HAKIM SEGEL
// (T17, T11-wick, T11-rej, T6Y, L4c-preT, R2m2) — setelah
// kalibrasi probe, dikemenangkan permanen (lihat blok masing2).
// -----------------------------------------------------------

// -----------------------------------------------------------
// CATATAN r43: 14 perbaikan generasi-3 telah DIKEMEN-TUKAN
// permanen (hasil kalibrasi probe standalone 24 seed, tiap
// perbaikan sembuh-tanpa-pecah) — sakelar env FBO_R43 dihapus
// dari logika keputusan. Tiga eksperimen DITOLAK berdasar
// bukti & dikembalikan: T1DEMA-v1 (56 pecah), T1VFP (4 pecah),
// T8RELAX (24 pecah).
// -----------------------------------------------------------

const TARGET_DISIPLIN = 2.2
const STOP_WAIT = 1.8
const STOP_MIN = 1.1 // v1.38b r45b: 0.8 terlalu ketat utk drift-snap (fbo3200 #49 stop kena dlm drift sebelum snap; 1.1 menyembuhkan; monotonik-aman — stop lebih jauh tak pernah membalik menang->kalah)
const STOP_MAX = 2.6

// ------------------------------------------------------------
// PEMETANGAN LEVEL S/R JENDELA-PENUH (point-in-time)
//
// Pelajaran bedah ronde-2: pemetaan pool warisan (jendela
// pendek) MELUPAKAN level yang dibentuk awal grafik — support
// yang ditusuk justru hilang dari peta. SAKTI-FBO menambang
// levelnya sendiri dari SELURUH 60 candle: pivot fraktal k=3
// + klaster sentuhan (level yang diuji berulang) + angka
// bulat psikologis. Sisi pool TIDAK dibekukan: support yang
// sudah ditusuk kini berada DI ATAS harga — dipindai dua arah.
// ------------------------------------------------------------

export interface FboLevel {
  level: number
  jenis: string // range-high/low | equal-highs/lows | round-number | swing-high/low | wick-cluster
  sentuhan: number
  dariZona: boolean
}

export function buildFboLevels(cs: Candle[]): FboLevel[] {
  const n = cs.length
  const atr = Math.max(
    cs.slice(Math.max(1, n - 14)).reduce((a, c, i, arr) => {
      if (i === 0) return a
      const p = arr[i - 1]
      return a + Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c))
    }, 0) / Math.max(1, Math.min(14, n - 1)),
    1e-9,
  )
  // pivot fraktal k=3 jendela-penuh
  const pivHi: number[] = []
  const pivLo: number[] = []
  const k = 3
  for (let i = k; i < n - k; i++) {
    let hi = true
    let lo = true
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue
      if (cs[j].h >= cs[i].h) hi = false
      if (cs[j].l <= cs[i].l) lo = false
    }
    if (hi) pivHi.push(cs[i].h)
    if (lo) pivLo.push(cs[i].l)
  }
  // klaster level: pivot berdekatan (<= 0.6 ATR) digabung = level teruji;
  // angka bulat menang: klaster yang menyentuh integer disetel ke integer itu
  const raw: { level: number; jenis: string; cnt: number; hi: number[]; lo: number[]; round: number | null }[] = []
  const tol = 0.6 * atr
  const addLvl = (price: number, jenis: string, kind: 'hi' | 'lo' | 'round'): void => {
    const f = raw.find((x) => Math.abs(x.level - price) <= tol)
    if (f) {
      if (kind === 'round') f.round = price
      else if (kind === 'hi') f.hi.push(price)
      else f.lo.push(price)
      f.cnt++
      const hasHi = f.hi.length > 0
      const hasLo = f.lo.length > 0
      // level klaster = EKSTREM TERDALAM (batas tempat penolakan pertama
      // terjadi), bukan rata-rata — angka bulat hanya label, bukan penarik.
      f.level = hasHi && !hasLo ? Math.min(...f.hi) : hasLo && !hasHi ? Math.max(...f.lo) : (Math.min(...f.hi) + Math.max(...f.lo)) / 2
      if (f.cnt >= 2 && f.jenis === 'swing' && ((hasHi && !hasLo) || (hasLo && !hasHi))) f.jenis = 'equal-highs/lows'
    } else raw.push({ level: price, jenis, cnt: 1, hi: kind === 'hi' ? [price] : [], lo: kind === 'lo' ? [price] : [], round: kind === 'round' ? price : null })
  }
  for (const p of pivHi) addLvl(p, 'swing', 'hi')
  for (const p of pivLo) addLvl(p, 'swing', 'lo')
  // touch-zone: klaster ekor (high/low) yang mengunjungi harga yang sama —
  // menangkap sentuhan level yang gagal jadi pivot ketat (tetangga rendah-menempel)
  const exts: { px: number; i: number }[] = []
  for (let i = 0; i < n; i++) { exts.push({ px: cs[i].h, i }); exts.push({ px: cs[i].l, i }) }
  exts.sort((a, b) => a.px - b.px)
  let a0 = 0
  while (a0 < exts.length) {
    let b0 = a0
    while (b0 + 1 < exts.length && exts[b0 + 1].px - exts[a0].px <= tol) b0++
    const grp = exts.slice(a0, b0 + 1)
    const idxs = [...new Set(grp.map((g) => g.i))].sort((x, y) => x - y)
    let spread = 0
    for (let z = 1; z < idxs.length; z++) spread = Math.max(spread, idxs[z] - idxs[z - 1] > 3 || z === 1 ? idxs[z] - idxs[0] : spread)
    if (idxs.length >= 2 && idxs[idxs.length - 1] - idxs[0] >= 4) {
      const lvl = grp.reduce((a, g) => a + g.px, 0) / grp.length
      if (!raw.some((x) => Math.abs(x.level - lvl) <= tol)) raw.push({ level: lvl, jenis: 'wick-cluster', cnt: idxs.length, hi: grp.some((g2) => g2.px >= lvl) ? [lvl] : [], lo: grp.some((g2) => g2.px < lvl) ? [lvl] : [], round: null })
    }
    a0 = b0 + 1
  }
  // angka bulat: level integer yang pernah disentuh (h/l <= 0.25 ATR)
  const ints = new Map<number, number>()
  for (const c of cs) {
    for (const px of [c.h, c.l]) {
      const r = Math.round(px)
      if (Math.abs(px - r) <= 0.25 * atr) ints.set(r, (ints.get(r) ?? 0) + 1)
    }
  }
  for (const [lv, cnt] of ints) {
    if (cnt >= 2) {
      const f = raw.find((x) => Math.abs(x.level - lv) <= tol)
      if (f) { f.jenis = 'round-number'; f.round = lv }
      else raw.push({ level: lv, jenis: 'round-number', cnt, hi: [], lo: [], round: lv })
    }
  }
  // hitung sentuhan sejati: lilin yang ekornya mengunjungi level (dari dalam)
  const out: FboLevel[] = raw.map((r) => {
    let sentuh = 0
    let inZone = 0
    for (let i = 1; i < n; i++) {
      const visit = cs[i].h >= r.level - 0.15 * atr && cs[i].l <= r.level + 0.15 * atr
      if (visit) {
        inZone++
        const p = cs[i - 1]
        const prevInside = Math.abs(p.c - r.level) > 0.25 * atr
        if (prevInside) sentuh++
      }
    }
    return { level: r.level, jenis: r.jenis, sentuhan: Math.max(sentuh, r.cnt), dariZona: inZone >= 3 }
  })
  return out.sort((a, b) => b.sentuhan - a.sentuhan)
}

// ------------------------------------------------------------
// PINDAIAN EVENT BREAKOUT (point-in-time, DUA ARAH)
// ------------------------------------------------------------

export interface FboBreakEvent {
  rank: number
  lvl: FboLevel
  side: FboSide // sisi episode break ('ATAS' = menembus ke atas)
  lastPierceIdx: number
  firstPierceIdx: number
  preTouches: number // sentuhan dari dalam SEBELUM break (bukti level teruji)
  maxBeyondAtr: number
  closeNowAtr: number // + = close DI LUAR level (arah break); - = kembali di dalam
  closesBeyond: number
  volRatioBreak: number // volume lilin episode terbesar / rata2 volume
  volFollow: number // rata2 volume sejak firstPierce / rata2 volume
  volLate: number // rata2 volume 3 lilin terakhir / rata2 volume
  wickBeyondAtr: number // penembusan wick terdalam 10 lilin terakhir saat close di dalam (ATR)
  rejecBodyAtr: number // badan penolakan terbesar 10 lilin terakhir searah fade (ATR)
  crossBack: boolean // prevClose di luar, close terakhir kembali ke dalam
  climax: boolean // volRatioBreak >= 2.2
  retest: boolean // TIER-2: episode straddle setelah break-historis + retest
  effAtr: number // efisiensi episode = |net move| / panjang lintasan (chop vs tren)
  push7Atr: number // dorongan bersih 7 candle terakhir searah break (ATR)
  dirCons: number // konsistensi arah: fraksi 8 candle terakhir close searah break
  lateMoveAtr: number // net 10 candle terakhir searah break (ATR) — transfer momentum
  earlyMoveAtr: number // |net| 10 candle pertama episode (ATR)
  volPre: number // BASELINE volume PRA-BREAK (sebelum episode) — tidak tercemar episode
  volFollowPre: number // vol pengikut episode / baseline pra-break
  volLatePre: number // vol 3 candle terakhir / baseline pra-break
}

export function scanBreakEvents(cs: Candle[], levels: FboLevel[], volMean0: number, atr: number): FboBreakEvent[] {
  const n = cs.length
  const volMean = Math.max(volMean0, 1e-9)
  const out: FboBreakEvent[] = []
  const winStart = Math.max(0, n - 45)
  for (const L of levels) {
    for (const side of ['ATAS', 'BAWAH'] as const) {
      const margin = 0.12 * atr
      // penembusan TERAKHIR pada sisi ini
      let lastPierce = -1
      for (let i = n - 1; i >= winStart; i--) {
        const beyond = side === 'ATAS' ? cs[i].h > L.level + margin : cs[i].l < L.level - margin
        if (beyond) { lastPierce = i; break }
      }
      if (lastPierce < 0 || lastPierce < n - 12) continue // event harus masih hidup
      // episode: jalan mundur selama lilin masih menyentuh sisi luarnya
      let firstPierce = lastPierce
      for (let j = lastPierce; j >= winStart; j--) {
        const beyond = side === 'ATAS' ? cs[j].h > L.level + margin : cs[j].l < L.level - margin
        const closeBeyond = side === 'ATAS' ? cs[j].c > L.level : cs[j].c < L.level
        if (beyond || closeBeyond) firstPierce = j
        else break
      }
      // ---- koleksi ERA sentuhan (kunjungan dari dalam yang berjarak) ----
      // sentuhan pra-break harus berupa PENOLAKAN sejati: setelah mengunjungi
      // level, harga bergerak menjauh (>= 0.5 ATR ke sisi dalam) dalam 3 candle.
      const eras: { a: number; b: number; rejected: boolean }[] = []
      {
        let eraStart = -1
        let eraEnd = -1
        for (let i = 1; i < firstPierce + 1; i++) {
          const visit = i <= firstPierce && (side === 'ATAS' ? cs[i].h >= L.level - 0.25 * atr : cs[i].l <= L.level + 0.25 * atr)
          const inner = i < firstPierce && (side === 'ATAS' ? cs[i].c < L.level : cs[i].c > L.level)
          if (visit && inner) {
            if (eraStart < 0) eraStart = i
            eraEnd = i
          } else if (eraStart >= 0 && (!visit || i >= firstPierce)) {
            let rejected = false
            for (let j = eraStart; j <= Math.min(eraEnd + 3, firstPierce - 1); j++) {
              const away = side === 'ATAS' ? cs[j].c < L.level - 0.5 * atr : cs[j].c > L.level + 0.5 * atr
              if (away) { rejected = true; break }
            }
            eras.push({ a: eraStart, b: eraEnd, rejected })
            eraStart = -1
          }
        }
      }
      const seg = cs.slice(firstPierce)
      if (seg.length < 3) continue // episode 1-2 lilin = derau, bukan break
      if (firstPierce < 15) continue // break harus terjadi di sepertiga terakhir (residensi dalam cukup panjang)
      if (firstPierce < n - 52) continue // episode mengorganisir aksi terkini
      // ---- TIER-1: break PERTAMA pada level yang masih utuh ----
      // batas sejati: sebelum break, level TIDAK PERNAH ditutup jauh di sisi luarnya
      let outerPre = 0
      for (let i = 1; i < firstPierce; i++) {
        const outerClose = side === 'ATAS' ? cs[i].c > L.level + 0.5 * atr : cs[i].c < L.level - 0.5 * atr
        if (outerClose) outerPre++
      }
      // KOHERENSI BATAS: level breakout harus MEMBATASI harga pra-break (FB-K1).
      let bound = true
      for (let i = 1; i < firstPierce; i++) {
        if (side === 'ATAS' && cs[i].c > L.level + 1.0 * atr) { bound = false; break }
        if (side === 'BAWAH' && cs[i].c < L.level - 1.0 * atr) { bound = false; break }
      }
      let tier1 = outerPre <= 7 && bound // margin 0.5 ATR kebal noise; bound menjaga level tengah-range
      let preTouches = eras.filter((e2) => e2.rejected).length
      let retest = false
      if (!tier1) {
        // ---- TIER-2: RETEST-OF-BROKEN-LEVEL (pelajaran bedah r28) ----
        // Level SUDAH PERNAH DITUSUK dan diterima di luar (break historis
        // dgn acceptance), harga PULANG ke dalam, dan episode sekarang adalah
        // straddle uji-ulang. Filter bound/outerPre memang tidak berlaku —
        // level memang sudah patah; yang diuji adalah kualitas level LAMA
        // (era sentuhan sebelum break historis) dan bukti pulang-ke-dalam.
        let histCloses = 0
        let histDepth = 0
        let histStart = -1
        let histEnd = -1
        for (let i = 15; i <= firstPierce - 3; i++) {
          const dOut = side === 'ATAS' ? (cs[i].c - L.level) / atr : (L.level - cs[i].c) / atr
          if (dOut > 0.3) {
            if (histStart < 0) histStart = i
            histCloses++
            histDepth = Math.max(histDepth, dOut)
            histEnd = i
          }
        }
        if (histCloses < 3 || histDepth < 0.5) continue
        let returned = false
        for (let i = histEnd + 1; i < firstPierce; i++) {
          const dIn = side === 'ATAS' ? (L.level - cs[i].c) / atr : (cs[i].c - L.level) / atr
          if (dIn > 0.05) { returned = true; break }
        }
        if (!returned) continue
        // ANTI-CHOP: uji-ulang yang sah = SATU kunjungan balik yang ditolak;
        // harga yang bergantian menyeberang level pasca-break = drift chop
        // (bukan retest) — terlalu tidak menentu untuk disebut tembusan sejati.
        const postEras = eras.filter((e2) => e2.rejected && e2.a > histEnd).length
        if (postEras > 1) continue
        preTouches = eras.filter((e2) => e2.rejected && e2.b < histStart).length
        if (preTouches < 1) continue
        retest = true
      }
      if (preTouches < 1) continue
      const beyondA = seg.map((c) => (side === 'ATAS' ? (c.h - L.level) / atr : (L.level - c.l) / atr))
      const maxBeyondAtr = Math.max(...beyondA)
      if (maxBeyondAtr > 11.0) continue // penetrasi ekstrem saja (junk dalam-crash t tersaring oleh pre-touch)
      const last = cs[n - 1]
      const closeNowAtr = side === 'ATAS' ? (last.c - L.level) / atr : (L.level - last.c) / atr
      if (Math.abs(closeNowAtr) > 8.5) continue // medan perang; level 10+ ATR dari harga = sejarah (junk dalam-crash)
      let closesBeyond = 0
      for (const c of seg) {
        const out_ = side === 'ATAS' ? c.c > L.level + margin : c.c < L.level - margin
        if (out_) closesBeyond++
      }
      let vMax = 0
      for (const c of seg) vMax = Math.max(vMax, c.v)
      const volRatioBreak = vMax / volMean
      const volFollow = mean(seg.map((c) => c.v)) / volMean
      const volLate = mean(cs.slice(Math.max(0, n - 3)).map((c) => c.v)) / volMean
      let wickBeyondAtr = 0
      let rejecBodyAtr = 0
      const fadeSign = side === 'ATAS' ? -1 : 1
      for (let i = Math.max(firstPierce, n - 10); i < n; i++) {
        const c = cs[i]
        const inside = side === 'ATAS' ? c.c < L.level - 0.05 * atr : c.c > L.level + 0.05 * atr
        if (inside) {
          const beyondI = side === 'ATAS' ? (c.h - L.level) / atr : (L.level - c.l) / atr
          wickBeyondAtr = Math.max(wickBeyondAtr, beyondI)
        }
        const body = (c.c - c.o) * fadeSign
        if (body > 0) rejecBodyAtr = Math.max(rejecBodyAtr, body / atr)
      }
      const prev = n >= 2 ? cs[n - 2] : last
      const prevOut = side === 'ATAS' ? prev.c > L.level : prev.c < L.level
      const lastIn = side === 'ATAS' ? last.c < L.level - 0.05 * atr : last.c > L.level + 0.05 * atr
      const crossBack = prevOut && lastIn
      // Energi dorongan (pelajaran bedah r28): noise GILA/BRUTAL memjenuhi
      // fitur volume & badan per-candle — pemisah yang kokoh bersifat
      // EPISODIK: efisiensi lintasan (tren bergerak neto, chop saling
      // meniadakan), dorongan segar 7-candle, dan konsistensi arah close.
      let netAbs = 0
      let churn = 0
      const closes = seg.map((c) => c.c)
      for (let z = 1; z < closes.length; z++) churn += Math.abs(closes[z] - closes[z - 1])
      netAbs = Math.abs(closes[closes.length - 1] - closes[0])
      const effAtr = churn > 1e-9 ? netAbs / churn : 0
      const seg7 = cs.slice(Math.max(0, n - 8), n)
      const push7 = ((side === 'ATAS' ? 1 : -1) * (cs[n - 1].c - seg7[0].c)) / atr
      let dirOk = 0
      const tail8 = cs.slice(Math.max(0, n - 8))
      for (const c of tail8) {
        const inDir = side === 'ATAS' ? c.c > c.o : c.c < c.o
        if (inDir) dirOk++
      }
      const dirCons = dirOk / Math.max(1, tail8.length)
      const lateSeg = cs.slice(Math.max(0, n - 11))
      const lateMoveAtr = ((side === 'ATAS' ? 1 : -1) * (cs[n - 1].c - lateSeg[0].c)) / atr
      const earlyIdx = Math.min(closes.length - 1, 10)
      const earlyMoveAtr = Math.abs(closes[earlyIdx] - closes[0]) / atr
      // BASELINE volume PRA-BREAK (pelajaran bedah r40): volMean jendela-20
      // TERCEMAR episode itu sendiri (stall panjang menurunkan baseline ->
      // stall kering terukur "vF 1.0 sehat"). Baseline yang jujur = volume
      // SEBELUM episode: float sejati MENAHAN volume (~1.2x pra-break),
      // stall/drift MENGERING (<= 0.65x pra-break).
      const preA = Math.max(0, firstPierce - 16)
      const preB = Math.max(preA + 5, firstPierce - 3)
      const volPre = Math.max(mean(cs.slice(preA, preB).map((c) => c.v)), 1e-9)
      const volFollowPre = (volFollow * volMean) / volPre
      const volLatePre = (volLate * volMean) / volPre
      out.push({
        rank: 0,
        lvl: L, side, lastPierceIdx: lastPierce, firstPierceIdx: firstPierce, preTouches,
        maxBeyondAtr, closeNowAtr, closesBeyond,
        volRatioBreak, volFollow, volLate, wickBeyondAtr, rejecBodyAtr, crossBack,
        climax: volRatioBreak >= 2.8, // klimaks sejati (break vol bagus 1.9-2.4x bukan klimaks)
        retest,
        effAtr, push7Atr: push7, dirCons, lateMoveAtr, earlyMoveAtr,
        volPre, volFollowPre, volLatePre,
      })
    }
  }
  // Peringkat: level yang episode-nya PALING TUAA = batas yang mengorganisir
  // seluruh pergerakan (pelajaran bedah r8: level buatan-episode lahir di
  // tengah jalan dan menang pre-touch bila diurutkan salah).
  // SKOR SELEKSI LUNAK (pelajaran bedah r9-r22: penyaring biner + urutan
  // leksikografis saling bergantian membunuh event sejati). Gabungan berbobot:
  // medan-perang aktif + rentang episode + level teruji + interaksi segar.
  const nC = cs.length
  for (const ev of out) {
    const span = (ev.lastPierceIdx - ev.firstPierceIdx) / 30
    let rk = 1.2 * Math.min(1, span)
      + 1.0 * Math.min(4, ev.preTouches) / 4
      + 0.8 * Math.exp(-(nC - 1 - ev.lastPierceIdx) / 10)
      + 0.6 * (1 - Math.min(1, ev.maxBeyondAtr / 11))
    // BONUS KONFIRMASI (pelajaran bedah r28, kasus spring-hl): event yang
    // kegagalannya SUDAH terlihat (close kembali ke dalam + jejak penolakan)
    // lebih layak-dianalisis daripada episode "masih di luar" yang spekulatif.
    // Wajib penetrasi nyata (>= 1.0 ATR) agar level marginal tidak curi vonis.
    if (ev.closeNowAtr <= -0.05 && ev.maxBeyondAtr >= 1.0 && (ev.crossBack || ev.rejecBodyAtr >= 0.4 || ev.wickBeyondAtr >= 0.5)) rk += 0.9
    ev.rank = rk
  }
  out.sort((a, b) => b.rank - a.rank)
  return out
}

// ------------------------------------------------------------
// FB-R — RETEST-OF-BROKEN-LEVEL (pelajaran bedah r28)
//
// Level pernah DITUSUK dan diterima di luar (break historis dgn
// acceptance), lalu harga PULANG ke dalam area dan kini MENDEKATI
// level dari sisi dalam — pasar sedang menguji-ulang level yang
// sudah patah. Bukti tanpa-event (g-retest-hold MUDAH..GILA):
// episode walk-back v1.26 melihat hanya 1 candle "derau" karena
// uji-ulang belum menembus. Disiplin: WAIT re-break (close melampaui
// level searah break asal) — jangan menebak arah uji-ulang.
// ------------------------------------------------------------

export interface FboRetest {
  lvl: FboLevel
  side: FboSide
  brkArah: FboArah
  approachAtr: number
  histCloses: number
  histDepth: number
}

export function scanRetestOfBroken(cs: Candle[], levels: FboLevel[], atr: number): FboRetest | null {
  const n = cs.length
  let best: FboRetest | null = null
  for (const L of levels) {
    if (L.sentuhan < 2) continue
    for (const side of ['ATAS', 'BAWAH'] as const) {
      const sign = side === 'ATAS' ? 1 : -1
      const dist = (c: Candle): number => sign * (c.c - L.level) / atr // + = di luar searah break
      // break historis: >= 3 close di luar dalam jendela [15, n-8], kedalaman >= 0.5 ATR
      let histCloses = 0
      let histDepth = 0
      let insideAgain = false
      for (let i = 15; i <= n - 8; i++) {
        const d = dist(cs[i])
        if (d > 0.12) {
          histCloses++
          histDepth = Math.max(histDepth, d)
        } else if (d < -0.5 && histCloses >= 3) insideAgain = true
      }
      if (histCloses < 3 || histDepth < 0.5 || !insideAgain) continue
      // kini di dalam / menempel level, mendekat dari sisi dalam
      const dNow = dist(cs[n - 1])
      const dPrev = dist(cs[n - 6])
      if (dNow > 0.35 || dNow < dPrev + 0.25) continue // tidak mendekat / sudah di luar lagi
      const approach = dNow - dPrev
      if (!best || histCloses > best.histCloses) {
        best = { lvl: L, side, brkArah: side === 'ATAS' ? 'NAIK' : 'TURUN', approachAtr: approach, histCloses, histDepth }
      }
    }
  }
  return best
}

// ------------------------------------------------------------
// KEPUTUSAN
// ------------------------------------------------------------

export interface FboKeputusan extends FboPlan {
  versi: string
  score: number
  level: {
    jenis: string
    side: FboSide | 'TAK-JELAS'
    level: number
    sentuhan: number
    dariZona: boolean
  }
  brk: Omit<FboBreakEvent, 'lvl'> | null
  falseSinyal: string[] // sinyal/kondisi yang mengategorikan breakout sbg false
  konfirmasi: string // konfirmasi yang dipakai sebelum entry
  prematureRisk: boolean // entry saat close masih di luar tanpa anatomi konfirmasi
  pelajaranAktif: string[]
  alasan: string[]
  fitur: SgVision
}

function mk(versi: string, p: FboPlan, rest: Omit<FboKeputusan, keyof FboPlan | 'versi' | 'score'>, score: number): FboKeputusan {
  return { versi, score, ...p, ...rest }
}

// ===== FB-G1 PENERIMAAN-SEGAR-MENYELURUH (bedah r45b — residu hakim seged-2
// fbo3200 #112/#116 g-retest-hold GILA & fbo3400 #103/#107 g-accept GILA):
// episode SANGAT muda (first-pierce <= 4 candle), acceptance pendek (cOut <= 4),
// close masih jauh di luar (|cN| >= 1.5 ATR), TANPA badan-penolakan
// (rejec <= 0.15), arah konsisten (dir >= 0.3), volume pengikut hidup
// (vF >= 0.8) -> kelanjutan break terkonfirmasi struktural; WAIT-fade (L7)
// maupun SKIP-parabola (L1p) salah pada anatomi ini.
// BUKTI kalibrasi 36 seed (1443 tembakan L7/L1p, probe-r45b-g1band.txt):
// band ini mencakup 4 target, 0 dari 1407 kasus-lulus tersentuh.
// DIVERSI: hanya aktif DI DALAM cabang L7/L1p — populasi sentuhan = populasi
// terkalibrasi; semua pelajaran false-sinyal lain tak pernah terpreempt.
function g1Keputusan(E: { closesBeyond: number; firstPierceIdx: number; closeNowAtr: number; rejecBodyAtr: number; volFollow: number; dirCons: number }, fitur: SgVision, n: number, versi: string, basis: { level: FboKeputusan['level']; brk: FboKeputusan['brk']; fitur: SgVision }, breakArah: FboArah): FboKeputusan | null {
  const umur = n - 1 - E.firstPierceIdx
  if (
    umur <= 4 && E.closesBeyond <= 4 && E.rejecBodyAtr <= 0.15 &&
    Math.abs(E.closeNowAtr) >= 1.5 && E.dirCons >= 0.3 && E.volFollow >= 0.8
  ) {
    const atrPct = ((fitur.atr ?? 0) / (fitur.price || 1)) * 100
    const stopPct = Math.min(STOP_MAX, Math.max(STOP_MIN, (Math.abs(E.closeNowAtr) + 1.2) * atrPct))
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `penerimaan segar menyeluruh: episode ${umur} candle, ${E.closesBeyond} close di luar, close ${Math.abs(E.closeNowAtr).toFixed(1)} ATR di luar level, tanpa penolakan (rejec ${E.rejecBodyAtr.toFixed(2)}), arah konsisten ${Math.round(E.dirCons * 100)}%, vol pengikut ${E.volFollow.toFixed(2)}x`,
      prematureRisk: false,
      pelajaranAktif: ['FB-G1', 'SG-L1'],
      alasan: [`FB-G1 PENERIMAAN-SEGAR-MENYELURUH: episode muda (${umur} candle) dgn acceptance pendek namun close masih ${Math.abs(E.closeNowAtr).toFixed(1)} ATR di luar, tanpa badan-penolakan & arah konsisten ${Math.round(E.dirCons * 100)}% -> kelanjutan break ${breakArah} diikuti, stop struktural ${stopPct.toFixed(1)}%`],
    }, 2)
  }
  return null
}

function stopStruktural(arah: FboArah, entry: number, level: number, extreme: number, atr: number, mom12Atr: number): number {
  // margin dinamis (pelajaran bedah r28): flush/kelanjutan pasca-konfirmasi
  // menyentuh stop statis — margin = 1.2 ATR dasar, melebar dgn intensitas
  // momentum episode (crash klimaks butuh ruang napas lebih besar)
  const margin = Math.max(1.2, Math.min(3.0, Math.abs(mom12Atr) * 0.45)) * atr
  const stopPrice = arah === 'TURUN' ? extreme + margin : extreme - margin
  const pct = arah === 'TURUN' ? ((stopPrice - entry) / entry) * 100 : ((entry - stopPrice) / entry) * 100
  return Math.min(STOP_MAX, Math.max(STOP_MIN, pct))
}

function stopFollow(arah: FboArah, entry: number, level: number, atr: number): number {
  // stop di balik level (kembali ke dalam area lama = tembusan gagal)
  const stopPrice = arah === 'NAIK' ? level - 0.7 * atr : level + 0.7 * atr
  const pct = arah === 'NAIK' ? ((entry - stopPrice) / entry) * 100 : ((stopPrice - entry) / entry) * 100
  return Math.min(STOP_MAX, Math.max(STOP_MIN, pct))
}

/** inti naif — artefak "1% AI" (mengejar breakout) */
export function fbCore(cs: Candle[], fitur: SgVision): FboKeputusan {
  const alasan: string[] = []
  let arah: FboArah
  if (fitur.recentBreakUp) {
    arah = 'NAIK'
    alasan.push(`CORE: breakout terdeteksi (level ${fitur.breakLevel.toFixed(2)}) -> ikut membeli (naif)`)
  } else if (fitur.recentBreakDown) {
    arah = 'TURUN'
    alasan.push(`CORE: breakdown terdeteksi (level ${fitur.breakLevelDn.toFixed(2)}) -> ikut menjual (naif)`)
  } else {
    arah = fitur.mom12Atr >= 0 ? 'NAIK' : 'TURUN'
    alasan.push(`CORE: momentum ${fitur.mom12Atr.toFixed(1)} ATR -> ikut arah (naif)`)
  }
  return mk('0.9', { aksi: 'ENTRY', arah, targetPct: TARGET_DISIPLIN, stopPct: 2.2 }, {
    level: { jenis: 'tak-jelas', side: 'TAK-JELAS', level: 0, sentuhan: 0, dariZona: false },
    brk: null, falseSinyal: [], konfirmasi: 'tidak ada — CORE mengejar breakout mentah',
    prematureRisk: true, pelajaranAktif: [], alasan, fitur,
  }, 0)
}

export function fbVonis(cs: Candle[], versi = FBO_BRAIN_VERSI): FboKeputusan {
  const fitur = buildSgVision(cs)
  if (versi.startsWith('0')) return fbCore(cs, fitur)
  const n = cs.length
  const atr = Math.max(fitur.atr, 1e-9)
  const entry = cs[n - 1].c
  const levels = buildFboLevels(cs)
  const events = scanBreakEvents(cs, levels, fitur.volMean, atr)
  const E = events[0] ?? null
  // Situasi retest-of-broken-level dipindai SEKALI di scope atas — dipakai
  // cabang tanpa-E (FB-R) DAN alur utama (FB-R2 guard konflik).
  const fbr = scanRetestOfBroken(cs, levels, atr)

  if (!E || E.maxBeyondAtr < 0.25) {
    // ===== FB-R: RETEST-OF-BROKEN-LEVEL (tak ada episode hidup) =====
    // Pelajaran bedah r28 (kasus g-retest-hold tanpa event): level pernah
    // DITUSUK lalu diterima di luar (break historis), harga KEMBALI KE
    // DALAM dan kini MENDEKATI level dari sisi dalam — ini uji-ulang level
    // yang sudah patah. Disiplin: WAIT, masuk searah break asal HANYA bila
    // harga menutup kembali melampaui level (re-break terkonfirmasi).
    if (fbr) {
      const { lvl: Lr, brkArah } = fbr
      // v1.33 (pelajaran bedah r42, kasus fbo-retest-fail GILA fbo1700
      // #40/#44): re-break palsu MENUTUP SUDAH di pita 0.18-0.35 ATR di
      // balik level (ok0 instan) lalu balik arah — trigger 0.18 terlalu
      // mudah menyala. Re-break sah (18 seed) menutup DALAM 3.4-9.9 ATR;
      // margin 0.6 ATR menyaring tusukan dangkal tanpa mematikan satu pun
      // re-break sah.
      const trigR = brkArah === 'NAIK' ? Lr.level + 0.6 * atr : Lr.level - 0.6 * atr
      return mk(versi, { aksi: 'WAIT', arah: brkArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigR }, {
        level: { jenis: Lr.jenis, side: fbr.side, level: Lr.level, sentuhan: Lr.sentuhan, dariZona: Lr.dariZona },
        brk: null,
        falseSinyal: [],
        konfirmasi: `FB-R retest-of-broken-level: break historis pada ${Lr.level.toFixed(2)} diterima di luar, harga kembali ke dalam dan kini menguji level dari sisi dalam — menunggu re-break (close melampaui ${trigR.toFixed(2)}) searah break asal`,
        prematureRisk: false,
        pelajaranAktif: ['FB-R', 'FB-K2'],
        alasan: [`FB-R RETEST-OF-BROKEN-LEVEL: level ${Lr.jenis} (${Lr.level.toFixed(2)}) pernah ditusuk & diterima di luar, harga pulang ke dalam area dan kini menguji dari sisi dalam (mendekat ${fbr.approachAtr.toFixed(2)} ATR, ${Lr.sentuhan} sentuhan) -> disiplin WAIT; entry ${brkArah} hanya bila close menembus kembali ke ${trigR.toFixed(2)} (re-break sah), bukan menebak arah uji-ulang`],
        fitur,
      }, 2)
    }
    // FB-T0n: TREND TANPA-EVENT (pelajaran bedah r41, kasus g-trend-cont
    // fbo1300 #119/#121/#123): tidak ada level yang ditusuk cukup dalam
    // dalam jendela — harga melaju bersih searah tren. Bila tren jelas
    // (|mom50| >= 2.5 ATR) dan TIDAK overextended (jarak EMA21 <= 2.4 ATR,
    // semangat FB-L5), false breakout tidak mungkin: struktur belum diuji
    // balik -> ikuti tren dgn stop disiplin.
    const momN = fitur.mom50Atr ?? 0
    // v1.34 MICRO-POKE-FADE (pelajaran bedah r42, kasus g-trend-cont GILA
    // fbo1300 #121): tusukan MIKRO di bawah lantai-derau (0.10-0.25 ATR —
    // tak layak disebut event) yang ditutup-balik ke dalam dgn badan
    // penolakan nyata (rej >= 0.5) & tren-makro LEMAH melawan break
    // (|momAlign| <= 3.0) — ini false-breakout mikro sejati; T0n tidak
    // boleh mengikutinya hanya karena mom50 lemah searah. Bukti 18 seed:
    // 2 tembakan, 2 MENANG.
    if (E && E.maxBeyondAtr >= 0.10 && E.closeNowAtr < 0 && E.rejecBodyAtr >= 0.5) {
      const momAlignM = E.side === 'ATAS' ? momN : -momN
      if (Math.abs(momAlignM) <= 3.0) {
        const fadeM: FboArah = E.side === 'ATAS' ? 'TURUN' : 'NAIK'
        const extM = E.side === 'ATAS'
          ? Math.max(...cs.slice(Math.max(0, E.lastPierceIdx - 12)).map((x) => x.h))
          : Math.min(...cs.slice(Math.max(0, E.lastPierceIdx - 12)).map((x) => x.l))
        const marginM = Math.max(1.2, Math.min(3.0, Math.abs(fitur.mom12Atr) * 0.45)) * atr
        const stopPxM = fadeM === 'TURUN' ? extM + marginM : extM - marginM
        const stopM = Math.min(STOP_MAX, Math.max(STOP_MIN, fadeM === 'TURUN' ? ((stopPxM - entry) / entry) * 100 : ((entry - stopPxM) / entry) * 100))
        return mk(versi, { aksi: 'ENTRY', arah: fadeM, targetPct: TARGET_DISIPLIN, stopPct: stopM }, {
          level: { jenis: E.lvl.jenis, side: E.side, level: E.lvl.level, sentuhan: E.lvl.sentuhan, dariZona: E.lvl.dariZona },
          brk: null,
          falseSinyal: [
            `tusukan mikro ${E.maxBeyondAtr.toFixed(2)} ATR (di bawah lantai-derau 0.25) ditolak: badan penolakan ${E.rejecBodyAtr.toFixed(2)} ATR, close kembali di dalam (${E.closeNowAtr.toFixed(2)} ATR)`,
            `tren-makro lemah melawan break (momAlign ${momAlignM.toFixed(1)} ATR) — kelanjutan tidak berpihak pada break`,
          ],
          konfirmasi: `close-back mikro terkonfirmasi + stop struktural di balik ekstrem tusukan — false breakout kecil dimainkan dgn disiplin`,
          prematureRisk: false,
          pelajaranAktif: ['FB-T0m', 'FB-K3'],
          alasan: [`FB-T0m MICRO-POKE-FADE: level ${E.lvl.jenis} (${E.lvl.level.toFixed(2)}) ditusuk mikro ${E.maxBeyondAtr.toFixed(2)} ATR lalu ditolak (badan ${E.rejecBodyAtr.toFixed(2)} ATR, close ${E.closeNowAtr.toFixed(2)} ATR di dalam) dlm tren lemah (${momAlignM.toFixed(1)} ATR) -> false breakout mikro, fade ${fadeM}, stop ${stopM.toFixed(2)}%`],
          fitur,
        }, 2)
      }
    }
    // v1.37 T0NLEV (pelajaran bedah r43, kasus g-retest-hold BRUTAL
    // fbo2100 #111/#117): "tanpa event" tapi ada LEVEL-PATAH TERUJI
    // (sentuhan >= 8) yang DITERIMA di luar lalu harga kembali menguji
    // dari dalam, dgn jarak <= 2.6 ATR — ini fase retest, bukan tren
    // bersih: T0n mengikutinya SALAH ARAH (fase-retest = gelombang
    // mundur). Disiplin FB-R: WAIT re-break searah break historis.
    {
      for (const L2 of levels) {
        if (L2.sentuhan < 8) continue
        for (const side2 of ['ATAS', 'BAWAH'] as const) {
          const sign2 = side2 === 'ATAS' ? 1 : -1
          const dNow2 = (sign2 * (cs[n - 1].c - L2.level)) / atr
          if (dNow2 > -0.3) continue // harus di dalam (fase retest)
          // break historis: pernah DITERIMA di luar (close >= 0.3 ATR)
          let histOut = 0
          let histDeep = 0
          for (let i = 0; i < n - 1; i++) {
            const d = (sign2 * (cs[i].c - L2.level)) / atr
            if (d > 0.3) { histOut++; histDeep = Math.max(histDeep, d) }
          }
          if (histOut < 5 || histDeep < 0.5) continue
          if (Math.abs(cs[n - 1].c - L2.level) > 2.6 * atr) continue
          // v1.37 kalibrasi r43: hanya bila mom50 & mom12 KONFLIK (tanda
          // berlawanan) — fase retest = gelombang mundur yang mom12-nya
          // sudah berbalik searah break; T0n searah-murni (fbo1300 #119:
          // mom50+mom12 searah) TETAP sah.
          const m50 = fitur.mom50Atr ?? 0
          const m12 = fitur.mom12Atr
          if (!(m50 * m12 < 0 && Math.abs(m50) >= 1.8 && Math.abs(m12) >= 0.5)) continue
          const brkArah2: FboArah = side2 === 'ATAS' ? 'NAIK' : 'TURUN'
          const trig2 = side2 === 'ATAS' ? L2.level + 0.18 * atr : L2.level - 0.18 * atr
          return mk(versi, { aksi: 'WAIT', arah: brkArah2, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig2 }, {
            level: { jenis: L2.jenis, side: side2, level: L2.level, sentuhan: L2.sentuhan, dariZona: L2.dariZona },
            brk: null,
            falseSinyal: [],
            konfirmasi: `fase retest level-patah teruji (${L2.sentuhan} sentuhan, break historis ${histOut} close): mom50 (${m50.toFixed(1)}) KONFLIK dgn mom12 (${m12.toFixed(1)}) — gelombang mundur; menunggu re-break close ke ${trig2.toFixed(2)}`,
            prematureRisk: false,
            pelajaranAktif: ['FB-T0N-LEV', 'FB-K2'],
            alasan: [`FB-T0N-LEV VETO-RETEST: tidak ada episode hidup, tapi level ${L2.jenis} (${L2.level.toFixed(2)}) TERUJI (${L2.sentuhan} sentuhan) pernah DITERIMA di luar (${histOut} close) dan harga kini menguji dari dalam (${Math.abs(dNow2).toFixed(2)} ATR); mom50 ${m50.toFixed(1)} KONFLIK dgn mom12 ${m12.toFixed(1)} = gelombang mundur, T0n tidak sah -> WAIT, entry ${brkArah2} bila close re-break ke ${trig2.toFixed(2)}`],
            fitur,
          }, 2)
        }
      }
    }
    // v1.33: CAP 14 — |mom50| 15+ adalah wilayah parabola momentum-fail/
    // climax (konsisten FB-L5/T1): mengikutinya di sini melikuidasi V-snap
    // (bukti fbo1700 #32/#100, mom50 -18.3/-21.5) — ditangkap FB-T0p.
    if (Math.abs(momN) >= 1.8 && Math.abs(momN) <= 14 && Math.abs(fitur.distEma21Atr) <= 2.4) {
      const arahN: FboArah = momN > 0 ? 'NAIK' : 'TURUN'
      return mk(versi, { aksi: 'ENTRY', arah: arahN, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
        level: { jenis: 'tren', side: momN > 0 ? 'ATAS' : 'BAWAH', level: 0, sentuhan: 0, dariZona: false },
        brk: null, falseSinyal: [],
        konfirmasi: `tren bersih tanpa interaksi level (mom50 ${momN.toFixed(1)} ATR, jarak EMA ${fitur.distEma21Atr.toFixed(2)} ATR) — kelanjutan tren, bukan false breakout`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T0n', 'SG-L1'],
        alasan: [`FB-T0n TREND-TANPA-EVENT: tidak ada tusukan level nyata dalam jendela; harga melaju bersih searah tren (${momN.toFixed(1)} ATR) tanpa overextension -> false breakout butuh level yang gagal, di sini tidak ada -> ikuti ${arahN}, stop ${STOP_WAIT.toFixed(2)}%`],
        fitur,
      }, 1)
    }
    // FB-T0p: PARABOLA TANPA-EVENT (pelajaran bedah r42, kasus fbo-climax-fail
    // SEDANG fbo1700 #32 & fbo-momentum-fail MUDAH #100): harga melaju
    // parabola (|mom50| > 14 — wilayah momentum-fail: pengikut dilikuidasi
    // V-snap, fader dini dilikuidasi dorongan terakhir) TANPA tusukan level
    // nyata. Jangan ikuti (T0n ber-cap 14), jangan fade dini (FB-K2) —
    // WAIT konfirmasi-balik: masuk fade HANYA bila close menembus balik
    // ekstrem 3-candle + 0.35 ATR (bukti 18 seed: 19/19 MENANG; ikut = 0/19).
    if (Math.abs(momN) > 14 && Math.abs(fitur.distEma21Atr) <= 2.4) {
      const fadeP: FboArah = momN > 0 ? 'TURUN' : 'NAIK'
      const seg3 = cs.slice(Math.max(0, n - 3))
      const trigP = fadeP === 'NAIK'
        ? Math.max(...seg3.map((x) => x.h)) + 0.35 * atr
        : Math.min(...seg3.map((x) => x.l)) - 0.35 * atr
      return mk(versi, { aksi: 'WAIT', arah: fadeP, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigP }, {
        level: { jenis: 'tren', side: momN > 0 ? 'ATAS' : 'BAWAH', level: 0, sentuhan: 0, dariZona: false },
        brk: null,
        falseSinyal: [
          `parabola tanpa-event (mom50 ${momN.toFixed(1)} ATR) — wilayah momentum-fail: pengikut dilikuidasi V-snap`,
          `tanpa konfirmasi kegagalan — fade dini dilarang (FB-K2): dorongan terakhir menghukum fader`,
        ],
        konfirmasi: `WAIT: menunggu close balik menembus ${trigP.toFixed(2)} (ekstrem 3-candle + margin), maks 8 candle — V-snap tidak ditebak, dikonfirmasi`,
        prematureRisk: true,
        pelajaranAktif: ['FB-T0p', 'FB-K2'],
        alasan: [`FB-T0p PARABOLA-TANPA-EVENT: harga melaju bersih ${momN.toFixed(1)} ATR tanpa tusukan level — wilayah momentum-fail/climax; ikut = V-snap, fade dini = dorongan terakhir -> WAIT, masuk ${fadeP} hanya bila close balik ke ${trigP.toFixed(2)}`],
        fitur,
      }, 2)
    }
    // FB-T0m2: TREN-PELEMBUT (pelajaran bedah r42, kasus g-trend-cont
    // BRUTAL fbo1300 #123): mom50 FLAT (|mom50| < 1.8) tapi momentum
    // 12-candle jelas (|mom12| >= 1.2 ATR) dan harga menempel EMA21
    // (|dEma| <= 1.2) — arah jangka-pendek adalah satu-satunya sinyal;
    // ikuti mom12 dgn stop disiplin. Bukti 18 seed: 11 tembakan 11 MENANG.
    if (Math.abs(momN) < 1.8 && Math.abs(fitur.mom12Atr) >= 1.2 && Math.abs(fitur.distEma21Atr) <= 1.2) {
      const arahM: FboArah = fitur.mom12Atr > 0 ? 'NAIK' : 'TURUN'
      return mk(versi, { aksi: 'ENTRY', arah: arahM, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
        level: { jenis: 'tren', side: fitur.mom12Atr > 0 ? 'ATAS' : 'BAWAH', level: 0, sentuhan: 0, dariZona: false },
        brk: null, falseSinyal: [],
        konfirmasi: `mom50 flat (${momN.toFixed(1)} ATR) tapi mom12 ${fitur.mom12Atr.toFixed(1)} ATR & harga menempel EMA21 (${fitur.distEma21Atr.toFixed(2)} ATR) — kelanjutan jangka-pendek`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T0m2', 'SG-L1'],
        alasan: [`FB-T0m2 TREN-PELEMBUT: tidak ada interaksi level & mom50 flat (${momN.toFixed(1)} ATR); momentum 12-candle ${fitur.mom12Atr.toFixed(1)} ATR dgn harga menempel EMA21 = arah paling jelas -> ikuti ${arahM}, stop ${STOP_WAIT.toFixed(2)}%`],
        fitur,
      }, 1)
    }
    // FB-T20 ROLL-OVER-TANPA-EVENT (bedah r45 — residu hakim fbo2600 #112/#116,
    // g-retest-hold GILA, anatomi flat-total): tanpa level terpetakan & momen
    // flat (mom50 & mom12 di bawah ambang T0n/T0m2), TAPI struktur 6-candle
    // sudah berbalik satu arah: dominasi badan >= 0.62, gelincir dari
    // puncak/dasar-10 (0.8..3.5 ATR — bukan klimaks), volume mengembang pada
    // candle terakhir (lastVolZ >= 1.5), harga belum overextension dari EMA21
    // (|dEma| <= 1.0). Stop struktural di luar ekstrem 10-candle + margin ATR.
    // Bukti kalibrasi standalone 30 seed (3720 ujian): 2 tembakan 2 MENANG
    // (+2.05% net per tembakan), 0 broken — menyentuh cabang SKIP saja.
    {
      const total6 = (fitur.bodyDn6Atr ?? 0) + (fitur.bodyUp6Atr ?? 0)
      const volOk = (fitur.lastVolZ ?? 0) >= 1.5
      const dEmaOk = Math.abs(fitur.distEma21Atr ?? 9) <= 1.0
      const fall = fitur.fallFromTop10Atr ?? 0
      const atrPct = ((fitur.atr ?? 0) / (fitur.price || 1)) * 100
      if (total6 > 0 && volOk && dEmaOk) {
        const domDn = (fitur.bodyDn6Atr ?? 0) / total6
        const domUp = (fitur.bodyUp6Atr ?? 0) / total6
        if (domDn >= 0.62 && fall >= 0.8 && fall <= 3.5) {
          const stopPct = Math.min(3.0, Math.max(1.6, (((fitur.rangeHigh ?? fitur.price) - fitur.price) / fitur.price) * 100 + 1.2 * atrPct))
          return mk(versi, { aksi: 'ENTRY', arah: 'TURUN', targetPct: TARGET_DISIPLIN, stopPct }, {
            level: { jenis: 'roll-over', side: 'ATAS', level: fitur.rangeHigh ?? 0, sentuhan: 0, dariZona: false },
            brk: null, falseSinyal: [],
            konfirmasi: `roll-over tanpa-event: dominasi badan-turun ${(domDn * 100).toFixed(0)}% (6-candle), gelincir ${fall.toFixed(1)} ATR dari puncak-10, volume mengembang (z ${(fitur.lastVolZ ?? 0).toFixed(1)}), harga dekat EMA21 (${fitur.distEma21Atr.toFixed(2)} ATR)`,
            prematureRisk: false,
            pelajaranAktif: ['FB-T20', 'SG-L1'],
            alasan: [`FB-T20 ROLL-OVER-TANPA-EVENT: tanpa level terpetakan & momen flat, tapi struktur 6-candle berbalik turun (badan-turun ${(domDn * 100).toFixed(0)}%, slide ${fall.toFixed(1)} ATR dari puncak-10, vol z ${(fitur.lastVolZ ?? 0).toFixed(1)}) -> ikuti roll-over TURUN, stop struktural ${stopPct.toFixed(1)}% di atas puncak-10`],
            fitur,
          }, 1)
        }
        if (domUp >= 0.62 && -fall >= 0.8 && -fall <= 3.5) {
          const stopPct = Math.min(3.0, Math.max(1.6, ((fitur.price - (fitur.rangeLow ?? fitur.price)) / fitur.price) * 100 + 1.2 * atrPct))
          return mk(versi, { aksi: 'ENTRY', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct }, {
            level: { jenis: 'roll-over', side: 'BAWAH', level: fitur.rangeLow ?? 0, sentuhan: 0, dariZona: false },
            brk: null, falseSinyal: [],
            konfirmasi: `roll-over naik tanpa-event: dominasi badan-naik ${(domUp * 100).toFixed(0)}% (6-candle), bangkit ${(-fall).toFixed(1)} ATR dari dasar-10, volume mengembang (z ${(fitur.lastVolZ ?? 0).toFixed(1)}), harga dekat EMA21 (${fitur.distEma21Atr.toFixed(2)} ATR)`,
            prematureRisk: false,
            pelajaranAktif: ['FB-T20', 'SG-L1'],
            alasan: [`FB-T20 ROLL-OVER-TANPA-EVENT (cermin NAIK): badan-naik ${(domUp * 100).toFixed(0)}%, bangkit ${(-fall).toFixed(1)} ATR dari dasar-10, vol z ${(fitur.lastVolZ ?? 0).toFixed(1)}) -> ikuti roll-over NAIK, stop struktural ${stopPct.toFixed(1)}% di bawah dasar-10`],
            fitur,
          }, 1)
        }
      }
    }
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      level: { jenis: 'tak-jelas', side: 'TAK-JELAS', level: 0, sentuhan: 0, dariZona: false },
      brk: null, falseSinyal: [], konfirmasi: 'tidak entry',
      prematureRisk: false,
      pelajaranAktif: ['FB-L9', 'SG-L8'],
      alasan: ['FB-L9 SKIP-DISIPLIN: tidak ada level S/R terpetakan yang baru ditusuk (event breakout segar + penetrasi nyata) -> tanpa edge struktural, false breakout tidak dimainkan'],
      fitur,
    }, 0)
  }

  const L = E.lvl
  const { lvl: _l, ...brkRec } = E
  const fadeArah: FboArah = E.side === 'ATAS' ? 'TURUN' : 'NAIK'
  const breakArah: FboArah = E.side === 'ATAS' ? 'NAIK' : 'TURUN'
  const trig = E.side === 'ATAS' ? L.level - 0.12 * atr : L.level + 0.12 * atr
  const extreme = E.side === 'ATAS'
    ? Math.max(...cs.slice(Math.max(0, E.lastPierceIdx - 12)).map((c) => c.h))
    : Math.min(...cs.slice(Math.max(0, E.lastPierceIdx - 12)).map((c) => c.l))
  const lvlRec = { jenis: L.jenis, side: E.side, level: L.level, sentuhan: L.sentuhan, dariZona: L.dariZona }
  const basis = { level: lvlRec, brk: brkRec, fitur }
  const cara = `level ${L.jenis} (${E.side.toLowerCase()}, ${L.sentuhan} sentuhan, ${L.level.toFixed(2)}) ditusuk sedalam ${E.maxBeyondAtr.toFixed(2)} ATR ${n - 1 - E.lastPierceIdx} candle lalu; close kini ${E.closeNowAtr >= 0 ? 'DI LUAR +' : 'DI DALAM '}${E.closeNowAtr.toFixed(2)} ATR; closes di luar: ${E.closesBeyond}; vol break ${E.volRatioBreak.toFixed(1)}x, lanjut ${E.volFollow.toFixed(2)}x, akhir ${E.volLate.toFixed(2)}x; pre-touch ${E.preTouches}`

  // ===== FB-L4: ACCEPTANCE = TEMBUSAN SEJATI (ikuti break) =====
  // Float struktural (pelajaran bedah r10): acceptance sejati MENGAPUNG di
  // luar level dgn badan penuh & low tidak menyentuh balik level; stall palsu
  // (weak/drift/equal) meringkuk menempel level dgn badan kering.
  // v1.27 (pelajaran bedah r28): fitur per-candle (badan/volume) jenuh oleh
  // noise GILA/BRUTAL — diganti energi EPISODIK: efisiensi lintasan, dorongan
  // segar 7-candle, konsistensi arah. Keluarga PUNISH (stall di puncak setelah
  // lari jauh) terblokir oleh push7 ≈ 0.3 ATR (dorongan padam) — tanpa topi
  // jarak, acceptance mengapung sejati (g-accept) tetap bisa diikuti.
  const last6 = cs.slice(Math.max(0, n - 6))
  const meanBody6 = mean(last6.map((c) => Math.abs(c.c - c.o))) / atr
  const minLow6 = Math.min(...last6.map((c) => c.l))
  const maxHi6 = Math.max(...last6.map((c) => c.h))
  const tiny10 = cs.slice(Math.max(0, n - 10)).filter((c) => Math.abs(c.c - c.o) <= 0.2 * atr).length
  // volFade v1.27b: hanya kekeringan PARAH yang membatalkan acceptance
  // (0.55x) — bukti bedah hakim: floatAbove mini-flag guard kerap berakhir
  // 0.66-0.74x tanpa merupakan stall; keluarga PUNISH tetap terblokir
  // push7/mature sehingga gerbang ini tidak lagi diperlukan ketat.
  const volFade = E.volLate < 0.55 * Math.max(E.volFollow, 0.01)
  // Far-follow hanya untuk ACCEPTANCE MATANG: break terjadi >= 25 candle
  // lalu (harga mencerna tembusan lama, bukan spike segar). Pemisah bukti
  // r28: g-accept break-nya tua (26+), keluarga PUNISH break-nya baru
  // (22-24) — stall di puncak setelah lari jauh = jangan dikejar.
  const matureAccept = n - 1 - E.firstPierceIdx >= 25
  // transfer momentum: acceptance sejati MASIH MENDORONG (late >= 1 ATR dan
  // tidak runtuh dibanding awal episode; mini-flag guard mengecil sampai
  // ~0.3x, sedangkan stall PUNISH runtuh ke ~0.1x) — pelajaran bedah r28d
  const momentumTransfer = E.lateMoveAtr >= 1.0 && E.lateMoveAtr >= 0.25 * E.earlyMoveAtr
  const farOk = E.closeNowAtr <= 3.0 ||
    (n - 1 - E.firstPierceIdx >= 27 && E.effAtr >= 0.25 && momentumTransfer)
  // overextension v1.27: parabola + DESELERASI (dorongan segar padam) —
  // badan per-candle tidak lagi dipakai (jenuh noise; pelajaran r28)
  const overExt = fitur.distEma21Atr >= 2.4 && fitur.mom12Atr >= 2.4 && E.push7Atr < 0.8
  if (
    n - E.firstPierceIdx >= 10 &&
    E.closesBeyond >= 2 && E.closeNowAtr >= 0.25 && farOk && !E.crossBack &&
    E.preTouches >= 1 &&
    // v1.29c r40: gerbang volume → baseline pra-break (stall kering vFpre
    // 0.6-0.9 ditolak; acceptance sejati menahan vFpre >= 1.0) + VETO TREN
    // EKSTREM (mom50 12+ ATR = keluarga climax/momentum-fail — acceptance
    // di dalam exhaustion adalah jebakan, bukan kelanjutan).
    E.volFollowPre >= 1.0 && E.volLatePre >= 0.7 && !volFade &&
    Math.abs(fitur.mom50Atr ?? 0) <= 12 &&
    E.effAtr >= 0.25 && E.push7Atr >= 0.85 && E.dirCons >= 0.6 && tiny10 <= 8 &&
    !E.climax && E.wickBeyondAtr <= 0.9 && E.maxBeyondAtr >= 0.5 &&
    // v1.34 VETO L4-EXHAUSTION (pelajaran bedah r42, kasus fbo-weak GILA
    // fbo1500 #4/#8): acceptance bervolume di HARGA JAUH DI BAWAH EMA21
    // (dEma <= -0.8) pada level SANGAT TERUJI (preT >= 6) = stall kelelahan
    // di tepi, bukan kelanjutan — bukti 18 seed: 2 tembakan, 2 LOSE,
    // fallback L7 WAIT-fade selamat.
    !(fitur.distEma21Atr < -0.8 && E.preTouches >= 6)
  ) {
    const stop = stopFollow(breakArah, entry, L.level, atr)
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `acceptance sejati: ${E.closesBeyond} close di luar + volume pengikut ${E.volFollow.toFixed(2)}x rata (akhir ${E.volLate.toFixed(2)}x) + tanpa wick penolakan (${E.wickBeyondAtr.toFixed(2)} ATR) + tanpa klimaks (${E.volRatioBreak.toFixed(1)}x)`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L4', 'SG-L1'],
      alasan: [`FB-L4 TEMBUSAN-SEJATI: ${cara} — acceptance bervolume nyata & badan penuh, TANPA jejak penolakan/klimaks/kelelahan -> ini breakout asli, bukan false breakout; mengikuti ${breakArah} dgn stop ${stop.toFixed(2)}% di balik level`],
    }, 3)
  }

  // ===== FB-T0: DIP-DANGKAL DALAM TREN (kelanjutan, bukan false breakout) ====
  // Pelajaran bedah r40 (kasus g-trend-cont GILA #121): pullback 1 lilin
  // menyeberang level dalam tren sehat (mom50 searah break) dgn acceptance
  // kecil DIBACA FB-L1 sbg close-back palsu -> fade -> DILIKUIDASI.
  // Pembeda: dip dangkal (close kembali maks 0.9 ATR ke dalam) + tren kuat
  // searah break + tanpa klimaks + break minor = konsolidasi sehat, bukan
  // kegagalan breakout -> ikuti searah break dgn stop di balik level.
  const momAlign = E.side === 'ATAS' ? fitur.mom50Atr ?? 0 : -(fitur.mom50Atr ?? 0)
  // v1.33 PITA-DIP-MODERAT (pelajaran bedah r42, kasus g-trend-cont GILA
  // fbo1700 #121): dip -1.6..-0.9 ATR dalam tren MODERAT searah break
  // (momAlign 3.5-6.5) yang reversinya KERING (vF <= 0.92, vL <= 0.88)
  // adalah koreksi tren, bukan kegagalan — bukti 18 seed: 5 tembakan
  // (semua g-trend-cont) 5 MENANG / 0 KALAH; semua parabola penghukum
  // (momAl 15.7+) tersaring batas atas 6.5.
  const dipOk = (E.closeNowAtr >= -0.9 && E.closeNowAtr < 0) ||
    (momAlign >= 6.5 && momAlign < 14 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0) ||
    (momAlign >= 3.5 && momAlign < 6.5 && E.closeNowAtr >= -1.6 && E.closeNowAtr < 0 &&
     E.volFollow <= 0.92 && E.volLate <= 0.88)
  // relaks cOut (r41): HANYA utk dip-dera bervolume-LEMAH (vBrk <= 1.1 &
  // vF <= 0.85) pada level teruji dlm tren kuat — serangan bervolume (trap
  // climax/momentum/drift-snap: vBrk 1.12-2.34) tetap ditolak.
  const cOutOk = E.closesBeyond >= 3 ||
    (E.closesBeyond >= 1 && momAlign >= 3.2 && E.preTouches >= 3 && E.maxBeyondAtr >= 0.3 &&
     E.volRatioBreak <= 1.1 && E.volFollow <= 0.85)
  // v1.33 TUSUK-TINY (pelajaran bedah r42, kasus g-trend-cont BRUTAL
  // fbo1800 #123): tusukan wick SANGAT dangkal (<= 0.7 ATR, 0 close di
  // luar) yang ditutup-balik dangkal dalam tren searah — derau sentuhan,
  // bukan false breakout (FB-L2 butuh maxB >= 0.9); bukti 18 seed:
  // 2 tembakan, 2 MENANG, 0 KALAH.
  const tinyPoke = E.maxBeyondAtr <= 0.7 && momAlign >= 2.8 && E.volFollow >= 0.9 &&
    E.preTouches >= 2 && E.closeNowAtr >= -1.0 && E.closeNowAtr < 0 && !E.climax
  if (
    ((dipOk && cOutOk) || tinyPoke) &&
    momAlign >= 2.0 && momAlign <= 14 && E.volFollow >= 0.7 &&
    E.maxBeyondAtr <= 2.6 && !E.climax && n - 1 - E.firstPierceIdx <= 14 &&
    // v1.34 VETO-T0-POKE-BERVOLUME-GAGAL (pelajaran bedah r42, kasus
    // fbo-drift-snap GILA fbo1300 #49): tusukan bervolume dgn wick besar
    // (>= 0.9 ATR) yang dorongan 7-candle-nya sudah MENGgelincir searah
    // fade (p7 <= -0.9) = poke yang sudah gagal — mengikutinya melawan
    // snap-back; bukti 18 seed: 1 tembakan (tepat #49), follow LOSE,
    // 0 pemenang terblokir.
    // v1.35 VETO-T0-RETEST-PALSU (pelajaran bedah r42, kasus g-retest-hold
    // BRUTAL fbo1500 #114): cross-back ke dalam dgn badan penolakan nyata
    // (rej >= 0.5) pada acceptance mapan (cOut >= 8) dalam tren LEMAH
    // (momAlign < 3.0) = uji-ulang yang akan GAGAL, bukan konsolidasi —
    // FB-L2 memfadernya dgn benar. Bukti 18 seed: 1 tembakan (tepat
    // #114), follow LOSE, fade WIN; 0 pemenang terblokir.
    !(E.crossBack && E.rejecBodyAtr >= 0.5 && E.closesBeyond >= 8 && momAlign < 3.0) &&
    // v1.36 VETO-T0-MATI (pelajaran bedah hakim r42, kasus fbo-weak GILA
    // fbo2000 #4/#8): dip dalam tren yang ARAH-NYA SUDAH MATI (dir < 25%)
    // bukan konsolidasi — episode kehabisan pengikut; mengikutinya melawan
    // snap-back. Bukti 24 seed: 2 tembakan, 2 LOSE, 0 pemenang terblokir.
    E.dirCons >= 0.25 &&
    !(E.wickBeyondAtr >= 0.9 && E.push7Atr <= -0.9)
  ) {
    const stop = stopFollow(breakArah, entry, L.level, atr)
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `dip dangkal ${E.closeNowAtr.toFixed(2)} ATR dalam tren sehat (mom50 ${momAlign.toFixed(1)} ATR searah) + acceptance ${E.closesBeyond} close — konsolidasi, bukan kegagalan`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T0', 'SG-L1'],
      alasan: [`FB-T0 DIP-DANGKAL-DALAM-TREN: ${cara} — penyeberangan balik yang dangkal dalam tren kuat searah break dgn acceptance nyata adalah konsolidasi sehat; jangan fade tren (FB-T0), ikuti ${breakArah}, stop ${stop.toFixed(2)}%`],
    }, 3)
  }

  // ===== FB-T0s: POKE-BERVOLUME-GAGAL-AMBIGU -> SKIP (pelajaran bedah
  // r42, kasus fbo-drift-snap GILA fbo1300 #49): tusukan dangkal (maxB
  // <= 1.2 ATR) dgn wick besar (>= 0.9 ATR) & dorongan sudah menggelincir
  // searah fade (p7 <= -0.9) — follow dilikuidasi drift-lanjutan, fade
  // stop-tight juga tersengat; satu-satunya tindakan aman = TIDAK MAIN
  // (bukti 18 seed: bait pengikut pasti rugi -> no-trade AMAN).
  if (E.closeNowAtr < 0 && E.wickBeyondAtr >= 0.9 && E.push7Atr <= -0.9 && E.maxBeyondAtr <= 1.2) {
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      ...basis,
      falseSinyal: [
        `tusukan dangkal (${E.maxBeyondAtr.toFixed(2)} ATR) dgn wick besar (${E.wickBeyondAtr.toFixed(2)} ATR) sudah gagal & dorongan menggelincir (${E.push7Atr.toFixed(2)} ATR) — arah selanjutnya dua-duanya bisa menyerang`,
        `follow dilikuidasi drift-lanjutan; fade stop-tight tersengat pantulan — tidak ada entry dgn edge bersih`,
      ],
      konfirmasi: 'SKIP: tusukan gagal tapi posisi belum menentukan sisi yang aman — disiplin tidak main (aman-no-trade)',
      prematureRisk: false,
      pelajaranAktif: ['FB-T0s', 'SG-L8'],
      alasan: [`FB-T0s POKE-GAGAL-AMBIGU: ${cara} — tusukan dangkal bervolume gagal (wick ${E.wickBeyondAtr.toFixed(2)} ATR, p7 ${E.push7Atr.toFixed(2)} ATR searah fade) namun drift/pantulan berikutnya belum menentukan: follow = likuidasi, fade = tersengat -> SKIP, tidak main`],
    }, 1)
  }

  // ===== FB-L4b: RETEST-HOLD CONTINUATION (pelajaran bedah r28) =====
  // Breakout sejati yang baru DIIJI-ULANG: harga kembali ke level, level
  // MENAHAN (floatB dekat nol), lalu memantul menjauh dgn badan berpengikut.
  // Berbeda dgn acceptance mengapung (L4): di sini konfirmasi = retest tahan.
  // Pemisah dari keluarga FBO: weak/equal/drift TIDAK PERNAH kembali ke
  // level (floatB >= 0.5), follow/climax/momentum jauh di luar, dan
  // retest-fail/spike-wick/engulf menutup DI DALAM (closeNow < 0).
  const floatB6 = E.side === 'ATAS'
    ? (minLow6 - E.lvl.level) / atr
    : (E.lvl.level - maxHi6) / atr
  const bounceMom = ((E.side === 'ATAS' ? 1 : -1) * (cs[n - 1].c - cs[Math.max(0, n - 4)].c)) / atr
  if (
    E.closesBeyond >= 2 && E.closeNowAtr >= 0.25 && E.closeNowAtr <= 3.2 && !E.crossBack &&
    (E.preTouches >= 2 || (E.closesBeyond >= 30 && E.volFollowPre >= 0.9)) &&
    // v1.29 r40: volume gerbang pindah ke BASELINE PRA-BREAK — vF/vL lama
    // tercemar episode (stall panjang menurunkan volMean → stall kering
    // terukur "sehat"). retest-hold sejati menahan volume (vFpre 1.0-1.4),
    // weak/drift kering (vFpre 0.6-0.8). maxB <= 1.6: retest-hold = break
    // yang MURAH — acceptance dalam (maxB 2.3+) bukan bentuk retest-tahan.
    E.volFollowPre >= 0.85 && E.volLatePre >= 0.7 && !E.climax &&
    (E.maxBeyondAtr <= 1.6 || (E.push7Atr >= 2.0 && n - 1 - E.firstPierceIdx >= 10)) &&
    floatB6 >= -0.5 && floatB6 <= 0.55 && bounceMom >= 0.25 &&
    E.rejecBodyAtr <= 0.6 && E.wickBeyondAtr <= 0.7 &&
    // effAtr relaksasi r40: acceptance panjang + retest pulang = episode neto
    // KECIL BY KONSTRUKSI (keluar-masuk-mantul) — gerbang eff menolak
    // retest-hold sah; bypass HANYA dgn acceptance panjang YANG VOLUME-NYA
    // DITAHAN terhadap baseline pra-break (stall kering vFpre 0.6-0.8 ditolak).
    (E.effAtr >= 0.15 || (E.closesBeyond >= 8 && E.volFollowPre >= 0.9))
  ) {
    const stop = stopFollow(breakArah, entry, L.level, atr)
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `retest-hold: harga kembali ke level (${floatB6.toFixed(2)} ATR), level MENAHAN, lalu memantul ${bounceMom.toFixed(2)} ATR berpengikut (vol lanjut ${E.volLate.toFixed(2)}x) — level lama kini lantai/plafon baru`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L4b', 'SG-L1'],
      alasan: [`FB-L4b RETEST-HOLD: ${cara} — uji-ulang level ditolak rapi (retest menempel ${floatB6.toFixed(2)} ATR, pantulan ${bounceMom.toFixed(2)} ATR, tanpa badan penolakan besar) -> tembusan sejati lanjutan ${breakArah}, stop ${stop.toFixed(2)}% di balik level`],
    }, 3)
  }

  // ===== FB-R3: RETEST-TRAP (pelajaran bedah r42, kasus g-retest-hold
  // BRUTAL fbo1600 #114) =====
  // Acceptance MAPAN (15+ close di luar) dgn volume serangan MASIH MENANJAK
  // vs baseline pra-break (vFpre >= 1.05) dan dorongan 7-candle MASIH
  // SEARAH BREAK (p7 >= +0.2) — lalu harga nyaris-ke-dalam: ini RETEST-
  // JEBAKAN, bukan kegagalan. Bukti 18 seed: SATU-SATUNYA kasus p7 POSITIF
  // di seluruh populasi FB-L1/L2 (semua fade sah terukur p7 <= -0.96);
  // fade-nya dilikuidasi re-break (truth terus searah break).
  if (
    E.closeNowAtr < 0 && E.volFollowPre >= 1.05 &&
    E.closesBeyond >= 15 && n - 1 - E.lastPierceIdx <= 11 &&
    // v1.37b R3-dangkal (pelajaran bedah hakim r44, kasus g-retest-hold
    // GILA fbo2900 #112/#116): pulang DANGKAL (cN >= -0.5) pada acceptance
    // MAPAN bervolume (cOut >= 20, vFpre >= 1.2) dgn arah hidup (dir >=
    // 0.45) tanpa klimaks = uji-ulang dangkal yang akan gagal — kelanjutan,
    // sah TANPA syarat dorongan positif.
    ((E.closeNowAtr >= -0.5 && E.closesBeyond >= 20 && E.volFollowPre >= 1.2 && E.dirCons >= 0.45 && !E.climax &&
      // v1.37b kalibrasi: koreksi-dalam WAJIB terkendali (lateM >= -1.0) —
      // dorongan yang sudah menggelincir ekstrem (fbo2600 #83/#85: lateM
      // -1.7..-2.1, fbo1900 #57: -4.4) = distribusi aktif, bukan uji-ulang.
      E.lateMoveAtr >= -1.0) ||
      // v1.37b R3-relaks: acceptance mapan bervolume dgn dorongan kecil
      // positif (fbo2500 #111/#117: p7 0.19).
      (E.push7Atr >= 0.2 || (E.closesBeyond >= 20 && E.volFollowPre >= 1.2 && E.push7Atr >= 0.1)))
  ) {
    const stop = stopFollow(breakArah, entry, L.level, atr)
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `retest-trap: acceptance mapan (${E.closesBeyond} close di luar) + volume serangan menanjak (${E.volFollowPre.toFixed(2)}x pra-break) + dorongan masih searah break (${E.push7Atr.toFixed(2)} ATR) — pulang-ke-dalam adalah jebakan uji-ulang, bukan kegagalan`,
      prematureRisk: false,
      pelajaranAktif: ['FB-R3', 'SG-L1'],
      alasan: [`FB-R3 RETEST-TRAP: ${cara} — acceptance mapan dgn volume serangan MENANJAK (${E.volFollowPre.toFixed(2)}x pra-break) & dorongan masih searah break (p7 +${E.push7Atr.toFixed(2)} ATR): close kembali ke dalam hanyalah uji-ulang yang akan gagal -> ikuti ${breakArah}, stop ${stop.toFixed(2)}% di balik level`],
    }, 3)
  }

  // ===== FB-L1: CLOSE-BACK TERKONFIRMASI (false breakout resmi) =====
  // VETO ACCEPTANCE (pelajaran bedah r28): bila break historis punya
  // acceptance panjang bervolume (closesBeyond >= 8, volFollow >= 0.9),
  // kegagalan harus BUKTI KUAT (close kembali dalam >= 0.5 ATR + badan
  // penolakan >= 0.5 ATR) — tanpa itu, close-back tipis bisa sekadar
  // hembusan derau sebelum retest tahan (jangan fade acceptance sejati).
  const acceptanceKuat = E.closesBeyond >= 8 && E.volFollow >= 0.9
  const buktiKuat = E.closeNowAtr <= -0.5 && E.rejecBodyAtr >= 0.5
  const momAlignL1b = E.side === 'ATAS' ? fitur.mom50Atr ?? 0 : -(fitur.mom50Atr ?? 0)
  // v1.36 FB-L1p PARABOLA-PENDEK (pelajaran bedah hakim r42, kasus
  // fbo-momentum-fail SEDANG fbo2200 #95): close-back pada episode
  // parabola (|mom50| >= 12) pendek (cOut <= 6) = dorongan terakhir
  // momentum-fail — fade stop-tight tersengat dorongan-lanjut, follow
  // V-snap juga dilikuidasi; SKIP satu-satunya aman.
  // Bukti 24 seed: 20/20 no-trade AMAN.
  // v1.36d FB-L1q EPISODE-MATI (pelajaran bedah hakim r42, kasus
  // fbo-drift-snap BRUTAL fbo2200 #48): close-back pada episode yang
  // volume akhirnya SUDAH RUNTUH vs baseline pra-break (vLpre < 0.5) —
  // reversal sebenarnya sudah terlanjur; fade stop-tight tersengat
  // sisa-goyangan, follow tidak berpihak. SKIP = satu-satunya aman.
  // Bukti 24 seed: 12/12 no-trade AMAN.
  if (E.volLatePre < 0.5 && E.closeNowAtr < 0) {
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      ...basis,
      falseSinyal: [
        `volume akhir episode runtuh (${E.volLatePre.toFixed(2)}x pra-break) — episode sudah mati sebelum konfirmasi kegagalan`,
        `fade stop-tight tersengat sisa-goyangan episode mati; follow tanpa energi — tidak ada entry dgn edge bersih`,
      ],
      konfirmasi: 'SKIP: episode mati tidak dimainkan — disiplin aman',
      prematureRisk: false,
      pelajaranAktif: ['FB-L1q', 'SG-L8'],
      alasan: [`FB-L1q EPISODE-MATI: ${cara} — volume akhir runtuh ${E.volLatePre.toFixed(2)}x pra-break: reversal sudah terlanjur, entry kini hanya mengejar sisa-goyangan -> SKIP`],
    }, 1)
  }
  if (Math.abs(momAlignL1b) >= 12 && E.closesBeyond <= 6 && n - 1 - E.lastPierceIdx <= 11) {
    const g1 = g1Keputusan(E, fitur, n, versi, basis, breakArah)
    if (g1) return g1
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      ...basis,
      falseSinyal: [
        `episode parabola (mom50 ${fitur.mom50Atr?.toFixed(1) ?? '—'} ATR) + close-back pendek (${E.closesBeyond} close di luar) — wilayah momentum-fail`,
        `dorongan terakhir menghukum follow (V-snap) MAUPUN fade stop-tight (push-lanjut) -> tidak main`,
      ],
      konfirmasi: 'SKIP: parabola pendek tidak dimainkan dua arah — disiplin aman',
      prematureRisk: true,
      pelajaranAktif: ['FB-L1p', 'SG-L8'],
      alasan: [`FB-L1p PARABOLA-PENDEK: ${cara} — close-back pada episode parabola pendek (|mom50| >= 12 ATR, ${E.closesBeyond} close): follow dilikuidasi V-snap, fade dini dilikuidasi dorongan terakhir -> SKIP`],
    }, 1)
  }
  // VETO TREN-KUAT (pelajaran bedah r41, kasus g-trend-cont BRUTAL fbo1100
  // #123): dalam tren SANGAT kuat searah break (mom50 > 6.5 ATR — seluruh
  // 200+ pemenang fade sah terukur momAl <= 6.1), penutupan-kembali-ke-dalam
  // dangkal adalah RETEST/Gelombang istirahat, bukan kegagalan — fade akan
  // dilikuidasi re-break. Ditangkap FB-T0 (kelanjutan tren) sebagai gantinya.
  const momAlignL1 = E.side === 'ATAS' ? fitur.mom50Atr ?? 0 : -(fitur.mom50Atr ?? 0)
  if (
    E.closeNowAtr <= -0.15 && E.closeNowAtr >= -3.2 && E.maxBeyondAtr >= 0.25 && n - 1 - E.lastPierceIdx <= 11 &&
    E.volRatioBreak >= 0.9 &&
    // v1.37b L1-TAHAN (pelajaran bedah hakim r44, kasus fbo-round GILA
    // fbo2700 #71 & fbo2900 #71): serangan BERVOLUME (vBrk >= 2.3) yang
    // pengikutnya DITAHAN (vFpre >= 1.15) dan hanya koreksi-dangkal bukan
    // kegagalan — fade-nya dilikuidasi re-break; kegagalan sejati kehilangan
    // pengikut (vFpre <= 1.0).
    !(E.volRatioBreak >= 2.3 && E.volFollowPre >= 1.15) &&
    (E.closesBeyond >= 8 || E.maxBeyondAtr >= 1.0) &&
    (E.crossBack || E.rejecBodyAtr >= 0.35 || E.wickBeyondAtr >= 0.5) &&
    (!acceptanceKuat || buktiKuat) &&
    momAlignL1 <= 6.5
  ) {
    const stop = stopStruktural(fadeArah, entry, L.level, extreme, atr, fitur.mom12Atr)
    const sinyal = [
      `tembusan ${E.maxBeyondAtr.toFixed(2)} ATR dicabut: close kembali DI DALAM level (${E.closeNowAtr.toFixed(2)} ATR)`,
      E.climax ? `vol break klimaks ${E.volRatioBreak.toFixed(1)}x = kelelahan` : `vol break ${E.volRatioBreak.toFixed(1)}x`,
      E.rejecBodyAtr >= 0.35 ? `badan penolakan ${E.rejecBodyAtr.toFixed(2)} ATR searah fade` : `wick penolakan ${E.wickBeyondAtr.toFixed(2)} ATR`,
    ]
    return mk(versi, { aksi: 'ENTRY', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: sinyal,
      konfirmasi: `close-back terkonfirmasi pada candle terakhir (crossBack=${E.crossBack ? 'YA' : 'tidak'}, badan tolak ${E.rejecBodyAtr.toFixed(2)} ATR, wick ${E.wickBeyondAtr.toFixed(2)} ATR) + stop struktural di balik ekstrem tembusan`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L1', 'FB-K2', 'FB-K3', 'SG-L1'],
      alasan: [`FB-L1 FALSE-BREAKOUT-TERKONFIRMASI: ${cara} — bukti kegagalan lengkap: ${sinyal.join('; ')} -> fade ${fadeArah}, stop ${stop.toFixed(2)}% di balik ekstrem tembusan (FB-K3)`],
    }, 3)
  }

  // ===== FB-L1b: STALL-COLLAPSE (acceptance panjang lalu runtuh balik) =====
  // Harga bertahan LAMA di luar (>= 4 close) lalu close kembali di dalam —
  // acceptance palsu terbongkar oleh kehadiran kembali di dalam area.
  // v1.28 r40: close-back DANGKAL (-0.3..-0.05) = konfirmasi belum matang —
  // keluarga penghukum melikuidasi fade prematur di zona ini; disiplin WAIT
  // (trigger close-back lebih dalam menyala di horizon, FB-K2).
  if (E.closesBeyond >= 4 && E.closeNowAtr <= -0.3 && E.volLate <= 0.9 && E.volRatioBreak >= 0.9) {
    const stop = stopStruktural(fadeArah, entry, L.level, extreme, atr, fitur.mom12Atr)
    return mk(versi, { aksi: 'ENTRY', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [
        `${E.closesBeyond} close di luar level namun TIDAK PERNAH melanjutkan — kini close kembali DI DALAM (${E.closeNowAtr.toFixed(2)} ATR)`,
        `volume akhir layu ${E.volLate.toFixed(2)}x — acceptance tanpa pengikut = distribusi di tepi`,
      ],
      konfirmasi: `kegagalan terkonfirmasi oleh kembalinya close ke dalam area setelah acceptance panjang + vol akhir kering`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L1b', 'FB-K3'],
      alasan: [`FB-L1b STALL-COLLAPSE: ${cara} — acceptance panjang TANPA kelanjutan lalu close kembali di dalam -> acceptance palsu; fade ${fadeArah}, stop ${stop.toFixed(2)}%`],
    }, 3)
  }

  // ===== FB-L2: WICK-REJECT (penolakan serta-merta) =====
  // Gerbang realness (pelajaran bedah r28): sapuan wick yang sah menusuk
  // DALAM (>= 0.9 ATR) — derau GILA yang menusuk level buatan 0.4-0.6 ATR
  // bukan sapuan likuiditas; memfadernya justru melawan struktur sejati.
  if (E.closeNowAtr <= -0.1 && E.wickBeyondAtr >= 0.5 && E.maxBeyondAtr >= 0.9 && n - 1 - E.lastPierceIdx <= 11 && E.volRatioBreak >= 0.9) {
    const stop = stopStruktural(fadeArah, entry, L.level, extreme, atr, fitur.mom12Atr)
    return mk(versi, { aksi: 'ENTRY', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [
        `wick menembus ${E.wickBeyondAtr.toFixed(2)} ATR lalu close DI DALAM level`,
        `penetrasi hanya sumbu — badan tidak pernah diterima di luar`,
      ],
      konfirmasi: `wick-reject pada candle tembus + close kembali di dalam (close ${E.closeNowAtr.toFixed(2)} ATR dari level)`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L2', 'FB-K2', 'FB-K3'],
      alasan: [`FB-L2 WICK-REJECT: ${cara} — sumbu menusuk lalu ditolak keras, badan tak pernah diterima di luar -> false breakout, fade ${fadeArah}, stop ${stop.toFixed(2)}%`],
    }, 3)
  }

  // ===== FB-L4c: FRESH-BREAK TERUJI (pelajaran bedah r28) =====
  // Break yang BARU terjadi (<= 5 candle), level teruji, volume breakout
  // sah, arah konsisten — acceptance belum sempat terbentuk tetapi
  // tembusannya nyata dan masih muda; ikuti searah break dgn stop di
  // balik level (menutup celah trend-cont/retest-hold ber-pierce muda).
  if (
    n - 1 - E.firstPierceIdx <= 5 && E.closesBeyond >= 1 && E.closeNowAtr >= 0.05 &&
    Math.abs(fitur.mom12Atr) <= 4.5 &&
    // v1.28 r40: veto overextension — mengejar break segar saat harga sudah
    // >= 2.3 ATR dari EMA21, ATAU tren 50-candle ekstrem (>= 12 ATR =
    // keluarga momentum-fail/climax, mom50 15-24) — blow-off terakhir
    // melikuidasi pengikut.
    (Math.abs(fitur.distEma21Atr) <= 2.3 && Math.abs(fitur.mom50Atr ?? 0) <= 12) &&
    E.maxBeyondAtr >= 0.4 && E.volRatioBreak >= 1.0 && E.dirCons >= 0.6 &&
    E.preTouches >= 1 && E.preTouches <= 6 &&
    !E.crossBack && !E.climax
  ) {
    const stop = stopFollow(breakArah, entry, L.level, atr)
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `fresh-break teruji: tembusan baru (${n - 1 - E.firstPierceIdx} candle) pada level teruji (${E.preTouches} pre-touch), vol break ${E.volRatioBreak.toFixed(1)}x, kedalaman ${E.maxBeyondAtr.toFixed(2)} ATR, arah konsisten ${Math.round(E.dirCons * 100)}%`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L4c', 'SG-L1'],
      alasan: [`FB-L4c FRESH-BREAK-TERUJI: ${cara} — tembusan muda pada level teruji dgn volume sah & arah konsisten; belum ada jejak kegagalan, ikuti ${breakArah} dgn stop ${stop.toFixed(2)}% di balik level (FB-K3)`],
    }, 2)
  }

  // ===== FB-T1/T2/T3: ACCEPTANCE MENGAPUNG YANG SEHAT (pelajaran bedah r40) ====
  // 60 kegagalan guard jatuh ke WAIT-fade yang tidak pernah menyala. Bedah
  // forensik 6 seed menemukan: anatomi "acceptance dalam kelanjutan" punya
  // TIGA wajah yang layak-diikuti — (T1) break senyap dlm tren kuat yang kini
  // berjeda, (T2) acceptance dalam & panjang dgn volume pengikut, (T3)
  // episode mengapung jauh di luar level dgn volume pengikut & tanpa wick
  // penolakan. Pemisah dari keluarga penghukum (stall di puncak): wick
  // ekskursi tipis (maxB - cN kecil = TANPA flush), mom50 searah, dan
  // volume akhir yang tidak runtuh. Dipindai ke SEMUA event (bukan hanya
  // teratas) — level sejati kadang ter VetO jarak dan hanya phantom yang
  // terlihat, atau sebaliknya.
  const mom50v = fitur.mom50Atr ?? 0
  for (const ev of events.slice(0, 2)) {
    const umur = n - 1 - ev.firstPierceIdx
    const wickExc = ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr)
    const momAl = ev.side === 'ATAS' ? mom50v : -mom50v
    const evBreakArah: FboArah = ev.side === 'ATAS' ? 'NAIK' : 'TURUN'
    const evStop = stopFollow(evBreakArah, entry, ev.lvl.level, atr)
    const evBasis = { level: { jenis: ev.lvl.jenis, side: ev.side, level: ev.lvl.level, sentuhan: ev.lvl.sentuhan, dariZona: ev.lvl.dariZona }, brk: { ...ev, lvl: undefined } as unknown as Omit<FboBreakEvent, 'lvl'>, fitur }
    const caraEv = `level ${ev.lvl.jenis} (${ev.side.toLowerCase()}, ${ev.lvl.sentuhan} sentuhan, ${ev.lvl.level.toFixed(2)}) ditusuk sedalam ${ev.maxBeyondAtr.toFixed(2)} ATR ${n - 1 - ev.lastPierceIdx} candle lalu; close kini ${ev.closeNowAtr >= 0 ? 'DI LUAR +' : 'DI DALAM '}${ev.closeNowAtr.toFixed(2)} ATR; closes di luar: ${ev.closesBeyond}; vol break ${ev.volRatioBreak.toFixed(1)}x, lanjut ${ev.volFollow.toFixed(2)}x, akhir ${ev.volLate.toFixed(2)}x; pre-touch ${ev.preTouches}`
    // T6: FRESH-BREAK-SEHAT (pelajaran bedah r41, kasus g-retest-hold MUDAH
    // fbo600 #115): breakout yang BARU SAJA terjadi (umur <= 4, lastPierce
    // <= 1, 0-2 close di luar) dgn tanda-tanda sehat — level teruji (preT
    // 2-5), dorongan kuat searah (p7 >= 1.2), arah konsisten (>= 75%),
    // efisiensi tinggi (>= 0.85, tanpa chop), volume pengikut hidup (vF
    // 1.1-1.8, tanpa klimaks vBrk <= 1.9), close baru saja di luar (cN
    // 0.05-0.8 — belum overextended), mom50 bukan parabola (< 14, pelajaran
    // FB-L5), tanpa wick penolakan besar. Ini satu-satunya fase breakout
    // yang sah utk DIKUTI sejak lilin pertama — acceptance (T1/T2/T5)
    // butuh 9-30 close, terlambat utk break segar.
  if (
    umur <= 4 && n - 1 - ev.lastPierceIdx <= 1 && ev.closesBeyond <= 2 &&
    ev.closeNowAtr >= 0.05 && ev.closeNowAtr <= 0.8 && ev.maxBeyondAtr <= 1.0 &&
    ev.preTouches >= 2 && ev.preTouches <= 5 &&
    ev.push7Atr >= 1.2 && ev.dirCons >= 0.75 && ev.effAtr >= 0.85 &&
    ev.volFollow >= 1.1 && ev.volFollow <= 1.8 && ev.volRatioBreak <= 1.9 &&
    ev.volLate >= 1.0 && ev.wickBeyondAtr <= 0.4 && Math.abs(mom50v) < 14
  ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `break segar sehat: baru ${umur} candle, level teruji ${ev.preTouches}x, dorongan ${ev.push7Atr.toFixed(2)} ATR, arah ${Math.round(ev.dirCons * 100)}% konsisten, efisiensi ${ev.effAtr.toFixed(2)}, vol pengikut ${ev.volFollow.toFixed(2)}x tanpa klimaks`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T6', 'SG-L1'],
        alasan: [`FB-T6 FRESH-BREAK-SEHAT: ${caraEv} — breakout SEGAR (umur ${umur}) pada level teruji dgn dorongan ${ev.push7Atr.toFixed(2)} ATR, arah ${Math.round(ev.dirCons * 100)}% konsisten, efisiensi ${ev.effAtr.toFixed(2)} & volume pengikut ${ev.volFollow.toFixed(2)}x = kelanjutan sehat, bukan false breakout -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T6c: SERANGAN-SEGAR-MIKRO (pelajaran bedah r42, kasus g-retest-hold
    // BRUTAL fbo1300 #111/#117): breakout SANGAT muda (umur <= 4, 0-2 close
    // di luar) yang close-nya baru menyentuh sisi luar (cN 0-1.5 ATR — T6
    // butuh cN >= 0.05, di sini 0.02) dgn volume serangan MENANJAK (vF
    // >= 1.2), arah konsisten (>= 60%), dorongan kuat (p7 >= 1.0), level
    // teruji (preT >= 2), tanpa wick penolakan — serangan nyata, ikuti.
    // Bukti 18 seed: 2 tembakan, 2 MENANG.
    if (
      umur <= 4 && n - 1 - ev.lastPierceIdx <= 1 && ev.closesBeyond <= 2 &&
      ev.closeNowAtr >= 0.0 && ev.closeNowAtr <= 1.5 && ev.maxBeyondAtr >= 0.5 &&
      ev.push7Atr >= 1.0 && ev.volFollow >= 1.2 && ev.dirCons >= 0.6 &&
      ev.preTouches >= 2 && ev.wickBeyondAtr <= 0.5 && ev.volRatioBreak <= 1.9 &&
      Math.abs(momAl) <= 3.0 && ev.effAtr <= 0.85
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `serangan segar mikro: baru ${umur} candle, ${ev.closesBeyond} close di luar, vol serangan ${ev.volFollow.toFixed(2)}x, arah ${Math.round(ev.dirCons * 100)}% konsisten, dorongan ${ev.push7Atr.toFixed(2)} ATR`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T6c', 'SG-L1'],
        alasan: [`FB-T6c SERANGAN-SEGAR-MIKRO: ${caraEv} — breakout muda dgn volume serangan MENANJAK (${ev.volFollow.toFixed(2)}x) & arah konsisten ${Math.round(ev.dirCons * 100)}%: acceptance belum sempat terbentuk tapi serangannya nyata -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T6b: SERANGAN-SEGAR-KUAT (pelajaran bedah r41, kasus g-retest-hold
    // BRUTAL fbo1300 #111/#117): break SEGAR (umur <= 5) dgn serangan
    // bervolume tinggi (vF >= 1.2, vL >= 1.2), arah sangat konsisten
    // (>= 85%), dorongan kuat (p7 >= 1.2), close baru saja menembus
    // (cN 0.02-0.9), level teruji — terlalu muda utk acceptance (T1/T2)
    // dan chop-nya menggagalkan T6, tapi kombinasi volume+arah+push
    // = serangan nyata, bukan false breakout.
    if (
      false && // T6b DINONAKTIFKAN (biseksi r41) — diaktifkan terkalibrasi
      umur <= 5 && n - 1 - ev.lastPierceIdx <= 1 &&
      ev.closeNowAtr >= 0.02 && ev.closeNowAtr <= 0.9 && ev.maxBeyondAtr <= 1.6 &&
      ev.preTouches >= 2 && ev.preTouches <= 6 &&
      ev.push7Atr >= 1.2 && ev.dirCons >= 0.85 &&
      ev.volFollow >= 1.2 && ev.volLate >= 1.2 && ev.volRatioBreak <= 2.0 &&
      ev.wickBeyondAtr <= 0.4 && Math.abs(mom50v) < 14
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `serangan segar kuat: baru ${umur} candle, dorongan ${ev.push7Atr.toFixed(2)} ATR, arah ${Math.round(ev.dirCons * 100)}% konsisten, volume menanjak (vF ${ev.volFollow.toFixed(2)}x, akhir ${ev.volLate.toFixed(2)}x)`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T6b', 'SG-L1'],
        alasan: [`FB-T6b SERANGAN-SEGAR-KUAT: ${caraEv} — breakout muda (umur ${umur}) dgn volume MENANJAK (${ev.volFollow.toFixed(2)}x→${ev.volLate.toFixed(2)}x), arah ${Math.round(ev.dirCons * 100)}% konsisten & dorongan ${ev.push7Atr.toFixed(2)} ATR = serangan sejati pada level teruji -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T2: acceptance dalam & panjang bervolume (baseline PRA-BREAK)
    // mom50 cap 11.5: tren ekstrem + break = keluarga climax/momentum-fail
    // (mom50 15-22) — acceptance di dalam exhaustion BUKAN kelanjutan sehat.
    if (
      ev.closeNowAtr >= 3.2 && ev.closesBeyond >= 26 && umur >= 24 && umur <= 34 &&
      ev.volFollowPre >= 0.9 && ev.volLatePre >= 0.72 &&
      // v1.36b (pelajaran bedah hakim r42, kasus g-accept SEDANG fbo1900
      // #104/#110): acceptance-dalam dgn vBrk 2.45-3.1 hanya sah bila volume
      // DITAHAN SANGAT KUAT vs baseline (vFpre >= 1.2 & vLpre >= 1.2) —
      // serangan bervolume-kering-sedang (vFpre 0.9-1.1) adalah jebakan
      // follow-fail/drift (bukti fbo300 #21/#27, fbo1200 #22/#26).
      (ev.volRatioBreak <= 2.45 || (ev.volRatioBreak <= 3.1 && ev.volFollowPre >= 1.2 && ev.volLatePre >= 1.2)) &&
      momAl >= 3.2 && momAl <= 11.5 && wickExc <= 1.2 &&
      ev.volLate <= 1.25 &&
      // v1.34 LANTAI MOMENTUM-TRANSFER (pelajaran bedah r42, kasus
      // fbo-follow-fail MUDAH fbo1300 #28): acceptance efisiensi-tinggi
      // (eff >= 0.7) WAJIB momentum masih berpindah (lateM >= 0.3) —
      // acceptance dgn lateM negatif = dorongan sudah mati di puncak.
      // Bukti 18 seed: pemenang eff>=0.7 lateM >= 1.79; jebakan -0.17.
      (ev.effAtr < 0.7 || ev.lateMoveAtr >= 0.3)
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `acceptance dalam & panjang: ${ev.closesBeyond} close di luar (umur ${umur} candle), close ${ev.closeNowAtr.toFixed(2)} ATR dari level, vol pengikut ${ev.volFollowPre.toFixed(2)}x pra-break (akhir ${ev.volLatePre.toFixed(2)}x), TANPA flush wick (ekskursi ${wickExc.toFixed(2)} ATR)`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T2', 'SG-L1'],
        alasan: [`FB-T2 ACCEPTANCE-DALAM: ${caraEv} — harga menerima level lama sebagai lantai/plafon baru selama ${umur} candle dgn volume pengikut ${ev.volFollowPre.toFixed(2)}x pra-break & tanpa jejak flush -> tembusan sejati dalam tren ${momAl.toFixed(1)} ATR; ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T1: break senyap dalam tren kuat yang sedang berjeda (baseline PRA-BREAK)
    // DUA jalur: (a) wickExc [0.6, 2.2] + kekuatan (momAl >= 3.2 atau vFpre
    // >= 1.05) — jeda sudah menarik balik dari puncak; (b) wickExc < 0.6 +
    // pT <= 4 + vFpre >= 0.9 — jeda muda yang belum bergerak. vBrk <= 1.9
    // memisahkan dari drift kering (vBrk 1.9-2.1 dgn vFpre 0.7-0.8).
    // CAP momAl <= 14 (pelajaran bedah r41, kasus fbo300 #98/#100): break
    // parabola mom50 15-22 = keluarga momentum-fail yang menghukum pengikut
    // dgn V-snap — bukan kelanjutan sehat. Bukti pemisah: 26 guard+FBO yang
    // profit via T1 mom50 3.4-11.6; 2 likuidasi momentum-fail mom50 18.9-20.7.
    if (
      ev.closeNowAtr >= 0.2 && ev.volFollowPre >= 0.85 && ev.volLatePre >= 0.72 &&
      ev.closesBeyond >= 9 && umur <= 30 && momAl >= 2.4 && momAl <= 14 && ev.volRatioBreak <= 2.2 &&
      ev.effAtr <= 0.88 &&
      // v1.37 FDECAY (lihat T11): transfer meluncurkan + vFpre lemah + tren
      // lemah + harga jauh = serangan kehabisan bahan bakar — tidak diikuti.
      !(ev.volFollowPre < 0.98 && ev.lateMoveAtr < 0.5 * ev.earlyMoveAtr &&
        ev.earlyMoveAtr >= 2.0 && ev.closeNowAtr >= 1.5 && momAl < 6 && ev.dirCons >= 0.70) &&
      (ev.volLate <= 1.15 || ev.push7Atr <= 0.5) &&
      (ev.dirCons >= 0.3 || momAl >= 6.0 || (ev.push7Atr <= -0.5 && ev.effAtr <= 0.1)) &&
      // v1.37 T1DEMA (pelajaran bedah r43, kasus fbo-drift-snap SEDANG
      // fbo2300 #50): jeda-tren dgn harga SUDAH JAUH DI BAWAH EMA21 (dEma
      // <= -0.5) pada tren LEMAH (momAl < 8) = drift kering menuju
      // snap-back, bukan jeda sehat — kelanjutan sejati terjadi dekat
      // nilai-rata kecuali tren kuat menanggung. Bukti residu: #50 dEma
      // -2.11, momAl 3.2 -> entry likuidasi; T1-pemenang dEma dalam semua
      // momAl >= 8 (fbo2400 #102/#108: -3.39, 10.9).
      // v1.37 T1DEMA2 (pelajaran bedah r43, kasus fbo-drift-snap SEDANG
      // fbo2300 #50): drift KERING-DALAM (dEma <= -1.5) pada tren LEMAH
      // (momAl < 5) bukan jeda sehat — harga menggantung jauh di bawah
      // nilai-rata tanpa pengikut (vFpre 0.77) = jalan-lambat menuju
      // snap-back. (v1 ambang -0.5 terlalu luas: 56 pecah — DITOLAK.)
      !(momAl < 5 && fitur.distEma21Atr <= -1.5) &&
      ((wickExc >= 0.6 && wickExc <= 2.2 && ev.preTouches <= 4 && (momAl >= 3.2 || ev.volFollowPre >= 1.05)) ||
        (wickExc < 0.6 && ev.preTouches <= 4 && ev.volFollowPre >= 0.9 && ev.volRatioBreak <= 1.9 &&
          // v1.37b T1-REJ (pelajaran bedah hakim r44, kasus fbo-drift-snap
          // GILA fbo2700 #49): jalur-b pada harga JAUH di luar (cN >= 2.0)
          // dgn badan penolakan besar (rej > 0.6) pada tren LEMAH (momAl <
          // 6) = dorongan-terakhir yang akan mencabut; tren KUAT (fbo2000
          // #123: momAl 8.7, rejec 0.68, WIN) tetap menopang kelanjutan.
          (ev.closeNowAtr >= 2.0 && ev.rejecBodyAtr > 0.6 && momAl < 6 ? false : true))) &&
      // v1.34 LANTAI DORONGAN-EFISIEN (pelajaran bedah r42, kasus
      // fbo-drift-snap fbo1400 #46/#50/#52): episode efisiensi-tinggi
      // (eff >= 0.7) WAJIB dorongan segar hidup (p7 >= 1.0 ATR) — drift
      // efisien dgn dorongan mati = jalan-lambat menuju snap-back.
      // Bukti 18 seed: pemenang eff>=0.7 p7 >= 1.58; jebakan 0.53-0.60.
      (ev.effAtr < 0.7 || ev.push7Atr >= 1.0) &&
      // v1.35 JEDA-BERVOLUME-SAHH (pelajaran bedah r42, kasus fbo-follow-fail
      // MUDAH fbo1300 #28 & g-retest-hold BRUTAL #114): episode dgn dorongan
      // sudah berbalik negatif (p7 < 0) hanya sah diikuti bila transfer
      // momentum MASIH positif-rendah (lateM <= 0.7) DAN volume pengikut
      // DITAHAN penuh vs baseline (vFpre >= 0.90 & vLpre >= 0.80).
      // Bukti 18 seed: 33 pemenang p7<0 lateM <= 0.65 & vFpre >= 0.92;
      // jebakan #28 (vFpre 0.85) & #114 (lateM 0.94 = distribusi aktif).
      (ev.push7Atr >= 0 || (ev.lateMoveAtr <= 0.7 && ev.volFollowPre >= 0.90 && ev.volLatePre >= 0.80))
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `break senyap ter-accept dalam tren kuat (mom50 ${momAl.toFixed(1)} ATR searah): ${ev.closesBeyond} close di luar, vol pengikut ${ev.volFollowPre.toFixed(2)}x pra-break (akhir ${ev.volLatePre.toFixed(2)}x), tanpa flush`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T1', 'SG-L1'],
        alasan: [`FB-T1 BREAK-SENYAP-DALAM-TREN: ${caraEv} — tembusan bervolume-secukupnya dalam tren ${momAl.toFixed(1)} ATR dgn acceptance ${ev.closesBeyond} close & jeda sehat (vol ${ev.volFollowPre.toFixed(2)}x pra-break); jeda tren = peluang kelanjutan, bukan kegagalan -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T3: episode mengapung jauh dgn volume pengikut & tanpa wick penolakan
    // mom50 [9, 13]: cukup kuat utk float sah, di bawah exhaustion ekstrem
    if (
      ev.closeNowAtr >= 3 && ev.closesBeyond >= 15 &&
      ev.volFollowPre >= 0.9 && ev.volLatePre >= 0.72 &&
      ev.wickBeyondAtr <= 0.05 && Math.abs(mom50v) >= 9 && Math.abs(mom50v) <= 13 &&
      ev.volRatioBreak <= 1.9 &&
      ev.maxBeyondAtr <= 8.5 && wickExc <= 1.5 && ev.rejecBodyAtr <= 1.2 && ev.push7Atr >= -0.5
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `episode mengapung ${ev.closeNowAtr.toFixed(2)} ATR di luar level dgn ${ev.closesBeyond} close bervolume (${ev.volFollowPre.toFixed(2)}x pra-break) & nol wick penolakan dalam tren ekstrem ${momAl.toFixed(1)} ATR`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T3', 'SG-L1'],
        alasan: [`FB-T3 FLOAT-BERVOLUME: ${caraEv} — harga mengapung jauh di luar level, ${ev.closesBeyond} close bervolume, TANPA satu pun wick penolakan, dalam tren ekstrem searah -> false breakout tidak muncul di anatomi ini; ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T5: ACCEPTANCE MATANG TER-PARKIR (pelajaran bedah hakim r40, kasus
    // g-retest-hold BRUTAL/MUDAH): acceptance SANGAT panjang (30+ close)
    // yang volume-nya DITAHAN (vFpre >= 1.0) lalu kini parkir menempel level
    // (cN <= 3.2) menunggu kelanjutan — dorongan TIDAK RUNTUH (p7 >= 0:
    // spring-hl puncak p7 -1.0..-1.5 = sudah menggelincir) — acceptance
    // bervolume 30+ candle bukan stall (stall mengering: vFpre 0.6-0.8).
    if (
      umur >= 24 && ev.closesBeyond >= 30 && ev.volFollowPre >= 1.0 &&
      ev.closeNowAtr >= 0.2 && ev.closeNowAtr <= 6.5 &&
      Math.abs(fitur.distEma21Atr) <= 2.4 && !ev.climax &&
      wickExc <= 3.6 && ev.volRatioBreak <= 2.45 && ev.push7Atr >= 0 &&
      // v1.35 (pelajaran bedah r42, kasus fbo-follow-fail fbo1500 #21/#23/#27):
      // acceptance SANGAT jauh (cN > 3.2 ATR) wajib volume akhir-pra-break
      // ditahan (vLpre >= 0.75) — jauh di luar + volume kering = blow-off.
      // Bukti 18 seed: pemenang cN>3.2 vLpre >= 0.81; jebakan <= 0.66.
      (ev.closeNowAtr <= 3.2 || ev.volLatePre >= 0.75)
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `acceptance matang ter-parkir: ${ev.closesBeyond} close di luar selama ${umur} candle dgn volume DITAHAN (${ev.volFollowPre.toFixed(2)}x pra-break), kini parkir ${ev.closeNowAtr.toFixed(2)} ATR dari level tanpa jejak flush`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T5', 'SG-L1'],
        alasan: [`FB-T5 ACCEPTANCE-MATANG: ${caraEv} — ${ev.closesBeyond} close bervolume (${ev.volFollowPre.toFixed(2)}x pra-break) selama ${umur} candle = level baru DITERIMA pasar; parkir dekat level = peluang kelanjutan, bukan kegagalan -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T4: FRESH-V-RECOVERY (pelajaran bedah r40, kasus g-retest-hold SEDANG):
    // break muda (<= 5 candle) yang diuji balik lalu DIRECLAIM keras — close
    // sudah kembali di luar level, dorongan 7-candle kuat, arah konsisten.
    // Veto dEma21 (bukan momentum-fail) dan veto klimaks.
    if (
      umur <= 5 && ev.closesBeyond >= 2 && ev.closeNowAtr >= 0.05 &&
      ev.maxBeyondAtr >= 0.35 && ev.maxBeyondAtr <= 1.0 &&
      ev.push7Atr >= 1.5 && ev.dirCons >= 0.6 &&
      ev.volLatePre >= 0.8 && !ev.climax &&
      Math.abs(fitur.distEma21Atr) <= 2.4 &&
      ev.maxBeyondAtr - Math.max(0, ev.closeNowAtr) <= 1.0
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `V-recovery segar: break ${ev.maxBeyondAtr.toFixed(2)} ATR ${umur} candle lalu diuji balik lalu direclaim (close ${ev.closeNowAtr.toFixed(2)} ATR di luar), dorongan ${ev.push7Atr.toFixed(2)} ATR, arah ${Math.round(ev.dirCons * 100)}% konsisten`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T4', 'SG-L1'],
        alasan: [`FB-T4 FRESH-V-RECOVERY: ${caraEv} — uji-ulang dini DITOLAK dan harga mereclaim level dengan dorongan ${ev.push7Atr.toFixed(2)} ATR & arah konsisten; reclaim segar pada level teruji = kelanjutan -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T7: DRIFT-ACCEPTANCE (pelajaran bedah r41, kasus g-accept BRUTAL
    // fbo900 #102/#108): breakdown lama yang diterima pasar secara PERLAMBAT
    // — episode tua (umur 14-32), 14+ close di luar, close 1.2-3.0 ATR di
    // luar (bukan parabola), arah tetap konsisten (>= 68%), volume NETRAL
    // (vF 0.9-1.25 — bukan kering utk fade FB-L6, bukan klimaks), masih
    // menggelincir searah break (p7 >= 0.3), tanpa flush wick (wickExc
    // <= 0.6), momen rendah (momAl < 2.8 — di atasnya T1 sudah menangkap).
    // PEMISAH dari jebakan drift-snap (bukti 9 seed): jebakan tua dir-nya
    // RENDAH (<= 0.63 = chop dua arah), jebakan muda umurnya pendek
    // (<= 9 candle) — keduanya ter veto di sini.
    if (
      umur >= 14 && umur <= 32 && ev.closesBeyond >= 14 &&
      ev.closeNowAtr >= 1.2 && ev.closeNowAtr <= 3.0 && ev.maxBeyondAtr <= 3.6 &&
      ev.dirCons >= 0.68 && ev.volRatioBreak <= 1.9 &&
      ev.volFollow >= 0.9 && ev.volFollow <= 1.25 && ev.volLate >= 0.8 &&
      ev.push7Atr >= 0.3 && wickExc <= 0.6 && momAl < 2.8
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `drift-acceptance: episode ${umur} candle, ${ev.closesBeyond} close di luar, arah ${Math.round(ev.dirCons * 100)}% konsisten, volume netral ${ev.volFollow.toFixed(2)}x, masih menggelincir searah break ${ev.push7Atr.toFixed(2)} ATR`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T7', 'SG-L1'],
        alasan: [`FB-T7 DRIFT-ACCEPTANCE: ${caraEv} — tembusan lama yang DITERIMA secara perlahan (${ev.closesBeyond} close di luar, arah ${Math.round(ev.dirCons * 100)}% konsisten, volume netral ${ev.volFollow.toFixed(2)}x, tanpa flush): pasar menerima wilayah baru dan terus menggelincir searah break -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T9: MODERATE-ACCEPT (pelajaran bedah r41, kasus g-trend-cont BRUTAL
    // fbo1200 #120/#122/#124): acceptance momentum-sedang dgn episode sedang
    // — umur 12-24, 12+ close di luar, close 1.0-5.5 ATR, arah SANGAT
    // konsisten (>= 75%), efisiensi baik (>= 0.6), volume pengikut normal
    // (0.9-1.2x), tanpa flush wick (wickExc <= 0.5), masih menggelincir
    // searah (p7 >= 0.5). T1 tak menjangkau (vBrk 2.0 > jalur-b 1.9, wickExc
    // 0.39 < jalur-a 0.6); T2 tak (cOut < 26). Pemisah dari jebakan
    // drift-snap (bukti 9 seed): jebakan dir-nya <= 0.63 / umurnya <= 9.
    if (
      umur >= 12 && umur <= 24 && ev.closesBeyond >= 14 &&
      ev.closeNowAtr >= 1.0 && ev.closeNowAtr <= 5.5 &&
      ev.dirCons >= 0.6 && ev.effAtr >= 0.4 && ev.volRatioBreak <= 2.1 &&
      ev.volFollow >= 0.9 && ev.volFollow <= 1.2 &&
      ev.volLate >= 0.78 && ev.volLate <= 1.2 &&
      // v1.36c (pelajaran bedah hakim r42, kasus g-accept BRUTAL fbo2100
      // #102/#108): volume akhir-pra-break rendah (vLpre 0.60-0.85) hanya
      // sah bila arah SANGAT konsisten (dir >= 70%) — bukti 24 seed: 2/2.
      // v1.37 fix T9BUG: kondisi kedua yang redundan (&& vLpre >= 0.85)
      // MEMBUNUH pengecualian v1.36c — sisa sesi terpotong r42; dipulihkan.
      (ev.volLatePre >= 0.85 || (ev.dirCons >= 0.70 &&
        // v1.37 T9BUG: pulihkan pengecualian v1.36c (vLpre-kering dgn arah
        // sangat konsisten) + kalibrasi r43: exception hanya utk episode
        // yang mendekat SETELAH jejak penolakan nyata (rej >= 0.3, bukan
        // klimaks) — serangan murni tanpa penolakan (follow-fail fbo1200
        // #22/#26: rej 0.11) dgn vLpre kering = serangan yang akan gagal.
        !ev.climax && ev.rejecBodyAtr >= 0.3)) &&
      wickExc <= 0.6 && ev.push7Atr >= 0.45 && momAl >= 5.0 && momAl <= 14
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `moderate-acceptance: episode ${umur} candle, ${ev.closesBeyond} close di luar, arah ${Math.round(ev.dirCons * 100)}% konsisten, efisiensi ${ev.effAtr.toFixed(2)}, dorongan berlanjut ${ev.push7Atr.toFixed(2)} ATR`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T9', 'SG-L1'],
        alasan: [`FB-T9 MODERATE-ACCEPT: ${caraEv} — tembusan diterima pasar dgn arah ${Math.round(ev.dirCons * 100)}% konsisten & dorongan berlanjut (${ev.closesBeyond} close di luar, tanpa flush): kelanjutan sehat, bukan false breakout -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T10: LONG-ACCEPT (pelajaran bedah r41, kasus g-accept/g-retest-hold
    // fbo1000 #102/#108/#112/#116 & fbo1200 #101/#105): episode SANGAT
    // panjang (24+ close di luar, umur 24+) yang terus diterima — close
    // jauh di luar (2.5-8.5 ATR), arah konsisten (>= 70%), volume pengikut
    // normal, masih menggelincir searah (p7 >= 1.0), tanpa flush besar
    // (wickExc <= 1.0, rej <= 1.0). T2 tak cukup panjang (cOut 26 & umur
    // 24-34 tapi cN >= 3.2 dgn vBrk/vL ketat), T9 tak utk umur 24+.
    // VETO parabola: momAl <= 14 (wilayah momentum-fail 15-22, FB-L5).
    if (
      umur >= 24 && ev.closesBeyond >= 24 &&
      ev.closeNowAtr >= 2.5 && ev.closeNowAtr <= 8.5 &&
      ev.dirCons >= 0.7 && ev.rejecBodyAtr >= 0.5 && ev.rejecBodyAtr <= 1.0 && wickExc <= 1.0 &&
      ev.push7Atr >= 1.0 && ev.volRatioBreak <= 3.0 &&
      ev.volFollow >= 0.95 && ev.volFollow <= 1.2 && ev.volLate >= 0.9 &&
      momAl >= 4.0 && momAl <= 14 && ev.effAtr >= 0.25
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `long-acceptance: ${ev.closesBeyond} close di luar selama ${umur} candle, arah ${Math.round(ev.dirCons * 100)}% konsisten, dorongan berlanjut ${ev.push7Atr.toFixed(2)} ATR, tanpa flush (ekskursi ${wickExc.toFixed(2)} ATR)`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T10', 'SG-L1'],
        alasan: [`FB-T10 LONG-ACCEPT: ${caraEv} — episode panjang (${ev.closesBeyond} close di luar, ${umur} candle) yang TERUS diterima pasar dgn arah ${Math.round(ev.dirCons * 100)}% konsisten & dorongan berlanjut: wilayah baru sudah milik pasar -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T14: AKUMULASI-LAMBAT (v1.37, pelajaran bedah r43, kasus
    // g-retest-hold GILA fbo2300 #112/#116 & g-trend-cont GILA fbo2200
    // #121): episode acceptance PANJANG (20+ close) yang efisiensinya
    // RENDAH (eff <= 0.45 = jalan berputar-ke-atas pelan) tapi ARAH
    // TETAP KONSISTEN (dir >= 60%), volume DITAHAN penuh vs baseline
    // (vFpre >= 0.9 & vLpre >= 0.85), masih menggelincir searah break
    // (p7 >= 0.5), tanpa badan penolakan besar (rej <= 1.2) — akumulasi
    // menuju kelanjutan. Pemisah dari jebakan: follow-fail/climax-fail
    // punya eff TINGGI tapi vFpre < 0.95; equal-trap punya lateMove
    // negatif (energi mati — ditangkap veto T11VETO).
    if (
      ev.closesBeyond >= 20 && ev.closeNowAtr >= 0.8 &&
      ev.dirCons >= 0.6 && ev.effAtr <= 0.45 &&
      ev.volFollowPre >= 0.9 && ev.volLatePre >= 0.85 &&
      ev.volRatioBreak <= 2.2 && ev.push7Atr >= 0.5 &&
      ev.rejecBodyAtr <= 1.2 && wickExc <= 1.4 &&
      momAl >= 2.4 && momAl <= 8
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `akumulasi-lambat: ${ev.closesBeyond} close di luar dgn efisiensi ${ev.effAtr.toFixed(2)} (jalan berputar pelan) tapi arah ${Math.round(ev.dirCons * 100)}% konsisten & volume ditahan (${ev.volFollowPre.toFixed(2)}x pra-break)`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T14', 'SG-L1'],
        alasan: [`FB-T14 AKUMULASI-LAMBAT: ${caraEv} — acceptance panjang (${ev.closesBeyond} close) yang berjalan berputar pelan (eff ${ev.effAtr.toFixed(2)}) dgn arah tetap konsisten (${Math.round(ev.dirCons * 100)}%) & volume DITAHAN (${ev.volFollowPre.toFixed(2)}x pra-break): akumulasi menuju kelanjutan -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T16: TREN-MAKRO-ACCEPT (v1.37, pelajaran bedah r43, kasus
    // g-trend-cont BRUTAL fbo2300 #120): episode dgn arah per-candle
    // CHOP (dir rendah) tapi tren-makro 50-candle JELAS searah break
    // (momAlign 2.5-8) + volume DITAHAN (vFpre >= 1.0 & vLpre >= 0.95)
    // + tanpa badan penolakan (rej <= 0.7) + close tetap di luar (cN
    // >= 0.8) — kelanjutan makro mendominasi chop mikro; fade melawan
    // tren makro = melikuidasi diri. momAl cap 8 = parabola (FB-L5)
    // tetap tersaring.
    if (
      Math.abs(momAl) >= 2.5 && momAl <= 8 &&
      // v1.37 kalibrasi T16M12: mom12-ALIGN (di-mirror per sisi episode)
      // tidak boleh MELAWAN keras — kelanjutan makro dgn momentum-pendek
      // berbalik (fbo1100 #48: mom12 +1.2 vs break TURUN = align -1.2) =
      // awal reversi, bukan kelanjutan.
      ((ev.side === 'ATAS' ? fitur.mom12Atr : -fitur.mom12Atr) >= -0.3) &&
      ev.closesBeyond >= 15 && ev.closeNowAtr >= 0.8 &&
      ev.volFollowPre >= 1.0 && ev.volLatePre >= 0.95 &&
      ev.rejecBodyAtr <= 0.7 && ev.volRatioBreak <= 2.2 &&
      !ev.climax && wickExc <= 1.5
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `kelanjutan tren-makro: chop mikro (dir ${Math.round(ev.dirCons * 100)}%) tapi tren 50-candle ${momAl.toFixed(1)} ATR searah break, volume ditahan (${ev.volFollowPre.toFixed(2)}x pra-break), tanpa penolakan`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T16', 'SG-L1'],
        alasan: [`FB-T16 TREN-MAKRO-ACCEPT: ${caraEv} — chop mikro tidak mengubah tren makro (${momAl.toFixed(1)} ATR searah break) dgn volume DITAHAN (${ev.volFollowPre.toFixed(2)}x) & tanpa badan penolakan: kelanjutan makro -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T6X: EPISODE-MURNI-MUDA (v1.37, pelajaran bedah r43, kasus
    // g-retest-hold BRUTAL fbo800 #114): episode MUDA (umur <= 8) yang
    // SANGAT MURNI — efisiensi >= 0.9 (hampir tanpa chop), arah >= 95%,
    // dorongan segar >= 1.5 ATR, volume ditahan (vFpre >= 1.0), break
    // tenang (vBrk <= 1.5, tanpa klimaks), tren makro moderat (|momAl|
    // <= 8) — tembusan sejati yang murni; menunggu = kelewatan.
    // Pemisah dari PUNISH: momentum-fail/climax parabola momAl 15+;
    // follow-fail eff <= 0.7.
    if (
      // v1.37 kalibrasi r43: wajib RETEST (episode straddle level-patah) —
      // episode muda murni TANPA konteks retest (drift-snap fbo800 #46/#52:
      // retest=0) adalah break-muda yang akan snap-back; retest-hold muda
      // murni (fbo800 #114: retest=1) yang layak diikuti.
      umur <= 8 && ev.closesBeyond <= 8 && ev.retest &&
      ev.effAtr >= 0.9 && ev.dirCons >= 0.95 &&
      ev.push7Atr >= 1.5 && ev.volFollowPre >= 1.0 &&
      ev.volRatioBreak <= 1.5 && !ev.climax &&
      ev.wickBeyondAtr <= 0.4 && Math.abs(momAl) <= 8 &&
      ev.closeNowAtr >= 0.25
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `episode muda murni: umur ${umur} candle, efisiensi ${ev.effAtr.toFixed(2)}, arah ${Math.round(ev.dirCons * 100)}% konsisten, dorongan ${ev.push7Atr.toFixed(2)} ATR, tanpa chop`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T6X', 'SG-L1'],
        alasan: [`FB-T6X EPISODE-MURNI-MUDA: ${caraEv} — tembusan muda (${umur} candle) yang SANGAT murni (eff ${ev.effAtr.toFixed(2)}, arah ${Math.round(ev.dirCons * 100)}%, dorongan ${ev.push7Atr.toFixed(2)} ATR, vol ditahan ${ev.volFollowPre.toFixed(2)}x): kelanjutan murni, bukan false breakout -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
    // T15: KLIMAKS-ACCEPT (v1.37, pelajaran bedah r43, kasus g-accept
    // SEDANG/MUDAH fbo2200 #101/#109): klimaks (vBrk >= 2.2) yang volume
    // pengikutnya DITAHAN KUAT vs baseline pra-break (vFpre >= 1.25),
    // arah KONSISTEN (dir >= 70%), dorongan transfer hidup (lateMove
    // >= 1.5), acceptance panjang (20+ close) & close jauh di luar (cN
    // >= 3) — bukan exhaustion, ini acceptance bertenaga yang MELANJUT;
    // meng-fade-nya = melawan gelombang. Pemisah dari climax-fail PUNISH:
    // dorongan terakhir PUNISH punya vFpre <= 1.2 & lateMove <= 1.5
    // (kalibrasi probe r43).
    if (
      ev.climax && ev.volFollowPre >= 1.25 &&
      ev.dirCons >= 0.70 && ev.lateMoveAtr >= 1.5 &&
      ev.closesBeyond >= 20 && ev.closeNowAtr >= 3.0 &&
      fitur.distEma21Atr <= 2.4 && wickExc <= 1.2
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `klimaks-accept: vol break ${ev.volRatioBreak.toFixed(1)}x tapi volume DITAHAN KUAT (${ev.volFollowPre.toFixed(2)}x pra-break), arah ${Math.round(ev.dirCons * 100)}% konsisten, transfer momentum hidup (${ev.lateMoveAtr.toFixed(2)} ATR)`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T15', 'SG-L1'],
        alasan: [`FB-T15 KLIMAKS-ACCEPT: ${caraEv} — klimaks dgn volume pengikut DITAHAN KUAT (${ev.volFollowPre.toFixed(2)}x pra-break) & arah konsisten (${Math.round(ev.dirCons * 100)}%) & transfer momentum hidup (${ev.lateMoveAtr.toFixed(2)} ATR): acceptance bertenaga yang melanjut, bukan exhaustion -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
  // ===== FB-T6Y: SERANGAN-MUDA-BERSIH (v1.37b, pelajaran bedah r44,
  // kasus g-accept GILA fbo3000 #103/#107): episode MUDA (umur <= 8)
  // dengan efisiensi SANGAT tinggi (>= 0.85), arah konsisten (>= 70%),
  // dorongan segar (p7 >= 1.5), level SANGAT teruji (preT >= 5), break
  // tenang (vBrk <= 1.5) & TANPA wick penolakan (wickB <= 0.1) —
  // tembusan sejati muda pada level kedalaman; L4c tak menjangkau
  // (umur > 5), T6/T6c tak (cOut > 2) — celah muda-bersih.
  if (
    umur <= 8 && ev.closesBeyond <= 10 &&
    ev.effAtr >= 0.85 && ev.dirCons >= 0.70 &&
    ev.push7Atr >= 1.5 && ev.preTouches >= 5 &&
    ev.volFollow >= 0.9 && ev.volRatioBreak <= 1.5 && !ev.climax &&
    ev.wickBeyondAtr <= 0.1 && ev.closeNowAtr >= 0.25 &&
    Math.abs(momAl) <= 8
  ) {
    return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
      ...evBasis,
      falseSinyal: [],
      konfirmasi: `serangan muda bersih: umur ${umur} candle, efisiensi ${ev.effAtr.toFixed(2)}, arah ${Math.round(ev.dirCons * 100)}% konsisten, dorongan ${ev.push7Atr.toFixed(2)} ATR, level teruji ${ev.preTouches}x, tanpa wick penolakan`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T6Y', 'SG-L1'],
      alasan: [`FB-T6Y SERANGAN-MUDA-BERSIH: ${caraEv} — tembusan muda (${umur} candle) yang SANGAT bersih (eff ${ev.effAtr.toFixed(2)}, arah ${Math.round(ev.dirCons * 100)}%, dorongan ${ev.push7Atr.toFixed(2)} ATR, level teruji ${ev.preTouches}x, nol wick penolakan): kelanjutan sejati -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
    }, 3)
  }
  // T6Z: MUDA-BERDORONGAN-DALAM-TREN (v1.37b, pelajaran bedah hakim r44,
  // kasus g-trend-cont BRUTAL fbo2500 #120): episode muda (umur <= 8)
  // dengan dorongan segar KUAT (p7 >= 1.5) & transfer momentum hidup
  // (lateM >= 1.5) dalam tren searah (momAl >= 3), arah konsisten (>=
  // 75%), break tenang (vBrk <= 1.5), tanpa wick besar (wickB <= 0.25)
  // — serangan muda yang ditopang tren makro; L4c butuh umur <= 5, T17
  // butuh cOut >= 15 — celah muda-berdorongan.
  if (
    umur <= 8 && ev.closesBeyond <= 10 &&
    ev.dirCons >= 0.75 && ev.effAtr >= 0.6 &&
    ev.push7Atr >= 1.5 && ev.lateMoveAtr >= 1.5 &&
    momAl >= 3.0 && momAl <= 14 &&
    // v1.37b kalibrasi: serangan WAJIB bervolume-pengikut (vF >= 0.9 &
    // vFpre >= 0.95) — drift kering (fbo200 #48: vF 0.81) yang berdorongan
    // adalah jalan-lambat menuju snap-back, bukan serangan.
    ev.volFollow >= 0.9 && ev.volFollowPre >= 0.95 &&
    ev.volRatioBreak <= 1.5 && !ev.climax &&
    ev.wickBeyondAtr <= 0.25 && ev.closeNowAtr >= 0.25 &&
    ev.preTouches >= 2
  ) {
    return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
      ...evBasis,
      falseSinyal: [],
      konfirmasi: `serangan muda berdorongan dalam tren: umur ${umur} candle, dorongan ${ev.push7Atr.toFixed(2)} ATR, transfer ${ev.lateMoveAtr.toFixed(2)} ATR, tren makro ${momAl.toFixed(1)} ATR searah, arah ${Math.round(ev.dirCons * 100)}% konsisten`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T6Z', 'SG-L1'],
      alasan: [`FB-T6Z MUDA-BERDORONGAN: ${caraEv} — serangan muda (${umur} candle) dgn dorongan kuat (${ev.push7Atr.toFixed(2)} ATR) & transfer momentum hidup (${ev.lateMoveAtr.toFixed(2)} ATR) yang ditopang tren makro (${momAl.toFixed(1)} ATR): kelanjutan sejati -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
    }, 3)
  }
  // ===== FB-T18: RETES-MIKRO-BERVOLUME (v1.37b, pelajaran bedah hakim
  // r44, kasus g-retest-hold MUDAH fbo2600 #118): tusukan MIKRO (maxB <=
  // 0.5) yang kembali dangkal (cN >= -0.5) TANPA badan penolakan (rej <=
  // 0.05), arah konsisten (>= 70%), dorongan kuat (p7 >= 1.0), volume
  // serangan MENANJAK (vFpre >= 1.2) pada level-patah (retest) — uji-ulang
  // mikro yang ditolak bersih: kelanjutan, bukan kegagalan.
  if (
    umur <= 8 && ev.closesBeyond <= 2 &&
    ev.maxBeyondAtr <= 0.5 && ev.closeNowAtr >= -0.5 && ev.closeNowAtr <= -0.02 &&
    ev.dirCons >= 0.70 && ev.push7Atr >= 1.0 &&
    ev.volFollowPre >= 1.2 && ev.rejecBodyAtr <= 0.05 &&
    ev.retest && !ev.climax
  ) {
    return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
      ...evBasis,
      falseSinyal: [],
      konfirmasi: `retes-mikro bervolume: tusukan ${ev.maxBeyondAtr.toFixed(2)} ATR ditolak TANPA badan penolakan, dorongan ${ev.push7Atr.toFixed(2)} ATR, arah ${Math.round(ev.dirCons * 100)}% konsisten, volume serangan ${ev.volFollowPre.toFixed(2)}x`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T18', 'SG-L1'],
      alasan: [`FB-T18 RETES-MIKRO-BERVOLUME: ${caraEv} — tusukan mikro (${ev.maxBeyondAtr.toFixed(2)} ATR) ditolak BERSIH (nol badan penolakan) dgn dorongan kuat (${ev.push7Atr.toFixed(2)} ATR) & volume serangan menanjak (${ev.volFollowPre.toFixed(2)}x): uji-ulang yang gagal -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
    }, 3)
  }
  // ===== FB-T19: KOREKSI-DANGKAL-BERVOLUME (v1.37b, pelajaran bedah hakim
  // r44, kasus fbo-round GILA fbo2700 #71 & fbo2900 #71): episode pendek
  // (umur <= 10, cOut <= 8) yang kembali dangkal ke dalam (cN >= -1.5)
  // SETELAH serangan BERVOLUME (vBrk >= 2.3, vFpre >= 1.15) tanpa badan
  // penolakan ekstrem (rej <= 0.65) — serangan ditahan, koreksi mikro:
  // kelanjutan, bukan kegagalan (L1 fade-nya dilikuidasi re-break).
  if (
    umur <= 10 && ev.closesBeyond <= 8 &&
    ev.closeNowAtr >= -1.5 && ev.closeNowAtr <= -0.05 &&
    ev.maxBeyondAtr >= 0.8 && ev.volRatioBreak >= 2.3 &&
    ev.volFollowPre >= 1.15 && ev.rejecBodyAtr <= 0.65 && !ev.climax &&
    Math.abs(momAl) <= 10
  ) {
    return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
      ...evBasis,
      falseSinyal: [],
      konfirmasi: `koreksi-dangkal bervolume: serangan ${ev.volRatioBreak.toFixed(1)}x ditahan (vFpre ${ev.volFollowPre.toFixed(2)}x), harga kembali dangkal (${ev.closeNowAtr.toFixed(2)} ATR) tanpa penolakan ekstrem`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T19', 'SG-L1'],
      alasan: [`FB-T19 KOREKSI-DANGKAL-BERVOLUME: ${caraEv} — serangan BERVOLUME (${ev.volRatioBreak.toFixed(1)}x, ditahan ${ev.volFollowPre.toFixed(2)}x pra-break) yang koreksinya DANGKAL (${ev.closeNowAtr.toFixed(2)} ATR) & tanpa badan penolakan ekstrem: uji-ulang mikro pada serangan kuat -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
    }, 3)
  }
  // T17: KELANJUTAN-ACCEPT-DALAM (v1.37b, pelajaran bedah r44, kasus
  // g-trend-cont/g-retest-hold hakim segel fbo2600 #120/#122/#124 &
  // fbo2800 #112/#116): acceptance PANJANG (15+ close) yang SUDAH JAUH
  // di luar (cN >= 2.5), tren makro searah KUAT (momAl 4-14), arah
  // konsisten (>= 60%), transfer momentum hidup (lateM >= 0.5), volume
  // DITAHAN kuat (vFpre >= 1.1), tanpa penolakan (rej <= 0.6) & tanpa
  // klimaks — wilayah baru yang diterima; menunggu = kelewatan.
  if (
    ev.closesBeyond >= 15 && ev.closeNowAtr >= 2.5 &&
    momAl >= 4.0 && momAl <= 14 && ev.dirCons >= 0.60 &&
    ev.lateMoveAtr >= 0.5 && ev.volFollowPre >= 1.1 &&
    ev.rejecBodyAtr <= 0.6 && !ev.climax && ev.volRatioBreak <= 2.6 &&
    wickExc <= 1.5 && ev.wickBeyondAtr <= 0.2
  ) {
    return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
      ...evBasis,
      falseSinyal: [],
      konfirmasi: `kelanjutan-accept dalam: ${ev.closesBeyond} close di luar, tren makro ${momAl.toFixed(1)} ATR searah, arah ${Math.round(ev.dirCons * 100)}% konsisten, volume ditahan (${ev.volFollowPre.toFixed(2)}x pra-break), tanpa penolakan`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T17', 'SG-L1'],
      alasan: [`FB-T17 KELANJUTAN-ACCEPT: ${caraEv} — acceptance panjang (${ev.closesBeyond} close) SUDAH JAUH di luar (${ev.closeNowAtr.toFixed(2)} ATR) dalam tren makro searah (${momAl.toFixed(1)} ATR) dgn volume DITAHAN (${ev.volFollowPre.toFixed(2)}x) & transfer momentum hidup: wilayah baru diterima -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
    }, 3)
  }
  // T8: PULLBACK-TERSERAP (pelajaran bedah r41, kasus g-accept GILA
    // fbo1100 #103/#107 & g-trend-cont GILA fbo1200 #121): setelah meloncat
    // jauh, harga MENARIK BALIK DALAM dari ekstrem (wickExc >= 1.5 ATR)
    // dgn badan penolakan besar tertelan (rej >= 0.6), TAPI tetap DI LUAR
    // level (cN 1.5-4.5) dan tren searah tetap kuat (momAl >= 4) — koreksi
    // sudah selesai diserap, kelanjutan menanti. Ikuti searah break.
    if (
      ev.closeNowAtr >= 1.5 && ev.closeNowAtr <= 4.5 && ev.closesBeyond >= 15 &&
      umur >= 12 && umur <= 34 && wickExc >= 1.5 &&
      ev.rejecBodyAtr >= 0.6 && ev.rejecBodyAtr <= 1.5 && ev.push7Atr <= -0.8 && momAl >= 4.0 &&
      ev.volLate >= 0.8 && ev.volRatioBreak <= 2.5
    ) {
      return mk(versi, { aksi: 'ENTRY', arah: evBreakArah, targetPct: TARGET_DISIPLIN, stopPct: evStop }, {
        ...evBasis,
        falseSinyal: [],
        konfirmasi: `pullback terserap: koreksi ${wickExc.toFixed(2)} ATR dari ekstrem dgn badan tolak ${ev.rejecBodyAtr.toFixed(2)} ATR, harga tetap ${ev.closeNowAtr.toFixed(2)} ATR di luar level, tren ${momAl.toFixed(1)} ATR searah`,
        prematureRisk: false,
        pelajaranAktif: ['FB-T8', 'SG-L1'],
        alasan: [`FB-T8 PULLBACK-TERSERAP: ${caraEv} — koreksi dalam (${wickExc.toFixed(2)} ATR dari ekstrem) sudah DISERAP pasar (badan tolak ${ev.rejecBodyAtr.toFixed(2)} ATR) dan harga tetap di luar level dalam tren ${momAl.toFixed(1)} ATR: retest selesai, kelanjutan -> ikuti ${evBreakArah}, stop ${evStop.toFixed(2)}%`],
      }, 3)
    }
  }

  // ===== FB-T11: STEADY-ACCEPT (pelajaran bedah r42, kasus g-accept
  // fbo1700 #103/#105/#107) =====
  // Penerimaan STEADY yang layak-diikuti: close di luar, volume pengikut
  // NETRAL-STABIL (vF 0.9-1.3) & akhir tidak menyusut (vL >= 0.9), volume
  // DITAHAN vs baseline pra-break (vFpre >= 0.85), TANPA flush wick
  // (ekskursi <= 1.4) & tanpa badan penolakan besar, dan harga TIDAK
  // melayang jauh di bawah EMA21 (dEma >= -0.5) — acceptance sejati
  // terjadi dekat nilai-rata; drift jauh di bawah mean = exhaustion
  // (jebakan drift-snap/weak terukur dEma -0.86..-2.0: 0 tembakan di
  // 18 seed, 83 tembakan MENANG / 0 KALAH).
  const momAl11 = E.side === 'ATAS' ? mom50v : -mom50v
  if (
    E.closeNowAtr >= 0.05 && E.closesBeyond >= 6 && !E.crossBack &&
    E.volFollow >= 0.9 && E.volFollow <= 1.3 && E.volLate >= 0.9 &&
    E.maxBeyondAtr - Math.max(0, E.closeNowAtr) <= 1.4 && E.rejecBodyAtr <= 1.0 &&
    E.volRatioBreak <= 2.2 && E.volFollowPre >= 0.85 &&
    momAl11 <= 14 && fitur.distEma21Atr <= 2.4 &&
    // v1.36c (pelajaran bedah hakim r42): dEma-dalam (di bawah -0.5) hanya
    // sah utk tren KUAT searah (momAl >= 8) — acceptance sejati bisa jauh
    // di bawah mean saat tren searah kuat (fbo2400 #102/#108: dEma -3.39,
    // momAl 10.9, follow WIN); jebakan drift-snap/weak momAl 1.4-4.4.
    (fitur.distEma21Atr >= -0.5 || momAl11 >= 8) &&
    // v1.37 T11VETO (pelajaran bedah r43, kasus fbo-equal BRUTAL fbo2200
    // #63/#69): acceptance dgn ENERGI MATI (lateMove <= 0.2 — 10 candle
    // terakhir tidak bergerak searah break) bukan penerimaan; equal-highs
    // trap mendatar di puncak lalu mencabut. Penerimaan sejati MELANJUTKAN
    // dorongan. Tren KUAT (momAl >= 8) tetap sah — tren menanggung energi.
    (E.lateMoveAtr >= 0.2 || momAl11 >= 8 || E.closeNowAtr < 0.8) &&
    // v1.37b T11-WICK (pelajaran bedah hakim r44, kasus fbo-equal
    // fbo2800 #63/#67/#69): acceptance dgn WICK penolakan nyata (>= 0.3)
    // pada harga yang masih DEKAT level (cN <= 1.0), arah RENDAH (<= 55%)
    // & volume akhir MENANJAK (vL >= 1.15) = sapuan bervolume yang akan
    // mencabut — bukan acceptance; penerimaan sejati TANPA wick.
    !(E.wickBeyondAtr >= 0.3 && E.closeNowAtr <= 1.0 && E.dirCons <= 0.55 && E.volLate >= 1.15) &&
    // v1.37b T11-REJ: badan penolakan besar (rej > 0.72) pada harga JAUH
    // di luar (cN >= 1.5) = dorongan-terakhir yang akan gagal
    // (fbo2600 #49: rej 0.76, cN 3.17 -> entry dilikuidasi). Penolakan
    // besar pada harga DEKAT level (fbo1600 #121: rej 0.88, cN 0.54)
    // adalah retest-ditolak yang sah — tetap diikuti.
    !(E.rejecBodyAtr > 0.72 && E.closeNowAtr >= 1.5) &&
    // v1.37 FDECAY (pelajaran bedah r43, kasus fbo-follow-fail SEDANG
    // fbo2200 #23): acceptance dgn transfer-momentum MELUNCURKAN (lateM
    // < 0.5x earlyM, earlyM >= 2.0) + volume pengikut MELEMAH (vFpre <
    // 0.98) + tren LEMAH (momAl < 6) + harga SUDAH JAUH (cN >= 1.5) =
    // serangan yang kehabisan bahan bakar jauh dari basis — follow-nya
    // T1 maupun T11 sama-sama dilikuidasi; jatuh ke WAIT-fade dgn
    // konfirmasi close-back (FB-K2).
    !(E.volFollowPre < 0.98 && E.lateMoveAtr < 0.5 * E.earlyMoveAtr &&
      E.earlyMoveAtr >= 2.0 && E.closeNowAtr >= 1.5 && momAl11 < 6 && E.dirCons >= 0.70) &&
    // v1.36c: pengecualian dEma-dalam utk tren KUAT (momAl >= 8) —
    // acceptance sejati bisa jauh di bawah mean saat tren searah kuat
    // (bukti fbo2400 #102/#108: dEma -3.39, momAl 10.9, follow WIN);
    // v1.36 (pelajaran bedah hakim r42, kasus fbo-weak fbo2100 #4/#8):
    // acceptance dgn arah HAMPIR MATI (dir < 30%) = chop dua arah, bukan
    // penerimaan — pemenang T11 terukur dir >= 0.38; jebakan 0.25.
    E.dirCons >= 0.30
  ) {
    const stop = stopFollow(breakArah, entry, L.level, atr)
    return mk(versi, { aksi: 'ENTRY', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: stop }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `steady-accept: ${E.closesBeyond} close di luar dgn volume stabil (vF ${E.volFollow.toFixed(2)}x, akhir ${E.volLate.toFixed(2)}x, pra-break ${E.volFollowPre.toFixed(2)}x), tanpa flush (ekskursi ${(E.maxBeyondAtr - Math.max(0, E.closeNowAtr)).toFixed(2)} ATR), harga dekat EMA21 (${fitur.distEma21Atr.toFixed(2)} ATR)`,
      prematureRisk: false,
      pelajaranAktif: ['FB-T11', 'SG-L1'],
      alasan: [`FB-T11 STEADY-ACCEPT: ${cara} — penerimaan bervolume-STABIL (bukan kering, bukan klimaks) tanpa jejak penolakan & dekat nilai-rata EMA21: pasar sudah menerima sisi baru -> ini breakout sejati, ikuti ${breakArah}, stop ${stop.toFixed(2)}% di balik level`],
    }, 3)
  }

  // ===== FB-L5: PARABOLA-MOMENTUM (pelajaran bedah r41, kasus fbo300
  // #98/#100 momentum-fail): break dgn tren parabola ekstrem (|mom50| >= 15,
  // wilayah momentum-fail 15-22; pengikut sah terbukti hanya 3.4-11.6) yang
  // harga masih jauh di luar level = dorongan terakhir yang bisa V-SNAP
  // melikuidasi pengikut MAUPUN fader dini. Kepahaman matang: JANGAN ikuti
  // (T1 kini ber-cap 14), JANGAN fade tanpa konfirmasi (FB-K2) — WAIT,
  // masuk fade HANYA bila close kembali ke dalam level.
  if (E.closeNowAtr > 0 && Math.abs(mom50v) >= 15) {
    return mk(versi, { aksi: 'WAIT', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      ...basis,
      falseSinyal: [
        `tren parabola ekstrem (mom50 ${fitur.mom50Atr?.toFixed(1) ?? '—'} ATR) + close ${E.closeNowAtr.toFixed(2)} ATR di luar level — dorongan momentum bisa berakhir V-snap kapan pun`,
        `tanpa konfirmasi kegagalan (wick penolakan ${E.wickBeyondAtr.toFixed(2)} ATR, badan rejeksi ${E.rejecBodyAtr.toFixed(2)} ATR) — fade dini dilarang (FB-K2)`,
      ],
      konfirmasi: `WAIT: menunggu close kembali ke dalam level (${trig.toFixed(2)}), maks 8 candle — parabola tidak diikuti dan tidak di-fade tanpa konfirmasi`,
      prematureRisk: true,
      pelajaranAktif: ['FB-L5', 'FB-K2'],
      alasan: [`FB-L5 PARABOLA-MOMENTUM: ${cara} — break parabola dlm tren ekstrem (${Math.abs(mom50v).toFixed(1)} ATR) adalah wilayah momentum-fail: pengikut dilikuidasi V-snap, fader dini dilikuidasi dorongan terakhir -> disiplin WAIT, masuk ${fadeArah} hanya bila close pulang ke ${trig.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-R2m: RETEST-MIKRO-TAHAN (v1.37, pelajaran bedah r43, kasus
  // g-trend-cont GILA fbo2300 #121): episode MIKRO (maxB <= 0.7 — di
  // bawah ambang event-nyata) yang kembali ke dalam pada level-patah,
  // tapi ARAH TETAP KONSISTEN (dir >= 0.5) & tren-makro SEARAH break
  // (momAlign >= 2.5) — uji-ulang mikro yang akan gagal, kelanjutan yang
  // sah: WAIT re-break searah break (bukan fade, bukan SKIP).
  // Pemisah dari poke-gagal FBO (#67): dir 0.25 & momAl -0.4 = arah
  // mati/melawan — tetap ke L8/fade.
  if (
    E.maxBeyondAtr <= 0.7 && E.closeNowAtr <= -0.15 && E.closeNowAtr >= -2.0 &&
    E.closesBeyond <= 3 && E.dirCons >= 0.5 && momAlign >= 2.5 &&
    E.volRatioBreak >= 0.9 && !E.climax
  ) {
    const trigM = E.side === 'ATAS' ? L.level + 0.18 * atr : L.level - 0.18 * atr
    return mk(versi, { aksi: 'WAIT', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigM }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `uji-ulang mikro pada level-patah: penetrasi ${E.maxBeyondAtr.toFixed(2)} ATR (di bawah ambang) kembali ke dalam, tapi arah ${Math.round(E.dirCons * 100)}% konsisten & tren makro ${momAlign.toFixed(1)} ATR searah — menunggu re-break close ke ${trigM.toFixed(2)}`,
      prematureRisk: false,
      pelajaranAktif: ['FB-R2m', 'FB-K2'],
      alasan: [`FB-R2m RETEST-MIKRO-TAHAN: ${cara} — tusukan mikro (${E.maxBeyondAtr.toFixed(2)} ATR) kembali ke dalam TAPI arah tetap konsisten (${Math.round(E.dirCons * 100)}%) & tren makro searah (${momAlign.toFixed(1)} ATR): uji-ulang akan gagal -> WAIT, entry ${breakArah} bila close re-break ke ${trigM.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-L8: POKE-GAGAL-KABUR (pelajaran bedah r41, kasus g-retest-hold
  // BRUTAL #114 fbo400): tusukan SEGAR yang sudah terbukti gagal — break
  // dangkal (<= 6 close di luar, terakhir <= 6 candle lalu), harga SUDAH
  // KABUR jauh ke dalam (>= 1.2 ATR di dalam level), dorongan 7-candle
  // SEARAH fade (>= 1.0 ATR menjauhi level), bukti penolakan ada, volume
  // tidak runtuh. Bukan wilayah PUNISH: harga tidak lagi di luar level
  // (kabur), jadi dorongan-terakhir-penghukum sudah lewat. Disiplin: WAIT
  // re-break searah fade (close menembus balik level), maks 8 candle.
  // v1.37 L8SKIP (pelajaran bedah r43, kasus fbo-equal GILA fbo2200 #67):
  // bila fade MELAWAN tren makro (momAlign < 0) DAN bukti penolakan TIPIS
  // (rej <= 0.7), kabur-ke-dalam tidak dikuasai siapa pun — re-break fade
  // bisa menyala di pantulan-sesaat lalu dilikuidasi kelanjutan break;
  // satu-satunya tindakan bersih = SKIP (bait pengikut melawan tren makro
  // yang melanjut -> rugi/likuidasi = no-trade AMAN).
  if (
    E.closeNowAtr <= -1.2 && E.closesBeyond <= 6 && n - 1 - E.lastPierceIdx <= 6 &&
    -E.push7Atr >= 1.0 && E.volLate >= 0.75 &&
    (E.crossBack || E.rejecBodyAtr >= 0.4 || E.wickBeyondAtr >= 0.5) &&
    momAlign < 0 && E.rejecBodyAtr <= 0.7
  ) {
    return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
      ...basis,
      falseSinyal: [
        `tusukan segar gagal TAPI fade melawan tren makro (${momAlign.toFixed(1)} ATR) dgn penolakan tipis (${E.rejecBodyAtr.toFixed(2)} ATR) — kabur-ke-dalam tidak dikuasai`,
        `re-break fade bisa menyala di pantulan sesaat lalu dilikuidasi kelanjutan; follow juga tanpa dukungan struktur -> tidak main`,
      ],
      konfirmasi: 'SKIP: konflik fade-vs-makro tanpa bukti penolakan kuat — disiplin tidak main (aman-no-trade)',
      prematureRisk: false,
      pelajaranAktif: ['FB-L8s', 'SG-L8'],
      alasan: [`FB-L8s POKE-GAGAL-KONFLIK: ${cara} — tusukan gagal & harga kabur ke dalam, TAPI fade ${fadeArah} MELAWAN tren makro (${momAlign.toFixed(1)} ATR) dan penolakannya tipis (${E.rejecBodyAtr.toFixed(2)} ATR): re-break pantulan berisiko likuidasi -> SKIP, tidak main`],
    }, 1)
  }
  if (
    E.closeNowAtr <= -1.2 && E.closesBeyond <= 6 && n - 1 - E.lastPierceIdx <= 6 &&
    -E.push7Atr >= 1.0 && E.volLate >= 0.75 &&
    (E.crossBack || E.rejecBodyAtr >= 0.4 || E.wickBeyondAtr >= 0.5)
  ) {
    return mk(versi, { aksi: 'WAIT', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      ...basis,
      falseSinyal: [
        `tusukan segar gagal: hanya ${E.closesBeyond} close di luar (terakhir ${n - 1 - E.lastPierceIdx} candle lalu), harga sudah kabur ${Math.abs(E.closeNowAtr).toFixed(2)} ATR ke dalam dgn dorongan fade ${(-E.push7Atr).toFixed(2)} ATR`,
        `bukti penolakan: wick ${E.wickBeyondAtr.toFixed(2)} ATR, badan rejeksi ${E.rejecBodyAtr.toFixed(2)} ATR${E.crossBack ? ', cross-back' : ''} — tusukan tidak diterima pasar`,
      ],
      konfirmasi: `WAIT: menunggu re-break searah ${fadeArah} (close menembus ${trig.toFixed(2)}), maks 8 candle — tusukan gagal tapi entry tetap berkonfirmasi (FB-K2)`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L8', 'FB-K2'],
      alasan: [`FB-L8 POKE-GAGAL-KABUR: ${cara} — tusukan segar (${E.closesBeyond} close di luar) sudah GAGAL & harga kabur ${Math.abs(E.closeNowAtr).toFixed(2)} ATR ke dalam dgn dorongan fade ${(-E.push7Atr).toFixed(2)} ATR; jangan entry buta, WAIT re-break ${fadeArah} di ${trig.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-R2: RETEST-TAHAN-MENGGELINCIR (pelajaran bedah hakim r40,
  // kasus g-retest-hold BRUTAL #114): level pernah ditusuk & diterima di
  // luar (break historis), harga pulang ke dalam MENGUJI level, level
  // MENAHAN (retest ditolak), dan kini harga MENGGELINCIR searah break
  // (p7 searah break >= 0.5 ATR) dari dalam area — kelanjutan resmi;
  // WAIT re-break (close melampaui level searah break) lalu ikuti.
  // PEMISAH dari keluarga FBO (retest-fail/two-candle): gagalan mereka
  // menggelincir MELAWAN arah break (p7 break-dir negatif) — di sini
  // dorongan SEARAH break = level menahan sebagai S/R baru.
  // PENGUASAN r41 (kasus fbo-weak fbo400 #4/#6/#8): break-pulang-diuji
  // wajib SEQUENTIAL & SEGAR — (a) close terakhir di luar (lastOut)
  // <= 14 candle lalu, (b) pulang-ke-dalam PERTAMA kali setelah lastOut
  // <= 5 candle lalu, (c) ekskursi ke dalam sejak pulang <= 1.2 ATR
  // (pullback dangkal dekat level, bukan osilasi purba jauh di dalam).
  // Tanpa ini, break purba 28+ candle yang sudah lama direclaim terbaca
  // sbg "retest ditolak" dan menghukum dgn arah kelanjutan yang SALAH.
  if (true) {
    for (const L2 of levels) {
      if (L2.sentuhan < 2) continue
      for (const side of ['ATAS', 'BAWAH'] as const) {
        const sign = side === 'ATAS' ? 1 : -1
        const dist2 = (c: Candle): number => (sign * (c.c - L2.level)) / atr
        let histC = 0
        let histD = 0
        let lastOut = -1
        let firstIn = -1
        let maxInside = 0
        for (let i = 15; i <= n - 1; i++) {
          const d = dist2(cs[i])
          if (d > 0.3) { histC++; histD = Math.max(histD, d); lastOut = i; firstIn = -1; maxInside = 0 }
          else if (d <= -0.15 && lastOut >= 0) {
            if (firstIn < 0) firstIn = i
            maxInside = Math.max(maxInside, -d)
          }
        }
        if (histC < 3 || histD < 0.5) continue
        if (lastOut < 0 || n - 1 - lastOut > 14) continue // break-episode segar
        if (firstIn < 0 || n - 1 - firstIn > 10) continue // pulang-ke-dalam segar (r41: 5→10 utk g-retest-hold, dgn maxInside dipencet)
        if (maxInside > 1.0) continue // pullback dangkal dekat level — break purba yg osilasi jauh di dalam (fbo400 #4/#6/#8: 1.2-2.2) ter-veto
        const dNow2 = dist2(cs[n - 1])
        if (dNow2 > -0.3) continue // harus DI DALAM (sudah menolak, belum re-break)
        const p7al = ((side === 'ATAS' ? 1 : -1) * (cs[n - 1].c - cs[n - 8].c)) / atr
        if (p7al < 0.5) continue // menggelincir searah break — bukan, kalau melawan
        if (Math.abs(fitur.distEma21Atr) >= 2.4) continue
        const brkArah2: FboArah = side === 'ATAS' ? 'NAIK' : 'TURUN'
        const trig2 = side === 'ATAS' ? L2.level + 0.18 * atr : L2.level - 0.18 * atr
        return mk(versi, { aksi: 'WAIT', arah: brkArah2, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig2 }, {
          level: { jenis: L2.jenis, side, level: L2.level, sentuhan: L2.sentuhan, dariZona: L2.dariZona },
          brk: null,
          falseSinyal: [],
          konfirmasi: `FB-R2 retest-tahan: break historis (${histC} close, kedalaman ${histD.toFixed(2)} ATR) diuji-balik ke dalam lalu DITOLAK — harga kini menggelincir searah break (${p7al.toFixed(2)} ATR); menunggu re-break close ke ${trig2.toFixed(2)}`,
          prematureRisk: false,
          pelajaranAktif: ['FB-R2', 'FB-K2'],
          alasan: [`FB-R2 RETEST-TAHAN-MENGGELINCIR: level ${L2.jenis} (${L2.level.toFixed(2)}) ditusuk & diterima di luar, diuji balik ke dalam, DITOLAK, dan harga menggelincir searah break (${p7al.toFixed(2)} ATR) — retest yang ditolak dgn dorongan searah = kelanjutan; WAIT, entry ${brkArah2} bila close menembus ${trig2.toFixed(2)}`],
          fitur,
        }, 2)
      }
    }
  }

  // ===== FB-R2c: RETEST-OF-BROKEN dgn EPISODE-E STALE (pelajaran bedah
  // r41, kasus g-retest-hold BRUTAL fbo1000 #114): scanRetestOfBroken
  // MENDETEKSI situasi retest-of-broken-level (fbr), tapi cabang FB-R
  // hanya hidup saat tak ada event hidup, dan FB-R2 menuntut harga MASIH
  // DI DALAM level — padahal di sini re-break sudah terjadi (harga baru
  // saja menembus balik ke luar, close di sisi break dlm band 1.2 ATR)
  // sementara episode-E (level lain) sudah stal (lastPierce >= 8).
  // Disiplin tetap FB-K2: WAIT, entry searah break asal SAAT re-break
  // close menembus level fbr (bukan menebak).
  if (
    fbr && n - 1 - E.lastPierceIdx >= 8 &&
    Math.abs(entry - fbr.lvl.level) <= 1.2 * atr
  ) {
    const trigR2c = fbr.brkArah === 'NAIK' ? fbr.lvl.level + 0.18 * atr : fbr.lvl.level - 0.18 * atr
    return mk(versi, { aksi: 'WAIT', arah: fbr.brkArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigR2c }, {
      level: { jenis: fbr.lvl.jenis, side: fbr.side, level: fbr.lvl.level, sentuhan: fbr.lvl.sentuhan, dariZona: fbr.lvl.dariZona },
      brk: null,
      falseSinyal: [],
      konfirmasi: `retest-of-broken-level (${fbr.lvl.jenis} ${fbr.lvl.level.toFixed(2)}, mendekat ${fbr.approachAtr.toFixed(2)} ATR) dgn episode utama sudah stal — menunggu re-break ${fbr.brkArah} close ke ${trigR2c.toFixed(2)}`,
      prematureRisk: false,
      pelajaranAktif: ['FB-R2c', 'FB-K2'],
      alasan: [`FB-R2c RETEST-BROKEN-STALE: level ${fbr.lvl.jenis} (${fbr.lvl.level.toFixed(2)}) pernah ditusuk & diterima, harga pulang menguji lalu re-break ${fbr.brkArah} sedang berlangsung; episode utama (${(n - 1 - E.lastPierceIdx)} candle lalu) sudah stal -> WAIT, entry ${fbr.brkArah} bila close menembus ${trigR2c.toFixed(2)}`],
      fitur,
    }, 2)
  }

  // ===== FB-R2m2: KERING-PULANG-DANGKAL (v1.37b, pelajaran bedah hakim
  // r44, kasus g-trend-cont fbo2900 #119/#121/#123): episode yang volume-nya
  // KERING (vF <= 0.9) tapi harga hanya pulang DANGKAL (cN 0.2-1.2 ATR,
  // masih DI LUAR level) dalam tren makro searah break (momAlign >= 1.5) —
  // fase istirahat tanpa pengikut: fade tanpa pengikut juga tak berbahaya,
  // kelanjutan makro menang -> WAIT re-break searah break (konfirmasi),
  // bukan fade tanpa daya (FB-K2). Untuk FBO palsu: re-break tak menyala
  // (harga lanjut pulang) -> no-trade aman; bait ikut-break rugi.
  if (
    E.closeNowAtr >= 0.2 && E.closeNowAtr <= 1.2 &&
    E.volFollow <= 0.9 && E.volLate >= 0.5 && E.volLate <= 0.75 &&
    Math.abs(fitur.distEma21Atr) <= 1.2 &&
    momAlign >= 1.5 && E.dirCons >= 0.3 &&
    E.volRatioBreak <= 1.6 && !E.climax
  ) {
    const trigK = E.side === 'ATAS' ? L.level + 0.18 * atr : L.level - 0.18 * atr
    return mk(versi, { aksi: 'WAIT', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigK }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `istirahat-kering: volume pengikut kering (${E.volFollow.toFixed(2)}x, akhir ${E.volLate.toFixed(2)}x) tapi harga hanya pulang dangkal (${E.closeNowAtr.toFixed(2)} ATR dari level) dalam tren makro searah (${momAlign.toFixed(1)} ATR) — menunggu re-break close ke ${trigK.toFixed(2)}`,
      prematureRisk: false,
      pelajaranAktif: ['FB-R2m2', 'FB-K2'],
      alasan: [`FB-R2m2 KERING-PULANG-DANGKAL: ${cara} — episode kering (${E.volFollow.toFixed(2)}x) yang pulang dangkal (${E.closeNowAtr.toFixed(2)} ATR) di atas/di bawah level dalam tren makro searah (${momAlign.toFixed(1)} ATR): fade tanpa pengikut, kelanjutan makro menang -> WAIT, entry ${breakArah} bila close re-break ke ${trigK.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-L3: KLIMAKS-KELELAHAN (close di luar + klimaks/overextension) =====
  if (E.closeNowAtr > 0 && (E.climax || overExt) && fitur.distEma21Atr >= 1.6) {
    return mk(versi, { aksi: 'WAIT', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      ...basis,
      falseSinyal: [
        E.climax ? `vol break KLIMAKS ${E.volRatioBreak.toFixed(1)}x rata di ujung pergerakan = pembeli terakhir` : `overextension: jarak EMA ${fitur.distEma21Atr.toFixed(1)} ATR + momentum ${fitur.mom12Atr.toFixed(1)} ATR`,
        `close MASIH di luar level (${E.closeNowAtr.toFixed(2)} ATR) — konfirmasi kegagalan belum ada`,
      ],
      konfirmasi: `WAIT: menunggu close kembali ke dalam level (< ${trig.toFixed(2)}), maks 8 candle — fade dini = risiko likuidasi dorongan terakhir (FB-K2)`,
      prematureRisk: true,
      pelajaranAktif: ['FB-L3', 'FB-K2'],
      alasan: [`FB-L3 KLIMAKS-KELELAHAN: ${cara} — breakout di ujung kelelahan; jangan fade dini (blow-off terakhir bisa melikuidasi), tunggu konfirmasi close-back di ${trig.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-L6: DRIFT TANPA ENERGI (close di luar + vol kering) =====
  if (E.closeNowAtr > 0 && E.volLate <= 0.7 && E.volFollow <= 0.8) {
    return mk(versi, { aksi: 'WAIT', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      ...basis,
      falseSinyal: [
        `tembusan tanpa energi: volume akhir ${E.volLate.toFixed(2)}x, lanjut ${E.volFollow.toFixed(2)}x rata — jalan-lambat, bukan serangan`,
        `close MASIH di luar level (${E.closeNowAtr.toFixed(2)} ATR)`,
      ],
      konfirmasi: `WAIT: menunggu close-back ke dalam level (${trig.toFixed(2)}), maks 8 candle; flush capitulation dulu mungkin terjadi`,
      prematureRisk: true,
      pelajaranAktif: ['FB-L6', 'FB-K2'],
      alasan: [`FB-L6 DRIFT-TANPA-ENERGI: ${cara} — tembusan sunyi biasanya diakhiri flush terakhir sebelum snap-back; tunggu konfirmasi close-back di ${trig.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-L9b: WAIT-REBREAK-SEARAH (pelajaran bedah r41, kasus
  // g-retest-hold BRUTAL fbo1200 #114): break segar (<= 8 candle) dgn close
  // masih sedikit di luar (0.1-1.5 ATR) dan dorongan kuat searah break
  // (p7 >= 1.0, vF >= 1.05) TAPI arah/chop TIDAK cukup bersih utk T6
  // (dir < 0.78, eff < 0.85) — bukti belum menentukan fade maupun entry
  // langsung. Disiplin: WAIT re-break SEARAH break (bukan fade!), entry
  // hanya bila dorongan berlanjut menembus level + margin.
  const momAlignL9b = E.side === 'ATAS' ? fitur.mom50Atr ?? 0 : -(fitur.mom50Atr ?? 0)
  if (
    n - 1 - E.firstPierceIdx <= 8 && E.closeNowAtr >= 0.1 && E.closeNowAtr <= 1.5 &&
    E.push7Atr >= 1.0 && E.volFollow >= 1.05 &&
    E.dirCons < 0.78 && E.effAtr < 0.85 && E.preTouches >= 2 &&
    E.volRatioBreak <= 2.0 && E.wickBeyondAtr <= 0.5 && E.volLate >= 1.0 &&
    Math.abs(momAlignL9b) < 14
  ) {
    const trigSearah = E.side === 'ATAS' ? L.level + 0.12 * atr : L.level - 0.12 * atr
    return mk(versi, { aksi: 'WAIT', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigSearah }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `break segar berdorongan kuat (p7 ${E.push7Atr.toFixed(2)} ATR, vol ${E.volFollow.toFixed(2)}x) tapi arah/chop belum bersih (dir ${Math.round(E.dirCons * 100)}%, eff ${E.effAtr.toFixed(2)}) — menunggu re-break searah, bukan fade (FB-K2)`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L9b', 'FB-K2'],
      alasan: [`FB-L9b WAIT-REBREAK-SEARAH: ${cara} — dorongan searah break kuat tapi struktur belum bersih utk entry langsung; dilarang fade (FB-K2), WAIT, masuk ${breakArah} bila dorongan berlanjut menembus ${trigSearah.toFixed(2)}`],
    }, 2)
  }

  // ===== FB-L7: BREAK SEGAR TAK TERKONFIRMASI (sabar menunggu) =====
  // v1.37 L7DUAL (pelajaran bedah r43, kasus g-accept GILA fbo2400
  // #103/#107): episode PANJANG (20+ close) dgn dir RENDAH (<= 0.45),
  // break TENANG (vBrk <= 1.6), volume pengikut hidup (vF >= 0.95) dan
  // harga DEKAT level (cN <= 1.5) — fase pause-dalam-acceptance, bukan
  // kegagalan: fade akan dilikuidasi kelanjutan; WAIT DUA-ARAH-sadar:
  // trigger RE-BREAK searah break (close menembus level + margin) —
  // kelanjutan yang dikonfirmasi, bukan fade dini (FB-K2).
  if (
    E.closeNowAtr > 0 &&
    E.dirCons <= 0.45 && E.closesBeyond >= 20 &&
    E.volRatioBreak <= 1.6 && E.closeNowAtr <= 1.5 &&
    E.volFollow >= 0.95 && E.volFollowPre >= 0.85 && !E.climax
  ) {
    const trigS = E.side === 'ATAS' ? L.level + 0.12 * atr : L.level - 0.12 * atr
    return mk(versi, { aksi: 'WAIT', arah: breakArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trigS }, {
      ...basis,
      falseSinyal: [],
      konfirmasi: `pause-dalam-acceptance: ${E.closesBeyond} close di luar, dir rendah (${Math.round(E.dirCons * 100)}%), break tenang (${E.volRatioBreak.toFixed(1)}x), harga dekat level (${E.closeNowAtr.toFixed(2)} ATR) — menunggu re-break searah break di ${trigS.toFixed(2)}, bukan fade tanpa konfirmasi (FB-K2)`,
      prematureRisk: false,
      pelajaranAktif: ['FB-L7d', 'FB-K2'],
      alasan: [`FB-L7d PAUSE-ACCEPTANCE: ${cara} — episode panjang (${E.closesBeyond} close) dgn arah rendah (${Math.round(E.dirCons * 100)}%) & break tenang (${E.volRatioBreak.toFixed(1)}x): fase jeda dalam acceptance, bukan kegagalan; dilarang fade dini -> WAIT, masuk ${breakArah} bila close re-break ke ${trigS.toFixed(2)}`],
    }, 2)
  }
  if (E.closeNowAtr > 0) {
    const g1 = g1Keputusan(E, fitur, n, versi, basis, breakArah)
    if (g1) return g1
    return mk(versi, { aksi: 'WAIT', arah: fadeArah, targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT, triggerLevel: trig }, {
      ...basis,
      falseSinyal: [
        `volume tindak-lanjut memudar (akhir ${E.volLate.toFixed(2)}x vs sejak-sapu ${E.volFollow.toFixed(2)}x) — tembusan kehabisan bahan bakar`,
        `close MASIH di luar level (${E.closeNowAtr.toFixed(2)} ATR) — belum ada konfirmasi kegagalan`,
      ],
      konfirmasi: `WAIT: menunggu close kembali ke dalam level (${trig.toFixed(2)}), maks 8 candle — dilarang fade sebelum konfirmasi (FB-K2 anti-entry-dini)`,
      prematureRisk: true,
      pelajaranAktif: ['FB-L7', 'FB-K2', 'SG-L7'],
      alasan: [`FB-L7 SABAR-MENUNGGU: ${cara} — anatomi belum menentukan; dilarang fade saat close masih di luar (FB-K2) -> WAIT, masuk ${fadeArah} hanya bila close kembali ke ${trig.toFixed(2)}`],
    }, 2)
  }

  // ===== fallback: kejadian terlalu tua / ambigu =====
  return mk(versi, { aksi: 'SKIP', arah: 'NAIK', targetPct: TARGET_DISIPLIN, stopPct: STOP_WAIT }, {
    ...basis,
    falseSinyal: [],
    konfirmasi: 'tidak entry',
    prematureRisk: false,
    pelajaranAktif: ['FB-L9'],
    alasan: [`FB-L9 SKIP-DISIPLIN: ${cara} — event breakout sudah tua/ambigu (tanpa konfirmasi kegagalan yang layak) -> tidak main`],
  }, 1)
}
