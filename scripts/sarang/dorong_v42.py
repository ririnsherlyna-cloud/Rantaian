#!/usr/bin/env python3
# ============================================================
# DORONG V42 — GERBANG-PERFORMA ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V252 v4.2 — forensik zona per jalur,
#                         gerbang racun no-trade, slot eksplorasi bandit,
#                         kalibrasi keyakinan zona, A/B versi anti-cheat)
#   laporan/index.html   (dasbor: seksi Forensik & Perbaikan — A/B + zona
#                         racun/emas + disiplin + tindakan otomatis)
#   TUJUAN.md            (seksi 5f GERBANG-PERFORMA)
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
     'V252 GERBANG-PERFORMA: forensik kerugian mengikat (zona racun per jalur DITOLAK mesin — no-trade adalah keputusan), slot eksplorasi bandit berbatas, keyakinan dipetakan hit-rate zona medan, baseline vs sekarang A/B anti-cheat, target performa wajib PF>=1.2 [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR: seksi Forensik & Perbaikan — kartu baseline vs sekarang vs target, tabel zona racun/emas, disiplin gerbang + tindakan otomatis otak [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5f GERBANG-PERFORMA — performa di atas aktivitas, penyebab kegagalan diukur [skip ci]'),
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
