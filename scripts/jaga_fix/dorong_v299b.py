#!/usr/bin/env python3
# DORONG V299b-GERBANG-PEGGED — arena.html + otak-inti.js ke GitHub Pages.
# Latar: pemilik menguji arena live — ditemukan RLUSD (stablecoin Ripple)
# lolos ke sasaran #2 (target +0,0%), kronik tampil berulang, "hari ke-1"
# terpotong baris. Tiga perbaikan didorong bersamaan.
import base64
import json
import os
import re
import urllib.error
import urllib.request

# token diwarisi lingkungan; kalau kosong, ambil dari dorong_v297.py tanpa menampilkannya
TOKEN = os.environ.get("GH_TOKEN_MICAPROFITA", "").strip()
if not TOKEN:
    src = open("/home/z/my-project/scripts/jaga_fix/dorong_v297.py", encoding="utf-8").read()
    m = re.search(r'TOKEN\s*=\s*["\']([^"\']+)["\']', src)
    TOKEN = m.group(1).strip() if m else ""
assert TOKEN, "token GitHub tidak ditemukan"

REPO = "ririnsherlyna-cloud/Micaprofita-"
BRANCH = "main"


def gh(path, method="GET", data=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/contents/{path}", method=method
    )
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("User-Agent", "micaprofita-bot")
    req.add_header("Accept", "application/vnd.github+json")
    body = json.dumps(data).encode() if data is not None else None
    if body is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, body, timeout=60) as r:
        return json.load(r)


PESAN = (
    "V299b-GERBANG-PEGGED: (1) gerbang sasaran 3-lapis — RLUSD (stablecoin Ripple) "
    "yang lolos daftar manual kini tertangkap daftar+ pola-akhir-base+ jaring statistik "
    "(ATR<1,5% & mom7<1% & mom30<1,5%) di panel SASARAN-5 maupun otak-inti v1.1; "
    "(2) kronik dedup — entri identik tampil sekali; (3) 'hari ke-N' white-space nowrap. "
    "Uji nyata: 8 stablecoin tersaring, DUST dkk. tak tersalah-saring, 3 blok JS sah"
)


def dorong(path, berkas, pesan):
    try:
        sha = gh(f"{path}?ref={BRANCH}")["sha"]
    except urllib.error.HTTPError as e:
        if e.code == 404:
            sha = None
        else:
            raise
    content = open(berkas, "rb").read()
    data = {"message": pesan, "content": base64.b64encode(content).decode(), "branch": BRANCH}
    if sha:
        data["sha"] = sha
    r = gh(path, "PUT", data)
    print(f"DORONG OK {path}: {len(content)} byte · komit {r['commit']['sha'][:12]}")


dorong("otak-inti.js", "/home/z/my-project/hidup_repo/otak-inti.js",
       "V299b: otak-inti v1.1 — gerbang pegged 3-lapis (daftar+ pola+ jaring statistik), "
       "RLUSD/USDC/FDUSD kini mustahil lolos; 'hari ke-N' nowrap; DNA dihitung ulang tetap SAH")
dorong("arena.html", "/home/z/my-project/hidup_repo/arena.html", PESAN)
print("SELESAI")
