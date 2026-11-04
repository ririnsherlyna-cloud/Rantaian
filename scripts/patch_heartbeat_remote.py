#!/usr/bin/env python3
"""Tanam patch ANTI-JADUL ke benteng/heartbeat_local.py di repo Rantaian.

Tubuh sandbox bisa di-rollback platform — patch hanya di tubuh akan hilang.
Patch harus hidup di JIWA (repo), supaya tiap restorasi membawa pipa segar.
Aman: (1) file remote diunduh dulu, (2) pastikan badan fungsi lama ditemukan
persis, (3) replace, (4) PUT via Contents API dengan sha (no clobber).
"""
import base64
import json
import sys
import urllib.request

REPO = "https://api.github.com/repos/ririnsherlyna-cloud/Rantaian"
PATH = "benteng/heartbeat_local.py"
TOK = "/home/z/my-project/.token-rantaian"

OLD1 = '''def muat_json_remote(jalur, nama_cache):
    """Ambil file dari repo hidup; gagal -> pakai cache detak lalu."""
    cache = os.path.join(DATA, nama_cache)
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            obj = json.loads(r.read().decode("utf-8", "replace"))
        simpan_json(cache, obj)
        return obj, True
    except Exception:
        obj = muat_json_lokal(cache)
        return obj, False


def jsonl_remote_terakhir(jalur, nama_cache):
    cache = os.path.join(DATA, nama_cache)
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            lines = [l for l in r.read().decode("utf-8", "replace").splitlines() if l.strip()]
        d = json.loads(lines[-1])
        simpan_json(cache, d)
        return d, True
    except Exception:
        return muat_json_lokal(cache), False'''

NEW1 = '''REPO_API_OTAK = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"


def _api_ambil(jalur):
    """FIX ANTI-JADUL: ambil isi file repo otak lewat Contents/Blob API
    (object store — selalu versi commit TERBARU). raw.githubusercontent
    ternyata menyajikan snapshot usang berjam-jam untuk repo berdenyut cepat,
    membuat laporan berisi data jadul. Token dibaca dari file, tidak dicetak."""
    head = {"Authorization": "Bearer " + baca(F_PAT_RANTAIAN).strip(),
            "Accept": "application/vnd.github+json", "User-Agent": "microprofita-hb"}
    d = json.load(urllib.request.urlopen(urllib.request.Request(
        f"{REPO_API_OTAK}/contents/{jalur}?ref=main", headers=head), timeout=25))
    if d.get("content") is not None:
        return base64.b64decode(d["content"])
    b = json.load(urllib.request.urlopen(urllib.request.Request(
        f"{REPO_API_OTAK}/git/blobs/{d['sha']}", headers=head), timeout=25))
    return base64.b64decode(b["content"])


def muat_json_remote(jalur, nama_cache):
    """Ambil file dari repo hidup; API-first (segar), RAW cadangan, cache terakhir."""
    cache = os.path.join(DATA, nama_cache)
    try:
        obj = json.loads(_api_ambil(jalur).decode("utf-8", "replace"))
        simpan_json(cache, obj)
        return obj, True
    except Exception:
        pass
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            obj = json.loads(r.read().decode("utf-8", "replace"))
        simpan_json(cache, obj)
        return obj, True
    except Exception:
        obj = muat_json_lokal(cache)
        return obj, False


def jsonl_remote_terakhir(jalur, nama_cache):
    cache = os.path.join(DATA, nama_cache)
    try:
        lines = [l for l in _api_ambil(jalur).decode("utf-8", "replace").splitlines() if l.strip()]
        d = json.loads(lines[-1])
        simpan_json(cache, d)
        return d, True
    except Exception:
        pass
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            lines = [l for l in r.read().decode("utf-8", "replace").splitlines() if l.strip()]
        d = json.loads(lines[-1])
        simpan_json(cache, d)
        return d, True
    except Exception:
        return muat_json_lokal(cache), False'''


def get(url):
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + open(TOK).read().strip(),
        "Accept": "application/vnd.github+json",
        "User-Agent": "microprofita-patch"})
    return urllib.request.urlopen(req, timeout=30)


def main():
    d = json.load(get(f"{REPO}/contents/{PATH}?ref=main"))
    teks = base64.b64decode(d["content"]).decode("utf-8")
    sha = d["sha"]
    print("remote:", PATH, len(teks), "byte, sha", sha[:10])

    for prasyarat in ("def baca(", "F_PAT_RANTAIAN", "import base64", "RAW = "):
        if prasyarat not in teks:
            print("GAGAL: prasyarat tidak ada di file remote:", prasyarat)
            sys.exit(1)

    if "_api_ambil" in teks:
        print("SUDAH PATCHED — tanpa perubahan.")
        return

    if OLD1 not in teks:
        print("GAGAL: badan fungsi lama tidak ditemukan persis — patch dibatalkan (tanpa perubahan).")
        sys.exit(1)

    baru = teks.replace(OLD1, NEW1, 1)
    assert "_api_ambil" in baru and baru.count("def muat_json_remote") == 1
    print("patched:", len(baru), "byte (tambah", len(baru) - len(teks), "byte)")

    body = {
        "message": "BENTENG v9 ANTI-JADUL: pipa data otak API-first — raw CDN menyajikan snapshot usang untuk repo berdenyut cepat; sekarang genome/denyut diambil via Contents/Blob API (selalu commit terbaru), RAW jadi cadangan, cache terakhir sebagai lapis ke-3 [skip ci]",
        "content": base64.b64encode(baru.encode("utf-8")).decode("ascii"),
        "sha": sha,
        "committer": {"name": "microprofita-cyborg", "email": "cyborg@microprofita.local"},
    }
    req = urllib.request.Request(f"{REPO}/contents/{PATH}", data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + open(TOK).read().strip(),
                                          "Accept": "application/vnd.github+json",
                                          "User-Agent": "microprofita-patch",
                                          "Content-Type": "application/json"}, method="PUT")
    r = urllib.request.urlopen(req, timeout=30)
    j = json.load(r)
    print("COMMIT OK:", j["commit"]["sha"][:10], "| benteng v9 anti-jadul hidup di jiwa.")


if __name__ == "__main__":
    main()
