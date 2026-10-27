#!/usr/bin/env python3
# ============================================================
# INJEKSI GANDA ke Micaprofita_V231_SAKTI.html:
#   1. UPGRADE organ V241 SAKTI-NADI  v1.0 -> v1.1 (UI fisika kartu)
#   2. INJEKSI baru organ V242 SAKTI-ORKESTRA v1.0 (konduktor tata letak)
# Pola inject_v241: idempoten, backup, verifikasi marker,
# semua organ sebelumnya WAJIB tetap utuh.
# ============================================================
import re, shutil, sys
from pathlib import Path

BASE = Path('/home/z/my-project')
SAKTI = BASE / 'download' / 'Micaprofita_V231_SAKTI.html'
ORG241 = BASE / 'scripts' / 'v241_nadi.js'
ORG242 = BASE / 'scripts' / 'v242_fisika.js'
BACKUP = BASE / 'download' / 'Micaprofita_V231_SAKTI.backup-pre-v242.html'

html = SAKTI.read_text(encoding='utf-8')
ukuran_awal = len(html.encode('utf-8'))
organ241 = ORG241.read_text(encoding='utf-8')
organ242 = ORG242.read_text(encoding='utf-8')

# --- 1. upgrade v241 in-place ---
if 'V241-NADI:BEGIN' in html:
    html = re.sub(r'/\*V241-NADI:BEGIN\*/.*?/\*V241-NADI:END\*/', '___V241_SLOT___', html, flags=re.S)
    html = html.replace('___V241_SLOT___', organ241)
    aksi241 = 'UPGRADE in-place (v1.1)'
else:
    sys.exit('FATAL: slot V241 tidak ditemukan — tidak boleh injeksi v242 tanpa v241')

# --- 2. injeksi v242 ---
if 'V242-FISIKA:BEGIN' in html:
    html = re.sub(r'/\*V242-FISIKA:BEGIN\*/.*?/\*V242-FISIKA:END\*/', '___V242_SLOT___', html, flags=re.S)
    html = html.replace('___V242_SLOT___', organ242)
    aksi242 = 'UPGRADE in-place'
else:
    if not BACKUP.exists():
        shutil.copy2(SAKTI, BACKUP)
    titik = '/*V241-NADI:END*/'
    if titik not in html:
        sys.exit('FATAL: marker V241-NADI:END tidak ditemukan')
    html = html.replace(titik, titik + '\n' + organ242 + '\n', 1)
    aksi242 = 'INJEKSI baru'

SAKTI.write_text(html, encoding='utf-8')

cek = SAKTI.read_text(encoding='utf-8')
ukuran_baru = len(cek.encode('utf-8'))
ok241 = 'V241-NADI:BEGIN' in cek and 'V241-NADI:END' in cek and "versi: '1.1', nama: 'SAKTI-NADI'" in cek
ok242 = 'V242-FISIKA:BEGIN' in cek and 'V242-FISIKA:END' in cek and 'SAKTI-ORKESTRA' in cek
v240_utuh = 'V240-ARAH:BEGIN' in cek and 'V240-ARAH:END' in cek
v239_utuh = 'V239-KL:BEGIN' in cek and 'V239-KL:END' in cek
v238_utuh = 'V238-PD:BEGIN' in cek and 'V238-PD:END' in cek
v237_utuh = 'V237-FBO:BEGIN' in cek and 'V237-FBO:END' in cek
doctype_ok = cek.lstrip().lower().startswith('<!doctype html>')
tutup_ok = cek.rstrip().endswith('</html>')
urutan_ok = cek.find('V241-NADI:END') < cek.find('V242-FISIKA:BEGIN')
v242_satu = cek.count('V242-FISIKA:BEGIN') == 1
v241_satu = cek.count('V241-NADI:BEGIN') == 1
print(f'aksi v241   : {aksi241}')
print(f'aksi v242   : {aksi242}')
print(f'ukuran      : {ukuran_awal:,} -> {ukuran_baru:,} byte (delta {ukuran_baru-ukuran_awal:+,}; organ241 {len(organ241.encode()):,} + organ242 {len(organ242.encode()):,})')
print(f'v241 v1.1   : {"OK" if ok241 else "GAGAL"} (slot tunggal: {"OK" if v241_satu else "GANDA!"})')
print(f'v242 fisika : {"OK" if ok242 else "GAGAL"} (slot tunggal: {"OK" if v242_satu else "GANDA!"})')
print(f'urutan 241<242: {"OK" if urutan_ok else "RUSAK"}')
print(f'v240 utuh   : {"OK" if v240_utuh else "RUSAK"}')
print(f'v239 utuh   : {"OK" if v239_utuh else "RUSAK"}')
print(f'v238 utuh   : {"OK" if v238_utuh else "RUSAK"}')
print(f'v237 utuh   : {"OK" if v237_utuh else "RUSAK"}')
print(f'doctype     : {"OK" if doctype_ok else "RUSAK"} · </html>: {"OK" if tutup_ok else "RUSAK"}')
sys.exit(0 if all([ok241, ok242, v240_utuh, v239_utuh, v238_utuh, v237_utuh, doctype_ok, tutup_ok, urutan_ok, v242_satu, v241_satu]) else 1)
