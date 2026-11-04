// ============================================================
// MOZAIK — ARSITEKTUR KOGNITIF TERPADU MICAPROFITA
// Tipe bersama untuk seluruh fakultas kognitif.
//
// Prinsip rekayasa: MODULARITAS (1 fakultas = 1 modul),
// FAULT ISOLATION (hasil tiap fakultas dibungkus Hasil<T>),
// OBSERVABILITY (semua angka berasal dari file nyata di disk).
// ============================================================

/** hasil aman: fakultas yang sakit TIDAK boleh merobohkan otak */
export interface Hasil<T> {
  ok: boolean
  data: T | null
  error: string | null
  /** durasi komputasi ms (observability) */
  ms: number
}

export type FakultasId =
  | 'inti' // Core Intelligence
  | 'internet' // Internet Intelligence
  | 'kripto' // Deep Crypto Intelligence
  | 'memori' // Long-Term Memory
  | 'alat' // Tool & API Layer
  | 'developer' // Developer Intelligence
  | 'evaluasi' // Self-Evaluation Engine
  | 'loop' // Learning Loop
  | 'interface' // Advanced Interface

export type Kesehatan = 'SEHAT' | 'PERINGATAN' | 'SAKIT' | 'DINONAKTIFKAN'

export interface Fakultas {
  id: FakultasId
  nama: string
  peran: string
  /** modul yang mengimplementasikan fakultas ini (observability: siapa mengerjakan apa) */
  implementasi: string[]
  /** prinsip rekayasa kompleks yang dipakai fakultas ini */
  prinsip: string[]
  kesehatan: Kesehatan
  /** bukti objektif terbaru (angka dari data nyata, bukan klaim) */
  bukti: string
}

// ---------------- SELF-EVALUATION ENGINE ----------------

export interface SuiteRingkas {
  file: string
  ns: string
  tag: string
  tanggal: string
  otak: string | null
  /** jenis pengujian: latihan | hakim | segel | lainnya */
  jenis: 'LATIHAN' | 'HAKIM' | 'SEGEL' | 'LAIN'
  total: number | null
  berhasil: number | null
  likuidasi: number | null
  rugiNet: number | null
  netSum: number | null
  /** akurasi arah (suite ARAH) */
  arahAkurasi: number | null
  /** kalibrasi kepastian benar-minus-salah */
  kalibrasi: number | null
}

export interface SuiteMatriks {
  id: string
  label: string
  organ: string
  otakVersi: string
  /** total seluruh ujian tercatat (latihan+hakim+segel) */
  total: number
  berhasil: number
  persen: number
  likuidasi: number
  rugiNet: number
  netSum: number
  hakim: { total: number; berhasil: number }
  segel: { total: number; berhasil: number; persen: number | null }
  file: number
}

export interface HasilEvaluasi {
  suites: SuiteMatriks[]
  grandTotal: number
  grandBerhasil: number
  grandPersen: number
  grandLikuidasi: number
  grandNet: number
  /** daftar kelemahan terbuka yang diakui mesin (kejujuran) */
  kelemahan: string[]
  /** file JSON bukti per suite */
  fileTotal: number
}

// ---------------- LONG-TERM MEMORY ----------------

export interface Pelajaran {
  kode: string
  jumlah: number
  contoh: string | null
}

export interface HasilMemori {
  /** total pengalaman/keputusan tersimpan di seluruh bukti JSON */
  pengalaman: number
  /** keputusan yang GAGAL/likuidasi — bahan belajar terjadwal */
  kegagalan: number
  pelajaran: Pelajaran[]
  tier: { hot: number; warm: number; cold: number }
  bytes: number
  file: number
  laporan: string[]
}

// ---------------- INTERNET INTELLIGENCE ----------------

export interface SumberHealth {
  id: string
  nama: string
  url: string
  /** seluruh sumber WAJIB gratis tanpa api-key (mandat Guru) */
  gratis: boolean
  tanpaKey: boolean
  ok: boolean
  latencyMs: number | null
  verifikasi: string
  redundancy: string | null
}

// ---------------- DEVELOPER INTELLIGENCE ----------------

export interface DiagnostikDev {
  nama: string
  ok: boolean
  detail: string
}

export interface HasilDeveloper {
  diagnostik: DiagnostikDev[]
  sakti: { ada: boolean; bytes: number | null; sha256: string | null; organ: string[] }
  paket: { file: number; zip: string | null }
}

// ---------------- TOOL & API LAYER ----------------

export interface Alat {
  id: string
  nama: string
  file: string
  versi: string | null
  peran: string
  zeroCost: boolean
  bukti: string
}

// ---------------- LEARNING LOOP ----------------

export interface FaseLoop {
  nomor: number
  nama: string
  tanya: string
}

export interface SiklusTerukur {
  suite: string
  ronde: number
  rondeLabel: string[]
  pelajaranBaru: number
}

export interface HasilLoop {
  fase: FaseLoop[]
  siklus: SiklusTerukur[]
  totalRonde: number
  kegagalanJadiPelajaran: number
}

// ---------------- SNAPSHOT ----------------

export interface SnapshotArsitektur {
  waktu: string
  nama: string
  versi: string
  fakultas: Fakultas[]
  evaluasi: HasilEvaluasi
  memori: HasilMemori | null
  memoriError: string | null
  internet: SumberHealth[] | null
  internetError: string | null
  developer: HasilDeveloper | null
  developerError: string | null
  alat: Alat[]
  loop: HasilLoop
  /** bukti file snapshot CLI terakhir (jika ada) */
  buktiCli: { file: string; waktu: string; grandPersen: number } | null
}
