#!/usr/bin/env python3
# DORONG V85 — RUANG HIDUP V285-SADAR-REPO.
# Mandat pemilik: "cyborg yang diciptakan dalam ruang hidup itu BERLANDAS pada
# micaprofita GitHub dan perkembangan kita — BUKAN file terpisah; justru dia
# MEMBACA SELURUH ASPEK KODE dan MEMPELAJARI PASAR NYATA — semuanya sudah ada
# landasan file micaprofita yang jelas."
# Jawaban: timpa hidup.html YANG SAMA — dunia cyborg kini adalah repo-nya sendiri:
# pohon 54 file nyata (GitHub API → jsDelivr → cache), pembacaan isi file asli
# (raw → CDN, streaming byte nyata), parser JSON/MD/KODE → fakta mengutip isi,
# pasar nyata klines Binance untuk simbol pilihan arena sendiri + uji-jalan
# walk-forward + audit pick vs momentum, otak argmax utilitas atas pekerjaan
# tertunda, siklus 9 tahap, persist kumulatif. Tanpa daftar file keras, tanpa
# fakta tempelan, tanpa jadwal penemuan.
# Idempoten: HEAD -> banding byte -> PUT dengan sha. Pesan komit [skip ci].
import base64, json, os, sys, urllib.request, urllib.error

REPO = 'ririnsherlyna-cloud/Micaprofita-'
FILE = [('hidup.html', '/home/z/my-project/download/hidup.html')]

PESAN = ('V285-SADAR-REPO — mandat pemilik dipenuhi: cyborg RUANG HIDUP kini '
         'BERLANDAS penuh pada repo Micaprofita sendiri, bukan dunia terpisah. '
         '(1) pohon repo nyata 3 gerbang (GitHub API trees → jsDelivr flat → cache) — 54 file asli jadi dunianya; '
         '(2) membaca seluruh aspek kode: isi file asli via raw/CDN dengan streaming byte nyata, parser JSON/MD/KODE '
         'menghasilkan fakta yang mengutip isi sebenarnya (kodeVersi, hit-rate, genom, bukuCuan, bobot otak, rantai denyut); '
         '(3) mempelajari pasar nyata: klines 1j Binance untuk simbol pilihan arena sendiri, EMA/RSI/ATR/momentum, '
         'uji-jalan walk-forward 24 jam + verifikasi dua jalur hitung, audit pick vs momentum hidup (SEPAKAT/MENDEVIASI); '
         '(4) otak = argmax utilitas atas pekerjaan BENAR-BENAR tertunda (file belum-dibaca/SHA-berubah oleh denyut penjaga, '
         'simbol stale, audit) — jejak skor dipajang; tanpa daftar file keras, tanpa fakta tempelan, tanpa jadwal penemuan; '
         '(5) siklus 9 tahap mengamati→…→mengamati kembali sebagai fase fungsi nyata; '
         '(6) panggung = peta repo: node per file (ukuran ∝ bytes asli, status ○/◐/●/↻), cluster per direktori asli, '
         'cyborg amorf dengan filamen + partikel KARAKTER KODE ASLI mengalir saat fetch, strip lilin pasar nyata; '
         '(7) teks 100% overlay DOM terpisah (PIKIRAN/PETA-DIRI/PASAR/JURNAL), fit-penuh tanpa potong, mobile bottom-sheet; '
         '(8) persist kumulatif lintas kunjungan: 54/54 file dibaca bertahap, SHA-diff mendeteksi rumah bergerak; '
         '(9) perintah pemilik ditaati: sentuh node → dibaca segera [skip ci]')

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
        'User-Agent': 'sarang-dorong-v85', 'Content-Type': 'application/json'})
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
            ok.append((jalan, 'sudah-identik', d.get('commit',{}).get('sha','')[:7])); continue
    except urllib.error.HTTPError as e:
        if e.code != 404: gagal.append((jalan, f'HEAD-{e.code}')); continue
    body = {'message': PESAN, 'content': b64, 'branch': 'main'}
    if sha: body['sha'] = sha
    try:
        r = api(f'contents/{jalan}', 'PUT', body)
        ok.append((jalan, 'terdorong', r.get('commit',{}).get('sha','')[:7]))
    except urllib.error.HTTPError as e:
        gagal.append((jalan, f'PUT-{e.code}'))

for j in ok: print('OK  ', j)
for g in gagal: print('GAGAL', g)
sys.exit(0 if not gagal else 1)
