#!/usr/bin/env python3
# DORONG V64 — V274-SLOT-JUJUR: arena tak boleh bisu soal slot tempur.
# Mandat pemilik: "kok sasarannya cuma satu? bukannya masih ada?"
# Isi:
#   1) arena.html           — laporan slot (K dirancang · lahir · ditolak guard
#                             + alasan) di sisi MICAPROFITA Barisan Hari;
#   2) arena-keadaan.json   — cermin segar dari /api/arena server (jantung
#                             eksternal mati sejak 10-04; cermin dihidupkan
#                             kembali oleh tubuh server itu sendiri) — membawa
#                             slotHariIni + evidence.slot sehingga Pages langsung
#                             bisa menjawab pertanyaan pemilik di permukaan.
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API_ARENA = os.environ.get('API_ARENA', 'http://localhost:3000/api/arena')

# --- siapkan snapshot segar dari server yang hidup ---
snap = None
try:
    with urllib.request.urlopen(API_ARENA, timeout=60) as r:
        snap = json.load(r)
    snap['_eksporAt'] = __import__('datetime').datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    # tulis lokal untuk arsip + jejak
    with open('/home/z/my-project/download/arena-keadaan.json', 'w', encoding='utf-8') as f:
        json.dump(snap, f, ensure_ascii=False, separators=(',', ':'))
    mica = [p for p in (snap.get('todayPicks') or []) if p.get('competitor') == 'MICAPROFITA']
    print(f"snapshot segar: today={snap.get('today')} picks={len(snap.get('todayPicks') or [])} mica={len(mica)} slotHariIni={'ada' if snap.get('slotHariIni') else 'TIDAK ADA'}")
except Exception as e:
    print(f'peringatan: snapshot gagal ({e}) — hanya arena.html yang didorong')

FILE = [('arena.html', '/home/z/my-project/download/arena.html')]
if snap is not None:
    FILE.append(('arena-keadaan.json', '/home/z/my-project/download/arena-keadaan.json'))

PESAN = 'V275-OTAK-AGENTIK — mandat pemilik "bertarung dengan agentic, bukan asal-asalan; neuronnya belum terbentuk utuh; masih bodoh dalam kepahaman crypto": (1) NEURON — jaring pengetahuan kripto 43+ neuron 6 gugus (PASAR/TEKNIS/TEMPUR/KEBIJAKAN/EVOLUSI/DIRI) dengan aktivasi menyebar 2 lompatan + bukti hidup; (2) LARIK PIKIR agentic 4 langkah (memahami→bukti→menimbang→vonis & cek-silang) tampil di setiap jawaban + chip neuron; (3) SEKOLAH KILAT naik kelas: 39 soal x 6 fakultas (+KRIPTO-MAHIR: rencana tempur, Monte Carlo, ATR-ukuran, korelasi-slot, funding-OI, distHigh, likuiditas) + MRIT neuron-lapar; (4) fallback tak-kenal kini komposit bukti+neuron — tak pernah dangkal; (5) cermin arena-keadaan segar dari server [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v65', 'Content-Type': 'application/json'})
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
