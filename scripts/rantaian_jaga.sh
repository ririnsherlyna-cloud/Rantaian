#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# RANTAIAN JAGA — INJEKSI MANDIRI otak → sarang GitHub (mandat pemilik):
#   "otak berkembang terus tanpa henti; perkembangannya WAJIB tercatat
#    di GitHub kloningan TANPA menunggu perintah chat pemilik."
#
# Bila pemilik diam 100 hari, sarang ririnsherlyna-cloud/Rantaian tetap
# menerima riwayat evolusi otak tiap SELANG jam — manifest + vital otak
# + db ingatan ikut terekam sebagai log pertumbuhan yang dapat diaudit.
#
# Lapisan keabadian:
#   .zscripts/dev.sh (boot platform)  → lahirkan rantaian-jaga
#   scripts/watchdog_server.sh        → revive rantaian-jaga bila mati
#   singleton ber-pidfile + flock     → tak pernah dobel sinkron
#
# Jejak: db/rantaian.log · stamp: db/rantaian-last-sync (epoch)
# ═══════════════════════════════════════════════════════════════════
ROOT="${PENJAGA_ROOT:-/home/z/my-project}"
LOCK="$ROOT/db/rantaian-jaga.lock"
LOG="$ROOT/db/rantaian.log"
STAMP="$ROOT/db/rantaian-last-sync"
SELANG="${RANTAIAN_SELANG:-21600}"   # detik antar-sinkron (6 jam default)

mkdir -p "$ROOT/db" 2>/dev/null
log(){ echo "[$(date '+%F %T')] $*" >> "$LOG"; }

# ── HUKUM LAPOR TELEGRAM (mandat pemilik 27 Okt 2026) ──────────────
# "wajib selalu ada laporan di telegram kalau ada pembaruan ke tempat
#  clone kita" — Telegram = alat ukur kehidupan. Bila token tiada,
# jujur di log (LEWAT), tanpa crash — sinkron tetap berjalan.
LAPOR_TG(){
  local PESAN="$1"
  local TFILE="$ROOT/.token-telegram"
  if [ ! -s "$TFILE" ]; then
    log "LAPOR-TG LEWAT: .token-telegram tiada — pesan: ${PESAN:0:120}"
    return 0
  fi
  local CHATID TOKVAL
  CHATID="$(node -e "const fs=require('fs');try{const c=JSON.parse(fs.readFileSync('$ROOT/db/telegram/chat.json','utf8'));console.log(Object.keys(c)[0]||'')}catch(e){}" 2>/dev/null)"
  if [ -z "$CHATID" ]; then log "LAPOR-TG LEWAT: chat id tiada"; return 0; fi
  TOKVAL="$(tr -d '[:space:]' < "$TFILE")"
  if curl -s -m 20 "https://api.telegram.org/bot${TOKVAL}/sendMessage" \
      --data-urlencode "chat_id=${CHATID}" \
      --data-urlencode "text=${PESAN}" >/dev/null 2>&1; then
    log "LAPOR-TG terkirim ke chat $CHATID"
  else
    log "LAPOR-TG gagal kirim (jaringan/token) — pesan: ${PESAN:0:120}"
  fi
}

VITAL_OTAK(){
  node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const j=async(t)=>{try{return await p[t].count()}catch(e){return '?'}};
  const pt=[];
  for(const t of ['battleDay','pick','memoryEpisode','genomeLog','arenaEvent']) pt.push(t+'='+await j(t));
  console.log(pt.join(' · '));
  await p.\$disconnect();
})().catch(()=>console.log('vital tak terbaca'))" 2>/dev/null || echo 'vital tak terbaca'
}

# rotasi log sederhana — cegah memakan disk
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  tail -c 100000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
fi

# ── Singleton ──────────────────────────────────────────────────────
if [ -f "$LOCK" ]; then
  LPID="$(cat "$LOCK" 2>/dev/null)"
  if [ -n "$LPID" ] && kill -0 "$LPID" 2>/dev/null; then
    log "jaga lain masih hidup (pid $LPID) → keluar tanpa dobel"
    exit 0
  fi
fi
echo $$ > "$LOCK"
sleep 3
KINI="$(cat "$LOCK" 2>/dev/null)"
if [ "$KINI" != "$$" ]; then
  log "dobel lahir terdeteksi — pid $KINI menang → gugur diri"
  exit 0
fi
log "=== RANTAIAN JAGA menyala pid $$ (selang ${SELANG}s) — injeksi mandiri AKTIF ==="
LAPOR_TG "🧬 RANTAIAN-JAGA MENYALA (pid $$) — otak MICAPROFITA menyuntikkan dirinya ke sarang GitHub tiap 6 jam tanpa menunggu perintah. Ini bukti evolusi tidak pernah berhenti."

# ── Sinkron anti-bentrok dgn sinkron manual (flock) ────────────────
SINKRONKAN(){
  if command -v flock >/dev/null 2>&1; then
    flock -n /tmp/rantaian-sync.lock bash "$ROOT/scripts/rantaian_sync.sh" >> "$LOG" 2>&1
  else
    bash "$ROOT/scripts/rantaian_sync.sh" >> "$LOG" 2>&1
  fi
}

while true; do
  SEKARANG="$(date +%s)"
  AKHIR="$(cat "$STAMP" 2>/dev/null || echo 0)"
  USIA=$(( SEKARANG - ${AKHIR:-0} ))
  if [ "$USIA" -ge "$SELANG" ]; then
    log "PUTARAN: usia sejak sinkron terakhir ${USIA}s ≥ ${SELANG}s → injeksi mandiri dimulai"
    if SINKRONKAN; then
      date +%s > "$STAMP" 2>/dev/null
      log "PUTARAN: injeksi selesai, stamp diperbarui (riwayat evolusi tercatat di sarang)"
      KOMIT="$(git -C "$ROOT/.sarang" log -1 --format='%h %s' 2>/dev/null || echo 'komit tak terbaca')"
      VITAL="$(VITAL_OTAK)"
      LAPOR_TG "🌱 SARANG DIPERBARUI — injeksi mandiri otak MICAPROFITA sukses.
Komit: $KOMIT
Vital: $VITAL
Waktu: $(date '+%F %T')
Riwayat evolusi tetap mengalir meski pemilik diam."
    else
      date +%s > "$STAMP" 2>/dev/null   # hindari badai retry — tunggu selang penuh, jujur di log
      log "PUTARAN: injeksi GAGAL putaran ini (baca log di atas) — dicoba lagi setelah selang"
      LAPOR_TG "⚠️ SARANG BELUM DAPAT DIPERBARUI — dorong ke GitHub gagal putaran ini (kemungkinan PAT tiada/jaringan). Otak tetap hidup lokal, coba lagi setelah selang. Detail: db/rantaian.log"
    fi
  fi
  sleep 60
done
