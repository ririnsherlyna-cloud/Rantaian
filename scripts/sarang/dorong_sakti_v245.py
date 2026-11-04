#!/usr/bin/env python3
# ============================================================
# DORONG SAKTI v245 (index.html 15,7 MB) ke repo pemilik
# via Git Data API: blob -> tree(base_tree) -> commit -> ref.
# Idempoten: bandingkan git blob-sha (sha1 "blob <len>\0" + isi)
# pohon head — bila sama, tanpa komit. Token hanya dari env.
# ============================================================
import hashlib
import json
import os
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ['GH_TOKEN']
LOKAL = '/home/z/my-project/download/Micaprofita_V231_SAKTI.html'
PESAN = 'V245 SARANG-BAWAAN: SAKTI terima-pasang — sarang otomatis dari URL, sasaran server langsung tampil tanpa token [skip ci]'

isi = open(LOKAL, 'rb').read()
blob_sha = hashlib.sha1(b'blob ' + str(len(isi)).encode() + b'\0' + isi).hexdigest()
print(f'lokal     : {len(isi):,} B  blob-sha {blob_sha[:12]}')

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

# 1. posisi head + pohon
ref = req('/git/ref/heads/main')
head = ref['object']['sha']
print('head main :', head[:12])
komit = req(f'/git/commits/{head}')
pohon_lama = komit['tree']['sha']

# 2. idempoten: cek sha index.html di pohon head
pohon_info = req(f'/git/trees/{pohon_lama}')
sha_remote = None
for ent in pohon_info.get('tree', []):
    if ent['path'] == 'index.html':
        sha_remote = ent['sha']
        break
if sha_remote == blob_sha:
    print('SUDAH IDENTIK di repo — tanpa komit (idempoten).')
    sys.exit(0)
print('remote    :', (sha_remote or 'tidak-ada')[:12], '— berbeda, lanjut komit')

# 3. unggah blob besar (utf-8 langsung)
b = req('/git/blobs', 'POST', {'content': isi.decode('utf-8'), 'encoding': 'utf-8'}, tenggat=300)
assert b['sha'] == blob_sha, f'blob sha tidak cocok: {b["sha"][:12]} vs {blob_sha[:12]}'
print('blob OK   :', b['sha'][:12])

# 4. pohon baru + komit + gerakkan ref
pohon = req('/git/trees', 'POST', {'base_tree': pohon_lama,
    'tree': [{'path': 'index.html', 'mode': '100644', 'type': 'blob', 'sha': blob_sha}]})
print('tree baru :', pohon['sha'][:12])
c = req('/git/commits', 'POST', {'message': PESAN, 'tree': pohon['sha'], 'parents': [head]})
req('/git/refs/heads/main', 'PATCH', {'sha': c['sha'], 'force': False})
print('komit baru:', c['sha'][:12], '— main digerakkan')
print('SELESAI — Pages akan membangun ulang 1-3 menit.')
