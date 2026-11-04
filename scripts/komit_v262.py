#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Commit 3 file patch V262-EVO-BUFFER ke repo Micaprofita- via Contents API.
Retry otomatis saat tabrakan dengan komit denyut (fetch sha ulang tiap percobaan)."""
import json, base64, time, io, urllib.request, sys

TOKEN = io.open('/home/z/my-project/.token-rantaian').read().strip()
REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}/contents'

FILES = [
    ('scripts/penjaga.mjs', '/home/z/my-project/data/_server/penjaga_patched.mjs'),
    ('imun/cadangan/scripts_penjaga_mjs', '/home/z/my-project/data/_server/penjaga_patched.mjs'),
    ('imun/manifes.json', '/home/z/my-project/data/_server/manifes_patched.json'),
]

PESAN = ('V262-EVO-BUFFER — akar genome beku 16 hari (2026-10-12→10-28): evolusi '
         'mensyaratkan >=3 vonis matang per SATU siklus, padahal kunci drip-feed 1/siklus '
         '(849/941) sehingga vonis matang 1/siklus — klaster >=3 terakhir 2026-10-12 13:45 UTC. '
         'Kini vonis matang di-buffer persisten antar denyut (kaizen.evoBuf/evoBufWaw/evoBufPhx); '
         'evolusi jalan begitu buffer >=3 sampel nyata — jaminan jujur tetap, uji-balik tetap '
         'mengawal. Cadangan imun + manifest disinkronkan (hash adee5ce8fef9c3e6).')

def req(url, method='GET', payload=None):
    r = urllib.request.Request(url, method=method)
    r.add_header('Authorization', f'Bearer {TOKEN}')
    r.add_header('Accept', 'application/vnd.github+json')
    r.add_header('User-Agent', 'microprofita-v262')
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        r.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(r, data, timeout=40) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        return e.code, {'message': body}

for jalur, fpath in FILES:
    isi = io.open(fpath, 'rb').read()
    b64 = base64.b64encode(isi).decode()
    ok = False
    for coba in range(1, 6):
        st, info = req(f'{API}/{jalur}')
        sha = info.get('sha') if st == 200 else None
        payload = {'message': PESAN, 'content': b64, 'branch': 'main'}
        if sha:
            payload['sha'] = sha
        st2, put = req(f'{API}/{jalur}', 'PUT', payload)
        if st2 in (200, 201):
            print(f'OK {jalur} (percobaan {coba}) commit {put["commit"]["sha"][:8]}')
            ok = True
            break
        print(f'tabrakan {jalur} percobaan {coba}: HTTP {st2} — ulang 8 dtk')
        time.sleep(8)
    if not ok:
        print(f'GAGAL TOTAL: {jalur}')
        sys.exit(1)
    time.sleep(2)
print('SEMUA KOMIT LULUS')
