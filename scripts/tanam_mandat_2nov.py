#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM MANDAT 2 NOV — salin heartbeat.py (dgn filter label BUY/Sell) ke
salinan repo Rantaian: scripts/heartbeat.py + benteng/heartbeat_local.py.
GitHub = gudang salinan (mandat pemilik); master = server Z.AI lokal.
Aturan: hanya PUT bila isi berbeda. Commit [skip ci]."""
import base64
import json
import urllib.request

PAT = open("/home/z/my-project/.token-rantaian").read().strip()
REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}"
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "microprofita-hb",
        "Accept": "application/vnd.github+json"}

LOKAL = "/home/z/my-project/scripts/heartbeat.py"
PETA = [
    (LOKAL, "scripts/heartbeat.py"),
    (LOKAL, "benteng/heartbeat_local.py"),
]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEAD), timeout=20) as r:
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
    body = {"message": f"tanam mandat-2nov filter-label: {tujuan} [skip ci]",
            "content": b64_baru,
            "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}
    if sha:
        body["sha"] = sha
    try:
        req = urllib.request.Request(f"{API}/contents/{tujuan}",
                                     data=json.dumps(body).encode(),
                                     headers={**HEAD, "Content-Type": "application/json"},
                                     method="PUT")
        with urllib.request.urlopen(req, timeout=30) as r:
            out = json.loads(r.read().decode())
        print(f"TANAM OK {tujuan} -> commit {out.get('commit', {}).get('sha', '?')[:7]}")
    except Exception as e:
        print(f"GAGAL {tujuan}: {repr(e)[:100]}")
