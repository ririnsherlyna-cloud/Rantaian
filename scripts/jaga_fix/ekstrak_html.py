#!/usr/bin/env python3
import re, subprocess, sys, tempfile, os
src = open(sys.argv[1], encoding='utf-8').read()
bloks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', src, re.S | re.I)
ok = True
for i, b in enumerate(bloks):
    if not b.strip(): continue
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf-8') as f:
        f.write(b); tmp = f.name
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    print(f"BLOK #{i}: {'OK' if r.returncode==0 else 'GAGAL\n'+r.stderr[:1200]} ({len(b)} chars)")
    if r.returncode != 0: ok = False
    os.unlink(tmp)
print('SEMUA SAH' if ok else 'ADA CACAT')
sys.exit(0 if ok else 1)
