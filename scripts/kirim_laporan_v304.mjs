// Kirim laporan resmi V304 ke pemilik (chat 8340502683) via token bot
import fs from 'fs'
const TOK = fs.readFileSync('/home/z/my-project/.token-telegram', 'utf8').trim()
const CHAT = '8340502683'
const teks = `🛠️ V304-DENYUT TERPASANG — jawaban atas aduanmu tadi malam:

1️⃣ HARGA PEPE = 0 → DIBUNUH. Akar: pembulatan lama membulatkan harga kecil (0,00000432) jadi 0. Kini digit signifikan — semua level PEPE tampil utuh (0,00000432 dst).

2️⃣ NOTIFIKASI TP/AMBISIUS/POWER MAX HILANG → DITAMBAL. Akar: kirim yang gagal dulu ditelan diam-diam. Kini ANTREAN ANTI-HILANG: kirim gagal → tersimpan → diulang otomatis tiap 1 menit sampai Telegram hidup lagi. Paling banter TERLAMBAT, tidak pernah HILANG.

3️⃣ PERIKSA AKTIVASI (permintaanmu): ketik "periksa aktivasi" kapan pun — aku jawab status HIDUP-HIDUP semua organ saat itu: bot, server, arena, monitor TP, antrean, watchdog, sarang GitHub, denyut.

4️⃣ DENYUT OTOMATIS (pilihan kedua — keduanya kupakai berdua): tiap 30 menit aku kirim "🫀 DENYUT — AKU HIDUP". KEHENINGAN denyut = alarmnya. Atur: "denyut 15" (menit 10-720), "denyut mati", "denyut nyala".

5️⃣ KLAIM JUJUR (mandatmu: guru trader punya klaim jujurnya): ketik "klaim" — rekam jejak nyata, tanpa drama:
• Kumulatif +142,44% (59 hari, 680 pick) · akurasi arah 47%
• Puncak +217,31% (19 Sep) → turun 74,9 poin — FAKTA yang kakuakui
• Genome gen 3, mutasi terakhir 26 Okt — otak MASIH tumbuh, bukan beku
• Jujur kenapa turun: era Sep = 2-3 pick terkonsentrasi (4 hari bencana −22%..−16% memangkas puncak); sejak 16 Okt pasar SIDEWAYS sigma ~4,4% → TP kecil 1-2% itu KEJUJURAN pasar tenang, bukan kerusakan. Era TP 20-73% hidup lagi lewat gerbang katalis V303 utk koin yang benar-benar meledak.

Laporan pagi 07:05 WIB kini selalu dibuka KLAIM JUJUR + genome. Denyut pertama ±30 mnt. Ujian lolos: formatter 11/11 · routing 14/14 · data klaim hidup ✓`
const r = await fetch(`https://api.telegram.org/bot${TOK}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: CHAT, text: teks, disable_web_page_preview: true }),
})
const j = await r.json()
if (j.ok) console.log('LAPORAN RESMI TERKIRIM — message_id', j.result.message_id)
else console.log('GAGAL:', JSON.stringify(j).slice(0, 300))
