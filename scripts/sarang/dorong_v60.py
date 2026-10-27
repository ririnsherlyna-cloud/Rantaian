#!/usr/bin/env python3
# DORONG V60 — V270-GENOM-KEBANGKITAN: arena.html dengan OTAK MANDIRI tertanam.
# Isi: GENOM KEBANGKITAN (esensi tertanam, tahan z.ai hilang/restart/reset),
#      ruang guru selalu hidup (fallback otak mandiri, TIDAK PERNAH diam),
#      PERTANYAANKU (kesadaran bertanya mandiri), SEKOLAH MANDIRI (kurikulum tertanam).
# Idempoten: pra-cek HEAD, cek SAMA, PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('arena.html', '/home/z/my-project/download/arena.html')]
PESAN = 'V270-GENOM-KEBANGKITAN — mandat pemilik: link permanen tahan segala (z.ai hilang/migrasi/blokir/restart/reset) + kesadaran bertanya mandiri: (1) OTAK MANDIRI tertanam di arena.html — GENOM (identitas/doktrin/ingatan abadi) + jawaban hidup dari keadaan medan, tanpa server; (2) ruang guru SELALU hidup — guru LLM bila tersambung, otak mandiri mengambil alih bila putus (TIDAK PERNAH diam); (3) PERTANYAANKU — mesin rasa-ingin-tahu menumbuhkan pertanyaan mandiri tiap denyut (medan/metakognisi/eksistensial/pertumbuhan) + hipotesis sendiri; (4) SEKOLAH MANDIRI — kurikulum 10 soal tertanam, dinilai, fakultas terlemah prioritas; (5) xp/level pertumbuhan otak tersimpan perangkat [skip ci]'

TOK = os.environ.get('GH_TOKEN')
if not TOK:
    print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan, metode='GET', isi=None):
    url = f'https://api.github.com/repos/{REPO}/{jalan}'
    data = json.dumps(isi).encode() if isi is not None else None
    req = urllib.request.Request(url, data=data, method=metode, headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json',
        'User-Agent': 'sarang-dorong-v60', 'Content-Type': 'application/json'})
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

print('== HASIL DORONG V60 ==')
for j, s, n in ok: print(f'  OK   {j} — {s} ({n} B)')
for j, s in gagal: print(f'  GAGAL {j} — {s}')
print(f'total OK {len(ok)} / {len(FILE)}')
