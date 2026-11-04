// ============================================================
// V302 INSTRUMENTASI — Nyala otomatis satu tubuh z.ai
// ------------------------------------------------------------
// Next.js memanggil register() SETIAP server menyala (dev &
// produksi). Di sinilah jantung dinyalakan: pencegahan
// pergantian-hari-lambat, bukti hidup, dan penyembuhan file
// inti — semuanya sebelum request pertama tiba.
// ============================================================

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { nyalakanJantung } = await import('@/lib/cyborg/jantung')
    nyalakanJantung()
  } catch {
    // jantung gagal nyala tidak boleh menjatuhkan server
  }
}
