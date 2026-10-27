// ============================================================
// MOZAIK FAKULTAS: TOOL & API LAYER
// Registry alat milik cyborg — apa saja yang bisa dipakai,
// di mana filenya, versinya, dan bukti kerjanya.
// Semua alat data = NOL BIAYA (mandat Guru).
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import type { Alat } from './types'

const ROOT = process.cwd()

const REGISTRASI: Omit<Alat, 'versi'>[] = [
  // --- mata & telinga (data pasar) ---
  { id: 'nafas-arena', nama: 'NAFAS-ARENA (uplink pasar)', file: 'src/lib/cyborg/market.ts', peran: 'candle OHLCV + ticker + regime BTC dari 4-host chain, TTL + circuit breaker', zeroCost: true, bukti: 'audit_realtime_r45.ts — 418/timeout pulih, null-safe' },
  { id: 'nafas-sakti', nama: 'V231_NAFAS (uplink SAKTI)', file: 'scripts/v231_sakti.js', peran: 'klines/ticker/premiumIndex/OI/long-short + CoinGecko + F&G di dalam SAKTI', zeroCost: true, bukti: 'self-test V231 + audit real-time LAPORAN-AUDIT-REALTIME.md' },
  { id: 'llm', nama: 'GLM (z-ai-web-dev-sdk)', file: 'src/lib/cyborg/llm.ts', peran: 'penalaran briefing guru & ringkasan konteks', zeroCost: true, bukti: 'src/app/api/guru — dipakai Ruang Guru' },

  // --- organ keputusan bersertifikat ---
  { id: 'organ-fbo', nama: 'SAKTI-FBO (false breakout)', file: 'src/lib/exam/fbo-brain.ts', peran: 'deteksi false breakout + guard + roll-over', zeroCost: true, bukti: 'latihan 2976/2976 · hakim-1 744/744' },
  { id: 'organ-pd', nama: 'SAKTI-PD (pump & dump)', file: 'src/lib/exam/pumpdump-brain.ts', peran: 'tangga keputusan pump-dump 14 arketipe', zeroCost: true, bukti: '1600/1600 = 100.00%' },
  { id: 'organ-kl', nama: 'SAKTI-KOMPLEKS (5 aspek)', file: 'src/lib/exam/kompleks-brain.ts', peran: 'vonis episode: 5 aspek berinteraksi dalam 1 rangkaian', zeroCost: true, bukti: '1600/1600 = 100.00%' },
  { id: 'organ-ar', nama: 'SAKTI-ARAH (kepastian arah)', file: 'src/lib/exam/arah-brain.ts', peran: 'dewan bukti 8 dimensi → vonis biner BUY/SELL + kepastian', zeroCost: true, bukti: '10.600/10.600 = 100.00%' },

  // --- pabrik eksperimen (simulation) ---
  { id: 'rng', nama: 'RNG berbibit (mulberry32)', file: 'src/lib/exam/rng.ts', peran: 'determinisme penuh: skenario identik di semua mesin', zeroCost: true, bukti: 'repro 100% antar-mesin' },
  { id: 'forge', nama: '9 suite generator skenario', file: 'src/lib/exam/kompleks-forge.ts (+8)', peran: 'pasar sintetis anti-hindsight 60 visible + 14 horizon', zeroCost: true, bukti: 'research/ujian-* — 224 file JSON bukti' },
  { id: 'runner', nama: 'Runner ujian 12-field', file: 'scripts/ujian_arah100.ts (+8)', peran: 'fee 0.1%+0.1% wajib, net P/L, stop wajib, kalibrasi', zeroCost: true, bukti: 'semua laporan LAPORAN-UJIAN-*' },

  // --- engineering (developer) ---
  { id: 'paket', nama: 'Paketir taskfiles', file: 'scripts/package_taskfiles.sh', peran: 'kemas seluruh deliverable → ZIP + INDEX', zeroCost: true, bukti: 'MICAPROFITA-TASKFILES.zip' },
  { id: 'unduh', nama: 'PUSTEKA UNDUH', file: 'scripts/siapkan_unduh.ts', peran: 'zona unduh web + manifest SHA256 per file', zeroCost: true, bukti: 'public/unduh/manifest.json' },
  { id: 'injeksi', nama: 'Injektor organ SAKTI', file: 'scripts/inject_v240.py (+9)', peran: 'upgrade in-place SAKTI 15 MB, idempoten + backup', zeroCost: true, bukti: 'v237/v238/v239/v240 terverifikasi di dalam HTML' },
]

async function versiFile(relatif: string): Promise<string | null> {
  try {
    const teks = await fs.readFile(path.join(ROOT, relatif), 'utf8')
    const m = /versi\s*[:=]\s*['"]([\w.\-]+)['"]/i.exec(teks) ?? /V2\d\d[^\d\n]{0,30}v?(\d+\.\d+)/i.exec(teks)
    return m ? m[1] : null
  } catch {
    return null // file absen — alat tetap terdaftar, statusnya terlihat
  }
}

export async function daftarAlat(): Promise<Alat[]> {
  return Promise.all(
    REGISTRASI.map(async (a) => ({ ...a, versi: await versiFile(a.file) })),
  )
}
