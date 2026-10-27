// ============================================================
// KORTES LLM — jembatan z-ai-web-dev-sdk (GLM, sekelas z.ai 5.2)
// Hanya boleh jalan di server. Dipakai untuk:
//   1. Rival arena: AI ANALIS yang memilih koin tiap hari
//   2. GURU: mentor trader + web search (update terbaru)
//   3. DUEL ILMU: lawan AI umum (tanpa doktrin cyborg)
//
// TAHAN-BANTING v2 (forensik 2026-10-10):
// Gateway memutar token di config BERKALI-KALI dalam satu sesi
// (bukti: 95 kejadian 401 dalam ~45 menit; mtime config berubah
// beberapa kali). Klien lama memegang token dicabut → 401
// "missing X-Token header". Heal lama (retry tanpa jeda) gagal
// 47 dari 48 kali karena gateway sedang di tengah rotasi.
// Pertahanan berlapis kini:
//   L1 MTIME-GUARD : sebelum tiap pemakaian, mtime config
//      dicek — berubah = klien dibangun ulang OTOMATIS (rotasi
//      terdeteksi sebelum sempat gagal).
//   L2 TTL          : klien > 5 menit dibangun ulang walau
//      mtime diam (jaring pengaman kedua).
//   L3 HEAL+BACKOFF : bila tetap kena 401 (gateway di tengah
//      rotasi), ulang dengan jeda 0→1,5→5→12 dtk — bukan retry
//      instan yang menabrak dinding yang sama.
// ============================================================

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ZAI from 'z-ai-web-dev-sdk'

type Client = NonNullable<Awaited<ReturnType<typeof ZAI.create>>>

interface Box {
  client: Client
  builtAt: number
  cfgMtimeMs: number
}

const g = globalThis as unknown as {
  __arenaZaiBox?: Box
  __arenaZaiBuilding?: Promise<Client> | null
}

const CLIENT_TTL_MS = 5 * 60_000
const CHAT_BACKOFF_MS = [0, 1500, 5000, 12000]
const SEARCH_BACKOFF_MS = [0, 1500, 5000]
// V300-ANTISTUCK — panggilan gateway yang MENGANTUNG (tak pernah balas)
// tidak boleh mematikan arena selamanya. Setiap panggilan diberi batas keras:
// lewat batas = error biasa → backoff jalan → run lanjut / gagal-aman.
const CHAT_TIMEOUT_MS = 60_000
const SEARCH_TIMEOUT_MS = 30_000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null
  return Promise.race([
    p,
    new Promise<never>((_, rej) => {
      t = setTimeout(() => rej(new Error(`${label} melewati batas ${Math.round(ms / 1000)} dtk (gateway menggantung)`)), ms)
    }),
  ]).finally(() => { if (t) clearTimeout(t) })
}

// Jalur config = PRIORITAS SAMA PERSIS dengan SDK (dist/index.js):
// cwd/.z-ai-config → ~/.z-ai-config → /etc/.z-ai-config
function configPaths(): string[] {
  return [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ]
}

/** mtime config aktif; 0 bila tak ada (biarkan TTL yang mengurus). */
async function configMtime(): Promise<number> {
  for (const p of configPaths()) {
    try {
      return (await fs.promises.stat(p)).mtimeMs
    } catch {
      // file tak ada di jalur ini → coba jalur berikut
    }
  }
  return 0
}

/** Ambil klien ZAI yang PASTI segar (mtime-guard + TTL + mutex bangun). */
export async function zai(forceReload = false): Promise<Client> {
  if (forceReload) {
    g.__arenaZaiBox = undefined
    g.__arenaZaiBuilding = null
  }

  const cur = g.__arenaZaiBox
  if (cur) {
    const expiredTtl = Date.now() - cur.builtAt > CLIENT_TTL_MS
    const mtime = await configMtime()
    if (!expiredTtl && mtime === cur.cfgMtimeMs) return cur.client
    g.__arenaZaiBox = undefined // klien basi → bangun ulang
  }

  // Mutex: satu bangunan saja walau banyak request serentak (arena CONC)
  if (g.__arenaZaiBuilding) return g.__arenaZaiBuilding
  const building = ZAI.create()
    .then(async (client) => {
      g.__arenaZaiBox = { client, builtAt: Date.now(), cfgMtimeMs: await configMtime() }
      return client
    })
    .finally(() => {
      g.__arenaZaiBuilding = null
    })
  g.__arenaZaiBuilding = building
  return building
}

/** Error auth dari gateway: config basi / token hilang / token kadaluarsa. */
export function isAuthError(msg: string): boolean {
  return /401|missing X-Token|unauthorized|invalid token|token expired/i.test(msg)
}

/** Kelayakan diulang: rate-limit ATAU error auth (gateway bisa di tengah rotasi). */
function isRetryable(msg: string): boolean {
  return /429|rate|too many/i.test(msg) || isAuthError(msg)
}

/**
 * Jalankan fn dengan klien; bila kena error auth, buang klien basi lalu
 * coba SEKALI lagi instan (lapis pertama). Jika masih gagal, biarkan
 * pemanggil (chat/webSearch) yang mengulang dengan jeda (lapis kedua).
 */
async function withFreshOnAuth<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  try {
    return await fn(await zai())
  } catch (e) {
    if (!isAuthError((e as Error).message)) throw e
    await zai(true) // buang klien basi, baca config segar dari disk
    return await fn(await zai())
  }
}

export async function chat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  let lastErr: Error | null = null
  for (const w of CHAT_BACKOFF_MS) {
    if (w > 0) await new Promise((r) => setTimeout(r, w))
    try {
      const completion = await withTimeout(
        withFreshOnAuth((client) =>
          client.chat.completions.create({
            messages,
            thinking: { type: 'disabled' },
            temperature: opts?.temperature ?? 0.4,
            max_tokens: opts?.maxTokens ?? 900,
          }),
        ),
        CHAT_TIMEOUT_MS,
        'chat LLM',
      )
      const raw = completion as unknown as { choices?: { message?: { content?: string } }[] }
      return raw.choices?.[0]?.message?.content ?? ''
    } catch (e) {
      lastErr = e as Error
      if (!isRetryable(lastErr.message)) break // error lain: langsung lempar
      // auth/rate-limit: ulang dengan jeda berikutnya
    }
  }
  throw lastErr ?? new Error('chat gagal')
}

export interface SearchHit {
  title: string
  snippet: string
  url: string
  date?: string
}

export async function webSearch(query: string, num = 5, recencyDays = 7): Promise<SearchHit[]> {
  for (const w of SEARCH_BACKOFF_MS) {
    if (w > 0) await new Promise((r) => setTimeout(r, w))
    try {
      const raw = (await withTimeout(
        withFreshOnAuth((client) =>
          client.functions.invoke('web_search', {
            query,
            num,
            recency_days: recencyDays,
          }),
        ),
        SEARCH_TIMEOUT_MS,
        'web search',
      )) as unknown
      if (Array.isArray(raw)) {
        return raw.map((r) => {
          const o = r as Record<string, unknown>
          return {
            title: String(o.name ?? o.title ?? ''),
            snippet: String(o.snippet ?? ''),
            url: String(o.url ?? o.link ?? ''),
            date: o.publish_date ? String(o.publish_date) : undefined,
          }
        })
      }
      return []
    } catch (e) {
      if (!isRetryable((e as Error).message)) break // fatal → gagal-aman di bawah
      // auth/rate-limit: ulang dengan jeda berikutnya
    }
  }
  return [] // gagal-aman: pencarian kosong tak boleh meruntuhkan pemanggil
}

/** Ekstrak JSON dari balasan LLM yang kadang dibungkus ```json. */
export function extractJson<T>(text: string): T | null {
  if (!text) return null
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1] : text
  const start = body.search(/[[{]/)
  if (start === -1) return null
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'))
  if (end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
