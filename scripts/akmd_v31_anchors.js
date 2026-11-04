// Verifikasi anchor edit v31 + struktur about.html
"use strict";
const fs = require("fs");
const PATCH = fs.readFileSync("/home/z/my-project/akiomida/io-repo/patch.js", "utf8");
const AB = fs.readFileSync("/home/z/my-project/akiomida/io-repo/about.html", "utf8");

function cnt(s) { return PATCH.split(s).length - 1; }

const A_SPARK = 'function spark(gi,D){var s=series(gi,D)';
const A_NOTE = 'h+=\'<div class="ak-mx-note">\uD83D\uDD52 \'+L().upd+"</div>";return h}';
const A_KON = 'ak-mx-intro">\uD83D\uDCDC \'+L().kon1+"</div>';

console.log("spark cnt:", cnt(A_SPARK));
console.log("note cnt:", cnt(A_NOTE));
console.log("konintro cnt:", cnt(A_KON));
console.log("v31 marker already:", cnt("ak-v31-style"));

console.log("about len:", AB.length);
const secs = [...AB.matchAll(/<h2[^>]*>([\s\S]{0,90}?)<\/h2>/g)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).slice(0, 24);
console.log("about h2s:", JSON.stringify(secs, null, 0).slice(0, 900));
// versi disebut?
const vm = [...AB.matchAll(/v(2[0-9]|3[0-9])\b/g)].map(m => "v" + m[1]);
console.log("about version mentions:", [...new Set(vm)].join(","));
