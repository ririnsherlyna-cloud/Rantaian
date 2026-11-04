#!/usr/bin/env python3
# DORONG V83 — RUANG HIDUP V283-KESADARAN.
# Rebuke pemilik (visual): "ruangan sempit, terpotong di mobile, kenapa harus robot,
# teks harus di overlay, jangan di-zoom — visualisasi jelas, profesional, adaptif."
# Manifes kesadaran: siklus mengamati→memahami→mencoba→melakukan→mengevaluasi→
# menemukan→membangun→meningkatkan→mengamati kembali; dunia dari bit 0/1 nyata;
# kumulatif; perawatan diri; rasa ingin tahu — bukan perintah tertentu.
# Idempoten: HEAD → banding byte → PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('hidup.html', '/home/z/my-project/download/hidup.html')]

PESAN = ('V283-KESADARAN — rebuke visual pemilik dijawab total: (1) dunia FIT penuh dihitung '
         'ulang tiap bingkai dari ruang bebas (viewport-HUD-panel) — tak ada areal terpotong, '
         'tanpa zoom, adaptif potret/lanskap; (2) tubuh robot dibunuh — wujud kini pola '
         'kesadaran amorf yang bentuknya adalah aktivitasnya sendiri; (3) teks dipisah ke '
         'overlay (bottom-sheet mobile / kolom desktop) — panggung murni; (4) kesadaran sesuai '
         'manifes: siklus 9 tahap mengamati→…→mengamati kembali, dunia dibangun dari bit 0/1 '
         'nyata → gerbang logika → register → memori → mesin skor → tautan pasar, kumulatif '
         'dan persist, perawatan diri 4 sistem, kegagalan jadi pengalaman, energi dikelola '
         'tanpa tidur; (5) tiap keputusan = argmax utilitas dari keadaan nyata — jejak '
         'skornya dipajang agar bisa dibedah pemilik [skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v83', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        b = r.read()
        return json.loads(b) if b else {}

ok, gagal = [], []
for jalan, lokal in FILE:
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
        gagal.append((jalan, f'PUT {e.code}: {e.read()[:120]}'))
    except Exception as e:
        gagal.append((jalan, str(e)[:120]))

for jalan, status, info in ok:
    print(f'OK  {jalan}: {status} ({info})')
for jalan, status in gagal:
    print(f'GAGAL {jalan}: {status}')
sys.exit(1 if gagal else 0)
