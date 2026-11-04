#!/usr/bin/env python3
"""V308: komit balas_telegram.py terperbaiki ke dua jalur repo Rantaian
(benteng/ + scripts/) agar lapis abadi memulihkan versi V308, bukan versi
bug-paprika. HTTP 204/200 = sukses. Tanpa menampilkan token."""
import base64
import json
import sys
import urllib.request

PAT = open("/home/z/my-project/.token-rantaian").read().strip()
LOCAL = "/home/z/my-project/scripts/balas_telegram.py"
TARGETS = ["benteng/balas_telegram.py", "scripts/balas_telegram.py"]
API = "https://api.github.com/repos/ririnsherlyna-cloud/Rantaian/contents/"

isi = open(LOCAL, "rb").read()
isi_b64 = base64.b64encode(isi).decode("ascii")
hasil = []
for path in TARGETS:
    head = {"Authorization": f"Bearer {PAT}", "User-Agent": "microprofita-hb",
            "Accept": "application/vnd.github+json"}
    try:
        with urllib.request.urlopen(urllib.request.Request(API + path, headers=head), timeout=15) as r:
            j = json.loads(r.read().decode())
        lama = base64.b64decode((j.get("content") or "").replace("\n", ""))
        if lama == isi:
            hasil.append(f"{path}: sudah sama -> tanpa commit")
            continue
        sha = j.get("sha")
    except Exception as e:
        hasil.append(f"{path}: gagal baca sha {repr(e)[:60]}")
        continue
    body = json.dumps({"message": "V308 anti-beku: radar ATH real-time (heartbeat) + perbaikan akar paprika quotes.USD [skip ci]",
                       "content": isi_b64, "sha": sha, "branch": "main",
                       "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}).encode()
    req = urllib.request.Request(API + path, data=body, headers=head, method="PUT")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            hasil.append(f"{path}: komit HTTP {r.status}")
    except Exception as e:
        hasil.append(f"{path}: gagal komit {repr(e)[:60]}")
print(" | ".join(hasil))
sys.exit(0 if all("komit HTTP 20" in h or "sudah sama" in h for h in hasil) else 1)
