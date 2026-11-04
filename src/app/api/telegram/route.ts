// ============================================================
// V304 TELEGRAM-JANTUNG — pintu tunggu bot Telegram.
//
// Dipanggil HANYA oleh scripts/telegram_bot.mjs via http://127.0.0.1:3000
// (loopback, bukan publik). Prinsip mutlak:
//   (1) SATU SUMBER KEBENARAN dengan otak z.ai: daftar koin laporan diambil
//       langsung dari DB arena (BattleDay + Pick competitor=MICAPROFITA,
//       urutan resmi rank/guard) — PERSIS daftar yang dilihat dasbor.
//   (2) Detail penuh per koin: Entry, TP/Sasaran, Jual Ambisius,
//       Jual Power Max (q90 Monte Carlo — V304), Stop Loss, funding,
//       vonis otak + penjelasan.
//   (3) JUJUR ABSOLUT: bila data tidak ada, tulis "—" — dilarang mengarang.
// ============================================================

import { db } from '@/lib/db'
import { safeJson } from '@/lib/cyborg/arena'
import { bedahKoin } from '@/lib/cyborg/koin'
import { ensureArena } from '@/lib/cyborg/arena'
import { getUniverse } from '@/lib/cyborg/market'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAKS_POTONGAN = 3500 // batas aman di bawah limit pesan Telegram 4096

interface RencanaEv {
  entry?: number; stop?: number | null; target?: number | null
  highAmbisius?: number | null; powerMax?: number | null
  stopPct?: number | null; targetPct?: number | null
  ambisiusPct?: number | null; powerMaxPct?: number | null
  pTarget?: number | null; pStop?: number | null
  pAmbisius?: number | null; pPowerMax?: number | null
  sumberTarget?: string; ketGuard?: string
}

const num = (x: unknown): string => (typeof x === 'number' && Number.isFinite(x) ? (x >= 1 ? x.toLocaleString('id-ID', { maximumFractionDigits: x >= 100 ? 2 : 4 }) : x.toPrecision(6)) : '—')
const pct = (x: unknown): string => (typeof x === 'number' && Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${x.toFixed(1)}%` : '—')
const prob = (x: unknown): string => (typeof x === 'number' && Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—')

function formatKoin(p: { symbol: string; direction: string; confidence: number; entryClose: number; evidence: string | null }, idx: number): string {
  const ev = safeJson(p.evidence) as {
    rank?: number; guard?: string; guardAlasan?: string | null
    rencana?: RencanaEv
    funding?: { pct?: number }
    verdict?: { kind?: string; note?: string }
    sadardiri?: string
    topReasons?: string[]
    praRegistrasi?: Record<string, unknown>
  }
  const r = ev.rencana ?? {}
  const baris: string[] = []
  baris.push(`${idx}. ${p.symbol} — ${p.direction} · keyakinan ${Math.round(p.confidence)}% · rank ${ev.rank ?? '—'}`)
  baris.push(`   Entry: ${num(r.entry ?? p.entryClose)}`)
  baris.push(`   TP / Sasaran: ${num(r.target)} (${pct(r.targetPct)}) · peluang sentuh ${prob(r.pTarget)}${r.sumberTarget ? ` · ${r.sumberTarget}` : ''}`)
  baris.push(`   Jual Ambisius: ${num(r.highAmbisius)} (${pct(r.ambisiusPct)}) · peluang ${prob(r.pAmbisius)}`)
  baris.push(`   Jual Power Max: ${num(r.powerMax)} (${pct(r.powerMaxPct)}) · peluang ${prob(r.pPowerMax)}`)
  baris.push(`   Stop Loss: ${num(r.stop)} (${pct(r.stopPct)}) · peluang tersentuh ${prob(r.pStop)}`)
  if (typeof ev.funding?.pct === 'number') baris.push(`   Funding: ${ev.funding.pct >= 0 ? '+' : ''}${ev.funding.pct.toFixed(3)}%`)
  const vonis = ev.verdict
  if (vonis) baris.push(`   Vonis otak: ${vonis.kind ?? '—'} — ${vonis.note ?? ''}`)
  const alasan = (ev.topReasons ?? []).slice(0, 2).join(' · ')
  if (alasan) baris.push(`   Penjelasan: ${alasan}`)
  if (ev.sadardiri) baris.push(`   Catatan disiplin: ${ev.sadardiri}`)
  return baris.join('\n')
}

async function ambilPicksHariIni(): Promise<{ day: string; picks: { symbol: string; direction: string; confidence: number; entryClose: number; evidence: string | null }[]; regime: string; status: string; ada: boolean }> {
  const metaArena = await db.meta.findUnique({ where: { key: 'arenaToday' } })
  const day = metaArena?.value ?? ''
  if (!day) return { day: '', picks: [], regime: '', status: 'KOSONG', ada: false }
  const bd = await db.battleDay.findUnique({ where: { day }, include: { picks: true } })
  if (!bd) return { day, picks: [], regime: '', status: 'BELUM_ADA', ada: false }
  const urut = (a: { evidence: string | null }, b: { evidence: string | null }) => {
    const ea = safeJson(a.evidence) as { guard?: string; rank?: number }
    const eb = safeJson(b.evidence) as { guard?: string; rank?: number }
    return ((ea.guard === 'DITOLAK' ? 1 : 0) - (eb.guard === 'DITOLAK' ? 1 : 0)) || ((ea.rank ?? 999) - (eb.rank ?? 999))
  }
  const picks = bd.picks.filter((x) => x.competitor === 'MICAPROFITA').sort(urut)
  return { day, picks, regime: bd.regime, status: bd.status, ada: true }
}

async function laporanLengkap(): Promise<string[]> {
  const { day, picks, regime, status, ada } = await ambilPicksHariIni()
  if (!ada || picks.length === 0) {
    void ensureArena().catch(() => {})
    return [`LAPORAN HARIAN MICAPROFITA — ${day || '(tanggal menunggu)'}\nArena sedang membangun daftar hari ini (pindai futures + analisis 50 slot). Ini butuh beberapa menit — aku kirim ulang begitu daftar lahir. TANPA mengarang daftar.`]
  }
  const lolos = picks.filter((p) => (safeJson(p.evidence) as { guard?: string }).guard !== 'DITOLAK')
  const ditolak = picks.filter((p) => (safeJson(p.evidence) as { guard?: string }).guard === 'DITOLAK')
  const kepala = `LAPORAN HARIAN MICAPROFITA — ${day}\nRezim BTC: ${regime} · status: ${status}\nDaftar tempur: ${lolos.length} koin lolos guard, ${ditolak.length} ditolak (sumber: otak arena — sama dengan dasbor).\nPer koin: Entry · TP/Sasaran · Jual Ambisius · Jual Power Max (q90 MC, mulai daftar berikutnya) · Stop Loss · vonis + penjelasan.\n—`
  const blok: string[] = [kepala]
  let buf = ''
  let no = 0
  for (const p of lolos) {
    no++
    const teks = formatKoin(p, no)
    if (buf.length + teks.length + 2 > MAKS_POTONGAN) { blok.push(buf); buf = '' }
    buf += (buf ? '\n\n' : '') + teks
  }
  if (buf) blok.push(buf)
  if (ditolak.length) {
    const daftarD = ditolak.map((p) => {
      const ev = safeJson(p.evidence) as { guardAlasan?: string | null }
      return `• ${p.symbol} — ${ev.guardAlasan ?? 'guard'}`
    }).join('\n')
    let bufD = `DITOLAK GUARD (${ditolak.length}):\n`
    for (const baris of daftarD.split('\n')) {
      if (bufD.length + baris.length + 1 > MAKS_POTONGAN) { blok.push(bufD); bufD = '' }
      bufD += baris + '\n'
    }
    if (bufD.trim()) blok.push(bufD)
  }
  return blok
}

function formatBedah(q: string, b: Awaited<ReturnType<typeof bedahKoin>>): string {
  if (!b) return `Aku tidak menemukan koin yang kamu maksud di "${q}". Tulis tickernya, contoh: "periksa BTC".`
  if (!b.terdaftar) return `KOIN "${b.ditanya}": ${b.yakinTakTerdaftar ? 'tidak terdaftar sebagai pasangan spot aktif di Binance — aku jujur tidak menemukannya.' + (b.saran.length ? ` Ticker mirip yang sah: ${b.saran.join(', ')}.` : '') : 'pemeriksa Binance sedang tak terjangkau — coba lagi sebentar, aku tidak mau mengarang.'}`
  if (!b.vonis || !b.faktor) return `${b.simbol}: terdaftar di Binance tapi analisis dalam sedang bermasalah. ${b.pnlKasar ?? ''} Coba lagi sebentar — vonis tanpa data adalah karangan, aku menolak.`
  const f = b.faktor
  const baris: string[] = []
  baris.push(`BEDAH ${b.simbol} (Binance spot, detik ini)`)
  baris.push(`Harga: ${b.harga} USDT · 24j: ${b.ubah24Pct !== null ? (b.ubah24Pct >= 0 ? '+' : '') + b.ubah24Pct.toFixed(2) + '%' : '?'} · puncak/pen 24j: ${b.tinggi24}/${b.rendah24}`)
  baris.push(`Volume 24j: ${b.volQv !== null ? (b.volQv / 1e6).toFixed(1) + ' jt USDT' : '?'}`)
  baris.push(`Faktor arena: mom7 ${f.mom7 >= 0 ? '+' : ''}${f.mom7.toFixed(1)}% · mom30 ${f.mom30 >= 0 ? '+' : ''}${f.mom30.toFixed(1)}% · RSI ${f.rsi.toFixed(0)} · EMA-align ${f.emaAlign.toFixed(2)} · ATR ${f.atrPct.toFixed(1)}% · lonjak vol ${f.volSurge.toFixed(2)}x · jarak puncak60 ${f.distHigh.toFixed(1)}% · korel BTC ${f.btcCorr.toFixed(2)}`)
  if (b.proyeksi) baris.push(`Proyeksi hari ini (bukan jaminan): wilayah wajar ${b.proyeksi.bandBawah}–${b.proyeksi.bandAtas} · breakout ${b.proyeksi.bandAtas2} · dukungan ${b.proyeksi.dukungan.join(' → ')} · resistensi ${b.proyeksi.resistensi.join(' → ')}`)
  baris.push(`VONIS MESIN: ${b.vonis.arah} · keyakinan ${b.vonis.keyakinan}% — ${b.vonis.alasan}`)
  if (b.posisi) baris.push(`POSISI KAMU: ${b.posisi.vonis} — entry ${b.posisi.entry} ${b.posisi.arah} · PnL bruto ${b.posisi.pnlBrutoPct >= 0 ? '+' : ''}${b.posisi.pnlBrutoPct}% (net ≈ ${b.posisi.pnlNetPct}%) · stop disiplin ${b.posisi.stopSaran} · ${b.posisi.alasan}`)
  return baris.join('\n')
}

async function statusRingkas(): Promise<string> {
  const { day, picks, regime, status, ada } = await ambilPicksHariIni()
  if (!ada) return `Arena belum membangun daftar hari ini. Aku sudah picu pembangkitan — minta "laporan" beberapa menit lagi.`
  const lolos = picks.filter((p) => (safeJson(p.evidence) as { guard?: string }).guard !== 'DITOLAK')
  const top = lolos.slice(0, 5).map((p, i) => `${i + 1}. ${p.symbol} ${p.direction}`).join('\n')
  return `STATUS ARENA ${day}\nRezim: ${regime} · ${status}\nDaftar: ${lolos.length} koin.\nTop-5:\n${top}\nKetik "laporan" untuk detail penuh 50 koin (entry/TP/ambisius/power max/stop).`
}

async function pantauSentuhan(): Promise<{ symbol: string; level: string; teks: string }[]> {
  const { picks, ada } = await ambilPicksHariIni()
  if (!ada) return []
  const ticker = await getUniverse().catch(() => [])
  const hargaOf = new Map(ticker.map((t) => [t.symbol, t.lastPrice]))
  const keluar: { symbol: string; level: string; teks: string }[] = []
  for (const p of picks) {
    const ev = safeJson(p.evidence) as { guard?: string; rencana?: RencanaEv }
    if (ev.guard === 'DITOLAK') continue
    const r = ev.rencana ?? {}
    const harga = hargaOf.get(p.symbol)
    if (harga === undefined) continue
    const buy = p.direction === 'BUY'
    const cek = (level: number | null | undefined, nama: string, pPct?: number | null) => {
      if (typeof level !== 'number' || !Number.isFinite(level)) return
      const sentuh = buy ? harga >= level : harga <= level
      if (sentuh) keluar.push({ symbol: p.symbol, level: nama, teks: `${p.symbol} ${p.direction} — ${nama.toUpperCase()} TERSENTUH!\nHarga sekarang ${harga} · level ${nama} ${num(level)} (${pct(pPct)} dari entry ${num(r.entry ?? p.entryClose)}).` })
    }
    cek(r.target, 'TP/Sasaran', r.targetPct)
    cek(r.highAmbisius, 'Jual Ambisius', r.ambisiusPct)
    cek(r.powerMax, 'Jual Power Max', r.powerMaxPct)
    cek(r.stop, 'Stop Loss', r.stopPct)
  }
  return keluar
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; q?: string }
  try {
    if (body.action === 'laporan') {
      const potongan = await laporanLengkap()
      return Response.json({ ok: true, potongan })
    }
    if (body.action === 'otak') {
      const q = (body.q ?? '').trim()
      if (!q) return Response.json({ ok: false, pesan: 'Pertanyaan kosong.' }, { status: 400 })
      const b = await bedahKoin(q)
      return Response.json({ ok: true, pesan: formatBedah(q, b) })
    }
    if (body.action === 'status') {
      return Response.json({ ok: true, pesan: await statusRingkas() })
    }
    if (body.action === 'pantau') {
      return Response.json({ ok: true, notif: await pantauSentuhan() })
    }
    return Response.json({ ok: false, pesan: 'Aksi tidak dikenal' }, { status: 400 })
  } catch (e) {
    return Response.json({ ok: false, pesan: `Otak tersandung: ${(e as Error).message.slice(0, 120)}` }, { status: 500 })
  }
}
