// ============================================================
// V303-PENANAM-RENCANA — HEALER rencana pra-registrasi.
//
// Luka yang melahirkan organ ini: picks hari hidup tersimpan TANPA
// rencana (entry/sasaran/ambisius/power-max/stop) bila mesin warisan
// kena ban/kelaparan lilin saat kelahiran hari — akibatnya laporan
// Telegram & kartu bedah tampil tanpa level tempur. Kini tiap denyut
// nafas: cari picks MICAPROFITA tanpa rencana → tanam bertahap
// (maks 5 koin per siklus — anti-ban-418) → tulis balik ke DB.
// Non-vital: galat apa pun tidak boleh mematikan denyut arena.
// ============================================================

import { db } from '@/lib/db'
import { perkayaWarisan, type PickLike } from './warisan'
import { getKlines, atrPct, candlesBefore } from './market'
import { bacaEvidence } from './evidence'

const gt = globalThis as unknown as { __tanamRencanaJalan?: boolean }

interface PickLikeAtr extends PickLike {
  _atr?: number
}

export async function tanamRencanaKurang(maxKoin = 5): Promise<number> {
  if (gt.__tanamRencanaJalan) return 0
  gt.__tanamRencanaJalan = true
  try {
    const today =
      (await db.meta.findUnique({ where: { key: 'arenaToday' } }).catch(() => null))?.value ?? null
    if (!today) return 0
    const bd = await db.battleDay
      .findUnique({ where: { day: today }, include: { picks: true } })
      .catch(() => null)
    if (!bd) return 0

    const kurang = bd.picks.filter((p) => {
      if (p.competitor !== 'MICAPROFITA') return false
      if (typeof p.entryClose !== 'number' || !Number.isFinite(p.entryClose)) return false
      // evidence DB = STRING JSON — baca lewat satu pintu, jangan cast langsung
      const r = bacaEvidence(p.evidence).rencana as
        | { powerMax?: unknown; highAmbisius?: unknown }
        | undefined
      // tanpa rencana ATAU rencana jadul tanpa level POWER-MAX (q90) → tanam ulang
      return !r || !Number.isFinite(r.powerMax as number)
    })
    if (!kurang.length) return 0

    const batch = kurang.slice(0, maxKoin)
    const rows: PickLikeAtr[] = []
    for (const p of batch) {
      let atr: number | undefined
      try {
        const ks = await getKlines(p.symbol)
        if (ks && ks.length >= 20) atr = atrPct(candlesBefore(ks, today))
      } catch { /* atr kosong → koin dilewati pass ini */ }
      rows.push({
        symbol: p.symbol,
        direction: p.direction as 'BUY' | 'SELL',
        confidence: p.confidence,
        entryClose: p.entryClose,
        // evidence DB = STRING JSON: parse → objek MURNI (kloning dalam satu
        // langkah) supaya mesin warisan boleh menanam tanpa "readonly property"
        evidence: bacaEvidence(p.evidence),
        _atr: atr,
      })
    }

    await perkayaWarisan(
      rows,
      today,
      {
        atrPctOf: (sym) => rows.find((x) => x.symbol === sym)?._atr,
        likuiditasRankOf: (sym) => Math.max(0, rows.findIndex((x) => x.symbol === sym)),
        universeSize: Math.max(bd.picks.length, 1),
        breadthPct: 50,
        regime: bd.regime,
      },
    )

    let n = 0
    for (const r of rows) {
      const ev = r.evidence as { rencana?: unknown; warisan?: unknown } | undefined
      if (!ev?.rencana) continue
      const row = batch.find((p) => p.symbol === r.symbol)
      if (!row) continue
      const ok = await db.pick
        // tulis balik sebagai STRING JSON — konsisten dengan bentuk DB
        // eksisting yang dibaca safeJson di seluruh otak (arena/cuan)
        .update({ where: { id: row.id }, data: { evidence: JSON.stringify(ev) as unknown as object } })
        .then(() => true)
        .catch(() => false)
      if (ok) n++
    }
    if (n > 0) {
      console.log(`[penanam-rencana] ${today}: +${n} rencana tertanam (sisa kurang: ${kurang.length - n})`)
    }
    return n
  } catch (e) {
    console.warn('[penanam-rencana] galat (non-vital):', String(e).slice(0, 140))
    return 0
  } finally {
    gt.__tanamRencanaJalan = false
  }
}
