'use client'

// UJIAN SIMULASI — 100 pasar buta per suite.
// Filosofi (kata Guru): kecerdasan sejati bukan yang terlihat benar
// setelah kejadian, melainkan yang menembak akurat dengan informasi
// terbatas saat itu. Karena itu mesin HANYA menerima 144 jam pertama;
// 24 jam penilaian tidak pernah bocor ke keputusan.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  GraduationCap, CheckCircle2, XCircle, Eye, EyeOff, RefreshCcw, Loader2,
  TrendingUp, TrendingDown, Target, Scale, Map as MapIcon, FlaskConical, Lightbulb,
} from 'lucide-react'

// ---------------- tipe (mirror API) ----------------

type Dir = 'NAIK' | 'TURUN'

interface TestMeta {
  id: string; num: number; symbol: string; archId: string; archLabel: string
  family: string; difficulty: number; label: Dir; outcomeRet: number; mfe: number; mae: number
}
interface Pick { dir: Dir; conf: number; correct: boolean; regime: string }
interface Board {
  id: string; name: string; short: string; color: string; desc: string
  acc: number; brier: number; convTotal: number; upShare: number
  hardFails: number; streakBest: number; streakWorst: number
}
interface RegimeGrade { archId: string; label: string; family: string; n: number; acc: number; avgConf: number; brier: number; verdict: string }
interface CalBucket { label: string; lo: number; hi: number; n: number; avgConf: number; acc: number }
interface Finding { severity: 'FATAL' | 'SERIUS' | 'PERINGATAN' | 'KUAT'; title: string; detail: string; rec: string }
interface SuiteState {
  leaderboard: Board[]
  tests: TestMeta[]
  picks: Record<string, Pick[]>
  curves: Record<string, number[]>
  byRegime: Record<string, RegimeGrade[]>
  cal: Record<string, CalBucket[]>
  findings: Record<string, Finding[]>
  hardFails: { testId: string; archId: string; archLabel: string; conf: number; pred: Dir; label: Dir; outcomeRet: number }[]
  head: { w: number[]; b: number; featureNames: string[]; trainAcc: number; heldout: { acc: number; brier: number; convTotal: number }; naluri: { acc: number; brier: number }; adopted: boolean; note: string }
}
interface ExamState {
  meta: { visible: number; horizon: number; total: number; suiteSize: number; archetypes: { id: string; label: string; family: string; desc: string; kesulitan: number }[] }
  suites: Record<'A' | 'B', SuiteState>
  multi: { suites: string[]; v1: number[]; v3: number[]; dadu: number[] }
  gates: { id: string; label: string; pass: boolean; detail: string }[]
  candle: CandleExamState
  beartrap: BeartrapExamState
  stophunt: StophuntExamState
  computedAt: string
}

// ---- ujian candle likuidasi (SAKTI-MATA) ----
interface CandleRow {
  num: number; archId: string; archLabel: string; family: string; variant: string; diff: string
  truth: Dir; vonis: Dir; conf: number; correct: boolean; moveAtr: number; liquidated: boolean; fakta: string
}
interface CandleExamState {
  versi: string
  visible: number; horizon: number; total: number
  archetypes: { id: string; label: string; family: string; desc: string; jebakan: string }[]
  ringkas: {
    inSample: { siklus: string; skor: string; likuidasi: number }[]
    luar: { suite: string; skor: string; likuidasi: number }[]
    baseline: { selaluNaik: number; momenNaif: number; balikArah: number; dadu: number }
  }
  ledger: { id: string; versi: string; siklus: number; celah: string; aturan: string }[]
  rows: CandleRow[]
  perArch: { k: string; n: number; benar: number; pct: number }[]
}
interface CandleDetail {
  exam: { num: number; arch: { id: string; label: string; family: string; desc: string; jebakan: string }; diff: string; variant: string; truth: Dir; moveAtr: number; entry: number }
  visible: number[][]
  horizon: number[][]
  vonis: { arah: Dir; conf: number; score: number; versi: string; alasan: string[]; pelajaranAktif: string[] }
  fakta: string
}
interface DetailPred {
  id: string; name: string; short: string; color: string
  dir: Dir; conf: number; regime: string; reasons: string[]
  factors: { key: string; label: string; value: number; weight: number }[]
  correct: boolean
}
interface Detail {
  test: { id: string; symbol: string; arch: { id: string; label: string; family: string; desc: string; kesulitan: number }; entry: number; outcomeRet: number; mfe: number; mae: number; label: Dir }
  visible: number[][]
  horizon: number[][]
  preds: DetailPred[]
}

// ---- ujian bear trap 100 (SAKTI-BEARTRAP) — net profit after fee buy + fee sell ----
interface BeartrapRow {
  num: number; kind: 'TRAP' | 'GUARD'; archId: string; archLabel: string; diff: string
  vonis: Dir; truth: Dir; correct: boolean
  entry: number; exit: number; targetPct: number; targetHit: boolean; hitCandle: number
  feeBuy: number; feeSell: number; grossPct: number; netPct: number; berhasil: boolean
  alasan: string; fakta: string
}
interface BeartrapExamState {
  versi: string
  visible: number; horizon: number; total: number
  feeModel: { buy: string; sell: string; total: string; catatan: string }
  ringkas: {
    siklus: { versi: string; skor: string; catatan: string }[]
    hasil: { ronde: string; skor: string; net: string }[]
  }
  ledger: { id: string; versi: string; celah: string; aturan: string }[]
  rows: BeartrapRow[]
  perArch: { k: string; n: number; benar: number; pct: number; net: number }[]
}
interface BeartrapDetail {
  exam: { num: number; kind: 'TRAP' | 'GUARD'; arch: { id: string; label: string; ilmu: string; jebakan: string; tandaTangan: string }; diff: string; truth: Dir; movePct: number; entry: number; exit: number }
  visible: number[][]
  horizon: number[][]
  vonis: { arah: Dir; versi: string; conf: number; score: number; alasan: string[]; targetPct: number; targetPrice: number }
  ledger: { arah: Dir; entry: number; exit: number; target: number; targetHit: boolean; hitCandle: number; feeBuy: number; feeSell: number; grossPct: number; netPct: number; berhasil: boolean }
  fakta: string
}

// ---- ujian stop hunt / liquidity grab 100 (SAKTI-SH) — 11 field wajib ----
interface StophuntRow {
  num: number; archId: string; archLabel: string; ilmu: string; jebakan: string; diff: string
  truth: Dir; bait: Dir; postGrab: 'REVERSAL' | 'CONTINUATION'
  aksi: 'ENTRY' | 'WAIT' | 'SKIP'; mode: string; arah: Dir
  entryPrice: number | null; exitPrice: number | null
  feeBuy: number | null; feeSell: number | null
  grossPct: number | null; netPct: number | null; returnPct: number | null
  berhasil: 'BERHASIL' | 'GAGAL'; alasan: string[]
  areaLikuiditas: { jenis: string; side: string; level: number; sentuhan: number; swept: boolean; reclaimed: boolean; depthAtr: number; barsSince: number }
  identifikasiGrab: { terjadi: boolean; post: string; cara: string }
  pelajaran: string[]; fakta: string
}
interface StophuntExamState {
  versi: string
  visible: number; horizon: number; total: number
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
interface StophuntDetail {
  exam: { num: number; arch: { id: string; label: string; ilmu: string; jebakan: string; tandaTangan: string }; diff: string; truth: Dir; bait: Dir; postGrab: 'REVERSAL' | 'CONTINUATION'; pool: { jenis: string; side: string; level: number; sentuhan: number; sweepIdx: number }; movePct: number; entry: number; exit: number; mfePct: number; baitMfePct: number }
  visible: number[][]
  horizon: number[][]
  keputusan: { aksi: 'ENTRY' | 'WAIT' | 'SKIP'; arah: Dir; versi: string; score: number; alasan: string[]; targetPct: number; triggerLevel?: number; pelajaran: string[]; pool: { jenis: string; side: string; level: number; sentuhan: number; swept: boolean; reclaimed: boolean; depthAtr: number; barsSince: number }; grab: { terjadi: boolean; post: string; cara: string } }
  ledger: { aksi: string; mode: string; arah: Dir; entry: number | null; exit: number | null; target: number | null; targetHit: boolean; hitCandle: number; feeBuy: number | null; feeSell: number | null; grossPct: number | null; netPct: number | null; returnPct: number | null; berhasil: boolean | null; noTradeAman: boolean | null; noTradeLabel: string | null; feeTotalPct: number }
  fakta: string
}

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`
const sgn = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`
const metaArch = (id: string, st: ExamState | null) => st?.meta.archetypes.find((a) => a.id === id)

const SEV_TONE: Record<string, string> = {
  FATAL: 'border-rose-500/50 bg-rose-500/10 text-rose-200',
  SERIUS: 'border-orange-500/50 bg-orange-500/10 text-orange-200',
  PERINGATAN: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  KUAT: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
}

// ---------------- grafik candle SVG ----------------

function CandleChart({ vis, hor, entry, revealed, horLabel }: { vis: number[][]; hor: number[][]; entry: number; revealed: boolean; horLabel?: string }) {
  const W = 840
  const H = 250
  const pad = 6
  const all = revealed ? [...vis, ...hor] : vis
  const lo = Math.min(...all.map((c) => c[3]))
  const hi = Math.max(...all.map((c) => c[2]))
  const span = hi - lo || 1
  const y = (p: number) => pad + (1 - (p - lo) / span) * (H - 2 * pad)
  const n = vis.length + hor.length
  const step = W / n
  const bw = Math.max(1.6, step * 0.62)
  const x = (i: number) => i * step + step / 2
  const candle = (c: number[], i: number, dim: boolean) => {
    const [t, o, h, l, cl] = c
    const up = cl >= o
    const col = up ? '#34d399' : '#fb7185'
    const op = dim ? 0.45 : 0.95
    return (
      <g key={t} opacity={op}>
        <line x1={x(i)} x2={x(i)} y1={y(h)} y2={y(l)} stroke={col} strokeWidth={1} />
        <rect x={x(i) - bw / 2} y={y(Math.max(o, cl))} width={bw} height={Math.max(1, Math.abs(y(o) - y(cl)))} fill={col} rx={0.5} />
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-slate-800 bg-slate-950/60">
      <line x1={0} x2={W} y1={y(entry)} y2={y(entry)} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} opacity={0.8} />
      {vis.map((c, i) => candle(c, i, false))}
      {revealed && hor.map((c, i) => candle(c, vis.length + i, true))}
      {!revealed && (
        <g>
          <rect x={x(vis.length) - 2} y={pad} width={W - x(vis.length) + 2} height={H - 2 * pad} fill="#0f172a" opacity={0.85} />
          <text x={(x(vis.length) + W) / 2} y={H / 2} textAnchor="middle" fill="#64748b" fontSize={12} fontFamily="ui-sans-serif">
            {horLabel ?? 'HORIZON 24 JAM — tersembunyi sampai vonis dibuka'}
          </text>
        </g>
      )}
      {revealed && <line x1={x(vis.length)} x2={x(vis.length)} y1={pad} y2={H - pad} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />}
    </svg>
  )
}

function FactorBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  const w = Math.min(1, Math.abs(value)) * 50
  const pos = value >= 0
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 shrink-0 text-slate-400">{label}</span>
      <div className="relative h-3 flex-1 rounded bg-slate-800/80">
        <div className="absolute left-1/2 top-0 h-full w-px bg-slate-600" />
        <div
          className={`absolute top-0 h-full rounded ${pos ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
          style={pos ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-slate-300">
        {sgn(value, 2)} <span className="text-slate-500">×{weight.toFixed(2)}</span>
      </span>
    </div>
  )
}

// ---------------- panel utama ----------------

export function ExamConsole() {
  const [state, setState] = useState<ExamState | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [suite, setSuite] = useState<'A' | 'B'>('A')
  const [openId, setOpenId] = useState<string | null>(null)
  const [filterArch, setFilterArch] = useState<string>('ALL')
  const [filterRes, setFilterRes] = useState<'ALL' | 'BENAR' | 'SALAH'>('ALL')
  const [contestant, setContestant] = useState<string>('MICAPROFITA-V3')

  const load = useCallback(async () => {
    try {
      setErr(null)
      const res = await fetch('/api/exam', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState((await res.json()) as ExamState)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const s = state?.suites[suite]
  const v3Board = s?.leaderboard.find((b) => b.id === 'MICAPROFITA-V3')
  const v1Board = s?.leaderboard.find((b) => b.id === 'MICAPROFITA')

  const tests = useMemo(() => {
    if (!s) return []
    const pickArr = s.picks[contestant] ?? []
    return s.tests
      .map((t, i) => ({ t, p: pickArr[i] }))
      .filter(({ p }) => !!p)
      .filter(({ t }) => filterArch === 'ALL' || t.archId === filterArch)
      .filter(({ p }) => filterRes === 'ALL' || (filterRes === 'BENAR' ? p.correct : !p.correct))
  }, [s, contestant, filterArch, filterRes])

  if (err) {
    return (
      <CardShell>
        <div className="flex items-center gap-2 text-rose-300">
          <XCircle className="h-4 w-4" /> Gagal memuat ujian: {err}
          <Button size="sm" variant="outline" onClick={load} className="ml-2"><RefreshCcw className="h-3 w-3" /> Ulangi</Button>
        </div>
      </CardShell>
    )
  }
  if (!state || !s) {
    return (
      <CardShell>
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <p className="text-sm">Membangkitkan 100 pasar buatan & menjalankan ujian buta…</p>
          <p className="text-xs text-slate-500">perhitungan pertama memakan ±10-30 detik — semua deterministik dari seed</p>
        </div>
      </CardShell>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---- header filosofi ---- */}
      <CardShell>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-amber-400">
              <GraduationCap className="h-5 w-5" />
              <h2 className="text-lg font-bold tracking-wide">UJIAN SIMULASI — {state.meta.suiteSize} Pasar Buta per Suite</h2>
            </div>
            <p className="mt-2 text-sm italic leading-relaxed text-slate-300">
              &ldquo;Yang benar-benar cerdas bukan yang selalu terlihat benar setelah kejadian, melainkan yang kuat
              membuat prediksi dengan informasi yang tersedia saat itu — dan akurat dengan batasan informasi yang ada.&rdquo;
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ujian ini untuk menemukan celah cyborg. Setiap pasar dibangkitkan dari seed deterministik:
              mesin hanya melihat <b className="text-slate-300">{state.meta.visible} jam pertama</b>, vonis dinilai dari{' '}
              <b className="text-slate-300">{state.meta.horizon} jam sesudahnya</b>. Mustahil bocor — masa depan tidak pernah masuk ke keputusan.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
            <Mech label="Jam / pasar" val={String(state.meta.total)} />
            <Mech label="Arketipe" val={String(state.meta.archetypes.length)} />
            <Mech label="Terlihat" val={`${state.meta.visible}j`} />
            <Mech label="Vonis" val={`${state.meta.horizon}j`} />
          </div>
        </div>
      </CardShell>

      {/* ---- gerbang kelulusan ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {state.gates.map((g) => (
          <div key={g.id} className={`rounded-xl border p-4 ${g.pass ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              {g.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
              <span className={g.pass ? 'text-emerald-300' : 'text-rose-300'}>{g.id} — {g.label}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{g.detail}</p>
          </div>
        ))}
      </div>

      {/* ---- UJIAN CANDLE LIKUIDASI (SAKTI-MATA) ---- */}
      <CandleSection st={state} />
      <BeartrapSection st={state} />
      <StophuntSection st={state} />

      {/* ---- pilih suite ---- */}
      <div className="flex items-center gap-2">
        {(['A', 'B'] as const).map((x) => (
          <button
            key={x}
            onClick={() => setSuite(x)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-semibold transition ${
              suite === x ? 'border-amber-500/60 bg-amber-500/10 text-amber-300' : 'border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Suite {x}
          </button>
        ))}
        <span className="ml-2 text-xs text-slate-500">
          Suite {suite} — {state.meta.suiteSize} pasar, seed <code className="text-slate-400">{'MICAPROFITA/UJIAN-SIM/' + suite + '/*'}</code>
        </span>
      </div>

      {/* ---- papan hasil ---- */}
      <CardShell title="Papan Hasil — menembak sebaik mana?" icon={<Target className="h-4 w-4 text-amber-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Kontestan</th>
                <th className="px-3">Akurasi</th>
                <th className="px-3">Brier ↓</th>
                <th className="px-3">Skor yakin</th>
                <th className="px-3">Bias naik</th>
                <th className="px-3">Yakin-salah</th>
                <th className="px-3">Streak</th>
              </tr>
            </thead>
            <tbody>
              {s.leaderboard.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setContestant(b.id)}
                  className={`cursor-pointer border-b border-slate-800/60 transition hover:bg-slate-800/30 ${contestant === b.id ? 'bg-slate-800/40' : ''}`}
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                      <span className="font-semibold" style={{ color: b.color }}>{b.short}</span>
                      <span className="text-xs text-slate-500">{b.name}</span>
                      {b.id === 'MICAPROFITA-V3' && <Badge className="border-amber-500/50 bg-amber-500/10 text-amber-300">KITA</Badge>}
                      {b.id === 'DADU' && <Badge className="border-slate-700 text-slate-400">lantai</Badge>}
                    </div>
                    <p className="mt-1 max-w-md text-xs text-slate-500">{b.desc}</p>
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded bg-slate-800">
                        <div className="h-full rounded" style={{ width: `${b.acc * 100}%`, background: b.color }} />
                      </div>
                      <span className={`font-mono text-xs ${b.acc >= 0.6 ? 'text-emerald-300' : b.acc >= 0.5 ? 'text-slate-200' : 'text-rose-300'}`}>{pct(b.acc, 0)}</span>
                    </div>
                  </td>
                  <td className={`px-3 font-mono text-xs ${b.brier < 0.25 ? 'text-emerald-300' : 'text-slate-300'}`}>{b.brier.toFixed(3)}</td>
                  <td className="px-3 font-mono text-xs" title="skor akumulasi benar/salah tertimbang keyakinan">
                    <span className={b.convTotal > 0 ? 'text-emerald-300' : 'text-rose-300'}>{b.convTotal > 0 ? '+' : ''}{b.convTotal.toFixed(1)}</span>
                  </td>
                  <td className="px-3 font-mono text-xs text-slate-300">{pct(b.upShare)}</td>
                  <td className={`px-3 font-mono text-xs ${b.hardFails === 0 ? 'text-slate-400' : 'text-orange-300'}`}>{b.hardFails}</td>
                  <td className="px-3 font-mono text-xs text-slate-400">
                    <span className="text-emerald-400">{b.streakBest}</span> / <span className="text-rose-400">{b.streakWorst}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Akurasi = benar/100 · Brier = kejujuran probabilitas (koin 0,250) · Skor yakin = akumulasi benar/salah tertimbang keyakinan ·
          Yakin-salah = vonis conf ≥72% yang meleset. Klik baris untuk memakai kontestan itu di penjelajah.
        </p>
      </CardShell>

      {/* ---- peta kekuatan per rezim v1 vs v3 ---- */}
      <CardShell title="Peta Kemahiran per Arketipe — v1 vs v3" icon={<MapIcon className="h-4 w-4 text-amber-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Arketipe pasar</th>
                <th className="px-3">Keluarga</th>
                <th className="px-3">Sulit</th>
                <th className="px-3">v1 naluri</th>
                <th className="px-3">CYBORG v3</th>
                <th className="px-3">Δ</th>
                <th className="px-3">Vonis</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const m1 = new Map<string, RegimeGrade>((s.byRegime['MICAPROFITA'] ?? []).map((r) => [r.archId, r]))
                const m3 = new Map<string, RegimeGrade>((s.byRegime['MICAPROFITA-V3'] ?? []).map((r) => [r.archId, r]))
                const rows = [...m3.values()].map((r3) => ({ r3, r1: m1.get(r3.archId) })).sort((a, b) => a.r3.acc - b.r3.acc)
                return rows.map(({ r3, r1 }) => {
                  const d = r3.acc - (r1?.acc ?? 0)
                  return (
                    <tr key={r3.archId} className="border-b border-slate-800/60">
                      <td className="py-2 pr-3 font-medium text-slate-200">{r3.label}</td>
                      <td className="px-3 text-xs text-slate-400">{r3.family}</td>
                      <td className="px-3 text-xs text-amber-500/80" title={`kesulitan ${metaArch(r3.archId, state)?.kesulitan ?? '?'} dari 3`}>
                        {'★'.repeat(metaArch(r3.archId, state)?.kesulitan ?? 1)}
                      </td>
                      <td className="px-3 font-mono text-xs text-slate-400">{r1 ? pct(r1.acc) : '—'}</td>
                      <td className="px-3">
                        <span
                          className="inline-block rounded px-2 py-0.5 font-mono text-xs font-bold"
                          style={{
                            background: r3.acc >= 0.7 ? 'rgba(52,211,153,0.15)' : r3.acc >= 0.55 ? 'rgba(245,158,11,0.12)' : 'rgba(251,113,133,0.15)',
                            color: r3.acc >= 0.7 ? '#6ee7b7' : r3.acc >= 0.55 ? '#fbbf24' : '#fda4af',
                          }}
                        >
                          {pct(r3.acc)}
                        </span>
                      </td>
                      <td className={`px-3 font-mono text-xs ${d > 0.02 ? 'text-emerald-300' : d < -0.02 ? 'text-rose-300' : 'text-slate-500'}`}>{sgn(d)}</td>
                      <td className="px-3">
                        <Badge className={r3.verdict === 'KUAT' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : r3.verdict === 'LEMAH' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-slate-700 text-slate-300'}>
                          {r3.verdict}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Diurutkan dari yang terlemah — celah selalu di depan. n = {Math.round(state.meta.suiteSize / state.meta.archetypes.length)}–8 ujian per arketipe per suite.</p>
      </CardShell>

      {/* ---- kalibrasi + celah ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CardShell title="Kalibrasi Keyakinan (v3)" icon={<Scale className="h-4 w-4 text-amber-400" />}>
          <div className="space-y-2">
            {(s.cal['MICAPROFITA-V3'] ?? []).map((b) => {
              const gap = b.n ? b.avgConf - b.acc : 0
              return (
                <div key={b.label} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 font-mono text-slate-400">{b.label}</span>
                  <span className="w-10 shrink-0 text-slate-500">n={b.n}</span>
                  <div className="relative h-3 flex-1 rounded bg-slate-800/80">
                    <div className="absolute left-0 h-full rounded bg-sky-500/70" style={{ width: `${b.avgConf * 100}%` }} />
                    <div className="absolute left-0 h-full rounded border-r-2 border-emerald-400 bg-emerald-500/25" style={{ width: `${b.acc * 100}%` }} />
                  </div>
                  <span className="w-40 shrink-0 text-right font-mono text-slate-400">
                    klaim {pct(b.avgConf)} · real {b.n ? pct(b.acc) : '—'}
                    {b.n >= 5 && <span className={gap > 0.12 ? ' text-rose-300' : gap < -0.1 ? ' text-amber-300' : ' text-emerald-300'}> ({sgn(-gap)})</span>}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Biru = klaim keyakinan, hijau = realita. Selisih besar = sombong (mahal) atau terlalu rendah hati (ketinggalan profit).</p>
        </CardShell>

        <CardShell title="Celah yang Ditemukan & Resepnya" icon={<Lightbulb className="h-4 w-4 text-amber-400" />}>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(s.findings['MICAPROFITA-V3'] ?? []).map((f, i) => (
              <div key={i} className={`rounded-lg border p-3 ${SEV_TONE[f.severity]}`}>
                <p className="text-xs font-bold uppercase tracking-wide">{f.severity} — {f.title}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{f.detail}</p>
                <p className="mt-1 text-xs italic leading-relaxed opacity-75">Resep: {f.rec}</p>
              </div>
            ))}
          </div>
        </CardShell>
      </div>

      {/* ---- eksperimen kepala belajar ---- */}
      <CardShell title="Eksperimen: Kepala Belajar (regresi logistik)" icon={<FlaskConical className="h-4 w-4 text-amber-400" />}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {s.head.adopted ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-orange-400" />}
            <span className={s.head.adopted ? 'text-emerald-300' : 'text-orange-300'}>{s.head.adopted ? 'DIADOPSI' : 'TIDAK DIADOPSI'}</span>
          </div>
          <div className="flex gap-4 font-mono text-xs text-slate-300">
            <span>train 1–50: {(s.head.trainAcc * 100).toFixed(0)}%</span>
            <span>buta 51–100 terlatih: <b className="text-sky-300">{pct(s.head.heldout.acc)}</b></span>
            <span>buta 51–100 naluri: <b className="text-amber-300">{pct(s.head.naluri.acc)}</b></span>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.head.note}</p>
        <div className="mt-3 space-y-1">
          {s.head.w.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 shrink-0 text-slate-400">fitur#{i + 1}</span>
              <div className="relative h-2.5 flex-1 rounded bg-slate-800/80">
                <div className="absolute left-1/2 top-0 h-full w-px bg-slate-600" />
                <div
                  className={`absolute top-0 h-full rounded ${w >= 0 ? 'bg-sky-500/80' : 'bg-rose-500/80'}`}
                  style={w >= 0 ? { left: '50%', width: `${Math.min(50, Math.abs(w) * 28)}%` } : { right: '50%', width: `${Math.min(50, Math.abs(w) * 28)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-slate-300">{w.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </CardShell>

      {/* ---- bukti luas 5 suite ---- */}
      <CardShell title="Bukti Luas — 5 Suite × 100 Pasar (500 ujian)" icon={<Eye className="h-4 w-4 text-amber-400" />}>
        <div className="space-y-2">
          {state.multi.suites.map((nm, i) => (
            <div key={nm} className="flex items-center gap-3 text-xs">
              <span className="w-14 shrink-0 font-semibold text-slate-300">Suite {nm}</span>
              <Bar v={state.multi.v1[i]} color="#94a3b8" label={`v1 ${pct(state.multi.v1[i])}`} />
              <Bar v={state.multi.v3[i]} color="#fbbf24" label={`v3 ${pct(state.multi.v3[i])}`} />
              <Bar v={state.multi.dadu[i]} color="#fb7185" label={`dadu ${pct(state.multi.dadu[i])}`} />
              <span className={`w-24 shrink-0 text-right font-mono ${state.multi.v3[i] > state.multi.v1[i] ? 'text-emerald-300' : 'text-rose-300'}`}>
                {state.multi.v3[i] > state.multi.v1[i] ? 'v3 menang' : 'v3 kalah'}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Rata-rata v3 {pct(state.multi.v3.reduce((a, b) => a + b, 0) / 5, 1)} vs v1 {pct(state.multi.v1.reduce((a, b) => a + b, 0) / 5, 1)} — kemenangan{' '}
          {state.multi.v3.filter((x, i) => x > state.multi.v1[i]).length}/5 suite pada 500 pasar yang berbeda.
        </p>
      </CardShell>

      {/* ---- penjelajah 100 ujian ---- */}
      <CardShell title={`Penjelajah Ujian — ${s.tests.length} pasar`} icon={<EyeOff className="h-4 w-4 text-amber-400" />}>
        <div className="flex flex-wrap items-center gap-2 pb-3 text-xs">
          <select value={filterArch} onChange={(e) => setFilterArch(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200">
            <option value="ALL">Semua arketipe</option>
            {state.meta.archetypes.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <select value={filterRes} onChange={(e) => setFilterRes(e.target.value as 'ALL' | 'BENAR' | 'SALAH')} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200">
            <option value="ALL">Semua hasil</option>
            <option value="BENAR">Hanya benar</option>
            <option value="SALAH">Hanya salah</option>
          </select>
          <span className="text-slate-500">kontestan: <b style={{ color: v3Board?.color }}>{s.leaderboard.find((b) => b.id === contestant)?.short ?? contestant}</b></span>
        </div>
        <div className="grid max-h-96 grid-cols-10 gap-1.5 overflow-y-auto pb-1 sm:grid-cols-12 md:grid-cols-20">
          {tests.map(({ t, p }) => (
            <button
              key={t.id}
              onClick={() => setOpenId(t.id)}
              title={`${t.id} · ${t.archLabel} · vonis ${p!.dir} ${pct(p!.conf)} · jawaban ${t.label}`}
              className={`rounded border px-1 py-1.5 text-[10px] font-mono transition hover:scale-105 ${
                p!.correct ? 'border-emerald-600/50 bg-emerald-500/10 text-emerald-300' : 'border-rose-600/50 bg-rose-500/10 text-rose-300'
              }`}
            >
              {String(t.num).padStart(2, '0')}
            </button>
          ))}
        </div>
        <p className="pt-3 text-xs text-slate-500">Hijau = tepat, merah = meleset (untuk kontestan terpilih). Klik nomor untuk membuka ruang ujian: lihat candle, vonis, bukti, lalu buka amplop jawaban.</p>
      </CardShell>

      <TestDialog suite={suite} openId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function Bar({ v, color, label }: { v: number; color: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded bg-slate-800">
        <div className="h-full rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      <span className="w-24 shrink-0 font-mono" style={{ color }}>{label}</span>
    </div>
  )
}

function Mech({ label, val }: { label: string; val: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <p className="font-mono text-sm font-bold text-amber-300">{val}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function CardShell({ title, icon, children }: { title?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      {title && (
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-200">
          {icon}
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ---------------- dialog satu ujian ----------------

function TestDialog({ suite, openId, onClose }: { suite: 'A' | 'B'; openId: string | null; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [sel, setSel] = useState(0)

  useEffect(() => {
    if (!openId) return
    let alive = true
    fetch(`/api/exam?suite=${suite}&id=${openId}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((j) => { if (alive) { setD(j as Detail); setRevealed(false); setSel(0); setErr(null) } })
      .catch((e) => { if (alive) { setErr((e as Error).message); setD(null) } })
    return () => { alive = false }
  }, [suite, openId])

  const p = d?.preds[sel]

  return (
    <Dialog open={!!openId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-slate-800 bg-slate-950 text-slate-200" aria-describedby={undefined}>
        {!d && !err && (
          <div className="py-12">
            <DialogHeader>
              <DialogTitle className="text-base text-slate-200">Ruang ujian</DialogTitle>
              <DialogDescription>Menyiapkan candle 168 jam &amp; vonis para kontestan…</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> membuka ruang ujian…</div>
          </div>
        )}
        {err && (
          <div className="py-8">
            <DialogHeader>
              <DialogTitle className="text-base text-rose-300">Gagal membuka ujian</DialogTitle>
              <DialogDescription>{err}</DialogDescription>
            </DialogHeader>
          </div>
        )}
        {d && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-amber-400">{d.test.id}</span>
                <span className="font-mono text-slate-300">{d.test.symbol}</span>
                <Badge className="border-slate-700 text-slate-300">{d.test.arch.label}</Badge>
                <Badge className="border-slate-800 text-slate-400">{d.test.arch.family}</Badge>
                <span className="text-xs text-slate-500">{'★'.repeat(d.test.arch.kesulitan)}</span>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-xs leading-relaxed text-slate-400">{d.test.arch.desc}</p>
              </DialogDescription>
            </DialogHeader>

            <CandleChart vis={d.visible} hor={d.horizon} entry={d.test.entry} revealed={revealed} />

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setRevealed(true)} disabled={revealed} className="bg-amber-500/90 text-slate-950 hover:bg-amber-400">
                {revealed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {revealed ? 'Jawaban terbuka' : 'Buka amplop jawaban'}
              </Button>
              {revealed && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-300">Jawaban: <b className={d.test.label === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}>{d.test.label}</b></span>
                  <span className="font-mono text-slate-400">ret 24j {sgn(d.test.outcomeRet)} · MFE {sgn(d.test.mfe)} · MAE {sgn(d.test.mae)}</span>
                </div>
              )}
              {!revealed && (
                <span className="text-xs text-slate-500">Lihat dulu vonis para kontestan di bawah — baru buka amplopnya.</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {d.preds.map((x, i) => (
                <button
                  key={x.id}
                  onClick={() => setSel(i)}
                  className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${i === sel ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-800 hover:border-slate-600'}`}
                  style={{ color: x.color }}
                >
                  {x.short} {revealed && (x.correct ? '✓' : '✗')}
                </button>
              ))}
            </div>

            {p && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <span className={`text-2xl font-black ${p.dir === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}`}>{p.dir === 'NAIK' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: p.color }}>{p.name} vonis: <span className={p.dir === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}>{p.dir}</span></p>
                    <p className="text-xs text-slate-400">keyakinan {pct(p.conf)} · rezim terbaca: {p.regime}</p>
                  </div>
                  {revealed && (
                    <Badge className={p.correct ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}>
                      {p.correct ? 'TEPAT' : 'MELESET'}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {p.factors.map((f) => <FactorBar key={f.key} label={f.label} value={f.value} weight={f.weight} />)}
                </div>
                <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                  {p.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------- ujian candle likuidasi (SAKTI-MATA) ----------------

function CandleDialog({ openNum, onClose }: { openNum: number | null; onClose: () => void }) {
  const [d, setD] = useState<CandleDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!openNum) return
    let alive = true
    fetch(`/api/exam?candle=${openNum}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((j) => { if (alive) { setD(j as CandleDetail); setRevealed(false); setErr(null) } })
      .catch((e) => { if (alive) { setErr((e as Error).message); setD(null) } })
    return () => { alive = false }
  }, [openNum])

  const ok = d ? d.vonis.arah === d.exam.truth : false

  return (
    <Dialog open={!!openNum} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-slate-800 bg-slate-950 text-slate-200" aria-describedby={undefined}>
        {!d && !err && (
          <div className="py-12">
            <DialogHeader>
              <DialogTitle className="text-base text-slate-200">Ruang ujian candle</DialogTitle>
              <DialogDescription>Menyiapkan 72 candle &amp; vonis SAKTI-MATA…</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> membuka grafik…</div>
          </div>
        )}
        {err && (
          <div className="py-8">
            <DialogHeader>
              <DialogTitle className="text-base text-rose-300">Gagal membuka ujian</DialogTitle>
              <DialogDescription>{err}</DialogDescription>
            </DialogHeader>
          </div>
        )}
        {d && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-amber-400">#{d.exam.num}</span>
                <Badge className="border-slate-700 text-slate-300">{d.exam.arch.label}</Badge>
                <Badge className="border-slate-800 text-slate-400">{d.exam.arch.family}</Badge>
                <Badge className={d.exam.diff === 'GILA' ? 'border-rose-500/40 text-rose-300' : d.exam.diff === 'BRUTAL' ? 'border-orange-500/40 text-orange-300' : 'border-slate-700 text-slate-400'}>{d.exam.diff}</Badge>
                <Badge className="border-violet-500/40 text-violet-300">varian {d.exam.variant}</Badge>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-xs leading-relaxed text-slate-400">
                  {d.exam.arch.desc} — <span className="text-rose-300/80">Jebakan: {d.exam.arch.jebakan}</span>
                </p>
              </DialogDescription>
            </DialogHeader>

            <CandleChart vis={d.visible} hor={d.horizon} entry={d.exam.entry} revealed={revealed} horLabel="HORIZON 12 CANDLE — tersembunyi sampai vonis dibuka" />

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setRevealed(true)} disabled={revealed} className="bg-amber-500/90 text-slate-950 hover:bg-amber-400">
                {revealed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {revealed ? 'Jawaban terbuka' : 'Buka amplop jawaban'}
              </Button>
              {revealed && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-300">Jawaban: <b className={d.exam.truth === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}>{d.exam.truth}</b></span>
                  <span className="font-mono text-slate-400">gerak {d.exam.moveAtr >= 0 ? '+' : ''}{d.exam.moveAtr.toFixed(1)} ATR dalam 12 candle</span>
                </div>
              )}
              {!revealed && <span className="text-xs text-slate-500">Baca dulu fakta saat itu & vonis mesin — baru buka amplopnya.</span>}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <span className={`text-2xl font-black ${d.vonis.arah === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {d.vonis.arah === 'NAIK' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-300">SAKTI-MATA v{d.vonis.versi} vonis: <span className={d.vonis.arah === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}>{d.vonis.arah}</span></p>
                  <p className="text-xs text-slate-400">keyakinan {pct(d.vonis.conf)} · skor lapisan {d.vonis.score.toFixed(2)}</p>
                </div>
                {revealed && (
                  <Badge className={ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}>
                    {ok ? 'TEPAT' : 'MELESET'}
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                <p className="mb-1 font-semibold text-slate-400">Fakta yang TERLIHAT saat keputusan (anti-hindsight):</p>
                {d.fakta}
              </div>

              <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                {d.vonis.alasan.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CandleSection({ st }: { st: ExamState }) {
  const [openNum, setOpenNum] = useState<number | null>(null)
  const c = st.candle
  const total = c.rows.length
  const benar = c.rows.filter((r) => r.correct).length
  const likuidasi = c.rows.filter((r) => r.liquidated).length

  return (
    <CardShell title={undefined} icon={undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-violet-300">
            <Eye className="h-5 w-5" />
            <h2 className="text-lg font-bold tracking-wide">UJIAN CANDLE LIKUIDASI — 100 Grafik Pembunuh Trader Profesional</h2>
          </div>
          <p className="mt-2 text-sm italic leading-relaxed text-slate-300">
            &ldquo;Grafik-grafik ini dirancang persis seperti pasar crypto nyata yang mencairkan profesional:
            sapuan stop, jebakan breakout, klimaks parabolik, kaskade likuidasi. Beberapa punya VARIAN hasil —
            trap atau asli, pantulan-V atau kucing mati — otak tidak bisa menghafal; ia harus MEMBACA CANDLE.&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            60 candle terlihat · 12 candle vonis · kebenaran dihitung dari data, bukan niat generator · SAKTI-MATA v{c.versi}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
          <Mech label="Vonis benar" val={`${benar}/${total}`} />
          <Mech label="Likuidasi" val={String(likuidasi)} />
          <Mech label="Pelajaran" val={`L1-L${c.ledger.length}`} />
        </div>
      </div>

      {/* jejak perkembangan */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Siklus ujian → bedah → upgrade (in-sample)</p>
          <div className="space-y-1.5">
            {c.ringkas.inSample.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-52 shrink-0 text-slate-400">{s.siklus}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <div className="h-full rounded bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: s.skor }} />
                </div>
                <span className="w-12 text-right font-mono text-xs text-amber-300">{s.skor}</span>
                <span className="w-24 text-right text-xs text-rose-300/80">{s.likuidasi} likuidasi</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ujian out-of-sample (grafik segar yang belum pernah dilihat saat tuning)</p>
          <div className="space-y-1.5">
            {c.ringkas.luar.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-52 shrink-0 text-slate-400">{s.suite}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <div className="h-full rounded bg-gradient-to-r from-violet-600 to-violet-400" style={{ width: s.skor }} />
                </div>
                <span className="w-12 text-right font-mono text-xs text-violet-300">{s.skor}</span>
                <span className="w-24 text-right text-xs text-rose-300/80">{s.likuidasi} likuidasi</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Baseline naif: SELALU-NAIK {c.ringkas.baseline.selaluNaik}% · MOMEN {c.ringkas.baseline.momenNaif}% · BALIK-ARAH {c.ringkas.baseline.balikArah}% · DADU {c.ringkas.baseline.dadu}%
          </p>
        </div>
      </div>

      {/* ledger pelajaran */}
      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300"><Lightbulb className="h-3.5 w-3.5" /> Ledger pelajaran — setiap celah jadi aturan permanen (di-upgrade juga ke file Micaprofita_V231_SAKTI.html sebagai organ V232)</p>
        <div className="grid gap-2 lg:grid-cols-2">
          {c.ledger.map((l) => (
            <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
              <p className="font-semibold text-amber-300">{l.id} <span className="font-normal text-slate-500">· v{l.versi} · siklus {l.siklus}</span></p>
              <p className="mt-1 text-rose-300/80">Celah: {l.celah}</p>
              <p className="mt-0.5 text-emerald-300/80">Aturan: {l.aturan}</p>
            </div>
          ))}
        </div>
      </div>

      {/* peta per arketipe */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Peta kemahiran per arketipe [varian] — terlemah dulu</p>
        <div className="grid gap-1.5 md:grid-cols-2">
          {c.perArch.map((a) => (
            <div key={a.k} className="flex items-center gap-2 text-xs">
              <span className="w-56 shrink-0 truncate text-slate-400">{a.k}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                <div className={`h-full rounded ${a.pct >= 90 ? 'bg-emerald-500' : a.pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${a.pct}%` }} />
              </div>
              <span className="w-16 text-right font-mono text-slate-300">{a.benar}/{a.n} · {a.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* penjelajah 100 grafik */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Penjelajah 100 grafik — klik untuk membuka ruang ujian (jawaban tetap tersembunyi sampai amplop dibuka)</p>
        <div className="grid grid-cols-10 gap-1 sm:grid-cols-20">
          {c.rows.map((r) => (
            <button
              key={r.num}
              onClick={() => setOpenNum(r.num)}
              title={`#${r.num} ${r.archLabel} [${r.variant}] ${r.diff}`}
              className={`rounded border px-0 py-1 text-[10px] font-mono transition ${
                r.correct ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : r.liquidated ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25' : 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              {r.num}
            </button>
          ))}
        </div>
      </div>

      <CandleDialog openNum={openNum} onClose={() => setOpenNum(null)} />
    </CardShell>
  )
}

// ---------------- ujian bear trap 100 (SAKTI-BEARTRAP) ----------------

function BeartrapDialog({ openNum, onClose }: { openNum: number | null; onClose: () => void }) {
  const [d, setD] = useState<BeartrapDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!openNum) return
    let alive = true
    fetch(`/api/exam?beartrap=${openNum}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((j) => { if (alive) { setD(j as BeartrapDetail); setRevealed(false); setErr(null) } })
      .catch((e) => { if (alive) { setErr((e as Error).message); setD(null) } })
    return () => { alive = false }
  }, [openNum])

  const ok = d ? d.vonis.arah === d.exam.truth : false

  return (
    <Dialog open={!!openNum} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-slate-800 bg-slate-950 text-slate-200" aria-describedby={undefined}>
        {!d && !err && (
          <div className="py-12">
            <DialogHeader>
              <DialogTitle className="text-base text-slate-200">Ruang ujian bear trap</DialogTitle>
              <DialogDescription>Menyiapkan 74 candle &amp; rencana trade SAKTI-BEARTRAP…</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> membuka grafik…</div>
          </div>
        )}
        {err && (
          <div className="py-8">
            <DialogHeader>
              <DialogTitle className="text-base text-rose-300">Gagal membuka ujian</DialogTitle>
              <DialogDescription>{err}</DialogDescription>
            </DialogHeader>
          </div>
        )}
        {d && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-amber-400">#{d.exam.num}</span>
                <Badge className="border-slate-700 text-slate-300">{d.exam.arch.label}</Badge>
                <Badge className={d.exam.kind === 'GUARD' ? 'border-sky-500/40 text-sky-300' : 'border-rose-500/40 text-rose-300'}>{d.exam.kind === 'GUARD' ? 'GUARD ANTI-BIAS' : 'BEAR TRAP'}</Badge>
                <Badge className={d.exam.diff === 'GILA' ? 'border-rose-500/40 text-rose-300' : d.exam.diff === 'BRUTAL' ? 'border-orange-500/40 text-orange-300' : 'border-slate-700 text-slate-400'}>{d.exam.diff}</Badge>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-xs leading-relaxed text-slate-400">
                  {d.exam.arch.ilmu} — <span className="text-rose-300/80">Jebakan: {d.exam.arch.jebakan}</span>
                </p>
              </DialogDescription>
            </DialogHeader>

            <CandleChart vis={d.visible} hor={d.horizon} entry={d.exam.entry} revealed={revealed} horLabel="HORIZON 14 CANDLE — tersembunyi sampai amplop dibuka" />

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setRevealed(true)} disabled={revealed} className="bg-amber-500/90 text-slate-950 hover:bg-amber-400">
                {revealed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {revealed ? 'Jawaban terbuka' : 'Buka amplop jawaban'}
              </Button>
              {revealed && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-300">Jawaban: <b className={d.exam.truth === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}>{d.exam.truth}</b></span>
                  <span className="font-mono text-slate-400">gerak {d.exam.movePct >= 0 ? '+' : ''}{d.exam.movePct.toFixed(1)}% dalam 14 candle</span>
                </div>
              )}
              {!revealed && <span className="text-xs text-slate-500">Baca dulu fakta saat itu & rencana trade mesin — baru buka amplopnya.</span>}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <span className={`text-2xl font-black ${d.vonis.arah === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {d.vonis.arah === 'NAIK' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-300">SAKTI-BEARTRAP v{d.vonis.versi} rencana: <span className={d.vonis.arah === 'NAIK' ? 'text-emerald-300' : 'text-rose-300'}>{d.vonis.arah}</span> · target {d.vonis.targetPct.toFixed(1)}% (harga {d.vonis.targetPrice.toFixed(2)})</p>
                  <p className="text-xs text-slate-400">keyakinan {pct(d.vonis.conf)} · skor lapisan {d.vonis.score.toFixed(2)}</p>
                </div>
                {revealed && (
                  <Badge className={ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}>
                    {ok ? 'TEPAT' : 'MELESET'}
                  </Badge>
                )}
              </div>

              {revealed && (
                <div className="grid gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs sm:grid-cols-2">
                  <p className="sm:col-span-2 mb-1 font-semibold text-slate-400">Ledger trade — fee buy + fee sell dihitung wajib (hasil akhir = NET):</p>
                  <span className="text-slate-400">Entry price</span><span className="text-right font-mono text-slate-200">{d.ledger.entry.toFixed(3)}</span>
                  <span className="text-slate-400">Exit price</span><span className="text-right font-mono text-slate-200">{d.ledger.exit.toFixed(3)}{d.ledger.targetHit ? ` (target tersentuh @c${d.ledger.hitCandle})` : ' (akhir horizon)'}</span>
                  <span className="text-slate-400">Fee buy (0.1%)</span><span className="text-right font-mono text-slate-200">{d.ledger.feeBuy.toFixed(4)}</span>
                  <span className="text-slate-400">Fee sell (0.1%)</span><span className="text-right font-mono text-slate-200">{d.ledger.feeSell.toFixed(4)}</span>
                  <span className="text-slate-400">Gross P/L</span><span className={`text-right font-mono ${d.ledger.grossPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{d.ledger.grossPct >= 0 ? '+' : ''}{d.ledger.grossPct.toFixed(2)}%</span>
                  <span className="font-semibold text-slate-300">Net P/L (hasil akhir)</span><span className={`text-right font-mono font-bold ${d.ledger.netPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{d.ledger.netPct >= 0 ? '+' : ''}{d.ledger.netPct.toFixed(2)}%</span>
                  <span className="text-slate-400">Hasil</span>
                  <span className={`text-right font-bold ${d.ledger.berhasil ? 'text-emerald-300' : 'text-rose-300'}`}>{d.ledger.berhasil ? 'BERHASIL (net profit)' : 'GAGAL (rugi after fee)'}</span>
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                <p className="mb-1 font-semibold text-slate-400">Fakta yang TERLIHAT saat keputusan (anti-hindsight):</p>
                {d.fakta}
              </div>

              <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                {d.vonis.alasan.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BeartrapSection({ st }: { st: ExamState }) {
  const [openNum, setOpenNum] = useState<number | null>(null)
  const b = st.beartrap
  const traps = b.rows.filter((r) => r.kind === 'TRAP')
  const guards = b.rows.filter((r) => r.kind === 'GUARD')
  const benar = traps.filter((r) => r.correct).length
  const profit = traps.filter((r) => r.berhasil).length
  const netTotal = traps.reduce((s, r) => s + r.netPct, 0)
  const guardBenar = guards.filter((r) => r.correct).length

  return (
    <CardShell title={undefined} icon={undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-rose-300">
            <TrendingDown className="h-5 w-5" />
            <h2 className="text-lg font-bold tracking-wide">UJIAN BEAR TRAP — 100 Skenario Penjebak Trader Profesional</h2>
          </div>
          <p className="mt-2 text-sm italic leading-relaxed text-slate-300">
            &ldquo;Seluruh 100 skenario adalah bear trap: fake breakdown, sapuan stop di bawah low,
            kapitulasi panik, bear flag palsu — bujukan turun sekuat mungkin lalu melantai balik ke atas.
            Otak harus MENENTUKAN ENTRY, MEMASANG TARGET KEUNTUNGAN, dan menanggung hasil akhirnya.
            Setiap posisi membayar fee buy 0.1% + fee sell 0.1% — profit kotor tidak pernah dipakai.&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            60 candle terlihat · 14 horizon · truth dari data · fee {b.feeModel.buy} + {b.feeModel.sell} = {b.feeModel.total} per posisi · SAKTI-BEARTRAP v{b.versi}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
          <Mech label="Vonis benar" val={`${benar}/${traps.length}`} />
          <Mech label="Net profit" val={`${profit}/${traps.length}`} />
          <Mech label="Guard benar" val={`${guardBenar}/${guards.length}`} />
        </div>
      </div>

      {/* jejak perkembangan */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Siklus latih → uji → bedah → perbaiki</p>
          <div className="space-y-1.5">
            {b.ringkas.siklus.map((s, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-56 shrink-0 text-slate-400">{s.versi}</span>
                  <span className="ml-auto font-mono text-xs text-amber-300">{s.skor}</span>
                </div>
                <p className="text-xs text-slate-500">{s.catatan}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hasil akhir per ronde (net profit SETELAH fee buy + fee sell)</p>
          <div className="space-y-1.5">
            {b.ringkas.hasil.map((s, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-56 shrink-0 text-slate-400">{s.ronde}</span>
                  <span className="ml-auto font-mono text-xs text-emerald-300">{s.skor}</span>
                </div>
                <p className="text-xs text-slate-500">{s.net}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Kumulatif ujian: <b className="text-slate-300">{benar}/{traps.length}</b> trap benar · total net trap <b className="text-emerald-300">{sgn(netTotal)}</b> · {b.feeModel.catatan}</p>
        </div>
      </div>

      {/* ledger pelajaran */}
      <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-300"><Lightbulb className="h-3.5 w-3.5" /> Ledger pelajaran bear trap — setiap celah jadi aturan permanen (di-upgrade juga ke file Micaprofita_V231_SAKTI.html sebagai organ V234)</p>
        <div className="grid gap-2 lg:grid-cols-2">
          {b.ledger.map((l) => (
            <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
              <p className="font-semibold text-rose-300">{l.id} <span className="font-normal text-slate-500">· v{l.versi}</span></p>
              <p className="mt-1 text-rose-300/80">Celah: {l.celah}</p>
              <p className="mt-0.5 text-emerald-300/80">Aturan: {l.aturan}</p>
            </div>
          ))}
        </div>
      </div>

      {/* peta per arketipe */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Peta kemahiran per arketipe bear trap — terlemah dulu</p>
        <div className="grid gap-1.5 md:grid-cols-2">
          {b.perArch.map((a) => (
            <div key={a.k} className="flex items-center gap-2 text-xs">
              <span className="w-56 shrink-0 truncate text-slate-400">{a.k}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                <div className={`h-full rounded ${a.pct >= 90 ? 'bg-emerald-500' : a.pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${a.pct}%` }} />
              </div>
              <span className="w-24 text-right font-mono text-slate-300">{a.benar}/{a.n} · net {sgn(a.net)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* penjelajah 100 skenario (+24 guard) */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Penjelajah 100 skenario bear trap + 24 guard (G101-G124) — klik untuk ruang ujian: grafik, rencana trade, ledger fee, alasan</p>
        <div className="grid grid-cols-10 gap-1 sm:grid-cols-20">
          {b.rows.map((r) => (
            <button
              key={r.num}
              onClick={() => setOpenNum(r.num)}
              title={`#${r.num} ${r.archLabel} [${r.diff}] vonis ${r.vonis} · net ${r.netPct.toFixed(2)}%`}
              className={`rounded border px-0 py-1 text-[10px] font-mono transition ${
                r.kind === 'GUARD'
                  ? r.correct ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : r.berhasil ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
              }`}
            >
              {r.kind === 'GUARD' ? `G${r.num - 100}` : r.num}
            </button>
          ))}
        </div>
      </div>

      <BeartrapDialog openNum={openNum} onClose={() => setOpenNum(null)} />
    </CardShell>
  )
}

// ---------------- ujian stop hunt / liquidity grab 100 (SAKTI-SH) ----------------

function StophuntDialog({ openNum, onClose }: { openNum: number | null; onClose: () => void }) {
  const [d, setD] = useState<StophuntDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!openNum) return
    let alive = true
    fetch(`/api/exam?stophunt=${openNum}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((j) => { if (alive) { setD(j as StophuntDetail); setRevealed(false); setErr(null) } })
      .catch((e) => { if (alive) { setErr((e as Error).message); setD(null) } })
    return () => { alive = false }
  }, [openNum])

  const ok = d ? (d.ledger.mode === 'NO-TRADE' ? (d.ledger.noTradeAman ?? false) : (d.ledger.netPct ?? -1) > 0) : false
  const aksiTone = d?.keputusan.aksi === 'ENTRY' ? 'border-emerald-500/40 text-emerald-300' : d?.keputusan.aksi === 'WAIT' ? 'border-amber-500/40 text-amber-300' : 'border-slate-600 text-slate-300'

  return (
    <Dialog open={!!openNum} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-slate-800 bg-slate-950 text-slate-200" aria-describedby={undefined}>
        {!d && !err && (
          <div className="py-12">
            <DialogHeader>
              <DialogTitle className="text-base text-slate-200">Ruang ujian stop hunt</DialogTitle>
              <DialogDescription>Menyiapkan 74 candle &amp; keputusan 3-pilih SAKTI-SH…</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> membuka grafik…</div>
          </div>
        )}
        {err && (
          <div className="py-8">
            <DialogHeader>
              <DialogTitle className="text-base text-rose-300">Gagal membuka ujian</DialogTitle>
              <DialogDescription>{err}</DialogDescription>
            </DialogHeader>
          </div>
        )}
        {d && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-amber-400">#{d.exam.num}</span>
                <Badge className="border-slate-700 text-slate-300">{d.exam.arch.label}</Badge>
                <Badge className="border-violet-500/40 text-violet-300">{d.exam.postGrab === 'REVERSAL' ? 'SWEEP → BALIK' : 'SWEEP → LANJUT'}</Badge>
                <Badge className={d.exam.diff === 'GILA' ? 'border-rose-500/40 text-rose-300' : d.exam.diff === 'BRUTAL' ? 'border-orange-500/40 text-orange-300' : 'border-slate-700 text-slate-400'}>{d.exam.diff}</Badge>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-xs leading-relaxed text-slate-400">
                  {d.exam.arch.ilmu} — <span className="text-rose-300/80">Jebakan: {d.exam.arch.jebakan}</span>
                </p>
              </DialogDescription>
            </DialogHeader>

            <CandleChart vis={d.visible} hor={d.horizon} entry={d.exam.entry} revealed={revealed} horLabel="HORIZON 14 CANDLE — tersembunyi sampai amplop dibuka" />

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setRevealed(true)} disabled={revealed} className="bg-amber-500/90 text-slate-950 hover:bg-amber-400">
                {revealed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {revealed ? 'Jawaban terbuka' : 'Buka amplop jawaban'}
              </Button>
              {revealed && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-300">Pasca-grab: <b className={d.exam.postGrab === 'REVERSAL' ? 'text-emerald-300' : 'text-amber-300'}>{d.exam.postGrab}</b> ({d.exam.truth} {d.exam.movePct >= 0 ? '+' : ''}{d.exam.movePct.toFixed(1)}%)</span>
                  <span className="font-mono text-slate-500">jebakan {d.exam.bait} MFE hanya {d.exam.baitMfePct.toFixed(2)}%</span>
                </div>
              )}
              {!revealed && <span className="text-xs text-slate-500">Baca dulu fakta likuiditas & keputusan mesin — baru buka amplopnya.</span>}
            </div>

            <div className="space-y-3">
              {/* keputusan 3-pilih */}
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <Badge className={aksiTone}>KEPUTUSAN: {d.keputusan.aksi}{d.keputusan.aksi !== 'SKIP' ? ` ${d.keputusan.arah}` : ''}</Badge>
                <p className="text-sm text-slate-300">
                  {d.keputusan.aksi === 'ENTRY' && <>entry di close60, target disiplin <b className="text-amber-300">{d.keputusan.targetPct.toFixed(1)}%</b></>}
                  {d.keputusan.aksi === 'WAIT' && <>menunggu tutup reclaim {d.keputusan.arah === 'NAIK' ? 'di atas' : 'di bawah'} <b className="text-amber-300">{d.keputusan.triggerLevel?.toFixed(2) ?? '—'}</b> (maks 8 candle)</>}
                  {d.keputusan.aksi === 'SKIP' && <>tanpa sapuan likuiditas baru — tidak mengambil posisi</>}
                </p>
                <span className="ml-auto font-mono text-[10px] text-slate-500">SAKTI-SH v{d.keputusan.versi} · skor {d.keputusan.score.toFixed(1)}</span>
              </div>

              {/* 11 field wajib */}
              <div className="grid gap-x-4 gap-y-1.5 rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 text-xs sm:grid-cols-2">
                <p className="sm:col-span-2 mb-1 font-semibold text-violet-300">Catatan wajib per ujian (11 field):</p>
                <span className="text-slate-400">1 · Entry price</span>
                <span className="text-right font-mono text-slate-200">{d.ledger.entry !== null ? d.ledger.entry.toFixed(3) : '— (no trade)'}</span>
                <span className="text-slate-400">2 · Exit price</span>
                <span className="text-right font-mono text-slate-200">{d.ledger.exit !== null ? `${d.ledger.exit.toFixed(3)}${d.ledger.targetHit ? ` (target @c${d.ledger.hitCandle})` : d.ledger.mode === 'NO-TRADE' ? '' : ' (akhir horizon)'}` : '—'}</span>
                <span className="text-slate-400">3 · Fee buy (0.1%)</span>
                <span className="text-right font-mono text-slate-200">{d.ledger.feeBuy !== null ? d.ledger.feeBuy.toFixed(4) : '—'}</span>
                <span className="text-slate-400">4 · Fee sell (0.1%)</span>
                <span className="text-right font-mono text-slate-200">{d.ledger.feeSell !== null ? d.ledger.feeSell.toFixed(4) : '—'}</span>
                <span className="text-slate-400">5 · Gross P/L (tidak dipakai sbg hasil)</span>
                <span className={`text-right font-mono ${d.ledger.grossPct !== null ? (d.ledger.grossPct >= 0 ? 'text-emerald-300' : 'text-rose-300') : 'text-slate-500'}`}>{d.ledger.grossPct !== null ? `${d.ledger.grossPct >= 0 ? '+' : ''}${d.ledger.grossPct.toFixed(2)}%` : '—'}</span>
                <span className="font-semibold text-slate-300">6 · NET P/L (hasil akhir)</span>
                <span className={`text-right font-mono font-bold ${d.ledger.netPct !== null ? (d.ledger.netPct >= 0 ? 'text-emerald-300' : 'text-rose-300') : 'text-slate-500'}`}>{d.ledger.netPct !== null ? `${d.ledger.netPct >= 0 ? '+' : ''}${d.ledger.netPct.toFixed(2)}%` : '—'}</span>
                <span className="text-slate-400">7 · Persentase return</span>
                <span className={`text-right font-mono ${d.ledger.returnPct !== null ? 'text-slate-200' : 'text-slate-500'}`}>{d.ledger.returnPct !== null ? `${d.ledger.returnPct >= 0 ? '+' : ''}${d.ledger.returnPct.toFixed(2)}%` : '—'}</span>
                <span className="text-slate-400">8 · Hasil</span>
                <span className={`text-right font-bold ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {d.ledger.mode === 'NO-TRADE' ? (d.ledger.noTradeAman ? 'BERHASIL (no-trade aman — jebakan akan rugi)' : 'GAGAL (kelewatan peluang)') : ok ? 'BERHASIL (net profit)' : 'GAGAL (rugi after fee)'}
                </span>
                <span className="text-slate-400">10 · Area likuiditas dianalisis</span>
                <span className="text-right font-mono text-slate-200">
                  {d.keputusan.pool.side === 'TAK-JELAS' ? 'tak-jelas' : `${d.keputusan.pool.jenis}/${d.keputusan.pool.side} @${d.keputusan.pool.level.toFixed(2)} · ${d.keputusan.pool.sentuhan}x sentuh`}
                </span>
                <span className="text-slate-400">11 · Stop hunting / grab?</span>
                <span className="text-right font-mono text-slate-200">{d.keputusan.grab.terjadi ? `YA — pasca-grab: ${d.keputusan.grab.post}` : 'tidak teridentifikasi'}</span>
              </div>

              {/* identifikasi grab */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                <p className="mb-1 font-semibold text-slate-400">Bagaimana mesin mengidentifikasi sapuannya (point-in-time):</p>
                {d.keputusan.grab.cara}
                <p className="mt-2 font-semibold text-slate-400">Fakta pasar saat keputusan:</p>
                {d.fakta}
              </div>

              <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-300">
                {d.keputusan.alasan.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StophuntSection({ st }: { st: ExamState }) {
  const [openNum, setOpenNum] = useState<number | null>(null)
  const s = st.stophunt
  const berhasil = s.rows.filter((r) => r.berhasil === 'BERHASIL').length
  const entries = s.rows.filter((r) => r.mode !== 'NO-TRADE')
  const netTotal = entries.reduce((acc, r) => acc + (r.netPct ?? 0), 0)
  const noTrade = s.rows.length - entries.length

  return (
    <CardShell title={undefined} icon={undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-violet-300">
            <Target className="h-5 w-5" />
            <h2 className="text-lg font-bold tracking-wide">UJIAN STOP HUNT / LIQUIDITY GRAB — 100 Skenario Pemburu Stop-Loss</h2>
          </div>
          <p className="mt-2 text-sm italic leading-relaxed text-slate-300">
            &ldquo;Seluruh 100 skenario adalah stop hunt: harga MENYAPU area likuiditas (stop cluster di bawah low / di atas high),
            memicu stop-loss berantai, lalu BERBALIK arah atau MELANJUTKAN arah. Sebelum memutuskan, otak memetakan struktur harga
            &amp; likuiditas lalu memilih SATU dari TIGA keputusan: ENTRY, MENUNGGU KONFIRMASI, atau TIDAK MENGAMBIL POSISI.
            Setiap transaksi membayar fee buy 0.1% + fee sell 0.1% — hasil akhir hanya diterima sebagai NET profit.&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            60 candle terlihat · 14 horizon · truth dari data · fee {s.feeModel.buy} + {s.feeModel.sell} = {s.feeModel.total} · SAKTI-SH v{s.versi} · {s.keputusan}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
          <Mech label="Berhasil" val={`${berhasil}/${s.rows.length}`} />
          <Mech label="Posisi diambil" val={`${entries.length}`} />
          <Mech label="No-trade" val={`${noTrade}`} />
        </div>
      </div>

      {/* jejak perkembangan */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Siklus uji → ukur → analisis → benahi → uji kembali</p>
          <div className="space-y-1.5">
            {s.ringkas.siklus.map((x, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-64 shrink-0 text-slate-400">{x.versi}</span>
                  <span className="ml-auto font-mono text-xs text-amber-300">{x.skor}</span>
                </div>
                <p className="text-xs text-slate-500">{x.catatan}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Baseline jujur — {s.ringkas.baseline.naif}: {s.ringkas.baseline.catatan}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hakim tersegel — 1100 ujian, otak beku (bukti terukur, bukan kebetulan)</p>
          <div className="space-y-1.5">
            {s.ringkas.hasil.map((x, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-64 shrink-0 text-slate-400">{x.ronde}</span>
                  <span className="ml-auto font-mono text-xs text-emerald-300">{x.skor}</span>
                </div>
                <p className="text-xs text-slate-500">{x.net}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Kumulatif suite web ini: <b className="text-slate-300">{berhasil}/{s.rows.length}</b> berhasil · total net posisi <b className="text-emerald-300">{sgn(netTotal)}</b> · {s.feeModel.catatan}</p>
        </div>
      </div>

      {/* ledger pelajaran */}
      <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300"><Lightbulb className="h-3.5 w-3.5" /> Ledger pelajaran stop hunt — setiap celah jadi aturan permanen (di-upgrade juga ke file Micaprofita_V231_SAKTI.html sebagai organ V235)</p>
        <div className="grid gap-2 lg:grid-cols-2">
          {s.ledger.map((l) => (
            <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
              <p className="font-semibold text-violet-300">{l.id}</p>
              <p className="mt-1 text-rose-300/80">Celah: {l.celah}</p>
              <p className="mt-0.5 text-emerald-300/80">Aturan: {l.aturan}</p>
            </div>
          ))}
        </div>
      </div>

      {/* peta per arketipe */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Peta kemahiran per arketipe stop hunt — terlemah dulu</p>
        <div className="grid gap-1.5 md:grid-cols-2">
          {s.perArch.map((a) => {
            const p = (a.ok / a.n) * 100
            return (
              <div key={a.k} className="flex items-center gap-2 text-xs">
                <span className="w-56 shrink-0 truncate text-slate-400">{a.k}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <div className={`h-full rounded ${p >= 100 ? 'bg-emerald-500' : p >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p}%` }} />
                </div>
                <span className="w-28 text-right font-mono text-slate-300">{a.ok}/{a.n} · net {sgn(a.net)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* penjelajah 100 skenario */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Penjelajah 100 skenario — klik untuk ruang ujian: grafik, keputusan 3-pilih, 11 field catatan wajib, amplop jawaban</p>
        <div className="grid grid-cols-10 gap-1 sm:grid-cols-20">
          {s.rows.map((r) => (
            <button
              key={r.num}
              onClick={() => setOpenNum(r.num)}
              title={`#${r.num} ${r.archLabel} [${r.diff}] ${r.aksi}${r.aksi !== 'SKIP' ? ' ' + r.arah : ''} · ${r.berhasil}${r.netPct !== null ? ` · net ${r.netPct.toFixed(2)}%` : ''}`}
              className={`rounded border px-0 py-1 text-[10px] font-mono transition ${
                r.mode === 'NO-TRADE'
                  ? r.berhasil === 'BERHASIL' ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : r.berhasil === 'BERHASIL' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
              }`}
            >
              {r.num}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-slate-600">hijau = net profit · biru = no-trade aman (jebakan terhindar) · kuning = kelewatan · merah = likuidasi</p>
      </div>

      <StophuntDialog openNum={openNum} onClose={() => setOpenNum(null)} />
    </CardShell>
  )
}
