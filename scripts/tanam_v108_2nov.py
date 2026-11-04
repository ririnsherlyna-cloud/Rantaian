#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM V10.8 (2 Nov, tuntutan pemilik "masih abai akan pencaruan mendalam
koin penurunan ath 80-100%") — salin kode server ke cangkang repo Rantaian:
- benteng/balas_telegram.py : ath_cepat v10.8 — tiap koin lolos DIBEDAH 3 lapis
  (sebab runtuh, detak tim GitHub otomatis dari identitas paprika, nadi pasar).
  Lubang KANONIS_REPO 12 koin tertambal.
- benteng/ath_bedah.py      : modul bedah (baru).
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
    ("/home/z/my-project/scripts/balas_telegram.py", "benteng/balas_telegram.py"),
    ("/home/z/my-project/scripts/ath_bedah.py", "benteng/ath_bedah.py"),
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
    body = {"message": "v10.8 tuntutan 2 Nov: pencaruan mendalam per koin runtuh 80-100% (sebab runtuh + detak tim GitHub otomatis + nadi pasar) [skip ci]",
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
