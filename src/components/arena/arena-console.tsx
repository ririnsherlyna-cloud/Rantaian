'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GuruChat } from './guru-chat'
import {
  Swords, Brain, Database, User, Activity, ShieldCheck, ShieldAlert,
  TrendingUp, TrendingDown, Zap, RefreshCcw, CircleDot, MinusCircle, CheckCircle2, XCircle,
  FlaskConical, Wrench, Gauge, Sprout, Sparkles, BookOpen, GraduationCap, Crosshair, Network, HeartPulse,
  Wallet,
} from 'lucide-react'
import { ExamConsole } from './exam-console'
import { ArahPanel } from './arah-panel'
import { OtakPanel } from './otak-panel'
import { NadiPanel } from './nadi-panel'

// ---------------- tipe ----------------

interface Standing {
  competitor: string
  days: number
  picks: number
  hitRate: number
  cumRet: number
  bestDay: number
  worstDay: number
}

// V250 WARISAN MASUK ARENA — bentuk bukti warisan & rencana (dari evidence pick)
interface WarisanBuktiLike {
  sigma24jPct: number | null
  modelVol: string
  persistensi: number | null
  beta: number | null
  r2Beta: number | null
  poc: number | null
  profilVolume: string | null
  divRSI: string
  breadthPct: number
  kejutPump: boolean
  ketKejut: string
  posisiRentang: number
  volSpike: number
  pangkas?: string
  mc: { lintasan: number; langkah: number; seedHex: string; pTarget: number | null; pStop: number | null; pAmbisius: number | null; pPowerMax: number | null; pNaik: number | null; ket: string }
}
interface RencanaLike {
  entry: number
  stop: number | null
  target: number | null
  highAmbisius: number | null
  powerMaxAmbisius?: number | null
  stopPct: number | null
  targetPct: number | null
  ambisiusPct: number | null
  powerMaxPct?: number | null
  pTarget: number | null
  pStop: number | null
  pAmbisius: number | null
  pPowerMax?: number | null
  prakiraPowerMax?: string | null
  targetMediana: boolean
  netUntungPct: number | null
  sumberTarget: string
  ketGuard: string
}
interface DayaLike { volume: number; volatilitas: number; likuiditas: number }
interface PraRegistrasiLike { waktuKunci: string; horizon: string; feePct: number; netWajib: boolean; sumber: string }

// V276 MESIN-CUAN — buku besar keuntungan dari rencana pra-registrasi
interface CuanEntryLike {
  day: string; symbol: string; arah: string
  status: 'MENANG' | 'KALAH' | 'KEDALUWARSA'; via: 'SASARAN' | 'STOP' | 'TUTUP'
  entry: number; target: number | null; stop: number | null
  netPct: number; r: number | null; keyakinan: number; regime: string
}
interface BukuCuanLike {
  hari: string; at: string
  entri: CuanEntryLike[]
  berlangsung: { symbol: string; arah: string; entry: number; targetPct: number | null; stopPct: number | null; pTarget: number | null; pStop: number | null; netUntungPct: number | null; keyakinan: number }[]
  metrik: {
    totalPlan: number; menang: number; kalah: number; kedaluwarsa: number
    winRate: number | null; ekspektansiPct: number | null; ekspektansiR: number | null
    netKumulatifPct: number; maxDrawdownPct: number; streak: string
    terbaik: { symbol: string; day: string; netPct: number } | null
    terburuk: { symbol: string; day: string; netPct: number } | null
    perRegime: { regime: string; n: number; kalah: number; eksPct: number }[]
    disiplinAktif: boolean; disiplinSampai: string | null
  }
  kejujuran: string
}

interface ArenaState {
  today: string
  // V300 — kejujuran sinkronisasi: hari data vs hari sistem (anti-jebakan tanggal lama)
  dataDay?: string | null
  stale?: boolean
  dataLagHari?: number | null
  serverNow?: string
  bootstrap: { status: string; progress: number; error: string | null }
  regime: string | null
  universe: { symbols: number; pool?: number; backfillDays: number; scoredDays: number }
  standings: Standing[]
  chart: Record<string, string | number>[]
  climate?: { fng: number | null; fngClass: string | null; mcapChange24h: number | null; btcDominance: number | null; at: string } | null
  // V274 SLOT-JUJUR + V301 DAFTAR TEMPUR — ringkasan tahap: dipindai · masuk · lolos · ditolak
  slotHariIni?: ({ day?: string; k: number; lahir: number; dipindai?: number | null; dianalisa?: number; lolos?: number; ditolakN?: number; ditolak?: { symbol: string; reason: string }[] }) | null
  // V276 MESIN-CUAN — buku besar keuntungan dari rencana pra-registrasi
  bukuCuan?: BukuCuanLike | null
  disiplinCuan?: string | null
  pulse?: {
    at: string
    utcClosesInMs: number
    items: { symbol: string; direction: 'BUY' | 'SELL'; entryClose: number; livePrice: number | null; liveRetPct: number | null; verdict: { kind: string; note: string; sources: number } | null; spark?: number[]; fundingPct?: number | null;
      warisan?: WarisanBuktiLike | null; rencana?: RencanaLike | null; daya?: DayaLike | null; praRegistrasi?: PraRegistrasiLike | null; sadardiri?: string | null }[]
  }
  todayPicks: { competitor: string; symbol: string; direction: string; confidence: number; entryClose?: number; evidence: Record<string, unknown> }[]
  genome: {
    generation: number
    v2?: Record<string, unknown>
    states: { regime: string; weights: Record<string, number> }[]
    logs: { day: string; generation: number; kind: string; note: string; fitness: number | null }[]
    upgradeEtaUntil: string | null
  }
  memory: {
    rawEvents: number
    storedRows: number
    dedupMerges: number
    compressionRatio: number
    bytesRaw: number
    bytesStored: number
    byteRatio: number
    byKind: { kind: string; rows: number; hits: number }[]
    totalHits: number
    recent: { fingerprint: string; kind: string; hits: number; firstDay: string; lastDay: string; payload: Record<string, unknown> }[]
  }
  leakAudit: { checked: number; pass: number; verdict: string; method: string } | null
  brier?: { n: number; nilai: number | null; trimUntil: string | null } | null
  events: { day: string; kind: string; text: string; at: string }[]
}

// ---------------- konstanta tampilan ----------------

const COMP: Record<string, { label: string; color: string; desc: string }> = {
  MICAPROFITA: { label: 'MICAPROFITA', color: '#f59e0b', desc: 'Cyborg kita — genome berevolusi tiap hari' },
  AI_ANALIS: { label: 'AI ANALIS (GLM)', color: '#38bdf8', desc: 'LLM sekelas z.ai 5.2 membaca snapshot + berita' },
  MOMENTUM: { label: 'Momentum Naif', color: '#a78bfa', desc: 'Beli apa yang naik paling keras' },
  MEANREV: { label: 'Mean-Reversion', color: '#2dd4bf', desc: 'Beli jatuh terdalam, harap memantul' },
  BNH_BTC: { label: 'Beli-Tahan BTC', color: '#94a3b8', desc: 'Patokan pasar' },
  ACAK: { label: 'Dadu Acak', color: '#fb7185', desc: 'Dadu berbibit — dasar keberuntungan' },
}
const TABS = [
  { id: 'arena', label: 'Arena Hari Ini', icon: Zap },
  { id: 'arah', label: 'Kepastian Arah', icon: Crosshair },
  { id: 'simulasi', label: 'Ujian Simulasi', icon: GraduationCap },
  { id: 'tumbuh', label: 'Pertumbuhan', icon: Sprout },
  { id: 'briefing', label: 'Briefing Guru', icon: User },
  { id: 'ujian', label: 'Ujian & Upgrade', icon: FlaskConical },
  { id: 'otak', label: 'Otak & Ingatan', icon: Brain },
  { id: 'mozaik', label: 'Arsitektur Kognitif', icon: Network },
  { id: 'nadi', label: 'Nadi & Gudang', icon: HeartPulse },
  { id: 'guru', label: 'Ruang Guru', icon: Activity },
] as const
type TabId = (typeof TABS)[number]['id']

const REGIME_TONE: Record<string, string> = {
  TREND_NAIK: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  TREND_TURUN: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  SIDEWAYS: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  JATUH: 'text-rose-200 border-rose-400/50 bg-rose-500/20',
}

const fmtPct = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`
const fmtX = (v: number) => `×${v.toFixed(1)}`

// ---------------- komponen utama ----------------

export function ArenaConsole() {
  const [state, setState] = useState<ArenaState | null>(null)
  const [tab, setTab] = useState<TabId>('arena')
  const [err, setErr] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let alive = true
    let inflight = false
    const load = async () => {
      // V300-ANTISTUCK — tanpa fetch bertumpuk + batas waktu keras: kalau satu
      // jawaban lambat/macet, poll berikutnya tetap jalan & UI tak pernah beku.
      if (inflight) return
      inflight = true
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 12_000)
      try {
        const res = await fetch('/api/arena', { cache: 'no-store', signal: ctrl.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as ArenaState
        if (alive) { setState(data); setErr(null) }
      } catch (e) {
        if (alive) setErr((e as Error).message)
      } finally {
        clearTimeout(t)
        inflight = false
      }
    }
    load()
    timer.current = setInterval(load, 6000)
    return () => { alive = false; if (timer.current) clearInterval(timer.current) }
  }, [])

  if (err && !state) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-300">
        Arena gagal dihubungi: {err}. Menunggu percobaan berikutnya…
      </div>
    )
  }
  if (!state) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
        <RefreshCcw className="h-4 w-4 animate-spin text-amber-400" />
        Membuka saluran ke arena…
      </div>
    )
  }

  const booting = state.bootstrap.status !== 'selesai'

  return (
    <div className="space-y-6">
      {/* ==== kepala arena ==== */}
      <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-zinc-900/60 to-zinc-900/60">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
              <Swords className="h-6 w-6" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-zinc-50">
                MICAPROFITA <span className="text-amber-400">·</span> ARENA AGI KRIPTO
              </h3>
              <p className="text-xs text-zinc-400">
                Generasi <span className="font-bold text-amber-300">G{state.genome.generation}</span>
                {' · '}Hari pertarungan <span className="font-mono text-zinc-200">{state.today}</span> UTC
                {state.regime && (
                  <> · Rezim <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${REGIME_TONE[state.regime] ?? ''}`}>{state.regime}</span></>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <CircleDot className="h-3.5 w-3.5 text-emerald-400" />
            Data hidup Binance · universe dinamis {state.universe.symbols}/hari dari pool {state.universe.pool ?? 120}+ · {state.universe.scoredDays} hari teradili
          </div>
        </div>

        {/* V300 — peringatan jujur: data masih milik hari lampau (sinkron tertahan) */}
        {state.stale && state.dataDay && (
          <div className="border-t border-amber-500/25 bg-amber-500/[0.07] px-5 py-2.5 text-[11px] leading-relaxed text-amber-300">
            ⏳ Hari sistem sudah <b className="font-mono">{state.today}</b>, tapi data sasaran terakhir masih milik <b className="font-mono">{state.dataDay}</b>
            {typeof state.dataLagHari === 'number' && state.dataLagHari > 0 && <> (tertinggal {state.dataLagHari} hari)</>}.
            {' '}Arena otomatis sinkron di belakang — sumber data sedang terhalang/lambat. Tanggal tidak lagi tertukar.
          </div>
        )}

        {booting && (
          <div className="border-t border-amber-500/20 bg-black/30 px-5 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-amber-300">
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                {state.bootstrap.status === 'berjalan'
                  ? 'Mengadili sejarah & menyiapkan sasaran hari ini… (mesin sedang bekerja)'
                  : 'Menyiapkan arena…'}
              </span>
              <span className="font-mono text-zinc-400">{state.bootstrap.progress}%</span>
            </div>
            <Progress value={state.bootstrap.progress} className="h-1.5 bg-zinc-800 [&>div]:bg-amber-500" />
            {state.bootstrap.error && (
              <p className="mt-1.5 text-[11px] text-rose-400">{state.bootstrap.error}</p>
            )}
          </div>
        )}
      </div>

      {/* ==== tab ==== */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                active ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'arena' && <TabArena state={state} />}
      {tab === 'arah' && <ArahPanel />}
      {tab === 'simulasi' && <ExamConsole />}
      {tab === 'tumbuh' && <TabTumbuh />}
      {tab === 'briefing' && <TabBriefing state={state} />}
      {tab === 'ujian' && <TabUjian state={state} />}
      {tab === 'otak' && <TabOtak state={state} />}
      {tab === 'mozaik' && <OtakPanel />}
      {tab === 'nadi' && <NadiPanel />}
      {tab === 'guru' && <GuruChat />}
    </div>
  )
}

// ================= TAB: ARENA HARI INI =================

function TabArena({ state }: { state: ArenaState }) {
  const todayMine = state.todayPicks
  const mica = state.standings.find((s) => s.competitor === 'MICAPROFITA')
  // V300 — FOKUS PENGEMBANGAN: arena murni menampilkan MICAPROFITA.
  // Perbandingan vs GLM/momentum dipensiunkan dari tampilan; energi penuh ke otak kita.
  return (
    <div className="space-y-5">
      {/* ---- NADIR: denyut intraday pick MICAPROFITA (UPGRADE V3) ---- */}
      {state.pulse && state.pulse.items.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-zinc-900/60 to-zinc-900/60 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Activity className="h-4 w-4 animate-pulse text-emerald-400" /> NADIR — Denyut Intraday Pick Cyborg
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {state.climate && (
                <>
                  <FngChip fng={state.climate.fng} cls={state.climate.fngClass} />
                  {state.climate.mcapChange24h !== null && (
                    <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${state.climate.mcapChange24h >= 0 ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}>
                      MCap 24j {state.climate.mcapChange24h >= 0 ? '+' : ''}{state.climate.mcapChange24h.toFixed(1)}%
                    </span>
                  )}
                  {state.climate.btcDominance !== null && (
                    <span className="rounded-lg border border-zinc-700 px-2 py-1 text-[10px] font-semibold text-zinc-300">
                      BTC dom {state.climate.btcDominance.toFixed(1)}%
                    </span>
                  )}
                </>
              )}
              <NadirCountdown ms={state.pulse.utcClosesInMs} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.pulse.items.map((x, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <DirectionBadge dir={x.direction} />
                  <span className="font-mono text-sm font-bold text-zinc-100">{x.symbol.replace('USDT', '')}</span>
                  {typeof x.fundingPct === 'number' && (
                    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400" title="Funding rate futures — info posisi massa (bukan filter, hasil lab Ujian #2-#4)">
                      fund {x.fundingPct >= 0 ? '+' : ''}{x.fundingPct.toFixed(3)}%
                    </span>
                  )}
                  <span className="ml-auto font-mono text-lg font-extrabold">
                    {x.liveRetPct === null ? <span className="text-zinc-500">—</span> : (
                      <span className={x.liveRetPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {x.liveRetPct >= 0 ? '+' : ''}{x.liveRetPct.toFixed(2)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex items-end justify-between gap-3">
                  <p className="font-mono text-[10px] text-zinc-500">
                    keputusan {x.entryClose > 0 ? x.entryClose.toPrecision(6) : '—'} → hidup {x.livePrice !== null ? x.livePrice.toPrecision(6) : '—'}
                    {x.spark && x.spark.length >= 4 && <span className="ml-2 text-zinc-600">· 48j: {(x.spark[0] !== 0 ? (((x.spark[x.spark.length - 1] - x.spark[0]) / x.spark[0]) * 100).toFixed(1) : '—')}%</span>}
                  </p>
                  {x.spark && x.spark.length >= 4 && <Sparkline data={x.spark} up={(x.liveRetPct ?? 0) >= 0} />}
                </div>
                {x.verdict && <VonisChip kind={x.verdict.kind} note={x.verdict.note} sources={x.verdict.sources} />}
                {x.rencana && (
                  <WarisanPanel dir={x.direction} conf={0} symbol={x.symbol} rencana={x.rencana}
                    warisan={x.warisan} daya={x.daya} pra={x.praRegistrasi} sadardiri={x.sadardiri} compact />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
            P&amp;L hidup = harga pasar sekarang vs harga keputusan (close T-1). Sparkline = candle 1 jam 48 jam terakhir. Vonis berita dibaca mesin vonis dari pita berita 3 hari terakhir — hanya untuk hari hidup, hari historis tetap murni kuant (bebas kebocoran). Funding = info posisi massa, bukan filter. Panel WARISAN V250 = tangga harga + peluang Monte Carlo 2.000 lintasan berbibit + GARCH/beta/POC — pra-registrasi pada momen kunci, wajib NET after fee.
          </p>
        </div>
      )}

      {/* ---- pertarungan hari ini (utama) ---- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <Zap className="h-4 w-4 text-amber-400" /> Barisan Hari {state.today} <span className="text-[10px] font-normal text-zinc-500">(dinilai saat candle tutup besok)</span>
          </h4>
          <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">PENDING</Badge>
        </div>
        {/* V301 DAFTAR TEMPUR — 50 koin penuh + ringkasan tahap (dipindai · masuk · lolos · ditolak) */}
        <DaftarTempur picks={todayMine} slotHariIni={state.slotHariIni} today={state.today} />
        {/* V276 MESIN-CUAN — buku besar: setiap rencana pra-registrasi dinilai nyata */}
        <BukuCuanPanel buku={state.bukuCuan ?? null} />
        {/* V300 FOKUS — hanya sasaran cyborg; arena murni pengembangan MICAPROFITA */}
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {['MICAPROFITA'].map((comp) => {
            const picks = todayMine.filter((p) => p.competitor === comp)
            const meta = COMP[comp]
            return (
              <div key={comp} className={`rounded-xl border p-4 ${comp === 'MICAPROFITA' ? 'border-amber-500/30 bg-amber-500/[0.05]' : 'border-sky-500/30 bg-sky-500/[0.04]'}`}>
                <p className="mb-2.5 flex items-center gap-2 text-xs font-bold" style={{ color: meta?.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: meta?.color }} />
                  {meta?.label}
                </p>
                {picks.length === 0 && <p className="text-xs text-zinc-500">Menunggu keputusan…</p>}
                <div className="space-y-2">
                  {/* V301 — kartu detail hanya 6 teratas; daftar lengkap 50 koin di panel DAFTAR TEMPUR */}
                  {picks.slice(0, 6).map((p, i) => {
                    const ev = evOf(p)
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-2">
                          <DirectionBadge dir={p.direction} />
                          <span className="font-mono font-semibold text-zinc-200">{p.symbol.replace('USDT', '')}</span>
                          <span className="text-zinc-500">keyakinan {Math.round(p.confidence)}%</span>
                          <span className="ml-auto truncate text-[10px] text-zinc-500">{String((p.evidence as { reason?: string }).reason ?? (p.evidence as { note?: string }).note ?? '')}</span>
                        </div>
                        {ev.rencana && <LevelRingkas dir={p.direction} rencana={ev.rencana} />}
                        {!ev.rencana && (
                          <p className="mt-0.5 text-[10px] text-zinc-600">rencana pra-registrasi menyusul pada denyut berikutnya</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- panel diri (V300: fokus pengembangan, bukan papan perbandingan) ---- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Gauge className="h-4 w-4 text-amber-400" />}
          label="Profit kumulatif"
          value={mica ? fmtPct(mica.cumRet) : '—'}
          sub={mica ? `${mica.days} hari tempur · terbaik ${fmtPct(mica.bestDay)} · terburuk ${fmtPct(mica.worstDay)}` : 'menunggu vonis'}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          label="Akurasi kumulatif"
          value={mica ? `${(mica.hitRate * 100).toFixed(0)}%` : '—'}
          sub={mica ? `${mica.picks} pick teradili · berevolusi tiap vonis` : 'menunggu pick pertama'}
        />
        <StatCard
          icon={<Brain className="h-4 w-4 text-violet-400" />}
          label="Masa tempur"
          value={`${state.universe.scoredDays} hari`}
          sub={`generasi G${state.genome.generation} · memori ${state.memory?.storedRows ?? 0} baris`}
        />
      </div>

      {/* ---- grafik kumulatif ---- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-100">
          <TrendingUp className="h-4 w-4 text-emerald-400" /> Perjalanan Profit Kumulatif (%)
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={state.chart} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#3f3f46' }} unit="%" width={52} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: number | string) => `${Number(value).toFixed(2)}%`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {state.standings.filter((s) => s.competitor === 'MICAPROFITA').map((s) => (
                  <Line
                    key={s.competitor}
                    type="monotone"
                    dataKey={s.competitor}
                    name={s.competitor}
                    stroke="#f59e0b"
                    strokeWidth={2.6}
                    dot={false}
                    connectNulls
                  />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- rekor diri (V300: fokus pengembangan — hanya MICAPROFITA) ---- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <Swords className="h-4 w-4 text-amber-400" /> Rekor Diri MICAPROFITA
          </h4>
          <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-500">kumulatif · evolusi harian</Badge>
        </div>
        <div className="divide-y divide-zinc-800/40">
          {state.standings.filter((s) => s.competitor === 'MICAPROFITA').map((s) => (
              <div key={s.competitor} className="grid grid-cols-2 gap-2 px-5 py-3 text-xs sm:grid-cols-5">
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Profit kumulatif</p><p className={`font-mono font-bold ${s.cumRet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(s.cumRet)}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Akurasi</p><p className="font-mono font-bold text-zinc-200">{(s.hitRate * 100).toFixed(0)}%</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Hari tempur</p><p className="font-mono font-bold text-zinc-200">{s.days}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Hari terbaik</p><p className="font-mono font-bold text-emerald-400">{fmtPct(s.bestDay)}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Hari terburuk</p><p className="font-mono font-bold text-rose-400">{fmtPct(s.worstDay)}</p></div>
              </div>
          ))}
          {state.standings.filter((s) => s.competitor === 'MICAPROFITA').length === 0 && (
            <div className="px-5 py-8 text-center text-xs text-zinc-500">Belum ada hari teradili — tunggu sinkronisasi…</div>
          )}
        </div>
      </div>

      {/* ---- kronik ---- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-3 text-sm font-bold text-zinc-100">Kronik Arena</h4>
        <div className="space-y-2">
          {state.events.map((e, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <EventChip kind={e.kind} />
              <p className="leading-relaxed text-zinc-400">
                <span className="font-mono text-[10px] text-zinc-600">{e.day}</span> — {e.text}
              </p>
            </div>
          ))}
          {state.events.length === 0 && <p className="text-xs text-zinc-500">Belum ada peristiwa.</p>}
        </div>
      </div>
    </div>
  )
}

// ================= TAB: UJIAN & UPGRADE =================

// Laporan Ujian #1–#5 (sebelum UPGRADE PREDATOR V2) — fakta terukur, dibekukan.
const UJIAN_BEFORE = {
  periode: '21 hari (2026-08-29 → 2026-09-18), data candle Binance riil',
  standingsBefore: [
    { name: 'MOMENTUM (naif)', ret: 82.5 },
    { name: 'AI_ANALIS (GLM)', ret: 61.1 },
    { name: 'MICAPROFITA (lama)', ret: 30.5 },
    { name: 'MEANREV (naif)', ret: 25.6 },
    { name: 'BNH_BTC', ret: 4.3 },
    { name: 'ACAK', ret: -27.9 },
  ],
  findings: [
    { title: 'Faktor "volatilitas terkendali" = ANTI-ALPHA', detail: 'Pick ATR rendah rata-rata −1.3%/hari, pick ATR tinggi +4.4% — skor lama memberi hadiah pada koin yang kalah. Kini jadi kewajiban veto, bukan komponen skor.' },
    { title: 'Momentum terencerkan oleh 8 faktor', detail: 'Emas arena = pelari mom7 teratas (parapol berlanjut 1–3 hari: SYN +77%, ONE +80%). Skor lama mendorongnya keluar antrian + filter ATR 12% memblokirnya.' },
    { title: 'Universe beku = pumper baru tak terlihat', detail: 'DASH +31.9% dipilih MOMENTUM karena ada di universe bootstrap; koin yang meledak masuk-keluar daftar likuiditas tiap hari. Kini universe DINAMIS top-40 per hari dari pool 120+.' },
    { title: 'Slot SELL menggerus profit di bull', detail: 'SELL rata-rata +0.4% vs BUY +1.8% — satu slot terbuang saat pelari melaju. Kini SELL hanya knob evolusi (mati secara default, terbukti lab).' },
    { title: 'Kegagalan beruntun tak diingat', detail: 'INJ gagal 5× berturut-turut dgn keyakinan tinggi tanpa penalti. Kini memori episode + knob K/kualitas menahan pick kembar sial.' },
  ],
  lab: [
    { v: 'V0 otak lama', ret: 36.0, note: 'reproduksi baseline (8-faktor campur)' },
    { v: 'V5 sensor funding+taker', ret: 5.8, note: 'sensor DITOLAK — mengencerkan sinyal' },
    { v: 'W1 mom murni + univ. dinamis', ret: 90.4, note: 'menembus MOMENTUM +82.5' },
    { v: 'X3 + breadth guard', ret: 145.4, note: 'pasar lemah → K=1 fokus leader' },
    { v: 'X5 + mode parabolik', ret: 146.6, note: 'DIPASANG = PREDATOR V2' },
    { v: 'X7 + SELL rezim turun', ret: 90.7, note: 'SELL DITOLAK — menggerus' },
  ],
}

function TabUjian({ state }: { state: ArenaState }) {
  const mica = state.standings.find((s) => s.competitor === 'MICAPROFITA')
  return (
    <div className="space-y-5">
      {/* status siklus sekarang */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05]">
        <h4 className="flex items-center gap-2 p-5 pb-0 text-sm font-bold text-amber-300">
          <FlaskConical className="h-4 w-4" /> Siklus UJIAN → BEDAH KELEMAHAN → UPGRADE → UJIAN LAGI
        </h4>
        <p className="mt-2 px-5 text-xs leading-relaxed text-zinc-300">
          Evolusi cyborg tidak ditunggu — ia <b>dikerjakan</b>. Setiap hasil arena dibedah: kelemahan diidentifikasi lewat lab simulasi bebas-kebocoran, di-upgrade oleh pengembang, lalu diuji ulang. Fokus kini murni pengembangan MICAPROFITA.
        </p>
        <div className="mt-3 grid gap-2 p-5 pt-0 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Sebelum upgrade</p>
            <p className="font-mono text-sm font-bold text-rose-300">+30.5% · akurasi lemah</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Sekarang (hidup)</p>
            <p className="font-mono text-sm font-bold text-emerald-300">{mica ? `${(mica.cumRet * 100).toFixed(1)}% · akurasi ${(mica.hitRate * 100).toFixed(0)}%` : '—'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Target lab (21 hari)</p>
            <p className="font-mono text-sm font-bold text-amber-300">+146.6% (target lab)</p>
          </div>
        </div>
      </div>

      {/* temuan forensik */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Wrench className="h-4 w-4 text-rose-400" /> Ujian #1 — bedah forensik kekalahan (+30.5% vs MOMENTUM +82.5%)
        </h4>
        <p className="mb-3 text-[11px] text-zinc-500">{UJIAN_BEFORE.periode}</p>
        <div className="space-y-2.5">
          {UJIAN_BEFORE.findings.map((f, i) => (
            <div key={i} className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs font-bold text-zinc-200">{i + 1}. {f.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* lab strategi */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-100">
          <FlaskConical className="h-4 w-4 text-violet-400" /> Ujian #2–#5 — laboratorium strategi (simulasi bebas kebocoran)
        </h4>
        <p className="mb-3 text-[11px] text-zinc-500">8+ varian otak diuji pada 21 hari yang sama, faktor hanya dari candle sebelum hari-D. Yang menang dipasang, yang gagal dibuang.</p>
        <div className="space-y-1.5">
          {UJIAN_BEFORE.lab.map((l, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-3.5 py-2 text-xs ${l.v.includes('PREDATOR') || l.v.includes('DIPASANG') ? 'border-amber-500/40 bg-amber-500/[0.07]' : 'border-zinc-800/60 bg-zinc-900/40'}`}>
              <span className="flex-1 text-zinc-300">{l.v}</span>
              <span className="hidden text-[10px] text-zinc-500 sm:inline">{l.note}</span>
              <span className={`w-16 text-right font-mono font-bold ${l.ret > 80 ? 'text-emerald-400' : l.ret > 0 ? 'text-amber-300' : 'text-rose-400'}`}>{l.ret >= 0 ? '+' : ''}{l.ret.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* upgrade terpasang */}
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.04] p-5">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-300">
          <Gauge className="h-4 w-4" /> Upgrade terpasang: PREDATOR V2 (oleh pengembang)
        </h4>
        <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-300">
          <li>• <b>Universe dinamis</b> — top-40 likuiditas dihitung ULANG tiap hari dari pool 120+ simbol; pumper baru masuk radar hari itu juga.</li>
          <li>• <b>Antrian kepemimpinan momentum</b> — pelari teratas diuriutkan; komposit 8 faktor hanya menjadi tie-break + bukti briefing.</li>
          <li>• <b>Konsentrasi adaptif</b> — breadth lemah → K=1 fokus leader absolut; mode parabolik (mom7 leader &gt; ambang) → K=2 naiki pelari.</li>
          <li>• <b>Genome knob struktural</b> — evolusi kini mengubah KEBIJAKAN (K, ambang breadth, ambang parabolik, ATR cap), bukan sekadar bobot.</li>
          <li>• <b>Sensor ditolak hasil lab</b> — funding/taker flow & SELL dipensiunkan karena terukur menggerus profit; data tetap dipantau utk riset lanjut.</li>
        </ul>
      </div>

      {/* UJIAN #7 → UPGRADE V3 */}
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-5">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-violet-300">
          <FlaskConical className="h-4 w-4" /> Ujian #7 → Upgrade V3: radar 4 jam + vonis LLM + denyut NADIR
        </h4>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
          Bedah terbaru (56 pick terakhir): momentum 24 jam dari candle 4 jam terbukti memisahkan pick bagus dan pick berdarah — yang <b>melemah (−5..0%)</b> rata-rata <b className="text-rose-300">−2.7% hit 38%</b>, yang <b>tenang/akselerasi</b> rata-rata <b className="text-emerald-300">+9–10% hit 58%</b>.
        </p>
        <div className="space-y-1.5 text-xs leading-relaxed text-zinc-300">
          <li className="list-none">• <b>Sumber informasi baru: uplink candle 4 jam</b> — radar intraday “leader mati” yang tak terlihat dari candle harian; masuk bukti briefing + kewajiban Konfirmasi 4 jam + penyetel keyakinan.</li>
          <li className="list-none">• <b>Kejujuran lab</b> — hard-reject leader mati diuji 3 ambang (−3/−5/−8) pada 21 hari riil: semuanya MENGURANGI profit (213.0% → 200–211.7%) karena memangkas pemenang besar. Guard dipasang sebagai knob DORMAN (bisa dinyalakan evolusi bila rezim berubah), bukan dipaksakan.</li>
          <li className="list-none">• <b>Lapisan vonis berita</b> — sebelum pick hari hidup disimpan, berita 3 hari terakhir tiap kandidat dibaca mesin vonis: KONFIRMASI berdiri, PERINGATAN pangkas keyakinan −15, VETO mencabut pick &amp; mengganti kandidat berikutnya (dicatat di Kronik).</li>
          <li className="list-none">• <b>NADIR</b> — denyut intraday di Arena Hari Ini: P&amp;L hidup tiap pick + hitung mundur tutup candle UTC. Arena kini bernapas sepanjang hari, bukan sekadar menunggu vonis besok.</li>
          <li className="list-none">• <b>Integritas tetap</b> — vonis berita hanya untuk hari hidup; hari historis murni kuant (berita hari ini tak boleh menyusup ke sejarah = kebocoran).</li>
        </div>
      </div>

      {/* UJIAN #8 → UPGRADE V4 */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300">
          <FlaskConical className="h-4 w-4" /> Ujian #8 → Upgrade V4: SADAR-INGATAN + sumber informasi baru
        </h4>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
          Bedah forensik menemukan masalah paling dalam sejauh ini: <b className="text-rose-300">ingatan adalah organ mati</b> — episode &amp; pola dipanen tiap hari, TAPI tidak pernah dibaca saat keputusan. Akar teknisnya: bucket 8-faktor menghasilkan 6561 kombinasi, ingatan tak pernah cukup padat (n≥3 hampir mustahil) untuk dipakai.
        </p>
        <div className="space-y-1.5 text-xs leading-relaxed text-zinc-300">
          <li className="list-none">• <b>Memori BERJENJANG</b> — SIMBOL (episode koin sama) → BUCKET3 (27 kombinasi momentum/volume/struktur) → REZIM. Ingatan kini cukup padat dan benar-benar dibaca otak.</li>
          <li className="list-none">• <b>Tiga pemakaian nyata</b> — tie-break antrian (setelah mom7 &amp; radar 4 jam), penyetel keyakinan (±8), dan MEMVETO surgikal: kandidat di-skip saat ingatan bilang pola ini biasanya gagal (n≥4, rata ≤ −3%, hit &lt; 30%).</li>
          <li className="list-none">• <b>Lab jujur 21 hari</b> — V3 buta ingatan <b className="text-amber-300">+212.9%</b> vs V4 sadar-ingatan <b className="text-emerald-300">+233.7%</b>: 2 MEMVETO di 09-18 mengganti leader layu dengan kandidat kuat (+20.8 poin). Diag: pick ber-ingatan-positif rata-rata +6.25%.</li>
          <li className="list-none">• <b>Sumber informasi baru</b> — Fear &amp; Greed (alternative.me), market cap global &amp; dominasi BTC (CoinGecko), funding rate futures (chip info — lab menolaknya sebagai filter, jadi kami tampilkan transparan), sparkline 1 jam di NADIR.</li>
          <li className="list-none">• <b>Integritas</b> — ingatan hanya ditulis SETELAH hari dinilai; pick hari-D hanya membaca memori hari &lt; D. Bibit memori disebar dari sejarah teradili (idempoten, tanpa kebocoran).</li>
        </div>
      </div>

      {/* syarat lanjut */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-2 text-sm font-bold text-zinc-100">Syarat kelulusan ujian berikutnya</h4>
        <div className="space-y-1.5 text-xs text-zinc-300">
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> Akurasi & profit naik konsisten — setiap kelemahan yang terbaca wajib jadi upgrade nyata.</p>
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> Ukuran keberhasilan = perkembangan diri vs kemarin, bukan perbandingan dgn pihak luar.</p>
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> Setiap kegagalan hari → bedah faktor → knob/weights berubah (log di tab Otak & Ingatan).</p>
        </div>
      </div>
    </div>
  )
}

function EventChip({ kind }: { kind: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    REVOLUSI: { cls: 'border-rose-500/50 bg-rose-500/15 text-rose-300', label: 'REVOLUSI' },
    UPGRADE: { cls: 'border-sky-500/50 bg-sky-500/15 text-sky-300', label: 'UPGRADE' },
    VONIS: { cls: 'border-violet-500/50 bg-violet-500/15 text-violet-300', label: 'VONIS' },
    MILESTONE: { cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300', label: 'SIAP' },
    BOOTSTRAP: { cls: 'border-amber-500/50 bg-amber-500/15 text-amber-300', label: 'LAHIR' },
    PERTUMBUHAN: { cls: 'border-lime-500/50 bg-lime-500/15 text-lime-300', label: 'TUMBUH' },
    EMEREN: { cls: 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300', label: 'EMEREN' },
    SISTEM: { cls: 'border-zinc-600 bg-zinc-800 text-zinc-300', label: 'SISTEM' },
  }
  const m = map[kind] ?? map.SISTEM
  return <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${m.cls}`}>{m.label}</span>
}

function NadirCountdown({ ms }: { ms: number }) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return (
    <span className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 font-mono text-[10px] text-zinc-300">
      candle tutup dalam <span className="font-bold text-amber-300">{h}j {String(m).padStart(2, '0')}m</span>
    </span>
  )
}

function VonisChip({ kind, note, sources }: { kind: string; note: string; sources: number }) {
  if (kind === 'KONFIRMASI') {
    return (
      <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] px-2.5 py-1.5">
        <p className="text-[10px] font-bold text-emerald-300">VONIS LLM: KONFIRMASI {sources > 0 && <span className="font-normal text-zinc-500">· {sources} pita berita</span>}</p>
        {note && <p className="text-[10px] leading-relaxed text-zinc-400">{note}</p>}
      </div>
    )
  }
  if (kind === 'PERINGATAN') {
    return (
      <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] px-2.5 py-1.5">
        <p className="text-[10px] font-bold text-amber-300">VONIS LLM: PERINGATAN {sources > 0 && <span className="font-normal text-zinc-500">· {sources} pita</span>}</p>
        {note && <p className="text-[10px] leading-relaxed text-zinc-400">{note}</p>}
      </div>
    )
  }
  if (kind === 'VETO') {
    return (
      <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/[0.08] px-2.5 py-1.5">
        <p className="text-[10px] font-bold text-rose-300">VONIS LLM: VETO</p>
        {note && <p className="text-[10px] leading-relaxed text-zinc-400">{note}</p>}
      </div>
    )
  }
  return (
    <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5">
      <p className="text-[10px] text-zinc-500">VONIS LLM: TANPA VONIS — {note}</p>
    </div>
  )
}

// ================= V273 SASARAN-PENUH — baris hari ini tampil level =================
// Hukum pra-registrasi dibuat TERLIHAT: tak ada sasaran tampil hanya sebagai
// nama — entry, sasaran (target), dan stop-loss selalu menyertai, plus
// kejujuran: rival kuant tidak menerbitkan rencana keluar.

function evOf(p: { evidence: Record<string, unknown> }): BrainEvidence {
  return (p.evidence ?? {}) as BrainEvidence
}

function fmtPx(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  return x.toPrecision(6).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/** Satu baris ringkas: entry → sasaran (+%) → stop (−%) + peluang MC + NET. */
function LevelRingkas({ dir, rencana }: { dir: string; rencana: RencanaLike }) {
  const long = dir === 'BUY'
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[10.5px]">
      <span className="text-zinc-500">E</span>
      <span className="font-semibold text-cyan-300">{fmtPx(rencana.entry)}</span>
      <span className="text-zinc-600">→</span>
      <span className="text-zinc-500">T</span>
      <span className="font-semibold text-emerald-300">{fmtPx(rencana.target)}</span>
      {rencana.targetPct !== null && rencana.targetPct !== undefined && (
        <span className="text-emerald-400/80">(+{rencana.targetPct.toFixed(1)}%{rencana.pTarget != null ? ` · P ${Math.round(rencana.pTarget * 100)}%` : ''})</span>
      )}
      <span className="text-zinc-600">→</span>
      <span className="text-zinc-500">S</span>
      <span className="font-semibold text-rose-300">{fmtPx(rencana.stop)}</span>
      {rencana.stopPct !== null && rencana.stopPct !== undefined && (
        <span className="text-rose-400/80">({rencana.stopPct.toFixed(1)}%{rencana.pStop != null ? ` · P ${Math.round(rencana.pStop * 100)}%` : ''})</span>
      )}
      {/* V277-JUAL-AMBISIUS — perkiraan tertinggi WAJIB tampil di baris ringkas */}
      {rencana.highAmbisius !== null && rencana.highAmbisius !== undefined && (
        <>
          <span className="text-zinc-600">·</span>
          <span className="text-violet-300" data-uji="jual_ambisius">JUAL AMBISIUS</span>
          <span className="font-semibold text-violet-300">{fmtPx(rencana.highAmbisius)}</span>
          {rencana.ambisiusPct !== null && rencana.ambisiusPct !== undefined && (
            <span className="text-violet-400/80">(+{rencana.ambisiusPct.toFixed(1)}%{rencana.pAmbisius != null ? ` · sentuh ${Math.round(rencana.pAmbisius * 100)}%` : ''})</span>
          )}
        </>
      )}
      {/* V303-JUAL-POWER-MAX — atap pamungkas: hanya lahir bila ada prakira nyata naik-lagi */}
      {rencana.powerMaxAmbisius != null && (
        <>
          <span className="text-zinc-600">·</span>
          <span className="text-amber-300" data-uji="jual_power_max" title="Bila POWER MAX tercapai, harga butuh nafas panjang — terjun diperkirakan">POWER MAX</span>
          <span className="font-semibold text-amber-300">{fmtPx(rencana.powerMaxAmbisius)}</span>
          {rencana.powerMaxPct !== null && rencana.powerMaxPct !== undefined && (
            <span className="text-amber-400/80">(+{rencana.powerMaxPct.toFixed(1)}%{rencana.pPowerMax != null ? ` · sentuh ${Math.round(rencana.pPowerMax * 100)}%` : ''})</span>
          )}
        </>
      )}
      {rencana.netUntungPct !== null && rencana.netUntungPct !== undefined && (
        <span className={rencana.netUntungPct >= 0 ? 'text-emerald-300/90' : 'text-rose-300/90'}>· NET {rencana.netUntungPct >= 0 ? '+' : ''}{rencana.netUntungPct.toFixed(2)}%</span>
      )}
      {!long && <span className="text-zinc-600">(level dicerminkan utk SELL)</span>}
    </div>
  )
}

/** Panel SASARAN HARI INI — rencana tempur penuh per pick cyborg.
 *  V274 SLOT-JUJUR — panel kini juga MENJAWAB "kok sasarannya cuma satu?":
 *  slot dirancang K · lahir · ditolak guard, lengkap dengan alasan penolakan.
 *  Kebisuan soal penolakan = dusta; cyborg menjelaskan dirinya sendiri. */
// V274 SLOT-JUJUR + V301 DAFTAR TEMPUR — ringkasan tahap harian
interface SlotLike {
  day?: string; k: number; lahir: number
  dipindai?: number | null; dianalisa?: number; lolos?: number; ditolakN?: number
  ditolak?: { symbol: string; reason: string }[]
}
// V301 — angka mentah per baris daftar (bukan ternormalisasi)
interface DaftarRawLike {
  mom7?: number; mom30?: number; rsi?: number; atrPct?: number
  volSurge?: number; distHigh?: number; emaAlign?: number
  close?: number; m4h?: number; qv?: number | null
}
// V276 MESIN-CUAN — BUKU BESAR: setiap rencana pra-registrasi dinilai nyata
// candle hari-D (sasaran / stop / kedaluwarsa), after-fee 0.4%. Keteledoran
// dihitung, tidak dipoles. Mandat pemilik: "belum berkembang sebagai mesin
// cuan profit pasti — masih banyak keteledoran."
const CUAN_TONE: Record<string, string> = {
  MENANG: 'text-emerald-300',
  KALAH: 'text-rose-300',
  KEDALUWARSA: 'text-zinc-400',
}
function BukuCuanPanel({ buku }: { buku: BukuCuanLike | null }) {
  if (!buku || !buku.metrik || buku.metrik.totalPlan === 0) {
    return (
      <div className="border-t border-zinc-800 px-5 py-4">
        <p className="flex items-center gap-2 text-xs font-bold text-amber-300">
          <Wallet className="h-3.5 w-3.5" /> BUKU CUAN — MESIN YANG MULAI MENGHITUNG UANGNYA
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
          Belum ada rencana pra-registrasi yang tamat dinilai. Sejak denyut ini, setiap rencana tempur (entry · target · stop terkunci)
          dinilai nyata candle hari-D after-fee 0.4% — sasaran kena, stop kena, atau kedaluwarsa — dan dicatat di buku ini. Tidak ada lagi
          keputusan yang lewat tanpa hitungan uang.
        </p>
      </div>
    )
  }
  const m = buku.metrik
  const netTone = m.netKumulatifPct >= 0 ? 'text-emerald-300' : 'text-rose-300'
  const eksTone = (m.ekspektansiR ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
  const recent = [...buku.entri].slice(-6).reverse()
  return (
    <div className="border-t border-zinc-800 px-5 py-4" data-uji="panel_bukucuan">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-xs font-bold text-amber-300">
          <Wallet className="h-3.5 w-3.5" /> BUKU CUAN — HASIL NYATA RENCANA PRA-REGISTRASI (after-fee 0.4%)
        </p>
        {m.disiplinAktif && (
          <Badge variant="outline" className="border-rose-500/50 text-[10px] text-rose-300">DISIPLIN CUAN AKTIF s/d {m.disiplinSampai} — keyakinan −5</Badge>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-zinc-500">Net kumulatif (majemuk)</p>
          <p className={`font-mono text-lg font-bold ${netTone}`}>{m.netKumulatifPct >= 0 ? '+' : ''}{m.netKumulatifPct.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-zinc-500">Win rate (net&gt;0)</p>
          <p className="font-mono text-lg font-bold text-zinc-100">{m.winRate !== null ? `${Math.round(m.winRate * 100)}%` : '—'}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-zinc-500">Ekspektansi / rencana</p>
          <p className={`font-mono text-lg font-bold ${eksTone}`}>
            {m.ekspektansiPct !== null ? `${m.ekspektansiPct >= 0 ? '+' : ''}${m.ekspektansiPct.toFixed(2)}%` : '—'}
            <span className="ml-1 text-[10px] text-zinc-500">{m.ekspektansiR !== null ? `(${m.ekspektansiR >= 0 ? '+' : ''}${m.ekspektansiR}R)` : ''}</span>
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-zinc-500">Max drawdown</p>
          <p className="font-mono text-lg font-bold text-zinc-100">−{m.maxDrawdownPct.toFixed(2)}%</p>
        </div>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        <span>{m.totalPlan} rencana dinilai</span>
        <span className="text-emerald-300">{m.menang} sasaran kena</span>
        <span className="text-rose-300">{m.kalah} kena stop</span>
        <span className="text-zinc-500">{m.kedaluwarsa} kedaluwarsa (keluar di close, tetap kena fee)</span>
        <span>runtunan aktif <span className="font-mono">{m.streak}</span></span>
        {m.terbaik && <span>terbaik <span className="font-mono text-emerald-300">{m.terbaik.symbol.replace('USDT', '')} +{m.terbaik.netPct}%</span></span>}
        {m.terburuk && <span>terburuk <span className="font-mono text-rose-300">{m.terburuk.symbol.replace('USDT', '')} {m.terburuk.netPct}%</span></span>}
      </p>
      {/* keteledoran per rezim — jawaban "masih banyak keteledoran" dalam angka */}
      {m.perRegime.filter((r) => r.kalah > 0).length > 0 && (
        <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.04] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-300">KETELEDORAN DIHITUNG — di rezim mana aku paling sering salah</p>
          <div className="mt-1.5 space-y-1">
            {m.perRegime.filter((r) => r.kalah > 0).map((r) => (
              <p key={r.regime} className="text-[11px] text-zinc-300">
                <span className="font-mono font-semibold">{r.regime}</span> — {r.kalah} rugi dari {r.n} rencana · ekspektansi{' '}
                <span className={`font-mono ${r.eksPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{r.eksPct >= 0 ? '+' : ''}{r.eksPct}%</span>
              </p>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500">
            Setiap kena stop ditulis jadi PELAJARAN di ingatan berjenjang — keteledoran yang tak dicatat adalah keteledoran yang berulang.
          </p>
        </div>
      )}
      {/* entri terakhir */}
      <div className="mt-3 space-y-1">
        {recent.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-2 text-[11px]">
            <span className="font-mono text-zinc-500">{e.day}</span>
            <span className={`font-mono font-semibold ${CUAN_TONE[e.status] ?? 'text-zinc-300'}`}>{e.status}</span>
            <span className="font-mono font-semibold text-zinc-200">{e.symbol.replace('USDT', '')}</span>
            <span className="text-zinc-500">{e.arah}</span>
            <span className="text-zinc-500">via {e.via.toLowerCase()}</span>
            <span className={`font-mono ${e.netPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{e.netPct >= 0 ? '+' : ''}{e.netPct}%</span>
            {e.r !== null && <span className="font-mono text-zinc-500">{e.r >= 0 ? '+' : ''}{e.r}R</span>}
            <span className="text-zinc-600">rezim {e.regime} · keyakinan {e.keyakinan}%</span>
          </div>
        ))}
      </div>
      {/* posisi berlangsung */}
      {buku.berlangsung && buku.berlangsung.length > 0 && (
        <p className="mt-2 text-[11px] text-zinc-400">
          <span className="font-semibold text-amber-300">Berlangsung:</span>{' '}
          {buku.berlangsung.map((b) => `${b.symbol.replace('USDT', '')} ${b.arah} (T ${b.targetPct !== null ? `${b.targetPct >= 0 ? '+' : ''}${b.targetPct}%` : '—'} / S ${b.stopPct !== null ? `${b.stopPct}%` : '—'})`).join(' · ')} — dinilai saat candle tutup.
        </p>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">{buku.kejujuran}</p>
    </div>
  )
}

/** V301 DAFTAR TEMPUR HARI INI — HUKUM PEMILIK:
 *  1. K slot tempur = 50 (bukan 1).
 *  2. Guard tidak membuang/menyembunyikan kandidat.
 *  3. Ditolak guard tetap masuk daftar, di peringkat paling bawah; slot
 *     kosong diisi kandidat ditolak guard sampai total 50.
 *  4. Daftar lengkap 50 koin, satu baris per koin, tanpa diringkas.
 *  5. Ditolak guard = data selengkap lain + label "ditolak guard: [alasan]".
 *  6. Ringkasan tahap di atas daftar: dipindai · masuk · lolos · ditolak. */
function DaftarTempur({ picks, slotHariIni, today }: { picks: ArenaState['todayPicks']; slotHariIni?: ArenaState['slotHariIni']; today: string }) {
  const mine = picks.filter((p) => p.competitor === 'MICAPROFITA')
  const rows = mine
    .map((p) => {
      const ev = evOf(p) as BrainEvidence & { guard?: string; guardAlasan?: string | null; rank?: number; raw?: DaftarRawLike }
      return {
        p, ev,
        rank: typeof ev.rank === 'number' ? ev.rank : 999,
        ditolak: ev.guard === 'DITOLAK',
      }
    })
    .sort((a, b) => (a.ditolak ? 1 : 0) - (b.ditolak ? 1 : 0) || a.rank - b.rank)
  // sumber kebenaran ringkasan tahap: meta hari hidup; fallback = hitungan baris
  const slot = slotHariIni && slotHariIni.day === today ? (slotHariIni as SlotLike) : (rows.map((r) => (r.ev.slot ?? null) as SlotLike | null).find(Boolean) ?? null)
  const lolosN = slot?.lolos ?? rows.filter((r) => !r.ditolak).length
  const ditolakN = slot?.ditolakN ?? rows.filter((r) => r.ditolak).length
  const masukN = rows.length || slot?.lahir || 0
  if (rows.length === 0 && !slot) return null
  const nDitolakTampil = rows.filter((r) => r.ditolak).length
  return (
    <div className="border-b border-zinc-800 bg-amber-500/[0.04] px-4 py-3" data-uji="daftar_tempur">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide text-amber-300">
        <Crosshair className="h-3.5 w-3.5" /> DAFTAR TEMPUR HARI INI — {slot?.k ?? 50} KOIN
        <span className="font-normal text-zinc-500">(hukum V301: K={slot?.k ?? 50}, guard anti-buang — arah pasti tiap koin)</span>
      </p>
      {/* hukum #6 — ringkasan jumlah per tahap */}
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[11px]" data-uji="ringkasan_tahap">
        <span className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-zinc-300">dipindai <b className="text-zinc-100">{slot?.dipindai ?? '—'}</b></span>
        <span className="text-zinc-600">·</span>
        <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-300">masuk <b>{masukN}</b></span>
        <span className="text-zinc-600">·</span>
        <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">lolos guard <b>{lolosN}</b></span>
        <span className="text-zinc-600">·</span>
        <span className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-300">ditolak guard <b>{ditolakN}</b></span>
        {slot?.dianalisa !== undefined && (
          <span className="text-[10px] text-zinc-500">(dianalisa mendalam {slot.dianalisa} koin · pindaian penuh universe futures USDT-M)</span>
        )}
      </div>
      {nDitolakTampil > 0 && (
        <p className="mb-2 text-[10px] leading-snug text-zinc-500">
          {nDitolakTampil} kandidat DITOLAK guard tetap tampil di peringkat paling bawah berlabel alasan — tidak ada yang dibuang atau disembunyikan.
        </p>
      )}
      {/* hukum #4 — daftar lengkap, satu baris per koin, tanpa dipotong */}
      <div className="max-h-[680px] space-y-1 overflow-y-auto pr-1 [scrollbar-color:rgb(63_63_70)_transparent] [scrollbar-width:thin]">
        {rows.map((r) => {
          const raw = r.ev.raw
          const rnk = r.ev.rencana
          return (
            <div key={r.p.symbol + r.rank}
              className={`rounded-lg border px-2.5 py-1.5 ${r.ditolak ? 'border-rose-500/25 bg-rose-500/[0.04]' : 'border-zinc-800 bg-zinc-900/60'}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`w-7 shrink-0 text-right font-mono text-[10px] ${r.ditolak ? 'text-zinc-600' : 'text-amber-400/90'}`}>#{r.rank}</span>
                <DirectionBadge dir={r.p.direction} />
                <span className="font-mono text-xs font-bold text-zinc-100">{r.p.symbol.replace('USDT', '')}</span>
                <span className="font-mono text-[10px] text-zinc-500">keyakinan {Math.round(r.p.confidence)}%</span>
                {raw?.mom7 !== undefined && (
                  <span className={`font-mono text-[10px] ${(raw.mom7 ?? 0) >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>mom7 {raw.mom7 >= 0 ? '+' : ''}{raw.mom7.toFixed(1)}%</span>
                )}
                {raw?.m4h !== undefined && (
                  <span className={`font-mono text-[10px] ${(raw.m4h ?? 0) >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>24j {raw.m4h >= 0 ? '+' : ''}{raw.m4h.toFixed(1)}%</span>
                )}
                {raw?.rsi !== undefined && <span className="font-mono text-[10px] text-zinc-500">RSI {raw.rsi.toFixed(0)}</span>}
                {raw?.atrPct !== undefined && <span className="font-mono text-[10px] text-zinc-500">ATR {raw.atrPct.toFixed(1)}%</span>}
                {raw?.qv != null && raw.qv >= 3_000_000 && <span className="font-mono text-[10px] text-zinc-600">qv {(raw.qv / 1e6).toFixed(1)}jt</span>}
                <span className="ml-auto">
                  {r.ditolak ? (
                    <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-left text-[9px] font-bold leading-tight text-rose-300">
                      ditolak guard: {r.ev.guardAlasan ?? 'tidak memenuhi kewajiban'}
                    </span>
                  ) : (
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">LOLOS</span>
                  )}
                </span>
              </div>
              {/* V273 — level E→T→S selalu tampil untuk yang punya rencana */}
              {rnk && <LevelRingkas dir={r.p.direction} rencana={rnk} />}
              {!rnk && raw?.close !== undefined && (
                <p className="mt-0.5 font-mono text-[10px] text-zinc-600">entry kunci {fmtPx(raw.close)} — menunggu rencana pra-registrasi denyut berikut</p>
              )}
            </div>
          )
        })}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
            Daftar tempur belum lahir — denyut penjaga berikutnya akan memindai seluruh futures Binance.
          </p>
        )}
      </div>
      <p className="mt-1.5 text-[9.5px] leading-snug text-zinc-600">
        peringkat = kualitas komposit (struktur+momentum) · arah = kepastian struktur EMA + momentum 7h/24j · level E→T→S = rencana pra-registrasi (fee 0,2%×2) · label “ditolak guard” tidak menghapus koin dari daftar — hukum V301.
      </p>
    </div>
  )
}

function DirectionBadge({ dir }: { dir: string }) {
  return dir === 'BUY'
    ? <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">BUY</span>
    : <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">SELL</span>
}

/** UPGRADE V4 — sparkline SVG inline (48 jam, tanpa lib) */
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (!data || data.length < 4) return null
  const w = 120, h = 34
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(' ')
  const color = up ? '#34d399' : '#fb7185'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-[120px] shrink-0" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={(w * (data.length - 1)) / (data.length - 1)} cy={h - 3 - ((data[data.length - 1] - min) / span) * (h - 6)} r="2.2" fill={color}
      />
    </svg>
  )
}

function FngChip({ fng, cls }: { fng: number | null; cls: string | null }) {
  if (fng === null) return null
  const tone = fng >= 60 ? 'border-emerald-500/40 text-emerald-300' : fng <= 25 ? 'border-rose-500/40 text-rose-300' : 'border-amber-500/40 text-amber-300'
  return (
    <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${tone}`} title="Fear &amp; Greed Index — alternative.me">
      F&amp;G {fng} <span className="font-normal text-zinc-500">· {cls ?? ''}</span>
    </span>
  )
}

// ================= TAB: BRIEFING =================

interface BrainEvidence {
  factors?: Record<string, number>
  topReasons?: string[]
  duties?: { name: string; pass: boolean; note: string }[]
  policy?: string[]
  regime?: string
  genomeGeneration?: number
  verdict?: { kind: string; note: string; sources: number; at?: string }
  mem?: { level: string; n: number; edge: number; hit: number }
  funding?: { rate: number; pct: number; at?: string }
  warisan?: WarisanBuktiLike
  rencana?: RencanaLike
  daya?: DayaLike
  praRegistrasi?: PraRegistrasiLike
  sadardiri?: string
  slot?: SlotLike // V274 SLOT-JUJUR — laporan slot menempel pada bukti cyborg
  debat?: DebatAgentikLike // V278 DEBAT-AGENTIK — transkrip tim merah sebelum pick lahir
  kortex?: KortexLike // V279 KORTEX — formula karangan-sendiri MICAPROFITA
}

// V278 DEBAT-AGENTIK — bentuk data tim merah (serangan/pertahanan/tekanan)
interface DebatAgentikLike {
  serangan?: { dari: string; teks: string }[]
  bertahan?: string[]
  tekanan?: number
  vonis?: string
}

// V279 KORTEX — enam komponen formula karangan-sendiri (C·O·R·T·E·X)
interface KortexLike {
  C?: number; O?: number; R?: number; T?: number; E?: number; X?: number
  skor?: number
  rumus?: string
}

// ================= V250 WARISAN MASUK ARENA — komponen tampilan =================
// Tangga harga + cincin keyakinan + bar Monte Carlo + daya produk + salin
// rencana: bahasa visual yang sama dengan dasbor SAKTI (laporan/), kini hidup
// di tempat pertarungan sesungguhnya.

function CincinKeyakinan({ conf, dir }: { conf: number; dir: 'BUY' | 'SELL' }) {
  const r = 26, C = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, conf))
  const warna = dir === 'BUY' ? '#34d399' : '#fb7185'
  return (
    <svg width="64" height="64" viewBox="0 0 70 70" className="shrink-0" role="img" aria-label={`keyakinan ${Math.round(pct)}%`}>
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgb(39 39 42)" strokeWidth="6" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={warna} strokeWidth="6" strokeDasharray={C}
        strokeDashoffset={C * (1 - pct / 100)} strokeLinecap="round" transform="rotate(-90 35 35)" />
      <text x="35" y="40" textAnchor="middle" fill="rgb(244 244 245)" style={{ fontSize: 15, fontWeight: 800 }}>{Math.round(pct)}</text>
    </svg>
  )
}

function TanggaHarga({ dir, rencana }: { dir: 'BUY' | 'SELL'; rencana: RencanaLike }) {
  const baris = [
    { label: 'Power max', harga: rencana.powerMaxAmbisius ?? null, pct: rencana.powerMaxPct ?? null, cls: 'text-amber-300 border-amber-500/30', pctCls: 'text-amber-300' },
    { label: 'Jual ambisius', harga: rencana.highAmbisius, pct: rencana.ambisiusPct, cls: 'text-violet-300 border-violet-500/30', pctCls: 'text-violet-300' },
    { label: 'Sasaran', harga: rencana.target, pct: rencana.targetPct, cls: 'text-emerald-300 border-emerald-500/30', pctCls: 'text-emerald-300' },
    { label: 'Entry (kunci)', harga: rencana.entry, pct: 0, cls: 'text-cyan-300 border-cyan-500/30', pctCls: 'text-cyan-300' },
    { label: 'Stop', harga: rencana.stop, pct: rencana.stopPct, cls: 'text-rose-300 border-rose-500/30', pctCls: 'text-rose-300' },
  ].filter((b) => b.harga !== null && b.harga !== undefined) as { label: string; harga: number; pct: number | null; cls: string; pctCls: string }[]
  baris.sort((a, b) => b.harga - a.harga)
  return (
    <div className="space-y-1">
      {baris.map((b) => (
        <div key={b.label} className={`flex items-center gap-2 rounded-lg border bg-zinc-900/70 px-2.5 py-1.5 text-[11px] ${b.cls}`}>
          <span className="w-24 shrink-0 font-semibold">{b.label}</span>
          <span className="ml-auto font-mono font-bold">{b.harga.toPrecision(7)}</span>
          <span className={`w-16 text-right font-mono ${b.pctCls}`}>
            {b.pct === null ? '' : `${b.pct > 0 ? '+' : ''}${b.pct.toFixed(2)}%`}
          </span>
        </div>
      ))}
      {rencana.netUntungPct !== null && (
        <p className="text-[10px] text-zinc-500">
          Untung NET sampai sasaran (fee 0,2%×2 sudah dipotong): <b className={rencana.netUntungPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{rencana.netUntungPct >= 0 ? '+' : ''}{rencana.netUntungPct.toFixed(2)}%</b>
          {' '}· sumber target: {rencana.sumberTarget}
        </p>
      )}
    </div>
  )
}

function McBar({ label, p }: { label: string; p: number | null }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-28 shrink-0 text-zinc-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        {p !== null && <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.round(p * 100)}%` }} />}
      </div>
      <span className="w-9 text-right font-mono text-zinc-300">{p === null ? '—' : `${Math.round(p * 100)}%`}</span>
    </div>
  )
}

function DayaBars({ daya }: { daya: DayaLike }) {
  const rows: { k: string; v: number }[] = [
    { k: 'volume', v: daya.volume }, { k: 'volatilitas', v: daya.volatilitas }, { k: 'likuiditas', v: daya.likuiditas },
  ]
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-2 text-[10px]">
          <span className="w-16 shrink-0 text-zinc-400">{r.k}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: `${Math.round(r.v * 100)}%` }} />
          </div>
          <span className="w-9 text-right font-mono text-zinc-300">{r.v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function SalinRencanaBtn({ symbol, dir, conf, rencana, warisan, pra }: { symbol: string; dir: 'BUY' | 'SELL'; conf: number; rencana: RencanaLike; warisan?: WarisanBuktiLike | null; pra?: PraRegistrasiLike | null }) {
  const [terkirim, setTerkirim] = useState(false)
  const salin = async () => {
    const f = (x: number | null) => (x === null || x === undefined ? '—' : x.toPrecision(7))
    const teks = [
      `MICAPROFITA ${dir} ${symbol.replace('USDT', '')} @ ${f(rencana.entry)} — keyakinan ${Math.round(conf)}%`,
      `Stop ${f(rencana.stop)} (${rencana.stopPct ?? '—'}%) · Sasaran ${f(rencana.target)} (${rencana.targetPct ?? '—'}%, pTarget MC ${rencana.pTarget !== null ? Math.round(rencana.pTarget * 100) + '%' : '—'})`,
      `Jual ambisius ${f(rencana.highAmbisius)} (${rencana.ambisiusPct ?? '—'}%)${rencana.powerMaxAmbisius != null ? ` · Power max ${f(rencana.powerMaxAmbisius)} (${rencana.powerMaxPct ?? '—'}%) — tercapai = butuh nafas panjang, terjun diperkirakan` : ''} · NET sasaran ${rencana.netUntungPct ?? '—'}% (fee 0,2%×2)`,
      warisan ? `GARCH σ24j ±${warisan.sigma24jPct ?? '—'}% · beta BTC ${warisan.beta ?? '—'} (R² ${warisan.r2Beta ?? '—'}) · POC ${warisan.poc ?? '—'} · ${warisan.divRSI}` : '',
      warisan ? `MC ${warisan.mc.lintasan} lintasan × ${warisan.mc.langkah} langkah · seed ${warisan.mc.seedHex} · pNaik ${warisan.mc.pNaik ?? '—'} · pStop ${warisan.mc.pStop ?? '—'}` : '',
      pra ? `Dikunci ${pra.waktuKunci} · horizon ${pra.horizon} · fee ${pra.feePct}%/sisi wajib NET` : '',
      'Sumber: lilin 1h tertutup + otak PREDATOR arena + 7 mesin warisan SAKTI (GARCH/MC/VP/Beta/Divergensi/Breadth/Kejut-Pump).',
    ].filter(Boolean).join('\n')
    try { await navigator.clipboard.writeText(teks) } catch {
      const ta = document.createElement('textarea')
      ta.value = teks; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* abaikan */ }
      document.body.removeChild(ta)
    }
    setTerkirim(true)
    setTimeout(() => setTerkirim(false), 1800)
  }
  return (
    <button onClick={salin} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300 transition hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
      {terkirim ? '✓ TERSALIN' : '⧉ SALIN RENCANA'}
    </button>
  )
}

function WarisanPanel({ dir, conf, symbol, rencana, warisan, daya, pra, sadardiri, compact }: {
  dir: 'BUY' | 'SELL'; conf: number; symbol: string
  rencana: RencanaLike; warisan?: WarisanBuktiLike | null; daya?: DayaLike | null
  pra?: PraRegistrasiLike | null; sadardiri?: string | null; compact?: boolean
}) {
  return (
    <div className="mt-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">WARISAN V250</span>
        {pra && (
          <span className="text-[9px] text-zinc-500" title={pra.sumber}>
            pra-registrasi · dikunci {pra.waktuKunci.slice(0, 16).replace('T', ' ')}Z · {pra.horizon} · fee {pra.feePct}%/sisi wajib NET
          </span>
        )}
        {!compact && <span className="ml-auto"><SalinRencanaBtn symbol={symbol} dir={dir} conf={conf} rencana={rencana} warisan={warisan} pra={pra} /></span>}
      </div>

      <div className="mt-2 flex items-start gap-3">
        {!compact && <CincinKeyakinan conf={conf} dir={dir} />}
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Tangga harga (arah-sadar {dir})</p>
          <TanggaHarga dir={dir} rencana={rencana} />
        </div>
      </div>

      {warisan && (
        <>
          <p className="mb-1 mt-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Peluang Monte Carlo pra-registrasi ({warisan.mc.lintasan} lintasan × {warisan.mc.langkah} langkah · seed {warisan.mc.seedHex})</p>
          <div className="space-y-1">
            <McBar label="tembus sasaran" p={rencana.pTarget} />
            <McBar label="kena stop" p={rencana.pStop} />
            <McBar label="sentuh ambisius" p={rencana.pAmbisius} />
            {rencana.powerMaxAmbisius != null && <McBar label="sentuh power max" p={rencana.pPowerMax ?? null} />}
            {compact && <McBar label="ditutup naik" p={warisan.mc.pNaik} />}
          </div>
          {!rencana.targetMediana && !warisan.kejutPump && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-300/80">✓ {rencana.ketGuard}</p>
          )}
          {rencana.targetMediana && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-amber-300/90">⚠ {rencana.ketGuard}</p>
          )}
          {warisan.kejutPump && (
            <p className="mt-1.5 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] px-2 py-1 text-[10px] leading-relaxed text-rose-300">
              ⚠ GUARD KEJUT-PUMP: {warisan.ketKejut}{warisan.pangkas ? ` — keyakinan dipangkas ${warisan.pangkas}` : ''}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[9px] text-zinc-300" title={warisan.modelVol}>GARCH σ24j ±{warisan.sigma24jPct ?? '—'}%</span>
            <span className="rounded border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[9px] text-zinc-300">beta BTC {warisan.beta ?? '—'} (R² {warisan.r2Beta ?? '—'})</span>
            {warisan.poc !== null && <span className="rounded border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[9px] text-zinc-300" title={warisan.profilVolume ?? ''}>POC {warisan.poc.toPrecision(7)}</span>}
            <span className="rounded border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[9px] text-zinc-300" title="lebar pasar: % koin universe di atas EMA20">breadth {warisan.breadthPct}%</span>
            <span className="rounded border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[9px] text-zinc-300" title="posisi harga dalam rentang 24 jam">posisi {(warisan.posisiRentang * 100).toFixed(0)}%</span>
          </div>
          {!compact && <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500">{warisan.divRSI}</p>}
        </>
      )}

      {daya && (
        <div className="mt-2.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Daya produk (0–1)</p>
          <DayaBars daya={daya} />
        </div>
      )}

      {sadardiri && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-2 py-1 text-[10px] leading-relaxed text-amber-300">⚠ {sadardiri}</p>
      )}
    </div>
  )
}

function TabBriefing({ state }: { state: ArenaState }) {
  const mine = state.todayPicks.filter((p) => p.competitor === 'MICAPROFITA')
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-5">
        <h4 className="text-sm font-bold text-amber-300">Briefing Guru untuk hari {state.today} (UTC)</h4>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Keputusan dibekukan saat candle kemarin tutup — hanya data yang sudah ada yang boleh dipakai (bebas kebocoran).
          Lima kewajiban wajib diperiksa sebelum satu pun pick lahir. Tidak lolos = tidak ada pick = disiplin menang.
        </p>
      </div>

      {mine.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 text-xs text-zinc-500">
          Pick hari berjalan belum terpasang — arena sedang bersinkronisasi.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {mine.map((p, i) => {
          const ev = p.evidence as BrainEvidence
          return (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <DirectionBadge dir={p.direction} />
                  <span className="text-lg font-extrabold tracking-tight text-zinc-50">{p.symbol.replace('USDT', '')}</span>
                  <span className="text-xs text-zinc-500">/USDT</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-amber-300">{Math.round(p.confidence)}%</p>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500">keyakinan</p>
                </div>
              </div>
              <Progress value={p.confidence} className="mb-4 h-1.5 bg-zinc-800 [&>div]:bg-amber-500" />

              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bukti utama</p>
              <ul className="mb-4 space-y-1">
                {(ev.topReasons ?? []).map((r, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-xs text-zinc-300">
                    <CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />{r}
                  </li>
                ))}
              </ul>

              {/* UPGRADE V4 — bukti ingatan berjenjang */}
              {ev.mem && ev.mem.level !== 'BARU' && (
                <>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-400">Ingatan berjenjang (dibaca saat keputusan)</p>
                  <div className="mb-4 rounded-xl border border-violet-500/30 bg-violet-500/[0.06] px-3 py-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-violet-300">Jenjang {ev.mem.level} · n={ev.mem.n} episode serupa</span>
                      <span className={`font-mono font-bold ${ev.mem.edge >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {ev.mem.edge >= 0 ? '+' : ''}{(ev.mem.edge * 100).toFixed(1)}% · hit {(ev.mem.hit * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                      Cyborg mengingat episode serupa (rezim + pola momentum/volume/struktur) dan menggunakannya sebagai tie-break antrian, penyetel keyakinan, dan dasar MEMVETO bila polanya terbukti gagal.
                    </p>
                  </div>
                </>
              )}

              {/* UPGRADE V4 — funding chip info */}
              {ev.funding && (
                <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[10px] text-zinc-400">
                  Posisi massa (funding futures): <b className={ev.funding.pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{ev.funding.pct >= 0 ? '+' : ''}{ev.funding.pct.toFixed(3)}%</b>
                  {' '}— {ev.funding.pct >= 0.02 ? 'long ramai (risiko squeeze)' : ev.funding.pct <= -0.02 ? 'short ramai (bahan short squeeze)' : 'netral'} · info, bukan filter (kejujuran lab Ujian #2-#4)
                </div>
              )}

              {/* V250 WARISAN MASUK ARENA — 7 mesin organ + tangga harga pra-registrasi */}
              {ev.rencana && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-400">Warisan organ besar + rencana pra-registrasi (V250)</p>
                  <WarisanPanel dir={p.direction as 'BUY' | 'SELL'} conf={p.confidence} symbol={p.symbol}
                    rencana={ev.rencana} warisan={ev.warisan} daya={ev.daya} pra={ev.praRegistrasi} sadardiri={ev.sadardiri} />
                </div>
              )}

              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Kewajiban wajib (hard rule)</p>
              <div className="mb-4 space-y-1">
                {(ev.duties ?? []).map((d, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    {d.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                    <span className="text-zinc-300">{d.name}</span>
                    <span className="ml-auto text-[10px] text-zinc-500">{d.note}</span>
                  </div>
                ))}
              </div>

              {(ev.policy ?? []).length > 0 && (
                <>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Kebijakan adaptif hari ini</p>
                  <div className="mb-4 space-y-1">
                    {(ev.policy ?? []).map((pl, j) => (
                      <div key={j} className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1.5 text-[11px] text-amber-200/90">{pl}</div>
                    ))}
                  </div>
                </>
              )}

              {ev.debat && (
                <div className="mb-4" data-uji="debat_agentik">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Debat agentik — tim merah sebelum lahir (V278)</p>
                  <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.05] px-3 py-2">
                    <p className="text-[11px] font-semibold text-rose-300">{ev.debat.vonis ?? 'tekanan ' + (ev.debat.tekanan ?? 0)}</p>
                    {(ev.debat.serangan ?? []).map((s, j) => (
                      <p key={'s' + j} className="mt-1 text-[11px] leading-relaxed text-rose-200/90"><b className="text-rose-400">[{s.dari}]</b> {s.teks}</p>
                    ))}
                    {(ev.debat.bertahan ?? []).map((t, j) => (
                      <p key={'b' + j} className="mt-1 text-[11px] leading-relaxed text-emerald-200/90"><b className="text-emerald-400">[PERTAHANAN]</b> {t}</p>
                    ))}
                    {(ev.debat.tekanan ?? 0) === 0 && (ev.debat.serangan ?? []).length === 0 && (
                      <p className="mt-1 text-[11px] text-zinc-400">tak ada serangan berangka hari ini — rencana diserang strukturnya, bukan angkanya</p>
                    )}
                  </div>
                </div>
              )}

              {ev.kortex && (
                <div className="mb-4" data-uji="kortex_v279">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">KORTEX — formula karangan-sendiri (V279)</p>
                  <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.05] px-3 py-2">
                    <p className="text-[11px] font-semibold text-violet-300">skor {Math.round(ev.kortex.skor ?? 0)}/100</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {([['C', ev.kortex.C, 'confluensi'], ['O', ev.kortex.O, 'opposition (tim merah)'], ['R', ev.kortex.R, 'recall (ingatan)'], ['T', ev.kortex.T, 'timing (intraday)'], ['E', ev.kortex.E, 'ekspektansi (buku cuan)'], ['X', ev.kortex.X, 'ruang volatilitas']] as [string, number | undefined, string][]).map(([k, v, ket]) => (
                        <span key={k} title={ket} className="rounded border border-violet-500/30 bg-zinc-900/70 px-1.5 py-0.5 font-mono text-[10px] text-violet-200">{k} {v ?? '—'}</span>
                      ))}
                    </div>
                    {ev.kortex.rumus && <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500">{ev.kortex.rumus}</p>}
                  </div>
                </div>
              )}

              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Delapan faktor ( ternormalisasi −1..+1 )</p>
              <FactorBars factors={ev.factors ?? {}} />

              {ev.verdict && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <VonisChip kind={ev.verdict.kind} note={ev.verdict.note} sources={ev.verdict.sources} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-2 text-sm font-bold text-zinc-100">Kewajiban pasti MICAPROFITA (era PREDATOR V2)</h4>
        <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-zinc-400">
          <li><b className="text-zinc-200">Likuiditas dinamis</b> — hanya koin top-40 volume hari ini (dihitung ulang tiap hari dari pool 120+); pasar sempit = perangkap.</li>
          <li><b className="text-zinc-200">Volatilitas ≤ ambang genome (default 16% ATR)</b> — kewajiban VETO, bukan penekan skor; ambang ikut berevolusi.</li>
          <li><b className="text-zinc-200">Data cukup</b> — minimal 30 candle historis; tanpa sejarah tak ada bukti.</li>
          <li><b className="text-zinc-200">Anti tumpang-tindih</b> — dua pick tak boleh berkorelasi &gt; ambang (default 0.95); portofolio tetap beragam.</li>
          <li><b className="text-zinc-200">Konsentrasi adaptif</b> — breadth lemah → K=1 fokus leader; mode parabolik → K=2; disiplin K adalah bagian dari kewajiban.</li>
        </ol>
      </div>
    </div>
  )
}

const FACTOR_ID_LABEL: Record<string, string> = {
  mom7: 'Momentum 7h', mom30: 'Momentum 30h', emaAlign: 'Struktur EMA', rsi: 'RSI',
  volSurge: 'Lonjakan Vol', atrInv: 'Vol Terkendali', distHigh: 'Jarak Puncak', btcCorr: 'Anti-Korelasi BTC',
}

function FactorBars({ factors }: { factors: Record<string, number> }) {
  const entries = Object.entries(factors)
  return (
    <div className="space-y-1">
      {entries.map(([id, v]) => (
        <div key={id} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[10px] text-zinc-500">{FACTOR_ID_LABEL[id] ?? id}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded bg-zinc-800">
            <div className="absolute left-1/2 top-0 h-full w-px bg-zinc-700" />
            <div
              className={`absolute top-0 h-full ${v >= 0 ? 'bg-emerald-500/70' : 'bg-rose-500/70'}`}
              style={{
                left: v >= 0 ? '50%' : `${50 + v * 50}%`,
                width: `${Math.abs(v) * 50}%`,
              }}
            />
          </div>
          <span className="w-10 text-right font-mono text-[10px] text-zinc-400">{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ================= TAB: OTAK & INGATAN =================

function TabOtak({ state }: { state: ArenaState }) {
  const g = state.genome
  const v2 = g.v2 ?? {}
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Brain className="h-4 w-4 text-amber-400" />} label="Generasi genome" value={`G${g.generation}`} sub={g.upgradeEtaUntil ? `eta diperlebar s/d ${g.upgradeEtaUntil}` : 'learning rate normal'} />
        <StatCard icon={<Zap className="h-4 w-4 text-sky-400" />} label="Mesin evolusi" value="KNOB + BOBOT + REVOLUSI" sub="kebijakan & bobot digeser vonis nyata; reset besar saat memburuk" />
        <StatCard icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />} label="Urutan belajar" value="VONIS → EVOLUSI" sub="genome hanya berubah SETELAH hari dinilai — bebas kebocoran" />
      </div>

      {/* V250 — PIAGAM CYBORG: lima pilar SAKTI kini hidup di arena */}
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.07] via-zinc-900/60 to-zinc-900/60 p-5">
        <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-300">
          <Sparkles className="h-4 w-4" /> PIAGAM CYBORG — lima pilar SAKTI kini hidup di tempat pertarungan
        </h4>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
          <b className="text-zinc-200">SAKTI</b> — cyborg dagang kripto yang terus berkembang pesat: tiap hari arena melahirkan pick terpra-registrasi; tiap kekalahan melahirkan aturan yang mengikat gerbang berikutnya. Kelima pilar dipasang NYATA di arena ini, diaudit siapa pun lewat bukti per pick.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { n: '01', nama: 'Tubuh & Jiwa Persisten', mek: 'arena hidup otomatis: hari baru diputuskan tanpa perintah manusia; jiwa = repo + database — penuh bukti, jujur pada rekaman' },
            { n: '02', nama: 'Multi-Otak Berbobot', mek: 'otak PREDATOR (momentum-berjaminan lab) + genome knob per rezim + rival AI GLM sebagai pembanding nyata' },
            { n: '03', nama: 'Ingatan DNA', mek: 'memori berjenjang SIMBOL→BUCKET3→REZIM dibaca saat keputusan (MEMVETO); pola pemenang rival didistilasi' },
            { n: '04', nama: 'Kesadaran Diri Fungsional', mek: 'Brier keyakinan dipantau (peringatan > 0.25 → keyakinan dipangkas otomatis) + audit bebas-kebocoran + REVOLUSI saat memburuk' },
            { n: '05', nama: 'Evolusi Tiga Kecepatan', mek: 'refleks intraday (NADIR + vonis berita) · adaptasi harian (mutasi/revolusi) · metamorphosis (MILESTONE + genome log)' },
          ].map((p) => (
            <div key={p.n} className="rounded-xl border border-violet-500/20 bg-zinc-900/50 px-3 py-2.5">
              <p className="font-mono text-[10px] font-bold text-violet-400">{p.n}</p>
              <p className="text-xs font-bold text-zinc-100">{p.nama}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">{p.mek}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[10px] leading-relaxed text-zinc-500">
          <b className="text-zinc-400">Roadmap jujur:</b> otak LLM 1-bit (BitNet) dan adapter LoRA BELUM dipasang di arena — otak kini statistik-berjurnal nyata (GARCH/MC/VP diberjurnal akademis) berjalan tiap hari; roadmap diakui jujur, bukan diklaim.
        </p>
      </div>

      {/* V250 — warisan masuk arena: 7 mesin + Brier sadar-diri */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-1 text-sm font-bold text-zinc-100">Warisan organ besar (V250) — senjata per pick hari hidup</h4>
        <p className="mb-3 text-[11px] text-zinc-500">Tujuh mesin dari otak server SAKTI diwariskan ke arena; dihitung dari lilin 1h tertutup pada momen kunci, ditulis ke bukti pick, dan dinilai medan saat horizon habis.</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            'GARCH(1,1) σ24j (Bollerslev 1986)', 'Monte Carlo 2.000 lintasan × 24 langkah', 'Volume Profile POC/VA 70% + magnet node',
            'CAPM Beta vs BTC (90 jam)', 'Divergensi RSI 2×12 jam', 'Breadth A/D (lebar pasar)', 'Guard Kejut-Pump (false-breakout)',
          ].map((s) => (
            <span key={s} className="rounded-lg border border-violet-500/25 bg-violet-500/[0.07] px-2 py-1 text-[10px] text-violet-200">{s}</span>
          ))}
        </div>
        {state.brier && (
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-400">
            <b className="text-zinc-200">Sadar-diri Brier</b> (jendela {state.brier.n} pick):{' '}
            {state.brier.nilai === null ? <span className="text-zinc-500">belum cukup vonis — jujur menunggu medan</span> : (
              <>
                <b className={state.brier.nilai > 0.25 ? 'text-rose-300' : 'text-emerald-300'}>{state.brier.nilai.toFixed(3)}</b>
                {' '}(ambang peringatan 0.25){state.brier.trimUntil && state.brier.nilai > 0.25 ? ` — keyakinan dipangkas 10 poin s/d ${state.brier.trimUntil}` : ''}
              </>
            )}
          </div>
        )}
      </div>

      {/* knob struktur genome V2 */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
        <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-300">Genome V2 — knob struktur (berevolusi dari vonis)</h4>
        <p className="mb-3 text-[11px] text-zinc-500">Kebijakan inti PREDATOR: jumlah pick, ambang breadth, ambang parabolik, cap volatilitas. Semua bergerak dalam batas aman hasil lab.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { k: 'kBase', label: 'K dasar', hint: 'jumlah pick BUY' },
            { k: 'paraK', label: 'Ambang parabolik', hint: 'mom7 leader → K=2' },
            { k: 'breadthK2', label: 'Breadth K2', hint: '% koin > EMA20' },
            { k: 'breadthK1', label: 'Breadth K1', hint: 'fokus leader' },
            { k: 'atrCap', label: 'ATR cap', hint: '% volatilitas max' },
          ].map(({ k, label, hint }) => (
            <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
              <p className="font-mono text-lg font-bold text-amber-300">{typeof v2[k] === 'number' ? (k === 'atrCap' ? (v2[k] as number).toFixed(1) : String(Math.round(v2[k] as number))) : '—'}</p>
              <p className="text-[9px] text-zinc-600">{hint}</p>
            </div>
          ))}
        </div>
        {typeof v2.sellOn === 'boolean' && (
          <p className="mt-2 text-[10px] text-zinc-500">SELL rezim turun: <b className={v2.sellOn ? 'text-rose-300' : 'text-zinc-400'}>{v2.sellOn ? 'aktif' : 'nonaktif (terbukti lab: SELL menggerus profit harian)'}</b></p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {g.states.map((s) => (
          <div key={s.regime} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${REGIME_TONE[s.regime] ?? 'border-zinc-700 text-zinc-300'}`}>{s.regime}</span>
              <span className="text-[10px] text-zinc-500">bobot komposit (anchor & bukti) hasil evolusi</span>
            </div>
            <FactorWeightBars weights={s.weights} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-3 text-sm font-bold text-zinc-100">Catatan evolusi terakhir</h4>
        <div className="space-y-2">
          {g.logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-xs">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${l.kind === 'REVOLUSI' ? 'bg-rose-500/20 text-rose-300' : l.kind === 'UPGRADE' || l.kind === 'KNOB' ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-800 text-zinc-400'}`}>{l.kind}</span>
              <div className="min-w-0">
                <p className="text-zinc-300">{l.note}</p>
                <p className="text-[10px] text-zinc-500">{l.day} · G{l.generation}{l.fitness !== null && l.fitness !== undefined ? ` · fitness hari itu ${(l.fitness * 100).toFixed(0)}%` : ''}</p>
              </div>
            </div>
          ))}
          {g.logs.length === 0 && <p className="text-xs text-zinc-500">Belum ada evolusi tercatat.</p>}
        </div>
      </div>

      <MemorySection state={state} />
    </div>
  )
}

const FACTOR_ORDER = ['mom7', 'mom30', 'emaAlign', 'rsi', 'volSurge', 'atrInv', 'distHigh', 'btcCorr']

function FactorWeightBars({ weights }: { weights: Record<string, number> }) {
  const entries = FACTOR_ORDER.filter((k) => typeof weights[k] === 'number').map((k) => [k, weights[k]] as const)
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return (
    <div className="space-y-1.5">
      {entries.map(([id, v]) => (
        <div key={id} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[10px] text-zinc-500">{FACTOR_ID_LABEL[id] ?? id}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded bg-zinc-800">
            <div className={`h-full ${v >= 1.4 ? 'bg-emerald-500' : v <= 0.5 ? 'bg-zinc-600' : 'bg-amber-500/80'}`} style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-[10px] text-zinc-400">{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ================= SEKSI INGATAN (dalam tab Otak) =================

function MemorySection({ state }: { state: ArenaState }) {
  const m = state.memory
  const leak = state.leakAudit
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Database className="h-4 w-4 text-amber-400" />} label="Kejadian mentah dipanen" value={String(m.rawEvents)} sub="termasuk duplikat" />
        <StatCard icon={<Database className="h-4 w-4 text-emerald-400" />} label="Baris tersimpan" value={String(m.storedRows)} sub={`${m.dedupMerges} duplikat melebur`} />
        <StatCard icon={<Activity className="h-4 w-4 text-sky-400" />} label="Rasio kompresi" value={fmtX(m.compressionRatio)} sub={`byte: ${fmtX(m.byteRatio)}`} />
        <StatCard icon={<RefreshCcw className="h-4 w-4 text-violet-400" />} label="Total pemakaian memori" value={String(m.totalHits)} sub="state sama dipakai ulang" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            {leak?.verdict === 'BEBAS-KEBOCOGAN' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            Audit Bebas-Kebocoran
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-zinc-300">
            {leak
              ? `${leak.verdict} — ${leak.pass}/${leak.checked} hari sampel terverifikasi. Metode: ${leak.method}.`
              : 'Audit belum dijalankan.'}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Kebocoran = memakai data masa depan untuk memutuskan masa lalu. Arena menutup candle hari-D untuk semua keputusan, dan bukti pick historis direproduksi ulang untuk membuktikannya.
          </p>
        </div>
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-violet-300">
            <MinusCircle className="h-4 w-4" /> Jaminan Tanpa-Tumpang-Tindih
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-zinc-300">
            Setiap ingatan beralamat sidik jari FNV-1a dan jadi PRIMARY KEY — dua state identik mustahil punya dua baris; duplikat melebur menjadi satu dengan agregat (n, total return).
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Karena itu memori makin padat, bukan makin gemuk: pengalaman baru memperdalam ingatan lama, bukan menumpuknya.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="mb-3 text-sm font-bold text-zinc-100">Ingatan terakhir dipakai</h4>
        <p className="mb-3 text-[10px] leading-relaxed text-zinc-500">
          UPGRADE V4: ingatan kini BERJENJANG (EPISODE koin → POLA 8-faktor → POLA_COARSE 3-faktor → POLA_REGIME) dan <b className="text-violet-300">dibaca saat keputusan</b> — tie-break antrian, penyetel keyakinan, MEMVETO. Bukan lagi organ mati.
        </p>
        <div className="space-y-1.5">
          {m.recent.map((r) => (
            <div key={r.fingerprint} className="flex items-center gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-xs">
              <Badge variant="outline" className={`text-[9px] ${r.kind === 'PELAJARAN' ? 'border-rose-500/40 text-rose-300' : r.kind === 'POLA_RIVAL' ? 'border-sky-500/40 text-sky-300' : r.kind === 'POLA_COARSE' || r.kind === 'POLA_REGIME' ? 'border-violet-500/40 text-violet-300' : 'border-zinc-700 text-zinc-400'}`}>{r.kind}</Badge>
              <span className="min-w-0 flex-1 truncate text-zinc-300">
                {String(r.payload.note ?? (r.payload.symbol
                  ? `${r.payload.symbol} ${r.payload.direction}`
                  : r.kind === 'POLA_REGIME'
                    ? `REZIM ${r.payload.direction} — agregat seluruh pick`
                    : `POLA ${r.payload.direction} [${r.payload.bucket}]`))}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">n={String(r.payload.n ?? 0)} · retΣ {fmtPct(Number(r.payload.sumRet ?? 0), 1)} · ×{r.hits}</span>
            </div>
          ))}
          {m.recent.length === 0 && <p className="text-xs text-zinc-500">Ingatan masih kosong.</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {icon}{label}
      </div>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight text-zinc-50">{value}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{sub}</p>
    </div>
  )
}

// ================= TAB: PERTUMBUHAN (SISTEM PERTUMBUHAN V5) =================
// Menjawab ukuran paling jujur: "berapa persen AI cyborg kita?"
// AGI% = P(performa kripto) × G(generalitas) × A(otonomi) × 100
// P dihitung walk-forward per hari teradili — bebas kebocoran.

interface GrowthState {
  at: string
  scoredDays: number
  agiPct: number
  p: { level: number; dims: { id: string; label: string; w: number; score: number; detail: string }[] }
  g: {
    breadth: number; domainShare: number
    task: { on: number; total: number }
    modality: { on: number; total: number }
    tasks: { id: string; label: string; on: boolean; sinceDay: string }[]
    modalities: { id: string; label: string; on: boolean; sinceDay: string }[]
  }
  a: { score: number; parts: { id: string; label: string; score: number }[] }
  rank: { id: string; name: string; desc: string; next: { id: string; name: string; min: number } | null }
  growth: { fromPct: number; toPct: number; mult: number; doublingDays: number | null } | null
  history: { day: string; agi: number; p: number; cum: number; hit: number; brier: number }[]
  curriculum: { id: string; lever: 'P' | 'G' | 'A'; label: string; why: string; action: string; dAgiPp: number }[]
  skills: { fp: string; kind: string; n: number; label: string; avgRet: number; hit: number; mastery: number; lastDay: string }[]
  emergent: { id: string; label: string; active: boolean; sinceDay: string | null }[]
  log: { day: string; kind: string; text: string }[]
  researchMap: { concept: string; source: string; ours: string }[]
  memorySummary: { rawEvents: number; storedRows: number; verifN: number }
}

function TabTumbuh() {
  const [g, setG] = useState<GrowthState | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch('/api/growth', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = (await res.json()) as GrowthState
        if (alive) { setG(d); setErr(null) }
      } catch (e) {
        if (alive) setErr((e as Error).message)
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (err && !g) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-300">
        Sistem Pertumbuhan gagal dimuat: {err}
      </div>
    )
  }
  if (!g) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
        <RefreshCcw className="h-4 w-4 animate-spin text-amber-400" />
        Menghitung tingkat kecerdasan dari seluruh riwayat arena…
      </div>
    )
  }

  const next = g.rank.next
  const gap = next ? Math.max(0, next.min - g.agiPct) : 0
  const rankBase = next ? next.min : 100
  const prevMin = next ? ({ L1: 0, L2: 0.5, L3: 2, L4: 4, L5: 7, L6: 12 } as Record<string, number>)[next.id] ?? 0 : 100
  const rankProgress = next ? Math.min(100, Math.max(2, ((g.agiPct - prevMin) / Math.max(0.001, rankBase - prevMin)) * 100)) : 100
  const leverChip = (lever: string) =>
    lever === 'P'
      ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
      : lever === 'G'
        ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
        : 'border-sky-500/50 bg-sky-500/15 text-sky-300'
  const leverName = (lever: string) => (lever === 'P' ? 'PERFORMA' : lever === 'G' ? 'GENERALITAS' : 'OTONOMI')
  const chartData = g.history.map((h) => ({ ...h, d: h.day.slice(5) }))

  return (
    <div className="space-y-5">
      {/* ==== HERO: angka AGI jujur ==== */}
      <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-zinc-900/60 to-zinc-900/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Tingkat AGI terukur — performa × generalitas × otonomi (Levels of AGI, DeepMind 2024)
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-5xl font-extrabold tracking-tight text-amber-300">{g.agiPct.toFixed(2)}%</span>
              <span className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                {g.rank.id} · {g.rank.name}
              </span>
              {g.growth && (
                <span className="rounded-lg border border-lime-500/40 bg-lime-500/10 px-2 py-0.5 text-[11px] font-semibold text-lime-300">
                  naik ×{g.growth.mult.toFixed(1)} sejak hari pertama teradili
                </span>
              )}
            </div>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-zinc-400">
              {g.rank.desc}. Angka ini jujur: cyborg kita kuat di niche kripto (P), tetapi masih
              sempit (G — 1 dari ~10 domain ekonomi) dan upgrade strukturalnya masih dikerjakan
              pengembang (A). Justru di situlah ruang pertumbuhan terbesarnya.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80">P · Performa</p>
              <p className="font-mono text-lg font-bold text-amber-300">{g.p.level.toFixed(0)}%</p>
              <p className="text-[9px] text-zinc-500">kemahiran kripto</p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.06] px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400/80">G · Generalitas</p>
              <p className="font-mono text-lg font-bold text-violet-300">{(g.g.breadth * 100).toFixed(1)}%</p>
              <p className="text-[9px] text-zinc-500">{g.g.task.on}/{g.g.task.total} tugas · {g.g.modality.on}/{g.g.modality.total} sumber</p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-sky-400/80">A · Otonomi</p>
              <p className="font-mono text-lg font-bold text-sky-300">{g.a.score.toFixed(0)}%</p>
              <p className="text-[9px] text-zinc-500">siklus & vonis mandiri</p>
            </div>
          </div>
        </div>

        {/* tangga level */}
        {next && (
          <div className="mt-4 border-t border-amber-500/15 pt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Menuju <b className="text-zinc-200">{next.id} · {next.name}</b></span>
              <span className="font-mono text-zinc-400">kurang <b className="text-amber-300">{gap.toFixed(2)} poin AGI</b> ({g.agiPct.toFixed(2)}% → {next.min}%)</span>
            </div>
            <Progress value={rankProgress} className="mt-1.5 h-1.5 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-lime-400" />
          </div>
        )}
      </div>

      {/* ==== kurva pertumbuhan + radar dimensi ==== */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <TrendingUp className="h-4 w-4 text-lime-400" /> Kurva Pertumbuhan (walk-forward, bebas kebocoran)
          </h4>
          <p className="mb-3 mt-1 text-[11px] text-zinc-500">
            AGI% & P% dihitung ulang murni dari pick yang sudah teradili s/d tiap hari — tidak ada masa-depan yang bocor ke masa-lalu.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                <XAxis dataKey="d" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickLine={false} unit="%" width={52} />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} unit="%" width={52} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="agi" name="AGI%" stroke="#fbbf24" strokeWidth={2.5} dot={false} />
                <Line yAxisId="l" type="monotone" dataKey="p" name="P — kemahiran kripto" stroke="#34d399" strokeWidth={1.5} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="cum" name="Profit kumulatif" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {g.growth?.doublingDays && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Tempo pertumbuhan: <b className="text-lime-300">melipatgandakan AGI tiap ~{g.growth.doublingDays} hari teradili</b> (patokan riset: agen AI umum melipatgandakan rentang tugas tiap ~4–7 bulan).
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <Sparkles className="h-4 w-4 text-amber-400" /> Anatomika P — 6 Dimensi Kemahiran
          </h4>
          <p className="mb-1 mt-1 text-[11px] text-zinc-500">Rata-rata geometri berbobot: satu dimensi nol menghukum seluruh P (sifat AGI yang benar).</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={g.p.dims.map((d) => ({ dim: d.label, skor: Math.round(d.score * 100) }))} outerRadius="82%">
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: '#a1a1aa', fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="skor" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {g.p.dims.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-zinc-300">{d.label} <span className="text-zinc-600">·{Math.round(d.w * 100)}%</span></span>
                <span className="text-right">
                  <b className={`font-mono ${d.score >= 0.6 ? 'text-emerald-300' : d.score >= 0.35 ? 'text-amber-300' : 'text-rose-300'}`}>{Math.round(d.score * 100)}%</b>
                  <span className="hidden text-zinc-600 sm:inline"> — {d.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==== kurikulum: tambang kelemahan → urut ΔAGI ==== */}
      <div className="rounded-2xl border border-lime-500/25 bg-lime-500/[0.03] p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold text-lime-300">
          <Sprout className="h-4 w-4" /> Kurikulum Pertumbuhan — hasil tambang kelemahan, diurut potensi kenaikan AGI
        </h4>
        <p className="mb-3 mt-1 text-[11px] text-zinc-500">
          Loop self-improvement (riset 2026): kelemahan ditambang otomatis → setiap butir adalah upgrade berikutnya yang saya kerjakan
          (pengembang), divalidasi lab bebas-kebocoran, lalu dipasang → AGI% naik terukur.
        </p>
        <div className="space-y-2">
          {g.curriculum.slice(0, 5).map((c, i) => (
            <div key={c.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-500/20 text-[10px] font-bold text-lime-300">{i + 1}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${leverChip(c.lever)}`}>{leverName(c.lever)}</span>
                <span className="text-xs font-bold text-zinc-100">{c.label}</span>
                <span className="ml-auto font-mono text-xs font-bold text-emerald-300">+{c.dAgiPp.toFixed(2)} poin AGI</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{c.why}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500"><b className="text-zinc-400">Aksi:</b> {c.action}</p>
            </div>
          ))}
        </div>
        {g.curriculum.length > 5 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">Backlog:</span>
            {g.curriculum.slice(5).map((c) => (
              <span key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-400">
                {c.label} <span className="font-mono text-emerald-400/80">+{c.dAgiPp.toFixed(2)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ==== kemahiran + kemampuan emergen ==== */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <BookOpen className="h-4 w-4 text-violet-400" /> Kemahiran Terverifikasi (skill library ala Voyager)
          </h4>
          <p className="mb-3 mt-1 text-[11px] text-zinc-500">
            Pola ingatan dengan n≥2 pengalaman — keterampilan yang benar-benar dibaca otak saat keputusan. Mastery naik seiring n.
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {g.skills.length === 0 && <p className="text-[11px] text-zinc-500">Belum ada pola dengan n≥2 — konsolidasi memori berjalan tiap hari.</p>}
            {g.skills.map((s) => (
              <div key={s.fp} className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-200">{s.label}</span>
                  <span className="font-mono text-[11px]">
                    <span className="text-zinc-500">n={s.n}</span>{' '}
                    <b className={s.avgRet >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{s.avgRet >= 0 ? '+' : ''}{s.avgRet.toFixed(1)}%</b>{' '}
                    <span className="text-zinc-500">hit {s.hit.toFixed(0)}%</span>
                  </span>
                </div>
                <Progress value={s.mastery * 100} className="mt-1.5 h-1 bg-zinc-800 [&>div]:bg-violet-400" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <Sparkles className="h-4 w-4 text-fuchsia-400" /> Kemampuan Emeren — kecerdasan yang muncul saat skala cukup
          </h4>
          <p className="mb-3 mt-1 text-[11px] text-zinc-500">
            Seperti kemampuan emergen di scaling laws: kemampuan baru menyala begitu akumulasi pengalaman melewati ambang — bukan dipasang manual.
          </p>
          <div className="space-y-1.5">
            {g.emergent.map((e) => (
              <div key={e.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${e.active ? 'border-fuchsia-500/40 bg-fuchsia-500/[0.06]' : 'border-zinc-800/70 bg-zinc-900/40'}`}>
                {e.active ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-fuchsia-400" /> : <CircleDot className="h-3.5 w-3.5 shrink-0 text-zinc-600" />}
                <span className={`text-[11px] ${e.active ? 'text-zinc-200' : 'text-zinc-500'}`}>{e.label}</span>
                {e.active && e.sinceDay && <span className="ml-auto font-mono text-[10px] text-fuchsia-300/80">menyala {e.sinceDay}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==== log pertumbuhan ==== */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Sprout className="h-4 w-4 text-lime-400" /> Kronik Pertumbuhan
        </h4>
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {g.log.map((l, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2">
              <EventChip kind={l.kind} />
              <span className="font-mono text-[10px] text-zinc-600">{l.day}</span>
              <span className="flex-1 text-[11px] leading-relaxed text-zinc-300">{l.text.length > 220 ? `${l.text.slice(0, 220)}…` : l.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ==== peta ke riset ==== */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <BookOpen className="h-4 w-4 text-sky-400" /> Bagaimana AI Tumbuh — 7 mekanisme dari riset, terpasang di cyborg
        </h4>
        <p className="mb-3 mt-1 text-[11px] text-zinc-500">
          Hasil studi sistem pertumbuhan AI (10 topik riset web, tersimpan di <span className="font-mono">research/growth_systems.json</span>).
        </p>
        <div className="grid gap-2.5 md:grid-cols-2">
          {g.researchMap.map((r, i) => (
            <div key={i} className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs font-bold text-zinc-100">{r.concept}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">{r.source}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400"><b className="text-amber-300/90">Di cyborg:</b> {r.ours}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ==== metodologi ==== */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <p className="text-[10px] leading-relaxed text-zinc-600">
          <b className="text-zinc-500">Metodologi jujur:</b> P = rata-rata geometri berbobot 6 dimensi dari {g.scoredDays} hari teradili (profit, akurasi, kalibrasi Brier, ingatan hidup, cakupan radar, adaptasi) — dihitung walk-forward, hanya pick teradili s/d hari-D.
          G = (1/10 domain ekonomi) × tugas terkuasai × modalitas informasi — peta kemampuan eksplisit di atas.
          A = rata-rata 5 organ otonomi. AGI% = P×G×A×100 mengikuti kerangka Levels of AGI (DeepMind): performa × generalitas × otonomi.
          Memori: {g.memorySummary.rawEvents} kejadian mentah → {g.memorySummary.storedRows} baris terkompresi (dedup FNV-1a), {g.memorySummary.verifN} pola terverifikasi.
        </p>
      </div>
    </div>
  )
}
