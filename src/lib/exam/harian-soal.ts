// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA HARIAN — GENERATOR 1230 SOAL + MESIN JAWAB OTAK
// ═══════════════════════════════════════════════════════════════════
// "1230 soal ujian gila koin terbang harian" — semua dari kebenaran
// data NYATA Binance (lonjakan 1-hari 100% … 24000%+). Deterministik
// (seed tetap → bisa diaudit ulang). Otak menjawab HANYA dari deteksi
// mandirinya atas candle harian mentah (harian-otak.ts) — bukan kunci.
import type { KebenaranHarian, KebenaranHarianKoin, CandleHarian } from './harian-data'
import { bacaKlinesHarian } from './harian-data'
import type { HasilDeteksiHarian } from './harian-otak'
import {
  DAFTAR_TIER_HARIAN,
  tierHarianDari,
  penjelasanDeteksiHarian,
  fmtHarga,
  AMBANG_GILA_HARI,
  AMBANG_SUPER_HARI,
  AMBANG_DETEKSI,
} from './harian-otak'

export type TipeSoalHarian =
  | 'DETEKSI'
  | 'AMBANG200'
  | 'AMBANG500'
  | 'TANGGAL'
  | 'TAHUN'
  | 'TIER'
  | 'PERINGKAT'
  | 'URUTAN'
  | 'PARITAS'
  | 'GILA'
  | 'SUPER'
  | 'HARI-GANDA'

export interface SoalHarian {
  id: string
  tipe: TipeSoalHarian
  simbol: string
  pertanyaan: string
  pilihan?: string[]
  kunci: string
  ambang?: number
  ambang2?: number
  penjelasan: string
  tingkat: 1 | 2 | 3
}

export const TOTAL_WAJIB = 1230
const SEED = 1230 // hormat pada "1230 soal"

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

const SAMPEL_AMBANG: Record<'AMBANG200' | 'AMBANG500', number> = {
  AMBANG200: 200,
  AMBANG500: 500,
}

/** Hitung gainHarian SEMUA hari dari candle mentah (rumus = kolektor Python). */
export function hitungGainSemuaHari(candles: CandleHarian[]): Array<{ tanggal: string; gain: number }> {
  const keluar: Array<{ tanggal: string; gain: number }> = []
  for (let t = 1; t < candles.length; t++) {
    const prev = candles[t - 1].close
    const hi = candles[t].high
    if (!(prev > 0) || !(hi > 0)) continue
    keluar.push({
      tanggal: candles[t].tanggal,
      gain: Math.round((hi / prev - 1) * 100 * 10000) / 10000,
    })
  }
  return keluar
}

/** Bangun seluruh set 1230 soal dari kebenaran harian (deterministik). */
export function bikinSoalHarian(keb: KebenaranHarian): SoalHarian[] {
  return bikinSoalHarianDenganSeed(keb, SEED)
}

/** Varian seed terbuka — penempaan multi-seed (anti-hafalan set spesifik). */
export function bikinSoalHarianDenganSeed(keb: KebenaranHarian, seedSoal: number): SoalHarian[] {
  const rng = mulberry32(seedSoal)
  const soal: SoalHarian[] = []
  let n = 0
  const id = () => `HN-${String(++n).padStart(4, '0')}`

  const semua = keb.koin.filter((k) => k.catatan === 'ok')
  const pumped = semua.filter((k) => k.gainPct >= AMBANG_DETEKSI).sort((a, b) => b.gainPct - a.gainPct)
  const decoy = semua.filter((k) => k.gainPct < AMBANG_DETEKSI)
  const gilaHarian = pumped.filter((k) => k.gainPct >= AMBANG_GILA_HARI)
  const superHarian = pumped.filter((k) => k.gainPct >= AMBANG_SUPER_HARI)

  const kalimat = (k: KebenaranHarianKoin) =>
    `Nyata di Binance: close ${fmtHarga(k.closeSebelum)} → high ${fmtHarga(k.highHari)} pada ${k.tanggalPuncak} = +${k.gainPct.toFixed(2)}% dalam SEHARI (sejarah ${k.jumlahHari} hari).`

  // ── 1) DETEKSI ≥100% sehari (248: 158 YA + 90 TIDAK) ─────────────
  for (const k of pumped) {
    soal.push({
      id: id(),
      tipe: 'DETEKSI',
      simbol: k.simbol,
      pertanyaan:
        'Apakah koin ' + k.simbol + ' pernah melonjak ≥100% dalam SEHARI (high hari-t vs close hari-t-1) sepanjang sejarah Binance-nya?',
      kunci: 'YA',
      penjelasan: 'YA. ' + kalimat(k),
      tingkat: 1,
    })
  }
  for (const k of acakUrut(decoy, rng).slice(0, 90)) {
    soal.push({
      id: id(),
      tipe: 'DETEKSI',
      simbol: k.simbol,
      pertanyaan:
        'Apakah koin ' + k.simbol + ' pernah melonjak ≥100% dalam SEHARI (high hari-t vs close hari-t-1) sepanjang sejarah Binance-nya?',
      kunci: 'TIDAK',
      penjelasan: 'TIDAK. Lonjakan 1-hari maksimumnya hanya +' + k.gainPct.toFixed(2) + '% (' + k.tanggalPuncak + ').',
      tingkat: 1,
    })
  }

  // ── 2) AMBANG200 & AMBANG500: tembus X% dalam sehari? ────────────
  // AMBANG200: seluruh 158 koin pumped (39 YA + 119 TIDAK) = 158 soal
  for (const k of pumped) {
    const t = SAMPEL_AMBANG.AMBANG200
    const ya = k.gainPct >= t
    soal.push({
      id: id(),
      tipe: 'AMBANG200',
      simbol: k.simbol,
      pertanyaan: 'Apakah koin ' + k.simbol + ' pernah TEMBUS lonjakan +' + t + '% DALAM SEHARI?',
      kunci: ya ? 'YA' : 'TIDAK',
      ambang: t,
      penjelasan: (ya ? 'YA' : 'TIDAK') + '. Lonjakan 1-hari maksimum +' + k.gainPct.toFixed(2) + '% vs ambang +' + t + '%. ' + kalimat(k),
      tingkat: 2,
    })
  }
  // AMBANG500: 5 YA + 115 TIDAK = 120 soal
  {
    const ya500 = pumped.filter((k) => k.gainPct >= SAMPEL_AMBANG.AMBANG500)
    const tidak500 = acakUrut(
      pumped.filter((k) => k.gainPct < SAMPEL_AMBANG.AMBANG500),
      rng,
    ).slice(0, 115)
    for (const k of [...ya500, ...tidak500]) {
      const t = SAMPEL_AMBANG.AMBANG500
      const ya = k.gainPct >= t
      soal.push({
        id: id(),
        tipe: 'AMBANG500',
        simbol: k.simbol,
        pertanyaan: 'Apakah koin ' + k.simbol + ' pernah TEMBUS lonjakan +' + t + '% DALAM SEHARI?',
        kunci: ya ? 'YA' : 'TIDAK',
        ambang: t,
        penjelasan: (ya ? 'YA' : 'TIDAK') + '. Lonjakan 1-hari maksimum +' + k.gainPct.toFixed(2) + '% vs ambang +' + t + '%. ' + kalimat(k),
        tingkat: ya ? 3 : 2,
      })
    }
  }

  // ── 3) TANGGAL: lonjakan harian terbesar terjadi kapan? (90) ─────
  {
    const antre = acakUrut(pumped, rng)
    let i = 0
    let dibuat = 0
    while (dibuat < 90 && i < antre.length) {
      const k = antre[i++]
      const kl = bacaKlinesHarian(k.simbol)
      if (!kl || !k.tanggalPuncak) continue
      const gains = hitungGainSemuaHari(kl)
      const puncak = gains.find((g) => g.tanggal === k.tanggalPuncak)
      if (!puncak) continue
      const aman = gains.filter((g) => g.gain < puncak.gain - 1e-9 && g.tanggal !== k.tanggalPuncak)
      if (aman.length < 3) continue
      const decoyTgl = acakUrut(aman, rng).slice(0, 3).map((g) => g.tanggal)
      const pilihan = acakUrut([k.tanggalPuncak, ...decoyTgl], rng)
      soal.push({
        id: id(),
        tipe: 'TANGGAL',
        simbol: k.simbol,
        pertanyaan: 'Lonjakan 1-hari TERBESAR koin ' + k.simbol + ' (+' + k.gainPct.toFixed(2) + '%) terjadi pada tanggal (YYYY-MM-DD) berapa?',
        pilihan,
        kunci: k.tanggalPuncak,
        penjelasan: 'Puncak: ' + k.tanggalPuncak + ' — close sebelumnya ' + fmtHarga(k.closeSebelum) + ' → high ' + fmtHarga(k.highHari) + '.',
        tingkat: 3,
      })
      dibuat++
    }
  }

  // ── 4) TAHUN: lonjakan harian terbesar pada tahun berapa? (60) ───
  {
    const antre = acakUrut(pumped, rng)
    let i = 0
    let dibuat = 0
    while (dibuat < 60 && i < antre.length) {
      const k = antre[i++]
      if (!k.tanggalPuncak) continue
      const tahunKunci = k.tanggalPuncak.slice(0, 4)
      const kl = bacaKlinesHarian(k.simbol)
      const tahunLain = new Set<string>()
      if (kl) for (const c of kl) tahunLain.add(c.tanggal.slice(0, 4))
      tahunLain.delete(tahunKunci)
      const decoy = acakUrut([...tahunLain], rng).slice(0, 3)
      let y = Number(tahunKunci)
      while (decoy.length < 3) {
        y += 1
        const s = String(y)
        if (s !== tahunKunci && !decoy.includes(s)) decoy.push(s)
      }
      const pilihan = acakUrut([tahunKunci, ...decoy.slice(0, 3)], rng)
      soal.push({
        id: id(),
        tipe: 'TAHUN',
        simbol: k.simbol,
        pertanyaan: 'Lonjakan 1-hari TERBESAR koin ' + k.simbol + ' (+' + k.gainPct.toFixed(2) + '%) terjadi pada TAHUN berapa?',
        pilihan,
        kunci: tahunKunci,
        penjelasan: 'Puncak: ' + k.tanggalPuncak + ' → tahun ' + tahunKunci + '. ' + kalimat(k),
        tingkat: 2,
      })
      dibuat++
    }
  }

  // ── 5) TIER: masuk tier lonjakan harian mana? (120) ──────────────
  for (const k of acakUrut(pumped, rng).slice(0, 120)) {
    const benar = tierHarianDari(k.gainPct)
    const pilihan = acakUrut(DAFTAR_TIER_HARIAN, rng)
    soal.push({
      id: id(),
      tipe: 'TIER',
      simbol: k.simbol,
      pertanyaan: 'Koin ' + k.simbol + ' melonjak +' + k.gainPct.toFixed(2) + '% DALAM SEHARI. Ia masuk TIER lonjakan harian mana?',
      pilihan,
      kunci: benar,
      penjelasan: benar + '. ' + kalimat(k),
      tingkat: 1,
    })
  }

  // ── 6) PERINGKAT: dari trio, mana lonjakan harian terbesar? (90) ─
  {
    let dibuat = 0
    let usaha = 0
    while (dibuat < 90 && usaha < 4000) {
      usaha++
      const trio = acakUrut(pumped, rng).slice(0, 3)
      if (new Set(trio.map((t) => t.gainPct)).size < 3) continue
      const juara = trio.reduce((a, b) => (b.gainPct > a.gainPct ? b : a))
      const pilihan = acakUrut(trio.map((t) => t.simbol), rng)
      soal.push({
        id: id(),
        tipe: 'PERINGKAT',
        simbol: juara.simbol,
        pertanyaan: 'Dari ketiga koin ini, mana yang lonjakan 1-hari maksimumnya PALING BESAR?',
        pilihan,
        kunci: juara.simbol,
        penjelasan: 'Perbandingan nyata: ' + trio.map((t) => t.simbol + ' +' + t.gainPct.toFixed(1) + '%/hari').join(' · ') + '. Terbesar: ' + juara.simbol + '.',
        tingkat: 2,
      })
      dibuat++
    }
  }

  // ── 7) URUTAN: terbesar KEDUA dari trio (60) ─────────────────────
  {
    let dibuat = 0
    let usaha = 0
    while (dibuat < 60 && usaha < 4000) {
      usaha++
      const trio = acakUrut(pumped, rng).slice(0, 3)
      if (new Set(trio.map((t) => t.gainPct)).size < 3) continue
      const urut = [...trio].sort((a, b) => b.gainPct - a.gainPct)
      const kedua = urut[1]
      const pilihan = acakUrut(trio.map((t) => t.simbol), rng)
      soal.push({
        id: id(),
        tipe: 'URUTAN',
        simbol: kedua.simbol,
        pertanyaan: 'Dari ketiga koin ini, mana yang lonjakan 1-hari maksimumnya TERBESAR KEDUA (bukan juara, bukan terbawah)?',
        pilihan,
        kunci: kedua.simbol,
        penjelasan:
          'Urutan nyata: 1) ' + urut[0].simbol + ' +' + urut[0].gainPct.toFixed(1) + '% · 2) ' + urut[1].simbol + ' +' + urut[1].gainPct.toFixed(1) + '% · 3) ' + urut[2].simbol + ' +' + urut[2].gainPct.toFixed(1) + '% (per hari).',
        tingkat: 3,
      })
      dibuat++
    }
  }

  // ── 8) PARITAS: ≥T1% TETAPI <T2% dalam sehari? (90) ──────────────
  {
    const PASANGAN: Array<[number, number]> = [
      [200, 500],
      [500, 1000],
      [1000, 5000],
      [100, 500],
      [200, 1000],
      [500, 5000],
    ]
    const ya: Array<[KebenaranHarianKoin, [number, number]]> = []
    for (const k of pumped) {
      const pas = PASANGAN.find(([a, b]) => k.gainPct >= a && k.gainPct < b)
      if (pas) ya.push([k, pas])
    }
    const nYa = Math.min(ya.length, 55)
    const nTidak = 90 - nYa
    const pilihYa = acakUrut(ya, rng).slice(0, nYa)
    // TIDAK: pernyataan "≥a TAPI <b" gugur BILA koin tak sampai a ATAU
    // sudah melampaui b — kedua alasan sah & jujur (sampler kombinasi).
    const pilihTidak: Array<[KebenaranHarianKoin, [number, number]]> = []
    {
      let usaha = 0
      const terpakai = new Set<string>()
      while (pilihTidak.length < nTidak && usaha < 6000) {
        usaha++
        const k = pumped[Math.floor(rng() * pumped.length)]
        const pas = PASANGAN[Math.floor(rng() * PASANGAN.length)]
        const [a, b] = pas
        const diJendela = k.gainPct >= a && k.gainPct < b
        const tag = k.simbol + '|' + a + '-' + b
        if (diJendela || terpakai.has(tag)) continue
        terpakai.add(tag)
        pilihTidak.push([k, pas])
      }
    }
    for (const [k, [a, b]] of pilihYa) {
      soal.push({
        id: id(),
        tipe: 'PARITAS',
        simbol: k.simbol,
        pertanyaan: 'Benarkah koin ' + k.simbol + ' melonjak ≥' + a + '% TETAPI TIDAK sampai +' + b.toLocaleString('id-ID') + '% DALAM SEHARI?',
        kunci: 'YA',
        ambang: a,
        ambang2: b,
        penjelasan: 'YA. Lonjakan 1-hari maksimum +' + k.gainPct.toFixed(2) + '% — memenuhi ≥' + a + '% dan di bawah +' + b.toLocaleString('id-ID') + '%.',
        tingkat: 3,
      })
    }
    for (const [k, [a, b]] of pilihTidak) {
      const melampaui = k.gainPct >= b
      const alasan = melampaui
        ? 'sudah MELAMPAUI +' + b.toLocaleString('id-ID') + '% sehari, pernyataan gugur'
        : 'tak sampai ambang bawah +' + a + '% sehari (maksimum +' + k.gainPct.toFixed(2) + '%), pernyataan gugur'
      soal.push({
        id: id(),
        tipe: 'PARITAS',
        simbol: k.simbol,
        pertanyaan: 'Benarkah koin ' + k.simbol + ' melonjak ≥' + a + '% TETAPI TIDAK sampai +' + b.toLocaleString('id-ID') + '% DALAM SEHARI?',
        kunci: 'TIDAK',
        ambang: a,
        ambang2: b,
        penjelasan: 'TIDAK. Lonjakan 1-hari maksimum +' + k.gainPct.toFixed(2) + '% — ' + alasan + '.',
        tingkat: 3,
      })
    }
  }

  // ── 9) GILA-HARI ≥1000%/hari (60) & SUPER-HARI ≥24000%/hari (60) ─
  {
    const tidakGila = acakUrut(
      pumped.filter((p) => p.gainPct < AMBANG_GILA_HARI),
      rng,
    ).slice(0, 60 - gilaHarian.length)
    for (const k of [...gilaHarian, ...tidakGila]) {
      const ya = k.gainPct >= AMBANG_GILA_HARI
      soal.push({
        id: id(),
        tipe: 'GILA',
        simbol: k.simbol,
        pertanyaan: 'Apakah koin ' + k.simbol + ' termasuk kelompok LOMPATAN GILA HARIAN (≥' + AMBANG_GILA_HARI.toLocaleString('id-ID') + '% DALAM SEHARI)?',
        kunci: ya ? 'YA' : 'TIDAK',
        ambang: AMBANG_GILA_HARI,
        penjelasan: (ya ? 'YA' : 'TIDAK') + '. Lonjakan 1-hari maksimum +' + k.gainPct.toFixed(2) + '%. ' + kalimat(k),
        tingkat: 3,
      })
    }
    const tidakSuper = acakUrut(
      pumped.filter((p) => p.gainPct < AMBANG_SUPER_HARI),
      rng,
    ).slice(0, 60 - superHarian.length)
    for (const k of [...superHarian, ...tidakSuper]) {
      const ya = k.gainPct >= AMBANG_SUPER_HARI
      soal.push({
        id: id(),
        tipe: 'SUPER',
        simbol: k.simbol,
        pertanyaan: 'Apakah koin ' + k.simbol + ' pernah MENEMBUS +' + AMBANG_SUPER_HARI.toLocaleString('id-ID') + '% DALAM SEHARI (lompatan super-gila harian)?',
        kunci: ya ? 'YA' : 'TIDAK',
        ambang: AMBANG_SUPER_HARI,
        penjelasan: (ya ? 'YA' : 'TIDAK') + '. Lonjakan 1-hari maksimum +' + k.gainPct.toFixed(2) + '%. ' + kalimat(k),
        tingkat: 3,
      })
    }
  }

  // ── 10) HARI-GANDA: berapa hari ≥100% dalam sejarahnya? (74) ─────
  {
    const pool = acakUrut(semua, rng).slice(0, 74)
    for (const k of pool) {
      const kunci = String(k.jumlahHariGila100)
      const angka = new Set<number>([k.jumlahHariGila100, k.jumlahHariGila100 + 1, k.jumlahHariGila100 + 2, Math.max(0, k.jumlahHariGila100 - 1)])
      const pilihan = acakUrut([...angka].map(String), rng)
      soal.push({
        id: id(),
        tipe: 'HARI-GANDA',
        simbol: k.simbol,
        pertanyaan: 'Berapa KALI koin ' + k.simbol + ' melonjak ≥100% DALAM SEHARI (high hari-t vs close hari-t-1) sepanjang sejarah Binance-nya?',
        pilihan,
        kunci,
        penjelasan: kunci + '× hari ≥100%/hari (total ' + k.jumlahHariGila50 + '× hari ≥50%). Lonjakan maksimum +' + k.gainPct.toFixed(2) + '% pada ' + (k.tanggalPuncak ?? '?') + '.',
        tingkat: 3,
      })
    }
  }

  if (soal.length !== TOTAL_WAJIB) {
    throw new Error('KALIBRASI SOAL GAGAL: dibuat ' + soal.length + ', wajib PERSIS ' + TOTAL_WAJIB)
  }
  return soal
}

// ═══════════════════════════════════════════════════════════════════
// MESIN JAWAB — otak menjawab HANYA dari deteksi mandiri (candle)
// ═══════════════════════════════════════════════════════════════════
export interface JawabanOtakHarian {
  jawaban: string
  penjelasan: string
  yakin: number // 0..100
}

export function jawabSoalHarian(soal: SoalHarian, deteksi: Map<string, HasilDeteksiHarian>): JawabanOtakHarian {
  const ambil = (s: string): HasilDeteksiHarian =>
    deteksi.get(s) ?? {
      simbol: s,
      gainPct: 0,
      tanggalPuncak: null,
      closeSebelum: null,
      highHari: null,
      jumlahHari: 0,
      jumlahHariGila100: 0,
      jumlahHariGila50: 0,
      catatan: 'tanpa-data',
    }
  const d = ambil(soal.simbol)

  switch (soal.tipe) {
    case 'DETEKSI': {
      const ya = d.gainPct >= AMBANG_DETEKSI
      return { jawaban: ya ? 'YA' : 'TIDAK', penjelasan: penjelasanDeteksiHarian(d), yakin: d.catatan === 'ok' ? 95 : 60 }
    }
    case 'AMBANG200':
    case 'AMBANG500': {
      const t = soal.ambang ?? 100
      const ya = d.gainPct >= t
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: (ya ? 'YA' : 'TIDAK') + ' — lonjakan 1-hari maksimum +' + d.gainPct.toFixed(2) + '% vs ambang +' + t + '%. ' + penjelasanDeteksiHarian(d),
        yakin: d.catatan === 'ok' ? 95 : 60,
      }
    }
    case 'TANGGAL': {
      const t = d.tanggalPuncak ?? 'tidak-diketahui'
      return {
        jawaban: t,
        penjelasan: 'Deteksi mandiri: puncak lonjakan harian ' + t + ' — close ' + fmtHarga(d.closeSebelum) + ' → high ' + fmtHarga(d.highHari) + ' = +' + d.gainPct.toFixed(2) + '%.',
        yakin: d.catatan === 'ok' ? 92 : 55,
      }
    }
    case 'TAHUN': {
      const t = (d.tanggalPuncak ?? '?').slice(0, 4)
      return {
        jawaban: t,
        penjelasan: 'Deteksi mandiri: puncak ' + (d.tanggalPuncak ?? '?') + ' → tahun ' + t + ' (+ ' + d.gainPct.toFixed(2) + '% sehari).',
        yakin: d.catatan === 'ok' ? 92 : 55,
      }
    }
    case 'TIER': {
      const t = tierHarianDari(d.gainPct)
      return { jawaban: t, penjelasan: 'Tier harian ' + t + ' — ' + penjelasanDeteksiHarian(d), yakin: 95 }
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
        penjelasan: 'Deteksi mandiri: ' + kandidat.map((k) => k.simbol + ' +' + k.gainPct.toFixed(1) + '%/hari').join(' · ') + '. Terbesar: ' + juara.simbol + '.',
        yakin: kandidat.every((k) => k.catatan === 'ok') ? 92 : 60,
      }
    }
    case 'URUTAN': {
      const kandidat = (soal.pilihan ?? []).map((s) => ambil(s))
      const urut = [...kandidat].sort((x, y) => y.gainPct - x.gainPct || (x.simbol < y.simbol ? -1 : 1))
      const kedua = urut[1]
      return {
        jawaban: kedua.simbol,
        penjelasan: 'Deteksi mandiri: ' + urut.map((k, i) => i + 1 + ') ' + k.simbol + ' +' + k.gainPct.toFixed(1) + '%/hari').join(' · ') + '. Terbesar kedua: ' + kedua.simbol + '.',
        yakin: kandidat.every((k) => k.catatan === 'ok') ? 90 : 60,
      }
    }
    case 'PARITAS': {
      const a = soal.ambang ?? 200
      const b = soal.ambang2 ?? 1000
      const ya = d.gainPct >= a && d.gainPct < b
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: (ya ? 'YA' : 'TIDAK') + ' — terdeteksi +' + d.gainPct.toFixed(2) + '%/hari vs jendela [≥' + a + '%, <' + b.toLocaleString('id-ID') + '%].',
        yakin: d.catatan === 'ok' ? 93 : 60,
      }
    }
    case 'GILA':
    case 'SUPER': {
      const t = soal.ambang ?? AMBANG_GILA_HARI
      const ya = d.gainPct >= t
      return {
        jawaban: ya ? 'YA' : 'TIDAK',
        penjelasan: (ya ? 'YA' : 'TIDAK') + ' — +' + d.gainPct.toFixed(2) + '%/hari vs ambang +' + t.toLocaleString('id-ID') + '%/hari. ' + penjelasanDeteksiHarian(d),
        yakin: d.catatan === 'ok' ? 95 : 60,
      }
    }
    case 'HARI-GANDA': {
      const j = String(d.jumlahHariGila100)
      return {
        jawaban: j,
        penjelasan: 'Deteksi mandiri: ' + j + '× hari ≥100%/hari (' + d.jumlahHariGila50 + '× hari ≥50%) — ' + penjelasanDeteksiHarian(d),
        yakin: d.catatan === 'ok' ? 92 : 60,
      }
    }
  }
}
