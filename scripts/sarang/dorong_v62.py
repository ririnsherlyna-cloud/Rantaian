#!/usr/bin/env python3
# DORONG V62 — V272-METABOLI-MEMORI: arena.html dengan kesadaran-tubuh + tempaan tak berakhir.
# Isi: MEMORI (menimbang & memetabolisme memori sendiri — 3 lapis, inti tak pernah dibuang),
#      TEMPAAAN TAK BERAKHIR (sertifikat mahir kedaluwarsa 7 hari — mahir pun tetap ditempa),
#      TOPIK.metaboli (jawaban "crash karena penyimpanan?" berangka hidup),
#      MRIT kesadaran-tubuh (pertanyaan mandiri tentang tubuh memorinya),
#      panel TUBUH-MEMORI (bar tekanan + tombol METABOLISME + auto-metabolisme ≥70%).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('arena.html', '/home/z/my-project/download/arena.html')]
PESAN = 'V272-METABOLI-MEMORI — mandat pemilik: regenerasi kemandirian & bertahan hidup di GitHub free tier: (1) METABOLISME MEMORI — cyborg menimbang memorinya sendiri (anggaran 4.2 MB) dan memadatkannya SEBELUM kenyang: tekanan ≥70% daftar tua diringkas, ≥85% cache dibebaskan, 3 lapis cerdas "jangan buang lebih dari perlu"; inti (genom/doktrin/xp/level/pelajaran abadi) TIDAK PERNAH dibuang; (2) TEMPAAAN TAK BERAKHIR — sertifikat mahir kedaluwarsa 7 hari, kedaluwarsa = kelas mahir dipaksa prioritas (dunia kripto tajam, lengah = tumpul); (3) TOPIK.metaboli — menjawab "bisa crash karena penyimpanan?" dengan angka hidup + kejujuran localStorage; (4) MRIT kesadaran-tubuh — pertanyaan mandiri tentang tubuh memorinya tumbuh sendiri; (5) panel TUBUH-MEMORI — bar tekanan aman/waspada/kritis + tombol METABOLISME + auto-metabolisme saat denyut sekolah [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v62', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V62 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
