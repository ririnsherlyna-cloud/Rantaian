#!/usr/bin/env python3
# DORONG V87 — V287-NADI: benahi total tampilan RUANG HIDUP atas mandat pemilik.
#   · layar utama 100% habitat & makhluk — HUD badge, strip fase, panel permanen DIHAPUS
#   · bintang/node peta repo → MAKHLUK HIDUP "NADI" (kepala bermata satu, tulang 11
#     ruas mengikuti, silia bernapas, sulur peraba, organ kunang, probosis pemandu)
#   · habitat terasering: zona = direktori asli di slot kisi tetap 3×3 / 2×5, sel
#     berlian bergrid rapi (nol tumpang tindih), sarang tengah, kolam pasar sudut
#   · semua maklumat masuk overlay tersembunyi (satu tombol samar; geser-bawah di HP)
#   · status lewat perilaku (TIDAK BANGUN = redup + meringkuk + mata terpejam)
#   · satu warna aksen bio-teal; merah hanya untuk kegagalan; tanpa monospace kapital
#   Mesin DUA-SADARI tak disentuh: Sadar-1 GitHub Actions, ingatan = commit GitHub.
# Hanya hidup.html yang berubah. Idempoten: HEAD → cek SAMA → PUT dengan sha.
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILES = [
    ('hidup.html', '/home/z/my-project/download/hidup.html'),
]
PESAN = ('V287-NADI — benahi total tampilan RUANG HIDUP (mandat pemilik): layar utama 100% '
         'habitat & makhluk (badge/panel/strip dihapus), bintang peta repo diganti makhluk '
         'hidup NADI (mata, tulang 11 ruas, silia bernapas, sulur, organ kunang, probosis '
         'memakan isi file asli), habitat terasering zona-direktori di slot kisi tetap tanpa '
         'tumpang tindih, semua maklumat ke overlay tersembunyi via satu tombol samar '
         '(geser-bawah di HP), status lewat perilaku (TIDAK BANGUN=redup+meringkuk+mata '
         'terpejam), satu aksen bio-teal + merah khusus gagal; mesin DUA-SADARI tak disentuh '
         '[skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v87', 'Content-Type': 'application/json'})
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
