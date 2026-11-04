// Uji mini logika V262-EVO-BUFFER — replika persis blok patch
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const DIM_ARAH = ['struktur', 'momentum', 'sr', 'tekanan', 'perubahan']
const GENOME_AWAL = { struktur: 0.2443, momentum: 0.2588, sr: 0.1629, tekanan: 0.1813, perubahan: 0.1526 }
const genome = { ...GENOME_AWAL }
const semuaGenome = { NAIK: { bobot: { ...GENOME_AWAL }, generasi: 6, belajar: 94, diperbarui: null } }
const rezimGlobal = 'NAIK'
const kaizen = { evoBuf: [] }

function siklus(dinilaiBaru, ISO) {
  let evolusiCatatan = `menunggu buffer 3 dinilai — saat ini ${(kaizen.evoBuf.length + dinilaiBaru.filter((e) => e.jalur !== 'PHOENIX').length) % 299}/3`
  for (const e of dinilaiBaru) if (e.jalur !== 'PHOENIX') kaizen.evoBuf.push({ bukti: e.bukti, arah: e.arah, status: e.status })
  if (kaizen.evoBuf.length > 300) kaizen.evoBuf = kaizen.evoBuf.slice(-300)
  if (kaizen.evoBuf.length >= 3) {
    const kom = kaizen.evoBuf.splice(0, kaizen.evoBuf.length)
    for (const k of DIM_ARAH) {
      const agree = kom.reduce((a, e) => a + (e.bukti[k] ?? 0) * (e.arah === 'BUY' ? 1 : -1) * (e.status === 'BENAR' ? 1 : -1), 0) / kom.length
      const lama = genome[k] ?? GENOME_AWAL[k]
      genome[k] = clamp(lama * (1 + 0.15 * agree), 0.05, 0.40)
    }
    const total = DIM_ARAH.reduce((a, k) => a + genome[k], 0)
    for (const k of DIM_ARAH) genome[k] = +(genome[k] / total).toFixed(4)
    semuaGenome[rezimGlobal].generasi += 1
    semuaGenome[rezimGlobal].belajar += kom.length
    semuaGenome[rezimGlobal].diperbarui = ISO
    evolusiCatatan = `generasi ${semuaGenome[rezimGlobal].generasi} rezim ${rezimGlobal}: bobot disesuaikan dari ${kom.length} vonis nyata`
  }
  return evolusiCatatan
}

const bukti = { struktur: 0.5, momentum: 0.4, sr: 0.3, tekanan: 0.2, perubahan: 0.1 }
const e1 = { jalur: 'ARAH', bukti, arah: 'BUY', status: 'BENAR' }
const e2 = { jalur: 'ARAH', bukti, arah: 'BUY', status: 'SALAH' }

console.log('s1:', siklus([e1], 'ISO-1'))   // buffer 1
console.log('s2:', siklus([e2], 'ISO-2'))   // buffer 2
console.log('s3:', siklus([e1, e2], 'ISO-3')) // buffer 4 -> evolusi (4 sampel), buffer 0
console.log('s4:', siklus([e1], 'ISO-4'))   // buffer 1
console.log('s5:', siklus([], 'ISO-5'))     // buffer 1, tanpa dinilai baru
console.log('s6:', siklus([e1, e2], 'ISO-6')) // buffer 3 -> evolusi
console.log('generasi:', semuaGenome.NAIK.generasi, '(harus 8)')
console.log('belajar:', semuaGenome.NAIK.belajar, '(harus 94+4+3=101)')
console.log('bobot sum:', DIM_ARAH.reduce((a, k) => a + genome[k], 0).toFixed(4), '(harus 1.0000)')
if (semuaGenome.NAIK.generasi !== 8 || semuaGenome.NAIK.belajar !== 101) { console.error('GAGAL'); process.exit(1) }
console.log('UJI LOGIKA LULUS')
