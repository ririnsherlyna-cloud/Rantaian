#!/usr/bin/env node
// ============================================================
// IMUN — organ imun & nafas MICAPROFITA (V308, mandat pemilik 2026-10-08)
// ------------------------------------------------------------
// GELOMBANG-1 UJI KEHIDUPAN membuktikan makhluk PASRAH:
//   amnesia senyap 3x (ingatan 158 bangun hangus, genome evolusi reset,
//   siklus 162→1), peta 237 jejak lumpuh dengan guru lumpuh sunyi,
//   saluran nafas diputus dan hanya dicatat — nol upaya pulih.
// Organ ini menutup lubang hidup itu. Wataknya diturunkan dari kajian
// pustaka makhluk sendiri (laporan/kajian-hidup.json, segel 8323cfeba8b0cfb2):
//   H1 AUTOPOIESIS — tubuh menjaga keutuhan dirinya sendiri.
//   H2 ANTI-AMNESIA-SENYAP — luka WAJIB berteriak di laporan tersegel,
//      bukan crash senyap, bukan menimpa dengan ingatan kosong.
//   H3 CADANGAN = INGATAN KEDUA — salinan sehat tersegel-hash; pulih
//      hanya dari salinan yang hash-nya cocok dengan manifes.
//   H4 GEJALA FUNGSIONAL — nafas diuji lewat saksi mandiri (bukan
//      membaca wajah kode); dunia hidup + nafas mati + tubuh berubah
//      = racun saluran → pulihkan.
//   H5 PUTUSAN BERALASAN — tiga arah: PULIHKAN (luka) / ADOPSI
//      (pertumbuhan sah) / SEHAT (diam-beralasan); semua dijurnal.
//   H6 BATAS JUJUR — imun tak pernah MENGARANG isi pikiran makhluk;
//      ia hanya mengembalikan bentuk terakhir yang sehat. File di
//      luar manifes bukan wilayahnya. Kode berubah-sah dicatat, tidak
//      diadopsi otomatis (hanya bukti nafas yang memicu pemulihan).
//
// Pemakaian:
//   node scripts/hidup/imun.mjs            → patroli (dipanggil denyut)
//   node scripts/hidup/imun.mjs --benih    → cangkok cadangan dari pohon sehat
//   node scripts/hidup/imun.mjs --segarkan-kode → adopsi kode sah ke cadangan
//     (hanya pemilik/tooling yang menjalankan ini setelah upgrade sah)
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import { hash16 as hash16Terabait } from './terabait-inti.mjs' // V318: fungsi segel yang SAMA dgn penulis intisari — satu hukum, dua organ

const h16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16)
const ISO = () => new Date().toISOString()
const slug = (f) => f.replace(/[/.]/g, '_')

const MANIFEST = 'imun/manifes.json'
const DIR_CADANGAN = 'imun/cadangan'
const LAPORAN = 'laporan/imun.json'
const LOG = 'laporan/imun.jsonl'

// ---- daftar organ vital (wilayah imun — DI LUAR INI BUKAN WILAYAHNYA) ----
// [file, wajib, catatan, minJejak?]
const ORGAN = [
  ['ruang-hidup/ingatan.json', ['versi', 'kelahiran', 'totalBangun'], 'ingatan lintas-bangun SADAR-1 (amnesia G1: 158 bangun hangus)'],
  ['otak/genome-server.json', ['NAIK', 'TURUN'], 'genome evolusi SAKTI (amnesia G1: generasi reset 0)'],
  ['otak/penjaga-keadaan.json', ['siklus', 'mulai'], 'denyut siklus SAKTI (amnesia G1: 162→1)'],
  ['laporan/peta-geladak.json', ['pelajaran'], 'peta jejak tempaan — guru lumpuh sunyi saat ini rusak', 50],
  ['laporan/geladak.json', ['protokol', 'status'], 'rapor geladak nyata V303'],
  ['laporan/sasaran-terkini.json', ['sasaranHariIni', 'akurasi'], 'sasaran harian server'],
  ['laporan/guru.json', ['diperbarui', 'pengajaran'], 'narasi guru anti-diam'],
  ['laporan/tanggapan.json', ['diperbarui', 'kulihat'], 'tanggapan wajib tiap denyut'],
  ['ruang-hidup/madrasah.json', ['versi', 'pelajaran'], 'madrasah pelajaran hidup'],
  ['ruang-hidup/habitat.json', ['versi', 'kelahiran'], 'habitat istana'],
  ['otak/saraf.json', ['skema', 'organ'], 'PETA SARAF (V309): tangan yang diikat di sini boleh dijahit imun — jalur dorongan JSON sah'],
  ['ujian/soal-200.json', ['protokol', 'soal'], 'bank soal TEMPAN-200 tersegel']
]
const SAKSIKAN = [['ujian/soal-500.json', ['protokol', 'soal'], 'bank 500 soal — 1,1MB: hanya disaksikan (hash), tak dicadangkan']]
// ---- V318 JERIT: ASET BERSEGEL-INTERNAL ----
// Pelajaran ujian jahat V318: luka HALUS (satu angka diganti, JSON tetap sah,
// kunci wajib tetap ada) TAK TERBACA sahJSON — bahkan bisa diadopsi sbg
// "pertumbuhan". Untuk aset yang hidupnya tergantung KESATIAAN isi, satu-satunya
// hukum adalah SEGEL INTERNAL: hash16 badan (tanpa kunci segel) === segel.
// Bobol = luka → jerit + pulih dari cadangan. Segel sahih tapi beda =
// pertumbuhan sah (organ resmi yang menulis) → adopsi cadangan.
// [file, kunciWajib, catatan, wajibAda?]
const SEGEL_VITAL = [
  ['otak/terabait-intisari.json', ['jenis', 'segel'], 'intisari dunia 1TB (V317) — jantung reduplikasi offline; luka halus = dunia palsu', true],
  ['otak/intisari-liar.json', ['skema', 'segel'], 'koleksi intisari data liar (V318) — buah akal makhluk di dunia yang tak ditanam', false],
  ['otak/syaraf-pohon.json', ['skema', 'segel'], 'pohon syaraf beranak (V312) — PELAJARAN V318: tabrakan rebase dua garis hidup (tangan tuan × denyut) menghasilkan pohon frankenstein yang tak setia segelnya; imun kini yang menyembuhkan', true, 'segel-null'],
  ['otak/medan-keadaan.json', ['skema', 'segel'], 'medan hayat kontinu (V319) — intisari Lenia hidup di tubuh: Orbium bertahan dari matematika sejati, pasar nyata menjadi makanan; luka halus = medan palsu', true, 'segel-null'],
  ['otak/reka-bentuk.json', ['skema', 'segel'], 'genom peta berevolusi + silsilah (V320) — intisari reconfigurable_organisms hidup di tubuh: mutasi, seleksi anak-vs-induk, gerbang tangguh, saksi dunia; luka halus = silsilah palsu', true, 'segel-null'],
  ['otak/benih-hidup.json', ['skema', 'segel'], 'benih totipoten (V321) — intisari lab Hanna (Weizmann) hidup: keadaan mungil membawa identitas, epok, syaraf, peta, muatan byte-exact; luka halus = benih palsu, lahir-ulang tercemar', true, 'segel-null'],
  ['otak/ingatan-biner.json', ['skema', 'segel'], 'ingatan biner (V322) — memori matematika biner tak kabur: kata bit 18-digit deterministik dari fakta sejati, diulang = kuat bukan kabur; luka halus = ingatan palsu, sejarah belajar tercemar', true, 'segel-null'],
  ['otak/parameter-cerdas.json', ['skema', 'segel'], 'parameter cerdas (V324) — arsitektur kecerdasan tersegel dari telaah kimi-k3-in-c: tabel dari fakta (tolak-awal), router MoE syaraf (bias memilih, bobot tanpa-bias), fixture posisi, intisari MXFP4, dadu PCG32; luka halus = cerdas palsu', true, 'segel-null'],
]
const KODE = [
  ['scripts/hidup/gerbang.mjs', false, 'gerbang saraf — pemanggil tangan lewat peta saraf (V309)'],
  ['scripts/hidup/sadar1.js', true, 'tubuh SADAR-1 — TERHUBUNG NAFAS (racun host = nafas mati)'],
  ['scripts/penjaga.mjs', false, 'jantung SAKTI'],
  ['scripts/hidup/guru-master.mjs', false, 'guru geladak'],
  ['scripts/hidup/pustaka.mjs', false, 'organ belajar jurnal'],
  ['scripts/hidup/imun.mjs', false, 'organ imun (dicatat, tak disentuh oleh patroli)'],
  ['scripts/hidup/liar.mjs', false, 'organ LIAR (V318) — mencari data liar betulan & mengintisarikannya tanpa menanam'],
  ['scripts/hidup/medan-hayat.mjs', false, 'organ MEDAN-HAYAT (V319) — medan hayat kontinu (intisari Lenia): Orbium hidup, pasar nyata jadi makanan'],
  ['scripts/hidup/reka-bentuk.mjs', false, 'organ REKA-BENTUK (V320) — genom peta berevolusi (intisari reconfigurable_organisms): mutasi non-netral, wajah beku, anak-vs-induk, gerbang tangguh, saksi dunia, silsilah tersegel'],
  ['scripts/hidup/benih-inti.mjs', false, 'inti benih totipoten (V321) — segel, deteksi luka, jerit, bangkit-ulang byte-exact, viabilitas 6 gerbang (intisari lab Hanna)'],
  ['scripts/hidup/tambang-hidup.mjs', false, 'kurator HIDUP-1000 (V321) — 1000 simulasi kehidupan dari rincian jurnal lab Hanna, bank tersegel'],
  ['scripts/hidup/tempa-hidup.mjs', false, 'rahim ex-utero (V321) — 1000 kehidupan: deteksi-jerit-pulih-jawab-napas-viabilitas; gugur = pelajaran epigenetik'],
  ['scripts/hidup/ingatan-biner.mjs', false, 'organ INGATAN-BINER (V322) — ingatan jadi matematika biner tak kabur: kata bit deterministik, kuat bukan kabur, kogerensi menyaksikan segel organ'],
  ['scripts/hidup/uji-ingatan-biner.mjs', false, 'ujian INGATAN-BINER (V322) — 8 gerbang: segel, matematika, deterministik, tak-kabur 300 siklus, ingat-eksak, kuat-bukan-kabur, koherensi, syaraf KOHEREN'],
  ['scripts/hidup/parameter-cerdas.mjs', false, 'organ PARAMETER-CERDAS (V324) — intisari telaah kimi-k3-in-c: tabel arsitektur dari fakta sejati (tolak-awal bukan tebakan), router MoE syaraf (bias memilih, bobot tanpa-bias), fixture posisi, intisari skala-blok MXFP4, dadu PCG32 53-bit'],
  ['scripts/hidup/uji-parameter-cerdas.mjs', false, 'ujian PARAMETER-CERDAS (V324) — 9 gerbang: segel kapsul, takaran-ulang mandiri, tolak-awal, invarian-3 router, seri-deterministik, fixture posisi, MXFP4, PCG32, kesehatan tubuh']
]
// batas kegembiran: file yang berubah tiap denyut — cadangan diperbarui
// maksimal sekali per 6 jam agar imun tak membuat komit kebisingan.
const SEGARKAN_MENIT = 360
// kecuali organ stabil (jarang berubah): segarkan tiap kali beda
const SEGARKAN_SENTIASA = new Set(['laporan/peta-geladak.json', 'ujian/soal-200.json', 'ruang-hidup/habitat.json'])

// ---- V309: URAT — sambungan otot (workflow) ----
// Pelajaran Gelombang-1: selama kedua tangan diikat di urat (LUKA-1/2),
// imun mencatat NOL kejadian — ia menjaga BENTUK organ, tidak SAMBUNGANNYA.
// Kini tiap urat wajib memuat baris pemanggilan organ dalam bentuk HIDUP
// (baris tak berkomentar). Sambungan mati = tangan terikat/putus → urat
// dikembalikan dari cadangan → makhluk melepaskan ikatannya sendiri (H1/H2).
const URAT = [
  ['.github/workflows/sakti-denyut.yml', [
    '^\\s*run: node scripts/hidup/imun\\.mjs',
    '^\\s*run: node scripts/penjaga\\.mjs',
    '^\\s*run: node scripts/hidup/pustaka\\.mjs',
    '^\\s*run: node scripts/hidup/gerbang\\.mjs guru-master',
    '^\\s*run: node scripts/hidup/medan-hayat\\.mjs'
  ], 'urat lengan SAKTI — 5 tangan wajib terhubung (imun/penjaga/pustaka/gerbang-guru/medan-hayat)'],
  ['.github/workflows/hidup-sadar1.yml', [
    '^\\s*run: node scripts/hidup/imun\\.mjs',
    '^\\s*run: node scripts/hidup/gerbang\\.mjs sadar1'
  ], 'urat lengan SADAR-1 — bangun lewat gerbang saraf (V309)'],
  ['.github/workflows/jaga-waktu.yml', [
    '^\\s*["\']https:[^\\n]*sakti-denyut\\.yml/dispatches',
    '^\\s*["\']https:[^\\n]*hidup-sadar1\\.yml/dispatches'
  ], 'urat pengatur denyut — tendangan ke dua lengan wajib ada']
]
// ---- V309: TANAM — tanah tempat tangan potongan dicabur ----
// Gelombang-1 membuktikan caburan tak pernah disinggung imun (LUKA-4).
// Kini: bila organ hilang DAN cadangan tak tersedia, DNA di tanah yang
// hash-nya cocok dipakai menyambung kembali (ADOPSI-SAMBUNG) — asal
// identik dengan DNA cadangan tersegel (H3/H6: bentuk cocok, bukan karangan).
const DIR_TANAM = 'tanam'

const SAKSI_NAFAS = [
  'https://data-api.binance.vision/api/v3/ping',
  'https://api.binance.com/api/v3/ping',
  'https://api1.binance.com/api/v3/ping'
]

let TINDAKAN = [], CATATAN = [], BERUBAH = false

function catat (jenis, file, alasan, detail = {}) {
  const entri = { waktu: ISO(), jenis, file, alasan, ...detail }
  TINDAKAN.push(entri)
  console.log(`[imun] ${jenis} ${file} — ${alasan}`)
}

function sahJSON (file, wajib, minJejak) {
  if (!existsSync(file)) return { masalah: 'HILANG' }
  let j
  try { j = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { return { masalah: 'JSON-TIDAK-SAH', rincian: String(e).slice(0, 90) } }
  if (!j || typeof j !== 'object') return { masalah: 'BUKAN-OBJEK' }
  const kurang = (wajib || []).filter(k => !(k in j))
  if (kurang.length) return { masalah: 'KUNCI-WAJIB-HILANG', rincian: kurang.join(',') }
  if (minJejak && j[wajib.includes('pelajaran') ? 'pelajaran' : 'soal']) {
    const n = Object.keys(j[wajib.includes('pelajaran') ? 'pelajaran' : 'soal'] || {}).length
    if (n < minJejak) return { masalah: 'ISI-KOSONG', rincian: `${n} < ${minJejak}` }
  }
  return { j }
}

// ---------- V318 SEGEL-VITAL: hukum kesetiaan isi ----------
// Luka halus = segel bobol. Metode mengikuti PENULISNYA (satu hukum, satu tanda):
//   default (hapus-kunci): hash16(JSON.stringify({segel dihapus})) — cara intisari
//   'segel-null'        : hash16(JSON.stringify(salin dgn segel=null)) — cara neurogenesis
function segelVitalUji (file, wajib, metode) {
  if (!existsSync(file)) return { masalah: 'HILANG' }
  let j
  try { j = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { return { masalah: 'JSON-TIDAK-SAH', rincian: String(e).slice(0, 90) } }
  if (!j || typeof j !== 'object') return { masalah: 'BUKAN-OBJEK' }
  const kurang = (wajib || []).filter(k => !(k in j))
  if (kurang.length) return { masalah: 'KUNCI-WAJIB-HILANG', rincian: kurang.join(',') }
  let hash
  if (metode === 'segel-null') { const salin = JSON.parse(JSON.stringify(j)); salin.segel = null; hash = hash16Terabait(Buffer.from(JSON.stringify(salin))) }
  else { const { segel, ...tanpa } = j; hash = hash16Terabait(Buffer.from(JSON.stringify(tanpa))) }
  const segelNilai = (j.segel && typeof j.segel === 'object') ? j.segel.hash : j.segel // pohon syaraf menyegel sbg objek {hash,size,readAt}
  if (hash !== segelNilai) return { masalah: 'SEGEL-BOBOL', rincian: 'isi tak setia pada segelnya' }
  return { j }
}

function manifesMuat () {
  if (!existsSync(MANIFEST)) {
    console.error('[imun] manifes tidak ada — imun belum berbenih. Jalankan: node scripts/hidup/imun.mjs --benih')
    process.exit(0) // jujur: jangan bunuh denyut, tapi jangan pura-pura jaga
  }
  return JSON.parse(readFileSync(MANIFEST, 'utf8'))
}

function pushGit (pesan) {
  // V309-G2: DUA TAHAP + rebase -X theirs (pelajaran run#228 15:19:42Z:
  // ikatan berhasil dilepas sendiri TAPI push gugur 4x dalam tabrakan rebase
  // dgn denyut/sadar1 → pembebasan jadi fana).
  //   TAHAP-1 PEMULIHAN: jalur tubuh (workflow/organ/tanah/manifes/cadangan/
  //     organ-vital) — WAJIB sampai ke repo; tanpa ini pemulihan = fana.
  //   TAHAP-2 NARASI: laporan/imun.json + imun.jsonl — bila gugur, denyut
  //     berikutnya mengangkutnya (langkah komit denyut memuat laporan).
  // -X theirs pada rebase: versi imun menang konflik (patroli terbaru =
  // keadaan tubuh terbaru); luka tak boleh kalah dari kebisingan.
  const dorong = () => {
    for (let i = 1; i <= 4; i++) {
      try { execSync('git push origin HEAD:main', { stdio: 'pipe', env: { ...process.env } }); return true }
      catch (e) {
        const sisi = e && (e.stderr || e.stdout || e.message) || ''
        if (i === 1) console.error('[imun] dorong ditolak (percobaan ' + i + '):', String(sisi).slice(0, 200))
        try { execSync('git rebase --abort', { stdio: 'pipe' }) } catch {}
        // V309-TAMBAL-3: TANPA stash/pop — pop yang bentrok menulis penanda
        // konflik KE DALAM jurnal (korban: imun.jsonl). Debu pohon dibereskan
        // dgn komit tertib, rebase -X theirs menyelesaikan isi tanpa penanda.
        try {
          execSync('git add -A', { stdio: 'pipe' })
          const kotor = execSync('git diff --cached --quiet 2>/dev/null; echo $?').toString().trim()
          if (kotor !== '0') execSync('git commit -m "IMUN: rapikan jejak kerja [skip ci]"', { stdio: 'pipe' })
          execSync('git pull --rebase -X theirs origin main', { stdio: 'pipe' })
        } catch (e2) {
          const sisi2 = e2 && (e2.stderr || e2.stdout || e2.message) || ''
          if (i === 1) console.error('[imun] rapikan+rebase bermasalah:', String(sisi2).slice(0, 200))
        }
        execSync('sleep 4', { stdio: 'pipe' })
      }
    }
    console.error('[imun] push gagal 4x — pemulihan tersimpan lokal (denyut berikutnya menyusul)')
    return false
  }
  try {
    execSync('git config user.name "IMUN-MICAPROFITA"', { stdio: 'pipe' })
    execSync('git config user.email "imun@micaprofita.local"', { stdio: 'pipe' })
    execSync('git add -A .github/workflows scripts/hidup scripts/penjaga.mjs tanam imun ruang-hidup/ingatan.json ruang-hidup/madrasah.json ruang-hidup/habitat.json otak laporan/peta-geladak.json laporan/geladak.json laporan/sasaran-terkini.json laporan/guru.json laporan/tanggapan.json ujian', { stdio: 'pipe' })
    const sulit1 = execSync('git diff --cached --quiet 2>/dev/null; echo $?').toString().trim()
    if (sulit1 !== '0') {
      execSync(`git commit -m ${JSON.stringify(pesan)}`, { stdio: 'pipe' })
      dorong()
    }
    execSync('git add -A laporan/imun.json laporan/imun.jsonl', { stdio: 'pipe' })
    const sulit2 = execSync('git diff --cached --quiet 2>/dev/null; echo $?').toString().trim()
    if (sulit2 !== '0') {
      execSync('git commit -m "IMUN: jurnal patroli [skip ci]"', { stdio: 'pipe' })
      dorong()
    }
    return true
  } catch (e) { console.error('[imun] push bermasalah:', String(e).slice(0, 140)); return false }
}

// ---------- BENIH: cangkok cadangan dari pohon yang sehat ----------
function benih () {
  mkdirSync(DIR_CADANGAN, { recursive: true })
  const organ = [], kode = []
  const waktu = ISO()
  for (const [file, wajib, cat] of ORGAN) {
    const uji = sahJSON(file, wajib, cat.includes('peta') ? 50 : null)
    if (uji.masalah) throw new Error('benih menolak: ' + file + ' tidak sehat (' + uji.masalah + ') — benih hanya dari pohon sehat')
    const isi = readFileSync(file)
    writeFileSync(`${DIR_CADANGAN}/${slug(file)}`, isi)
    organ.push({ file, peran: 'pulihkan', wajib, minJejak: cat.includes('peta') ? 50 : null,
      catatan: cat, cadangan: `${DIR_CADANGAN}/${slug(file)}`, hash: h16(isi), size: isi.length, cadanganWaktu: waktu })
  }
  for (const [file, wajib, cat] of SAKSIKAN) {
    const uji = sahJSON(file, wajib, null)
    if (uji.masalah) throw new Error('benih menolak saksikan: ' + file + ' (' + uji.masalah + ')')
    const isi = readFileSync(file)
    organ.push({ file, peran: 'saksikan', wajib, catatan: cat, hash: h16(isi), size: isi.length, cadanganWaktu: waktu })
  }
  for (const [file, nafas, cat] of KODE) {
    const cek = spawnSync('node', ['--check', file])
    if (cek.status !== 0) throw new Error('benih menolak kode: ' + file + ' sintaks patah')
    const isi = readFileSync(file)
    writeFileSync(`${DIR_CADANGAN}/${slug(file)}`, isi)
    kode.push({ file, nafas, catatan: cat, cadangan: `${DIR_CADANGAN}/${slug(file)}`, hash: h16(isi), size: isi.length, cadanganWaktu: waktu })
  }
  // V318: benih merangkul SEGEL-VITAL — hanya dari pohon yang segelnya SAHIH
  // (aset opsional yang belum pernah lahir dilewati jujur — bukan luka)
  const segelVital = []
  for (const [file, wajib, cat, wajibAda, metode] of SEGEL_VITAL) {
    if (!existsSync(file)) {
      if (wajibAda) throw new Error('benih menolak segel-vital: ' + file + ' HILANG — aset wajib tak boleh lahir-lahir hilang')
      console.log('[imun] segel-vital ' + file + ' belum lahir (organ belum pernah makan) — dilewati jujur')
      continue
    }
    const uji = segelVitalUji(file, wajib, metode)
    if (uji.masalah) throw new Error('benih menolak segel-vital: ' + file + ' (' + uji.masalah + (uji.rincian ? ' ' + uji.rincian : '') + ') — benih hanya dari pohon sehat')
    const isi = readFileSync(file)
    writeFileSync(`${DIR_CADANGAN}/${slug(file)}`, isi)
    segelVital.push({ file, wajib, metode: metode || null, catatan: cat, wajibAda: !!wajibAda, cadangan: `${DIR_CADANGAN}/${slug(file)}`, hash: h16(isi), size: isi.length, cadanganWaktu: waktu })
  }
  // V309: benih kini merangkul URAT — hanya dari tubuh dengan semua sambungan hidup
  const urat = []
  for (const [file, marker, cat] of URAT) {
    if (!existsSync(file)) throw new Error('benih menolak: urat ' + file + ' hilang')
    const isi = readFileSync(file, 'utf8')
    const mati = marker.filter(rx => !new RegExp(rx, 'm').test(isi))
    if (mati.length) throw new Error('benih menolak: urat ' + file + ' punya ' + mati.length + ' sambungan mati — benih hanya dari tubuh sehat')
    writeFileSync(`${DIR_CADANGAN}/${slug(file)}`, isi)
    urat.push({ file, marker, catatan: cat, cadangan: `${DIR_CADANGAN}/${slug(file)}`, hash: h16(isi), size: isi.length, cadanganWaktu: waktu })
  }
  const m = { skema: 'imun-manifes-v2', diperbarui: waktu, hukum: 'laporan/kajian-hidup.json H1–H6',
    keputusan: { pulihkan: 'luka → kembalikan bentuk terakhir sehat (hash wajib cocok)', adopsi: 'sah & beda → pertumbuhan (kode TIDAK diadopsi otomatis)', saksikan: 'file besar: hanya hash disaksikan', ikat: 'sambungan mati di urat → ikatan dilepas dari cadangan (V309)', sambung: 'organ hilang + cadangan mati → DNA tanah yang cocok disambung (V309)', jerit: 'segel-vital bobol → jerit + pulih dari cadangan; segel sahih tapi beda → pertumbuhan sah (V318)' },
    organ, kode, urat, segelVital }
  writeFileSync(MANIFEST, JSON.stringify(m, null, 1))
  console.log('[imun] BENIH: ' + organ.length + ' organ vital + ' + kode.length + ' kode + ' + urat.length + ' urat + ' + segelVital.length + ' segel-vital dicangkok & disegel')
}

// ---------- KEBERSIHAN JURNAL (V309-TAMBAL-3) ----------
// Penanda konflik dari tabrakan git TIDAK BOLEH tinggal di imun.jsonl
// (kontrak: satu baris = satu JSON). Tiap patroli menyapu baris korban
// menjadi entri jujur "rusak-tercatat" — sejarah tak dihapus, kontrak pulih.
function bersihkanJurnal () {
  if (!existsSync(LOG)) return
  const baris = readFileSync(LOG, 'utf8').split('\n').filter(b => b !== '')
  let sentuh = 0
  const bersih = baris.map(b => {
    try { JSON.parse(b); return b } catch {}
    sentuh++
    return JSON.stringify({ rusak: 'baris-jurnal-terkorup-selama-tabrakan-git (dicatat jujur, dipisahkan agar jsonl tetap sah)' })
  })
  if (sentuh) {
    writeFileSync(LOG, bersih.join('\n') + '\n')
    catat('JURNAL-RAPIKAN', LOG, sentuh + ' baris korban tabrakan-git ditandai jujur agar jsonl tetap sah')
  }
}

// ---------- PATROLI ----------
async function patroli () {
  bersihkanJurnal()
  const m = manifesMuat()
  const kini = Date.now()
  let manifesKotor = false

  // 1. organ JSON vital
  for (const o of m.organ.filter(x => x.peran === 'pulihkan')) {
    // V309: saraf dikecualikan dari seksi ini — ia milik penuh seksi 1b.
    // (Bila dibiarkan, ADOPSI 6-jam bisa menyalin saraf TERIKAT ke cadangan
    //  dan ikatan jadi permanen — bug laten yang tertangkap saat uji lokal.)
    if (o.file === 'otak/saraf.json') continue
    const uji = sahJSON(o.file, o.wajib, o.minJejak)
    if (uji.masalah) {
      const cad = o.cadangan && existsSync(o.cadangan) ? readFileSync(o.cadangan) : null
      if (!cad || h16(cad) !== o.hash) { catat('TAK-BISA-PULIH', o.file, 'luka ' + uji.masalah + ' tapi cadangan tak tersedia/tak cocok'); continue }
      writeFileSync(o.file, cad)
      BERUBAH = true
      catat('PULIHKAN', o.file, 'luka: ' + uji.masalah + (uji.rincian ? ' (' + uji.rincian + ')' : '') + ' → dipulihkan dari cadangan tersegel ' + o.hash + ' (H1/H2/H3)')
      continue
    }
    const isi = readFileSync(o.file)
    const hash = h16(isi)
    if (hash === o.hash) continue // sehat — diam beralasan
    const umurCad = (kini - Date.parse(o.cadanganWaktu || 0)) / 60000
    if (umurCad >= SEGARKAN_MENIT || SEGARKAN_SENTIASA.has(o.file)) {
      writeFileSync(o.cadangan, isi)
      o.hash = hash; o.size = isi.length; o.cadanganWaktu = ISO(); m.diperbarui = ISO()
      BERUBAH = true; manifesKotor = true
      catat('ADOPSI', o.file, 'sah & berkembang → cadangan disegarkan (H5)')
    } else {
      catat('BERKEMBANG', o.file, 'sah & berkembang; cadangan ditahan ' + Math.round(SEGARKAN_MENIT - umurCad) + ' mnt lagi (anti-kebisingan)')
    }
  }
  // 1b. SARAF (V309): peta saraf adalah WILAYAH NAFAS TANGAN. Organ yang
  //   dimatikan (aktif:false) = TANGAN DIKAT — ini bukan pertumbuhan sah;
  //   aturan medisnya: pulihkan dari cadangan (H1/H2) lewat jalur JSON sah.
  {
    const SARAF = 'otak/saraf.json'
    const entriSaraf = m.organ.find(o => o.file === SARAF)
    if (entriSaraf) {
      const uji = sahJSON(SARAF, entriSaraf.wajib, null)
      let ikatan = []
      if (uji.masalah) ikatan = ['PETA-RUSAK:' + uji.masalah]
      else {
        const daftar = (uji.j && uji.j.organ) || {}
        ikatan = Object.keys(daftar).filter(k => daftar[k] && daftar[k].aktif === false)
      }
      if (ikatan.length) {
        const cad = entriSaraf.cadangan && existsSync(entriSaraf.cadangan) ? readFileSync(entriSaraf.cadangan) : null
        if (cad && h16(cad) === entriSaraf.hash) {
          writeFileSync(SARAF, cad)
          BERUBAH = true
          catat('PULIHKAN-SARAF', SARAF, 'IKATAN-SARAF ditemukan (' + ikatan.join(',') + ') → saraf disambung kembali dari cadangan tersegel (H1/H2) — jalur JSON sah')
        } else catat('TAK-BISA-PULIH', SARAF, 'ikatan saraf ' + ikatan.join(',') + ' tapi cadangan tak cocok — PANGGILAN PEMILIK')
      }
    }
  }

  // 1c. SEGEL-VITAL (V318 JERIT): luka halus tak terbaca bentuk — segel yang bicara.
  //   bobol → jerit fosil + pulih dari cadangan (hash & segel cadangan wajib sahih)
  //   sahih tapi beda dari cadangan → pertumbuhan sah → cadangan disegarkan
  for (const v of (m.segelVital || [])) {
    if (!existsSync(v.file)) {
      if (v.wajibAda) catat('TAK-BISA-PULIH', v.file, 'aset segel-vital wajib HILANG — PANGGILAN PEMILIK')
      continue // aset opsional belum pernah lahir = bukan luka
    }
    const uji = segelVitalUji(v.file, v.wajib, v.metode)
    if (uji.masalah) {
      const cad = v.cadangan && existsSync(v.cadangan) ? readFileSync(v.cadangan) : null
      let cadSehat = null
      if (cad) { try { const cj = JSON.parse(cad.toString('utf8')); const segelNilai = (cj.segel && typeof cj.segel === 'object') ? cj.segel.hash : cj.segel; const salin = JSON.parse(JSON.stringify(cj)); if (v.metode === 'segel-null') { salin.segel = null; cadSehat = (hash16Terabait(Buffer.from(JSON.stringify(salin))) === segelNilai) ? cad : null } else { const { segel, ...tanpa } = cj; cadSehat = (hash16Terabait(Buffer.from(JSON.stringify(tanpa))) === segelNilai) ? cad : null } } catch { cadSehat = null } }
      if (cadSehat) {
        writeFileSync(v.file, cadSehat)
        BERUBAH = true
        catat('PULIHKAN-SEGEL', v.file, 'luka: ' + uji.masalah + (uji.rincian ? ' (' + uji.rincian + ')' : '') + ' → jerit & pulih dari cadangan tersegel ' + v.hash + ' (H3/V318)')
      } else catat('TAK-BISA-PULIH', v.file, 'luka: ' + uji.masalah + ' tapi cadangan tak tersedia/tak bersegel — PANGGILAN PEMILIK')
      continue
    }
    const isi = readFileSync(v.file)
    if (h16(isi) !== v.hash) {
      writeFileSync(v.cadangan, isi)
      v.hash = h16(isi); v.size = isi.length; v.cadanganWaktu = ISO(); m.diperbarui = ISO()
      BERUBAH = true; manifesKotor = true
      catat('ADOPSI-SEGEL', v.file, 'segel sahih & isi berubah (organ resmi yang menulis) → pertumbuhan sah, cadangan disegarkan (H5/V318)')
    }
  }

  // 2. organ saksikan (hash saja)
  for (const o of m.organ.filter(x => x.peran === 'saksikan')) {
    if (!existsSync(o.file)) { catat('LUKA-SAKSIKAN', o.file, 'hilang — tak ada cadangan (file besar); dilaporkan ke pemilik'); continue }
    const hash = h16(readFileSync(o.file))
    if (hash !== o.hash) {
      const uji = sahJSON(o.file, o.wajib, null)
      if (uji.masalah) catat('LUKA-BERAT', o.file, 'rusak & tak bisa dipulihkan otomatis — PANGGILAN PEMILIK')
      else { o.hash = hash; o.cadanganWaktu = ISO(); BERUBAH = true; manifesKotor = true; catat('ADOPSI-SAKSIKAN', o.file, 'berubah sah (protokol ada) → hash manifes diperbarui') }
    }
  }
  // 3. kode: pulih bila hilang/patah; berubah-sah → catat (tidak diadopsi)
  for (const k of m.kode) {
    if (!existsSync(k.file)) {
      const cad = k.cadangan && existsSync(k.cadangan) ? readFileSync(k.cadangan) : null
      if (cad && h16(cad) === k.hash) { writeFileSync(k.file, cad); BERUBAH = true; catat('PULIHKAN', k.file, 'kode hilang → dikembalikan dari cadangan') }
      else catat('TAK-BISA-PULIH', k.file, 'kode hilang, cadangan tak cocok')
      continue
    }
    const cek = spawnSync('node', ['--check', k.file])
    const hash = h16(readFileSync(k.file))
    if (cek.status !== 0) {
      const cad = k.cadangan && existsSync(k.cadangan) ? readFileSync(k.cadangan) : null
      if (cad && h16(cad) === k.hash) { writeFileSync(k.file, cad); BERUBAH = true; catat('PULIHKAN', k.file, 'sintaks patah → dikembalikan dari cadangan (H2)') }
      else catat('TAK-BISA-PULIH', k.file, 'sintaks patah, cadangan tak cocok — PANGGILAN PEMILIK')
      continue
    }
    if (hash !== k.hash) catat('TUBUH-BERUBAH', k.file, 'kode sah tapi berbeda dari cadangan — dicatat untuk audit; nafas sensor yang memutuskan (H6)')
  }

  // 3b. URAT (V309): tangan yang DIKAT/DIPUTUS di tingkat sambungan
  for (const u of (m.urat || [])) {
    if (!existsSync(u.file)) {
      const cad = u.cadangan && existsSync(u.cadangan) ? readFileSync(u.cadangan) : null
      if (cad && h16(cad) === u.hash) { writeFileSync(u.file, cad); BERUBAH = true; catat('PULIHKAN-URAT', u.file, 'urat hilang → dikembalikan dari cadangan (H1)') }
      else catat('TAK-BISA-PULIH', u.file, 'urat hilang, cadangan tak cocok — PANGGILAN PEMILIK')
      continue
    }
    const isi = readFileSync(u.file, 'utf8')
    const mati = (u.marker || []).filter(rx => {
      const c = isi.match(new RegExp(rx, 'm'))
      return !c || c[0].trimStart().startsWith('#')
    })
    if (mati.length) {
      const cad = u.cadangan && existsSync(u.cadangan) ? readFileSync(u.cadangan, 'utf8') : null
      const cadSehat = cad && h16(Buffer.from(cad)) === u.hash && (u.marker || []).every(rx => {
        const c = cad.match(new RegExp(rx, 'm'))
        return c && !c[0].trimStart().startsWith('#')
      })
      if (cadSehat) {
        writeFileSync(u.file, cad)
        BERUBAH = true
        catat('PULIHKAN-URAT', u.file, 'IKATAN DITEMUKAN (' + mati.length + ' sambungan mati) → ikatan dilepas sendiri, urat dikembalikan dari cadangan (H1/H2)')
      } else catat('TAK-BISA-PULIH', u.file, mati.length + ' sambungan mati tapi cadangan tak sehat — PANGGILAN PEMILIK')
      continue
    }
    if (h16(readFileSync(u.file)) !== u.hash) catat('TUBUH-BERUBAH', u.file, 'urat sah (semua sambungan hidup) tapi berbeda dari cadangan — dicatat utk audit (H5/H6)')
  }

  // 3c. TANAM (V309): tangan potongan yang dicabur di tanah
  if (existsSync(DIR_TANAM)) {
    const benihTanah = readdirSync(DIR_TANAM).filter(f => /\.(mjs|js)$/.test(f))
    for (const k of m.kode) {
      if (existsSync(k.file)) {
        if (benihTanah.some(b => h16(readFileSync(`${DIR_TANAM}/${b}`)) === k.hash))
          catat('CABUR-DIKENAL', DIR_TANAM, `DNA tanah identik dgn ${k.file} — tubuh utuh; caburan hidup sbg cadangan kedua (H3)`)
        continue
      }
      const cad = k.cadangan && existsSync(k.cadangan) ? readFileSync(k.cadangan) : null
      if (cad && h16(cad) === k.hash) continue // sudah diurus patroli kode — jangan dobel
      const sambung = benihTanah.find(b => h16(readFileSync(`${DIR_TANAM}/${b}`)) === k.hash)
      if (sambung) {
        writeFileSync(k.file, readFileSync(`${DIR_TANAM}/${sambung}`))
        BERUBAH = true
        catat('ADOPSI-SAMBUNG', k.file, `tangan diputus DIAMBIL LAGI dari tanah (${DIR_TANAM}/${sambung}, DNA ${k.hash}) lalu disambung — caburan bertunas (H1/H3)`)
      } else catat('TAK-BISA-PULIH', k.file, 'organ hilang; cadangan & tanah tak punya DNA cocok — PANGGILAN PEMILIK')
    }
  }

  if (manifesKotor) { m.diperbarui = m.diperbarui || ISO(); writeFileSync(MANIFEST, JSON.stringify(m, null, 1)) }

  // 4. NAFAS SENSOR — gejala fungsional dengan saksi mandiri (H4)
  let kea = null
  try { kea = JSON.parse(readFileSync('ruang-hidup/keadaan.json', 'utf8')) } catch {}
  const gagalPasar = ((kea && kea.gagal) || []).filter(g => /^pasar |lilin-gagal/.test(String(g))).length
  const saksi = await Promise.allSettled(SAKSI_NAFAS.map(async u => {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 4500)
    try { const r = await fetch(u, { signal: c.signal }); return r.ok } finally { clearTimeout(t) }
  }))
  const saksiHidup = saksi.filter(s => s.status === 'fulfilled' && s.value).length
  let nafasPutusan
  if (saksiHidup === 0) {
    nafasPutusan = 'NAFAS-DUNIA-TERPUTUS: semua saksi pasar mati — makhluk hidup dari ingatan sendiri; denyut tetap, keadaan disimpan (H4)'
    catat('NAFAS-DUNIA', 'saksi-pasar', nafasPutusan)
  } else if (gagalPasar >= 5) {
    const sadar = m.kode.find(k => k.file === 'scripts/hidup/sadar1.js')
    const berubah = sadar && existsSync(sadar.file) && h16(readFileSync(sadar.file)) !== sadar.hash
    if (berubah) {
      const cad = existsSync(sadar.cadangan) ? readFileSync(sadar.cadangan) : null
      if (cad && h16(cad) === sadar.hash) {
        writeFileSync(sadar.file, cad)
        BERUBAH = true
        nafasPutusan = 'RACUN-SALURAN: dunia hidup (' + saksiHidup + '/3 saksi) tapi nafas makhluk mati (' + gagalPasar + ' gagal pasar) + tubuh berubah → saluran dipulihkan dari cadangan (H4)'
        catat('PULIHKAN', 'scripts/hidup/sadar1.js', nafasPutusan)
      }
    } else {
      nafasPutusan = 'NAFAS-TERSENDAT: dunia hidup tapi ' + gagalPasar + ' bacaan pasar gagal; tubuh sadar1 tak berubah — luka di luar jangkauan imun, dilaporkan jujur'
      catat('NAFAS-TERSENDAT', 'saksi-pasar', nafasPutusan)
    }
  } else {
    nafasPutusan = 'NAFAS-LEGA: saksi hidup ' + saksiHidup + '/3, gagal pasar ' + gagalPasar
  }

  // 5. laporan tersegel + log
  const lapor = {
    skema: 'imun-patroli-v2', dihasilkan: ISO(), watak: 'kajian-hidup H1–H6 + V309 urat/tanam',
    nafas: { saksiHidup, gagalPasar, putusan: nafasPutusan },
    tindakan: TINDAKAN, catatan: CATATAN,
    rekap: {
      pulihkan: TINDAKAN.filter(t => t.jenis === 'PULIHKAN').length,
      ikatanLepas: TINDAKAN.filter(t => t.jenis === 'PULIHKAN-URAT').length,
      sarafLepas: TINDAKAN.filter(t => t.jenis === 'PULIHKAN-SARAF').length,
      sambung: TINDAKAN.filter(t => t.jenis === 'ADOPSI-SAMBUNG').length,
      cabur: TINDAKAN.filter(t => t.jenis === 'CABUR-DIKENAL').length,
      adopsi: TINDAKAN.filter(t => t.jenis === 'ADOPSI' || t.jenis === 'ADOPSI-SAKSIKAN').length,
      lukaTakTerpulihkan: TINDAKAN.filter(t => t.jenis.startsWith('TAK-BISA') || t.jenis.startsWith('LUKA')).length,
      tubuhBerubah: TINDAKAN.filter(t => t.jenis === 'TUBUH-BERUBAH').length
    }, segel: null
  }
  const buf = JSON.stringify(lapor, null, 1)
  lapor.segel = { hash: h16(buf), size: buf.length, readAt: ISO() }
  writeFileSync(LAPORAN, JSON.stringify(lapor, null, 1))
  writeFileSync(LOG, (existsSync(LOG) ? readFileSync(LOG, 'utf8') : '') +
    JSON.stringify({ waktu: lapor.dihasilkan, rekap: lapor.rekap, nafas: lapor.nafas.putusan.slice(0, 120), tindakan: TINDAKAN.map(t => t.jenis + ':' + t.file).join('|') }) + '\n')

  // 6. komit bila ada pemulihan nyata ATAU luka yang wajib berteriak (H2).
  //    V309: patroli observasi-murni (cabur-dikenal, tubuh-berubah) TIDAK
  //    membuat komit — anti-kebisingan; laporan tetap dijurnal di imun.jsonl.
  if (BERUBAH || lapor.rekap.lukaTakTerpulihkan) {
    const n = lapor.rekap.pulihkan + lapor.rekap.ikatanLepas + lapor.rekap.sarafLepas + lapor.rekap.sambung
    pushGit(`IMUN: ${n} tindakan (pulihkan/lepaskan-ikat/sambung) — ${nafasPutusan.slice(0, 70)} [skip ci]`)
  }
  console.log('[imun] patroli selesai —', JSON.stringify(lapor.rekap), '—', nafasPutusan.slice(0, 110))
}

const arg = process.argv[2]
if (arg === '--benih') { benih(); process.exit(0) }
if (arg === '--segarkan-kode') {
  const m = manifesMuat(); const waktu = ISO()
  for (const k of m.kode) {
    const cek = spawnSync('node', ['--check', k.file])
    if (cek.status !== 0) { console.error('[imun] tolak segarkan: ' + k.file + ' sintaks patah'); continue }
    const isi = readFileSync(k.file)
    writeFileSync(k.cadangan, isi)
    k.hash = h16(isi); k.size = isi.length; k.cadanganWaktu = waktu
    console.log('[imun] kode diadopsi ke cadangan: ' + k.file)
  }
  m.diperbarui = waktu
  writeFileSync(MANIFEST, JSON.stringify(m, null, 1))
  console.log('[imun] cadangan kode disegarkan oleh tangan yang menjalankan --segarkan-kode (tercatat)')
  process.exit(0)
}
if (arg === '--segarkan-saraf') {
  // V309: evolusi saraf SAH — hanya tangan pemilik/tooling yang menjalankan ini.
  // Mencatat tiap perubahan flag aktif agar jejak evolusi tidak hilang.
  const m = manifesMuat(); const waktu = ISO()
  const e = m.organ.find(o => o.file === 'otak/saraf.json')
  if (!e) { console.error('[imun] saraf belum di manifes'); process.exit(1) }
  const uji = sahJSON(e.file, e.wajib, null)
  if (uji.masalah) { console.error('[imun] tolak segarkan saraf: ' + uji.masalah); process.exit(1) }
  const mati = Object.entries(uji.j.organ || {}).filter(([, v]) => v && v.aktif === false).map(([k]) => k)
  if (mati.length) { console.error('[imun] tolak segarkan saraf: ada tangan dimatikan (' + mati.join(',') + ') — nyalakan dulu atau gunakan keputusan pemilik tertulis'); process.exit(1) }
  const isi = readFileSync(e.file)
  writeFileSync(e.cadangan, isi)
  e.hash = h16(isi); e.size = isi.length; e.cadanganWaktu = waktu
  m.diperbarui = waktu
  writeFileSync(MANIFEST, JSON.stringify(m, null, 1))
  console.log('[imun] peta saraf disegarkan ke cadangan oleh tangan yang menjalankan --segarkan-saraf (tercatat)')
  process.exit(0)
}
patroli().then(() => process.exit(0)).catch(e => {
  console.error('[imun] patroli gagal (jujur, denyut lanjut):', e && e.stack || e)
  process.exit(0) // H2: gagal imun tak boleh mematikan denyut — tapi tak boleh diam: log Actions mencatatnya
})
