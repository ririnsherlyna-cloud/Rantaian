// VERIFIKASI ATURAN PATCH v30 terhadap plaintext game + ekstrak struktur
"use strict";
const fs = require("fs");

const PLAIN = fs.readFileSync("/home/z/my-project/akiomida/game_v30_plaintext.html", "utf8");
const PATCH = fs.readFileSync("/home/z/my-project/akiomida/io-repo/patch.js", "utf8");

// --- temukan array aturan: berakhir tepat sebelum ]; "function"==typeof(e=document.write)
const MARK = '];"function"==typeof(e=document.write)';
const mi = PATCH.indexOf(MARK);
if (mi < 0) { console.error("marker tidak ditemukan"); process.exit(1); }
// telusuri mundur untuk menemukan '[' pembuka seimbang
let depth = 0, start = -1;
for (let i = mi; i >= 0; i--) {
  const c = PATCH[i];
  if (c === "]") depth++;
  else if (c === "[") { depth--; if (depth === 0) { start = i; break; } }
}
if (start < 0) { console.error("pembuka array tidak ditemukan"); process.exit(1); }
const arrSrc = PATCH.slice(start, mi + 1);
console.log("array aturan @", start, "..", mi, "| panjang:", arrSrc.length);
const rules = (new Function("return " + arrSrc))();
console.log("jumlah aturan:", rules.length);

// --- uji tiap aturan terhadap plaintext
let pass = 0, fail = [];
for (let i = 0; i < rules.length; i++) {
  const { n, f, r } = rules[i];
  const count = PLAIN.split(f).length - 1;
  if (count === n) pass++;
  else fail.push({ i, n, hit: count, f: f.slice(0, 80) });
}
console.log("PASS:", pass, "| FAIL:", fail.length);
if (fail.length) { console.log("aturan gagal:"); fail.forEach(x => console.log(x)); }

// simpan aturan untuk dipakai pembangun v31
fs.writeFileSync("/home/z/my-project/akiomida/rules_v30.json", JSON.stringify(rules, null, 1));
console.log("aturan tersimpan → rules_v30.json");

// --- petakan struktur game: fungsi & sistem kunci
const probes = [
  ["engine loop", "function Lo("], ["state", "aa.player"], ["trade hub", "showTrade"],
  ["harga", "priceAt"], ["harga hidup v30", "priceLive"], ["jam server", "__AKNOW"],
  ["karavan", "Ventura"], ["saka", "Saka"], ["kontrak", "Contracts"],
  ["etalase", "offers"], ["streak", "Streak"], ["micda", "Micda"],
  ["leaderboard", "leaderboard"], ["badge", "qz4_"], ["asimtota", "ASIMTOTA"],
  ["FPJ", "__FPJ5"], ["save", "localStorage"], ["i18n", "localeID"]
];
console.log("\n--- peta penanda di plaintext ---");
for (const [nm, p] of probes) console.log(nm.padEnd(20), (PLAIN.split(p).length - 1) + "×");
