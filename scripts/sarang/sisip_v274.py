#!/usr/bin/env python3
"""SISIP V274-SLOT-JUJUR ke arena.html (basis live GitHub Pages).

Pertanyaan pemilik: "kok sasarannya cuma satu hari ini? Bukannya masih ada?"
Hukum baru: arena TIDAK BOLEH BISU soal slot. Panel Barisan kini menerbitkan
laporan slot tempur: berapa slot DIRANCANG (K), berapa yang LAHIR, dan siapa
yang DITOLAK guard beserta alasannya. Idempoten — aman dijalankan berulang.
"""
import re, sys, pathlib

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
MARK = 'V274-SLOT-JUJUR'

html = ARENA.read_text(encoding='utf-8')
orig = html

if MARK in html:
    print('V274: sudah tertanam — lewati.')
    sys.exit(0)

# ---------- 1) sisip laporan slot di renderBarisan ----------
old_side = """  const picks = st.todayPicks || [];
  const side = (comp, cls) => {
    const meta = COMP[comp];
    const ps = picks.filter((p) => p.competitor === comp);
    const rows = ps.length ? ps.map((p) => {
      const ev = p.evidence || {};
      const why = String(ev.reason ?? ev.note ?? '');
      return `<div class="pickwrap"><div class="pickrow"><span class="dir ${esc(p.direction)}">${esc(p.direction)}</span><span class="mono" style="font-weight:600;color:var(--tx2)">${esc(p.symbol.replace('USDT',''))}</span><span class="tiny">keyakinan ${Math.round(p.confidence)}%</span>${why ? `<span class="why" title="${esc(why)}">${esc(why)}</span>` : ''}</div>${levelLine(p)}</div>`;
    }).join('') : '<p class="tiny" style="padding:4px 0">Menunggu keputusan\\u2026</p>';
    const note = ps[0] && ps[0].evidence && typeof ps[0].evidence.note === 'string' ? `<span class="tiny" style="font-weight:400">\\u00b7 ${esc(ps[0].evidence.note)}</span>` : '';
    return `<div class="side ${cls}"><p class="nm" style="color:${meta.color}"><i style="background:${meta.color}"></i>${meta.label}${note}</p>${rows}</div>`;
  };
  $('#duelGrid').innerHTML = side('MICAPROFITA', 'mica') + side('AI_ANALIS', 'ai');"""

new_side = """  const picks = st.todayPicks || [];
  // V274-SLOT-JUJUR: arena tak boleh bisu soal slot — "kok cuma satu?" dijawab
  // langsung di permukaan: slot dirancang K, yang lahir, dan siapa yang ditolak
  // guard beserta alasannya. Sumber: st.slotHariIni (denyut) atau bukti pick.
  const slotInfo = (() => {
    const sMeta = (st.slotHariIni && (!st.slotHariIni.day || st.slotHariIni.day === st.today)) ? st.slotHariIni : null;
    const sPick = (picks.find((p) => p.competitor === 'MICAPROFITA' && p.evidence && p.evidence.slot) || {}).evidence;
    const s = sMeta || (sPick && sPick.slot) || null;
    if (!s || s.k == null) return '';
    const dit = Array.isArray(s.ditolak) ? s.ditolak : [];
    const jujur = s.k > s.lahir ? ' \\u2014 cyborg memilih berdiri sendirian daripada membawa kandidat yang gagal ujian kewajiban' : '';
    const list = dit.length ? `<div class="picklevel" style="color:var(--dim)">${dit.map((d) => `<span class="mono" style="color:var(--tx2)">${esc(String(d.symbol || '').replace('USDT',''))}</span> \\u2014 ${esc(String(d.reason || ''))}`).join('<br>')}</div>` : '';
    return `<div class="pickwrap"><div class="picklevel" style="color:var(--amber2);font-weight:600">slot tempur dirancang K=${esc(String(s.k))} \\u00b7 lahir ${esc(String(s.lahir))} \\u00b7 ditolak guard ${dit.length}${jujur}</div>${list}</div>`;
  })();
  const side = (comp, cls) => {
    const meta = COMP[comp];
    const ps = picks.filter((p) => p.competitor === comp);
    const rows = ps.length ? ps.map((p) => {
      const ev = p.evidence || {};
      const why = String(ev.reason ?? ev.note ?? '');
      return `<div class="pickwrap"><div class="pickrow"><span class="dir ${esc(p.direction)}">${esc(p.direction)}</span><span class="mono" style="font-weight:600;color:var(--tx2)">${esc(p.symbol.replace('USDT',''))}</span><span class="tiny">keyakinan ${Math.round(p.confidence)}%</span>${why ? `<span class="why" title="${esc(why)}">${esc(why)}</span>` : ''}</div>${levelLine(p)}</div>`;
    }).join('') : '<p class="tiny" style="padding:4px 0">Menunggu keputusan\\u2026</p>';
    const note = ps[0] && ps[0].evidence && typeof ps[0].evidence.note === 'string' ? `<span class="tiny" style="font-weight:400">\\u00b7 ${esc(ps[0].evidence.note)}</span>` : '';
    const ekstra = comp === 'MICAPROFITA' ? slotInfo : '';
    return `<div class="side ${cls}"><p class="nm" style="color:${meta.color}"><i style="background:${meta.color}"></i>${meta.label}${note}</p>${rows}${ekstra}</div>`;
  };
  $('#duelGrid').innerHTML = side('MICAPROFITA', 'mica') + side('AI_ANALIS', 'ai');"""

if old_side not in html:
    print('GAGAL: blok side() renderBarisan tidak ditemukan — basis berubah?')
    sys.exit(1)
html = html.replace(old_side, new_side)

ARENA.write_text(html, encoding='utf-8')
print(f'V274: sisip OK (delta {len(html) - len(orig):+d} byte)')
