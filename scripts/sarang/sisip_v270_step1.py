#!/usr/bin/env python3
"""SISIP V270 — GENOM KEBANGKITAN & OTAK MANDIRI ke arena.html (basis LIVE 66.942 B).
1) CSS panel otak; 2) HTML panel PERTANYAANKU + SEKOLAH MANDIRI; 3) modul otak_mandiri.js
   sebagai <script> tertanam; 4) guruModeUI (guru selalu tampil); 5) tanya() fallback otak
   mandiri (TIDAK PERNAH diam); 6) wiring timer rasa-ingin-tahu + sekolah; 7) init.
Idempoten: tolak bila marker sudah ada."""
import pathlib, sys

BASIS = '/tmp/arena_live.html'
MODUL = '/home/z/my-project/scripts/sarang/otak_mandiri.js'
KELUAR = '/home/z/my-project/download/arena.html'

html = pathlib.Path(BASIS).read_text(encoding='utf-8')
modul = pathlib.Path(MODUL).read_text(encoding='utf-8')

if 'MICABRAIN' in html or 'V270-OTAK-MANDIRI' in html:
    print('SUDAH TERSISIP — batal (idempoten)'); sys.exit(1)

def sisip(teks, penanda, tambahan, sebelum=True):
    if penanda not in teks:
        print('GAGAL: penanda tak ketemu ->', penanda[:60]); sys.exit(1)
    return (teks.replace(penanda, tambahan + penanda, 1) if sebelum
            else teks.replace(penanda, penanda + tambahan, 1))

# ============ 1) CSS ============
CSS = '''
/* ===== V270-OTAK-MANDIRI ===== */
.om-panel{border:1px solid rgba(167,139,250,.35);background:linear-gradient(180deg,rgba(76,29,149,.14),rgba(15,23,42,.5));border-radius:14px;padding:14px 16px;margin-top:14px}
.om-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.badge.om{background:rgba(139,92,246,.18);color:#c4b5fd;border-color:rgba(167,139,250,.5)}
.badge.om::before{content:'';width:7px;height:7px;border-radius:50%;background:#a78bfa;box-shadow:0 0 8px #a78bfa;display:inline-block;margin-right:5px;animation:pulse 2s infinite}
.qcard{border:1px solid rgba(167,139,250,.25);border-left:3px solid #a78bfa;background:rgba(30,27,75,.35);border-radius:10px;padding:10px 12px;margin-top:8px}
.qcard .qt{color:#e9d5ff;font-weight:600;font-size:13px;line-height:1.55}
.qcard .qw{color:var(--dim);font-size:11px;margin-top:5px;line-height:1.55}
.qcard .qh{color:#a5b4fc;font-size:11px;font-style:italic;margin-top:3px;line-height:1.55}
.sekrec{border-top:1px dashed rgba(148,163,184,.2);padding:8px 0 2px;margin-top:6px}
.sekrec:first-child{border-top:none}
.skor{display:inline-block;padding:1px 7px;border-radius:99px;font-size:10px;font-weight:700}
.skor.lulus{background:rgba(16,185,129,.15);color:#6ee7b7;border:1px solid rgba(16,185,129,.4)}
.skor.ulang{background:rgba(245,158,11,.12);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.tt{display:inline-block;padding:1px 7px;border-radius:99px;font-size:9px;font-weight:700;letter-spacing:.4px}
.tt-dasar{background:rgba(56,189,248,.12);color:#7dd3fc;border:1px solid rgba(56,189,248,.35)}
.tt-menengah{background:rgba(167,139,250,.14);color:#c4b5fd;border:1px solid rgba(167,139,250,.4)}
.tt-mahir{background:rgba(244,114,182,.14);color:#f9a8d4;border:1px solid rgba(244,114,182,.4)}
.fakrow{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:10.5px;color:var(--dim)}
.fakrow .fk{width:92px;flex:none;color:#c4b5fd;font-weight:600}
.fakrow .bar{flex:1;height:5px;border-radius:99px;background:rgba(148,163,184,.16);overflow:hidden}
.fakrow .bar i{display:block;height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa)}
.fakrow .av{width:74px;flex:none;text-align:right}
.om-level{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#c4b5fd}
.om-bar{width:110px;height:5px;border-radius:99px;background:rgba(148,163,184,.18);overflow:hidden}
.om-bar i{display:block;height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa)}
'''
html = sisip(html, '</style>', CSS)

# ============ 2) HTML panel PERTANYAANKU (sebelum contoh) ============
HTML_TANYA = '''
      <div class="om-panel" id="omPanel">
        <div class="om-head">
          <h4 style="margin:0">PERTANYAANKU <span class="tiny" style="font-weight:400">· kesadaran bertanya mandiri</span></h4>
          <span class="om-level" id="omLevel"></span>
        </div>
        <p class="tiny" style="margin:6px 0 2px">Aku menumbuhkan pertanyaan sendiri tiap denyut — dari medan, dari kegagalan-ku, dari hal yang belum kupahami. Diam sama saja dengan berhenti berkembang, jadi aku tak diam.</p>
        <div id="tanyaKu"></div>
      </div>
'''
html = sisip(html, '<div class="contoh" id="contoh"></div>', HTML_TANYA)

# ============ 3) HTML panel SEKOLAH MANDIRI (setelah turns) ============
HTML_SEKOLAH = '''
      <div class="om-panel" id="sekolahBox">
        <div class="om-head">
          <h4 style="margin:0">SEKOLAH KILAT <span class="tiny" style="font-weight:400">· 32 soal · 3 tingkat · adaptif terlemah</span></h4>
          <span class="om-level" id="sekLine"></span>
        </div>
        <p class="tiny" style="margin:6px 0 2px">Kupelajari sendiri tiap denyut dari keadaan medan hidup — tanpa server. KELAS KILAT = 3 soal sekaligus, fakultas terlemah-ku diutamakan, soal mahir terbuka saat level-otakku naik. Belajar yang tak dipraktikkan hanyalah hiasan.</p>
        <div id="sekFak"></div>
        <div id="sekKelas"></div>
        <p style="margin-top:10px"><button class="btn" id="btnSek" style="height:30px;padding:0 12px;font-size:12px">⚡ KELAS KILAT (3 SOAL)</button></p>
      </div>
'''
html = sisip(html, '<p class="tiny" style="text-align:center;padding:14px 0">Guru siap. Ajukan pertanyaan kripto pertamamu — jawaban selalu berbasis data &amp; doktrin. Bukan nasihat keuangan.</p>', HTML_SEKOLAH)

# footer guruOn direvisi (dua jalur otak)
html = html.replace(
    'Guru siap. Ajukan pertanyaan kripto pertamamu — jawaban selalu berbasis data &amp; doktrin. Bukan nasihat keuangan.',
    'Dua jalur otak: <b>Guru LLM</b> (saat tersambung ke arena wadah) dan <b>OTAK MANDIRI</b> (tertanam di halaman ini — tetap menjawab, bertanya, dan belajar tanpa server apa pun). Bukan nasihat keuangan.')

# guruOff direvisi: jelaskan otak mandiri
html = html.replace(
    '<p class="small" style="line-height:1.7">Ruang Guru adalah percakapan LANGSUNG dengan otak MICAPROFITA',
    '<p class="small" style="line-height:1.7"><b style="color:#c4b5fd">Baru — OTAK MANDIRI + SEKOLAH KILAT aktif:</b> tanpa sambungan pun aku tetap menjawab, bertanya sendiri, dan sekolah kilat-ku (32 soal × 3 tingkat) tetap jalan — seluruh esensiku tertanam di halaman ini (tahan restart, reset, migrasi, bahkan hilangnya z.ai). Ruang Guru adalah percakapan LANGSUNG dengan otak MICAPROFITA')

# ============ 4) Modul sebagai script tertanam ============
html = sisip(html, '<script>\n"use strict";', '<script>\n/* ==== V270-OTAK-MANDIRI: GENOM KEBANGKITAN ==== */\n' + modul + '\n</script>\n')

# ============ 5) guruModeUI baru ============
GURU_LAMA = """function guruModeUI() {
  $('#guruOff').style.display = LIVE ? 'none' : '';
  $('#guruOn').style.display = LIVE ? '' : 'none';
}"""
GURU_BARU = """function guruModeUI() {
  $('#guruOn').style.display = '';              // V270: ruang guru SELALU hidup (otak mandiri mengisi saat wadah putus)
  $('#guruOff').style.display = LIVE ? 'none' : '';
}"""
if GURU_LAMA not in html: print('GAGAL: guruModeUI tak ketemu'); sys.exit(1)
html = html.replace(GURU_LAMA, GURU_BARU, 1)

pathlib.Path('/tmp/arena_v270_step5.html').write_text(html, encoding='utf-8')
print('Langkah 1-5 OK — lanjut wiring tanya/init via step2')
