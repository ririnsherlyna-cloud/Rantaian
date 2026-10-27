// Verifikasi ketersediaan sumber informasi baru (Binance futures public)
const BASE = 'https://fapi.binance.com'
async function j(url: string) {
  const r = await fetch(url)
  if (!r.ok) return { err: r.status }
  return r.json()
}
async function main() {
  // last spot candle = "hari ini" arena
  const kl = (await j('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=3')) as unknown[][]
  console.log('spot last candle openTime:', new Date(kl[kl.length - 1][0] as number).toISOString().slice(0, 10))

  const fr = (await j(`${BASE}/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1000`)) as { fundingTime: number; fundingRate: string }[]
  console.log('funding events:', fr.length, 'range:', new Date(fr[0]?.fundingTime).toISOString().slice(0, 10), '→', new Date(fr[fr.length - 1]?.fundingTime).toISOString().slice(0, 10))

  const tk = (await j(`${BASE}/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=1d&limit=30`)) as { timestamp: number; buySellRatio: string }[]
  console.log('taker ratio days:', tk.length, 'range:', new Date(tk[0]?.timestamp).toISOString().slice(0, 10), '→', new Date(tk[tk.length - 1]?.timestamp).toISOString().slice(0, 10))

  const oi = (await j(`${BASE}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=30`)) as { timestamp: number; sumOpenInterestValue: string }[]
  console.log('OI hist days:', oi.length)
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
