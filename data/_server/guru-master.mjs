// ============================================================
// GURU-HAKIKI (V303) — organ guru master trader MICAPROFITA
// ============================================================
// Mandat pemilik (2026-10-08): "tingkatkan lagi artificial life kita
// agar hakiki menjadi dengan guru master trader."
//
// Bedah jujur V302: otak sudah menghirup 252 koin & menghitung Hurst,
// tetapi akurasi arah 33% — seorang guru tidak boleh bicara arah
// tanpa bukti historis, tanpa pengukuran risiko, tanpa buku evaluasi.
//
// Enam ruang organ ini (semua dari lilin NYATA Binance publik):
//  1. GELADAK-UJI      : backtest walk-forward — setiap faktor dinilai
//                        dari sampel masa lalu (fee 0,2% putar, horizon 24j)
//  2. MAJELIS-FAKTOR   : bobot lahir dari hit-rate nyata, bukan perasaan;
//                        faktor tanpa bukti (n<12) diberi bobot NOL — jujur
//  3. PERISIKO-MASTER  : stop 1,5×ATR14, target 3×ATR14 (R:R 2,0),
//                        ukuran saran = risiko 1% ekuitas / jarak stop
//  4. BUKU-EVALUASI    : laporan/majelis-ledger.jsonl — vonis disegel lalu
//                        DINILAI PASAR (stop kena dulu = RUGI, target = MENANG)
//  5. PUSTA-FORMULA    : pustaka/formula.json — makhluk menulis formula
//                        ilmunya sendiri bila bukti cukup; tiap denyut SEMUA
//                        formula lama diuji-ulang (gerbang regresi — ilmu
//                        lama tak boleh jadi bodoh); formula tak-hidup TIDUR,
//                        tidak pernah dihapus (kapabilitas tak pernah hilang)
//  6. GURU-PELAJARAN   : pengajaran jujur per denyut, tanpa retorika
//
// Kejujuran struktural: bila lilin gagal dihirup → status GAGAL-HIRUP
// ditulis terbuka, NOL angka karangan. Organ ini TIDAK PERNAH boleh
// mematikan denyut (denyut adalah nyawa) — kegagalan internal diceritakan,
// proses tetap pulang dengan damai.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tandaDi, muatPeta, ajariDariLedger, simpanPeta, tanamWarisan } from './peta-geladak.mjs'
import { doktrinRencana } from './doktrin-perisiko.mjs'   // V357 — perisiko majelis dari tangga doktrin (ultimatum pemilik 10-19)

const FILE_GELADAK = 'laporan/geladak.json'
const FILE_LEDGER = 'laporan/majelis-ledger.jsonl'
const FILE_FORMULA = 'pustaka/formula.json'
const FILE_SASARAN = 'laporan/sasaran-terkini.json'
const FILE_MEJA = 'laporan/musyawarah.json'   // V336 SATU-MUSYAWARAH — satu kebenaran semua organ
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com']
const FEE_PUTAR = 0.002 // 0,2% beli+jual taker — jujur untuk spot alt
const HORIZON = 24 // jam (selaras horizon PENGAMATAN penjaga)
const LANGKAH_UJI = 4
const AMBANG_BUKTI = 12 // sampel minimal sebelum faktor diberi bobot
const AMBANG_VONIS = 0.6 // jumlah bobot minimal agar majelis bicara arah
const KATA = ['NAPAS', 'ARUS', 'GELOMBANG', 'PASANG', 'TANAH', 'BINTANG', 'CAHAYA', 'ILMU']

const bacaJson = (f, c) => { try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : c } catch { return c } }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const segel = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex')
const normalisasi = (s) => { s = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /USDT$/.test(s) ? s : s + 'USDT' }

async function ambil(path) {
  let e2 = null
  for (const host of HOSTS) {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000)
      const r = await fetch(host + path, { cache: 'no-store', signal: c.signal })
      clearTimeout(t)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return await r.json()
    } catch (e) { e2 = e }
  }
  throw e2 || new Error('gerbang gagal')
}
async function lilin(sym, ekstra = '') {
  const d = await ambil(`/api/v3/klines?symbol=${sym}&interval=1h&limit=320${ekstra}`)
  return d.map(k => ({ t: k[0], O: +k[1], H: +k[2], L: +k[3], C: +k[4], V: +k[5] }))
}

// ---------- matematika lilin (murni, tanpa pustaka luar) ----------
function emaArr(v, n) { const k = 2 / (n + 1); const out = []; let e = v[0]; for (let i = 0; i < v.length; i++) { e = i ? v[i] * k + e * (1 - k) : v[0]; out.push(e) } return out }
function rsiArr(c, n = 14) { const out = new Array(c.length).fill(null); let g = 0, l = 0
  for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1]; const up = Math.max(d, 0), dn = Math.max(-d, 0)
    if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l) } }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l) } }
  return out }
function atrArr(H, L, C, n = 14) { const tr = [0]; for (let i = 1; i < C.length; i++) tr.push(Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1])))
  const out = [tr[0]]; for (let i = 1; i < tr.length; i++) { out.push(i < n ? (out[i - 1] * i + tr[i]) / (i + 1) : (out[i - 1] * (n - 1) + tr[i]) / n) } return out }
const rata = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0

// ---------- MAJELIS-FAKTOR: enam suara dari bukti ----------
let PETA = { pelajaran: {}, statistik: { total: 0, warisan: 0, dunia: 0 } } // dimuat di main — otak tempaan di geladak nyata
function faktorDi(i, X) {
  const { C, V, e20, e50, rsi, atr, roc24, volR } = X
  const f = {}
  f.trend = (e20[i] > e50[i] && C[i] > e20[i] && e50[i] > e50[i - 6]) ? 'NAIK'
    : (e20[i] < e50[i] && C[i] < e20[i] && e50[i] < e50[i - 6]) ? 'TURUN' : 'NETRAL'
  f.momen = roc24[i] > 0.015 ? 'NAIK' : roc24[i] < -0.015 ? 'TURUN' : 'NETRAL'
  f.rsi = rsi[i] != null && rsi[i] < 32 ? 'NAIK' : rsi[i] != null && rsi[i] > 68 ? 'TURUN' : 'NETRAL'
  f.volum = volR[i] > 1.4 && roc24[i] < -0.004 ? 'TURUN' : volR[i] > 1.4 && roc24[i] > 0.004 ? 'NAIK' : 'NETRAL'
  const atrPct = atr[i] / C[i]
  const sejarah = atrPctSejarah(X, i)
  const urut = sejarah.filter(x => x != null).sort((a, b) => a - b)
  const pangkat = urut.length ? urut.findIndex(x => x >= atrPct) / urut.length : 0.5
  f.volatil = pangkat > 0.92 ? 'BADAI' : pangkat < 0.15 ? 'TENANG' : 'NORMAL' // penyaring, bukan arah
  // V307 suara PETA: otak tempaan (warisan + dunia) membaca wajah 24 lilin;
  // ikut dinilai walk-forward seperti faktor lain — tanpa edge = bobot NOL
  const td = tandaDi(X, i)
  const pl = td ? PETA.pelajaran[td] : null
  f.peta = pl && pl.arah ? pl.arah : 'NETRAL'
  f._tanda = td || null
  return f
}
function atrPctSejarah(X, i) { const out = []; for (let j = Math.max(1, i - 200); j <= i; j += 2) out.push(X.atr[j] / X.C[j]); return out }

// ---------- GELADAK-UJI: walk-forward, hanya lilin ≤ t ----------
function geladakSimbol(X) {
  const sampel = []
  for (let t = 160; t < X.C.length - HORIZON; t += LANGKAH_UJI) {
    const f = faktorDi(t, X)
    const ret = (X.C[t + HORIZON] - X.C[t]) / X.C[t]
    const { _tanda, ...votes } = f // sidik jari bukan suara — jangan masuk statistik bobot
    sampel.push({ votes, ret })
  }
  return sampel
}
const kena = (vote, ret) => vote === 'NAIK' ? ret > FEE_PUTAR : vote === 'TURUN' ? ret < -FEE_PUTAR : false

// ---------- utama ----------
let MEJA_KET = null   // V336: keterangan kursi dari meja musyawarah bila tersedia
async function main() {
  const kini = new Date().toISOString()
  PETA = muatPeta() // otak tempaan naik ke geladak
  tanamWarisan() // pastikan pelajaran tempaan V306/V307 tertanam (idempoten)
  PETA = muatPeta()
  const sasaran = bacaJson(FILE_SASARAN, null)
  const kursi = (sasaran && (sasaran.sasaranHariIni || [])) || []
  const siklus = (sasaran && sasaran.siklus) || (sasaran && sasaran.pertumbuhan && sasaran.pertumbuhan.siklus) || null

  // 1) pilih kolam geladak: V336 SATU-MUSYAWARAH — kursi majelis kini = VONIS MEJA
  // (koin yang benar-benar dipakai tubuh) + BTC selalu; sasaran resmi menyusul.
  // Guru tidak lagi menetapkan daftarnya sendiri — ia menimbang keputusan meja.
  const himpunan = new Set(['BTCUSDT'])
  try {
    const mj = JSON.parse(readFileSync(FILE_MEJA, 'utf8'))
    const umur = Date.now() - Date.parse(mj.dihasilkan || 0)
    if (mj && mj.protokol === 'SATU-MUSYAWARAH-V336' && Array.isArray(mj.pakem) && umur >= 0 && umur < 45 * 60000) {
      for (const v of mj.pakem.slice(0, 8)) if (v && v.simbol && /^[A-Z0-9]+USDT$/.test(v.simbol)) himpunan.add(v.simbol)
      MEJA_KET = `kursi majelis = vonis meja musyawarah (segel ${mj.segel}, umur ${Math.round(umur / 60000)} mnt) — guru menimbang keputusan yang sama dengan jasad & pasar`
    }
  } catch { /* meja belum ada — kolam lama dipakai, jujur */ }
  for (const k of kursi) { const s = normalisasi(k.simbol); if (/^[A-Z0-9]+USDT$/.test(s)) himpunan.add(s) }
  const simbols = [...himpunan].slice(0, 11)

  // 2) hirup lilin nyata
  const X = {}, gagal = []
  for (const s of simbols) {
    try {
      const bar = await lilin(s)
      if (bar.length < 170) throw new Error('lilin kurang (' + bar.length + ')')
      const C = bar.map(b => b.C), H = bar.map(b => b.H), L = bar.map(b => b.L), V = bar.map(b => b.V)
      const e20 = emaArr(C, 20), e50 = emaArr(C, 50), rsi = rsiArr(C, 14), atr = atrArr(H, L, C, 14)
      const roc24 = C.map((c, i) => i >= 24 ? c / C[i - 24] - 1 : 0)
      const volR = V.map((v, i) => i >= 50 ? rata(V.slice(i - 5, i + 1)) / Math.max(1e-12, rata(V.slice(i - 49, i + 1))) : 1)
      X[s] = { bar, C, H, L, V, e20, e50, rsi, atr, roc24, volR }
    } catch (e) { gagal.push(s + ':' + (e.message || e)) }
  }
  const hidup = Object.keys(X)
  if (!hidup.length) {
    writeFileSync(FILE_GELADAK, JSON.stringify({ protokol: 'GURU-HAKIKI-V303', status: 'GAGAL-HIRUP', dihasilkan: kini, gagal, segel: null }, null, 1))
    console.log('GURU-GAGAL-HIRUP:', gagal.join('; '))
    return
  }

  // 3) GELADAK-UJI — statistik per faktor dari semua sampel semua koin
  const stat = {}
  for (const f of ['trend', 'momen', 'rsi', 'volum', 'peta']) stat[f] = { NAIK: { n: 0, hit: 0 }, TURUN: { n: 0, hit: 0 } }
  let sampelTotal = 0, naiveB = 0, naiveN = 0
  for (const s of hidup) {
    for (const sm of geladakSimbol(X[s])) {
      sampelTotal++
      for (const [f, arah] of Object.entries(sm.votes)) {
        if (f === 'volatil' || f === '_tanda' || arah === 'NETRAL') continue
        if (!stat[f]) stat[f] = { NAIK: { n: 0, hit: 0 }, TURUN: { n: 0, hit: 0 } }
        stat[f][arah].n++; if (kena(arah, sm.ret)) stat[f][arah].hit++
      }
      const naik = ['trend', 'momen', 'rsi', 'volum', 'peta'].filter(f => sm.votes[f] === 'NAIK').length
      const turun = ['trend', 'momen', 'rsi', 'volum', 'peta'].filter(f => sm.votes[f] === 'TURUN').length
      if (naik !== turun) { naiveN++; if (kena(naik > turun ? 'NAIK' : 'TURUN', sm.ret)) naiveB++ }
    }
  }

  // 4) bobot dari bukti — faktor tanpa bukti = bobot NOL (jujur)
  const bobot = {}
  for (const [f, d] of Object.entries(stat)) {
    bobot[f] = {}
    for (const arah of ['NAIK', 'TURUN']) {
      const { n, hit } = d[arah]
      const bukti = n >= AMBANG_BUKTI
      const edge = n ? hit / n - 0.5 : -0.5
      // V303 jahitan kejujuran: bobot positif HANYA bila edge nyata (hit>50%);
      // faktor anti-edge (hit<50%) diberi NOL suara — guru bukan penjudi.
      bobot[f][arah] = { n, hitPct: n ? +(100 * hit / n).toFixed(1) : null, w: (bukti && edge > 0) ? +clamp(edge * 2.4, 0.06, 1).toFixed(3) : 0, bukti, edge: +edge.toFixed(3) }
    }
  }
  const maxSum = ['trend', 'momen', 'rsi', 'volum', 'peta'].reduce((a, f) => a + Math.max(bobot[f] ? bobot[f].NAIK.w : 0, bobot[f] ? bobot[f].TURUN.w : 0), 0)

  // 5) MAJELIS bicara kini — vonis + PERISIKO-MASTER
  const majelis = []
  const arahPenjaga = (k) => ({ BUY: 'NAIK', SELL: 'TURUN' }[k.arah] || k.arah || null)
  for (const k of kursi) {
    const s = normalisasi(k.simbol)
    if (!X[s]) continue
    const i = X[s].C.length - 1
    const v = faktorDi(i, X[s])
    let sumNaik = 0, sumTurun = 0
    const bukti = []
    for (const f of ['trend', 'momen', 'rsi', 'volum', 'peta']) {
      const a = v[f]; if (a === 'NETRAL' || !bobot[f]) continue
      const b = bobot[f][a]; sumNaik += a === 'NAIK' ? b.w : 0; sumTurun += a === 'TURUN' ? b.w : 0
      bukti.push({ f, arah: a, w: b.w, hitPct: b.hitPct, n: b.n, bukti: b.bukti })
    }
    const sum = sumNaik - sumTurun
    const badai = v.volatil === 'BADAI'
    // V336: vonis majelis = NAIK/TURUN/MENGUKUR-ULANG — state 'TUNGGU' dihapus dari
    // seluruh buku guru (hukum pemilik: label tunggu = layak diambil = bodoh)
    const arah = badai ? 'MENGUKUR-ULANG' : (sum >= AMBANG_VONIS ? 'NAIK' : sum <= -AMBANG_VONIS ? 'TURUN' : 'MENGUKUR-ULANG')
    const keyakinan = arah === 'MENGUKUR-ULANG' ? 0 : Math.round(clamp(50 + 50 * Math.abs(sum) / Math.max(0.01, maxSum), 35, 92))
    const entry = X[s].C[i], a14 = X[s].atr[i]
    // V357 PERISIKO-DOKTRIN (ultimatum pemilik 10-19: "SL/TP ±1% itu pengecut —
    // koin gak naik +1 turun -1"): stop/target dari TANGGA doktrin (H24/L24 24
    // lilin tertutup → R1→R2→H24+0,618R→H24+1,0R; stop = pembatal ∓0,5×ATR14).
    // Fallback ATR-jam lama bila lilin tak cukup — jujur ditandai di sumber.
    const dokG = arah !== 'MENGUKUR-ULANG'
      ? doktrinRencana(X[s].bar, arah === 'NAIK' ? 'BUY' : 'SELL', entry, FEE_PUTAR * 100)
      : null
    const dokLayak = !!(dokG && dokG.layak && dokG.target != null && dokG.stop != null)
    const stopPct = dokLayak ? +(100 * dokG.stopDist / entry).toFixed(2) : +(100 * 1.5 * a14 / entry).toFixed(2)
    const majelisSeat = {
      simbol: s, jalurPenjaga: k.jalur || k.jalurPenjaga || null, arahPenjaga: arahPenjaga(k),
      arah, keyakinan, sum: +sum.toFixed(3), badai, tanda: v._tanda || null,
      entry, stop: arah === 'NAIK' ? (dokLayak ? +dokG.stop.toFixed(8) : +(entry - 1.5 * a14).toFixed(8)) : arah === 'TURUN' ? (dokLayak ? +dokG.stop.toFixed(8) : +(entry + 1.5 * a14).toFixed(8)) : null,
      target: arah === 'NAIK' ? (dokLayak ? +dokG.target.toFixed(8) : +(entry + 3 * a14).toFixed(8)) : arah === 'TURUN' ? (dokLayak ? +dokG.target.toFixed(8) : +(entry - 3 * a14).toFixed(8)) : null,
      rr: arah === 'MENGUKUR-ULANG' ? null : (dokLayak ? +dokG.rrKotor.toFixed(2) : 2.0), stopPct,
      sumberPerisiko: dokLayak ? ('doktrin-tangga · ' + (dokG.anak || 'lantai-napas')) : 'atr-jam-lama',
      napas7hPct: dokG && dokG.napas ? +dokG.napas.rentangHarianPct.toFixed(2) : null,
      ukuranSaranPct: arah === 'MENGUKUR-ULANG' ? 0 : +clamp(100 / Math.max(0.5, stopPct), 2, 100).toFixed(1),
      rezimVol: v.volatil, sepakat: arah !== 'MENGUKUR-ULANG' && arahPenjaga(k) === arah,
      bukti
    }
    majelis.push(majelisSeat)
  }

  // 6) BUKU-EVALUASI — vonis lama dinilai pasar (stop kena dulu = RUGI, konservatif)
  let ledger = []
  try {
    if (existsSync(FILE_LEDGER)) ledger = readFileSync(FILE_LEDGER, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  } catch { ledger = [] }
  for (const m of majelis) {
    if (m.arah === 'MENGUKUR-ULANG') continue
    ledger.push({ at: kini, siklus, simbol: m.simbol, arah: m.arah, entry: m.entry, stop: m.stop, target: m.target, keyakinan: m.keyakinan, tanda: m.tanda || null, status: 'terbuka' })
  }
  if (ledger.length > 400) ledger = ledger.slice(-400)
  const terbuka = ledger.filter(l => l.status === 'terbuka')
  for (const l of terbuka) {
    try {
      const bar = await lilin(l.simbol, '&startTime=' + (Date.parse(l.at) + 60000))
      const umurJam = bar.length
      let hasil = null, ret = null
      for (const b of bar) {
        const kenaStop = l.arah === 'NAIK' ? b.L <= l.stop : b.H >= l.stop
        const kenaTarget = l.arah === 'NAIK' ? b.H >= l.target : b.L <= l.target
        if (kenaStop) { hasil = 'RUGI'; break } // konservatif: dalam lilin sama, stop dianggap kena dulu
        if (kenaTarget) { hasil = 'MENANG'; break }
      }
      if (!hasil && umurJam >= 48) {
        const akhir = bar.length ? bar[bar.length - 1].C : null
        ret = akhir != null ? (akhir - l.entry) / l.entry : null
        hasil = ret == null ? 'KEDALUWARSA' : (l.arah === 'NAIK' ? ret > FEE_PUTAR : ret < -FEE_PUTAR) ? 'BENAR' : 'SALAH'
      }
      if (hasil) { l.status = 'dinilai'; l.hasil = hasil; l.dinilaiAt = kini; l.ret = ret == null ? null : +(ret * 100).toFixed(2) }
    } catch { /* gagal ambil — tetap terbuka, jujur; denyut berikutnya menilai lagi */ }
  }

  // 6b) PETA DUNIA — vonis yang DINILAI PASAR jadi pelajaran baru (belajar dari kekalahan nyata)
  const ajaranDunia = ajariDariLedger(ledger, X)
  if (ajaranDunia.diajari > 0) simpanPeta(ajaranDunia.buku)
  PETA = muatPeta() // segarkan setelah dunia mengajar

  // 7) PUSTA-FORMULA — ilmu yang ditulis makhluk sendiri + gerbang regresi
  const bukuF = bacaJson(FILE_FORMULA, { protokol: 'PUSTA-FORMULA-V303', daftar: [] })
  const sampelSemua = []
  for (const s of hidup) for (const sm of geladakSimbol(X[s])) sampelSemua.push(sm)
  const ujiSyarat = (syarat) => { let n = 0, hit = 0
    for (const sm of sampelSemua) {
      if (syarat.every(sy => sm.votes[sy.f] === sy.arah)) { n++; if (kena(syarat[0].arah, sm.ret)) hit++ }
    } return { n, hit } }
  const kunciSyarat = (sy) => sy.map(s => s.f + '=' + s.arah).join('+')
  const ada = new Set(bukuF.daftar.map(f => kunciSyarat(f.syarat)))
  const baru = []
  const FS = ['trend', 'momen', 'rsi', 'volum', 'peta']
  luar: for (let a = 0; a < FS.length; a++) for (let b = a + 1; b < FS.length; b++) for (const arah of ['NAIK', 'TURUN']) {
    const sy = [{ f: FS[a], arah }, { f: FS[b], arah }]
    const { n, hit } = ujiSyarat(sy)
    if (n >= 25 && hit / n >= 0.60 && !ada.has(kunciSyarat(sy))) {
      const id = 'F' + String(bukuF.daftar.length + 1).padStart(3, '0')
      const nama = 'FORMULA-' + KATA[bukuF.daftar.length % KATA.length] + '-' + id.slice(1)
      bukuF.daftar.push({ id, nama, syarat: sy, teks: `JIKA ${FS[a]}=${arah} DAN ${FS[b]}=${arah} MAKA kecenderungan ${arah} (geladak: hit ${(100 * hit / n).toFixed(1)}% dari n=${n}, fee ${FEE_PUTAR * 100}%)`,
        lahir: kini, lahirSiklus: siklus, n, hit, edge: +(hit / n - 0.5).toFixed(3), ujiTerakhir: { at: kini, n, hitPct: +(100 * hit / n).toFixed(1), edge: +(hit / n - 0.5).toFixed(3), masihHidup: true } })
      baru.push(nama); ada.add(kunciSyarat(sy))
      if (baru.length >= 5) break luar
    }
  }
  let hidupF = 0
  for (const f of bukuF.daftar) {
    const u = ujiSyarat(f.syarat)
    const edge = u.n ? +(u.hit / u.n - 0.5).toFixed(3) : null
    f.ujiTerakhir = { at: kini, n: u.n, hitPct: u.n ? +(100 * u.hit / u.n).toFixed(1) : null, edge, masihHidup: u.n < 10 ? 'menunggu-bukti' : edge > 0 }
    if (f.ujiTerakhir.masihHidup === true) hidupF++
  }
  mkdirSync('pustaka', { recursive: true })
  bukuF.protokol = 'PUSTA-FORMULA-V303'; bukuF.diperbarui = kini
  bukuF.gerbangRegresi = { diuji: bukuF.daftar.length, hidup: hidupF, tidur: bukuF.daftar.filter(f => f.ujiTerakhir.masihHidup === false).length, catatan: 'formula TIDUR tidak dihapus — kapabilitas tak pernah hilang; ia menunggu bukti baru' }
  bukuF.segel = segel({ d: bukuF.daftar.map(f => [f.id, f.syarat, f.lahir]) })
  writeFileSync(FILE_FORMULA, JSON.stringify(bukuF, null, 1))

  // 8) rapor & pengajaran jujur
  const dinilai = ledger.filter(l => l.status === 'dinilai')
  const menang = dinilai.filter(l => l.hasil === 'MENANG' || l.hasil === 'BENAR').length
  const rugi = dinilai.filter(l => l.hasil === 'RUGI' || l.hasil === 'SALAH').length
  const rRata = (() => { const rr = dinilai.filter(l => l.hasil === 'MENANG' || l.hasil === 'RUGI')
    return rr.length ? +((2 * rr.filter(l => l.hasil === 'MENANG').length - rr.filter(l => l.hasil === 'RUGI').length) / rr.length).toFixed(2) : null })()
  const akTimbang = (() => { let b = 0, n = 0
    for (const s of hidup) for (const sm of geladakSimbol(X[s])) {
      let sn = 0, st = 0
      for (const [f, arah] of Object.entries(sm.votes)) { if (f === 'volatil' || arah === 'NETRAL') continue; if (arah === 'NAIK') sn += bobot[f].NAIK.w; else st += bobot[f].TURUN.w }
      if (sn === st) continue; n++; if (kena(sn > st ? 'NAIK' : 'TURUN', sm.ret)) b++
    } return n ? +(100 * b / n).toFixed(1) : null })()
  const pelajaran = [
    `GELADAK: akurasi tertimbang ${akTimbang ?? '—'}% dari ${sampelTotal} sampel walk-forward (fee ${FEE_PUTAR * 100}% putar, horizon ${HORIZON}j) — angka geladak bukan janji; buku-evaluasi nyata yang menghakimi (${menang}W/${rugi}L).`,
    akTimbang != null && akTimbang < 50
      ? `geladak di bawah 50% pada jendela ini — faktor belum punya edge di rezim sekarang; guru MENIMBANG ULANG tanpa vonis (kursi kembali ke meja musyawarah), bukan memaksa vonis. Inilah beda master dan penjudi.`
      : `geladak di atas 50% pada jendela ini — edge ada, tetapi tetap hanya vonis dengan bukti & perisiko yang bicara.`,
    maxSum > 0 ? `bobot faktor lahir dari hit-rate nyata; tanpa edge (hit≤50%) atau n<${AMBANG_BUKTI} = bobot NOL — bukti dulu, bicara kemudian.` : 'belum ada faktor berbukti (n<' + AMBANG_BUKTI + ' semua) — guru menimbang ulang tanpa vonis; kehati-hatian adalah ilmu.',
    `V336 SATU-MUSYAWARAH: ${MEJA_KET || 'meja musyawarah belum segar — kolam kursi lama dipakai bangun ini (jujur)'}; vonis majelis kini: ${majelis.filter(m => m.arah === 'NAIK').length} NAIK / ${majelis.filter(m => m.arah === 'TURUN').length} TURUN / ${majelis.filter(m => m.arah === 'MENGUKUR-ULANG').length} menimbang-ulang (kembali ke meja) — ${majelis.filter(m => m.sepakat).length} sepakat dengan penjaga; ${bukuF.daftar.length} formula tersimpan (${hidupF} hidup, gerbang regresi menyala).`
  ]

  const keluar = {
    protokol: 'GURU-HAKIKI-V303', status: 'HIDUP', dihasilkan: kini, siklus,
    sumber: 'lilin 1h Binance publik — geladak-uji walk-forward, nol kunci, nol karangan',
    data: { simbol: hidup.map(s => ({ sym: s, bars: X[s].C.length, dari: new Date(X[s].bar[0].t).toISOString(), ke: new Date(X[s].bar[X[s].bar.length - 1].t).toISOString() })), gagalAmbil: gagal },
    model: { feePutarPct: FEE_PUTAR * 100, horizonJam: HORIZON, langkahUji: LANGKAH_UJI, ambangBukti: AMBANG_BUKTI, ambangVonis: AMBANG_VONIS },
    faktorStat: stat, bobot, maxSum: +maxSum.toFixed(3),
    backtest: { sampel: sampelTotal, akurasiMentahPct: naiveN ? +(100 * naiveB / naiveN).toFixed(1) : null, akurasiTimbangPct: akTimbang, catatan: 'bobot diturunkan dari sampel yang sama — uji tak-bias sejati adalah buku-evaluasi' },
    majelis, rapor: { menang, rugi, terbuka: terbuka.filter(l => l.status === 'terbuka').length, winRatePct: (menang + rugi) ? +(100 * menang / (menang + rugi)).toFixed(1) : null, rRata, catatan: 'MENANG/BENAR vs RUGI/SALAH dari ledger nyata; R:R 2,0 → MENANG +2R, RUGI −1R' },
    formula: { jumlah: bukuF.daftar.length, hidup: hidupF, baru, berkas: 'pustaka/formula.json' },
    petaGeladak: { berkas: 'laporan/peta-geladak.json', statistik: PETA.statistik,
      faktorPeta: { n: stat.peta ? stat.peta.NAIK.n + stat.peta.TURUN.n : 0,
        hitPctPct: stat.peta ? +(((stat.peta.NAIK.hit + stat.peta.TURUN.hit) / Math.max(1, stat.peta.NAIK.n + stat.peta.TURUN.n)) * 100).toFixed(1) : null,
        bobotNaik: bobot.peta ? bobot.peta.NAIK.w : 0, bobotTurun: bobot.peta ? bobot.peta.TURUN.w : 0 },
      pelajaranDuniaBaru: ajaranDunia.diajari,
      catatan: 'otak tempaan (warisan+dunia) jadi suara kelima majelis; dinilai walk-forward seperti faktor lain — tanpa edge = bobot NOL; tiap vonis yang dinilai pasar mengajari peta' },
    pelajaran,
    segel: null
  }
  keluar.segel = { hash: segel({ t: keluar.dihasilkan, m: keluar.majelis, b: keluar.backtest, r: keluar.rapor }) }
  writeFileSync(FILE_GELADAK, JSON.stringify(keluar, null, 1))

  // ledger ditulis SETELAH evaluasi (status terbaru)
  writeFileSync(FILE_LEDGER, ledger.map(l => JSON.stringify(l)).join('\n') + '\n')
  console.log(`GURU-HAKIKI OK: geladak ${akTimbang ?? '?'}% (n=${sampelTotal}) · majelis ${majelis.length} kursi · ledger ${menang}W/${rugi}L/${terbuka.filter(l => l.status === 'terbuka').length} terbuka · formula ${bukuF.daftar.length} (${hidupF} hidup, +${baru.length} baru) · peta ${PETA.statistik.total} jejak (dunia ${PETA.statistik.dunia}, +${ajaranDunia.diajari} baru)`)
}

main().catch(e => { console.error('GURU-GAGAL (denyut tetap hidup):', e && e.message ? e.message : e); process.exit(0) })
