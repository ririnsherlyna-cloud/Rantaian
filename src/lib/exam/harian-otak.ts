// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA HARIAN — OTAK Z.AI (PENDETEKSI MANDIRI)
// ═══════════════════════════════════════════════════════════════════
// Inilah yang diuji: otak MEMBACA candle HARIAN mentah lalu MENDETEKSI
// sendiri lonjakan 1-hari 100% … 24000%+ ("gila koin terbang harian")
// yang membuat banyak master terliquidasi.
//
// ATURAN JUJUR:
//  - Otak hanya membaca candle harian mentah (db/ujian-rahasia/harian
//    /klines/*.json) — DILARANG membaca kebenaran-harian.json.
//  - Rumus: gainHarian(t) = (high[t]/close[t-1] − 1) × 100 — identik
//    dgn kolektor Python; paritas keduanya = bukti pemahaman.
//
// deteksiLonjakanHarian() diekspor publik → mata tambahan sistem
// pantauan arah live (mandat: makin kuat, asah, tajam, mandiri).
import type { CandleHarian } from './harian-data'

export interface HasilDeteksiHarian {
  simbol: string
  gainPct: number // lonjakan 1-hari maksimum (round 4 desimal)
  tanggalPuncak: string | null
  closeSebelum: number | null
  highHari: number | null
  jumlahHari: number
  jumlahHariGila100: number // banyaknya hari dengan gain ≥ 100%
  jumlahHariGila50: number // banyaknya hari dengan gain ≥ 50%
  catatan: string
}

export const AMBANG_GILA_HARI = 1000 // sehari ≥1000% = kelas gila harian
export const AMBANG_SUPER_HARI = 24000 // sehari ≥24000% = super-gila
export const AMBANG_DETEKSI = 100

/**
 * Deteksi lonjakan HARIAN maksimum sepanjang sejarah koin:
 * gain terbesar antara high hari-t vs close hari-(t-1).
 * Hari pertama listing (tanpa penutupan sebelumnya) tidak dinilai — jujur.
 */
export function deteksiLonjakanHarian(simbol: string, candles: CandleHarian[]): HasilDeteksiHarian {
  const kosong: HasilDeteksiHarian = {
    simbol,
    gainPct: 0,
    tanggalPuncak: null,
    closeSebelum: null,
    highHari: candles.length ? candles[candles.length - 1].close : null,
    jumlahHari: candles.length,
    jumlahHariGila100: 0,
    jumlahHariGila50: 0,
    catatan: candles.length === 0 ? 'tanpa-data' : 'ok',
  }
  if (candles.length === 0) return { ...kosong, catatan: 'tanpa-data' }
  if (candles.length < 2) {
    return { ...kosong, catatan: 'umur<2hari-tak-dinilai', highHari: candles[0].close }
  }

  let best: HasilDeteksiHarian | null = null
  let g100 = 0
  let g50 = 0
  for (let t = 1; t < candles.length; t++) {
    const prev = candles[t - 1].close
    const hi = candles[t].high
    if (!(prev > 0) || !(hi > 0)) continue
    const gain = Math.round((hi / prev - 1) * 100 * 10000) / 10000
    if (gain >= 100) g100++
    if (gain >= 50) g50++
    if (!best || gain > best.gainPct) {
      best = {
        simbol,
        gainPct: gain,
        tanggalPuncak: candles[t].tanggal,
        closeSebelum: prev,
        highHari: hi,
        jumlahHari: candles.length,
        jumlahHariGila100: 0,
        jumlahHariGila50: 0,
        catatan: 'ok',
      }
    }
  }
  if (!best) return { ...kosong, jumlahHariGila100: g100, jumlahHariGila50: g50, catatan: 'ok' }
  return { ...best, jumlahHariGila100: g100, jumlahHariGila50: g50 }
}

/** Tier lonjakan HARIAN — skala berbeda dgn bulanan (sehari jauh lebih ganas). */
export function tierHarianDari(gain: number): string {
  if (gain >= AMBANG_SUPER_HARI) return '24000%+'
  if (gain >= 5000) return '5000-23999%'
  if (gain >= AMBANG_GILA_HARI) return '1000-4999%'
  if (gain >= 500) return '500-999%'
  if (gain >= 200) return '200-499%'
  if (gain >= AMBANG_DETEKSI) return '100-199%'
  return '<100%'
}

export const DAFTAR_TIER_HARIAN = [
  '<100%',
  '100-199%',
  '200-499%',
  '500-999%',
  '1000-4999%',
  '5000-23999%',
  '24000%+',
]

/** Format angka harga rapi utk penjelasan. */
export function fmtHarga(h: number | null): string {
  if (h === null || !isFinite(h)) return 'n/a'
  if (h >= 1000) return h.toLocaleString('id-ID', { maximumFractionDigits: 2 })
  if (h >= 1) return h.toFixed(4)
  if (h >= 0.0001) return h.toFixed(6)
  return h.toPrecision(4)
}

/** Kalimat penjelasan deteksi harian satu koin (dipakai jawaban otak). */
export function penjelasanDeteksiHarian(d: HasilDeteksiHarian): string {
  if (d.catatan === 'tanpa-data') return 'Tidak ada data candle harian untuk koin ini.'
  if (d.catatan === 'umur<2hari-tak-dinilai')
    return `Umur data ${d.jumlahHari} hari (<2 hari): tanpa penutupan sebelumnya, lonjakan harian belum bisa dinilai.`
  const gain = d.gainPct
  const arah =
    gain >= 1000
      ? 'LOMPATAN GILA HARIAN'
      : gain >= 100
        ? 'lonjakan ekstrem sehari'
        : gain > 0
          ? 'naik wajar sehari'
          : gain === 0
            ? 'mendatar'
            : 'sempat melemah'
  return `Sejarah ${d.jumlahHari} hari: close ${fmtHarga(d.closeSebelum)} (${d.tanggalPuncak ? 'hari sebelum puncak' : '?'}) → high ${fmtHarga(d.highHari)} pada ${d.tanggalPuncak ?? '?'} = ${gain >= 0 ? '+' : ''}${gain.toFixed(2)}% dalam SEHARI — ${arah}; hari ≥100%: ${d.jumlahHariGila100}×.`
}
