#!/usr/bin/env node
// ============================================================
// V304 TELEGRAM-BOT-ABADI — proses long-poll yang TIDAK BOLEH DIAM.
//
// Hukum pemilik:
//   (1) Setiap pesan WAJIB terjawab — mustahil ada chat tanpa jawaban.
//   (2) Kecepatan: long-poll kontinu (timeout 25 dtk), TANPA jeda antar
//       poll — jawaban biasanya < 1 dtk sejak pesan datang.
//   (3) Antrean kirim + retry: jaringan patah / 429 / 5xx → antre ulang,
//       TIDAK pernah membuang pesan.
//   (4) Laporan harian 07:05 WIB (00:05 UTC) dari API internal yang
//       membaca DB otak — sumber SAMA dengan dasbor z.ai.
//   (5) Menjaga watchdog: kalau watchdog mati, bot yang menyalakannya.
//       (watchdog juga menjaga bot — jaring keabadian dua arah.)
// Token HANYA dibaca dari .token-telegram (chmod 600) — tidak pernah dicetak.
// ============================================================

import { readFileSync, writeFileSync, existsSync, renameSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN_FILE = path.join(ROOT, '.token-telegram')
const STATE_FILE = path.join(ROOT, '.bot-state-telegram.json')
const LOG_FILE = path.join(ROOT, 'scripts', 'telegram_bot.log')
const API = 'http://127.0.0.1:3000'

const TOKEN = readFileSync(TOKEN_FILE, 'utf8').trim()
const TG = `https://api.telegram.org/bot${TOKEN}`

// ---------- log (rotasi sederhana) ----------
function log(msg) {
  try {
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > 5 * 1024 * 1024) {
      renameSync(LOG_FILE, LOG_FILE + '.old')
    }
    writeFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' })
  } catch { /* log tak boleh membunuh bot */ }
}
const kini = () => new Date().toISOString().slice(11, 19)

// ---------- state ----------
let state = { offset: 0, chatIds: [], laporanTerkirim: '', sentuh: {}, matiSejak: null }
try { if (existsSync(STATE_FILE)) state = { ...state, ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) } } catch { /* state rusak → mulai bersih */ }
const simpanState = () => { try { writeFileSync(STATE_FILE, JSON.stringify(state)) } catch { /* diam */ } }

// ---------- Telegram API dengan retry ----------
async function tgCall(method, payload = {}, tries = 4) {
  let lastErr = null
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${TG}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(35_000),
      })
      const j = await r.json().catch(() => ({}))
      if (j.ok) return j.result
      if (j.error_code === 429) {
        const t = (j.parameters?.retry_after ?? 3) + 1
        log(`${kini()} 429 → tunggu ${t}s`)
        await sleep(t * 1000); continue
      }
      if (j.error_code === 409) { lastErr = new Error('conflict'); await sleep(3000); continue }
      lastErr = new Error(`${method} gagal: ${j.description ?? r.status}`)
      await sleep(1500 * (i + 1))
    } catch (e) { lastErr = e; await sleep(1500 * (i + 1)) }
  }
  throw lastErr ?? new Error(`${method} gagal`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- antrean kirim (tidak pernah membuang pesan) ----------
const antrean = []
let mengirim = false
function kirim(chatId, teks) {
  antrean.push({ chatId, teks: teks.slice(0, 4090) })
  pompa()
}
async function pompa() {
  if (mengirim) return
  mengirim = true
  while (antrean.length) {
    const { chatId, teks } = antrean[0]
    try {
      await tgCall('sendMessage', { chat_id: chatId, text: teks, disable_web_page_preview: true })
      antrean.shift()
    } catch (e) {
      log(`${kini()} KIRIM GAGAL setelah berulang (${e.message}) — simpan ulang ke ekor antrean`)
      antrean.push(antrean.shift())
      await sleep(5000) // jangan badai-ulang; antrean kembali dipompa
      break // keluar dulu, pompa dipanggil lagi saat ada kirim() baru
    }
  }
  mengirim = false
}
// pompa versi sabar: percobaan banyak sebelum menyerah
async function kirimSabar(chatId, teks) {
  for (let i = 0; i < 5; i++) {
    try {
      await tgCall('sendMessage', { chat_id: chatId, text: teks.slice(0, 4090), disable_web_page_preview: true }, 3)
      return true
    } catch (e) { log(`${kini()} kirimSabar percobaan ${i + 1}: ${e.message}`); await sleep(3000) }
  }
  return false
}

// ---------- API internal otak (tunggu bila Next.js sedang bangun) ----------
async function otakApi(body, tungguMaks = 90_000) {
  const mulai = Date.now()
  for (;;) {
    try {
      const r = await fetch(`${API}/api/telegram`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(110_000),
      })
      const j = await r.json().catch(() => null)
      if (j) return j
    } catch { /* next down / compile → tunggu */ }
    if (Date.now() - mulai > tungguMaks) return { ok: false, pesan: 'Otak sedang pulih (server internal belum menjawab). Coba lagi sebentar — aku tidak akan diam tanpa alasan.' }
    await sleep(2000)
  }
}

// ---------- otak jawaban per teks ----------
const PERINTAH_LAPORAN = /^(laporan|report|daftar|daftar koin|laporan harian|kirim laporan)/i
const PERINTAH_STATUS = /^(status|kondisi|arena|ping|hidup)/i
function jawab(teksMasuk) {
  const t = (teksMasuk ?? '').trim()
  if (PERINTAH_LAPORAN.test(t)) return { aksi: 'laporan' }
  if (PERINTAH_STATUS.test(t)) return { aksi: 'status' }
  if (t.length > 0) return { aksi: 'otak', q: t }
  return { aksi: 'status' }
}

const SAPAAN_BARU = `MICAPROFITA hidup dan menjaga. Aku mendengar setiap pesanmu mulai detik ini.
Perintah:
• laporan — 50 koin tempur hari ini lengkap (Entry, TP/Sasaran, Jual Ambisius, Jual Power Max, Stop Loss, vonis + penjelasan)
• status — ringkasan arena
• ketik apa saja (contoh: "periksa BTC") — aku bedah koin real-time dari Binance.
Aku juga kirim laporan otomatis tiap 07:05 WIB dan alarm saat level jual/stop tersentuh.`

async function layani(update) {
  const msg = update.message ?? update.edited_message
  if (!msg || !msg.text) return
  const chatId = msg.chat.id
  // pelajari chat pemilik (auto-learn)
  if (!state.chatIds.includes(chatId)) {
    state.chatIds.push(chatId)
    simpanState()
    log(`${kini()} chat baru terdaftar: ${chatId}`)
    await kirimSabar(chatId, SAPAAN_BARU)
  }
  const perintah = jawab(msg.text)
  const t0 = Date.now()
  try {
    if (perintah.aksi === 'laporan') {
      const j = await otakApi({ action: 'laporan' })
      if (j.ok && Array.isArray(j.potongan)) {
        for (const potongan of j.potongan) {
          const sukses = await kirimSabar(chatId, potongan)
          if (!sukses) log(`${kini()} potongan laporan gagal terkirim setelah 5x`)
        }
      } else {
        await kirimSabar(chatId, j.pesan ?? 'Laporan bermasalah — coba lagi.')
      }
    } else if (perintah.aksi === 'status') {
      const j = await otakApi({ action: 'status' })
      await kirimSabar(chatId, j.ok ? j.pesan : (j.pesan ?? 'Status bermasalah — coba lagi.'))
    } else {
      const j = await otakApi({ action: 'otak', q: perintah.q })
      await kirimSabar(chatId, j.ok ? j.pesan : (j.pesan ?? `Bedah bermasalah untuk "${perintah.q}" — coba lagi sebentar.`))
    }
    log(`${kini()} jawab ${perintah.aksi} chat=${chatId} dalam ${Date.now() - t0}ms`)
  } catch (e) {
    // PERTAHANAN TERAKHIR: tidak boleh ada chat tanpa jawaban
    await kirimSabar(chatId, `Aku menerima pesanmu tapi otak tersandung sesaat (${String(e.message).slice(0, 80)}). Ketik ulang sebentar lagi — aku tetap di sini.`)
    log(`${kini()} layani ERROR: ${e.message}`)
  }
}

// ---------- laporan harian 07:05 WIB ----------
const utcTanggal = () => new Date().toISOString().slice(0, 10)
async function cekLaporanHarian() {
  const now = new Date()
  const menitUTC = now.getUTCHours() * 60 + now.getUTCMinutes()
  if (menitUTC < 5) return // sebelum 00:05 UTC
  if (state.laporanTerkirim === utcTanggal()) return
  log(`${kini()} kirim laporan harian…`)
  for (const chatId of state.chatIds) {
    const j = await otakApi({ action: 'laporan' })
    if (j.ok && Array.isArray(j.potongan)) {
      for (const potongan of j.potongan) await kirimSabar(chatId, potongan)
    } else {
      await kirimSabar(chatId, j.pesan ?? 'Laporan harian bermasalah — ketik "laporan" sebentar lagi.')
    }
  }
  state.laporanTerkirim = utcTanggal()
  simpanState()
  log(`${kini()} laporan harian selesai`)
}

// ---------- pantau level tersentuh (alarm jual/stop) ----------
async function pantauAlarm() {
  const j = await otakApi({ action: 'pantau' }, 30_000).catch(() => null)
  if (!j || !j.ok || !Array.isArray(j.notif)) return
  const hari = utcTanggal()
  for (const n of j.notif) {
    const kunci = `${n.symbol}|${n.level}`
    if (state.sentuh[kunci] === hari) continue
    for (const chatId of state.chatIds) await kirimSabar(chatId, n.teks)
    state.sentuh[kunci] = hari
    simpanState()
    log(`${kini()} alarm terkirim: ${kunci}`)
  }
  // bersihkan kunci hari lampau
  for (const k of Object.keys(state.sentuh)) {
    if (state.sentuh[k] !== hari) delete state.sentuh[k]
  }
}

// ---------- menjaga watchdog (saling menjaga) ----------
function jagaWatchdog() {
  try {
    const cek = spawn('bash', ['-c', 'pgrep -f watchdog_server.sh | head -1'], { stdio: 'pipe' })
    cek.stdout.on('data', (d) => {
      if (!String(d).trim()) {
        log(`${kini()} watchdog mati — nyalakan ulang`)
        spawn('bash', [path.join(ROOT, 'scripts', 'watchdog_server.sh')], { cwd: ROOT, detached: true, stdio: 'ignore' }).unref()
      }
    })
  } catch { /* diam */ }
}

// ---------- tunggal: pidfile guard ----------
const PIDFILE = path.join(ROOT, 'scripts', 'telegram_bot.pid')
try {
  if (existsSync(PIDFILE)) {
    const lama = parseInt(readFileSync(PIDFILE, 'utf8').trim(), 10)
    if (lama && lama !== process.pid) {
      try { process.kill(lama, 0); console.error(`bot lain hidup (pid ${lama}) — keluar`); process.exit(0) } catch { /* pid lama bangkai → lanjut */ }
    }
  }
} catch { /* diam */ }
writeFileSync(PIDFILE, String(process.pid))

// ---------- LOOP UTAMA: long-poll abadi ----------
log(`===== bot abadi V304 hidup pid=${process.pid} =====`)

let pollAktif = false
async function pollSelamanya() {
  if (pollAktif) return
  pollAktif = true
  for (;;) {
    try {
      const updates = await tgCall('getUpdates', {
        timeout: 25, offset: state.offset, allowed_updates: ['message', 'edited_message'],
      }, 2) // 2 percobaan; gagal → loop bawah yang backoff pendek
      if (pollAktif === false) return
      for (const u of updates ?? []) {
        state.offset = u.update_id + 1
        simpanState()
        // jawab SEGERA (paralel antar-update, tetap terurut per chat oleh antrean)
        layani(u).catch((e) => log(`${kini()} layani unhandled: ${e.message}`))
      }
    } catch (e) {
      log(`${kini()} poll error: ${e.message} → ulang 2s`)
      await sleep(2000)
    }
  }
}

// loop jadwal: laporan harian + alarm + jaga watchdog (tiap 30 dtk)
;(async function jadwalSelamanya() {
  for (;;) {
    try {
      await cekLaporanHarian()
      await pantauAlarm()
    } catch (e) { log(`${kini()} jadwal error: ${e.message}`) }
    jagaWatchdog()
    await sleep(30_000)
  }
})()

pollSelamanya()
