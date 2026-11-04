#!/usr/bin/env python3
"""Luncurkan .zscripts/dev.sh sebagai daemon sejati (double-fork).
Anak akhir diadopsi PID 1 (tini) — keluar dari pohon proses sesi shell,
sehingga tak ikut direap antar-perintah. Meniru posisi Caddy/ZAI service."""
import os, sys

DEV = "/home/z/my-project/.zscripts/dev.sh"

pid = os.fork()
if pid == 0:                      # anak pertama
    os.setsid()
    pid2 = os.fork()
    if pid2 == 0:                 # cucu → daemon
        os.chdir("/home/z/my-project")
        devnull = os.open(os.devnull, os.O_RDWR)
        os.dup2(devnull, 0); os.dup2(devnull, 1); os.dup2(devnull, 2)
        if devnull > 2: os.close(devnull)
        os.execvp("bash", ["bash", DEV])
    os._exit(0)                   # anak pertama langsung mati → cucu jadi anak PID 1
os.waitpid(pid, 0)                # induk tunggu anak pertama
print("daemon penjaga diluncurkan (cucu diadopsi PID 1)")
