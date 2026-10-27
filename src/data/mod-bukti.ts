import type { ModuleData } from '@/lib/types'

export const modBukti: ModuleData = {
  id: 'bukti',
  label: 'Bukti & Koherensi',
  short: 'Mengapa: matriks bukti lintas jalur, klaim konvergen, konflik, dan gap riset',
  tagline: 'Uji koherensi: apa yang benar-benar dibuktikan, apa yang hanya narasi, dan di mana lubang riset kita',
  color: '#fb7185',
  sections: [
    {
      id: 'bukti-matriks',
      title: 'Matriks Bukti Empiris per Keluarga',
      kicker: 'LEVEL BUKTI',
      blocks: [
        {
          type: 'paragraph',
          text: 'Modul ini adalah pemeriksaan koherensi — bagian dari metodologi tim yang membedakan pekerjaan riset dari pengumpulan kutipan. Untuk setiap keluarga arsitektur, kami membedah tiga level bukti: bukti mekanisme (apakah komponen intinya bekerja seperti yang diklaim, pada eksperimen terkontrol), bukti kapabilitas (apakah sistem utuh mencapai hal yang sebelumnya tak tercapai pada benchmark yang tidak bisa dicurigai), dan bukti transfer (apakah keunggulannya menyebar ke domain lain tanpa rekayasa ulang). Tabel berikut merangkum hasilnya; satu-satunya keluarga yang kuat di ketiga level untuk kapabilitasnya sendiri namun lemah untuk transfer adalah koneksionis-LLM — dan itu persis alasan kenapa jalurnya belum selesai.',
        },
        {
          type: 'table',
          headers: ['Keluarga', 'Bukti mekanisme', 'Bukti kapabilitas', 'Bukti transfer', 'Penilaian koherensi'],
          rows: [
            ['Simbolik klasik', 'Kuat & tua (ratusan model perilaku manusia; Newell Test)', 'Rendah (domain formal sempit)', 'Rendah (kebutuhan engineering per domain)', 'Struktur valid, mesin usang — diadopsi sebagai organisasi, bukan pembelajar'],
            ['Koneksionis/scaling', 'Sangat kuat (scaling laws terukur ulang lintas lab)', 'Sangat kuat (GATO, GPT-4, o-series; rekam jejak benchmark)', 'Sedang (transfer perilaku ya; transfer penalaran novel gagal di ARC-AGI-2)', 'Klaim "skala menyelesaikan" belum koheren dengan bukti novel-task'],
            ['World model/JEPA', 'Kuat & baru (I-JEPA, V-JEPA: fitur semantik tanpa label; planning zero-shot)', 'Sedang (persepsi + kontrol robotik; belum penalaran/bahasa penuh)', 'Belum teruji (belum ada sistem utuh lintas modal tugas)', 'Mekanisme koheren dengan teori; kapabilitas sistem utuh belum ada'],
            ['Neuro-symbolic', 'Kuat (formal verifier tak terbantahkan; RL di Lean)', 'Kuat di domain formal (medali perak IMO; 25/30 geometri)', 'Rendah-ke-sedang (autoformalisasi matematika ya; domain terbuka belum)', 'Koheren di domain formal; generalisasi bergantung autoformalisasi yang belum tuntas'],
            ['LLM-as-core + RL', 'Kuat (R1: reasoning dari RL murni, direplikasi; o-series)', 'Kuat (FrontierMath ~25%, HLE puluhan %, agen alat produksi)', 'Sedang (agentic tasks baik; degradasi pada tugas panjang/novel)', 'Klaim terkuat hari ini; tetap dijebol ARC-AGI-2 — bukan jawaban penuh'],
          ],
        },
        {
          type: 'callout',
          tone: 'rose',
          title: 'Waspadai tiga pola bukti palsu',
          text: '(1) Benchmark leak — skor tinggi yang menghilang saat soal novel (lihat sejarah ARC). (2) Emergensi metrik — lompatan skor artefak pengukuran, bukan kemampuan (Schaeffer 2023). (3) Demo selektif — kemampuan yang ditunjukkan pada contoh terpilih tapi tidak stabil di uji acak. Setiap klaim yang kita adopsi ke blueprint harus lolos ketiga saringan ini.',
        },
      ],
    },
    {
      id: 'bukti-konvergen',
      title: 'Klaim Konvergen: Di Mana Semua Jalur Sepakat',
      kicker: 'KONVERGENSI',
      blocks: [
        {
          type: 'paragraph',
          text: 'Analisis lintas-paper menemukan lima klaim yang didukung secara independen oleh jalur-jalur yang berbeda — konvergensi semacam ini adalah bukti koherensi terkuat yang dimiliki lapangan, lebih kuat daripada keberhasilan satu keluarga. Pertama, memori harus dapat konsolidasi: ACT-R (aktivasi), SOAR (chunking), agen LLM (memori episodal + distilasi), dan Hyperon (AtomSpace) semuanya menuntutnya. Kedua, generalisasi novel butuh model dunia: LeCun menyatakannya eksplisit, Chollet mengukurnya (core-knowledge priors), DeepMind membangunnya (Genie/simulasi), dan bahkan kubu LLM mengakui world model implisit yang rapuh sebagai kelemahan. Ketiga, verifikasi terpisah dari generator: AlphaProof (Lean), self-verification R1, kritik Constitutional AI — pola yang sama di tiga jalur.',
        },
        {
          type: 'paragraph',
          text: 'Keempat, pembelajaran dari reward mengalahkan imitasi pada penalaran: AlphaZero tabula-rasa, o-series, R1 — ketiganya menunjukkan pola yang sama bahwa RL pada reward kebenaran membuka level yang tidak dicapai meniru data manusia. Kelima, otonomi dan safety adalah dimensi terpisah dari kapabilitas: Levels of AGI memisahkannya secara eksplisit, kerangka preparedness OpenAI dan RSP Anthropic mengoperasionalkannya, dan OpenCog menempatkan "beneficial" langsung di judul roadmap-nya. Bagi blueprint kita, lima klaim konvergen ini berfungsi sebagai syarat minimum yang tidak bisa dinegosiasikan — setiap komponen di Modul 7 dipetakan ke salah satunya.',
        },
        {
          type: 'papers',
          ids: ['morris2023', 'deepseek-r1-2025', 'alphaproof2025', 'bai2022', 'goertzel2023'],
        },
      ],
    },
    {
      id: 'bukti-konflik',
      title: 'Konflik Terbuka: Perdebatan yang Belum Selesai',
      kicker: 'KONFLIK',
      blocks: [
        {
          type: 'paragraph',
          text: 'Koherensi yang jujur juga berarti mencatat konflik yang belum terselesaikan. Konflik pertama — prediksi di ruang mana: token autoregresif (kubu LLM) vs representasi abstrak (JEPA)? Bukti saat ini menunjukkan LLM menang di bahasa/penalaran simbolik tipis, JEPA menang di dinamika visual/fisik; belum ada eksperimen head-to-head yang menentukan pada tugas kognitif penuh. Konflik kedua — pengetahuan vs compute: Sutton mengklaim compute menang selamanya; Marcus mengklaim struktur simbolik dibutuhkan; AlphaProof memberi bukti bagi keduanya sekaligus (RL murni di atas substrate formal yang di-engineer). Konflik ketiga — benchmark: apakah ARC-AGI merepresentasikan kecerdasan praktis atau sekadar kelas puzzle tertentu? FrontierMath/HLE mengukur keahlian pakar yang berbeda bentuk dari fluid intelligence; tim menanggapi dengan mengukur keduanya, bukan memilih salah satu.',
        },
        {
          type: 'paragraph',
          text: 'Konflik keempat — timeline & risiko: kalangan scaling (Aschenbrenner, Amodei) menempatkan AGI dalam beberapa tahun, kalangan arsitektur (LeCun) menyebut itu mustahil tanpa world model, dan kalangan akademik skeptis menuntut definisi lebih ketat dulu. Konflik kelima — kesadaran & status moral: Butlin dkk. menyediakan indikator arsitektural, tetapi klaim "sistemnya sadar" tetap tidak teruji; untuk keperluan engineering kita, indikator GWT menjadi checklist properti (integrasi informasi, siaran workspace), bukan dogma metafisik. Sikap kerja tim: konflik tidak diselesaikan dengan vota, melainkan dengan eksperimen yang bisa membedakan — dan setiap konflik di atas punya eksperimen pembedah yang tercantum di kolom gap di bawah.',
        },
        {
          type: 'table',
          headers: ['Konflik', 'Posisi A', 'Posisi B', 'Eksperimen pembedah yang bisa kita jalankan'],
          rows: [
            ['Ruang prediksi', 'Token autoregresif cukup', 'Abstraksi JEPA diperlukan', 'Bandingkan planner world-model vs reasoning LLM pada tugas fisika-dinamika yang sama (set ala V-JEPA-AC vs o-series)'],
            ['Pengetahuan vs compute', 'Scaling + RL menang', 'Struktur simbolik wajib', 'Ukur degradasi prototipe hybrid saat verifier simbolik dimatikan'],
            ['Validitas ARC', 'Fluid intelligence nyata', 'Kelas puzzle sempit', 'Uji korelasi skor ARC-AGI-2 prototipe dengan kinerja tugas riset nyata'],
            ['Timeline', 'AGI 2027-2030', 'Dekade lebih', 'Lacak sinyal geser benchmark + verifier-domain baru tiap kuartal'],
            ['Kesadaran sistem', 'Indikator GWT cukup', 'Bukan pertanyaan engineering', 'Audit blueprint terhadap 14 indikator Butlin dkk. — transparan, tanpa klaim metafisik'],
          ],
        },
      ],
    },
    {
      id: 'bukti-gap',
      title: 'Gap Riset Eksplisit: Pekerjaan Rumah Tim Kita',
      kicker: 'GAP',
      blocks: [
        {
          type: 'paragraph',
          text: 'Setelah bukti dikonversi menjadi klaim, inilah lubang yang tersisa — daftar gap riset yang eksplisit, yang kami anggap agenda kerja tim, bukan keluhan lapangan. Gap 1: memori persisten yang konsolidasi — belum ada implementasi yang menyelesaikan siklus penuh pengalaman → memori episodal → generalisasi prosedural → distilasi kembali ke bobot tanpa degradasi. Gap 2: autoformalisasi domain terbuka — AlphaProof bekerja karena matematika bisa diformalkan; agen yang bisa membuat verifier untuk domain non-formal (kebijakan, desain, sains eksperimental) belum ada. Gap 3: world model berlapis dengan horizon panjang — V-JEPA 2 menangani detik-menit; penalaran rencana berminggu-minggu butuh hierarki abstraksi yang belum terbukti.',
        },
        {
          type: 'paragraph',
          text: 'Gap 4: koherensi otonomi panjang — semua keluarga mengalami degradasi pada tugas multi-hari; penyebabnya (konteks, drift tujuan, akumulasi kesalahan) belum diisolasi. Gap 5: alokasi komputasi adaptif — test-time compute bekerja, tetapi sistem belum punya metakognisi untuk memutuskan "kapan berhenti berpikir"; ini jembatan langsung ke tesis Chollet (efisiensi, bukan kekuatan mentah). Gap 6: pengukuran otonomi — kerangka L0-L5 ada secara konseptual, belum ada rubrik operasional yang dipakai lintas lab. Setiap gap ini akan muncul lagi di Modul 7 sebagai baris "risiko/gap" pada komponen blueprint terkait — agar desain dan agenda riset kita satu dokumen yang sama.',
        },
        {
          type: 'callout',
          tone: 'emerald',
          title: 'Aturan pembaruan basis pengetahuan',
          text: 'Basis ini hidup: setiap kuartal, klaim di modul Bukti diperiksa ulang terhadap paper & benchmark baru (daftar pantauan ada di Modul Aktor). Klaim yang gugur dicoret dengan catatan tanggal; klaim baru masuk hanya bila punya level bukti yang setara dengan tetangganya.',
        },
      ],
    },
  ],
}
