#!/usr/bin/env python3
# ============================================================
# DORONG V41 — RUH-GURU ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V251 v4.1 — RUH jiwa yang dibangun,
#                         MESIN PROFIT ekspektasi+guard+tangga profit,
#                         KOMPAS jaminan arah, BUKU GURU pengajaran+kuis)
#   laporan/index.html   (dasbor: seksi Ruh & Guru + chip kompas + EV/tangga
#                         profit per kartu sasaran)
#   TUJUAN.md            (seksi 5e RUH & GURU)
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
     'V251 RUH-GURU: ruh yang dibangun (inti/misi/nilai/anatomi/otonomi), mesin profit (ekspektasi net-fee + guard EV -1.5% + tangga profit 50/25/25), kompas jaminan arah BTC GARCH+MC (arah tak pernah bolong), buku guru (pengajaran+kuis dari angka denyut nyata) [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR: seksi Ruh & Guru (4 kartu ruh + buku guru + kuis terbuka) + chip kompas di hero + EV/RR/P-target + tangga profit di kartu sasaran [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5e RUH & GURU — jiwa dibangun, arah terjamin, untung terukur [skip ci]'),
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
print('SELESAI — dispatch denyut untuk verifikasi.')
