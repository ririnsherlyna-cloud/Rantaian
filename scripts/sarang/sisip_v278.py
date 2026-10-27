#!/usr/bin/env python3
"""SISIP V278-DEBAT-TEMPUR ke arena.html (basis live GitHub Pages).

Mandat pemilik: "lanjutkan sekolah kilat dan pengembang agentic kita" — maka:
  1) Blok otak tertanam DIGANTI SELURUHNYA dengan otak_mandiri.js v278
     (LARIK PIKIR 5 langkah + SERANG-DIRIKU, seranganRedTeam, tingkat MAHKOTA,
     BUKU-SALAH spaced repetition, neuron kelly/variansiDrag/betaBtc,
     MRIT debat-lapar, 52 soal × 7 fakultas × 4 tingkat).
  2) Badge otak v278 + teks statis sekolah 52 soal / 4 tingkat.
  3) Render larik "agentik 5 langkah" + CSS .tt-mahkota + hitungan buku-salah
     di renderSekolah.
Idempoten — aman dijalankan berulang.
"""
import re, sys, pathlib

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
OTAK = pathlib.Path('/home/z/my-project/scripts/sarang/otak_mandiri.js')
MARK = 'V278-DEBAT-TEMPUR'

html = ARENA.read_text(encoding='utf-8')
otak_js = OTAK.read_text(encoding='utf-8')
changed = False

# ---------- 1) ganti blok otak tertanam (blok <script> PERTAMA) ----------
batas = re.compile(r'<script>\n(.*?)\n</script>', re.S)
m = batas.search(html)
if not m:
    print('GAGAL: blok script pertama tidak ditemukan'); sys.exit(1)
blok_lama = m.group(1)
if MARK in blok_lama and blok_lama.strip() == otak_js.strip():
    print('V278: blok otak sudah v278 terkini — lewati penggantian.')
else:
    if 'MICABRAIN' not in blok_lama:
        print('GAGAL: blok pertama bukan otak MICABRAIN — batal demi keamanan'); sys.exit(1)
    html = html[:m.start(1)] + otak_js.rstrip('\n') + html[m.end(1):]
    changed = True
    print(f'blok otak diganti: {len(blok_lama)} -> {len(otak_js)} char')

# ---------- 2) badge otak v276 -> v278 ----------
if 'OTAK AGENTIK · v276 · ' in html:
    html = html.replace('OTAK AGENTIK · v276 · ', 'OTAK AGENTIK · v278 · ')
    changed = True
    print('badge otak → v278')
elif 'OTAK AGENTIK · v278 · ' in html:
    print('badge sudah v278 — lewati.')
else:
    print('PERINGATAN: badge otak tak ditemukan'); sys.exit(1)

# ---------- 3) render larik 4 langkah -> 5 langkah ----------
lama_l = 'LARIK PIKIR · agentik 4 langkah · '
baru_l = 'LARIK PIKIR · agentik 5 langkah · '
if lama_l in html:
    html = html.replace(lama_l, baru_l)
    changed = True
    print('render larik → 5 langkah')
elif baru_l in html:
    print('render larik sudah 5 langkah — lewati.')
else:
    print('PERINGATAN: teks render larik tak ditemukan'); sys.exit(1)

# ---------- 4) teks statis sekolah: 46 soal · 7 fakultas · 3 tingkat ----------
lama_s = '46 soal · 7 fakultas · 3 tingkat'
baru_s = '52 soal · 7 fakultas · 4 tingkat (dasar→MAHKOTA)'
n_ganti = html.count(lama_s)
if n_ganti:
    html = html.replace(lama_s, baru_s)
    changed = True
    print(f'teks sekolah statis diganti x{n_ganti}')
elif baru_s in html:
    print('teks sekolah sudah v278 — lewati.')
else:
    print('PERINGATAN: teks statis sekolah tak ditemukan'); sys.exit(1)

# ---------- 5) CSS .tt-mahkota setelah .tt-mahir ----------
css_mahir = '.tt-mahir{background:rgba(244,114,182,.14);color:#f9a8d4;border:1px solid rgba(244,114,182,.4)}'
css_mahkota = css_mahir + '\n.tt-mahkota{background:linear-gradient(90deg,rgba(250,204,21,.16),rgba(245,158,11,.16));color:#fde68a;border:1px solid rgba(250,204,21,.55)}'
if css_mahkota not in html:
    if css_mahir not in html:
        print('GAGAL: CSS .tt-mahir tak ditemukan'); sys.exit(1)
    html = html.replace(css_mahir, css_mahkota)
    changed = True
    print('CSS .tt-mahkota disisipkan')
else:
    print('CSS .tt-mahkota sudah ada — lewati.')

# ---------- 6) renderSekolah: buku-salah di garis ringkasan ----------
lama_rs = "$('#sekLine').textContent = kelas.length + ' kelas · ' + lulus + ' lulus · Lv' + MICABRAIN.levelDari(otak.xp || 0);"
baru_rs = "const bsN = (otak.salah || []).length; // V278 BUKU-SALAH\n  $('#sekLine').textContent = kelas.length + ' kelas · ' + lulus + ' lulus · Lv' + MICABRAIN.levelDari(otak.xp || 0) + (bsN ? ' · buku-salah ' + bsN : '');"
if lama_rs in html:
    html = html.replace(lama_rs, baru_rs)
    changed = True
    print('renderSekolah + buku-salah')
elif 'buku-salah ' + "'" in html or "' · buku-salah '" in html:
    print('renderSekolah sudah ada buku-salah — lewati.')
else:
    print('GAGAL: baris sekLine tak ditemukan'); sys.exit(1)

# ---------- 7) komentar V271 sekolah (dokumentasi) ----------
lama_k = '// V271-SEKOLAH-KILAT: 32 soal × 3 tingkat · adaptif · kelas kilat 3 soal · bar fakultas'
baru_k = '// V278-SEKOLAH-KILAT: 52 soal × 4 tingkat (dasar→MAHKOTA) · adaptif + BUKU-SALAH · kelas kilat 3 soal'
if lama_k in html:
    html = html.replace(lama_k, baru_k)
    changed = True
    print('komentar sekolah → v278')

if changed:
    ARENA.write_text(html, encoding='utf-8')
    print('arena.html DITULIS ulang.')
else:
    print('tidak ada perubahan — arena.html utuh (idempoten).')

# ---------- verifikasi ----------
html2 = ARENA.read_text(encoding='utf-8')
cek = {
    'blok otak V278': 'V278-DEBAT-TEMPUR' in html2,
    'badge v278': 'OTAK AGENTIK · v278' in html2,
    'larik 5 langkah': 'agentik 5 langkah' in html2,
    'teks 4 tingkat': '4 tingkat (dasar→MAHKOTA)' in html2,
    'CSS tt-mahkota': '.tt-mahkota' in html2,
    'buku-salah render': 'buku-salah ' in html2,
    'seranganRedTeam tertanam': 'seranganRedTeam' in html2,
    'doktrin DEBAT-AGENTIK': 'DEBAT-AGENTIK:' in html2,
}
ok = all(cek.values())
for k, v in cek.items():
    print(('  OK ' if v else '  GAGAL ') + k)
sys.exit(0 if ok else 1)
