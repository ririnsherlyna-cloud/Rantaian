#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tanam workflow+script BENTENG ke repo Rantaian, lalu picu run pertama & pantau hasil."""
import base64
import json
import time
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}"
TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()
H = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json",
     "User-Agent": "benteng-planter"}


def api(url, method="GET", body=None, ok_codes=(200, 201, 204)):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=H, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status == 204:
            return {}
        return json.loads(r.read().decode() or "{}")


def put_file(path, local, pesan):
    content = base64.b64encode(open(local, "rb").read()).decode()
    sha = None
    try:
        sha = api(f"{API}/contents/{path}")["sha"]
    except Exception:
        pass
    body = {"message": pesan, "content": content, "branch": "main"}
    if sha:
        body["sha"] = sha
    r = api(f"{API}/contents/{path}", "PUT", body)
    print(f"TANAM {path}: OK commit={r['commit']['sha'][:8]}")


put_file("scripts/benteng_telegram.py", "/home/z/my-project/benteng_rantaian/scripts/benteng_telegram.py",
         "BENTENG: penjaga level lapis abadi (token dari benteng/nyawa.json, izin pemilik)")
put_file(".github/workflows/benteng-telegram.yml",
         "/home/z/my-project/benteng_rantaian/.github/workflows/benteng-telegram.yml",
         "BENTENG: workflow detak abadi tiap 30 menit")

# picu run pertama
try:
    api(f"{API}/actions/workflows/benteng-telegram.yml/dispatches", "POST",
        {"ref": "main"}, ok_codes=(204,))
    print("DISPATCH: OK (run pertama dipicu)")
except Exception as e:
    print("DISPATCH gagal (normal bila workflow baru terindeks):", repr(e))
