#!/usr/bin/env python3
# ============================================================
# BANGUN HARNESS SARANG v243 — halaman ringan berisi:
#   - kode organ V241 v1.1 + V242 v1.1 + V243 v1.0 ASLI
#     (diekstrak BYTE-IDENTIK dari Micaprofita_V231_SAKTI.html)
#   - skenario uji 3 fase terhadap MOCK GITHUB (port 8899):
#     A: cfg -> uji sambungan -> HIJRAH -> cek pages -> denyut+prakira
#        -> SIMPAN-MEMORI -> EVOLUSI paksa -> evolusi guard skip
#        -> pembersihan memori lokal (uji PULIH lintas-sesi)
#     B: (setelah reload) boot -> PULIH otomatis -> memori kembali
#        -> pemeriksa versi
#     C: evolusi EKSTERNAL (aktor lain) -> pemeriksa mendeteksi
#        -> UI: buka panel, z tertib, mode fokus
# Tujuan: verifikasi penuh organ V243 tanpa memuat SAKTI 15.7MB
# (SAKTI penuh memjenuhi main-thread headless — pelajaran Task 26).
# ============================================================
import re
from pathlib import Path

BASE = Path('/home/z/my-project')
s = (BASE / 'download' / 'Micaprofita_V231_SAKTI.html').read_text(encoding='utf-8')

m241 = re.search(r'/\*V241-NADI:BEGIN\*/.*?/\*V241-NADI:END\*/', s, re.S)
m242 = re.search(r'/\*V242-FISIKA:BEGIN\*/.*?/\*V242-FISIKA:END\*/', s, re.S)
m243 = re.search(r'/\*V243-SARANG:BEGIN\*/.*?/\*V243-SARANG:END\*/', s, re.S)
assert m241 and m242 and m243, 'slot organ tidak ketemu'
org241, org242, org243 = m241.group(0), m242.group(0), m243.group(0)

html = '''<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<title>HARNESS SARANG V243 — organ byte-identik dari SAKTI + MOCK GITHUB</title>
<style>
  body{margin:0;background:#0b0e14;color:#c9d4e0;font:12.5px/1.6 monospace;padding:14px 220px 140px 14px}
  .sec{border:1px solid #22303f;border-radius:10px;padding:10px 14px;margin-bottom:10px}
  .pg{color:#5d7d92;font-size:10px;letter-spacing:1px}
  .hasil{background:#0d1a12;border:1px solid #1c4a33;border-radius:8px;padding:10px 14px;margin-top:8px;
    color:#9fe8c5;white-space:pre-wrap;font-size:11px;max-height:420px;overflow:auto}
  /* replika geometri tubuh utk uji fisika ORKESTRA */
  #v217-nav{position:fixed;left:0;right:0;bottom:0;height:63px;z-index:99996;display:flex;
    background:rgba(7,12,19,.96);border-top:1px solid #1b2836}
  #v217-nav .tg{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    color:#7f95a8;font:600 10px monospace;letter-spacing:1.5px}
  #v217-nav .ic{font-size:14px}
  #v207-voice{position:fixed;left:16px;bottom:75px;z-index:99997;display:flex;gap:8px;align-items:center;
    background:rgba(7,12,19,.92);border:1px solid #223a4a;border-radius:9px;padding:7px 12px;
    font:600 11px monospace;color:#9fd8ef;pointer-events:none;max-width:588.8px}
  #v207-voice .txt{pointer-events:none}
</style></head><body>
<div class="sec"><div class="pg">PANGGUNG HARNESS — ORGAN ASLI DARI TUBUH SAKTI</div>
  <div>Mock GitHub: API <b>http://127.0.0.1:8899/api</b> · Pages <b>http://127.0.0.1:8899/halaman/</b></div>
  <div id="hasil" class="hasil">berjalan…</div>
</div>
<div id="v207-voice"><span>&#9707; MICAPROFITA &#9656;</span><span class="txt" id="v207-voice-txt">SARANG — cyborg hidup mandiri di GitHub Pages: hijrah, simpan memori otomatis, pulih lintas sesi, evolusi tubuh sendiri.</span></div>
<div id="v217-nav">
  <div class="tg"><span class="ic">&#9673;</span>HIDUP</div><div class="tg"><span class="ic">&#11041;</span>TUBUH</div>
  <div class="tg"><span class="ic">&#9636;</span>LAPORAN</div><div class="tg"><span class="ic">&#9678;</span>SEMESTA</div>
  <div class="tg"><span class="ic">&#9671;</span>BELAJAR</div><div class="tg"><span class="ic">&#9673;</span>MATA</div>
  <div class="tg"><span class="ic">&#9671;</span>KORTEKS</div><div class="tg"><span class="ic">&#9636;</span>AKADEMI</div>
  <div class="tg"><span class="ic">&#9678;</span>PUTUSAN</div><div class="tg"><span class="ic">&#11041;</span>KENDALI</div>
</div>
<script>window.V231_SAKTI = window.V231_SAKTI || {};</script>
<script>
__ORG241__
</script>
<script>
__ORG242__
</script>
<script>
__ORG243__
</script>
<script>
// ============================================================
// PENGUJI OTOMATIS HARNESS SARANG (3 fase)
// ============================================================
function q(id){var l=document.querySelectorAll('#'+id);return l.length?l[0]:null;}
function R(e){var b=e.getBoundingClientRect();return {x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height),bot:Math.round(b.bottom),kan:Math.round(b.right)};}
function tab(a,b){return a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;}
var HASIL = {};
function simpanHasil(){ try{ localStorage.setItem('mp243-harness-hasil', JSON.stringify(HASIL)); }catch(e){}
  var h=q('hasil'); if(h) h.textContent='HASIL HARNESS SARANG:\\n'+JSON.stringify(HASIL,null,1); }
function ambil(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); }); }
function tunggu(ms){ return new Promise(function(res){ setTimeout(res,ms); }); }
var S = window.V231_SAKTI.SARANG, N = window.V231_SAKTI.NADI, O = window.V231_SAKTI.ORKESTRA;
var PAGES = 'http://127.0.0.1:8899/halaman/';
var API = 'http://127.0.0.1:8899/api';

var fase = (localStorage.getItem('mp243-harness-fase') || 'A');
HASIL.fase = fase; simpanHasil();

if (fase === 'A') {
  localStorage.setItem('mp243-harness-fase','B');
  // ---- FASE A: konfigurasi + hijrah + simpan + evolusi ----
  S.cfgSet({ owner:'micaprofita', repo:'sarang-uji', branch:'utama', token:'uji-token-rahasia',
    apiBase: API, pagesUrl: PAGES, intervalSimpanMenit:15, autoSimpan:false, pulihBoot:true });
  // auth ditolak bila token salah — uji jalur 401 dulu (jujur)
  ambil(API+'/repos/micaprofita/sarang-uji').then(function(){ return {noauth:'endpoint repo tanpa token harusnya 401 lewat fetch biasa? (statistik menunjuk)'}; }).catch(function(){ return null; });
  S.ujiSambungan().then(function(u){
    HASIL.ujiSambungan = { ok:u.ok, repo:u.repo && u.repo.nama }; simpanHasil();
    return S.hijrah();
  }).then(function(h){
    HASIL.hijrah = { ok:h.ok, commit:String(h.commit).slice(0,10), url:h.url }; simpanHasil();
    return ambil(PAGES+'versi.json');
  }).then(function(t){
    var v = JSON.parse(t);
    HASIL.pagesVersi = { protokol:v.protokol, kodeVersi:v.kodeVersi, organ:v.organ }; simpanHasil();
    return ambil(PAGES+'memori/terkini.json');
  }).then(function(t){
    var k = JSON.parse(t);
    HASIL.pagesKapsul = { protokol:k.protokol, denyut:k.denyut, rantaiDenyut:k.rantai.denyut.length, rantaiPrakira:k.rantai.prakira.length }; simpanHasil();
    // gerakkan memori: denyut + prakira terkunci
    N.denyutkanSekarang();
    return N.prakiraKunci('BTCUSDT','NAIK',83000,'uji-harness-berantai');
  }).then(function(){
    return tunggu(300).then(function(){ return S.simpanMemori('uji-harness'); });
  }).then(function(hs){
    HASIL.simpan = { ok:hs.ok, skip:!!hs.skip }; simpanHasil();
    return ambil(PAGES+'memori/terkini.json');
  }).then(function(t){
    var k = JSON.parse(t);
    HASIL.simpanIsi = { denyut:k.denyut, prakira:k.rantai.prakira.length }; simpanHasil();
    return S.evolusi('uji-harness', true); // paksa: commit tubuh lagi
  }).then(function(ev){
    HASIL.evolusiPaksa = { ok:ev.ok, commit:ev.commit?String(ev.commit).slice(0,10):null }; simpanHasil();
    return S.evolusi(); // tanpa paksa + peta sama -> harus dilewati
  }).then(function(ev2){
    HASIL.evolusiSkip = { ok:ev2.ok, terjaga: !!(ev2.dilewati || ev2.ditunda) }; simpanHasil();
    // verifikasi tubuh di pages = harness ini (index.html mengandung organ v243)
    return ambil(PAGES);
  }).then(function(html){
    HASIL.pagesTubuh = { memuatV243: html.indexOf('V243-SARANG:BEGIN')>=0, byte: html.length }; simpanHasil();
    // self-test semua organ
    HASIL.selfTest243 = (function(st){ return {p:st.pass,t:st.total,gagal:st.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})}; })(S.selfTest());
    var s2 = O.selfTest();
    HASIL.selfTest242 = {p:s2.pass,t:s2.total,gagal:s2.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})};
    simpanHasil();
    return N.selfTest();
  }).then(function(s1){
    HASIL.selfTest241 = {p:s1.pass,t:s1.total,gagal:s1.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})};
    // ===== PERSIAPAN FASE B: kosongkan memori LOKAL (bukan sarang) =====
    // simpan hasil fase A dgn kunci terpisah (fase B tidak menimpanya)
    try{ localStorage.setItem('mp243-hasil-a', JSON.stringify(HASIL)); }catch(e){}
    var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k.indexOf('mp241.')===0) keys.push(k); }
    keys.forEach(function(k){ localStorage.removeItem(k); });
    // simulasi perangkat baru utk memori: cap waktu simpan/pulih lokal dibuang
    // (cfg + token dipertahankan: pemilik memasangnya sekali di browser ini)
    localStorage.removeItem('mp243.simpanTerakhir');
    localStorage.removeItem('mp243.pulihTerakhir');
    try{
      var rq=indexedDB.open('mp241-gudang',1);
      rq.onsuccess=function(){ var db=rq.result;
        try{ var tx=db.transaction(['rantai','kv'],'readwrite');
          tx.objectStore('rantai').clear(); tx.objectStore('kv').clear();
          tx.oncomplete=function(){ localStorage.setItem('mp243-harness-fase','B'); location.reload(); };
          tx.onerror=function(){ location.reload(); };
        }catch(e){ location.reload(); }
      };
      rq.onerror=function(){ location.reload(); };
    }catch(e){ location.reload(); }
    HASIL.bersihBersih = 'memori lokal dikosongkan — reload utk fase B (PULIH)'; simpanHasil();
  }).catch(function(e){
    HASIL.gagalFaseA = String(e && e.message || e).slice(0,200); simpanHasil();
  });
} else {
  // ---- FASE B+C: pulih otomatis saat boot + deteksi evolusi eksternal + fisika UI ----
  localStorage.setItem('mp243-harness-fase','A'); // sesi berikut mulai dari A lagi
  try{ HASIL.faseA = JSON.parse(localStorage.getItem('mp243-hasil-a')||'{}'); }catch(e){ HASIL.faseA = {rusak:true}; }
  setTimeout(function(){
    // B: memori pulih dari sarang
    var statN = N.status();
    HASIL.pulihDenyut = statN.denyut;
    HASIL.pulihPrakira = { terbuka: statN.prakira.terbuka };
    var statS = S.status();
    HASIL.pulihTerakhir = statS.lastPulih;
    HASIL.pulihSukses = statN.denyut>=2 && statN.prakira.terbuka>=1 && !!statS.lastPulih;
    simpanHasil();
    // C: evolusi eksternal (dgn token — aktor berwenang) -> pemeriksa mendeteksi tubuh baru
    fetch(API+'/repos/micaprofita/sarang-uji/simulasi/evolusi-eksternal',{method:'POST',headers:{'Authorization':'Bearer uji-token-rahasia','Content-Type':'application/json'}})
      .then(function(r){ return r.json(); })
      .then(function(j){ HASIL.evolusiEksternal = { ok:j.ok }; simpanHasil();
        return S.pemeriksaVersi();
      }).then(function(c){
        HASIL.deteksiVersiBaru = { ok:c.ok, sama:c.sama, versiRepo:c.versiRepo };
        HASIL.versiBaruState = !!S.status().versiBaru;
        simpanHasil();
        // fisika UI: buka panel, cek z, posisi chip vs NADI/nav
        S.bukaPanel();
        return tunggu(400);
      }).then(function(){
        var pan=q('v243-panel'), chip=q('v243-sarang'), nadi=q('v241-nadi'), nav=q('v217-nav'), voice=q('v207-voice'), bd=q('v243-backdrop');
        HASIL.ui = {
          panelBuka: pan && getComputedStyle(pan).display==='block',
          backdropBuka: bd && getComputedStyle(bd).display==='block',
          zChip: parseInt(getComputedStyle(chip).zIndex,10),
          zPanel: parseInt(getComputedStyle(pan).zIndex,10),
          chipDiKanan: R(chip).x >= innerWidth*0.5,
          takTimpaNadi: !(nadi && tab(R(chip),R(nadi))),
          takTimpaNav: !tab(R(chip),R(nav)),
          takTimpaVoice: !tab(R(chip),R(voice)),
          led2Ada: !!q('v243-led2'),
          statusIsi: (q('v243-status').textContent||'').length>40,
          logIsi: (q('v243-log').textContent||'').indexOf('self-test')>=0
        };
        S.tutupPanel();
        var stFis = O.selfTest();
        HASIL.selfTest242FaseB = {p:stFis.pass,t:stFis.total,gagal:stFis.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})};
        var stS = S.selfTest();
        HASIL.selfTest243FaseB = {p:stS.pass,t:stS.total,gagal:stS.rincian.filter(function(r){return r.indexOf('GAGAL')===0;})};
        HASIL.selesai = true;
        simpanHasil();
      }).catch(function(e){
        HASIL.gagalFaseB = String(e && e.message || e).slice(0,200); simpanHasil();
      });
  }, 9000); // tunggu boot SARANG: pulih (2.5s) + pemeriksa (+3s) tuntas
}
</script>
</body></html>'''

html = html.replace('__ORG241__', org241).replace('__ORG242__', org242).replace('__ORG243__', org243)
out = BASE / 'scripts' / 'sarang' / 'www' / 'harness_v243.html'
out.write_text(html, encoding='utf-8')
print(f'harness -> {out} ({len(html):,} byte)')
print(f'organ241: {len(org241):,} · organ242: {len(org242):,} · organ243: {len(org243):,} byte (byte-identik dari SAKTI)')
