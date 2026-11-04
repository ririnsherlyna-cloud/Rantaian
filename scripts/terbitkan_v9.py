#!/usr/bin/env python3
# terbitkan_v9.py — terbitkan yml v9 + engine v9 ke repo Rantaian via Contents API
import base64, json, subprocess

BASE = '/home/z/my-project'
TOK = open(f'{BASE}/.token-rantaian').read().strip()
REPO = 'ririnsherlyna-cloud/Rantaian'
MSG = ("v9 rantai tenang: primer tanpa cancel-silang + baton always() + ledger abadi; "
       "cadangan berhenti firehose 19s; detak swarantai; umuman hanya saat rantai gelap [skip ci]")

BERKAS = [
    (f'{BASE}/scripts/yml_v9/benteng-balas.yml',    '.github/workflows/benteng-balas.yml'),
    (f'{BASE}/scripts/yml_v9/benteng-balas-2.yml',  '.github/workflows/benteng-balas-2.yml'),
    (f'{BASE}/scripts/yml_v9/benteng-telegram.yml', '.github/workflows/benteng-telegram.yml'),
    (f'{BASE}/scripts/balas_telegram.py',           'scripts/balas_telegram.py'),
    (f'{BASE}/scripts/balas_telegram.py',           'benteng/balas_telegram.py'),
]

def curl(args):
    return subprocess.run(['curl', '-s'] + args, capture_output=True, text=True, timeout=90).stdout

for lokal, repo_path in BERKAS:
    isi = open(lokal, 'rb').read()
    meta = json.loads(curl(['-H', f'Authorization: Bearer {TOK}',
                            f'https://api.github.com/repos/{REPO}/contents/{repo_path}']))
    body = {'message': MSG, 'content': base64.b64encode(isi).decode(), 'branch': 'main'}
    if meta.get('sha'):
        body['sha'] = meta['sha']
    out = curl(['-X', 'PUT', '-H', f'Authorization: Bearer {TOK}',
                '-H', 'Accept: application/vnd.github+json',
                '-d', json.dumps(body),
                f'https://api.github.com/repos/{REPO}/contents/{repo_path}'])
    try:
        r = json.loads(out)
        csha = (r.get('commit') or {}).get('sha')
        print(repo_path, '->', f"OK commit {csha[:10]}" if csha else f"GAGAL: {str(r)[:200]}")
    except Exception:
        print(repo_path, '-> RESPON ANEH:', out[:200])
