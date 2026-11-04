import type { ModuleData } from '@/lib/types'
import { PAPERS } from './papers'

export const modReferensi: ModuleData = {
  id: 'referensi',
  label: 'Referensi',
  short: `Database ${PAPERS.length} paper inti dua lapis (klasik + frontier) dengan pencarian & filter`,
  tagline: 'Fondasi bukti seluruh basis pengetahuan — 40 paper inti, dapat dicari dan difilter per kategori',
  color: '#e879f9',
  sections: [
    {
      id: 'ref-db',
      title: 'Database Paper: 1950-2026',
      kicker: 'DATABASE',
      blocks: [
        {
          type: 'paragraph',
          text: 'Seluruh tautan silang dari modul lain bermuara di sini. Setiap entri memuat judul, penulis, tahun, tempat terbit, klaim kuncinya dalam satu-dua kalimat, dan tautan sumber bila tersedia. Filter kategori membagi database sesuai peran paper dalam argumen tim: definisi (apa yang kita kejar), arsitektur (bagaimana membangun), bukti (apa yang terbukti), benchmark (bagaimana mengukur), dan safety (bagaimana menjaga). Gunakan pencarian untuk menemukan paper berdasarkan penulis, tahun, atau kata kunci — misalnya ketik "JEPA", "2019", atau "Hutter".',
        },
        { type: 'paragraph', text: 'REFERENSI_DB_COMPONENT' },
      ],
    },
    {
      id: 'ref-pantauan',
      title: 'Daftar Pantauan Kuartalan',
      kicker: 'MAINTENANCE',
      blocks: [
        {
          type: 'paragraph',
          text: 'Basis pengetahuan yang hidup butuh jadwal. Setiap kuartal tim memeriksa sumber-sumber berikut dan memperbarui klaim di seluruh modul: (1) ARC Prize Foundation — laporan teknis tahunan dan skor leaderboard ARC-AGI-2/3; (2) Nature & arXiv untuk lanjutan AlphaProof-lineage dan world model; (3) rilis model frontier OpenAI/Anthropic/Google DeepMind beserta system card-nya; (4) benchmark Epoch AI (FrontierMath) dan CAIS (HLE) untuk pergeseran ambang keahlian; (5) roadmap OpenCog Hyperon untuk kemajuan arsitektur hybrid; (6) publikasi startup world-model LeCun sebagai pengujian jalur JEPA di luar akademia. Kriteria adopsi klaim baru: level bukti setara tetangganya, tersedia replikasi atau benchmark publik, dan tidak bertumpu pada demo selektif.',
        },
      ],
    },
  ],
}
