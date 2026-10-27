#!/usr/bin/env python3
# ============================================================
# DORONG V49 — KAIZEN-PULIH ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V259 v5.5 — deep-screening
#                         keluarga "Kaizen Trader": 4 healing loops
#                         (uji-balik delta-revert, karantina rule-
#                         healer, dingin-dendam anti-revenge,
#                         henti-harian) + kesegaran pompa-tua +
#                         modal-mati/tesis-patah + penjaga-kedua;
#                         registri 145 → 167 param bernama)
#   laporan/index.html   (dasbor v2.9: seksi "Warisan Kaizen" — 8 kartu
#                         + 8 sumber resmi ber-URL + chip 167 param)
#   TUJUAN.md            (seksi 12c EPOCH V259-KAIZEN-PULIH)
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
     'V259 KAIZEN-PULIH: deep-screening keluarga "Kaizen Trader" (prateekjain98/kaizen-trader open-source dibedah kode-nya + KAIZEN Virtuals/Hyperliquid + Kaizen RegimeBot + kaizen.cash) — 4 healing loops diadopsi: (1) ujiBalik delta-revert (perubahan genome dievaluasi vs baseline per 8 vonis matang, lebih buruk DIREVERT); (2) karantina rule-healer (topik hit-rate <44% + 3 suara-keliru beruntun disita suaranya, pulih lewat bukti — sekolah dua arah); (3) dingin-dendam anti-revenge (2 kekalahan beruntun per sasaran → dingin 4 jam, 3 per keluarga → 1 denyut); (4) henti-harian (rugi-net hari UTC ≤ −4% memaksa BERTAHAN) — plus kesegaran gerakan (pompa-tua diveto ala fresh>stale), modal-mati/tesis-patah diukur medan, penjaga-kedua (hard-stop 15%/target 40% ala watchdog pra-registrasi) — registri 145 → 167 param bernama (3 per kandidat + 6 siklus + 13 konstanta); semuanya lapis OBSERVASI disekolahkan medan, tak berbobot genome sebelum hit-rate lulus [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.9: seksi "Warisan Kaizen — Empat Loop Penyembuhan-Diri" (kartu uji-balik revert/lolos + karantina + dingin-dendam + henti-harian + penjaga-kedua + kesegaran medan + modal-mati + tesis, 8 sumber resmi ber-URL, kunci diadopsi), nav Kaizen, chip 167 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12c EPOCH V259-KAIZEN-PULIH — identitas keluarga "Kaizen Trader" terverifikasi (kode sumber dibedah), 7 kunci inti diadopsi, registri 145→167 param, bukti sandbox 2 siklus data live (henti-harian & dingin-dendam terpicu nyata) [skip ci]'),
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
print('SELESAI — tunggu denyut V259 pertama di Actions.')
