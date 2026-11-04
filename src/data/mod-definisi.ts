import type { ModuleData } from '@/lib/types'

export const modDefinisi: ModuleData = {
  id: 'definisi',
  label: 'Definisi & Teori',
  short: 'Apa itu AGI: dari Turing Test, universal intelligence, ARC, hingga Levels of AGI',
  tagline: 'Target yang kita kejar harus didefinisikan lebih dulu — lima generasi definisi dan implikasi desainnya',
  color: '#fbbf24',
  sections: [
    {
      id: 'def-genesis',
      title: 'Genesis: Dari "Bisa Berpikir?" ke Uji Operasional',
      kicker: '1950-1957',
      blocks: [
        {
          type: 'paragraph',
          text: 'Perdebatan AGI modern sebenarnya adalah kelanjutan langsung dari langkah metodologis Turing pada 1950. Alih-alih tenggelam dalam filosofi "apakah mesin dapat berpikir", Turing mengganti pertanyaan itu dengan uji perilaku yang dapat dijalankan: apakah juri tidak bisa membedakan mesin dari manusia dalam percakapan (Imitation Game). Langkah ini menetapkan dua tradisi yang bertahan hingga kini: tradisi perilaku (kecerdasan dinilai dari performa yang teramati) dan tradisi generality (kecerdasan yang dicari adalah kemampuan menangani apa pun yang bisa ditangani manusia, bukan satu spesialisasi). Turing sendiri sudah antisipatif: ia membantah sembilan keberatan klasik — dari teologis hingga keberatanLady Lovelace tentang kreativitas — dengan argumentasi yang hingga hari ini masih dipakai ulang dalam debat LLM.',
        },
        {
          type: 'paragraph',
          text: 'Lima tahun kemudian, proposal Dartmouth (McCarthy, Minsky, Rochester, Shannon, 1955) melahirkan istilah "artificial intelligence" dan menetapkan hipotesis fondasi seluruh lapangan: setiap aspek pembelajaran atau fitur kecerdasan mana pun, pada prinsipnya, dapat disimulasikan sepresisi itu oleh mesin — khususnya lewat program yang belajar. Simulasi ini terwujud lebih cepat dari jadwal: General Problem Solver (Newell, Shaw, Simon, 1957) menunjukkan satu program dengan satu metode umum (means-ends analysis) bisa memecahkan teorema, soal logika, dan puzzle. Dua sisi medali itu — optimisme Dartmouth dan keberhasilan GPS — mengandung benih kesalahan estimasi yang akan berulang: kemampuan memecahkan soal formal ternyata tidak langsung menjangkau kecerdasan dunia nyata yang lentur.',
        },
        {
          type: 'papers',
          ids: ['turing1950', 'mccarthy1955', 'newell1957'],
        },
      ],
    },
    {
      id: 'def-formal',
      title: 'Definisi Formal: Universal Intelligence dan AIXI',
      kicker: '1997-2007',
      blocks: [
        {
          type: 'paragraph',
          text: 'Istilah "artificial general intelligence" pertama kali terdokumentasi pada makalah Mark Gubrud (1997) tentang dampak teknologi nanoperang: AI yang cocokkan atau melampaui kemampuan kognitif manusia di hampir semua bidang yang diinginkan. Definisi awal ini menetapkan tiga komponen yang bertahan sampai sekarang: pembanding (manusia), cakupan (hampir semua bidang), dan sifat pencapaian (menyamai atau melampaui). Komunitas riset kemudian memformalkan definisi ini secara matematis pada dekade berikutnya, terutama melalui kerja Shane Legg dan Marcus Hutter.',
        },
        {
          type: 'paragraph',
          text: 'Definisi Legg & Hutter (2007) adalah hasil akhir dari pengumpulan puluhan definisi kecerdasan dan ekstraksi komon mereka: universal intelligence suatu agen π didefinisikan sebagai rata-rata berbobot dari performa agen di seluruh lingkungan yang mungkin, dengan bobot 2^(-K(μ)) — semakin sederhana (panjang program Kolmogorov rendah) suatu lingkungan, semakin tinggi bobotnya. Rumus ini elegan karena tiga alasan: ia mengoperasionalkan "general" (rata-rata lintas lingkungan, bukan satu domain), menghadirkan prinsip Occam sebagai bobot prior, dan terhubung langsung ke agen teoretis AIXI milik Hutter (2005) — agen optimal yang menggabungkan induksi Solomonoff, teori keputusan sekuensial, dan eksplorasi. AIXI tidak dapat dihitung, tetapi berfungsi sebagai batas atas teoretis: setiap arsitektur AGI praktis dapat ditanya "seberapa jauh Anda dari AIXI dalam aspek aspek apa".',
        },
        {
          type: 'paragraph',
          text: 'Dua konsekuensi desain penting lahir dari tradisi formal ini. Pertama, kecerdasan adalah properti agen-interaksi — ia hanya bermakna dalam lingkaran persepsi-tindakan terhadap lingkungan, bukan properti pasif pada teks; ini argumen kuat mengapa blueprint kita butuh loop agen dan lingkungan uji, bukan hanya model bahasa. Kedua, karena rata-rata lintas lingkungan mendominasi, sistem yang sangat kuat di domain sempit (misalnya permainan) tidak memindahkan skor universalnya — generalitas harus dibangun secara eksplisit, dan itu yang membuat benchmark novel-task seperti ARC menjadi alat ukur yang lebih jujur daripada rangkaian soal akademik.',
        },
        {
          type: 'papers',
          ids: ['gubrud1997', 'legg2007', 'hutter2005'],
        },
      ],
    },
    {
      id: 'def-chollet',
      title: 'Kritik Chollet: Kecerdasan sebagai Efisiensi Akuisisi Skill',
      kicker: '2019',
      blocks: [
        {
          type: 'paragraph',
          text: 'Chollet (2019) meretakan fondasi dengan satu pembagian tajam: skill-A (keterampilan yang dikuasai pada domain yang dilihat selama pelatihan) versus skill-B (kemampuan menguasai keterampilan baru dengan efisien). Kecerdasan yang kita maksud dengan kata "general" adalah skill-B, bukan skill-A. Implikasinya brutal bagi benchmark klasik: skor tinggi pada tugas yang mirip data pelatihan hanya mengukur kompresi data, bukan kecerdasan. Definisi operasionalnya: kecerdasan adalah laju akuisisi keterampilan baru, memperhitungkan sebelumnya (prior knowledge), pengalaman, dan kesulitan generalisasi — pengukuran di atas rentang tugas yang tidak pernah dilihat.',
        },
        {
          type: 'paragraph',
          text: 'Dari definisi ini lahir Abstraction and Reasoning Corpus (ARC): tugas-tugas visual sederhana bagi manusia (poligon, pewarnaan, simetri) tetapi membutuhkan induksi core-knowledge seperti objekness, kesinambungan, dan hubungan sebab-akibat — bukan pengetahuan ensiklopedis. ARC sengaja dirancang agar murah bagi manusia (rata-rata manusia yang teliti bisa 75-85%) namun menyulitkan penghafal: setiap tugas adalah puzzle novel. Sejarahnya memberi dua pelajaran besar bagi tim kita. Pertama, ARC-1 (2019) bertahan hampir tanpa terkalahkan selama lima tahun hingga o3 menembusnya pada akhir 2024 via penggunaan test-time compute yang masif — generalisasi "setengah jalan" bisa dibeli dengan compute, dan definisi benchmark harus terus bergerak (ARC-AGI-2, 2025, menjatuhkan o3 ke sekitar 3%). Kedua, benchmark adalah bagian dari teori: mendesain ukuran adalah tindakan riset sama pentingnya dengan mendesain arsitektur.',
        },
        {
          type: 'quote',
          text: 'Intelligence is skill-acquisition efficiency: the efficiency with which an individual can turn their experiences into generalizable programs that address the range of tasks they might encounter.',
          source: 'F. Chollet, On the Measure of Intelligence (2019)',
        },
        {
          type: 'papers',
          ids: ['chollet2019', 'chollet-arcagi2-2025'],
        },
      ],
    },
    {
      id: 'def-levels',
      title: 'Levels of AGI: Standardisasi DeepMind',
      kicker: '2023-2024',
      blocks: [
        {
          type: 'paragraph',
          text: 'Kekacauan istilah (setiap lab punya definisi sendiri) dipangkas Google DeepMind melalui kerangka Levels of AGI (Morris dkk., 2023; versi position paper ICML 2024, 350+ sitasi). Kerangkanya memetakan sistem pada dua dimensi: depth performance (emerging → competent → expert → virtuoso → superhuman) dan breadth generality (narrow → general), lalu menumpangkan tangga otonomi L0-L5 (tool → oracle → consultant → agent → collaborator). Hasilnya lugas: sistem frontier hari ini duduk di Level 1 — "Emerging AGI" yang general namun berkemampuan emerging — dengan otonomi rendah (mungkin Level 0-1: alat dan oracle). Kelas "Competent AGI general" (Level 3, setara manusia kompeten di mayoritas tugas) belum ada.',
        },
        {
          type: 'paragraph',
          text: 'Bagi tim pengembang, kerangka ini punya tiga fungsi strategis. Pertama, ia adalah bahasa target yang dapat dikontrak: daripada "kapan AGI tercapai", kita bisa bertanya "komponen apa yang menahan kita di Level 1 — performance-nya atau generality-nya atau otonomi-nya". Kedua, ia memisahkan debat kapabilitas dari debat risiko: threshold yang relevan bagi risiko justru otonomi + generality, bukan angka benchmark; sistem Level-1-general dengan otonomi agen penuh sudah butuh tata kelola serius. Ketiga, ia mendefinisikan roadmap pengukuran kita: prototipe akan dievaluasi dengan matriks performa × generality × otonomi yang sama, sehingga kemajuan dapat dilaporkan tanpa retorika. Catatan kritis: kerangka ini dinilai sebagian pihak (termasuk komunitas ARC) masih terlalu murah hati pada Level 1 karena benchmark yang dipakai untuk menilai "emerging" sebagian besar adalah tugas yang mirip data pelatihan.',
        },
        {
          type: 'papers',
          ids: ['morris2023', 'bubeck2023'],
        },
      ],
    },
    {
      id: 'def-sintesis',
      title: 'Sintesis Tim: Definisi Kerja AGI untuk Proyek Kita',
      kicker: 'KESIMPULAN MODUL',
      blocks: [
        {
          type: 'paragraph',
          text: 'Menyatukan lima generasi definisi, kita menetapkan definisi kerja untuk proyek ini: AGI adalah sistem yang mampu menguasai keterampilan baru pada domain novel dengan efisiensi yang sebanding dengan manusia yang kompeten, diterapkan pada rentang tugas yang mencakup mayoritas pekerjaan kognitif ekonomi, dengan siklus persepsi-tindakan yang menutup (dunia nyata atau simulasi), dan dengan perilaku yang tetap koheren di bawah distribusi yang belum pernah dilihat. Definisi ini sengaja mengambil struktur operasional Legg-Hutter (generalitas lintas lingkungan), inti skill-B Chollet (efisiensi akuisisi), pengukuran dua-arah Morris (performance × generality × otonomi), dan tuntutan siklus agen dari Turing.',
        },
        {
          type: 'table',
          headers: ['Sumber definisi', 'Kata kunci', 'Yang diukur', 'Kontribusi ke definisi kerja kita'],
          rows: [
            ['Turing (1950)', 'Imitation game', 'Perilaku tak terbedakan dari manusia', 'Prinsip pengukuran perilaku + siklus agen'],
            ['Legg & Hutter (2007)', 'Universal intelligence', 'Performa rata-rata lintas lingkungan berbobot sederhana', 'Generalitas eksplisit lintas domain'],
            ['Chollet (2019)', 'Skill-acquisition efficiency', 'Kecepatan menguasai tugas novel', 'Benchmark novel-task (ARC) sebagai ukuran utama'],
            ['Morris dkk. (2023)', 'Levels of AGI', 'Performance × generality × otonomi', 'Matriks pelaporan progres + threshold risiko'],
            ['Goertzel (2014)', 'Real-world orientation', 'Generalitas + praktikalitas ekonomi', 'Target level "kompeten" pada pekerjaan nyata'],
          ],
        },
        {
          type: 'callout',
          tone: 'emerald',
          title: 'Konsekuensi untuk blueprint',
          text: 'Definisi kerja ini langsung menetapkan komponen minimum arsitektur: (1) world model agar generalisasi ke novel mungkin; (2) memori agar pengalaman dapat dikompres jadi skill; (3) loop agen yang menutup persepsi-tindakan; (4) lapisan evaluasi internal (self-critic) agar koherensi terjaga di luar distribusi. Modul Arsitektur membahas kandidat mekanismenya satu per satu.',
        },
      ],
    },
  ],
}
