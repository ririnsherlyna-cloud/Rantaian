#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OTAK-JAGA — pelari denyut otak di SERVER Z.AI (otakz.ai).
Hukum pemilik 2 Nov 2026: data segar & perhitungan WAJIB dihitung di server
otak ini, bukan di GitHub. GitHub hanya simpan salinan (restore/upgrade).
Loop: node scripts/penjaga.mjs tiap 15 menit (cadence sama dgn Actions lama),
tulis epoch ke data/otak_nyala tiap selesai siklus agar watchdog bisa cek.
"""
import subprocess
import time
import os

BASE = "/home/z/my-project"
F_NYALA = os.path.join(BASE, "data", "otak_nyala")
F_LOG = os.path.join(BASE, "data", "otak_jaga.log")
INTERVAL = 900  # 15 menit
TIMEOUT = 1200  # batas keras satu siklus


def log(pesan):
    try:
        if os.path.getsize(F_LOG) > 5_000_000:
            with open(F_LOG, "w", encoding="utf-8") as f:
                f.write("")
        with open(F_LOG, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%m-%d %H:%M:%S')} {pesan}\n")
    except Exception:
        pass


def nyalakan():
    try:
        with open(F_NYALA, "w") as f:
            f.write(str(int(time.time())))
    except Exception:
        pass


def satu_siklus():
    nyalakan()
    try:
        r = subprocess.run(
            ["node", os.path.join(BASE, "scripts", "penjaga.mjs")],
            cwd=BASE, timeout=TIMEOUT,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        ekor = (r.stdout or "").strip().splitlines()
        log(f"siklus selesai rc={r.returncode} :: {ekor[-1] if ekor else '(kosong)'}")
    except subprocess.TimeoutExpired:
        log(f"siklus TIMEOUT > {TIMEOUT}s — lanjut siklus berikut")
    except Exception as e:
        log(f"siklus GAGAL: {e!r}")
    nyalakan()


def utama():
    log("OTAK-JAGA menyala — denyut otak di server Z.AI tiap 15 menit")
    while True:
        mulai = time.time()
        satu_siklus()
        sisa = INTERVAL - (time.time() - mulai)
        if sisa > 0:
            time.sleep(sisa)


if __name__ == "__main__":
    utama()
