// Dokumentasi v31: README.md + about.html
"use strict";
const fs = require("fs");
const REPO = "/home/z/my-project/akiomida/io-repo/";

// ---------- README.md ----------
let RM = fs.readFileSync(REPO + "README.md", "utf8");
const V31 = `## v31 DENYUT JAM (pembaruan mandiri dev — prerogatif pemilik)
- **Jejak 24 Jam pada grafik harga (spark)**: grafik mini di baris pasar kini punya DUA denyut — **ketuk grafiknya** untuk beralih **14 hari ↔ 24 jam**. Jejak 24 jam menggambar harga hidup per jam (sistem v30) memakai biji & rumus yang sama persis, sehingga **titik terakhirnya = harga yang tampil sekarang** — ritme per jam yang selama ini tak terlihat kini bisa dipelajari pemain. Tanpa label nasihat, tanpa ramalan: masa depan tetap tersembunyi, yang ditampilkan hanya sejarah.
- **Jam server hidup di pasar & kontrak**: baris catatan "🕒 harga bergerak tiap jam" dan pengantar Kontrak kini menampilkan **jam server berdetak** (HH:MM UTC, segarkan 20 detik, isi otomatis saat panel dirender via MutationObserver) — ikatan pasar ke waktu server (anti-manipulasi jam, v30) kini terlihat langsung di layar.
- **Aksesibilitas**: spark kini tombol sungguhan (role=button, tabindex, Enter/Spasi, aria-label dua bahasa ID/EN, fokus terlihat) — sebelumnya SVG gelap tak bisa dijangkau keyboard.
- Uji: node --check OK; 28/28 aturan patch v30 tetap PASS terhadap plaintext (n-count exact); E2E browser (boot dev-key → Trade Hub → toggle spark 14↔24 → jam server terisi → 0 pageerror); cache-bust patch.js?v=31 + SWV akmd-sw-v31; gerbang.json (SHA-384 patch/about/index) diperbarui.

`;
const MARK1 = "## v30 PEMBENAHAN OWNER";
const i1 = RM.indexOf(MARK1);
if (i1 < 0) { console.error("README marker v30 tidak ditemukan"); process.exit(1); }
RM = RM.slice(0, i1) + V31 + RM.slice(i1);
fs.writeFileSync(REPO + "README.md", RM);
console.log("README.md: seksi v31 ditambahkan @" + i1);

// ---------- about.html ----------
let AB = fs.readFileSync(REPO + "about.html", "utf8");
const ANCH = "ekonomi tetap terkendali tanpa inflasi.</p>";
const ia = AB.indexOf(ANCH);
if (ia < 0) { console.error("about.html anchor tidak ditemukan"); process.exit(1); }
const ADD = "<p><b>Pasar makin terbaca — Denyut Jam:</b> grafik mini harga di baris pasar kini punya dua denyut: <b>ketuk grafiknya</b> untuk beralih antara jejak <b>14 hari</b> dan jejak <b>24 jam</b> yang menggambar pergerakan harga per jam — titik terakhirnya persis harga yang tampil sekarang, sehingga ritme jam yang menggerakkan pasar terasa nyata di mata. Di sampingnya, <b>jam server</b> berdetak langsung di catatan pasar dan kontrak (HH:MM UTC) — pemain bisa menghubungkan pergantian jam dengan pergerakan harga tanpa perlu menandai mana pun: yang terlihat hanya sejarah, keputusan tetap milikmu.</p>";
AB = AB.slice(0, ia + ANCH.length) + ADD + AB.slice(ia + ANCH.length);
fs.writeFileSync(REPO + "about.html", AB);
console.log("about.html: paragraf Denyut Jam ditambahkan di seksi 6c");
