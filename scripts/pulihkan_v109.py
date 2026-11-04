#!/usr/bin/env python3
# PULIHKAN-V109 — pulihkan balas_telegram.py v10.9 ke disk lokal + tanam ke
# benteng/balas_telegram.py (cangkang) supaya SEMUA jalur pemulihan
# (scripts/ milik PENJAGA-WD, benteng/ milik RESPON-CEPAT) menyaji v10.9.
# Konteks: disk lokal rollback (doktrin restore_tubuh: "disk = serda kerja,
# benteng = sumber kebenaran") — v10.9 (409-TERBUKA + PELURU-BUTA) hilang
# dari disk, selamat di cangkang scripts/ (commit af75510).
import base64, hashlib, json, sys, urllib.request

REPO = 'ririnsherlyna-cloud/Rantaian'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = open('/home/z/my-project/.token-rantaian').read().strip()
LOKAL = '/home/z/my-project/scripts/balas_telegram.py'

def api(jalan, metode='GET', isi=None):
    req = urllib.request.Request(API + jalan, method=metode)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    data = json.dumps(isi).encode() if isi is not None else None
    if data:
        req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, data) as r:
        return json.loads(r.read() or b'{}')

def sha(b):
    return hashlib.sha256(b).hexdigest()

# 1) sumber kebenaran: cangkang scripts/balas_telegram.py (v10.9 terverifikasi)
buf = urllib.request.urlopen(
    f'https://raw.githubusercontent.com/{REPO}/main/scripts/balas_telegram.py',
    timeout=25).read()
assert b'reconfigure(line_buffering' in buf and b'409-TERBUKA' in buf, 'cangkang bukan v10.9!'
print('SUMBER cangkang scripts/:', len(buf), 'B sha', sha(buf)[:12])

# 2) pulihkan disk lokal
lokal_lama = open(LOKAL, 'rb').read()
if lokal_lama == buf:
    print('DISK: sudah v10.9')
else:
    open(LOKAL, 'wb').write(buf)
    print('DISK: DIPULIHKAN v10.9 (lama sha', sha(lokal_lama)[:12], ')')

# 3) tanam ke benteng/ (jalur pemulihan RESPON-CEPAT)
try:
    d = api('/contents/benteng/balas_telegram.py?ref=main')
    sha_benteng = d.get('sha')
    sama = base64.b64decode(d.get('content', '')) == buf
except Exception:
    sha_benteng, sama = None, False
if sama:
    print('BENTENG: sudah v10.9')
else:
    r = api('/contents/benteng/balas_telegram.py', 'PUT', {
        'message': ('v10.9 PELURU-BUTA + 409-TERBUKA (sinkron dari scripts/ af75510) — '
                    'jalur pemulihan RESPON wajib menyaji versi terbaru; disk lokal rollback '
                    'telah membuktikan jalur lama membawa kode basi'),
        'content': base64.b64encode(buf).decode(), 'sha': sha_benteng, 'branch': 'main'})
    print('BENTENG: TERDORONG commit', r.get('commit', {}).get('sha', '')[:7])

# 4) verifikasi akhir kedua jalur
ok = True
for jalur in ('scripts/balas_telegram.py', 'benteng/balas_telegram.py'):
    h = sha(urllib.request.urlopen(
        f'https://raw.githubusercontent.com/{REPO}/main/{jalur}', timeout=25).read())
    cocok = (h == sha(buf))
    ok = ok and cocok
    print(f'VERIF {jalur}: {h[:12]} ->', 'SAH' if cocok else 'TIDAK COCOK!')
sys.exit(0 if ok else 2)
