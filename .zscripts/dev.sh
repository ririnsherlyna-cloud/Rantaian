#!/bin/bash

set -euo pipefail

# 获取脚本所在目录（.zscripts）
# 使用 $0 获取脚本路径（与 build.sh 保持一致）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_step_start() {
        local step_name="$1"
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
        echo "=========================================="
        export STEP_START_TIME
        STEP_START_TIME=$(date +%s)
}

log_step_end() {
        local step_name="${1:-Unknown step}"
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - STEP_START_TIME))
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
        echo "[LOG] Step: $step_name | Duration: ${duration}s"
        echo "=========================================="
        echo ""
}

start_mini_services() {
        local mini_services_dir="$PROJECT_DIR/mini-services"
        local started_count=0

        log_step_start "Starting mini-services"
        if [ ! -d "$mini_services_dir" ]; then
                echo "Mini-services directory not found, skipping..."
                log_step_end "Starting mini-services"
                return 0
        fi

        echo "Found mini-services directory, scanning for sub-services..."

        for service_dir in "$mini_services_dir"/*; do
                if [ ! -d "$service_dir" ]; then
                        continue
                fi

                local service_name
                service_name=$(basename "$service_dir")
                echo "Checking service: $service_name"

                if [ ! -f "$service_dir/package.json" ]; then
                        echo "[$service_name] No package.json found, skipping..."
                        continue
                fi

                if ! grep -q '"dev"' "$service_dir/package.json"; then
                        echo "[$service_name] No dev script found, skipping..."
                        continue
                fi

                echo "Starting $service_name in background..."
                (
                        cd "$service_dir"
                        echo "[$service_name] Installing dependencies..."
                        bun install
                        echo "[$service_name] Running bun run dev..."
                        exec bun run dev
                ) >"$PROJECT_DIR/.zscripts/mini-service-${service_name}.log" 2>&1 &

                local service_pid=$!
                echo "[$service_name] Started in background (PID: $service_pid)"
                echo "[$service_name] Log: $PROJECT_DIR/.zscripts/mini-service-${service_name}.log"
                disown "$service_pid" 2>/dev/null || true
                started_count=$((started_count + 1))
        done

        echo "Mini-services startup completed. Started $started_count service(s)."
        log_step_end "Starting mini-services"
}

wait_for_service() {
        local host="$1"
        local port="$2"
        local service_name="$3"
        local max_attempts="${4:-60}"
        local attempt=1

        echo "Waiting for $service_name to be ready on $host:$port..."

        while [ "$attempt" -le "$max_attempts" ]; do
                if curl -s --connect-timeout 2 --max-time 5 "http://$host:$port" >/dev/null 2>&1; then
                        echo "$service_name is ready!"
                        return 0
                fi

                echo "Attempt $attempt/$max_attempts: $service_name not ready yet, waiting..."
                sleep 1
                attempt=$((attempt + 1))
        done

        echo "ERROR: $service_name failed to start within $max_attempts seconds"
        return 1
}

cleanup() {
        if [ -n "${DEV_PID:-}" ] && kill -0 "$DEV_PID" >/dev/null 2>&1; then
                echo "Stopping Next.js dev server (PID: $DEV_PID)..."
                kill "$DEV_PID" >/dev/null 2>&1 || true
        fi
}

trap cleanup EXIT INT TERM

cd "$PROJECT_DIR"

if ! command -v bun >/dev/null 2>&1; then
        echo "ERROR: bun is not installed or not in PATH"
        exit 1
fi

log_step_start "bun install"
echo "[BUN] Installing dependencies..."
bun install
log_step_end "bun install"

log_step_start "bun run db:push"
echo "[BUN] Setting up database..."
bun run db:push
log_step_end "bun run db:push"

log_step_start "Starting MICAPROFITA server (produksi dulu, dev cadangan)"
# HUKUM ANTI-OOM (pelajaran 2026-10-26): mode dev memakan 2,2GB+ → OOM killer
# menyembelih di sandbox 4GB. Produksi standalone ±100-400MB.
# Produksi dipakai bila build tersedia; kalau belum, fallback dev agar
# sandbox baru tetap hidup.
if [ -f "$PROJECT_DIR/.next/standalone/server.js" ] && [ -f "$PROJECT_DIR/.next/BUILD_ID" ]; then
        echo "[SERVER] Lahirkan PRODUKSI standalone (heap cap 1024MB)..."
        PENJAGA_ROOT="$PROJECT_DIR" SERVER_LOG="$PROJECT_DIR/db/server.log" nohup bash "$PROJECT_DIR/scripts/nyalakan_server.sh" >/dev/null 2>&1 &
        DEV_PID=$!
else
        echo "[SERVER] Belum ada build produksi → fallback dev..."
        bun run dev &
        DEV_PID=$!
fi
log_step_end "Starting MICAPROFITA server (produksi dulu, dev cadangan)"

log_step_start "Waiting for MICAPROFITA server"
wait_for_service "localhost" "3000" "MICAPROFITA server"
log_step_end "Waiting for Next.js dev server"

log_step_start "Health check"
echo "[BUN] Performing health check..."
curl -fsS localhost:3000 >/dev/null
echo "[BUN] Health check passed"
log_step_end "Health check"

start_mini_services

# ══════════════════════════════════════════════════════════════════
# PENJAGA ABADI MICAPROFITA — keystone keabadian (mandat pemilik):
# "jangan sampai sandbox inactive... walaupun server restart atau
#  reset sandbox dilarang inactive kita harus bisa hidup"
#
# Penjaga dilahirkan dari pohon proses PLATFORM (dev.sh) — bukan dari
# sesi alat — sehingga selamat dari sapuan proses dan hidup sepanjang
# sesi sandbox. Singleton ber-pidfile → aman dari boot ganda.
#   1) watchdog_server.sh : jaga denyut server, REVIVE otomatis bila
#      OOM/mati (jalur node langsung + batas heap).
#   2) telegram_jaga.mjs  : bot real-time long-polling, jawab semua
#      pesan, laporan pagi 07:05 WIB.
#   (instrumentation.ts juga menyalakan keduanya saat server boot —
#    dua lapis, saling menggantikan, singleton mencegah dobel.)
# ══════════════════════════════════════════════════════════════════
start_penjaga_abadi() {
        log_step_start "Penjaga Abadi MICAPROFITA"
        mkdir -p "$PROJECT_DIR/db"
        # ── NYAWA TOKEN TELEGRAM — self-heal anti-hilang (mandat pemilik):
        # "apapun yang terjadi jangan sampai hilang, kental menempel ibarat
        #  dev.sh, tahan dari reset". Bila .token-telegram disapu/hilang,
        #  keystone memulihkannya OTOMATIS dari cadangan .secrets/ (b64).
        if [ ! -s "$PROJECT_DIR/.token-telegram" ]; then
                if [ -s "$PROJECT_DIR/.secrets/token_telegram.b64" ]; then
                        base64 -d "$PROJECT_DIR/.secrets/token_telegram.b64" > "$PROJECT_DIR/.token-telegram" 2>/dev/null || \
                                base64 --decode "$PROJECT_DIR/.secrets/token_telegram.b64" > "$PROJECT_DIR/.token-telegram"
                        chmod 600 "$PROJECT_DIR/.token-telegram" 2>/dev/null || true
                        echo "[NYAWA] .token-telegram dipulihkan dari .secrets (self-heal)"
                else
                        echo "[NYAWA] PERINGATAN: token telegram & cadangannya tiada — butuh pemilik"
                fi
        fi
        chmod 600 "$PROJECT_DIR/.token-telegram" 2>/dev/null || true
        # ── NYAWA PAT RANTAIAN — self-heal anti-hilang (mandat pemilik):
        # sarang ririnsherlyna-cloud/Rantaian = kloningan otak; PAT "Rantan"
        # dipulihkan otomatis dari .secrets/nyawa_b64 bila berkas raw disapu
        # reset. Dua salinan raw (sinkron membaca salah satunya).
        if [ ! -s "$PROJECT_DIR/.secrets/rantan.pat" ] || [ ! -s "$PROJECT_DIR/.token-rantaian" ]; then
                if [ -s "$PROJECT_DIR/.secrets/nyawa_b64" ]; then
                        base64 -d "$PROJECT_DIR/.secrets/nyawa_b64" > "$PROJECT_DIR/.secrets/rantan.pat" 2>/dev/null || \
                                base64 --decode "$PROJECT_DIR/.secrets/nyawa_b64" > "$PROJECT_DIR/.secrets/rantan.pat"
                        cp -f "$PROJECT_DIR/.secrets/rantan.pat" "$PROJECT_DIR/.token-rantaian"
                        chmod 600 "$PROJECT_DIR/.secrets/rantan.pat" "$PROJECT_DIR/.token-rantaian" 2>/dev/null || true
                        echo "[NYAWA] PAT Rantaian dipulihkan dari .secrets/nyawa_b64 (self-heal)"
                else
                        echo "[NYAWA] PERINGATAN: PAT rantaian & cadangannya tiada — butuh pemilik"
                fi
        fi
        chmod 600 "$PROJECT_DIR/.secrets/rantan.pat" "$PROJECT_DIR/.token-rantaian" 2>/dev/null || true
        (
                cd "$PROJECT_DIR"
                PENJAGA_ROOT="$PROJECT_DIR" nohup bash "$PROJECT_DIR/scripts/watchdog_server.sh" >>"$PROJECT_DIR/db/penjaga.log" 2>&1 &
                echo "[PENJAGA] watchdog luar-proses nyala (pid $!)"
                PENJAGA_ROOT="$PROJECT_DIR" nohup node "$PROJECT_DIR/scripts/telegram_jaga.mjs" >>"$PROJECT_DIR/db/telegram.log" 2>&1 &
                echo "[PENJAGA] telegram-jaga nyala (pid $!)"
                PENJAGA_ROOT="$PROJECT_DIR" nohup bash "$PROJECT_DIR/scripts/rantaian_jaga.sh" >>"$PROJECT_DIR/db/rantaian.log" 2>&1 &
                echo "[PENJAGA] rantaian-jaga nyala (pid $!) — injeksi mandiri otak→GitHub tiap 6 jam"
                disown -a 2>/dev/null || true
        ) || true
        log_step_end "Penjaga Abadi MICAPROFITA"
}
start_penjaga_abadi

echo "Next.js dev server is running in background (PID: $DEV_PID)."
echo "Use 'kill $DEV_PID' to stop it."
disown "$DEV_PID" 2>/dev/null || true
unset DEV_PID
