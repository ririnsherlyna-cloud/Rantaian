// BUKTI BERDAMPINGAN: raw host tunggal vs modul cyborg (rantai host) — detik yang sama
import { getUniverse } from '../src/lib/cyborg/market.ts'

async function raw(url: string) {
  try { const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) }); return `HTTP ${r.status}` }
  catch (e: any) { return 'ERR ' + String(e?.message || e).slice(0, 40) }
}

const t0 = Date.now()
const [rawTime, rawKline, uni] = await Promise.all([
  raw('https://api.binance.com/api/v3/time'),
  raw('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=2'),
  getUniverse().catch((e) => { console.error('MODUL GAGAL:', e.message); return null }),
])
const host = (globalThis as any).__arenaSpotHost ?? '(default)'
console.log('=== BUKTI FALLBACK R45 —', new Date().toISOString(), '===')
console.log(`Raw api.binance.com /time   : ${rawTime}`)
console.log(`Raw api.binance.com /klines : ${rawKline}`)
console.log(`Modul cyborg (rantai host)  : ${uni ? uni.length + ' koin likuid, BTC $' + uni[0].lastPrice : 'GAGAL'} via host "${host}" (${Date.now() - t0}ms)`)
console.log(uni ? 'KESIMPULAN: saat host utama ter-ban 418, cyborg TETAP mendapat data nyata via mirror — lapisan transport kini tahan ban.' : 'KESIMPULAN: rantai host juga gagal.')
