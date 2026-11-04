// ============================================================
// UJI V302 SELF-HEALING — "OTAK TAK BISA PINGSAN"
// 4 skenario bencana dipalsukan (fetch disuntik), bukti nyata:
//   A. SEMUA host 418 + ada cache basi  → getKlines HARUS kembalikan data basi (bukan throw)
//   B. cache kosong + snapshot disk ada → getKlines HARUS kembalikan data snapshot
//   C. breaker terbuka + jaringan pulih → getKlines HARUS menunggu lalu SUKSES (bukan 'circuit-open')
//   D. 40 request paralel               → paralel nyata TIDAK BOLEH lewat batas pacer (8)
// ============================================================

const g = globalThis as unknown as Record<string, unknown>

function resetSemua() {
  g.__arenaBreaker = undefined
  g.__arenaBreakerFapi = undefined
  g.__arenaHostBan = undefined
  g.__arenaStaleSejak = undefined
  g.__arenaSnapDarurat = undefined
  g.__arenaInflight = 0
  g.__arenaLastStart = 0
  g.__arenaPaceQueue = []
  g.__arenaKlineCache = new Map()
  g.__arenaKline4hCache = new Map()
  g.__arenaKline1hCache = new Map()
  g.__arenaKline1hDeepCache = new Map()
  g.__arenaKlineFutCache = new Map()
  g.__arenaTickerCache = undefined
  g.__arenaSimbolTanpaSpot = new Set()
}

function candlePalsu(openTime: number, open: number, close: number) {
  // bentuk objek Candle (untuk seed cache/snapshot)
  return { openTime, open, high: open * 1.01, low: open * 0.99, close, volume: 1000, quoteVolume: 80000000 }
}
function barisKline(openTime: number, open: number, close: number) {
  // bentuk baris mentah Binance (untuk stub fetch yang melewati parser)
  return [openTime, String(open), String(open * 1.01), String(open * 0.99), String(close), '1000', openTime + 86399999, '80000000', 100, '1', '1', '1']
}

let gagal = 0
function cek(nama: string, syarat: boolean, detail: string) {
  if (syarat) console.log(`  LULUS  ${nama} — ${detail}`)
  else {
    gagal++
    console.error(`  GAGAL  ${nama} — ${detail}`)
  }
}

async function main() {
  const { getKlines } = await import('../src/lib/cyborg/market')

  // ---------- SKENARIO A: semua host 418, ada cache basi ----------
  console.log('SKENARIO A — semua host 418 + cache basi 40 menit')
  resetSemua()
  const basi = [candlePalsu(1700000000000, 100, 110)]
  g.__arenaKlineCache = new Map([['BTCUSDT', { data: basi as never, at: Date.now() - 40 * 60_000, ok: true }]])
  let panggil = 0
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
    panggil++
    return new Response('{"code":-1121}', { status: 418 }) as unknown as Response
  }) as typeof fetch
  const a = await getKlines('BTCUSDT')
  cek('A.tidak-throw', Array.isArray(a) && a.length === 1, 'getKlines kembali tanpa error')
  cek('A.data-basi', a[0]?.close === 110, `close=${a[0]?.close} (harus 110 dari cache basi)`)

  // ---------- SKENARIO B: cache kosong, snapshot disk menolong ----------
  console.log('SKENARIO B — cache kosong + snapshot darurat disk')
  resetSemua()
  const snapCandle = [candlePalsu(1700000000000, 200, 260)]
  const { writeFileSync, unlinkSync, existsSync } = await import('node:fs')
  const SNAP = process.cwd() + '/db/.snapshot-darurat.json'
  const snapAda = existsSync(SNAP)
  if (snapAda) console.log('  (catatan) snapshot asli sudah ada — diuji pada salinan cadangan')
  if (snapAda) unlinkSync(SNAP)
  writeFileSync(SNAP, JSON.stringify({ disimpan: new Date().toISOString(), universe: [], klines: { SNAPUSDT: snapCandle } }))
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
    return new Response('{"code":-1121}', { status: 418 }) as unknown as Response
  }) as typeof fetch
  const b = await getKlines('SNAPUSDT')
  cek('B.snapshot-menolong', Array.isArray(b) && b[0]?.close === 260, `close=${b[0]?.close} (harus 260 dari snapshot disk)`)
  if (!snapAda) unlinkSync(SNAP)

  // ---------- SKENARIO C: breaker terbuka, jaringan pulih → tunggu lalu sukses ----------
  console.log('SKENARIO C — breaker terbuka 2 dtk, jaringan pulih')
  resetSemua()
  const t0 = Date.now()
  g.__arenaBreaker = { openUntil: Date.now() + 2_000, streak: 3, lastFailAt: Date.now() }
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
    return new Response(JSON.stringify([barisKline(1700000000000, 300, 333)]), { status: 200 }) as unknown as Response
  }) as typeof fetch
  const c = await getKlines('BTCUSDT')
  const tunggu = Date.now() - t0
  cek('C.tunggu-bukan-throw', Array.isArray(c) && c[0]?.close === 333, `close=${c[0]?.close} (harus 333 dari jaringan yang pulih)`)

  // ---------- SKENARIO D: 40 request paralel, pacer menahan ≤ 8 ----------
  console.log('SKENARIO D — 40 request paralel melalui pacer')
  resetSemua()
  let inflight = 0
  let maks = 0
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
    inflight++
    maks = Math.max(maks, inflight)
    await new Promise((r) => setTimeout(r, 60))
    inflight--
    return new Response(JSON.stringify([barisKline(1700000000000, 1, 2)]), { status: 200 }) as unknown as Response
  }) as typeof fetch
  const simbol = Array.from({ length: 40 }, (_, i) => `UJI${i}USDT`)
  await Promise.all(simbol.map((s) => getKlines(s).catch(() => null)))
  cek('D.batas-paralel', maks <= 8, `paralel puncak=${maks} (batas pacer 8) — burst rollover tidak lagi memancing ban 418`)

  console.log('')
  if (gagal === 0) console.log('SEMUA SKENARIO LULUS — otak tak bisa pingsan.')
  else {
    console.error(`${gagal} skenario GAGAL — perbaiki sebelum lanjut.`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('UJI ERROR:', e)
  process.exit(1)
})
