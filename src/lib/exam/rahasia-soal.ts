// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA — GENERATOR SOAL + MESIN JAWAB OTAK
// ═══════════════════════════════════════════════════════════════════
// Ratusan soal deterministik (seed tetap → bisa diaudit ulang) dari
// kebenaran data nyata Binance. Otak menjawab HANYA dari deteksi
// mandirinya atas candle mentah (rahasia-otak.ts) — bukan dari kunci.
import type { Kebenaran, KebenaranKoin } from './rahasia-data'
import type { HasilDeteksi } from './rahasia-otak'
import { DAFTAR_TIER, tierDari, penjelasanDeteksi, fmtHarga, AMBANG_GILA, AMBANG_SUPER_GILA } from './rahasia-otak'

export type TipeSoal = 'DETEKSI' | 'AMBANG' | 'PERINGKAT' | 'TIER' | 'PUNCAK' | 'GILA' | 'SUPER' | 'URUTAN' | 'PARITAS'

export interface SoalRahasia {
  id: string
  tipe: TipeSoal
  simbol: string
  pertanyaan: string
  pilihan?: string[]
  kunci: string
  ambang?: number
  ambang2?: number
  penjelasan: string
  tingkat: 1 | 2 | 3
}

// ── RNG deterministik (mulberry32) ──────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 24000 // hormat pada "lonjakan 24000%"
const N_DECOY_DETEKSI = 70
const N_PERINGKAT = 60
const N_TIER = 60
const N_PUNCAK = 45
const N_GILA_TIDAK = 30
const N_SUPER_TIDAK = 20
const N_URUTAN = 40
const N_PARITAS_YA = 45
const N_PARITAS_TIDAK = 30

function acakUrut<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

function bulanTambah(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}`
}

const AMBANG_LIST = [200, 500, 1000, 5000, 24000]

/** Bangun seluruh set soal dari kebenaran (deterministik). */
export function bikinSoalRahasia(keb: Kebenaran): SoalRahasia[] {
  const rng = mulberry32(SEED)
  const soal: SoalRahasia[] = []
  const semua = keb.koin.filter((k) => k.catatan === 'ok')
  const pumped = semua.filter((k) => k.gainPct >= 100).sort((a, b) => b.gainPct - a.gainPct)
  const decoy = semua.filter((k) => k.gainPct < 100)
  const gila = pumped.filter((k) => k.gainPct >= AMBANG_GILA)
  const superGila = pumped.filter((k) => k.gainPct >= AMBANG_SUPER_GILA)
  let n = 0
  const id = () => `UR-${String(++n).padStart(4, '0')}`

  const kalimatDeteksi = (k: KebenaranKoin) =>
    `Sejarah ${k.jumlahBulan} bulan: low ${fmtHarga(k.hargaLow)} (${k.bulanLow ?? '?'}) → high ${fmtHarga(k.hargaHigh)} (${k.bulanPuncak ?? '?'}) = +${k.gainPct.toFixed(2)}%.`

  // ── 1) DETEKSI ≥100% (semua yang lompat + jebakan yang tak lompat)
  for (const k of pumped) {
    soal.push({
      id: id(),
      tipe: 'DETEKSI',
      simbol: k.simbol,
      pertanyaan: `Apakah koin ${k.simbol} pernah melompat ≥100% (dari titik terendah sebelum puncak ke puncak sesudahnya) sepanjang sejarah Binance-nya?`,
      kunci: 'YA',
      penjelasan: `YA. ${kalimatDeteksi(k)}`,
      tingkat: 1,
    })
  }
  for (const k of acakUrut(decoy, rng).slice(0, N_DECOY_DETEKSI)) {
    soal.push({
      id: id(),
      tipe: 'DETEKSI',
      simbol: k.simbol,
      pertanyaan: `Apakah koin ${k.simbol} pernah melompat ≥100% (dari titik terendah sebelum puncak ke puncak sesudahnya) sepanjang sejarah Binance-nya?`,
      kunci: 'TIDAK',
      penjelasan: `TIDAK. ${kalimatDeteksi(k)}`,
      tingkat: 1,
    })
  }

  // ── 2) AMBANG: tembus +200/+500/+1000/+5000/+24000%?
  for (const k of pumped) {
    const diBawah = AMBANG_LIST.filter((t) => t < k.gainPct)
    const diAtas = AMBANG_LIST.filter((t) => t >= k.gainPct)
    if (diBawah.length) {
      const t = diBawah[diBawah.length - 1]
      soal.push({
        id: id(),
        tipe: 'AMBANG',
        simbol: k.simbol,
        pertanyaan: `Apakah koin ${k.simbol} pernah TEMBUS lonjakan +${t}% dalam sejarahnya?`,
        kunci: 'YA',
        ambang: t,
        penjelasan: `YA. Lonjakan maksimumnya +${k.gainPct.toFixed(2)}% (${k.bulanLow ?? '?'} → ${k.bulanPuncak ?? '?'}) — melewati +${t}%.`,
        tingkat: t >= 5000 ? 3 : 2,
      })
    }
    if (diAtas.length) {
      const t = diAtas[0]
      soal.push({
        id: id(),
        tipe: 'AMBANG',
        simbol: k.simbol,
        pertanyaan: `Apakah koin ${k.simbol} pernah TEMBUS lonjakan +${t}% dalam sejarahnya?`,
        kunci: 'TIDAK',
        ambang: t,
        penjelasan: `TIDAK. Lonjakan maksimumnya hanya +${k.gainPct.toFixed(2)}% — tak sampai +${t}%.`,
        tingkat: t >= 5000 ? 3 : 2,
      })
    }
  }

  // ── 3) PERINGKAT: dari trio, mana lonjakannya terbesar?
  if (pumped.length >= 3) {
    for (let i = 0; i < N_PERINGKAT; i++) {
      const trio = acakUrut(pumped, rng).slice(0, 3)
      // jamin trio beda gain (hindari soal rancu)
      if (new Set(trio.map((t) => t.gainPct)).size < 3) continue
      const juara = trio.reduce((a, b) => (b.gainPct > a.gainPct ? b : a))
      const pilihan = acakUrut(trio.map((t) => t.simbol), rng)
      soal.push({
        id: id(),
        tipe: 'PERINGKAT',
        simbol: juara.simbol,
        pertanyaan: `Dari ketiga koin ini, mana yang lonjakan maksimum sepanjang sejarahnya PALING BESAR?`,
        pilihan,
        kunci: juara.simbol,
        penjelasan: `Perbandingan nyata: ${trio.map((t) => `${t.simbol} +${t.gainPct.toFixed(1)}%`).join(' · ')}. Terbesar: ${juara.simbol}.`,
        tingkat: 2,
      })
    }
  }

  // ── 4) TIER: koin masuk tier lonjakan mana?
  for (const k of acakUrut(pumped, rng).slice(0, N_TIER)) {
    const benar = tierDari(k.gainPct)
    const pilihan = acakUrut(DAFTAR_TIER, rng)
    soal.push({
      id: id(),
      tipe: 'TIER',
      simbol: k.simbol,
      pertanyaan: `Koin ${k.simbol} melompat +${k.gainPct.toFixed(2)}% sepanjang sejarahnya. Ia masuk TIER lonjakan mana?`,
      pilihan,
      kunci: benar,
      penjelasan: `${benar}. Low ${fmtHarga(k.hargaLow)} (${k.bulanLow ?? '?'}) → high ${fmtHarga(k.hargaHigh)} (${k.bulanPuncak ?? '?'}).`,
      tingkat: 1,
    })
  }

  // ── 5) PUNCAK: bulan puncak lonjakan terbesar
  for (const k of acakUrut(pumped, rng).slice(0, N_PUNCAK)) {
    if (!k.bulanPuncak) continue
    const pilihanSet = new Set<string>()
    const offset = [12, -12, 24, -24, 36, -36, 48, 60, -6, 6]
    for (const o of acakUrut(offset, rng)) {
      const b = bulanTambah(k.bulanPuncak, o)
      if (b !== k.bulanPuncak) pilihanSet.add(b)
      if (pilihanSet.size >= 3) break
    }
    const pilihan = acakUrut([k.bulanPuncak, ...pilihanSet], rng)
    soal.push({
      id: id(),
      tipe: 'PUNCAK',
      simbol: k.simbol,
      pertanyaan: `Puncak lonjakan terbesar koin ${k.simbol} (dari low sebelumnya ke high tertinggi) terjadi pada bulan (YYYY-MM) berapa?`,
      pilihan,
      kunci: k.bulanPuncak,
      penjelasan: `Puncak: ${k.bulanPuncak} di harga ${fmtHarga(k.hargaHigh)}, setelah dari low ${fmtHarga(k.hargaLow)} pada ${k.bulanLow ?? '?'}.`,
      tingkat: 2,
    })
  }

  // ── 6) GILA ≥10000% & SUPER ≥24000%
  for (const k of gila) {
    soal.push({
      id: id(),
      tipe: 'GILA',
      simbol: k.simbol,
      pertanyaan: `Apakah koin ${k.simbol} termasuk kelompok LOMPATAN GILA (≥${AMBANG_GILA.toLocaleString('id-ID')}%)?`,
      kunci: 'YA',
      ambang: AMBANG_GILA,
      penjelasan: `YA. +${k.gainPct.toFixed(2)}% (${k.bulanLow ?? '?'} → ${k.bulanPuncak ?? '?'}) — nyata di Binance.`,
      tingkat: 3,
    })
  }
  for (const k of acakUrut(pumped.filter((p) => p.gainPct < AMBANG_GILA), rng).slice(0, N_GILA_TIDAK)) {
    soal.push({
      id: id(),
      tipe: 'GILA',
      simbol: k.simbol,
      pertanyaan: `Apakah koin ${k.simbol} termasuk kelompok LOMPATAN GILA (≥${AMBANG_GILA.toLocaleString('id-ID')}%)?`,
      kunci: 'TIDAK',
      ambang: AMBANG_GILA,
      penjelasan: `TIDAK. Lonjakan maksimumnya +${k.gainPct.toFixed(2)}% — besar, tapi belum masuk kelas gila ≥${AMBANG_GILA.toLocaleString('id-ID')}%.`,
      tingkat: 3,
    })
  }
  for (const k of superGila) {
    soal.push({
      id: id(),
      tipe: 'SUPER',
      simbol: k.simbol,
      pertanyaan: `Apakah koin ${k.simbol} pernah MENEMBUS +${AMBANG_SUPER_GILA.toLocaleString('id-ID')}% (lompatan super-gila)?`,
      kunci: 'YA',
      ambang: AMBANG_SUPER_GILA,
      penjelasan: `YA. +${k.gainPct.toFixed(2)}% (${k.bulanLow ?? '?'} → ${k.bulanPuncak ?? '?'}) — lompatan super-gila nyata.`,
      tingkat: 3,
    })
  }
  for (const k of acakUrut(gila.filter((p) => p.gainPct < AMBANG_SUPER_GILA), rng).slice(0, N_SUPER_TIDAK)) {
    soal.push({
      id: id(),
      tipe: 'SUPER',
      simbol: k.simbol,
      pertanyaan: `Apakah koin ${k.simbol} pernah MENEMBUS +${AMBANG_SUPER_GILA.toLocaleString('id-ID')}% (lompatan super-gila)?`,
      kunci: 'TIDAK',
      ambang: AMBANG_SUPER_GILA,
      penjelasan: `TIDAK. Lonjakannya +${k.gainPct.toFixed(2)}% — gila kelas 10000%, tapi belum tembus 24000%.`,
      tingkat: 3,
    })
  }

  // ── 7) URUTAN: bukan yang terbesar, tapi TERBESAR KEDUA (lebih jahat)
  if (pumped.length >= 3) {
    for (let i = 0; i < N_URUTAN; i++) {
      const trio = acakUrut(pumped, rng).slice(0, 3)
      if (new Set(trio.map((t) => t.gainPct)).size < 3) continue
      const urut = [...trio].sort((a, b) => b.gainPct - a.gainPct)
      const kedua = urut[1]
      const pilihan = acakUrut(trio.map((t) => t.simbol), rng)
      soal.push({
        id: id(),
        tipe: 'URUTAN',
        simbol: kedua.simbol,
        pertanyaan: `Dari ketiga koin ini, mana yang lonjakan maksimumnya TERBESAR KEDUA (bukan juara, bukan terbawah)?`,
        pilihan,
        kunci: kedua.simbol,
        penjelasan: `Urutan nyata: 1) ${urut[0].simbol} +${urut[0].gainPct.toFixed(1)}% · 2) ${urut[1].simbol} +${urut[1].gainPct.toFixed(1)}% · 3) ${urut[2].simbol} +${urut[2].gainPct.toFixed(1)}%.`,
        tingkat: 3,
      })
    }
  }

  // ── 8) PARITAS: konjungsi ganda — ≥T1% TETAPI tak sampai +T2%?
  const PASANGAN: Array<[number, number]> = [
    [200, 1000],
    [500, 5000],
    [1000, 5000],
    [5000, 24000],
    [1000, 24000],
  ]
  const paritasYa: Array<[KebenaranKoin, [number, number]]> = []
  for (const k of pumped) {
    const pas = PASANGAN.find(([a, b]) => k.gainPct >= a && k.gainPct < b)
    if (pas) paritasYa.push([k, pas] as const)
  }
  for (const [k, [a, b]] of acakUrut(paritasYa, rng).slice(0, N_PARITAS_YA)) {
    soal.push({
      id: id(),
      tipe: 'PARITAS',
      simbol: k.simbol,
      pertanyaan: `Benarkah koin ${k.simbol} melompat ≥${a}% TETAPI TIDAK sampai +${b.toLocaleString('id-ID')}%?`,
      kunci: 'YA',
      ambang: a,
      ambang2: b,
      penjelasan: `YA. Lonjakan maksimum +${k.gainPct.toFixed(2)}% — memenuhi ≥${a}% dan berada di bawah +${b.toLocaleString('id-ID')}%.`,
      tingkat: 3,
    })
  }
  const paritasTidak = pumped.filter((k) => PASANGAN.some(([a, b]) => k.gainPct >= b))
  for (const k of acakUrut(paritasTidak, rng).slice(0, N_PARITAS_TIDAK)) {
    const pas = PASANGAN.find(([a, b]) => k.gainPct >= b) ?? PASANGAN[0]
    const [a, b] = pas
    soal.push({
      id: id(),
      tipe: 'PARITAS',
      simbol: k.simbol,
      pertanyaan: `Benarkah koin ${k.simbol} melompat ≥${a}% TETAPI TIDAK sampai +${b.toLocaleString('id-ID')}%?`,
      kunci: 'TIDAK',
      ambang: a,
      ambang2: b,
      penjelasan: `TIDAK. Lonjakan maksimum +${k.gainPct.toFixed(2)}% — sudah MELAMPAUI +${b.toLocaleString('id-ID')}%, jadi pernyataan gugur.`,
      tingkat: 3,
    })
  }

  return soal
}

// ═══════════════════════════════════════════════════════════════════
// MESIN JAWAB — otak menjawab HANYA dari deteksi mandiri (candle)
// ═══════════════════════════════════════════════════════════════════
export interface JawabanOtak {
  jawaban: string
  penjelasan: string
  yakin: number // 0..100
}

export function jawabSoalRahasia(
  soal: SoalRahasia,
  deteksi: Map<string, HasilDeteksi>,
): JawabanOtak {
  const ambil = (s: string): HasilDeteksi =>
    deteksi.get(s) ?? {
      simbol: s,
      gainPct: 0,
      bulanLow: null,
      bulanPuncak: null,
      hargaLow: null,
      hargaHigh: null,
      jumlahBulan: 0,
      catatan: 'tanpa-data',
    }
  const d = ambil(soal.simbol)

  switch (soal.tipe) {
    case 'DETEKSI': {
      const ya = d.gainPct >= 100
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: penjelasanDeteksi(d),
        yakin: d.catatan === 'ok' ? 95 : 60,
      }
    }
    case 'AMBANG': {
      const t = soal.ambang ?? 100
      const ya = d.gainPct >= t
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: `${ya ? 'YA' : 'TIDAK'} — lonjakan maksimum terdeteksi +${d.gainPct.toFixed(2)}% vs ambang +${t}%. ${penjelasanDeteksi(d)}`,
        yakin: d.catatan === 'ok' ? 95 : 60,
      }
    }
    case 'PERINGKAT': {
      const kandidat = (soal.pilihan ?? []).map((s) => ambil(s))
      let juara = kandidat[0]
      for (const k of kandidat) {
        if (k.gainPct > juara.gainPct) juara = k
        else if (k.gainPct === juara.gainPct && k.simbol < juara.simbol) juara = k
      }
      return {
        jawaban: juara.simbol,
        penjelasan: `Deteksi mandiri: ${kandidat.map((k) => `${k.simbol} +${k.gainPct.toFixed(1)}%`).join(' · ')}. Terbesar: ${juara.simbol}.`,
        yakin: kandidat.every((k) => k.catatan === 'ok') ? 92 : 60,
      }
    }
    case 'TIER': {
      const t = tierDari(d.gainPct)
      return { jawaban: t, penjelasan: `Tier ${t} — ${penjelasanDeteksi(d)}`, yakin: 95 }
    }
    case 'PUNCAK': {
      const b = d.bulanPuncak ?? 'tidak-diketahui'
      return {
        jawaban: b,
        penjelasan: `Puncak terdeteksi bulan ${b} (high ${fmtHarga(d.hargaHigh)}), setelah low ${fmtHarga(d.hargaLow)} pada ${d.bulanLow ?? '?'}.`,
        yakin: d.catatan === 'ok' ? 92 : 55,
      }
    }
    case 'GILA':
    case 'SUPER': {
      const t = soal.ambang ?? AMBANG_GILA
      const ya = d.gainPct >= t
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: `${ya ? 'YA' : 'TIDAK'} — +${d.gainPct.toFixed(2)}% vs ambang gila +${t.toLocaleString('id-ID')}%. ${penjelasanDeteksi(d)}`,
        yakin: d.catatan === 'ok' ? 95 : 60,
      }
    }
    case 'URUTAN': {
      const kandidat = (soal.pilihan ?? []).map((s) => ambil(s))
      const urut = [...kandidat].sort((x, y) => y.gainPct - x.gainPct || (x.simbol < y.simbol ? -1 : 1))
      const kedua = urut[1]
      return {
        jawaban: kedua.simbol,
        penjelasan: `Deteksi mandiri: ${urut.map((k, i) => `${i + 1}) ${k.simbol} +${k.gainPct.toFixed(1)}%`).join(' · ')}. Terbesar kedua: ${kedua.simbol}.`,
        yakin: kandidat.every((k) => k.catatan === 'ok') ? 90 : 60,
      }
    }
    case 'PARITAS': {
      const a = soal.ambang ?? 200
      const b = soal.ambang2 ?? 1000
      const ya = d.gainPct >= a && d.gainPct < b
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: `${ya ? 'YA' : 'TIDAK'} — terdeteksi +${d.gainPct.toFixed(2)}% vs jendela [≥${a}%, <${b.toLocaleString('id-ID')}%].`,
        yakin: d.catatan === 'ok' ? 93 : 60,
      }
    }
  }
}
