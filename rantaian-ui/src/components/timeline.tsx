'use client'

import { useState, useMemo } from 'react'
import { KRONOLOGI_EVENTS } from '@/data/mod-kronologi'
import type { TimelineEvent } from '@/lib/types'
import { PaperChip } from './paper-ref'
import { ChevronDown } from 'lucide-react'

const TAG_STYLE: Record<TimelineEvent['tag'], { c: string; label: string }> = {
  fondasi: { c: '#fbbf24', label: 'Fondasi' },
  simbolik: { c: '#a78bfa', label: 'Simbolik' },
  koneksi: { c: '#38bdf8', label: 'Koneksionis' },
  hibrida: { c: '#34d399', label: 'Hibrida/WM' },
  frontier: { c: '#fb7185', label: 'Frontier' },
}

export function TimelineView() {
  const [filter, setFilter] = useState<string>('semua')

  const tags = useMemo(() => ['semua', ...Object.keys(TAG_STYLE)], [])
  const events = useMemo(
    () => (filter === 'semua' ? KRONOLOGI_EVENTS : KRONOLOGI_EVENTS.filter((e) => e.tag === filter)),
    [filter]
  )

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === t
                ? 'border-transparent text-zinc-950'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
            }`}
            style={filter === t ? { background: t === 'semua' ? '#e4e4e7' : TAG_STYLE[t as TimelineEvent['tag']].c } : {}}
          >
            {t === 'semua' ? 'Semua gelombang' : TAG_STYLE[t as TimelineEvent['tag']].label}
          </button>
        ))}
      </div>

      <div className="relative">
        {/* garis vertikal */}
        <div className="absolute left-[15px] md:left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-500/60 via-violet-500/40 to-rose-500/50" />
        <ol className="space-y-5">
          {events.map((ev, i) => {
            const s = TAG_STYLE[ev.tag]
            return (
              <li key={i} className="relative pl-12 md:pl-14">
                {/* titik */}
                <span
                  className="absolute left-[9px] md:left-[13px] top-5 h-[14px] w-[14px] rounded-full border-2 border-zinc-950"
                  style={{ background: s.c, boxShadow: `0 0 12px ${s.c}66` }}
                />
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5 transition-colors hover:border-zinc-700">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold" style={{ color: s.c }}>
                      {ev.year}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                      style={{ color: s.c, borderColor: s.c + '44', background: s.c + '10' }}
                    >
                      {ev.era}
                    </span>
                  </div>
                  <h4 className="font-semibold text-zinc-100 mb-1">{ev.title}</h4>
                  <p className="text-sm leading-relaxed text-zinc-300">{ev.text}</p>
                  {ev.papers && ev.papers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ev.papers.map((p) => (
                        <PaperChip key={p} id={p} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {filter === 'semua' && (
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <ChevronDown className="h-4 w-4" />
          <span>{KRONOLOGI_EVENTS.length} tonggak · 1950-2026 · pola gelombang simbolik ↔ koneksionis ↔ hibrida</span>
        </div>
      )}
    </div>
  )
}
