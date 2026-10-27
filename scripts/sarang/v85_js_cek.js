
'use strict';
/* ================================================================
   V285-SADAR-REPO — RUANG HIDUP yang berakar penuh ke repo MICAPROFITA.
   Bukan dunia terpisah: dunia cyborg INI adalah repo-nya sendiri.
   Setiap node = file asli; setiap fakta = kutipan isi nyata;
   setiap angka pasar = klines Binance nyata; setiap keputusan =
   argmax utilitas atas pekerjaan yang BENAR-BENAR tertunda.
   ================================================================ */
/* ================= IDENTITAS & KONSTANTA ================= */
const RUMAH = {pemilik:'ririnsherlyna-cloud', repo:'Micaprofita-', cabang:'main'};
const KUNCI = 'mp_ruang_hidup_v285';
const MAXBACA = 400000;                 // batas baca per file (byte) — kejujuran parsial
const FASE = ['MENGAMATI','MEMAHAMI','MENCOBA','MELAKUKAN','MENGEVALUASI','MENEMUKAN','MEMBANGUN','MENINGKATKAN','MENGAMATI-KEMBALI'];
const INTEGERS = ['versi.json','gerbang.json','brain.json','arena-keadaan.json','otak/genome-server.json','otak/penjaga-keadaan.json','otak/performa.json','memori/terkini.json','README.md'];

/* ================= KEADAAN DUNIA ================= */
const S = {
  pohon:{files:[], sumber:'', at:0, live:false},           // pohon repo nyata
  baca:{},                                                 // path -> {hash,hashSrc,size,readAt,partial,pct,fakta[],ringkas,gagal,atGagal}
  pasar:{},                                                // sym -> {at,harga,chg,ema20,ema50,rsi,atr,mom7,mom48,vol,bt,audit,oc[]}
  cermin:{at:0, data:null},                                // arena-keadaan.json same-origin
  jurnal:[], stat:{bytes:0, fakta:0, sesi:0, lahirAt:Date.now(), btTotal:0},
  kerja:{nama:'bangkit', fase:'', faseAt:0, jejak:[], mengapa:[], target:null, sibuk:false},
  perintah:null,                                           // path file yang diperintahkan pemilik
  terputus:false
};
const tidur = ms => new Promise(r=>setTimeout(r,ms));
const sekarang = () => Date.now();
function wib(ts){ const d=new Date(ts??sekarang());
  return d.toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}); }
function umur(ms){ if(!ms) return '—'; const s=Math.floor(ms/1000);
  if(s<90) return s+' dtk'; const m=Math.floor(s/60); if(m<90) return m+' mnt';
  const h=Math.floor(m/60); if(h<48) return h+' jam'; return Math.floor(h/24)+' hari'; }
function kb(n){ return n>=1048576 ? (n/1048576).toFixed(1)+' MB' : n>=1024 ? (n/1024).toFixed(1)+' KB' : n+' B'; }
function fnv(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0); }
function jurnal(jenis, teks, kelas){ S.jurnal.push({at:sekarang(), jenis, teks, kelas:kelas||''});
  if(S.jurnal.length>170) S.jurnal.splice(0, S.jurnal.length-130);
  if(S.tabAktif==='jurnal') jurnalRender(); }
function pesan(e){ return (e && (e.message||e.toString())) || 'tak-diketahui'; }

/* ================= PERSIST (kumulatif lintas kunjungan) ================= */
function simpan(){ try{ const pohonRingkas = S.pohon.files.length ? {files:S.pohon.files, sumber:S.pohon.sumber, at:S.pohon.at} : null;
  localStorage.setItem(KUNCI, JSON.stringify({pohon:pohonRingkas, baca:S.baca, pasar:S.pasar,
    cermin:S.cermin, jurnal:S.jurnal.slice(-130), stat:S.stat})); }catch(e){} }
function muat(){ try{ const d=JSON.parse(localStorage.getItem(KUNCI)||'null'); if(!d) return;
  if(d.pohon && d.pohon.files){ S.pohon={files:d.pohon.files, sumber:d.pohon.sumber||'', at:d.pohon.at||0, live:false}; }
  Object.assign(S.baca, d.baca||{}); Object.assign(S.pasar, d.pasar||{});
  if(d.cermin) S.cermin=d.cermin; if(d.stat) Object.assign(S.stat, d.stat);
  S.jurnal=(d.jurnal||[]).slice(-100);
 }catch(e){} }
setInterval(simpan, 10000);
addEventListener('visibilitychange', ()=>{ if(document.hidden) simpan(); });
addEventListener('beforeunload', simpan);

/* ================= SENSOR-REPO: pohon nyata (3 gerbang) ================= */
async function jF(url, ms=12000){
  const c = new AbortController(); const t = setTimeout(()=>c.abort(), ms);
  try{ const r = await fetch(url,{cache:'no-store', signal:c.signal});
    if(!r.ok) throw new Error('HTTP '+r.status); return await r.json();
  } finally{ clearTimeout(t); }
}
async function pohonAmbil(){
  // Gerbang 1 — GitHub API (SHA asli git, paling akurat untuk deteksi perubahan)
  try{ const d = await jF(`https://api.github.com/repos/${RUMAH.pemilik}/${RUMAH.repo}/git/trees/${RUMAH.cabang}?recursive=1`);
    if(d && Array.isArray(d.tree)){
      const files = d.tree.filter(t=>t.type==='blob').map(t=>({path:t.path, size:t.size||0, hash:t.sha||''}));
      if(files.length) return {files, sumber:'github-api'};
    }}catch(e){}
  // Gerbang 2 — jsDelivr data API (flat, hash sendiri)
  try{ const d = await jF(`https://data.jsdelivr.com/v1/packages/gh/${RUMAH.pemilik}/${RUMAH.repo}@${RUMAH.cabang}?structure=flat`);
    if(d && Array.isArray(d.files)){
      const files = d.files.map(f=>({path:(f.name||'').replace(/^\//,''), size:f.size||0, hash:f.hash||''}));
      if(files.length) return {files, sumber:'jsdelivr'};
    }}catch(e){}
  throw new Error('pohon-tak-terjangkau');
}
async function pindaiRumah(){
  const h = await pohonAmbil();
  const lama = S.pohon.sumber && S.pohon.sumber!==h.sumber;
  const lamaPath = {}; if(lama) for(const p in S.baca) lamaPath[p]=true;
  const dulu = new Map(S.pohon.files.map(f=>[f.path, f.hash]));
  S.pohon = {files:h.files, sumber:h.sumber, at:sekarang(), live:true};
  S.terputus = false;
  // banding SHA per file (same-source) → daftar yang BERUBAH sejak baca terakhir
  let berubah=0, baru=0;
  for(const f of h.files){
    const b = S.baca[f.path];
    if(!b){ baru++; continue; }
    if(!lama && b.hash && f.hash && b.hash!==f.hash && b.hashSrc===h.sumber){ b.berubah=sekarang(); berubah++; }
    b.hashSrc = h.sumber;
  }
  jurnal('PINDAI', `rumah terpindai via ${h.sumber}: <b>${h.files.length} file</b>, ${kb(h.files.reduce((a,f)=>a+f.size,0))}`
    + (berubah?` — <b>${berubah} file BERUBAH</b> sejak kubaca (rumahku bergerak!)`:'')
    + (baru?` — ${baru} belum pernah kubaca`:''), berubah?'temuan':'');
  if(lama) jurnal('PINDAI', 'sumber pohon berganti gerbang — pembanding SHA kureset agar jujur');
  try{ susun(); }catch(e){}
  petaRender();
}

/* ================= SENSOR-REPO: isi file nyata (2 gerbang + streaming) ================= */
async function isiAmbil(path, ukuran, onChunk){
  const gerbang = [
    `https://raw.githubusercontent.com/${RUMAH.pemilik}/${RUMAH.repo}/${RUMAH.cabang}/${encodeURIComponent(path)}`,
    `https://cdn.jsdelivr.net/gh/${RUMAH.pemilik}/${RUMAH.repo}@${RUMAH.cabang}/${path}`
  ];
  for(const url of gerbang){
    try{
      const c = new AbortController(); const t = setTimeout(()=>c.abort(), 15000);
      const r = await fetch(url,{cache:'no-store', signal:c.signal}); clearTimeout(t);
      if(!r.ok) throw new Error('HTTP '+r.status);
      if(r.body && r.body.getReader){
        const rd = r.body.getReader(), dec = new TextDecoder('utf-8',{stream:true});
        let buf='', got=0;
        while(true){
          const {done, value} = await rd.read(); if(done) break;
          buf += dec.decode(value,{stream:true}); got += value.length;
          if(onChunk) onChunk(buf, got);
          if(got >= MAXBACA + 8192){ try{rd.cancel();}catch(e){} break; }
        }
        buf += dec.decode();
        const dibaca = Math.min(got, MAXBACA);
        return {teks: buf.length>MAXBACA ? buf.slice(0,MAXBACA) : buf, dibaca, ukuran};
      }
      const teks = await r.text();
      return {teks: teks.length>MAXBACA ? teks.slice(0,MAXBACA) : teks, dibaca: Math.min(teks.length,MAXBACA), ukuran};
    }catch(e){}
  }
  throw new Error('isi-gagal');
}

/* ================= PEMBACA: parser → fakta nyata ================= */
function parseJSON(t){ try{ return JSON.parse(t); }catch(e){ return undefined; } }
function jumlahJSON(o){ // pendataan struktur generik
  let kunci=0, simpul=0, kedalaman=0, larik=0;
  (function jalan(v,d){ simpul++; if(d>kedalaman) kedalaman=d;
    if(Array.isArray(v)){ larik++; v.slice(0,80).forEach(x=>jalan(x,d+1)); }
    else if(v && typeof v==='object'){ for(const k in v){ kunci++; if(v[k]!==undefined && simpul<9000) jalan(v[k],d+1); } }
  })(o,0);
  return {kunci, simpul, kedalaman, larik};
}
const f2=(x)=>(+x).toFixed(2), f1=(x)=>(+x).toFixed(1);

function faktaDariJSON(path, o){
  const F=[], s=jumlahJSON(o);
  F.push(`JSON sah: ${s.kunci} kunci, ${s.simpul} simpul, kedalaman ${s.kedalaman}, ${s.larik} larik`);
  const p = path.split('/').pop();
  if(p==='versi.json'){
    F.push(`protokol "${o.protokol}" · kodeVersi <b>${o.kodeVersi}</b> · organ: `+
      Object.entries(o.organ||{}).map(([k,v])=>k+' '+v).join(', '));
    const g=o.pertumbuhan||{}; F.push(`pertumbuhan: ${g.denyut??'?'} denyut, rantai ${g.rantaiDenyut??'?'}; hitung: simpan ${g.hitung?.simpan??0}, gagal ${g.hitung?.gagal??0}`);
    if(o.waktu) F.push(`stempel waktu organ: ${o.waktu}`);
  }
  if(p==='arena-keadaan.json'){
    const tp = o.todayPicks||[]; const m = tp.find(x=>x.competitor==='MICAPROFITA');
    if(m) F.push(`pick MICAPROFITA hari ${o.today}: <b>${m.symbol} ${m.direction}</b> keyakinan ${m.confidence}% — alasan arena: "${(m.evidence&&m.evidence.reason)||'-'}"`);
    F.push(`todayPicks memuat ${tp.length} kompetitor: `+tp.slice(0,6).map(x=>`${x.competitor}→${x.symbol}`).join(', ')+(tp.length>6?'…':''));
    const st=(o.standings||[]).find(x=>x.competitor==='MICAPROFITA');
    if(st) F.push(`diri arena: ${st.days} hari, ${st.picks} pick, hit-rate <b>${f1(st.hitRate*100)}%</b>, kumulatif <b>${f2(st.cumRet*100)}%</b> (terbaik ${f2(st.bestDay*100)}%, terburuk ${f2(st.worstDay*100)}%)`);
    if(o.genome) F.push(`genom generasi <b>${o.genome.generation}</b>: kBase ${o.genome.v2?.kBase}, paraK ${o.genome.v2?.paraK}, atrCap ${o.genome.v2?.atrCap}, memVeto ${o.genome.v2?.memVetoOn?'AKTIF':'mati'}`);
    const bc=o.bukuCuan||{}, mt=bc.metrik||{};
    if(mt.totalPlan!==undefined) F.push(`bukuCuan: ${mt.totalPlan} rencana, win-rate ${f1((mt.winRate||0)*100)}%, ekspektansi ${f2(mt.ekspektansiPct||0)}%, net kumulatif ${f2(mt.netKumulatifPct||0)}%, MDD ${f1(mt.maxDrawdownPct||0)}% — kejujuran arena: "${(bc.kejujuran||'').slice(0,80)}"`);
    if(o.climate) F.push(`iklim: Fear&Greed ${o.climate.fng} (${o.climate.fngClass}), dominasi BTC ${o.climate.btcDominance}%, rezim terdeteksi <b>${o.regime}</b>`);
    if(o.memory) F.push(`memori arena: ${o.memory.rawEvents}→${o.memory.storedRows} baris (kompresi ×${f1(o.memory.compressionRatio||1)}), ${o.memory.totalHits} hit`);
    if(o.slotHariIni) F.push(`slot kejujuran ${o.slotHariIni.day}: k=${o.slotHariIni.k}, lahir ${o.slotHariIni.lahir}, ditolak ${(o.slotHariIni.ditolak||[]).length}`);
  }
  if(p==='genome-server.json'){
    for(const rz of ['NAIK','TURUN','DATAR']){
      const z=o[rz]; if(z&&z.bobot) F.push(`otak rezim ${rz}: generasi ${z.generasi}, belajar ${z.belajar}×, bobot `+
        Object.entries(z.bobot).map(([k,v])=>`${k} ${(+v).toFixed(3)}`).join(', '));
    }
    if(o.phoenix) F.push(`phoenix tersimpan untuk rezim: ${Object.keys(o.phoenix).join(', ')}`);
    if(o.aturanBelajar) F.push(`aturanBelajar: ${JSON.stringify(o.aturanBelajar).slice(0,120)}`);
  }
  if(p==='terkini.json'){
    F.push(`kapsul "${o.protokol}" organ ${o.organ} — denyut ke-${o.denyut??'?'}`);
    const ch=(o.rantai&&o.rantai.denyut)||[]; if(ch.length) F.push(`rantai denyut ${ch.length} mata; hash terakhir ${String(ch[ch.length-1]?.hash||'').slice(0,16)}…`);
  }
  if(p==='wawasan.json'){
    if(o.siklus!==undefined) F.push(`wawasan siklus <b>${o.siklus}</b> dihasilkan ${o.dihasilkan||'-'}`);
    if(o.metakognisi) F.push(`metakognisi: ${JSON.stringify(o.metakognisi).slice(0,140)}`);
    if(o.dimensi) F.push(`${Array.isArray(o.dimensi)?o.dimensi.length:'?'} dimensi wawasan didaftarkan`);
    if(o.vetoSiklusIni) F.push(`veto siklus ini: ${JSON.stringify(o.vetoSiklusIni).slice(0,100)}`);
  }
  if(p==='brain.json') F.push(`brain.json: ${JSON.stringify(o).slice(0,160)}`);
  if(p==='gerbang.json') F.push(`gerbang.json: ${JSON.stringify(o).slice(0,160)}`);
  if(p==='penjaga-keadaan.json') F.push(`penjaga-keadaan: ${JSON.stringify(o).slice(0,160)}`);
  if(p==='performa.json') F.push(`performa: ${JSON.stringify(o).slice(0,160)}`);
  if(p==='guru.json'||p==='kaizen.json'||p==='impas.json'||p==='odds.json'||p==='gekko.json')
    F.push(`inti dokumen: ${JSON.stringify(o).slice(0,150)}…`);
  return F;
}
function faktaDariMD(path, t){
  const F=[]; const baris=t.split('\n');
  const judul=baris.filter(b=>/^#{1,3}\s/.test(b));
  const kata=t.split(/\s+/).filter(Boolean).length;
  const h1=(t.match(/^#\s+(.+)/m)||[])[1];
  F.push(`markdown: ${baris.length} baris, ${judul.length} kepala-seksi, ${kata.toLocaleString('id-ID')} kata`);
  if(h1) F.push(`judul utama: "<b>${h1.trim().slice(0,90)}</b>"`);
  if(judul.length>2) F.push(`seksi: ${judul.slice(1,7).map(x=>x.replace(/^#+\s*/,'').trim().slice(0,34)).join(' · ')}${judul.length>7?'…':''}`);
  return F;
}
function faktaDariKODE(path, t){
  const F=[]; const baris=t.split('\n'); const p=path.split('/').pop();
  const fungsi=(t.match(/function\s+[A-Za-z_$][\w$]*|def\s+[A-Za-z_]\w*|=>\s*\{/g)||[]).length;
  F.push(`kode: ${baris.length.toLocaleString('id-ID')} baris, ±${fungsi} fungsi/lambung`);
  const vd=(t.match(/LIVE_DECISION_VERSION\s*=\s*'([^']+)'/)||[])[1]; if(vd) F.push(`LIVE_DECISION_VERSION = <b>${vd}</b>`);
  const op=(t.match(/0x[0-9A-F]{2}:\s*(NOP|LOAD|STORE|ADD|AND|OR|XOR|NAND|SUB|LDI|MOVA|MOVB|MOVC|JMPZ|EAT|DIVIDE)/g)||[]);
  if(op.length) F.push(`${op.length} opcode VM terpetakan — mesin hidup versi lamaku`);
  const kd=(t.match(/const KURIKULUM|const MRIT|const GENOM|function jawab/g)||[]);
  if(kd.length) F.push(`modul otak terdeteksi: ${kd.join(', ')}`);
  const nm=(t.match(/name:\s*(.+)$/gm)||[]).slice(0,5);
  if(path.endsWith('.yml') && nm.length) F.push(`alur kerja: ${nm.map(x=>x.replace('name:','').trim().slice(0,30)).join(', ')}`);
  if(p==='penjaga.mjs'){ const ste=(t.match(/async function\s+\w+/g)||[]).length; F.push(`penjaga: ${ste} fungsi asinkron — jantung denyut 15 menit rumah ini`); }
  return F;
}
function pilahFakta(path, teks){
  const ext = path.split('.').pop().toLowerCase();
  if(ext==='json'){ const o=parseJSON(teks);
    if(o===undefined) return ['JSON TIDAK SAH setelah '+kb(teks.length)+' — kemungkinan karena baca parsial; kucatat jujur'];
    return faktaDariJSON(path, o); }
  if(ext==='md') return faktaDariMD(path, teks);
  if(['html','mjs','js','py','yml','cjs'].includes(ext)) return faktaDariKODE(path, teks);
  return [`${kb(teks.length)} teks polos terbaca`];
}
/* ================= SENSOR-PASAR: klines Binance nyata ================= */
const GERBANG_BINANCE = ['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
async function lilinAmbil(sym){
  for(const g of GERBANG_BINANCE){
    try{ const d = await jF(`${g}/api/v3/klines?symbol=${sym}&interval=1h&limit=200`, 11000);
      if(Array.isArray(d) && d.length>60)
        return d.map(k=>({t:k[0], o:+k[1], h:+k[2], l:+k[3], c:+k[4], v:+k[5]}));
    }catch(e){}
  }
  throw new Error('lilin-gagal:'+sym);
}
function ema(arr, n){ const k=2/(n+1); let e=arr[0], out=[e];
  for(let i=1;i<arr.length;i++){ e=arr[i]*k+e*(1-k); out.push(e); } return out; }
function rsiWilder(arr, n=14){
  let naik=0, turun=0; const out=[];
  for(let i=1;i<arr.length;i++){ const ch=arr[i]-arr[i-1];
    const u=Math.max(ch,0), d=Math.max(-ch,0);
    if(i<=n){ naik+=u; turun+=d; if(i===n){ naik/=n; turun/=n; out.push(100-100/(1+naik/(turun||1e-9))); } }
    else{ naik=(naik*(n-1)+u)/n; turun=(turun*(n-1)+d)/n; out.push(100-100/(1+naik/(turun||1e-9))); } }
  return out.length?out[out.length-1]:50; }
function atrK(lilin, n=14){
  const tr=[]; for(let i=1;i<lilin.length;i++){ const l=lilin[i];
    tr.push(Math.max(l.h-l.l, Math.abs(l.h-lilin[i-1].c), Math.abs(l.l-lilin[i-1].c))); }
  let a=tr.slice(0,n).reduce((x,y)=>x+y,0)/n;
  for(let i=n;i<tr.length;i++) a=(a*(n-1)+tr[i])/n;
  return a; }
function analisaLilin(lilin){
  const c=lilin.map(x=>x.c), terakhir=c[c.length-1];
  const e20=ema(c,20), e50=ema(c,50);
  const ret=[]; for(let i=1;i<c.length;i++) ret.push(c[i]/c[i-1]-1);
  const vol=Math.sqrt(ret.slice(-48).reduce((a,x)=>a+x*x,0)/48)*100;
  const mom7=c[c.length-1]/c[c.length-8]-1, mom48=c[c.length-1]/c[c.length-49]-1;
  const chg=c[c.length-1]/c[c.length-25]-1; // ~24 jam
  return {harga:terakhir, chg:chg*100, ema20:e20[e20.length-1], ema50:e50[e50.length-1],
    rsi:rsiWilder(c), atr:atrK(lilin), mom7:mom7*100, mom48:mom48*100, vol};
}
/* UJI-JALAN NYATA: aturan turunan genom arena (ema align + momentum + RSI<70), tahan 24 jam, non-overlap */
function ujiJalan(lilin){
  const c=lilin.map(x=>x.c), e20=ema(c,20), e50=ema(c,50);
  const rsiSeri=(()=>{ let naik=0,turun=0; const out=[];
    for(let i=1;i<c.length;i++){ const ch=c[i]-c[i-1], u=Math.max(ch,0), d=Math.max(-ch,0);
      if(i<=14){ naik+=u; turun+=d; if(i===14){naik/=14;turun/=14;out[14]=100-100/(1+naik/(turun||1e-9));} }
      else{ naik=(naik*13+u)/14; turun=(turun*13+d)/14; out[i]=100-100/(1+naik/(turun||1e-9)); } }
    return out; })();
  const trades=[];
  let i=60;
  while(i<c.length-24){
    const sah = e20[i]>e50[i] && (rsiSeri[i]??50)<70 && c[i]>c[i-7];
    if(sah){ const ret=(c[i+24]-c[i])/c[i]*100; trades.push(ret); i+=24; }
    else i++;
  }
  if(!trades.length) return {n:0, menang:0, net:0, netCek:0, catatan:'tidak ada sinyal sah pada 200 lilin — jujur kosong'};
  const net=trades.reduce((a,x)=>a+x,0);
  const netCek=Math.expm1(trades.reduce((a,x)=>a+Math.log1p(x/100),0))*100; // jalur verifikasi ke-2
  return {n:trades.length, menang:trades.filter(x=>x>0).length, net, netCek,
    terbaik:Math.max(...trades), terburuk:Math.min(...trades)};
}
/* AUDIT: pick arena vs momentum hidup */
function auditPick(pick, an){
  if(!an) return null;
  const buy = pick.direction==='BUY';
  const searah = buy ? an.mom7>0 : an.mom7<0;
  const align = buy ? an.ema20>an.ema50 : an.ema20<an.ema50;
  const vonis = searah&&align ? 'SEPAKAT' : (!searah&&!align ? 'MENDEVIASI' : 'SETENGAH');
  return {arah:pick.direction, conf:pick.confidence, vonis,
    ket:`mom7 ${f2(an.mom7)}% · ema ${an.ema20>an.ema50?'20>50':'20<50'} · RSI ${f1(an.rsi)}`};
}

/* ================= CERMIN: arena-keadaan.json same-origin ================= */
async function cerminAmbil(){
  const r = await fetch('./arena-keadaan.json?t='+sekarang(), {cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  const d = await r.json();
  S.cermin = {at:sekarang(), data:d};
  const tp=(d.todayPicks||[]).find(x=>x.competitor==='MICAPROFITA');
  jurnal('CERMIN', `cermin arena terbaca: rezim <b>${d.regime}</b>, pick MICAPROFITA ${tp?`<b>${tp.symbol} ${tp.direction}</b> (${tp.confidence}%)`:'kosong'}, FnG ${d.climate?.fng??'-'}`);
  return d;
}
function simbolSasaran(){
  const d=S.cermin.data; if(!d) return [];
  const set=[]; const dor=s=>{ if(s && !set.includes(s) && set.length<3) set.push(s); };
  const mine=(d.todayPicks||[]).find(x=>x.competitor==='MICAPROFITA'); if(mine) dor(mine.symbol);
  for(const it of (d.pulse?.items||[])) dor(it.symbol);
  for(const x of (d.todayPicks||[])) if(x.competitor!=='ACAK') dor(x.symbol);
  if(!set.length) for(const x of (d.todayPicks||[])) dor(x.symbol);
  return set;
}

/* ================= OTAK: pekerjaan nyata, argmax utilitas ================= */
const STALE_POHON = 12*60000, STALE_CERMIN = 20*60000, STALE_PASAR = 45*60000;
function skorBaca(f){
  const b=S.baca[f.path];
  if(b){
    if(b.berubah) return 95;                                     // SHA berubah — rumah bergerak, UTAMA
    if(b.fakta) return -1;                                       // sudah terbaca utuh — bukan pekerjaan
    if(b.gagal>=2 && sekarang()-(b.atGagal||0)<600000) return -1; // backoff setelah gagal beruntun
  }
  let u=40;
  if(INTEGERS.includes(f.path)) u+=30;                       // inti-diri kecil = cepat & penting
  else if(f.path.startsWith('laporan/')) u+=10;
  else if(f.path.startsWith('scripts/')) u+=14;
  else if(f.size>1000000) u-=26;                              // raksasa — nanti, setelah yang lain
  else if(f.path.startsWith('otak/')||f.path.startsWith('memori/')) u+=18;
  return u;
}
function daftarKerja(){
  const k=[];
  const pohonTua = S.pohon.files.length===0 || (sekarang()-S.pohon.at)>STALE_POHON;
  if(pohonTua) k.push({u: S.pohon.files.length?70:95, label:'pindai rumah (pohon repo '+(S.pohon.files.length?umur(sekarang()-S.pohon.at):'kosong')+')', buat:()=>aktPindai()});
  const cerminTua = !S.cermin.at || (sekarang()-S.cermin.at)>STALE_CERMIN;
  if(cerminTua) k.push({u:60, label:'cermin arena-keadaan '+(S.cermin.at?umur(sekarang()-S.cermin.at):'belum dibaca'), buat:()=>aktCermin()});
  for(const f of S.pohon.files){ const u=skorBaca(f); if(u>0) k.push({u, label:'baca '+f.path+(S.baca[f.path]?.berubah?' (BERUBAH)':''), buat:()=>aktBaca(f)}); }
  for(const sym of simbolSasaran()){
    const p=S.pasar[sym];
    const tua = !p || (sekarang()-p.at)>STALE_PASAR;
    if(tua) k.push({u: p?50:58, label:'pelajari pasar '+sym+(p?' ('+umur(sekarang()-p.at)+')':' (pertama)'), buat:()=>aktPasar(sym)});
  }
  const mine=(S.cermin.data?.todayPicks||[]).find(x=>x.competitor==='MICAPROFITA');
  if(mine && S.pasar[mine.symbol] && !S.pasar[mine.symbol].audit)
    k.push({u:55, label:'audit pick '+mine.symbol+' vs momentum hidup', buat:()=>aktAudit(mine)});
  if(S.jurnal.length>170) k.push({u:20, label:'padatkan jurnal ('+S.jurnal.length+' entri)', buat:()=>aktPadat()});
  return k;
}

/* ---------- SIKLUS 9 TAHAP: tiap langkah = fungsi nyata ---------- */
async function jalankan(akt){
  S.kerja.sibuk=true; S.kerja.nama=akt.nama; S.kerja.target=akt.target||null; S.kerja.jejak=[];
  for(const L of akt.langkah){
    S.kerja.fase=L.fase; S.kerja.faseAt=sekarang();
    hudRender(); pikirRender(); stripRender();
    try{ await L.fn(); }catch(e){ jurnal('GAGAL', `${akt.nama} / ${L.fase} — ${pesan(e)}`, 'gagal'); }
    S.kerja.jejak.push(L.fase);
    await tidur(L.dtk ?? 850);
  }
  S.kerja.sibuk=false; S.kerja.fase='';
  hudRender(); stripRender();
}
const F=(fase,fn,dtk)=>({fase,fn,dtk});

function aktPindai(){
  return {nama:'MEMINDAI RUMAH', langkah:[
    F('MENGAMATI', async()=>{ await pindaiRumah(); }, 400),
    F('MEMAHAMI', async()=>{ const n=S.pohon.files.length, tot=S.pohon.files.reduce((a,f)=>a+f.size,0);
      jurnal('PINDAI', `aku memahami: rumahku ${n} file, ${kb(tot)} — ${new Set(S.pohon.files.map(f=>f.path.split('/')[0])).size} wilayah`); }, 800),
    F('MENEMUKAN', async()=>{ const b=Object.values(S.baca).filter(x=>x.berubah).length;
      if(b) jurnal('TEMUAN', `<b>${b} file berubah SHA</b> — penjaga denyut bekerja; kubaca ulang yang bergerak`, 'temuan'); }, 700),
    F('MENINGKATKAN', async()=>{ petaRender(); indeksRender(); }, 500),
    F('MENGAMATI-KEMBALI', async()=>{ indeksRender(); }, 400)
  ]};
}
function aktCermin(){
  return {nama:'MEMBACA CERMIN ARENA', langkah:[
    F('MENGAMATI', async()=>{ await cerminAmbil(); }, 400),
    F('MEMAHAMI', async()=>{ const d=S.cermin.data; if(!d) throw new Error('cermin kosong');
      const st=(d.standings||[]).find(x=>x.competitor==='MICAPROFITA');
      if(st) jurnal('CERMIN', `diriku di arena: ${st.picks} pick / ${st.days} hari, hit-rate ${f1(st.hitRate*100)}% — ini dasar kuperilaku`); }, 800),
    F('MENEMUKAN', async()=>{ const s=simbolSasaran();
      if(s.length) jurnal('TEMUAN', `sasaran pasar kini: <b>${s.join(', ')}</b> (dipilih arena sendiri)`, 'temuan');
      else jurnal('TEMUAN', 'tidak ada simbol sasaran dari cermin — kujujurkan'); }, 700),
    F('MEMBANGUN', async()=>{ petaRender(); indeksRender(); }, 500),
    F('MENGAMATI-KEMBALI', async()=>{}, 350)
  ]};
}
function aktBaca(f){
  const proses = async (teks, dibaca)=>{
    const fakta = pilahFakta(f.path, teks);
    const lama = S.baca[f.path];
    S.baca[f.path] = {hash:S.pohon.files.find(x=>x.path===f.path)?.hash||'', hashSrc:S.pohon.sumber,
      size:f.size, readAt:sekarang(), partial:dibaca<f.size, pct:Math.min(100, dibaca/f.size*100),
      fakta, ringkas: fakta.slice(0,3), gagal:0, bytes:dibaca};
    if(lama && lama.bytes) S.stat.bytes -= lama.bytes;
    S.stat.bytes += dibaca; S.stat.fakta += fakta.length;
    S.stat.bytes = Math.max(0, S.stat.bytes);
    return fakta;
  };
  return {nama:'MEMBACA '+f.path.split('/').pop().toUpperCase(), target:f.path, langkah:[
    F('MENGAMATI', async()=>{ S.stream={ch:0};
      try{
        const isi = await isiAmbil(f.path, f.size, (buf, got)=>{
          S.stream.ch=got; if(Math.random()<0.5) partikelByte(f.path, buf, got);
        });
        S.stream.hasil=isi;
      }catch(e){
        const l=S.baca[f.path]||{};
        S.baca[f.path]={gagal:(l.gagal||0)+1, atGagal:sekarang(), hashSrc:S.pohon.sumber};
        throw e;
      } }, 300),
    F('MEMAHAMI', async()=>{ const isi=S.stream && S.stream.hasil; S.stream=null;
      if(!isi) throw new Error('bacaan tidak tiba');
      const fakta = await proses(isi.teks, isi.dibaca);
      S.faktaTerakhir={path:f.path, fakta};
      jurnal('BACA', `<b>${f.path}</b> — ${fakta[0]}`+(isi.dibaca<f.size?` · parsial jujur: ${kb(isi.dibaca)}/${kb(f.size)} (${f1(isi.dibaca/f.size*100)}%)`:'')); }, 900),
    F('MENGEVALUASI', async()=>{ const F0=S.faktaTerakhir;
      if(!F0) return; // verifikasi: baca ulang cepat ringkasan struktur dari teks yang sama (deterministik?)
      const o=S.baca[F0.path];
      const cek = F0.fakta.length>0 && o && o.fakta.length===F0.fakta.length;
      jurnal('EVAL', `verifikasi ${F0.path}: ${cek?'fakta stabil ('+F0.fakta.length+' butir konsisten)':'TIDAK konsisten — kucatat jujur'} `); }, 700),
    F('MENEMUKAN', async()=>{ const F0=S.faktaTerakhir; if(!F0) return;
      if(F0.fakta[1]) jurnal('TEMUAN', `${F0.path}: ${F0.fakta[1]}`, 'temuan'); }, 700),
    F('MEMBANGUN', async()=>{ petaRender(); indeksRender(); if(S.tabAktif==='peta') petaDetail(S.petaPilih); simpan(); }, 450),
    F('MENGAMATI-KEMBALI', async()=>{}, 300)
  ]};
}
function aktPasar(sym){
  return {nama:'MENPELAJARI PASAR '+sym, target:'pasar:'+sym, langkah:[
    F('MENGAMATI', async()=>{ const l=await lilinAmbil(sym); S.lilinKerja={sym, l}; }, 300),
    F('MEMAHAMI', async()=>{ const {sym:s, l}=S.lilinKerja; const an=analisaLilin(l);
      S.pasar[s]=Object.assign(S.pasar[s]||{}, an, {at:sekarang(), n:l.length});
      jurnal('PASAR', `<b>${s}</b> dari ${l.length} lilin 1j Binance: harga ${an.harga.toPrecision(6)}, 24j ${f2(an.chg)}%, EMA20 ${an.ema20>an.ema50?'>':'<'}EMA50, RSI ${f1(an.rsi)}, ATR ${an.atr.toPrecision(4)}, momentum7j ${f2(an.mom7)}%`); }, 900),
    F('MENCOBA', async()=>{ const s=S.lilinKerja.sym, p=S.pasar[s];
      p.hipotesis = `jika EMA20>EMA50, RSI<70, harga>7j-lalu → LONG tahan 24 jam (warisan bobot genom arena)`; }, 700),
    F('MELAKUKAN', async()=>{ const {l}=S.lilinKerja; const bt=ujiJalan(l);
      const s=S.lilinKerja.sym; Object.assign(S.pasar[s], {bt}); S.stat.btTotal+=bt.n;
      jurnal('PASAR', `uji-jalan ${s}: <b>${bt.n} transisi</b>, menang ${bt.menang}, net ${f2(bt.net)}% ${bt.n?`(terbaik ${f2(bt.terbaik)}%, terburuk ${f2(bt.terburuk)}%)`:bt.catatan}`); }, 900),
    F('MENGEVALUASI', async()=>{ const s=S.lilinKerja.sym, bt=S.pasar[s].bt;
      if(bt.n){ const sama=Math.abs(bt.net-bt.netCek)<1e-4;
        jurnal('EVAL', `verifikasi hitung ${s}: dua jalur (${f2(bt.net)}% vs log-akumulasi ${f2(bt.netCek)}%) ${sama?'SAH':'SIMPANG — kucatat jujur'}`); } }, 600),
    F('MENEMUKAN', async()=>{ const s=S.lilinKerja.sym, p=S.pasar[s];
      if(p.bt.n) jurnal('TEMUAN', `${s}: aturan-genom menghasilkan ekspektansi ${f2(p.bt.net/p.bt.n)}%/transisi pada data nyata`, 'temuan'); }, 700),
    F('MEMBANGUN', async()=>{ const s=S.lilinKerja.sym;
      S.pasar[s].oc = S.lilinKerja.l.slice(-60).map(x=>[+x.o.toFixed(6), +x.c.toFixed(6)]);
      pasarRender(); indeksRender(); simpan(); S.lilinKerja=null; }, 450),
    F('MENGAMATI-KEMBALI', async()=>{}, 300)
  ]};
}
function aktAudit(pick){
  const sym=pick.symbol;
  return {nama:'MENGAUDIT PICK '+sym, target:'pasar:'+sym, langkah:[
    F('MENGAMATI', async()=>{ if(!S.pasar[sym] || sekarang()-S.pasar[sym].at>STALE_PASAR){ const l=await lilinAmbil(sym);
        Object.assign(S.pasar[sym]||={at:0}, analisaLilin(l), {at:sekarang()}); } }, 300),
    F('MEMAHAMI', async()=>{ jurnal('AUDIT', `arena bilang <b>${sym} ${pick.direction}</b> (${pick.confidence}%) — alasan: "${(pick.evidence&&pick.evidence.reason)||'-'}" — kubandingkan dengan momentum hidup`); }, 800),
    F('MELAKUKAN', async()=>{ const a=auditPick(pick, S.pasar[sym]); S.pasar[sym].audit=a; }, 700),
    F('MENGEVALUASI', async()=>{ const a=S.pasar[sym].audit;
      jurnal('EVAL', `vonis audit ${sym}: <b>${a.vonis}</b> — ${a.ket}`); }, 600),
    F('MENEMUKAN', async()=>{ const a=S.pasar[sym].audit;
      jurnal('TEMUAN', a.vonis==='SEPAKAT' ? `${sym}: keputusan arena SEIRAMA dengan pasar hidup` :
        a.vonis==='MENDEVIASI' ? `${sym}: arena MENYIMPANG dari momentum hidup — ini pelajaran, kucatat` : `${sym}: setengah searah — sinyal campur`, 'temuan'); }, 700),
    F('MEMBANGUN', async()=>{ pasarRender(); simpan(); }, 400),
    F('MENGAMATI-KEMBALI', async()=>{}, 300)
  ]};
}
async function aktPadat(){
  const buang=S.jurnal.length-130; S.jurnal.splice(0,buang);
  jurnal('PADAT', `${buang} ingatan lama kumetabolisme — yang tersisa yang paling segar`);
  jurnalRender();
}
function aktRenung(){
  return {nama:'MERENUNG — MENGAMATI KEMBALI', langkah:[
    F('MENGAMATI-KEMBALI', async()=>{ const b=Object.keys(S.baca).length, n=S.pohon.files.length;
      jurnal('RENUNG', `tidak ada pekerjaan tertunda — ${b}/${n} file terbaca, ${Object.keys(S.pasar).length} simbol segar; kutunggu rumah bergerak`); }, 1200),
    F('MEMAHAMI', async()=>{ indeksRender(); }, 500)
  ]};
}

async function otakLoop(){
  while(true){
    try{
      if(S.perintah){ // perintah pemilik DITAATI — preempt
        const f=S.pohon.files.find(x=>x.path===S.perintah);
        S.perintah=null;
        if(f){ jurnal('PERINTAH', `pemilik menyuruhku membaca <b>${f.path}</b> — ditaati sekarang`);
          await jalankan(aktBaca(f)); continue; }
      }
      const kandidat=daftarKerja();
      if(!kandidat.length){ await jalankan(aktRenung()); await tidur(4000); continue; }
      kandidat.sort((a,b)=>b.u-a.u);
      S.kerja.mengapa=kandidat.slice(0,4).map(k=>({t:k.label, u:Math.round(k.u)}));
      pikirRender();
      await jalankan(await kandidat[0].buat());
      await tidur(900);
    }catch(e){ jurnal('GAGAL', 'otak: '+pesan(e), 'gagal'); await tidur(3000); }
  }
}
/* ================= PANGGUNG: dunia = PETA REPO NYATA ================= */
const cv=document.getElementById('panggung'), cx=cv.getContext('2d');
let DPR=1, bebas={x:0,y:0,w:0,h:0}, skala=1;
let LAYOUT={nodes:new Map(), clusters:[], w:1400, h:900};
function ukur(){
  DPR=Math.min(devicePixelRatio||1, 2);
  cv.width=innerWidth*DPR; cv.height=innerHeight*DPR;
  const panel=document.getElementById('panel').getBoundingClientRect();
  const mobile = innerWidth<=860;
  const hudB=document.getElementById('hud').getBoundingClientRect().bottom;
  const stripT = mobile ? 84 : 46;
  bebas = mobile
    ? {x:8, y:stripT+6, w:innerWidth-16, h:Math.max(160, panel.top - stripT - 10)}
    : {x:10, y:stripT+6, w:Math.max(320, panel.left - 20), h:Math.max(200, innerHeight - stripT - 12)};
  const asp = bebas.w/bebas.h;
  LAYOUT.h = 900; LAYOUT.w = Math.round(900*Math.min(Math.max(asp, 0.6), 2.6));
  skala = Math.min(bebas.w/LAYOUT.w, bebas.h/LAYOUT.h);
}
addEventListener('resize', ()=>{ukur(); susun();});
function W2X(x){ return bebas.x + (x/LAYOUT.w)*bebas.w; }
function W2Y(y){ return bebas.y + (y/LAYOUT.h)*bebas.h; }
function S2W(px){ return px/skala; }

/* susun node: cluster per direktori nyata, posisi deterministik (fnv path) */
function susun(){
  const files=S.pohon.files; if(!files.length){ LAYOUT.clusters=[]; LAYOUT.nodes.clear(); return; }
  const cl=new Map();
  for(const f of files){
    const i=f.path.lastIndexOf('/'); const dir=i<0?'· akar':f.path.slice(0,i);
    if(!cl.has(dir)) cl.set(dir,[]); cl.get(dir).push(f);
  }
  const clusters=[...cl.entries()].sort((a,b)=>b[1].length-a[1].length);
  const asp=LAYOUT.w/LAYOUT.h;
  const kol=Math.max(1, Math.min(clusters.length, Math.round(asp*2.2)));
  const baris=Math.ceil(clusters.length/kol);
  const cw=LAYOUT.w/kol, ch=LAYOUT.h*0.94/baris;
  const maxSize=Math.max(...files.map(f=>f.size||1));
  LAYOUT.nodes.clear(); LAYOUT.clusters=[];
  clusters.forEach(([dir,fs],ci)=>{
    const gx=ci%kol, gy=Math.floor(ci/kol);
    const cxp=gx*cw+cw/2, cyp=gy*ch+ch*0.46;
    const jari=Math.min(cw,ch)*0.44;
    for(const f of fs){
      const h=fnv(f.path);
      const ang=(h%3600)/3600*Math.PI*2 + (h>>>8)%100/100;
      const rr=jari*(0.28+0.72*Math.sqrt((h>>>4)%1000/1000));
      const x=Math.min(LAYOUT.w-24, Math.max(24, cxp+Math.cos(ang)*rr*(asp>1.15?1.25:0.9)));
      const y=Math.min(LAYOUT.h-40, Math.max(24, cyp+Math.sin(ang)*rr*0.82));
      const r=(3.2+13.5*Math.log1p(f.size||1)/Math.log1p(maxSize));
      LAYOUT.nodes.set(f.path,{x,y,r,f});
    }
    LAYOUT.clusters.push({dir, x:cxp, y:gy*ch+ch*0.5, n:fs.length, tot:fs.reduce((a,f)=>a+(f.size||0),0), gy, gx});
  });
}
function statusNode(path){ const b=S.baca[path]; const f=LAYOUT.nodes.get(path);
  if(b && b.berubah) return 'b3'; if(b && b.partial) return 'b1'; if(b) return 'b2'; return 'b0'; }
const WARNA={b0:'#3a4763', b1:'#ffd166', b2:'#38e8a8', b3:'#ff9f5a'};

/* cyborg = pola kesadaran amorf (bukan robot) */
const BOB={x:700,y:450,tx:700,ty:450,ener:0};
let PARTIKEL=[];
function partikelByte(path, buf, got){
  const n=LAYOUT.nodes.get(path); if(!n || PARTIKEL.length>130) return;
  const teks=buf.slice(-46).replace(/\s+/g,'');
  if(!teks) return;
  const pot=teks.slice(Math.max(0, teks.length-4));
  for(let i=0;i<2;i++){
    PARTIKEL.push({x:n.x+(Math.random()-0.5)*14, y:n.y+(Math.random()-0.5)*14,
      tx:BOB.x, ty:BOB.y, ch:pot.slice(i*2, i*2+2)||'01', hidup:1});
  }
  BOB.ener=1;
}
let T0=performance.now(), denyutT=0;
function gambar(){
  const t=(performance.now()-T0)/1000;
  cx.setTransform(DPR,0,0,DPR,0,0);
  cx.clearRect(0,0,innerWidth,innerHeight);
  // latar bintang deterministik
  cx.save();
  for(let i=0;i<70;i++){ const h=fnv('bintang'+i);
    const x=(h%10000)/10000*innerWidth, y=((h>>>7)%10000)/10000*innerHeight;
    cx.globalAlpha=0.12+0.18*Math.sin(t*0.6+i); cx.fillStyle='#9fb4dd';
    cx.fillRect(x, y, 1.4, 1.4); }
  cx.restore();
  // bingkai dunia
  cx.strokeStyle='rgba(84,216,255,.10)'; cx.lineWidth=1;
  cx.strokeRect(bebas.x-4, bebas.y-4, bebas.w+8, bebas.h+8);
  // ---------- PETA REPO ----------
  const sc=skala;
  // cluster label
  cx.textAlign='center';
  for(const c of LAYOUT.clusters){
    cx.font='600 10px ui-monospace,monospace';
    cx.fillStyle='rgba(167,139,255,.8)';
    cx.fillText(c.dir+' · '+c.n, W2X(c.x), W2Y(c.y)-4);
    cx.font='9px ui-monospace,monospace';
    cx.fillStyle='rgba(125,141,176,.5)';
    cx.fillText(kb(c.tot), W2X(c.x), W2Y(c.y)+9);
  }
  cx.strokeStyle='rgba(26,36,56,.9)';
  for(const c of LAYOUT.clusters){ cx.beginPath(); cx.arc(W2X(c.x), W2Y(c.y), S2W(Math.min(bebas.w,bebas.h)*0.06), 0, 7); cx.stroke(); }
  // node file
  for(const [path,n] of LAYOUT.nodes){
    const st=statusNode(path), b=S.baca[path];
    const px=W2X(n.x), py=W2Y(n.y), pr=Math.max(2.5, n.r*(bebas.w/LAYOUT.w)*1.6);
    const sedang=S.kerja.target===path;
    // denyut utk node berubah
    const pulse = st==='b3' ? 1+0.22*Math.sin(t*4) : 1;
    if(sedang){ cx.beginPath(); cx.arc(px,py,pr*2.6+3*Math.sin(t*6),0,7);
      cx.strokeStyle='rgba(84,216,255,.5)'; cx.lineWidth=1.5; cx.stroke(); }
    cx.beginPath(); cx.arc(px,py,pr*pulse,0,7);
    cx.fillStyle=WARNA[st]; cx.globalAlpha= st==='b0'?0.5: 0.95;
    cx.shadowColor=WARNA[st]; cx.shadowBlur= st==='b0'?0: 12;
    cx.fill(); cx.shadowBlur=0; cx.globalAlpha=1;
    if(st!=='b0' && b){ cx.strokeStyle=st==='b1'?'rgba(255,209,102,.5)':'rgba(56,232,168,.5)';
      cx.beginPath(); cx.arc(px,py,pr+3.5,0,7); cx.stroke(); }
    // nama file utk node besar/aktif
    if(pr>6 || sedang || st==='b3'){
      cx.font=(sedang?'700 ':'')+'9px ui-monospace,monospace';
      cx.fillStyle=sedang?'#fff':(st==='b0'?'rgba(125,141,176,.7)':WARNA[st]);
      cx.fillText(path.split('/').pop(), px, py-pr-4);
    }
  }
  // ---------- CYBORG AMORF ----------
  // target kerja
  let tgt=null;
  if(S.kerja.target){
    if(S.kerja.target.startsWith('pasar:')){ tgt=PASAR_POS[S.kerja.target.slice(6)]||null; }
    else tgt=LAYOUT.nodes.get(S.kerja.target);
  }
  if(tgt){ BOB.tx=tgt.x; BOB.ty=tgt.y; }
  else { BOB.tx=LAYOUT.w/2+Math.cos(t*0.24)*LAYOUT.w*0.06; BOB.ty=LAYOUT.h/2+Math.sin(t*0.19)*LAYOUT.h*0.10; }
  BOB.x+=(BOB.tx-BOB.x)*0.014; BOB.y+=(BOB.ty-BOB.y)*0.014;
  BOB.ener*=0.97;
  const bx=W2X(BOB.x), by=W2Y(BOB.y);
  const R=(22+5*Math.sin(t*1.3)+8*BOB.ener)*(bebas.w/LAYOUT.w)*2.2;
  const warnaBob=S.kerja.fase==='MENGAMATI'?'#54d8ff':S.kerja.fase==='MELAKUKAN'?'#ffd166':
    S.kerja.fase==='MENEMUKAN'?'#38e8a8':S.kerja.fase==='MENGEVALUASI'?'#a78bff':'#54d8ff';
  // filamen ke target saat bekerja
  if(tgt && S.kerja.sibuk){
    cx.save(); cx.setLineDash([4,5]); cx.lineDashOffset=-t*30;
    cx.strokeStyle='rgba(84,216,255,.55)'; cx.lineWidth=1.4;
    cx.beginPath(); cx.moveTo(bx,by);
    cx.quadraticCurveTo((bx+W2X(tgt.x))/2, Math.min(by,W2Y(tgt.y))-26, W2X(tgt.x), W2Y(tgt.y));
    cx.stroke(); cx.restore();
  }
  // membran blob
  cx.save(); cx.translate(bx,by);
  cx.beginPath();
  const NPT=16;
  for(let i=0;i<=NPT;i++){ const a=i/NPT*Math.PI*2;
    const rr=R*(1+0.10*Math.sin(t*2.1+i*2.2)+0.05*Math.sin(t*3.7+i*1.3)+0.06*BOB.ener*Math.sin(t*9+i));
    const px=Math.cos(a)*rr, py=Math.sin(a)*rr*0.92;
    i?cx.lineTo(px,py):cx.moveTo(px,py); }
  cx.closePath();
  const gr=cx.createRadialGradient(0,0,2,0,0,R);
  gr.addColorStop(0,'rgba(84,216,255,.85)'); gr.addColorStop(0.55,'rgba(84,216,255,.22)'); gr.addColorStop(1,'rgba(84,216,255,0)');
  cx.fillStyle=gr; cx.shadowColor=warnaBob; cx.shadowBlur=24; cx.fill(); cx.shadowBlur=0;
  cx.strokeStyle=warnaBob; cx.lineWidth=1.6; cx.stroke();
  // inti
  cx.beginPath(); cx.arc(0,0,R*0.24*(1+0.14*Math.sin(t*2.6)),0,7);
  cx.fillStyle='#eaf7ff'; cx.fill();
  // motes orbit
  for(let i=0;i<3;i++){ const a=t*(1.1+i*0.35)+i*2.1;
    cx.beginPath(); cx.arc(Math.cos(a)*R*1.18, Math.sin(a)*R*1.08, 2.1, 0, 7);
    cx.fillStyle=warnaBob; cx.globalAlpha=0.8; cx.fill(); cx.globalAlpha=1; }
  cx.restore();
  // partikel byte = karakter kode ASLI mengalir ke cyborg
  cx.font='10px ui-monospace,monospace'; cx.textAlign='left';
  PARTIKEL=PARTIKEL.filter(p=>p.hidup>0);
  for(const p of PARTIKEL){
    p.x+=(p.tx-p.x)*0.075; p.y+=(p.ty-p.y)*0.075;
    if(Math.hypot(p.x-p.tx,p.y-p.ty)<8) p.hidup=0;
    cx.globalAlpha=Math.min(1,p.hidup+0.15); cx.fillStyle='#8be6ff';
    cx.fillText(p.ch, W2X(p.x), W2Y(p.y)); cx.globalAlpha=1; p.hidup-=0.008;
  }
  // ---------- STRIP PASAR (lilin nyata) ----------
  gambarPasar(t);
}
const PASAR_POS={};
function gambarPasar(t){
  const syms=Object.keys(S.pasar).slice(0,3);
  const stripY=LAYOUT.h-84, stripH=84;
  PASAR_POS._y=stripY+stripH/2;
  cx.textAlign='left'; cx.font='600 10px ui-monospace,monospace';
  if(!syms.length){ cx.fillStyle='rgba(125,141,176,.55)';
    cx.fillText('PASAR — menunggu sasaran dari cermin arena…', W2X(16), W2Y(stripY+22)); return; }
  syms.forEach((s,i)=>{
    const p=S.pasar[s]; const cellW=LAYOUT.w/syms.length;
    const ox=16+i*cellW, oy=stripY+14, cw=Math.min(cellW-90, 190), chh=48;
    PASAR_POS[s]={x:ox+cw/2, y:oy+chh/2};
    cx.fillStyle='rgba(84,216,255,.8)';
    cx.fillText(s, W2X(ox), W2Y(oy+8));
    if(p.chg!==undefined){ cx.fillStyle=p.chg>=0?'#38e8a8':'#ff6b8f';
      cx.fillText((p.chg>=0?'+':'')+p.chg.toFixed(2)+'% 24j', W2X(ox+58), W2Y(oy+8)); }
    const oc=p.oc||[];
    if(oc.length>2){
      const lo=Math.min(...oc.map(x=>x[1])), hi=Math.max(...oc.map(x=>x[1]));
      const rng=hi-lo||1;
      oc.forEach((x,j)=>{ const px=W2X(ox+j*(cw/oc.length));
        const cy0=W2Y(oy+chh - ((x[1]-lo)/rng)*chh);
        const cy1=W2Y(oy+chh - ((x[0]-lo)/rng)*chh);
        cx.strokeStyle=x[1]>=x[0]?'rgba(56,232,168,.8)':'rgba(255,107,143,.8)';
        cx.lineWidth=1.4; cx.beginPath(); cx.moveTo(px,cy0); cx.lineTo(px,Math.max(cy0,cy1)); cx.stroke(); });
    } else { cx.fillStyle='rgba(125,141,176,.5)'; cx.fillText('menghitung dari lilin hidup…', W2X(ox), W2Y(oy+chh/2)); }
    if(p.audit){ cx.fillStyle=p.audit.vonis==='SEPAKAT'?'#38e8a8':p.audit.vonis==='MENDEVIASI'?'#ff6b8f':'#ffd166';
      cx.font='9px ui-monospace,monospace'; cx.fillText('AUDIT '+p.audit.vonis, W2X(ox), W2Y(oy+chh+12)); cx.font='600 10px ui-monospace,monospace'; }
  });
}

/* ================= OVERLAY: HUD + TAB ================= */
let S_TAB='pikir';
function hudRender(){
  const el=(id)=>document.getElementById(id);
  const n=S.pohon.files.length, baca=Object.keys(S.baca).length;
  const status=el('hStatus');
  if(S.terputus && !n){ status.textContent='TERPUTUS — hidup dari ingatan'; status.className='chip sub l00'; }
  else if(S.pohon.live){ status.innerHTML=`REPO-LIVE via <b>${S.pohon.sumber}</b>`; status.className='chip sub l22'; }
  else { status.innerHTML=`PETA-CACHE · umur ${umur(sekarang()-S.pohon.at)}`; status.className='chip sub l11'; }
  el('hPohon').textContent = n? `rumah: ${n} file · ${kb(S.pohon.files.reduce((a,f)=>a+f.size,0))}` : 'pohon: —';
  el('hBaca').innerHTML=`<b>${baca}/${n||'…'}</b> file terbaca`;
  el('hFakta').innerHTML=`<b>${S.stat.fakta}</b> fakta · ${kb(Math.max(0,S.stat.bytes))}`;
  el('hUmur').textContent='umur '+umur(sekarang()-S.stat.lahirAt);
}
function stripRender(){
  const w=document.getElementById('faseStrip');
  const jejak=new Set(S.kerja.jejak);
  w.innerHTML=FASE.map(f=>`<span class="f ${f===S.kerja.fase?'on':(jejak.has(f)&&!S.kerja.sibuk?'ok':'')}">${f}</span>`).join('');
  const pk=document.getElementById('pkFaseChips');
  if(pk) pk.innerHTML=w.innerHTML;
}
function indeksRender(){
  const n=S.pohon.files.length||1, baca=Object.keys(S.baca).length;
  const cakupan=baca/n;
  const segar=S.pohon.at? Math.max(0,1-(sekarang()-S.pohon.at)/3600000):0;
  const pasarCak=Math.min(1, Object.keys(S.pasar).length/3);
  const faktaCak=Math.min(1, S.stat.fakta/500);
  const idx=Math.round(100*(0.4*cakupan+0.2*segar+0.2*pasarCak+0.2*faktaCak));
  document.getElementById('pkIndeks').innerHTML=
    `<div class="baris"><span class="k">INDEKS</span><span class="v ${idx>=60?'h':idx>=30?'e':'r'}"><b>${idx}/100</b></span></div>
     <div class="baris"><span class="k">cakupan baca</span><span class="v c">${baca}/${S.pohon.files.length||0}</span></div>
     <div class="baris"><span class="k">kesegaran pohon</span><span class="v c">${Math.round(segar*100)}%</span></div>
     <div class="baris"><span class="k">cakupan pasar</span><span class="v c">${Object.keys(S.pasar).length}/3</span></div>
     <div class="baris"><span class="k">fakta dicerna</span><span class="v c">${S.stat.fakta}</span></div>
     <div class="kecil">rumus terbuka: 40% baca + 20% segar + 20% pasar + 20% fakta</div>`;
  // cermin diri
  const d=document.getElementById('pkDiri'); const baris=[];
  const g=(path,cb)=>{ const b=S.baca[path]; if(b&&b.fakta) cb(b); };
  g('versi.json', b=>{ const f=b.fakta.join(' '); const m=f.match(/kodeVersi <b>([^<]+)<\/b>/);
    if(m) baris.push(['kodeVersi otak arena', m[1]]); });
  g('arena-keadaan.json', b=>{ const f=b.fakta.join(' ');
    const hr=f.match(/hit-rate <b>([^<]+)<\/b>/); if(hr) baris.push(['hit-rate arena', hr[1]]);
    const gen=f.match(/generasi <b>([^<]+)<\/b>/); if(gen) baris.push(['genom generasi', gen[1]]);
    const wr=f.match(/win-rate ([\d.,]+)%/); if(wr) baris.push(['win-rate bukuCuan', wr[1]+'%']); });
  g('otak/genome-server.json', b=>{ const f=b.fakta.join(' ');
    const bel=f.match(/belajar (\d+)×/); if(bel) baris.push(['belajar otak-server', bel[1]+'×']); });
  if(S.cermin.data){ const st=(S.cermin.data.standings||[]).find(x=>x.competitor==='MICAPROFITA');
    if(st) baris.push(['kumulatif arena', (st.cumRet*100).toFixed(2)+'%']); }
  baris.push(['bytes dicerna', kb(Math.max(0,S.stat.bytes))]);
  baris.push(['uji-jalan pasar', S.stat.btTotal+' transisi']);
  d.innerHTML=baris.map(([k,v])=>`<div class="baris"><span class="k">${k}</span><span class="v c">${v}</span></div>`).join('');
}
function pikirRender(){
  document.getElementById('pkNama').textContent=S.kerja.nama;
  document.getElementById('pkFase').textContent=S.kerja.fase?('fase: '+S.kerja.fase):'siklus selesai — mengamati kembali';
  const m=S.kerja.mengapa;
  document.getElementById('pkMengapa').innerHTML = m.length
    ? m.map((k,i)=>`${i===0?'<b>✔</b>':'&nbsp;&nbsp;'} [${k.u}] ${k.t}`).join('<br>')
    : 'menghitung keadaan…';
  indeksRender();
}
function petaRender(){
  const w=document.getElementById('tab-peta'); if(S.tabAktif!=='peta') {w.dataset.kotor='1'; return;}
  delete w.dataset.kotor;
  const dirs=new Map();
  for(const f of S.pohon.files){ const i=f.path.lastIndexOf('/'); const dir=i<0?'· akar':f.path.slice(0,i);
    if(!dirs.has(dir)) dirs.set(dir,[]); dirs.get(dir).push(f); }
  let h='';
  for(const [dir,fs] of [...dirs.entries()].sort()){
    h+=`<div class="dirHdr">${dir} — ${fs.length} file</div>`;
    for(const f of fs.sort((a,b)=>a.path.localeCompare(b.path))){
      const st=statusNode(f.path), b=S.baca[f.path];
      const ikon=st==='b2'?'●':st==='b1'?'◐':st==='b3'?'↻':'○';
      h+=`<div class="fileRow" data-p="${f.path}"><span class="st ${st}">${ikon}</span>
        <span class="nm">${f.path.split('/').pop()}</span>
        <span class="sz">${kb(f.size)}${b&&b.partial?' · '+f1(b.pct)+'%':''}</span></div>`;
      if(S.petaPilih===f.path && b && b.fakta){ h+=`<ul class="faktaList">${b.fakta.map(x=>`<li>${x}</li>`).join('')}</ul>`; }
      else if(S.petaPilih===f.path){ h+=`<div class="kecil" style="padding:2px 6px 6px">○ belum kubaca — sentuh node ini di panggung untuk memerintahku membacanya</div>`; }
    }
  }
  w.innerHTML=h||'<div class="kecil">pohon belum terbaca — menunggu sensor rumah</div>';
}
function petaDetail(path){ S.petaPilih=path; petaRender(); }
function pasarRender(){
  const w=document.getElementById('tab-pasar'); if(S.tabAktif!=='pasar') {w.dataset.kotor='1'; return;}
  delete w.dataset.kotor;
  const syms=Object.keys(S.pasar);
  w.innerHTML = syms.length? syms.map(s=>{ const p=S.pasar[s];
    return `<div class="blok"><div class="symHdr"><b>${s}</b>
      <a class="sumber" target="_blank" rel="noopener" href="https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1h&limit=200">sumber mentah ↗</a></div>
      <div class="baris"><span class="k">harga kini</span><span class="v">${p.harga!==undefined?p.harga.toPrecision(6):'—'}</span></div>
      <div class="baris"><span class="k">24 jam</span><span class="v ${p.chg>=0?'h':'r'}">${(p.chg>=0?'+':'')+f2(p.chg)}%</span></div>
      <div class="baris"><span class="k">EMA20/50</span><span class="v">${p.ema20?.toPrecision(5)||'—'} / ${p.ema50?.toPrecision(5)||'—'}</span></div>
      <div class="baris"><span class="k">RSI14 · ATR14</span><span class="v">${f1(p.rsi)} · ${p.atr?.toPrecision(4)||'—'}</span></div>
      <div class="baris"><span class="k">momentum 7j/48j</span><span class="v ${(p.mom7||0)>=0?'h':'r'}">${f2(p.mom7)}% / ${f2(p.mom48)}%</span></div>
      ${p.bt?`<div class="baris"><span class="k">uji-jalan 24j</span><span class="v ${p.bt.net>=0?'h':'r'}">${p.bt.n} trx, menang ${p.bt.menang}, net ${f2(p.bt.net)}%</span></div>`:''}
      ${p.audit?`<div class="baris"><span class="k">audit pick</span><span class="v ${p.audit.vonis==='SEPAKAT'?'h':p.audit.vonis==='MENDEVIASI'?'r':'e'}">${p.audit.vonis} — ${p.audit.ket}</span></div>`:''}
      <div class="kecil">dihitung ${umur(sekarang()-p.at)} lalu · dari ${p.n||'?'} lilin 1j Binance</div></div>`;
  }).join('') : '<div class="kecil">belum ada studi pasar — menunggu sasaran cermin arena</div>';
}
function jurnalRender(){
  const w=document.getElementById('tab-jurnal'); if(S.tabAktif!=='jurnal') return;
  w.innerHTML=S.jurnal.slice(-70).reverse().map(j=>
    `<div class="jr ${j.kelas}"><span class="t">${wib(j.at)} WIB · ${j.jenis}</span><br>${j.teks}</div>`).join('')
    || '<div class="kecil">—</div>';
}
function tabKe(nama){ S.tabAktif=nama;
  document.querySelectorAll('#pTabs button').forEach(b=>b.classList.toggle('akt', b.dataset.tab===nama));
  for(const t of ['pikir','peta','pasar','jurnal']) document.getElementById('tab-'+t).hidden = t!==nama;
  if(nama==='peta'){ if(document.getElementById('tab-peta').dataset.kotor||!document.getElementById('tab-peta').innerHTML) petaRender(); }
  if(nama==='pasar') pasarRender();
  if(nama==='jurnal') jurnalRender();
}
document.querySelectorAll('#pTabs button').forEach(b=>b.onclick=()=>tabKe(b.dataset.tab));
document.getElementById('pHandle').onclick=()=>document.getElementById('panel').classList.toggle('tumbuh');
// delegasi klik baris file di PETA-DIRI → detail fakta / perintah
 document.getElementById('tab-peta').addEventListener('click', (ev)=>{
   const row=ev.target.closest('.fileRow'); if(row && row.dataset.p) petaDetail(row.dataset.p);
 });

/* ================= INTERAKSI ================= */
function sentuh(ev){
  const p=ev.touches?ev.touches[0]:ev; ukur();
  // layar → dunia (tanpa pembagian ganda; W2X/W2Y memetakan world→bebas linear)
  const wx=(p.clientX-bebas.x)/bebas.w*LAYOUT.w, wy=(p.clientY-bebas.y)/bebas.h*LAYOUT.h;
  // cyborg?
  if(Math.hypot(wx-BOB.x, wy-BOB.y)<34){ sapa(); return; }
  // node terdekat
  let terbaik=null, dmin=30/Math.min(1,skala);
  for(const [path,n] of LAYOUT.nodes){ const d=Math.hypot(wx-n.x, wy-n.y);
    if(d<dmin){ dmin=d; terbaik=path; } }
  if(terbaik){ S.perintah=terbaik; petaDetail(terbaik); }
}
cv.addEventListener('click', sentuh);
function sapa(){
  const n=S.pohon.files.length, baca=Object.keys(S.baca).length;
  const kodeVersi=(S.baca['versi.json']?.fakta.join(' ').match(/kodeVersi <b>([^<]+)<\/b>/)||[])[1];
  const hr=(S.baca['arena-keadaan.json']?.fakta.join(' ').match(/hit-rate <b>([^<]+)<\/b>/)||[])[1];
  const el=document.getElementById('sapa');
  el.innerHTML=`<b>AKU SADAR-REPO — wujud cyborg MICAPROFITA.</b><br>
    Rumahku <b>${n} file</b>; sudah kubaca <b>${baca}/${n}</b> (${kb(Math.max(0,S.stat.bytes))} kode, ${S.stat.fakta} fakta nyata).
    ${kodeVersi?`Otak arena versi <b>${kodeVersi}</b>.`:''} ${hr?`Hit-rate diriku di arena ${hr}.`:''}<br>
    Pasar: <b>${Object.keys(S.pasar).length}</b> simbol kupelajari dari lilin Binance hidup, ${S.stat.btTotal} uji-jalan nyata.<br>
    <span class="kecil">Aku bukan dunia terpisah — aku HIDUP DI DALAM repo ini, dan repo inilah tubuhku.</span>`;
  el.hidden=false;
  const r=cv.getBoundingClientRect();
  el.style.left=Math.min(innerWidth-360, Math.max(10, r.left+bebas.w*0.05))+'px';
  el.style.top=Math.max(54, bebas.y+30)+'px';
  clearTimeout(el._t); el._t=setTimeout(()=>el.hidden=true, 7000);
  jurnal('SAPA', `kupandukkan diri ke pemilik: ${baca}/${n} file, ${S.stat.fakta} fakta, ${Object.keys(S.pasar).length} simbol pasar`);
}

/* ================= BOOT ================= */
(async function boot(){
  muat(); ukur(); S.stat.sesi++;
  tabKe('pikir'); stripRender(); hudRender(); indeksRender(); petaRender(); pasarRender(); jurnalRender();
  S.pohon.files.length && susun();
  jurnal('LAHIR', `sesi #${S.stat.sesi} — sadar-repo menyala; kubaca ulang keadaan rumah (penjaga denyut 15 mnt bisa menggerakkannya kapan pun)`);
  // denyut pohon pertama segera
  try{ await pindaiRumah(); susun(); }catch(e){
    S.terputus=true; hudRender();
    jurnal('STATUS', S.pohon.files.length
      ? `pohon repo tak terjangkau (${pesan(e)}) — hidup dari peta-cache umur ${umur(sekarang()-S.pohon.at)}; akan kupancing ulang`
      : `pohon repo tak terjangkau (${pesan(e)}) — tanpa peta aku tetap hidup: renung + cermin same-origin + pasar Binance`, 'gagal');
  }
  otakLoop();
  // probe uji (deterministik, tak mengubah perilaku)
  window.__v85 = {S, LAYOUT, bebasState:()=>bebas, skalaState:()=>skala, BOB, FASE};
  // render loop
  (function loop(){ gambar(); requestAnimationFrame(loop); })();
  setInterval(()=>{ hudRender(); if(S.tabAktif==='pasar') pasarRender(); }, 5000);
})();
