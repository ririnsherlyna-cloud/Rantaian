// ============================================================
// MOZAIK FAKULTAS: SELF-EVALUATION ENGINE
// "menguji kemampuan sendiri, menemukan kelemahan, mengukur
//  perkembangan" — SELURUH angka dibaca dari bukti JSON nyata
//  di research/ujian-*/ (TIDAK ada angka karangan).
//
// Matriks mengukur versi otak TERSERTIFIKASI per suite (versi
// terakhir yang dibekukan) — rekam perjalanan belajar versi
// lama dirangkum di fakultas LOOP & MEMORI, bukan di sini.
//
// Efisiensi: folder bukti bisa 118 MB, jadi mesin hanya
// membaca KEPALA tiap JSON (head-trim 512 KB + parser kurung
// seimbang) — baris per baris tetap utuh di disk utk audit Guru.
//
// Prinsip: OBSERVABILITY (semua terukur), AUTOMATED TESTING
// (9 suite = uji otomatis), CONTINUOUS VALIDATION (segel lahir
// setelah otak dibekukan), FAULT ISOLATION (file rusak = 1
// catatan kejujuran, tidak meruntuhkan matriks).
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import type { HasilEvaluasi, SuiteMatriks } from './types'

const ROOT = process.cwd()
const DIR_UJIAN = path.join(ROOT, 'research')

// ------------------------------------------------------------
// REGISTRI SUITE — organ SAKTI bersertifikat + versi beku
// ------------------------------------------------------------

interface RegSuite {
  id: string
  label: string
  organ: string
  otakVersi: string
  dir: string
}

export const SUITE_REGISTRI: RegSuite[] = [
  { id: 'fbo', label: 'False Breakout', organ: 'SAKTI-FBO', otakVersi: '1.38', dir: 'ujian-fbo' },
  { id: 'bulltrap', label: 'Bull Trap', organ: 'SAKTI-MATA', otakVersi: '2.7', dir: 'ujian-bulltrap' },
  { id: 'beartrap', label: 'Bear Trap', organ: 'SAKTI-BEAR', otakVersi: '2.7', dir: 'ujian-beartrap' },
  { id: 'stophunt', label: 'Stop Hunt / Liquidity Grab', organ: 'SAKTI-ST', otakVersi: '2.9.4', dir: 'ujian-stophunt' },
  { id: 'pumpdump', label: 'Pump & Dump', organ: 'SAKTI-PD', otakVersi: '1.7', dir: 'ujian-pumpdump' },
  { id: 'gabungan', label: 'Gabungan 4 Aspek', organ: 'SAKTI-GAB', otakVersi: '1.6', dir: 'ujian-gabungan' },
  { id: 'candle', label: 'Candle Deception', organ: 'SAKTI-CANDLE', otakVersi: '231.5', dir: 'ujian-candle' },
  { id: 'kompleks', label: 'Kompleks 5 Aspek', organ: 'SAKTI-KOMPLEKS', otakVersi: '1.2', dir: 'ujian-kompleks' },
  { id: 'arah', label: 'Kepastian Arah BUY/SELL', organ: 'SAKTI-ARAH', otakVersi: '1.8', dir: 'ujian-arah' },
]

// ------------------------------------------------------------
// PEMBACA JSON KEPALA — head-trim + kurung seimbang (string-aman)
// ------------------------------------------------------------

function ambilObjek(teks: string, kunci: string): Record<string, unknown> | null {
  const patuh = `"${kunci}"`
  let i = teks.indexOf(patuh)
  while (i !== -1) {
    let j = teks.indexOf(':', i + patuh.length)
    if (j === -1) return null
    j++
    while (j < teks.length && /\s/.test(teks[j])) j++
    if (teks[j] !== '{') {
      i = teks.indexOf(patuh, i + 1)
      continue
    }
    let depth = 0
    let inStr = false
    let esc = false
    for (let k = j; k < teks.length; k++) {
      const c = teks[k]
      if (inStr) {
        if (esc) esc = false
        else if (c === '\\') esc = true
        else if (c === '"') inStr = false
        continue
      }
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(teks.slice(j, k + 1)) as Record<string, unknown>
          } catch {
            return null
          }
        }
      }
    }
    return null
  }
  return null
}

const UKURAN_KEPALA = 512 * 1024
const BATAS_FULL_PARSE = 2 * 1024 * 1024 // ≤2 MB: parse penuh; di atas: head-trim saja

/** dibuka juga utk fakultas MEMORI (satu pembaca, satu perilaku) */
export async function bacaKepala(file: string): Promise<{ meta: Record<string, unknown> | null; ring: Record<string, unknown> | null; top: Record<string, unknown> | null }> {
  const fh = await fs.open(file, 'r')
  try {
    const size = (await fh.stat()).size
    if (size <= BATAS_FULL_PARSE) {
      try {
        const top = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>
        const meta = (top.meta && typeof top.meta === 'object' ? top.meta : null) as Record<string, unknown> | null
        const ring = (top.ringkasan && typeof top.ringkasan === 'object' ? top.ringkasan : null) as Record<string, unknown> | null
        return { meta, ring, top }
      } catch {
        // jatuh ke head-trim di bawah
      }
    }
    const buf = Buffer.alloc(UKURAN_KEPALA)
    await fh.read(buf, 0, buf.length, 0)
    const teks = buf.toString('utf8')
    return { meta: ambilObjek(teks, 'meta'), ring: ambilObjek(teks, 'ringkasan'), top: null }
  } finally {
    await fh.close()
  }
}

/** angka aman (null bila bukan angka finite) — dipakai lintas fakultas */
export function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function versiDari(meta: Record<string, unknown> | null, top: Record<string, unknown> | null): string {
  const m = meta?.versi ?? top?.versi
  return m === undefined || m === null ? '' : String(m)
}

// ------------------------------------------------------------
// EKSTRAKTOR PER SUITE — eksplisit, bisa diaudit, tanpa tebakan
// ------------------------------------------------------------

interface Tampung {
  ujian: number
  lulus: number
  likuidasi: number
  rugi: number
  net: number
  hakim: { ujian: number; lulus: number }
  segel: { ujian: number; lulus: number }
  kelemahanFile: string[]
}

type Ekstraktor = (ctx: {
  file: string
  meta: Record<string, unknown> | null
  ring: Record<string, unknown> | null
  top: Record<string, unknown> | null
  tampung: Tampung
}) => void

/** suite dgn ringkasan: berhasil + likuidasi + rugiNet|rugi + cum|netSum (total = berhasil+likuidasi+rugiNet) */
const ekstraktorBerhasil: Ekstraktor = ({ ring, tampung }) => {
  if (!ring) return
  const berhasil = num(ring.berhasil)
  if (berhasil === null) return
  const lik = num(ring.likuidasi) ?? 0
  const rugi = num(ring.rugiNet) ?? num(ring.rugi) ?? 0
  const total = num(ring.total) ?? berhasil + lik + rugi
  const net = num(ring.netSum) ?? num(ring.cum) ?? 0
  tampung.ujian += total
  tampung.lulus += berhasil
  tampung.likuidasi += lik
  tampung.rugi += rugi
  tampung.net += net
}

/** suite ARAH: total + arahBenar + netSum eksplisit */
const ekstraktorArah: Ekstraktor = ({ ring, tampung }) => {
  if (!ring) return
  const total = num(ring.total)
  const lulus = num(ring.arahBenar) ?? num(ring.berhasil)
  if (total === null || lulus === null) return
  tampung.ujian += total
  tampung.lulus += lulus
  tampung.likuidasi += num(ring.likuidasi) ?? 0
  tampung.net += num(ring.netSum) ?? 0
}

/** suite trap dgn trapBenar/trapTotal */
const ekstraktorTrap: Ekstraktor = ({ ring, tampung }) => {
  if (!ring) return
  const total = num(ring.trapTotal)
  const lulus = num(ring.trapBenar)
  if (total === null || lulus === null) return
  tampung.ujian += total
  tampung.lulus += lulus
  tampung.net += num(ring.totalNetPct) ?? 0
}

/** suite CANDLE: top-level total/benar/likuidasi */
const ekstraktorCandle: Ekstraktor = ({ top, tampung }) => {
  if (!top) return
  const total = num(top.total)
  const lulus = num(top.benar)
  if (total === null || lulus === null) return
  tampung.ujian += total
  tampung.lulus += lulus
  tampung.likuidasi += num(top.likuidasi) ?? 0
}

/** suite FBO: format ringkas r45 {total, max, residu[]} atau ringkasan string LULUS x/y */
const ekstraktorFbo: Ekstraktor = ({ top, ring, file, tampung }) => {
  if (top) {
    const total = num(top.total)
    const maks = num(top.max)
    if (total !== null && maks !== null) {
      tampung.ujian += maks
      tampung.lulus += total
      const residu = top.residu
      if (Array.isArray(residu)) tampung.kelemahanFile.push(`${path.basename(file)}: ${residu.length} residu terbuka (dicatat jujur)`)
      return
    }
  }
  if (ring && typeof ring.fbo === 'string') {
    const m = /LULUS (\d+)\/(\d+)/.exec(ring.fbo)
    if (m) {
      tampung.lulus += Number(m[1])
      tampung.ujian += Number(m[2])
      const l = /LIKUIDASI (\d+)/.exec(ring.fbo)
      tampung.likuidasi += l ? Number(l[1]) : 0
      const r = /rugi-net (\d+)/.exec(ring.fbo)
      tampung.rugi += r ? Number(r[1]) : 0
    }
  }
}

const EKSTRAKTOR: Record<string, Ekstraktor> = {
  fbo: ekstraktorFbo,
  bulltrap: ekstraktorTrap,
  beartrap: ekstraktorTrap,
  stophunt: ekstraktorBerhasil,
  pumpdump: ekstraktorBerhasil,
  gabungan: ekstraktorBerhasil,
  candle: ekstraktorCandle,
  kompleks: ekstraktorBerhasil,
  arah: ekstraktorArah,
}

// ------------------------------------------------------------
// MESIN EVALUASI
// ------------------------------------------------------------

export async function evaluasiDiri(): Promise<HasilEvaluasi> {
  const suites: SuiteMatriks[] = []
  const kelemahan: string[] = []
  let fileTotal = 0

  for (const s of SUITE_REGISTRI) {
    const dir = path.join(DIR_UJIAN, s.dir)
    const tampung: Tampung = {
      ujian: 0, lulus: 0, likuidasi: 0, rugi: 0, net: 0,
      hakim: { ujian: 0, lulus: 0 }, segel: { ujian: 0, lulus: 0 }, kelemahanFile: [],
    }
    let fileJson: string[] = []
    try {
      fileJson = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort()
    } catch {
      kelemahan.push(`${s.id}: folder bukti tidak ada (${s.dir}) — organ belum punya bukti ujian`)
      suites.push(matriksKosong(s))
      continue
    }

    let dipakai = 0
    for (const f of fileJson) {
      try {
        const { meta, ring, top } = await bacaKepala(path.join(dir, f))
        if (versiDari(meta, top) !== s.otakVersi) continue // hanya versi tersertifikasi
        dipakai++
        const sebelum = { ujian: tampung.ujian, lulus: tampung.lulus }
        EKSTRAKTOR[s.id]({ file: f, meta, ring, top, tampung })
        const dUjian = tampung.ujian - sebelum.ujian
        const dLulus = tampung.lulus - sebelum.lulus
        const nl = path.basename(f).toLowerCase()
        if (nl.includes('segel') || nl.includes('pamungkas') || nl.includes('seged')) {
          tampung.segel.ujian += dUjian
          tampung.segel.lulus += dLulus
        } else if (nl.includes('hakim')) {
          tampung.hakim.ujian += dUjian
          tampung.hakim.lulus += dLulus
        }
      } catch {
        tampung.kelemahanFile.push(`${f}: file bukti tak terbaca (ditandai, tidak disembunyikan)`)
      }
    }
    fileTotal += dipakai

    if (dipakai === 0) kelemahan.push(`${s.id}: tidak ada bukti versi tersertifikasi v${s.otakVersi}`)
    if (tampung.ujian > 0 && tampung.lulus < tampung.ujian) {
      kelemahan.push(`${s.id} v${s.otakVersi}: ${tampung.ujian - tampung.lulus} kegagalan terekam pada ${tampung.ujian} ujian tersertifikasi ( ${(tampung.lulus / tampung.ujian * 100).toFixed(2)}%) — kandidat ronde belajar`)
    }
    if (tampung.likuidasi > 0) kelemahan.push(`${s.id} v${s.otakVersi}: ${tampung.likuidasi} likuidasi terekam (disiplin stop)`)
    kelemahan.push(...tampung.kelemahanFile)

    suites.push({
      id: s.id,
      label: s.label,
      organ: s.organ,
      otakVersi: `v${s.otakVersi}`,
      total: tampung.ujian,
      berhasil: tampung.lulus,
      persen: tampung.ujian > 0 ? (tampung.lulus / tampung.ujian) * 100 : 0,
      likuidasi: tampung.likuidasi,
      rugiNet: tampung.rugi,
      netSum: tampung.net,
      hakim: { total: tampung.hakim.ujian, berhasil: tampung.hakim.lulus },
      segel: {
        total: tampung.segel.ujian,
        berhasil: tampung.segel.lulus,
        persen: tampung.segel.ujian > 0 ? (tampung.segel.lulus / tampung.segel.ujian) * 100 : null,
      },
      file: dipakai,
    })
  }

  const grandTotal = suites.reduce((a, s) => a + s.total, 0)
  const grandBerhasil = suites.reduce((a, s) => a + s.berhasil, 0)
  return {
    suites,
    grandTotal,
    grandBerhasil,
    grandPersen: grandTotal > 0 ? (grandBerhasil / grandTotal) * 100 : 0,
    grandLikuidasi: suites.reduce((a, s) => a + s.likuidasi, 0),
    grandNet: suites.reduce((a, s) => a + s.netSum, 0),
    kelemahan,
    fileTotal,
  }
}

function matriksKosong(s: RegSuite): SuiteMatriks {
  return {
    id: s.id, label: s.label, organ: s.organ, otakVersi: `v${s.otakVersi}`,
    total: 0, berhasil: 0, persen: 0, likuidasi: 0, rugiNet: 0, netSum: 0,
    hakim: { total: 0, berhasil: 0 }, segel: { total: 0, berhasil: 0, persen: null }, file: 0,
  }
}
