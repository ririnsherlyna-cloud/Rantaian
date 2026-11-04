#!/usr/bin/env python3
# ============================================================
# DORONG V39 — WARISAN-ORGAN ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V249 v4.0 — 7 mesin kuant organ
#                         penuh: GARCH, Monte Carlo guard+pra-registrasi,
#                         Volume Profile magnet, Beta CAPM, Divergensi,
#                         Breadth guard, Guard Kejut-Pump; MC dinilai medan)
#   laporan/index.html   (dasbor: seksi Warisan + kolom probabilitas MC
#                         di tangga harga + baris MC/GARCH/beta per kartu)
#   TUJUAN.md            (seksi 5c WARISAN ORGAN BESAR)
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
     'V249 WARISAN-ORGAN: riset organ penuh (8.000+ fungsi) lalu mewarisi 7 mesin jujur — GARCH(1,1) MLE, Monte Carlo 2.000 lintasan pra-registrasi + guard peluang, Volume Profile POC/VA magnet target, Beta BTC CAPM, Divergensi RSI, Breadth A/D guard, Guard Kejut-Pump; MC dinilai medan (Brier + kalibrasi bin) [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR: seksi Warisan Organ Besar (7 mesin + breadth + Brier MC + kalibrasi MC) + kolom peluang MC di tangga harga + baris MC/GARCH/beta per kartu sasaran [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5c WARISAN ORGAN BESAR — riset organ penuh, warisi yang bisa dihitung jujur [skip ci]'),
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
print('SELESAI — dispatch denyut untuk verifikasi.')
