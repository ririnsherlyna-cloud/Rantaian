#!/usr/bin/env python3
# ============================================================
# DORONG V53 — ASAH-MURNI ke repo pemilik (5 file):
#   scripts/penjaga.mjs                (otak server V263 v6.0 — HUKUM PEMILIK:
#                                       KARANTINA DILARANG → mode-asah; matematika
#                                       murni & ekonomi cerdas; mata jauh MC-72j;
#                                       organ-baru dari kesalahan; denyut 15 menit;
#                                       sumber data dilengkapi; registri 254 → 276)
#   laporan/index.html                 (dasbor v3.3: seksi "Mata Jauh" + nav + chip 276)
#   TUJUAN.md                          (seksi 12g EPOCH V263-ASAH-MURNI + denyut 15 menit)
#   .github/workflows/sakti-denyut.yml (cron */30 → */15)
#   laporan/matematika.json            (laporan baru — bukti hidup dari sandbox)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# Jalankan:  export GH_TOKEN=<micaprofita-penuh> && python3 scripts/sarang/dorong_v53.py
# ============================================================
import base64
import json
import os
import shutil
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ.get('GH_TOKEN')
if not TOKEN:
    print('GH_TOKEN tidak tersedia di sesi. Jalankan:')
    print('  export GH_TOKEN=<token micaprofita-penuh> && python3 scripts/sarang/dorong_v53.py')
    sys.exit(1)

# laporan/matematika.json — ambil bukti hidup dari sandbox uji paksa (data nyata)
SAND_MAT = '/tmp/v263u2/laporan/matematika.json'
MAT_LOKAL = '/home/z/my-project/micaprofita/laporan/matematika.json'
if os.path.exists(SAND_MAT):
    shutil.copy(SAND_MAT, MAT_LOKAL)
    print('matematika.json (bukti hidup) disalin dari sandbox uji paksa')

FILE = [
    ('/home/z/my-project/micaprofita/scripts/penjaga.mjs', 'scripts/penjaga.mjs',
     'V263 ASAH-MURNI — HUKUM PEMILIK: KARANTINA DILARANG (yang sedang belajar harus terus belajar): (1) ASAH-KALIBRASI — gerbang karantina-kalibrasi V262 DIHAPUS di ARAH & PHOENIX: jalur overclaim TETAP MENGUNCI dalam MODE-ASAH (ukuran ×0.6, stop ×0.75, terkalibrasi disegel jujur — terbukti sandbox: terkalibrasi 29.4 terkunci dengan seal lengkap); (2) ASAH-SUARA — rule-healer V259 tak lagi menyita suara topik (bobot 0 → 0.35, pulih lewat bukti); (3) HENTI-HARIAN kini MODE-ASAH (kuota belajar 2, ukuran mikro ×0.3 — modal dibekukan, ilmu tidak); (4) MATEMATIKA MURNI & EKONOMI CERDAS (mesinMate per kandidat dari data saat itu: Hurst R/S, half-life OU, drift OLS+R², z-SMA20, entropi Shannon, Parkinson/Garman-Klass, autokorelasi lag-1, carry funding siapa-membayar-siapa, EV-ekonomi setelah biaya) + MATA JAUH (kerucut MC bootstrap 72 jam: P(naik) 24/48/72 + median lintasan — membaca jauh sebelum terjadi); (5) ORGAN-BARU — setiap SALAH melahirkan mikro-aturan ber-replay ke ledger (terbukti: organ-carry-melawan-SELL lahir dari ETH SALAH evEko −2.07%); organ lulus sekolah medan (n≥10, hit≥52%, net>0) berhak VETO; (6) denyut 30 → 15 MENIT (cron */15); (7) sumber data dilengkapi: Binance topLongShortPositionRatio + takerlongshortRatio + Bybit linear; param mate 3/kandidat + 6 siklus + 13 konstanta; registri 254 → 276; laporan/matematika.json baru; bukti sandbox 2 siklus + uji paksa LULUS (6 entri non-eksplor terkunci mode-asah, 7 SALAH → organ) [skip ci]'),
    ('/home/z/my-project/micaprofita/laporan/index.html', 'laporan/index.html',
     'DASBOR v3.3: seksi "Mata Jauh — Matematika Murni & Ekonomi Cerdas + Organ-Baru (V263 — Denyut 15 Menit, Karantina Dilarang)" (5 kartu: kerucut mata jauh MC-72j / hukum ASAH aktif / organ-baru dari kesalahan / ekonomi cerdas carry / sumber data dilengkapi + organ terbaru ber-replay), nav Mata Jauh, chip 254 → 276, teks denyut 15 menit, kartu impas direvisi ke mode-asah [skip ci]'),
    ('/home/z/my-project/micaprofita/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12g EPOCH V263-ASAH-MURNI — hukum pemilik "KARANTINA DILARANG" tercatat permanen + matematika murni & ekonomi cerdas + mata jauh MC-72j + organ-baru dari kesalahan + denyut 30 → 15 menit + sumber data dilengkapi; teks denyut diselaraskan 15 menit [skip ci]'),
    ('/home/z/my-project/micaprofita/.github/workflows/sakti-denyut.yml', '.github/workflows/sakti-denyut.yml',
     'DENYUT 15 MENIT (V263 — hukum pemilik: yang belajar tidak dibiarkan mengantuk): cron */30 → */15 [skip ci]'),
    ('/home/z/my-project/micaprofita/laporan/matematika.json', 'laporan/matematika.json',
     'LAPORAN MATEMATIKA V263 — hukum asah (karantina dilarang), rumus matematika murni (Hurst/half-life/OLS/z-SMA/entropi/Parkinson-GK/autokorelasi), ekonomi cerdas carry+EV, mata jauh MC-72j BTC, organ-baru ber-replay, sumber data dilengkapi (11 sumber), konstanta ASAH — bukti hidup denyut uji paksa [skip ci]'),
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

info = req('', 'GET')
print('repo:', info.get('full_name'), '| default branch:', info.get('default_branch'))

for lokal, repo_path, pesan in FILE:
    teks = open(lokal, encoding='utf-8').read()
    isi = base64.b64encode(teks.encode()).decode()
    ada = req(f'/contents/{repo_path}', 'GET', boleh404=True)
    body = {'message': pesan, 'content': isi, 'branch': 'main'}
    if ada:
        sha_lama = ada.get('sha')
        if ada.get('size') == len(teks.encode()) and (ada.get('content') or '').replace('\n', '') == isi:
            print(f'SKIP (identik): {repo_path}')
            continue
        body['sha'] = sha_lama
    req(f'/contents/{repo_path}', 'PUT', body)
    print(f'PUSH: {repo_path} ({len(teks.encode())} B)')

# dispatch denyut pertama dengan kode V263
try:
    r = urllib.request.Request(API + '/actions/workflows/sakti-denyut.yml/dispatches', method='POST',
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'sarang-penjaga-installer'},
        data=json.dumps({'ref': 'main'}).encode())
    with urllib.request.urlopen(r, timeout=30) as res:
        print('dispatch denyut V263:', res.status, '(204 = sukses)')
except urllib.error.HTTPError as e:
    print('dispatch gagal:', e.code, e.read().decode()[:300]); sys.exit(1)
print('SELESAI — denyut V263 pertama berjalan; verifikasi: laporan/matematika.json 200 + denyut.mate + cron 15 menit')
