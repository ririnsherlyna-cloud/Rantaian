#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TANAM-ZAI-BRIDGE: tanam file inti lokal ke repo Rantaian (benteng abadi).
PETA (GEN-8+ / strategi benteng-total pasca rollback #6/#7):
  scripts/heartbeat.py                 -> benteng/heartbeat_local.py
  benteng_rantaian/scripts/benteng_telegram.py -> scripts/benteng_telegram.py
  src/lib/cyborg/emas.ts               -> benteng/web/emas.ts        (V302 web)
  src/lib/cyborg/arena.ts              -> benteng/web/arena.ts       (V302 web)
  scripts/restore_tubuh.py             -> benteng/restore_tubuh.py
Aturan: hanya PUT bila isi berbeda (bandingkan base64). Commit [skip ci]."""
import json, base64, urllib.request

PAT = open("/home/z/my-project/.token-rantaian").read().strip()
REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}"
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "microprofita-hb",
        "Accept": "application/vnd.github+json"}

PETA = [
    ("/home/z/my-project/scripts/heartbeat.py", "benteng/heartbeat_local.py"),
    ("/home/z/my-project/benteng_rantaian/scripts/benteng_telegram.py", "scripts/benteng_telegram.py"),
    ("/home/z/my-project/src/lib/cyborg/emas.ts", "benteng/web/emas.ts"),
    ("/home/z/my-project/src/lib/cyborg/arena.ts", "benteng/web/arena.ts"),
    ("/home/z/my-project/scripts/restore_tubuh.py", "benteng/restore_tubuh.py"),
]

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEAD), timeout=20) as r:
        return json.loads(r.read().decode())

for lokal, tujuan in PETA:
    try:
        isi_baru = open(lokal, "rb").read()
    except Exception as e:
        print(f"SKIP {tujuan}: file lokal hilang ({e})")
        continue
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
    body = {"message": f"tanam: {tujuan} dari sandbox [skip ci]",
            "content": b64_baru,
            "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}
    if sha:
        body["sha"] = sha
    try:
        req = urllib.request.Request(f"{API}/contents/{tujuan}", data=json.dumps(body).encode(),
                                     headers={**HEAD, "Content-Type": "application/json"}, method="PUT")
        with urllib.request.urlopen(req, timeout=30) as r:
            out = json.loads(r.read().decode())
        print(f"TANAM OK {tujuan} -> commit {out.get('commit', {}).get('sha', '?')[:7]}")
    except Exception as e:
        print(f"GAGAL {tujuan}: {repr(e)[:100]}")
