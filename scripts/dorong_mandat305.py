#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong paket mandat 31 Okt (V305/v7/v8.1) ke repo Rantaian via Contents API.
File: scripts/benteng_telegram.py (v7), benteng/balas_telegram.py + scripts/
balas_telegram.py (v8.1), benteng/heartbeat_local.py (V305), benteng/koin100.json
(pool 100 koin pilihan), .github/workflows/benteng-telegram.yml (cron */5).
Token: /home/z/my-project/.token-rantaian (tidak pernah dicetak)."""
import base64
import json
import sys
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
PAT = open("/home/z/my-project/.token-rantaian").read().strip()
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "mandat-305",
        "Accept": "application/vnd.github+json", "Content-Type": "application/json"}

Paket = [
    ("scripts/benteng_telegram.py",
     "/home/z/my-project/benteng_rantaian/scripts/benteng_telegram.py",
     "benteng v7: mandat 31 Okt — BUY=AMBISIUS, SELL=STOP LOSS, tanpa daftar, laporan ATH harian"),
    ("benteng/balas_telegram.py",
     "/home/z/my-project/scripts/balas_telegram.py",
     "balas v8.1: +penjaga level cepat (3 mnt) + laporan ATH cadangan [skip ci]"),
    ("scripts/balas_telegram.py",
     "/home/z/my-project/scripts/balas_telegram.py",
     "balas v8.1 (salinan scripts/): sama dengan benteng/ [skip ci]"),
    ("benteng/heartbeat_local.py",
     "/home/z/my-project/scripts/heartbeat.py",
     "heartbeat V305: tanpa daftar sinyal, AMBISIUS/STOP sesuai arah, ATH harian cadangan, koin100 segarkan"),
    ("benteng/koin100.json",
     "/home/z/my-project/data/koin100.json",
     "koin100: daftar 100+ koin pilihan (memori jangka panjang) utk laporan ATH [skip ci]"),
]


def dorong(jalur_repo, file_lokal, pesan):
    isi = open(file_lokal, "rb").read()
    b64 = base64.b64encode(isi).decode()
    sha = None
    try:
        req = urllib.request.Request(f"{API}/{jalur_repo}", headers=HEAD)
        with urllib.request.urlopen(req, timeout=20) as r:
            sha = json.loads(r.read().decode()).get("sha")
    except Exception:
        sha = None  # 404 = baru
    body = {"message": pesan, "content": b64,
            "committer": {"name": "mandat-305", "email": "mandat@microprofita.local"}}
    if sha:
        body["sha"] = sha
    req = urllib.request.Request(f"{API}/{jalur_repo}",
                                 data=json.dumps(body).encode(), headers=HEAD, method="PUT")
    with urllib.request.urlopen(req, timeout=30) as r:
        j = json.loads(r.read().decode())
    return j.get("commit", {}).get("sha", "?")[:10]


def dorong_teks(jalur_repo, teks, pesan):
    b64 = base64.b64encode(teks.encode()).decode()
    sha = None
    try:
        req = urllib.request.Request(f"{API}/{jalur_repo}", headers=HEAD)
        with urllib.request.urlopen(req, timeout=20) as r:
            sha = json.loads(r.read().decode()).get("sha")
    except Exception:
        sha = None
    body = {"message": pesan, "content": b64,
            "committer": {"name": "mandat-305", "email": "mandat@microprofita.local"}}
    if sha:
        body["sha"] = sha
    req = urllib.request.Request(f"{API}/{jalur_repo}",
                                 data=json.dumps(body).encode(), headers=HEAD, method="PUT")
    with urllib.request.urlopen(req, timeout=30) as r:
        j = json.loads(r.read().decode())
    return j.get("commit", {}).get("sha", "?")[:10]


def main():
    hasil = []
    for jalur, lokal, pesan in Paket:
        try:
            c = dorong(jalur, lokal, pesan)
            hasil.append(f"OK {jalur} -> commit {c}")
        except Exception as e:
            hasil.append(f"GAGAL {jalur}: {repr(e)[:120]}")
    # workflow: cron 7,37 -> */5
    try:
        req = urllib.request.Request(f"{API}/.github/workflows/benteng-telegram.yml", headers=HEAD)
        with urllib.request.urlopen(req, timeout=20) as r:
            j = json.loads(r.read().decode())
        teks = base64.b64decode(j["content"].replace("\n", "")).decode()
        sha = j.get("sha")
        if "- cron: '7,37 * * * *'" in teks:
            teks = teks.replace("- cron: '7,37 * * * *'", "- cron: '*/5 * * * *'")
            teks = teks.replace("Tiap 30 menit: detak + penjaga TP/Ambisius/PowerMax/STOP",
                                "Tiap 5 menit (mandat 31 Okt: info segar, bukan basi): detak + penjaga AMBISIUS/STOP sesuai arah")
            c = dorong_teks(".github/workflows/benteng-telegram.yml", teks,
                            "benteng-telegram: cron */5 — informasi selalu segar (mandat 31 Okt)")
            hasil.append(f"OK workflow cron */5 -> commit {c}")
        else:
            hasil.append("workflow: cron sudah bukan 7,37 (cek manual)")
    except Exception as e:
        hasil.append(f"GAGAL workflow: {repr(e)[:120]}")
    print("\n".join(hasil))
    return 0 if all(h.startswith("OK") for h in hasil) else 1


if __name__ == "__main__":
    sys.exit(main())
