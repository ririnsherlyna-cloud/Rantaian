// ============================================================
// MOZAIK — ORKESTRATOR ARSITEKTUR KOGNITIF TERPADU
//
// Menyatukan 9 fakultas menjadi satu snapshot hidup:
//   1 Core Intelligence        6 Developer Intelligence
//   2 Internet Intelligence    7 Self-Evaluation Engine
//   3 Deep Crypto Intelligence 8 Learning Loop
//   4 Long-Term Memory         9 Advanced Interface
//   5 Tool & API Layer
//
// Prinsip:
//   · FAULT ISOLATION — fakultas yang sakit dilaporkan, tidak
//     meruntuhkan snapshot (semua getter dibungkus guard)
//   · OBSERVABILITY — durasi tiap fakultas dicatat (ms)
//   · RECOVERY — mode hemat utk jaringan gagal total
//   · CACHE — TTL 60 dtk (sumber disk lambat berubah)
// ============================================================

import { bangunFakultas } from './fakultas'
import { evaluasiDiri } from './evaluasi'
import { bangunMemori } from './memori'
import { periksaInternet } from './internet'
import { diagnosaDeveloper } from './pengembang'
import { daftarAlat } from './alat'
import { bangunLoop, hitungKegagalanRiwayat } from './loop'
import type { Hasil, SnapshotArsitektur } from './types'

export const MOZAIK_VERSI = '1.0'

async function jaga<T>(nama: string, janji: () => Promise<T>): Promise<Hasil<T>> {
  const t0 = Date.now()
  try {
    return { ok: true, data: await janji(), error: null, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, data: null, error: `${nama}: ${(e as Error).message}`, ms: Date.now() - t0 }
  }
}

export interface OpsiSnapshot {
  /** probe sumber internet secara langsung (bawaan: true) */
  probeInternet?: boolean
  /** pungut kode pelajaran penuh dari bukti (bawaan: false — mode runtime hemat) */
  memoriLengkap?: boolean
}

export async function snapshotArsitektur(opsi: OpsiSnapshot = {}): Promise<SnapshotArsitektur> {
  const probeInternet = opsi.probeInternet ?? true
  const memoriLengkap = opsi.memoriLengkap ?? false

  const ev = await jaga('evaluasi', () => evaluasiDiri())
  const hasilEval =
    ev.data ??
    {
      suites: [], grandTotal: 0, grandBerhasil: 0, grandPersen: 0,
      grandLikuidasi: 0, grandNet: 0, kelemahan: [ev.error ?? 'evaluasi gagal'], fileTotal: 0,
    }

  const [fakultas, memori, internet, developer, alat, gagalRiwayat] = await Promise.all([
    jaga('fakultas', () => bangunFakultas(hasilEval)),
    jaga('memori', () => bangunMemori(memoriLengkap)),
    jaga('internet', () => periksaInternet(probeInternet)),
    jaga('developer', () => diagnosaDeveloper()),
    jaga('alat', () => daftarAlat()),
    jaga('gagal-riwayat', () => hitungKegagalanRiwayat()),
  ])

  const loop = await jaga('loop', () => bangunLoop(gagalRiwayat.data ?? 0))

  // bukti snapshot CLI terakhir (jika pernah dijalankan)
  let buktiCli: SnapshotArsitektur['buktiCli'] = null
  try {
    const { readFile, stat } = await import('node:fs/promises')
    const p = `${process.cwd()}/research/otak/snapshot-otak.json`
    const st = await stat(p)
    const j = JSON.parse(await readFile(p, 'utf8')) as { waktu?: string; evaluasi?: { grandPersen?: number } }
    buktiCli = { file: p, waktu: j.waktu ?? st.mtime.toISOString(), grandPersen: j.evaluasi?.grandPersen ?? 0 }
  } catch { /* belum ada */ }

  return {
    waktu: new Date().toISOString(),
    nama: 'MOZAIK — Arsitektur Kognitif Terpadu MICAPROFITA',
    versi: MOZAIK_VERSI,
    fakultas: fakultas.data ?? [],
    evaluasi: hasilEval,
    memori: memori.data,
    memoriError: memori.error,
    internet: internet.data,
    internetError: internet.error,
    developer: developer.data,
    developerError: developer.error,
    alat: alat.data ?? [],
    loop:
      loop.data ?? {
        fase: [], siklus: [], totalRonde: 0,
        kegagalanJadiPelajaran: gagalRiwayat.data ?? 0,
      },
    buktiCli,
  }
}
