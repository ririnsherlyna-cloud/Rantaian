#!/usr/bin/env python3
# PULIHKAN-WORKFLOW — angkat 4 yml dari tubuh lokal ke .github/workflows di main
# (folder .github lenyap dari cangkang GitHub; tubuh lokal tetap utuh -> kembalikan)
import base64, json, urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()
BERKAS = [
    ("scripts/yml_v9/benteng-balas.yml", ".github/workflows/benteng-balas.yml"),
    ("scripts/yml_v9/benteng-balas-2.yml", ".github/workflows/benteng-balas-2.yml"),
    ("scripts/yml_v9/benteng-telegram.yml", ".github/workflows/benteng-telegram.yml"),
    ("scripts/wasiat-abadi.yml", ".github/workflows/wasiat-abadi.yml"),
]

def api(url, data=None, method="GET"):
    req = urllib.request.Request(url, method=method, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "pulihkan-workflow/1",
    }, data=json.dumps(data).encode() if data else None)
    with urllib.request.urlopen(req, timeout=15) as r:
        body = r.read()
        return r.status, (json.loads(body) if body else None)

for lokal, remote in BERKAS:
    isi = open(f"/home/z/my-project/{lokal}", "rb").read()
    # cek eksisting (untuk sha)
    try:
        st, lama = api(f"https://api.github.com/repos/{REPO}/contents/{remote}?ref=main")
        sha = lama.get("sha")
    except Exception:
        sha = None
    payload = {
        "message": f"pulihkan {remote.split('/')[-1]} dari tubuh lokal [skip ci]",
        "content": base64.b64encode(isi).decode(),
        "branch": "main",
    }
    if sha:
        payload["sha"] = sha
    try:
        st, res = api(f"https://api.github.com/repos/{REPO}/contents/{remote}", payload, "PUT")
        print(f"OK  {remote} -> HTTP {st} commit {res['commit']['sha'][:8]}")
    except Exception as e:
        print(f"GAGAL {remote}: {e}")
