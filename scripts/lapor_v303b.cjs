// Lapor langsung ke pemilik: hasil telaah + pengembangan V303b POWER MAX
const fs = require('fs')
const path = require('path')
const ROOT = '/home/z/my-project'
const TOK = fs.readFileSync(path.join(ROOT, '.token-telegram'), 'utf8').trim()
const CHAT = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'db/telegram/chat.json'), 'utf8')))

async function kirim(chatId, teks) {
  const r = await fetch(`https://api.telegram.org/bot${TOK}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: teks, disable_web_page_preview: true }),
  })
  const j = await r.json().catch(() => ({}))
  return j.ok === true
}

const PESAN = `🔍 TELAAH TP KECIL + PENGEMBANGAN V303b — jawaban jujur atas pertanyaan pemilik

1️⃣ PRINSIP MASIH DIPEGANG, POWER MAX KINI JADI ORGAN SENDIRI
• JUAL AMBISIUS (q75 Monte Carlo): saat tersentuh, hanya 25% lintasan yang pernah lebih tinggi → harga terlentang, dipastikan turun kemudian. Tetap seperti semula.
• JUAL POWER MAX AMBISIUS: sebelumnya CUMA LABEL yang menempel di level ambisius yang sama (di UI & Telegram). Kini organ sendiri: q90 + GERBANG PRAKIRA NYATA — hanya diterbitkan bila volume menyala (≥1,2× rata), momentum searah, atau magnet VP di atas ambisius. Bila tercapai: hanya ~10% lintasan pernah setinggi itu → puncak butuh nafas panjang, terjun diperkirakan. Tanpa prakira nyata → jujur "tak ada power max, ambisius adalah atap".

2️⃣ KENAPA TP SEKARANG KECIL (med 1,5% vs era 20-35%)?
• FAKTA PASAR: era TP besar (30 Sep-10 Okt) hanya 2 pick/hari di koin paling gila, σ-volatilitas 24j ~20-25%. Kini arena 50 koin se-luas-luasnya, σ median cuma 4,4% → TP 1,5-2% untuk koin tenang itu JUJUR, bukan rusak. (Cek Binance: BTC/ETH/PEPE/ZEC realvol stabil — bedanya UNIVERSE, bukan vol mayor.)
• CACAT OTAK YANG SUDAH DIBUNUH: (a) 23-46% target jatuh ke fallback MEDIAN MC yang kecil by-definition → kini ada GERBANG KATALIS: koin yang sedang meledak nyata (volume ≥2× + momentum searah) boleh bawa magnet jauh jadi TP walau peluang MC <38% — TP besar kembali lahir di koin berbakat, tanpa fantasi; (b) BUG CERMIN SELL ditemukan & diperbaiki: ambisius SELL lama memakai kuantil terbalik → level dangkal, bahkan di bawah TP sendiri (contoh: GTC SELL ambisius 1,6% < TP 4,4%). 32 baris hari ini diselaraskan + diberi tanda transparan.

3️⃣ BUKTI HIDUP HARI INI (50 koin, data Binance nyata):
• 30 koin kini punya POWER MAX — contoh SYN +14,6% (sentuh 12%), CHIP +13,2%, BMT +22,6%, BATUSDT SELL -16,5% (sentuh 7%).
• 19 koin jujur tanpa power max (tak ada prakira nyata).
• Reproduksi MC pra-kunci: 49/50 PRESISI (0 gagal) — level terkunci tak digeser satu pun.

Server produksi hidup kembali, preview menampilkan tangga: Entry → TP → JUAL AMBISIUS → POWER MAX → Stop, lengkap dengan peluang sentuh masing-masing.`

async function main() {
  for (const id of CHAT) {
    const ok = await kirim(id, PESAN)
    console.log(`chat ${id}: ${ok ? 'TERKIRIM' : 'GAGAL'}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
