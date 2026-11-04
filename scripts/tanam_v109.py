#!/usr/bin/env python3
# TANAM-V109 — simpan balas_telegram.py v10.9 (409-TERBUKA + PELURU-BUTA)
# ke cangkang GitHub Rantaian (wasiat #6: GitHub = cangkang cloningan).
import base64, hashlib, json, sys, urllib.request

REPO = 'ririnsherlyna-cloud/Rantaian'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = open('/home/z/my-project/.token-rantaian').read().strip()

LOKAL = '/home/z/my-project/scripts/balas_telegram.py'
REPO_PATH = 'scripts/balas_telegram.py'
PESAN = ('v10.9 PELURU-BUTA + 409-TERBUKA — (1) sys.stdout line-buffered: log bot_chat '
         'tidak pernah buta-buffer lagi (akar vonis salah "daemon bisu"); (2) 409 getUpdates '
         'kini membuka badan error, bukan senyap. Konteks: webhook penumpang '
         'tele.goldenherd.com membisukan bot 27 Okt-2 Nov (pesan pemilik dilahap), '
         'dicabut 23:10 WIB 2 Nov; sandbox mati 12,9 jam lalu dibangunkan.')

def api(jalan, metode='GET', isi=None):
    req = urllib.request.Request(API + jalan, method=metode)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    data = json.dumps(isi).encode() if isi is not None else None
    if data:
        req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, data) as r:
        return json.loads(r.read() or b'{}')

buf = open(LOKAL, 'rb').read()
sha = None
try:
    d = api(f'/contents/{REPO_PATH}?ref=main')
    if d.get('sha'):
        if base64.b64decode(d.get('content', '')) == buf:
            print('SAMA — sudah tertanam, lewati'); sys.exit(0)
        sha = d['sha']
except Exception:
    pass
r = api(f'/contents/{REPO_PATH}', 'PUT',
        {'message': PESAN, 'content': base64.b64encode(buf).decode(), 'sha': sha, 'branch': 'main'})
print('TERDORONG commit:', r.get('commit', {}).get('sha', '')[:7])

h = hashlib.sha256(urllib.request.urlopen(
    f'https://raw.githubusercontent.com/{REPO}/main/{REPO_PATH}', timeout=20).read()).hexdigest()
lokal = hashlib.sha256(buf).hexdigest()
print('live', h[:12], '| lokal', lokal[:12], '->', 'SAH byte-per-byte' if h == lokal else 'TIDAK COCOK!')
sys.exit(0 if h == lokal else 2)
