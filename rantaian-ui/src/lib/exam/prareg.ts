// ============================================================
// PRA-REGISTRASI PREDIKSI — INTI BUKTI "SEBELUM TERJADI".
//
// Mandat Guru:
//   "sebisa mungkin kepahaman dia sangat melampaui Dan mampu
//    menembak akurasi yang sangat koheren SEBELUM prediksi itu
//    terjadi."
//
// Prinsip: prediksi yang belum dikunci = prediksi yang bisa
// dibohongi. Maka setiap prediksi WAJIB:
//   1. DIKUNCI lebih dulu (ledger append-only) — berisi arah,
//      kepastian, dan TRAJEKTORI 4 titik pemeriksaan (candle
//      horizon ke-3/7/11/14) — lalu file ledger DITULIS ke disk
//      SEBELUM horizon dibuka.
//   2. DIRANTAI HASH (SHA-256, implementasi murni TS tanpa
//      dependensi — digest identik antara runner Bun, browser,
//      dan organ SAKTI): setiap entri memuat `prev` = hash
//      entri sebelumnya; mengubah satu bit pun merusak rantai.
//   3. DIBUKA kemudian: resolusi menghitung koherensi trajektori
//      vs pergerakan nyata; integritas rantai diverifikasi ulang.
//
// Fase cek: 'NAIK' | 'TURUN' | 'DATAR' (zona mati DATAR: |Δ| <
// 0.15 ATR) pada candle horizon ke-3, 7, 11, 14.
// ============================================================

// ---------- SHA-256 murni TS (sinkron, tanpa dependensi) ----------
// Vektor uji wajib: sha256('abc') =
//   ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n))

export function sha256Hex(pesan: string): string {
  // UTF-8 encode
  const bytes: number[] = []
  const enc = new TextEncoder()
  const raw = enc.encode(pesan)
  for (let i = 0; i < raw.length; i++) bytes.push(raw[i])
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  // panjang 64-bit big-endian (cukup 32-bit rendah utk pesan < 512MB)
  const hi = Math.floor(bitLen / 0x100000000)
  const lo = bitLen >>> 0
  bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255)
  bytes.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255)

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
  const w = new Array<number>(64)

  for (let off = 0; off < bytes.length; off += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = ((bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) |
        (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3]) >>> 0
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('')
}

// ---------- Kanonikalisasi (deterministik lintas bahasa) ----------
type Obj = Record<string, unknown>

/** Stringify stabil: kunci terurut, angka bulat apa adanya, desimal
 *  dibulatkan 1e-6 dan dipangkas nol ekor — hasil identik di TS,
 *  browser, dan organ JS SAKTI. */
export function kanonikal(x: unknown): string {
  if (x === null || typeof x === 'number') {
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) return 'null'
      if (Number.isInteger(x)) return String(x)
      return String(parseFloat(x.toFixed(6)))
    }
    return 'null'
  }
  if (typeof x === 'string') return JSON.stringify(x)
  if (typeof x === 'boolean') return x ? 'true' : 'false'
  if (Array.isArray(x)) return '[' + x.map(kanonikal).join(',') + ']'
  const o = x as Obj
  const kunci = Object.keys(o).sort()
  return '{' + kunci.map((k) => JSON.stringify(k) + ':' + kanonikal(o[k])).join(',') + '}'
}

// ---------- Tipe kunci pra-registrasi ----------
export type FaseCek = 'NAIK' | 'TURUN' | 'DATAR'
export const H_CEK = [3, 7, 11, 14] as const
export const ZONA_MATI_ATR = 0.15
export const GENESIS = '0'.repeat(64)

/** Satu kunci prediksi TERKUNCI (belum dibuka). */
export interface KunciPra {
  nomor: number // nomor skenario (1..100)
  ns: string // namespace suite
  seed: string
  simbol: string
  arah: 'NAIK' | 'TURUN' // arah terkunci SEBELUM terjadi
  kepastian: number // 0..100
  cek: [FaseCek, FaseCek, FaseCek, FaseCek] // trajektori 4 titik
  dasar: string // dasar trajektori (penjelasan singkat)
  versiOtak: string
  waktu: string // ISO — saat DIKUNCI
  prev: string // hash entri sebelumnya (rantai)
}

/** Entri ledger: kunci + hash rantainya. */
export interface EntriLedger {
  hash: string
  kunci: KunciPra
}

/** Ledger kunci — DITULIS KE DISK SEBELUM horizon dibuka. */
export interface LedgerPra {
  protokol: 'PRA-REGISTRASI-MICAPROFITA'
  ns: string
  tag: string
  versiOtak: string
  dibuat: string
  jumlah: number
  rantai: EntriLedger[]
}

export function payloadKunci(k: KunciPra): Obj {
  return {
    nomor: k.nomor, ns: k.ns, seed: k.seed, simbol: k.simbol, arah: k.arah,
    kepastian: k.kepastian, cek: k.cek, dasar: k.dasar, versiOtak: k.versiOtak,
    waktu: k.waktu, prev: k.prev,
  }
}

export function hashKunci(k: KunciPra): string {
  return sha256Hex(kanonikal(payloadKunci(k)))
}

/** Tambah entri ke rantai (mutasi ledger, append-only). */
export function tambahEntri(led: LedgerPra, k: Omit<KunciPra, 'prev'>): EntriLedger {
  const prev = led.rantai.length ? led.rantai[led.rantai.length - 1].hash : GENESIS
  const kunci: KunciPra = { ...k, prev }
  const entri: EntriLedger = { hash: hashKunci(kunci), kunci }
  led.rantai.push(entri)
  led.jumlah = led.rantai.length
  return entri
}

export interface VerifikasiRantai {
  ok: boolean
  jumlah: number
  indeksRusak: number // -1 bila utuh
}

/** Verifikasi ulang seluruh rantai (anti-rekayasa). */
export function verifikasiRantai(led: LedgerPra): VerifikasiRantai {
  let prev = GENESIS
  for (let i = 0; i < led.rantai.length; i++) {
    const e = led.rantai[i]
    if (e.kunci.prev !== prev) return { ok: false, jumlah: led.rantai.length, indeksRusak: i }
    if (hashKunci(e.kunci) !== e.hash) return { ok: false, jumlah: led.rantai.length, indeksRusak: i }
    prev = e.hash
  }
  return { ok: true, jumlah: led.rantai.length, indeksRusak: -1 }
}

// ---------- Resolusi & koherensi trajektori ----------
export interface CekTerisi {
  h: number
  commit: FaseCek
  moveAtr: number // pergerakan nyata dari entry, satuan ATR (bertanda)
  terwujud: FaseCek
  cocok: boolean
}

export interface KoherensiHasil {
  cek: CekTerisi[]
  skor: number // 0..4 cocok
  rasio: number // 0..1
}

function faseDariMove(moveAtr: number): FaseCek {
  if (Math.abs(moveAtr) < ZONA_MATI_ATR) return 'DATAR'
  return moveAtr > 0 ? 'NAIK' : 'TURUN'
}

/** Hitung koherensi trajektori terkunci vs pergerakan nyata. */
export function nilaiKoherensi(cek: [FaseCek, FaseCek, FaseCek, FaseCek], moveAtr: number[]): KoherensiHasil {
  const terisi: CekTerisi[] = H_CEK.map((h, i) => {
    const move = moveAtr[i] ?? 0
    const terwujud = faseDariMove(move)
    return { h, commit: cek[i], moveAtr: Math.round(move * 1000) / 1000, terwujud, cocok: terwujud === cek[i] }
  })
  const skor = terisi.filter((c) => c.cocok).length
  return { cek: terisi, skor, rasio: Math.round((skor / 4) * 10000) / 10000 }
}
