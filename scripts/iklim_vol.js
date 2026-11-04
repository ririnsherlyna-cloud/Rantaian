// Iklas iklim volatilitas: BTC+ETH+PEPE+ZEC — σ24j 1h-realized per hari, 45 hari terakhir
// Untuk menjawab: apakah TP kecil karena pasar memang tenang?
const BASES = ['https://api.binance.com', 'https://data-api.binance.vision', 'https://api1.binance.com']
async function klines(sym, interval, limit) {
  for (const b of BASES) {
    try {
      const r = await fetch(`${b}/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`)
      if (r.status === 429 || r.status === 418) { await new Promise((s) => setTimeout(s, 3000)); continue }
      if (!r.ok) continue
      return (await r.json()).map((k) => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }))
    } catch { }
  }
  return null
}
function realVol24jPct(c1h, idx) {
  // realized vol 24 jam = std log-return 24 candle × sqrt(24) × 100
  const rets = []
  for (let i = idx - 23; i <= idx; i++) if (i > 0) rets.push(Math.log(c1h[i].c / c1h[i - 1].c))
  if (rets.length < 20) return null
  const m = rets.reduce((a, x) => a + x, 0) / rets.length
  const sd = Math.sqrt(rets.reduce((a, x) => a + (x - m) ** 2, 0) / rets.length)
  return +((sd * Math.sqrt(24)) * 100).toFixed(2)
}
async function main() {
  for (const sym of ['BTCUSDT', 'ETHUSDT', 'PEPEUSDT', 'ZECUSDT']) {
    const c1h = await klines(sym, '1h', 45 * 24)
    if (!c1h) { console.log(`${sym}: gagal`); continue }
    // sampel per hari UTC pada jam 12:00
    const perHari = {}
    c1h.forEach((k, i) => {
      const d = new Date(k.t).toISOString().slice(0, 10)
      if (new Date(k.t).getUTCHours() === 12) perHari[d] = realVol24jPct(c1h, i)
    })
    const ent = Object.entries(perHari)
    const era1 = ent.filter(([d]) => d >= '2026-09-15' && d < '2026-10-11').map(([, v]) => v).filter((x) => x)
    const era2 = ent.filter(([d]) => d >= '2026-10-16').map(([, v]) => v).filter((x) => x)
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : null }
    console.log(`${sym}: σ24j median ERA KAYA (15 Sep-10 Okt)=${med(era1)}% (n=${era1.length}) vs ERA KINI (16-27 Okt)=${med(era2)}% (n=${era2.length}) → rasio ${(med(era1) / med(era2)).toFixed(1)}x lebih tenang`)
    const lima = ent.slice(-5).map(([d, v]) => `${d}:${v}%`).join(' ')
    console.log(`   5 hari terakhir: ${lima}`)
    await new Promise((s) => setTimeout(s, 400))
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
