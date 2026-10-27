#!/usr/bin/env python3
# ============================================================
# INJEKSI GANDA ke Micaprofita_V231_SAKTI.html:
#   1. UPGRADE organ V242 SAKTI-ORKESTRA v1.0 -> v1.1
#      (chip V243-SARANG masuk daftar zona kanan + mode fokus;
#       mesin konduktor TIDAK disentuh)
#   2. INJEKSI baru organ V243 SAKTI-SARANG v1.0
#      (hidup mandiri di GitHub Pages: HIJRAH / SIMPAN-MEMORI /
#       PULIH / EVOLUSI / pemeriksa versi)
# Pola inject_v242: idempoten, backup, verifikasi marker,
# semua organ sebelumnya WAJIB tetap utuh.
# ============================================================
import re, shutil, sys
from pathlib import Path

BASE = Path('/home/z/my-project')
SAKTI = BASE / 'download' / 'Micaprofita_V231_SAKTI.html'
ORG242 = BASE / 'scripts' / 'v242_fisika.js'
ORG243 = BASE / 'scripts' / 'v243_sarang.js'
BACKUP = BASE / 'download' / 'Micaprofita_V231_SAKTI.backup-pre-v243.html'

html = SAKTI.read_text(encoding='utf-8')
ukuran_awal = len(html.encode('utf-8'))
organ242 = ORG242.read_text(encoding='utf-8')
organ243 = ORG243.read_text(encoding='utf-8')

# --- 1. upgrade v242 in-place ---
if 'V242-FISIKA:BEGIN' in html:
    html = re.sub(r'/\*V242-FISIKA:BEGIN\*/.*?/\*V242-FISIKA:END\*/', '___V242_SLOT___', html, flags=re.S)
    html = html.replace('___V242_SLOT___', organ242)
    aksi242 = 'UPGRADE in-place (v1.1 — daftar zona kanan + mode fokus mengenali chip SARANG)'
else:
    sys.exit('FATAL: slot V242 tidak ditemukan — tidak boleh injeksi v243 tanpa v242')

# --- 2. injeksi v243 ---
if 'V243-SARANG:BEGIN' in html:
    html = re.sub(r'/\*V243-SARANG:BEGIN\*/.*?/\*V243-SARANG:END\*/', '___V243_SLOT___', html, flags=re.S)
    html = html.replace('___V243_SLOT___', organ243)
    aksi243 = 'UPGRADE in-place'
else:
    if not BACKUP.exists():
        shutil.copy2(SAKTI, BACKUP)
    titik = '/*V242-FISIKA:END*/'
    if titik not in html:
        sys.exit('FATAL: marker V242-FISIKA:END tidak ditemukan')
    html = html.replace(titik, titik + '\n' + organ243 + '\n', 1)
    aksi243 = 'INJEKSI baru'

SAKTI.write_text(html, encoding='utf-8')

cek = SAKTI.read_text(encoding='utf-8')
ukuran_baru = len(cek.encode('utf-8'))
ok243 = 'V243-SARANG:BEGIN' in cek and 'V243-SARANG:END' in cek and "nama: 'SAKTI-SARANG'" in cek
ok242 = 'V242-FISIKA:BEGIN' in cek and 'V242-FISIKA:END' in cek and "versi: '1.1', nama: 'SAKTI-ORKESTRA'" in cek
v241_utuh = 'V241-NADI:BEGIN' in cek and 'V241-NADI:END' in cek
v240_utuh = 'V240-ARAH:BEGIN' in cek and 'V240-ARAH:END' in cek
v239_utuh = 'V239-KL:BEGIN' in cek and 'V239-KL:END' in cek
v238_utuh = 'V238-PD:BEGIN' in cek and 'V238-PD:END' in cek
v237_utuh = 'V237-FBO:BEGIN' in cek and 'V237-FBO:END' in cek
doctype_ok = cek.lstrip().lower().startswith('<!doctype html>')
tutup_ok = cek.rstrip().endswith('</html>')
urutan_ok = cek.find('V242-FISIKA:END') < cek.find('V243-SARANG:BEGIN')
v243_satu = cek.count('V243-SARANG:BEGIN') == 1
v242_satu = cek.count('V242-FISIKA:BEGIN') == 1
print(f'aksi v242   : {aksi242}')
print(f'aksi v243   : {aksi243}')
print(f'ukuran      : {ukuran_awal:,} -> {ukuran_baru:,} byte (delta {ukuran_baru-ukuran_awal:+,}; organ242 {len(organ242.encode()):,} + organ243 {len(organ243.encode()):,})')
print(f'v242 v1.1   : {"OK" if ok242 else "GAGAL"} (slot tunggal: {"OK" if v242_satu else "GANDA!"})')
print(f'v243 sarang : {"OK" if ok243 else "GAGAL"} (slot tunggal: {"OK" if v243_satu else "GANDA!"})')
print(f'urutan 242<243: {"OK" if urutan_ok else "RUSAK"}')
print(f'v241 utuh   : {"OK" if v241_utuh else "RUSAK"}')
print(f'v240 utuh   : {"OK" if v240_utuh else "RUSAK"}')
print(f'v239 utuh   : {"OK" if v239_utuh else "RUSAK"}')
print(f'v238 utuh   : {"OK" if v238_utuh else "RUSAK"}')
print(f'v237 utuh   : {"OK" if v237_utuh else "RUSAK"}')
print(f'doctype     : {"OK" if doctype_ok else "RUSAK"} · </html>: {"OK" if tutup_ok else "RUSAK"}')
sys.exit(0 if all([ok243, ok242, v241_utuh, v240_utuh, v239_utuh, v238_utuh, v237_utuh, doctype_ok, tutup_ok, urutan_ok, v243_satu, v242_satu]) else 1)
