// ============================================================
// OTAK PRAKIRA — TRAJEKTORI PRA-REGISTRASI (SEBELUM TERJADI).
//
// Mandat Guru: "menembak akurasi yang sangat koheren SEBELUM
// prediksi itu terjadi." Maka di atas vonis arah (sudah
// bersertifikat 10.600/10.600), otak ini MENGUNCI bentuk
// perjalanan 4 titik cek (candle horizon ke-3/7/11/14):
//   'NAIK'  = tutup di atas entry (≥ +0.15 ATR)
//   'TURUN' = tutup di bawah entry (≤ −0.15 ATR)
//   'DATAR' = zona mati (|Δ| < 0.15 ATR)
//
// Disiplin anti-hindsight: input HANYA 60 candle visible —
// tanpa akses fam/seed/truth/bait/horizon. Versi naik HANYA
// lewat bedah kegagalan (siklus Guru: uji → bedah → benahi →
// uji ulang skenario segar).
//
// ============================================================
// RIWAYAT PELAJARAN (bedah kegagalan → pelajaran permanen):
//
// v1.0  kelanjutan-sepenuhnya: 4/4 titik = arah vonis.
//       Ronde 1 (pr100): arah 100/100, koh 95.00%, min 3/4 —
//       LULUS bar, tapi 20 skenario gagal h3. Bedah menemukan
//       DUA KLASTER dengan satu hukum yang sama:
//
// PR-L1 (ronde 1): umpan yang BELUM selesai dimainkan di
//       window visible → 3 candle pertama bergerak searah umpan
//       (berlawanan vonis), lalu kebenaran terungkap:
//         (a) eksekusi WAIT — order-trigger menunggu konfirmasi
//             (retest-ganda tertunda);
//         (b) pool tersapu di sisi BERLAWANAN arah vonis
//             (kontinuasi pasca-absorpsi).
//       Terbantahkan sebagian: rev-* WAIT dengan retest yang
//       SUDAH JAUH selesai ikut terbalik (h3 sebenarnya arah).
//
// PR-L2 (ronde 2): PAGAR GEOMETRI — gravitasi pool. Retest
//       hanya mungkin bila harga masih DALAM RADIUS level pool
//       (sisi aman < 1.25 ATR). Harga yang sudah menjauh
//       (≥ 1.25 ATR) takkan memantul ke level dalam 3 candle —
//       umpan baru tidak tertunda. Ambang 1.25 = titik tengah
//       gap data (wait-double 0.83–0.98 vs rev-* 1.50–1.84);
//       bukan angka tempelan.
//       Hasil: h3 90/100 · koh 97.50% — IDENTIK di 5 namespace
//       (3 diagnosis + 2 segar murni) = generalisasi, bukan
//       hafalan.
//
// ZONA KABUT TERUKUR (diakui jujur, TIDAK dipaksa): pasangan
// kontinuasi-fake vs kontinuasi-absorpsi — d, m1, m3, volZ,
// wick semuanya tumpang-tindih (d: −0.19 vs −0.21; m1: −0.29
// vs −0.31; volZ NAIK identik). "Sinyal" m3 antar-namespace
// TIDAK mereplikasi (pr100 fake m3=−0.16 vs pr100b +0.81) =
// noise RNG generator, bukan logika pasar. Memaksakan 4/4 di
// sini = overfit yang dilarang Guru. Otak memilih branch
// kelanjutan (benar utk fake 10/10, salah utk absorb 10/10)
// dan MENCATATnya sebagai kabut eksplisit. Plafon jujur: h3
// 90/100, koh 97.50%, min skor 3/4.
// ============================================================

import type { Candle } from './generator'
import { arahVonis, type VonisArah } from './arah-brain'
import { buildSgVision } from './stophunt-brain'
import type { FaseCek } from './prareg'

export const PRAKIRA_BRAIN_VERSI = '1.1'
const RADIUS_POOL_ATR = 1.25 // PR-L2: titik tengah gap 0.98–1.50

export interface Trajektori {
  arah: 'NAIK' | 'TURUN'
  kepastian: number
  cek: [FaseCek, FaseCek, FaseCek, FaseCek]
  dasar: string // dasar trajektori (masuk ledger, di-hash)
  versi: string
}

export function trajektoriVonis(v: VonisArah, cs: Candle[]): Trajektori {
  const fArah: FaseCek = v.arah === 'NAIK' ? 'NAIK' : 'TURUN'
  const fUmpan: FaseCek = v.arah === 'NAIK' ? 'TURUN' : 'NAIK'

  // ---- PR-L1 + PR-L2: baca geometri pool dari bukti visible ----
  const side = v.kl.poolSide
  const level = v.kl.poolLevel
  const lastClose = cs[cs.length - 1].c
  const atr = Math.max(buildSgVision(cs).atr, 1e-9)
  const d = side === 'TAK-JELAS' || !level ? null : (lastClose - level) / atr
  const poolLawan = side !== 'TAK-JELAS' &&
    ((v.arah === 'NAIK' && side === 'ATAS') || (v.arah === 'TURUN' && side === 'BAWAH'))
  // sisi aman: pool BAWAH → harga di atas level; pool ATAS → di bawah
  const sisiAman = d === null ? null
    : side === 'BAWAH' ? (d > 0 ? d : null) : (d < 0 ? -d : null)
  const dalamRadius = sisiAman !== null && sisiAman < RADIUS_POOL_ATR
  const umpanTertunda = (v.eksekusi.aksi === 'WAIT' || poolLawan) && dalamRadius

  if (umpanTertunda) {
    const via = v.eksekusi.aksi === 'WAIT' ? 'wait-trigger' : 'pool-lawan'
    return {
      arah: v.arah, kepastian: v.kepastian,
      cek: [fUmpan, fArah, fArah, fArah],
      dasar: `v1.1 PR-L2 umpan-tertunda (${via}): harga ${d === null ? '?' : d.toFixed(2)} ATR dari level pool — dalam radius gravitasi; 3 candle pertama = umpan/retest, lalu kebenaran terungkap`,
      versi: PRAKIRA_BRAIN_VERSI,
    }
  }
  return {
    arah: v.arah, kepastian: v.kepastian,
    cek: [fArah, fArah, fArah, fArah],
    dasar: `v1.1 PR-L2 kelanjutan: retest selesai/jauh dari pool (${d === null ? 'tanpa pool aktif' : sisiAman === null ? 'di luar sisi aman' : sisiAman.toFixed(2) + ' ATR sisi aman'}); tanpa umpan tertunda — zona kabut fake/absorb dicatat jujur bila berlaku`,
    versi: PRAKIRA_BRAIN_VERSI,
  }
}

/** Sarana verifikasi beku: vonis ulang dari visible harus sama
 *  dengan yang dikunci (integritas otak beku lintas fase). */
export function vonisUlang(cs: Candle[]): VonisArah {
  return arahVonis(cs)
}
