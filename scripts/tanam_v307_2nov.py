#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM V307 (2 Nov, mandat pemilik "sandbox inactive = kejebolan; inovasi,
lebih mapan dan kuat") — salin kode server ke cangkang repo Rantaian:
- benteng/heartbeat_local.py : V307 PULSA DUA TUBUH — tiap TANDA HIDUP kini
  menampilkan denyut dua tubuh (umur sandbox + denyut run terakhir lapis
  abadi GitHub) + pengakuan kematian terakhir dari death_journal.jsonl.
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
    body = {"message": "v307 mandat 2 Nov: pulsa dua tubuh di tanda hidup (umur sandbox + denyut lapis abadi) + pengakuan kematian terakhir [skip ci]",
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
