#!/usr/bin/env python3
# ============================================================
# INJEKSI ORGAN V238 SAKTI-PD ke Micaprofita_V231_SAKTI.html
# Pola inject_v237: idempotent, backup, verifikasi marker.
# ============================================================
import re, shutil, sys
from pathlib import Path

BASE = Path('/home/z/my-project')
SAKTI = BASE / 'download' / 'Micaprofita_V231_SAKTI.html'
ORGAN = BASE / 'scripts' / 'v238_pd.js'
BACKUP = BASE / 'download' / 'Micaprofita_V231_SAKTI.backup-pre-v238.html'

html = SAKTI.read_text(encoding='utf-8')
organ = ORGAN.read_text(encoding='utf-8')

if 'V238-PD:BEGIN' in html:
    # ganti blok lama dengan versi terbaru (upgrade in-place)
    html = re.sub(r'/\*V238-PD:BEGIN\*/.*?/\*V238-PD:END\*/', '___V238_SLOT___', html, flags=re.S)
    html = html.replace('___V238_SLOT___', organ)
    aksi = 'UPGRADE in-place'
else:
    if not BACKUP.exists():
        shutil.copy2(SAKTI, BACKUP)
    titik = '/*V237-FBO:END*/'
    if titik not in html:
        sys.exit('FATAL: marker V237-FBO:END tidak ditemukan')
    html = html.replace(titik, titik + '\n' + organ + '\n', 1)
    aksi = 'INJEKSI baru'

SAKTI.write_text(html, encoding='utf-8')

# verifikasi
cek = SAKTI.read_text(encoding='utf-8')
ok = all(m in cek for m in ['V238-PD:BEGIN', 'V238-PD:END', "window.V231_SAKTI.PD", 'v238-pd', '1600/1600'])
v237_utuh = 'V237-FBO:BEGIN' in cek and 'V237-FBO:END' in cek
print(f'aksi      : {aksi}')
print(f'ukuran    : {len(cek):,} byte')
print(f'marker v238: {"OK" if ok else "GAGAL"}')
print(f'v237 utuh : {"OK" if v237_utuh else "RUSAK"}')
sys.exit(0 if (ok and v237_utuh) else 1)
