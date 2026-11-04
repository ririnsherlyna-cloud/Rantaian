#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verifikasi identitas PAT, keberadaan repo denyut (akiomida/Io), dan daftar repo pemilik."""
import json
import urllib.request

TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()


def get(url, auth=True):
    h = {"User-Agent": "microprofita-diag", "Accept": "application/vnd.github+json"}
    if auth:
        h["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        return {"_http": e.code, "message": e.reason}
    except Exception as e:
        return {"_err": repr(e)}


print("=== PEMILIK PAT ===")
u = get("https://api.github.com/user")
print("login:", u.get("login"), "| nama:", u.get("name")) if u.get("login") else print("GAGAL:", u)

print("\n=== REPO akiomida/Io TANPA AUTH ===")
r = get("https://api.github.com/repos/akiomida/Io", auth=False)
print("hasil:", {k: r.get(k) for k in ("full_name", "private", "pushed_at", "message", "_http")})

print("\n=== AKUN akiomida ===")
a = get("https://api.github.com/users/akiomida", auth=False)
print("login:", a.get("login"), "| pub repo:", a.get("public_repos")) if a.get("login") else print("TIDAK DITEMUKAN:", a)

print("\n=== DAFTAR REPO pemilik PAT ===")
rs = get("https://api.github.com/user/repos?per_page=30&sort=pushed")
if isinstance(rs, list):
    for x in rs:
        print(f"- {x['full_name']} | private={x['private']} | pushed={x['pushed_at']}")
else:
    print("GAGAL:", rs)

print("\n=== CARI NAMA MIRIP 'Io' DI AKUN PEMILIK PAT ===")
if isinstance(rs, list):
    mirip = [x["full_name"] for x in rs if "io" in x["name"].lower() or "denyut" in x["name"].lower()]
    print("kandidat:", mirip or "(tidak ada)")
