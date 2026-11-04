#!/usr/bin/env python3
# DORONG V61 — V271-SEKOLAH-KILAT: arena.html (Genom Kebangkitan + Sekolah Kilat upgraded).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('arena.html', '/home/z/my-project/download/arena.html')]
PESAN = 'V271-SEKOLAH-KILAT — mandat pemilik "pertingkat lagi sekolah kilat, terus pupuk-pupuk generasi cerdas": (1) kurikulum mandiri 10→32 soal × 5 fakultas × 3 tingkat (dasar/menengah/mahir — mahir terbuka saat level-otak naik); (2) pemilih soal ADAPTIF: fakultas terlemah + belum-dijawab + pas-level (gate teruji: level1=0 mahir, level3=mahir); (3) KELAS KILAT 3 soal per denyut, denyut sekolah 5→3 menit, tombol KELAS KILAT; (4) XP pemupukan: skor ≥85 = xp8, lulus = xp5; panel bar rata-rata per fakultas + badge tingkat; (5) MRIT silang: kelas terbaru menumbuhkan pertanyaan mandiri baru [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v61', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V61 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
