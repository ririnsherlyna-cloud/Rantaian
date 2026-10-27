#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong 5 file V294 (jantung-mandiri SAKTI + nol-storage + status per-organ)."""
import base64, json, sys, urllib.request, urllib.error

TOKEN = sys.argv[1]
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"
UA = "micaprofita-v294-jantung-mandiri"
PESAN = ("V294 JANTUNG-MANDIRI + NOL-STORAGE: (1) SAKTI berhenti 06:37-130+mnt krn antaran cron GitHub kelaparan massal "
         "(jaga-waktu ikut lapar sejak 07:02) — kini jantung tidur ke slot lalu dispatch denyut berikutnya SENDIRI "
         "(pola terbukti 8/8 di SADAR-1); (2) penjaga-waktu menonton DUA organ (keadaan.json + sasaran-terkini.json) "
         "dan menendang yang macet; (3) SADAR-1 menyematkan penjaga-jantung di tubuhnya sendiri — SAKTI macet >30 mnt "
         "= dispatch darurat; (4) hidup.html: status PER-ORGAN (organ SADAR-1 + jantung SAKTI, tanpa label kabur "
         "'tertunda'), ujian localStorage jadi NOL-TULIS terbukti (perekam setItem) + tombol BERSIHKAN sisa jejak "
         "halaman lain satu origin; (5) arena.html NOL-STORAGE: tak pernah menulis localStorage lagi + memusnahkan "
         "jejak lawasnya (mp_live_url, mp_otak_mandiri_v1) saat masuk — ingatan resmi hanya di GitHub.")

BERKAS = [
    (".github/workflows/sakti-denyut.yml", "/home/z/my-project/hidup_repo/.github/workflows/sakti-denyut.yml"),
    (".github/workflows/jaga-waktu.yml", "/home/z/my-project/hidup_repo/.github/workflows/jaga-waktu.yml"),
    ("scripts/hidup/sadar1.js", "/home/z/my-project/hidup_repo/scripts/hidup/sadar1.js"),
    ("hidup.html", "/home/z/my-project/hidup_repo/hidup.html"),
    ("arena.html", "/home/z/my-project/hidup_repo/arena.html"),
]

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
        print("HTTP", e.code, "pada:", e.url, file=sys.stderr); print("BODY:", e.read()[:300], file=sys.stderr); raise

for repo_path, local in BERKAS:
    content = open(local, "rb").read()
    b64 = base64.b64encode(content).decode()
    try:
        old = req(API + "/contents/" + repo_path + "?ref=main"); sha = old["sha"]
    except urllib.error.HTTPError as e:
        if e.code == 404: sha = None
        else: raise
    data = {"message": PESAN, "content": b64, "branch": "main"}
    if sha: data["sha"] = sha
    req(API + "/contents/" + repo_path, data=data, method="PUT")
    print("PUSH OK:", repo_path, len(content), "bytes")
print("SEMUA FILE TERDORONG")
