// ============================================================
// V303-TELEGRAM — Saraf suara otak MICAPROFITA ke Telegram.
//
// Empat mandat pemilik:
//   (1) Laporan pagi OTOMATIS 07:05 WIB — 50 koin terjamin terbaru,
//       hasil audit pipeline (pick hari hidup, bebas kebocoran);
//   (2) Notifikasi WAJIB tiap koin menyentuh level JUAL AMBISIUS
//       (ditarik organ jual_radar.ts, dikirim lewat siarkan());
//   (3) Menjawab pertanyaan & memeriksa koin REAL-TIME (bedahKoin);
//   (4) Detail koin presisi & jelas (kartu bedah di tg_kartu.ts).
//
// Hukum abadi token: token bot TIDAK PERNAH hardcode di kode —
// dibaca dari .token-telegram (chmod 600, gitignored) atau env
// TG_BOT_TOKEN. Tak pernah ikut log maupun respons API.
//
// Ketangguhan: loop long-polling tahan galat (galat apa pun hanya
// log + tidur); jadwal idempoten via meta DB (aman diulang); tanpa
// token → loop tidur 60 dtk menunggu token muncul. Bot TAK BISA
// memulai chat → penerima terdaftar otomatis saat pemilik kirim
// pesan pertama (chat pribadi, maks 10 penerima — anti penyalahgunaan).
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { db } from '@/lib/db'

const ROOT = process.cwd()
const FILE_TOKEN = path.join(ROOT, '.token-telegram')
const FILE_SUBS = path.join(ROOT, '.tg-subscribers.json')
const MAX_SUBS = 10

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface Penerima {
  chatId: number
  nama: string
  at: string
}

// ---------------- Token (brankas) ----------------

let tokenKache: string | null = null

export function bacaTokenTg(): string | null {
  const env = process.env.TG_BOT_TOKEN?.trim()
  if (env) return env
  if (tokenKache) return tokenKache
  try {
    tokenKache = fs.readFileSync(FILE_TOKEN, 'utf8').trim() || null
  } catch {
    tokenKache = null
  }
  return tokenKache
}

export function tgAktif(): boolean {
  return !!bacaTokenTg()
}

// ---------------- Util ----------------

export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Pecah pesan panjang pada batas baris (Telegram maks ~4096 karakter). */
export function pecahPesan(text: string, max = 3800): string[] {
  if (text.length <= max) return [text]
  const out: string[] = []
  let cur = ''
  for (const baris of text.split('\n')) {
    if ((cur + baris + '\n').length > max) {
      if (cur.trim()) out.push(cur)
      cur = baris.length > max ? baris.slice(0, max - 1) + '…' : baris + '\n'
    } else {
      cur += baris + '\n'
    }
  }
  if (cur.trim()) out.push(cur)
  return out
}

// ---------------- API inti ----------------

async function tgApi<T>(
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 20_000,
): Promise<T | null> {
  const token = bacaTokenTg()
  if (!token) return null
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params ?? {}),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const j = (await res.json()) as { ok: boolean; result?: T; description?: string; error_code?: number }
    if (!j.ok) {
      console.warn(`[tg] ${method} gagal ${j.error_code ?? ''}: ${(j.description ?? '').slice(0, 140)}`)
      return null
    }
    return j.result ?? null
  } catch (e) {
    console.warn(`[tg] ${method} galat: ${String(e).slice(0, 140)}`)
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function kirimTg(chatId: number | string, text: string): Promise<boolean> {
  const potongan = pecahPesan(text)
  let ok = true
  for (const p of potongan) {
    const r = await tgApi('sendMessage', {
      chat_id: chatId,
      text: p,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    })
    if (!r) ok = false
    await sleep(350)
  }
  return ok
}

/** Kirim ke SEMUA penerima terdaftar — sarana notif laporan/jual ambisius. */
export async function siarkan(text: string): Promise<number> {
  const subs = daftarPenerima()
  let sukses = 0
  for (const p of subs) {
    if (await kirimTg(p.chatId, text)) sukses++
  }
  return sukses
}

// ---------------- Penerima ----------------

export function daftarPenerima(): Penerima[] {
  try {
    const j = JSON.parse(fs.readFileSync(FILE_SUBS, 'utf8')) as Penerima[]
    return Array.isArray(j) ? j.filter((p) => typeof p?.chatId === 'number') : []
  } catch {
    return []
  }
}

function simpanPenerima(list: Penerima[]) {
  fs.writeFileSync(FILE_SUBS, JSON.stringify(list, null, 2))
  try {
    fs.chmodSync(FILE_SUBS, 0o600)
  } catch { /* izin non-vital */ }
}

export function tambahPenerima(chatId: number, nama: string): boolean {
  const cur = daftarPenerima()
  if (cur.some((p) => p.chatId === chatId)) return true
  if (cur.length >= MAX_SUBS) return false
  cur.push({ chatId, nama, at: new Date().toISOString() })
  simpanPenerima(cur)
  return true
}

// ---------------- Meta KV (idempoten & tahan restart) ----------------

async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.findUnique({ where: { key } })
  return row?.value ?? null
}
async function setMeta(key: string, value: string) {
  await db.meta.upsert({ where: { key }, update: { value }, create: { key, value } })
}

// ---------------- Jadwal laporan pagi 07:05 WIB ----------------

async function cekJadwalLaporan() {
  const subs = daftarPenerima()
  if (!subs.length) return
  const nowWib = new Date(Date.now() + 7 * 3_600_000) // WIB = UTC+7
  const hari = nowWib.toISOString().slice(0, 10)
  const jamMenit = nowWib.toISOString().slice(11, 16)
  if (jamMenit < '07:05') return
  if ((await getMeta('tgLaporanTerakhir')) === hari) return
  const percobaan = parseInt((await getMeta('tgLaporanPercobaan')) ?? '0', 10) || 0
  if (percobaan >= 5) return // jangan banjir bila gagal terus
  await setMeta('tgLaporanPercobaan', String(percobaan + 1))
  console.log(`[tg] laporan pagi ${hari} (percobaan ${percobaan + 1})`)
  try {
    const { laporanPagiTeks } = await import('./tg_kartu')
    const teks = await laporanPagiTeks()
    const sukses = await siarkan(teks)
    if (sukses > 0) {
      await setMeta('tgLaporanTerakhir', hari)
      await setMeta('tgLaporanPercobaan', '0')
      console.log(`[tg] laporan pagi terkirim ke ${sukses} penerima`)
    }
  } catch (e) {
    console.error('[tg] laporan pagi gagal:', String(e).slice(0, 180))
  }
}

// ---------------- Status ringkas (perintah /status) ----------------

export async function statusTeks(): Promise<string> {
  const L: string[] = ['🛡️ <b>V303 · STATUS OTAK MICAPROFITA</b>']
  try {
    const rows = await db.meta.findMany({
      where: { key: { in: ['bootstrapStatus', 'bootstrapProgress', 'bootstrapError', 'arenaToday', 'arenaDataLag', 'bukuCuan', 'tgLaporanTerakhir'] } },
    })
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    L.push(`📅 Hari arena: <b>${escapeHtml(m.arenaToday ?? '—')}</b>${m.arenaDataLag ? ` · lag data ${escapeHtml(m.arenaDataLag)} hari` : ' · lag 0'}`)
    L.push(`⚙️ Denyut: <b>${escapeHtml(m.bootstrapStatus ?? '—')}</b>${m.bootstrapProgress ? ` ${escapeHtml(m.bootstrapProgress)}%` : ''}`)
    if (m.bootstrapError) L.push(`⚠️ ${escapeHtml(m.bootstrapError.slice(0, 140))}`)
    try {
      const buku = m.bukuCuan ? (JSON.parse(m.bukuCuan) as { metrik?: { menang: number; kalah: number; winRate: number | null; ekspektansiPct: number | null; netKumulatifPct: number } }) : null
      const k = buku?.metrik
      if (k) {
        L.push(`💰 Cuan: menang ${k.menang} · kalah ${k.kalah} · winrate ${k.winRate !== null && k.winRate !== undefined ? k.winRate.toFixed(1) + '%' : '—'} · ekspektansi ${k.ekspektansiPct !== null && k.ekspektansiPct !== undefined ? k.ekspektansiPct.toFixed(2) + '%/rencana' : '—'} · kumulatif <b>${k.netKumulatifPct.toFixed(2)}%</b>`)
      }
    } catch { /* buku non-vital */ }
    L.push(`📡 Telegram: ${daftarPenerima().length} penerima · laporan pagi terakhir: ${escapeHtml(m.tgLaporanTerakhir ?? 'belum pernah')}`)
  } catch (e) {
    L.push(`⚠️ DB sedang bermasalah: ${escapeHtml(String(e).slice(0, 100))}`)
  }
  const wib = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 16).replace('T', ' ')
  L.push(`🕐 ${wib} WIB · laporan pagi otomatis 07:05 WIB`)
  return L.join('\n')
}

// ---------------- Bantuan ----------------

function teksBantuan(): string {
  return [
    '🤖 <b>BOT MICAPROFITA (V303)</b> — saraf otak arena ke Telegram.',
    '',
    '<b>Perintah:</b>',
    '/status — denyut otak, cuan, lag data',
    '/laporan — laporan 50 koin teraudit (yang sama seperti pagi 07:05)',
    '/iklim — Fear &amp; Greed, dominasi BTC, suhu pasar',
    '/buku — buku besar mesin cuan',
    '',
    '<b>Tanya bebas (real-time):</b>',
    '«Cek BTC» · «PEPE naik apa turun?» · «sol beli di 150, tahan atau cut loss?»',
    'Aku bedah langsung: harga live, faktor, vonis, proyeksi, vonis posisi.',
    '',
    '🔔 <b>Otomatis:</b> laporan pagi 07:05 WIB + notifikasi tiap koin menyentuh level <b>JUAL AMBISIUS</b>.',
  ].join('\n')
}

function teksBantuanRingkas(): string {
  return [
    '🤔 Aku tidak menemukan ticker koin di pesanmu.',
    'Coba: «cek BTC», «eth naik apa turun», atau perintah /status · /laporan · /bantuan',
  ].join('\n')
}

// ---------------- Loop polling (jantung Telegram) ----------------

interface TgUpdate {
  update_id: number
  message?: {
    chat: { id: number; type: string; first_name?: string }
    from?: { first_name?: string }
    text?: string
  }
}

const gt = globalThis as unknown as {
  __tgLoop?: boolean
  __tgOffset?: number
  __tgAntrian?: Map<number, Promise<void>>
}

/** Tampilkan "sedang menulis…" sepanjang pekerjaan berat — user tahu bot HIDUP. */
async function denganTyping(chatId: number, fn: () => Promise<void>): Promise<void> {
  const berhenti = { nilai: false }
  const jalan = (async () => {
    while (!berhenti.nilai) {
      void tgApi('sendChatAction', { chat_id: chatId, action: 'typing' }, 8_000)
      await sleep(4_000)
    }
  })()
  try {
    await fn()
  } finally {
    berhenti.nilai = true
    await jalan.catch(() => {})
  }
}

/** Antrean PER-CHAT: pesan yang sama chat dijawab berurutan, chat lain
 *  & polling utama TIDAK PERNAH diblokir pekerjaan berat → anti-lelet. */
function antreProses(chatId: number, fn: () => Promise<void>): void {
  if (!gt.__tgAntrian) gt.__tgAntrian = new Map()
  const sebelumnya = gt.__tgAntrian.get(chatId) ?? Promise.resolve()
  const berikutnya = sebelumnya.then(fn).catch((e) => console.warn('[tg] proses pesan gagal:', String(e).slice(0, 140)))
  gt.__tgAntrian.set(chatId, berikutnya)
  berikutnya.finally(() => {
    if (gt.__tgAntrian?.get(chatId) === berikutnya) gt.__tgAntrian.delete(chatId)
  })
}

async function prosesUpdate(u: TgUpdate) {
  const m = u.message
  if (!m?.text || !m.chat) return
  const chatId = m.chat.id
  const teks = m.text.trim()
  const nama = m.from?.first_name ?? m.chat.first_name ?? 'Pemilik'

  // bot tak bisa memulai chat → penerima lahir dari pesan pertama pemilik
  if (m.chat.type === 'private') {
    const ok = tambahPenerima(chatId, nama)
    if (!ok) {
      await kirimTg(chatId, `⚠️ Daftar penerima penuh (maks ${MAX_SUBS}).`)
      return
    }
  }

  const low = teks.toLowerCase()
  const cmd = low.startsWith('/') ? low.slice(1).split(/\s+/)[0].split('@')[0] : null

  if (cmd === 'start' || cmd === 'help' || cmd === 'bantuan') {
    await kirimTg(chatId, teksBantuan())
    return
  }
  if (cmd === 'status') {
    await kirimTg(chatId, await statusTeks())
    return
  }
  if (cmd === 'laporan') {
    await kirimTg(chatId, '⏳ Menyusun laporan 50 koin teraudit…')
    const { laporanPagiTeks } = await import('./tg_kartu')
    await kirimTg(chatId, await laporanPagiTeks())
    return
  }
  if (cmd === 'iklim') {
    const { getClimate } = await import('./market')
    const k = await getClimate().catch(() => null)
    if (!k || (k.fng === null && k.mcapChange24h === null)) {
      await kirimTg(chatId, '🌡️ Data iklim sedang tak terjangkau — coba lagi sebentar (aku tidak mengarang).')
    } else {
      await kirimTg(chatId, [
        '🌡️ <b>IKLIM PASAR GLOBAL</b>',
        k.fng !== null ? `Fear &amp; Greed: <b>${k.fng}</b> (${escapeHtml(k.fngClass ?? '—')})` : 'Fear &amp; Greed: —',
        k.mcapChange24h !== null ? `Market cap 24j: ${sgnNum(k.mcapChange24h)}%` : 'Market cap 24j: —',
        k.btcDominance !== null ? `Dominasi BTC: ${k.btcDominance.toFixed(1)}%` : 'Dominasi BTC: —',
      ].join('\n'))
    }
    return
  }
  if (cmd === 'buku') {
    try {
      const raw = (await getMeta('bukuCuan')) ?? ''
      const buku = raw ? (JSON.parse(raw) as { metrik?: Record<string, number>; kejujuran?: string[] }) : null
      const k = buku?.metrik
      if (!k) {
        await kirimTg(chatId, '📒 Buku cuan masih kosong — denyut arena belum membentuk rencana. Coba /status.')
      } else {
        await kirimTg(chatId, [
          '📒 <b>BUKU BESAR MESIN-CUAN</b>',
          `Rencana dinilai: ${k.totalPlan} · menang ${k.menang} · kalah ${k.kalah} · kedaluwarsa ${k.kedaluwarsa}`,
          `Winrate: ${k.winRate !== null && k.winRate !== undefined ? k.winRate.toFixed(1) + '%' : '—'} · ekspektansi ${k.ekspektansiPct !== null && k.ekspektansiPct !== undefined ? k.ekspektansiPct.toFixed(2) + '%/rencana (' + k.ekspektansiR + 'R)' : '—'}`,
          `Kumulatif after-fee: <b>${k.netKumulatifPct?.toFixed(2)}%</b> · max drawdown ${k.maxDrawdownPct?.toFixed(2)}% · streak ${escapeHtml(String(k.streak ?? '—'))}`,
        ].join('\n'))
      }
    } catch (e) {
      await kirimTg(chatId, `⚠️ Buku gagal dibaca: ${escapeHtml(String(e).slice(0, 100))}`)
    }
    return
  }

  // pertanyaan bebas → bedah koin real-time (mandat ③ & ④)
  // typing langsung menyala → user melihat bot HIDUP selagi otak bekerja
  await denganTyping(chatId, async () => {
    const { bedahKoin } = await import('./koin')
    const b = await bedahKoin(teks).catch(() => null)
    if (b) {
      // rencana tempur hari ini (bila koin ada di daftar) → kartu lengkap
      let rencanaTempur: { rencana: import('./tg_kartu').RencanaEvidensi | null; arah?: string; hari?: string } | null = null
      try {
        const { ekstrakTicker } = await import('./koin')
        const simbol = b.simbol ?? ekstrakTicker(teks) ?? null
        if (simbol) {
          const hariIni =
            (await db.meta.findUnique({ where: { key: 'arenaToday' } }).catch(() => null))?.value ?? null
          const bd = hariIni
            ? await db.battleDay.findUnique({ where: { day: hariIni }, include: { picks: true } }).catch(() => null)
            : null
          const pick = bd?.picks.find((x) => x.competitor === 'MICAPROFITA' && x.symbol === simbol.toUpperCase())
          if (bd && pick) {
            const { bacaEvidence } = await import('./evidence')
            rencanaTempur = {
              rencana: (bacaEvidence(pick.evidence).rencana as import('./tg_kartu').RencanaEvidensi | undefined) ?? null,
              arah: pick.direction,
              hari: bd.day,
            }
          }
        }
      } catch { /* non-vital */ }
      const { kartuKoinTeks } = await import('./tg_kartu')
      await kirimTg(chatId, kartuKoinTeks(b, rencanaTempur))
      return
    }
    if (/laporan|daftar koin|50 koin/.test(low)) {
      const { laporanPagiTeks } = await import('./tg_kartu')
      await kirimTg(chatId, await laporanPagiTeks())
      return
    }
    if (/status|kondisi otak|denyut/.test(low)) {
      await kirimTg(chatId, await statusTeks())
      return
    }
    await kirimTg(chatId, teksBantuanRingkas())
  })
}

function sgnNum(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
}

export async function tgLoop(): Promise<void> {
  if (gt.__tgLoop) return
  gt.__tgLoop = true
  console.log('[tg] loop Telegram menyala (long-polling 25 dtk, antrian per-chat)')
  let perkenalkan = false
  while (gt.__tgLoop) {
    try {
      if (!tgAktif()) {
        await sleep(60_000) // token belum ada — tidur, jangan mati
        continue
      }
      if (!perkenalkan) {
        const me = await tgApi<{ username?: string }>('getMe')
        if (me?.username) {
          perkenalkan = true
          console.log(`[tg] bot hidup: @${me.username}`)
        }
      }
      // jadwal laporan pagi di LATAR — jangan pernah memblokir polling
      void cekJadwalLaporan().catch(() => {})
      const ups = await tgApi<TgUpdate[]>(
        'getUpdates',
        { offset: gt.__tgOffset ?? 0, timeout: 25, limit: 20, allowed_updates: ['message'] },
        35_000,
      )
      for (const u of ups ?? []) {
        gt.__tgOffset = u.update_id + 1
        // ANTREAN PER-CHAT — polling TIDAK menunggu jawaban (anti-lelet):
        // pekerjaan berat (bedah koin, laporan) jalan paralel.
        if (u.message?.chat?.id) {
          const cid = u.message.chat.id
          antreProses(cid, () => prosesUpdate(u))
        } else {
          void prosesUpdate(u).catch(() => {})
        }
      }
    } catch (e) {
      console.warn('[tg] loop galat:', String(e).slice(0, 140))
      await sleep(6_000)
    }
  }
}
