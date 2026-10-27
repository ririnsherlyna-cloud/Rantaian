#!/usr/bin/env python3
# DORONG V57 — V267-ANTI-ARUS v6.4 (sekolah kilat putaran-3).
# 4 berkas: penjaga.mjs v6.4 (2 organ anti-arus + ret1h barometer),
#           .github/workflows/sakti-denyut.yml (cron 7/15 anti-skip),
#           laporan/sekolah-putaran3.json (baru), laporan/LAPORAN-UJIAN-BUTA-100.md (+seksi putaran-3).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
BASE = '/home/z/my-project/micaprofita'
FILE = [
    ('scripts/penjaga.mjs', f'{BASE}/scripts/penjaga.mjs'),
    ('.github/workflows/sakti-denyut.yml', f'{BASE}/.github/workflows/sakti-denyut.yml'),
    ('laporan/sekolah-putaran3.json', f'{BASE}/laporan/sekolah-putaran3.json'),
    ('laporan/LAPORAN-UJIAN-BUTA-100.md', f'{BASE}/laporan/LAPORAN-UJIAN-BUTA-100.md'),
]
PESAN = 'V267-ANTI-ARUS v6.4 — sekolah kilat putaran-3: saksi pantulan TERBALIK (BUY saat bear + ret1h>=0 = jebakan -23.4% n=77 vs tanpa saksi +103.5% n=64) + jatuh-pisau -2.5% batas tajam → 2 organ anti-arus (key -8, ukuran x0.6, anti-karantina); divergensi-reversal tetap diakui buta prinsipil (draf-2 dibuang, anti-overfit); cron denyut diperbaiki 7/15 menit non-bulat; registri 301→307 [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v57', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V57 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
