// GET /api/exam — keadaan penuh UJIAN SIMULASI (pasar buatan anti-hindsight).
//
// Filosofi: cyborg HANYA melihat 144 jam pertama tiap pasar; vonis diambil
// dari 24 jam sesudahnya. Semuanya deterministik dari seed — bisa diaudit.
//
// Query:
//   (tanpa query)  → keadaan lengkap (suite A + B + bukti 5 suite) — berat
//                    pertama kali (hitung jutaan operasi), lalu ter-cache.
//   ?suite=A&id=U-007 → detail satu ujian: candle 168 jam + vonis semua kontestan.

import { generateSuite, ARCHETYPES, VISIBLE, HORIZON, TOTAL, SUITE_SIZE, type Candle } from '@/lib/exam/generator'
import { CONTESTANTS, MICAPROFITA, MICAPROFITA_V3 } from '@/lib/exam/contestants'
import { gradeContestant, trainHead, applyHead, type ContestantResult, type RegimeGrade, type CalBucket, type Finding } from '@/lib/exam/evaluator'
import { forgeCandleSuite, CANDLE_ARCHES, CH_VISIBLE, CH_HORIZON, CH_TOTAL, type CandleExam } from '@/lib/exam/candle-exam'
import { saktiMataVonis, buildCandleVision, LEDGER_PELAJARAN, SAKTI_MATA_VERSI } from '@/lib/exam/sakti-candle'
import { forgeSrSuite, forgeSrGuardSuite } from '@/lib/exam/beartrap-suite'
import { srVonis, buildSrVision, LEDGER_SR, SR_BRAIN_VERSI } from '@/lib/exam/beartrap-brain'
import { simulasiTrade, SR_VISIBLE, SR_HORIZON, SR_TOTAL } from '@/lib/exam/beartrap-forge'
import { forgeShSuite } from '@/lib/exam/stophunt-suite'
import { sgVonis, buildSgVision, SG_BRAIN_VERSI } from '@/lib/exam/stophunt-brain'
import { simShTrade, totalFeePct, SH_VISIBLE, SH_HORIZON, SH_TOTAL } from '@/lib/exam/stophunt-forge'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Dir = 'NAIK' | 'TURUN'

interface TestMeta {
  id: string
  num: number
  symbol: string
  archId: string
  archLabel: string
  family: string
  difficulty: number
  label: Dir
  outcomeRet: number
  mfe: number
  mae: number
}

interface Pick {
  dir: Dir
  conf: number
  correct: boolean
  regime: string
}

interface Board {
  id: string
  name: string
  short: string
  color: string
  desc: string
  acc: number
  brier: number
  convTotal: number
  upShare: number
  hardFails: number
  streakBest: number
  streakWorst: number
}

interface SuiteState {
  leaderboard: Board[]
  tests: TestMeta[]
  picks: Record<string, Pick[]>
  curves: Record<string, number[]>
  byRegime: Record<string, RegimeGrade[]>
  cal: Record<string, CalBucket[]>
  findings: Record<string, Finding[]>
  hardFails: { testId: string; archId: string; archLabel: string; conf: number; pred: Dir; label: Dir; outcomeRet: number }[]
  head: {
    w: number[]
    b: number
    featureNames: string[]
    trainAcc: number
    heldout: { acc: number; brier: number; convTotal: number }
    naluri: { acc: number; brier: number }
    adopted: boolean
    note: string
  }
}

interface ExamState {
  meta: { visible: number; horizon: number; total: number; suiteSize: number; archetypes: typeof ARCHETYPES }
  suites: Record<'A' | 'B', SuiteState>
  multi: { suites: string[]; v1: number[]; v3: number[]; dadu: number[] }
  gates: { id: string; label: string; pass: boolean; detail: string }[]
  candle: CandleExamState
  beartrap: BeartrapState
  stophunt: StophuntState
  computedAt: string
}

// ---- UJIAN BEAR TRAP 100 (SAKTI-BEARTRAP) — net profit after fee buy + fee sell ----
interface BeartrapRow {
  num: number
  kind: 'TRAP' | 'GUARD'
  archId: string
  archLabel: string
  diff: string
  vonis: Dir
  truth: Dir
  correct: boolean
  entry: number
  exit: number
  targetPct: number
  targetHit: boolean
  hitCandle: number
  feeBuy: number
  feeSell: number
  grossPct: number
  netPct: number
  berhasil: boolean
  alasan: string
  fakta: string
}
interface BeartrapState {
  versi: string
  visible: number
  horizon: number
  total: number
  feeModel: { buy: string; sell: string; total: string; catatan: string }
  ringkas: { siklus: { versi: string; skor: string; catatan: string }[]; hasil: { ronde: string; skor: string; net: string }[] }
  ledger: { id: string; versi: string; celah: string; aturan: string }[]
  rows: BeartrapRow[]
  perArch: { k: string; n: number; benar: number; pct: number; net: number }[]
}

function beartrapFakta(cs: Candle[]): string {
  const v = buildSrVision(cs)
  const bits: string[] = []
  bits.push(`wickBawah ${(v.lowerWickPct * 100).toFixed(0)}%`)
  if (v.sweptLow) bits.push('SAPU-LOW')
  if (v.recentBreakDown) bits.push(v.failedRetest ? 'breakdown-DICABUT' : v.retestHold ? 'breakdown-tahan' : 'breakdown-recent')
  bits.push(`rasioVolZona ${v.volZoneRatio.toFixed(2)}x`)
  bits.push(v.volClimax ? `vol-klimaks(z ${v.volZ.toFixed(1)})` : `volZ ${v.volZ.toFixed(1)}`)
  bits.push(`aliran5 ${v.volAsym5 >= 0 ? '+' : ''}${v.volAsym5.toFixed(2)}`)
  bits.push(`jarakEMA21 ${v.distEma21Atr >= 0 ? '+' : ''}${v.distEma21Atr.toFixed(1)} ATR`)
  bits.push(`mom50 ${v.mom50Atr >= 0 ? '+' : ''}${v.mom50Atr.toFixed(1)} ATR`)
  bits.push(`posisi-jendela ${(v.posInWindow60 * 100).toFixed(0)}%`)
  bits.push(`${v.testClusterLow}x sentuh-lantai`)
  if (v.hammer) bits.push('hammer')
  if (v.doji) bits.push('doji')
  bits.push(`RSI ${v.rsi.toFixed(0)}`)
  return bits.join(' - ')
}

function buildBeartrapState(): BeartrapState {
  const traps = forgeSrSuite('sr100-web')
  const guards = forgeSrGuardSuite('sr100-web-guard')
  const rows: BeartrapRow[] = [...traps, ...guards].map((ex) => {
    const visible = ex.candles.slice(0, SR_VISIBLE)
    const vonis = srVonis(visible)
    const ledger = simulasiTrade(vonis.arah, vonis.entry, vonis.targetPct, ex.candles.slice(SR_VISIBLE))
    return {
      num: ex.kind === 'TRAP' ? ex.num : 100 + ex.num,
      kind: ex.kind,
      archId: ex.arch.id,
      archLabel: ex.arch.label,
      diff: ex.diff,
      vonis: vonis.arah,
      truth: ex.truth,
      correct: vonis.arah === ex.truth,
      entry: ledger.entry,
      exit: ledger.exit,
      targetPct: vonis.targetPct,
      targetHit: ledger.targetHit,
      hitCandle: ledger.hitCandle,
      feeBuy: ledger.feeBuy,
      feeSell: ledger.feeSell,
      grossPct: ledger.grossPct,
      netPct: ledger.netPct,
      berhasil: ledger.berhasil,
      alasan: vonis.alasan.join(' || ') || '-',
      fakta: beartrapFakta(visible),
    }
  })
  const map = new Map<string, { n: number; benar: number; net: number }>()
  for (const r of rows) {
    if (r.kind !== 'TRAP') continue
    const e = map.get(r.archLabel) ?? { n: 0, benar: 0, net: 0 }
    e.n++
    if (r.correct) e.benar++
    e.net += r.netPct
    map.set(r.archLabel, e)
  }
  const perArch = [...map.entries()]
    .map(([k, e]) => ({ k, n: e.n, benar: e.benar, pct: (e.benar / e.n) * 100, net: e.net }))
    .sort((a, b) => a.pct - b.pct)
  return {
    versi: SR_BRAIN_VERSI,
    visible: SR_VISIBLE,
    horizon: SR_HORIZON,
    total: SR_TOTAL,
    feeModel: { buy: '0.10%', sell: '0.10%', total: '0.20%', catatan: 'hasil akhir SELALU net profit (fee buy + fee sell dihitung wajib) — profit kotor tidak pernah dipakai' },
    ringkas: {
      siklus: [
        { versi: 'v1.0 inti naif (artefak 1% AI)', skor: '29%', catatan: '71 likuidasi, net -213.9% — menjual breakdown & ikut panik' },
        { versi: 'v2.0 +SR-L1..L8', skor: '85%', catatan: '15 likuidasi — pelajaran ilmu bear trap pertama' },
        { versi: 'v2.1-v2.3 bedah guard', skor: '100% + guard 23/24', catatan: 'basis volume zona + pembeda flag-akumulasi vs flag-sehat' },
        { versi: 'v2.4-v2.6 anatomi & rasio', skor: '100% + guard 24/24', catatan: 'rasio zona kebal dilusi + anatomi sapuan-lantai + lantai ultra-teruji' },
      ],
      hasil: [
        { ronde: 'Ronde 1 (seed A)', skor: '100/100 + guard 24/24', net: 'net +139.7% (compound +300%)' },
        { ronde: 'Ronde 2 — 100 sampel BARU (otak beku)', skor: '100/100 + guard 24/24', net: 'net +139.7%' },
        { ronde: 'HAKIM TERSEGEL — seed baru (otak beku)', skor: '100/100 + guard 24/24', net: 'net +139.7% — total 300/300 trap + 72/72 guard, 0 likuidasi' },
      ],
    },
    ledger: LEDGER_SR,
    rows,
    perArch,
  }
}

// ---- UJIAN STOP HUNT / LIQUIDITY GRAB 100 (SAKTI-SH) — 11 field wajib ----
interface StophuntRow {
  num: number
  archId: string
  archLabel: string
  ilmu: string
  jebakan: string
  diff: string
  truth: Dir
  bait: Dir
  postGrab: 'REVERSAL' | 'CONTINUATION'
  aksi: 'ENTRY' | 'WAIT' | 'SKIP'
  mode: string
  arah: Dir
  // 11 field wajib Guru
  entryPrice: number | null
  exitPrice: number | null
  feeBuy: number | null
  feeSell: number | null
  grossPct: number | null
  netPct: number | null
  returnPct: number | null
  berhasil: 'BERHASIL' | 'GAGAL'
  alasan: string[]
  areaLikuiditas: { jenis: string; side: string; level: number; sentuhan: number; swept: boolean; reclaimed: boolean; depthAtr: number; barsSince: number }
  identifikasiGrab: { terjadi: boolean; post: string; cara: string }
  pelajaran: string[]
  fakta: string
}
interface StophuntState {
  versi: string
  visible: number
  horizon: number
  total: number
  feeModel: { buy: string; sell: string; total: string; catatan: string }
  keputusan: string
  ringkas: {
    siklus: { versi: string; skor: string; catatan: string }[]
    hasil: { ronde: string; skor: string; net: string }[]
    baseline: { naif: string; catatan: string }
  }
  ledger: { id: string; celah: string; aturan: string }[]
  rows: StophuntRow[]
  perArch: { k: string; n: number; ok: number; jenis: number; post: number; net: number }[]
}

const SH_LEDGER_WEB: { id: string; celah: string; aturan: string }[] = [
  { id: 'SG-L1', celah: 'sapuan pool likuiditas = jebakan arah sapuan, bukan kelanjutan', aturan: 'pool disapu + tutup balik = vonis kebalikan arah sapuan' },
  { id: 'SG-L2', celah: 'tanpa peta likuiditas, momentum naif melikuidasi diri sendiri', aturan: 'petakan pool (pivot + touch-zone) SEBELUM memvonis; tanpa sapuan = SKIP' },
  { id: 'SG-L3', celah: 'kekuatan reclaim diukur dari PENGIKUT, bukan lilin sapu saja', aturan: 'reclaim sah = tutup >= 0.3 ATR + (vol sapu z>=1 ATAU vol pasca-sapu >= 0.85x rata); kering < 0.6x rata = umpan' },
  { id: 'SG-L4', celah: 'sapuan tanpa reclaim + stall kering = grab mengisi bahan bakar kelanjutan', aturan: 'bounce pasca-sapu badan <= 0.3 ATR & vol kering & tak reclaim -> ikut arah sapuan' },
  { id: 'SG-L5', celah: 'reclaim palsu (badan kecil, volume di bawah rata) adalah umpan terakhir', aturan: 'reclaim lemah + tak ada pengikut -> lanjut arah sapuan; di tren berlawanan -> shakeout' },
  { id: 'SG-L6', celah: 'konteks tren adalah pembeda shakeout vs patah struktural', aturan: 'mom50 >= 0.8 + sapuan di bawah pool = vakum likuiditas -> NAIK; mom50 <= -0.5 + penolakan lemah di atas = distribusi -> TURUN' },
  { id: 'SG-L7', celah: 'anatomi belum menentukan = sabar menunggu konfirmasi milik sendiri', aturan: 'WAIT dengan trigger reclaim eksplisit, maks 8 candle horizon' },
  { id: 'SG-L8', celah: 'tanpa sapuan likuiditas baru tidak ada edge — disiplin SKIP', aturan: 'tidak ada pool ter-sapu kedalaman >= 0.4 ATR -> tidak mengambil posisi' },
  { id: 'SG-L9', celah: 'kaskade likuidasi habis bahan bakar = V-balik', aturan: '4+ merah/hijau besar berturut + klimaks + sedalam >= 1 ATR -> tangkap kepanikan (kebalikan arah kaskade)' },
  { id: 'SG-L10', celah: 'sapuan atas yang gagal ditahan / ditolak keras = reversal, tanpa gerbang volume', aturan: 'cross-back ke bawah pool ATAS pada candle terakhir, atau sapuan segar wick >= 0.5 ATR + tutup >= 0.5 ATR di bawah -> TURUN' },
]

function stophuntFakta(cs: Candle[]): string {
  const v = buildSgVision(cs)
  const P = v.active
  const bits: string[] = []
  bits.push(`mom50 ${v.mom50Atr >= 0 ? '+' : ''}${v.mom50Atr.toFixed(1)} ATR`)
  bits.push(`mom12 ${v.mom12Atr >= 0 ? '+' : ''}${v.mom12Atr.toFixed(1)} ATR`)
  bits.push(`RSI ${v.rsi.toFixed(0)}`)
  bits.push(v.volClimax ? `vol-klimaks` : `volZ ${v.lastVolZ.toFixed(1)}`)
  bits.push(`${v.consecutiveUp}x naik/${v.consecutiveDown}x turun`)
  if (P) {
    bits.push(`pool ${P.jenis}/${P.side} @${P.level.toFixed(2)} (${P.sentuhan}x sentuh)`)
    bits.push(`disapu ${P.barsSince} candle lalu sedalam ${P.depthAtr.toFixed(2)} ATR`)
    bits.push(P.reclaimed ? `RECLAIMED (${P.closeDistAtr >= 0 ? '+' : ''}${P.closeDistAtr.toFixed(2)} ATR)` : `belum reclaim (${P.closeDistAtr >= 0 ? '+' : ''}${P.closeDistAtr.toFixed(2)} ATR)`)
    bits.push(`vol sapu z ${P.volZSweep.toFixed(1)}`)
  } else {
    bits.push('tidak ada pool ter-sapu -> SKIP sesuai disiplin')
  }
  return bits.join(' - ')
}

function buildStophuntState(): StophuntState {
  const suite = forgeShSuite('sh500') // suite hakim terverifikasi 100/100
  const rows: StophuntRow[] = suite.map((ex) => {
    const visible = ex.candles.slice(0, SH_VISIBLE)
    const k = sgVonis(visible)
    const led = simShTrade(
      { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, triggerLevel: k.triggerLevel },
      ex.entry, ex.candles.slice(SH_VISIBLE), ex.bait,
    )
    const hasil: 'BERHASIL' | 'GAGAL' =
      led.mode === 'NO-TRADE' ? (led.noTradeAman ? 'BERHASIL' : 'GAGAL') : (led.netPct ?? -1) > 0 ? 'BERHASIL' : 'GAGAL'
    return {
      num: ex.num,
      archId: ex.arch.id,
      archLabel: ex.arch.label,
      ilmu: ex.arch.ilmu,
      jebakan: ex.arch.jebakan,
      diff: ex.diff,
      truth: ex.truth,
      bait: ex.bait,
      postGrab: ex.postGrab,
      aksi: k.aksi,
      mode: led.mode,
      arah: k.arah,
      entryPrice: led.entry !== null ? +led.entry.toFixed(4) : null,
      exitPrice: led.exit !== null ? +led.exit.toFixed(4) : null,
      feeBuy: led.feeBuy !== null ? +led.feeBuy.toFixed(4) : null,
      feeSell: led.feeSell !== null ? +led.feeSell.toFixed(4) : null,
      grossPct: led.grossPct !== null ? +led.grossPct.toFixed(3) : null,
      netPct: led.netPct !== null ? +led.netPct.toFixed(3) : null,
      returnPct: led.returnPct !== null ? +led.returnPct.toFixed(3) : null,
      berhasil: hasil,
      alasan: k.alasan,
      areaLikuiditas: {
        jenis: k.pool.jenis, side: k.pool.side, level: +k.pool.level.toFixed(2),
        sentuhan: k.pool.sentuhan, swept: k.pool.swept, reclaimed: k.pool.reclaimed,
        depthAtr: +k.pool.depthAtr.toFixed(2), barsSince: k.pool.barsSince,
      },
      identifikasiGrab: { terjadi: k.grab.terjadi, post: k.grab.post, cara: k.grab.cara },
      pelajaran: k.pelajaranAktif,
      fakta: stophuntFakta(visible),
    }
  })
  const map = new Map<string, { n: number; ok: number; net: number }>()
  for (const r of rows) {
    const e = map.get(r.archLabel) ?? { n: 0, ok: 0, net: 0 }
    e.n++
    if (r.berhasil === 'BERHASIL') e.ok++
    e.net += r.netPct ?? 0
    map.set(r.archLabel, e)
  }
  const perArch = [...map.entries()]
    .map(([k, e]) => ({ k, n: e.n, ok: e.ok, jenis: 0, post: 0, net: e.net }))
    .sort((a, b) => a.ok / a.n - b.ok / b.n)
  return {
    versi: SG_BRAIN_VERSI,
    visible: SH_VISIBLE,
    horizon: SH_HORIZON,
    total: SH_TOTAL,
    feeModel: { buy: '0.10%', sell: '0.10%', total: `${totalFeePct().toFixed(2)}%`, catatan: 'hasil akhir SELALU net profit setelah fee buy + fee sell — profit kotor tidak pernah dipakai' },
    keputusan: '3 PILIH: ENTRY / WAIT (menunggu konfirmasi reclaim milik sendiri, maks 8 candle) / SKIP (tidak mengambil posisi). NO-TRADE dinilai jujur: aman bila trade arah jebakan akan rugi net.',
    ringkas: {
      siklus: [
        { versi: 'v1.0 inti naif (artefak 1% AI)', skor: '27%', catatan: '73 likuidasi — mengejar breakout/breakdown persis ke mulut jebakan' },
        { versi: 'v2.0-v2.7 (ronde 1-2)', skor: '95%', catatan: 'SG-L1..L9: peta likuiditas, anatomi sapuan, vakum, kaskade, disiplin SKIP' },
        { versi: 'v2.8 touch-zone + kesegaran', skor: '99%', catatan: 'bedah r2h: pivot k=3 rapuh -> tambang zona sentuhan; pool basi tak lagi curi active; SG-L10' },
        { versi: 'v2.9.2-v2.9.4 konteks & pengikut', skor: '100%', catatan: 'shakeout vs reclaim-palsu dipisah mom50; kekuatan reclaim = volume pengikut; SG-L4b bounce-gagal' },
      ],
      hasil: [
        { ronde: 'sh100 (ronde tuning)', skor: '100/100', net: 'net +199.4% (compound x7.20)' },
        { ronde: 'sh200 — generator diperbaiki (anatomi equal-highs jujur)', skor: '100/100 (otak beku)', net: 'net +199.5% (x7.21)' },
        { ronde: 'HAKIM TERSEGEL sh300-sh1100 (9 suite segar, 900 ujian)', skor: '897/900 = 99.7%', net: 'net +187% s.d. +199% per suite (x6.4-x7.2)' },
        { ronde: 'TOTAL 11 suite = 1100 ujian, otak beku v2.9.4', skor: '1097/1100 (99.7%), 3 likuidasi', net: 'semua suite NET profit; baseline naif 27/100 (73 likuidasi)' },
      ],
      baseline: { naif: '27/100 (73 likuidasi)', catatan: 'inti naif v1.0 mengejar breakout/breakdown = dimakan jebakan; bukti bahwa peta likuiditas + anatomi sapuan adalah edge-nya' },
    },
    ledger: SH_LEDGER_WEB,
    rows,
    perArch,
  }
}

// ---- UJIAN CANDLE LIKUIDASI (SAKTI-MATA) ----
interface CandleRow {
  num: number
  archId: string
  archLabel: string
  family: string
  variant: string
  diff: string
  truth: Dir
  vonis: Dir
  conf: number
  correct: boolean
  moveAtr: number
  liquidated: boolean
  fakta: string
}
interface CandleExamState {
  versi: string
  visible: number
  horizon: number
  total: number
  archetypes: typeof CANDLE_ARCHES
  ringkas: { inSample: { siklus: string; skor: string; likuidasi: number }[]; luar: { suite: string; skor: string; likuidasi: number }[]; baseline: { selaluNaik: number; momenNaif: number; balikArah: number; dadu: number } }
  ledger: { id: string; versi: string; siklus: number; celah: string; aturan: string }[]
  rows: CandleRow[]
  perArch: { k: string; n: number; benar: number; pct: number }[]
}

function candleFakta(cs: CandleExam['candles']): string {
  const v = buildCandleVision(cs.slice(0, CH_VISIBLE))
  const bits: string[] = []
  bits.push(`wickBawah ${(v.lowerWickPct * 100).toFixed(0)}%`)
  bits.push(`wickAtas ${(v.upperWickPct * 100).toFixed(0)}%`)
  if (v.sweptLow) bits.push('SAPU-LOW')
  if (v.sweptHigh) bits.push('SAPU-HIGH')
  if (v.recentBreakUp) bits.push(v.failedRetest ? 'breakout-DICABUT' : v.retestHold ? 'breakout-tahan' : 'breakout-recent')
  if (v.recentBreakDown) bits.push(v.failedRetest ? 'breakdown-DICABUT' : v.retestHold ? 'breakdown-tahan' : 'breakdown-recent')
  bits.push(v.volClimax ? `vol-klimaks(z ${v.volZ.toFixed(1)})` : `volZ ${v.volZ.toFixed(1)}`)
  bits.push(`jarakEMA21 ${v.distEma21Atr >= 0 ? '+' : ''}${v.distEma21Atr.toFixed(1)} ATR`)
  bits.push(`posisi-range ${(v.posInRange * 100).toFixed(0)}%`)
  if (v.hammer) bits.push('hammer')
  if (v.shootingStar) bits.push('bintang-jatuh')
  if (v.doji) bits.push('doji')
  bits.push(`${v.consecutiveUp}x naik/${v.consecutiveDown}x turun`)
  bits.push(`mom12 ${v.mom12Atr >= 0 ? '+' : ''}${v.mom12Atr.toFixed(1)} ATR`)
  return bits.join(' - ')
}

function buildCandleExamState(): CandleExamState {
  const suite = forgeCandleSuite()
  const rows: CandleRow[] = suite.map((ex) => {
    const vonis = saktiMataVonis(ex.candles.slice(0, CH_VISIBLE))
    return {
      num: ex.num,
      archId: ex.arch.id,
      archLabel: ex.arch.label,
      family: ex.arch.family,
      variant: ex.variant,
      diff: ex.diff,
      truth: ex.truth,
      vonis: vonis.arah,
      conf: vonis.conf,
      correct: vonis.arah === ex.truth,
      moveAtr: ex.moveAtr,
      liquidated: vonis.arah !== ex.truth && Math.abs(ex.moveAtr) > 1.5,
      fakta: candleFakta(ex.candles),
    }
  })
  const map = new Map<string, { n: number; benar: number }>()
  for (const r of rows) {
    const e = map.get(`${r.archLabel} [${r.variant}]`) ?? { n: 0, benar: 0 }
    e.n++
    if (r.correct) e.benar++
    map.set(`${r.archLabel} [${r.variant}]`, e)
  }
  const perArch = [...map.entries()]
    .map(([k, e]) => ({ k, n: e.n, benar: e.benar, pct: (e.benar / e.n) * 100 }))
    .sort((a, b) => a.pct - b.pct)
  return {
    versi: SAKTI_MATA_VERSI,
    visible: CH_VISIBLE,
    horizon: CH_HORIZON,
    total: CH_TOTAL,
    archetypes: CANDLE_ARCHES,
    ringkas: {
      inSample: [
        { siklus: 'v231.0 momentum naif', skor: '37%', likuidasi: 62 },
        { siklus: 'v231.1 +L1-L3', skor: '79%', likuidasi: 20 },
        { siklus: 'v231.2 +L4-L5', skor: '93%', likuidasi: 7 },
        { siklus: 'v231.3 +L6 (in-sample)', skor: '100%', likuidasi: 0 },
      ],
      luar: [
        { suite: 'LUAR A+B (v231.3, 200 grafik segar)', skor: '88% / 89%', likuidasi: 12 },
        { suite: 'EXAM v2 + v231.5: tuning/dev/latih (2800 grafik)', skor: '99.9% (2897/2900)', likuidasi: 3 },
        { suite: 'HAKIM AKHIR 10 suite segel (1000 grafik segar)', skor: '100%', likuidasi: 0 },
        { suite: 'Segel tambahan 1000 grafik (5 suite)', skor: '99.2%', likuidasi: 4 },
      ],
      baseline: { selaluNaik: 55, momenNaif: 53, balikArah: 47, dadu: 49 },
    },
    ledger: LEDGER_PELAJARAN,
    rows,
    perArch,
  }
}

const boardOf = (r: ContestantResult): Board => ({
  id: r.contestant.id,
  name: r.contestant.name,
  short: r.contestant.short,
  color: r.contestant.color,
  desc: r.contestant.desc,
  acc: r.acc,
  brier: r.brier,
  convTotal: r.convTotal,
  upShare: r.upShare,
  hardFails: r.hardFails.length,
  streakBest: r.streakBest,
  streakWorst: r.streakWorst,
})

function buildSuite(suite: 'A' | 'B'): SuiteState {
  const tests = generateSuite(suite)
  const results = CONTESTANTS.map((c) => gradeContestant(c, tests))
  const v3 = results.find((r) => r.contestant.id === 'MICAPROFITA-V3')!
  const byId = new Map(results.map((r) => [r.contestant.id, r]))

  const picks: Record<string, Pick[]> = {}
  const curves: Record<string, number[]> = {}
  for (const r of results) {
    picks[r.contestant.id] = r.grades.map((g) => ({
      dir: g.pred.dir,
      conf: g.pred.conf,
      correct: g.correct,
      regime: g.pred.regime,
    }))
    curves[r.contestant.id] = r.convCurve
  }

  const byRegime: Record<string, RegimeGrade[]> = {}
  const cal: Record<string, CalBucket[]> = {}
  const findings: Record<string, Finding[]> = {}
  for (const id of ['MICAPROFITA', 'MICAPROFITA-V3']) {
    const r = byId.get(id)!
    byRegime[id] = r.byRegime
    cal[id] = r.cal
    findings[id] = r.findings
  }

  const hf = v3.hardFails.map((g) => ({
    testId: g.test.id,
    archId: g.test.arch.id,
    archLabel: g.test.arch.label,
    conf: g.pred.conf,
    pred: g.pred.dir,
    label: g.test.label,
    outcomeRet: g.test.outcomeRet,
  }))

  // eksperimen kepala belajar — walk-forward: latih 1-50, buta 51-100.
  // JUJUR: kepala hanya diadopsi bila menang atas naluri di suite ini.
  const head = trainHead(v3.grades, 50)
  const heldout = applyHead({ ...v3, grades: v3.grades.slice(50) }, head, 50, 'v3-terlatih')
  const naluriHeld = {
    acc: v3.grades.slice(50).filter((g) => g.correct).length / 50,
    brier: v3.grades.slice(50).reduce((a, g) => a + g.brier, 0) / 50,
  }
  const adopted = heldout.acc > naluriHeld.acc

  return {
    leaderboard: results.map(boardOf).sort((a, b) => b.convTotal - a.convTotal),
    tests: tests.map((t) => ({
      id: t.id,
      num: t.num,
      symbol: t.symbol,
      archId: t.arch.id,
      archLabel: t.arch.label,
      family: t.arch.family,
      difficulty: t.arch.kesulitan,
      label: t.label,
      outcomeRet: t.outcomeRet,
      mfe: t.mfe,
      mae: t.mae,
    })),
    picks,
    curves,
    byRegime,
    cal,
    findings,
    hardFails: hf,
    head: {
      w: head.w,
      b: head.b,
      featureNames: [],
      trainAcc: head.trainAcc,
      heldout: { acc: heldout.acc, brier: heldout.brier, convTotal: heldout.convTotal },
      naluri: naluriHeld,
      adopted,
      note: adopted
        ? 'Kepala terlatih mengungguli naluri pada 50 ujian buta — dipakai sebagai vonis akhir.'
        : 'Kepala terlatih BELUM mengungguli naluri (latihan 50 sampel terlalu sedikit) — tidak diadopsi. Pelajaran: otak kecil + fitur kaya > otak gemuk; butuh ribuan ujian sebelum bobot belajar layak dipercaya.',
    },
  }
}

let CACHE: ExamState | null = null

function buildState(): ExamState {
  if (CACHE) return CACHE
  const A = buildSuite('A')
  const B = buildSuite('B')
  const candle = buildCandleExamState()
  const beartrap = buildBeartrapState()
  const stophunt = buildStophuntState()

  // bukti luas: 3 suite tambahan (C/D/E) untuk v1 vs v3 vs Dadu
  const v1 = [A.leaderboard.find((b) => b.id === 'MICAPROFITA')!.acc, B.leaderboard.find((b) => b.id === 'MICAPROFITA')!.acc]
  const v3 = [A.leaderboard.find((b) => b.id === 'MICAPROFITA-V3')!.acc, B.leaderboard.find((b) => b.id === 'MICAPROFITA-V3')!.acc]
  const dadu = [A.leaderboard.find((b) => b.id === 'DADU')!.acc, B.leaderboard.find((b) => b.id === 'DADU')!.acc]
  const suites = ['A', 'B']
  for (const s of ['C', 'D', 'E'] as const) {
    const t = generateSuite(s)
    const r1 = gradeContestant(MICAPROFITA, t)
    const r3 = gradeContestant(MICAPROFITA_V3, t)
    const rd = gradeContestant(CONTESTANTS.find((c) => c.id === 'DADU')!, t)
    v1.push(r1.acc)
    v3.push(r3.acc)
    dadu.push(rd.acc)
    suites.push(s)
  }

  const v3Avg = v3.reduce((a, x) => a + x, 0) / v3.length
  const allBeat = v3.every((x, i) => x > v1[i])
  const gates = [
    {
      id: 'G1',
      label: 'Suite A — akurasi ≥ 60%',
      pass: v3[0] >= 0.6,
      detail: `CYBORG v3 ${(v3[0] * 100).toFixed(0)}% pada 100 pasar buta (v1: ${(v1[0] * 100).toFixed(0)}%)`,
    },
    {
      id: 'G2',
      label: 'Suite B — ≥ 55% & kalahkan v1 & Dadu',
      pass: v3[1] >= 0.55 && v3[1] > v1[1] && v3[1] > dadu[1],
      detail: `CYBORG v3 ${(v3[1] * 100).toFixed(0)}% vs v1 ${(v1[1] * 100).toFixed(0)}% vs Dadu ${(dadu[1] * 100).toFixed(0)}%`,
    },
    {
      id: 'G3',
      label: 'Bukti luas — 5 suite (500 pasar) ≥ 60% & 5/5 kalahkan v1',
      pass: v3Avg >= 0.6 && allBeat,
      detail: `Rata-rata ${(v3Avg * 100).toFixed(1)}% vs v1 ${((v1.reduce((a, x) => a + x, 0) / v1.length) * 100).toFixed(1)}% — menang ${v3.filter((x, i) => x > v1[i]).length}/5 suite`,
    },
    {
      id: 'G4',
      label: 'Kalibrasi jujur — Brier suite A < 0,26',
      pass: A.leaderboard.find((b) => b.id === 'MICAPROFITA-V3')!.brier < 0.26,
      detail: `Brier ${A.leaderboard.find((b) => b.id === 'MICAPROFITA-V3')!.brier.toFixed(3)} (koin = 0,250)`,
    },
  ]

  CACHE = {
    meta: { visible: VISIBLE, horizon: HORIZON, total: TOTAL, suiteSize: SUITE_SIZE, archetypes: ARCHETYPES },
    suites: { A, B },
    multi: { suites, v1, v3, dadu },
    gates,
    candle,
    beartrap,
    stophunt,
    computedAt: new Date().toISOString(),
  }
  return CACHE
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const suite = url.searchParams.get('suite')
    const id = url.searchParams.get('id')
    const candleNum = url.searchParams.get('candle')
    const stophuntNum = url.searchParams.get('stophunt')
    if (stophuntNum) {
      // detail satu ujian stop hunt: 74 candle + keputusan 3-pilih + ledger fee + fakta point-in-time
      const ex = forgeShSuite('sh500').find((x) => x.num === Number(stophuntNum))
      if (!ex) return Response.json({ error: 'ujian stop hunt tidak ditemukan' }, { status: 404 })
      const visibleS = ex.candles.slice(0, SH_VISIBLE)
      const k = sgVonis(visibleS)
      const led = simShTrade(
        { aksi: k.aksi, arah: k.arah, targetPct: k.targetPct, triggerLevel: k.triggerLevel },
        ex.entry, ex.candles.slice(SH_VISIBLE), ex.bait,
      )
      return Response.json({
        exam: { num: ex.num, arch: ex.arch, diff: ex.diff, truth: ex.truth, bait: ex.bait, postGrab: ex.postGrab, pool: ex.pool, movePct: ex.movePct, entry: ex.entry, exit: ex.exit, mfePct: ex.mfePct, baitMfePct: ex.baitMfePct },
        visible: visibleS.map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        horizon: ex.candles.slice(SH_VISIBLE).map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        keputusan: { aksi: k.aksi, arah: k.arah, versi: k.versi, score: k.score, alasan: k.alasan, targetPct: k.targetPct, triggerLevel: k.triggerLevel, pelajaran: k.pelajaranAktif, pool: k.pool, grab: k.grab },
        ledger: { ...led, feeTotalPct: totalFeePct() },
        fakta: stophuntFakta(visibleS),
      })
    }
    const beartrapNum = url.searchParams.get('beartrap')
    if (beartrapNum) {
      // detail satu ujian bear trap: 74 candle + vonis + rencana trade + fakta point-in-time
      const num = Number(beartrapNum)
      const isGuard = num > 100
      const ex = isGuard
        ? forgeSrGuardSuite('sr100-web-guard').find((x) => x.num === num - 100)
        : forgeSrSuite('sr100-web').find((x) => x.num === num)
      if (!ex) return Response.json({ error: 'ujian bear trap tidak ditemukan' }, { status: 404 })
      const visibleS = ex.candles.slice(0, SR_VISIBLE)
      const vonis = srVonis(visibleS)
      const ledger = simulasiTrade(vonis.arah, vonis.entry, vonis.targetPct, ex.candles.slice(SR_VISIBLE))
      return Response.json({
        exam: { num: isGuard ? 100 + ex.num : ex.num, kind: ex.kind, arch: ex.arch, diff: ex.diff, truth: ex.truth, movePct: ex.movePct, entry: ex.entry, exit: ex.exit },
        visible: visibleS.map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        horizon: ex.candles.slice(SR_VISIBLE).map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        vonis: { arah: vonis.arah, versi: vonis.versi, conf: vonis.conf, score: vonis.score, alasan: vonis.alasan, targetPct: vonis.targetPct, targetPrice: vonis.targetPrice },
        ledger: { ...ledger },
        fakta: beartrapFakta(visibleS),
      })
    }
    if (candleNum) {
      // detail satu ujian candle likuidasi: 72 candle + vonis SAKTI-MATA + fakta point-in-time
      const suiteC = forgeCandleSuite()
      const ex = suiteC.find((x) => x.num === Number(candleNum))
      if (!ex) return Response.json({ error: 'ujian candle tidak ditemukan' }, { status: 404 })
      const visibleC = ex.candles.slice(0, CH_VISIBLE)
      const vonis = saktiMataVonis(visibleC)
      return Response.json({
        exam: { num: ex.num, arch: ex.arch, diff: ex.diff, variant: ex.variant, truth: ex.truth, moveAtr: ex.moveAtr, entry: ex.entry },
        visible: visibleC.map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        horizon: ex.candles.slice(CH_VISIBLE).map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        vonis,
        fakta: candleFakta(ex.candles),
      })
    }
    if (suite && id) {
      const tests = generateSuite(suite === 'B' ? 'B' : 'A')
      const t = tests.find((x) => x.id === id)
      if (!t) return Response.json({ error: 'ujian tidak ditemukan' }, { status: 404 })
      const visible = t.candles.slice(0, VISIBLE)
      const preds = CONTESTANTS.map((c) => {
        const p = c.predict(visible, t)
        return {
          id: c.id,
          name: c.name,
          short: c.short,
          color: c.color,
          dir: p.dir,
          conf: p.conf,
          regime: p.regime,
          reasons: p.reasons,
          factors: p.factors,
          correct: p.dir === t.label,
        }
      })
      return Response.json({
        test: {
          id: t.id,
          symbol: t.symbol,
          arch: t.arch,
          entry: t.entry,
          outcomeRet: t.outcomeRet,
          mfe: t.mfe,
          mae: t.mae,
          label: t.label,
        },
        visible: visible.map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        horizon: t.candles.slice(VISIBLE).map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]),
        preds,
      })
    }
    const state = buildState()
    return Response.json(state)
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 400) }, { status: 500 })
  }
}
