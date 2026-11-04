#!/usr/bin/env python3
# ============================================================
# V303 — GENERATOR PENJAGA-TANAM.
# Menanam ulang organ penjaga abadi bila dimakan gulung-balik.
# Template diambil DARI FILE HIDUP saat generator dijalankan —
# jadi template selalu sinkron dengan kode nyata (nol desinkron).
#
# Pemakaian:
#   python3 scripts/buat_penjaga_tanam.py   # regen scripts/penjaga_tanam.sh
#   bash scripts/penjaga_tanam.sh           # tanam ulang trio
#   bash scripts/penjaga_tanam.sh --hidupkan  # tanam + pastikan hidup
# ============================================================
import pathlib

ROOT = pathlib.Path("/home/z/my-project")

ORGAN = [
    ("src/instrumentation.ts", "V303_INSTR"),
    ("src/app/api/health/route.ts", "V303_HEALTH"),
    ("scripts/watchdog_server.sh", "V303_WD"),
]

blok = []
for rel, tag in ORGAN:
    isi = (ROOT / rel).read_text()
    blok.append(f"cat > \"$PROJEK/{rel}\" <<'{tag}'\n{isi}\n{tag}")
tanaman = "\n\n".join(blok)

sh = f'''#!/usr/bin/env bash
# ============================================================
# V303-PENJAGA-ABADI (L3) — penanam ulang organ (anti-gulung-balik).
# DIHASILKAN OTOMATIS oleh scripts/buat_penjaga_tanam.py dari file
# hidup — jangan edit manual; regen saja setelah mengubah organ.
# ============================================================
PROJEK="/home/z/my-project"
mkdir -p "$PROJEK/scripts" "$PROJEK/.log"
echo "[tanam] menanam ulang organ penjaga V303..."

{tanaman}

chmod +x "$PROJEK/scripts/watchdog_server.sh" "$PROJEK/scripts/penjaga_tanam.sh"
echo "[tanam] organ tertanam: instrumentation.ts · health route · watchdog_server.sh"

if [ "$1" = "--hidupkan" ]; then
  echo "[tanam] memastikan penjaga & server hidup..."
  # penjaga luar-proses (lockfile mencegah kembar)
  if ! pgrep -f "watchdog_server.sh" >/dev/null 2>&1; then
    ( cd "$PROJEK" && nohup bash scripts/watchdog_server.sh >/dev/null 2>&1 & )
    echo "[tanam] watchdog dihidupkan"
  fi
  # server (dev tee dev.log)
  if ! curl -sf -m 8 http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "[tanam] server tak merespon — menghidupkan..."
    pkill -f "next dev -p 3000" 2>/dev/null
    sleep 2
    ( cd "$PROJEK" && nohup npm run dev > "$PROJEK/.log/revive.out" 2>&1 & )
    echo "[tanam] server dihidupkan — tunggu ~30 dtk lalu cek /api/health"
  else
    echo "[tanam] server sudah hidup"
  fi
fi
'''

out = ROOT / "scripts" / "penjaga_tanam.sh"
out.write_text(sh)
out.chmod(0o755)
print(f"[generator] {out} ditulis ({len(sh.splitlines())} baris)")
