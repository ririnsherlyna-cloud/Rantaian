#!/usr/bin/env python3
# Dorong komponen WASIAT-ABADI ke repo Rantaian (contents API).
import base64
import json
import sys

sys.path.insert(0, "/home/z/my-project/scripts")
from sinkron_wasiat import API, req  # pemakaian ulang req + API

BERKAS = [
    ("/home/z/my-project/scripts/wasiat-abadi.yml", ".github/workflows/wasiat-abadi.yml",
     "wasiat: workflow audit lapis + jurnal sandbox (v1)"),
    ("/home/z/my-project/scripts/wasiat_abadi.py", "scripts/wasiat_abadi.py",
     "wasiat: auditor lapis abadi + jurnal tidur sandbox (v1)"),
]

for lokal, jauh, pesan in BERKAS:
    isi = open(lokal, "rb").read()
    st, cur = req("GET", f"{API}/contents/{jauh}")
    sha = cur.get("sha") if st == 200 and isinstance(cur, dict) else None
    body = {"message": pesan + " [skip ci]", "content": base64.b64encode(isi).decode()}
    if sha:
        body["sha"] = sha
    st2, res = req("PUT", f"{API}/contents/{jauh}", body)
    print(jauh, "HTTP", st2, "OK" if st2 in (200, 201) else str(res)[:200])
    if st2 not in (200, 201):
        sys.exit(1)
