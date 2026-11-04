#!/usr/bin/env python3
# ============================================================
# MICAPROFITA ARENA AGI — JANTUNG HIDUP v4 (daemon python)
# Sejati: bun terbukti mati diam-diam setelah denyut pertama di
# wadah ini (v2 & v3, pola sama), maka jantung pindah ke python.
# Berkas mini-service-*.js kini hanya PELONTAR yang menumbuhkan
# daemon ini (detached) saat wadah menyala.
#
# Tugas tiap denyut (15 menit):
#   1) GET /api/arena → hari teradili, pick lahir, genome berevolusi
#   2) Snapshot resmi → public/arena-keadaan.json (hanya saat berubah)
#   3) Gerbang → public/gerbang.json (peta hidup untuk sambung-otomatis)
#   4) Dorong otomatis → ketiga berkas ke GitHub Pages (idempoten)
# Pidfile menjaga agar tak ada dua jantung serentak (cek cmdline asli).
# ============================================================
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.request

PORT = 3000
PROYEK = "/home/z/my-project"
LOG = f"{PROYEK}/scripts/arena-nafas.log"
PIDFILE = f"{PROYEK}/scripts/arena-nafas.pid"
SNAP_PUB = f"{PROYEK}/public/arena-keadaan.json"
SNAP_DL = f"{PROYEK}/download/arena-keadaan.json"
BANGUN = f"{PROYEK}/scripts/sarang/bangun_gerbang.py"
DORONG = f"{PROYEK}/scripts/sarang/dorong_otomatis.py"
MENIT = 15
hash_terakhir = None


def log(pesan):
    baris = f"[{time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime())}Z] {pesan}"
    try:
        with open(LOG, "a") as f:
            f.write(baris + "\n")
    except Exception:
        pass
    print(baris, flush=True)


# ---- pidfile: satu jantung saja (cek cmdline asli via /proc) ----
def pid_lain_hidup():
    try:
        with open(PIDFILE) as f:
            lama = int(f.read().strip())
    except Exception:
        return False
    if lama == os.getpid():
        return False
    try:
        with open(f"/proc/{lama}/cmdline", "rb") as f:
            cmd = f.read().decode(errors="ignore")
        return "jantung.py" in cmd
    except Exception:
        return False


if pid_lain_hidup():
    log("jantung lain masih berdenyut — keluar")
    sys.exit(0)
with open(PIDFILE, "w") as f:
    f.write(str(os.getpid()))


def ambil_arena():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/arena", timeout=180) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except Exception:
        return 0, ""


def simpan_snapshot(body):
    global hash_terakhir
    try:
        obj = json.loads(body)
    except Exception:
        return "body bukan JSON"
    if not isinstance(obj, dict) or not isinstance(obj.get("standings"), list):
        return "bukan keadaan arena"
    obj["_eksporAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    beres = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    h = hashlib.sha256(beres.encode()).hexdigest()[:16]
    if h == hash_terakhir:
        return f"sama (hash {h}) — tanpa tulis"
    hash_terakhir = h
    tmp = SNAP_PUB + ".tmp"
    with open(tmp, "w") as f:
        f.write(beres)
    os.replace(tmp, SNAP_PUB)
    try:
        with open(SNAP_DL, "w") as f:
            f.write(beres)
    except Exception:
        pass
    return f"snapshot {len(beres)} B ditulis (hash {h})"


def jalankan(skrip, nama, timeout):
    try:
        r = subprocess.run(["python3", skrip], capture_output=True, text=True, timeout=timeout)
        out = (r.stdout or "").strip()
        if out:
            for baris in out.split("\n"):
                log(f"{nama} | {baris[:160]}")
        if r.returncode != 0:
            log(f"{nama} | status {r.returncode} {(r.stderr or '')[:140]}")
    except Exception as e:
        log(f"{nama} | gagal — {e}")


def denyut(ke):
    t0 = time.time()
    kode, body = ambil_arena()
    dt = time.time() - t0
    if kode == 200 and body:
        keterangan = simpan_snapshot(body)
        log(f"denyut #{ke}: HTTP 200 dalam {dt:.1f}s — {keterangan}")
        jalankan(BANGUN, "gerbang", 90)
        jalankan(DORONG, "dorong", 300)
    else:
        log(f"denyut #{ke}: HTTP {kode} dalam {dt:.1f}s — arena sibuk/putus, coba denyut berikutnya")


log("jantung arena AGI v4 (python) menyala — denyut tiap " + str(MENIT) + " menit (snapshot + gerbang + dorong otomatis)")
ke = 0
while True:
    ke += 1
    try:
        denyut(ke)
    except Exception as e:
        try:
            log(f"denyut #{ke}: pengecualian tak terduga — {e} (jantung terus berdenyut)")
        except Exception:
            pass
    time.sleep(MENIT * 60)
