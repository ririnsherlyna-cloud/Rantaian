'use client'

// ============================================================
// V302 PANEL SAPUAN 10 KOIN — hidup, sadar hari, anti-error
// ------------------------------------------------------------
// • Label tanggal & jam diambil HIDUP (jam klien UTC + hari dari
//   server) — tidak pernah lagi macet di tanggal hari lama.
// • Pola tarikan: tiap 60 dtk + saat tab kembali aktif + SEKETIKA
//   saat hari UTC berganti (pemantau pergantian hari).
// • Mode jujur: HIDUP / SIMPANAN / USANG + status kalibrasi.
// • localStorage: 0 (syarat Tugas F).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Zap, ShieldCheck, AlertTriangle, Clock } from 'lucide-react'

interface LevelKoin {
  entry: number
  sasaran: number
  stop: number
  ambisius: number | null
  ambisiusAlasan: string
  ambisiusLulus: boolean
}

interface KoinSapuan {
  simbol: string
  nama: string
  skor: number
  harga: number
  perubahan24h: number
  qv24h: number
  atr7Pct: number
  mom7: number
  rsi14: number
  bias: 'NAIK' | 'TURUN' | 'NETRAL'
  rezimKoin: 'SIDEWAYS' | 'BEARISH' | 'BULLISH'
  level: LevelKoin
  kalibrasiLabel: string
}

interface HasilSapuan {
  hari: string
  jam: string
  pada: string
  mode: 'HIDUP' | 'SIMPANAN'
  usang: boolean
  dariSimpangan: boolean
  funnel: { pasanganUsdt: number; likuid: number; lolosGerbang: number; dinilai: number; terpilih: number }
  koin: KoinSapuan[]
  kalibrasi: { status: string; versi: string; terkalibrasi: boolean; sumber: string; catatan: string }
  catatan: string[]
}

function fmtHarga(h: number): string {
  if (!Number.isFinite(h)) return '-'
  if (h >= 1000) return h.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (h >= 1) return h.toFixed(4)
  if (h >= 0.01) return h.toFixed(5)
  return h.toFixed(8)
}

function fmtJt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} jt`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} rb`
  return n.toFixed(0)
}

export function Sapu10Panel() {
  const [hasil, setHasil] = useState<HasilSapuan | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [jamHidup, setJamHidup] = useState('--:--:--')
  const [hariHidup, setHariHidup] = useState('----')
  const [galat, setGalat] = useState<string | null>(null)
  const hariServerRef = useRef<string | null>(null)

  const tarik = useCallback(async (force = false) => {
    setMemuat(true)
    try {
      const res = await fetch(`/api/sapu10${force ? '?force=1' : ''}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = (await res.json()) as HasilSapuan
      setHasil(j)
      setGalat(null)
      hariServerRef.current = j.hari
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'galat tak diketahui')
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    void tarik()
    const poll = setInterval(() => void tarik(), 60_000)
    const kembali = () => {
      if (document.visibilityState === 'visible') void tarik()
    }
    document.addEventListener('visibilitychange', kembali)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', kembali)
    }
  }, [tarik])

  // jam UTC hidup + pemantau pergantian hari (segar seketika)
  useEffect(() => {
    const t = setInterval(() => {
      const kini = new Date()
      setJamHidup(kini.toISOString().slice(11, 19))
      const hari = kini.toISOString().slice(0, 10)
      setHariHidup(hari)
      if (hariServerRef.current && hari !== hariServerRef.current) {
        hariServerRef.current = hari
        void tarik(true) // hari berganti → paksa sapuan segar seketika
      }
    }, 1000)
    return () => clearInterval(t)
  }, [tarik])

  const mode = hasil?.mode ?? null
  const usang = hasil?.usang ?? false

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6">
      {/* KEPALA — waktu hidup & mode jujur */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Zap className="h-4 w-4 text-amber-400" /> SAPUAN 10 KOIN
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">V302</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-zinc-200">{hariHidup}</span> · <span className="tabular-nums text-emerald-400">{jamHidup}</span> UTC
        </span>
        {mode === 'HIDUP' && !usang && (
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> HIDUP · hari {hasil?.hari}
          </span>
        )}
        {mode === 'SIMPANAN' && (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
            <AlertTriangle className="h-3 w-3" /> SIMPANAN{usang ? ` · data hari ${hasil?.hari} (usang)` : ''}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {hasil?.kalibrasi && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${hasil.kalibrasi.terkalibrasi ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-zinc-600 bg-zinc-800 text-zinc-400'}`}>
              {hasil.kalibrasi.terkalibrasi ? `KALIBRASI ${hasil.kalibrasi.versi}` : 'AMBISIUS: BELUM TERKALIBRASI'}
            </span>
          )}
          <button
            onClick={() => void tarik(true)}
            disabled={memuat}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${memuat ? 'animate-spin' : ''}`} /> SAPU ULANG
          </button>
        </span>
      </div>

      {/* FUNNEL */}
      {hasil && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { l: 'Pasangan USDT', v: hasil.funnel.pasanganUsdt },
            { l: 'Likuid ≥3jt', v: hasil.funnel.likuid },
            { l: 'Lolos gerbang', v: hasil.funnel.lolosGerbang },
            { l: 'Dinilai', v: hasil.funnel.dinilai },
            { l: 'Terpilih', v: hasil.funnel.terpilih },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-center">
              <div className="font-mono text-lg font-bold text-zinc-100">{s.v.toLocaleString('id-ID')}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {(galat || (hasil && hasil.catatan.length > 0)) && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300/90">
          {galat ? `Sambungan rewel: ${galat} — menampilkan data terakhir yang hidup.` : hasil?.catatan.join(' · ')}
        </div>
      )}

      {/* TABEL 10 KOIN */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2.5">Koin</th>
              <th className="px-3 py-2.5 text-right">Skor</th>
              <th className="px-3 py-2.5 text-right">Harga</th>
              <th className="px-3 py-2.5 text-right">24j</th>
              <th className="px-3 py-2.5 text-right">ATR% · Mom7</th>
              <th className="px-3 py-2.5 text-right">ENTRY</th>
              <th className="px-3 py-2.5 text-right">SASARAN</th>
              <th className="px-3 py-2.5 text-right">STOP</th>
              <th className="px-3 py-2.5 text-right">JUAL AMBISIUS</th>
            </tr>
          </thead>
          <tbody>
            {!hasil && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Menyapu pasar…</td></tr>
            )}
            {hasil && hasil.koin.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Belum ada koin — {hasil.catatan.join(' ')}</td></tr>
            )}
            {hasil?.koin.map((k) => (
              <tr key={k.simbol} className="border-b border-zinc-800/60 transition-colors hover:bg-zinc-900/40">
                <td className="px-3 py-2.5">
                  <div className="font-bold text-zinc-100">{k.nama}</div>
                  <div className="text-[10px] text-zinc-500">{k.rezimKoin} · RSI {k.rsi14}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-300">{k.skor.toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-zinc-200">{fmtHarga(k.harga)}</td>
                <td className={`px-3 py-2.5 text-right font-mono ${k.perubahan24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {k.perubahan24h >= 0 ? '+' : ''}{k.perubahan24h.toFixed(2)}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-zinc-400">
                  {k.atr7Pct.toFixed(2)}% · {k.mom7 >= 0 ? '+' : ''}{k.mom7.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sky-300">{fmtHarga(k.level.entry)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-300">{fmtHarga(k.level.sasaran)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-red-300">{fmtHarga(k.level.stop)}</td>
                <td className="px-3 py-2.5 text-right">
                  {k.level.ambisius !== null ? (
                    <div>
                      <div className="font-mono font-bold text-fuchsia-300">{fmtHarga(k.level.ambisius)}</div>
                      <div className="text-[9px] leading-tight text-zinc-500">{k.kalibrasiLabel}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] text-zinc-500">gerbang tutup</div>
                      <div className="text-[9px] leading-tight text-zinc-600">{k.level.ambisiusAlasan}</div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasil && (
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Level E→T→S dari ATR-7 hari (V273). JUAL AMBISIUS: {hasil.kalibrasi?.catatan ?? 'belum terkalibrasi'}.
          Semua label adalah observasi pasar, BUKAN janji profit (V274). Data Binance publik, tanpa kunci, tanpa localStorage.
        </p>
      )}
    </div>
  )
}
