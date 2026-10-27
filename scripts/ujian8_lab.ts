// ============================================================
// UJIAN #8 — LAB V4 "SADAR-INGATAN" (bebas kebocoran, walk-forward).
// Temuan forensik: memori POLA/EPISODE dipanen tiap hari TAPI tidak
// pernah dibaca saat keputusan (organ mati). Lab ini menguji apakah
// ingatan punya daya prediksi & apakah memakainya menaikkan profit.
//
// Metode: replay 21 hari kronologis; memori dibangun HANYA dari pick
// hari-hari sebelum D (persis seperti sistem asli). Varian:
//   V3   = baseline (ingatan buta)
//   V4a  = ingatan jadi tie-break antrian + penyetel keyakinan
//   V4b  = V4a + MEMVETO (skip kandidat saat memori (rezim,bucket)
//          berkata: n>=3, avgRet <= -2%, hit < 34%)
//   V4c  = V4a + MEMBOOST anchor (slot anchor pilih kandidat ber-ekar
//          memori terbaik, bukan komposit saja)
// ============================================================
import {
  addDays, candlesBefore, dayOfTs, dayOpenTs, dynamicUniverse, getKlines4hBulk, getKlinesBulk,
  getRegime, getUniverse, mom4hFrom,
} from '../src/lib/cyborg/market'
import { CoinFactors, computeFactors, factorBucket, rankNormalize } from '../src/lib/cyborg/factors'
import { DEFAULT_GENOME_V2, DEFAULT_WEIGHTS, decidePredator } from '../src/lib/cyborg/brain'
import { FactorId } from '../src/lib/cyborg/factors'

const DAYS = 21
const UNIVERSE_N = 40
const today = dayOfTs(Date.now())
const firstDay = addDays(today, -DAYS)

// ---------- memori lab (mirror ingatan asli, BERJENJANG) ----------
interface MemAgg { n: number; sumRet: number; hit: number }
const polaFine = new Map<string, MemAgg>()  // P8|rezim|bucket8|arah   (halus)
const polaCoarse = new Map<string, MemAgg>() // P3|rezim|bucket3|arah (kasar: mom7,volSurge,emaAlign)
const polaRegime = new Map<string, MemAgg>() // PR|rezim|arah         (level rezim)
const epsMem = new Map<string, MemAgg>()     // E|rezim|simbol|arah   (level simbol)

function memGet(m: Map<string, MemAgg>, key: string): MemAgg | null {
  const v = m.get(key)
  return v && v.n > 0 ? v : null
}
function memAvg(v: MemAgg): number { return v.sumRet / v.n }
function memHit(v: MemAgg): number { return v.hit / v.n }
function coarseBucket(norm: Record<FactorId, number> | undefined): string {
  if (!norm) return 'ZZZ'
  const s = (id: FactorId) => ((norm[id] ?? 0) > 0.2 ? 'P' : (norm[id] ?? 0) < -0.2 ? 'N' : 'Z')
  return `${s('mom7')}${s('volSurge')}${s('emaAlign')}`
}

interface MemEdge { edge: number; level: string; n: number; hit: number }
/** Ekar memori berjenjang: simbol → bucket3 → rezim (level pertama dgn n>=2). */
function memoryEdge(regime: string, sym: string, bucket8: string, b3: string, dir: string): MemEdge {
  const e = memGet(epsMem, `E|${regime}|${sym}|${dir}`)
  if (e && e.n >= 2) return { edge: memAvg(e), level: 'SIMBOL', n: e.n, hit: memHit(e) }
  const c = memGet(polaCoarse, `P3|${regime}|${b3}|${dir}`)
  if (c && c.n >= 2) return { edge: memAvg(c), level: 'BUCKET3', n: c.n, hit: memHit(c) }
  const r = memGet(polaRegime, `PR|${regime}|${dir}`)
  if (r && r.n >= 4) return { edge: memAvg(r), level: 'REZIM', n: r.n, hit: memHit(r) }
  // belum cukup di semua level → gabungan terbaik yang ada (bobot kecil)
  const best = [e, c].filter((x): x is MemAgg => !!x).sort((a, b) => b.n - a.n)[0]
  return best ? { edge: memAvg(best) * 0.4, level: 'LEMAH', n: best.n, hit: best.n ? best.hit / best.n : 0 } : { edge: 0, level: 'BARU', n: 0, hit: 0 }
}

// ---------- varian ----------
interface Variant {
  name: string; memTie: boolean; memVeto: boolean; memAnchor: boolean
  sums: number; hits: number; n: number; perDay: Map<string, number>; vetoes: string[]
}
const variants: Variant[] = [
  { name: 'V3 baseline (buta ingatan)', memTie: false, memVeto: false, memAnchor: false, sums: 0, hits: 0, n: 0, perDay: new Map(), vetoes: [] },
  { name: 'V4a tie-break+conf', memTie: true, memVeto: false, memAnchor: false, sums: 0, hits: 0, n: 0, perDay: new Map(), vetoes: [] },
  { name: 'V4b +MEMVETO', memTie: true, memVeto: true, memAnchor: false, sums: 0, hits: 0, n: 0, perDay: new Map(), vetoes: [] },
  { name: 'V4c +MEMBOOST anchor', memTie: true, memVeto: false, memAnchor: true, sums: 0, hits: 0, n: 0, perDay: new Map(), vetoes: [] },
]

// otak V4 lokal (meng-clone decidePredator + lapisan memori) — memori
// di sini eksplisit agar lab transparan, bukan hitam-putam.
function decideV4(
  factors: CoinFactors[],
  norm: Map<string, Record<FactorId, number>>,
  closes: Map<string, number[]>,
  regime: { regime: string; breadth: number; note: string },
  m4h: Map<string, number>,
  v: Variant,
  day: string,
): { picks: { symbol: string; direction: 'BUY' | 'SELL'; conf: number; mem: string }[] } {
  const G = DEFAULT_GENOME_V2
  const W = DEFAULT_WEIGHTS
  const comp = (sym: string) => {
    const n = norm.get(sym)
    if (!n) return 0
    let s = 0, tot = 0
    for (const id of Object.keys(W) as FactorId[]) { s += (n[id] ?? 0) * W[id]; tot += Math.abs(W[id]) }
    return tot ? s / tot : 0
  }
  const m4Of = (s: string) => m4h.get(s) ?? 0

  // ---- antrian mom7 murni (+ tie-break 4h + memori bila V4a) ----
  const ranked = [...factors].sort((a, b) => {
    if (b.mom7 !== a.mom7) return b.mom7 - a.mom7
    const m4 = m4Of(b.symbol) - m4Of(a.symbol)
    if (Math.abs(m4) > 0.01) return m4
    if (v.memTie) {
      const ba = memoryEdge(regime.regime, a.symbol, factorBucket(norm.get(a.symbol)!), coarseBucket(norm.get(a.symbol)), 'BUY')
      const bb = memoryEdge(regime.regime, b.symbol, factorBucket(norm.get(b.symbol)!), coarseBucket(norm.get(b.symbol)), 'BUY')
      if (Math.abs(bb.edge - ba.edge) > 0.002) return bb.edge - ba.edge
    }
    return comp(b.symbol) - comp(a.symbol)
  })

  // ---- kebijakan K adaptif (sama dgn otak asli) ----
  const leader = ranked.length ? ranked[0].mom7 : 0
  let k = G.kBase
  if (G.paraK > 0 && leader > G.paraK) k = Math.min(k, 2)
  if (regime.breadth < G.breadthK2) k = Math.min(k, 2)
  if (regime.breadth < G.breadthK1) k = 1
  if (regime.regime === 'JATUH') k = Math.min(k, 1)

  const buys: { f: CoinFactors; conf: number; mem: string }[] = []
  for (const f of ranked) {
    if (buys.length >= k) break
    if (f.atrPct > G.atrCap) continue
    if ((closes.get(f.symbol) ?? []).length < 30) continue
    const nrm = norm.get(f.symbol)!
    const bucket = factorBucket(nrm)
    const b3 = coarseBucket(nrm)
    // ---- MEMVETO: ingatan berjenjang berkata pola ini biasanya gagal ----
    if (v.memVeto) {
      const c = memGet(polaCoarse, `P3|${regime.regime}|${b3}|BUY`)
      const r = memGet(polaRegime, `PR|${regime.regime}|BUY`)
      if (c && c.n >= 4 && memAvg(c) <= -0.03 && memHit(c) < 0.3) {
        v.vetoes.push(`${day}:${f.symbol}(B3 n=${c.n},avg=${(memAvg(c) * 100).toFixed(1)}%)`)
        continue
      }
      if (r && r.n >= 10 && memAvg(r) <= -0.05 && memHit(r) < 0.25 && buys.length >= 1) {
        v.vetoes.push(`${day}:${f.symbol}(REZIM n=${r.n},avg=${(memAvg(r) * 100).toFixed(1)}%)`)
        continue
      }
    }
    // anti-tumpang-tindih korelasi
    const cl = closes.get(f.symbol) ?? []
    let overlap = false
    for (const b of buys) {
      const clp = closes.get(b.f.symbol) ?? []
      const n = Math.min(cl.length, clp.length, 30)
      if (n < 10) continue
      const xa = cl.slice(-n), ya = clp.slice(-n)
      const ma = xa.reduce((s, x) => s + x, 0) / n, mb = ya.reduce((s, x) => s + x, 0) / n
      let sxy = 0, sxa = 0, sya = 0
      for (let i = 0; i < n; i++) { const dx = xa[i] - ma, dy = ya[i] - mb; sxy += dx * dy; sxa += dx * dx; sya += dy * dy }
      const c = sxa > 0 && sya > 0 ? Math.abs(sxy / Math.sqrt(sxa * sya)) : 0
      if (c > G.corrCap) { overlap = true; break }
    }
    if (overlap) continue
    if ((nrm.mom7 ?? 0) < G.minNorm * 2 - 1 && buys.length > 0) continue
    const me = memoryEdge(regime.regime, f.symbol, bucket, b3, 'BUY')
    const conf = Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4Of(f.symbol) >= 0 ? 4 : -6) + (regime.breadth > 55 ? 6 : 0) + (k === 1 ? 6 : 0)
      + (v.memTie ? Math.max(-8, Math.min(8, me.edge * 100 * 0.5)) : 0)))
    buys.push({ f, conf, mem: me.level !== 'BARU' ? `${me.level}:${me.n}ep ${(me.edge * 100).toFixed(1)}%` : 'baru' })
  }

  // ---- slot ANCHOR (kualitas komposit; V4c = diarahkan ekar memori) ----
  if (G.anchorOn && buys.length < k && k >= 3 && buys.length >= 1) {
    const taken = new Set(buys.map((b) => b.f.symbol))
    const cands = [...factors].filter((f) => !taken.has(f.symbol))
    let best: CoinFactors | null = null
    let bestKey = -Infinity
    for (const f of cands) {
      const nrm = norm.get(f.symbol)!
      if ((nrm.mom7 ?? 0) < -0.2) break
      if (f.atrPct > G.atrCap || (closes.get(f.symbol) ?? []).length < 30) continue
      const cl = closes.get(f.symbol) ?? []
      let overlap = false
      for (const b of buys) {
        const clp = closes.get(b.f.symbol) ?? []
        const n = Math.min(cl.length, clp.length, 30)
        if (n < 10) continue
        const xa = cl.slice(-n), ya = clp.slice(-n)
        const ma = xa.reduce((s, x) => s + x, 0) / n, mb = ya.reduce((s, x) => s + x, 0) / n
        let sxy = 0, sxa = 0, sya = 0
        for (let i = 0; i < n; i++) { const dx = xa[i] - ma, dy = ya[i] - mb; sxy += dx * dy; sxa += dx * dx; sya += dy * dy }
        const c = sxa > 0 && sya > 0 ? Math.abs(sxy / Math.sqrt(sxa * sya)) : 0
        if (c > G.corrCap) { overlap = true; break }
      }
      if (overlap) continue
      const key = v.memAnchor
        ? comp(f.symbol) + memoryEdge(regime.regime, f.symbol, factorBucket(nrm), coarseBucket(nrm), 'BUY').edge * 100 * 0.6
        : comp(f.symbol)
      if (key > bestKey) { bestKey = key; best = f }
    }
    if (best) buys.push({ f: best, conf: 55, mem: 'anchor' })
  }

  return { picks: buys.map((b) => ({ symbol: b.f.symbol, direction: 'BUY' as const, conf: b.conf, mem: b.mem })) }
}

// ---------- PHASE 1: diag daya prediksi memori ----------
let diagBeforePos = 0, diagBeforePosN = 0
let diagBeforeNeg = 0, diagBeforeNegN = 0
let diagNoMem = 0, diagNoMemN = 0

async function main() {
  console.log('Mengambil data riil Binance...')
  const universe = await getUniverse()
  const pool = universe.slice(0, 120).map((u) => u.symbol)
  if (!pool.includes('BTCUSDT')) pool.unshift('BTCUSDT')
  const klines = await getKlinesBulk(pool)
  const klines4h = await getKlines4hBulk(pool)
  const btcAll = klines.get('BTCUSDT') ?? []
  console.log(`pool=${pool.length} klines=${klines.size} k4h=${klines4h.size}`)

  for (let i = 0; i < DAYS; i++) {
    const day = addDays(firstDay, i)
    const ts = dayOpenTs(day)
    const universeSyms = dynamicUniverse(klines, day, UNIVERSE_N)
    const btcBefore = candlesBefore(btcAll, day)
    const factors: CoinFactors[] = []
    const closes = new Map<string, number[]>()
    const m4h = new Map<string, number>()
    for (const sym of universeSyms) {
      const before = candlesBefore(klines.get(sym) ?? [], day)
      if (before.length < 35) continue
      const f = computeFactors(sym, before, btcBefore)
      if (!f) continue
      factors.push(f)
      closes.set(sym, before.map((c) => c.close))
      m4h.set(sym, mom4hFrom(klines4h.get(sym), ts))
    }
    if (factors.length < 10) { console.log(`${day} skip (faktor ${factors.length})`); continue }
    const norm = rankNormalize(factors)
    const regime = await getRegime(btcBefore, closes)
    const entryOf = (sym: string) => factors.find((f) => f.symbol === sym)?.close ?? NaN
    const exitOf = (sym: string) => (klines.get(sym) ?? []).find((c) => c.openTime === ts)?.close ?? null

    // ---- keputusan semua varian (memori saat ini = hanya dari hari < D) ----
    const results: { v: Variant; picks: { symbol: string; direction: 'BUY' | 'SELL'; conf: number; mem: string }[] }[] = []
    for (const v of variants) {
      const r = decideV4(factors, norm, closes, regime, m4h, v, day)
      results.push({ v, picks: r.picks })
    }

    // ---- diag: apa kata memori vs kenyataan (dari varian V4a) ----
    for (const p of results[1].picks) {
      const bucket = factorBucket(norm.get(p.symbol)!)
      const b3 = coarseBucket(norm.get(p.symbol))
      const me = memoryEdge(regime.regime, p.symbol, bucket, b3, p.direction)
      const entry = entryOf(p.symbol), exit = exitOf(p.symbol)
      if (!Number.isFinite(entry) || exit === null) continue
      const ret = ((exit - entry) / entry)
      if (me.level === 'SIMBOL' || me.level === 'BUCKET3') {
        if (me.edge > 0) { diagBeforePos += ret; diagBeforePosN++ }
        else { diagBeforeNeg += ret; diagBeforeNegN++ }
      } else { diagNoMem += ret; diagNoMemN++ }
    }

    // ---- vonis realita + skor varian ----
    for (const { v, picks } of results) {
      let sum = 0, cnt = 0
      for (const p of picks) {
        const entry = entryOf(p.symbol), exit = exitOf(p.symbol)
        if (!Number.isFinite(entry) || exit === null) continue
        const ret = ((exit - entry) / entry) * (p.direction === 'BUY' ? 1 : -1)
        v.sums += ret; sum += ret; v.n++; cnt++
        if (ret > 0) v.hits++
      }
      v.perDay.set(day, cnt ? sum / cnt : 0)
    }

    // ---- panen memori DARI HASIL V4a (walk-forward, persis sistem asli) ----
    for (const p of results[1].picks) {
      const bucket = factorBucket(norm.get(p.symbol)!)
      const b3 = coarseBucket(norm.get(p.symbol))
      const entry = entryOf(p.symbol), exit = exitOf(p.symbol)
      if (!Number.isFinite(entry) || exit === null) continue
      const ret = (exit - entry) / entry
      const hit = ret > 0 ? 1 : 0
      const keys: [Map<string, MemAgg>, string][] = [
        [polaFine, `P8|${regime.regime}|${bucket}|${p.direction}`],
        [polaCoarse, `P3|${regime.regime}|${b3}|${p.direction}`],
        [polaRegime, `PR|${regime.regime}|${p.direction}`],
        [epsMem, `E|${regime.regime}|${p.symbol}|${p.direction}`],
      ]
      for (const [m, key] of keys) {
        const cur = m.get(key) ?? { n: 0, sumRet: 0, hit: 0 }
        m.set(key, { n: cur.n + 1, sumRet: cur.sumRet + ret, hit: cur.hit + hit })
      }
    }

    const line = variants.map((v) => `${v.name.slice(0, 4)}=${((v.perDay.get(day) ?? 0) * 100).toFixed(1)}%`).join(' ')
    console.log(`${day} ${regime.regime.padEnd(11)} ${line}`)
  }

  console.log('\n=== DIAG DAYA PREDIKSI INGATAN BERJENJANG (level SIMBOL/BUCKET3) ===')
  if (diagBeforePosN) console.log(`memori bilang BAGUS   (edge>0) : n=${diagBeforePosN}  avg next ${(diagBeforePos / diagBeforePosN * 100).toFixed(2)}%`)
  if (diagBeforeNegN) console.log(`memori bilang BURUK   (edge<0) : n=${diagBeforeNegN}  avg next ${(diagBeforeNeg / diagBeforeNegN * 100).toFixed(2)}%`)
  if (diagNoMemN) console.log(`memori lemah/baru               : n=${diagNoMemN}  avg next ${(diagNoMem / diagNoMemN * 100).toFixed(2)}%`)
  console.log(`ukuran memori: fine=${polaFine.size} coarse=${polaCoarse.size} regime=${polaRegime.size} simbol=${epsMem.size}`)

  console.log('\n=== HASIL LAB 21 HARI ===')
  for (const v of variants) {
    const cum = [...v.perDay.values()].reduce((s, r) => s + r, 0)
    const hit = v.n ? Math.round((v.hits / v.n) * 100) : 0
    console.log(`${v.name.padEnd(28)} kumulatif=${(cum * 100).toFixed(1)}%  pick=${v.n}  hit=${hit}%  veto=${v.vetoes.length}`)
  }
  const v3 = variants[0], v4b = variants[2]
  console.log(`\nCatatan veto V4b (10 contoh): ${v4b.vetoes.slice(0, 10).join(' | ') || '-'}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
