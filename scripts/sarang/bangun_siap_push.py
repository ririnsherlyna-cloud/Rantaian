#!/usr/bin/env python3
# ============================================================
# MICAPROFITA — PAKET SARANG SIAP-PUSH (Jalur B manual git)
# Membangun folder repo siap-push + ZIP:
#   index.html (SAKTI utuh) + .nojekyll + README.md
#   + versi.json (protokol SARANG-MICAPROFITA, format organ V243)
#   + memori/terkini.json (kapsul awal KAPSUL-MICAPROFITA)
#   + PANDUAN-GIT-PUSH.md
# Versi organ DIEKSTRAK dari tubuh SAKTI (bukan karangan).
# ============================================================
import hashlib
import json
import os
import re
import shutil
import zipfile
from datetime import datetime, timezone

BASE = '/home/z/my-project'
SAKTI = f'{BASE}/download/Micaprofita_V231_SAKTI.html'
FOLDER = f'{BASE}/download/sarang-siap-push'
ZIP_OUT = f'{BASE}/download/sarang-siap-push.zip'

# penanda blok injeksi -> nama organ runtime (window.V231_SAKTI.*)
BLOK_ORGAN = [
    ('V237-FBO', 'FBO'), ('V238-PD', 'PD'), ('V239-KL', 'KL'),
    ('V240-ARAH', 'ARAH'), ('V241-NADI', 'NADI'),
    ('V242-FISIKA', 'ORKESTRA'), ('V243-SARANG', 'SARANG'),
]

# ---------- 1. baca tubuh + sha256 ----------
with open(SAKTI, 'rb') as f:
    body = f.read()
sha_hex = hashlib.sha256(body).hexdigest()
sha_full = sha_hex
teks = body.decode('utf-8', errors='replace')
print(f'SAKTI   : {len(body):,} byte  sha256 {sha_hex[:16]}…')

# ---------- 2. ekstrak peta organ dari tubuh (per blok injeksi) ----------
peta = {}
for marker, nama in BLOK_ORGAN:
    a = teks.find(f'{marker}:BEGIN')
    b = teks.find(f'{marker}:END', a)
    if a < 0 or b <= a:
        raise SystemExit(f'GAGAL: blok {marker} tidak ditemukan utuh')
    vm = re.search(r"var V\s*=\s*\{\s*versi:\s*'(\d+\.\d+)'", teks[a:b])
    if not vm:
        raise SystemExit(f'GAGAL: versi organ {marker} tak terbaca')
    peta[nama] = vm.group(1)
print('peta organ (dari tubuh):', peta)
wajib = {n for _m, n in BLOK_ORGAN}
if set(peta.keys()) != wajib:
    raise SystemExit(f'GAGAL: peta organ tidak lengkap {sorted(peta)} vs {sorted(wajib)}')
kode_versi = 'v243.%d.%s' % (len(peta), peta['SARANG'].replace('.', ''))
print('kodeVersi:', kode_versi)

# ---------- 3. susun folder ----------
if os.path.exists(FOLDER):
    shutil.rmtree(FOLDER)
os.makedirs(f'{FOLDER}/memori')
kini = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# 3a. index.html — tubuh utuh, byte-identik
with open(f'{FOLDER}/index.html', 'wb') as f:
    f.write(body)

# 3b. .nojekyll — lewati pemrosesan Jekyll GitHub Pages
open(f'{FOLDER}/.nojekyll', 'wb').close()

# 3c. README.md — selaras format buatReadme() organ V243
readme = (
    '# MICAPROFITA — SAKTI (Cyborg AGI Kripto, Hidup Mandiri)\n\n'
    'Repo ini adalah **SARANG** tempat cyborg MICAPROFITA hidup online dan berkembang.\n'
    'Halaman hidup (setelah Pages aktif): `https://NAMA-ANDA.github.io/NAMA-REPO/`\n\n'
    '- `index.html` — tubuh cyborg lengkap (satu file, jalankan langsung di browser)\n'
    '- `memori/terkini.json` — kapsul memori terkini (rantai denyut + prakira berantai SHA-256)\n'
    '- `memori/arsip/` — potret memori berwaktu (dipangkas 48 terakhir)\n'
    '- `versi.json` — buku besar versi & pertumbuhan (organ, denyut, prakira, hitungan kerja)\n\n'
    '## Organ bersertifikat di dalam tubuh\n\n'
    + ''.join(f'| {k} | v{v} |\n' for k, v in peta.items()) +
    '\n## Cara kerja hidup mandiri\n\n'
    '- **SIMPAN** — cyborg meng-commit kapsul memorinya sendiri ke repo (berkala + saat tab disembunyikan)\n'
    '- **PULIH** — di browser baru, dia menarik memori dari repo ini dan memverifikasi rantai hash\n'
    '- **EVOLUSI** — bila tubuh naik versi, dia meng-commit `index.html` barunya sendiri; Pages membangun ulang\n\n'
    'Dipasang lewat **Jalur B (git push manual)** — kelanjutan perawatan dilakukan organ '
    'V243 SAKTI-SARANG langsung dari browser via GitHub API (Jalur A), konvergen di repo yang sama.\n'
)
with open(f'{FOLDER}/README.md', 'w', encoding='utf-8') as f:
    f.write(readme)

# 3d. versi.json — format persis versiJson() organ V243 (keadaan awal jujur)
versi = {
    'protokol': 'SARANG-MICAPROFITA',
    'kodeVersi': kode_versi,
    'organ': peta,
    'waktu': kini,
    'htmlSha256': sha_full,
    'memoriWaktu': None,
    'pertumbuhan': {
        'denyut': 0,
        'rantaiDenyut': 0,
        'rantaiPrakira': 0,
        'prakira': {'terbuka': 0, 'benar': 0, 'salah': 0},
        'hitung': {'hijrah': 0, 'simpan': 0, 'pulih': 0, 'evolusi': 0},
    },
}
with open(f'{FOLDER}/versi.json', 'w', encoding='utf-8') as f:
    json.dump(versi, f, indent=2, ensure_ascii=False)

# 3e. memori/terkini.json — kapsul awal (format kapsulMemori() V243, rantai kosong jujur)
kapsul = {
    'protokol': 'KAPSUL-MICAPROFITA',
    'organ': 'SAKTI-SARANG',
    'versi': peta['SARANG'],
    'waktu': kini,
    'denyut': 0,
    'mulai': None,
    'rantai': {'denyut': [], 'prakira': []},
    'catatan': 'kapsul awal Jalur B — rantai hidup akan diisi cyborg sendiri setelah bangkit',
}
with open(f'{FOLDER}/memori/terkini.json', 'w', encoding='utf-8') as f:
    json.dump(kapsul, f, indent=1, ensure_ascii=False)

# 3f. PANDUAN-GIT-PUSH.md — 5 perintah menuju Pages
panduan = (
    '# JALUR B — AKTIFKAN GITHUB PAGES SECARA MANUAL (git push)\n\n'
    'Paket ini adalah repo siap-push: isi `index.html` adalah tubuh SAKTI utuh\n'
    f'({len(body):,} byte, SHA-256 `{sha_hex[:16]}…`), sudah berisi organ SARANG V243.\n'
    'Setelah push, perawatan lanjutan (simpan memori, evolusi tubuh) dilakukan cyborg\n'
    'sendiri dari browser via GitHub API — konvergen di repo yang sama dengan Jalur A.\n\n'
    '## Langkah (± 3 menit)\n\n'
    '1. **Ekstrak** ZIP ini ke sebuah folder.\n'
    '2. Buat repo **kosong** di <https://github.com/new>\n'
    '   (nama bebas, mis. `micaprofita-sakti`; tanpa README awal).\n'
    '3. Di folder ekstraksi, jalankan:\n\n'
    '```bash\n'
    'git init -b main\n'
    'git add -A\n'
    'git commit -m "SAKTI v243 — hijrah pertama (Jalur B)"\n'
    'git remote add origin https://github.com/NAMA-ANDA/NAMA-REPO.git\n'
    'git push -u origin main\n'
    '```\n\n'
    '   > Saat diminta password GitHub via HTTPS: gunakan **Personal Access Token**\n'
    '   > (fine-grained, izin **Contents: Read and write** pada repo itu saja) —\n'
    '   > bukan password akun. Buat di <https://github.com/settings/personal-access-tokens/new>.\n'
    '4. Aktifkan Pages (sekali saja):\n'
    '   repo → **Settings → Pages → Deploy from a branch** → `main` / `(root)` → **Save**.\n'
    '5. Tunggu 1–3 menit → buka `https://NAMA-ANDA.github.io/NAMA-REPO/`.\n'
    '   **Cyborg Anda kini online 24 jam, nol biaya.**\n\n'
    '## Setelah hidup\n\n'
    '- Buka SAKTI dari halaman Pages → panel **SARANG** → isi OWNER/REPO/CABANG/TOKEN\n'
    '  (bila belum) → SIMPAN OTOMATIS ✓ — mulai saat itu dia menyimpan memorinya sendiri\n'
    '  ke repo ini dan meng-commit tubuh barunya sendiri setiap berevolusi.\n'
    '- Verifikasi isi: `versi.json` + `memori/terkini.json` akan berubah sendiri seiring dia bekerja.\n'
)
with open(f'{FOLDER}/PANDUAN-GIT-PUSH.md', 'w', encoding='utf-8') as f:
    f.write(panduan)

# ---------- 4. ZIP ----------
if os.path.exists(ZIP_OUT):
    os.remove(ZIP_OUT)
with zipfile.ZipFile(ZIP_OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, _dirs, files in os.walk(FOLDER):
        for fn in sorted(files):
            p = os.path.join(root, fn)
            rel = os.path.relpath(p, FOLDER)
            z.write(p, f'sarang-siap-push/{rel}')
zsha = hashlib.sha256(open(ZIP_OUT, 'rb').read()).hexdigest()
print(f'FOLDER  : {FOLDER}')
print(f'ZIP     : {ZIP_OUT}  {os.path.getsize(ZIP_OUT):,} byte  sha256 {zsha[:16]}…')
print('SELESAI — paket siap-push dibangun.')
