#!/usr/bin/env python3
"""SISIP V275-OTAK-AGENTIK ke arena.html (basis live GitHub Pages).

Mandat pemilik: "bertarung dengan agentic, bukan asal-asalan; neuronnya belum
terbentuk utuh; masih bodoh dalam kepahaman crypto" — maka:
  1) Blok otak tertanam DIGANTI SELURUHNYA dengan otak_mandiri.js v275
     (NEURON 44 neuron 6 gugus + LARIK PIKIR 4 langkah + fakultas KRIPTO-MAHIR).
  2) jawabLokal merender LARIK PIKIR + chip neuron; badge menjadi OTAK AGENTIK.
  3) Teks statis sekolah diperbarui (39 soal · 6 fakultas).
Idempoten — aman dijalankan berulang.
"""
import re, sys, pathlib

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
OTAK = pathlib.Path('/home/z/my-project/scripts/sarang/otak_mandiri.js')
MARK = 'V275-OTAK-AGENTIK'

html = ARENA.read_text(encoding='utf-8')
otak_js = OTAK.read_text(encoding='utf-8')
changed = False

# ---------- 1) ganti blok otak tertanam (blok <script> PERTAMA) ----------
batas = re.compile(r'<script>\n(.*?)\n</script>', re.S)
m = batas.search(html)
if not m:
    print('GAGAL: blok script pertama tidak ditemukan'); sys.exit(1)
blok_lama = m.group(1)
if MARK in blok_lama:
    print('V275: blok otak sudah v275 — lewati penggantian.')
else:
    if 'MICABRAIN' not in blok_lama:
        print('GAGAL: blok pertama bukan otak MICABRAIN — batal demi keamanan'); sys.exit(1)
    html = html[:m.start(1)] + otak_js.rstrip('\n') + html[m.end(1):]
    changed = True
    print(f'blok otak diganti: {len(blok_lama)} -> {len(otak_js)} char')

# ---------- 2) jawabLokal: render LARIK PIKIR + chip neuron + badge ----------
old_jawab = """  const jawabLokal = (alasan) => {
    const r = MICABRAIN.jawab(question, st, otak);
    simpanOtak(); renderTanyaKu();
    holder.innerHTML = `<div class="q"><p class="t">Pertanyaan</p><p class="b">${esc(question)}</p></div><div class="ans">
      <div class="who"><span class="av"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="14" height="12" rx="2"/><circle cx="12" cy="4" r="2"/><line x1="9" y1="13" x2="9" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/></svg></span><b>MICAPROFITA</b><span class="badge om">OTAK MANDIRI · tertanam · tanpa server</span></div>
      <div class="md">${md(r.teks)}</div>
      ${alasan ? `<p class="tiny" style="margin-top:6px">${esc(alasan)}</p>` : ''}
    </div>`;
  };"""

new_jawab = """  const jawabLokal = (alasan) => {
    const r = MICABRAIN.jawab(question, st, otak);
    simpanOtak(); renderTanyaKu();
    // V275-OTAK-AGENTIK: larik pikir 4 langkah + chip neuron — berpikir TAMPIL, bukan misteri
    const lar = r.larik;
    const larikHtml = (lar && lar.langkah) ? `<div class="larik"><p class="lt">LARIK PIKIR · agentik 4 langkah · ${lar.buktiN || 0} bukti hidup · ${lar.neuron.length} neuron menyala</p>${lar.langkah.map((l) => `<p class="ls"><b>${esc(l.n)}</b> — ${esc(l.t)}</p>`).join('')}${lar.neuron.length ? `<p class="ln">neuron: ${lar.neuron.map((n) => `<span class="nchip" title="gugus ${esc(n.kl)}">${esc(n.label)} ${n.a}%</span>`).join('')}</p>` : ''}</div>` : '';
    holder.innerHTML = `<div class="q"><p class="t">Pertanyaan</p><p class="b">${esc(question)}</p></div><div class="ans">
      <div class="who"><span class="av"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="14" height="12" rx="2"/><circle cx="12" cy="4" r="2"/><line x1="9" y1="13" x2="9" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/></svg></span><b>MICAPROFITA</b><span class="badge om">OTAK AGENTIK · v275 · ${MICABRAIN.NEURON.length} neuron · tanpa server</span></div>
      ${larikHtml}
      <div class="md">${md(r.teks)}</div>
      ${alasan ? `<p class="tiny" style="margin-top:6px">${esc(alasan)}</p>` : ''}
    </div>`;
  };"""

if old_jawab in html:
    html = html.replace(old_jawab, new_jawab)
    changed = True
    print('jawabLokal diperbarui (larik pikir + chip neuron)')
elif 'larikHtml' in html:
    print('jawabLokal sudah v275 — lewati.')
else:
    print('GAGAL: jawabLokal tidak ditemukan'); sys.exit(1)

# ---------- 3) CSS larik + chip ----------
css_old = '.pickwrap:last-child{border-bottom:none}'
css_new = css_old + """
/* V275-OTAK-AGENTIK: larik pikir + chip neuron */
.larik{margin:6px 0 8px;padding:7px 9px;border:1px solid rgba(148,163,184,.25);border-left:3px solid #fbbf24;border-radius:8px;background:rgba(24,24,27,.55)}
.larik .lt{margin:0 0 4px;font-size:9.5px;font-weight:700;letter-spacing:.08em;color:#fbbf24}
.larik .ls{margin:2px 0;font-size:10.5px;line-height:1.55;color:#d4d4d8}
.larik .ls b{color:#a1a1aa;font-weight:700}
.larik .ln{margin:5px 0 0;font-size:9.5px;color:#71717a}
.nchip{display:inline-block;margin:1px 3px 1px 0;padding:1.5px 7px;border:1px solid rgba(251,191,36,.35);border-radius:999px;font-size:9px;color:#fcd34d;background:rgba(251,191,36,.08)}"""
if css_old in html and '.nchip' not in html:
    html = html.replace(css_old, css_new)
    changed = True
    print('CSS larik + nchip ditambahkan')
elif '.nchip' in html:
    print('CSS sudah ada — lewati.')
else:
    print('GAGAL: titik sisip CSS tidak ditemukan'); sys.exit(1)

# ---------- 4) teks statis sekolah ----------
rep = [
  ('SEKOLAH KILAT <span class="tiny" style="font-weight:400">· 32 soal · 3 tingkat · adaptif terlemah</span>',
   'SEKOLAH KILAT <span class="tiny" style="font-weight:400">· ' + str(len(re.findall(r"fakultas: '", otak_js))) + ' soal · 6 fakultas · 3 tingkat · adaptif terlemah</span>'),
  ('sekolah kilat-ku (32 soal × 3 tingkat) tetap jalan', 'sekolah kilat-ku (39 soal · 6 fakultas · 3 tingkat) tetap jalan'),
]
for a, b in rep:
    if a in html:
        html = html.replace(a, b); changed = True; print('teks sekolah diperbarui:', b[:60])
    elif b in html or '6 fakultas' in html:
        pass
    else:
        print('peringatan: teks sekolah tidak ketemu:', a[:50])

if changed:
    ARENA.write_text(html, encoding='utf-8')
    print(f'V275: sisip SELESAI (delta {len(html) - len(html)} → file {len(html)} char)')
else:
    print('V275: tidak ada perubahan (sudah terpasang).')
