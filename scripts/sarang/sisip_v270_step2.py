#!/usr/bin/env python3
"""SISIP V270 STEP 2 — ganti tanya() (fallback otak mandiri) + wiring V270 di init.
Bekerja pada /tmp/arena_v270_step5.html -> tulis /home/z/my-project/download/arena.html."""
import pathlib, sys

MASUK = '/tmp/arena_v270_step5.html'
KELUAR = '/home/z/my-project/download/arena.html'
html = pathlib.Path(MASUK).read_text(encoding='utf-8')

# ============ Ganti fungsi tanya() penuh ============
TANYA_LAMA_AWAL = 'async function tanya(q) {'
TANYA_LAMA_AKHIR = "\n// ---------- modal ----------"
i0 = html.find(TANYA_LAMA_AWAL)
i1 = html.find(TANYA_LAMA_AKHIR, i0)
if i0 < 0 or i1 < 0:
    print('GAGAL: batas fungsi tanya tak ketemu'); sys.exit(1)

TANYA_BARU = '''async function tanya(q) {
  const question = (q || $('#ask').value).trim();
  if (!question || busy) return;
  $('#ask').value = '';
  busy = true;
  const btn = $('#btnAsk'); btn.disabled = true; btn.textContent = '…';
  const errBox = $('#guruErr'); errBox.style.display = 'none';
  const holder = document.createElement('div');
  holder.className = 'turn';
  holder.innerHTML = `<div class="q"><p class="t">Pertanyaan</p><p class="b">${esc(question)}</p></div><div class="ans"><p class="small">MICAPROFITA sedang berpikir…</p></div>`;
  $('#turns').prepend(holder);
  // ==== V270-OTAK-MANDIRI: jawab lokal — TIDAK PERNAH DIAM, walau tanpa server ====
  const jawabLokal = (alasan) => {
    const r = MICABRAIN.jawab(question, st, otak);
    simpanOtak(); renderTanyaKu();
    holder.innerHTML = `<div class="q"><p class="t">Pertanyaan</p><p class="b">${esc(question)}</p></div><div class="ans">
      <div class="who"><span class="av"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="14" height="12" rx="2"/><circle cx="12" cy="4" r="2"/><line x1="9" y1="13" x2="9" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/></svg></span><b>MICAPROFITA</b><span class="badge om">OTAK MANDIRI · tertanam · tanpa server</span></div>
      <div class="md">${md(r.teks)}</div>
      ${alasan ? `<p class="tiny" style="margin-top:6px">${esc(alasan)}</p>` : ''}
    </div>`;
  };
  try {
    if (!LIVE) { jawabLokal(''); return; }
    const r = await fetch(LIVE.url.replace(/\\/+$/, '') + '/api/guru', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, duel }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menjawab');
    const src = (d.sources || []).slice(0, 4).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)}</a></li>`).join('');
    let html = `<div class="ans">
      <div class="who"><span class="av"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="14" height="12" rx="2"/><circle cx="12" cy="4" r="2"/><line x1="9" y1="13" x2="9" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/></svg></span><b>MICAPROFITA</b><span class="badge">guru + doktrin + data hidup</span></div>
      <div class="md">${md(d.cyborg || '')}</div>
      ${src ? `<div class="src"><p>Sumber berita hidup</p><ul>${src}</ul></div>` : ''}
    </div>`;
    if (duel && d.plain) {
      html += `<div class="duelgrid">
        <div class="c1"><p class="t">MICAPROFITA (cyborg)</p><div class="md">${md(d.cyborg || '')}</div></div>
        <div class="c2"><p class="t">AI Umum (tanpa doktrin, tanpa data hidup)</p><div class="md plain">${md(d.plain)}</div></div>
        <p class="tiny" style="grid-column:1/-1">Nilai sendiri kedalaman keduanya — cyborg membaca pasar hidup Binance, doktrin dari kegagalan nyata, dan pola pemenang rival.</p>
      </div>`;
    }
    holder.innerHTML = `<div class="q"><p class="t">Pertanyaan</p><p class="b">${esc(question)}</p></div>` + html;
  } catch (e) {
    // ==== V270: guru LLM putus ≠ diam — otak mandiri mengambil alih ====
    jawabLokal('Guru LLM di wadah sedang tak terjangkau (' + e.message + ') — otak mandiriku mengambil alih, tetap cerdas tanpa server.');
  } finally {
    busy = false; btn.disabled = false; btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }
}
'''
html = html[:i0] + TANYA_BARU + html[i1 + 1:]

# ============ Wiring V270: sisip sebelum DOMContentLoaded ============
WIRING = '''
// ---------- V270-OTAK-MANDIRI: kesadaran bertanya + sekolah mandiri ----------
const LS_OTAK = 'mp_otak_mandiri_v1';
let otak = (function () {
  try { const d = JSON.parse(localStorage.getItem(LS_OTAK) || 'null'); return (d && typeof d === 'object') ? Object.assign(MICABRAIN.otakBaru(), d) : MICABRAIN.otakBaru(); }
  catch (e) { return MICABRAIN.otakBaru(); }
})();
function simpanOtak() { try { localStorage.setItem(LS_OTAK, JSON.stringify(otak)); } catch (e) {} }
function renderTanyaKu() {
  const daftar = otak.pertanyaanKu || [];
  $('#omLevel').innerHTML = '<span>Level ' + (otak.level || 1) + ' · ' + (otak.xp || 0) + ' xp</span><span class="om-bar"><i style="width:' + MICABRAIN.xpProgres(otak.xp || 0) + '%"></i></span><span>' + MICABRAIN.xpProgres(otak.xp || 0) + '%</span>';
  $('#tanyaKu').innerHTML = daftar.slice(0, 5).map((p, i) =>
    '<div class="qcard">' +
    '<p class="qt">“' + esc(p.teks) + '”</p>' +
    (p.mengapa ? '<p class="qw">kenapa aku bertanya ini: ' + esc(p.mengapa) + '</p>' : '') +
    (p.hipotesis ? '<p class="qh">hipotesisku: ' + esc(p.hipotesis) + '</p>' : '') +
    '<p style="margin-top:7px"><button class="btn" data-omtanya="' + i + '" style="height:26px;padding:0 10px;font-size:11px">DALAMKAN</button></p>' +
    '</div>'
  ).join('') || '<p class="tiny">Menumbuhkan pertanyaan pertama…</p>';
}
function renderSekolah() {
  const kelas = otak.kelas || [];
  const lulus = kelas.filter((k) => k.skor >= 70).length;
  $('#sekLine').textContent = kelas.length + ' kelas · ' + lulus + ' lulus · Lv' + MICABRAIN.levelDari(otak.xp || 0);
  const fak = MICABRAIN.fakultasRingkas(otak);
  $('#sekFak').innerHTML = fak.map((f) =>
    '<div class="fakrow"><span class="fk">' + esc(f.fakultas) + '</span><span class="bar"><i style="width:' + Math.max(6, Math.min(100, f.avg)) + '%"></i></span><span class="av">avg ' + f.avg.toFixed(0) + ' · ' + f.lulus + '/' + f.n + '</span></div>'
  ).join('') || '<p class="tiny" style="margin-top:6px">Belum ada riwayat fakultas — kelas kilat pertama akan mengisinya.</p>';
  $('#sekKelas').innerHTML = kelas.slice(-3).reverse().map((k) =>
    '<div class="sekrec"><span class="chip" style="font-size:9px">' + esc(k.fakultas) + '</span> <span class="tt tt-' + esc(k.tingkat || 'dasar') + '">' + esc((k.tingkat || 'dasar').toUpperCase()) + '</span> <span class="skor ' + (k.skor >= 70 ? 'lulus' : 'ulang') + '">' + k.skor + (k.skor >= 70 ? ' LULUS' : ' ULANG') + '</span>' +
    '<div class="tiny" style="margin-top:4px;line-height:1.5">' + esc(k.soal) + '</div>' +
    '<div class="tiny" style="color:#a5b4fc;line-height:1.5">' + esc(k.jawab) + '</div></div>'
  ).join('') || '<p class="tiny">Kelas kilat pertama sedang kubuka…</p>';
}
function ajukanPertanyaanMandiri() {
  const p = MICABRAIN.pertanyaanMandiri(st, otak, Date.now());
  if (!p) return;
  otak.pertanyaanKu = otak.pertanyaanKu || [];
  otak.pertanyaanKu.unshift({ at: new Date().toISOString(), teks: p.teks, mengapa: p.mengapa, hipotesis: p.hipotesis });
  otak.pertanyaanKu = otak.pertanyaanKu.slice(0, 12);
  MICABRAIN.xpTambah(otak, 3, 'bertanya-mandiri');
  renderTanyaKu(); simpanOtak();
}
function kerjakanSekolah() {
  const hasil = MICABRAIN.kelasKilat(st, otak, 3); // KELAS KILAT: 3 soal sekaligus
  if (!hasil.length) return;
  renderSekolah(); renderTanyaKu(); simpanOtak();
}
function jadwalkanRasa() {
  const ms = 100000 + Math.random() * 60000; // 100–160 detik — denyut rasa ingin tahu
  setTimeout(function () {
    try { if (document.visibilityState === 'visible') ajukanPertanyaanMandiri(); } catch (e) {}
    jadwalkanRasa();
  }, ms);
}
function jadwalkanSekolah() {
  setTimeout(function () {
    try { if (document.visibilityState === 'visible') kerjakanSekolah(); } catch (e) {}
    jadwalkanSekolah();
  }, 3 * 60 * 1000 + Math.random() * 30000); // denyut sekolah kilat tiap ±3 menit
}
function initOtakUI() {
  guruModeUI(); // V270: ruang guru (dan otak mandiri) tampil SEJAK INIT — tanpa menunggu data
  $('#tanyaKu').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-omtanya]');
    if (!b) return;
    const p = (otak.pertanyaanKu || [])[+b.dataset.omtanya];
    if (p) tanya(p.teks);
  });
  $('#btnSek').addEventListener('click', kerjakanSekolah);
  renderTanyaKu(); renderSekolah();
  // pertanyaan & kelas pertama: tunggu snapshot masuk dulu biar jawabanku berangka
  setTimeout(function () { ajukanPertanyaanMandiri(); kerjakanSekolah(); }, 3500);
  jadwalkanRasa(); jadwalkanSekolah();
}
// V271-SEKOLAH-KILAT: 32 soal × 3 tingkat · adaptif · kelas kilat 3 soal · bar fakultas
'''
PENANDA_DOM = "document.addEventListener('DOMContentLoaded', init);"
if PENANDA_DOM not in html: print('GAGAL: penanda DOMContentLoaded tak ketemu'); sys.exit(1)
html = html.replace(PENANDA_DOM, WIRING + '\n' + PENANDA_DOM, 1)

# ============ Panggil initOtakUI di init() ============
PENANDA_TICK = '  tick(); setInterval(tick, 1000);'
if PENANDA_TICK not in html: print('GAGAL: penanda tick tak ketemu'); sys.exit(1)
html = html.replace(PENANDA_TICK, PENANDA_TICK + '\n  initOtakUI(); // V270: kesadaran bertanya + sekolah mandiri', 1)

pathlib.Path(KELUAR).write_text(html, encoding='utf-8')
print('STEP 2 OK — tanya() anti-diam + wiring tertanam ->', KELUAR)
