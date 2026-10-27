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
import { spawn } from 'child_process'

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

function pecahKirim(chatId, teks) {
  const potong = []
  for (let i = 0; i < teks.length; i += 3800) potong.push(teks.slice(i, i + 3800))
  return (async () => {
    for (const p of potong) {
      await tg('sendMessage', { chat_id: chatId, text: p, disable_web_page_preview: true }).catch((e) =>
        console.log('[TG-JAGA] kirim gagal:', e.message),
      )
    }
  })()
}

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
const rp = (x) => (typeof x === 'number' && isFinite(x) ? (Math.round(x * 10000) / 10000).toString() : '—')
const pct = (x) => (typeof x === 'number' && isFinite(x) ? `${x > 0 ? '+' : ''}${x.toFixed(2)}%` : '—')

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

async function monitorArena() {
  let a
  try {
    a = await apiLokal('/api/arena', 45000)
  } catch {
    return // server belum siap — tunggu putaran berikut, tanpa bising
  }
  const hari = a?.today || a?.dataDay || '?'
  if (hari === '?') return
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
  for (const p of lolos) {
    const rn = p.rencana || p.evidence?.rencana || null
    const lp = typeof p.livePrice === 'number' ? p.livePrice : null
    if (!rn || lp == null) continue
    const arahBuy = p.direction === 'BUY'
    if (typeof rn.target === 'number' && !autoLapor.tp[p.symbol] && (arahBuy ? lp >= rn.target : lp <= rn.target)) {
      autoLapor.tp[p.symbol] = true
      const pm = typeof rn.powerMaxAmbisius === 'number'
      await siar(pm
        ? `✅ KENA TP — ${p.symbol} (${p.direction})\nLive ${rp(lp)} menyentuh target ${rp(rn.target)} (${pct(rn.targetPct)}).\nLevel panen berikutnya: JUAL AMBISIUS ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}) → JUAL POWER MAX ${rp(rn.powerMaxAmbisius)} (${pct(rn.powerMaxPct)}).`
        : `✅ KENA TP — ${p.symbol} (${p.direction})\nLive ${rp(lp)} menyentuh target ${rp(rn.target)} (${pct(rn.targetPct)}).\nLevel panen berikutnya: JUAL AMBISIUS ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}).`).catch(() => {})
    }
    if (typeof rn.highAmbisius === 'number' && !autoLapor.ambisius[p.symbol] && (arahBuy ? lp >= rn.highAmbisius : lp <= rn.highAmbisius)) {
      autoLapor.ambisius[p.symbol] = true
      await siar(`🔥 JUAL AMBISIUS Tersentuh — ${p.symbol} (${p.direction})\nLive ${rp(lp)} melampaui ${rp(rn.highAmbisius)} (${pct(rn.ambisiusPct)}) — harga terlentang: dipastikan turun kemudian${typeof rn.powerMaxAmbisius === 'number' ? ` (atap pamungkas: POWER MAX ${rp(rn.powerMaxAmbisius)})` : ''}.`).catch(() => {})
    }
    if (typeof rn.powerMaxAmbisius === 'number' && !autoLapor.powerMax[p.symbol] && (arahBuy ? lp >= rn.powerMaxAmbisius : lp <= rn.powerMaxAmbisius)) {
      autoLapor.powerMax[p.symbol] = true
      await siar(`🚀 JUAL POWER MAX AMBISIUS — ${p.symbol} (${p.direction})\nLive ${rp(lp)} melampaui ${rp(rn.powerMaxAmbisius)} (${pct(rn.powerMaxPct)}) — puncak paling terlentang: butuh nafas panjang, terjun diperkirakan.`).catch(() => {})
    }
    if (typeof rn.stop === 'number' && !autoLapor.stop[p.symbol] && (arahBuy ? lp <= rn.stop : lp >= rn.stop)) {
      autoLapor.stop[p.symbol] = true
      await siar(`🛑 SENTUH STOP LOSS — ${p.symbol} (${p.direction})\nLive ${rp(lp)} menembus stop ${rp(rn.stop)} (${pct(rn.stopPct)}) — jujur: putaran ini kalah, begitu sifat pasar.`).catch(() => {})
    }
  }
  simpanAutoLapor()
}

function jadwalMonitor() {
  const putaran = async () => {
    try {
      await monitorArena()
    } catch (e) {
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
  let isi = `📋 LAPORAN ${hari} — sumber otak z.ai (arena)\n`
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

const BANTUAN = `🤖 MICAPROFITA — Penjaga Telegram
Perintah yang kupahami:
• laporan — daftar koin hari ini + level lengkap (entry, TP/jual ambisius, JUAL POWER MAX, stop loss, alasan) — SUMBER SAMA dengan otak z.ai
• koin <nama> — bedah koin real-time (contoh: koin btc, koin opg)
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
    await pecahKirim(chatId, `⚠️ Terjadi hambatan: ${String(e.message || e).slice(0, 160)}. Coba lagi — aku selalu menjawab.`)
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
    for (const id of semua) await pecahKirim(id, '⚡ Penjaga Telegram menyala (auto-revive keabadian aktif).').catch(() => {})
  }
  jadwalPagi()
  jadwalMonitor()
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
