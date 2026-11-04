// ============================================================
// V302 KALIBRASI — Pemuat kalibrasi jual ambisius yang ABADI
// ------------------------------------------------------------
// Syarat abadi pengguna: hasil kalibrasi tidak boleh mati saat
// server restart / workspace di-update. Maka:
//   1. Sumber utama   : file JSON statik di dalam proyek
//                       (kalibrasi-ambisius.json, ikut commit git
//                       dan disalin ke benih/ oleh penjaga).
//   2. Cadangan kode  : jika file hilang total, angka warisan
//                       tertanam DI SINI — sistem tetap hidup dan
//                       jujur memberi label "cadangan kode".
//   3. Tidak ada localStorage, tidak ada cache lintas hari.
// ============================================================

import fs from 'fs'
import path from 'path'

export interface KalibrasiAmbisius {
  versi: string
  dibuat: string
  status: string
  kejujuran: string
  sumber: string
  ambisius: {
    k_atr: number
    k_atr_min: number
    k_atr_maks: number
    toleransi_dilampaui_atr: number
    butuh_sasaran_dulu: boolean
  }
  gerbang_ambisius: {
    daun?: { k: number; tol: number; rezim: string; syarat: { fitur: string; arah: 'max' | 'min'; batas: number }[] }[]
    syarat?: { fitur: string; arah: 'max' | 'min'; batas: number }[]
    maks_atr_pct?: number
    maks_mom7?: number
    maks_jarak_dari_puncak20_pct?: number
    maks_rsi14?: number
    min_qv_rasio?: number
    butuh_bias_searah?: boolean
  }
  sertifikat: {
    total_soal: number
    benar?: number
    lulus?: number
    gagal?: number
    lulus_pct?: number
    tercapai?: number
    salah?: number
    pasang?: number
    presisi_janji?: number
    terlewat?: number
    menunggu_sentuh?: number
    peluang_ada?: number
    per_rezim?: Record<string, { pasang?: number; tercapai?: number; salah?: number; soal?: number; lulus?: number }>
    rentang_data?: string
    resolusi_verifikasi?: string
    diuji_pada?: string
  } | null
}

// Cadangan kode — angka warisan V299b (dipakai hanya bila file JSON hilang)
const CADANGAN_KODE: KalibrasiAmbisius = {
  versi: 'V302-CADANGAN-KODE',
  dibuat: '2026-10-12T00:00:00Z',
  status: 'CADANGAN_KODE_BELUM_TERKALIBRASI',
  kejujuran:
    'File kalibrasi-ambisius.json tidak terbaca — sistem memakai angka warisan yang tertanam di kode. Label jujur ini wajib tampil di UI.',
  sumber: 'tertanam di kalibrasi.ts',
  ambisius: {
    k_atr: 2.6,
    k_atr_min: 2.0,
    k_atr_maks: 3.2,
    toleransi_dilampaui_atr: 0.35,
    butuh_sasaran_dulu: true,
  },
  gerbang_ambisius: {
    maks_atr_pct: 9.0,
    maks_mom7: 18.0,
    maks_jarak_dari_puncak20_pct: 22.0,
    maks_rsi14: 78.0,
    min_qv_rasio: 0.7,
    butuh_bias_searah: true,
  },
  sertifikat: null,
}

const g = globalThis as unknown as { __arenaKalibrasi?: KalibrasiAmbisius; __arenaKalibrasiPada?: number }

const KANDIDAT_PATH = [
  path.join(process.cwd(), 'src', 'lib', 'cyborg', 'kalibrasi-ambisius.json'),
  path.join(process.cwd(), 'benih', 'kalibrasi-ambisius.json'),
  path.join(process.cwd(), 'data', 'kalibrasi-ambisius.json'),
]

/** Baca kalibrasi dari disk (selalu baca ulang tiap 60 dtk agar update file terasa tanpa restart). */
export function muatKalibrasi(): KalibrasiAmbisius {
  const kini = Date.now()
  if (g.__arenaKalibrasi && g.__arenaKalibrasiPada && kini - g.__arenaKalibrasiPada < 60_000) {
    return g.__arenaKalibrasi
  }
  for (const p of KANDIDAT_PATH) {
    try {
      if (!fs.existsSync(p)) continue
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as KalibrasiAmbisius
      if (raw && raw.ambisius && raw.gerbang_ambisius) {
        g.__arenaKalibrasi = raw
        g.__arenaKalibrasiPada = kini
        return raw
      }
    } catch {
      // file rusak → lanjut ke kandidat berikutnya
    }
  }
  g.__arenaKalibrasi = CADANGAN_KODE
  g.__arenaKalibrasiPada = kini
  return CADANGAN_KODE
}

/** Status singkat untuk UI (label jujur V274). */
export function statusKalibrasi(): { status: string; versi: string; terkalibrasi: boolean; sumber: string } {
  const k = muatKalibrasi()
  const s = k.sertifikat
  // terkalibrasi = ujian lulus: salah 0, pasang tak diam, soal penuh
  const terkalibrasi = !!s && s.total_soal >= 50_000 && (s.salah ?? -1) === 0 && (s.pasang ?? 0) >= 120
  return {
    status: k.status,
    versi: k.versi,
    terkalibrasi,
    sumber: k.sumber,
  }
}
