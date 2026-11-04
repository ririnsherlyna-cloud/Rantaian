#!/usr/bin/env python3
"""
DORONG OTOMATIS — dipanggil jantung arena (tiap denyut) atau manual.
Mendorong berkas cermin ke repo kanonik GitHub Pages, IDEMPOTEN:
  - skip bila isi remote SAMA
  - retry sekali bila konflik sha (409/422)
  - exit 0 diam bila token tak ada (jantung tak boleh mati karenanya)
Token: env GH_TOKEN, atau decode scripts/sarang/.token_micaprofita_b64
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

REPO = "ririnsherlyna-cloud/Micaprofita-"
BRANCH = "main"
PROYEK = "/home/z/my-project"
TOKEN_FILE = f"{PROYEK}/scripts/sarang/.token_micaprofita_b64"
FILES = [
    (f"{PROYEK}/download/arena.html", "arena.html"),
    (f"{PROYEK}/public/arena-keadaan.json", "arena-keadaan.json"),
    (f"{PROYEK}/public/gerbang.json", "gerbang.json"),
]


def ambil_token():
    t = os.environ.get("GH_TOKEN", "").strip()
    if t:
        return t
    try:
        with open(TOKEN_FILE) as f:
            return base64.b64decode(f.read().strip()).decode().strip()
    except Exception:
        return None


def api(tok, jalan, metode="GET", isi=None):
    url = f"https://api.github.com{jalan}"
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode)
    req.add_header("Authorization", f"Bearer {tok}")
    req.add_header("Accept", "application/vnd.github+json")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"message": str(e)}


def dorong(lokasi, jauh, tok):
    if not os.path.exists(lokasi):
        return f"LEWATI {jauh} (lokal tidak ada)"
    with open(lokasi, "rb") as f:
        isi = f.read()
    for coba in (1, 2):
        st, info = api(tok, f"/repos/{REPO}/contents/{jauh}?ref={BRANCH}")
        sha = info.get("sha") if st == 200 else None
        if sha:
            try:
                if base64.b64decode(info.get("content", "")) == isi:
                    return f"LEWATI {jauh} (sama, {len(isi)} B)"
            except Exception:
                pass
        body = {
            "message": f"denyut-otomatis: {jauh} — cermin setia arena AGI wadah [skip ci]",
            "content": base64.b64encode(isi).decode(),
            "branch": BRANCH,
        }
        if sha:
            body["sha"] = sha
        st, res = api(tok, f"/repos/{REPO}/contents/{jauh}", "PUT", body)
        if st in (200, 201):
            return f"OK    {jauh} terdorong ({len(isi)} B, {'perbarui' if sha else 'baru'})"
        if coba == 1 and st in (409, 422):
            time.sleep(2)
            continue
        return f"GAGAL {jauh}: HTTP {st} {str(res.get('message', ''))[:120]}"
    return f"GAGAL {jauh}: konflik sha berulang"


def main():
    tok = ambil_token()
    if not tok:
        print("dorong-otomatis: token tidak tersedia — lewati (tidak fatal)")
        return 0
    gagal = False
    for lokasi, jauh in FILES:
        baris = dorong(lokasi, jauh, tok)
        print(baris)
        if baris.startswith("GAGAL"):
            gagal = True
    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
