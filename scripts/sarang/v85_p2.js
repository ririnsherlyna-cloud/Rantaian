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
