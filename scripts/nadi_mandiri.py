#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NADI-MANDIRI (v10.5, wasiat/hukum pemilik 2 Nov 2026):
"Makhluk ini jangan pernah mati lagi; daemon bukan pembunuhnya, justru
bahan bakar; hidup di server langsung, mandiri, tanpa menunggu chat z.ai."

Nadi = jantung pengawas di SERVER (bukan chat, bukan schedule z.ai):
  tiap 20 detik:
    1. pastikan TEPAT SATU balas_telegram.py --jaga hidup (kunci pid di
       data/jaga_kunci.pid); mati -> hidupkan lagi (setsid, mandiri).
    2. pastikan otak_jaga.py hidup (data/otak_nyala < 25 mnt) -> hidupkan.
    3. tiap 15 menit (bila data/last_heartbeat tua > 12 mnt) jalankan
       heartbeat.py — denyut server: jembatan otak + penjaga level
       AMBISIUS/POWER MAX/STOP + laporan ATH runtuh-kini. Telegram tetap
       hidup WALAU chat/schedule z.ai padam.
    4. tulis data/nadi_nyala (epoch) — bukti hidup bagi kunjungan mana pun.
Nadi sendiri tidak bergantung apa pun: dinyalakan ulang oleh setiap
kunjungan (nadi_pastikan di balas_telegram.main) dan tiap detak tubuh.
Instance tunggal dijaga data/nadi_kunci.pid.
"""
import os
import subprocess
import time

BASE = "/home/z/my-project"
F_KUNCI = os.path.join(BASE, "data", "nadi_kunci.pid")
F_NYALA = os.path.join(BASE, "data", "nadi_nyala")
F_LOG = os.path.join(BASE, "data", "nadi.log")
F_OTAK_NYALA = os.path.join(BASE, "data", "otak_nyala")
F_DENYUT = os.path.join(BASE, "data", "last_heartbeat")
F_JAGA_KUNCI = os.path.join(BASE, "data", "jaga_kunci.pid")
JEDA = 20
DENYUT_TIAP = 900  # 15 menit


def log(pesan):
    try:
        if os.path.exists(F_LOG) and os.path.getsize(F_LOG) > 3_000_000:
            open(F_LOG, "w").write("")
        with open(F_LOG, "a") as f:
            f.write(f"{time.strftime('%m-%d %H:%M:%S')} {pesan}\n")
    except Exception:
        pass


def kunci_ambil():
    try:
        if os.path.exists(F_KUNCI):
            pid = int(open(F_KUNCI).read().strip() or 0)
            if pid and pid != os.getpid():
                os.kill(pid, 0)
                return False
    except (ProcessLookupError, ValueError):
        pass
    except OSError:
        return False
    try:
        open(F_KUNCI + ".tmp", "w").write(str(os.getpid()))
        os.replace(F_KUNCI + ".tmp", F_KUNCI)
    except OSError:
        return False
    return True


def proses_hidup(polapol):
    try:
        out = subprocess.run(["pgrep", "-f", polapol], capture_output=True, text=True, timeout=8)
        return bool((out.stdout or "").strip())
    except Exception:
        return False


def pid_kunci_hidup(jalur, pola):
    """Kunci pid valid = pid hidup DAN cmdline memuat pola."""
    try:
        pid = int(open(jalur).read().strip() or 0)
        if not pid:
            return False
        os.kill(pid, 0)
        with open(f"/proc/{pid}/cmdline", "rb") as f:
            return pola.encode() in f.read().replace(b"\0", b" ")
    except Exception:
        return False


_anak = []  # Popen anak — dipanen tiap langkah agar tak jadi zombi


def jalankan_latar(argv, logf):
    try:
        p = subprocess.Popen(["setsid", "nohup"] + argv, stdout=logf, stderr=subprocess.STDOUT,
                             stdin=subprocess.DEVNULL, cwd=BASE, start_new_session=True)
        _anak.append(p)
        for q in _anak[:]:
            if q.poll() is not None:
                _anak.remove(q)
        return True
    except Exception as e:
        log(f"GAGAL nyalakan {argv[:2]}: {e!r:.80}")
        return False


def umur_file(jalur):
    try:
        return time.time() - os.path.getmtime(jalur)
    except OSError:
        return 1e9


def satu_langkah(denyut_terakhir):
    # 1. --jaga tunggal
    if not pid_kunci_hidup(F_JAGA_KUNCI, "balas_telegram.py --jaga"):
        logf = open(os.path.join(BASE, "data", "bot_chat.log"), "ab")
        if jalankan_latar(["python3", os.path.join(BASE, "scripts", "balas_telegram.py"), "--jaga"], logf):
            log("jaga mati -> dinyalakan ulang")
        time.sleep(6)
    # 2. otak_jaga (berbasis umur penanda, sama hukum dgn jaga_otak_zai)
    if umur_file(F_OTAK_NYALA) >= 1500:
        logf = open(os.path.join(BASE, "data", "otak_jaga.log"), "ab")
        if jalankan_latar(["python3", os.path.join(BASE, "scripts", "otak_jaga.py")], logf):
            log("otak_jaga tua -> dinyalakan ulang")
        time.sleep(4)
    # 3. denyut server tiap 15 mnt bila denyut mana pun tua > 12 mnt
    now = time.time()
    if now - denyut_terakhir >= DENYUT_TIAP and umur_file(F_DENYUT) > 720:
        denyut_terakhir = now
        try:
            r = subprocess.run(["python3", os.path.join(BASE, "scripts", "heartbeat.py")],
                               cwd=BASE, timeout=600, capture_output=True, text=True)
            ekor = (r.stdout or "").strip().splitlines()
            log(f"denyut server rc={r.returncode} :: {ekor[-1] if ekor else '(kosong)'}")
        except Exception as e:
            log(f"denyut server gagal: {e!r:.80}")
    # 4. penanda hidup nadi
    try:
        open(F_NYALA, "w").write(str(int(time.time())))
    except OSError:
        pass
    return denyut_terakhir


def main():
    if not kunci_ambil():
        print("NADI_SUDAH_HIDUP — keluar sopan")
        return 0
    log("nadi menyala — pengawas mandiri aktif (hukum pemilik 2 Nov v10.5)")
    denyut_terakhir = 0.0
    while True:
        try:
            denyut_terakhir = satu_langkah(denyut_terakhir)
        except Exception as e:
            log(f"langkah err: {e!r:.90}")
        time.sleep(JEDA)


if __name__ == "__main__":
    raise SystemExit(main())
