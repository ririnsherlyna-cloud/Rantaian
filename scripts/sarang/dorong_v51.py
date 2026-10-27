#!/usr/bin/env python3
# ============================================================
# DORONG V51 — CLAW-TEMPOK ke repo pemilik (3 file):
#   scripts/penjaga.mjs  (otak server V261 v5.7 — deep-screening
#                         keluarga "ClawTrade" dari KODE SUMBER:
#                         yuxuan-lou/ClawTrade middleware + 
#                         clawtradeai-Agent/ClawTradeAI MIT):
#                         8 KUNCI TEMPOK — pagar-baja, daftar-
#                         terlarang, komite panjia 5 suara,
#                         kartu risiko 4×25 ber-veto, tangga
#                         ukuran, menunggu-mandat, daftar-hitam,
#                         buku-tekok; registri 191 → 232
#   laporan/index.html   (dasbor v3.1: seksi "Warisan ClawTrade" —
#                         6 kartu + buku-tekok + 8 sumber ber-URL +
#                         nav ClawTrade + chip 232 param)
#   TUJUAN.md            (seksi 12e EPOCH V261-CLAW-TEMPOK)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# Jalankan:  export GH_TOKEN=... && python3 scripts/sarang/dorong_v51.py
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
     'V261 CLAW-TEMPOK: deep-screening keluarga "ClawTrade" dari KODE SUMBER — yuxuan-lou/ClawTrade (security middleware "treat your AI agent as an untrusted client": guardrails.py hard rules di luar jangkauan otak + confirmation.py antrean konfirmasi ber-kadaluarsa + audit.py append-only) + clawtradeai-Agent/ClawTradeAI (MIT, multi-agent Solana: CoordinatorAgent weighted voting + riskManagerVeto + recommendedAmount, RiskManagerAgent kartu 4×25 + blockedTokens) — DELAPAN KUNCI TEMPOK diadopsi: (1) pagar-baja (konstanta keras yang otak baca tapi tak bisa tulis: kuota-harian 12, langit-langit slip 1.2%, ukuran-maks 1.0×) dicek dulu di gerbang; (2) daftar-terlarang ala FORBIDDEN_OPS; (3) komite panjia 5 suara berbobot tetap (koherensi searah dgn minconf 0.6 — kalibrasi jujur, bukan copy confidence LLM; suara rusak = bobot nol); (4) kartu risiko 4×25 ber-veto-saksi (data kosong → poin tengah); (5) tangga ukuran 1.0/0.5/0.25/nol tanpa ukuran antara, menambat skalaEfektif dari atas; (6) menunggu-mandat (ukuran tertinggi antre + kadaluarsa 12 jam, kunci hanya setelah lolos gerbang ulang denyut berikutnya); (7) daftar-hitam ber-pendingin 48 jam (3× kartu-panas beruntun); (8) buku-tekok per aturan (audit append-only) — registri 191 → 232 param bernama; semuanya lapis OBSERVASI disekolahkan medan, semua gerbang claw HANYA MENOLAK [skip ci]'),
    ('/home/z/my-project/scripts/sarang/dasbor_laporan.html', 'laporan/index.html',
     'DASBOR v3.1: seksi "Warisan ClawTrade — Pagar-Baja & Komite Panjia" (6 kartu: komite panjia/veto-saksi kartu/tangga ukuran/menunggu-mandat/pagar-baja aktif/daftar-hitam + buku-tekok per aturan + 8 sumber resmi ber-URL + 8 kunci diadopsi), nav ClawTrade, chip 232 param [skip ci]'),
    ('/home/z/my-project/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12e EPOCH V261-CLAW-TEMPOK — identitas keluarga ClawTrade terverifikasi dari kode sumber (middleware + ClawTradeAI MIT), 8 kunci tempok diadopsi, registri 191→232 param, bukti sandbox 2 siklus data live LULUS + uji paksa gerbang (kartu-veto 2× + antrean mandat 2 arah: antre & re-verify lintas-denyut) [skip ci]'),
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
print('SELESAI — tunggu denyut V261 pertama di Actions, lalu verifikasi:')
print('  1. laporan/clawtrade.json 200 di Pages (8 sumber + 8 kunci)')
print('  2. denyut-server.jsonl baris terbaru membawa claw.komiteVeto/kartuVeto/konfirmAntre')
print('  3. dasbor: nav "ClawTrade" + seksi "Warisan ClawTrade" 6 kartu + chip 232')
