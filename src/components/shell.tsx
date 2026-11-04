'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { MODULES, PAPERS } from '@/data'
import type { ModuleData } from '@/lib/types'
import { usePaperDialog } from './paper-ref'
import { BlockRenderer } from './blocks'
import { ArenaConsole } from './arena/arena-console'
import { Input } from '@/components/ui/input'
import {
  Compass, Scale, Network, History, Building2, FlaskConical, DraftingCompass, Library,
  Search, FileText, ArrowRight, Menu, X, BrainCircuit, ChevronRight, Swords,
} from 'lucide-react'

const ARENA_MODULE: ModuleData = {
  id: 'pertarungan',
  label: 'Pertarungan',
  short: 'Arena AGI kripto — ujian langsung melawan rival AI: uji, bedah kelemahan, upgrade, tanding lagi',
  tagline: 'Ajang pertarungan AGI kripto: koin harian, arah biner, profit terbesar menang.',
  color: '#f59e0b',
  sections: [],
}

const ALL_MODULES: ModuleData[] = [ARENA_MODULE, ...MODULES]

const ICONS: Record<string, React.ReactNode> = {
  pertarungan: <Swords className="h-4 w-4" />,
  beranda: <Compass className="h-4 w-4" />,
  definisi: <Scale className="h-4 w-4" />,
  arsitektur: <Network className="h-4 w-4" />,
  kronologi: <History className="h-4 w-4" />,
  aktor: <Building2 className="h-4 w-4" />,
  bukti: <FlaskConical className="h-4 w-4" />,
  blueprint: <DraftingCompass className="h-4 w-4" />,
  referensi: <Library className="h-4 w-4" />,
}

interface SearchItem {
  kind: 'section' | 'paper'
  id: string
  moduleId: string
  title: string
  hint: string
}

export function Shell() {
  const [active, setActive] = useState('pertarungan')
  const [query, setQuery] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const { open: openPaper } = usePaperDialog()

  const mod = ALL_MODULES.find((m) => m.id === active)!
  const isArena = mod.id === 'pertarungan'

  // scroll ke atas konten saat ganti modul
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [active])

  const results = useMemo<SearchItem[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const items: SearchItem[] = []
    for (const m of MODULES) {
      for (const s of m.sections) {
        const text = s.blocks
          .filter((b): b is Extract<typeof b, { type: 'paragraph' }> => b.type === 'paragraph')
          .map((b) => b.text)
          .join(' ')
        if (s.title.toLowerCase().includes(q) || text.toLowerCase().includes(q)) {
          items.push({ kind: 'section', id: s.id, moduleId: m.id, title: s.title, hint: m.label })
        }
      }
    }
    for (const p of PAPERS) {
      if (p.title.toLowerCase().includes(q) || p.authors.toLowerCase().includes(q) || String(p.year).includes(q)) {
        items.push({ kind: 'paper', id: p.id, moduleId: 'referensi', title: `${p.title} (${p.year})`, hint: p.authors })
      }
    }
    return items.slice(0, 8)
  }, [query])

  const jumpTo = (item: SearchItem) => {
    setActive(item.moduleId)
    setQuery('')
    setTimeout(() => {
      const el = document.getElementById(item.id)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (item.kind === 'paper') openPaper(item.id)
    }, 120)
  }

  const gotoSection = (secId: string) => {
    document.getElementById(secId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-6">
          <button
            className="lg:hidden rounded-lg border border-zinc-800 p-2 text-zinc-400"
            onClick={() => setNavOpen(!navOpen)}
            aria-label="Buka navigasi"
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight text-zinc-50">MICAPROFITA <span className="text-amber-400">·</span> Arena AGI Kripto</h1>
              <p className="text-[10px] text-zinc-500 leading-tight">Cyborg pemburu profit harian · basis pengetahuan AGI terpadu</p>
            </div>
          </div>

          {/* pencarian global */}
          <div className="relative ml-auto w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari di doktrin & basis pengetahuan…"
              className="pl-9 h-9 bg-zinc-900/80 border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/40"
            />
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden z-50">
                {results.map((r) => (
                  <button
                    key={`${r.kind}-${r.id}`}
                    onClick={() => jumpTo(r)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-zinc-800/70 border-b border-zinc-800/60 last:border-0"
                  >
                    {r.kind === 'paper' ? (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-zinc-200">{r.title}</span>
                      <span className="block truncate text-[10px] text-zinc-500">{r.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-4 md:px-6">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 shrink-0 py-6">
          <nav className="sticky top-20 space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Modul cyborg</p>
            {ALL_MODULES.map((m, i) => {
              const isActive = m.id === active
              return (
                <button
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? 'border-zinc-700 bg-zinc-900'
                      : 'border-transparent hover:bg-zinc-900/60'
                  }`}
                  style={isActive ? { borderLeftColor: m.color, borderLeftWidth: 3 } : { borderLeftWidth: 3, borderLeftColor: 'transparent' }}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: m.color + '1a', color: m.color }}
                  >
                    {ICONS[m.id]}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                      <span className="text-[10px] font-mono text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                      {m.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500 line-clamp-2">{m.short}</span>
                  </span>
                </button>
              )
            })}
            <div className="mt-4 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Statistik</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {ALL_MODULES.length} modul · {MODULES.reduce((a, m) => a + m.sections.length, 0)} seksi doktrin · {PAPERS.length} paper terkurasi
              </p>
            </div>
          </nav>
        </aside>

        {/* Sidebar mobile (drawer) */}
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setNavOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-zinc-800 bg-[#0c0c0f] p-4 overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Modul cyborg</p>
                <button onClick={() => setNavOpen(false)} className="text-zinc-500"><X className="h-4 w-4" /></button>
              </div>
              <nav className="space-y-1">
                {ALL_MODULES.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => { setActive(m.id); setNavOpen(false) }}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ${
                      m.id === active ? 'bg-zinc-900' : 'hover:bg-zinc-900/60'
                    }`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: m.color + '1a', color: m.color }}>
                      {ICONS[m.id]}
                    </span>
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                        <span className="text-[10px] font-mono text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                        {m.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{m.short}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Konten */}
        <main ref={contentRef} className="min-w-0 flex-1 py-6 md:py-8 scroll-mt-20">
          {isArena ? (
            <ArenaConsole />
          ) : (
          <>
          {/* header modul */}
          <div className="mb-6 border-b border-zinc-800/80 pb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: mod.color + '1a', color: mod.color }}>
                {ICONS[mod.id]}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
                Modul {String(ALL_MODULES.findIndex((m) => m.id === mod.id) + 1).padStart(2, '0')} / {String(ALL_MODULES.length).padStart(2, '0')}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-50">{mod.label}</h2>
            <p className="mt-2 max-w-3xl text-sm md:text-[15px] leading-relaxed text-zinc-400">{mod.tagline}</p>
            {/* lompat seksi */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {mod.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => gotoSection(s.id)}
                  className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* seksi-seksi */}
          <div className="space-y-10 pb-4">
            {mod.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="mb-4">
                  {s.kicker && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: mod.color }}>
                      {s.kicker}
                    </p>
                  )}
                  <h3 className="text-xl md:text-2xl font-bold text-zinc-50 tracking-tight">{s.title}</h3>
                  <div className="mt-2.5 h-px w-16" style={{ background: mod.color + '88' }} />
                </div>
                <BlockRenderer blocks={s.blocks} />
              </section>
            ))}
          </div>

          {/* navigasi modul */}
          <div className="mt-12 flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-6">
            {(() => {
              const idx = ALL_MODULES.findIndex((m) => m.id === mod.id)
              const prev = ALL_MODULES[idx - 1]
              const next = ALL_MODULES[idx + 1]
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActive(prev.id)} className="group flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-left hover:border-zinc-600 transition-colors">
                      <ArrowRight className="h-4 w-4 rotate-180 text-zinc-500 group-hover:text-zinc-300" />
                      <span>
                        <span className="block text-[10px] text-zinc-600 uppercase tracking-wider">Sebelumnya</span>
                        <span className="block text-xs font-semibold text-zinc-300">{prev.label}</span>
                      </span>
                    </button>
                  ) : <span />}
                  {next && (
                    <button onClick={() => setActive(next.id)} className="group flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-right hover:border-zinc-600 transition-colors ml-auto">
                      <span>
                        <span className="block text-[10px] text-zinc-600 uppercase tracking-wider">Berikutnya</span>
                        <span className="block text-xs font-semibold text-zinc-300">{next.label}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                    </button>
                  )}
                </>
              )
            })()}
          </div>
          </>
          )}
        </main>
      </div>

      {/* ================= FOOTER (sticky) ================= */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-[#0b0b0e]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-5 md:flex-row md:px-6">
          <p className="text-xs text-zinc-500 text-center md:text-left">
            <span className="font-semibold text-zinc-400">MICAPROFITA — Arena AGI Kripto</span> · arah biner BUY/SELL · data hidup Binance · evolusi tanpa henti · guru para trader.
          </p>
          <p className="text-[11px] text-zinc-600">
            {PAPERS.length} paper doktrin · arena dinilai per candle UTC · bukan nasihat keuangan
          </p>
        </div>
      </footer>
    </div>
  )
}
