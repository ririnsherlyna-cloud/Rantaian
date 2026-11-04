// Probe cepat: kapakah pacer (gate) benar-benar membatasi paralel?
const g = globalThis as unknown as Record<string, unknown>
let inflight = 0
let maks = 0
;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
  inflight++
  maks = Math.max(maks, inflight)
  await new Promise((r) => setTimeout(r, 60))
  inflight--
  return new Response(JSON.stringify([[1, '1', '1', '1', '1', '1', 1, '1']]), { status: 200 }) as unknown as Response
}) as typeof fetch

const { getKlines } = await import('../src/lib/cyborg/market')
const t0 = Date.now()
await Promise.all(Array.from({ length: 40 }, (_, i) => getKlines(`X${i}USDT`).catch(() => null)))
const durasi = Date.now() - t0
console.log('maks paralel =', maks, '(harus ≤ 8)')
console.log('durasi total =', durasi, 'ms (40 req × 45ms jarak ≈ ≥ 1800ms bila pacer bekerja)')
console.log('__arenaInflight akhir =', g.__arenaInflight)
console.log('__arenaLastStart =', g.__arenaLastStart, 'sekarang =', Date.now())
