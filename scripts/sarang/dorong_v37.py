#!/usr/bin/env python3
# ============================================================
# DORONG V37 — PIAGAM-CYBORG ke repo pemilik (4 file):
#   scripts/penjaga.mjs                (otak server V248 v3.1 — 5 pilar + sadardiri + epoch + mandat Issue)
#   laporan/index.html                 (dasbor: seksi Piagam + Sadar-Diri + mandat Issue)
#   TUJUAN.md                          (manifesto: seksi 5b PIAGAM CYBORG)
#   .github/workflows/sakti-denyut.yml (env mandat Issue + tag metamorfosis epoch harian)
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
     'V248 PIAGAM-CYBORG: lima pilar dipasang — sadardiri fungsional (hash integritas + peringatan otomatis), metamorfosis epoch harian, mandat pemilik lewat Issue, daftar otak resmi [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR: seksi Piagam Cyborg (5 pilar + daftar otak) + Sadar-Diri Fungsional + antrean mandat Issue + jalur pertumbuhan [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5b PIAGAM CYBORG — lima pilar dipasang nyata + pengakuan roadmap jujur [skip ci]'),
    ('/home/z/my-project/scripts/sarang/sakti-denyut.yml', '.github/workflows/sakti-denyut.yml',
     'WORKFLOW: env mandat Issue (GITHUB_TOKEN bawaan) + langkah tag metamorfosis epoch-YYYY-MM-DD [skip ci]'),
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
