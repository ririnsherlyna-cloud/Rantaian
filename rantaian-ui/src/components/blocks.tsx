'use client'

import type { Block } from '@/lib/types'
import { PaperStrip } from './paper-ref'
import { TimelineView } from './timeline'
import { OrgCards, PeopleCards } from './aktor'
import { BlueprintDiagram } from './blueprint-diagram'
import { ReferensiDB } from './referensi-db'
import { Quote, Info } from 'lucide-react'

const TONE: Record<string, { border: string; bg: string; text: string }> = {
  amber: { border: 'border-amber-500/40', bg: 'bg-amber-500/5', text: 'text-amber-400' },
  emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  rose: { border: 'border-rose-500/40', bg: 'bg-rose-500/5', text: 'text-rose-400' },
  violet: { border: 'border-violet-500/40', bg: 'bg-violet-500/5', text: 'text-violet-400' },
  teal: { border: 'border-teal-500/40', bg: 'bg-teal-500/5', text: 'text-teal-400' },
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <SingleBlock key={i} block={b} />
      ))}
    </div>
  )
}

function SingleBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      if (block.text === 'TIMELINE_COMPONENT') return <TimelineView />
      if (block.text === 'AKTOR_ORGS_COMPONENT') return <OrgCards />
      if (block.text === 'AKTOR_PEOPLE_COMPONENT') return <PeopleCards />
      if (block.text === 'BLUEPRINT_DIAGRAM_COMPONENT') return <BlueprintDiagram />
      if (block.text === 'REFERENSI_DB_COMPONENT') return <ReferensiDB />
      return (
        <p className="text-[15px] leading-[1.85] text-zinc-300">
          {block.text}
        </p>
      )

    case 'heading':
      return <h4 className="text-lg font-semibold text-zinc-100 pt-2">{block.text}</h4>

    case 'list':
      return block.ordered ? (
        <ol className="space-y-2.5 list-none">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.75] text-zinc-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.75] text-zinc-300">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )

    case 'quote':
      return (
        <blockquote className="relative rounded-xl border border-zinc-700/70 bg-zinc-900/80 p-5 pl-12">
          <Quote className="absolute left-4 top-5 h-5 w-5 text-amber-400/70" />
          <p className="text-[15px] italic leading-relaxed text-zinc-200">&ldquo;{block.text}&rdquo;</p>
          <footer className="mt-2.5 text-xs text-zinc-500">— {block.source}</footer>
        </blockquote>
      )

    case 'callout': {
      const t = TONE[block.tone] ?? TONE.amber
      return (
        <div className={`rounded-xl border ${t.border} ${t.bg} p-5`}>
          <p className={`flex items-center gap-2 text-sm font-bold mb-2 ${t.text}`}>
            <Info className="h-4 w-4" />
            {block.title}
          </p>
          <p className="text-sm leading-[1.8] text-zinc-300">{block.text}</p>
        </div>
      )
    }

    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-zinc-900">
                {block.headers.map((h, i) => (
                  <th key={i} className="border-b border-zinc-800 px-4 py-3 text-left font-semibold text-amber-400/90 text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="bg-zinc-950/40 even:bg-zinc-900/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="border-b border-zinc-800/70 px-4 py-3 align-top leading-relaxed text-zinc-300">
                      {ci === 0 ? <span className="font-medium text-zinc-100">{cell}</span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'papers':
      return <PaperStrip ids={block.ids} />

    case 'stats':
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((s, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-2xl font-extrabold tracking-tight text-amber-400">{s.value}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}
