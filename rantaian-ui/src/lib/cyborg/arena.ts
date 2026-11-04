// ============================================================
// ORKESTRATOR ARENA — jantung pertarungan AGI kripto.
//
// Aliran hidup (tiap kali UI meminta status):
//   1. Ambil universe + candle REAL (Binance)
//   2. Untuk setiap hari pertarungan yang belum teradili:
//      semua kompetitor mengajukan pick arah biner dengan data
//      HANYA dari candle sebelum hari-D (bebas kebocoran)
//   3. Hari dinilai dengan candle close hari-D (vonis realita)
//   4. MICAPROFITA berevolusi: mutasi genome → revolusi bila
//     buruk → mode-upgrade bila kalah dari AI ANALIS
//   5. Ingatan dipanen & dikompresi (dedup FNV-1a)
//   6. Pick hari berjalan dibuat (PENDING, dinilai besok)
// Idempoten: aman dipanggil berkali-kali, hanya hari baru diproses.
// ============================================================

import { db } from '@/lib/db'
import {
  Candle, RegimeInfo, addDays, atrPct, candleForDay, candlesBefore, dayOfTs, dayOpenTs, dynamicUniverse, getClimate,
  getFundingRates, getKlines, getKlines1h, getKlines4hBulk, getKlinesBulk, getKlinesFuturesBulk, getRegime, getUniverse,
  getUniverseFutures, mom4hFrom,
} from './market'
import { CoinFactors, FACTOR_IDS, FactorId, computeFactors, coarseBucket, factorBucket, rankNormalize } from './factors'
import {
  GenomeV2, Weights, MemoryLookup, decideDaftar, decidePredator, coarsePolaFingerprint, episodeFingerprint, lessonFingerprint,
  patternFingerprint, regimePolaFingerprint, rivalFingerprint, sanitizeGenomeV2,
  KortexBuku, SLOT_TEMPUR, DaftarStats,
} from './brain'
import { defaultClone, defaultGenomeV2Clone, fitnessFromResults, mutate, mutateKnobs, revolutionize } from './evolution'
import { MemoryPayload, compressionStats, loadMemoryLookup, remember } from './memory'
import { applyVonis, vonisLivePicks } from './verdict'
import { growthPulse } from './growth'
import { cuanPulse } from './cuan'
import { perkayaWarisan } from './warisan'
import {
  RivalResult, SnapshotCoin, aiAnalisPick, bnhPick, meanRevPick, momentumPick, randomPick,
} from './rivals'

const BACKFILL_DAYS = 21
// V301 DAFTAR TEMPUR — hukum pemilik: K slot tempur = 50 (bukan 1).
const DAFTAR_POOL = 90 // kandidat dianalisa mendalam (sumber 50 slot tempur)
const POOL_SIZE = 120 // pool spot lebar — diperluas union universe futures
const SNAPSHOT_SIZE = 12
const MIN_ENSURE_INTERVAL = 45_000
// V300-ANTISTUCK — denyut arena tidak boleh mati selamanya.
// (1) Watchdog: run yang melewati batas keras dianggap gantung → status error
//     + guard dilepas → denyut berikutnya otomatis mengulang.
// (2) Jantung (runHeartbeat): run mencatat denyut hidup di meta; bila status
//     'berjalan' tapi jantung diam > batas (mis. proses restart di tengah run),
//     status dipulihkan otomatis tanpa menunggu manusia.
const MAX_RUN_MS = 8 * 60_000

/** Hari UTC sekarang dari JAM SISTEM — kebenaran kalender, bukan dari data. */
export function utcTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function lagHari(dari: string, ke: string): number {
  const a = Date.parse(dari + 'T00:00:00Z'), b = Date.parse(ke + 'T00:00:00Z')
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

interface DayContext {
  day: string
  regime: RegimeInfo
  factors: CoinFactors[]
  norm: Map<string, Record<FactorId, number>>
  closes: Map<string, number[]>
  /** Momentum 24 jam dari candle 4h selesai (UPGRADE V3) — radar intraday. */
  m4h: Map<string, number>
}

type PatternStat = { align: number; n: number }

interface RunState {
  weights: Record<string, Weights>
  genomeV2: GenomeV2
  generation: number
  cumDelta: number
  patternStats: Partial<Record<FactorId, PatternStat>>
  lastRevDay: string
  lastUpgDay: string
  upgradeEtaUntil: string | null
}

const g = globalThis as unknown as { __arenaRun?: Promise<void> }

// ---------------- Meta KV ----------------

async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.findUnique({ where: { key } })
  return row?.value ?? null
}
async function setMeta(key: string, value: string) {
  await db.meta.upsert({ where: { key }, update: { value }, create: { key, value } })
}
async function bumpMetaCounter(key: string, by: number): Promise<number> {
  const cur = parseInt((await getMeta(key)) ?? '0', 10) || 0
  const next = cur + by
  await setMeta(key, String(next))
  return next
}

// ---------------- Konteks hari ----------------

async function buildDayContext(
  day: string,
  klines: Map<string, Candle[]>,
  btcAll: Candle[],
  klines4h?: Map<string, Candle[]>,
  liveCutoff?: number, // untuk hari hidup: buka candle 4h yang sedang berjalan
): Promise<DayContext> {
  const btcBefore = candlesBefore(btcAll, day)
  // UPGRADE V2/V301: universe DINAMIS — top-DAFTAR_POOL likuiditas berdasar candle
  // terakhir sebelum D. Iterasi sesuai URUTAN likuiditas → ctx.factors terurut volume.
  const universeSyms = dynamicUniverse(klines, day, DAFTAR_POOL)
  const factors: CoinFactors[] = []
  const closes = new Map<string, number[]>()
  const m4h = new Map<string, number>()
  // cutoff mom4h bebas kebocoran: hari historis → buka hari-D; hari hidup → buka candle 4h berjalan
  const cutoff = liveCutoff ?? dayOpenTs(day)
  for (const sym of universeSyms) {
    const before = candlesBefore(klines.get(sym) ?? [], day)
    if (before.length < 35) continue
    const f = computeFactors(sym, before, btcBefore)
    if (f) {
      factors.push(f)
      closes.set(sym, before.map((c) => c.close))
      if (klines4h) m4h.set(sym, mom4hFrom(klines4h.get(sym), cutoff))
    }
  }
  const regime = await getRegime(btcBefore, closes)
  if (factors.length < 10) {
    // JANGAN pernah memutuskan/panen dengan data serpihan — gagal keras agar run diulang
    throw new Error(`Data pasar tak cukup untuk ${day}: faktor ${factors.length} < 10`)
  }
  const norm = rankNormalize(factors)
  return { day, regime, factors, norm, closes, m4h }
}

// ctx.factors sudah urut volume (universe terurut quoteVolume desc)
function snapshotCoins(ctx: DayContext): SnapshotCoin[] {
  return ctx.factors.slice(0, SNAPSHOT_SIZE).map((f) => ({
      symbol: f.symbol,
      mom7: f.mom7,
      mom30: f.mom30,
      rsi: f.rsi,
      volSurge: f.volSurge,
      atrPct: f.atrPct,
      distHigh: f.distHigh,
      emaAlign: f.emaAlign === 1 ? 'naik' : f.emaAlign === -1 ? 'turun' : 'campur',
  }))
}

// ---------------- Genome ----------------

async function loadRunState(): Promise<RunState> {
  const rows = await db.genomeState.findMany()
  const weights: Record<string, Weights> = {}
  for (const r of rows) {
    try { weights[r.regime] = JSON.parse(r.weights) as Weights } catch { /* skip */ }
  }
  const patternStatsRaw = await getMeta('patternStats')
  let patternStats: Partial<Record<FactorId, PatternStat>> = {}
  if (patternStatsRaw) {
    try { patternStats = JSON.parse(patternStatsRaw) } catch { /* skip */ }
  }
  let genomeV2 = defaultGenomeV2Clone()
  const g2raw = await getMeta('genomeV2')
  if (g2raw) {
    try { genomeV2 = sanitizeGenomeV2(JSON.parse(g2raw) as Partial<GenomeV2>) } catch { /* skip */ }
  }
  return {
    weights,
    genomeV2,
    generation: parseInt((await getMeta('gen')) ?? '1', 10) || 1,
    cumDelta: 0,
    patternStats,
    lastRevDay: (await getMeta('lastRevDay')) ?? '',
    lastUpgDay: (await getMeta('lastUpgDay')) ?? '',
    upgradeEtaUntil: await getMeta('upgradeEtaUntil'),
  }
}

async function persistGenome(rs: RunState) {
  for (const [regime, w] of Object.entries(rs.weights)) {
    await db.genomeState.upsert({
      where: { regime },
      update: { weights: JSON.stringify(w) },
      create: { regime, weights: JSON.stringify(w) },
    })
  }
  await setMeta('gen', String(rs.generation))
  await setMeta('genomeV2', JSON.stringify(rs.genomeV2))
  await setMeta('patternStats', JSON.stringify(rs.patternStats))
  await setMeta('lastRevDay', rs.lastRevDay)
  await setMeta('lastUpgDay', rs.lastUpgDay)
  if (rs.upgradeEtaUntil) await setMeta('upgradeEtaUntil', rs.upgradeEtaUntil)
}

function weightsFor(rs: RunState, regime: string): Weights {
  if (!rs.weights[regime]) rs.weights[regime] = defaultClone()
  return rs.weights[regime]
}

// ---------------- Panen memori ----------------

async function harvestDay(ctx: DayContext, scored: ScoredPick[], rs: RunState) {
  let raw = 0
  let eps = 0, skippedNorm = 0, skippedRet = 0
  if (!process.env.ARENA_QUIET) console.log(`[arena][harvest] ${ctx.day} mulai: norm=${ctx.norm.size} picks=${scored.length} faktor=${ctx.factors.length}`)
  for (const p of scored) {
    if (p.direction !== 'MICAPROFITA') continue
    const norm = ctx.norm.get(p.pick.symbol)
    if (!norm) { skippedNorm++; continue }
    if (p.ret === null || p.ret === undefined) { skippedRet++; continue }
    const bucket = factorBucket(norm)
    const b3 = coarseBucket(norm)
    const ret = p.ret
    const hit = ret > 0 ? 1 : 0
    const base: MemoryPayload = { symbol: p.pick.symbol, direction: p.pick.direction, regime: ctx.regime.regime, bucket, n: 1, sumRet: ret, hitCount: hit }
    await remember('EPISODE', episodeFingerprint(ctx.regime.regime, p.pick.symbol, bucket, p.pick.direction), base, ctx.day)
    raw++
    eps++
    await remember('POLA', patternFingerprint(ctx.regime.regime, bucket, p.pick.direction), { direction: p.pick.direction, regime: ctx.regime.regime, bucket, n: 1, sumRet: ret, hitCount: hit }, ctx.day)
    raw++
    // UPGRADE V4 — jenjang kasar: bucket3 (27 kombinasi) + level rezim →
    // inilah yang membuat ingatan CUKUP PADAT untuk dibaca saat keputusan
    await remember('POLA_COARSE', coarsePolaFingerprint(ctx.regime.regime, b3, p.pick.direction), { direction: p.pick.direction, regime: ctx.regime.regime, bucket: b3, n: 1, sumRet: ret, hitCount: hit }, ctx.day)
    raw++
    await remember('POLA_REGIME', regimePolaFingerprint(ctx.regime.regime, p.pick.direction), { direction: p.pick.direction, regime: ctx.regime.regime, n: 1, sumRet: ret, hitCount: hit }, ctx.day)
    raw++
    // statistik faktor untuk revolusi (akumulasi kronologis = bebas kebocoran)
    for (const id of FACTOR_IDS) {
      const v = norm[id]
      if (v === 0 || ret === 0) continue
      const cur = rs.patternStats[id] ?? { align: 0, n: 0 }
      cur.align += Math.sign(v) * Math.sign(ret)
      cur.n += 1
      rs.patternStats[id] = cur
    }
  }
  // rival pemenang → distilasi pola rival
  for (const p of scored) {
    if (p.direction !== 'AI_ANALIS') continue
    if (p.ret === null || p.ret === undefined || p.ret <= 0) continue
    await remember('POLA_RIVAL', rivalFingerprint(ctx.regime.regime, p.pick.symbol, p.pick.direction), {
      symbol: p.pick.symbol, direction: p.pick.direction, regime: ctx.regime.regime, n: 1, sumRet: p.ret, hitCount: 1,
      note: p.pick.reason,
    }, ctx.day)
    raw++
  }
  // pelajaran dari kegagalan keyakinan tinggi
  const fail = scored.find(
    (p) => p.direction === 'MICAPROFITA' && p.hit === false && p.pick.confidence >= 72 && p.ret !== null && p.ret !== undefined,
  )
  if (fail) {
    const text = `Keputusan ${fail.pick.direction} ${fail.pick.symbol} (keyakinan ${Math.round(fail.pick.confidence)}%) di rezim ${ctx.regime.regime} gagal (${(fail.ret! * 100).toFixed(1)}%) — ${ctx.day}. Waspadai sinyal ${fail.pick.direction} saat ${ctx.regime.regime}.`
    await remember('PELAJARAN', lessonFingerprint(text), { n: 1, sumRet: 0, hitCount: 0, note: text, regime: ctx.regime.regime }, ctx.day)
    raw++
  }
  if (raw > 0) {
    console.log(`[arena][harvest] ${ctx.day}: ${eps} episode + norm-skip ${skippedNorm} + ret-skip ${skippedRet} → raw ${raw}`)
    await bumpMetaCounter('rawEvents', raw)
  } else {
    console.log(`[arena][harvest] ${ctx.day}: TIDAK ADA yang dipanen (norm-skip=${skippedNorm}, ret-skip=${skippedRet}, total=${scored.length})`)
  }
}

/** V279 — buku cuan untuk komponen E KORTEX. Dibaca dari meta bukuCuan (metrik).
 *  Dipakai HANYA hari hidup — hari lampau null (buku masa depan = kebocoran). */
async function bukuUntukKortex(): Promise<KortexBuku | null> {
  try {
    const raw = await getMeta('bukuCuan')
    if (!raw) return null
    const j = JSON.parse(raw) as { metrik?: KortexBuku }
    return j?.metrik ?? null
  } catch { return null }
}

interface ScoredPick {
  direction: 'MICAPROFITA' | 'AI_ANALIS' | 'MOMENTUM' | 'MEANREV' | 'BNH_BTC' | 'ACAK'
  pick: { symbol: string; direction: 'BUY' | 'SELL'; confidence: number; reason?: string }
  entryClose: number
  exitClose: number | null
  ret: number | null
  hit: boolean | null
  evidence: Record<string, unknown>
}

// ---------------- Buat + adili satu hari ----------------

/** Bangun SEMUA pick (cyborg + semua rival) untuk satu hari. */
/** V274 SLOT-JUJUR + V301 DAFTAR TEMPUR — laporan transparansi slot tempur.
 *  dipindai = pindaian penuh futures · masuk = baris daftar (50) ·
 *  lolos/ditolak guard = pembagian di dalam daftar (tidak ada yang dibuang). */
export interface SlotReport {
  day?: string
  k: number // slot tempur (50 — hukum pemilik V301)
  lahir: number // baris lahir (= masuk)
  dipindai: number | null
  dianalisa: number
  lolos: number
  ditolakN: number
  ditolak: { symbol: string; reason: string }[]
}

/** V301 — susun pick cyborg: lolos guard dulu (rank), ditolak di paling bawah. */
function susunDaftarPicks(picks: ScoredPick[]): ScoredPick[] {
  const kunci = (p: ScoredPick) => {
    const ev = p.evidence as { guard?: string; rank?: number }
    return { g: ev.guard === 'DITOLAK' ? 1 : 0, r: typeof ev.rank === 'number' ? ev.rank : 999 }
  }
  return [...picks].sort((a, b) => {
    const ka = kunci(a), kb = kunci(b)
    return ka.g - kb.g || ka.r - kb.r
  })
}

/** Hitung ulang laporan slot dari pick cyborg yang sudah final (pasca-veto). */
function slotDariPicks(picks: ScoredPick[], stats: DaftarStats): SlotReport {
  const mine = picks.filter((p) => p.direction === 'MICAPROFITA')
  let lolos = 0, ditolak = 0
  const alasan: { symbol: string; reason: string }[] = []
  for (const p of mine) {
    const ev = p.evidence as { guard?: string; guardAlasan?: string | null }
    if (ev.guard === 'DITOLAK') {
      ditolak++
      alasan.push({ symbol: p.pick.symbol, reason: ev.guardAlasan ?? 'guard' })
    } else lolos++
  }
  return {
    k: stats.slot, lahir: mine.length,
    dipindai: stats.dipindai, dianalisa: stats.dianalisa,
    lolos, ditolakN: ditolak,
    ditolak: alasan.slice(0, 12),
  }
}

function buildAllPicks(
  ctx: DayContext,
  rs: RunState,
  aiResult: RivalResult | null,
  vetoSymbols?: Set<string>,
  memory?: MemoryLookup,
  /** V279 KORTEX — buku cuan hari hidup untuk komponen E. HARI LAMPAU WAJIB
   *  null: buku dibangun dari masa depan — membawanya ke hari lampau = kebocoran. */
  buku?: KortexBuku | null,
  /** V301 — qv 24j futures + jumlah pindaian penuh (hanya hari hidup) */
  qvOf?: Map<string, number>,
  dipindai?: number | null,
  /** V301 — VONIS VETO LLM tersimpan → kandidat DITOLAK berlabel, bukan dihapus */
  vetoReport?: Map<string, string>,
): { out: ScoredPick[]; slot: SlotReport; daftarStats: DaftarStats } {
  const out: ScoredPick[] = []
  const entryOf = (sym: string): number => ctx.factors.find((f) => f.symbol === sym)?.close ?? NaN

  const w = weightsFor(rs, ctx.regime.regime)
  const daftar = decideDaftar({
    factors: ctx.factors,
    norm: ctx.norm,
    universeCloses: ctx.closes,
    regime: ctx.regime,
    generation: rs.generation,
    genome: rs.genomeV2,
    weights: w,
    m4h: ctx.m4h,
    memory,
    buku: buku ?? null,
    qvOf,
    dipindai: dipindai ?? null,
    vetoReport,
  }, SLOT_TEMPUR)
  void vetoSymbols // V301: veto kini berupa laporan berlabel (vetoReport), bukan penghapusan
  const slot: SlotReport = {
    k: daftar.stats.slot,
    lahir: daftar.stats.masuk,
    dipindai: daftar.stats.dipindai,
    dianalisa: daftar.stats.dianalisa,
    lolos: daftar.stats.lolos,
    ditolakN: daftar.stats.ditolak,
    ditolak: daftar.rows.filter((r) => r.guard === 'DITOLAK').slice(0, 12).map((r) => ({ symbol: r.symbol, reason: r.guardAlasan ?? 'guard' })),
  }
  for (const r of daftar.rows) {
    const nrm = ctx.norm.get(r.symbol) ?? ({} as Record<FactorId, number>)
    out.push({
      direction: 'MICAPROFITA',
      pick: { symbol: r.symbol, direction: r.direction, confidence: r.confidence },
      entryClose: entryOf(r.symbol),
      exitClose: null, ret: null, hit: null,
      // laporan slot dilampirkan HANYA di peringkat 1 (hemat payload; sumber utama = meta slotHariIni)
      evidence: {
        ...(r.rank === 1 ? { slot } : {}),
        rank: r.rank,
        guard: r.guard,
        guardAlasan: r.guardAlasan,
        raw: {
          mom7: Math.round(r.mom7 * 100) / 100, mom30: Math.round(r.mom30 * 100) / 100,
          rsi: Math.round(r.rsi * 10) / 10, atrPct: Math.round(r.atrPct * 100) / 100,
          volSurge: Math.round(r.volSurge * 100) / 100, distHigh: Math.round(r.distHigh * 10) / 10,
          emaAlign: r.emaAlign, close: r.close, m4h: Math.round(r.m4h * 10) / 10,
          qv: r.qv,
        },
        factors: { ...nrm, m4h: Math.round(r.m4h * 10) / 10 } as unknown as Record<string, number>,
        topReasons: r.topReasons,
        duties: [
          ...r.duties,
          {
            name: 'Slot tempur V301',
            pass: r.guard === 'LOLOS',
            note: r.guard === 'LOLOS'
              ? `peringkat ${r.rank} dari ${daftar.stats.masuk} (lolos guard)`
              : `peringkat ${r.rank} — DITOLAK GUARD: ${r.guardAlasan} (tetap tampil — hukum anti-buang)`,
          },
        ],
        policy: daftar.policy,
        regime: ctx.regime.regime,
        genomeGeneration: rs.generation,
        mem: r.mem,
        ...(r.debat ? { debat: r.debat } : {}),
        ...(r.kortex ? { kortex: r.kortex } : {}),
      } as unknown as Record<string, unknown>,
    })
  }

  if (aiResult) {
    for (const p of aiResult.picks) {
      out.push({
        direction: 'AI_ANALIS',
        pick: { symbol: p.symbol, direction: p.direction, confidence: p.confidence, reason: p.reason },
        entryClose: entryOf(p.symbol),
        exitClose: null, ret: null, hit: null,
        evidence: { reason: p.reason, note: aiResult.note ?? '' },
      })
    }
  }

  for (const p of momentumPick(ctx.factors).picks) {
    out.push({
      direction: 'MOMENTUM',
      pick: p, entryClose: entryOf(p.symbol), exitClose: null, ret: null, hit: null,
      evidence: { reason: p.reason },
    })
  }
  for (const p of meanRevPick(ctx.factors).picks) {
    out.push({
      direction: 'MEANREV',
      pick: p, entryClose: entryOf(p.symbol), exitClose: null, ret: null, hit: null,
      evidence: { reason: p.reason },
    })
  }
  for (const p of bnhPick('BTCUSDT').picks) {
    out.push({
      direction: 'BNH_BTC',
      pick: p, entryClose: entryOf(p.symbol), exitClose: null, ret: null, hit: null,
      evidence: { reason: p.reason },
    })
  }
  for (const p of randomPick(ctx.factors, ctx.day).picks) {
    out.push({
      direction: 'ACAK',
      pick: p, entryClose: entryOf(p.symbol), exitClose: null, ret: null, hit: null,
      evidence: { reason: p.reason },
    })
  }
  return { out, slot, daftarStats: daftar.stats }
}

async function storeDay(
  ctx: DayContext,
  picks: ScoredPick[],
  klines: Map<string, Candle[]>,
  btcAll: Candle[],
  scoreable: boolean,
): Promise<{ dayId: string }> {
  const btcBefore = candlesBefore(btcAll, ctx.day)
  const btcEntry = btcBefore.length ? btcBefore[btcBefore.length - 1].close : NaN

  const day = await db.battleDay.upsert({
    where: { day: ctx.day },
    update: { regime: ctx.regime.regime },
    create: { day: ctx.day, regime: ctx.regime.regime, status: 'PENDING', btcEntry },
  })

  for (const p of picks) {
    if (!Number.isFinite(p.entryClose)) continue
    const key = { battleDayId_competitor_symbol: { battleDayId: day.id, competitor: p.direction, symbol: p.pick.symbol } }
    const existing = await db.pick.findUnique({ where: key, select: { id: true, evidence: true } })
    if (existing) {
      // V273 SASARAN-PENUH — pulihkan HANYA bila bukti tersimpan belum punya
      // rencana pra-registrasi sementara yang baru punya (heal satu arah;
      // bukti yang sudah terkunci TIDAK pernah digeser = jujur pra-registrasi).
      if (!scoreable) {
        const cur = safeJson(existing.evidence) as { rencana?: unknown; slot?: unknown } | null
        const baru = p.evidence as { rencana?: unknown; slot?: unknown } | null
        if (cur && cur.rencana === undefined && baru && baru.rencana !== undefined) {
          await db.pick.update({ where: { id: existing.id }, data: { evidence: JSON.stringify(p.evidence) } })
        } else if (cur && cur.slot === undefined && baru && baru.slot !== undefined) {
          // V274 SLOT-JUJUR — heal satu-arah untuk laporan slot: ditambahkan,
          // bukan menggeser rencana yang sudah terkunci.
          await db.pick.update({
            where: { id: existing.id },
            data: { evidence: JSON.stringify({ ...cur, slot: baru.slot }) },
          })
        }
      }
      continue
    }
    await db.pick.create({
      data: {
        battleDayId: day.id,
        competitor: p.direction,
        symbol: p.pick.symbol,
        direction: p.pick.direction,
        confidence: p.pick.confidence,
        entryClose: p.entryClose,
        evidence: JSON.stringify(p.evidence),
      },
    })
  }

  if (scoreable) await scoreDay(ctx.day, klines, btcAll)
  return { dayId: day.id }
}

async function scoreDay(dayStr: string, klines: Map<string, Candle[]>, btcAll: Candle[]) {
  const day = await db.battleDay.findUnique({ where: { day: dayStr }, include: { picks: true } })
  if (!day) return
  const btcExit = candleForDay(btcAll, dayStr)?.close ?? null

  // nilai SEMUA pick yang belum terskor — walau hari sudah berstatus SCORED
  // (pick rival yang di-backfill belakangan tetap mendapat vonis)
  for (const p of day.picks.filter((x) => x.exitClose === null)) {
    const exit = candleForDay(klines.get(p.symbol) ?? [], dayStr)?.close ?? null
    if (exit === null || !p.entryClose) continue
    const dirSign = p.direction === 'BUY' ? 1 : -1
    const ret = ((exit - p.entryClose) / p.entryClose) * dirSign
    await db.pick.update({
      where: { id: p.id },
      data: { exitClose: exit, ret, hit: ret > 0 },
    })
  }
  if (day.status !== 'SCORED') {
    await db.battleDay.update({
      where: { id: day.id },
      data: { status: 'SCORED', scoredAt: new Date(), btcExit: btcExit ?? undefined },
    })
  }
}

// ---------------- Evolusi pasca-vonis ----------------

async function evolveAfterDay(
  ctx: DayContext,
  scored: ScoredPick[],
  rs: RunState,
  klines: Map<string, Candle[]>,
  btcAll: Candle[],
) {
  const episodes = scored
    .filter((p) => p.direction === 'MICAPROFITA' && p.ret !== null && p.ret !== undefined)
    .map((p) => ({
      factors: ((p.evidence as { factors?: Record<string, number> })?.factors ?? {}) as Record<string, number>,
      ret: p.ret as number,
    }))

  const eta = rs.upgradeEtaUntil && rs.upgradeEtaUntil > ctx.day ? 0.07 : 0.04
  const regime = ctx.regime.regime
  const w = weightsFor(rs, regime)
  const { weights: nw, delta } = mutate(w, episodes, eta)
  rs.weights[regime] = nw
  rs.cumDelta += delta

  let generation = rs.generation
  if (rs.cumDelta >= 0.8) {
    generation += 1
    rs.cumDelta = 0
  }
  rs.generation = generation

  const myHits = scored.filter((p) => p.direction === 'MICAPROFITA' && p.hit !== null).map((p) => p.hit as boolean)
  const fitness = fitnessFromResults(myHits)

  // --- V250 SADAR-DIRI: Brier keyakinan dari vonis matang hari-D ---
  // Brier = (p − y)², p = keyakinan/100, y = 1 hit / 0 salah; jendela 30 pick.
  // Brier > 0.25 (jendela ≥ 10) = keyakinan lebih bombastis daripada medan
  // → peringatan + TINDAKAN NYATA: keyakinan hari hidup dipangkas 10 poin (2 hari).
  const mineMature = scored.filter((p) => p.direction === 'MICAPROFITA' && p.ret !== null && p.ret !== undefined)
  if (mineMature.length > 0) {
    let st: { n: number; jumlah: number; jendela: { day: string; conf: number; hit: number }[] }
    try { st = JSON.parse((await getMeta('brierState')) ?? '') } catch { st = { n: 0, jumlah: 0, jendela: [] } }
    for (const p of mineMature) {
      st.jendela.push({ day: ctx.day, conf: Math.min(100, Math.max(0, p.pick.confidence)), hit: (p.ret as number) > 0 ? 1 : 0 })
    }
    st.jendela = st.jendela.slice(-30)
    st.n = st.jendela.length
    st.jumlah = st.jendela.reduce((s, e) => s + (e.conf / 100 - e.hit) ** 2, 0)
    await setMeta('brierState', JSON.stringify(st))
    const brier = st.n > 0 ? st.jumlah / st.n : null
    const trimSekarang = (await getMeta('sadardiriTrimUntil')) ?? ''
    if (brier !== null && st.n >= 10 && brier > 0.25 && trimSekarang <= ctx.day) {
      const smpai = addDays(ctx.day, 2)
      await setMeta('sadardiriTrimUntil', smpai)
      await db.arenaEvent.create({
        data: { day: ctx.day, kind: 'SADARDIRI', text: `SADAR-DIRI: Brier keyakinan ${brier.toFixed(3)} > 0.25 pada ${st.n} pick terakhir — keyakinan lebih bombastis daripada medan. TINDAKAN OTOMATIS: keyakinan pick hari hidup dipangkas 10 poin s/d ${smpai}.` },
      })
    }
  }

  await db.genomeLog.create({
    data: {
      day: ctx.day,
      generation,
      kind: 'MUTATION',
      note: `Δ bobot ${delta.toFixed(3)} · eta ${eta} · ${episodes.length} episode`,
      fitness: fitness ?? undefined,
      payload: JSON.stringify(nw),
    },
  })

  // --- MUTASI KNOB STRUKTUR (performa 3 hari terakhir, tanpa kebocoran) ---
  const last3 = await db.battleDay.findMany({
    where: { status: 'SCORED', day: { lte: ctx.day } },
    orderBy: { day: 'desc' },
    take: 3,
  })
  if (last3.length >= 3) {
    const dayIds3 = last3.map((d) => d.id)
    const m3 = await db.pick.findMany({ where: { competitor: 'MICAPROFITA', battleDayId: { in: dayIds3 }, ret: { not: null } } })
    let ret3 = 0
    for (const p of m3) ret3 += p.ret ?? 0
    const dayIds6 = (await db.battleDay.findMany({
      where: { status: 'SCORED', day: { lte: ctx.day } },
      orderBy: { day: 'desc' }, take: 6,
    })).map((d) => d.id)
    const m6 = await db.pick.findMany({ where: { competitor: 'MICAPROFITA', battleDayId: { in: dayIds6 }, hit: { not: null } } })
    const hit6 = m6.length ? m6.filter((p) => p.hit).length / m6.length : 1
    const { genome: g2next, notes } = mutateKnobs(rs.genomeV2, ret3, hit6, ctx.day)
    if (notes.length > 0) {
      rs.genomeV2 = g2next
      await db.genomeLog.create({
        data: {
          day: ctx.day, generation, kind: 'KNOB',
          note: `Knob: ${notes.join('; ')} → K=${g2next.kBase} paraK=${g2next.paraK} brK2=${g2next.breadthK2} brK1=${g2next.breadthK1} ATR≤${g2next.atrCap.toFixed(1)}`,
          fitness: fitness ?? undefined,
          payload: JSON.stringify(g2next),
        },
      })
    }
  }

  // --- cek REVOLUSI: 6 hari terakhir memburuk ---
  const recentDays = await db.battleDay.findMany({
    where: { status: 'SCORED', day: { lte: ctx.day } },
    orderBy: { day: 'desc' },
    take: 6,
  })
  if (recentDays.length >= 6 && rs.lastRevDay < recentDays[recentDays.length - 1].day) {
    let hits = 0, tot = 0
    const dayIds = recentDays.map((d) => d.id)
    const myPicks = await db.pick.findMany({
      where: { competitor: 'MICAPROFITA', battleDayId: { in: dayIds }, hit: { not: null } },
    })
    for (const p of myPicks) { tot++; if (p.hit) hits++ }
    const hitRate = tot > 0 ? hits / tot : 1
    if (hitRate < 0.42) {
      const { weights: rw, genome: rg, note } = revolutionize(rs.patternStats as Record<string, PatternStat> | null)
      for (const r of ['TREND_NAIK', 'TREND_TURUN', 'SIDEWAYS', 'JATUH']) rs.weights[r] = { ...rw }
      rs.genomeV2 = rg
      rs.lastRevDay = ctx.day
      rs.cumDelta = 0
      await db.arenaEvent.create({
        data: { day: ctx.day, kind: 'REVOLUSI', text: `REVOLUSI DIRI: hit rate 6 hari ${Math.round(hitRate * 100)}% < 42%. Genome direkonstruksi — ${note}.` },
      })
      await db.genomeLog.create({
        data: { day: ctx.day, generation, kind: 'REVOLUSI', note, fitness: hitRate, payload: JSON.stringify({ weights: rw, genome: rg }) },
      })
    }
  }

  // --- cek UPGRADE: tertinggal dari AI ANALIS 7 hari ---
  const last7 = await db.battleDay.findMany({
    where: { status: 'SCORED', day: { lte: ctx.day } },
    orderBy: { day: 'desc' },
    take: 7,
  })
  if (last7.length >= 5 && rs.lastUpgDay < last7[last7.length - 1].day) {
    const dayIds = last7.map((d) => d.id)
    const picksWin = await db.pick.findMany({
      where: { competitor: { in: ['MICAPROFITA', 'AI_ANALIS'] }, battleDayId: { in: dayIds }, ret: { not: null } },
    })
    const sum = (comp: string) => picksWin.filter((p) => p.competitor === comp).reduce((s, p) => s + (p.ret ?? 0), 0)
    const mySum = sum('MICAPROFITA'), aiSum = sum('AI_ANALIS')
    if (aiSum - mySum > 0.03) {
      rs.lastUpgDay = ctx.day
      rs.upgradeEtaUntil = addDays(ctx.day, 4)
      const rivalWins = picksWin.filter((p) => p.competitor === 'AI_ANALIS' && (p.ret ?? 0) > 0)
      await db.arenaEvent.create({
        data: {
          day: ctx.day,
          kind: 'UPGRADE',
          text: `MODE UPGRADE: tertinggal ${((aiSum - mySum) * 100).toFixed(1)} poin dari AI ANALIS (7 hari). Learning rate diperlebar → ${addDays(ctx.day, 4)}, ${rivalWins.length} pola pemenang rival didistilasi ke ingatan.`,
        },
      })
    }
  }
}

// ---------------- Siklus utama ----------------

/** V250 WARISAN MASUK ARENA — kaya pick cyborg hari hidup dengan 7 mesin
 *  organ besar + tangga harga pra-registrasi + guard kejut-pump + tindakan
 *  sadar-diri (Brier). Gagal mesin mana pun TIDAK menggagalkan pick —
 *  kejujuran: dicatat sebagai gagal, pick kuant tetap berdiri. */
async function kayaWarisanHariHidup(
  picks: ScoredPick[],
  today: string,
  ctx: DayContext,
  trimUntil: string | null,
  klines?: Map<string, Candle[]>,
) {
  const mine = picks.filter((p) => p.direction === 'MICAPROFITA')
  if (mine.length === 0) return
  const faktorIdx = new Map(ctx.factors.map((f, i) => [f.symbol, i]))
  const rep = await perkayaWarisan(
    mine.map((p) => ({
      symbol: p.pick.symbol, direction: p.pick.direction, confidence: p.pick.confidence,
      entryClose: p.entryClose, evidence: p.evidence,
    })),
    today,
    {
      // V301 — ATR dari faktor; fallback hitung dari candle utk koin di luar ctx
      atrPctOf: (sym) => {
        const f = ctx.factors.find((x) => x.symbol === sym)
        if (f) return f.atrPct
        const ks = klines?.get(sym)
        if (ks && ks.length >= 20) return atrPct(candlesBefore(ks, today))
        return undefined
      },
      likuiditasRankOf: (sym) => faktorIdx.get(sym) ?? ctx.factors.length,
      universeSize: Math.max(ctx.factors.length, 1),
      breadthPct: ctx.regime.breadth,
      regime: ctx.regime.regime,
    },
  )
  for (const p of mine) {
    const trimmed = (p.evidence as { warisan?: { pangkas?: string } }).warisan?.pangkas
    if (trimmed) p.pick.confidence = Math.max(35, p.pick.confidence - 15)
  }
  // tindakan sadar-diri: Brier buruk → keyakinan hari hidup dipangkas 10 poin
  if (trimUntil && today <= trimUntil) {
    for (const p of mine) {
      p.pick.confidence = Math.max(35, p.pick.confidence - 10)
      const ev = p.evidence as Record<string, unknown>
      ev.sadardiri = 'keyakinan dipangkas 10 poin — tindakan otomatis Brier > 0.25 (otak sadar dirinya terlalu bombastis)'
    }
  }
  // V276 MESIN-CUAN — ekspektansi rencana negatif → DISIPLIN CUAN: pangkas 5 poin.
  // Buku besar bicara: keteledoran yang diukur wajib mengubah ukuran, bukan dalih.
  try {
    const cuanUntil = await getMeta('cuanDisiplinUntil')
    if (cuanUntil && today <= cuanUntil) {
      for (const p of mine) {
        p.pick.confidence = Math.max(35, p.pick.confidence - 5)
        const ev = p.evidence as Record<string, unknown>
        ev.disiplinCuan = `keyakinan dipangkas 5 poin — DISIPLIN CUAN s/d ${cuanUntil} (ekspektansi rencana negatif di buku cuan)`
      }
    }
  } catch { /* disiplin cuan non-vital */ }
  console.log(`[arena][warisan] ${today}: diperkaya ${rep.diperkaya.join(',') || '-'} · kejut-pump ${rep.kejutPump.map((x) => x.symbol).join(',') || '-'} · gagal ${rep.gagal.map((x) => x.symbol).join(',') || '-'}`)
}

export async function ensureArena(): Promise<{ started: boolean; reason?: string }> {
  if (g.__arenaRun) return { started: false, reason: 'sudah berjalan' }
  const lastEnsure = parseInt((await getMeta('lastEnsureAt')) ?? '0', 10) || 0
  const status = await getMeta('bootstrapStatus') ?? 'belum'
  if (Date.now() - lastEnsure < MIN_ENSURE_INTERVAL && status === 'selesai') {
    return { started: false, reason: 'baru saja berjalan' }
  }
  // V300-ANTISTUCK (2) — run tertanda 'berjalan' tapi jantung diam melewati
  // batas (proses restart / promise gantung tanpa timeout) → pulihkan status
  // agar denyut berikutnya BOLEH jalan lagi, tanpa menunggu manusia.
  if (status === 'berjalan') {
    const hb = parseInt((await getMeta('runHeartbeat')) ?? '0', 10) || 0
    const lastProgress = Math.max(hb, lastEnsure)
    if (lastProgress > 0 && Date.now() - lastProgress > MAX_RUN_MS) {
      await setMeta('bootstrapStatus', 'error')
      await setMeta('bootstrapError', 'run sebelumnya terputus (melewati batas waktu) — dipulihkan otomatis')
    }
  }
  g.__arenaRun = runArenaWatchdog().catch(async (e) => {
    console.error('[arena] run error:', e)
    await setMeta('bootstrapStatus', 'error')
    await setMeta('bootstrapError', String(e).slice(0, 300))
  }).finally(() => { g.__arenaRun = undefined })
  return { started: true }
}

/** V300-ANTISTUCK (1) — runArena dibungkus batas waktu keras. Bila run
 *  menggantung (jaring/LLM/DB diam tanpa jawaban), watchdog menandai error
 *  dan MELEPAS guard sehingga denyut berikutnya mengulang dari titik aman.
 *  Semua langkah runArena idempoten (upsert + done-set) → aman diulang. */
async function runArenaWatchdog() {
  let t: ReturnType<typeof setTimeout> | null = null
  try {
    await Promise.race([
      runArena(),
      new Promise<never>((_, rej) => {
        t = setTimeout(() => rej(new Error(`run melewati batas ${Math.round(MAX_RUN_MS / 60000)} menit — dihentikan & diulang otomatis`)), MAX_RUN_MS)
      }),
    ])
  } finally {
    if (t) clearTimeout(t)
  }
}

async function runArena() {
  await setMeta('bootstrapStatus', 'berjalan')
  await setMeta('bootstrapError', '')
  await setMeta('runHeartbeat', String(Date.now()))
  const jantung = async () => { try { await setMeta('runHeartbeat', String(Date.now())) } catch { /* jantung non-vital */ } }
  const t0 = Date.now()

  // 1. data pasar real — pool LEBAR (top-120 spot ∪ top futures ∪ simbol yang
  // pernah di-pick). V301: pindaian FUTURES PENUH dihitung (dipindai) + qv 24j
  // futures dipakai sebagai data likuiditas daftar tempur.
  const universe = await getUniverse()
  const poolSet = new Set(universe.slice(0, POOL_SIZE).map((u) => u.symbol))
  const everPicked = await db.pick.findMany({ select: { symbol: true }, distinct: ['symbol'] })
  for (const p of everPicked) poolSet.add(p.symbol)
  poolSet.add('BTCUSDT')
  let dipindai: number | null = null
  const qvOf = new Map<string, number>()
  try {
    const fut = await getUniverseFutures()
    dipindai = fut.length
    for (const u of fut.slice(0, DAFTAR_POOL + 30)) {
      if (u.quoteVolume >= 3_000_000) poolSet.add(u.symbol)
      qvOf.set(u.symbol, u.quoteVolume)
    }
  } catch (e) {
    console.warn('[arena] pindaian futures gagal (dipindai tampil “—”):', e)
  }
  for (const u of universe) if (!qvOf.has(u.symbol)) qvOf.set(u.symbol, u.quoteVolume)
  const symbols = [...poolSet]
  const klines = await getKlinesBulk(symbols)
  // V301 — simbol futures yang tak ada di spot tetap diadili: klines futures
  const tanpaSpot = symbols.filter((s) => !(klines.get(s)?.length))
  if (tanpaSpot.length > 0) {
    try {
      const futK = await getKlinesFuturesBulk(tanpaSpot)
      for (const [s, ks] of futK) if (ks.length) klines.set(s, ks)
      if (futK.size > 0) console.log(`[arena] klines futures mengisi ${futK.size} simbol tanpa spot`)
    } catch (e) { console.warn('[arena] klines futures gagal:', e) }
  }
  const btcAll = klines.get('BTCUSDT') ?? []
  if (btcAll.length < 60) throw new Error('Data BTC tidak cukup')
  if (klines.size < 20) throw new Error(`Data klines tidak lengkap: ${klines.size}/${symbols.length} simbol — run diulang nanti`)
  // UPGRADE V3: radar intraday 4 jam untuk seluruh pool (cache 15 menit)
  const klines4h = await getKlines4hBulk(symbols)

  const liveCandle = btcAll[btcAll.length - 1]
  const today = dayOfTs(liveCandle.openTime) // hari pertarungan berjalan (candle hidup)
  await setMeta('arenaToday', today)
  // V300-ANTISTUCK — deteksi DATA BASI: candle hidup selalu ada utk hari ini;
  // kalau candle terakhir LEBIH TUAA dari hari sistem → sumber data sedang
  // menyajikan data basi (cache/mirror). Dicatat JUJUR sebagai lag, bukan
  // dipaksakan — vonis harus tetap dari candle nyata.
  const sysToday0 = utcTodayStr()
  const lag0 = lagHari(today, sysToday0)
  await setMeta('arenaDataLag', String(Math.max(0, lag0)))
  if (lag0 > 0) console.warn(`[arena][staleness] candle terakhir ${today} tertinggal ${lag0} hari dari hari sistem ${sysToday0} — data basi terdeteksi`)

  // hari yang bisa diadili = candle sudah tutup (openTime < hari ini)
  const allScoreable: string[] = btcAll
    .filter((c) => c.openTime < liveCandle.openTime)
    .map((c) => dayOfTs(c.openTime))
    .slice(-BACKFILL_DAYS)

  // 2. hari yang belum teradili
  const existing = await db.battleDay.findMany({ select: { id: true, day: true, status: true } })
  const done = new Set(existing.filter((d) => d.status === 'SCORED').map((d) => d.day))
  const pendingToday = existing.find((d) => d.day === today)
  const todo = allScoreable.filter((d) => !done.has(d))

  const rs = await loadRunState()

  const total = todo.length
  if (total > 0 || !pendingToday) {
    const already = await db.arenaEvent.count({ where: { kind: 'BOOTSTRAP' } })
    if (already === 0) {
      await db.arenaEvent.create({
        data: { day: today, kind: 'BOOTSTRAP', text: `Arena dibangkitkan (era PREDATOR V2): pool ${symbols.length} simbol, universe dinamis 40/hari, ${allScoreable.length} hari sejarah diadili, genome knob struktural aktif.` },
      })
      await db.arenaEvent.create({
        data: { day: today, kind: 'UPGRADE', text: 'UPGRADE PREDATOR V2 (oleh pengembang, hasil Ujian #1-#5): universe dinamis per hari + antrian kepemimpinan momentum + konsentrasi adaptif (breadth guard & mode parabolik) + knob struktur evolusi. Baseline lama +30.5% → target lab +146.6%.' },
      })
    }
    // UPGRADE V4 — catat sekali
    const v4 = await db.arenaEvent.count({ where: { text: { contains: 'UPGRADE V4 SADAR-INGATAN' } } })
    if (v4 === 0) {
      await db.arenaEvent.create({
        data: { day: today, kind: 'UPGRADE', text: 'UPGRADE V4 SADAR-INGATAN (oleh pengembang, hasil Ujian #8): memori berjenjang SIMBOL→BUCKET3→REZIM kini DIBACA saat keputusan (sebelumnya organ mati) — tie-break antrian, penyetel keyakinan, MEMVETO surgikal (lab: +212.9% → +233.7%). Sumber informasi baru: Fear & Greed, market cap global, dominasi BTC, funding (chip info), sparkline 1 jam di NADIR.' },
      })
    }
  }

  // 3. pra-hitung pick AI ANALIS untuk semua hari (paralel terbatas)
  const ctxCache = new Map<string, DayContext>()
  const aiResults = new Map<string, RivalResult>()
  const allDaysNeeded = [...todo, ...(pendingToday ? [] : [today])]
  for (const d of allDaysNeeded) ctxCache.set(d, await buildDayContext(d, klines, btcAll, klines4h))

  const aiJobs = allDaysNeeded.map((d) => ({ d, isToday: d === today }))
  const CONC = 4
  for (let i = 0; i < aiJobs.length; i += CONC) {
    await jantung()
    const batch = aiJobs.slice(i, i + CONC)
    await Promise.all(batch.map(async ({ d, isToday }) => {
      const ctx = ctxCache.get(d)!
      let res = await aiAnalisPick(snapshotCoins(ctx), ctx.regime, d, isToday)
      if (res.picks.length === 0) res = await aiAnalisPick(snapshotCoins(ctx), ctx.regime, d, false) // 1x retry
      aiResults.set(d, res)
    }))
    const doneN = Math.min(i + CONC, aiJobs.length)
    await setMeta('bootstrapProgress', String(Math.round((doneN / Math.max(1, aiJobs.length)) * 40))) // 0-40% = pra-hitung LLM
  }

  // 4. adili hari demi hari (kronologis, tanpa kebocoran)
  let processed = 0
  for (const d of todo) {
    await jantung()
    const ctx = ctxCache.get(d) ?? (await buildDayContext(d, klines, btcAll))
    // UPGRADE V4 — ingatan berjenjang DIMUAT SETIAP ITERASI: pick hari-D hanya
    // boleh melihat memori dari hari-hari SEBELUM D (harvest terjadi setelahnya)
    const mem = await loadMemoryLookup()
    const { out: picks } = buildAllPicks(ctx, rs, aiResults.get(d) ?? null, undefined, mem)
    await storeDay(ctx, picks, klines, btcAll, true)

    // vonis → evolusi → memori
    const dayRow = await db.battleDay.findUnique({ where: { day: d }, include: { picks: true } })
    const scoredPicks: ScoredPick[] = (dayRow?.picks ?? []).map((p) => ({
      direction: p.competitor as ScoredPick['direction'],
      pick: { symbol: p.symbol, direction: p.direction as 'BUY' | 'SELL', confidence: p.confidence, reason: undefined },
      entryClose: p.entryClose,
      exitClose: p.exitClose,
      ret: p.ret,
      hit: p.hit,
      evidence: safeJson(p.evidence),
    }))
    await harvestDay(ctx, scoredPicks, rs)
    await evolveAfterDay(ctx, scoredPicks, rs, klines, btcAll)
    await persistGenome(rs)

    processed++
    await setMeta('bootstrapProgress', String(40 + Math.round((processed / total) * 58)))
  }

  // 5. pick hari berjalan (PENDING — dinilai besok)
  if (!pendingToday) {
    // hari hidup: cutoff mom4h = buka candle 4h yang sedang berjalan (candle hidup tak boleh ikut keputusan)
    const liveCutoff = Math.floor(Date.now() / (4 * 3600_000)) * 4 * 3600_000
    const ctx = ctxCache.get(today) ?? (await buildDayContext(today, klines, btcAll, klines4h, liveCutoff))
    // UPGRADE V4 — otak kini SADAR-INGATAN: memori berjenjang dibaca saat keputusan
    const mem = await loadMemoryLookup()
    // V274 SLOT-JUJUR — laporan slot hari hidup dibawa sejak lahir; bila vonis
    // memveto & pick dibangun ulang, laporan PASCA-VETO yang jadi kebenaran.
    // V279 KORTEX — buku cuan hidup ikut menilai pick (komponen E).
    const bukuKx = await bukuUntukKortex()
    const built = buildAllPicks(ctx, rs, aiResults.get(today) ?? null, undefined, mem, bukuKx, qvOf, dipindai)
    let picks = susunDaftarPicks(built.out)
    let slotLive: SlotReport = built.slot

    // UPGRADE V4 — info posisi massa (funding) ditempel ke bukti pick cyborg.
    // Jujur: ini CHIP INFORMASI, bukan filter — lab Ujian #2-#4 menolak funding
    // sebagai filter (menggerus profit); kita menyajikannya transparan.
    try {
      const fundMap = await getFundingRates(picks.filter((p) => p.direction === 'MICAPROFITA').map((p) => p.pick.symbol))
      for (const p of picks) {
        if (p.direction !== 'MICAPROFITA') continue
        const f = fundMap.get(p.pick.symbol)
        if (f) (p.evidence as Record<string, unknown>).funding = { rate: f.rate, pct: Math.round(f.rate * 10000) / 100, at: new Date().toISOString() }
      }
    } catch { /* info opsional */ }

    // --- V250 WARISAN MASUK ARENA: 7 mesin organ besar + tangga harga pra-registrasi ---
    try {
      await kayaWarisanHariHidup(picks, today, ctx, await getMeta('sadardiriTrimUntil'), klines)
      for (const p of picks.filter((x) => x.direction === 'MICAPROFITA')) {
        const w = (p.evidence as { warisan?: { kejutPump?: boolean; ketKejut?: string } }).warisan
        if (w?.kejutPump) {
          await db.arenaEvent.create({
            data: { day: today, kind: 'GUARD', text: `GUARD WARISAN kejut-pump: ${p.pick.symbol} keyakinan dipangkas 15 — ${w.ketKejut}` },
          })
        }
      }
    } catch (e) { console.error('[arena] warisan gagal (pick kuant berdiri):', e) }

    // --- VONIS LLM (UPGRADE V3): berita terbaru → KONFIRMASI/PERINGATAN/VETO.
    // V301: alokasi jujur — vonis berita hanya untuk 6 sasaran teratas
    // (pita berita per koin mahal; 50 sasaran tak mungkin semua diveronis).
    // VETO kini MENURUNKAN peringkat (guard='DITOLAK' berlabel) — tidak
    // pernah dibuang (hukum anti-buang V301), dan tetap dinilai realita.
    const mine = picks.filter((p) => p.direction === 'MICAPROFITA')
    const mineVonis = mine.filter((p) => (p.evidence as { guard?: string }).guard !== 'DITOLAK').slice(0, 6)
    if (mineVonis.length > 0) {
      try {
        const vonis = await vonisLivePicks(
          mineVonis.map((p) => ({ symbol: p.pick.symbol, confidence: p.pick.confidence, topReasons: ((p.evidence.topReasons ?? []) as string[]) })),
          ctx.regime.note,
        )
        // wrapper datar agar applyVonis bisa memutasi evidence (shared ref) + keyakinan
        const flat = mineVonis.map((p) => ({ symbol: p.pick.symbol, confidence: p.pick.confidence, evidence: p.evidence, ref: p }))
        const res = applyVonis(flat, vonis)
        for (const f of flat) f.ref.pick.confidence = f.confidence
        if (res.vetoed.length > 0) {
          for (const v of res.vetoed) {
            const target = flat.find((x) => x.symbol === v.symbol)
            if (target) {
              const ev = target.evidence as Record<string, unknown>
              ev.guard = 'DITOLAK'
              ev.guardAlasan = `VONIS VETO LLM: ${v.note}`
            }
            await db.arenaEvent.create({
              data: { day: today, kind: 'VONIS', text: `VONIS VETO: ${v.symbol} diturunkan ke peringkat paling bawah (tetap tampil & dinilai — hukum V301 anti-buang) — ${v.note}` },
            })
          }
          picks = susunDaftarPicks(picks)
          slotLive = slotDariPicks(picks, built.daftarStats)
        }
        for (const w of res.warned) {
          await db.arenaEvent.create({
            data: { day: today, kind: 'VONIS', text: `VONIS PERINGATAN: ${w.symbol} dipertahankan dengan keyakinan dipangkas — ${w.note}` },
          })
        }
      } catch (e) {
        console.error('[arena] vonis gagal (pick kuant berdiri):', e)
      }
    }

    // --- V273 SASARAN-PENUH: pick pengganti pasca-veto WAJIB punya rencana ---
    //     Hukum pra-registrasi: tak ada sinyal lahir tanpa rencana keluar.
    //     Pick hasil rebuild (line buildAllPicks di atas) lahir polos tanpa
    //     warisan/rencana — dilengkapi di sini, HANYA yang belum punya (yang
    //     sudah terkunci tidak disentuh lagi = tidak ada trim ganda).
    try {
      const kurang = picks.filter(
        (p) => p.direction === 'MICAPROFITA' && (p.evidence as { rencana?: unknown }).rencana === undefined,
      )
      if (kurang.length > 0) {
        await kayaWarisanHariHidup(kurang, today, ctx, await getMeta('sadardiriTrimUntil'), klines)
        console.log(`[arena][warisan-v273] rencana dilengkapi pasca-veto: ${kurang.map((p) => p.pick.symbol).join(',')}`)
      }
    } catch (e) { console.error('[arena] warisan ulang pasca-veto gagal (pick kuant berdiri):', e) }

    // --- V274 SLOT-JUJUR — publikasi laporan slot hari hidup. V301: ringkasan
    //     tahap resmi — dipindai · masuk 50 · lolos guard · ditolak guard.
    try {
      await setMeta('slotHariIni', JSON.stringify({ day: today, ...slotLive }))
    } catch { /* laporan slot non-vital — tak boleh mematikan denyut */ }

    await storeDay(ctx, susunDaftarPicks(picks), klines, btcAll, false)
  }

  // 5b. lengkapi hari teradili yang pick AI ANALIS-nya bolong (kegagalan LLM historis)
  const scoredRows = await db.battleDay.findMany({ where: { status: 'SCORED' }, orderBy: { day: 'asc' } })
  for (const row of scoredRows) {
    const hasAi = await db.pick.count({ where: { battleDayId: row.id, competitor: 'AI_ANALIS' } })
    if (hasAi > 0) continue
    const ctx = ctxCache.get(row.day) ?? (await buildDayContext(row.day, klines, btcAll))
    let res = aiResults.get(row.day)
    if (!res || res.picks.length === 0) {
      res = await aiAnalisPick(snapshotCoins(ctx), ctx.regime, row.day, false)
      if (res.picks.length === 0) res = await aiAnalisPick(snapshotCoins(ctx), ctx.regime, row.day, false)
    }
    if (!res || res.picks.length === 0) continue
    const entryOf2 = (sym: string): number => ctx.factors.find((f) => f.symbol === sym)?.close ?? NaN
    for (const p of res.picks) {
      const entry = entryOf2(p.symbol)
      if (!Number.isFinite(entry)) continue
      await db.pick.upsert({
        where: { battleDayId_competitor_symbol: { battleDayId: row.id, competitor: 'AI_ANALIS', symbol: p.symbol } },
        update: {},
        create: {
          battleDayId: row.id, competitor: 'AI_ANALIS', symbol: p.symbol, direction: p.direction,
          confidence: p.confidence, entryClose: entry, evidence: JSON.stringify({ reason: p.reason, note: res!.note ?? '' }),
        },
      })
    }
    await scoreDay(row.day, klines, btcAll)
  }

  // 5b+. pastikan TIDAK ada pick tertinggal tanpa vonis (idempoten — hanya exitClose null yang diproses)
  for (const row of scoredRows) {
    await scoreDay(row.day, klines, btcAll)
  }

  // 5c. penyembuhan diri: hari teradili yang ingatannya belum terpanen → panen ulang
  //     (remember() idempoten: merge bila sudah ada, jadi aman diulang)
  for (const row of scoredRows) {
    const harvested = await db.memoryEpisode.count({
      where: { kind: 'EPISODE', OR: [{ firstDay: row.day }, { lastDay: row.day }] },
    })
    if (harvested > 0) continue
    console.log(`[arena][heal] memanen ulang ingatan ${row.day}`)
    const ctx = ctxCache.get(row.day) ?? (await buildDayContext(row.day, klines, btcAll))
    const dayRow = await db.battleDay.findUnique({ where: { day: row.day }, include: { picks: true } })
    if (!dayRow) continue
    const scoredPicks: ScoredPick[] = dayRow.picks.map((p) => ({
      direction: p.competitor as ScoredPick['direction'],
      pick: { symbol: p.symbol, direction: p.direction as 'BUY' | 'SELL', confidence: p.confidence, reason: undefined },
      entryClose: p.entryClose,
      exitClose: p.exitClose,
      ret: p.ret,
      hit: p.hit,
      evidence: safeJson(p.evidence),
    }))
    await harvestDay(ctx, scoredPicks, rs)
    await persistGenome(rs)
  }

  // 5d. hari berjalan tanpa pick AI ANALIS (gagal LLM sebelumnya) → coba lagi
  if (pendingToday) {
    const hasAi = await db.pick.count({ where: { battleDayId: pendingToday.id, competitor: 'AI_ANALIS' } })
    if (hasAi === 0) {
      const ctx = ctxCache.get(today) ?? (await buildDayContext(today, klines, btcAll))
      const res = await aiAnalisPick(snapshotCoins(ctx), ctx.regime, today, true)
      if (res.picks.length > 0) {
        const entryOf3 = (sym: string): number => ctx.factors.find((f) => f.symbol === sym)?.close ?? NaN
        for (const p of res.picks) {
          const entry = entryOf3(p.symbol)
          if (!Number.isFinite(entry)) continue
          await db.pick.upsert({
            where: { battleDayId_competitor_symbol: { battleDayId: pendingToday.id, competitor: 'AI_ANALIS', symbol: p.symbol } },
            update: {},
            create: {
              battleDayId: pendingToday.id, competitor: 'AI_ANALIS', symbol: p.symbol, direction: p.direction,
              confidence: p.confidence, entryClose: entry, evidence: JSON.stringify({ reason: p.reason, note: res.note ?? '' }),
            },
          })
        }
      }
    }
  }

  // 5d+. UPGRADE V3 — penyembuhan: pick hari hidup yang belum diveronis
  //      (dibuat sebelum upgrade) → vonis sekarang, bukti ditempel ke evidence.
  if (pendingToday) {
    const myPicks = await db.pick.findMany({ where: { battleDayId: pendingToday.id, competitor: 'MICAPROFITA' } })
    const need = myPicks.filter((p) => {
      const ev = safeJson(p.evidence) as { verdict?: unknown }
      return !ev.verdict
    })
    if (need.length > 0) {
      const liveCutoff = Math.floor(Date.now() / (4 * 3600_000)) * 4 * 3600_000
      const ctx = ctxCache.get(today) ?? (await buildDayContext(today, klines, btcAll, klines4h, liveCutoff))
      try {
        const vonis = await vonisLivePicks(
          need.map((p) => {
            const ev = safeJson(p.evidence) as { topReasons?: string[] }
            return { symbol: p.symbol, confidence: p.confidence, topReasons: ev.topReasons ?? [] }
          }),
          ctx.regime.note,
        )
        for (const p of need) {
          const v = vonis.get(p.symbol)
          if (!v) continue
          const ev = safeJson(p.evidence)
          ev.verdict = { kind: v.verdict, note: v.note, sources: v.sourceCount, at: v.checkedAt }
          await db.pick.update({
            where: { id: p.id },
            data: { evidence: JSON.stringify(ev), confidence: v.verdict === 'PERINGATAN' ? Math.max(35, p.confidence - 15) : p.confidence },
          })
          if (v.verdict === 'VETO') {
            await db.arenaEvent.create({
              data: { day: today, kind: 'VONIS', text: `VONIS VETO (pasca-pasang): ${p.symbol} seharusnya dicabut — ${v.note}. Dipelajari untuk evolusi berikutnya.` },
            })
          } else if (v.verdict === 'PERINGATAN') {
            await db.arenaEvent.create({
              data: { day: today, kind: 'VONIS', text: `VONIS PERINGATAN: ${p.symbol} dipertahankan dengan keyakinan dipangkas — ${v.note}` },
            })
          }
        }
      } catch (e) {
        console.error('[arena] vonis penyembuhan gagal:', e)
      }
    }
  }

  // 5e. UPGRADE V4 — bibit memori berjenjang: hari teradili lama belum punya
  //     POLA_COARSE/POLA_REGIME → panen ulang dari bukti yang SUDAH tersimpan
  //     (faktor ternormalisasi di evidence = hasil hari sebelum D; remember()
  //     idempoten melebur duplikat). Tanpa ini ingatan baru butuh hari-hari
  //     untuk terisi padat.
  const coarseCount = await db.memoryEpisode.count({ where: { kind: 'POLA_COARSE' } })
  if (coarseCount === 0) {
    let seeded = 0
    for (const row of scoredRows) {
      const dayRow = await db.battleDay.findUnique({ where: { day: row.day }, include: { picks: true } })
      if (!dayRow) continue
      const dayCtx = ctxCache.get(row.day) ?? (await buildDayContext(row.day, klines, btcAll))
      for (const p of dayRow.picks.filter((x) => x.competitor === 'MICAPROFITA')) {
        const norm = dayCtx.norm.get(p.symbol)
        if (!norm || p.ret === null || p.ret === undefined) continue
        const b3 = coarseBucket(norm)
        const bucket = factorBucket(norm)
        const hit = p.ret > 0 ? 1 : 0
        await remember('POLA_COARSE', coarsePolaFingerprint(row.regime, b3, p.direction), { direction: p.direction, regime: row.regime, bucket: b3, n: 1, sumRet: p.ret, hitCount: hit }, row.day)
        await remember('POLA_REGIME', regimePolaFingerprint(row.regime, p.direction), { direction: p.direction, regime: row.regime, n: 1, sumRet: p.ret, hitCount: hit }, row.day)
        await remember('POLA', patternFingerprint(row.regime, bucket, p.direction), { direction: p.direction, regime: row.regime, bucket, n: 1, sumRet: p.ret, hitCount: hit }, row.day)
        await remember('EPISODE', episodeFingerprint(row.regime, p.symbol, bucket, p.direction), { symbol: p.symbol, direction: p.direction, regime: row.regime, bucket, n: 1, sumRet: p.ret, hitCount: hit }, row.day)
        seeded += 4
      }
    }
    if (seeded > 0) await bumpMetaCounter('rawEvents', seeded)
    console.log(`[arena][seed] memori berjenjang disebar dari sejarah teradili (+${seeded} kejadian mentah)`)
  }

  // 5f. UPGRADE V4 — putuskan ULANG hari hidup dengan otak sadar-ingatan
  //     (sekali per versi keputusan). Veto vonis LLM yang sudah tersimpan
  //     tetap dihormati — dibaca dari evidence pick lama sebelum diganti.
  //     V273: versi dinaikkan agar hari hidup yang tersimpan TANPA rencana
  //     pra-registrasi (korban bug pasca-veto) diputuskan ulang LENGKAP.
  //     V274: versi dinaikkan agar laporan SLOT-JUJUR lahir & dipublikasikan.
  //     V278: versi dinaikkan agar setiap pick hari hidup lahir lagi lewat
  //     DEBAT-AGENTIK (evidence.debat + kewajiban "Debat tim merah").
  //   V279 KORTEX-KESADARAN (evidence.kortex + kewajiban "KORTEX karangan-sendiri").
  //   V301 DAFTAR TEMPUR: otak kuant berganti decideDaftar — K=50, guard
  //     berlabel anti-buang, pindaian futures penuh, arah pasti per koin.
  const LIVE_DECISION_VERSION = '10c-v301-daftar-50'
  if (pendingToday && (await getMeta('liveDecisionVersion')) !== LIVE_DECISION_VERSION) {
   try {
    const existingMine = await db.pick.findMany({ where: { battleDayId: pendingToday.id, competitor: 'MICAPROFITA' } })
    const vetoMap = new Map<string, string>()
    const vetoReport: { symbol: string; reason: string }[] = []
    for (const p of existingMine) {
      const ev = safeJson(p.evidence) as { verdict?: { kind?: string; note?: string } }
      if (ev.verdict?.kind === 'VETO') {
        const alasan = `VONIS VETO LLM (tersimpan): ${ev.verdict.note ?? ''}`
        vetoMap.set(p.symbol, alasan)
        vetoReport.push({ symbol: p.symbol, reason: alasan })
      }
    }
    const liveCutoff = Math.floor(Date.now() / (4 * 3600_000)) * 4 * 3600_000
    const ctx = ctxCache.get(today) ?? (await buildDayContext(today, klines, btcAll, klines4h, liveCutoff))
    const mem = await loadMemoryLookup()
    const rebuilt = buildAllPicks(ctx, rs, aiResults.get(today) ?? null, undefined, mem, await bukuUntukKortex(), qvOf, dipindai, vetoMap)
    let picks = susunDaftarPicks(rebuilt.out
      .filter((p) => p.direction === 'MICAPROFITA'))
    let slotLive: SlotReport = rebuilt.slot

    // funding info (chip, bukan filter)
    try {
      const fundMap = await getFundingRates(picks.map((p) => p.pick.symbol))
      for (const p of picks) {
        const f = fundMap.get(p.pick.symbol)
        if (f) (p.evidence as Record<string, unknown>).funding = { rate: f.rate, pct: Math.round(f.rate * 10000) / 100, at: new Date().toISOString() }
      }
    } catch { /* opsional */ }

    // V250 WARISAN MASUK ARENA — re-decide juga menghitung ulang warisan + tangga
    try { await kayaWarisanHariHidup(picks, today, ctx, await getMeta('sadardiriTrimUntil'), klines) } catch (e) { console.error('[arena] warisan re-decide gagal:', e) }

    // vonis ulang sasaran teratas yang belum ber-verdict (kecuali yang di-veto lama)
    const needVonis = picks
      .filter((p) => !vetoMap.has(p.pick.symbol))
      .filter((p) => (p.evidence as { guard?: string }).guard !== 'DITOLAK')
      .slice(0, 6)
    if (needVonis.length > 0) {
      try {
        const vonis = await vonisLivePicks(
          needVonis.map((p) => ({ symbol: p.pick.symbol, confidence: p.pick.confidence, topReasons: ((p.evidence.topReasons ?? []) as string[]) })),
          ctx.regime.note,
        )
        const flat = needVonis.map((p) => ({ symbol: p.pick.symbol, confidence: p.pick.confidence, evidence: p.evidence, ref: p }))
        const res = applyVonis(flat, vonis)
        for (const f of flat) f.ref.pick.confidence = f.confidence
        for (const v of res.vetoed) {
          const target = flat.find((x) => x.symbol === v.symbol)
          if (target) {
            const ev = target.evidence as Record<string, unknown>
            ev.guard = 'DITOLAK'
            ev.guardAlasan = `VONIS VETO LLM (re-decide): ${v.note}`
          }
          await db.arenaEvent.create({
            data: { day: today, kind: 'VONIS', text: `VONIS VETO (re-decide V301): ${v.symbol} diturunkan ke peringkat bawah (tetap tampil — hukum anti-buang) — ${v.note}` },
          })
        }
        for (const w of res.warned) {
          await db.arenaEvent.create({
            data: { day: today, kind: 'VONIS', text: `VONIS PERINGATAN (re-decide V301): ${w.symbol} keyakinan dipangkas — ${w.note}` },
          })
        }
        picks = susunDaftarPicks(picks)
        slotLive = slotDariPicks(picks, rebuilt.daftarStats)
      } catch (e) {
        console.error('[arena] vonis re-decide gagal (pick kuant berdiri):', e)
      }
    }

    // V273 PENGUAT — dedupe simbol (otak bisa menyodorkan simbol sama lewat
    // dua slot) dan JANGAN biarkan kegagalan re-decide mematikan seluruh denyut.
    const terlihat = new Set<string>()
    const unik = picks.filter((p) => {
      if (terlihat.has(p.pick.symbol)) return false
      terlihat.add(p.pick.symbol)
      return true
    })
    await db.pick.deleteMany({ where: { battleDayId: pendingToday.id, competitor: 'MICAPROFITA' } })
    for (const p of unik) {
      if (!Number.isFinite(p.entryClose)) continue
      await db.pick.create({
        data: {
          battleDayId: pendingToday.id, competitor: 'MICAPROFITA', symbol: p.pick.symbol,
          direction: p.pick.direction, confidence: p.pick.confidence, entryClose: p.entryClose,
          evidence: JSON.stringify(p.evidence),
        },
      })
    }
    // V274/V301 — laporan slot ikut diterbitkan saat re-decide
    try { await setMeta('slotHariIni', JSON.stringify({ day: today, ...slotLive, ditolak: [...vetoReport, ...slotLive.ditolak].slice(0, 12) })) } catch { /* non-vital */ }
    await setMeta('liveDecisionVersion', LIVE_DECISION_VERSION)
    await db.arenaEvent.create({
      data: { day: today, kind: 'UPGRADE', text: `Hari hidup diputuskan ULANG dengan otak V301 DAFTAR TEMPUR: K=50 slot (hukum pemilik), pindaian futures penuh, guard anti-buang berlabel${vetoMap.size ? `; veto vonis lama dihormati: ${[...vetoMap.keys()].join(', ')}` : ''}.` },
    })
   } catch (e) {
    // V273 PENGUAT — kegagalan re-decide TIDAK BOLEH mematikan seluruh denyut;
    // pick lama tetap berdiri, versi tidak dinaikkan (dicoba lagi denyut berikut).
    console.error('[arena] re-decide v274 gagal (pick lama dipertahankan):', e)
   }
  }

  // 5f+. V273/V301 HEAL-RENCANA — baris daftar tempur yang belum punya rencana
  //      pra-registrasi (korban ban jaring/breaker saat lahir) DISEMBUHKAN di
  //      setiap denyut. Idempoten: hanya baris tanpa rencana yang dikerjakan.
  //      Hukum V273: tak ada sasaran tampil tanpa level — heal ini penjaganya.
  if (pendingToday) {
    try {
      const rowsLIVE = await db.pick.findMany({ where: { battleDayId: pendingToday.id, competitor: 'MICAPROFITA' } })
      const kurang = rowsLIVE.filter((p) => {
        const ev = safeJson(p.evidence) as { rencana?: unknown }
        return ev.rencana === undefined
      })
      if (kurang.length > 0) {
        const liveCutoffH = Math.floor(Date.now() / (4 * 3600_000)) * 4 * 3600_000
        const ctxH = ctxCache.get(today) ?? (await buildDayContext(today, klines, btcAll, klines4h, liveCutoffH))
        const faktorIdxH = new Map(ctxH.factors.map((f, i) => [f.symbol, i]))
        const wrap = kurang.map((p) => {
          const ev = safeJson(p.evidence)
          return { symbol: p.symbol, direction: p.direction as 'BUY' | 'SELL', confidence: p.confidence, entryClose: p.entryClose, evidence: ev }
        })
        const repH = await perkayaWarisan(wrap, today, {
          // V301 — ATR dari faktor; bila koin tak ada di ctx (peringkat likuiditas
          // berubah antar denyut) → hitung langsung dari candle (sumber sama) —
          // jangan pernah gagal hanya karena daftar faktor bergeser.
          atrPctOf: (sym) => {
            const f = ctxH.factors.find((ff) => ff.symbol === sym)
            if (f) return f.atrPct
            const ks = klines.get(sym)
            if (ks && ks.length >= 20) return atrPct(candlesBefore(ks, today))
            return undefined
          },
          likuiditasRankOf: (sym) => faktorIdxH.get(sym) ?? ctxH.factors.length,
          universeSize: Math.max(ctxH.factors.length, 1),
          breadthPct: ctxH.regime.breadth,
          regime: ctxH.regime.regime,
        })
        let lahirH = 0
        for (let i = 0; i < kurang.length; i++) {
          const ev = wrap[i].evidence as { rencana?: unknown }
          if (ev.rencana === undefined) continue
          lahirH++
          await db.pick.update({ where: { id: kurang[i].id }, data: { evidence: JSON.stringify(ev) } })
        }
        if (lahirH > 0) console.log(`[arena][heal-rencana] ${today}: ${kurang.length} dicoba → ${lahirH} rencana lahir (gagal ${repH.gagal.length})`)
      }
    } catch (e) { console.error('[arena] heal-rencana gagal (denyut tetap hidup):', e) }
  }

  await persistGenome(rs)
  await jantung()
  await setMeta('bootstrapProgress', '100')
  await setMeta('bootstrapStatus', 'selesai')
  await setMeta('lastEnsureAt', String(Date.now()))

  // 5g. V276 MESIN-CUAN — buku besar keuntungan: setiap rencana pra-registrasi
  //     dinilai nyata candle hari-D (sasaran/stop/kedaluwarsa, after-fee 0.4%),
  //     keteledoran dicatat jadi pelajaran, ekspektansi negatif memicu disiplin.
  //     Idempoten — kegagalan buku tak boleh mematikan denyut.
  try { await cuanPulse(today, klines) } catch (e) { console.error('[cuan] pulse gagal (denyut tetap hidup):', e) }

  // 6. ORGAN TUMBUH (UPGRADE V5) — diagnosis pertumbuhan harian otomatis:
  //    level AGI terukur + dimensi terlemah + kurikulum teratas → Kronik.
  try { await growthPulse(today) } catch (e) { console.error('[growth] pulse gagal:', e) }

  // 6. audit bebas-kebocoran: recompute 3 hari sampel, bandingkan bukti
  await auditLeakFree(allScoreable, klines, btcAll)

  if (processed > 0 || !pendingToday) {
    await db.arenaEvent.create({
      data: {
        day: today,
        kind: 'MILESTONE',
        text: `Arena sinkron: ${processed} hari baru teradili dalam ${((Date.now() - t0) / 1000).toFixed(0)} detik. Pick hari ${today} telah terpasang (dinilai besok UTC).`,
      },
    })
  }
}

function safeJson(s: string | null): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) as Record<string, unknown> } catch { return {} }
}

/** Audit: bukti pick historis harus bisa direproduksi dari candle SEBELUM hari-D. */
async function auditLeakFree(days: string[], klines: Map<string, Candle[]>, btcAll: Candle[]) {
  const sample = days.slice(-3)
  let checked = 0, pass = 0
  for (const d of sample) {
    const dayRow = await db.battleDay.findUnique({ where: { day: d }, include: { picks: true } })
    if (!dayRow) continue
    const ctx = await buildDayContext(d, klines, btcAll)
    for (const p of dayRow.picks.filter((x) => x.competitor === 'MICAPROFITA')) {
      const ev = safeJson(p.evidence) as { factors?: Record<string, number> }
      const norm = ctx.norm.get(p.symbol)
      if (!norm || !ev.factors) continue
      let ok = true
      for (const id of FACTOR_IDS) {
        const a = norm[id], b = ev.factors[id]
        if (typeof b === 'number' && Math.abs(a - b) > 0.02) { ok = false; break }
      }
      checked++; if (ok) pass++
    }
  }
  await setMeta('leakAudit', JSON.stringify({
    checked, pass, at: new Date().toISOString(),
    verdict: checked > 0 && pass === checked ? 'BEBAS-KEBOCOGAN' : 'PERLU_PERIKSA',
    method: 'faktor direproduksi ulang hanya dari candle openTime < hari-D',
  }))
}

// ---------------- Status untuk UI ----------------

export interface Standing {
  competitor: string
  days: number
  picks: number
  hitRate: number
  cumRet: number
  bestDay: number
  worstDay: number
}

// V300-ANTISTUCK — denyut NADIR di-cache: UI mem-poll tiap 6 dtk, tapi denyut
// (klines 1j + funding + iklim) cukup segar tiap 20 dtk. Hasil terakhir baik
// tetap disajikan saat sumber macet → API SELALU menjawab cepat.
const PULSE_TTL_MS = 20_000
const PULSE_TIMEOUT_MS = 8_000
const gPulse = globalThis as unknown as {
  __arenaPulseCache?: { at: number; data: unknown } | null
  __arenaPulseBuilding?: Promise<unknown> | null
}
async function pulseDenganJaringPengaman(compute: () => Promise<unknown>): Promise<{ data: unknown; at: string; basi: boolean }> {
  const c = gPulse
  if (c.__arenaPulseCache && Date.now() - c.__arenaPulseCache.at < PULSE_TTL_MS) {
    return { data: c.__arenaPulseCache.data, at: new Date(c.__arenaPulseCache.at).toISOString(), basi: false }
  }
  if (!c.__arenaPulseBuilding) {
    c.__arenaPulseBuilding = compute()
      .then((data) => { c.__arenaPulseCache = { at: Date.now(), data }; return data })
      .finally(() => { c.__arenaPulseBuilding = null })
  }
  try {
    const data = await Promise.race([
      c.__arenaPulseBuilding,
      new Promise((_, rej) => setTimeout(() => rej(new Error('denyut melewati batas waktu')), PULSE_TIMEOUT_MS)),
    ])
    return { data, at: new Date().toISOString(), basi: false }
  } catch {
    // sumber macet → sajikan denyut terakhir yang baik (jujur ditandai basi)
    if (c.__arenaPulseCache) {
      return { data: c.__arenaPulseCache.data, at: new Date(c.__arenaPulseCache.at).toISOString(), basi: true }
    }
    return { data: null, at: new Date().toISOString(), basi: true }
  }
}

export async function getArenaState() {
  const [days, allPicks, meta] = await Promise.all([
    db.battleDay.findMany({ orderBy: { day: 'asc' }, include: { picks: true } }),
    db.pick.findMany(),
    db.meta.findMany(),
  ])
  const metaMap = Object.fromEntries(meta.map((m) => [m.key, m.value]))

  // papan skor
  const perComp = new Map<string, Map<string, number[]>>() // competitor -> day -> rets
  for (const p of allPicks) {
    if (p.ret === null || p.ret === undefined) continue
    const dayRow = days.find((d) => d.id === p.battleDayId)
    if (!dayRow) continue
    if (!perComp.has(p.competitor)) perComp.set(p.competitor, new Map())
    const m = perComp.get(p.competitor)!
    if (!m.has(dayRow.day)) m.set(dayRow.day, [])
    m.get(dayRow.day)!.push(p.ret)
  }

  const standings: Standing[] = []
  for (const [comp, dayMap] of perComp) {
    const dayRets = [...dayMap.entries()].map(([day, rets]) => ({ day, ret: rets.reduce((s, r) => s + r, 0) / rets.length }))
    dayRets.sort((a, b) => a.day.localeCompare(b.day))
    const cum = dayRets.reduce((s, d) => s + d.ret, 0)
    const picksScored = dayRets.length
    const hits = allPicks.filter((p) => p.competitor === comp && p.hit !== null)
    standings.push({
      competitor: comp,
      days: picksScored,
      picks: hits.length,
      hitRate: hits.length > 0 ? hits.filter((p) => p.hit).length / hits.length : 0,
      cumRet: cum,
      bestDay: dayRets.length ? Math.max(...dayRets.map((d) => d.ret)) : 0,
      worstDay: dayRets.length ? Math.min(...dayRets.map((d) => d.ret)) : 0,
    })
  }
  standings.sort((a, b) => b.cumRet - a.cumRet)

  // seri kumulatif untuk grafik
  const compNames = standings.map((s) => s.competitor)
  const dayList = [...new Set(days.filter((d) => d.status === 'SCORED').map((d) => d.day))].sort()
  const chart: Record<string, string | number>[] = dayList.map((day) => {
    const row: Record<string, string | number> = { day: day.slice(5) }
    for (const comp of compNames) {
      const m = perComp.get(comp)
      if (!m || !m.has(day)) continue
      let before = 0
      for (const d2 of dayList) {
        if (d2 > day) break
        const rets = m.get(d2)
        if (rets) before += rets.reduce((s, r) => s + r, 0) / rets.length
      }
      row[comp] = Math.round(before * 10000) / 100 // persen kumulatif
    }
    return row
  })

  // V300 — HARI JUJUR: "hari pertarungan" yang ditampilkan = hari UTC dari JAM
  // SISTEM (kebenaran kalender). Hari data (arenaToday) hanya maju bila run
  // sukses — kalau sumber data terhalang, dulu UI selamanya menampilkan tanggal
  // lama (contoh: terjebak 2026-10-11). Kini UI menampilkan hari sistem +
  // peringatan jujur bila data masih milik hari lampau.
  const sysToday = utcTodayStr()
  const dataDay = metaMap['arenaToday'] ?? ''
  const stale = !dataDay || dataDay !== sysToday
  const today = sysToday
  const todayRow = days.find((d) => d.day === dataDay) // pick terakhir tersimpan di hari data
  // V301 — urutan resmi daftar: LOLOS dulu (rank), DITOLAK paling bawah.
  // DB read tanpa orderBy = urutan cuid (acak) — WAJIB disortir di sini agar
  // denyut NADIR slice(0,12) benar-benar 12 sasaran teratas, bukan 12 acak.
  const urutDaftar = (a: { evidence: string | null; symbol: string }, b: { evidence: string | null; symbol: string }) => {
    const ea = safeJson(a.evidence) as { guard?: string; rank?: number }
    const eb = safeJson(b.evidence) as { guard?: string; rank?: number }
    const ga = ea.guard === 'DITOLAK' ? 1 : 0
    const gb = eb.guard === 'DITOLAK' ? 1 : 0
    return ga - gb || (typeof ea.rank === 'number' ? ea.rank : 999) - (typeof eb.rank === 'number' ? eb.rank : 999)
  }
  const minePicksUrut = (todayRow?.picks ?? []).filter((p) => p.competitor === 'MICAPROFITA').sort(urutDaftar)

  const [genome, logs, events, compStats] = await Promise.all([
    db.genomeState.findMany(),
    db.genomeLog.findMany({ orderBy: [{ day: 'desc' }, { createdAt: 'desc' }], take: 16 }),
    db.arenaEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    (async () => {
      const raw = parseInt(metaMap['rawEvents'] ?? '0', 10)
      return compressionStats(raw)
    })(),
  ])

  const leakAudit = metaMap['leakAudit'] ? safeJson(metaMap['leakAudit']) : null
  const scoredCount = days.filter((d) => d.status === 'SCORED').length

  // ---- NADIR (UPGRADE V3): denyut intraday pick hari hidup ----
  // harga live dari ticker Binance (cache 10 menit) vs harga keputusan (close T-1).
  // UPGRADE V4: + sparkline 1 jam (48 candle) + info funding per pick + iklim makro.
  // V300-ANTISTUCK: dibungkus cache + batas waktu — API tetap cepat walau sumber macet.
  let pulse: {
    at: string
    utcClosesInMs: number
    items: { symbol: string; direction: 'BUY' | 'SELL'; entryClose: number; livePrice: number | null; liveRetPct: number | null; verdict: { kind: string; note: string; sources: number } | null; spark: number[]; fundingPct: number | null }[]
  } = { at: new Date().toISOString(), utcClosesInMs: 0, items: [] }
  let climate: Awaited<ReturnType<typeof getClimate>> | null = null
  try {
    const { data: pulseRaw } = await pulseDenganJaringPengaman(async () => {
      const ticker = await getUniverse()
      const priceOf = new Map(ticker.map((t) => [t.symbol, t.lastPrice]))
      const now = new Date()
      const nextUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      const minePicks = minePicksUrut.slice(0, 12) // V301: denyut detail utk 12 sasaran teratas (daftar 50 tetap penuh di panelnya)
      const [sparks, fundMap, cli] = await Promise.all([
        Promise.all(minePicks.map(async (p) => {
          try {
            const ks = await getKlines1h(p.symbol)
            return ks.slice(-48).map((c) => Math.round(c.close * 100) / 100)
          } catch { return [] as number[] }
        })),
        getFundingRates(minePicks.map((p) => p.symbol)).catch(() => new Map()),
        getClimate().catch(() => null),
      ])
      return { priceOf, nextUtc, minePicks, sparks, fundMap, cli, now }
    })
    if (pulseRaw) {
      const { priceOf, nextUtc, minePicks, sparks, fundMap, cli, now } = pulseRaw as {
        priceOf: Map<string, number>; nextUtc: number; minePicks: { symbol: string; direction: string; confidence: number; entryClose: number; evidence: string | null }[]
        sparks: number[][]; fundMap: Map<string, { rate: number }>; cli: Awaited<ReturnType<typeof getClimate>> | null; now: Date
      }
      climate = cli
      pulse = {
        at: now.toISOString(),
        utcClosesInMs: Math.max(0, nextUtc - now.getTime()),
        // NADIR = denyut pick CYBORG saja (dedup per simbol) — barisan rival tetap di kartunya sendiri
        items: minePicks.map((p, idx) => {
          const live = priceOf.get(p.symbol) ?? null
          const sign = p.direction === 'BUY' ? 1 : -1
          const liveRetPct = live !== null && p.entryClose > 0 ? ((live - p.entryClose) / p.entryClose) * sign * 100 : null
          const ev = safeJson(p.evidence) as {
            verdict?: { kind?: string; note?: string; sources?: number }; funding?: { pct?: number }
            warisan?: Record<string, unknown>; rencana?: Record<string, unknown>
            daya?: Record<string, number>; praRegistrasi?: Record<string, unknown>; sadardiri?: string
          }
          const verdict = ev.verdict ? { kind: String(ev.verdict.kind ?? 'TANPA_VONIS'), note: String(ev.verdict.note ?? ''), sources: Number(ev.verdict.sources ?? 0) } : null
          return {
            symbol: p.symbol, direction: p.direction as 'BUY' | 'SELL', entryClose: p.entryClose,
            livePrice: live, liveRetPct: liveRetPct === null ? null : Math.round(liveRetPct * 100) / 100,
            verdict,
            spark: sparks[idx] ?? [],
            fundingPct: typeof ev.funding?.pct === 'number' ? ev.funding.pct : (fundMap.get(p.symbol)?.rate != null ? Math.round((fundMap.get(p.symbol)!.rate) * 10000) / 100 : null),
            // V250 WARISAN MASUK ARENA — tangga harga + 7 mesin + pra-registrasi + daya
            warisan: ev.warisan ?? null,
            rencana: ev.rencana ?? null,
            daya: ev.daya ?? null,
            praRegistrasi: ev.praRegistrasi ?? null,
            sadardiri: ev.sadardiri ?? null,
          }
        }),
      }
    }
  } catch { /* pulse gagal → UI tetap hidup tanpa denyut */ }

  return {
    today,
    // V300 — kejujuran sinkronisasi: hari data & lag & status denyut
    dataDay: dataDay || null,
    stale,
    dataLagHari: dataDay ? Math.max(0, lagHari(dataDay, sysToday)) : null,
    serverNow: new Date().toISOString(),
    bootstrap: {
      status: metaMap['bootstrapStatus'] ?? 'belum',
      progress: parseInt(metaMap['bootstrapProgress'] ?? '0', 10),
      error: (metaMap['bootstrapStatus'] ?? '') === 'selesai' ? null : (metaMap['bootstrapError'] || null),
    },
    regime: todayRow?.regime ?? null,
    universe: { symbols: DAFTAR_POOL, pool: POOL_SIZE, backfillDays: BACKFILL_DAYS, scoredDays: scoredCount },
    standings,
    chart,
    pulse,
    climate: climate ? { fng: climate.fng, fngClass: climate.fngClass, mcapChange24h: climate.mcapChange24h === null ? null : Math.round(climate.mcapChange24h * 100) / 100, btcDominance: climate.btcDominance === null ? null : Math.round(climate.btcDominance * 10) / 10, at: climate.at } : null,
    // V301 DAFTAR TEMPUR — 50 baris penuh (lolos + ditolak berlabel). Bukti
    // berat (debat/kortex/warisan) hanya diterbitkan utk 6 teratas — payload
    // tetap ramping untuk polling 6 dtk; daftar TIDAK pernah dipangkas.
    todayPicks: (() => {
      const mine = minePicksUrut // lolos dulu (rank), ditolak paling bawah
      const others = (todayRow?.picks ?? []).filter((p) => p.competitor !== 'MICAPROFITA')
      return [...mine, ...others].map((p) => {
        const ev = safeJson(p.evidence)
        const rank = typeof ev.rank === 'number' ? ev.rank : 0
        if (rank > 6) for (const k of ['debat', 'kortex', 'warisan', 'daya', 'praRegistrasi']) delete ev[k]
        return {
          competitor: p.competitor, symbol: p.symbol, direction: p.direction,
          confidence: p.confidence,
          // V273 SASARAN-PENUH — harga kunci ikut diterbitkan agar UI bisa
          // menampilkan level (entry) bahkan untuk rival tanpa rencana keluar.
          entryClose: p.entryClose,
          evidence: ev,
        }
      })
    })(),
    // V274 SLOT-JUJUR — jawaban resmi atas "kok sasarannya cuma satu?":
    // berapa slot dirancang, berapa lahir, siapa ditolak guard & kenapa.
    slotHariIni: metaMap['slotHariIni'] ? safeJson(metaMap['slotHariIni']) : null,
    // V276 MESIN-CUAN — buku besar keuntungan dari rencana pra-registrasi:
    // setiap rencana dinilai nyata (sasaran/stop/kedaluwarsa, after-fee),
    // keteledoran dihitung, ekspektansi tampil tanpa polesan.
    bukuCuan: metaMap['bukuCuan'] ? safeJson(metaMap['bukuCuan']) : null,
    disiplinCuan: metaMap['cuanDisiplinUntil'] ?? null,
    genome: {
      generation: parseInt(metaMap['gen'] ?? '1', 10),
      v2: safeJson(metaMap['genomeV2'] ?? '{}') as Record<string, unknown>,
      states: genome.map((s) => ({ regime: s.regime, weights: safeJson(s.weights) })),
      logs: logs.map((l) => ({ day: l.day, generation: l.generation, kind: l.kind, note: l.note, fitness: l.fitness, payload: safeJson(l.payload) })),
      upgradeEtaUntil: metaMap['upgradeEtaUntil'] ?? null,
    },
    memory: compStats,
    leakAudit,
    // V250 — sadar-diri Brier: kejujuran keyakinan dari medan (jendela 30 pick)
    brier: (() => {
      try {
        const st = JSON.parse(metaMap['brierState'] ?? '') as { n: number; jumlah: number; jendela: { day: string; conf: number; hit: number }[] }
        return {
          n: st.n,
          nilai: st.n > 0 ? Math.round((st.jumlah / st.n) * 1000) / 1000 : null,
          trimUntil: metaMap['sadardiriTrimUntil'] ?? null,
        }
      } catch { return { n: 0, nilai: null as number | null, trimUntil: null as string | null } }
    })(),
    events: events.map((e) => ({ day: e.day, kind: e.kind, text: e.text, at: e.createdAt.toISOString() })),
    lastEnsureAt: metaMap['lastEnsureAt'] ?? null,
  }
}
