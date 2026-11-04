#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong V306 GERBANG-KESEGARAN ke repo Rantaian via Contents API.
Pelajaran 31 Okt (kerugian pemilik): data basi diklaim segar -> merugikan.
Semua pengirim (heartbeat, balas/penjaga81, benteng Actions) kini membekukan
level dari data usang >24 jam. Token: .token-rantaian (tidak pernah dicetak)."""
import base64
import json
import sys
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
PAT = open("/home/z/my-project/.token-rantaian").read().strip()
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "v306-kesegaran",
        "Accept": "application/vnd.github+json", "Content-Type": "application/json"}

Paket = [
    ("benteng/heartbeat_local.py",
     "/home/z/my-project/scripts/heartbeat.py",
     "heartbeat V306 GERBANG-KESEGARAN: umur nyata dari timestamp, metadata beku tidak dipercaya; level data usang >24j DIBEKUKAN [skip ci]"),
    ("benteng/balas_telegram.py",
     "/home/z/my-project/scripts/balas_telegram.py",
     "balas v8.2: V306 gerbang kesegaran di penjaga_level_cepat — level basi tidak dinotifikasi [skip ci]"),
    ("scripts/balas_telegram.py",
     "/home/z/my-project/scripts/balas_telegram.py",
     "balas v8.2 (salinan scripts/): V306 gerbang kesegaran [skip ci]"),
    ("scripts/benteng_telegram.py",
     "/home/z/my-project/benteng_rantaian/scripts/benteng_telegram.py",
     "benteng v7.1: V306 gerbang kesegaran — pool/sasaran usang dibekukan dari pantauan level [skip ci]"),
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
            "committer": {"name": "v306-kesegaran", "email": "v306@microprofita.local"}}
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
    print("\n".join(hasil))
    return 0 if all(h.startswith("OK") for h in hasil) else 1


if __name__ == "__main__":
    sys.exit(main())
