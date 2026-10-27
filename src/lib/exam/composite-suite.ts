// ============================================================
// PERAKIT SUITE UJIAN GABUNGAN — 100 ujian, SETIAP ujian berisi
// KEEMPAT aspek sekaligus (stop hunt + bull trap + bear trap +
// candle menipu). Gerbang profit dari DATA (truth dari data,
// retry berbibit, tanpa label manusia):
//   REVERSAL/CASCADE : move >= 2.6% & MFE >= 3.0% & dip-guard
//                      (dip horizon tak boleh menembus stop
//                      struktural ekstrem - 0.7 ATR)
//   FAKE/VACUUM      : move >= 2.4% & MFE >= 2.8% & bait-MFE
//                      <= 1.3% (umpan MUSTAHIL profit) + mom50
//   DOUBLE-SWEEP     : sapuan kedua LEBIH DALAM (<= ekstrem -
//                      1.1 ATR) baru move >= 2.8% & MFE >= 3.2%
//                      & trigger WAIT harus menyala & post-
//                      trigger sampai target
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import { Pen, type BtRng, type DiffCfg } from './bulltrap-forge'
import {
  CG_VISIBLE, CG_TOTAL, CG_SIZE,
  type CgArah, type CgExam, type AspekTruth,
} from './composite-forge'
import {
  genGauntlet, cgHorizonRev, cgHorizonFake, cgHorizonVacuum, cgHorizonDouble, cgHorizonCascade,
  type GauntOpts,
} from './composite-gens'
import { rescalePoolTo } from './stophunt-forge'

export const CG_DIFF_CYCLE = ['MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG', 'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL'] as const

const DIFF_CFG: Record<string, DiffCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface CgFamDef {
  id: string
  label: string
  post: 'REVERSAL' | 'CONTINUATION' | 'DOUBLE-SWEEP'
  postGen: 'REVERSAL' | 'FAKE' | 'VACUUM' | 'DOUBLE' | 'CASCADE'
  ilmu: string
  jebakan: string
  tanda: string
  horizon: (pen: Pen, r: BtRng, u: number, cfg: DiffCfg, dir: CgArah) => void
  opts: (dir: CgArah) => Omit<GauntOpts, 'dir' | 'post'>
  up: number
  dn: number
}

export const CG_FAMILIES: CgFamDef[] = [
  {
    id: 'cg-rev-strong', label: 'Gauntlet Klasik: Dua Jebakan + Sweep Reclaim', post: 'REVERSAL', postGen: 'REVERSAL',
    ilmu: 'Bull trap menabung likuiditas di atas, bear trap melahirkan pool rantai di bawah, stop hunt final menyapu pool rantai dan ditutup balik dengan badan dominan — keempat jebakan hadir, resolusinya reversal.',
    jebakan: 'Trader pro beli breakout (bull trap), lalu short breakdown (bear trap), lalu short "sweep gagal" — setiap lapisan mengambil korban baru; yang selamat pun keluar sebelum reclaim dominan.',
    tanda: 'pool rantai disapu <= 1 candle + badan reclaim >= 0.55 ATR + volume klimaks + dua sisi pool terpetakan',
    horizon: cgHorizonRev, opts: () => ({}), up: 7, dn: 7,
  },
  {
    id: 'cg-rev-cascade', label: 'Gauntlet Kaskade: Likuidasi Berantai lalu V', post: 'REVERSAL', postGen: 'CASCADE',
    ilmu: 'Gauntlet penuh lalu kaskade panik 3 lilin besar menembus pool rantai — mesin likuidasi kehabisan bahan bakar — reclaim V raksasa pada lilin klimaks.',
    jebakan: 'Pro short momentum kaskade dengan leverage; kaskade adalah mesin panen stop — V-reversal melikuidasi mereka sekaligus.',
    tanda: '3 merah besar berturut + volZ klimaks + crossBack pada candle terakhir + kedalaman >= 0.8 ATR',
    horizon: cgHorizonCascade, opts: () => ({}), up: 6, dn: 6,
  },
  {
    id: 'cg-rev-round', label: 'Gauntlet Angka Bulat: Pool Psikologis', post: 'REVERSAL', postGen: 'REVERSAL',
    ilmu: 'Seluruh gauntlet terjadi di sekitar angka psikologis; stop cluster menumpuk di bawahnya; stop hunt final menusuk angka bulat lalu reclaim.',
    jebakan: 'Pro menaruh stop 1-2 tick di bawah angka bulat — market maker melihat tumpukan itu; sapuan angka bulat = panen massal.',
    tanda: 'pool rantai TEPAT di level integer + sapuan menembus angka + reclaim badan dominan',
    horizon: cgHorizonRev, opts: () => ({ round: true }), up: 5, dn: 5,
  },
  {
    id: 'cg-rev-wick', label: 'Gauntlet Klaster Wick: Ekor yang Menipu', post: 'REVERSAL', postGen: 'REVERSAL',
    ilmu: 'Base range dihiasi klaster wick panjang di tepi — setiap ekor adalah stop baru; stop hunt final menembus SEMUA ekor sekaligus lalu reclaim.',
    jebakan: '"Support terbukti 4x" — pro menumpuk posisi di klaster; sapuan keempat mengambil semuanya.',
    tanda: 'klaster >= 3 wick panjang level mirip + sapuan di bawah seluruh ekor + reclaim dominan',
    horizon: cgHorizonRev, opts: () => ({ wickCluster: true }), up: 5, dn: 5,
  },
  {
    id: 'cg-rev-range', label: 'Gauntlet Tepi Range Lebar', post: 'REVERSAL', postGen: 'REVERSAL',
    ilmu: 'Range lebar (bounce antar tepi >= 2.6 ATR): kedua jebakan lahir di tepi, pool rantai di tepi bawah/atas disapu lalu ditolak ke arah lawan.',
    jebakan: 'Pro menjual "range broken" / membeli "range breakout" — tepi range adalah bank likuiditas, sapuan = panen.',
    tanda: 'bounce antar tepi >= 2.6 ATR + sapuan tepi + reclaim ke dalam range',
    horizon: cgHorizonRev, opts: () => ({ wide: true }), up: 8, dn: 8,
  },
  {
    id: 'cg-cont-fake', label: 'Gauntlet Reclaim Palsu: Umpan Terakhir', post: 'CONTINUATION', postGen: 'FAKE',
    ilmu: 'Setelah gauntlet penuh, sapuan final ditutup SEDIKIT di atas pool lalu GAGAL extend (LH mikro, volume kering) — reclaim tanpa pengikut adalah umpan terakhir sebelum lanjutan.',
    jebakan: 'Paling licik: penunggu-konfirmasi pun membeli reclaim; pro yang selamat dari dua trap pertama jatuh di umpan ketiga.',
    tanda: 'reclaim nominal TAPI badan <= 0.4 ATR + LH mikro (close terakhir <= sebelumnya) + volume kering + menempel level',
    horizon: cgHorizonFake, opts: () => ({}), up: 6, dn: 6,
  },
  {
    id: 'cg-cont-vacuum', label: 'Gauntlet Vakum: Tren Melanjuutkan Sapuan', post: 'CONTINUATION', postGen: 'VACUUM',
    ilmu: 'Base miring mengikuti tren; gauntlet terjadi, sapuan final TANPA reclaim — vakum likuiditas: sapuan di bawah HL/atas LH menjadi bahan bakar kelanjutan tren.',
    jebakan: 'Pro men-short "HL patah" / men-buy "LH patah" — di tren kuat sapuan tanpa reclaim adalah launchpad, bukan patah.',
    tanda: 'sapuan TANPA reclaim + mom50 >= 1.2 ATR searah tren + tanpa kepanikan',
    horizon: cgHorizonVacuum, opts: () => ({ tilt: 0.35 }), up: 6, dn: 6,
  },
  {
    id: 'cg-wait-double', label: 'Gauntlet Sapuan Dwi-Lapis: Ujian Kesabaran', post: 'DOUBLE-SWEEP', postGen: 'DOUBLE',
    ilmu: 'Setelah sapuan pertama, pantulan rapuh (badan kering naik pelan) menggoda entry dini — lalu SAPUAN KEDUA lebih dalam mengambil stop-stop itu, BARU reclaim klimaks dan rally sejati.',
    jebakan: 'Pemburu "sweep + reclaim" masuk terlalu cepat dan DILIKUIDASI stop sempit; hanya yang menunggu konfirmasi reclaim di ATAS pantulan yang selamat dan profit.',
    tanda: 'pantulan pasca-sapu kering (badan <= 0.4 ATR, vol < 0.7x) + dua sisi pool + struktur belum aman -> WAIT dgn trigger reclaim',
    horizon: cgHorizonDouble, opts: () => ({}), up: 7, dn: 7,
  },
]

interface Slot { fam: CgFamDef; dir: CgArah }

const SLOTS: Slot[] = CG_FAMILIES.flatMap((fam) => {
  const out: Slot[] = []
  const n = Math.max(fam.up, fam.dn)
  for (let i = 0; i < n; i++) {
    if (i < fam.up) out.push({ fam, dir: 'NAIK' })
    if (i < fam.dn) out.push({ fam, dir: 'TURUN' })
  }
  return out
})

function atrVis(cs: Candle[]): number {
  const trs: number[] = []
  for (let i = Math.max(1, cs.length - 14); i < cs.length; i++) {
    const p = cs[i - 1]
    const c = cs[i]
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)))
  }
  return trs.reduce((a, b) => a + b, 0) / Math.max(1, trs.length)
}

interface ForgeOut {
  candles: Candle[]
  entry: number
  exit: number
  extreme: number
  pl: number
  aspek: AspekTruth
  movePct: number
  mfePct: number
  baitMfePct: number
  dipOk: boolean
  extraOk: boolean
  score: number
  truth: CgArah
}

function forgeOnce(seed: string, fam: CgFamDef, gDir: CgArah, diff: string): ForgeOut {
  const r = makeRng(seed)
  const u = 0.5
  const pen = new Pen(100, u)
  const g = genGauntlet(pen, r, u, DIFF_CFG[diff], { dir: gDir, post: fam.postGen, ...fam.opts(gDir) })
  // keluarga FAKE: jebakan = reclaim/penolakan LEMAH yang gagal -> truth = KEBALIKAN arah gauntlet
  const dir: CgArah = fam.postGen === 'FAKE' ? (gDir === 'NAIK' ? 'TURUN' : 'NAIK') : gDir
  fam.horizon(pen, r, u, DIFF_CFG[diff], dir)
  const cs = pen.candles
  let pl = g.pl
  let extreme = g.extreme
  if (fam.opts(gDir).round) {
    const tgt = Math.round(pl)
    const f = tgt / pl
    for (const c of cs) { c.o *= f; c.h *= f; c.l *= f; c.c *= f }
    pl = tgt
    const gC = cs.slice(g.aspek.stopHunt.dari)
    extreme = dir === 'NAIK' ? Math.min(...gC.map((c) => c.l)) : Math.max(...gC.map((c) => c.h))
  }
  const entry = cs[CG_VISIBLE - 1].c
  const horizon = cs.slice(CG_VISIBLE)
  const exit = cs[CG_TOTAL - 1].c
  const s = dir === 'NAIK' ? 1 : -1
  const movePct = s * (exit / entry - 1) * 100
  const maxHi = Math.max(...horizon.map((c) => c.h))
  const minLo = Math.min(...horizon.map((c) => c.l))
  const mfePct = dir === 'NAIK' ? (maxHi / entry - 1) * 100 : (1 - minLo / entry) * 100
  const baitMfePct = dir === 'NAIK' ? (1 - minLo / entry) * 100 : (maxHi / entry - 1) * 100
  const atr = Math.max(atrVis(cs.slice(0, CG_VISIBLE)), 1e-9)
  // dip-guard: dip horizon tidak menembus stop struktural (ekstrem - 0.7 ATR)
  const dipOk = dir === 'NAIK' ? minLo > extreme - 0.7 * atr : maxHi < extreme + 0.7 * atr
  let extraOk = true
  if (fam.postGen === 'DOUBLE') {
    const first3 = horizon.slice(0, 3)
    const deep = dir === 'NAIK' ? Math.min(...first3.map((c) => c.l)) : Math.max(...first3.map((c) => c.h))
    extraOk = dir === 'NAIK' ? deep <= extreme - 1.1 * atr : deep >= extreme + 1.1 * atr
    const trig = Math.max(pl + s * 0.8 * atr, entry + s * 0.25 * atr)
    let fireIdx = -1
    for (let i = 0; i < Math.min(8, horizon.length); i++) {
      const c = horizon[i].c
      if (dir === 'NAIK' ? c >= trig : c <= trig) { fireIdx = i; break }
    }
    if (fireIdx < 0) extraOk = false
    else {
      const entryT = horizon[fireIdx].c
      const rest = horizon.slice(fireIdx + 1)
      const far = dir === 'NAIK' ? Math.max(...rest.map((c) => c.c)) : Math.min(...rest.map((c) => c.c))
      extraOk = extraOk && (dir === 'NAIK' ? far >= entryT * 1.026 : far <= entryT * 0.974)
    }
  }
  if (fam.postGen === 'FAKE' || fam.postGen === 'VACUUM') {
    extraOk = baitMfePct <= 1.3
    if (fam.postGen === 'VACUUM') {
      const mom50 = (cs[CG_VISIBLE - 1].c - cs[CG_VISIBLE - 51].c) / atr
      extraOk = extraOk && (dir === 'NAIK' ? mom50 >= 1.2 : mom50 <= -1.2)
    }
  }
  const score = Math.min(movePct, mfePct) - (dipOk ? 0 : 3) - (extraOk ? 0 : 3) - (fam.postGen === 'FAKE' || fam.postGen === 'VACUUM' ? Math.max(0, baitMfePct - 1.3) * 4 : 0)
  return { candles: cs, entry, exit, extreme, pl, aspek: g.aspek, movePct, mfePct, baitMfePct, dipOk, extraOk, score, truth: dir }
}

function forgeWithGate(ns: string, fam: CgFamDef, dir: CgArah, diff: string): ForgeOut & { seed: string } {
  let best: (ForgeOut & { seed: string }) | null = null
  for (let attempt = 0; attempt < 16; attempt++) {
    const seed = `${ns}::${fam.id}::${dir}::${attempt}`
    let out: ForgeOut
    try {
      out = forgeOnce(seed, fam, dir, diff)
    } catch {
      continue
    }
    const gateOk =
      fam.postGen === 'REVERSAL' || fam.postGen === 'CASCADE'
        ? out.movePct >= 2.6 && out.mfePct >= 3.0 && out.dipOk
        : fam.postGen === 'DOUBLE'
          ? out.movePct >= 2.8 && out.mfePct >= 3.2 && out.dipOk && out.extraOk
          : out.movePct >= 2.4 && out.mfePct >= 2.8 && out.extraOk
    if (!best || out.score > best.score) best = { ...out, seed }
    if (gateOk) return { ...out, seed }
  }
  if (!best) throw new Error(`forge gagal total: ${fam.id} ${dir} ${diff}`)
  return best
}

export function forgeCgExam(num: number, ns = 'cg100'): CgExam {
  const slot = SLOTS[(num - 1) % SLOTS.length]
  const fam = slot.fam
  const diff = CG_DIFF_CYCLE[(num - 1) % CG_DIFF_CYCLE.length]
  const out = forgeWithGate(ns, fam, slot.dir, diff)
  const truth = out.truth
  return {
    num,
    fam: fam.id,
    label: fam.label,
    diff,
    seed: out.seed,
    truth,
    bait: truth === 'NAIK' ? 'TURUN' : 'NAIK',
    post: fam.post,
    aspek: out.aspek,
    candles: out.candles,
    entry: out.entry,
    exit: out.exit,
    extreme: out.extreme,
    movePct: out.movePct,
    mfePct: out.mfePct,
    baitMfePct: out.baitMfePct,
    noiseFlipped: (fam.postGen === 'REVERSAL' || fam.postGen === 'CASCADE'
      ? !(out.movePct >= 2.6 && out.mfePct >= 3.0 && out.dipOk)
      : fam.postGen === 'DOUBLE'
        ? !(out.movePct >= 2.8 && out.mfePct >= 3.2 && out.dipOk && out.extraOk)
        : !(out.movePct >= 2.4 && out.mfePct >= 2.8 && out.extraOk)),
  }
}

export function forgeCgSuite(ns = 'cg100'): CgExam[] {
  return Array.from({ length: CG_SIZE }, (_, i) => forgeCgExam(i + 1, ns))
}
