#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Diagnostik repo remote Rantaian: komit, workflow runs, peta jalur, denyut terakhir."""
import json
import urllib.request

BASE = "https://api.github.com"
REPO = "repos/ririnsherlyna-cloud/Rantaian"
TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()


def get(url, raw=False):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "microprofita-diag",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read().decode("utf-8", "replace")
        return data if raw else json.loads(data)


print("=== 3 KOMIT TERAKHIR ===")
try:
    cs = get(f"{BASE}/{REPO}/commits?per_page=3")
    if isinstance(cs, list):
        for c in cs:
            print(c["commit"]["committer"]["date"], "|",
                  c["commit"]["message"].splitlines()[0][:80])
    else:
        print("respons tak terduga:", str(cs)[:200])
except Exception as e:
    print("GAGAL:", repr(e))

print("\n=== 5 RUN WORKFLOW TERAKHIR ===")
try:
    d = get(f"{BASE}/{REPO}/actions/runs?per_page=5")
    runs = d.get("workflow_runs", [])
    if not runs:
        print("(tidak ada run workflow)")
    for r in runs:
        print(r["created_at"], "|", r["name"][:35], "|", r["status"], "|", r["conclusion"])
except Exception as e:
    print("GAGAL:", repr(e))

print("\n=== PETA JALUR SAKTI DI REMOTE ===")
paths = []
try:
    t = get(f"{BASE}/{REPO}/git/trees/main?recursive=1")
    paths = [x["path"] for x in t.get("tree", []) if "sakti" in x["path"]]
    for p in paths[:40]:
        print(p)
    print(f"(total {len(paths)} jalur ber-'sakti')")
except Exception as e:
    print("GAGAL:", repr(e))

print("\n=== DENYUT-SERVER REMOTE (baris terakhir) ===")
target = next((p for p in paths if p.endswith("denyut-server.jsonl")), None)
print("jalur:", target)
if target:
    try:
        raw = get(f"https://raw.githubusercontent.com/ririnsherlyna-cloud/Rantaian/main/{target}", raw=True)
        lines = [l for l in raw.splitlines() if l.strip()]
        print("total baris:", len(lines))
        d = json.loads(lines[-1])
        kunci = ("dihasilkan", "waktu", "ts", "timestamp", "siklus", "versi", "protokol")
        print("terakhir:", json.dumps({k: d.get(k) for k in kunci if k in d}, ensure_ascii=False)[:400])
    except Exception as e:
        print("GAGAL:", repr(e))
