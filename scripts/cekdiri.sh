#!/usr/bin/env bash
# ============================================================
# V304 CEK-DIRI ANTI-BANGKAI — protokol tiap awal giliran agent.
# Memastikan: dev server :3000, watchdog, telegram_bot — semua hidup.
# Yang mati dinyalakan via double-fork orphan (PPID 1) agar kebal
# pembersihan pohon sesi agent. Insiden #3 tidak akan terulang diam-diam.
# ============================================================
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bangkit() { # bangkit <pola-pgrep> <perintah-orphan>
  if ! pgrep -f "$1" >/dev/null 2>&1; then
    echo "[CEK-DIRI] $1 MATI → nyalakan (orphan PPID 1)"
    bash -c "$2"
    sleep 1
  else
    echo "[CEK-DIRI] $1 hidup"
  fi
}

port3000() {
  ss -tln 2>/dev/null | grep -q ':3000 ' && { echo "[CEK-DIRI] dev server hidup (:3000)"; return 0; }
  echo "[CEK-DIRI] dev server MATI — watchdog akan bangkitkan (atau nyalakan langsung jika watchdog baru saja nyala)"
  return 1
}

bangkit 'watchdog_server\.sh' "(setsid bash $ROOT/scripts/watchdog_server.sh < /dev/null >> $ROOT/scripts/watchdog.log 2>&1 &)"
bangkit 'telegram_bot\.mjs'   "(setsid node $ROOT/scripts/telegram_bot.mjs < /dev/null >> $ROOT/scripts/telegram_bot.log 2>&1 &)"
port3000 || bangkit 'next dev -p 3000' "(setsid bash -c 'cd $ROOT && npm run dev >> dev.log 2>&1' < /dev/null &)"
echo "[CEK-DIRI] selesai — $(date '+%F %T')"
