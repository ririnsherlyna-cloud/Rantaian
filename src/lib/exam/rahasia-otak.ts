// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA — OTAK Z.AI (PENDETEKSI MANDIRI)
// ═══════════════════════════════════════════════════════════════════
// Inilah yang diuji: kemampuan otak MEMBACA candle mentah lalu
// MENDETEKSI sendiri lonjakan 100% … 24000%+ ("lonjakan gila"),
// menjawab ratusan soal dengan alasan lengkap.
//
// ATURAN JUJUR:
//  - Otak HANYA boleh membaca candle bulanan mentah (db/ujian-rahasia
//    /klines/*.json) — DILARANG membaca kebenaran.json saat menjawab.
//  - Deteksi di sini implementasi TS berdiri sendiri (bukan salinan
//    kolektor Python) — kesepakatan keduanya adalah bukti pemahaman.
//
// deteksiLonjakan() diekspor publik → kelak dipakai sistem pantauan
// arah live (mandat: "makin kuat makin asah makin tajam").
import type { CandleBulan } from './rahasia-data'

export interface HasilDeteksi {
  simbol: string
  gainPct: number // dibulatkan 4 desimal (paritas dengan kolektor)
  bulanLow: string | null
  bulanPuncak: string | null
  hargaLow: number | null
  hargaHigh: number | null
  jumlahBulan: number
  catatan: string
}

export const AMBANG_GILA = 10000
export const AMBANG_SUPER_GILA = 24000

/**
 * Deteksi lonjakan maksimum sepanjang sejarah candle bulanan:
 * low terendah yang datang SEBELUM bulan puncak → high bulan puncak.
 * (Gerakan dalam satu candle bulanan tak bisa dipastikan urutannya,
 *  jadi sengaja tak dihitung — jujur pada batas data.)
 */
export function deteksiLonjakan(simbol: string, candles: CandleBulan[]): HasilDeteksi {
  const kosong: HasilDeteksi = {
    simbol,
    gainPct: 0,
    bulanLow: null,
    bulanPuncak: null,
    hargaLow: null,
    hargaHigh: candles.length ? candles[candles.length - 1].close : null,
    jumlahBulan: candles.length,
    catatan: candles.length === 0 ? 'tanpa-data' : 'ok',
  }
  if (candles.length === 0) return { ...kosong, catatan: 'tanpa-data' }
  if (candles.length < 2) {
    return { ...kosong, catatan: 'umur<2bulan-tak-dinilai', hargaHigh: candles[0].close }
  }

  let best: HasilDeteksi | null = null
  for (let i = 1; i < candles.length; i++) {
    let base = Infinity
    let idx = -1
    for (let j = 0; j < i; j++) {
      if (candles[j].low > 0 && candles[j].low < base) {
        base = candles[j].low
        idx = j
      }
    }
    if (!isFinite(base) || base <= 0 || idx < 0) continue
    const gain = Math.round((candles[i].high / base - 1) * 100 * 10000) / 10000
    if (!best || gain > best.gainPct) {
      best = {
        simbol,
        gainPct: gain,
        bulanLow: candles[idx].bulan,
        bulanPuncak: candles[i].bulan,
        hargaLow: base,
        hargaHigh: candles[i].high,
        jumlahBulan: candles.length,
        catatan: 'ok',
      }
    }
  }
  if (!best) return { ...kosong, catatan: 'ok' }
  return best
}

/** Klasifikasi tier lonjakan — dipakai soal TIER. */
export function tierDari(gain: number): string {
  if (gain >= AMBANG_GILA) return '10000%+'
  if (gain >= 5000) return '5000-9999%'
  if (gain >= 1000) return '1000-4999%'
  if (gain >= 500) return '500-999%'
  if (gain >= 200) return '200-499%'
  if (gain >= 100) return '100-199%'
  return '<100%'
}

export const DAFTAR_TIER = ['<100%', '100-199%', '200-499%', '500-999%', '1000-4999%', '5000-9999%', '10000%+']

/** Format angka harga rapi utk penjelasan. */
export function fmtHarga(h: number | null): string {
  if (h === null || !isFinite(h)) return 'n/a'
  if (h >= 1000) return h.toLocaleString('id-ID', { maximumFractionDigits: 2 })
  if (h >= 1) return h.toFixed(4)
  if (h >= 0.0001) return h.toFixed(6)
  return h.toPrecision(4)
}

/** Kalimat penjelasan deteksi satu koin (dipakai jawaban otak). */
export function penjelasanDeteksi(d: HasilDeteksi): string {
  if (d.catatan === 'tanpa-data') return 'Tidak ada data candle untuk koin ini.'
  if (d.catatan === 'umur<2bulan-tak-dinilai')
    return `Umur data ${d.jumlahBulan} bulan (<2 bulan): urutan low→high antar-bulan belum bisa dipastikan, jadi lonjakan tidak dinilai (diperlakukan tak tembus ambang).`
  const gain = d.gainPct
  const arah = gain >= 100 ? 'LOMPAT BESAR' : gain > 0 ? 'naik terbatas' : gain === 0 ? 'mendatar' : 'sempat turun'
  return `Sejarah ${d.jumlahBulan} bulan: low ${fmtHarga(d.hargaLow)} (${d.bulanLow ?? '?'}) → high ${fmtHarga(d.hargaHigh)} (${d.bulanPuncak ?? '?'}) = ${gain >= 0 ? '+' : ''}${gain.toFixed(2)}% — ${arah}.`
}
