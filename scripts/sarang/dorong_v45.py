#!/usr/bin/env python3
# ============================================================
# DORONG V45 — METAKOGNISI-NEVRON ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V255 v5.1 — 7 kunci Nevron:
#                         estimator keyakinan 7-faktor, prediktor kegagalan
#                         pra-kunci, kritik diri 5-field, reliabilitas
#                         pelajaran, bias konteks, deteksi loop, monitor —
#                         registri 46 → 81 param bernama)
#   laporan/index.html   (dasbor v2.5: seksi Metakognisi Nevron, badge
#                         metakognisi + P gagal per sasaran, chip 81 param)
#   TUJUAN.md            (seksi 5i METAKOGNISI-NEVRON)
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
     'V255 METAKOGNISI-NEVRON: bedah Neurobro AI/Nevron (axioma-ai-labs) — 7 kunci diadopsi: ConfidenceEstimator 7-faktor (level<0.40=TUNGGU), FailurePredictor pra-kunci (prob>=0.60=TUNGGU), SelfCritic RLAIF 5-field, Lesson reliability (penguatan+peluruhan), StrategyAdapter bias konteks 0.4/0.4/0.2, LoopDetector (3/4/2), MetacognitiveMonitor — registri 46→81 param bernama; kalibrasi gerbang dinilai medan [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.5: seksi Metakognisi Nevron (4 kartu gerbang + 7 kunci chips + tabel bias konteks + deteksi loop + reliabilitas pelajaran + saran perbaikan + intervensi), badge metakognisi/P-gagal/bias pada kartu sasaran ARAH, chip hero 81 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5i METAKOGNISI-NEVRON — deep-screening Neurobro AI, 7 kunci diadopsi, registri 81 param [skip ci]'),
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
print('SELESAI — tunggu denyut V255 pertama di Actions.')
