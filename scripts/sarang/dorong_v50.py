#!/usr/bin/env python3
# ============================================================
# DORONG V50 — AUTOPILOT-KALIBRASI ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V260 v5.6 — deep-screening
#                         AutoPilotPM (recogardtech/AutoPilotPM,
#                         MIT, kode sumber TypeScript dibedah):
#                         7 kunci kalibrasi — timbangan-alt
#                         (alternativesConsidered), kelly-lapis
#                         (dynamic Kelly 9-lapis → skalaEfektif),
#                         rezim-medan (4 rezim σ baseline-mandiri),
#                         uji-tegang (5 skenario), slip-neto
#                         (edge − slippage), peluang-skor (0-100
#                         terbobot + penalti), top-tolak
#                         (topBlockReasons); registri 167 → 191)
#   laporan/index.html   (dasbor v3.0: seksi "Warisan AutoPilot" — 8
#                         kartu + 8 sumber resmi ber-URL + nav
#                         AutoPilot + chip 191 param)
#   TUJUAN.md            (seksi 12d EPOCH V260-AUTOPILOT-KALIBRASI)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# Jalankan:  export GH_TOKEN=... && python3 scripts/sarang/dorong_v50.py
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
     'V260 AUTOPILOT-KALIBRASI: deep-screening AutoPilotPM (recogardtech/AutoPilotPM, MIT, kode sumber TypeScript 95 modul dibedah: src/ledger + src/risk + src/trading) — TUJUH KUNCI KALIBRASI diadopsi: (1) timbangan-alt (alternativesConsidered ala decision ledger: pilihan kedua disegel saat kunci, regret-nya dihitung medan saat matang → ilmu.alt); (2) kelly-lapis (dynamic Kelly 9-lapis: pengecilan drawdown mulai 5% → 0.5× di 15%, kerendahan-hati sampel-kecil <10 vonis → 0.5–0.95×, penyusutan streak-kalah lantai 0.5×, vol-target scaling klamps [0.5,1.5] — di atas ekspresi dinamis → skalaEfektif clamp [0.2,1.2] + keyakinan-ukuran 0.4/0.3/0.3); (3) rezim-medan (4 rezim σ-P&L dengan baseline MANDIRI dari window penuh pertama — ekstrem memaksa BERTAHAN); (4) uji-tegang (5 skenario ala stress.ts — terburuk ≥30% → penalti + BERTAHAN); (5) slip-neto (edge − sqrt(1/likuiditas)·2·faktor − spread/2; bersih ≤ 0 ditolak, data kosong tak memblokir — fallback-jujur); (6) peluang-skor (0-100 terbobot + penalti; <60 ditolak dengan alasan — gerbang baru yang HANYA menolak); (7) top-tolak (topBlockReasons — kesadaran atas penolakannya sendiri) — registri 167 → 191 param bernama (3 per kandidat + 6 siklus + 15 konstanta); semuanya lapis OBSERVASI disekolahkan medan, tak berbobot genome sebelum hit-rate lulus [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v3.0: seksi "Warisan AutoPilot — Tujuh Kunci Kalibrasi" (8 kartu: rezim-medan baseline mandiri + uji-tegang + drawdown + top-tolak + regret pilihan + kelly kecil-vs-besar + peluang medan + stres medan; 8 sumber resmi ber-URL, kunci diadopsi), nav AutoPilot, chip 191 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12d EPOCH V260-AUTOPILOT-KALIBRASI — identitas AutoPilotPM terverifikasi (recogardtech/AutoPilotPM, MIT, kode sumber dibedah), 7 kunci inti diadopsi, registri 167→191 param, bukti sandbox 2 siklus data live LULUS + uji paksa gerbang peluang-rendah [skip ci]'),
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
print('SELESAI — tunggu denyut V260 pertama di Actions, lalu verifikasi:')
print('  1. laporan/autopilot.json 200 di Pages (8 sumber + 7 kunci)')
print('  2. denyut-server.jsonl baris terbaru membawa auto.rezimMedan/topTolak')
print('  3. dasbor: nav "AutoPilot" + seksi "Warisan AutoPilot" 8 kartu + chip 191')
