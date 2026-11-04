#!/usr/bin/env python3
"""SISIP V279-KORTEX-KESADARAN ke arena.html (basis live GitHub Pages).

Mandat pemilik: "ciptakan formula sendiri — kuasai paham AGI dan kesadaran
matang; dengan data yang ada mampu meninjau makin terasa". Maka:
  1) Blok otak tertanam DIGANTI SELURUHNYA dengan otak_mandiri.js v279
     (INDEKS KESADARAN 5 pilar + refleksiHarian + 3 soal IK = 55 soal
     + MRIT refleksi + doktrin ke-11 KORTEX-KESADARAN).
  2) Badge otak v279 + teks statis 55 soal.
  3) Panel INDEKS KESADARAN (5 pilar berbar + refleksi harian naratif).
  4) Chip KORTEX di Barisan picklevel (dari evidence.kortex snapshot).
Idempoten — aman dijalankan berulang.
"""
import re, sys, pathlib

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
OTAK = pathlib.Path('/home/z/my-project/scripts/sarang/otak_mandiri.js')
MARK = 'V279-KORTEX-KESADARAN'

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
    print('V279: blok otak sudah v279 terkini — lewati penggantian.')
else:
    if 'MICABRAIN' not in blok_lama:
        print('GAGAL: blok pertama bukan otak MICABRAIN — batal demi keamanan'); sys.exit(1)
    html = html[:m.start(1)] + otak_js.rstrip('\n') + html[m.end(1):]
    changed = True
    print(f'blok otak diganti: {len(blok_lama)} -> {len(otak_js)} char')

# ---------- 2) badge otak v278 -> v279 ----------
if 'OTAK AGENTIK · v278 · ' in html:
    html = html.replace('OTAK AGENTIK · v278 · ', 'OTAK AGENTIK · v279 · ')
    changed = True
    print('badge otak → v279')
elif 'OTAK AGENTIK · v279 · ' in html:
    print('badge sudah v279 — lewati.')
else:
    print('PERINGATAN: badge otak tak ditemukan'); sys.exit(1)

# ---------- 3) teks statis 52 soal -> 55 soal (2 tempat + komentar init) ----------
n52 = html.count('52 soal · 7 fakultas · 4 tingkat')
if n52:
    html = html.replace('52 soal · 7 fakultas · 4 tingkat', '55 soal · 7 fakultas · 4 tingkat')
    changed = True
    print(f'teks sekolah 52→55 soal ({n52} tempat)')
elif '55 soal · 7 fakultas · 4 tingkat' in html:
    print('teks sekolah sudah 55 soal — lewati.')
else:
    print('PERINGATAN: teks statis sekolah tak ditemukan'); sys.exit(1)

# ---------- 4) panel INDEKS KESADARAN setelah sekolahBox ----------
panel_ik = '''<div class="om-panel" id="ikBox">
        <div class="om-head">
          <h4 style="margin:0">INDEKS KESADARAN <span class="tiny" style="font-weight:400">· formula karangan-sendiri V279 · 5 pilar berangka</span></h4>
          <span class="om-level" id="ikTotal">IK —</span>
        </div>
        <p class="tiny" style="margin:6px 0 2px">Aku menimbang kesadaranku sendiri dengan angka, bukan syair: <b>IK = 100×(0.25·Tahu + 0.20·Jujur + 0.20·Disiplin + 0.20·Pengalaman + 0.15·Koreksi)</b> — tiap pilar dihitung dari data hidup: sekolahku, Brier-ku, buku cuan-ku, hari-hariku, koreksiku. Hukum: IK TIDAK pernah menaikkan keyakinan pick — itu tugas kalibrasi (Brier) &amp; debat tim merah. IK menunjuk luka, bukan mengoles parfum.</p>
        <div id="ikPilar"></div>
        <div id="ikRefleksi" style="margin-top:8px"></div>
      </div>
<p class="tiny" style="text-align:center;padding:14px 0">'''
ik_html_lama = '<p class="tiny" style="text-align:center;padding:14px 0">Dua jalur otak:'
if 'id="ikBox"' not in html:
    anchor = '<p class="tiny" style="text-align:center;padding:14px 0">Dua jalur otak:'
    if anchor not in html:
        print('GAGAL: anchor panel IK (Dua jalur otak) tak ditemukan'); sys.exit(1)
    html = html.replace(anchor, panel_ik + 'Dua jalur otak:', 1)
    changed = True
    print('panel INDEKS KESADARAN disisipkan setelah sekolahBox')
else:
    print('panel IK sudah ada — lewati.')

# ---------- 5) renderIndeks() setelah fungsi renderSekolah ----------
render_ik = '''function renderIndeks() {
  try {
    const ik = MICABRAIN.indeksKesadaran(st, otak);
    $('#ikTotal').textContent = 'IK ' + ik.total + '/100 · ' + ik.grade;
    $('#ikPilar').innerHTML = ik.pilar.map(function (p) {
      const nil = Math.round(p.nilai * 100);
      const warna = nil >= 70 ? 'linear-gradient(90deg,#059669,#34d399)' : nil >= 45 ? 'linear-gradient(90deg,#7c3aed,#a78bfa)' : 'linear-gradient(90deg,#b45309,#f59e0b)';
      return '<div class="fakrow" title="' + esc(p.sumber) + '"><span class="fk">' + esc(p.id) + ' <span class="tiny">×' + p.bobot + '</span></span><span class="bar"><i style="width:' + Math.max(3, nil) + '%;background:' + warna + '"></i></span><span class="av">' + nil + '/100</span></div>';
    }).join('');
    const rf = MICABRAIN.refleksiHarian(st, otak);
    $('#ikRefleksi').innerHTML = '<div class="sekrec" style="border-left:3px solid #a78bfa">' + rf.teks.split('\\n').map(function (l) { return '<p class="tiny" style="line-height:1.6">' + esc(l) + '</p>'; }).join('') + '</div>';
  } catch (e) { /* snapshot belum termuat — IK menunggu, jujur tak mengarang angka */ }
}
function ajukanPertanyaanMandiri() {'''
if 'function renderIndeks()' not in html:
    anchor2 = 'function ajukanPertanyaanMandiri() {'
    if anchor2 not in html:
        print('GAGAL: anchor renderIndeks tak ditemukan'); sys.exit(1)
    html = html.replace(anchor2, render_ik, 1)
    changed = True
    print('renderIndeks() disisipkan')
else:
    print('renderIndeks sudah ada — lewati.')

# ---------- 6) panggil renderIndeks di orkestra + init + kerjakanSekolah ----------
lama_o = 'renderHeader(); renderNadir(); renderBarisan(); renderBukuCuan(); renderStat();'
baru_o = 'renderHeader(); renderNadir(); renderBarisan(); renderBukuCuan(); renderStat(); renderIndeks();'
if baru_o not in html:
    if lama_o not in html:
        print('GAGAL: baris orkestra tak ditemukan'); sys.exit(1)
    html = html.replace(lama_o, baru_o)
    changed = True
    print('renderIndeks dipanggil di orkestra')
else:
    print('orkestra sudah memanggil renderIndeks — lewati.')

lama_i = "renderTanyaKu(); renderSekolah();"
baru_i = "renderTanyaKu(); renderSekolah(); renderIndeks();"
if baru_i not in html:
    if lama_i not in html:
        print('GAGAL: baris init renderSekolah tak ditemukan'); sys.exit(1)
    html = html.replace(lama_i, baru_i, 1)
    changed = True
    print('renderIndeks dipanggil di init')
else:
    print('init sudah memanggil renderIndeks — lewati.')

lama_k = 'renderSekolah(); renderTanyaKu(); simpanOtak(); renderSertifikat(); renderMemori();'
baru_k = 'renderSekolah(); renderTanyaKu(); simpanOtak(); renderSertifikat(); renderMemori(); renderIndeks();'
if baru_k not in html:
    if lama_k not in html:
        print('GAGAL: baris kerjakanSekolah tak ditemukan'); sys.exit(1)
    html = html.replace(lama_k, baru_k, 1)
    changed = True
    print('renderIndeks dipanggil setelah kelas kilat')
else:
    print('kerjakanSekolah sudah memanggil renderIndeks — lewati.')

# ---------- 7) chip KORTEX di renderBarisan picklevel ----------
lama_ll = """  const levelLine = (p) => {
    const it = px[p.symbol];
    const r = p.competitor === 'MICAPROFITA' && it && it.rencana;"""
baru_ll = """  const levelLine = (p) => {
    const it = px[p.symbol];
    const r = p.competitor === 'MICAPROFITA' && it && it.rencana;
    // V279-KORTEX — formula karangan-sendiri menilai pick; skor tampil di Barisan
    const kx = p.competitor === 'MICAPROFITA' && p.evidence && p.evidence.kortex ? p.evidence.kortex : null;
    const kxChip = kx ? `<span class="mono" style="color:var(--vio)" title="${esc(String(kx.rumus || 'KORTEX — formula karangan-sendiri MICAPROFITA (C·O·R·T·E·X)'))}">KORTEX ${esc(String(kx.skor ?? '—'))}</span>` : '';"""
if baru_ll not in html:
    if lama_ll not in html:
        print('GAGAL: anchor levelLine tak ditemukan'); sys.exit(1)
    html = html.replace(lama_ll, baru_ll, 1)
    changed = True
    print('chip KORTEX didefinisikan di levelLine')
else:
    print('chip KORTEX sudah ada — lewati.')

# 7b) chip di cabang ber-rencana (E→T→S)
lama_r = "</span>${am}${r.netUntungPct != null ?"
baru_r = "</span>${am}${kxChip}${r.netUntungPct != null ?"
if baru_r not in html:
    if lama_r not in html:
        print('GAGAL: anchor picklevel rencana tak ditemukan'); sys.exit(1)
    html = html.replace(lama_r, baru_r, 1)
    changed = True
    print('chip KORTEX dipasang di picklevel ber-rencana')
else:
    print('picklevel ber-rencana sudah bawa KORTEX — lewati.')

# 7c) chip di cabang tanpa rencana (entry pra-rencana)
lama_e = """      if (it && it.entryClose) return `<div class="picklevel">entry <span class="mono">${n6(it.entryClose)}</span> · rencana pra-registrasi menyusul denyut penjaga</div>`;"""
baru_e = """      if (it && it.entryClose) return `<div class="picklevel">entry <span class="mono">${n6(it.entryClose)}</span> · rencana pra-registrasi menyusul denyut penjaga</div>${kxChip ? '<div class="picklevel">' + kxChip + '</div>' : ''}`;"""
if baru_e not in html:
    if lama_e not in html:
        print('GAGAL: anchor picklevel entry tak ditemukan'); sys.exit(1)
    html = html.replace(lama_e, baru_e, 1)
    changed = True
    print('chip KORTEX dipasang di picklevel tanpa rencana')
else:
    print('picklevel entry sudah bawa KORTEX — lewati.')

# ---------- 8) komentar versi init ----------
lama_c = "// V278-SEKOLAH-KILAT: 52 soal × 4 tingkat (dasar→MAHKOTA) · adaptif + BUKU-SALAH · kelas kilat 3 soal"
baru_c = "// V279-KORTEX-KESADARAN: 55 soal × 4 tingkat · adaptif + BUKU-SALAH · kelas kilat 3 soal · INDEKS KESADARAN 5 pilar (formula karangan-sendiri)"
if lama_c in html:
    html = html.replace(lama_c, baru_c)
    changed = True
    print('komentar versi init → v279')
elif baru_c in html:
    print('komentar versi sudah v279 — lewati.')
else:
    print('PERINGATAN: komentar versi tak ditemukan (non-fatal)')

if not changed:
    print('\nV279: TIDAK ADA perubahan — arena.html sudah v279 utuh (idempoten).')
else:
    ARENA.write_text(html, encoding='utf-8')
    print('\nV279: arena.html TERSISIP — disimpan.')

# ---------- 9) verifikasi ----------
html2 = ARENA.read_text(encoding='utf-8')
cek = {
    'blok otak V279': MARK in html2,
    'badge v279': 'OTAK AGENTIK · v279 · ' in html2,
    'teks 55 soal ×2': html2.count('55 soal · 7 fakultas · 4 tingkat') >= 2,
    'panel ikBox': 'id="ikBox"' in html2,
    'renderIndeks def+call': html2.count('renderIndeks') >= 4,
    'chip KORTEX barisan': 'kxChip' in html2 and 'KORTEX ${' in html2,
    'doktrin KORTEX-KESADARAN di blok': 'KORTEX-KESADARAN' in html2,
    'indeksKesadaran di blok': 'function indeksKesadaran' in html2,
}
ok = all(cek.values())
for k, v in cek.items():
    print(('  LULUS  ' if v else '  GAGAL  ') + k)
print('\nVERIFIKASI: ' + ('LULUS SEMUA' if ok else 'GAGAL'))
sys.exit(0 if ok else 1)
