// ============================================================
// V302 WAKTU — Kesadaran pergantian hari UTC (satu tubuh z.ai)
// ------------------------------------------------------------
// Akar bug "label tanggal 11 macet": cache memori menahan data
// lintas hari seolah masih segar. Kini SEMUA cache wajib lewat
// cacheHarian(): entri membawa label hari UTC saat diambil.
// Begitu hari UTC berganti, entri otomatis usang — tidak peduli
// umurnya baru 1 detik. Data lintas hari tidak pernah lagi
// dijual sebagai data segar.
// ============================================================

/** Tanggal UTC hari ini, bentuk 'YYYY-MM-DD' — dihitung HIDUP setiap panggilan. */
export function hariIniUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Jam UTC berjalan 'HH:MM:SS'. */
export function jamUTC(): string {
  return new Date().toISOString().slice(11, 19)
}

/** Buka hari UTC (epoch ms) untuk tanggal 'YYYY-MM-DD'. */
export function bukaHari(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`)
}

interface EntriHarian<T> {
  data: T
  hari: string // hari UTC saat data diambil
  pada: number // epoch ms saat diambil
}

const g = globalThis as unknown as { __arenaCacheHarian?: Map<string, EntriHarian<unknown>> }
function peta(): Map<string, EntriHarian<unknown>> {
  if (!g.__arenaCacheHarian) g.__arenaCacheHarian = new Map()
  return g.__arenaCacheHarian
}

/**
 * Cache harian yang sadar pergantian hari.
 * - Segar      = hari sama + umur < ttl  → balas tanpa jaringan.
 * - Usang hari = hari beda ATAU umur ≥ ttl → coba tarik ulang;
 *                gagal jaringan → balas data lama dengan flag `usang: true`
 *                (jujur, tidak pernah dilempar sebagai error ke UI).
 * - Benar-benar kosong & gagal → balas null (pemanggil punya jalur aman).
 */
export async function cacheHarian<T>(
  kunci: string,
  ttlMs: number,
  tarik: () => Promise<T>,
): Promise<{ data: T | null; hari: string | null; umurMs: number; usang: boolean }> {
  const p = peta()
  const kini = Date.now()
  const hari = hariIniUTC()
  const entri = p.get(kunci) as EntriHarian<T> | undefined

  const segar = !!entri && entri.hari === hari && kini - entri.pada < ttlMs
  if (segar && entri) return { data: entri.data, hari: entri.hari, umurMs: kini - entri.pada, usang: false }

  try {
    const data = await tarik()
    p.set(kunci, { data, hari, pada: kini })
    return { data, hari, umurMs: 0, usang: false }
  } catch {
    if (entri) {
      // jaringan rewel — hidupi UI dengan data terakhir, diberi label jujur
      return { data: entri.data, hari: entri.hari, umurMs: kini - entri.pada, usang: entri.hari !== hari }
    }
    return { data: null, hari: null, umurMs: 0, usang: true }
  }
}

/** Buang satu kunci cache (dipakai jantung saat pergantian hari). */
export function purgeCache(kunci?: string): void {
  const p = peta()
  if (kunci) p.delete(kunci)
  else p.clear()
}

/** Laporan isi cache untuk kesehatan jantung. */
export function laporanCache(): { kunci: string; hari: string; umurMs: number }[] {
  const p = peta()
  const kini = Date.now()
  return [...p.entries()].map(([kunci, e]) => ({ kunci, hari: e.hari, umurMs: kini - e.pada }))
}
