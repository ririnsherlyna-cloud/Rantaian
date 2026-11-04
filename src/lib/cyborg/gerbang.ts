// ============================================================
// V302 GERBANG — Penjaga 3 lapis anti-koin-pegged (V299b)
// ------------------------------------------------------------
// Koin pegged (stablecoin, gold-pegged, fiat-pegged) hampir tak
// bergerak: level ENTRY/SASARAN/STOP/AMBISIUS jadi ilusi.
// Lapis 1 : daftar eksplisit simbol pegged (warisan in-chat).
// Lapis 2 : pola suffix + nama base fiat/gold/stable.
// Lapis 3 : jaring statistik (koin yang BERGERAK seperti pegged
//           meski namanya tidak) — ATR sempit, momentum mati,
//           harga menjepit 0,80–1,25.
// ============================================================

// ---------- LAPIS 1: daftar eksplisit (identik mesin in-chat) ----------
export const PEGGED_L1 = new Set([
  'USDCUSDT', 'FDUSDUSDT', 'TUSDUSDT', 'USDPUSDT', 'DAIUSDT', 'BUSDUSDT',
  'USDSUSDT', 'USDEUSDT', 'USD1USDT', 'USDGUSDT', 'PYUSDUSDT', 'XUSDUSDT',
  'USRUSDT', 'USTCUSDT', 'SUSDEUSDT', 'SUSDUSDT', 'FRAXUSDT', 'USDDUSDT',
  'EURUSDT', 'AEURUSDT', 'EURIUSDT', 'GBPUSDT', 'AUDUSDT', 'PAXGUSDT',
  'XAUTUSDT', 'USDTUSDT',
])

// ---------- LAPIS 2: pola nama ----------
const SUFFIX_PEGGED = ['USD', 'EUR', 'GHO', 'XAUT', 'PAXG', 'DAI', 'FRAX', 'USTC', 'XAG']
const BASE_FIAT_STABLE = new Set([
  'USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'BUSD', 'USDS', 'USDE', 'USD1',
  'USDG', 'PYUSD', 'XUSD', 'USR', 'USTC', 'SUSDE', 'SUSD', 'FRAX', 'USDD',
  'EUR', 'AEUR', 'EURI', 'GBP', 'AUD', 'PAXG', 'XAUT', 'USDT', 'GHO',
  'BSCUSD', 'BFUSD', 'USDCE', 'CRVUSD', 'VUSD', 'ZUSD', 'RLUSD', 'FDUSDT',
])

/** Lapis 1 + 2: cek dari nama simbol/base saja. */
export function peggedDariNama(symbol: string): boolean {
  if (PEGGED_L1.has(symbol)) return true
  const base = symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol
  if (BASE_FIAT_STABLE.has(base)) return true
  for (const suf of SUFFIX_PEGGED) {
    if (base.length > suf.length && base.endsWith(suf)) return true
  }
  return false
}

// ---------- LAPIS 3: jaring statistik ----------
export interface FiturGerbang {
  atrPct: number // ATR% harian (14)
  mom7: number // momentum 7 hari %
  rasioMa: number // close / EMA20
  rentang7: number // (high7 - low7) / low7 %
}

/** Koin yang bergerak SEPERTI pegged meski namanya bukan. */
export function peggedDariStatistik(f: FiturGerbang): boolean {
  const jaringLuas = f.atrPct < 1.5 && Math.abs(f.mom7) < 1.0 && f.rasioMa >= 0.8 && f.rasioMa <= 1.25
  const jaringRapat = f.atrPct < 0.5 && Math.abs(f.mom7) < 0.3 && f.rentang7 < 1.2
  return jaringLuas || jaringRapat
}

/** Gerbang penuh: nama ATAU statistik. */
export function tertangkapGerbang(symbol: string, f: FiturGerbang): boolean {
  return peggedDariNama(symbol) || peggedDariStatistik(f)
}
