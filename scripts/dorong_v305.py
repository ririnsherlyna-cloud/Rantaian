#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DORONG V305 — mandat pemilik 31 Okt: fokus baru Telegram.
Menyuntikkan 3 berkas ke repo Rantaian via GitHub Contents API:
  1. scripts/benteng_telegram.py            (detak lean + notif sentuhan + lapor ATH harian)
  2. benteng/heartbeat_local.py             (mirror heartbeat.py sandbox V305)
  3. .github/workflows/benteng-telegram.yml (commit data/lapor_ath_state.json)
Token dibaca dari /home/z/my-project/.token-rantaian — TIDAK PERNAH dicetak.
"""
import base64
import json
import sys
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
TOK = open("/home/z/my-project/.token-rantaian").read().strip()

BERKAS = [
    ("scripts/benteng_telegram.py", "/home/z/my-project/scripts/benteng_telegram.py",
     "V305 fokus Telegram: tanpa daftar sinyal; notif sentuhan level + lapor harian ATH -70..-90% masih hidup (mandat pemilik 31 Okt)"),
    ("benteng/heartbeat_local.py", "/home/z/my-project/scripts/heartbeat.py",
     "V305 heartbeat sandbox: detak lean tanpa daftar sinyal + jam WIB tahan-drift"),
    (".github/workflows/benteng-telegram.yml", "/tmp/benteng-telegram.yml",
     "workflow benteng-telegram: komit state lapor ATH harian"),
]


def api(path, data=None, method="GET"):
    req = urllib.request.Request(
        f"{API}/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {TOK}", "User-Agent": "benteng-dorong",
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def dorong(jalur, lokal, pesan):
    with open(lokal, "rb") as f:
        konten = base64.b64encode(f.read()).decode()
    sha = None
    try:
        sha = api(f"{jalur}?ref=main").get("sha")
    except Exception:
        sha = None  # berkas baru
    body = json.dumps({"message": pesan, "content": konten,
                       "sha": sha, "branch": "main"}).encode()
    out = api(jalur, data=body, method="PUT")
    commit = (out.get("commit") or {}).get("sha", "?")
    print(f"DORONG OK {jalur} -> commit {commit[:10]}")
    return True


def main():
    gagal = 0
    for jalur, lokal, pesan in BERKAS:
        try:
            dorong(jalur, lokal, pesan)
        except Exception as e:
            gagal += 1
            print(f"DORONG GAGAL {jalur}: {repr(e)}")
    if gagal:
        sys.exit(1)
    print("SEMUA BERKAS TERDORONG — lapis abadi akan memakai V305 pada run berikutnya.")


if __name__ == "__main__":
    main()
