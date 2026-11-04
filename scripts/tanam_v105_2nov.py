#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM v10.5 (2 Nov, wasiat pemilik) — salin kode server ke cangkang repo:
- scripts/balas_telegram.py + benteng/balas_telegram.py  (filter ATH runtuh-kini
  puncak-7-hari + kunci tunggal --jaga + nadi_pastikan)
- scripts/nadi_mandiri.py                                (pengawas kebal-kematian)
- benteng/hukum_pemilik.json + HUKUM_PEMILIK.md          (wasiat sbg hukum)
Master = server; GitHub = salinan cadangan (H3). Hanya PUT bila isi berbeda.
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
    ("/home/z/my-project/scripts/nadi_mandiri.py", "scripts/nadi_mandiri.py"),
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
    body = {"message": "v10.5 wasiat 2 Nov: runtuh-kini puncak-7-hari + kebal-kematian [skip ci]",
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
