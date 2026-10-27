// ============================================================
// AUDIT REAL-TIME FEED CYBORG MICAPROFITA — r45
// Pertanyaan Guru: "apakah cyborg salah memantau pasar real-time, atau benar?"
// Metode: uji hidup SETIAP endpoint yang dipakai cyborg (market.ts server +
// NAFAS SAKTI browser) terhadap pasar nyata SAAT INI, lalu uji silang antar-
// sumber independen. Tanpa klaim — hanya pengukuran.
// ============================================================
type Cek = { nama: string; ok: boolean; detail: string; ms: number }
const hasil: Cek[] = []
const masalah: string[] = []

async function j(url: string, timeout = 12000): Promise<{ ok: boolean; status?: number; data?: any; ms: number; err?: string }> {
  const t0 = Date.now()
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(timeout) })
    const ms = Date.now() - t0
    if (!r.ok) return { ok: false, status: r.status, ms }
    return { ok: true, data: await r.json(), ms }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, err: String(e?.message || e).slice(0, 100) }
  }
}

function catat(nama: string, ok: boolean, detail: string, ms: number, selaluMasalah = true) {
  hasil.push({ nama, ok, detail, ms })
  if (!ok && selaluMasalah) masalah.push(`${nama}: ${detail}`)
  console.log(`${ok ? 'PASS' : 'GAGAL'}  ${nama.padEnd(38)} ${detail}  (${ms}ms)`)
}

async function main() {
  console.log('=== AUDIT REAL-TIME MICAPROFITA — ' + new Date().toISOString() + ' (UTC) ===\n')

  // ---------- 1. SINKRON JAM (skew jam lokal vs Binance) ----------
  const t = await j('https://api.binance.com/api/v3/time')
  if (t.ok) {
    const skew = Math.abs(Date.now() - t.data.serverTime)
    catat('Sinkron jam (Binance /time)', skew < 3000, `skew ${skew}ms (ambang 3000ms)`, t.ms)
  } else catat('Sinkron jam (Binance /time)', false, `HTTP ${t.status ?? t.err}`, t.ms)

  // ---------- 2. CANDLE HARIAN SPOT (sumber keputusan arena) ----------
  const k1d = await j('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=3')
  let hargaKline = 0
  if (k1d.ok) {
    const last = k1d.data[k1d.data.length - 1]
    const openUtc = new Date(last[0]).toISOString().slice(0, 10)
    const hariIniUtc = new Date().toISOString().slice(0, 10)
    hargaKline = parseFloat(last[4])
    const integritas = k1d.data.every((c: any[]) => {
      const o = parseFloat(c[1]), h = parseFloat(c[2]), l = parseFloat(c[3]), cl = parseFloat(c[4])
      return h >= l && cl <= h && cl >= l && o <= h && o >= l && parseFloat(c[5]) >= 0
    })
    catat('Klines 1d BTCUSPT fresh+integritas'.replace('BTCUSPT', 'BTCUSDT'), openUtc === hariIniUtc && integritas,
      `candle terakhir dibuka ${openUtc} (hari UTC ini: ${hariIniUtc}); OHLC ${integritas ? 'koheren' : 'RUSAK'}; close=$${hargaKline}`, k1d.ms)
  } else catat('Klines 1d BTCUSDT', false, `HTTP ${k1d.status ?? k1d.err}`, k1d.ms)

  // ---------- 3. CANDLE 1H & 4H (dipakai arena multi-timeframe) ----------
  // Sah: umur candle-tertutup < durasi interval (60/240 mnt) + openTime candle
  // berjalan harus segaris grid UTC (mod interval == 0) — uji keselarasan grid.
  for (const [nm, iv, mnt] of [['1h', '1h', 60], ['4h', '4h', 240]] as const) {
    const k = await j(`https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=${iv}&limit=3`)
    if (k.ok) {
      const cur = k.data[k.data.length - 1]
      const lastClosed = k.data[k.data.length - 2]
      const umurMenit = (Date.now() - Number(lastClosed[6])) / 60000
      const gridOk = Number(cur[0]) % (mnt * 60_000) === 0
      const fresh = umurMenit > 0 && umurMenit <= mnt && gridOk
      catat(`Klines ${nm} ETHUSDT fresh+grid`, fresh, `tertutup ${umurMenit.toFixed(0)} mnt lalu (batas sah ${mnt}); grid-UTC ${gridOk ? 'segaris' : 'MELENCENG'}`, k.ms)
    } else catat(`Klines ${nm} ETHUSDT`, false, `HTTP ${k.status ?? k.err}`, k.ms)
  }

  // ---------- 4. TICKER 24HR (sumber universe — dinamis, tanpa hardcode) ----------
  const tk = await j('https://api.binance.com/api/v3/ticker/24hr')
  if (tk.ok) {
    const usdt = tk.data.filter((x: any) => typeof x.symbol === 'string' && x.symbol.endsWith('USDT'))
    const btc = usdt.find((x: any) => x.symbol === 'BTCUSDT')
    const likuid = usdt.filter((x: any) => parseFloat(x.quoteVolume) > 5_000_000).length
    catat('Ticker 24hr (universe)', !!btc && usdt.length > 300, `${usdt.length} pasang USDT, ${likuid} likuid >$5jt; BTC last=$${btc?.lastPrice}`, tk.ms)
  } else catat('Ticker 24hr (universe)', false, `HTTP ${tk.status ?? tk.err}`, tk.ms)

  // ---------- 5. UJI SILANG HARGA 3 SUMBER INDEPENDEN (inti kebenaran) ----------
  const pSpot = await j('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
  // premiumIndex rawan 418 (auto-ban IP Binance) — 3x retry dgn jeda 15 dtk
  let pFapi = await j('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT')
  for (let i = 0; i < 2 && !pFapi.ok; i++) {
    await new Promise(r => setTimeout(r, 15000))
    pFapi = await j('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT')
  }
  if (pSpot.ok && pFapi.ok && hargaKline > 0) {
    const a = hargaKline            // close klines 1d spot
    const b = parseFloat(pSpot.data.price)   // ticker price spot
    const c = parseFloat(pFapi.data.markPrice) // mark price futures
    const devBC = Math.abs(b - c) / b * 100
    const devAB = Math.abs(a - b) / b * 100
    const setuju = devBC < 0.5 && devAB < 1.0
    catat('Uji silang harga 3 sumber', setuju,
      `kline=$${a.toFixed(1)} spot=$${b.toFixed(1)} futures-mark=$${c.toFixed(1)} | dev kline-spot ${devAB.toFixed(3)}% spot-futures ${devBC.toFixed(3)}% (ambang 1.0%/0.5%)`, pSpot.ms)
  } else catat('Uji silang harga 3 sumber', false, `spot:${pSpot.ok ? 'ok' : pSpot.status} fapi:${pFapi.ok ? 'ok' : pFapi.status} kline:${hargaKline > 0}`, pSpot.ms + pFapi.ms)

  // ---------- 6. FUNDING RATE (info posisi massa) ----------
  if (pFapi.ok) {
    const fr = parseFloat(pFapi.data.lastFundingRate) * 100
    catat('Funding rate BTC (fapi)', Math.abs(fr) < 1, `lastFundingRate ${fr.toFixed(4)}%/8h (masuk akal)`, pFapi.ms)
  }
  const fr2 = await j('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3')
  catat('Funding history (fapi)', fr2.ok && Array.isArray(fr2.data) && fr2.data.length === 3, fr2.ok ? `${fr2.data.length} event terakhir` : `HTTP ${fr2.status ?? fr2.err}`, fr2.ms)

  // ---------- 7. FEED NAFAS SAKTI: OI + LONG/SHORT + F&G + COINGECKO ----------
  const oi = await j('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=3')
  catat('Open interest hist (NAFAS)', oi.ok && Array.isArray(oi.data) && oi.data.length === 3, oi.ok ? `terbaru $${(parseFloat(oi.data[oi.data.length - 1].sumOpenInterestValue) / 1e9).toFixed(2)} miliar` : `HTTP ${oi.status ?? oi.err}`, oi.ms)
  const ls = await j('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1')
  catat('Long/short ratio (NAFAS)', ls.ok && Array.isArray(ls.data), ls.ok ? `ratio ${ls.data[0]?.longShortRatio}` : `HTTP ${ls.status ?? ls.err}`, ls.ms)
  const fng = await j('https://api.alternative.me/fng/?limit=1')
  if (fng.ok) {
    const v = parseInt(fng.data.data[0].value)
    const umurJam = (Date.now() - Number(fng.data.data[0].timestamp) * 1000) / 3600000
    catat('Fear & Greed (alternative.me)', v >= 0 && v <= 100 && umurJam < 72, `nilai ${v} (${fng.data.data[0].value_classification}), umur ${umurJam.toFixed(0)} jam`, fng.ms)
  } else catat('Fear & Greed (alternative.me)', false, `HTTP ${fng.status ?? fng.err}`, fng.ms)
  // CoinGecko free tier rawan 429 — 3x retry dgn jeda 10 dtk (cyborg: null-safe)
  let cg = await j('https://api.coingecko.com/api/v3/global')
  for (let i = 0; i < 2 && !cg.ok; i++) {
    await new Promise(r => setTimeout(r, 10000))
    cg = await j('https://api.coingecko.com/api/v3/global')
  }
  if (cg.ok) {
    const d = cg.data.data
    const dom = d.market_cap_percentage.btc
    const mcapT = d.total_market_cap.usd / 1e12
    catat('CoinGecko global (NAFAS)', dom > 25 && dom < 80 && mcapT > 0.5, `mcap $${mcapT.toFixed(2)}T, dominasi BTC ${dom.toFixed(1)}%, update ${d.market_cap_change_percentage_24h_usd.toFixed(2)}%/24j`, cg.ms)
  } else catat('CoinGecko global (NAFAS)', false, `HTTP ${cg.status ?? cg.err}`, cg.ms)

  // ---------- 8. STATUS DELISTING (universe tetap valid?) ----------
  const ex = await j('https://api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT')
  catat('Status market BTCUSDT', ex.ok && ex.data.symbols[0].status === 'TRADING', ex.ok ? ex.data.symbols[0].status : `HTTP ${ex.status ?? ex.err}`, ex.ms)

  // ---------- 9. SANITY HARGA ABSOLUT (anti data-palsu/placeholder) ----------
  if (pSpot.ok) {
    const p = parseFloat(pSpot.data.price)
    catat('Sanity harga BTC absolut', p > 1000 && p < 10_000_000, `$${p} berada pada rentang wajar 2026`, pSpot.ms, false)
  }

  // ---------- VONIS ----------
  const gagal = hasil.filter(h => !h.ok)
  const lat = Math.round(hasil.reduce((s, h) => s + h.ms, 0) / hasil.length)
  console.log('\n=== VONIS ===')
  console.log(`Titik uji: ${hasil.length} | PASS: ${hasil.length - gagal.length} | GAGAL: ${gagal.length} | latensi rata-rata ${lat}ms`)
  console.log(gagal.length === 0
    ? 'VONIS: BENAR — seluruh saluran pemantauan real-time cyborg hidup, segar, dan saling sepakat.'
    : 'VONIS: ADA KESALAHAN — ' + masalah.join(' ; '))
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
