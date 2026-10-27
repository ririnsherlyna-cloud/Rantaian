#!/usr/bin/env python3
# DORONG V63 — V273-SASARAN-PENUH: sasaran tak pernah tampil hanya sebagai nama.
# Isi: baris level E -> T (+% P) -> S (-% P) + NET di Barisan Hari arena.html
#      (rencana pra-registrasi dari pulse), jujur utk rival "tanpa rencana keluar",
#      badge "cermin tertunda" saat jantung wadah belum denyut hari ini.
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('arena.html', '/home/z/my-project/download/arena.html')]
PESAN = 'V273-SASARAN-PENUH — mandat pemilik "kenapa sasaran hari ini cuma nama, tanpa entry/sasaran/stop-loss?": (1) baris LEVEL PENUH di Barisan Hari — E -> T (+% · P(target)) -> S (-% · P(stop)) + NET after-fee dari rencana pra-registrasi di pulse; (2) JUJUR untuk rival: "tanpa rencana keluar (rival kuant)" — rival tak pernah menerbitkan level; (3) badge CERMIN TERTUNDA saat jantung wadah belum denyut hari ini — kesadaran usia data sendiri; rencana keluar dipasang sebelum rencana masuk [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v63', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        b = r.read()
        return json.loads(b) if b else {}

ok, gagal = [], []
for jalan, lokal in FILE:
    if not os.path.exists(lokal):
        gagal.append((jalan, 'lokal-tidak-ada')); continue
    isi = open(lokal, 'rb').read()
    b64 = base64.b64encode(isi).decode()
    sha = None
    try:
        d = api(f'contents/{jalan}?ref=main')
        sha = d.get('sha')
        if d.get('content') and base64.b64decode(d['content']) == isi:
            ok.append((jalan, 'SAMA — lewati', len(isi))); continue
    except urllib.error.HTTPError as e:
        if e.code != 404: gagal.append((jalan, f'HEAD {e.code}')); continue
    try:
        r = api('contents/' + jalan, 'PUT', {'message': PESAN, 'content': b64, 'sha': sha, 'branch': 'main'})
        ok.append((jalan, 'TERDORONG', r.get('commit', {}).get('sha', '')[:7]))
    except urllib.error.HTTPError as e:
        gagal.append((jalan, f'PUT {e.code}: {e.read()[:120]}'))
    except Exception as e:
        gagal.append((jalan, str(e)[:120]))

for jalan, status, info in ok:
    print(f'OK  {jalan}: {status} ({info})')
for jalan, status in gagal:
    print(f'GAGAL {jalan}: {status}')
sys.exit(1 if gagal else 0)
