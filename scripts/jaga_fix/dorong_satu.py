#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong satu file ke repo Micaprofita via contents API (update)."""
import base64, json, sys, urllib.request, urllib.error

TOKEN, REPO_PATH, LOCAL = sys.argv[1], sys.argv[2], sys.argv[3]
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "micaprofita-v291-jantung")
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

content = open(LOCAL, "rb").read()
b64 = base64.b64encode(content).decode()
old = req(API + "/contents/" + REPO_PATH + "?ref=main")
req(API + "/contents/" + REPO_PATH, data={
    "message": "V291 ANTI-BALAPAN: push SARANG-PENJAGA ber-retry rebase (denyut #77 tidak hilang lagi saat SADAR-1 menyegel bersamaan)",
    "content": b64,
    "sha": old["sha"],
    "branch": "main",
}, method="PUT")
print("PUSH OK:", REPO_PATH, len(content), "bytes")
