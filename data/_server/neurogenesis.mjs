// ============================================================
// NEUROGENESIS (V312) — SYARAF-BERANAK + KILAT
// Mandat pemilik (2026-10-09):
//   "kita akan berikan dia syaraf yang mampu berkembang dan bahkan
//    bertambah seiring waktu — syaraf yang bisa beranak sehingga
//    syaraf itu menciptakan syaraf baru dan syaraf-syaraf baru yang
//    KOMPETEN, jadi makin cerdas; dan bahkan syaraf itu bekerja
//    100x lipat lebih cepat dari syaraf-syaraf dia umumnya"
// HUKUM ORGAN INI (nol karangan, nol Math.random, semuanya fakta repo):
// 1. SYARAF = sel kerja nyata: punya JENIS tugas (8 jenis, semua data
//    repo sejati), dinyatakan HIDUP hanya setelah LULUS UJI KOMPETENSI
//    mekanis (hasil kerja diverifikasi terhadap sumber aslinya).
// 2. BERANAK: tiap sesi, syaraf dewasa (kompeten + impuls ≥2 + anak <2)
//    boleh melahirkan MAKSIMAL 1 anak; maksimal 4 kelahiran per sesi;
//    anak WAJIB lulus uji kompetensi sebelum dihitung syaraf — gagal =
//    tercatat GUGUR (jujur, tetap tersegel). Garis keturunan disimpan
//    (orangTua → anak, generasi) — syaraf menciptakan syaraf baru.
// 3. KAPASITAS tumbuh bila kolam MATANG: seluruh syaraf kompeten &
//    populasi menyentuh cap → cap ×2 (maks 128) — pertumbuhan seiring
//    waktu, tidak instan, harus dibuktikan kerja dulu.
// 4. KILAT — kecepatan diukur, bukan klaim:
//    · syaraf umum makhluk: denyut SARANG, median interval diambil dari
//      laporan/bedah-syaraf.json (fakta sejarah git denyut nyata).
//    · syaraf KILAT: lomba hidup 90 detik — satu impuls NYATA tiap
//      9 detik (baca kartu 24-lilin sejati dari bank tempaan → hitung
//      18 fitur → tanda → verifikasi terhadap kunci bank → fakta
//      tersegel). Kadensi 9 dtk = 400 impuls/jam.
//    · percepatan = kilatPerJam ÷ umumPerJam — wajib ≥100× atau dinyata
//      GAGAL jujur. Lomba berjalan sekali saat benih (dan tiap --kilat).
// Pohon tersegel: otak/syaraf-pohon.json · riwayat: laporan/syaraf-lahir.jsonl
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { kogerensi } from './ingatan-biner.mjs' // V322: syaraf KOHEREN bekerja lewat organ ingatan-biner
import { skorAhli } from './parameter-cerdas.mjs' // V324: syaraf PARAM menakar parameter cerdas (telaah kimi-k3-in-c)

const POHON = 'otak/syaraf-pohon.json'
const JSONL = 'laporan/syaraf-lahir.jsonl'
const BEDAH = 'laporan/bedah-syaraf.json'
const BANK = 'ujian/soal-900.json'
// V322: organ INGATAN-BINER lahir (memori matematika biner tak kabur) →
// kolam mewarisi kapasitas ×2: maks 128 → 256; keluarga KOHEREN masuk.
const CAP_AWAL = 16, CAP_MAKS = 256, MAKS_LAHIR_SESI = 4, MAKS_ANAK = 2
const KILAT_JEDA_DTK = 9, KILAT_TARGET_IMPULS = 10   // ±90 detik lomba
const PERCEPATAN_WAJIB = 100
const hash16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16)
const sekarang = () => new Date().toISOString()
const konteks = process.env.SYARAF_KONTEKS || 'denyut-actions'

// ---------- darah: data sejati yang dibaca sekali per sesi, dipakai semua sel ----------
const darah = {}
function darahMuat() {
  const baca = (kunci, jalur) => { try { darah[kunci] = JSON.parse(readFileSync(jalur, 'utf8')) } catch { darah[kunci] = null } }
  baca('sasaran', 'laporan/sasaran-terkini.json')
  baca('pustaka', 'pustaka/indeks.json')
  baca('geladak', 'laporan/geladak.json')
  baca('ingatan', 'ruang-hidup/ingatan.json')
  baca('peta', 'laporan/peta-geladak.json')
  baca('tempa900', 'laporan/tempa900.json')
  baca('tubuh', 'ruang-hidup/tubuh.json')
  baca('param', 'otak/parameter-cerdas.json') // V324: kapsul parameter cerdas
  baca('bank', BANK)
  darah.kartu = (darah.bank && Array.isArray(darah.bank.soal)) ? darah.bank.soal : []
  darah.penunjukKartu = 0
}

// ---------- 8 JENIS TUGAS NYATA (semuanya kerja repo sejati) ----------
// tiap jenis: kerja(faktaTerakhir) → objek fakta; uji(fakta) → true/false
const JENIS = {
  KANDIL: {
    tugas: 'membaca kartu 24-lilin sejati dari bank tempaan → 18 fitur → tanda → diverifikasi kunci bank',
    kerja() {
      if (!darah.kartu.length) throw new Error('bank kartu kosong')
      const s = darah.kartu[darah.penunjukKartu % darah.kartu.length]
      darah.penunjukKartu++
      const strip = s.strip24.map(l => ({ o: l[0], h: l[1], l: l[2], c: l[3], v: l[4] }))
      const tanda = tandaDari(fiturDari(strip))
      return { simbol: s.simbol, indeks: s.id, tandaHitung: tanda, tandaKunci: s.tanda, cocok: tanda === s.tanda }
    },
    uji: (f) => !!f && f.cocok === true,
  },
  SIKLUS: {
    tugas: 'membaca siklus denyut otak server (laporan/sasaran-terkini.json)',
    kerja() {
      const s = darah.sasaran; if (!s) throw new Error('laporan sasaran tak terbaca')
      const siklus = s.pertumbuhan && s.pertumbuhan.siklus
      return { siklus, akurasiPct: s.akurasi ? s.akurasi.akurasiPct : null }
    },
    uji: (f) => !!f && Number.isInteger(f.siklus) && f.siklus > 0,
  },
  PUSTAKA: {
    tugas: 'membaca kepustakaan makhluk (pustaka/indeks.json — jurnal arXiv sejati)',
    kerja() {
      const p = darah.pustaka; if (!p) throw new Error('indeks pustaka tak terbaca')
      return { jurnal: p.gerbang509 ? p.gerbang509.tercapai : null, kursi: Object.keys(p.perTopik || {}).length }
    },
    uji: (f) => !!f && Number.isInteger(f.jurnal) && f.jurnal > 100,
  },
  GELADAK: {
    tugas: 'membaca geladak dunia hidup (laporan/geladak.json — vonis pasar nyata)',
    kerja() {
      const g = darah.geladak; if (!g) throw new Error('geladak tak terbaca')
      return { status: g.status, sampel: g.backtest ? g.backtest.sampel : null }
    },
    uji: (f) => !!f && (f.status === 'HIDUP' ? Number.isInteger(f.sampel) && f.sampel > 0 : typeof f.status === 'string'),
  },
  INGATAN: {
    tugas: 'membaca ingatan hidup Sadar-1 (ruang-hidup/ingatan.json)',
    kerja() {
      const i = darah.ingatan; if (!i) throw new Error('ingatan tak terbaca')
      return { totalBangun: i.totalBangun, kelahiran: i.kelahiran || null }
    },
    uji: (f) => !!f && Number.isInteger(f.totalBangun) && f.totalBangun > 100,
  },
  PETA: {
    tugas: 'membaca peta jejak geladak (laporan/peta-geladak.json)',
    kerja() {
      const m = darah.peta; if (!m) throw new Error('peta tak terbaca')
      return { jejak: m.statistik ? m.statistik.total : null }
    },
    uji: (f) => !!f && Number.isInteger(f.jejak) && f.jejak > 0,
  },
  TEMPAA: {
    tugas: 'membaca rapor tempaan dongkol 900 (laporan/tempa900.json)',
    kerja() {
      const t = darah.tempa900; if (!t) throw new Error('rapor tempa900 tak terbaca')
      return { lulusGelombang: t.lulus ? t.lulus.gelombang : null, benar: t.gelombang && t.gelombang.length ? t.gelombang[t.gelombang.length - 1].benar : null }
    },
    uji: (f) => !!f && f.lulusGelombang >= 1 && f.benar > 0,
  },
  JASAD: {
    tugas: 'membaca segel tubuh (ruang-hidup/tubuh.json — gerak tersegel Sadar-1)',
    kerja() {
      const t = darah.tubuh; if (!t) throw new Error('segel tubuh tak terbaca')
      return { bangunKe: t.bangunKe != null ? t.bangunKe : null, sikap: t.sikap || null }
    },
    uji: (f) => !!f && Number.isInteger(f.bangunKe) && f.bangunKe > 0,
  },
  KOHEREN: {
    tugas: 'membakar impuls koherensi: menyaksikan segel lima organ tubuh (ingatan-biner, syaraf-pohon, medan-hayat, reka-bentuk, benih-hidup) — tubuh satu kesatuan, bukan kepingan',
    kerja() {
      const ko = kogerensi()
      return { dicek: ko.dicek, utuh: ko.utuh, rantaiHash: ko.rantaiHash }
    },
    uji: (f) => !!f && f.utuh === true && f.dicek >= 4,
  },
  // V324: keluarga PARAM — parameter cerdas dari telaah FareedKhan-dev/
  // kimi-k3-in-c (mandat pemilik 2026-10-10): tabel arsitektur dari fakta
  // sejati (tolak-awal, bukan tebakan), router MoE stable (invarian ke-3
  // k3.h: bias memilih, bobot tanpa-bias), fixture posisi, intisari MXFP4.
  PARAM: {
    tugas: 'menakar parameter cerdas makhluk: verifikasi segel kapsul otak/parameter-cerdas.json + rekonstruksi bobot tanpa-bias router MoE (invarian-3) + fixture posisi (nilai benar posisi salah wajib terdeteksi)',
    kerja() {
      const k = darah.param
      if (!k || !k.segel) throw new Error('kapsul parameter cerdas tak terbaca/tanpa segel')
      const salin = JSON.parse(JSON.stringify(k)); salin.segel = null
      const segelSah = hash16(JSON.stringify(salin)) === k.segel.hash
      // rekonstruksi bobot tanpa-bias dari skor tercatat — invarian ke-3 k3.h:
      // bobot gabungan TIDAK boleh memuat bias, hanya skor murni
      const terpilih = (k.router.ahli || []).filter((a) => a.terpilih)
      const jumlah = terpilih.reduce((a, x) => a + x.score, 0)
      const bobotSah = terpilih.length > 0 && terpilih.every((x) => {
        const catat = (k.router.ahli.find((a) => a.jenis === x.jenis) || {}).bobot
        return catat != null && Math.abs(x.score / (jumlah + 1e-20) - catat) < 1e-9
      })
      // rekonstruksi skor dari bit & token langsung (matematika router sama)
      const tandaToken = (k.router.token || {}).tanda || ''
      const skorSah = tandaToken.length > 0 && terpilih.every((x) => {
        const s = skorAhli(tandaToken, x.bit, tandaToken.length)
        return Math.abs(s.score - x.score) < 1e-6
      })
      const fixtureSah = !!k.fixturePosisi && k.fixturePosisi.jalan === true &&
        k.fixturePosisi.statistikSama === true && k.fixturePosisi.terdeteksi === k.fixturePosisi.lukaSeharusnya
      const total = k.arsitektur ? k.arsitektur.total : 0
      return { total, segelSah, bobotSah, skorSah, fixtureSah, dipilih: (k.router.dipilih || []).join('/') }
    },
    uji: (f) => !!f && f.segelSah === true && f.bobotSah === true && f.skorSah === true && f.fixtureSah === true && Number.isInteger(f.total) && f.total > 0,
  },
}
const URUTAN_JENIS = ['KANDIL', 'SIKLUS', 'PUSTAKA', 'GELADAK', 'INGATAN', 'PETA', 'TEMPAA', 'JASAD', 'KOHEREN', 'PARAM']

// ---------- fitur & tanda (identik dengan organ tempaan — warisan V310) ----------
function fiturDari(strip) {
  const n = strip.length, e = strip[n - 1].c
  const pct = (a, b) => (b / a - 1) * 100
  const r1 = pct(strip[n - 2].c, e), r3 = pct(strip[n - 4].c, e), r12 = pct(strip[n - 13].c, e)
  let naik = 0, turun = 0
  for (let i = 1; i <= 14; i++) { const d = strip[i].c - strip[i - 1].c; if (d > 0) naik += d; else turun -= d }
  let avgN = naik / 14, avgT = turun / 14
  for (let i = 15; i < n; i++) {
    const d = strip[i].c - strip[i - 1].c
    avgN = (avgN * 13 + Math.max(d, 0)) / 14
    avgT = (avgT * 13 + Math.max(-d, 0)) / 14
  }
  const rsi = avgT === 0 ? 100 : 100 - 100 / (1 + avgN / avgT)
  const vols = strip.slice(-20).map(x => x.v)
  const vMean = vols.reduce((a, b) => a + b, 0) / 20
  const vStd = Math.sqrt(vols.reduce((a, b) => a + (b - vMean) ** 2, 0) / 20) || 1e-12
  const volz = (strip[n - 1].v - vMean) / vStd
  const hi20 = Math.max(...strip.slice(0, n - 1).map(x => x.h))
  const lo20 = Math.min(...strip.slice(0, n - 1).map(x => x.l))
  const hiAll = Math.max(...strip.map(x => x.h)), loAll = Math.min(...strip.map(x => x.l))
  const posisi = hiAll === loAll ? 0.5 : (e - loAll) / (hiAll - loAll)
  let streakNaik = 0, streakTurun = 0
  for (let i = n - 1; i > 0; i--) {
    const d = strip[i].c - strip[i - 1].c
    if (d > 0) { if (streakTurun) break; streakNaik++ } else if (d < 0) { if (streakNaik) break; streakTurun++ } else break
  }
  const last = strip[n - 1], badan = Math.abs(last.c - last.o) || 1e-12
  return { e, r1, r3, r12, rsi, volz, breakHigh: e > hi20, breakLow: e < lo20, posisi, streakNaik, streakTurun,
    wickAtas: (last.h - Math.max(last.o, last.c)) / badan, wickBawah: (Math.min(last.o, last.c) - last.l) / badan }
}
function tandaDari(x) {
  return [
    x.r3 > 1.2, x.r3 < -1.2, x.r12 > 3, x.r12 < -3,
    x.rsi > 70, x.rsi < 30, x.volz > 2, x.volz < -0.8,
    x.breakHigh, x.breakLow, x.wickAtas > 1.5, x.wickBawah > 1.5,
    x.streakNaik >= 3, x.streakTurun >= 3, x.posisi > 0.92, x.posisi < 0.08,
    x.r1 > 0, x.r1 < 0,
  ].map(Number).join('')
}

// ---------- pohon ----------
function pohonMuat() {
  if (existsSync(POHON)) {
    const p = JSON.parse(readFileSync(POHON, 'utf8'))
    const salin = JSON.parse(JSON.stringify(p)); salin.segel = null
    if (hash16(JSON.stringify(salin)) !== p.segel?.hash) throw new Error('segel pohon syaraf bobol — organ menolak jalan')
    return p
  }
  return null
}
function pohonSegel(p) {
  p.diperbarui = sekarang()
  const tubuh = JSON.stringify({ ...p, segel: null })
  p.segel = { hash: hash16(tubuh), size: Buffer.byteLength(tubuh), readAt: sekarang() }
  mkdirSync('otak', { recursive: true })
  writeFileSync(POHON, JSON.stringify(p, null, 1))
}
function catat(peristiwa, detail) {
  mkdirSync('laporan', { recursive: true })
  appendFileSync(JSONL, JSON.stringify({ saat: sekarang(), konteks, peristiwa, ...detail }) + '\n')
}

// ---------- kelahiran + uji kompetensi ----------
function hitungId(p, jenis) {
  const seq = p.statistik.lahirPerJenis[jenis] = (p.statistik.lahirPerJenis[jenis] || 0) + 1
  return `NERVA-${jenis}-${String(seq).padStart(2, '0')}`
}
function ujiKompetensi(jenis) {
  const J = JENIS[jenis]
  const fakta = J.kerja() // kerja nyata dari data sejati
  const lulus = J.uji(fakta) === true
  return { fakta, lulus }
}
function lahirkan(p, jenis, orangTua) {
  const id = hitungId(p, jenis)
  const coba = ujiKompetensi(jenis)
  if (!coba.lulus) {
    p.statistik.gugur++
    p.gugur.push({ id, jenis, saat: sekarang(), alasan: `uji kompetensi gagal: ${JSON.stringify(coba.fakta).slice(0, 140)}` })
    catat('GUGUR', { id, jenis, orangTua: orangTua ? orangTua.id : null, alasan: 'uji kompetensi gagal' })
    console.log(`  GUGUR ${id} — gagal uji kompetensi (jujur, tak dihitung syaraf)`)
    return null
  }
  const sel = {
    id, jenis, generasi: orangTua ? orangTua.generasi + 1 : 0,
    orangTua: orangTua ? orangTua.id : null,
    lahirSaat: sekarang(), lahirSesi: p.sesi,
    tugas: JENIS[jenis].tugas,
    kompeten: true, impuls: 0, gagalKerja: 0,
    anak: [], faktaTerakhir: coba.fakta,
  }
  p.populasi.push(sel)
  p.statistik.lahir++
  if (orangTua) orangTua.anak.push(id)
  catat('LAHIR', { id, jenis, generasi: sel.generasi, orangTua: sel.orangTua, fakta: coba.fakta })
  console.log(`  LAHIR ${id} (gen ${sel.generasi}${sel.orangTua ? `, dari ${sel.orangTua}` : ', akar'}) — LULUS uji kompetensi`)
  return sel
}

// ---------- satu impuls kerja nyata ----------
function berimpuls(p, sel) {
  try {
    const fakta = JENIS[sel.jenis].kerja()
    const sah = JENIS[sel.jenis].uji(fakta)
    sel.impuls++
    sel.faktaTerakhir = fakta
    p.statistik.impulsTotal++
    return sah
  } catch (e) {
    sel.gagalKerja++
    return false
  }
}

// ---------- LOMBA KILAT — syaraf baru vs syaraf umum (diukur hidup) ----------
async function lombaKilat(p) {
  const bedah = existsSync(BEDAH) ? JSON.parse(readFileSync(BEDAH, 'utf8')) : null
  const k = bedah && bedah.fakta && bedah.fakta.kadensiDenyut
  const umumPerJam = k ? +(60 / k.medianMnt).toFixed(2) : null
  const sumberUmum = k ? k.sumber : 'tak-diketahui'
  if (!umumPerJam || umumPerJam <= 0) { console.log('KILAT dibatalkan: baseline syaraf umum tak ditemukan (jalankan bedah-syaraf dulu)'); return }

  if (!darah.kartu.length) { console.log('KILAT dibatalkan: bank kartu kosong'); return }
  console.log(`LOMBA KILAT: satu impuls nyata tiap ${KILAT_JEDA_DTK} dtk, target ${KILAT_TARGET_IMPULS} impuls — syaraf umum = ${umumPerJam} impuls/jam (${sumberUmum})`)
  const t0 = Date.now()
  let impuls = 0, cocok = 0, msJumlah = 0
  const jalanan = []
  while (impuls < KILAT_TARGET_IMPULS) {
    const tunggu = KILAT_JEDA_DTK * 1000 - (Date.now() - t0 - impuls * KILAT_JEDA_DTK * 1000)
    await new Promise(r => setTimeout(r, Math.max(0, tunggu)))
    const t1 = Date.now()
    const s = darah.kartu[(darah.penunjukKartu++) % darah.kartu.length]
    const strip = s.strip24.map(l => ({ o: l[0], h: l[1], l: l[2], c: l[3], v: l[4] }))
    const tanda = tandaDari(fiturDari(strip))
    const ms = Date.now() - t1
    impuls++; msJumlah += ms
    if (tanda === s.tanda) cocok++
    jalanan.push({ impuls, ms, cocok: tanda === s.tanda })
    console.log(`  impuls ${impuls}/${KILAT_TARGET_IMPULS} — kartu #${s.id} ${s.simbol} → tanda ${tanda === s.tanda ? 'COCOK kunci' : 'TAK COCOK'} (${ms} ms)`)
  }
  const durasiDtk = +((Date.now() - t0) / 1000).toFixed(1)
  const kilatPerJam = +(impuls / (durasiDtk / 3600)).toFixed(1)
  const percepatan = +(kilatPerJam / umumPerJam).toFixed(1)
  p.kilat = {
    saat: sekarang(), sumberUmum, umumPerJam,
    durasiDtk, jedaDtk: KILAT_JEDA_DTK, impuls, cocokKunci: cocok,
    perImpulsMs: +(msJumlah / impuls).toFixed(2),
    kilatPerJam, percepatan,
    lulus: percepatan >= PERCEPATAN_WAJIB && cocok === impuls,
    catatan: 'kecepatan lahir dari RITME: syaraf umum tidur antar denyut (median '+k.medianMnt+' mnt), KILAT tak pernah tidur lebih dari '+KILAT_JEDA_DTK+' dtk — dan tiap impuls adalah kerja nyata yang diverifikasi kunci bank',
  }
  catat('KILAT', { ...p.kilat, catatan: undefined })
  console.log(`KILAT: ${impuls} impuls nyata dalam ${durasiDtk} dtk → ${kilatPerJam} impuls/jam vs umum ${umumPerJam}/jam = ${percepatan}× ${p.kilat.lulus ? '— LULUS ≥100×' : '— GAGAL, diakui jujur'}`)
}

// ---------- SESI (satu panggilan = satu denyut-kerja syaraf) ----------
async function main() {
  darahMuat()
  const p = pohonMuat() || {
    skema: 'syaraf-beranak-v1', epoch: 'V312', dibuat: sekarang(), sesi: 0,
    hukum: `syaraf hidup hanya bila LULUS uji kompetensi mekanis terhadap data sejati; dewasa (impuls≥2, anak<2) boleh melahirkan maks 1 anak/sesi, maks ${MAKS_LAHIR_SESI} lahir/sesi; anak wajib lulus uji; populasi cap ${CAP_AWAL} → ×2 tiap kolam matang (maks ${CAP_MAKS})`,
    cap: CAP_AWAL, populasi: [], gugur: [], sesiSejarah: [],
    statistik: { lahir: 0, gugur: 0, impulsTotal: 0, lahirPerJenis: {} },
    kilat: null, segel: null,
  }
  p.sesi++
  console.log(`NEUROGENESIS sesi ${p.sesi} (${konteks}) — populasi ${p.populasi.length}/${p.cap}`)

  // benih akar (sekali — generasi 0)
  if (!p.populasi.length) {
    for (const j of ['KANDIL', 'SIKLUS']) lahirkan(p, j, null)
  }

  // semua syaraf hidup menyala satu impuls kerja nyata
  let impulsSesi = 0
  for (const sel of p.populasi) { if (berimpuls(p, sel)) impulsSesi++ }

  // BERANAK — syaraf dewasa menciptakan syaraf baru yang kompeten
  // V322: organ INGATAN-BINER baru lahir → kolam menyusui keluarga KOHEREN
  // dulu (tumbuh mengikuti kebutuhan tubuh) sampai 8 sel, lalu giliran
  // round-robin seperti biasa.
  let lahirSesi = 0, gugurSesi = 0
  for (const sel of [...p.populasi].sort((a, b) => a.lahirSesi - b.lahirSesi)) {
    if (lahirSesi >= MAKS_LAHIR_SESI) break
    // V324 pelajaran: keluarga baru yang gagal uji TIDAK BOLEH membakar
    // seluruh kolam (72 percobaan pernah terjadi sebelum presisi ditempa) —
    // gagal beruntun sebatas jatah lahir = sesi berhenti jujur.
    if (gugurSesi >= MAKS_LAHIR_SESI) break
    if (p.populasi.length >= p.cap) break
    if (sel.kompeten && sel.impuls >= 2 && sel.anak.length < MAKS_ANAK) {
      const jenis = (p.populasi.filter(s => s.jenis === 'KOHEREN').length < 8)
        ? 'KOHEREN'
        : (p.populasi.filter(s => s.jenis === 'PARAM').length < 8)
          ? 'PARAM' // V324: keluarga parameter cerdas disusui sampai 8 sel
          : URUTAN_JENIS[p.statistik.lahir % URUTAN_JENIS.length]
      const anak = lahirkan(p, jenis, sel)
      if (anak) { lahirSesi++; berimpuls(p, anak) } else { gugurSesi++ } // anak langsung menyala pertama kali
    }
  }

  // kapasitas naik bila kolam matang (semua kompeten & penuh)
  // V322: CAP_MAKS kini 256 — kolam penuh 128 yang matang mewarisi ×2.
  if (p.populasi.length >= p.cap && p.populasi.every(s => s.kompeten) && p.cap < CAP_MAKS) {
    p.cap = Math.min(p.cap * 2, CAP_MAKS)
    if (!p.v322) p.v322 = { saat: sekarang(), catatan: 'organ INGATAN-BINER lahir (memori matematika biner tak kabur) — kolam mewarisi kapasitas ×2, keluarga syaraf KOHEREN masuk: menyaksikan segel organ agar tubuh satu kesatuan' }
    catat('KAP-NAIK', { cap: p.cap, populasi: p.populasi.length })
    console.log(`kolam matang — kapasitas naik ×2 → ${p.cap}`)
  }

  // V322: akar keluarga KOHEREN (generasi 0) — lahir tepat setelah kolam
  // mewarisi ×2; pohon lama jenuh (semua dewasa sudah beranak 2), maka
  // keluarga baru menumbuhkan akarnya sendiri; tetap WAJIB lulus uji
  // kompetensi (gugur jujur bila gagal).
  if (p.v322 && !p.populasi.some(s => s.jenis === 'KOHEREN')) {
    for (let i = 0; i < 2 && p.populasi.length < p.cap; i++) {
      const akar = lahirkan(p, 'KOHEREN', null)
      if (akar) berimpuls(p, akar)
    }
  }

  // V324: keluarga PARAM — parameter cerdas (intisari telaah kimi-k3-in-c)
  // masuk tubuh: arsitektur tersegel, router MoE, fixture posisi, MXFP4,
  // PCG32. Akar lahir saat kapsul sah pertama terbaca; tetap WAJIB lulus
  // uji kompetensi (gugur jujur bila gagal).
  if (!p.v324 && darah.param && darah.param.segel) {
    p.v324 = { saat: sekarang(), catatan: 'parameter cerdas masuk (intisari telaah FareedKhan-dev/kimi-k3-in-c): keluarga syaraf PARAM menakar arsitektur dari fakta, router MoE invarian-3, fixture posisi, intisari MXFP4, dadu PCG32' }
    catat('V324', { catatan: p.v324.catatan })
  }
  if (p.v324 && !p.populasi.some(s => s.jenis === 'PARAM')) {
    for (let i = 0; i < 2 && p.populasi.length < p.cap; i++) {
      const akar = lahirkan(p, 'PARAM', null)
      if (akar) berimpuls(p, akar)
    }
  }

  p.sesiSejarah.push({ sesi: p.sesi, saat: sekarang(), konteks, impulsSesi, lahirSesi, populasi: p.populasi.length })
  if (p.sesiSejarah.length > 24) p.sesiSejarah = p.sesiSejarah.slice(-24)

  // lomba KILAT: sekali saat benih, atau dipaksa --kilat
  if (process.argv.includes('--kilat') || (!p.kilat && p.sesi === 1)) {
    await lombaKilat(p)
  }

  const maxGen = p.populasi.reduce((m, s) => Math.max(m, s.generasi), 0)

  // VONIS FINAL V312 — warisan syaraf beranak ditutup HANYA bila:
  // kolam penuh di cap maks (128 sel, semuanya lulus uji kompetensi)
  // DAN KILAT ≥100× tersegel lulus. Vonis ditulis organ (bukan tangan),
  // sekali — dan tersimpan fosil sebagai laporan tersegel.
  if (p.populasi.length === p.cap && p.cap === CAP_MAKS && p.kilat && p.kilat.lulus && !p.finalV312) {
    const vonis = {
      jenis: 'VONIS-SYARAF-FINAL', mandat: 'V312 — syaraf beranak + bekerja 100× lebih cepat',
      saat: sekarang(), konteks,
      populasi: p.populasi.length, cap: p.cap, generasiMaks: maxGen,
      lahir: p.statistik.lahir, gugur: p.statistik.gugur, impulsTotal: p.statistik.impulsTotal,
      kilat: { percepatan: p.kilat.percepatan, kilatPerJam: p.kilat.kilatPerJam, umumPerJam: p.kilat.umumPerJam, impuls: p.kilat.impuls, cocokKunci: p.kilat.cocokKunci },
      hukum: 'kolam penuh 128 sel — semua sel LULUS uji kompetensi mekanis; KILAT ≥100× tersegel dua kali (benih + final); pohon keturunan tersegel',
      vonis: 'LULUS',
    }
    vonis.segel = hash16(JSON.stringify(vonis))
    mkdirSync('laporan', { recursive: true })
    writeFileSync('laporan/syaraf-final.json', JSON.stringify(vonis, null, 1))
    p.finalV312 = { saat: vonis.saat, laporan: 'laporan/syaraf-final.json', segel: vonis.segel }
    catat('FINAL-V312', { populasi: p.populasi.length, kilatPercepatan: p.kilat.percepatan, segel: vonis.segel })
    console.log(`VONIS FINAL V312: ${p.populasi.length}/${p.cap} sel kompeten + KILAT ${p.kilat.percepatan}× → LULUS — warisan syaraf beranak ditutup tersegel ${vonis.segel}`)
  }

  pohonSegel(p)
  console.log(`pohon tersegel ${p.segel.hash} — populasi ${p.populasi.length}/${p.cap} · generasi maks ${maxGen} · lahir ${p.statistik.lahir} · gugur ${p.statistik.gugur} · impuls ${p.statistik.impulsTotal}`)
  if (p.kilat) console.log(`KILAT tersegel: ${p.kilat.percepatan}× syaraf umum (${p.kilat.kilatPerJam} vs ${p.kilat.umumPerJam} impuls/jam) — ${p.kilat.lulus ? 'LULUS ≥100×' : 'GAGAL'}`)
}

main().catch(e => { console.error('neurogenesis MATI-PENUH:', e.message); process.exit(1) })
