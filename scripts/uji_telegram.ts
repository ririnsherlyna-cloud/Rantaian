// UJI PIPELINE TELEGRAM V304 — tanpa server: panggil langsung modul jadwal.
// Menguji: DB picks hari ini + bangun laporan pagi + siren (tanpa chat = 0 kirim) + token.
import { bacaTokenTg } from '../src/lib/telegram/gateway'
import { bangunLaporanPagi, periksaSiren, picksHariIni } from '../src/lib/telegram/jadwal'

async function main() {
  const tok = bacaTokenTg()
  console.log('token telegram:', tok ? `ADA (${tok.length} kar)` : 'TIDAK ADA')

  const hariUtc = new Date().toISOString().slice(0, 10)
  const picks = await picksHariIni(hariUtc)
  console.log('battleDay:', picks ? `${picks.day} ${picks.regime} ${picks.status} — ${picks.picks.length} pick` : 'BELUM ADA')
  if (picks && picks.picks[0]) {
    const p = picks.picks[0]
    console.log('pick #1:', p.symbol, p.direction, p.confidence + '%', '| ambisius:', p.rencana?.highAmbisius ?? '—')
  }

  const rep = await bangunLaporanPagi()
  console.log('laporan siap:', rep.siap, rep.alasan ? `(${rep.alasan})` : '')
  if (rep.siap) {
    console.log('panjang laporan:', rep.html.length, 'karakter')
    console.log('cuplikan awal:', rep.html.slice(0, 220).replace(/<[^>]+>/g, ''))
  }

  // uji format dgn data kemarin (bila ada) — validasi parsing rencana
  const kemarin = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const pKemarin = await picksHariIni(kemarin)
  if (pKemarin && pKemarin.picks.length > 0) {
    const p = pKemarin.picks[0]
    const r = p.rencana
    console.log(`sampel baris kemarin ${pKemarin.day}:`, p.symbol, p.direction, `kon ${p.confidence}%`, '| masuk', p.entryClose, '| ambisius', r?.highAmbisius, `(P ${r?.pAmbisius})`)
  }

  const siren = await periksaSiren()
  console.log('siren berbunyi:', siren, '(0 = wajar, belum ada chat terdaftar / belum ada yang tersentuh)')

  process.exit(0)
}

main().catch((e) => { console.error('UJI GAGAL:', e); process.exit(1) })
