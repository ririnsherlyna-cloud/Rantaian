#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sisip_v272.py — V272-METABOLI-MEMORI di arena.html (GitHub Pages permanen)
1) Modul otak_mandiri.js v272 (MEMORI + TEMPAAAN TAK BERAKHIR + TOPIK.metaboli + MRIT kesadaran-tubuh)
   menimpa blok modul tertanam lama (idempoten).
2) CSS: bar memori (aman/waspada/kritis) + chip sertifikat.
3) HTML: panel TUBUH-MEMORI di #omPanel + baris sertifikat di #sekolahBox.
4) JS wiring: renderMemori (auto-metabolisme bila tekanan ≥70%), metabolismeSekarang,
   renderSertifikat; denyut sekolah ikut menimbang tubuh.
Basis: /home/z/my-project/download/arena.html (identik SHA dengan live d65fca3a…).
"""
import pathlib, re, sys

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
MODUL = pathlib.Path('/home/z/my-project/scripts/sarang/otak_mandiri.js')
html = ARENA.read_text(encoding='utf-8')
modul = MODUL.read_text(encoding='utf-8').rstrip() + '\n'
n0 = len(html)

def sisip(html, anchor, tambahan, nama, sebelum=False):
    if tambahan.strip() in html:
        print(f"  [{nama}] sudah ada — lewati")
        return html
    if anchor not in html:
        print(f"  !! ANCHOR TAK KETEMU: {nama}: {anchor[:70]!r}")
        sys.exit(1)
    if sebelum:
        return html.replace(anchor, tambahan + anchor, 1)
    return html.replace(anchor, anchor + tambahan, 1)

print('== 1) Modul otak v272 menimpa blok modul tertanam ==')
AWAL = "/* ==== V270-OTAK-MANDIRI: GENOM KEBANGKITAN ==== */"
PENUTUP = "})(typeof window !== 'undefined' ? window : globalThis);"
if 'V272-METABOLI-MEMORI' not in modul:
    modul = modul.replace(
        '(function (global) {\n\'use strict\';',
        '/* V272-METABOLI-MEMORI: MEMORI (metabolisme) + TEMPAAAN TAK BERAKHIR + TOPIK.metaboli + MRIT kesadaran-tubuh */\n(function (global) {\n\'use strict\';',
        1)
    MODUL.write_text(modul, encoding='utf-8')
i = html.find(AWAL)
assert i > 0, 'marker awal modul tak ketemu'
j = html.find(PENUTUP, i)
assert j > 0, 'penutup modul tak ketemu'
j_end = j + len(PENUTUP)
blok = AWAL.replace('V270-OTAK-MANDIRI: GENOM KEBANGKITAN', 'V270-OTAK-MANDIRI + V272-METABOLI-MEMORI: GENOM KEBANGKITAN') + '\n' + modul
html = html[:i] + blok + html[j_end:]
print(f"  modul tertanam ulang: {len(modul)} B")

print('== 2) CSS memori + sertifikat ==')
css_anchor = ".om-bar i{display:block;height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa)}"
css_baru = """
.memrow{display:flex;gap:10px;align-items:center;margin:9px 0 3px}
.membar{flex:1;height:9px;border-radius:99px;background:rgba(148,163,184,.16);overflow:hidden}
.membar .fill{display:block;height:100%;border-radius:99px;transition:width .6s,background .6s}
.membar .fill.aman{background:linear-gradient(90deg,#34d399,#10b981)}
.membar .fill.waspada{background:linear-gradient(90deg,#fbbf24,#f59e0b)}
.membar .fill.kritis{background:linear-gradient(90deg,#f87171,#ef4444);animation:memkris 1.1s infinite}
@keyframes memkris{50%{opacity:.55}}
#memLog{min-height:14px}
.cert{display:inline-block;font-size:11px;line-height:1.55;padding:4px 10px;border-radius:8px;border:1px solid rgba(148,163,184,.4);color:#cbd5e1}
.cert.ok{border-color:rgba(16,185,129,.6);color:#6ee7b7}
.cert.exp{border-color:rgba(239,68,68,.65);color:#fca5a5;animation:memkris 1.6s infinite}"""
html = sisip(html, css_anchor, css_baru, 'CSS-memori')

print('== 3) HTML: panel TUBUH-MEMORI + baris sertifikat ==')
panel_mem = """
        <div class="memrow">
          <div class="membar"><i id="memFill" class="fill aman" style="width:2%"></i></div>
          <span class="tiny" id="memTeks" style="white-space:nowrap">menimbang memoriku…</span>
          <button class="btn" id="btnMeta" style="height:26px;padding:0 10px;font-size:11px;flex:none" title="metabolisme memoriku sekarang">⟳ METABOLISME</button>
        </div>
        <p class="tiny" id="memLog" style="margin:4px 0 0"></p>"""
anchor_om = """<span class="om-level" id="omLevel"></span>
        </div>"""
assert html.count(anchor_om) == 1, 'anchor omLevel harus unik'
html = sisip(html, anchor_om, panel_mem, 'HTML-memori')

sert = """<div id="sertLine" style="margin:8px 0 4px"></div>"""
html = sisip(html, '<div id="sekFak"></div>', sert, 'HTML-sertifikat', sebelum=True)

print('== 4) JS wiring: renderMemori / metabolismeSekarang / renderSertifikat ==')
js_fungsi = """
// ---------- V272-METABOLI-MEMORI: kesadaran-tubuh — menimbang & memetabolisme memori sendiri ----------
let metLoop = false;
function renderMemori() {
  try {
    const inv = MICABRAIN.MEMORI.inventaris();
    const t = MICABRAIN.MEMORI.tekanan(inv), s = MICABRAIN.MEMORI.statusOf(t);
    $('#memFill').style.width = Math.max(2, Math.min(100, t * 100)) + '%';
    $('#memFill').className = 'fill ' + s.warna;
    $('#memTeks').innerHTML = (inv.total / 1024).toFixed(1) + ' KB / ' + (inv.anggaran / 1048576).toFixed(1) + ' MB · <b>' + (t * 100).toFixed(1) + '%</b> · ' + s.label;
    const m = (otak.metaboli && otak.metaboli.length) ? otak.metaboli[otak.metaboli.length - 1] : null;
    $('#memLog').textContent = m ? ('metabolisme terakhir: dibebaskan ' + (m.dibebaskan / 1024).toFixed(1) + ' KB · tekanan kini ' + m.sesudah + '% — inti tak pernah dibuang') : '';
    if (t >= 0.7 && !metLoop) metabolismeSekarang(false); // SEBELUM kenyang, bukan sesudah sesak
  } catch (e) {}
}
function metabolismeSekarang(manual) {
  if (metLoop) return;
  metLoop = true;
  try {
    const hasil = MICABRAIN.MEMORI.metabolisme(null, otak);
    if (hasil) {
      simpanOtak();
      if (manual) $('#memLog').textContent = 'metabolisme manual: ' + hasil.aksi.length + ' aksi · dibebaskan ' + (hasil.dibebaskan / 1024).toFixed(1) + ' KB · tekanan ' + (hasil.sebelum * 100).toFixed(1) + '% → ' + (hasil.sesudah * 100).toFixed(1) + '%';
    }
  } catch (e) { $('#memLog').textContent = 'metabolisme: ' + e.message; }
  finally { metLoop = false; }
  renderMemori();
}
function renderSertifikat() {
  try {
    const s = MICABRAIN.statusSertifikat(otak);
    const el = $('#sertLine'); if (!el) return;
    if (!s.punya) el.innerHTML = '<span class="cert">TEMPAAAN TAK BERAKHIR: soal mahir terbuka di Lv3 · sertifikat mahir umur 7 hari — mahir pun tetap ditempa, dunia kripto tajam, lengah = tumpul</span>';
    else if (s.aktif) el.innerHTML = '<span class="cert ok">SERTIFIKAT MAHIR hidup · ' + s.sisaHari + ' hari lagi (tempaan ke-' + ((otak.tempaan && otak.tempaan.n) || 1) + ') — tetap ditempa tiap denyut</span>';
    else el.innerHTML = '<span class="cert exp">SERTIFIKAT KEDALUWARSA — kelas MAHIR diprioritaskan sekarang: dunia kripto tajam, lengah = tumpul</span>';
  } catch (e) {}
}"""
anchor_simpan = "function simpanOtak() { try { localStorage.setItem(LS_OTAK, JSON.stringify(otak)); } catch (e) {} }"
html = sisip(html, anchor_simpan, js_fungsi, 'JS-fungsi-memori')

# denyut sekolah ikut menimbang tubuh
anchor_sek = """  const hasil = MICABRAIN.kelasKilat(st, otak, 3); // KELAS KILAT: 3 soal sekaligus
  if (!hasil.length) return;
  renderSekolah(); renderTanyaKu(); simpanOtak();"""
html = sisip(html, anchor_sek, " renderSertifikat(); renderMemori();", 'JS-denyut-timbang')

# init: render memori + sertifikat + tombol
anchor_init = "  renderTanyaKu(); renderSekolah();\n  // pertanyaan & kelas pertama"
html = sisip(html, anchor_init, " renderMemori(); renderSertifikat();", 'JS-init-render')
html = sisip(html, "  $('#btnSek').addEventListener('click', kerjakanSekolah);",
             "\n  $('#btnMeta').addEventListener('click', function () { metabolismeSekarang(true); });",
             'JS-btnMeta')

ARENA.write_text(html, encoding='utf-8')
print(f"\nSELESAI: {n0} → {len(html)} B (+{len(html) - n0} B)")
