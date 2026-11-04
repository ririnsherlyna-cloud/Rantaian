// UJI FORMAT LAPORAN PAGI — jalankan otak langsung (tanpa kirim).
// Bun menjalankan TS ini langsung; alias @ dibaca dari tsconfig.
import { laporanPagiTeks } from '../src/lib/cyborg/tg_kartu'

const teks = await laporanPagiTeks()
const baris = teks.split('\n')
console.log(`panjang=${teks.length} char · baris=${baris.length} · pesan-dipecah=${Math.ceil(teks.length / 3800)}`)
console.log('--- KEPALA ---')
console.log(baris.slice(0, 12).join('\n'))
console.log('--- CONTOH 2 KOIN ---')
console.log(baris.slice(12, 18).join('\n'))
process.exit(0)
