#!/usr/bin/env python3
# DORONG V66 — V276-MESIN-CUAN: arena tumbuh jadi mesin yang MENGHITUNG uangnya.
# Mandat pemilik: "belum berkembang sebagai mesin cuan profit pasti, masih
# banyak keteledoran" — jawabannya bukan janji, tapi BUKU BESAR:
#   1) arena.html           — panel BUKU CUAN (hasil nyata rencana pra-registrasi:
#                             sasaran/stop/kedaluwarsa, after-fee 0.4% · net kumulatif
#                             majemuk · win rate · ekspektansi R · maxDD · keteledoran
#                             per rezim · DISIPLIN CUAN) + otak v276 (gugus neuron CUAN,
#                             TOPIK.cuan "profit pasti" dibantah matematika,
#                             fakultas CUAN 7 soal, MRIT keteledoran) — 49 neuron, 7 gugus.
#   2) arena-keadaan.json   — cermin segar dari /api/arena server (membawa bukuCuan).
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
    bc = snap.get('bukuCuan') or {}
    m = bc.get('metrik') or {}
    print(f"snapshot segar: today={snap.get('today')} bukuCuan={m.get('totalPlan')} rencana · net {m.get('netKumulatifPct')}% · WR {m.get('winRate')} · disiplin={'aktif' if m.get('disiplinAktif') else '-'}")
except Exception as e:
    print(f'peringatan: snapshot gagal ({e}) — hanya arena.html yang didorong')

FILE = [('arena.html', '/home/z/my-project/download/arena.html')]
if snap is not None:
    FILE.append(('arena-keadaan.json', '/home/z/my-project/download/arena-keadaan.json'))

PESAN = 'V276-MESIN-CUAN — mandat pemilik "belum berkembang sebagai mesin cuan profit pasti, masih banyak keteledoran": (1) BUKU BESAR — setiap rencana pra-registrasi kini DINILAI NYATA candle hari-D after-fee 0.4% (sasaran/stop/kedaluwarsa; dua-duanya kena = stop dulu, konservatif jujur); (2) panel BUKU CUAN di server & Pages: net kumulatif majemuk, win rate, ekspektansi %/R, max drawdown, entri terakhir, keteledoran per rezim, DISIPLIN CUAN otomatis (ekspektansi negatif → keyakinan −5); (3) otak v276: gugus neuron CUAN (ekspektansi, R-multiple, break-even WR, drawdown, buku cuan, disiplin — 49 neuron · 7 gugus), TOPIK.cuan membantah "profit pasti" dengan matematika + angka buku hidup, fakultas CUAN 7 soal (46 soal × 7 fakultas), MRIT keteledoran-cuan; (4) hukum kejujuran: profit pasti tak ada — yang dijaga ekspektansi & keteledoran yang dihitung turun [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v66', 'Content-Type': 'application/json'})
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
