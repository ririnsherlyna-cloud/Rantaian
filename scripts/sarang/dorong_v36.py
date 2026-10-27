#!/usr/bin/env python3
# ============================================================
# DORONG V36 — V247-MAJELIS-ILMU ke repo pemilik (4 file):
#   scripts/penjaga.mjs        (otak server V247: Hedge + Brier/kalibrasi
#                               + konformal + triple-barrier/meta + FinMem)
#   laporan/index.html         (dasbor: seksi Jurnal Ilmu + pita konformal
#                               + kolom Brier/Barier + catatan kalibrasi)
#   TUJUAN.md                  (manifesto: seksi 5 ILMU BERJURNAL, renum 6-12)
#   laporan/jurnal-ilmu.json   (akta jurnal: 7 rujukan terverifikasi + bukti
#                               pemasangan — ditulis otak tiap denyut)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# [skip ci] pada komit — denyut dipicu manual via workflow_dispatch.
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
     'V247-MAJELIS-ILMU v3.0: 5 metode jurnal teruji dipasang — Hedge/MWU (Arora dkk 2012), Brier & kalibrasi keyakinan (Gneiting-Raftery 2007), pita konformal 75% (Angelopoulos-Bates 2021), triple-barrier & meta-labeling (Lopez de Prado 2018), ingatan berlapis FinMem (Zhang 2023) [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR: seksi Jurnal Ilmu (fondasi ilmiah + tabel kalibrasi + 7 rujukan), pita konformal 75% di kartu phoenix, catatan kalibrasi keyakinan, kolom Brier & Barier di ledger [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5 ILMU BERJURNAL (tabel metode-jurnal-dipasang + pengakuan jujur Brier) — seksi 6-12 dinomori ulang [skip ci]'),
    ('/home/z/my-project/scripts/sarang/live36/jurnal-ilmu-seed.json', 'laporan/jurnal-ilmu.json',
     'AKTA JURNAL: 7 rujukan terverifikasi (Arora-Hazan-Kale 2012, Freund-Schapire 1997, Cesa-Bianchi-Lugosi 2006, Gneiting-Raftery 2007, Angelopoulos-Bates 2021, Lopez de Prado 2018, FinMem 2023) + bukti pemasangan [skip ci]'),
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
print('SELESAI — denyut berikutnya (dispatch) membawa otak V247.')
