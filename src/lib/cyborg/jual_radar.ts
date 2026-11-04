// ============================================================
// V303-RADAR-JUAL — Pengawal level JUAL AMBISIUS + POWER-MAX.
//
// Tragedi yang melahirkan organ ini: level jual ambisius tersentuh
// TAPI TIDAK ADA YANG BERTERIAK — pemilik tak tahu momen amankan
// profit telah tiba. Kini tiap denyut: harga live vs dua level:
//   • AMBISIUS (Monte-Carlo q75) — notif 🚨 amankan profit
//   • POWER-MAX (Monte-Carlo q90) — notif ⚡ puncak harian
// Tersentuh → notifikasi Telegram WAJIB (mandat ②) + tanda meta
// agar satu hari satu simbol satu level hanya menggelegar sekali.
// Non-vital: galat apa pun TIDAK boleh mematikan denyut arena.
// ============================================================

import { db } from '@/lib/db'
import { getUniverse } from './market'
import { teksJualAmbisius, teksPowerMax, type RencanaEvidensi } from './tg_kartu'
import { siarkan } from './tg'
import { bacaEvidence } from './evidence'

const gt = globalThis as unknown as { __radarJualJalan?: boolean }

export async function radarJualAmbisius(): Promise<{ dicek: number; kena: string[] }> {
  if (gt.__radarJualJalan) return { dicek: 0, kena: [] } // satu instance saja
  gt.__radarJualJalan = true
  try {
    const today =
      (await db.meta.findUnique({ where: { key: 'arenaToday' } }).catch(() => null))?.value ??
      new Date().toISOString().slice(0, 10)
    const bd = await db.battleDay.findUnique({ where: { day: today }, include: { picks: true } }).catch(() => null)
    if (!bd) return { dicek: 0, kena: [] }

    // kandidat: pick MICAPROFITA hari hidup yang punya rencana + level ambisius
    const kandidat: Array<{
      sym: string
      arah: 'BUY' | 'SELL'
      conf: number
      entry: number | null
      level: number
      r: RencanaEvidensi
    }> = []
    for (const p of bd.picks.filter((x) => x.competitor === 'MICAPROFITA')) {
      const r = bacaEvidence(p.evidence).rencana as RencanaEvidensi | undefined
      if (!r || !Number.isFinite(r.entry as number)) continue
      if (r.highAmbisius == null || !Number.isFinite(r.highAmbisius)) continue
      kandidat.push({
        sym: p.symbol,
        arah: p.direction as 'BUY' | 'SELL',
        conf: p.confidence,
        entry: (r.entry as number) ?? null,
        level: r.highAmbisius,
        r,
      })
    }
    if (!kandidat.length) return { dicek: 0, kena: [] }

    // harga live dari ticker (cache 10 menit — 1 request, murah)
    let harga: Map<string, number>
    try {
      const u = await getUniverse()
      harga = new Map(u.map((i) => [i.symbol, i.lastPrice]))
    } catch {
      return { dicek: 0, kena: [] }
    }

    const kena: string[] = []
    for (const k of kandidat) {
      const h = harga.get(k.sym)
      if (!h || !Number.isFinite(h)) continue
      const sentuh = k.arah === 'BUY' ? h >= k.level : h <= k.level
      if (!sentuh) continue

      // satu hari satu simbol satu level — sekali menggelegar
      const kunci = `tgJual|${bd.day}|${k.sym}`
      const sudah = await db.meta.findUnique({ where: { key: kunci } }).catch(() => null)
      if (sudah) continue
      await db.meta
        .upsert({ where: { key: kunci }, update: { value: String(Date.now()) }, create: { key: kunci, value: String(Date.now()) } })
        .catch(() => null)
      kena.push(k.sym)

      try {
        const teks = teksJualAmbisius({
          day: bd.day,
          symbol: k.sym,
          arah: k.arah,
          entry: k.entry,
          harga: h,
          level: k.level,
          ambisiusPct: k.r.ambisiusPct ?? null,
          target: k.r.target ?? null,
          stop: k.r.stop ?? null,
          pAmbisius: k.r.pAmbisius ?? null,
          keyakinan: k.conf,
          regime: bd.regime,
        })
        const n = await siarkan(teks)
        console.log(`[radar-jual] ${k.sym} menyentuh ambisius ${k.level} (harga ${h}) — notif ke ${n} penerima`)
      } catch (e) {
        console.warn('[radar-jual] notif gagal (radar tetap hidup):', String(e).slice(0, 140))
      }

      // LEVEL KEDUA — POWER-MAX (q90): puncak harian, notif khusus ⚡
      const pmax = k.r.powerMax
      if (pmax != null && Number.isFinite(pmax)) {
        const sentuhPm = k.arah === 'BUY' ? h >= pmax : h <= pmax
        const kunciPm = `tgPmax|${bd.day}|${k.sym}`
        const sudahPm = await db.meta.findUnique({ where: { key: kunciPm } }).catch(() => null)
        if (sentuhPm && !sudahPm) {
          await db.meta
            .upsert({ where: { key: kunciPm }, update: { value: String(Date.now()) }, create: { key: kunciPm, value: String(Date.now()) } })
            .catch(() => null)
          try {
            const teksPm = teksPowerMax({
              day: bd.day,
              symbol: k.sym,
              arah: k.arah,
              entry: k.entry,
              harga: h,
              level: pmax,
              powerMaxPct: k.r.powerMaxPct ?? null,
              target: k.r.target ?? null,
              stop: k.r.stop ?? null,
              keyakinan: k.conf,
              regime: bd.regime,
            })
            await siarkan(teksPm)
            console.log(`[radar-jual] ${k.sym} menyentuh POWER-MAX ${pmax} (harga ${h})`)
          } catch (e) {
            console.warn('[radar-jual] notif powermax gagal (radar tetap hidup):', String(e).slice(0, 140))
          }
        }
      }
    }
    return { dicek: kandidat.length, kena }
  } finally {
    gt.__radarJualJalan = false
  }
}
