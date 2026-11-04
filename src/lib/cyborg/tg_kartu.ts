// ============================================================
// V303-TELEGRAM-KARTU — Penerjemah angka otak → pesan presisi.
//
// Mandat ④: "mampu kirimkan detail koin dengan presisi dan jelas"
// Mandat ①: laporan pagi 50 koin teraudit (BattleDay hari hidup)
// Mandat ②: teks notifikasi JUAL AMBISIUS (level warisan q75)
//
// Kejujuran abadi: angka hanya dari data nyata (Binance live, DB
// arena). Data gagal terjangkau → dinyatakan jujur, TIDAK diarang.
// ============================================================

import { db } from '@/lib/db'
import { escapeHtml } from './tg'
import type { BedahKoin } from './koin'
import { getClimate, getUniverse } from './market'
import { bacaEvidence } from './evidence'

// ---------------- Format angka ----------------

export function fmtPx(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
  if (a >= 1) return n.toFixed(a >= 100 ? 2 : 4)
  if (a >= 0.01) return n.toFixed(5)
  return n.toPrecision(4)
}

function sgn(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
}

function fmtVol(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' M'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' jt'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' rb'
  return n.toFixed(0)
}

function jamWib(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 16).replace('T', ' ')
}

// ---------------- Kartu bedah koin (mandat ③④) ----------------

export function kartuKoinTeks(b: BedahKoin, rencanaTempur?: { rencana: RencanaEvidensi | null; arah?: string; hari?: string } | null): string {
  const L: string[] = []
  const judul = b.simbol ?? b.ditanya
  L.push(`🔍 <b>BEDAH KOIN</b> — ${escapeHtml(judul)}`)

  if (!b.terdaftar) {
    if (b.yakinTakTerdaftar) {
      L.push(`❌ "${escapeHtml(b.ditanya)}" TIDAK KUKETEMUKAN sebagai pasangan spot aktif Binance (pemeriksa keanggotaan sudah benar-benar menjawab). Aku jujur — tidak mengarang data.`)
      if (b.saran.length) L.push(`🔎 Ticker mirip yang sah: ${b.saran.map(escapeHtml).join(', ')}`)
    } else {
      L.push('⚠️ Pemeriksa Binance sedang tak terjangkau — coba lagi sebentar. Aku tidak mengarang data.')
    }
    L.push(`🕐 ${jamWib()} WIB`)
    return L.join('\n')
  }

  if (b.harga === null || !Number.isFinite(b.harga)) {
    L.push('⚠️ Koin terdaftar, tapi harga live sedang tak terjangkau — coba lagi sebentar (aku tidak mengarang).')
    L.push(`🕐 ${jamWib()} WIB`)
    return L.join('\n')
  }

  L.push(`💰 Harga live: <b>${fmtPx(b.harga)}</b>${b.ubah24Pct !== null && b.ubah24Pct !== undefined ? ` (${sgn(b.ubah24Pct)}% 24j)` : ''}`)
  if (b.tinggi24 !== null && b.rendah24 !== null) {
    L.push(`📊 24 jam: tinggi ${fmtPx(b.tinggi24)} · rendah ${fmtPx(b.rendah24)}${b.volQv ? ` · vol ${fmtVol(b.volQv)} USDT` : ''}`)
  }
  if (b.pnlKasar) L.push(`🧮 ${escapeHtml(b.pnlKasar)}`)

  if (b.faktor) {
    const f = b.faktor
    L.push(`🧭 Faktor: mom7 ${sgn(f.mom7)}% · mom30 ${sgn(f.mom30)}% · RSI ${f.rsi.toFixed(1)} · ATR ${f.atrPct.toFixed(1)}% · volSurge ${f.volSurge.toFixed(2)}× · jarak puncak60 ${sgn(f.distHigh)}% · korr BTC ${f.btcCorr.toFixed(2)}`)
  }
  if (b.vonis) {
    L.push(`⚖️ <b>VONIS: ${escapeHtml(b.vonis.arah)}</b> (keyakinan ${Math.round(b.vonis.keyakinan)}%)`)
    L.push(`↳ ${escapeHtml(b.vonis.alasan)}`)
  }
  if (b.proyeksi) {
    const p = b.proyeksi
    L.push(`🎯 Pita hari ini: ${fmtPx(p.bandBawah)} – ${fmtPx(p.bandAtas)} (breakout ${fmtPx(p.bandAtas2)}) · ATR ${p.atrPct.toFixed(1)}%`)
    if (p.dukungan?.length) L.push(`🛡️ Dukungan: ${p.dukungan.slice(0, 3).map((x) => fmtPx(x)).join(' · ')}`)
    if (p.resistensi?.length) L.push(`🚧 Resistensi: ${p.resistensi.slice(0, 3).map((x) => fmtPx(x)).join(' · ')}`)
  }
  if (b.posisi) {
    const p = b.posisi
    L.push(`🧾 Posisimu ${escapeHtml(p.arah)} entry ${fmtPx(p.entry)}: PnL net ${sgn(p.pnlNetPct)}% → <b>${escapeHtml(p.vonis)}</b>`)
    L.push(`↳ ${escapeHtml(p.alasan)} · stop saran ${fmtPx(p.stopSaran)}`)
  }
  if (b.mintaEntry) L.push('💡 Sebutkan harga entrymu (mis. «beli di 0.1475») supaya aku vonis posisimu.')

  if (rencanaTempur) {
    const br = barisRencana(rencanaTempur.rencana)
    if (rencanaTempur.rencana && br) {
      L.push('')
      L.push(`⚔️ <b>RENCANA TEMPUR HARI INI</b>${rencanaTempur.arah ? ` (${escapeHtml(rencanaTempur.arah)})` : ''} — koin ini ADA di daftar ${rencanaTempur.hari ? escapeHtml(rencanaTempur.hari) : 'hari hidup'}:`)
      L.push(`   ${br}`)
      L.push('💡 AMBISIUS = jual untung besar (q75) · POWER-MAX = puncak harian (q90) — tersentuh → notif otomatis.')
    } else {
      L.push('📄 Koin ini belum punya rencana pra-registrasi terkunci hari ini (denyut sedang menanam rencana).')
    }
  }

  L.push(`🕐 ${jamWib()} WIB · ${escapeHtml(b.sumber)}`)
  return L.join('\n')
}

// ---------------- Laporan pagi (mandat ①) ----------------

export interface RencanaEvidensi {
  entry?: number
  stop?: number | null
  target?: number | null
  targetPct?: number | null
  stopPct?: number | null
  highAmbisius?: number | null
  ambisiusPct?: number | null
  pAmbisius?: number | null
  powerMax?: number | null
  powerMaxPct?: number | null
  pPowerMax?: number | null
  netUntungPct?: number | null
  ketGuard?: string
}

// URUTAN RESMI = SAMA PERSIS dengan dasbor web (getArenaState):
// guard LOLOS dulu → rank kecil dulu → sisanya urutan DB.
// Insiden sinkron: dulu laporan urut confidence → daftar terlihat
// beda dari web. Kini satu hukum urutan untuk web & Telegram.
export function urutSepertiWeb<T extends { evidence?: unknown; symbol: string }>(rows: T[]): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      // evidence DB = STRING JSON — baca lewat satu pintu (sama seperti web)
      const ea = bacaEvidence(a.r.evidence)
      const eb = bacaEvidence(b.r.evidence)
      const ga = ea.guard === 'DITOLAK' ? 1 : 0
      const gb = eb.guard === 'DITOLAK' ? 1 : 0
      if (ga !== gb) return ga - gb
      const ra = typeof ea.rank === 'number' ? ea.rank : 999
      const rb = typeof eb.rank === 'number' ? eb.rank : 999
      if (ra !== rb) return ra - rb
      return a.i - b.i
    })
    .map((x) => x.r)
}

/** Baris level rencana tempur — dipakai laporan pagi & kartu bedah. */
export function barisRencana(r: RencanaEvidensi | null | undefined): string {
  if (!r || !r.entry || !Number.isFinite(r.entry)) return ''
  const parts: string[] = []
  parts.push(`🎯 entry <b>${fmtPx(r.entry)}</b>`)
  if (r.target != null && Number.isFinite(r.target)) parts.push(`sasaran ${fmtPx(r.target)}${r.targetPct != null && Number.isFinite(r.targetPct) ? ` (+${r.targetPct.toFixed(1)}%)` : ''}`)
  if (r.highAmbisius != null && Number.isFinite(r.highAmbisius)) parts.push(`📊 <b>AMBISIUS ${fmtPx(r.highAmbisius)}</b>${r.ambisiusPct != null && Number.isFinite(r.ambisiusPct) ? ` (+${r.ambisiusPct.toFixed(1)}%)` : ''}`)
  if (r.powerMax != null && Number.isFinite(r.powerMax)) parts.push(`⚡ <b>POWER-MAX ${fmtPx(r.powerMax)}</b>${r.powerMaxPct != null && Number.isFinite(r.powerMaxPct) ? ` (+${r.powerMaxPct.toFixed(1)}%)` : ''}`)
  if (r.stop != null && Number.isFinite(r.stop)) parts.push(`🛑 stop ${fmtPx(r.stop)}${r.stopPct != null && Number.isFinite(r.stopPct) ? ` (${r.stopPct.toFixed(1)}%)` : ''}`)
  return parts.join(' · ')
}

export async function laporanPagiTeks(): Promise<string> {
  const arenaToday =
    (await db.meta.findUnique({ where: { key: 'arenaToday' } }).catch(() => null))?.value ??
    new Date().toISOString().slice(0, 10)

  let bd = await db.battleDay.findUnique({ where: { day: arenaToday }, include: { picks: true } }).catch(() => null)
  if (!bd || bd.picks.length === 0) {
    bd = await db.battleDay.findFirst({ orderBy: { day: 'desc' }, include: { picks: true } }).catch(() => null)
  }
  if (!bd) {
    return '🌅 <b>MICAPROFITA · LAPORAN PAGI</b>\n⚠️ Belum ada hari pertarungan di DB — denyut arena mungkin baru bangun. Coba /status sebentar lagi.'
  }

  const mine = urutSepertiWeb(
    bd.picks.filter((p) => p.competitor === 'MICAPROFITA'),
  ).slice(0, 50)

  // harga live (cache ticker 10 menit — 1 request)
  const harga = new Map<string, { p: number; chg: number }>()
  try {
    const u = await getUniverse()
    for (const i of u) harga.set(i.symbol, { p: i.lastPrice, chg: i.changePct })
  } catch { /* jujur tampil — */ }

  const iklim = await getClimate().catch(() => null)

  const L: string[] = []
  L.push('🌅 <b>MICAPROFITA · LAPORAN PAGI</b>')
  L.push(`📅 ${escapeHtml(bd.day)} · rezim <b>${escapeHtml(bd.regime)}</b> · audit ${bd.status === 'SCORED' ? '✅ dinilai candle real' : '✅ teraudit (vonis besok)'}`)
  if (iklim && iklim.fng !== null) {
    L.push(`🌡️ Fear &amp; Greed ${iklim.fng} (${escapeHtml(iklim.fngClass ?? '—')})${iklim.btcDominance !== null ? ` · dominasi BTC ${iklim.btcDominance.toFixed(1)}%` : ''}`)
  }
  L.push(`⚔️ <b>DAFTAR TEMPUR ${mine.length} KOIN TERJAMIN</b> (hasil audit pipeline, bebas kebocoran):`)

  mine.forEach((p, i) => {
    const sym = p.symbol.replace(/USDT$/, '')
    const ev = bacaEvidence(p.evidence) as { rencana?: RencanaEvidensi; reason?: string; guardAlasan?: string }
    const r = ev?.rencana
    const h = harga.get(p.symbol)
    const alasan = typeof ev?.reason === 'string' && ev.reason.trim()
      ? ev.reason
      : typeof ev?.guardAlasan === 'string' && ev.guardAlasan.trim()
        ? ev.guardAlasan
        : typeof r?.ketGuard === 'string' ? r.ketGuard : ''
    L.push(
      `#${i + 1} <b>${escapeHtml(sym)}</b> ${p.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL'} ${Math.round(p.confidence)}%` +
        (h ? ` · ${fmtPx(h.p)} (${sgn(h.chg)}% 24j)` : ' · harga —'),
    )
    const br = barisRencana(r)
    if (br) L.push(`   ${br}`)
    else if (h) L.push(`   🎯 entry (close T-1) <b>${fmtPx(h.p)}</b> · level lengkap menyusul saat rencana pra-registrasi terkunci`)
    if (alasan) L.push(`   💬 ${escapeHtml(alasan.slice(0, 140))}`)
  })

  L.push('')
  L.push('⚠️ Jujur: pick hari hidup PENDING — dinilai candle real besok; rencana after-fee 0.4%. Level <b>AMBISIUS</b> = jual untung besar Monte-Carlo q75 · <b>POWER-MAX</b> = puncak q90. Urutan = sama persis dengan dasbor web. Tersentuh → notifikasi otomatis ke sini.')
  return L.join('\n')
}

// ---------------- Teks JUAL AMBISIUS (mandat ②) ----------------

export function teksJualAmbisius(d: {
  day: string
  symbol: string
  arah: 'BUY' | 'SELL'
  entry: number | null
  harga: number
  level: number
  ambisiusPct: number | null
  target: number | null
  stop: number | null
  pAmbisius: number | null
  keyakinan: number
  regime: string
}): string {
  const sym = d.symbol.replace(/USDT$/, '')
  return [
    '🚨 <b>JUAL AMBISIUS TERSentuh</b> 🚨',
    `⚔️ <b>${escapeHtml(sym)}</b> (${d.arah}) — harga <b>${fmtPx(d.harga)}</b> kini menyentuh level jual ambisius <b>${fmtPx(d.level)}</b>${d.ambisiusPct != null && Number.isFinite(d.ambisiusPct) ? ` (${sgn(Math.abs(d.ambisiusPct))}% dari entry)` : ''}`,
    `📍 entry ${fmtPx(d.entry)} · target ${fmtPx(d.target)} · stop ${fmtPx(d.stop)}${d.pAmbisius != null && Number.isFinite(d.pAmbisius) ? ` · peluang sentuh (MC) ${Math.round(d.pAmbisius * 100)}%` : ''}`,
    `🧠 keyakinan pick ${Math.round(d.keyakinan)}% · rezim ${escapeHtml(d.regime)} · hari ${escapeHtml(d.day)}`,
    '💡 Level ambisius = perkiraan tertinggi Monte-Carlo q75 — pertimbangkan amankan profit; keputusan akhir tetap milikmu.',
    `🕐 ${jamWib()} WIB`,
  ].join('\n')
}

// ---------------- Teks JUAL POWER-MAX (warisan q90) ----------------

export function teksPowerMax(d: {
  day: string
  symbol: string
  arah: 'BUY' | 'SELL'
  entry: number | null
  harga: number
  level: number
  powerMaxPct: number | null
  target: number | null
  stop: number | null
  keyakinan: number
  regime: string
}): string {
  const sym = d.symbol.replace(/USDT$/, '')
  return [
    '⚡ <b>JUAL POWER-MAX TERSENTUH</b> ⚡',
    `🔥 <b>${escapeHtml(sym)}</b> (${d.arah}) — harga <b>${fmtPx(d.harga)}</b> menembus puncak harian <b>${fmtPx(d.level)}</b>${d.powerMaxPct != null && Number.isFinite(d.powerMaxPct) ? ` (+${Math.abs(d.powerMaxPct).toFixed(1)}% dari entry)` : ''}`,
    `📍 entry ${fmtPx(d.entry)} · sasaran ${fmtPx(d.target)} · stop ${fmtPx(d.stop)}`,
    `🧠 keyakinan pick ${Math.round(d.keyakinan)}% · rezim ${escapeHtml(d.regime)} · hari ${escapeHtml(d.day)}`,
    '💡 POWER-MAX = kuantil q90 lintasan Monte-Carlo — profit harian paling dalam. Amankan profit atau naikkan stop ke level ini; keputusan akhir tetap milikmu.',
    `🕐 ${jamWib()} WIB`,
  ].join('\n')
}
