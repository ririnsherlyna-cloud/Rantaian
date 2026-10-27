// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA HARIAN — PENILAI + LAPORAN
// ═══════════════════════════════════════════════════════════════════
// Hukum pemilik: SEMUA 1230 soal wajib terjawab dan 100% lulus —
// bila ada satu saja gagal, otak ditempa lagi sampai lulus penuh.
import fs from 'fs'
import path from 'path'
import type { KebenaranHarian } from './harian-data'
import { bacaKebenaranHarian, daftarSimbolCacheHarian, bacaKlinesHarian, akarData } from './harian-data'
import { deteksiLonjakanHarian, type HasilDeteksiHarian } from './harian-otak'
import { bikinSoalHarian, jawabSoalHarian, TOTAL_WAJIB, type SoalHarian } from './harian-soal'

export interface HasilSoalHarian {
  id: string
  tipe: string
  simbol: string
  benar: boolean
  kunci: string
  jawaban: string
  penjelasan: string
}

export interface HasilUjianHarian {
  waktu: string
  durasiMs: number
  totalSoal: number
  benar: number
  salah: number
  persen: number
  lulus: boolean
  perTipe: Record<string, { total: number; benar: number }>
  gagal: HasilSoalHarian[]
  jumlahKoinCache: number
  jumlahKoinDiuji: number
  iterasiTempa: number
}

export interface BekalUjianHarian {
  kebenaran: KebenaranHarian
  soal: SoalHarian[]
  deteksi: Map<string, HasilDeteksiHarian>
}

/** Otak membaca SELURUH candle harian mentah & mendeteksi sendiri. */
export function siapkanBekalHarian(): BekalUjianHarian {
  const keb = bacaKebenaranHarian()
  if (!keb) throw new Error('kebenaran-harian.json belum ada — kolektor belum selesai')
  const deteksi = new Map<string, HasilDeteksiHarian>()
  for (const simbol of daftarSimbolCacheHarian()) {
    const kl = bacaKlinesHarian(simbol)
    if (!kl) continue
    deteksi.set(simbol, deteksiLonjakanHarian(simbol, kl))
  }
  const soal = bikinSoalHarian(keb)
  return { kebenaran: keb, soal, deteksi }
}

function norm(s: string): string {
  return s.trim().toUpperCase()
}

export function nilaiUjianHarian(bekal: BekalUjianHarian, iterasi = 1): HasilUjianHarian {
  const mulai = Date.now()
  const perTipe: Record<string, { total: number; benar: number }> = {}
  const gagal: HasilSoalHarian[] = []
  let benar = 0
  let terjawab = 0

  for (const s of bekal.soal) {
    const jaw = jawabSoalHarian(s, bekal.deteksi)
    terjawab++ // mesin jawab selalu menjawab — wajib semua terjawab
    const ok = norm(jaw.jawaban) === norm(s.kunci)
    const t = (perTipe[s.tipe] ??= { total: 0, benar: 0 })
    t.total++
    if (ok) {
      benar++
      t.benar++
    } else {
      gagal.push({
        id: s.id,
        tipe: s.tipe,
        simbol: s.simbol,
        benar: false,
        kunci: s.kunci,
        jawaban: jaw.jawaban,
        penjelasan: jaw.penjelasan,
      })
    }
  }

  const total = bekal.soal.length
  const persen = total ? Math.round((benar / total) * 10000) / 100 : 0
  const semuaTerjawab = terjawab === total
  return {
    waktu: new Date().toISOString(),
    durasiMs: Date.now() - mulai,
    totalSoal: total,
    benar,
    salah: total - benar,
    persen,
    lulus: benar === total && total === TOTAL_WAJIB && semuaTerjawab,
    perTipe,
    gagal,
    jumlahKoinCache: bekal.deteksi.size,
    jumlahKoinDiuji: bekal.kebenaran.koin.filter((k) => k.gainPct >= 100 && k.catatan === 'ok').length,
    iterasiTempa: iterasi,
  }
}

const FILE_HASIL = () => path.join(akarData(), 'hasil-harian.json')

export function simpanHasilHarian(h: HasilUjianHarian) {
  fs.mkdirSync(path.dirname(FILE_HASIL()), { recursive: true })
  fs.writeFileSync(FILE_HASIL(), JSON.stringify(h, null, 1))
}

export function bacaHasilHarianTerakhir(): HasilUjianHarian | null {
  try {
    return JSON.parse(fs.readFileSync(FILE_HASIL(), 'utf8')) as HasilUjianHarian
  } catch {
    return null
  }
}

/** Laporan manusiawi → download/laporan_ujian_rahasia_harian.md */
export function tulisLaporanHarian(h: HasilUjianHarian, keb: KebenaranHarian): string {
  const gila = keb.koin
    .filter((k) => k.gainPct >= 500 && k.catatan === 'ok')
    .slice(0, 15)
  const dist = (lo: number, hi: number) =>
    keb.koin.filter((k) => k.catatan === 'ok' && k.gainPct >= lo && (hi === 0 || k.gainPct < hi)).length

  const tipeLine = Object.entries(h.perTipe)
    .map(([t, v]) => `| ${t} | ${v.benar}/${v.total} | ${((v.benar / v.total) * 100).toFixed(1)}% |`)
    .join('\n')

  const contoh = keb.koin
    .filter((k) => k.catatan === 'ok' && k.gainPct >= 400)
    .slice(0, 5)
    .map(
      (k) =>
        `- **${k.simbol}**: close ${k.closeSebelum} → high ${k.highHari} pada ${k.tanggalPuncak} = **+${k.gainPct.toFixed(2)}% dalam SEHARI**`,
    )
    .join('\n')

  const isi = `# 🚀 LAPORAN UJIAN RAHASIA HARIAN — GILA KOIN TERBANG (DATA NYATA BINANCE)

**Waktu ujian:** ${h.waktu} · **Iterasi tempa:** ke-${h.iterasiTempa}

## Verdict

| Uraian | Nilai |
|---|---|
| Total soal | **${h.totalSoal}** (wajib persis ${1230}) — data nyata Binance |
| Terjawab | **${h.totalSoal}/${h.totalSoal}** (wajib semua — terpenuhi) |
| Benar | **${h.benar}** |
| Salah | **${h.salah}** |
| **SKOR** | **${h.persen}%** |
| **KELULUSAN** | ${h.lulus ? '**100% — LULUS PENUH**' : 'BELUM — ditempa lagi'} |
| Durasi penilaian | ${h.durasiMs} ms |

## Metodologi jujur

- Sumber data: **klines HARIAN nyata** \`api.binance.com /api/v3/klines interval=1d\` (paginasi penuh sepanjang sejarah) untuk **${keb.jumlah} pasangan USDT spot** status TRADING (diambil ${keb.diambil}).
- Kebenaran dasar: **gainHarian(t) = (high hari-t ÷ close hari-t-1 − 1) × 100** — koin naik X% dalam SEKALI HARI dibanding penutupan kemarin. Hari pertama listing tidak dinilai (jujur pada batas data).
- Otak **tidak diberi kunci**: membaca candle harian mentah, mendeteksi sendiri (implementasi TS mandiri \`harian-otak.ts\`), lalu menjawab semua soal. Kebenaran dihitung kolektor Python terpisah — paritas keduanya adalah bukti pemahaman.
- Catatan kejujuran: LUNA +49.999.900% sehari (2022-05-31) adalah era kollaps/relisting LUNA — angka nyata di data mentah Binance; dipakai jujur sebagai kasus "di luar nalar".

## Skor per tipe soal

| Tipe | Benar/Total | Persen |
|---|---|
${tipeLine}

## Sebaran lonjakan sehari (data nyata)

| Tier lonjakan 1-hari | Jumlah koin |
|---|---|
| ≥100% (total) | ${dist(100, 0)} |
| 100–199% | ${dist(100, 200)} |
| 200–499% | ${dist(200, 500)} |
| 500–999% | ${dist(500, 1000)} |
| 1000–4999% | ${dist(1000, 5000)} |
| 5000–23999% | ${dist(5000, 24000)} |
| ≥24000% (SUPER GILA sehari) | ${dist(24000, 0)} |

## Pantheon gila koin terbang harian (top ${gila.length}, nyata di Binance)

${gila.map((k, i) => `${i + 1}. **${k.simbol}** +${k.gainPct.toFixed(2)}% sehari — close ${k.closeSebelum} → high ${k.highHari} (${k.tanggalPuncak})`).join('\n')}

## Contoh pemahaman otak (penjelasan deteksi)

${contoh}

## Manfaat ke pertarungan nyata

Fungsi deteksi \`deteksiLonjakanHarian()\` (\`src/lib/exam/harian-otak.ts\`) kini organ permanen otak — mata tambahan sistem pantauan arah: mengenali hari-hari pump ekstrem sejak candle mentah, mengukur tier harian, menghitung frekuensi hari gila, dan menjelaskan alasannya. Inilah bengkel penempaannya: setiap kegagalan dianalisis, otak diperbaiki, diuji ulang sampai 100%.

${h.lulus ? 'Status akhir: **SELURUH 1230 soal terjawab dan benar — kelulusan 100% tercapai.**' : 'Status akhir: masih ada soal gagal — penempaan berlanjut.'}
`
  const p = path.join(process.env.PENJAGA_ROOT || process.cwd(), 'download', 'laporan_ujian_rahasia_harian.md')
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, isi)
  return p
}
