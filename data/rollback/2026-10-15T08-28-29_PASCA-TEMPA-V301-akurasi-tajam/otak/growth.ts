// ============================================================
// SISTEM PERTUMBUHAN (UPGRADE V5) — mesin pertumbuhan terukur
// MICAPROFITA, dibangun dari studi sistem pertumbuhan AI dunia
// nyata (research/growth_systems.json):
//   • SELF-IMPROVEMENT LOOP : tambang kelemahan → usulkan →
//     validasi → promosikan (organ TUMBUH mendiagnosis tiap hari)
//   • SELF-PLAY (AlphaGo Zero) : arena harian = loop pertarungan
//   • SKILL LIBRARY (Voyager) : kemahiran = pola terverifikasi
//   • KONSOLIDASI MEMORI (CLS) + REPLAY anti-lupa (FOREVER)
//   • LEVELS OF AGI (DeepMind) : kecerdasan = performa ×
//     generalitas × otonomi → ANGKA AGI% yang jujur & terukur
//
// Filosofi: user berkata "cyborg kita masih 1% AI". Kita buat
// angka itu TERUKUR — bukan perasaan — lalu menaikkannya tiap
// hari lewat kurikulum yang dihasilkan sendiri dari kelemahan.
//
//   AGI% = P(domain kripto) × G(generalitas) × A(otonomi) × 100
//
// P dihitung WALK-FORWARD per hari teradili (bebas kebocoran —
// hanya pick yang sudah teradili s/d hari-D yang dihitung).
// ============================================================

import { db } from '@/lib/db'

// ---------------- peta kemampuan (G — generalitas) ----------------

interface FlagDef { id: string; label: string; on: boolean; sinceEvent?: string }

// Tugas yang dikuasai cyborg — perluasan daftar ini menaikkan G.
const TASKS: FlagDef[] = [
  { id: 'arah', label: 'Panggilan arah biner BUY/SELL', on: true },
  { id: 'antikor', label: 'Manajemen anti-korelasi antar pick', on: true },
  { id: 'evolusi', label: 'Evolusi genome dari vonis nyata', on: true },
  { id: 'memori', label: 'Ingatan berjenjang dibaca saat keputusan', on: true, sinceEvent: 'V4 SADAR-INGATAN' },
  { id: 'radar4h', label: 'Radar intraday 4 jam + denyut hidup', on: true, sinceEvent: 'radar 4 jam' },
  { id: 'veto', label: 'Veto & konfirmasi berita (LLM + web search)', on: true, sinceEvent: 'vonis LLM' },
  { id: 'iklim', label: 'Sensor iklim makro (F&G, mcap, dominasi, funding)', on: true, sinceEvent: 'V4 SADAR-INGATAN' },
  { id: 'sizing', label: 'Ukuran posisi adaptif (sizing)', on: false },
  { id: 'eksekusi', label: 'Eksekusi & manajemen risiko (SL/TP/trailing)', on: false },
  { id: 'sektor', label: 'Rotasi sektor & pemetaan narasi pasar', on: false },
  { id: 'portofolio', label: 'Portofolio multi-hari (bukan pick harian lepas)', on: false },
  { id: 'derivatif', label: 'Perdagangan derivatif (perp/options)', on: false },
]

// Modalitas informasi yang dicerna — perluasan menaikkan G.
const MODALITIES: FlagDef[] = [
  { id: 'kline1d', label: 'Candle harian (Binance)', on: true },
  { id: 'kline4h', label: 'Candle 4 jam (radar intraday)', on: true, sinceEvent: 'radar 4 jam' },
  { id: 'kline1h', label: 'Candle 1 jam (sparkline denyut)', on: true, sinceEvent: 'V4 SADAR-INGATAN' },
  { id: 'funding', label: 'Funding rate futures', on: true, sinceEvent: 'V4 SADAR-INGATAN' },
  { id: 'fng', label: 'Fear & Greed index', on: true, sinceEvent: 'V4 SADAR-INGATAN' },
  { id: 'global', label: 'Market cap global & dominasi BTC', on: true, sinceEvent: 'V4 SADAR-INGATAN' },
  { id: 'berita', label: 'Berita & web search (LLM)', on: true, sinceEvent: 'vonis LLM' },
  { id: 'onchain', label: 'Data on-chain (transfer, holder, TVL)', on: false },
  { id: 'sosial', label: 'Sentimen sosial (X/Reddit/Telegram)', on: false },
  { id: 'orderbook', label: 'Orderbook & open interest', on: false },
]

// Cyborg hanya beroperasi di 1 dari ~10 domain ekonomi utama
// (crypto, saham, fx, komoditas, makro/policy, real-estate, dst).
const DOMAIN_SHARE = 0.1

// ---------------- otonomi (A) ----------------

const AUTONOMY = [
  { id: 'siklus', label: 'Siklus harian berjalan sendiri (denyut arena tanpa tombol)', score: 1.0 },
  { id: 'vonis', label: 'Mengadili dirinya dengan realita candle (vonis realita)', score: 1.0 },
  { id: 'diag', label: 'Mendiagnosis kelemahan dirinya (organ TUMBUH)', score: 0.75 },
  { id: 'perbaik', label: 'Memperbaiki diri: evolusi otomatis, upgrade struktural masih dari pengembang', score: 0.45 },
  { id: 'antilupa', label: 'Konsolidasi & replay memori anti-lupa', score: 0.7 },
]

// ---------------- tangga level (Levels of AGI, kripto-narrow) ----------------

interface LadderRung { min: number; id: string; name: string; desc: string }
const LADDER: LadderRung[] = [
  { min: 0, id: 'L0', name: 'BAKI CALON', desc: 'belum ada bukti kecerdasan terukur' },
  { min: 0.5, id: 'L1', name: 'EMERGING', desc: 'kemampuan dasar mulai muncul (sekelas pemula yang patuh pola)' },
  { min: 2, id: 'L2', name: 'KOMPETEN-NARROW', desc: 'kompeten utk kripto-narrow — sekelas trader median di arena' },
  { min: 4, id: 'L3', name: 'AHLI', desc: 'persentil-90 ahli kripto-narrow' },
  { min: 7, id: 'L4', name: 'VIRTUOSO', desc: 'persentil-99 — di atas hampir semua manusia di niche ini' },
  { min: 12, id: 'L5', name: 'SUPER-NARROW', desc: 'melampaui manusia terbaik utk kripto-narrow (kelas AlphaGo utk go)' },
  { min: 20, id: 'L6', name: 'AGI-KRIPTO', desc: 'otonom penuh + generalitas lintas tugas kripto' },
]

function rankOf(agiPct: number) {
  let r = LADDER[0]
  for (const l of LADDER) if (agiPct >= l.min) r = l
  const idx = LADDER.indexOf(r)
  const next = LADDER[idx + 1] ?? null
  return { ...r, next: next ? { id: next.id, name: next.name, min: next.min } : null }
}

// ---------------- helper ----------------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const r2 = (v: number) => Math.round(v * 100) / 100
const r4 = (v: number) => Math.round(v * 10000) / 10000

interface RawMetrics {
  cumPct: number; n: number; hit: number; brier: number
  verifN: number; byteRatio: number
  symN: number; regimesN: number; pickN: number
  upgradesN: number; evolveDaysN: number; totalDays: number; recoverRate: number
}

const DIM_DEFS = [
  { id: 'PROFIT', label: 'Laba Kumulatif', w: 0.26 },
  { id: 'AKURASI', label: 'Akurasi Arah', w: 0.18 },
  { id: 'KALIBRASI', label: 'Kalibrasi Diri', w: 0.13 },
  { id: 'INGATAN', label: 'Ingatan Hidup', w: 0.15 },
  { id: 'CAKUPAN', label: 'Cakupan Radar', w: 0.13 },
  { id: 'ADAPTASI', label: 'Adaptasi Diri', w: 0.15 },
] as const

/** 6 dimensi P dari metrik mentah — dipakai walk-forward & proyeksi kurikulum. */
function dimsFrom(m: RawMetrics): Record<string, { score: number; detail: string }> {
  const profit = Math.tanh(Math.max(0, m.cumPct) / 130)
  const akurasi = m.n >= 5 ? clamp01((m.hit - 0.3) / 0.4) : 0.05
  const kalibrasi = m.n >= 5 ? clamp01((0.5 - m.brier) / 0.35) : 0.05
  const ingatan = m.verifN > 0
    ? 0.5 * Math.min(1, Math.log(1 + m.verifN) / Math.log(50)) + 0.3 * Math.min(1, m.byteRatio / 6) + 0.2
    : 0.03
  const cakupan = 0.45 * Math.min(1, m.symN / 45) + 0.3 * Math.min(1, m.regimesN / 4) + 0.25 * Math.min(1, m.pickN / 120)
  const adaptasi = 0.4 * Math.min(1, m.upgradesN / 5) + 0.35 * (m.totalDays > 0 ? Math.min(1, m.evolveDaysN / m.totalDays) : 0) + 0.25 * m.recoverRate
  return {
    PROFIT: { score: profit, detail: `kumulatif ${m.cumPct >= 0 ? '+' : ''}${m.cumPct.toFixed(1)}% (tanh /130%)` },
    AKURASI: { score: akurasi, detail: `hit rate ${(m.hit * 100).toFixed(1)}% dari ${m.n} pick` },
    KALIBRASI: { score: kalibrasi, detail: `Brier ${m.brier.toFixed(3)} (keyakinan vs realita)` },
    INGATAN: { score: ingatan, detail: `${m.verifN} pola terverifikasi · kompresi ×${m.byteRatio.toFixed(1)} byte` },
    CAKUPAN: { score: cakupan, detail: `${m.symN} simbol · ${m.regimesN}/4 rezim · ${m.pickN} pick` },
    ADAPTASI: { score: adaptasi, detail: `${m.upgradesN} upgrade · evolusi ${m.evolveDaysN}/${m.totalDays} hari · pulih ${Math.round(m.recoverRate * 100)}%` },
  }
}

/** P = rata-rata geometri berbobot (dimensi lemah menghukum keras — sifat AGI). */
function pFrom(dims: Record<string, { score: number }>): number {
  let s = 0
  for (const d of DIM_DEFS) s += d.w * Math.log(Math.max(0.02, dims[d.id].score))
  return Math.exp(s)
}

// ---------------- pemuatan data ----------------

interface MicaPick { day: string; regime: string; symbol: string; confidence: number; ret: number; hit: boolean }

export async function getGrowthState() {
  const [days, picks, memRows, genomeLogs, events, metaRows] = await Promise.all([
    db.battleDay.findMany({ orderBy: { day: 'asc' } }),
    db.pick.findMany({ include: { battleDay: { select: { day: true, regime: true } } } }),
    db.memoryEpisode.findMany({ take: 4000 }),
    db.genomeLog.findMany({ orderBy: { day: 'asc' } }),
    db.arenaEvent.findMany({ orderBy: [{ day: 'asc' }, { createdAt: 'asc' }], take: 300 }),
    db.meta.findMany(),
  ])
  const metaMap = Object.fromEntries(metaRows.map((m) => [m.key, m.value]))
  const rawEvents = parseInt(metaMap['rawEvents'] ?? '0', 10)

  const dayMap = new Map(days.filter((d) => d.status === 'SCORED').map((d) => [d.day, d]))
  const scoredDays = [...dayMap.keys()].sort()

  // pick MICAPROFITA yang sudah teradili, kronologis
  const mica: MicaPick[] = picks
    .filter((p) => p.competitor === 'MICAPROFITA' && p.ret !== null && p.hit !== null && dayMap.has(p.battleDay.day))
    .map((p) => ({
      day: p.battleDay.day, regime: p.battleDay.regime, symbol: p.symbol,
      confidence: p.confidence, ret: p.ret as number, hit: p.hit as boolean,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // per-pick per-hari (semua kompetitor utk konteks, MICAPROFITA utk metrik)
  const memByFirstDay = new Map<string, typeof memRows>()
  for (const r of memRows) {
    const arr = memByFirstDay.get(r.firstDay) ?? []
    arr.push(r)
    memByFirstDay.set(r.firstDay, arr)
  }
  const nOf = (payload: string, hits: number) => {
    try { return (JSON.parse(payload) as { n?: number }).n ?? hits } catch { return hits }
  }
  const upgradeEvents = events.filter((e) => e.kind === 'UPGRADE')
  const vetoEvents = events.filter((e) => e.kind === 'VONIS' && e.text.includes('VETO'))

  // tanggal pasang flag (G) — dari event UPGRADE; fallback hari pertama
  const todayStr = new Date().toISOString().slice(0, 10)
  const firstDay = scoredDays[0] ?? todayStr
  const resolveSince = (f: FlagDef): string => {
    if (!f.sinceEvent) return firstDay
    const ev = upgradeEvents.find((e) => e.text.toLowerCase().includes(f.sinceEvent!.toLowerCase()))
    return ev?.day ?? firstDay
  }
  const taskFlags = TASKS.map((f) => ({ ...f, sinceDay: resolveSince(f) }))
  const modFlags = MODALITIES.map((f) => ({ ...f, sinceDay: resolveSince(f) }))

  const autonomyScore = AUTONOMY.reduce((s, a) => s + a.score, 0) / AUTONOMY.length

  const gOf = (day: string) => {
    const tb = taskFlags.filter((f) => f.on && f.sinceDay <= day).length / TASKS.length
    const mb = modFlags.filter((f) => f.on && f.sinceDay <= day).length / MODALITIES.length
    return DOMAIN_SHARE * tb * mb
  }

  // ---------- walk-forward: 1 titik kurva per hari teradili ----------
  const symSet = new Set<string>()
  const regimeSet = new Set<string>()
  const evolveDaySet = new Set<string>()
  const dayRetAgg = new Map<string, { sum: number; n: number }>()
  for (const p of mica) {
    const a = dayRetAgg.get(p.day) ?? { sum: 0, n: 0 }
    a.sum += p.ret; a.n += 1
    dayRetAgg.set(p.day, a)
  }

  interface HistPoint {
    day: string; agi: number; p: number; g: number; a: number
    cum: number; hit: number; brier: number; verif: number; sym: number
    rankId: string
  }
  const history: HistPoint[] = []
  const emergentSince = new Map<string, string>()
  const EMERGENT_DEFS = [
    { id: 'RADAR-LUAS', label: 'Radar Luas — 20+ simbol berbeda telah dijelajahi' },
    { id: 'POLA-REKOGNISI', label: 'Pola-Rekognisi — 10+ pola terverifikasi menumpuk' },
    { id: 'KALIBRASI-DIRI', label: 'Kalibrasi-Diri — keyakinan selaras realita (Brier ≤ 0.30)' },
    { id: 'EVOLUSI-DIRI', label: 'Evolusi-Diri — genome bermutasi dari vonis 3+ hari' },
    { id: 'MEMORI-HIDUP', label: 'Memori-Hidup — ingatan dibaca saat keputusan (V4)' },
    { id: 'VETO-BERITA', label: 'Veto-Berita — radar berita LLM mencabut pick berbahaya' },
  ]
  const memFlagDay = modFlags.find((f) => f.id === 'kline1h')?.sinceDay ?? firstDay
  const vetoDay = vetoEvents[0]?.day ?? null

  let cum = 0
  let hits = 0, brierSum = 0, pickN = 0
  let redPrev = 0, greenAfterRed = 0
  let prevDayRet: number | null = null
  let byteRatioNow = 1

  for (const day of scoredDays) {
    // akumulasi pick hari ini
    const todays = mica.filter((p) => p.day === day)
    for (const p of todays) {
      symSet.add(p.symbol)
      pickN++
      if (p.hit) hits++
      const c = p.confidence / 100
      brierSum += (c - (p.hit ? 1 : 0)) ** 2
    }
    regimeSet.add(dayMap.get(day)!.regime)
    for (const gl of genomeLogs) if (gl.day <= day) evolveDaySet.add(gl.day)
    const upgradesN = upgradeEvents.filter((e) => e.day <= day).length

    const agg = dayRetAgg.get(day)
    const dayRet = agg ? agg.sum / agg.n : 0
    cum += dayRet
    if (prevDayRet !== null && prevDayRet < 0) { redPrev++; if (dayRet > 0) greenAfterRed++ }
    prevDayRet = dayRet

    // memori s/d hari ini
    let verifN = 0
    for (const [fd, rows] of memByFirstDay) {
      if (fd > day) continue
      for (const r of rows) {
        if (['EPISODE', 'POLA', 'POLA_COARSE', 'POLA_REGIME'].includes(r.kind) && nOf(r.payload, r.hits) >= 2) verifN++
      }
    }
    const storedRows = memByFirstDay.size > 0 ? memRows.filter((r) => r.firstDay <= day).length : 0
    const bytesStored = memRows.filter((r) => r.firstDay <= day).reduce((s, r) => s + r.payload.length, 0)
    byteRatioNow = storedRows > 0 ? Math.max(1, (storedRows * 480) / Math.max(1, bytesStored)) : 1

    const m: RawMetrics = {
      cumPct: cum * 100, n: pickN, hit: pickN > 0 ? hits / pickN : 0, brier: pickN > 0 ? brierSum / pickN : 0.5,
      verifN, byteRatio: byteRatioNow,
      symN: symSet.size, regimesN: regimeSet.size, pickN,
      upgradesN, evolveDaysN: evolveDaySet.size, totalDays: scoredDays.indexOf(day) + 1,
      recoverRate: redPrev > 0 ? greenAfterRed / redPrev : 0.5,
    }
    const dims = dimsFrom(m)
    const p = pFrom(dims)
    const g = gOf(day)
    const agiPct = p * g * autonomyScore * 100

    for (const em of EMERGENT_DEFS) {
      if (emergentSince.has(em.id)) continue
      let ok = false
      if (em.id === 'RADAR-LUAS') ok = symSet.size >= 20
      else if (em.id === 'POLA-REKOGNISI') ok = verifN >= 10
      else if (em.id === 'KALIBRASI-DIRI') ok = pickN >= 10 && m.brier <= 0.3
      else if (em.id === 'EVOLUSI-DIRI') ok = evolveDaySet.size >= 3
      else if (em.id === 'MEMORI-HIDUP') ok = memFlagDay <= day
      else if (em.id === 'VETO-BERITA') ok = vetoDay !== null && vetoDay <= day
      if (ok) emergentSince.set(em.id, day)
    }

    history.push({
      day, agi: r4(agiPct), p: r2(p * 100), g: r2(g * 100), a: r2(autonomyScore * 100),
      cum: r2(cum * 100), hit: r4(pickN > 0 ? hits / pickN : 0), brier: r4(pickN > 0 ? brierSum / pickN : 0.5),
      verif: verifN, sym: symSet.size, rankId: rankOf(agiPct).id,
    })
  }

  // kemampuan yang menyala "hari ini" — hari berjalan belum teradili,
  // jadi tidak lewat walk; aktifkan dari tanggal pasangnya (jujur & terlihat)
  for (const em of EMERGENT_DEFS) {
    if (emergentSince.has(em.id)) continue
    if (em.id === 'MEMORI-HIDUP' && memFlagDay <= todayStr) emergentSince.set(em.id, memFlagDay)
    else if (em.id === 'VETO-BERITA' && vetoDay !== null && vetoDay <= todayStr) emergentSince.set(em.id, vetoDay)
  }

  // ---------- keadaan saat ini ----------
  const last = history[history.length - 1]
  const first = history[0]
  const curDimsRaw: RawMetrics | null = last
    ? {
        cumPct: last.cum, n: mica.length, hit: last.hit, brier: last.brier,
        verifN: last.verif, byteRatio: byteRatioNow,
        symN: last.sym, regimesN: regimeSet.size, pickN: mica.length,
        upgradesN: upgradeEvents.length, evolveDaysN: evolveDaySet.size, totalDays: scoredDays.length,
        recoverRate: redPrev > 0 ? greenAfterRed / redPrev : 0.5,
      }
    : null
  const curDims = curDimsRaw ? dimsFrom(curDimsRaw) : null
  const pNow = curDims ? pFrom(curDims) : 0
  const gNow = gOf(todayStr) // kemampuan SAAT INI — flag yang sudah dipasang s/d hari ini
  const agiPct = pNow * gNow * autonomyScore * 100
  const rank = rankOf(agiPct)

  const growth = first && last && first.agi > 0
    ? {
        fromPct: first.agi, toPct: last.agi,
        mult: first.agi > 0 ? last.agi / first.agi : 0,
        doublingDays: last.agi > first.agi * 2
          ? (scoredDays.length / Math.log2(last.agi / first.agi))
          : null,
      }
    : null

  // ---------- kurikulum: tambang kelemahan + peta jalan, urut ΔAGI ----------
  interface CurriculumItem { id: string; lever: 'P' | 'G' | 'A'; label: string; why: string; action: string; dAgiPp: number }
  const curriculum: CurriculumItem[] = []

  if (curDimsRaw && curDims) {
    const agiNow = agiPct
    const projP = (patch: Partial<RawMetrics>) => {
      const mm = { ...curDimsRaw, ...patch }
      return pFrom(dimsFrom(mm))
    }
    const pushP = (id: string, label: string, why: string, action: string, patch: Partial<RawMetrics>) => {
      const d = projP(patch) * gNow * autonomyScore * 100 - agiNow
      curriculum.push({ id, lever: 'P', label, why, action, dAgiPp: r4(d) })
    }
    const pushG = (id: string, label: string, why: string, action: string, extraTask = 0, extraMod = 0) => {
      const tb = (taskFlags.filter((f) => f.on).length + extraTask) / TASKS.length
      const mb = (modFlags.filter((f) => f.on).length + extraMod) / MODALITIES.length
      const gn = DOMAIN_SHARE * tb * mb
      curriculum.push({ id, lever: 'G', label, why, action, dAgiPp: r4(pNow * gn * autonomyScore * 100 - agiNow) })
    }
    const pushA = (id: string, label: string, why: string, action: string, newScores: Record<string, number>) => {
      const avg = AUTONOMY.reduce((s, a) => s + (newScores[a.id] ?? a.score), 0) / AUTONOMY.length
      curriculum.push({ id, lever: 'A', label, why, action, dAgiPp: r4(pNow * gNow * avg * 100 - agiNow) })
    }

    // P-driven (dari metrik)
    if (curDimsRaw.hit < 0.58) pushP('BEDAH-KEGAGALAN', `Bedah 10 kegagalan terakhir → filter baru`, `hit rate ${(curDimsRaw.hit * 100).toFixed(1)}% masih di bawah target 58%`, 'Tambang pola pick gagal 10 hari terakhir di lab bebas-kebocoran → pasang guard/filter yang lolos uji', { hit: Math.min(0.75, curDimsRaw.hit + 0.05) })
    if (curDimsRaw.brier > 0.22) pushP('SETUL-KEYAKINAN', 'Setel ulang keyakinan per rezim', `Brier ${curDimsRaw.brier.toFixed(3)} — keyakinan belum selaras realita`, 'Replay seluruh episode teradili → kalibrasi keyakinan per (rezim, arah) dari kurva reliabilitas', { brier: Math.max(0.15, curDimsRaw.brier - 0.04) })
    if (curDimsRaw.symN < 45) pushP('PERLUAS-RADAR', 'Perluas radar ke koin belum tersentuh', `baru ${curDimsRaw.symN}/150 simbol pool pernah dijelajahi`, 'Alokasikan slot eksplorasi mingguan dari pool likuid di luar kebiasaan antrian momentum', { symN: Math.min(45, curDimsRaw.symN + 8) })
    if (curDimsRaw.verifN < 40) pushP('KONSOLIDASI-MEMORI', 'Percepat konsolidasi episodik → semantik', `hanya ${curDimsRaw.verifN} pola terverifikasi (n≥2)`, 'Naikkan laju konsolidasi: episode harian dilebur ke POLA_COARSE/REZIM lebih agresif + replay anti-lupa', { verifN: Math.min(60, curDimsRaw.verifN + 15) })

    // G-driven (peta jalan tugas & modalitas)
    pushG('SIZING', 'Ukuran posisi adaptif (sizing)', 'cyborg baru bilang BUY/SELL, belum berapa porsi', 'Modul sizing: porsi = f(keyakinan, ATR, korelasi) → tugas ke-8/12', 1, 0)
    pushG('ONCHAIN', 'Sensor on-chain', 'satu-satunya sumber yang belum dibaca: jaringan blockchain sendiri', 'Uplink on-chain gratis (transfer volume, active address) sebagai faktor ke-9', 0, 1)
    pushG('SOSIAL', 'Sentimen sosial', 'narasi pump sering lahir di sosial sebelum candle', 'Uplink sentimen (X/Reddit) → modalitas ke-9/10', 0, 1)
    pushG('EKSEKUSI', 'Eksekusi & manajemen risiko (SL/TP)', 'pick harian lepas tanpa rencana keluar', 'Modul SL/TP/trailing dari ATR → tugas ke-9/12', 1, 0)
    pushG('SEKTOR', 'Rotasi sektor & narasi', 'belajar per koin, belum per sektor (AI/L2/meme/DeFi)', 'Pemetaan sektor + rotasi → konteks keputusan lebih kaya', 1, 0)
    pushG('PORTO', 'Portofolio multi-hari', 'pick hari ini lepas dari posisi kemarin', 'Buku posisi multi-hari + carry-over keputusan', 1, 0)

    // A-driven
    pushA('SELF-UPGRADE', 'Otomasi self-upgrade terpandu', 'upgrade struktural masih 100% tangan pengembang', 'Pipeline: organ TUMBUH mengusulkan patch terbatas → lab validasi otomatis → promosi', { perbaik: 0.8, diag: 0.9 })
    pushA('ANTI-LUPA-2', 'Replay anti-lupa penuh', 'pol Lama tak pernah diuji ulang vs data baru', 'Jadwal replay mingguan: pola lama diuji ulang pada data terbaru, yang mati dipensiunkan', { antilupa: 0.95 })

    curriculum.sort((a, b) => b.dAgiPp - a.dAgiPp)
  }

  // ---------- kemahiran (skill library ala Voyager) ----------
  const skills = memRows
    .filter((r) => ['EPISODE', 'POLA_COARSE', 'POLA_REGIME'].includes(r.kind))
    .map((r) => {
      const p = JSON.parse(r.payload) as { n?: number; sumRet?: number; hitCount?: number; symbol?: string; direction?: string; regime?: string; bucket?: string }
      const n = p.n ?? r.hits
      return {
        fp: r.fingerprint.slice(0, 24), kind: r.kind, n,
        label: r.kind === 'EPISODE'
          ? `${p.symbol ?? '?'} ${p.direction ?? ''} @${p.regime ?? '?'}`
          : r.kind === 'POLA_REGIME'
            ? `REZIM ${p.regime ?? '?'} ${p.direction ?? ''}`
            : `POLA ${p.bucket ?? '?'} ${p.direction ?? ''} @${p.regime ?? '?'}`,
        avgRet: n > 0 ? (p.sumRet ?? 0) / n * 100 : 0,
        hit: n > 0 ? (p.hitCount ?? 0) / n * 100 : 0,
        mastery: Math.min(1, n / 5),
        lastDay: r.lastDay,
      }
    })
    .filter((s) => s.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)

  // ---------- log pertumbuhan ----------
  const crossings: { day: string; kind: string; text: string }[] = []
  let prevRank: string | null = null
  for (const h of history) {
    if (prevRank && h.rankId !== prevRank) crossings.push({ day: h.day, kind: 'MILESTONE', text: `Naik ke ${h.rankId} — AGI ${h.agi.toFixed(2)}%` })
    prevRank = h.rankId
  }
  for (const [id, day] of emergentSince) {
    const em = EMERGENT_DEFS.find((e) => e.id === id)!
    crossings.push({ day, kind: 'EMEREN', text: `Kemampuan baru muncul: ${em.label}` })
  }
  const growthLog = [
    ...crossings,
    ...events.filter((e) => ['UPGRADE', 'REVOLUSI', 'PERTUMBUHAN', 'BOOTSTRAP'].includes(e.kind)).map((e) => ({ day: e.day, kind: e.kind, text: e.text })),
  ]
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 16)

  // ---------- peta ke riset pertumbuhan AI ----------
  const researchMap = [
    { concept: 'Self-improvement loop: tambang kelemahan → usulkan terbatas → validasi → promosi', source: 'Self-Harness & Recursive Self-Improving Agents (2026)', ours: 'Organ TUMBUH: diagnosis harian otomatis + kurikulum ΔAGI; setiap patch divalidasi lab bebas-kebocoran sebelum dipasang' },
    { concept: 'Self-play: kemampuan naik lewat pertarungan terus-menerus', source: 'AlphaGo Zero (DeepMind, 2017)', ours: 'Arena harian 6 petarung; vonis realita candle; genome bermutasi dari hasil nyata' },
    { concept: 'Skill library: keterampilan terverifikasi yang menumpuk', source: 'Voyager (2023)', ours: 'Kemahiran = pola memori n≥2; dibaca otak saat keputusan sejak V4' },
    { concept: 'Konsolidasi memori episodic→semantic + replay anti-lupa', source: 'Complementary Learning Systems; FOREVER (2026)', ours: 'EPISODE→POLA_COARSE→POLA_REGIME (dedup FNV-1a, kompresi terukur); jenjang dibaca saat keputusan' },
    { concept: 'Kurikulum: mudah→sulit, sesuai kemampuan', source: 'Curriculum Learning (Bengio et al.)', ours: 'Antrian konsentrasi adaptif: breadth guard & mode parabolik mengatur kesulitan hari' },
    { concept: 'Evolusi terbuka: sistem memodifikasi dirinya dari umpan balik benchmark', source: 'Darwin Gödel Machine (2025)', ours: 'Mutasi bobot + knob + REVOLUSI + distilasi pola rival saat tertinggal' },
    { concept: 'Kecerdasan = performa × generalitas × otonomi', source: 'Levels of AGI (DeepMind, 2024)', ours: 'Gauge AGI% = P × G × A — jujur, terukur, dan naik tiap kali kurikulum terpasang' },
  ]

  const dimList = curDims
    ? DIM_DEFS.map((d) => ({ id: d.id, label: d.label, w: d.w, ...curDims[d.id] }))
    : []

  return {
    at: new Date().toISOString(),
    scoredDays: scoredDays.length,
    agiPct: r4(agiPct),
    p: { level: r2(pNow * 100), dims: dimList },
    g: {
      breadth: r4(gNow), domainShare: DOMAIN_SHARE,
      task: { on: taskFlags.filter((f) => f.on).length, total: TASKS.length },
      modality: { on: modFlags.filter((f) => f.on).length, total: MODALITIES.length },
      tasks: taskFlags.map(({ id, label, on, sinceDay }) => ({ id, label, on, sinceDay })),
      modalities: modFlags.map(({ id, label, on, sinceDay }) => ({ id, label, on, sinceDay })),
    },
    a: {
      score: r2(autonomyScore * 100),
      parts: AUTONOMY,
    },
    rank: { id: rank.id, name: rank.name, desc: rank.desc, next: rank.next },
    growth: growth ? { ...growth, fromPct: r4(growth.fromPct), toPct: r4(growth.toPct), doublingDays: growth.doublingDays ? Math.round(growth.doublingDays) : null } : null,
    history: history.map((h) => ({ day: h.day, agi: h.agi, p: h.p, cum: h.cum, hit: h.hit, brier: h.brier })),
    curriculum,
    skills,
    emergent: EMERGENT_DEFS.map((e) => ({ id: e.id, label: e.label, active: emergentSince.has(e.id), sinceDay: emergentSince.get(e.id) ?? null })),
    log: growthLog,
    researchMap,
    memorySummary: {
      rawEvents,
      storedRows: memRows.length,
      verifN: memRows.filter((r) => ['EPISODE', 'POLA', 'POLA_COARSE', 'POLA_REGIME'].includes(r.kind) && nOf(r.payload, r.hits) >= 2).length,
    },
  }
}

// ---------------- ORGAN TUMBUH — denyut diagnosis harian ----------------

/** Dipanggil arena tiap selesai run: catat diagnosis pertumbuhan 1x/hari. */
export async function growthPulse(today: string) {
  const exists = await db.arenaEvent.findFirst({ where: { kind: 'PERTUMBUHAN', day: today } })
  if (exists) return
  const st = await getGrowthState()
  const top = st.curriculum[0]
  const dimMin = st.p.dims.length
    ? st.p.dims.reduce((a, b) => (a.score <= b.score ? a : b))
    : null
  await db.arenaEvent.create({
    data: {
      day: today,
      kind: 'PERTUMBUHAN',
      text: `SISTEM PERTUMBUHAN — AGI ${st.agiPct.toFixed(2)}% (P ${st.p.level.toFixed(0)}% · G ${(st.g.breadth * 100).toFixed(1)}% · A ${st.a.score.toFixed(0)}%) · ${st.rank.id} ${st.rank.name}` +
        `. Dimensi terlemah: ${dimMin ? `${dimMin.label} (${Math.round(dimMin.score * 100)}%)` : '—'}` +
        `. Kurikulum teratas: ${top ? `${top.label} → potensi AGI +${top.dAgiPp.toFixed(2)} poin` : 'kumpulkan lebih banyak hari teradili'}.`,
    },
  })
}
