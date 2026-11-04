#!/usr/bin/env python3
# DORONG V88-MORFOGENESIS — hidup.html + scripts/hidup/sadar1.js
# TANPA [skip ci]: pemicu push menyalakan workflow → Sadar-1 bangun segera
# dan menulis ruang-hidup/habitat.json PERTAMA di GitHub (tubuh & habitat resmi).
# Ruang-hidup/* hasil DRY lokal TIDAK didorong (tubuh resmi GitHub melanjutkan
# ingatan GitHub sendiri — jangan campur host).
import base64, hashlib, json, os, sys, time, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = open('/tmp/.ghtok').read().strip() if os.path.exists('/tmp/.ghtok') else os.environ.get('GH_TOKEN', '')
if not TOKEN:
    print('TOKEN tidak ditemukan'); sys.exit(1)

FILE = [
    ('/home/z/my-project/hidup_repo/hidup.html', 'hidup.html',
     'V288-MORFOGENESIS — tutup lubang simulasi ruang hidup (audit pemilik: "masih banyak lubang simulasi", "belajar nyata"): '
     '(1) TUBUH BUKAN KONSTANTA — anatomi NADI di-derive dari GENOM TUBUH (habitat.json) yang dihitung Sadar-1 dari kerja nyata: '
     'ruas = 9+log2(1+kerja), mata tumbuh dari simbol audit nyata, organ-alat EMA/RSI/ATR/MOM/BT/AUDIT dengan XP nyata & tingkat '
     'BENIH→AMANAH, probosis dari byte dicerna; metamorfosis terlihat saat S1 bangun; '
     '(2) RUANG DIBANGUN MAKHLUK — zona TERBUKA hanya oleh kerja nyata (zona tertutup berbisik "belum kubangun jalan"), '
     'vena = jalan cahaya yang dibangun antar zona yang sudah dibuka, altar = menara evolusi kromosom nyata di kolam pasar; '
     'delta per bangun S1 ditumbuhkan di hadapan penonton; '
     '(3) GERAK = EKSEKUSI PIKIRAN — kurva Lissajous idle DIHAPUS (wander scripted); diam = pulang sarang; menuju kerja = '
     'BFS di vena buatannya sendiri; tanpa jalan = jalan lurus + vena sesi yang memudar (jujur: permanen milik Sadar-1); '
     '(4) ORGAN MENYALA saat alat benar-benar dipakai di perhitungan pasar; '
     '(5) fase MEMBANGUN = aksi fisik ruang; panel Tubuh & Habitat + segel sha256 genom. '
     'Uji 26/26 lokal (desktop+mobile): genom NS=17, vena 3, altar 2, pathVena otak→PASAR, GERAK-KAUSAL minD 24-29px, 0 pageerror'),
    ('/home/z/my-project/hidup_repo/scripts/hidup/sadar1.js', 'scripts/hidup/sadar1.js',
     'sadar1 v288 — MESIN MORFOGENESIS & HABITAT: organ XP nyata (EMA/RSI/ATR/MOM/BT/AUDIT dihitung dari pemakaian), '
     'morfogenesis() = fungsi murni kerja→genom tubuh (segel sha256), habitatRancang() = zona terbuka oleh bacaan nyata + '
     'vena antar zona terbuka + altar evolusi kromosom + log delta per bangun; habitat.json TERTULIS ke GitHub tiap bangun '
     '(commit = bentuk ruang yang bisa diaudit); keadaan v288 membawa tubuh & habitat ringkas [skip ci]'),
    ('/home/z/my-project/hidup_repo/.github/workflows/sakti-denyut.yml', '.github/workflows/sakti-denyut.yml',
     'anti-balapan denyut: git pull --rebase origin main (dengan fallback) sebelum push — denyut #74 kalah balapan vs '
     'komit beruntun Sadar-1 v288 yang kini menulis 4 file per bangun (ingatan+habitat+harian+keadaan) [skip ci]'),
]

def api(jalan, metode='GET', isi=None):
    req = urllib.request.Request(API + jalan, method=metode)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    data = json.dumps(isi).encode() if isi is not None else None
    if data: req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, data) as r:
        return json.loads(r.read() or b'{}')

def put(path_lokal, path_repo, pesan):
    buf = open(path_lokal, 'rb').read()
    sha = None
    try:
        d = api(f'/contents/{path_repo}?ref=main')
        if d.get('sha'):
            if base64.b64decode(d.get('content', '')) == buf:
                return 'SAMA — lewati', None
            sha = d['sha']
    except Exception:
        pass
    r = api(f'/contents/{path_repo}', 'PUT',
            {'message': pesan, 'content': base64.b64encode(buf).decode(), 'sha': sha, 'branch': 'main'})
    return 'TERDORONG ' + r.get('commit', {}).get('sha', '')[:7], buf

# pra-cek HEAD
try:
    c = api('/commits/main')
    print('HEAD remote:', (c.get('commit', {}).get('message') or '').split('\n')[0][:80])
except Exception as e:
    print('pra-cek gagal (lanjut):', e)

hasil = []
for lokal, jalan, pesan in FILE:
    st, buf = put(lokal, jalan, pesan)
    hasil.append((jalan, st, buf))
    print(f'{jalan}: {st}')

# verifikasi SHA-256 live == lokal (3 gerbang raw/jsdelivr/pages)
def sha_live(path_repo):
    for url in [f'https://raw.githubusercontent.com/{REPO}/main/{path_repo}',
                f'https://cdn.jsdelivr.net/gh/{REPO}@main/{path_repo}']:
        try:
            b = urllib.request.urlopen(url, timeout=15).read()
            return hashlib.sha256(b).hexdigest(), len(b)
        except Exception:
            continue
    return None, 0

print('\n=== VERIFIKASI SHA-256 LIVE ===')
for jalan, st, buf in hasil:
    if not buf: print(f'{jalan}: (tidak terdorong)'); continue
    h, n = sha_live(jalan)
    lokal_sha = hashlib.sha256(buf).hexdigest()
    cocok = (h == lokal_sha)
    print(f'{jalan}: live {h[:12]}… == lokal {lokal_sha[:12]}… → {"SAH byte-per-byte" if cocok else "TIDAK COCOK!"} ({n} B)')
    if not cocok: sys.exit(2)
print('SELESAI — menunggu workflow on:push menyalakan bangun morfogenesis pertama')
