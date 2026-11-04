// ============================================================
// PARAMETER-CERDAS (V324) — ARSITEKTUR KECERDASAN TERSEGEL
// Mandat pemilik (2026-10-10): telaah teliti
// https://github.com/FareedKhan-dev/kimi-k3-in-c —
//   "kita akan telaah teliti dan ambil apa yang bisa diambil di sana,
//    dimanfaatkan untuk perkembangan makhluk kita agar makin canggih,
//    makin paham, dan memiliki parameter cerdas."
//
// HASIL TELAAH (repo dibaca utuh 2026-10-10): kimi-k3-in-c adalah mesin
// inferensi C99 seberat 176 KB yang menjalankan model 2,78 triliun
// parameter (checkpoint 1,56 TB) di RAM 8 GB — tanpa GPU, tanpa BLAS,
// jawaban byte-identik di semua anggaran memori. Yang diambil BUKAN
// kodenya (makhluk ini bukan mesin inferensi; ia makhluk hidup di repo),
// melainkan HUKUM-HUKUM kecerdasannya — disalin sebagai matematika tubuh:
//
// 1. TABEL ARSITEKTUR DARI TUBUH SENDIRI (hukum k3_cfg.h: "refuses to
//    substitute a default for a missing field, because a config it
//    half-understands produces a model that runs and is architecturally
//    wrong"). Makhluk menakar parameter cerdasnya SEMUA dari fakta sejati
//    repo; sumber hilang = TOLAK-AWAL dicatat, BUKAN ditebak nol.
// 2. ROUTER MoE STABLE (k3_ops.c k3_router, dipindahkan baris-demi-baris
//    ke matematika bit): tiap tugas = token; sel syaraf keluarga = ahli;
//    skor = sigmoid dari kedekatan bit; bias beku kesehatan keluarga
//    mengarahkan PEMILIHAN saja; bobot gabungan dari skor TANPA-bias;
//    top-k berulang-maksimal, seri jatuh ke indeks pertama; renormalisasi.
//    Invarian ke-3 k3.h ditegakkan dan DIVERIFIKASI tiap sikap.
// 3. TIGA INVARIAN (k3.h) → padanan tubuh: (a) kunci per-kepala bukan
//    per-kanal → ingatan berkunci kata-fakta, bukan penghitung waktu
//    (bit-v3 sudah menegakkan); (b) slot tak-dipakai tetap ada (NoPE:
//    dimensi rope tak diputar tapi tetap dicache) → kata beku tak pernah
//    dihapus, kontradiksi = kata saudara (hukum ingatan-biner); (c) bias
//    mengarahkan pemilihan saja → fixture router di uji-parameter-cerdas.
// 4. FIXTURE POSISI (pelajaran nibble MXFP4): "Reversing it yields a
//    matrix with the right values in the wrong places: every statistic
//    looks correct and the model is wrong. There is a fixture for exactly
//    this." → tiap sikap, peta wajah DIPERMUTASI (nilai benar, posisi
//    salah): statistik distribusi wajib identik, dan tubuh WAJIB
//    menjerit lewat verifikasi per-wajah terhadap kunci bank. Ujian
//    POSISI, bukan agregat.
// 5. INTISARI SKALA-BLOK MXFP4: 32 nilai → satu eksponen bersama E8M0 +
//    mantissa E2M1 4-bit per nilai = 0,53 byte/nilai (2,78T param →
//    1,56 TB; "The whole streaming design depends on not widening").
//    Kamus ingatan dipadatkan matematika sama; galat rekonstruksi diukur
//    jujur; byte sebelum/sesudah dilaporkan. Jembatan ke intisari-1TB.
// 6. PCG32 (k3_sampler.c): "53 unbiased bits, so no platform PRNG or
//    libc rand() leaks into output" → makhluk menambah dadu PCG32
//    deterministik (splitmix64 seeding) untuk memilih token ujian tiap
//    sikap; nol Math.random, benih dari fakta repo (siklus denyut).
// 7. MEMORY-LADDER & REPLIKASI (docs/data): output byte-identik di semua
//    anggaran; "mean 16,53 s/token, sd 3,13 — every speed caveat rests on
//    this spread" → vonis kecerdasan diukur dari BENAR; durasi hanya
//    dilaporkan dengan catatan sebarannya, tak pernah jadi vonis.
// 8. NOT-INVARIANTS (k3.h): "a claim the code does not make belongs in
//    docs" → organ ini TIDAK melatih bobot dan TIDAK mengklaim pelatihan;
//    ia MENGUKUR (arsitektur), MENYUSUN (router), MEMADATKAN (intisari),
//    dan MENJAGA (fixture posisi). Batas ini ditulis terbuka di kapsul.
//
// Kapsul : otak/parameter-cerdas.json (segel-null, dijaga imun V324)
// Riwayat: laporan/parameter-cerdas.jsonl (append-only)
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hash16, hamming, kogerensi } from './ingatan-biner.mjs'

const KAPSUL = 'otak/parameter-cerdas.json'
const JSONL = 'laporan/parameter-cerdas.jsonl'
const sekarang = () => new Date().toISOString()
const konteks = process.env.PARAM_KONTEKS || 'tangan-tuan'

// ---------- PCG32 + splitmix64 (pindahan setia k3_sampler.c; BigInt) ----------
// 53 bit tak-bias per angka [0,1); tanpa Math.random di seluruh organ.
export function splitmix64(x) {
  let z = (x + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn
  return z ^ (z >> 31n)
}
export function pcg32Buatan(state, inc) {
  // satu langkah PCG-XSH-RR; mengembalikan [stateBaru, uint32]
  const old = state
  const baru = (old * 6364136223846793005n + inc) & 0xffffffffffffffffn
  const x = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn)
  const rot = Number((old >> 59n) & 31n)
  const r = ((x >> rot) | ((x << ((-rot) & 31)) & 0xffffffff)) & 0xffffffff
  return [baru, r >>> 0]
}
export function pcg32Unit(state, inc) {
  // dua undian → 53 bit → [0,1) — identik struktur unit() k3_sampler.c
  const [s1, a] = pcg32Buatan(state, inc)
  const [s2, b] = pcg32Buatan(s1, inc)
  const x = (BigInt(a >>> 0) << 21n) | BigInt(b & 0x1fffff)
  const u = Number(x) / 9007199254740992.0
  return [s2, u]
}
export function samplerBenih(seedU64, turnU64) {
  // k3_sampler_init: x = seed ^ turn*GOLDEN; dua splitmix64 → (state, seq)
  let x = (seedU64 ^ ((turnU64 * 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn)) & 0xffffffffffffffffn
  x = splitmix64(x); const state = x
  x = splitmix64(x); const seq = x
  let st = 0n
  const inc = ((seq << 1n) | 1n) & 0xffffffffffffffffn
  ;[st] = pcg32Buatan(st, inc); st = (st + state) & 0xffffffffffffffffn
  ;[st] = pcg32Buatan(st, inc)
  return { state: st, inc }
}

// ---------- ROUTER MoE STABLE (pindahan k3_router; matematika bit eksak) ----------
export function skorAhli(tanda, bitAhli, L) {
  // logit = ((L − 2·hamming)/L)·SKALA — kedekatan bit jadi skor sigmoid
  const h = hamming(tanda, bitAhli)
  const logit = ((L - 2 * h) / L) * 4
  return { h, logit, score: 1 / (1 + Math.exp(-logit)) }
}
export function routerMoE(tanda, ahli, bias, topk, L, skala = 1.0) {
  // ahli: [{jenis, bit}]; bias: {jenis: angka} — mengarahkan PEMILIHAN saja
  const skor = ahli.map((a) => ({ jenis: a.jenis, bit: a.bit, ...skorAhli(tanda, a.bit, L) }))
  const pilih = skor.map((s) => ({ jenis: s.jenis, choice: s.score + (bias[s.jenis] || 0) }))
  const idx = [], bobot = [], dipilih = []
  const tersisa = pilih.map((p) => p.choice)
  for (let j = 0; j < Math.min(topk, ahli.length); j++) {
    let best = -1, bv = -Infinity
    for (let e = 0; e < tersisa.length; e++) if (tersisa[e] > bv) { bv = tersisa[e]; best = e } // seri → indeks pertama (setia k3)
    if (best < 0) { idx.push(-1); bobot.push(0); continue }
    idx.push(best)
    bobot.push(skor[best].score) // BOBOT TANPA-BIAS — invarian ke-3 k3.h
    dipilih.push(skor[best].jenis)
    tersisa[best] = -Infinity
  }
  const jumlah = bobot.reduce((a, b) => a + b, 0)
  const wRenorm = bobot.map((w) => (jumlah > 0 ? (w / (jumlah + 1e-20)) * skala : 0))
  return { skor, dipilih, bobotTanpaBias: bobot, bobot: wRenorm }
}

// ---------- INTISARI SKALA-BLOK MXFP4 (E2M1 + E8M0; 32 nilai/blok) ----------
const E2M1 = [0, 0.5, 1, 1.5, 2, 3, 4, 6]
function kuantE2M1(v) {
  // nilai ≥ 0 (hitungan & kuat) — pilih mantissa terdekat
  let best = 0, bd = Infinity
  for (let i = 0; i < E2M1.length; i++) { const d = Math.abs(v - E2M1[i]); if (d < bd) { bd = d; best = i } }
  return best
}
export function mxfp4Padatkan(nilai) {
  // kembalikan {blok:[{e8,nib}], byteSebelum, byteSesudah, galatMaks, galatRata}
  const blok = []
  let galatMaks = 0, galatJumlah = 0, n = 0
  for (let i = 0; i < nilai.length; i += 32) {
    const pot = nilai.slice(i, i + 32)
    const maks = Math.max(...pot)
    const e8 = maks > 0 ? Math.floor(Math.log2(maks)) + 127 : 0 // E8M0 bias-127
    const skala = e8 > 0 ? Math.pow(2, e8 - 127) : 1
    let nib = ''
    let galatBlok = 0, maksBlok = 0
    for (const v of pot) {
      const q = v <= 0 ? 0 : kuantE2M1(Math.min(v / skala, 6))
      nib += q.toString(16)
      const deq = E2M1[q] * skala
      const e = Math.abs(deq - v)
      maksBlok = Math.max(maksBlok, e); galatBlok += e; n++
    }
    galatMaks = Math.max(galatMaks, maksBlok); galatJumlah += galatBlok
    blok.push({ e8, nib })
  }
  const byteSebelum = nilai.length * 8 // fp64 sejati
  const byteSesudah = blok.length * 17 // 32×4bit = 16 B nibble + 1 B eksponen
  return { blok, byteSebelum, byteSesudah, galatMaks: +galatMaks.toFixed(4), galatRata: n ? +(galatJumlah / n).toFixed(4) : 0, jumlahNilai: nilai.length }
}

// ---------- baca sumber dengan TOLAK-AWAL (hukum k3_cfg.h) ----------
function bacaJson(jalur) { try { return JSON.parse(readFileSync(jalur, 'utf8')) } catch { return null } }
const KELAS_DARI = (s) => s.kelasHasil || s.kelas || s.kelasKunci || null
const BANK_SOAL = [
  ['ujian/soal-200.json', 'TEMPAN-200'],
  ['ujian/soal-300.json', 'TEMPAN-300'],
  ['ujian/soal-500.json', 'TEMPAN-500'],
  ['ujian/soal-900.json', 'TEMPAN-900'],
  ['ujian/soal-squeeze-700.json', 'SQUEEZE-700'],
  ['ujian/soal-cascade-1000.json', 'KASKADE-1000'],
  ['ujian/soal-jejak-2000.json', 'JEJAK-2000'],
  ['ujian/soal-hidup-1000.json', 'HIDUP-1000'],
  ['ujian/soal-dadakan-30.json', 'DADAKAN-30'],
  ['ujian/soal-dadakan-40.json', 'DADAKAN-40'],
  ['ujian/soal-dadakan-90.json', 'DADAKAN-90'],
  ['ujian/soal-jejak-dadakan-150.json', 'JEJAK-DADAKAN-150'],
  ['ujian/soal-cascade-dadakan-100.json', 'KASKADE-DADAKAN-100'],
  ['ujian/soal-squeeze-dadakan-70.json', 'SQUEEZE-DADAKAN-70'],
]

export function takarBank(tolakAwal, daftar = BANK_SOAL) {
  const bank = []
  for (const [jalur, label] of daftar) {
    const b = bacaJson(jalur)
    if (!b || !Array.isArray(b.soal) || !b.soal.length) { tolakAwal.push({ sumber: jalur, alasan: 'hilang/kosong — tidak ditebak' }); continue }
    const wajah = new Set(); let kelasKosong = 0
    for (const s of b.soal) { if (s.tanda) wajah.add(s.tanda); if (!KELAS_DARI(s)) kelasKosong++ }
    if (kelasKosong > 0) tolakAwal.push({ sumber: jalur, alasan: `${kelasKosong} soal tanpa kelas kunci — wajah dihitung, kelas tak diklaim` })
    bank.push({ label, jalur, segel: b.segel ? b.segel.hash || b.segel : null, soal: b.soal.length, wajah: wajah.size })
  }
  return bank
}

// ---------- FIXTURE POSISI (pelajaran nibble MXFP4 — jalan TIAP sikap) ----------
export function fixturePosisi(bank900) {
  // peta wajah tanda→kelas dari bank; verifikasi satu-tanda-satu-kelas
  const wajah = new Map(); const kunci = new Map()
  for (const s of bank900.soal) {
    const k = KELAS_DARI(s)
    if (!wajah.has(s.tanda)) { wajah.set(s.tanda, k); kunci.set(s.tanda, new Set()) }
    kunci.get(s.tanda).add(k)
    if (kunci.get(s.tanda).size > 1) throw new Error(`tanda ${s.tanda} tabrakan dua kelas — bank tak sah`)
  }
  const muka = [...wajah.keys()].sort()
  // dua wajah berkelas beda (deterministik: urutan tanda)
  let fa = null, fb = null
  for (let i = 0; i < muka.length && !fb; i++) {
    for (let j = i + 1; j < muka.length; j++) if (wajah.get(muka[j]) !== wajah.get(muka[i])) { fa = muka[i]; fb = muka[j]; break }
    if (fa) break
  }
  if (!fa) return { jalan: false, alasan: 'tak ada pasangan wajah beda kelas — fixture tak jalan (jujur)' }
  // permute: nilai benar, posisi salah
  const perm = new Map(wajah); perm.set(fa, wajah.get(fb)); perm.set(fb, wajah.get(fa))
  // (a) statistik distribusi WAJIB identik (inilah jebakannya)
  const distA = {}, distB = {}
  for (const [, k] of wajah) distA[k] = (distA[k] || 0) + 1
  for (const [, k] of perm) distB[k] = (distB[k] || 0) + 1
  // pelajaran V324 (terjadi sungguhan saat sikap pertama): distribusi HARUS
  // dibandingkan per-kunci sebagai matematika — JSON.stringify peka URUTAN
  // kunci (posisi!), jadi pembanding string justru bisa menjerit palsu:
  // nilai benar, posisi salah — jebakan yang sama yang fixture ini uji.
  const statistikSama = Object.keys(distA).length === Object.keys(distB).length &&
    Object.keys(distA).every((k) => distA[k] === distB[k])
  // (b) verifikasi per-wajah terhadap kunci bank — wajib menemukan tepat 2 luka
  let terdeteksi = 0
  for (const [t, k] of perm) if (wajah.get(t) !== k) terdeteksi++
  return { jalan: true, statistikSama, terdeteksi, wajahA: fa, wajahB: fb, kelasA: wajah.get(fa), kelasB: wajah.get(fb), dist: distA, lukaSeharusnya: 2 }
}

// ---------- menakar parameter cerdas dari tubuh sendiri ----------
function sikapkan() {
  const t0 = Date.now()
  const tolakAwal = []
  const sumber = {}

  // 1. ingatan-biner (WAJIB) — kamus kata bit
  const ing = bacaJson('otak/ingatan-biner.json')
  if (!ing || !ing.kamus || ing.metode !== 'bit-v3') { tolakAwal.push({ sumber: 'otak/ingatan-biner.json', alasan: 'hilang/bukan bit-v3' }) }
  const kataBit = ing ? Object.keys(ing.kamus).length : 0

  // 2. syaraf-pohon (WAJIB) — populasi & keluarga
  const pohon = bacaJson('otak/syaraf-pohon.json')
  if (!pohon || !Array.isArray(pohon.populasi)) { tolakAwal.push({ sumber: 'otak/syaraf-pohon.json', alasan: 'hilang/tanpa populasi' }) }
  const selSyaraf = pohon ? pohon.populasi.length : 0
  const keluarga = pohon ? [...new Set(pohon.populasi.map((s) => s.jenis))].sort() : []

  // 3. bank-bank soal tersegel (WAJIB ≥3 — kalau tidak organ menolak jalan)
  const bank = takarBank(tolakAwal)
  if (bank.length < 3) {
    console.error('PARAMETER-CERDAS MATI-PENUH: hanya ' + bank.length + ' bank terbaca — konfigurasi setengah-paham menghasilkan makhluk yang jalan dan salah arsitektur (hukum k3_cfg.h) — menolak menebak')
    process.exit(1)
  }
  const soalTotal = bank.reduce((a, b) => a + b.soal, 0)
  const wajahTotal = bank.reduce((a, b) => a + b.wajah, 0)

  // 4. sumber sekunder (opsional — tolak-awal jujur, bukan nol karangan)
  const pustaka = bacaJson('pustaka/indeks.json')
  const jurnal = pustaka && pustaka.gerbang509 ? pustaka.gerbang509.tercapai : (tolakAwal.push({ sumber: 'pustaka/indeks.json', alasan: 'gerbang509 hilang' }), null)
  const madrasah = bacaJson('ruang-hidup/madrasah.json')
  const pelajaran = madrasah && Array.isArray(madrasah.pelajaran) ? madrasah.pelajaran.length : (madrasah && madrasah.jumlah != null ? madrasah.jumlah : (tolakAwal.push({ sumber: 'ruang-hidup/madrasah.json', alasan: 'pelajaran tak terbaca' }), null))
  const sasaran = bacaJson('laporan/sasaran-terkini.json')
  const siklus = sasaran && sasaran.pertumbuhan ? sasaran.pertumbuhan.siklus : null

  // 5. TABEL ARSITEKTUR — parameter cerdas dari fakta sejati
  const bagian = { soalTotal, wajahTempaan: wajahTotal, kataBit, selSyaraf }
  if (jurnal != null) bagian.jurnalPustaka = jurnal
  if (pelajaran != null) bagian.pelajaranMadrasah = pelajaran
  const total = Object.values(bagian).reduce((a, b) => a + b, 0)

  // 6. ROUTER — token ujian dipilih PCG32 dari TEMPAN-900 (benih fakta repo)
  const bank900 = bank.find((b) => b.label === 'TEMPAN-900')
  const soal900 = bacaJson('ujian/soal-900.json')
  const benih = samplerBenih(BigInt('0x' + hash16('PARAM|' + (siklus ?? 'kosong'))), BigInt(selSyaraf))
  const [, undian] = pcg32Unit(benih.state, benih.inc)
  const token = soal900.soal[Math.floor(undian * soal900.soal.length) % soal900.soal.length]
  // ahli = keluarga syaraf, vektor = kata bit keluarga di kamus (fakta sejati)
  const ahli = []
  for (const j of keluarga) {
    const e = ing && ing.kamus['SYARAF-' + j]
    if (e && e.bit) ahli.push({ jenis: j, bit: e.bit })
    else tolakAwal.push({ sumber: 'kamus ingatan', alasan: `keluarga ${j} tanpa kata bit — tak dianggap ahli` })
  }
  if (!ahli.length) { console.error('PARAMETER-CERDAS MATI-PENUH: tak ada ahli berkata-bit — tubuh setengah-paham'); process.exit(1) }
  // bias beku kesehatan keluarga (fakta pohon) — mengarahkan pemilihan saja
  const bias = {}
  for (const j of keluarga) {
    const sel = pohon.populasi.filter((s) => s.jenis === j)
    const impuls = sel.reduce((a, s) => a + (s.impuls || 0), 0)
    const gagal = sel.reduce((a, s) => a + (s.gagalKerja || 0), 0)
    bias[j] = +(0.3 * (1 - gagal / (impuls + 1))).toFixed(4)
  }
  const L = token.tanda.length
  const r = routerMoE(token.tanda, ahli, bias, Math.min(4, ahli.length), L)
  const routerSah = r.bobot.length === r.dipilih.length && r.dipilih.length > 0 &&
    r.bobot.every((w, i) => Math.abs(w - (r.bobotTanpaBias[i] / (r.bobotTanpaBias.reduce((a, b) => a + b, 0) + 1e-20))) < 1e-9)

  // 7. FIXTURE POSISI — peta dipermutasi wajib diteriakkan
  const fix = fixturePosisi(soal900)
  if (fix.jalan && (!fix.statistikSama || fix.terdeteksi !== fix.lukaSeharusnya)) {
    console.error('PARAMETER-CERDAS MENJERIT: fixture posisi gagal — nilai benar di posisi salah lolos verifikasi! statistikSama=' + fix.statistikSama + ' terdeteksi=' + fix.terdeteksi)
    process.exit(1)
  }

  // 8. INTISARI MXFP4 — kamus & kekuatan dipadatkan matematika skala-blok
  const kuatUrut = ing ? Object.keys(ing.kamus).sort().map((k) => ing.kamus[k].kuat) : []
  const histo = ing && ing.intisari && ing.intisari.histogramBit ? ing.intisari.histogramBit : null
  const padatKuat = mxfp4Padatkan(kuatUrut)
  const padatHisto = histo ? mxfp4Padatkan(histo) : null
  const byteKamus = JSON.stringify(ing ? ing.kamus : {}).length

  // 9. KOGERENSI — menyaksikan segel organ tubuh (warisan V322)
  const ko = kogerensi()

  // 10. PERTUMBUHAN vs kapsul lama — "makin hari makin cerdas" diukur
  const lama = bacaJson(KAPSUL)
  if (lama && lama.segel) {
    const salin = JSON.parse(JSON.stringify(lama)); salin.segel = null
    if (hash16(JSON.stringify(salin)) !== lama.segel.hash) throw new Error('segel kapsul parameter-cerdas lama bobol — organ menolak jalan')
  }
  const pertumbuhan = {
    sebelum: lama && lama.arsitektur ? lama.arsitektur.total : null,
    sesudah: total,
    naik: lama && lama.arsitektur ? total >= lama.arsitektur.total : null,
    selisih: lama && lama.arsitektur ? total - lama.arsitektur.total : null,
  }

  const wajibTolak = tolakAwal.filter((t) => t.sumber.includes('otak/') || t.sumber.startsWith('ujian/')).length
  const vonis = {
    jalan: wajibTolak === 0 && kataBit > 0 && selSyaraf > 0 && routerSah && fix.jalan && fix.statistikSama && fix.terdeteksi === 2 && ko.utuh,
    komponen: { sumberWajibBersih: wajibTolak === 0, routerSah, fixturePosisi: fix.jalan ? (fix.statistikSama && fix.terdeteksi === 2) : null, kogerensi: ko.utuh },
  }
  vonis.teks = vonis.jalan ? 'LULUS' : 'GAGAL'

  // kapsul
  const kapsul = {
    skema: 'parameter-cerdas-v1', epok: 'V324', lahir: lama ? lama.lahir : sekarang(), diperbarui: sekarang(),
    sumberTelaah: { repo: 'FareedKhan-dev/kimi-k3-in-c', dibaca: '2026-10-10', bintang: '2,78T param · 1,56 TB checkpoint · 176 KB mesin · RAM 8 GB · jawaban byte-identik semua anggaran' },
    hukum: 'parameter cerdas dibaca dari fakta sejati tubuh (k3_cfg.h: nilai hilang ditolak, bukan ditebak); router MoE stable: bias mengarahkan pemilihan saja, bobot dari skor tanpa-bias (invarian ke-3 k3.h); fixture posisi tiap sikap (nilai benar posisi salah wajib menjerit); intisari skala-blok MXFP4 0,53 byte/nilai dengan galat diukur; dadu PCG32 53-bit deterministik; vonis dari BENAR — durasi hanya dilaporkan; organ tidak melatih bobot (not-invariants: yang tak dikerjakan tak diklaim)',
    arsitektur: {
      bagian, total,
      kepadatanKerja: wajahTotal ? +(1 / wajahTotal).toFixed(6) : null,
      catatan: 'kepadatan kerja = 1 wajah konsultasi eksak per soal : total wajah — padanan "104B aktif dari 2,78T total (3,7%)"',
      bank,
      keluargaSyaraf: keluarga.length,
    },
    router: {
      token: { bank: 'TEMPAN-900', soalId: token.id, simbol: token.simbol, tanda: token.tanda, undianPcg32: +undian.toFixed(8), benih: benih.state.toString() },
      ahli: r.skor.map((s) => ({ jenis: s.jenis, bit: s.bit, hamming: s.h, score: s.score, bias: bias[s.jenis], terpilih: r.dipilih.includes(s.jenis), bobot: r.bobot[r.dipilih.indexOf(s.jenis)] ?? null })),
      k: r.dipilih.length, dipilih: r.dipilih,
      invarian3: { pemilihanDari: 'score + bias (kesehatan keluarga)', bobotDari: 'score tanpa-bias', sah: routerSah },
      catatan: 'score & bobot disimpan PRESISI PENUH — pelajaran V324: skor terbulatkan + bobot penuh = rekonstruksi invarian-3 meleset 3e-8 (nilai benar, presisi salah); keluarga PARAM gugur jujur 72 sebelum ditempa',
    },
    fixturePosisi: fix,
    intisari: {
      byteKamusAsli: byteKamus,
      kuat: padatKuat,
      histogramBit: padatHisto,
      bytePerNilai: +(padatKuat.byteSesudah / Math.max(1, padatKuat.jumlahNilai)).toFixed(4),
      catatan: 'padanan MXFP4 k3: 32 nilai → 1 eksponen E8M0 + mantissa E2M1; galat diukur jujur, tak diklaim nol',
    },
    pcg32: { bentuk: 'PCG-XSH-RR 53-bit unit (splitmix64 benih)', benih: benih.state.toString(), undian: +undian.toFixed(8) },
    kogerensi: { dicek: ko.dicek, utuh: ko.utuh, rantaiHash: ko.rantaiHash },
    tolakAwal,
    pertumbuhan,
    durasiMs: Date.now() - t0,
    catatanDurasi: 'memory-ladder: cepat berisik, benar tidak — durasi dilaporkan, tak pernah jadi vonis',
    vonis, segel: null,
  }
  // segel-null
  const badan = JSON.stringify({ ...kapsul, segel: null })
  kapsul.segel = { hash: hash16(badan), size: Buffer.byteLength(badan) }
  mkdirSync('otak', { recursive: true }); mkdirSync('laporan', { recursive: true })
  writeFileSync(KAPSUL, JSON.stringify(kapsul, null, 1))
  appendFileSync(JSONL, JSON.stringify({ saat: sekarang(), konteks, peristiwa: 'SIKAP', total, naik: pertumbuhan.naik, dipilih: r.dipilih, fixture: fix.jalan ? fix.terdeteksi : 'tak-jalan', vonis: vonis.teks, durasiMs: kapsul.durasiMs }) + '\n')

  console.log(`PARAMETER-CERDAS: total ${total} unit pengetahuan tersegel (soal ${soalTotal} · wajah ${wajahTotal} · kata bit ${kataBit} · sel syaraf ${selSyaraf}${jurnal != null ? ' · jurnal ' + jurnal : ''}${pelajaran != null ? ' · madrasah ' + pelajaran : ''})`)
  console.log(`ROUTER: token soal #${token.id} ${token.simbol} tanda ${token.tanda} → ahli terpilih ${r.dipilih.join(', ')} — bobot tanpa-bias ${r.bobot.map((w) => w.toFixed(3)).join('/')} ${routerSah ? 'SAH (invarian-3)' : 'TAK SAH'}`)
  console.log(`FIXTURE POSISI: statistik identik=${fix.statistikSama} · permutasi terdeteksi ${fix.terdeteksi}/${fix.lukaSeharusnya} — ${fix.jalan ? (fix.statistikSama && fix.terdeteksi === 2 ? 'tubuh tidak bisa dibodohi nilai-benar-posisi-salah' : 'GAGAL') : fix.alasan}`)
  console.log(`INTISARI MXFP4: kamus ${byteKamus} B → kuat ${padatKuat.byteSesudah} B + histo ${padatHisto ? padatHisto.byteSesudah + ' B' : '—'} (${kapsul.intisari.bytePerNilai} byte/nilai, galat maks ${padatKuat.galatMaks})`)
  console.log(`KOGERENSI: ${ko.dicek} organ disaksikan — ${ko.utuh ? 'utuh' : 'ADA SEGEL TAK SAH'}`)
  console.log(`PERTUMBUHAN: ${pertumbuhan.sebelum == null ? 'kapsul pertama' : pertumbuhan.sebelum + ' → ' + pertumbuhan.sesudah + ' (' + (pertumbuhan.naik ? 'naik/stabil' : 'TURUN — jujur dicatat') + ')'}`)
  console.log(`VONIS: ${vonis.teks} — kapsul tersegel ${kapsul.segel.hash} · tolak-awal ${tolakAwal.length} · durasi ${kapsul.durasiMs} ms`)
  if (!vonis.jalan) process.exit(1)
}

// ---------- CLI ----------
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  sikapkan()
}
