import { tanamRencanaKurang } from '../src/lib/cyborg/penanam_rencana'
console.log('>> mulai panggil tanamRencanaKurang')
const t0 = Date.now()
const n = await tanamRencanaKurang(3)
console.log(`>> hasil=${n} dalam ${Math.round((Date.now()-t0)/1000)}s`)
process.exit(0)
