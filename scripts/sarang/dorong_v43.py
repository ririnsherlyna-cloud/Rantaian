#!/usr/bin/env python3
# ============================================================
# DORONG V43 — WAWASAN-360 ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V253 v4.3 — komite 5→17 dimensi:
#                         10 param lilin baru + derivatif nyata Bybit
#                         funding/OI + iklim makro + narasi analis)
#   laporan/index.html   (dasbor v2.3: seksi Wawasan Pasar 360° — 6 kartu
#                         iklim + narasi makro + tabel 10×12 param +
#                         narasi & chip parameter di kartu sasaran)
#   TUJUAN.md            (seksi 5g WAWASAN-360)
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
     'V253 WAWASAN-360: komite 5→17 dimensi (MACD/ADX/Bollinger/VWAP/OBV/swing/pola/konsistensi/pivot/relatif + funding & OI NYATA Bybit linear) + iklim makro F&G/dominasi/breadth + narasi analis fasih per sasaran + zona forensik funding + bobot wawasan belajar (genome+Hedge) [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.3: seksi Wawasan Pasar 360° — 6 kartu iklim makro, narasi analis makro, tabel 10 kandang × 12 parameter, narasi + chip parameter di kartu sasaran [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5g WAWASAN-360 — banyak parameter, satu bacaan, narasi analis [skip ci]'),
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

# dispatch denyut — otak baru berdenyut segera untuk verifikasi
try:
    r = urllib.request.Request(API + '/actions/workflows/sakti-denyut.yml/dispatches',
        method='POST',
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'sarang-penjaga-installer'},
        data=json.dumps({'ref': 'main'}).encode())
    with urllib.request.urlopen(r, timeout=30) as res:
        print('dispatch : HTTP', res.status)
except urllib.error.HTTPError as e:
    print('dispatch gagal:', e.code, e.read().decode()[:200])
print('SELESAI — tunggu denyut V253 pertama di Actions.')
