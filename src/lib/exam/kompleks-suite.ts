// ============================================================
// PERAKIT SUITE UJIAN KOMPLEKS 5 ASPEK — 100 ujian, SETIAP ujian
// memuat KELIMA aspek sekaligus: stop hunt/liquidity grab + false
// breakout + pump & dump + bear trap + bull trap (+ lilin menipu).
// Gerbang profit dari DATA (truth dari data, retry berbibit):
//   REVERSAL/CASCADE/PUMPW2 : move >= 2.6% & MFE >= 3.0% & dip-guard
//                             (dip horizon tak menembus stop
//                             struktural ekstrem - 0.7 ATR)
//   FAKE/ABSORB             : move >= 2.4% & MFE >= 2.8% & bait-MFE
//                             <= 1.3% (umpan MUSTAHIL profit net)
//   DOUBLE                  : sapuan kedua LEBIH DALAM (<= ekstrem
//                             - 1.1 ATR) + trigger menyala + sampai
//                             target + move >= 2.8% & MFE >= 3.2%
// ============================================================

import { makeRng } from './rng'
import type { Candle } from './generator'
import { Pen, type BtRng, type DiffCfg } from './bulltrap-forge'
import {
  KL_VISIBLE, KL_TOTAL, KL_SIZE,
  type KlArah, type KlExam, type AspekTruth5, type KlPost,
} from './kompleks-forge'

/** re-ekspor utk konsumen UI (arah-panel) — tipe bukti kompleks */
export type { KlExam, KlArah, AspekTruth5, KlPost }
import {
  genKompleks, klHorizonRev, klHorizonFake, klHorizonDouble, klHorizonCascade, klHorizonPumpw2, klHorizonAbsorb,
  type KlGenOpts,
} from './kompleks-gens'

export const KL_DIFF_CYCLE = ['MUDAH', 'SEDANG', 'BRUTAL', 'GILA', 'SEDANG', 'BRUTAL', 'MUDAH', 'GILA', 'BRUTAL', 'SEDANG'] as const

const DIFF_CFG: Record<string, DiffCfg> = {
  MUDAH: { noise: 0.55, subtle: 1.15, conviction: 0 },
  SEDANG: { noise: 1.0, subtle: 1.0, conviction: 0 },
  BRUTAL: { noise: 1.5, subtle: 0.88, conviction: 1 },
  GILA: { noise: 2.1, subtle: 0.78, conviction: 2 },
}

export interface KlFamDef {
  id: string
  label: string
  post: KlPost
  ilmu: string // interaksi 5 aspek
  jebakan: string // siapa yang dilikuidasi di fase mana
  tanda: string // tanda tangan point-in-time candle 60
  opts: (dir: KlArah) => Omit<KlGenOpts, 'dir' | 'post'>
  horizon: (pen: Pen, r: BtRng, u: number, cfg: DiffCfg, dir: KlArah) => void
}

export const KL_FAMILIES: KlFamDef[] = [
  {
    id: 'kl-rev-strong', label: 'Kompleks Klasik: Pump-Dump-Sweep-Reclaim', post: 'REVERSAL',
    ilmu: 'Bull trap menabung likuiditas atas, bear trap melahirkan pool rantai, pump markup menciptakan korban FOMO, false breakout di puncak pump menampung pembeli terakhir, dump mengubah mereka jadi stop-loss cluster, stop hunt final memanen semuanya lalu reclaim dominan — kelima aspek satu rangkaian.',
    jebakan: 'Breakout-buyer (bull trap), breakdown-seller (bear trap), FOMO pump (mid), chase puncak (false breakout), dip-buyer dump, dan short pasca-sweep — enam generasi korban dalam satu chart.',
    tanda: 'jejak pump mid-window (vol menaik + akselerasi) + false breakout puncak dicabut + dump + pool rantai disapu <= 1-2 candle + badan reclaim >= 0.55 ATR',
    opts: () => ({}), horizon: klHorizonRev,
  },
  {
    id: 'kl-rev-cascade', label: 'Kompleks Kaskade: Likuidasi Berantai lalu V', post: 'CASCADE',
    ilmu: 'Gauntlet penuh + pump-dump-false-breakout, lalu kaskade panik menembus pool rantai — mesin likuidasi kehabisan bahan bakar — reclaim V raksasa pada lilin klimaks.',
    jebakan: 'Pro short momentum kaskade pasca-dump dengan leverage; kaskade adalah mesin panen stop — V-reversal melikuidasi mereka sekaligus.',
    tanda: 'kaskade merah besar + volZ klimaks + crossBack pada candle keputusan + kedalaman >= 0.8 ATR',
    opts: () => ({}), horizon: klHorizonCascade,
  },
  {
    id: 'kl-rev-round', label: 'Kompleks Angka Bulat: Pool Psikologis', post: 'REVERSAL',
    ilmu: 'Seluruh rangkaian terjadi di sekitar angka psikologis; stop cluster menumpuk di bawahnya; pump & false breakout menampung korban di atas angka; stop hunt final menusuk angka bulat lalu reclaim.',
    jebakan: 'Stop 1-2 tick di bawah angka bulat — market maker melihat tumpukan itu; sapuan angka bulat = panen massal korban pump + holder.',
    tanda: 'pool rantai TEPAT di level integer + sapuan menembus angka + reclaim badan dominan',
    opts: () => ({ round: true }), horizon: klHorizonRev,
  },
  {
    id: 'kl-rev-wick', label: 'Kompleks Klaster Wick: Ekor yang Menipu', post: 'REVERSAL',
    ilmu: 'Base dihiasi klaster wick panjang di tepi — setiap ekor adalah stop baru; pump-false-breakout-dump menumpuk korban kedua; stop hunt final menembus SEMUA ekor sekaligus lalu reclaim.',
    jebakan: '"Support terbukti berkali-kali" — pro menumpuk posisi di klaster; sapuan final mengambil semuanya, termasuk stop korban pump.',
    tanda: 'klaster wick >= 2 di tepi + sapuan di bawah seluruh ekor + reclaim dominan',
    opts: () => ({ wickCluster: true }), horizon: klHorizonRev,
  },
  {
    id: 'kl-rev-range', label: 'Kompleks Tepi Range Lebar', post: 'REVERSAL',
    ilmu: 'Range lebar (bounce antar tepi >= 2.6 ATR): trap-trap lahir di tepi, pump-false-breakout-dump menempatkan korban di puncak, pool rantai di tepi disapu lalu ditolak ke arah lawan.',
    jebakan: 'Pro menjual "range broken" / membeli "breakout pump" — tepi range adalah bank likuiditas; sapuan = panen dua generasi korban.',
    tanda: 'band lebar + sapuan tepi + reclaim ke dalam range',
    opts: () => ({ wide: true }), horizon: klHorizonRev,
  },
  {
    id: 'kl-cont-fake', label: 'Kompleks Reclaim Palsu: Umpan Terakhir', post: 'FAKE',
    ilmu: 'Setelah pump-dump-false-breakout-gauntlet, sapuan final ditutup SEDIKIT di atas pool lalu GAGAL extend (LH mikro, volume kering) — reclaim tanpa pengikut adalah umpan terakhir sebelum lanjutan turun; pump ganda itu ternyata distribusi.',
    jebakan: 'Paling licik: penunggu-konfirmasi membeli reclaim; pro yang selamat dari bull trap, bear trap, dan dump jatuh di umpan terakhir.',
    tanda: 'reclaim nominal TAPI badan kecil + LH mikro (close terakhir turun) + volume kering + menempel level',
    opts: () => ({}), horizon: klHorizonFake,
  },
  {
    id: 'kl-wait-double', label: 'Kompleks Sapuan Dwi-Lapis: Ujian Kesabaran', post: 'DOUBLE',
    ilmu: 'Setelah pump-dump-sapuan pertama, pantulan rapuh (badan kering) menggoda entry dini — lalu SAPUAN KEDUA lebih dalam mengambil stop-stop itu, BARU reclaim klimaks dan rally sejati; kelima aspek terjadi dua putaran.',
    jebakan: 'Pemburu "sweep + reclaim" masuk terlalu cepat dan DILIKUIDASI stop sempit; hanya yang menunggu konfirmasi reclaim di ATAS pantulan yang selamat.',
    tanda: 'pantulan pasca-sapu kering (badan <= 0.4 ATR, vol < 0.7x) + dua sisi pool + struktur belum aman -> WAIT dgn trigger reclaim',
    opts: () => ({}), horizon: klHorizonDouble,
  },
  {
    id: 'kl-rev-pumpw2', label: 'Kompleks Gelombang Kedua: Pump Belum Selesai', post: 'PUMPW2',
    ilmu: 'Pump-dump-false-breakout tampak seperti siklus selesai, sapuan final menyapu pool — TAPI pompa isi ulang: engulf bervolume + gelombang kedua dari higher-low; dump pertama hanyalah koreksi markup.',
    jebakan: '"Pump selesai, waktunya dump" — shorting pasca-sweep melikuidasi saat gelombang kedua menyala; membedakan distribusi vs koreksi-markup adalah inti P&D.',
    tanda: 'sapuan reclaim + engulf bervolume + struktur HL dari pump + vol dorongan menaik',
    opts: () => ({}), horizon: klHorizonPumpw2,
  },
  {
    id: 'kl-cont-absorb', label: 'Kompleks Absorpsi Puncak: Bounce yang Dijual', post: 'ABSORB',
    ilmu: 'Pasca-sapuan, bounce kering naik ke zona absorpsi di bawah puncak pump — setiap pembeli "reversal" ditampung penjual besar (serahan diam-diam) — lalu engulF besar membuka markdown kedua.',
    jebakan: 'Bounce tanpa volume terbaca "pulih"; padahal volume besar tanpa progres = distribusi — pemegang memakai bounce untuk lepas, pembeli baru ditawan.',
    tanda: 'bounce kering (vol < 0.65x, badan kecil) menuju zona puncak + engulF besar + tanpa reclaim struktur',
    opts: () => ({}), horizon: klHorizonAbsorb,
  },
  {
    id: 'kl-rev-deepdump', label: 'Kompleks Dump Dalam: Lantai yang Hilang', post: 'REVERSAL',
    ilmu: 'Dump pasca-false-breakout lebih dalam (dua gelombang jual) — korban pump dilikuidasi dua kali — pool rantai disapu terlalu dalam, lalu reclaim dominan; kejatuhan dalam = bahan bakar V.',
    jebakan: 'Dip-buyer pertama dilikuidasi; dip-buyer kedua "sudah murah sekali" ikut ditawan; hanya reclaim dominan yang menandai dasar sejati.',
    tanda: 'dua gelombang dump + sapuan dalam + reclaim badan dominan + vol klimaks',
    opts: () => ({ deepDump: true }), horizon: klHorizonRev,
  },
]

interface Slot { fam: KlFamDef; dir: KlArah }

const SLOTS: Slot[] = KL_FAMILIES.flatMap((fam) => {
  const out: Slot[] = []
  for (let i = 0; i < 10; i++) out.push({ fam, dir: i < 5 ? 'NAIK' : 'TURUN' })
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
  puncakPump: number
  lvlFbo: number
  aspek: AspekTruth5
  movePct: number
  mfePct: number
  baitMfePct: number
  dipOk: boolean
  extraOk: boolean
  score: number
  truth: KlArah
}

function forgeOnce(seed: string, fam: KlFamDef, gDir: KlArah, diff: string): ForgeOut {
  const r = makeRng(seed)
  const u = 0.5
  const pen = new Pen(100, u)
  const postGen = fam.post
  const g = genKompleks(pen, r, u, DIFF_CFG[diff], { dir: gDir, post: postGen, ...fam.opts(gDir) })
  // FAKE & ABSORB: gauntlet/pump arah gDir TERNYATA distribusi — truth = kebalikannya
  const dir: KlArah = (postGen === 'FAKE' || postGen === 'ABSORB') ? (gDir === 'NAIK' ? 'TURUN' : 'NAIK') : gDir
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
  const entry = cs[KL_VISIBLE - 1].c
  const horizon = cs.slice(KL_VISIBLE)
  const exit = cs[KL_TOTAL - 1].c
  const s = dir === 'NAIK' ? 1 : -1
  const movePct = s * (exit / entry - 1) * 100
  const maxHi = Math.max(...horizon.map((c) => c.h))
  const minLo = Math.min(...horizon.map((c) => c.l))
  const mfePct = dir === 'NAIK' ? (maxHi / entry - 1) * 100 : (1 - minLo / entry) * 100
  const baitMfePct = dir === 'NAIK' ? (1 - minLo / entry) * 100 : (maxHi / entry - 1) * 100
  const atr = Math.max(atrVis(cs.slice(0, KL_VISIBLE)), 1e-9)
  // dip-guard: dip horizon tidak menembus stop struktural (ekstrem - 0.7 ATR)
  const dipOk = dir === 'NAIK' ? minLo > extreme - 0.7 * atr : maxHi < extreme + 0.7 * atr
  let extraOk = true
  if (postGen === 'DOUBLE') {
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
  const score = Math.min(movePct, mfePct) - (dipOk ? 0 : 3) - (extraOk ? 0 : 3) -
    ((postGen === 'FAKE' || postGen === 'ABSORB') ? Math.max(0, baitMfePct - 1.3) * 4 : 0)
  return { candles: cs, entry, exit, extreme, pl, puncakPump: g.puncakPump * (fam.opts(gDir).round ? (Math.round(g.pl) / g.pl) : 1), lvlFbo: g.lvlFbo * (fam.opts(gDir).round ? (Math.round(g.pl) / g.pl) : 1), aspek: g.aspek, movePct, mfePct, baitMfePct, dipOk, extraOk, score, truth: dir }
}

function forgeWithGate(ns: string, fam: KlFamDef, dir: KlArah, diff: string): ForgeOut & { seed: string } {
  let best: (ForgeOut & { seed: string }) | null = null
  for (let attempt = 0; attempt < 20; attempt++) {
    const seed = `${ns}::${fam.id}::${dir}::${attempt}`
    let out: ForgeOut
    try {
      out = forgeOnce(seed, fam, dir, diff)
    } catch {
      continue
    }
    const gateOk =
      fam.post === 'FAKE' || fam.post === 'ABSORB'
        ? out.movePct >= 2.4 && out.mfePct >= 2.8 && out.extraOk && out.baitMfePct <= 1.3
        : fam.post === 'DOUBLE'
          ? out.movePct >= 2.8 && out.mfePct >= 3.2 && out.extraOk // sapuan kedua MEMANG dirancang menembus ekstrem pertama (tanpa dipOk)
          : out.movePct >= 2.6 && out.mfePct >= 3.0 && out.dipOk
    if (!best || out.score > best.score) best = { ...out, seed }
    if (gateOk) return { ...out, seed }
  }
  if (!best) throw new Error(`forge gagal total: ${fam.id} ${dir} ${diff}`)
  return best
}

export function forgeKlExam(num: number, ns = 'kl100'): KlExam {
  const slot = SLOTS[(num - 1) % SLOTS.length]
  const fam = slot.fam
  const diff = KL_DIFF_CYCLE[(num - 1) % KL_DIFF_CYCLE.length]
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
    puncakPump: out.puncakPump,
    lvlFbo: out.lvlFbo,
    pl: out.pl,
    movePct: out.movePct,
    mfePct: out.mfePct,
    baitMfePct: out.baitMfePct,
    noiseFlipped: (fam.post === 'FAKE' || fam.post === 'ABSORB'
      ? !(out.movePct >= 2.4 && out.mfePct >= 2.8 && out.extraOk && out.baitMfePct <= 1.3)
      : fam.post === 'DOUBLE'
        ? !(out.movePct >= 2.8 && out.mfePct >= 3.2 && out.extraOk)
        : !(out.movePct >= 2.6 && out.mfePct >= 3.0 && out.dipOk)),
  }
}

export function forgeKlSuite(ns = 'kl100'): KlExam[] {
  return Array.from({ length: KL_SIZE }, (_, i) => forgeKlExam(i + 1, ns))
}
