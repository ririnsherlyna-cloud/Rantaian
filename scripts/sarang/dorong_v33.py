#!/usr/bin/env python3
# ============================================================
# DORONG Task 33 — satu komit 3 file:
#   index.html        (SAKTI v245 organ v1.1 — misi + TUJUAN.md)
#   TUJUAN.md         (manifesto terbuka di akar repo)
#   laporan/index.html(dasbor ber-misi + taut TUJUAN)
# Idempoten via blob-sha. Token hanya dari env GH_TOKEN.
# ============================================================
import hashlib
import json
import os
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ['GH_TOKEN']
PESAN = 'TUJUAN: manifesto terbuka di akar repo — misi guru trader profesional + nol biaya + protokol kebenaran; panel & dasbor ber-misi (V245 v1.1) [skip ci]'

FILE = [
    ('/home/z/my-project/download/Micaprofita_V231_SAKTI.html', 'index.html'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html'),
]

def req(path, method='GET', body=None, tenggat=180):
    r = urllib.request.Request(API + path, method=method,
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'sarang-penjaga-installer'},
        data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r, timeout=tenggat) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        print('GAGAL', method, path, e.code, e.read().decode()[:300]); sys.exit(1)

def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

ref = req('/git/ref/heads/main')
head = ref['object']['sha']
komit = req(f'/git/commits/{head}')
pohon_lama = komit['tree']['sha']
print('head main :', head[:12])

pohon_info = req(f'/git/trees/{pohon_lama}')
sha_peta = {e['path']: e['sha'] for e in pohon_info.get('tree', [])}

entri = []
ubah = []
for lokal, jalur in FILE:
    data = open(lokal, 'rb').read()
    sha = blob_sha(data)
    if sha_peta.get(jalur) == sha:
        print(f'skip      : {jalur} (identik)')
        continue
    b = req('/git/blobs', 'POST', {'content': data.decode('utf-8'), 'encoding': 'utf-8'}, tenggat=300)
    assert b['sha'] == sha, f'blob sha tidak cocok: {jalur}'
    entri.append({'path': jalur, 'mode': '100644', 'type': 'blob', 'sha': sha})
    ubah.append(f'{jalur} ({len(data):,} B)')
    print(f'blob OK   : {jalur}  {len(data):,} B  {sha[:10]}')

if not entri:
    print('SEMUA IDENTIK — tanpa komit.')
    sys.exit(0)

pohon = req('/git/trees', 'POST', {'base_tree': pohon_lama, 'tree': entri})
c = req('/git/commits', 'POST', {'message': PESAN, 'tree': pohon['sha'], 'parents': [head]})
req('/git/refs/heads/main', 'PATCH', {'sha': c['sha'], 'force': False})
print('komit baru:', c['sha'][:12], '—', ' + '.join(ubah))
print('SELESAI — Pages membangun ulang 1-3 menit.')
