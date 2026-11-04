#!/bin/bash
# ============================================================
# MICAPROFITA — PENGEMAS SEMUA FILE TASK KE ZONA USER (download/)
# Tujuan: user MELIHAT semua file task secara nyata, bukan chat.
# ============================================================
set -e
BASE=/home/z/my-project
DEST=$BASE/download/MICAPROFITA-TASKFILES

# Bersihkan paket lama bila ada, buat struktur baru
rm -rf "$DEST"
mkdir -p "$DEST"/{01_ORGAN-V237-SAKTI-FBO,02_OTAK-UJIAN-FBO,03_RUNNER-UJIAN,04_PROBE-BEDAH,05_INJEKSI-SEMUA-ORGAN,06_OTAK-UJIAN-LAIN,07_BUKTI-UJIAN,08_LAPORAN,09_WORKLOG,10_AUDIT-REALTIME,11_PUMPDUMP-V238,12_KOMPLEKS-V239,13_ARAH-V240,14_MOZAIK-OTAK,15_NADI-PRAKIRA,16_FISIKA-UI,17_SARANG-GITHUB}

# ---------- 01 ORGAN V237 SAKTI-FBO (otak false breakout utk SAKTI) ----------
cp $BASE/scripts/v237_fbo.js            "$DEST/01_ORGAN-V237-SAKTI-FBO/"
cp $BASE/scripts/v237_fbo_test.js       "$DEST/01_ORGAN-V237-SAKTI-FBO/"
cp $BASE/scripts/inject_v237.py         "$DEST/01_ORGAN-V237-SAKTI-FBO/"

# ---------- 02 OTAK UJIAN FBO (dipakai pengembangan Arena, arah -> SAKTI) ----------
cp $BASE/src/lib/exam/fbo-brain.ts      "$DEST/02_OTAK-UJIAN-FBO/"
cp $BASE/src/lib/exam/fbo-forge.ts      "$DEST/02_OTAK-UJIAN-FBO/"
cp $BASE/src/lib/exam/fbo-gens.ts       "$DEST/02_OTAK-UJIAN-FBO/"
cp $BASE/src/lib/exam/fbo-suite.ts      "$DEST/02_OTAK-UJIAN-FBO/"

# ---------- 03 RUNNER UJIAN ----------
cp $BASE/scripts/ujian_fbo100.ts        "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/batch_r43.ts           "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/verify121.ts           "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/verify23.ts            "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/verify_r3.ts           "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/verify_v6.ts           "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/probe_all_r43.sh       "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/probe_v3_r43.sh        "$DEST/03_RUNNER-UJIAN/"
cp $BASE/scripts/probe_kombi_r43.sh     "$DEST/03_RUNNER-UJIAN/"

# ---------- 04 PROBE & BEDAH (forensik kegagalan) ----------
cp $BASE/scripts/probe_r4*.ts           "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/probe_t1_guards.ts     "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/probe_fbo*.ts          "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/probe_drift_vs_accept.ts "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/bedah_fbo_r*.ts        "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/bedah_r42_gagal.ts     "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/bedah_cg_v1.ts         "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/bedah_kasus.ts         "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/diff_r43.ts            "$DEST/04_PROBE-BEDAH/"
cp $BASE/scripts/kalib_r41b.ts          "$DEST/04_PROBE-BEDAH/"
cp $BASE/scripts/peta_fbr.ts            "$DEST/04_PROBE-BEDAH/"
cp $BASE/scripts/inst_fbo_r40*.ts       "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/search_fbo_r40*.ts     "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/trace_event.ts         "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/trace_r2_g114.ts       "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true
cp $BASE/scripts/uji_aturan_r40.ts      "$DEST/04_PROBE-BEDAH/" 2>/dev/null || true

# ---------- 05 INJEKSI SEMUA ORGAN (v231..v237) ----------
cp $BASE/scripts/inject_v23*.py         "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v232_mata.js           "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v233_bulltrap.js       "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v234_beartrap.js       "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v235_stophunt.js       "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v236_gabungan.js       "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v23*_test.js           "$DEST/05_INJEKSI-SEMUA-ORGAN/" 2>/dev/null || true
cp $BASE/scripts/v231_sakti.js          "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/v231_part*.js          "$DEST/05_INJEKSI-SEMUA-ORGAN/"
cp $BASE/scripts/organ/build_organ.ts   "$DEST/05_INJEKSI-SEMUA-ORGAN/"

# ---------- 06 OTAK UJIAN LAIN (bulltrap, beartrap, stophunt, gabungan, candle) ----------
cp $BASE/src/lib/exam/bulltrap-*.ts     "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/beartrap-*.ts     "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/stophunt-*.ts     "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/composite-*.ts    "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/candle-exam.ts    "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/contestants.ts    "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/evaluator.ts      "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/generator.ts      "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/indicators.ts     "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/rng.ts            "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/src/lib/exam/sakti-candle.ts   "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/scripts/ujian_bulltrap100.ts   "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/scripts/ujian_beartrap100.ts   "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/scripts/ujian_stophunt100.ts   "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/scripts/ujian_gabungan100.ts   "$DEST/06_OTAK-UJIAN-LAIN/"
cp $BASE/scripts/ujian_candle100.ts     "$DEST/06_OTAK-UJIAN-LAIN/"

# ---------- 07 BUKTI UJIAN (JSON hasil + txt bedah, 144 file riset) ----------
cp -r $BASE/research/ujian-fbo/.        "$DEST/07_BUKTI-UJIAN/"

# ---------- 08 LAPORAN (salinan semua laporan ujian) ----------
cp $BASE/download/LAPORAN-UJIAN-*.md    "$DEST/08_LAPORAN/"
cp $BASE/download/LAPORAN-AUDIT-REALTIME.md "$DEST/08_LAPORAN/"
cp $BASE/download/LAPORAN-UJIAN-PUMPDUMP-100.md "$DEST/08_LAPORAN/"

# ---------- 09 WORKLOG (log kerja multi-agent 66KB) ----------
cp $BASE/worklog.md                     "$DEST/09_WORKLOG/"

# ---------- 11 PUMPDUMP V238 (ujian 100 P&D + organ + bukti 1600/1600) ----------
cp $BASE/src/lib/exam/pumpdump-forge.ts        "$DEST/11_PUMPDUMP-V238/"
cp $BASE/src/lib/exam/pumpdump-gens.ts         "$DEST/11_PUMPDUMP-V238/"
cp $BASE/src/lib/exam/pumpdump-suite.ts        "$DEST/11_PUMPDUMP-V238/"
cp $BASE/src/lib/exam/pumpdump-brain.ts        "$DEST/11_PUMPDUMP-V238/"
cp $BASE/scripts/ujian_pumpdump100.ts          "$DEST/11_PUMPDUMP-V238/"
cp $BASE/scripts/v238_pd.js                    "$DEST/11_PUMPDUMP-V238/"
cp $BASE/scripts/inject_v238.py                "$DEST/11_PUMPDUMP-V238/"
cp $BASE/scripts/paket/00_INDEX.md             "$DEST/11_PUMPDUMP-V238/00_INDEX.md" 2>/dev/null || true
mkdir -p "$DEST/11_PUMPDUMP-V238/bukti-json"
cp $BASE/research/ujian-pumpdump/r*.json       "$DEST/11_PUMPDUMP-V238/bukti-json/" 2>/dev/null || true
cp $BASE/research/ujian-pumpdump/pd-hakim*.json "$DEST/11_PUMPDUMP-V238/bukti-json/" 2>/dev/null || true

# ---------- 12 KOMPLEKS V239 (ujian 100 skenario 5-aspek + organ + bukti 1600/1600) ----------
cp $BASE/src/lib/exam/kompleks-forge.ts          "$DEST/12_KOMPLEKS-V239/"
cp $BASE/src/lib/exam/kompleks-gens.ts           "$DEST/12_KOMPLEKS-V239/"
cp $BASE/src/lib/exam/kompleks-suite.ts          "$DEST/12_KOMPLEKS-V239/"
cp $BASE/src/lib/exam/kompleks-brain.ts          "$DEST/12_KOMPLEKS-V239/"
cp $BASE/scripts/ujian_kompleks100.ts            "$DEST/12_KOMPLEKS-V239/"
cp $BASE/scripts/probe_kl_r1.ts                  "$DEST/12_KOMPLEKS-V239/"
cp $BASE/scripts/probe_kl_r2.ts                  "$DEST/12_KOMPLEKS-V239/"
cp $BASE/scripts/v239_kompleks.js                "$DEST/12_KOMPLEKS-V239/"
cp $BASE/scripts/inject_v239.py                  "$DEST/12_KOMPLEKS-V239/"
cp $BASE/download/LAPORAN-UJIAN-KOMPLEKS-100.md  "$DEST/12_KOMPLEKS-V239/"
mkdir -p "$DEST/12_KOMPLEKS-V239/bukti-json"
cp $BASE/research/ujian-kompleks/*.json          "$DEST/12_KOMPLEKS-V239/bukti-json/" 2>/dev/null || true

# ---------- 13 ARAH V240 (kepastian arah berbasis bukti + organ + bukti 10600/10600) ----------
cp $BASE/src/lib/exam/arah-brain.ts                 "$DEST/13_ARAH-V240/"
cp $BASE/scripts/ujian_arah100.ts                   "$DEST/13_ARAH-V240/"
cp $BASE/scripts/probe_arah_r1.ts                   "$DEST/13_ARAH-V240/"
cp $BASE/scripts/probe_arah_r2.ts                   "$DEST/13_ARAH-V240/"
cp $BASE/scripts/probe_arah_r2b.ts                  "$DEST/13_ARAH-V240/"
cp $BASE/scripts/probe_arah_r5.ts                   "$DEST/13_ARAH-V240/"
cp $BASE/scripts/probe_arah_band.ts                 "$DEST/13_ARAH-V240/"
cp $BASE/scripts/probe_arah_r6.ts                   "$DEST/13_ARAH-V240/"
cp $BASE/scripts/v240_arah.js                       "$DEST/13_ARAH-V240/"
cp $BASE/scripts/inject_v240.py                     "$DEST/13_ARAH-V240/"
cp $BASE/download/LAPORAN-UJIAN-ARAH-100.md         "$DEST/13_ARAH-V240/"
cp $BASE/src/components/arena/arah-panel.tsx        "$DEST/13_ARAH-V240/"
cp $BASE/download/bukti_panel_arah.png              "$DEST/13_ARAH-V240/" 2>/dev/null || true
mkdir -p "$DEST/13_ARAH-V240/bukti-json"
cp $BASE/research/ujian-arah/ringkas/*.json         "$DEST/13_ARAH-V240/bukti-json/" 2>/dev/null || true

# ---------- 14 MOZAIK-OTAK (arsitektur kognitif terpadu 9 fakultas + bukti snapshot) ----------
cp $BASE/src/lib/otak/types.ts                  "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/evaluasi.ts               "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/internet.ts               "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/memori.ts                 "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/pengembang.ts             "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/alat.ts                   "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/fakultas.ts               "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/loop.ts                   "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/lib/otak/indeks.ts                 "$DEST/14_MOZAIK-OTAK/"
cp $BASE/src/app/api/otak/route.ts              "$DEST/14_MOZAIK-OTAK/api-otak-route.ts"
cp $BASE/src/components/arena/otak-panel.tsx    "$DEST/14_MOZAIK-OTAK/"
cp $BASE/scripts/evaluasi_otak.ts               "$DEST/14_MOZAIK-OTAK/"
cp $BASE/download/LAPORAN-ARSITEKTUR-KOGNITIF.md "$DEST/14_MOZAIK-OTAK/"
mkdir -p "$DEST/14_MOZAIK-OTAK/bukti"
cp $BASE/research/otak/snapshot-otak.json       "$DEST/14_MOZAIK-OTAK/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_mozaik_atas.png         "$DEST/14_MOZAIK-OTAK/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_mozaik_matriks.png      "$DEST/14_MOZAIK-OTAK/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_mozaik_loop_memori.png  "$DEST/14_MOZAIK-OTAK/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_mozaik_internet_dev.png "$DEST/14_MOZAIK-OTAK/bukti/" 2>/dev/null || true

# ---------- 00 INDEX (sumber kanonik di scripts/paket/) ----------
cp $BASE/scripts/paket/00_INDEX.md      "$DEST/00_INDEX.md"

# ---------- 10 AUDIT REALTIME (13 titik audit pasar real + patch 4 host) ----------
cp $BASE/scripts/audit_realtime_r45.ts        "$DEST/10_AUDIT-REALTIME/"
cp $BASE/scripts/uji_integrasi_market_r45.ts  "$DEST/10_AUDIT-REALTIME/"
cp $BASE/scripts/bukti_fallback_r45.ts        "$DEST/10_AUDIT-REALTIME/"
cp $BASE/src/lib/cyborg/market.ts             "$DEST/10_AUDIT-REALTIME/"
cp $BASE/download/LAPORAN-AUDIT-REALTIME.md   "$DEST/10_AUDIT-REALTIME/"


# ---------- 15 NADI-PRAKIRA (terus-hidup + gudang eksternal + pra-registrasi) ----------
cp $BASE/src/lib/exam/prareg.ts                 "$DEST/15_NADI-PRAKIRA/"
cp $BASE/src/lib/exam/prareg-brain.ts           "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/ujian_prareg100.ts             "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/probe_prar1.ts                 "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/probe_prar2.ts                 "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/probe_prar3.ts                 "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/probe_prar6.ts                 "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/validasi_prl1.ts               "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/validasi_prl2.ts               "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/v241_nadi.js                   "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/inject_v241.py                 "$DEST/15_NADI-PRAKIRA/"
cp $BASE/scripts/tmp/harness_v241.html          "$DEST/15_NADI-PRAKIRA/" 2>/dev/null || true
cp $BASE/src/app/api/gudang/route.ts            "$DEST/15_NADI-PRAKIRA/api-gudang-route.ts"
cp $BASE/src/components/arena/nadi-panel.tsx    "$DEST/15_NADI-PRAKIRA/"
cp $BASE/download/LAPORAN-PRAKIRA-NADI.md       "$DEST/15_NADI-PRAKIRA/"
mkdir -p "$DEST/15_NADI-PRAKIRA/bukti"
cp $BASE/research/pra-registrasi/ledger-pr100f-r2.json   "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/research/pra-registrasi/hasil-pr100f-r2.json    "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/research/pra-registrasi/ledger-pr100g-segel.json "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/research/pra-registrasi/hasil-pr100g-segel.json  "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/research/pra-registrasi/ledger-pr100-r1.json    "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/research/pra-registrasi/hasil-pr100-r1.json     "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_nadi_harness.png        "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_nadi_panel.png          "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_nadi_panel2.png         "$DEST/15_NADI-PRAKIRA/bukti/" 2>/dev/null || true

# ---------- 16 FISIKA-UI (V241 v1.1 + V242 ORKESTRA) ----------
cp $BASE/scripts/v241_nadi.js                     "$DEST/16_FISIKA-UI/"
cp $BASE/scripts/v242_fisika.js                   "$DEST/16_FISIKA-UI/"
cp $BASE/scripts/inject_v242.py                   "$DEST/16_FISIKA-UI/"
cp $BASE/scripts/ui/inventaris_fixed.py           "$DEST/16_FISIKA-UI/"
cp $BASE/scripts/ui/inventaris_fixed.json         "$DEST/16_FISIKA-UI/" 2>/dev/null || true
cp $BASE/scripts/ui/bangun_harness.py             "$DEST/16_FISIKA-UI/"
cp $BASE/scripts/ui/harness_v242.html             "$DEST/16_FISIKA-UI/"
cp $BASE/research/fisika-ui/hasil-harness-v242.json "$DEST/16_FISIKA-UI/"
cp $BASE/download/LAPORAN-FISIKA-UI.md            "$DEST/16_FISIKA-UI/"
mkdir -p "$DEST/16_FISIKA-UI/bukti"
cp $BASE/download/bukti_ui_before_tumpuk.png      "$DEST/16_FISIKA-UI/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_fisika_sakti_final.png    "$DEST/16_FISIKA-UI/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_fisika_harness_terbuka.png "$DEST/16_FISIKA-UI/bukti/" 2>/dev/null || true

# ---------- 17 SARANG-GITHUB (hidup mandiri GitHub Pages: V243 + mock + harness + bukti) ----------
cp $BASE/scripts/v243_sarang.js                       "$DEST/17_SARANG-GITHUB/"
cp $BASE/scripts/v242_fisika.js                       "$DEST/17_SARANG-GITHUB/"
cp $BASE/scripts/inject_v243.py                       "$DEST/17_SARANG-GITHUB/"
cp $BASE/scripts/sarang/mock_github.mjs               "$DEST/17_SARANG-GITHUB/"
cp $BASE/scripts/sarang/bangun_harness_v243.py        "$DEST/17_SARANG-GITHUB/"
cp $BASE/scripts/sarang/www/harness_v243.html         "$DEST/17_SARANG-GITHUB/"
cp $BASE/download/PANDUAN-GITHUB-PAGES.md             "$DEST/17_SARANG-GITHUB/"
cp $BASE/download/LAPORAN-SARANG-GITHUB.md            "$DEST/17_SARANG-GITHUB/"
mkdir -p "$DEST/17_SARANG-GITHUB/bukti"
cp $BASE/research/sarang/hasil-harness-v243.json      "$DEST/17_SARANG-GITHUB/bukti/" 2>/dev/null || true
cp $BASE/research/sarang/log-komit.json               "$DEST/17_SARANG-GITHUB/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_sarang_panel.png              "$DEST/17_SARANG-GITHUB/bukti/" 2>/dev/null || true
cp $BASE/download/bukti_sarang_harness.png            "$DEST/17_SARANG-GITHUB/bukti/" 2>/dev/null || true

# ---------- ZIP satu-klik ----------
cd $BASE/download
rm -f MICAPROFITA-TASKFILES.zip
zip -qr MICAPROFITA-TASKFILES.zip MICAPROFITA-TASKFILES

# ---------- BUKTI ----------
echo "================ PAKET SELESAI ================"
echo "Total file : $(find $DEST -type f | wc -l)"
echo "Ukuran dir : $(du -sh $DEST | cut -f1)"
echo "Ukuran zip : $(du -h MICAPROFITA-TASKFILES.zip | cut -f1)"
echo ""
find $DEST -type f | sort | awk -F"$DEST/" '{print $2}'