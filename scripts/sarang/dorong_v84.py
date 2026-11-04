#!/usr/bin/env python3
# DORONG V84 — RUANG HIDUP V284-PROTOLIFE.
# Rebuke pemilik (ekstrem): "bukan simulasi murahan, bukan scaffolding scripted,
# bukan 'didorong menemukan' — saya tahu von Neumann, Tierra, Avida — buat yang NYATA".
# Jawaban: mesin virtual 16-opcode sungguhan + ekologi energi + mutasi/karat nyata
# + pencarian (mu+lambda) nyata — TIDAK ADA penemuan yang dijadwalkan; kemampuan
# hanya dicatat SETELAH genom lulus seluruh vektor uji pada VM yang sama dengan dunia.
# Idempoten: HEAD -> banding byte -> PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('hidup.html', '/home/z/my-project/download/hidup.html')]

PESAN = ('V284-PROTOLIFE — jawaban untuk tuntutan kehidupan sungguhan: ekosistem mesin '
         'virtual yang benar-benar dieksekusi, bukan teater. (1) VM 16-opcode nyata '
         '(LOAD/STORE/ADD/AND/OR/XOR/NAND/SUB/LDI/MOVx/JMPZ/EAT/DIVIDE) dengan halt-di-ujung '
         'untuk verifikasi deterministik; (2) ekologi energi nyata: makanan tumbuh-luruh, '
         'kemotaksis, makan, pembelahan bermutasi, kematian menyuburkan, abiogenesis saat '
         'dunia kosong; (3) karat bit nyata tiap 90 denyut + perbaikan diri berbiaya + '
         'stasiun perbaiki yang benar-benar bekerja; (4) PIKIRAN = pencarian mu+lambda '
         'sungguhan atas rantai target T0-T9 (BIT-1, NOT, AND, OR, XOR, XOR-DARI-NAND '
         'mode-NAND-saja, penjumlah-paruh, akumulator, salin-memori, tautan-pasar) — tanpa '
         'formula peluang, tanpa jadwal: kemampuan hanya dicatat SETELAH genom lulus seluruh '
         'vektor uji; (5) warisan genom antar target = fondasi nyata target berikutnya; '
         '(6) injeksi genom terverifikasi ke ekologi = pengetahuan hidup di dunia; (7) byte '
         'pasar nyata dari todayPicks.confidence arena-keadaan.json menjadi bahan uji '
         'TAUTAN-PASAR; (8) visual: dunia fit-penuh tanpa potong/zoom, teks overlay DOM '
         'terpisah, wujud = peta genom makhluk terdepan yang sedang berjalan, bekas karat = '
         'titik merah nyata; (9) persistensi penuh + mengejar denyut saat penonton pergi '
         '[skip ci]')

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    for jalan in ('/home/z/.gh_token', os.path.expanduser('~/.gh_token')):
        if os.path.exists(jalan):
            TOK = open(jalan).read().strip()
            if TOK: break
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v84', 'Content-Type': 'application/json'})
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
