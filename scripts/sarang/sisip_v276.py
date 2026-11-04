#!/usr/bin/env python3
"""SISIP V276-MESIN-CUAN ke arena.html (basis live GitHub Pages).

Mandat pemilik: "belum berkembang sebagai mesin cuan profit pasti,
masih banyak keteledoran" — maka:
  1) Blok otak tertanam DIGANTI SELURUHNYA dengan otak_mandiri.js v276
     (gugus neuron CUAN 6 neuron baru + TOPIK.cuan + fakultas CUAN 7 soal
     + MRIT keteledoran + bukti hidup bukuCuan).
  2) Panel BUKU CUAN di tab Arena: hasil nyata rencana pra-registrasi
     (sasaran/stop/kedaluwarsa, after-fee 0.4%) — net kumulatif, win rate,
     ekspektansi, maxDD, keteledoran per rezim, entri terakhir.
  3) Badge otak v276 + teks statis sekolah 46 soal / 7 fakultas.
Idempoten — aman dijalankan berulang.
"""
import re, sys, pathlib

ARENA = pathlib.Path('/home/z/my-project/download/arena.html')
OTAK = pathlib.Path('/home/z/my-project/scripts/sarang/otak_mandiri.js')
MARK = 'V276-MESIN-CUAN'

html = ARENA.read_text(encoding='utf-8')
otak_js = OTAK.read_text(encoding='utf-8')
n_soal = len(re.findall(r"fakultas: '", otak_js))
n_fak = len(set(re.findall(r"fakultas: '([A-Z-]+)'", otak_js)))
changed = False

# ---------- 1) ganti blok otak tertanam (blok <script> PERTAMA) ----------
batas = re.compile(r'<script>\n(.*?)\n</script>', re.S)
m = batas.search(html)
if not m:
    print('GAGAL: blok script pertama tidak ditemukan'); sys.exit(1)
blok_lama = m.group(1)
if MARK in blok_lama and blok_lama.strip() == otak_js.strip():
    print('V276: blok otak sudah v276 terkini — lewati penggantian.')
else:
    if 'MICABRAIN' not in blok_lama:
        print('GAGAL: blok pertama bukan otak MICABRAIN — batal demi keamanan'); sys.exit(1)
    html = html[:m.start(1)] + otak_js.rstrip('\n') + html[m.end(1):]
    changed = True
    print(f'blok otak diganti: {len(blok_lama)} -> {len(otak_js)} char')

# ---------- 2) panel BUKU CUAN (HTML) di tab Arena, setelah panel Barisan ----------
pan_lama = """      <div class="duel" id="duelGrid"></div>
      <div class="baseline" id="baseline"></div>
    </div>
"""
pan_baru = """      <div class="duel" id="duelGrid"></div>
      <div class="baseline" id="baseline"></div>
    </div>

    <div class="panel" id="bukuCuanPanel" style="display:none;padding:0">
      <div class="head">
        <h4>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          BUKU CUAN — Hasil Nyata Rencana Pra-Registrasi <span class="tiny" style="font-weight:400">· dinilai candle hari-D · after-fee 0.4%</span>
        </h4>
        <span class="chip amb">V276 MESIN-CUAN</span>
      </div>
      <div id="bukuCuanBox" class="tiny" style="padding:12px 14px;line-height:1.7"></div>
    </div>
"""
if 'id="bukuCuanPanel"' in html:
    print('panel BUKU CUAN sudah ada — lewati.')
elif pan_lama not in html:
    print('GAGAL: titik sisip panel tidak ditemukan'); sys.exit(1)
else:
    html = html.replace(pan_lama, pan_baru, 1)
    changed = True
    print('panel BUKU CUAN ditambahkan')

# ---------- 3) renderBukuCuan() + panggilan di orkestra ----------
fn_old = "// ---------- orkestra ----------"
fn_new = """// V276-MESIN-CUAN — buku besar: setiap rencana pra-registrasi dinilai nyata
// candle hari-D (sasaran/stop/kedaluwarsa, after-fee 0.4%); keteledoran dihitung,
// tidak dipoles. Sumber: st.bukuCuan dari snapshot/live.
function renderBukuCuan() {
  const panel = $('#bukuCuanPanel'); if (!panel) return;
  const bc = st && st.bukuCuan; const m = bc && bc.metrik;
  if (!m || !m.totalPlan) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  const sgn = (v, d) => (v >= 0 ? '+' : '') + Number(v).toFixed(d === undefined ? 2 : d);
  const rows = (bc.entri || []).slice(-6).reverse().map((e) => `<div class="bcRow"><span class="mono bcDay">${esc(String(e.day || '').slice(5))}</span><span class="bcSt ${e.status === 'MENANG' ? 'men' : e.status === 'KALAH' ? 'kal' : 'ked'}">${esc(e.status)}</span><b class="mono">${esc(String(e.symbol || '').replace('USDT', ''))}</b><span class="dim">${esc(e.arah)} · via ${esc(String(e.via || '').toLowerCase())}</span><span class="mono ${e.netPct >= 0 ? 'up' : 'dn'}">${sgn(e.netPct)}%</span><span class="dim mono">${e.r !== null && e.r !== undefined ? sgn(e.r, 2) + 'R' : ''}</span><span class="dim">rezim ${esc(e.regime)} · k ${e.keyakinan}%</span></div>`).join('');
  const rezim = (m.perRegime || []).filter((r) => r.kalah > 0).map((r) => `<span class="bcKet"><b>${esc(r.regime)}</b> ${r.kalah} kalah/${r.n} · eks ${sgn(r.eksPct)}%</span>`).join(' ');
  const ber = (bc.berlangsung || []).map((b) => `<b>${esc(String(b.symbol || '').replace('USDT', ''))}</b> ${esc(b.arah)} (T ${b.targetPct !== null && b.targetPct !== undefined ? sgn(b.targetPct) + '%' : '—'} / S ${b.stopPct !== null && b.stopPct !== undefined ? b.stopPct + '%' : '—'})`).join(' · ');
  $('#bukuCuanBox').innerHTML = `
    <div class="bcGrid">
      <div class="bcStat"><p class="lab">Net kumulatif (majemuk)</p><p class="val ${m.netKumulatifPct >= 0 ? 'up' : 'dn'}">${sgn(m.netKumulatifPct)}%</p></div>
      <div class="bcStat"><p class="lab">Win rate (net&gt;0)</p><p class="val">${m.winRate !== null && m.winRate !== undefined ? Math.round(m.winRate * 100) + '%' : '—'}</p></div>
      <div class="bcStat"><p class="lab">Ekspektansi / rencana</p><p class="val ${m.ekspektansiR >= 0 ? 'up' : 'dn'}">${sgn(m.ekspektansiPct)}% <span class="tiny">${sgn(m.ekspektansiR)}R</span></p></div>
      <div class="bcStat"><p class="lab">Max drawdown</p><p class="val">−${Number(m.maxDrawdownPct).toFixed(2)}%</p></div>
    </div>
    <p class="bcBaris">${m.totalPlan} rencana dinilai · <span class="up">${m.menang} sasaran kena</span> · <span class="dn">${m.kalah} kena stop</span> · ${m.kedaluwarsa} kedaluwarsa (tetap kena fee) · runtunan <b class="mono">${esc(m.streak)}</b>${m.disiplinAktif ? ' · <span class="bcDis">DISIPLIN CUAN aktif s/d ' + esc(m.disiplinSampai) + ' — keyakinan −5</span>' : ''}</p>
    ${rezim ? `<p class="bcBaris"><b style="color:var(--rose2)">KETELEDORAN DIHITUNG:</b> ${rezim}</p>` : ''}
    ${rows ? `<div class="bcRows">${rows}</div>` : ''}
    ${ber ? `<p class="bcBaris">Berlangsung: ${ber} — dinilai saat candle tutup.</p>` : ''}
    <p class="dim" style="margin-top:7px">${esc(bc.kejujuran || '')}</p>`;
}

// ---------- orkestra ----------"""
if 'function renderBukuCuan' in html:
    print('renderBukuCuan sudah ada — lewati.')
elif fn_old not in html:
    print('GAGAL: anchor orkestra tidak ditemukan'); sys.exit(1)
else:
    html = html.replace(fn_old, fn_new, 1)
    changed = True
    print('renderBukuCuan ditambahkan')

call_old = "renderHeader(); renderNadir(); renderBarisan(); renderStat();"
call_new = "renderHeader(); renderNadir(); renderBarisan(); renderBukuCuan(); renderStat();"
if 'renderBarisan(); renderBukuCuan();' in html:
    print('panggilan renderBukuCuan sudah ada — lewati.')
elif call_old not in html:
    print('GAGAL: baris orkestra render tidak ditemukan'); sys.exit(1)
else:
    html = html.replace(call_old, call_new, 1)
    changed = True
    print('panggilan renderBukuCuan ditambahkan')

# ---------- 4) CSS buku cuan ----------
css_anchor = ".nchip{display:inline-block;margin:1px 3px 1px 0;padding:1.5px 7px;border:1px solid rgba(251,191,36,.35);border-radius:999px;font-size:9px;color:#fcd34d;background:rgba(251,191,36,.08)}"
css_new = css_anchor + """
/* V276-MESIN-CUAN: buku cuan */
.bcGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 8px}
.bcStat{border:1px solid rgba(63,63,70,.8);border-radius:9px;background:rgba(9,9,11,.6);padding:7px 10px}
.bcStat .lab{margin:0 0 2px;font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:#71717a}
.bcStat .val{margin:0;font-size:17px;font-weight:700;font-family:var(--mono)}
.bcBaris{margin:5px 0;font-size:10.5px;color:var(--tx2)}
.bcRows{margin:6px 0;border-top:1px dashed rgba(63,63,70,.7);padding-top:5px}
.bcRow{display:flex;flex-wrap:wrap;gap:2px 9px;align-items:baseline;font-size:10px;margin:3px 0}
.bcDay{color:#71717a}
.bcSt{font-weight:700;font-size:9px}
.bcSt.men{color:#34d399}.bcSt.kal{color:#fb7185}.bcSt.ked{color:#a1a1aa}
.bcKet{display:inline-block;margin:1px 8px 1px 0;font-size:10px;color:var(--tx2)}
.bcKet b{color:var(--tx1)}
.bcDis{color:#fb7185;font-weight:600}"""
if '.bcGrid' in html:
    print('CSS buku cuan sudah ada — lewati.')
elif css_anchor not in html:
    print('GAGAL: anchor CSS .nchip tidak ditemukan'); sys.exit(1)
else:
    html = html.replace(css_anchor, css_new, 1)
    changed = True
    print('CSS buku cuan ditambahkan')

# ---------- 5) badge otak v276 ----------
badge_old = 'OTAK AGENTIK · v275 · '
badge_new = 'OTAK AGENTIK · v276 · '
if badge_new in html:
    print('badge sudah v276 — lewati.')
elif badge_old in html:
    html = html.replace(badge_old, badge_new)
    changed = True
    print('badge otak → v276')
else:
    print('peringatan: badge v275 tidak ketemu')

# ---------- 6) teks statis sekolah ----------
rep = [
  ('SEKOLAH KILAT <span class="tiny" style="font-weight:400">· 39 soal · 6 fakultas · 3 tingkat · adaptif terlemah</span>',
   f'SEKOLAH KILAT <span class="tiny" style="font-weight:400">· {n_soal} soal · {n_fak} fakultas · 3 tingkat · adaptif terlemah</span>'),
  ('sekolah kilat-ku (39 soal · 6 fakultas · 3 tingkat) tetap jalan',
   f'sekolah kilat-ku ({n_soal} soal · {n_fak} fakultas · 3 tingkat) tetap jalan'),
]
for a, b in rep:
    if a in html:
        html = html.replace(a, b); changed = True; print('teks sekolah diperbarui:', b[:70])
    elif b in html or f'{n_fak} fakultas' in html:
        pass
    else:
        print('peringatan: teks sekolah tidak ketemu:', a[:50])

if changed:
    ARENA.write_text(html, encoding='utf-8')
    print(f'V276: sisip SELESAI — file {len(html)} char')
else:
    print('V276: tidak ada perubahan (sudah terpasang).')
