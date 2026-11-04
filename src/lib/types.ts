// Shared types untuk AGI Knowledge Base

export interface Paper {
  id: string
  title: string
  authors: string
  year: number
  venue: string
  url?: string
  claim: string
  category: PaperCategory
}

export type PaperCategory =
  | 'definisi'
  | 'arsitektur'
  | 'bukti'
  | 'benchmark'
  | 'safety'

export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'quote'; text: string; source: string }
  | { type: 'callout'; title: string; text: string; tone: 'amber' | 'emerald' | 'rose' | 'violet' | 'teal' }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'papers'; ids: string[] }
  | { type: 'stats'; items: { value: string; label: string }[] }

export interface Section {
  id: string
  title: string
  kicker?: string
  blocks: Block[]
}

export interface ModuleData {
  id: string
  label: string
  short: string
  tagline: string
  color: string // tailwind-ish hex untuk aksen modul
  sections: Section[]
}

// ---------- Kronologi ----------
export interface TimelineEvent {
  year: string
  era: string
  title: string
  text: string
  tag: 'fondasi' | 'simbolik' | 'koneksi' | 'hibrida' | 'frontier'
  papers?: string[]
}

// ---------- Aktor ----------
export interface Org {
  name: string
  hq: string
  people: string
  focus: string
  stance: string
  scale: string
  color: string
}

export interface Person {
  name: string
  role: string
  org: string
  thesis: string
  notable: string
}

// ---------- Blueprint ----------
export interface BlueprintNode {
  id: string
  label: string
  layer: number
  desc: string
  fungsi: string
  bukti: string
  teknologi: string
  gap: string
  papers?: string[]
}
