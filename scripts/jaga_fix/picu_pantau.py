#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Picu workflow via dispatch lalu pantau run terbaru sampai selesai.
argv: TOKEN WORKFLOW [MAKS_DETIK]"""
import json, sys, time, urllib.request, urllib.error

TOKEN = sys.argv[1]
WF = sys.argv[2]
MAKS = int(sys.argv[3]) if len(sys.argv) > 3 else 540
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"
UA = "micaprofita-picu"

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", UA)
    body = json.dumps(data).encode() if data else None
    if body: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, body) as resp:
            s = resp.read()
            return json.loads(s) if s else {}
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read()[:200], file=sys.stderr); raise

req(API + "/actions/workflows/" + WF + "/dispatches", data={"ref": "main"}, method="POST")
print("dispatch terkirim:", WF)
time.sleep(6)
run = None
t0 = time.time()
while time.time() - t0 < 90:
    runs = req(API + "/actions/workflows/" + WF + "/runs?per_page=3")
    items = runs.get("workflow_runs", [])
    if items and items[0]["head_sha"]:
        run = items[0]
        if run["run_started_at"] > time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t0 - 120)):
            break
    time.sleep(5)
if not run:
    print("run tak ketemu"); sys.exit(1)
print("run #%s id=%s status=%s" % (run["run_number"], run["id"], run["status"]))
akhir = time.time() + MAKS
while time.time() < akhir:
    r = req(API + "/actions/runs/" + str(run["id"]))
    print("  status:", r["status"], r.get("conclusion") or "")
    if r["status"] == "completed":
        print("VONIS:", r.get("conclusion"))
        sys.exit(0 if r.get("conclusion") == "success" else 2)
    time.sleep(15)
print("TIMEOUT menunggu run")
sys.exit(3)
