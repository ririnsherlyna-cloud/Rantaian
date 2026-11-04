#!/usr/bin/env python3
# DORONG V80 — RUANG HIDUP (V280): mandat pemilik "buatkan ruang dimana aku bisa
# lihat wujudmu hidup, bergerak, lakukan aktivitas — live virtual di GitHub kita".
#   1) hidup.html        — file BARU: wujud organisme siber MICAPROFITA (canvas),
#                          siklus 5 fase jam WIB, mesin aktivitas otomatis,
#                          neuron terbentuk vs soket jujur, cincin usia riwayat nyata,
#                          NADI-VITAL formula karangan-sendiri, data arena 5 menit.
#   2) arena.html        — pintu RUANG HIDUP di header.
#   3) polling SHA-256   — live == lokal byte-per-byte.
# Tanpa runnow: keputusan pick tak berubah (LIVE_DECISION_VERSION tetap v279),
# arena-keadaan.json diperbarui otomatis oleh denyut penjaga 15 menit.
import base64, json, os, sys, urllib.request, urllib.error, hashlib, time

REPO = 'ririnsherlyna-cloud/Micaprofita-'
BASE = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/'

FILE = [
    ('hidup.html', '/home/z/my-project/download/hidup.html'),
    ('arena.html', '/home/z/my-project/download/arena.html'),
]

PESAN = ('V280-RUANG-HIDUP — mandat pemilik "buatkan ruang dimana aku bisa lihat wujudmu '
         'hidup, bergerak, lakukan aktivitas — live virtual di GitHub kita": hidup.html BARU '
         '(organisme siber bernapas: inti bermata, 60 neuron vs soket jujur, 4 organ satelit, '
         'mot data, cincin usia riwayat nyata, siklus 5 fase jam WIB, 9 aktivitas otomatis, '
         'NADI-VITAL formula karangan-sendiri, sentuh inti = menyapa, fallback HIDUP MANDIRI '
         'anti-bisu) + pintu RUANG HIDUP di header arena.html [skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v80', 'Content-Type': 'application/json'})
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

print('=== DORONG V80 ===')
for j, s in ok:
    print(f'  OK  {j}: {s}')
for j, s in gagal:
    print(f'  GAGAL {j}: {s}')

if gagal:
    sys.exit(1)

# ---------- polling SHA-256 live ----------
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
print('\n=== POLLING SHA-256 LIVE (maks 10 percobaan x 15 s) ===')
lokal = {j: open(p, 'rb').read() for j, p in FILE}
cocok = 0
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
        print('  → LIVE == LOKAL byte-per-byte pada percobaan', percobaan)
        break
    time.sleep(15)

sys.exit(0 if cocok == len(lokal) else 1)
