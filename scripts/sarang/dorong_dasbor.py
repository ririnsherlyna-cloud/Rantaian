#!/usr/bin/env python3
# ============================================================
# DORONG DASBOR + PENJAGA v1.1 ke repo pemilik
# - scripts/penjaga.mjs          (pembaruan skema bukti ganda)
# - laporan/index.html           (dasbor laporan — file BARU)
# Token dari env GH_TOKEN.
# ============================================================
import base64
import json
import os
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ['GH_TOKEN']

def req(path, method='GET', body=None, boleh404=False):
    r = urllib.request.Request(API + path, method=method,
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'sarang-penjaga-installer'},
        data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        if boleh404 and e.code == 404:
            return None
        print('GAGAL', method, path, e.code, e.read().decode()[:250]); sys.exit(1)

# 1. perbarui penjaga.mjs — lewati bila isi identik (idempoten)
teks = open('/home/z/my-project/scripts/penjaga.mjs', encoding='utf-8').read()
lama = req('/contents/scripts/penjaga.mjs?ref=main')
isi_lama = base64.b64decode(lama['content']).decode()
if isi_lama == teks:
    print('penjaga.mjs sudah identik — lewati')
else:
    req('/contents/scripts/penjaga.mjs', 'PUT', {
        'message': 'SARANG-PENJAGA v1.1: laporan sasaran memuat bukti angka + teks (utk dasbor) [skip ci]',
        'content': base64.b64encode(teks.encode()).decode(), 'sha': lama['sha']})
    print(f'penjaga.mjs diperbarui ({len(teks):,} byte)')

# 2. dasbor laporan/index.html (404 = belum ada = buat baru)
dasbor = open('/home/z/my-project/scripts/sarang/dasbor_laporan.html', encoding='utf-8').read()
isi = {'message': 'DASBOR LAPORAN: halaman sasaran profesional di Pages [skip ci]',
       'content': base64.b64encode(dasbor.encode()).decode()}
lama2 = req('/contents/laporan/index.html?ref=main', boleh404=True)
if lama2:
    isi['sha'] = lama2['sha']
    if base64.b64decode(lama2['content']).decode() == dasbor:
        print('laporan/index.html sudah identik — lewati'); aksi = None
    else:
        aksi = 'diperbarui'
else:
    aksi = 'dibuat'
if aksi:
    req('/contents/laporan/index.html', 'PUT', isi)
    print(f'laporan/index.html {aksi} ({len(dasbor):,} byte)')
print('SELESAI — picu denyut baru agar laporan memakai skema baru.')
