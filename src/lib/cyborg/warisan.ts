// ============================================================
// V250 WARISAN MASUK ARENA — 7 mesin organ besar + tangga harga
// pra-registrasi, diporting dari otak server SAKTI (penjaga.mjs
// V249-WARISAN-ORGAN) ke TEMPAT PERTARUNGAN SESUNGGUHNYA.
//
// Mandat pemilik: "micaprofita tempat pertarungan kita cukup
// canggih dan banyak aspek yang belum tayang diimplementasikan
// di tempat sesungguhnya." — berarti arena harian kini memakai
// senjata penuh yang sama dengan denyut server:
//   (1) GARCH(1,1)          — Bollerslev 1986, sigma-24j MLE-grid
//   (2) Monte Carlo 24 jam  — 2.000 lintasan × 24 langkah,
//                             bootstrap residual terstandarisasi,
//                             RNG BERBIBIT → pra-registrasi yang
//                             bisa direproduksi siapa pun (inovasi)
//   (3) Volume Profile      — POC + Value Area 70% + magnet node
//   (4) CAPM Beta vs BTC    — regresi 90 jam + R²
//   (5) Divergensi RSI      — dua jendela 12 jam
//   (6) Breadth A/D         — lebar pasar global (guard rezim)
//   (7) Kejut-Pump guard    — lonjakan 6j > 4σ·√6 di ujung atas
// Ditambah lapisan kepastian yang BELUM PERNAH ada di arena:
//   - TANGGA HARGA: entry/stop/target/ambisius + % (GUARD MONTE
//     CARLO: pTarget ≥ 0.38 — statistik menolak target fantasi)
//   - PRA-REGISTRASI: waktu kunci + horizon + fee 0,2% wajib NET
//   - DAYA PRODUK: volume/volatilitas/likuiditas 0..1
// Jujur: pick historis TIDAK di-enrich retroaktif (hindari
// lookahead); warisan hanya untuk hari hidup saat keputusan.
// ============================================================

import { Candle, getKlines1hDeep, getKlines1hDeepFutures, tanpaSpot } from './market'
import { fnv1a } from './brain'

/** V301 — 1h-dalam pintar: koin khusus-futures diarahkan ke fapi, sisanya
 *  spot dulu (fallback futures bila ternyata tak ada di spot). */
async function k1hDeep(symbol: string): Promise<Candle[]> {
  if (tanpaSpot(symbol)) return getKlines1hDeepFutures(symbol)
  try {
    return await getKlines1hDeep(symbol)
  } catch (e) {
    if (String(e).includes('tanpa-spot')) return getKlines1hDeepFutures(symbol)
    throw e
  }
}

// ---------------- konstanta warisan (identik penjaga.mjs) ----------------
export const WARISAN = {
  MC_LINTASAN: 2000, MC_LANGKAH: 24, MC_MIN: 0.38,   // gerbang peluang tembus target
  LAMBDA_EWMA: 0.94,                                  // RiskMetrics — residual terstandarisasi MC
  VP_BATANG: 48, VP_BUCKET: 24, VA_POROSI: 0.70,     // Volume Profile 48 jam, Value Area 70%
  BETA_JAM: 90,                                       // regresi CAPM 90 jam vs BTC
  KEJUT_SIGMA: 4,                                     // lonjakan 6j > 4× sigma·√6 di ujung atas
  FEE_PCT: 0.2,                                       // fee per sisi — NET wajib (tradisi SAKTI)
  PANGKAS_KEJUT: 15,                                  // trim keyakinan saat kejar-top
  PANGKAS_SADARDIRI: 10,                              // tindakan Brier > 0.25
} as const

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

// ---------------- RNG berbibit (mulberry32) — MC REPRODUKSI ----------------
// Inovasi V250: lintasan Monte Carlo tak lagi lemparan dadu yang hanya
// Tuhan yang tahu — bibitnya disimpan di pra-registrasi, siapa pun bisa
// menjalankan ulang 2.000 lintasan dan mendapat ANGKA YANG SAMA.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------- (1) GARCH(1,1) — Bollerslev 1986 ----------------
export interface Garch11 {
  model: string
  persistensi: number
  sigma1j: number
  sigma24jPct: number | null
}

export function garch11(closes: number[]): Garch11 {
  const r: number[] = []
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]))
  const n = r.length
  if (n < 60) throw new Error('lilin kurang untuk GARCH')
  const var0 = r.reduce((a, x) => a + x * x, 0) / n
  let terbaik: { ll: number; al: number; be: number; om: number } | null = null
  for (const al of [0.02, 0.05, 0.08, 0.12, 0.16, 0.2]) {
    for (const be of [0.7, 0.8, 0.88, 0.93, 0.97]) {
      if (al + be >= 0.999) continue
      const om = var0 * (1 - al - be)
      let ll = 0, h = var0
      for (const x of r) { ll += -Math.log(h) - (x * x) / h; h = om + al * x * x + be * h }
      if (!terbaik || ll > terbaik.ll) terbaik = { ll, al, be, om }
    }
  }
  if (!terbaik) throw new Error('GARCH tak konvergen')
  const { al, be, om } = terbaik
  let h = var0
  for (const x of r.slice(-60)) h = om + al * x * x + be * h
  let jumlahH = 0, hk = h
  for (let k = 0; k < WARISAN.MC_LANGKAH; k++) { jumlahH += hk; hk = om + (al + be) * hk }
  return {
    model: `GARCH(1,1) MLE-grid — α=${al} β=${be} (Bollerslev 1986)`,
    persistensi: +(al + be).toFixed(3), sigma1j: +Math.sqrt(h).toPrecision(4),
    sigma24jPct: +(Math.sqrt(jumlahH) * 100).toFixed(2),
  }
}

// ---------------- (2) MONTE CARLO 24 jam — probability cone ----------------
export interface McResult {
  pNaik: number
  q50: number; q75: number; q90: number
  // KONVENSI CERMIN V303b (perbaikan bug lama): q75Dn/q90Dn = KEDALAMAN yang
  // hanya ditembus 25%/10% lintasan (ku(maksTurun, 0.25/0.10)) — persis
  // cermin q75/q90 sisi naik. Versi lama (0.75/0.9) menghasilkan level
  // DANGKAL yang 75%/90% lintasan malu-melewati → ambisius SELL kolaps di
  // bawah TP sendiri. q50 tetap median (simetris).
  q50Dn: number; q75Dn: number; q90Dn: number
  pLevel: (fraksi: number) => number
  pLevelDn: (fraksi: number) => number
}

export function monteCarlo24j(candles: Candle[], g: Garch11, seed: number,
  lintasan = WARISAN.MC_LINTASAN, langkah = WARISAN.MC_LANGKAH): McResult {
  const closes = candles.map((x) => x.close)
  const n = closes.length
  let varEw = closes.slice(1).reduce((a, x, i) => a + Math.log(x / closes[i]) ** 2, 0) / (n - 1)
  const res: number[] = []
  for (let i = 1; i < n; i++) {
    const rr = Math.log(closes[i] / closes[i - 1])
    varEw = WARISAN.LAMBDA_EWMA * varEw + (1 - WARISAN.LAMBDA_EWMA) * rr * rr
    res.push(rr / Math.max(Math.sqrt(varEw), 1e-9))
  }
  const rnd = mulberry32(seed)
  const maksNaik: number[] = [], maksTurun: number[] = []
  let pNaik = 0
  for (let L = 0; L < lintasan; L++) {
    let lp = 0, up = 0, dn = 0
    for (let t = 0; t < langkah; t++) {
      lp += res[(rnd() * res.length) | 0] * g.sigma1j
      if (lp > up) up = lp
      if (lp < dn) dn = lp
    }
    if (lp > 0) pNaik++
    maksNaik.push(up); maksTurun.push(dn)
  }
  maksNaik.sort((a, b) => a - b); maksTurun.sort((a, b) => a - b)
  const ku = (arr: number[], q: number) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))]
  return {
    pNaik: +(pNaik / lintasan).toFixed(3),
    q50: +ku(maksNaik, 0.5).toFixed(4), q75: +ku(maksNaik, 0.75).toFixed(4), q90: +ku(maksNaik, 0.9).toFixed(4),
    q50Dn: +Math.abs(ku(maksTurun, 0.5)).toFixed(4), q75Dn: +Math.abs(ku(maksTurun, 0.25)).toFixed(4), q90Dn: +Math.abs(ku(maksTurun, 0.1)).toFixed(4),
    pLevel: (fraksi: number) => maksNaik.filter((x) => x >= Math.log(1 + fraksi)).length / lintasan,
    pLevelDn: (fraksi: number) => maksTurun.filter((x) => x <= -Math.abs(Math.log(1 - fraksi))).length / lintasan,
  }
}

// ---------------- (3) VOLUME PROFILE — POC + Value Area 70% ----------------
export interface VpResult {
  poc: number; vah: number; val: number
  ket: string
  magnetAtas: { level: number; ket: string } | null
  magnetBawah: { level: number; ket: string } | null
}

export function profilVolume(candles: Candle[]): VpResult | null {
  const d = candles.slice(-WARISAN.VP_BATANG)
  if (d.length < 24) return null
  const hi = Math.max(...d.map((x) => x.high)), lo = Math.min(...d.map((x) => x.low))
  if (!(hi > lo)) return null
  const NB = WARISAN.VP_BUCKET, leb = (hi - lo) / NB
  const vol = Array<number>(NB).fill(0)
  for (const x of d) {
    const tp = (x.high + x.low + x.close) / 3
    let i = Math.floor((tp - lo) / leb); if (i < 0) i = 0; if (i >= NB) i = NB - 1
    vol[i] += x.quoteVolume || x.volume
  }
  const total = vol.reduce((a, x) => a + x, 0) || 1
  let iPoc = 0
  for (let i = 1; i < NB; i++) if (vol[i] > vol[iPoc]) iPoc = i
  let iLo = iPoc, iHi = iPoc, terkumpul = vol[iPoc]
  while (terkumpul < total * WARISAN.VA_POROSI && (iLo > 0 || iHi < NB - 1)) {
    const kiri = iLo > 0 ? vol[iLo - 1] : -1
    const kanan = iHi < NB - 1 ? vol[iHi + 1] : -1
    if (kanan >= kiri) { iHi++; terkumpul += Math.max(kanan, 0) } else { iLo--; terkumpul += Math.max(kiri, 0) }
  }
  const pusat = (i: number) => +(lo + (i + 0.5) * leb).toPrecision(7)
  const hargaKini = candles[candles.length - 1].close
  const nodeAtas: number[] = [], nodeBawah: number[] = []
  for (let i = 0; i < NB; i++) {
    if (vol[i] >= vol[iPoc] * 0.6) {
      if (pusat(i) > hargaKini * 1.004) nodeAtas.push(pusat(i))
      if (pusat(i) < hargaKini * 0.996) nodeBawah.push(pusat(i))
    }
  }
  nodeAtas.sort((a, b) => a - b); nodeBawah.sort((a, b) => b - a)
  return {
    poc: pusat(iPoc), vah: pusat(iHi), val: pusat(iLo),
    ket: `POC ${pusat(iPoc).toPrecision(7)} · VA ${pusat(iLo).toPrecision(7)}–${pusat(iHi).toPrecision(7)} (70% volume 48 jam)`,
    magnetAtas: nodeAtas.length ? { level: nodeAtas[0], ket: `node Volume Profile ${nodeAtas[0].toPrecision(7)} — magnet likuiditas institusional 48 jam (POC/VA/HVN)` } : null,
    magnetBawah: nodeBawah.length ? { level: nodeBawah[0], ket: `node Volume Profile ${nodeBawah[0].toPrecision(7)} — magnet likuiditas di bawah harga` } : null,
  }
}

// ---------------- (4) CAPM BETA vs BTC ----------------
export function betaBTC(candles: Candle[], btcCandles: Candle[]): { beta: number; r2: number } {
  if (!btcCandles || btcCandles.length < 30) throw new Error('BTC kurang')
  const n = Math.min(WARISAN.BETA_JAM, candles.length - 1, btcCandles.length - 1)
  const rc: number[] = [], rb: number[] = []
  for (let i = 0; i < n; i++) {
    rc.push(Math.log(candles[candles.length - 1 - i].close / candles[candles.length - 2 - i].close))
    rb.push(Math.log(btcCandles[btcCandles.length - 1 - i].close / btcCandles[btcCandles.length - 2 - i].close))
  }
  const mb = rb.reduce((a, x) => a + x, 0) / n, mc2 = rc.reduce((a, x) => a + x, 0) / n
  let cov = 0, vb = 0, vc = 0
  for (let i = 0; i < n; i++) { cov += (rb[i] - mb) * (rc[i] - mc2); vb += (rb[i] - mb) ** 2; vc += (rc[i] - mc2) ** 2 }
  const beta = vb > 0 ? cov / vb : 1
  const korel = vb > 0 && vc > 0 ? cov / Math.sqrt(vb * vc) : 0
  return { beta: +beta.toFixed(3), r2: +(korel * korel).toFixed(3) }
}

// ---------------- RSI Wilder 14 (untuk divergensi) ----------------
export function rsiWilder(closes: number[], periode = 14): number[] {
  const out: number[] = []
  let up = 0, dn = 0
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1]
    const naik = Math.max(ch, 0), turun = Math.max(-ch, 0)
    if (i <= periode) {
      up += naik; dn += turun
      if (i === periode) { up /= periode; dn /= periode; out.push(dn === 0 ? 100 : 100 - 100 / (1 + up / dn)) }
    } else {
      up = (up * (periode - 1) + naik) / periode
      dn = (dn * (periode - 1) + turun) / periode
      out.push(dn === 0 ? 100 : 100 - 100 / (1 + up / dn))
    }
  }
  return out
}

// ---------------- (5) DIVERGENSI RSI dua jendela 12 jam ----------------
export function divergensiRSI(candles: Candle[]): string {
  const r = rsiWilder(candles.map((x) => x.close), 14)
  const n = r.length
  if (n < 40) return 'belum cukup lilin untuk divergensi'
  const w = [{ pMin: Infinity, rMin: 999, pMax: -Infinity, rMax: -999 }, { pMin: Infinity, rMin: 999, pMax: -Infinity, rMax: -999 }]
  for (let j = 0; j < 2; j++) {
    for (let i = n - 24 + j * 12; i < n - 12 + j * 12; i++) {
      w[j].pMin = Math.min(w[j].pMin, candles[i].low); w[j].rMin = Math.min(w[j].rMin, r[i])
      w[j].pMax = Math.max(w[j].pMax, candles[i].high); w[j].rMax = Math.max(w[j].rMax, r[i])
    }
  }
  if (w[1].pMin < w[0].pMin && w[1].rMin > w[0].rMin + 2) return 'divergensi bullish — harga cetak lantai lebih rendah, RSI lebih tinggi (tekanan jual melemah)'
  if (w[1].pMax > w[0].pMax && w[1].rMax < w[0].rMax - 2) return 'divergensi bearish — puncak lebih tinggi, RSI lebih rendah (momentum melemah)'
  return 'tanpa divergensi RSI 12 jam terakhir'
}

// ---------------- (7) kemasan satu panggilan + GUARD KEJUT-PUMP ----------------
export interface WarisanResult {
  garch: Garch11
  vp: VpResult | null
  beta: number | null
  r2: number | null
  div: string
  kejutPump: boolean
  ketKejut: string
  naik6: number
  posisiRentang: number
  volSpike: number
  lo24: number
  hi24: number
}

export function mesinWarisan(candles: Candle[], btcCandles: Candle[]): WarisanResult {
  const closes = candles.map((x) => x.close)
  let garch: Garch11
  try { garch = garch11(closes) } catch { garch = { model: 'ewma-jatuh (lilin kurang)', persistensi: 0, sigma1j: 0, sigma24jPct: null } }
  let vp: VpResult | null = null
  try { vp = profilVolume(candles) } catch { vp = null }
  let beta: number | null = null, r2: number | null = null
  try { const bt = betaBTC(candles, btcCandles); beta = bt.beta; r2 = bt.r2 } catch { beta = null; r2 = null }
  const div = divergensiRSI(candles)
  const la = closes.length - 1
  const naik6 = la >= 6 ? closes[la] / closes[la - 6] - 1 : 0
  const vol6 = candles.slice(-6).reduce((a, x) => a + x.volume, 0)
  const vol48 = candles.slice(-54, -6).reduce((a, x) => a + x.volume, 0) / 48
  const volSpike = vol48 > 0 ? vol6 / (vol48 * 6) : 1
  const d24 = candles.slice(-24)
  const hi24 = Math.max(...d24.map((x) => x.high)), lo24 = Math.min(...d24.map((x) => x.low))
  const posisi = hi24 > lo24 ? (closes[la] - lo24) / (hi24 - lo24) : 0.5
  void d24
  const lonjak = garch.sigma1j > 0 ? naik6 / (garch.sigma1j * Math.sqrt(6)) : 0
  const kejutPump = posisi > 0.8 && (lonjak > WARISAN.KEJUT_SIGMA || (volSpike > 3 && lonjak > WARISAN.KEJUT_SIGMA * 0.5))
  const ketKejut = `lonjakan 6 jam ${(naik6 * 100).toFixed(1)}% = ${lonjak.toFixed(1)}× sigma-GARCH, posisi ${(posisi * 100).toFixed(0)}% rentang, volume ${volSpike.toFixed(1)}× rata — kejar-top ditolak (pelajaran false-breakout 100/100)`
  return { garch, vp, beta, r2, div, kejutPump, ketKejut, naik6, posisiRentang: +posisi.toFixed(3), volSpike: +volSpike.toFixed(2), lo24: +lo24.toPrecision(7), hi24: +hi24.toPrecision(7) }
}

// ---------------- TANGGA HARGA + GUARD MONTE CARLO ----------------
// V303 DOKTRIN JUAL-BERTINGKAT pemilik (27 Okt 2026):
//   (1) JUAL AMBISIUS   — saat harga TERKENA, dipastikan turun kemudian
//                         (q75 ekskursi maksimum: hanya 25% lintasan pernah
//                         setinggi itu → harga terlentang, rever balik).
//   (2) JUAL POWER MAX  — hanya DITERBITKAN bila ada PRAKIRA NYATA bahwa
//                         jual ambisius memiliki peluang naik lagi ke target
//                         sekian (volume menyala / momentum searah / magnet
//                         VP di atas ambisius). Bila POWER MAX tercapai,
//                         harga TERJUN — puncaknya butuh nafas panjang
//                         (q90: hanya 10% lintasan pernah setinggi itu).
//   Dua-duanya punya fundamental jelas — bukan hiasan.
export interface Rencana {
  entry: number
  stop: number | null
  target: number | null
  highAmbisius: number | null
  powerMaxAmbisius: number | null
  stopPct: number | null
  targetPct: number | null
  ambisiusPct: number | null
  powerMaxPct: number | null
  pTarget: number | null
  pStop: number | null
  pAmbisius: number | null
  pPowerMax: number | null
  prakiraPowerMax: string | null
  targetMediana: boolean
  netUntungPct: number | null
  sumberTarget: string
  ketGuard: string
}

/** Tangga harga arah-sadar dengan GUARD MC: target dicari di tangga
 *  magnet-VP → 1.5σ → 1.2σ → 1.0σ → 0.8σ → median; ambang MC_MIN 0.38.
 *  V303 GERBANG KATALIS: magnet jauh yang gagal guard 0.38 tetap diterima
 *  bila koinnya sedang LEDAKAN NYATA (volume ≥ 2× rata + momentum searah)
 *  dan ≥ 20% lintasan Monte Carlo menjangkaunya — TP besar kembali lahir
 *  pada koin yang memang berbakat, tanpa membuka pintu fantasi.
 *  Stop identik penjaga: sisi aman antara 1,8×ATR dan ujung rentang 24j
 *  dengan buffer 0,25×ATR (dicermin untuk SELL). */
export function rangkaiRencana(
  direction: 'BUY' | 'SELL',
  entry: number,
  atrPct: number,
  war: WarisanResult,
  mc: McResult,
): Rencana {
  const sigma24 = (war.garch.sigma24jPct ?? 0) / 100
  const sisi = direction === 'BUY' ? 1 : -1
  const magnet = direction === 'BUY' ? (war.vp?.magnetAtas?.level ?? null) : (war.vp?.magnetBawah?.level ?? null)
  const tangga: { harga: number | null; nama: string }[] = [
    { harga: magnet, nama: 'magnet Volume Profile' },
    { harga: sigma24 > 0 ? entry * (1 + sisi * 1.5 * sigma24) : null, nama: '1.5× sigma-24j GARCH' },
    { harga: sigma24 > 0 ? entry * (1 + sisi * 1.2 * sigma24) : null, nama: '1.2× sigma-24j' },
    { harga: sigma24 > 0 ? entry * (1 + sisi * 1.0 * sigma24) : null, nama: '1.0× sigma-24j' },
    { harga: sigma24 > 0 ? entry * (1 + sisi * 0.8 * sigma24) : null, nama: '0.8× sigma-24j' },
  ]
  const fraksiDari = (harga: number) => Math.abs(harga / entry - 1)
  const momSearah = direction === 'BUY' ? war.naik6 : -war.naik6
  let target: number | null = null, pTarget: number | null = null, sumberTarget = '', targetMediana = false
  for (const t of tangga) {
    if (t.harga === null || !Number.isFinite(t.harga) || fraksiDari(t.harga) < 0.004) continue
    const p = direction === 'BUY' ? mc.pLevel(fraksiDari(t.harga)) : mc.pLevelDn(fraksiDari(t.harga))
    if (p >= WARISAN.MC_MIN) { target = t.harga; pTarget = +p.toFixed(3); sumberTarget = t.nama; break }
  }
  // V303 GERBANG KATALIS — doktrin pemilik: TP besar bukan fantasi bila
  // koinnya memang sedang meledak. Magnet jauh diterima walau peluang MC
  // di bawah 0.38, ASAL volume menyala + momentum searah + MC mengaku.
  if (target === null && magnet !== null && Number.isFinite(magnet) && fraksiDari(magnet) >= 0.004) {
    const ledakanNyata = war.volSpike >= 2 && momSearah > 0.005
    if (ledakanNyata) {
      const p = direction === 'BUY' ? mc.pLevel(fraksiDari(magnet)) : mc.pLevelDn(fraksiDari(magnet))
      if (p >= 0.20) {
        target = magnet; pTarget = +p.toFixed(3)
        sumberTarget = 'magnet Volume Profile + gerbang katalis ledakan'
        targetMediana = false
      }
    }
  }
  let ketGuard = ''
  if (target === null && sigma24 > 0) {
    // GUARD MC: tidak ada level yang layak → jujur pakai MEDIAN ekskursi,
    // bukan target fantasi yang statistik bilang mustahil.
    target = entry * (1 + sisi * (direction === 'BUY' ? mc.q50 : mc.q50Dn))
    pTarget = +(direction === 'BUY' ? mc.pLevel(fraksiDari(target)) : mc.pLevelDn(fraksiDari(target))).toFixed(3)
    sumberTarget = `median Monte Carlo (${(mc.q50 * 100).toFixed(1)}% ekskursi)`
    targetMediana = true
    ketGuard = `guard Monte Carlo: seluruh tangga target dinilai peluangnya < ${Math.round(WARISAN.MC_MIN * 100)}% — target turun ke median lintasan, bukan fantasi`
  } else if (sigma24 === 0) {
    ketGuard = 'sigma-24j tak tersedia (lilin kurang) — tangga target kosong, jujur tanpa angka'
  } else if (sumberTarget.includes('katalis')) {
    ketGuard = `gerbang katalis V303: volume ${war.volSpike.toFixed(1)}× rata + momentum 6j searah ${(momSearah * 100).toFixed(1)}% — magnet jauh diterima walau pTarget ${(pTarget! * 100).toFixed(0)}% < ${Math.round(WARISAN.MC_MIN * 100)}% (bukan fantasi: ada bukti ledakan nyata)`
  } else {
    ketGuard = `lolos guard Monte Carlo: pTarget ${(pTarget! * 100).toFixed(0)}% ≥ ${Math.round(WARISAN.MC_MIN * 100)}% (${sumberTarget})`
  }
  // stop identik penjaga V249: min/max dari (1,8×ATR harian) vs (ujung 24j ∓ 0,25×ATR buffer)
  const stop = direction === 'BUY'
    ? +Math.min(entry * (1 - 1.8 * atrPct / 100), war.lo24 - (0.25 * atrPct / 100) * entry).toPrecision(6)
    : +Math.max(entry * (1 + 1.8 * atrPct / 100), war.hi24 + (0.25 * atrPct / 100) * entry).toPrecision(6)
  const pStop = +(direction === 'BUY' ? mc.pLevelDn(fraksiDari(stop)) : mc.pLevel(fraksiDari(stop))).toFixed(3)
  const ambisius = sigma24 > 0 ? +(entry * (1 + sisi * (direction === 'BUY' ? mc.q75 : mc.q75Dn))).toPrecision(6) : null
  const pAmbisius = ambisius !== null ? +(direction === 'BUY' ? mc.pLevel(fraksiDari(ambisius)) : mc.pLevelDn(fraksiDari(ambisius))).toFixed(3) : null
  const { powerMax, pPowerMax, prakira } = juruPowerMax(direction, entry, war, mc, magnet, ambisius)
  const netUntungPct = target !== null ? +(((sisi * (target - entry)) / entry - 2 * WARISAN.FEE_PCT / 100) * 100).toFixed(2) : null
  const pct = (x: number | null) => x === null ? null : +(((x - entry) / entry) * sisi * 100).toFixed(2)
  return {
    entry: +entry.toPrecision(7),
    stop, target, highAmbisius: ambisius, powerMaxAmbisius: powerMax,
    stopPct: pct(stop), targetPct: pct(target), ambisiusPct: pct(ambisius), powerMaxPct: pct(powerMax),
    pTarget, pStop, pAmbisius, pPowerMax, prakiraPowerMax: prakira,
    targetMediana, netUntungPct, sumberTarget, ketGuard,
  }
}

/** V303 JURU POWER MAX — doktrin pemilik: power max hanya lahir bila ada
 *  PRAKIRA NYATA (katalis) bahwa harga masih mampu naik LAMPAUI jual
 *  ambisius. Kandidat terjauh diambil: magnet VP di atas ambisius vs q90
 *  Monte Carlo. Tanpa katalis → jujur null: "ambisius adalah atap hari ini".
 *  Bila tercapai, hanya ~10% lintasan yang pernah setinggi itu → puncak
 *  butuh nafas panjang, terjun diperkirakan (mean reversion). */
export function juruPowerMax(
  direction: 'BUY' | 'SELL',
  entry: number,
  war: WarisanResult,
  mc: McResult,
  magnet: number | null,
  ambisius: number | null,
): { powerMax: number | null; pPowerMax: number | null; prakira: string | null } {
  if (ambisius === null) return { powerMax: null, pPowerMax: null, prakira: null }
  const sisi = direction === 'BUY' ? 1 : -1
  const fraksiDari = (harga: number) => Math.abs(harga / entry - 1)
  const momSearah = direction === 'BUY' ? war.naik6 : -war.naik6
  const magnetLebih = magnet !== null && (direction === 'BUY' ? magnet > ambisius : magnet < ambisius)
  const prakiraNyata = war.volSpike >= 1.2 || momSearah > 0 || magnetLebih
  if (!prakiraNyata) {
    return {
      powerMax: null, pPowerMax: null,
      prakira: `tak ada prakira nyata naik-lagi (volume ${war.volSpike.toFixed(1)}× rata, momentum 6j ${(war.naik6 * 100).toFixed(1)}% tak searah, tanpa magnet di atas ambisius) — JUAL AMBISIUS adalah atap hari ini`,
    }
  }
  const q90h = entry * (1 + sisi * (direction === 'BUY' ? mc.q90 : mc.q90Dn))
  const powerMax = +(magnetLebih && Math.abs(magnet! / entry - 1) > Math.abs(q90h / entry - 1) ? magnet! : q90h).toPrecision(6)
  if (direction === 'BUY' ? powerMax <= ambisius : powerMax >= ambisius) {
    return { powerMax: null, pPowerMax: null, prakira: 'kandidat power max tak melewati jual ambisius — atap tetap ambisius' }
  }
  const p = +(direction === 'BUY' ? mc.pLevel(fraksiDari(powerMax)) : mc.pLevelDn(fraksiDari(powerMax))).toFixed(3)
  // GERBANG KETAHANAN V303b: power max adalah PUNCAK TERLENTANG — bila
  // peluang sentuhnya > 15%, level itu tak layak disebut power max
  // (masih dangkal; atap sejati = q90, peluang ~10%).
  if (p > 0.15) {
    return {
      powerMax: null, pPowerMax: null,
      prakira: `kandidat power max ternyata masih dangkal (peluang sentuh ${Math.round(p * 100)}% > 15%) — jujur: tak ada power max hari ini, atap tetap jual ambisius`,
    }
  }
  return {
    powerMax,
    pPowerMax: p,
    prakira: `prakira nyata: volume ${war.volSpike.toFixed(1)}× rata, momentum 6j ${(war.naik6 * 100).toFixed(1)}%${magnetLebih ? ', magnet VP di atas jual ambisius' : ''} — bila POWER MAX tersentuh, hanya ~${Math.round(p * 100)}% lintasan yang pernah setinggi itu: puncak butuh nafas panjang → terjun diperkirakan`,
  }
}

/** V303 HEAL JUJUR — sisipkan POWER MAX ke rencana PRA-REGISTRASI yang
 *  sudah terkunci TANPA menggeser level terkunci satu pun (target/stop/
 *  ambisius tetap persis). MC dijalankan ulang berbibit di atas lilin yang
 *  SAMA (tertutup sebelum waktuKunci) → hasil reproducible. */
export function sisipkanPowerMax(
  direction: 'BUY' | 'SELL',
  war: WarisanResult,
  mc: McResult,
  rencanaTerkunci: Rencana,
): Rencana {
  const magnet = direction === 'BUY' ? (war.vp?.magnetAtas?.level ?? null) : (war.vp?.magnetBawah?.level ?? null)
  const { powerMax, pPowerMax, prakira } = juruPowerMax(direction, rencanaTerkunci.entry, war, mc, magnet, rencanaTerkunci.highAmbisius)
  const sisi = direction === 'BUY' ? 1 : -1
  const pct = (x: number | null) => x === null ? null : +(((x - rencanaTerkunci.entry) / rencanaTerkunci.entry) * sisi * 100).toFixed(2)
  return {
    ...rencanaTerkunci,
    powerMaxAmbisius: powerMax,
    powerMaxPct: pct(powerMax),
    pPowerMax,
    prakiraPowerMax: prakira,
  }
}

// ---------------- DAYA PRODUK (0..1, identik dasbor SAKTI) ----------------
export interface Daya { volume: number; volatilitas: number; likuiditas: number }

export function hitungDaya(volSurgeRatio: number, atrPct: number, likuiditasRank: number, universeSize: number): Daya {
  return {
    volume: +clamp(volSurgeRatio / 3, 0, 1).toFixed(2),
    volatilitas: +clamp(atrPct / 16, 0, 1).toFixed(2),
    likuiditas: +clamp(1 - likuiditasRank / Math.max(1, universeSize), 0, 1).toFixed(2),
  }
}

// ---------------- ORKESTRATOR: perkaya pick hari hidup ----------------

export interface WarisanBukti {
  sigma24jPct: number | null
  modelVol: string
  persistensi: number | null
  beta: number | null
  r2Beta: number | null
  poc: number | null
  profilVolume: string | null
  divRSI: string
  breadthPct: number
  kejutPump: boolean
  ketKejut: string
  posisiRentang: number
  volSpike: number
  pangkas?: string
  mc: {
    lintasan: number; langkah: number; seedHex: string
    pTarget: number | null; pStop: number | null; pAmbisius: number | null; pPowerMax: number | null; pNaik: number | null
    ket: string
  }
}

export interface PraRegistrasi {
  waktuKunci: string
  horizon: string
  feePct: number
  netWajib: boolean
  sumber: string
}

export interface PickLike {
  symbol: string
  direction: 'BUY' | 'SELL'
  confidence: number
  entryClose: number
  evidence: Record<string, unknown>
}

export interface WarisanReport {
  diperkaya: string[]
  kejutPump: { symbol: string; ket: string }[]
  gagal: { symbol: string; alasan: string }[]
}

/** Kaya pick hari hidup dengan 7 mesin warisan + tangga harga pra-registrasi.
 *  Hanya lilin 1h yang SUDAH TERTUTUP pada momen keputusan yang dipakai
 *  (openTime + 1 jam <= sekarang) — pra-registrasi jujur, bebas kebocoran. */
export async function perkayaWarisan(
  picks: PickLike[],
  day: string,
  ctx: {
    atrPctOf: (sym: string) => number | undefined
    likuiditasRankOf: (sym: string) => number
    universeSize: number
    breadthPct: number
    regime: string
  },
  sekarang = Date.now(),
): Promise<WarisanReport> {
  const rep: WarisanReport = { diperkaya: [], kejutPump: [], gagal: [] }
  if (picks.length === 0) return rep
  const tutup = (c: Candle[]) => c.filter((x) => x.openTime + 3600_000 <= sekarang)
  let btc1h: Candle[] | null = null
  try { btc1h = tutup(await k1hDeep('BTCUSDT')) } catch { btc1h = null }
  for (const p of picks) {
    try {
      // V301 — pacing halus antar-fetch: IP sandbox ini mudah kena 418 saat
      // burst; jeda kecil 120ms × 50 pick = 6 dtk, murah dibanding gagal semua.
      await new Promise((r) => setTimeout(r, 120))
      const c = tutup(await k1hDeep(p.symbol))
      if (c.length < 130) { rep.gagal.push({ symbol: p.symbol, alasan: `lilin 1h tertutup ${c.length} < 130` }); continue }
      const war = mesinWarisan(c, btc1h ?? c)
      const seed = fnv1a(`WARISAN|${p.symbol}|${day}`) // bibit deterministik → MC reproducible
      const mc = monteCarlo24j(c, war.garch, seed)
      const atrPct = ctx.atrPctOf(p.symbol)
      if (atrPct === undefined) { rep.gagal.push({ symbol: p.symbol, alasan: 'faktor ATR tak ditemukan' }); continue }
      const rencana = rangkaiRencana(p.direction, p.entryClose, atrPct, war, mc)
      // daya.volume dihitung dari candle 1h nyata (48j vs 8 hari sebelumnya)
      const vol48 = c.slice(-48).reduce((a, x) => a + x.volume, 0) / 48
      const volBf = c.slice(-240, -48).reduce((a, x) => a + x.volume, 0) / 192
      const daya = hitungDaya(volBf > 0 ? vol48 / volBf : 1, atrPct, ctx.likuiditasRankOf(p.symbol), ctx.universeSize)
      const bukti: WarisanBukti = {
        sigma24jPct: war.garch.sigma24jPct, modelVol: war.garch.model, persistensi: war.garch.persistensi,
        beta: war.beta, r2Beta: war.r2,
        poc: war.vp?.poc ?? null, profilVolume: war.vp?.ket ?? null, divRSI: war.div,
        breadthPct: +ctx.breadthPct.toFixed(1),
        kejutPump: war.kejutPump, ketKejut: war.ketKejut, posisiRentang: war.posisiRentang, volSpike: war.volSpike,
        mc: {
          lintasan: WARISAN.MC_LINTASAN, langkah: WARISAN.MC_LANGKAH, seedHex: '0x' + seed.toString(16),
          pTarget: rencana.pTarget, pStop: rencana.pStop, pAmbisius: rencana.pAmbisius, pPowerMax: rencana.pPowerMax, pNaik: mc.pNaik,
          ket: 'peluang Monte Carlo PRA-REGISTRASI berbibit (direproduksi ulang = angka sama) — dinilai medan saat horizon habis',
        },
      }
      const pra: PraRegistrasi = {
        waktuKunci: new Date(sekarang).toISOString(),
        horizon: (() => {
          const [y, m, d] = day.split('-').map(Number)
          const tutupUtc = Date.UTC(y, m - 1, d) + 86_400_000
          return `s/d tutup UTC ${day} (${Math.max(1, Math.round((tutupUtc - sekarang) / 3_600_000))} jam)`
        })(),
        feePct: WARISAN.FEE_PCT, netWajib: true,
        sumber: 'lilin 1h tertutup sebelum momen kunci + otak PREDATOR arena + 7 mesin warisan SAKTI',
      }
      const ev = p.evidence
      ev.warisan = bukti
      ev.rencana = rencana
      ev.daya = daya
      ev.praRegistrasi = pra
      if (war.kejutPump) {
        bukti.pangkas = `${WARISAN.PANGKAS_KEJUT} poin — guard kejut-pump`
        p.confidence = Math.max(35, p.confidence - WARISAN.PANGKAS_KEJUT)
        rep.kejutPump.push({ symbol: p.symbol, ket: war.ketKejut })
      }
      rep.diperkaya.push(p.symbol)
    } catch (e) {
      rep.gagal.push({ symbol: p.symbol, alasan: String(e).slice(0, 120) })
    }
  }
  // V301 TAHAN-BANTING — pass kedua utk yang gagal (ban IP sementara ~90 dtk;
  // cache 15 menit membuat percobaan ulang murah & aman)
  if (rep.gagal.length > 0 && rep.gagal.length <= picks.length) {
    const gagalPertama = rep.gagal.map((g) => g.symbol)
    await new Promise((r) => setTimeout(r, 12_000)) // beri napas breaker/ban
    for (const sym of [...gagalPertama]) {
      const p = picks.find((x) => x.symbol === sym)
      if (!p || p.evidence.warisan) continue
      try {
        const c = tutup(await k1hDeep(p.symbol))
        if (c.length < 130) { continue }
        const war = mesinWarisan(c, btc1h ?? c)
        const seed = fnv1a(`WARISAN|${p.symbol}|${day}`)
        const mc = monteCarlo24j(c, war.garch, seed)
        const atrPct = ctx.atrPctOf(p.symbol)
        if (atrPct === undefined) { continue }
        const rencana = rangkaiRencana(p.direction, p.entryClose, atrPct, war, mc)
        const vol48 = c.slice(-48).reduce((a, x) => a + x.volume, 0) / 48
        const volBf = c.slice(-240, -48).reduce((a, x) => a + x.volume, 0) / 192
        const daya = hitungDaya(volBf > 0 ? vol48 / volBf : 1, atrPct, ctx.likuiditasRankOf(p.symbol), ctx.universeSize)
        const bukti: WarisanBukti = {
          sigma24jPct: war.garch.sigma24jPct, modelVol: war.garch.model, persistensi: war.garch.persistensi,
          beta: war.beta, r2Beta: war.r2,
          poc: war.vp?.poc ?? null, profilVolume: war.vp?.ket ?? null, divRSI: war.div,
          breadthPct: +ctx.breadthPct.toFixed(1),
          kejutPump: war.kejutPump, ketKejut: war.ketKejut, posisiRentang: war.posisiRentang, volSpike: war.volSpike,
          mc: {
            lintasan: WARISAN.MC_LINTASAN, langkah: WARISAN.MC_LANGKAH, seedHex: '0x' + seed.toString(16),
            pTarget: rencana.pTarget, pStop: rencana.pStop, pAmbisius: rencana.pAmbisius, pPowerMax: rencana.pPowerMax, pNaik: mc.pNaik,
            ket: 'peluang Monte Carlo PRA-REGISTRASI berbibit (direproduksi ulang = angka sama) — dinilai medan saat horizon habis',
          },
        }
        const pra: PraRegistrasi = {
          waktuKunci: new Date(sekarang).toISOString(),
          horizon: (() => {
            const [y, m, d] = day.split('-').map(Number)
            const tutupUtc = Date.UTC(y, m - 1, d) + 86_400_000
            return `s/d tutup UTC ${day} (${Math.max(1, Math.round((tutupUtc - sekarang) / 3_600_000))} jam)`
          })(),
          feePct: WARISAN.FEE_PCT, netWajib: true,
          sumber: 'lilin 1h tertutup sebelum momen kunci + otak PREDATOR arena + 7 mesin warisan SAKTI',
        }
        p.evidence.warisan = bukti
        p.evidence.rencana = rencana
        p.evidence.daya = daya
        p.evidence.praRegistrasi = pra
        if (war.kejutPump) {
          bukti.pangkas = `${WARISAN.PANGKAS_KEJUT} poin — guard kejut-pump`
          p.confidence = Math.max(35, p.confidence - WARISAN.PANGKAS_KEJUT)
          rep.kejutPump.push({ symbol: p.symbol, ket: war.ketKejut })
        }
        rep.diperkaya.push(p.symbol)
        rep.gagal = rep.gagal.filter((g) => g.symbol !== p.symbol)
      } catch { /* gagal kedua — biarkan tercatat, denyut berikutnya menyembuhkan */ }
    }
  }
  if (rep.gagal.length > 0) {
    console.log(`[warisan] gagal (${rep.gagal.length}): ${rep.gagal.slice(0, 3).map((g) => `${g.symbol} — ${g.alasan}`).join(' | ')}`)
  }
  return rep
}
