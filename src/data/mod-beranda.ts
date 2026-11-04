import type { ModuleData } from '@/lib/types'

export const modBeranda: ModuleData = {
  id: 'beranda',
  label: 'Peta Besar',
  short: 'Orientasi misi, status lapangan, dan cara memakai basis pengetahuan ini',
  tagline: 'Dari mana → ke mana: kondisi lapangan AGI per hari ini dan peran kita sebagai tim pengembang',
  color: '#f59e0b',
  sections: [
    {
      id: 'beranda-misi',
      title: 'Misi Ini: Kenapa Basis Pengetahuan Dibutuhkan',
      kicker: 'ORIENTASI',
      blocks: [
        {
          type: 'paragraph',
          text: 'Mengembangkan Artificial General Intelligence (AGI) bukan pekerjaan intuisi semata; ia menuntut penguasaan peta literatur yang terfragmentasi di banyak disiplin — kognitif, machine learning, neuro-symbolic, dan safety. Empat puluh tahun riset meninggalkan dua pertanyaan yang jawabannya belum sepenuhnya konvergen: definisi apa yang tepat untuk "general", dan arsitektur apa yang layak dipertaruhkan. Basis pengetahuan ini disusun sebagai alat kerja tim: setiap klaim diikat ke paper sumbernya, setiap jalur pendekatan diuji koherensinya, dan setiap gap eksplisit dicatat sebagai pekerjaan rumah riset kita sendiri.',
        },
        {
          type: 'paragraph',
          text: 'Struktur penalaran yang kita adopsi mengikuti lima pertanyaan yang Anda tetapkan: dari mana (akar historis dan definisional), ke mana (arah roadmap lembaga-lembaga besar), bagaimana (mekanisme arsitektural yang terbukti bekerja), mengapa (argumen dan bukti yang membuat tiap jalur kredibel atau rapuh), serta siapa dan di mana (aktor, lembaga, dan sumber daya yang benar-benar menggerakkan lapangan). Delapan modul di sebelah kiri mengalirkan kelima pertanyaan itu secara berurutan, dan modul Blueprint menjadi muara: sintesis desain arsitektur AGI yang bisa kita prototipe bertahap.',
        },
        {
          type: 'callout',
          tone: 'amber',
          title: 'Kaidah kerja tim',
          text: 'Tiga kaidah yang kita pegang: (1) bukti dulu, klaim kemudian — tidak ada komponen desain tanpa referensi paper; (2) benchmark dulu, narasi belakangan — progres diukur di ARC-AGI, FrontierMath, HLE, bukan demo; (3) safety bukan lapisan akhir — lapisan alignment direncanakan sejak diagram pertama.',
        },
      ],
    },
    {
      id: 'beranda-status',
      title: 'Status Lapangan Hari Ini (2026)',
      kicker: 'TITIK BERANGKAT',
      blocks: [
        {
          type: 'stats',
          items: [
            { value: 'Level 1', label: 'Posisi LLM frontier menurut Levels of AGI: "Emerging AGI" (Morris dkk., 2023)' },
            { value: '<5%', label: 'Skor model reasoning frontier di ARC-AGI-2 (o3 ≈ 3%, Apr 2025); open-source terbaik 24% (Jan 2026)' },
            { value: '~2027-2028', label: 'Prediksi agresif AGI (Aschenbrenner; kesepakatan 50% Shane Legg: 2028)' },
            { value: '56+', label: 'Jumlah arsitektur kognitif AGI teridentifikasi dalam survei literatur (Sukhobokov, 2024)' },
          ],
        },
        {
          type: 'paragraph',
          text: 'Peta besar lapangan saat ini bisa diringkas dalam satu kalimat: generalitas perilaku sudah tercapai lewat LLM frontier, tetapi generalitas penalaran belum. Model-model 2024-2026 (o-series, DeepSeek-R1, Gemini, Claude) membuktikan satu mesin bisa menulis kode, menganalisis dokumen, memecahkan soal olimpiade, dan mengoperasikan alat — namun kalah telak ketika dihadapkan pada puzzle novel yang menuntut abstraksi murni (ARC-AGI-2), matematika riset-level (FrontierMath), atau pertanyaan pakar lintas disiplin (Humanity\'s Last Exam). Jurang antara "tampak umum" dan "benar-benar general" inilah medan pertempuran riset hari ini.',
        },
        {
          type: 'paragraph',
          text: 'Di sisi arsitektur, terbentuk empat kubu yang sedang berebut fondasi sistem: jalur LLM-as-core yang diperkaya reasoning dan alat (OpenAI, Anthropic, Google DeepMind), jalur world-model prediktif non-generatif yang dipimpin Yann LeCun (JEPA — yang kini dibawa ke startup mandiri setelah ia keluar dari Meta pada akhir 2025), jalur neuro-symbolic hibrida yang terbukti di matematika formal (AlphaGeometry, AlphaProof) dan diwujudkan penuh oleh OpenCog Hyperon, serta jalur cognitive-architecture klasik (SOAR, ACT-R, LIDA) yang kini justru menjadi kosakata desain untuk agen LLM. Bukti empiris menunjukkan setiap kubu memiliki fragmen kebenaran — dan itulah alasan blueprint kita (Modul 7) mengambil bentuk komposit, bukan monolitik.',
        },
        {
          type: 'papers',
          ids: ['morris2023', 'chollet-arcagi2-2025', 'lecun2022', 'goertzel2023'],
        },
      ],
    },
    {
      id: 'beranda-cara-pakai',
      title: 'Cara Memakai Basis Pengetahuan Ini',
      kicker: 'PANDUAN',
      blocks: [
        {
          type: 'list',
          items: [
            'Modul 2 (Definisi & Teori) — akar soal "apa itu AGI": dari Turing Test hingga definisi formal Legg & Hutter, ARC Chollet, dan Levels of AGI DeepMind. Modul ini menentukan target yang kita kejar sebelum memilih senjata.',
            'Modul 3 (Arsitektur Kognitif) — inti "bagaimana": lima keluarga arsitektur dibedah satu per satu dengan mekanisme internalnya, bukti empiris, dan kegagalannya.',
            'Modul 4 (Kronologi) — "dari mana ke mana": garis waktu 1950-2026 yang menunjukkan pola gelombang, kejayaan, dan musim dingin; pola ini penting agar tidak terjebak hype.',
            'Modul 5 (Aktor Global) — "siapa dan di mana": lembaga, tokoh, klaim, dan sumber daya — memetakan lawan, mitra, dan literatur yang harus dipantau.',
            'Modul 6 (Bukti & Koherensi) — "mengapa": matriks bukti pro-kontra tiap jalur, klaim yang konvergen, dan gap riset eksplisit yang menjadi pekerjaan kita.',
            'Modul 7 (Blueprint) — muara praktis: arsitektur komposit AGI-G1 yang bisa diprototipe, lengkap dengan rencana evaluasi dan tahapan build.',
            'Modul 8 (Referensi) — database 40 paper inti dengan pencarian dan filter; setiap chip paper di seluruh modul terhubung ke sini.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Konvensi membaca: istilah teknis dipertahankan dalam bahasa Inggris (world model, alignment, test-time compute) karena itulah kosakata kerja literatur internasional yang akan kita kutip dan diskusikan. Chip berwarna di dalam teks adalah tautan silang ke paper — klik untuk membuka detail, klaim kuncinya, dan tautan sumbernya. Angka dan tanggal disertakan agar setiap klaim dapat diverifikasi ulang; bila ada klaim yang kontroversial atau berbasis laporan media, disebutkan secara eksplisit.',
        },
      ],
    },
  ],
}
