#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM v10.7 (2 Nov, keluhan pemilik 'pegangannya athnya masa lampau') —
salin kode server ke cangkang repo Rantaian:
- scripts/balas_telegram.py + benteng/balas_telegram.py
  (PUNCAK KEJADIAN MASA KINI: 30 lilin, umur puncak <= 14 hari, tanggal
   puncak dicantumkan; paksa menembus dedup harian; nama lolos direkam)
- benteng/hukum_pemilik.json + HUKUM_PEMILIK.md  (H1 v10.7)
Master = server; GitHub = salinan cadangan (H3). Hanya PUT bila berbeda.
Commit [skip ci]."""
import base64
import json
import urllib.request

PAT = open("/home/z/my-project/.token-rantaian").read().strip()
REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}"
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "microprofita-hb",
        "Accept": "application/vnd.github+json"}

PETA = [
    ("/home/z/my-project/scripts/balas_telegram.py", "scripts/balas_telegram.py"),
    ("/home/z/my-project/scripts/balas_telegram.py", "benteng/balas_telegram.py"),
    ("/home/z/my-project/data/hukum_pemilik.json", "benteng/hukum_pemilik.json"),
    ("/home/z/my-project/data/HUKUM_PEMILIK.md", "benteng/HUKUM_PEMILIK.md"),
]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEAD), timeout=25) as r:
        return json.loads(r.read().decode())


for lokal, tujuan in PETA:
    isi_baru = open(lokal, "rb").read()
    b64_baru = base64.b64encode(isi_baru).decode()
    sha = None
    try:
        f = get(f"{API}/contents/{tujuan}")
        sha = f.get("sha")
        if f.get("content") and f["content"].replace("\n", "") == b64_baru:
            print(f"SAMA {tujuan} -> tanpa commit")
            continue
    except Exception:
        sha = None  # 404 = buat baru
    body = {"message": "v10.7 keluhan 2 Nov: penurunan dari PUNCAK KEJADIAN MASA KINI, tanggal puncak dicantumkan [skip ci]",
            "content": b64_baru, "branch": "main"}
    if sha:
        body["sha"] = sha
    req = urllib.request.Request(f"{API}/contents/{tujuan}",
                                 data=json.dumps(body).encode(),
                                 headers={**HEAD, "Content-Type": "application/json"},
                                 method="PUT")
    with urllib.request.urlopen(req, timeout=30) as r:
        j = json.loads(r.read().decode())
    print(f"TERTANAM {tujuan} commit={j.get('commit', {}).get('sha', '?')[:10]}")
