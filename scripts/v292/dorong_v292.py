#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V292 — dorong daftar file ke repo Micaprofita via contents API (create atau update)."""
import base64, json, sys, urllib.request, urllib.error

TOKEN = "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"
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"

FILE = [
    ("scripts/penjaga.mjs", "/home/z/my-project/hidup_repo/scripts/penjaga.mjs"),
    ("scripts/hidup/otak-llm.mjs", "/home/z/my-project/hidup_repo/scripts/hidup/otak-llm.mjs"),
    ("scripts/hidup/sadar1.js", "/home/z/my-project/hidup_repo/scripts/hidup/sadar1.js"),
    ("arena.html", "/home/z/my-project/hidup_repo/arena.html"),
    (".github/workflows/sakti-denyut.yml", "/home/z/my-project/hidup_repo/.github/workflows/sakti-denyut.yml"),
]

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "micaprofita-v292-satu-rumah")
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, body) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        return {"__http_error__": e.code, "__body__": e.read().decode()[:300]}

for repo_path, local in FILE:
    content = open(local, "rb").read()
    b64 = base64.b64encode(content).decode()
    old = req(API + "/contents/" + repo_path + "?ref=main")
    if isinstance(old, dict) and old.get("__http_error__") == 404:
        pesan = "V292 SATU-RUMAH: " + repo_path + " (file baru) — kandang hidup 60 koin/denyut, otak-llm jujur, arena disegarkan denyut SAKTI"
        data = {"message": pesan, "content": b64, "branch": "main"}
        ket = "CREATE"
    else:
        pesan = "V292 SATU-RUMAH: " + repo_path + " — kandang hidup (bedah semua koin likuid tiap denyut), kesegaran sasaran anti-repetisi, penulis arena-keadaan + otak-llm"
        data = {"message": pesan, "content": b64, "sha": old["sha"], "branch": "main"}
        ket = "UPDATE"
    r = req(API + "/contents/" + repo_path, data=data, method="PUT")
    if isinstance(r, dict) and r.get("commit"):
        print(f"OK {ket}: {repo_path} -> komit {r['commit']['sha'][:7]}")
    else:
        print(f"GAGAL: {repo_path}: {json.dumps(r)[:220]}")
        sys.exit(1)
print("SEMUA TERDORONG")
