#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bedah repo ririnsherlyna-cloud/Micaprofita- — komit terakhir, workflow, run terakhir."""
import json
import urllib.request

BASE = "https://api.github.com"
REPO = "repos/ririnsherlyna-cloud/Micaprofita-"
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


print("=== 5 KOMIT TERAKHIR Micaprofita- ===")
cs = get(f"{BASE}/{REPO}/commits?per_page=5")
if isinstance(cs, list):
    for c in cs:
        print(c["commit"]["committer"]["date"], "|",
              c["commit"]["committer"]["name"], "|",
              c["commit"]["message"].splitlines()[0][:90])
else:
    print("GAGAL:", cs)

print("\n=== WORKFLOW Micaprofita- ===")
w = get(f"{BASE}/{REPO}/actions/workflows")
if isinstance(w, dict) and w.get("workflows") is not None:
    for wf in w["workflows"]:
        print(f"- {wf['name'][:40]} | state={wf['state']} | {wf['path']}")
else:
    print("GAGAL:", w)

print("\n=== 5 RUN TERAKHIR ===")
d = get(f"{BASE}/{REPO}/actions/runs?per_page=5")
runs = d.get("workflow_runs", []) if isinstance(d, dict) else []
if not runs:
    print("(tidak ada run)")
for r in runs:
    print(f"{r['created_at']} | {r['name'][:30]} | {r['status']} | {r['conclusion']} | event={r['event']}")

print("\n=== CEK JALUR LAPORAN DI Micaprofita- ===")
t = get(f"{BASE}/{REPO}/git/trees/main?recursive=1")
tree = t.get("tree", []) if isinstance(t, dict) else []
for key in ("laporan/sasaran-terkini.json", "laporan/denyut-server.jsonl", "otak/genome-server.json", ".github/workflows/sakti-denyut.yml"):
    ada = any(x["path"] == key for x in tree)
    print(("ADA  " if ada else "TIDAK"), key)
