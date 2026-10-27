// V302 KOIN WAJIB EMAS — sumber harga XAU (emas) untuk slot wajib arena.
// Binance TIDAK punya pasangan XAUUSDT spot -> rantai khusus emas:
//   1. api.gold-api.com/price/XAU      (spot murni, oz USD)
//   2. api.bybit.com XAUTUSDT          (Tether Gold, 1 XAUT = 1 oz)
//   3. www.okx.com XAUT-USDT           (cadangan terakhir)
// TTL cache 5 menit; "cache basi pun lebih baik daripada kosong" — pemanggil
// (arena slot WAJIB) tidak boleh gagal hanya karena semua sumber sedang tidur.
// Salinan abadi: Rantaian/benteng/web/emas.ts (restore: scripts/restore_tubuh.py)

export type EmasHarga = {
  price: number
  chg24hPct: number | null
  source: string
  at: string
}

let cache: { data: EmasHarga; waktu: number } | null = null
const TTL_MS = 5 * 60 * 1000

async function ambilJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

async function dariGoldApi(): Promise<EmasHarga> {
  const d = (await ambilJson('https://api.gold-api.com/price/XAU')) as {
    price?: number
    updatedAt?: string
  }
  const price = Number(d?.price)
  if (!Number.isFinite(price) || price <= 0) throw new Error('gold-api harga tak sah')
  return { price, chg24hPct: null, source: 'gold-api(spot)', at: d?.updatedAt || new Date().toISOString() }
}

async function dariBybit(): Promise<EmasHarga> {
  const d = (await ambilJson(
    'https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT',
  )) as {
    result?: { list?: Array<{ lastPrice?: string; price24hPcnt?: string }> }
  }
  const tick = d?.result?.list?.[0]
  const price = Number(tick?.lastPrice)
  if (!Number.isFinite(price) || price <= 0) throw new Error('bybit harga tak sah')
  const pct = tick?.price24hPcnt != null ? Number(tick.price24hPcnt) * 100 : null
  return {
    price,
    chg24hPct: pct != null && Number.isFinite(pct) ? pct : null,
    source: 'bybit(XAUT)',
    at: new Date().toISOString(),
  }
}

async function dariOkx(): Promise<EmasHarga> {
  const d = (await ambilJson('https://www.okx.com/api/v5/market/ticker?instId=XAUT-USDT')) as {
    data?: Array<{ last?: string; open24h?: string }>
  }
  const tick = d?.data?.[0]
  const price = Number(tick?.last)
  const open = Number(tick?.open24h)
  if (!Number.isFinite(price) || price <= 0) throw new Error('okx harga tak sah')
  const pct = Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : null
  return {
    price,
    chg24hPct: pct != null && Number.isFinite(pct) ? pct : null,
    source: 'okx(XAUT)',
    at: new Date().toISOString(),
  }
}

/** Lengkapi chg24hPct bila sumber pertama tidak membawanya (gold-api tak kasih). */
async function lengkapi24j(e: EmasHarga): Promise<EmasHarga> {
  if (e.chg24hPct != null) return e
  for (const next of [dariBybit, dariOkx]) {
    try {
      const b = await next()
      if (b.chg24hPct != null) return { ...e, chg24hPct: b.chg24hPct }
    } catch {
      /* lanjut sumber berikut */
    }
  }
  return e // chg24hPct tetap null -> pemanggil memutus arah dgn jujur
}

export async function getEmas(): Promise<EmasHarga> {
  if (cache && Date.now() - cache.waktu < TTL_MS) return cache.data
  let terakhir: unknown = null
  for (const sumber of [dariGoldApi, dariBybit, dariOkx]) {
    try {
      const e = await lengkapi24j(await sumber())
      cache = { data: e, waktu: Date.now() }
      return e
    } catch (err) {
      terakhir = err
    }
  }
  // Semua sumber gagal -> cache basi tetap diberikan (lebih baik basi daripada kosong)
  if (cache) return cache.data
  throw terakhir instanceof Error ? terakhir : new Error('semua sumber emas gagal')
}
