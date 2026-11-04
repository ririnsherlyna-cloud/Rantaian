// ============================================================
// V304-TELEGRAM — GERBANG API BOT (lidah otak MICAPROFITA)
// Token HANYA dibaca dari .token-telegram (chmod 600) atau env —
// tak pernah di-hardcode, tak pernah ditulis ke log.
// ============================================================
import { readFileSync } from 'fs'
import { join } from 'path'

export function bacaTokenTg(): string {
  const envTok = process.env.TELEGRAM_BOT_TOKEN
  if (envTok && envTok.trim()) return envTok.trim()
  try {
    return readFileSync(join(process.cwd(), '.token-telegram'), 'utf8').trim()
  } catch {
    return ''
  }
}

export interface TgJawab {
  ok: boolean
  result?: unknown
  deskripsi?: string
}

export async function tgApi(method: string, payload: Record<string, unknown>, timeoutMs = 40_000): Promise<TgJawab> {
  const token = bacaTokenTg()
  if (!token) return { ok: false, deskripsi: 'token telegram tidak tersedia (.token-telegram)' }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(t)
    if (res.status === 429) {
      const j = (await res.json().catch(() => null)) as { parameters?: { retry_after?: number } } | null
      const ra = j?.parameters?.retry_after ?? 3
      await new Promise((r) => setTimeout(r, (ra + 1) * 1000))
      return { ok: false, deskripsi: `rate limit ${ra}s` }
    }
    const j = (await res.json().catch(() => null)) as { ok?: boolean; result?: unknown; description?: string } | null
    if (!j) return { ok: false, deskripsi: `HTTP ${res.status}` }
    return { ok: !!j.ok, result: j.result, deskripsi: j.description }
  } catch (e) {
    clearTimeout(t)
    return { ok: false, deskripsi: (e as Error).message.slice(0, 100) }
  }
}

/** Kirim HTML ke chat; pesan >3900 karakter dipecah pada batas baris. */
export async function kirimPesan(chatId: number, html: string): Promise<boolean> {
  const potongan = pecahPesan(html)
  let semua = true
  for (const p of potongan) {
    const r = await tgApi('sendMessage', {
      chat_id: chatId,
      text: p,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    })
    if (!r.ok) {
      semua = false
      console.error(`[telegram] kirim gagal ke ${chatId}: ${r.deskripsi}`)
      // HTML rusak (entitas salah) → coba ulang tanpa parse_mode agar tak hilang
      if (r.deskripsi && /can't parse entities/i.test(r.deskripsi)) {
        const r2 = await tgApi('sendMessage', { chat_id: chatId, text: p.replace(/<[^>]+>/g, ''), disable_web_page_preview: true })
        if (r2.ok) semua = true
      }
    }
  }
  return semua
}

export function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function pecahPesan(teks: string, maks = 3900): string[] {
  if (teks.length <= maks) return [teks]
  const out: string[] = []
  let sisa = teks
  while (sisa.length > maks) {
    // cari akhir baris terdekat di bawah batas
    let potong = sisa.lastIndexOf('\n', maks)
    if (potong < maks * 0.5) potong = maks
    out.push(sisa.slice(0, potong))
    sisa = sisa.slice(potong).replace(/^\n/, '')
  }
  if (sisa) out.push(sisa)
  return out
}

/** Waktu WIB terformat: "Sen 26/10 07:05" */
export function waktuWib(d = new Date()): string {
  const w = new Date(d.getTime() + 7 * 3600_000)
  const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][w.getUTCDay()]
  const p = (n: number) => String(n).padStart(2, '0')
  return `${hari} ${p(w.getUTCDate())}/${p(w.getUTCMonth() + 1)} ${p(w.getUTCHours())}:${p(w.getUTCMinutes())} WIB`
}

export function angka(x: number | null | undefined, desimal = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  const s = x.toFixed(desimal)
  return x >= 0 ? `+${s}` : s
}
