import { tanamRencanaKurang } from '../src/lib/cyborg/penanam_rencana'
let total = 0
for (let i = 0; i < 12; i++) {
  const n = await tanamRencanaKurang(10)
  total += n
  if (n === 0) break
  await new Promise((r) => setTimeout(r, 1500))
}
console.log('>> total tertanam:', total)
process.exit(0)
