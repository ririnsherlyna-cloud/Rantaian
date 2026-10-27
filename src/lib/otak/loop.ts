// ============================================================
// MOZAIK FAKULTAS: LEARNING LOOP
// "informasi → verifikasi → eksperimen → evaluasi → koreksi →
//  retest → pembelajaran" dan siklus Guru:
//   Amati → Analisis → Kumpulkan bukti → Tentukan arah →
//   BUY/SELL → Evaluasi → Pelajari kesalahan → Benahi →
//   Tingkatkan presisi
//
// Siklus TIDAK diklaim — diukur dari bukti: ronde belajar
// (file r1/r2/..., probe bedah) per suite + kegagalan yang
// berubah menjadi pelajaran (dibaca dari bukti versi lama).
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import { bacaKepala, num, SUITE_REGISTRI } from './evaluasi'
import type { HasilLoop, SiklusTerukur } from './types'

const ROOT = process.cwd()
const DIR_UJIAN = path.join(ROOT, 'research')

export const FASE_LOOP = [
  { nomor: 1, nama: 'Amati', tanya: 'Apa yang terlihat di 60 candle visible?' },
  { nomor: 2, nama: 'Analisis', tanya: 'Anatomi pergerakan & episode apa yang sedang berjalan?' },
  { nomor: 3, nama: 'Kumpulkan bukti', tanya: 'Apa kata dewan 8 dimensi (struktur/likuiditas/volume/momentum/volatilitas/S-R/tekanan/kondisi)?' },
  { nomor: 4, nama: 'Tentukan arah', tanya: 'Di arah mana bukti terkuat mengarah?' },
  { nomor: 5, nama: 'BUY / SELL', tanya: 'Vonis biner dgn kepastian — tanpa SKIP' },
  { nomor: 6, nama: 'Evaluasi', tanya: 'Benar atau salah? Berapa NET setelah fee 0.2%?' },
  { nomor: 7, nama: 'Pelajari kesalahan', tanya: 'Mengapa salah? Pola apa yang tidak terbaca? Informasi apa yang kurang?' },
  { nomor: 8, nama: 'Benahi', tanya: 'Bagian algoritma mana yang diperbaiki? Pelajaran apa yang ditulis?' },
  { nomor: 9, nama: 'Tingkatkan presisi', tanya: 'Uji ulang dengan skenario BARU — akurasi naik & bertahan?' },
]

/** deteksi ronde belajar dari nama file bukti (r1, r2, r10, ronde1, probe) */
function rondeDariFile(nama: string[]): { angka: number; label: string[] } {
  const label = new Set<string>()
  for (const n of nama) {
    const m = /^r(\d+)[-.]/i.exec(n) ?? /^ronde-?(\d+)/i.exec(n)
    if (m) label.add(`r${m[1]}`)
    if (/probe|bedah/i.test(n)) label.add('probe-bedah')
    if (/hakim/i.test(n)) label.add('hakim')
    if (/segel|seged|pamungkas/i.test(n)) label.add('segel')
  }
  const angka = new Set<string>()
  for (const l of label) {
    const m = /^r(\d+)$/.exec(l)
    if (m) angka.add(m[1])
  }
  return { angka: angka.size, label: [...label].sort() }
}

export async function bangunLoop(kegagalanJadiPelajaran: number): Promise<HasilLoop> {
  const siklus: SiklusTerukur[] = []
  let totalRonde = 0

  for (const s of SUITE_REGISTRI) {
    const dir = path.join(DIR_UJIAN, s.dir)
    let nama: string[] = []
    try {
      nama = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))
    } catch { continue }

    const { angka, label } = rondeDariFile(nama)

    // pelajaranBaru = versi otak berbeda yang tercatat di bukti (tiap lonjakan versi = 1 benahi)
    const versi = new Set<string>()
    for (const f of nama) {
      try {
        const { meta, top } = await bacaKepala(path.join(dir, f))
        const v = meta?.versi ?? top?.versi
        if (v !== undefined && v !== null) versi.add(String(v))
      } catch { /* lewati */ }
    }
    siklus.push({
      suite: s.id,
      ronde: Math.max(angka, 1),
      rondeLabel: label,
      pelajaranBaru: versi.size,
    })
    totalRonde += Math.max(angka, 1)
  }

  return {
    fase: FASE_LOOP,
    siklus,
    totalRonde,
    kegagalanJadiPelajaran,
  }
}

/** kegagalan versi-terdahulu = bahan pelajaran (dihitung dari bukti NON-tereku) */
export async function hitungKegagalanRiwayat(): Promise<number> {
  let gagal = 0
  for (const s of SUITE_REGISTRI) {
    const dir = path.join(DIR_UJIAN, s.dir)
    let nama: string[] = []
    try {
      nama = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))
    } catch { continue }
    for (const f of nama) {
      try {
        const { meta, ring, top } = await bacaKepala(path.join(dir, f))
        const v = String(meta?.versi ?? top?.versi ?? '')
        if (v === s.otakVersi) continue // versi beku sudah dinilai evaluasi
        // format ringkas FBO
        const maks = num(top?.max)
        const lulusFbo = num(top?.total)
        if (maks !== null && lulusFbo !== null) { gagal += maks - lulusFbo; continue }
        const total = num(ring?.total) ?? num(ring?.trapTotal) ?? num(top?.total)
        const lulus = num(ring?.arahBenar) ?? num(ring?.berhasil) ?? num(ring?.trapBenar) ?? num(top?.benar)
        if (total !== null && lulus !== null && total > lulus) gagal += total - lulus
      } catch { /* lewati */ }
    }
  }
  return gagal
}
