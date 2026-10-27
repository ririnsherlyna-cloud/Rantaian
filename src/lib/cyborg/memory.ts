// ============================================================
// INGATAN — memori kompres dengan jaminan:
//   • TANPA TUMPANG-TINDIH : sidik jari FNV-1a = PRIMARY KEY.
//     State identik tidak mungkin punya 2 baris — duplikat
//     otomatis melebur (hits++ + agregat).
//   • TERKOMPRESI : episode mentah dihitung, yang tersimpan jauh
//     lebih sedikit; rasio kompresi dilaporkan jujur.
//   • TANPA KEBOCOGAN : keputusan hari-D hanya membaca candle
//     openTime < D; memori hasil hanya ditulis SETELAH dinilai.
// ============================================================

import { db } from '@/lib/db'
import { MemoryLookup, MemEdge } from './brain'

export interface MemoryPayload {
  symbol?: string
  direction?: string
  regime?: string
  bucket?: string
  n: number
  sumRet: number
  hitCount: number
  bestRet?: number
  worstRet?: number
  note?: string
}

/**
 * Panen episode/pola. Duplikat fingerprint → melebur (kompresi).
 * Mengembalikan { merged: true/false } untuk statistik.
 */
export async function remember(
  kind: 'EPISODE' | 'POLA' | 'POLA_COARSE' | 'POLA_REGIME' | 'POLA_RIVAL' | 'PELAJARAN',
  fingerprint: string,
  payload: MemoryPayload,
  day: string,
): Promise<{ merged: boolean }> {
  const existing = await db.memoryEpisode.findUnique({ where: { fingerprint } })
  if (existing) {
    const old = JSON.parse(existing.payload) as MemoryPayload
    const merged: MemoryPayload = {
      ...old,
      n: old.n + 1,
      sumRet: old.sumRet + payload.sumRet,
      hitCount: old.hitCount + payload.hitCount,
      bestRet: Math.max(old.bestRet ?? payload.sumRet, payload.sumRet),
      worstRet: Math.min(old.worstRet ?? payload.sumRet, payload.sumRet),
    }
    await db.memoryEpisode.update({
      where: { fingerprint },
      data: { payload: JSON.stringify(merged), hits: existing.hits + 1, lastDay: day },
    })
    return { merged: true }
  }
  await db.memoryEpisode.create({
    data: {
      fingerprint,
      kind,
      payload: JSON.stringify(payload),
      hits: 1,
      firstDay: day,
      lastDay: day,
    },
  })
  return { merged: false }
}

/** Statistik kompresi: kejadian mentah vs baris tersimpan. */
export async function compressionStats(rawEvents: number) {
  const [rows, byKind, agg] = await Promise.all([
    db.memoryEpisode.count(),
    db.memoryEpisode.groupBy({ by: ['kind'], _count: { _all: true }, _sum: { hits: true } }),
    db.memoryEpisode.aggregate({ _sum: { hits: true } }),
  ])
  let bytesStored = 0
  const sample = await db.memoryEpisode.findMany({ orderBy: { lastDay: 'desc' }, take: 400 })
  for (const r of sample) bytesStored += r.payload.length + r.fingerprint.length + 8
  const EST_RAW_BYTES = 480 // estimasi episode mentah penuh (faktor+meta+hasil)
  const bytesRaw = rawEvents * EST_RAW_BYTES
  return {
    rawEvents,
    storedRows: rows,
    dedupMerges: Math.max(0, rawEvents - rows),
    compressionRatio: rows > 0 ? rawEvents / rows : 1,
    bytesRaw,
    bytesStored,
    byteRatio: bytesStored > 0 ? bytesRaw / bytesStored : 1,
    byKind: byKind.map((k) => ({ kind: k.kind, rows: k._count._all, hits: k._sum.hits ?? 0 })),
    totalHits: agg._sum.hits ?? 0,
    recent: sample.slice(0, 12).map((r) => ({
      fingerprint: r.fingerprint,
      kind: r.kind,
      hits: r.hits,
      firstDay: r.firstDay,
      lastDay: r.lastDay,
      payload: JSON.parse(r.payload) as MemoryPayload,
    })),
  }
}

/** Ambil pola POLA/POLA_RIVAL per rezim untuk revolusi & konteks guru. */
export async function patternsByRegime(regime: string, kinds: string[]) {
  const rows = await db.memoryEpisode.findMany({
    where: { kind: { in: kinds } },
    take: 2000,
  })
  return rows.filter((r) => (JSON.parse(r.payload) as MemoryPayload).regime === regime)
}

// ============================================================
// UPGRADE V4 "SADAR-INGATAN" — memori berjenjang yang DIBACA saat
// keputusan. Jenjang: SIMBOL (episode n>=2) → BUCKET3 (n>=2) → REZIM
// (n>=4). Tanpa jenjang ini, bucket 8-faktor (6561 kombinasi) tidak
// pernah cukup n — bukti UJIAN #8.
// ============================================================

interface MemAgg { n: number; sumRet: number; hit: number }

export async function loadMemoryLookup(): Promise<MemoryLookup> {
  const rows = await db.memoryEpisode.findMany({
    where: { kind: { in: ['EPISODE', 'POLA', 'POLA_COARSE', 'POLA_REGIME'] } },
    select: { kind: true, payload: true },
    take: 4000,
  })
  const eps = new Map<string, MemAgg>()   // E|rezim|simbol|arah
  const fine = new Map<string, MemAgg>()  // P8|rezim|bucket8|arah
  const coarse = new Map<string, MemAgg>() // P3|rezim|bucket3|arah
  const rezim = new Map<string, MemAgg>() // PR|rezim|arah
  for (const r of rows) {
    const p = JSON.parse(r.payload) as { regime?: string; symbol?: string; bucket?: string; direction?: string; n?: number; sumRet?: number; hitCount?: number }
    if (!p.regime || !p.direction) continue
    const agg: MemAgg = { n: p.n ?? 1, sumRet: p.sumRet ?? 0, hit: p.hitCount ?? 0 }
    if (r.kind === 'EPISODE' && p.symbol) eps.set(`E|${p.regime}|${p.symbol}|${p.direction}`, agg)
    else if (r.kind === 'POLA' && p.bucket) fine.set(`P8|${p.regime}|${p.bucket}|${p.direction}`, agg)
    else if (r.kind === 'POLA_COARSE' && p.bucket) coarse.set(`P3|${p.regime}|${p.bucket}|${p.direction}`, agg)
    else if (r.kind === 'POLA_REGIME') rezim.set(`PR|${p.regime}|${p.direction}`, agg)
  }
  const avg = (v: MemAgg) => (v.n > 0 ? v.sumRet / v.n : 0)
  const hitOf = (v: MemAgg) => (v.n > 0 ? v.hit / v.n : 0)
  return {
    edge(regimeStr: string, symbol: string, _bucket8: string, bucket3: string, direction: string): MemEdge {
      const e = eps.get(`E|${regimeStr}|${symbol}|${direction}`)
      if (e && e.n >= 2) return { level: 'SIMBOL', n: e.n, edge: avg(e), hit: hitOf(e) }
      const c = coarse.get(`P3|${regimeStr}|${bucket3}|${direction}`)
      if (c && c.n >= 2) return { level: 'BUCKET3', n: c.n, edge: avg(c), hit: hitOf(c) }
      const r = rezim.get(`PR|${regimeStr}|${direction}`)
      if (r && r.n >= 4) return { level: 'REZIM', n: r.n, edge: avg(r), hit: hitOf(r) }
      const best = [e, c].filter((x): x is MemAgg => !!x).sort((a, b) => b.n - a.n)[0]
      return best ? { level: 'LEMAH', n: best.n, edge: avg(best) * 0.4, hit: hitOf(best) } : { level: 'BARU', n: 0, edge: 0, hit: 0 }
    },
    size() {
      return { simbol: eps.size, bucket3: coarse.size, rezim: rezim.size, episode: fine.size }
    },
  }
}
