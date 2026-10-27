#!/usr/bin/env python3
"""
Dorong ARENA PERMANEN (arena.html + brain.json) ke repo kanonik
ririnsherlyna-cloud/Micaprofita- (GitHub Pages dari root main).
Idempoten: cek HEAD dulu, lewati bila isi SAMA. Komit [skip ci].
Jalankan: export GH_TOKEN=<penuh> && python3 scripts/sarang/dorong_arena.py
"""
import base64
import json
import os
import sys
import urllib.request

REPO = "ririnsherlyna-cloud/Micaprofita-"
BRANCH = "main"
FILES = [
    ("/home/z/my-project/download/arena.html", "arena.html"),
    ("/home/z/my-project/download/brain.json", "brain.json"),
]

TOKEN = os.environ.get("GH_TOKEN")
if not TOKEN:
    sys.exit("GH_TOKEN tidak tersedia")


def api(jalan, metode="GET", isi=None):
    url = f"https://api.github.com{jalan}"
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


for lokasi, jauh in FILES:
    with open(lokasi, "rb") as f:
        isi = f.read()
    b64 = base64.b64encode(isi).decode()
    status, info = api(f"/repos/{REPO}/contents/{jauh}?ref={BRANCH}")
    sha = info.get("sha") if status == 200 else None
    if sha:
        lama = base64.b64decode(info.get("content", ""))
        if lama == isi:
            print(f"LEWATI {jauh} (sudah sama, {len(isi)} B)")
            continue
    body = {
        "message": f"arena permanen: {jauh} — AGI kripto mandiri di browser [skip ci]",
        "content": b64,
        "branch": BRANCH,
    }
    if sha:
        body["sha"] = sha
    st, res = api(f"/repos/{REPO}/contents/{jauh}", "PUT", body)
    if st in (200, 201):
        print(f"OK    {jauh} terdorong ({len(isi)} B, {'perbarui' if sha else 'baru'})")
    else:
        print(f"GAGAL {jauh}: HTTP {st} {str(res)[:200]}")
        sys.exit(1)

print("SELESAI — arena permanen di https://ririnsherlyna-cloud.github.io/Micaprofita-/arena.html")
