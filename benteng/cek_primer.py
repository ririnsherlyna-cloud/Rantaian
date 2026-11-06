#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CEK PRIMER — denyut rantai primer benteng-balas.yml masih hidup?

Kontrak wadah kedua (v9 anti-firehose): run terakhir primer < 11 menit ->
PRIMER_HIDUP=true (wadah kedua STANDBY, tidak mewarisi diri). Selain itu
PRIMER_HIDUP=false -> wadah kedua membangunkan primer & mengambil giliran.

Selalu exit 0 — percabangan ditangani `if: env.PRIMER_HIDUP` di workflow.
"""
import json
import os
import time
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
PRIMER = "benteng-balas.yml"
AMBANG_MENIT = 11.0

gh = os.environ.get("GH_TOKEN", "")
hidup = False
try:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/workflows/{PRIMER}/runs?per_page=1",
        headers={"Authorization": f"Bearer {gh}", "Accept": "application/vnd.github+json",
                 "User-Agent": "benteng-balas-2"})
    with urllib.request.urlopen(req, timeout=15) as r:
        run = json.loads(r.read().decode())["workflow_runs"][0]
    dibuat = time.mktime(time.strptime(run["created_at"], "%Y-%m-%dT%H:%M:%SZ"))
    umur = (time.time() - dibuat) / 60.0
    hidup = umur < AMBANG_MENIT
    print(f"PRIMER: run #{run['run_number']} status={run['status']} conclusion={run['conclusion']} "
          f"umur={umur:.1f} mnt -> PRIMER_HIDUP={str(hidup).lower()}")
except Exception as e:
    print("CEK PRIMER GAGAL (dianggap mati agar wadah kedua mengawasi):", repr(e)[:120])

ef = os.environ.get("GITHUB_ENV")
if ef:
    with open(ef, "a", encoding="utf-8") as f:
        f.write(f"PRIMER_HIDUP={'true' if hidup else 'false'}\n")
raise SystemExit(0)
