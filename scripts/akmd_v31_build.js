// BUILD V31 "DENYUT JAM" — patch.js (spark 24-jam + jam server) + cache-bust + manifest
"use strict";
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const REPO = "/home/z/my-project/akiomida/io-repo/";
function rd(f) { return fs.readFileSync(REPO + f, "utf8"); }
function wr(f, s) { fs.writeFileSync(REPO + f, s); }
function cnt(s, sub) { return s.split(sub).length - 1; }

// ============ 1. patch.js ============
let P = rd("patch.js");
const ORIG_LEN = P.length;

const A_SPARK = 'function spark(gi,D){var s=series(gi,D),x=s.x.slice(Math.max(0,D-13),D+1);var mn=1e9,mx=-1e9,i;for(i=0;i<x.length;i++){if(x[i]<mn)mn=x[i];if(x[i]>mx)mx=x[i]}var w=64,h=24,pad=2,out="";for(i=0;i<x.length;i++){var px=x.length>1?pad+(w-2*pad)*i/(x.length-1):w/2;var py=x[i]===mx?pad:pad+(h-2*pad)*(1-(x[i]-mn)/Math.max(1,mx-mn));out+=(i?"L":"M")+px.toFixed(1)+" "+py.toFixed(1)}var col=x[x.length-1]>=x[0]?"#34d399":"#f87171";return\'<svg class="ak-mx-spark" viewBox="0 0 \'+w+" "+h+\'" aria-hidden="true"><path d="\'+out+\'" fill="none" stroke="\'+col+\'" stroke-width="1.6" stroke-linecap="round"/></svg>\'}';

const N_SPARK = 'function priceHour(gi,H){var g=GOODS[gi],p0=priceAt(gi,dayNow()),r1=mulberry32(xmur3("akmd-hd1|"+gi+"|"+H)())(),r2=mulberry32(xmur3("akmd-hd2|"+H+"|"+gi)())(),amp=.035+.045*(r2/4294967296),w=((r1/4294967296)-.5)*2*amp,v=Math.round(p0*(1+w));return Math.max(g.min*100,Math.min(g.max*100,v))}function sparkPath(x,w,h,pad){var mn=1e9,mx=-1e9,i;for(i=0;i<x.length;i++){if(x[i]<mn)mn=x[i];if(x[i]>mx)mx=x[i]}var out="";for(i=0;i<x.length;i++){var px=x.length>1?pad+(w-2*pad)*i/(x.length-1):w/2;var py=x[i]===mx?pad:pad+(h-2*pad)*(1-(x[i]-mn)/Math.max(1,mx-mn));out+=(i?"L":"M")+px.toFixed(1)+" "+py.toFixed(1)}return out}function spark(gi,D){var id=L()===T.id,w=64,h=24,pad=2,i,path,col,lab;if(window.__AKSPK24){var Hn=Math.floor((window.__AKNOW?window.__AKNOW():Date.now())/36e5),xh=[];for(i=23;i>=0;i--)xh.push(priceHour(gi,Hn-i));path=sparkPath(xh,w,h,pad);col=xh[23]>=xh[0]?"#fbbf24":"#f87171";lab=id?"24 jam":"24h"}else{var s=series(gi,D),x=s.x.slice(Math.max(0,D-13),D+1);path=sparkPath(x,w,h,pad);col=x[x.length-1]>=x[0]?"#34d399":"#f87171";lab=id?"14 hari":"14d"}return\'<span class="ak-mx-spkw" role="button" tabindex="0" data-spk="1" aria-label="\'+(id?"Jejak harga "+lab+" — ketuk untuk berganti":"Price trail "+lab+" — tap to switch")+\'"><svg class="ak-mx-spark" viewBox="0 0 \'+w+" "+h+\'" aria-hidden="true"><path d="\'+path+\'" fill="none" stroke="\'+col+\'" stroke-width="1.6" stroke-linecap="round"/></svg><i>\'+lab+"</i></span>"}';

const A_NOTE = 'h+=\'<div class="ak-mx-note">\u{1F552} \'+L().upd+"</div>";return h}';
const N_NOTE = 'h+=\'<div class="ak-mx-note">\u{1F552} \'+L().upd+\' \u00B7 <span class="ak-mx-clk" title="server"></span></div>\';return h}';

const A_KON = 'ak-mx-intro">\u{1F4DC} \'+L().kon1+"</div>";';
const N_KON = 'ak-mx-intro">\u{1F4DC} \'+L().kon1+\' \u00B7 <span class="ak-mx-clk" title="server"></span></div>\';';

const IIFE = '\n;(function(){"use strict";\nvar CSS=".ak-mx-spkw{display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;flex:0 0 auto;padding:2px 3px;border-radius:6px}.ak-mx-spkw:focus-visible{outline:1.5px solid rgba(251,191,36,.75);outline-offset:1px}.ak-mx-spkw i{font:700 8.5px/1 system-ui,sans-serif;font-style:normal;letter-spacing:.05em;color:#8fa3b8;opacity:.92;white-space:nowrap}.ak-mx-spkw:hover i,.ak-mx-spkw:focus i{color:#fbbf24}.ak-mx-clk{color:#fbbf24;font-weight:700;letter-spacing:.04em;font-variant-numeric:tabular-nums}";\nvar OBS=null;\nfunction inject(){try{if(!document.getElementById("ak-v31-style")){var st=document.createElement("style");st.id="ak-v31-style";st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}}catch(e){}}\nfunction nowMs(){try{return window.__AKNOW?window.__AKNOW():Date.now()}catch(e){return Date.now()}}\nfunction two(n){return(n<10?"0":"")+n}\nfunction clk(){var t="",d;try{d=new Date(nowMs());t=two(d.getUTCHours())+":"+two(d.getUTCMinutes())}catch(e){return}var els=document.querySelectorAll(".ak-mx-clk"),i;for(i=0;i<els.length;i++)if(els[i].textContent!==t)els[i].textContent=t}\nfunction tog(){try{window.__AKSPK24=window.__AKSPK24?0:1}catch(e){}try{var on=document.querySelector("[data-tb].on");if(on)on.click()}catch(e2){}try{clk()}catch(e3){}}\nfunction onClk(ev){var e=ev.target;while(e&&e!==document){if(e.getAttribute&&e.getAttribute("data-spk")){ev.preventDefault();tog();return}e=e.parentNode}}\nfunction onKey(ev){if(ev.key!=="Enter"&&ev.key!==" ")return;var e=ev.target;if(e&&e.getAttribute&&e.getAttribute("data-spk")){ev.preventDefault();tog()}}\nfunction listen(){try{document.addEventListener("click",onClk,false);document.addEventListener("keydown",onKey,false)}catch(e){}}\nfunction obs(){try{var pan=document.getElementById("ak-mx-pan");if(pan&&typeof MutationObserver==="function"&&pan!==OBS){new MutationObserver(function(){try{clk()}catch(eM){}}).observe(pan,{childList:true,subtree:true});OBS=pan}}catch(e4){}}\nfunction boot(){try{inject();listen();obs();clk()}catch(e){}}\ntry{document.addEventListener("DOMContentLoaded",boot)}catch(e0){}\ntry{setInterval(boot,1200)}catch(e1){}\nboot();\n}());\n';

const checks = [[A_SPARK, 1], [A_NOTE, 1], [A_KON, 1]];
for (const [a, n] of checks) {
  const c = cnt(P, a);
  if (c !== n) { console.error("ANCHOR GAGAL (count=" + c + "):", a.slice(0, 70)); process.exit(1); }
}
P = P.replace(A_SPARK, N_SPARK).replace(A_NOTE, N_NOTE).replace(A_KON, N_KON);
if (cnt(P, "ak-v31-style") !== 0) { console.error("IIFE v31 sudah ada?"); process.exit(1); }
P = P + IIFE;
wr("patch.js", P);
console.log("patch.js:", ORIG_LEN, "→", P.length, "(+" + (P.length - ORIG_LEN) + "B)");

// ============ 2. index.html ============
let IX = rd("index.html");
if (cnt(IX, 'patch.js?v=30') !== 1) { console.error("index.html anchor v30 salah: " + cnt(IX, 'patch.js?v=30')); process.exit(1); }
IX = IX.replace('patch.js?v=30', 'patch.js?v=31');
wr("index.html", IX);
console.log("index.html → patch.js?v=31 (SRC script #3 aman: edit di luar blok)");

// ============ 3. sw.js ============
let SW = rd("sw.js");
SW = SW.replace('akmd-sw-v30', 'akmd-sw-v31').replace('"patch.js?v=30"', '"patch.js?v=31"');
wr("sw.js", SW);
console.log("sw.js → akmd-sw-v31 + core v31");

// ============ 4. verifikasi sintaks patch.js ============
try { execSync("node --check " + REPO + "patch.js", { stdio: "pipe" }); console.log("node --check patch.js: OK"); }
catch (e) { console.error("SYNTAX ERROR:", e.stderr.toString().slice(0, 600)); process.exit(1); }

// ============ 5. verifikasi aturan lama tetap match plaintext ============
const PATCH2 = rd("patch.js");
const MARK = '];"function"==typeof(e=document.write)';
const mi = PATCH2.indexOf(MARK);
let depth = 0, start = -1;
for (let i = mi; i >= 0; i--) { const c = PATCH2[i]; if (c === "]") depth++; else if (c === "[") { depth--; if (depth === 0) { start = i; break; } } }
const rules = (new Function("return " + PATCH2.slice(start, mi + 1)))();
const PLAIN = fs.readFileSync("/home/z/my-project/akiomida/game_v30_plaintext.html", "utf8");
let pass = 0, fail = 0;
for (const r of rules) { if (PLAIN.split(r.f).length - 1 === r.n) pass++; else { fail++; console.error("RULE FAIL:", r.f.slice(0, 60)); } }
console.log("aturan patch vs plaintext:", pass + "/" + rules.length, fail === 0 ? "PASS" : "GAGAL");
if (fail > 0) process.exit(1);

// ============ 6. gerbang.json ============
const G = JSON.parse(rd("gerbang.json"));
for (const f of ["patch.js", "about.html", "index.html"]) {
  const buf = fs.readFileSync(REPO + f);
  G.files[f] = { sha384: crypto.createHash("sha384").update(buf).digest("hex"), len: buf.length };
}
G.gen = new Date().toISOString().replace(/\.\d+Z$/, "Z");
wr("gerbang.json", JSON.stringify(G, null, " ") + "\n");
console.log("gerbang.json → hash patch.js/about/index diperbarui");
console.log("BUILD V31 INTI SELESAI");
