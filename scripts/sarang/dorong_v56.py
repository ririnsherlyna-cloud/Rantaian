#!/usr/bin/env python3
# DORONG V56 — V266-BAROMETER v6.3 (sekolah kilat putaran-2).
# 4 berkas: penjaga.mjs v6.3, orkestra.mjs (env PENJAGA_PATH),
#           laporan/sekolah-putaran2.json (baru), laporan/LAPORAN-UJIAN-BUTA-100.md (+seksi).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
BASE = '/home/z/my-project/micaprofita'
FILE = [
    ('scripts/penjaga.mjs', f'{BASE}/scripts/penjaga.mjs'),
    ('scripts/ujian-buta/orkestra.mjs', f'{BASE}/scripts/ujian-buta/orkestra.mjs'),
    ('laporan/sekolah-putaran2.json', f'{BASE}/laporan/sekolah-putaran2.json'),
    ('laporan/LAPORAN-UJIAN-BUTA-100.md', f'{BASE}/laporan/LAPORAN-UJIAN-BUTA-100.md'),
]
PESAN = 'V266-BAROMETER v6.3 — sekolah kilat putaran-2: OOS 120 soal + bedah makro 2366 soal → SELL-bear = pendarah (−339%, n=397) → 5 organ barometer mengikat saat kunci; dunia bear-sejati: net −40.5% → +15.4% [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v56', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V56 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
