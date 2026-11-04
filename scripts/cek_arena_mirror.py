#!/usr/bin/env python3
"""Audit sintaks arena.html: ekstrak <script> terakhir, node --check, dan cek pasangan tag dasar."""
import re
import subprocess
import sys
import tempfile

lokasi = "/home/z/my-project/download/arena.html"
html = open(lokasi, encoding="utf-8").read()

# 1) cek struktur dasar
for tag in ["html", "head", "body", "script"]:
    buka = len(re.findall(rf"<{tag}[ >]", html))
    tutup = len(re.findall(rf"</{tag}>", html))
    if buka != tutup:
        print(f"TIDAK SEIMBANG <{tag}>: buka={buka} tutup={tutup}")
        sys.exit(1)
print("struktur tag OK")

# 2) ekstrak SEMUA blok <script> tanpa src
blok = re.findall(r"<script>(.*?)</script>", html, re.S)
print(f"blok script: {len(blok)}")
ok = True
for i, b in enumerate(blok):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(b)
        jalur = f.name
    r = subprocess.run(["node", "--check", jalur], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"BLOK {i} GAGAL:\n{r.stderr[:800]}")
        ok = False
    else:
        print(f"blok {i}: sintaks OK ({len(b)} B)")
if not ok:
    sys.exit(1)

# 3) id yang dirujuk JS harus ada di HTML
ids_rujuk = set(re.findall(r"\$\('#([A-Za-z0-9_-]+)'\)", html))
ids_ada = set(re.findall(r'id="([A-Za-z0-9_-]+)"', html))
hilang = ids_rujuk - ids_ada
if hilang:
    print("ID HILANG:", sorted(hilang))
    sys.exit(1)
print(f"semua {len(ids_rujuk)} id rujukan ada")

print("ARENA.HTML LOLOS AUDIT")
