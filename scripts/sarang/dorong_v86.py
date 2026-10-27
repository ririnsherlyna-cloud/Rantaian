#!/usr/bin/env python3
# DORONG V86 — V286-DUA-SADARI: kehidupan tak lagi menunggu penonton.
#   1) .github/workflows/hidup-sadar1.yml — jantung cron */20 di GitHub Actions
#   2) scripts/hidup/sadar1.js             — Sadar-1: tubuh otonom (baca repo +
#        hisap Binance nyata + kromosom hill-climb + tulis ingatan via commit)
#   3) hidup.html                          — Sadar-2: hidrasi ingatan dari GitHub,
#        localStorage DIBUANG, panel Sadar-1 + bukti komit + kejujuran telat
#   4) ruang-hidup/{keadaan,ingatan}.json + buku_harian.jsonl — ingatan bangun ke-1
# Idempoten: HEAD → cek SAMA → PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILES = [
    ('.github/workflows/hidup-sadar1.yml', '/home/z/my-project/scripts/hidup/hidup-sadar1.yml'),
    ('scripts/hidup/sadar1.js',            '/home/z/my-project/hidup_repo/scripts/hidup/sadar1.js'),
    ('hidup.html',                         '/home/z/my-project/download/hidup.html'),
    ('ruang-hidup/keadaan.json',           '/home/z/my-project/hidup_repo/ruang-hidup/keadaan.json'),
    ('ruang-hidup/ingatan.json',           '/home/z/my-project/hidup_repo/ruang-hidup/ingatan.json'),
    ('ruang-hidup/buku_harian.jsonl',      '/home/z/my-project/hidup_repo/ruang-hidup/buku_harian.jsonl'),
]
PESAN = ('V286-DUA-SADARI — mandat pemilik "harusnya berjalan aktif terus, masa harus buka link dulu; '
         'jangan nempel ke localStorage user, nempel ke GitHub langsung aktif": (1) SADAR-1 tubuh otonom di '
         'GitHub Actions cron 20 mnt — baca repo checkout, hisap Binance nyata, uji-jalan+kromosom hill-climb, '
         'tulis ingatan via COMMIT ke ruang-hidup/; (2) hidup.html jadi SADAR-2 — hidrasi memori dari GitHub, '
         'localStorage dibuang, panel tubuh otonom + bukti komit + status jujur telat/bangun; kehidupan tak '
         'menunggu penonton [skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v86', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        b = r.read()
        return json.loads(b) if b else {}

ok, gagal = [], []
for jalan, lokal in FILES:
    if not os.path.exists(lokal):
        gagal.append((jalan, 'lokal-tidak-ada')); continue
    isi = open(lokal, 'rb').read()
    b64 = base64.b64encode(isi).decode()
    sha = None
    try:
        d = api(f'contents/{jalan}?ref=main')
        sha = d.get('sha')
        if d.get('content') and base64.b64decode(d['content']) == isi:
            ok.append((jalan, 'SAMA — lewati', len(isi))); continue
    except urllib.error.HTTPError as e:
        if e.code != 404: gagal.append((jalan, f'HEAD {e.code}')); continue
    try:
        r = api('contents/' + jalan, 'PUT', {'message': PESAN, 'content': b64, 'sha': sha, 'branch': 'main'})
        ok.append((jalan, 'TERDORONG', r.get('commit', {}).get('sha', '')[:7]))
    except urllib.error.HTTPError as e:
        # balapan dengan denyut penjaga → sha segar, coba sekali lagi
        try:
            d = api(f'contents/{jalan}?ref=main')
            r = api('contents/' + jalan, 'PUT', {'message': PESAN, 'content': b64, 'sha': d.get('sha'), 'branch': 'main'})
            ok.append((jalan, 'TERDORONG(retry)', r.get('commit', {}).get('sha', '')[:7]))
        except Exception as e2:
            gagal.append((jalan, f'PUT-retry {getattr(e2, "code", "")}: {str(e2)[:100]}'))
    except Exception as e:
        gagal.append((jalan, str(e)[:120]))

for jalan, status, info in ok:
    print(f'OK  {jalan}: {status} ({info})')
for jalan, status in gagal:
    print(f'GAGAL {jalan}: {status}')
sys.exit(1 if gagal else 0)
