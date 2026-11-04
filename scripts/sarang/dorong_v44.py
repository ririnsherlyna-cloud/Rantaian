#!/usr/bin/env python3
# ============================================================
# DORONG V44 — SAMUDRA-PARAMETER ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V254 v5.0 — registri 46 param/kandang:
#                         multi-TF 1h+4h, riwayat funding, order book OKX,
#                         lintas-pasar swap, kalender, GARCH/MC + sekolah
#                         parameter + gerbang veto wawasan)
#   laporan/index.html   (dasbor v2.4: chip 46 param, 8 kartu iklim, kotak veto,
#                         konsensus domain, tabel Sekolah Parameter)
#   TUJUAN.md            (seksi 5h SAMUDRA-PARAMETER)
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
     'V254 SAMUDRA-PARAMETER: registri 46 param/kandang (~460 pengukuran/denyut) — multi-TF 1h+4h, riwayat funding rata3+tren, order book OKX (imbalance/spread/kedalaman/dinding), persentil lintas-pasar swap, altseason-proxy, kalender, GARCH/MC + SEKOLAH PARAMETER (hit-rate tiap param dinilai medan dari ledger) + GERBANG VETO wawasan (no-trade adalah keputusan) [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.4: chip 46 param, 8 kartu iklim (+Δ7d F&G, lintas-pasar OKX, altseason-proxy), kotak gerbang veto, konsensus per domain di tabel kandang, tabel Sekolah Parameter (n/hit/net/status) [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5h SAMUDRA-PARAMETER — 46 parameter per kandang, sekolah parameter, gerbang veto [skip ci]'),
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
print('SELESAI — tunggu denyut V254 pertama di Actions.')
