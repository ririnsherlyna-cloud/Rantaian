#!/usr/bin/env python3
# ============================================================
# DORONG V47 — SAMUDRA-DALAM ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V257 v5.3 — penyempit jurang otak-chat
#                         vs tubuh-GitHub: registri 101 → 127 param bernama;
#                         struktur harian 90 hari, kerumunan OKX rubik
#                         LS-akun/taker, basis/jam-funding/funding-relatif,
#                         gradien buku, 6 interaksi antar-faktor, 5 param
#                         iklim lintas-siklus, 2 veto baru)
#   laporan/index.html   (dasbor v2.7: seksi "Dua Lapis Otak" — jawaban jujur
#                         atas pertanyaan pemilik + sensus parameter terukur;
#                         3 kartu iklim baru; chip 127 param)
#   TUJUAN.md            (seksi 12a DUA LAPIS OTAK & SAMUDRA-DALAM)
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
     'V257 SAMUDRA-DALAM: penyempit jurang otak-chat vs tubuh-GitHub — registri 101→127 param bernama (67/kandang + 5 iklim + 35 metakognisi + 20 deal/odds): (D) struktur harian 90 hari dari klines 1d Binance (EMA-align/RSI/MACD daily, Donchian 30d, jarak puncak-lantai 90d, momentum bulanan, streak, rasio vol 7d/30d); (E) kerumunan NYATA OKX rubik (long/short account ratio + trennya via timestamp, taker buy/sell aggressor); (F) stres derivatif (basis perp-vs-spot, jam menuju funding, funding relatif vs BTC); (G) gradien order book; (H) 6 interaksi antar-faktor (funding×ΔOI, volume×ATR, tren×funding, buku×tren, breakout×volume, agresor×tren); iklim lintas-siklus (Δdominasi antar-denyut, ETH/BTC 7d, LS-akun BTC/ETH, jam funding BTC); 2 veto baru (kerumunan-bertumpuk, basis-ekstrem); ctxSamudra() satu pembangun konteks utk semua lane; semuanya lapis OBSERVASI — berhak veto & disekolahkan, TIDAK berbobot sebelum hit-rate medan lulus [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.7: seksi baru "Dua Lapis Otak — Kenapa Versi Chat Terasa Lebih Canggih" (jawaban jujur pertanyaan pemilik: lapis OTAK chat vs lapis TUBUH GitHub + sensus parameter terukur: 4 kartu — otak triliunan vs tubuh 127 param, 720 pengukuran/denyut, pengukuran terekam kumulatif; 30 chip domain + 21 param V257 ber-status sekolah), 3 kartu iklim baru (Δ Dominasi/denyut, ETH/BTC 7d risk-on/off, LS-akun BTC/ETH), nav Dua Lapis Otak, chip 127 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12a DUA LAPIS OTAK & SAMUDRA-DALAM — jawaban "kenapa versi arena lebih canggih", registri 101→127 param, 7 lapis baru V257 [skip ci]'),
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
print('SELESAI — tunggu denyut V257 pertama di Actions.')
