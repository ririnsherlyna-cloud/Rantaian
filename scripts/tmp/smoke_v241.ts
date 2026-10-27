// SMOKE TEST ORGAN V241 (headless bun):
//   1. self-test organ
//   2. EKIVALENSI HASH: entri rantai organ (dihash implementasi
//      JS organ) diverifikasi ULANG memakai implementasi TS
//      prareg.ts — dua implementasi independen harus setuju.
//   3. denyut + prakiraKunci hidup tanpa jaringan.
import { kanonikal, sha256Hex } from '../../src/lib/exam/prareg'

const organ = require('/home/z/my-project/scripts/v241_nadi.js')
console.log('nama:', organ.nama, 'versi:', organ.versi)

// 1) self-test
const st = await organ.selfTest()
console.log('selfTest:', st.pass + '/' + st.total)
for (const r of st.rincian) console.log('  ' + r)

// 2) ekivalensi lintas-implementasi
organ.denyutkanSekarang()
const entri = await organ.prakiraKunci('BTCUSDT', 'NAIK', 65000.5, 'uji ekivalensi headless')
const payload: Record<string, unknown> = { ...entri }
delete payload.hash
delete payload.prev
payload.prev = entri.prev
const hashTs = sha256Hex(kanonikal(payload))
console.log('hash organ:', entri.hash.slice(0, 20), '…')
console.log('hash TS   :', hashTs.slice(0, 20), '…')
console.log('EKIVALEN  :', entri.hash === hashTs ? 'YA ✓ (organ JS ≡ prareg.ts)' : 'TIDAK ✗')
if (entri.hash !== hashTs) { console.log('payload:', JSON.stringify(payload)); process.exit(1) }

// 3) status
await new Promise((r) => setTimeout(r, 200))
console.log('status:', JSON.stringify(organ.status()).slice(0, 220))
process.exit(0)
