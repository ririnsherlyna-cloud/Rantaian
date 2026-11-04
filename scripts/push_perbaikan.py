#!/usr/bin/env python3
"""GEN-10 FIX GANTI-HARI: tanam 3 file berpatch ke repo Rantaian agar
restorasi benteng & lapis Actions mewarisi perbaikan koin-hari-ini:
  1. benteng/heartbeat_local.py  (sumber restorasi scripts/heartbeat.py)
  2. benteng/balas_telegram.py   (sumber restorasi RESPON)
  3. scripts/balas_telegram.py   (sumber restorasi PENJAGA-WD)
Tanpa token di pesan commit; [skip ci] agar rantai abadi tak terganggu."""
import base64
import json
import sys
import urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
BERKAS = [
    ("/home/z/my-project/scripts/heartbeat.py", "benteng/heartbeat_local.py"),
    ("/home/z/my-project/scripts/balas_telegram.py", "benteng/balas_telegram.py"),
    ("/home/z/my-project/scripts/balas_telegram.py", "scripts/balas_telegram.py"),
]
PESAN = "GEN-10 GANTI-HARI: koin hari ini wajib menimpa koin kemarin + label tanggal di /sasaran [skip ci]"


def main():
    pat = open("/home/z/my-project/.token-rantaian").read().strip()
    head = {"Authorization": f"Bearer {pat}", "User-Agent": "microprofita-hb",
            "Accept": "application/vnd.github+json"}
    hasil = []
    for lokal, repo_jalur in BERKAS:
        isi = open(lokal, "rb").read()
        api = f"https://api.github.com/repos/{REPO}/contents/{repo_jalur}"
        sha = None
        try:
            req = urllib.request.Request(api + "?ref=main", headers=head)
            j = json.loads(urllib.request.urlopen(req, timeout=20).read().decode())
            sha = j.get("sha")
            sama = base64.b64decode((j.get("content") or "").replace("\n", "")) == isi
            if sama:
                hasil.append(f"{repo_jalur}: sudah sama, tanpa commit")
                continue
        except Exception:
            sha = None  # 404 -> buat baru
        body = {"message": PESAN,
                "content": base64.b64encode(isi).decode("ascii"),
                "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}
        if sha:
            body["sha"] = sha
        try:
            req = urllib.request.Request(api, data=json.dumps(body).encode(),
                                         headers={**head, "Content-Type": "application/json"},
                                         method="PUT")
            j = json.loads(urllib.request.urlopen(req, timeout=25).read().decode())
            hasil.append(f"{repo_jalur}: commit OK ({j.get('commit', {}).get('sha', '?')[:10]})")
        except Exception as e:
            hasil.append(f"{repo_jalur}: GAGAL {repr(e)[:100]}")
            hasil_ok = False
    print("\n".join(hasil))
    return 0 if all("GAGAL" not in h for h in hasil) else 1


if __name__ == "__main__":
    sys.exit(main())
