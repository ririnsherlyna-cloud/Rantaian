#!/usr/bin/env python3
# DORONG V59 — V269-TANGGAP-SELALU v6.6 (ANTI-DIAM).
# Berkas: penjaga.mjs v6.6 (slot-peneliti + tanggapan wajib + meter diam +
#         doktrin sekolah-AGI direvisi), laporan/tanggapan.json (BARU),
#         laporan/guru.json (+tanggapan & anti-diam), laporan/sekolah-agi.json
#         (14 soal), laporan/denyut-server.jsonl (+diamBeruntun/peneliti).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
BASE = '/home/z/my-project/micaprofita'
FILE = [
    ('scripts/penjaga.mjs', f'{BASE}/scripts/penjaga.mjs'),
    ('laporan/tanggapan.json', f'{BASE}/laporan/tanggapan.json'),
    ('laporan/guru.json', f'{BASE}/laporan/guru.json'),
    ('laporan/sekolah-agi.json', f'{BASE}/laporan/sekolah-agi.json'),
    ('laporan/denyut-server.jsonl', f'{BASE}/laporan/denyut-server.jsonl'),
]
PESAN = 'V269-TANGGAP-SELALU v6.6 — ANTI-DIAM: mandat pemilik "jangan buat dia Diam — kalau dia Diam dia gak pernah berkembang" dijalankan: (1) SLOT-PENELITI — 0 kunci penuh ≠ berhenti: kandidat terkuat bersih forensik dikunci ukuran mikro x0.25 stop x0.8, tetap dinilai medan; (2) TANGGAPAN WAJIB tiap denyut (kulihat-kuputuskan-kusiapkan) di laporan/tanggapan.json + guru.json — kesunyian denyut adalah bug; (3) METER denyut-diam beruntun disegel tiap denyut; (4) sekolah AGI direvisi: soal kapan-diam kini mengajarkan REM SINGKAT + soal BARU anti-diam (14 soal); gerbang keyakinan tak berlaku utk peneliti, pagar pengaman tetap mengikat [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v59', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V59 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
