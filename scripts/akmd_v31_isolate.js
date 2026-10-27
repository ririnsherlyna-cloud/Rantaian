// Isolasi sumber SyntaxError: uji tiap region edit secara terpisah
"use strict";
const fs = require("fs");
const P = fs.readFileSync("/home/z/my-project/akiomida/io-repo/patch.js", "utf8");

function tryWrap(name, pre, code) {
  try { new Function(pre + code); console.log(name + ": OK"); return true; }
  catch (e) { console.log(name + ": GAGAL — " + e.message); return false; }
}

// 1. IIFE v31 (di akhir file)
const iifeStart = P.lastIndexOf('(function(){"use strict"');
const iife = P.slice(iifeStart);
console.log("IIFE start @", iifeStart, "len:", iife.length);
tryWrap("IIFE", "", iife);

// 2. region spark
const k = P.indexOf("function priceHour");
const kEnd = P.indexOf("function fmtPhrase(p)");
const spark = P.slice(k, kEnd);
const PRE = 'var L=function(){return{id:1}},T={id:1},series=function(){return{x:[1,2]}},priceAt=function(){return 0},dayNow=function(){return 1},mulberry32=function(){return function(){return 0}},xmur3=function(){return function(){return 0}},window={__AKSPK24:1,__AKNOW:null};';
tryWrap("SPARK", PRE, spark);

// 3. note line
const ni = P.indexOf('ak-mx-clk');
console.log("NOTE ctx:", JSON.stringify(P.slice(ni - 120, ni + 80)));
