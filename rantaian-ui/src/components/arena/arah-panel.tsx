'use client'

// ============================================================
// PANEL KEPASTIAN ARAH — fisika tampilan OTAK-ARAH v1.8.
// Laboratorium interaktif: pilih skenario kompleks 5-aspek,
// saksikan DEWAN BUKTI 8 DIMENSI berbicara satu per satu,
// vonis biner BUY/SELL + gauge kepastian, lalu buka tirai
// horizon: benar/salah + NET profit/loss (fee wajib).
// Semua berjalan LANGSUNG di browser memakai otak ujian
// bersertifikat yang sama (arah-brain v1.8 + forge kompleks).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Play, RefreshCcw, Eye, Loader2, Scale, Droplets, BarChart3, Wind, Ruler, Activity, Waves, Shuffle, BadgeCheck } from 'lucide-react'
import { forgeKlExam, type KlExam } from '@/lib/exam/kompleks-suite'
import { simKlTrade, KL_VISIBLE, type KlLedger } from '@/lib/exam/kompleks-forge'
import { arahVonis, ARAH_BRAIN_VERSI, type VonisArah } from '@/lib/exam/arah-brain'

const ORGAN_BOARD = [
  { id: 'v237-FBO', nama: 'False Breakout', versi: 'v1.38', skor: '744/744', ujian: 'hakim segel-seged', warna: '#38bdf8' },
  { id: 'v238-PD', nama: 'Pump & Dump', versi: 'v1.7', skor: '1600/1600', ujian: 'latihan + hakim + segel', warna: '#f472b6' },
  { id: 'v239-KL', nama: 'Kompleks 5 Aspek', versi: 'v1.0', skor: '1600/1600', ujian: 'latihan + hakim + segel', warna: '#a78bfa' },
  { id: 'v240-AR', nama: 'Kepastian Arah', versi: `v${ARAH_BRAIN_VERSI}`, skor: '10600/10600', ujian: 'latihan + 11 hakim + 10 segel', warna: '#fbbf24' },
]

const DIM_ICON: Record<string, React.ReactNode> = {
  'AR-E1': <Waves className="h-3.5 w-3.5" />,
  'AR-E2': <Droplets className="h-3.5 w-3.5" />,
  'AR-E3': <BarChart3 className="h-3.5 w-3.5" />,
  'AR-E4': <Wind className="h-3.5 w-3.5" />,
  'AR-E5': <Activity className="h-3.5 w-3.5" />,
  'AR-E6': <Ruler className="h-3.5 w-3.5" />,
  'AR-E7': <Scale className="h-3.5 w-3.5" />,
  'AR-E8': <Shuffle className="h-3.5 w-3.5" />,
}

const voteTone = (vote: string) =>
  vote === 'NAIK'
    ? { teks: 'text-emerald-300', bar: 'bg-emerald-500', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', label: 'NAIK' }
    : vote === 'TURUN'
      ? { teks: 'text-rose-300', bar: 'bg-rose-500', border: 'border-rose-500/40', bg: 'bg-rose-500/10', label: 'TURUN' }
      : { teks: 'text-zinc-400', bar: 'bg-zinc-600', border: 'border-zinc-700', bg: 'bg-zinc-800/40', label: 'NETRAL' }

export function ArahPanel() {
  const [ns, setNs] = useState('ar-live1')
  const [num, setNum] = useState(1)
  const [exam, setExam] = useState<KlExam | null>(null)
  const [vonis, setVonis] = useState<VonisArah | null>(null)
  const [ledger, setLedger] = useState<KlLedger | null>(null)
  const [tahap, setTahap] = useState<'pilih' | 'menganalisis' | 'vonis' | 'buka'>('pilih')
  const [err, setErr] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const gambar = useCallback((eks: KlExam | null, vn: VonisArah | null, buka: boolean) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width
    const H = cv.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0c0c0f'
    ctx.fillRect(0, 0, W, H)
    if (!eks) return

    const visible = eks.candles.slice(0, KL_VISIBLE)
    const horizon = eks.candles.slice(KL_VISIBLE)
    const data = buka ? eks.candles : visible
    const lo = Math.min(...data.map((c) => c.l))
    const hi = Math.max(...data.map((c) => c.h))
    const pad = (hi - lo) * 0.08 || 1
    const y = (p: number) => H - 14 - ((p - lo + pad) / (hi - lo + 2 * pad)) * (H - 28)
    const nTot = data.length
    const cw = W / nTot

    // garis level kunci
    if (vn) {
      const garis: [number, string, string][] = [
        [eks.entry, '#fbbf24', 'ENTRY'],
      ]
      if (vn.eksekusi.triggerLevel) garis.push([vn.eksekusi.triggerLevel, '#22d3ee', 'TRIGGER'])
      for (const [p, warna, label] of garis) {
        ctx.strokeStyle = warna + '88'
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(0, y(p))
        ctx.lineTo(W, y(p))
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = warna
        ctx.font = '9px monospace'
        ctx.fillText(label, 4, y(p) - 3)
      }
    }

    data.forEach((c, i) => {
      const x = i * cw + cw / 2
      const naik = c.c >= c.o
      ctx.strokeStyle = naik ? '#34d399' : '#fb7185'
      ctx.fillStyle = naik ? '#34d399' : '#fb7185'
      ctx.beginPath()
      ctx.moveTo(x, y(c.h))
      ctx.lineTo(x, y(c.l))
      ctx.stroke()
      const bw = Math.max(1.5, cw * 0.62)
      const yo = y(Math.max(c.o, c.c))
      const yc = y(Math.min(c.o, c.c))
      ctx.fillRect(x - bw / 2, yo, bw, Math.max(1, yc - yo))
      if (!buka && i === KL_VISIBLE - 1) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 1.2
        ctx.strokeRect(x - bw / 2 - 2, y(c.h) - 4, bw + 4, y(c.l) - y(c.h) + 8)
        ctx.lineWidth = 1
      }
    })

    // pembatas visible | horizon
    if (buka) {
      ctx.strokeStyle = '#52525b'
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(KL_VISIBLE * cw, 0)
      ctx.lineTo(KL_VISIBLE * cw, H)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '9px monospace'
      ctx.fillText('HORIZON 14', KL_VISIBLE * cw + 4, 12)
    } else {
      ctx.fillStyle = '#71717a'
      ctx.font = '9px monospace'
      ctx.fillText('60 CANDLE VISIBLE — horizon tersembunyi (anti-hindsight)', 8, 12)
    }
    void horizon
  }, [])

  useEffect(() => {
    gambar(exam, vonis, tahap === 'buka')
  }, [exam, vonis, tahap, gambar])

  const jalankan = useCallback(() => {
    setErr(null)
    setTahap('menganalisis')
    setVonis(null)
    setLedger(null)
    // beri kesempatan UI render "menganalisis" dulu
    setTimeout(() => {
      try {
        const eks = forgeKlExam(num, ns.trim() || 'ar-live1')
        const vis = eks.candles.slice(0, KL_VISIBLE)
        const vn = arahVonis(vis)
        const led = simKlTrade(
          { aksi: vn.eksekusi.aksi, arah: vn.arah, targetPct: vn.eksekusi.targetPct, stopPct: vn.eksekusi.stopPct, triggerLevel: vn.eksekusi.triggerLevel },
          eks.entry, eks.candles.slice(KL_VISIBLE), eks.bait,
        )
        setExam(eks)
        setVonis(vn)
        setLedger(led)
        setTahap('vonis')
      } catch (e) {
        setErr(`gagal membangun skenario: ${(e as Error).message}`)
        setTahap('pilih')
      }
    }, 60)
  }, [ns, num])

  const acak = useCallback(() => {
    setNum(1 + Math.floor(Math.random() * 100))
    setNs(`ar-live${1 + Math.floor(Math.random() * 999)}`)
  }, [])

  const bukaTirai = useCallback(() => setTahap('buka'), [])
  const ulang = useMemo(() => () => { setTahap('pilih'); setVonis(null); setLedger(null); setExam(null) }, [])

  return (
    <div className="space-y-5">
      {/* ==== papan kredensial organ ==== */}
      <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-zinc-900/60 to-zinc-900/60 p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
            <Crosshair className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-zinc-50">OTAK-ARAH <span className="text-amber-400">·</span> Kepastian Arah Berbasis Bukti</h3>
            <p className="text-[11px] text-zinc-500">AGI hanya punya dua keputusan: BUY atau SELL — setiap vonis wajib berdiri di atas dewan bukti 8 dimensi</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {ORGAN_BOARD.map((o) => (
            <div key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5" style={{ color: o.warna }} />
                <span className="text-[10px] font-mono font-bold" style={{ color: o.warna }}>{o.id}</span>
                <span className="ml-auto text-[10px] font-mono text-zinc-500">{o.versi}</span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-zinc-200">{o.nama}</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-400">{o.skor}</p>
              <p className="text-[10px] leading-tight text-zinc-600">{o.ujian}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ==== lab interaktif ==== */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-600">Seed skenario</span>
            <input
              value={ns}
              onChange={(e) => setNs(e.target.value)}
              className="h-9 w-44 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 font-mono text-xs text-zinc-200 outline-none focus:border-amber-500/50"
              spellCheck={false}
            />
          </label>
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-600">Skenario #1-100</span>
            <input
              type="number"
              min={1}
              max={100}
              value={num}
              onChange={(e) => setNum(Math.min(100, Math.max(1, parseInt(e.target.value || '1', 10) || 1)))}
              className="h-9 w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 font-mono text-xs text-zinc-200 outline-none focus:border-amber-500/50"
            />
          </label>
          <button
            onClick={acak}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600"
          >
            <Shuffle className="h-3.5 w-3.5" /> Acak
          </button>
          <button
            onClick={jalankan}
            disabled={tahap === 'menganalisis'}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-xs font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
          >
            {tahap === 'menganalisis' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {tahap === 'menganalisis' ? 'Menganalisis…' : 'Jalankan Otak'}
          </button>
          {tahap === 'pilih' && (
            <button onClick={ulang} className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 hover:border-zinc-600">
              <RefreshCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          {err && <span className="text-xs text-rose-400">{err}</span>}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {/* grafik */}
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0f]">
            <canvas ref={canvasRef} width={640} height={330} className="h-auto w-full" />
            <div className="flex items-center justify-between border-t border-zinc-800/80 px-3 py-2 text-[10px] text-zinc-500">
              <span>point-in-time: 60 visible + 14 horizon · fee buy 0.1% + sell 0.1% · stop wajib</span>
              {exam && (
                <span className="font-mono">
                  {exam.fam} · {exam.diff} · truth={exam.truth}
                  <span className="ml-2 rounded border border-zinc-800 px-1.5 py-0.5">{exam.seed.split('::').slice(0, 3).join('::')}</span>
                </span>
              )}
            </div>
          </div>

          {/* dewan bukti + vonis */}
          <div className="space-y-3">
            {!vonis && tahap !== 'menganalisis' && (
              <div className="flex h-full min-h-56 items-center justify-center rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs leading-relaxed text-zinc-500">
                Tekan <span className="mx-1 font-bold text-amber-400">Jalankan Otak</span> — otak v{ARAH_BRAIN_VERSI} akan membaca
                struktur, likuiditas, volume, momentum, volatilitas, S/R, tekanan beli-jual, dan perubahan kondisi pasar
                sebelum memutuskan arah.
              </div>
            )}
            {tahap === 'menganalisis' && (
              <div className="flex h-full min-h-56 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div className="flex items-center gap-2 text-sm text-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin" /> Dewan bukti sedang membaca 60 candle…
                </div>
              </div>
            )}
            {vonis && (
              <>
                {/* vonis biner + gauge kepastian */}
                <div className={`rounded-xl border p-4 ${vonis.vonis === 'BUY' ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-rose-500/40 bg-rose-500/[0.07]'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-24 shrink-0 items-center justify-center rounded-lg text-xl font-black tracking-tight ${vonis.vonis === 'BUY' ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950'}`}>
                      {vonis.vonis}
                    </div>
                    <GaugeKepastian nilai={vonis.kepastian} />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">konsensus dewan</p>
                      <p className="font-mono text-sm font-bold text-zinc-200">{(vonis.konsensus * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-zinc-500">skor arah {vonis.skorArah > 0 ? '+' : ''}{vonis.skorArah}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 truncate font-mono text-[10px] text-zinc-500" title={vonis.lapisan}>
                    lapisan: {vonis.lapisan} · otak v{vonis.versi}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    eksekusi: <span className="font-bold text-zinc-200">{vonis.eksekusi.aksi === 'WAIT' ? 'order menunggu konfirmasi' : 'masuk langsung'}</span>
                    {' '}· target {vonis.eksekusi.targetPct}% · stop {vonis.eksekusi.stopPct.toFixed(1)}%{vonis.eksekusi.triggerLevel ? ` · trigger ${vonis.eksekusi.triggerLevel.toFixed(2)}` : ''}
                  </p>
                </div>

                {/* 8 dimensi bukti — muncul berjenjang */}
                <div className="space-y-1.5">
                  {vonis.bukti.map((b, i) => {
                    const tone = voteTone(b.vote)
                    return (
                      <div
                        key={b.id}
                        className={`rounded-lg border px-3 py-2 ${tone.border} ${tone.bg}`}
                        style={{ animation: `arah-muncul 0.45s ease-out ${i * 0.14}s both` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={tone.teks}>{DIM_ICON[b.id]}</span>
                          <span className="text-[11px] font-bold text-zinc-200">{b.id} {b.label}</span>
                          <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-black ${tone.teks} border ${tone.border}`}>{tone.label}</span>
                          <span className="w-14 shrink-0">
                            <span className="block h-1 overflow-hidden rounded-full bg-zinc-800">
                              <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(b.kekuatan * 100)}%`, animation: `arah-bar 0.5s ease-out ${i * 0.14 + 0.15}s both` }} />
                            </span>
                          </span>
                          <span className="w-8 shrink-0 text-right font-mono text-[9px] text-zinc-500">{(b.kekuatan * 100).toFixed(0)}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-zinc-500">{b.cara}</p>
                      </div>
                    )
                  })}
                </div>

                {/* buka tirai horizon */}
                {tahap === 'vonis' ? (
                  <button
                    onClick={bukaTirai}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                  >
                    <Eye className="h-4 w-4" /> Buka tirai horizon — vonis diadili pasar
                  </button>
                ) : (
                  ledger && <VonisAkhir exam={exam!} vonis={vonis} ledger={ledger} onUlang={ulang} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes arah-muncul { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes arah-bar { from { width: 0; } }
      `}</style>
    </div>
  )
}

// ---------- gauge kepastian (SVG arc) ----------
function GaugeKepastian({ nilai }: { nilai: number }) {
  const R = 30
  const C = Math.PI * R // setengah lingkaran
  const isi = (nilai / 100) * C
  const warna = nilai >= 80 ? '#34d399' : nilai >= 65 ? '#fbbf24' : '#fb7185'
  return (
    <div className="shrink-0 text-center">
      <svg width="76" height="46" viewBox="0 0 76 46">
        <path d={`M 8 42 A ${R} ${R} 0 0 1 68 42`} fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
        <path
          d={`M 8 42 A ${R} ${R} 0 0 1 68 42`}
          fill="none"
          stroke={warna}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${isi} ${C}`}
          style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
        />
        <text x="38" y="38" textAnchor="middle" fill="#f4f4f5" fontSize="15" fontWeight="800" fontFamily="ui-monospace, monospace">{nilai}</text>
      </svg>
      <p className="-mt-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">kepastian</p>
    </div>
  )
}

// ---------- vonis akhir: benar/salah + net P/L ----------
function VonisAkhir({ exam, vonis, ledger, onUlang }: { exam: KlExam; vonis: VonisArah; ledger: KlLedger; onUlang: () => void }) {
  const benar = vonis.arah === exam.truth
  const net = ledger.netPct ?? 0
  const noTrade = ledger.mode === 'NO-TRADE'
  return (
    <div className={`rounded-xl border p-4 ${benar ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-rose-500/40 bg-rose-500/[0.07]'}`}>
      <div className="flex items-center gap-3">
        <span className={`rounded-lg px-3 py-1.5 text-sm font-black ${benar ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950'}`}>
          {benar ? 'ARAH BENAR' : 'ARAH SALAH'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-400">
            truth pasar <span className="font-bold text-zinc-200">{exam.truth}</span> · vonis <span className="font-bold text-zinc-200">{vonis.vonis}</span>
            {noTrade && ' · order trigger tak tersentuh → NO-TRADE (dievaluasi jujur)'}
          </p>
          <p className={`font-mono text-lg font-black ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            NET {net >= 0 ? '+' : ''}{net.toFixed(2)}%
            <span className="ml-2 text-[10px] font-normal text-zinc-500">setelah fee buy + sell 0.2%</span>
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono text-[10px] text-zinc-500">
        <div className="rounded border border-zinc-800 py-1">entry {exam.entry.toFixed(2)}</div>
        <div className="rounded border border-zinc-800 py-1">exit {(ledger.exit ?? 0).toFixed(2)}</div>
        <div className="rounded border border-zinc-800 py-1">{ledger.stopHit ? 'STOP TERSentuh' : ledger.targetHit ? 'TARGET TERCAPAI' : 'EXIT AKHIR HORIZON'}</div>
      </div>
      <button
        onClick={onUlang}
        className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-500"
      >
        <RefreshCcw className="h-3.5 w-3.5" /> Skenario lain
      </button>
    </div>
  )
}
