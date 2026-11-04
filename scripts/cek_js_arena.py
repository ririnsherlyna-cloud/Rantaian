#!/usr/bin/env python3
"""Ekstrak semua blok <script> inline dari file HTML dan validasi dengan node --check."""
import re
import subprocess
import sys
import tempfile
import os

path = sys.argv[1]
html = open(path, encoding='utf-8').read()

blok = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', html)
print(f'{len(blok)} blok script inline ditemukan')
gagal = 0
for i, kode in enumerate(blok):
    if not kode.strip():
        continue
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(kode)
        tmp = f.name
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        gagal += 1
        print(f'--- BLOK {i}: GAGAL ---')
        print(r.stderr[:2000])
    else:
        n = kode.count('\n')
        print(f'blok {i}: OK ({n} baris)')
    os.unlink(tmp)

print('SEMUA LULUS' if gagal == 0 else f'{gagal} blok gagal')
sys.exit(1 if gagal else 0)
