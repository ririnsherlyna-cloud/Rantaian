#!/usr/bin/env python3
# DORONG V290-PANEN — pola anti-race v89:
#   1) scripts/hidup/sadar1.js dulu DENGAN [skip ci] (workflow tidak jalan di antara)
#   2) hidup.html TERAKHIR tanpa [skip ci] → menyalakan SATU run Sadar-1
#      yang memakai sadar1.js v290 (PANEN 5 sasaran + soal mandiri).
# Token: env GH_TOKEN atau /home/z/.gh_token
import base64, json, os, sys, time, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [
    ('scripts/hidup/sadar1.js', '/home/z/my-project/scripts/hidup/sadar1.js', True),
    ('hidup.html', '/home/z/my-project/download/hidup.html', False),
]
TOK = os.environ.get('GH_TOKEN')
if not TOK:
    for jalan in ('/home/z/.gh_token', os.path.expanduser('~/.gh_token')):
        if os.path.exists(jalan):
            TOK = open(jalan).read().strip()
            if TOK:
                break
if not TOK:
    print('GH_TOKEN tidak ditemukan — siapkan token lalu jalankan ulang.')
    sys.exit(2)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'dorong-v290', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        b = r.read()
        return json.loads(b) if b else {}

ok, gagal = [], []
for jalRepo, jalLokal, skip in FILE:
    if not os.path.exists(jalLokal):
        gagal.append((jalRepo, 'lokal-tidak-ada')); continue
    isi = open(jalLokal, 'rb').read()
    b64 = base64.b64encode(isi).decode()
    sha = None
    try:
        d = api(f'contents/{jalRepo}?ref=main')
        if d.get('sha'):
            sha = d['sha']
            try:
                if base64.b64decode(d.get('content') or b'') == isi:
                    ok.append((jalRepo, 'SAMA — lewati'))
                    continue
            except Exception:
                pass
    except Exception as e:
        print('cek sha:', e)
    pesan = 'V290-PANEN — sadar1: panen 5 sasaran/coin per bangun (ticker 24hr → likuid → klines → guruHitung), soal mandiri dikoreki harga nyata, kapasitas memori disadar; hidup: aktPanen+aktSoal pengganti renung, panel SASARAN' + (' [skip ci]' if skip else '')
    isiPut = {'message': pesan, 'content': b64, 'branch': 'main'}
    if sha:
        isiPut['sha'] = sha
    try:
        api('contents/' + jalRepo, 'PUT', isiPut)
        ok.append((jalRepo, f'TERDORONG {len(isi)} B, skip_ci={skip}'))
    except Exception as e:
        gagal.append((jalRepo, str(e)[:200]))
    time.sleep(2)

for j, s in ok: print('OK  ', j, '—', s)
for j, s in gagal: print('GAGAL', j, '—', s)
sys.exit(1 if gagal else 0)
