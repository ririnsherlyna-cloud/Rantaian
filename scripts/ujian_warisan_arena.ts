// ============================================================
// UJIAN WARISAN ARENA (V250) — 7 mesin organ besar + tangga harga
// Jalankan: bun scripts/ujian_warisan_arena.ts
// Semua angka dari data sintetis DETERMINISTIK (RNG berbibit) —
// bisa diulang siapa pun, hasil sama.
// ============================================================
import {
  WARISAN, garch11, monteCarlo24j, profilVolume, betaBTC, divergensiRSI, mesinWarisan,
  rangkaiRencana, hitungDaya, mulberry32,
} from '../src/lib/cyborg/warisan'
import type { Candle } from '../src/lib/cyborg/market'

let lulus = 0, gagal = 0
function cek(nama: string, ok: boolean, ket: string) {
  if (ok) { lulus++; console.log(`  ✓ ${nama} — ${ket}`) }
  else { gagal++; console.log(`  ✗ ${nama} — ${ket}`) }
}

// RNG sintetis berbibit (independen dari engine)
function rngFactory(seed: number) { return mulberry32(seed) }

function gbmCandles(n: number, seed: number, sigmaJam: number, harga0 = 100): Candle[] {
  const rnd = rngFactory(seed)
  const out: Candle[] = []
  let harga = harga0
  for (let i = 0; i < n; i++) {
    const ret = sigmaJam * (rnd() * 2 - 1) * Math.sqrt(3) // uniform kasar ~ menyerupai vol
    const open = harga
    harga = harga * Math.exp(ret)
    out.push({
      openTime: (i + 1) * 3600_000,
      open, close: harga,
      high: Math.max(open, harga) * (1 + 0.0005), low: Math.min(open, harga) * (1 - 0.0005),
      volume: 1000 + rnd() * 200, quoteVolume: (1000 + rnd() * 200) * harga,
    })
  }
  return out
}

console.log('\n=== UJIAN (1) GARCH(1,1) — Bollerslev 1986 ===')
{
  const sigmaJam = 0.006 // 0.6%/jam → 24j ≈ 0.6×√24 ≈ 2.94%
  const c = gbmCandles(300, 777, sigmaJam)
  const g = garch11(c.map((x) => x.close))
  cek('sigma-24j masuk rentang masuk akal', g.sigma24jPct !== null && g.sigma24jPct > 1.2 && g.sigma24jPct < 7,
    `σ24j ${g.sigma24jPct}% (target teori ≈ ${(sigmaJam * Math.sqrt(24) * 100).toFixed(2)}%) · persistensi ${g.persistensi}`)
  cek('model berjurnal', g.model.includes('Bollerslev 1986'), g.model)
  let tampil: unknown
  try { garch11(new Array(50).fill(100)) ; tampil = 'tidak-lempar' } catch { tampil = 'lempar' }
  cek('lilin kurang ditolak jujur', tampil === 'lempar', '50 lilin → error (bukan angka karangan)')
}

console.log('\n=== UJIAN (2) MONTE CARLO 24 jam — reproducible + monoton ===')
{
  const c = gbmCandles(300, 888, 0.006)
  const g = garch11(c.map((x) => x.close))
  const seed = 0x1234
  const m1 = monteCarlo24j(c, g, seed)
  const m2 = monteCarlo24j(c, g, seed)
  cek('bibit sama → angka SAMA (pra-registrasi reproducible)', m1.pNaik === m2.pNaik && m1.q50 === m2.q50,
    `pNaik ${m1.pNaik} == ${m2.pNaik} · q50 ${m1.q50} == ${m2.q50}`)
  const m3 = monteCarlo24j(c, g, seed + 1)
  cek('bibit beda → angka beda (bukan hardcoded)', m1.pNaik !== m3.pNaik || m1.q50 !== m3.q50, `bibit beda: q50 ${m3.q50}`)
  cek('pLevel monoton turun', m1.pLevel(0.01) >= m1.pLevel(0.02) && m1.pLevel(0.02) >= m1.pLevel(0.05),
    `p(1%) ${m1.pLevel(0.01).toFixed(3)} ≥ p(2%) ${m1.pLevel(0.02).toFixed(3)} ≥ p(5%) ${m1.pLevel(0.05).toFixed(3)}`)
  cek('pLevelDn monoton TURUN terhadap fraksi (eksursi dalam = langka, semantik penjaga)',
    m1.pLevelDn(0.01) >= m1.pLevelDn(0.02) && m1.pLevelDn(0.02) >= m1.pLevelDn(0.05),
    `pDn(1%) ${m1.pLevelDn(0.01).toFixed(3)} ≥ pDn(2%) ${m1.pLevelDn(0.02).toFixed(3)} ≥ pDn(5%) ${m1.pLevelDn(0.05).toFixed(3)}`)
  cek('q75 ≥ q50 ≥ 0', m1.q75 >= m1.q50 && m1.q50 >= 0, `q50 ${m1.q50} · q75 ${m1.q75}`)
}

console.log('\n=== UJIAN (3) VOLUME PROFILE — POC + magnet dua sisi ===')
{
  // harga kini JATUH ke 100-101 (volume kecil); klaster volume BESAR tinggal di 110-111
  // → node HVN di ATAS harga = magnetAtas; tidak ada node layak di bawah → magnetBawah null
  const c: Candle[] = []
  for (let i = 0; i < 30; i++) c.push({ openTime: i * 3600_000, open: 110.5, high: 111, low: 110, close: 110.5, volume: 5000, quoteVolume: 550000 })
  for (let i = 30; i < 48; i++) c.push({ openTime: i * 3600_000, open: 100.5, high: 101, low: 100, close: 100.5, volume: 500, quoteVolume: 50000 })
  const vp = profilVolume(c)!
  cek('POC jatuh di klaster volume besar (110-111)', vp.poc >= 110 && vp.poc <= 111.5, `POC ${vp.poc}`)
  cek('magnetAtas terdeteksi di atas harga kini', vp.magnetAtas !== null && vp.magnetAtas!.level > 101, vp.magnetAtas ? `magnet ${vp.magnetAtas.level}` : 'null')
  cek('magnetBawah null (tak ada node ≥60% POC di bawah harga)', vp.magnetBawah === null, 'klaster bawah volume kecil — bukan magnet')
  // cermin: harga naik ke 110, klaster besar di bawah → magnetBawah
  const c2: Candle[] = []
  for (let i = 0; i < 30; i++) c2.push({ openTime: i * 3600_000, open: 100.5, high: 101, low: 100, close: 100.5, volume: 5000, quoteVolume: 500000 })
  for (let i = 30; i < 48; i++) c2.push({ openTime: i * 3600_000, open: 110.5, high: 111, low: 110, close: 110.5, volume: 500, quoteVolume: 55000 })
  const vp2 = profilVolume(c2)!
  cek('cermin: magnetBawah terdeteksi di bawah harga', vp2.magnetBawah !== null && vp2.magnetBawah!.level < 101, vp2.magnetBawah ? `magnet ${vp2.magnetBawah.level}` : 'null')
}

console.log('\n=== UJIAN (4) BETA BTC — CAPM 90 jam ===')
{
  const rnd = rngFactory(999)
  const btc: Candle[] = [], koin: Candle[] = []
  let b = 60000, k = 10
  for (let i = 0; i < 120; i++) {
    const rb = 0.001 * (rnd() * 2 - 1)
    b = b * Math.exp(rb)
    k = k * Math.exp(1.6 * rb + 0.0005 * (rnd() * 2 - 1)) // beta target ≈ 1.6
    btc.push({ openTime: i * 3600_000, open: b, high: b, low: b, close: b, volume: 1, quoteVolume: b })
    koin.push({ openTime: i * 3600_000, open: k, high: k, low: k, close: k, volume: 1, quoteVolume: k })
  }
  const bt = betaBTC(koin, btc)
  cek('beta mendekati 1.6 (beta target sintetis)', bt.beta > 1.0 && bt.beta < 2.3, `beta ${bt.beta} · R² ${bt.r2}`)
  cek('R² tinggi (koin = beta×BTC + derau kecil)', bt.r2 > 0.5, `R² ${bt.r2}`)
}

console.log('\n=== UJIAN (5) DIVERGENSI RSI ===')
{
  const c = gbmCandles(80, 111, 0.004, 100)
  const s = divergensiRSI(c)
  cek('mengembalikan keterangan string (tak pernah lempar)', typeof s === 'string' && s.length > 0, s)
}

console.log('\n=== UJIAN (6) KEJUT-PUMP — pelajaran false-breakout ===')
{
  // 240 jam tenang (σ kecil) lalu pump +18% dalam 6 jam terakhir di ujung atas rentang
  const c: Candle[] = []
  let p = 100
  for (let i = 0; i < 240; i++) {
    const ret = 0.0008 * (rngFactory(i * 7 + 1)() - 0.5) * 2
    p = p * Math.exp(ret)
    c.push({ openTime: i * 3600_000, open: p, high: p * 1.001, low: p * 0.999, close: p, volume: 1000, quoteVolume: 100000 })
  }
  const hargaDasar = c[c.length - 1].close
  for (let i = 0; i < 6; i++) {
    const hi = hargaDasar * Math.exp(Math.log(1.18) * ((i + 1) / 6))
    c.push({ openTime: (240 + i) * 3600_000, open: i === 0 ? hargaDasar : c[240 + i - 1].close, high: hi * 1.002, low: (i === 0 ? hargaDasar : c[240 + i - 1].close) * 0.999, close: hi, volume: 9000, quoteVolume: 900000 })
  }
  const w = mesinWarisan(c, c)
  cek('kejut-pump MENYALA saat kejar-top', w.kejutPump, w.ketKejut)
  cek('posisi rentang > 0.8 (di ujung atas)', w.posisiRentang > 0.8, `posisi ${(w.posisiRentang * 100).toFixed(0)}%`)
}

console.log('\n=== UJIAN (7) TANGGA HARGA + GUARD MONTE CARLO ===')
{
  const c = gbmCandles(300, 555, 0.006)
  const g = garch11(c.map((x) => x.close))
  const w = mesinWarisan(c, c)
  const mc = monteCarlo24j(c, g, 0xbeef)
  const rBuy = rangkaiRencana('BUY', 100, 3, w, mc)
  cek('urutan tangga BUY benar: stop < entry < target', rBuy.stop !== null && rBuy.target !== null && rBuy.stop < 100 && rBuy.target > 100,
    `stop ${rBuy.stop} (${rBuy.stopPct}%) · target ${rBuy.target} (${rBuy.targetPct}%) · ambisius ${rBuy.highAmbisius}`)
  cek('pTarget ≥ MC_MIN 0.38 atau targetMediana jujur', (rBuy.pTarget !== null && rBuy.pTarget >= WARISAN.MC_MIN) || rBuy.targetMediana,
    `pTarget ${rBuy.pTarget} · sumber ${rBuy.sumberTarget} · mediana=${rBuy.targetMediana}`)
  cek('NET after fee jujur (dikurangi 2×0,2%)', rBuy.netUntungPct !== null && rBuy.netUntungPct !== null && Math.abs((rBuy.netUntungPct ?? 0) - (((rBuy.targetPct ?? 0)) - 0.4)) < 0.01,
    `net ${(rBuy.netUntungPct ?? 0).toFixed(2)}% = ${rBuy.targetPct}% − 0.4% fee`)
  cek('ketGuard selalu terisi (transparan)', rBuy.ketGuard.length > 10, rBuy.ketGuard)
  const rSell = rangkaiRencana('SELL', 100, 3, w, mc)
  cek('cermin SELL benar: stop > entry > target', rSell.stop !== null && rSell.target !== null && rSell.stop > 100 && rSell.target < 100,
    `stop ${rSell.stop} · target ${rSell.target} (${rSell.targetPct}%)`)
  // guard MC kasus ekstrem: sigma mini + target jauh → mediana, bukan fantasi
  const wMini: typeof w = { ...w, garch: { ...g, sigma1j: 0.0004, sigma24jPct: 0.2 }, vp: null }
  const rFantasi = rangkaiRencana('BUY', 100, 1, wMini, mc)
  cek('guard MC menolak target fantasi → mediana', rFantasi.targetMediana === true, `${rFantasi.ketGuard}`)
}

console.log('\n=== UJIAN (8) DAYA PRODUK 0..1 ===')
{
  const d = hitungDaya(4.5, 10, 5, 40)
  cek('volume di-cap 1.0', d.volume === 1, `volume ${d.volume} (surge 4.5/3)`)
  cek('volatilitas proporsional', Math.abs(d.volatilitas - 0.63) < 0.01, `volatilitas ${d.volatilitas} (ATR 10/16)`)
  cek('likuiditas rank-benar', Math.abs(d.likuiditas - 0.88) < 0.01, `likuiditas ${d.likuiditas} (rank 5/40)`)
}

console.log('\n=== UJIAN (9) DATA LIVE NYATA (informasional — Binance publik) ===')
{
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=260', { signal: AbortSignal.timeout(12000) })
    const raw = (await res.json()) as unknown[][]
    const c: Candle[] = raw.map((k) => ({ openTime: k[0] as number, open: +(k[1] as string), high: +(k[2] as string), low: +(k[3] as string), close: +(k[4] as string), volume: +(k[5] as string), quoteVolume: +(k[7] as string) }))
    const w = mesinWarisan(c, c)
    const g = garch11(c.map((x) => x.close))
    const mc = monteCarlo24j(c, g, 0x2501)
    const r = rangkaiRencana('BUY', c[c.length - 1].close, 2.5, w, mc)
    cek('BTC live: semua mesin menghasilkan angka jujur',
      g.sigma24jPct !== null && mc.pNaik > 0 && mc.pNaik < 1 && r.stop !== null,
      `σ24j ${g.sigma24jPct}% · pNaik ${mc.pNaik} · stop ${r.stop} (${r.stopPct}%) · target ${r.target} (${r.targetPct}%, p ${r.pTarget}) · POC ${w.vp?.poc ?? '-'}`)
  } catch (e) {
    console.log(`  ⊘ live dilewati (${String(e).slice(0, 60)}) — uji sintetis sudah mengikat`)
  }
}

console.log(`\n====== HASIL: ${lulus} LULUS · ${gagal} GAGAL ======`)
if (gagal > 0) process.exit(1)
