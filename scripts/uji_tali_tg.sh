#!/usr/bin/env bash
# UJI TALI — kirim bukti hidup otak V303 ke penerima terdaftar.
# Token dibaca dari .token-telegram (chmod 600) — TIDAK PERNAH dicetak.
set -e
cd /home/z/my-project
TOKEN=$(tr -d '\r\n' < .token-telegram)
CHAT=8340502683
TEXT=$(cat <<'MSG'
🛡️ <b>V303 · TALI HIDUP TERVERIFIKASI</b>

✅ Server hidup kembali (penjaga abadi berjaga)
⚡ Saraf Telegram kini ANTI-LELET: jawaban paralel + indikator "menulis…" segera
⚔️ Laporan koin kini <b>sama persis dengan dasbor web</b> (urutan resmi LOLOS → rank) + tiap koin punya: entry · sasaran · <b>AMBISIUS (q75)</b> · <b>POWER-MAX (q90)</b> · stop · alasan
🔔 Radar jual kini mengawal DUA level: AMBISIUS & POWER-MAX — tersentuh → notif otomatis

Coba kirim: <code>cek BTC</code> atau <code>/laporan</code> — jawab harus cepat.
MSG
)
curl -s -m 15 "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg c "$CHAT" --arg t "$TEXT" '{chat_id:$c, text:$t, parse_mode:"HTML"}')" \
  | jq '{ok, error_code, description}'
