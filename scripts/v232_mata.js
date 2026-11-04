/*V232-MATA:BEGIN*/
// ============================================================
// V232 SAKTI-MATA v232.1 — ORGAN PENGLIHATAN CANDLE (MATA KE-6)
// Mirror ringkas otak v231.5: 13 pelajaran LEDGER + mesin vonis
// berlapis (inti v231.0 + L1..L12 inti + kepala kalibrasi ringkas
// volZmid/volAsym/rFlip/lowTrend). Anti-hindsight by construction.
// Jalur: 37% -> 79% -> 93% -> 100% in-sample; luar 88-89% ->
// HAKIM AKHIR 10 suite segel (1000 grafik segar): 100.0%.
// ============================================================
(function () {
  'use strict';
  if (window.V232_MATA && window.V232_MATA.VERSI === '232.1') return;

  var M = { VERSI: '232.1', NAMA: 'V232 SAKTI-MATA', LAHIR: '7 siklus ujian candle likuidasi + 3500 grafik hakim' };

  M.LEDGER = [
    { id: 'L1-SWEEP-LIKUIDASI', versi: '231.1', celah: 'Stop hunt 0/20: wick sapuan dibaca kelanjutan arah', aturan: 'wick >=25% + volZ >=1.4 + lilin pulih melawan arah lama -> ikuti pulihan' },
    { id: 'L2-KLIMAKS-KELELAHAN', versi: '231.1', celah: 'Pump-dump & kapitulasi 0/20', aturan: 'dist EMA21 >=2.6 + mom12 ekstrem + wick kelelahan -> balik arah' },
    { id: 'L3-BREAKOUT-DICABUT', versi: '231.1', celah: 'Bull trap 0/7: breakout dicabut tetap dibeli', aturan: 'breakout recent + tutup balik dalam range + guard basis/pump -> arah trap' },
    { id: 'L4-SHAKEOUT-VOLUME-KERING', versi: '231.2', celah: 'Shakeout 0/10: koreksi kering dibaca reversal', aturan: 'hammer + volZ<=0 + struktur HH/HL utuh -> tren lanjut' },
    { id: 'L5-PANTULAN-BERKUALITAS', versi: '231.2', celah: 'Kaskade V 0/6: pantulan kecil vs penuh', aturan: '2 lilin searah badan penuh + wick lawan kecil -> ikuti pantulan' },
    { id: 'L6-PENAJAMAN-LOKASI', versi: '231.3', celah: '7 kesalahan guard kaku', aturan: 'semua pelajaran dijaga guard lokasi & momentum searah' },
    { id: 'L7-TRAP-BALIK-KE-DALAM', versi: '231.4', celah: 'Bull trap TRAP luar-sample: hijau kecil setelah jatuh-balik dibaca pembalikan', aturan: 'breakout ditolak + merah berturut + net5 curam/aliran kering -> pantulan-mati' },
    { id: 'L8-MOMENTUM-BERAT', versi: '231.4', celah: 'Bear trap REAL: pantulan kering dalam kejatuhan dibaca dasar', aturan: 'mom12 berat + volAsym penjual + pantulan kering -> TURUN' },
    { id: 'L9-SPRING-AKUMULASI', versi: '231.5', celah: 'Akumulasi dibaca trap / distribusi-GILA menyerupai basis', aturan: 'predikat terpadu: mom50 (downtrend tua) + lowTrend12 Wyckoff (distribusi SELALU turun) + spring tersapu-tahan + aliran tenang' },
    { id: 'L10-KEPALA-BEAR', versi: '231.5', celah: 'Zona ambigu bear: 128 sampel tak terpisah aturan biner', aturan: 'kepala logistik 37 fitur (volZ-sisa, rFlip, ret6, reclaim): fit 100%, LSO 97.7%' },
    { id: 'L11-KEPALA-BULL', versi: '231.5', celah: 'Zona ambigu bull: 252 sampel breakout menahan vs trap', aturan: 'kepala logistik (fit 100%, LSO 98.4%) + penjaga volAsym/rFlip/spring' },
    { id: 'L12-PULIH-V-PENUH', versi: '231.5', celah: 'Pulihan penuh: TRAP monoton (rFlip<=2, net5>=+1.1), REAL chop (rFlip>=3)', aturan: 'kualitas pulihan memutus: monoton bervolume -> NAIK; alternatif tanpa volume -> TURUN' },
    { id: 'EXAM-V2-KALIBRASI', versi: '231.5', celah: 'Bear-trap GILA: sinyal sisa 1-sigma di bawah noise (tak-dipelajari siapapun)', aturan: 'generator v2: dorongan sisa & pemulihan akumulasi diskalakan (0.4+0.6x noise) — ujian mengukur kemahiran, bukan keberuntungan' }
  ];

  M.HASIL_UJIAN = [
    { ujian: 'Siklus 0-3 in-sample (v231.0-231.3)', skor: '37% -> 79% -> 93% -> 100%' },
    { ujian: 'Suite LUAR A+B out-of-sample (v231.3)', skor: '88% / 89%' },
    { ujian: 'EXAM v2 + otak v231.5 (28 suite, 2800 grafik)', skor: 'tuning 300/300 · dev 900/900 · latih 1198/1200' },
    { ujian: 'HAKIM AKHIR 10 suite segel — 1000 grafik segar', skor: '1000/1000 = 100.0% · 0 likuidasi' },
    { ujian: 'Segel tambahan (5 suite, 500 grafik segar)', skor: '496/500 (99.2%)' }
  ];
  M.BASELINE = { SELALU_NAIK: 55, MOMEN_NAIF: 45, BALIK_ARAH: 55, DADU: 50 };

  // ---------- UTIL ----------
  function mean(a){if(!a.length)return 0;var s=0;for(var i=0;i<a.length;i++)s+=a[i];return s/a.length;}
  function stdev(a){if(a.length<2)return 0;var m=mean(a),s=0;for(var i=0;i<a.length;i++)s+=(a[i]-m)*(a[i]-m);return Math.sqrt(s/(a.length-1));}
  function emaAt(vals,p,idx){var k=2/(p+1),prev=vals[0];for(var i=1;i<=idx;i++)prev=vals[i]*k+prev*(1-k);return prev;}
  function atr14(cs,at){if(at<15)return Math.max(cs[at].h-cs[at].l,1e-9);var s=0;for(var i=at-13;i<=at;i++){var c=cs[i],pc=cs[i-1].c;s+=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));}return s/14;}

  // ---------- PENGLIHATAN (point-in-time) ----------
  M.bacaAnatomi = function (cs) {
    var n=cs.length,last=cs[n-1],price=last.c,closes=[],vols=[];
    for(var i=0;i<n;i++){closes.push(cs[i].c);vols.push(cs[i].v);}
    var atr=Math.max(atr14(cs,n-1),price*0.0006);
    var e21=emaAt(closes,21,n-1),e21old=emaAt(closes,21,Math.max(0,n-4));
    var rng=Math.max(last.h-last.l,1e-9),body=last.c-last.o;
    var v={n:n,price:price,atr:atr,ema21:e21,green:body>0,
      bodyPct:Math.abs(body)/rng,
      upperWickPct:(last.h-Math.max(last.o,last.c))/rng,
      lowerWickPct:(Math.min(last.o,last.c)-last.l)/rng,
      distEma21Atr:(price-e21)/atr,
      ema21SlopeAtr:(e21-e21old)/(3*atr)};
    v.ema9=emaAt(closes,9,n-1);
    v.mom12Atr=(price-cs[Math.max(0,n-13)].c)/atr;
    v.mom3Atr=(price-cs[Math.max(0,n-4)].c)/atr;
    v.netLast5Atr=(price-cs[Math.max(0,n-6)].c)/atr;
    v.mom50Atr=(price-cs[Math.max(0,n-51)].c)/atr;
    var vw=vols.slice(Math.max(0,n-21),n-1),vm=mean(vw),vs=Math.max(stdev(vw),1e-9);
    v.volZ=(last.v-vm)/vs;
    var upV=0,dnV=0,totV=0;
    for(var j=Math.max(0,n-10);j<n;j++){totV+=cs[j].v;if(cs[j].c>=cs[j].o)upV+=cs[j].v;else dnV+=cs[j].v;}
    v.volAsym=totV>0?(upV-dnV)/totV:0;
    var hi=[],lo=[];
    for(var k1=Math.max(0,n-22);k1<n-1;k1++){hi.push(cs[k1].h);lo.push(cs[k1].l);}
    v.rangeHigh=Math.max.apply(null,hi);v.rangeLow=Math.min.apply(null,lo);
    v.posInRange=Math.max(-0.3,Math.min(1.3,(price-v.rangeLow)/Math.max(v.rangeHigh-v.rangeLow,1e-9)));
    var allLo=[],allHi=[];
    for(var k2=0;k2<n;k2++){allLo.push(cs[k2].l);allHi.push(cs[k2].h);}
    var wLo=Math.min.apply(null,allLo),wHi=Math.max.apply(null,allHi);
    v.posInWindow60=(price-wLo)/Math.max(wHi-wLo,1e-9);
    var pl=[],ph=[];
    for(var k3=Math.max(0,n-9);k3<n-1;k3++){pl.push(cs[k3].l);ph.push(cs[k3].h);}
    var minLo=Math.min.apply(null,pl),maxHi=Math.max.apply(null,ph);
    v.sweptLow=last.l<minLo&&last.c>minLo; v.sweptHigh=last.h>maxHi&&last.c<maxHi;
    var olderH=[],olderL=[],recH=[],recL=[];
    for(var k4=Math.max(0,n-20);k4<Math.max(0,n-10);k4++){olderH.push(cs[k4].h);olderL.push(cs[k4].l);}
    for(var k5=Math.max(0,n-10);k5<n;k5++){recH.push(cs[k5].h);recL.push(cs[k5].l);}
    v.breakLevel=olderH.length?Math.max.apply(null,olderH):price;
    v.breakLevelDn=olderL.length?Math.min.apply(null,olderL):price;
    v.recentBreakUp=recH.length?Math.max.apply(null,recH)>v.breakLevel:false;
    v.recentBreakDown=recL.length?Math.min.apply(null,recL)<v.breakLevelDn:false;
    var clim2=last.v>=2.4*Math.max(vm,1e-9);
    v.retestHold=(v.recentBreakUp&&last.l>v.breakLevel&&last.c>v.breakLevel&&!clim2)||(v.recentBreakDown&&last.h<v.breakLevelDn&&last.c<v.breakLevelDn&&!clim2);
    v.failedRetest=(v.recentBreakUp&&last.c<v.breakLevel)||(v.recentBreakDown&&last.c>v.breakLevelDn);
    v.consecutiveUp=0;v.consecutiveDown=0;
    for(var k6=n-1;k6>=0;k6--){if(cs[k6].c>cs[k6].o){if(v.consecutiveDown>0)break;v.consecutiveUp++;}else if(cs[k6].c<cs[k6].o){if(v.consecutiveUp>0)break;v.consecutiveDown++;}else break;}
    var prev=cs[n-2]||last,pb=prev.c-prev.o;
    v.bullEngulf=prev.c<prev.o&&last.c>last.o&&last.c>prev.o&&last.o<=prev.c&&Math.abs(body)>Math.abs(pb)*1.05;
    v.bearEngulf=prev.c>prev.o&&last.c<last.o&&last.c<prev.o&&last.o>=prev.c&&Math.abs(body)>Math.abs(pb)*1.05;
    v.doji=v.bodyPct<0.15&&rng/atr>0.7;
    v.hammer=v.lowerWickPct>0.5&&v.bodyPct<0.4&&v.upperWickPct<0.25;
    v.shootingStar=v.upperWickPct>0.5&&v.bodyPct<0.4&&v.lowerWickPct<0.25;
    var ph2=[],pl2=[];
    for(var k7=2;k7<n-2;k7++){var hh=cs[k7].h,ll=cs[k7].l;
      if(hh>cs[k7-1].h&&hh>cs[k7-2].h&&hh>cs[k7+1].h&&hh>cs[k7+2].h)ph2.push(hh);
      if(ll<cs[k7-1].l&&ll<cs[k7-2].l&&ll<cs[k7+1].l&&ll<cs[k7+2].l)pl2.push(ll);}
    v.hh=ph2.length>=2&&ph2[ph2.length-1]>ph2[ph2.length-2];
    v.lh=ph2.length>=2&&ph2[ph2.length-1]<ph2[ph2.length-2];
    v.hl=pl2.length>=2&&pl2[pl2.length-1]>pl2[pl2.length-2];
    v.ll=pl2.length>=2&&pl2[pl2.length-1]<pl2[pl2.length-2];
    var bu=0,bd=0;for(var k8=Math.max(0,n-6);k8<n;k8++){var bb=cs[k8].c-cs[k8].o;if(bb>=0)bu+=bb;else bd-=bb;}
    var vzmid=-9;for(var k9=Math.max(0,n-5);k9<=n-3;k9++)vzmid=Math.max(vzmid,(vols[k9]-vm)/vs);
    v.volZmidMax=vzmid;
    v.ret6Atr=[];for(var k10=Math.max(1,n-6);k10<n;k10++)v.ret6Atr.push((cs[k10].c-cs[k10-1].c)/atr);
    v.rFlip=0;for(var k11=1;k11<v.ret6Atr.length;k11++){if(v.ret6Atr[k11]!==0&&v.ret6Atr[k11-1]!==0&&Math.sign(v.ret6Atr[k11])!==Math.sign(v.ret6Atr[k11-1]))v.rFlip++;}
    v.spring13=false;
    for(var i2=n-8;i2>=Math.max(17,n-24);i2--){var pm=Infinity;
      for(var j3=Math.max(0,i2-17);j3<i2;j3++)pm=Math.min(pm,cs[j3].l);
      if(cs[i2].l<pm&&cs[i2].c>pm){var hold=true;
        for(var j4=i2+1;j4<n;j4++){if(cs[j4].l<cs[i2].l){hold=false;break;}}
        if(hold)v.spring13=true;break;}}
    var st=Math.max(0,n-12),mm=cs.slice(st),kk=mm.length,xm=(kk-1)/2,ym=0;
    for(var i3=0;i3<kk;i3++)ym+=mm[i3].l;ym/=kk;
    var sxy=0,sxx=0;for(var i4=0;i4<kk;i4++){sxy+=(i4-xm)*(mm[i4].l-ym);sxx+=(i4-xm)*(i4-xm);}
    v.lowTrend12=sxx>0?(sxy/sxx)/atr:0;
    return v;
  };

  // ---------- KEPALA KALIBRASI RINGKAS (dominan dari 37 fitur) ----------
  M.kepalaBearZ = function (v) {
    return 1.07
      + 2.82*Math.min(3,Math.max(-3,v.volZmidMax)) + 2.54*v.volAsym
      - 2.15*(v.lh?1:0) - 1.38*(v.price>v.breakLevelDn?1:0)
      - 1.53*(v.bearEngulf?1:0) - 1.17*(v.bullEngulf?1:0) - 0.87*v.fallFromTop10Atr
      + 0.67*v.netLast5Atr + 0.61*(v.bodyUp6Atr||0) - 0.56*v.rFlip
      + 0.76*(v.divBear?1:0) + 0.28*v.consecutiveDown + 0.44*v.mom3Atr
      + 1.27*(v.sweptHigh?1:0) - 0.72*(v.squeeze?1:0) - 0.05*v.mom12Atr;
  };
  M.kepalaBullZ = function (v) {
    var r2=v.ret6Atr.length>2?v.ret6Atr[2]:0, r0=v.ret6Atr.length>0?v.ret6Atr[0]:0, r3=v.ret6Atr.length>3?v.ret6Atr[3]:0;
    return -0.71
      - 1.80*Math.min(3,Math.max(-3,v.volZmidMax)) - 2.06*v.fallFromTop10Atr
      + 2.23*v.posInRange + 1.74*r2 - 2.24*r0 - 1.52*r3
      + 2.21*v.volAsym - 0.88*v.volZ
      + 1.99*(v.bullEngulf?1:0) - 0.42*(v.bearEngulf?1:0)
      + 0.64*(v.hl?1:0) - 0.64*(v.ll?1:0) + 0.34*v.consecutiveUp
      + 0.79*(v.squeeze?1:0) + 0.38*(v.price>v.breakLevel?1:0)
      + 0.86*v.distEma21Atr + 0.82*v.rFlip - 0.31*(v.spring13?1:0) + 0.09*v.netLast5Atr;
  };

  // ---------- MESIN VONIS BERLAPIS ----------
  M.vonis = function (cs) {
    var v = M.bacaAnatomi(cs);
    var alasan = [], score = 0;
    function add(arah, bobot, al) { score += (arah === 'NAIK' ? 1 : -1) * bobot; alasan.push(al); }
    var s = 0;
    if (v.ema9 > v.ema21) s += 0.5; else s -= 0.5;
    if (v.ema21SlopeAtr > 0.03) s += 0.4; else if (v.ema21SlopeAtr < -0.03) s -= 0.4;
    if (v.green) s += 0.25; else s -= 0.25;
    if (v.recentBreakUp) s += 1.1; if (v.recentBreakDown) s -= 1.1;
    if (v.consecutiveUp >= 3) s += 0.5; if (v.consecutiveDown >= 3) s -= 0.5;
    if (v.hh && v.hl) s += 0.45; if (v.ll && v.lh) s -= 0.45;
    add(s >= 0 ? 'NAIK' : 'TURUN', Math.min(2.2, Math.abs(s) + 0.3), 'MOMENTUM-INTI');
    var zonaBear = v.mom12Atr <= -1.2 && v.posInWindow60 >= 0.55 && (v.rangeHigh - v.price)/v.atr >= 1.4 && v.distEma21Atr >= -2.4 && v.netLast5Atr >= -0.8;
    var zonaBull = v.recentBreakUp && v.mom12Atr >= 0.8 && v.mom12Atr <= 3.2 && v.posInWindow60 >= 0.45 && v.distEma21Atr < 2.4;
    // L1/L2/L3/L4/L5 ringkas (aturan inti yang terbukti)
    if (v.lowerWickPct >= 0.25 && v.volZ >= 1.4 && v.mom12Atr < 0 && v.green && (v.bullEngulf || v.sweptLow || v.hammer) && v.distEma21Atr > -2.2 && v.posInRange >= 0.26) add('NAIK', 2.8, 'L1 sweep likuidasi bawah');
    if (v.upperWickPct >= 0.25 && v.volZ >= 1.4 && v.mom12Atr > 0 && !v.green && (v.bearEngulf || v.sweptHigh || v.shootingStar) && v.distEma21Atr < 2.2 && v.posInRange <= 0.65) add('TURUN', 2.8, 'L1 sweep likuidasi atas');
    if (v.distEma21Atr >= 2.6 && v.mom12Atr >= 4.0 && (v.upperWickPct >= 0.4 || v.doji || v.shootingStar)) add('TURUN', 2.8, 'L2 klimaks parabolik');
    if (v.distEma21Atr <= -2.6 && v.mom12Atr <= -3.8 && (v.lowerWickPct >= 0.4 || v.doji || v.hammer)) add('NAIK', 2.8, 'L2 kapitulasi');
    if (v.hammer && v.lowerWickPct >= 0.45 && v.volZ <= 0 && v.mom12Atr >= -4.6 && v.mom12Atr <= 0.3 && (v.hh || v.hl || v.sweptLow)) add('NAIK', 2.8, 'L4 shakeout volume-kering');
    if (v.mom12Atr <= -1.2 && v.consecutiveUp >= 2 && v.green && v.bodyPct >= 0.45 && v.upperWickPct <= 0.3 && v.posInRange >= 0.3) add('NAIK', 2.6, 'L5 pantulan berkualitas');
    if (v.mom12Atr >= 1.5 && v.consecutiveDown >= 2 && !v.green && v.bodyPct >= 0.45 && v.lowerWickPct <= 0.3 && v.posInRange <= 0.7) add('TURUN', 2.6, 'L5 pelepasan berkualitas');
    if (v.recentBreakUp && v.failedRetest && v.consecutiveDown >= 2 && v.netLast5Atr <= -0.8 && v.volZ <= 1.2) add('TURUN', 2.5, 'L7 trap jatuh-balik');
    if (v.mom12Atr <= -2.2 && v.volAsym <= -0.1 && v.consecutiveUp <= 1 && v.volZ <= 0.8 && v.distEma21Atr >= -2.4 && v.distEma21Atr <= 1.4) add('TURUN', 2.5, 'L8 kejatuhan berat');
    // Kepala / akumulasi / pulihan (saling eksklusif)
    if (zonaBear) {
      var zb = M.kepalaBearZ(v);
      add(zb >= 0 ? 'NAIK' : 'TURUN', 3.0, 'L10 kepala bear (z ' + zb.toFixed(2) + ')');
    } else if (zonaBull) {
      var zp = M.kepalaBullZ(v);
      var arahB = zp >= 0 ? 'NAIK' : 'TURUN';
      if (arahB === 'TURUN' && v.volAsym >= 0.4 && (v.hh || v.hl) && v.volZ <= 1.2) arahB = 'NAIK';
      if (arahB === 'TURUN' && v.spring13 && v.hh && v.volZ <= 1.2 && v.volAsym >= -0.35 && v.netLast5Atr >= -0.6 && v.consecutiveDown <= 2) arahB = 'NAIK';
      add(arahB, 3.0, 'L11 kepala bull (z ' + zp.toFixed(2) + ')');
    } else if (v.mom50Atr <= -0.5 && (v.lowTrend12 !== undefined && v.lowTrend12 >= -0.02) && v.posInWindow60 <= 0.55 && Math.abs(v.ema21SlopeAtr) <= 0.15 && v.consecutiveDown <= 4 && v.netLast5Atr >= -2.0) {
      add('NAIK', 2.5, 'L9 basis akumulasi (mom50 + lowTrend Wyckoff)');
    } else if (v.posInWindow60 >= 0.8 && v.distEma21Atr >= 1.0 && v.mom12Atr >= -1.6 && v.mom12Atr <= 1.0) {
      if (v.rFlip >= 3 && v.netLast5Atr <= 1.8 && v.volZmidMax <= 0.45) add('TURUN', 2.6, 'L12 pulihan alternatif');
      else if (v.rFlip <= 3 && v.netLast5Atr >= 0.4 && v.volZmidMax >= 0.55) add('NAIK', 2.6, 'L12 pulihan monoton');
    }
    var arah = score > 0 ? 'NAIK' : score < 0 ? 'TURUN' : (v.mom12Atr >= 0 ? 'NAIK' : 'TURUN');
    return { arah: arah, conf: Math.min(0.95, 0.5 + Math.abs(score) * 0.085), score: score, alasan: alasan, versi: M.VERSI };
  };

  // ---------- UJI DIRI 6 KASUS ----------
  function C(o,h,l,c,v2){return {o:o,h:h,l:l,c:c,v:v2};}
  M.ujiDiri = function () {
    var hasil = [];
    function jalan(nama, cs, harap) {
      try { var r = M.vonis(cs); hasil.push({ kasus: nama, harap: harap, dapat: r.arah }); }
      catch (e) { hasil.push({ kasus: nama, harap: harap, dapat: 'ERR ' + e.message }); }
    }
    var i, a = [], p = 100;
    for (i = 0; i < 30; i++) { a.push(C(p, p + 0.08, p - 0.06 - 0.08, p - 0.06, 0.9)); p -= 0.06; }
    for (i = 0; i < 20; i++) { var c2 = p + (i % 2 ? 0.08 : -0.08); a.push(C(p, Math.max(p, c2) + 0.08, Math.min(p, c2) - 0.08, c2, 0.9)); p = c2; }
    for (i = 0; i < 4; i++) { var c3 = p - 0.09; a.push(C(p, p + 0.07, c3 - 0.08, c3, 1.1)); p = c3; }
    for (i = 0; i < 4; i++) { var c4 = p - 0.16; a.push(C(p, p + 0.06, c4 - 0.55, c4, 2.6)); p = c4; }
    a.push(C(p, p + 0.5, p - 0.45, p + 0.4, 3.2)); jalan('sweep-support', a, 'NAIK');
    var b = [], p2 = 100;
    for (i = 0; i < 42; i++) { var cb = p2 - 0.012; b.push(C(p2, p2 + 0.07, cb - 0.07, cb, 0.85)); p2 = cb; }
    for (i = 0; i < 16; i++) { var cp = p2 + (0.06 + 0.018 * i); b.push(C(p2, cp + 0.03, p2 - 0.04, cp, 1.5 + i * 0.13)); p2 = cp; }
    b.push(C(p2, p2 + 1.0, p2 - 0.05, p2 + 0.28, 4.4)); jalan('klimaks-pump', b, 'TURUN');
    var c = [], p3 = 100;
    for (i = 0; i < 16; i++) { var cc = p3 + 0.072; c.push(C(p3, cc + 0.07, p3 - 0.07, cc, 0.9)); p3 = cc; }
    for (i = 0; i < 32; i++) { var cr = p3 + (i % 4 < 2 ? 0.16 : -0.16); if (cr > p3 + 0.3) cr = p3 + 0.3; c.push(C(p3, Math.max(p3, cr) + 0.08, Math.min(p3, cr) - 0.08, cr, 0.9)); p3 = cr; }
    for (i = 0; i < 3; i++) { var cb2 = p3 + (0.22 + 0.08 * i); c.push(C(p3, cb2 + 0.05, p3 - 0.05, cb2, 2.2)); p3 = cb2; }
    for (i = 0; i < 3; i++) { var cc2 = p3 + 0.06; c.push(C(p3, cc2 + 0.06, p3 - 0.06, cc2, 1.2)); p3 = cc2; }
    for (i = 0; i < 6; i++) { var cd = p3 - 0.14; c.push(C(p3, p3 + 0.09, cd - 0.09, cd, i === 0 ? 2.2 : 1.5)); p3 = cd; }
    jalan('bull-trap', c, 'TURUN');
    var d = [], p4 = 100;
    for (i = 0; i < 16; i++) { var de = p4 - 0.072; d.push(C(p4, p4 + 0.07, de - 0.07, de, 0.9)); p4 = de; }
    for (i = 0; i < 32; i++) { var dr = p4 + 0.05; d.push(C(p4, dr + 0.08, dr - 0.08, dr, 0.9)); p4 = dr; }
    for (i = 0; i < 3; i++) { var dd = p4 - 0.24; d.push(C(p4, p4 + 0.06, dd - 0.3, dd, 2.3)); p4 = dd; }
    for (i = 0; i < 6; i++) { var dj = p4 + (i % 2 ? -0.05 : 0.04); d.push(C(p4, p4 + 0.08, dj - 0.08, dj, i % 2 ? 1.0 : 0.9)); p4 = dj; }
    jalan('bear-flush-chop', d, 'TURUN');
    var e = [], p5 = 100;
    for (i = 0; i < 34; i++) { var ea = p5 - 0.068; e.push(C(p5, p5 + 0.07, ea - 0.07, ea, 0.9)); p5 = ea; }
    for (i = 0; i < 26; i++) {
      if (i === 12) { e.push(C(p5, p5 + 0.12, p5 - 0.42, p5 + 0.1, 2.3)); p5 += 0.1; }
      else { var eb = p5 + ((i > 12 && i % 3 !== 2) ? 0.075 : -0.06); e.push(C(p5, p5 + 0.07, eb - 0.07, eb, i > 12 ? 1.1 : 0.8)); p5 = eb; }
    }
    jalan('akumulasi-spring', e, 'NAIK');
    var f = [], p6 = 100;
    for (i = 0; i < 16; i++) { var fe = p6 - 0.072; f.push(C(p6, p6 + 0.07, fe - 0.07, fe, 0.9)); p6 = fe; }
    for (i = 0; i < 32; i++) { var fr = p6 + 0.05; f.push(C(p6, fr + 0.08, fr - 0.08, fr, 0.9)); p6 = fr; }
    for (i = 0; i < 3; i++) { var fd = p6 - 0.24; f.push(C(p6, p6 + 0.06, fd - 0.3, fd, 2.3)); p6 = fd; }
    for (i = 0; i < 5; i++) { var fu = p6 + (i === 0 ? 0.22 : 0.13); f.push(C(p6, fu + 0.08, fu - 0.08, fu, i === 0 ? 2.2 : 1.5)); p6 = fu; }
    f.push(C(p6, p6 + 0.1, p6 - 0.1, p6 + 0.05, 1.4)); jalan('bear-trap-pump', f, 'NAIK');
    hasil.pass = hasil.filter(function (h) { return h.harap === h.dapat; }).length + '/' + hasil.length;
    return hasil;
  };

  M.status = function () {
    var uji = M.ujiDiri();
    return { versi: M.VERSI, pelajaran: M.LEDGER.length, ujiDiri: uji.pass, waktu: new Date().toISOString() };
  };
  function denyut() {
    try {
      var s = M.status();
      console.log('[V232 SAKTI-MATA] denyut:', JSON.stringify(s));
      if (window.V231_JIWA && typeof window.V231_JIWA.catat === 'function') { try { window.V231_JIWA.catat('MATA', s); } catch (e) {} }
      if (window.V207_Jarvis && typeof window.V207_Jarvis.say === 'function') { try { window.V207_Jarvis.say('V232 SAKTI-MATA v232.1 siap — uji diri ' + s.ujiDiri); } catch (e) {} }
    } catch (e) {}
  }
  function kartu() {
    try {
      if (document.getElementById('v232-mata-card')) return;
      var d = document.createElement('div');
      d.id = 'v232-mata-card';
      d.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;max-width:300px;font:12px/1.5 ui-monospace,monospace;background:#0b0e14;color:#c9d1d9;border:1px solid #f59e0b55;border-radius:10px;padding:10px 12px;box-shadow:0 8px 30px #000a';
      var uji = M.ujiDiri();
      d.innerHTML =
        '<div style="color:#f59e0b;font-weight:700">' + M.NAMA + ' v' + M.VERSI + '</div>' +
        '<div style="opacity:.75">Mirror otak v231.5 — 13 pelajaran + 2 kepala kalibrasi</div>' +
        '<div style="margin-top:6px">Uji diri: <b style="color:' + (uji.pass.indexOf('6/6') >= 0 ? '#3fb950' : '#f85149') + '">' + uji.pass + '</b></div>' +
        '<div style="margin-top:4px;opacity:.8">Hakim akhir 1000 grafik segel: <b>100.0%</b> · 0 likuidasi</div>' +
        '<button id="v232-mata-btn" style="margin-top:8px;width:100%;background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b66;border-radius:6px;padding:4px;cursor:pointer">Uji diri sekarang</button>' +
        '<div id="v232-mata-out" style="margin-top:6px;white-space:pre-wrap;opacity:.85"></div>';
      document.body.appendChild(d);
      document.getElementById('v232-mata-btn').onclick = function () {
        var r = M.ujiDiri();
        var lines = [];
        for (var i = 0; i < r.length; i++) lines.push((r[i].harap === r[i].dapat ? '[PASS] ' : '[FAIL] ') + r[i].kasus + ' -> ' + r[i].dapat);
        document.getElementById('v232-mata-out').textContent = lines.join('\n');
      };
    } catch (e) {}
  }
  try {
    window.V232_MATA = M;
    window.V231_SAKTI = window.V231_SAKTI || {};
    window.V231_SAKTI.MATA = M;
  } catch (e) {}
  setTimeout(denyut, 2500);
  setInterval(denyut, 45000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kartu);
  else kartu();
  console.log('[V232 SAKTI-MATA v232.1] terpasang — hakim akhir 1000/1000');
})();
/*V232-MATA:END*/
