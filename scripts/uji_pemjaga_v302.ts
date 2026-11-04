// ============================================================
// UJI PEMJAGA CERDAS V302 — simulasi skenario "circuit open tiap
// pergantian hari" yang dulu membuat 37x hari baru kacau:
//   Skenario: burst permintaan → sumber data memblokir (ban) selama
//   beberapa detik → pemjaga lama membuka buta 60 dtk + tidak ada
//   cadangan data → error ke permukaan.
//   Sekarang diuji: (1) simbol ber-cache TIDAK PERNAH error (cadangan
//   basi), (2) pemjaga tidur adaptif & pulih otomatis, (3) bulk
//   multi-pass menunggu sabar sampai semua terisi, (4) ritme per-host
//   di dunia nyata tidak memicu ban, (5) jalur fapi hidup.
// Jalankan: bun scripts/uji_pemjaga_v302.ts
// ============================================================
import * as m from '../src/lib/cyborg/market'

const asliFetch = globalThis.fetch
let banSampai = 0 // epoch ms; < now → fetch asli
let hitungBan = 0

// Pembungkus: selama ban aktif, semua permintaan ditolak seperti IP diblokir
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  if (Date.now() < banSampai) {
    hitungBan++
    throw new TypeError('fetch failed (simulasi IP diblokir)')
  }
  return asliFetch(input, init)
}) as typeof fetch

function latar<T>(p: Promise<T>): Promise<{ ok: true; v: T } | { ok: false; e: string }> {
  return p.then(
    (v) => ({ ok: true, v }) as const,
    (e) => ({ ok: false, e: String(e) }) as const,
  )
}

async function main() {
  const t0 = Date.now()

  // [1] PRIME — isi cache dengan data hidup (3 simbol)
  for (const s of ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']) {
    const c = await m.getKlines(s)
    if (c.length < 100) throw new Error(`prime gagal ${s}: ${c.length} candle`)
  }
  console.log(`[1] PRIME 3 simbol OK (${Date.now() - t0}ms)`)

  // [2] BAN 6 DETIK — 3 simbol TANPA cache gagal terkendali & membuka pemjaga
  banSampai = Date.now() + 6_000
  const tanpaCache = ['AAVEUSDT', 'LINKUSDT', 'DOTUSDT']
  const hasil = await Promise.all(tanpaCache.map((s) => latar(m.getKlines(s))))
  const terkendali = hasil.every((r) => !r.ok)
  console.log(`[2] saat ban: 3 simbol tanpa-cache gagal terkendali=${terkendali} — contoh galat: ${hasil.find((r) => !r.ok)?.e.slice(0, 60)}`)

  // [2b] SIMBOL ZOMBIE — “龙虾USDT” dulu menghukum pemjaga berulang-ulang
  // (bukti dev.log: gagal ke-4 tidur 41s, ke-5 tidur 268s). Kini harus ditolak
  // INSTAN tanpa menyentuh jaringan dan tanpa membuka pemjaga.
  const tZ = Date.now()
  const zombie = await latar(m.getKlines('龙虾USDT'))
  const zombieCepat = Date.now() - tZ < 50 && !zombie.ok && zombie.e.includes('tanpa-spot')
  console.log(`[2b] simbol zombie ditolak instan=${zombieCepat} (${Date.now() - tZ}ms)`)

  // [3] CADANGAN BASI — simbol ber-cache WAJIB tetap tersaji (dulu: circuit-open!)
  const stale = await latar(m.getKlines('BTCUSDT'))
  const staleOk = stale.ok && stale.v.length >= 100
  const stale4h = await latar(m.getKlines4h('ETHUSDT'))
  console.log(`[3] cadangan-basi: klines BTC=${staleOk} · 4h ETH=${stale4h.ok}`)

  // [4] BULK MULTI-PASS — 3 simbol hilang harus terisi setelah pemjaga pulih
  const tB = Date.now()
  const bulk = await m.getKlinesBulk(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', ...tanpaCache])
  const lengkap = tanpaCache.every((s) => (bulk.get(s)?.length ?? 0) >= 100)
  console.log(`[4] bulk multi-pass lengkap=${lengkap} (${((Date.now() - tB) / 1000).toFixed(1)}s, ukuran=${bulk.size})`)

  // [5] PEMULIHAN PENUH — pemjaga tertutup, data segar mengalir lagi
  m.__ujiPemjagaReset()
  const segar = await m.getKlines('AAVEUSDT')
  console.log(`[5] pemulihan: candle segar=${segar.length}`)

  // [6] REAL BULK 20 SIMBOL SEGAR — bukti ritme per-host tidak memicu ban nyata
  const daftar20 = ['XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'TRXUSDT', 'SUIUSDT', 'BNBUSDT', 'LTCUSDT', 'NEARUSDT', 'APTUSDT', 'OPUSDT', 'ARBUSDT', 'FILUSDT', 'INJUSDT', 'SEIUSDT', 'TIAUSDT', 'RUNEUSDT', 'FETUSDT', 'WIFUSDT', 'PEPEUSDT']
  const tR = Date.now()
  const b20 = await m.getKlinesBulk(daftar20)
  const terisi = daftar20.filter((s) => (b20.get(s)?.length ?? 0) > 0).length
  console.log(`[6] real bulk 20 simbol: terisi=${terisi}/20 (${((Date.now() - tR) / 1000).toFixed(1)}s)`)

  // [7] JALUR FAPI — pindaian futures penuh via antrean fapi
  const fut = await latar(m.getUniverseFutures())
  console.log(`[7] pindaian futures=${fut.ok ? fut.v.length : 'GAGAL: ' + fut.e.slice(0, 60)} pasangan`)

  // [8] SPARKLINE 1H — radar intraday tetap hidup
  const s1 = await latar(m.getKlines1h('BTCUSDT'))
  console.log(`[8] sparkline 1h BTC=${s1.ok ? s1.v.length + ' candle' : 'GAGAL: ' + s1.e.slice(0, 60)}`)

  banSampai = 0
  console.log(`permintaan ke-dalam-ban: ${hitungBan} · SELESAI total ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('UJI GAGAL:', e); process.exit(1) })
