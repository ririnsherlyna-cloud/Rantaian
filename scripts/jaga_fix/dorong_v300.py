#!/usr/bin/env python3
# DORONG V300-MANDIRI-NADIR — arena.html + hidup.html + otak-inti.js ke GitHub Pages.
# Latar: pemilik menemukan panel NADIR arena selalu menampilkan GTC/SAND —
# denyut wadah tertunda sejak 2026-10-05 tampil selamanya seakan hardcode.
# Hukum V300: denyut tua TIDAK pernah tampil sebagai pick hari ini —
# arena & ruang-hidup menilai sendiri kandang Binance langsung (mandiri),
# dan pulih otomatis ke denyut wadah saat wadah segar kembali.
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
    "V300-MANDIRI-NADIR: denyut wadah tua tidak pernah lagi tampil sebagai pick "
    "hari ini (kasus GTC/SAND menganga dari 2026-10-05). arena.html: panel NADIR "
    "beralih MODE MANDIRI — memakai snapshot otak-inti (bedahKandang+levelETS, "
    "nol lomba K_JALAN lewat ketikaSnap), kartu E-T-S penuh + harga hidup 60 dtk, "
    "arsip denyut lama disebut jujur, pulih otomatis saat wadah segar. hidup.html: "
    "simbolSasaran digerbang kesegaran — cermin tua tak lagi menuntun sasaran; "
    "aktSasaranMandiri menyusun sasaran sendiri dari kandang Binance (pegged "
    "3-lapis). otak-inti v1.2: hukum V300 + denyutSegar + uji 7/7 + snap/ketikaSnap."
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
    ukuran = r.get("content", {}).get("size", "?")
    komit = r.get("commit", {}).get("sha", "?")[:12]
    print(f"OK {path}: {ukuran} B · komit {komit}")


if __name__ == "__main__":
    dasar = "/home/z/my-project/hidup_repo"
    dorong("arena.html", f"{dasar}/arena.html", PESAN + " [1/3 arena]")
    dorong("hidup.html", f"{dasar}/hidup.html", PESAN + " [2/3 hidup]")
    dorong("otak-inti.js", f"{dasar}/otak-inti.js", PESAN + " [3/3 otak-inti v1.2]")
    print("V300-MANDIRI-NADIR terdorong utuh — CDN Pages menyegarkan ±8 menit")
