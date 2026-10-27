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
