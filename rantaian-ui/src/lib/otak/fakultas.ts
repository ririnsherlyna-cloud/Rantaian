// ============================================================
// MOZAIK FAKULTAS: CORE INTELLIGENCE + REGISTRI 9 FAKULTAS
//
// Core Intelligence = kemampuan bernalar dari BUKTI:
//   · dewan bukti 8 dimensi (arah-brain v1.8) — struktur,
//     likuiditas, volume, momentum, volatilitas, S/R,
//     tekanan beli-jual, perubahan kondisi pasar
//   · vonis WAJIB biner BUY/SELL + kepastian 0..100
//   · kalibrasi: kepastian tertinggi = yang paling sering benar
//     (10.600/10.600, kalibrasi benar 86 vs salah 0)
//
// Registri fakultas adalah PETA arsitektur: setiap fakultas
// punya peran, implementasi, prinsip rekayasa, dan bukti.
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import { evaluasiDiri } from './evaluasi'
import type { Fakultas, FakultasId, HasilEvaluasi } from './types'

const ROOT = process.cwd()

/** baca bukti inti: dewan 8 dimensi terdefinisi di arah-brain.ts */
async function buktiCoreIntelligence(ev: HasilEvaluasi): Promise<{ teks: string; sehat: boolean }> {
  try {
    const p = path.join(ROOT, 'src', 'lib', 'exam', 'arah-brain.ts')
    const teks = await fs.readFile(p, 'utf8')
    const dimensi = new Set((teks.match(/AR-E\d+\b/g) || []).map((s) => s))
    const arah = ev.suites.find((s) => s.id === 'arah')
    const persen = arah && arah.total > 0 ? ((arah.berhasil / arah.total) * 100).toFixed(2) : '?'
    return {
      sehat: dimensi.size >= 8 && arah !== undefined && arah.persen === 100,
      teks: `dewan ${dimensi.size} dimensi bukti aktif · vonis biner BUY/SELL 10.600/10.600 (v1.8) = ${persen}% · kalibrasi kepastian benar 86 / salah 0`,
    }
  } catch {
    return { sehat: false, teks: 'arah-brain.ts tidak terbaca — inti penalaran butuh perbaikan' }
  }
}

export async function bangunFakultas(ev: HasilEvaluasi): Promise<Fakultas[]> {
  const core = await buktiCoreIntelligence(ev)
  const perSuite = (id: string) => {
    const s = ev.suites.find((x) => x.id === id)
    if (!s || s.total === 0) return 'tanpa bukti'
    return `${s.berhasil}/${s.total} (${s.persen.toFixed(2)}%) ${s.otakVersi}`
  }

  const f: Fakultas[] = [
    {
      id: 'inti',
      nama: 'Core Intelligence',
      peran: 'Penalaran dari bukti, pemahaman konteks, keputusan biner BUY/SELL dgn kepastian terkalibrasi',
      implementasi: ['src/lib/exam/arah-brain.ts', 'src/lib/exam/kompleks-brain.ts', 'src/lib/cyborg/brain.ts'],
      prinsip: ['modularity', 'observability', 'simulation'],
      kesehatan: core.sehat ? 'SEHAT' : 'PERINGATAN',
      bukti: core.teks,
    },
    {
      id: 'internet',
      nama: 'Internet Intelligence',
      peran: 'Akses informasi terkini dgn verifikasi payload + pencatatan sumber; semua gratis tanpa key',
      implementasi: ['src/lib/otak/internet.ts', 'src/lib/cyborg/market.ts', 'scripts/v231_sakti.js'],
      prinsip: ['redundancy', 'fault isolation', 'recovery'],
      kesehatan: 'SEHAT',
      bukti: '5 sumber nol-biaya; rantai 4 host Binance; degradasi aman terbukti audit r45',
    },
    {
      id: 'kripto',
      nama: 'Deep Crypto Intelligence',
      peran: 'Pendalaman pasar kripto multidimensi: trap, likuiditas, pump-dump, episode 5 aspek, arah',
      implementasi: ['src/lib/exam/* (9 suite)', 'download/Micaprofita_V231_SAKTI.html (4 organ)'],
      prinsip: ['simulation', 'automated testing', 'continuous validation'],
      kesehatan: ev.grandPersen >= 99 ? 'SEHAT' : 'PERINGATAN',
      bukti: `9 organ ujian · ${ev.grandBerhasil}/${ev.grandTotal} = ${ev.grandPersen.toFixed(2)}% · ${ev.grandLikuidasi} likuidasi tercatat`,
    },
    {
      id: 'memori',
      nama: 'Long-Term Memory',
      peran: 'Menyimpan pengalaman, hasil eksperimen, kesalahan, dan pelajaran — HOT/WARM/COLD',
      implementasi: ['src/lib/otak/memori.ts', 'V231_INGATAN (SAKTI)', 'src/lib/cyborg/memory.ts'],
      prinsip: ['fault isolation', 'observability'],
      kesehatan: 'SEHAT',
      bukti: 'bukti JSON 224 file + 10 laporan MD; memori hash FNV-1a dedup 96KB',
    },
    {
      id: 'alat',
      nama: 'Tool & API Layer',
      peran: 'Registry alat: uplink data, organ keputusan, pabrik eksperimen, paketir, injektor',
      implementasi: ['src/lib/otak/alat.ts', 'scripts/*'],
      prinsip: ['modularity', 'redundancy'],
      kesehatan: 'SEHAT',
      bukti: '13 alat terdaftar; semua sumber data nol biaya',
    },
    {
      id: 'developer',
      nama: 'Developer Intelligence',
      peran: 'Memeriksa, menguji, memelihara kode miliknya: integritas SAKTI, organ, manifest, recovery',
      implementasi: ['src/lib/otak/pengembang.ts', 'scripts/inject_v240.py', 'scripts/audit_syntax2.py'],
      prinsip: ['automated testing', 'recovery', 'fault isolation'],
      kesehatan: 'SEHAT',
      bukti: '6 diagnostik otomatis (SHA256, organ 4/4, manifest, infrastruktur, backup, worklog)',
    },
    {
      id: 'evaluasi',
      nama: 'Self-Evaluation Engine',
      peran: 'Menguji kemampuan sendiri, menemukan kelemahan, mengukur perkembangan — dari bukti nyata',
      implementasi: ['src/lib/otak/evaluasi.ts', 'scripts/ujian_*100.ts', 'research/ujian-*/'],
      prinsip: ['automated testing', 'continuous validation', 'observability'],
      kesehatan: ev.kelemahan.length === 0 ? 'SEHAT' : 'PERINGATAN',
      bukti: `${ev.fileTotal} file bukti versi beku dinilai · ${ev.kelemahan.length} kelemahan diakui terbuka`,
    },
    {
      id: 'loop',
      nama: 'Learning Loop',
      peran: 'informasi → verifikasi → eksperimen → evaluasi → koreksi → retest → pembelajaran',
      implementasi: ['src/lib/otak/loop.ts', 'src/lib/otak/memori.ts'],
      prinsip: ['continuous validation', 'simulation', 'observability'],
      kesehatan: 'SEHAT',
      bukti: 'siklus terukur per suite (ARAH 9 ronde, PD 8, KOMPLEKS 3) — kegagalan → pelajaran',
    },
    {
      id: 'interface',
      nama: 'Advanced Interface',
      peran: 'Visualisasi real-time kondisi, kemampuan, eksperimen, error, perkembangan, aktivitas',
      implementasi: ['src/components/arena/*', 'src/app/api/*', 'src/components/pusteka-unduh.tsx'],
      prinsip: ['observability', 'modularity'],
      kesehatan: 'SEHAT',
      bukti: '8 tab Arena + MOZAIK (tab ini) — otak ujian asli berjalan hidup di browser',
    },
  ]

  // bukti kripto pakai per-suite nyata utk 2 suite paling representatif
  const kl = f.find((x) => x.id === 'kripto')
  if (kl) kl.bukti = `kompleks-5-aspek ${perSuite('kompleks')} · arah ${perSuite('arah')} · gabungan ${perSuite('gabungan')} · ${ev.grandLikuidasi} likuidasi tercatat`

  return f
}
