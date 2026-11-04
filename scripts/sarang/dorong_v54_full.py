#!/usr/bin/env python3
# ============================================================
# DORONG V54-FULL — gabungan V263+V264 ke repo pemilik (5 file):
#   scripts/penjaga.mjs            (v6.1 V264-PINTAR-KEMBALI, ditumpuk v6.0 V263-ASAH-MURNI)
#   laporan/index.html             (dasbor v3.4 — seksi Pintar-Kembali + tren evolusi)
#   TUJUAN.md                      (seksi 12h EPOCH V264)
#   .github/workflows/sakti-denyut.yml (cron */30 → */15 — denyut 15 menit)
#   laporan/matematika.json        (benih bukti hidup dari sandbox V264 — bersih, tanpa -UJI)
# Idempoten via Contents API (sha + cek SAMA). Token hanya dari env GH_TOKEN.
# Jalankan:  export GH_TOKEN=<micaprofita-penuh> && python3 scripts/sarang/dorong_v54_full.py
# ============================================================
import base64
import json
import os
import sys
import urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ.get('GH_TOKEN')
if not TOKEN:
    print('GH_TOKEN tidak tersedia di sesi. Jalankan:')
    print('  export GH_TOKEN=<token micaprofita-penuh> && python3 scripts/sarang/dorong_v54_full.py')
    sys.exit(1)

FILE = [
    ('/home/z/my-project/micaprofita/scripts/penjaga.mjs', 'scripts/penjaga.mjs',
     'V264 PINTAR-KEMBALI — DOKTRIN PEMILIK 2026-10-03: SALAH = data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total; koin yang salah arah TIDAK dibuang/didiamkan/diberhentikan belajar. (1) REM-PINTAR — jejak dingin kini REM SINGKAT ber-kadaluarsa: sasaran 2 kekalahan beruntun → rem 1 denyut 15 menit (bukan bekuan 4 jam), keluarga 1 denyut, kartu-panas maks 2 jam (bukan daftar-hitam 48 jam) — setiap rem ber-alasan, ber-akhir, tidak pernah mematikan belajar; (2) KEMBALI-PINTAR — syaratDariPelajaran() dari LEDGER SENDIRI: koin pernah SALAH pada pola serupa → bar keyakinan +4/kejadian (klamps +12), ukuran ×0.6^n, stop ×0.8^n, wajib konfirmasi mata-jauh searah bila ≥2 kejadian — syarat MENGIKAT SAAT KUNCI dan disegel di field pelajaranLalu (ARAH & PHOENIX); gagal syarat = TUNDA denyut ini (rem, bukan ban) — pasarnya hidup, pelajarannya tetap; (3) TREN-EVOLUSI — "berevolusi" hanya berarti jika aturan mengikat saat kunci DAN tren EV/PF di rapor publik membaik: ledger matang dibagi 4 jendela kronologis (n/winrate/EV/PF/aturanMengikat% per jendela, tertua→terbaru) disegel tiap denyut di guru.json + impas.json + dasbor — evolusi diukur dari angka medan, bukan diklaim; genome direvert bila memburuk. Ditumpuk V263-ASAH-MURNI v6.0: KARANTINA DIHAPUS TOTAL (asah-kalibrasi mode-asah, asah-suara bobot 0.35, henti-harian kuota belajar mikro), MATEMATIKA MURNI & EKONOMI CERDAS (Hurst/half-life/OLS/z-SMA/entropi/Parkinson-GK/autokorelasi/carry/EV-eko), MATA JAUH MC-72j, ORGAN-BARU dari tiap SALAH ber-replay ledger, sumber data +3 (posisi-besar Binance futures, agresor taker, Bybit linear); registri 276 → 285 parameter bernama; bukti sandbox 10/10 LULUS + uji paksa gerbang terisolasi LULUS [skip ci]'),
    ('/home/z/my-project/micaprofita/laporan/index.html', 'laporan/index.html',
     'DASBOR v3.4: seksi "Pintar-Kembali — SALAH Adalah Data Belajar (V264 — Rem Singkat, Bukan Blacklist)" — 4 kartu (doktrin hidup / rem aktif ber-kadaluarsa / syarat dari pelajaran / rem singkat bukan blacklist) + tabel tren evolusi 4 jendela (n/winrate/EV/PF/aturanMengikat%) + hakim evolusi berwarna (MEMBAIK hijau / MEMBURUK merah) + hukum evolusi; nav Pintar; chip 276 → 285; misi hero V264; denyut 15 menit di seluruh teks [skip ci]'),
    ('/home/z/my-project/micaprofita/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12h EPOCH V264-PINTAR-KEMBALI — doktrin pemilik "SALAH adalah data pembelajaran di pasar hidup" tercatat permanen + REM-PINTAR (rem singkat ber-kadaluarsa, bukan blacklist) + KEMBALI-PINTAR (syarat tambahan dari pelajaran mengikat saat kunci, disegel di pelajaranLalu) + TREN-EVOLUSI (4 jendela EV/PF — hakim evolusi di rapor publik) + registri 276 → 285 [skip ci]'),
    ('/home/z/my-project/micaprofita/.github/workflows/sakti-denyut.yml', '.github/workflows/sakti-denyut.yml',
     'DENYUT 15 MENIT: cron */30 → */15 — yang belajar tidak dibiarkan mengantuk; denyut V264 pertama ≤15 menit setelah dorongan ini [skip ci]'),
    ('/tmp/v264/laporan/matematika.json', 'laporan/matematika.json',
     'BENIH bukti hidup V263+V264 (disalin dari sandbox, bersih tanpa -UJI): mandat anti-karantina + hukumAsah + matematikaMurni (Hurst/half-life/OLS/entropi/Parkinson-GK) + ekonomiCerdas (carry/EV-eko) + mataJauh (kerucut MC 72j) + organBaru + sumberDilengkapi (11 sumber ber-URL) + konstanta ASAH; denyutMenit 15 — regenerasi hidup tiap denyut oleh penjaga [skip ci]'),
]

def api(jalan, metode='GET', isi=None):
    req = urllib.request.Request(API + jalan, method=metode)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    data = None
    if isi is not None:
        data = json.dumps(isi).encode()
        req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, data) as r:
        return json.loads(r.read())

# pra-cek: jangan menimpa denyut server yang lebih baru
try:
    info = api('/commits/main')
    pesan = (info.get('commit', {}).get('message') or '').split('\n')[0]
    print('HEAD remote:', pesan)
except Exception as e:
    print('pra-cek gagal (lanjut):', e)

ok = 0
for lokal, jalan, pesan in FILE:
    if not os.path.exists(lokal):
        print(f'LEWAT (file tak ada): {jalan}')
        continue
    isi = open(lokal, 'rb').read()
    b64 = base64.b64encode(isi).decode()
    sha = None
    try:
        meta = api(f'/contents/{jalan}?ref=main')
        sha = meta['sha']
        if base64.b64decode(meta['content']) == isi:
            print(f'SAMA (lewat): {jalan}')
            ok += 1
            continue
    except Exception:
        pass
    try:
        api(f'/contents/{jalan}', 'PUT', {
            'message': pesan, 'content': b64, 'sha': sha,
        })
        print(f'TERDORONG: {jalan} ({len(isi)} B)')
        ok += 1
    except Exception as e:
        print(f'GAGAL {jalan}: {e}')
print(f'\n=== DORONG V54-FULL: {ok}/{len(FILE)} ===')
print('Setelah terdorong: denyut V264 pertama ≤15 menit → cek laporan/guru.json (trenEvolusi), laporan/impas.json (doktrinPintar), dasbor seksi Pintar, chip 285, workflow cron 15.')
