// ============================================================
// V304-TELEGRAM — JADWAL & SIREN
// 1) Laporan pagi 07:05 WIB: 50 koin daftar tempur hari ini
//    (data close T-1 — bebas kebocoran — lolos guard + audit pipeline).
// 2) Siren WAJIB: setiap koin pick MICAPROFITA yang tersentuh level
//    JUAL AMBISIUS (evidence.rencana.highAmbisius) → dorong otomatis.
// ============================================================
import { db } from '@/lib/db'
import { angka, esc, kirimPesan, waktuWib } from './gateway'
import { bacaNegara, catatSiren, daftarChat, sirenSudah, tandaiLaporan } from './negara'

interface RencanaTg {
  entry?: number
  stop?: number
  target?: number
  highAmbisius?: number | null
  stopPct?: number | null
  targetPct?: number | null
  ambisiusPct?: number | null
  pTarget?: number | null
  pStop?: number | null
  pAmbisius?: number | null
  targetMediana?: boolean
  netUntungPct?: number | null
}

interface PickTg {
  symbol: string
  direction: string
  confidence: number
  entryClose: number
  rank?: number
  rencana?: RencanaTg
  alasan?: string
}

function hariUtcSekarang(): string {
  return new Date().toISOString().slice(0, 10)
}

function hariWibSekarang(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}

function fmtHarga(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1000) return x.toFixed(2)
  if (Math.abs(x) >= 1) return x.toFixed(4)
  return x.toPrecision(6)
}

/** Ambil pick MICAPROFITA hari-UTC-tertentu lengkap rencananya (dari DB — data audited). */
export async function picksHariIni(dayUtc = hariUtcSekarang()): Promise<{ day: string; regime: string; status: string; picks: PickTg[] } | null> {
  const bd = await db.battleDay.findFirst({
    where: { day: dayUtc },
    include: { picks: { where: { competitor: 'MICAPROFITA' }, orderBy: { confidence: 'desc' } } },
  })
  if (!bd) return null
  const picks: PickTg[] = []
  for (const p of bd.picks) {
    let ev: Record<string, unknown> = {}
    try {
      const mentah: unknown = typeof p.evidence === 'string' ? JSON.parse(p.evidence || '{}') : p.evidence
      ev = (mentah ?? {}) as Record<string, unknown>
    } catch { ev = {} }
    const r = (ev.rencana ?? undefined) as RencanaTg | undefined
    const tr = Array.isArray(ev.topReasons) ? (ev.topReasons as string[]) : []
    picks.push({
      symbol: p.symbol,
      direction: p.direction,
      confidence: p.confidence,
      entryClose: p.entryClose,
      rank: typeof ev.rank === 'number' ? ev.rank : undefined,
      rencana: r,
      alasan: tr.length ? String(tr[0]).slice(0, 90) : undefined,
    })
  }
  return { day: bd.day, regime: bd.regime, status: bd.status, picks }
}

// ---------------- LAPORAN PAGI 07:05 WIB ----------------

export async function bangunLaporanPagi(): Promise<{ siap: boolean; html: string; alasan?: string }> {
  const hari = hariUtcSekarang()
  const hasil = await picksHariIni(hari)
  if (!hasil) {
    return { siap: false, html: '', alasan: 'BattleDay hari ini belum lahir — rollover belum selesai berjalan' }
  }
  const adaRencana = hasil.picks.filter((p) => p.rencana?.highAmbisius != null)
  if (hasil.picks.length === 0) {
    return { siap: false, html: '', alasan: 'pick MICAPROFITA hari ini belum lahir' }
  }

  const audited = adaRencana.length
  const baris = hasil.picks.map((p, i) => {
    const r = p.rencana
    const tgt = r?.targetPct != null ? `target <b>${angka(r.targetPct, 1)}%</b> (P ${Math.round((r.pTarget ?? 0) * 100)}%)` : 'target —'
    const amb = r?.ambisiusPct != null ? `ambisius <b>${angka(r.ambisiusPct, 1)}%</b> (P ${Math.round((r.pAmbisius ?? 0) * 100)}%)` : 'ambisius —'
    return `${String(i + 1).padStart(2, '0')}. <b>${esc(p.symbol.replace(/USDT$/, ''))}</b> ${p.direction} ${Math.round(p.confidence)}% · masuk ${fmtHarga(p.entryClose)} · ${tgt} · ${amb}`
  })

  const html = [
    `<b>LAPORAN PAGI MICAPROFITA — ${esc(waktuWib())}</b>`,
    `Hari pertarungan <b>${esc(hasil.day)}</b> · rezim <b>${esc(hasil.regime)}</b> · status ${esc(hasil.status)}`,
    `Daftar tempur: <b>${hasil.picks.length} koin</b> — semuanya pick terbaru (data close T-1, bebas kebocoran) dan <b>${audited} sudah diaudit penuh</b> (lolos guard Monte Carlo + rencana pra-registrasi: entry/stop/target/ambisius).`,
    '',
    ...baris,
    '',
    `Ket: target = level jual aman; ambisius = level jual agresif (P = peluang tersentuh, dari Monte Carlo). Ketik <code>/koin SIMBOL</code> untuk bedah penuh — siren otomatis akan berbunyi bila level JUAL AMBISIUS tersentuh.`,
  ].join('\n')
  return { siap: true, html }
}

/** Kirim laporan sekarang (perintah /laporan atau sambutan /start). */
export async function kirimLaporanSekarang(chatId: number): Promise<void> {
  const rep = await bangunLaporanPagi()
  if (!rep.siap) {
    await kirimPesan(chatId, `Laporan pagi belum bisa lahir: ${esc(rep.alasan ?? 'data belum siap')}. Mesin akan mencoba lagi otomatis.`)
    return
  }
  await kirimPesan(chatId, rep.html)
  tandaiLaporan(hariWibSekarang())
}

async function laporanPagiJikaTiba(): Promise<void> {
  const wib = new Date(Date.now() + 7 * 3600_000)
  const menit = wib.getUTCHours() * 60 + wib.getUTCMinutes()
  if (menit < 7 * 60 + 5) return // belum jam 07:05 WIB
  const hari = hariWibSekarang()
  const n = bacaNegara()
  if (n.laporanTerakhir === hari) return // sudah terkirim hari ini
  const chats = daftarChat()
  if (chats.length === 0) return // belum ada penerima — tunggu /start (laporan menyusul saat mendaftar)
  const rep = await bangunLaporanPagi()
  if (!rep.siap) {
    // jujur setelah tengah hari: jangan biarkan senyap selamanya
    if (menit >= 12 * 60) {
      for (const c of chats) {
        await kirimPesan(c, `Laporan pagi ${esc(hari)} belum terbit: ${esc(rep.alasan ?? 'data belum matang')}. Mesin terus mengejar; ketik /laporan kapan pun untuk menagih.`)
      }
      tandaiLaporan(hari)
    }
    return
  }
  let ok = true
  for (const c of chats) ok = (await kirimPesan(c, rep.html)) && ok
  if (ok) tandaiLaporan(hari)
}

// ---------------- SIREN JUAL AMBISIUS ----------------

interface HargaTg { last: number; chg: number }

const hostHarga = ['https://api.binance.com', 'https://data-api.binance.vision']

/** Harga kini semua simbol — SATU request ticker/24hr penuh (hemat, failover host). */
async function hargaSemua(): Promise<Map<string, HargaTg>> {
  const out = new Map<string, HargaTg>()
  for (const host of hostHarga) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20_000)
    try {
      const res = await fetch(`${host}/api/v3/ticker/24hr`, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(t)
      if (!res.ok) continue
      const arr = (await res.json()) as Array<{ symbol: string; lastPrice: string; priceChangePercent: string }>
      for (const x of arr) out.set(x.symbol, { last: parseFloat(x.lastPrice), chg: parseFloat(x.priceChangePercent) })
      return out
    } catch {
      clearTimeout(t)
    }
  }
  return out
}

export async function periksaSiren(): Promise<number> {
  const hari = hariUtcSekarang()
  const hasil = await picksHariIni(hari)
  if (!hasil || hasil.picks.length === 0) return 0
  const berRencana = hasil.picks.filter((p) => p.rencana?.highAmbisius != null)
  if (berRencana.length === 0) return 0
  const chats = daftarChat()
  if (chats.length === 0) return 0
  const harga = await hargaSemua()
  if (harga.size === 0) return 0
  let bunyi = 0
  for (const p of berRencana) {
    const r = p.rencana!
    const level = r.highAmbisius as number
    const h = harga.get(p.symbol)
    if (!h || !Number.isFinite(h.last) || h.last <= 0) continue
    const kena = p.direction === 'BUY' ? h.last >= level : h.last <= level
    if (!kena) continue
    const kunci = `${hari}:${p.symbol}`
    if (sirenSudah(kunci)) continue
    catatSiren(kunci)
    bunyi++
    const untungKini = +(((h.last - p.entryClose) / p.entryClose) * (p.direction === 'BUY' ? 1 : -1) * 100).toFixed(2)
    const html = [
      `<b>[SIREN] JUAL AMBISIUS TERSentuh — ${esc(p.symbol)}</b>`,
      `Arah pick: <b>${p.direction}</b> · keyakinan ${Math.round(p.confidence)}%`,
      `Harga kini: <b>${fmtHarga(h.last)}</b> (24j ${angka(h.chg, 2)}%) · waktu ${esc(waktuWib())}`,
      `Masuk rencana: ${fmtHarga(p.entryClose)} → untung kini <b>${angka(untungKini, 2)}%</b>`,
      `Level JUAL AMBISIUS: <b>${fmtHarga(level)}</b> (${angka(r.ambisiusPct ?? null, 1)}% dari masuk · peluang tercapai P ${Math.round((r.pAmbisius ?? 0) * 100)}%)`,
      `Target jual aman: ${fmtHarga(r.target ?? null)} (${angka(r.targetPct ?? null, 1)}%) · stop disiplin: ${fmtHarga(r.stop ?? null)} (${angka(r.stopPct ?? null, 1)}%)`,
      `Level ambisius = batas q75 Monte Carlo — harga sampai di sini berarti ekor momentum menghidup. Ketik <code>/koin ${esc(p.symbol.replace(/USDT$/, ''))}</code> untuk bedah penuh & keputusan posisi.`,
    ].join('\n')
    for (const c of chats) await kirimPesan(c, html)
    console.log(`[telegram][siren] ${p.symbol} ambisius tersentuh @ ${h.last}`)
  }
  return bunyi
}

// ---------------- LATAR (dipanggil instrumentation sekali) ----------------

export async function latarTelegram(): Promise<void> {
  const g = globalThis as typeof globalThis & { __arenaTelegramLatar?: boolean }
  if (g.__arenaTelegramLatar) return
  g.__arenaTelegramLatar = true

  // polling tanya-jawab
  const { mulaiPolling } = await import('./polling')
  mulaiPolling()

  // jadwal laporan pagi (cek tiap 30 dtk)
  setInterval(() => { void laporanPagiJikaTiba().catch((e) => console.error('[telegram] jadwal:', (e as Error).message?.slice(0, 100))) }, 30_000)
  // siren jual-ambisius (tiap 90 dtk — 1 request harga, hemat)
  setInterval(() => { void periksaSiren().catch((e) => console.error('[telegram] siren:', (e as Error).message?.slice(0, 100))) }, 90_000)
  // denyut siren pertama setelah 25 dtk boot
  setTimeout(() => { void periksaSiren().catch(() => { /* senyap */ }) }, 25_000)

  console.log('[telegram] latar hidup — jadwal laporan 07:05 WIB, siren jual-ambisius 90 dtk, polling tanya-jawab')
}
