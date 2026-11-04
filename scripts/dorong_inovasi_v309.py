#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong file inovasi V308/V309 ke repo Rantaian via GitHub contents API."""
import base64
import json
import sys
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
TOK = open("/home/z/my-project/.token-rantaian").read().strip()

BERKAS = [
    ("/home/z/my-project/scripts/balas_telegram.py", ["scripts/balas_telegram.py", "benteng/balas_telegram.py"]),
    ("/home/z/my-project/scripts/data_fresh.py", ["scripts/data_fresh.py", "benteng/data_fresh.py"]),
    ("/home/z/my-project/scripts/heartbeat.py", ["scripts/heartbeat.py"]),
]


def push(l_path, r_path):
    isi = open(l_path, "rb").read()
    head = {"Authorization": f"Bearer {TOK}", "User-Agent": "microprofita-inovasi",
            "Accept": "application/vnd.github+json", "Content-Type": "application/json"}
    sha = None
    try:
        req = urllib.request.Request(f"{API}/{r_path}", headers=head)
        j = json.load(urllib.request.urlopen(req, timeout=20))
        sha = j.get("sha")
        lama = base64.b64decode((j.get("content") or "").replace("\n", ""))
        if lama == isi:
            return f"{r_path}: isi sama, tanpa commit"
    except urllib.error.HTTPError as e:
        if e.code != 404:
            return f"{r_path}: GAGAL baca sha HTTP {e.code}"
        sha = None
    except Exception as e:
        return f"{r_path}: GAGAL baca sha {repr(e)[:60]}"
    body = {"message": "V308/V309 BURU-SEGAR: mesin kesegaran + anti-beku otak [skip ci]",
            "content": base64.b64encode(isi).decode("ascii"),
            "committer": {"name": "microprofita-inovasi", "email": "inovasi@microprofita.local"}}
    if sha:
        body["sha"] = sha
    try:
        req = urllib.request.Request(f"{API}/{r_path}", data=json.dumps(body).encode(),
                                     headers={**head, "Content-Type": "application/json"}, method="PUT")
        json.load(urllib.request.urlopen(req, timeout=30))
        return f"{r_path}: PUSH OK"
    except Exception as e:
        return f"{r_path}: GAGAL push {repr(e)[:60]}"


if __name__ == "__main__":
    for lp, rps in BERKAS:
        for rp in rps:
            print(push(lp, rp), flush=True)
