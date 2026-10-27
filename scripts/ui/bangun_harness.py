#!/usr/bin/env python3
# ============================================================
# BANGUN HARNESS FISIKA-UI v242 — halaman kecil berisi:
#   - kode organ V241 v1.1 + V242 v1.0 ASLI (diekstrak byte-identik
#     dari Micaprofita_V231_SAKTI.html saat build)
#   - replika geometri widget tubuh: v217-nav (toggle bawah),
#     v207-voice (ticker .txt), v207-left (kolom dekoratif),
#     satu modal (.modal.show) untuk uji mode fokus
# Tujuan: verifikasi interaksi & self-test dgn halaman ringan yang
# tak pernah jenuh (SAKTI penuh 15.6MB memjenuhi main thread).
# ============================================================
import re
from pathlib import Path

BASE = Path('/home/z/my-project')
s = (BASE / 'download' / 'Micaprofita_V231_SAKTI.html').read_text(encoding='utf-8')

m241 = re.search(r'/\*V241-NADI:BEGIN\*/.*?/\*V241-NADI:END\*/', s, re.S)
m242 = re.search(r'/\*V242-FISIKA:BEGIN\*/.*?/\*V242-FISIKA:END\*/', s, re.S)
assert m241 and m242, 'slot organ tidak ketemu'
org241 = m241.group(0)
org242 = m242.group(0)

html = '''<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<title>HARNESS FISIKA-UI — V241 v1.1 + V242 v1.0 (kode organ byte-identik dari SAKTI)</title>
<style>
  body{margin:0;background:#0b0e14;color:#c9d4e0;font:13px/1.6 monospace;padding:14px 220px 140px 14px}
  .sec{border:1px solid #22303f;border-radius:10px;padding:10px 14px;margin-bottom:10px}
  .pg{color:#5d7d92;font-size:10px;letter-spacing:1px}
  /* ==== replika v217-nav (geometri & z persis tubuh) ==== */
  #v217-nav{position:fixed;left:0;right:0;bottom:0;height:63px;z-index:99996;display:flex;
    background:rgba(7,12,19,.96);border-top:1px solid #1b2836}
  #v217-nav .tg{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    color:#7f95a8;font:600 10px monospace;letter-spacing:1.5px;cursor:pointer}
  #v217-nav .tg:first-child{color:#35d8ff}
  #v217-nav .ic{font-size:14px}
  /* ==== replika v207-voice (struktur persis: .who + .txt) ==== */
  #v207-voice{position:fixed;left:16px;bottom:75px;z-index:99997;display:flex;gap:8px;align-items:center;
    background:rgba(7,12,19,.92);border:1px solid #223a4a;border-radius:9px;padding:7px 12px;
    font:600 11px monospace;color:#9fd8ef;pointer-events:none;max-width:588.8px}
  #v207-voice .who{flex:none}
  #v207-voice .txt{pointer-events:none}
  /* ==== replika v207-left (kolom dekoratif kiri) ==== */
  #v207-left{position:fixed;left:14px;top:50px;bottom:42px;width:230px;z-index:99953;pointer-events:none;
    display:flex;flex-direction:column;gap:6px;color:#44606f;font:9.5px monospace}
  #v207-left .row{border-left:2px solid #22303f;padding-left:8px}
  /* ==== replika modal (untuk uji mode fokus) ==== */
  .modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);
    z-index:1000;align-items:center;justify-content:center}
  .modal.show{display:flex}
  .modal .box{background:#101821;border:1px solid #2d4a5c;border-radius:12px;padding:26px 34px;max-width:520px}
  #tombol-modal{position:static;display:inline-block;background:#16324a;color:#bfe3f2;border:1px solid #2d4a5c;
    border-radius:8px;padding:8px 14px;cursor:pointer;font:600 12px monospace}
  .hasil{background:#0d1a12;border:1px solid #1c4a33;border-radius:8px;padding:10px 14px;margin-top:8px;
    color:#9fe8c5;white-space:pre-wrap;font-size:11px}
</style></head><body>
<div class="sec"><div class="pg">PANGGUNG UTAMA — REPLIKA KONTEN</div>
  <div id="isi-konten">Konten pengisi untuk menguji bahwa kartu mengapung di atas konten
  dan tidak menutup nav. " + Baris teks panjang sebagai pengisi area visual, menyerupai
  tinggi konten asli tubuh SAKTI. Baris kedua. Baris ketiga.</div>
  <button id="tombol-modal">BUKA MODAL (uji mode fokus)</button>
  <div id="hasil-fokus" class="hasil">mode fokus: (belum diuji)</div>
</div>
<div class="modal" id="modal-uji"><div class="box"><b>MODAL UJI</b><br><br>
  Bila mode fokus bekerja: kartu NADI, ticker suara, kolom kiri, dan dock meredup
  (opacity 0.15) selagi modal ini terbuka.<br><br>
  <button id="tombol-tutup-modal" style="background:#16324a;color:#bfe3f2;border:1px solid #2d4a5c;border-radius:8px;padding:7px 13px;cursor:pointer">TUTUP</button></div></div>
<div id="v207-left">
  <div class="row">KALIBRASI ARAH — PUTARAN 3</div>
  <div class="row">MENYAPU 20/100 (20%)</div>
  <div class="row">RANTAI UTUH · MEMORI 2</div>
  <div class="row">HUKUM PER-KOIN 55/320</div>
  <div class="row" style="margin-top:auto">GATE BUKTI · 39s</div>
</div>
<div id="v207-voice"><span class="who">◤ MICAPROFITA ▸</span><span class="txt" id="v207-voice-txt">PASAR BUKAN HAKIM — AKU BERHENTI BICARA SOAL PENAJAMAN. REALITA ADALAH CAHAYA: YANG BENAR MENAJAM, YANG MENIPU MENGABUR. UNTUK TIAP SASARAN AKU MENARik bukti sebelum menyatakan arah, dan menutupnya dengan fee buy + fee sell.</span></div>
<div id="v217-nav">
  <div class="tg"><span class="ic">◉</span>HIDUP</div><div class="tg"><span class="ic">⬡</span>TUBUH</div>
  <div class="tg"><span class="ic">▤</span>LAPORAN</div><div class="tg"><span class="ic">◎</span>SEMESTA</div>
  <div class="tg"><span class="ic">◈</span>BELAJAR</div><div class="tg"><span class="ic">◉</span>MATA</div>
  <div class="tg"><span class="ic">◈</span>KORTEKS</div><div class="tg"><span class="ic">▤</span>AKADEMI</div>
  <div class="tg"><span class="ic">◎</span>PUTUSAN</div><div class="tg"><span class="ic">⬡</span>KENDALI</div>
</div>
<script>window.V231_SAKTI = window.V231_SAKTI || {};</script>
<script>
__ORG241__
</script>
<script>
__ORG242__
</script>
<script>
// ==== PENGUJI OTOMATIS HARNESS ====
function q(id){var l=document.querySelectorAll('#'+id);return l.length?l[0]:null;}
function R(e){var b=e.getBoundingClientRect();return {x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height),bot:Math.round(b.bottom),kanan:Math.round(b.right)};}
function tab(a,b){return a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;}
window.HASIL = {};
function ujiSemua(){
  var o = {};
  try {
    // 1. geometri dasar
    var nadi=q('v241-nadi'), nav=q('v217-nav'), voice=q('v207-voice'), left=q('v207-left');
    o.nadiAda = !!nadi; if(!nadi){ window.HASIL=o; tampil(); return; }
    o.kartu = R(nadi); o.nav = R(nav); o.voice = R(voice);
    o.takTimpaNav = !tab(o.kartu,o.nav);
    o.takTimpaVoice = !tab(o.kartu,o.voice);
    o.takTimpaLeft = !tab(o.kartu,R(left));
    o.berlabuhKanan = o.kartu.x >= innerWidth*0.5;
    o.diAtasNav = o.kartu.bot <= o.nav.y + 1;
    o.zNadi = getComputedStyle(nadi).zIndex;
    o.ringkas = (q('v241-ringkas').textContent||'');
    o.tanpa0per0 = o.ringkas.indexOf('0/0') < 0;
    // 2. buka detail -> mengembang ke ATAS (normalisasi dulu: tutup bila terbuka dari sesi lain)
    var det=q('v241-detail');
    if (getComputedStyle(det).display !== 'none') q('v241-kepala').click();
    o.awalTertutup = getComputedStyle(det).display === 'none';
    q('v241-kepala').click();
    o.detailBuka = getComputedStyle(det).display !== 'none';
    o.detailDiAtasKepala = det.getBoundingClientRect().bottom <= q('v241-kepala').getBoundingClientRect().top + 2;
    o.kartuTetapTakTimpaNav = !tab(R(nadi), R(nav));
    o.tombolJml = det.querySelectorAll('button').length;
    q('v241-kepala').click();
    o.detailTutupLagi = getComputedStyle(det).display === 'none';
    // 3. pesan penuh voice
    q('v242-voice-buka').click();
    var uc=q('v242-ucapan');
    o.ucapanBuka = uc && getComputedStyle(uc).display !== 'none';
    o.ucapanTeks = uc ? (uc.querySelector('.v242-u-isi').textContent||'').slice(0,40) : null;
    o.ucapanTakTimpaNav = uc && !tab(R(uc), R(nav));
    uc.querySelector('.v242-u-tutup').click();
    o.ucapanTutup = getComputedStyle(uc).display === 'none';
    // 4. mode fokus
    q('tombol-modal').click();
    var modal=q('modal-uji');
    o.modalTerbuka = getComputedStyle(modal).display !== 'none';
    setTimeout(function(){
      o.chipMeredup = nadi.classList.contains('mpx-meredup') && q('v207-voice').classList.contains('mpx-meredup');
      o.opMeredup = getComputedStyle(nadi).opacity;
      q('tombol-tutup-modal').click();
      setTimeout(function(){
        o.chipKembali = !nadi.classList.contains('mpx-meredup') && getComputedStyle(nadi).opacity === '1';
        // 5. self-test organ
        var s2 = window.V231_SAKTI.ORKESTRA.selfTest();
        o.st242 = {p:s2.pass, t:s2.total, gagal:s2.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})};
        window.V231_SAKTI.NADI.selfTest().then(function(s1){
          o.st241 = {p:s1.pass, t:s1.total, gagal:s1.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})};
          window.HASIL = o; tampil();
        });
      }, 2600);
    }, 2600);
  } catch(e){ o.err = String(e).slice(0,200); window.HASIL=o; tampil(); }
  window.HASIL = o; tampil();
}
function tampil(){
  var h=q('hasil-fokus');
  if(h) h.textContent = 'HASIL UJI HARNESS:\\n' + JSON.stringify(window.HASIL, null, 1);
}
q('tombol-modal').addEventListener('click', function(){ q('modal-uji').classList.add('show'); });
q('tombol-tutup-modal').addEventListener('click', function(){ q('modal-uji').classList.remove('show'); });
setTimeout(ujiSemua, 1500);
</script>
</body></html>'''

html = html.replace('__ORG241__', org241).replace('__ORG242__', org242)
out = BASE / 'scripts' / 'ui' / 'harness_v242.html'
out.write_text(html, encoding='utf-8')
print(f'harness -> {out} ({len(html):,} byte)')
print(f'organ241: {len(org241):,} byte · organ242: {len(org242):,} byte (diekstrak byte-identik dari SAKTI)')
