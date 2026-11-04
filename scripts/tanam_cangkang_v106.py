#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tanam V305 + hukum v10.6 ke cangkang Rantaian (H3: GitHub = salinan cadangan).
4 path, semua [skip ci]: scripts/heartbeat.py, benteng/heartbeat_local.py,
benteng/hukum_pemilik.json, benteng/HUKUM_PEMILIK.md."""
import base64, json, time, urllib.request

BASE = "/home/z/my-project"
REPO = "ririnsherlyna-cloud/Rantaian"
PAT = open(f"{BASE}/.token-rantaian").read().strip()
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "microprofita-tanam",
        "Accept": "application/vnd.github+json"}

TANAM = [
    (f"{BASE}/scripts/heartbeat.py", "scripts/heartbeat.py"),
    (f"{BASE}/scripts/heartbeat.py", "benteng/heartbeat_local.py"),
    (f"{BASE}/data/hukum_pemilik.json", "benteng/hukum_pemilik.json"),
    (f"{BASE}/data/HUKUM_PEMILIK.md", "benteng/HUKUM_PEMILIK.md"),
]

for lokal, repo_path in TANAM:
    with open(lokal, "rb") as f:
        isi = f.read()
    api = f"https://api.github.com/repos/{REPO}/contents/{repo_path}"
    sha = None
    try:
        with urllib.request.urlopen(urllib.request.Request(api, headers=HEAD), timeout=15) as r:
            sha = json.loads(r.read().decode()).get("sha")
    except Exception:
        sha = None  # 404 = file baru
    body = {"message": f"tanam v10.6: {repo_path} (TANDA HIDUP V305) [skip ci]",
            "content": base64.b64encode(isi).decode("ascii"),
            "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}
    if sha:
        body["sha"] = sha
    try:
        req = urllib.request.Request(api, data=json.dumps(body).encode("utf-8"),
                                     headers={**HEAD, "Content-Type": "application/json"}, method="PUT")
        with urllib.request.urlopen(req, timeout=25) as r:
            j = json.loads(r.read().decode())
        print(f"OK {repo_path} commit={j['commit']['sha'][:7]}")
    except Exception as e:
        print(f"GAGAL {repo_path}: {repr(e)[:120]}")
    time.sleep(2)
print("selesai")
