#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# NYALAKAN SERVER MICAPROFITA — sumber tunggal kelahiran server.
# Dipakai oleh: .zscripts/dev.sh (keystone boot platform),
#               scripts/watchdog_server.sh (revive otomatis),
#               tangan agent/manusia.
#
# HUKUM ANTI-OOM (akar kematian server lama):
#   - Mode dev (next dev) memakan 2,2GB+ (turbopack/postcss watcher)
#     di sandbox 4GB → OOM killer menyembelih.
#   - Produksi standalone memakan ±300-600MB → hidup tenang.
#   - Heap node dibatasi 1024MB → GC keras sebelum sistem kehabisan.
#
# Aturan pilih mode:
#   1. Ada .next/standalone/server.js + BUILD_ID → PRODUKSI standalone
#   2. Tidak ada → fallback DEV (agar sandbox baru tetap hidup)
# ═══════════════════════════════════════════════════════════════════
ROOT="${PENJAGA_ROOT:-/home/z/my-project}"
LOG="${SERVER_LOG:-$ROOT/db/server.log}"
cd "$ROOT" || exit 1
mkdir -p "$ROOT/db" 2>/dev/null

# ── HUKUM ADAPTIF (kekebalan platform): jangan pernah percaya angka mati.
# Bila platform memangkas RAM (mis. 4GB → 2GB → 1GB) atau mengubah konvensi
# port, organ ini menghitung ulang sendiri dari lingkungan NYATA saat lahir.
PORT="${PORT:-3000}"
export PORT
MEM_TOTAL_KB="$(awk '/MemTotal/{print $2}' /proc/meminfo 2>/dev/null || echo 4194000)"
HEAP_MB=$(( MEM_TOTAL_KB / 1024 / 4 ))          # 25% RAM utk heap node
[ "$HEAP_MB" -lt 256 ] && HEAP_MB=256           # lantai: masih hidup di RAM kecil
[ "$HEAP_MB" -gt 1024 ] && HEAP_MB=1024         # langit-langit: anti serakah
export NODE_OPTIONS="--max-old-space-size=${HEAP_MB}"

# ── Bunuh sisa proses next lama (ganda dilarang) ───────────────────
pkill -f 'next-server' 2>/dev/null && sleep 1
pkill -f 'next dev' 2>/dev/null && sleep 1
pkill -f 'next/dist/bin/next start' 2>/dev/null && sleep 1
pkill -f 'standalone/server.js' 2>/dev/null && sleep 1
# buka kunci port bila masih menggantung
fuser -k ${PORT}/tcp >/dev/null 2>&1 || true
sleep 1

if [ -f "$ROOT/.next/standalone/server.js" ] && [ -f "$ROOT/.next/BUILD_ID" ]; then
  # ── HUKUM STATIS (WAJIB): Next.js standalone TIDAK menyalin .next/static
  # otomatis saat build. Tanpa salinan ini SEMUA CSS/JS kena 404 → tampilan
  # hancur tanpa warna (bug nyata 26 Okt 2026). Sync murah (cp idempoten).
  if [ -d "$ROOT/.next/static" ]; then
    mkdir -p "$ROOT/.next/standalone/.next/static"
    cp -r "$ROOT/.next/static/." "$ROOT/.next/standalone/.next/static/" 2>/dev/null
  fi
  if [ -d "$ROOT/public" ]; then
    mkdir -p "$ROOT/.next/standalone/public"
    cp -r "$ROOT/public/." "$ROOT/.next/standalone/public/" 2>/dev/null
  fi
  echo "[$(date '+%F %T')] SYNC STATIS: .next/static + public → standalone OK" >> "$LOG"
  echo "[$(date '+%F %T')] LAHIR: produksi standalone (heap ${HEAP_MB}MB dr RAM $((MEM_TOTAL_KB/1024))MB, port ${PORT}) pid=$$" >> "$LOG"
  export NODE_ENV=production
  export NEXT_TELEMETRY_DISABLED=1
  export HOSTNAME=0.0.0.0
  export PENJAGA_ROOT="$ROOT"  # HUKUM STANDALONE: server chdir ke .next/standalone — ROOT wajib dari env
  exec node "$ROOT/.next/standalone/server.js" >> "$LOG" 2>&1
else
  echo "[$(date '+%F %T')] LAHIR: fallback DEV (belum ada build produksi, heap ${HEAP_MB}MB, port ${PORT}) pid=$$" >> "$LOG"
  export NEXT_TELEMETRY_DISABLED=1
  exec node "$ROOT/node_modules/next/dist/bin/next" dev -p "$PORT" >> "$LOG" 2>&1
fi
