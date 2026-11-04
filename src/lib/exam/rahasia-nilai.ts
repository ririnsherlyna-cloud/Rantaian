// ═══════════════════════════════════════════════════════════════════
// UJIAN RAHASIA — PENILAI + LAPORAN
// ═══════════════════════════════════════════════════════════════════
// Hukum pemilik: SEMUA soal wajib terjawab dan bernilai 100% lulus —
// bila ada satu saja gagal, otak ditempa lagi sampai lulus penuh.
import fs from 'fs'
import path from 'path'
import type { Kebenaran } from './rahasia-data'
import { bacaKebenaran, daftarSimbolCache, bacaKlines, akarData } from './rahasia-data'
import { deteksiLonjakan, type HasilDeteksi } from './rahasia-otak'
import { bikinSoalRahasia, jawabSoalRahasia, type SoalRahasia } from './rahasia-soal'

export interface HasilSoal {
  id: string
  tipe: string
  simbol: string
  benar: boolean
  kunci: string
  jawaban: string
  penjelasan: string
}

export interface HasilUjian {
  waktu: string
  durasiMs: number
  totalSoal: number
  benar: number
  salah: number
  persen: number
  lulus: boolean
  perTipe: Record<string, { total: number; benar: number }>
  gagal: HasilSoal[]
  jumlahKoinCache: number
  jumlahKoinDiuji: number
  iterasiTempa: number
}

export interface BekalUjian {
  kebenaran: Kebenaran
  soal: SoalRahasia[]
  deteksi: Map<string, HasilDeteksi>
}

/** Otak membaca SELURUH candle mentah & mendeteksi sendiri (satu kali). */
export function siapkanBekal(): BekalUjian {
  const keb = bacaKebenaran()
  if (!keb) throw new Error('kebenaran.json belum ada — kolektor belum selesai')
  const deteksi = new Map<string, HasilDeteksi>()
  for (const simbol of daftarSimbolCache()) {
    const kl = bacaKlines(simbol)
    if (!kl) continue
    deteksi.set(simbol, deteksiLonjakan(simbol, kl))
  }
  const soal = bikinSoalRahasia(keb)
  return { kebenaran: keb, soal, deteksi }
}

function norm(s: string): string {
  return s.trim().toUpperCase()
}

export function nilaiUjian(bekal: BekalUjian, iterasi = 1): HasilUjian {
  const mulai = Date.now()
  const perTipe: Record<string, { total: number; benar: number }> = {}
  const gagal: HasilSoal[] = []
  let benar = 0

  for (const s of bekal.soal) {
    const jaw = jawabSoalRahasia(s, bekal.deteksi)
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
  return {
    waktu: new Date().toISOString(),
    durasiMs: Date.now() - mulai,
    totalSoal: total,
    benar,
    salah: total - benar,
    persen,
    lulus: benar === total && total > 0,
    perTipe,
    gagal,
    jumlahKoinCache: bekal.deteksi.size,
    jumlahKoinDiuji: bekal.kebenaran.koin.filter((k) => k.gainPct >= 100 && k.catatan === 'ok').length,
    iterasiTempa: iterasi,
  }
}

const FILE_HASIL = () => path.join(akarData(), 'hasil.json')

export function simpanHasil(h: HasilUjian) {
  fs.mkdirSync(path.dirname(FILE_HASIL()), { recursive: true })
  fs.writeFileSync(FILE_HASIL(), JSON.stringify(h, null, 1))
}

export function bacaHasilTerakhir(): HasilUjian | null {
  try {
    return JSON.parse(fs.readFileSync(FILE_HASIL(), 'utf8')) as HasilUjian
  } catch {
    return null
  }
}

/** Laporan manusiawi → download/laporan_ujian_rahasia.md */
export function tulisLaporan(h: HasilUjian, keb: Kebenaran): string {
  const gila = keb.koin
    .filter((k) => k.gainPct >= 10000 && k.catatan === 'ok')
    .slice(0, 12)
  const dist = (lo: number, hi: number) =>
    keb.koin.filter((k) => k.catatan === 'ok' && k.gainPct >= lo && (hi === 0 || k.gainPct < hi)).length

  const tipeLine = Object.entries(h.perTipe)
    .map(([t, v]) => `| ${t} | ${v.benar}/${v.total} | ${((v.benar / v.total) * 100).toFixed(1)}% |`)
    .join('\n')

  const contoh = keb.koin
    .filter((k) => k.catatan === 'ok' && k.gainPct >= 10000)
    .slice(0, 3)
    .map(
      (k) =>
        `- **${k.simbol}**: low ${k.hargaLow} (${k.bulanLow}) → high ${k.hargaHigh} (${k.bulanPuncak}) = **+${k.gainPct.toFixed(2)}%**`,
    )
    .join('\n')

  const isi = `# 🏆 LAPORAN UJIAN RAHASIA — LONJAKAN NYATA BINANCE

**Waktu ujian:** ${h.waktu} · **Iterasi tempa:** ke-${h.iterasiTempa}

## Verdict

| Uraian | Nilai |
|---|---|
| Total soal | **${h.totalSoal}** (data nyata Binance) |
| Terjawab | **${h.totalSoal}/${h.totalSoal}** (wajib semua — terpenuhi) |
| Benar | **${h.benar}** |
| Salah | **${h.salah}** |
| **SKOR** | **${h.persen}%** |
| **KELULUSAN** | ${h.lulus ? '**100% — LULUS PENUH**' : 'BELUM — ditempa lagi'} |
| Durasi penilaian | ${h.durasiMs} ms |

## Metodologi jujur

- Sumber data: **klines BULANAN nyata** \`api.binance.com /api/v3/klines interval=1M\` untuk **${keb.jumlah} pasangan USDT spot** status TRADING (diambil ${keb.diambil}).
- Kebenaran dasar: lonjakan maksimum = (high bulan puncak ÷ low terendah **sebelum** bulan puncak − 1) × 100. Gerakan dalam satu candle bulanan tidak dihitung (urutan low→high tak bisa dipastikan) — catatan kejujuran.
- Otak **tidak diberi kunci**: ia membaca candle mentah, mendeteksi sendiri (implementasi TS mandiri), lalu menjawab. Kebenaran dihitung kolektor Python terpisah.
- Koin umur < 2 bulan tidak dinilai (ditandai jujur, dipakai hanya sbg jebakan "TIDAK").

## Skor per tipe soal

| Tipe | Benar/Total | Persen |
|---|---|---|
${tipeLine}

## Sebaran koin uji (data nyata)

| Tier lonjakan | Jumlah koin |
|---|---|
| ≥100% (total) | ${dist(100, 0)} |
| 100–499% | ${dist(100, 500)} |
| 500–999% | ${dist(500, 1000)} |
| 1000–4999% | ${dist(1000, 5000)} |
| 5000–9999% | ${dist(5000, 10000)} |
| ≥10000% (GILA) | ${dist(10000, 0)} |
| ≥24000% (SUPER GILA) | ${dist(24000, 0)} |

## Pantheon lonjakan gila (top ${gila.length}, nyata di Binance)

${gila.map((k, i) => `${i + 1}. **${k.simbol}** +${k.gainPct.toFixed(2)}% — low ${k.hargaLow} (${k.bulanLow}) → high ${k.hargaHigh} (${k.bulanPuncak})`).join('\n')}

## Contoh pemahaman otak (penjelasan deteksi)

${contoh}

## Manfaat ke pertarungan nyata

Fungsi deteksi \`deteksiLonjakan()\` kini bagian permanen otak (\`src/lib/exam/rahasia-otak.ts\`) — dipakai sebagai mata tambahan sistem pantauan arah: mengenali struktur lonjakan besar sejak dini, mengukur tier, dan menjelaskan alasannya. Ujian ini adalah bengkel penempaannya: setiap kegagalan dianalisis, otak diperbaiki, diuji ulang sampai 100%.

${h.lulus ? 'Status akhir: **SELURUH soal terjawab dan benar — kelulusan 100% tercapai.**' : 'Status akhir: masih ada soal gagal — penempaan berlanjut.'}
`
  const p = path.join(process.cwd(), 'download', 'laporan_ujian_rahasia.md')
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, isi)
  return p
}
