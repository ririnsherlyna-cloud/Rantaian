import type { ModuleData } from '@/lib/types'

export const modArsitektur: ModuleData = {
  id: 'arsitektur',
  label: 'Arsitektur Kognitif',
  short: 'Bagaimana AGI dibangun: 5 keluarga arsitektur, mekanisme, bukti, dan kegagalannya',
  tagline: 'Lima keluarga desain yang berebut fondasi AGI — dibedah mekanisme internal, bukti empiris, dan titik patahnya',
  color: '#34d399',
  sections: [
    {
      id: 'arch-intro',
      title: 'Peta Lima Keluarga Arsitektur',
      kicker: 'PENDEKATAN',
      blocks: [
        {
          type: 'paragraph',
          text: 'Survei literatur mengidentifikasi lebih dari 56 arsitektur kognitif untuk AGI (Sukhobokov, 2024), namun semuanya dapat dipahami sebagai variasi atau kombinasi dari lima keluarga besar. Kelima keluarga ini tidak sekadar "pilihan teknologi" — masing-masing berakar pada teori tentang apa inti kecerdasan: manipulasi simbol (simbolik), kompresi statistik skala besar (koneksionis), prediksi dunia (world-model), integrasi neural + penalaran formal (neuro-symbolic), dan akuisisi pola bahasa yang diperkaya RL (LLM-as-core). Memahami mekanisme internal, bukti empiris, dan titik patah masing-masing adalah prasyarat sebelum menyusun blueprint komposit di Modul 7.',
        },
        {
          type: 'table',
          headers: ['Keluarga', 'Inti teori kecerdasan', 'Perwakilan', 'Status bukti 2026'],
          rows: [
            ['1. Simbolik klasik', 'Manipulasi simbol + pencarian', 'GPS, SOAR, ACT-R, LIDA', 'Kaya secara teori, lemah secara skalabilitas'],
            ['2. Koneksionis/scaling', 'Kompresi statistik + compute', 'GPT-3/4, GATO, scaling laws', 'Generalitas perilaku terbukti; penalaran novel terbatas'],
            ['3. World model (JEPA)', 'Prediksi representasi dunia', 'Ha & Schmidhuber, LeCun H-JEPA, V-JEPA 2', 'Bukti persepsi/planing awal; belum sistem penuh'],
            ['4. Neuro-symbolic', 'Neural + penalaran formal', 'AlphaGeometry, AlphaProof, OpenCog Hyperon', 'Bukti dominan di matematika; belum general'],
            ['5. LLM-as-core + RL', 'Akuisisi pola + RL reasoning', 'o-series, DeepSeek-R1, agen alat', 'Frontrunner praktis; gap di abstraksi novel'],
          ],
        },
      ],
    },
    {
      id: 'arch-simbolik',
      title: 'Keluarga 1 — Simbolik Klasik: SOAR, ACT-R, LIDA',
      kicker: 'GEL. 1',
      blocks: [
        {
          type: 'paragraph',
          text: 'Akar teoretis keluarga ini adalah Physical Symbol System Hypothesis Newell & Simon (1976): sistem fisik yang memanipulasi simbol memiliki kapasitas yang diperlukan dan cukup untuk bertindak cerdas. SOAR (Laird, Newell, Rosenbloom, 1987) mewujudkannya sebagai mesin produksi dengan goal stack: setiap tujuan dipecah menjadi sub-tujuan, impasse memicu pembuatan subgoal, dan chunking mengkompres pengalaman menjadi aturan baru — mekanisme belajar yang secara struktural mirip apa yang kini kita sebut "belajar dari pengalaman". ACT-R (Anderson & Lebiere, 1998) lebih jauh meniru psikologi kognitif eksperimental: modul deklaratif (fakta dengan aktivasi berbasis frekuensi dan kebaruan), modul prosedural (aturan produksi), dan modul perceptual-motor, diikat dengan buffer bawaan yang meniru batas memori kerja manusia. Keduanya terus dikembangkan hingga kini dan telah mencapai ratusan model perilaku manusia yang cocok dengan data eksperimen.',
        },
        {
          type: 'paragraph',
          text: 'LIDA (Franklin dkk., 2006) membawa masuk Global Workspace Theory Baars (1988): kognisi berjalan dalam siklus ~100 ms di mana banyak proses spesialis bersaing masuk ke "panggung" workspace global, dan konten yang menang disiarkan ke seluruh sistem — cetak biru yang secara konseptual mendahului mekanisme attention pada Transformer. Kontribusi kekal keluarga simbolik bagi desain AGI adalah struktur: bagaimana memori deklaratif vs prosedural dipisahkan, bagaimana goal di-manage, bagaimana attention dialokasikan, dan bagaimana metakognisi (berpikir tentang tujuan sendiri) diimplementasikan. Anderson & Lebiere bahkan merumuskan "Newell Test" — daftar 12 kriteria yang harus dipenuhi teori pikiran lengkap, dari perilaku fleksibel hingga belajar arithmetika — yang hingga kini menjadi rubrik penilaian arsitektur AGI yang jujur.',
        },
        {
          type: 'paragraph',
          text: 'Titik patah keluarga ini bukan pada strukturnya melainkan pada sumber pengetahuannya: semua konsep harus di-knowledge-engineer secara manual, sehingga skalabilitas ke kekayaan dunia nyata gagal total. The Bitter Lesson Sutton (2019) merumuskan mengapa generasi pertama AI simbolik kalah: metode yang bersandar pada pengetahuan manusia yang dihand-craft terus-menerus dikalahkan oleh metode yang mengeksploitasi compute. Namun kekalahan itu mengalahkan sistemnya, bukan idenya — ketika LLM modern menghadapi masalah halusinasi dan koherensi, struktur yang dirancang keluarga simbolik (verifikasi, goal stack, memori modular) kembali diangkat sebagai komponen yang hilang. Bagi blueprint kita, keluarga ini menyumbang kerangka organisasi, bukan mesin pembelajar.',
        },
        {
          type: 'papers',
          ids: ['laird1987', 'anderson1998', 'baars1988', 'franklin2006', 'sutton2019'],
        },
      ],
    },
    {
      id: 'arch-koneksionis',
      title: 'Keluarga 2 — Koneksionis & Scaling: Dari Backprop ke GATO',
      kicker: 'GEL. 2',
      blocks: [
        {
          type: 'paragraph',
          text: 'Keluarga ini berangkat dari premis berlawanan: kecerdasan muncul dari pembelajaran statistik atas data skala besar, tanpa pengetahuan yang dihand-craft. Mesin dasarnya adalah jaringan saraf yang dilatih backpropagation (Rumelhart, Hinton, Williams, 1986) — algoritma yang sederhana namun skala tanpa batas. Tiga lompatan menentukan jalannya: AlexNet (2012) membuktikan deep learning menang di persepsi; Transformer (Vaswani dkk., 2017) memberi substrat yang memanfaatkan attention secara paralel — secara ironi, realisasi komputasional dari ide global workspace; dan GPT-3 (Brown dkk., 2020) membuktikan bahwa penskalaan parameter hingga 175B menghadirkan in-context learning — model yang sama menyelesaikan terjemahan, tanya-jawab, dan aritmetika tanpa dilatih ulang. Scaling laws (Kaplan dkk., 2020; Chinchilla, Hoffmann dkk., 2022) mengubah intuisi itu menjadi hukum empiris yang dapat diproyeksikan: loss turun pangkat terhadap compute, data, dan parameter, dengan rasio optimal yang terukur.',
        },
        {
          type: 'paragraph',
          text: 'Bukti generalitas paling eksplisit dari keluarga ini adalah GATO (Reed dkk., 2022): satu transformer dengan bobot sama yang mengeksekusi 604 tugas — captioning, dialog, memainkan ATARI, mengendalikan lengan robot — dengan kualitas yang banyak di antaranya kompetitif terhadap spesialis. Klaim DeepMind pada saat itu berani namun akurat secara metodologis: "generalitas perilaku" sekarang hanyalah persoalan skala. AlphaZero (Silver dkk., 2018) menambahkan sisi lain bukti: pada domain dengan aturan jelas dan feedback yang dapat dihitung, self-play tabula-rasa mencapai superhuman tanpa satu baris pengetahuan manusia. Kombinasi keduanya menetapkan jangkauan maksimum keluarga koneksionis: luar biasa di domain tertutup yang kaya data atau kaya reward, rapuh di domain terbuka yang menuntut penalaran baru.',
        },
        {
          type: 'paragraph',
          text: 'Titik patahnya kini terdokumentasi baik. Pertama, kompresi ≠ penalaran: LLM menghadirkan pola penalaran dari data, tetapi Sparks of AGI (Bubeck dkk., 2023) menunjukkan kegagalan sistematis ketika koherensi internal lintas langkah dibutuhkan. Kedua, emergensi berlebihan dipertanyakan: Schaeffer dkk. (NeurIPS 2023 Best Paper) menunjukkan banyak "kemampuan emergen" adalah artefak metrik — lompatan lahir dari cara mengukur, bukan dari arsitektur. Ketiga, data hampir habis: hukum Chinchilla menuntut token lebih banyak daripada teks berkualitas yang tersisa di internet, memaksa transisi ke data sintetis dan RL. Kegagalan-kegagalan ini bukan penguburan keluarga — mereka menetapkan batas dan menjadi alasan munculnya keluarga 3, 4, dan 5.',
        },
        {
          type: 'papers',
          ids: ['rumelhart1986', 'vaswani2017', 'brown2020', 'kaplan2020', 'hoffmann2022', 'reed2022', 'silver2018', 'bubeck2023', 'schaeffer2023'],
        },
      ],
    },
    {
      id: 'arch-jepa',
      title: 'Keluarga 3 — World Model & JEPA: Belajar Dunia lewat Prediksi',
      kicker: 'GEL. 3',
      blocks: [
        {
          type: 'paragraph',
          text: 'Keluarga world-model berakar pada argumen kognisi: kecerdasan adalah kemampuan memprediksi konsekuensi tindakan di dunia, dan prediksi harus terjadi di ruang representasi abstrak, bukan di piksel atau token mentah. Preseden klasiknya World Models (Ha & Schmidhuber, 2018): agen belajar VAE + model dunia rekuren, lalu dilatih sepenuhnya di dalam "mimpi" modelnya — dan strategi itu transfer ke dunia nyata. Versi yang paling terartikulasi adalah position paper LeCun (2022): A Path Towards Autonomous Machine Intelligence. LeCun menyusun konfigurasi H-JEPA lengkap — modul perceptron, world model prediktif berlapis (level abstraksi dan horizon waktu), cost module (intrinsik + kritik), short-term memory, actor, dan konfigurator — dengan mesin pembelajar Joint-Embedding Predictive Architecture (JEPA) dan energy-based models. Argumen sentralnya: model generatif autoregresif pada token membakar kapasitas untuk memprediksi detail yang tak dapat diprediksi, sedangkan JEPA memprediksi di ruang embedding dengan regularisasi varians — sistem belajar "apa yang penting diprediksi" alih-alih menghafal tekstur dunia.',
        },
        {
          type: 'paragraph',
          text: 'Rantai bukti empirisnya cepat: I-JEPA (Assran dkk., CVPR 2024) membuktikan prediksi representasi citra menghasilkan fitur semantik tanpa augmentasi; V-JEPA (Bardes dkk., 2024) memperluas ke video dan memahami dinamika fisik; V-JEPA 2 (2025, 1.2B parameter, dilatih di 1 juta jam video) plus varian action-conditioned V-JEPA 2-AC memungkinkan robot memplanning pengambilan objek zero-shot di laboratorium yang belum pernah dilihat. Pada Juni 2025 LeCun merancang roadmap AMI (Advanced Machine Intelligence) berbasis keluarga ini; dan pada November 2025 ia mengumumkan keluar dari Meta untuk mendirikan startup world-model dengan pendanaan yang dilaporkan di kisaran miliaran dolar — sinyal pasar bahwa jalur ini dianggap seri, bukan eksotis.',
        },
        {
          type: 'paragraph',
          text: 'Titik patah: JEPA menyelesaikan persepsi dan prediksi, tetapi belum membuktikan diri pada penalaran diskrit, bahasa, dan akuisisi keterampilan bertingkat — persis area tempat LLM dan RL unggul. Kritik menerima bahwa prediksi abstrak baik untuk intuisi fisika, namun menantang klaim bahwa penalaran akan "muncul" dari world model; belum ada bukti JEPA menyelesaikan tugas ala ARC di mana abstraksi kombinatorial dibutuhkan. Bagi blueprint kita, keluarga ini menjadi penyedia dua komponen esensial: encoder persepsi yang semantic dan world model untuk planning — sementara inti penalaran dan bahasa tetap dipinjam dari keluarga lain. Ini keputusan komposit, bukan keputusan loyalitas.',
        },
        {
          type: 'papers',
          ids: ['ha2018', 'lecun2022', 'assran2024', 'bardes2024', 'v-jepa2-2025'],
        },
      ],
    },
    {
      id: 'arch-neurosymbolic',
      title: 'Keluarga 4 — Neuro-Symbolic: AlphaGeometry, AlphaProof, OpenCog',
      kicker: 'GEL. 4',
      blocks: [
        {
          type: 'paragraph',
          text: 'Keluarga ini mengambil jalan tengah yang secara desain paling sering memenangkan kompetisi: neural network sebagai mesin intuisi (menghasilkan kandidat dengan cepat), sistem simbolik sebagai mesin verifikasi (menjamin kebenaran). AlphaGeometry (Trinh dkk., Nature 2024) adalah demonstrasi terbaiknya: LLM neural menghasilkan konstruk geometri tambahan, mesin deduksi simbolik (DD+AR) memeriksa dan menyusun bukti formal; dilatih dengan 100 juta bukti sintetis tanpa demonstrasi manusia, sistem menyelesaikan 25/30 soal geometri olimpiade — melampaui metode terbaik sebelumnya (18/30) dan menyamai rata-rata medal emas. AlphaProof (DeepMind; paper Nature, November 2025) melangkah lebih jauh: agen bergaya AlphaZero yang belajar menemukan bukti di bahasa formal Lean lewat RL atas jutaan soal terautoformalisasi; bersama AlphaGeometry 2, ia mencapai standar medali perak IMO 2024 (34/42) — level yang dua tahun sebelumnya dianggap jauh.',
        },
        {
          type: 'paragraph',
          text: 'Di ujung ambisi penuh, OpenCog Hyperon (Goertzel dkk., 2023) adalah arsitektur hybrid yang menyatukan semuanya secara eksplisit: MeTTa sebagai bahasa metagraph yang memprogram dirinya sendiri, Distributed AtomSpace sebagai memori pengetahuan atomistik skala miliaran, PLN (Probabilistic Logic Networks) untuk penalaran berbasis ketidakpastian, ECAN untuk alokasi attention berbasis ekonomi, serta proses kognitif (pattern mining, program synthesis evolusioner, RL) yang berjalan paralel di atas substrate yang sama — dengan LLM diposisikan sebagai salah satu "otak" proses, bukan pusat satu-satunya. Roadmap Hyperon menyatakan: bila stack produksi tercapai akhir 2025, human-level AGI "dalam beberapa tahun" adalah target yang mereka pertaruhkan. Klaim ini belum teruji di benchmark besar, tetapi arsitekturnya adalah referensi paling lengkap tentang bagaimana komponen-komponen kognitif bisa diikat dalam satu lingkaran belajar.',
        },
        {
          type: 'paragraph',
          text: 'Titik patah neuro-symbolic ada di dua tempat: penerjemahan (grounding problem — memindahkan masalah dunia terbuka ke representasi formal yang rapi tetap pekerjaan yang belum terotomasi) dan rekayasa (AlphaGeometry/AlphaProof menang di domain yang bisa diformalkan; di luar matematika, verifier formal yang memadai langka). Marcus (2020) merangkum kasusnya: LLM murni robustness-nya terbatas, dan hybrid adalah syarat; tetapi yang belum ia selesaikan adalah bagaimana hybrid itu belajar end-to-end tanpa engineering berat per domain. Untuk blueprint kita, keluarga ini menyumbang komponen yang tidak bisa dinegosiasikan: verifier simbolik dan mekanisme memori pengetahuan terstruktur — diterapkan pada domain yang memungkinkan formalisasi, dengan jalur bertahap ke domain yang lebih terbuka.',
        },
        {
          type: 'papers',
          ids: ['trinh2024', 'alphaproof2025', 'goertzel2023', 'marcus2020'],
        },
      ],
    },
    {
      id: 'arch-llm',
      title: 'Keluarga 5 — LLM-as-Core + RL Reasoning: o-series dan R1',
      kicker: 'GEL. 5',
      blocks: [
        {
          type: 'paragraph',
          text: 'Keluarga kelima adalah evolusi langsung keluarga koneksionis dengan dua tambahan strategis: reinforcement learning untuk penalaran dan tool-use untuk aksi. OpenAI o1 (September 2024) mendemonstrasikan hukum penskalaan kedua: test-time compute — membiarkan model "berpikir" lebih lama di waktu inferensi via chain-of-thought yang dilatih RL meningkatkan akurasi secara monoton pada soal penalaran, komplementer terhadap scaling parameter. DeepSeek-R1 (Januari 2025; dipublikasikan di Nature, September 2025) memperlihatkan mekanismenya lebih mentah: RL murni dengan GRPO tanpa supervised fine-tuning manusia menginduksi perilaku refleksi, verifikasi diri, dan "aha moment" — chain-of-thought panjang tumbuh sebagai solusi optimal masalah yang diberikan reward kebenaran. Artinya: proses penalaran dapat di-tumbuhkan dari reward yang benar, bukan hanya disalin dari data manusia — temuan yang mengubah peta jalur AGI secara permanen.',
        },
        {
          type: 'paragraph',
          text: 'Dalam arsitektur agennya, keluarga ini menyusun LLM sebagai inti keputusan dikelilingi memori eksternal (vektor database, file), alat (kode interpreter, pencarian, API), dan loop perencanaan-eksekusi-refleksi — praktis merupakan "cognitive architecture" versi engineering yang mengadopsi struktur SOAR/ACT-R secara ad-hoc. Hasil benchmark 2024-2026 menunjukkan jangkauannya: dokumen miliaran token, kode produksi, soal olimpiade dalam modul teks, hingga ~25% FrontierMath (o3) yang dua tahun sebelumnya 0%. Namun laporan ARC Prize (April 2025) mengingatkan batasnya: o3 dengan compute masif mencapai 87.5% di ARC-AGI-1 (low-efficiency mode, biaya ribuan dolar per tugas) tetapi hanya ~3% di ARC-AGI-2 — ketika puzzle menuntut abstraksi yang tidak bisa dibeli dengan pencarian brute-force, sistem gagal. Kegagalan persisten di benchmark novel-task inilah bukti terkuat bahwa LLM-as-core saja belum cukup.',
        },
        {
          type: 'paragraph',
          text: 'Titik patah kelima: (1) ground truth — RL butuh verifier yang benar, dan di domain terbuka verifier sulit; (2) world model implisit yang rapuh — model menalar dari pola bahasa, bukan model fisika/kausal yang stabil; (3) memori persisten yang belum menyelesaikan problem konsolidasi; (4) otonomi panjang masih rendah — degradasi koherensi pada tugas berminggu-minggu. Sebaliknya, keluarga ini memiliki keunggulan yang tidak dimiliki lainnya: infrastruktur terbaik, iterasi tercepat, dan jalur pengukuran paling transparan. Dari semua keluarga, inilah yang paling dekat dengan "able to be deployed today" — dan karena itu blueprint kita menjadikannya tulang punggung integrasi, bukan bukti bahwa ia jawaban final.',
        },
        {
          type: 'papers',
          ids: ['openai-o1-2024', 'deepseek-r1-2025', 'chollet-arcagi2-2025', 'glazer2024', 'hle2025'],
        },
      ],
    },
    {
      id: 'arch-sintesis',
      title: 'Sintesis: Apa yang Setiap Keluarga Sum bangkan ke Blueprint',
      kicker: 'KESIMPULAN MODUL',
      blocks: [
        {
          type: 'paragraph',
          text: 'Lima keluarga bukan lima kandidat untuk dipilih satu — setelah melihat bukti, pola yang muncul adalah pembagian kerja fungsional. Keluarga simbolik menyumbang struktur organisasi (goal, memori modular, metakognisi, rubrik penilaian Newell). Keluarga koneksionis menyumbang substrat pembelajaran dan bahasa — satu-satunya teknologi yang pernah mencapai generalitas perilaku. Keluarga world-model menyumbang persepsi semantik dan mesin prediksi untuk planning. Keluarga neuro-symbolic menyumbang verifier dan memori pengetahuan formal. Keluarga LLM-as-core menyumbang loop integrasi, penalaran yang di-tumbuhkan RL, dan infrastruktur penerapan. Setiap komponen blueprint di Modul 7 akan dicantumkan asal keluarganya secara eksplisit — desain yang tidak dapat menyebut asal buktinya dianggap spekulasi dan ditolak.',
        },
        {
          type: 'callout',
          tone: 'teal',
          title: 'Klaim konvergen lintas kubu',
          text: 'Tiga properti yang semua keluarga akui dibutuhkan: (1) memori yang konsolidasi pengalaman menjadi keterampilan; (2) model dunia yang menopang generalisasi novel; (3) mekanisme verifikasi yang terpisah dari generator. Perbedaan kubu hanya pada urutan prioritas dan sarana implementasinya — inilah basis terkuat untuk desain komposit.',
        },
      ],
    },
  ],
}
