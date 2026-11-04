#!/usr/bin/env python3
"""SISIP V273-SASARAN-PENUH ke arena.html (basis live GitHub Pages).
Idempoten: jika marker sudah ada, lewati.
1) CSS .pickwrap/.picklevel — baris level di bawah tiap pick.
2) renderBarisan() baru — entry/target/stop dari pulse match + badge cermin tertunda.
"""
import re, sys, pathlib

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
src = ARENA.read_text(encoding='utf-8')
awal = len(src)

if 'V273-SASARAN-PENUH' in src:
    print('SUDAH: marker V273 ada — lewati')
    sys.exit(0)

# ---------- 1) CSS ----------
css_anchor = ".pickrow .why{margin-left:auto;font-size:9.5px;color:var(--dim2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%}"
css_add = css_anchor + "\n/* V273-SASARAN-PENUH: level di bawah tiap pick */\n.pickwrap{padding:3px 0;border-bottom:1px dashed var(--line)}\n.pickwrap:last-child{border-bottom:none}\n.pickwrap .pickrow{padding:2.5px 0}\n.picklevel{font-size:9.8px;color:var(--dim2);padding:1px 0 2px 1px;display:flex;flex-wrap:wrap;gap:2px 8px;align-items:baseline;line-height:1.5}\n.picklevel .mono{color:var(--dim)}"
assert src.count(css_anchor) == 1, f'anchor CSS tak unik: {src.count(css_anchor)}'
src = src.replace(css_anchor, css_add)

# ---------- 2) renderBarisan ----------
m1 = src.index('// ---------- barisan hari ----------')
m2 = src.index('// ---------- stat ----------')
lama = src[m1:m2]
assert 'function renderBarisan()' in lama, 'renderBarisan tak ditemukan di rentang'

baru = '''// ---------- barisan hari ----------
// V273-SASARAN-PENUH: sasaran tak boleh tampil hanya sebagai nama —
// entry, sasaran (target), dan stop-loss menyertai setiap pick (dari rencana
// pra-registrasi di pulse). Rival jujur: tanpa rencana keluar. Cermin wadah
// yang tertunda diberi badge — kesadaran atas usia datanya sendiri.
function renderBarisan() {
  const hariUtc = new Date().toISOString().slice(0, 10);
  const tua = st.today && st.today !== hariUtc;
  $('#barisanDay').innerHTML = st.today ? `— ${esc(st.today)} UTC${tua ? ` · <span style="color:var(--amber2)" title="jantung wadah penyalur cermin belum denyut hari ini — data ditampilkan sebagaimana adanya, jujur">cermin tertunda (${esc(st.today)})</span>` : ''}` : '';
  const px = {};
  (((st.pulse || {}).items) || []).forEach((it) => { px[it.symbol] = it; });
  const n6 = (x) => (x == null || !isFinite(x)) ? '—' : (+x).toPrecision(6).replace(/(\\.\\d*?)0+$/, '$1').replace(/\\.$/, '');
  const levelLine = (p) => {
    const it = px[p.symbol];
    const r = it && it.rencana;
    if (r && r.entry) {
      const tp = r.targetPct != null ? `+${(+r.targetPct).toFixed(1)}%` : '—';
      const sp = r.stopPct != null ? `${(+r.stopPct).toFixed(1)}%` : '—';
      const pt = r.pTarget != null ? ` · P${Math.round(r.pTarget * 100)}%` : '';
      const ps2 = r.pStop != null ? ` · P${Math.round(r.pStop * 100)}%` : '';
      return `<div class="picklevel"><span class="mono">E ${n6(r.entry)} \\u2192 T ${n6(r.target)} (${tp}${pt}) \\u2192 S ${n6(r.stop)} (${sp}${ps2})</span>${r.netUntungPct != null ? `<span class="mono" style="color:${r.netUntungPct >= 0 ? 'var(--em2)' : 'var(--rose2)'}">NET ${r.netUntungPct >= 0 ? '+' : ''}${(+r.netUntungPct).toFixed(2)}%</span>` : ''}</div>`;
    }
    if (it && it.entryClose) {
      return `<div class="picklevel">entry <span class="mono">${n6(it.entryClose)}</span>${p.competitor === 'MICAPROFITA' ? ' · rencana pra-registrasi menyusul denyut penjaga' : ' · tanpa rencana keluar (rival kuant)'}</div>`;
    }
    return p.competitor === 'MICAPROFITA' ? '<div class="picklevel">menunggu denyut penjaga \\u2014 sasaran tak pernah tampil tanpa level</div>' : '';
  };
  const picks = st.todayPicks || [];
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
  $('#duelGrid').innerHTML = side('MICAPROFITA', 'mica') + side('AI_ANALIS', 'ai');
  $('#baseline').innerHTML = ['MOMENTUM','MEANREV','BNH_BTC','ACAK'].map((c) => {
    const meta = COMP[c];
    const ps = picks.filter((p) => p.competitor === c);
    const ringkas = ps.length ? ps.map((p) => `<b class="mono">${esc(p.symbol.replace('USDT',''))}</b><span style="color:${p.direction === 'BUY' ? 'var(--em2)' : 'var(--rose2)'}">${p.direction === 'BUY' ? '\\u2191' : '\\u2193'}</span>`).join(' ') : '\\u2026';
    return `<span class="b"><i style="background:${meta.color}"></i><span style="color:var(--dim2)">${meta.label}:</span>${ringkas}</span>`;
  }).join('');
}

'''
src = src[:m1] + baru + src[m2:]

ARENA.write_text(src, encoding='utf-8')
print(f'OK: {awal} -> {len(src)} byte (+{len(src)-awal})')
print('marker V273-SASARAN-PENUH:', src.count('V273-SASARAN-PENUH'))
