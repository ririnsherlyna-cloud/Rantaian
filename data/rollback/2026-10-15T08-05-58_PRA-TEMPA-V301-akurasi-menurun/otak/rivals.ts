// ============================================================
// RIVAL ARENA — 5 penantang MICAPROFITA:
//   1. AI_ANALIS  : LLM GLM (sekelas z.ai 5.2) membaca snapshot
//      pasar terkompresi dan memilih arah biner sendiri.
//   2. MOMENTUM   : pengejar momentum naif (top momentum 7h).
//   3. MEANREV    : pembeli jatuhan naif (bottom momentum).
//   4. BNH_BTC    : beli-tahan Bitcoin (patokan pasar).
//   5. ACAK       : dadu berbibit (deterministik per hari).
// Semua dinilai dengan aturan yang sama persis. Adil.
// ============================================================

import { CoinFactors, rankNormalize } from './factors'
import { RegimeInfo } from './market'
import { chat, extractJson, webSearch } from './llm'

export interface RivalPick {
  symbol: string
  direction: 'BUY' | 'SELL'
  confidence: number
  reason: string
}

export interface RivalResult {
  picks: RivalPick[]
  note?: string
}

// ---------- 1. AI ANALIS (GLM) ----------

export interface SnapshotCoin {
  symbol: string
  mom7: number
  mom30: number
  rsi: number
  volSurge: number
  atrPct: number
  distHigh: number
  emaAlign: string
}

function snapshotText(coins: SnapshotCoin[], regime: RegimeInfo, day: string): string {
  const rows = coins.map((c, i) =>
    `${i + 1}. ${c.symbol} | mom7 ${c.mom7 >= 0 ? '+' : ''}${c.mom7.toFixed(1)}% | mom30 ${c.mom30 >= 0 ? '+' : ''}${c.mom30.toFixed(1)}% | RSI ${c.rsi.toFixed(0)} | vol ${c.volSurge.toFixed(1)}x | ATR ${c.atrPct.toFixed(1)}% | dari puncak60 ${c.distHigh.toFixed(1)}% | EMA: ${c.emaAlign}`,
  ).join('\n')
  return `Hari pertarungan: ${day} (UTC)
Rezim pasar BTC: ${regime.regime} (EMA20 ${regime.btcEma20 > regime.btcEma50 ? '>' : '<'} EMA50, momentum7d ${regime.btcMom7.toFixed(1)}%, breadth ${regime.breadth.toFixed(0)}% koin di atas EMA20)

Top koin berdasarkan likuiditas (data candle harian Binance, harga keputusan = close kemarin):
${rows}

Tugas: pilih MAKSIMAL 3 koin dengan arah BINER (BUY=naik besok, SELL=turun besok) yang akan memberi profit TERBESAR besok. Boleh kurang dari 3 jika tidak yakin. Jawab HANYA JSON:
{"picks":[{"symbol":"...","direction":"BUY|SELL","confidence":0-100,"reason":"maks 12 kata"}]}`
}

export async function aiAnalisPick(
  coins: SnapshotCoin[],
  regime: RegimeInfo,
  day: string,
  useNews: boolean,
): Promise<RivalResult> {
  try {
    let newsBlock = ''
    if (useNews) {
      const hits = await webSearch('crypto market today bitcoin altcoin outlook', 5, 3)
      if (hits.length > 0) {
        newsBlock = '\n\nBerita terbaru (web search):\n' + hits.map((h) => `- [${h.date ?? 'baru'}] ${h.title}: ${h.snippet.slice(0, 160)}`).join('\n')
      }
    }
    const sys = 'Kamu adalah AI ANALIS, model bahasa kelas besar yang bertanding di arena prediksi arah kripto harian. Kepakarmu: membaca data kuantitatif dan berita untuk menebak arah harga besok. Keputusan harus biner dan tegas.'
    const user = snapshotText(coins, regime, day) + newsBlock
    const raw = await chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { temperature: 0.3, maxTokens: 600 },
    )
    const parsed = extractJson<{ picks: { symbol: string; direction: string; confidence: number; reason: string }[] }>(raw)
    const valid = new Set(coins.map((c) => c.symbol))
    const picks: RivalPick[] = []

    const push = (p: { symbol: string; direction: string; confidence?: number; reason?: string }) => {
      const sym = valid.has(p.symbol) ? p.symbol : valid.has(`${p.symbol}USDT`) ? `${p.symbol}USDT` : null
      if (!sym) return
      const dir = String(p.direction).toUpperCase() === 'SELL' ? 'SELL' : 'BUY'
      if (picks.some((x) => x.symbol === sym)) return
      picks.push({ symbol: sym, direction: dir, confidence: Math.max(1, Math.min(100, Number(p.confidence) || 50)), reason: String(p.reason ?? '').slice(0, 120) })
    }

    if (parsed?.picks?.length) {
      for (const p of parsed.picks) push(p)
    } else {
      // fallback: regex tangkap pasangan symbol/direction dari balasan rusak
      const re = /"symbol"\s*:\s*"([A-Z0-9]+?)"\s*,\s*"direction"\s*:\s*"(BUY|SELL)"/g
      let m: RegExpExecArray | null
      while ((m = re.exec(raw)) !== null) push({ symbol: m[1], direction: m[2] })
    }
    if (picks.length === 0) return { picks: [], note: 'LLM gagal menghasilkan pick valid' }
    return { picks: picks.slice(0, 3), note: useNews && newsBlock ? 'dibantu berita web' : 'snapshot kuantitatif' }
  } catch (e) {
    return { picks: [], note: `LLM error: ${(e as Error).message.slice(0, 80)}` }
  }
}

// ---------- 2. MOMENTUM naif ----------

export function momentumPick(factors: CoinFactors[]): RivalResult {
  const norm = rankNormalize(factors)
  const sorted = [...factors].sort((a, b) => b.mom7 - a.mom7).slice(0, 3)
  return {
    picks: sorted.map((f) => ({
      symbol: f.symbol,
      direction: 'BUY' as const,
      confidence: 60 + Math.round((norm.get(f.symbol)?.mom7 ?? 0) * 20),
      reason: 'momentum 7h tertinggi (naif)',
    })),
  }
}

// ---------- 3. MEANREV naif ----------

export function meanRevPick(factors: CoinFactors[]): RivalResult {
  const sorted = [...factors].sort((a, b) => a.mom7 - b.mom7).slice(0, 3)
  return {
    picks: sorted.map((f) => ({
      symbol: f.symbol,
      direction: 'BUY' as const,
      confidence: 55,
      reason: 'jatuh terdalam → tarik balik (naif)',
    })),
  }
}

// ---------- 4. BNH BTC ----------

export function bnhPick(btcSymbol: string): RivalResult {
  return { picks: [{ symbol: btcSymbol, direction: 'BUY', confidence: 50, reason: 'beli-tahan Bitcoin selalu' }] }
}

// ---------- 5. ACAK berbibit ----------

function seededRng(seedStr: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) % 100000) / 100000
  }
}

export function randomPick(factors: CoinFactors[], day: string): RivalResult {
  const rng = seededRng('ACAK-' + day)
  const pool = [...factors]
  const picks: RivalPick[] = []
  const n = Math.min(3, pool.length)
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length)
    const f = pool.splice(idx, 1)[0]
    picks.push({
      symbol: f.symbol,
      direction: rng() > 0.5 ? 'BUY' : 'SELL',
      confidence: Math.round(30 + rng() * 40),
      reason: 'dadu berbibit',
    })
  }
  return { picks }
}
