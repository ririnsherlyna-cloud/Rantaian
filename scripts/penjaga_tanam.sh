#!/usr/bin/env bash
# ============================================================
# V303-PENJAGA-ABADI (L3) — penanam ulang organ (anti-gulung-balik).
# DIHASILKAN OTOMATIS oleh scripts/buat_penjaga_tanam.py dari file
# hidup — jangan edit manual; regen saja setelah mengubah organ.
# ============================================================
PROJEK="/home/z/my-project"
mkdir -p "$PROJEK/scripts" "$PROJEK/.log"
echo "[tanam] menanam ulang organ penjaga V303..."

cat > "$PROJEK/src/instrumentation.ts" <<'V303_INSTR'
// ============================================================
// V303-PENJAGA-ABADI — Instrumentation (L1, edge-safe minimal).
//
// Turbopack mem-parse berkas ini untuk DUA runtime (nodejs+edge);
// API Node apa pun di sini memicu warning Edge Runtime. Karena itu
// SEMUA organ nafas dipindah ke jalur "NAPAS-LEWAT-HEALTH":
//   • /api/health dipanggil watchdog tiap 15 dtk → memicu
//     ensureArena + tgLoop + radarJualAmbisius + spawn watchdog
//   • watchdog_server.sh (L2): self-heal organ + revive server
//   • penjaga_tanam.sh (L3): satu-perintah menanam ulang organ
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const gp = globalThis as unknown as { __v303Penjaga?: boolean }
  if (gp.__v303Penjaga) return
  gp.__v303Penjaga = true
  console.log('[V303] PENJAGA ABADI menyala — napas lewat /api/health (watchdog memicu tiap 15 dtk)')
}

V303_INSTR

cat > "$PROJEK/src/app/api/health/route.ts" <<'V303_HEALTH'
// ============================================================
// V303-PENJAGA — Health endpoint = PINTU NAPAS OTAK.
//
// Dipanggil siapa pun (watchdog, UI, agent) → otak bernafas:
//   1. mulaiNafas(): denyut arena + radar-jual + Telegram dalam-proses
//   2. self-heal organ trio (hilang → tanam ulang via penjaga_tanam.sh)
//   3. spawn penjaga luar-proses (bila lingkungan membiarkan hidup)
// 200 = proses hidup (wajib tetap 200 walau DB lelah — flag jujur).
// ============================================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mulaiNafas } from '@/lib/cyborg/nafas'

export const dynamic = 'force-dynamic'

const gp = globalThis as unknown as { __v303Heal?: boolean }

export async function GET() {
  const t0 = Date.now()

  // ---- (1) NAPAS OTAK dalam-proses (idempoten) ----
  try { mulaiNafas() } catch { /* non-vital */ }

  // ---- (2)+(3) self-heal & penjaga luar — sekali per proses ----
  if (!gp.__v303Heal) {
    gp.__v303Heal = true
    try {
      const fs = await import('node:fs')
      const path = await import('node:path')
      const organ = ['scripts/penjaga_tanam.sh', 'scripts/watchdog_server.sh', 'src/instrumentation.ts', 'src/app/api/health/route.ts']
      const hilang = organ.filter((f) => !fs.existsSync(path.join(process.cwd(), f)))
      if (hilang.length > 0) {
        console.warn(`[V303] organ penjaga hilang: ${hilang.join(', ')} — menanam ulang`)
        const cp = await import('node:child_process')
        await new Promise<void>((res) => cp.execFile('bash', ['scripts/penjaga_tanam.sh'], { cwd: process.cwd() }, () => res()))
      }
    } catch { /* non-vital */ }
    try {
      const cp = await import('node:child_process')
      cp.spawn('bash', [process.cwd() + '/scripts/watchdog_server.sh'], { detached: true, stdio: 'ignore' }).unref()
      console.log('[V303] penjaga luar-proses dihidupkan (lewat pintu napas)')
    } catch { /* non-vital */ }
  }

  // ---- STATUS DENYUT (jujur) ----
  let dbStatus = 'gagal'
  let arenaToday: string | null = null
  let lag: string | null = null
  let status = 'belum'
  try {
    const rows = await db.meta.findMany({
      where: { key: { in: ['arenaToday', 'arenaDataLag', 'bootstrapStatus'] } },
    })
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    arenaToday = m.arenaToday ?? null
    lag = m.arenaDataLag ?? null
    status = m.bootstrapStatus ?? 'belum'
    dbStatus = 'hidup'
  } catch { /* DB bermasalah — tetap 200, flag jujur */ }

  let telegram = 'gagal-cek'
  try {
    const { tgAktif } = await import('@/lib/cyborg/tg')
    telegram = tgAktif() ? 'aktif' : 'kosong'
  } catch { /* non-vital */ }

  return NextResponse.json({
    ok: true,
    svc: 'V303-PENJAGA',
    db: dbStatus,
    arena: { today: arenaToday, lagHari: lag, status },
    telegram,
    ts: new Date().toISOString(),
    ms: Date.now() - t0,
  })
}

V303_HEALTH

cat > "$PROJEK/scripts/watchdog_server.sh" <<'V303_WD'
#!/usr/bin/env bash
# ============================================================
# V303-PENJAGA-ABADI (L2) — Watchdog LUAR-PROSES.
# Proses server boleh mati; penjaga ini yang membangkitkan lagi.
#   • tiap 15 dtk: cek /api/health — 3x gagal → revive server
#   • tiap 4 tik (~1 menit): pastikan organ vital ada; hilang →
#     tanam ulang via penjaga_tanam.sh (anti-gulung-balik)
#   • lockfile mencegah penjaga kembar
# Log: /home/z/my-project/.log/watchdog.log
# ============================================================
PROJEK="/home/z/my-project"
TANAM="$PROJEK/scripts/penjaga_tanam.sh"
LOCK="$PROJEK/.penjaga-watchdog.lock"
LOG="$PROJEK/.log/watchdog.log"
mkdir -p "$PROJEK/.log"

# satu penjaga saja
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  exit 0
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

catat() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }
catat "PENJAGA ABADI menyala (pid $$)"

GAGAL=0
TIK=0
while true; do
  TIK=$((TIK + 1))

  # (1) self-heal organ vital — organnya dimakan rollback? tanam ulang.
  if [ $((TIK % 4)) -eq 0 ]; then
    for organ in "src/instrumentation.ts" "src/app/api/health/route.ts" "scripts/watchdog_server.sh" "scripts/penjaga_tanam.sh"; do
      if [ ! -f "$PROJEK/$organ" ]; then
        catat "organ hilang: $organ — menanam ulang via penjaga_tanam.sh"
        if [ -f "$TANAM" ]; then
          bash "$TANAM" >> "$LOG" 2>&1 || catat "penanaman ulang galat"
        else
          catat "FATAL: penjaga_tanam.sh juga hilang — hanya tersisa L1/ingatan"
        fi
        break
      fi
    done
  fi

  # modul Telegram hilang? catat SEKALI (penanamannya lewat ingatan agent/replika)
  if [ ! -f "$PROJEK/src/lib/cyborg/tg.ts" ] && [ ! -f "$PROJEK/.log/flag_modul_hilang" ]; then
    catat "MODUL TELEGRAM hilang — perlu penanaman ulang oleh agent (ingatan/replika)"
    touch "$PROJEK/.log/flag_modul_hilang"
  fi
  if [ -f "$PROJEK/.log/flag_modul_hilang" ] && [ -f "$PROJEK/src/lib/cyborg/tg.ts" ]; then
    rm -f "$PROJEK/.log/flag_modul_hilang"
    catat "MODUL TELEGRAM kembali hidup"
  fi

  # (2) denyut health — server mati? hidupkan lagi.
  if curl -sf -m 10 http://localhost:3000/api/health >/dev/null 2>&1; then
    GAGAL=0
  else
    GAGAL=$((GAGAL + 1))
    catat "health gagal (#$GAGAL)"
    if [ "$GAGAL" -ge 3 ]; then
      catat "REVIVE — menghidupkan ulang server..."
      pkill -f "next dev -p 3000" 2>/dev/null
      sleep 1
      pkill -f "next-server" 2>/dev/null
      sleep 2
      ( cd "$PROJEK" && nohup bun run dev > "$PROJEK/.log/revive.out" 2>&1 & )
      catat "server dihidupkan ulang — menunggu 30 dtk"
      sleep 30
      GAGAL=0
    fi
  fi

  sleep 15
done


V303_WD

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
    ( cd "$PROJEK" && nohup bun run dev > "$PROJEK/.log/revive.out" 2>&1 & )
    echo "[tanam] server dihidupkan — tunggu ~30 dtk lalu cek /api/health"
  else
    echo "[tanam] server sudah hidup"
  fi
fi
