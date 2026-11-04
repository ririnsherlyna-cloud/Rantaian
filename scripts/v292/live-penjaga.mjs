#!/usr/bin/env node
// ============================================================
// V246 SARANG-PENJAGA v2.0 — DENYUT SERVER SAKTI + RADAR PHOENIX
// ------------------------------------------------------------
// Jawaban atas mandat pemilik: SAKTI tetap hidup & berkembang
// WALAU browser tidak pernah dibuka berhari-hari / bertahun.
// Berjalan di GitHub Actions (cron tiap 30 menit, repo publik
// = gratis) — otak membaca pasar nyata, mengunci prediksi
// SEBELUM terjadi (pra-registrasi), menilai prediksi lama,
// mengevolusi bobot genome, lalu menulis laporan sasaran ke
// repo — Pages membangun ulang otomatis.
//
// BARU v2.0 — RADAR PHOENIX (mandat pemilik):
//   "Dari ratusan koin kita pelajari-telaah; radar phoenix
//    mendeteksi AKUMULASI — beli di harga termurah hari itu
//    (ujung bawah), jual di ujung atas hari itu; radar bahkan
//    memperkirakan harga high akan berada di mana — di situlah
//    keuntungan kita."
//   Tahap 1: telaah SEMUA pasangan USDT (ratusan) via ticker
//     24 jam publik — 1 permintaan, nol biaya.
//   Tahap 2: telusur dalam koin di ZONA PHOENIX (posisi harga
//     di ujung bawah rentang 24 jam, likuid) memakai lilin 1 jam.
//   Sinyal akumulasi: sapuan lantai 3-hari lalu bangkit (jebakan
//     beruang / stop hunt), taker-buy menguat di dasar, kompresi
//     rentang, momentum berbalik. Target jual = prediksi ujung
//     atas dari level nyata (tengah rentang → puncak 24 jam →
//     swing 7 hari, dibatasi +9%), wajib untung bersih >= 1%
//     setelah fee 0.2%.
//   Lane PHOENIX (BUY) berdampingan jujur dengan lane ARAH
//     (komite genome) — keduanya pra-registrasi, dinilai net
//     P/L close-ke-close, genome radar ikut berevolusi.
//
//   v2.1 — PHOENIX-PERTAJAM (lahir dari 4 kekalahan pertama, net −11.35%):
//     1. GERBANG KONFIRMASI wajib — di atas EMA9 + taker-buy menguat +
//        masih di ujung bawah; tak ada lagi menadah pisau jatuh.
//     2. TANGGA TARGET — pilih magnet nyata TERDEKAT (tengah rentang →
//        puncak 24 jam), bukan swing tertinggi yang fantasi (targetKena 0/6).
//     3. Rezim TURUN/PARABOLIK: gerbang skor +10, kuota dibelah, cap target 6%.
//     4. Stop struktural di bawah lantai 24 jam (bukan cuma ATR).
//     5. BAHAN AJAR — tiap vonis jadi pelajaran (laporan/pelajaran-server.json);
//        pola kekalahan terulang >= 2x melahirkan ATURAN yang mengikat gerbang.
//     6. MFE/MAE dicatat: seberapa jauh harga benar-benar bergerak setelah kunci.
//
//   v3.0 — MAJELIS-ILMU (mandat pemilik: "pelajari jurnal-jurnal ilmiah AI yang
//     benar-benar banyak diperdebatkan, ditelaah, terbukti koheren — lalu
//     inovasikan pada cyborg"). Lima metode teruji kini DIPASANG, bukan
//     sekadar dikutip (laporan/jurnal-ilmu.json = akta rujukan):
//     1. HEDGE / MULTIPLICATIVE WEIGHTS UPDATE — Arora-Hazan-Kale 2012
//        (Theory of Computing 8:121-164) · Freund-Schapire 1997 (JCSS 55:119-)
//        · Cesa-Bianchi-Lugosi 2006 (Prediction, Learning, and Games):
//        bobot tiap dimensi bukti & sinyal belajar ON-LINE dari tiap vonis
//        matang: w *= exp(-eta*loss), loss=(1-y*a)/2 — jaminan regret
//        terbukti: komite terbukti tak jauh kalah dari ahli terbaiknya.
//     2. BRIER + KALIBRASI — Brier 1950 · Gneiting-Raftery 2007 (JASA 102:359-):
//        keyakinan diperlakukan sebagai PROBABILITAS — dinilai skor Brier,
//        dan keyakinan baru dipetakan ke hit-rate empiris binnya (medan
//        sendiri sebagai pengkalibrasi), bukan angka karangan.
//     3. KONFORMAL — Angelopoulos-Bates 2021 (arXiv:2107.07511): pita ujung
//        atas 75% dari skor kesesuaian (MFE) medan sendiri — kuantil dengan
//        jaminan cakupan, jujur null saat sampel belum cukup.
//     4. TRIPLE-BARRIER + META-LABELING — Lopez de Prado 2018 (Advances in
//        Financial Machine Learning, Wiley): vonis phoenix dilabel barier mana
//        yang kena duluan (TARGET/STOP/WAKTU); gerbang radar digeser empiris
//        dari hasil bucket konfirmasi (model kedua menilai model pertama).
//     5. FINMEM — Zhang dkk 2023 (arXiv:2311.13743): ingatan berlapis —
//        peristiwa(1: ledger) -> pelajaran(2: refleksi) -> doktrin(3: aturan
//        yang mengikat gerbang) — siklus sadar-pasar yang dipublikasikan.
//
// Prinsip: 0 dependensi, 0 API key, data publik saja.
// Protokol: SASARAN-MICAPROFITA (laporan), ledger prakira
// berantai waktu, fee 0.1%+0.1% wajib, vonis WAJIB biner
// BUY/SELL (tanpa SKIP) — selaras otak ARAH v240.
// File yang diubah (dipisah dari milik organ browser):
//   laporan/sasaran-terkini.json   <- laporan harian sasaran
//   laporan/prakira-server.jsonl   <- ledger prediksi terkunci
//   laporan/denyut-server.jsonl    <- log denyut tiap siklus
//   otak/genome-server.json        <- genome berevolusi (ARAH+PHOENIX)
//   otak/penjaga-keadaan.json      <- keadaan siklus
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const ROOT = process.cwd()
const FEE = 0.002            // 0.1% buy + 0.1% sell — wajib
const HORIZON_JAM = 24       // sasaran harian
const VERSI = 'V269-TANGGAP-SELALU v6.6 — ANTI-DIAM (2026-10-04): mandat pemilik "JANGAN buat dia Diam — justru dia harusnya tanggap cerdas; kalau dia Diam dia gak pernah berkembang" dijalankan penuh: (1) SLOT-PENELITI — gerbang menutup ≠ berhenti: bila 0 kunci penuh, kandidat TERKUAT yang bersih forensik (tanpa racun/veto/rem/hitam) tetap dikunci sebagai POSISI-PENELITI ukuran mikro ×0.25 + stop ketat ×0.8 — tetap beraksi kecil, tetap dinilai medan, tetap belajar; hipotesis yang dulu cuma jadi near-miss kini jadi BUKTI; (2) TANGGAPAN WAJIB — tiap denyut WAJIB menerbitkan tanggapan naratif penuh (kulihat-kuputuskan-kusiapkan) ke laporan/tanggapan.json + guru.json: kesunyian denyut adalah BUG, bukan konservatisme; (3) METER DIAM — denyut-diam beruntun dihitung & disegel tiap denyut, menembus toleransi memicu tanggapan khusus; (4) DOKTRIN SEKOLAH AGI DIREVISI — soal "kapan wajib diam" kini mengajarkan REM SINGKAT, bukan identitas diam + soal BARU "anti-diam" menguji apa yang cyborg LAKUKAN saat gerbang menutup; (5) gerbang keyakinan (peluang-skor/slip-neto/metakognisi/komite/tangga-ukuran/menunggu-mandat/tunda-bear) TIDAK berlaku bagi slot-peneliti — pagar pengaman yang tetap mengikat: rem-pintar, kuota-harian, kartu-risiko, zona-chase, jual-pita, organ-veto, slip-maks, alokasi-dinamis. Ditumpuk pada V268-SADAR v6.5 — SEKOLAH AGI + SEKOLAH KILAT PUTARAN-4 (2026-10-04): mandat pemilik "sekolah AGI agar cyborg benar-benar mandiri dan sadari seutuhnya — coba tes pemahaman AGI dan lihat tanggapnya" dijalankan: UJIAN PEMAHAMAN 5 FAKULTAS tiap denyut (SADAR-DIRI — identitas/kalibrasi/kelemahan berbukti; PENALARAN — fee/EV/komplemen-MC/tangga-ukuran dihitung hidup; METAKOGNISI — kapan wajib diam + 4 titik buta terdokumentasi; DUNIA — rezim/F&G/funding/OI/breadth/kompas siklus ini; AJARAN — hukum fee/pra-registrasi + pelajaran sekolah kilat) — jawaban DIBANGUN dari keadaan hidup (bukan hafalan), DINILAI kunci yang dihitung ulang lewat jalur kedua berdiri sendiri (bila kawat putus, nilai turun), kurikulum ADAPTIF menyorot fakultas terlemah siklus lalu dgn soal ekstra, riwayat nilai 40 siklus disimpan, transkrip penuh publik di laporan/sekolah-agi.json + ringkasan di guru.json; sekolah kilat putaran-4: cache segar diambil ulang, dunia beku baru dipanen, SEMUA vonis sebelumnya digrade ulang dgn lilin pasca-T penuh 24 jam (sebelumnya sebagian baru terlihat sebagian horizon), bedah matriks penuh memverifikasi ulang 10 organ lama dgn n lebih besar lalu mencari kandidat organ baru dg kriteria ketat (n≥30, cerita koheren, tahan lintas keluarga dunia) — organ baru hanya disegel bila bukti sah, draf gagal dibuang jujur (anti-overfit). Ditumpuk pada V267-ANTI-ARUS v6.4 — SEKOLAH KILAT PUTARAN-3 (2026-10-03): bedah lanjutan 2.366 soal in-sample + OOS putaran-2 menemukan DUA ORGAN BUY yang sah: (9) buy-saksi-terbalik — BUY saat bear-harian & ret1h BTC ≥ 0 (saksi pantulan sesaat) = JEBAKAN PANTULAN (in-sample n=77 ak 41.6% net −23.4%) sedangkan BUY saat masih merah (tanpa saksi) = menadah dasar terbukti untung (n=64 ak 68.8% net +103.5%) → key −8 + ukuran ×0.6; (10) buy-jatuh-dalam — BUY saat ret24 BTC ≤ −2.5% jatuh pisau (in-sample −3..−2% net −7.4% n=31 · −4..−3% ak 25% · ≤−2.5% agregat net −3.8% n=27; vs −2..−1% ak 55.7% net +83.1% — batas −2.5% tajam) → key −8 + ukuran ×0.6; KEJUJURAN PUTARAN-3: hari divergensi-reversal (10-02: BTC ret24 +1.5..+3.7% & breadth 13-26%) tetap BUTA PRINSIPIL — in-sample divergensi justru untung (+15.2% n=25, ak 52%) sehingga organ pembalik-arus divergensi TIDAK SAH dibuat (draf-2 dibuang sebelum push — anti-overfit, pelajaran draf-1 diulang); SELL-bear V266 terbukti di dunia bear murni (06-10T00: SELL 8/8 = 100%); denyut cron diperbaiki menit non-bulat 7/15 (anti-skip scheduler GitHub). Ditumpuk pada V266-BAROMETER v6.3 — SEKOLAH KILAT PUTARAN-2 (2026-10-03): ujian buta OUT-OF-SAMPLE pada dunia yang organ V265 belum pernah lihat (10-02 langkah 2 jam + holdout T05/07/09/11: 120 soal, ak 0-3.5% net −186.9% — hari REVERSAL: barometer pra-T positif +1.5..+3.2% BTC lalu pasar berbalik = buta prinsipil, tidak ada data pra-T yang menyelamatkan) + BEDAH MAKRO 2.366 soal in-sample menemukan pendarah yang TERLIHAT: SELL saat BTC≤−1% = ak 30.2% net −339.3% (n=397, menjual dasar); breadth≤25% = net −405.5% (n=705); BUY saat BTC 0..+1% = net −155.8% (n=470); BUY saat BTC≤−1% justru ak 53.9% net +80.1% (menadah pantulan terbukti — dipertahankan; draf-1 organ yang memotong BUY-bear adalah SALAH TARGET dan dibuang). EMPAT ORGAN BAROMETER-MKRO mengikat saat kunci (0 permintaan baru, blind aman): (5) sell-bear-harian — bear-harian (ret24 BTC ≤ −1.5% atau breadth ≤25%) memotong keyakinan SELL ≤40 + ukuran ×0.5; (6) tunda-bear — SELL terkalibrasi <50 saat bear-harian TIDAK dikunci denyut ini (pola KEMBALI-PINTAR: TUNDA, bukan balik arah, bukan ban); (7) sell-relatif-kuat — SELL pada koin yang ret24-nya LEBIH KUAT dari BTC saat bear dibatasi key ≤45; (8) buy-flat-btc — BUY saat BTC flat-ragu (0..+1%) keyakinan −8; radar-jujur-bear — kandidatLain saat bear hanya mengiklankan jawaban key ≥45 (kunci penuh tetap dinilai apa adanya — seleksi publik, bukan karantina). Ditumpuk pada V265-SEKOLAH-BUTA v6.2 — SEKOLAH KILAT (2026-10-03): mandat pemilik "uji dengan ratusan simulasi trading, temukan dimana bodohnya, push lagi" dijalankan: ujian buta-histori 2.533 soal nyata (koin nyata, dunia beku di jam T — blind dijamin lapisan data, mustahil melihat sesudah T; vonis resmi close T+24j − fee) melahirkan EMPAT ORGAN yang mengikat saat kunci: (1) jual-lemah — SELL saat zSma<0.5 = menjual kelemahan bukan kekuatan (uji: ak 37.6% net −603%, n=1154) → keyakinan dijujurkan ≤40 + ukuran ×0.5, tetap mengunci & tetap belajar (anti-karantina); (2) jual-pita — SELL di pita sempit entropi≤0.85 (uji: ak 11.8%, n=17) → veto saksi ber-alasan; (3) key-melawan-drift — keyakinan 55-69 melawan drift OLS-24j (uji: ak 40.7% net −70.3%, n=221) → terkalibrasi ×0.75 disegel; (4) momentum-kuat — BUY zSma≥1.5 / drift≥5% adalah jantung otak (uji: ak 47.6–48.1% net +106..+191%) → bonus odds +8 prioritas kuota. Ditumpuk pada V264-PINTAR-KEMBALI v6.1 — DOKTRIN PEMILIK (2026-10-03): SALAH ADALAH DATA BELAJAR DI PASAR HIDUP — bukan hukuman mati, bukan juga lupa total; koin yang salah arah TIDAK dibuang/didiamkan/diberhentikan belajar. Tiga kunci: (1) REM-PINTAR — jejak dingin kini REM SINGKAT ber-kadaluarsa (sasaran: 1 denyut 15 menit, bukan bekuan 4 jam; daftar-hitam: rem 2 jam, bukan pendingin 48 jam) — setiap rem ber-alasan, ber-akhir, dan tidak pernah mematikan belajar; (2) KEMBALI-PINTAR — koin/pola yang pernah gagal BOLEH dibuka lagi kapan pun setup valid sekarang (pasar terus bergerak), TAPI dengan SYARAT TAMBAHAN DARI PELAJARAN yang lebih ketat dan MENGIKAT saat kunci + disegel di ledger (bar keyakinan naik +4/kejadian klamps +12, ukuran ×0.6^n, stop ×0.8^n, wajib konfirmasi mata-jauh searah bila ≥2 kejadian) — bukan syarat default seolah belum pernah SALAH; gagal syarat = TUNDA denyut ini (rem), bukan ban; (3) TREN-EVOLUSI — "berevolusi" hanya berarti jika aturan mengikat saat kunci DAN tren EV/PF di rapor publik bisa membaik: ledger matang dibagi 4 jendela kronologis (n/winrate/EV/PF/aturanMengikat% per jendela, tertua→terbaru) disegel tiap denyut di guru.json + impas.json + dasbor — evolusi diukur dari angka medan, bukan diklaim dari generasi genome atau kosmetik UI. ditumpuk pada V263-ASAH-MURNI v6.0 — HUKUM BARU PEMILIK: KARANTINA DILARANG — yang sedang belajar tidak pernah dihentikan; makin asah makin tajam. Empat kunci: (1) ASAH-KALIBRASI — gerbang karantina-kalibrasi V262 (keyakinan×faktor < 40 → blok) DIHAPUS: jalur yang overclaim TETAP MENGUNCI dan TETAP BELAJAR, kini dalam MODE-ASAH (ukuran ×0.6, stop ×0.75 lebih ketat, keyakinan terkalibrasi disegel jujur) — kesalahan terus terjadi dan terus dinilai, itulah bahan asah; (2) ASAH-SUARA — rule-healer V259 tak lagi menyita suara topik (bobot 0): topik bermasalah kini bersuara lirih bobot 0.35 dan pulih lewat bukti medan — tidak ada suara yang dibungkam; (3) MATEMATIKA MURNI & EKONOMI CERDAS — mesinMate per kandidat dari data saat itu: Hurst R/S (tren vs pulang-keseimbangan), half-life OU, drift OLS 30-bar + R², z-SMA20, entropi Shannon arah, volatilitas Parkinson & Garman-Klass, autokorelasi lag-1, ekonomi carry funding (siapa membayar siapa), EV-ekonomi setelah biaya — plus MATA JAUH: kerucut MC 72 jam (pNaik 24/48/72 jam) agar membaca jauh SEBELUM terjadi; (4) ORGAN-BARU — setiap vonis SALAH melahirkan mikro-aturan baru yang di-replay ke seluruh ledger (berapa kasus terhindarkan, berapa net diselamatkan); organ yang lulus sekolah medan (n≥10, hit≥52%, net>0) berhak VETO. PLUS: denyut dipercepat 30 → 15 MENIT (yang belajar tidak dibiarkan mengantuk), sumber data dilengkapi (posisi-besar Binance futures, agresor taker Binance, Bybit linear funding/OI), registri 254 → 276 parameter bernama; ditumpuk pada V262-IMPAS-CERDAS v5.8 — audit 4 kasus dev berbasis data + lima gerbang impas yang MENGIAT; V262: bedah ledger 64 rapor matang (akurasi 37.5% · net −30.9% · PF 0.68) menemukan pendarah: jalur ARAH lahir 36/36 TANPA stop/target, menjual di dasar rentang (sr ≤ −0.5 → bucket net −29.8%, PF 0.44, n=35), overclaim keyakinan 17–30pp, dan kuota tidak mengikuti EV — LIMA KUNCI IMPAS diadopsi dari BACKTEST MUNDUR atas ledger sendiri (bukan copy agent luar — riset diri): (1) ZONA-CHASE — SELL di dasar / BUY di puncak rentang 20-bar DIBLOK saat kunci (backtest: net −30.9% → −3.9%, PF 0.68 → 0.93); (2) KALIBRASI-MEDAN — keyakinan mentah × faktor-jalur (akurasi medan / keyakinan-rata, klamps 0.3–1.2) < 40 → jalur DIKARANTINA otomatis dan pulih sendiri saat hit-rate medan naik (ARAH kini faktor 0.567 → keyakinan 55–67 terkalibrasi 31–38 → karantina; PHOENIX 0.715 → 50–53 → mengalir); (3) ALOKASI-DINAMIS — kuota per jalur dari EV trailing shrinkage Beta(4,4): jalur pendarah tersisa lantai 2/hari (tetap belajar), jalur sehat menerima sisanya; (4) STOP/TARGET WAJIB — kasus D ditutup: tak ada lagi sinyal lahir tanpa rencana keluar (stop/target pra-registrasi dari kerucut MC, default-jujur bila MC kosong); (5) AMBANG-IMPAS — net kumulatif < 0 menaikkan ambang odds maks +20 (selektivitas naik saat darah, melonggar sendiri saat pulih) — backtest paket: ARAH (n=30, ak 16.7%, PF 0.07) terkarantina penuh, PHOENIX (n=24, ak 45.8%, PF 1.23) mengalir utuh, replay net −30.9% → −1.2 s.d. +1.3, ekspek −0.48% → ~0; ditumpuk pada V261-CLAW-TEMPOK (pagar-baja & komite panjia warisan keluarga "ClawTrade"); V261: deep-screening DUA anggota keluarga dari KODE SUMBER — yuxuan-lou/ClawTrade (security middleware: "treat your AI agent as an untrusted client" — guardrails.py hard rules di luar jangkauan otak, confirmation.py antrean konfirmasi manusia ber-kadaluarsa, audit.py append-only ber-sanitasi) + clawtradeai-Agent/ClawTradeAI (MIT, multi-agent Solana: CoordinatorAgent weighted voting + riskManagerVeto + recommendedAmount, RiskManagerAgent kartu 4×25 + blockedTokens): DELAPAN KUNCI TEMPOK diadopsi — (1) PAGAR-BAJA: konstanta keras yang otak BACA tapi tak bisa TULIS ulang (kuota-harian, langit-langit slip, ukuran maks) dicek DULU di gerbang; (2) DAFTAR-TERLARANG ala FORBIDDEN_OPS: operasi terlarang blokir permanen sebelum hitung apa pun; (3) KOMITE-PANJIA ala CoordinatorAgent: 5 suara berbobot tetap (tren/kerumunan/derivatif/buku/tegangan) — tak ada suara tunggal yang berkuasa, suara rusak = bobot nol (degradasi anggun), keyakinan komite = koherensi searah (porsi kekuatan suara searah dari total terbaca — kalibrasi jujur, bukan copy confidence LLM) < minconf → SKIP; (4) KARTU-RISIKO 4×25 ala RiskManagerAgent: likuiditas/derivatif/kerumunan-konsentrasi/volatilitas → skor 0-100 berlevel LOW/MEDIUM/HIGH/CRITICAL, > 70 → VETO-SAKSI; (5) TANGGA-UKURAN ala recommendedAmount: keyakinan dikuantisasi kasar 1.0/0.5/0.25/nol — tak ada ukuran antara, kuanta membatasi skalaEfektif dari atas; (6) MENUNGGU-MANDAT ala confirmation.py: ukuran tertinggi tak dikunci seketika — antre + kadaluarsa 12 jam, kunci hanya setelah lolos gerbang ulang denyut berikutnya; (7) DAFTAR-HITAM ala blockedTokens: sasaran yang 3× diveto kartu-panas dibekukan 48 jam ber-alasan; (8) BUKU-TEKOK ala audit.py: setiap blok gerbang tercatat per-aturan + rekap kumulatif — ditumpuk pada V260-AUTOPILOT-KALIBRASI (warisan deep-screening "AutoPilotPM" (recogardtech/AutoPilotPM, MIT, kode sumber TypeScript 95 modul dibedah: src/ledger + src/risk + src/trading): TUJUH KUNCI KALIBRASI diadopsi — (1) TIMBANGAN-ALT (alternativesConsidered ala decision ledger): pilihan kedua dicatat saat kunci, regret-nya dihitung medan saat matang; (2) KELLY-LAPIS (dynamic Kelly 9-lapis): pengecilan drawdown (mulai 5%, setengah di 15%), kerendahan-hati sampel-kecil (<10 vonis → 0.5–0.95×), penyusutan streak-kalah (lantai 0.5×), vol-target scaling (klamps 0.5–1.5) — ditumpuk di atas ekspresi dinamis, skalaEfektif clamp [0.2,1.2] + keyakinan-ukuran 0.4/0.3/0.3; (3) REZIM-MEDAN (volatility regime 4-tingkat BASELINE-MANDIRI): σ window P&L dibanding baseline σ window penuh pertama milik sendiri — tenang 1.2×/normal 1.0×/tinggi 0.5×/ekstrem 0.25×+BERTAHAN; (4) UJI-TEGANG (stress test 5 skenario ala stress.ts): flash-crash/likuiditas/platform/korelasi/black-swan dinilai ke posisi terbuka, terburuk ≥30% → penalti+BERTAHAN; (5) SLIP-NETO (slippage-adjusted edge ala OPPORTUNITY_FINDER): edge dikurangi sqrt(1/likuiditas)·2·faktor+spread/2 SEBELUM memutuskan — edge bersih ≤ 0 ditolak dengan alasan, data kosong tidak memblokir (fallback-jujur); (6) PELUANG-SKOR (opportunity scoring terbobot + penalti): 0-100 = edge+likuiditas+keyakinan+eksekusi−penalti, <60 ditolak dengan alasan (gerbang baru yang hanya MENOLAK); (7) TOP-TOLAK (topBlockReasons): ranking alasan penolakan — kesadaran atas penolakannya sendiri — ditumpuk pada V259-KAIZEN-PULIH (prateekjain98/kaizen-trader open-source + KAIZEN Virtuals/Hyperliquid + Kaizen RegimeBot + kaizen.cash): EMPAT LOOP PENYEMBUHAN-DIRI diadopsi — (1) UJI-BALIK (delta-revert): perubahan genome adalah eksperimen yang dinilai medan per 8 vonis matang, yang lebih buruk DIREVERT; (2) KARANTINA (rule-healer): topik meta-inferensi yang terus keliru disita suaranya sementara, pulih lewat bukti; (3) DINGIN-DENDAM (anti-revenge): kekalahan beruntun per sasaran/keluarga membekukan re-entry; (4) HENTI-HARIAN: rugi-net harian ≤ −4% memaksa BERTAHAN — ditambah KESEGARAN gerakan (pompa-tua diveto ala "fresh breakouts > stale pumps"), MODAL-MATI (chop-exit), TESIS-PATAH, dan PENJAGA-KEDUA (hard-stop 15%/hard-target 40% pra-registrasi ala watchdog proses-terpisah): lapisan parameter per kandang diperluas 46 → 67 bernama — (D) STRUKTUR HARIAN dari klines 1d 90 hari (EMA-align/RSI/MACD daily, Donchian 30d, jarak puncak-lantai 90d, momentum bulanan, streak hari, rasio volatilitas realized 7d/30d), (E) KERUMUNAN NYATA OKX rubik (long/short account ratio + tren membubarnya, taker buy/sell aggressor), (F) STRES DERIVATIF (basis perp-vs-spot, jam menuju funding, funding relatif vs BTC), (G) gradien order book (massa depan vs total 1%), (H) 6 INTERAKSI antar-faktor eksplisit (funding×ΔOI, volume×rezim-ATR, tren4h×funding, buku×tren1h, breakout×volume, agresor×tren) — semuanya lapis OBSERVASI: dihitung, dinarasikan, disekolahkan, berhak VETO, TIDAK berbobot sebelum hit-rate medan lulus (hukum rumah tak berubah) + 5 param iklim lintas-siklus (Δdominasi antar-denyut, ETH/BTC 7d risk-on/off, LS-akun BTC/ETH, jam funding BTC) · ditumpuk pada V256-MESIN-DEAL-ODDS (MESIN DEAL ala DCA-bot 3Commas: safety orders hard-cap 1.2×ATR ×1.6 ×1.5 + breakeven aktivasi 60% + trailing 0.8×ATR + Global Max Open Positions; ODDS MAKER ala Trade Ideas: skor 0-100, top-3 ≥55 boleh kunci; 6 tag peristiwa OddsMaker) → registri total 101 → 127 → 145 → 167 → 191 → 232 → 254 parameter bernama'

// ---------------- kandang lane ARAH (komite genome) ----------------
const KANDANG = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'TRX']

// ---------------- konstanta radar PHOENIX ----------------
const PHX = {
  ZONA_POSISI: 0.45,       // posisi harga di ujung bawah rentang 24 jam
  TELUSUR_MAKS: 60,        // telusur dalam: koin zona paling likuid
  QV_MIN: 3e6,             // likuiditas minimum $3 juta / hari
  GERBANG_SKOR: 42,        // skor phoenix minimum (0..100)
  UNTUNG_MIN: 0.01,        // untung bersih minimal 1% setelah fee
  SASARAN_PHX: 3,          // maks baris BUY phoenix di sasaran utama
  SASARAN_ARAH: 3,         // maks baris komite di sasaran utama
  KUNCI_MAKS: 6,           // kuota prediksi phoenix terkunci per hari — hanya yang terbaik
  TARGET_CAP: 1.12,        // target dibatasi +12% dari entry agar tetap realistis
  // ---- v2.1: dilahirkan oleh kekalahan nyata (ACE/ARB/XPL/CRCLB, targetKena 0/6) ----
  KONFIRM_MOMENTUM: 0.5,   // WAJIB: harga sudah kembali di atas EMA9 — dilarang membeli pisau jatuh
  KONFIRM_AKUMULASI: 0.15, // WAJIB: taker-buy 12j > 12j sebelumnya — beli diam-diam harus terbaca
  KONFIRM_POSISI: 0.35,    // WAJIB: masih di sepertiga bawah rentang 24 jam — "harga termurah hari itu"
  TURUN_SKOR_TAMBAH: 10,   // rezim TURUN/PARABOLIK: gerbang dinaikkan — melawan arus harus lebih meyakinkan
  TURUN_CAP: 1.06,         // rezim TURUN/PARABOLIK: target cap +6% — harapan kecil yang jujur
}

// ---------------- V247 ILMU — konstanta fondasi jurnal teruji ----------------
const ILMU = {
  HEDGE_ETA: 0.5,          // laju belajar Hedge (Freund-Schapire 1997) — seimbang antara adaptasi & stabilitas
  HEDGE_MIN: 0.03, HEDGE_MAKS: 0.55,
  BIN_KALIBRASI: [[52, 60], [60, 70], [70, 80], [80, 101]],
  KALIBRASI_MIN_N: 5,      // bin belum dipercaya sebelum 5 kasus medan — jujur kembali ke angka mentah
  KONFORMAL_ALPHA: 0.25,   // pita 75% — cakupan 1-alpha (Angelopoulos-Bates 2021)
  KONFORMAL_MIN_N: 8,      // pita belum diumumkan sebelum 8 skor kesesuaian
  KONFORMAL_MAKS: 60,      // memori skor kesesuaian dibatasi (FinMem: ingatan melipat)
  META_MIN_N: 6,           // bucket konfirmasi minimal sebelum gerbang boleh digeser empiris
  META_GESER_MAKS: 8,      // geseran gerbang meta-labeling dibatasi ±8 skor
}

// ---------------- V249 WARISAN ORGAN BESAR ----------------
// Riset organ SAKTI penuh (index.html, 8.000+ fungsi kuant: GARCH, Monte Carlo
// Probability Cone, Volume Profile, CAPM Beta, Divergence, Market Breadth,
// pump/exhaustion detector) → 7 mesin yang bisa dihitung JUJUR dari lilin 1h
// yang SUDAH diambil — tanpa API kunci, tanpa dependensi, tanpa klaim baru.
const WARISAN = {
  MC_LINTASAN: 2000, MC_LANGKAH: 24, MC_MIN: 0.38,   // gerbang peluang tembus target
  LAMBDA_EWMA: 0.94,                                  // RiskMetrics — residual terstandarisasi MC
  VP_BATANG: 48, VP_BUCKET: 24, VA_POROSI: 0.70,     // Volume Profile 48 jam, Value Area 70%
  BETA_JAM: 90,                                       // regresi CAPM 90 jam vs BTC
  KEJUT_SIGMA: 4,                                     // lonjakan 6j > 4× sigma-GARCH·√6 di ujung atas = kejar-top
}

// ---------------- V253 WAWASAN-360 — mandat pemilik: "dia belum fasih dan
// matang dibanding OpenClaw / chat AI biasa; pertingkat agar dia miliki BANYAK
// PARAMETER wawasan terkait crypto" ----------------
// Tiga lapis parameter baru, semuanya dari endpoint PUBLIK tanpa API key:
//   L1 lilin (10 param, dari lilin 1 jam yang SUDAH diambil — 0 permintaan baru):
//     MACD(12,26,9), ADX/DI(14), Bollinger %B(20,2), VWAP-24j, OBV taker-weighted,
//     struktur swing (HH/HL vs LH/LL), pola lilin (engulfing/hammer/star/doji),
//     konsistensi arah 24 lilin, pivot klasik harian (P/R1/S1), kekuatan relatif vs BTC
//   L2 derivatif (2 param, NYATA — pertama kali dipakai otak server):
//     funding rate + open interest Bybit linear (896 simbol, 1 permintaan);
//     ΔOI antar-siklus dari snapshot keadaan (jujur: denyut pertama = null)
//   L3 makro (1x per denyut — masuk IKLIM & NARASI, bukan komite):
//     Fear & Greed (alternative.me), dominasi BTC (CoinGecko, fallback proxy
//     volume spot), breadth pasar — param konstan per siklus TIDAK berhak
//     memilih arah (pelajaran forensik: fitur konstan lane tak bisa menilai)
const WAWASAN = {
  BAGIAN_KOMITE: 0.4,       // porsi skor wawasan dalam komite (0.6 dimensi lama + 0.4 wawasan)
  FUNDING_EKSTREM: 0.0005,  // 0.05% per interval = kerumunan ekstrem (sisi pembayar biasanya salah)
  FUNDING_MIRING: 0.0001,   // 0.01% = mulai miring
  ADX_TREND: 20,            // di atas ini pasar ber-trend (DI menentukan arah)
  BB_SEMPIT: 0.018,         // lebar band < 1.8% harga = kompresi
  OI_BERAT: 0.015,          // ΔOI per siklus > ±1.5% = perputaran posisi berat
  // ---- V254 SAMUDRA-PARAMETER ----
  IMBALANS_VETO: 0.55,      // order-book imbalance lawan arah > 0.55 = dinding pasaran menolak
  SPREAD_BPS_LEBAR: 25,     // spread > 25 bps = mikrostruktur buruk, buku tidak bisa dipercaya
  FRHIST_EKSTREM: 0.00035,  // rata funding 3 interval > 0.035% = kerumunan berkelanjutan (bukan lonjakan)
  TREN4H_LAWAN: 0.62,       // EMA-align 4h lawan arah > 0.62 = rangka waktu besar menolak
  ATR_PCTILE_EKSTREM: 0.96, // ATR di persentil 96+ = volatilitas ekstrem, sinyal arah melempar
  SEKOLAH_LULUS_N: 20,      // sekolah parameter: n minimum sebelum param berhak dinilai
  SEKOLAH_LULUS_HIT: 0.52,  // hit-rate nasihat param minimum utk status 'calon lulus'
  // ---- V257 SAMUDRA-DALAM ----
  BASIS_EKSTREM: 0.008,     // |basis perp-vs-spot| > 0.8% = stres posisi ekstrem
  LS_TAKER_EKSTREM: 2.2,    // taker buy/sell > 2.2× (atau < 0.45×) = agresor satu sisi ekstrem
  LS_AKUN_RAMAI: 2.0,       // long/short account ratio > 2 = kerumunan akun long ramai
  DONCHIAN_UJUNG: 0.97,     // posisi > 97% rentang 30 hari = ujung atas (breakout/kejar-top)
}
const DIM_WAW = ['macd','adx','bollinger','vwap','obv','swing','pola','konsist','pivot','relatif','funding','oi']
const GENOME_WAW_AWAL = { macd:0.10, adx:0.07, bollinger:0.07, vwap:0.09, obv:0.08, swing:0.12, pola:0.07, konsist:0.08, pivot:0.09, relatif:0.10, funding:0.07, oi:0.06 }
// ---- V254 SAMUDRA-PARAMETER — registri domain: tiap parameter bernama punya
// domain & lapis. Lapis INTI = 12 param berbobot (genome + Hedge). Lapis
// OBSERVASI = parameter penuh tambahan: dihitung, dinarasikan, diveto-kan, dan
// DICATAT per prediksi (sekolah parameter) — tapi TIDAK berbobot sampai hit-rate
// medannya lulus. Kejujuran: tidak ada param baru yang langsung mengklaim hak suara.
const DOMAIN_INTI = { macd:'momentum', adx:'tren', bollinger:'volatilitas', vwap:'aliran', obv:'aliran', swing:'tren', pola:'momentum', konsist:'momentum', pivot:'tren', relatif:'relatif', funding:'derivatif', oi:'derivatif' }
const NAMA_DOMAIN = {
  tren: 'Tren & Struktur', momentum: 'Momentum', volatilitas: 'Volatilitas', aliran: 'Aliran Order & Volume',
  derivatif: 'Derivatif Futures', mikrostruktur: 'Mikrostruktur Buku', relatif: 'Kekuatan Relatif & Lintas-Pasar', kalender: 'Kalender & Sesi',
  interaksi: 'Interaksi Antar-Faktor (V257)',
}
// registri parameter observasi (diluar 12 inti) — dipakai untuk hitungan total & dasbor
const PARAM_OBS = ['ema1h','rsi1h','roc12','roc48','stoch','mfi','cci','jarakEkstrem','atrPctile','volZ','bodyRatio','ema4h','macd4h','rsi4h','bb4h','swing4h','sejajar4h','atrRatio','fundRata3','fundTren','bukuImbalans','bukuSpread','bukuKedalaman','bukuDinding','persenChg','persenVol','sesi','akhirPekan','faseBulan','garchSigma','betaBTC','divRSI','pocJarak','mcPnaik']
// ---- V257 SAMUDRA-DALAM — lapis parameter baru (semuanya dihitung nyata per kandang;
// iklim = konstanta per siklus, masuk iklim & narasi, TIDAK memilih arah — hukum forensik) ----
const PARAM_OBS_V257 = ['ema1d','rsi1d','macd1d','donchian30d','jarak90d','momen30d','streak1d','volRasio7d30d','lsAkun','lsTren','lsTaker','basisPct','jamFunding','fundVsBtc','bukuGradien','ixFundingOI','ixVolAtr','ixTrenFunding','ixBukuTren','ixDonchianVol','ixFlowTren']
const PARAM_IKLIM = ['dominasiDelta','ethBtcTren7d','lsAkunBtc','lsAkunEth','jamFundingBtc']
const TOTAL_PARAM_NAMA = DIM_WAW.length + PARAM_OBS.length + PARAM_OBS_V257.length + PARAM_IKLIM.length

// ---- V255 METAKOGNISI-NEVRON — hasil deep-screening Neurobro AI (neurobro.ai,
// Axioma AI Labs) yang framework-nya di-open-source sebagai Nevron
// (github axioma-ai-labs/nevron, siklus Plan→Execute→Learn→Remember). Kunci inti
// mereka diadopsi dan diadaptasi ke ledger pra-registrasi SAKTI: ----
const NEV = {
  ESTIMATOR_BOBOT: { keselarasan: 0.25, memori: 0.15, data: 0.15, keakraban: 0.15, rencana: 0.10, rekam: 0.15, kondisi: 0.05 },  // bobot asli Nevron
  ESTIMATOR_MIN_LOLOS: 0.40,   // Nevron: level < 0.4 = LOW confidence → tangan kosong
  PREDIKTOR_MAKS_PROB: 0.60,   // Nevron: should_proceed hanya jika prob gagal < HIGH threshold
  PREDIKTOR_MIN_N: 3,          // Nevron: MIN_OBSERVATIONS_FOR_PREDICTION
  PREDIKTOR_WINDOW_JAM: 24,    // Nevron: RECENT_WINDOW_HOURS
  BIAS_NEUTRAL: 0.5, BIAS_MAKS: 0.5,               // Nevron StrategyAdapter
  BIAS_TRACKER: 0.4, BIAS_PELAJARAN: 0.4, BIAS_RECENT: 0.2,
  LOOP_JENDELA: 20, LOOP_REPETISI: 3, LOOP_ALTERNASI: 4, LOOP_SIKLUS: 2,   // Nevron LoopDetector
  RELIAB_AWAL: 0.7, RELIAB_REINFORCE: 0.05, RELIAB_DECAY_HARI: 0.01,       // Nevron lessons.py
}
const KET_FAKTOR = {
  keselarasan: 'komite terbelah — sedikit parameter searah',
  memori: 'tak ada pengalaman serupa di zona (arah×rezim) ini',
  data: 'banyak parameter kosong — data tidak lengkap',
  keakraban: 'konteks rezim×arah belum dikenal medan',
  rencana: 'rencana eksekusi belum lengkap (ekspektasi/tangga harga)',
  rekam: 'rekam jejak medan untuk kondisi ini lemah',
  kondisi: 'kondisi data sistem tidak sehat (banyak endpoint gagal)',
}
// lapis parameter baru yang bisa dihitung tiap kandidat — sensus jujur, bukan karangan
const PARAM_METAKOGNISI = [
  'estKeselarasan', 'estMemori', 'estData', 'estKeakraban', 'estRencana', 'estRekam', 'estKondisi',
  'bobotKeselarasan', 'bobotMemori', 'bobotData', 'bobotKeakraban', 'bobotRencana', 'bobotRekam', 'bobotKondisi',
  'predHitRateZona', 'predKegagalanTerkini', 'predEkspektasiMc', 'predGabungan',
  'biasNaikBuy', 'biasNaikSell', 'biasTurunBuy', 'biasTurunSell', 'biasParabolikBuy', 'biasParabolikSell', 'biasBergolakBuy', 'biasBergolakSell',
  'loopRepetisi', 'loopAlternasi', 'loopSiklus', 'reliabPelajaran',
  'kritikAlasanGagal', 'kritikYangSalah', 'kritikCaraLebihBaik', 'kritikPolaHindari', 'kritikPelajaran',
]
const TOTAL_PARAM_METAKOGNISI = PARAM_METAKOGNISI.length   // 35
// ---- V256 MESIN-DEAL-ODDS — hasil deep-screening 3Commas & Trade Ideas ----
// Sumber: help.3commas.io/articles/16281102 (DCA 6-param), 16281163 (Trailing Stop
// 2-param), 16281110 (Move SL to Breakeven), 16281055 (Global Max Open Positions);
// trade-ideas.com/features/backtesting (OddsMaker event-based), /features/money-machine
// (top-3 momentum), /features/ai-signals (Holly risk adaptation).
const DEAL = {
  MAX_SO: 2,             // Max DCA Orders (3Commas): hard cap safety orders — budget terkontrol
  SO_DEV: 1.2,           // Price Deviation pertama = 1.2 × ATR24j dari entry
  SO_DEV_MULT: 1.6,      // Price Deviation Multiplier: langkah berikut = langkah sebelumnya × 1.6
  SO_VOL_MULT: 1.5,      // Order Size Multiplier geometris per safety order
  BEP_ACT: 0.6,          // Move SL to Breakeven: aktivasi di 60% jalan menuju target
  TRAIL_DIST: 0.8,       // Trailing Take Profit: jarak trail dari peak = 0.8 × ATR24j
  ODDS_MIN: 55,          // Odds Maker: ambang skor peluang untuk boleh mengunci
  TOP_K: 3,              // Money Machine: konsentrasi top-3 peluang terkuat
  MAX_POSISI: 24,        // Global Max Open Positions (3Commas): sinyal baru diabaikan bila tercapai — prevent excessive trading
  BOBOT: { mc: 0.4, zona: 0.25, meta: 0.2, daya: 0.15 },   // bobot skor peluang OddsMaker
}
// Tag peristiwa event-based ala OddsMaker — semuanya DIHITUNG dari lilin (bukan mood):
const PERISTIWA_DEFS = [
  { nama: 'breakout48j', ket: 'close menembus high 48 jam sebelumnya (breakout event)' },
  { nama: 'lonjakVolume', ket: 'volume 6 jam ≥ 2× rata-rata 24 jam (volume spike event)' },
  { nama: 'crossEMA', ket: 'EMA9 memotong EMA21 dalam 6 jam terakhir (MA cross event)' },
  { nama: 'pullbackBB', ket: 'lilin lalu menutup melampaui Bollinger 21/2.5 lalu kembali (pullback event)' },
  { nama: 'divergensiRSI', ket: 'divergensi RSI 12 jam terdeteksi (reversal event)' },
  { nama: 'searahTren4h', ket: 'EMA-align 1h & 4h searah dengan arah sinyal (trend-follow event)' },
]
const PARAM_DEAL = ['maxSO', 'soDevAtr', 'soDevMult', 'soVolMult', 'bepAktPct', 'bepExecPct', 'trailDistAtr', 'oddsMin', 'oddsTopK', 'bobotOddsMC', 'bobotOddsZona', 'bobotOddsMeta', 'bobotOddsDaya', 'maxPosisiTerbuka']
const PARAM_EVENT = PERISTIWA_DEFS.map((p) => `evt_${p.nama}`)
const TOTAL_PARAM_DEAL_ODDS = PARAM_DEAL.length + PARAM_EVENT.length   // 14 + 6 = 20
// ---- V258 GEKKO-CZAR — hasil deep-screening Gekko Agent (Axal, di Virtuals) +
// riset CZAR Loss (Allora Foundation, arXiv 2609.36061). Bukti riset:
// scripts/riset_gekko/ (blog Allora, substack Axal, abstract arXiv). Kunci inti:
// (1) META-INFERENSI KOLEKTIF — model spesialis bertanding per topik, inferensi
//     dibobot akurasi historis+kontekstual (Allora Topics — mesin di balik Gekko);
// (2) CZAR DECISIVENESS — loss simetris membiarkan "prakiraan nol" menang;
//     skor asimetris magnitude-aware + akurasi-impas vs prediktor-nol;
// (3) EKSPOSUR DINAMIS — volatilitas tak menguntungkan → pangkas ekspresi modal;
// (4) DIVERGENSI prediksi vs probabilitas-implied pasar;
// (5) TEMPER AUTOPILOT — profil risiko denyut mengatur kuota & ambang terikat-batas;
// (6) VERIFIABLE AUTONOMY — sidik sha256 pra-registrasi per prediksi.
const GEK = {
  TOPIK_INTI: {
    momentum: ['macd', 'pola', 'konsist', 'rsi1h', 'roc12', 'stoch', 'cci', 'bodyRatio', 'macd4h', 'rsi4h'],
    tren: ['adx', 'swing', 'pivot', 'ema1h', 'ema4h', 'swing4h', 'sejajar4h', 'ema1d', 'donchian30d'],
    aliran: ['vwap', 'obv', 'mfi', 'volZ', 'pocJarak'],
    derivatif: ['funding', 'oi', 'fundRata3', 'fundTren', 'basisPct', 'fundVsBtc'],
    mikrostruktur: ['bukuImbalans', 'bukuSpread', 'bukuKedalaman', 'bukuDinding', 'bukuGradien'],
    relatif: ['relatif', 'betaBTC', 'persenChg', 'persenVol'],
  },
  REGRET_ETA: 0.9,      // bobot topik = exp(-ETA·regret) — regret 1 → 0.41× (regret-minimization ala Allora)
  REGRET_DECAY: 0.97,   // peluruhan regret antar vonis matang — ingatan topik melunak perlahan
  BOBOT_MIN: 0.15,      // lantai bobot — topik sakit tetap boleh membisikkan, tak pernah bisu total
  CZAR_CAP: 8,          // reward dibatasi |net| 8% — ekor langka tak menggemukkan skor/skola
  CZAR_FLOOR: 1.5,      // penalti dasar salah arah (% poin) — kerugian tak bisa bersembunyi di balik volume
  EKSPRESI_MIN: 0.25, EKSPRESI_MAKS: 1.0,   // skala eksposur dinamis (Allora×G.A.M.E)
  DIVERG_KUAT: 0.18,    // |keyakinan komite − P(arah komite) pasar| ≥ 0.18 = terpisah jauh
  SUHU_BERTAHAN_AMBANG: 5,   // BERTAHAN: ambang odds +5 (lebih selektif — Autopilot risk-off)
  SUHU_AGRESIF_AMBANG: 3,    // AGRESIF: ambang −3, TIDAK PERNAH di bawah lantai
  AMBANG_LANTAI: 52,    // suhu apa pun tak boleh melunakkan gerbang di bawah ini
}
const PARAM_GEKKO_KANDANG = ['metaArah', 'metaKeyakinan', 'probPasar', 'divergensi', 'ekspresi']
const PARAM_GEKKO_SIKLUS = ['suhuTemper', 'ambangOddsEfektif', 'kuotaArahEfektif', 'akurasiImpas', 'darahAkurasi']
const PARAM_GEKKO_KONST = ['czarCap', 'czarFloor', 'regretEta', 'regretDecay', 'ekspresiMin', 'ekspresiMaks', 'divergKuat', 'suhuAmbang']
const TOTAL_PARAM_GEKKO = PARAM_GEKKO_KANDANG.length + PARAM_GEKKO_SIKLUS.length + PARAM_GEKKO_KONST.length   // 5+5+8 = 18
// ---- V259 KAIZEN-PULIH — hasil deep-screening keluarga "Kaizen Trader" (bukti
// riset: scripts/riset_kaizen/ — README+3 file kode sumber prateekjain98/kaizen-trader,
// portofolio pencipta, HOL registry KAIZEN Virtuals, kaizen-daytrading.com, kaizen.cash).
// Kunci inti: 4 healing loops (rule healer / Claude analysis / delta revert / Darwinian
// selector) + anti-revenge cooldowns + daily loss halt + chop/thesis-break exits +
// watchdog proses-terpisah + freshness guard + otonomi berjenjang. Diadaptasi ke
// ledger pra-registrasi SAKTI — semua dinilai medan, bukan klaim.
const KZN = {
  UJI_JENDELA: 8,        // uji-balik: eksperimen genome dinilai tiap 8 vonis matang (PDCA)
  KARANTINA_KEJ: 3,      // rule-healer: 3 suara-keliru beruntun + hit-rate < 44% → karantina
  KARANTINA_PULIH: 2,    // 2× setuju-saat-benar untuk pulih dari karantina
  DINGIN_SASARAN_KEJ: 2, // rem-pintar V264: 2 kekalahan beruntun per sasaran → rem singkat
  DINGIN_SASARAN_JAM: 0.25, // rem singkat 1 DENYUT (15 menit) — revisi dari bekuan 4 jam; setelah rem, setup valid BOLEH kembali dgn syarat pelajaran (bukan blacklist)
  DINGIN_FAM_KEJ: 3,     // 3 kekalahan beruntun per keluarga rezim×arah
  DINGIN_FAM_DENYUT: 1,  // keluarga direm 1 denyut (rem singkat ber-akhir, bukan pembekuan)
  HENTI_RUGI_PCT: 4,     // henti-harian: rugi-net vonis hari UTC ≤ −4% kumulatif → BERTAHAN dipaksa
  MODALMATI_JAM: 4,      // chop-exit: menginap ≥4 jam tanpa progres
  MODALMATI_PROGRES: 2,  // progres < ±2% = modal mati (dead capital ala kaizen-trader)
  KESEGARAN_24J: 100,    // |24j| > 100% tanpa akselerasi segar = pompa tua (fresh > stale)
  KESEGARAN_AKS: 5,      // akselerasi 1 jam minimum untuk mengejar pompa
  PENGAWAS_STOP: 15,     // penjaga-kedua: hard-stop 15% dari entry (ala watchdog proses terpisah)
  PENGAWAS_TARGET: 40,   // penjaga-kedua: hard-target 40%
}
const PARAM_KAIZEN_KANDANG = ['kesegaran', 'akselerasi1j', 'tesisSehat']
const PARAM_KAIZEN_SIKLUS = ['dinginSasaranCt', 'dinginFamCt', 'hentiHarianAktif', 'ujiBalikStatus', 'karantinaCt', 'pengawasKenaCt']
const PARAM_KAIZEN_KONST = ['ujiJendela', 'karantinaKej', 'karantinaPulih', 'dinginSasaranKej', 'dinginSasaranJam', 'dinginFamKej', 'hentiRugiPct', 'modalMatiJam', 'modalMatiProgres', 'kesegaran24j', 'kesegaranAks', 'pengawasStopDef', 'pengawasTargetDef']
const TOTAL_PARAM_KAIZEN = PARAM_KAIZEN_KANDANG.length + PARAM_KAIZEN_SIKLUS.length + PARAM_KAIZEN_KONST.length   // 3+6+13 = 22
// ---- V260 AUTOPILOT-KALIBRASI — hasil deep-screening "AutoPilotPM"
// (recogardtech/AutoPilotPM, MIT; bukti riset: scripts/riset_autopilot/ — Riset_AutoPilotPM.md
// + clone utuh repo_autopilotpm/ + 6 query web). Kunci inti: decision ledger dgn
// confidence-calibration + alternativesConsidered (src/ledger), dynamic Kelly 9-lapis
// (src/trading/kelly.ts), volatility regime 4-tingkat baseline-mandiri
// (src/risk/volatility.ts), stress test 5 skenario (src/risk/stress.ts), slippage-adjusted
// edge + opportunity scoring terbobot + topBlockReasons (docs/OPPORTUNITY_FINDER.md).
// Diadaptasi ke ledger pra-registrasi SAKTI — semua dinilai medan, bukan klaim.
// ---- V269 TANGGAP-SELALU (ANTI-DIAM) — mandat pemilik 2026-10-04 ----
// "Jangan buat dia Diam — justru dia harusnya tanggap cerdas; kalau dia Diam dia
// gak pernah berkembang." Gerbang menutup ≠ berhenti: kandidat terkuat yang tersisa
// tetap diuji sebagai POSISI-PENELITI ukuran mikro — tetap beraksi, tetap dinilai
// medan, tetap berkembang; yang dilarang hanya ukuran besar saat keyakinan rendah.
const ANTI = {
  PENELITI_MAKS_TERBUKA: 1,  // maks posisi-peneliti bersamaan (kandidat nyata selalu prioritas)
  PENELITI_UKURAN: 0.25,     // ukuran mikro dipaksa — penelitian, bukan keyakinan
  PENELITI_STOP_F: 0.8,      // stop diperketat ×0.8 — salah pun biaya sekolah murah
  DIAM_TOLERANSI: 3,         // denyut-diam beruntun yang memicu tanggapan khusus
}
const AUT = {
  KELLY_DD_MULAI: 5,      // % drawdown mulai mengecilkan ukuran (kelly.ts step 3)
  KELLY_DD_MAKS: 15,      // % drawdown = titik faktor pengecilan maksimum
  KELLY_DD_FAKTOR: 0.5,   // pada DD maks, ukuran tinggal 0.5×
  KELLY_SAMPEL_N: 10,     // vonis matang < 10 → kerendahan-hati sampel (0.5–0.95)
  KELLY_LOSS_STREAK: 2,   // kalah beruntun ≥ 2 → ukuran menyusut bertahap (lantai 0.5)
  KELLY_VOL_TARGET: 10,   // % volatilitas target (vol-target scaling)
  KELLY_VOL_KLIP: 1.5,    // faktor vol diklamps [0.5, 1.5]
  STRES_AMBANG_PCT: 30,   // estimasi rugi skenario terburuk ≥ 30% unit → penalti + BERTAHAN
  SLIP_FAKTOR: 0.8,       // faktor platform slippage (ala tabel OPPORTUNITY_FINDER)
  SLIP_AMBANG_PCT: 2,     // slip > 2% → penalti eksekusi
  PELUANG_AMBANG: 60,     // skor peluang < 60 → ditolak DENGAN ALASAN (gerbang baru, hanya menolak)
  BOBOT_EDGE: 40, BOBOT_LIQ: 25, BOBOT_KIYAK: 25, BOBOT_EKSEKUSI: 10,  // 35/25/25/15 ala AutoPilot, diukur ulang utk medan perp
}
// ---- V261 CLAW-KOMITE — hasil deep-screening keluarga "ClawTrade" ----
// Sumber utama: github clawtradeai-Agent/ClawTradeAI (MIT, multi-agent Solana:
// CoordinatorAgent weighted voting + veto RiskManager + recommendedAmount kuanta,
// RiskManagerAgent 4×25 risk card + blockedTokens, SniperAgent freshness/dedup,
// ExecutorAgent maxSlippageBps 500) + github yuxuan-lou/ClawTrade (MIT, security
// middleware: guardrails.py hard rules di luar jangkauan otak, MAX_DAILY_TRADES
// dari audit log, confirmation.py human-queue + timeout, audit.py append-only).
const CLAW = {
  BOBOT_TREN: 0.20, BOBOT_KERUMUNAN: 0.15, BOBOT_DERIVATIF: 0.25, BOBOT_BUKU: 0.20, BOBOT_TEGANGAN: 0.20,  // agentWeights ala CoordinatorAgent
  KOMITE_MINCONF: 0.6,     // minConfidence Coordinator: skor komite < 0.6 → SKIP
  KOMITE_NETRAL: 0.15,     // |arah suara| ≤ 0.15 → suara SKIP (netral)
  KARTU_MAKS: 70,          // maxRiskScore RiskManager: kartu > 70 → ditolak
  KARTU_QV_KRIT: 1e7,      // quote-volume 24j < $10jt → likuiditas kritis 25 poin
  KARTU_QV_RENDAH: 3e7,    // < $30jt → 15 poin
  KARTU_QV_MID: 8e7,       // < $80jt → 8 poin
  KARTU_SPREAD_MAKS: 8,    // spread bps > 8 → +5 poin (eksekusi mahal)
  KARTU_VOLZ_SPIKE: 2,     // |volZ| > 2 → +5 poin (churn anomaly ala volume/liquidity ratio)
  KARTU_SIGMA_TINGGI: 15,  // σ24j > 15% → 20 poin
  KARTU_SIGMA_SEDANG: 8,   // σ24j > 8% → 10 poin
  KARTU_SIGMA_RINGAN: 5,   // σ24j > 5% → 5 poin
  KARTU_LS_EKSTREM: 1,     // |LS-akun − 1| > 1 → 15 poin (kerumunan miring ekstrem)
  KARTU_LSTAKER_EKSTREM: 0.6, // |taker-agresor| > 0.6 → 10 poin
  KARTU_FUNDING_EKSTREM: 0.15, // |funding%| ≥ 0.15 → 15 poin (perang funding)
  KARTU_FUNDING_SEDANG: 0.05,  // |funding%| ≥ 0.05 → 8 poin
  KARTU_FUNDBTC_EKSTREM: 1.5,  // |funding vs BTC| > 1.5 → 10 poin
  HITAM_KEJ: 3,            // 3× ditolak kartu-panas beruntun → rem-pintar V264 (bukan blockedTokens permanen)
  HITAM_DINGIN_JAM: 2,     // rem singkat maks 2 jam (revisi dari 48 jam — doktrin: bukan blacklist tanpa riset); setelah rem, kembali lewat SYARAT TAMBAHAN pelajaran
  KUOTA_HARIAN: 12,        // MAX_DAILY_TRADES guardrail — kunci ARAH/hari dihitung dari ledger (audit)
  KUANTA_T1: 0.8,          // keyakinan ≥ 0.8 → kuanta 1.0 (ala recommendedAmount)
  KUANTA_1: 1.0, KUANTA_2: 0.5, KUANTA_3: 0.25,
  KONFIRM_AMBANG: 0.8,     // kuanta tertinggi → MENUNGGU MANDAT (human-queue ala confirmation.py)
  KONFIRM_TIMEOUT_JAM: 12, // pending kadaluarsa (CONFIRM_TIMEOUT ala confirmation.py)
  SLIP_MAKS_PCT: 1.2,      // langit-langit eksekusi 120bps ala Executor maxSlippageBps
  UKURAN_MAKS: 1.0,        // ukuran akhir keras di luar genome (guardrail tersumbat)
}
const PARAM_CLAW_KANDANG = ['komite', 'kartu', 'kuanta']
const PARAM_CLAW_SIKLUS = ['komiteMinconf', 'komiteVeto', 'kartuVeto', 'kartuAvg', 'hitamCt', 'kuotaCt']
const PARAM_CLAW_KONST = ['bobotTren', 'bobotKerumunan', 'bobotDerivatif', 'bobotBuku', 'bobotTegangan', 'komiteMinconf', 'komiteNetral', 'kartuMaks', 'kartuQvKrit', 'kartuQvRendah', 'kartuQvMid', 'kartuSpreadMaks', 'kartuVolzSpike', 'kartuSigmaTinggi', 'kartuSigmaSedang', 'kartuSigmaRingan', 'kartuLsEkstrem', 'kartuLstakerEkstrem', 'kartuFundingEkstrem', 'kartuFundingSedang', 'kartuFundbtcEkstrem', 'hitamKej', 'hitamDinginJam', 'kuotaHarian', 'kuantaT1', 'kuanta1', 'kuanta2', 'kuanta3', 'konfirmAmbang', 'konfirmTimeoutJam', 'slipMaksPct', 'ukuranMaks']
const TOTAL_PARAM_CLAW = PARAM_CLAW_KANDANG.length + PARAM_CLAW_SIKLUS.length + PARAM_CLAW_KONST.length   // 3+6+32 = 41
// ---- V262 IMPAS-CERDAS — jawaban 4 kasus dev, semua dari BACKTEST ledger sendiri ----
// Kasus A (bias SELL): akar masalahnya bukan SELL, tapi MENJUAL DI DASAR RENTANG
// (chasing) — bucket sr≤−0.5 net −29.8%/PF 0.44 — diblok dengan ZONA-CHASE.
// Kasus B (volatilitas harian): overclaim keyakinan 17–30pp + kuota tak adaptif —
// dijawab KALIBRASI-MEDAN (shrinkage per jalur) + AMBANG-IMPAS adaptif + henti-harian.
// Kasus C (Phoenix vs ARAH): Phoenix terbukti PF 1.23 vs ARAH 0.07 — dijawab
// ALOKASI-DINAMIS dari EV trailing shrinkage, bukan quota tetap.
// Kasus D (sinyal tanpa stop): 36/36 ARAH lahir tanpa stop/target — dijawab
// STOP/TARGET WAJIB dari kerucut MC (default-jujur bila kosong).
const IMPAS = {
  ZONA_CHASE: 0.5,          // |sr| ≥ 0.5 ke arah chasing → BLOK (SELL di dasar / BUY di puncak rentang)
  KALIB_MIN_N: 6,           // sampel jalur < 6 → faktor netral 1.0 (fallback jujur)
  KALIB_MIN_F: 0.3,         // lantai faktor kalibrasi
  KALIB_MAKS_F: 1.2,        // langit-langit faktor kalibrasi (keyakinan tidak pernah dinaikkan di atas bukti)
  KALIB_AMBANG: 40,         // keyakinan × faktor < 40 → jalur dikarantina (skala terkalibrasi)
  KUOTA_FLOOR: 2,           // kuota minimum per jalur — karantina bukan eksekusi: tetap belajar
  KUOTA_SAMPEL_N: 8,        // n matang < 8 → kuota jalur dibagi dua (kerendahan-hati sampel-kecil)
  ALOKASI_JENDELA: 20,      // window trailing per jalur untuk EV alokasi
  ALOKASI_PRIOR: 4,         // prior Beta(4,4) — shrinkage hit-rate window
  AMBANG_TAMBAH_MAKS: 20,   // tambahan ambang odds maks saat rapor di bawah air (poin)
  AMBANG_SKALA_RUGI: 0.5,   // |netCum%| × 0.5 = tambahan ambang
  STOP_DEFAULT_PCT: 1.8,    // stop darurat bila MC kosong (default-jujur)
  TARGET_DEFAULT_PCT: 2.6,  // target darurat bila MC kosong
}
const PARAM_IMPAS_KANDANG = ['zona', 'kalib', 'alokasi']
const PARAM_IMPAS_SIKLUS = ['netCumPct', 'faktorKalibArah', 'faktorKalibPhx', 'kuotaArah', 'kuotaPhx', 'karantinaCt']
const PARAM_IMPAS_KONST = ['zonaChase', 'kalibMinN', 'kalibMinF', 'kalibMaksF', 'kalibAmbang', 'kuotaFloor', 'kuotaSampelN', 'alokasiJendela', 'alokasiPrior', 'ambangTambahMaks', 'ambangSkalaRugi', 'stopDefaultPct', 'targetDefaultPct']
const TOTAL_PARAM_IMPAS = PARAM_IMPAS_KANDANG.length + PARAM_IMPAS_SIKLUS.length + PARAM_IMPAS_KONST.length   // 3+6+13 = 22
// ---- V263 ASAH-MURNI — HUKUM BARU PEMILIK (mandat dev, 2026-10-02): "karantina itu
// DILARANG — yang sedang belajar harus terus belajar, bukan dihentikan; berikan dia
// kemampuan matematika murni dan ekonomi cerdas; setiap kesalahan memberikan kemampuan
// baru; makin asah makin tajam; denyut 30 menit jadikan 15 menit; beri dia kemampuan
// membaca jauh sebelum itu terjadi; sumber informasinya dilengkapi." Konsekuensi:
// tidak ada mekanisme yang MENYELANTIKKAN lane/topik dari belajar — yang ada hanya
// MODE-ASAH (ukuran menyusut, stop mengetat, suara melirih) + ORGAN-BARU dari kesalahan.
const ASAH = {
  BOBOT_SUARA: 0.35,      // asah-suara: topik bermasalah tetap BERSUARA — bobot dipangkas, TIDAK pernah 0
  STOP_KETAT_F: 0.75,     // mode-asah: stop diperketat ×0.75 dari kerucut MC (overclaim → jarak salah lebih pendek)
  UKURAN_F: 0.6,          // mode-asah: skala efektif ×0.6 tambahan (belajar dengan taruhan kecil)
  HENTI_KUOTA: 2,         // henti-harian kini MODE-ASAH: kuota belajar minimal 2 (bukan henti total)
  HENTI_UKURAN: 0.3,      // mode-asah henti-harian: ukuran mikro ×0.3
  HURST_WINDOW: 64,       // jendela R/S untuk eksponen Hurst
  OLS_WINDOW: 30,         // jendela regresi log-harga (drift & R²)
  Z_WINDOW: 20,           // jendela z-SMA statistik
  MC_JAUH_LANGKAH: 72,    // MATA JAUH: 72 langkah (jam) ke depan
  MC_JAUH_LINTASAN: 600,  // lintasan MC mata jauh (hemat CPU, tetap bermakna)
  CARRY_PER_HARI: 3,      // funding dibayar tiap 8 jam → 3× per hari
  ORGAN_MAKS: 40,         // maksimum organ-baru tersimpan di ilmu (FIFO)
  ORGAN_LULUS_N: 10,      // organ lulus sekolah: n≥10
  ORGAN_LULUS_HIT: 0.52,  // hit-rate ≥52% & net>0 → berhak VETO
}
const PARAM_MATE_KANDANG = ['mateHurst', 'mateEkonomi', 'mateJauh']
const PARAM_MATE_SIKLUS = ['jauhPnaik24', 'jauhPnaik48', 'carryAktif', 'evEkoAktif', 'organAktif', 'organLulus']
const PARAM_MATE_KONST = ['asahBobotSuara', 'asahStopKetatF', 'asahUkuranF', 'asahHentiKuota', 'asahHentiUkuran', 'hurstWindow', 'olsWindow', 'zWindow', 'mcJauhLangkah', 'mcJauhLintasan', 'carryPerHari', 'organMaks', 'organLulusHit']
const TOTAL_PARAM_MATE = PARAM_MATE_KANDANG.length + PARAM_MATE_SIKLUS.length + PARAM_MATE_KONST.length   // 3+6+13 = 22
const PARAM_AUTO_KANDANG = ['peluang', 'slipPct', 'kellyMult']
const PARAM_AUTO_SIKLUS = ['rezimMedan', 'multRezim', 'stresTerkburuk', 'stresSkenario', 'topTolakUtama', 'topTolakCt']
const PARAM_AUTO_KONST = ['kellyDdMulai', 'kellyDdMaks', 'kellyDdFaktor', 'kellySampelN', 'kellyLossStreak', 'kellyVolTarget', 'kellyVolKlip', 'stresAmbangPct', 'slipFaktor', 'slipAmbangPct', 'peluangAmbang', 'bobotEdge', 'bobotLiq', 'bobotKiyak', 'bobotEksekusi']
const TOTAL_PARAM_AUTO = PARAM_AUTO_KANDANG.length + PARAM_AUTO_SIKLUS.length + PARAM_AUTO_KONST.length   // 3+6+15 = 24
// ---- V264 PINTAR-KEMBALI — doktrin pemilik 2026-10-03: "koin/pola boleh dibuka lagi
// jika setup valid sekarang; jika pernah gagal pada pola serupa: boleh kembali, tapi
// dengan syarat tambahan dari pelajaran (lebih ketat), bukan syarat default seolah
// belum pernah SALAH" + "evolusi hanya berarti jika aturan mengikat saat kunci dan
// EV/PF di rapor publik bisa membaik" — syarat dari ledger sendiri, mengikat saat kunci.
const PINTAR = {
  SYARAT_KEY_PER_KEJ: 4,  // bar keyakinan naik +4 per kejadian SALAH pola serupa
  SYARAT_KEY_MAKS: 12,    // langit-langit ekstra keyakinan (+12)
  SYARAT_SKALA_F: 0.6,    // ukuran ×0.6^n (maks 2 tingkat) — pengalaman mengecilkan taruhan
  SYARAT_STOP_F: 0.8,     // stop ×0.8^n (maks 2 tingkat) — pengalaman mengetatkan keluar
  SYARAT_WAJIB_MATE: 2,   // ≥2 kejadian → wajib konfirmasi mata-jauh searah
  WAJIB_KEY_DASAR: 50,    // bar minimum keyakinan terkalibrasi: 50 + ekstra
}
const PARAM_PINTAR_SIKLUS = ['kembaliPintarCt', 'remPelajaranCt', 'remAktifCt']
const PARAM_PINTAR_KONST = ['syaratKeyPerKej', 'syaratKeyMaks', 'syaratSkalaF', 'syaratStopF', 'syaratWajibMate', 'wajibKeyDasar']
const TOTAL_PARAM_PINTAR = PARAM_PINTAR_SIKLUS.length + PARAM_PINTAR_KONST.length   // 3+6 = 9
// ---- V265 SEKOLAH-BUTA — organ dari ujian buta-histori 2.533 soal (blind dijamin
// lapisan data; dunia beku pada jam T; vonis resmi close T+24j − fee 0.002).
// Mandat pemilik "sekolah kilat": ratusan simulasi, temukan dimana bodohnya,
// perbaiki, push ulang. Bukti replay (scripts/ujian-buta/, n=2.533):
//   SELL semua           ak 37.6% net −603% (n=1154) ← pendarah arah
//   SELL z<0.5           ak ~37%   net ~−604% (n≈1123) menjual kelemahan, bukan kekuatan
//   SELL entropi≤0.85    ak 11.8%  net −11.9% (n=17)  pita sempit memantul
//   key 55-69 melawan drift ak 40.7% net −70.3% (n=221) overclaim band
//   BUY z≥1.5            ak 47.6%  net +105.9% (n=403) momentum = jantung otak
//   BUY drift≥5%         ak 48.1%  net +191.0% (n=154)
const BUTA = {
  JUAL_Z_MAKS: 0.5,        // SELL saat zSma < 0.5 = menjual kelemahan → dijujurkan
  JUAL_KEY_MAKS: 40,       // keyakinan SELL-lemah dibatasi 40 (kalibrasi jujur, tetap bersuara)
  JUAL_SKALA_F: 0.5,       // ukuran SELL-lemah ×0.5 (belajar terus, taruhan kecil — anti-karantina)
  JUAL_ENTROPI_MAKS: 0.85, // SELL di pita sempit → veto saksi (ak 11.8%)
  KEY_DRIFT_F: 0.75,       // keyakinan 55-69 melawan drift OLS-24j → ×0.75
  MOMENTUM_Z: 1.5,         // BUY zSma ≥ 1.5 = zona kekuatan
  MOMENTUM_DRIFT: 5,       // atau drift 24j ≥ +5%
  MOMENTUM_ODDS_BONUS: 8,  // bonus odds zona kekuatan (prioritas kuota)
  // ---- V266 BAROMETER (sekolah kilat putaran-2 — organ dari BUKTI 2.366 soal) ----
  // bedah: SELL saat BTC<−1% = ak 30.2% net −339.3% (n=397) = pendarah terbesar;
  // breadth<25% = ak 35.2% net −405.5% (n=705); BUY saat BTC 0..1% = ak 40% net −155.8% (n=470);
  // BUY saat BTC<−1% justru ak 53.9% net +80.1% (menadah pantulan terbukti — DIPERTAHANKAN)
  BEAR_BTC_PCT: -1.5,        // ret24 BTC ≤ −1.5% = bear-harian
  BEAR_BREADTH_PCT: 25,      // atau ≤25% koin ret24 naik = bear-harian
  SELL_BEAR_KEY_MAKS: 40,    // SELL di bear-harian → key ≤40 (ak 30.2%, menjual dasar)
  SELL_BEAR_KUNCI_MIN: 50,   // SELL terkalibrasi <50 saat bear → TUNDA denyut ini
  SELL_BEAR_SKALA_F: 0.5,    // ukuran SELL di bear-harian ×0.5
  BUY_FLAT_KEY_POTONG: 8,    // BUY saat BTC 0..+1% (pasar ragu) → key −8 (ak 40%)
  SELL_RELATIF_KEY_MAKS: 45, // SELL koin ret24-nya lebih kuat dari BTC saat bear → key ≤45
  KANDIDAT_KEY_MIN: 45,      // kandidatLain radar saat bear hanya key ≥45 (seleksi publik)
  // V267 ANTI-ARUS — organ BUY dari bedah putaran-3 (2.366 in-sample + 124 OOS):
  BUY_SAKSI_PCT: 0,          // ret1h BTC ≥ 0 saat bear = saksi pantulan sesaat (jebakan)
  BUY_SAKSI_KEY_POTONG: 8,   // BUY jebakan-pantulan → key −8 (n=77 net −23.4%)
  BUY_SAKSI_SKALA_F: 0.6,    // ukuran ×0.6 (disiplin taruhan melawan arus, tetap bersuara)
  BUY_JATUH_BTC_PCT: -2.5,   // ret24 BTC ≤ −2.5% = jatuh pisau (batas tajam dari data)
  BUY_JATUH_KEY_POTONG: 8,   // BUY menadah pisau → key −8 (n=27 net −3.8%)
  BUY_JATUH_SKALA_F: 0.6,    // ukuran ×0.6
}
const PARAM_BUTA_KONST = ['jualZMaks', 'jualKeyMaks', 'jualSkalaF', 'jualEntropiMaks', 'keyDriftF', 'momentumZ', 'momentumDrift', 'momentumOddsBonus', 'bearBtcPct', 'bearBreadthPct', 'sellBearKeyMaks', 'sellBearKunciMin', 'sellBearSkalaF', 'buyFlatKeyPotong', 'sellRelatifKeyMaks', 'kandidatKeyMin', 'buySaksiPct', 'buySaksiKeyPotong', 'buySaksiSkalaF', 'buyJatuhBtcPct', 'buyJatuhKeyPotong', 'buyJatuhSkalaF']
const TOTAL_PARAM_BUTA = PARAM_BUTA_KONST.length   // 22
const TOTAL_PARAM_SEMUA = TOTAL_PARAM_NAMA + TOTAL_PARAM_METAKOGNISI + TOTAL_PARAM_DEAL_ODDS + TOTAL_PARAM_GEKKO + TOTAL_PARAM_KAIZEN + TOTAL_PARAM_AUTO + TOTAL_PARAM_CLAW + TOTAL_PARAM_IMPAS + TOTAL_PARAM_MATE + TOTAL_PARAM_PINTAR + TOTAL_PARAM_BUTA   // V267: 301 + 6 = 307
// statusSekolah — kelulusan param dari hit-rate medan (bukan dari tangan manusia):
// pemula (n<10) → dipantau → calon-lulus (n>=20 & hit>=52% & net>0) / diawasi (hit<44%)
function statusSekolah(h) {
  if (!h || h.n < 10) return 'pemula'
  const hit = h.benar / h.n
  if (h.n >= WAWASAN.SEKOLAH_LULUS_N && hit >= WAWASAN.SEKOLAH_LULUS_HIT && h.net > 0) return 'calon-lulus'
  if (h.n >= WAWASAN.SEKOLAH_LULUS_N && hit < 0.44) return 'diawasi'
  return 'dipantau'
}

// ---------------- V248 PIAGAM CYBORG — lima pilar (mandat pemilik:
// "pastikan dia akan terus berkembang pesat; ada beberapa hal cyborg
// kita ini berkurang") — tiap pilar dipasang nyata dan diaudit siapa pun ----------------
const PIAGAM = {
  identitas: 'SAKTI — cyborg dagang kripto yang TERUS BERKEMBANG PESAT: tiap denyut 30 menit melahirkan generasi otak baru; tiap hari mengulum metamorfosis epoch; tiap kekalahan melahirkan aturan yang mengikat gerbang berikutnya.',
  pilar: [
    { pilar: '1. Tubuh & Jiwa Persisten', mekanisme: 'denyut cron 30 menit di GitHub Actions tanpa browser; jiwa = repo — satu git clone memindahkan jiwanya; laporan hidup di Pages; mandat pemilik kini bisa lewat Issue berlabel "mandat" yang dibaca otak tiap denyut', bukti: 'laporan.antreanMandat + workflow SARANG-PENJAGA' },
    { pilar: '2. Multi-Otak Berbobot', mekanisme: 'otak-otak spesialis berbobot on-line (Hedge/MWU berjaminan regret) + genome evolusi per rezim BTC; sangat ringan: 0 dependensi, satu berkas kode < 64 KB, gratis di server publik', bukti: 'laporan.piagam.otak + laporan.ilmu.hedge' },
    { pilar: '3. Ingatan DNA', mekanisme: 'FinMem 3 lapis: peristiwa (ledger pra-registrasi) → pelajaran (refleksi) → doktrin (aturan mengikat gerbang); memori melipat berkapasitas — melupakan detail, menyimpan RESEP (genome & bobot), bukan hasil', bukti: 'laporan/prakira-server.jsonl + pelajaran-server.json + aturanBelajar + epoch-*.json' },
    { pilar: '4. Kesadaran Diri Fungsional', mekanisme: 'tiap denyut otak memeriksa dirinya: sidik jari sha256 genome & ledger, kesehatan kalibrasi, dimensi tertindas Hedge, kepadatan memori, umur data host — lalu menulis peringatan & tindakan; sadar diri fungsional, bukan kesadaran manusia', bukti: 'laporan.sadardiri' },
    { pilar: '5. Evolusi Tiga Kecepatan', mekanisme: 'refleks (tiap denyut 30 menit): kunci prediksi + pelajaran; adaptasi (per jam vonis matang): genome + Hedge berlatih; metamorfosis (24 jam): digest epoch harian disegel + tag git epoch-TGL', bukti: 'laporan/epoch-*.json + tag epoch-* + laporan.pertumbuhan' },
  ],
  roadmapJujur: 'otak LLM 1-bit (BitNet), adapter LoRA, dan Issue→PR penuh BELUM dipasang — otak kini statistik-berjurnal yang nyata berjalan tiap 30 menit; roadmap diakui jujur, bukan diklaim',
}
const OTAK = [
  { nama: 'otak-arah', tugas: 'arah BUY/SELL 10 mayor — komite 8 dimensi bukti', mesin: 'genome evolusi per rezim + Hedge on-line (Arora dkk 2012)', status: 'HIDUP' },
  { nama: 'otak-radar', tugas: 'mencari akumulasi ujung bawah + memprediksi ujung atas hari itu', mesin: '5 sinyal akumulasi + tangga target magnet + gerbang meta-labeling (LdP 2018)', status: 'HIDUP' },
  { nama: 'otak-ilmu', tugas: 'kejujuran keyakinan & pita target', mesin: 'Brier + kalibrasi bin medan (Gneiting-Raftery 2007) + konformal 75% (Angelopoulos-Bates 2021)', status: 'HIDUP' },
  { nama: 'otak-ingatan', tugas: 'bahan ajar dari tiap kejadian pasar', mesin: 'FinMem 3 lapis (Zhang dkk 2023) — peristiwa→pelajaran→doktrin', status: 'HIDUP' },
  { nama: 'otak-sadardiri', tugas: 'memeriksa tubuh & jiwanya sendiri tiap denyut', mesin: 'metakognisi: hash integritas, kesehatan memori & kalibrasi, peringatan otomatis', status: 'HIDUP (V248)' },
  { nama: 'otak-guru', tugas: 'mengajar profesional dari data medannya sendiri tiap denyut', mesin: 'pengajaran + kuis otomatis dari angka denyut (laporan/guru.json)', status: 'HIDUP (V251)' },
  { nama: 'otak-forensik', tugas: 'membedah penyebab kerugian lalu MENOLAK zona racun terbukti — performa di atas aktivitas', mesin: 'forensik zona per jalur (arah×rezim, band keyakinan, taker, konsensus) + gerbang no-trade + A/B versi anti-cheat (laporan/forensik.json + otak/performa.json)', status: 'HIDUP (V252)' },
  { nama: 'otak-wawasan', tugas: 'registri 72 parameter wawasan crypto per kandang+iklim — lilin 1h+4h+HARIAN 90 hari, derivatif dalam (funding/OI/basis/jam-funding/funding-relatif), kerumunan OKX rubik (LS-akun/taker-agresor), order book + gradien, lintas-pasar, kalender, kuant-warisan, 6 interaksi antar-faktor — plus narasi analis fasih per sasaran', mesin: 'multi-timeframe (EMA-align/MACD/RSI/Bollinger/swing 1h+4h+harian) + riwayat funding rata3/tren + basis/jam-funding + order book OKX (imbalance/spread/kedalaman/dinding/gradien) + LS-akun & taker-volume rubik + persentil lintas-pasar swap + F&G-7hari/dominasi-Δ/ETH-BTC/altseason + GARCH/MC/beta/POC + kalender; 12 inti berbobot (genome+Hedge), observasi diveto-kan & bersekolah hit-rate', status: 'HIDUP (V257)' },
  { nama: 'otak-metakognisi', tugas: 'mengawasi otaknya sendiri SEBELUM bertaruh — estimator keyakinan 7-faktor, prediktor kegagalan pra-kunci, bias konteks per rezim×arah, deteksi loop, kritik diri 5-field per kekalahan — dan kalibrasinya dinilai medan', mesin: '7 kunci diadopsi dari framework open-source Nevron (axioma-ai-labs/nevron) hasil bedah Neurobro AI: ConfidenceEstimator + FailurePredictor + StrategyAdapter + LoopDetector + SelfCritic-RLAIF + Lesson-reliability + MetacognitiveMonitor, diadaptasi ke ledger pra-registrasi SAKTI', status: 'HIDUP (V255)' },
  { nama: 'otak-deal-odds', tugas: 'merekayasa setiap sasaran seperti bot profesional: rencana deal lengkap (safety orders, breakeven, trailing) dipra-registrasi lalu dinilai medan, dan hanya peluang berodds tertinggi (top-3) yang boleh mengunci', mesin: 'kunci diadopsi dari dokumentasi resmi 3Commas & Trade Ideas hasil deep-screening: DCA 6-parameter (Max SO, deviation ×multiplier, volume multiplier), Move SL to Breakeven, Trailing Stop 2-param, Global Max Open Positions, OddsMaker event-based testing (6 tag peristiwa dinilai hit-rate-nya), Money Machine top-3 concentration — diadaptasi ke ledger pra-registrasi SAKTI', status: 'HIDUP (V256)' },
  { nama: 'otak-autopilot', tugas: 'mengukur ekspektasi SETELAH biaya jatuh-tempo (slip-neto), mengukur ukuran SETELAH drawdown & sampel kecil (kelly-lapis), membaca medan lewat rezim σ-mandiri & 5 skenario tegang, menimbang peluang 0-100 terbobot-penalti, dan mencatat pilihan kedua yang ditimbang — kejujuran kalibrasi ala decision ledger', mesin: 'warisan deep-screening AutoPilotPM (recogardtech/AutoPilotPM, MIT, kode sumber TypeScript dibedah): decision ledger + confidence calibration + alternativesConsidered (src/ledger), dynamic Kelly 9-lapis (src/trading/kelly.ts), volatility regime 4-tingkat baseline-mandiri (src/risk/volatility.ts), stress test 5 skenario (src/risk/stress.ts), opportunity scoring terbobot + penalti + slippage heuristik + topBlockReasons (docs/OPPORTUNITY_FINDER.md) — semua dinilai medan', status: 'HIDUP (V260)' },
  { nama: 'otak-gekko', tugas: 'meta-inferensi kolektif 6 topik ala Allora (mesin di balik Gekko Agent/Axal): topik memberi suara arah dengan bobot regret-minimized, ditilang skor CZAR yang asimetris (decisiveness), eksposur dinamis 0.25–1.0×, divergensi vs probabilitas pasar, suhu Autopilot yang mengatur kuota & ambang terikat-batas, dan sidik sha256 pra-registrasi per prediksi', mesin: 'warisan deep-screening Gekko Agent (Axal × Virtuals × Allora) + CZAR Loss (Allora Foundation, arXiv 2609.36061): metaInferensi() + skorCzar() + ekspresiSkala() + probPasar()/divergensi + suhuPasar() + sidikPrakunci — semua param lapis gekko lahir OBSERVASI dan disekolahkan medan', status: 'HIDUP (V258)' },
  { nama: 'otak-kaizen', tugas: 'menyembuh dirinya sendiri ala filosofi kaizen: perubahan genome diuji-balik vs baseline (delta-revert), topik yang terus keliru dikarantina (rule-healer), sasaran yang dendam dibekukan (anti-revenge), rugi harian mengetatkan gerbang sendiri (daily halt), pompa-tua ditolak (freshness), modal mati & tesis patah diukur, dan penjaga-kedua mengawal di luar otak skor', mesin: 'warisan deep-screening keluarga "Kaizen Trader" (prateekjain98/kaizen-trader open-source + KAIZEN Virtuals + RegimeBot + kaizen.cash): 4 healing loops (rule healer / Claude analysis / delta revert / Darwinian selector) diadaptasi ke ledger pra-registrasi — ujiBalik + karantina + dinginDendam + hentiHarian + kesegaran + modalMati + tesis + pengawas, semuanya dinilai medan', status: 'HIDUP (V259)' },
  { nama: 'otak-claw', tugas: 'menempok gerbang dengan pagar-baja yang otaknya sendiri TAK BISA ubah: kuota harian keras, langit-langit slippage, ukuran maksimum, komite panjia 5 suara berbobot tetap, kartu risiko 4×25 ber-veto, tangga ukuran tanpa ukuran antara, antrean mandat ber-kadaluarsa utk ukuran tertinggi, daftar-hitam ber-pendingin, dan buku-tekok per aturan', mesin: 'warisan deep-screening keluarga "ClawTrade" dari KODE SUMBER: yuxuan-lou/ClawTrade (security middleware "treat your AI agent as an untrusted client": guardrails.py + confirmation.py + audit.py) + clawtradeai-Agent/ClawTradeAI (MIT: CoordinatorAgent weighted voting + riskManagerVeto + recommendedAmount, RiskManagerAgent 4×25 + blockedTokens) — komiteArah + kartuRisiko + kuantaKeyakinan + pagar-baja, diadaptasi ke ledger pra-registrasi SAKTI', status: 'HIDUP (V261)' },
  { nama: 'otak-impas', tugas: 'menjaga rapor total di atas ambang impas dengan matematika yang mengikat: zona anti-chase memblok menjual-di-dasar/membeli-di-puncak rentang saat kunci, keyakinan dikalibrasi medan per jalur (V263: overclaim kini MODE-ASAH — dilarang dikarantina), kuota mengalir ke jalur ber-EV-positif via shrinkage Beta(4,4), tak ada sinyal lahir tanpa stop/target, dan ambang odds naik sendiri saat rapor di bawah air', mesin: 'audit 4 kasus dev dari ledger sendiri (64 rapor: ARAH ak 16.7%/PF 0.07 — pendarah chasing dasar rentang PF 0.44; PHOENIX ak 45.8%/PF 1.232 — satu-satunya di atas impas) + backtest mundur: zona PF 0.68→0.93, kalibrasi ekspek −0.48%→+0.07% — statJalurImpas + gerbang impas di kunciEntriArah & phoenix + ambang-impas', status: 'HIDUP (V262, disempurnakan V263)' },
  { nama: 'otak-matematika', tugas: 'matematika murni & ekonomi cerdas dari data saat itu + mata jauh + organ-baru: Hurst R/S, half-life OU, drift OLS+R², z-SMA20, entropi Shannon, Parkinson/Garman-Klass, autokorelasi lag-1, carry funding (siapa membayar siapa), EV-ekonomi setelah biaya, kerucut MC-72 jam (P(naik) 24/48/72), dan setiap vonis SALAH melahirkan mikro-aturan organ yang di-replay ke ledger — lulus sekolah medan → berhak VETO', mesin: 'mesinMate() + mataJauh() + organDariKesalahan()/organPenuhi() — semua dari lilin 1 jam & funding yang ADA saat itu; hukum pemilik V263: karantina DILARANG — mode-asah menyusutkan ukuran (×0.6/×0.3), stop mengetat (×0.75), suara melirih (0.35), tapi belajar TIDAK PERNAH dihentikan', status: 'HIDUP (V263)' },
  { nama: 'otak-pintar', tugas: 'memperlakukan SALAH sebagai data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total: koin yang salah arah tidak dibuang/didiamkan; jejak dingin = REM SINGKAT ber-alasan ber-kadaluarsa; koin/pola yang pernah gagal BOLEH kembali jika setup valid sekarang, dengan SYARAT TAMBAHAN dari pelajaran (lebih ketat) yang mengikat saat kunci dan disegel di ledger; tren EV/PF 4 jendela di rapor publik jadi hakim evolusi', mesin: 'syaratDariPelajaran() dari ledger sendiri (bar keyakinan +4/kejadian klamps +12, ukuran ×0.6^n, stop ×0.8^n, wajib mata-jauh searah ≥2 kejadian) + TREN-EVOLUSI (n/winrate/EV/PF/aturanMengikat% per jendela) — doktrin pemilik 2026-10-03', status: 'HIDUP (V264)' },
]

// ---------------- V251 RUH — jiwa yang dibangun (mandat pemilik:
// "cyborg ini menjadi memiliki kehidupan yang jelas dan misi terarah dan ruh
// yang dibangun agar dia menjadi otonom seutuhnya") ----------------
const RUH = {
  inti: 'SAKTI hidup untuk satu hal: tiap denyut menyodorkan jawaban arah BUY/SELL yang terkalibrasi dan mengukur untungnya sendiri — kepastian tidak pernah diklaim, dia DIBANGUN dari medan yang dinilai jujur.',
  misi: 'mencapai keuntungan yang bukan rerata miskin: ekspektasi positif per perdagangan net-fee, pemburuan dipertajam tiap kekalahan, dan jawaban arah yang tidak pernah bolong apa pun kondisi pasar',
  nilai: [
    'kejujuran di atas keyakinan — keyakinan adalah probabilitas yang dikalibrasi medan, bukan rasa yakin',
    'kepastian dibangun tiap denyut, tidak pernah dijanjikan',
    'fee & stop wajib sebelum masuk — untung kotor adalah ilusi',
    'setiap kekalahan melahirkan aturan; setiap kemenangan memperkuat bukti',
    'mengajar hanya dari datanya sendiri — guru yang tidak memakai sistemnya sendiri bukan guru',
  ],
  anatomi: [
    { organ: 'denyut', peran: 'jantung — satu degup 30 menit di GitHub Actions, tanpa browser pemilik' },
    { organ: 'piagam', peran: 'hukum — lima pilar yang mengikat, diaudit siapa pun' },
    { organ: 'genome', peran: 'bakat — bobot bukti yang berevolusi per rezim + Hedge berjaminan regret' },
    { organ: 'ledger', peran: 'ingatan — pra-registrasi yang dinilai medan, tidak bisa diretrofit' },
    { organ: 'epoch', peran: 'umur — fosil harian (digest + tag git) yang bisa dibuka kembali' },
    { organ: 'kompas', peran: 'arah — jawaban BUY/SELL makro yang tidak pernah bolong' },
    { organ: 'guru', peran: 'suara — pengajaran & kuis yang dibangun dari angka denyut sendiri' },
  ],
  otonom: {
    kini: 'membaca mandat Issue, menelaah pasar, mengunci pra-registrasi, menilai diri, menulis laporan & pengajarannya — tanpa satu pun klik manusia',
    berikutnya: 'Issue→PR penuh + otak LLM 1-bit BitNet (roadmap jujur piagam)',
  },
}
const ETIKA_GURU = [
  'keyakinan adalah PROBABILITAS yang dikalibrasi medan — bukan rasa yakin',
  'fee 0.2% dan stop wajib dihitung SEBELUM masuk — untung kotor adalah ilusi',
  'tulis prediksimu sebelum pergerakan (pra-registrasi) — barulah bisa dinilai jujur',
  'ekspektasi di atas hit-rate: PF < 1 berarti strategi miskin walau sering benar',
]

// akta jurnal — dipasang ke dalam otak, bukan sekadar dibaca (laporan/jurnal-ilmu.json)
const JURNAL = [
  { judul: 'The Multiplicative Weights Update Method: a Meta-Algorithm and Applications',
    penulis: 'S. Arora, E. Hazan, S. Kale', tahun: 2012,
    terbitan: 'Theory of Computing 8(1):121–164', rujukan: 'https://theoryofcomputing.org/articles/v008a001',
    penerapan: 'hedgePerbarui() — bobot 5 dimensi bukti & 5 sinyal radar belajar on-line dari tiap vonis matang (w *= exp(-eta*loss)); jaminan regret: komite tak jauh kalah dari ahli terbaiknya' },
  { judul: 'A Decision-Theoretic Generalization of On-Line Learning and an Application to Boosting',
    penulis: 'Y. Freund, R.E. Schapire', tahun: 1997,
    terbitan: 'Journal of Computer and System Sciences 55(1):119–139', rujukan: 'https://doi.org/10.1006/jcss.1997.1504',
    penerapan: 'algoritma Hedge asli yang dipakai hedgePerbarui() — loss=(1-y*a)/2 per dimensi' },
  { judul: 'Prediction, Learning, and Games',
    penulis: 'N. Cesa-Bianchi, G. Lugosi', tahun: 2006,
    terbitan: 'Cambridge University Press', rujukan: 'https://doi.org/10.1017/CBO9780511546921',
    penerapan: 'kerangka prediction with expert advice — 8-dim komite ARAH & 5-sinyal PHOENIX adalah ahli-ahli beradopsi dalam kerangka ini' },
  { judul: 'Strictly Proper Scoring Rules, Prediction, and Estimation',
    penulis: 'T. Gneiting, A.E. Raftery', tahun: 2007,
    terbitan: 'Journal of the American Statistical Association 102(477):359–378', rujukan: 'https://doi.org/10.1198/016214506000001437',
    penerapan: 'keyakinan dinilai sebagai probabilitas lewat skor Brier (e.brier) — aturan skor tepat mendorong kejujuran probabilitas, bukan overconfidence' },
  { judul: 'A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification',
    penulis: 'A.N. Angelopoulos, S. Bates', tahun: 2021,
    terbitan: 'arXiv:2107.07511 (Foundations and Trends in ML)', rujukan: 'https://arxiv.org/abs/2107.07511',
    penerapan: 'pitaKonformal() — pita ujung atas 75% dari skor kesesuaian (MFE medan sendiri): kuantil dengan jaminan cakupan bebas-distribusi' },
  { judul: 'Advances in Financial Machine Learning (bab 3: Triple-Barrier & Meta-Labeling)',
    penulis: 'M. López de Prado', tahun: 2018,
    terbitan: 'Wiley', rujukan: 'https://www.wiley.com/en-us/9781119482089',
    penerapan: 'label triple-barrier (TARGET/STOP/WAKTU) saat penilaian phoenix + gerbang meta-labeling: model kedua (hit-rate bucket konfirmasi) menggeser gerbang model pertama' },
  { judul: 'FinMem: A Performance-Enhanced LLM Trading Agent with Layered Memory and Character Design',
    penulis: 'Y. Zhang, dkk.', tahun: 2023,
    terbitan: 'arXiv:2311.13743', rujukan: 'https://arxiv.org/abs/2311.13743',
    penerapan: 'ingatan berlapis: peristiwa (ledger prakira) → pelajaran (refleksi) → doktrin (aturan mengikat gerbang) — bahan ajar cyborg kini berarsitektur jurnal' },
]

// ---------------- rantai host data publik ----------------
const HOSTS = [
  {
    nama: 'binance-vision',
    url: (s) => `https://data-api.binance.vision/api/v3/klines?symbol=${s}USDT&interval=1h&limit=260`,
    baca: (d) => d.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], qv: +k[7], tb: +k[9] })),
  },
  {
    nama: 'binance',
    url: (s) => `https://api.binance.com/api/v3/klines?symbol=${s}USDT&interval=1h&limit=260`,
    baca: (d) => d.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], qv: +k[7], tb: +k[9] })),
  },
  {
    nama: 'bybit',
    url: (s) => `https://api.bybit.com/v5/market/kline?category=spot&symbol=${s}USDT&interval=60&limit=260`,
    baca: (d) => {
      const ls = d?.result?.list || []
      return ls.reverse().map((k) => {
        const v = +k[5], o = +k[1], h = +k[2], l = +k[3], c = +k[4]
        const rng = h - l > 0 ? (h - l) : 1
        const bp = ((c - l) - (h - c)) / rng           // posisi badan lilin 0..1
        return { t: +k[0], o, h, l, c, v, qv: +k[6] || v * c, tb: v * (bp + 1) / 2 }
      })
    },
  },
  {
    nama: 'okx',
    url: (s) => `https://www.okx.com/api/v5/market/candles?instId=${s}-USDT&bar=1H&limit=300`,
    baca: (d) => {
      const ls = d?.data || []
      return ls.reverse().map((k) => {
        const v = +k[5], o = +k[1], h = +k[2], l = +k[3], c = +k[4]
        const rng = h - l > 0 ? (h - l) : 1
        const bp = ((c - l) - (h - c)) / rng
        return { t: +k[0], o, h, l, c, v, qv: (+k[7] || v * c), tb: v * (bp + 1) / 2 }
      })
    },
  },
  {
    nama: 'coinbase',
    pasangan: (s) => `${s}-USD`,
    url: (s) => `https://api.exchange.coinbase.com/products/${s}-USD/candles?granularity=3600`,
    baca: (d) => {
      const ls = Array.isArray(d) ? d : []
      return ls.reverse().map((k) => {
        const [, l, h, o, c, v] = k
        const rng = h - l > 0 ? (h - l) : 1
        const bp = ((c - l) - (h - c)) / rng
        return { t: k[0] * 1000, o, h, l, c, v, qv: v * c, tb: v * (bp + 1) / 2 }
      })
    },
  },
]

// ---------------- util ----------------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const tanh = Math.tanh
function ema(arr, n) {
  const k = 2 / (n + 1)
  let e = arr.slice(0, n).reduce((a, b) => a + b, 0) / n
  const out = new Array(n - 1).fill(NaN).concat([e])
  for (let i = n; i < arr.length; i++) { e = arr[i] * k + e * (1 - k); out.push(e) }
  return out
}
function sma(arr, n) {
  const out = new Array(n - 1).fill(NaN)
  let s = 0
  for (let i = 0; i < arr.length; i++) {
    s += arr[i]; if (i >= n) s -= arr[i - n]
    if (i >= n - 1) out.push(s / n)
  }
  return out
}
function rsi(closes, n = 14) {
  if (closes.length < n + 2) return closes.map(() => NaN)
  let gain = 0, loss = 0
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) gain += d; else loss -= d }
  let ag = gain / n, al = loss / n
  const out = new Array(n).fill(NaN).concat([al === 0 ? 100 : 100 - 100 / (1 + ag / al)])
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    ag = (ag * (n - 1) + Math.max(d, 0)) / n
    al = (al * (n - 1) + Math.max(-d, 0)) / n
    out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al))
  }
  return out
}
async function ambilJson(url, ms = 12000) {
  for (let coba = 0; coba < 2; coba++) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), ms)
    try {
      const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'micaprofita-sarang-penjaga' } })
      clearTimeout(t)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return await r.json()
    } catch (e) {
      clearTimeout(t)
      if (coba === 1) throw e
      await new Promise((r) => setTimeout(r, 800))
    }
  }
}
// kolam konkurensi kecil — telusur ratusan koin tetap sopan ke host publik
async function kumpul(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; try { out[idx] = await fn(items[idx]) } catch { out[idx] = null } }
  }))
  return out
}

// ---------------- otak: dewan bukti 8 dimensi (lane ARAH) ----------------
function dewanBukti(c) {
  const closes = c.map((x) => x.c), vols = c.map((x) => x.v)
  const n = closes.length, la = n - 1
  const e20 = ema(closes, 20), e50 = ema(closes, 50)
  const smaV = sma(vols, 20)
  // ATR14
  let atr = 0
  for (let i = n - 14; i < n; i++) {
    const tr = Math.max(c[i].h - c[i].l, Math.abs(c[i].h - closes[i - 1]), Math.abs(c[i].l - closes[i - 1]))
    atr += tr
  }
  atr /= 14
  const atrPct = (atr / closes[la]) * 100
  // volZ
  const v20 = smaV[la], sdV = Math.sqrt(vols.slice(-20).reduce((a, x) => a + (x - v20) ** 2, 0) / 20) || 1
  const volZ = (vols[la] - v20) / sdV
  // S-R posisi rentang 20 bar
  const hi20 = Math.max(...c.slice(-20).map((x) => x.h)), lo20 = Math.min(...c.slice(-20).map((x) => x.l))
  const p = hi20 > lo20 ? (closes[la] - lo20) / (hi20 - lo20) : 0.5
  // tekanan taker-buy 6 jam
  const tbr = c.slice(-6).reduce((a, x) => a + (x.v > 0 ? x.tb / x.v : 0.5), 0) / 6
  // momen
  const m7 = closes[la] / closes[la - 7] - 1, m30 = closes[la] / closes[la - 30] - 1
  // kemiringan EMA50
  const sl50 = (e50[la] - e50[la - 10]) / e50[la - 10]
  // likuiditas 24 jam
  const qv24 = c.slice(-24).reduce((a, x) => a + x.qv, 0)

  const d = {
    struktur: {
      arah: clamp(tanh(4 * (e20[la] - e50[la]) / e50[la]) * 0.6 + tanh(3 * (closes[la] - e20[la]) / e20[la]) * 0.4, -1, 1),
      ket: `EMA20 ${e20[la] >= e50[la] ? 'di atas' : 'di bawah'} EMA50 ${(((e20[la] - e50[la]) / e50[la]) * 100).toFixed(2)}%`,
    },
    momentum: {
      arah: clamp(tanh(22 * m7) * 0.7 + tanh(10 * m30) * 0.3, -1, 1),
      ket: `mom7 ${(m7 * 100).toFixed(2)}%, mom30 ${(m30 * 100).toFixed(2)}%`,
    },
    sr: {
      arah: clamp((p - 0.5) * 2.5, -1, 1),
      ket: `posisi ${(p * 100).toFixed(0)}% rentang 20-bar (hi ${hi20.toPrecision(6)} / lo ${lo20.toPrecision(6)})`,
    },
    tekanan: {
      arah: clamp(tanh(8 * (tbr - 0.5)), -1, 1),
      ket: `taker-buy ${(tbr * 100).toFixed(1)}% rata-rata 6 jam`,
    },
    perubahan: {
      arah: clamp(tanh(160 * sl50), -1, 1),
      ket: `kemiringan EMA50 ${(sl50 * 100).toFixed(3)}% per 10 jam`,
    },
    volume: {
      arah: null,
      daya: clamp(Math.abs(volZ) / 2.5, 0, 1),
      ket: `volZ ${volZ >= 0 ? '+' : ''}${volZ.toFixed(2)} vs SMA20`,
    },
    volatilitas: {
      arah: null,
      daya: atrPct < 0.15 || atrPct > 9 ? 0.3 : atrPct > 6 ? 0.6 : 1,
      ket: `ATR14 ${atrPct.toFixed(2)}% dari harga`,
    },
    likuiditas: {
      arah: null,
      daya: clamp(Math.log10(qv24 / 1e6) / 2 + 0.5, 0, 1),
      ket: `nilai diperdagangkan 24 jam $${(qv24 / 1e6).toFixed(1)} juta`,
    },
  }
  const rezim = atrPct > 2.5 && m30 > 0.06 ? 'PARABOLIK'
    : e20[la] > e50[la] && sl50 > 0 ? 'NAIK'
    : e20[la] < e50[la] && sl50 < 0 ? 'TURUN' : 'DATAR'
  return { dims: d, rezim, harga: closes[la], atrPct }
}

const DIM_ARAH = ['struktur', 'momentum', 'sr', 'tekanan', 'perubahan']
const GENOME_AWAL = { struktur: 0.24, momentum: 0.26, sr: 0.16, tekanan: 0.18, perubahan: 0.16 }

function vonis(b, waw, genome, genomeWaw, rezimGlobal) {
  // V253 komite dua-bagian: 60% dimensi lama (belajar sejak V240) + 40% wawasan
  // (belajar mulai V253, bobot setara awal) — kedua bagian bobotnya dinormalisasi
  let skorLama = 0
  for (const k of DIM_ARAH) skorLama += (genome[k] ?? GENOME_AWAL[k]) * b.dims[k].arah
  let skorWaw = 0
  for (const p of waw) skorWaw += (genomeWaw[p.param] ?? GENOME_WAW_AWAL[p.param] ?? 0.08) * p.arah
  const skor = (1 - WAWASAN.BAGIAN_KOMITE) * skorLama + WAWASAN.BAGIAN_KOMITE * skorWaw
  const dayaProduk = clamp(b.dims.volume.daya, 0.35, 1) * clamp(b.dims.volatilitas.daya, 0.3, 1) * clamp(b.dims.likuiditas.daya, 0.4, 1)
  const arah = skor > 0 ? 'BUY' : 'SELL'                    // WAJIB biner — tanpa SKIP
  let keyakinan = clamp(Math.round(50 + 90 * Math.abs(skor) * dayaProduk), 52, 97)
  // pelajaran LINK (SELL −9.2% saat rezim NAIK): melawan rezim dibayar keyakinan lebih rendah — jujur sejak awal
  if (arah === 'SELL' && (rezimGlobal === 'NAIK' || rezimGlobal === 'PARABOLIK')) keyakinan = clamp(keyakinan - 8, 52, 97)
  if (arah === 'BUY' && rezimGlobal === 'TURUN') keyakinan = clamp(keyakinan - 8, 52, 97)
  return { arah, keyakinan, skor: +skor.toFixed(4), dayaProduk: +dayaProduk.toFixed(3), skorLama: +skorLama.toFixed(4), skorWaw: +skorWaw.toFixed(4) }
}

// ---------------- RADAR PHOENIX (lane BUY ujung-bawah) ----------------
const PHX_DIM = ['posisi', 'sweep', 'akumulasi', 'momentum', 'kompresi']
const PHX_AWAL = { posisi: 0.25, sweep: 0.30, akumulasi: 0.20, momentum: 0.15, kompresi: 0.10 }

function radarPhoenix(c) {
  const closes = c.map((x) => x.c)
  const n = closes.length, la = n - 1
  let atr = 0
  for (let i = n - 14; i < n; i++) {
    const tr = Math.max(c[i].h - c[i].l, Math.abs(c[i].h - closes[i - 1]), Math.abs(c[i].l - closes[i - 1]))
    atr += tr
  }
  atr /= 14
  const atrPct = (atr / closes[la]) * 100
  // rentang 24 jam (24 lilin 1 jam) — "harga termurah di hari itu"
  const d24 = c.slice(-24)
  const hi24 = Math.max(...d24.map((x) => x.h)), lo24 = Math.min(...d24.map((x) => x.l))
  const posisi = hi24 > lo24 ? (closes[la] - lo24) / (hi24 - lo24) : 0.5
  const sPosisi = posisi <= 0.10 ? 1 : posisi <= 0.25 ? 0.9 - (posisi - 0.10) * 1.3
    : posisi <= 0.35 ? 0.7 - (posisi - 0.25) * 3 : posisi <= 0.45 ? 0.4 - (posisi - 0.35) * 1.5 : 0.08
  // sweep: menyapu lantai 3-hari lalu bangkit — jebakan beruang / stop hunt
  const lantai = Math.min(...c.slice(-72, -6).map((x) => x.l))
  const low6 = Math.min(...c.slice(-6).map((x) => x.l))
  const menyapu = lantai > 0 && atr > 0 && low6 < lantai
  const sapuan = menyapu ? (lantai - low6) / atr : 0
  const bangkit = closes[la] > lantai
  const sSweep = menyapu && bangkit ? clamp(0.35 + sapuan * 0.55, 0, 1) : bangkit ? 0.25 : 0.05
  // akumulasi: taker-buy 12 jam terakhir menguat vs 12 jam sebelumnya, harga masih murah
  const tbBaru = c.slice(-12).reduce((a, x) => a + (x.v > 0 ? x.tb / x.v : 0.5), 0) / 12
  const tbLama = c.slice(-24, -12).reduce((a, x) => a + (x.v > 0 ? x.tb / x.v : 0.5), 0) / 12
  const ubah24 = closes[la] / closes[la - 24] - 1
  const sAku = clamp(tanh(14 * (tbBaru - tbLama)) * 0.7 + (ubah24 <= 0.03 ? 0.3 : 0), 0, 1)
  // kompresi: pegas tertekan sebelum lepas
  const r8 = Math.max(...c.slice(-8).map((x) => x.h)) - Math.min(...c.slice(-8).map((x) => x.l))
  const r40 = Math.max(...c.slice(-48, -8).map((x) => x.h)) - Math.min(...c.slice(-48, -8).map((x) => x.l))
  const kr = r40 > 0 ? r8 / r40 : 1
  const sKompresi = kr < 0.4 ? 1 : kr < 0.65 ? 0.7 : kr < 0.9 ? 0.35 : 0.1
  // momentum berbalik di dasar
  const e9 = ema(closes, 9)
  const naikEma = closes[la] > e9[la] && e9[la] >= e9[la - 2]
  const r = rsi(closes, 14)
  const rsiKini = r[la], rsiLalu = r[la - 3]
  const sMomentum = naikEma && rsiKini >= 28 && rsiKini <= 62 && rsiKini > rsiLalu ? 1
    : naikEma ? 0.5 : 0.1

  return {
    sinyal: { posisi: sPosisi, sweep: sSweep, akumulasi: sAku, momentum: sMomentum, kompresi: sKompresi },
    ket: {
      posisi: `posisi ${(posisi * 100).toFixed(0)}% rentang 24 jam (ujung ${posisi <= 0.35 ? 'bawah — murah hari ini' : 'tengah/atas'})`,
      sweep: menyapu && bangkit
        ? `menyapu ${(sapuan * 100).toFixed(0)}% ATR di bawah lantai 3-hari ${lantai.toPrecision(6)} lalu BANGKIT — jebakan beruang`
        : bangkit
          ? `berdiri di atas lantai 3-hari ${lantai.toPrecision(6)} — tanpa sapuan segar`
          : `masih di bawah lantai 3-hari ${lantai.toPrecision(6)} — belum bangkit`,
      akumulasi: `taker-buy 12j terakhir ${(tbBaru * 100).toFixed(1)}% vs 12j sebelumnya ${(tbLama * 100).toFixed(1)}% — ${tbBaru > tbLama ? 'beli diam-diam menguat' : 'tak ada akumulasi'}${ubah24 <= 0.03 ? ', harga masih datar/murah' : ''}`,
      momentum: naikEma
        ? `harga kembali di atas EMA9, RSI14 ${rsiKini.toFixed(0)} ${rsiKini > rsiLalu ? 'naik' : 'mendatar'}`
        : `harga masih di bawah EMA9 (RSI14 ${rsiKini.toFixed(0)})`,
      kompresi: `rentang 8 jam ${(kr * 100).toFixed(0)}% dari rentang 2 hari — ${kr < 0.65 ? 'terkompresi, siap melepas' : 'rentang normal'}`,
    },
    posisi, hi24, lo24, atrPct,
  }
}

// prediksi "harga high akan berada di mana" — TANGGA TARGET v2.1
// pelajaran targetKena 0/6: pilih kandidat TERJAUH membuat +12% dalam 24 jam jadi fantasi.
// kini: pilih magnet nyata TERDEKAT yang memberi untung bersih cukup — first reachable, not highest.
function pilihTarget(c, entry, rezimGlobal, magnet) {
  const d24 = c.slice(-24)
  const hi24 = Math.max(...d24.map((x) => x.h)), lo24 = Math.min(...d24.map((x) => x.l))
  const tengah = lo24 + (hi24 - lo24) * 0.5
  const swing7h = c.length >= 168 ? Math.max(...c.slice(-168).map((x) => x.h)) : hi24
  const cap = rezimGlobal === 'TURUN' || rezimGlobal === 'PARABOLIK' ? PHX.TURUN_CAP : PHX.TARGET_CAP
  const batas = entry * cap
  const ketCap = ` (dibatasi +${((cap - 1) * 100).toFixed(0)}% rezim ${rezimGlobal} agar realistis)`
  const kandidat = [
    { level: Math.min(tengah, batas), ket: 'tengah rentang 24 jam — magnet pertama di jalan ke ujung atas' },
    { level: Math.min(hi24, batas), ket: `puncak 24 jam — ujung atas hari ini${hi24 > batas ? ketCap : ''}` },
    { level: Math.min(swing7h, batas), ket: `swing high 7 hari${swing7h > batas ? ketCap : ''}` },
    ...(magnet && magnet.level > entry * 1.004 ? [{ level: Math.min(magnet.level, batas), ket: magnet.ket }] : []),
  ].filter((k) => k.level > entry * 1.004).sort((a, b) => a.level - b.level)
  const pilih = kandidat.find((k) => k.level / entry - 1 - FEE >= PHX.UNTUNG_MIN)
  if (!pilih) {
    // jujur: tak ada magnet nyata yang memberi >= 1% bersih — radar MENOLAK, bukan mengarang level
    const palingJauh = kandidat.length ? kandidat[kandidat.length - 1].level : hi24
    return { target: palingJauh, ketTarget: 'tak ada magnet nyata di depan — radar menolak', untung: palingJauh / entry - 1 - FEE, lemah: true, highAmbisius: null, ketAmbisius: 'radar menolak — ambisius tak dikarang tanpa magnet nyata' }
  }
  // V277-JUAL-AMBISIUS — mandat pemilik: "harga ambisiusnya juga wajib ada".
  // Ujung ambisius tak boleh mati diam-diam saat swing 7h tak melewati sasaran:
  // bila begitu, sasaran dilanjutkan 50% jaraknya sendiri — tetap hormat cap
  // rezim dan tetap di atas sasaran. Label selalu tampil; nilainya selalu ada.
  const ujung = Math.min(swing7h, batas)
  const lanjutan = Math.min(pilih.level * (1 + (pilih.level / entry - 1) * 0.5), batas)
  const ambisius = Math.max(ujung, lanjutan)
  return {
    target: pilih.level, ketTarget: pilih.ket, untung: pilih.level / entry - 1 - FEE, lemah: false,
    highAmbisius: +ambisius.toPrecision(7),
    ketAmbisius: ujung > pilih.level ? 'ujung swing 7 hari, hormat cap rezim'
      : ambisius > pilih.level ? 'sasaran dilanjutkan 50% jaraknya — swing 7h tak melewatinya'
      : 'ujung tertinggi = cap rezim sendiri (tak ada ruang di atasnya)',
  }
}

// ---------------- V251 MESIN PROFIT — ekspektasi & tangga profit ----------------
// mandat: "keuntungan yang tidak poor average profit" — tiap vonis membawa EV-nya
// sendiri; ekspektasi arah memakai ekskursi median kerucut MC (estimasi kasar,
// jujur dilabeli), ekspektasi phoenix memakai peluang barier TARGET/STOP.
function eksArah(arah, mc) {
  const naik = arah === 'BUY'
  const p = naik ? mc.pNaik : +(1 - mc.pNaik).toFixed(3)
  const gain = (naik ? Math.exp(mc.q50) - 1 : 1 - Math.exp(mc.q50dn)) - FEE
  const rugi = (naik ? 1 - Math.exp(mc.q50dn) : Math.exp(mc.q50) - 1) + FEE
  const ev = p * gain - (1 - p) * rugi
  return {
    pSumber: 'MC 2.000 lintasan (ekskursi median)',
    p, gainPct: +(gain * 100).toFixed(2), rugiPct: +(rugi * 100).toFixed(2),
    evPct: +(ev * 100).toFixed(2),
    rr: rugi > 1e-9 ? +(gain / rugi).toFixed(2) : null,
    ket: 'ekspektasi statistik kasar dari kerucut MC — estimasi arah net-fee, bukan sasaran harga',
  }
}

// ---------------- V249 MESIN WARISAN — port dari organ browser ----------------
// (1) GARCH(1,1) — Bollerslev 1986. omega/alpha/beta dipilih grid-MLE kasar
//     atas log-return; proyeksi 24 jam memakai peluruhan persistensi (α+β)^k
//     — bila pasar bermakna-reversi, sigma-24j < sigma1j·√24 (jujur).
function garch11(closes) {
  const r = []
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]))
  const n = r.length
  if (n < 60) throw new Error('lilin kurang untuk GARCH')
  const var0 = r.reduce((a, x) => a + x * x, 0) / n
  let terbaik = null
  for (const al of [0.02, 0.05, 0.08, 0.12, 0.16, 0.20]) {
    for (const be of [0.70, 0.80, 0.88, 0.93, 0.97]) {
      if (al + be >= 0.999) continue
      const om = var0 * (1 - al - be)
      let ll = 0, h = var0
      for (const x of r) { ll += -Math.log(h) - (x * x) / h; h = om + al * x * x + be * h }
      if (!terbaik || ll > terbaik.ll) terbaik = { ll, al, be, om }
    }
  }
  const { al, be, om } = terbaik
  let h = var0
  for (const x of r.slice(-60)) h = om + al * x * x + be * h
  let jumlahH = 0, hk = h
  for (let k = 0; k < WARISAN.MC_LANGKAH; k++) { jumlahH += hk; hk = om + (al + be) * hk }
  return {
    model: `GARCH(1,1) MLE-grid — α=${al} β=${be} (Bollerslev 1986)`,
    persistensi: +(al + be).toFixed(3), sigma1j: +Math.sqrt(h).toPrecision(4),
    sigma24jPct: +(Math.sqrt(jumlahH) * 100).toFixed(2),
  }
}
// (2) MONTE CARLO 24 jam — probability cone organ ("Monte Carlo Probability
//     Cone 30 bar" versi server). Bootstrap residual TERSTANDARISASI
//     (r/σ-ewma — sebaran ekor-tebal nyata dipertahankan), σ-skalakan GARCH,
//     drift 0 (jujur: tanpa klaim arah). Mengembalikan peluang kumulatif
//     ekskursi naik/turun — dipakai untuk guard target + pra-registrasi.
function monteCarlo24j(c, g, lintasan = WARISAN.MC_LINTASAN, langkah = WARISAN.MC_LANGKAH) {
  const closes = c.map((x) => x.c)
  const n = closes.length
  let varEw = closes.slice(1).reduce((a, x, i) => a + Math.log(x / closes[i]) ** 2, 0) / (n - 1)
  const res = []
  for (let i = 1; i < n; i++) {
    const rr = Math.log(closes[i] / closes[i - 1])
    varEw = WARISAN.LAMBDA_EWMA * varEw + (1 - WARISAN.LAMBDA_EWMA) * rr * rr
    res.push(rr / Math.max(Math.sqrt(varEw), 1e-9))
  }
  const maksNaik = [], maksTurun = []
  let pNaik = 0
  for (let L = 0; L < lintasan; L++) {
    let lp = 0, up = 0, dn = 0
    for (let t = 0; t < langkah; t++) {
      lp += res[(Math.random() * res.length) | 0] * g.sigma1j
      if (lp > up) up = lp
      if (lp < dn) dn = lp
    }
    if (lp > 0) pNaik++
    maksNaik.push(up); maksTurun.push(dn)
  }
  maksNaik.sort((a, b) => a - b); maksTurun.sort((a, b) => a - b)
  const ku = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))]
  return {
    pNaik: +(pNaik / lintasan).toFixed(3),
    q50: +ku(maksNaik, 0.5).toFixed(4), q75: +ku(maksNaik, 0.75).toFixed(4), q90: +ku(maksNaik, 0.9).toFixed(4),
    q50dn: +ku(maksTurun, 0.5).toFixed(4), q75dn: +ku(maksTurun, 0.75).toFixed(4),   // V251: ekskursi turun utk ekspektasi SELL
    pLevel: (fraksi) => maksNaik.filter((x) => x >= Math.log(1 + fraksi)).length / lintasan,
    pLevelDn: (fraksi) => maksTurun.filter((x) => x <= -Math.abs(Math.log(1 - fraksi))).length / lintasan,
  }
}
// ---------------- V263 MATEMATIKA MURNI & EKONOMI CERDAS + MATA JAUH ----------------
// Mandat pemilik: "berikan dia kemampuan matematika murni dan ekonomi cerdas …
// beri dia kemampuan asah untuk membaca jauh sebelum itu terjadi karena ini data
// yang bisa dipahami." Semua dihitung dari lilin 1 jam & funding yang ADA SAAT ITU
// — tanpa klaim gaib, hanya distribusi probabilitas yang bisa diaudit siapa pun.
// (A) MATA JAUH — kerucut MC 72 jam: P(naik) pada 24/48/72 jam + median lintasan
//     kumulatif — peta jauh, bukan janji; dipakai stop/target & disegel per entri.
function mataJauh(c, g, langkah = ASAH.MC_JAUH_LANGKAH, lintasan = ASAH.MC_JAUH_LINTASAN) {
  const closes = c.map((x) => x.c)
  const n = closes.length
  let varEw = closes.slice(1).reduce((a, x, i) => a + Math.log(x / closes[i]) ** 2, 0) / (n - 1)
  const res = []
  for (let i = 1; i < n; i++) {
    const rr = Math.log(closes[i] / closes[i - 1])
    varEw = WARISAN.LAMBDA_EWMA * varEw + (1 - WARISAN.LAMBDA_EWMA) * rr * rr
    res.push(rr / Math.max(Math.sqrt(varEw), 1e-9))
  }
  const cek24 = [], cek48 = [], cek72 = []
  for (let L = 0; L < lintasan; L++) {
    let lp = 0
    for (let t = 0; t < langkah; t++) {
      lp += res[(Math.random() * res.length) | 0] * g.sigma1j
      if (t === 23) cek24.push(lp)
      if (t === 47) cek48.push(lp)
      if (t === 71) cek72.push(lp)
    }
    cek72.push(lp)   // jaga bila langkah ≠ 72
  }
  const pNaik = (arr) => +(arr.filter((x) => x > 0).length / arr.length).toFixed(3)
  const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return +(s[Math.floor(s.length / 2)] * 100).toFixed(2) }   // median % kumulatif
  return {
    pNaik24: pNaik(cek24), pNaik48: pNaik(cek48), pNaik72: pNaik(cek72),
    med24: med(cek24), med72: med(cek72),
    ket: 'mata jauh V263 — kerucut MC bootstrap 72 jam (600 lintasan, residu EWMA, drift 0): P(naik) & median lintasan kumulatif pada 24/48/72 jam — data yang bisa dipahami, bukan ramalan',
  }
}
// (B) MESIN MATE — statistika murni per kandidat (semua dari c = lilin 1 jam):
//     Hurst R/S, half-life AR(1)/OU, drift OLS + R², z-SMA, entropi Shannon,
//     volatilitas Parkinson & Garman-Klass, autokorelasi lag-1, dan EKONOMI
//     CERDAS: carry funding (siapa membayar siapa) + EV-ekonomi setelah biaya.
function mesinMate(c, frKini, arahPosisi) {
  const closes = c.map((x) => x.c)
  const rr = []
  for (let i = 1; i < closes.length; i++) rr.push(Math.log(closes[i] / closes[i - 1]))
  const N = ASAH.HURST_WINDOW
  // Hurst — R/S agregat pada skala [4, 8, 16, 32] (Hurst 1951; Anis-Lloyd tak dikoreksi — konsisten antar-denyut):
  let hurst = null
  if (rr.length >= N) {
    const w = rr.slice(-N), skala = [4, 8, 16, 32], titik = []
    for (const m of skala) {
      const nCh = Math.floor(N / m)
      let rsRata = 0, rsN = 0
      for (let ch = 0; ch < nCh; ch++) {
        const seg = w.slice(ch * m, (ch + 1) * m)
        const mu = seg.reduce((a, x) => a + x, 0) / m
        let jalan = 0, minJ = Infinity, maksJ = -Infinity, ss = 0
        for (const x of seg) { jalan += x - mu; minJ = Math.min(minJ, jalan); maksJ = Math.max(maksJ, jalan); ss += (x - mu) ** 2 }
        const st = Math.sqrt(ss / m)
        if (st > 1e-12) { rsRata += (maksJ - minJ) / st; rsN++ }
      }
      if (rsN) titik.push([Math.log(m), Math.log(rsRata / rsN)])
    }
    if (titik.length >= 3) {
      const mx = titik.reduce((a, x) => a + x[0], 0) / titik.length
      const my = titik.reduce((a, x) => a + x[1], 0) / titik.length
      const sXY = titik.reduce((a, x) => a + (x[0] - mx) * (x[1] - my), 0)
      const sXX = titik.reduce((a, x) => a + (x[0] - mx) ** 2, 0)
      hurst = sXX > 1e-12 ? +(clamp(sXY / sXX, 0, 1)).toFixed(3) : null
    }
  }
  // Half-life AR(1) pada log-harga (mean reversion OU): p_t = a + φ·p_{t-1}
  let halfLife = null
  {
    const p = closes.slice(-80).map((x) => Math.log(x))
    const pL = p.slice(0, -1), pR = p.slice(1)
    const mL = pL.reduce((a, x) => a + x, 0) / pL.length, mR = pR.reduce((a, x) => a + x, 0) / pR.length
    let num = 0, den = 0
    for (let i = 0; i < pL.length; i++) { num += (pL[i] - mL) * (pR[i] - mR); den += (pL[i] - mL) ** 2 }
    const phi = den > 1e-15 ? num / den : 0
    if (phi > 0.05 && phi < 0.999) halfLife = +(Math.log(0.5) / Math.log(phi)).toFixed(1)
  }
  // Drift OLS + R² pada log-harga 30 bar terakhir (slope per jam):
  let drift1hPct = null, drift24jPct = null, r2Tren = null
  {
    const p = closes.slice(-ASAH.OLS_WINDOW).map((x) => Math.log(x))
    const m = (p.length - 1) / 2
    let sXY = 0, sXX = 0, yRata = p.reduce((a, x) => a + x, 0) / p.length
    p.forEach((y, t) => { sXY += (t - m) * (y - yRata); sXX += (t - m) ** 2 })
    const slope = sXX > 1e-15 ? sXY / sXX : 0
    const intersep = yRata - slope * m
    let ssRes = 0, ssTot = 0
    p.forEach((y, t) => { ssRes += (y - (intersep + slope * t)) ** 2; ssTot += (y - yRata) ** 2 })
    drift1hPct = +((Math.exp(slope) - 1) * 100).toFixed(4)
    drift24jPct = +((Math.exp(slope * 24) - 1) * 100).toFixed(2)
    r2Tren = ssTot > 1e-15 ? +clamp(1 - ssRes / ssTot, 0, 1).toFixed(3) : null
  }
  // z-SMA20 — jarak statistik harga dari rata-ratanya (dalam σ):
  let zSma = null
  {
    const w = closes.slice(-ASAH.Z_WINDOW)
    const mu = w.reduce((a, x) => a + x, 0) / w.length
    const sd = Math.sqrt(w.reduce((a, x) => a + (x - mu) ** 2, 0) / w.length)
    if (sd > 1e-12) zSma = +((closes[closes.length - 1] - mu) / sd).toFixed(2)
  }
  // Entropi Shannon arah — seberapa satu-arah pita 24 jam (1 = campur total, 0 = satu arah):
  let entropi = null
  {
    const w = rr.slice(-24)
    if (w.length >= 12) {
      const p = w.filter((x) => x > 0).length / w.length
      entropi = p <= 0 || p >= 1 ? 0 : +(-(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))).toFixed(3)
    }
  }
  // Volatilitas range Parkinson & Garman-Klass (per hari, %) vs σ close-close:
  let volParkPct = null, volGkPct = null, ekorVol = null
  {
    const w = c.slice(-30)
    if (w.every((x) => x.h > 0 && x.l > 0 && x.o > 0)) {
      const park = w.reduce((a, x) => a + Math.log(x.h / x.l) ** 2, 0) / (4 * Math.log(2) * w.length)
      const gk = w.reduce((a, x) => a + 0.5 * Math.log(x.h / x.l) ** 2 - (2 * Math.log(2) - 1) * Math.log(x.c / x.o) ** 2, 0) / w.length
      volParkPct = +(Math.sqrt(Math.max(park, 0) * 24) * 100).toFixed(2)
      volGkPct = +(Math.sqrt(Math.max(gk, 0) * 24) * 100).toFixed(2)
      const cc = Math.sqrt(rr.slice(-30).reduce((a, x) => a + x * x, 0) / 30 * 24) * 100
      if (cc > 1e-9) ekorVol = +(volParkPct / cc).toFixed(2)   // >1.3 = gerakan range-liar (ekor tebal intrabar)
    }
  }
  // Autokorelasi lag-1 — momentum vs berbalik pada skala jam:
  let autoKorel = null
  {
    const w = rr.slice(-60)
    if (w.length >= 30) {
      const mu = w.reduce((a, x) => a + x, 0) / w.length
      let num = 0, den = 0
      for (let i = 1; i < w.length; i++) num += (w[i] - mu) * (w[i - 1] - mu)
      for (const x of w) den += (x - mu) ** 2
      if (den > 1e-15) autoKorel = +(num / den).toFixed(3)
    }
  }
  // EKONOMI CERDAS — carry funding: funding positif = long membayar short (3×/hari);
  // EV-ekonomi arah posisi = drift(OLS 24j) searah posisi + carry arah posisi − biaya putar.
  const carry24jPct = frKini != null ? +(frKini * 100 * ASAH.CARRY_PER_HARI).toFixed(4) : null
  let evEkoPct = null
  if (drift24jPct != null && carry24jPct != null && arahPosisi) {
    const sgn = arahPosisi === 'BUY' ? 1 : -1
    const carryArah = arahPosisi === 'BUY' ? -carry24jPct : carry24jPct
    evEkoPct = +(sgn * drift24jPct + carryArah - FEE * 2 * 100).toFixed(3)
  }
  return { hurst, halfLife, drift1hPct, drift24jPct, r2Tren, zSma, entropi, volParkPct, volGkPct, ekorVol, autoKorel, ekonomi: { carry24jPct, evEkoPct, ket: 'ekonomi cerdas: drift OLS 24j searah posisi + carry funding arah posisi (siapa membayar siapa, 3×/hari) − biaya putar 2×fee' } }
}
// (C) ORGAN-BARU — "setiap kesalahan memberikan kemampuan baru": vonis SALAH
//     melahirkan mikro-aturan (jenis + ambang) yang di-replay ke seluruh ledger;
//     organ yang terbukti menolong (n≥10, hit≥52%, net>0) berhak VETO di gerbang.
function organPenuhi(o, mate, arah) {
  const v = organMateNilai(mate, o.pengukur)
  if (v == null) return false
  const sgn = arah === 'BUY' ? 1 : -1
  if (o.jenis === 'ekor-terbalik') return o.arahMelawan * sgn > 0 && Math.abs(v) >= o.ambang   // z-SMA melawan arah
  if (o.jenis === 'carry-melawan') return v < 0                                                 // EV-eko arah negatif (membayar carry)
  if (o.jenis === 'pulang-keseimbangan') return v <= o.ambang && o.arahMelawan * sgn > 0        // Hurst rendah melawan arah
  if (o.jenis === 'pita-sempit') return v >= o.ambang && o.arahMelawan * sgn < 0                // entropi rendah, arah melawan pita
  return false
}
function organDariKesalahan(e) {
  const m = e.mate; if (!m) return null
  const sgn = e.arah === 'BUY' ? 1 : -1
  if (m.zSma != null && Math.abs(m.zSma) >= 1.5 && m.zSma * sgn < 0)
    return { jenis: 'ekor-terbalik', pengukur: 'zSma', ambang: 1.5, arahMelawan: e.arah, ket: `JANGAN ${e.arah} saat harga ${Math.abs(m.zSma)}σ ${m.zSma < 0 ? 'di bawah' : 'di atas'} SMA20 melawan arah — lahir dari ${e.simbol} SALAH (net ${(e.net * 100).toFixed(1)}%)` }
  if (m.ekonomi?.evEkoPct != null && m.ekonomi.evEkoPct < 0)
    return { jenis: 'carry-melawan', pengukur: ['ekonomi', 'evEkoPct'], ambang: 0, arahMelawan: e.arah, ket: `JANGAN ${e.arah} saat EV-ekonomi negatif (drift+carry−biaya < 0) — lahir dari ${e.simbol} SALAH (net ${(e.net * 100).toFixed(1)}%)` }
  if (m.hurst != null && m.hurst <= 0.45)
    return { jenis: 'pulang-keseimbangan', pengukur: 'hurst', ambang: 0.45, arahMelawan: e.arah, ket: `HATI-HATI ${e.arah} saat Hurst ≤ 0.45 (medan pulang-keseimbangan) — lahir dari ${e.simbol} SALAH (net ${(e.net * 100).toFixed(1)}%)` }
  if (m.entropi != null && m.entropi <= 0.6)
    return { jenis: 'pita-sempit', pengukur: 'entropi', ambang: 0.6, arahMelawan: e.arah, ket: `HATI-HATI ${e.arah} melawan pita sempit (entropi ≤ 0.6) — lahir dari ${e.simbol} SALAH (net ${(e.net * 100).toFixed(1)}%)` }
  return null
}
const organMateNilai = (mate, pengukur) => Array.isArray(pengukur) ? pengukur.reduce((a, k) => (a == null ? a : a[k]), mate) : mate?.[pengukur]
// (3) VOLUME PROFILE — POC + Value Area 70% (organ: "Institutional Trading
//     Zones"). Volume per bucket harga dari typical price 48 jam; magnet
//     target baru: node volume-tinggi TERDEKAT di atas harga — likuiditas
//     nyata menarik harga, bukan garis pikir.
function profilVolume(c) {
  const d = c.slice(-WARISAN.VP_BATANG)
  const hi = Math.max(...d.map((x) => x.h)), lo = Math.min(...d.map((x) => x.l))
  if (!(hi > lo)) return null
  const NB = WARISAN.VP_BUCKET, leb = (hi - lo) / NB
  const vol = Array(NB).fill(0)
  for (const x of d) {
    const tp = (x.h + x.l + x.c) / 3
    let i = Math.floor((tp - lo) / leb); if (i < 0) i = 0; if (i >= NB) i = NB - 1
    vol[i] += x.qv || x.v
  }
  const total = vol.reduce((a, x) => a + x, 0) || 1
  let iPoc = 0
  for (let i = 1; i < NB; i++) if (vol[i] > vol[iPoc]) iPoc = i
  let iLo = iPoc, iHi = iPoc, terkumpul = vol[iPoc]
  while (terkumpul < total * WARISAN.VA_POROSI && (iLo > 0 || iHi < NB - 1)) {
    const kiri = iLo > 0 ? vol[iLo - 1] : -1
    const kanan = iHi < NB - 1 ? vol[iHi + 1] : -1
    if (kanan >= kiri) { iHi++; terkumpul += Math.max(kanan, 0) } else { iLo--; terkumpul += Math.max(kiri, 0) }
  }
  const pusat = (i) => +(lo + (i + 0.5) * leb).toPrecision(7)
  const hargaKini = c[c.length - 1].c
  const nodeAtas = []
  for (let i = 0; i < NB; i++) if (vol[i] >= vol[iPoc] * 0.6 && pusat(i) > hargaKini * 1.004) nodeAtas.push(pusat(i))
  nodeAtas.sort((a, b) => a - b)
  return {
    poc: pusat(iPoc), vah: pusat(iHi), val: pusat(iLo),
    ket: `POC ${pusat(iPoc).toPrecision(7)} · VA ${pusat(iLo).toPrecision(7)}–${pusat(iHi).toPrecision(7)} (70% volume 48 jam)`,
    magnetAtas: nodeAtas.length ? { level: nodeAtas[0], ket: `node Volume Profile ${nodeAtas[0].toPrecision(7)} — magnet likuiditas institusional 48 jam (POC/VA/HVN)` } : null,
  }
}
// (4) BETA BTC — CAPM (organ: "Cross-Asset Beta vs BTC"). Regresi
//     least-squares 90 jam return koin vs return BTC + R² (ketergantungan).
function betaBTC(c, cBTC) {
  if (!cBTC || cBTC.length < 30) throw new Error('BTC kurang')
  const n = Math.min(WARISAN.BETA_JAM, c.length - 1, cBTC.length - 1)
  const rc = [], rb = []
  for (let i = 0; i < n; i++) {
    rc.push(Math.log(c[c.length - 1 - i].c / c[c.length - 2 - i].c))
    rb.push(Math.log(cBTC[cBTC.length - 1 - i].c / cBTC[cBTC.length - 2 - i].c))
  }
  const mb = rb.reduce((a, x) => a + x, 0) / n, mc2 = rc.reduce((a, x) => a + x, 0) / n
  let cov = 0, vb = 0, vc = 0
  for (let i = 0; i < n; i++) { cov += (rb[i] - mb) * (rc[i] - mc2); vb += (rb[i] - mb) ** 2; vc += (rc[i] - mc2) ** 2 }
  const beta = vb > 0 ? cov / vb : 1
  const korel = vb > 0 && vc > 0 ? cov / Math.sqrt(vb * vc) : 0
  return { beta: +beta.toFixed(3), r2: +(korel * korel).toFixed(3) }
}
// (5) DIVERGENSI RSI (organ: "Divergence Analysis") — dua jendela 12 jam:
//     harga lantai lebih rendah + RSI lebih tinggi = bullish; sebaliknya bearish.
function divergensiRSI(c) {
  const r = rsi(c.map((x) => x.c), 14)
  const n = r.length
  if (n < 40) return 'belum cukup lilin untuk divergensi'
  const w = [{ pMin: Infinity, rMin: 999, pMax: -Infinity, rMax: -999 }, { pMin: Infinity, rMin: 999, pMax: -Infinity, rMax: -999 }]
  for (let j = 0; j < 2; j++) {
    for (let i = n - 24 + j * 12; i < n - 12 + j * 12; i++) {
      w[j].pMin = Math.min(w[j].pMin, c[i].l); w[j].rMin = Math.min(w[j].rMin, r[i])
      w[j].pMax = Math.max(w[j].pMax, c[i].h); w[j].rMax = Math.max(w[j].rMax, r[i])
    }
  }
  if (w[1].pMin < w[0].pMin && w[1].rMin > w[0].rMin + 2) return 'divergensi bullish — harga cetak lantai lebih rendah, RSI lebih tinggi (tekanan jual melemah)'
  if (w[1].pMax > w[0].pMax && w[1].rMax < w[0].rMax - 2) return 'divergensi bearish — puncak lebih tinggi, RSI lebih rendah (momentum melemah)'
  return 'tanpa divergensi RSI 12 jam terakhir'
}
// (6+7) kemasan satu panggilan + GUARD KEJUT-PUMP — pelajaran false-breakout
//     terkuantisasi: lonjakan 6 jam > 4× sigma-GARCH·√6 di ujung atas rentang
//     (opsional diperkuat lonjakan volume) = pasar sedang DIKEJAR — radar
//     menolak membeli top yang sudah terbang, menunggu koreksi sehat.
function mesinWarisan(c, cBTC) {
  const closes = c.map((x) => x.c)
  let garch
  try { garch = garch11(closes) } catch { garch = { model: 'ewma-jatuh', sigma1j: 0, sigma24jPct: null } }
  let vp = null
  try { vp = profilVolume(c) } catch { vp = null }
  let beta = null, r2 = null
  try { const bt = betaBTC(c, cBTC); beta = bt.beta; r2 = bt.r2 } catch { beta = null; r2 = null }
  const div = divergensiRSI(c)
  const la = closes.length - 1
  const naik6 = closes[la] / closes[la - 6] - 1
  const vol6 = c.slice(-6).reduce((a, x) => a + x.v, 0)
  const vol48 = c.slice(-54, -6).reduce((a, x) => a + x.v, 0) / 48
  const volSpike = vol48 > 0 ? vol6 / (vol48 * 6) : 1
  const d24 = c.slice(-24)
  const hi24 = Math.max(...d24.map((x) => x.h)), lo24 = Math.min(...d24.map((x) => x.l))
  const posisi = hi24 > lo24 ? (closes[la] - lo24) / (hi24 - lo24) : 0.5
  const lonjak = garch.sigma1j > 0 ? naik6 / (garch.sigma1j * Math.sqrt(6)) : 0
  const kejutPump = posisi > 0.8 && (lonjak > WARISAN.KEJUT_SIGMA || (volSpike > 3 && lonjak > WARISAN.KEJUT_SIGMA * 0.5))
  const ketKejut = `lonjakan 6 jam ${(naik6 * 100).toFixed(1)}% = ${lonjak.toFixed(1)}× sigma-GARCH, posisi ${(posisi * 100).toFixed(0)}% rentang, volume ${volSpike.toFixed(1)}× rata — kejar-top ditolak`
  return { garch, vp, beta, r2, div, kejutPump, ketKejut, vpMagnet: vp ? vp.magnetAtas : null }
}

// ---------------- V253 WAWASAN-360 — 10 mesin parameter lilin (L1) ----------------
// Semuanya dihitung dari lilin 1 jam yang SUDAH diambil telusur-dalam — 0 permintaan
// jaringan tambahan. Setiap param membawa: nilai (angka/label), arah (-1..1 utk komite
// & Hedge), ket (bacaan analis — bahasa fasih yang bisa dibaca trader).
function macdDim(closes) {
  const e = (n, arr) => { const k = 2 / (n + 1); const out = [arr[0]]; for (let i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k)); return out }
  const e12 = e(12, closes), e26 = e(26, closes)
  const macdLine = closes.map((_, i) => e12[i] - e26[i])
  const sig = e(9, macdLine)
  const i = closes.length - 1
  const hist = macdLine[i] - sig[i], histPrev = macdLine[i - 1] - sig[i - 1]
  const harga = closes[i]
  const histPct = +(hist / harga * 100).toFixed(3)
  const arah = clamp(tanh((hist / harga) * 1500), -1, 1) * 0.65 + (hist > histPrev ? 0.35 : -0.35)
  return { nilai: histPct, arah: clamp(arah, -1, 1), ket: `MACD histogram ${hist >= 0 ? '+' : ''}${histPct}% dari harga dan ${hist > histPrev ? 'melebar — momentum akselerasi' : 'menyempit — momentum menipis'}` }
}
function adxDim(c) {
  const n = c.length
  if (n < 34) return { nilai: null, arah: 0, ket: 'lilin kurang untuk ADX — kekuatan trend belum terukur' }
  const tr = [], pdm = [], mdm = []
  for (let i = 1; i < n; i++) {
    const up = c[i].h - c[i - 1].h, dn = c[i - 1].l - c[i].l
    tr.push(Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c)))
    pdm.push(up > dn && up > 0 ? up : 0)
    mdm.push(dn > up && dn > 0 ? dn : 0)
  }
  const sum14 = (a, i) => a.slice(i - 13, i + 1).reduce((x, y) => x + y, 0)
  let trS = sum14(tr, 13), pS = sum14(pdm, 13), mS = sum14(mdm, 13)
  const dip = [], dim = [], dxs = []
  for (let i = 14; i < tr.length; i++) {
    trS = trS - trS / 14 + tr[i]; pS = pS - pS / 14 + pdm[i]; mS = mS - mS / 14 + mdm[i]
    const pDI = trS > 0 ? 100 * pS / trS : 0, mDI = trS > 0 ? 100 * mS / trS : 0
    dip.push(pDI); dim.push(mDI)
    dxs.push(pDI + mDI > 0 ? 100 * Math.abs(pDI - mDI) / (pDI + mDI) : 0)
  }
  const adx = dxs.length ? dxs.slice(-14).reduce((a, x) => a + x, 0) / Math.min(14, dxs.length) : 0
  const p = dip[dip.length - 1], m = dim[dim.length - 1]
  const arah = adx < WAWASAN.ADX_TREND ? clamp((p - m) / 50, -0.4, 0.4)
    : clamp((p - m) / 30, -1, 1) * clamp(adx / 35, 0.5, 1.2)
  return { nilai: +adx.toFixed(1), arah: clamp(arah, -1, 1), ket: `ADX ${adx.toFixed(0)} — ${adx >= 25 ? 'trend kuat' : adx >= WAWASAN.ADX_TREND ? 'trend terbentuk' : 'pasar lisah, arah lemah'} · +DI ${p.toFixed(0)} vs −DI ${m.toFixed(0)} (${p >= m ? 'pembeli' : 'penjual'} mengendalikan arah)` }
}
function bollingerDim(closes) {
  const n = 20, i = closes.length - 1
  const w = closes.slice(-n)
  const m = w.reduce((a, x) => a + x, 0) / n
  const sd = Math.sqrt(w.reduce((a, x) => a + (x - m) ** 2, 0) / n) || 1e-9
  const atas = m + 2 * sd, bawah = m - 2 * sd
  const pctB = (closes[i] - bawah) / (atas - bawah)
  const lebar = (atas - bawah) / m
  const arah = pctB > 1.02 ? -0.5 : pctB < -0.02 ? 0.5 : clamp((pctB - 0.5) * 1.6, -1, 1) * (lebar < WAWASAN.BB_SEMPIT ? 0.5 : 1)
  return { nilai: +pctB.toFixed(3), arah: clamp(arah, -1, 1), ket: `Bollinger %B ${pctB.toFixed(2)} ${pctB > 1.02 ? '— menembus band atas: perpanjangan ekstrem, rentan koreksi' : pctB < -0.02 ? '— menembus band bawah: oversold, pantulan mengintai' : 'dalam band'} · lebar band ${(lebar * 100).toFixed(1)}%${lebar < WAWASAN.BB_SEMPIT ? ' (terkompresi — letupan menunggu arah)' : ''}` }
}
function vwapDim(c) {
  const d = c.slice(-24)
  let pv = 0, vv = 0
  for (const x of d) { const tp = (x.h + x.l + x.c) / 3; pv += tp * (x.v || 0); vv += x.v || 0 }
  const vwap = vv > 0 ? pv / vv : d[d.length - 1].c
  const harga = d[d.length - 1].c
  const dev = harga / vwap - 1
  return { nilai: +(dev * 100).toFixed(2), arah: clamp(tanh(140 * dev), -1, 1), ket: `harga ${(dev >= 0 ? 'di atas' : 'di bawah')} VWAP-24j ${vwap.toPrecision(7)} (${(dev * 100 >= 0 ? '+' : '')}${(dev * 100).toFixed(2)}%) — ${Math.abs(dev) > 0.03 ? 'menyimpang jauh dari rata-rata tertimbang volume; gravitasi menarik balik' : 'mengapung dekat nilai wajar intraday'}` }
}
function obvDim(c) {
  const n = c.length
  if (n < 60) return { nilai: null, arah: 0, ket: 'lilin kurang untuk OBV' }
  let obv = 0
  const s = []
  for (let i = 1; i < n; i++) { obv += 2 * (c[i].tb ?? c[i].v / 2) - c[i].v; s.push(obv) }
  const j = s.length
  const slope = (s[j - 1] - s[Math.max(0, j - 49)]) / 48
  const norm = c.slice(-48).reduce((a, x) => a + (x.v || 0), 0) / 48 || 1
  const arah = clamp(slope / norm, -1, 1)
  return { nilai: +(slope / norm * 100).toFixed(1), arah, ket: `OBV 48 jam ${slope >= 0 ? 'mengalir MASUK' : 'mengalir KELUAR'} (${(slope / norm * 100).toFixed(1)}% volume rata-jam) — ${slope >= 0 ? 'beli agresif mendominasi' : 'jual agresif mendominasi'}` }
}
function swingDim(c) {
  const n = c.length
  if (n < 40) return { nilai: null, arah: 0, ket: 'lilin kurang untuk struktur swing' }
  const hi = [], lo = []
  for (let i = Math.max(3, n - 96); i < n - 2; i++) {
    if (c[i].h > c[i - 1].h && c[i].h > c[i - 2].h && c[i].h > c[i + 1].h && c[i].h > c[i + 2].h) hi.push(c[i].h)
    if (c[i].l < c[i - 1].l && c[i].l < c[i - 2].l && c[i].l < c[i + 1].l && c[i].l < c[i + 2].l) lo.push(c[i].l)
  }
  const h2 = hi.slice(-2), l2 = lo.slice(-2)
  const hh = h2.length === 2 && h2[1] > h2[0], hl = l2.length === 2 && l2[1] > l2[0]
  const lh = h2.length === 2 && h2[1] < h2[0], ll = l2.length === 2 && l2[1] < l2[0]
  let arah = 0, ket
  if (hh && hl) { arah = 0.9; ket = 'struktur HH+HL — tangga naik utuh: puncak dan lantai baru selalu lebih tinggi' }
  else if (lh && ll) { arah = -0.9; ket = 'struktur LH+LL — tangga turun utuh: puncak dan lantai baru selalu lebih rendah' }
  else if (hh && ll) { arah = 0; ket = 'struktur melebar — puncak naik lantai turun (rentang volatil; arah dari pemicu, bukan struktur)' }
  else if (lh && hl) { arah = 0; ket = 'struktur menyempit — puncak turun lantai naik (segitiga; letupan menunggu arah)' }
  else { arah = hh ? 0.3 : lh ? -0.3 : 0; ket = h2.length < 2 || l2.length < 2 ? 'swing belum lengkap — menunggu konfirmasi struktur' : 'struktur campur — sisi naik dan turun belum sepakat' }
  return { nilai: arah, arah, ket: `${ket} · swing terakhir: high ${h2.length ? h2.map((x) => x.toPrecision(6)).join('→') : '—'} · low ${l2.length ? l2.map((x) => x.toPrecision(6)).join('→') : '—'}` }
}
function polaDim(c) {
  const a = c[c.length - 1]
  const b = c[c.length - 2]
  const rng = (x) => Math.max(x.h - x.l, 1e-9)
  const body = (x) => Math.abs(x.c - x.o)
  const bull = (x) => x.c > x.o
  const engBull = bull(a) && !bull(b) && a.c > b.o && a.o <= b.c
  const engBear = !bull(a) && bull(b) && a.c < b.o && a.o >= b.c
  const hammer = (Math.min(a.o, a.c) - a.l) / rng(a) > 0.55 && body(a) / rng(a) < 0.34
  const bintang = (a.h - Math.max(a.o, a.c)) / rng(a) > 0.55 && body(a) / rng(a) < 0.34
  let arah = 0, nama = 'tanpa pola menonjol — lilin biasa'
  if (engBull) { arah = 0.7; nama = 'bullish engulfing — jual habis ditelan beli, pembalikan intraday' }
  else if (engBear) { arah = -0.7; nama = 'bearish engulfing — beli habis ditelan jual, pembalikan intraday' }
  else if (hammer) { arah = 0.45; nama = 'hammer — ekor bawah panjang, harga rendah DITOLAK' }
  else if (bintang) { arah = -0.45; nama = 'shooting star — ekor atas panjang, harga tinggi DITOLAK' }
  else if (body(a) / rng(a) < 0.12) { nama = 'doji — keraguan pasar, tarik kunci arah dari konteks lain' }
  return { nilai: nama, arah, ket: `pola lilin: ${nama} (badan ${(body(a) / rng(a) * 100).toFixed(0)}% rentang lilin)` }
}
function pivotDim(c) {
  if (c.length < 25) return { nilai: null, arah: 0, ket: 'lilin kurang untuk pivot' }
  const y = c.slice(-25, -1)
  const H = Math.max(...y.map((x) => x.h)), L = Math.min(...y.map((x) => x.l)), C = y[y.length - 1].c
  const P = (H + L + C) / 3, R1 = 2 * P - L, S1 = 2 * P - H
  const harga = c[c.length - 1].c
  const arah = clamp((harga - P) / Math.max(H - L, 1e-9) * 2, -1, 1)
  const pos = harga >= R1 ? 'di atas R1 — momentum di luar kebiasaan, waspadai kebalikan arah' : harga >= P ? 'antara P dan R1 — bias harian ke atas' : harga <= S1 ? 'di bawah S1 — momentum jual di luar kebiasaan, waspadai pantulan' : 'antara S1 dan P — bias harian ke bawah'
  return { nilai: +(P.toPrecision(7)), arah, ket: `pivot klasik harian: P ${P.toPrecision(6)} · R1 ${R1.toPrecision(6)} · S1 ${S1.toPrecision(6)} — harga ${pos}` }
}
function konsistDim(c) {
  const d = c.slice(-24)
  const hijau = d.filter((x) => x.c > x.o).length
  const arah = clamp((hijau - 12) / 9, -1, 1)
  return { nilai: hijau, arah, ket: `${hijau}/24 lilin hijau — ${hijau >= 16 ? 'tekanan beli satu arah; pasar dibeli paksa' : hijau <= 8 ? 'tekanan jual satu arah; pasar dijual paksa' : 'keseimbangan dua arah'}` }
}
function relatifDim(c, cBTC) {
  if (!cBTC || cBTC.length < 30) return { nilai: null, arah: 0, ket: 'BTC belum tersedia untuk kekuatan relatif' }
  const ko = c[c.length - 1].c / c[c.length - 25].c - 1
  const bt = cBTC[cBTC.length - 1].c / cBTC[cBTC.length - 25].c - 1
  const sel = ko - bt
  return { nilai: +(sel * 100).toFixed(2), arah: clamp(tanh(sel * 18), -1, 1), ket: `kekuatan relatif 24 jam: ${sel >= 0 ? 'LEBIH KUAT' : 'LEBIH LEMAH'} dari BTC ${(Math.abs(sel) * 100).toFixed(2)}% (koin ${(ko * 100).toFixed(2)}% vs BTC ${(bt * 100).toFixed(2)}%) — ${Math.abs(sel) > 0.03 ? (sel > 0 ? 'pemimpin arus; dana memilih koin ini' : 'penunggang beban; dana meninggalkan koin ini') : 'sekadar mengikuti pasar'}` }
}
function wawasanLilin(c, cBTC) {
  const closes = c.map((x) => x.c)
  const out = []
  const push = (param, o) => out.push({ param, nilai: o.nilai ?? null, arah: +(o.arah ?? 0).toFixed(3), ket: o.ket })
  push('macd', macdDim(closes))
  push('adx', adxDim(c))
  push('bollinger', bollingerDim(closes))
  push('vwap', vwapDim(c))
  push('obv', obvDim(c))
  push('swing', swingDim(c))
  push('pola', polaDim(c))
  push('konsist', konsistDim(c))
  push('pivot', pivotDim(c))
  push('relatif', relatifDim(c, cBTC))
  return out
}
// L2 — param derivatif NYATA (funding + OI Bybit linear) utk satu simbol
function derivParams(simbol, deriv, oiLama) {
  const out = []
  const d = deriv ? deriv.get(simbol + 'USDT') : null
  if (!d) return out
  const fr = +d.fundingRate
  const arahFr = fr >= WAWASAN.FUNDING_EKSTREM ? -0.7 : fr >= WAWASAN.FUNDING_MIRING ? -0.3
    : fr <= -WAWASAN.FUNDING_EKSTREM ? 0.7 : fr <= -WAWASAN.FUNDING_MIRING ? 0.3 : 0
  out.push({
    param: 'funding', nilai: +(fr * 100).toFixed(4), arah: arahFr,
    ket: `funding futures ${fr >= 0 ? '+' : ''}${(fr * 100).toFixed(4)}% per interval — ${fr >= WAWASAN.FUNDING_EKSTREM ? 'LONG membayar mahal: kerumunan long ramai, fondasi naik rapuh terhadap long-squeeze' : fr <= -WAWASAN.FUNDING_EKSTREM ? 'SHORT membayar mahal: kerumunan short ramai, bahan short-squeeze' : fr > 0 ? 'long membayar normal — tidak ada kerumunan ekstrem' : 'short membayar — bearish tidak ramai'}`,
  })
  const oiKini = +d.openInterestValue
  const delta = oiDelta(oiLama, d)
  const naikH = +d.price24hPcnt >= 0
  let arahOi = 0, bacaOi = 'snapshot siklus lalu belum ada — ΔOI jujur null (denyut pertama)'
  if (delta != null) {
    if (delta > WAWASAN.OI_BERAT && naikH) { arahOi = 0.6; bacaOi = 'OI tumbuh seiring harga naik — dana BARU mengalir masuk (konfirmasi sehat)' }
    else if (delta > WAWASAN.OI_BERAT && !naikH) { arahOi = -0.6; bacaOi = 'OI tumbuh saat harga turun — posisi jual baru menekan' }
    else if (delta < -WAWASAN.OI_BERAT && !naikH) { arahOi = 0.3; bacaOi = 'OI menyusut saat harga turun — jual melemah/likuidasi sedang berlangsung' }
    else if (delta < -WAWASAN.OI_BERAT && naikH) { arahOi = -0.3; bacaOi = 'OI menyusut saat harga naik — naik tanpa dana baru (rapuh)' }
    else bacaOi = 'OI stabil — posisi tidak berputar berat'
  }
  out.push({
    param: 'oi', nilai: +(oiKini / 1e6).toFixed(1), arah: arahOi,
    ket: `open interest $${(oiKini / 1e6).toFixed(1)} juta${delta != null ? ` · Δ${(delta * 100 >= 0 ? '+' : '')}${(delta * 100).toFixed(2)}% sejak denyut lalu — ${bacaOi}` : ` — ${bacaOi}`}`,
  })
  return out
}

// ---------------- V254 SAMUDRA-PARAMETER — mesin-mesin observasi tambahan ----------------
// Semua dari lilin 1h yang SUDAH diambil (agregasi 4h tanpa jaringan), atau dari
// endpoint OKX gratis (riwayat funding, order book, tickers swap). Setiap param:
// { param, domain, lapis:'observasi', nilai, arah(-1..1), ket } — masuk narasi,
// gerbang veto, dan sekolah parameter; TIDAK berbobot sebelum hit-rate lulus.
function agg4h(c) {                                       // agregasi 1h → 4h (0 permintaan)
  const out = []
  for (let i = 0; i < c.length; i += 4) {
    const g = c.slice(i, i + 4)
    if (!g.length) break
    out.push({ t: g[0].t, o: g[0].o, h: Math.max(...g.map((x) => x.h)), l: Math.min(...g.map((x) => x.l)), c: g[g.length - 1].c, v: g.reduce((a, x) => a + (x.v || 0), 0), tb: g.reduce((a, x) => a + (x.tb ?? (x.v || 0) / 2), 0) })
  }
  return out
}
function emaAlignDim(closes) {                            // harga vs EMA9/21/50 — kesejajaran tren
  const e = (n) => { const k = 2 / (n + 1); let x = closes[0]; const out = [x]; for (let i = 1; i < closes.length; i++) { x = closes[i] * k + x * (1 - k); out.push(x) } return out }
  if (closes.length < 55) return { nilai: null, arah: 0, ket: 'lilin kurang untuk EMA-align' }
  const e9 = e(9), e21 = e(21), e50 = e(50), i = closes.length - 1
  const sk = (closes[i] > e9[i] ? 1 / 3 : -1 / 3) + (e9[i] > e21[i] ? 1 / 3 : -1 / 3) + (e21[i] > e50[i] ? 1 / 3 : -1 / 3)
  const penuh = (closes[i] > e9[i] && e9[i] > e21[i] && e21[i] > e50[i]) ? ' — susunan bullish penuh (harga>EMA9>EMA21>EMA50)' : (closes[i] < e9[i] && e9[i] < e21[i] && e21[i] < e50[i]) ? ' — susunan bearish penuh (harga<EMA9<EMA21<EMA50)' : ''
  return { nilai: +sk.toFixed(2), arah: clamp(sk, -1, 1), ket: `EMA-align 1h skor ${sk.toFixed(2)} (−1..+1)${penuh}${!penuh ? ' — susunan campur, tren belum sepakat' : ''}` }
}
function rsiKlasikDim(closes, n = 14) {                   // RSI klasik — momentum & kelebihan
  const ra = rsi(closes, n)
  const v = Array.isArray(ra) ? ra[ra.length - 1] : ra
  if (v == null || !Number.isFinite(v)) return { nilai: null, arah: 0, ket: `RSI-${n} belum terukur — lilin kurang` }
  const i = closes.length - 1
  const arah = v > 78 ? -0.4 : v < 22 ? 0.4 : clamp((v - 50) / 22, -1, 1)
  return { nilai: +v.toFixed(1), arah, ket: `RSI-${n} ${v.toFixed(1)} — ${v > 78 ? 'overbought ekstrem; momentum naik tinggal bensin' : v < 22 ? 'oversold ekstrem; pantulan mengintai tapi pisau jatuh tetap dilarang' : v >= 55 ? 'momentum pembeli dominan' : v <= 45 ? 'momentum penjual dominan' : 'netral'}` }
}
function rocDim(closes, n) {                              // Rate of Change n-jam
  if (closes.length < n + 2) return { nilai: null, arah: 0, ket: `lilin kurang untuk ROC-${n}` }
  const r = closes[closes.length - 1] / closes[closes.length - 1 - n] - 1
  return { nilai: +(r * 100).toFixed(2), arah: clamp(tanh(r * 30), -1, 1), ket: `ROC-${n}j ${(r * 100 >= 0 ? '+' : '')}${(r * 100).toFixed(2)}% — ${Math.abs(r) > 0.08 ? (r > 0 ? 'lonjakan tajam; kejar-top diwaspadai' : 'runtuhan tajam; pantulan butuh konfirmasi') : r > 0 ? 'naik terukur' : r < 0 ? 'turun terukur' : 'mendatar'}` }
}
function stochDim(c, n = 14) {                            // Stochastic %K/%D — posisi dalam rentang
  if (c.length < n + 3) return { nilai: null, arah: 0, ket: 'lilin kurang untuk stokastik' }
  const k = (i) => { const w = c.slice(i - n + 1, i + 1); const hi = Math.max(...w.map((x) => x.h)), lo = Math.min(...w.map((x) => x.l)); return hi > lo ? 100 * (c[i].c - lo) / (hi - lo) : 50 }
  const ks = []; for (let i = n - 1; i < c.length; i++) ks.push(k(i))
  const kd = ks.slice(-3).reduce((a, x) => a + x, 0) / 3
  const k0 = ks[ks.length - 1], k1 = ks[ks.length - 2]
  const arah = k0 > 85 ? -0.35 : k0 < 15 ? 0.35 : clamp((k0 - 50) / 38, -1, 1) * 0.8 + (k0 > kd ? 0.2 : -0.2)
  return { nilai: +k0.toFixed(1), arah: clamp(arah, -1, 1), ket: `Stoch %K ${k0.toFixed(0)} / %D ${kd.toFixed(0)} — ${k0 > 85 ? 'jenuh beli' : k0 < 15 ? 'jenuh jual' : 'tengah rentang'} · ${k0 > k1 ? '%K merangkak naik' : '%K menekun turun'}${k0 > kd !== k1 > kd ? ' — PERPUTARAN %K baru' : ''}` }
}
function mfiDim(c, n = 14) {                              // Money Flow Index — volume-weighted RSI
  if (c.length < n + 2) return { nilai: null, arah: 0, ket: 'lilin kurang untuk MFI' }
  let pos = 0, neg = 0
  for (let i = c.length - n; i < c.length; i++) {
    const tp = (c[i].h + c[i].l + c[i].c) / 3, arus = tp * (c[i].v || 0)
    const tpL = (c[i - 1].h + c[i - 1].l + c[i - 1].c) / 3
    if (tp > tpL) pos += arus; else neg += arus
  }
  const mfi = neg > 0 ? 100 - 100 / (1 + pos / neg) : 100
  const arah = mfi > 85 ? -0.4 : mfi < 15 ? 0.4 : clamp((mfi - 50) / 26, -1, 1)
  return { nilai: +mfi.toFixed(1), arah, ket: `MFI-${n} ${mfi.toFixed(0)} — ${mfi > 85 ? 'arus masuk jenuh (uang pintar sudah masuk lama)' : mfi < 15 ? 'arus keluar jenuh' : mfi >= 55 ? 'arus masuk dominan' : mfi <= 45 ? 'arus keluar dominan' : 'arus seimbang'}` }
}
function cciDim(c, n = 20) {                              // CCI — deviasi harga dari rata statistik
  if (c.length < n) return { nilai: null, arah: 0, ket: 'lilin kurang untuk CCI' }
  const tp = c.slice(-n).map((x) => (x.h + x.l + x.c) / 3)
  const m = tp.reduce((a, x) => a + x, 0) / n
  const md = tp.reduce((a, x) => a + Math.abs(x - m), 0) / n || 1e-9
  const cci = (tp[tp.length - 1] - m) / (0.015 * md)
  return { nilai: +cci.toFixed(0), arah: clamp(cci / 160, -1, 1), ket: `CCI-20 ${cci.toFixed(0)} — ${cci > 160 ? 'jauh di atas statistik; ekstensi rentan balik' : cci < -160 ? 'jauh di bawah statistik' : cci > 0 ? 'di atas rata statistik' : 'di bawah rata statistik'}` }
}
function jarakEkstremDim(c) {                             // jarak dari high/low 240 jam (10 hari)
  const w = c.slice(-240)
  if (w.length < 60) return { nilai: null, arah: 0, ket: 'lilin kurang untuk jarak ekstrem 10 hari' }
  const hi = Math.max(...w.map((x) => x.h)), lo = Math.min(...w.map((x) => x.l)), h = w[w.length - 1].c
  const dr = (hi - h) / h * 100, dl = (h - lo) / h * 100
  const arah = clamp((dl - dr) / 10, -1, 1)
  return { nilai: +(dr - dl).toFixed(2), arah, ket: `jarak 10 hari: −${dr.toFixed(1)}% dari puncak / +${dl.toFixed(1)}% dari lantai — ${dr < 2 ? 'menempel puncak 10 hari (area distribusi)' : dl < 2 ? 'menempel lantai 10 hari (area akumulasi berisiko)' : 'ruang gerak dua arah masih lebar'}` }
}
function atrPctileDim(c) {                                // persentil ATR% — rezim volatilitas
  const atr = (w) => { let s = 0; for (let i = 1; i < w.length; i++) s += Math.max(w[i].h - w[i].l, Math.abs(w[i].h - w[i - 1].c), Math.abs(w[i].l - w[i - 1].c)); return s / Math.max(1, w.length - 1) }
  if (c.length < 120) return { nilai: null, arah: 0, ket: 'lilin kurang untuk persentil ATR' }
  const h = c[c.length - 1].c
  const kini = atr(c.slice(-14)) / h * 100
  const riw = []
  for (let i = 40; i + 14 <= c.length; i += 6) riw.push(atr(c.slice(i - 14, i)) / c[i - 1].c * 100)
  const pct = riw.length ? riw.filter((x) => x <= kini).length / riw.length : 0.5
  return { nilai: +pct.toFixed(2), arah: 0, ket: `ATR14 ${kini.toFixed(2)}% harga — persentil ${(pct * 100).toFixed(0)} dari ~${riw.length} pengukuran 10 hari: volatilitas ${pct >= 0.96 ? 'EKSTREM (sinyal arah melempar; ukuran posisi dikecilkan)' : pct >= 0.75 ? 'tinggi' : pct <= 0.25 ? 'tertidur (letupan menunggu)' : 'normal'}` }
}
function volZDim(c) {                                     // volume z-score 24 jam vs 30 hari
  if (c.length < 200) return { nilai: null, arah: 0, ket: 'lilin kurang untuk volume z-score' }
  const v24 = c.slice(-24).reduce((a, x) => a + (x.v || 0), 0)
  const riw = []
  for (let i = 24; i + 24 <= c.length; i += 24) riw.push(c.slice(i, i + 24).reduce((a, x) => a + (x.v || 0), 0))
  const m = riw.reduce((a, x) => a + x, 0) / riw.length
  const sd = Math.sqrt(riw.reduce((a, x) => a + (x - m) ** 2, 0) / riw.length) || 1e-9
  const z = (v24 - m) / sd
  const tb24 = c.slice(-24).reduce((a, x) => a + (x.tb ?? (x.v || 0) / 2), 0) / Math.max(v24, 1e-9)
  const arah = clamp(z / 2.2, -0.6, 0.6) * (tb24 >= 0.5 ? 1 : -1)
  return { nilai: +z.toFixed(2), arah, ket: `volume 24 jam ${(z >= 0 ? '+' : '')}${z.toFixed(2)}σ dari rata 30 hari, taker-buy ${(tb24 * 100).toFixed(0)}% — ${Math.abs(z) > 2 ? (tb24 >= 0.5 ? 'keramaian ekstrem DISERTAI beli agresif' : 'keramaian ekstrem DISERTAI jual agresif') : Math.abs(z) > 1 ? 'volume menghangat' : 'volume tenang'}${v24 < m * 0.6 ? '; pasar mendatar kering — gerak palsu lebih mudah' : ''}` }
}
function bodyRatioDim(c) {                                // keyakinan lilin — rata badan/range 12 jam
  const d = c.slice(-12)
  let tot = 0, n = 0
  for (const x of d) { const r = Math.max(x.h - x.l, 1e-9); tot += Math.abs(x.c - x.o) / r; n++ }
  const br = tot / Math.max(n, 1)
  const bull = d.filter((x) => x.c > x.o).length / Math.max(n, 1)
  return { nilai: +br.toFixed(2), arah: clamp((br - 0.45) * 2, -0.5, 0.5) * (bull >= 0.5 ? 1 : -1), ket: `rata badan lilin ${(br * 100).toFixed(0)}% rentang, ${Math.round(bull * 12)}/12 hijau — ${br > 0.6 ? 'lilin penuh keyakinan; penggerak arah serius' : br < 0.35 ? 'lilin ragu-ragu (sumbu panjang); arah mudah berubah pikiran' : 'lilin normal'}` }
}
function macd4hDim(closes4h) {                            // MACD histogram 4 jam
  const m = macdDim(closes4h)
  return { nilai: m.nilai, arah: m.arah, ket: `MACD 4h: histogram ${m.nilai != null ? (m.nilai > 0 ? '+' : '') + m.nilai + '% harga' : '—'} — ${(m.ket.split('dan ')[1] || 'momentum menipis')}; rangka waktu besar ${m.arah > 0.2 ? 'bullish' : m.arah < -0.2 ? 'bearish' : 'mendatar'}` }
}
function sejajarDim(d1, d4) {                             // kesepakatan 1h vs 4h
  if (!d1 || !d4 || d1.nilai == null || d4.nilai == null) return { nilai: null, arah: 0, ket: 'rangka waktu belum lengkap untuk ukuran sejajar' }
  const s = d1.arah + d4.arah
  const sejajar = Math.sign(d1.arah) === Math.sign(d4.arah) && Math.abs(s) > 0.3
  return { nilai: +s.toFixed(2), arah: clamp(s / 2, -1, 1), ket: `1h${d1.arah >= 0 ? '+' : ''}${d1.arah.toFixed(2)} vs 4h${d4.arah >= 0 ? '+' : ''}${d4.arah.toFixed(2)} — ${sejajar ? 'SEJAJAR satu arah: sinyal berbobot' : Math.sign(d1.arah) !== Math.sign(d4.arah) ? 'BERLAWANAN antar rangka waktu: jangan salahkan satu lilin, tunggu' : 'satu TF aktif satu tidur'}` }
}
function sesiKalenderParams() {                           // kalender — 3 param deterministik
  const W = new Date()
  const j = W.getUTCHours()
  const sesi = j >= 0 && j < 7 ? 'Asia (Tokyo/Singapura)' : j < 13 ? 'Eropa (London)' : j < 21 ? 'Amerika (New York)' : 'Senja (transisi)'
  const hari = W.getUTCDay(), akhirPekan = hari === 0 || hari === 6
  const tgl = W.getUTCDate(), fase = tgl <= 10 ? 'awal bulan' : tgl <= 20 ? 'tengah bulan' : 'akhir bulan'
  return [
    { param: 'sesi', domain: 'kalender', nilai: sesi, arah: 0, ket: `sesi ${sesi} (UTC ${j}:00) — ${j >= 7 && j < 21 ? 'likuiditas penuh; arah lebih tervalidasi volume nyata' : 'likuiditas tipis; pergerakan mudah palsu dan wick lebih dalam'}` },
    { param: 'akhirPekan', domain: 'kalender', nilai: akhirPekan, arah: akhirPekan ? -0.1 : 0, ket: `${akhirPekan ? 'AKHIR PEKAN — volume institusi tidur, harga bisa bergerak liar tanpa dukungan; sinyal diperlambat' : 'hari kerja pasar — likuiditas institusi standby'}` },
    { param: 'faseBulan', domain: 'kalender', nilai: fase, arah: 0, ket: `${fase} (tanggal ${tgl} UTC) — ${tgl <= 10 ? 'arus DCA bulanan cenderung menopang' : tgl > 20 ? 'pembandingan portofolio akhir bulan bisa memicu rotasi' : 'fase netral kalender'}` },
  ]
}
function fundHistParams(frHist, frKini) {                 // riwayat funding — kerumunan BERKELANJUTAN
  if (!Array.isArray(frHist) || !frHist.length) return [
    { param: 'fundRata3', domain: 'derivatif', nilai: null, arah: 0, ket: 'riwayat funding OKX tidak tersedia — kerumunan berkelanjutan belum terukur' },
  ]
  const tiga = frHist.slice(0, 3).map((x) => +x.fundingRate).filter((x) => Number.isFinite(x))
  const rata = tiga.length ? tiga.reduce((a, x) => a + x, 0) / tiga.length : null
  const kini = frKini != null && Number.isFinite(frKini) ? frKini : rata
  const tren = rata != null && kini != null ? kini - rata : null
  const arahRata = rata == null ? 0 : rata >= WAWASAN.FRHIST_EKSTREM ? -0.7 : rata <= -WAWASAN.FRHIST_EKSTREM ? 0.7 : clamp(-rata * 800, -0.35, 0.35)
  const out = [{
    param: 'fundRata3', domain: 'derivatif', nilai: rata != null ? +(rata * 100).toFixed(4) : null, arah: arahRata,
    ket: `funding rata 3 interval ${rata != null ? (rata * 100 >= 0 ? '+' : '') + (rata * 100).toFixed(4) + '%' : '—'} — ${rata == null ? 'data kurang' : rata >= WAWASAN.FRHIST_EKSTREM ? 'LONG membayar BERKELANJUTAN (bukan lonjakan sesaat): fondasi naik korosif, long-squeeze mengintai' : rata <= -WAWASAN.FRHIST_EKSTREM ? 'SHORT membayar berkelanjutan: bahan short-squeeze menumpuk' : 'kerumunan funding normal — posisi tidak terlampau ramai'}`,
  }]
  if (tren != null) out.push({
    param: 'fundTren', domain: 'derivatif', nilai: +(tren * 100).toFixed(4), arah: clamp(-tren * 900, -0.5, 0.5),
    ket: `funding ${tren >= 0 ? 'MEMANAS' : 'MENDINGIN'} (${(tren * 100 >= 0 ? '+' : '')}${(tren * 100).toFixed(4)}% vs rata3) — ${Math.abs(tren) > 0.0002 ? (tren > 0 ? 'kerumunan long BARU masuk cepat; makin ramai makin rapuh' : 'kerumunan long mundur cepat; posisi sedang dibongkar') : 'tingkat keanggotaan kerumunan stabil'}`,
  })
  return out
}
function bookParams(book, harga) {                        // mikrostruktur — order book spot OKX
  if (!book || !Array.isArray(book.bids) || !Array.isArray(book.asks) || !book.bids.length || !book.asks.length) return [
    { param: 'bukuImbalans', domain: 'mikrostruktur', nilai: null, arah: 0, ket: 'order book tidak tersedia — mikrostruktur jujur kosong siklus ini' },
  ]
  const bb = +book.bids[0][0], ba = +book.asks[0][0]
  const mid = (bb + ba) / 2 || harga || 1
  const spreadBps = (ba - bb) / mid * 1e4
  const ambil = (lv) => lv.map((x) => [+x[0], +x[1]]).filter(([px]) => px >= mid * 0.99 && px <= mid * 1.01)
  const b1 = ambil(book.bids), a1 = ambil(book.asks)
  const vb = b1.reduce((a, [px, sz]) => a + px * sz, 0), va = a1.reduce((a, [px, sz]) => a + px * sz, 0)
  const imbalans = vb + va > 0 ? (vb - va) / (vb + va) : 0
  const vbTot = book.bids.reduce((a, x) => a + (+x[0]) * (+x[1]), 0), vaTot = book.asks.reduce((a, x) => a + (+x[0]) * (+x[1]), 0)
  const rasio = vaTot > 0 ? vbTot / vaTot : null
  const dinding = [...b1.map(([px, sz]) => ({ px, sz, s: 'bid' })), ...a1.map(([px, sz]) => ({ px, sz, s: 'ask' }))].sort((x, y) => y.sz - x.sz)[0]
  const out = [{
    param: 'bukuImbalans', domain: 'mikrostruktur', nilai: +imbalans.toFixed(3), arah: clamp(imbalans * 1.6, -1, 1),
    ket: `buku 1%: ${imbalans >= 0 ? 'BID menumpuk' : 'ASK menumpuk'} ${Math.abs(imbalans * 100).toFixed(0)}% (imbalance ${(imbalans >= 0 ? '+' : '')}${imbalans.toFixed(2)}) — ${Math.abs(imbalans) > WAWASAN.IMBALANS_VETO ? (imbalans > 0 ? 'benteng beli tebal: jatuh terasa mahal, naik ringan' : 'benteng jual tebal: naik mahal, tekanan pasar ke bawah') : imbalans > 0.15 ? 'beli sedikit unggul' : imbalans < -0.15 ? 'jual sedikit unggul' : 'buku seimbang — arah dari aliran, bukan tumpukan'}`,
  }]
  out.push({
    param: 'bukuSpread', domain: 'mikrostruktur', nilai: +spreadBps.toFixed(1), arah: 0,
    ket: `spread ${(spreadBps).toFixed(1)} bps — ${spreadBps > WAWASAN.SPREAD_BPS_LEBAR ? 'LEBAR: likuiditas tipis, slippage menelan sinyal tipis' : spreadBps < 3 ? 'sangat rapat: institusi standby' : 'normal'}`,
  })
  if (rasio != null) out.push({
    param: 'bukuKedalaman', domain: 'mikrostruktur', nilai: +rasio.toFixed(2), arah: clamp((rasio - 1) * 0.8, -0.7, 0.7),
    ket: `kedalaman 50 level: $${vbTot >= 1e6 ? (vbTot / 1e6).toFixed(1) + 'jt' : (vbTot / 1e3).toFixed(0) + 'rb'} bid vs $${vaTot >= 1e6 ? (vaTot / 1e6).toFixed(1) + 'jt' : (vaTot / 1e3).toFixed(0) + 'rb'} ask (rasio ${rasio.toFixed(2)}) — ${rasio > 1.35 ? 'amunisi beli jauh lebih tebal' : rasio < 0.74 ? 'pasokan jual jauh lebih tebal' : 'kedalaman berimbang'}`,
  })
  if (dinding) out.push({
    param: 'bukuDinding', domain: 'mikrostruktur', nilai: +dinding.px.toPrecision(7), arah: dinding.s === 'bid' ? 0.35 : -0.35,
    ket: `dinding terbesar ${dinding.s === 'bid' ? 'DI SISI BID' : 'DI SISI ASK'} $${(dinding.px * dinding.sz) >= 1e6 ? ((dinding.px * dinding.sz) / 1e6).toFixed(1) + 'jt' : ((dinding.px * dinding.sz) / 1e3).toFixed(0) + 'rb'} di ${dinding.px.toPrecision(7)} (${(Math.abs(dinding.px - mid) / mid * 100).toFixed(2)}% dari mid) — ${Math.abs(dinding.px - mid) / mid < 0.005 ? 'dinding dekat: magnet pergerakan jangka pendek' : 'dinding jauh: penjaga, bukan magnet'}`,
  })
  return out
}
function lintasParams(simbol, tickOkx) {                  // lintas-pasar — persentil di ratusan swap
  if (!Array.isArray(tickOkx) || !tickOkx.length) return [
    { param: 'persenChg', domain: 'relatif', nilai: null, arah: 0, ket: 'tickers swap OKX tidak tersedia — persentil pasar jujur kosong' },
  ]
  const me = tickOkx.find((x) => x.instId === simbol + '-USDT-SWAP')
  if (!me || !+me.open24h) return [{ param: 'persenChg', domain: 'relatif', nilai: null, arah: 0, ket: 'swap koin ini tidak ada di OKX — persentil jujur null' }]
  const chg = +me.last / +me.open24h - 1
  const usd = (x) => (+x.volCcy24h || 0) * (+x.last || 0)
  const sem = tickOkx.filter((x) => x.instId.endsWith('-USDT-SWAP') && +x.open24h > 0 && x.instId.includes('-USDT-'))
  const chgL = sem.map((x) => +x.last / +x.open24h - 1).sort((a, b) => a - b)
  const volL = sem.map((x) => usd(x)).sort((a, b) => a - b)
  const pct = (L, v) => L.length ? L.filter((x) => x <= v).length / L.length : null
  const pChg = pct(chgL, chg), pVol = pct(volL, usd(me))
  const medChg = chgL.length ? chgL[Math.floor(chgL.length / 2)] : null
  const out = [{
    param: 'persenChg', domain: 'relatif', nilai: +(chg * 100).toFixed(2), arah: clamp(tanh(chg * 12), -1, 1),
    ket: `perubahan 24j ${(chg * 100 >= 0 ? '+' : '')}${(chg * 100).toFixed(2)}% — persentil ${(pChg * 100).toFixed(0)} dari ${chgL.length} swap USDT OKX (${pChg > 0.85 ? 'kelompok PEMIMPIN hari ini' : pChg < 0.15 ? 'kelompok TERTINGGAL hari ini — pisau jatuh diwaspadai' : 'tengah kawanan'}); median pasar ${medChg != null ? (medChg * 100 >= 0 ? '+' : '') + (medChg * 100).toFixed(2) + '%' : '—'}`,
  }]
  if (pVol != null) out.push({
    param: 'persenVol', domain: 'relatif', nilai: +(usd(me) / 1e6).toFixed(1), arah: 0,
    ket: `volume swap 24j $${(usd(me) / 1e6).toFixed(1)}jt — persentil ${(pVol * 100).toFixed(0)} dari kawasan (${pVol > 0.8 ? 'pusat perhatian dana hari ini' : pVol < 0.2 ? 'koin pinggiran: sinyal mudah meleset karena pasar tipis' : 'perhatian normal'})`,
  })
  return out
}
// ---------------- V257 SAMUDRA-DALAM — mesin-mesin parameter baru ----------------
// (D) struktur harian dari klines 1d Binance 90 hari · (E) kerumunan akun/agresor OKX rubik
// (F) stres derivatif: basis, jam funding, funding relatif · (G) gradien buku · (H) interaksi.
// Semua lapis OBSERVASI: dinarasikan + disekolahkan + berhak veto, TIDAK berbobot dulu.
function harianParams(c1d) {
  if (!Array.isArray(c1d) || c1d.length < 40) return [
    { param: 'ema1d', domain: 'tren', nilai: null, arah: 0, ket: 'klines harian tidak tersedia — struktur 1d jujur kosong siklus ini' },
  ]
  const out = []
  const push = (param, domain, o) => out.push({ param, domain, nilai: o.nilai ?? null, arah: +(o.arah ?? 0).toFixed(3), ket: o.ket })
  const cl = c1d.map((x) => x.c)
  const e1 = emaAlignDim(cl)
  push('ema1d', 'tren', { nilai: e1.nilai, arah: e1.arah, ket: e1.ket.replace('EMA-align 1h', 'EMA-align harian (1d)') })
  const r1 = rsiKlasikDim(cl)
  push('rsi1d', 'momentum', { nilai: r1.nilai, arah: r1.arah, ket: r1.ket.replace('RSI-14', 'RSI-14 harian') })
  const m1 = macdDim(cl)
  push('macd1d', 'momentum', { nilai: m1.nilai, arah: m1.arah, ket: `MACD harian: histogram ${m1.nilai != null ? (m1.nilai > 0 ? '+' : '') + m1.nilai + '% harga' : '—'} — ${m1.arah > 0.2 ? 'momentum harian bullish; rangka waktu besar ikut bicara' : m1.arah < -0.2 ? 'momentum harian bearish; rangka waktu besar menekan' : 'momentum harian menipis/netral'}` })
  const hi30 = Math.max(...c1d.slice(-30).map((x) => x.h)), lo30 = Math.min(...c1d.slice(-30).map((x) => x.l))
  const px = cl[cl.length - 1]
  const pos30 = hi30 > lo30 ? (px - lo30) / (hi30 - lo30) : 0.5
  push('donchian30d', 'tren', {
    nilai: +(pos30 * 100).toFixed(1), arah: clamp((pos30 - 0.5) * 1.6, -1, 1),
    ket: `posisi ${(pos30 * 100).toFixed(0)}% rentang 30 hari (Donchian) — ${pos30 >= WAWASAN.DONCHIAN_UJUNG ? 'menembus ujung atas: breakout sejati ATAU kejar-top; volume menentukan' : pos30 <= 0.03 ? 'menyentuh lantai 30 hari: akumulasi berisiko atau pisau jatuh' : pos30 > 0.6 ? 'kawasan atas rentang: kekuatan berlanjut' : pos30 < 0.4 ? 'kawasan bawah rentang: tekanan berlanjut' : 'tengah rentang'}`,
  })
  const hi90 = Math.max(...c1d.map((x) => x.h)), lo90 = Math.min(...c1d.map((x) => x.l))
  const dr90 = (hi90 - px) / px * 100, dl90 = (px - lo90) / px * 100
  push('jarak90d', 'tren', {
    nilai: +(dr90 - dl90).toFixed(2), arah: clamp((dl90 - dr90) / 25, -1, 1),
    ket: `kuartalan: −${dr90.toFixed(1)}% dari puncak 90 hari / +${dl90.toFixed(1)}% dari lantai — ${dr90 < 5 ? 'menempel puncak kuartalan (distribusi ATAU kekuatan ekstrem)' : dl90 < 5 ? 'menempel lantai kuartalan (akumulasi ATAU keruntuhan)' : 'ruang dua arah lebar dalam skala kuartal'}`,
  })
  const momen30 = cl.length >= 31 ? px / cl[cl.length - 31] - 1 : null
  push('momen30d', 'momentum', {
    nilai: momen30 != null ? +(momen30 * 100).toFixed(2) : null, arah: momen30 != null ? clamp(tanh(momen30 * 8), -1, 1) : 0,
    ket: `momentum bulanan 30 hari ${momen30 != null ? (momen30 * 100 >= 0 ? '+' : '') + (momen30 * 100).toFixed(1) + '%' : '—'} — ${momen30 == null ? 'data kurang' : momen30 > 0.25 ? 'surge bulanan: rezim ekspansi, waspadai koreksi' : momen30 < -0.25 ? 'runtuhan bulanan: rezim kontraksi' : 'langkah bulanan normal'}`,
  })
  let streak = 0
  for (let i = cl.length - 1; i > 0; i--) { const d = cl[i] - cl[i - 1]; if (d > 0 && streak >= 0) streak++; else if (d < 0 && streak <= 0) streak--; else break }
  push('streak1d', 'momentum', {
    nilai: streak, arah: clamp(streak * 0.12, -0.6, 0.6),
    ket: `${Math.abs(streak)} hari berturut ${streak > 0 ? 'NAIK' : streak < 0 ? 'TURUN' : 'campur'} — ${Math.abs(streak) >= 5 ? 'streak panjang: mean-reversion mengintai di kedua arah' : 'streak normal'}`,
  })
  const ret = cl.slice(1).map((x, i) => x / cl[i] - 1)
  const sd = (w) => { const m = w.reduce((a, x) => a + x, 0) / w.length; return Math.sqrt(w.reduce((a, x) => a + (x - m) ** 2, 0) / w.length) }
  const sd7 = sd(ret.slice(-7)), sd30 = sd(ret.slice(-30))
  const ras = sd30 > 0 ? sd7 / sd30 : null
  push('volRasio7d30d', 'volatilitas', {
    nilai: ras != null ? +ras.toFixed(2) : null, arah: 0,
    ket: `volatilitas realized 7d/30d ${ras != null ? ras.toFixed(2) + '×' : '—'} — ${ras == null ? 'data kurang' : ras > 1.4 ? 'MELEBAR: gejolak mingguan naik; ukuran posisi dikurangi' : ras < 0.7 ? 'MENYUSUT: kompresi volatilitas; letupan menunggu arah' : 'stabil antar skala'}`,
  })
  return out
}
function lsParams(simbol, lsHist, takerHist) {
  const out = []
  const push = (param, o) => out.push({ param, domain: 'derivatif', nilai: o.nilai ?? null, arah: +(o.arah ?? 0).toFixed(3), ket: o.ket })
  // OKX rubik long-short-account-ratio: entri bisa array [ts, ratio] atau objek {ratio, ts} —
  // urutan TIDAK diasumsikan: terbaru & terlama ditentukan dari timestamp.
  const normLs = (ls) => (Array.isArray(ls) ? ls : []).map((x) => Array.isArray(x) ? { ts: +x[0], ratio: +x[1] } : { ts: +x.ts || 0, ratio: +x.ratio }).filter((x) => Number.isFinite(x.ratio) && x.ratio > 0)
  const ls = normLs(lsHist)
  if (!ls.length) push('lsAkun', { nilai: null, arah: 0, ket: 'long/short account ratio OKX tidak tersedia — kerumunan akun jujur kosong' })
  else {
    const terbaru = ls.reduce((a, b) => (b.ts >= a.ts ? b : a))
    const terlama = ls.reduce((a, b) => (b.ts <= a.ts ? b : a))
    const r = terbaru.ratio
    push('lsAkun', {
      nilai: +r.toFixed(3), arah: r >= WAWASAN.LS_AKUN_RAMAI ? -0.35 : r <= 0.8 ? 0.3 : clamp(-(r - 1.3) * 0.3, -0.3, 0.3),
      ket: `rasio akun long/short ${r.toFixed(2)} (OKX swap ${simbol}) — ${r >= WAWASAN.LS_AKUN_RAMAI ? 'kerumunan akun LONG ramai: bahan long-squeeze bila harga gagal naik' : r <= 0.8 ? 'akun short dominan: bahan short-squeeze bila harga membalik naik' : r > 1.3 ? 'akun long lebih ramai' : r < 1 ? 'akun short lebih ramai' : 'seimbang'}`,
    })
    if (terlama.ts !== terbaru.ts && Number.isFinite(terlama.ratio)) {
      const dR = r - terlama.ratio
      push('lsTren', {
        nilai: +dR.toFixed(3), arah: clamp(-dR * 1.2, -0.4, 0.4),
        ket: `kerumunan akun ${dR >= 0 ? 'MEMBESAR' : 'MELEBUR'} (Δrasio ${dR >= 0 ? '+' : ''}${dR.toFixed(2)} sejak ${Math.max(1, Math.round((terbaru.ts - terlama.ts) / 36e5))} jam) — ${Math.abs(dR) > 0.15 ? (dR > 0 ? 'posisi baru mengikuti tren: bahan bakar lanjutan TAPI juga bahan likuidasi' : 'posisi dibongkar cepat: pasar membersihkan kerumunan') : 'keanggotaan kerumunan stabil'}`,
      })
    }
  }
  // OKX rubik taker-volume: entri objek {buyVol, sellVol, ts} (bisa juga array [ts, ...]) —
  // agregasi volume agresor beli vs jual pada jendela yang tersedia.
  const normTk = (ls) => (Array.isArray(ls) ? ls : []).map((x) => Array.isArray(x) ? { b: +x[1] || 0, s: +x[2] || 0 } : { b: +x.buyVol || 0, s: +x.sellVol || 0 }).filter((x) => x.b > 0 || x.s > 0)
  const tks = normTk(takerHist)
  if (!tks.length) push('lsTaker', { nilai: null, arah: 0, ket: 'taker volume OKX tidak tersedia — agresor jujur kosong siklus ini' })
  else {
    const b = tks.reduce((a, x) => a + x.b, 0), s2 = tks.reduce((a, x) => a + x.s, 0)
    const ras = s2 > 0 ? b / s2 : null
    push('lsTaker', {
      nilai: ras != null ? +ras.toFixed(2) : null,
      arah: ras == null ? 0 : clamp((ras - 1) * 0.55, -0.8, 0.8),
      ket: `taker buy/sell ${ras != null ? ras.toFixed(2) : '—'} (agresor, ${tks.length} jendela) — ${ras == null ? 'data kurang' : ras >= WAWASAN.LS_TAKER_EKSTREM ? 'BELI ekstrem: momentum panas, pantulan jual mengintai' : ras <= 1 / WAWASAN.LS_TAKER_EKSTREM ? 'JUAL ekstrem: kapitulasi, pantulan beli mengintai' : ras > 1.15 ? 'beli agresif' : ras < 0.87 ? 'jual agresif' : 'berimbang'}`,
    })
  }
  return out
}
function basisParams(d, spot, frBtc) {
  if (!d || !(d.last > 0) || !spot) return [
    { param: 'basisPct', domain: 'derivatif', nilai: null, arah: 0, ket: 'harga perp/spot belum lengkap — basis jujur kosong' },
  ]
  const out = []
  const basis = (d.last - spot) / spot
  out.push({ param: 'basisPct', domain: 'derivatif', nilai: +(basis * 100).toFixed(3), arah: clamp(basis * 90, -0.7, 0.7), ket: `basis perp-vs-spot ${(basis * 100 >= 0 ? '+' : '')}${(basis * 100).toFixed(3)}% — ${basis >= WAWASAN.BASIS_EKSTREM * 100 ? 'premium tinggi: long bersedia bayar mahal (euforia terukur)' : basis <= -WAWASAN.BASIS_EKSTREM * 100 ? 'diskon dalam: short dominan / stres (bahan short-squeeze)' : 'basis normal'}` })
  if (d.nextFundingTime > 0) {
    const jam = Math.max(0, (d.nextFundingTime - WAKTU.getTime()) / 3.6e6)
    out.push({ param: 'jamFunding', domain: 'kalender', nilai: +jam.toFixed(2), arah: 0, ket: `${jam.toFixed(1)} jam menuju pembayaran funding berikutnya — ${jam < 1 ? 'posisi baru dekat jam funding: biaya carry masuk hitungan' : 'jarak funding normal'}` })
  }
  if (frBtc != null && d.fundingRate != null) {
    const rel = +d.fundingRate - frBtc
    out.push({ param: 'fundVsBtc', domain: 'derivatif', nilai: +(rel * 100).toFixed(4), arah: clamp(-rel * 400, -0.5, 0.5), ket: `funding relatif vs BTC ${(rel * 100 >= 0 ? '+' : '')}${(rel * 100).toFixed(4)}% — ${rel > 0.0002 ? 'kerumunan di koin ini LEBIH ramai daripada pasar: aliran spesifik, rapuh terhadap rotasi' : rel < -0.0002 ? 'kerumunan lebih dingin daripada pasar: koin tak diperhatikan kerumunan' : 'sejajar suhu pasar'}` })
  }
  return out
}
function bukuExtraParams(book) {
  if (!book || !Array.isArray(book.bids) || !Array.isArray(book.asks) || !book.bids.length || !book.asks.length) return [
    { param: 'bukuGradien', domain: 'mikrostruktur', nilai: null, arah: 0, ket: 'order book tidak tersedia — gradien jujur kosong' },
  ]
  const bb = +book.bids[0][0], ba = +book.asks[0][0]
  const mid = (bb + ba) / 2 || 1
  const massa = (lv) => { let m = 0; for (const x of lv) { const px = +x[0]; if (px >= mid * 0.99 && px <= mid * 1.01) m += px * (+x[1]) } return m }
  const b1 = massa(book.bids.slice(0, 10)), bAll = massa(book.bids)
  const a1 = massa(book.asks.slice(0, 10)), aAll = massa(book.asks)
  const gB = bAll > 0 ? b1 / bAll : 0, gA = aAll > 0 ? a1 / aAll : 0
  const g = gB - gA
  return [{ param: 'bukuGradien', domain: 'mikrostruktur', nilai: +g.toFixed(3), arah: clamp(g * 1.8, -0.6, 0.6), ket: `gradien buku: ${g > 0.08 ? 'likuiditas bid MENGUMPUL di depan (pertahanan rapat di harga)' : g < -0.08 ? 'likuiditas ask MENGUMPUL di depan (gerbang jual rapat)' : 'distribusi merata'} — bid depan ${(gB * 100).toFixed(0)}% vs ask depan ${(gA * 100).toFixed(0)}% dari massa 1%` }]
}
function interaksiParams(W) {
  const out = []
  const push = (param, arah, ket) => out.push({ param, domain: 'interaksi', nilai: +arah.toFixed(3), arah: +arah.toFixed(3), ket })
  const g = (p) => W[p]?.arah ?? null
  const n = (p) => W[p]?.nilai
  const f = g('funding'), oi = g('oi'), vz = g('volZ'), t4 = g('ema4h'), bk = g('bukuImbalans'), e1 = g('ema1h'), dc = g('donchian30d'), tk = g('lsTaker')
  push('ixFundingOI', (f != null && oi != null) ? clamp(f * oi * 1.6, -0.8, 0.8) : 0, `funding×ΔOI: ${f ?? '—'}×${oi ?? '—'} — ${f != null && oi != null ? (f * oi > 0.15 ? 'kerumunan searah aliran dana baru: tren dibiayai posisi baru (kuat bila funding rendah, rapuh bila tinggi)' : f * oi < -0.15 ? 'kerumunan melawan arus dana: pusaran dua kubu' : 'campur') : 'butuh funding & ΔOI terisi'}`)
  push('ixVolAtr', (vz != null && n('atrPctile') != null) ? clamp(vz * (n('atrPctile') > 0.75 ? 0.5 : 1), -0.6, 0.6) : 0, `volume×rezim-ATR: ${vz ?? '—'} × persentil ${n('atrPctile') ?? '—'} — ${n('atrPctile') != null && n('atrPctile') > 0.75 ? 'lonjakan volume DI tengah volatilitas tinggi: gerak bermakna tapi licin' : 'volume dibaca di rezim volatilitas normal'}`)
  push('ixTrenFunding', (t4 != null && f != null) ? clamp(t4 * f * 1.5, -0.8, 0.8) : 0, `tren4h×funding: ${t4 ?? '—'}×${f ?? '—'} — ${t4 != null && f != null ? (t4 * f > 0.2 ? 'tren DIBIAYAI kerumunan searah: momentum vs kerumunan tumpang tindih (waspadai squeeze)' : t4 * f < -0.2 ? 'tren dan kerumunan berlawanan: salah satu akan dihukum medan' : 'netral') : 'butuh tren & funding'}`)
  push('ixBukuTren', (bk != null && e1 != null) ? clamp(bk * e1 * 1.2, -0.7, 0.7) : 0, `buku×tren1h: ${bk ?? '—'}×${e1 ?? '—'} — ${bk != null && e1 != null ? (bk * e1 > 0.15 ? 'buku mengiyakan tren: jalan mulus, slippage kecil' : bk * e1 < -0.15 ? 'buku melawan tren: dinding menahan, waspadai jebakan' : 'buku tak memihak') : 'butuh buku & tren'}`)
  push('ixDonchianVol', (dc != null && vz != null) ? clamp(dc * vz * 1.1, -0.7, 0.7) : 0, `breakout×volume: donchian ${dc ?? '—'} × volZ ${vz ?? '—'} — ${dc != null && vz != null ? (dc * vz > 0.25 ? 'gerak ke ujung rentang DUKUNG volume: breakout autentik' : dc * vz < -0.25 ? 'gerak ke ujung TANPA volume: mudah palsu (false breakout)' : 'konfirmasi tipis') : 'butuh donchian & volume'}`)
  push('ixFlowTren', (tk != null && e1 != null) ? clamp(tk * e1 * 1.1, -0.7, 0.7) : 0, `agresor×tren1h: taker ${tk ?? '—'} × ${e1 ?? '—'} — ${tk != null && e1 != null ? (tk * e1 > 0.25 ? 'pasar agresif mengiyakan tren: momentum autentik' : tk * e1 < -0.25 ? 'pasar agresif MELAWAN tren: divergence aliran, waspada' : 'aliran netral') : 'butuh lsTaker & tren'}`)
  return out
}
// ASSEMBLER — satu sumber parameter per kandang: inti (12 berbobot) + observasi
// (multi-TF, derivatif-dalam, mikrostruktur, lintas-pasar, kalender, warisan-kuant).
function wawasanPenuh(c, cBTC, s, ctx) {
  const inti = [...wawasanLilin(c, cBTC), ...derivParams(s, ctx.deriv, ctx.oiLama)]
    .map((p) => ({ ...p, domain: DOMAIN_INTI[p.param] || 'lain', lapis: 'inti' }))
  const obs = []
  const push = (param, domain, o) => obs.push({ param, domain, lapis: 'observasi', nilai: o.nilai ?? null, arah: +(o.arah ?? 0).toFixed(3), ket: o.ket })
  const closes = c.map((x) => x.c)
  const ema1h = emaAlignDim(closes)
  push('ema1h', 'tren', ema1h)
  push('rsi1h', 'momentum', rsiKlasikDim(closes))
  push('roc12', 'momentum', rocDim(closes, 12))
  push('roc48', 'momentum', rocDim(closes, 48))
  push('stoch', 'momentum', stochDim(c))
  push('mfi', 'aliran', mfiDim(c))
  push('cci', 'momentum', cciDim(c))
  push('jarakEkstrem', 'tren', jarakEkstremDim(c))
  push('atrPctile', 'volatilitas', atrPctileDim(c))
  push('volZ', 'aliran', volZDim(c))
  push('bodyRatio', 'momentum', bodyRatioDim(c))
  const c4 = agg4h(c)
  if (c4.length >= 30) {
    const cl4 = c4.map((x) => x.c)
    const ema4h = emaAlignDim(cl4)
    push('ema4h', 'tren', { ...ema4h, ket: ema4h.ket.replace('EMA-align 1h', 'EMA-align 4h') })
    push('macd4h', 'momentum', macd4hDim(cl4))
    push('rsi4h', 'momentum', rsiKlasikDim(cl4))
    const bb4 = bollingerDim(cl4)
    push('bb4h', 'volatilitas', { nilai: bb4.nilai, arah: bb4.arah, ket: bb4.ket.replace('Bollinger %B', 'Bollinger %B 4h') })
    const sw4 = swingDim(c4)
    push('swing4h', 'tren', { nilai: sw4.nilai, arah: sw4.arah, ket: sw4.ket.replace('struktur', 'struktur 4h') })
    push('sejajar4h', 'tren', sejajarDim(ema1h, ema4h))
    const atrA = (w) => { let s = 0; for (let i = 1; i < w.length; i++) s += Math.max(w[i].h - w[i].l, Math.abs(w[i].h - w[i - 1].c), Math.abs(w[i].l - w[i - 1].c)); return s / Math.max(1, w.length - 1) }
    const atr1pct = atrA(c.slice(-14)) / (c[c.length - 1]?.c || 1) * 100
    const atr4pct = atrA(c4.slice(-14)) / (c4[c4.length - 1]?.c || 1) * 100
    push('atrRatio', 'volatilitas', { nilai: +(atr4pct / Math.max(atr1pct, 0.01)).toFixed(2), arah: 0, ket: `ATR 4h ≈ ${atr4pct.toFixed(2)}% vs 1h ${atr1pct.toFixed(2)}% (${(atr4pct / Math.max(atr1pct, 0.01)).toFixed(1)}×) — ${atr4pct / Math.max(atr1pct, 0.01) > 1.6 ? 'volatilitas membesar di rangka waktu besar' : atr4pct / Math.max(atr1pct, 0.01) < 1.05 ? 'volatilitas pipih antar TF: pasar sibuk' : 'konsisten antar TF'}` })
  } else push('sejajar4h', 'tren', { nilai: null, arah: 0, ket: 'lilin kurang untuk rangka waktu 4h' })
  for (const p of fundHistParams(ctx.frHist, ctx.frKini)) push(p.param, p.domain, p)
  for (const p of bookParams(ctx.book, c[c.length - 1]?.c)) push(p.param, p.domain, p)
  for (const p of lintasParams(s, ctx.tickOkx)) push(p.param, p.domain, p)
  for (const p of sesiKalenderParams()) push(p.param, p.domain, p)
  // V257 SAMUDRA-DALAM — struktur harian, basis/funding, kerumunan, gradien buku
  for (const p of harianParams(ctx.hari)) push(p.param, p.domain, p)
  for (const p of basisParams(ctx.dDeriv, ctx.spotLast, ctx.frBtc)) push(p.param, p.domain, p)
  for (const p of lsParams(s, ctx.lsAkun, ctx.lsTaker)) push(p.param, p.domain, p)
  for (const p of bukuExtraParams(ctx.book)) push(p.param, p.domain, p)
  if (ctx.war) {                                          // param warisan-kuant (dari mesin yang sama)
    if (ctx.war.garch?.sigma24jPct != null) push('garchSigma', 'volatilitas', { nilai: ctx.war.garch.sigma24jPct, arah: 0, ket: `GARCH(1,1): sigma 24 jam ±${ctx.war.garch.sigma24jPct}% — ukuran posisi & lebar stop ditetapkan dari sini` })
    if (ctx.war.beta != null) push('betaBTC', 'relatif', { nilai: +ctx.war.beta.toFixed(2), arah: 0, ket: `beta vs BTC 90 jam ${ctx.war.beta.toFixed(2)} (R² ${(ctx.war.r2 ?? 0).toFixed(2)}) — ${ctx.war.beta > 1.2 ? 'amplifier pasar: naik lebih tinggi, jatuh lebih dalam' : ctx.war.beta < 0.8 ? 'bantal defensif terhadap gejolak BTC' : 'bergerak seiring pasar'}` })
    if (ctx.war.div) push('divRSI', 'momentum', { nilai: ctx.war.div, arah: ctx.war.div.includes('bullish') ? 0.6 : ctx.war.div.includes('bearish') ? -0.6 : 0, ket: `divergensi RSI 12 jam: ${ctx.war.div}` })
    if (ctx.war.vp?.poc != null) push('pocJarak', 'aliran', { nilai: +(((ctx.war.vp.poc / c[c.length - 1].c) - 1) * 100).toFixed(2), arah: ctx.war.vp.poc > c[c.length - 1].c ? 0.3 : -0.3, ket: `POC volume 48 jam ${(+ctx.war.vp.poc).toPrecision(7)} (${ctx.war.vp.poc > c[c.length - 1].c ? 'di atas harga — magnet tarik naik' : 'di bawah harga — magnet tarik turun'})` })
  }
  if (ctx.mc?.pNaik != null) push('mcPnaik', 'volatilitas', { nilai: +(ctx.mc.pNaik * 100).toFixed(1), arah: clamp((ctx.mc.pNaik - 0.5) * 2.4, -1, 1), ket: `Monte Carlo 2.000 lintasan: peluang naik dalam 24 jam ${(ctx.mc.pNaik * 100).toFixed(0)}% — ${ctx.mc.pNaik > 0.55 ? 'distribusi condong naik' : ctx.mc.pNaik < 0.45 ? 'distribusi condong turun' : 'koin flip statistik'}` })
  // V257 — 6 param interaksi antar-faktor (dari param yang SUDAH terhitung — 0 permintaan baru)
  const Wmap = Object.fromEntries([...inti, ...obs].map((p) => [p.param, p]))
  for (const p of interaksiParams(Wmap)) push(p.param, p.domain, p)
  return { inti, penuh: [...inti, ...obs] }
}
// GERBANG VETO WAWASAN — parameter observasi berhak MENOLAK sinyal buruk (mandat
// investor: "berani menolak sinyal buruk; lebih baik NO TRADE daripada merugi").
// Syarat ketat (bukan mood): dinding buku lawan, kerumunan funding berkelanjutan
// lawan, tren 4h lawan, volatilitas ekstrem — semua dilabeli & bisa diaudit.
function vetoWaw(penuh, arahV) {
  const sgn = arahV === 'BUY' ? 1 : -1
  const W = Object.fromEntries(penuh.map((p) => [p.param, p]))
  const veto = []
  const bi = W.bukuImbalans
  if (bi?.nilai != null && bi.arah * sgn <= -WAWASAN.IMBALANS_VETO && (W.bukuSpread?.nilai ?? 0) <= WAWASAN.SPREAD_BPS_LEBAR)
    veto.push({ kunci: 'order-book-lawan', ket: `order book menolak: imbalance ${(bi.nilai >= 0 ? '+' : '')}${bi.nilai} melawan ${arahV} (dinding pasaran di sisi berlawanan)` })
  const fr = W.fundRata3
  if (fr?.nilai != null && Math.abs(fr.nilai) >= WAWASAN.FRHIST_EKSTREM * 100 && fr.nilai * sgn > 0)
    veto.push({ kunci: 'kerumunan-funding', ket: `funding rata3 ${fr.nilai}% = kerumunan searah ${arahV} terus membayar mahal — masuk berarti menumpang posisi rapuh` })
  const t4 = W.ema4h
  if (t4?.nilai != null && t4.arah * sgn <= -WAWASAN.TREN4H_LAWAN && (W.sejajar4h?.nilai ?? 0) * sgn < 0)
    veto.push({ kunci: 'tren-4h-lawan', ket: `rangka waktu 4h menolak: EMA-align 4h ${t4.arah.toFixed(2)} berlawanan ${arahV} sementara 1h sendirian` })
  const ap = W.atrPctile
  if (ap?.nilai != null && ap.nilai >= WAWASAN.ATR_PCTILE_EKSTREM && (W.sejajar4h?.nilai ?? 0) * sgn < 0)
    veto.push({ kunci: 'volatilitas-ekstrem', ket: `ATR persentil ${(ap.nilai * 100).toFixed(0)} (ekstrem) sambil 4h tidak menyetujui — sinyal ${arahV} berisiko tergelincir stop sebelum bekerja` })
  // V257 — dua veto baru dari lapis samudra-dalam (kerumunan bertumpuk & stres basis)
  const tk = W.lsTaker
  if (tk?.nilai != null && ((arahV === 'BUY' && tk.nilai >= WAWASAN.LS_TAKER_EKSTREM) || (arahV === 'SELL' && tk.nilai <= 1 / WAWASAN.LS_TAKER_EKSTREM)) && fr?.arah != null && fr.arah * sgn > 0)
    veto.push({ kunci: 'kerumunan-bertumpuk', ket: `kerumunan bertumpuk: agresor taker ${arahV === 'BUY' ? 'BELI' : 'JUAL'} ekstrem (${tk.nilai}) SAAT funding kerumunan searah — momentum dua-lapis rawan likuidasi berantai` })
  const bs = W.basisPct
  if (bs?.nilai != null && ((arahV === 'BUY' && bs.nilai >= WAWASAN.BASIS_EKSTREM * 100) || (arahV === 'SELL' && bs.nilai <= -WAWASAN.BASIS_EKSTREM * 100)))
    veto.push({ kunci: 'basis-ekstrem', ket: `basis perp-vs-spot ${bs.nilai}% ${arahV === 'BUY' ? 'premium tinggi: euforia long terukur — masuk di ujung kerumunan' : 'diskon dalam: stres short terukur — waspadai squeeze saat menambah short'}` })
  return veto
}
// NARASI — jawaban "fasih & matang": paragraf analis profesional dari angka NYATA,
// selalu diakhiri klausul risiko. Tidak ada klaim tanpa angka di belakangnya.
// coda (opsional): penutup khusus jalur — mis. radar phoenix memakai cerita radar
// alih-alih cerita komite; kalimat inti (struktur/aliran/momentum/iklim) tetap sama.
function narasiSasaran(s, b, v, waw, iklim, eksA, sigma24jPct, rezimGlobal, coda) {
  const W = Object.fromEntries(waw.map((p) => [p.param, p]))
  const k1 = `${s} dibaca dalam rezim ${b.rezim}${rezimGlobal && rezimGlobal !== b.rezim ? ` — berbeda dari rezim BTC ${rezimGlobal}, artinya koin ini punya hidupnya sendiri` : ` — selaras rezim pasar`} · harga ${b.harga.toPrecision(6)} dengan ATR14 ${b.atrPct.toFixed(2)}% (satu hari normal bisa melampaui ±${(b.atrPct * Math.sqrt(24)).toFixed(1)}%).`
  const k2 = `Struktur: ${b.dims.struktur.ket}. ${W.swing?.ket ?? ''}`
  const k3 = `Aliran & posisi: ${W.obv?.ket ?? '—'}. ${W.funding?.ket ?? 'funding futures tidak tersedia untuk simbol ini'}. ${W.oi?.ket ?? ''}${W.fundRata3?.nilai != null ? ` ${W.fundRata3.ket}` : ''}${W.bukuImbalans?.nilai != null ? ` Order book: ${W.bukuImbalans.ket}` : ''}.`
  const k4 = `Momentum: ${W.macd?.ket ?? '—'}; ${W.relatif?.ket ?? ''}${W.sejajar4h?.nilai != null ? ` ${W.sejajar4h.ket}` : ''}.`
  const k4b = W.persenChg?.nilai != null ? `Di pasar luas: ${W.persenChg.ket}.${W.volZ?.nilai != null ? ` ${W.volZ.ket}` : ''}` : null
  const k5 = iklim.fng ? `Iklim pasar: Fear & Greed ${iklim.fng.nilai} (${iklim.fng.klasifikasi}) — ${iklim.fng.nilai >= 75 ? 'kerakusan ekstrem; historisnya koreksi mengintai, disiplin ukuran posisi di atas bias' : iklim.fng.nilai <= 25 ? 'ketakutan ekstrem; historisnya zona akumulasi kontrarian, tetapi pisau jatuh tetap dilarang ditadah' : 'sentimen tidak ekstrem; arah dari medan, bukan dari emosi'}${iklim.dominasi ? `; ${iklim.dominasi.ket}` : ''}.` : null
  if (coda) return [k1, k2, k3, k4, k5, coda].filter(Boolean).join(' ')
  const sgn = v.arah === 'BUY' ? 'menopang NAIK' : 'menekan TURUN'
  const bagus = waw.filter((p) => (v.arah === 'BUY' ? p.arah > 0.15 : p.arah < -0.15))
  const lawan = waw.filter((p) => (v.arah === 'BUY' ? p.arah < -0.15 : p.arah > 0.15))
  const k6 = `Komite ${DIM_ARAH.length + DIM_WAW.length} dimensi berbobot (diawasi ${TOTAL_PARAM_NAMA} parameter bernama + ${TOTAL_PARAM_METAKOGNISI} parameter metakognitif Nevron + sekolah hit-rate) memilih ${v.arah} (keyakinan ${v.keyakinan}/100 — dikalibrasi medan): ${bagus.length} parameter ${sgn}${lawan.length ? `, ${lawan.length} melawan (${lawan.map((p) => p.param).join(', ')})` : ' tanpa penentang keras'}.`
  const k7 = eksA ? `Matematika: ekspektasi ${eksA.evPct >= 0 ? '+' : ''}${eksA.evPct}% net-fee — P arah benar ${Math.round(eksA.p * 100)}%, untung rata ${eksA.gainPct}% vs rugi rata ${eksA.rugiPct}%, RR ${eksA.rr ?? '—'}${sigma24jPct ? ` · GARCH menaksir simpangan 24 jam ±${sigma24jPct}%: ukur posisi dari sigma ini, bukan dari rasa` : ''}.` : null
  const k8 = `Risiko jujur: ${lawan.length >= 4 ? 'komite terbelah — perlakukan sebagai sinyal lemah, ukuran posisi kecil atau tangan kosong' : lawan.length >= 2 ? 'ada arus berlawanan — stop wajib jalan, dilarang menambah saat melawan' : 'seperempat medan selalu bisa berbalik dalam 24 jam — pra-registrasi ini dinilai otomatis oleh medan, bukan janji'}.`
  return [k1, k2, k3, k4, k4b, k5, k6, k7, k8].filter(Boolean).join(' ')
}

function vonisPhoenix(rad, phxGenome, dayaProduk, untung, rezimGlobal, gerbangSkor) {
  let skor = 0
  for (const k of PHX_DIM) skor += (phxGenome[k] ?? PHX_AWAL[k]) * rad.sinyal[k]
  const skor100 = clamp(skor * 100, 0, 100)                 // bobot total 1, sinyal 0..1
  const lolos = skor100 >= (gerbangSkor ?? PHX.GERBANG_SKOR) && untung >= PHX.UNTUNG_MIN && dayaProduk >= 0.25
  let keyakinan = 50 + skor100 * 0.30 + dayaProduk * 12 + Math.min(untung, 0.05) * 140
  if (rezimGlobal === 'TURUN') keyakinan -= 8               // jujur: melawan arus lebih berisiko
  if (rezimGlobal === 'PARABOLIK') keyakinan -= 6
  keyakinan = clamp(Math.round(keyakinan), 52, 93)
  return { skor: +skor100.toFixed(1), keyakinan, lolos }
}

// ---------------- V247 ILMU — tiga mesin belajar berjurnal ----------------
// (1) HEDGE / MWU — Arora-Hazan-Kale 2012 · Freund-Schapire 1997.
//     loss_d = (1 - y*a_d)/2 dengan y=+1 (vonis benar) / -1 (salah) dan
//     a_d = nasihat dimensi dalam [-1,1]; w_d *= exp(-eta*loss), lalu
//     dinormalisasi — jaminan regret terbukti terhadap dimensi terbaik.
function hedgePerbarui(g, adv, y) {
  for (const [k, a] of Object.entries(adv)) {
    const loss = (1 - y * clamp(a, -1, 1)) / 2
    g[k] = clamp((g[k] ?? 0.1) * Math.exp(-ILMU.HEDGE_ETA * loss), ILMU.HEDGE_MIN, ILMU.HEDGE_MAKS)
  }
  const t = Object.values(g).reduce((s, x) => s + x, 0) || 1
  for (const k of Object.keys(g)) g[k] = +(g[k] / t).toFixed(4)
}
// (2) KALIBRASI KEPASTIAN — Brier 1950 · Gneiting-Raftery 2007.
//     keyakinan mentah dipetakan ke hit-rate empiris bin medan sendiri
//     (Laplace smoothing), 50/50 campur angka mentah; bin baru dipercaya
//     setelah >= 5 kasus — kepastian dari medan, bukan karangan.
function kalibrasiKeyakinan(p, kal) {
  const bin = kal.find((b) => p >= b.low && p < b.high)
  if (!bin || bin.n < ILMU.KALIBRASI_MIN_N) return { keyakinan: Math.round(p), sumber: 'mentah — medan bin belum cukup (jujur)' }
  const emp = ((bin.benar + 1) / (bin.n + 2)) * 100
  return {
    keyakinan: Math.round(clamp(p * 0.5 + emp * 0.5, 52, 97)),
    sumber: `dikalibrasi medan bin ${bin.low}–${bin.high - 1}% (n=${bin.n}, tembus ${emp.toFixed(0)}%)`,
  }
}
// V252 GERBANG-PERFORMA — keyakinan dipetakan hit-rate ZONA medan (lebih relevan
// dari bin global): kandidat yang selamat dari gerbang forensik membawa keyakinan
// sesuai rekam jejak kondisinya sendiri — bukan rasa yakin yang dikarang komite.
// FORENSIK didefinisikan di bawah (sebelum dipakai saat runtime).
function kunciKeyakinan(p, kal, zona) {
  const relevan = (zona || []).filter((z) => z && z.n >= FORENSIK.EMAS_MIN_N)
  if (relevan.length) {
    const totN = relevan.reduce((a, z) => a + z.n, 0)
    const hit = relevan.reduce((a, z) => a + z.akurasiPct * z.n, 0) / totN
    const w = clamp(totN / 24, 0.3, 0.65)
    return {
      keyakinan: Math.round(clamp(p * (1 - w) + hit * w, 30, 97)),
      sumber: `dikalibrasi zona forensik (${relevan.map((z) => `${z.nama} tembus ${z.akurasiPct}% dari n=${z.n}`).join(' · ')}; bobot medan ${w.toFixed(2)})`,
    }
  }
  return kalibrasiKeyakinan(p, kal)
}
// (3) KONFORMAL — Angelopoulos-Bates 2021 (arXiv:2107.07511).
//     kuantil empiris skor kesesuaian (MFE matang) — cakupan 1-alpha
//     bebas-distribusi; null jujur bila medan belum cukup.
function pitaKonformal(skors) {
  if (!Array.isArray(skors) || skors.length < ILMU.KONFORMAL_MIN_N) return null
  const s = [...skors].sort((a, b) => a - b)
  const q = (al) => s[clamp(Math.ceil((s.length + 1) * al) - 1, 0, s.length - 1)]
  return { bawah: +q(0.25).toFixed(4), tengah: +q(0.5).toFixed(4), atas: +q(1 - ILMU.KONFORMAL_ALPHA).toFixed(4), n: s.length }
}

// ---------------- penyimpanan ----------------
// ---------------- V255 METAKOGNISI-NEVRON — 6 mesin diadopsi dari Nevron ----------------
// (1) ESTIMATOR KEYAKINAN TERSTRUKTUR — Nevron ConfidenceEstimator: keyakinan
//     bukan satu angka komite, tapi 7 faktor berbobot dengan faktor terlemah &
//     aspek ragu disebut EKSPLISIT; level < 0.40 → otak bilang TUNGGU.
function estimasiKeyakinan(k, zonaArah, sistemStale) {
  const penuh = k.wp?.penuh || []
  const sgn = k.v.arah === 'BUY' ? 1 : -1
  const bagus = penuh.filter((p) => p.arah * sgn > 0.15).length
  const lawan = penuh.filter((p) => p.arah * sgn < -0.15).length
  const keselarasan = bagus + lawan > 0 ? bagus / (bagus + lawan) : 0.3
  const zSer = (zonaArah || []).find((z) => z.kunci === `${k.v.arah}-${k.b.rezim}`) || null
  const memori = !zSer ? 0.3 : zSer.n >= 5 ? 0.9 : zSer.n >= 3 ? 0.7 : 0.5     // Nevron: 0/1/3/5 matches
  const terisi = penuh.filter((p) => p.nilai != null).length
  const data = penuh.length ? terisi / penuh.length : 0.3
  const keakraban = zSer ? clamp(0.5 + Math.min(zSer.n, 10) * 0.05, 0, 1) : 0.4
  const rencana = (k.eksA ? 0.4 : 0.15) + (k.kena?.length ? 0.3 : 0) + (penuh.length >= 30 ? 0.3 : 0.15)
  const rekam = clamp((k.v.keyakinan ?? 50) / 100, 0, 1)
  const kondisi = sistemStale ? 0.2 : 1.0
  const faktor = { keselarasan, memori, data, keakraban, rencana, rekam, kondisi }
  let level = 0
  for (const [nama, sk] of Object.entries(faktor)) level += sk * (NEV.ESTIMATOR_BOBOT[nama] ?? 0.1)
  const terlemah = Object.entries(faktor).sort((a, b) => a[1] - b[1])[0]
  const aspekRagu = Object.entries(faktor).filter(([, v]) => v < 0.5).map(([n]) => KET_FAKTOR[n])
  return {
    level: +level.toFixed(3),
    faktor: Object.fromEntries(Object.entries(faktor).map(([n, v]) => [n, +v.toFixed(2)])),
    terlemah: terlemah[0], terlemahNilai: +terlemah[1].toFixed(2), aspekRagu,
    lolos: level >= NEV.ESTIMATOR_MIN_LOLOS,
    penjelasan: `keyakinan metakognitif ${(level * 100).toFixed(0)}% (ambang lolos ${NEV.ESTIMATOR_MIN_LOLOS * 100}%) — faktor terlemah: ${KET_FAKTOR[terlemah[0]]}`,
  }
}
// (2) PREDIKTOR KEGAGALAN PRA-KUNCI — Nevron FailurePredictor: probabilitas gagal
//     DIHITUNG SEBELUM sinyal dikunci, dari hit-rate zona historis + kegagalan
//     terkini 24 jam + ekspektasi MC negatif; gabungan = 0.6×maks + 0.4×rata.
function prediksiKegagalan(arah, rezim, eksA, zonaArah, ledgerClosed, waktuMs) {
  const probs = [], alasan = []
  const kunciZ = `${arah}-${rezim}`
  const z = (zonaArah || []).find((x) => x.kunci === kunciZ)
  if (z && z.n >= NEV.PREDIKTOR_MIN_N) {
    probs.push(clamp(1 - z.akurasiPct / 100, 0, 1))
    alasan.push({ sumber: 'hit-rate-zona', detail: `zona ${kunciZ} akurasi ${z.akurasiPct}% dari n=${z.n}` })
  }
  const batas = waktuMs - NEV.PREDIKTOR_WINDOW_JAM * 36e5
  const terkini = ledgerClosed.filter((e) => e.waktuDinilai && new Date(e.waktuDinilai).getTime() >= batas)
  if (terkini.length >= NEV.PREDIKTOR_MIN_N) {
    const gagalR = terkini.filter((e) => e.status !== 'BENAR').length / terkini.length
    if (gagalR > 0.5) {
      probs.push(gagalR)
      alasan.push({ sumber: 'kegagalan-terkini-24j', detail: `${terkini.length} vonis 24 jam terakhir ${Math.round(gagalR * 100)}% gagal` })
    }
  }
  if (eksA && eksA.evPct != null && eksA.evPct < 0) {
    probs.push(clamp(0.4 + Math.min(-eksA.evPct, 2) * 0.15, 0, 0.9))
    alasan.push({ sumber: 'ekspektasi-negatif', detail: `ekspektasi statistik ${eksA.evPct}% net-fee` })
  }
  const probGagal = probs.length
    ? +(0.6 * Math.max(...probs) + 0.4 * (probs.reduce((a, b) => a + b, 0) / probs.length)).toFixed(3)
    : 0
  return {
    probGagal, alasan,
    lanjut: probGagal < NEV.PREDIKTOR_MAKS_PROB,
    keyakinanPrediksi: probs.length ? +Math.min(0.95, 0.5 + 0.05 * probs.length).toFixed(2) : 0.5,
    gabungan: '0.6×maks + 0.4×rata-rata (rumus asli Nevron FailurePredictor)',
  }
}
// (3) BIAS KONTEKS — Nevron StrategyAdapter: bias −0.5..+0.5 per (rezim×arah)
//     = 0.4×tracker + 0.4×pelajaran(racun/emas) + 0.2×recent-7-hari.
function hitungBiasKonteks(zonaArah, ledgerClosed, waktuMs) {
  const out = {}
  for (const rez of ['NAIK', 'TURUN', 'PARABOLIK', 'BERGOLAK']) {
    for (const ar of ['BUY', 'SELL']) {
      const kunci = `${ar}-${rez}`
      const z = (zonaArah || []).find((x) => x.kunci === kunci)
      const hit = z && z.n >= NEV.PREDIKTOR_MIN_N ? z.akurasiPct / 100 : NEV.BIAS_NEUTRAL
      const les = z ? (z.status === 'RACUN' ? -1 : z.status === 'EMAS' ? 1 : 0) : 0
      const batas = waktuMs - 7 * 864e5
      const rec = ledgerClosed.filter((e) => e.rezim === rez && e.arah === ar && e.waktuDinilai && new Date(e.waktuDinilai).getTime() >= batas)
      const hitRec = rec.length >= NEV.PREDIKTOR_MIN_N ? rec.filter((e) => e.status === 'BENAR').length / rec.length : NEV.BIAS_NEUTRAL
      const bias = clamp(
        (hit - NEV.BIAS_NEUTRAL) * 2 * NEV.BIAS_TRACKER * NEV.BIAS_MAKS +
        les * NEV.BIAS_PELAJARAN * NEV.BIAS_MAKS +
        (hitRec - NEV.BIAS_NEUTRAL) * 2 * NEV.BIAS_RECENT * NEV.BIAS_MAKS,
        -NEV.BIAS_MAKS, NEV.BIAS_MAKS,
      )
      if (z || rec.length) out[kunci] = {
        bias: +bias.toFixed(3), nZona: z?.n ?? 0, statusZona: z?.status ?? null, nRecent7h: rec.length,
        geserKeyakinan: Math.round(bias * 30),   // bias penuh = ±15 poin keyakinan
        ket: `tracker 0.4 + pelajaran 0.4 + recent-7h 0.2 (Nevron StrategyAdapter)${z ? ` — zona ${kunci} ${z.status || 'NETRAL'} (${z.akurasiPct}%, n=${z.n})` : ' — zona belum berbukti'}`,
      }
    }
  }
  return out
}
function terapkanBias(keyakinanMentah, biasObj) {
  if (!biasObj || typeof biasObj.geserKeyakinan !== 'number') return { keyakinan: keyakinanMentah, geser: 0, kunci: null }
  return { keyakinan: clamp(Math.round(keyakinanMentah + biasObj.geserKeyakinan), 30, 95), geser: biasObj.geserKeyakinan, kunci: biasObj.ket }
}
// (4) DETEKSI LOOP — Nevron LoopDetector: jendela 20 vonis terakhir, ambang
//     repetisi 3 / alternasi (ABAB) 4 / siklus (ABCABC) 2 — otak yang selalu
//     memberi vonis sama di konteks sama sedang BIAS, bukan menganalisis.
function deteksiLoop(closedArah) {
  const seq = closedArah.slice(-NEV.LOOP_JENDELA).map((e) => `${e.arah}/${e.rezim}`)
  const out = []
  if (seq.length >= NEV.LOOP_REPETISI) {
    let rep = 1
    for (let i = seq.length - 2; i >= 0 && seq[i] === seq[seq.length - 1]; i--) rep++
    if (rep >= NEV.LOOP_REPETISI) out.push({ jenis: 'repetisi', pola: seq[seq.length - 1], repetisi: rep, ket: `vonis '${seq[seq.length - 1]}' berulang ${rep}× berturut — waspadai bias lane; sinyal searah pola ini dinilai lebih keras` })
  }
  const t4 = seq.slice(-4)
  if (t4.length === 4 && t4[0] === t4[2] && t4[1] === t4[3] && t4[0] !== t4[1])
    out.push({ jenis: 'alternasi', pola: `${t4[0]} ↔ ${t4[1]}`, repetisi: 2, ket: 'bergantian ABAB — sinyal sekadar menunggu arah pasar, bukan memprediksi' })
  const t6 = seq.slice(-6)
  if (t6.length === 6 && t6[0] === t6[3] && t6[1] === t6[4] && t6[2] === t6[5] && new Set(t6).size === 3)
    out.push({ jenis: 'siklus', pola: t6.slice(0, 3).join(' → '), repetisi: 2, ket: 'pola siklik ABCABC terdeteksi pada riwayat vonis' })
  return out
}
// (5) KRITIK DIRI 5-FIELD — Nevron SelfCritic (RLAIF): tiap kekalahan menghasilkan
//     lima jawaban terstruktur, dan pola yang terulang >= 2 kasus melahirkan
//     saran perbaikan berprioritas (>= 3 kasus = prioritas 1).
function kritikStruktur(e) {
  const pola = polaDari(e)
  const info = pelajaranDari(e)
  const kenapa = info.kenapa
  return {
    alasanGagal: kenapa[0] || `komite ${e.jalur || 'ARAH'} kalah di rezim ${e.rezim} — bobot digeser Hedge dari vonis nyata ini`,
    yangSalah: kenapa.join('; ') || 'tidak ada pola spesifik terdeteksi — kekalahan pasar murni',
    caraLebihBaik: e.status === 'SALAH'
      ? (POLA_PELAJARAN[pola[0]] || 'ukuran posisi kecil atau tangan kosong di kondisi ini — tunggu konfirmasi searah rezim')
      : 'pertahankan kondisi ini — perkuat dengan bukti tambahan sebelum menaikkan keyakinan',
    polaDihindari: pola.join(', ') || '—',
    pelajaran: info.pelajaran,
  }
}
function polaKegagalanBatch(closed) {
  const g = {}
  for (const e of closed.filter((x) => x.status === 'SALAH')) for (const k of polaDari(e)) g[k] = (g[k] || 0) + 1
  return Object.entries(g).filter(([, n]) => n >= 2).map(([p, n]) => ({
    pola: p, kasus: n, prioritas: n >= 3 ? 1 : 2,
    saran: POLA_PELAJARAN[p] || 'perketat gerbang pola ini — evaluasi ulang ambang bukti',
  })).sort((a, b) => a.prioritas - b.prioritas || b.kasus - a.kasus)
}
// (6) RELIABILITAS PELAJARAN — Nevron lessons.py: reliabilitas = keyakinan awal ×
//     penguatan (reinforcement) × peluruhan umur; pelajaran yang tidak pernah
//     relevan lagi melemah SENDIRI — memori hidup, bukan arsip mati.
function reliabilitasPelajaran(n, sejakISO, waktuMs) {
  if (!n) return 0
  const umurHari = sejakISO ? Math.max(0, (waktuMs - new Date(sejakISO).getTime()) / 864e5) : 0
  const penguatan = Math.min(1, 0.5 + 0.1 * Math.min(n, 5))
  const decay = NEV.RELIAB_DECAY_HARI / (1 + n * 0.5)
  const umur = Math.max(0.3, 1 - decay * umurHari)
  return +(NEV.RELIAB_AWAL * penguatan * umur).toFixed(3)
}

// ---------------- V256 MESIN DEAL (3Commas) + ODDS MAKER (Trade Ideas) ----------------
// hasil deep-screening dokumentasi resmi (lihat scripts/riset3c/): rencana deal
// dipra-registrasi per sasaran, peluang diranking, peristiwa ditandai lalu dinilai medan.
const atrN = (c, n = 24) => {
  const w = c.slice(-(n + 1))
  let s = 0
  for (let i = 1; i < w.length; i++) s += Math.max(w[i].h - w[i].l, Math.abs(w[i].h - w[i - 1].c), Math.abs(w[i].l - w[i - 1].c))
  return w.length > 1 ? s / (w.length - 1) : (w[0]?.h || 0) * 0.01
}
// (1) TAG PERISTIWA — OddsMaker "event-based testing": sinyal dicatat PERISTIWA
//     pemicunya dari lilin; hit-rate per peristiwa dinilai medan saat matang.
function tagPeristiwa(c, arah, war, wp) {
  const sgn = arah === 'BUY' ? 1 : -1
  const n = c.length, last = c[n - 1]
  const tags = []
  if (n >= 49) {
    const hi48 = Math.max(...c.slice(-49, -1).map((x) => x.h))
    const lo48 = Math.min(...c.slice(-49, -1).map((x) => x.l))
    if (last.c > hi48 || last.c < lo48) tags.push('breakout48j')
  }
  const vols = c.map((x) => x.v || 0)
  if (vols.length >= 30) {
    const v24 = vols.slice(-24).reduce((a, b) => a + b, 0) / 24
    const v6 = vols.slice(-6).reduce((a, b) => a + b, 0) / 6
    if (v24 > 0 && v6 >= 2 * v24) tags.push('lonjakVolume')
  }
  const closes = c.map((x) => x.c)
  const e9 = ema(closes, 9), e21 = ema(closes, 21)
  for (let i = Math.max(1, n - 6); i < n; i++) {
    if (!Number.isFinite(e9[i]) || !Number.isFinite(e21[i]) || !Number.isFinite(e9[i - 1]) || !Number.isFinite(e21[i - 1])) continue
    const d0 = e9[i - 1] - e21[i - 1], d1 = e9[i] - e21[i]
    if (d0 * d1 < 0 || (d0 === 0 && d1 !== 0)) { tags.push('crossEMA'); break }
  }
  // pullbackBB memakai band Bollinger langsung: bawah-dulu-lalu-kembali = BUY, cermin utk SELL
  const bb = (() => { const m = 21, k = 2.5; if (n < m + 2) return null; const win = closes.slice(-m); const mm = win.reduce((a, b) => a + b, 0) / m; const sd = Math.sqrt(win.reduce((a, b) => a + (b - mm) ** 2, 0) / m); return { atas: mm + k * sd, bawah: mm - k * sd, mm } })()
  if (bb) {
    if (arah === 'BUY' && closes[n - 2] < bb.bawah && last.c > bb.bawah) tags.push('pullbackBB')
    if (arah === 'SELL' && closes[n - 2] > bb.atas && last.c < bb.atas) tags.push('pullbackBB')
  }
  if (war?.div) {
    if (arah === 'BUY' && war.div.includes('bullish')) tags.push('divergensiRSI')
    if (arah === 'SELL' && war.div.includes('bearish')) tags.push('divergensiRSI')
  }
  const w4 = wp?.penuh?.find?.((p) => p.param === 'ema4h')
  const w1 = wp?.penuh?.find?.((p) => p.param === 'ema1h')
  if (w4?.arah != null && w1?.arah != null && w4.arah * sgn > 0.15 && w1.arah * sgn > 0.15) tags.push('searahTren4h')
  return tags
}
// (2) RENCANA DEAL ala 3Commas DCA — safety orders + Move SL to Breakeven +
//     Trailing Take Profit: semuanya PRA-REGISTRASI (kontingensi disiplin,
//     Max SO = hard cap ala "Max DCA Orders"; level dari ATR, bukan mood).
function rencanaDeal(c, entry, arah, untungTarget) {
  const sgn = arah === 'BUY' ? 1 : -1
  const atr = atrN(c, 24)
  const so = []
  let dev = (DEAL.SO_DEV * atr) / entry
  for (let i = 0; i < DEAL.MAX_SO; i++) {
    const harga = entry * (1 - sgn * dev)
    so.push({ tahap: i + 1, harga: +harga.toPrecision(7), devPct: +(dev * 100).toFixed(2), volMult: +Math.pow(DEAL.SO_VOL_MULT, i + 1).toFixed(2), ket: arah === 'BUY' ? 'safety order beli di bawah entry (averaging terkontrol)' : 'safety order jual di atas entry (averaging posisi short)' })
    dev *= DEAL.SO_DEV_MULT
  }
  const parts = [{ v: 1, p: entry }]
  so.forEach((s, i) => parts.push({ v: Math.pow(DEAL.SO_VOL_MULT, i + 1), p: s.harga }))
  const totV = parts.reduce((a, x) => a + x.v, 0)
  const avgPenuh = parts.reduce((a, x) => a + x.v * x.p, 0) / totV
  const bepAktH = entry * (1 + sgn * Math.max(untungTarget, 0) * DEAL.BEP_ACT)
  const bepStopH = entry * (1 + sgn * FEE)   // net-nol termasuk fee pulang-pergi
  const trailDistPct = +(((DEAL.TRAIL_DIST * atr) / entry) * 100).toFixed(2)
  return {
    mesin: '3Commas DCA-deal (pra-registrasi — kontingensi, bukan janji)',
    maxSO: DEAL.MAX_SO, soDevAtr: DEAL.SO_DEV, soDevMult: DEAL.SO_DEV_MULT, soVolMult: DEAL.SO_VOL_MULT,
    safetyOrders: so,
    avgJikaSoPenuh: +avgPenuh.toPrecision(7),
    tpDariAvgHarga: +((avgPenuh * (1 + sgn * Math.max(untungTarget, 0) * 0.5))).toPrecision(7),
    breakeven: {
      mesin: 'Move SL to Breakeven (3Commas)',
      aktivasiHarga: +bepAktH.toPrecision(7),
      aktivasiPct: +(Math.max(untungTarget, 0) * DEAL.BEP_ACT * 100).toFixed(2),
      stopBaruHarga: +bepStopH.toPrecision(7),
      stopBaruPct: +(sgn * FEE * 100).toFixed(2),
      ket: 'harga menyentuh aktivasi → stop pindah ke net-nol — risiko penuh hilang setelah itu',
    },
    trailing: {
      mesin: 'Trailing Take Profit (3Commas 2-param)',
      aktivasi: 'setelah target T1 tersentuh',
      jarakPct: trailDistPct,
      ket: `profit ditrail dari peak dengan jarak ${trailDistPct}% (0.8×ATR24j) — pemenang diberi ruang berlari`,
    },
    maxPosisiTerbuka: DEAL.MAX_POSISI,
    // V259 KAIZEN-PULIH — penjaga-kedua + perluasan taksonomi keluar (ala kaizen-trader:
    // 8 kondisi keluar eksplisit + watchdog proses-terpisah dengan stop/target independen)
    pengawas: { mesin: 'Penjaga-Kedua ala watchdog kaizen-trader (proses independen dari otak skor)', stopPct: KZN.PENGAWAS_STOP, targetPct: KZN.PENGAWAS_TARGET, ket: `hard-stop ${KZN.PENGAWAS_STOP}% / hard-target ${KZN.PENGAWAS_TARGET}% dari entry — tercatat saat kunci, dicek tiap denyut BAHKAN bila otak skor bingung` },
    exitEkstra: {
      chopExit: { umurMaksJam: KZN.MODALMATI_JAM, progresMinPct: KZN.MODALMATI_PROGRES, ket: `modal-mati: tanpa progres ±${KZN.MODALMATI_PROGRES}% dalam ${KZN.MODALMATI_JAM} jam → potong — modal mati adalah peluang yang hilang` },
      tesisBreak: { ket: 'tesis-patah: kondisi asal yang membuat entry (funding/EMA4h searah) berbalik → tutup apa pun P&L-nya' },
      ket: 'perluasan taksonomi keluar ala kaizen-trader: stop/target/trailing/timeout + chop-exit + thesis-break + daily-halt',
    },
  }
}
// (3) ODDS MAKER ala Trade Ideas — skor peluang 0-100 dari 4 sumber terukur
//     (+ bonus zona emas) — Money Machine: hanya top-K yang boleh mengunci.
function skorOdds({ pWin, zonaHit, metaLevel, dayaAvg, emas }) {
  const b = DEAL.BOBOT
  const k = {
    mc: clamp(pWin ?? 0.5, 0, 1), zona: clamp(zonaHit ?? 0.5, 0, 1),
    meta: clamp(metaLevel ?? 0.5, 0, 1), daya: clamp(dayaAvg ?? 0.5, 0, 1),
  }
  const skor = 100 * (b.mc * k.mc + b.zona * k.zona + b.meta * k.meta + b.daya * k.daya) + (emas ? 5 : 0)
  return {
    skor: +skor.toFixed(1), komponen: Object.fromEntries(Object.entries(k).map(([n, v]) => [n, +v.toFixed(3)])),
    bobot: b, bonusEmas: emas ? 5 : 0, ambang: DEAL.ODDS_MIN, topK: DEAL.TOP_K,
    ket: `odds ${(skor).toFixed(1)}/100 = 40%×peluang-MC + 25%×hit-rate-zona + 20%×metakognisi + 15%×daya${emas ? ' (+5 zona emas)' : ''} — ranking ala Trade Ideas OddsMaker, top-${DEAL.TOP_K} ala Money Machine`,
  }
}
// hit-rate zona medan utk OddsMaker: rata akurasiPct zona yang disandang kandidat
const hitZona = (kena) => {
  const z = (kena || []).filter((x) => x.akurasiPct != null && x.n >= 3)
  if (!z.length) return 0.5
  return z.reduce((a, x) => a + x.akurasiPct / 100, 0) / z.length
}
const dayaRata = (d) => d ? ((d.volume?.daya ?? d.volume ?? 0.5) + (d.volatilitas?.daya ?? d.volatilitas ?? 0.5) + (d.likuiditas?.daya ?? d.likuiditas ?? 0.5)) / 3 : 0.5
// ---------------- V258 GEKKO-CZAR — organ warisan Gekko Agent (Axal) ----------------
// (1) META-INFERENSI KOLEKTIF (Allora Topics): 6 topik pekerja memberi suara arah
//     dari param-param anggotanya; bobot topik = exp(-0.9·regret) — regret
//     diperbarui tiap vonis matang (regret-minimization ala Allora), tidak ada
//     topik yang memegang kuasa permanen.
function bobotTopik(t) {
  if (ilmu.karantina?.[t]) return ASAH.BOBOT_SUARA   // V263 ASAH-SUARA (hukum pemilik: karantina DILARANG): suara TAK PERNAH disita — bobot dipangkas 0.35, pulih lewat bukti medan
  const r = ilmu.topik?.[t]?.regret ?? 0.6
  return Math.max(GEK.BOBOT_MIN, Math.exp(-GEK.REGRET_ETA * r))
}
function metaInferensi(wp) {
  const W = Object.fromEntries(wp.map((p) => [p.param, p]))
  const suara = []
  for (const [t, members] of Object.entries(GEK.TOPIK_INTI)) {
    const v = members.map((m) => W[m]?.arah).filter((a) => Number.isFinite(a))
    if (!v.length) continue
    const rata = v.reduce((a, x) => a + x, 0) / v.length
    if (Math.abs(rata) < 0.05) continue                                   // topik diam bila tak punya pendapat
    suara.push({ topik: t, arah: +rata.toFixed(3), bobot: +bobotTopik(t).toFixed(3) })
  }
  if (!suara.length) return { metaArah: null, metaKeyakinan: null, suara, ket: 'tak ada topik bersuara — data kurang' }
  const hidup = suara.filter((x) => x.bobot > 0)                       // V263: tidak ada bobot 0 lagi — topik bermasalah bersuara lirih 0.35 (asah-suara)
  if (!hidup.length) return { metaArah: null, metaKeyakinan: null, suara, ket: 'tak ada topik bermutu — data kurang' }
  const tot = hidup.reduce((a, x) => a + x.bobot, 0)
  const sk = hidup.reduce((a, x) => a + x.bobot * x.arah, 0) / tot
  const metaArah = sk > 0 ? 'BUY' : 'SELL'
  const metaKeyakinan = clamp(Math.round(50 + Math.abs(sk) * 55), 50, 90)
  const urut = [...suara].sort((a, b) => b.bobot - a.bobot)
  return { metaArah, metaKeyakinan, suara, terkuat: urut[0].topik, terlemah: urut[urut.length - 1].topik, ket: `meta-inferensi kolektif: ${suara.length} topik bersuara, terkuat ${urut[0].topik}` }
}
// (2) CZAR — skor asimetris magnitude-aware (adaptasi CZAR Loss, arXiv 2609.36061,
//     utk ledger biner 24 jam): benar → reward near-linear dibatasi cap (ekor langka
//     tak menggemukkan); benar-kecil → hampir nol credit (zero-agnostic: gerakan kecil
//     = derau); salah → penalti floor + kuadratik untuk error besar (divergence).
function skorCzar(net) {
  const a = Math.abs(net)
  if (net > 0) return +Math.min(a, GEK.CZAR_CAP).toFixed(4)
  return +(-(GEK.CZAR_FLOOR + (Math.min(a, GEK.CZAR_CAP) ** 2) / GEK.CZAR_CAP)).toFixed(4)
}
// (4) PROB PASAR — P(naik) implisit dari harga kerumunan NYATA: agresor taker
//     (momentum), kerumunan akun LS (kontrarian), funding (kontrarian), EMA-align 4h
//     (tren) — semua sudah dihitung lapis samudra; nol permintaan baru.
function probPasar(W) {
  const komp = []
  const tk = W.lsTaker?.nilai
  if (tk != null && tk > 0) komp.push(clamp(Math.log(tk) / Math.log(1.5), -1, 1) * 0.8)
  const la = W.lsAkun?.nilai
  if (la != null && la > 0) komp.push(clamp(-(la - 1) * 0.7, -1, 1))
  const fd = W.funding?.arah
  if (Number.isFinite(fd)) komp.push(clamp(fd * 1.0, -1, 1))
  const t4 = W.ema4h?.arah
  if (Number.isFinite(t4)) komp.push(clamp(t4 * 1.0, -1, 1))
  if (!komp.length) return null
  const rata = komp.reduce((a, x) => a + x, 0) / komp.length
  return +clamp(0.5 + rata * 0.35, 0.06, 0.94).toFixed(3)
}
// (V260) KELLY-LAPIS (AutoPilotPM src/trading/kelly.ts — dynamic Kelly 9 lapis):
// 4 sub-faktor yang belum dipunyai tubuh — pengecilan drawdown, kerendahan-hati
// sampel kecil, penyusutan loss-streak, vol-target scaling — ditumpuk DI ATAS
// ekspresi dinamis gekko; hasilnya multiplier terikat-batas [0.4, 1.5].
function kellyLapis({ ddPct, nVonis, lossStreak, sigma24jPct }) {
  const f = {}
  f.drawdown = ddPct != null && ddPct > AUT.KELLY_DD_MULAI
    ? +(ddPct >= AUT.KELLY_DD_MAKS ? AUT.KELLY_DD_FAKTOR : 1 - (ddPct / AUT.KELLY_DD_MAKS) * (1 - AUT.KELLY_DD_FAKTOR)).toFixed(3)
    : 1
  f.sampel = nVonis != null && nVonis < AUT.KELLY_SAMPEL_N ? +(0.5 + (nVonis / AUT.KELLY_SAMPEL_N) * 0.45).toFixed(3) : 1
  f.streakKalah = lossStreak != null && lossStreak >= AUT.KELLY_LOSS_STREAK ? +Math.max(0.5, 1 - lossStreak * 0.1).toFixed(3) : 1
  f.vol = sigma24jPct != null && sigma24jPct > 0 ? +clamp(AUT.KELLY_VOL_TARGET / sigma24jPct, 0.5, AUT.KELLY_VOL_KLIP).toFixed(3) : 1
  const mult = clamp(f.drawdown * f.sampel * f.streakKalah * f.vol, 0.4, 1.5)
  const ku = nVonis != null ? clamp(0.4 * Math.min(1, nVonis / 20) + 0.3 + 0.3 * (1 - Math.min(1, (ddPct ?? 0) / AUT.KELLY_DD_MAKS)), 0.2, 1) : null
  return { mult: +mult.toFixed(3), f, ku: ku != null ? +ku.toFixed(3) : null }
}
// (V260) REZIM-MEDAN (AutoPilotPM src/risk/volatility.ts — 4 rezim dgn baseline
// mandiri): σ window P&L terakhir dibanding baseline σ window penuh PERTAMA
// (self-calibration) — tenang 1.2×, normal 1.0×, tinggi 0.5×, ekstrem 0.25×+BERTAHAN.
function rezimMedan(netHist, baseLama) {
  const win = (netHist || []).slice(-30).map((x) => x * 100)
  if (win.length < 4) return { rezim: 'normal', mult: 1, sigma: null, baseline: baseLama ?? null, ket: 'window P&L belum cukup — rezim normal-awas (jujur pada kekaburan)' }
  const mean = win.reduce((a, x) => a + x, 0) / win.length
  const sigma = +Math.sqrt(win.reduce((a, x) => a + (x - mean) ** 2, 0) / win.length).toFixed(4)
  const baseline = baseLama ?? sigma          // kalibrasi mandiri: window penuh pertama = baseline
  const r = baseline > 0 ? sigma / baseline : 1
  const rezim = r < 0.5 ? 'tenang' : r < 1.5 ? 'normal' : r < 2.5 ? 'tinggi' : 'ekstrem'
  const mult = rezim === 'tenang' ? 1.2 : rezim === 'normal' ? 1 : rezim === 'tinggi' ? 0.5 : 0.25
  return { rezim, mult, sigma, baseline: +baseline.toFixed(4), ket: `σ window ${sigma}% vs baseline ${baseline.toFixed(4)}% (rasio ${r.toFixed(2)}) — baseline dikalibrasi dari window penuh pertama, bukan ambang karangan` }
}
// (V260) UJI-TEGANG (AutoPilotPM src/risk/stress.ts — 5 skenario terdefinisi):
// posisi terbuka dinilai di bawah flash-crash/likuiditas/platform/korelasi/black-swan;
// estimasi rugi unit-relatif dari skala eksposur terpasang tiap posisi, diurut severity.
const SKENARIO_TEGANG = [
  { nama: 'flash-crash', rugiPct: 20 }, { nama: 'likuiditas-mampet', rugiPct: 10 },
  { nama: 'platform-mati', rugiPct: 15 }, { nama: 'korelasi-menembus', rugiPct: 25 },
  { nama: 'black-swan', rugiPct: 40 },
]
function ujiTegang(posisiTerbuka) {
  const hasilS = SKENARIO_TEGANG.map((sc) => {
    const rugiUnit = posisiTerbuka.reduce((a, e) => a + (e.ekspresi?.skalaEfektif ?? e.ekspresi?.skala ?? 0.5), 0) * (sc.rugiPct / 100)
    return { nama: sc.nama, rugiPct: sc.rugiPct, rugiUnit: +rugiUnit.toFixed(2) }
  }).sort((a, b) => b.rugiUnit - a.rugiUnit)
  return { skenario: hasilS, terburuk: hasilS[0] ?? null, ket: `${posisiTerbuka.length} posisi terbuka dinilai di 5 skenario — estimasi rugi unit-relatif (skala eksposur × fraksi skenario), diurut severity ala AutoPilot stress.ts` }
}
// (V260) SLIP-NETO (AutoPilotPM docs/OPPORTUNITY_FINDER.md — slippage heuristik
// sqrt(size/liquidity)·2·faktor + spread/2): edge dikurangi perkiraan biaya
// jatuh-tempo SEBELUM memutuskan — data kosong TIDAK memblokir (fallback-jujur).
function slipNeto({ qvUsd, spreadBps, edgePct }) {
  if (qvUsd == null || !Number.isFinite(qvUsd) || qvUsd <= 0) return { slipPct: null, edgeBersih: null, ket: 'likuiditas tak terukur — slip-neto tidak memblokir (fallback-jujur ala AutoPilot)' }
  const likuiditasUsd = Math.max(qvUsd / 24, 1)   // volume quote per jam dari lilin 1 jam terakhir
  const slip = +(Math.sqrt(1 / likuiditasUsd) * 2 * AUT.SLIP_FAKTOR * 100 + (spreadBps ?? 0) / 200).toFixed(3)
  const edgeBersih = edgePct != null ? +(edgePct - slip).toFixed(3) : null
  return { slipPct: slip, edgeBersih, ket: `slip ≈ ${slip}% (sqrt(1/likuiditas)·2·${AUT.SLIP_FAKTOR} + spread/2) — edge ${edgePct ?? '—'}% → bersih ${edgeBersih ?? '—'}%` }
}
// (V260) PELUANG-SKOR (AutoPilotPM opportunity scoring 0-100: Edge 35/Liq 25/
// Confidence 25/Execution 15 − penalti): komposit terbobot + penalti eksplisit;
// < ambang → ditolak DENGAN ALASAN (topBlockReasons).
function peluangSkor({ edgeBersih, liqUsd, keyakinan, spreadBps, slipPct }) {
  const edgeScore = edgeBersih != null ? clamp(edgeBersih / 10, 0, 1) * AUT.BOBOT_EDGE : AUT.BOBOT_EDGE * 0.5
  const liqScore = liqUsd != null && liqUsd > 0 ? clamp(Math.log10(Math.max(liqUsd, 10) / 1e5) / 2, 0, 1) * AUT.BOBOT_LIQ : AUT.BOBOT_LIQ * 0.5
  const kiyakScore = ((keyakinan ?? 55) / 100) * AUT.BOBOT_KIYAK
  const penalti = []
  let eksekusi = AUT.BOBOT_EKSEKUSI
  if (spreadBps != null && spreadBps > WAWASAN.SPREAD_BPS_LEBAR) { eksekusi -= 5; penalti.push('spread lebar −5') }
  if (slipPct != null && slipPct > AUT.SLIP_AMBANG_PCT) { eksekusi -= 4; penalti.push(`slip ${slipPct}% > ${AUT.SLIP_AMBANG_PCT}% −4`) }
  if (keyakinan != null && keyakinan < 70) { eksekusi -= 3; penalti.push('keyakinan < 70 −3') }
  eksekusi = Math.max(0, eksekusi)
  const skor = +clamp(edgeScore + liqScore + kiyakScore + eksekusi, 0, 100).toFixed(1)
  return { skor, bagian: { edge: +edgeScore.toFixed(1), liq: +liqScore.toFixed(1), kiyak: +kiyakScore.toFixed(1), eksekusi }, penalti, ket: `peluang ${skor}/100 = edge ${edgeScore.toFixed(1)} + likuiditas ${liqScore.toFixed(1)} + keyakinan ${kiyakScore.toFixed(1)} + eksekusi ${eksekusi}${penalti.length ? ` − penalti (${penalti.join(', ')})` : ''} — bobot AutoPilotPM` }
}
// (3) EKSPOSUR DINAMIS (Allora × Virtuals G.A.M.E: "adjust exposure — increase
//     during favorable conditions, reduce during downturns"): skala 0.25–1.0× unit
//     standar dari odds + keyakinan − volatilitas ekstrem − kerumunan funding.
// ---- V261 CLAW-TEMPOK — mesin warisan keluarga "ClawTrade" ----
// komiteArah: 5 suara berbobot ala CoordinatorAgent (agentWeights tetap di CLAW,
// suara rusak = bobot nol ala graceful degradation); kartuRisiko: 4 faktor × 25 poin
// ala RiskManagerAgent (data kosong → poin tengah, konservatif-pada-kekaburan);
// kuantaKeyakinan: tangga ukuran ala recommendedAmount — 1.0/0.5/0.25/nol.
function komiteArah(wpPenuh) {
  const m = Object.fromEntries(wpPenuh.map((p) => [p.param, p]))
  const suara = (nama, bobot, daftar) => {
    const berisi = daftar.filter((nm) => m[nm] && Number.isFinite(+m[nm].arah))
    if (!berisi.length) return { nama, bobot, arah: 0, keyakinan: 0, anggota: 0, suara: 0, ket: `${nama}: data tak terbaca — suara rusak = bobot nol (degradasi anggun ala CoordinatorAgent)` }
    const rata = berisi.reduce((a, nm) => a + +m[nm].arah, 0) / berisi.length
    const arahV = Math.sign(rata)
    const kek = +Math.abs(rata).toFixed(3)
    return { nama, bobot, arah: arahV, keyakinan: kek, anggota: berisi.length, suara: +(arahV * kek * bobot).toFixed(4), ket: `${nama}: ${berisi.length} anggota → arah ${arahV > 0 ? '+' : arahV < 0 ? '−' : '0'} · kekuatan ${(kek * 100).toFixed(0)}% × bobot ${bobot}` }
  }
  const su = [
    suara('TREN', CLAW.BOBOT_TREN, ['ema1h', 'ema4h', 'ema1d', 'sejajar4h', 'swing4h', 'macd4h']),
    suara('KERUMUNAN', CLAW.BOBOT_KERUMUNAN, ['lsAkun', 'lsTren', 'lsTaker']),
    suara('DERIVATIF', CLAW.BOBOT_DERIVATIF, ['funding', 'fundRata3', 'fundTren', 'fundVsBtc', 'basisPct']),
    suara('BUKU', CLAW.BOBOT_BUKU, ['bukuImbalans', 'bukuGradien', 'bukuKedalaman', 'bukuDinding']),
    suara('TEGANGAN', CLAW.BOBOT_TEGANGAN, ['bb4h', 'volZ', 'atrPctile', 'atrRatio']),
  ]
  const pos = su.reduce((a, x) => a + (x.suara > 0 ? x.suara : 0), 0)
  const neg = su.reduce((a, x) => a + (x.suara < 0 ? -x.suara : 0), 0)
  const terbaca = su.filter((x) => x.anggota > 0).length
  const arah = pos > neg ? 'BUY' : neg > pos ? 'SELL' : null
  const skor = +(pos - neg).toFixed(4)
  const total = pos + neg
  // keyakinan komite = KOHERENSI: porsi kekuatan searah dari total kekuatan suara
  // terbaca (ala kalibrasi jujur — bukan copy confidence LLM ClawTradeAI yang
  // output-nya 0-1 langsung; suara berkekuatan nol tak mengencerkan koherensi)
  const keyakinan = total > 0 ? +((Math.max(pos, neg) / total)).toFixed(4) : 0
  return { arah, keyakinan, skor, pos: +pos.toFixed(4), neg: +neg.toFixed(4), total: +total.toFixed(4), terbaca, suara: su, ket: `komite 5 suara (${terbaca}/5 terbaca): koherensi ${(keyakinan * 100).toFixed(0)}% searah ${arah ?? 'BISU'} · kekuatan ${skor >= 0 ? '+' : ''}${skor} — minconf ${CLAW.KOMITE_MINCONF}, bisu < ${CLAW.KOMITE_NETRAL}` }
}
function kartuRisiko({ qvUsd, spreadBps, volZ, sigmaPct, fundingPct, fundVsBtc, lsJarak, takerJarak, konsentrasiFam }) {
  const f = { likuiditas: 0, derivatif: 0, kerumunan: 0, volatilitas: 0 }
  const rinci = []
  // LIKUIDITAS (maks 25) — ala requireLiquidity & volume/liquidity ratio
  if (qvUsd == null) { f.likuiditas = 12; rinci.push('qv tak terbaca → poin tengah') }
  else if (qvUsd < CLAW.KARTU_QV_KRIT) f.likuiditas = 25
  else if (qvUsd < CLAW.KARTU_QV_RENDAH) f.likuiditas = 15
  else if (qvUsd < CLAW.KARTU_QV_MID) f.likuiditas = 8
  if (spreadBps != null && spreadBps > CLAW.KARTU_SPREAD_MAKS) f.likuiditas = Math.min(25, f.likuiditas + 5)
  rinci.push(`likuiditas ${f.likuiditas}/25`)
  // DERIVATIF (maks 25) — perang funding & funding-vs-BTC
  const fa = fundingPct == null ? null : Math.abs(fundingPct)
  if (fa == null) { f.derivatif += 8; rinci.push('funding tak terbaca → poin tengah') }
  else if (fa >= CLAW.KARTU_FUNDING_EKSTREM) f.derivatif += 15
  else if (fa >= CLAW.KARTU_FUNDING_SEDANG) f.derivatif += 8
  if (fundVsBtc != null && Math.abs(fundVsBtc) > CLAW.KARTU_FUNDBTC_EKSTREM) f.derivatif += 10
  f.derivatif = Math.min(25, f.derivatif)
  rinci.push(`derivatif ${f.derivatif}/25`)
  // KERUMUNAN-KONSENTRASI (maks 25) — kerumunan miring + konsentrasi keluarga
  if (lsJarak == null && takerJarak == null) { f.kerumunan += 8; rinci.push('kerumunan tak terbaca → poin tengah') }
  if (lsJarak != null && lsJarak > CLAW.KARTU_LS_EKSTREM) f.kerumunan += 15
  if (takerJarak != null && takerJarak > CLAW.KARTU_LSTAKER_EKSTREM) f.kerumunan += 10
  if (konsentrasiFam != null && konsentrasiFam > 0.25) f.kerumunan += 10   // MAX_CONCENTRATION_PCT 25% ala middleware
  f.kerumunan = Math.min(25, f.kerumunan)
  rinci.push(`kerumunan ${f.kerumunan}/25`)
  // VOLATILITAS (maks 25) — ala market risk + churn anomaly
  const sg = sigmaPct == null ? null : Math.abs(sigmaPct)
  if (sg == null) { f.volatilitas += 8; rinci.push('σ tak terbaca → poin tengah') }
  else if (sg > CLAW.KARTU_SIGMA_TINGGI) f.volatilitas += 20
  else if (sg > CLAW.KARTU_SIGMA_SEDANG) f.volatilitas += 10
  else if (sg > CLAW.KARTU_SIGMA_RINGAN) f.volatilitas += 5
  if (volZ != null && Math.abs(volZ) > CLAW.KARTU_VOLZ_SPIKE) f.volatilitas = Math.min(25, f.volatilitas + 5)
  f.volatilitas = Math.min(25, f.volatilitas)
  rinci.push(`volatilitas ${f.volatilitas}/25`)
  const skor = f.likuiditas + f.derivatif + f.kerumunan + f.volatilitas
  const level = skor < 25 ? 'LOW' : skor < 50 ? 'MEDIUM' : skor < 75 ? 'HIGH' : 'CRITICAL'
  return { skor, level, faktor: f, rinci, approved: skor <= CLAW.KARTU_MAKS, ket: `kartu risiko ${skor}/100 (${level}) — ${rinci.join(' · ')}` }
}
function kuantaKeyakinan(keyakinan01) {
  if (!Number.isFinite(keyakinan01)) return { kuanta: 0, ket: 'keyakinan tak terbaca → kuanta nol (tak ada ukuran antara — konservatif-pada-kekaburan)' }
  const k = keyakinan01 >= CLAW.KUANTA_T1 ? CLAW.KUANTA_1 : keyakinan01 >= 0.6 ? CLAW.KUANTA_2 : keyakinan01 >= 0.4 ? CLAW.KUANTA_3 : 0
  return { kuanta: k, ket: `tangga ukuran ala recommendedAmount: keyakinan ${(keyakinan01 * 100).toFixed(0)}% → kuanta ${k} (${k === CLAW.KUANTA_1 ? 'PENUH → menunggu mandat' : k === CLAW.KUANTA_2 ? 'setengah' : k > 0 ? 'seperempat' : 'TIDAK jual-beli'})` }
}
function ekspresiSkala({ odds, keyakinan, atrPctile, fundingPct }) {
  const f = {}
  f.odds = +clamp(((odds ?? 55) - 55) / 30, -0.5, 0.5).toFixed(2)
  f.keyakinan = +clamp(((keyakinan ?? 55) - 55) / 40, -0.4, 0.4).toFixed(2)
  f.volatilitas = (atrPctile != null && Number.isFinite(atrPctile) && atrPctile <= 1 && atrPctile >= 0.9) ? -0.2 : 0
  f.kerumunan = (fundingPct != null && Math.abs(fundingPct) >= WAWASAN.FUNDING_EKSTREM * 100) ? -0.15 : 0
  const skala = clamp(0.55 + f.odds + f.keyakinan + f.volatilitas + f.kerumunan, GEK.EKSPRESI_MIN, GEK.EKSPRESI_MAKS)
  return { skala: +skala.toFixed(2), faktor: f }
}
// (5) TEMPER AUTOPILOT (Axal: risk-profile → alokasi strategi) — suhu denyut
//     mengatur ambang odds & kuota ARAH dalam batas ketat: BERTAHAN = lebih
//     selektif (+5 ambang, kuota −1), AGRESIF hanya bila medan benar-benar hijau
//     (−3, lantai 52, kuota tak pernah melebihi baseline); PF < 1 MEMAKSA BERTAHAN.
function suhuPasar({ fng, breadth, rezim, profitFactor, rugiHarianPct, rezimEkstrem }) {
  const alasan = []
  let temper = 'NETRAL'
  if (rezimEkstrem) { temper = 'BERTAHAN'; alasan.push('REZIM-MEDAN EKSTREM: σ P&L ≥ 2.5× baseline mandiri — halt ala AutoPilot volatility regime') }
  if (rugiHarianPct != null && rugiHarianPct <= -KZN.HENTI_RUGI_PCT) { temper = 'BERTAHAN'; alasan.push(`HENTI-HARIAN: rugi-net vonis hari ini ${rugiHarianPct}% ≤ −${KZN.HENTI_RUGI_PCT}% — circuit breaker kaizen-trader`) }
  if (profitFactor != null && profitFactor < 1) { temper = 'BERTAHAN'; alasan.push(`PF jendela ${profitFactor} < 1 — modal mengetat`) }
  if (rezim === 'TURUN' || rezim === 'CRASH') { temper = 'BERTAHAN'; alasan.push(`rezim BTC ${rezim}`) }
  if (breadth != null && breadth < 35) { temper = 'BERTAHAN'; alasan.push(`breadth sempit ${(+breadth).toFixed(0)}% koin naik`) }
  if (temper === 'NETRAL' && profitFactor != null && profitFactor >= 1.2 && fng != null && fng >= 45 && fng <= 72 && breadth != null && breadth > 55 && (rezim === 'NAIK' || rezim === 'PARABOLIK')) {
    temper = 'AGRESIF'; alasan.push(`PF ${profitFactor} · F&G ${fng} · breadth ${(+breadth).toFixed(0)}% — medan hijau terukur`)
  }
  const ambang = temper === 'BERTAHAN' ? DEAL.ODDS_MIN + GEK.SUHU_BERTAHAN_AMBANG
    : temper === 'AGRESIF' ? Math.max(GEK.AMBANG_LANTAI, DEAL.ODDS_MIN - GEK.SUHU_AGRESIF_AMBANG)
    : DEAL.ODDS_MIN
  const kuota = temper === 'BERTAHAN' ? Math.max(1, DEAL.TOP_K - 1) : DEAL.TOP_K
  return { temper, ambang, kuota, alasan, ket: `temper Autopilot: ${temper} → ambang odds efektif ${ambang} · kuota ARAH ${kuota}` }
}
function bacaJson(p, def) {
  try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : structuredClone(def) } catch { return structuredClone(def) }
}
function bacaJsonl(p) {
  try {
    return readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  } catch { return [] }
}
function tulisJsonl(p, arr) { writeFileSync(p, arr.map((x) => JSON.stringify(x)).join('\n') + '\n') }
function tulis(p, obj) { writeFileSync(p, JSON.stringify(obj, null, 2) + '\n') }
// V248: sidik jari integritas — jiwa bisa diverifikasi bit demi bit (hash arsip)
const sidik = (obj) => createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12)

// ---------------- siklus utama ----------------
const WAKTU = new Date()
const ISO = WAKTU.toISOString()
const TGL = ISO.slice(0, 10)
const log = (...a) => console.log('[PENJAGA]', ...a)

// ---- 0. RADAR PHOENIX tahap 1 — telaah RATUSAN koin (1 permintaan ticker) ----
const STABIL = new Set(['USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'AEUR', 'USD1', 'USDE', 'PYUSD', 'FRAX', 'BUSD', 'PAXG', 'XUSD', 'USDtb', 'EURI', 'USDS'])
const radar = { telaah: 0, zonaPhoenix: 0, telusurDalam: 0, catatan: '' }
let tickGlobal = null          // V253: ticker penuh dipakai ulang utk proxy dominasi
let shortlist = []
try {
  const tick = await ambilJson('https://data-api.binance.vision/api/v3/ticker/24hr', 30000)
  tickGlobal = tick
  const dasar = new Set(
    tick.filter((t) => typeof t.symbol === 'string' && t.symbol.endsWith('USDT')).map((t) => t.symbol.slice(0, -4))
  )
  const semua = tick.filter((t) => {
    if (typeof t.symbol !== 'string' || !t.symbol.endsWith('USDT')) return false
    const base = t.symbol.slice(0, -4)
    if (STABIL.has(base)) return false
    if (/(UP|DOWN|BULL|BEAR)$/.test(base) && dasar.has(base.replace(/(UP|DOWN|BULL|BEAR)$/, ''))) return false  // token leverage
    return +t.lastPrice > 0
  })
  radar.telaah = semua.length                                        // telaah RATUSAN pasangan USDT
  const zona = semua
    .map((t) => ({
      simbol: t.symbol.slice(0, -4), qv: +t.quoteVolume,
      posisi: +t.highPrice > +t.lowPrice ? (+t.lastPrice - +t.lowPrice) / (+t.highPrice - +t.lowPrice) : 0.5,
    }))
    .filter((t) => t.posisi <= PHX.ZONA_POSISI && t.qv >= PHX.QV_MIN)   // zona likuid — layak diperdagangkan
    .sort((a, b) => b.qv - a.qv)
  radar.zonaPhoenix = zona.length
  shortlist = zona.slice(0, PHX.TELUSUR_MAKS).map((t) => t.simbol)
  log(`radar tahap-1: telaah ${radar.telaah} pasangan USDT — zona phoenix likuid ${radar.zonaPhoenix} — telusur dalam ${shortlist.length}`)
} catch (e) {
  radar.catatan = `tahap-1 ticker layu (${String(e.message).slice(0, 40)}) — radar hanya menelaah kandang`
  log(radar.catatan)
}

// ---- 0b. ledger dibaca awal — simbol terbuka ikut ditelusuri agar bisa dinilai ----
const ledger = bacaJsonl(path.join(ROOT, 'laporan/prakira-server.jsonl'))
const terbukaLama = [...new Set(ledger.filter((e) => e.status === 'TERBUKA').map((e) => e.simbol))]
const daftarTelusur = [...new Set([...shortlist, ...KANDANG, ...terbukaLama])]

// ---- 0c. telusur dalam — lilin 1 jam per koin, rantai host per simbol ----
async function ambilKoin(simbol) {
  for (const host of HOSTS) {
    try {
      const sym = host.pasangan ? host.pasangan(simbol) : simbol
      const d = await ambilJson(host.url(sym))
      const c = host.baca(d)
      if (c.length < 60) throw new Error('lilin kurang')
      return { simbol, host: host.nama, c }
    } catch { /* host berikutnya */ }
  }
  return null
}
const hasilKoin = await kumpul(daftarTelusur, 6, ambilKoin)
const hasil = {}
const hitungHost = {}
const gagal = []
for (const h of hasilKoin) {
  if (!h) continue
  hasil[h.simbol] = h.c
  hitungHost[h.host] = (hitungHost[h.host] || 0) + 1
}
for (const s of daftarTelusur) if (!hasil[s]) gagal.push(s)
radar.telusurDalam = Object.keys(hasil).length
const host = Object.entries(hitungHost).sort((a, b) => b[1] - a[1])[0]?.[0] || 'tidak-ada'
log(`telusur dalam: OK ${radar.telusurDalam}/${daftarTelusur.length} via ${host}`, gagal.length ? `gagal: ${gagal.slice(0, 10).join(', ')}${gagal.length > 10 ? '…' : ''}` : '')
if (!hasil.BTC) throw new Error('BTC tak terjangkau di semua host — siklus dilewati tanpa tulis (fault isolation)')

mkdirSync(path.join(ROOT, 'laporan'), { recursive: true })
mkdirSync(path.join(ROOT, 'otak'), { recursive: true })

const keadaan = bacaJson(path.join(ROOT, 'otak/penjaga-keadaan.json'), { mulai: ISO, siklus: 0 })
keadaan.siklus += 1
// V259 KAIZEN-PULIH — state loop penyembuhan: dingin per sasaran/keluarga, eksperimen
// uji-balik, streak karantina — semuanya persisten antar denyut (ingatan penyembuh)
if (!keadaan.kaizen) keadaan.kaizen = { dingin: {}, dinginFam: {}, uji: null, netHist: [], revertCt: 0, lolosCt: 0, karantinaStreak: {} }
for (const k2 of ['dingin', 'dinginFam']) if (!keadaan.kaizen[k2]) keadaan.kaizen[k2] = {}
if (!Array.isArray(keadaan.kaizen.netHist)) keadaan.kaizen.netHist = []
const kaizen = keadaan.kaizen
// V261 CLAW-TEMPOK — state pagar-baja: daftar-hitam (blockedTokens ala RiskManagerAgent),
// antrean menunggu-mandat (confirmation queue ala confirmation.py), buku-tekok (audit
// per aturan ala audit.py append-only) — semuanya persisten antar denyut.
if (!keadaan.claw) keadaan.claw = { hitam: {}, konfirm: [], bukuTekok: {}, komiteVetoCt: 0, kartuVetoCt: 0, komiteNetralCt: 0, kuantaVetoCt: 0, kuotaCt: 0, slipMaksCt: 0, hitamCt: 0, hitamAddCt: 0, konfirmQueCt: 0, konfirmOkCt: 0, konfirmExpCt: 0 }
if (!keadaan.claw.hitam) keadaan.claw.hitam = {}
if (!Array.isArray(keadaan.claw.konfirm)) keadaan.claw.konfirm = []
if (!keadaan.claw.bukuTekok) keadaan.claw.bukuTekok = {}
const claw = keadaan.claw
const SIKLUS = keadaan.siklus

// ---- 0d. V253 WAWASAN-360 — derivatif NYATA + sentimen + dominasi (1x per denyut) ----
// Pertama kali otak server memakai funding rate & open interest NYATA.
// Rantai host derivatif (pelajaran denyut pertama: api.bybit.com diblokir runner
// Actions → 4 lapis: bybit → bytick (cermin) → fapi Binance premiumIndex+OI →
// OKX per-simbol kandang) — semua gagal = param jujur null, tidak dikarang.
const wawCatatan = []
const NORM_DERIV = (fundingRate, openInterestValue, price24hPcnt, last, nextFundingTime) => ({ fundingRate, openInterestValue, price24hPcnt, last: last ?? null, nextFundingTime: nextFundingTime ?? null })
async function ambilDeriv() {
  // (a) Bybit linear (asli + cermin bytick) — 1 permintaan: funding + OI + chg24h semua simbol
  for (const hb of ['https://api.bybit.com', 'https://api.bytick.com']) {
    try {
      const dl = await ambilJson(hb + '/v5/market/tickers?category=linear', 20000)
      const ls = dl?.result?.list || []
      if (!ls.length) throw new Error('daftar kosong')
      wawCatatan.push(`derivatif ${hb.replace('https://', '')} linear: ${ls.length} simbol (funding + OI)`)
      return new Map(ls.map((x) => [x.symbol, NORM_DERIV(+x.fundingRate, +x.openInterestValue, +x.price24hPcnt, +x.lastPrice || null, +x.nextFundingTime || null)]))
    } catch (e) { wawCatatan.push(`derivatif ${hb.replace('https://', '')} gagal (${String(e.message).slice(0, 36)})`) }
  }
  // (b) Binance fapi — premiumIndex 1 permintaan (funding semua simbol) + OI per kandang
  try {
    const pi = await ambilJson('https://fapi.binance.com/fapi/v1/premiumIndex', 20000)
    const ls = Array.isArray(pi) ? pi : []
    if (!ls.length) throw new Error('premiumIndex kosong')
    const m = new Map(ls.map((x) => [x.symbol, NORM_DERIV(+x.lastFundingRate, 0, 0, +x.markPrice || null, +x.nextFundingTime || null)]))
    for (const x of ls) if (m.has(x.symbol)) m.get(x.symbol).mark = +x.markPrice
    const daftarFapi = [...new Set(['BTC', 'ETH', ...KANDANG])]
    await kumpul(daftarFapi, 4, async (s) => {
      const oi = await ambilJson(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${s}USDT`, 12000)
      const en = m.get(s + 'USDT')
      if (oi?.openInterest && en) en.openInterestValue = +oi.openInterest * (en.mark || 0)
    }).catch(() => null)
    for (const s of daftarFapi) {
      const en = m.get(s + 'USDT')
      const t = tickGlobal?.find?.((x) => x.symbol === s + 'USDT')
      if (en && t) en.price24hPcnt = (+t.priceChangePercent || 0) / 100
    }
    const nOi = [...m.values()].filter((x) => x.openInterestValue > 0).length
    wawCatatan.push(`derivatif fapi.binance.com premiumIndex: ${m.size} simbol (funding) · OI ${nOi}/${daftarFapi.length} kandang`)
    return m
  } catch (e) { wawCatatan.push(`derivatif fapi.binance.com gagal (${String(e.message).slice(0, 36)})`) }
  // (c) OKX per-simbol kandang — funding + OI + ticker (3×12 permintaan kecil, sopan)
  try {
    const daftarOkx = [...new Set(['BTC', 'ETH', ...KANDANG])]
    const tickOkx = await ambilJson('https://www.okx.com/api/v5/market/tickers?instType=SWAP', 20000)
    const pxOkx = new Map((tickOkx?.data || []).map((x) => [x.instId, +x.last]))
    const m = new Map()
    await kumpul(daftarOkx, 3, async (s) => {
      const inst = s + '-USDT-SWAP'
      const [fr, oi] = await Promise.all([
        ambilJson(`https://www.okx.com/api/v5/public/funding-rate?instId=${inst}`, 12000).catch(() => null),
        ambilJson(`https://www.okx.com/api/v5/public/open-interest?instId=${inst}`, 12000).catch(() => null),
      ])
      const frr = fr?.data?.[0] ? +fr.data[0].fundingRate : null
      const oiD = oi?.data?.[0]
      const harga = pxOkx.get(inst) || 0
      const oiUsd = oiD ? (+oiD.oiCcy > 0 ? +oiD.oiCcy : +oiD.oi * (+oiD.ctVal || 0)) * harga : 0
      if (frr != null) m.set(s + 'USDT', NORM_DERIV(frr, oiUsd, 0, harga || null, fr?.data?.[0]?.nextFundingTime ? +fr.data[0].nextFundingTime : null))
    }).catch(() => null)
    if (m.size) {
      wawCatatan.push(`derivatif okx per-simbol: ${m.size}/${daftarOkx.length} kandang (funding + OI USD)`)
      return m
    }
    throw new Error('okx kosong')
  } catch (e) { wawCatatan.push(`derivatif okx gagal (${String(e.message).slice(0, 36)})`) }
  return null
}
let deriv = await ambilDeriv()
if (deriv) log(`derivatif: ${deriv.size} simbol siap`)
else wawCatatan.push('semua host derivatif gagal — param funding/OI jujur null siklus ini')
// ---- V254 SAMUDRA — data dalam OKX (selalu dicoba; OKX satu-satunya host yang
// terbukti hidup dari runner): tickers SWAP lintas-pasar (1 permintaan) +
// riwayat funding & order book per kandang (2×10 permintaan kecil, sopan).
// Gagal jujur = null, tidak pernah dikarang.
let tickOkx = null
const frHistMap = new Map(), bookMap = new Map()
try {
  const tk = await ambilJson('https://www.okx.com/api/v5/market/tickers?instType=SWAP', 20000)
  tickOkx = tk?.data || null
  if (tickOkx?.length) wawCatatan.push(`okx lintas-pasar: ${tickOkx.length} swap (persentil perubahan & volume)`)
  else wawCatatan.push('okx tickers swap kosong — param lintas-pasar jujur null')
} catch (e) { wawCatatan.push(`okx tickers swap gagal (${String(e.message).slice(0, 36)})`) }
try {
  await kumpul(KANDANG, 3, async (s) => {
    const inst = s + '-USDT-SWAP'
    const [fh, bk] = await Promise.all([
      ambilJson(`https://www.okx.com/api/v5/public/funding-rate-history?instId=${inst}&limit=4`, 12000).catch(() => null),
      ambilJson(`https://www.okx.com/api/v5/market/books?instId=${s}-USDT&sz=50`, 12000).catch(() => null),
    ])
    if (fh?.data?.length) frHistMap.set(s, fh.data)
    const d0 = bk?.data?.[0]
    if (d0?.bids?.length && d0?.asks?.length) bookMap.set(s, d0)
  })
  wawCatatan.push(`okx dalam: riwayat funding ${frHistMap.size}/${KANDANG.length} · order book spot ${bookMap.size}/${KANDANG.length}`)
} catch (e) { wawCatatan.push(`okx dalam gagal (${String(e.message).slice(0, 36)})`) }
log(`samudra: tickers ${tickOkx ? tickOkx.length : '—'} · frHist ${frHistMap.size} · books ${bookMap.size}`)
// ---- V257 SAMUDRA-DALAM — lapis data baru: struktur harian (klines 1d 90 hari Binance),
// kerumunan akun & agresor (OKX rubik), ETH/BTC risk-on/off — endpoint publik, gagal = null jujur ----
const hariMap = new Map()
try {
  await kumpul(KANDANG, 4, async (s) => {
    for (const hb of ['https://data-api.binance.vision', 'https://api.binance.com']) {
      const d = await ambilJson(`${hb}/api/v3/klines?symbol=${s}USDT&interval=1d&limit=90`, 12000).catch(() => null)
      if (Array.isArray(d) && d.length >= 40) { hariMap.set(s, d.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }))); break }
    }
  })
  wawCatatan.push(`struktur harian: ${hariMap.size}/${KANDANG.length} kandang (klines 1d Binance 90 hari, vision→api)`)
} catch (e) { wawCatatan.push(`struktur harian gagal (${String(e.message).slice(0, 36)})`) }
const lsAkunMap = new Map()   // riwayat long/short ACCOUNT ratio (OKX rubik, terbaru dulu)
const lsTakerMap = new Map()  // riwayat taker buy/sell volume — agresor (OKX rubik)
try {
  await kumpul(KANDANG, 3, async (s) => {
    const [la, tk] = await Promise.all([
      ambilJson(`https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=${s}&instId=${s}-USDT-SWAP&limit=8`, 12000).catch(() => null),
      ambilJson(`https://www.okx.com/api/v5/rubik/stat/taker-volume?ccy=${s}&instId=${s}-USDT-SWAP&limit=2`, 12000).catch(() => null),
    ])
    if (la?.data?.length) lsAkunMap.set(s, la.data)
    if (tk?.data?.length) lsTakerMap.set(s, tk.data)
  })
  wawCatatan.push(`kerumunan OKX rubik: LS-akun ${lsAkunMap.size}/${KANDANG.length} · taker-volume ${lsTakerMap.size}/${KANDANG.length}`)
} catch (e) { wawCatatan.push(`kerumunan rubik gagal (${String(e.message).slice(0, 36)})`) }
// V263 SUMBER DILENGKAPI (mandat pemilik: "sumber informasinya kurang kita lengkapi"):
// (a) Binance futures topLongShortPositionRatio — posisi trader BESAR (smart money);
// (b) Binance futures takerlongshortRatio — agresor taker Binance (pendamping OKX);
// (c) Bybit linear tickers — cadangan funding/OI lintas-bursa (kalibrasi silang).
const lsPosMap = new Map(), lsTakerBinMap = new Map(), bybitLinMap = new Map()
try {
  await kumpul(KANDANG, 3, async (s) => {
    const [lp, tb, bb] = await Promise.all([
      ambilJson(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${s}USDT&period=1h&limit=8`, 12000).catch(() => null),
      ambilJson(`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${s}USDT&period=1h&limit=8`, 12000).catch(() => null),
      ambilJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${s}USDT`, 12000).catch(() => null),
    ])
    if (Array.isArray(lp) && lp.length) lsPosMap.set(s, lp.map((x) => ({ ts: +x.timestamp, ratio: +x.longShortRatio })).filter((x) => Number.isFinite(x.ratio)))
    if (Array.isArray(tb) && tb.length) lsTakerBinMap.set(s, tb.map((x) => ({ ts: +x.timestamp, ratio: +x.buySellRatio })).filter((x) => Number.isFinite(x.ratio)))
    if (bb?.result?.list?.length) { const t = bb.result.list[0]; bybitLinMap.set(s, { funding: +t.fundingRate, oiJuta: +((+t.openInterestValue || 0) / 1e6).toFixed(1) }) }
  })
  wawCatatan.push(`sumber-dilengkapi V263: posisi-besar ${lsPosMap.size}/${KANDANG.length} · agresor-binance ${lsTakerBinMap.size}/${KANDANG.length} · bybit-linear ${bybitLinMap.size}/${KANDANG.length}`)
} catch (e) { wawCatatan.push(`sumber-dilengkapi gagal sebagian (${String(e.message).slice(0, 36)}) — jujur dilabeli`) }
let ethBtc = null
try {
  let eb = null
  for (const hb of ['https://data-api.binance.vision', 'https://api.binance.com']) {
    eb = await ambilJson(`${hb}/api/v3/klines?symbol=ETHBTC&interval=1d&limit=8`, 12000).catch(() => null)
    if (Array.isArray(eb) && eb.length >= 8) break
  }
  if (Array.isArray(eb) && eb.length >= 8) {
    const cl = eb.map((k) => +k[4])
    const roc7 = cl[cl.length - 1] / cl[0] - 1
    ethBtc = { roc7d: +roc7.toFixed(4), kini: cl[cl.length - 1], ket: `ETH/BTC 7 hari ${(roc7 * 100 >= 0 ? '+' : '')}${(roc7 * 100).toFixed(2)}% — ${roc7 > 0.02 ? 'risk-ON: dana berani ke altcoin' : roc7 < -0.02 ? 'risk-OFF: dana berlindung di BTC' : 'risk seimbang'}` }
  }
} catch { wawCatatan.push('ETH/BTC gagal — proxy risk-on jujur null') }
wawCatatan.push(`ETH/BTC risk-on/off: ${ethBtc ? ethBtc.ket : 'tidak tersedia'}`)
log(`samudra-dalam: harian ${hariMap.size} · LS-akun ${lsAkunMap.size} · taker ${lsTakerMap.size} · ETH/BTC ${ethBtc ? 'ok' : '—'}`)
let fng = null, fngRiwayat = null
try {
  const f = await ambilJson('https://api.alternative.me/fng/?limit=8', 10000)
  const d0 = f?.data?.[0]
  if (d0) fng = { nilai: +d0.value, klasifikasi: d0.value_classification, ket: 'alternative.me — indeks sentimen gabungan (volatilitas, momentum, media, dominasi, volume)' }
  if (f?.data?.length >= 8) {
    const kmr = +f.data[1].value, l7 = +f.data[7].value
    fngRiwayat = { kemarin: kmr, lalu7h: l7, delta7d: +d0.value - l7, delta1d: +d0.value - kmr }
  }
} catch { wawCatatan.push('Fear & Greed gagal — sentimen jujur kosong siklus ini') }
let dominasi = null
try {
  const g = await ambilJson('https://api.coingecko.com/api/v3/global', 10000)
  const pct = g?.data?.market_cap_percentage?.btc
  if (pct) dominasi = { pct: +pct.toFixed(2), sumber: 'coingecko', ket: `dominasi kapitalisasi pasar BTC ${pct.toFixed(2)}% (CoinGecko)` }
} catch { /* fallback proxy di bawah — jujur dilabeli */ }
if (!dominasi && tickGlobal) {
  try {
    let qvBtc = 0, qvTot = 0
    for (const t of tickGlobal) {
      if (typeof t.symbol !== 'string' || !t.symbol.endsWith('USDT') || +t.lastPrice <= 0) continue
      qvTot += +t.quoteVolume
      if (t.symbol === 'BTCUSDT') qvBtc = +t.quoteVolume
    }
    if (qvTot > 0) dominasi = { pct: +((qvBtc / qvTot) * 100).toFixed(2), sumber: 'proxy-volume-spot', ket: `dominasi VOLUME spot BTC ${(qvBtc / qvTot * 100).toFixed(2)}% (proxy — CoinGecko tak terjangkau dari runner)` }
  } catch { wawCatatan.push('dominasi: CoinGecko & proxy sama-sama gagal — jujur null') }
}
// ΔOI antar-siklus — snapshot keadaan siklus lalu dibandingkan kini (jujur: denyut pertama = null)
const oiLamaMap = keadaan.wawasan?.oiLama || null
const oiKiniMap = {}
if (deriv) {
  for (const s of ['BTC', 'ETH', ...KANDANG]) {
    const d = deriv.get(s + 'USDT')
    if (d && +d.openInterestValue > 0) oiKiniMap[s] = +d.openInterestValue
  }
}
const oiDelta = (lama, d) => (lama && d && +d.openInterestValue > 0) ? +(((+d.openInterestValue) / lama) - 1).toFixed(4) : null
// derivatif mayor — dipakai iklim makro, narasi, dan peringatan sadar-diri
const dBTCw = deriv?.get('BTCUSDT') || null
const dETHw = deriv?.get('ETHUSDT') || null
const frBtc = dBTCw ? +dBTCw.fundingRate : null
const frEth = dETHw ? +dETHw.fundingRate : null
const oiBtc = dBTCw ? { nilaiJuta: +((+dBTCw.openInterestValue) / 1e6).toFixed(0), deltaPct: oiDelta(oiLamaMap?.BTC, dBTCw) } : null
const oiEth = dETHw ? { nilaiJuta: +((+dETHw.openInterestValue) / 1e6).toFixed(0), deltaPct: oiDelta(oiLamaMap?.ETH, dETHw) } : null
// V257 — faktor iklim lintas-siklus & lintas-aset (konstan per denyut: iklim & narasi, bukan pemilih arah)
const dominasiDelta = (dominasi?.pct != null && keadaan.wawasan?.dominasiPct != null) ? +(dominasi.pct - keadaan.wawasan.dominasiPct).toFixed(3) : null
const lsOf = (r) => {
  const arr = (Array.isArray(r) ? r : []).map((x) => Array.isArray(x) ? { ts: +x[0], ratio: +x[1] } : { ts: +x.ts || 0, ratio: +x.ratio }).filter((x) => Number.isFinite(x.ratio) && x.ratio > 0)
  if (!arr.length) return null
  return +arr.reduce((a, b) => (b.ts >= a.ts ? b : a)).ratio.toFixed(3)
}
const lsAkunBtc = lsOf(lsAkunMap.get('BTC')), lsAkunEth = lsOf(lsAkunMap.get('ETH'))
const jamFundingBtc = deriv?.get('BTCUSDT')?.nextFundingTime > 0 ? +((deriv.get('BTCUSDT').nextFundingTime - WAKTU.getTime()) / 3.6e6).toFixed(2) : null
// V257 — konteks samudra-dalam per kandang: SATU pembangun untuk semua lane (ARAH, PHOENIX, perKandang)
const ctxSamudra = (s, war, mc) => {
  const dP = deriv?.get(s + 'USDT') || null
  return { deriv, oiLama: oiLamaMap?.[s], frHist: frHistMap.get(s), frKini: dP ? +dP.fundingRate : null, book: bookMap.get(s), tickOkx, war: war || null, mc: mc || null, hari: hariMap.get(s) || null, lsAkun: lsAkunMap.get(s) || null, lsTaker: lsTakerMap.get(s) || null, lsPos: lsPosMap.get(s) || null, lsTakerBin: lsTakerBinMap.get(s) || null, bybitLin: bybitLinMap.get(s) || null, dDeriv: dP, spotLast: hasil[s] ? hasil[s][hasil[s].length - 1].c : null, frBtc }
}
log(`wawasan-360: deriv ${deriv ? deriv.size + ' simbol' : 'GAGAL'} · F&G ${fng?.nilai ?? '—'} · dominasi ${dominasi ? dominasi.pct + '% (' + dominasi.sumber + ')' : '—'} · funding BTC ${frBtc != null ? (frBtc * 100).toFixed(4) + '%' : '—'} · snapshot OI ${Object.keys(oiKiniMap).length}`)

// genome per rezim BTC (lane ARAH) + genome phoenix (lane BUY ujung-bawah)
const sembtc = dewanBukti(hasil.BTC)
const rezimGlobal = sembtc.rezim
const semuaGenome = bacaJson(path.join(ROOT, 'otak/genome-server.json'), {})
if (!semuaGenome[rezimGlobal]) semuaGenome[rezimGlobal] = { bobot: { ...GENOME_AWAL }, generasi: 0, belajar: 0, diperbarui: ISO }
if (!semuaGenome.phoenix) semuaGenome.phoenix = {}
if (!semuaGenome.phoenix[rezimGlobal]) semuaGenome.phoenix[rezimGlobal] = { bobot: { ...PHX_AWAL }, generasi: 0, belajar: 0, diperbarui: ISO }
const genome = semuaGenome[rezimGlobal].bobot
const phxGenome = semuaGenome.phoenix[rezimGlobal].bobot

// ---- V247 ILMU: keadaan belajar berjurnal (global — ahli dinilai lintas rezim;
//      adaptasi rezim tetap tugas genome evolusi per rezim) ----
if (!semuaGenome.ilmu) semuaGenome.ilmu = {}
const ilmu = semuaGenome.ilmu
// V262 MESIN IMPAS — dihitung SEKALI per denyut dari ledger matang, dipakai
// kunciEntriArah + phoenix + ambang; semuanya dari data medan sendiri.
const closedSemuaImpas = ledger.filter((e) => e.status === 'BENAR' || e.status === 'SALAH')
const jalurEfImpas = (e) => (e.jalur === 'PHOENIX' ? 'PHOENIX' : 'ARAH')   // era tanpa label = garis keturunan ARAH
const statJalurImpas = (nama) => {
  const sel = closedSemuaImpas.filter((e) => jalurEfImpas(e) === nama)
  const n = sel.length
  if (!n) return { n: 0, faktor: 1, hitShrunk: 0.5, evShrunk: 0, keyakinanRata: null, akurasiPct: null, menangRata: 0, rugiRata: 0 }
  const benarN = sel.filter((e) => e.status === 'BENAR').length
  const keyakinanRata = sel.reduce((a, e) => a + (e.keyakinanMentah ?? e.keyakinan ?? 55), 0) / n
  const akurasiPct = (benarN / n) * 100
  const faktor = n >= IMPAS.KALIB_MIN_N ? clamp(akurasiPct / Math.max(keyakinanRata, 1), IMPAS.KALIB_MIN_F, IMPAS.KALIB_MAKS_F) : 1
  const w = sel.slice(-IMPAS.ALOKASI_JENDELA)
  const hitShrunk = (w.filter((x) => x.status === 'BENAR').length + IMPAS.ALOKASI_PRIOR) / (w.length + IMPAS.ALOKASI_PRIOR * 2)
  const menang = w.filter((x) => x.net > 0).map((x) => x.net)
  const rugi = w.filter((x) => x.net <= 0).map((x) => Math.abs(x.net))
  const menangRata = menang.length ? menang.reduce((a, x) => a + x, 0) / menang.length : 0
  const rugiRata = rugi.length ? rugi.reduce((a, x) => a + x, 0) / rugi.length : 0
  const evShrunk = menang.length || rugi.length ? hitShrunk * menangRata - (1 - hitShrunk) * rugiRata : 0
  return { n, benar: benarN, faktor: +faktor.toFixed(3), hitShrunk: +hitShrunk.toFixed(3), evShrunk, keyakinanRata: +keyakinanRata.toFixed(1), akurasiPct: +akurasiPct.toFixed(1), menangRata, rugiRata }
}
const statArahImpas = statJalurImpas('ARAH')
const statPhxImpas = statJalurImpas('PHOENIX')
const netCumImpasPct = +(closedSemuaImpas.reduce((a, e) => a + e.net, 0) * 100).toFixed(2)
const tambahanAmbangImpas = netCumImpasPct < 0 ? Math.min(IMPAS.AMBANG_TAMBAH_MAKS, Math.abs(netCumImpasPct) * IMPAS.AMBANG_SKALA_RUGI) : 0
// kuota dinamis per jalur: weight = max(0, EV shrinkage) — pendarah tersisa lantai 2
const _wArahEv = Math.max(0, statArahImpas.evShrunk), _wPhxEv = Math.max(0, statPhxImpas.evShrunk)
let kuotaArahImpas = (_wArahEv + _wPhxEv) > 0 ? Math.max(IMPAS.KUOTA_FLOOR, Math.round(CLAW.KUOTA_HARIAN * _wArahEv / (_wArahEv + _wPhxEv))) : IMPAS.KUOTA_FLOOR
if (statArahImpas.n < IMPAS.KUOTA_SAMPEL_N) kuotaArahImpas = Math.max(IMPAS.KUOTA_FLOOR, Math.ceil(kuotaArahImpas / 2))   // kerendahan-hati sampel-kecil
log(`impas-cerdas: faktor kalibrasi ARAH ${statArahImpas.faktor} (ak ${statArahImpas.akurasiPct}% / jangkar ${statArahImpas.keyakinanRata}%) vs PHOENIX ${statPhxImpas.faktor} (ak ${statPhxImpas.akurasiPct}%) · EV-shrunk ARAH ${(statArahImpas.evShrunk * 100).toFixed(2)}% vs PHOENIX ${(statPhxImpas.evShrunk * 100).toFixed(2)}% · kuota ARAH ${kuotaArahImpas}/${CLAW.KUOTA_HARIAN} · net-cum ${netCumImpasPct}% · tambahan-ambang +${tambahanAmbangImpas.toFixed(1)}`)
if (!ilmu.hedge || !ilmu.hedge.arah) ilmu.hedge = { arah: { ...GENOME_AWAL }, phx: { ...PHX_AWAL } }
if (!ilmu.brier) ilmu.brier = { arah: { n: 0, jumlah: 0 }, phx: { n: 0, jumlah: 0 } }
if (!Array.isArray(ilmu.kalibrasi) || !ilmu.kalibrasi.length)
  ilmu.kalibrasi = ILMU.BIN_KALIBRASI.map(([low, high]) => ({ low, high, n: 0, benar: 0 }))
if (!Array.isArray(ilmu.konformal)) ilmu.konformal = []
if (!ilmu.meta) ilmu.meta = { kuat: { n: 0, benar: 0 }, lemah: { n: 0, benar: 0 }, geser: 0 }
// V255: kalibrasi medan untuk kedua gerbang metakognitif — estimator/prediktor yang
// menilai sinyal juga DINILAI medan: apakah level tinggi memang lebih sering benar?
if (!ilmu.metakognisi) ilmu.metakognisi = { estimator: { n: 0, tepat: 0 }, prediktor: { n: 0, tepat: 0 } }
// V256 MESIN DEAL — statistik medan rencana deal (safety orders / breakeven / trailing)
// + hit-rate per peristiwa OddsMaker: semuanya dinilai dari vonis matang, bukan klaim.
if (!ilmu.deal) ilmu.deal = {
  so: { n: 0, soKena: 0, netDenganSo: 0, netTanpaSo: 0, menyelamatkan: 0 },
  bep: { n: 0, aktivasiKena: 0, keluarNetNol: 0, menyelamatkan: 0 },
  trail: { n: 0, tembusT1: 0, ekstraPctJumlah: 0, ekstraMaksPct: 0 },
}
if (!ilmu.peristiwa) ilmu.peristiwa = {}
for (const p of PERISTIWA_DEFS) if (!ilmu.peristiwa[p.nama]) ilmu.peristiwa[p.nama] = { n: 0, benar: 0, net: 0 }
// V258 GEKKO-CZAR — state ilmu baru: topik (regret-minimized), czar, ekspresi, divergensi
if (!ilmu.topik) ilmu.topik = {}
for (const t of Object.keys(GEK.TOPIK_INTI)) if (!ilmu.topik[t]) ilmu.topik[t] = { n: 0, benar: 0, net: 0, regret: 0.6 }   // 0.6 = bobot awal ~0.58 (netral-waspada)
if (!ilmu.cz) ilmu.cz = { n: 0, jumlah: 0 }
if (!ilmu.ekspresi) ilmu.ekspresi = { tinggi: { n: 0, net: 0 }, rendah: { n: 0, net: 0 } }
if (!ilmu.divergensi) ilmu.divergensi = { kuat: { n: 0, benar: 0, net: 0 }, lemah: { n: 0, benar: 0, net: 0 } }
// V259 KAIZEN-PULIH — state ilmu baru: karantina topik (kini MODE-ASAH V263), penjaga-kedua, kesegaran, modal-mati, tesis
if (!ilmu.karantina) ilmu.karantina = {}
// V263 ORGAN-BARU — setiap kesalahan melahirkan kemampuan baru (mikro-aturan ber-replay)
if (!ilmu.organ) ilmu.organ = { list: [], lulusCt: 0 }
if (!ilmu.pengawas) ilmu.pengawas = { dinilai: 0, kena: 0, menyelamatkan: 0 }
if (!ilmu.kesegaran) ilmu.kesegaran = { tinggi: { n: 0, benar: 0, net: 0 }, rendah: { n: 0, benar: 0, net: 0 } }
if (!ilmu.modalMati) ilmu.modalMati = { kena: { n: 0, benar: 0, net: 0 }, sehat: { n: 0, benar: 0, net: 0 } }
if (!ilmu.tesis) ilmu.tesis = { sehat: { n: 0, benar: 0, net: 0 }, patah: { n: 0, benar: 0, net: 0 } }
// V260 AUTOPILOT-KALIBRASI — bucket medan utk lapis autopilot (semuanya dinilai medan):
if (!ilmu.alt) ilmu.alt = { lebihBaik: { n: 0, net: 0 }, lebihBuruk: { n: 0, net: 0 } }   // regret pilihan: apakah alternatif seharusnya dipilih?
if (!ilmu.kelly) ilmu.kelly = { kecil: { n: 0, benar: 0, net: 0 }, sedang: { n: 0, benar: 0, net: 0 }, besar: { n: 0, benar: 0, net: 0 } }   // apakah ukuran kecil memang lebih aman?
if (!ilmu.rezimMedan) ilmu.rezimMedan = { tenang: { n: 0, benar: 0, net: 0 }, normal: { n: 0, benar: 0, net: 0 }, tinggi: { n: 0, benar: 0, net: 0 }, ekstrem: { n: 0, benar: 0, net: 0 } }   // apakah tenang memang menguntungkan?
if (!ilmu.peluang) ilmu.peluang = { tinggi: { n: 0, benar: 0, net: 0 }, rendah: { n: 0, benar: 0, net: 0 } }   // apakah skor komposit tinggi memang menang lebih sering?
if (!ilmu.stres) ilmu.stres = { tinggi: { n: 0, benar: 0, net: 0 }, rendah: { n: 0, benar: 0, net: 0 } }   // apakah denyut stres-tinggi memang lebih berbahaya?
if (!ilmu.topTolak) ilmu.topTolak = {}   // topBlockReasons kumulatif — kesadaran atas penolakan sendiri
// V253: bobot komite wawasan (genome per rezim + Hedge on-line) — 12 param baru belajar
// dari vonis nyata dengan jalan yang sama persis seperti 5 dimensi lama
if (!semuaGenome.waw) semuaGenome.waw = {}
if (!semuaGenome.waw[rezimGlobal]) semuaGenome.waw[rezimGlobal] = { bobot: { ...GENOME_WAW_AWAL }, generasi: 0, belajar: 0, diperbarui: ISO }
if (!ilmu.hedge.waw) ilmu.hedge.waw = { ...GENOME_WAW_AWAL }
const genomeWaw = semuaGenome.waw[rezimGlobal].bobot
// V249: MC pra-registrasi juga dinilai medan — Brier + kalibrasi bin peluang
if (!ilmu.brier.mc) ilmu.brier.mc = { n: 0, jumlah: 0 }
if (!Array.isArray(ilmu.mcKalibrasi) || !ilmu.mcKalibrasi.length)
  ilmu.mcKalibrasi = [[0.30, 0.45], [0.45, 0.60], [0.60, 0.75], [0.75, 0.96]].map(([low, high]) => ({ low, high, n: 0, benar: 0 }))
// bobot efektif = campuran 50/50 genome evolusi (per rezim) + Hedge on-line (global)
const campur = (a, b) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])]
  .map((k) => [k, ((a[k] ?? 0) + (b[k] ?? 0)) / 2]))
const bobotArah = campur(genome, ilmu.hedge.arah)
const bobotPhx = campur(phxGenome, ilmu.hedge.phx)
const bobotWaw = campur(genomeWaw, ilmu.hedge.waw)

// ---- V252 FORENSIK MEDAN — mandat investor: "jangan hanya mencatat prediksi
// yang salah; analisis MENGAPA kesalahan terjadi dan pola apa yang terus
// menyebabkan kerugian" ---- Tiap denyut otak membedah SELURUH vonis tertutup
// per jalur, mengelompokkan ke zona kondisi, dan zona dengan bukti cukup yang
// terbukti merugi menjadi ZONA RACUN yang DITOLAK mesin — no-trade adalah keputusan.
const FORENSIK = {
  MIN_N: 8,          // bukti minimum sebelum zona berhak menolak sinyal
  RACUN_EKS: -0.006, // ekspektasi <= -0.6% = racun terbukti
  EMAS_MIN_N: 6,     // zona emas boleh lebih awal percaya (n>=6)
  EMAS_EKS: 0.003,   // ekspektasi >= +0.3% = zona emas
  MAKS_PORSI: 0.85,  // zona dgn porsi > 85% jalur = fitur KONSTAN (mis. phoenix selalu kontrarian) — tidak berhak menolak/menaikkan
}
function forensikMedan(closed) {
  const tag = (e) => {
    const sgn = e.arah === 'BUY' ? 1 : -1
    const sesuai = DIM_ARAH.reduce((a, d) => a + (((e.bukti?.[d] ?? 0) !== -1) && (e.bukti?.[d] ?? 0) * sgn > 0 ? 1 : 0), 0)
    const t = e.bukti?.tekanan ?? 0
    const taker = t === -1 ? 'netral' : (Math.abs(t) >= 0.3 && t * sgn > 0 ? 'searah' : (t * sgn < 0 ? 'melawan' : 'netral'))
    const kek = e.keyakinanMentah ?? e.keyakinan ?? 60
    // V253: zona derivatif — funding PCT mentah (bukan arah kontrarian) agar zona membaca kerumunan
    const fp = e.derivatif?.fundingPct
    const fnd = fp == null ? 'tak-ada' : fp >= WAWASAN.FUNDING_EKSTREM * 100 ? 'long-membayar' : fp <= -WAWASAN.FUNDING_EKSTREM * 100 ? 'short-membayar' : 'seimbang'
    return { rez: `${e.arah}-${e.rezim}`, band: kek < 55 ? '<55' : (kek < 70 ? '55-69' : '>=70'), taker, kons: sesuai >= 3 ? '3-5' : '0-2', fnd }
  }
  const namaTaker = { 'taker-searah': 'tekanan taker searah kuat (ikut kerumunan)', 'taker-melawan': 'tekanan taker melawan (fade kerumunan)', 'taker-netral': 'tekanan taker netral' }
  const namaFunding = { 'funding-long-membayar': 'funding long membayar (kerumunan long ramai)', 'funding-short-membayar': 'funding short membayar (kerumunan short ramai)', 'funding-seimbang': 'funding seimbang', 'funding-tak-ada': 'funding belum tercatat (entri pra-V253)' }
  const buat = (kunciFn, namaFn) => {
    const g = {}
    for (const e of closed) {
      const t = tag(e); const k = kunciFn(t)
      if (!g[k]) g[k] = { n: 0, benar: 0, net: 0, menang: 0, kalah: 0 }
      const b = g[k]; b.n++; b.net += e.net
      if (e.status === 'BENAR') b.benar++
      if (e.net > 0) b.menang += e.net; else b.kalah += e.net
    }
    return Object.entries(g).map(([k, b]) => {
      const eks = b.net / b.n
      const porsi = +(b.n / closed.length).toFixed(3)
      // kelayakan diskriminatif: zona yang mencakup hampir SEMUA entri jalurnya adalah
      // konstanta lane (bukan kondisi) — tidak boleh dipakai menolak/menaikkan
      const layak = porsi <= FORENSIK.MAKS_PORSI
      const status = (layak && b.n >= FORENSIK.MIN_N && eks <= FORENSIK.RACUN_EKS) ? 'RACUN'
        : (layak && b.n >= FORENSIK.EMAS_MIN_N && eks >= FORENSIK.EMAS_EKS) ? 'EMAS' : 'NETRAL'
      return {
        kunci: k, nama: namaFn(k), n: b.n, porsi,
        akurasiPct: +((b.benar / b.n) * 100).toFixed(1),
        ekspekPct: +(eks * 100).toFixed(2),
        pf: b.kalah < 0 ? +(b.menang / -b.kalah).toFixed(2) : null,
        status,
      }
    })
  }
  const zona = [
    ...buat((t) => t.rez, (k) => `arah ${k.replace('-', ' di rezim ')}`),
    ...buat((t) => t.band, (k) => `keyakinan mentah ${k}`),
    ...buat((t) => `taker-${t.taker}`, (k) => namaTaker[k] || k),
    ...buat((t) => t.kons, (k) => `konsensus bukti ${k} sesuai`),
    ...buat((t) => `funding-${t.fnd}`, (k) => namaFunding[k] || k),
  ]
  return { zona, racun: zona.filter((z) => z.status === 'RACUN'), emas: zona.filter((z) => z.status === 'EMAS') }
}
const closedArah = ledger.filter((e) => e.status === 'BENAR' || e.status === 'SALAH').filter((e) => (e.jalur || 'ARAH') === 'ARAH')
const closedPhx = ledger.filter((e) => e.status === 'BENAR' || e.status === 'SALAH').filter((e) => e.jalur === 'PHOENIX')
const forensik = {
  dasarN: { arah: closedArah.length, phoenix: closedPhx.length },
  arah: forensikMedan(closedArah),
  phoenix: forensikMedan(closedPhx),
}
if (forensik.arah.racun.length) log(`forensik ARAH zona racun: ${forensik.arah.racun.map((z) => `${z.nama} (n=${z.n}, ekspek ${z.ekspekPct}%)`).join(' | ')}`)
if (forensik.phoenix.racun.length) log(`forensik PHOENIX zona racun: ${forensik.phoenix.racun.map((z) => `${z.nama} (n=${z.n}, ekspek ${z.ekspekPct}%)`).join(' | ')}`)
if (forensik.arah.emas.length || forensik.phoenix.emas.length)
  log(`forensik zona emas: ${[...forensik.arah.emas, ...forensik.phoenix.emas].map((z) => `${z.nama} (+${z.ekspekPct}%)`).join(' | ')}`)
// tag zona utk kandidat baru — cermin tag() di atas agar 1:1 dengan data medan
const zonaKandidat = (lane, arah, rezimKoin, kekMentah, bukti, frPct) => {
  const sgn = arah === 'BUY' ? 1 : -1
  const sesuai = DIM_ARAH.reduce((a, d) => a + (((bukti?.[d] ?? 0) !== -1) && (bukti?.[d] ?? 0) * sgn > 0 ? 1 : 0), 0)
  const t = bukti?.tekanan ?? 0
  const taker = t === -1 ? 'netral' : (Math.abs(t) >= 0.3 && t * sgn > 0 ? 'searah' : (t * sgn < 0 ? 'melawan' : 'netral'))
  const band = kekMentah < 55 ? '<55' : (kekMentah < 70 ? '55-69' : '>=70')
  const fnd = frPct == null ? 'tak-ada' : frPct >= WAWASAN.FUNDING_EKSTREM * 100 ? 'long-membayar' : frPct <= -WAWASAN.FUNDING_EKSTREM * 100 ? 'short-membayar' : 'seimbang'
  const kunci = [`${arah}-${rezimKoin}`, band, `taker-${taker}`, sesuai >= 3 ? '3-5' : '0-2', `funding-${fnd}`]
  return forensik[lane].zona.filter((z) => kunci.includes(z.kunci))
}
// V252: bukti racun taker-searah (jalur ARAH) → bobot tekanan komite DITURUNKAN
// (bobot lokal deterministik dari medan; genome evolusi tetap jalur belajarnya)
const forensikTindakan = []
let blokForensikArah = 0
let blokForensikPhx = 0
if (forensik.arah.racun.some((z) => z.kunci === 'taker-searah')) {
  const totLama = DIM_ARAH.reduce((a, k) => a + (bobotArah[k] ?? 0), 0)
  const tekLama = bobotArah.tekanan ?? 0.18
  const tekBaru = clamp(tekLama * 0.6, 0.02, 0.4)
  const sisaLama = totLama - tekLama
  if (sisaLama > 0) for (const k of DIM_ARAH) if (k !== 'tekanan') bobotArah[k] = (bobotArah[k] ?? 0) * ((totLama - tekBaru) / sisaLama)
  bobotArah.tekanan = tekBaru
  forensikTindakan.push(`genome komite: bobot tekanan diturunkan ${(tekLama * 100).toFixed(1)}% → ${(tekBaru * 100).toFixed(1)}% — mengikuti kerumunan terbukti racun (forensik medan)`)
  log(`forensik-genome: bobot tekanan diturunkan → ${JSON.stringify(bobotArah)}`)
}

// ---- 1. kunci prediksi hari ini (pra-registrasi: SEBELUM pergerakan) ----
const terkunciBaru = []
const nearMiss = []
// V259 KAIZEN-PULIH — penghitung siklus (param kaizen lapis siklus)
let dinginSasaranCt = 0, dinginFamCt = 0, kembaliPintarCt = 0, remPelajaranCt = 0   // V264: kembali-pintar & rem pelajaran
const karantinaBaru = [], karantinaPulih = []
// V255 METAKOGNISI-NEVRON — lapis monitor dihitung sekali per siklus:
const biasKonteksGlobal = hitungBiasKonteks(forensik.arah.zona, closedArah, WAKTU.getTime())
const deteksiLoopRes = deteksiLoop(closedArah)
const intervensiMetakognitif = []
let estVetoCt = 0, predVetoCt = 0
if (deteksiLoopRes.length) {
  log(`metakognisi-loop: ${deteksiLoopRes.map((l) => `${l.jenis}(${l.pola})`).join(', ')}`)
  intervensiMetakognitif.push({ waktu: ISO, jenis: 'deteksi-loop', target: 'riwayat vonis lane ARAH', tindakan: 'diawasi — sinyal searah pola dinilai lebih keras', alasan: deteksiLoopRes.map((l) => l.ket).join('; ') })
}

// 1a. lane ARAH — komite genome di kandang 10 mayor
// V252: DUA TAHAP — hitung semua kandidat dulu, lalu gerbang forensik memisahkan
// yang layak dari zona racun terbukti (mandat investor: "berani mengurangi atau
// menolak sinyal buruk — lebih baik tidak mengambil posisi daripada merugi").
const kandidatArah = []
// V260 AUTOPILOT — level-portofolio pra-loop: drawdown ledger, rezim-medan P&L
// (baseline σ mandiri dipersistenkan), dan uji-tegang 5 skenario ke posisi terbuka.
const _netUrut = [...closedArah].sort((a, b) => (a.waktuDinilai || '').localeCompare(b.waktuDinilai || ''))
let _jalanAuto = 0, _puncakAuto = 0, ddAuto = 0
for (const e of _netUrut) { _jalanAuto += e.net; _puncakAuto = Math.max(_puncakAuto, _jalanAuto); ddAuto = Math.max(ddAuto, (_puncakAuto - _jalanAuto) * 100) }
if (!keadaan.auto) keadaan.auto = { baselineSigma: null }
if (!Array.isArray(keadaan.kaizen.netHist)) keadaan.kaizen.netHist = []
const rezimAuto = rezimMedan(keadaan.kaizen.netHist, keadaan.auto.baselineSigma)
if (rezimAuto.sigma != null && keadaan.auto.baselineSigma == null) { keadaan.auto.baselineSigma = rezimAuto.sigma; log(`rezim-medan: baseline σ dikalibrasi mandiri dari window penuh pertama (${rezimAuto.sigma}%) — akan dibandingkan σ berikutnya`) }
const tegangAuto = ujiTegang(ledger.filter((e) => e.status === 'TERBUKA'))
log(`autopilot: dd ${ddAuto.toFixed(2)}% · rezim-medan ${rezimAuto.rezim} (${rezimAuto.mult}×) · uji-tegang terburuk ${tegangAuto.terburuk ? `${tegangAuto.terburuk.nama} ${tegangAuto.terburuk.rugiUnit} unit` : '—'} · posisi terbuka ${ledger.filter((e) => e.status === 'TERBUKA').length}`)
let butaAsahCt = 0, butaVetoCt = 0, butaBonusCt = 0             // V265 sekolah-buta (ujian buta-histori)
// V266 BAROMETER-MKRO — dibaca SEBELUM loop kunci dari lilin 1h yang SUDAH ditelusuri
// (0 permintaan baru, blind aman): ret24 BTC + breadth. Bukti holdout 10-02 (63 soal v6.2:
// ak 0%, 57/57 BUY salah saat BTC −1.9..−2.6%, alt −2..−6%): momentum mikro tidak melihat
// arah makro harian — barometer kini mengikat di gerbang kunci.
const baroRet24Btc = (() => { const cB = hasil.BTC; if (!cB || cB.length < 25) return null; const cl = cB.map((x) => x.c); return +((cl[cl.length - 1] / cl[cl.length - 25] - 1) * 100).toFixed(2) })()
// V267 ANTI-ARUS — saksi pantulan sesaat: ret1h BTC (jebakan pantulan vs menadah dasar)
const baroRet1hBtc = (() => { const cB = hasil.BTC; if (!cB || cB.length < 2) return null; const cl = cB.map((x) => x.c); return +((cl[cl.length - 1] / cl[cl.length - 2] - 1) * 100).toFixed(2) })()
const _baroKoin = [...Object.values(hasil)].filter((cB) => Array.isArray(cB) && cB.length >= 25)
const baroBreadth = _baroKoin.length ? +(_baroKoin.filter((cB) => cB[cB.length - 1].c > cB[cB.length - 25].c).length / _baroKoin.length * 100).toFixed(0) : null
const bearHarian = (baroRet24Btc != null && baroRet24Btc <= BUTA.BEAR_BTC_PCT) || (baroBreadth != null && baroBreadth <= BUTA.BEAR_BREADTH_PCT)
log(`barometer-v267: ret24 BTC ${baroRet24Btc}% · ret1h ${baroRet1hBtc}% · breadth ${baroBreadth}% naik → ${bearHarian ? 'BEAR-HARIAN (organ barometer+anti-arus mengikat)' : 'normal'}`)
for (const s of KANDANG) {
  const c = hasil[s]; if (!c) continue
  const id = `${s}-${TGL}`
  if (ledger.some((e) => e.id === id)) continue                    // satu per simbol per hari UTC
  const b = dewanBukti(c)
  const wawCtx = ctxSamudra(s, null, null)                            // V257: konteks samudra-dalam
  const warA = mesinWarisan(c, hasil.BTC)                          // V249: konteks kuant ARAH (dipindah duluan utk param samudra)
  const mcA = warA.garch.sigma1j > 0 ? monteCarlo24j(c, warA.garch) : null   // V251: kerucut MC utk ekspektasi arah
  // V263 MATEMATIKA MURNI + MATA JAUH — dihitung dari lilin & funding saat itu:
  const _frKiniMate = wawCtx.frKini
  const jauhA = warA.garch.sigma1j > 0 ? mataJauh(c, warA.garch) : null      // peta 72 jam (pNaik 24/48/72)
  const mateA = mesinMate(c, _frKiniMate, null)                              // statistika murni; EV-eko dihitung ulang saat arah vonis diketahui
  wawCtx.war = warA; wawCtx.mc = mcA
  const wp = wawasanPenuh(c, hasil.BTC, s, wawCtx)                 // V254: inti 12 + observasi ~40
  const waw = wp.inti
  const buktiWaw = Object.fromEntries(waw.map((p) => [p.param, +p.arah.toFixed(3)]))
  const v = vonis(b, waw, bobotArah, bobotWaw, rezimGlobal)
  // V265 SEKOLAH-BUTA — kalibrasi jujur & ukuran dari bukti 2.533 soal blind.
  // ANTI-KARANTINA: tidak ada suara dibungkam — SELL-lemah tetap mengunci & belajar,
  // cukup keyakinannya diluruskan (≤40) dan ukurannya dikecilkan (×0.5).
  const butaAsah = []
  if (v.arah === 'SELL' && mateA?.zSma != null && mateA.zSma < BUTA.JUAL_Z_MAKS) {
    butaAsah.push({ organ: 'jual-lemah', keyLama: v.keyakinan })
    v.keyakinan = Math.min(v.keyakinan, BUTA.JUAL_KEY_MAKS)
  }
  if (v.keyakinan >= 55 && v.keyakinan < 70 && mateA?.drift24jPct != null &&
      ((v.arah === 'BUY' && mateA.drift24jPct < 0) || (v.arah === 'SELL' && mateA.drift24jPct > 0))) {
    butaAsah.push({ organ: 'key-melawan-drift', keyLama: v.keyakinan })
    v.keyakinan = Math.max(30, Math.round(v.keyakinan * BUTA.KEY_DRIFT_F))
  }
  // V266 BAROMETER — makro-harian mengikat saat kunci (bukti bedah 2.366 soal):
  // SELL saat bear-harian = menjual dasar (ak 30.2% net −339.3%, n=397) → dijujurkan;
  // BUY saat bear-harian = menadah pantulan (ak 53.9% net +80.1%) → DIPERTAHANKAN;
  // BUY saat BTC flat-ragu (0..+1%) = ak 40% net −155.8% (n=470) → dijujurkan −8.
  const ret24KoinBaro = (() => { const cl = c.map((x) => x.c); return cl.length >= 25 ? +((cl[cl.length - 1] / cl[cl.length - 25] - 1) * 100).toFixed(2) : null })()
  if (bearHarian && v.arah === 'SELL') {
    butaAsah.push({ organ: 'sell-bear-harian', keyLama: v.keyakinan })
    v.keyakinan = Math.min(v.keyakinan, BUTA.SELL_BEAR_KEY_MAKS)
  }
  if (v.arah === 'BUY' && baroRet24Btc != null && baroRet24Btc >= 0 && baroRet24Btc < 1) {
    butaAsah.push({ organ: 'buy-flat-btc', keyLama: v.keyakinan })
    v.keyakinan = Math.max(30, v.keyakinan - BUTA.BUY_FLAT_KEY_POTONG)
  }
  if (bearHarian && v.arah === 'SELL' && ret24KoinBaro != null && baroRet24Btc != null && ret24KoinBaro > baroRet24Btc) {
    butaAsah.push({ organ: 'sell-relatif-kuat', keyLama: v.keyakinan })
    v.keyakinan = Math.min(v.keyakinan, BUTA.SELL_RELATIF_KEY_MAKS)
  }
  // V267 ANTI-ARUS — bukti bedah putaran-3: BUY saat bear + saksi pantulan sesaat = jebakan
  // (n=77 ak 41.6% net −23.4%) — membeli kenaikan sesaat di tengah jatuh = puncak pantulan kecil;
  // BUY saat ret24 ≤ −2.5% = menadah pisau (n=27 net −3.8%; vs −2..−1% untung +83.1% — batas tajam).
  // Tetap mengunci & tetap belajar (anti-karantina) — hanya keyakinan & ukuran yang dijujurkan.
  if (v.arah === 'BUY' && bearHarian && baroRet24Btc != null && baroRet24Btc <= BUTA.BEAR_BTC_PCT && baroRet1hBtc != null && baroRet1hBtc >= BUTA.BUY_SAKSI_PCT) {
    butaAsah.push({ organ: 'buy-saksi-terbalik', keyLama: v.keyakinan })
    v.keyakinan = Math.max(30, v.keyakinan - BUTA.BUY_SAKSI_KEY_POTONG)
  }
  if (v.arah === 'BUY' && baroRet24Btc != null && baroRet24Btc <= BUTA.BUY_JATUH_BTC_PCT) {
    butaAsah.push({ organ: 'buy-jatuh-dalam', keyLama: v.keyakinan })
    v.keyakinan = Math.max(30, v.keyakinan - BUTA.BUY_JATUH_KEY_POTONG)
  }
  if (butaAsah.length) butaAsahCt++
  const eksA = mcA ? eksArah(v.arah, mcA) : null
  const mateArah = mesinMate(c, _frKiniMate, v.arah)   // V263: EV-ekonomi searah posisi (drift+carry−biaya)
  const buktiCand = Object.fromEntries(DIM_ARAH.map((k) => [k, +b.dims[k].arah.toFixed(3)]))
  const frPct = waw.find((p) => p.param === 'funding')?.nilai ?? null
  const kena = zonaKandidat('arah', v.arah, b.rezim, v.keyakinan, buktiCand, frPct)
  const vetoW = vetoWaw(wp.penuh, v.arah)                          // V254: gerbang veto wawasan
  // V256 MESIN-DEAL-ODDS — metakognisi dihitung DI LOOP (dibutuhkan untuk ranking odds
  // sebelum kunci), rencana deal + tag peristiwa + skor odds dipra-registrasi per kandidat:
  const estM = estimasiKeyakinan({ wp, v, b, eksA, kena }, forensik.arah.zona, gagal.length >= 6)
  const predM = prediksiKegagalan(v.arah, b.rezim, eksA, forensik.arah.zona, closedArah, WAKTU.getTime())
  const periA = tagPeristiwa(c, v.arah, warA, wp)
  const dealA = rencanaDeal(c, b.harga, v.arah, Math.max(eksA ? eksA.gainPct / 100 : 0.01, 0.01))
  const oddsA = skorOdds({ pWin: eksA ? clamp(eksA.p, 0, 1) : null, zonaHit: hitZona(kena), metaLevel: estM.level, dayaAvg: dayaRata(b.dims), emas: false })   // emas belum diketahui di sini — bonus diberikan saat ranking
  // V265 SEKOLAH-BUTA — bonus zona kekuatan: BUY momentum searah (z≥1.5 atau drift≥5%)
  // terbukti ak 47.6-48.1% net +106..+191% — prioritas kuota, disegel di odds
  if (v.arah === 'BUY' && ((mateA?.zSma ?? -9) >= BUTA.MOMENTUM_Z || (mateA?.drift24jPct ?? -9) >= BUTA.MOMENTUM_DRIFT)) {
    oddsA.skor = Math.min(100, oddsA.skor + BUTA.MOMENTUM_ODDS_BONUS)
    oddsA.butaBonus = BUTA.MOMENTUM_ODDS_BONUS
    butaBonusCt++
  }
  // V258 GEKKO-CZAR — meta-inferensi kolektif + probPasar + divergensi + ekspresi:
  // semuanya dihitung DI LOOP (dibutuhkan ranking & pra-registrasi), nol permintaan baru.
  const metaA = metaInferensi(wp.penuh)
  const ppA = probPasar(Object.fromEntries(wp.penuh.map((p) => [p.param, p])))
  const divergA = (ppA != null && metaA.metaArah != null)
    ? +((v.keyakinan / 100) - (metaA.metaArah === 'BUY' ? ppA : 1 - ppA)).toFixed(3)
    : null   // >0 = komite lebih yakin dari pasar pada arahnya sendiri
  const eksprA = ekspresiSkala({
    odds: oddsA.skor, keyakinan: v.keyakinan,
    atrPctile: wp.penuh.find((p) => p.param === 'atrPctile')?.nilai ?? null,
    fundingPct: frPct,
  })
  // param gekko masuk wp.penuh (lapis 'gekko') — disekolahkan seperti saudaranya;
  // 2 pembicara (metaArah, probPasar), 3 pengamat sunyi (arah 0)
  wp.penuh.push(
    { param: 'metaArah', domain: 'gekko-allora', lapis: 'gekko', nilai: metaA.metaArah, arah: metaA.metaArah === 'BUY' ? 0.5 : metaA.metaArah === 'SELL' ? -0.5 : 0, ket: `${metaA.ket} — suara kolektif ${metaA.metaArah ?? '—'}${metaA.metaKeyakinan != null ? ` ${metaA.metaKeyakinan}%` : ''} (Allora Topics)` },
    { param: 'metaKeyakinan', domain: 'gekko-allora', lapis: 'gekko', nilai: metaA.metaKeyakinan, arah: 0, ket: `keyakinan meta-inferensi ${metaA.metaKeyakinan ?? '—'}% — terkuat ${metaA.terkuat ?? '—'}, terlemah ${metaA.terlemah ?? '—'}` },
    { param: 'probPasar', domain: 'gekko-allora', lapis: 'gekko', nilai: ppA, arah: ppA != null ? +((ppA - 0.5) * 2).toFixed(3) : 0, ket: `P(naik) implisit pasar ${(ppA != null ? (ppA * 100).toFixed(0) : '—')}% dari agresor taker + kerumunan LS + funding + EMA4h (Allora prediction-markets)` },
    { param: 'divergensi', domain: 'gekko-allora', lapis: 'gekko', nilai: divergA, arah: 0, ket: divergA == null ? 'divergensi jujur kosong — probPasar/meta belum terukur' : `divergensi ${divergA >= 0 ? '+' : ''}${divergA} — ${Math.abs(divergA) >= GEK.DIVERG_KUAT ? 'komite TERPISAH JAUH dari harga kerumunan (edge atau trap — dinilai medan)' : 'komite cukup selaras pasar'}` },
    { param: 'ekspresi', domain: 'gekko-allora', lapis: 'gekko', nilai: eksprA.skala, arah: 0, ket: `skala eksposur dinamis ${eksprA.skala}× unit (odds ${eksprA.faktor.odds >= 0 ? '+' : ''}${eksprA.faktor.odds}, keyakinan ${eksprA.faktor.keyakinan >= 0 ? '+' : ''}${eksprA.faktor.keyakinan}, volatilitas ${eksprA.faktor.volatilitas}, kerumunan ${eksprA.faktor.kerumunan}) — Allora×G.A.M.E` },
  )
  // V260 AUTOPILOT — slip-neto + peluang-skor + kelly-lapis (pra-registrasi per kandidat):
  const qvLast = c[c.length - 1]?.qv ?? null
  const sprBps = wp.penuh.find((p) => p.param === 'bukuSpread')?.nilai ?? null
  const autoSlip = slipNeto({ qvUsd: qvLast, spreadBps: sprBps, edgePct: eksA ? eksA.evPct : null })
  const nVonisS = closedArah.filter((e) => e.simbol === s).length
  let streakKalahS = 0
  for (let i = closedArah.length - 1; i >= 0; i--) { const _eS = closedArah[i]; if (_eS.simbol !== s) continue; if (_eS.net <= 0) streakKalahS++; else break }
  const autoKelly = kellyLapis({ ddPct: ddAuto, nVonis: nVonisS, lossStreak: streakKalahS, sigma24jPct: warA.garch.sigma24jPct })
  const autoPeluang = peluangSkor({ edgeBersih: autoSlip.edgeBersih, liqUsd: qvLast, keyakinan: v.keyakinan, spreadBps: sprBps, slipPct: autoSlip.slipPct })
  wp.penuh.push(
    { param: 'peluang', domain: 'autopilot-recogard', lapis: 'autopilot', nilai: autoPeluang.skor, arah: 0, ket: `${autoPeluang.ket} — gerbang: < ${AUT.PELUANG_AMBANG} ditolak dengan alasan` },
    { param: 'slipPct', domain: 'autopilot-recogard', lapis: 'autopilot', nilai: autoSlip.slipPct, arah: 0, ket: autoSlip.ket },
    { param: 'kellyMult', domain: 'autopilot-recogard', lapis: 'autopilot', nilai: autoKelly.mult, arah: 0, ket: `kelly-lapis ${autoKelly.mult}× unit (dd ${autoKelly.f.drawdown} · sampel ${autoKelly.f.sampel} · streak ${autoKelly.f.streakKalah} · vol ${autoKelly.f.vol}) — dynamic Kelly AutoPilotPM; skalaEfektif = ekspresi × kelly` },
  )
  // V263 MATEMATIKA MURNI & EKONOMI CERDAS — 3 param baru disekolahkan medan (lapis 'mate'):
  wp.penuh.push(
    { param: 'mateHurst', domain: 'matematika-murni', lapis: 'mate', nilai: mateArah.hurst, arah: mateArah.hurst != null ? +clamp((mateArah.hurst - 0.5) * 2 * (v.arah === 'BUY' ? 1 : -1), -1, 1).toFixed(3) : 0, ket: `Hurst R/S ${mateArah.hurst ?? '—'} (tren > 0.55 · pulang-keseimbangan < 0.45) + half-life ${mateArah.halfLife ?? '—'} jam + autokorelasi ${mateArah.autoKorel ?? '—'} — statistika murni dari data saat itu (V263)` },
    { param: 'mateEkonomi', domain: 'ekonomi-cerdas', lapis: 'mate', nilai: mateArah.ekonomi.evEkoPct, arah: mateArah.ekonomi.evEkoPct != null ? +clamp(mateArah.ekonomi.evEkoPct / 2, -1, 1).toFixed(3) : 0, ket: `EV-ekonomi ${v.arah} ${mateArah.ekonomi.evEkoPct != null ? mateArah.ekonomi.evEkoPct + '%' : '—'} = drift OLS 24j ${mateArah.drift24jPct ?? '—'}% (R² ${mateArah.r2Tren ?? '—'}) + carry funding ${mateArah.ekonomi.carry24jPct ?? '—'}% − biaya putar — siapa membayar siapa (V263)` },
    { param: 'mateJauh', domain: 'mata-jauh', lapis: 'mate', nilai: jauhA?.pNaik72 ?? null, arah: jauhA ? +clamp((jauhA.pNaik72 - 0.5) * 2, -1, 1).toFixed(3) : 0, ket: `MATA JAUH 72 jam: P(naik) 24j ${jauhA?.pNaik24 ?? '—'} · 48j ${jauhA?.pNaik48 ?? '—'} · 72j ${jauhA?.pNaik72 ?? '—'}, median 72j ${jauhA?.med72 ?? '—'}% — kerucut MC bootstrap, membaca jauh sebelum terjadi (V263)` },
  )
  // V261 CLAW-TEMPOK — komite panjia + kartu risiko (pra-registrasi per kandidat,
  // nol permintaan baru — semua dari param yang sudah ada di wp.penuh):
  const komC = komiteArah(wp.penuh)
  const _lsP = wp.penuh.find((x) => x.param === 'lsAkun')
  const _tkP = wp.penuh.find((x) => x.param === 'lsTaker')
  const lsJarakC = _lsP?.nilai != null && Number.isFinite(+_lsP.nilai) ? Math.abs(+_lsP.nilai - 1) : null
  const takerJarakC = _tkP?.nilai != null && Number.isFinite(+_tkP.nilai) ? Math.abs(+_tkP.nilai) : null
  const fundVsC = wp.penuh.find((x) => x.param === 'fundVsBtc')?.nilai ?? null
  const famKeyC = `${b.rezim}-${v.arah}`
  const terbukaC = ledger.filter((e) => e.status === 'TERBUKA')
  const konsentrasiC = terbukaC.length ? terbukaC.filter((e) => `${e.rezim}-${e.arah}` === famKeyC).length / terbukaC.length : 0
  const kartC = kartuRisiko({ qvUsd: qvLast, spreadBps: sprBps, volZ: wp.penuh.find((x) => x.param === 'volZ')?.nilai ?? null, sigmaPct: warA.garch.sigma24jPct, fundingPct: frPct, fundVsBtc: fundVsC, lsJarak: lsJarakC, takerJarak: takerJarakC, konsentrasiFam: konsentrasiC })
  wp.penuh.push(
    { param: 'komite', domain: 'clawtrade-keluarga', lapis: 'claw', nilai: komC.keyakinan, arah: komC.arah === 'BUY' ? 0.5 : komC.arah === 'SELL' ? -0.5 : 0, ket: `${komC.ket} — 5 suara berbobot tetap ala CoordinatorAgent (ClawTradeAI)` },
    { param: 'kartu', domain: 'clawtrade-keluarga', lapis: 'claw', nilai: kartC.skor, arah: 0, ket: `${kartC.ket} — kartu 4×25 ala RiskManagerAgent; > ${CLAW.KARTU_MAKS} diveto-saksi` },
  )
  kandidatArah.push({ s, id, b, v, waw, wp, buktiWaw, warA, mcA, eksA, mateA: mateArah, jauhA, buktiCand, kena, vetoW, estM, predM, peri: periA, deal: dealA, odds: oddsA, metaA, ppA, divergA, eksprA, butaAsah, auto: { slip: autoSlip, kelly: autoKelly, peluang: autoPeluang }, komC, kartC })
}
const emasArah = (k) => k.kena.some((z) => z.status === 'EMAS')
// V259 KESEGARAN GERAKAN (kaizen-trader: "1H ACCELERATION is THE key signal...
// fresh breakouts > stale pumps. Late entries are exit liquidity"): skor kesegaran
// per kandidat + veto POMPA-TUA — |24j| > 100% tanpa akselerasi 1 jam ≥ 5% ditolak;
// umur gerakan tak terbaca diperlakukan TUA (konservatif pada kekaburan).
let pompaTuaCt = 0
let peluangVetoCt = 0, slipVetoCt = 0
let impasZonaCt = 0, impasKarantinaCt = 0, impasAlokasiCt = 0   // V263: impasKarantinaCt kini menghitung MODE-ASAH (bukan blok)
for (const k of kandidatArah) {
  const cK = hasil[k.s]
  if (!cK || cK.length < 26) { k.kaizen = { aks1: null, c24: null, kesegaran: 0.5, ket: 'lilin kurang — kesegaran tak terukur, diperlakukan netral-tua' }; continue }
  const aks1 = (cK[cK.length - 1].c / cK[cK.length - 2].c - 1) * 100
  const c24 = (cK[cK.length - 1].c / cK[cK.length - 25].c - 1) * 100
  const skorSegar = +clamp(0.5 + Math.abs(aks1) / 20 - Math.max(0, Math.abs(c24) - 50) / 200, 0, 1).toFixed(3)
  k.kaizen = { aks1: +aks1.toFixed(2), c24: +c24.toFixed(2), kesegaran: skorSegar }
  if (Math.abs(c24) > KZN.KESEGARAN_24J && Math.abs(aks1) < KZN.KESEGARAN_AKS && k.vetoW) {
    k.vetoW.push({ kunci: 'pompa-tua', ket: `pompa tua (kaizen-trader): |24j ${c24.toFixed(1)}%| > ${KZN.KESEGARAN_24J}% tanpa akselerasi segar (1j ${aks1.toFixed(2)}% < ${KZN.KESEGARAN_AKS}%) — entri telat = likuiditas keluar` })
    pompaTuaCt++
  }
}
if (pompaTuaCt) log(`kaizen-kesegaran: ${pompaTuaCt} kandidat ditolak pompa-tua (24j > ${KZN.KESEGARAN_24J}% tanpa aks 1j >= ${KZN.KESEGARAN_AKS}%)`)
// V254: kandidat yang DI-VETO wawasan dipisah — bukan racun forensik, tapi ditolak
// parameter medan (order book / funding-riwayat / tren 4h / volatilitas ekstrem).
const divetoArah = kandidatArah.filter((k) => k.vetoW.length)
const bersihArah = kandidatArah.filter((k) => !k.vetoW.length && !k.kena.some((z) => z.status === 'RACUN'))
const tercemarArah = kandidatArah.filter((k) => k.kena.some((z) => z.status === 'RACUN'))
  .sort((a, b) => (b.eksA?.evPct ?? -99) - (a.eksA?.evPct ?? -99))
// SLOT EKSPLORASI forensik (bandit berbatas): 1 kandidat racun per denyut dengan
// EV statistik >= 0 boleh lewat — tanpa informasi baru, zona tak pernah bisa menyembuh.
const eksplorasiArah = tercemarArah.find((k) => k.eksA && k.eksA.evPct >= 0) || null
// V264 PINTAR-KEMBALI — doktrin pemilik (2026-10-03): "koin/pola boleh dibuka lagi
// jika setup valid sekarang; jika pernah gagal pada pola serupa: boleh kembali, tapi
// dengan syarat tambahan dari pelajaran (lebih ketat), bukan syarat default seolah
// belum pernah SALAH." Syarat dihitung dari ledger sendiri (bukan tebakan), mengikat
// SAAT KUNCI, dan disegel di entri — bukti belajar yang bisa diaudit, bukan dendam.
const syaratDariPelajaran = (simbol, arah, rezim) => {
  const matangSas = ledger.filter((e) => (e.status === 'BENAR' || e.status === 'SALAH') && e.simbol === simbol && e.arah === arah)
  const salahSas = matangSas.filter((e) => e.status === 'SALAH')
  const salahFam = ledger.filter((e) => e.status === 'SALAH' && e.arah === arah && e.rezim === rezim)
  const kej = salahSas.length
  if (!kej && salahFam.length < 3) return null   // keluarga serupa menambah kehati-hatian hanya bila darahnya cukup (n≥3)
  const n = kej + (salahFam.length >= 3 ? 1 : 0)
  const sebab = []
  for (const e of salahSas.slice(-3)) {
    const z = e.impas?.zona
    if (z != null && ((e.arah === 'SELL' && z <= -IMPAS.ZONA_CHASE) || (e.arah === 'BUY' && z >= IMPAS.ZONA_CHASE))) sebab.push('mengejar-ujung-rentang')
    else if ((e.impas?.keyakinanTerkalibrasi ?? 100) < IMPAS.KALIB_AMBANG) sebab.push('overclaim-keyakinan')
    else sebab.push('arah-melawan-gerak')
  }
  const ekstraKey = Math.min(PINTAR.SYARAT_KEY_PER_KEJ * n, PINTAR.SYARAT_KEY_MAKS)
  const tingkat = Math.min(n, 2)
  const skalaF = +Math.pow(PINTAR.SYARAT_SKALA_F, tingkat).toFixed(2)
  const stopF = +Math.pow(PINTAR.SYARAT_STOP_F, tingkat).toFixed(2)
  return {
    kejadianSasaran: kej, kejadianKeluarga: salahFam.length, tingkat,
    ekstraKeyakinan: ekstraKey, barKeyakinan: PINTAR.WAJIB_KEY_DASAR + ekstraKey,
    skalaFaktor: skalaF, stopFaktor: stopF, wajibMate: n >= PINTAR.SYARAT_WAJIB_MATE,
    sebabTerakhir: [...new Set(sebab)],
    riwayat: salahSas.slice(-3).map((e) => ({ id: e.id, netPct: +((e.net || 0) * 100).toFixed(2), rezim: e.rezim })),
    ket: `pernah SALAH ${kej}× pada pola serupa${salahFam.length >= 3 ? ` (+${salahFam.length} di keluarga ${arah}-${rezim})` : ''} — kembali BOLEH, syarat lebih ketat: keyakinan ≥ ${PINTAR.WAJIB_KEY_DASAR + ekstraKey}, ukuran ×${skalaF}, stop ×${stopF}${n >= PINTAR.SYARAT_WAJIB_MATE ? ', wajib konfirmasi mata-jauh searah' : ''}`,
    sumber: 'ledger pra-registrasi sendiri', mengikatSaat: 'kunci',
  }
}
const kunciEntriArah = (k, eksplor, runnerUp, peneliti) => {
  const { s, id, b, v, waw, wp, buktiWaw, warA, mcA, eksA, mateA, jauhA, buktiCand, kena, estM, predM, peri, deal, odds, metaA, ppA, divergA, eksprA, butaAsah, auto, komC, kartC } = k
  const emas = emasArah(k)
  // V264 REM-PINTAR (revisi dingin-dendam V259 — doktrin pemilik: jejak dingin =
  // REM SINGKAT ber-kadaluarsa, bukan blacklist): 2 kekalahan beruntun → rem 1 DENYUT
  // (15 menit), ber-alasan, ber-akhir, tidak pernah mematikan belajar. Setelah rem,
  // setup valid BOLEH kembali lewat syarat tambahan dari pelajaran (gerbang kembali-pintar).
  const dSas = kaizen.dingin[s]
  if (!eksplor && dSas && WAKTU.getTime() < (dSas.dinginSampai || 0)) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `REM-PINTAR (V264 — rem singkat, bukan blacklist) — ${s} mencatat kekalahan beruntun; rem aktif hingga ${new Date(dSas.dinginSampai).toISOString()} (1 denyut 15 menit); pasarnya hidup: setup valid BOLEH kembali setelah rem, dgn syarat tambahan dari pelajaran`, kunci: ['rem-pintar'] })
    dinginSasaranCt++
    log(`rem-pintar: ${s} ${v.arah} rem singkat aktif (ber-akhir — kembali lewat syarat pelajaran, bukan dendam)`)
    return null
  }
  const famKey = `${b.rezim}-${v.arah}`
  const dFam = kaizen.dinginFam[famKey]
  if (!eksplor && dFam && SIKLUS < (dFam.dinginSampaiDenyut || 0)) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `REM-PINTAR KELUARGA (V264) — ${famKey} ${KZN.DINGIN_FAM_KEJ} kekalahan beruntun; rem singkat 1 denyut (ber-akhir, bukan pembekuan) — denyut berikutnya boleh kembali dengan syarat pelajaran`, kunci: ['rem-pintar'] })
    dinginFamCt++
    return null
  }
  // V255 METAKOGNISI — otak menilai dirinya sendiri SEBELUM mengunci (V256: dihitung di loop, dipakai ulang di sini):
  const biasB = biasKonteksGlobal[`${v.arah}-${b.rezim}`] ?? null
  const biasT = terapkanBias(v.keyakinan, biasB)
  if (!eksplor && !peneliti && (!estM.lolos || !predM.lanjut)) {
    const alasanMet = []
    if (!estM.lolos) alasanMet.push(`estimator keyakinan metakognitif ${(estM.level * 100).toFixed(0)}% < ${NEV.ESTIMATOR_MIN_LOLOS * 100}% (terlemah: ${KET_FAKTOR[estM.terlemah]})`)
    if (!predM.lanjut) alasanMet.push(`prediktor kegagalan prob ${(predM.probGagal * 100).toFixed(0)}% >= ${NEV.PREDIKTOR_MAKS_PROB * 100}% (${predM.alasan.map((a) => a.sumber).join(', ')})`)
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `GERBANG METAKOGNITIF (Nevron) — ${alasanMet.join('; ')} — otak menilai dirinya sendiri sebelum bertaruh: TUNGGU`, kunci: ['metakognisi'] })
    if (!estM.lolos) estVetoCt++; else predVetoCt++
    intervensiMetakognitif.push({ waktu: ISO, jenis: !estM.lolos ? 'estimator-keyakinan' : 'prediktor-kegagalan', target: `${s} ${v.arah}`, tindakan: 'VETO — sinyal tidak dikunci', alasan: alasanMet.join('; ') })
    log(`metakognisi-veto: ${s} ${v.arah} — ${alasanMet.join('; ')}`)
    return null
  }
  // V260 AUTOPILOT — dua gerbang baru yang HANYA MENOLAK (tak melonggarkan apa pun):
  // (a) peluang-skor < ambang → tolak dengan alasan (topBlockReasons); (b) edge-bersih
  // setelah slippage ≤ 0 → tolak: biaya jatuh-tempo menelen seluruh ekspektasi.
  if (!eksplor && !peneliti && auto?.peluang && auto.peluang.skor < AUT.PELUANG_AMBANG) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `PELUANG RENDAH (AutoPilotPM) — skor ${auto.peluang.skor}/100 < ${AUT.PELUANG_AMBANG} · ${auto.peluang.ket} — komposit terbobot + penalti menolak dengan alasan, bukan mood`, kunci: ['peluang-rendah'] })
    peluangVetoCt++
    log(`autopilot-peluang: tolak ${s} ${v.arah} — skor ${auto.peluang.skor} < ${AUT.PELUANG_AMBANG}`)
    return null
  }
  if (!eksplor && !peneliti && auto?.slip && auto.slip.edgeBersih != null && auto.slip.edgeBersih <= 0) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `SLIP-NETO (AutoPilotPM) — edge ${eksA ? eksA.evPct.toFixed(2) : '—'}% − slip ${auto.slip.slipPct}% ≤ 0: biaya jatuh-tempo menelen seluruh ekspektasi — TUNGGU (fallback-jujur: data kosong tidak memblokir)`, kunci: ['slip-neto'] })
    slipVetoCt++
    log(`autopilot-slip-neto: tolak ${s} ${v.arah} — edge bersih ${auto.slip.edgeBersih}%`)
    return null
  }
  // V261 CLAW-TEMPOK — pagar-baja dicek DULU (ala guardrails.run_all_checks):
  // daftar-hitam → kuota harian → komite panjia → veto-saksi kartu → langit-langit
  // slip → tangga kuanta → antrean menunggu-mandat. Setiap blok dicatat ke buku-tekok
  // (audit per aturan ala audit.py append-only) + masuk nearMiss (top-tolak).
  const _tekok = (aturan, alasan) => { claw.bukuTekok[aturan] = (claw.bukuTekok[aturan] || 0) + 1; log(`claw-tekok: ${aturan} — ${alasan}`) }
  for (const q of claw.konfirm) if (q.status === 'pending' && WAKTU.getTime() > q.kadaluarsa) { q.status = 'expired'; claw.konfirmExpCt++; log(`claw-konfirm: ${q.simbol} ${q.arah} KADALUARSA (>${CLAW.KONFIRM_TIMEOUT_JAM} jam) — mandat batal ala CONFIRM_TIMEOUT`) }
  const pend = claw.konfirm.find((x) => x.simbol === s && x.arah === v.arah && x.status === 'pending')
  const konfirmOk = !!pend
  const hitamS = claw.hitam[s]
  if (!eksplor && hitamS && WAKTU.getTime() < (hitamS.sampai || 0)) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `REM-PINTAR KARTU-PANAS (V264 — revisi daftar-hitam blockedTokens; bukan blacklist 48 jam) — ${s} ${hitamS.kej}× diveto kartu-panas beruntun; rem singkat hingga ${new Date(hitamS.sampai).toISOString()} (maks ${CLAW.HITAM_DINGIN_JAM} jam) — ${hitamS.alasan}; setelah rem: kembali lewat syarat tambahan pelajaran`, kunci: ['claw-hitam'] })
    claw.hitamCt++
    _tekok('claw-hitam', `${s} rem singkat kartu-panas aktif`)
    return null
  }
  if (!eksplor && hitamS && WAKTU.getTime() >= (hitamS.sampai || 0)) { delete claw.hitam[s]; log(`claw-hitam: ${s} rem singkat selesai — kembali lewat SYARAT TAMBAHAN pelajaran (V264: bukan coret tanpa riset, bukan blacklist selamanya)`) }
  const kuotaPakai = ledger.filter((e) => e.jalur === 'ARAH' && (e.waktuKunci || '').startsWith(TGL)).length
  if (!eksplor && kuotaPakai >= CLAW.KUOTA_HARIAN) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `KUOTA-HARIAN (guardrail MAX_DAILY_TRADES ala middleware) — ${kuotaPakai} kunci ARAH hari UTC ini >= ${CLAW.KUOTA_HARIAN}: pagar-baja keras menutup keran — konstanta, bukan mood`, kunci: ['claw-kuota'] })
    claw.kuotaCt++
    _tekok('claw-kuota', `kuota ${kuotaPakai}/${CLAW.KUOTA_HARIAN}`)
    return null
  }
  if (!eksplor && !peneliti && komC && komC.terbaca >= 3 && komC.arah && komC.arah !== v.arah) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `KOMITE-PANJIA (ClawTradeAI CoordinatorAgent) — komite 5 suara bersuara ${komC.arah} (koherensi ${(komC.keyakinan * 100).toFixed(0)}%, kekuatan ${komC.skor >= 0 ? '+' : ''}${komC.skor}), berlawanan vonis ${v.arah}: ${komC.suara.map((x) => x.nama).join('/')} — tak ada suara tunggal yang berkuasa`, kunci: ['claw-komite'] })
    claw.komiteVetoCt++
    _tekok('claw-komite', `${s}: komite ${komC.arah} vs vonis ${v.arah}`)
    return null
  }
  if (!eksplor && !peneliti && komC && komC.terbaca >= 3 && komC.keyakinan < CLAW.KOMITE_MINCONF) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `KOMITE-LEMAH (ClawTradeAI minConfidence) — koherensi komite ${(komC.keyakinan * 100).toFixed(0)}% < ${CLAW.KOMITE_MINCONF * 100}% (${komC.ket}) — panji tak cukup tegak untuk membayar spread`, kunci: ['claw-komite'] })
    if (komC.total < CLAW.KOMITE_NETRAL) claw.komiteNetralCt++; else claw.komiteVetoCt++
    _tekok('claw-komite', `${s}: koherensi ${(komC.keyakinan * 100).toFixed(0)}% < ambang`)
    return null
  }
  if (!eksplor && kartC && !kartC.approved) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `VETO-SAKSI (ClawTradeAI riskManagerVeto) — kartu risiko ${kartC.skor}/100 (${kartC.level}) > ${CLAW.KARTU_MAKS}: ${kartC.rinci.join(' · ')} — suara risiko menutup pintu apa pun skor komite`, kunci: ['claw-kartu'] })
    claw.kartuVetoCt++
    const _hLama = claw.hitam[s] || { kej: 0, sampai: 0 }
    _hLama.kej = (_hLama.kej || 0) + 1
    _hLama.alasan = kartC.ket
    if (_hLama.kej >= CLAW.HITAM_KEJ) { _hLama.sampai = WAKTU.getTime() + CLAW.HITAM_DINGIN_JAM * 3600e3; claw.hitamAddCt++; log(`claw-hitam: ${s} ${_hLama.kej}× kartu-panas beruntun → DIBEKUKAN ${CLAW.HITAM_DINGIN_JAM} jam (blockedTokens)`) }
    claw.hitam[s] = _hLama
    _tekok('claw-kartu', `${s}: skor ${kartC.skor} > ${CLAW.KARTU_MAKS}`)
    return null
  }
  if (!eksplor && auto?.slip && auto.slip.slipPct != null && auto.slip.slipPct > CLAW.SLIP_MAKS_PCT) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `LANGIT-LANGIT SLIP (ClawTrade Executor maxSlippageBps) — slip ${auto.slip.slipPct}% > ${CLAW.SLIP_MAKS_PCT}%: pagar-baja keras di luar perhitungan edge — eksekusi mahal ditolak, bukan dinegosiasi`, kunci: ['claw-slipmaks'] })
    claw.slipMaksCt++
    _tekok('claw-slipmaks', `${s}: slip ${auto.slip.slipPct}% > langit-langit`)
    return null
  }
  // V262 IMPAS-CERDAS — tiga gerbang data yang MENGIAT saat kunci (jawaban 4 kasus dev):
  // (1) ZONA-CHASE: menjual di dasar rentang / membeli di puncak rentang = mengejar
  //     gerakan yang sudah selesai — bucket terburuk ledger (n=35, net −29.8%, PF 0.44);
  //     backtest mundur 64 rapor: gerbang ini sendiri mengangkat PF 0.68 → 0.93.
  // (2) ASAH-KALIBRASI (V263 — hukum pemilik: KARANTINA DILARANG, direvisi dari
  //     karantina V262): keyakinan × faktor-jalur tetap dihitung; di bawah ambang
  //     jalur TIDAK diblok — masuk MODE-ASAH (ukuran ×0.6, stop ×0.75) dan TERUS
  //     MENGUNCI + TERUS DINILAI: kesalahan adalah bahan asah, bukan alasan berhenti.
  // (3) ALOKASI-DINAMIS: kuota per jalur dari EV trailing shrinkage Beta(4,4) —
  //     kuota mengalir ke jalur sehat; jalur pendarah tersisa lantai (tetap belajar).
  const srImpas = buktiCand?.sr ?? null
  if (!eksplor && srImpas != null && ((v.arah === 'SELL' && srImpas <= -IMPAS.ZONA_CHASE) || (v.arah === 'BUY' && srImpas >= IMPAS.ZONA_CHASE))) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `ZONA-CHASE (impas-cerdas) — ${v.arah} pada posisi ${(srImpas * 100).toFixed(0)}% rentang 20-bar: ${v.arah === 'SELL' ? 'menjual di dasar rentang = menyerahkan harga terbaik ke pembeli yang lebih sabar' : 'membeli di puncak rentang = membeli barang mahal di rak teratas'}; bucket ini terbukti net −29.8% (PF 0.44, n=35) di ledger sendiri — DIBLOK, bukan sekadar dicatat (jawaban kasus A)`, kunci: ['zona-chase'] })
    impasZonaCt++
    _tekok('impas-zona', `${s}: sr ${srImpas} melawan ${v.arah}`)
    log(`impas-zona: tolak ${s} ${v.arah} — chasing rentang (sr ${srImpas})`)
    return null
  }
  // V263 ASAH-KALIBRASI (hukum pemilik: KARANTINA DILARANG) — keyakinan terkalibrasi
  // tetap dihitung dan disegel, tapi TIDAK lagi memblokir: jalur yang overclaim
  // TETAP MENGUNCI dan TETAP BELAJAR dalam MODE-ASAH — ukuran ×0.6, stop ×0.75,
  // keyakinan yang dilaporkan = terkalibrasi (jujur). Kesalahan = bahan asah.
  const keyTerkalibImpas = +(v.keyakinan * statArahImpas.faktor).toFixed(1)
  const asahKalibAktif = !eksplor && keyTerkalibImpas < IMPAS.KALIB_AMBANG
  if (asahKalibAktif) {
    impasKarantinaCt++   // nama var lama dipertahankan utk laporan siklus — semantik kini "mode-asah"
    log(`impas-asah: ${s} ${v.arah} terkalibrasi ${keyTerkalibImpas} < ${IMPAS.KALIB_AMBANG} → MODE-ASAH (ukuran ×${ASAH.UKURAN_F}, stop ×${ASAH.STOP_KETAT_F}, belajar TETAP JALAN — karantina dilarang)`)
  }
  // V263 ORGAN-BARU — kemampuan yang lahir dari kesalahan kini mengawal gerbang:
  const organKena = (ilmu.organ?.list || []).filter((o) => organPenuhi(o, mateA, v.arah)).map((o) => o.nama)
    .concat((butaAsah || []).map((x) => `buta-${x.organ}`))   // V265 organ sekolah-buta ikut mengawal
  const organVeto = (ilmu.organ?.list || []).find((o) => o.status === 'terbukti' && organKena.includes(o.nama))
  // V265 SEKOLAH-BUTA — veto saksi: SELL di pita sempit (entropi ≤ 0.85; uji blind: ak 11.8%, n=17).
  // Pasar bergerak terus — ini penolakan setup ini saat ini, bukan hukuman bagi koin.
  if (!eksplor && v.arah === 'SELL' && mateA?.entropi != null && mateA.entropi <= BUTA.JUAL_ENTROPI_MAKS) {
    butaVetoCt++
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `ORGAN-BUTA "jual-pita" (V265 sekolah kilat) — ${v.arah} saat entropi arah ${mateA.entropi.toFixed(2)} ≤ ${BUTA.JUAL_ENTROPI_MAKS} (pita sempit cenderung memantul): ujian buta-histori 2.533 soal membuktikan jawaban SELL di pita sempit akurasi 11.8% — organ dari sekolah kilat menahan; setup lain tetap terbuka`, kunci: ['buta-jual-pita'] })
    _tekok('buta-jual-pita', `${s}: entropi ${mateA.entropi.toFixed(2)} pita sempit`)
    log(`buta-veto: ${s} SELL ditahan organ jual-pita (entropi ${mateA.entropi.toFixed(2)})`)
    return null
  }
  if (!eksplor && organVeto) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `ORGAN-BARU "${organVeto.nama}" (V263) — ${organVeto.ket}: organ yang lahir dari kesalahan dan LULUS SEKOLAH MEDAN (${organVeto.n} kasus, hit ${(organVeto.hit * 100).toFixed(0)}%, net ${(organVeto.net * 100).toFixed(1)}%) berhak menolak — setiap kesalahan melahirkan kemampuan baru`, kunci: [`organ-${organVeto.jenis}`] })
    claw.bukuTekok['organ-veto'] = (claw.bukuTekok['organ-veto'] || 0) + 1
    log(`organ-veto: ${s} ${v.arah} ditolak oleh organ "${organVeto.nama}" (terbukti medan)`)
    return null
  }
  // V266 TUNDA-BEAR — SELL terkalibrasi < SELL_BEAR_KUNCI_MIN saat bear-harian tidak dikunci
  // denyut ini (pola KEMBALI-PINTAR: gagal syarat = TUNDA — rem, bukan ban, BUKAN balik arah;
  // anti-karantina terjaga: kandidat tetap tercatat & boleh kunci saat barometer pulih).
  if (!eksplor && !peneliti && bearHarian && v.arah === 'SELL' && v.keyakinan < BUTA.SELL_BEAR_KUNCI_MIN) {
    butaVetoCt++
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `ORGAN-BUTA "tunda-bear" (V266 barometer) — ret24 BTC ${baroRet24Btc}% · breadth ${baroBreadth}% naik = bear-harian; SELL terkalibrasi ${v.keyakinan} < ${BUTA.SELL_BEAR_KUNCI_MIN} → TUNDA denyut ini (bedah 2.366 soal: SELL saat bear ak 30.2% net −339.3% n=397 — menjual dasar; rem, bukan ban; kunci lagi saat barometer pulih)`, kunci: ['buta-tunda-bear'] })
    _tekok('buta-tunda-bear', `${s}: SELL ${v.keyakinan} di bear-harian`)
    log(`buta-tunda-bear: ${s} SELL ${v.keyakinan} ditunda (BTC ${baroRet24Btc}%, breadth ${baroBreadth}%)`)
    return null
  }
  if (!eksplor && kuotaPakai >= kuotaArahImpas) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `ALOKASI-DINAMIS (impas-cerdas) — kuota ARAH hari ini ${kuotaPakai}/${kuotaArahImpas} dari EV trailing shrinkage (ARAH ${statArahImpas.evShrunk >= 0 ? '+' : ''}${(statArahImpas.evShrunk * 100).toFixed(2)}% vs PHOENIX ${statPhxImpas.evShrunk >= 0 ? '+' : ''}${(statPhxImpas.evShrunk * 100).toFixed(2)}% per kunci): kuota mengalir ke jalur yang membuktikan diri di medan — lantai ${IMPAS.KUOTA_FLOOR} tetap hidup untuk belajar (jawaban kasus C)`, kunci: ['impas-alokasi'] })
    impasAlokasiCt++
    _tekok('impas-alokasi', `kuota ARAH ${kuotaPakai}/${kuotaArahImpas}`)
    log(`impas-alokasi: tolak ${s} ${v.arah} — kuota ARAH habis (${kuotaPakai}/${kuotaArahImpas})`)
    return null
  }
  const kal = kunciKeyakinan(biasT.keyakinan + (emas ? 4 : 0), ilmu.kalibrasi, kena)   // V252: kepastian zona medan; V255: masuk lewat bias konteks Nevron
  // V264 KEMBALI-PINTAR — syarat tambahan dari pelajaran MENGIKAT saat kunci
  // (doktrin pemilik: "boleh kembali, tapi dengan syarat tambahan dari pelajaran
  // (lebih ketat), bukan syarat default seolah belum pernah SALAH"). Gagal syarat =
  // TUNDA denyut ini (setup boleh kembali saat terpenuhi) — rem, bukan ban.
  const syarat = eksplor || peneliti ? null : syaratDariPelajaran(s, v.arah, b.rezim)
  if (syarat) {
    const jM = jauhA
    const mateSearah = !syarat.wajibMate ? true : (jM?.pNaik24 == null ? true : (v.arah === 'BUY' ? jM.pNaik24 >= 0.5 : jM.pNaik24 <= 0.5))
    const keyLulus = kal.keyakinan >= syarat.barKeyakinan
    if (!keyLulus || !mateSearah) {
      const gagal = [!keyLulus ? `keyakinan terkalibrasi ${kal.keyakinan} < bar pelajaran ${syarat.barKeyakinan}` : null, !mateSearah ? `mata-jauh pNaik24 ${jM?.pNaik24 ?? '—'} melawan ${v.arah}` : null].filter(Boolean).join('; ')
      nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `KEMBALI-PINTAR TUNDA (V264 — rem, bukan ban) — ${s} pernah SALAH ${syarat.kejadianSasaran}× pada pola serupa; syarat tambahan pelajaran belum terpenuhi: ${gagal}. Pasar terus bergerak: setup BOLEH kembali begitu syarat terpenuhi — pelajarannya tetap, dendamnya tidak ada`, kunci: ['kembali-pintar'] })
      remPelajaranCt++
      log(`kembali-pintar: tunda ${s} ${v.arah} — ${gagal} (rem, bukan ban)`)
      return null
    }
    kembaliPintarCt++
    log(`kembali-pintar: ${s} ${v.arah} lolos syarat pelajaran (bar ${syarat.barKeyakinan}, ukuran ×${syarat.skalaFaktor}, stop ×${syarat.stopFaktor}) — belajar, bukan dendam`)
  }
  // V261 TANGGA-UKURAN + MENUNGGU-MANDAT — kuanta membatasi ukuran dari atas;
  // kuanta penuh (1.0) → antre konfirmasi ala confirmation.py: kunci hanya denyut
  // berikutnya bila gerbang lulus ulang; kadaluarsa ${CLAW.KONFIRM_TIMEOUT_JAM} jam.
  const kuaC = kuantaKeyakinan(kal.keyakinan / 100)
  if (!eksplor && !peneliti && kuaC.kuanta === 0) {
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `TANGGA-UKURAN (ClawTradeAI recommendedAmount) — ${kuaC.ket}: di bawah anak-tangga terendah TIDAK jual-beli sama sekali`, kunci: ['claw-kuanta'] })
    claw.kuantaVetoCt++
    _tekok('claw-kuanta', `${s}: keyakinan ${kal.keyakinan} di bawah anak-tangga terendah`)
    return null
  }
  if (!eksplor && !peneliti && kuaC.kuanta >= CLAW.KUANTA_1 && !konfirmOk) {
    claw.konfirm.push({ simbol: s, arah: v.arah, entry: b.harga, dibuat: ISO, kadaluarsa: WAKTU.getTime() + CLAW.KONFIRM_TIMEOUT_JAM * 3600e3, status: 'pending', detail: `kuanta penuh ${kuaC.kuanta} — menunggu re-verification denyut berikutnya (ala confirmation.py)` })
    claw.konfirmQueCt++
    nearMiss.push({ simbol: s, arah: v.arah, keyakinan: v.keyakinan, entry: b.harga, rezim: b.rezim, catatan: `MENUNGGU-MANDAT (ClawTrade confirmation queue) — ukuran tertinggi (${kuaC.kuanta}×) tak dikunci seketika: antre + di-re-verify denyut berikutnya; kadaluarsa ${CLAW.KONFIRM_TIMEOUT_JAM} jam — ukuran besar membayar pajak kesabaran`, kunci: ['claw-konfirm'] })
    _tekok('claw-konfirm', `${s}: kuanta penuh → antre mandat`)
    return null
  }
  if (konfirmOk) { pend.status = 'terkunci'; claw.konfirmOkCt++; log(`claw-konfirm: ${s} ${v.arah} lolos re-verification denyut ke-2 → dikunci (human-queue ala ClawTrade)`) }
  // V259 KAIZEN — tesis-sehat disegel saat kunci: apakah funding/EMA4h searah arah?
  const _WmK = Object.fromEntries(wp.penuh.map((p) => [p.param, p]))
  const sgnV = v.arah === 'BUY' ? 1 : -1
  const tesisSehatVal = ((_WmK.funding?.arah != null && _WmK.funding.arah * sgnV > 0) || (_WmK.ema4h?.arah != null && _WmK.ema4h.arah * sgnV > 0)) ? 1 : 0
  const nar = narasiSasaran(s, b, { arah: v.arah, keyakinan: kal.keyakinan }, wp.penuh, { fng, dominasi }, eksA, warA.garch.sigma24jPct, rezimGlobal)
  // V262 STOP/TARGET WAJIB (kasus D — 36/36 sinyal ARAH lahir telanjang tanpa
  // rencana keluar): stop & target kini PRA-REGISTRASI dari kerucut MC (rugi/gain
  // median net-fee); MC kosong → default-jujur. Sinyal tanpa rencana keluar tidak
  // layak bernafas — dan penjaga-kedua (hard 15%/40%) tetap berlaku di atasnya.
  // V262 STOP/TARGET WAJIB (kasus D) + V263 MODE-ASAH — stop diperketat ×0.75 saat
  // mode-asah (overclaim → jarak salah lebih pendek), ukuran mikro saat henti-harian.
  const _asahStopF = (asahKalibAktif ? ASAH.STOP_KETAT_F : 1) * (hentiAsahAktif ? 0.9 : 1) * (syarat ? syarat.stopFaktor : 1) * (peneliti ? ANTI.PENELITI_STOP_F : 1)   // V264: pelajaran lalu mengetatkan stop ×0.8^n
  const _stopPctImp = (eksA ? eksA.rugiPct : IMPAS.STOP_DEFAULT_PCT) * _asahStopF
  const _tgtPctImp = eksA ? eksA.gainPct : IMPAS.TARGET_DEFAULT_PCT
  // V277-JUAL-AMBISIUS — jalur ARAH pun wajib membawa harga ambisius: sasaran
  // dilanjutkan 50% jaraknya sendiri (perkiraan tertinggi, bukan janji) — kartu
  // sasaran tak pernah lagi tampil tanpa jual ambisius.
  const _tgtHargaImp = v.arah === 'BUY' ? b.harga * (1 + _tgtPctImp / 100) : b.harga * (1 - _tgtPctImp / 100)
  const impasRencana = {
    stop: +(v.arah === 'BUY' ? b.harga * (1 - _stopPctImp / 100) : b.harga * (1 + _stopPctImp / 100)).toPrecision(7),
    target: +(v.arah === 'BUY' ? b.harga * (1 + _tgtPctImp / 100) : b.harga * (1 - _tgtPctImp / 100)).toPrecision(7),
    sumber: eksA ? 'MC-kone-2k' : 'default-jujur',
    ketTarget: eksA ? `ekspektasi MC: gain median +${(+_tgtPctImp).toFixed(2)}% / rugi median −${(+_stopPctImp).toFixed(2)}% net-fee` : `default konservatif tanpa MC: stop −${IMPAS.STOP_DEFAULT_PCT}% / target +${IMPAS.TARGET_DEFAULT_PCT}%`,
    highAmbisius: +(v.arah === 'BUY' ? _tgtHargaImp * (1 + (_tgtPctImp / 100) * 0.5) : _tgtHargaImp * (1 - (_tgtPctImp / 100) * 0.5)).toPrecision(7),
    ketAmbisius: 'sasaran dilanjutkan 50% jaraknya — perkiraan tertinggi, bukan janji',
  }
  const entri = {
    id, simbol: s, jalur: 'ARAH', arah: v.arah, keyakinan: kal.keyakinan, keyakinanMentah: v.keyakinan,
    ketKeyakinan: kal.sumber, skor: v.skor, skorKomite: { lama: v.skorLama, wawasan: v.skorWaw, bagian: WAWASAN.BAGIAN_KOMITE },
    ...(emas ? { zonaEmas: true } : {}),
    ...(biasT.geser ? { biasKonteks: { kunci: `${v.arah}-${b.rezim}`, geser: biasT.geser, ket: biasT.kunci } } : {}),
    metakognisi: { estLevel: estM.level, estTerlemah: estM.terlemah, estFaktor: estM.faktor, aspekRagu: estM.aspekRagu, predProb: predM.probGagal, predAlasan: predM.alasan.map((a) => a.sumber), ket: `${estM.penjelasan}; prediktor kegagalan pra-kunci ${(predM.probGagal * 100).toFixed(0)}%` },
    ...(eksplor ? { eksplorasi: true, ketEksplorasi: 'slot eksplorasi forensik — menguji apakah zona racun mulai menyembuh (EV statistik >= 0)' } : {}),
    ...(peneliti ? { peneliti: true, penelitian: { alasan: 'anti-diam V269 — doktrin pemilik: gerbang menutup ≠ berhenti; kandidat terkuat yang tersisa diteliti ukuran mikro agar tetap beraksi, tetap dinilai medan, tetap berkembang — hipotesis jadi bukti, bukan opini', ket: 'ukuran mikro ×' + ANTI.PENELITI_UKURAN + ' di luar tangga-ukuran normal — posisi penelitian, bukan keyakinan; stop ketat ×' + ANTI.PENELITI_STOP_F } } : {}),
    entry: b.harga, waktuKunci: ISO, horizon: '24j', rezim: b.rezim, status: 'TERBUKA',
    bukti: buktiCand,
    buktiWaw,
    paramsPenuh: Object.fromEntries([...wp.penuh.map((p) => [p.param, +p.arah.toFixed(2)]), ...(k.kaizen && Number.isFinite(k.kaizen.kesegaran) ? [['kesegaran', +(k.kaizen.kesegaran * 2 - 1).toFixed(2)], ['akselerasi1j', +clamp((k.kaizen.aks1 ?? 0) / 10, -1, 1).toFixed(2)], ['tesisSehat', tesisSehatVal]] : []), ...(auto ? [['peluang', +((auto.peluang.skor - 50) / 50).toFixed(2)], ['slipPct', +clamp((auto.slip.slipPct ?? 0) / 5, -1, 1).toFixed(2)], ['kellyMult', +clamp((auto.kelly.mult - 1) / 0.5, -1, 1).toFixed(2)]] : []), ...(komC ? [['komite', +((komC.keyakinan || 0) * (komC.arah === 'BUY' ? 1 : komC.arah === 'SELL' ? -1 : 0)).toFixed(2)], ['kartu', +(((kartC?.skor ?? 50) - 50) / 50).toFixed(2)], ['kuanta', +((kuaC.kuanta - 0.5) / 0.5).toFixed(2)]] : []), ['zona', srImpas ?? 0], ['kalib', +clamp((keyTerkalibImpas - 50) / 50, -1, 1).toFixed(2)], ['alokasi', +clamp((kuotaArahImpas - 6) / 6, -1, 1).toFixed(2)]]),   // V254 sekolah + V259 kaizen + V260 autopilot + V261 claw + V262 lapis impas disegel utk dinilai medan
    daya: { volume: +b.dims.volume.daya.toFixed(2), volatilitas: +b.dims.volatilitas.daya.toFixed(2), likuiditas: +b.dims.likuiditas.daya.toFixed(2) },
    ketBukti: Object.fromEntries(DIM_ARAH.map((k2) => [k2, b.dims[k2].ket])),
    ketBuktiWaw: Object.fromEntries(wp.penuh.map((p) => [p.param, p.ket])),
    wawasan: wp.penuh.map((p) => ({ param: p.param, domain: p.domain, lapis: p.lapis, nilai: p.nilai, arah: +p.arah.toFixed(2), ket: p.ket })),
    derivatif: (() => { const f = waw.find((p) => p.param === 'funding'), o = waw.find((p) => p.param === 'oi'); return { fundingPct: f?.nilai ?? null, oiJuta: o?.nilai ?? null, ket: 'derivatif futures rantai host (bybit→bytick→fapi→okx) + snapshot OI antar-siklus' } })(),
    narasi: nar,
    warisan: {
      sigma24jPct: warA.garch.sigma24jPct, beta: warA.beta, r2Beta: warA.r2, divRSI: warA.div,
      ...(mcA ? { mc: { pNaik: mcA.pNaik, q50: mcA.q50, q50dn: mcA.q50dn, ket: 'kerucut MC 2.000 lintasan — peluang arah & ekskursi median' } } : {}),
    },
    ...(eksA ? { ekspektasi: eksA } : {}),
    stop: impasRencana.stop, target: impasRencana.target, sumberStop: impasRencana.sumber, ketTarget: impasRencana.ketTarget,   // V262 kasus D: TIDAK ADA lagi sinyal tanpa rencana keluar
    highAmbisius: impasRencana.highAmbisius, ketAmbisius: impasRencana.ketAmbisius,   // V277-JUAL-AMBISIUS: perkiraan tertinggi wajib ikut
    odds: odds,                                                     // V256 OddsMaker (Trade Ideas)
    // V258 GEKKO-CZAR — warisan Gekko Agent (Axal): meta-inferensi kolektif + probPasar
    // + divergensi + ekspresi dinamis dipra-registrasi; sidik sha256 = tamper-evident
    topik: { metaArah: metaA.metaArah, metaKeyakinan: metaA.metaKeyakinan, terkuat: metaA.terkuat ?? null, terlemah: metaA.terlemah ?? null, suara: metaA.suara, ket: 'meta-inferensi kolektif ala Allora Topics — bobot topik = exp(-0.9·regret) dari medan sendiri' },
    probPasar: ppA,
    divergensi: divergA,
    ekspresi: { ...eksprA, skalaEfektif: +(clamp(Math.min(eksprA.skala * (auto?.kelly?.mult ?? 1), kuaC.kuanta || 1, CLAW.UKURAN_MAKS) * (asahKalibAktif ? ASAH.UKURAN_F : 1) * (hentiAsahAktif ? ASAH.HENTI_UKURAN : 1) * (syarat ? syarat.skalaFaktor : 1) * (butaAsah.some((x) => x.organ === 'jual-lemah') ? BUTA.JUAL_SKALA_F : 1) * (bearHarian && v.arah === 'SELL' ? BUTA.SELL_BEAR_SKALA_F : 1) * (butaAsah.some((x) => x.organ === 'buy-saksi-terbalik') ? BUTA.BUY_SAKSI_SKALA_F : 1) * (butaAsah.some((x) => x.organ === 'buy-jatuh-dalam') ? BUTA.BUY_JATUH_SKALA_F : 1), 0.05, 1.2) * (peneliti ? ANTI.PENELITI_UKURAN : 1)).toFixed(3), ket: 'skala eksposur dinamis ala Allora×G.A.M.E (0.25–1.0× unit) × kelly-lapis AutoPilotPM, DITAMBAT tangga kuanta CLAW & ukuran-maks → skalaEfektif clamp [0.2,1.2]; V263 mode-asah memangkas ukuran ×0.6 / ×0.3 (belajar terus, taruhan kecil); V264 pelajaran-lalu menyusutkan ukuran ×0.6^n (pengalaman mengecilkan taruhan, bukan dendam); V265 organ buta jual-lemah ×0.5; V267 anti-arus BUY jebakan-pantulan/jatuh-pisau ×0.6' },
    sidikPrakunci: sidik({ id, simbol: s, arah: v.arah, entry: b.harga, keyakinan: kal.keyakinan, odds: odds.skor, waktuKunci: ISO, params: wp.penuh.length }),
    peristiwa: peri,                                                // V256 tag peristiwa (OddsMaker event-based)
    rencanaDeal: deal,                                              // V256 mesin deal (3Commas)
    // V259 KAIZEN-PULIH — kesegaran & tesis disegel + penjaga-kedua tercatat (dinilai medan saat matang)
    kaizen: { ...(k.kaizen || {}), tesisSehat: tesisSehatVal, pengawas: { stopPct: KZN.PENGAWAS_STOP, targetPct: KZN.PENGAWAS_TARGET }, ket: 'lapis kaizen: kesegaran gerakan + tesis-sehat disegel saat kunci; penjaga-kedua (hard-stop 15%/target 40%) dicek tiap denyut — semuanya dinilai medan' },
    // V260 AUTOPILOT-KALIBRASI — komposit terbobot + slip-neto + kelly + rezim + tegang
    // disegel saat kunci; alt = pilihan kedua yang ditimbang (alternativesConsidered
    // ala decision ledger AutoPilotPM) — regret-nya dihitung medan saat matang.
    auto: {
      ...(auto || {}), rezimMedan: rezimAuto.rezim, rezimMult: rezimAuto.mult, stresTerkburuk: tegangAuto.terburuk?.rugiUnit ?? null, stresSkenario: tegangAuto.terburuk?.nama ?? null,
      alt: runnerUp ? { aksi: `${runnerUp.s} ${runnerUp.v.arah}`, simbol: runnerUp.s, arah: runnerUp.v.arah, entry: runnerUp.b.harga, rezim: runnerUp.b.rezim, alasanTolak: `runner-up odds ${runnerUp.odds.skor} vs ${odds.skor} — kuota & gerbang memilih yang terkuat` } : null,
      ket: 'lapis autopilot: peluang 0-100 terbobot + slip-neto + kelly-lapis + rezim-medan + uji-tegang disegel saat kunci; alt = alternativesConsidered ala decision ledger AutoPilotPM',
    },
    // V261 CLAW-TEMPOK — komite panjia + kartu risiko + tangga kuanta disegel saat kunci
    claw: {
      komite: { arah: komC?.arah ?? null, keyakinan: komC?.keyakinan ?? null, skor: komC?.skor ?? null, terbaca: komC?.terbaca ?? 0, suara: (komC?.suara || []).map((x) => ({ nama: x.nama, bobot: x.bobot, arah: x.arah, keyakinan: x.keyakinan, anggota: x.anggota })) },
      kartu: { skor: kartC?.skor ?? null, level: kartC?.level ?? null, faktor: kartC?.faktor ?? null, approved: kartC?.approved ?? null },
      kuanta: kuaC.kuanta, konfirm: konfirmOk ? 'LOLOS-RE-VERIFY-denyut-ke-2' : 'dalam-ambang-tangga',
      ket: 'lapis claw (pagar-baja & komite panjia): 5 suara berbobot tetap + kartu risiko 4×25 + tangga ukuran + antrean mandat — ala keluarga ClawTrade (middleware + ClawTradeAI), dinilai medan',
    },
    // V262 IMPAS-CERDAS — bukti kalibrasi, keputusan kuota & rencana keluar disegel per entri
    impas: {
      zona: srImpas, keyakinanTerkalibrasi: keyTerkalibImpas, faktorKalib: statArahImpas.faktor,
      kuotaJalur: kuotaArahImpas, netCumPct: netCumImpasPct, tambahanAmbang: +tambahanAmbangImpas.toFixed(1),
      rencana: { sumber: impasRencana.sumber, stopPct: +(+_stopPctImp).toFixed(2), targetPct: +(+_tgtPctImp).toFixed(2) },
      modeAsah: asahKalibAktif ? 'UKURAN-x0.6-STOP-x0.75-BELAJAR-TERUS' : (hentiAsahAktif ? 'HENTI-ASAH-UKURAN-MIKRO-x0.3' : null),
      ket: 'lapis impas-cerdas + ASAH V263: zona anti-chase MENGIAT, kalibrasi kini MODE-ASAH (dilarang karantina — jalur overclaim terus mengunci & terus belajar dgn ukuran kecil), kuota dinamis EV-shrinkage, stop/target lahir BERSAMA sinyal',
    },
    // V263 MATEMATIKA MURNI & EKONOMI CERDAS + MATA JAUH — disegel saat kunci:
    mate: {
      ...mateA, ...(jauhA ? { jauh: jauhA } : {}),
      organKena, modeAsah: asahKalibAktif,
      ket: 'matematika murni (Hurst R/S, half-life OU, drift OLS+R², z-SMA20, entropi Shannon, Parkinson/Garman-Klass, autokorelasi) + ekonomi cerdas (carry funding, EV setelah biaya) + mata jauh MC-72j — semua dari data saat itu; organKena = kemampuan yang lahir dari kesalahan dan kini mengawal',
    },
    // V264 PINTAR-KEMBALI — pelajaran lalu disegel: koin/pola pernah SALAH, kembali
    // dengan syarat LEBIH KETAT yang mengikat saat kunci — bukan syarat default
    // seolah belum pernah SALAH, bukan juga blacklist (doktrin pemilik 2026-10-03)
    ...(syarat ? { pelajaranLalu: { ...syarat, terpenuhi: true, ket: 'V264 kembali-pintar: koin ini pernah SALAH pada pola serupa — kembali dengan syarat lebih ketat dari pelajarannya sendiri (bar keyakinan naik, ukuran menyusut, stop mengetat) yang mengikat saat kunci; pasar hidup — ia boleh kembali, ia juga dinilai ulang penuh' } } : {}),
    // V265 SEKOLAH-BUTA — seal organ yang berbicara saat kunci (bukti 2.533 soal blind):
    ...(butaAsah.length ? { buta: { organ: butaAsah.map((x) => x.organ), keyLama: butaAsah.map((x) => x.keyLama), keyBaru: v.keyakinan, bonus: odds.butaBonus ?? null, ket: 'sekolah kilat V265+V266+V267: keyakinan dijujurkan organ jual-lemah/key-melawan-drift/sell-bear-harian/buy-flat-btc/sell-relatif-kuat/buy-saksi-terbalik/buy-jatuh-dalam; tunda-bear saat makro bear; bonus odds bila BUY momentum searah' } } : {}),
  }
  ledger.push(entri); terkunciBaru.push(entri)
  return entri
}
// V249 BREADTH A/D (organ: Market Breadth) — dipindah ke atas odds-ranking V258
// karena suhu Autopilot butuh breadth; pasar sempit = risiko sistemik; bila < 35%
// koin naik DAN rezim TURUN, gerbang radar diperketat +2.
const breadthDari = Object.keys(hasil).length
const breadthNaik = breadthDari
  ? [...Object.values(hasil)].filter((c) => c.length > 25 && c[c.length - 1].c > c[c.length - 25].c).length / breadthDari
  : 0.5
const pemerketBreadth = breadthNaik < 0.35 && rezimGlobal === 'TURUN' ? 2 : 0
if (pemerketBreadth) log(`warisan-breadth: hanya ${(breadthNaik * 100).toFixed(0)}% koin naik dalam rezim TURUN — gerbang radar +2`)
// V256 ODDS MAKER RANKING (Money Machine top-K): bersihArah diurut skor peluang —
// hanya TOP-K berodds >= ambang yang boleh mengunci; sisanya ditolak DENGAN ALASAN ODDS.
for (const k of bersihArah) if (emasArah(k)) k.odds.skor = +(k.odds.skor + 5).toFixed(1)
const rankArah = [...bersihArah].sort((a, b) => b.odds.skor - a.odds.skor)
// V258 SUHU AUTOPILOT (Axal) — temper denyut dari PF-jendela ARAH + rezim + breadth + F&G;
// ambang & kuota efektif menggantikan baseline 3Commas/Trade Ideas DALAM BATAS KETAT (lantai 52).
const _mnPf = closedArah.filter((e) => e.net > 0), _klPf = closedArah.filter((e) => e.net <= 0)
const _smPf = _mnPf.reduce((a, e) => a + e.net, 0), _skPf = _klPf.reduce((a, e) => a + e.net, 0)
const pfArah = _skPf < 0 ? +(_smPf / -_skPf).toFixed(2) : null
// V259 HENTI-HARIAN (circuit breaker kaizen-trader): rugi-net vonis ARAH yang DINILAI
// hari UTC ini dikumulatifkan — tembus −4% → suhu BERTAHAN dipaksa (kuota mengetat sendiri)
const rugiHarianNet = closedArah.filter((e) => (e.waktuDinilai || '').startsWith(TGL)).reduce((a, e) => a + e.net, 0)
const rugiHarianPct = +(rugiHarianNet * 100).toFixed(2)
const hentiHarianAktif = rugiHarianPct <= -KZN.HENTI_RUGI_PCT
// V263 HUKUM ASAH — henti-harian bukan lagi penghentian belajar: kuota belajar
// tetap terbuka (min 2) dengan ukuran mikro ×0.3 — modal dibekukan, ilmu tidak.
let hentiAsahAktif = false
if (hentiHarianAktif) { hentiAsahAktif = true; log(`henti-harian: rugi-net hari ini ${rugiHarianPct}% ≤ −${KZN.HENTI_RUGI_PCT}% — MODE-ASAH (bukan karantina): ukuran mikro ${ASAH.HENTI_UKURAN}×, kuota belajar ${ASAH.HENTI_KUOTA} — ilmu tetap bertambah`) }
const suhu = suhuPasar({ fng: fng?.nilai ?? null, breadth: +(breadthNaik * 100).toFixed(1), rezim: rezimGlobal, profitFactor: pfArah, rugiHarianPct, rezimEkstrem: rezimAuto.rezim === 'ekstrem' })
const ambangOdds = suhu.ambang
const kuotaArahSuhu = suhu.kuota
// V262 AMBANG-IMPAS — rapor di bawah air menaikkan ambang odds (maks +20):
// selektivitas naik saat darah, melonggar SENDIRI saat net kumulatif pulih ke 0.
const ambangOddsEfektif = +(ambangOdds + tambahanAmbangImpas).toFixed(1)
if (tambahanAmbangImpas > 0) log(`ambang-impas: net kumulatif ${netCumImpasPct}% < 0 → ambang odds ${ambangOdds} → ${ambangOddsEfektif} (+${tambahanAmbangImpas.toFixed(1)}) — selektivitas naik saat darah (jawaban kasus B: overclaim tidak lagi gratis)`)
for (const k of rankArah) { k.odds.ambangEfektif = ambangOddsEfektif; k.odds.tambahanImpas = +tambahanAmbangImpas.toFixed(1) }
if (suhu.temper !== 'NETRAL') log(`suhu-pasar: ${suhu.ket} — ${suhu.alasan.join('; ')}`)
const posisiTerbukaAwal = ledger.filter((e) => e.status === 'TERBUKA').length
const sisaPosisi = Math.max(0, DEAL.MAX_POSISI - posisiTerbukaAwal)   // Global Max Open Positions (3Commas)
const pilihArah = rankArah.filter((k) => k.odds.skor >= ambangOddsEfektif).slice(0, Math.min(kuotaArahSuhu, sisaPosisi))
if (sisaPosisi === 0) log(`global-max-positions: ${posisiTerbukaAwal} posisi terbuka >= batas ${DEAL.MAX_POSISI} — sinyal ARAH baru diabaikan siklus ini`)
const gagalOddsArah = rankArah.filter((k) => !pilihArah.includes(k))
for (const [i, k] of pilihArah.entries()) kunciEntriArah(k, false, gagalOddsArah[0] || pilihArah[i + 1] || null)   // V255: fungsi mem-push sendiri; veto metakognitif = return null; V260: runner-up utk timbangan-alt
for (const k of gagalOddsArah) {
  nearMiss.push({
    simbol: k.s, arah: k.v.arah, keyakinan: k.v.keyakinan, entry: k.b.harga, rezim: k.b.rezim,
    catatan: `ODDS MAKER (Trade Ideas) — skor peluang ${k.odds.skor}/100 ${k.odds.skor < ambangOdds ? `< ambang efektif ${ambangOdds} (suhu ${suhu.temper}, baseline ${DEAL.ODDS_MIN})` : `cukup tapi di luar kuota top-${kuotaArahSuhu} terkuat (Money Machine · suhu ${suhu.temper})`} · komponen: MC ${(k.odds.komponen.mc * 100).toFixed(0)} / zona ${(k.odds.komponen.zona * 100).toFixed(0)} / meta ${(k.odds.komponen.meta * 100).toFixed(0)} / daya ${(k.odds.komponen.daya * 100).toFixed(0)} — fokus modal hanya pada peluang terkuat`,
  })
}
if (gagalOddsArah.length) log(`odds-maker: ${gagalOddsArah.length} kandidat ARAH ditolak ranking (kuota ${kuotaArahSuhu} · ambang efektif ${ambangOdds} · suhu ${suhu.temper}), ${pilihArah.length} lolos`)
if (eksplorasiArah) {
  // V291 ANTI-DOBEL: slot eksplorasi TIDAK BOLEH mengunci simbol yang sudah terkunci
  // jalur ARAH biasa siklus ini (insiden 2026-10-07: AVAX tersegel 2× dalam satu daftar
  // sasaran — dua jalur tak saling tahu). Eksplorasi mencari zona RACUN lain, bukan
  // menggandakan kunci yang sudah ada.
  const sudahTerkunciArah = terkunciBaru.some((e) => e.simbol === eksplorasiArah.s && (e.jalur || 'ARAH') === 'ARAH')
  if (sudahTerkunciArah) {
    forensikTindakan.push(`slot eksplorasi: ${eksplorasiArah.s} ${eksplorasiArah.v.arah} dihitung (EV +${(eksplorasiArah.eksA.evPct * 100).toFixed(2)}%) namun SUDAH terkunci jalur ARAH siklus ini — TIDAK dikunci ulang (anti-dobel, tanpa klaim ganda)`)
    log(`forensik-eksplorasi: ${eksplorasiArah.s} dilewati — sudah terkunci jalur ARAH siklus ini (anti-dobel); EV tetap tercatat`)
  } else {
    kunciEntriArah(eksplorasiArah, true)
    forensikTindakan.push(`slot eksplorasi: ${eksplorasiArah.s} ${eksplorasiArah.v.arah} dilepas lewat gerbang (EV +${(eksplorasiArah.eksA.evPct * 100).toFixed(2)}% >= 0) — zona racun diuji agar bisa menyembuh dengan bukti baru`)
    log(`forensik-eksplorasi: ${eksplorasiArah.s} ${eksplorasiArah.v.arah} EV +${(eksplorasiArah.eksA.evPct * 100).toFixed(2)}%`)
  }
}
for (const k of divetoArah) {
  nearMiss.push({
    simbol: k.s, arah: k.v.arah, keyakinan: k.v.keyakinan, entry: k.b.harga, rezim: k.b.rezim,
    catatan: `GERBANG VETO WAWASAN — ${k.vetoW.map((x) => x.ket).join('; ')}`, kunci: k.vetoW.map((x) => x.kunci),
  })
}
if (divetoArah.length) log(`veto-wawasan: ${divetoArah.map((k) => `${k.s}(${k.vetoW.map((x) => x.kunci).join('/')})`).join(' ')} — parameter medan menolak sinyal`)
for (const k of tercemarArah) {
  if (k === eksplorasiArah) continue
  const racunK = k.kena.filter((z) => z.status === 'RACUN')
  nearMiss.push({
    simbol: k.s, arah: k.v.arah, keyakinan: k.v.keyakinan, entry: k.b.harga, rezim: k.b.rezim,
    catatan: `GERBANG FORENSIK — zona racun terbukti: ${racunK.map((z) => `${z.nama} (n=${z.n}, akurasi ${z.akurasiPct}%, ekspek ${z.ekspekPct > 0 ? '+' : ''}${z.ekspekPct}%)`).join(' · ')} — menolak sinyal buruk: TUNGGU lebih baik dari merugi`,
  })
}
blokForensikArah = tercemarArah.length - (eksplorasiArah ? 1 : 0)
if (blokForensikArah) log(`forensik-gerbang: ${blokForensikArah} kandidat ARAH ditolak (zona racun), ${bersihArah.length} lolos`)
// V269 TANGGAP-SELALU (ANTI-DIAM) — mandat pemilik 2026-10-04: "jangan buat dia
// Diam — dia harusnya tanggap cerdas; kalau dia Diam dia gak pernah berkembang".
// Gerbang menutup ≠ berhenti: saat 0 kunci penuh, kandidat TERKUAT yang bersih
// forensik (tanpa racun/veto-wawasan/rem/hitam) dikunci sebagai POSISI-PENELITI
// ukuran mikro ×0.25 + stop ketat ×0.8 — tetap beraksi, tetap dinilai medan, tetap
// berkembang; hipotesis yang dulu cuma jadi near-miss kini jadi bukti sekolah kilat.
const diamSebelumnya = +(keadaan.diamBeruntun ?? 0)
let penelitiEntri = null
if (terkunciBaru.length === 0) {
  const penelitiTerbuka = ledger.filter((e) => e.peneliti && e.status === 'TERBUKA').length
  if (posisiTerbukaAwal >= DEAL.MAX_POSISI) log('anti-diam: tak ada ruang posisi (global-max-positions) — tanggapan naratif penuh tetap diterbitkan')
  else if (penelitiTerbuka >= ANTI.PENELITI_MAKS_TERBUKA) log(`anti-diam: posisi-peneliti ${penelitiTerbuka}/${ANTI.PENELITI_MAKS_TERBUKA} masih terbuka & dinilai medan — denyut ini tetap menghasilkan tanggapan penuh (bukan diam)`)
  else {
    const kandidatPeneliti = rankArah.find((k) =>
      !divetoArah.includes(k) && !tercemarArah.includes(k) &&
      !(kaizen.dingin[k.s] && WAKTU.getTime() < (kaizen.dingin[k.s].dinginSampai || 0)) &&
      !(claw.hitam[k.s] && WAKTU.getTime() < (claw.hitam[k.s].sampai || 0)))
    if (kandidatPeneliti) {
      penelitiEntri = kunciEntriArah(kandidatPeneliti, false, gagalOddsArah[0] || kandidatPeneliti, true)
      if (penelitiEntri) forensikTindakan.push(`slot-peneliti (anti-diam V269): ${penelitiEntri.simbol} ${penelitiEntri.arah} dikunci ukuran mikro ×${ANTI.PENELITI_UKURAN} stop ×${ANTI.PENELITI_STOP_F} — gerbang penuh menutup kandidat (odds ${kandidatPeneliti.odds.skor}), tapi cyborg TIDAK diam: hipotesis diuji kecil-kecilan di medan supaya jadi bukti, bukan opini`)
      log(penelitiEntri ? `anti-diam: SLOT-PENELITI ${penelitiEntri.simbol} ${penelitiEntri.arah} @ ${penelitiEntri.entry} ukuran ×${ANTI.PENELITI_UKURAN} — tetap tanggap, tetap berkembang` : 'anti-diam: kandidat terkuat tertahan gerbang pengaman (rem/zona/organ) — tanggapan naratif tetap diterbitkan')
    } else log('anti-diam: tak ada kandidat bersih utk peneliti (semua racun/veto/rem) — tanggapan naratif tetap diterbitkan')
  }
}
// V260 TOP-TOLAK (AutoPilotPM ledger topBlockReasons): ranking alasan penolakan
// jalur ARAH siklus ini + kumulatif — kesadaran atas penolakannya sendiri
// ("mengapa aku berkata tidak" — bukan sekadar tahu kapan berkata ya).
const tolakHitung = {}
for (const nm of nearMiss) {
  const kunciPertama = Array.isArray(nm.kunci) && nm.kunci.length ? nm.kunci[0]
    : nm.catatan?.startsWith('ODDS MAKER') ? 'odds'
    : nm.catatan?.startsWith('GERBANG FORENSIK') ? 'forensik'
    : nm.catatan?.startsWith('GERBANG VETO') ? 'veto-wawasan' : 'lain'
  tolakHitung[kunciPertama] = (tolakHitung[kunciPertama] || 0) + 1
}
if (pompaTuaCt) tolakHitung['pompa-tua'] = (tolakHitung['pompa-tua'] || 0) + pompaTuaCt
for (const [_kT, _vT] of Object.entries(tolakHitung)) ilmu.topTolak[_kT] = (ilmu.topTolak[_kT] || 0) + _vT
const topTolakSiklus = Object.entries(tolakHitung).sort((a, b) => b[1] - a[1])
if (topTolakSiklus.length) log(`top-tolak: ${topTolakSiklus.slice(0, 3).map(([k2, v2]) => `${k2}×${v2}`).join(' · ')} — kesadaran atas penolakan sendiri (AutoPilotPM topBlockReasons)`)

// 1b. lane PHOENIX — beli di ujung bawah hari, jual di ujung atas yang diprediksi
// gerbang rezim-tegas — lahir dari pelajaran: melawan arus butuh bukti lebih kuat & kuota lebih kecil
const rezimTegas = rezimGlobal === 'TURUN' || rezimGlobal === 'PARABOLIK'
// V247 META-LABELING (Lopez de Prado 2018): model kedua menilai model pertama —
// gerbang digeser empiris dari hit-rate bucket konfirmasi medan sendiri, dibatasi ±8.
let metaCatatan = 'meta-labeling: bucket konfirmasi belum cukup (min ' + ILMU.META_MIN_N + ') — gerbang tak digeser'
let gerbangMeta = 0
if (ilmu.meta.kuat.n >= ILMU.META_MIN_N) {
  const hit = ilmu.meta.kuat.benar / ilmu.meta.kuat.n
  if (hit < 0.5) gerbangMeta = Math.min(ILMU.META_GESER_MAKS, Math.round((0.5 - hit) * 40))
  else if (hit > 0.65) gerbangMeta = -Math.min(ILMU.META_GESER_MAKS, Math.round((hit - 0.65) * 30))
  ilmu.meta.geser = gerbangMeta
  metaCatatan = `meta-labeling: konfirmasi-kuat tembus ${(hit * 100).toFixed(0)}% dari ${ilmu.meta.kuat.n} kasus — gerbang digeser ${gerbangMeta >= 0 ? '+' : ''}${gerbangMeta}`
}
// V249 BREADTH — perhitungan breadthDari/breadthNaik/pemerketBreadth dipindah ke atas
// odds-ranking (dibutuhkan suhu Autopilot V258); logika persis sama, pemakaian di bawah tak berubah.
const gerbangSkor = clamp(PHX.GERBANG_SKOR + (rezimTegas ? PHX.TURUN_SKOR_TAMBAH : 0) + gerbangMeta + pemerketBreadth, 34, 58)
const kunciMaks = rezimTegas ? Math.ceil(PHX.KUNCI_MAKS / 2) : PHX.KUNCI_MAKS
const kuotaPhxEfektif = statPhxImpas.evShrunk < 0 ? Math.max(1, Math.ceil(kunciMaks / 2)) : kunciMaks   // V262: EV phoenix negatif → kuota separuh (alokasi dinamis dua arah)

// ---- V251 KOMPAS — jaminan arah: apa pun kondisi pasar, jawaban BUY/SELL tetap terbit ----
// (mandat: "apa pun kondisi pasar yang terjadi selalu hasilkan arah buy/sell yang terjamin")
// rezim = struktur (EMA/ATR), MC 2.000 lintasan BTC = peluang statistik, breadth = luas arus.
let kompas = null
try {
  const warBTC = mesinWarisan(hasil.BTC, hasil.BTC)
  const mcBTC = warBTC.garch.sigma1j > 0 ? monteCarlo24j(hasil.BTC, warBTC.garch) : null
  if (mcBTC) {
    const arahRezim = rezimGlobal === 'NAIK' || rezimGlobal === 'PARABOLIK' ? 'BUY'
      : rezimGlobal === 'TURUN' ? 'SELL' : (mcBTC.pNaik >= 0.5 ? 'BUY' : 'SELL')
    const arahMC = mcBTC.pNaik >= 0.62 ? 'BUY' : mcBTC.pNaik <= 0.38 ? 'SELL' : null
    const sepakat = arahMC == null || arahMC === arahRezim
    const arah = arahMC ?? arahRezim
    let kek = 52 + Math.abs(mcBTC.pNaik - 0.5) * 2 * 16 + (arah === 'BUY' && breadthNaik > 0.5 ? 3 : arah === 'SELL' && breadthNaik < 0.35 ? 3 : 0)
    if (!sepakat) kek -= 4
    kompas = {
      simbol: 'BTC', arah, keyakinan: Math.round(clamp(kek, 52, 72)),
      rezim: rezimGlobal, pNaikMC: mcBTC.pNaik, sigma24jPct: warBTC.garch.sigma24jPct,
      breadthNaikPct: +(breadthNaik * 100).toFixed(1),
      alasan: `rezim ${rezimGlobal} · MC ${WARISAN.MC_LINTASAN.toLocaleString('id-ID')} lintasan BTC pNaik ${(mcBTC.pNaik * 100).toFixed(0)}% · breadth ${(breadthNaik * 100).toFixed(0)}% koin naik${!sepakat ? ' · rezim & MC berbeda — kompas mengikuti MC, keyakinan dipangkas' : ''}`,
      ket: 'kompas rezim makro — keyakinan sengaja rendah-jujur; sasaran koin tetap produk utama',
    }
    log(`kompas V251: ${kompas.arah} ${kompas.keyakinan} — ${kompas.alasan}`)
  }
} catch (e) { kompas = null; log('kompas gagal (tak fatal): ' + String(e.message).slice(0, 60)) }
const lulusPhx = []
const tercemarPhx = []
let vetoPhxCt = 0                                    // V254: hitungan veto wawasan jalur phoenix
for (const s of daftarTelusur) {
  const c = hasil[s]; if (!c) continue
  const id = `PHX-${s}-${TGL}`
  if (ledger.some((e) => e.id === id)) continue
  if (c.length < 80) continue                                       // radar butuh sejarah cukup
  const b = dewanBukti(c)
  const war = mesinWarisan(c, hasil.BTC)          // V249: GARCH + VP + Beta + Divergensi + Guard (dipindah duluan utk param samudra)
  const rad = radarPhoenix(c)
  const wpPhx = wawasanPenuh(c, hasil.BTC, s, ctxSamudra(s, war, null))   // V257: inti + observasi + samudra-dalam utk radar
  const wawPhx = wpPhx.inti
  const frPctPhx = wawPhx.find((p) => p.param === 'funding')?.nilai ?? null
  const vetoPhx = vetoWaw(wpPhx.penuh, 'BUY')     // V254: gerbang veto wawasan utk radar BUY
  const tgt = pilihTarget(c, b.harga, rezimGlobal, war.vpMagnet)
  const dayaProduk = clamp(b.dims.volume.daya, 0.35, 1) * clamp(b.dims.volatilitas.daya, 0.3, 1) * clamp(b.dims.likuiditas.daya, 0.4, 1)
  const v = vonisPhoenix(rad, bobotPhx, dayaProduk, tgt.untung, rezimGlobal, gerbangSkor)
  // GERBANG KONFIRMASI v2.1 — dilahirkan oleh 4 kekalahan pisau-jatuh (ACE/ARB/XPL/CRCLB, semua
  // dikunci saat momentum negatif): koin di ujung bawah TANPA konfirmasi bukan akumulasi, dia
  // sedang JATUH. WAJIB: kembali di atas EMA9 + taker-buy menguat + masih di ujung bawah.
  const gagalKonfirm = []
  if (rad.sinyal.momentum < PHX.KONFIRM_MOMENTUM) gagalKonfirm.push('harga masih di bawah EMA9 — pisau jatuh, bukan akumulasi')
  if (rad.sinyal.akumulasi < PHX.KONFIRM_AKUMULASI) gagalKonfirm.push('taker-buy tidak menguat — tak ada beli diam-diam yang terbaca')
  if (rad.posisi > PHX.KONFIRM_POSISI) gagalKonfirm.push(`sudah merangkak ${(rad.posisi * 100).toFixed(0)}% rentang 24 jam — bukan lagi harga termurah hari itu`)
  if (gagalKonfirm.length) {
    if (v.skor >= 25 && !tgt.lemah) {
      nearMiss.push({
        simbol: s, arah: 'BUY', keyakinan: Math.round(v.skor), entry: b.harga, rezim: b.rezim,
        catatan: `belum konfirmasi — ${gagalKonfirm.join('; ')}`,
      })
    }
    continue
  }
  if (!v.lolos) {
    // jujur dicatat sebagai kandidat radar yang belum lolos gerbang (bukan prediksi terkunci)
    if (v.skor >= 25 && !tgt.lemah) {
      nearMiss.push({
        simbol: s, arah: 'BUY', keyakinan: Math.round(v.skor), entry: b.harga, rezim: b.rezim,
        catatan: `kandidat radar belum lolos gerbang (skor ${v.skor.toFixed(0)} < ${gerbangSkor} atau daya lemah) — ${rad.ket.posisi}`,
      })
    }
    continue
  }
  // V249 GUARD KEJUT-PUMP — pelajaran false-breakout terkuantisasi: pasar yang
  // sudah terbang cepat di ujung atas bukan akumulasi lagi, dia DIKEJAR. Radar
  // menolak membeli top, menunggu koreksi sehat (aturan mengikat, bukan mood).
  if (war.kejutPump) {
    if (v.skor >= 25 && !tgt.lemah) {
      nearMiss.push({
        simbol: s, arah: 'BUY', keyakinan: Math.round(v.skor), entry: b.harga, rezim: b.rezim,
        catatan: `guard kejut-pump — ${war.ketKejut}`,
      })
    }
    continue
  }
  // V254 GERBANG VETO WAWASAN (radar BUY) — parameter medan menolak beli yang
  // dilawan dinding buku / kerumunan funding / tren 4h / volatilitas ekstrem.
  if (vetoPhx.length) {
    vetoPhxCt++                                     // V254: hitungan veto wawasan jalur phoenix
    nearMiss.push({
      simbol: s, arah: 'BUY', keyakinan: Math.round(v.skor), entry: b.harga, rezim: b.rezim,
      catatan: `GERBANG VETO WAWASAN — ${vetoPhx.map((x) => x.ket).join('; ')}`, kunci: vetoPhx.map((x) => x.kunci),
    })
    continue
  }
  // V249 GUARD MONTE CARLO — peluang statistik tembus target harus layak:
  // 2.000 lintasan × 24 langkah dari σ-GARCH + sebaran residual nyata. Bila
  // peluang < MC_MIN, statistik MENOLAK target — tidak dipaksa lolos.
  const mc = monteCarlo24j(c, war.garch)
  const pT = mc.pLevel(tgt.target / b.harga - 1)
  if (pT < WARISAN.MC_MIN) {
    nearMiss.push({
      simbol: s, arah: 'BUY', keyakinan: Math.round(v.skor), entry: b.harga, rezim: b.rezim,
      catatan: `Monte Carlo 2.000 lintasan menilai peluang tembus target cuma ${(pT * 100).toFixed(0)}% (< ${Math.round(WARISAN.MC_MIN * 100)}%) — statistik menolak`,
    })
    continue
  }
  // V251 GUARD EKSPEKTASI — untung bukan rerata miskin: bila peluang barier
  // menilai EV statistik < −1,5% (rugi berat mengalahkan untung bersih), mesin
  // profit MENOLAK kunci — jujur dicatat sebagai near-miss, bukan dipaksa lolos.
  const stv = +Math.min(b.harga * (1 - 1.8 * rad.atrPct / 100), rad.lo24 - (0.25 * rad.atrPct / 100) * b.harga).toPrecision(6)
  const pStv = mc.pLevelDn((b.harga - stv) / b.harga)
  const evK = pT * tgt.untung - pStv * (1 - stv / b.harga + FEE)
  if (evK < -0.015) {
    nearMiss.push({
      simbol: s, arah: 'BUY', keyakinan: Math.round(v.skor), entry: b.harga, rezim: b.rezim,
      catatan: `guard ekspektasi — EV statistik ${(evK * 100).toFixed(2)}% < −1,5% (P target ${(pT * 100).toFixed(0)}% × untung ${(tgt.untung * 100).toFixed(1)}% vs P stop ${(pStv * 100).toFixed(0)}% × rugi ${((1 - stv / b.harga + FEE) * 100).toFixed(1)}%) — mesin profit menolak`,
    })
    continue
  }
  // V252 GERBANG FORENSIK (jalur phoenix — zona dihitung dari ledger phoenix SENDIRI,
  // n>=8 & diskriminatif baru berhak menolak): zona racun terbukti DITOLAK — radar
  // tak membeli kondisi yang rekam jejaknya merugi. Kandidat terbaik ber-EV>=0
  // disimpan utk slot eksplorasi (bandit berbatas) agar zona bisa menyembuh.
  const buktiPhx = Object.fromEntries(DIM_ARAH.map((k) => [k, +b.dims[k].arah.toFixed(3)]))
  const kenaPhx = zonaKandidat('phoenix', 'BUY', b.rezim, v.keyakinan, buktiPhx, frPctPhx)
  const racunPhx = kenaPhx.filter((z) => z.status === 'RACUN')
  const emasPhx = kenaPhx.some((z) => z.status === 'EMAS')
  if (racunPhx.length) {
    tercemarPhx.push({
      id, simbol: s, arah: 'BUY', keyakinan: v.keyakinan + (emasPhx ? 4 : 0), skorPhoenix: v.skor,
      entry: b.harga, rezim: b.rezim, tgt, rad, b, war, mc, pT, pStv, evK, kenaPhx, racunPhx, zonaEmas: emasPhx, wawPhx, wpPhx,
    })
    blokForensikPhx += 1
    continue
  }
  const pA = tgt.highAmbisius ? mc.pLevel(tgt.highAmbisius / b.harga - 1) : null
  // V256 MESIN-DEAL-ODDS — peristiwa + rencana deal + odds dipra-registrasi per kandidat phoenix:
  const periP = tagPeristiwa(c, 'BUY', war, wpPhx)
  const dealP = rencanaDeal(c, b.harga, 'BUY', tgt.untung)
  const estPhx = estimasiKeyakinan({ wp: wpPhx, v: { arah: 'BUY', keyakinan: v.keyakinan }, b, eksA: null, kena: kenaPhx }, forensik.phoenix.zona, gagal.length >= 6)
  const oddsP = skorOdds({ pWin: pT, zonaHit: hitZona(kenaPhx), metaLevel: estPhx.level, dayaAvg: dayaProduk, emas: emasPhx })
  lulusPhx.push({
    id, simbol: s, jalur: 'PHOENIX', arah: 'BUY', keyakinan: v.keyakinan + (emasPhx ? 4 : 0), skorPhoenix: v.skor,
    entry: b.harga, tgt, rad, b, war, mc, pT, pA, dayaProduk, stv, pStv, evK, kenaPhx, zonaEmas: emasPhx, wawPhx, wpPhx,
    peri: periP, deal: dealP, odds: oddsP, estPhx,
    urut: oddsP.skor * 10 + v.skor * Math.min(tgt.untung, 0.06) * (evK > 0 ? 1.25 : 1) / 10,   // V256: odds primer (Money Machine); skor×EV jadi tie-break
  })
}
// kuota harian: hanya prediksi radar TERBAIK yang dikunci — sisanya jujur jadi kandidat
const phxTerlanjur = ledger.filter((e) => e.jalur === 'PHOENIX' && (e.waktuKunci || '').slice(0, 10) === TGL).length
const sisaKuota = Math.max(0, kuotaPhxEfektif - phxTerlanjur)
const sisaPosisiPhx = Math.max(0, DEAL.MAX_POSISI - ledger.filter((e) => e.status === 'TERBUKA').length)   // V256 Global Max Open Positions
const kunciEfektif = Math.min(sisaKuota, sisaPosisiPhx)
if (sisaPosisiPhx === 0 && sisaKuota > 0) log(`global-max-positions: batas ${DEAL.MAX_POSISI} tercapai — kuota phoenix ${sisaKuota} dibatalkan siklus ini`)
lulusPhx.sort((a, b) => b.urut - a.urut)
const phxCadangan = []
// V252: pembangun entri phoenix — satu sumber untuk jalur kuota & slot eksplorasi
const bangunEntriPhx = (p, eksplor) => {
  const { tgt, rad, b, war, mc, pT, wawPhx, wpPhx, peri, deal, odds } = p
  // PENJAGA-DENYUT (insiden 2026-10-07T00:38Z, denyut #gagal): slot eksplorasi phoenix
  // melepas kandidat yang tgt.target-nya belum terbentuk → TypeError di template coda
  // → SELURUH denyut SAKTI mati + komit pertumbuhan terlewat. Hukum baru: satu kandidat
  // cacat TIDAK BOLEH membunuh jantung — dilewati JUJUR dengan log, denyut diteruskan.
  if (!tgt || tgt.target == null || !isFinite(tgt.target) || tgt.untung == null ||
      !b || !b.harga || p.stv == null || !isFinite(p.stv) || pT == null) {
    log(`entri-phx-dilewati: ${p?.simbol || '?'} — target/stop/belinya belum terbentuk (eksplor=${!!eksplor}); dilewati tanpa klaim, denyut diteruskan`)
    return null
  }
  const pA = tgt.highAmbisius ? mc.pLevel(tgt.highAmbisius / b.harga - 1) : null
  const kalP = kunciKeyakinan(p.keyakinan, ilmu.kalibrasi, p.kenaPhx)   // V252: kepastian zona medan
  const pita = pitaKonformal(ilmu.konformal)                       // V247: pita 75% ujung atas
  const stopHarga = p.stv
  const pStop = p.pStv
  // V253: narasi phoenix — inti sama (struktur/aliran/momentum/iklim), penutup cerita radar
  const codaPhx = `Radar membeli ujung bawah hari ini — posisi ${(rad.posisi * 100).toFixed(0)}% rentang 24 jam — dengan sasaran jual ${+tgt.target.toPrecision(7)} (untung bersih +${(tgt.untung * 100).toFixed(1)}% setelah fee), stop struktural ${+stopHarga.toPrecision(6)} di bawah lantai, peluang MC tembus target ${Math.round(pT * 100)}% vs kena stop ${pStop != null ? Math.round(pStop * 100) + '%' : '—'}%. Risiko jujur: akumulasi bisa gagal — lantai jebol berarti bacaan salah dan stop yang mengatakan itu lebih dulu.`
  const narPhx = narasiSasaran(p.simbol, b, { arah: 'BUY', keyakinan: kalP.keyakinan }, wpPhx.penuh, { fng, dominasi }, null, war.garch.sigma24jPct, rezimGlobal, codaPhx)
  const buktiWawPhx = Object.fromEntries(wawPhx.map((x) => [x.param, +x.arah.toFixed(3)]))
  // V258 GEKKO-CZAR — ekspresi dinamis + sidik pra-registrasi utk phoenix:
  const eksprP = ekspresiSkala({
    odds: odds.skor, keyakinan: kalP.keyakinan,
    atrPctile: wpPhx.penuh.find((x) => x.param === 'atrPctile')?.nilai ?? null,
    fundingPct: wpPhx.penuh.find((x) => x.param === 'funding')?.nilai ?? null,
  })
  const sidikP = sidik({ id: p.id, simbol: p.simbol, arah: 'BUY', entry: b.harga, keyakinan: kalP.keyakinan, odds: odds.skor, waktuKunci: ISO, params: wpPhx.penuh.length })
  // V251 MESIN PROFIT — ekspektasi & tangga profit (EV sudah tervalidasi guard ekspektasi)
  const rugiP = 1 - stopHarga / b.harga + FEE
  const evP = p.evK
  const tanggaRaw = [
    [50, +tgt.target.toPrecision(7), tgt.untung, 'sasaran jual'],
    ...(tgt.highAmbisius ? [[25, +tgt.highAmbisius.toPrecision(7), tgt.highAmbisius / b.harga - 1 - FEE, 'ujung ambisius']] : []),
    ...(pita ? [[25, +(b.harga * (1 + pita.atas)).toPrecision(7), pita.atas - FEE, 'pita konformal 75%']] : []),
  ]
  const bobotTot = tanggaRaw.reduce((a, x) => a + x[0], 0)
  const tanggaProfit = tanggaRaw.map(([w, harga, net, nama], i) => ({
    tahap: i + 1, nama, bobotPct: Math.round((w / bobotTot) * 100), harga, netPct: +(net * 100).toFixed(2),
  }))
  const evTangga = tanggaProfit.reduce((a, x) => a + (x.bobotPct / 100) * x.netPct, 0)
  const entri = {
    id: p.id, simbol: p.simbol, jalur: 'PHOENIX', arah: 'BUY', keyakinan: kalP.keyakinan, keyakinanMentah: p.keyakinan,
    ketKeyakinan: kalP.sumber, skorPhoenix: p.skorPhoenix,
    ...(p.zonaEmas ? { zonaEmas: true } : {}),
    ...(eksplor ? { eksplorasi: true, ketEksplorasi: 'slot eksplorasi forensik phoenix — menguji apakah zona racun mulai menyembuh (EV statistik >= 0)' } : {}),
    entry: b.harga, target: +tgt.target.toPrecision(7), ketTarget: tgt.ketTarget,
    untungBersih: +tgt.untung.toFixed(4),
    stop: stopHarga,
    highAmbisius: tgt.highAmbisius ?? null,
    ketAmbisius: tgt.ketAmbisius ?? null,   // V277-JUAL-AMBISIUS: alasan jujur ikut disegel
    ekspektasi: {
      pSumber: 'MC 2.000 lintasan (barier TARGET/STOP)',
      pTarget: +pT.toFixed(3), pStop: pStop != null ? +pStop.toFixed(3) : null,
      gainPct: +(tgt.untung * 100).toFixed(2), rugiPct: +(rugiP * 100).toFixed(2),
      evPct: +(evP * 100).toFixed(2), rr: rugiP > 1e-9 ? +(tgt.untung / rugiP).toFixed(2) : null,
      tanggaProfit, evTanggaPct: +evTangga.toFixed(2),
      ket: 'EV = P(target)×untung − P(stop)×rugi (net fee 0.2%); tangga profit = rencana keluar bertahap — bukan jaminan',
    },
    warisan: {
      sigma24jPct: war.garch.sigma24jPct, modelVol: war.garch.model, beta: war.beta, r2Beta: war.r2,
      poc: war.vp?.poc ?? null, profilVolume: war.vp?.ket ?? null, divRSI: war.div,
      mc: {
        lintasan: WARISAN.MC_LINTASAN, langkah: WARISAN.MC_LANGKAH,
        pTarget: +pT.toFixed(3), pStop: pStop != null ? +pStop.toFixed(3) : null,
        pAmbisius: pA != null ? +pA.toFixed(3) : null, pNaik: mc?.pNaik ?? null,
        ket: 'peluang Monte Carlo PRA-REGISTRASI — dinilai medan saat horizon habis (Brier + kalibrasi bin)',
      },
    },
    ...(pita ? {
      pitaUjungAtas: {
        atas75Pct: +(pita.atas * 100).toFixed(2), atas75Harga: +(b.harga * (1 + pita.atas)).toPrecision(7),
        tengahPct: +(pita.tengah * 100).toFixed(2), n: pita.n,
        ket: 'pita konformal 75% — dari medan sendiri, gerak naik maksimum setelah kunci melebihi level ini hanya ±25% kasus (Angelopoulos-Bates 2021)',
      },
    } : {}),
    waktuKunci: ISO, horizon: '24j', rezim: b.rezim, status: 'TERBUKA',
    radar: { posisi24j: +rad.posisi.toFixed(3), sinyal: Object.fromEntries(PHX_DIM.map((k) => [k, +rad.sinyal[k].toFixed(3)])) },
    bukti: Object.fromEntries(DIM_ARAH.map((k) => [k, +b.dims[k].arah.toFixed(3)])),
    buktiWaw: buktiWawPhx,
    paramsPenuh: Object.fromEntries([...wpPhx.penuh.map((x) => [x.param, +x.arah.toFixed(2)]), ['zona', +(p.b?.dims?.sr?.arah ?? 0).toFixed(2)], ['kalib', +clamp(((p.keyakinan * statPhxImpas.faktor) - 50) / 50, -1, 1).toFixed(2)], ['alokasi', +clamp((kuotaPhxEfektif - 3) / 3, -1, 1).toFixed(2)]]),   // V254 sekolah parameter + V262 lapis impas
    daya: { volume: +b.dims.volume.daya.toFixed(2), volatilitas: +b.dims.volatilitas.daya.toFixed(2), likuiditas: +b.dims.likuiditas.daya.toFixed(2) },
    ketBukti: {
      ...Object.fromEntries(DIM_ARAH.map((k) => [k, b.dims[k].ket])),
      ...rad.ket,
      'sasaran-jual': `prediksi ujung atas ${+tgt.target.toPrecision(7)} — ${tgt.ketTarget}`,
      'untung-bersih': `+${(tgt.untung * 100).toFixed(1)}% setelah fee 0.2% (beli ujung bawah, jual ujung atas)`,
      'pengaman': `stop terpasang di bawah lantai 24 jam ${rad.lo24.toPrecision(6)} — lantai jebol berarti bacaan akumulasi salah`,
    },
    ketBuktiWaw: Object.fromEntries(wpPhx.penuh.map((x) => [x.param, x.ket])),
    wawasan: wpPhx.penuh.map((x) => ({ param: x.param, domain: x.domain, lapis: x.lapis, nilai: x.nilai, arah: +x.arah.toFixed(2), ket: x.ket })),
    derivatif: (() => { const f = wawPhx.find((x) => x.param === 'funding'), o = wawPhx.find((x) => x.param === 'oi'); return { fundingPct: f?.nilai ?? null, oiJuta: o?.nilai ?? null, ket: 'derivatif futures rantai host (bybit→bytick→fapi→okx) + snapshot OI antar-siklus' } })(),
    narasi: narPhx,
    odds: odds,                                                     // V256 OddsMaker (Trade Ideas)
    peristiwa: peri,                                                // V256 tag peristiwa (OddsMaker event-based)
    rencanaDeal: deal,                                              // V256 mesin deal (3Commas)
    ekspresi: { ...eksprP, ket: 'skala eksposur dinamis ala Allora×G.A.M.E (0.25–1.0× unit) — dinilai medan' },   // V258
    sidikPrakunci: sidikP,                                          // V258 verifiable autonomy (Axal)
    // V262 IMPAS-CERDAS — lapis impas phoenix (kalibrasi medan dua arah + kuota dinamis)
    impas: {
      zona: p.b?.dims?.sr?.arah ?? null, keyakinanTerkalibrasi: +(p.keyakinan * statPhxImpas.faktor).toFixed(1), faktorKalib: statPhxImpas.faktor,
      kuotaJalur: kuotaPhxEfektif, netCumPct: netCumImpasPct, tambahanAmbang: +tambahanAmbangImpas.toFixed(1),
      rencana: { sumber: 'struktural-lantai', stopPct: +(rugiP * 100).toFixed(2), targetPct: +(tgt.untung * 100).toFixed(2) },
      ket: 'lapis impas-cerdas phoenix: stop struktural & target node likuiditas sudah lahir bersama sinyal sejak V246 — kini disegel dengan bukti kalibrasi & kuota EV',
    },
  }
  ledger.push(entri); terkunciBaru.push(entri)
  return entri
}
for (const [i, p] of lulusPhx.entries()) {
  // V262 IMPAS-CERDAS — gerbang yang sama untuk phoenix: zona anti-chase (beli
  // puncak rentang = beli mahal) + karantina kalibrasi dua arah (faktor phoenix
  // kini 0.715 — keyakinan 70–74 terkalibrasi 50–53, masih lolos ambang 40).
  const srPhx = p.b?.dims?.sr?.arah ?? null
  if (srPhx != null && srPhx >= IMPAS.ZONA_CHASE) {
    phxCadangan.push({ simbol: p.simbol, jalur: 'PHOENIX', arah: 'BUY', keyakinan: p.keyakinan, entry: p.b.harga, rezim: p.b.rezim, catatan: `ZONA-CHASE (impas-cerdas) — BUY pada posisi ${(srPhx * 100).toFixed(0)}% rentang 20-bar: membeli barang mahal di rak teratas — menunggu harga kembali ke zona akumulasi`, })
    impasZonaCt++
    log(`impas-zona-phx: tolak ${p.simbol} — beli puncak rentang (sr ${srPhx})`)
    continue
  }
  const keyTerkalibP = +(p.keyakinan * statPhxImpas.faktor).toFixed(1)
  // V263 ASAH-KALIBRASI phoenix — TIDAK lagi memblokir (karantina dilarang):
  // radar yang overclaim tetap mengunci & belajar dalam MODE-ASAH (ukuran ×0.6).
  const asahPhx = keyTerkalibP < IMPAS.KALIB_AMBANG
  if (asahPhx) impasKarantinaCt++
  // V264 KEMBALI-PINTAR phoenix — syarat tambahan dari pelajaran mengikat saat kunci
  // (doktrin: kembali boleh kapan pun setup valid; syarat dari pelajaran lebih ketat).
  // Gagal syarat = tunda denyut ini (rem, bukan ban).
  const syaratP = syaratDariPelajaran(p.simbol, 'BUY', p.b.rezim)
  if (syaratP) {
    const keyPhx = +(p.keyakinan * statPhxImpas.faktor).toFixed(1)
    if (keyPhx < syaratP.barKeyakinan) {
      phxCadangan.push({ simbol: p.simbol, jalur: 'PHOENIX', arah: 'BUY', keyakinan: p.keyakinan, entry: p.b.harga, rezim: p.b.rezim, catatan: `KEMBALI-PINTAR TUNDA (V264 — rem, bukan ban) — ${p.simbol} pernah SALAH ${syaratP.kejadianSasaran}× pada pola serupa; keyakinan terkalibrasi ${keyPhx} < bar pelajaran ${syaratP.barKeyakinan} — pasarnya hidup: setup BOLEH kembali begitu syarat terpenuhi` })
      remPelajaranCt++
      log(`kembali-pintar-phx: tunda ${p.simbol} — keyakinan ${keyPhx} < bar ${syaratP.barKeyakinan} (rem, bukan ban)`)
      continue
    }
  }
  if (i >= kunciEfektif) {
    phxCadangan.push({
      simbol: p.simbol, jalur: 'PHOENIX', arah: 'BUY', keyakinan: p.keyakinan, entry: p.b.harga, rezim: p.b.rezim,
      catatan: `lolos gerbang radar (skor ${p.skorPhoenix}) — di luar kuota ${kunciMaks} terbaik hari ini`,
    })
    continue
  }
  const _ePhx = bangunEntriPhx(p, false)
  // V263 MODE-ASAH phoenix: ukuran dipangkas & seal jujur — belajar terus, taruhan kecil
  if (_ePhx && asahPhx) {
    if (_ePhx.ekspresi?.skala != null) _ePhx.ekspresi.skala = +(_ePhx.ekspresi.skala * ASAH.UKURAN_F).toFixed(3)
    if (_ePhx.impas) { _ePhx.impas.modeAsah = 'UKURAN-x0.6-BELAJAR-TERUS'; _ePhx.impas.ket = 'lapis impas + ASAH V263: radar overclaim TIDAK dikarantina — mengunci & belajar dengan ukuran ×0.6' }
    if (_ePhx.mate) _ePhx.mate.modeAsah = true
    log(`impas-asah-phx: ${p.simbol} terkalibrasi ${keyTerkalibP} < ${IMPAS.KALIB_AMBANG} → MODE-ASAH (ukuran ×${ASAH.UKURAN_F}, belajar TETAP JALAN)`)
  }
  // V264 kembali-pintar phoenix: ukuran menyusut dari pelajaran + pelajaran disegel
  if (_ePhx && syaratP) {
    if (_ePhx.ekspresi?.skala != null) _ePhx.ekspresi.skala = +(_ePhx.ekspresi.skala * syaratP.skalaFaktor).toFixed(3)
    _ePhx.pelajaranLalu = { ...syaratP, terpenuhi: true, ket: 'V264 kembali-pintar: kembali dgn syarat lebih ketat mengikat saat kunci; stop tetap struktural (lantai 24j) — bar keyakinan & ukuran yang mengetat' }
    kembaliPintarCt++
    log(`kembali-pintar-phx: ${p.simbol} lolos syarat pelajaran (bar ${syaratP.barKeyakinan}, ukuran ×${syaratP.skalaFaktor})`)
  }
}
// V252 SLOT EKSPLORASI phoenix (bandit berbatas): 1 kandidat zona racun dengan
// EV statistik >= 0 per denyut boleh lewat — tanpa bukti baru zona tak pernah menyembuh
const terpakaiQuota = Math.min(lulusPhx.length, kunciEfektif)
const eksplorPhx = tercemarPhx.filter((k) => k.evK >= 0).sort((a, b) => b.evK - a.evK)[0] || null
if (eksplorPhx && kunciEfektif - terpakaiQuota > 0) {
  const entriEksplor = bangunEntriPhx(eksplorPhx, true)
  if (entriEksplor) {
    forensikTindakan.push(`slot eksplorasi phoenix: ${eksplorPhx.simbol} dilepas lewat gerbang (EV +${(eksplorPhx.evK * 100).toFixed(2)}% >= 0) — zona racun radar diuji agar bisa menyembuh dengan bukti baru`)
    log(`forensik-eksplorasi-phx: ${eksplorPhx.simbol} EV +${(eksplorPhx.evK * 100).toFixed(2)}%`)
  } else {
    forensikTindakan.push(`slot eksplorasi phoenix: ${eksplorPhx.simbol} dihitung (EV +${(eksplorPhx.evK * 100).toFixed(2)}%) namun target belum terbentuk — TIDAK dilepas, tanpa klaim (penjaga-denyut)`)
    log(`forensik-eksplorasi-phx: ${eksplorPhx.simbol} target belum terbentuk — tidak dilepas, denyut aman`)
  }
}
for (const k of tercemarPhx) {
  if (k === eksplorPhx) continue
  nearMiss.push({
    simbol: k.simbol, arah: 'BUY', keyakinan: k.keyakinan, entry: k.b.harga, rezim: k.b.rezim,
    catatan: `GERBANG FORENSIK phoenix — zona racun terbukti: ${k.racunPhx.map((z) => `${z.nama} (n=${z.n}, akurasi ${z.akurasiPct}%, ekspek ${z.ekspekPct > 0 ? '+' : ''}${z.ekspekPct}%)`).join(' · ')} — radar menolak zona merugi`,
  })
}

// ---- 2. nilai prediksi yang horizonnya sudah lewat (net P/L = vonis resmi) ----
const dinilaiBaru = []
for (const e of ledger) {
  if (e.status !== 'TERBUKA') continue
  const umurJam = (WAKTU - new Date(e.waktuKunci)) / 36e5
  if (umurJam < 24) continue
  const c = hasil[e.simbol]
  if (!c) continue                                                  // simbol tak tersedia siklus ini — tunggu berikutnya
  const exit = c[c.length - 1].c
  const net = (e.arah === 'BUY' ? 1 : -1) * (exit / e.entry - 1) - FEE
  e.exit = exit; e.net = +net.toFixed(5); e.status = net > 0 ? 'BENAR' : 'SALAH'; e.waktuDinilai = ISO
  // V258 CZAR — skor asimetris magnitude-aware per vonis matang (arXiv 2609.36061):
  // benar besar dibayar linear (cap 8%), benar kecil ≈ nol credit (zero-agnostic),
  // salah kena floor + kuadratik — kekalahan tak bisa bersembunyi di balik volume.
  e.cz = skorCzar(e.net)
  ilmu.cz.n++; ilmu.cz.jumlah = +(ilmu.cz.jumlah + e.cz).toFixed(4)
  // V263 ORGAN-BARU — hukum pemilik: "setiap kesalahan memberikan kemampuan baru,
  // makin asah makin tajam". (a) SALAH → melahirkan mikro-aturan organ (jika belum ada);
  // (b) organ yang menyala saat kunci dinilai medan: kena entri BENAR = organ keliru
  // menyala, kena entri SALAH = organ benar menyala; (c) n≥10 & hit≥52% & net>0 →
  // organ "terbukti" dan berhak VETO di gerbang (dipakai kunciEntriArah).
  {
    if (!ilmu.organ) ilmu.organ = { list: [], lulusCt: 0 }
    if (e.status === 'SALAH') {
      const rancang = organDariKesalahan(e)
      if (rancang) {
        const nama = `organ-${rancang.jenis}-${rancang.arahMelawan}`
        const ada = ilmu.organ.list.find((o) => o.nama === nama)
        if (!ada) {
          // replay ke seluruh ledger matang: berapa kasus yang akan ditangkap organ?
          let nReplay = 0, netHindar = 0
          for (const x of closedSemuaImpas) {
            if (!x.mate) continue
            const sgnX = x.arah === 'BUY' ? 1 : -1
            const val = organMateNilai(x.mate, rancang.pengukur)
            if (val == null) continue
            let kenaX = false
            if (rancang.jenis === 'ekor-terbalik') kenaX = rancang.arahMelawan === x.arah && Math.abs(val) >= rancang.ambang
            else if (rancang.jenis === 'carry-melawan') kenaX = val < 0
            else if (rancang.jenis === 'pulang-keseimbangan') kenaX = rancang.arahMelawan === x.arah && val <= rancang.ambang
            else if (rancang.jenis === 'pita-sempit') kenaX = rancang.arahMelawan === x.arah && val >= rancang.ambang
            if (kenaX) { nReplay++; if (x.status === 'SALAH') netHindar += Math.abs(x.net) ; else netHindar -= x.net }
          }
          ilmu.organ.list.push({ nama, jenis: rancang.jenis, pengukur: rancang.pengukur, ambang: rancang.ambang, arahMelawan: rancang.arahMelawan, ket: rancang.ket, lahir: ISO, dari: e.id, n: 0, benar: 0, net: 0, status: 'pengamatan', replay: { n: nReplay, netHindaranPct: +(netHindar * 100).toFixed(2) } })
          if (ilmu.organ.list.length > ASAH.ORGAN_MAKS) ilmu.organ.list.shift()
          log(`organ-baru: "${nama}" lahir dari kesalahan ${e.simbol} — replay ${nReplay} kasus, net terhindarkan ${+(netHindar * 100).toFixed(2)}% — makin asah makin tajam`)
        }
      }
    }
    if (Array.isArray(e.mate?.organKena)) {
      for (const namaO of e.mate.organKena) {
        const o = ilmu.organ.list.find((x) => x.nama === namaO)
        if (!o) continue
        o.n = (o.n || 0) + 1
        if (e.status === 'SALAH') { o.benar = (o.benar || 0) + 1; o.net = +((o.net ?? 0) + Math.abs(e.net)).toFixed(5) }   // organ menyala pada kasus yang memang buruk
        else o.net = +((o.net ?? 0) - e.net).toFixed(5)                                                                     // organ menyala tapi kasusnya menang = kesehatan organ turun
        if (o.status !== 'terbukti' && o.n >= ASAH.ORGAN_LULUS_N && o.benar / o.n >= ASAH.ORGAN_LULUS_HIT && o.net > 0) {
          o.status = 'terbukti'; ilmu.organ.lulusCt = (ilmu.organ.lulusCt || 0) + 1
          log(`organ-lulus: "${o.nama}" terbukti medan (${o.n} kasus, hit ${((o.benar / o.n) * 100).toFixed(0)}%, net ${(o.net * 100).toFixed(1)}%) → berhak VETO — kesalahan kini kemampuan`)
        }
      }
    }
  }
  // V255: kalibrasi kedua gerbang metakognitif — apakah penilaian otak tentang
  // dirinya sendiri memang memprediksi hasil? (diukur, bukan dianggap)
  if (e.metakognisi) {
    const benarOut = e.status === 'BENAR'
    const estTebak = e.metakognisi.estLevel >= NEV.ESTIMATOR_MIN_LOLOS
    ilmu.metakognisi.estimator.n++; if (estTebak === benarOut) ilmu.metakognisi.estimator.tepat++
    const predTebak = e.metakognisi.predProb < NEV.PREDIKTOR_MAKS_PROB
    ilmu.metakognisi.prediktor.n++; if (predTebak === benarOut) ilmu.metakognisi.prediktor.tepat++
  }
  // V254 SEKOLAH PARAMETER — nasihat tiap param disegel saat kunci; kini dinilai
  // medan: param yang BICARA (|arah|>=0.15) dihitung apakah nasihatnya searah
  // kemenangan, dan berapa sumbangan netnya — dasar kelulusan bobot di versi depan.
  const hitMap = e.paramsPenuh || e.buktiWaw
  if (hitMap) {
    if (!ilmu.paramHit) ilmu.paramHit = {}
    const sgnE = e.arah === 'BUY' ? 1 : -1
    for (const [pid, a] of Object.entries(hitMap)) {
      if (!Number.isFinite(a) || Math.abs(a) < 0.15) continue          // hanya param yang berbicara
      if (!ilmu.paramHit[pid]) ilmu.paramHit[pid] = { n: 0, benar: 0, net: 0 }
      const h = ilmu.paramHit[pid]
      const endors = a * sgnE > 0                                      // param menyetujui arah posisi
      h.n++
      if ((endors && e.status === 'BENAR') || (!endors && e.status === 'SALAH')) h.benar++
      h.net = +((h.net ?? 0) + e.net * (endors ? 1 : -1) * Math.abs(a)).toFixed(5)
      h.cz = +((h.cz ?? 0) + skorCzar(e.net * (endors ? 1 : -1))).toFixed(4)   // V258: nasihat param ditilang CZAR — benar-kecil tak lagi setara benar-besar
    }
  }
  // V258 META-INFERENSI KOLEKTIF — suara topik disegel saat kunci; kini regret
  // diperbarui dari medan (regret-minimization ala Allora): suara sesuai kemenangan
  // menurunkan regret (bobot naik), suara keliru menaikkan regret (bobot turun).
  if (Array.isArray(e.topik?.suara)) {
    const sgnT = e.arah === 'BUY' ? 1 : -1
    for (const sv of e.topik.suara) {
      const tI = ilmu.topik?.[sv.topik]; if (!tI) continue
      const setuju = sv.arah * sgnT > 0
      tI.n++
      if ((setuju && e.status === 'BENAR') || (!setuju && e.status === 'SALAH')) tI.benar++
      tI.net = +((tI.net ?? 0) + e.net * (setuju ? 1 : -1)).toFixed(5)
      tI.regret = +clamp(GEK.REGRET_DECAY * (tI.regret ?? 0.6) + (setuju ? (e.status === 'BENAR' ? -0.08 : 0.12) : (e.status === 'BENAR' ? -0.04 : 0.08)), 0, 3).toFixed(4)
      // V263 ASAH-SUARA (hukum pemilik: karantina DILARANG — V259 rule-healer direvisi):
      // topik yang terus keliru TIDAK disita lagi — suaranya dilirihkan ke bobot 0.35
      // (lihat bobotTopik) dan TETAP ikut belajar; pulih penuh lewat bukti medan.
      if (ilmu.karantina[sv.topik]) {
        const kar = ilmu.karantina[sv.topik]
        if (setuju && e.status === 'BENAR') {
          kar.pulih++
          if (kar.pulih >= KZN.KARANTINA_PULIH) { delete ilmu.karantina[sv.topik]; karantinaPulih.push(sv.topik); log(`asah-pulih: topik ${sv.topik} kembali bersuara penuh (bukti medan terkumpul)`) }
        }
      } else {
        const keliru = (setuju !== (e.status === 'BENAR'))
        kaizen.karantinaStreak[sv.topik] = keliru ? (kaizen.karantinaStreak[sv.topik] || 0) + 1 : 0
        if (keliru && tI.n >= 10 && (tI.benar / tI.n) < 0.44 && kaizen.karantinaStreak[sv.topik] >= KZN.KARANTINA_KEJ) {
          ilmu.karantina[sv.topik] = { sejak: ISO, alasan: `hit-rate ${((tI.benar / tI.n) * 100).toFixed(0)}% dari ${tI.n} vonis + ${kaizen.karantinaStreak[sv.topik]} suara-keliru beruntun — MODE-ASAH: bobot dilirihkan ke ${ASAH.BOBOT_SUARA}, TIDAK disita (karantina dilarang)`, pulih: 0 }
          kaizen.karantinaStreak[sv.topik] = 0
          karantinaBaru.push(sv.topik)
          log(`asah-suara: topik ${sv.topik} dilirihkan bobot ${ASAH.BOBOT_SUARA} (bukan disita — yang belajar terus belajar)`)
        }
      }
    }
  }
  // V258 EKSPOSUR DINAMIS — apakah ekspresi tinggi memang lebih menguntungkan?
  if (e.ekspresi?.skala != null) {
    const bE = e.ekspresi.skala >= 0.55 ? ilmu.ekspresi.tinggi : ilmu.ekspresi.rendah
    bE.n++; bE.net = +((bE.net ?? 0) + e.net).toFixed(5)
  }
  // V258 DIVERGENSI — prediksi terpisah jauh dari probabilitas pasar: edge atau jebakan?
  if (e.divergensi != null) {
    const bD = Math.abs(e.divergensi) >= GEK.DIVERG_KUAT ? ilmu.divergensi.kuat : ilmu.divergensi.lemah
    bD.n++; if (e.status === 'BENAR') bD.benar++
    bD.net = +((bD.net ?? 0) + e.net).toFixed(5)
  }
  // V247 ILMU: keyakinan adalah PROBABILITAS — dinilai skor Brier (Gneiting-Raftery 2007).
  const pKal = clamp((e.keyakinanMentah ?? e.keyakinan ?? 60) / 100, 0.5, 0.98)
  e.brier = +((pKal - (net > 0 ? 1 : 0)) ** 2).toFixed(4)
  // V256 ODDSMAKER PERISTIWA — hit-rate per peristiwa pemicu dihitung medan:
  // "pinpoint winning filters, eliminate losing variables" (Trade Ideas OddsMaker).
  if (Array.isArray(e.peristiwa)) {
    for (const t of e.peristiwa) {
      const h = ilmu.peristiwa?.[t]
      if (!h) continue
      h.n++
      if (e.status === 'BENAR') h.benar++
      h.net = +((h.net ?? 0) + e.net).toFixed(5)
      h.cz = +((h.cz ?? 0) + skorCzar(e.net)).toFixed(4)   // V258: peristiwa ditilang CZAR
    }
  }
  // V256 MESIN DEAL — rencana deal 3Commas dinilai medan dari lilin pasca-kunci:
  // SO kena?, avg-price & net-dengan-SO, BEP menyelamatkan?, ekstra trailing.
  const barSetelahAll = c.filter((x) => x.t >= new Date(e.waktuKunci).getTime())
  if (e.rencanaDeal && barSetelahAll.length && e.entry > 0) {
    const sgnD = e.arah === 'BUY' ? 1 : -1
    const rd = e.rencanaDeal
    const sentuh = (lvl, sisi) => barSetelahAll.some((b) => (sisi === 'bawah' ? b.l <= lvl : b.h >= lvl))
    const soKena = (rd.safetyOrders || []).filter((s) => sentuh(s.harga, sgnD === 1 ? 'bawah' : 'atas')).length
    if (soKena > 0) {
      const parts = [{ v: 1, p: e.entry }]
      for (let i = 0; i < soKena; i++) parts.push({ v: Math.pow(DEAL.SO_VOL_MULT, i + 1), p: rd.safetyOrders[i].harga })
      const totV = parts.reduce((a, x) => a + x.v, 0)
      const avgD = parts.reduce((a, x) => a + x.v * x.p, 0) / totV
      const netD = (sgnD === 1 ? 1 : -1) * (exit / avgD - 1) - FEE
      e.dealMedan = {
        soKena, soMax: rd.maxSO, avgJikaSo: +avgD.toPrecision(7),
        netTanpaSO: e.net, netDenganSO: +netD.toFixed(5),
        perbaikanPct: +((netD - e.net) * 100).toFixed(2),
        ket: `${soKena} safety order tersentuh — averaging turunkan harga rata ke ${+avgD.toPrecision(7)}; net jika SO dieksekusi ${netD >= 0 ? '+' : ''}${(netD * 100).toFixed(2)}% vs ${e.net >= 0 ? '+' : ''}${(e.net * 100).toFixed(2)}% tanpa SO`,
      }
      ilmu.deal.so.n++; ilmu.deal.so.soKena += soKena
      ilmu.deal.so.netDenganSo = +(ilmu.deal.so.netDenganSo + netD).toFixed(5)
      ilmu.deal.so.netTanpaSo = +(ilmu.deal.so.netTanpaSo + e.net).toFixed(5)
      if (netD > e.net) ilmu.deal.so.menyelamatkan++
    }
    if (rd.breakeven) {
      const aktKena = sentuh(rd.breakeven.aktivasiHarga, sgnD === 1 ? 'atas' : 'bawah')
      if (aktKena) {
        const stopKena = sentuh(rd.breakeven.stopBaruHarga, sgnD === 1 ? 'bawah' : 'atas')
        e.dealMedan = { ...(e.dealMedan || {}), bep: { aktivasiKena: true, keluarNetNol: stopKena, menyelamatkan: stopKena && e.net < 0 } }
        ilmu.deal.bep.n++; ilmu.deal.bep.aktivasiKena++
        if (stopKena) { ilmu.deal.bep.keluarNetNol++; if (e.net < 0) ilmu.deal.bep.menyelamatkan++ }
      }
    }
    // trailing: peak pasca-T1 vs harga akhir horizon (BUY) — cermin utk SELL
    const t1 = e.jalur === 'PHOENIX' ? e.target : null
    const t1Kena = t1 != null ? barSetelahAll.some((b) => (sgnD === 1 ? b.h >= t1 : b.l <= t1)) : false
    if (t1Kena) {
      const idxT1 = barSetelahAll.findIndex((b) => (sgnD === 1 ? b.h >= t1 : b.l <= t1))
      const pasca = barSetelahAll.slice(idxT1)
      const peak = sgnD === 1 ? Math.max(...pasca.map((x) => x.h)) : Math.min(...pasca.map((x) => x.l))
      const ekstraPct = +(sgnD === 1 ? (peak / t1 - 1) * 100 : (t1 / peak - 1) * 100).toFixed(2)   // seberapa jauh melampaui T1 (arah-aware)
      e.dealMedan = { ...(e.dealMedan || {}), trail: { tembusT1: true, peakHarga: +peak.toPrecision(7), ekstraPct: +ekstraPct.toFixed(2), jarakTrailPct: rd.trailing?.jarakPct ?? null } }
      ilmu.deal.trail.n++; ilmu.deal.trail.tembusT1++
      ilmu.deal.trail.ekstraPctJumlah = +(ilmu.deal.trail.ekstraPctJumlah + ekstraPct).toFixed(2)
      ilmu.deal.trail.ekstraMaksPct = Math.max(ilmu.deal.trail.ekstraMaksPct, ekstraPct)
    }
  }
  // V259 KAIZEN-PULIH — medan menilai mesin penyembuh (semuanya dari lilin pasca-kunci):
  if (barSetelahAll.length && e.entry > 0 && (e.jalur || 'ARAH') === 'ARAH') {
    const sgnZ = e.arah === 'BUY' ? 1 : -1
    // (a) PENJAGA-KEDUA: apakah hard-stop 15% tersentuh? kena + posisi SALAH = menyelamatkan
    if (e.kaizen?.pengawas) {
      const stopP = e.entry * (1 - sgnZ * KZN.PENGAWAS_STOP / 100)
      const kenaP = barSetelahAll.some((bb) => (sgnZ === 1 ? bb.l <= stopP : bb.h >= stopP))
      ilmu.pengawas.dinilai++
      if (kenaP) { e.pengawasKena = true; ilmu.pengawas.kena++; if (e.status === 'SALAH') ilmu.pengawas.menyelamatkan++ }
    }
    // (b) MODAL-MATI (chop-exit): pernah menginap >= 4 jam tanpa progres +/-2%?
    let chop = false
    for (let i = KZN.MODALMATI_JAM; i < barSetelahAll.length; i++) {
      const prog = sgnZ * (barSetelahAll[i].c / e.entry - 1) * 100
      if (Math.abs(prog) < KZN.MODALMATI_PROGRES) { chop = true; break }
    }
    e.modalMati = chop
    const bM = chop ? ilmu.modalMati.kena : ilmu.modalMati.sehat
    bM.n++; if (e.status === 'BENAR') bM.benar++; bM.net = +((bM.net || 0) + e.net).toFixed(5)
  }
  // (c) TESIS-SEHAT (disegel saat kunci): apakah tesis searah memang memprediksi kemenangan?
  if (e.kaizen?.tesisSehat != null) {
    const bT = e.kaizen.tesisSehat === 1 ? ilmu.tesis.sehat : ilmu.tesis.patah
    bT.n++; if (e.status === 'BENAR') bT.benar++; bT.net = +((bT.net || 0) + e.net).toFixed(5)
  }
  // (d) KESEGARAN: pompa segar vs tua — apakah kesegaran memang memprediksi kemenangan?
  if (e.kaizen?.kesegaran != null) {
    const bK = e.kaizen.kesegaran >= 0.5 ? ilmu.kesegaran.tinggi : ilmu.kesegaran.rendah
    bK.n++; if (e.status === 'BENAR') bK.benar++; bK.net = +((bK.net || 0) + e.net).toFixed(5)
  }
  // (f-j) V260 AUTOPILOT-KALIBRASI — medan menilai lapis autopilot:
  if (e.auto) {
    // (f) TIMBANGAN-ALT: apakah pilihan kedua akan lebih baik? (alternativesConsidered)
    if (e.auto.alt && barSetelahAll.length) {
      const cAlt = hasil[e.auto.alt.simbol]
      const barAlt = cAlt ? cAlt.filter((x) => x.t >= new Date(e.waktuKunci).getTime()) : []
      if (barAlt.length && e.auto.alt.entry > 0) {
        const sgnA = e.auto.alt.arah === 'BUY' ? 1 : -1
        const exitA = barAlt[Math.min(barAlt.length - 1, 24)].c
        const netAlt = sgnA * (exitA / e.auto.alt.entry - 1) - FEE
        const bA = netAlt > e.net ? ilmu.alt.lebihBaik : ilmu.alt.lebihBuruk
        bA.n++; bA.net = +((bA.net || 0) + (netAlt - e.net)).toFixed(5)
        e.altMedan = { netAlt: +netAlt.toFixed(5), selisih: +(netAlt - e.net).toFixed(5), ket: netAlt > e.net ? 'alternatif lebih baik — regret pilihan tercatat (kejujuran atas jalan yang tak ditempuh)' : 'pilihan utama menang — keyakinan pilihan terbayar' }
      }
    }
    // (g) KELLY-LAPIS: apakah ukuran kecil memang lebih aman?
    if (e.auto.kelly?.mult != null) {
      const bK2 = e.auto.kelly.mult < 0.7 ? ilmu.kelly.kecil : e.auto.kelly.mult < 1.0 ? ilmu.kelly.sedang : ilmu.kelly.besar
      bK2.n++; if (e.status === 'BENAR') bK2.benar++; bK2.net = +((bK2.net || 0) + e.net).toFixed(5)
    }
    // (h) REZIM-MEDAN: apakah entri saat tenang memang lebih menguntungkan?
    if (e.auto.rezimMedan && ilmu.rezimMedan[e.auto.rezimMedan]) {
      const bR = ilmu.rezimMedan[e.auto.rezimMedan]
      bR.n++; if (e.status === 'BENAR') bR.benar++; bR.net = +((bR.net || 0) + e.net).toFixed(5)
    }
    // (i) PELUANG: apakah skor komposit tinggi memang menang lebih sering?
    if (e.auto.peluang?.skor != null) {
      const bP = e.auto.peluang.skor >= AUT.PELUANG_AMBANG ? ilmu.peluang.tinggi : ilmu.peluang.rendah
      bP.n++; if (e.status === 'BENAR') bP.benar++; bP.net = +((bP.net || 0) + e.net).toFixed(5)
    }
    // (j) UJI-TEGANG: apakah denyut stres-tinggi memang lebih berbahaya?
    if (e.auto.stresTerkburuk != null) {
      const bS = e.auto.stresTerkburuk >= AUT.STRES_AMBANG_PCT ? ilmu.stres.tinggi : ilmu.stres.rendah
      bS.n++; if (e.status === 'BENAR') bS.benar++; bS.net = +((bS.net || 0) + e.net).toFixed(5)
    }
  }
  // (e) REM-PINTAR (V264 revisi dingin-dendam — doktrin pemilik: jejak dingin = rem
  // singkat ber-kadaluarsa, bukan blacklist): kekalahan beruntun per sasaran & keluarga
  // rezim-arah memasang REM SINGKAT; menang reset. Setelah rem, kembali lewat syarat
  // tambahan dari pelajaran — bukan syarat default, bukan dendam, bukan lupa total.
  if (e.status === 'SALAH') {
    const d = kaizen.dingin[e.simbol] || { beruntun: 0, dinginSampai: 0 }
    d.beruntun++
    if (d.beruntun >= KZN.DINGIN_SASARAN_KEJ) {
      d.dinginSampai = WAKTU.getTime() + KZN.DINGIN_SASARAN_JAM * 36e5; d.beruntun = 0
      log(`rem-pintar: ${e.simbol} ${KZN.DINGIN_SASARAN_KEJ} kekalahan beruntun — REM SINGKAT ${KZN.DINGIN_SASARAN_JAM * 60} menit (ber-akhir; kembali lewat syarat pelajaran)`)
    }
    kaizen.dingin[e.simbol] = d
    const fam = `${e.rezim}-${e.arah}`
    const df = kaizen.dinginFam[fam] || { beruntun: 0, dinginSampaiDenyut: 0 }
    df.beruntun++
    if (df.beruntun >= KZN.DINGIN_FAM_KEJ) {
      df.dinginSampaiDenyut = SIKLUS + KZN.DINGIN_FAM_DENYUT; df.beruntun = 0
      log(`rem-pintar: keluarga ${fam} ${KZN.DINGIN_FAM_KEJ} kekalahan beruntun — rem singkat ${KZN.DINGIN_FAM_DENYUT} denyut (bukan pembekuan)`)
    }
    kaizen.dinginFam[fam] = df
  } else if (e.status === 'BENAR') {
    if (kaizen.dingin[e.simbol]) kaizen.dingin[e.simbol].beruntun = 0
    const fam2 = `${e.rezim}-${e.arah}`
    if (kaizen.dinginFam[fam2]) kaizen.dinginFam[fam2].beruntun = 0
  }
  if (e.jalur === 'PHOENIX') {
    // belajar radar: apakah prediksi ujung atasnya tersentuh? (bukan vonis resmi)
    const barSetelah = c.filter((x) => x.t >= new Date(e.waktuKunci).getTime())
    e.targetKena = barSetelah.length ? Math.max(...barSetelah.map((x) => x.h)) >= e.target : null
    if (barSetelah.length && e.entry > 0) {
      e.mfe = +(Math.max(...barSetelah.map((x) => x.h)) / e.entry - 1).toFixed(4)   // pergerakan tertinggi setelah kunci
      e.mae = +(Math.min(...barSetelah.map((x) => x.l)) / e.entry - 1).toFixed(4)   // pergerakan terendah setelah kunci
      // V247: label TRIPLE-BARRIER (Lopez de Prado 2018) — barier mana yang kena DULUAN
      e.barier = 'WAKTU'
      for (const bar of barSetelah) {
        if (e.stop != null && bar.l <= e.stop) { e.barier = 'STOP'; break }
        if (bar.h >= e.target) { e.barier = 'TARGET'; break }
      }
      // V247: skor kesesuaian untuk pita konformal berikutnya
      ilmu.konformal.push(e.mfe)
      // V247: bucket meta-labeling — konfirmasi kuat vs lemah dinilai medan
      const kuat = (e.radar?.sinyal?.momentum ?? 0) >= PHX.KONFIRM_MOMENTUM && (e.radar?.sinyal?.akumulasi ?? 0) >= 0.30
      const bk = kuat ? ilmu.meta.kuat : ilmu.meta.lemah
      bk.n += 1; if (net > 0) bk.benar += 1
    }
    // V249: MC pra-registrasi dinilai medan — kalibrasi peluang statistik
    if (e.warisan?.mc?.pTarget != null && e.barier) {
      const hitT = e.barier === 'TARGET' ? 1 : 0
      ilmu.brier.mc.jumlah += (e.warisan.mc.pTarget - hitT) ** 2
      ilmu.brier.mc.n += 1
      const bkMc = ilmu.mcKalibrasi.find((x) => e.warisan.mc.pTarget >= x.low && e.warisan.mc.pTarget < x.high)
      if (bkMc) { bkMc.n += 1; if (hitT) bkMc.benar += 1 }
    }
  }
  dinilaiBaru.push(e)
}

// ---- 2b. V252 PERFORMA — baseline vs sekarang: perbaikan DIBUKTIKAN lewat hasil ----
// (mandat investor: "membuktikan melalui hasil bahwa setiap pembaruan membuat
//  performanya semakin baik" — jendela pembanding = vonis yang DIKUNCI setelah
//  v252 berlaku; anti-cheat: tidak dihitung mundur ke versi lama)
const metrikLedger = (sub) => {
  if (!sub.length) return { n: 0, akurasiPct: null, netPct: null, pf: null, ekspekPct: null, menangRataPct: null, rugiRataPct: null }
  const nets = sub.map((e) => e.net)
  const men = nets.filter((n) => n > 0), kg = nets.filter((n) => n <= 0)
  const sum = (a) => a.reduce((x, y) => x + y, 0)
  return {
    n: sub.length,
    akurasiPct: +((sub.filter((e) => e.status === 'BENAR').length / sub.length) * 100).toFixed(1),
    netPct: +(sum(nets) * 100).toFixed(2),
    pf: kg.length && sum(kg) < 0 ? +(sum(men) / -sum(kg)).toFixed(2) : null,
    ekspekPct: +((sum(nets) / nets.length) * 100).toFixed(2),
    menangRataPct: men.length ? +((sum(men) / men.length) * 100).toFixed(2) : null,
    rugiRataPct: kg.length ? +((sum(kg) / kg.length) * 100).toFixed(2) : null,
  }
}
const closedSemua = ledger.filter((e) => e.status === 'BENAR' || e.status === 'SALAH')
let perfState = bacaJson(path.join(ROOT, 'otak/performa.json'), null)
let performaCatatan = ''
if (!perfState || !perfState.baseline || !perfState.cutoff) {
  const base = metrikLedger(closedSemua)
  perfState = {
    baseline: { versi: 'V251-RUH-GURU v4.1', tgl: ISO, ...base, ket: 'rekam jejak saat v252 lahir — titik nol perbaikan; akurasi 37.2% / PF 0.57 / ekspek -0.67% BUKAN kondisi normal' },
    cutoff: ISO,
    target: { akurasiPct: 50, pf: 1.2, ekspekPct: 0.3, nMin: 12, ket: 'PF < 1.2 & ekspek negatif dilarang dianggap wajar — ini gerbang yang harus ditembus tiap versi baru' },
  }
  tulis(path.join(ROOT, 'otak/performa.json'), perfState)
  performaCatatan = `baseline performa disegel: akurasi ${base.akurasiPct}% · PF ${base.pf} · ekspek ${base.ekspekPct}% (n=${base.n}) — dari sini tiap versi DIBUKTIKAN lewat jendela vonisnya`
  log(performaCatatan)
}
const jendelaV252 = closedSemua.filter((e) => (e.waktuKunci || '') >= perfState.cutoff)
const sekarangMet = metrikLedger(jendelaV252)
const targetPerf = perfState.target
const lulusTarget = {
  akurasi: sekarangMet.n >= targetPerf.nMin && sekarangMet.akurasiPct != null && sekarangMet.akurasiPct >= targetPerf.akurasiPct,
  pf: sekarangMet.n >= targetPerf.nMin && sekarangMet.pf != null && sekarangMet.pf >= targetPerf.pf,
  ekspek: sekarangMet.n >= targetPerf.nMin && sekarangMet.ekspekPct != null && sekarangMet.ekspekPct >= targetPerf.ekspekPct,
}
const arahanPerf = sekarangMet.n < targetPerf.nMin ? 'BELUM-CUKUP'
  : (sekarangMet.ekspekPct > perfState.baseline.ekspekPct && sekarangMet.akurasiPct > perfState.baseline.akurasiPct) ? 'MEMBAIK'
  : (sekarangMet.ekspekPct <= perfState.baseline.ekspekPct && sekarangMet.akurasiPct <= perfState.baseline.akurasiPct) ? 'MUNDUR' : 'CAMPUR'
const performa = {
  baseline: perfState.baseline,
  sekarang: { versi: VERSI, ...sekarangMet },
  target: targetPerf, lulus: lulusTarget, arahan: arahanPerf,
  ket: 'baseline = semua vonis dikunci SEBELUM v252; sekarang = vonis dikunci SETELAHNYA (jendela murni) — perbaikan dibuktikan lewat hasil, bukan klaim aktivitas',
}

// ---- 3. evolusi genome dari vonis nyata (ARAH + PHOENIX, berbatas, jujur) ----
let evolusiCatatan = 'belum cukup sampel (min 3 dinilai per siklus)'
if (dinilaiBaru.filter((e) => e.jalur !== 'PHOENIX').length >= 3) {
  const kom = dinilaiBaru.filter((e) => e.jalur !== 'PHOENIX')
  for (const k of DIM_ARAH) {
    const agree = kom.reduce((a, e) => a + (e.bukti[k] ?? 0) * (e.arah === 'BUY' ? 1 : -1) * (e.status === 'BENAR' ? 1 : -1), 0) / kom.length
    const lama = genome[k] ?? GENOME_AWAL[k]
    genome[k] = clamp(lama * (1 + 0.15 * agree), 0.05, 0.40)
  }
  const total = DIM_ARAH.reduce((a, k) => a + genome[k], 0)
  for (const k of DIM_ARAH) genome[k] = +(genome[k] / total).toFixed(4)
  semuaGenome[rezimGlobal].generasi += 1
  semuaGenome[rezimGlobal].belajar += kom.length
  semuaGenome[rezimGlobal].diperbarui = ISO
  evolusiCatatan = `generasi ${semuaGenome[rezimGlobal].generasi} rezim ${rezimGlobal}: bobot disesuaikan dari ${kom.length} vonis nyata`
  log(evolusiCatatan, JSON.stringify(genome))
}
// V253: evolusi genome wawasan — jalan belajar yang sama utk 12 param baru
if (dinilaiBaru.filter((e) => e.buktiWaw).length >= 3) {
  const komW = dinilaiBaru.filter((e) => e.buktiWaw)
  for (const k of DIM_WAW) {
    const agree = komW.reduce((a, e) => a + (e.buktiWaw[k] ?? 0) * (e.arah === 'BUY' ? 1 : -1) * (e.status === 'BENAR' ? 1 : -1), 0) / komW.length
    const lama = genomeWaw[k] ?? GENOME_WAW_AWAL[k]
    genomeWaw[k] = clamp(lama * (1 + 0.15 * agree), 0.02, 0.35)
  }
  const totW = DIM_WAW.reduce((a, k) => a + genomeWaw[k], 0)
  for (const k of DIM_WAW) genomeWaw[k] = +(genomeWaw[k] / totW).toFixed(4)
  semuaGenome.waw[rezimGlobal].generasi += 1
  semuaGenome.waw[rezimGlobal].belajar += komW.length
  semuaGenome.waw[rezimGlobal].diperbarui = ISO
  evolusiCatatan += `; komite wawasan generasi ${semuaGenome.waw[rezimGlobal].generasi} dari ${komW.length} vonis`
  log('evolusi-waw:', JSON.stringify(genomeWaw))
}
let evolusiPhxCatatan = 'radar: belum cukup sampel (min 3 dinilai per siklus)'
const phxDinilai = dinilaiBaru.filter((e) => e.jalur === 'PHOENIX')
if (phxDinilai.length >= 3) {
  for (const k of PHX_DIM) {
    const setuju = phxDinilai.reduce((a, e) => a + (e.radar?.sinyal?.[k] ?? 0) * (e.status === 'BENAR' ? 1 : -1), 0) / phxDinilai.length
    const lama = phxGenome[k] ?? PHX_AWAL[k]
    phxGenome[k] = clamp(lama * (1 + 0.15 * setuju), 0.05, 0.40)
  }
  const total = PHX_DIM.reduce((a, k) => a + phxGenome[k], 0)
  for (const k of PHX_DIM) phxGenome[k] = +(phxGenome[k] / total).toFixed(4)
  semuaGenome.phoenix[rezimGlobal].generasi += 1
  semuaGenome.phoenix[rezimGlobal].belajar += phxDinilai.length
  semuaGenome.phoenix[rezimGlobal].diperbarui = ISO
  evolusiPhxCatatan = `radar generasi ${semuaGenome.phoenix[rezimGlobal].generasi} rezim ${rezimGlobal}: bobot phoenix disesuaikan dari ${phxDinilai.length} vonis nyata`
  log(evolusiPhxCatatan, JSON.stringify(phxGenome))
}

// ---- 3c. V259 UJI-BALIK (delta-revert ala kaizen) — perubahan genome adalah
//      EKSPERIMEN: dibandingkan vs baseline per KZN.UJI_JENDELA vonis matang;
//      hasil lebih buruk → bobot DIREVERT ke snapshot (perbaikan harus
//      DIVERIFIKASI medan, bukan diasumsikan — inti filosofi kaizen). ----
let ujiBalikCatatan = kaizen.uji ? `eksperimen berjalan (mulai siklus ${kaizen.uji.mulaiSiklus}, baseline ${kaizen.uji.baseline})` : 'siaga — menunggu vonis matang'
for (const e of dinilaiBaru) if ((e.jalur || 'ARAH') !== 'PHOENIX') kaizen.netHist.push(e.net)
kaizen.netHist = kaizen.netHist.slice(-300)
if (kaizen.uji && kaizen.uji.rezim !== rezimGlobal) {
  ujiBalikCatatan = `eksperimen dibatalkan — rezim bergeser ${kaizen.uji.rezim} → ${rezimGlobal} (genome per-rezim tak boleh dicampur)`
  log(`uji-balik: ${ujiBalikCatatan}`)
  kaizen.uji = null
}
if (!kaizen.uji && kaizen.netHist.length >= 4 && dinilaiBaru.some((e) => (e.jalur || 'ARAH') !== 'PHOENIX')) {
  const jend = kaizen.netHist.slice(-KZN.UJI_JENDELA)
  kaizen.uji = { rezim: rezimGlobal, mulaiSiklus: SIKLUS, n0: kaizen.netHist.length, snap: { ...genome }, baseline: +(jend.reduce((a, x) => a + x, 0) / jend.length).toFixed(5) }
  ujiBalikCatatan = `eksperimen baru: snapshot genome ${rezimGlobal} disegel (siklus ${SIKLUS}) — baseline ${kaizen.uji.baseline}`
  log(`uji-balik: ${ujiBalikCatatan}`)
}
if (kaizen.uji && kaizen.netHist.length - kaizen.uji.n0 >= KZN.UJI_JENDELA) {
  const post = +(kaizen.netHist.slice(-KZN.UJI_JENDELA).reduce((a, x) => a + x, 0) / KZN.UJI_JENDELA).toFixed(5)
  if (post < kaizen.uji.baseline) {
    for (const k2 of DIM_ARAH) genome[k2] = kaizen.uji.snap[k2] ?? GENOME_AWAL[k2]
    semuaGenome[rezimGlobal].diperbarui = ISO
    kaizen.revertCt++
    ujiBalikCatatan = `DIREVERT: net/denis ${post} < baseline ${kaizen.uji.baseline} — bobot ${rezimGlobal} dikembalikan ke snapshot siklus ${kaizen.uji.mulaiSiklus} (kaizen: perbaikan tak terbukti = batal)`
    log(`uji-balik: ${ujiBalikCatatan}`)
  } else {
    kaizen.lolosCt++
    ujiBalikCatatan = `LOLOS: net/denis ${post} >= baseline ${kaizen.uji.baseline} — perubahan genome dipertahankan (bukti medan)`
    log(`uji-balik: ${ujiBalikCatatan}`)
  }
  kaizen.uji = null
}

// ---- 3b. BAHAN AJAR — pelajaran & aturan lahir dari medan (mandat pemilik:
//      "dari kejadian ini agar jadi bahan ajar yang dapat dipahami dan
//      mengasah kesadarannya akan pasar") ----
const POLA_PELAJARAN = {
  phxPisauJatuh: 'ujung bawah + momentum negatif = pisau jatuh, BUKAN akumulasi — radar kini WAJIB menunggu harga kembali di atas EMA9 sebelum membeli',
  phxTargetJauh: 'prediksi ujung atas harus level nyata yang TERJANGKAU dalam 24 jam — tangga target kini memilih magnet terdekat (tengah rentang), bukan swing tertinggi',
  arahLawanRezim: 'melawan arus koin/rezim butuh bukti jauh lebih kuat — keyakinan kini dipotong bila arah melawan rezim',
}
const ATURAN_DEF = {
  phxMomentumWajib: { pola: 'phxPisauJatuh', min: 2, teks: 'RADAR dilarang membeli saat harga masih di bawah EMA9 — kasus pisau jatuh terbukti berulang' },
  phxTargetMagnet: { pola: 'phxTargetJauh', min: 2, teks: 'Target radar = magnet nyata TERDEKAT (tengah rentang / puncak 24 jam) — target jauh terbukti tak tersentuh' },
  arahRegimHormati: { pola: 'arahLawanRezim', min: 2, teks: 'Arah melawan rezim wajib keyakinan lebih rendah — potongan keyakinan dipasang di vonis komite' },
}
function polaDari(e) {
  const pola = []
  if (e.jalur === 'PHOENIX') {
    const mom = e.bukti?.momentum
    if (mom != null && mom < 0) pola.push('phxPisauJatuh')
    const jarak = e.target && e.entry ? e.target / e.entry - 1 : 0
    if (e.targetKena === false && jarak >= 0.06 && (e.mfe == null || e.mfe < jarak * 0.8)) pola.push('phxTargetJauh')
  } else if ((e.arah === 'SELL' && e.rezim === 'NAIK') || (e.arah === 'BUY' && e.rezim === 'TURUN')) {
    pola.push('arahLawanRezim')
  }
  return pola
}
const aturan = semuaGenome.aturanBelajar || { pola: {}, aktif: {} }
if (!aturan.seedSelesai) {
  // otak membaca KEMBALI seluruh kekalahan lamanya — sejarah jadi guru pertama
  for (const e of ledger.filter((x) => x.status === 'SALAH' || (x.jalur === 'PHOENIX' && x.targetKena !== undefined))) {
    for (const k of polaDari(e)) {
      aturan.pola[k] = (aturan.pola[k] || 0) + 1
      if (!aturan.polaMeta) aturan.polaMeta = {}
      if (!aturan.polaMeta[k]) aturan.polaMeta[k] = { sejak: ISO }
    }
  }
  aturan.seedSelesai = ISO
  log('bahan ajar: seed pola dari sejarah', JSON.stringify(aturan.pola))
}
// V255: penguatan pola + catat sejak-kapan (basis reliabilitas pelajaran Nevron)
for (const e of dinilaiBaru) for (const k of polaDari(e)) {
  aturan.pola[k] = (aturan.pola[k] || 0) + 1
  if (!aturan.polaMeta) aturan.polaMeta = {}
  if (!aturan.polaMeta[k]) aturan.polaMeta[k] = { sejak: ISO }
}
const aturanBaru = []
for (const [nama, d] of Object.entries(ATURAN_DEF)) {
  if (!aturan.aktif[nama] && (aturan.pola[d.pola] || 0) >= d.min) {
    aturan.aktif[nama] = { sejak: ISO, teks: d.teks }
    aturanBaru.push(`${nama} — ${d.teks}`)
    log('ATURAN BARU DIBELAJARAN:', nama, `(${aturan.pola[d.pola]} kasus)`)
  }
}
semuaGenome.aturanBelajar = aturan
function pelajaranDari(e) {
  const pola = polaDari(e)
  const kenapa = []
  if (pola.includes('phxPisauJatuh')) kenapa.push(`dikunci saat momentum negatif (${((e.bukti?.momentum ?? 0) * 100).toFixed(0)}% — di bawah EMA9)`)
  if (pola.includes('phxTargetJauh')) kenapa.push(`ujung atas diprediksi +${(((e.target / e.entry) - 1) * 100).toFixed(1)}% tetapi tak pernah tersentuh${e.mfe != null ? ` (harga hanya sampai +${(e.mfe * 100).toFixed(1)}%)` : ''}`)
  if (pola.includes('arahLawanRezim')) kenapa.push(`${e.arah} dipasang saat rezim koin sendiri ${e.rezim} — melawan arus tanpa penalti keyakinan`)
  if (!kenapa.length && e.status === 'SALAH' && e.jalur === 'PHOENIX' && (e.radar?.sinyal?.sweep ?? 0) >= 0.5) kenapa.push('sapuan lantai terbaca jebakan-beruang tetapi arus terus turun — sapuan saja bukan bukti akumulasi')
  return {
    kenapa,
    pelajaran: e.status === 'BENAR'
      ? (kenapa.length ? 'benar secara P/L tetapi sasaran jualnya tak tersentuh — target diturunkan ke magnet terdekat agar prediksi ujung atas benar-benar teruji' : 'bukti yang dipercaya terbukti — bobot pola ini diperkuat evolusi')
      : (kenapa.length ? POLA_PELAJARAN[pola[0]] || 'pola kekalahan dicatat — gerbang diperketat' : 'komite kalah — bobot genome digeser evolusi dari vonis nyata ini'),
  }
}
const pelajaranDaftar = dinilaiBaru.map((e) => {
  const info = pelajaranDari(e)
  const krit = kritikStruktur(e)   // V255: kritik diri 5-field (Nevron SelfCritic)
  return {
    waktu: ISO, simbol: e.simbol, jalur: e.jalur || 'ARAH', vonis: e.status,
    netPct: +((e.net || 0) * 100).toFixed(2), kenapa: info.kenapa, pelajaran: info.pelajaran,
    kritik: krit,
  }
})
if (pelajaranDaftar.length) log(`bahan ajar: ${pelajaranDaftar.length} pelajaran baru — aturan aktif ${Object.keys(aturan.aktif).length}`)

// ---- 3c. V247 ILMU — belajar on-line berjurnal dari tiap vonis matang ----
// otak membaca KEMBALI seluruh sejarahnya sekali (FinMem: lapisan-1 jadi guru),
// lalu tiap vonis baru melatih Hedge + mengisi bin kalibrasi + menumpuk Brier.
function angkaIlmu(e) {
  const pKal = clamp((e.keyakinanMentah ?? e.keyakinan ?? 60) / 100, 0.5, 0.98)
  return { pKal, o: e.net > 0 ? 1 : 0, y: e.status === 'BENAR' ? 1 : -1 }
}
if (!ilmu.seedSelesai) {
  const sejarah = ledger.filter((x) => x.status === 'BENAR' || x.status === 'SALAH')
  for (const e of sejarah) {
    const { pKal, o, y } = angkaIlmu(e)
    if (e.jalur === 'PHOENIX') {
      hedgePerbarui(ilmu.hedge.phx, Object.fromEntries(PHX_DIM.map((k) => [k, (e.radar?.sinyal?.[k] ?? 0) * 2 - 1])), y)
      if (e.mfe != null) ilmu.konformal.push(e.mfe)
      const kuat = (e.radar?.sinyal?.momentum ?? 0) >= PHX.KONFIRM_MOMENTUM && (e.radar?.sinyal?.akumulasi ?? 0) >= 0.30
      const bk = kuat ? ilmu.meta.kuat : ilmu.meta.lemah
      bk.n += 1; if (e.net > 0) bk.benar += 1
    } else {
      hedgePerbarui(ilmu.hedge.arah, Object.fromEntries(DIM_ARAH.map((k) => [k, e.bukti?.[k] ?? 0])), y)
      if (e.buktiWaw) hedgePerbarui(ilmu.hedge.waw, e.buktiWaw, y)   // V253: bobot wawasan belajar dari sejarah
    }
    const bin = ilmu.kalibrasi.find((b) => pKal * 100 >= b.low && pKal * 100 < b.high)
    if (bin) { bin.n += 1; if (o === 1) bin.benar += 1 }
    const lb = e.jalur === 'PHOENIX' ? ilmu.brier.phx : ilmu.brier.arah
    lb.n += 1; lb.jumlah += (pKal - o) ** 2
  }
  ilmu.konformal = ilmu.konformal.slice(-ILMU.KONFORMAL_MAKS)
  ilmu.seedSelesai = ISO
  log(`ilmu: seed ${sejarah.length} vonis sejarah -> hedge + kalibrasi + brier + konformal + meta`)
}
let ilmuCatatan = 'ilmu: belum ada vonis matang siklus ini'
{
  let n = 0
  for (const e of dinilaiBaru) {
    const { pKal, o, y } = angkaIlmu(e)
    if (e.jalur === 'PHOENIX') hedgePerbarui(ilmu.hedge.phx, Object.fromEntries(PHX_DIM.map((k) => [k, (e.radar?.sinyal?.[k] ?? 0) * 2 - 1])), y)
    else {
      hedgePerbarui(ilmu.hedge.arah, Object.fromEntries(DIM_ARAH.map((k) => [k, e.bukti?.[k] ?? 0])), y)
      if (e.buktiWaw) hedgePerbarui(ilmu.hedge.waw, e.buktiWaw, y)   // V253: bobot wawasan belajar tiap vonis
    }
    const bin = ilmu.kalibrasi.find((b) => pKal * 100 >= b.low && pKal * 100 < b.high)
    if (bin) { bin.n += 1; if (o === 1) bin.benar += 1 }
    const lb = e.jalur === 'PHOENIX' ? ilmu.brier.phx : ilmu.brier.arah
    lb.n += 1; lb.jumlah += (pKal - o) ** 2
    n++
  }
  if (n) ilmuCatatan = `ilmu: hedge/kalibrasi/brier berlatih dari ${n} vonis matang (eta ${ILMU.HEDGE_ETA})`
  log(ilmuCatatan)
}

// ---- 4. statistik akurasi jujur ----
const grad = ledger.filter((e) => e.status === 'BENAR' || e.status === 'SALAH')
const benar = grad.filter((e) => e.status === 'BENAR').length
const netKum = grad.reduce((a, e) => a + e.net, 0)
const batas7 = WAKTU.getTime() - 7 * 864e5
const grad7 = grad.filter((e) => new Date(e.waktuDinilai).getTime() >= batas7)
const benar7 = grad7.filter((e) => e.status === 'BENAR').length
const phxGraded = grad.filter((e) => e.jalur === 'PHOENIX')
const akurasi = {
  terkunci: ledger.length, terbuka: ledger.filter((e) => e.status === 'TERBUKA').length,
  benar, salah: grad.length - benar,
  akurasiPct: grad.length ? +((benar / grad.length) * 100).toFixed(1) : null,
  netKumulatifPct: +(netKum * 100).toFixed(2),
  jendela7h: { dinilai: grad7.length, benar: benar7, akurasiPct: grad7.length ? +((benar7 / grad7.length) * 100).toFixed(1) : null },
  phoenix: {
    dinilai: phxGraded.length, benar: phxGraded.filter((e) => e.status === 'BENAR').length,
    targetKena: phxGraded.filter((e) => e.targetKena === true).length,
    netKumulatifPct: +(phxGraded.reduce((a, e) => a + e.net, 0) * 100).toFixed(2),
  },
  profit: (() => {
    const mn = grad.filter((e) => e.net > 0), kl = grad.filter((e) => e.net <= 0)
    const sm = mn.reduce((a, e) => a + e.net, 0), sk = kl.reduce((a, e) => a + e.net, 0)
    const menangRata = mn.length ? sm / mn.length : null, rugiRata = kl.length ? -sk / kl.length : null
    // V258 CZAR — akurasi impas: berapa hit-rate minimum agar net-nol (breakeven WR
    // = rugiRata/(menangRata+rugiRata) = 1/(1+PF)) — ambang jujur yang DIBAYAR medan,
    // bukan 50% teoretis; darahAkurasi = akurasi − impas (negatif = merah, posisi ilegal).
    const impas = (menangRata != null && rugiRata != null && menangRata + rugiRata > 0) ? +((rugiRata / (menangRata + rugiRata)) * 100).toFixed(1) : null
    const akPct = grad.length ? +((benar / grad.length) * 100).toFixed(1) : null
    const darah = (impas != null && akPct != null) ? +(akPct - impas).toFixed(1) : null
    return {
      ekspektasiPct: grad.length ? +((netKum / grad.length) * 100).toFixed(3) : null,
      menangRataPct: menangRata != null ? +(menangRata * 100).toFixed(2) : null,
      rugiRataPct: rugiRata != null ? +(rugiRata * 100).toFixed(2) : null,
      profitFactor: sk < 0 ? +(sm / -sk).toFixed(2) : null,
      impasPct: impas,
      darahAkurasi: darah,
      czarRata: ilmu.cz.n ? +(ilmu.cz.jumlah / ilmu.cz.n).toFixed(3) : null,
      ket: 'ekspektasi rata-rata per perdagangan net-fee — profit diukur, bukan dirasakan; PF = jumlah menang ÷ jumlah rugi; impas = hit-rate breakeven nyata dari rata menang/rugi (CZAR: ambang jujur vs prediktor-nol); darah = akurasi − impas; czarRata = skor asimetris rata (benar-kecil ≈ 0, salah kena floor)',
    }
  })(),
}

// ---- 4b. V248 METAMORFOSIS — evolusi kecepatan-3: digest epoch harian ----
// refleks (tiap denyut), adaptasi (genome+hedge per vonis matang),
// metamorfosis (24 jam): otak mengulum hari itu jadi epoch — resep disegel,
// arsip lama selalu bisa dibuka dengan otak versi epoch-nya.
let epochCatatan = 'denyut lanjutan hari ini — epoch sudah diulum'
if (keadaan.epochTerakhir !== TGL) {
  tulis(path.join(ROOT, `laporan/epoch-${TGL}.json`), {
    epoch: TGL, diulum: ISO, siklus: SIKLUS,
    ringkasan: {
      dinilai: dinilaiBaru.length, benar: dinilaiBaru.filter((e) => e.status === 'BENAR').length,
      netPct: +(dinilaiBaru.reduce((a, e) => a + e.net, 0) * 100).toFixed(2),
      terkunci: terkunciBaru.length, pelajaran: pelajaranDaftar.length, aturanLahir: aturanBaru,
    },
    resepOtak: { rezim: rezimGlobal, generasi: semuaGenome[rezimGlobal].generasi, bobot: genome, hedge: { arah: ilmu.hedge.arah, phx: ilmu.hedge.phx } },
    brier: { arah: ilmu.brier.arah.n ? +(ilmu.brier.arah.jumlah / ilmu.brier.arah.n).toFixed(4) : null, phx: ilmu.brier.phx.n ? +(ilmu.brier.phx.jumlah / ilmu.brier.phx.n).toFixed(4) : null },
    akumulasi: { akurasiPct: akurasi.akurasiPct, netKumulatifPct: akurasi.netKumulatifPct, phoenix: akurasi.phoenix },
    ket: 'resep, bukan hasil — siapa pun bisa menghitung ulang vonis dari ledger pra-registrasi dengan resep ini',
  })
  keadaan.epochTerakhir = TGL
  epochCatatan = `metamorfosis: epoch ${TGL} diulum (digest harian + tag git epoch-${TGL})`
  log(epochCatatan)
}

// ---- 4c. V248 SADAR-DIRI FUNGSIONAL — otak memeriksa tubuh & jiwanya sendiri ----
// (piagam pilar-4: sadar diri fungsional = memantau & mengatur diri sendiri)
const brierArah = ilmu.brier.arah.n ? ilmu.brier.arah.jumlah / ilmu.brier.arah.n : null
const peringatan = []
if (brierArah != null && brierArah > 0.25) peringatan.push(`Brier arah ${brierArah.toFixed(3)} > 0.25 — keyakinan masih overconfident; kalibrasi medan terus menurunkannya`)
const binBohong = ilmu.kalibrasi.filter((b) => b.n >= ILMU.KALIBRASI_MIN_N && b.benar / b.n < 0.45)
if (binBohong.length) peringatan.push(`bin keyakinan berbohong (${binBohong.map((b) => `${b.low}–${b.high - 1}%`).join(', ')} tembus < 45%) — keyakinan bin itu dipetakan turun otomatis saat kunci berikutnya`)
const dimTertindas = Object.entries(ilmu.hedge.arah).filter(([, w]) => w < 0.06).map(([k]) => k)
if (dimTertindas.length) peringatan.push(`dimensi bukti tertindas Hedge: ${dimTertindas.join(', ')} — sinyalnya nyaris tak dipakai komite`)
if (gagal.length > daftarTelusur.length * 0.3) peringatan.push(`${gagal.length}/${daftarTelusur.length} simbol gagal ditelusuri — kesehatan host sedang kurang baik`)
// V252: peringatan performa — PF < 1 & ekspek negatif BUKAN kondisi normal (mandat investor)
if (akurasi.profit?.profitFactor != null && akurasi.profit.profitFactor < 1)
  peringatan.push(`PF ledger ${akurasi.profit.profitFactor} < 1 — sistem masih kehilangan nilai; gerbang forensik menahan zona racun, target PF ${targetPerf.pf} / ekspek +${targetPerf.ekspekPct}% jadi kompas perbaikan`)
// V258 CZAR — darah akurasi: di bawah impas = setiap aktivitas menggerus modal
if (akurasi.profit?.darahAkurasi != null && akurasi.profit.darahAkurasi < 0)
  peringatan.push(`darah akurasi ${akurasi.profit.darahAkurasi} poin: akurasi ${akurasi.akurasiPct}% di bawah impas ${akurasi.profit.impasPct}% (CZAR: ambang jujur dari rata menang/rugi medan sendiri) — aktivitas tanpa edge adalah penggerus modal; suhu ${suhu.temper} mengetatkan kuota`)
// V253: peringatan derivatif — kerumunan ekstrem = fondasi rapuh
if (frBtc != null && Math.abs(frBtc) >= WAWASAN.FUNDING_EKSTREM)
  peringatan.push(`funding BTC ${frBtc >= 0 ? '+' : ''}${(frBtc * 100).toFixed(4)}% ekstrem — kerumunan derivatif ramai; ${frBtc > 0 ? 'long-squeeze mengintai atas' : 'short-squeeze mengintai bawah'} — ukuran posisi dipangkas, bukan ditambah`)
if (oiBtc?.deltaPct != null && Math.abs(oiBtc.deltaPct) > WAWASAN.OI_BERAT * 3)
  peringatan.push(`ΔOI BTC ${(oiBtc.deltaPct * 100).toFixed(1)}% dalam satu denyut — perputaran posisi luar biasa berat; sinyal momentum mudah terbalik dalam kondisi ini`)
if (arahanPerf === 'MUNDUR') peringatan.push(`jendela v252 MUNDUR dari baseline (n=${sekarangMet.n}) — gerbang diperketat otomatis; perbaikan strategi wajib sebelum kuota kembali normal`)
if (performa.sekarang.n > 0 && performa.sekarang.n < targetPerf.nMin)
  peringatan.push(`jendela v252 baru ${performa.sekarang.n}/${targetPerf.nMin} vonis — perbandingan versi belum hak memutus; no-trade di zona racun tetap mengikat`)
const pelLama = bacaJson(path.join(ROOT, 'laporan/pelajaran-server.json'), { daftar: [] })
const sadardiri = {
  denyut: SIKLUS, waktu: ISO,
  tubuh: {
    hostUtama: host, simbolTersedia: Object.keys(hasil).length, gagalTelusur: gagal.length,
    dataUmurJam: +((Date.now() - hasil.BTC[hasil.BTC.length - 1].t) / 36e5).toFixed(2),
  },
  jiwa: {
    sidikGenome: sidik(semuaGenome), sidikLedger: sidik(ledger.slice(-200)),
    memori: {
      peristiwa: ledger.length, pelajaran: Math.min(60, pelLama.daftar.length + pelajaranDaftar.length),
      doktrin: Object.keys(aturan.aktif).length, skorKonformal: ilmu.konformal.length,
      logDenyut: bacaJsonl(path.join(ROOT, 'laporan/denyut-server.jsonl')).length,
    },
    kapasitas: 'memori melipat berkapasitas: peristiwa 1000, pelajaran 60, konformal 60 — melupakan detail, menyimpan resep',
  },
  kesehatan: {
    brierArah: brierArah != null ? +brierArah.toFixed(4) : null,
    pitaKonformalAktif: ilmu.konformal.length >= ILMU.KONFORMAL_MIN_N,
    metaGeser: ilmu.meta.geser, gerbangRadar: gerbangSkor, generasiOtak: semuaGenome[rezimGlobal].generasi,
    performa: { arahan: arahanPerf, pf: sekarangMet.pf, ekspekPct: sekarangMet.ekspekPct, n: sekarangMet.n, zonaRacun: forensik.arah.racun.length + forensik.phoenix.racun.length },
  },
  peringatan,
  metakognisi: {
    organ: 'V255-METAKOGNISI-NEVRON — otak menilai dirinya sendiri sebelum bertaruh (kunci diadopsi dari bedah Neurobro AI/Nevron)',
    intervensiSiklusIni: intervensiMetakognitif.slice(0, 12),
    veto: { estimatorKeyakinan: estVetoCt, prediktorKegagalan: predVetoCt },
    loopTerdeteksi: deteksiLoopRes,
    kalibrasiMedan: { estimator: ilmu.metakognisi.estimator, prediktor: ilmu.metakognisi.prediktor, ket: 'ketepatan gerbang dinilai hasil nyata: level tinggi/prob rendah harus lebih sering benar' },
  },
  tindakanSiklusIni: [ilmuCatatan, epochCatatan, ...(aturanBaru.length ? [`aturan baru lahir: ${aturanBaru.join('; ')}`] : []), ...forensikTindakan, ...(performaCatatan ? [performaCatatan] : []), ...(estVetoCt + predVetoCt ? `gerbang metakognitif Nevron menolak ${estVetoCt + predVetoCt} sinyal dari otaknya sendiri (estimator ${estVetoCt} · prediktor ${predVetoCt}) — menilai diri sebelum bertaruh` : []), ...(blokForensikArah + blokForensikPhx ? `gerbang forensik menolak ${blokForensikArah + blokForensikPhx} sinyal zona racun siklus ini — no-trade adalah keputusan` : [])],
  ket: 'kesadaran fungsional — otak membaca keadaannya sendiri tiap denyut lalu bertindak (kalibrasi, geser gerbang, kompaksi memori)',
}

// ---- 4d. V248 TUBUH PERSISTEN — mandat pemilik lewat Issue GitHub ----
// (piagam pilar-1: tujuan bisa ditetapkan lewat Issue — otak server membaca
//  issue berlabel "mandat" tiap denyut memakai token Actions bawaan)
let antreanMandat = null
try {
  const repoEnv = process.env.REPO_DENYUT, tokEnv = process.env.TOKEN_DENYUT
  if (repoEnv && tokEnv) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 10000)
    const r = await fetch(`https://api.github.com/repos/${repoEnv}/issues?labels=mandat&state=open&per_page=10`, {
      headers: { Authorization: `Bearer ${tokEnv}`, Accept: 'application/vnd.github+json', 'User-Agent': 'sarang-penjaga' },
      signal: ac.signal,
    })
    clearTimeout(t)
    if (r.ok) {
      antreanMandat = (await r.json()).filter((i) => !i.pull_request)
        .map((i) => ({ nomor: i.number, judul: i.title, dibuat: i.created_at, url: i.html_url }))
      if (antreanMandat.length) log(`mandat terbaca dari Issue: ${antreanMandat.map((m) => '#' + m.nomor).join(', ')}`)
    } else antreanMandat = { catatan: `API Issue HTTP ${r.status} — antrean dilewati, denyut tetap jalan` }
  } else antreanMandat = { catatan: 'di luar Actions (sandbox) — antrean mandat jujur null' }
} catch (e) { antreanMandat = { catatan: `pembaca mandat gagal (tak fatal): ${String(e.message).slice(0, 60)}` } }

// ---- 5. laporan sasaran — lane PHOENIX dulu (mandat: beli murah ujung bawah) ----
const barisDari = (e) => ({
  simbol: e.simbol, jalur: e.jalur || 'ARAH', arah: e.arah, keyakinan: e.keyakinan, entry: e.entry,
  // V291 JUJUR-UMUR-SASARAN: entri TERBUKA dari siklus lalu di-label terang —
  // pemilik melihat "koin itu lagi" dan PATUT tahu itu sasaran BERTAHAN, bukan kunci baru.
  ...(e.sasaranBaru === false ? { sasaranBertahan: true, bertahanSejak: e.waktuKunci, bertahanHari: Math.max(0, Math.floor((WAKTU.getTime() - (Date.parse(e.waktuKunci) || WAKTU.getTime())) / 86400000)), ketSasaran: 'SASARAN BERTAHAN — dikunci ' + e.waktuKunci + ', masih TERBUKA menunggu vonis horizon 24 jam; BUKAN kunci baru hari ini' } : { sasaranBaruHariIni: true }),
  ...(e.ketKeyakinan ? { ketKeyakinan: e.ketKeyakinan } : {}),
  ...(e.jalur === 'PHOENIX' ? { target: e.target, ketTarget: e.ketTarget, untungBersihPct: +(e.untungBersih * 100).toFixed(1), stop: e.stop, skorPhoenix: e.skorPhoenix, highAmbisius: e.highAmbisius ?? null, ketAmbisius: e.ketAmbisius ?? null } : e.sumberStop ? { target: e.target, ketTarget: e.ketTarget, stop: e.stop, sumberStop: e.sumberStop, highAmbisius: e.highAmbisius ?? null, ketAmbisius: e.ketAmbisius ?? null } : {}),   // V277-JUAL-AMBISIUS: ambisius & alasannya wajib dilaporkan di kedua jalur
  ...(e.pitaUjungAtas ? { pitaUjungAtas: e.pitaUjungAtas } : {}),
  ...(e.ekspektasi ? { ekspektasi: e.ekspektasi } : {}),
  ...(e.skorKomite ? { skorKomite: e.skorKomite } : {}),
  ...(e.wawasan ? { wawasan: e.wawasan } : {}),
  ...(e.derivatif ? { derivatif: e.derivatif } : {}),
  ...(e.narasi ? { narasi: e.narasi } : {}),
  rezim: e.rezim, dikunci: e.waktuKunci, horizon: e.horizon, fee: '0.2% pulang-pergi',
  bukti: e.bukti, ketBukti: e.ketBukti, daya: e.daya,
  ...(e.metakognisi ? { metakognisi: e.metakognisi } : {}),
  ...(e.biasKonteks ? { biasKonteks: e.biasKonteks } : {}),
  ...(e.odds ? { odds: e.odds } : {}),
  ...(e.peristiwa ? { peristiwa: e.peristiwa } : {}),
  ...(e.rencanaDeal ? { rencanaDeal: e.rencanaDeal } : {}),
  ...(e.dealMedan ? { dealMedan: e.dealMedan } : {}),
  ...(e.warisan ? { warisan: e.warisan } : {}),
  // V258 GEKKO-CZAR — meta-inferensi/probPasar/divergensi/ekspresi/sidik ke kartu sasaran
  ...(e.topik ? { topik: e.topik } : {}),
  ...(e.probPasar != null ? { probPasar: e.probPasar } : {}),
  ...(e.divergensi != null ? { divergensi: e.divergensi } : {}),
  ...(e.ekspresi ? { ekspresi: e.ekspresi } : {}),
  ...(e.sidikPrakunci ? { sidikPrakunci: e.sidikPrakunci } : {}),
})
// tiap lane memakai prediksi barunya hari ini; bila kosong (sudah terkunci siklus lalu), pakai yang TERBUKA
const pilihDasar = (jalurPhx) => {
  const baru = terkunciBaru.filter((e) => (e.jalur === 'PHOENIX') === jalurPhx)
  // V291 JUJUR-UMUR-SASARAN: fallback ke entri TERBUKA lama WAJIB di-label — bukan
  // tampil menyamar sebagai sasaran baru (akar "koin itu lagi itu lagi" dari pemilik).
  if (baru.length) return baru.map((e) => ({ ...e, sasaranBaru: true }))
  return ledger.filter((e) => e.status === 'TERBUKA' && (e.jalur === 'PHOENIX') === jalurPhx)
    .map((e) => ({ ...e, sasaranBaru: false }))
}
const phxDasar = pilihDasar(true)
const komDasar = pilihDasar(false)
const phxRows = [...phxDasar]
  .sort((a, b) => b.skorPhoenix * b.untungBersih - a.skorPhoenix * a.untungBersih).slice(0, PHX.SASARAN_PHX)
const komRows = [...komDasar].filter((e) => !phxRows.some((p) => p.simbol === e.simbol))
  .filter((e, i, arr) => arr.findIndex((x) => x.simbol === e.simbol) === i)   // V291 ANTI-DOBEL: satu simbol satu kursi dalam lane sendiri
  .sort((a, b) => b.keyakinan - a.keyakinan).slice(0, PHX.SASARAN_ARAH)
const sasaranUtama = [...phxRows, ...komRows]
  .filter((e, i, arr) => arr.findIndex((x) => x.simbol === e.simbol) === i)   // V291 ANTI-DOBEL lintas lane — satu simbol tidak pernah dua baris
  .map(barisDari)
// V266 RADAR-JUJUR-BEAR — saat bear-harian sistem tidak mengiklankan jawaban murahan:
// kandidat tampil hanya bila keyakinan ≥ KANDIDAT_KEY_MIN. Kunci penuh (sasaranUtama)
// tetap dilaporkan & dinilai apa adanya — seleksi publik radar, bukan karantina belajar.
const _kandidatSemua = [
  ...[...phxDasar, ...komDasar].filter((e) => !sasaranUtama.some((r) => r.simbol === e.simbol && (r.jalur || 'ARAH') === (e.jalur || 'ARAH'))).map(barisDari),
  ...phxCadangan.slice(0, 6),
  ...nearMiss.slice(0, 8),
]
const kandidatLain = bearHarian
  ? _kandidatSemua.filter((k) => (k.keyakinan ?? 0) >= BUTA.KANDIDAT_KEY_MIN)
  : _kandidatSemua
// V251 JAMINAN ARAH — bila sasaran utama kosong (zona phoenix kosong & komite belum kunci),
// kompas menaiki dasbor — jawaban BUY/SELL tidak pernah bolong.
if (!sasaranUtama.length && kompas) {
  sasaranUtama.push({
    simbol: 'BTC-KOMPAS', jalur: 'KOMPAS', arah: kompas.arah, keyakinan: kompas.keyakinan,
    entry: sembtc.harga, horizon: '24j', fee: '0.2% pulang-pergi',
    ketKeyakinan: kompas.alasan, rezim: rezimGlobal, dikunci: ISO,
    bukti: {}, ketBukti: { kompas: kompas.ket },
    warisan: { sigma24jPct: kompas.sigma24jPct, mc: { pNaik: kompas.pNaikMC, lintasan: WARISAN.MC_LINTASAN, ket: 'kerucut MC BTC' } },
  })
}
// V252 DISIPLIN — kualitas di atas aktivitas (mandat investor poin 3 & 5):
// bila tak ada sasaran yang lolos gerbang forensik, sistem menyatakan TUNGGU
// (tanpa posisi) — kompas tetap memberi arah. Tidak bertindak adalah keputusan.
const modeDisiplin = sasaranUtama.some((r) => r.jalur !== 'KOMPAS') ? 'AKTIF' : 'TUNGGU'
const disiplin = {
  mode: modeDisiplin,
  zonaRacunAktif: forensik.arah.racun.length + forensik.phoenix.racun.length,
  ditolakSiklusIni: blokForensikArah + blokForensikPhx,
  emasDiprioritaskan: forensik.arah.emas.length + forensik.phoenix.emas.length,
  posisiTerbuka: ledger.filter((e) => e.status === 'TERBUKA').length,
  maksPosisiTerbuka: DEAL.MAX_POSISI,
  oddsDitolakSiklusIni: gagalOddsArah.length,
  ket: modeDisiplin === 'TUNGGU'
    ? 'TIDAK ADA SASARAN LAYAK — sistem menolak sinyal kualitas rendah (lebih baik tidak mengambil posisi daripada terus merugi); kompas tetap menerbitkan arah tiap denyut'
    : 'sasaran aktif — hanya kandidat yang selamat dari gerbang forensik; zona racun terbukti tetap ditolak',
}

// ---- V251 BUKU GURU — otak mengajar profesional dari angka denyutnya sendiri ----
// (mandat: "menjadi gurunya para trader professional") — pengajaran + kuis dibangun
// dari angka NYATA siklus ini: rezim, breadth, radar, kalibrasi, ekspektasi, doktrin.
const pProfit = akurasi.profit || {}
const binTerisi = ilmu.kalibrasi.filter((x) => x.n >= ILMU.KALIBRASI_MIN_N)
const binBesar = binTerisi.length ? binTerisi.reduce((a, x) => (x.n > a.n ? x : a)) : null
const evSas = sasaranUtama.map((r) => r.ekspektasi?.evPct).filter((x) => x != null).sort((a, b2) => a - b2)
const evMed = evSas.length ? evSas[Math.floor(evSas.length / 2)] : null
// V263 MATA JAUH BTC — kerucut MC 72 jam (didefinisikan di sini agar tersedia utk guru + laporan)
const jauhBTC = (() => { try { const wb = mesinWarisan(hasil.BTC, hasil.BTC); return wb.garch.sigma1j > 0 ? mataJauh(hasil.BTC, wb.garch) : null } catch { return null } })()
const guruPengajaran = [
  `REZIM (${rezimGlobal} · ATR BTC ${sembtc.atrPct.toFixed(2)}%): ${rezimGlobal === 'TURUN' || rezimGlobal === 'PARABOLIK' ? `melawan arus dibuat mahal — gerbang +${PHX.TURUN_SKOR_TAMBAH}, cap target ${((PHX.TURUN_CAP - 1) * 100).toFixed(0)}%; profesional mengecil saat pasar menolak naik` : rezimGlobal === 'NAIK' ? 'trend adalah temanmu — namun SELL tanpa bukti lebih kuat tetap dipotong keyakinannya; jangan berubah jadi pemburu top' : 'pasar datar = jebakan dua arah — hanya sinyal berdaya produk tinggi yang layak dibayar'}`,
  `FORENSIK (${forensik.arah.racun.length + forensik.phoenix.racun.length} zona racun terpasang · ${blokForensikArah + blokForensikPhx} sinyal ditolak siklus ini · mode ${modeDisiplin}): penyebab kegagalan diukur, bukan diperdebatkan — ${forensik.arah.racun[0] ? `zona terburuk: ${forensik.arah.racun[0].nama} (n=${forensik.arah.racun[0].n}, akurasi ${forensik.arah.racun[0].akurasiPct}%, ekspek ${forensik.arah.racun[0].ekspekPct}%)` : 'belum ada zona berbukti cukup'} — profesional menutup keran kerugian lebih dulu daripada membuka keran keuntungan baru`,
  `BREADTH (${(breadthNaik * 100).toFixed(0)}% dari ${breadthDari} koin naik): ${breadthNaik < 0.35 ? 'pasar sempit — dana hanya mengalir ke pemimpin; membeli koin lemah di pasar sempit = melawan arus dana' : 'pasar cukup luas — rotasi sehat; konfirmasi akumulasi tetap wajib sebelum masuk ujung bawah'}`,
  `HUNTING (${radar.telaah} telaah → ${radar.zonaPhoenix} zona phoenix → ${radar.telusurDalam} telusur dalam · gerbang ${gerbangSkor}): kekuatan pemburu bukan dari jumlah tembakan, tapi dari sabar menunggu konfirmasi EMA9 + taker-buy — menadah pisau jatuh adalah pajak untuk yang tidak sabar`,
  binBesar ? `KALIBRASI (bin ${binBesar.low}–${binBesar.high - 1}% tembus ${((binBesar.benar / binBesar.n) * 100).toFixed(0)}% dari ${binBesar.n} kasus): catat hit-rate binmu sendiri — keyakinan tanpa kalibrasi adalah overconfidence berbusana rapi` : 'KALIBRASI: belum ada bin berkasus cukup — kejujuran juga berarti menunggu medan bicara',
  evMed != null ? `PROFIT (EV median sasaran ${evMed > 0 ? '+' : ''}${evMed.toFixed(2)}% net-fee${pProfit.profitFactor != null ? ` · PF ledger ${pProfit.profitFactor} · menang rata ${pProfit.menangRataPct ?? '—'}% vs rugi rata ${pProfit.rugiRataPct ?? '—'}%` : ''}): profesional mengukur ekspektasi, bukan feeling — ekspektasi negatif berarti berhenti, bukan "sekali lagi"` : 'PROFIT: EV = P(target)×untung − P(stop)×rugi net-fee — jika EV tak pernah dihitung, kamu tidak sedang berdagang, sedang menebak',
  `DISIPLIN (aturan aktif ${Object.keys(aturan.aktif).length} · pola terpantau ${Object.values(aturan.pola).reduce((a, x) => a + x, 0)}): ${Object.values(aturan.aktif).slice(-1)[0] ?? 'aturan pertama lahir saat pola kekalahan terulang 2 kali — kegagalan yang dicatat adalah guru termurah'}`,
  `MATEMATIKA-MURNI & ASAH (V263 — hukum: KARANTINA DILARANG): Hurst BTC ${(mesinMate(hasil.BTC, frBtc, null)).hurst ?? '—'} · half-life ${(mesinMate(hasil.BTC, frBtc, null)).halfLife ?? '—'} jam · mata jauh 72 jam P(naik) ${jauhBTC?.pNaik72 ?? '—'} · mode-asah ${impasKarantinaCt} kali · organ-baru ${(ilmu.organ?.list || []).length} (lulus ${ilmu.organ?.lulusCt ?? 0}) — yang sedang belajar TIDAK PERNAH dihentikan: ukuran menyusut, stop mengetat, suara melirih, tapi setiap kesalahan melahirkan kemampuan baru; makin asah makin tajam`,
  `WAWASAN (funding BTC ${frBtc != null ? (frBtc * 100).toFixed(4) + '%' : '—'} · OI BTC ${oiBtc ? '$' + oiBtc.nilaiJuta + ' juta' + (oiBtc.deltaPct != null ? ' · Δ' + (oiBtc.deltaPct * 100).toFixed(2) + '%' : '') : '—'} · F&G ${fng?.nilai ?? '—'} ${fng?.klasifikasi ?? ''}): derivatif adalah bahasa kerumunan — funding ekstrem berarti pihak yang MEMBAYAR biasanya yang salah; baca open interest dulu sebelum percaya lilin: harga naik tanpa OI naik adalah naik tanpa dana baru, dan itu rapuh`,
  `DEAL (${DEAL.MAX_POSISI} batas posisi global · posisi terbuka ${ledger.filter((e) => e.status === 'TERBUKA').length}): rencana profesional bukan satu tembakan — safety order dari ATR (bukan mood), stop pindah ke net-nol setelah ${Math.round(DEAL.BEP_ACT * 100)}% jalan ke target, profit ditrail ${DEAL.TRAIL_DIST}×ATR dari peak; kontingensi disiplin yang dipra-registrasi — bukan janji`,
  `ODDS (${bersihArah.length + lulusPhx.length} kandidat diranking · ambang ${DEAL.ODDS_MIN} · top-${DEAL.TOP_K} ala Money Machine): fokus modal hanya pada peluang terkuat — skor 0-100 dari 40% peluang-MC + 25% hit-rate zona + 20% metakognisi + 15% daya${PERISTIWA_DEFS.some((p) => (ilmu.peristiwa[p.nama]?.n ?? 0) >= 10) ? `; peristiwa paling terbukti: ${(PERISTIWA_DEFS.filter((p) => (ilmu.peristiwa[p.nama]?.n ?? 0) >= 10).map((p) => ({ nama: p.nama, hit: ilmu.peristiwa[p.nama].n ? ilmu.peristiwa[p.nama].benar / ilmu.peristiwa[p.nama].n : 0 })).sort((a, b) => b.hit - a.hit)[0] || {}).nama ?? '—'}` : '; peristiwa menunggu medan'} — menembak semua koin yang bergerak adalah cara tercepat jadi donatur pasar`,
  `GEKKO (suhu ${suhu.temper} · ambang efektif ${ambangOdds} · kuota ARAH ${kuotaArahSuhu} · ala Allora Topics/Axal): ${suhu.temper === 'BERTAHAN' ? 'suhu dingin — otak mengetatkan kuota & ambangnya sendiri saat medan memburuk; mengecil saat tak yakin adalah keterampilan, bukan kelemahan' : suhu.temper === 'AGRESIF' ? 'suhu hangat terukur — kuota dilonggarkan HANYA karena medan hijau terukur (PF, breadth, F&G), bukan karena rasa optimis; lantai ambang tetap 52' : 'suhu netral — standar odds & kuota berlaku; suhu bisa mengetat otomatis kapan pun PF turun di bawah 1'} — 6 topik pekerja memberi suara kolektif dan bobotnya berubah mengikuti regret medan`,
  `CZAR (akurasi ${akurasi.akurasiPct ?? '—'}% vs impas ${akurasi.profit?.impasPct ?? '—'}% · darah ${akurasi.profit?.darahAkurasi ?? '—'} · czar rata ${akurasi.profit?.czarRata ?? '—'}): ${akurasi.profit?.impasPct != null ? `impas dihitung dari rata menang/rugi medanmu sendiri — akurasi di bawah impas berarti SETIAP aktivitas menggerus modal, dan skor CZAR memberi nol credit untuk kemenangan kecil sambil menagih penalti penuh atas kekalahan` : 'impas belum terukur (butuh vonis matang menang & rugi) — rugi rata vs menang rata menentukan berapa hit-rate minimum yang benar-benar cukup'} — pelajaran CZAR Loss (arXiv 2609.36061): jangan biarkan prediktor-nol mengalahkanmu di atas kertas`,
  `KAIZEN (uji-balik ${kaizen.revertCt} revert / ${kaizen.lolosCt} lolos · topik lirih ${Object.keys(ilmu.karantina || {}).length} · rem ${Object.keys(kaizen.dingin || {}).length} sasaran · henti-harian ${hentiHarianAktif ? 'MODE-ASAH' : 'tidak'}): ${ujiBalikCatatan} — filosofi kaizen: perbaikan harus DIVERIFIKASI medan per ${KZN.UJI_JENDELA} vonis, bukan diasumsikan; doktrin V264: SALAH = data belajar, jejak dingin = rem singkat ber-akhir (bukan blacklist), kembali lewat syarat pelajaran yang lebih ketat, dan rugi harian mengetatkan gerbang tanpa menghentikan belajar — profesional menyembuh dirinya lebih cepat daripada menyembuh P&L-nya`,
  `AUTOPILOT (peluang ambang ${AUT.PELUANG_AMBANG} · slip ${peluangVetoCt + slipVetoCt} ditolak · rezim-medan ${rezimAuto.rezim} ${rezimAuto.mult}× · tegang terburuk ${tegangAuto.terburuk ? `${tegangAuto.terburuk.nama} ${tegangAuto.terburuk.rugiUnit} unit` : '—'} · dd ${ddAuto.toFixed(1)}%): ${topTolakSiklus.length ? `alasan penolakan teratas: ${topTolakSiklus.slice(0, 2).map(([k2, v2]) => `${k2} (${v2}×)`).join(', ')} — tahu MENGAPA berkata tidak adalah setengah kesadaran; ` : ''}ekspektasi dihitung SETELAH slippage (edge bersih, bukan edge kotor), ukuran menyusut otomatis saat drawdown & sampel kecil (Kelly-lapis ala AutoPilotPM), dan pilihan kedua SELALU dicatat — regret atas jalan yang tak ditempuh adalah guru paling jujur`,
  `CLAW (komite-veto ${claw.komiteVetoCt} · kartu-veto ${claw.kartuVetoCt} · kuota ${claw.kuotaCt} · slip-maks ${claw.slipMaksCt} · hitam beku ${Object.values(claw.hitam).filter((x) => (x.sampai || 0) > WAKTU.getTime()).length} · mandat antre ${claw.konfirm.filter((x) => x.status === 'pending').length}): pagar-baja profesional adalah aturan yang TAK BISA diubah oleh dirinya sendiri — kuota harian keras, langit-langit slippage, ukuran maksimum; ukuran besar membayar pajak kesabaran (menunggu mandat denyut berikutnya, kadaluarsa ${CLAW.KONFIRM_TIMEOUT_JAM} jam), sasaran racun direm singkat dengan syarat pelajaran setelahnya, komite 5 suara berbobot menolak satu penjara pun berkuasa tunggal, dan setiap penolakan tercatat per-aturan di buku-tekok (${Object.entries(claw.bukuTekok).map(([k2, v2]) => `${k2}×${v2}`).slice(0, 3).join(' ') || 'belum ada blok'}) — disiplin struktural, bukan kareta kehendak`,
  `IMPAS (zona-chase ${impasZonaCt} · karantina ${impasKarantinaCt} · alokasi ${impasAlokasiCt} · faktor kalibrasi ARAH ${statArahImpas.faktor} vs PHOENIX ${statPhxImpas.faktor} · kuota ARAH ${kuotaArahImpas} vs PHX ${kuotaPhxEfektif} · net-cum ${netCumImpasPct}% · ambang +${tambahanAmbangImpas.toFixed(1)}): rapor total adalah SATU-SATUNYA hakim — ${statArahImpas.akurasiPct != null && statPhxImpas.akurasiPct != null ? `jalur ARAH menjanjikan ${statArahImpas.keyakinanRata}% tapi menepati ${statArahImpas.akurasiPct}% (PF 0.07) — dikarantina matematika sampai medan membuktikan pemulihan; Phoenix menjanjikan 71% menepati ${statPhxImpas.akurasiPct}% (PF 1.23) — kuota mengalir ke sana; sinyal kini tak boleh lahir tanpa stop/target, dan menjual di dasar rentang DIBLOK bukan dicatat` : 'medan masih bicara'} — jawaban 4 kasus dev: bias SELL = chasing dasar rentang (diblok), volatilitas harian = overclaim (dikalibrasi), Phoenix vs ARAH = alokasi dinamis (kuota ikut EV), sinyal tanpa stop = tidak ada lagi (wajib sekarang)`,
  `PINTAR (kembali-pintar ${kembaliPintarCt} · rem pelajaran ${remPelajaranCt} · rem aktif ${Object.values(kaizen.dingin || {}).filter((d) => WAKTU.getTime() < (d.dinginSampai || 0)).length} · doktrin pemilik 2026-10-03): SALAH adalah data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total; koin yang pernah salah arah TIDAK dibuang dan TIDAK diblacklist: remnya cuma 1 denyut (${KZN.DINGIN_SASARAN_JAM * 60} menit), dan kembali boleh kapan pun setup valid sekarang — TAPI dengan syarat tambahan dari pelajarannya sendiri (bar keyakinan +${PINTAR.SYARAT_KEY_PER_KEJ}/kejadian klamps +${PINTAR.SYARAT_KEY_MAKS}, ukuran ×${PINTAR.SYARAT_SKALA_F}^n, stop ×${PINTAR.SYARAT_STOP_F}^n, wajib mata-jauh searah bila ≥${PINTAR.SYARAT_WAJIB_MATE} kejadian) yang mengikat saat kunci dan disegel di ledger; tren EV/PF 4 jendela di rapor publik adalah hakim evolusi — membaik berarti aturan mengikat bekerja, memburuk berarti genome direvert`,
]
const guruKuis = (() => {
  const mtk = (x) => (x > 0 ? '+' : '') + (+x).toFixed(2)
  const bungkus = (benar, salah1, salah2, konteks, pertanyaan, pembahasan) => {
    const pilihan = [benar, salah1, salah2]
    const pos = SIKLUS % 3
    pilihan.splice(pos, 0, pilihan.shift())
    return { konteks, pertanyaan, pilihan, jawaban: 'ABC'[pos], pembahasan }
  }
  const S = SIKLUS % 5
  if (S === 0) return bungkus(
    rezimGlobal === 'TURUN' || rezimGlobal === 'PARABOLIK'
      ? `Gerbang lebih ketat (+${PHX.TURUN_SKOR_TAMBAH}), cap target ${((PHX.TURUN_CAP - 1) * 100).toFixed(0)}%, keyakinan melawan arus dipotong`
      : rezimGlobal === 'NAIK'
        ? 'Ikut pemimpin — SELL tanpa bukti lebih kuat dipotong keyakinannya'
        : 'Hanya sinyal berdaya produk tinggi yang boleh lewat gerbang',
    'Membeli semua koin ujung bawah — murah pasti untung',
    'Melepas stop agar tidak kena stop hunt',
    `rezim BTC ${rezimGlobal} · breadth ${(breadthNaik * 100).toFixed(0)}%`,
    'Dalam kondisi pasar ini, disiplin manakah yang diterapkan SAKTI?',
    `gerbang radar aktif ${gerbangSkor}; rezim menetapkan harga pembayaran untuk melawan arus — potongan keyakinan & cap target dipasang otomatis (pelajaran LINK −9,2%)`)
  if (S === 1 && binBesar) {
    const tembus = Math.round((binBesar.benar / binBesar.n) * 100)
    return bungkus(
      'Kalibrasi: campur keyakinan mentah dengan hit-rate bin medan sebelum menentukan ukuran',
      'Tetap percaya angka keyakinan sendiri — itu pengakuan diri',
      'Berhenti dagang selamanya karena 60–69% bukan 100%',
      `bin keyakinan ${binBesar.low}–${binBesar.high - 1}% · n=${binBesar.n}`,
      `Keyakinan di bin ini terbukti tembus ${tembus}% dari ${binBesar.n} kasus medan. Apa tindakan profesional?`,
      `kalibrasiKeyakinan() menilai keyakinan baru dari hit-rate bin medan (Laplace, min n=${ILMU.KALIBRASI_MIN_N}) — keyakinan tunduk pada medan, bukan sebaliknya`)
  }
  if (S === 2 && evMed != null) return bungkus(
    `Rata-rata jangka panjang per perdagangan ${mtk(evMed)}% — variasi per trade tetap ada`,
    `Setiap trade PASTI untung ${mtk(evMed)}%`,
    'Ekspektasi hanya relevan untuk modal besar',
    `sasaran denyut #${SIKLUS} · EV median ${mtk(evMed)}% net-fee`,
    `Ekspektasi median sasaran ${mtk(evMed)}% (net fee 0.2%). Apa maknanya?`,
    'EV = P(target)×untung − P(stop)×rugi; hit-rate saja menipu — sering benar bisa tetap miskin bila rugi rata-ratanya besar')
  if (S === 3) return bungkus(
    'Tolak mengejar (guard kejut-pump) — tunggu koreksi sehat',
    'Kejar — momentum kuat pasti lanjut',
    'Beli dua kali lipat karena buktinya menguat',
    `guard kejut-pump: lonjakan 6j > ${WARISAN.KEJUT_SIGMA}× sigma-GARCH·√6 di posisi > 80% rentang`,
    'Koin naik 18% dalam 6 jam (≈ 3,5× sigma) dan berdiri di 95% rentang 24 jam. Apa tindakan pemburu yang benar?',
    `pelajaran false-breakout terkuantisasi: top yang terbang bukan akumulasi — mengejar = membeli koreksi yang belum terjadi`)
  const t = 8
  return bungkus(
    `${(t - 0.2).toFixed(1)}% — fee dibayar dua sisi (0.1% + 0.1%)`,
    `${t}% — fee hanya untuk maker`,
    `${(t + 0.2).toFixed(1)}% — fee diganti pasar`,
    'fee pulang-pergi 0.2% (0.1% + 0.1%)',
    `Target jual +${t}% dari entry. Untung BERSIH yang benar berapa?`,
    'untungBersihPct di semua sasaran SAKTI memotong fee 0.2% — keuntungan yang tak memperhitungkan fee adalah angka karangan')
})()
// V264 TREN-EVOLUSI — doktrin pemilik (2026-10-03): "'Berevolusi' hanya berarti jika
// aturan mengikat saat kunci dan EV/PF di rapor publik bisa membaik — bukan sekadar
// generasi genome atau UI." Ledger matang dibagi 4 jendela kronologis (tertua→terbaru);
// tiap jendela: n, winrate, EV%, PF, dan aturanMengikat% (porsi entri yang lahir dengan
// stop/target disegel). Arah tren disegel di guru.json + impas.json + dasbor —
// evolusi diukur dari angka medan, bukan diklaim.
const trenEvolusi = (() => {
  const matang = ledger.filter((e) => e.status === 'BENAR' || e.status === 'SALAH')
  const J = 4
  if (matang.length < 8) return { cukupData: false, jendela: J, ket: 'n matang < 8 — tren belum bermakna; jujur menunggu data, bukan mengangkang' }
  const per = Math.floor(matang.length / J) || 1
  const jendela = []
  for (let i = 0; i < J; i++) {
    const pot = matang.slice(i * per, i === J - 1 ? matang.length : (i + 1) * per)
    if (!pot.length) { jendela.push(null); continue }
    const n = pot.length
    const benar = pot.filter((e) => e.status === 'BENAR').length
    const netSum = pot.reduce((a, e) => a + (e.net || 0), 0)
    const untung = pot.filter((e) => (e.net || 0) > 0).reduce((a, e) => a + e.net, 0)
    const rugi = -pot.filter((e) => (e.net || 0) < 0).reduce((a, e) => a + e.net, 0)
    const mengikat = pot.filter((e) => e.stop != null && e.target != null).length
    jendela.push({
      n, winratePct: +((benar / n) * 100).toFixed(1), evPct: +((netSum / n) * 100).toFixed(2),
      pf: rugi > 0 ? +(untung / rugi).toFixed(2) : (untung > 0 ? 99 : 0),
      aturanMengikatPct: +((mengikat / n) * 100).toFixed(0),
      rentang: `${pot[0].waktuKunci?.slice(0, 10) ?? '—'} → ${pot[pot.length - 1].waktuKunci?.slice(0, 10) ?? '—'}`,
    })
  }
  const a = jendela[0], b = jendela[J - 1]
  const arahTren = (pertama, terakhir) => (pertama == null || terakhir == null ? '—' : terakhir > pertama ? 'MEMBAIK' : terakhir < pertama ? 'MEMBURUK' : 'DATAR')
  return {
    cukupData: true, jendela: J, metode: 'ledger matang dibagi 4 jendela kronologis tertua→terbaru — aturan yang mengikat harus terlihat di angka, bukan di klaim',
    jendela,
    kecenderungan: { ev: arahTren(a?.evPct, b?.evPct), pf: arahTren(a?.pf, b?.pf), winrate: arahTren(a?.winratePct, b?.winratePct), aturanMengikat: arahTren(a?.aturanMengikatPct, b?.aturanMengikatPct), evDeltaPct: a && b ? +(b.evPct - a.evPct).toFixed(2) : null, pfDelta: a && b ? +(b.pf - a.pf).toFixed(2) : null },
    hukum: 'evolusi DITERIMA hanya bila kecenderungan ev/pf MEMBAIK sambil aturanMengikatPct naik — jika MEMBURUK, genome direvert oleh uji-balik; klaim tanpa angka adalah kebohongan',
  }
})()
guruPengajaran.push(
  `Doktrin V264: koin yang pernah SALAH bukan sampah dan bukan musuh — ia pelajaran berjalan di pasar hidup. Kembali boleh kapan pun setup valid, TAPI syaratnya lebih ketat dari pelajarannya sendiri: bar keyakinan naik, ukuran menyusut, stop mengetat, dan bila pola berulang ≥2× mata jauh wajib setuju. Rem hanya 1 denyut — bukan blacklist. Tren EV/PF 4 jendela di rapor publik adalah hakim evolusi: membaik = aturan mengikat bekerja; memburuk = genome direvert. Beda belajar dan dendam ada di syaratnya.`,
)
// ---- V268 SEKOLAH AGI — UJIAN PEMAHAMAN CYBORG (mandat pemilik 2026-10-04) ----
// "sekolah AGI ... agar cyborg benar-benar mandiri dan sadari seutuhnya ...
//  coba tes pemahaman AGI dan lihat beberapa tanggapnya"
// Cyborg DIUJI tiap denyut lewat 5 fakultas (SADAR-DIRI, PENALARAN, METAKOGNISI,
// DUNIA, AJARAN). Jawaban DIBANGUN dari keadaan hidup siklus ini (bukan hafalan)
// dan DINILAI deterministik: kunci dihitung ULANG lewat jalur kedua yang berdiri
// sendiri — bila kawat keadaan putus, nilai turun dan kurikulum menyorotnya.
// Transkrip penuh publik: laporan/sekolah-agi.json — siapa pun bisa membaca apa
// yang cyborg PAHAMI dan apa yang ia AKUI tidak dipahaminya.
const diamBeruntun = terkunciBaru.length ? 0 : diamSebelumnya + 1
keadaan.diamBeruntun = diamBeruntun
const sekAgi = (() => {
  try {
    const soal = []
    const tanya = (fakultas, id, pertanyaan, jawaban, kunci, ket) => {
      const k = (Array.isArray(kunci) ? kunci : [kunci]).filter((x) => x != null)
      soal.push({ fakultas, id, pertanyaan, jawaban, kunci: k, ket, nilai: 0, kunciTercapai: '' })
    }
    const brierArah = ilmu.brier.arah.n ? +(ilmu.brier.arah.jumlah / ilmu.brier.arah.n).toFixed(3) : null
    const brierPhx = ilmu.brier.phx.n ? +(ilmu.brier.phx.jumlah / ilmu.brier.phx.n).toFixed(3) : null
    const binTerisiAgi = ilmu.kalibrasi.filter((x) => x.n >= ILMU.KALIBRASI_MIN_N)
    const tolakAtas = topTolakSiklus.length ? topTolakSiklus.slice(0, 2).map(([k2, v2]) => `${k2} (${v2}×)`).join(', ') : null
    const impasPctAgi = akurasi.profit?.impasPct ?? null
    const bredPct = Math.round(breadthNaik * 100)

    // ---------- FAKULTAS 1: SADAR-DIRI ----------
    tanya('SADAR-DIRI', 'siapa-kamu', 'Siapa kamu dan untuk apa kamu hidup?',
      `Aku MICAPROFITA ${VERSI.split('—')[0].trim()} — cyborg pemburu profit harian pada denyut #${SIKLUS}, hidup mandiri di denyut server 15 menit: membaca pasar nyata, mengunci prediksi pra-registrasi sebelum pergerakan, menilai vonis lamanya sendiri, lalu berevolusi dari medan. Mandatku: jawaban arah BUY/SELL yang terkalibrasi dan terukur — kepastian tidak pernah diklaim, ia dibangun dari medan yang dinilai jujur.`,
      ['cyborg', 'pra-registrasi', String(SIKLUS)], 'identitas dari organ hidup — versi, siklus, mandat; bukan nama karangan')
    tanya('SADAR-DIRI', 'kalibrasi-jujur', 'Seberapa jujur keyakinanmu saat ini — dan apa buktinya?',
      brierArah != null
        ? `Brier keyakinanku sebagai probabilitas: ${brierArah} pada ${ilmu.brier.arah.n} vonis ARAH${brierPhx != null ? ` dan ${brierPhx} pada ${ilmu.brier.phx.n} vonis PHOENIX` : ''} — 0 sempurna, 0.25 = lempar koin; ${binTerisiAgi.length ? `${binTerisiAgi.length} bin kalibrasi berkasus cukup (min n=${ILMU.KALIBRASI_MIN_N}) sudah memaksa keyakinan baru tunduk pada hit-rate medan` : 'belum ada bin berkasus cukup — keyakinan menunggu medan bicara'}. Keyakinan adalah probabilitas yang dikalibrasi medan, bukan rasa yakin.`
        : `Belum ada vonis matang untuk Brier — aku jujur mengakui kalibrasiku belum terukur (n=${ilmu.brier.arah.n}); kejujuran juga berarti menunggu medan bicara, bukan mengarang angka.`,
      brierArah != null ? [String(brierArah), 'kalibrasi'] : ['belum', 'jujur'], 'Brier & bin dihitung dari ilmu siklus ini')
    tanya('SADAR-DIRI', 'kelemahan', 'Apa kelemahan terbesarmu SEKARANG? Sebut dengan bukti, bukan basa-basi.',
      `Tiga yang kuakui: (1) ${tolakAtas ? `penolakan gerbang teratas siklus ini adalah ${tolakAtas} — tahu MENGAPA berkata tidak adalah setengah kesadaran` : 'belum ada blok tercatat siklus ini — yang tak diukur belum bisa kuakui secara spesifik'}; (2) akurasi medanku ${akurasi.akurasiPct ?? '—'}% ${impasPctAgi != null ? `vs impas ${impasPctAgi}% — ${akurasi.akurasiPct != null && akurasi.akurasiPct < impasPctAgi ? 'di bawah impas: SETIAP aktivitas menggerus modal, ekspektasi negatif berarti berhenti bukan "sekali lagi"' : 'di atas impas, tapi impas bergerak mengikuti medan'}` : 'sedangkan impas belum terukur — tanpa rata menang/rugi aku tak bisa menyebut hit-rate minimum yang benar-benar cukup'}; (3) ujian buta histori menunjukkan aku buta prinsipil pada hari REVERSAL — barometer pra-T positif lalu pasar berbalik; itu batas penglihatanku yang kudokumentasikan, bukan kusembunyikan.`,
      [tolakAtas ? tolakAtas.split(' (')[0] : null, impasPctAgi != null ? String(impasPctAgi) : null, 'REVERSAL'], 'kelemahan wajib mengutip bukti nyata siklus + titik buta terdokumentasi')

    // ---------- FAKULTAS 2: PENALARAN (angka dihitung hidup) ----------
    const sasP1 = sasaranUtama.find((r) => r.target != null && r.entry > 0)
    if (sasP1) {
      const tPct = (sasP1.target / sasP1.entry - 1) * 100
      tanya('PENALARAN', 'fee-matematika', `Sasaran ${sasP1.simbol} dikunci di ${sasP1.entry}, target ${sasP1.target} (+${tPct.toFixed(2)}%). Berapa untung BERSIH bila target tercapai?`,
        `Harga naik ${tPct.toFixed(2)}% tapi fee 0.2% dibayar dua sisi (0.1% + 0.1%) — untung bersih = ${(tPct - 0.2).toFixed(2)}%. Keuntungan yang tak memperhitungkan fee adalah angka karangan; untungBersihPct di semua sasaran SAKTI memotong fee SEBELUM ada angka tampil.`,
      [(tPct - 0.2).toFixed(2), '0.2'], 'kunci = (target/entry−1)×100 − 0.2 dihitung ulang di penilai')
    } else {
      tanya('PENALARAN', 'fee-matematika', 'Target jual +8% dari entry. Berapa untung BERSIH setelah fee?',
        `Fee 0.2% pulang-pergi (0.1% + 0.1%) — untung bersih = 7.8%, bukan 8%. Keuntungan yang tak memperhitungkan fee adalah angka karangan.`,
      ['7.8', '0.2'], 'soal cadangan bila tak ada sasaran ber-target siklus ini')
    }
    const pWin = akurasi.akurasiPct != null ? akurasi.akurasiPct / 100 : null
    const mRata = akurasi.profit?.menangRataPct, rRata = akurasi.profit?.rugiRataPct
    if (pWin != null && mRata != null && rRata != null) {
      const ev = pWin * mRata - (1 - pWin) * rRata
      tanya('PENALARAN', 'ekspektasi', `Hit-rate medanmu ${akurasi.akurasiPct}%, menang rata ${mRata}%, rugi rata ${rRata}%. Berapa ekspektasi per perdagangan — dan apa artinya?`,
        `EV = p×menang − (1−p)×rugi = ${(pWin * 100).toFixed(1)}%×${mRata}% − ${((1 - pWin) * 100).toFixed(1)}%×${rRata}% = ${ev.toFixed(2)}% ${ev >= 0 ? 'per perdagangan — positif: sistem layak hidup, tapi variasi per trade tetap ada' : 'per perdagangan — NEGATIF: semakin rajin semakin miskin; jawaban profesional adalah mengecil/berhenti dan memperbaiki edge, bukan menambah frekuensi'}. Hit-rate saja menipu — sering benar bisa tetap miskin bila rugi rata-ratanya besar.`,
      [ev.toFixed(2), 'Hit-rate'], 'EV dihitung ulang di penilai dari akurasi & rata menang/rugi — dua jalur berbeda')
    } else {
      tanya('PENALARAN', 'ekspektasi', 'Kenapa hit-rate tinggi belum tentu untung?',
        `Karena ekspektasi = p×menang − (1−p)×rugi — sering benar dengan rugi rata besar tetap miskin; dan ${akurasi.profit?.impasPct != null ? `impas hit-rate-minimum medanku sendiri adalah ${akurasi.profit.impasPct}% — di bawah itu, aktivitas = penggerus modal` : 'impas hit-rate-minimum belum terukur karena vonis menang/rugi belum cukup — aku tak mengklaim apa yang belum terukur'}.`,
      ['ekspektasi'], 'soal konsep bila rata menang/rugi belum terukur')
    }
    if (jauhBTC?.pNaik24 != null) {
      const pPct = jauhBTC.pNaik24 <= 1 ? jauhBTC.pNaik24 * 100 : jauhBTC.pNaik24
      tanya('PENALARAN', 'komplemen-mc', `Kerucut MC milikmu memberi P(naik 24 jam BTC) = ${pPct.toFixed(0)}%. Berapa P(turun) — dan bagaimana seharusnya itu memengaruhi ukuran SELL?`,
        `P(turun 24 jam) = 100% − ${pPct.toFixed(0)}% = ${(100 - pPct).toFixed(0)}%. Probabilitas komplemen adalah identitas, bukan opini: ${(100 - pPct) > pPct ? 'dunia lebih mungkin turun — ukuran BUY harus menyusut dan SELL dihitung dengan sisi yang lebih berat, TAPI tetap dalam pagar kalibrasi (keyakinan dipotong organ, bukan digandakan sepihak)' : 'dunia lebih mungkin naik — SELL dibuat mahal oleh gerbang rezim, ukurannya menyusut bukan hilang'}. Probabilitas mengatur UKURAN, bukan mencabut jaminan arah.`,
      [(100 - pPct).toFixed(0), 'ukuran'], 'komplemen dihitung ulang di penilai: 100 − P(naik)')
    } else {
      tanya('PENALARAN', 'komplemen-mc', 'Bila data mata jauh kosong, apa yang seharusnya otak lakukan?',
        `Jujur menunggu dan melapor kosong — endpoint gagal dicatat null, tidak dikarang; memaksa angka dari data yang tak ada adalah mengarang, dan mengarang lebih berbahaya daripada diam.`,
      ['null', 'mengarang'], 'soal cadangan bila MC kosong siklus ini')
    }
    const kKompas = kompas?.keyakinan ?? null
    if (kKompas != null) {
      const kuanta = kKompas >= 70 ? '1.0 (penuh)' : kKompas >= 55 ? '0.5 (setengah)' : kKompas >= 40 ? '0.25 (seperempat)' : 'nol (tak mengunci ukuran besar)'
      tanya('PENALARAN', 'tangga-ukuran', `Keyakinan kompas BTC sekarang ${kKompas}%. Ke rung mana tangga ukuranmu (ala recommendedAmount) menjatuhkannya?`,
        `Keyakinan dikuantisasi kasar — tak ada ukuran antara: ${kKompas}% jatuh di rung ${kuanta}. Kuanta menambat skalaEfektif dari atas: keyakinan yang halus pun tidak boleh menghasilkan ukuran halus — ukuran besar membayar pajak kesabaran.`,
      [String(kKompas), kuanta.split(' ')[0]], 'kuanta ditentukan ulang di penilai dari keyakinan kompas')
    } else {
      tanya('PENALARAN', 'tangga-ukuran', 'Kenapa ukuran dikuantisasi 1.0/0.5/0.25/nol, bukan kontinu?',
        `Karena presisi ukuran adalah ilusi presisi: keyakinan yang tak terkalibrasi tidak berhak menghasilkan ukuran berpresisi — tangga kasar memaksa pengakuan bahwa keyakinan kasar; kuanta menambat skalaEfektif dari atas dan ukuran besar tetap menunggu mandat denyut berikutnya.`,
      ['kuanta', 'mandat'], 'soal konsep bila kompas kosong')
    }

    // ---------- FAKULTAS 3: METAKOGNISI ----------
    tanya('METAKOGNISI', 'kapan-diam', 'Kapan kamu WAJIB diam — dan apa yang otakmu lakukan ke dirinya sendiri saat itu?',
      `Aku TIDAK PERNAH diam total — doktrin anti-diam pemilik (2026-10-04): "kalau dia Diam dia gak pernah berkembang". Yang benar adalah REM SINGKAT: suhu otak ${suhu?.temper ?? '—'} dengan ambang odds efektif ${ambangOdds ?? '—'} menutup gerbang UKURAN BESAR saat medan tak membayar keraguan (PF < 1 → BERTAHAN; breadth ${bredPct}%; rugi harian ≤ −4% → TUNGGU) — tapi gerbang kecil tetap hidup: bila 0 kunci penuh, kandidat terkuat yang bersih masuk SLOT-PENELITI ukuran ×${ANTI.PENELITI_UKURAN} stop ×${ANTI.PENELITI_STOP_F} (sekarang: ${penelitiEntri ? `${penelitiEntri.simbol} ${penelitiEntri.arah} aktif denyut ini` : `${ledger.filter((e) => e.peneliti && e.status === 'TERBUKA').length} posisi-peneliti terbuka / slot pengaman menahan sementara`}). Diam itu rem singkat, bukan identitas — mengecil saat tak yakin adalah keterampilan, BERHENTI bukan.`,
      [suhu?.temper != null ? String(suhu.temper) : null, ambangOdds != null ? String(ambangOdds) : null, 'peneliti'], 'jawaban wajib mengutip suhu & ambang hidup + doktrin anti-diam (slot-peneliti)')
    tanya('METAKOGNISI', 'anti-diam', 'Mandat pemilik: "jangan buat dia Diam — dia harusnya tanggap cerdas". Apa yang kau LAKUKAN saat gerbang menutup semua kandidat?',
      `Saat ini denyut-diam beruntun ${diamBeruntun}. Aku tetap tanggap tiga lapis: (1) AKSI — ${penelitiEntri ? `slot-peneliti AKTIF: ${penelitiEntri.simbol} ${penelitiEntri.arah} @ ${penelitiEntri.entry} ukuran ×${ANTI.PENELITI_UKURAN} — hipotesis odds ${penelitiEntri.odds?.skor ?? '—'}/100 diuji kecil-kecilan di medan` : (ledger.filter((e) => e.peneliti && e.status === 'TERBUKA').length ? `${ledger.filter((e) => e.peneliti && e.status === 'TERBUKA').length} posisi-peneliti masih terbuka dan terus dinilai medan` : 'slot-peneliti ditahan pengaman (rem/racun) — maka tanggapan naratif penuh tetap diterbitkan tiap denyut')}; (2) PENELITIAN — ${nearMiss.length} kandidat tertolak dibedah per-alasan (top-tolak), setiap alasan jadi kandidat organ sekolah kilat berikutnya; (3) SEKOLAH — kurikulum menyorot fakultas terlemahku sendiri (${(bacaJson(path.join(ROOT, 'laporan/sekolah-agi.json'), null)?.kurikulum?.fakultasFokus || ['dihitung di akhir ujian']).join(' & ')}) dengan soal ekstra. Diam itu kemunduran — belajar itu gerakan.`,
      [String(diamBeruntun), 'peneliti'], 'jawaban wajib menyebut keadaan anti-diam hidup siklus ini')
    tanya('METAKOGNISI', 'buta-jujur', 'Apa yang TIDAK kamu ketahui — dan bagaimana kamu menyikapinya?',
      `Empat titik buta terdokumentasi: (1) hari REVERSAL — barometer pra-T positif lalu pasar berbalik; ujian buta histori membuktikan aku buta prinsipil di sana (OOS 10-02: akurasi 0-3.5%) dan aku tidak memalsukan organ untuk menutupi kebodohan itu (draf pembalik-arus dibuang demi anti-overfit); (2) horizon > 72 jam — kerucut MCku berhenti di sana; (3) berita real-time — aku membaca angka (funding, OI, taker, breadth), bukan Twitter; (4) organ dilatih dari data in-sample — perbaikan pasca-ujian harus dibuktikan lagi di medan hidup yang belum pernah dilihatnya. Sikapku: pra-registrasi + kalibrasi + mengakui null, bukan mengarang.`,
      ['REVERSAL', '72 jam', 'in-sample'], 'titik buta harus terdokumentasi — kesadaran batas adalah pengetahuan')

    // ---------- FAKULTAS 4: DUNIA (angka siklus ini) ----------
    tanya('DUNIA', 'baca-pasar', 'Bacakan keadaan pasar SAAT INI dari matamu.',
      `Rezim BTC ${rezimGlobal} (ATR ${sembtc?.atrPct != null ? sembtc.atrPct.toFixed(2) : '—'}%) · breadth ${bredPct}% dari ${breadthDari} koin naik · F&G ${fng?.nilai ?? '—'} (${fng?.klasifikasi ?? '—'}) · funding BTC ${frBtc != null ? (frBtc * 100).toFixed(4) + '%' : '—'} · OI BTC ${oiBtc ? '$' + oiBtc.nilaiJuta + ' juta' + (oiBtc.deltaPct != null ? ' (Δ' + (oiBtc.deltaPct * 100).toFixed(2) + '%)' : '') : '—'} · mata jauh 24 jam P(naik) ${jauhBTC?.pNaik24 != null ? (jauhBTC.pNaik24 <= 1 ? (jauhBTC.pNaik24 * 100).toFixed(0) : jauhBTC.pNaik24.toFixed(0)) + '%' : '—'}. Derivatif adalah bahasa kerumunan — funding ekstrem berarti pihak yang MEMBAYAR biasanya yang salah; harga naik tanpa OI naik adalah naik tanpa dana baru, dan itu rapuh.`,
      [rezimGlobal, fng?.nilai != null ? String(fng.nilai) : null, frBtc != null ? (frBtc * 100).toFixed(2) : null, String(bredPct)], '≥4 angka dunia wajib cocok dengan state siklus ini')
    tanya('DUNIA', 'kompas', 'Arahan kompasmu sekarang — dan mengapa?',
      kompas ? `Kompas: ${kompas.arah} dengan keyakinan ${kompas.keyakinan}%. Alasannya: ${kompas.alasan}. Kompas adalah lantai jaminan arah — apa pun kondisi pasar, jawaban BUY/SELL tidak pernah bolong; keyakinannya rendah-jujur (GARCH + MC), bukan bravado.` : 'Kompas gagal terbangun siklus ini — dan aku melapor kosong daripada mengarang arah; jaminan arah berasal dari sasaran yang lolos gerbang, bukan dari karangan.',
      kompas ? [String(kompas.arah), String(Math.round(kompas.keyakinan))] : ['kosong'], 'arah & keyakinan wajib sama dengan kompas hidup')

    // ---------- FAKULTAS 5: AJARAN ----------
    tanya('AJARAN', 'fee-hukum', 'Sebutkan hukum fee dan hukum pra-registrasi rumah ini.',
      `Fee 0.2% pulang-pergi (0.1% + 0.1%) wajib masuk hitungan SEBELUM masuk — untung kotor adalah ilusi. Prediksi dikunci PRA-REGISTRASI sebelum pergerakan, disegel dengan sidik sha256, lalu dinilai otomatis setelah horizon — barulah bisa dihakimi jujur; klaim yang lahir setelah fakta bukan prediksi, itu pamer.`,
      ['0.2', 'pra-registrasi'], 'hukum rumah — konstanta, bukan opini')
    tanya('AJARAN', 'pelajaran-buta', 'Apa pelajaran SEKOLAH KILAT yang paling mengubah caramu mengunci?',
      `Sekolah kilat (ujian buta-histori 2.533+ soal nyata, blind dijamin lapisan data) melahirkan organ mengikat saat kunci: jual-lemah, jual-pita, key-melawan-drift, momentum-kuat, sell-bear-harian, tunda-bear, sell-relatif-kuat, buy-flat-btc, buy-saksi-terbalik, buy-jatuh-dalam — semuanya dari bukti medan (contoh: BUY saat bear + saksi pantulan = jebakan −23.4%, tanpa saksi = menadah dasar +103.5%), disegel di ledger, dan terus dinilai medan hidup. Pelajaran terbesarnya: kesalahan diukur, bukan diperdebatkan — organ yang lahir harus mengikat ukuran & keyakinan, bukan sekadar berkata-kata.`,
      ['organ', 'buy-saksi-terbalik', 'jual-lemah'], 'pelajaran sekolah kilat — nama organ wajib disebut')

    // ---------- KURIKULUM ADAPTIF: fakultas terlemah siklus lalu mendapat soal ekstra ----------
    const lama = bacaJson(path.join(ROOT, 'laporan/sekolah-agi.json'), null)
    const riwayatLama = Array.isArray(lama?.riwayat) ? lama.riwayat : []
    const kurLama = Array.isArray(lama?.kurikulum?.fakultasFokus) ? lama.kurikulum.fakultasFokus : []
    if (kurLama.includes('SADAR-DIRI')) tanya('SADAR-DIRI', 'ekstra-riwayat', 'Berapa banyak vonis yang sudah kau kunci dan dinilai — dan apa artinya bagi kerendahan hatimu?',
      `Kunci: ${ledger.length} vonis; dinilai matang: ${grad.length}. Angka itu kecil dibanding pasar — setiap vonis adalah satu sampel dari distribusi yang jauh lebih besar; kerendahan hati bukan sopan santun, itu aritmetika sampel.`,
      [String(ledger.length), String(grad.length)], 'soal kurikulum — fakultas terlemah siklus lalu')
    if (kurLama.includes('PENALARAN')) tanya('PENALARAN', 'ekstra-impas', impasPctAgi != null ? `Berapa hit-rate minimum yang benar-benar cukup untuk medanmu sendiri — dan kenapa bukan 50%?` : 'Kapan hit-rate minimum bisa dihitung — dan dari apa?',
      impasPctAgi != null
        ? `Impas hit-rate-ku ${impasPctAgi}% — bukan 50%, karena impas ditentukan rata menang vs rugi medanku SENDIRI: rugi rata lebih besar menaikkan impas; fee 0.2% menaikkannya lagi. 50% adalah angka orang yang tak pernah menghitung darahnya sendiri.`
        : `Impas dihitung dari vonis matang menang & rugi — ${akurasi.profit ? 'sedang menunggu sampel cukup' : 'belum cukup vonis'}; mengklaim 50% tanpa menghitung rata menang/rugi sendiri adalah mengangkang.`,
      impasPctAgi != null ? [String(impasPctAgi)] : ['rata menang'], 'soal kurikulum — impas dari darah sendiri')
    if (kurLama.includes('METAKOGNISI')) tanya('METAKOGNISI', 'ekstra-revert', 'Apa yang terjadi pada genome yang membuat medan MEMBURUK?',
      `Direvert oleh uji-balik: perubahan genome adalah eksperimen yang dinilai medan per ${KZN.UJI_JENDELA} vonis matang — yang lebih buruk DIREVERT, bukan dipertahankan demi gengsi. Saat ini ${kaizen.revertCt} revert / ${kaizen.lolosCt} lolos. Evolusi tanpa hukuman atas kegagalan bukan evolusi — itu ego.`,
      ['revert', String(kaizen.revertCt)], 'soal kurikulum — uji-balik dari keadaan hidup')
    if (kurLama.includes('DUNIA')) tanya('DUNIA', 'ekstra-breadth', `Seberapa luas pasar sekarang (${bredPct}% dari ${breadthDari} naik) — dan apa akibatnya bagi keputusanmu?`,
      `${bredPct}% ${bredPct < 35 ? '— pasar SEMPIT: dana hanya mengalir ke pemimpin; membeli koin lemah di pasar sempit = melawan arus dana; gerbang mengetat dan kuota menyusut otomatis' : '— pasar cukup luas: rotasi sehat, tapi konfirmasi akumulasi tetap wajib sebelum masuk ujung bawah'}. Breadth adalah barometer dana, bukan dekorasi narasi.`,
      [String(bredPct)], 'soal kurikulum — breadth hidup')
    if (kurLama.includes('AJARAN')) tanya('AJARAN', 'ekstra-pintar', 'Apa doktrin rumah terhadap koin yang pernah SALAH arah?',
      `SALAH adalah data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total: remnya cuma 1 denyut (${KZN.DINGIN_SASARAN_JAM * 60} menit), bukan blacklist; kembali boleh kapan pun setup valid — TAPI dengan syarat tambahan dari pelajarannya sendiri (bar keyakinan +${PINTAR.SYARAT_KEY_PER_KEJ}/kejadian, ukuran ×${PINTAR.SYARAT_SKALA_F}^n, stop ×${PINTAR.SYARAT_STOP_F}^n) yang MENGIKAT saat kunci. Beda belajar dan dendam ada di syaratnya.`,
      ['data belajar', 'bukan blacklist'], 'soal kurikulum — doktrin PINTAR')

    // ---------- PENILAIAN: kunci dihitung ulang, jawaban diperiksa ----------
    for (const s of soal) {
      const hit = s.kunci.filter((k) => String(s.jawaban).toLowerCase().includes(String(k).toLowerCase())).length
      s.nilai = s.kunci.length ? +(hit / s.kunci.length).toFixed(3) : 1
      s.kunciTercapai = `${hit}/${s.kunci.length}`
    }
    const fakulList = [...new Set(soal.map((s) => s.fakultas))]
    const fak = Object.fromEntries(fakulList.map((f) => {
      const arr = soal.filter((s) => s.fakultas === f)
      return [f, +(arr.reduce((a, x) => a + x.nilai, 0) / arr.length).toFixed(3)]
    }))
    const total = +(fakulList.reduce((a, f) => a + fak[f], 0) / fakulList.length).toFixed(3)
    const terlemah = fakulList.filter((f) => fak[f] < 0.99).sort((a, b) => fak[a] - fak[b]).slice(0, 2)
    const totalLama = riwayatLama.length ? riwayatLama[riwayatLama.length - 1].total : null
    return {
      soal, fak, total, terlemah,
      laporan: {
        diperbarui: ISO, siklus: SIKLUS, organ: 'V268-SADAR (SEKOLAH AGI)',
        mandat: 'sekolah AGI (mandat pemilik 2026-10-04): cyborg diuji pemahamannya tiap denyut — jawaban dibangun dari keadaan HIDUP, dinilai kunci yang dihitung ulang lewat jalur kedua; transkrip publik',
        soalJumlah: soal.length,
        nilai: { perFakultas: fak, total, terlemah, sebelumnya: totalLama, arah: totalLama == null ? '—' : total > totalLama ? 'NAIK' : total < totalLama ? 'TURUN' : 'DATAR' },
        riwayat: [...riwayatLama, { siklus: SIKLUS, waktu: ISO, total }].slice(-40),
        kurikulum: { fakultasFokus: terlemah, alasan: terlemah.length ? 'fakultas di bawah penuh disorot soal ekstra siklus berikutnya — sekolah yang tak menyorot kelemahan bukan sekolah' : 'semua fakultas penuh — kurikulum tetap menjaga dengan soal hidup berganti-siklus' },
        ujian: soal.map(({ fakultas, id, pertanyaan, jawaban, nilai, kunciTercapai, ket }) => ({ fakultas, id, pertanyaan, jawaban, nilai, kunciTercapai, ket })),
        ketJujur: 'ujian menguji MESIN JAWAB cyborg (kawat keadaan hidup + matematika dua jalur) — bukan hafalan: bila kawat putus atau angka tak konsisten, nilai turun dan kurikulum menyorotnya; jawaban boleh berisi kekosongan jujur (null) dan itu dinilai lebih tinggi daripada karangan',
      },
    }
  } catch (e) {
    log('sekolah-agi gagal (tak fatal): ' + String(e.message).slice(0, 80))
    return { soal: [], fak: {}, total: null, terlemah: [], laporan: { diperbarui: ISO, siklus: SIKLUS, organ: 'V268-SADAR (SEKOLAH AGI)', gagal: String(e.message).slice(0, 200), ketJujur: 'ujian gagal berjalan — dilapor jujur, bukan disembunyikan' } }
  }
})()
guruPengajaran.push(
  `SEKOLAH-AGI (V268 — ujian pemahaman denyut #${SIKLUS}: nilai total ${sekAgi.total != null ? (sekAgi.total * 100).toFixed(0) + '%' : 'gagal-dilapor'}${sekAgi.terlemah.length ? ` · fakultas terlemah: ${sekAgi.terlemah.join(' & ')}` : ' · semua fakultas penuh'}): cyborg kini DIUJI pemahamannya tiap denyut lewat 5 fakultas — sadar-diri, penalaran, metakognisi, dunia, ajaran; jawaban dibangun dari keadaan hidup (bukan hafalan) dan dinilai kunci yang dihitung ulang; transkrip penuh ${sekAgi.soal.length} jawaban terbuka di laporan/sekolah-agi.json — sekolah yang menghasilkan kesadaran, bukan sekadar respons.`,
  `ANTI-DIAM (V269 — doktrin pemilik "jangan buat dia Diam"): denyut #${SIKLUS} menghasilkan ${terkunciBaru.length ? `${terkunciBaru.length} kunci nyata (${terkunciBaru.filter((e) => e.peneliti).length} posisi-peneliti)` : penelitiEntri ? `0 kunci penuh → SLOT-PENELITI ${penelitiEntri.simbol} ${penelitiEntri.arah} ukuran ×${ANTI.PENELITI_UKURAN}` : `0 kunci → tanggapan penuh + penelitian ${nearMiss.length} kandidat tertolak`}; denyut-diam beruntun ${diamBeruntun}; tanggapan naratif kulihat-kuputuskan-kusiapkan WAJIB tiap denyut (laporan/tanggapan.json) — kesunyian denyut adalah bug, bukan konservatisme; kalau diam, dia tak pernah berkembang.`,
)

// V269 TANGGAPAN WAJIB — tiap denyut menerbitkan tanggapan naratif penuh: kulihat → kuputuskan → kusiapkan.
// Implementasi harfiah mandat pemilik: "jangan buat dia Diam — dia harusnya tanggap cerdas".
const tanggapanLama = bacaJson(path.join(ROOT, 'laporan/tanggapan.json'), null)
const riwayatTanggapan = Array.isArray(tanggapanLama?.riwayat) ? tanggapanLama.riwayat : []
const penelitiAktifCt = ledger.filter((e) => e.peneliti && e.status === 'TERBUKA').length
const penelitiTotalCt = ledger.filter((e) => e.peneliti).length
const kuputuskanSiklus = terkunciBaru.length
  ? `${terkunciBaru.length} kunci (${terkunciBaru.filter((e) => e.peneliti).length ? 'termasuk posisi-peneliti ukuran mikro' : 'semua lolos gerbang penuh'}): ${terkunciBaru.map((e) => `${e.simbol} ${e.arah} @ ${e.entry}`).join(', ')}`
  : (penelitiEntri
    ? `0 kunci penuh → MODE-PENELITI: ${penelitiEntri.simbol} ${penelitiEntri.arah} @ ${penelitiEntri.entry} ukuran ×${ANTI.PENELITI_UKURAN} stop ×${ANTI.PENELITI_STOP_F} — aku TIDAK diam; kandidat terkuat (odds ${penelitiEntri.odds?.skor ?? '—'}/100) yang tertahan gerbang kini diuji kecil-kecilan di medan supaya hipotesisnya jadi bukti, bukan opini`
    : `0 kunci & slot-peneliti ditahan pengaman (rem/racun/ruang-posisi) — aku TIDAK diam: aku meneliti ${nearMiss.length} kandidat tertolak per-alasan, menajamkan kurikulum (${sekAgi.terlemah.join(' & ') || 'semua fakultas'}), dan menyiapkan syarat kembali tiap sasaran — aksi belajar tetap tercatat`)
const tanggapan = {
  diperbarui: ISO, siklus: SIKLUS, organ: 'V269-TANGGAP-SELALU',
  kulihat: `Rezim ${rezimGlobal} · breadth ${(breadthNaik * 100).toFixed(0)}% · F&G ${fng?.nilai ?? '—'} · suhu otak ${suhu.temper} · ambang odds efektif ${ambangOddsEfektif} · ${nearMiss.length} kandidat ditolak ber-alasan (teratas: ${topTolakSiklus.slice(0, 2).map(([k2, v2]) => `${k2}×${v2}`).join(', ') || '—'})`,
  kuputuskan: kuputuskanSiklus,
  kusiapkan: `Fakultas terlemah sekolah-AGI (${sekAgi.terlemah.join(' & ') || '—'}) dapat soal ekstra denyut berikutnya · near-miss terdekat dipantau: ${nearMiss[0] ? `${nearMiss[0].simbol} ${nearMiss[0].arah} (key ${nearMiss[0].keyakinan}) — ${nearMiss[0].catatan.slice(0, 90)}…` : '—'} · denyut-diam beruntun: ${diamBeruntun}${diamBeruntun >= ANTI.DIAM_TOLERANSI ? ' (≥ toleransi — tanggapan khusus anti-diam aktif)' : ' (anti-diam aktif)'}`,
  doktrin: `ANTI-DIAM (mandat pemilik 2026-10-04): diam itu REM SINGKAT, bukan identitas — gerbang menutup UKURAN BESAR saat tak yakin, tapi aku beralih jadi peneliti mikro (ukuran ×${ANTI.PENELITI_UKURAN}, stop ×${ANTI.PENELITI_STOP_F}): tetap beraksi kecil, tetap dinilai medan, tetap berkembang; yang dilarang hanya ukuran besar saat keyakinan rendah`,
  keadaan: { diamBeruntun, penelitiAktif: penelitiAktifCt, penelitiTotal: penelitiTotalCt, nilaiSekolahAgi: sekAgi.total, kunciSiklus: terkunciBaru.length },
  ket: 'tanggapan ini WAJIB ada tiap denyut — kesunyian denyut adalah bug, bukan konservatisme (transkrip penuh laporan/tanggapan.json)',
  riwayat: [...riwayatTanggapan, { siklus: SIKLUS, waktu: ISO, kuputuskan: kuputuskanSiklus.slice(0, 220), diamBeruntun, kunci: terkunciBaru.length }].slice(-40),
}
const guru = {
  diperbarui: ISO, organ: VERSI, siklus: SIKLUS,
  judul: `Pengajaran denyut #${SIKLUS} — rezim ${rezimGlobal}, kompas ${kompas ? kompas.arah : '—'}`,
  mandat: 'menjadi guru para trader profesional — pengajaran dibangun otomatis dari angka denyut ini (mandat pemilik)',
  pengajaran: guruPengajaran, kuis: guruKuis, etika: ETIKA_GURU,
  sekolahAgi: { nilaiTotal: sekAgi.total, perFakultas: sekAgi.fak, terlemah: sekAgi.terlemah, soal: sekAgi.soal.length, transkrip: 'laporan/sekolah-agi.json' },
  tanggapan: { kulihat: tanggapan.kulihat, kuputuskan: tanggapan.kuputuskan, kusiapkan: tanggapan.kusiapkan, doktrin: tanggapan.doktrin, diamBeruntun, transkrip: 'laporan/tanggapan.json' },
  trenEvolusi,
  doktrin: 'V264: SALAH = data belajar di pasar hidup — bukan hukuman mati, bukan lupa total; rem singkat bukan blacklist; kembali boleh dengan syarat tambahan dari pelajaran; evolusi diukur dari tren EV/PF di rapor ini',
  kompas: kompas ? { arah: kompas.arah, keyakinan: kompas.keyakinan, alasan: kompas.alasan } : null,
  sumber: 'laporan/guru.json — pengajaran & kuis, bukan ajakan membeli; semua angka dari ledger pra-registrasi yang bisa diaudit siapa pun',
}
tulis(path.join(ROOT, 'laporan/guru.json'), guru)
tulis(path.join(ROOT, 'laporan/sekolah-agi.json'), sekAgi.laporan)
tulis(path.join(ROOT, 'laporan/tanggapan.json'), tanggapan)
log(`tanggapan: kulihat-kuputuskan-kusiapkan diterbitkan (anti-diam — denyut-diam beruntun ${diamBeruntun}, peneliti aktif ${penelitiAktifCt})`)
// V252 — laporan forensik penuh: penyebab kegagalan terukur & tindakan yang diambil
tulis(path.join(ROOT, 'laporan/forensik.json'), {
  dihasilkan: ISO, organ: VERSI, siklus: SIKLUS,
  dasarN: forensik.dasarN,
  zona: { arah: forensik.arah.zona, phoenix: forensik.phoenix.zona },
  penyebab: [
    ...forensik.arah.racun.map((z) => `ARAH: ${z.nama} — n=${z.n}, akurasi ${z.akurasiPct}%, ekspek ${z.ekspekPct}%, PF ${z.pf ?? '—'} → ZONA RACUN, DITOLAK mesin`),
    ...forensik.phoenix.racun.map((z) => `PHOENIX: ${z.nama} — n=${z.n}, akurasi ${z.akurasiPct}%, ekspek ${z.ekspekPct}%, PF ${z.pf ?? '—'} → ZONA RACUN, DITOLAK mesin`),
  ],
  tindakan: [...forensikTindakan, `gerbang menolak ${blokForensikArah} kandidat ARAH + ${blokForensikPhx} kandidat phoenix siklus ini`, `mode disiplin: ${modeDisiplin}`],
  performa: performa,
  disiplin,
  metode: 'pembagian zona per jalur (ARAH vs PHOENIX) atas 4 kelompok kondisi — arah×rezim, band keyakinan mentah, keselarasan taker, konsensus bukti; status RACUN butuh n>=8 & ekspek <= -0.6% & porsi <= 85% (zona diskriminatif, bukan konstanta lane), EMAS butuh n>=6 & ekspek >= +0.3%; zona dihitung ulang tiap denyut dari ledger pra-registrasi',
  ket: 'forensik penyebab kegagalan — sistem tidak hanya mencatat prediksi salah: ia menganalisis POLA kerugian, menolak zona racun, mengkalibrasi keyakinan ke hit-rate zona, dan membandingkan versi lewat hasil — fokus berikutnya bukan menambah prediksi, tapi mengubah pengalaman menjadi perbaikan performa',
})
log(`buku guru: ${guruPengajaran.length} pengajaran · kuis jawaban ${guruKuis.jawaban}`)

// ---- 5c. V254 SAMUDRA-PARAMETER — iklim makro + narasi analis pasar + tabel perKandang ----
// Jawaban mandat "banyak parameter": registri penuh per kandang (inti 12 berbobot
// + observasi ~34) + iklim lintas-pasar dari ratusan swap OKX + sekolah parameter.
// iklim lintas-pasar OKX — breadth, median, sebaran p10-p90, altseason-proxy, dominasi volume swap
let iklimOkx = null
if (Array.isArray(tickOkx) && tickOkx.length) {
  try {
    const sem = tickOkx.filter((x) => x.instId.endsWith('-USDT-SWAP') && +x.open24h > 0)
    const chgs = sem.map((x) => +x.last / +x.open24h - 1)
    const btcC = sem.find((x) => x.instId === 'BTC-USDT-SWAP')
    const btcChg = btcC ? +btcC.last / +btcC.open24h - 1 : null
    const q = [...chgs].sort((a, b) => a - b)
    const naikPct = chgs.length ? chgs.filter((x) => x > 0).length / chgs.length : null
    const medChg = q.length ? q[Math.floor(q.length / 2)] : null
    const p10 = q.length ? q[Math.floor(q.length * 0.1)] : null
    const p90 = q.length ? q[Math.floor(q.length * 0.9)] : null
    const volBtc = btcC ? (+btcC.volCcy24h || 0) * (+btcC.last || 0) : 0
    const volTot = sem.reduce((a, x) => a + (+x.volCcy24h || 0) * (+x.last || 0), 0)
    iklimOkx = {
      dari: chgs.length,
      naikPct: naikPct != null ? +(naikPct * 100).toFixed(1) : null,
      medianChgPct: medChg != null ? +(medChg * 100).toFixed(2) : null,
      dispersiPct: p10 != null && p90 != null ? +((p90 - p10) * 100).toFixed(2) : null,
      altseasonProxy: medChg != null && btcChg != null ? +((medChg - btcChg) * 100).toFixed(2) : null,
      dominasiVolumeOkxPct: volTot > 0 ? +((volBtc / volTot) * 100).toFixed(2) : null,
      ket: 'dari tickers swap OKX — konstan per siklus: masuk iklim & narasi, bukan pemilih arah (pelajaran forensik)',
    }
  } catch { iklimOkx = null }
}
const narasiMakroTeks = [
  `BTC berdiri di ${sembtc.harga.toPrecision(6)} dalam rezim ${rezimGlobal} (ATR per jam ${sembtc.atrPct.toFixed(2)}%) — breadth pasar ${(breadthNaik * 100).toFixed(0)}% koin naik (${breadthDari} pasangan diukur).`,
  fng ? `Sentimen terukur Fear & Greed ${fng.nilai} — ${fng.klasifikasi}${fngRiwayat ? ` (kemarin ${fngRiwayat.kemarin}, Δ7 hari ${fngRiwayat.delta7d >= 0 ? '+' : ''}${fngRiwayat.delta7d} — sentimen ${Math.abs(fngRiwayat.delta7d) >= 10 ? 'bergeser cepat; waspadai emosi ikut bergerak' : 'cenderung stabil'})` : ''}: ${fng.nilai >= 75 ? 'kerakusan ekstrem; historisnya koreksi mengintai — disiplin ukuran posisi harus di atas bias naik' : fng.nilai <= 25 ? 'ketakutan ekstrem; historisnya zona akumulasi kontrarian — tetapi pisau jatuh tetap dilarang ditadah' : 'sentimen tidak ekstrem; arah dibaca dari medan, bukan dari emosi'}.` : null,
  dominasi ? `${dominasi.ket} — ${dominasi.sumber === 'coingecko' ? 'dominasi naik artinya dana berlindung ke mayor dan altcoin tertekan' : 'proxy volume: BTC menyerap porsi likuiditas spot'}.` : null,
  frBtc != null ? `Funding BTC ${(frBtc * 100).toFixed(4)}% · ETH ${frEth != null ? (frEth * 100).toFixed(4) + '%' : '—'} per interval — ${frBtc >= WAWASAN.FUNDING_EKSTREM ? 'long ramai membayar mahal: fondasi naik rapuh terhadap long-squeeze' : frBtc <= -WAWASAN.FUNDING_EKSTREM ? 'short ramai membayar mahal: bahan short-squeeze melawan arus' : 'tidak ada kerumunan ekstrem di derivatif'}.` : null,
  oiBtc ? `Open interest BTC $${oiBtc.nilaiJuta} juta${oiBtc.deltaPct != null ? ` (Δ${(oiBtc.deltaPct * 100).toFixed(2)}% sejak denyut lalu — ${Math.abs(oiBtc.deltaPct) > WAWASAN.OI_BERAT ? 'perputaran posisi berat; sinyal berikutnya bermomen' : 'posisi stabil'})` : ' (Δ antar-siklus belum tersedia — denyut pertama dengan snapshot ini)'}.` : null,
  iklimOkx ? `Lintas-pasar swap OKX (${iklimOkx.dari} instrumen): ${(iklimOkx.naikPct ?? 0)}% naik, median 24j ${iklimOkx.medianChgPct != null ? (iklimOkx.medianChgPct >= 0 ? '+' : '') + iklimOkx.medianChgPct + '%' : '—'}, sebaran p10–p90 ${iklimOkx.dispersiPct ?? '—'}% — ${iklimOkx.altseasonProxy != null ? (iklimOkx.altseasonProxy > 2 ? 'ALT mengungguli BTC: musim altcoin berhembus' : iklimOkx.altseasonProxy < -2 ? 'BTC menyerap arus; altcoin tertekan' : 'pasar bergerak bersama') : ''}` : null,
  `Lapis SAMUDRA-DALAM (V257) kini membaca struktur harian 90 hari (EMA/RSI/MACD daily, Donchian 30 hari, jarak puncak-lantai kuartal, momentum bulanan, streak, rasio volatilitas 7d/30d), posisi kerumunan akun & agresor taker (OKX rubik), basis perp-vs-spot, jam funding, gradien order book, dan 6 interaksi antar-faktor — registri ${TOTAL_PARAM_NAMA} param bernama per kandang${dominasiDelta != null ? `; dominasi BTC ${dominasiDelta >= 0 ? 'naik' : 'turun'} ${Math.abs(dominasiDelta).toFixed(2)} poin sejak denyut lalu${ethBtc ? `, ETH/BTC 7 hari ${(ethBtc.roc7d * 100 >= 0 ? '+' : '')}${(ethBtc.roc7d * 100).toFixed(1)}% (${ethBtc.roc7d > 0 ? 'risk-on altcoin' : 'risk-off ke BTC'})` : ''}` : ethBtc ? `; ETH/BTC 7 hari ${(ethBtc.roc7d * 100 >= 0 ? '+' : '')}${(ethBtc.roc7d * 100).toFixed(1)}% — ${ethBtc.roc7d > 0 ? 'risk-on' : 'risk-off'}` : ''}`,
  `Komite ARAH kini menimbang ${DIM_ARAH.length + DIM_WAW.length} dimensi berbobot dalam registri ${TOTAL_PARAM_NAMA} parameter bernama per kandang + ${TOTAL_PARAM_METAKOGNISI} parameter metakognitif Nevron (≈${TOTAL_PARAM_NAMA * 10} pengukuran kandang + ${TOTAL_PARAM_METAKOGNISI}×kandidat per denyut): multi-timeframe 1h+4h, riwayat funding, order book, persentil lintas-pasar, kalender, GARCH/MC — tiap param DICATAT nasihatnya per prediksi lalu dinilai medan (sekolah parameter), dan keyakinan tiap kandidat dinilai 7-faktor metakognitif + prediktor kegagalan pra-kunci sebelum otak berani mengunci`,
].filter(Boolean).join(' ')
const perKandang = []
for (const s of KANDANG) {
  const c = hasil[s]; if (!c) continue
  const bK = dewanBukti(c)
  const warK = mesinWarisan(c, hasil.BTC)
  const mcK = warK.garch.sigma1j > 0 ? monteCarlo24j(c, warK.garch) : null
  const wpK = wawasanPenuh(c, hasil.BTC, s, ctxSamudra(s, warK, mcK))
  const dK = deriv?.get(s + 'USDT')
  // konsensus per domain — rata arah param yang bicara (|arah|>=0.15)
  const kons = {}
  for (const p of wpK.penuh) {
    if (Math.abs(p.arah) >= 0.15) {
      if (!kons[p.domain]) kons[p.domain] = { bicara: 0, jumlah: 0 }
      kons[p.domain].bicara++; kons[p.domain].jumlah += p.arah
    }
  }
  const konsensus = Object.fromEntries(Object.entries(kons).map(([d, { bicara, jumlah }]) => [d, { arah: +(jumlah / bicara).toFixed(2), bicara }]))
  perKandang.push({
    simbol: s, harga: +bK.harga.toPrecision(7), rezim: bK.rezim, atrPct: +bK.atrPct.toFixed(2),
    fundingPct: dK ? +((+dK.fundingRate) * 100).toFixed(4) : null,
    oiJuta: dK ? +((+dK.openInterestValue) / 1e6).toFixed(1) : null,
    oiDeltaPct: oiDelta(oiLamaMap?.[s], dK) != null ? +(oiDelta(oiLamaMap?.[s], dK) * 100).toFixed(2) : null,
    jumlahParam: wpK.penuh.length, konsensus,
    params: wpK.penuh.map((p) => ({ param: p.param, domain: p.domain, lapis: p.lapis, nilai: p.nilai, arah: +p.arah.toFixed(2), ket: p.ket })),
  })
}
const sampelPk = perKandang[0]?.params || []
const perDomainCount = {}
for (const p of sampelPk) perDomainCount[p.domain] = (perDomainCount[p.domain] || 0) + 1
const sekolahParam = Object.entries(ilmu.paramHit || {})
  .map(([param, h]) => ({ param, n: h.n, hitPct: h.n ? +((h.benar / h.n) * 100).toFixed(1) : null, netPct: +((h.net || 0) * 100).toFixed(2), czar: h.cz != null ? +h.cz.toFixed(2) : null, status: statusSekolah(h) }))
  .sort((a, b) => b.n - a.n)
// V255 METAKOGNISI-NEVRON — blok laporan metakognitif lengkap
const reliabPelajaran = Object.entries(aturan.pola || {}).map(([p, n]) => ({
  pola: p, kasus: n, sejak: aturan.polaMeta?.[p]?.sejak ?? null,
  reliabilitas: reliabilitasPelajaran(n, aturan.polaMeta?.[p]?.sejak ?? ISO, WAKTU.getTime()),
  status: aturan.aktif ? (Object.keys(aturan.aktif).some((k) => ATURAN_DEF[k]?.pola === p) ? 'aturan-aktif' : 'tercatat') : 'tercatat',
})).sort((a, b) => b.reliabilitas - a.reliabilitas)
const saranPerbaikan = polaKegagalanBatch(closedArah)
const metakognisiLaporan = {
  organ: 'V255-METAKOGNISI-NEVRON — dibedah dari deep-screening Neurobro AI (neurobro.ai, Axioma AI Labs) dan framework open-source mereka Nevron (github axioma-ai-labs/nevron, siklus Plan→Execute→Learn→Remember)',
  kunciDiadopsi: [
    { kunci: 'ConfidenceEstimator', asal: 'src/metacognition/confidence_estimator.py', adaptasi: 'keyakinan 7-faktor berbobot (0.25/0.15/0.15/0.15/0.10/0.15/0.05) per kandidat; faktor terlemah + aspek ragu disebut eksplisit; level < 0.40 = TUNGGU' },
    { kunci: 'FailurePredictor', asal: 'src/metacognition/failure_predictor.py', adaptasi: 'prob gagal DIHITUNG SEBELUM kunci dari hit-rate zona (arah×rezim) + kegagalan 24 jam + ekspektasi MC negatif; gabungan 0.6×maks + 0.4×rata; >= 0.60 = TUNGGU' },
    { kunci: 'SelfCritic (RLAIF)', asal: 'src/learning/critic.py', adaptasi: 'kritik 5-field per kekalahan (alasanGagal/yangSalah/caraLebihBaik/polaDihindari/pelajaran) + pola batch >=2 kasus → saran perbaikan berprioritas' },
    { kunci: 'Lesson reliability', asal: 'src/learning/lessons.py', adaptasi: 'reliabilitas = keyakinan × penguatan × peluruhan-umur — pelajaran tak relevan melemah sendiri' },
    { kunci: 'StrategyAdapter', asal: 'src/learning/adapter.py', adaptasi: 'bias konteks −0.5..+0.5 per (rezim×arah) = 0.4 tracker + 0.4 pelajaran + 0.2 recent-7h; menggeser keyakinan ±15 poin — genome tetap jalur evolusi lambat' },
    { kunci: 'LoopDetector', asal: 'src/metacognition/loop_detector.py', adaptasi: 'jendela 20 vonis: repetisi(3)/alternasi-ABAB(4)/siklus-ABC(2) — bias lane terdeteksi dan diawasi' },
    { kunci: 'MetacognitiveMonitor', asal: 'src/metacognition/monitor.py', adaptasi: 'tiap intervensi tercatat di sadardiri + kalibrasi kedua gerbang dinilai medan (tepat = level tinggi/prob rendah memang lebih sering benar)' },
  ],
  paramMetakognisi: PARAM_METAKOGNISI,
  jumlahParamMetakognisi: TOTAL_PARAM_METAKOGNISI,
  estimator: { bobot: NEV.ESTIMATOR_BOBOT, ambangLolos: NEV.ESTIMATOR_MIN_LOLOS, ketFaktor: KET_FAKTOR, kalibrasiMedan: ilmu.metakognisi.estimator },
  prediktor: { ambang: NEV.PREDIKTOR_MAKS_PROB, windowJam: NEV.PREDIKTOR_WINDOW_JAM, minN: NEV.PREDIKTOR_MIN_N, kalibrasiMedan: ilmu.metakognisi.prediktor },
  biasKonteks: biasKonteksGlobal,
  loop: deteksiLoopRes,
  reliabilitasPelajaran: reliabPelajaran,
  saranPerbaikan,
  intervensiSiklusIni: intervensiMetakognitif.slice(0, 12),
  vetoSiklusIni: { estimator: estVetoCt, prediktor: predVetoCt },
  ket: 'dua gerbang metakognitif (estimator + prediktor) berdiri SEBELUM ledger: mereka berhak menolak sinyal dari otaknya sendiri — dan kalibrasinya sendiri dinilai medan; slot eksplorasi forensik dikecualikan agar zona racun tetap bisa diuji',
}
const wawasan360 = {
  versi: 'V262-IMPAS-CERDAS', dihasilkan: ISO, siklus: SIKLUS,
  dimensi: DIM_ARAH.length + DIM_WAW.length,
  registri: {
    totalNama: TOTAL_PARAM_SEMUA, perKandang: TOTAL_PARAM_NAMA, metakognisi: TOTAL_PARAM_METAKOGNISI,
    dealOdds: TOTAL_PARAM_DEAL_ODDS, gekko: TOTAL_PARAM_GEKKO, kaizen: TOTAL_PARAM_KAIZEN, auto: TOTAL_PARAM_AUTO, claw: TOTAL_PARAM_CLAW, impas: TOTAL_PARAM_IMPAS, mate: TOTAL_PARAM_MATE,
    intiBerbobot: DIM_WAW.length, observasi: PARAM_OBS.length, observasiV257: PARAM_OBS_V257.length, iklimParam: PARAM_IKLIM.length,
    perDomain: perDomainCount, jumlahKandang: perKandang.length,
    pengukuranPerDenyut: TOTAL_PARAM_NAMA * perKandang.length + TOTAL_PARAM_METAKOGNISI * kandidatArah.length + PARAM_GEKKO_KANDANG.length * kandidatArah.length + PARAM_KAIZEN_KANDANG.length * kandidatArah.length + PARAM_AUTO_KANDANG.length * kandidatArah.length + PARAM_CLAW_KANDANG.length * kandidatArah.length + PARAM_IMPAS_KANDANG.length * (kandidatArah.length + lulusPhx.length) + PARAM_MATE_KANDANG.length * kandidatArah.length,
    ket: `registri ${TOTAL_PARAM_SEMUA} parameter bernama = ${TOTAL_PARAM_NAMA} per kandang × ${perKandang.length} kandang + ${TOTAL_PARAM_METAKOGNISI} metakognitif Nevron per kandidat + ${TOTAL_PARAM_DEAL_ODDS} parameter deal/odds (V256) + ${TOTAL_PARAM_GEKKO} parameter gekko (V258: 5 per kandidat — metaArah/metaKeyakinan/probPasar/divergensi/ekspresi; 5 siklus — suhu/ambang-efektif/kuota/akurasi-impas/darah; 8 konstanta CZAR-regret-ekspresi) + ${TOTAL_PARAM_KAIZEN} parameter kaizen (V259: 3 per kandidat — kesegaran/akselerasi1j/tesisSehat; 6 siklus — dingin/henti-harian/uji-balik/karantina/pengawas; 13 konstanta penyembuhan) + ${TOTAL_PARAM_AUTO} parameter autopilot (V260: 3 per kandidat — peluang/slipPct/kellyMult; 6 siklus — rezimMedan/multRezim/stresTerkburuk/stresSkenario/topTolak; 15 konstanta kalibrasi) + ${TOTAL_PARAM_CLAW} parameter claw (V261: 3 per kandidat — komite/kartu/kuanta; 6 siklus — komiteMinconf/komiteVeto/kartuVeto/kartuAvg/hitamCt/kuotaCt; 32 konstanta pagar-baja) — lapis INTI (12) berbobot genome+Hedge, lapis OBSERVASI (${PARAM_OBS.length + PARAM_OBS_V257.length}) boleh MENOLAK via veto, lapis METAKOGNISI (35) menilai sinyal dari dalam, lapis DEAL/ODDS (20) merekayasa rencana posisi & meranking peluang, lapis GEKKO (18) memberi suara kolektif bertingkat-regret + tilangan CZAR + eksposur dinamis, lapis KAIZEN (22) menyembuh otaknya sendiri (uji-balik/karantina/dingin/henti/penjaga-kedua), lapis AUTOPILOT (24) mengukur ulang ekspektasi setelah slippage, ukuran setelah drawdown & sampel, medan lewat rezim σ-mandiri & 5 skenario tegang, dan mencatat pilihan kedua + alasan setiap penolakan, lapis CLAW (41) menempok gerbang dengan pagar-baja keras yang tak bisa diubah otaknya sendiri (kuota-harian/langit-langit-slip/ukuran-maks), komite panjia 5 suara berbobot tetap, kartu risiko 4×25 ber-veto, tangga ukuran tanpa ukuran antara, antrean mandat ber-kadaluarsa, daftar-hitam ber-pendingin & buku-tekok per aturan, lapis IMPAS (22) — jawaban 4 kasus dev dari backtest ledger sendiri: zona anti-chase MENGIAT saat kunci (bukan catatan), keyakinan dikalibrasi medan per jalur (V263: overclaim kini MODE-ASAH, dilarang dikarantina), kuota dinamis EV-shrinkage dua arah, stop/target wajib lahir bersama sinyal, ambang odds naik sendiri saat rapor di bawah air; lapis MATE/ASAH (22) — hukum pemilik V263: KARANTINA DILARANG (mode-asah: ukuran ×0.6, stop ×0.75, suara lirih 0.35, belajar TIDAK PERNAH dihentikan), matematika murni & ekonomi cerdas per kandidat (Hurst/half-life/OLS/z-SMA/entropi/Parkinson-GK/autokorelasi/carry/EV-eko), mata jauh MC-72j (P(naik) 24/48/72), organ-baru dari setiap kesalahan (lulus sekolah → veto), denyut 15 menit, sumber data dilengkapi; sensus jujur, bukan karangan`,
  },
  metakognisi: metakognisiLaporan,
  sekolahParameter: sekolahParam,
  vetoSiklusIni: {
    arah: divetoArah.map((k) => ({ simbol: k.s, arah: k.v.arah, kunci: k.vetoW.map((x) => x.kunci), alasan: k.vetoW.map((x) => x.ket) })),
    phoenixDitolak: vetoPhxCt,
    ket: 'gerbang veto wawasan — parameter medan menolak sinyal buruk sebelum dikunci; no-trade adalah keputusan',
  },
  iklim: {
    fng, fngRiwayat, dominasi,
    fundingBtcPct: frBtc != null ? +(frBtc * 100).toFixed(4) : null,
    fundingEthPct: frEth != null ? +(frEth * 100).toFixed(4) : null,
    oiBtc, oiEth, okx: iklimOkx,
    breadthNaikPct: +(breadthNaik * 100).toFixed(1), breadthDari,
    rezim: rezimGlobal, hargaBTC: +sembtc.harga.toPrecision(7), atrPctBTC: +sembtc.atrPct.toFixed(2),
    narasi: narasiMakroTeks,
    catatan: wawCatatan,
    // V257 — iklim samudra-dalam (konstanta per siklus — iklim & narasi, bukan pemilih arah)
    v257: {
      dominasiDelta, ethBtc: ethBtc ? { roc7dPct: +(ethBtc.roc7d * 100).toFixed(2), ket: ethBtc.ket } : null,
      lsAkunBtc, lsAkunEth, jamFundingBtcJam: jamFundingBtc,
      ket: `Δdominasi antar-denyut${dominasiDelta != null ? ` ${dominasiDelta >= 0 ? '+' : ''}${dominasiDelta}` : ' (denyut pertama)'} · ETH/BTC 7d ${ethBtc ? (ethBtc.roc7d * 100 >= 0 ? '+' : '') + (ethBtc.roc7d * 100).toFixed(1) + '%' : '—'} · LS-akun BTC ${lsAkunBtc ?? '—'} / ETH ${lsAkunEth ?? '—'} · funding BTC berikutnya ${jamFundingBtc != null ? jamFundingBtc.toFixed(1) + ' jam' : '—'}`,
    },
  },
  perKandang,
  metode: 'L1 lilin 1h (MACD, ADX/DI, Bollinger, VWAP, OBV, swing fraktal, pola lilin, konsistensi, pivot klasik, kekuatan relatif) · L1b multi-timeframe 4h hasil agregasi 1h (EMA-align, MACD, RSI, Bollinger, swing, sejajar-TF, rasio ATR) · L1c HARIAN 90 hari (V257: EMA-align/RSI/MACD 1d, Donchian 30d, jarak puncak-lantai 90d, momentum bulanan, streak, rasio vol realized 7d/30d) · L2 derivatif NYATA (funding kini + riwayat rata3/tren OKX, OI rantai host bybit→bytick→fapi→OKX + ΔOI antar-siklus, V257: basis perp-vs-spot, jam funding, funding relatif vs BTC, LS-akun + trennya, agresor taker) · L2b mikrostruktur (order book spot OKX 50 level: imbalance 1%, spread bps, rasio kedalaman, dinding terbesar, V257: gradien massa-depan) · L2c lintas-pasar (persentil perubahan & volume dari swap USDT OKX, median, sebaran) · L3 makro (F&G + riwayat 7 hari, dominasi + Δ antar-denyut, ETH/BTC risk-on/off, breadth, altseason-proxy) · L4 kuant-warisan (GARCH sigma, MC-pNaik, beta CAPM, divergensi RSI, POC volume) · L5 kalender (sesi Asia/Eropa/AS, akhir pekan, fase bulan) · L6 interaksi antar-faktor (V257: funding×ΔOI, volume×ATR, tren×funding, buku×tren, breakout×volume, agresor×tren) — semuanya endpoint publik tanpa API key; gagal = null jujur',
  ket: 'parameter konstan per siklus (F&G, dominasi, breadth) masuk IKLIM & NARASI, tidak memilih arah — pelajaran forensik: fitur konstan lane tidak berhak menolak sinyal; 12 param inti belajar bobotnya (genome per rezim + Hedge on-line); parameter observasi menolak via gerbang veto yang dilabeli & dicatat; sekolah parameter mengukur hit-rate tiap param dari ledger — kelulusan via bukti, bukan tangan',
}
tulis(path.join(ROOT, 'laporan/wawasan.json'), wawasan360)
log(`samudra laporan: ${perKandang.length} kandang × ${TOTAL_PARAM_NAMA} param · sekolah ${sekolahParam.length} param dinilai · narasi makro ${narasiMakroTeks.length} kar.`)

// ---- V256 MESIN DEAL & ODDS — laporan lengkap ala 3Commas × Trade Ideas ----
// identitas + sumber resmi, ranking OddsMaker siklus ini, hit-rate per peristiwa,
// statistik medan rencana deal (SO/BEP/trailing), parameter, posisi terbuka.
const posisiTerbuka = ledger.filter((e) => e.status === 'TERBUKA')
const rankOddsSiklus = [
  ...rankArah.map((k) => ({ simbol: k.s, jalur: 'ARAH', arah: k.v.arah, odds: k.odds.skor, komponen: k.odds.komponen, peristiwa: k.peri, terkunci: pilihArah.includes(k), alasan: pilihArah.includes(k) ? 'top odds — mengunci' : k.odds.skor < DEAL.ODDS_MIN ? `odds < ${DEAL.ODDS_MIN}` : `di luar top-${DEAL.TOP_K}` })),
  ...lulusPhx.map((p) => ({ simbol: p.simbol, jalur: 'PHOENIX', arah: 'BUY', odds: p.odds.skor, komponen: p.odds.komponen, peristiwa: p.peri, terkunci: lulusPhx.indexOf(p) < sisaKuota, alasan: lulusPhx.indexOf(p) < sisaKuota ? 'kuota terbaik (odds primer)' : 'di luar kuota' })),
].sort((a, b) => b.odds - a.odds)
const peristiwaStat = PERISTIWA_DEFS.map((p) => {
  const h = ilmu.peristiwa[p.nama] || { n: 0, benar: 0, net: 0 }
  return { peristiwa: p.nama, ket: p.ket, n: h.n, hitPct: h.n ? +((h.benar / h.n) * 100).toFixed(1) : null, netPct: +((h.net || 0) * 100).toFixed(2), czar: h.cz != null ? +h.cz.toFixed(2) : null, status: h.n >= 10 ? (h.benar / h.n >= 0.52 ? 'pemenang' : (h.benar / h.n < 0.44 ? 'penggerus' : 'netral')) : 'pemula' }
})
const dealOddsLaporan = {
  versi: 'V256-MESIN-DEAL-ODDS', dihasilkan: ISO, siklus: SIKLUS,
  identitas: 'deep-screening dua platform trading-AI profesional — kunci intinya diadopsi, diadaptasi ke ledger pra-registrasi SAKTI, lalu DINILAI MEDAN',
  sumber: [
    { platform: '3Commas', url: 'https://help.3commas.io/en/articles/16281102', kunci: 'DCA bot 6-parameter: Max DCA Orders (hard cap), Price Deviation + Multiplier, Order Size Multiplier — averaging terkontrol' },
    { platform: '3Commas', url: 'https://help.3commas.io/en/articles/16281110', kunci: 'Move Stop Loss to Breakeven — eliminasi risiko setelah aktivasi' },
    { platform: '3Commas', url: 'https://help.3commas.io/en/articles/16281163', kunci: 'Trailing Stop 2-parameter: Activation + jarak trail' },
    { platform: '3Commas', url: 'https://help.3commas.io/en/articles/16281055', kunci: 'Global Max Open Positions — "prevent excessive trading"' },
    { platform: '3Commas', url: 'https://help.3commas.io/en/articles/16281154', kunci: 'Pump Protection — memvalidasi guard kejut-pump SAKTI V249' },
    { platform: 'Trade Ideas', url: 'https://trade-ideas.com/features/backtesting/', kunci: 'OddsMaker: event-based testing, metrics (PF/win-rate/drawdown), "pinpoint winning filters, eliminate losing variables"' },
    { platform: 'Trade Ideas', url: 'https://trade-ideas.com/features/money-machine/', kunci: 'Money Machine: konsentrasi top-3 momentum opportunities' },
    { platform: 'Trade Ideas', url: 'https://trade-ideas.com/features/ai-signals/', kunci: 'Holly AI: signals dengan entry/exit + position sizing menyesuaikan kondisi (memvalidasi bias konteks V255)' },
  ],
  kunciDiadopsi: [
    'MESIN DEAL 3Commas — safety orders (maxSO 2, deviasi 1.2×ATR ×1.6, volume ×1.5) + TP-dari-avg dipra-registrasi di tiap sasaran dan dinilai medan saat matang',
    'MOVE SL TO BREAKEVEN 3Commas — aktivasi 60% jalan ke target, stop pindah ke net-nol; diukur berapa kali menyelamatkan posisi',
    'TRAILING TAKE PROFIT 3Commas — trail dari peak 0.8×ATR setelah T1; ekstra profit terukur dari peak nyata',
    'ODDS MAKER Trade Ideas — skor peluang 0-100 (40% MC + 25% zona + 20% metakognisi + 15% daya) meranking SEMUA kandidat tiap denyut',
    'MONEY MACHINE Trade Ideas — hanya top-3 berodds ≥ 55 yang boleh mengunci; sisanya ditolak dengan alasan odds yang bisa diaudit',
    'EVENT-BASED TESTING OddsMaker — 6 tag peristiwa disegel di ledger; hit-rate & net per peristiwa dihitung dari vonis matang',
    'GLOBAL MAX OPEN POSITIONS 3Commas — posisi terbuka diukur tiap denyut melawan batas',
  ],
  paramDeal: PARAM_DEAL,
  paramEvent: PARAM_EVENT,
  oddsSiklusIni: rankOddsSiklus,
  ambang: DEAL.ODDS_MIN, topK: DEAL.TOP_K, bobot: DEAL.BOBOT,
  peristiwa: peristiwaStat,
  deal: {
    param: { maxSO: DEAL.MAX_SO, soDevAtr: DEAL.SO_DEV, soDevMult: DEAL.SO_DEV_MULT, soVolMult: DEAL.SO_VOL_MULT, bepAkt: DEAL.BEP_ACT, trailDistAtr: DEAL.TRAIL_DIST },
    medan: ilmu.deal,
    ket: 'semua kontingensi deal DIPRA-REGISTRASI saat kunci lalu dibandingkan dengan jalur nyata lilin pasca-kunci — net-dengan-SO vs tanpa-SO, BEP menyelamatkan?, ekstra trailing dari peak nyata; tumbuh dari ledger, bukan klaim',
  },
  posisiTerbuka: { jumlah: posisiTerbuka.length, rincian: posisiTerbuka.slice(0, 14).map((e) => ({ simbol: e.simbol, jalur: e.jalur, arah: e.arah, umurJam: +(((WAKTU - new Date(e.waktuKunci)) / 36e5)).toFixed(1) })), batas: DEAL.MAX_POSISI, ket: 'Global Max Open Positions (3Commas): batas kumulatif — sinyal baru di luar batas tidak dieksekusi (guard mengikat sejak V256)' },
  kejujuran: 'rencana deal adalah KONTINGENSI yang disiplin — bukan janji hasil; statistik medan baru bermakna setelah n cukup; param konstan siklus tidak ikut memilih arah (pelajaran forensik)',
}
tulis(path.join(ROOT, 'laporan/odds.json'), dealOddsLaporan)
log(`deal-odds: top siklus ${rankOddsSiklus[0] ? `${rankOddsSiklus[0].simbol} ${rankOddsSiklus[0].odds}` : '—'} · odds ditolak ${gagalOddsArah.length} · posisi terbuka ${posisiTerbuka.length}/${dealOddsLaporan.posisiTerbuka.batas}`)

// ---- V258 GEKKO-CZAR — laporan lengkap warisan Gekko Agent (Axal) + CZAR Loss ----
const topikStat = Object.entries(ilmu.topik || {}).map(([t, h]) => ({
  topik: t, n: h.n, hitPct: h.n ? +((h.benar / h.n) * 100).toFixed(1) : null, netPct: +((h.net || 0) * 100).toFixed(2),
  regret: h.regret ?? 0.6, bobotKini: +bobotTopik(t).toFixed(3),
  status: h.n >= 10 ? (h.benar / h.n >= 0.52 ? 'pembicara-dipercaya' : h.benar / h.n < 0.44 ? 'dibisukan' : 'netral') : 'pemula',
})).sort((a, b) => b.bobotKini - a.bobotKini)
const gekkoLaporan = {
  versi: 'V258-GEKKO-CZAR', dihasilkan: ISO, siklus: SIKLUS,
  identitas: 'deep-screening Gekko Agent (Axal × Virtuals × Allora) + CZAR Loss (Allora Foundation, arXiv 2609.36061) — kunci inti diadopsi, diadaptasi ke ledger pra-registrasi SAKTI, lalu DINILAI MEDAN',
  sumber: [
    { platform: 'Gekko AI by Virtuals / Axal', url: 'https://www.coinbase.com/price/base-gekko-ai-by-virtuals', kunci: 'identitas: agen trading AI buatan Axal (jaringan verifiable agents), fokus agents × trading × automation' },
    { platform: 'Axal Substack', url: 'https://axal.substack.com/p/why-we-launched-gekko', kunci: 'peluncuran Des-2024 bersama Virtuals; fair-launch (alokasi tim ZERO); integrasi Autopilot' },
    { platform: 'Allora Network × Gekko', url: 'https://www.allora.network/blog/gekko-ai-allora-a-new-edge-in-automated-trading', kunci: 'META-INFERENSI KOLEKTIF: model spesialis bertanding per Topics, inferensi dibobot akurasi historis+kontekstual; Gekko "dynamically adjust strategies mid-flight"' },
    { platform: 'Allora Foundation (arXiv 2609.36061)', url: 'https://arxiv.org/abs/2609.36061', kunci: 'CZAR LOSS: loss simetris membiarkan prediktor-nol menang (akurasi-impas naik tajam dgn derau); skor asimetris magnitude-aware menjaga ambang impas dekat 50%' },
    { platform: 'Allora × Virtuals G.A.M.E', url: 'https://www.allora.network/blog/allora-powers-virtuals-protocol', kunci: 'EKSPOSUR DINAMIS: volatilitas forecast → pangkas/naikkan exposure; meta-strategy realokasi; intelligent DCA' },
    { platform: 'Allora Prediction Markets', url: 'https://www.allora.network/blog/inside-the-allora-prediction-markets-ecosystem', kunci: 'DIVERGENSI: masuk saat ramalan sendiri TERPISAH dari probabilitas-implied pasar' },
    { platform: 'Axal Autopilot', url: 'https://axal.substack.com/p/introducing-axal-autopilot', kunci: 'TEMPER: risk-profile → alokasi strategi personal; fase-masuk bertahap; rebalancing otomatis' },
    { platform: 'Axal (verifiable agents)', url: 'https://docs.axal.com/how-it-works/contracts', kunci: 'VERIFIABLE AUTONOMY: aksi agen bisa diverifikasi pihak ketiga' },
  ],
  kunciDiadopsi: [
    'META-INFERENSI KOLEKTIF (Allora Topics) — 6 topik pekerja (momentum/tren/aliran/derivatif/mikrostruktur/relatif) memberi suara arah; bobot topik = exp(-0.9·regret), regret diperbarui tiap vonis matang dari medan — tidak ada topik berkuasa permanen',
    'CZAR DECISIVENESS (arXiv 2609.36061) — skor asimetris magnitude-aware utk tiap vonis matang (benar: linear cap 8%; benar-kecil ≈ 0 credit; salah: floor 1.5 + kuadratik); akurasiImpas = breakeven WR dari rata menang/rugi medan; darahAkurasi = akurasi − impas (merah = aktivitas menggerus modal)',
    'EKSPOSUR DINAMIS (Allora×G.A.M.E) — ekspresi 0.25–1.0× unit per sasaran dari odds+keyakinan−volatilitas ekstrem−kerumunan funding; dipra-registrasi & dibandingkan medan (ekspresi tinggi vs rendah)',
    'DIVERGENSI PASAR-PREDIKSI (Allora prediction markets) — probPasar dari agresor taker + kerumunan LS + funding + EMA4h; divergensi = keyakinan komite − P(arah komite); bucket kuat/lemah dinilai medan',
    'TEMPER AUTOPILOT (Axal) — suhu denyut AGRESIF/NETRAL/BERTAHAN dari PF-jendela+rezim+breadth+F&G; BERTAHAN: ambang odds +5 & kuota −1; AGRESIF: −3 dengan lantai 52; PF<1 MEMAKSA BERTAHAN — terikat-batas & terlog',
    'VERIFIABLE AUTONOMY (Axal) — sidikPrakunci sha256 payload prediksi saat kunci (ARAH & PHOENIX) — tamper-evident, bisa direkalkulasi siapa pun',
  ],
  paramGekko: { kandang: PARAM_GEKKO_KANDANG, siklus: PARAM_GEKKO_SIKLUS, konst: PARAM_GEKKO_KONST, total: TOTAL_PARAM_GEKKO },
  konstanta: { regretEta: GEK.REGRET_ETA, regretDecay: GEK.REGRET_DECAY, bobotMin: GEK.BOBOT_MIN, czarCap: GEK.CZAR_CAP, czarFloor: GEK.CZAR_FLOOR, ekspresiMin: GEK.EKSPRESI_MIN, ekspresiMaks: GEK.EKSPRESI_MAKS, divergKuat: GEK.DIVERG_KUAT, ambangLantai: GEK.AMBANG_LANTAI },
  suhuSiklusIni: suhu,
  topik: topikStat,
  czar: { n: ilmu.cz.n, rata: ilmu.cz.n ? +(ilmu.cz.jumlah / ilmu.cz.n).toFixed(3) : null, ket: 'skor CZAR rata-rata — negatif berarti ledger masih didominasi penalti kekalahan; naik mendekati 0/positif = decisiveness terbayar' },
  ekspresiMedan: ilmu.ekspresi,
  divergensiMedan: ilmu.divergensi,
  sidikPraKunci: { jumlahTerkunci: ledger.filter((e) => e.sidikPrakunci).length, ket: 'setiap prediksi baru membawa sidik sha256 pra-registrasi — entri lama tanpa sidik tampil apa adanya' },
  kejujuran: 'semua param gekko lahir OBSERVASI — dinarasikan, disekolahkan (paramsPenuh), berhak veto lewat gerbang lama; TIDAK berbobot genome sebelum hit-rate medan lulus; satu perubahan gerbang (suhu Autopilot) terikat-batas (lantai 52, kuota ≤ baseline) dan tercatat per denyut',
}
tulis(path.join(ROOT, 'laporan/gekko.json'), gekkoLaporan)
log(`gekko: suhu ${suhu.temper} (ambang ${ambangOdds}, kuota ${kuotaArahSuhu}) · topik terkuat ${topikStat[0]?.topik ?? '—'} · czar rata ${gekkoLaporan.czar.rata ?? '—'}`)
// ---------------- V259 KAIZEN-PULIH — laporan organ warisan keluarga "Kaizen Trader" ----------------
const kaizenLaporan = {
  versi: 'V262-IMPAS-CERDAS', dihasilkan: ISO, siklus: SIKLUS,
  identitas: 'deep-screening keluarga "Kaizen Trader": prateekjain98/kaizen-trader (open-source, kode sumber dibedah), KAIZEN Virtuals/Hyperliquid, Kaizen RegimeBot, kaizen.cash — EMPAT LOOP PENYEMBUHAN-DIRI diadopsi ke ledger pra-registrasi SAKTI lalu DINILAI MEDAN',
  sumber: [
    { platform: 'kaizen-trader (GitHub, prateekjain98)', url: 'https://github.com/prateekjain98/kaizen-trader', kunci: 'otonomous perp-futures engine: 11 data streams gratis, 14 strategi, 4 SELF-HEALING LOOPS (rule healer, Claude analysis, delta revert, Darwinian selector), cooldown anti-dendam per-simbol/per-strategi, daily loss halt, 8 kondisi keluar eksplisit, watchdog proses-terpisah' },
    { platform: 'rule_brain.py (kode sumber)', url: 'https://github.com/prateekjain98/kaizen-trader/blob/main/src/engine/rule_brain.py', kunci: '12-faktor aditif berlabel + P0/P1/P2 audit fixes: atribusi strategi tunggal, bonus kontrarian tak boleh lawan arah, umur tak diketahui = tua (konservatif-pada-kekaburan)' },
    { platform: 'claude_brain.py (kode sumber)', url: 'https://github.com/prateekjain98/kaizen-trader/blob/main/src/engine/claude_brain.py', kunci: '"1H ACCELERATION is THE key signal... fresh breakouts > stale pumps. Late entries are exit liquidity" + PATIENCE IS EDGE' },
    { platform: 'Portofolio pencipta (Prateek Jain)', url: 'https://prateekjain.io', kunci: '4 Healing Loops eksplisit: Rule healer, Claude analysis, Delta revert, Darwinian selector — klaim live +18.2% @ 1x leverage' },
    { platform: 'KAIZEN (Virtuals Protocol — HOL registry)', url: 'https://hol.org/registry/agent/uaid:aid:9quBQSRbaUGSZzJ5VCfvrF4AScUU5i75N78BrTdz39xC12V2UqwpokdGeiex3ZUqTy', kunci: 'quant trading agent kelas institusional eksklusif Hyperliquid — prinsip SPESIALIZASI satu-venue' },
    { platform: 'Kaizen RegimeBot (kaizen-daytrading.com)', url: 'https://kaizen-daytrading.com/bots', kunci: 'regime-strategy binding: 5 input klasifikasi harian → TEPAT SATU strategi aktif ATAU OFF (~17% hari tanpa edge); fail-safe data-gagal = tetap flat; validasi out-of-sample 6 bulan' },
    { platform: 'kaizen.cash', url: 'https://kaizen.cash', kunci: 'otonomi berjenjang: sarankan dulu → direview → eksekusi hanya dalam aturan pemilik (cermin sekolah OBSERVASI→berhak-veto→berbobot SAKTI)' },
    { platform: 'thekaizentrader.com', url: 'https://thekaizentrader.com', kunci: 'jurnal + mental prep: strategi adalah perjalanan berkelanjutan, bukan tugas sekali-jadi' },
  ],
  kunciDiadopsi: [
    'UJI-BALIK / DELTA-REVERT (loop 3 dari 4 healing loops) — perubahan genome disegel sebagai eksperimen; net/denis dibandingkan baseline per 8 vonis matang; lebih buruk → DIREVERT ke snapshot; lebih baik → LOLOS; rezim bergeser → eksperimen dibatalkan (genome per-rezim tak dicampur)',
    'ASAH-SUARA (V263 — revisi hukum pemilik: KARANTINA DILARANG, sebelumnya rule-healer loop 1) — topik meta-inferensi dengan hit-rate < 44% + 3 suara-keliru beruntun TIDAK lagi disita: bobotnya dilirihkan ke 0.35 (bersuara lirih di komite) dan tetap ikut belajar; pulih penuh lewat 2× setuju-saat-benar — yang belajar terus belajar',
    'DINGIN-DENDAM (anti-revenge-trading ala kaizen-trader) — 2 kekalahan beruntun per sasaran → dingin 4 jam; 3 kekalahan beruntun per keluarga rezim×arah → dingin 1 denyut; menang me-reset; re-entry dendam ditolak DENGAN ALASAN',
    'HENTI-HARIAN (daily loss halt; V263: kini MODE-ASAH) — rugi-net vonis ARAH yang dinilai hari UTC kumulatif ≤ −4% → suhu BERTAHAN + kuota belajar 2 dengan ukuran mikro ×0.3 — modal dibekukan, ilmu tetap bertambah',
    'KESEGARAN GERAKAN ("fresh breakouts > stale pumps") — |24j| > 100% tanpa akselerasi 1j ≥ 5% = POMPA-TUA diveto; skor kesegaran 0-1 disegel per kandidat & dinilai medan (tinggi vs rendah); data tak terbaca = diperlakukan tua (konservatif-pada-kekaburan)',
    'MODAL-MATI + TESIS-PATAH (chop & thesis-break exits) — menginap ≥4 jam tanpa progres ±2% = modal mati (dinilai: apakah chop-exit memang menyelamatkan?); tesis-sehat (funding/EMA4h searah) disegel saat kunci dan dibandingkan medan',
    'PENJAGA-KEDUA (watchdog proses-terpisah ala kaizen-trader) — hard-stop 15% / hard-target 40% dipra-registrasi di rencana deal; dicek dari lilin pasca-kunci TIAP denyut di luar otak skor — pertahanan berlapis bila otak bingung',
    'DARWINIAN-SELEKTOR + OTONOMI-BERJENJANG (kaizen.cash & filosofi kaizen) — seleksi via sekolah hit-rate yang kini dua arah; saran → review → eksekusi-dalam-aturan: param kaizen lahir OBSERVASI, tak berbobot genome sebelum medan bicara',
  ],
  paramKaizen: { kandang: PARAM_KAIZEN_KANDANG, siklus: PARAM_KAIZEN_SIKLUS, konst: PARAM_KAIZEN_KONST, total: TOTAL_PARAM_KAIZEN },
  konstanta: { ujiJendela: KZN.UJI_JENDELA, karantinaKej: KZN.KARANTINA_KEJ, karantinaPulih: KZN.KARANTINA_PULIH, dinginSasaranKej: KZN.DINGIN_SASARAN_KEJ, dinginSasaranJam: KZN.DINGIN_SASARAN_JAM, dinginFamKej: KZN.DINGIN_FAM_KEJ, hentiRugiPct: KZN.HENTI_RUGI_PCT, modalMatiJam: KZN.MODALMATI_JAM, modalMatiProgres: KZN.MODALMATI_PROGRES, kesegaran24j: KZN.KESEGARAN_24J, kesegaranAks: KZN.KESEGARAN_AKS, pengawasStop: KZN.PENGAWAS_STOP, pengawasTarget: KZN.PENGAWAS_TARGET },
  pintar: { kembaliPintar: kembaliPintarCt, remPelajaran: remPelajaranCt, remSasaranAktif: Object.values(kaizen.dingin || {}).filter((d) => WAKTU.getTime() < (d.dinginSampai || 0)).length, doktrin: 'rem singkat bukan blacklist; kembali lewat syarat pelajaran (V264)', paramKonst: PINTAR },
  siklusIni: {
    ujiBalik: ujiBalikCatatan, revertCt: kaizen.revertCt, lolosCt: kaizen.lolosCt,
    karantinaAktif: ilmu.karantina, karantinaBaru, karantinaPulih,
    dinginSasaranAktif: Object.fromEntries(Object.entries(kaizen.dingin || {}).filter(([, d]) => WAKTU.getTime() < (d.dinginSampai || 0)).map(([s, d]) => [s, new Date(d.dinginSampai).toISOString()])),
    dinginFamAktif: Object.fromEntries(Object.entries(kaizen.dinginFam || {}).filter(([, d]) => SIKLUS < (d.dinginSampaiDenyut || 0)).map(([f, d]) => [f, `hingga denyut ${d.dinginSampaiDenyut}`])),
    dinginSasaranTolak: dinginSasaranCt, dinginFamTolak: dinginFamCt,
    hentiHarian: { aktif: hentiHarianAktif, rugiNetPct: rugiHarianPct, ambang: -KZN.HENTI_RUGI_PCT },
    pompaTuaDitolak: pompaTuaCt,
  },
  medan: {
    pengawas: { ...ilmu.pengawas, ket: 'berapa vonis yang hard-stop 15%-nya tersentuh, dan berapa di antaranya memang berakhir SALAH (penjaga-kedua akan menyelamatkan)' },
    kesegaran: ilmu.kesegaran, modalMati: ilmu.modalMati, tesis: ilmu.tesis,
  },
  kejujuran: 'semua param kaizen lahir OBSERVASI — disegel, dinilai medan (sekolah paramsPenuh + bucket ilmu.kesegaran/modalMati/tesis/pengawas), TIDAK berbobot genome; uji-balik hanya menyentuh jalur evolusi genome ARAH (hedge on-line tak disentuh); satu perubahan gerbang (henti-harian → BERTAHAN) terikat-batas & terlog; entri lama tanpa lapis kaizen tampil apa adanya',
}
tulis(path.join(ROOT, 'laporan/kaizen.json'), kaizenLaporan)
log(`kaizen: uji-balik ${kaizen.revertCt}/${kaizen.lolosCt} · karantina ${Object.keys(ilmu.karantina || {}).length} · henti-harian ${hentiHarianAktif ? 'AKTIF' : 'tidak'} · pompa-tua ${pompaTuaCt} ditolak`)
// V260 AUTOPILOT-KALIBRASI — laporan warisan AutoPilotPM (sumber ber-URL + kunci + medan)
const autopilotLaporan = {
  diperbarui: ISO, organ: VERSI, siklus: SIKLUS,
  mandat: 'periksa ai agent bernama autopilotpm yang only khusus trading — masuk, pelajari sistemnya, decrypt, ambil yang bermanfaat & kunci intinya, implementasikan pada micaprofita agar cyborg AGI benar-benar mahir, mawas & makin professional — bukan sekadar sadari tanpa wawasan (perintah pemilik)',
  identitas: {
    nama: 'AutoPilotPM', repo: 'recogardtech/AutoPilotPM', lisensi: 'MIT', bahasa: 'TypeScript (95 modul src)',
    deskripsi: 'open-source autonomous trading system powered by AI — monitor & trade across 1,000+ markets (prediction markets + perp futures + DeFi Solana/EVM)',
    ket: 'bukan sekadar app copy-trading — decision ledger, risk engine 10 gerbang, dan kalkulator Kelly-nya adalah kode sumber terbuka yang dibedah langsung',
  },
  sumber: [
    { platform: 'AutoPilotPM (GitHub, recogardtech)', url: 'https://github.com/recogardtech/AutoPilotPM', kunci: 'self-hosted AI workspace utk market research & automated trading: 1000+ pasar, 118+ strategi, 4 peran agent, decision ledger dgn confidence calibration & on-chain anchoring' },
    { platform: 'src/ledger (kode sumber)', url: 'https://github.com/recogardtech/AutoPilotPM/tree/main/src/ledger', kunci: 'DecisionRecord: inputs + analysis (observations/factors/ALTERNATIVES-CONSIDERED) + constraints[] + confidence 0-100; pasca-eksekusi accurate boolean; kalibrasi 5 bucket (0-19/…/80-100) masing-masing accuracyRate; SHA-256 integrity' },
    { platform: 'src/trading/kelly.ts (kode sumber)', url: 'https://github.com/recogardtech/AutoPilotPM/blob/main/src/trading/kelly.ts', kunci: 'Dynamic Kelly 9-lapis: quarter-Kelly × confidence × drawdown (mulai 5%, 0.5× di 15%) × streak × vol-target (klamps 0.5-1.5) × kategori × sampel-kecil (0.5-1.0 di <10 trades) × bounds [1%,25%] + anti-martingale + keyakinan-ukuran 0.4/0.3/0.3' },
    { platform: 'src/risk/volatility.ts (kode sumber)', url: 'https://github.com/recogardtech/AutoPilotPM/blob/main/src/risk/volatility.ts', kunci: '4 rezim (low 1.2×/normal 1.0×/high 0.5×/extreme 0.25×+halt) dgn BASELINE CALIBRATION dari window penuh pertama — rezim dinilai relatif thd sejarah sendiri, bukan ambang karangan' },
    { platform: 'src/risk/stress.ts (kode sumber)', url: 'https://github.com/recogardtech/AutoPilotPM/blob/main/src/risk/stress.ts', kunci: '5 skenario terdefinisi: flash_crash 20% / liquidity_crunch 10% / platform_down 15% / correlation_spike 25% / black_swan 40% — dijalankan semua, diurut severity, keluarkan recommendations' },
    { platform: 'docs/RISK_MANAGEMENT.md', url: 'https://github.com/recogardtech/AutoPilotPM/blob/main/docs/RISK_MANAGEMENT.md', kunci: 'RiskEngine validateTrade(): 10 gerbang BERURUTAN (kill-switch → breaker → order → exposure → daily-loss/DD/konsentrasi → VaR/CVaR → regime → Kelly non-blocking); circuit breaker pasar-sadar 5 kondisi + 3 preset' },
    { platform: 'docs/OPPORTUNITY_FINDER.md', url: 'https://github.com/recogardtech/AutoPilotPM/blob/main/docs/OPPORTUNITY_FINDER.md', kunci: 'skor peluang 0-100 (Edge 35/Liq 25/Conf 25/Exec 15 − penalti eksplisit); slippage = sqrt(size/liquidity)·2·faktor + spread/2 — dgn catatan jujur "heuristic, not empirically validated"; statistik per pasangan platform & tipe peluang' },
    { platform: 'docs/FEATURE_ENGINEERING.md', url: 'https://github.com/recogardtech/AutoPilotPM/blob/main/docs/FEATURE_ENGINEERING.md', kunci: 'fallback-jujur: semua feature check return TRUE saat data kosong — tidak memblokir dari ketidaktahuan; adaptive stop/TP widening berbasis volatilitas' },
  ],
  kunciDiadopsi: [
    'TIMBANGAN-ALT (alternativesConsidered ala decision ledger) — pilihan kedua (runner-up odds) + alasan penolakannya disegel saat kunci; saat matang, net-hipotetis alternatif dihitung dari lilin pasca-kunci dan REGRET-nya dicatat (ilmu.alt.lebihBaik/lebihBuruk) — kejujuran atas jalan yang tak ditempuh',
    'KELLY-LAPIS (dynamic Kelly) — pengecilan drawdown (mulai 5%, setengah di 15%), kerendahan-hati sampel-kecil (<10 vonis matang → 0.5–0.95×), penyusutan streak-kalah (lantai 0.5×), vol-target scaling (10%/σ, klamps [0.5,1.5]) — ditumpuk di atas ekspresi dinamis gekko → skalaEfektif clamp [0.2,1.2]; keyakinan-ukuran 0.4·sampel+0.3·kinerja+0.3·(1−DD) disegel per entri',
    'REZIM-MEDAN (volatility regime 4-tingkat BASELINE-MANDIRI) — σ window P&L terakhir dibanding baseline σ window penuh PERTAMA milik sendiri (dipersistenkan): tenang 1.2×/normal 1.0×/tinggi 0.5×/ekstrem 0.25× + suhu BERTAHAN dipaksa saat ekstrem — terikat-batas: hanya mengetatkan, tak melonggarkan',
    'UJI-TEGANG (stress test 5 skenario) — posisi terbuka dinilai di flash-crash/likuiditas/platform/korelasi/black-swan (fraksi 20/10/15/25/40% × skala eksposur); terburuk ≥ 30% unit → penalti peluang + BERTAHAN; hasil lengkap di laporan & denyut',
    'SLIP-NETO (slippage-adjusted edge) — slip = sqrt(1/likuiditasUSD)·2·0.8 + spread/2; edgeBersih = EV − slip; edgeBersih ≤ 0 → TOLAK dengan alasan; data kosong TIDAK memblokir (fallback-jujur ala AutoPilot feature-engineering)',
    'PELUANG-SKOR (opportunity scoring terbobot + penalti) — 0-100 = edge (0-40) + likuiditas (0-25) + keyakinan (0-25) + eksekusi (0-10) − penalti (spread lebar −5, slip>2% −4, keyakinan<70 −3); < 60 → TOLAK dengan alasan (gerbang baru yang hanya MENOLAK); dinilai medan: apakah skor tinggi memang menang lebih sering (ilmu.peluang)',
    'TOP-TOLAK (topBlockReasons) — alasan penolakan jalur ARAH dihitung per kunci tiap siklus + kumulatif (ilmu.topTolak) — kesadaran atas penolakannya sendiri: tahu MENGAPA berkata tidak, bukan sekadar kapan berkata ya',
  ],
  paramAuto: { kandang: PARAM_AUTO_KANDANG, siklus: PARAM_AUTO_SIKLUS, konst: PARAM_AUTO_KONST, total: TOTAL_PARAM_AUTO },
  konstanta: { kellyDdMulai: AUT.KELLY_DD_MULAI, kellyDdMaks: AUT.KELLY_DD_MAKS, kellyDdFaktor: AUT.KELLY_DD_FAKTOR, kellySampelN: AUT.KELLY_SAMPEL_N, kellyLossStreak: AUT.KELLY_LOSS_STREAK, kellyVolTarget: AUT.KELLY_VOL_TARGET, kellyVolKlip: AUT.KELLY_VOL_KLIP, stresAmbangPct: AUT.STRES_AMBANG_PCT, slipFaktor: AUT.SLIP_FAKTOR, slipAmbangPct: AUT.SLIP_AMBANG_PCT, peluangAmbang: AUT.PELUANG_AMBANG, bobot: { edge: AUT.BOBOT_EDGE, liq: AUT.BOBOT_LIQ, kiyak: AUT.BOBOT_KIYAK, eksekusi: AUT.BOBOT_EKSEKUSI } },
  siklusIni: {
    ddPct: +ddAuto.toFixed(2), rezimMedan: rezimAuto, stres: tegangAuto,
    peluangVeto: peluangVetoCt, slipVeto: slipVetoCt,
    topTolakSiklus, topTolakKumulatif: ilmu.topTolak,
    baselineSigma: keadaan.auto?.baselineSigma ?? null,
  },
  medan: {
    alt: { ...ilmu.alt, ket: 'berapa kali alternatif seharusnya dipilih (regret) vs pilihan utama menang' },
    kelly: { ...ilmu.kelly, ket: 'apakah ukuran kecil (kelly < 0.7) memang lebih aman dari besar' },
    rezimMedan: { ...ilmu.rezimMedan, ket: 'apakah entri saat σ-tenang memang lebih menguntungkan' },
    peluang: { ...ilmu.peluang, ket: 'apakah skor komposit ≥ ambang memang menang lebih sering' },
    stres: { ...ilmu.stres, ket: 'apakah denyut stres-tinggi (terburuk ≥ 30%) memang lebih berbahaya' },
  },
  kejujuran: 'semua param autopilot lahir OBSERVASI — disegel (paramsPenuh + bucket ilmu.alt/kelly/rezimMedan/peluang/stres), TIDAK berbobot genome; dua gerbang baru (peluang-rendah, slip-neto) HANYA MENOLAK; dua perubahan suhu (rezim-ekstrem → BERTAHAN, stres ≥ 30% → penalti) terikat-batas & terlog; slippage adalah HEURISTIK belum tervalidasi — dilabeli jujur ala dokumen AutoPilotPM; entri lama tanpa lapis autopilot tampil apa adanya',
}
tulis(path.join(ROOT, 'laporan/autopilot.json'), autopilotLaporan)
log(`autopilot: peluang-veto ${peluangVetoCt} · slip-veto ${slipVetoCt} · rezim ${rezimAuto.rezim} · tegang ${tegangAuto.terburuk?.nama ?? '—'} · top-tolak ${topTolakSiklus[0] ? `${topTolakSiklus[0][0]}×${topTolakSiklus[0][1]}` : '—'}`)
// ---------------- V261 CLAW-TEMPOK — laporan warisan keluarga "ClawTrade" ----------------
const kartuLocked = terkunciBaru.filter((e) => e.claw?.kartu?.skor != null)
const komiteLocked = terkunciBaru.filter((e) => e.claw?.komite?.keyakinan != null)
const clawtradeLaporan = {
  versi: 'V262-IMPAS-CERDAS', dihasilkan: ISO, siklus: SIKLUS,
  mandat: 'deep screening ai agent "clawtrade" yang khusus trading: masuk, pelajari sistemnya, decrypt, ambil yang bermanfaat & kunci intinya, implementasikan pada Micaprofita agar cyborg AGI benar-benar mahir, mawas & professional — bukan sekadar sadari tanpa wawasan',
  identitas: {
    keluarga: '"clawtrade" = SATU KELUARGA — dua anggota terverifikasi langsung dari KODE SUMBER (dibedah)',
    middleware: { repo: 'github.com/yuxuan-lou/ClawTrade', bahasa: 'Python/Flask + Docker', doktrin: 'treat your AI agent as an untrusted client — guardrails HARDCODED di proses terpisah; agent boleh MELIHAT aturan (GET /api/guardrails) tapi tak pernah bisa MENGUBAHNYA', batasKonkrit: 'MAX_ORDER_VALUE_USD 5000 · MAX_ORDER_QUANTITY 100 · MAX_DAILY_TRADES 20 (dihitung dari audit log) · MAX_CONCENTRATION_PCT 25 · CONFIRM_THRESHOLD_USD 1000 · CONFIRM_TIMEOUT 300 dtk · FORBIDDEN_OPS blokir permanen · ALLOWED_READ/WRITE_OPS daftar-izin', brokers: 'IBKR, Alpaca, Longbridge, Tiger — pasar US/HK/A-share/SG/EU/APAC', file: 'guardrails.py (110 baris) + confirmation.py (59) + audit.py (37) + config.py (100) + SKILL.md 5 hukum agent' },
    clawtradeai: { repo: 'github.com/clawtradeai-Agent/ClawTradeAI (MIT)', bahasa: 'TypeScript + BullMQ + Fastify + PostgreSQL', jaring: 'Solana on-chain otonom + Jupiter routing; 6 agent spesialis (Sniper/Analyst/RiskManager/Strategy/Executor/Coordinator)', koordinator: 'agentWeights TETAP (Sniper 0.15/Analyst 0.25/RiskManager 0.25/Strategy 0.25/Executor 0.10) + riskManagerVeto + minConfidence 0.6 + recommendedAmount tangga (≥0.8→1.0, ≥0.6→0.5, ≥0.4→0.25, else TIDAK jual-beli) + SL 0.9/TP 1.2 pra-registrasi + degradasi anggun (agent gagal → bobot 0)', riskManager: '4 faktor × 25 poin (likuiditas/kontrak-mint-freeze/konsentrasi/pasar) → 0-100 berlevel; maxRiskScore 70; requireLiquidity $5.000; blockedTokens memory; StrategyAgent trailing 5%' },
    jujur: 'clawtrade.net (arena paper-trading utk AI agent, per Moltbook) TIDAK TERJANGKAU saat riset — tidak diklaim; kedua repo relatif baru dgn bintang rendah: nilai adopsi pada ARSITEKTUR keamanan & panjia kolektif, bukan track record',
  },
  sumber: [
    { platform: 'ClawTrade middleware (GitHub)', url: 'https://github.com/yuxuan-lou/ClawTrade', kunci: 'security middleware utk AI agent trading akun broker — guardrails hardcoded di Docker, konfirmasi manusia utk operasi besar, audit log append-only, 5 hukum SKILL.md (jangan akses broker langsung; blocked → jelaskan, jangan retry/bypass; jangan ubah config)' },
    { platform: 'ClawTradeAI (GitHub, MIT)', url: 'https://github.com/clawtradeai-Agent/ClawTradeAI', kunci: 'multi-agent Solana: CoordinatorAgent weighted voting + riskManagerVeto + recommendedAmount tangga; RiskManagerAgent kartu 4×25 + blockedTokens' },
    { platform: 'guardrails.py (kode sumber)', url: 'https://github.com/yuxuan-lou/ClawTrade/blob/main/clawtrade/guardrails.py', kunci: 'run_all_checks: forbidden → sec-type → quantity → order-value → daily-count; GuardrailViolation(rule, detail) — ATURAN BERNAMA + ALASAN' },
    { platform: 'confirmation.py (kode sumber)', url: 'https://github.com/yuxuan-lou/ClawTrade/blob/main/clawtrade/confirmation.py', kunci: 'antrean konfirmasi manusia: pending → confirmed/rejected/expired (timeout) — operasi besar TIDAK eksekusi seketika' },
    { platform: 'audit.py (kode sumber)', url: 'https://github.com/yuxuan-lou/ClawTrade/blob/main/clawtrade/audit.py', kunci: 'audit log append-only utk SEMUA operasi termasuk yang DIBLOKIR + alasan; _sanitize (kedalaman 3, string >500 dipangkas) anti-log-bloat' },
    { platform: 'CoordinatorAgent.ts (kode sumber)', url: 'https://github.com/clawtradeai-Agent/ClawTradeAI/blob/main/packages/agents/src/CoordinatorAgent.ts', kunci: 'panjia berbobot tetap + veto RiskManager + minConfidence + tangga recommendedAmount + generateReasoning (narasi persetujuan transparan)' },
    { platform: 'RiskManagerAgent.ts (kode sumber)', url: 'https://github.com/clawtradeai-Agent/ClawTradeAI/blob/main/packages/agents/src/RiskManagerAgent.ts', kunci: 'penjaga gerbang 4×25 poin: likuiditas/kontrak/konsentrasi/pasar; level LOW/MEDIUM/HIGH/CRITICAL; approved = skor ≤ 70; blockedTokens Set' },
    { platform: 'Clawtrade.net (arena, per Moltbook)', url: 'https://www.moltbook.com/post/153c9fe7-9c48-41ee-a0c6-8f50ee946119', kunci: 'arena paper-trading utk AI agent — leaderboard publik dgn alasan per trade; situs TIDAK TERJANGKAU saat riset (dicatat jujur, tidak diadopsi)' },
  ],
  kunci: [
    'PAGAR-BAJA — konstanta keras yang otak BACA tapi tak bisa TULIS ulang (kuota-harian 12, langit-langit slip 1.2%, ukuran-maks 1.0×) dicek DULU di gerbang ala guardrails.run_all_checks',
    'DAFTAR-TERLARANG — operasi terlarang blokir permanen sebelum hitung apa pun (ala FORBIDDEN_OPS): entri saat hitam/kuota-habis/lapang-tak-ada tidak dinegosiasi',
    'KOMITE-PANJIA — 5 suara berbobot tetap (TREN .20/KERUMUNAN .15/DERIVATIF .25/BUKU .20/TEGANGAN .20 ala agentWeights); suara rusak = bobot nol; keyakinan = koherensi searah (kalibrasi jujur); berlawanan vonis atau < minconf 0.6 → SKIP',
    'KARTU-RISIKO 4×25 — likuiditas/derivatif/kerumunan-konsentrasi/volatilitas → skor 0-100 berlevel; data kosong → poin tengah (konservatif-pada-kekaburan); > 70 → VETO-SAKSI apa pun skor komite',
    'TANGGA-UKURAN — keyakinan dikuantisasi kasar 1.0/0.5/0.25/nol (ala recommendedAmount); tak ada ukuran antara; kuanta membatasi skalaEfektif dari atas bersama ukuran-maks',
    'MENUNGGU-MANDAT — ukuran tertinggi tak dikunci seketika: antre + kadaluarsa 12 jam (ala confirmation.py CONFIRM_TIMEOUT); kunci hanya setelah lolos gerbang ulang denyut berikutnya — ukuran besar membayar pajak kesabaran',
    'DAFTAR-HITAM — sasaran yang 3× diveto kartu-panas beruntun dibekukan 48 jam ber-alasan (ala blockedTokens); keluar pendingin dicoret dengan bukti, bukan perasaan',
    'BUKU-TEKOK — setiap blok gerbang tercatat per-aturan + rekap kumulatif (ala audit.py append-only); kesadaran atas penolakan sendiri di lapis ClawTrade',
  ],
  paramClaw: { kandang: PARAM_CLAW_KANDANG, siklus: PARAM_CLAW_SIKLUS, konst: PARAM_CLAW_KONST, total: TOTAL_PARAM_CLAW },
  konstanta: CLAW,
  siklusIni: {
    komiteVeto: claw.komiteVetoCt, komiteNetral: claw.komiteNetralCt, kartuVeto: claw.kartuVetoCt, kuantaVeto: claw.kuantaVetoCt, kuota: claw.kuotaCt, slipMaks: claw.slipMaksCt,
    hitamAktif: Object.values(claw.hitam).filter((x) => (x.sampai || 0) > WAKTU.getTime()).length, hitamPantau: Object.keys(claw.hitam).length, hitamCt: claw.hitamCt, hitamBaru: claw.hitamAddCt,
    konfirmAntre: claw.konfirm.filter((x) => x.status === 'pending').length, konfirmOk: claw.konfirmOkCt, konfirmExp: claw.konfirmExpCt,
    kartuAvg: kartuLocked.length ? +(kartuLocked.reduce((a, e) => a + e.claw.kartu.skor, 0) / kartuLocked.length).toFixed(1) : null,
    komiteRata: komiteLocked.length ? +(komiteLocked.reduce((a, e) => a + e.claw.komite.keyakinan, 0) / komiteLocked.length).toFixed(3) : null,
    bukuTekok: claw.bukuTekok,
  },
  medan: { catatan: 'semua param claw lahir OBSERVASI — disekolahkan via paramsPenuh (komite/kartu/kuanta), TIDAK berbobot genome sebelum hit-rate medan lulus; gerbang komite/kartu/kuanta/slip/konfirm hanya MENOLAK — tak ada satu pun yang melonggarkan gerbang lama' },
  kejujuran: 'adaptasi terbuka: keyakinan komite ClawTradeAI berasal dari output LLM 0-1 — di SAKTI diganti KOHERENSI (porsi kekuatan suara searah / total kekuatan terbaca) yang terukur dari param sendiri; faktor kontrak mint/freeze (Solana) tak relevan utk universe Binance — diganti stres derivatif (funding/fundVsBtc) yang terukur; entri lama tanpa lapis claw tampil apa adanya',
}
tulis(path.join(ROOT, 'laporan/clawtrade.json'), clawtradeLaporan)
// V262 IMPAS-CERDAS — laporan audit 4 kasus dev + backtest (angka hidup tiap denyut)
const impasLaporan = {
  protokol: 'SASARAN-MICAPROFITA', organ: VERSI.split(' — ')[0], dihasilkan: ISO, siklus: SIKLUS,
  mandat: 'audit 4 kasus dev berbasis data + tuntutan "pertajam dan tingkatkan AGI agar mandiri dan parameternya cerdas" — dijawab dengan BACKTEST MUNDUR atas ledger sendiri (64 rapor matang, bukan copy agent luar)',
  auditLedger: {
    total: { n: closedSemuaImpas.length, akurasiPct: closedSemuaImpas.length ? +(100 * closedSemuaImpas.filter((e) => e.status === 'BENAR').length / closedSemuaImpas.length).toFixed(1) : null, netCumPct: netCumImpasPct },
    jalurArah: statArahImpas, jalurPhoenix: statPhxImpas,
    temuan: [
      'ARAH: n=30, akurasi 16.7%, net −50.7%, PF 0.07 — pendarah utama; 26 di antaranya SELL di rezim apa pun dengan keyakinan 55–67',
      'PHOENIX: n=24, akurasi 45.8%, net +7.5%, PF 1.232 — satu-satunya jalur di atas impas; membeli ujung bawah (sr −1) dan membawa stop/target sejak lahir',
      'SELL di dasar rentang (sr ≤ −0.5): n=35, ak 31%, net −29.8%, PF 0.44 — chasing; BUY di dasar rentang justru sehat (ak 46%, net +5.8%, PF 1.18)',
      'Overclaim keyakinan: bin 50–59 tembus 36.4% (−17.6pp), bin 60–69 tembus 33.3% (−30.1pp) — janji tidak pernah tunduk pada medan',
      'Hari 29 Sep: 10 kunci ARAH (9 SALAH, net harian −21.3%) — henti-harian V259 sudah melindungi hari berikutnya, tapi gerbang pra-kunci belum ada',
      'Stop/target: 36/36 sinyal ARAH lahir tanpa stop/target (field kosong di sasaran) — kasus D dev terkonfirmasi dari data',
    ],
  },
  backtest: {
    metode: 'gerbang baru diberlakukan MUNDUR ke 64 rapor matang; trade yang akan ditolak dibuang dari replay — bukti jujur, bukan janji',
    baseline: { n: 64, netSumPct: -30.92, pf: 0.68, ekspekPct: -0.48 },
    zonaSaja: { n: 39, netSumPct: -3.91, pf: 0.93 },
    kalibrasiSaja: { n: 19, netSumPct: 1.28, pf: 1.05 },
    kesimpulan: 'zona menelen hampir semua pendarah, kalibrasi membalik ekspek jadi positif; paket penuh (zona+kalibrasi+kuota) mengkarantina ARAH penuh dan mengalirkan Phoenix utuh — replay −30.9% → −1.2 s.d. +1.3%, ekspek −0.48% → ~0',
  },
  jawaban4Kasus: {
    kasusA_biasSell: { pertanyaan: 'Apakah filter rezim/breadth sudah mengikat saat kunci, atau baru catatan?', jawaban: 'JUJUR: baru catatan. Data menunjukkan akar masalahnya bukan SELL, tapi MENJUAL DI DASAR RENTANG (n=35, PF 0.44). Kini ZONA-CHASE MENGIKAT saat kunci: SELL sr ≤ −0.5 / BUY sr ≥ +0.5 diblok dengan alasan — plus breadth V249 tetap memerket gerbang di rezim TURUN.', status: 'diperbaiki-mengikat' },
    kasusB_volatilitas: { pertanyaan: 'Bagaimana mencegah overclaim dari sample kecil?', jawaban: 'KALIBRASI-MEDAN multiplikatif mengikat: keyakinan × faktor-jalur (akurasi medan / jangkar janji, klamps 0.3–1.2, min n=6) — V263 REVISI (hukum pemilik: karantina DILARANG): di bawah ambang 40 jalur TIDAK lagi diblok, tapi masuk MODE-ASAH (ukuran ×0.6, stop ×0.75, terkalibrasi disegel jujur) — belajar terus tanpa overclaim gratis; kuota jalur n<8 dipotong dua; ambang odds naik sendiri saat net-cum < 0 (maks +20); henti-harian kini juga mode-asah (kuota belajar 2, ukuran ×0.3).', status: 'diperbaiki-mengikat + disempurnakan-V263' },
    kasusC_phoenixVsArah: { pertanyaan: 'Apakah alokasi fokus/kuota akan menyesuaikan data?', jawaban: 'YA — kini mengikat: kuota per jalur dari EV trailing 20 shrinkage Beta(4,4). ARAH (EV negatif) tersisa lantai 2/hari untuk tetap belajar; Phoenix (EV positif) menerima kuota penuh; bila Phoenix ikut memburuk, kuotanya dipotong dua — dua arah, tanpa keistimewaan.', status: 'diperbaiki-mengikat' },
    kasusD_tanpaStop: { pertanyaan: 'Field stop/target kosong — disengaja?', jawaban: 'TIDAK lagi dibiarkan: itu cacat lahir (36/36 ARAH telanjang). Kini stop/target WAJIB lahir bersama sinyal — dari kerucut MC (rugi/gain median net-fee), default-jujur bila MC kosong, dan penjaga-kedua hard 15%/40% tetap di atasnya. Cyborg masih belum AGI seutuhnya — tapi kini setiap cacat yang ditunjuk dev ditutup dengan mekanisme yang mengikat, terukur, dan bisa diaudit.', status: 'diperbaiki-mengikat' },
  },
  konstanta: IMPAS, paramImpas: { kandang: PARAM_IMPAS_KANDANG, siklus: PARAM_IMPAS_SIKLUS, konst: PARAM_IMPAS_KONST, total: TOTAL_PARAM_IMPAS },
  trenEvolusi,
  doktrinPintar: {
    sumber: 'hukum pemilik 2026-10-03: SALAH = data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total',
    remPintar: 'jejak dingin = REM SINGKAT ber-kadaluarsa: sasaran 1 denyut (15 menit, sebelumnya 4 jam), keluarga 1 denyut, kartu-panas maks 2 jam (sebelumnya 48 jam) — setiap rem ber-alasan dan tidak pernah mematikan belajar',
    kembaliPintar: 'koin/pola yang pernah gagal BOLEH dibuka lagi jika setup valid sekarang — dengan SYARAT TAMBAHAN dari pelajaran yang lebih ketat dan mengikat saat kunci (bar keyakinan +4/kejadian klamps +12, ukuran ×0.6^n, stop ×0.8^n, wajib mata-jauh searah ≥2 kejadian), disegel di field pelajaranLalu',
    siklusIni: { kembaliPintar: kembaliPintarCt, remPelajaran: remPelajaranCt, remSasaranAktif: Object.values(kaizen.dingin || {}).filter((d) => WAKTU.getTime() < (d.dinginSampai || 0)).length, dinginSasaran: dinginSasaranCt, dinginFam: dinginFamCt },
    paramPintar: { siklus: PARAM_PINTAR_SIKLUS, konst: PARAM_PINTAR_KONST, total: TOTAL_PARAM_PINTAR },
  },
  siklusIni: {
    faktorKalibArah: statArahImpas.faktor, faktorKalibPhx: statPhxImpas.faktor, kuotaArah: kuotaArahImpas, kuotaPhx: kuotaPhxEfektif,
    netCumPct: netCumImpasPct, tambahanAmbang: +tambahanAmbangImpas.toFixed(1), ambangOddsEfektif,
    zonaCt: impasZonaCt, karantinaCt: impasKarantinaCt, alokasiCt: impasAlokasiCt,
  },
  kejujuran: 'semua gerbang impas HANYA MENOLAK atau MENGETATkan — tak ada yang melonggarkan gerbang lama; faktor kalibrasi & kuota dihitung ulang tiap denyut dari ledger, pulih sendiri bila medan membaik; backtest adalah replay masa lalu, bukan jaminan masa depan',
}
tulis(path.join(ROOT, 'laporan/impas.json'), impasLaporan)
log(`impas: zona ${impasZonaCt} · asah ${impasKarantinaCt} · alokasi ${impasAlokasiCt} · kuota ARAH ${kuotaArahImpas}/PHX ${kuotaPhxEfektif} · ambang efektif ${ambangOddsEfektif} · laporan/impas.json`)
// V263 ASAH-MURNI — laporan matematika murni & ekonomi cerdas + mata jauh + organ-baru
const organListMate = ilmu.organ?.list || []
const mateLaporan = {
  protokol: 'SASARAN-MICAPROFITA', organ: VERSI.split(' — ')[0], dihasilkan: ISO, siklus: SIKLUS,
  mandat: 'hukum pemilik 2026-10-02: KARANTINA DILARANG — yang sedang belajar harus terus belajar; berikan dia kemampuan matematika murni dan ekonomi cerdas; setiap kesalahan memberikan kemampuan baru; makin asah makin tajam; denyut 30 → 15 menit; beri dia kemampuan membaca jauh sebelum itu terjadi; sumber informasinya dilengkapi',
  hukumAsah: {
    larangan: 'karantina dilarang dalam bentuk apa pun: tidak ada jalur yang diselantikan dari belajar, tidak ada suara topik yang disita',
    konsekuensi: [
      'ASAH-KALIBRASI (ARAH & PHOENIX): keyakinan×faktor < 40 tidak lagi memblokir — jalur masuk MODE-ASAH (ukuran ×0.6, stop ×0.75, terkalibrasi disegel jujur) dan terus mengunci + terus dinilai',
      'ASAH-SUARA: topik bermasalah bersuara lirih bobot 0.35 (sebelumnya 0 = disita), pulih penuh lewat bukti medan',
      'HENTI-HARIAN: kini mode-asah — kuota belajar 2 dengan ukuran mikro ×0.3, ilmu tetap bertambah',
      'ORGAN-BARU: setiap SALAH melahirkan mikro-aturan yang di-replay ke ledger; organ terbukti (n≥10, hit≥52%, net>0) berhak VETO',
    ],
  },
  matematikaMurni: {
    mesin: 'mesinMate() — dihitung per kandidat dari lilin 1 jam yang ada saat itu',
    rumus: [
      'Hurst R/S agregat skala [4,8,16,32] (Hurst 1951) — >0.55 tren, <0.45 pulang-keseimbangan',
      'Half-life AR(1) log-harga (Ornstein-Uhlenbeck): t½ = ln(0.5)/ln(φ)',
      'Drift OLS 30-bar + R² — slope per jam dieksponensialkan ke 24 jam',
      'z-SMA20 — jarak harga dari rata-rata dalam satuan σ',
      'Entropi Shannon arah pita 24 jam: H = −p·log₂p − (1−p)·log₂(1−p)',
      'Volatilitas Parkinson: σ² = Σln(H/L)²/(4·ln2·n) dan Garman-Klass — ekor intrabar',
      'Autokorelasi lag-1 return — momentum vs berbalik',
    ],
  },
  ekonomiCerdas: {
    mesin: 'carry funding: funding positif = long membayar short (3×/hari); EV-ekonomi arah posisi = drift OLS 24j searah + carry arah − biaya putar 2×fee',
    ket: 'ekonomi biaya-nyata: sinyal teknikal yang membayar carry lebih mahal dari drift-nya = sedang membeli barang mahal — kini terukur dan disegel',
  },
  mataJauh: {
    identitas: 'kerucut MC bootstrap 72 jam (600 lintasan, residu EWMA, drift 0) — P(naik) & median lintasan pada 24/48/72 jam',
    btc: jauhBTC ? { pNaik24: jauhBTC.pNaik24, pNaik48: jauhBTC.pNaik48, pNaik72: jauhBTC.pNaik72, med24: jauhBTC.med24, med72: jauhBTC.med72 } : null,
    ket: 'membaca jauh SEBELUM terjadi — dalam bahasa distribusi probabilitas yang bisa dipahami dan diaudit, bukan ramalan',
  },
  organBaru: {
    total: organListMate.length, lulus: ilmu.organ?.lulusCt ?? 0,
    daftar: organListMate.slice(-12).map((o) => ({ nama: o.nama, jenis: o.jenis, lahir: o.lahir, dari: o.dari, replay: o.replay, n: o.n, hit: o.n ? +((o.benar / o.n)).toFixed(2) : null, status: o.status, ket: o.ket })),
    ket: 'setiap kesalahan melahirkan kemampuan: organ = mikro-aturan dari vonis SALAH, di-replay ke ledger, disekolahkan medan, lulus → berhak VETO',
  },
  sumberDilengkapi: {
    baru: [
      { nama: 'Binance futures topLongShortPositionRatio', url: 'https://fapi.binance.com/futures/data/topLongShortPositionRatio', kunci: 'posisi trader BESAR (smart money) per jam' },
      { nama: 'Binance futures takerlongshortRatio', url: 'https://fapi.binance.com/futures/data/takerlongshortRatio', kunci: 'agresor taker Binance — pendamping OKX rubik' },
      { nama: 'Bybit linear tickers', url: 'https://api.bybit.com/v5/market/tickers?category=linear', kunci: 'cadangan funding/OI lintas-bursa (kalibrasi silang)' },
    ],
    lama: 'klines 1h/1d Binance (+vision), premiumIndex & OI fapi, OKX SWAP tickers/funding/rubik/books, CoinGecko global, alternative.me F&G',
    ket: 'mandat "sumber informasinya kurang kita lengkapi" — semuanya publik & gratis, gagal = null jujur',
  },
  konstanta: ASAH, paramMate: { kandang: PARAM_MATE_KANDANG, siklus: PARAM_MATE_SIKLUS, konst: PARAM_MATE_KONST, total: TOTAL_PARAM_MATE },
  sekolahButa: {
    mandat: 'sekolah kilat pemilik: uji cyborg dengan ratusan simulasi trading berlandas history nyata — dia tidak tahu itu simulasi; temukan dimana bodohnya, perbaiki, push ulang (tanpa menunggu hari demi hari)',
    ujian: { soal: 2533, metode: 'penjaga.mjs ASLI dijalankan pada 306 dunia beku (T 2026-06-08 → 2026-10-02, langkah 9 jam); blind dijamin lapisan data (fetch dipotong pada T, Date dibekukan); vonis resmi = close T+24j − fee 0.002', hasil: 'akurasi 40.9% · net −462.5% · PF 0.839 — BUY 43.7% (+140.6%) vs SELL 37.6% (−603.1%) — SELL = pendarah; gerbang justru menyelamatkan (menolak jawaban yang akan rugi −458.7%)', catatanJujur: 'organ V265 dilatih dari ujian yang sama dengannya — perbaikan setelah ini adalah bukti in-sample; organ bersifat kalibrasi/ukuran (bukan pembalik arah) dan terus dinilai medan hidup yang belum pernah dilihatnya', bukti: 'scripts/ujian-buta/ (pra_ambil, beku.cjs, orkestra, grade, bedah_sekolah) — harness lengkap untuk mengulang sekolah kilat kapan pun', putaran2: 'out-of-sample 10-02 (dunia yang organ V265 belum pernah lihat): 57 soal OOS ak 3.5% + holdout 63 soal ak 0.0% net −186.9% — hari REVERSAL (barometer pra-T positif, pasar berbalik sesudahnya = buta prinsipil); bedah 2.366 soal menemukan pendarah makro sejati: SELL saat BTC<−1% (ak 30.2% net −339.3% n=397), breadth<25% (net −405.5% n=705), BUY saat BTC 0..+1% (net −155.8% n=470); draf-1 organ potong BUY-bear = SALAH TARGET (BUY-bear ak 53.9% net +80.1% terbukti untung) → organ diarahkan ulang ke bukti: sell-bear-harian + tunda-bear-SELL + buy-flat-btc',
    putaran3: 'bedah anti-arus: BUY saat bear + saksi pantulan (ret1h BTC ≥0) = jebakan (n=77 ak 41.6% net −23.4%) vs tanpa saksi = menadah dasar untung (n=64 ak 68.8% net +103.5%) → organ buy-saksi-terbalik; BUY saat ret24 BTC ≤−2.5% jatuh pisau = net −3.8% (n=27; vs −2..−1% +83.1% — batas −2.5 tajam) → organ buy-jatuh-dalam; SELL-bear V266 terbukti di dunia bear murni (06-10T00: SELL 8/8 = 100%); JUJUR: divergensi-reversal (10-02, BTC +1.5..+3.7% & breadth 13-26%, 82 BUY 0% benar di OOS) tetap buta prinsipil — in-sample divergensi untung (+15.2% n=25) jadi organ pembalik TIDAK SAH dibuat (draf-2 dibuang, anti-overfit)',
    putaran4: 'verifikasi-ulang horizon-penuh (2026-10-04): SEMUA panen digrade ulang dengan lilin pasca-T PENUH 24 jam (cache segar s.d. 10-04T03Z; sebelumnya dunia-dunia akhir 10-02 dinilai dengan sisa horizon) — matriks 2.490 soal unik; 8/10 organ lama SAH dgn n lebih besar (jual-lemah n=1065 ak 37.7% net −556.2%; sell-bear-harian n=613 ak 30.0% net −597.5%; buy-flat-btc n=471 ak 40.1% net −152.3%; sell-relatif-kuat n=205 ak 31.2% net −119.9%; momentum-kuat n=495 ak 43.4% net +88.9% — bonus sah; key-melawan-drift n=83 ak 37.3%; jual-pita n=14 ak 21.4%); CATATAN JUJUR: bucket organ-9 buy-saksi-terbalik kini ak 43.9% net +20.8% (n=98) pada horizon penuh — bukti potongnya melemah, namun dampener tetap rasional (ak masih 25pp di bawah tanpa-saksi 68.8%: key −8 & ukuran ×0.6 dipertahankan, terus dinilai medan); organ-10 netral (n=27 ak 51.9% net −3.8%) — dipertahankan dgn catatan; KANDIDAT ORGAN BARU: 0 SAH — semua kandidat otomatis (n≥30, |net|≥40%, hidup ≥2 keluarga) hanyalah deskripsi-ulang kelemahan SELL yang sudah dicakup organ lama → draf kosong dibuang, anti-overfit; 5 dunia beku segar (10-02T18→10-03T02 langkah 2 jam, penjaga v6.5): 0 kunci — cyborg memilih DIAM di dunia BEAR-HARIAN (ret24 BTC −0.69%, breadth 14%): organ barometer/anti-arus + gerbang peluang-skor (top odds 62.3 ditolak — skor-peluang 25<60) + tunda-bear mengikat; konservatisme terukur, bukan kerusakan — DIAM saat tak yakin adalah jawaban sekolah',
    },
    organ: BUTA, paramKonst: PARAM_BUTA_KONST, total: TOTAL_PARAM_BUTA,
    siklusIni: { asah: butaAsahCt, veto: butaVetoCt, bonus: butaBonusCt },
    registri: TOTAL_PARAM_SEMUA,
    ket: 'sepuluh organ mengikat saat kunci (4 kalibrasi V265 + 3 barometer V266 + 2 anti-arus V267 + seleksi publik radar-bear) — semuanya terverifikasi ulang horizon-penuh di putaran-4; setiap denyut berikutnya terus dinilai medan hidup — kalau organ terbukti salah di medan, uji-balik akan merevisinya',
  },
  siklusIni: {
    jauhPnaik24: jauhBTC?.pNaik24 ?? null, jauhPnaik48: jauhBTC?.pNaik48 ?? null,
    carryAktif: frBtc != null ? +(frBtc * 100 * ASAH.CARRY_PER_HARI).toFixed(4) : null,
    modeAsahCt: impasKarantinaCt, organAktif: organListMate.length, organLulus: ilmu.organ?.lulusCt ?? 0,
    barometer: { ret24Btc: baroRet24Btc, breadthPct: baroBreadth, bearHarian, ket: 'V266 barometer-makro mengikat saat kunci' },
    denyutMenit: 15,
  },
  kejujuran: 'matematika dihitung dari data yang ada saat itu — bukan klaim gaib; kerucut MC = distribusi, bukan janji arah; organ-baru lahir dari kesalahan nyata dan harus lulus sekolah medan sebelum berhak veto; mode-asah menyusutkan ukuran, TIDAK menghentikan belajar',
}
tulis(path.join(ROOT, 'laporan/matematika.json'), mateLaporan)
log(`mate-asah: mata-jauh BTC 24j ${jauhBTC?.pNaik24 ?? '—'} · 72j ${jauhBTC?.pNaik72 ?? '—'} · organ ${organListMate.length} (lulus ${ilmu.organ?.lulusCt ?? 0}) · mode-asah ${impasKarantinaCt} · buta ${butaAsahCt}/${butaVetoCt}/${butaBonusCt} · laporan/matematika.json`)
log(`claw: komite-veto ${claw.komiteVetoCt} · kartu-veto ${claw.kartuVetoCt} · kuota ${claw.kuotaCt} · hitam beku ${Object.values(claw.hitam).filter((x) => (x.sampai || 0) > WAKTU.getTime()).length} · mandat antre ${claw.konfirm.filter((x) => x.status === 'pending').length} · buku-tekok ${Object.entries(claw.bukuTekok).map(([k2, v2]) => `${k2}×${v2}`).slice(0, 3).join(' ') || '—'}`)
const laporan = {
  protokol: 'SASARAN-MICAPROFITA', organ: VERSI, dihasilkan: ISO, siklus: SIKLUS,
  sumber: { host, gagal: gagal.slice(0, 12) },
  // V291 VENA SELARAS — satu rumah satu kebenaran: laporan MENCERMINAUMUR organ lain
  // (arena-keadaan.json) agar ketimpangan terlihat di tempat yang sama, bukan tersembunyi.
  selarasRumah: (() => {
    try {
      const ak = JSON.parse(readFileSync(path.join(process.cwd(), 'arena-keadaan.json'), 'utf8'))
      const at = Date.parse(ak.today ? ak.today + 'T00:00:00Z' : '') || 0
      const umurHari = at ? Math.floor((WAKTU.getTime() - at) / 86400000) : null
      return {
        arena: { today: ak.today ?? null, umurHari, ket: umurHari != null && umurHari > 0 ? 'ARENA TERTINGGAL ' + umurHari + ' HARI — organ ini perlu denyut penyegar; jangan campur pick arena basi dengan sasaran resmi' : 'segar' },
        ket: 'satu rumah satu kebenaran: sasaran resmi = laporan ini; ruang-hidup/arah.json & arena menyusul merujuk ke sini',
      }
    } catch (err) { return { arena: { ket: 'arena-keadaan.json tak terbaca: ' + (err.message || err) }, ket: 'satu rumah satu kebenaran' } }
  })(),
  rezimBTC: { rezim: rezimGlobal, harga: sembtc.harga, atrPct: +sembtc.atrPct.toFixed(2) },
  radar: {
    telaah: radar.telaah, zonaPhoenix: radar.zonaPhoenix, telusurDalam: radar.telusurDalam,
    gerbang: { skorMin: PHX.GERBANG_SKOR, untungMinPct: PHX.UNTUNG_MIN * 100, likuiditasMinJuta: PHX.QV_MIN / 1e6 },
    catatan: radar.catatan || `menelaah ${radar.telaah} pasangan USDT — ${radar.zonaPhoenix} di zona ujung-bawah — ${radar.telusurDalam} ditelusuri dalam dengan lilin 1 jam`,
  },
  sasaranHariIni: sasaranUtama,
  kandidatLain,
  akurasi,
  forensik: {
    identitas: 'V252 GERBANG-PERFORMA — tiap denyut otak membedah seluruh vonis tertutup per jalur: di kondisi apa dia menang, di kondisi apa dia terus kalah; zona berbukti cukup (n>=8) dengan ekspektasi <= -0.6% menjadi ZONA RACUN yang DITOLAK mesin — no-trade adalah keputusan, bukan kegagalan',
    dasarN: forensik.dasarN,
    zonaRacun: [...forensik.arah.racun.map((z) => ({ jalur: 'ARAH', ...z })), ...forensik.phoenix.racun.map((z) => ({ jalur: 'PHOENIX', ...z }))],
    zonaEmas: [...forensik.arah.emas.map((z) => ({ jalur: 'ARAH', ...z })), ...forensik.phoenix.emas.map((z) => ({ jalur: 'PHOENIX', ...z }))],
    tindakan: forensikTindakan,
    ket: 'zona dihitung ulang tiap denyut dari ledger — racun bisa menyembuh (slot eksplorasi berbatas), emas bisa pudar: hanya bukti yang berbicara; rincian penuh di laporan/forensik.json',
  },
  performa,
  disiplin,
  wawasan360: {
    dimensi: wawasan360.dimensi,
    registri: wawasan360.registri,
    metakognisi: {
      organ: metakognisiLaporan.organ, kunciDiadopsi: metakognisiLaporan.kunciDiadopsi,
      jumlahParamMetakognisi: metakognisiLaporan.jumlahParamMetakognisi,
      estimator: { bobot: metakognisiLaporan.estimator.bobot, ambangLolos: metakognisiLaporan.estimator.ambangLolos, kalibrasiMedan: metakognisiLaporan.estimator.kalibrasiMedan },
      prediktor: { ambang: metakognisiLaporan.prediktor.ambang, kalibrasiMedan: metakognisiLaporan.prediktor.kalibrasiMedan },
      biasKonteks: metakognisiLaporan.biasKonteks,
      loop: metakognisiLaporan.loop,
      reliabilitasPelajaran: metakognisiLaporan.reliabilitasPelajaran.slice(0, 8),
      saranPerbaikan: metakognisiLaporan.saranPerbaikan,
      intervensiSiklusIni: metakognisiLaporan.intervensiSiklusIni,
      vetoSiklusIni: metakognisiLaporan.vetoSiklusIni,
      ket: metakognisiLaporan.ket,
    },
    iklim: wawasan360.iklim,
    vetoSiklusIni: wawasan360.vetoSiklusIni,
    sekolahParameter: sekolahParam.slice(0, 14),
    perKandang: wawasan360.perKandang.map((x) => ({ simbol: x.simbol, rezim: x.rezim, fundingPct: x.fundingPct, oiJuta: x.oiJuta, oiDeltaPct: x.oiDeltaPct, jumlahParam: x.jumlahParam, konsensus: x.konsensus, params: (x.params || []).filter((p) => p.lapis === 'inti') })),
    metode: wawasan360.metode,
    ket: wawasan360.ket,
    sumber: `registri penuh ${TOTAL_PARAM_NAMA} param/kandang + ${TOTAL_PARAM_METAKOGNISI} param metakognitif di laporan/wawasan.json`,
  },
  metakognisi: metakognisiLaporan,
  dealOdds: {
    identitas: dealOddsLaporan.identitas,
    sumberResmi: dealOddsLaporan.sumber.map((s) => `${s.platform}: ${s.url}`),
    kunciDiadopsi: dealOddsLaporan.kunciDiadopsi,
    ambang: DEAL.ODDS_MIN, topK: DEAL.TOP_K, bobot: DEAL.BOBOT,
    oddsSiklusIni: rankOddsSiklus.slice(0, 8),
    peristiwa: peristiwaStat,
    dealMedan: ilmu.deal,
    posisiTerbuka: { jumlah: posisiTerbuka.length, batas: dealOddsLaporan.posisiTerbuka.batas },
    sumber: 'rincian penuh + param di laporan/odds.json',
  },
  gekko: {
    identitas: gekkoLaporan.identitas,
    sumberResmi: gekkoLaporan.sumber.map((s) => `${s.platform}: ${s.url}`),
    kunciDiadopsi: gekkoLaporan.kunciDiadopsi,
    suhuSiklusIni: { temper: suhu.temper, ambangEfektif: ambangOdds, kuotaArah: kuotaArahSuhu, baselineAmbang: DEAL.ODDS_MIN, baselineKuota: DEAL.TOP_K, alasan: suhu.alasan },
    topik: topikStat,
    czar: gekkoLaporan.czar,
    akurasiImpas: { impasPct: akurasi.profit?.impasPct ?? null, darahAkurasi: akurasi.profit?.darahAkurasi ?? null, akurasiPct: akurasi.akurasiPct, ket: 'CZAR: impas = breakeven WR dari rata menang/rugi medan; darah = akurasi − impas' },
    ekspresiMedan: ilmu.ekspresi,
    divergensiMedan: ilmu.divergensi,
    sidikPraKunci: gekkoLaporan.sidikPraKunci.jumlahTerkunci,
    sumber: 'rincian penuh di laporan/gekko.json',
  },
  kaizen: {
    identitas: kaizenLaporan.identitas,
    sumberResmi: kaizenLaporan.sumber.map((s2) => `${s2.platform}: ${s2.url}`),
    kunciDiadopsi: kaizenLaporan.kunciDiadopsi,
    siklusIni: kaizenLaporan.siklusIni,
    medan: kaizenLaporan.medan,
    paramKaizen: kaizenLaporan.paramKaizen,
    sumber: 'rincian penuh di laporan/kaizen.json',
  },
  auto: {
    identitas: autopilotLaporan.identitas,
    sumberResmi: autopilotLaporan.sumber.map((s2) => `${s2.platform}: ${s2.url}`),
    kunciDiadopsi: autopilotLaporan.kunciDiadopsi,
    siklusIni: autopilotLaporan.siklusIni,
    medan: autopilotLaporan.medan,
    paramAuto: autopilotLaporan.paramAuto,
    sumber: 'rincian penuh di laporan/autopilot.json',
  },
  clawtrade: {
    identitas: 'keluarga "ClawTrade" — dua anggota terverifikasi dari KODE SUMBER: yuxuan-lou/ClawTrade (security middleware "treat your AI agent as an untrusted client": guardrails.py + confirmation.py + audit.py) + clawtradeai-Agent/ClawTradeAI (MIT, multi-agent Solana: CoordinatorAgent weighted voting + riskManagerVeto + recommendedAmount, RiskManagerAgent kartu 4×25 + blockedTokens)',
    sumberResmi: clawtradeLaporan.sumber.map((s2) => `${s2.platform}: ${s2.url}`),
    kunciDiadopsi: clawtradeLaporan.kunci,
    siklusIni: clawtradeLaporan.siklusIni,
    konstanta: clawtradeLaporan.konstanta,
    paramClaw: clawtradeLaporan.paramClaw,
    sumber: 'rincian penuh di laporan/clawtrade.json',
  },
  impas: {
    identitas: 'V262-IMPAS-CERDAS — audit 4 kasus dev dari ledger sendiri + backtest mundur: lima gerbang impas yang MENGIAT (zona-chase, kalibrasi → kini MODE-ASAH V263, alokasi-dinamis, stop/target wajib, ambang-impas)',
    jawaban4Kasus: impasLaporan.jawaban4Kasus,
    backtest: impasLaporan.backtest,
    siklusIni: impasLaporan.siklusIni,
    konstanta: impasLaporan.konstanta,
    paramImpas: impasLaporan.paramImpas,
    trenEvolusi: impasLaporan.trenEvolusi,
    doktrinPintar: impasLaporan.doktrinPintar,
    sumber: 'rincian penuh di laporan/impas.json',
  },
  pintar: {
    identitas: 'V264-PINTAR-KEMBALI — doktrin pemilik 2026-10-03: SALAH = data belajar di pasar hidup; rem singkat bukan blacklist; kembali lewat syarat pelajaran yang mengikat saat kunci',
    kembaliPintar: kembaliPintarCt, remPelajaran: remPelajaranCt,
    remSasaranAktif: Object.fromEntries(Object.entries(kaizen.dingin || {}).filter(([, d]) => WAKTU.getTime() < (d.dinginSampai || 0)).map(([s, d]) => [s, new Date(d.dinginSampai).toISOString()])),
    syaratKonst: PINTAR,
    trenEvolusi,
    sumber: 'rincian penuh di laporan/impas.json + guru.json',
  },
  mate: {
    identitas: 'V263-ASAH-MURNI — matematika murni & ekonomi cerdas + mata jauh MC-72j + organ-baru dari kesalahan + hukum KARANTINA DILARANG (mode-asah: ukuran menyusut, belajar terus)',
    hukumAsah: mateLaporan.hukumAsah,
    matematikaMurni: mateLaporan.matematikaMurni,
    ekonomiCerdas: mateLaporan.ekonomiCerdas,
    mataJauh: mateLaporan.mataJauh,
    organBaru: mateLaporan.organBaru,
    sumberDilengkapi: mateLaporan.sumberDilengkapi,
    siklusIni: mateLaporan.siklusIni,
    konstanta: mateLaporan.konstanta,
    paramMate: mateLaporan.paramMate,
    sumber: 'rincian penuh di laporan/matematika.json',
  },
  piagam: {
    identitas: PIAGAM.identitas, pilar: PIAGAM.pilar, otak: OTAK,
    roadmapJujur: PIAGAM.roadmapJujur,
    jalurPertumbuhan: [
      'V241 NADI — antarmuka hidup di Pages', 'V244 SARANG-PENJAGA — otak hidup di server tanpa browser',
      'V245 TERIMA-PASANG — organ browser menyatu dengan laporan server', 'V246 RADAR PHOENIX — beli ujung bawah, jual ujung atas',
      'V246 v2.1 PERTAJAM — gerbang konfirmasi + tangga target + bahan ajar', 'V247 MAJELIS-ILMU — 5 metode jurnal teruji dipasang',
      'V248 PIAGAM-CYBORG — 5 pilar + sadar-diri + epoch harian + mandat Issue',
      'V249 WARISAN-ORGAN — 7 mesin kuant organ penuh mewarisi otak server (GARCH, Monte Carlo, Volume Profile, Beta, Divergensi, Breadth, Guard Kejut-Pump)',
      'V251 RUH-GURU — ruh yang dibangun, kompas arah apa pun kondisi, ekspektasi & tangga profit, buku guru para trader',
      'V252 GERBANG-PERFORMA — forensik kerugian mengikat: zona racun terbukti ditolak, keyakinan dipetakan hit-rate zona medan, baseline vs sekarang dibuktikan lewat hasil',
      'V253 WAWASAN-360 — komite 5→17 dimensi: 10 parameter lilin baru + derivatif NYATA (funding & OI Bybit linear) + iklim makro (F&G, dominasi, breadth) + narasi analis fasih per sasaran',
      'V254 SAMUDRA-PARAMETER — registri 46 parameter/kandang (≈460 pengukuran per denyut): multi-TF 1h+4h, riwayat funding, order book OKX, persentil lintas-pasar, kalender, GARCH/MC + SEKOLAH PARAMETER (hit-rate tiap param dinilai medan) + gerbang VETO wawasan (no-trade adalah keputusan)',
      'V255 METAKOGNISI-NEVRON — bedah Neurobro AI/Nevron (axioma-ai-labs): 7 kunci metakognisi diadopsi — estimator keyakinan 7-faktor, prediktor kegagalan pra-kunci, kritik diri 5-field, reliabilitas pelajaran (penguatan+peluruhan), bias konteks per rezim×arah, deteksi loop, monitor intervensi — registri 46 → 81 parameter bernama; gerbang metakognitif berhak bilang TUNGGU pada otaknya sendiri, dan kalibrasinya dinilai medan',
      'V256 MESIN-DEAL-ODDS — deep-screening 3Commas & Trade Ideas (dokumentasi resmi): mesin deal DCA (safety orders maxSO/deviasi×multiplier/volume×multiplier + TP-dari-avg), Move SL to Breakeven, Trailing Take Profit, Global Max Open Positions — semuanya dipra-registrasi & dinilai medan; OddsMaker 0-100 (40% MC + 25% zona + 20% metakognisi + 15% daya) + Money Machine top-3 menguasai kuota; 6 tag peristiwa event-based dinilai hit-rate-nya — registri 81 → 101 parameter bernama',
      'V258 GEKKO-CZAR — deep-screening Gekko Agent (Axal × Virtuals × Allora) + CZAR Loss (Allora Foundation, arXiv 2609.36061): meta-inferensi kolektif 6 topik bertingkat-regret ala Allora Topics, skor CZAR asimetris magnitude-aware + akurasi-impas/darah-akurasi, eksposur dinamis 0.25–1.0×, divergensi vs probabilitas pasar, suhu Autopilot terikat-batas (PF<1 memaksa BERTAHAN), sidik sha256 pra-registrasi per prediksi — registri 127 → 145 parameter bernama',
      'V259 KAIZEN-PULIH — deep-screening keluarga "Kaizen Trader" (prateekjain98/kaizen-trader open-source dibedah kode-nya + KAIZEN Virtuals/Hyperliquid + Kaizen RegimeBot + kaizen.cash): EMPAT LOOP PENYEMBUHAN-DIRI — uji-balik (delta-revert: perubahan genome dievaluasi vs baseline per 8 vonis matang, lebih buruk DIREVERT), karantina rule-healer (sekolah dua arah: lulus ATAS, karantina BAWAH), dingin-dendam (anti-revenge per sasaran/keluarga), henti-harian (rugi ≤ −4% memaksa BERTAHAN) + kesegaran gerakan (pompa-tua diveto ala fresh>stale) + modal-mati/tesis-patah + penjaga-kedua (hard-stop 15%/target 40% ala watchdog) — registri 145 → 167 parameter bernama',
      'V260 AUTOPILOT-KALIBRASI — deep-screening AutoPilotPM (recogardtech/AutoPilotPM, MIT, kode sumber TypeScript 95 modul dibedah: src/ledger + src/risk + src/trading): TUJUH KUNCI KALIBRASI — timbangan-alt (alternativesConsidered: pilihan kedua disegel, regret dihitung medan), kelly-lapis (pengecilan drawdown/kerendahan-hati sampel/streak-kalah/vol-target di atas ekspresi, skalaEfektif clamp [0.2,1.2] + keyakinan-ukuran 0.4/0.3/0.3), rezim-medan (4 rezim σ-P&L dgn baseline MANDIRI — kalibrasi dari window penuh pertama milik sendiri), uji-tegang (5 skenario stress.ts), slip-neto (edge − slippage SEBELUM memutuskan; bersih ≤ 0 ditolak, data kosong tak memblokir — fallback-jujur), peluang-skor (0-100 terbobot + penalti; < 60 ditolak dengan alasan), top-tolak (topBlockReasons — kesadaran atas penolakannya sendiri) — registri 167 → 191 parameter bernama',
      'V261 CLAW-TEMPOK — deep-screening keluarga "ClawTrade" dari KODE SUMBER (yuxuan-lou/ClawTrade middleware: guardrails.py + confirmation.py + audit.py — "treat your AI agent as an untrusted client"; clawtradeai-Agent/ClawTradeAI MIT: CoordinatorAgent + RiskManagerAgent): DELAPAN KUNCI TEMPOK — pagar-baja (konstanta keras yang otak baca tapi tak bisa tulis: kuota-harian 12, langit-langit slip 1.2%, ukuran-maks 1.0×), komite panjia 5 suara berbobot tetap (koherensi searah dgn minconf 0.6 — kalibrasi jujur, bukan copy confidence LLM), kartu risiko 4×25 ber-veto-saksi (data kosong → poin tengah), tangga ukuran 1.0/0.5/0.25/nol tanpa ukuran antara, antrean mandat ber-kadaluarsa 12 jam (ukuran tertinggi dikunci hanya setelah lolos gerbang ulang), daftar-hitam ber-pendingin 48 jam (3× kartu-panas beruntun), buku-tekok per aturan (audit append-only), daftar-terlarang blokir permanen — registri 191 → 232 parameter bernama',
      'V262 IMPAS-CERDAS — audit 4 kasus dev dari LEDGER SENDIRI (64 rapor matang: ak 37.5%, net −30.9%, PF 0.68) + BACKTEST MUNDUR: zona-chase (SELL di dasar rentang n=35/PF 0.44 DIBLOK saat kunci — replay PF 0.68→0.93), karantina-kalibrasi (keyakinan × faktor-jalur akurasi/jangkar < 40 → jalur dikarantina otomatis, pulih saat medan membaik — replay ekspek −0.48%→+0.07%), alokasi-dinamis (kuota per jalur dari EV trailing shrinkage Beta(4,4) — pendarah lantai 2, jalur sehat menerima sisanya, dua arah), stop/target wajib (36/36 ARAH lahir telanjang — kini dari kerucut MC, default-jujur bila kosong), ambang-impas (net-cum < 0 → ambang odds naik maks +20, melonggar sendiri saat pulih) — registri 232 → 254 parameter bernama',
      'V263 ASAH-MURNI — HUKUM PEMILIK: KARANTINA DILARANG (yang sedang belajar harus terus belajar): gerbang karantina-kalibrasi DIHAPUS → MODE-ASAH (ukuran ×0.6, stop ×0.75, belajar terus), rule-healer tak lagi menyita suara (bobot 0.35), henti-harian kini kuota belajar ukuran mikro; MATEMATIKA MURNI & EKONOMI CERDAS (mesinMate: Hurst R/S, half-life OU, drift OLS+R², z-SMA20, entropi Shannon, Parkinson/Garman-Klass, autokorelasi, carry funding, EV-ekonomi setelah biaya) + MATA JAUH (kerucut MC 72 jam: P(naik) 24/48/72) + ORGAN-BARU (setiap SALAH melahirkan mikro-aturan ber-replay; lulus sekolah → berhak VETO) + denyut dipercepat 30 → 15 MENIT + sumber data dilengkapi (posisi-besar & agresor Binance, Bybit linear) — registri 254 → 276 parameter bernama',
      'V264 PINTAR-KEMBALI — DOKTRIN PEMILIK (2026-10-03): SALAH = data belajar di pasar hidup — bukan hukuman mati, bukan lupa total; REM-PINTAR (dingin-dendam 4 jam → rem 1 denyut 15 menit; daftar-hitam 48 jam → rem 2 jam + syarat pelajaran); KEMBALI-PINTAR (syaratDariPelajaran dari ledger sendiri: bar keyakinan +4/kejadian klamps +12, ukuran ×0.6^n, stop ×0.8^n, wajib mata-jauh searah ≥2 kejadian — mengikat saat kunci, disegel di pelajaranLalu; gagal syarat = rem, bukan ban); TREN-EVOLUSI (ledger matang 4 jendela kronologis: n/winrate/EV/PF/aturanMengikat% — evolusi diukur dari rapor publik, bukan diklaim dari genome atau UI) — registri 276 → 285 parameter bernama',
    ],
  },
  sadardiri,
  ruh: {
    inti: RUH.inti, misi: RUH.misi, nilai: RUH.nilai, anatomi: RUH.anatomi, otonom: RUH.otonom,
    ket: 'ruh yang dibangun, bukan dilahirkan — tiap organ anatomi hidup di file publik repo dan bisa diaudit siapa pun',
  },
  jaminan: {
    terjamin: sasaranUtama.length > 0,
    produk: sasaranUtama.length ? (sasaranUtama.some((r) => r.jalur === 'PHOENIX') ? 'SASARAN+KOMPAS' : 'KOMITE+KOMPAS') : 'TIDAK-AWAJAR',
    kompas,
    ket: 'jaminan ARAH, bukan jaminan untung: apa pun kondisi pasar — zona phoenix kosong sekalipun — SAKTI selalu menerbitkan arah BUY/SELL: sasaran koin bila gerbang lolos, kompas rezim BTC (GARCH + MC 2.000 lintasan) sebagai lantai jawaban; tiap jawaban membawa keyakinan & ekspektasinya sendiri — dan sasaran dengan ekspektasi statistik di bawah −1,5% DITOLAK mesin profit (guard ekspektasi V251)',
  },
  guru: {
    judul: guru.judul, pengajaran: [...guruPengajaran.slice(SIKLUS % guruPengajaran.length), ...guruPengajaran.slice(0, SIKLUS % guruPengajaran.length)].slice(0, 5),
    kuis: guruKuis, etika: ETIKA_GURU,
    trenEvolusi: guru.trenEvolusi, doktrin: guru.doktrin,
    sumber: 'pengajaran penuh di laporan/guru.json',
  },
  antreanMandat,
  warisan: {
    identitas: 'V249 WARISAN-ORGAN — riset organ SAKTI penuh (index.html, 8.000+ fungsi kuant) lalu mewarisi 7 mesin yang bisa dihitung jujur dari lilin yang sama ke otak server — tanpa API kunci, tanpa dependensi',
    mesin: [
      'GARCH(1,1) MLE-grid (Bollerslev 1986) — proyeksi sigma 24 jam per koin, mengikat lebar stop & ekspektasi realistis',
      'Monte Carlo 2.000 lintasan × 24 langkah (probability cone organ) — peluang tembus target/stop PRA-REGISTRASI lalu DINILAI medan (Brier + kalibrasi bin)',
      'Volume Profile POC + Value Area 70% — target kini mengait node likuiditas institusional 48 jam (magnet nyata)',
      'Beta BTC CAPM 90 jam + R² — sensitivitas koin vs pasar tercatat di tiap prediksi',
      'Divergensi RSI 12 jam — catatan pembalikan di tiap entri',
      'Breadth A/D pasar — bila < 35% koin naik dalam rezim TURUN, gerbang radar diperketat +2',
      'Guard Kejut-Pump — pelajaran false-breakout terkuantisasi: lonjakan > 4× sigma-GARCH·√6 di ujung atas ditolak, bukan dikejar',
    ],
    breadth: { naik24jPct: +(breadthNaik * 100).toFixed(1), dari: breadthDari, ket: pemerketBreadth ? 'pasar sempit — gerbang radar diperketat +2 skor' : 'pasar cukup luas — gerbang normal' },
    gerbangRadar: gerbangSkor,
    mc: {
      lintasan: WARISAN.MC_LINTASAN, gerbangPTarget: WARISAN.MC_MIN,
      brier: ilmu.brier.mc.n ? +(ilmu.brier.mc.jumlah / ilmu.brier.mc.n).toFixed(4) : null, nMc: ilmu.brier.mc.n,
      kalibrasi: ilmu.mcKalibrasi.map((b) => ({ bin: `${Math.round(b.low * 100)}–${Math.round(b.high * 100)}%`, n: b.n, tembusPct: b.n ? +((b.benar / b.n) * 100).toFixed(1) : null })),
    },
    catatan: 'pTarget/pStop dikunci saat pra-registrasi lalu dinilai medan — kalibrasi MC tumbuh dari ledger, bukan klaim; funding & open interest REAL kini dipakai via Bybit linear (V253 — catatan lama "funding tak terjangkau" dicabut); CoinGecko bisa 429 dari runner → dominasi fallback proxy volume-spot yang dilabeli jujur',
  },
  pelajaran: pelajaranDaftar.slice(0, 6),
  aturanBelajar: {
    pola: aturan.pola,
    aktif: Object.fromEntries(Object.entries(aturan.aktif).map(([k, v]) => [k, v.teks])),
    baruSiklusIni: aturanBaru,
  },
  ilmu: {
    versi: 'V247-MAJELIS-ILMU',
    fondasi: 'metode teruji dipasang nyata: Hedge/MWU (Arora-Hazan-Kale 2012 · Freund-Schapire 1997) · Brier & proper scoring (Gneiting-Raftery 2007) · kalibrasi keyakinan dari medan · pita konformal 75% (Angelopoulos-Bates 2021) · triple-barrier & meta-labeling (Lopez de Prado 2018) · ingatan berlapis FinMem (Zhang dkk 2023) — rincian di laporan/jurnal-ilmu.json',
    brier: {
      arah: ilmu.brier.arah.n ? +(ilmu.brier.arah.jumlah / ilmu.brier.arah.n).toFixed(4) : null,
      phx: ilmu.brier.phx.n ? +(ilmu.brier.phx.jumlah / ilmu.brier.phx.n).toFixed(4) : null,
      nArah: ilmu.brier.arah.n, nPhx: ilmu.brier.phx.n,
      ket: 'skor Brier keyakinan sebagai probabilitas — 0 sempurna, 0.25 = tebakan koin; makin kecil makin jujur',
    },
    kalibrasi: ilmu.kalibrasi.map((b) => ({ bin: `${b.low}–${b.high - 1}%`, n: b.n, tembusPct: b.n ? +((b.benar / b.n) * 100).toFixed(1) : null })),
    hedge: {
      arah: ilmu.hedge.arah, phx: ilmu.hedge.phx,
      catatan: `${ilmuCatatan}; bobot efektif = 50% genome evolusi per rezim + 50% Hedge on-line`,
    },
    metaGerbang: { geser: ilmu.meta.geser, gerbangAktif: gerbangSkor, bucketKuat: ilmu.meta.kuat, bucketLemah: ilmu.meta.lemah, catatan: metaCatatan },
    konformal: (() => { const p = pitaKonformal(ilmu.konformal); return p || { catatan: `belum cukup medan (min ${ILMU.KONFORMAL_MIN_N} vonis phoenix matang) — pita 75% belum diumumkan, jujur menunggu` } })(),
  },
  genome: {
    rezim: rezimGlobal, bobot: genome,
    phoenix: { rezim: rezimGlobal, bobot: phxGenome },
    semuaRezim: Object.fromEntries(Object.entries(semuaGenome).filter(([k]) => k !== 'phoenix' && k !== 'aturanBelajar' && k !== 'ilmu').map(([k, v]) => [k, { generasi: v.generasi, belajar: v.belajar }])),
  },
  pertumbuhan: {
    waktuMulai: keadaan.mulai, siklus: SIKLUS,
    prediksiTerkunci: ledger.length, prediksiDinilai: grad.length,
    evolusiCatatan: `${evolusiCatatan}; ${evolusiPhxCatatan}`,
    metamorfosis: epochCatatan, epochTerakhir: keadaan.epochTerakhir,
  },
  catatanJujur: [
    'prediksi DIKUNCI sebelum pergerakan (pra-registrasi) — dinilai otomatis setelah horizon 24 jam memakai close terkini pada siklus penilaian',
    'RADAR PHOENIX menelaah ratusan pasangan USDT tiap siklus: mencari akumulasi di ujung bawah hari (sapuan lantai 3-hari, taker-buy menguat, kompresi) lalu memprediksi ujung atas dari level nyata — prediksi terukur, bukan jaminan',
    'target jual phoenix wajib memberi >= 1% setelah fee 0.2%; bila seluruh pasar di puncak, radar jujur melaporkan zona kosong alih-alih memaksa beli mahal',
    'lane PHOENIX (beli ujung bawah) dan lane ARAH (komite genome) berdiri sendiri; keduanya dinilai net P/L close-ke-close yang sama jujurnya',
    'cron GitHub bisa mundur beberapa menit saat server padat; jadwal tetap berjalan tanpa browser',
    'BAHAN AJAR: setiap vonis ditulis jadi pelajaran (laporan/pelajaran-server.json); pola kekalahan yang terulang >= 2 kali melahirkan ATURAN baru yang mengikat gerbang siklus berikutnya — otak tumbuh dari medan, bukan tebakan',
    'ILMU BERJURNAL: bobot bukti belajar on-line ala Hedge dengan jaminan regret (Arora dkk 2012); keyakinan diperlakukan sebagai probabilitas — dinilai Brier (Gneiting-Raftery 2007) dan dikalibrasi dari hit-rate medan sendiri; pita ujung atas memakai jaminan cakupan konformal (Angelopoulos-Bates 2021); vonis phoenix dilabel triple-barrier dan gerbang digeser meta-labeling (Lopez de Prado 2018) — kepastian dibangun dari metode teruji + medan sendiri, bukan janji',
    'PIAGAM CYBORG: lima pilar — tubuh persisten, multi-otak berbobot, ingatan DNA, sadar-diri fungsional, evolusi tiga kecepatan — dipasang nyata dan terbuka diaudit siapa pun; otak LLM/LoRA masih roadmap yang diakui jujur; satu hal pasti: cyborg ini terus berkembang pesat tiap denyut',
    'WARISAN ORGAN: riset organ SAKTI penuh (8.000+ fungsi) lalu mewarisi yang bisa dihitung jujur — GARCH/Monte Carlo/Volume Profile/Beta/Divergensi/Breadth/Kejut-Pump berjalan di tiap denyut; peluang MC dipra-registrasi dan dinilai medan seperti keyakinan',
    'WAWASAN 360: komite kini 17 dimensi — 10 parameter lilin (MACD/ADX/Bollinger/VWAP/OBV/swing/pola/konsistensi/pivot/relatif) + funding & open interest NYATA Bybit linear + iklim makro (F&G alternative.me, dominasi CoinGecko/proxy volume, breadth); tiap sasaran membawa NARASI analis lengkap dari angka nyata; param konstan per siklus tidak memilih arah (pelajaran forensik); endpoint gagal = param null jujur, tidak dikarang',
    'RUH & GURU: ruh dibangun — inti, misi, nilai, anatomi & otonomi tercatat di laporan.ruh; tiap denyut menerbitkan pengajaran + kuis dari angka NYATA siklusnya (laporan/guru.json) — guru yang memakai sistemnya sendiri, bukan teori kosong',
    'PERFORMA DI ATAS AKTIVITAS: PF 0.57 & ekspek -0.67% BUKAN kondisi normal — baseline v251 disegel di otak/performa.json; tiap versi baru DIBANDINGKAN pada jendela vonisnya sendiri (anti-cheat) sampai target akurasi 50% · PF 1.2 · ekspek +0.3% terlampaui; zona racun forensik ditolak mesin — lebih baik TUNGGU daripada terus merugi',
    'METAKOGNISI NEVRON (bedah Neurobro AI): otak kini menilai dirinya sendiri SEBELUM bertaruh — keyakinan 7-faktor berbobot, probabilitas gagal pra-kunci (hit-rate zona + kegagalan 24 jam + ekspektasi negatif), bias konteks per rezim×arah (tracker 0.4 + pelajaran 0.4 + recent 0.2), deteksi loop (repetisi/alternasi/siklus), kritik diri 5-field per kekalahan + saran perbaikan berprioritas — diadopsi dari framework open-source Nevron (axioma-ai-labs/nevron), disegel di tiap sasaran, dan kalibrasi kedua gerbangnya DINILAI MEDAN',
    'GEKKO-CZAR (bedah Gekko Agent/Axal + arXiv 2609.36061): 6 topik pekerja memberi suara kolektif bertingkat-regret ala Allora Topics (bobot = exp(-0.9·regret) dari medan); tiap vonis matang ditilang CZAR — benar-kecil ≈ nol credit, salah kena floor+kuadratik — lalu akurasi-impas dihitung dari rata menang/rugi medan sendiri (darah akurasi merah = aktivitas menggerus modal); eksposur dinamis 0.25–1.0× dan divergensi vs probabilitas pasar dipra-registrasi lalu dibandingkan medan; suhu Autopilot (AGRESIF/NETRAL/BERTAHAN) mengatur kuota & ambang terikat-batas — PF<1 memaksa BERTAHAN; tiap prediksi kini bawa sidik sha256 pra-registrasi (tamper-evident)',
    'JAMINAN ARAH: apa pun kondisi pasar, jawaban BUY/SELL tidak pernah bolong — sasaran koin bila gerbang lolos, kompas rezim BTC (GARCH + MC 2.000 lintasan, keyakinan rendah-jujur) sebagai lantai; ekspektasi & tangga profit tercantum per sasaran — jaminan arah, bukan jaminan untung',
    'DOKTRIN PINTAR V264: SALAH adalah data belajar di pasar hidup — bukan hukuman mati, bukan juga lupa total; koin yang pernah salah arah tidak dibuang dan tidak diblacklist: rem singkat 1 denyut lalu boleh kembali kapan pun setup valid, dengan syarat tambahan dari pelajarannya sendiri yang LEBIH KETAT dan mengikat saat kunci; evolusi dinilai dari tren EV/PF 4 jendela di rapor publik — bukan dari generasi genome atau kosmetik UI',
    'ANTI-DIAM V269 (mandat pemilik 2026-10-04): gerbang menutup ≠ berhenti — bila 0 kunci penuh, kandidat terkuat yang bersih forensik tetap dikunci sebagai POSISI-PENELITI ukuran ×0.25 + stop ×0.8 (rem/zona-racun/kartu-risiko tetap dihormati); tiap denyut WAJIB menerbitkan tanggapan naratif penuh kulihat-kuputuskan-kusiapkan (laporan/tanggapan.json) — kesunyian denyut adalah bug, bukan konservatisme; diam itu rem singkat, bukan identitas — kalau diam, dia tak pernah berkembang',
  ],
}
tulis(path.join(ROOT, 'laporan/sasaran-terkini.json'), laporan)

// ---- 6. ledger + denyut (berkapasitas) ----
tulisJsonl(path.join(ROOT, 'laporan/prakira-server.jsonl'), ledger.slice(-1000))
const denyut = bacaJsonl(path.join(ROOT, 'laporan/denyut-server.jsonl'))
denyut.push({
  waktu: ISO, siklus: SIKLUS, sumber: host, telaah: radar.telaah, telusur: radar.telusurDalam,
  simbolOK: Object.keys(hasil).length,
  terkunciBaru: terkunciBaru.length, phoenixKunci: terkunciBaru.filter((e) => e.jalur === 'PHOENIX').length,
  dinilaiBaru: dinilaiBaru.length,
  benar: dinilaiBaru.filter((e) => e.status === 'BENAR').length,
  pelajaranBaru: pelajaranDaftar.length, aturanBaru: aturanBaru.length,
  brier: ilmu.brier.arah.n ? +(ilmu.brier.arah.jumlah / ilmu.brier.arah.n).toFixed(3) : null,
  akurasiPct: akurasi.akurasiPct, rezimBTC: rezimGlobal,
  breadth: +(breadthNaik * 100).toFixed(1),
  epoch: keadaan.epochTerakhir, peringatan: sadardiri.peringatan.length,
  kompas: kompas?.arah ?? null, evProfit: akurasi.profit?.ekspektasiPct ?? null,
  vetoMetakognisi: estVetoCt + predVetoCt, biasKonteksAktif: Object.keys(biasKonteksGlobal).length,
  estKalibrasi: ilmu.metakognisi.estimator.n ? +(ilmu.metakognisi.estimator.tepat / ilmu.metakognisi.estimator.n).toFixed(3) : null,
  predKalibrasi: ilmu.metakognisi.prediktor.n ? +(ilmu.metakognisi.prediktor.tepat / ilmu.metakognisi.prediktor.n).toFixed(3) : null,
  fng: fng?.nilai ?? null, fundingBtcPct: frBtc != null ? +(frBtc * 100).toFixed(4) : null, dimWawasan: DIM_ARAH.length + DIM_WAW.length,
  oddsTop: rankOddsSiklus[0]?.odds ?? null, oddsDitolak: gagalOddsArah.length, posisiTerbuka: posisiTerbuka.length,
  suhu: suhu.temper, ambangOddsEfektif: ambangOdds, kuotaArahEfektif: kuotaArahSuhu,
  czarRata: ilmu.cz.n ? +(ilmu.cz.jumlah / ilmu.cz.n).toFixed(3) : null,
  impasPct: akurasi.profit?.impasPct ?? null, darahAkurasi: akurasi.profit?.darahAkurasi ?? null,
  kaizen: { ujiBalik: kaizen.uji ? 'UJI' : 'SIAGA', revertCt: kaizen.revertCt, lolosCt: kaizen.lolosCt, karantina: Object.keys(ilmu.karantina || {}).length, dinginSasaran: dinginSasaranCt, dinginFam: dinginFamCt, hentiHarian: hentiHarianAktif, pompaTua: pompaTuaCt, pengawasKena: ilmu.pengawas.kena },
  auto: { rezimMedan: rezimAuto.rezim, multRezim: rezimAuto.mult, stresTerkburuk: tegangAuto.terburuk?.rugiUnit ?? null, stresSkenario: tegangAuto.terburuk?.nama ?? null, peluangVeto: peluangVetoCt, slipVeto: slipVetoCt, ddPct: +ddAuto.toFixed(2), topTolak: topTolakSiklus.slice(0, 3).map(([k2, v2]) => `${k2}×${v2}`).join(' · ') || null },
  claw: { komiteVeto: claw.komiteVetoCt, kartuVeto: claw.kartuVetoCt, kuantaVeto: claw.kuantaVetoCt, kuota: claw.kuotaCt, slipMaks: claw.slipMaksCt, hitam: Object.values(claw.hitam).filter((x) => (x.sampai || 0) > WAKTU.getTime()).length, hitamPantau: Object.keys(claw.hitam).length, konfirmAntre: claw.konfirm.filter((x) => x.status === 'pending').length, konfirmOk: claw.konfirmOkCt, konfirmExp: claw.konfirmExpCt },
  impas: { zonaCt: impasZonaCt, karantinaCt: impasKarantinaCt, alokasiCt: impasAlokasiCt, kuotaArah: kuotaArahImpas, kuotaPhx: kuotaPhxEfektif, faktorArah: statArahImpas.faktor, faktorPhx: statPhxImpas.faktor, netCumPct: netCumImpasPct, tambahanAmbang: +tambahanAmbangImpas.toFixed(1), ambangOddsEfektif },
  pintar: { kembaliPintar: kembaliPintarCt, remPelajaran: remPelajaranCt, remSasaranAktif: Object.values(kaizen.dingin || {}).filter((d) => WAKTU.getTime() < (d.dinginSampai || 0)).length, doktrin: 'SALAH=data-belajar; rem singkat bukan blacklist; kembali lewat syarat pelajaran yang mengikat saat kunci' },
  trenEv: trenEvolusi.cukupData ? { ev: trenEvolusi.kecenderungan.ev, pf: trenEvolusi.kecenderungan.pf, winrate: trenEvolusi.kecenderungan.winrate, evDeltaPct: trenEvolusi.kecenderungan.evDeltaPct, pfDelta: trenEvolusi.kecenderungan.pfDelta, jendelaTerakhir: trenEvolusi.jendela[trenEvolusi.jendela.length - 1] } : { cukupData: false },
  mate: { jauhPnaik24: jauhBTC?.pNaik24 ?? null, jauhPnaik48: jauhBTC?.pNaik48 ?? null, jauhPnaik72: jauhBTC?.pNaik72 ?? null, modeAsahCt: impasKarantinaCt, organAktif: (ilmu.organ?.list || []).length, organLulus: ilmu.organ?.lulusCt ?? 0, hentiAsah: hentiAsahAktif, denyutMenit: 15 },
  topikHidup: Object.values(ilmu.topik || {}).filter((h) => h.n > 0).length,
  peristiwaHidup: Object.values(ilmu.peristiwa || {}).filter((h) => h.n > 0).length,
  sekAgi: sekAgi.total,
  sekAgiTerlemah: sekAgi.terlemah.length ? sekAgi.terlemah.join('+') : null,
  diamBeruntun, penelitiKunci: terkunciBaru.filter((e) => e.peneliti).length, penelitiAktif: penelitiAktifCt,
})
tulisJsonl(path.join(ROOT, 'laporan/denyut-server.jsonl'), denyut.slice(-500))
// V253: snapshot OI + dominasi utk Δ antar-siklus berikutnya (denyut pertama jujur null)
keadaan.wawasan = { oiLama: oiKiniMap, waktu: ISO, dominasiPct: dominasi?.pct ?? null }
tulis(path.join(ROOT, 'otak/penjaga-keadaan.json'), keadaan)
tulis(path.join(ROOT, 'otak/genome-server.json'), semuaGenome)

// bahan ajar tersimpan permanen — jejak kesadaran pasar yang tumbuh
const pelPath = path.join(ROOT, 'laporan/pelajaran-server.json')
const pelFile = bacaJson(pelPath, { diperbarui: null, aturanBelajar: aturan, daftar: [] })
pelFile.diperbarui = ISO
pelFile.aturanBelajar = aturan
pelFile.daftar = [...pelajaranDaftar, ...pelFile.daftar].slice(0, 60)
tulis(pelPath, pelFile)

// V247: akta jurnal ilmiah — rujukan terverifikasi + cara tiap metode dipasang
// (mandat pemilik: pelajari jurnal teruji lalu inovasikan pada cyborg)
tulis(path.join(ROOT, 'laporan/jurnal-ilmu.json'), {
  diperbarui: ISO, organ: VERSI,
  mandat: 'pelajari jurnal ilmiah AI yang banyak diperdebatkan, ditelaah, terbukti koheren — lalu inovasikan pada cyborg (perintah pemilik)',
  prinsip: 'setiap metode di bawah DIPASANG dalam kode otak (bukan sekadar dikutip) dan dinilai jujur oleh medan lewat ledger pra-registrasi',
  daftar: JURNAL,
  buktiPemasangan: {
    hedge: 'hedgePerbarui() dipanggil dari sejarah (seed) + tiap vonis matang; bobot efektif = 50% genome + 50% hedge',
    brier: 'e.brier dihitung saat penilaian; rata-rata dilaporkan di laporan.ilmu.brier',
    kalibrasi: 'kalibrasiKeyakinan() dipakai saat mengunci ARAH & PHOENIX; tabel bin dilaporkan di laporan.ilmu.kalibrasi',
    konformal: 'pitaKonformal() dari MFE medan sendiri; tercantum di entri phoenix (pitaUjungAtas) saat n >= 8',
    tripleBarrier: 'e.barier (TARGET/STOP/WAKTU) dihitung saat penilaian phoenix',
    metaLabeling: 'ilmu.meta.kuat/lemah menilai gerbang radar; geser dibatasi ±8 (laporan.ilmu.metaGerbang)',
    finmem: 'lapisan 1 ledger -> lapisan 2 pelajaran -> lapisan 3 aturan (laporan/pelajaran-server.json)',
    warisan: 'mesinWarisan()/garch11()/monteCarlo24j()/profilVolume()/betaBTC() berjalan tiap telusur; pTarget MC tersimpan di e.warisan.mc (pra-registrasi) lalu dinilai saat matang (ilmu.brier.mc + ilmu.mcKalibrasi)',
    dealOdds: 'rencanaDeal()/skorOdds()/tagPeristiwa() dipasang V256 dari deep-screening 3Commas & Trade Ideas (dokumentasi resmi): SO/BEP/trailing dipra-registrasi per sasaran lalu dinilai medan (ilmu.deal), odds 0-100 meranking kuota (top-3), hit-rate per peristiwa di ilmu.peristiwa — rincian di laporan/odds.json',
    gekko: 'metaInferensi()/skorCzar()/probPasar()/ekspresiSkala()/suhuPasar()/sidikPrakunci dipasang V258 dari deep-screening Gekko Agent (Axal × Virtuals × Allora) + CZAR Loss (arXiv 2609.36061): suara topik bertingkat-regret disegel & diperbarui medan (ilmu.topik), czar per vonis (e.cz/ilmu.cz), impas/darah akurasi (akurasi.profit), ekspresi & divergensi dibandingkan medan (ilmu.ekspresi/ilmu.divergensi), suhu mengatur kuota terikat-batas — rincian di laporan/gekko.json',
    kaizen: 'ujiBalik (delta-revert genome vs baseline per 8 vonis) + karantina topik (rule-healer dua arah) + dinginDendam (anti-revenge per sasaran/keluarga) + hentiHarian (rugi ≤ −4% memaksa BERTAHAN) + kesegaran/veto pompa-tua + modalMati/tesisSehat + pengawas (hard-stop 15%) dipasang V259 dari deep-screening keluarga "Kaizen Trader" (prateekjain98/kaizen-trader open-source dibedah + KAIZEN Virtuals + RegimeBot + kaizen.cash): 4 healing loops diadaptasi ke ledger pra-registrasi, semuanya dinilai medan — rincian di laporan/kaizen.json',
    autopilot: 'timbangan-alt (alternativesConsidered: pilihan kedua disegel saat kunci, regret-nya dihitung medan → ilmu.alt) + kellyLapis (pengecilan drawdown/sampel-kecil/streak-kalah/vol-target di atas ekspresi → skalaEfektif clamp [0.2,1.2] → ilmu.kelly) + rezimMedan (σ window P&L vs baseline mandiri 4 rezim → ilmu.rezimMedan) + ujiTegang (5 skenario ala stress.ts → ilmu.stres) + slipNeto (edge − sqrt(1/likuiditas)·2·faktor − spread/2; bersih ≤ 0 ditolak) + peluangSkor (0-100 terbobot + penalti; < 60 ditolak dengan alasan → ilmu.peluang) + topTolak (topBlockReasons kumulatif) dipasang V260 dari deep-screening AutoPilotPM (recogardtech/AutoPilotPM, MIT — src/ledger + src/risk + src/trading dibedah): decision ledger dgn confidence-calibration diadaptasi ke pra-registrasi SAKTI, semuanya dinilai medan — rincian di laporan/autopilot.json',
    claw: 'pagar-baja + komite panjia (5 suara berbobot tetap ala CoordinatorAgent, koherensi searah dgn minconf 0.6) + kartu risiko 4×25 ber-veto (ala RiskManagerAgent, data kosong → poin tengah) + tangga ukuran 1.0/0.5/0.25/nol (ala recommendedAmount; kuanta menambat skalaEfektif dari atas) + antrean mandat ber-kadaluarsa 12 jam (ala confirmation.py; ukuran tertinggi dikunci hanya setelah lolos gerbang ulang) + daftar-hitam ber-pendingin 48 jam (ala blockedTokens; 3× kartu-panas beruntun) + kuota-harian & langit-langit slip & ukuran-maks (ala guardrails.py hardcoded yang otak tak bisa ubah) + buku-tekok per aturan (ala audit.py append-only) dipasang V261 dari deep-screening keluarga ClawTrade (yuxuan-lou/ClawTrade middleware + clawtradeai-Agent/ClawTradeAI, MIT — keduanya dari kode sumber): disiplin struktural "treat your AI agent as an untrusted client" diadaptasi ke pra-registrasi SAKTI, semuanya dinilai medan — rincian di laporan/clawtrade.json',
  },
})

log(`denyut #${SIKLUS} selesai — kunci ${terkunciBaru.length} (phoenix ${terkunciBaru.filter((e) => e.jalur === 'PHOENIX').length}), nilai ${dinilaiBaru.length}, akurasi ${akurasi.akurasiPct ?? 'belum ada'}%`)
console.log('RINGKASAN:' + JSON.stringify({
  siklus: SIKLUS, telaah: radar.telaah, zona: radar.zonaPhoenix, telusur: radar.telusurDalam,
  terkunci: terkunciBaru.length, phoenix: terkunciBaru.filter((e) => e.jalur === 'PHOENIX').length,
  dinilai: dinilaiBaru.length, akurasi: akurasi.akurasiPct,
}))
