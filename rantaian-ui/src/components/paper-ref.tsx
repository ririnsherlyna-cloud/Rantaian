'use client'

import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { PAPERS, paperById } from '@/data/papers'
import type { Paper, PaperCategory } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FileText, ExternalLink, BookOpen } from 'lucide-react'

// ---------- kategori warna ----------
export const CAT_COLOR: Record<PaperCategory, string> = {
  definisi: '#fbbf24',
  arsitektur: '#34d399',
  bukti: '#fb7185',
  benchmark: '#38bdf8',
  safety: '#a78bfa',
}

export const CAT_LABEL: Record<PaperCategory, string> = {
  definisi: 'Definisi',
  arsitektur: 'Arsitektur',
  bukti: 'Bukti',
  benchmark: 'Benchmark',
  safety: 'Safety',
}

// ---------- context untuk buka dialog paper dari mana pun ----------
interface PaperDialogCtx {
  open: (id: string) => void
}
const Ctx = createContext<PaperDialogCtx>({ open: () => {} })

export function usePaperDialog() {
  return useContext(Ctx)
}

export function PaperDialogProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const paper = activeId ? paperById(activeId) : undefined

  const open = useCallback((id: string) => setActiveId(id), [])

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Dialog open={!!paper} onOpenChange={(v) => !v && setActiveId(null)}>
        <DialogContent className="max-w-xl bg-zinc-900/95 border-zinc-700/80 text-zinc-100">
          {paper && <PaperDetail paper={paper} />}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  )
}

export function PaperDetail({ paper }: { paper: Paper }) {
  const color = CAT_COLOR[paper.category]
  return (
    <div>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border"
            style={{ color, borderColor: color + '55', background: color + '14' }}
          >
            <BookOpen className="h-3 w-3 mr-1" />
            {CAT_LABEL[paper.category]}
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">{paper.year}</span>
        </div>
        <DialogTitle className="text-left text-lg leading-snug text-zinc-50">{paper.title}</DialogTitle>
        <DialogDescription className="text-left text-zinc-400">
          {paper.authors} · {paper.venue}
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-semibold">Klaim kunci</p>
        <p className="text-sm leading-relaxed text-zinc-200">{paper.claim}</p>
      </div>
      {paper.url && (
        <a
          href={paper.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color }}
        >
          <ExternalLink className="h-4 w-4" /> Buka sumber paper
        </a>
      )}
    </div>
  )
}

// ---------- chip inline ----------
export function PaperChip({ id }: { id: string }) {
  const { open } = usePaperDialog()
  const paper = paperById(id)
  if (!paper) return null
  const color = CAT_COLOR[paper.category]
  return (
    <button
      onClick={() => open(id)}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors align-middle mx-0.5 my-0.5"
      style={{ color, borderColor: color + '44', background: color + '0f' }}
      title={`${paper.title} (${paper.year})`}
    >
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {paper.title.length > 44 ? paper.title.slice(0, 44) + '…' : paper.title} ({paper.year})
      </span>
    </button>
  )
}

// ---------- strip daftar paper ----------
export function PaperStrip({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {ids.map((id) => (
        <PaperChip key={id} id={id} />
      ))}
    </div>
  )
}

// ---------- grid semua paper (untuk dialog "lihat semua") ----------
export function AllPapersGrid({ ids }: { ids: string[] }) {
  const list = useMemo(() => PAPERS.filter((p) => ids.includes(p.id)), [ids])
  return (
    <div className="grid gap-2">
      {list.map((p) => (
        <PaperChip key={p.id} id={p.id} />
      ))}
    </div>
  )
}
