// ============================================================
// V276 MESIN-CUAN — BUKU BESAR KEUNTUNGAN dari rencana pra-registrasi.
//
// Mandat pemilik: "belum berkembang sebagai mesin cuan profit pasti,
// masih banyak keteledoran."
//
// DIAGNOSIS JUJUR: rencana tempur (entry/stop/target terkunci pra-registrasi,
// V250) selama ini TIDAK PERNAH DINILAI NYATA — arena hanya menilai arah
// close-to-close. Mesin cuan tanpa buku besar = mesin yang tak pernah
// menghitung uangnya. Maka:
//   (1) SETIAP rencana pra-registrasi dinilai dengan candle hari-D sungguhan:
//       sasaran kena → MENANG; stop kena → KALAH; keduanya kena di satu
//       candle → KALAH dulu (konservatif jujur); tidak keduanya → KEDALUWARSA
//       (keluar di close, tetap kena fee);
//   (2) KETELEDORAN DIHITUNG: setiap kerugian dicatat, dikelompokkan per
//       rezim, dan ditulis jadi PELAJARAN di ingatan — keteledoran yang tak
//       dihitung adalah keteledoran yang berulang;
//   (3) DISIPLIN OTOMATIS: ekspektansi R negatif pada ≥8 rencana → keyakinan
//       pick hari hidup dipangkas 5 poin 3 hari (aku menghukum kemahalanku);
//   (4) KEJUJURAN DITEGAKKAN: profit PASTI tidak ada di pasar — yang ada:
//       ekspektansi positif yang dijaga, risiko terkunci per rencana, dan
//       angka nyata after-fee yang tak bisa dipoles.
//
// Matematika (identik WARISAN): fee 0.2%/sisi → 0.4% per putaran.
//   netPct   = (sisi × (keluar − entry) / entry) × 100 − 0.4
//   riskPct  = |(sisi × (stop − entry) / entry) × 100| + 0.4
//   R        = netPct / riskPct
// Equity = majemuk berurutan per rencana (model satu-unit per rencana —
// bukan simulasi ukuran nyata; dinyatakan jujur di kejujuran).
// ============================================================

import { db } from '@/lib/db'
import { Candle, addDays, candleForDay } from './market'
import { lessonFingerprint } from './brain'
import { remember } from './memory'

/** fee per putaran (buka + tutup) dalam persen — identik WARISAN.FEE_PCT × 2. */
export const FEE_PUTARAN_PCT = 0.4

export type CuanStatus = 'MENANG' | 'KALAH' | 'KEDALUWARSA'
export type CuanVia = 'SASARAN' | 'STOP' | 'TUTUP'

export interface RencanaCuan {
  entry: number
  stop: number | null
  target: number | null
}

export interface CuanEntry {
  day: string
  symbol: string
  arah: 'BUY' | 'SELL'
  status: CuanStatus
  via: CuanVia
  entry: number
  target: number | null
  stop: number | null
  /** Hasil bersih after-fee dalam persen — angka mesin cuan, bukan harapan. */
  netPct: number
  /** R-multiple: berapa kali lipat risiko yang dihasilkan (null bila stop null). */
  r: number | null
  keyakinan: number
  regime: string
}

/** Resolusi satu rencana terhadap SATU candle hari-D (horizon 1 hari). */
export function resolveRencana(
  arah: 'BUY' | 'SELL',
  rencana: RencanaCuan,
  candleD: Candle,
): { status: CuanStatus; via: CuanVia; netPct: number; r: number | null } | null {
  const entry = rencana.entry
  if (!Number.isFinite(entry) || entry <= 0) return null
  const sisi = arah === 'BUY' ? 1 : -1
  const netDari = (keluar: number) => (sisi * (keluar - entry)) / entry * 100 - FEE_PUTARAN_PCT

  // stop null = rencana cacat — kuhitung dari close saja (jujur tetap after-fee)
  if (rencana.stop === null) {
    const netPct = +netDari(candleD.close).toFixed(2)
    return { status: 'KEDALUWARSA', via: 'TUTUP', netPct, r: null }
  }

  const kenaStop = arah === 'BUY' ? candleD.low <= rencana.stop : candleD.high >= rencana.stop
  const kenaTarget = rencana.target !== null && (arah === 'BUY'
    ? candleD.high >= rencana.target
    : candleD.low <= rencana.target)

  // KONSERVATIF JUJUR: satu candle menyentuh dua-duanya → stop dianggap lebih dulu.
  // (intra-candle urutan tak terlihat dari candle harian — meragukan = pilih luka kecil)
  let status: CuanStatus, via: CuanVia, keluar: number
  if (kenaStop) { status = 'KALAH'; via = 'STOP'; keluar = rencana.stop }
  else if (kenaTarget && rencana.target !== null) { status = 'MENANG'; via = 'SASARAN'; keluar = rencana.target }
  else { status = 'KEDALUWARSA'; via = 'TUTUP'; keluar = candleD.close }

  const netPct = +netDari(keluar).toFixed(2)
  const riskPct = Math.abs(((sisi * (rencana.stop - entry)) / entry) * 100) + FEE_PUTARAN_PCT
  const r = riskPct > 0 ? +(netPct / riskPct).toFixed(3) : null
  return { status, via, netPct, r }
}

export interface CuanMetrik {
  totalPlan: number
  menang: number
  kalah: number
  kedaluwarsa: number
  /** netPct > 0 dianggap untung — termasuk kedaluwarsa yang ditutup untung. */
  winRate: number | null
  /** Rata-rata hasil per rencana (persen, after-fee) — ekspektansi sistem. */
  ekspektansiPct: number | null
  ekspektansiR: number | null
  /** Majemuk berurutan (model satu-unit) dalam persen. */
  netKumulatifPct: number
  maxDrawdownPct: number
  /** Runtunan aktif: "M2" = menang 2 terakhir, "K1" = kalah 1 terakhir. */
  streak: string
  terbaik: { symbol: string; day: string; netPct: number } | null
  terburuk: { symbol: string; day: string; netPct: number } | null
  /** Rezim paling memakan keteledoran — urut kalah terbanyak dulu. */
  perRegime: { regime: string; n: number; kalah: number; eksPct: number }[]
  disiplinAktif: boolean
  disiplinSampai: string | null
}

export interface BukuCuan {
  hari: string
  at: string
  entri: CuanEntry[]
  berlangsung: {
    symbol: string; arah: 'BUY' | 'SELL'; entry: number
    targetPct: number | null; stopPct: number | null
    pTarget: number | null; pStop: number | null
    netUntungPct: number | null; keyakinan: number
  }[]
  metrik: CuanMetrik
  kejujuran: string
}

const KEJUJURAN =
  'Profit PASTI tidak ada di pasar — yang mengaku pasti sedang berbohong. Yang bisa dijamin mesin ini: ' +
  'setiap rencana dinilai nyata candle hari-D after-fee 0.4%, keteledoran dihitung & jadi pelajaran, ' +
  'ekspektansi negatif memangkas ukuranku sendiri. Equity = majemuk satu-unit per rencana (model, bukan simulasi ukuran nyata).'

function metrikDari(entri: CuanEntry[], disiplinAktif: boolean, disiplinSampai: string | null): CuanMetrik {
  const total = entri.length
  const menang = entri.filter((e) => e.status === 'MENANG').length
  const kalah = entri.filter((e) => e.status === 'KALAH').length
  const kedaluwarsa = total - menang - kalah
  const untung = entri.filter((e) => e.netPct > 0).length
  const eksPct = total > 0 ? entri.reduce((s, e) => s + e.netPct, 0) / total : null
  const berR = entri.filter((e) => e.r !== null)
  const eksR = berR.length > 0 ? berR.reduce((s, e) => s + (e.r as number), 0) / berR.length : null

  // equity majemuk berurutan + max drawdown
  let eq = 1, puncak = 1, maxDD = 0
  for (const e of entri) {
    eq *= 1 + e.netPct / 100
    if (eq > puncak) puncak = eq
    const dd = (puncak - eq) / puncak * 100
    if (dd > maxDD) maxDD = dd
  }

  // streak aktif (dari akhir daftar — entri terurut hari)
  let streak = '-'
  if (total > 0) {
    const untungTerakhir = entri[total - 1].netPct > 0
    let n = 0
    for (let i = total - 1; i >= 0; i--) {
      if ((entri[i].netPct > 0) === untungTerakhir) n++
      else break
    }
    streak = (untungTerakhir ? 'M' : 'K') + n
  }

  const terbaik = total ? entri.reduce((a, b) => (b.netPct > a.netPct ? b : a)) : null
  const terburuk = total ? entri.reduce((a, b) => (b.netPct < a.netPct ? b : a)) : null

  const agg = new Map<string, { n: number; kalah: number; jumlah: number }>()
  for (const e of entri) {
    const cur = agg.get(e.regime) ?? { n: 0, kalah: 0, jumlah: 0 }
    cur.n++
    if (e.netPct < 0) cur.kalah++
    cur.jumlah += e.netPct
    agg.set(e.regime, cur)
  }
  const perRegime = [...agg.entries()]
    .map(([regime, v]) => ({ regime, n: v.n, kalah: v.kalah, eksPct: +(v.jumlah / v.n).toFixed(2) }))
    .sort((a, b) => b.kalah - a.kalah || a.eksPct - b.eksPct)

  return {
    totalPlan: total, menang, kalah, kedaluwarsa,
    winRate: total > 0 ? +(untung / total).toFixed(3) : null,
    ekspektansiPct: eksPct === null ? null : +eksPct.toFixed(2),
    ekspektansiR: eksR === null ? null : +eksR.toFixed(3),
    netKumulatifPct: +((eq - 1) * 100).toFixed(2),
    maxDrawdownPct: +maxDD.toFixed(2),
    streak,
    terbaik: terbaik ? { symbol: terbaik.symbol, day: terbaik.day, netPct: terbaik.netPct } : null,
    terburuk: terburuk ? { symbol: terburuk.symbol, day: terburuk.day, netPct: terburuk.netPct } : null,
    perRegime,
    disiplinAktif, disiplinSampai,
  }
}

function safeJson(s: string | null): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) as Record<string, unknown> } catch { return {} }
}

async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.findUnique({ where: { key } })
  return row?.value ?? null
}
async function setMeta(key: string, value: string) {
  await db.meta.upsert({ where: { key }, update: { value }, create: { key, value } })
}

/**
 * Denyut MESIN-CUAN — dipanggil runArena tiap denyut SETELAH hari-hari
 * dinilai. Idempoten: buku besar direkonstruksi penuh dari candle (determinis);
 * arenaEvent & PELAJARAN hanya untuk resolusi BARU (bukan bootstrap pertama).
 */
export async function cuanPulse(today: string, klines: Map<string, Candle[]>): Promise<void> {
  const prevRaw = await getMeta('bukuCuan')
  let prevKeys: Set<string> | null = null
  if (prevRaw) {
    try {
      const prev = JSON.parse(prevRaw) as { entri?: CuanEntry[] }
      prevKeys = new Set((prev.entri ?? []).map((e) => `${e.day}|${e.symbol}`))
    } catch { prevKeys = null }
  }

  const days = await db.battleDay.findMany({
    where: { status: 'SCORED', day: { lt: today } },
    orderBy: { day: 'asc' },
    include: { picks: true },
  })

  const entri: CuanEntry[] = []
  for (const d of days) {
    for (const p of d.picks.filter((x) => x.competitor === 'MICAPROFITA')) {
      const ev = safeJson(p.evidence) as { rencana?: RencanaCuan & { targetPct?: number | null } }
      const r = ev.rencana
      if (!r || !Number.isFinite(r.entry)) continue // tanpa rencana = tak masuk buku (jujur; rekor arah ada di standings)
      const candleD = candleForDay(klines.get(p.symbol) ?? [], d.day)
      if (!candleD) continue
      const res = resolveRencana(p.direction as 'BUY' | 'SELL', { entry: r.entry, stop: r.stop, target: r.target }, candleD)
      if (!res) continue
      entri.push({
        day: d.day, symbol: p.symbol, arah: p.direction as 'BUY' | 'SELL',
        status: res.status, via: res.via, entry: r.entry,
        target: r.target ?? null, stop: r.stop ?? null,
        netPct: res.netPct, r: res.r,
        keyakinan: Math.round(p.confidence), regime: d.regime,
      })
    }
  }
  entri.sort((a, b) => a.day.localeCompare(b.day) || a.symbol.localeCompare(b.symbol))

  // posisi berlangsung hari hidup (belum dinilai — tampil, tak dihitung)
  const todayRow = await db.battleDay.findUnique({ where: { day: today }, include: { picks: true } })
  const berlangsung: BukuCuan['berlangsung'] = []
  for (const p of (todayRow?.picks ?? []).filter((x) => x.competitor === 'MICAPROFITA')) {
    const ev = safeJson(p.evidence) as {
      rencana?: { entry?: number; targetPct?: number | null; stopPct?: number | null; netUntungPct?: number | null }
      warisan?: { mc?: { pTarget?: number | null; pStop?: number | null } }
    }
    const r = ev.rencana
    if (!r || !Number.isFinite(r.entry as number)) continue
    berlangsung.push({
      symbol: p.symbol, arah: p.direction as 'BUY' | 'SELL', entry: r.entry as number,
      targetPct: r.targetPct ?? null, stopPct: r.stopPct ?? null,
      pTarget: ev.warisan?.mc?.pTarget ?? null, pStop: ev.warisan?.mc?.pStop ?? null,
      netUntungPct: r.netUntungPct ?? null,
      keyakinan: Math.round(p.confidence),
    })
  }

  // DISIPLIN CUAN — ekspektansi R negatif ≥8 rencana → pangkas keyakinan 3 hari
  const metrikAwal = metrikDari(entri, false, null)
  let disiplinAktif = false, disiplinSampai: string | null = null
  const sudahSampai = await getMeta('cuanDisiplinUntil')
  if (sudahSampai && sudahSampai >= today) { disiplinAktif = true; disiplinSampai = sudahSampai }
  if (metrikAwal.totalPlan >= 8 && metrikAwal.ekspektansiR !== null && metrikAwal.ekspektansiR < 0 && !disiplinAktif) {
    disiplinSampai = addDays(today, 3)
    disiplinAktif = true
    await setMeta('cuanDisiplinUntil', disiplinSampai)
    await db.arenaEvent.create({
      data: {
        day: today, kind: 'DISIPLIN-CUAN',
        text: `DISIPLIN CUAN: ekspektansi ${metrikAwal.ekspektansiR}R negatif pada ${metrikAwal.totalPlan} rencana (net ${metrikAwal.ekspektansiPct}%/rencana, kalah ${metrikAwal.kalah}). Keyakinan pick hari hidup kupangkas 5 poin s/d ${disiplinSampai} — aku menghukum keteledoranku dengan angka, bukan dengan dalih.`,
      },
    })
  }
  const metrik = metrikDari(entri, disiplinAktif, disiplinSampai)

  // EVENT + PELAJARAN — hanya resolusi BARU (bootstrap pertama: tanpa teater retroaktif)
  const baru = prevKeys === null
    ? []
    : entri.filter((e) => !prevKeys!.has(`${e.day}|${e.symbol}`))
  let eventDitulis = 0
  for (const e of baru) {
    if (eventDitulis >= 8) break
    const sym = e.symbol.replace('USDT', '')
    if (e.status === 'MENANG') {
      await db.arenaEvent.create({
        data: { day: today, kind: 'CUAN', text: `CUAN MENANG: ${sym} ${e.day} — sasaran tercapai, net +${e.netPct}% (R ${e.r}) di rezim ${e.regime}. Rencana pra-registrasi dibayar medan, setelah fee.` },
      })
      eventDitulis++
    } else if (e.status === 'KALAH') {
      const pelajaran = `MESIN-CUAN: ${sym} ${e.arah} kalah ${e.netPct}% (R ${e.r}) via stop di rezim ${e.regime} (${e.day}) — keyakinan ${e.keyakinan}%, target ${e.target} vs stop ${e.stop}. Keteledoran dicatat: rencana ini kalah pada candle pertama — periksa ulang guard rezim ${e.regime} untuk pola serupa.`
      await db.arenaEvent.create({
        data: { day: today, kind: 'CUAN', text: `CUAN KALAH (keteledoran dicatat): ${sym} ${e.day} — kena stop, net ${e.netPct}% (R ${e.r}) di rezim ${e.regime}. Pelajaran ditulis ke ingatan — kalah yang tak dicatat adalah kalah yang berulang.` },
      })
      await remember('PELAJARAN', lessonFingerprint(pelajaran),
        { n: 1, sumRet: 0, hitCount: 0, note: pelajaran, regime: e.regime }, e.day)
      eventDitulis++
    } else {
      await db.arenaEvent.create({
        data: { day: today, kind: 'CUAN', text: `CUAN KEDALUWARSA: ${sym} ${e.day} — horizon tamat tanpa menyentuh sasaran/stop, keluar di close, net ${e.netPct}% (R ${e.r}). Jujur: juga dikenai fee.` },
      })
      eventDitulis++
    }
  }

  const buku: BukuCuan = { hari: today, at: new Date().toISOString(), entri: entri.slice(-60), berlangsung, metrik, kejujuran: KEJUJURAN }
  await setMeta('bukuCuan', JSON.stringify(buku))
  if (prevKeys === null) {
    console.log(`[cuan] buku besar dibangun: ${entri.length} rencana dinilai (menang ${metrik.menang} · kalah ${metrik.kalah} · kedaluwarsa ${metrik.kedaluwarsa}) · net kumulatif ${metrik.netKumulatifPct}%`)
  } else if (eventDitulis > 0 || berlangsung.length > 0) {
    console.log(`[cuan] denyut: ${entri.length} entri, ${baru.length} resolusi baru (${eventDitulis} ditulis), berlangsung ${berlangsung.length}`)
  }
}
