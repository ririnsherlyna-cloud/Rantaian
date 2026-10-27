#!/usr/bin/env python3
# ============================================================
# INJEKSI ORGAN V240 SAKTI-ARAH ke Micaprofita_V231_SAKTI.html
# Pola inject_v239: idempotent, backup, verifikasi marker.
# ============================================================
import re, shutil, sys
from pathlib import Path

BASE = Path('/home/z/my-project')
SAKTI = BASE / 'download' / 'Micaprofita_V231_SAKTI.html'
ORGAN = BASE / 'scripts' / 'v240_arah.js'
BACKUP = BASE / 'download' / 'Micaprofita_V231_SAKTI.backup-pre-v240.html'

html = SAKTI.read_text(encoding='utf-8')
organ = ORGAN.read_text(encoding='utf-8')

if 'V240-ARAH:BEGIN' in html:
    html = re.sub(r'/\*V240-ARAH:BEGIN\*/.*?/\*V240-ARAH:END\*/', '___V240_SLOT___', html, flags=re.S)
    html = html.replace('___V240_SLOT___', organ)
    aksi = 'UPGRADE in-place'
else:
    if not BACKUP.exists():
        shutil.copy2(SAKTI, BACKUP)
    titik = '/*V239-KL:END*/'
    if titik not in html:
        sys.exit('FATAL: marker V239-KL:END tidak ditemukan')
    html = html.replace(titik, titik + '\n' + organ + '\n', 1)
    aksi = 'INJEKSI baru'

SAKTI.write_text(html, encoding='utf-8')

cek = SAKTI.read_text(encoding='utf-8')
ok = all(m in cek for m in ['V240-ARAH:BEGIN', 'V240-ARAH:END', 'window.V231_SAKTI.ARAH', 'v240-arah', '10.600/10.600'])
v239_utuh = 'V239-KL:BEGIN' in cek and 'V239-KL:END' in cek
v238_utuh = 'V238-PD:BEGIN' in cek and 'V238-PD:END' in cek
v237_utuh = 'V237-FBO:BEGIN' in cek and 'V237-FBO:END' in cek
print(f'aksi       : {aksi}')
print(f'ukuran     : {len(cek):,} byte')
print(f'marker v240: {"OK" if ok else "GAGAL"}')
print(f'v239 utuh  : {"OK" if v239_utuh else "RUSAK"}')
print(f'v238 utuh  : {"OK" if v238_utuh else "RUSAK"}')
print(f'v237 utuh  : {"OK" if v237_utuh else "RUSAK"}')
sys.exit(0 if (ok and v239_utuh and v238_utuh and v237_utuh) else 1)
