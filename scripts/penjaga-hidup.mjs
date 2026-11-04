#!/usr/bin/env node
// ============================================================
// V303-MESIN-GANTI — PENJAGA-HIDUP + MESIN BOOT + PERAWAT
// ------------------------------------------------------------
// SATU PINTU: `npm run dev` = node scripts/penjaga-hidup.mjs
// Penjaga kini bukan sekadar penyembuh pra-boot, ia adalah
// INDUK yang melahirkan dan merawat server:
//   1. PENYEMBUH BENIH  — file inti hilang dipulihkan dari benih/
//   2. PENYEMBUH IZIN   — folder/file terkunci dibuka (akar panic
//                         Turbopack "Permission denied" dimatikan)
//   3. PEMBERSIH PORT   — proses zombi pemegang port 3000 ditetak
//   4. SATU INSTANSI    — penjaga tua dari boot sebelumnya dipastikan
//                         sudah tiupan sebelum yang baru lahir
//   5. TRIASE CACHE     — penanda data/BERSIHKAN-CACHE membasuh .next
//   6. MESIN GANTI      — bila data/MODE-PRODUKSI ada & bundle
//                         produksi tersedia, jalankan server PRODUKSI
//                         (kilat, hemat memori, tanpa kompilasi dev);
//                         selain itu jalankan next dev seperti biasa.
//   7. PERAWAT          — anak proses mati (termasuk dibunuh OOM
//                         killer) dibangkitkan ulang otomatis, dengan
//                         jeda pendingin & batas kegagalan beruntun.
// Gagal total pun server wajib berusaha menyala — penjaga tidak
// boleh menjadi titik mati baru.
// ============================================================

import fs from 'fs'
import path from 'path'
import net from 'net'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BENIH = path.join(ROOT, 'benih')
const DATA = path.join(ROOT, 'data')
const PORT = 3000

// daftar relatif file inti + sumber benihnya
const PETA = [
  ['src/lib/cyborg/waktu.ts', 'waktu.ts'],
  ['src/lib/cyborg/gerbang.ts', 'gerbang.ts'],
  ['src/lib/cyborg/kalibrasi.ts', 'kalibrasi.ts'],
  ['src/lib/cyborg/sapu10.ts', 'sapu10.ts'],
  ['src/lib/cyborg/jantung.ts', 'jantung.ts'],
  ['src/lib/cyborg/kalibrasi-ambisius.json', 'kalibrasi-ambisius.json'],
  ['src/app/api/sapu10/route.ts', 'route-sapu10.ts'],
  ['src/components/arena/sapu10-panel.tsx', 'sapu10-panel.tsx'],
  ['src/instrumentation.ts', 'instrumentation.ts'],
]

const LEWATI = new Set(['node_modules', '.git', '.next', '.turbo', '.vercel'])
const laporan = []
const log = (...a) => console.log('[PENJAGA]', ...a)

// ---------- 1. PENYEMBUH BENIH ----------
function pulihkanBenih() {
  let pulih = 0
  for (const [rel, benihNama] of PETA) {
    const target = path.join(ROOT, rel)
    if (fs.existsSync(target)) continue
    const sumber = path.join(BENIH, benihNama)
    if (!fs.existsSync(sumber)) continue
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(sumber, target)
    try { fs.chmodSync(target, 0o755) } catch {}
    pulih++
    log(`pulihkan ${rel} dari benih/`)
  }
  return pulih
}

// ---------- 2. PENYEMBUH IZIN ----------
function sembuhkanIzin() {
  let dibetulkan = 0
  const antre = [ROOT]
  let langkah = 0
  while (antre.length && langkah < 60000) {
    langkah++
    const dir = antre.pop()
    let entri
    try {
      entri = fs.readdirSync(dir, { withFileTypes: true })
    } catch (e) {
      try {
        fs.chmodSync(dir, 0o755)
        dibetulkan++
        entri = fs.readdirSync(dir, { withFileTypes: true })
      } catch (e2) {
        laporan.push(`folder tak-terbaca: ${path.relative(ROOT, dir)} (${e2.code ?? e2.message})`)
        continue
      }
    }
    for (const ent of entri) {
      const p = path.join(dir, ent.name)
      let st
      try { st = fs.lstatSync(p) } catch { continue }
      if (st.isSymbolicLink()) continue
      if (st.isDirectory()) {
        try {
          fs.accessSync(p, fs.constants.R_OK | fs.constants.X_OK)
        } catch {
          try { fs.chmodSync(p, 0o755); dibetulkan++ } catch (e3) {
            laporan.push(`folder tak-dibuka: ${path.relative(ROOT, p)} (${e3.code ?? e3.message})`)
            continue
          }
        }
        if (!LEWATI.has(ent.name)) antre.push(p)
      } else {
        try {
          fs.accessSync(p, fs.constants.R_OK)
        } catch {
          try { fs.chmodSync(p, 0o644); dibetulkan++; laporan.push(`file dibuka: ${path.relative(ROOT, p)}`) } catch (e4) {
            laporan.push(`file gagal-dibuka: ${path.relative(ROOT, p)} (${e4.code ?? e4.message})`)
          }
        }
      }
    }
  }
  return dibetulkan
}

// ---------- 3. PEMBERSIH PORT ----------
function portBebas(port) {
  return new Promise((selesai) => {
    const uji = net.createServer()
    uji.once('error', () => selesai(false))
    uji.once('listening', () => uji.close(() => selesai(true)))
    uji.listen(port, '0.0.0.0')
  })
}

async function bersihkanPort(port) {
  let bebas = await portBebas(port)
  if (bebas) return 0
  let ditetak = 0
  try {
    const ids = fs.readdirSync('/proc').filter((x) => /^\d+$/.test(x))
    for (const pid of ids) {
      try {
        const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8')
        const menyandungNext = cmdline.includes('next') || cmdline.includes('standalone/server.js')
        if (!menyandungNext) continue
        const cwd = fs.readlinkSync(`/proc/${pid}/cwd`)
        if (cwd !== ROOT && !cwd.startsWith(ROOT + '/')) continue
        process.kill(Number(pid), 'SIGKILL')
        ditetak++
        laporan.push(`zombi ditetak: pid ${pid}`)
      } catch { /* sudah tiupan sendiri */ }
    }
  } catch (e) {
    laporan.push(`pemindai proses gagal: ${e?.message ?? e}`)
  }
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200))
    if (await portBebas(port)) return ditetak
  }
  laporan.push(`port ${port} masih digenggam — mesin akan dicoba saja`)
  return ditetak
}

// ---------- 4. SATU INSTANSI PENJAGA ----------
async function tiupanPenjagaTua() {
  // V303d: pindai SEMUA penjaga hidup di /proc — jangan cuma pidfile.
  // Bila ada penjaga sisa boot sebelumnya (atau sisa uji coba), semuanya
  // ditupuk agar cuma SATU penjaga yang merawat server — tanpa rebutan
  // port 3000 antar kembaran.
  try {
    const ids = fs.readdirSync('/proc').filter((x) => /^\d+$/.test(x))
    for (const pid of ids) {
      const n = Number(pid)
      if (n === process.pid) continue
      try {
        const cmd = fs.readFileSync(`/proc/${n}/cmdline`, 'utf8')
        if (!cmd.includes('penjaga-hidup')) continue
        process.kill(n, 'SIGKILL')
        laporan.push(`penjaga saudara ditupuk: pid ${n}`)
      } catch { /* sudah tiupan sendiri */ }
    }
  } catch { /* /proc tak tersedia — pidfile jadi tumpuan */ }
  // tunggu semua kembaran benar-benar tiupan (zombi pun dibersihkan)
  for (let i = 0; i < 25; i++) {
    let masih = false
    try {
      const ids = fs.readdirSync('/proc').filter((x) => /^\d+$/.test(x))
      for (const pid of ids) {
        try {
          const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8')
          if (cmd.includes('penjaga-hidup') && Number(pid) !== process.pid) { masih = true; break }
        } catch {}
      }
    } catch {}
    if (!masih) break
    await new Promise((r) => setTimeout(r, 200))
  }
  try { fs.writeFileSync(path.join(DATA, 'penjaga.pid'), String(process.pid)) } catch {}
}

// ---------- 5. TRIASE CACHE ----------
function triaseCache() {
  const penanda = path.join(DATA, 'BERSIHKAN-CACHE')
  try {
    if (!fs.existsSync(penanda)) return
    fs.rmSync(path.join(ROOT, '.next'), { recursive: true, force: true })
    fs.rmSync(penanda, { force: true })
    laporan.push('cache .next dibasuh atas penanda BERSIHKAN-CACHE')
  } catch (e) {
    laporan.push(`triase cache gagal: ${e?.message ?? e}`)
  }
}

// ---------- 6+7. MESIN GANTI + PERAWAT ----------
const NADI = path.join(DATA, 'nadi-induk.json')

function tulisNadi(mode, anak, restart) {
  try {
    fs.writeFileSync(NADI, JSON.stringify({
      ts: Date.now(),
      iso: new Date().toISOString(),
      induk: process.pid,
      anak: anak?.pid ?? null,
      mode,
      bangkitUlang: restart,
    }))
  } catch {}
}

function pilihMesin() {
  const penandaProd = path.join(DATA, 'MODE-PRODUKSI')
  const serverProd = path.join(ROOT, '.next', 'standalone', 'server.js')
  if (fs.existsSync(penandaProd) && fs.existsSync(serverProd)) return 'PRODUKSI'
  if (fs.existsSync(penandaProd)) {
    laporan.push('MODE-PRODUKSI terpasang tapi bundle produksi tiada — pakai DEV; jalankan `npm run build` lalu boot ulang untuk mesin produksi')
  }
  return 'DEV'
}

function jalankan(mode) {
  const env = {
    ...process.env,
    NODE_ENV: mode === 'PRODUKSI' ? 'production' : 'development',
    PORT: String(PORT),
    HOSTNAME: '0.0.0.0',
    NEXT_TELEMETRY_DISABLED: '1',
  }
  let cmd, args
  if (mode === 'PRODUKSI') {
    cmd = process.execPath // node — setia, tak tergantung bun
    args = [path.join(ROOT, '.next', 'standalone', 'server.js')]
  } else {
    // V303: DEV memakai WEBPACK (bukan turbopack) — kompilasi bertahap
    // yang muat di kotak 4 GB. Turbopack dev terbukti OOM (15 GB virtual)
    // dan panic pada izin folder; webpack dev hemat & matang.
    // Pagar heap 2000 MB: bila meluber, V8 melempar error yang bisa
    // dipulihkan (penjaga membangkitkan ulang), bukan kernel membunuh
    // seluruh kotak.
    cmd = path.join(ROOT, 'node_modules', '.bin', 'next')
    args = ['dev', '-p', String(PORT)]
  }
  log(`menyalakan mesin ${mode}: ${path.basename(cmd)} ${args.join(' ')}`)
  // V303: keluaran anak ditampung penjaga — ditulis ke dev.log DAN
  // diteruskan ke keluaran induk (pengganti `| tee` yang rapuh: bila
  // tee mati, pipa pecah dan anak mati diam-diam oleh EPIPE).
  const catatan = fs.createWriteStream(path.join(ROOT, 'dev.log'), { flags: 'a' })
  // V303e: stdin HARUS 'pipe' dan tak pernah ditutup — Next.js 16 dev
  // memantau stdin; EOF (termasuk dari 'ignore') membuatnya pamit dengan
  // sopan (exit 0) sekejap setelah Ready. Pipa terbuka = anak bertahan.
  // Efek samping baik: bila penjaga ditupuk, pipa menutup dan anak
  // pamit sendiri — tanpa proses yatim.
  const anak = spawn(cmd, args, { cwd: ROOT, env, stdio: ['pipe', 'pipe', 'pipe'] })
  const pamit = (d) => {
    try { process.stdout.write(d) } catch {}
    try { catatan.write(d) } catch {}
  }
  anak.stdout.on('data', pamit)
  anak.stderr.on('data', pamit)
  return anak
}

async function awasi(mode) {
  let bangkit = 0
  let gagalBeruntun = 0
  let anak = jalankan(mode)
  tulisNadi(mode, anak, bangkit)

  const detak = setInterval(() => tulisNadi(mode, anak, bangkit), 30000)

  const matikan = (sinyal) => {
    log(`terima ${sinyal} — meniup anak dengan sopan`)
    try { anak && !anak.killed && anak.kill('SIGTERM') } catch {}
    setTimeout(() => { try { anak && !anak.killed && anak.kill('SIGKILL') } catch {}; process.exit(0) }, 3000)
  }
  process.on('SIGTERM', () => matikan('SIGTERM'))
  process.on('SIGINT', () => matikan('SIGINT'))

  await new Promise((selesai) => {
    let terjadwal = false
    let lahirPada = Date.now()
    const lahirUlang = (alasan) => {
      if (terjadwal) return // satu kematian, satu jadwal — tanpa kaskade
      terjadwal = true
      bangkit++
      const hidupSekejap = Date.now() - lahirPada < 60_000
      if (hidupSekejap) gagalBeruntun++
      else gagalBeruntun = 0
      log(`anak ${alasan} — bangkit ulang ke-${bangkit} setelah pendingin 8 detik (gagal beruntun: ${gagalBeruntun})`)
      if (gagalBeruntun >= 5) {
        log('5 kegagalan beruntun — penjaga menyerah agar tak membakar mesin; periksa dev.log lalu boot ulang')
        clearInterval(detak)
        selesai()
        return
      }
      setTimeout(() => {
        terjadwal = false
        anak = jalankan(mode)
        lahirPada = Date.now()
        tulisNadi(mode, anak, bangkit)
      }, 8000)
    }
    anak.on('exit', (kode, sinyal) => {
      lahirUlang(`mati (kode=${kode}, sinyal=${sinyal ?? '-'})`)
    })
    anak.on('error', (e) => {
      gagalBeruntun++
      log(`anak gagal lahir: ${e.message}`)
    })
  })
  clearInterval(detak)
  process.exit(0)
}

// ---------- UTAMA ----------
const HANYA_SEMBUH = process.argv.includes('--hanya-sembuh')

try {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true })

  const pulih = pulihkanBenih()
  const izin = sembuhkanIzin()

  if (HANYA_SEMBUH) {
    // jalur build/start: sembuhkan lalu pamit — JANGAN menyentuh
    // port/penjaga-lain agar server yang sedang hidup tak tersenggol
    triaseCache()
    log(`hanya-sembuh — ${pulih} file dipulihkan, ${izin} izin disembuhkan`)
    for (const l of laporan.slice(0, 40)) log(`• ${l}`)
    process.exit(0)
  }

  await tiupanPenjagaTua()
  const tetak = await bersihkanPort(PORT)
  triaseCache()
  const mode = pilihMesin()

  log(`siap — ${pulih} file dipulihkan, ${izin} izin disembuhkan, ${tetak} zombi ditetak, mesin: ${mode}`)
  for (const l of laporan.slice(0, 40)) log(`• ${l}`)

  await awasi(mode)
} catch (e) {
  console.log(`[PENJAGA] peringatan fatal tapi baik: ${e?.message ?? e} — coba salur dev langsung`)
  try {
    const anak = spawn(path.join(ROOT, 'node_modules', '.bin', 'next'), ['dev', '-p', '3000'], { cwd: ROOT, stdio: 'inherit' })
    anak.on('exit', (k) => process.exit(k ?? 0))
  } catch (e2) {
    console.log(`[PENJAGA] lewat: ${e2?.message ?? e2}`)
    process.exit(0)
  }
}
