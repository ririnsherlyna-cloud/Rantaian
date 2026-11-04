#!/usr/bin/env python3
# DORONG V79 — V279-KORTEX-KESADARAN: mandat pemilik "ciptakan formula sendiri;
# kuasai paham AGI dan kesadaran matang; dengan data yang ada mampu meninjau
# makin terasa".
#   1) runnow            — denyut penuh: LIVE_DECISION_VERSION '9-v279-kortex-kesadaran'
#                          memicu pick hari hidup lahir ulang (evidence.kortex nyata).
#   2) arena.html        — otak v279 tertanam: INDEKS KESADARAN 5 pilar (formula
#                          karangan-sendiri), refleksiHarian, 55 soal × 4 tingkat,
#                          MRIT refleksi, panel IK Pages + chip KORTEX Barisan.
#   3) arena-keadaan.json— cermin segar /api/arena (pick bawa evidence.kortex).
#   4) polling SHA-256   — live == lokal byte-per-byte.
import base64, json, os, sys, urllib.request, urllib.error, datetime, hashlib, time

REPO = 'ririnsherlyna-cloud/Micaprofita-'
BASE = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/'
API_ARENA = os.environ.get('API_ARENA', 'http://localhost:3000/api/arena')

# ---------- 1) runnow: denyut penuh (rebuild v279) ----------
print('runnow: memicu denyut penuh (rebuild KORTEX — bisa 1-3 menit)…')
try:
    req = urllib.request.Request(API_ARENA, data=json.dumps({'action': 'runnow'}).encode(),
                                 method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=290) as r:
        res = json.load(r)
    print('  runnow OK:', res.get('ok'), res.get('message', '')[:80] if isinstance(res.get('message'), str) else res.get('reborn'))
except Exception as e:
    print(f'  runnow GAGAL ({e}) — lanjut dengan snapshot GET (denyut GET ikut menyala)')

# ---------- 2) snapshot segar ----------
snap = None
try:
    with urllib.request.urlopen(API_ARENA, timeout=60) as r:
        snap = json.load(r)
    snap['_eksporAt'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    with open('/home/z/my-project/download/arena-keadaan.json', 'w', encoding='utf-8') as f:
        json.dump(snap, f, ensure_ascii=False, separators=(',', ':'))
    kx = [(p.get('symbol'), (p.get('evidence', {}).get('kortex') or {}).get('skor'))
          for p in snap.get('todayPicks', []) if p.get('competitor') == 'MICAPROFITA']
    print(f"snapshot segar: today={snap.get('today')} | MICAPROFITA (symbol, KORTEX): {kx}")
except Exception as e:
    print(f'peringatan: snapshot gagal ({e}) — hanya berkas statis yang didorong')

FILE = [
    ('arena.html', '/home/z/my-project/download/arena.html'),
]
if snap is not None:
    FILE.append(('arena-keadaan.json', '/home/z/my-project/download/arena-keadaan.json'))

PESAN = ('V279-KORTEX-KESADARAN — mandat pemilik "ciptakan formula sendiri; kuasai paham AGI dan '
         'kesadaran matang": INDEKS KESADARAN 5 pilar (Tahu/Jujur/Disiplin/Pengalaman/Koreksi — '
         'formula karangan-sendiri dari data hidup), refleksiHarian meninjau diri berangka, '
         'KORTEX score pick (C·O·R·T·E·X, keyakinan ±4), panel IK Pages + chip KORTEX Barisan, '
         '55 soal x 4 tingkat (+3 soal IK), MRIT refleksi, doktrin ke-11, badge v279 [skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v79', 'Content-Type': 'application/json'})
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

print('=== DORONG V79 ===')
for j, s in ok:
    print(f'  OK  {j}: {s}')
for j, s in gagal:
    print(f'  GAGAL {j}: {s}')

if gagal:
    sys.exit(1)

# ---------- 3) polling SHA-256 live ----------
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
print('\n=== POLLING SHA-256 LIVE (maks 10 percobaan × 15 s) ===')
lokal = {j: open(p, 'rb').read() for j, p in FILE}
sempurna = True
for percobaan in range(1, 11):
    cocok = 0
    for jalan, isi in lokal.items():
        try:
            with urllib.request.urlopen(BASE + jalan + f'?cb={int(time.time())}', timeout=30) as r:
                live = r.read()
            s_l, s_i = sha_bytes(live), sha_bytes(isi)
            status = 'SAMA' if s_l == s_i else 'BEDA'
            if s_l == s_i: cocok += 1
            print(f'  c{percobaan} {jalan}: {len(live)} B · sha live {s_l[:8]}… vs lokal {s_i[:8]}… → {status}')
        except Exception as e:
            print(f'  c{percobaan} {jalan}: fetch gagal {str(e)[:80]}')
    if cocok == len(lokal):
        sempurna = True
        print('  → LIVE == LOKAL byte-per-byte pada percobaan', percobaan)
        break
    time.sleep(15)

sys.exit(0 if cocok == len(lokal) else 1)
