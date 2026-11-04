#!/usr/bin/env python3
# ============================================================
# DORONG V48 — GEKKO-CZAR ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V258 v5.4 — deep-screening Gekko
#                         Agent (Axal×Virtuals×Allora) + CZAR Loss
#                         (arXiv 2609.36061): meta-inferensi kolektif
#                         6 topik bertingkat-regret, skor CZAR asimetris,
#                         akurasi-impas/darah, ekspresi dinamis 0.25-1.0x,
#                         divergensi vs probPasar, suhu Autopilot
#                         terikat-batas, sidikPrakunci sha256;
#                         registri 127 → 145 param bernama)
#   laporan/index.html   (dasbor v2.8: seksi "Warisan Gekko" — 6 kartu
#                         + tabel 6 topik + 8 sumber resmi + chip suhu
#                         di header + chip meta/probPasar/divergensi/
#                         ekspresi/sidik di kartu sasaran; chip 145 param)
#   TUJUAN.md            (seksi 12b EPOCH V258-GEKKO-CZAR)
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
     'V258 GEKKO-CZAR: deep-screening Gekko Agent (Axal × Virtuals × Allora) + CZAR Loss (arXiv 2609.36061) — 6 kunci inti diadopsi: (1) metaInferensi() kolektif 6 topik ala Allora Topics dengan bobot exp(-0.9·regret) diperbarui medan; (2) skorCzar() asimetris magnitude-aware + akurasiImpas (breakeven WR dari rata menang/rugi) + darahAkurasi (merah = aktivitas menggerus modal); (3) ekspresiSkala() eksposur dinamis 0.25-1.0x unit; (4) probPasar()/divergensi ramalan vs probabilitas-implied pasar; (5) suhuPasar() temper Autopilot AGRESIF/NETRAL/BERTAHAN terikat-batas (PF<1 memaksa BERTAHAN; lantai ambang 52); (6) sidikPrakunci sha256 pra-registrasi per prediksi (ARAH & PHOENIX) — registri 127 → 145 param bernama (5 per kandidat + 5 siklus + 8 konstanta); semuanya lapis OBSERVASI disekolahkan medan, tak berbobot genome sebelum hit-rate lulus [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v2.8: seksi "Warisan Gekko — Prediksi Kolektif (Allora) & Keberanian Terukur (CZAR)" (kartu suhu Autopilot + akurasi impas/darah + czar rata + sidik pra-registrasi + ekspresi medan + divergensi + tabel 6 topik bobot-regret + 8 sumber resmi ber-URL), chip suhu di header, chip meta/probPasar/divergensi/ekspresi/sidik di kartu sasaran, chip 145 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12b EPOCH V258-GEKKO-CZAR — identitas Gekko Agent (Axal) terverifikasi, 6 kunci inti diadopsi, registri 127→145 param, bukti sandbox 2 siklus data live [skip ci]'),
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
print('SELESAI — tunggu denyut V258 pertama di Actions.')
