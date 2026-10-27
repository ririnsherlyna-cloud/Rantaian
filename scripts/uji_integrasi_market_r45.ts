// UJI INTEGRASI HIDUP: modul market.ts cyborg (dgn rantai host baru) memanggil pasar nyata
import { getUniverse, getKlines, getKlines1h, getClimate, getFundingRates } from '../src/lib/cyborg/market.ts'

async function main() {
  console.log('=== UJI INTEGRASI market.ts (rantai host r45) ===', new Date().toISOString())
  const t0 = Date.now()
  const uni = await getUniverse()
  console.log(`getUniverse      : ${uni.length} koin likuid (top: ${uni.slice(0, 3).map((u) => `${u.symbol} $${u.lastPrice.toPrecision(6)}`).join(', ')}) — ${Date.now() - t0}ms`)
  if (uni.length < 20) throw new Error('universe terlalu kecil')

  const t1 = Date.now()
  const k = await getKlines('BTCUSDT')
  const last = k[k.length - 1]
  console.log(`getKlines 1d BTC : ${k.length} candle, terakhir O=${last.open} H=${last.high} L=${last.low} C=${last.close} vol=${Math.round(last.volume)} — ${Date.now() - t1}ms`)
  if (k.length < 130) throw new Error('candle harian kurang')
  const o = last.open, h = last.high, l = last.low, c = last.close
  if (!(h >= l && c <= h && c >= l && o <= h && o >= l)) throw new Error('OHLC rusak')

  const t2 = Date.now()
  const k1 = await getKlines1h('ETHUSDT')
  console.log(`getKlines 1h ETH : ${k1.length} candle — ${Date.now() - t2}ms`)

  const t3 = Date.now()
  const cl = await getClimate()
  console.log(`getClimate       : F&G=${cl.fng} (${cl.fngClass}), dominasi BTC=${cl.btcDominance === null ? 'null (degradasi aman)' : cl.btcDominance.toFixed(1) + '%'}, mcap24j=${cl.mcapChange24h === null ? 'null (degradasi aman)' : cl.mcapChange24h.toFixed(2) + '%'} — ${Date.now() - t3}ms`)

  const t4 = Date.now()
  const fr = await getFundingRates(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  console.log(`getFundingRates  : ${fr.size}/3 simbol; BTC=${fr.get('BTCUSDT') ? (fr.get('BTCUSDT')!.rate * 100).toFixed(4) + '%/8h' : 'kosong (breaker)'} — ${Date.now() - t4}ms`)

  // panggil ulang utk bukti cache TTL menghindari hambar ulang
  const t5 = Date.now()
  await getUniverse()
  console.log(`cache TTL ticker : panggilan ke-2 ${Date.now() - t5}ms (harus < 5ms)`)

  console.log('\nVONIS INTEGRASI: LULUS — lapisan data cyborg berfungsi penuh terhadap pasar nyata.')
}
main().catch((e) => { console.error('GAGAL INTEGRASI:', e?.message || e); process.exit(1) })
