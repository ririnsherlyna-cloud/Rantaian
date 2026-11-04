// ============================================================
// V303-EVIDENCE-PEMBACA — satu pintu baca kolom evidence.
//
// KENAPA ADA: kolom Pick.evidence tersimpan di DB sebagai STRING
// JSON (bukan objek) — pembaca yang cast langsung ke objek selalu
// mendapat undefined (rencana/warisan "hilang" di mata radar-jual,
// laporan Telegram, kartu bedah). Satu pintu ini menerima KEDUA
// bentuk (string / objek) dan mengembalikan objek bersih.
// ============================================================

export function bacaEvidence(e: unknown): Record<string, unknown> {
  if (!e) return {}
  if (typeof e === 'string') {
    try {
      return JSON.parse(e) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof e === 'object') return e as Record<string, unknown>
  return {}
}
