"""Unggah WADAH KEDUA ke repo Rantaian via GitHub Contents API.
File: .github/workflows/benteng-balas-2.yml + benteng/cek_primer.py
Token dari /home/z/my-project/.token-rantaian (tidak pernah dicetak).
"""
import base64
import json
import subprocess

TOK = open('/home/z/my-project/.token-rantaian').read().strip()
REPO = 'ririnsherlyna-cloud/Rantaian'

FILES = [
    ('/home/z/my-project/scripts/benteng-balas-2.yml',
     '.github/workflows/benteng-balas-2.yml',
     'TANAM WADAH KEDUA: benteng-balas-2 (standby + gantian otomatis bila primer mati) [skip ci]'),
    ('/home/z/my-project/scripts/cek_primer.py',
     'benteng/cek_primer.py',
     'Tambah cek_primer.py: penguji denyut rantai primer untuk wadah kedua [skip ci]'),
]

for lokal, remote, pesan in FILES:
    isi = base64.b64encode(open(lokal, 'rb').read()).decode()
    # cek SHA bila file sudah ada (untuk update)
    sha = None
    out = subprocess.run(['curl', '-s', '-H', f'Authorization: Bearer {TOK}',
                          f'https://api.github.com/repos/{REPO}/contents/{remote}'],
                         capture_output=True, text=True).stdout
    try:
        sha = json.loads(out).get('sha')
    except Exception:
        pass
    body = {'message': pesan, 'content': isi, 'branch': 'main'}
    if sha:
        body['sha'] = sha
    kode = subprocess.run(['curl', '-s', '-o', '/tmp/put.out', '-w', '%{http_code}',
                           '-X', 'PUT',
                           '-H', f'Authorization: Bearer {TOK}',
                           '-H', 'Accept: application/vnd.github+json',
                           f'https://api.github.com/repos/{REPO}/contents/{remote}',
                           '-d', json.dumps(body)],
                          capture_output=True, text=True).stdout
    print(remote, '->', 'HTTP', kode)
    if kode not in ('200', '201'):
        print(open('/tmp/put.out').read()[:300])
