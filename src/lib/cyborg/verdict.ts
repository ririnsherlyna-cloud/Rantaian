// ============================================================
// VONIS LLM (UPGRADE V3) — lapisan kecerdasan AI di atas otak kuant.
//
// Bukti UJIAN #7: otak kuant buta terhadap dunia di luar candle —
// berita hack/delisting/unlock bisa membunuh pick yang secara teknis
// "sempurna". Lapisan ini membaca berita TERBARU (web search) per
// kandidat lalu GLM memberi vonis:
//   KONFIRMASI  → pick berdiri (bukti turut dikirim ke briefing)
//   PERINGATAN  → pick berdiri tapi keyakinan dipangkas + catatan
//   VETO        → pick dicabut SEBELUM tersimpan, digantian kandidat
//                 terbaik berikutnya dari antrian (event dicatat)
// Jujur secara epistemik: vonis HANYA untuk hari hidup — hari historis
// tidak boleh memakai berita hari ini (itu kebocoran). Hari historis
// tetap murni kuant, dan itu dinyatakan terbuka di UI.
// ============================================================

import { chat, extractJson, webSearch } from './llm'

export type VerdictKind = 'KONFIRMASI' | 'PERINGATAN' | 'VETO' | 'TANPA_VONIS'

export interface VonisInput {
  symbol: string
  confidence: number
  topReasons: string[]
}

export interface PickVerdict {
  symbol: string
  verdict: VerdictKind
  note: string
  sourceCount: number
  checkedAt: string
}

interface RawVerdict { verdict?: string; note?: string }

const RISKY = /(hack|exploit|breach|delist|delisting|sue|lawsuit|fraud|insolven|halt|freeze|raid|scam|unlock|sec |cftc|flash crash)/i

/** Vonis untuk pick hari hidup (unik per simbol, maks 4). */
export async function vonisLivePicks(
  inputs: VonisInput[],
  regimeNote: string,
): Promise<Map<string, PickVerdict>> {
  const out = new Map<string, PickVerdict>()
  const uniq = inputs.filter((p, i, arr) => arr.findIndex((x) => x.symbol === p.symbol) === i).slice(0, 4)
  const results = await Promise.all(uniq.map(async (p) => {
    const v = await vonisSatu(p, regimeNote)
    return [p.symbol, v] as const
  }))
  for (const [sym, v] of results) out.set(sym, v)
  return out
}

async function vonisSatu(pick: VonisInput, regimeNote: string): Promise<PickVerdict> {
  const at = new Date().toISOString()
  const base = pick.symbol.replace(/USDT$/, '')
  const fallback: PickVerdict = {
    symbol: pick.symbol, verdict: 'TANPA_VONIS',
    note: 'Pita berita tidak terjangkau saat ini — vonis kuant berdiri tanpa pemeriksaan berita.',
    sourceCount: 0, checkedAt: at,
  }
  try {
    const hits = await webSearch(`${base} crypto news`, 5, 3)
    const risky = hits.filter((h) => RISKY.test(`${h.title} ${h.snippet}`))
    const headlines = hits.slice(0, 5)
      .map((h, i) => `${i + 1}. [${h.date ?? 'baru'}] ${h.title} — ${h.snippet.slice(0, 160)}`)
      .join('\n')
    if (!hits.length) {
      return { symbol: pick.symbol, verdict: 'KONFIRMASI', note: 'Tidak ada pita berita risiko dalam 3 hari terakhir — sinyal teknis berdiri sendiri.', sourceCount: 0, checkedAt: at }
    }
    const sys = `Anda penilai risiko trading kripto yang TAJAM dan JUJUR. Tugas: menilai apakah berita terbaru membahayakan posisi BUY 1 hari pada koin tertentu. Kriteria VETO: hack/exploit, delisting, gugatan hukum, insolvensi, trading halt, scam — hal yang bisa menjatuhkan harga hari ini. Kriteria PERINGATAN: risiko terukur (unlock token, noise regulasi, overheat ekstrem) tapi tidak mematikan. Selain itu KONFIRMASI. Jawab HANYA JSON: {"verdict":"KONFIRMASI|PERINGATAN|VETO","note":"maks 20 kata, bahasa Indonesia"}.`
    const usr = `REZIM: ${regimeNote}\nKEPUTUSAN KUANT: BUY ${pick.symbol}, keyakinan ${Math.round(pick.confidence)}%. Bukti teknis: ${pick.topReasons.slice(0, 3).join('; ')}.\nBERITA 3 HARI TERAKHIR:\n${headlines}`
    const raw = await chat([
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ], { temperature: 0.2, maxTokens: 220 })
    const parsed = extractJson<RawVerdict>(raw)
    const v = (parsed?.verdict ?? '').toUpperCase()
    let kind: VerdictKind = 'KONFIRMASI'
    if (v === 'VETO') kind = 'VETO'
    else if (v === 'PERINGATAN') kind = 'PERINGATAN'
    else if (v !== 'KONFIRMASI' && risky.length >= 2) kind = 'PERINGATAN' // regex menangkap risiko, LLM tak tegas
    const note = (parsed?.note ?? (risky.length ? `${risky.length} pita berita berisiko terdeteksi` : 'Tidak ada risiko berita yang menonjol')).slice(0, 160)
    return { symbol: pick.symbol, verdict: kind, note, sourceCount: hits.length, checkedAt: at }
  } catch {
    return fallback
  }
}

/** Terapkan vonis: VETO dicabut, PERINGATAN memangkas keyakinan. */
export function applyVonis<T extends { symbol: string; confidence: number; evidence: Record<string, unknown> }>(
  items: T[],
  vonis: Map<string, PickVerdict>,
): { kept: T[]; vetoed: { symbol: string; note: string }[]; warned: { symbol: string; note: string }[] } {
  const kept: T[] = []
  const vetoed: { symbol: string; note: string }[] = []
  const warned: { symbol: string; note: string }[] = []
  for (const it of items) {
    const v = vonis.get(it.symbol)
    if (!v) { kept.push(it); continue }
    it.evidence.verdict = { kind: v.verdict, note: v.note, sources: v.sourceCount, at: v.checkedAt }
    if (v.verdict === 'VETO') vetoed.push({ symbol: it.symbol, note: v.note })
    else {
      if (v.verdict === 'PERINGATAN') {
        warned.push({ symbol: it.symbol, note: v.note })
        it.confidence = Math.max(35, it.confidence - 15)
      }
      kept.push(it)
    }
  }
  return { kept, vetoed, warned }
}
