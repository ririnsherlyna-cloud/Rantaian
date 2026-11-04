// ============================================================
// OTAK MICAPROFITA V2 "PREDATOR" — mesin keputusan arah BINER.
//
// Hasil UJIAN lab (21 hari, bebas kebocoran):
//   otak lama +30.5%  <  MOMENTUM naif +82.5%  <  PREDATOR +146.6%
// Prinsip yang terbukti:
//   1. Universe DINAMIS per hari (top likuiditas candle terakhir)
//   2. Kepemimpinan momentum = antrian utama (pump berlanjut 1-3 hari)
//   3. Konsentrasi adaptif: pasar lemah → K=1 fokus leader terkuat
//   4. Mode parabolik: leader mom7 > paraK → K=2 (naiki pelari)
//   5. SELL menggerus profit di arena harian → hanya opsional (knob)
//   6. Kewajiban wajib tetap: likuiditas, ATR, korelasi, data cukup
// Genome V2 = knob STRUKTUR (bukan sekadar bobot) → evolusi nyata.
// ============================================================

import { CoinFactors, FACTOR_IDS, FACTOR_LABEL, FactorId, factorBucket, coarseBucket, rankNormalize } from './factors'
import { RegimeInfo, corr } from './market'

export type Weights = Record<FactorId, number>

// Bobot komposit untuk slot ANCHOR + skor bukti briefing (dapat berevolusi)
export const DEFAULT_WEIGHTS: Weights = {
  mom7: 1.4, mom30: 0.6, emaAlign: 1.0, rsi: 0.4,
  volSurge: 0.9, atrInv: 0.35, distHigh: 0.8, btcCorr: 0.2,
}

// ---------- GENOME V2: knob struktur ----------
export interface GenomeV2 {
  kBase: number // 2..4 — jumlah pick BUY dasar
  paraK: number // 0..200 — mom7 leader di atas ini → mode parabolik K=2
  breadthK2: number // 25..60 — breadth < ini → K≤2
  breadthK1: number // 15..45 — breadth < ini → K=1 (fokus total)
  atrCap: number // 10..20 — ATR maksimum pick
  corrCap: number // 0.8..0.98 — anti-tumpang-tindih
  sellOn: boolean // SELL saat rezim turun (hasil lab: false = lebih untung)
  anchorOn: boolean // slot terakhir = anchor kualitas komposit
  minNorm: number // 0..0.9 — kualitas komposit minimum leader
  m4hReject: number // -12..0 — ambang tolak leader mati 4 jam. LAB UJIAN#7: hard-reject memangkas pemenang (213→211.7%) → default 0 (OFF, knob dorman; evolusi boleh menyalakan bila rezim berubah)
  memVetoOn: boolean // UPGRADE V4 — MEMVETO: skip kandidat saat ingatan berjenjang bilang pola ini biasanya gagal (BUCKET3 n>=4 avg<=-3% hit<30%). LAB UJIAN#8: 2 veto mengganti leader layu dgn kandidat kuat → +212.9% → +233.7%
}

export const DEFAULT_GENOME_V2: GenomeV2 = {
  kBase: 3, paraK: 60, breadthK2: 45, breadthK1: 32,
  atrCap: 16, corrCap: 0.95, sellOn: false, anchorOn: true, minNorm: 0.5,
  m4hReject: 0,
  memVetoOn: true,
}

export function sanitizeGenomeV2(g: Partial<GenomeV2> | null | undefined): GenomeV2 {
  const d = DEFAULT_GENOME_V2
  const num = (v: unknown, def: number, lo: number, hi: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : def
    return Math.min(hi, Math.max(lo, n))
  }
  return {
    kBase: Math.round(num(g?.kBase, d.kBase, 2, 4)),
    paraK: Math.round(num(g?.paraK, d.paraK, 40, 100)),
    breadthK2: Math.round(num(g?.breadthK2, d.breadthK2, 35, 55)),
    breadthK1: Math.round(num(g?.breadthK1, d.breadthK1, 22, Math.max(24, Math.min(42, num(g?.breadthK2, d.breadthK2, 35, 55) - 6)))),
    atrCap: num(g?.atrCap, d.atrCap, 11, 19),
    corrCap: num(g?.corrCap, d.corrCap, 0.8, 0.98),
    sellOn: typeof g?.sellOn === 'boolean' ? g.sellOn : d.sellOn,
    anchorOn: typeof g?.anchorOn === 'boolean' ? g.anchorOn : d.anchorOn,
    minNorm: num(g?.minNorm, d.minNorm, 0, 0.8),
    m4hReject: num(g?.m4hReject, d.m4hReject, -12, 0),
    memVetoOn: typeof g?.memVetoOn === 'boolean' ? g.memVetoOn : d.memVetoOn,
  }
}

export interface PickCandidate {
  symbol: string
  direction: 'BUY' | 'SELL'
  confidence: number
  score: number
  evidence: {
    factors: Record<string, number>
    topReasons: string[]
    duties: { name: string; pass: boolean; note: string }[]
    policy: string[]
    regime: string
    genomeGeneration: number
    /** UPGRADE V4 — bukti ingatan berjenjang yang DIBACA saat keputusan */
    mem?: MemEdge
    /** V278 DEBAT-AGENTIK — transkrip tim merah menyerang rencana sebelum lahir */
    debat?: DebatAgentik
    /** V279 KORTEX — formula karangan-sendiri MICAPROFITA (C·O·R·T·E·X) */
    kortex?: KortexScore
  }
}

// ---------- V278 DEBAT-AGENTIK: TIM MERAH SEBELUM PICK LAHIR ----------
// Mandat pemilik: "bertarung dengan agentic, bukan asal asalan" + "lanjutkan
// sekolah kilat dan pengembang agentic kita". Setiap kandidat yang lolos guard
// tetap DISERANG tim merah: serangan dinyatakan, pertahanan dijawab, tekanan
// diukur — tekanan memangkas keyakinan (ukuran menanggung), bukan diam-diam.
export interface SeranganTimMerah {
  dari: string
  teks: string
}

export interface DebatAgentik {
  serangan: SeranganTimMerah[]
  bertahan: string[]
  /** jumlah serangan tanpa jawaban — memangkas keyakinan 3 poin/serangan */
  tekanan: number
  /** LOLOS TANPA GIGITAN / BERTAHAN / GETARAN */
  vonis: string
}

// ---------- V279 KORTEX — FORMULA KARANGAN-SENDIRI MICAPROFITA ----------
// Mandat pemilik: "ciptakan formula sendiri — kuasai paham AGI dan kesadaran
// matang". KORTEX menilai setiap pick dengan enam komponen berangka:
//   C Confluensi  — kualitas struktur 8 faktor (komposit ternormalisasi 0..1)
//   O Opposition — ketahanan lawan tim merah: bertahan/(bertahan+serangan)
//   R Recall     — ingatan berjenjang: (1+tanh(edge×15))/2 (BARU = 0.5 netral)
//   T Timing     — konfirmasi intraday m4h: ≥+2%→1.0 · 0..2→0.6 · −2..0→0.35 · <−2→0.15
//   E Ekspektansi— buku cuan hidup: clamp(0.5+ekspektansiR×1.5, 0.05, 1)
//   X X-ruang    — ruang volatilitas: clamp(1.25−ATR%/cap, 0.1, 1)
// HUKUM: KORTEX menyesuaikan keyakinan MAKSIMAL ±4 poin (ukuran menanggung);
// ia tidak pernah memveto — veto tetap monopoli guard & MEMVETO.
export interface KortexScore {
  C: number; O: number; R: number; T: number; E: number; X: number
  /** 0..100 */ skor: number
  rumus: string
}

export interface KortexBuku {
  ekspektansiR?: number | null
  winRate?: number | null
  totalPlan?: number
}

export function kortexScore(
  C: number,
  debat: DebatAgentik,
  me: MemEdge,
  m4: number,
  buku: KortexBuku | null | undefined,
  atrPct: number,
  atrCap: number,
): KortexScore {
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  // O — opposition: serangan tanpa pertahanan menurunkan; tanpa keduanya = netral
  const totalSerang = debat.bertahan.length + debat.serangan.length
  const O = totalSerang === 0 ? 0.5 : clamp01(debat.bertahan.length / totalSerang)
  // R — recall ingatan: sampel kurang dari 3 episode = netral 0.5
  const R = me.level === 'BARU' || me.n < 3 ? 0.5 : clamp01((1 + Math.tanh(me.edge * 15)) / 2)
  // T — timing intraday
  const T = m4 >= 2 ? 1.0 : m4 >= 0 ? 0.6 : m4 >= -2 ? 0.35 : 0.15
  // E — ekspektansi buku cuan hidup (tanpa buku = netral, tanpa kebocoran)
  const E = !buku || typeof buku.ekspektansiR !== 'number' || buku.totalPlan === 0
    ? 0.5
    : clamp01(0.5 + buku.ekspektansiR * 1.5)
  // X — ruang volatilitas di bawah cap
  const X = clamp01(1.25 - atrPct / Math.max(1, atrCap))
  const skor = Math.round(100 * (0.32 * C + 0.22 * O + 0.16 * R + 0.14 * T + 0.09 * E + 0.07 * X))
  return {
    C: Math.round(C * 100) / 100, O: Math.round(O * 100) / 100, R: Math.round(R * 100) / 100,
    T, E: Math.round(E * 100) / 100, X: Math.round(X * 100) / 100,
    skor,
    rumus: 'KORTEX = 100×(0.32·C + 0.22·O + 0.16·R + 0.14·T + 0.09·E + 0.07·X) — formula karangan-sendiri MICAPROFITA',
  }
}

// ---------- INGATAN BERJENJANG (UPGRADE V4 "SADAR-INGATAN") ----------
// Temuan forensik UJIAN #8: ingatan POLA/EPISODE dipanen tiap hari TAPI
// TIDAK PERNAH dibaca saat keputusan (organ mati). Akar masalah: bucket
// 8-faktor = 6561 kombinasi → n>=3 hampir mustahil tercapai. Solusi lab:
// jenjang SIMBOL → BUCKET3 (27 kombinasi) → REZIM. Memori kini hidup.
export interface MemEdge {
  level: 'SIMBOL' | 'BUCKET3' | 'REZIM' | 'LEMAH' | 'BARU'
  n: number
  edge: number // rata-rata ret historis (fraksi)
  hit: number // hit rate historis
}

export interface MemoryLookup {
  edge(regime: string, symbol: string, bucket8: string, bucket3: string, direction: string): MemEdge
  size(): { simbol: number; bucket3: number; rezim: number; episode: number }
}

export interface BrainResult {
  picks: PickCandidate[]
  scored: { symbol: string; score: number }[]
  rejected: { symbol: string; reason: string }[]
  /** V274 SLOT-JUJUR — jumlah slot tempur yang DIRANCANG kebijakan adaptif K.
   *  lahir bisa < k bila kandidat gagal guard; selisih itu WAJIB dipublikasikan
   *  (kebisuan soal penolakan = dusta — pengguna bertanya "kok hanya satu?"). */
  k: number
}

function compositeScore(norm: Record<FactorId, number>, w: Weights): number {
  let s = 0, tot = 0
  for (const id of FACTOR_IDS) {
    s += norm[id] * w[id]
    tot += Math.abs(w[id])
  }
  return tot > 0 ? s / tot : 0
}

export interface PredatorCtx {
  factors: CoinFactors[]
  norm: Map<string, Record<FactorId, number>>
  universeCloses: Map<string, number[]>
  regime: RegimeInfo
  generation: number
  genome: GenomeV2
  weights: Weights
  /** Momentum 24 jam dari candle 4h selesai (UPGRADE V3) — radar leader mati intraday. */
  m4h: Map<string, number>
  /** Simbol yang diveto vonis LLM hari hidup — antrian melewatinya. */
  vetoSymbols?: Set<string>
  /** UPGRADE V4 — ingatan berjenjang yang dibaca saat keputusan (opsional: lab bisa mematikan). */
  memory?: MemoryLookup
  /** V279 KORTEX — buku cuan hidup untuk komponen E (hanya hari hidup; hari lampau
   *  TIDAK boleh membawa buku masa depan — mencegah kebocoran). */
  buku?: KortexBuku | null
}

/**
 * V278 DEBAT-AGENTIK — tim merah menyerang kandidat sebelum lahir.
 * Serangan kelas TEKANAN (ditanggung ukuran, bukan veto): tekanan × 3 poin
 * memangkas keyakinan (cap −12). Pertahanan harus berangka, bukan dalih.
 */
function debatAgentik(
  f: CoinFactors,
  m4: number,
  me: MemEdge,
  breadth: number,
  rank: number,
  composite: number,
  G: GenomeV2,
): DebatAgentik {
  const serangan: SeranganTimMerah[] = []
  const bertahan: string[] = []
  // 1) DISTRIBUSI — menempel puncak tanpa volume
  if (f.distHigh > -3) {
    if (f.volSurge < 1.3)
      serangan.push({ dari: 'DISTRIBUSI', teks: `harga menempel puncak 60h (${f.distHigh.toFixed(1)}%) tanpa lonjakan volume (${f.volSurge.toFixed(2)}x) — breakout tanpa uang nyata kerap jadi jerat distribusi` })
    else
      bertahan.push(`pendakian dekat puncak disertai volume ${f.volSurge.toFixed(2)}x — uang nyata menyertai, bukan kabar kosong`)
  }
  // 2) JENUH — RSI ekstrem tanpa tren utuh
  if (f.rsi > 72) {
    if (f.emaAlign === 1 && f.mom30 > 0)
      bertahan.push(`RSI ${f.rsi.toFixed(0)} jenuh di tren utuh (EMA naik, mom30 +${f.mom30.toFixed(1)}%) — tren kuat menahan jenuh lebih lama dari harapan`)
    else
      serangan.push({ dari: 'JENUH', teks: `RSI ${f.rsi.toFixed(0)} jenuh beli tanpa tren utuh — entry di ekstrem memperkecil ruang RR` })
  }
  // 3) DIVERGENSI — mom7 tanpa akar mom30
  if (f.mom7 > 8 && f.mom30 < 2)
    serangan.push({ dari: 'DIVERGENSI', teks: `mom7 ${f.mom7.toFixed(1)}% tanpa akar mom30 ${f.mom30.toFixed(1)}% — lonjakan tipis rawan pump-n-dump` })
  else if (f.mom7 > 8)
    bertahan.push(`momentum berakar: mom7 ${f.mom7.toFixed(1)}% ditopang mom30 ${f.mom30.toFixed(1)}% — bukan lonjakan tipis`)
  // 4) INTRADAY — radar 4 jam
  if (m4 < 0)
    serangan.push({ dari: 'INTRADAY', teks: `momentum 24j ${m4.toFixed(1)}% — radar 4 jam menunjukkan kelelahan intraday` })
  else
    bertahan.push(`konfirmasi intraday hidup (+${m4.toFixed(1)}%/24j) — leader masih bernapas`)
  // 5) INGATAN — episode serupa biasanya gagal
  if (me.level !== 'BARU' && me.n >= 3) {
    if (me.edge < 0)
      serangan.push({ dari: 'INGATAN', teks: `ingatan: ${me.n} episode serupa rata-rata ${(me.edge * 100).toFixed(1)}% (hit ${(me.hit * 100).toFixed(0)}%) — pola ini sering kalah` })
    else
      bertahan.push(`ingatan memihak: ${me.n} episode serupa rata-rata +${(me.edge * 100).toFixed(1)}%`)
  }
  // 6) ATR-LEBAR — stop lebar memangkas RR
  if (f.atrPct > G.atrCap * 0.75) {
    if (f.volSurge >= 1.5)
      bertahan.push(`ATR ${f.atrPct.toFixed(1)}% didukung volume ${f.volSurge.toFixed(2)}x — volatilitas nyata, bukan noise tipis`)
    else
      serangan.push({ dari: 'ATR-LEBAR', teks: `ATR ${f.atrPct.toFixed(1)}% mendekati cap ${G.atrCap.toFixed(0)}% — stop wajib lebar, ukuran otomatis menyusut` })
  }
  // 7) BREATH-SEMPIT — pelari kedua di pasar sempit
  if (breadth < 40 && rank > 0) {
    if (composite > 0.6)
      bertahan.push(`pasar sempit tapi komposit ${composite.toFixed(2)} — kualitas di atas kerumunan`)
    else
      serangan.push({ dari: 'BREATH', teks: `breadth ${breadth.toFixed(0)}% — pelari kedua jarang hidup di pasar sempit; pemimpin kedua kualitas ${composite.toFixed(2)}` })
  }
  const tekanan = serangan.length
  const vonis = tekanan === 0
    ? 'LOLOS TANPA GIGITAN — tim merah menyerang struktur, tak ada serangan berangka'
    : tekanan <= 2
      ? `BERTAHAN — tekanan ${tekanan} serangan; keyakinan dipangkas ${Math.min(12, tekanan * 3)} poin, ukuran yang menanggung`
      : `GETARAN — tekanan ${tekanan} serangan tanpa jawaban; keyakinan dipangkas ${Math.min(12, tekanan * 3)} poin (cap)`
  return { serangan, bertahan, tekanan, vonis }
}

export function decidePredator(ctx: PredatorCtx): BrainResult {
  const { factors, norm, universeCloses, regime, generation, genome: G, weights: W, memory: MEM } = ctx
  const breadth = regime.breadth
  const m4hOf = (sym: string) => ctx.m4h.get(sym) ?? 0
  const vetoed = (sym: string) => ctx.vetoSymbols?.has(sym) ?? false
  const b3Of = (sym: string) => coarseBucket(norm.get(sym))
  const memOf = (sym: string, dir: string): MemEdge =>
    MEM ? MEM.edge(regime.regime, sym, factorBucket(norm.get(sym) ?? {} as Record<FactorId, number>), b3Of(sym), dir)
      : { level: 'BARU', n: 0, edge: 0, hit: 0 }

  // ---------- antrian: kepemimpinan momentum MURNI (terbukti lab),
  // konfirmasi 4 jam tie-break kedua, ingatan berjenjang tie-break ketiga,
  // komposit tie-break terakhir ----------
  const ranked = [...factors].filter((f) => !vetoed(f.symbol)).sort((a, b) => {
    if (b.mom7 !== a.mom7) return b.mom7 - a.mom7
    const m4 = m4hOf(b.symbol) - m4hOf(a.symbol)
    if (Math.abs(m4) > 0.01) return m4
    if (MEM) {
      const ma = memOf(a.symbol, 'BUY').edge, mb = memOf(b.symbol, 'BUY').edge
      if (Math.abs(mb - ma) > 0.002) return mb - ma
    }
    const na = norm.get(a.symbol), nb = norm.get(b.symbol)
    return compositeScore(nb ?? ({} as Record<FactorId, number>), W) - compositeScore(na ?? ({} as Record<FactorId, number>), W)
  })

  const compositeOf = (sym: string) => compositeScore(norm.get(sym) ?? ({} as Record<FactorId, number>), W)

  // ---------- kebijakan adaptif K ----------
  const leaderMom7 = ranked.length ? ranked[0].mom7 : 0
  let k = G.kBase
  const policy: string[] = []
  if (G.paraK > 0 && leaderMom7 > G.paraK) {
    k = Math.min(k, 2)
    policy.push(`MODE PARABOLIK: leader mom7 ${leaderMom7.toFixed(0)}% > ${G.paraK} → K=${k} (naiki pelari, jangan encerkan)`)
  }
  if (breadth < G.breadthK2) {
    k = Math.min(k, 2)
    policy.push(`Breadth ${breadth.toFixed(0)}% < ${G.breadthK2}% → K=${k}`)
  }
  if (breadth < G.breadthK1) {
    k = 1
    policy.push(`Breadth ${breadth.toFixed(0)}% < ${G.breadthK1}% → K=1 FOKUS leader terkuat`)
  }
  if (regime.regime === 'JATUH') {
    k = Math.min(k, 1)
    policy.push('Rezim JATUH → K=1 hanya leader absolut')
  }

  const picks: PickCandidate[] = []
  const rejected: { symbol: string; reason: string }[] = []

  const mkDuties = (f: CoinFactors) => {
    const duties: { name: string; pass: boolean; note: string }[] = []
    const push = (name: string, pass: boolean, note: string) => duties.push({ name, pass, note })
    const m4 = m4hOf(f.symbol)
    push('Likuiditas', true, `Top-40 likuiditas hari ini (universe dinamis)`)
    push(`Volatilitas ≤ ${G.atrCap.toFixed(0)}%`, f.atrPct <= G.atrCap, `ATR ${f.atrPct.toFixed(1)}%`)
    push(
      'Konfirmasi 4 jam',
      !(G.m4hReject < 0 && m4 < G.m4hReject),
      `Momentum 24 jam (4h) ${m4 >= 0 ? '+' : ''}${m4.toFixed(1)}% — ${m4 >= 0 ? 'leader masih hidup intraday' : m4 < G.m4hReject ? 'leader mati intraday' : 'melemah, dipantau'}`,
    )
    push('Data cukup', (universeCloses.get(f.symbol) ?? []).length >= 30, `${(universeCloses.get(f.symbol) ?? []).length} candle`)
    return duties
  }

  // ---------- BUY: uriutan kepemimpinan ----------
  const buys: { f: CoinFactors; score: number }[] = []
  for (const f of ranked) {
    if (buys.length >= k) break
    // UPGRADE V3 — radar leader mati: bukti UJIAN #7, pick dengan momentum
    // 24 jam di bawah ambang rata-rata -2.7% hit 38%; jangan naiki mayat.
    const m4 = m4hOf(f.symbol)
    if (G.m4hReject < 0 && m4 < G.m4hReject) {
      rejected.push({ symbol: f.symbol, reason: `Momentum 4 jam ${m4.toFixed(1)}% < ${G.m4hReject}% — leader mati intraday` })
      continue
    }
    const duties = mkDuties(f)
    if (f.atrPct > G.atrCap) { rejected.push({ symbol: f.symbol, reason: `ATR ${f.atrPct.toFixed(1)}% > ${G.atrCap}` }); continue }
    if ((universeCloses.get(f.symbol) ?? []).length < 30) { rejected.push({ symbol: f.symbol, reason: 'Data kurang' }); continue }
    // UPGRADE V4 — MEMVETO: ingatan berjenjang berkata pola ini biasanya gagal.
    // Hanya menyala di kasus ekstrem (BUCKET3 n>=4, avg<=-3%, hit<30%) — surgikal.
    if (G.memVetoOn && MEM) {
      const me = memOf(f.symbol, 'BUY')
      if (me.level === 'BUCKET3' && me.n >= 4 && me.edge <= -0.03 && me.hit < 0.3) {
        rejected.push({ symbol: f.symbol, reason: `MEMVETO: ingatan ${me.n} episode serupa rata-rata ${(me.edge * 100).toFixed(1)}% (hit ${(me.hit * 100).toFixed(0)}%) — pola biasanya gagal` })
        continue
      }
    }
    // anti-tumpang-tindih
    const cl = universeCloses.get(f.symbol) ?? []
    let overlap = false
    for (const b of buys) {
      const clp = universeCloses.get(b.f.symbol) ?? []
      const c = Math.abs(corr(cl.slice(-30), clp.slice(-30)))
      if (c > G.corrCap) { overlap = true; rejected.push({ symbol: f.symbol, reason: `Korelasi ${c.toFixed(2)} dengan ${b.f.symbol}` }); break }
    }
    if (overlap) continue
    const nrm = norm.get(f.symbol) ?? ({} as Record<FactorId, number>)
    if ((nrm.mom7 ?? 0) < G.minNorm * 2 - 1 && buys.length > 0) {
      rejected.push({ symbol: f.symbol, reason: 'Kualitas komposit di bawah standar' })
      continue
    }
    buys.push({ f, score: compositeOf(f.symbol) })
  }

  // ---------- slot ANCHOR kualitas (opsional) ----------
  if (G.anchorOn && buys.length < k && k >= 3 && buys.length >= 1) {
    const taken = new Set(buys.map((b) => b.f.symbol))
    const anchorCand = [...factors]
      .filter((f) => !taken.has(f.symbol))
      .sort((a, b) => compositeOf(b.symbol) - compositeOf(a.symbol))
    for (const f of anchorCand) {
      const nrm = norm.get(f.symbol) ?? ({} as Record<FactorId, number>)
      if ((nrm.mom7 ?? 0) < -0.2) break // jangan ambil yang momentumnya runtuh
      const duties = mkDuties(f)
      if (f.atrPct > G.atrCap || (universeCloses.get(f.symbol) ?? []).length < 30) continue
      const cl = universeCloses.get(f.symbol) ?? []
      let overlap = false
      for (const b of buys) {
        const clp = universeCloses.get(b.f.symbol) ?? []
        if (Math.abs(corr(cl.slice(-30), clp.slice(-30))) > G.corrCap) { overlap = true; break }
      }
      if (overlap) continue
      buys.push({ f, score: compositeOf(f.symbol) })
      policy.push(`Slot ANCHOR kualitas diisi ${f.symbol} (komposit struktur+volume)`)
      break
    }
  }

  for (let bi = 0; bi < buys.length; bi++) {
    const b = buys[bi]
    const nrm = norm.get(b.f.symbol) ?? ({} as Record<FactorId, number>)
    const topIds = [...FACTOR_IDS].sort((x, y) => (nrm[y] ?? 0) * W[y] - (nrm[x] ?? 0) * W[x]).slice(0, 3)
    const m4 = m4hOf(b.f.symbol)
    const me = memOf(b.f.symbol, 'BUY')
    // V278 DEBAT-AGENTIK — tim merah dulu, keyakinan menanggung tekanannya
    const debat = debatAgentik(b.f, m4, me, breadth, bi, b.score, G)
    // V279 KORTEX — formula karangan-sendiri menilai pick; keyakinan menyesuaikan maksimal ±4
    const kortex = kortexScore(b.score, debat, me, m4, ctx.buku ?? null, b.f.atrPct, G.atrCap)
    const kxAdj = Math.max(-4, Math.min(4, Math.round((kortex.skor - 58) / 6)))
    const conf = Math.max(35, Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4 >= 0 ? 4 : -6) + (breadth > 55 ? 6 : 0) + (k === 1 ? 6 : 0)
      + Math.max(-8, Math.min(8, me.edge * 100 * 0.5))
      - Math.min(12, debat.tekanan * 3)
      + kxAdj)))
    picks.push({
      symbol: b.f.symbol,
      direction: 'BUY',
      confidence: conf,
      score: b.score,
      evidence: {
        factors: { ...nrm, m4h: Math.round(m4 * 10) / 10 } as unknown as Record<string, number>,
        topReasons: [
          `Konfirmasi 4 jam: momentum 24 jam ${m4 >= 0 ? '+' : ''}${m4.toFixed(1)}%`,
          ...(me.level !== 'BARU' && me.n >= 2
            ? [`Ingatan ${me.level}: ${me.n} episode serupa → rata-rata ${me.edge >= 0 ? '+' : ''}${(me.edge * 100).toFixed(1)}%, hit ${(me.hit * 100).toFixed(0)}%`]
            : []),
          ...topIds.map((id) => `${FACTOR_LABEL[id]}: ${describeFactor(id, b.f, nrm[id] ?? 0)}`),
        ],
        duties: [
          ...mkDuties(b.f),
          { name: 'Ingatan berjenjang', pass: true, note: me.level === 'BARU' ? 'belum ada episode serupa (n=0)' : `${me.level}: n=${me.n}, rata-rata ${(me.edge * 100).toFixed(1)}%, hit ${(me.hit * 100).toFixed(0)}%` },
          { name: 'Debat tim merah (V278)', pass: debat.tekanan <= 2, note: debat.vonis },
          { name: 'KORTEX karangan-sendiri (V279)', pass: kortex.skor >= 50, note: `skor ${kortex.skor}/100 — C ${kortex.C} · O ${kortex.O} · R ${kortex.R} · T ${kortex.T} · E ${kortex.E} · X ${kortex.X}${kxAdj !== 0 ? ` · keyakinan ${kxAdj > 0 ? '+' : ''}${kxAdj}` : ''}` },
        ],
        policy,
        regime: regime.regime,
        genomeGeneration: generation,
        mem: me,
        debat,
        kortex,
      },
    })
  }

  // ---------- SELL opsional (knob sellOn; hasil lab: menggerus profit) ----------
  if (G.sellOn && (regime.regime === 'TREND_TURUN' || regime.regime === 'JATUH')) {
    const maxSell = regime.regime === 'JATUH' ? 2 : 1
    let sells = 0
    for (let i = ranked.length - 1; i >= 0 && sells < maxSell; i--) {
      const f = ranked[i]
      const nrm = norm.get(f.symbol) ?? ({} as Record<FactorId, number>)
      if ((nrm.mom7 ?? 0) > -0.35) break
      if (f.atrPct > G.atrCap + 2) { rejected.push({ symbol: f.symbol, reason: 'ATR ekstrem utk SELL' }); continue }
      picks.push({
        symbol: f.symbol,
        direction: 'SELL',
        confidence: Math.round(Math.min(92, 44 + Math.abs(nrm.mom7 ?? 0) * 24)),
        score: -compositeOf(f.symbol),
        evidence: {
          factors: nrm as unknown as Record<string, number>,
          topReasons: [...FACTOR_IDS].sort((x, y) => (nrm[x] ?? 0) * W[x] - (nrm[y] ?? 0) * W[y]).slice(0, 3)
            .map((id) => `${FACTOR_LABEL[id]}: ${describeFactor(id, f, nrm[id] ?? 0)}`),
          duties: [
            { name: 'Likuiditas', pass: true, note: 'Top-40 likuiditas hari ini' },
            { name: 'Rezim', pass: true, note: `${regime.regime}: SELL legal (knob sellOn aktif)` },
          ],
          policy,
          regime: regime.regime,
          genomeGeneration: generation,
        },
      })
      sells++
    }
  }

  const scoredAll = factors
    .map((f) => ({ symbol: f.symbol, score: compositeOf(f.symbol) }))
    .sort((a, b) => b.score - a.score)

  return { picks, scored: scoredAll, rejected, k }
}

function describeFactor(id: FactorId, f: CoinFactors, norm: number): string {
  const sgn = norm >= 0 ? '+' : ''
  switch (id) {
    case 'mom7': return `${f.mom7 >= 0 ? '+' : ''}${f.mom7.toFixed(1)}% / 7 hari (${sgn}${norm.toFixed(2)})`
    case 'mom30': return `${f.mom30 >= 0 ? '+' : ''}${f.mom30.toFixed(1)}% / 30 hari (${sgn}${norm.toFixed(2)})`
    case 'emaAlign': return f.emaAlign === 1 ? 'harga > EMA20 > EMA50, struktur naik utuh' : f.emaAlign === -1 ? 'harga < EMA20 < EMA50, struktur turun' : 'struktur campur'
    case 'rsi': return `RSI ${f.rsi.toFixed(0)} ${f.rsi > 75 ? '(jenuh beli)' : f.rsi < 30 ? '(jenuh jual)' : '(sehat)'}`
    case 'volSurge': return `Volume ${f.volSurge.toFixed(2)}x rata-rata 20 hari`
    case 'atrInv': return `ATR ${f.atrPct.toFixed(1)}%/hari`
    case 'distHigh': return `${f.distHigh.toFixed(1)}% dari puncak 60 hari`
    case 'btcCorr': return `korelasi BTC ${f.btcCorr.toFixed(2)}`
  }
}

/** Sidik jari pola (tanpa simbol) untuk memori pola. */
export function patternFingerprint(regime: string, bucket: string, direction: string): string {
  return fnv1a(`POLA|${regime}|${bucket}|${direction}`).toString(16)
}
/** UPGRADE V4 — sidik jari bucket kasar 3-faktor (jenjang tengah memori). */
export function coarsePolaFingerprint(regime: string, bucket3: string, direction: string): string {
  return fnv1a(`POLA3|${regime}|${bucket3}|${direction}`).toString(16)
}
/** UPGRADE V4 — sidik jari level rezim (jenjang paling kasar). */
export function regimePolaFingerprint(regime: string, direction: string): string {
  return fnv1a(`POLAR|${regime}|${direction}`).toString(16)
}
export function episodeFingerprint(regime: string, symbol: string, bucket: string, direction: string): string {
  return fnv1a(`EPS|${regime}|${symbol}|${bucket}|${direction}`).toString(16)
}
export function rivalFingerprint(regime: string, bucket: string, direction: string): string {
  return fnv1a(`RIVAL|${regime}|${bucket}|${direction}`).toString(16)
}
export function lessonFingerprint(text: string): string {
  return fnv1a(`PELAJARAN|${text}`).toString(16)
}

/** FNV-1a 32-bit — alamat memori deterministik, dedup mustahil gagal. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export { factorBucket, coarseBucket }
