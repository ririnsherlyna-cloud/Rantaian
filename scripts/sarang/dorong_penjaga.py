#!/usr/bin/env python3
# ============================================================
# DORONG V244 SARANG-PENJAGA ke repo pemilik via Git Data API
# (2 file: scripts/penjaga.mjs + .github/workflows/sakti-denyut.yml)
# Token hanya dari env GH_TOKEN — tidak pernah ditulis ke disk.
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
    ('/home/z/my-project/scripts/penjaga.mjs', 'scripts/penjaga.mjs'),
    ('/home/z/my-project/scripts/sarang/sakti-denyut.yml', '.github/workflows/sakti-denyut.yml'),
]

def req(path, method='GET', body=None):
    r = urllib.request.Request(API + path, method=method,
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'sarang-penjaga-installer'},
        data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        print('GAGAL', method, path, e.code, e.read().decode()[:300]); sys.exit(1)

# 1. posisi head main
ref = req('/git/ref/heads/main')
head = ref['object']['sha']
print('head main :', head[:12])
komit = req(f'/git/commits/{head}')
pohon_lama = komit['tree']['sha']

# 2. unggah blob
blobs = []
for lokal, repo_path in FILE:
    teks = open(lokal, encoding='utf-8').read()
    b = req('/git/blobs', 'POST', {'content': teks, 'encoding': 'utf-8'})
    blobs.append({'path': repo_path, 'mode': '100644', 'type': 'blob', 'sha': b['sha']})
    print(f'blob OK   : {repo_path}  ({len(teks):,} byte, sha {b["sha"][:10]})')

# 3. pohon baru di atas pohon lama
pohon = req('/git/trees', 'POST', {'base_tree': pohon_lama, 'tree': blobs})
print('tree baru :', pohon['sha'][:12])

# 4. komit + gerakkan ref
c = req('/git/commits', 'POST', {
    'message': 'V244 SARANG-PENJAGA: otak server hidup di Actions — denyut 30 menit tanpa browser [skip ci]',
    'tree': pohon['sha'], 'parents': [head]})
req('/git/refs/heads/main', 'PATCH', {'sha': c['sha'], 'force': False})
print('komit baru:', c['sha'][:12], '— main digerakkan')
print('SELESAI: workflow akan menyala otomatis karena event push.')
