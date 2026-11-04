#!/usr/bin/env python3
# ============================================================
# INJEKSI V245 SAKTI-SARANG-BAWAAN ke tubuh SAKTI (idempoten).
# - backup dulu: Micaprofita_V231_SAKTI.backup-pre-v245.html
# - sisip organ tepat setelah /*V243-SARANG:END*/ di <script> sama
# - verifikasi: semua blok organ utuh, doctype/</html> utuh,
#   blok V245 hasil injeksi byte-identik dgn sumber, delta byte tepat.
# ============================================================
import hashlib
import shutil
import sys

SRC = '/home/z/my-project/download/Micaprofita_V231_SAKTI.html'
BKP = '/home/z/my-project/download/Micaprofita_V231_SAKTI.backup-pre-v245.html'
ORGAN = '/home/z/my-project/scripts/sarang/organ_v245.js'

AWAL = '/*V243-SARANG:END*/'
M_AWAL = '/*V245-SARANG-BAWAAN:BEGIN*/'
M_AKHIR = '/*V245-SARANG-BAWAAN:END*/'

organ = open(ORGAN, encoding='utf-8').read()
if not (organ.startswith(M_AWAL) and organ.rstrip('\n').endswith(M_AKHIR)):
    print('GAGAL: organ tidak berpembatas standar'); sys.exit(1)

body = open(SRC, encoding='utf-8', newline='').read()
asli_len = len(body.encode('utf-8'))
asli_sha = hashlib.sha256(body.encode('utf-8')).hexdigest()

organ_baru = organ.rstrip('\n')
mode_upgrade = M_AWAL in open(SRC, encoding='utf-8', newline='').read()
lama_len = 0

if M_AWAL in body:
    # mode upgrade: ganti blok V245 lama dgn baru (no-op bila identik)
    i = body.find(M_AWAL)
    j = body.find(M_AKHIR)
    if i < 0 or j < i:
        print('GAGAL: blok V245 lama rusak'); sys.exit(1)
    lama = body[i:j + len(M_AKHIR)]
    lama_len = len(lama.encode('utf-8'))
    if lama == organ_baru:
        print('SUDAH IDENTIK — no-op (idempoten).')
        sys.exit(0)
    body = body[:i] + organ_baru + body[j + len(M_AKHIR):]
    print(f'UPGRADE blok V245: {len(lama.encode("utf-8")):,} B -> {len(organ_baru.encode("utf-8")):,} B')
else:
    if body.count(AWAL) != 1:
        print('GAGAL: penanda akhir V243 tidak tepat satu:', body.count(AWAL)); sys.exit(1)
    shutil.copyfile(SRC, BKP)
    print(f'backup   : {BKP}')
    body = body.replace(AWAL, AWAL + '\n\n' + organ, 1)

# ---------- verifikasi menyeluruh ----------
ok = True
def cek(nama, syarat):
    global ok
    print(('PASS' if syarat else 'GAGAL'), '-', nama)
    if not syarat: ok = False

cek('doctype di kepala', body.lstrip().lower().startswith('<!doctype html'))
cek('</html> di ekor', body.rstrip().endswith('</html>'))
cek('V245:BEGIN tepat 1', body.count(M_AWAL) == 1)
cek('V245:END tepat 1', body.count(M_AKHIR) == 1)
for m in ['/*V237-FBO:BEGIN*/', '/*V238-PD:BEGIN*/', '/*V239-KL:BEGIN*/', '/*V240-ARAH:BEGIN*/',
          '/*V241-NADI:BEGIN*/', '/*V242-FISIKA:BEGIN*/', '/*V243-SARANG:BEGIN*/',
          '/*V237-FBO:END*/', '/*V238-PD:END*/', '/*V239-KL:END*/', '/*V240-ARAH:END*/',
          '/*V241-NADI:END*/', '/*V242-FISIKA:END*/', AWAL]:
    cek(f'blok lama utuh {m[2:20]}…', body.count(m) == 1)
# urutan: V243 END < V245 BEGIN < V245 END < </html>
i_end243 = body.find(AWAL)
i_b245 = body.find(M_AWAL)
i_e245 = body.find(M_AKHIR)
i_html = body.rstrip().rfind('</html>')
cek('urutan blok benar (V243 < V245 < </html>)', 0 < i_end243 < i_b245 < i_e245 < i_html)
# blok V245 dalam tubuh byte-identik dgn sumber
tertanam = body[i_b245:i_e245 + len(M_AKHIR)]
cek('blok V245 byte-identik dgn sumber', tertanam == organ.rstrip('\n') if organ.endswith('\n') else tertanam == organ)

baru_len = len(body.encode('utf-8'))
delta = baru_len - asli_len
if mode_upgrade:
    harus = len(organ_baru.encode('utf-8')) - lama_len
else:
    harus = len(organ.encode('utf-8')) + 2  # '\n\n'
cek(f'delta byte tepat ({delta} == {harus})', delta == harus)

if not ok:
    print('INJEKSI DIBATALKAN — tubuh tidak ditulis.'); sys.exit(1)

open(SRC, 'w', encoding='utf-8', newline='').write(body)
baru_sha = hashlib.sha256(body.encode('utf-8')).hexdigest()
print(f'sebelum  : {asli_len:,} B  sha256 {asli_sha[:16]}…')
print(f'sesudah  : {baru_len:,} B  sha256 {baru_sha[:16]}…')
print(f'organ    : {len(organ.encode("utf-8")):,} B')
print('INJEKSI SELESAI — SAKTI kini 8 organ (7 + SARANG-BAWAAN).')
