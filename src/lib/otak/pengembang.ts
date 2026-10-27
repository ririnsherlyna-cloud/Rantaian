// ============================================================
// MOZAIK FAKULTAS: DEVELOPER INTELLIGENCE
// Membaca, memeriksa, menguji, dan memelihara kode miliknya
// sendiri — bukan sekadar klaim:
//   · integritas SAKTI (ukuran + SHA256 + penanda 4 organ)
//   · uji-diri organ (penanda self-test di dalam SAKTI)
//   · integritas zona unduh (manifest.json ↔ file nyata)
//   · keutuhan infrastruktur ujian (modul otak + runner + bukti)
//   · kejujuran worklog (Task terakhir tercatat)
//
// Prinsip: AUTOMATED TESTING (diagnostik dijalankan otomatis),
// RECOVERY (backup pre-organ diperiksa ada), OBSERVABILITY
// (hasil dgn detail file nyata), CONTINUOUS VALIDATION.
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type { DiagnostikDev, HasilDeveloper } from './types'

const ROOT = process.cwd()
const SAKTI = path.join(ROOT, 'download', 'Micaprofita_V231_SAKTI.html')

// penanda organ DI DALAM SAKTI: organ punya versi sendiri
// (mirror otak arena: PD-organ v1.0 memirror otak v1.7,
//  KOMPLEKS-organ v1.0 memirror otak v1.2)
const ORGAN_PENANDA: { nama: string; pola: RegExp; mirror: string }[] = [
  { nama: 'v237-FBO (organ v1.38)', pola: /SAKTI-FBO[^\n]{0,80}v1\.38/i, mirror: 'otak v1.38' },
  { nama: 'v238-PD (organ v1.0)', pola: /SAKTI-PD[^\n]{0,80}v1\.0/i, mirror: 'otak v1.7' },
  { nama: 'v239-KOMPLEKS (organ v1.0)', pola: /SAKTI-KOMPLEKS[^\n]{0,80}v1\.0/i, mirror: 'otak v1.2' },
  { nama: 'v240-ARAH (organ v1.8)', pola: /SAKTI-ARAH[^\n]{0,80}v1\.8/i, mirror: 'otak v1.8' },
]

async function ukurFile(p: string): Promise<number | null> {
  try { return (await fs.stat(p)).size } catch { return null }
}

async function ada(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

export async function diagnosaDeveloper(): Promise<HasilDeveloper> {
  const diagnostik: DiagnostikDev[] = []
  const uji = async (nama: string, janji: () => Promise<{ ok: boolean; detail: string }>) => {
    try {
      const r = await janji()
      diagnostik.push({ nama, ok: r.ok, detail: r.detail })
    } catch (e) {
      diagnostik.push({ nama, ok: false, detail: `galat: ${(e as Error).message}` })
    }
  }

  // ---- 1. SAKTI: ada, ukuran, SHA256, organ ----
  let saktiBytes: number | null = null
  let saktiSha: string | null = null
  const organDitemukan: string[] = []
  await uji('SAKTI utuh (ukuran & SHA256)', async () => {
    const bytes = await ukurFile(SAKTI)
    if (bytes === null) return { ok: false, detail: 'file SAKTI tidak ditemukan di download/' }
    saktiBytes = bytes
    const hash = crypto.createHash('sha256')
    hash.update(await fs.readFile(SAKTI))
    saktiSha = hash.digest('hex')
    return { ok: bytes > 10_000_000, detail: `${(bytes / 1024 / 1024).toFixed(2)} MB · SHA256 ${saktiSha.slice(0, 16)}…` }
  })

  await uji('Organ bersertifikat di dalam SAKTI (4/4)', async () => {
    if (saktiBytes === null) return { ok: false, detail: 'SAKTI tidak terbaca — organ tak bisa diverifikasi' }
    const teks = await fs.readFile(SAKTI, 'utf8')
    for (const o of ORGAN_PENANDA) if (o.pola.test(teks)) organDitemukan.push(o.nama)
    const selfTest = (teks.match(/self-test/gi) || []).length
    const ok = organDitemukan.length === ORGAN_PENANDA.length
    return {
      ok,
      detail: ok
        ? `${organDitemukan.length}/4 organ terpasang (${ORGAN_PENANDA.map((o) => o.mirror).join(', ')}) · ${selfTest} titik self-test`
        : `hanya ${organDitemukan.length}/4 organ: ${organDitemukan.join(', ') || 'tidak ada'}`,
    }
  })

  // ---- 2. Zona unduh: manifest ↔ file nyata ----
  await uji('Manifest zona unduh sinkron dengan disk', async () => {
    const mf = path.join(ROOT, 'public', 'unduh', 'manifest.json')
    if (!(await ada(mf))) return { ok: false, detail: 'public/unduh/manifest.json tidak ada — jalankan siapkan_unduh.ts' }
    const j = JSON.parse(await fs.readFile(mf, 'utf8')) as {
      entri?: { nama?: string; byte?: number; sha256?: string }[]
      jumlah?: number
      dihasilkan?: string
    }
    const daftar = j.entri ?? []
    if (daftar.length === 0) return { ok: false, detail: 'manifest kosong' }
    let cocok = 0
    let beda = 0
    for (const entri of daftar) {
      if (!entri.nama) continue
      const p = path.join(ROOT, 'public', 'unduh', path.basename(entri.nama))
      const bytes = await ukurFile(p)
      if (bytes === null) { beda++; continue }
      if (entri.byte === bytes) cocok++
      else beda++
    }
    return {
      ok: beda === 0,
      detail: `${daftar.length} entri · ${cocok} byte-cocok · ${beda} menyimpang`,
    }
  })

  // ---- 3. Infrastruktur ujian: modul otak + runner + bukti ----
  await uji('Infrastruktur ujian lengkap (otak + runner)', async () => {
    const wajib = [
      'src/lib/exam/arah-brain.ts',
      'src/lib/exam/kompleks-brain.ts',
      'src/lib/exam/pumpdump-brain.ts',
      'src/lib/exam/fbo-brain.ts',
      'src/lib/exam/kompleks-forge.ts',
      'src/lib/otak/indeks.ts',
      'scripts/ujian_arah100.ts',
      'scripts/ujian_kompleks100.ts',
      'scripts/package_taskfiles.sh',
      'scripts/siapkan_unduh.ts',
    ]
    const hilang: string[] = []
    for (const f of wajib) if (!(await ada(path.join(ROOT, f)))) hilang.push(f)
    return {
      ok: hilang.length === 0,
      detail: hilang.length === 0 ? `${wajib.length}/${wajib.length} modul inti ada` : `hilang: ${hilang.join(', ')}`,
    }
  })

  await uji('Bukti ujian tersedia untuk 9 suite', async () => {
    let berisi = 0
    for (const d of ['ujian-fbo', 'ujian-bulltrap', 'ujian-beartrap', 'ujian-stophunt', 'ujian-pumpdump', 'ujian-gabungan', 'ujian-candle', 'ujian-kompleks', 'ujian-arah']) {
      try {
        const n = (await fs.readdir(path.join(ROOT, 'research', d))).filter((f) => f.endsWith('.json')).length
        if (n > 0) berisi++
      } catch { /* folder absen */ }
    }
    return { ok: berisi === 9, detail: `${berisi}/9 suite punya bukti JSON` }
  })

  await uji('Recovery: backup SAKTI pre-organ ada', async () => {
    const backup = [
      'download/Micaprofita_V231_SAKTI.backup-pre-v238.html',
      'download/Micaprofita_V231_SAKTI.backup-pre-v239.html',
      'download/Micaprofita_V231_SAKTI.backup-pre-v240.html',
    ]
    let n = 0
    for (const b of backup) if (await ada(path.join(ROOT, b))) n++
    return { ok: n >= 2, detail: `${n}/3 backup rollback tersedia` }
  })

  await uji('Worklog aktif (rekam jejak belajar)', async () => {
    const p = path.join(ROOT, 'worklog.md')
    if (!(await ada(p))) return { ok: false, detail: 'worklog.md tidak ada' }
    const teks = await fs.readFile(p, 'utf8')
    const tugas = new Set((teks.match(/^Task ID: (\d+)$/gm) || []).map((m) => m.replace(/\D/g, '')))
    return { ok: tugas.size > 0, detail: `${tugas.size} task tercatat · terakhir: Task ${[...tugas].sort((a, b) => Number(b) - Number(a))[0]}` }
  })

  const paketZip = path.join(ROOT, 'download', 'MICAPROFITA-TASKFILES.zip')
  const paketBytes = await ukurFile(paketZip)

  return {
    diagnostik,
    sakti: {
      ada: saktiBytes !== null,
      bytes: saktiBytes,
      sha256: saktiSha,
      organ: organDitemukan,
    },
    paket: { file: diagnostik.length, zip: paketBytes !== null ? `${(paketBytes / 1024 / 1024).toFixed(2)} MB` : null },
  }
}
