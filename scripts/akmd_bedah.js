// BEDAH patch.js → file analisis per sistem
"use strict";
const fs = require("fs");
const PATCH = fs.readFileSync("/home/z/my-project/akiomida/io-repo/patch.js", "utf8");
const OUT = "/home/z/my-project/akiomida/bedah/";
fs.mkdirSync(OUT, { recursive: true });

// segmen kasar berdasarkan peta posisi
const segs = [
  ["01_aturan_inti", 0, 24400],           // aturan {n,f,r} + intercept + AKPX_RULES ada di index.html... (ini patch rules)
  ["02_akt_asimtota", 12329, 16200],      // __AKT tier system
  ["03_akmx_metrik", 16225, 22100],       // __AKMX eat/score
  ["04_ikon_saka", 22100, 24000],         // __AK25I ikon
  ["05_intercept_rules", 23984, 33500],   // document.write intercept + fix13
  ["06_streak", 42700, 44500],            // Streak Forge
  ["07_micda_core", 44900, 54500],        // __AKMDC micda
  ["08_pasar_harga", 54500, 62500],       // GOODS, series, priceAt, priceLive, berita
  ["09_market_ui", 62500, 76100],         // beli/jual offers etalase
  ["10_ventura_karavan", 75014, 79900],   // Ventura
  ["11_kontrak_saka", 79900, 86000],      // kontrak + saka ui
  ["12_ramalan", 141600, 151185],         // ramalan? akhir file
];
for (const [nm, a, b] of segs) {
  fs.writeFileSync(OUT + nm + ".js", PATCH.slice(a, Math.min(b, PATCH.length)));
  console.log(nm, (b - a) + "B");
}
console.log("selesai");
