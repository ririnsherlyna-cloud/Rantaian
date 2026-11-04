#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PULIHKAN-MEMORI-BENTENG (GEN-8 pasca rollback #4/#5):
Cari commit terakhir benteng/sasaran-zai.json yang picks-nya >= 10 (snapshot kaya),
lalu pulihkan sebagai versi terkini di repo Rantaian.
Benteng = memori jangka panjang; snapshot kosong (pasca-bootstrap otak) tak boleh jadi warisan."""
import json, base64, urllib.request

PAT = open("/home/z/my-project/.token-rantaian").read().strip()
REPO = "ririnsherlyna-cloud/Rantaian"
PATH = "benteng/sasaran-zai.json"
API = f"https://api.github.com/repos/{REPO}"
HEAD = {"Authorization": f"Bearer {PAT}", "User-Agent": "microprofita-hb",
        "Accept": "application/vnd.github+json"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEAD), timeout=20) as r:
        return json.loads(r.read().decode())

# 1) riwayat commit file
hist = get(f"{API}/commits?path={PATH}&per_page=15")
print("riwayat:", [(c["sha"][:7], c["commit"]["message"].split("\n")[0][:40]) for c in hist][:8])

# 2) ambil isi tiap commit dari terbaru, cari yang paling kaya
kaya = None
for c in hist[:10]:
    f = get(f"{API}/contents/{PATH}?ref={c['sha']}")
    try:
        isi = json.loads(base64.b64decode(f["content"].replace("\n", "")).decode("utf-8"))
    except Exception:
        continue
    n = len(isi.get("picks") or [])
    print(f"  {c['sha'][:7]}: picks={n} xau={'ADA' if isi.get('xau') else '-'} total={isi.get('total')}")
    if n >= 10 and kaya is None:
        kaya = (c["sha"], isi)

if not kaya:
    print("TIDAK ADA snapshot kaya di riwayat -> bentuk kaya hilang permanen (XAU tetap ada)")
    raise SystemExit(0)

sha_commit, isi = kaya
print("TERKAYA:", sha_commit[:7], "picks =", len(isi["picks"]))

# 3) bandingkan dgn versi terkini
cur = get(f"{API}/contents/{PATH}")
cur_isi = json.loads(base64.b64decode(cur["content"].replace("\n", "")).decode("utf-8"))
cur_n = len(cur_isi.get("picks") or [])
print("terkini: picks =", cur_n)
if cur_n >= len(isi["picks"]):
    print("terkini sudah cukup kaya -> tidak perlu restore")
    raise SystemExit(0)

# 4) restore: PUT versi kaya sebagai versi terkini
body = {"message": "pulihkan memori benteng: restore snapshot kaya dari " + sha_commit[:7] + " [skip ci]",
        "content": base64.b64encode(json.dumps(isi, ensure_ascii=False).encode("utf-8")).decode("ascii"),
        "sha": cur["sha"],
        "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}
req = urllib.request.Request(f"{API}/contents/{PATH}", data=json.dumps(body).encode(),
                             headers={**HEAD, "Content-Type": "application/json"}, method="PUT")
with urllib.request.urlopen(req, timeout=25) as r:
    out = json.loads(r.read().decode())
print("RESTORE OK:", out.get("commit", {}).get("sha", "?")[:7])
