'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, Swords, Sparkles, Bot, Loader2, RefreshCw } from 'lucide-react'

function Markdown({ text, tone }: { text: string; tone: 'amber' | 'plain' }) {
  return (
    <div className={`text-sm leading-relaxed ${tone === 'amber' ? 'text-zinc-100 [&_strong]:text-amber-200 [&_strong]:font-bold' : 'text-zinc-300 [&_strong]:text-sky-200'} [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:hidden [&_h2]:hidden [&_h3]:mt-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wider [&_p]:my-1.5`}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}

interface Turn {
  question: string
  cyborg: string
  plain: string | null
  sources: { title: string; url: string }[]
  at: string
}

const CONTOH = [
  'Koin apa yang paling layak dibeli hari ini dan kenapa?',
  'Bagaimana kondisi rezim pasar crypto sekarang?',
  'Berita terbaru apa yang menggerakkan pasar crypto?',
  'Kapan sebaiknya aku SELL posisiku?',
  'Bandingkan SOL vs BNB untuk minggu ini',
]

export function GuruChat() {
  const [input, setInput] = useState('')
  const [duel, setDuel] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])

  const ask = async (q: string) => {
    const question = q.trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, duel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menjawab')
      setTurns((t) => [
        { question, cyborg: data.cyborg, plain: data.plain, sources: data.sources ?? [], at: new Date().toISOString() },
        ...t,
      ])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* kontrol */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Mode pertanyaan:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDuel(false)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${!duel ? 'border-amber-500/60 bg-amber-500/15 text-amber-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
          >
            Guru saja
          </button>
          <button
            onClick={() => setDuel(true)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${duel ? 'border-rose-500/60 bg-rose-500/15 text-rose-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
          >
            <Swords className="h-3.5 w-3.5" />
            DUEL ILMU: MICAPROFITA vs AI Umum
          </button>
        </div>
      </div>

      {/* input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(input) }}
          placeholder="Tanya gurumu… (hanya dunia kripto)"
          className="h-11 bg-zinc-900/80 border-zinc-800"
          disabled={busy}
        />
        <Button onClick={() => ask(input)} disabled={busy || !input.trim()} className="h-11 px-4 bg-amber-500 text-black hover:bg-amber-400">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* contoh */}
      <div className="flex flex-wrap gap-1.5">
        {CONTOH.map((c) => (
          <button
            key={c}
            onClick={() => ask(c)}
            disabled={busy}
            className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* jawaban */}
      {turns.map((t, i) => (
        <div key={i} className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pertanyaan</p>
            <p className="mt-1 text-sm text-zinc-200">{t.question}</p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-bold text-amber-300">MICAPROFITA</span>
              <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">guru + doktrin + data hidup</Badge>
            </div>
            <div className="text-sm leading-relaxed text-zinc-100"><Markdown text={t.cyborg} tone="amber" /></div>
            {t.sources.length > 0 && (
              <div className="mt-3 border-t border-amber-500/20 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70">Sumber berita hidup</p>
                <ul className="mt-1 space-y-0.5">
                  {t.sources.slice(0, 4).map((s, j) => (
                    <li key={j} className="truncate text-[11px] text-zinc-400">
                      <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-amber-300">{s.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {t.plain !== null && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-amber-500/30 bg-zinc-900/60 p-4">
                <p className="mb-1.5 text-xs font-bold text-amber-300">MICAPROFITA (cyborg)</p>
                <Markdown text={t.cyborg} tone="amber" />
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-zinc-900/60 p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-sky-300">
                  <RefreshCw className="h-3 w-3" /> AI Umum (tanpa doktrin, tanpa data hidup)
                </p>
                <Markdown text={t.plain ?? ''} tone="plain" />
              </div>
              <p className="text-[11px] text-zinc-500 md:col-span-2">
                Nilai sendiri kedalaman keduanya — cyborg membaca pasar hidup Binance, doktrin dari kegagalan nyata, dan pola pemenang rival.
              </p>
            </div>
          )}
        </div>
      ))}

      {turns.length === 0 && !busy && (
        <p className="py-6 text-center text-xs text-zinc-600">
          Guru siap. Ajukan pertanyaan kripto pertamamu — jawaban selalu berbasis data & doktrin.
        </p>
      )}
    </div>
  )
}
