#!/usr/bin/env python3
"""Ekstrak blok <script> dari arena.html dan validasi sintaks dengan node."""
import re, subprocess, pathlib
html = pathlib.Path('/home/z/my-project/download/arena.html').read_text(encoding='utf-8')
bloks = re.findall(r'<script>(.*?)</script>', html, re.S)
print(f"{len(bloks)} blok script ditemukan")
ok = True
for i, b in enumerate(bloks):
    p = pathlib.Path(f'/tmp/arena_block_{i}.js')
    p.write_text(b, encoding='utf-8')
    r = subprocess.run(['node', '--check', str(p)], capture_output=True, text=True)
    if r.returncode == 0:
        print(f"blok {i}: OK ({b.count(chr(10))} baris)")
    else:
        ok = False
        print(f"blok {i}: GALAT\n{r.stderr[:1500]}")
print("SEMUA VALID" if ok else "ADA GALAT")
