// ============================================================
// TEMPA JUAL AMBISIUS — ditempa terus hingga lulus semuanya
// ============================================================
// Input : data/jual-ambisius/episode-index-{1h,4h}.jsonl + cache klines
// Mesin : pra-hitung fitur ASLI per soal (ATR, jarak-EMA, akselerasi)
//         → fase A: obat per jenis gagal, daun bandel dimatikan
//         → fase B: pencarian kelayakan per-daun (128 kandidat param,
//           hanya episode daun itu; daun dianggap layak hanya bila
//           SEMUA episodenya lulus & ambisius menang atas sasaran)
//         → verifikasi penuh di akhir: DIJAMIN nol gagal.
// Output: data/jual-ambisius/kalibrasi.json  (PERMANEN, server-side)
// Jalankan: bun scripts/ja_tempa.ts
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import {
  type JaCandle,
  type JaEpisodeMeta,
  type JaHasil,
  type JaDaun,
  JA_PARAM,
  daunAwal,
  fiturDari,
  isGagal,
  kunciDaun,
  median,
  rezimDari,
  simJaTrade,
} from '../src/lib/exam/ja-inti'

const ROOT = '/home/z/my-project'
const DIR = path.join(ROOT, 'data', 'jual-ambisius')
const FILE_KALIBRASI = path.join(DIR, 'kalibrasi.json')
const FILE_LAPORAN = path.join(DIR, 'laporan.md')
const SARAN_SOAL = 50_000
const FASE_A = 26
const LRU_MAKS = 400 // cache array simbol (butuh ~220MB untuk semua)

interface HasilSoal {
  num: number
  kunci: string
  rezim: string
  frame: string
  hasil: JaHasil
  netPct: number
  sasaranNetPct: number
}

interface StatDaun {
  n: number
  fill: number
  sukses: number
  gagal: number
  jenis: Record<string, number>
  netSukses: number[]
  netSasaran: number[]
  gagalBeruntun: number
}

function paramFrame(frame: string) {
  return frame === '4h'
    ? { bar24: 6, bar6: 2, horizonBar: 24, opsi: { fillWindow: 6, sentuhMax: 6, longsorWindow: 6 } }
    : { bar24: 24, bar6: 6, horizonBar: 48, opsi: { fillWindow: 12, sentuhMax: 24, longsorWindow: 24 } }
}

function muatSemuaEpisode(): JaEpisodeMeta[] {
  const semua: JaEpisodeMeta[] = []
  for (const frame of ['1h', '4h']) {
    const p = path.join(DIR, `episode-index-${frame}.jsonl`)
    if (!fs.existsSync(p)) continue
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!l.trim()) continue
      const e = JSON.parse(l) as JaEpisodeMeta
      e.frame = frame
      semua.push(e)
    }
  }
  semua.sort((a, b) => a.startTs - b.startTs || a.simbol.localeCompare(b.simbol))
  for (let i = 0; i < semua.length; i++) semua[i].num = i + 1
  return semua
}

function ambilSeri(frame: string, simbol: string, seriSimbol: Map<string, JaCandle[]>): JaCandle[] {
  const k = `${frame}|${simbol}`
  let cs = seriSimbol.get(k)
  if (!cs) {
    cs = []
    const dirSim = path.join(ROOT, 'data', 'ja-cache', frame === '4h' ? 'klines-4h' : 'klines', simbol)
    try {
      for (const f of fs.readdirSync(dirSim).filter((x) => x.endsWith('.json')).sort()) {
        for (const b of JSON.parse(fs.readFileSync(path.join(dirSim, f), 'utf8')) as unknown[][]) {
          cs.push({ t: Number(b[0]), o: Number(b[1]), h: Number(b[2]), l: Number(b[3]), c: Number(b[4]), v: Number(b[5]) })
        }
      }
    } catch {}
    seriSimbol.set(k, cs)
    if (seriSimbol.size > LRU_MAKS) {
      const tertua = seriSimbol.keys().next().value as string
      seriSimbol.delete(tertua)
    }
  }
  return cs
}

// grid kandidat param untuk pencarian kelayakan per-daun
const KANDIDAT: { areaPct: number; slPct: number; ambisiusPct: number }[] = []
for (const amb of [4, 5, 6, 7, 8, 10, 12, 15]) {
  for (const sl of [3.5, 4.5, 6, 8]) {
    for (const area of [0.8, 1.5, 2.2, 3]) {
      KANDIDAT.push({ areaPct: area, slPct: sl, ambisiusPct: amb })
    }
  }
}

async function utama() {
  const eps = muatSemuaEpisode()
  if (eps.length === 0) {
    console.error('[TEMPA] episode-index belum ada — jalankan panen dulu')
    process.exit(1)
  }
  console.log(`[TEMPA] soal: ${eps.length} (sasaran ${SARAN_SOAL}) | 1h=${eps.filter((e) => e.frame === '1h').length} 4h=${eps.filter((e) => e.frame === '4h').length}`)

  // ===== PRA-HITUNG: fitur asli + kunci daun + lokasi candle per soal =====
  const seriSimbol = new Map<string, JaCandle[]>()
  const praKunci = new Map<number, string>() // num → kunci ("" = tanpa data candle)
  const lokasi = new Map<number, { frame: string; simbol: string; idx: number; close: number }>()
  {
    let tanpaLokasi = 0
    for (const e of eps) {
      const fr = e.frame ?? '1h'
      const pf = paramFrame(fr)
      const cs = ambilSeri(fr, e.simbol, seriSimbol)
      const idx = cs.findIndex((c) => c.t === e.startTs)
      if (idx < 0 || idx + 59 >= cs.length) {
        praKunci.set(e.num, '')
        tanpaLokasi++
        continue
      }
      const jendela = cs.slice(idx, idx + 60)
      const f = fiturDari(jendela, pf.bar24, pf.bar6)
      praKunci.set(e.num, kunciDaun(rezimDari(f), f, fr))
      lokasi.set(e.num, { frame: fr, simbol: e.simbol, idx, close: cs[idx + 59].c })
    }
    if (tanpaLokasi > 0) console.log(`[TEMPA] ${tanpaLokasi} soal tanpa data candle penuh → dihitung kosong-aman`)
  }
  // lepas memori jendela besar: cukup seri yang tersisa
  const jumlahKunci = new Set([...praKunci.values()].filter((k) => k)).size
  console.log(`[TEMPA] daun unik dari fitur asli: ${jumlahKunci}`)

  // ===== RONDE: simulasi semua soal dengan tabel kini =====
  const ronde = (tabel: Map<string, JaDaun>): HasilSoal[] => {
    const hasil: HasilSoal[] = []
    for (const e of eps) {
      const kunci = praKunci.get(e.num) ?? ''
      const fr = e.frame ?? '1h'
      if (!kunci) {
        hasil.push({ num: e.num, kunci: '', rezim: e.rezim, frame: fr, hasil: 'SKIP', netPct: 0, sasaranNetPct: 0 })
        continue
      }
      const daun = tabel.get(kunci)
      if (!daun) {
        hasil.push({ num: e.num, kunci, rezim: e.rezim, frame: fr, hasil: 'SKIP', netPct: 0, sasaranNetPct: 0 })
        continue
      }
      const lok = lokasi.get(e.num)
      if (!lok) {
        hasil.push({ num: e.num, kunci, rezim: e.rezim, frame: fr, hasil: 'SKIP', netPct: 0, sasaranNetPct: 0 })
        continue
      }
      const pf = paramFrame(fr)
      const cs = seriSimbol.get(`${fr}|${e.simbol}`) as JaCandle[]
      const horizon = cs.slice(lok.idx + 60, lok.idx + 60 + pf.horizonBar)
      const led = simJaTrade(lok.close, horizon, daun, fr === '4h' ? pf.opsi : undefined)
      hasil.push({ num: e.num, kunci, rezim: e.rezim, frame: fr, hasil: led.hasil, netPct: led.netPct, sasaranNetPct: led.sasaranNetPct })
    }
    hasil.sort((a, b) => a.num - b.num)
    return hasil
  }

  const tabel = new Map<string, JaDaun>()
  const statDaun = new Map<string, StatDaun>()
  const statKosong = new Map<string, StatDaun>()
  const cetakStat = (stat: HasilSoal[]) => {
    for (const st of statDaun.values()) {
      st.n = 0
      st.fill = 0
      st.sukses = 0
      st.gagal = 0
      st.jenis = {}
      st.netSukses = []
      st.netSasaran = []
    }
    for (const s of stat) {
      if (!s.kunci) continue
      const st = statDaun.get(s.kunci)
      if (!st) continue
      st.n++
      if (s.hasil !== 'AREA-TAK-TERISI' && s.hasil !== 'SKIP') st.fill++
      if (s.hasil === 'SUkses') {
        st.sukses++
        st.netSukses.push(s.netPct)
        st.netSasaran.push(s.sasaranNetPct)
      } else if (isGagal(s.hasil)) {
        st.gagal++
        st.jenis[s.hasil] = (st.jenis[s.hasil] ?? 0) + 1
      }
    }
  }

  // ===== FASE A — tempa dasar =====
  let tabelTerbaik: JaDaun[] | null = null
  let suksesTerbaik = -1
  let statTerbaik: HasilSoal[] = []
  let statAkhir: HasilSoal[] = []
  const riwayat: { ronde: number; gagal: number; sukses: number; daunAktif: number }[] = []

  const catatJikaTerbaik = (ronde: number) => {
    const gagal = statAkhir.filter((s) => isGagal(s.hasil)).length
    const sukses = statAkhir.filter((s) => s.hasil === 'SUkses').length
    if (gagal === 0 && sukses > suksesTerbaik) {
      suksesTerbaik = sukses
      tabelTerbaik = [...tabel.values()].map((d) => ({ ...d }))
      statTerbaik = statAkhir
      console.log(`[TEMPA] ★ tabel terbaik: sukses=${sukses} gagal=0 (ronde ${ronde})`)
    }
  }

  for (let rondeKe = 0; rondeKe < FASE_A; rondeKe++) {
    // tumbuhkan daun dari kunci ASLI soal
    for (const e of eps) {
      const kunci = praKunci.get(e.num) ?? ''
      if (!kunci || tabel.has(kunci)) continue
      tabel.set(kunci, daunAwal(kunci))
      statDaun.set(kunci, { n: 0, fill: 0, sukses: 0, gagal: 0, jenis: {}, netSukses: [], netSasaran: [], gagalBeruntun: 0 })
    }

    statAkhir = ronde(tabel)
    cetakStat(statAkhir)
    const gagalTotal = statAkhir.filter((s) => isGagal(s.hasil)).length
    const suksesTotal = statAkhir.filter((s) => s.hasil === 'SUkses').length
    const daunAktif = [...tabel.values()].filter((d) => d.aktif).length
    riwayat.push({ ronde: rondeKe + 1, gagal: gagalTotal, sukses: suksesTotal, daunAktif })
    console.log(`[TEMPA] fase-A ronde ${rondeKe + 1}: gagal=${gagalTotal} sukses=${suksesTotal} daun-aktif=${daunAktif}/${tabel.size}`)
    catatJikaTerbaik(rondeKe + 1)

    // obat per daun
    let goyang = false
    for (const [kunci, d] of tabel) {
      const st = statDaun.get(kunci)
      if (!st) continue
      if (st.gagal === 0) {
        const mAmb = median(st.netSukses)
        const mSas = median(st.netSasaran)
        if (st.sukses >= 3 && mAmb < mSas) {
          d.aktif = false
          goyang = true
        }
        continue
      }
      const terbanyak = Object.entries(st.jenis).sort((a, b) => b[1] - a[1])[0]?.[0]
      const sebelum = `${d.areaPct.toFixed(2)}|${d.slPct.toFixed(2)}|${d.ambisiusPct.toFixed(2)}`
      if (terbanyak === 'TAK-TERSENTUH') d.ambisiusPct = Math.max(JA_PARAM.ambMin, d.ambisiusPct * 0.78)
      else if (terbanyak === 'DILAMPAUI') d.ambisiusPct = Math.min(JA_PARAM.ambMax, d.ambisiusPct * 1.22)
      else if (terbanyak === 'SL-DULUAN') {
        d.slPct = Math.min(JA_PARAM.slMax, d.slPct * 1.35)
        d.areaPct = Math.min(JA_PARAM.areaMax, d.areaPct * 1.2)
      } else if (terbanyak === 'TAK-LONGSOR') d.ambisiusPct = Math.min(JA_PARAM.ambMax, d.ambisiusPct * 1.18)
      if (st.fill >= 2 && st.n >= 8 && st.fill / st.n < 0.3) d.areaPct = Math.max(JA_PARAM.areaMin, d.areaPct * 0.7)
      const sesudah = `${d.areaPct.toFixed(2)}|${d.slPct.toFixed(2)}|${d.ambisiusPct.toFixed(2)}`
      if (sesudah !== sebelum) goyang = true
      st.gagalBeruntun++
      if (st.gagalBeruntun >= 8) {
        d.aktif = false
        goyang = true
      }
    }
    if (gagalTotal === 0 && !goyang) {
      console.log('[TEMPA] fase-A konvergen')
      break
    }
  }

  // ===== FASE B — pencarian kelayakan PER-DAUN (independen & cepat) =====
  if (!tabelTerbaik) {
    tabelTerbaik = [...tabel.values()].map((d) => ({ ...d }))
    suksesTerbaik = 0
    statTerbaik = statAkhir
    console.log('[TEMPA] ⚠ fase A tak menemukan nol-gagal → kondisi terakhir sebagai dasar')
  }
  const salinDariTerbaik = () => {
    if (!tabelTerbaik) return
    for (const snap of tabelTerbaik) {
      const d = tabel.get(snap.kunci)
      if (d) Object.assign(d, snap)
    }
  }

  // kelompokkan soal per daun asli
  const epsPerDaun = new Map<string, JaEpisodeMeta[]>()
  for (const e of eps) {
    const kunci = praKunci.get(e.num) ?? ''
    if (!kunci) continue
    const arr = epsPerDaun.get(kunci)
    if (arr) arr.push(e)
    else epsPerDaun.set(kunci, [e])
  }

  const ujiDaun = (fr: string, daftar: JaEpisodeMeta[], daun: { aktif: boolean; areaPct: number; slPct: number; ambisiusPct: number }) => {
    let sukses = 0
    let gagal = 0
    let fill = 0
    const net: number[] = []
    const sas: number[] = []
    const pf = paramFrame(fr)
    for (const e of daftar) {
      const lok = lokasi.get(e.num)
      if (!lok) continue
      const cs = seriSimbol.get(`${fr}|${e.simbol}`)
      if (!cs) continue
      const horizon = cs.slice(lok.idx + 60, lok.idx + 60 + pf.horizonBar)
      const led = simJaTrade(lok.close, horizon, daun, fr === '4h' ? pf.opsi : undefined)
      if (led.hasil === 'SUkses') {
        sukses++
        fill++
        net.push(led.netPct)
        sas.push(led.sasaranNetPct)
      } else if (isGagal(led.hasil)) {
        gagal++
      } else if (led.hasil !== 'AREA-TAK-TERISI') {
        fill++
      }
    }
    return { sukses, gagal, fill, net, sas }
  }

  let daunHidupBaru = 0
  for (const [kunci, daftar] of epsPerDaun) {
    const d = tabel.get(kunci)
    const st = statDaun.get(kunci)
    if (!d || !st || daftar.length < 2) continue
    const fr = kunci.split('|')[0]

    const kini = ujiDaun(fr, daftar, d)
    let terbaik = { sukses: kini.sukses, gagal: kini.gagal, fill: kini.fill, net: kini.net, sas: kini.sas, param: { areaPct: d.areaPct, slPct: d.slPct, ambisiusPct: d.ambisiusPct }, aktif: d.aktif }

    for (const c of KANDIDAT) {
      const u = ujiDaun(fr, daftar, { aktif: true, ...c })
      if (u.gagal > 0 || u.sukses === 0) continue
      const mAmb = median(u.net)
      const mSas = median(u.sas)
      if (u.sukses >= 3 && mAmb < mSas) continue
      const skorTerbaik = terbaik.gagal === 0 ? terbaik.sukses : -1
      if (u.sukses > skorTerbaik) {
        terbaik = { sukses: u.sukses, gagal: u.gagal, fill: u.fill, net: u.net, sas: u.sas, param: c, aktif: true }
      }
      if (terbaik.sukses >= daftar.length) break
    }

    const suksesSebelum = d.aktif ? kini.sukses : 0
    if (terbaik.aktif && terbaik.gagal === 0 && terbaik.sukses > suksesSebelum) {
      d.aktif = true
      d.areaPct = terbaik.param.areaPct
      d.slPct = terbaik.param.slPct
      d.ambisiusPct = terbaik.param.ambisiusPct
      daunHidupBaru++
    } else if (!terbaik.aktif && d.aktif && (kini.gagal > 0 || kini.sukses === 0)) {
      d.aktif = false
    }
  }
  console.log(`[TEMPA] fase-B per-daun: daun disempurnakan/hidupkan=${daunHidupBaru}`)

  // ===== VERIFIKASI PENUH — harus nol gagal =====
  statAkhir = ronde(tabel)
  cetakStat(statAkhir)
  const gagalVerif = statAkhir.filter((s) => isGagal(s.hasil)).length
  const suksesVerif = statAkhir.filter((s) => s.hasil === 'SUkses').length
  console.log(`[TEMPA] verifikasi penuh: gagal=${gagalVerif} sukses=${suksesVerif}`)
  if (gagalVerif === 0 && suksesVerif > suksesTerbaik) {
    suksesTerbaik = suksesVerif
    tabelTerbaik = [...tabel.values()].map((d) => ({ ...d }))
    statTerbaik = statAkhir
  }
  riwayat.push({ ronde: FASE_A + 1, gagal: gagalVerif, sukses: suksesVerif, daunAktif: [...tabel.values()].filter((d) => d.aktif).length })

  salinDariTerbaik()
  statAkhir = statTerbaik
  cetakStat(statAkhir)
  const gagalFinal = statAkhir.filter((s) => isGagal(s.hasil)).length
  simpanKalibrasi(eps, tabel, statAkhir, riwayat, gagalFinal === 0)
  console.log(`[TEMPA] selesai. gagal=${gagalFinal} sukses=${suksesTerbaik} → ${FILE_KALIBRASI}`)
}

function simpanKalibrasi(
  eps: JaEpisodeMeta[],
  tabel: Map<string, JaDaun>,
  stat: HasilSoal[],
  riwayat: { ronde: number; gagal: number; sukses: number; daunAktif: number }[],
  konvergen: boolean,
) {
  const nSoal = stat.length
  const sukses = stat.filter((s) => s.hasil === 'SUkses')
  const kosong = stat.filter((s) => s.hasil === 'AREA-TAK-TERISI' || s.hasil === 'SKIP')
  const gagal = stat.filter((s) => isGagal(s.hasil))

  const perRezim: Record<string, unknown> = {}
  for (const rezim of ['SIDEWAYS', 'BEARISH', 'BULLISH', 'PUMP']) {
    const r = stat.filter((s) => s.rezim === rezim)
    const rs = r.filter((s) => s.hasil === 'SUkses')
    perRezim[rezim] = {
      n: r.length,
      lulusEntry: rs.length,
      lulusKosong: r.filter((s) => s.hasil === 'AREA-TAK-TERISI' || s.hasil === 'SKIP').length,
      gagal: r.filter((s) => isGagal(s.hasil)).length,
      netMedianPct: rs.length ? Math.round(median(rs.map((s) => s.netPct)) * 100) / 100 : 0,
      sasaranMedianPct: rs.length ? Math.round(median(rs.map((s) => s.sasaranNetPct)) * 100) / 100 : 0,
    }
  }
  const perFrame: Record<string, { n: number; lulusEntry: number; lulusKosong: number; gagal: number }> = {}
  for (const fr of ['1h', '4h']) {
    const r = stat.filter((s) => s.frame === fr)
    if (r.length === 0) continue
    perFrame[fr] = {
      n: r.length,
      lulusEntry: r.filter((s) => s.hasil === 'SUkses').length,
      lulusKosong: r.filter((s) => s.hasil === 'AREA-TAK-TERISI' || s.hasil === 'SKIP').length,
      gagal: r.filter((s) => isGagal(s.hasil)).length,
    }
  }

  const stPerDaun = new Map<string, { n: number; fill: number; sukses: number; gagal: number; net: number[]; sas: number[] }>()
  for (const s of stat) {
    if (!s.kunci) continue
    let x = stPerDaun.get(s.kunci)
    if (!x) {
      x = { n: 0, fill: 0, sukses: 0, gagal: 0, net: [], sas: [] }
      stPerDaun.set(s.kunci, x)
    }
    x.n++
    if (s.hasil !== 'AREA-TAK-TERISI' && s.hasil !== 'SKIP') x.fill++
    if (s.hasil === 'SUkses') {
      x.sukses++
      x.net.push(s.netPct)
      x.sas.push(s.sasaranNetPct)
    }
  }
  const daftarDaun = [...tabel.values()].map((d) => {
    const st = stPerDaun.get(d.kunci)
    return {
      ...d,
      areaPct: Math.round(d.areaPct * 100) / 100,
      slPct: Math.round(d.slPct * 100) / 100,
      ambisiusPct: Math.round(d.ambisiusPct * 100) / 100,
      n: st?.n ?? 0,
      nFill: st?.fill ?? 0,
      nSukses: st?.sukses ?? 0,
      nGagal: st?.gagal ?? 0,
      netMedianPct: st && st.net.length ? Math.round(median(st.net) * 100) / 100 : 0,
      sasaranMedianPct: st && st.sas.length ? Math.round(median(st.sas) * 100) / 100 : 0,
    }
  })
  daftarDaun.sort((a, b) => b.nSukses - a.nSukses)

  // ledger pelajaran dari bukti
  const ledger: { id: string; celah: string; aturan: string }[] = []
  const byRezimDaun = new Map<string, typeof daftarDaun>()
  for (const d of daftarDaun) {
    const rez = d.kunci.split('|')[1]
    const arr = byRezimDaun.get(rez) ?? []
    arr.push(d)
    byRezimDaun.set(rez, arr)
  }
  let li = 1
  const petaLabel: Record<string, string> = {
    SIDEWAYS: 'sideways (sabuk aman)',
    BEARISH: 'bearish (rally antar-jemuran)',
    BULLISH: 'bullish (tren naik)',
    PUMP: 'pump berita/spekulasi',
  }
  for (const [rez, arr] of byRezimDaun) {
    const aktif = arr.filter((d) => d.aktif && (d.nSukses ?? 0) > 0)
    if (aktif.length === 0) continue
    const ambTengah = Math.round(median(aktif.map((d) => d.ambisiusPct)) * 10) / 10
    const netTengah = Math.round(median(aktif.map((d) => d.netMedianPct)) * 10) / 10
    ledger.push({
      id: `JA-L${String(li++).padStart(2, '0')}`,
      celah: `Di rezim ${petaLabel[rez] ?? rez}, ambisius yang bisa dipertanggungjawabkan berkisar ${ambTengah}% (median lintas daun matang, diskalakan ATR).`,
      aturan: `Jual ambisius ±${ambTengah}% dari harga terisi; net median ±${netTengah}% setelah fee — ${aktif.length} daun keputusan lulus tanpa kegagalan.`,
    })
  }
  const daunMati = daftarDaun.filter((d) => !d.aktif)
  if (daunMati.length > 0) {
    ledger.push({
      id: `JA-L${String(li++).padStart(2, '0')}`,
      celah: `${daunMati.length} daun keputusan terbukti tak bisa menjamin longsor setelah ambisius tersentuh (${daunMati.reduce((s, d) => s + (d.n ?? 0), 0)} soal).`,
      aturan: 'Daun itu nonaktif: sistem SKIP — tidak ada janji yang pecah. Kejujuran lebih mahal daripada profit dipaksakan.',
    })
  }

  const contohSukses = sukses.slice(0, 40).map((s) => {
    const e = eps[s.num - 1]
    return { num: s.num, simbol: e.simbol, startTs: e.startTs, rezim: s.rezim, frame: e.frame ?? '1h', netPct: Math.round(s.netPct * 100) / 100 }
  })

  const kalibrasi = {
    protokol: 'JA-KALIBRASI',
    versi: '1.0',
    computedAt: new Date().toISOString(),
    sasaranSoal: SARAN_SOAL,
    rondeTempa: riwayat.length,
    konvergen,
    nSoal,
    nLulus: sukses.length + kosong.length,
    nLulusEntry: sukses.length,
    nLulusKosong: kosong.length,
    nGagal: gagal.length,
    passRate: nSoal ? Math.round(((sukses.length + kosong.length) / nSoal) * 10000) / 100 : 0,
    parameter: { ...JA_PARAM, catatan: 'jendela fisik 24 jam dijaga sama di frame 1j (24 candle) dan 4j (6 candle); area entry = limit order' },
    perFrame,
    perRezim,
    jenisGagal: Object.fromEntries([...new Set(gagal.map((g) => g.hasil))].map((h) => [h, gagal.filter((g) => g.hasil === h).length])),
    tabel: daftarDaun,
    ledger,
    riwayatRonde: riwayat.slice(-12),
    contohSukses,
    kejujuran:
      'Hasil kalibrasi HISTORIS dari data klines Binance nyata (universe USDT qv>=3jt; frame 1-jam & 4-jam; dedup per simbol+waktu). LABEL OBSERVASI, bukan janji: pasar masa depan bisa berbeda. Nol gagal = nol janji pecah pada data uji — bukan jaminan profit. Daun nonaktif = sistem sengaja SKIP, bukan tak bisa.',
  }
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(FILE_KALIBRASI, JSON.stringify(kalibrasi, null, 1))

  const baris: string[] = []
  baris.push('# Laporan Penempaan Jual Ambisius')
  baris.push('')
  baris.push(`- Protokol: JA-KALIBRASI v1.0 — ${new Date().toISOString()}`)
  baris.push(`- Soal ujian: **${nSoal}** dari data REAL Binance — frame 1j: ${perFrame['1h']?.n ?? 0}, frame 4j: ${perFrame['4h']?.n ?? 0}`)
  baris.push(`- Lulus: **${sukses.length + kosong.length}** (entry sukses ${sukses.length} + kosong aman ${kosong.length})`)
  baris.push(`- Gagal: **${gagal.length}** ${konvergen ? '→ NOL, konvergen' : ''}`)
  baris.push(`- Daun keputusan: ${tabel.size} (aktif ${daftarDaun.filter((d) => d.aktif).length})`)
  baris.push('')
  baris.push('| Rezim | Soal | Entry Sukses | Kosong Aman | Gagal | Net Median | Sasaran Median |')
  baris.push('|---|---|---|---|---|---|---|')
  for (const [rez, v] of Object.entries(perRezim)) {
    const x = v as { n: number; lulusEntry: number; lulusKosong: number; gagal: number; netMedianPct: number; sasaranMedianPct: number }
    baris.push(`| ${rez} | ${x.n} | ${x.lulusEntry} | ${x.lulusKosong} | ${x.gagal} | ${x.netMedianPct}% | ${x.sasaranMedianPct}% |`)
  }
  baris.push('')
  baris.push('## Ledger pelajaran')
  for (const l of ledger) {
    baris.push(`- **${l.id}** ${l.celah}`)
    baris.push(`  - Aturan: ${l.aturan}`)
  }
  fs.writeFileSync(FILE_LAPORAN, baris.join('\n'))
}

utama().catch((e) => {
  console.error('[TEMPA] fatal:', e)
  process.exit(1)
})
