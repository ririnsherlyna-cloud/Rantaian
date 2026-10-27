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
const VERSI = 'V254-SAMUDRA-PARAMETER v5.0 — dari 17 dimensi ke ~60 parameter per kandang × 10 kandang + iklim 15-an: multi-timeframe 1h+4h (EMA-align/MACD/RSI/Bollinger/swing), derivatif dalam (riwayat funding rata3+tren, order-book imbalance/spread/kedalaman/dinding, ΔOI), lintas-pasar (persentil perubahan & volume ratusan swap OKX, breadth, altseason-proxy), volatilitas-rezim (ATR-persentil, volume z-score, GARCH, MC-pNaik), kalender (sesi Asia/Eropa/AS, akhir pekan, fase bulan) + SEKOLAH PARAMETER (tiap param dicatat per prediksi, hit-rate dinilai medan) + gerbang VETO wawasan (order book & tren-4h & kerumunan funding menolak sinyal buruk)'

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
}
// registri parameter observasi (diluar 12 inti) — dipakai untuk hitungan total & dasbor
const PARAM_OBS = ['ema1h','rsi1h','roc12','roc48','stoch','mfi','cci','jarakEkstrem','atrPctile','volZ','bodyRatio','ema4h','macd4h','rsi4h','bb4h','swing4h','sejajar4h','atrRatio','fundRata3','fundTren','bukuImbalans','bukuSpread','bukuKedalaman','bukuDinding','persenChg','persenVol','sesi','akhirPekan','faseBulan','garchSigma','betaBTC','divRSI','pocJarak','mcPnaik']
const TOTAL_PARAM_NAMA = DIM_WAW.length + PARAM_OBS.length
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
  { nama: 'otak-wawasan', tugas: 'registri 46+ parameter wawasan crypto per kandang — lilin 1h+4h, derivatif dalam, order book, lintas-pasar, kalender, kuant-warisan — plus narasi analis fasih per sasaran', mesin: 'multi-timeframe (EMA-align/MACD/RSI/Bollinger/swing 1h+4h) + riwayat funding rata3/tren + order book OKX (imbalance/spread/kedalaman/dinding) + persentil lintas-pasar swap + F&G-7hari/dominasi/altseason + GARCH/MC/beta/POC + kalender; 12 inti berbobot (genome+Hedge), observasi diveto-kan & bersekolah hit-rate', status: 'HIDUP (V254)' },
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
    return { target: palingJauh, ketTarget: 'tak ada magnet nyata di depan — radar menolak', untung: palingJauh / entry - 1 - FEE, lemah: true }
  }
  const hiAmbisius = Math.min(swing7h, batas)
  return {
    target: pilih.level, ketTarget: pilih.ket, untung: pilih.level / entry - 1 - FEE, lemah: false,
    highAmbisius: hiAmbisius > pilih.level ? +hiAmbisius.toPrecision(7) : null,   // catatan belajar, bukan sasaran resmi
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
  if (ctx.war) {                                          // param warisan-kuant (dari mesin yang sama)
    if (ctx.war.garch?.sigma24jPct != null) push('garchSigma', 'volatilitas', { nilai: ctx.war.garch.sigma24jPct, arah: 0, ket: `GARCH(1,1): sigma 24 jam ±${ctx.war.garch.sigma24jPct}% — ukuran posisi & lebar stop ditetapkan dari sini` })
    if (ctx.war.beta != null) push('betaBTC', 'relatif', { nilai: +ctx.war.beta.toFixed(2), arah: 0, ket: `beta vs BTC 90 jam ${ctx.war.beta.toFixed(2)} (R² ${(ctx.war.r2 ?? 0).toFixed(2)}) — ${ctx.war.beta > 1.2 ? 'amplifier pasar: naik lebih tinggi, jatuh lebih dalam' : ctx.war.beta < 0.8 ? 'bantal defensif terhadap gejolak BTC' : 'bergerak seiring pasar'}` })
    if (ctx.war.div) push('divRSI', 'momentum', { nilai: ctx.war.div, arah: ctx.war.div.includes('bullish') ? 0.6 : ctx.war.div.includes('bearish') ? -0.6 : 0, ket: `divergensi RSI 12 jam: ${ctx.war.div}` })
    if (ctx.war.vp?.poc != null) push('pocJarak', 'aliran', { nilai: +(((ctx.war.vp.poc / c[c.length - 1].c) - 1) * 100).toFixed(2), arah: ctx.war.vp.poc > c[c.length - 1].c ? 0.3 : -0.3, ket: `POC volume 48 jam ${(+ctx.war.vp.poc).toPrecision(7)} (${ctx.war.vp.poc > c[c.length - 1].c ? 'di atas harga — magnet tarik naik' : 'di bawah harga — magnet tarik turun'})` })
  }
  if (ctx.mc?.pNaik != null) push('mcPnaik', 'volatilitas', { nilai: +(ctx.mc.pNaik * 100).toFixed(1), arah: clamp((ctx.mc.pNaik - 0.5) * 2.4, -1, 1), ket: `Monte Carlo 2.000 lintasan: peluang naik dalam 24 jam ${(ctx.mc.pNaik * 100).toFixed(0)}% — ${ctx.mc.pNaik > 0.55 ? 'distribusi condong naik' : ctx.mc.pNaik < 0.45 ? 'distribusi condong turun' : 'koin flip statistik'}` })
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
  const k6 = `Komite ${DIM_ARAH.length + DIM_WAW.length} dimensi berbobot (diawasi ${TOTAL_PARAM_NAMA} parameter bernama + sekolah hit-rate) memilih ${v.arah} (keyakinan ${v.keyakinan}/100 — dikalibrasi medan): ${bagus.length} parameter ${sgn}${lawan.length ? `, ${lawan.length} melawan (${lawan.map((p) => p.param).join(', ')})` : ' tanpa penentang keras'}.`
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
const SIKLUS = keadaan.siklus

// ---- 0d. V253 WAWASAN-360 — derivatif NYATA + sentimen + dominasi (1x per denyut) ----
// Pertama kali otak server memakai funding rate & open interest NYATA.
// Rantai host derivatif (pelajaran denyut pertama: api.bybit.com diblokir runner
// Actions → 4 lapis: bybit → bytick (cermin) → fapi Binance premiumIndex+OI →
// OKX per-simbol kandang) — semua gagal = param jujur null, tidak dikarang.
const wawCatatan = []
const NORM_DERIV = (fundingRate, openInterestValue, price24hPcnt) => ({ fundingRate, openInterestValue, price24hPcnt })
async function ambilDeriv() {
  // (a) Bybit linear (asli + cermin bytick) — 1 permintaan: funding + OI + chg24h semua simbol
  for (const hb of ['https://api.bybit.com', 'https://api.bytick.com']) {
    try {
      const dl = await ambilJson(hb + '/v5/market/tickers?category=linear', 20000)
      const ls = dl?.result?.list || []
      if (!ls.length) throw new Error('daftar kosong')
      wawCatatan.push(`derivatif ${hb.replace('https://', '')} linear: ${ls.length} simbol (funding + OI)`)
      return new Map(ls.map((x) => [x.symbol, NORM_DERIV(+x.fundingRate, +x.openInterestValue, +x.price24hPcnt)]))
    } catch (e) { wawCatatan.push(`derivatif ${hb.replace('https://', '')} gagal (${String(e.message).slice(0, 36)})`) }
  }
  // (b) Binance fapi — premiumIndex 1 permintaan (funding semua simbol) + OI per kandang
  try {
    const pi = await ambilJson('https://fapi.binance.com/fapi/v1/premiumIndex', 20000)
    const ls = Array.isArray(pi) ? pi : []
    if (!ls.length) throw new Error('premiumIndex kosong')
    const m = new Map(ls.map((x) => [x.symbol, NORM_DERIV(+x.lastFundingRate, 0, 0)]))
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
      if (frr != null) m.set(s + 'USDT', NORM_DERIV(frr, oiUsd, 0))
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
if (!ilmu.hedge || !ilmu.hedge.arah) ilmu.hedge = { arah: { ...GENOME_AWAL }, phx: { ...PHX_AWAL } }
if (!ilmu.brier) ilmu.brier = { arah: { n: 0, jumlah: 0 }, phx: { n: 0, jumlah: 0 } }
if (!Array.isArray(ilmu.kalibrasi) || !ilmu.kalibrasi.length)
  ilmu.kalibrasi = ILMU.BIN_KALIBRASI.map(([low, high]) => ({ low, high, n: 0, benar: 0 }))
if (!Array.isArray(ilmu.konformal)) ilmu.konformal = []
if (!ilmu.meta) ilmu.meta = { kuat: { n: 0, benar: 0 }, lemah: { n: 0, benar: 0 }, geser: 0 }
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

// 1a. lane ARAH — komite genome di kandang 10 mayor
// V252: DUA TAHAP — hitung semua kandidat dulu, lalu gerbang forensik memisahkan
// yang layak dari zona racun terbukti (mandat investor: "berani mengurangi atau
// menolak sinyal buruk — lebih baik tidak mengambil posisi daripada merugi").
const kandidatArah = []
for (const s of KANDANG) {
  const c = hasil[s]; if (!c) continue
  const id = `${s}-${TGL}`
  if (ledger.some((e) => e.id === id)) continue                    // satu per simbol per hari UTC
  const b = dewanBukti(c)
  const wawCtx = { deriv, oiLama: oiLamaMap?.[s], frHist: frHistMap.get(s), frKini: deriv?.get(s + 'USDT') ? +(deriv.get(s + 'USDT').fundingRate) : null, book: bookMap.get(s), tickOkx, war: null, mc: null }   // V254: konteks samudra
  const warA = mesinWarisan(c, hasil.BTC)                          // V249: konteks kuant ARAH (dipindah duluan utk param samudra)
  const mcA = warA.garch.sigma1j > 0 ? monteCarlo24j(c, warA.garch) : null   // V251: kerucut MC utk ekspektasi arah
  wawCtx.war = warA; wawCtx.mc = mcA
  const wp = wawasanPenuh(c, hasil.BTC, s, wawCtx)                 // V254: inti 12 + observasi ~40
  const waw = wp.inti
  const buktiWaw = Object.fromEntries(waw.map((p) => [p.param, +p.arah.toFixed(3)]))
  const v = vonis(b, waw, bobotArah, bobotWaw, rezimGlobal)
  const eksA = mcA ? eksArah(v.arah, mcA) : null
  const buktiCand = Object.fromEntries(DIM_ARAH.map((k) => [k, +b.dims[k].arah.toFixed(3)]))
  const frPct = waw.find((p) => p.param === 'funding')?.nilai ?? null
  const kena = zonaKandidat('arah', v.arah, b.rezim, v.keyakinan, buktiCand, frPct)
  const vetoW = vetoWaw(wp.penuh, v.arah)                          // V254: gerbang veto wawasan
  kandidatArah.push({ s, id, b, v, waw, wp, buktiWaw, warA, mcA, eksA, buktiCand, kena, vetoW })
}
const emasArah = (k) => k.kena.some((z) => z.status === 'EMAS')
// V254: kandidat yang DI-VETO wawasan dipisah — bukan racun forensik, tapi ditolak
// parameter medan (order book / funding-riwayat / tren 4h / volatilitas ekstrem).
const divetoArah = kandidatArah.filter((k) => k.vetoW.length)
const bersihArah = kandidatArah.filter((k) => !k.vetoW.length && !k.kena.some((z) => z.status === 'RACUN'))
const tercemarArah = kandidatArah.filter((k) => k.kena.some((z) => z.status === 'RACUN'))
  .sort((a, b) => (b.eksA?.evPct ?? -99) - (a.eksA?.evPct ?? -99))
// SLOT EKSPLORASI forensik (bandit berbatas): 1 kandidat racun per denyut dengan
// EV statistik >= 0 boleh lewat — tanpa informasi baru, zona tak pernah bisa menyembuh.
const eksplorasiArah = tercemarArah.find((k) => k.eksA && k.eksA.evPct >= 0) || null
const kunciEntriArah = (k, eksplor) => {
  const { s, id, b, v, waw, wp, buktiWaw, warA, mcA, eksA, buktiCand, kena } = k
  const emas = emasArah(k)
  const kal = kunciKeyakinan(v.keyakinan + (emas ? 4 : 0), ilmu.kalibrasi, kena)   // V252: kepastian zona medan
  const nar = narasiSasaran(s, b, { arah: v.arah, keyakinan: kal.keyakinan }, wp.penuh, { fng, dominasi }, eksA, warA.garch.sigma24jPct, rezimGlobal)
  const entri = {
    id, simbol: s, jalur: 'ARAH', arah: v.arah, keyakinan: kal.keyakinan, keyakinanMentah: v.keyakinan,
    ketKeyakinan: kal.sumber, skor: v.skor, skorKomite: { lama: v.skorLama, wawasan: v.skorWaw, bagian: WAWASAN.BAGIAN_KOMITE },
    ...(emas ? { zonaEmas: true } : {}),
    ...(eksplor ? { eksplorasi: true, ketEksplorasi: 'slot eksplorasi forensik — menguji apakah zona racun mulai menyembuh (EV statistik >= 0)' } : {}),
    entry: b.harga, waktuKunci: ISO, horizon: '24j', rezim: b.rezim, status: 'TERBUKA',
    bukti: buktiCand,
    buktiWaw,
    paramsPenuh: Object.fromEntries(wp.penuh.map((p) => [p.param, +p.arah.toFixed(2)])),   // V254 sekolah parameter: nasihat tiap param disegel utk dinilai medan
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
  }
  ledger.push(entri); terkunciBaru.push(entri)
  return entri
}
for (const k of bersihArah) kunciEntriArah(k, false)
if (eksplorasiArah) {
  kunciEntriArah(eksplorasiArah, true)
  forensikTindakan.push(`slot eksplorasi: ${eksplorasiArah.s} ${eksplorasiArah.v.arah} dilepas lewat gerbang (EV +${(eksplorasiArah.eksA.evPct * 100).toFixed(2)}% >= 0) — zona racun diuji agar bisa menyembuh dengan bukti baru`)
  log(`forensik-eksplorasi: ${eksplorasiArah.s} ${eksplorasiArah.v.arah} EV +${(eksplorasiArah.eksA.evPct * 100).toFixed(2)}%`)
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
// V249 BREADTH A/D (organ: Market Breadth) — pasar sempit = risiko sistemik;
// bila < 35% koin naik DAN rezim TURUN, gerbang radar diperketat +2.
const breadthDari = Object.keys(hasil).length
const breadthNaik = breadthDari
  ? [...Object.values(hasil)].filter((c) => c.length > 25 && c[c.length - 1].c > c[c.length - 25].c).length / breadthDari
  : 0.5
const pemerketBreadth = breadthNaik < 0.35 && rezimGlobal === 'TURUN' ? 2 : 0
if (pemerketBreadth) log(`warisan-breadth: hanya ${(breadthNaik * 100).toFixed(0)}% koin naik dalam rezim TURUN — gerbang radar +2`)
const gerbangSkor = clamp(PHX.GERBANG_SKOR + (rezimTegas ? PHX.TURUN_SKOR_TAMBAH : 0) + gerbangMeta + pemerketBreadth, 34, 58)
const kunciMaks = rezimTegas ? Math.ceil(PHX.KUNCI_MAKS / 2) : PHX.KUNCI_MAKS

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
  const wpPhx = wawasanPenuh(c, hasil.BTC, s, { deriv, oiLama: oiLamaMap?.[s], frHist: frHistMap.get(s), frKini: deriv?.get(s + 'USDT') ? +(deriv.get(s + 'USDT').fundingRate) : null, book: bookMap.get(s), tickOkx, war, mc: null })   // V254: inti + observasi utk radar
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
  lulusPhx.push({
    id, simbol: s, jalur: 'PHOENIX', arah: 'BUY', keyakinan: v.keyakinan + (emasPhx ? 4 : 0), skorPhoenix: v.skor,
    entry: b.harga, tgt, rad, b, war, mc, pT, pA, dayaProduk, stv, pStv, evK, kenaPhx, zonaEmas: emasPhx, wawPhx, wpPhx,
    urut: v.skor * Math.min(tgt.untung, 0.06) * (evK > 0 ? 1.25 : 1),   // v2.1 fantasi tak memenangkan kuota; V251 EV positif diprioritaskan
  })
}
// kuota harian: hanya prediksi radar TERBAIK yang dikunci — sisanya jujur jadi kandidat
const phxTerlanjur = ledger.filter((e) => e.jalur === 'PHOENIX' && (e.waktuKunci || '').slice(0, 10) === TGL).length
const sisaKuota = Math.max(0, kunciMaks - phxTerlanjur)
lulusPhx.sort((a, b) => b.urut - a.urut)
const phxCadangan = []
// V252: pembangun entri phoenix — satu sumber untuk jalur kuota & slot eksplorasi
const bangunEntriPhx = (p, eksplor) => {
  const { tgt, rad, b, war, mc, pT, wawPhx, wpPhx } = p
  const pA = tgt.highAmbisius ? mc.pLevel(tgt.highAmbisius / b.harga - 1) : null
  const kalP = kunciKeyakinan(p.keyakinan, ilmu.kalibrasi, p.kenaPhx)   // V252: kepastian zona medan
  const pita = pitaKonformal(ilmu.konformal)                       // V247: pita 75% ujung atas
  const stopHarga = p.stv
  const pStop = p.pStv
  // V253: narasi phoenix — inti sama (struktur/aliran/momentum/iklim), penutup cerita radar
  const codaPhx = `Radar membeli ujung bawah hari ini — posisi ${(rad.posisi * 100).toFixed(0)}% rentang 24 jam — dengan sasaran jual ${+tgt.target.toPrecision(7)} (untung bersih +${(tgt.untung * 100).toFixed(1)}% setelah fee), stop struktural ${+stopHarga.toPrecision(6)} di bawah lantai, peluang MC tembus target ${Math.round(pT * 100)}% vs kena stop ${pStop != null ? Math.round(pStop * 100) + '%' : '—'}%. Risiko jujur: akumulasi bisa gagal — lantai jebol berarti bacaan salah dan stop yang mengatakan itu lebih dulu.`
  const narPhx = narasiSasaran(p.simbol, b, { arah: 'BUY', keyakinan: kalP.keyakinan }, wpPhx.penuh, { fng, dominasi }, null, war.garch.sigma24jPct, rezimGlobal, codaPhx)
  const buktiWawPhx = Object.fromEntries(wawPhx.map((x) => [x.param, +x.arah.toFixed(3)]))
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
    paramsPenuh: Object.fromEntries(wpPhx.penuh.map((x) => [x.param, +x.arah.toFixed(2)])),   // V254 sekolah parameter
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
  }
  ledger.push(entri); terkunciBaru.push(entri)
  return entri
}
for (const [i, p] of lulusPhx.entries()) {
  if (i >= sisaKuota) {
    phxCadangan.push({
      simbol: p.simbol, jalur: 'PHOENIX', arah: 'BUY', keyakinan: p.keyakinan, entry: p.b.harga, rezim: p.b.rezim,
      catatan: `lolos gerbang radar (skor ${p.skorPhoenix}) — di luar kuota ${kunciMaks} terbaik hari ini`,
    })
    continue
  }
  bangunEntriPhx(p, false)
}
// V252 SLOT EKSPLORASI phoenix (bandit berbatas): 1 kandidat zona racun dengan
// EV statistik >= 0 per denyut boleh lewat — tanpa bukti baru zona tak pernah menyembuh
const terpakaiQuota = Math.min(lulusPhx.length, sisaKuota)
const eksplorPhx = tercemarPhx.filter((k) => k.evK >= 0).sort((a, b) => b.evK - a.evK)[0] || null
if (eksplorPhx && sisaKuota - terpakaiQuota > 0) {
  bangunEntriPhx(eksplorPhx, true)
  forensikTindakan.push(`slot eksplorasi phoenix: ${eksplorPhx.simbol} dilepas lewat gerbang (EV +${(eksplorPhx.evK * 100).toFixed(2)}% >= 0) — zona racun radar diuji agar bisa menyembuh dengan bukti baru`)
  log(`forensik-eksplorasi-phx: ${eksplorPhx.simbol} EV +${(eksplorPhx.evK * 100).toFixed(2)}%`)
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
    }
  }
  // V247 ILMU: keyakinan adalah PROBABILITAS — dinilai skor Brier (Gneiting-Raftery 2007).
  const pKal = clamp((e.keyakinanMentah ?? e.keyakinan ?? 60) / 100, 0.5, 0.98)
  e.brier = +((pKal - (net > 0 ? 1 : 0)) ** 2).toFixed(4)
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
    for (const k of polaDari(e)) aturan.pola[k] = (aturan.pola[k] || 0) + 1
  }
  aturan.seedSelesai = ISO
  log('bahan ajar: seed pola dari sejarah', JSON.stringify(aturan.pola))
}
for (const e of dinilaiBaru) for (const k of polaDari(e)) aturan.pola[k] = (aturan.pola[k] || 0) + 1
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
  return {
    waktu: ISO, simbol: e.simbol, jalur: e.jalur || 'ARAH', vonis: e.status,
    netPct: +((e.net || 0) * 100).toFixed(2), kenapa: info.kenapa, pelajaran: info.pelajaran,
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
    return {
      ekspektasiPct: grad.length ? +((netKum / grad.length) * 100).toFixed(3) : null,
      menangRataPct: mn.length ? +((sm / mn.length) * 100).toFixed(2) : null,
      rugiRataPct: kl.length ? +((sk / kl.length) * 100).toFixed(2) : null,
      profitFactor: sk < 0 ? +(sm / -sk).toFixed(2) : null,
      ket: 'ekspektasi rata-rata per perdagangan net-fee — profit diukur, bukan dirasakan; PF = jumlah menang ÷ jumlah rugi',
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
  tindakanSiklusIni: [ilmuCatatan, epochCatatan, ...(aturanBaru.length ? [`aturan baru lahir: ${aturanBaru.join('; ')}`] : []), ...forensikTindakan, ...(performaCatatan ? [performaCatatan] : []), ...(blokForensikArah + blokForensikPhx ? `gerbang forensik menolak ${blokForensikArah + blokForensikPhx} sinyal zona racun siklus ini — no-trade adalah keputusan` : [])],
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
  ...(e.ketKeyakinan ? { ketKeyakinan: e.ketKeyakinan } : {}),
  ...(e.jalur === 'PHOENIX' ? { target: e.target, ketTarget: e.ketTarget, untungBersihPct: +(e.untungBersih * 100).toFixed(1), stop: e.stop, skorPhoenix: e.skorPhoenix, highAmbisius: e.highAmbisius ?? null } : {}),
  ...(e.pitaUjungAtas ? { pitaUjungAtas: e.pitaUjungAtas } : {}),
  ...(e.ekspektasi ? { ekspektasi: e.ekspektasi } : {}),
  ...(e.skorKomite ? { skorKomite: e.skorKomite } : {}),
  ...(e.wawasan ? { wawasan: e.wawasan } : {}),
  ...(e.derivatif ? { derivatif: e.derivatif } : {}),
  ...(e.narasi ? { narasi: e.narasi } : {}),
  rezim: e.rezim, dikunci: e.waktuKunci, horizon: e.horizon, fee: '0.2% pulang-pergi',
  bukti: e.bukti, ketBukti: e.ketBukti, daya: e.daya,
  ...(e.warisan ? { warisan: e.warisan } : {}),
})
// tiap lane memakai prediksi barunya hari ini; bila kosong (sudah terkunci siklus lalu), pakai yang TERBUKA
const pilihDasar = (jalurPhx) => {
  const baru = terkunciBaru.filter((e) => (e.jalur === 'PHOENIX') === jalurPhx)
  return baru.length ? baru : ledger.filter((e) => e.status === 'TERBUKA' && (e.jalur === 'PHOENIX') === jalurPhx)
}
const phxDasar = pilihDasar(true)
const komDasar = pilihDasar(false)
const phxRows = [...phxDasar]
  .sort((a, b) => b.skorPhoenix * b.untungBersih - a.skorPhoenix * a.untungBersih).slice(0, PHX.SASARAN_PHX)
const komRows = [...komDasar].filter((e) => !phxRows.some((p) => p.simbol === e.simbol))
  .sort((a, b) => b.keyakinan - a.keyakinan).slice(0, PHX.SASARAN_ARAH)
const sasaranUtama = [...phxRows, ...komRows].map(barisDari)
const kandidatLain = [
  ...[...phxDasar, ...komDasar].filter((e) => !sasaranUtama.some((r) => r.simbol === e.simbol && (r.jalur || 'ARAH') === (e.jalur || 'ARAH'))).map(barisDari),
  ...phxCadangan.slice(0, 6),
  ...nearMiss.slice(0, 8),
]
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
const guruPengajaran = [
  `REZIM (${rezimGlobal} · ATR BTC ${sembtc.atrPct.toFixed(2)}%): ${rezimGlobal === 'TURUN' || rezimGlobal === 'PARABOLIK' ? `melawan arus dibuat mahal — gerbang +${PHX.TURUN_SKOR_TAMBAH}, cap target ${((PHX.TURUN_CAP - 1) * 100).toFixed(0)}%; profesional mengecil saat pasar menolak naik` : rezimGlobal === 'NAIK' ? 'trend adalah temanmu — namun SELL tanpa bukti lebih kuat tetap dipotong keyakinannya; jangan berubah jadi pemburu top' : 'pasar datar = jebakan dua arah — hanya sinyal berdaya produk tinggi yang layak dibayar'}`,
  `FORENSIK (${forensik.arah.racun.length + forensik.phoenix.racun.length} zona racun terpasang · ${blokForensikArah + blokForensikPhx} sinyal ditolak siklus ini · mode ${modeDisiplin}): penyebab kegagalan diukur, bukan diperdebatkan — ${forensik.arah.racun[0] ? `zona terburuk: ${forensik.arah.racun[0].nama} (n=${forensik.arah.racun[0].n}, akurasi ${forensik.arah.racun[0].akurasiPct}%, ekspek ${forensik.arah.racun[0].ekspekPct}%)` : 'belum ada zona berbukti cukup'} — profesional menutup keran kerugian lebih dulu daripada membuka keran keuntungan baru`,
  `BREADTH (${(breadthNaik * 100).toFixed(0)}% dari ${breadthDari} koin naik): ${breadthNaik < 0.35 ? 'pasar sempit — dana hanya mengalir ke pemimpin; membeli koin lemah di pasar sempit = melawan arus dana' : 'pasar cukup luas — rotasi sehat; konfirmasi akumulasi tetap wajib sebelum masuk ujung bawah'}`,
  `HUNTING (${radar.telaah} telaah → ${radar.zonaPhoenix} zona phoenix → ${radar.telusurDalam} telusur dalam · gerbang ${gerbangSkor}): kekuatan pemburu bukan dari jumlah tembakan, tapi dari sabar menunggu konfirmasi EMA9 + taker-buy — menadah pisau jatuh adalah pajak untuk yang tidak sabar`,
  binBesar ? `KALIBRASI (bin ${binBesar.low}–${binBesar.high - 1}% tembus ${((binBesar.benar / binBesar.n) * 100).toFixed(0)}% dari ${binBesar.n} kasus): catat hit-rate binmu sendiri — keyakinan tanpa kalibrasi adalah overconfidence berbusana rapi` : 'KALIBRASI: belum ada bin berkasus cukup — kejujuran juga berarti menunggu medan bicara',
  evMed != null ? `PROFIT (EV median sasaran ${evMed > 0 ? '+' : ''}${evMed.toFixed(2)}% net-fee${pProfit.profitFactor != null ? ` · PF ledger ${pProfit.profitFactor} · menang rata ${pProfit.menangRataPct ?? '—'}% vs rugi rata ${pProfit.rugiRataPct ?? '—'}%` : ''}): profesional mengukur ekspektasi, bukan feeling — ekspektasi negatif berarti berhenti, bukan "sekali lagi"` : 'PROFIT: EV = P(target)×untung − P(stop)×rugi net-fee — jika EV tak pernah dihitung, kamu tidak sedang berdagang, sedang menebak',
  `DISIPLIN (aturan aktif ${Object.keys(aturan.aktif).length} · pola terpantau ${Object.values(aturan.pola).reduce((a, x) => a + x, 0)}): ${Object.values(aturan.aktif).slice(-1)[0] ?? 'aturan pertama lahir saat pola kekalahan terulang 2 kali — kegagalan yang dicatat adalah guru termurah'}`,
  `WAWASAN (funding BTC ${frBtc != null ? (frBtc * 100).toFixed(4) + '%' : '—'} · OI BTC ${oiBtc ? '$' + oiBtc.nilaiJuta + ' juta' + (oiBtc.deltaPct != null ? ' · Δ' + (oiBtc.deltaPct * 100).toFixed(2) + '%' : '') : '—'} · F&G ${fng?.nilai ?? '—'} ${fng?.klasifikasi ?? ''}): derivatif adalah bahasa kerumunan — funding ekstrem berarti pihak yang MEMBAYAR biasanya yang salah; baca open interest dulu sebelum percaya lilin: harga naik tanpa OI naik adalah naik tanpa dana baru, dan itu rapuh`,
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
const guru = {
  diperbarui: ISO, organ: VERSI, siklus: SIKLUS,
  judul: `Pengajaran denyut #${SIKLUS} — rezim ${rezimGlobal}, kompas ${kompas ? kompas.arah : '—'}`,
  mandat: 'menjadi guru para trader profesional — pengajaran dibangun otomatis dari angka denyut ini (mandat pemilik)',
  pengajaran: guruPengajaran, kuis: guruKuis, etika: ETIKA_GURU,
  kompas: kompas ? { arah: kompas.arah, keyakinan: kompas.keyakinan, alasan: kompas.alasan } : null,
  sumber: 'laporan/guru.json — pengajaran & kuis, bukan ajakan membeli; semua angka dari ledger pra-registrasi yang bisa diaudit siapa pun',
}
tulis(path.join(ROOT, 'laporan/guru.json'), guru)
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
  `Komite ARAH kini menimbang ${DIM_ARAH.length + DIM_WAW.length} dimensi berbobot dalam registri ${TOTAL_PARAM_NAMA} parameter bernama per kandang (≈${TOTAL_PARAM_NAMA * 10} pengukuran per denyut): multi-timeframe 1h+4h, riwayat funding, order book, persentil lintas-pasar, kalender, GARCH/MC — dan tiap param DICATAT nasihatnya per prediksi lalu dinilai medan (sekolah parameter); bobot inti belajar dari vonis nyata, bukan ditetapkan tangan.`,
].filter(Boolean).join(' ')
const perKandang = []
for (const s of KANDANG) {
  const c = hasil[s]; if (!c) continue
  const bK = dewanBukti(c)
  const warK = mesinWarisan(c, hasil.BTC)
  const mcK = warK.garch.sigma1j > 0 ? monteCarlo24j(c, warK.garch) : null
  const wpK = wawasanPenuh(c, hasil.BTC, s, { deriv, oiLama: oiLamaMap?.[s], frHist: frHistMap.get(s), frKini: deriv?.get(s + 'USDT') ? +(deriv.get(s + 'USDT').fundingRate) : null, book: bookMap.get(s), tickOkx, war: warK, mc: mcK })
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
  .map(([param, h]) => ({ param, n: h.n, hitPct: h.n ? +((h.benar / h.n) * 100).toFixed(1) : null, netPct: +((h.net || 0) * 100).toFixed(2), status: statusSekolah(h) }))
  .sort((a, b) => b.n - a.n)
const wawasan360 = {
  versi: 'V254-SAMUDRA-PARAMETER', dihasilkan: ISO, siklus: SIKLUS,
  dimensi: DIM_ARAH.length + DIM_WAW.length,
  registri: {
    totalNama: TOTAL_PARAM_NAMA, intiBerbobot: DIM_WAW.length, observasi: PARAM_OBS.length,
    perDomain: perDomainCount, jumlahKandang: perKandang.length,
    pengukuranPerDenyut: TOTAL_PARAM_NAMA * perKandang.length,
    ket: `registri ${TOTAL_PARAM_NAMA} parameter bernama per kandang × ${perKandang.length} kandang ≈ ${TOTAL_PARAM_NAMA * perKandang.length} pengukuran per denyut + iklim lintas-pasar; lapis INTI (12) berbobot genome+Hedge, lapis OBSERVASI (${PARAM_OBS.length}) dihitung, dinarasikan, boleh MENOLAK (veto), dan dicatat nasihatnya per prediksi — menunggu kelulusan sekolah sebelum berhak bersuara`,
  },
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
  },
  perKandang,
  metode: 'L1 lilin 1h (MACD, ADX/DI, Bollinger, VWAP, OBV, swing fraktal, pola lilin, konsistensi, pivot klasik, kekuatan relatif) · L1b multi-timeframe 4h hasil agregasi 1h (EMA-align, MACD, RSI, Bollinger, swing, sejajar-TF, rasio ATR) · L2 derivatif NYATA (funding kini + riwayat rata3/tren OKX, OI rantai host bybit→bytick→fapi→OKX + ΔOI antar-siklus) · L2b mikrostruktur (order book spot OKX 50 level: imbalance 1%, spread bps, rasio kedalaman, dinding terbesar) · L2c lintas-pasar (persentil perubahan & volume dari swap USDT OKX, median, sebaran) · L3 makro (F&G + riwayat 7 hari, dominasi, breadth, altseason-proxy) · L4 kuant-warisan (GARCH sigma, MC-pNaik, beta CAPM, divergensi RSI, POC volume) · L5 kalender (sesi Asia/Eropa/AS, akhir pekan, fase bulan) — semuanya endpoint publik tanpa API key; gagal = null jujur',
  ket: 'parameter konstan per siklus (F&G, dominasi, breadth) masuk IKLIM & NARASI, tidak memilih arah — pelajaran forensik: fitur konstan lane tidak berhak menolak sinyal; 12 param inti belajar bobotnya (genome per rezim + Hedge on-line); parameter observasi menolak via gerbang veto yang dilabeli & dicatat; sekolah parameter mengukur hit-rate tiap param dari ledger — kelulusan via bukti, bukan tangan',
}
tulis(path.join(ROOT, 'laporan/wawasan.json'), wawasan360)
log(`samudra laporan: ${perKandang.length} kandang × ${TOTAL_PARAM_NAMA} param · sekolah ${sekolahParam.length} param dinilai · narasi makro ${narasiMakroTeks.length} kar.`)
const laporan = {
  protokol: 'SASARAN-MICAPROFITA', organ: VERSI, dihasilkan: ISO, siklus: SIKLUS,
  sumber: { host, gagal: gagal.slice(0, 12) },
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
    iklim: wawasan360.iklim,
    vetoSiklusIni: wawasan360.vetoSiklusIni,
    sekolahParameter: sekolahParam.slice(0, 14),
    perKandang: wawasan360.perKandang.map((x) => ({ simbol: x.simbol, rezim: x.rezim, fundingPct: x.fundingPct, oiJuta: x.oiJuta, oiDeltaPct: x.oiDeltaPct, jumlahParam: x.jumlahParam, konsensus: x.konsensus, params: (x.params || []).filter((p) => p.lapis === 'inti') })),
    metode: wawasan360.metode,
    ket: wawasan360.ket,
    sumber: 'registri penuh 46 param/kandang di laporan/wawasan.json',
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
    judul: guru.judul, pengajaran: guruPengajaran.slice(0, 4),
    kuis: guruKuis, etika: ETIKA_GURU,
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
    'JAMINAN ARAH: apa pun kondisi pasar, jawaban BUY/SELL tidak pernah bolong — sasaran koin bila gerbang lolos, kompas rezim BTC (GARCH + MC 2.000 lintasan, keyakinan rendah-jujur) sebagai lantai; ekspektasi & tangga profit tercantum per sasaran — jaminan arah, bukan jaminan untung',
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
  fng: fng?.nilai ?? null, fundingBtcPct: frBtc != null ? +(frBtc * 100).toFixed(4) : null, dimWawasan: DIM_ARAH.length + DIM_WAW.length,
})
tulisJsonl(path.join(ROOT, 'laporan/denyut-server.jsonl'), denyut.slice(-500))
// V253: snapshot OI utk ΔOI antar-siklus berikutnya (denyut pertama jujur null)
keadaan.wawasan = { oiLama: oiKiniMap, waktu: ISO }
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
  },
})

log(`denyut #${SIKLUS} selesai — kunci ${terkunciBaru.length} (phoenix ${terkunciBaru.filter((e) => e.jalur === 'PHOENIX').length}), nilai ${dinilaiBaru.length}, akurasi ${akurasi.akurasiPct ?? 'belum ada'}%`)
console.log('RINGKASAN:' + JSON.stringify({
  siklus: SIKLUS, telaah: radar.telaah, zona: radar.zonaPhoenix, telusur: radar.telusurDalam,
  terkunci: terkunciBaru.length, phoenix: terkunciBaru.filter((e) => e.jalur === 'PHOENIX').length,
  dinilai: dinilaiBaru.length, akurasi: akurasi.akurasiPct,
}))
