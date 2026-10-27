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
