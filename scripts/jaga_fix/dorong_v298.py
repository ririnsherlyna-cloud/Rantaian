#!/usr/bin/env python3
# DORONG V298-SASARAN-LIMA — arena.html ke GitHub Pages
# Mandat pemilik: slot resmi 2 koin ditambah panel "SASARAN ARENA HARI INI —
# 5 KOIN TERBAIK": arena membedah sendiri 40 koin paling likuid Binance dari
# peramban, rumus sama dengan mesin V297, lima terbaik ber-rencana E→T→S.
import base64
import json
import os
import urllib.error
import urllib.request

TOKEN = os.environ.get("GH_TOKEN_MICAPROFITA", "").strip()
assert TOKEN, "token tidak ada di lingkungan"
REPO = "ririnsherlyna-cloud/Micaprofita-"
BRANCH = "main"


def gh(path, method="GET", data=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/contents/{path}", method=method
    )
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("User-Agent", "micaprofita-bot")
    req.add_header("Accept", "application/vnd.github+json")
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, body, timeout=60) as r:
        return json.load(r)


try:
    sha = gh(f"arena.html?ref={BRANCH}")["sha"]
    print("sha lama:", sha[:12])
except urllib.error.HTTPError as e:
    if e.code == 404:
        sha = None
    else:
        raise

content = open("/home/z/my-project/hidup_repo/arena.html", "rb").read()
print("ukuran arena.html:", len(content), "byte")
data = {
    "message": "V298-SASARAN-LIMA: panel baru 'SASARAN ARENA HARI INI — 5 KOIN TERBAIK' — arena membedah sendiri 40 koin paling likuid Binance langsung dari peramban (rumus sama dengan mesin V297), lima terbaik ber-rencana penuh E→T→S + keyakinan transparan; slot resmi SAKTI tidak disentuh; jujur V274: 'pasti kena' tidak dijanjikan",
    "content": base64.b64encode(content).decode(),
    "branch": BRANCH,
}
if sha:
    data["sha"] = sha
r = gh("arena.html", "PUT", data)
print("KOMIT OK:", r["commit"]["sha"][:12])
