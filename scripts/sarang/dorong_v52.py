#!/usr/bin/env python3
# ============================================================
# DORONG V52 — IMPAS-CERDAS ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V262 v5.8 — audit 4 kasus dev
#                         dari ledger sendiri + backtest mundur:
#                         5 KUNCI IMPAS mengikat — zona-chase,
#                         karantina-kalibrasi, alokasi-dinamis,
#                         stop/target wajib, ambang-impas;
#                         registri 232 → 254)
#   laporan/index.html   (dasbor v3.2: seksi "Warisan IMPAS" —
#                         6 kartu + jawaban 4 kasus + nav Impas +
#                         chip 254 param)
#   TUJUAN.md            (seksi 12f EPOCH V262-IMPAS-CERDAS)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# Jalankan:  export GH_TOKEN=... && python3 scripts/sarang/dorong_v52.py
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
    ('/home/z/my-project/micaprofita/scripts/penjaga.mjs', 'scripts/penjaga.mjs',
     'V262 IMPAS-CERDAS: audit 4 kasus dev dari LEDGER SENDIRI (64 rapor matang: akurasi 37.5%, net −30.9%, PF 0.68 — ARAH n=30 ak 16.7%/PF 0.07 pendarah; PHOENIX n=24 ak 45.8%/PF 1.232 satu-satunya di atas impas) + BACKTEST MUNDUR atas ledger sendiri — LIMA KUNCI IMPAS mengikat saat kunci: (1) zona-chase (SELL sr≤−0.5 n=35/PF 0.44 DIBLOK + BUY sr≥+0.5 — replay PF 0.68→0.93); (2) karantina-kalibrasi (keyakinan × faktor-jalur akurasi/jangkar < 40 → jalur dikarantina otomatis, pulih saat medan membaik — replay ekspek −0.48%→+0.07%); (3) alokasi-dinamis (kuota per jalur dari EV trailing-20 shrinkage Beta(4,4) — pendarah lantai 2/hari, jalur sehat menerima sisanya, dua arah); (4) stop/target WAJIB (36/36 ARAH lahir telanjang — kini dari kerucut MC, default-jujur 1.8%/2.6% bila kosong, sumberStop dicatat, penjaga-kedua tetap di atasnya); (5) ambang-impas (net-cum < 0 → ambang odds naik maks +20: kini 60→75.5, melonggar sendiri saat pulih) — gerbang impas juga untuk PHOENIX (zona beli-puncak + kalibrasi dua arah + kuota dipotong bila EV negatif); param impas 3/kandidat (zona/kalib/alokasi) + 6 siklus + 13 konstanta; registri 232 → 254 param bernama; laporan/impas.json baru (audit 4 kasus + backtest + jawaban); bukti sandbox 2 siklus LULUS 7/7 + uji paksa gerbang LULUS (impas-zona tolak BTC sr 0.759 & AVAX sr 0.604, impas-karantina tolak ETH terkalibrasi 35<40, buku-tekok impas-zona×2+impas-karantina×1) [skip ci]'),
    ('/home/z/my-project/micaprofita/laporan/index.html', 'laporan/index.html',
     'DASBOR v3.2: seksi "Warisan IMPAS — Lima Gerbang yang Mengikat" (6 kartu: faktor kalibrasi medan ARAH 0.565 vs PHX 0.643 / kuota dinamis per jalur / ambang-impas 75.5 / gerbang menolak zona-karantina-alokasi / backtest mundur PF 0.68→0.93 / stop-target wajib kasus D + status jawaban 4 kasus dev + rincian laporan/impas.json), nav Impas, chip 232→254 param [skip ci]'),
    ('/home/z/my-project/micaprofita/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12f EPOCH V262-IMPAS-CERDAS — audit 4 kasus dev dari ledger sendiri (64 rapor) + backtest mundur: 5 kunci impas mengikat (zona-chase, karantina-kalibrasi, alokasi-dinamis, stop/target wajib, ambang-impas), registri 232→254 param, bukti sandbox LULUS 7/7 + uji paksa gerbang LULUS [skip ci]'),
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
print('SELESAI — tunggu denyut V262 pertama di Actions, lalu verifikasi:')
print('  1. laporan/impas.json 200 di Pages (audit 4 kasus + backtest)')
print('  2. denyut-server.jsonl baris terbaru membawa impas.zonaCt/karantinaCt/alokasiCt/kuotaArah/ambangOddsEfektif')
print('  3. sasaran-terkini.json entri baru membawa e.impas + stop/target + sumberStop')
print('  4. dasbor: nav "Impas" + seksi "Warisan IMPAS" 6 kartu + chip 254')
