// UJI V304 — formatter harga (bug PEPE) + sintaks telegram_jaga.mjs
const rp = (x) => {
  if (typeof x !== 'number' || !isFinite(x)) return '—'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1000) return x.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (a >= 1) return String(+x.toFixed(4))
  return x.toPrecision(6).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}
const kasus = [
  [0.00000432, '0.00000432'],   // PEPE entry (dulu "0")
  [0.000004354375, '0.00000435438'], // PEPE target (dulu "0")
  [0.00000448805, '0.00000448805'],  // PEPE ambisius (dulu "0")
  [0.00000366943, '0.00000366943'],  // PEPE stop (dulu "0")
  [24.806, '24.806'],           // VVV entry
  [1.0005, '1.0005'],           // U entry
  [109123.4567, '109,123.46'],  // BTC
  [0.5, '0.5'],
  [1.0, '1'],
  [null, '—'],
  [0, '0'],
]
let gagal = 0
for (const [masuk, harap] of kasus) {
  const hasil = rp(masuk)
  const ok = hasil === harap
  if (!ok) gagal++
  console.log(`${ok ? '✓' : '✗ GAGAL'} rp(${masuk}) = "${hasil}" (harap "${harap}")`)
}
console.log(gagal === 0 ? '\nSEMUA FORMATTER LOLOS' : `\n${gagal} KASUS GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
