#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Diagnosis repo akiomida/Io — rumah denyut server SARANG-PENJAGA."""
import json
import urllib.request

BASE = "https://api.github.com"
TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()


def get(url):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "microprofita-diag",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        return {"_http": e.code, "message": e.reason}


print("=== INFO REPO akiomida/Io ===")
r = get(f"{BASE}/repos/akiomida/Io")
if r.get("full_name"):
    print("private:", r.get("private"), "| pushed_at:", r.get("pushed_at"),
          "| default_branch:", r.get("default_branch"), "| archived:", r.get("archived"))
else:
    print("GAGAL:", r)

print("\n=== DAFTAR WORKFLOW ===")
w = get(f"{BASE}/repos/akiomida/Io/actions/workflows")
for wf in w.get("workflows", []):
    print(f"- {wf['name'][:40]} | state={wf['state']} | {wf['path']}")

print("\n=== 8 RUN TERAKHIR ===")
d = get(f"{BASE}/repos/akiomida/Io/actions/runs?per_page=8")
runs = d.get("workflow_runs", [])
if not runs:
    print("(tidak ada run — workflow mati total)")
for r in runs:
    print(f"{r['created_at']} | {r['name'][:30]} | {r['status']} | {r['conclusion']} | event={r['event']}")
