// ============================================================
// MOZAIK FAKULTAS: INTERNET INTELLIGENCE
// Akses informasi terkini dengan VERIFIKASI + PENCATATAN SUMBER.
//
// Mandat Guru: semua sumber = NOL BIAYA, tanpa api-key, dan
// kekuatannya wajib lebih cerdas daripada layanan berbayar
// (bukti: sumber gratis ini yang memberi makan 4 organ
// bersertifikat + arena kompetitif harian).
//
// Prinsip: REDUNDANCY (rantai 4 host Binance + 2 penyedia
// iklim), FAULT ISOLATION (tiap probe ditangkap sendiri),
// OBSERVABILITY (latensi + verifikasi bentuk payload dicatat),
// RECOVERY (liveness dinilai per-probe, tidak menggantung).
// ============================================================

import type { SumberHealth } from './types'

interface DefSumber {
  id: string
  nama: string
  url: string
  verifikasi: (payload: unknown) => string | null // null = LULUS
  redundancy: string | null
  timeoutMs: number
}

const HITUNGAN = (o: unknown): number | null => {
  if (Array.isArray(o)) return o.length
  if (o && typeof o === 'object') return Object.keys(o as Record<string, unknown>).length
  return null
}

const DEF_SUMBER: DefSumber[] = [
  {
    id: 'binance-klines',
    nama: 'Binance Spot — candle OHLCV harian',
    url: 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=5',
    verifikasi: (p) => (Array.isArray(p) && p.length >= 5 && Array.isArray(p[0]) ? null : 'payload bukan array candle'),
    redundancy: 'rantai 4 host: api / api1 / api-gcp / data-api.binance.vision (sticky last-good)',
    timeoutMs: 3000,
  },
  {
    id: 'binance-ticker',
    nama: 'Binance Spot — ticker 24 jam seluruh pasar',
    url: 'https://api1.binance.com/api/v3/ticker/24hr',
    verifikasi: (p) => (Array.isArray(p) && HITUNGAN(p)! > 500 ? null : `ticker hanya ${HITUNGAN(p)} entri`),
    redundancy: 'rantai 4 host',
    timeoutMs: 5000,
  },
  {
    id: 'binance-funding',
    nama: 'Binance Futures — funding rate (tekanan massa)',
    url: 'https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT',
    verifikasi: (p) => (p && typeof p === 'object' && 'lastFundingRate' in (p as object) ? null : 'premiumIndex tanpa lastFundingRate'),
    redundancy: 'host tunggal fapi (bukan filter keputusan — informatif)',
    timeoutMs: 3000,
  },
  {
    id: 'coingecko-global',
    nama: 'CoinGecko — global market cap & dominasi BTC',
    url: 'https://api.coingecko.com/api/v3/global',
    verifikasi: (p) => {
      const d = (p as { data?: unknown })?.data
      return d && typeof d === 'object' && 'market_cap_change_percentage_24h_usd' in (d as object)
        ? null
        : 'tanpa field market_cap_change_24h'
    },
    redundancy: 'gratis; 429 pada IP bersama = didegradasi aman (null-safe)',
    timeoutMs: 3000,
  },
  {
    id: 'alternative-me-fng',
    nama: 'alternative.me — Fear & Greed Index',
    url: 'https://api.alternative.me/fng/?limit=1',
    verifikasi: (p) => {
      const d = (p as { data?: unknown[] })?.data
      const e0 = Array.isArray(d) && d.length >= 1 ? (d[0] as Record<string, unknown>) : null
      return e0 && 'value' in e0 ? null : 'tanpa nilai F&G'
    },
    redundancy: 'gratis tanpa key',
    timeoutMs: 3000,
  },
]

/** probe LANGSUNG satu sumber: ukur latensi + verifikasi payload */
async function probeSumber(d: DefSumber): Promise<SumberHealth> {
  const mulai = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), d.timeoutMs)
  try {
    const res = await fetch(d.url, { signal: ctrl.signal, cache: 'no-store', headers: { accept: 'application/json' } })
    if (!res.ok) {
      return selesai(false, `HTTP ${res.status}`, d)
    }
    const payload: unknown = await res.json()
    const masalah = d.verifikasi(payload)
    return selesai(masalah === null, masalah ?? 'VERIFIKASI-LULUS (bentuk payload sesuai)', d)
  } catch (e) {
    const pesan = e instanceof Error ? (e.name === 'AbortError' ? `timeout >${d.timeoutMs}ms` : e.message) : 'galat tak dikenal'
    return selesai(false, pesan, d)
  } finally {
    clearTimeout(timer)
  }

  function selesai(ok: boolean, verifikasi: string, def: DefSumber): SumberHealth {
    return {
      id: def.id,
      nama: def.nama,
      url: def.url,
      gratis: true,
      tanpaKey: true,
      ok,
      latencyMs: Date.now() - mulai,
      verifikasi,
      redundancy: def.redundancy,
    }
  }
}

/** probe seluruh sumber paralel — satu sumber gagal tidak meruntuhkan yang lain */
export async function periksaInternet(probeLangsung = true): Promise<SumberHealth[]> {
  if (!probeLangsung) {
    // mode hemat: registry tanpa lalu-lintas jaringan (UI tetap hidup saat offline)
    return DEF_SUMBER.map((d) => ({
      id: d.id, nama: d.nama, url: d.url, gratis: true, tanpaKey: true,
      ok: false, latencyMs: null, verifikasi: 'tidak diprobe (mode hemat)', redundancy: d.redundancy,
    }))
  }
  return Promise.all(DEF_SUMBER.map((d) => probeSumber(d)))
}
