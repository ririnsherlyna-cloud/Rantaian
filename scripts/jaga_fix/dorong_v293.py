#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong 4 file V293 (otak-biner + kandang tanpa-blokir) ke repo Micaprofita via contents API."""
import base64, json, sys, urllib.request, urllib.error

TOKEN = sys.argv[1]
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"
UA = "micaprofita-v293-otak-biner"
PESAN = "V293 OTAK-BINER + TANPA-BLOKIR: nalar matematika-murni lahir lokal dari biner (tanpa menunggu kunci luar); sapu-penuh 254+ koin likuid dibedah tiap denyut (batas 60 dihapus); hukum pemilik: koin terbaik berulang DIJALANKAN & DIPERDALAM, tidak diblokir (penalti & kursi-segar V292 dibatalkan); otak-biner mengalir selaras arena-keadaan.json + sadar1 + hidup.html"

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", UA)
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, body) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, "pada:", e.url, file=sys.stderr)
        print("BODY:", e.read()[:400], file=sys.stderr)
        raise

BERKAS = [
    ("scripts/penjaga.mjs", "/home/z/my-project/hidup_repo/scripts/penjaga.mjs"),
    ("scripts/hidup/sadar1.js", "/home/z/my-project/hidup_repo/scripts/hidup/sadar1.js"),
    ("arena.html", "/home/z/my-project/hidup_repo/arena.html"),
    ("hidup.html", "/home/z/my-project/hidup_repo/hidup.html"),
]

for repo_path, local in BERKAS:
    content = open(local, "rb").read()
    b64 = base64.b64encode(content).decode()
    try:
        old = req(API + "/contents/" + repo_path + "?ref=main")
        sha = old["sha"]
    except urllib.error.HTTPError as e:
        if e.code == 404:
            sha = None
        else:
            raise
    data = {"message": PESAN, "content": b64, "branch": "main"}
    if sha:
        data["sha"] = sha
    req(API + "/contents/" + repo_path, data=data, method="PUT")
    print("PUSH OK:", repo_path, len(content), "bytes")
print("SEMUA FILE TERDORONG")
