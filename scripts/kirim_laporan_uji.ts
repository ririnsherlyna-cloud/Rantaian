import { laporanPagiTeks } from '../src/lib/cyborg/tg_kartu'
import { kirimTg } from '../src/lib/cyborg/tg'
const teks = await laporanPagiTeks()
const ok = await kirimTg(8340502683, '🧪 <b>PRATINJAU LAPORAN BARU (uji tali)</b>\n\n' + teks)
console.log('kirim:', ok, '· panjang:', teks.length)
process.exit(ok ? 0 : 1)
