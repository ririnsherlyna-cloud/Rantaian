#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DORONG-V8: push 3 artefak BOT-CHAT v8 ke benteng Rantaian via Contents API.
1. scripts/balas_telegram.py        -> v8 (jendela aktif + rantai)
2. .github/workflows/benteng-balas.yml -> v2 (timeout 6m + Warisi hidup)
3. benteng/restore_tubuh.py         -> GEN-11.2 (penanda v8 + penghidup jaga)
Token dibaca dari .token-rantaian; TIDAK PERNAH ditampilkan."""
import base64, json, urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
TOK = open("/home/z/my-project/.token-rantaian").read().strip()
HEAD = {"Authorization": f"Bearer {TOK}", "User-Agent": "microprofita-dorong-v8",
        "Accept": "application/vnd.github+json"}

BERKAS = [
    ("/home/z/my-project/scripts/balas_telegram.py",
     "scripts/balas_telegram.py",
     "BOT-CHAT v8: jendela aktif 4,5 menit + penjaga liveness + /tubuh /ping"),
    ("/home/z/my-project/scripts/tmp/benteng-balas-v8.yml",
     ".github/workflows/benteng-balas.yml",
     "workflow v8: timeout 6m + Warisi hidup (rantai abadi)"),
    ("/home/z/my-project/scripts/restore_tubuh.py",
     "benteng/restore_tubuh.py",
     "restorer GEN-11.2: penanda BOT-CHAT v8 + penghidup penjaga --jaga"),
]

for lokal, repo_path, pesan in BERKAS:
    isi = open(lokal, "rb").read()
    path_enc = urllib.parse.quote(repo_path, safe="")
    try:
        req = urllib.request.Request(f"{API}/{path_enc}", headers=HEAD)
        with urllib.request.urlopen(req, timeout=25) as r:
            sha = json.loads(r.read().decode()).get("sha")
    except Exception as e:
        print(f"GAGAL sha {repo_path}:", repr(e)[:100])
        sha = None
    body = json.dumps({
        "message": pesan,
        "content": base64.b64encode(isi).decode(),
        "committer": {"name": "microprofita-v8", "email": "v8@microprofita.local"},
        **({"sha": sha} if sha else {}),
    }).encode()
    try:
        req = urllib.request.Request(f"{API}/{path_enc}", data=body, method="PUT",
                                     headers={**HEAD, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            j = json.loads(r.read().decode())
        print(f"OK {repo_path} -> commit {j['commit']['sha'][:7]} ({len(isi)} B)")
    except Exception as e:
        print(f"GAGAL push {repo_path}:", repr(e)[:200])
