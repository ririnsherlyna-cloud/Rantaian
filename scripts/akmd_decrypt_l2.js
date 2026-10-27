// DECRYPT LAPIS-2: __AKD2 (payload game asli) — kunci dari shell __AKDP
"use strict";
const fs = require("fs");
const crypto = require("crypto");

function U(b64) { return new Uint8Array(Buffer.from(b64, "base64")); }
function sha256hex(buf) { return crypto.createHash("sha256").update(Buffer.from(buf)).digest("hex"); }
function avgDecrypt() {
  const avg = fs.readFileSync("/home/z/my-project/akiomida/io-repo/assets/js/avg.js", "utf8");
  const AVGTOK = avg.match(/window\.__AKAVG="([A-Za-z0-9+/=]+)";?/)[1];
  const key = crypto.createHash("sha256").update("akiomida.com").digest();
  const D = U(AVGTOK);
  const o = new Uint8Array(D.length);
  for (let j = 0; j * 32 < D.length; j++) {
    const b = Buffer.alloc(36); key.copy(b, 0);
    b[32] = j & 255; b[33] = (j >>> 8) & 255; b[34] = (j >>> 16) & 255; b[35] = (j >>> 24) & 255;
    const h = crypto.createHash("sha256").update(b).digest();
    for (let q = 0; q < 32 && j * 32 + q < D.length; q++) o[j * 32 + q] = D[j * 32 + q] ^ h[q];
  }
  return JSON.parse(Buffer.from(o).toString("utf8"));
}

const A2 = "ZQaCmJvlKhJLXbpJbh+Hkg==";
const BX = "SFuD9wYrnR6AmkbMDQZFuQ==";
const H2 = "4d831faf06f1e575828247c2aac03c051fa838c708521e8e2585ff8e982b674e";
const PR = "1,1,1,1,1,1";

const jj = avgDecrypt();
console.log("avg s.len:", jj.s.length, "e:", jj.e);

const media = fs.readFileSync("/home/z/my-project/akiomida/io-repo/media.js", "utf8");
const AKD2 = media.match(/window\.__AKD2="([A-Za-z0-9+/=]+)";/)[1];
const D = U(AKD2);
console.log("AKD2 bytes:", D.length);

const hx = sha256hex(Buffer.from(A2 + "|" + PR + "|" + BX + "|" + jj.s + "|" + String(jj.e), "utf8"));
const K2 = Buffer.from(hx, "hex");
console.log("K2:", hx.slice(0, 16) + "…");

const o = Buffer.alloc(D.length);
for (let j = 0; j * 32 < D.length; j++) {
  const b = Buffer.alloc(36); K2.copy(b, 0);
  b[32] = j & 255; b[33] = (j >>> 8) & 255; b[34] = (j >>> 16) & 255; b[35] = (j >>> 24) & 255;
  const h = crypto.createHash("sha256").update(b).digest();
  const lim = Math.min(32, D.length - j * 32);
  for (let q = 0; q < lim; q++) o[j * 32 + q] = D[j * 32 + q] ^ h[q];
}
const ptHex = sha256hex(o);
console.log("hash:", ptHex === H2 ? "MATCH — sah" : "MISMATCH: " + ptHex);
if (ptHex !== H2) process.exit(1);
const tx = o.toString("utf8");
fs.writeFileSync("/home/z/my-project/akiomida/game_v30_plaintext.html", tx);
console.log("GAME HTML tersimpan | size:", tx.length);
