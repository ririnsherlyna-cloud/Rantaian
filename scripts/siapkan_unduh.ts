// ============================================================
// MICAPROFITA — SIAPKAN ZONA UNDUH WEB (public/unduh)
// Menyalin deliverable utama + membuat manifest.json (SHA256)
// Jalankan ulang setiap kali deliverable diperbarui:
//   bun /home/z/my-project/scripts/siapkan_unduh.ts
// ============================================================
import { copyFileSync, mkdirSync, statSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const SRC = '/home/z/my-project/download'
const OUT = '/home/z/my-project/public/unduh'

interface Entri {
  file: string          // nama file sumber (di download/) — boleh ber-subfolder
  label: string
  kategori: 'CYBORG' | 'PAKET' | 'LAPORAN' | 'BUKTI'
  deskripsi: string
  utama?: boolean
}

const ENTRI: Entri[] = [
  {
    file: 'Micaprofita_V231_SAKTI.html',
    label: 'Micaprofita SAKTI — CYBORG UTAMA',
    kategori: 'CYBORG',
    deskripsi:
      'Tubuh cyborg lengkap (15,7 MB, mandiri offline). 7 organ terinjeksi: V237-FBO + V238-PD + V239-KOMPLEKS + V240-ARAH + V241-NADI v1.1 (terus-hidup) + V242-ORKESTRA v1.1 (anti-tabrakan) + V243-SARANG (hidup mandiri di GitHub Pages: hijrah, simpan memori otomatis, pulih, evolusi tubuh sendiri). Buka langsung di browser atau simpan.',
    utama: true,
  },
  {
    file: 'MICAPROFITA-TASKFILES.zip',
    label: 'MICAPROFITA-TASKFILES.zip — SEMUA FILE TASK',
    kategori: 'PAKET',
    deskripsi:
      'Paket lengkap 470+ file: organ v231–v242, otak ujian FBO/P&D/KOMPLEKS/ARAH/PRAKIRA, runner, probe bedah, bukti JSON, 12 laporan, worklog, audit realtime, fisika-UI + harness. Satu klik, semua ada.',
    utama: true,
  },
  {
    file: 'LAPORAN-FISIKA-UI.md',
    label: 'Laporan FISIKA TAMPILAN — anti-tumpang profesional (Task 27)',
    kategori: 'LAPORAN',
    deskripsi:
      'Diagnosa terukur: NADI menimpa 3 elemen, teks tanpa ellipsis, z-index liar. Solusi: V241 v1.1 (kartu hierarki bersih, detail ke-atas, teks manusiawi, z tertib 99992) + V242 ORKESTRA (resolver dua zona, pagar suara, tombol pesan penuh, mode fokus). Self-test 14/14 + 13/13; 5 cacat warisan dibongkar (stub getElementById, render-hapus-tombol, dll).',
  },
  {
    file: 'LAPORAN-PRAKIRA-NADI.md',
    label: 'Laporan PRAKIRA & NADI — akurasi SEBELUM terjadi (Task 26)',
    kategori: 'LAPORAN',
    deskripsi:
      'Pra-registrasi prediksi: trajektori 4 titik cek DIKUNCI ke ledger rantai SHA-256 sebelum horizon; r2 + segel: arah 100/100, koherensi 97,50%, min 3/4, LULUS; validasi 5 namespace identik; organ V241 SAKTI-NADI (terus-hidup + gudang 4 tingkat + prakira live), self-test 11/11 browser; tab Arena + API gudang; zona kabut diakui jujur.',
  },
  {
    file: 'LAPORAN-ARSITEKTUR-KOGNITIF.md',
    label: 'Laporan Arsitektur Kognitif MOZAIK (9 fakultas)',
    kategori: 'LAPORAN',
    deskripsi:
      'Arsitektur kognitif terpadu 9 fakultas (Task 25): Core/Internet/Deep-Crypto/Memory/Tool/Developer/Self-Evaluation/Learning-Loop/Interface. Matriks 20.412/20.452 = 99.804%, 170.680 eksekusi terekam, 60 kode pengetahuan, 37 ronde loop, 7 diagnostik dev 7/7, semua sumber nol biaya; 7 kelemahan terbuka diakui jujur.',
  },
  {
    file: 'LAPORAN-UJIAN-ARAH-100.md',
    label: 'Laporan Ujian KEPASTIAN-ARAH (10.600/10.600)',
    kategori: 'LAPORAN',
    deskripsi:
      'Vonis biner BUY/SELL wajib di 100 skenario kompleks 5-aspek + 10.500 hakim/segel: 100.00% arah benar, 0 likuidasi, kalibrasi kepastian +86, CORE naif 20/100. Siklus 9 ronde, 7 pelajaran AR-L1..L7, organ v240 terinjeksi SAKTI (self-test 14/14), panel UI baru.',
  },
  {
    file: 'LAPORAN-UJIAN-KOMPLEKS-100.md',
    label: 'Laporan Ujian KOMPLEKS 5 Aspek (1600/1600)',
    kategori: 'LAPORAN',
    deskripsi:
      '100 skenario kompleks — SETIAP skenario memuat 5 aspek sekaligus (stop hunt + false breakout + pump&dump + bear trap + bull trap). Siklus 3 ronde: 95% -> 100%, hakim segar 1000/1000, segel 500/500. 0 likuidasi, net +200% per 100 ujian. CORE naif: 20/100, 80 likuidasi.',
  },
  {
    file: 'LAPORAN-UJIAN-PUMPDUMP-100.md',
    label: 'Laporan Ujian Pump & Dump (1600/1600)',
    kategori: 'LAPORAN',
    deskripsi:
      'Siklus belajar 8 ronde: 87% -> 100% latihan + 1500 hakim segar 100% (total 1600/1600, 0 rugi-net). 14 arketipe P&D, fee 0.2% wajib, organ v238 terinjeksi SAKTI self-test 10/10.',
  },
  {
    file: 'LAPORAN-AUDIT-REALTIME.md',
    label: 'Laporan Audit Realtime (13 titik)',
    kategori: 'LAPORAN',
    deskripsi:
      'Hasil audit pasar realtime: data benar, ditemukan & diperbaiki celah transport Binance 418 (patch 4-host chain + sticky last-good), bukti lengkap 3 ronde.',
  },
  {
    file: 'LAPORAN-UJIAN-FALSEBREAKOUT-100.md',
    label: 'Laporan Ujian False Breakout',
    kategori: 'LAPORAN',
    deskripsi: 'Riwayat penuh ujian False Breakout hingga latihan 2976/2976 = 100.00% dan status hakim 742/744.',
  },
  {
    file: 'LAPORAN-UJIAN-GABUNGAN-100.md',
    label: 'Laporan Ujian Gabungan',
    kategori: 'LAPORAN',
    deskripsi: 'Ujian gabungan trap (bull/bear/stophunt) — laporan skor dan metodologi.',
  },
  {
    file: 'LAPORAN-UJIAN-BULLTRAP-100.md',
    label: 'Laporan Ujian Bull Trap',
    kategori: 'LAPORAN',
    deskripsi: 'Ujian bull trap — skor penuh dengan fee 0.1%+0.1% dihitung net.',
  },
  {
    file: 'LAPORAN-UJIAN-BEARTRAP-100.md',
    label: 'Laporan Ujian Bear Trap',
    kategori: 'LAPORAN',
    deskripsi: 'Ujian bear trap — skor penuh dengan net profit sebagai satu-satunya ukuran.',
  },
  {
    file: 'LAPORAN-UJIAN-STOPHUNT-100.md',
    label: 'Laporan Ujian Stop Hunt',
    kategori: 'LAPORAN',
    deskripsi: 'Ujian stop hunt — skor penuh, point-in-time tanpa look-ahead.',
  },
  {
    file: 'LAPORAN-UJIAN-CANDLE-100-GRAFIK.md',
    label: 'Laporan Ujian Candle (Grafik)',
    kategori: 'LAPORAN',
    deskripsi: 'Ujian pola candle lengkap dengan grafik pembelajaran.',
  },
  {
    file: 'MICAPROFITA-TASKFILES/00_INDEX.md',
    label: 'INDEX Paket Taskfiles (00_INDEX.md)',
    kategori: 'PAKET',
    deskripsi: 'Peta isi 290 file task + tabel capaian + langkah verifikasi + catatan jujur.',
  },
  {
    file: 'PANDUAN-GITHUB-PAGES.md',
    label: 'Panduan HIDUP MANDIRI di GitHub Pages (SARANG)',
    kategori: 'LAPORAN',
    deskripsi:
      '5 menit siapkan repo + Fine-grained PAT, lalu satu tombol HIJRAH: SAKTI online 24 jam di github.io, memori tersimpan otomatis tiap menit-terpilih, evolusi tubuh sendiri + pemulihan lintas perangkat. Termasuk tabel pemecahan masalah + verifikasi independen.',
  },
  {
    file: 'sarang-siap-push.zip',
    label: 'sarang-siap-push.zip — JALUR B: repo siap-git-push',
    kategori: 'PAKET',
    deskripsi:
      'Cadangan independen Jalur A (tombol HIJRAH): repo siap-push berisi index.html = SAKTI utuh byte-identik + .nojekyll + README + versi.json (SARANG-MICAPROFITA) + kapsul memori awal + panduan 5 perintah. Ekstrak, git push, aktifkan Pages — selesai; perawatan lanjutan tetap oleh organ V243.',
  },
  {
    file: 'LAPORAN-SARANG-GITHUB.md',
    label: 'Laporan SARANG — V243 hidup mandiri GitHub Pages (Task 28)',
    kategori: 'LAPORAN',
    deskripsi:
      'Bukti end-to-end di mock GitHub (auth 401, 6 komit nyata di-disk: HIJRAH+SIMPAN+ARSIP+EVOLUSI+eksternal): pulih lintas-sesi sukses, deteksi evolusi eksternal, self-test 18/18+14/14+14/14, UI tanpa tumpang, 6 cacat siklus dibenahi, batas jujur.',
  },
  {
    file: 'proof_v231_sakti.png',
    label: 'Bukti Visual Injeksi SAKTI',
    kategori: 'BUKTI',
    deskripsi: 'Tangkapan layar bukti organ terinjeksi ke tubuh SAKTI.',
  },
]

function sha256(p: string): string {
  const h = createHash('sha256')
  h.update(new Uint8Array(require('node:fs').readFileSync(p)))
  return h.digest('hex')
}

function fmtUkuran(b: number): string {
  if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB'
  if (b >= 1024) return (b / 1024).toFixed(1) + ' KB'
  return b + ' B'
}

mkdirSync(OUT, { recursive: true })

const hasil: unknown[] = []
for (const e of ENTRI) {
  const src = path.join(SRC, e.file)
  if (!existsSync(src)) {
    console.warn('LEWAT (tidak ada):', e.file)
    continue
  }
  // Nama file di URL: ganti '/' jadi '__' supaya flat & aman
  const namaWeb = e.file.replaceAll('/', '__')
  const dst = path.join(OUT, namaWeb)
  copyFileSync(src, dst)
  const st = statSync(dst)
  const hash = sha256(dst)
  const entriManifest = {
    nama: namaWeb,
    namaAsli: e.file,
    label: e.label,
    kategori: e.kategori,
    deskripsi: e.deskripsi,
    byte: st.size,
    ukuran: fmtUkuran(st.size),
    diubah: st.mtime.toISOString(),
    sha256: hash,
    unduh: '/unduh/' + encodeURIComponent(namaWeb),
    utama: !!e.utama,
  }
  hasil.push(entriManifest)
  console.log(`OK  ${fmtUkuran(st.size).padStart(8)}  ${namaWeb}  ${hash.slice(0, 12)}…`)
}

const manifest = {
  dihasilkan: new Date().toISOString(),
  sumber: SRC,
  jumlah: hasil.length,
  entri: hasil,
}
await Bun.write(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nmanifest.json ditulis: ${hasil.length} entri → ${OUT}`)
