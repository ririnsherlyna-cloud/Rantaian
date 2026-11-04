#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Push salinan v10.2 ke repo Rantaian (GitHub = simpanan salinan utk upgrade/restore).
File: scripts/balas_telegram.py, scripts/heartbeat.py, benteng/balas_telegram.py.
"""
import base64, json, urllib.request

TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()
REPO = "ririnsherlyna-cloud/Rantaian"
H = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json",
     "User-Agent": "benteng-balas"}
PESAN = ("MANDAT 2 Nov v10.4: BUY -> notif AMBISIUS + POWER MAX saja, SELL -> "
         "STOP LOSS saja; laporan ATH 80-100% pakai gerbang fundamental (bukan "
         "meme, tim aktif via repo resmi kurasi, OI >= $10rb, status TRADING) "
         "+ fallback teks-polos kirim()")

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, headers=H, method=method,
                               data=json.dumps(data).encode() if data else None)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return resp.status, json.loads(resp.read().decode() or "{}")

PEMETAAN = [
    ("/home/z/my-project/scripts/balas_telegram.py", "scripts/balas_telegram.py"),
    ("/home/z/my-project/scripts/heartbeat.py", "scripts/heartbeat.py"),
    ("/home/z/my-project/scripts/balas_telegram.py", "benteng/balas_telegram.py"),
]
for lokal, jalur in PEMETAAN:
    isi = base64.b64encode(open(lokal, "rb").read()).decode()
    sha = None
    try:
        _, d = req(f"https://api.github.com/repos/{REPO}/contents/{jalur}?ref=main")
        sha = d.get("sha")
    except Exception:
        pass
    body = {"message": PESAN, "content": isi, "branch": "main"}
    if sha:
        body["sha"] = sha
    try:
        st, d = req(f"https://api.github.com/repos/{REPO}/contents/{jalur}", body, "PUT")
        print("PUSH", jalur, "->", st, d.get("commit", {}).get("sha", "")[:10])
    except Exception as e:
        print("PUSH GAGAL", jalur, "->", repr(e)[:120])
