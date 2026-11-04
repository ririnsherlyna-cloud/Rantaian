#!/usr/bin/env python3
# DORONG V67 — V277-JUAL-AMBISIUS: mandat pemilik "harga ambisiusnya juga wajib ada".
#   1) arena.html           — rung JUAL AMBISIUS (perkiraan tertinggi + % + P sentuh)
#                             WAJIB tampil di Barisan Pages & panel rencana NADIR.
#   2) arena-keadaan.json   — cermin segar dari /api/arena server (bawa highAmbisius).
#   3) scripts/penjaga.mjs  — highAmbisius TIDAK PERNAH lagi di-null-kan (PHOENIX:
#                             swing tak melewati sasaran → sasaran dilanjutkan 50%
#                             jaraknya, hormat cap rezim; ARAH: ambisius dari sasaran
#                             MC ×0.5-dist; semua bawa ketAmbisius jujur).
#   4) laporan/index.html   — baris 'jual ambisius' WAJIB di setiap kartu sasaran;
#                             yang belum terukur tampil '—' + alasan (anti-bisu).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API_ARENA = os.environ.get('API_ARENA', 'http://localhost:3000/api/arena')

snap = None
try:
    with urllib.request.urlopen(API_ARENA, timeout=60) as r:
        snap = json.load(r)
    snap['_eksporAt'] = __import__('datetime').datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    with open('/home/z/my-project/download/arena-keadaan.json', 'w', encoding='utf-8') as f:
        json.dump(snap, f, ensure_ascii=False, separators=(',', ':'))
    amb = [p.get('evidence', {}).get('rencana', {}).get('highAmbisius')
           for p in snap.get('todayPicks', []) if p.get('evidence', {}).get('rencana')]
    print(f"snapshot segar: today={snap.get('today')} | rencana bawa highAmbisius: {amb}")
except Exception as e:
    print(f'peringatan: snapshot gagal ({e}) — hanya berkas statis yang didorong')

FILE = [
    ('arena.html', '/home/z/my-project/download/arena.html'),
    ('scripts/penjaga.mjs', '/home/z/my-project/micaprofita/scripts/penjaga.mjs'),
    ('laporan/index.html', '/home/z/my-project/micaprofita/laporan/index.html'),
]
if snap is not None:
    FILE.append(('arena-keadaan.json', '/home/z/my-project/download/arena-keadaan.json'))

PESAN = 'V277-JUAL-AMBISIUS — mandat pemilik "harga ambisiusnya juga wajib ada": (1) arena.html Pages — rung JUAL AMBISIUS (perkiraan tertinggi, % dan P sentuh) kini WAJIB tampil di Barisan dan panel rencana NADIR, setara arena AGI di server; (2) penjaga.mjs — highAmbisius tak pernah lagi dihilangkan diam-diam: PHOENIX swing tak melewati sasaran → sasaran dilanjutkan 50% jaraknya (hormat cap rezim), ARAH pun kini bawa harga ambisius, semua menyegel ketAmbisius jujur; (3) dasbor laporan — baris "jual ambisius" hadir di SETIAP kartu sasaran, yang belum terukur tampil "—" + alasan (anti-bisu); (4) arena server — LevelRingkas & TanggaHarga memakai label "Jual ambisius" [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v67', 'Content-Type': 'application/json'})
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
