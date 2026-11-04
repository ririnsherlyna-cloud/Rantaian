// DECRYPT AKIOMIDA media.js — replika alur boot index.html (domain + avg + WASM + self-hash)
// Output: plaintext game HTML v30 untuk analisis & penyusunan aturan patch v31
"use strict";
const fs = require("fs");
const crypto = require("crypto");

const REPO = "/home/z/my-project/akiomida/io-repo/";
const OUT = "/home/z/my-project/akiomida/";

// ---------- helpers (identik dengan loader) ----------
function B2(s) { const n = s.length, b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = s.charCodeAt(i) & 255; return b; }
function U(b64) { return new Uint8Array(Buffer.from(b64, "base64")); }
function sha256hex(buf) { return crypto.createHash("sha256").update(Buffer.from(buf)).digest("hex"); }
function sha256bytes(buf) { return crypto.createHash("sha256").update(Buffer.from(buf)).digest(); }

// XDEC — block-XOR dengan SHA256(key || j32), key = SHA256(bytes(dm))
function XDEC(b64, dm) {
  const key = sha256bytes(B2(dm));
  const D = U(b64);
  const o = new Uint8Array(D.length);
  const jmax = Math.ceil(D.length / 32);
  for (let j = 0; j < jmax; j++) {
    const b = new Uint8Array(36); b.set(key, 0);
    b[32] = j & 255; b[33] = (j >>> 8) & 255; b[34] = (j >>> 16) & 255; b[35] = (j >>> 24) & 255;
    const h = sha256bytes(b);
    const lim = Math.min(32, D.length - j * 32);
    for (let q = 0; q < lim; q++) o[j * 32 + q] = D[j * 32 + q] ^ h[q];
  }
  return o;
}

// ---------- muat berkas ----------
const media = fs.readFileSync(REPO + "media.js", "utf8");
function extractVar(src, name) {
  const re = new RegExp('window\\.' + name + '="([A-Za-z0-9+/=]+)";');
  const m = src.match(re);
  if (!m) throw new Error(name + " tidak ditemukan");
  return m[1];
}
const AKDP = extractVar(media, "__AKDP");
console.log("AKDP len:", AKDP.length);
const AKD2 = extractVar(media, "__AKD2");
console.log("AKD2 len:", AKD2.length);

const avg = fs.readFileSync(REPO + "assets/js/avg.js", "utf8");
const AVGTOK = (avg.match(/window\.__AKAVG="([A-Za-z0-9+/=]+)";?/) || [])[1];
if (!AVGTOK) throw new Error("avg token tidak ditemukan");
console.log("AVGTOK len:", AVGTOK.length);

// ---------- ekstrak SRC (textContent script #3 di index.html) ----------
const idx = fs.readFileSync(REPO + "index.html", "utf8");
const s0 = idx.lastIndexOf("<script>(function(){\nvar Z=atob;");
if (s0 < 0) throw new Error("script boot tidak ditemukan");
const contentStart = s0 + "<script>".length;
const contentEnd = idx.indexOf("</script>", contentStart);
const SRC = idx.slice(contentStart, contentEnd);
console.log("SRC len:", SRC.length, "mulai:", JSON.stringify(SRC.slice(0, 40)), "akhir:", JSON.stringify(SRC.slice(-40)));

// ---------- AVGDEC ----------
const DM = "akiomida.com";
const avgRaw = XDEC(AVGTOK, DM);
console.log("avg raw len:", avgRaw.length);
const avgJSON = JSON.parse(Buffer.from(avgRaw).toString("utf8"));
console.log("avg JSON keys:", Object.keys(avgJSON), "| kb.len:", avgJSON.kb.length, "| s.len:", (avgJSON.s || "").length, "| e:", avgJSON.e);

// ---------- KF: k[i] = AA0[i] ^ kbB[i] ^ sha256(dm)[i] ^ sha256(SRC)[i] ----------
const AA0 = U("HQJqW0MJu+KFzfVsq+EXS77eMKAPh73pm5Si03NRB34=");
const dHash = sha256hex(B2(DM));
const sHash = sha256hex(B2(SRC));
const kbB = U(avgJSON.kb);
if (kbB.length !== 32) throw new Error("kb bukan 32 byte: " + kbB.length);
const k = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  k[i] = AA0[i] ^ kbB[i] ^ parseInt(dHash.substr(i * 2, 2), 16) ^ parseInt(sHash.substr(i * 2, 2), 16);
}

// ---------- PDV dev-gate (verifikasi kode dev milik pemilik) ----------
const DVB = "h4hlIAl6ipyakRpnmGTmt1OQdWXmCZaIATyW";
const DS = "d11f3292a738a9d5c6461fd5c772e979";
function PDV(pw) {
  try { return Buffer.from(XDEC(DVB, DS + "|dv5|" + String(pw))).toString("utf8"); } catch (e) { return null; }
}
const DEVKEY = "CKZhwbrsRLjms6Da5h";
const pdv = PDV(DEVKEY);
console.log("PDV(dev key):", JSON.stringify(pdv));

// ---------- WASM decrypt ----------
const WASM_B64 = "AGFzbQEAAAABDgJgBH9/f38AYAJ/fwF/AwMCAAEFBAEBMDAHDQMBbQIAAWQAAAFoAAEK4QICogIBBX8/AEEQdEGAEGshBEEAIQUCQANAIAVBgAJPDQEgBCAFaiAFOgAAIAVBAWohBQwACwtBACEFQQAhBgJAA0AgBUGAAk8NASAGIAQgBWotAABqIAIgBSADcGotAABqQf8BcSEGIAQgBWotAAAhByAEIAVqIAQgBmotAAA6AAAgBCAGaiAHOgAAIAVBAWohBQwACwtBACEFQQAhBkEAIQgCQANAIAggAU8NASAFQQFqQf8BcSEFIAYgBCAFai0AAGpB/wFxIQYgBCAFai0AACEHIAQgBWogBCAGai0AADoAACAEIAZqIAc6AAAgACAIaiAAIAhqLQAAIAQgBCAFai0AACAEIAZqLQAAakH/AXFqLQAAczoAACAIQQFqIQgMAAsLCzsBAn9BxbvyiHghA0EAIQICQANAIAIgAU8NASADIAAgAmotAABzQZODgAhsIQMgAkEBaiECDAALCyADCw==";
const D = U(AKDP);

(async () => {
  const { instance } = await WebAssembly.instantiate(U(WASM_B64));
  const x = instance.exports;
  const y = x.m.buffer;
  const m = new Uint8Array(y);
  const o = y.byteLength - 512;
  console.log("mem bytes:", y.byteLength, "| D bytes:", D.length, "| key offset:", o);
  if (D.length + 512 > y.byteLength) throw new Error("memori terlalu kecil");
  m.set(D, 0);
  m.set(k, o);
  x.d(0, D.length, o, k.length);
  const hv = x.h(0, D.length);
  const OK = hv === (-650568971 | 0);
  console.log("hash:", hv, "| harapan:", -650568971, "|", OK ? "MATCH — dekripsi sah" : "MISMATCH");
  if (!OK) throw new Error("hash plaintext tidak cocok — kunci/salahan");
  const t = Buffer.from(y, 0, D.length).toString("utf8");
  fs.writeFileSync(OUT + "akdp_decoded.bin", t);
  console.log("__AKDP decoded (10KB shell):", t.slice(0, 400));
  // sanity: cek beberapa penanda
  console.log("sanity doctype:", t.slice(0, 60));
})().catch(e => { console.error("GAGAL:", e.message); process.exit(1); });
