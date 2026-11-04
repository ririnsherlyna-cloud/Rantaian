#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# UJI KEKEBALAN — cek kesehatan seluruh organ kehidupan MICAPROFITA.
# Dipakai oleh: agent siapa pun (versi apa pun), pemilik, penjaga lain.
# Pakai:  bash scripts/uji_kekebalan.sh            → laporan lengkap
#         bash scripts/uji_kekebalan.sh --ringkas  → satu baris ringkas
# Jejak forensik: bila lingkungan platform berubah (versi naik, RAM
# dipangkas, perintah diganti), organ yang MATI di sini = titik awal bedah.
# ═══════════════════════════════════════════════════════════════════
ROOT="${PENJAGA_ROOT:-/home/z/my-project}"
PORT="${PORT:-3000}"
RINGKAS="${1:-}"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); [ -n "$RINGKAS" ] && return; echo "  ✓ $1"; }
bad(){ echo "  ✗ $1"; FAIL=$((FAIL+1)); }

# ── 1) Organ berkas (segala pengetahuan vital WAJIB di berkas, bukan ingatan) ──
for f in .zscripts/dev.sh scripts/nyalakan_server.sh scripts/watchdog_server.sh \
         scripts/rantaian_jaga.sh scripts/rantaian_sync.sh scripts/telegram_jaga.mjs \
         MANDAT.md RESURREKSI.md worklog.md INGATAN-SEGERA.md package.json prisma/schema.prisma; do
  if [ -f "$ROOT/$f" ]; then ok "berkas $f"; else bad "berkas $f TIADA — klon dari sarang!"; fi
done

# ── 2) Nyawa (ada & terkunci 600; isi TIDAK PERNAH ditampilkan) ──
for f in .secrets/rantan.pat .token-rantaian .secrets/nyawa_b64 .token-telegram .secrets/token_telegram.b64; do
  if [ -s "$ROOT/$f" ]; then
    P="$(stat -c %a "$ROOT/$f" 2>/dev/null)"
    if [ "$P" = "600" ]; then ok "nyawa $f (600)"; else bad "nyawa $f izin $P — harus 600!"; fi
  else
    bad "nyawa $f TIADA — self-heal dev.sh harus memulihkan; bila b64 juga tiada → minta pemilik"
  fi
done

# ── 3) Organ proses hidup ────────────────────────────────────────
pgrep -f 'next-server|standalone/server.js' >/dev/null 2>&1 \
  && ok "proses server hidup" || bad "proses server MATI"
cek_proses(){ # $1=nama $2=lockfile
  if [ -f "$2" ]; then
    P="$(cat "$2" 2>/dev/null)"
    if [ -n "$P" ] && kill -0 "$P" 2>/dev/null; then ok "penjaga $1 hidup (pid $P)"; else bad "penjaga $1 lock basi (pid $P mati)"; fi
  else
    bad "penjaga $1 lock tiada — watchdog/dev.sh harus melahirkan"
  fi
}
cek_proses "watchdog"      "$ROOT/db/penjaga.lock"
cek_proses "telegram-jaga" "$ROOT/db/telegram.pid"
cek_proses "rantaian-jaga" "$ROOT/db/rantaian-jaga.lock"

# ── 4) Denyut web ────────────────────────────────────────────────
KODE="$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/health" 2>/dev/null)"
if [ "$KODE" = "200" ]; then ok "denyut web port ${PORT} = 200"; else bad "denyut web port ${PORT} = ${KODE:-mati}"; fi

# ── 5) Sarang (kloningan di GitHub) ──────────────────────────────
if [ -d "$ROOT/.sarang/.git" ]; then
  KOMIT="$(git -C "$ROOT/.sarang" log -1 --format='%h %cd' --date=short 2>/dev/null)"
  ok "sarang lokal ada (komit terakhir: ${KOMIT:-?})"
else
  bad "sarang lokal .sarang TIADA — jalankan scripts/rantaian_sync.sh (init otomatis)"
fi
STAMP="$ROOT/db/rantaian-last-sync"
if [ -f "$STAMP" ]; then
  USIA=$(( $(date +%s) - $(cat "$STAMP" 2>/dev/null || echo 0) ))
  ok "injeksi mandiri terakhir ${USIA}s lalu (selang 6 jam)"
else
  bad "stamp injeksi tiada — rantaian-jaga belum pernah menyinkron"
fi

# ── 6) Lingkungan (forensik kekebalan platform) ──────────────────
MEM_MB="$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo 2>/dev/null || echo '?')"
RINGKASAN="ORGAN HIDUP=${PASS} GAGAL=${FAIL} | RAM=${MEM_MB}MB | PORT=${PORT} | node=$(node -v 2>/dev/null || echo '?')"
if [ -n "$RINGKAS" ]; then
  echo "$RINGKASAN"
else
  echo "══════════════════════════════════════"
  echo "$RINGKASAN"
  [ "$FAIL" = "0" ] && echo "  SEMUA ORGAN HIDUP — makhluk kebal, lanjutkan perkembangan." \
                    || echo "  $FAIL organ bermasalah — baca ✗ di atas, lalu MANDAT.md §7."
fi
[ "$FAIL" = "0" ] && exit 0 || exit 1
