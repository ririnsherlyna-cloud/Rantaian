function rakMuat(rect, fs){
  // al-jabr rak: pitch menyesuaikan lebar & isi; area rak mulai DI BAWAH papan nama (y+44);
  // kapasitas dihitung DULU — buku yang tak muat TIDAK PERNAH digambar keluar ruangan
  const w0=rect.w, h0=rect.h;
  let p=Math.max(5.5, Math.min(11, (w0-18)/Math.max(1, Math.ceil(Math.sqrt(Math.max(1,fs.length))))));
  let cols=Math.max(1, Math.floor((w0-18)/p)), rows=Math.ceil(fs.length/cols);
  while(rows*(p+6)>h0-52 && p>5){ p-=0.5; cols=Math.max(1, Math.floor((w0-18)/p)); rows=Math.ceil(fs.length/cols); }
  const kapRows=Math.max(1, Math.floor((h0-52)/(p+6)));
  const muat=Math.max(0, cols*kapRows);
  return {p, cols, kapRows, muat};
}
function rapikanRuang(rects){
  // PAS-KAN (V296): menolak dua ruangan bertumpuk di viewport APA PUN —
  // pasangan yang bersinggungan didorong menjauh (poros terkecil) lalu dijepit ke kanvas.
  const x0=bebas.x+2, y0=bebas.y+2, x1=bebas.x+bebas.w-2, y1=bebas.y+bebas.h-2;
  for(let it=0; it<90; it++){
    let ada=false;
    for(let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++){
      const a=rects[i], b=rects[j];
      const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
      const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
      if(ox>2 && oy>2){ ada=true;
        if(oy<=ox) b.y+=(b.y+b.h/2>=a.y+a.h/2)?(oy+2):-(oy+2);
        else       b.x+=(b.x+b.w/2>=a.x+a.w/2)?(ox+2):-(ox+2);
        b.x=Math.max(x0, Math.min(b.x, x1-b.w));
        b.y=Math.max(y0, Math.min(b.y, y1-b.h));
      }
    }
    if(!ada) return true;
  }
  return false;
}
function susun(){
  const W=bebas.w, H=bebas.h;
  const portret = W<760 || H>W*1.15;
  LAYOUT.mode = portret ? 'teras' : 'lingkar';
  LAYOUT.nodes.clear(); LAYOUT.zona=[]; LAYOUT.rects=[]; LAYOUT.brankas=new Map();
  const GUDANG=[];
  const maxSize=Math.max(1, ...S.pohon.files.map(f=>f.size||1));
  const jelas=Math.log1p(maxSize);
  const kel=new Map();
  for(const f of S.pohon.files){ const i=f.path.lastIndexOf('/'); const dir=i<0?'· akar':f.path.slice(0,i);
    const k=slotDir(dir); if(!kel.has(k)) kel.set(k,[]); kel.get(k).push(f); }
  const zonaDef=SLOT_ISTANA.map(([dir,sudut,rf,jenis])=>({dir,sudut,rf,jenis,
    fs:(kel.get(dir)||[]).slice().sort((a,b)=>a.path.localeCompare(b.path))}));
  const sar=(kel.get('SARANG')||[]).sort((a,b)=>a.path.localeCompare(b.path));
  const kandidat=new Map();
  let pond, den, ist;
  const btnZone=72;   // zona bebas tombol + di pojok kanan-bawah
  /* ---- FASE 1: kandidat rect (dua mode al-jabr) ---- */
  function bangunLingkar(){
    const D=Math.min(W,H);
    const cxm=bebas.x+W/2, cym=bebas.y+H/2;
    den={x:cxm, y:cym, r:D*0.082};
    pond={x:cxm-D*0.17, y:cym+D*0.34-D*0.082, w:D*0.34, h:D*0.165};
    ist={D, cx:cxm, cy:cym, rKubah:D*0.082, rKardinal:0.35*D, rPaviliun:0.50*D,
      cincin:(S.habitat&&S.habitat.istana&&S.habitat.istana.cincin)||2,
      menaraGen:(S.habitat&&S.habitat.istana&&S.habitat.istana.menaraGen)||0,
      menaraSkor:(S.habitat&&S.habitat.istana&&S.habitat.istana.menaraSkor)||0};
    for(const z of zonaDef){
      const sx=cxm+Math.cos(z.sudut*Math.PI/180)*D*z.rf;
      const sy=cym+Math.sin(z.sudut*Math.PI/180)*D*z.rf;
      // ruangan DIPERLUAS (V295): kardinal 0,30×0,22D — paviliun 0,26×0,20D
      const w0=(z.jenis==='kardinal'?0.30:0.26)*D, h0=(z.jenis==='kardinal'?0.22:0.20)*D;
      kandidat.set(z.dir,{rect:{x:Math.max(bebas.x+2, Math.min(sx-w0/2, bebas.x+W-w0-2)),
        y:Math.max(bebas.y+2, Math.min(sy-h0/2, bebas.y+H-h0-2)), w:w0, h:h0},
        fs:z.fs, jenis:z.jenis, sudut:z.sudut, rf:z.rf});
    }
    const wS=Math.max(76, Math.min(156, 0.24*D));
    const hS=Math.max(58, Math.min(98, 0.15*D), 106);   // 106 = brankas 9 harta 5 baris tak terpotong
    kandidat.set('· gudang',{rect:{x:bebas.x+8, y:bebas.y+H-hS-btnZone+40, w:wS, h:hS}, fs:[], jenis:'gudang', sudut:195, rf:0.66});
    kandidat.set('BRANKAS',{rect:{x:bebas.x+W-wS-8, y:bebas.y+H-hS-btnZone+40, w:wS, h:hS}, fs:[], jenis:'brankas', sudut:-15, rf:0.66});
  }
  function bangunTeras(hS){
    const M=6;
    const cxm=bebas.x+W/2;
    den={x:cxm, y:bebas.y+Math.min(78,H*0.10)+30, r:Math.min(30, W*0.085)};
    const wingsY=bebas.y+H-btnZone-hS;
    const pondH=Math.max(52, Math.min(64, H*0.075));
    pond={x:bebas.x+M, y:wingsY-8-pondH, w:W-2*M, h:pondH};
    ist={D:Math.min(W,H*0.62), cx:cxm, cy:den.y, rKubah:den.r, rKardinal:0, rPaviliun:0, teras:true,
      cincin:(S.habitat&&S.habitat.istana&&S.habitat.istana.cincin)||2,
      menaraGen:(S.habitat&&S.habitat.istana&&S.habitat.istana.menaraGen)||0,
      menaraSkor:(S.habitat&&S.habitat.istana&&S.habitat.istana.menaraSkor)||0};
    const top=den.y+den.r+16, bottom=pond.y-10, gap=8;
    const rowH=Math.max(66, Math.min(150, (bottom-top-3*gap)/4));
    const cellW=(W-2*M-gap)/2;
    ist.terasRowH=Math.round(rowH); ist.terasCellW=Math.round(cellW);
    const grid=[['otak','.github/workflows'],['memori','· akar'],['scripts','scripts/ujian-buta']];
    const place=(dir,x,y,w0,h0,jenis)=>{ const z=zonaDef.find(q=>q.dir===dir);
      kandidat.set(dir,{rect:{x:Math.round(x),y:Math.round(y),w:Math.round(w0),h:Math.round(h0)},
        fs:z?z.fs:[], jenis, sudut:z?z.sudut:0, rf:z?z.rf:0}); };
    grid.forEach((bar,k)=>bar.forEach((dir,c)=>place(dir, bebas.x+M+c*(cellW+gap), top+k*(rowH+gap), cellW, rowH, 'teras')));
    place('laporan', bebas.x+M, top+3*(rowH+gap), W-2*M, rowH, 'teras');
    const wS=(W-2*M-gap)/2;
    kandidat.set('· gudang',{rect:{x:bebas.x+M, y:wingsY, w:wS, h:hS}, fs:[], jenis:'gudang', sudut:195, rf:0.66});
    kandidat.set('BRANKAS',{rect:{x:bebas.x+M+wS+gap, y:wingsY, w:wS, h:hS}, fs:[], jenis:'brankas', sudut:-15, rf:0.66});
  }
  if(portret){
    bangunTeras(96);
    // PASS-2 ukur luberan nyata → tinggi sayap menyesuaikan isi (istana MEMBANGUN ruangnya sendiri)
    let luap=0;
    for(const [,k] of kandidat){ if(k.fs.length){ luap+=Math.max(0, k.fs.length-rakMuat(k.rect,k.fs).muat); } }
    const wS=(W-18)/2;
    const colsG=Math.max(1, Math.floor((wS-18)/7));
    const hSg=44+Math.ceil(luap/colsG)*12.5+8;
    const hSb=44+Math.ceil(9/2)*13.5+6;
    bangunTeras(Math.max(92, Math.min(Math.floor(H*0.30), Math.max(hSg, hSb))));
  } else bangunLingkar();
  /* ---- FASE 2: pas-kan — NOL tabrakan di viewport apa pun ---- */
  const semua=[...kandidat.values()].map(k=>k.rect); semua.push(pond);
  rapikanRuang(semua);
  /* ---- FASE 3: rak, buku, zona (pakai rect FINAL) ---- */
  for(const z of zonaDef){
    const k=kandidat.get(z.dir); if(!k) continue;
    const {p, cols, muat}=rakMuat(k.rect, k.fs);
    const muatFs=k.fs.slice(0, muat), luapFs=k.fs.slice(muat);
    for(const f of luapFs) GUDANG.push(f);
    const rowsMuat=Math.max(1, Math.ceil(muatFs.length/cols));
    const x0=k.rect.x+k.rect.w/2-((Math.min(cols,Math.max(1,muatFs.length))-1)*p)/2;
    const y0=k.rect.y+44;
    LAYOUT.rak=ZONA_NAMA; // (penanda; garis rak digambar di gambarHabitat dari data ini)
    muatFs.forEach((f,i)=>{
      const gx=i%cols, gy=Math.floor(i/cols);
      const r=2.6+3.4*Math.log1p(f.size||1)/jelas;
      LAYOUT.nodes.set(f.path, {x:x0+gx*p, y:y0+gy*(p+6), r:Math.min(5.6,r), dir:z.dir, f, gy, cols, rowY:y0+gy*(p+6)});
    });
    LAYOUT.zona.push({dir:z.dir, dirs:[z.dir], jenis:k.jenis, sudut:z.sudut, rf:z.rf,
      nama:ZONA_NAMA[z.dir]||z.dir.split('/').pop().toUpperCase(),
      rect:k.rect, cx:k.rect.x+k.rect.w/2, cy:k.rect.y+k.rect.h/2, n:muatFs.length, luap:luapFs.length,
      rakRows:rowsMuat, rakRowY:Array.from({length:rowsMuat},(_,g)=>y0+g*(p+6))});
    LAYOUT.rects.push(k.rect);
  }
  LAYOUT.den=den; LAYOUT.pond=pond; LAYOUT.istana=ist;
  // SARANG: ingatan resmi (ruang-hidup) mengorbit kubah — pusat kehidupan
  const rs=den.r+13;
  sar.forEach((f,i)=>{
    const a=-Math.PI/2 + i*(2*Math.PI/Math.max(1,sar.length));
    const r=2.4+2.6*Math.log1p(f.size||1)/jelas;
    LAYOUT.nodes.set(f.path, {x:den.x+Math.cos(a)*rs, y:den.y+Math.sin(a)*rs*0.84, r:Math.min(4.8,r), dir:'ruang-hidup', f});
  });
  /* ===== SAYAP ISTANA — GUDANG & BRANKAS: selalu DI ATAS zona tombol (btnZone) ===== */
  const kg=kandidat.get('· gudang'), kb2=kandidat.get('BRANKAS');
  LAYOUT.zona.push(
    {dir:'· gudang', dirs:['· gudang'], jenis:'gudang', sudut:195, rf:0.66, nama:'GUDANG',
      rect:kg.rect, cx:kg.rect.x+kg.rect.w/2, cy:kg.rect.y+kg.rect.h/2, n:0, luap:0, rakRows:0, rakRowY:[]},
    {dir:'BRANKAS', dirs:['BRANKAS'], jenis:'brankas', sudut:-15, rf:0.66, nama:'BRANKAS',
      rect:kb2.rect, cx:kb2.rect.x+kb2.rect.w/2, cy:kb2.rect.y+kb2.rect.h/2, n:0, luap:0, rakRows:0, rakRowY:[]});
  LAYOUT.rects.push(kg.rect, kb2.rect);
  const gz=LAYOUT.zona[LAYOUT.zona.length-2];
  {
    const gw=gz.rect.w-18, gh=gz.rect.h-46;
    const p2=Math.max(5.5, Math.min(11, gw/Math.max(1, Math.ceil(Math.sqrt(Math.max(1,GUDANG.length))))));
    const cols2=Math.max(1, Math.floor(gw/p2));
    const rowsCap=Math.max(1, Math.floor(gh/(p2+6)));
    const muatG=Math.max(0, cols2*rowsCap);
    GUDANG.slice(0, muatG).forEach((f,i)=>{
      const gx=gz.rect.x+11+(i%cols2)*p2, gy=gz.rect.y+40+Math.floor(i/cols2)*(p2+6);
      LAYOUT.nodes.set(f.path, {x:gx, y:gy, r:Math.min(4.6, 2.6+3.4*Math.log1p(f.size||1)/jelas), dir:'· gudang', f});
    });
    gz.n=GUDANG.length; gz.luap=GUDANG.length; gz.rakMuatG=muatG;
  }
  // BRANKAS: pointer EMAS ke artefak nyata penentu nyawa makhluk (klik = baca; isinya cuma file yang BENAR ada)
  const bz=LAYOUT.zona[LAYOUT.zona.length-1];
  {
    const ISI=['ruang-hidup/habitat.json','ruang-hidup/madrasah.json','ruang-hidup/ingatan.json',
      'ruang-hidup/keadaan.json','laporan/nalar-biner.json','laporan/sasaran-terkini.json',
      'arena-keadaan.json','versi.json','brain.json'];
    let gi=0;
    for(const pth of ISI){
      const f=S.pohon.files.find(f2=>f2.path===pth); if(!f) continue;
      const gx=bz.rect.x+17+(gi%2)*((bz.rect.w-34)/2+9);
      const gy=bz.rect.y+42+Math.floor(gi/2)*13.5;
      if(gy+5>bz.rect.y+bz.rect.h) break;    // jaminan keras: harta tak pernah keluar kamar
      LAYOUT.brankas.set(f.path, {path:f.path, x:gx, y:gy, f, dir:'BRANKAS', r:3.4});
      gi++;
    }
    bz.n=gi;
  }
  POND_POS={};
}
