// ============================================================
// V303-NAPAS — Denyut dalam-proses yang MANDIRI.
//
// Pelajaran empiris: sandbox memakan proses latar antar-giliran
// (watchdog bash pun dimakan). Maka napas otak ditanam DI DALAM
// proses server: sekali modul ini menyala (dipicu request apa pun
// lewat /api/health atau /api/arena), denyut berjalan sendiri:
//   • arena (ensureArena)  tiap 60 dtk — idempoten, anti-stuck
//   • radar jual ambisius  tiap 90 dtk — notifikasi Telegram
//   • saraf Telegram       long-polling — laporan pagi + Q&A
// Server hidup = otak hidup, tanpa syarat apa pun di luar dirinya.
// ============================================================

import { ensureArena } from './arena'
import { tgLoop } from './tg'
import { radarJualAmbisius } from './jual_radar'
import { tanamRencanaKurang } from './penanam_rencana'

const g = globalThis as unknown as { __v303Nafas?: boolean }

export function mulaiNafas(): void {
  if (g.__v303Nafas) return
  g.__v303Nafas = true
  console.log('[V303-NAPAS] denyut dalam-proses menyala: arena 60 dtk · radar-jual 90 dtk · penanam-rencana 120 dtk · Telegram long-polling')
  try { ensureArena().catch(() => {}) } catch { /* non-vital */ }
  try { tgLoop().catch(() => {}) } catch { /* non-vital */ }
  const t1 = setInterval(() => { ensureArena().catch(() => {}) }, 60_000)
  const t2 = setInterval(() => { radarJualAmbisius().catch(() => {}) }, 90_000)
  const t3 = setInterval(() => { tanamRencanaKurang(5).catch(() => {}) }, 120_000)
  t1.unref?.()
  t2.unref?.()
  t3.unref?.()
}
