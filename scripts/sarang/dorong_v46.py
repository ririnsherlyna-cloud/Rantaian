#!/usr/bin/env python3
# ============================================================
# DORONG V46 — MESIN-DEAL-ODDS ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V256 v5.2 — deep-screening 3Commas &
#                         Trade Ideas: mesin deal DCA (safety orders, BEP,
#                         trailing TP), OddsMaker 0-100 + Money Machine top-3,
#                         6 tag peristiwa event-based, Global Max Open
#                         Positions — registri 81 → 101 param bernama)
#   laporan/index.html   (dasbor v2.6: seksi Mesin Deal & Odds — 6 kartu +
#                         ranking OddsMaker + hit-rate peristiwa; badge odds +
#                         komponen + peristiwa + blok RENCANA DEAL per sasaran;
#                         chip hero 101 param)
#   TUJUAN.md            (seksi 5j MESIN-DEAL-ODDS)
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
     'V256 MESIN-DEAL-ODDS: deep-screening 3Commas & Trade Ideas (dokumentasi resmi) — (A) mesin deal ala DCA-bot: rencana deal pra-registrasi per sasaran (safety orders maxSO/deviasi-ATR×multiplier/volume×multiplier + avg + TP-dari-avg, Move SL to Breakeven 60%, Trailing TP 0.8×ATR) semuanya DINILAI MEDAN saat matang (ilmu.deal: SO kena/net-dengan-SO/BEP menyelamatkan/ekstra trailing); (B) OddsMaker 0-100 (40% MC + 25% zona + 20% metakognisi + 15% daya) + Money Machine top-3 menguasai kuota ARAH, sisanya ditolak ber-alasan odds; (C) 6 tag peristiwa event-based disegel & hit-rate-nya dinilai medan (ilmu.peristiwa); (D) Global Max Open Positions guard mengikat (24); laporan/odds.json baru; registri 81→101 param bernama [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.6: seksi Mesin Deal & Odds (6 kartu + ranking OddsMaker siklus + hit-rate per peristiwa + statistik medan deal), badge odds/komponen/peristiwa + blok RENCANA DEAL (safety orders/BEP/trailing) pada kartu sasaran, chip odds top di hero, nav Deal & Odds, chip 101 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 5j MESIN-DEAL-ODDS — deep-screening 3Commas & Trade Ideas, 7 kunci diadopsi & dinilai medan, registri 101 param [skip ci]'),
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
print('SELESAI — tunggu denyut V256 pertama di Actions.')
