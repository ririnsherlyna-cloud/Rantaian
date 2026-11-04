'use client'

import { useState } from 'react'
import { BLUEPRINT_NODES } from '@/data/mod-blueprint'
import { paperById } from '@/data/papers'
import { usePaperDialog } from './paper-ref'
import { ArrowDown, Shield, Brain, Globe, Database, Sparkles, Compass, Gauge, ChevronRight } from 'lucide-react'

const NODE_ICON: Record<string, React.ReactNode> = {
  persepsi: <Globe className="h-4 w-4" />,
  worldmodel: <Globe className="h-4 w-4" />,
  memori: <Database className="h-4 w-4" />,
  reasoning: <Brain className="h-4 w-4" />,
  planning: <Compass className="h-4 w-4" />,
  metakognisi: <Gauge className="h-4 w-4" />,
  safety: <Shield className="h-4 w-4" />,
}

const NODE_COLOR: Record<string, string> = {
  persepsi: '#38bdf8',
  worldmodel: '#34d399',
  memori: '#a78bfa',
  reasoning: '#fb7185',
  planning: '#f59e0b',
  metakognisi: '#fbbf24',
  safety: '#e4e4e7',
}

function NodeCard({ id, selected, onSelect }: { id: string; selected: string | null; onSelect: (id: string) => void }) {
  const node = BLUEPRINT_NODES.find((n) => n.id === id)!
  const color = NODE_COLOR[id]
  const isSel = selected === id
  return (
    <button
      onClick={() => onSelect(id)}
      className={`group w-full text-left rounded-xl border p-4 transition-all duration-200 ${
        isSel ? 'bg-zinc-800/80 shadow-lg scale-[1.01]' : 'bg-zinc-900/70 hover:bg-zinc-800/60'
      }`}
      style={{
        borderColor: isSel ? color : 'rgba(63,63,70,0.8)',
        boxShadow: isSel ? `0 0 20px ${color}33` : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: color + '1f', color }}
        >
          {NODE_ICON[id]}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-zinc-100 leading-tight">{node.label}</p>
          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">Lapisan {node.layer} · AGI-G1</p>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-zinc-400 line-clamp-2">{node.desc}</p>
    </button>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-0.5">
      <ArrowDown className="h-4 w-4 text-zinc-600" />
      <span className="text-[10px] text-zinc-600 font-mono">{label}</span>
    </div>
  )
}

export function BlueprintDiagram() {
  const [selected, setSelected] = useState<string | null>('worldmodel')
  const { open } = usePaperDialog()
  const node = selected ? BLUEPRINT_NODES.find((n) => n.id === selected) : null
  const color = selected ? NODE_COLOR[selected] : '#f59e0b'

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h4 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Diagram Arsitektur AGI-G1 — komposit 7 komponen
        </h4>
        <p className="text-[11px] text-zinc-500">Klik komponen untuk membuka detail bukti, teknologi & gap</p>
      </div>

      {/* Desktop: dua kolom alur + safety band */}
      <div className="hidden md:grid grid-cols-[1fr_28px_1fr_44px] gap-x-3">
        {/* kolom alur persepsi */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400/80 mb-2 text-center">Alur Persepsi → Aksi</p>
          <NodeCard id="persepsi" selected={selected} onSelect={setSelected} />
          <Arrow label="embedding" />
          <NodeCard id="worldmodel" selected={selected} onSelect={setSelected} />
          <Arrow label="prediksi" />
          <NodeCard id="planning" selected={selected} onSelect={setSelected} />
        </div>

        {/* jalur silang */}
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="h-16 w-px bg-gradient-to-b from-sky-400/40 to-emerald-400/40" />
          <span className="text-[9px] text-zinc-600 font-mono [writing-mode:vertical-rl]">simulasi ↔ hipotesis</span>
          <div className="h-16 w-px bg-gradient-to-b from-rose-400/40 to-amber-400/40" />
        </div>

        {/* kolom alur kognisi */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80 mb-2 text-center">Alur Kognisi → Belajar</p>
          <NodeCard id="memori" selected={selected} onSelect={setSelected} />
          <Arrow label="konteks" />
          <NodeCard id="reasoning" selected={selected} onSelect={setSelected} />
          <Arrow label="ketidakpastian" />
          <NodeCard id="metakognisi" selected={selected} onSelect={setSelected} />
        </div>

        {/* safety band */}
        <div
          className="rounded-xl border border-zinc-700 bg-zinc-900/80 flex items-center justify-center gap-3 py-4"
          role="presentation"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-zinc-400 [writing-mode:vertical-rl]">
            Safety &amp; Alignment Layer — menjangkau semua komponen
          </span>
        </div>
      </div>

      {/* Mobile: satu kolom */}
      <div className="md:hidden space-y-1">
        <NodeCard id="persepsi" selected={selected} onSelect={setSelected} />
        <Arrow label="embedding" />
        <NodeCard id="worldmodel" selected={selected} onSelect={setSelected} />
        <Arrow label="konteks / prediksi" />
        <NodeCard id="memori" selected={selected} onSelect={setSelected} />
        <Arrow label="hipotesis" />
        <NodeCard id="reasoning" selected={selected} onSelect={setSelected} />
        <Arrow label="ketidakpastian" />
        <NodeCard id="metakognisi" selected={selected} onSelect={setSelected} />
        <Arrow label="rencana" />
        <NodeCard id="planning" selected={selected} onSelect={setSelected} />
        <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 mt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-zinc-400">Safety &amp; Alignment Layer — menjangkau semua komponen</span>
        </div>
      </div>

      {/* Panel detail */}
      {node && (
        <div
          className="mt-5 rounded-xl border p-5 bg-zinc-900/80"
          style={{ borderColor: color + '55' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: color + '1f', color }}>
              {NODE_ICON[node.id]}
            </span>
            <div>
              <h5 className="font-bold text-zinc-50">{node.label}</h5>
              <p className="text-[11px] text-zinc-500">Lapisan {node.layer} · asal keluarga: {node.papers?.length ?? 0} paper rujukan</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailBlock title="Deskripsi" text={node.desc} />
            <DetailBlock title="Fungsi dalam sistem" text={node.fungsi} />
            <DetailBlock title="Bukti literatur" text={node.bukti} />
            <DetailBlock title="Teknologi yang tersedia (prototipe)" text={node.teknologi} />
            <DetailBlock title="Risiko & gap" text={node.gap} tone="rose" />
          </div>
          {node.papers && node.papers.length > 0 && (
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Paper rujukan</p>
              <div className="flex flex-wrap gap-1.5">
                {node.papers.map((pid) => {
                  const p = paperById(pid)
                  if (!p) return null
                  return (
                    <button
                      key={pid}
                      onClick={() => open(pid)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                      {p.title} ({p.year}) <ChevronRight className="h-3 w-3" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailBlock({ title, text, tone }: { title: string; text: string; tone?: 'rose' }) {
  return (
    <div className={`rounded-lg border p-3.5 ${tone === 'rose' ? 'border-rose-500/30 bg-rose-500/5' : 'border-zinc-800 bg-zinc-800/30'}`}>
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 ${tone === 'rose' ? 'text-rose-400' : 'text-zinc-500'}`}>
        {title}
      </p>
      <p className="text-xs leading-relaxed text-zinc-300">{text}</p>
    </div>
  )
}
