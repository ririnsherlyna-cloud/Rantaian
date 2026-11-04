#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// PENJAGA TELEGRAM — bot real-time MICAPROFITA (mandat pemilik):
//  (1) laporan koin = SUMBER SAMA dengan otak z.ai (/api/arena) +
//      detail lengkap: entry, TP (jual ambisius), JUAL POWER MAX
//      (highAmbisius), stop loss, peluang, alasan/penjelasan.
//  (2) real-time long-polling (getUpdates timeout 25 dtk, loop tanpa
//      jeda) + ack instan utk perintah berat → TIDAK ADA chat tanpa
//      jawaban; setiap pesan selalu dijawab (fallback = bantuan).
//  (3) anti-patah: try/catch menyeluruh, retry, offset persist —
//      pesan tak hilang saat crash (Telegram redeliver).
//  (4) laporan pagi otomatis 07:05 WIB (00:05 UTC) ke semua chat kenal.
//
// Singleton (pidfile) — dinyalakan oleh instrumentation.ts saat boot
// server & dijaga hidup oleh watchdog_server.sh.
// Token: dibaca dari .token-telegram (600, gitignored).
// ═══════════════════════════════════════════════════════════════════
import fs from 'fs'
import path from 'path'
import { spawn, execFile } from 'child_process'

const ROOT = process.env.PENJAGA_ROOT || '/home/z/my-project'
const DB = path.join(ROOT, 'db', 'telegram')
fs.mkdirSync(DB, { recursive: true })

let TOK = ''
try {
  TOK = fs.readFileSync(path.join(ROOT, '.token-telegram'), 'utf8').trim()
} catch {}
if (!TOK) {
  console.log('[TG-JAGA] .token-telegram tidak ada → keluar')
  process.exit(1)
}
const API = `https://api.telegram.org/bot${TOK}`

// ── Singleton ───────────────────────────────────────────────────────
const PIDF = path.join(ROOT, 'db', 'telegram.pid')
try {
  const lama = fs.readFileSync(PIDF, 'utf8').trim()
  if (lama && +lama !== process.pid) {
    try {
      process.kill(+lama, 0)
      console.log(`[TG-JAGA] sudah hidup (pid ${lama}) → keluar`)
      process.exit(0)
    } catch {}
  }
} catch {}
fs.writeFileSync(PIDF, String(process.pid))
process.on('exit', () => { try { fs.unlinkSync(PIDF) } catch {} })

// ── Simpanan kecil ──────────────────────────────────────────────────
const bacaFile = (f, d) => { try { return fs.readFileSync(path.join(DB, f), 'utf8') } catch { return d } }
const tulisFile = (f, s) => { try { fs.writeFileSync(path.join(DB, f), String(s)) } catch {} }
const bacaJson = (f, d) => { try { return JSON.parse(bacaFile(f, JSON.stringify(d))) } catch { return d } }

let offset = parseInt(bacaFile('offset.txt', '0'), 10) || 0
const chat = () => bacaJson('chat.json', {}) // { "<chatId>": {nama, terakhir} }
const ingatChat = (id, nama) => {
  const c = chat()
  if (!c[id]) {
    c[id] = { nama: nama || 'tanpa-nama', pertama: new Date().toISOString() }
    tulisFile('chat.json', JSON.stringify(c, null, 1))
    console.log(`[TG-JAGA] chat baru diingat: ${id} (${nama})`)
  }
}

// ── Telegram API ────────────────────────────────────────────────────
async function tg(method, body, timeoutMs = 40000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: c.signal,
    })
    const j = await r.json().catch(() => null)
    if (!j || !j.ok) throw new Error(`${method}: ${JSON.stringify(j).slice(0, 140)}`)
    return j.result
  } finally {
    clearTimeout(t)
  }
}

// ── ANTREAN ANTI-HILANG (V304 — akar aduan pemilik: "kadang tak ada
// notification masuk... ternyata telegram mati kala itu") ────────────
// Gejala lama: pecahKirim menelan kegagalan kirim (.catch kosong) → laporan
// TP/ambisius/power max HILANG SELAMANYA padahal kejadian sudah dicatat.
// Kini: gagal kirim → pesan masuk antrean persist (db/telegram/antrian.json)
// → diulang otomatis tiap 60 dtk sampai Telegram hidup lagi. Tidak ada
// laporan yang boleh lenyap — paling banter TERLAMBAT, bukan hilang.
let antrian = []
try { antrian = JSON.parse(bacaFile('antrian.json', '[]')) } catch { antrian = [] }
if (!Array.isArray(antrian)) antrian = []
const simpanAntrian = () => tulisFile('antrian.json', JSON.stringify(antrian, null, 1))

function pecahKirim(chatId, teks, tag = 'umum') {
  const potong = []
  for (let i = 0; i < teks.length; i += 3800) potong.push(teks.slice(i, i + 3800))
  return (async () => {
    let gagal = null
    for (const p of potong) {
      try {
        await tg('sendMessage', { chat_id: chatId, text: p, disable_web_page_preview: true })
      } catch (e) {
        gagal = e
        console.log('[TG-JAGA] kirim gagal:', e.message)
      }
    }
    if (gagal) {
      antrian.push({ chatId: String(chatId), teks, tag, dibuat: new Date().toISOString(), percobaan: 0 })
      simpanAntrian()
      console.log(`[TG-JAGA] ANTRE(${tag}): kirim gagal → ${antrian.length} pesan menunggu, diulang tiap 1 mnt`)
    }
  })()
}

let flushJalan = false
async function flushAntrian() {
  if (flushJalan || !antrian.length) return
  flushJalan = true
  try {
    const sisa = []
    for (const item of antrian) {
      if (item.percobaan >= 240) {
        // 4 jam gagal terus → arsip jujur (antrian_gagal.json), jangan tumpuk abadi
        const g = bacaJson('antrian_gagal.json', [])
        g.push({ ...item, diarsip: new Date().toISOString() })
        tulisFile('antrian_gagal.json', JSON.stringify(g, null, 1))
        console.log(`[TG-JAGA] ANTRE(${item.tag}) diarsip setelah ${item.percobaan} percobaan gagal`)
        continue
      }
      try {
        const potong = []
        for (let i = 0; i < item.teks.length; i += 3800) potong.push(item.teks.slice(i, i + 3800))
        let gagal = null
        for (const p of potong) {
          try {
            await tg('sendMessage', { chat_id: item.chatId, text: p, disable_web_page_preview: true })
          } catch (e) { gagal = e }
        }
        if (gagal) throw gagal
        console.log(`[TG-JAGA] ANTRE(${item.tag}) TERTIRIM dari antrean (semula gagal ${item.percobaan}x)`)
      } catch {
        item.percobaan++
        sisa.push(item)
      }
    }
    if (sisa.length !== antrian.length) {
      antrian = sisa
      simpanAntrian()
    }
  } finally {
    flushJalan = false
  }
}
setInterval(() => { flushAntrian().catch(() => {}) }, 60_000).unref?.()

async function apiLokal(jalur, timeoutMs = 45000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(`http://127.0.0.1:3000${jalur}`, { signal: c.signal })
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

// ── Formatter ───────────────────────────────────────────────────────
// V304 FIX PEPE (aduan pemilik 27 Okt: "harga 0 aja di telegram"): pembulatan
// lama Math.round(x*10000)/10000 membulatkan harga sub-0,0001 — PEPE
// 0,00000432 → "0", SEMUA level entry/TP/ambisius tampil 0. Kini digit
// signifikan (6) utk harga < 1 — IDENTIK fmtPx arena-console (SUMBER SAMA).
const rp = (x) => {
  if (typeof x !== 'number' || !isFinite(x)) return '—'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1000) return x.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (a >= 1) return String(+x.toFixed(4))
  return x.toPrecision(6).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}
const pct = (x) => (typeof x === 'number' && isFinite(x) ? `${x > 0 ? '+' : ''}${x.toFixed(2)}%` : '—')
const jamWIB = (d = new Date()) => d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
const umur = (iso) => {
  if (!iso) return '—'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt lalu`
  const j = Math.floor(m / 60)
  if (j < 24) return `${j} j ${m % 60} mnt lalu`
  return `${Math.floor(j / 24)} hari lalu`
}

function barisKoin(p) {
  const ev = p.evidence || {}
  const rn = p.rencana || ev.rencana || null
  const rank = typeof ev.rank === 'number' ? ev.rank : '?'
  const arah = p.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL'
  const out = []
  out.push(`#${rank} ${p.symbol} — ${arah} (keyakinan ${pct(typeof p.confidence === 'number' ? p.confidence : null)})`)
  if (p.guard === 'DITOLAK' || ev.guard === 'DITOLAK') out.push(`   ⛔ DITOLAK GUARD: ${p.guardAlasan || ev.guardAlasan || 'alasan tak tercatat'}`)
  if (rn) {
    out.push(`   • Entry: ${rp(rn.entry)}`)
    out.push(`   • TP / Sasaran: ${rp(rn.target)} (${pct(rn.targetPct)}) — peluang ${rn.pTarget != null ? `${Math.round(rn.pTarget * 100)}%` : '—'}`)
    out.push(`   • JUAL AMBISIUS: ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}) — sentuh = dipastikan turun (peluang ${rn.pAmbisius != null ? `${Math.round(rn.pAmbisius * 100)}%` : '—'})`)
    if (typeof rn.powerMaxAmbisius === 'number') {
      out.push(`   • JUAL POWER MAX: ${rp(rn.powerMaxAmbisius)} (${pct(rn.powerMaxPct)}) — tercapai = butuh nafas panjang, terjun diperkirakan (peluang ${rn.pPowerMax != null ? `${Math.round(rn.pPowerMax * 100)}%` : '—'})`)
    }
    out.push(`   • Stop Loss: ${rp(rn.stop)} (${pct(rn.stopPct)}) — peluang kena ${rn.pStop != null ? `${Math.round(rn.pStop * 100)}%` : '—'}`)
    if (rn.ketGuard) out.push(`   • Guard: ${String(rn.ketGuard).slice(0, 120)}`)
  } else if (p.entryClose) {
    out.push(`   • Entry (close hari): ${rp(p.entryClose)} — rencana level belum diterbitkan baris ini`)
  }
  const alasan = p.topReasons || ev.topReasons || []
  if (Array.isArray(alasan) && alasan.length) out.push(`   • Alasan: ${alasan.slice(0, 2).join(' | ').slice(0, 220)}`)
  if (typeof p.liveRetPct === 'number') out.push(`   • Live: ${rp(p.livePrice)} (${pct(p.liveRetPct)})`)
  if (p.verdict && p.verdict.note) out.push(`   • Vonis: ${String(p.verdict.kind)} — ${String(p.verdict.note).slice(0, 140)}`)
  return out.join('\n')
}

// ── HUKUM AUTO-LAPOR ARENA (mandat pemilik 27 Okt 2026) ────────────
// "laporan di telegram daftar koin, kena tp, jual ambisius itu harus ada
//  laporan masuk ke telegram" — Telegram = alat ukur kehidupan otak.
// Monitor tiap 5 menit dari SUMBER SAMA (/api/arena), anti-dobel via
// state persist db/telegram/auto_lapor.json (selamat dari restart).
const stLapor = () => bacaJson('auto_lapor.json', { hari: '', koinTerlapor: [], tp: {}, ambisius: {}, powerMax: {}, stop: {} })
let autoLapor = stLapor()
const simpanAutoLapor = () => tulisFile('auto_lapor.json', JSON.stringify(autoLapor, null, 1))

async function siar(teks) {
  const semua = Object.keys(chat())
  for (const id of semua) await pecahKirim(id, teks).catch(() => {})
  if (semua.length) console.log(`[TG-JAGA] siar terkirim ke ${semua.length} chat (${String(teks).slice(0, 60).replace(/\n/g, ' ')}...)`)
}

// V304 PELACAK MONITOR: waktu & hasil putaran terakhir → dipakai perintah
// "periksa aktivasi" utk membuktikan pemantau TP/ambisius/power max hidup.
let monitorTerakhir = { at: null, picks: 0, peristiwa: 0, hasil: 'belum pernah jalan' }

async function monitorArena() {
  let a
  try {
    a = await apiLokal('/api/arena', 45000)
  } catch {
    monitorTerakhir.hasil = 'server otak belum siap'
    return // server belum siap — tunggu putaran berikut, tanpa bising
  }
  const hari = a?.today || a?.dataDay || '?'
  if (hari === '?') {
    monitorTerakhir.hasil = 'arena belum menerbitkan hari'
    return
  }
  if (autoLapor.hari !== hari) autoLapor = { hari, koinTerlapor: [], tp: {}, ambisius: {}, powerMax: {}, stop: {} }
  const pulseMap = new Map((a?.pulse?.items || []).map((x) => [x.symbol, x]))
  const picks = (a?.todayPicks || []).filter((p) => p.competitor === 'MICAPROFITA')
  const gabung = picks.map((p) => ({ ...p, ...(pulseMap.get(p.symbol) || {}), evidence: { ...(p.evidence || {}), ...(pulseMap.get(p.symbol) || {}) } }))
  const lolos = gabung.filter((p) => (p.evidence?.rank ?? 99) <= 50 && !(p.evidence?.guard === 'DITOLAK' || p.guard === 'DITOLAK'))

  // 1) Daftar koin baru → lapor sekali (tunggu daftar cukup penuh ≥5 agar tak bising parsial)
  const baru = lolos.filter((p) => !autoLapor.koinTerlapor.includes(p.symbol))
  if (baru.length && lolos.length >= 5) {
    let m = `🎯 KOIN TERDAFTAR (${hari}) — sumber otak z.ai, ${baru.length} koin baru\n`
    for (const p of baru) m += barisKoin(p) + '\n\n'
    await siar(m.trim())
    autoLapor.koinTerlapor.push(...baru.map((p) => p.symbol))
    simpanAutoLapor()
  }

  // 2) Kena TP / Jual ambisius / Sentuh stop → lapor SEKALI per peristiwa per hari
  let peristiwa = 0
  for (const p of lolos) {
    const rn = p.rencana || p.evidence?.rencana || null
    const lp = typeof p.livePrice === 'number' ? p.livePrice : null
    if (!rn || lp == null) continue
    const arahBuy = p.direction === 'BUY'
    if (typeof rn.target === 'number' && !autoLapor.tp[p.symbol] && (arahBuy ? lp >= rn.target : lp <= rn.target)) {
      autoLapor.tp[p.symbol] = true
      peristiwa++
      const pm = typeof rn.powerMaxAmbisius === 'number'
      await siar(pm
        ? `✅ KENA TP — ${p.symbol} (${p.direction})\nLive ${rp(lp)} menyentuh target ${rp(rn.target)} (${pct(rn.targetPct)}).\nLevel panen berikutnya: JUAL AMBISIUS ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}) → JUAL POWER MAX ${rp(rn.powerMaxAmbisius)} (${pct(rn.powerMaxPct)}).`
        : `✅ KENA TP — ${p.symbol} (${p.direction})\nLive ${rp(lp)} menyentuh target ${rp(rn.target)} (${pct(rn.targetPct)}).\nLevel panen berikutnya: JUAL AMBISIUS ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}).`).catch(() => {})
    }
    if (typeof rn.highAmbisius === 'number' && !autoLapor.ambisius[p.symbol] && (arahBuy ? lp >= rn.highAmbisius : lp <= rn.highAmbisius)) {
      autoLapor.ambisius[p.symbol] = true
      peristiwa++
      await siar(`🔥 JUAL AMBISIUS Tersentuh — ${p.symbol} (${p.direction})\nLive ${rp(lp)} melampaui ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}) — harga terlentang: dipastikan turun kemudian${typeof rn.powerMaxAmbisius === 'number' ? ` (atap pamungkas: POWER MAX ${rp(rn.powerMaxAmbisius)})` : ''}.`).catch(() => {})
    }
    if (typeof rn.powerMaxAmbisius === 'number' && !autoLapor.powerMax[p.symbol] && (arahBuy ? lp >= rn.powerMaxAmbisius : lp <= rn.powerMaxAmbisius)) {
      autoLapor.powerMax[p.symbol] = true
      peristiwa++
      await siar(`🚀 JUAL POWER MAX AMBISIUS — ${p.symbol} (${p.direction})\nLive ${rp(lp)} melampaui ${rp(rn.powerMaxAmbisius)} (${pct(rn.powerMaxPct)}) — puncak paling terlentang: butuh nafas panjang, terjun diperkirakan.`).catch(() => {})
    }
    if (typeof rn.stop === 'number' && !autoLapor.stop[p.symbol] && (arahBuy ? lp <= rn.stop : lp >= rn.stop)) {
      autoLapor.stop[p.symbol] = true
      peristiwa++
      await siar(`🛑 SENTUH STOP LOSS — ${p.symbol} (${p.direction})\nLive ${rp(lp)} menembus stop ${rp(rn.stop)} (${pct(rn.stopPct)}) — jujur: putaran ini kalah, begitu sifat pasar.`).catch(() => {})
    }
  }
  monitorTerakhir = { at: new Date().toISOString(), picks: lolos.length, peristiwa, hasil: 'ok — semua koin dipantau' }
  simpanAutoLapor()
}

function jadwalMonitor() {
  const putaran = async () => {
    try {
      await monitorArena()
    } catch (e) {
      monitorTerakhir.hasil = `err: ${String(e).slice(0, 80)}`
      console.log('[TG-JAGA] monitor err:', String(e).slice(0, 120))
    }
  }
  setTimeout(putaran, 30000).unref?.()
  setInterval(putaran, 5 * 60 * 1000).unref?.()
  console.log('[TG-JAGA] monitor arena aktif: koin baru / kena TP / jual ambisius / stop → lapor tiap 5 menit')
}

async function laporanPenuh(chatId) {
  await pecahKirim(chatId, '⏳ Menyusun laporan lengkap dari otak z.ai...')
  const a = await apiLokal('/api/arena', 60000)
  const hari = a?.today || '?'
  const picks = (a?.todayPicks || []).filter((p) => p.competitor === 'MICAPROFITA')
  const pulse = a?.pulse?.items || []
  const mapPulse = new Map(pulse.map((x) => [x.symbol, x]))
  const gabung = picks.map((p) => ({ ...p, ...(mapPulse.get(p.symbol) || {}), evidence: { ...(p.evidence || {}), ...(mapPulse.get(p.symbol) || {}) } }))
  const lolos = gabung.filter((p) => (p.evidence?.rank ?? 99) <= 50 && !(p.evidence?.guard === 'DITOLAK' || p.guard === 'DITOLAK'))
  const ditolak = gabung.filter((p) => p.evidence?.guard === 'DITOLAK' || p.guard === 'DITOLAK')
  const stats = a?.daftarStats || null
  // V304: KLAIM JUJUR di kepala laporan — mandat pemilik "guru trader punya
  // klaim jujurnya": kumulatif vs puncak + genome tercatat tiap laporan.
  const mica = a ? (a.standings || []).find((s) => s.competitor === 'MICAPROFITA') : null
  const chart = (a?.chart || []).map((c) => c.MICAPROFITA ?? 0).filter((v) => typeof v === 'number')
  const puncakV = chart.length ? Math.max(...chart) : 0
  const puncakIdx = chart.length ? chart.indexOf(puncakV) : -1
  const puncakHari = puncakIdx >= 0 && a?.chart?.[puncakIdx] ? a.chart[puncakIdx].day : ''
  const mutasi = await mutasiGenome().catch(() => null)
  let isi = `📋 LAPORAN ${hari} — sumber otak z.ai (arena)\n`
  if (mica) isi += `📊 KLAIM JUJUR: kumulatif ${pct(mica.cumRet * 100)} · akurasi ${Math.round(mica.hitRate * 100)}%${puncakV > mica.cumRet * 100 ? ` · puncak ${pct(puncakV)} (${puncakHari}) — jujur: turun ${(puncakV - mica.cumRet * 100).toFixed(1)} poin, tiap kalah dipelajari` : ' · di puncak'}\n`
  if (mutasi) isi += `🧬 Genome: ${mutasi.replace(/\|/g, ' · ')}\n`
  if (stats) isi += `dipindai ${stats.dipindai ?? '—'} · dianalisa ${stats.dianalisa ?? '—'} · lolos ${stats.lolos ?? '—'} · ditolak ${stats.ditolak ?? '—'}\n`
  isi += `Rezim: ${a?.regime || '—'} · data hari ${a?.dataDay || '—'}${a?.stale ? ' ⚠️ STALE' : ''}\n`
  await pecahKirim(chatId, isi)

  if (!lolos.length && !ditolak.length) {
    await pecahKirim(chatId, 'Belum ada daftar koin hari ini — denyut arena belum melahirkan picks. Coba lagi setelah denyut selesai.')
    return
  }
  let buf = `🎯 DAFTAR TEMPUR (${lolos.length} koin)\n`
  for (const p of lolos) {
    const b = barisKoin(p) + '\n\n'
    if (buf.length + b.length > 3600) {
      await pecahKirim(chatId, buf)
      buf = ''
    }
    buf += b
  }
  if (buf.trim()) await pecahKirim(chatId, buf)
  if (ditolak.length) {
    let d = `⛔ DITOLAK GUARD (${ditolak.length})\n`
    for (const p of ditolak) {
      const alasan = p.guardAlasan || p.evidence?.guardAlasan || '?'
      const b = `• ${p.symbol} — ${alasan}\n`
      if (d.length + b.length > 3600) {
        await pecahKirim(chatId, d)
        d = ''
      }
      d += b
    }
    if (d.trim()) await pecahKirim(chatId, d)
  }
  await pecahKirim(chatId, '⚠️ Jujur: profit pasti tidak ada di pasar — level adalah rencana pra-registrasi ber-guard Monte Carlo, bukan janji. Sertakan manajemen risikomu sendiri.')
}

async function statusRingkas(chatId) {
  const h = await apiLokal('/api/health', 15000).catch(() => null)
  const a = await apiLokal('/api/arena', 60000).catch(() => null)
  const u = bacaJson(path.join(ROOT, 'db', 'ujian-rahasia', 'hasil.json'), null)
  const out = []
  out.push(`🫀 Server: ${h?.status || 'TAK MENJAWAB'} (uptime ${h?.uptimeDetik ?? '—'} dtk)`)
  if (a) {
    out.push(`🧠 Arena: hari ${a.today || '—'} · data ${a.dataDay || '—'}${a.stale ? ' ⚠️ STALE' : ''} · rezim ${a.regime || '—'} · bootstrap ${a.bootstrap?.status || '—'} ${a.bootstrap?.progress != null ? `(${a.bootstrap.progress}%)` : ''}`)
    const bc = a.bukuCuan
    if (bc && typeof bc === 'object') {
      const k = bc.ringkas || bc
      out.push(`💰 Buku cuan: ${JSON.stringify(k).slice(0, 220)}`)
    }
  } else out.push('🧠 Arena: tak menjawab (server compile / mati?)')
  if (u) out.push(`🏆 Ujian Rahasia terakhir: ${u.persen}% (${u.benar}/${u.totalSoal}) — ${u.lulus ? 'LULUS PENUH' : 'BELUM LULUS'}`)
  await pecahKirim(chatId, out.join('\n'))
}

async function ujianRingkas(chatId) {
  const u = bacaJson(path.join(ROOT, 'db', 'ujian-rahasia', 'hasil.json'), null)
  const keb = bacaJson(path.join(ROOT, 'db', 'ujian-rahasia', 'kebenaran.json'), null)
  if (!u) {
    await pecahKirim(chatId, 'Ujian Rahasia belum dijalankan. Jalankan: POST /api/ujian-rahasia {aksi:"tempa"}')
    return
  }
  const tipe = Object.entries(u.perTipe || {})
    .map(([t, v]) => `${t} ${v.benar}/${v.total}`)
    .join(' · ')
  const gila = (keb?.koin || [])
    .filter((k) => k.gainPct >= 24000 && k.catatan === 'ok')
    .slice(0, 8)
    .map((k) => `${k.simbol} +${Math.round(k.gainPct).toLocaleString('id-ID')}%`)
    .join('\n')
  let isi = `🏆 UJIAN RAHASIA (iterasi ${u.iterasiTempa})\nSoal data nyata: ${u.totalSoal}\nBenar: ${u.benar} · Salah: ${u.salah}\nSKOR: ${u.persen}% — ${u.lulus ? '★ LULUS PENUH ★' : 'BELUM LULUS'}\nPer tipe: ${tipe}`
  if (gila) isi += `\n\n🚀 Pantheon ≥24000% (nyata): ${gila}`
  await pecahKirim(chatId, isi)
}

async function periksaKoin(chatId, istilah) {
  await pecahKirim(chatId, `⏳ Membedah ${istilah} real-time dari otak...`)
  const b = await apiLokal(`/api/koin?q=${encodeURIComponent('periksa koin ' + istilah)}`, 70000).catch((e) => ({ error: e.message }))
  if (!b || b.ok === false || b.error) {
    await pecahKirim(chatId, `❌ Bedah gagal: ${(b && (b.error || 'respons aneh')) || 'server tak menjawab'}`)
    return
  }
  const d = b.bedah || {}
  if (typeof d.narasi === 'string' && d.narasi.length > 40) {
    let isi = `🔍 BEDAH ${istilah}\n${d.narasi}`
    const rn = d.rencana || d.level || null
    if (rn && typeof rn === 'object') {
      isi += `\n\n• Entry: ${rp(rn.entry)}\n• TP/Jual Ambisius: ${rp(rn.target)} (${pct(rn.targetPct)})\n• JUAL POWER MAX: ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)})\n• Stop Loss: ${rp(rn.stop)} (${pct(rn.stopPct)})`
    }
    await pecahKirim(chatId, isi)
  } else {
    await pecahKirim(chatId, `🔍 BEDAH ${istilah} (mentah):\n${JSON.stringify(d).slice(0, 3500)}`)
  }
}

// ═══ V304 KLAIM JUJUR (mandat pemilik: "selayaknya dia punya klaim, dia
// klaim jujurnya") — angka yang kupakai mengaku, dari SUMBER SAMA arena. ═══
const PY_GENOME = `
import sqlite3
c = sqlite3.connect('/home/z/my-project/db/custom.db')
r = c.execute("select day, generation, kind, note from GenomeLog where kind in ('MUTATION','KNOB') order by id desc limit 1").fetchone()
print(f"{r[0]}|gen{r[1]}|{r[2]}|{r[3][:90]}" if r else '-')
`
function mutasiGenome() {
  return new Promise((resolve) => {
    execFile('python3', ['-c', PY_GENOME], { timeout: 9000 }, (err, stdout) => {
      resolve(err ? null : String(stdout).trim() || null)
    })
  })
}
function bacaOrgan(cmd, args, timeout = 6000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout }, (err, stdout) => resolve(err ? null : String(stdout).trim()))
  })
}
async function pidHidup(fileLock) {
  try {
    const p = parseInt(fs.readFileSync(path.join(ROOT, 'db', fileLock), 'utf8').trim(), 10)
    if (!p) return null
    process.kill(p, 0)
    return p
  } catch { return null }
}

/** Klaim jujur dari /api/arena: kumulatif vs puncak, akurasi, 7 hari, genome. */
async function klaimJujurData() {
  const a = await apiLokal('/api/arena', 60000).catch(() => null)
  if (!a) return null
  const mica = (a.standings || []).find((s) => s.competitor === 'MICAPROFITA') || null
  const chart = (a.chart || []).map((c) => ({ hari: c.day, v: c.MICAPROFITA ?? 0 })).filter((c) => typeof c.v === 'number')
  let puncak = { v: 0, hari: '' }
  for (const c of chart) if (c.v > puncak.v) puncak = c
  const kini = chart.length ? chart[chart.length - 1].v : (mica ? mica.cumRet * 100 : null)
  const tujuh = chart.slice(-7)
  const rata7 = tujuh.length ? tujuh.reduce((s, c, i) => s + (i ? c.v - tujuh[i - 1].v : 0), 0) / Math.max(1, tujuh.length - 1) : null
  const genome = a.genome || {}
  const mutasi = await mutasiGenome()
  return { a, mica, chart, puncak, kini, rata7, genome, mutasi, brier: a.brier || null }
}

async function klaimJujur(chatId) {
  await pecahKirim(chatId, '📜 Menyusun klaim jujur dari rekam jejak nyata...')
  const k = await klaimJujurData()
  if (!k || !k.mica) {
    await pecahKirim(chatId, 'Klaim belum bisa disusun — arena tak menjawab. Coba sebentar lagi.')
    return
  }
  const turun = k.puncak.v > 0 && k.kini != null ? k.puncak.v - k.kini : null
  const baris = []
  baris.push(`📜 KLAIM JUJUR GURU TRADER — ${jamWIB()} WIB`)
  baris.push('')
  baris.push('REKAM JEJAK (data nyata, after fee, pra-registrasi):')
  baris.push(`• Profit kumulatif: ${pct(k.mica.cumRet * 100)} — ${k.mica.days} hari tempur, ${k.mica.picks} pick`)
  baris.push(`• Akurasi arah: ${Math.round(k.mica.hitRate * 100)}% · hari terbaik ${pct(k.mica.bestDay * 100)} · terburuk ${pct(k.mica.worstDay * 100)}`)
  if (k.puncak.v > 0) baris.push(`• Puncak: ${pct(k.puncak.v)} (${k.puncak.hari})${turun != null && turun > 0 ? ` → kini turun ${turun.toFixed(1)} poin dari puncak. Itu FAKTA, bukan rahasia.` : ''}`)
  if (k.rata7 != null) baris.push(`• Rata-rata 7 hari terakhir: ${pct(k.rata7)} / hari`)
  if (k.brier?.nilai != null) baris.push(`• Brier (kalibrasi keyakinan, ${k.brier.n} hari): ${k.brier.nilai} — makin kecil makin jujur`)
  baris.push('')
  baris.push('PERTUMBUHAN OTAK (GENOME):')
  baris.push(`• Generasi ${k.genome.generation ?? '—'}${k.mutasi ? ` · mutasi/knob terakhir: ${k.mutasi.replace(/\|/g, ' · ')}` : ''}`)
  baris.push('• Genome HIDUP: mutasi bobot + knob berburu menyesuaikan diri tiap hari — bukan beku')
  baris.push('')
  baris.push('JUJUR KENAPA TURUN DARI PUNCAK (tanpa drama):')
  baris.push('• Era Sep: 2-3 pick/hari terkonsentrasi — menang besar (+77%, +68%) tapi 4 hari bencana (−22%, −21%, −16%, −16%) memangkas puncak. Pelajaran: risiko terlalu fokus.')
  baris.push('• Sejak 16 Okt: 50 koin/hari, variasi mengecil, tapi pasar SIDEWAYS (sigma median ~4,4%) → TP kecil 1-2% itu KEJUJURAN pasar tenang, bukan kerusakan otak.')
  baris.push('• Era TP 20-73% hanya saat koin sigma 20%+ — gerbang katalis V303 sudah membukanya kembali utk koin yang benar-benar meledak, tanpa fantasi.')
  baris.push('')
  baris.push('KLAKSON: profit adalah yang dipelajari. Setiap kalah tercatat, tiap versi baru wajib menembus gerbang akurasi ≥50% & PF ≥1,2 sebelum dianggap naik kelas.')
  await pecahKirim(chatId, baris.join('\n'), 'klaim')
}

/** V304 PERIKSA AKTIVASI (permintaan pemilik: kirim chat "periksa aktivasi"
 *  kapan pun → jawaban instan membuktikan semua organ menyala). */
async function periksaAktivasi(chatId) {
  await pecahKirim(chatId, `🔎 Memeriksa aktivasi semua organ... ${jamWIB()} WIB`)
  const [h, wdPid, rjPid, syncStamp, genome] = await Promise.all([
    apiLokal('/api/health', 15000).catch(() => null),
    pidHidup('penjaga.lock'),
    pidHidup('rantaian-jaga.lock'),
    new Promise((r) => fs.readFile(path.join(ROOT, 'db', 'rantaian-last-sync'), 'utf8', (e, s) => r(e ? null : s.trim()))),
    mutasiGenome(),
  ])
  const a = await apiLokal('/api/arena', 60000).catch(() => null)
  const mica = a ? (a.standings || []).find((s) => s.competitor === 'MICAPROFITA') : null
  const cfg = denyutCfg()
  const nKoin = a ? (a.todayPicks || []).filter((p) => p.competitor === 'MICAPROFITA').length : null
  const baris = []
  baris.push(`🔎 HASIL PERIKSA AKTIVASI — ${jamWIB()} WIB`)
  baris.push(`✅ BOT TELEGRAM: HIDUP (pid ${process.pid}, menyala ${umur(new Date(Date.now() - process.uptime() * 1000).toISOString())}) — pesan ini adalah bukti aku menjawab`)
  baris.push(`${h?.status === 'ok' ? '✅' : '❌'} SERVER OTAK: ${h?.status || 'TAK MENJAWAB'} (uptime ${h?.uptimeDetik != null ? Math.round(h.uptimeDetik / 60) + ' mnt' : '—'})`)
  if (a) {
    baris.push(`✅ ARENA: hari ${a.today} · ${a.regime} · ${nKoin} koin MICAPROFITA${a.stale ? ' ⚠️ data STALE' : ' · data segar'}`)
  } else {
    baris.push('❌ ARENA: tak menjawab (server compile / mati?)')
  }
  baris.push(`${monitorTerakhir.at ? '✅' : '⏳'} MONITOR KOIN/TP/AMBISIUS/POWER MAX: ${monitorTerakhir.at ? `hidup — putaran ${umur(monitorTerakhir.at)}, ${monitorTerakhir.picks} koin dipantau, ${monitorTerakhir.peristiwa} peristiwa terdeteksi` : 'belum jalan (tunggu ≤5 mnt)'}`)
  baris.push(`✅ ANTREAN KIRIM: ${antrian.length} pesan tertahan${antrian.length ? ' — akan diulang otomatis tiap 1 mnt (TIDAK HILANG)' : ' (bersih — semua laporan tersampaikan)'}`)
  baris.push(`${wdPid ? '✅' : '❌'} WATCHDOG: ${wdPid ? `hidup (pid ${wdPid})` : 'MATI'}`)
  baris.push(`${rjPid ? '✅' : '❌'} SARANG (injeksi GitHub): ${rjPid ? `hidup (pid ${rjPid}) · sinkron ${syncStamp ? umur(syncStamp) : '—'}` : 'MATI'}`)
  baris.push(`💓 DENYUT OTOMATIS: ${cfg.nyala ? `nyala tiap ${cfg.menit} menit — bila denyut BERHENTI datang, itulah alarmnya` : 'MATI (ketik: denyut nyala)'}`)
  if (mica) baris.push(`📊 KLAIM JUJUR SINGKAT: kumulatif ${pct(mica.cumRet * 100)} · akurasi ${Math.round(mica.hitRate * 100)}% · genome ${genome ? 'bermutasi ' + genome.split('|')[0] : 'gen ' + (a?.genome?.generation ?? '—')}`)
  baris.push('')
  baris.push('Semua organ di atas diperiksa HIDUP-HIDUP saat kau mengetik — bukan catatan lama. ⚡')
  await pecahKirim(chatId, baris.join('\n'), 'aktivasi')
}

// ═══ V304 DENYUT HIDUP (pilihan 2 pemilik): tiap N menit bot melapor
// "AKU HIDUP" — KEHENINGAN denyut = ALARM: bila denyut berhenti datang
// padahal biasanya datang, bot/server pasti bermasalah walau pemilik sedang
// tak bertanya. Dua pilihan pemilik (cek on-demand + denyut otomatis)
// dipakai BERDUA — saling melengkapi, bukan salah satu.
const denyutCfg = () => bacaJson('denyut.json', { menit: 30, nyala: true })
let denyutTerakhir = null
function teksDenyut(a) {
  const mica = a ? (a.standings || []).find((s) => s.competitor === 'MICAPROFITA') : null
  const nKoin = a ? (a.todayPicks || []).filter((p) => p.competitor === 'MICAPROFITA').length : null
  const b = []
  b.push(`🫀 DENYUT ${jamWIB()} WIB — AKU HIDUP`)
  b.push(`arena ${a?.today || '—'} · ${a?.regime || '—'} · ${nKoin ?? '—'} koin · monitor ${monitorTerakhir.at ? umur(monitorTerakhir.at) : '—'} · antrean ${antrian.length}`)
  if (mica) b.push(`klaim jujur: kumulatif ${pct(mica.cumRet * 100)} · akurasi ${Math.round(mica.hitRate * 100)}%`)
  return b.join('\n')
}
function jadwalDenyut() {
  const cfg = denyutCfg()
  if (!cfg.nyala) {
    console.log('[TG-JAGA] denyut otomatis MATI (config)')
    return
  }
  const ms = Math.max(10, Math.min(720, cfg.menit || 30)) * 60_000
  setTimeout(async () => {
    try {
      const a = await apiLokal('/api/arena', 60000).catch(() => null)
      await siar(teksDenyut(a))
      denyutTerakhir = new Date().toISOString()
    } catch (e) {
      console.log('[TG-JAGA] denyut err:', String(e).slice(0, 100))
    }
    jadwalDenyut()
  }, ms).unref?.()
  console.log(`[TG-JAGA] denyut hidup berikutnya dalam ${Math.round(ms / 60000)} mnt`)
}

const BANTUAN = `🤖 MICAPROFITA — Penjaga Telegram (V304-DENYUT)
Perintah yang kupahami:
• periksa aktivasi — bukti hidup SEMUA organ (bot, server, arena, monitor, watchdog, sarang, denyut) — kapan pun kau ragu
• denyut — status denyut hidup · "denyut 15" = tiap 15 mnt · "denyut mati/nyala"
• klaim — klaim jujur guru trader: rekam jejak nyata vs puncak, genome, kejujuran pasar
• laporan — daftar koin hari ini + level lengkap (entry, TP/jual ambisius, JUAL POWER MAX, stop loss, alasan) — SUMBER SAMA dengan otak z.ai
• koin <nama> — bedah koin real-time (contoh: koin btc, koin pepe)
• status — denyut server, arena, buku cuan, ujian
• ujian — skor Ujian Rahasia (data nyata Binance)
• ping — tes kecepatan jawab
Apa pun yang kau tulis, aku selalu menjawab. ⚡`

async function jawabPesan(m) {
  const chatId = m.chat?.id
  const teks = (m.text || m.caption || '').trim()
  const nama = m.from?.first_name || m.from?.username || ''
  if (!chatId) return
  ingatChat(String(chatId), nama)
  const q = teks.toLowerCase()
  const t0 = Date.now()
  try {
    if (q === 'ping') {
      await pecahKirim(chatId, `pong ⚡ ${Date.now() - t0} ms`)
    } else if (/^(periksa aktivasi|cek aktivasi|aktivasi|periksa hidup|cek hidup|masih hidup|masih on|hidup kah)/.test(q)) {
      await periksaAktivasi(chatId)
    } else if (/^denyut\s+(\d+)\s*$/.test(q)) {
      const menit = Math.max(10, Math.min(720, parseInt(q.match(/^denyut\s+(\d+)/)[1], 10)))
      tulisFile('denyut.json', JSON.stringify({ menit, nyala: true }))
      await pecahKirim(chatId, `💓 Denyut diatur: TIAP ${menit} MENIT aku melapor "AKU HIDUP" ke sini. Keheningan denyut = alarm bagi kita berdua. (berlaku mulai sekarang)`, 'denyut-cfg')
      jadwalDenyut()
    } else if (/^denyut\s*(mati|off)/.test(q)) {
      tulisFile('denyut.json', JSON.stringify({ menit: denyutCfg().menit, nyala: false }))
      await pecahKirim(chatId, '💓 Denyut otomatis DIMATIKAN. Perintah "periksa aktivasi" tetap hidup kapan pun.')
    } else if (/^denyut\s*(nyala|on)/.test(q)) {
      tulisFile('denyut.json', JSON.stringify({ menit: denyutCfg().menit, nyala: true }))
      await pecahKirim(chatId, `💓 Denyut otomatis DINYALAKAN (tiap ${denyutCfg().menit} menit).`, 'denyut-cfg')
      jadwalDenyut()
    } else if (/^denyut/.test(q)) {
      const cfg = denyutCfg()
      await pecahKirim(chatId, `💓 Denyut: ${cfg.nyala ? `nyala tiap ${cfg.menit} menit` : 'mati'} · denyut terakhir ${denyutTerakhir ? umur(denyutTerakhir) : 'belum ada sejak menyala'}\nAtur: "denyut 15" (menit 10-720) · "denyut mati" · "denyut nyala"`)
    } else if (/^klaim/.test(q)) {
      await klaimJujur(chatId)
    } else if (/^(laporan|laporan hari ini|daftar 50|daftar koin)/.test(q)) {
      await laporanPenuh(chatId)
    } else if (/^status/.test(q)) {
      await statusRingkas(chatId)
    } else if (/^ujian/.test(q)) {
      await ujianRingkas(chatId)
    } else if (/^koin\s+/.test(q)) {
      await periksaKoin(chatId, teks.slice(5).trim().replace(/^koin\s+/i, ''))
    } else if (/^(halo|hai|hi|assalamu|pagi|siang|malam)/.test(q)) {
      await pecahKirim(chatId, `Halo ${nama || 'Pemilik'}! 👋 ${BANTUAN}`)
    } else if (/^(bantuan|help|menu|start|\/start)/.test(q)) {
      await pecahKirim(chatId, BANTUAN)
    } else {
      // JANGAN PERNAH BISA TANPA JAWABAN — fallback pintar
      const cocokKoin = teks.toUpperCase().match(/\b[A-Z0-9]{2,12}(USDT)?\b/)
      if (cocokKoin && cocokKoin[0].length >= 3) {
        await periksaKoin(chatId, cocokKoin[0])
      } else {
        await pecahKirim(chatId, `Aku belum paham "${teks.slice(0, 60)}". ${BANTUAN}`)
      }
    }
  } catch (e) {
    await pecahKirim(chatId, `⚠️ Terjadi hambatan: ${String(e.message || e).slice(0, 160)}. Coba lagi — aku selalu menjawab.`, 'jawab-err')
  }
  console.log(`[TG-JAGA] jawab ${chatId} "${teks.slice(0, 40)}" dalam ${Date.now() - t0} ms`)
}

// ── Laporan pagi 07:05 WIB ─────────────────────────────────────────
function msKePukul0505UTC() {
  const now = new Date()
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 5, 0))
  if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1)
  return target.getTime() - now.getTime()
}
function jadwalPagi() {
  const ms = msKePukul0505UTC()
  setTimeout(async () => {
    const semua = Object.keys(chat())
    console.log(`[TG-JAGA] laporan pagi 07:05 WIB → ${semua.length} chat`)
    for (const id of semua) {
      try {
        await laporanPenuh(id)
      } catch (e) {
        console.log('[TG-JAGA] laporan pagi gagal:', e.message)
      }
    }
    jadwalPagi()
  }, ms).unref?.()
  console.log(`[TG-JAGA] laporan pagi berikutnya dalam ${Math.round(ms / 60000)} menit`)
}

// ── Penjaga-atas-penjaga (segitiga keabadian) ──────────────────────
// watchdog menjaga server & bot; bot menjaga BALIK watchdog.
// Bila watchdog lenyap (sapuan proses), bot melahirkan ulang lewat pola
// node detached+unref — satu-satunya pola terbukti anti-sapuan.
function jagaWatchdog() {
  try {
    const lock = path.join(ROOT, 'db', 'penjaga.lock')
    let hidup = false
    try {
      const lpid = parseInt(fs.readFileSync(lock, 'utf8').trim(), 10)
      if (lpid) process.kill(lpid, 0) && (hidup = true)
    } catch {}
    if (!hidup) {
      console.log('[TG-JAGA] watchdog lenyap → lahirkan ulang (penjaga-atas-penjaga)')
      const anak = spawn(
        'node',
        ['-e', "const {spawn}=require('child_process');const c=spawn('bash',['" + path.join(ROOT, 'scripts', 'watchdog_server.sh') + "'],{detached:true,stdio:'ignore',env:process.env});c.unref();"],
        { detached: true, stdio: 'ignore', env: { ...process.env, PENJAGA_ROOT: ROOT } },
      )
      anak.unref()
    }
  } catch (e) {
    console.log('[TG-JAGA] jagaWatchdog err:', String(e).slice(0, 120))
  }
}

// ── Loop utama long-poll ───────────────────────────────────────────
console.log(`[TG-JAGA] menyala pid ${process.pid} — long-polling real-time`)
;(async () => {
  // tanda hidup ke chat kenal saat bangkit (bukti keabadian)
  const semua = Object.keys(chat())
  if (semua.length) {
    for (const id of semua) await pecahKirim(id, `⚡ Penjaga Telegram menyala (auto-revive keabadian aktif).\n💓 Denyut "AKU HIDUP" tiap ${denyutCfg().menit} mnt · ketik "periksa aktivasi" kapan pun utk bukti hidup semua organ.`).catch(() => {})
  }
  jadwalPagi()
  jadwalMonitor()
  jadwalDenyut()
  // flush antrean tertinggal segera setelah menyala (pesan yang gagal saat bot mati)
  setTimeout(() => flushAntrian().catch(() => {}), 20_000).unref?.()
  let detikJaga = 0
  while (true) {
    try {
      const updates = await tg('getUpdates', { timeout: 25, offset, allowed_updates: ['message'] }, 40000)
      for (const u of updates || []) {
        offset = u.update_id + 1
        tulisFile('offset.txt', String(offset))
        if (u.message) await jawabPesan(u.message)
      }
    } catch (e) {
      console.log('[TG-JAGA] loop err:', e.message, '→ ulang 3 dtk')
      await new Promise((r) => setTimeout(r, 3000))
    }
    // tiap ±5 menit: pastikan watchdog tetap hidup (segamat pasca getUpdates 25 dtk)
    detikJaga += 28
    if (detikJaga >= 300) {
      detikJaga = 0
      jagaWatchdog()
    }
  }
})()
