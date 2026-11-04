#!/usr/bin/env python3
# DORONG V297 BEDAH-KOIN — arena.html ke GitHub Pages
# Perbaikan: "periksa koin <X>" kini dijawab laporan nyata dari Binance
# (kasus forensik: OPG dulu dijawab dengan OGN = salah sasaran).
import base64
import json
import urllib.error
import urllib.request

TOKEN = os.environ.get('GH_TOKEN')
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
    "message": "V297 BEDAH-KOIN: pertanyaan 'periksa koin <X>' kini dijawab laporan nyata dari Binance spot — matematika faktor sama dengan arena, jalan tanpa server, koin tak dikenal dijawab jujur (kasus OPG/OGN salah sasaran dibereskan)",
    "content": base64.b64encode(content).decode(),
    "branch": BRANCH,
}
if sha:
    data["sha"] = sha
r = gh("arena.html", "PUT", data)
print("KOMIT OK:", r["commit"]["sha"][:12])
