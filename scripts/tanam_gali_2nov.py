#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM V308 (2 Nov, tuntutan pemilik "masih abai akan pencaruan mendalam
koin penurunan ATH 80-100%") — salin kode server ke cangkang repo Rantaian:
- benteng/gali_ath.py       : GALI-ATH v1 — organ pencaruan mendalam populasi
  runtuh ATH sejarah -80..-100% (zona 99/90/80, denyut volume, mayat senyap,
  sanitasi lilin kotor). Riset terpisah dari daftar ATH-NAIK (wasiat #1 utuh).
- benteng/heartbeat_local.py: + hook V308 — gali otomatis 1x/24 jam dari denyut.
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
    ("/home/z/my-project/scripts/gali_ath.py", "benteng/gali_ath.py"),
    ("/home/z/my-project/scripts/heartbeat.py", "benteng/heartbeat_local.py"),
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
    body = {"message": "v308 mandat 2 Nov: GALI-ATH v1 organ pencaruan mendalam koin runtuh ATH sejarah 80-100% + hook 24 jam di heartbeat [skip ci]",
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
