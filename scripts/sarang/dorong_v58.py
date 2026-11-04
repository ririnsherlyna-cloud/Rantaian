#!/usr/bin/env python3
# DORONG V58 — V268-SADAR v6.5 (SEKOLAH AGI + sekolah kilat putaran-4).
# Berkas: penjaga.mjs v6.5 (ujian pemahaman 5 fakultas + kurikulum adaptif),
#         laporan/sekolah-putaran4.json (bukti bedah putaran-4),
#         laporan/LAPORAN-UJIAN-BUTA-100.md (+ seksi putaran-4 & sekolah-agi).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
BASE = '/home/z/my-project/micaprofita'
FILE = [
    ('scripts/penjaga.mjs', f'{BASE}/scripts/penjaga.mjs'),
    ('laporan/sekolah-putaran4.json', f'{BASE}/laporan/sekolah-putaran4.json'),
    ('laporan/LAPORAN-UJIAN-BUTA-100.md', f'{BASE}/laporan/LAPORAN-UJIAN-BUTA-100.md'),
]
PESAN = 'V268-SADAR v6.5 — SEKOLAH AGI: cyborg diuji pemahamannya tiap denyut lewat 5 fakultas (sadar-diri/penalaran/metakognisi/dunia/ajaran), jawaban dibangun dari keadaan hidup & dinilai kunci dihitung-ulang dua jalur, kurikulum adaptif menyorot fakultas terlemah, transkrip publik laporan/sekolah-agi.json; sekolah kilat putaran-4: semua panen digrade ulang dgn lilin pasca-T penuh 24 jam + dunia beku segar 10-02T18→10-03T02, bedah matriks penuh verifikasi-ulang 10 organ + kandidat baru kriteria ketat [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v58', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V58 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
