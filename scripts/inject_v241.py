#!/usr/bin/env python3
# ============================================================
# INJEKSI ORGAN V241 SAKTI-NADI ke Micaprofita_V231_SAKTI.html
# Pola inject_v240: idempotent, backup, verifikasi marker,
# semua organ sebelumnya WAJIB tetap utuh.
# ============================================================
import re, shutil, sys
from pathlib import Path

BASE = Path('/home/z/my-project')
SAKTI = BASE / 'download' / 'Micaprofita_V231_SAKTI.html'
ORGAN = BASE / 'scripts' / 'v241_nadi.js'
BACKUP = BASE / 'download' / 'Micaprofita_V231_SAKTI.backup-pre-v241.html'

html = SAKTI.read_text(encoding='utf-8')
organ = ORGAN.read_text(encoding='utf-8')

if 'V241-NADI:BEGIN' in html:
    html = re.sub(r'/\*V241-NADI:BEGIN\*/.*?/\*V241-NADI:END\*/', '___V241_SLOT___', html, flags=re.S)
    html = html.replace('___V241_SLOT___', organ)
    aksi = 'UPGRADE in-place'
else:
    if not BACKUP.exists():
        shutil.copy2(SAKTI, BACKUP)
    titik = '/*V240-ARAH:END*/'
    if titik not in html:
        sys.exit('FATAL: marker V240-ARAH:END tidak ditemukan')
    html = html.replace(titik, titik + '\n' + organ + '\n', 1)
    aksi = 'INJEKSI baru'

SAKTI.write_text(html, encoding='utf-8')

cek = SAKTI.read_text(encoding='utf-8')
ok = all(m in cek for m in ['V241-NADI:BEGIN', 'V241-NADI:END', 'window.V231_SAKTI.NADI', 'GUDANG-MICAPROFITA', 'KAPSUL-MICAPROFITA', 'PRA-REGISTRASI'])
v240_utuh = 'V240-ARAH:BEGIN' in cek and 'V240-ARAH:END' in cek
v239_utuh = 'V239-KL:BEGIN' in cek and 'V239-KL:END' in cek
v238_utuh = 'V238-PD:BEGIN' in cek and 'V238-PD:END' in cek
v237_utuh = 'V237-FBO:BEGIN' in cek and 'V237-FBO:END' in cek
doctype_ok = cek.lstrip().lower().startswith('<!doctype html>')
tutup_ok = cek.rstrip().endswith('</html>')
print(f'aksi       : {aksi}')
print(f'ukuran     : {len(cek):,} byte')
print(f'marker v241: {"OK" if ok else "GAGAL"}')
print(f'v240 utuh  : {"OK" if v240_utuh else "RUSAK"}')
print(f'v239 utuh  : {"OK" if v239_utuh else "RUSAK"}')
print(f'v238 utuh  : {"OK" if v238_utuh else "RUSAK"}')
print(f'v237 utuh  : {"OK" if v237_utuh else "RUSAK"}')
print(f'doctype    : {"OK" if doctype_ok else "RUSAK"} · </html>: {"OK" if tutup_ok else "RUSAK"}')
sys.exit(0 if (ok and v240_utuh and v239_utuh and v238_utuh and v237_utuh and doctype_ok and tutup_ok) else 1)
