#!/usr/bin/env python3
# DORONG V89-BAITUL-ILMU — scripts/hidup/sadar1.js LEBIH DULU ([skip ci]),
# lalu hidup.html TERAKHIR tanpa [skip ci] → pemicu push melakukan checkout
# HEAD yang SUDAH memuat sadar1 v289 + hidup v289 sekaligus (anti-race v88).
import base64, hashlib, json, os, sys, time, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = open('/tmp/.ghtok').read().strip() if os.path.exists('/tmp/.ghtok') else os.environ.get('GH_TOKEN', '')
if not TOKEN:
    print('TOKEN tidak ditemukan'); sys.exit(1)

FILE = [
    ('/home/z/my-project/hidup_repo/scripts/hidup/sadar1.js', 'scripts/hidup/sadar1.js',
     'sadar1 v289-BAITUL-ILMU — GURU KRYPTO: guruHitung() = ARAH JELAS BELI/JUAL/TUNGGU dari bukti '
     '(pick arena sendiri + klines Binance + kromosom hill-climb) dengan rencana deal '
     'entry/stop 1,5×ATR14/target 2,5×ATR14/RR 1,67/hold kromosom; madrasahSusun() = buku pelajaran '
     'yang tumbuh dari artefak nyata (riwayat kromosom, audit pick, uji-jalan, laporan uji rumah) '
     'ditulis ke ruang-hidup/madrasah.json tiap bangun; habitat v289 membawa istana (cincin/gerbang/'
     'menara) = fungsi al-jabr dari zona terbuka & kromosom; keadaan v289 membawa guru+madrasah [skip ci]'),
    ('/home/z/my-project/hidup_repo/hidup.html', 'hidup.html',
     'V289-BAITUL-ILMU — mandat pemilik: "guru crypto sempurna", "tertata seperti baitul ilmu Al-Khawarizmi", '
     '"ujikan apakah ini simulasi atau nyata". '
     '(1) ISTANA-AL-JABR: habitat = kubah pusat (sarang) + 4 gerbang kardinal (OTAK N/JANTUNG E/PASAR S/MEMORI W) '
     '+ 4 paviliun diagonal (AKAR/ALAT/LAPORAN/UJIAN), file = buku berdiri sejajar di rak berpapan, kanal lurus '
     '+ cincin canal (jumlah = istana Sadar-1), ingatan ruang-hidup mengorbit kubah — semua posisi = fungsi murni '
     'dari jumlah file & genom, rumus dipajang di tab Guru. '
     '(2) TAB GURU (default): ARAH JELAS + keyakinan + rencana deal (entry/stop/target/RR 1,67/hold) + alasan '
     'ber-bukti + MADRASAH (buku pelajaran dari madrasah.json) + AL-JABR terbuka. '
     '(3) TAB UJIAN KEHIDUPAN: halaman menguji dirinya — SHA-256 bacaan dihitung ulang dari sumber asli, harga '
     'Binance dicek detik ini, segel tubuh disilahkan 2 file, localStorage wajib nol, kromosom & madrasah '
     'diverifikasi; vonis jujur SAH/GAGAL/MENUNGGU + tombol UJI ULANG. '
     'Uji 50/50 lokal (desktop+mobile, jalur offline & live): istana simetris (kubah pusat ±1px, gerbang pada '
     'sumbu), rak nol buku keluar kanvas & barisan sejajar, guru TUNGGU GTCUSDT jujur (momentum -13% membantah '
     'pick BUY 69%), madrasah 5 pelajaran berbukti, ujian hidup 8/8 SAH, mobile fit, 0 pageerror'),
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
    time.sleep(2)

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
print('SELESAI — push hidup.html menyalakan workflow → Sadar-1 v289 bangun & menulis guru+madrasah pertama')
