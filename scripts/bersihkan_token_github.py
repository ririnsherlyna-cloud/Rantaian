#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PEMBERSIH TOKEN GITHUB — Perintah user: jangan simpan lagi token GitHub, hapus.
Menghapus SEMUA token GitHub yang tersimpan di project lokal:
1. scripts/jaga_fix/dorong_v297.py  -> TOKEN hardcoded diganti env var
2. worklog.md                       -> entri "Kode token : ..." diskrub
3. tool-results/*.txt               -> snapshot historis berisi token dihapus
4. akiomida/io-repo/.git/config     -> remote URL tanpa token
5. Scan ulang seluruh project (tanpa node_modules/.git/.next) sebagai verifikasi.
"""
import os, re, glob

BASE = "/home/z/my-project"
TOKEN_RE = re.compile(r"ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}")
HAPUS = "***[TOKEN-DIHAPUS-PERINTAH-USER]***"
log = []

# 1) dorong_v297.py: ganti hardcoded TOKEN dengan env var (pola yang sama dgn skrip lain)
p1 = os.path.join(BASE, "scripts/jaga_fix/dorong_v297.py")
if os.path.exists(p1):
    src = open(p1, encoding="utf-8", errors="replace").read()
    new, n = TOKEN_RE.subn(HAPUS, src)
    if n:
        new = new.replace(f'TOKEN = "{HAPUS}"', "TOKEN = os.environ.get('GH_TOKEN')")
        open(p1, "w", encoding="utf-8").write(new)
        log.append(f"dorong_v297.py: {n} token diganti -> env var GH_TOKEN")

# 2) worklog.md: diskrub (struktur log tetap utuh)
p2 = os.path.join(BASE, "worklog.md")
if os.path.exists(p2):
    src = open(p2, encoding="utf-8", errors="replace").read()
    new, n = TOKEN_RE.subn(HAPUS, src)
    # regex pola ekstraksi dgn prefix token juga diskrub
    new2, n2 = re.subn(r"github_pat_11BZ[A-Za-z0-9_]*\[A-Za-z0-9_\]\+", HAPUS, new)
    new2, n3 = re.subn(r"github_pat_11BZ[A-Za-z0-9_]*", HAPUS, new2)
    if n or n2 or n3:
        open(p2, "w", encoding="utf-8").write(new2)
        log.append(f"worklog.md: {n} token mentah + {n2+n3} pola prefix diskrub")

# 3) tool-results berisi token mentah -> file dihapus (snapshot historis, bukan sumber data)
for f in glob.glob(os.path.join(BASE, "tool-results/*.txt")):
    try:
        if TOKEN_RE.search(open(f, encoding="utf-8", errors="replace").read()):
            os.remove(f)
            log.append(f"tool-results: {os.path.basename(f)} dihapus (berisi token)")
    except Exception:
        pass

# 4) akiomida/io-repo/.git/config: remote URL dibersihkan dari token
p4 = os.path.join(BASE, "akiomida/io-repo/.git/config")
if os.path.exists(p4):
    src = open(p4, encoding="utf-8", errors="replace").read()
    new, n = re.subn(
        r"url\s*=\s*https://x-access-token:[^@]+@github\.com",
        "url = https://github.com", src)
    if n:
        open(p4, "w", encoding="utf-8").write(new)
        log.append("io-repo/.git/config: remote origin dibersihkan dari token")

# 5) verifikasi menyeluruh (tanpa node_modules/.git/.next/tool-results)
EXCL = {"node_modules", ".git", ".next", ".turbo", "tool-results"}
sisa = []
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCL]
    for fn in files:
        fp = os.path.join(root, fn)
        if os.path.getsize(fp) > 5_000_000:
            continue
        try:
            if TOKEN_RE.search(open(fp, encoding="utf-8", errors="replace").read()):
                sisa.append(fp.replace(BASE + "/", ""))
        except Exception:
            pass
log.append(f"verifikasi akhir: {len(sisa)} file tersisa berisi token mentah")
for s in sisa:
    log.append(f"  SISA: {s}")

print("\n".join(log))
