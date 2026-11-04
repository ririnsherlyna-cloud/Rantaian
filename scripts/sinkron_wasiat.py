#!/usr/bin/env python3
# ============================================================
# SINKRON-WASIAT v1 — ingatan abadi worklog sandbox.
# Latar: disk sandbox z.ai bisa rollback ke snapshot lama (kasus nyata
# rollback #7, #8, #10 pada 1 Nov 2026) sehingga sejarah worklog lokal
# bisa terhapus. Solusi: union DUA ARAH antara worklog lokal dan
# data/worklog_sandbox.md di repo Rantaian — entri yang hilang di lokal
# dipulihkan dari repo, entri baru di lokal didorong ke repo. Kunci
# dedup = baris 'Task ID: <id>'. Juga menulis denyut sandbox
# (data/stamp_sandbox.json) agar lapis abadi di GitHub bisa menjurnal
# tidur-sandbox dari luar (kebal rollback). Menyalin diri sendiri ke
# repo supaya bisa dipulihkan bila terhapus rollback.
# ATURAN: JANGAN pernah menampilkan token; gagal jaringan -> keluar
# dengan kode != 0 tanpa menulis apa pun ke lokal.
# ============================================================
import base64
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}"
WIB = timezone(timedelta(hours=7))
LOKAL = "/home/z/my-project/worklog.md"
DIRI = "/home/z/my-project/scripts/sinkron_wasiat.py"


def req(method, url, payload=None, ctype="application/vnd.github+json", raw=False):
    data = None if payload is None else json.dumps(payload).encode()
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", "Bearer " + open("/home/z/my-project/.token-rantaian").read().strip())
    r.add_header("Accept", ctype)
    r.add_header("User-Agent", "sinkron-wasiat")
    try:
        with urllib.request.urlopen(r, timeout=40) as resp:
            b = resp.read()
            return resp.status, (b if raw else (json.loads(b) if b else None))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:300]
    except Exception as e:
        return 0, str(e)[:300]


def parse(text):
    """-> (header, [entri]) dengan entri dipisah baris '---'."""
    parts = re.split(r"(?m)^---\s*$", text or "")
    header, ents = "", []
    for i, p in enumerate(parts):
        if i == 0 and not re.search(r"(?m)^Task ID: \S+", p):
            header = p.rstrip()
        elif p.strip():
            ents.append(p.strip("\n"))
    return header, ents


def kunci(ent):
    # Kunci = hash isi (Task ID TIDAK unik antarhari — kasus nyata
    # 'Task ID: 21' dipakai dua tugas berbeda, PENJAGA-WD-0422 kemarin+ini).
    m = re.search(r"(?m)^Task ID: (\S+)", ent)
    normal = "\n".join(l.rstrip() for l in ent.strip().splitlines())
    h = hashlib.md5(normal.encode()).hexdigest()[:12]
    return (m.group(1) + "#" if m else "HASH#") + h


def render(header, ents):
    out = (header + "\n") if header.strip() else ""
    for e in ents:
        out += "---\n" + e.strip("\n") + "\n"
    return out


def gabung(header_l, ents_l, header_r, ents_r):
    """Union: repo dulu (urutan asli), lalu entri lokal yang belum ada di repo."""
    kr = [kunci(e) for e in ents_r]
    kl = [kunci(e) for e in ents_l]
    merged, seen = list(ents_r), set(kr)
    for e, k in zip(ents_l, kl):
        if k not in seen:
            merged.append(e)
            seen.add(k)
    pulih = sum(1 for k in kr if k not in set(kl))   # ada di repo, hilang di lokal (rollback)
    baru = sum(1 for k in kl if k not in set(kr))    # entri lokal baru
    return render(header_r or header_l, merged), pulih, baru


def push_file(path, content_bytes, pesan):
    st, cur = req("GET", f"{API}/contents/{path}")
    sha = cur.get("sha") if st == 200 and isinstance(cur, dict) else None
    body = {"message": pesan + " [skip ci]", "content": base64.b64encode(content_bytes).decode()}
    if sha:
        body["sha"] = sha
    st2, res = req("PUT", f"{API}/contents/{path}", body)
    return st2 in (200, 201)


def utama():
    now = datetime.now(WIB)
    try:
        lokal = open(LOKAL, encoding="utf-8").read()
    except FileNotFoundError:
        lokal = ""
    st, repo_raw = req("GET", f"{API}/contents/data/worklog_sandbox.md",
                       ctype="application/vnd.github.raw", raw=True)
    repo_txt = repo_raw.decode("utf-8", "replace") if st == 200 and isinstance(repo_raw, (bytes, bytearray)) else None

    hl, el = parse(lokal)
    hr, er = parse(repo_txt or "")
    teks, pulih, baru = gabung(hl, el, hr, er)

    ok1 = push_file("data/worklog_sandbox.md", teks.encode(), "wasiat: ingatan worklog sandbox")
    stamp = {"epoch": time.time(), "wib": now.strftime("%F %T"), "tubuh": "sandbox-zai"}
    ok2 = push_file("data/stamp_sandbox.json", json.dumps(stamp).encode(), "wasiat: denyut sandbox")

    # salin diri ke repo agar kebal rollback
    try:
        ok3 = push_file("scripts/sinkron_wasiat.py", open(DIRI, "rb").read(), "wasiat: salinan sinkron_wasiat")
    except Exception:
        ok3 = False

    if not (ok1 and ok2):
        print(f"PUSH GAGAL worklog={ok1} stamp={ok2}")
        return 1

    # tulis balik union ke lokal (memulihkan yang hilang oleh rollback)
    if teks != lokal:
        open(LOKAL, "w", encoding="utf-8").write(teks)

    print(f"OK pulih={pulih} baru={baru} total={len(parse(teks)[1])}")
    if pulih:
        print(f"PULIH: {pulih} entri worklog dipulihkan dari repo (indikasi rollback disk)")
    return 0


if __name__ == "__main__":
    sys.exit(utama())
