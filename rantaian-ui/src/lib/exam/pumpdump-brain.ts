// ============================================================
// MICAPROFITA SAKTI-PD — otak pemahaman PUMP & DUMP.
//
// Menerima HANYA candle yang boleh dilihat (point-in-time,
// 60 candle), MEMBACA SIKLUS P&D (akumulasi -> pump -> puncak
// -> dump), lalu memilih SATU dari TIGA keputusan:
//   ENTRY  — masuk sekarang (arah + target disiplin)
//   WAIT   — menunggu konfirmasi miliknya sendiri
//   SKIP   — tidak mengambil posisi
//
// ARSITEKTUR BERLAPIS (setiap layer = pelajaran dari bedah):
//  - PD-L01 Flick-Reclaim LONG  : dump palsu direbut balik
//  - PD-L05 Klimaks SHORT       : blow-off di puncak jendela
//  - PD-L02 Breakout LONG       : markup asli dari basis panjang
//  - PD-L06 Exhaust SHORT       : vertikal tanpa napas TANPA
//                                 pullback (pelajaran r1: W2 sehat
//                                 punya pullback — jangan di-short)
//  - PD-L07 Absorpsi SHORT      : stall bervolume di puncak
//  - PD-L08 Wick-Reject SHORT   : klaster penolakan atap
//  - PD-L14 Break-Support SHORT : lantai distribusi patah (fase
//                                 DUMP — pelajaran r1: jangan
//                                 tertukar LH PUNCAK)
//  - PD-L03 Retest LONG         : pullback kering menahan level
//                                 (pelajaran r1: wajib fall >= 1 ATR
//                                 — divergensi di puncak bukan retest)
//  - PD-L04 Second-Wave LONG    : HL + volume menaik
//  - PD-L09 Divergensi/LH SHORT : HH/LH dengan volume & badan
//                                 menyusut di atap jendela
//  - PD-L11 Deadcat SHORT       : rebound kering pasca-dump
//  - PD-L12 Flush SHORT         : flush pertama dari puncak
//  - PD-L13 Kaskade SHORT       : dump berjalan belum selesai
//  - PD-L15 WAIT ekstensi       : ekstrem tanpa trigger
//  - PD-L16 SKIP                : ambigu — duit tinggal di meja
//
// v1.1 (bedah r1, 87/100):
//  (1) Klimaks tak lagi bergantung flag volClimax (volMean pump
//      menenggelamkan z-score) — cukup volM8x >= 1.4 + kelelahan.
//  (2) Retest wajib fall >= 1 ATR (menyembuhkan 3 salah-Naik).
//  (3) Exhaust wajib TANPA pullback 25 candle (menyembuhkan 6 rugi
//      second-wave).
//  (4) Flick: jendela wasBelow diperluas 6 candle (menyembuhkan
//      5 noTrade).
//  (5) Break-support dinaikkan urutannya + fase DUMP (menyembuhkan
//      salah fase massal).
//  (6) Divergensi & LH dipersatukan di atap jendela.
//  (7) WAIT kini membawa pelajaranAktif (bug r1: field hilang).
// ============================================================

import type { Candle } from './generator'
import * as I from './indicators'
import { buildCandleVision, type CandleVision } from './sakti-candle'
import type { PdPlan } from './pumpdump-forge'
import type { PdFase } from './pumpdump-forge'

export const PD_BRAIN_VERSI = '1.7'

/** fitur khusus P&D di atas CandleVision */
export interface PdFitur extends CandleVision {
  volMean8Ratio: number // volMean 8 terakhir / volMean penuh
  volMean6Ratio: number
  net8Atr: number // netto 8 close terakhir (ATR)
  wickTop8: number // jumlah wick-atas panjang 8 lilin terakhir
  consecDownBig: number // merah besar (badan <= -0.5 ATR) berturut
  consecUpBig: number
  puncakJendela: number // high maksimum 60 candle
  dasarJendela: number // low minimum 60 candle
  fallPuncakAtr: number // (puncak - close terakhir) / ATR
  microSupport: number // low minimum candle 30..50 (lantai struktur)
  microBreakDn: boolean // close 2 terakhir < microSupport
  microReclaim: boolean // baru di bawah lantai, kembali >= lantai
  volTrendUp3: boolean // volume 3 terakhir menaik vs 10 sebelumnya
  bounceDry6: boolean // 6 terakhir: volume kering + badan kecil
  bodyTrendDown: boolean // badan lilin naik makin menyusut (2 paruh)
  hadPullback20: boolean // ada koreksi >= 1.5 ATR (2+ merah) dalam 25 terakhir lalu pulih
  bigRed6: boolean // ada lilin merah badan <= -1.2 ATR dalam 6 terakhir (flush besar)
}

export interface PdKeputusan extends PdPlan {
  versi: string
  fase: PdFase // dugaan fase siklus
  puncakEst: number // estimasi puncak pump
  dasarEst: number // estimasi dasar akumulasi
  konfirmasi: { ada: boolean; label: string } // konfirmasi pra-entry
  alasan: string[]
  pelajaranAktif: string[]
  fitur: PdFitur
}

function buildPdFitur(cs: Candle[]): PdFitur {
  const v = buildCandleVision(cs)
  const atr = Math.max(v.atr, 1e-9)
  const n = cs.length
  const vols = cs.map((c) => c.v)
  const volMean = Math.max(I.mean(vols), 1e-9)

  const volMean8 = Math.max(I.mean(vols.slice(n - 8)), 1e-9)
  const volMean6 = Math.max(I.mean(vols.slice(n - 6)), 1e-9)
  const net8Atr = (cs[n - 1].c - cs[n - 9].c) / atr

  let wickTop8 = 0
  for (let i = Math.max(0, n - 8); i < n; i++) {
    const c = cs[i]
    const range = Math.max(c.h - c.l, 1e-9)
    const wu = (c.h - Math.max(c.o, c.c)) / atr
    if (wu >= 0.35 && wu / range >= 0.4) wickTop8++
  }

  let cd = 0, cu = 0
  for (let i = n - 1; i >= 0; i--) {
    const body = (cs[i].c - cs[i].o) / atr
    if (body <= -0.5) { cd++; cu = 0 } else if (body >= 0.5) { cu++; cd = 0 } else break
  }

  const puncakJendela = Math.max(...cs.map((c) => c.h))
  const dasarJendela = Math.min(...cs.map((c) => c.l))
  const fallPuncakAtr = (puncakJendela - cs[n - 1].c) / atr

  // pelajaran r2: lantai struktur = low minimum 16 candle yang berakhir
  // 4 candle sebelum keputusan (jendela LOKAL) — bukan min global 30..50
  // yang bisa di bawah harga sekarang sehingga breakdown tak terlihat.
  const microSupport = Math.min(...cs.slice(Math.max(0, n - 16), Math.max(1, n - 4)).map((c) => c.l))
  const prevClose = cs[n - 2]?.c ?? cs[n - 1].c
  const microBreakDn = cs[n - 1].c < microSupport && prevClose < microSupport
  const wasBelow = cs.slice(Math.max(0, n - 6), n - 1).some((c) => c.l <= microSupport + 1e-9)
  const microReclaim = wasBelow && cs[n - 1].c >= microSupport

  const volTrendUp3 = I.mean(vols.slice(n - 3)) > I.mean(vols.slice(Math.max(0, n - 13), n - 3)) * 1.15

  const last6 = cs.slice(n - 6)
  const bounceDry6 =
    I.mean(last6.map((c) => c.v)) < volMean * 0.75 &&
    last6.every((c) => Math.abs(c.c - c.o) < 0.55 * atr)

  const firstHalf = cs.slice(Math.max(0, n - 10), n - 5)
  const secondHalf = cs.slice(n - 5)
  const avgUpBody = (arr: Candle[]) => {
    const ups = arr.filter((c) => c.c > c.o).map((c) => (c.c - c.o) / atr)
    return ups.length ? I.mean(ups) : 0
  }
  const bodyTrendDown = avgUpBody(secondHalf) > 0 && avgUpBody(firstHalf) > avgUpBody(secondHalf) * 1.25

  let hadPullback20 = false
  {
    const win = cs.slice(Math.max(0, n - 25))
    let twoRed = false
    for (let i = 1; i < win.length; i++) {
      if (win[i].c < win[i].o && win[i - 1].c < win[i - 1].o) { twoRed = true; break }
    }
    const minLow25 = Math.min(...win.map((c) => c.l))
    hadPullback20 = twoRed && (cs[n - 1].c - minLow25) / atr >= 1.2
  }

  let bigRed6 = false
  for (const c of cs.slice(n - 6)) {
    if (c.c < c.o && (c.o - c.c) / atr >= 1.2) { bigRed6 = true; break }
  }

  return {
    ...v,
    volMean8Ratio: volMean8 / volMean,
    volMean6Ratio: volMean6 / volMean,
    net8Atr,
    wickTop8,
    consecDownBig: cd,
    consecUpBig: cu,
    puncakJendela,
    dasarJendela,
    fallPuncakAtr,
    microSupport,
    microBreakDn,
    microReclaim,
    volTrendUp3,
    bounceDry6,
    bodyTrendDown,
    hadPullback20,
    bigRed6,
  }
}

// ------------------------------------------------------------

interface Rule {
  id: string
  plan: PdPlan
  fase: PdFase
  alasan: string[]
}

function microSupportDepthAtr(f: PdFitur): number {
  return (f.microSupport - f.last.c) / Math.max(f.atr, 1e-9)
}

function vonisInti(f: PdFitur): Rule | null {
  const dist = f.distEma21Atr
  const pos = f.posInWindow60
  const mom50 = f.mom50Atr
  const rsi = f.rsi

  // ---------- PD-L01 Flick-Reclaim LONG ----------
  const flickOk =
    f.last.c > f.last.o &&
    (f.volZ >= 0.5 || f.volMean8Ratio >= 1.1) &&
    dist >= 0.3 &&
    mom50 >= 0.8 &&
    (f.microReclaim || (f.bullEngulf && f.fallPuncakAtr >= 1.5 && !f.microBreakDn))
  if (flickOk) {
    return {
      id: 'PD-L01-reclaim',
      plan: { aksi: 'ENTRY', arah: 'NAIK', targetPct: 2.2 },
      fase: 'PUMP',
      alasan: [
        `Flick dump direbut balik: microReclaim=${f.microReclaim} bullEngulf=${f.bullEngulf} volZ=${f.volZ.toFixed(1)}`,
        `Konteks pompa masih hidup (mom50=${mom50.toFixed(1)} ATR, fall=${f.fallPuncakAtr.toFixed(1)} ATR) — panik yang dijual dibeli besar`,
      ],
    }
  }

  // ---------- PD-L05 Klimaks SHORT ----------
  if (
    (f.volClimax || f.volMean8Ratio >= 1.4) &&
    dist >= 2.8 &&
    pos >= 0.8 &&
    f.fallPuncakAtr >= 0.9 &&
    (f.upperWickPct >= 0.26 || f.doji || f.bearEngulf || f.bodyPct <= 0.28) &&
    !(f.last.c > f.last.o && f.bodyPct >= 0.5)
  ) {
    return {
      id: 'PD-L05-climax',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.2 },
      fase: 'PUNCAK',
      alasan: [
        `Klimaks blow-off: volMean8 x${f.volMean8Ratio.toFixed(2)} + dist EMA21 ${dist.toFixed(1)} ATR + pos jendela ${pos.toFixed(2)}`,
        `Kelelahan terbaca: wickAtas=${f.upperWickPct.toFixed(2)} doji=${f.doji} bearEngulf=${f.bearEngulf} body=${f.bodyPct.toFixed(2)}`,
      ],
    }
  }

  // ---------- PD-L02 Breakout LONG (markup asli) ----------
  if (
    f.recentBreakUp &&
    f.volZ >= 0.9 &&
    f.volMean8Ratio >= 1.2 &&
    dist >= 0 &&
    pos <= 0.99 &&
    dist <= 4.2 &&
    !(f.volClimax && f.fallPuncakAtr >= 0.5) &&
    f.consecUpBig <= 8 &&
    f.last.c > f.last.o
  ) {
    return {
      id: 'PD-L02-breakout',
      plan: { aksi: 'ENTRY', arah: 'NAIK', targetPct: 2.2 },
      fase: 'PUMP',
      alasan: [
        `Breakout bervolume dari basis: recentBreakUp + volZ ${f.volZ.toFixed(1)} + dist ${dist.toFixed(1)} ATR`,
        'Markup fase awal — bukan pump&dump: volume nyata + tanpa klimaks + tanpa kelelahan wick',
      ],
    }
  }

  // ---------- PD-L06 Exhaust SHORT (wajib TANPA pullback — pelajaran r1) ----------
  if (!f.hadPullback20 && f.wickTop8 <= 4 && dist >= 2.8 && rsi >= 76 && f.consecutiveUp >= 4 && f.mom3Atr >= 0.25) {
    return {
      id: 'PD-L06-exhaust',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.4 },
      fase: 'PUMP',
      alasan: [
        `Vertikal kelelahan: dist ${dist.toFixed(1)} ATR + RSI ${rsi.toFixed(0)} + naik ${f.consecutiveUp} berturut TANPA pullback 25 candle`,
        'Mean reversion tak tertahankan — dorongan monoton tanpa koreksi berarti',
      ],
    }
  }

  // ---------- PD-L07 Absorpsi SHORT ----------
  if (pos >= 0.74 && f.volMean8Ratio >= 1.25 && Math.abs(f.net8Atr) <= 0.95 && dist >= 1.2) {
    return {
      id: 'PD-L07-absorb',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.0 },
      fase: 'PUNCAK',
      alasan: [
        `Absorpsi di puncak: volMean8 x${f.volMean8Ratio.toFixed(2)} tapi progres 8 lilin ${f.net8Atr.toFixed(2)} ATR`,
        'Volume besar tanpa kemajuan = serahan diam-diam ke pengejar',
      ],
    }
  }

  // ---------- PD-L08 Wick-Reject SHORT ----------
  if (f.wickTop8 >= 6 && pos >= 0.72 && dist >= 0.8 && Math.abs(f.net8Atr) <= 2.5) {
    return {
      id: 'PD-L08-wick-reject',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.0 },
      fase: 'PUNCAK',
      alasan: [
        `Klaster penolakan: ${f.wickTop8} wick-atas panjang dalam 8 lilin di pos jendela ${pos.toFixed(2)}`,
        'Dinding supply di atap yang sama — pembeli habis',
      ],
    }
  }

  // ---------- PD-L14 Break-Support SHORT (fase DUMP — dinaikkan urutan, pelajaran r1) ----------
  if (f.microBreakDn && microSupportDepthAtr(f) >= 0.5 && f.fallPuncakAtr <= 5.5 && (f.volZ >= 0.4 || f.consecDownBig >= 2)) {
    return {
      id: 'PD-L14-break-support',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.2 },
      fase: 'DUMP',
      alasan: [
        `Lantai distribusi patah: close ${f.last.c.toFixed(2)} < microSupport ${f.microSupport.toFixed(2)} + volZ ${f.volZ.toFixed(1)}`,
        'Range puncak kehilangan lantai — markdown dimulai (bukan sekadar LH)',
      ],
    }
  }

  // ---------- PD-L12 Flush SHORT (pelajaran r3: flush candle besar butuh
  // detektor bigRed6 — consecDownBig saja gagal krn bounce kering memutus run) ----------
  if (
    (f.bigRed6 || f.consecDownBig >= 2) &&
    f.last.c < f.last.o &&
    f.fallPuncakAtr >= 1.8 &&
    mom50 >= 1.5 &&
    !f.microReclaim &&
    !f.bounceDry6
  ) {
    return {
      id: 'PD-L12-flush',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.4 },
      fase: 'DUMP',
      alasan: [
        `Flush pertama dari puncak: fall ${f.fallPuncakAtr.toFixed(1)} ATR + bigRed6=${f.bigRed6} + konteks pump (mom50 ${mom50.toFixed(1)} ATR)`,
        'Lepas-panen pasca-pump vertikal — tanpa reclaim, dump resmi',
      ],
    }
  }

  // ---------- PD-L03 Retest LONG (logika sendiri — pelajaran r2: flag
  // retestHold vision tak andal; wajib harga TIDAK di bawah EMA & lantai utuh) ----------
  const puncakTuaKering = f.fallPuncakAtr <= 1.2 || (f.fallPuncakAtr <= 1.9 && f.volMean6Ratio <= 0.78)
  if (
    !puncakTuaKering &&
    f.fallPuncakAtr >= 1.0 &&
    f.fallPuncakAtr <= 6 &&
    mom50 >= 1.0 &&
    f.last.c > f.last.o &&
    f.volAsym5 >= -0.5 &&
    dist >= 0.8 &&
    dist <= 2.6 &&
    !f.microBreakDn &&
    !f.microReclaim
  ) {
    return {
      id: 'PD-L03-retest',
      plan: { aksi: 'ENTRY', arah: 'NAIK', targetPct: 2.0 },
      fase: 'PUMP',
      alasan: [
        `Retest tahan: level breakout bertahan setelah fall ${f.fallPuncakAtr.toFixed(1)} ATR, mom50=${mom50.toFixed(1)} ATR, pullback kering`,
        'Napas markup, bukan dump — struktur HL utuh',
      ],
    }
  }

  // ---------- PD-L04 Second-Wave LONG ----------
  if (f.hl && f.volTrendUp3 && f.volMean6Ratio >= 1.15 && mom50 >= 1.8 && f.last.c > f.last.o && dist >= 0 && dist <= 4.2) {
    return {
      id: 'PD-L04-second-wave',
      plan: { aksi: 'ENTRY', arah: 'NAIK', targetPct: 2.0 },
      fase: 'PUMP',
      alasan: [
        `Gelombang kedua: HL + volume menaik (volTrendUp3) + mom50 ${mom50.toFixed(1)} ATR`,
        'Koreksi terkendali = pengisian bahan bakar W2',
      ],
    }
  }

  // ---------- PD-L09a Divergensi/LH di Atap SHORT (lilin terakhir merah) ----------
  if (
    (f.hh || f.lh) &&
    pos >= 0.78 &&
    f.fallPuncakAtr <= 1.2 &&
    f.volMean6Ratio <= 0.92 &&
    (f.bodyTrendDown || f.volMean8Ratio <= 0.9) &&
    dist >= 0 &&
    f.last.c < f.last.o &&
    !f.microBreakDn &&
    !f.microReclaim
  ) {
    return {
      id: 'PD-L09-divergence',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.0 },
      fase: 'PUNCAK',
      alasan: [
        `Divergensi di atap: ${f.hh ? 'HH' : 'LH'} + volMean6 x${f.volMean6Ratio.toFixed(2)} + pos ${pos.toFixed(2)} + badan/volume menyusut`,
        'Pompa kehabisan udara — dorongan akhir tanpa bahan bakar',
      ],
    }
  }

  // ---------- PD-L09b Divergensi di Atap, lilin terakhir hijau ----------
  // (pelajaran r2: stall divergensi bisa berakhhir hijau kecil; pembeda dari
  // retest = fall <= 0.8 ATR (masih menempel puncak) & volume kering ketat)
  if (
    (f.hh || f.lh) &&
    pos >= 0.9 &&
    f.volMean6Ratio <= 0.85 &&
    f.volMean8Ratio <= 0.95 &&
    f.bodyTrendDown &&
    dist >= 1.2 &&
    f.fallPuncakAtr <= 0.8 &&
    f.last.c > f.last.o
  ) {
    return {
      id: 'PD-L09b-divergence-top',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.0 },
      fase: 'PUNCAK',
      alasan: [
        `Divergensi menempel puncak: HH/LH + volMean6 x${f.volMean6Ratio.toFixed(2)} + fall ${f.fallPuncakAtr.toFixed(1)} ATR`,
        'Dorongan terakhir tanpa volume di atap jendela — markdown menanti',
      ],
    }
  }

  // ---------- PD-L11 Deadcat SHORT ----------
  if (mom50 <= -1.8 && f.mom30Atr <= -1.2 && f.bounceDry6 && dist <= 0) {
    return {
      id: 'PD-L11-deadcat',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.2 },
      fase: 'DUMP',
      alasan: [
        `Dead cat bounce: mom50 ${mom50.toFixed(1)} ATR + bounce kering (volMean6 x${f.volMean6Ratio.toFixed(2)})`,
        'Rebound tanpa volume di bawah EMA jatuh = napas mayat, bukan reversal',
      ],
    }
  }

  // ---------- PD-L13 Kaskade SHORT ----------
  if (f.consecDownBig >= 3 && f.fallPuncakAtr >= 2.2 && !f.bullEngulf && f.last.c < f.last.o) {
    return {
      id: 'PD-L13-cascade',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.4 },
      fase: 'DUMP',
      alasan: [
        `Kaskade berjalan: ${f.consecDownBig} merah besar berturut + fall ${f.fallPuncakAtr.toFixed(1)} ATR`,
        'Tanpa engulf/reclaim — kaskade likuidasi belum menemukan lantai',
      ],
    }
  }

  // ---------- PD-L10 Lower-High fallback (di bawah, penolong kasus tepi) ----------
  if (f.lh && pos >= 0.5 && f.fallPuncakAtr <= 3.0 && dist >= 0.5 && mom50 >= 0.8 && !f.microBreakDn && !f.recentBreakDown && !f.volTrendUp3 && f.volMean6Ratio <= 0.95) {
    return {
      id: 'PD-L10-lh',
      plan: { aksi: 'ENTRY', arah: 'TURUN', targetPct: 2.0 },
      fase: 'PUNCAK',
      alasan: [
        `Lower-high distribusi: LH di pos ${pos.toFixed(2)} + fall dari puncak ${f.fallPuncakAtr.toFixed(1)} ATR`,
        'Rally kedua menyusut = pelepasan sisa posisi pemegang besar',
      ],
    }
  }

  return null
}

/** vonis lengkap: rule -> ENTRY; fallback WAIT/SKIP berdisiplin */
export function pdVonis(cs: Candle[], versi = PD_BRAIN_VERSI): PdKeputusan {
  const f = buildPdFitur(cs)
  const alasan: string[] = []
  const pelajaranAktif: string[] = []

  const rule = vonisInti(f)
  if (rule) {
    pelajaranAktif.push(rule.id)
    return {
      versi, ...rule.plan, fase: rule.fase,
      puncakEst: f.puncakJendela, dasarEst: f.dasarJendela,
      konfirmasi: { ada: true, label: rule.id },
      alasan: rule.alasan, pelajaranAktif, fitur: f,
    }
  }

  const lows3 = Math.min(...cs.slice(-3).map((c) => c.l))
  const highs3 = Math.max(...cs.slice(-3).map((c) => c.h))
  const dist = f.distEma21Atr

  // ---------- PD-L15 WAIT ekstensi tanpa trigger ----------
  if (dist >= 2.6 && f.rsi >= 72 && f.consecutiveUp >= 3 && !f.hadPullback20) {
    pelajaranAktif.push('PD-L15-wait-ekstensi')
    return {
      versi, aksi: 'WAIT', arah: 'TURUN', targetPct: 2.2, triggerLevel: lows3,
      fase: 'PUMP', puncakEst: f.puncakJendela, dasarEst: f.dasarJendela,
      konfirmasi: { ada: false, label: 'menunggu lilin merah menembus low 3 terakhir' },
      alasan: [
        `Ekstensi tinggi (dist ${dist.toFixed(1)} ATR, RSI ${f.rsi.toFixed(0)}) tapi belum ada trigger kelelahan`,
        `Menunggu konfirmasi: tutup di bawah ${lows3.toFixed(2)} baru masuk SHORT`,
      ],
      pelajaranAktif, fitur: f,
    }
  }
  if (f.mom50Atr >= 1.6 && f.last.c < f.last.o && dist <= 2.2 && dist >= -2.0 && f.consecDownBig <= 2) {
    pelajaranAktif.push('PD-L15-wait-pullback')
    return {
      versi, aksi: 'WAIT', arah: 'NAIK', targetPct: 2.0, triggerLevel: highs3,
      fase: 'PUMP', puncakEst: f.puncakJendela, dasarEst: f.dasarJendela,
      konfirmasi: { ada: false, label: 'menunggu reclaim high 3 terakhir' },
      alasan: [
        `Konteks pump hidup (mom50 ${f.mom50Atr.toFixed(1)} ATR) dengan koreksi pertama`,
        `Menunggu konfirmasi: tutup di atas ${highs3.toFixed(2)} baru masuk LONG`,
      ],
      pelajaranAktif, fitur: f,
    }
  }

  // ---------- PD-L16 SKIP (dengan dugaan fase dari struktur) ----------
  pelajaranAktif.push('PD-L16-skip')
  const faseDuga: PdFase =
    f.microBreakDn || f.mom50Atr <= -1.5 ? 'DUMP'
    : (f.recentBreakUp && f.volMean8Ratio >= 1.3) || (f.hadPullback20 && f.mom50Atr >= 1.2) ? 'PUMP'
    : f.posInWindow60 >= 0.85 && dist >= 1.8 ? 'PUNCAK'
    : f.mom50Atr >= 1.2 ? 'PUMP'
    : 'AKUMULASI'
  alasan.push(
    `Tidak ada tanda tangan P&D yang cukup jelas: dist=${dist.toFixed(1)} ATR, pos=${f.posInWindow60.toFixed(2)}, mom50=${f.mom50Atr.toFixed(1)} ATR, volZ=${f.volZ.toFixed(1)}`,
    'Disiplin: tanpa bacaan fase yang jelas, duit tinggal di meja — menghindari trade arah bait',
  )
  return {
    versi, aksi: 'SKIP', arah: 'NAIK', targetPct: 2.0,
    fase: faseDuga, puncakEst: f.puncakJendela, dasarEst: f.dasarJendela,
    konfirmasi: { ada: false, label: 'tidak ada konfirmasi — SKIP' },
    alasan, pelajaranAktif, fitur: f,
  }
}
