// ============================================================
// EVALUASI MOZAIK — eksekusi CLI objektif seluruh fakultas.
//
// Jalankan: bun scripts/evaluasi_otak.ts
// Hasil   : research/otak/snapshot-otak.json (bukti fisik) +
//           ringkasan di terminal.
//
// Ini BUKTI ukur mandiri Guru: bukan klaim "sistem makin
// pintar", tetapi matriks angka dari disk & jaringan nyata.
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import { snapshotArsitektur } from '../src/lib/otak/indeks'

async function main() {
  console.log('MOZAIK — evaluasi arsitektur kognitif terpadu (probe jaringan + sapu disk penuh)…\n')
  const t0 = Date.now()
  const s = await snapshotArsitektur({ probeInternet: true, memoriLengkap: true })
  const dt = ((Date.now() - t0) / 1000).toFixed(1)

  // ---- fakultas ----
  console.log('── FAKULTAS ─────────────────────────────────────────')
  for (const f of s.fakultas) {
    console.log(` [${f.kesehatan.padEnd(10)}] ${f.nama}`)
    console.log(`    bukti: ${f.bukti}`)
  }

  // ---- matriks kemampuan ----
  console.log('\n── MATRIKS KEMAMPUAN (versi tersertifikasi) ─────────')
  for (const m of s.evaluasi.suites) {
    const bar = '█'.repeat(Math.round(m.persen / 5)).padEnd(20, '░')
    console.log(` ${m.id.padEnd(9)} ${bar} ${m.berhasil}/${m.total} (${m.persen.toFixed(2)}%) · organ ${m.organ} otak ${m.otakVersi} · lik ${m.likuidasi} · hakim ${m.hakim.berhasil}/${m.hakim.total} · segel ${m.segel.berhasil}/${m.segel.total}`)
  }
  console.log(` GRAND: ${s.evaluasi.grandBerhasil}/${s.evaluasi.grandTotal} = ${s.evaluasi.grandPersen.toFixed(3)}% · net +${s.evaluasi.grandNet.toFixed(1)}% kumulatif · ${s.evaluasi.grandLikuidasi} likuidasi`)
  console.log(` Kelemahan diakui: ${s.evaluasi.kelemahan.length}`)
  s.evaluasi.kelemahan.forEach((k) => console.log(`   ! ${k}`))

  // ---- memori ----
  if (s.memori) {
    console.log('\n── LONG-TERM MEMORY ─────────────────────────────────')
    console.log(` pengalaman terekam: ${s.memori.pengalaman.toLocaleString('id-ID')} eksekusi · kesalahan: ${s.memori.kegagalan.toLocaleString('id-ID')}`)
    console.log(` tier HOT/WARM/COLD: ${s.memori.tier.hot}/${s.memori.tier.warm}/${s.memori.tier.cold} · bukti ${s.memori.file} file · ${(s.memori.bytes / 1048576).toFixed(1)} MB`)
    const top = s.memori.pelajaran.slice(0, 12)
    console.log(` aset pengetahuan: ${s.memori.pelajaran.length} kode · top: ${top.map((p) => `${p.kode}×${p.jumlah}`).join(', ')}`)
  }

  // ---- internet ----
  if (s.internet) {
    console.log('\n── INTERNET INTELLIGENCE (probe langsung) ───────────')
    for (const x of s.internet) {
      console.log(` ${x.ok ? '✓' : '✗'} ${x.id.padEnd(20)} ${x.latencyMs ?? '—'}ms · ${x.verifikasi} · ${x.gratis && x.tanpaKey ? 'gratis tanpa key' : 'BERBAYAR!'}`)
    }
  }

  // ---- developer ----
  if (s.developer) {
    console.log('\n── DEVELOPER INTELLIGENCE (diagnostik mandiri) ──────')
    for (const d of s.developer.diagnostik) {
      console.log(` ${d.ok ? '✓' : '✗'} ${d.nama} — ${d.detail}`)
    }
    if (s.developer.sakti.sha256) {
      console.log(` SAKTI SHA256: ${s.developer.sakti.sha256}`)
    }
  }

  // ---- loop ----
  console.log('\n── LEARNING LOOP ────────────────────────────────────')
  console.log(` fase: ${s.loop.fase.map((f) => f.nama).join(' → ')}`)
  console.log(` total ronde: ${s.loop.totalRonde} · kegagalan riwayat → pelajaran: ${s.loop.kegagalanJadiPelajaran}`)
  for (const c of s.loop.siklus) {
    console.log(`   ${c.suite.padEnd(9)} ${String(c.ronde).padStart(2)} ronde · ${c.pelajaranBaru} versi otak · jejak: ${c.rondeLabel.join(', ')}`)
  }

  // ---- alat ----
  console.log('\n── TOOL & API LAYER ─────────────────────────────────')
  for (const a of s.alat) console.log(` · ${a.nama} [${a.file}] ${a.versi ? 'v' + a.versi : ''}`)

  // ---- simpan bukti fisik ----
  const outDir = path.join(process.cwd(), 'research', 'otak')
  await fs.mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, 'snapshot-otak.json')
  await fs.writeFile(outFile, JSON.stringify(s, null, 1))
  console.log(`\n Bukti fisik: ${outFile} (${((await fs.stat(outFile)).size / 1024).toFixed(1)} KB) · durasi total ${dt}s`)
  console.log(` VERDICT: ${s.fakultas.every((f) => f.kesehatan === 'SEHAT') && s.evaluasi.grandPersen >= 99 ? 'ARSITEKTUR SEHAT — semua fakultas hidup, kemampuan terukur' : 'PERLU PERHATIAN — lihat fakultas PERINGATAN/SAKIT di atas'}`)
}

main().catch((e) => {
  console.error('EVALUASI GAGAL:', e)
  process.exit(1)
})
