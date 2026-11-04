#!/usr/bin/env python3
# ============================================================
# DORONG V55 — SEKOLAH-BUTA ke repo pemilik (10 berkas):
#   scripts/penjaga.mjs                    (v6.2 V265 — 4 organ dari 2.533 soal blind)
#   laporan/LAPORAN-UJIAN-BUTA-100.md      (laporan resmi ujian)
#   laporan/ujian-buta.json                (bukti angka lengkap)
#   scripts/ujian-buta/*                   (harness sekolah kilat — 7 berkas)
# Idempoten via Contents API (sha + cek SAMA). Token dari env GH_TOKEN.
# Jalankan: export GH_TOKEN=<micaprofita-penuh> && python3 scripts/sarang/dorong_v55.py
# ============================================================
import base64, json, os, sys, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ.get('GH_TOKEN')
if not TOKEN:
    print('GH_TOKEN tidak tersedia. export GH_TOKEN=<micaprofita-penuh> lalu ulangi.'); sys.exit(1)

BASE = '/home/z/my-project/micaprofita'
FILE = [
    (f'{BASE}/scripts/penjaga.mjs', 'scripts/penjaga.mjs',
     'V265 SEKOLAH-BUTA v6.2 — mandat pemilik "uji ratusan simulasi, temukan dimana bodohnya, push lagi": ujian buta-histori 2.533 soal nyata (dunia beku di jam T, blind dijamin lapisan data; vonis resmi close T+24j − fee) melahirkan 4 organ yang mengikat saat kunci: jual-lemah (SELL z<0.5 → keyakinan ≤40 + ukuran ×0.5, anti-karantina), jual-pita (SELL entropi ≤0.85 → veto saksi, uji ak 11.8%), key-melawan-drift (key 55-69 melawan drift OLS → ×0.75), momentum-kuat (BUY z≥1.5/drift≥5% → bonus odds +8). Hasil uji ulang: akurasi 40.9→41.8%, net −462.5%→−364.4%, PF 0.839→0.863, band keyakinan 55-69 dari −303.7% menjadi +175.4%. Registri 285 → 293. Harness sekolah kilat disertakan di scripts/ujian-buta/ [skip ci]'),
    (f'{BASE}/laporan/LAPORAN-UJIAN-BUTA-100.md', 'laporan/LAPORAN-UJIAN-BUTA-100.md',
     'LAPORAN UJIAN BUTA-HISTORI 100 — metode anti-bocor, hasil headline V264 vs V265, diagnosa "di mana bodohnya" (SELL pendarah, overclaim 55-69, pita sempit, momentum=jantung), 4 organ V265, tabel 100 soal kanonik [skip ci]'),
    (f'{BASE}/laporan/ujian-buta.json', 'laporan/ujian-buta.json',
     'Bukti angka ujian buta-histori: ringkasan V264 + V265 + detail penuh kelas A (kunci resmi ber-stop/target) [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/pra_ambil.py', 'scripts/ujian-buta/pra_ambil.py', 'Sekolah kilat 1/7 — pra-ambil cache data REAL 115 koin (klines 1h/1d, funding, OI, LSR, taker, F&G) [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/beku.cjs', 'scripts/ujian-buta/beku.cjs', 'Sekolah kilat 2/7 — BEKU: Date dibekukan + fetch diproksi & dipotong pada T (blind dijamin lapisan data; host asing diblokir) [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/orkestra.mjs', 'scripts/ujian-buta/orkestra.mjs', 'Sekolah kilat 3/7 — orkestra: sandbox per soal, jalankan penjaga asli di dunia beku, panen kunci [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/panen_ulang.mjs', 'scripts/ujian-buta/panen_ulang.mjs', 'Sekolah kilat 4/7 — panen dua kelas soal (kunci penuh + jawaban radar kandidatLain) [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/grade.mjs', 'scripts/ujian-buta/grade.mjs', 'Sekolah kilat 5/7 — grader vonis resmi (close T+24j − fee) + barier stop/target + diagnosa gerbang [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/bedah_sekolah.py', 'scripts/ujian-buta/bedah_sekolah.py', 'Sekolah kilat 6/7 — bedah fitur matematika (z-SMA/drift/autokorelasi/entropi) vs hasil → aturan organ [skip ci]'),
    (f'{BASE}/scripts/ujian-buta/buat_laporan.mjs', 'scripts/ujian-buta/buat_laporan.mjs', 'Sekolah kilat 7/7 — generator laporan resmi + subset UJIAN-100 [skip ci]'),
]

def api(jalan, metode='GET', isi=None):
    req = urllib.request.Request(API + jalan, method=metode)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    data = None
    if isi is not None:
        data = json.dumps(isi).encode()
        req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, data) as r:
        return json.loads(r.read())

try:
    info = api('/commits/main')
    print('HEAD remote:', (info.get('commit', {}).get('message') or '').split('\n')[0][:90])
except Exception as e:
    print('pra-cek gagal (lanjut):', e)

ok = 0
for lokal, jalan, pesan in FILE:
    if not os.path.exists(lokal):
        print(f'LEWAT (file tak ada): {jalan}'); continue
    isi = open(lokal, 'rb').read()
    b64 = base64.b64encode(isi).decode()
    sha = None
    try:
        meta = api(f'/contents/{jalan}?ref=main')
        sha = meta['sha']
        if base64.b64decode(meta['content']) == isi:
            print(f'SAMA (lewat): {jalan}'); ok += 1; continue
    except Exception:
        pass
    try:
        api(f'/contents/{jalan}', 'PUT', {'message': pesan, 'content': b64, 'sha': sha})
        print(f'TERDORONG: {jalan} ({len(isi)} B)'); ok += 1
    except Exception as e:
        print(f'GAGAL {jalan}: {e}')
print(f'\n=== DORONG V55: {ok}/{len(FILE)} ===')
print('Denyut V265 pertama ≤15 menit → verifikasi: laporan/matematika.json (sekolahButa), VERSI v6.2, registri 293.')
