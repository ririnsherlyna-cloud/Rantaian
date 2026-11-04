#!/usr/bin/env python3
# ============================================================
# DORONG V35 — PHOENIX-PERTAJAM ke repo pemilik (3 file):
#   scripts/penjaga.mjs          (otak server V246 v2.1 + gerbang konfirmasi + tangga target + bahan ajar)
#   laporan/index.html           (dasbor: target jual + genome phoenix + radar chip)
#   TUJUAN.md                    (manifesto: seksi RADAR PHOENIX)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# ============================================================
import base64
import json
import os
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ['GH_TOKEN']

FILE = [
    ('/home/z/my-project/scripts/penjaga.mjs', 'scripts/penjaga.mjs',
     'V246 v2.1 PHOENIX-PERTAJAM: gerbang konfirmasi (anti pisau-jatuh) + tangga target magnet-terdekat + rezim tegas + BAHAN AJAR (pelajaran & aturan dari kekalahan) [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR: seksi Bahan Ajar (pelajaran & aturan otak) + ujung atas ambisius [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: gerbang konfirmasi + tangga target + sub-seksi Bahan ajar [skip ci]'),
]

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
        print('GAGAL', method, path, e.code, e.read().decode()[:300]); sys.exit(1)

for lokal, repo_path, pesan in FILE:
    teks = open(lokal, encoding='utf-8').read()
    lama = req(f'/contents/{repo_path}?ref=main', boleh404=True)
    if lama and base64.b64decode(lama['content']).decode() == teks:
        print(f'identik  : {repo_path} — lewati')
        continue
    isi = {'message': pesan, 'content': base64.b64encode(teks.encode()).decode()}
    if lama:
        isi['sha'] = lama['sha']
    req(f'/contents/{repo_path}', 'PUT', isi)
    print(f'didorong : {repo_path}  ({len(teks):,} byte)')
print('SELESAI — event push memicu denyut baru otomatis.')
