'use client'

// V301 UJIAN JUAL-AMBISIUS 50.000 — panel arena (data riil Binance)
// Menjalankan ulang seluruh mesin ujian di server: kolam 1000-bar riil,
// 50.000 soal berbibit, grading tetap, kontestan V301 vs rumus lama vs dadu.

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Target, RefreshCcw, Loader2, TrendingDown, TrendingUp, Scale, ShieldAlert, CheckCircle2,
} from 'lucide-react'

interface Vonis {
  n: number; segi: number; sempurna: number; kena: number
  takKena: number; naikLagi: number; lemah: number; aRata: number
}
interface Hasil {
  meta: { versi: string; seed: number; at: string; koin: number; soalMentah: number; soal: number; train: number; val: number; durasiDetik: number; gagal: string[] }
  ringkas: {
    v301: { penuh: Vonis; validasi: Vonis }
    lama: { penuh: Vonis; validasi: Vonis }
    dadu: { penuh: Vonis }
  }
  bedahV301: Record<string, Vonis>
  bedahLama: Record<string, Vonis>
  kurvaK: { k: number; kena: number; segi: number; sempurna: number }[]
  kejujuran: string
}

function Kartu({ judul, v, tone, sub }: { judul: string; v: Vonis | undefined; tone: string; sub?: string }) {
  if (!v) return null
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{judul}</p>
      <p className="mt-1 text-3xl font-black">{v.segi.toFixed(2)}<span className="text-sm font-medium opacity-70">%</span></p>
      <p className="text-[11px] opacity-80">LULUS-SEGI dari {v.n.toLocaleString('id-ID')} soal</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span>SEMPURNA: <b>{v.sempurna.toFixed(2)}%</b></span>
        <span>kena: <b>{v.kena.toFixed(1)}%</b></span>
        <span>naik-lagi: <b>{v.naikLagi.toFixed(1)}%</b></span>
        <span>tak-kena: <b>{v.takKena.toFixed(1)}%</b></span>
      </div>
      {sub && <p className="mt-2 text-[10px] opacity-70">{sub}</p>}
    </div>
  )
}

export function AmbisiusPanel() {
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [muat, setMuat] = useState(false)

  const load = useCallback(async () => {
    try {
      setErr(null); setMuat(true)
      const res = await fetch('/api/exam/ambisius', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setHasil((await res.json()) as Hasil)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setMuat(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const m = hasil?.meta
  const v301 = hasil?.ringkas.v301
  const lama = hasil?.ringkas.lama

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Target className="h-5 w-5 text-violet-300" />
          <h2 className="text-lg font-bold text-violet-200">UJIAN JUAL-AMBISIUS 50.000 — DATA RIIL</h2>
          <Button size="sm" variant="outline" onClick={load} disabled={muat} className="ml-auto">
            {muat ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />} Segarkan
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Cyborg ditempa dari <b>50.000 soal hari pasar sesungguhan</b> (91+ koin Binance, 1000 bar harian per koin).
          Tiap soal: cyborg hanya boleh melihat 30 bar masa lalu, lalu memasang entry, stop, sasaran, dan{' '}
          <b className="text-violet-300">jual ambisius</b>. Lulus-SEGI = ambisius <i>kena</i> hari itu DAN longsor menyusul
          (close di bawahnya dengan jatuh ≥ 0,5 ATR). Lulus-SEMPURNA = SEGI + menangkap ≥ separuh kenaikan hari itu.
          Strata: sideways 20.000 · bullish 15.000 · bearish 15.000, plus ~12% hari-pump (berita &amp; spekulasi) per strata.
        </p>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          <ShieldAlert className="h-4 w-4" /> Gagal memuat ujian: {err}
          <Button size="sm" variant="outline" onClick={load} className="ml-auto"><RefreshCcw className="h-3 w-3" /> Ulangi</Button>
        </div>
      )}

      {!hasil && !err && (
        <div className="flex flex-col items-center gap-3 py-14 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <p className="text-sm">Menarik 1000 bar harian riil per koin, menyusun 50.000 soal, lalu menegakkan vonis…</p>
          <p className="text-xs text-slate-500">panggilan pertama ±20-60 detik; setelahnya tersegel per hari (deterministik seed 50500)</p>
        </div>
      )}

      {hasil && m && v301 && lama && (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-violet-500/40 text-violet-300">seed {m.seed}</Badge>
            <Badge variant="outline" className="border-slate-500/40 text-slate-300">{m.koin} koin riil</Badge>
            <Badge variant="outline" className="border-slate-500/40 text-slate-300">{m.soal.toLocaleString('id-ID')} soal</Badge>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">validasi dipegang {m.val.toLocaleString('id-ID')}</Badge>
            <Badge variant="outline" className="border-slate-500/40 text-slate-400">dihitung {m.durasiDetik}s</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Kartu judul="V301-F8 (juara 5 ronde)" v={v301.penuh}
              tone="border-violet-500/40 bg-violet-500/10 text-violet-100"
              sub={`prediksi langit-langit; A rata-rata ${v301.penuh.aRata.toFixed(2)}% di atas harga`} />
            <Kartu judul="RUMUS LAMA (proxy q75-MC)" v={lama.penuh}
              tone="border-zinc-600/40 bg-zinc-800/40 text-zinc-200"
              sub="k=1.0×ATR — level yang dulu dipasang arena" />
            <Kartu judul="DADU (A acak 0,3-3,0%, rata-rata sama)" v={hasil.ringkas.dadu.penuh}
              tone="border-zinc-600/40 bg-zinc-800/40 text-zinc-200"
              sub="pembanding buta dengan ambisi rata-rata sama — V301 menang di SEMPURNA (adaptif) & naik-lagi lebih rendah" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Scale className="h-4 w-4" /> Vonis di VALIDASI 10.000 (tak pernah menyetir kalibrasi)</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
                  <p className="text-xs text-violet-300">V301</p>
                  <p className="text-2xl font-black text-violet-100">{v301.validasi.segi.toFixed(2)}%</p>
                  <p className="text-[11px] text-slate-400">SEGI · SEMPURNA {v301.validasi.sempurna.toFixed(2)}% · kena {v301.validasi.kena.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border border-zinc-600/40 bg-zinc-800/40 p-3">
                  <p className="text-xs text-zinc-400">Rumus lama</p>
                  <p className="text-2xl font-black text-zinc-200">{lama.validasi.segi.toFixed(2)}%</p>
                  <p className="text-[11px] text-slate-400">SEGI · SEMPURNA {lama.validasi.sempurna.toFixed(2)}% · kena {lama.validasi.kena.toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Peningkatan SEGI ≈ <b className="text-emerald-300">{lama.validasi.segi > 0 ? (v301.validasi.segi / lama.validasi.segi).toFixed(1) : '—'}×</b> tanpa satu pun soal validasi menyentuh kalibrasi.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-300"><TrendingUp className="h-4 w-4" /> Bedah per rezim &amp; hari spesial (V301, 50.000 soal)</p>
              <table className="mt-2 w-full text-[11px]">
                <thead className="text-slate-400">
                  <tr><th className="text-left">Strata</th><th>SEGI</th><th>SEMPURNA</th><th>kena</th><th>naik-lagi</th></tr>
                </thead>
                <tbody>
                  {Object.entries(hasil.bedahV301).map(([k, v]) => (
                    <tr key={k} className="border-t border-white/5">
                      <td className="py-1 text-left text-slate-300">{k.replace('rezim_', '')}</td>
                      <td className="text-center font-bold text-violet-300">{v.segi.toFixed(1)}%</td>
                      <td className="text-center">{v.sempurna.toFixed(1)}%</td>
                      <td className="text-center">{v.kena.toFixed(0)}%</td>
                      <td className="text-center text-rose-300/80">{v.naikLagi.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-600/40 bg-slate-900/40 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-200"><TrendingDown className="h-4 w-4 text-slate-400" /> Peta tangga harga dari data (kurva k-kena)</p>
            <p className="mb-2 text-[11px] text-slate-400">Berapa sering level &quot;k×ATR di atas harga&quot; tersentuh dalam sehari — dasar ilmiah mengapa level lama (k=1,0-1,5) nyaris mustahil kena.</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {hasil.kurvaK.map((row) => (
                <span key={row.k} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                  k={row.k} → kena <b className="text-slate-200">{row.kena.toFixed(0)}%</b> · segi <b className="text-violet-300">{row.segi.toFixed(1)}%</b>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs leading-relaxed text-slate-300">
            <p className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Kejujuran V274</p>
            <p className="mt-1">{hasil.kejujuran}</p>
            {m.gagal.length > 0 && <p className="mt-1 text-slate-500">Koin dibuang gerbang/jaring: {m.gagal.join(', ')}</p>}
          </div>
        </>
      )}
    </div>
  )
}
