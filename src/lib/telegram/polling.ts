// ============================================================
// V304-TELEGRAM — POLLING TANYA-JAWAB (telinga otak MICAPROFITA)
// Pemilik bertanya → otak menjawab real-time, presisi, jujur.
// Semua angka dari mesin (bedahKoin + DB) — tanpa karangan LLM.
// ============================================================
import { db } from '@/lib/db'
import { bedahKoin, BedahKoin } from '@/lib/cyborg/koin'
import { angka, esc, kirimPesan, waktuWib } from './gateway'
import { bacaNegara, daftarChat, daftarChatBaru, simpanOffset } from './negara'
import { kirimLaporanSekarang, picksHariIni } from './jadwal'

interface PesanTg {
  message_id: number
  text?: string
  chat: { id: number; type: string; first_name?: string; username?: string; title?: string }
  from?: { first_name?: string; username?: string }
}

interface UpdateTg {
  update_id: number
  message?: PesanTg
}

const BANTUAN = [
  '<b>PANDUAN ASISTEN MICAPROFITA</b>',
  '<b>/laporan</b> — laporan pagi 50 koin daftar tempur (kirim sekarang)',
  '<b>/koin SIMBOL</b> — bedah koin penuh presisi (harga, faktor arena, vonis, proyeksi, rencana warisan). Contoh: <code>/koin BTC</code>',
  '<b>/status</b> — kesehatan otak: lag data, hari pertarungan, siren',
  'Atau tulis bebas: "cek OPB", "bagaimana koin JCT?", "posisiku buy WOD di 0.42" — saya jawab real-time.',
  'Siren otomatis: setiap koin pick harian yang tersentuh <b>JUAL AMBISIUS</b> akan SAYA dorong ke sini tanpa diminta.',
  'Laporan pagi otomatis setiap <b>07:05 WIB</b> (50 koin terbaru, sudah diaudit).',
].join('\n')

function sambutan(nama: string): string {
  return [
    `<b>Halo ${esc(nama)} — Asisten MICAPROFITA siap berjaga.</b>`,
    'Saya lidah &amp; telinga otak arena: laporan pagi 07:05 WIB, siren JUAL AMBISIUS otomatis, dan bedah koin real-time.',
    '',
    BANTUAN,
  ].join('\n')
}

function fmtHarga(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1000) return x.toFixed(2)
  if (Math.abs(x) >= 1) return x.toFixed(4)
  return x.toPrecision(6)
}

/** Detail koin penuh — presisi dari mesin, nol karangan. */
async function formatDetailKoin(q: string): Promise<string | null> {
  const b: BedahKoin | null = await bedahKoin(q)
  if (!b) return null
  if (!b.terdaftar) {
    if (!b.yakinTakTerdaftar) {
      return `Pemeriksa keanggotaan Binance sedang tak terjangkau untuk "${esc(b.ditanya)}" — bukan berarti koin tidak ada. Coba lagi sebentar; saya tidak akan mengarang data.`
    }
    return `"${esc(b.ditanya)}" <b>tidak terdaftar</b> sebagai pasangan spot aktif di Binance.${b.saran.length ? ` Ticker mirip yang sah: ${esc(b.saran.join(', '))}.` : ''} Saya jujur: tidak akan menebak koin lain.`
  }
  const out: string[] = []
  out.push(`<b>BEDAH KOIN — ${esc(b.simbol ?? b.ditanya)}</b> · ${esc(waktuWib())}`)
  out.push(`Harga kini: <b>${b.harga ?? '—'}</b> USDT · 24 jam <b>${angka(b.ubah24Pct, 2)}%</b>`)
  out.push(`Puncak/pen 24j: ${b.tinggi24 ?? '—'} / ${b.rendah24 ?? '—'} · Volume 24j: ${b.volQv != null ? (b.volQv / 1e6).toFixed(1) + ' jt USDT' : '—'}`)
  if (b.faktor && b.vonis) {
    const f = b.faktor
    out.push('')
    out.push('<b>FAKTOR ARENA</b> (matematika sama dengan pick harian)')
    out.push(`mom7 ${angka(f.mom7, 1)}% · mom30 ${angka(f.mom30, 1)}% · RSI-14 ${f.rsi.toFixed(0)} · emaAlign ${f.emaAlign.toFixed(2)}`)
    out.push(`ATR ${f.atrPct.toFixed(1)}% · lonjakan vol ${f.volSurge.toFixed(2)}x · jarak puncak60 ${angka(f.distHigh, 1)}% · korelasi BTC ${f.btcCorr.toFixed(2)}`)
    out.push('')
    out.push(`<b>VONIS OTAK: ${esc(b.vonis.arah)}</b> · keyakinan ${Math.round(b.vonis.keyakinan)}%`)
    out.push(esc(b.vonis.alasan).slice(0, 300))
  } else {
    out.push('')
    out.push('Data pendalam sedang tak terjangkau — saya tidak akan memberi vonis tanpa data lengkap (vonis tanpa data = karangan). Coba lagi sebentar.' + (b.pnlKasar ? ` Yang masih bisa disampaikan: ${esc(b.pnlKasar)}.` : ''))
  }
  if (b.proyeksi) {
    const pr = b.proyeksi
    out.push('')
    out.push(`<b>PROYEKSI HARI INI</b> (ATR ${pr.atrAbs} ≈ ${pr.atrPct}% — proyeksi, bukan jaminan)`)
    out.push(`open ${pr.openHariIni} · wilayah wajar ${pr.bandBawah}–${pr.bandAtas} · breakout ${pr.bandAtas2}`)
    if (pr.dukungan.length) out.push(`dukungan: ${pr.dukungan.join(' → ')}`)
    if (pr.resistensi.length) out.push(`resistensi: ${pr.resistensi.join(' → ')}`)
  }
  // rencana warisan dari pick hari ini (bila koin ada di daftar tempur)
  try {
    const hasil = await picksHariIni()
    const pick = hasil?.picks.find((p) => p.symbol === b.simbol)
    const r = pick?.rencana
    if (hasil && pick && r) {
      out.push('')
      out.push(`<b>RENCANA WARISAN HARI INI</b> — pick ${esc(pick.direction)} · rank ${pick.rank ?? '—'} · keyakinan ${Math.round(pick.confidence)}%`)
      out.push(`masuk ${fmtHarga(pick.entryClose)} · stop ${fmtHarga(r.stop ?? null)} (${angka(r.stopPct ?? null, 1)}%)`)
      out.push(`target ${fmtHarga(r.target ?? null)} (${angka(r.targetPct ?? null, 1)}%, P ${Math.round((r.pTarget ?? 0) * 100)}%)`)
      out.push(`JUAL AMBISIUS ${fmtHarga(r.highAmbisius ?? null)} (${angka(r.ambisiusPct ?? null, 1)}%, P ${Math.round((r.pAmbisius ?? 0) * 100)}%)`)
      if (pick.alasan) out.push(`alasan utama: ${esc(pick.alasan)}`)
    }
  } catch { /* rencana non-vital */ }
  if (b.posisi) {
    const ps = b.posisi
    out.push('')
    out.push(`<b>VONIS MESIN POSISI: ${esc(ps.vonis)}</b> (keputusan final mesin)`)
    out.push(`entry ${ps.entry} ${ps.arah} · PnL bruto ${angka(ps.pnlBrutoPct, 2)}% (net ≈ ${angka(ps.pnlNetPct, 2)}%) · stop disiplin 1,5×ATR: ${ps.stopSaran}`)
    out.push(esc(ps.alasan).slice(0, 240))
  } else if (b.mintaEntry) {
    out.push('')
    out.push('Kamu menyebut posisi tanpa harga entry — sebutkan harga entry &amp; arah (contoh: "buy di 0.42"), nanti saya nilai posisimu dengan mesin posisi.')
  }
  out.push('')
  out.push('Sumber: Binance spot, dihitung detik ini — tanpa karangan.')
  return out.join('\n')
}

async function statusHtml(): Promise<string> {
  const hariUtc = new Date().toISOString().slice(0, 10)
  const n = bacaNegara()
  let arenaToday = ''
  try { arenaToday = (await db.meta.findUnique({ where: { key: 'arenaToday' } }))?.value ?? '' } catch { arenaToday = '(db sibuk)' }
  const lag = arenaToday ? Math.max(0, Math.round((Date.parse(hariUtc) - Date.parse(arenaToday)) / 86400000)) : -1
  let jumlahPick = 0
  let status = '—'
  let regime = '—'
  try {
    const h = await picksHariIni(hariUtc)
    if (h) { jumlahPick = h.picks.length; status = h.status; regime = h.regime }
  } catch { /* biarkan 0 */ }
  const sirensHariIni = Object.keys(n.sirens).filter((k) => k.startsWith(`${hariUtc}:`)).length
  const pollingDetik = n.pollingHidup ? Math.round((Date.now() - n.pollingHidup) / 1000) : -1
  const lagTeks = lag < 0 ? 'belum ada data' : lag === 0 ? 'SEGAR (0 hari)' : `TERLAMBAT ${lag} hari — mesin mengejar`
  return [
    `<b>STATUS OTAK MICAPROFITA</b> · ${esc(waktuWib())}`,
    `Data arena: <b>${lagTeks}</b> (arenaToday ${esc(arenaToday || '—')})`,
    `Hari pertarungan ${esc(hariUtc)}: status ${esc(status)} · rezim ${esc(regime)} · pick MICAPROFITA <b>${jumlahPick}</b>`,
    `Siren jual-ambisius hari ini: ${sirensHariIni} koin sudah tersentuh &amp; diumumkan`,
    `Chat terdaftar: ${n.chats.length} · laporan pagi terakhir: ${esc(n.laporanTerakhir || 'belum pernah')}`,
    `Polling tanya-jawab: ${pollingDetik < 0 ? 'belum hidup' : `hidup (piket ${pollingDetik}s lalu)`}`,
    `Uptime proses: ${Math.round(process.uptime())} dtk`,
  ].join('\n')
}

async function tanganiPesan(m: PesanTg): Promise<void> {
  const teks = (m.text ?? '').trim()
  if (!teks) return
  const chatId = m.chat.id
  const nama = m.from?.first_name || m.chat.first_name || m.chat.username || m.chat.title || 'Pemilik'

  // daftar otomatis semua chat yang menulis
  const baru = daftarChatBaru(chatId, nama)

  const perintah = teks.toLowerCase()
  if (perintah.startsWith('/start') || perintah.startsWith('/mulai')) {
    await kirimPesan(chatId, sambutan(nama))
    if (baru) {
      const n = bacaNegara()
      if (n.laporanTerakhir !== hariWib()) {
        // laporan pagi hari ini belum terkirim ke siapa pun → antarkan sekarang
        await kirimLaporanSekarang(chatId)
      }
    }
    return
  }
  if (perintah.startsWith('/bantuan') || perintah.startsWith('/help')) {
    await kirimPesan(chatId, BANTUAN)
    return
  }
  if (perintah.startsWith('/status')) {
    await kirimPesan(chatId, await statusHtml())
    return
  }
  if (perintah.startsWith('/laporan')) {
    await kirimLaporanSekarang(chatId)
    return
  }
  if (perintah.startsWith('/koin')) {
    const q = teks.slice(5).trim()
    if (!q) {
      await kirimPesan(chatId, 'Sebut simbolnya: <code>/koin BTC</code> atau <code>/koin JCT</code>.')
      return
    }
    await jawabBedah(chatId, q)
    return
  }
  // teks bebas → biarkan mesin bedah mengenali maksudnya
  await jawabBedah(chatId, teks)
}

async function jawabBedah(chatId: number, q: string): Promise<void> {
  try {
    const html = await formatDetailKoin(q)
    if (html) {
      await kirimPesan(chatId, html)
      return
    }
    await kirimPesan(chatId, `Saya belum bisa mengenali koin dalam "${esc(q.slice(0, 80))}". Coba format: <code>/koin BTC</code>, atau sebutkan nama simbolnya langsung (contoh: "cek SOL").`)
  } catch (e) {
    await kirimPesan(chatId, `Mesin sedang tersandung saat membedah: ${esc((e as Error).message.slice(0, 120))}. Coba lagi sebentar — saya jujur ketika gagal, tidak mengarang.`)
  }
}

function hariWib(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}

async function loopPolling(): Promise<void> {
  const { tgApi } = await import('./gateway')
  // bersihkan antrean lama agar tak menelan pesan basi berhari-hari
  const cuci = await tgApi('getUpdates', { timeout: 0, limit: 1, offset: -1 })
  if (cuci.ok && Array.isArray(cuci.result) && cuci.result.length > 0) {
    const terakhir = (cuci.result[0] as UpdateTg).update_id
    simpanOffset(terakhir + 1)
  }
  // eslint-disable-next-line no-constant-condition -- loop piket abadi sengaja tak berujung
  while (true) {
    try {
      const offset = bacaNegara().offsetUpdate
      const r = await tgApi('getUpdates', { timeout: 25, limit: 20, offset, allowed_updates: ['message'] }, 40_000)
      if (r.ok && Array.isArray(r.result)) {
        for (const u of r.result as UpdateTg[]) {
          try {
            if (u.message?.text) await tanganiPesan(u.message)
          } catch (e) {
            console.error('[telegram] tangani pesan gagal:', (e as Error).message?.slice(0, 120))
          }
          simpanOffset(u.update_id + 1)
        }
      } else if (r.ok && !Array.isArray(r.result)) {
        await new Promise((res) => setTimeout(res, 5000))
      } else {
        // 409 = polling ganda (proses kembar) → tidur panjang, jangan serang
        if (r.deskripsi && /409|conflict/i.test(r.deskripsi)) await new Promise((res) => setTimeout(res, 30_000))
        else await new Promise((res) => setTimeout(res, 6000))
      }
    } catch {
      await new Promise((res) => setTimeout(res, 8000))
    }
  }
}

export function mulaiPolling(): void {
  const g = globalThis as typeof globalThis & { __arenaTelegramPolling?: boolean }
  if (g.__arenaTelegramPolling) return
  g.__arenaTelegramPolling = true
  console.log(`[telegram] polling tanya-jawab mulai — chat terdaftar: ${daftarChat().length}`)
  void loopPolling()
}
