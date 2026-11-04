// ============================================================
// MOZAIK FAKULTAS: LONG-TERM MEMORY
// Menyimpan & mengindeks pengalaman, hasil eksperimen,
// KESALAHAN, dan pembelajaran yang relevan.
//
// Sumber kebenaran: file di disk — bukti ujian JSON
// (research/ujian-*), laporan MD (download/LAPORAN-*), dan
// SAKTI (memori hash FNV-1a V231_INGATAN di dalam cyborg).
//
// Tier memori (mengikuti arsitektur V231_INGATAN):
//   HOT  — kode pelajaran aktif di bukti versi tersertifikasi
//   WARM — riwayat ujian per suite (semua versi, perjalanan belajar)
//   COLD — arsip laporan & bukti (laporan MD, bukti PNG)
//
// Prinsip: OBSERVABILITY (tiap angka punya sumber file),
// FAULT ISOLATION (file rusak dilewati dgn catatan), MODULARITY
// (pembaca JSON yang sama dipakai lintas fakultas).
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import { bacaKepala, num, SUITE_REGISTRI } from './evaluasi'
import type { HasilMemori, Pelajaran } from './types'

const ROOT = process.cwd()
const DIR_UJIAN = path.join(ROOT, 'research')
const DIR_UNDUH = path.join(ROOT, 'download')

/** kode pengetahuan: pelajaran (L) & dimensi bukti (E) dari organ mana pun */
const RE_KODE = /\b(SG|CG|KL|AR|FB|PD|BT|BE|SH|CD|GB|RD|VT|PHX)-[LE]\d+[a-z]?\b/g

async function adaDir(p: string): Promise<boolean> {
  try { return (await fs.stat(p)).isDirectory() } catch { return false }
}

/** total pengalaman & kegagalan dari SEMUA bukti JSON (semua versi = perjalanan belajar) */
async function sapuPengalaman(dirUjian: string[]): Promise<{ pengalaman: number; kegagalan: number; warm: number; bytes: number; file: number }> {
  let pengalaman = 0
  let kegagalan = 0
  let warm = 0
  let bytes = 0
  let file = 0
  for (const dir of dirUjian) {
    let nama: string[] = []
    try {
      nama = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))
    } catch { continue }
    for (const f of nama) {
      const p = path.join(dir, f)
      try {
        const st = await fs.stat(p)
        bytes += st.size
        file++
        const { ring, top } = await bacaKepala(p)
        // beragam format bukti — disambiguasi eksplisit:
        //  1) FBO ringkas r45: {total (LULUS), max (jumlah ujian), residu[]}
        //  2) ARAH: ringkasan {total, arahBenar, likuidasi, netSum}
        //  3) trap: ringkasan {trapBenar, trapTotal}
        //  4) berhasil-ringkas: ringkasan {berhasil, likuidasi, rugiNet|rugi}
        //  5) CANDLE: top-level {total, benar, likuidasi}
        const maks = num(top?.max)
        const fboTotal = num(top?.total)
        let total: number | null = null
        let lulus: number | null = null
        if (maks !== null && fboTotal !== null) {
          total = maks
          lulus = fboTotal
        } else if (num(ring?.total) !== null && num(ring?.arahBenar) !== null) {
          total = num(ring?.total)
          lulus = num(ring?.arahBenar)
        } else if (num(ring?.trapTotal) !== null) {
          total = num(ring?.trapTotal)
          lulus = num(ring?.trapBenar)
        } else if (num(top?.total) !== null && num(top?.benar) !== null) {
          total = num(top?.total)
          lulus = num(top?.benar)
        } else if (num(ring?.berhasil) !== null) {
          const ber = num(ring?.berhasil) ?? 0
          const likK = num(ring?.likuidasi) ?? 0
          const rugi = num(ring?.rugiNet) ?? num(ring?.rugi) ?? 0
          total = num(ring?.total) ?? ber + likK + rugi
          lulus = ber
        }
        if (total !== null && total > 0) {
          pengalaman += total
          warm++
        }
        if (total !== null && lulus !== null && total > lulus) kegagalan += total - lulus
      } catch { /* file rusak: dilewati, tetap dihitung byte-nya */ }
    }
  }
  return { pengalaman, kegagalan, warm, bytes, file }
}

/** pungut kode pelajaran dari teks alasan/bukti di bukti versi tersertifikasi */
async function panenKode(dir: string, versi: string, batasBaca = 1_500_000): Promise<Map<string, { n: number; contoh: string }>> {
  const peta = new Map<string, { n: number; contoh: string }>()
  let nama: string[] = []
  try {
    nama = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))
  } catch { return peta }
  for (const f of nama) {
    const p = path.join(dir, f)
    try {
      const fh = await fs.open(p, 'r')
      const buf = Buffer.alloc(batasBaca)
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
      await fh.close()
      const teks = buf.toString('utf8', 0, bytesRead)
      // hanya file milik versi tersertifikasi (meta.versi / "versi":"x")
      const mVersi = /"versi"\s*:\s*"([^"]+)"/.exec(teks)
      if (!mVersi || mVersi[1] !== versi) continue
      RE_KODE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = RE_KODE.exec(teks)) !== null) {
        const kode = m[0] // kode penuh: KL-L2, AR-E3, SG-L9, FB-T20, …
        const cur = peta.get(kode)
        if (cur) cur.n++
        else peta.set(kode, { n: 1, contoh: null as unknown as string })
      }
    } catch { /* lewati */ }
  }
  // satu contoh nyata per kode (potongan alasan pertama yg memuat kode)
  for (const [kode, v] of peta) {
    for (const f of nama) {
      const p = path.join(dir, f)
      try {
        const fh = await fs.open(p, 'r')
        const buf = Buffer.alloc(Math.min(batasBaca, 800_000))
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
        await fh.close()
        const teks = buf.toString('utf8', 0, bytesRead)
        const mVersi = /"versi"\s*:\s*"([^"]+)"/.exec(teks)
        if (!mVersi || mVersi[1] !== versi) continue
        const idx = teks.indexOf(kode + ' ')
        if (idx !== -1) {
          const potong = teks.slice(idx, idx + 150).replace(/[\\"\n\r]+/g, ' ').trim()
          v.contoh = potong
          break
        }
      } catch { /* lewati */ }
    }
  }
  return peta
}

export async function bangunMemori(modeLengkap: boolean): Promise<HasilMemori> {
  const dirs = (await Promise.all(
    SUITE_REGISTRI.map(async (s) => {
      const d = path.join(DIR_UJIAN, s.dir)
      return (await adaDir(d)) ? d : null
    }),
  )).filter((x): x is string => x !== null)

  const sapu = await sapuPengalaman(dirs)

  // COLD: arsip laporan + bukti visual
  let laporan: string[] = []
  try {
    laporan = (await fs.readdir(DIR_UNDUH)).filter((f) => f.startsWith('LAPORAN-') && f.endsWith('.md')).sort()
  } catch { laporan = [] }

  // HOT: kode pelajaran aktif di bukti tersertifikasi (mode lengkap saja — hemat di runtime)
  const pelajaran: Pelajaran[] = []
  if (modeLengkap) {
    const gabung = new Map<string, { n: number; contoh: string }>()
    for (const s of SUITE_REGISTRI) {
      const d = path.join(DIR_UJIAN, s.dir)
      if (!(await adaDir(d))) continue
      const peta = await panenKode(d, s.otakVersi)
      for (const [kode, v] of peta) {
        const cur = gabung.get(kode)
        if (cur) {
          cur.n += v.n
          if (!cur.contoh && v.contoh) cur.contoh = v.contoh
        } else gabung.set(kode, { ...v })
      }
    }
    for (const [kode, v] of [...gabung.entries()].sort((a, b) => b[1].n - a[1].n)) {
      pelajaran.push({ kode, jumlah: v.n, contoh: v.contoh })
    }
  }

  return {
    pengalaman: sapu.pengalaman,
    kegagalan: sapu.kegagalan,
    pelajaran,
    tier: {
      hot: pelajaran.length,
      warm: sapu.warm,
      cold: laporan.length,
    },
    bytes: sapu.bytes,
    file: sapu.file,
    laporan,
  }
}
