#!/usr/bin/env python3
# ============================================================
# DORONG RINGAN — komit kecil utk memicu ulang event push
# (mengubah satu file dgn isi baru). Token dari env GH_TOKEN.
# ============================================================
import json
import os
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ['GH_TOKEN']

def req(path, method='GET', body=None, cek=True):
    r = urllib.request.Request(API + path, method=method,
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'sarang-penjaga-installer'},
        data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        print('GAGAL', method, path, e.code, e.read().decode()[:200]); sys.exit(1)

# ambil file workflow saat ini, tambah baris komentar pemantik
f = req('/contents/.github/workflows/sakti-denyut.yml?ref=main')
teks = base64 = None
import base64 as b64
teks = b64.b64decode(f['content']).decode()
if 'PEMICU-DENYUT' not in teks:
    teks += '# PEMICU-DENYUT: komit ringan utk memastikan workflow menyala\n'
    isi_b64 = b64.b64encode(teks.encode()).decode()
    req('/contents/.github/workflows/sakti-denyut.yml', 'PUT', {
        'message': 'SARANG-PENJAGA: pemantik denyut pertama', 'content': isi_b64, 'sha': f['sha']})
    print('push ringan terkirim — menunggu workflow menyala')
else:
    print('penanda sudah ada — lewati')
