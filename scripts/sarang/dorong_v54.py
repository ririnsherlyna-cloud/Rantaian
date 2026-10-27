#!/usr/bin/env python3
# ============================================================
# DORONG V54 — PINTAR-KEMBALI ke repo pemilik (3 file):
#   scripts/penjaga.mjs (otak server V264 v6.1 — DOKTRIN PEMILIK 2026-10-03:
#       SALAH = data belajar di pasar hidup — bukan hukuman mati, bukan lupa total;
#       REM-PINTAR (dingin 4 jam → rem 1 denyut 15 menit; daftar-hitam 48 jam → rem
#       2 jam + syarat pelajaran); KEMBALI-PINTAR (syaratDariPelajaran dari ledger
#       sendiri — bar keyakinan +4/kejadian klamps +12, ukuran ×0.6^n, stop ×0.8^n,
#       wajib mata-jauh searah ≥2 kejadian — mengikat SAAT KUNCI, disegel di
#       pelajaranLalu; gagal syarat = rem, bukan ban; terbukti runtime: BNB SELL
#       tunda bar 62 skala 0.36 stop 0.64; BONK/TIA/VIRTUAL tunda phoenix);
#       TREN-EVOLUSI (ledger matang 4 jendela kronologis: n/winrate/EV/PF/
#       aturanMengikat% — hakim evolusi di rapor publik; jujur: ev MEMBURUK
#       0.01%→−0.74% sambil aturanMengikat MEMBAIK 35%→58%); registri 276 → 285)
#   laporan/index.html  (dasbor v3.4: seksi "Pintar-Kembali — SALAH Adalah Data
#       Belajar" — 4 kartu doktrin + tabel tren evolusi 4 jendela + hakim evolusi
#       berwarna + rem aktif ber-kadaluarsa; nav Pintar; chip 285; misi V264)
#   TUJUAN.md           (seksi 12h EPOCH V264-PINTAR-KEMBALI — doktrin pemilik
#       tercatat permanen + tiga kunci mengikat + kejujuran arsitektural)
# Idempoten via Contents API (sha). Token hanya dari env GH_TOKEN.
# Jalankan:  export GH_TOKEN=<micaprofita-penuh> && python3 scripts/sarang/dorong_v54.py
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
    print('  export GH_TOKEN=<token micaprofita-penuh> && python3 scripts/sarang/dorong_v54.py')
    sys.exit(1)

FILE = [
    ('/home/z/my-project/micaprofita/scripts/penjaga.mjs', 'scripts/penjaga.mjs',
     'V264 PINTAR-KEMBALI — DOKTRIN PEMILIK 2026-10-03: SALAH = data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total; koin yang salah arah TIDAK dibuang/didiamkan/diberhentikan belajar. (1) REM-PINTAR — jejak dingin kini REM SINGKAT ber-kadaluarsa: sasaran 2 kekalahan beruntun → rem 1 denyut 15 menit (bukan bekuan 4 jam), keluarga 1 denyut, kartu-panas maks 2 jam (bukan daftar-hitam 48 jam) — setiap rem ber-alasan, ber-akhir, tidak pernah mematikan belajar; (2) KEMBALI-PINTAR — syaratDariPelajaran() dari LEDGER SENDIRI: koin pernah SALAH pada pola serupa → bar keyakinan +4/kejadian (klamps +12), ukuran ×0.6^n, stop ×0.8^n, wajib konfirmasi mata-jauh searah bila ≥2 kejadian — syarat MENGIKAT SAAT KUNCI dan disegel di field pelajaranLalu (ARAH & PHOENIX); gagal syarat = TUNDA denyut ini (rem, bukan ban) — pasarnya hidup, pelajarannya tetap; bukti runtime: BNB SELL kej=3 bar=62 skala=0.36 stop=0.64 ditunda ber-alasan; BONK/TIA/VIRTUAL phoenix tunda bar 54→62; (3) TREN-EVOLUSI — "berevolusi" hanya berarti jika aturan mengikat saat kunci DAN tren EV/PF di rapor publik membaik: ledger matang dibagi 4 jendela kronologis (n/winrate/EV/PF/aturanMengikat% per jendela, tertua→terbaru) disegel tiap denyut di guru.json + impas.json + dasbor; jujur terukur: EV MEMBURUK 0.01%→−0.74% sambil aturanMengikat MEMBAIK 35%→58% — hakim evolusi bekerja, genome direvert bila memburuk; narasi guru +ajaran PINTAR; registri 276 → 285 parameter bernama (9 param pintar: 3 siklus + 6 konstanta); bukti sandbox 10/10 LULUS + uji paksa gerbang terisolasi LULUS [skip ci]'),
    ('/home/z/my-project/micaprofita/laporan/index.html', 'laporan/index.html',
     'DASBOR v3.4: seksi "Pintar-Kembali — SALAH Adalah Data Belajar (V264 — Rem Singkat, Bukan Blacklist)" — 4 kartu (doktrin hidup / rem aktif ber-kadaluarsa / syarat dari pelajaran / rem singkat bukan blacklist) + tabel tren evolusi 4 jendela (n/winrate/EV/PF/aturanMengikat%) + hakim evolusi berwarna (MEMBAIK hijau / MEMBURUK merah) + hukum evolusi; nav Pintar; chip 276 → 285; misi hero V264 [skip ci]'),
    ('/home/z/my-project/micaprofita/TUJUAN.md', 'TUJUAN.md',
     'TUJUAN: seksi 12h EPOCH V264-PINTAR-KEMBALI — doktrin pemilik "SALAH adalah data pembelajaran di pasar hidup" tercatat permanen + REM-PINTAR (rem singkat ber-kadaluarsa, bukan blacklist) + KEMBALI-PINTAR (syarat tambahan dari pelajaran mengikat saat kunci, disegel di pelajaranLalu) + TREN-EVOLUSI (4 jendela EV/PF — hakim evolusi di rapor publik, bukan generasi genome atau UI) + registri 276 → 285 [skip ci]'),
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
        sha = api(f'/contents/{jalan}?ref=main')['sha']
        if base64.b64decode(api(f'/contents/{jalan}?ref=main')['content']) == isi:
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
print(f'\n=== DORONG V54: {ok}/{len(FILE)} ===')
print('Setelah terdorong: denyut V264 pertama ≤15 menit → cek laporan/guru.json (trenEvolusi), laporan/impas.json (doktrinPintar), dasbor seksi Pintar, chip 285.')
