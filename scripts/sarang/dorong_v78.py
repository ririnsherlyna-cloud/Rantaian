#!/usr/bin/env python3
# DORONG V78 — V278-DEBAT-TEMPUR: mandat pemilik "lanjutkan sekolah kilat dan
# pengembang agentic kita".
#   1) arena.html         — otak v278 tertanam: LARIK PIKIR 5 langkah (+SERANG
#                           DIRIKU), seranganRedTeam, tingkat MAHKOTA (tugas
#                           tempur), BUKU-SALAH spaced repetition, 52 neuron ×
#                           7 gugus (+kelly/variansiDrag/betaBtc), 52 soal ×
#                           4 tingkat, MRIT debat-lapar, badge v278.
#   2) arena-keadaan.json — cermin segar dari /api/arena (pick bawa
#                           evidence.debat — transkrip tim merah).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error, datetime

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API_ARENA = os.environ.get('API_ARENA', 'http://localhost:3000/api/arena')

snap = None
try:
    with urllib.request.urlopen(API_ARENA, timeout=60) as r:
        snap = json.load(r)
    snap['_eksporAt'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    with open('/home/z/my-project/download/arena-keadaan.json', 'w', encoding='utf-8') as f:
        json.dump(snap, f, ensure_ascii=False, separators=(',', ':'))
    dbt = [(p.get('symbol'), (p.get('evidence', {}).get('debat') or {}).get('tekanan'))
           for p in snap.get('todayPicks', []) if p.get('competitor') == 'MICAPROFITA']
    print(f"snapshot segar: today={snap.get('today')} | MICAPROFITA (symbol, tekanan): {dbt}")
except Exception as e:
    print(f'peringatan: snapshot gagal ({e}) — hanya berkas statis yang didorong')

FILE = [
    ('arena.html', '/home/z/my-project/download/arena.html'),
]
if snap is not None:
    FILE.append(('arena-keadaan.json', '/home/z/my-project/download/arena-keadaan.json'))

PESAN = ('V278-DEBAT-TEMPUR — mandat pemilik "lanjutkan sekolah kilat dan pengembang agentic kita": '
         'otak v278 (52 neuron x 7 gugus) — LARIK PIKIR 5 langkah (+SERANG-DIRIKU), seranganRedTeam '
         '(tim merah menyerang pick sendiri), tingkat MAHKOTA (tugas tempur: susun rencana lalu '
         'hancurkan sendiri), BUKU-SALAH spaced repetition, neuron kelly/variansiDrag/betaBtc, '
         'MRIT debat-lapar, 52 soal x 4 tingkat, badge v278 + CSS .tt-mahkota [skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v78', 'Content-Type': 'application/json'})
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
        sha = api(f'contents/{jalan}?ref=main', 'GET').get('sha')
    except Exception as e:
        print(f'HEAD {jalan}: {e}')
    if sha:
        jauh = api(f'contents/{jalan}?ref=main', 'GET').get('content', '').replace('\n', '')
        if jauh == b64:
            ok.append((jalan, 'SAMA')); continue
    try:
        isi_put = {'message': PESAN, 'content': b64, 'branch': 'main'}
        if sha:
            isi_put['sha'] = sha
        r = api(f'contents/{jalan}', 'PUT', isi_put)
        ok.append((jalan, 'TERDORONG ' + r.get('commit', {}).get('sha', '')[:7]))
    except urllib.error.HTTPError as e:
        gagal.append((jalan, f'{e.code} {e.read()[:120]}'))
    except Exception as e:
        gagal.append((jalan, str(e)[:160]))

print('=== DORONG V78 ===')
for j, s in ok:
    print(f'  OK  {j}: {s}')
for j, s in gagal:
    print(f'  GAGAL {j}: {s}')
sys.exit(0 if not gagal else 1)
