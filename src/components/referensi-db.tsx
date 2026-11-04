'use client'

import { useMemo, useState } from 'react'
import { PAPERS } from '@/data/papers'
import { CAT_COLOR, CAT_LABEL, usePaperDialog, PaperDetail } from './paper-ref'
import type { PaperCategory } from '@/lib/types'
import { Search, ExternalLink, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'

const CATS: PaperCategory[] = ['definisi', 'arsitektur', 'bukti', 'benchmark', 'safety']

export function ReferensiDB() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<PaperCategory | 'semua'>('semua')
  const { open } = usePaperDialog()

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return PAPERS.filter((p) => {
      if (cat !== 'semua' && p.category !== cat) return false
      if (!needle) return true
      return (
        p.title.toLowerCase().includes(needle) ||
        p.authors.toLowerCase().includes(needle) ||
        p.venue.toLowerCase().includes(needle) ||
        String(p.year).includes(needle) ||
        p.claim.toLowerCase().includes(needle)
      )
    })
  }, [q, cat])

  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari paper: judul, penulis, tahun, kata kunci… (mis. 'JEPA', '2025', 'Hutter')"
            className="pl-9 bg-zinc-900/70 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={cat === 'semua'} onClick={() => setCat('semua')} label={`Semua (${PAPERS.length})`} />
          {CATS.map((c) => (
            <FilterChip
              key={c}
              active={cat === c}
              onClick={() => setCat(c)}
              label={`${CAT_LABEL[c]} (${PAPERS.filter((p) => p.category === c).length})`}
              color={CAT_COLOR[c]}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.map((p) => {
          const color = CAT_COLOR[p.category]
          const isOpen = expanded === p.id
          return (
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors hover:border-zinc-700">
              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="w-full text-left p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                    style={{ color, borderColor: color + '55', background: color + '12' }}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {CAT_LABEL[p.category]}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">{p.year} · {p.venue}</span>
                </div>
                <h5 className="text-sm font-semibold text-zinc-100 leading-snug">{p.title}</h5>
                <p className="text-xs text-zinc-500 mt-1">{p.authors}</p>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-3.5">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Klaim kunci</p>
                    <p className="text-xs leading-relaxed text-zinc-300">{p.claim}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Buka sumber
                      </a>
                    )}
                    <button
                      onClick={() => open(p.id)}
                      className="text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:underline"
                    >
                      Buka di dialog referensi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-10 border border-dashed border-zinc-800 rounded-xl">
            Tidak ada paper yang cocok dengan pencarian &ldquo;{q}&rdquo;.
          </p>
        )}
      </div>

      {/* dialog disembunyikan — cukup provider global */}
      <PaperDetailHidden />
    </div>
  )
}

function PaperDetailHidden() {
  return null
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'border-transparent text-zinc-950' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
      }`}
      style={active ? { background: color ?? '#e4e4e7' } : {}}
    >
      {label}
    </button>
  )
}
