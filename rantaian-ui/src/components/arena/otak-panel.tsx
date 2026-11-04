'use client'

// ============================================================
// MOZAIK — panel ARSITEKTUR KOGNITIF TERPADU (Advanced Interface)
// Visualisasi real-time: kondisi, kemampuan, eksperimen, error,
// perkembangan, dan aktivitas seluruh 9 fakultas kognitif.
// Semua angka dari API /api/otak yang membaca disk & jaringan
// NYATA — tanpa mockup, tanpa angka karangan.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import {
  BrainCircuit, Globe2, Coins, Database, Wrench, Code2, Gauge, RefreshCcw, Activity,
  MonitorPlay, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Wifi, WifiOff, Timer,
} from 'lucide-react'
import type { SnapshotArsitektur, Fakultas, SuiteMatriks, SumberHealth, DiagnostikDev } from '@/lib/otak/types'

const FAKULTAS_META: Record<string, { icon: React.ReactNode; warna: string }> = {
  inti: { icon: <BrainCircuit className="h-4 w-4" />, warna: '#f59e0b' },
  internet: { icon: <Globe2 className="h-4 w-4" />, warna: '#38bdf8' },
  kripto: { icon: <Coins className="h-4 w-4" />, warna: '#facc15' },
  memori: { icon: <Database className="h-4 w-4" />, warna: '#a78bfa' },
  alat: { icon: <Wrench className="h-4 w-4" />, warna: '#94a3b8' },
  developer: { icon: <Code2 className="h-4 w-4" />, warna: '#4ade80' },
  evaluasi: { icon: <Gauge className="h-4 w-4" />, warna: '#fb923c' },
  loop: { icon: <RefreshCcw className="h-4 w-4" />, warna: '#f472b6' },
  interface: { icon: <MonitorPlay className="h-4 w-4" />, warna: '#2dd4bf' },
}

const WARNA_KESEHATAN: Record<string, string> = {
  SEHAT: 'bg-emerald-400',
  PERINGATAN: 'bg-amber-400',
  SAKIT: 'bg-rose-500',
  DINONAKTIFKAN: 'bg-zinc-600',
}

function fmtB(b: number): string {
  return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`
}
function fmtWaktu(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour12: false })
  } catch { return iso }
}

// ---------------- kartu fakultas ----------------

function KartuFakultas({ f, ms }: { f: Fakultas; ms?: number }) {
  const meta = FAKULTAS_META[f.id] ?? { icon: <Activity className="h-4 w-4" />, warna: '#a1a1aa' }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          style={{ background: meta.warna + '1a', color: meta.warna, borderColor: meta.warna + '44' }}
        >
          {meta.icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-100 leading-tight">{f.nama}</p>
          <p className="text-[10px] font-mono text-zinc-500">{f.id}</p>
        </div>
        <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${WARNA_KESEHATAN[f.kesehatan] ?? 'bg-zinc-600'}`} title={f.kesehatan} />
      </div>
      <p className="text-[11px] leading-snug text-zinc-400">{f.peran}</p>
      <p className="text-[10px] leading-snug text-amber-300/90 border-l-2 border-amber-500/40 pl-2 font-medium">{f.bukti}</p>
      <div className="flex flex-wrap gap-1 mt-auto pt-0.5">
        {f.prinsip.map((p) => (
          <span key={p} className="rounded border border-zinc-700/80 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] text-zinc-400">{p}</span>
        ))}
        {ms !== undefined && (
          <span className="rounded border border-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-600">{ms}ms</span>
        )}
      </div>
    </div>
  )
}

// ---------------- matriks kemampuan ----------------

function BarPersen({ p }: { p: number }) {
  const warna = p >= 100 ? 'bg-emerald-500' : p >= 99 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${warna}`} style={{ width: `${Math.min(100, p)}%` }} />
    </div>
  )
}

function MatriksKemampuan({ ev }: { ev: SnapshotArsitektur['evaluasi'] }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h4 className="text-sm font-bold text-zinc-100">Matriks Kemampuan — 9 suite tersertifikasi</h4>
        <span className="text-[10px] text-zinc-500">hanya bukti versi otak dibekukan (anti-overfit: latihan → hakim → segel)</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[760px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Suite</th>
              <th className="px-3 py-2">Organ · Otak</th>
              <th className="px-3 py-2 text-right">Lulus</th>
              <th className="px-3 py-2 w-36">Akurasi</th>
              <th className="px-3 py-2 text-right">Likuidasi</th>
              <th className="px-3 py-2 text-right">Hakim</th>
              <th className="px-3 py-2 text-right">Segel segar</th>
              <th className="px-3 py-2 text-right">Net %</th>
            </tr>
          </thead>
          <tbody>
            {ev.suites.map((s: SuiteMatriks) => (
              <tr key={s.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-900/40">
                <td className="px-3 py-2">
                  <p className="font-semibold text-zinc-200">{s.label}</p>
                  <p className="text-[9px] font-mono text-zinc-600">{s.id} · {s.file} file bukti</p>
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  <p className="font-mono text-[10px]">{s.organ}</p>
                  <p className="text-[9px] text-zinc-600">otak {s.otakVersi}</p>
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-200">{s.berhasil}/{s.total}</td>
                <td className="px-3 py-2">
                  <p className={`mb-1 font-mono font-bold ${s.persen >= 100 ? 'text-emerald-400' : s.persen >= 99 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {s.persen.toFixed(2)}%
                  </p>
                  <BarPersen p={s.persen} />
                </td>
                <td className={`px-3 py-2 text-right font-mono ${s.likuidasi > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>{s.likuidasi}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-400">{s.hakim.total > 0 ? `${s.hakim.berhasil}/${s.hakim.total}` : '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-400">{s.segel.total > 0 ? `${s.segel.berhasil}/${s.segel.total}` : '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-emerald-400/90">{s.netSum > 0 ? `+${s.netSum.toFixed(0)}` : '—'}</td>
              </tr>
            ))}
            <tr className="bg-zinc-900/80 font-bold">
              <td className="px-3 py-2.5 text-zinc-100" colSpan={2}>GRAND TOTAL</td>
              <td className="px-3 py-2.5 text-right font-mono text-zinc-100">{ev.grandBerhasil}/{ev.grandTotal}</td>
              <td className="px-3 py-2.5 font-mono text-emerald-400">{ev.grandPersen.toFixed(2)}%</td>
              <td className="px-3 py-2.5 text-right font-mono text-rose-400">{ev.grandLikuidasi}</td>
              <td className="px-3 py-2.5" colSpan={2} />
              <td className="px-3 py-2.5 text-right font-mono text-emerald-400">+{ev.grandNet.toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* kejujuran: kelemahan terbuka */}
      {ev.kelemahan.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5" /> Kelemahan terbuka yang diakui mesin ({ev.kelemahan.length}) — bahan ronde belajar berikutnya
          </p>
          <ul className="space-y-1">
            {ev.kelemahan.map((k, i) => (
              <li key={i} className="text-[10px] leading-snug text-amber-200/80">• {k}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------- learning loop ----------------

function LoopBelajar({ loop }: { loop: SnapshotArsitektur['loop'] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-bold text-zinc-100">Learning Loop — siklus 9 fase Guru</h4>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {loop.fase.map((f) => (
          <div key={f.nomor} className="group relative rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/[0.07] px-2.5 py-1.5" title={f.tanya}>
            <p className="text-[10px] font-bold text-fuchsia-300">{f.nomor}. {f.nama}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-[11px]">
        <span className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-2.5 py-1.5">
          <span className="font-mono font-bold text-fuchsia-300">{loop.totalRonde}</span> <span className="text-zinc-400">ronde uji→bedah→benahi→retest</span>
        </span>
        <span className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-2.5 py-1.5">
          <span className="font-mono font-bold text-fuchsia-300">{loop.kegagalanJadiPelajaran}</span> <span className="text-zinc-400">kegagalan riwayat → pelajaran permanen</span>
        </span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {loop.siklus.map((c) => (
          <div key={c.suite} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-2">
            <p className="text-[10px] font-mono text-zinc-500">{c.suite}</p>
            <p className="text-[11px] text-zinc-300">
              <span className="font-bold text-fuchsia-300">{c.ronde} ronde</span> · {c.pelajaranBaru} versi otak
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- internet intelligence ----------------

function IntelInternet({ sumber, error }: { sumber: SumberHealth[] | null; error: string | null }) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3 text-[11px] text-rose-300">
        <WifiOff className="mr-1.5 inline h-3.5 w-3.5" /> probe gagal: {error} — degradasi aman (recovery)
      </div>
    )
  }
  if (!sumber) return null
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-100">
        <Wifi className={`h-4 w-4 ${sumber.every((s) => s.ok) ? 'text-emerald-400' : 'text-amber-400'}`} /> Internet Intelligence — {sumber.length} sumber NOL BIAYA (probe langsung)
      </h4>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Sumber</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Latensi</th>
              <th className="px-3 py-2">Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            {sumber.map((s) => (
              <tr key={s.id} className="border-b border-zinc-800/60 last:border-0">
                <td className="px-3 py-2">
                  <p className="font-semibold text-zinc-200">{s.nama}</p>
                  <p className="text-[9px] text-zinc-600">{s.gratis && s.tanpaKey ? 'gratis · tanpa api-key' : 'berbayar!'}</p>
                </td>
                <td className="px-3 py-2">
                  {s.ok ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> hidup</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400"><XCircle className="h-3.5 w-3.5" /> terdegradasi</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{s.latencyMs !== null ? `${s.latencyMs} ms` : '—'}</td>
                <td className="px-3 py-2 text-[10px] text-zinc-400">
                  {s.verifikasi}
                  {s.redundancy && <span className="block text-[9px] text-zinc-600">{s.redundancy}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- developer intelligence ----------------

function IntelDeveloper({ dev, error }: { dev: SnapshotArsitektur['developer']; error: string | null }) {
  if (error) {
    return <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3 text-[11px] text-rose-300">diagnostik gagal: {error}</div>
  }
  if (!dev) return null
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-100">
        <Code2 className="h-4 w-4 text-emerald-400" /> Developer Intelligence — cyborg memeriksa kode miliknya
      </h4>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {dev.diagnostik.map((d: DiagnostikDev, i: number) => (
          <div key={i} className={`rounded-lg border p-2.5 ${d.ok ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-rose-500/30 bg-rose-500/[0.06]'}`}>
            <p className={`flex items-center gap-1.5 text-[11px] font-bold ${d.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {d.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {d.nama}
            </p>
            <p className="mt-0.5 text-[10px] font-mono leading-snug text-zinc-400">{d.detail}</p>
          </div>
        ))}
      </div>
      {dev.sakti.ada && dev.sakti.sha256 && (
        <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[10px] text-zinc-500">
          SAKTI {(dev.sakti.bytes! / 1048576).toFixed(2)} MB · SHA256 {dev.sakti.sha256.slice(0, 32)}… · organ: {dev.sakti.organ.join(' · ')}
        </p>
      )}
    </div>
  )
}

// ---------------- memori ----------------

function PanelMemori({ m, error }: { m: SnapshotArsitektur['memori']; error: string | null }) {
  if (error) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3 text-[11px] text-rose-300">{error}</div>
  if (!m) return null
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-100">
        <Database className="h-4 w-4 text-violet-400" /> Long-Term Memory — pengalaman, kesalahan, pelajaran
      </h4>
      <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <p className="font-mono text-lg font-bold text-violet-300">{m.pengalaman.toLocaleString('id-ID')}</p>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">eksekusi ujian terekam</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <p className="font-mono text-lg font-bold text-rose-300">{m.kegagalan.toLocaleString('id-ID')}</p>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">kesalahan tersimpan</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <p className="font-mono text-lg font-bold text-emerald-300">{m.file}</p>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">file bukti · {fmtB(m.bytes)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <p className="font-mono text-lg font-bold text-amber-300">H{m.tier.hot}/W{m.tier.warm}/C{m.tier.cold}</p>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">tier hot/warm/cold</p>
        </div>
      </div>
      {m.pelajaran.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {m.pelajaran.slice(0, 24).map((p) => (
            <span
              key={p.kode}
              title={p.contoh ?? p.kode}
              className="cursor-help rounded border border-violet-500/30 bg-violet-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-violet-300"
            >
              {p.kode}<span className="ml-1 text-violet-500/70">×{p.jumlah}</span>
            </span>
          ))}
          {m.pelajaran.length > 24 && <span className="text-[9px] text-zinc-500">+{m.pelajaran.length - 24} kode lain…</span>}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500">kode pelajaran dipungut di mode CLI lengkap (scripts/evaluasi_otak.ts)</p>
      )}
    </div>
  )
}

// ---------------- panel utama ----------------

export function OtakPanel() {
  const [snap, setSnap] = useState<SnapshotArsitektur | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [muat, setMuat] = useState(true)

  const muatData = useCallback(async () => {
    setMuat(true)
    try {
      const res = await fetch('/api/otak', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSnap((await res.json()) as SnapshotArsitektur)
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setMuat(false)
    }
  }, [])

  useEffect(() => {
    muatData()
    const t = setInterval(muatData, 30_000) // denyut 30 detik
    return () => clearInterval(t)
  }, [muatData])

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-[#0c0c0f] to-[#0c0c0f] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
              <BrainCircuit className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-zinc-50">MOZAIK — Arsitektur Kognitif Terpadu</h3>
              <p className="text-[11px] text-zinc-500">
                9 fakultas · {snap?.evaluasi.grandTotal.toLocaleString('id-ID') ?? '…'} ujian tersertifikasi · semua database nol biaya · v{snap?.versi ?? '…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {snap && (
              <span className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5 font-mono text-[10px] text-zinc-400">
                <Timer className="h-3 w-3" /> {fmtWaktu(snap.waktu)} · denyut 30s
              </span>
            )}
            <button
              onClick={muatData}
              disabled={muat}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${muat ? 'animate-spin' : ''}`} /> Segarkan
            </button>
          </div>
        </div>
        {err && (
          <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2 text-[11px] text-rose-300">
            snapshot gagal: {err} — cyborg menurunkan fakultas yang sakit, sisanya tetap hidup (fault isolation)
          </p>
        )}
      </div>

      {/* peta 9 fakultas */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {(snap?.fakultas ?? Array.from({ length: 9 }, (_, i) => null)).map((f, i) =>
          f ? (
            <KartuFakultas key={f.id} f={f} />
          ) : (
            <div key={i} className="h-[148px] animate-pulse rounded-xl border border-zinc-800/60 bg-zinc-900/30" />
          ),
        )}
      </div>

      {/* matriks kemampuan */}
      {snap && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <MatriksKemampuan ev={snap.evaluasi} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {snap && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <LoopBelajar loop={snap.loop} />
          </div>
        )}
        {snap && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <PanelMemori m={snap.memori} error={snap.memoriError} />
          </div>
        )}
      </div>

      {snap && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <IntelInternet sumber={snap.internet} error={snap.internetError} />
        </div>
      )}

      {snap && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <IntelDeveloper dev={snap.developer} error={snap.developerError} />
        </div>
      )}

      {/* alat & prinsip rekayasa */}
      {snap && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-100">
            <Wrench className="h-4 w-4 text-zinc-400" /> Tool & API Layer — {snap.alat.length} alat, semua sumber data nol biaya
          </h4>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {snap.alat.map((a) => (
              <div key={a.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-bold text-zinc-200">{a.nama}</p>
                  {a.versi && <span className="shrink-0 rounded border border-zinc-700 px-1 py-0.5 font-mono text-[8px] text-zinc-500">v{a.versi}</span>}
                </div>
                <p className="mt-0.5 truncate text-[9px] text-zinc-500" title={a.file}>{a.file}</p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-zinc-600" title={a.bukti}>{a.bukti}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {snap?.buktiCli && (
        <p className="text-center text-[10px] text-zinc-600">
          bukti CLI terakhir: research/otak/snapshot-otak.json · {fmtWaktu(snap.buktiCli.waktu)} · grand {snap.buktiCli.grandPersen.toFixed(2)}%
        </p>
      )}
    </div>
  )
}
