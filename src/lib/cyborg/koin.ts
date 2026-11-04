// ============================================================
// BEDAH-KOIN (V297) — pemeriksaan KOIN APAPUN yang ditanyakan
// pemilik, dari data Binance spot NYATA detik ini.
//
// Latar (forensik 2026-10-10): pemilik bertanya "periksa koin opg"
// → LLM tidak punya data OPG (konteks pasar hanya 14 koin teratas)
// → menjawab dengan OGN (ticker lain yang mirip) = laporan SALAH
// SASARAN. Hukum baru: koin yang ditanya HARUS dibedah dari Binance
// langsung — LLM hanya menarasikan angka nyata, bukan mengarang.
// Matematika faktor = SAMA PERSIS dengan arena (computeFactors),
// jadi vonis bedah-koin dan vonis arena berbicara bahasa yang sama.
// ============================================================

import { getKlines, ema } from './market'
import { computeFactors, type CoinFactors } from './factors'

export interface BedahKoin {
  ditanya: string // ticker yang diminta pengguna (mis. "OPG")
  simbol: string | null // pasangan terverifikasi (mis. "OPGUSDT")
  terdaftar: boolean
  saran: string[] // ticker mirip bila tak terdaftar (maks 5)
  harga: number | null
  ubah24Pct: number | null
  tinggi24: number | null
  rendah24: number | null
  volQv: number | null // quote volume 24 jam (USDT)
  faktor: CoinFactors | null // 8 faktor arena (matematika sama)
  vonis: { arah: 'BUY' | 'SELL' | 'TUNGGU'; keyakinan: number; alasan: string } | null
  proyeksi: ProyeksiInfo | null // V297b: rentang harapan hari ini (ATR)
  posisi: PosisiInfo | null // V297b: vonis posisi pemilik (cut-loss/tahan)
  mintaEntry: boolean // pemilik sebut posisi/cut-loss TANPA harga entry
  yakinTakTerdaftar: boolean // pemeriksa keanggotaan Binance BENAR-BENAR menjawab (bukan flake jaringan)
  pnlKasar: string | null // PnL dari harga-saja saat data pendalam flake (V297b)
  sumber: string
  waktu: string
}

// ---------- V297b: PROYEKSI HARI-INI & VONIS POSISI ----------

export interface ProyeksiInfo {
  openHariIni: number
  highSejauhIni: number
  lowSejauhIni: number
  atrAbs: number
  atrPct: number
  bandBawah: number // open − 1×ATR
  bandAtas: number // open + 1×ATR
  bandAtas2: number // open + 1,5×ATR (perpanjangan breakout)
  dukungan: number[]
  resistensi: number[]
}

export interface PosisiInfo {
  arah: 'LONG' | 'SHORT'
  entry: number
  pnlBrutoPct: number
  pnlNetPct: number // setelah estimasi fee+slip 0,29% satu putaran
  stopSaran: number
  vonis: 'CUT-LOSS' | 'TAHAN' | 'TAHAN-KUNCI-UNTUNG' | 'SIAP-KELUAR'
  alasan: string
}

/** Ambil harga entry & arah posisi dari pertanyaan bebas ("buy/beli di 0.1475", "short @x"). */
export function ekstrakPosisi(q: string): { arah: 'LONG' | 'SHORT' | null; entry: number | null } {
  const s = (q || '').toLowerCase()
  const arah = /\b(short|shortsell|sell short|jual kosong|jual-kosong)\b/.test(s)
    ? 'SHORT'
    : /\b(buy|beli|long)\b/.test(s)
      ? 'LONG'
      : null
  let entry: number | null = null
  const m = s.match(/(?:di|@|entry|masuk|beli|buy)[^\d]{0,20}?(\d+(?:[.,]\d+)?)/)
  if (m) entry = parseFloat(m[1].replace(',', '.'))
  return { arah, entry }
}

/** ATR absolut (bukan persen) — untuk hitung level stop & pita rentang. */
function atrAbsolut(candles: { high: number; low: number; close: number }[], period = 14): number {
  if (candles.length < 2) return 0
  const n = Math.min(period, candles.length - 1)
  let sum = 0
  for (let i = candles.length - n; i < candles.length; i++) {
    const c = candles[i]
    const p = candles[i - 1] ?? c
    sum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))
  }
  return sum / n
}

function rapih(v: number): number {
  return Number(v.toPrecision(5))
}

function hitungProyeksi(
  candles: { open: number; high: number; low: number; close: number }[],
  now: number,
): ProyeksiInfo {
  const hari = candles[candles.length - 1] // candle hari ini (belum tutup)
  const kemarin = candles[candles.length - 2] ?? hari
  const atr = atrAbsolut(candles, 14)
  const open = hari.open
  const dukungan = [...new Set([rapih(hari.low), rapih(now - atr), rapih(kemarin.low)])]
    .filter((v) => v > 0 && v < now * 1.02)
    .sort((a, b) => b - a)
  const resistensi = [...new Set([rapih(hari.high), rapih(open + 1.5 * atr), rapih(kemarin.high)])]
    .filter((v) => v > now * 0.98)
    .sort((a, b) => a - b)
  return {
    openHariIni: rapih(open),
    highSejauhIni: rapih(hari.high),
    lowSejauhIni: rapih(hari.low),
    atrAbs: rapih(atr),
    atrPct: now > 0 ? rapih((atr / now) * 100) : 0,
    bandBawah: rapih(open - atr),
    bandAtas: rapih(open + atr),
    bandAtas2: rapih(open + 1.5 * atr),
    dukungan,
    resistensi,
  }
}

function hitungPosisi(
  arah: 'LONG' | 'SHORT',
  entry: number,
  now: number,
  atr: number,
  pro: ProyeksiInfo,
  strukturNaik: boolean,
  strukturTurun: boolean,
): PosisiInfo {
  const bruto = arah === 'LONG' ? ((now - entry) / entry) * 100 : ((entry - now) / entry) * 100
  const net = bruto - 0.29 // estimasi fee 0,12%×2 + slip
  const stop = arah === 'LONG' ? entry - 1.5 * atr : entry + 1.5 * atr
  let vonis: PosisiInfo['vonis']
  let alasan: string
  if (arah === 'LONG') {
    if (now <= stop) {
      vonis = 'CUT-LOSS'
      alasan = `harga ${rapih(now)} sudah menembus stop 1,5×ATR (${rapih(stop)}) — hipotesis beli TERBUKTI patah; keluar, jangan menahan harapan`
    } else if (strukturNaik) {
      if (pro.lowSejauhIni > entry) {
        vonis = 'TAHAN-KUNCI-UNTUNG'
        alasan = `struktur naik utuh & low hari ini (${pro.lowSejauhIni}) masih di atas entry — posisi untung ${bruto >= 0 ? '+' : ''}${bruto.toFixed(2)}%; geser stop ke sedikit di bawah low hari ini (≈${rapih(pro.lowSejauhIni * 0.995)}) agar sisa risiko kecil`
      } else {
        vonis = 'TAHAN'
        alasan = `struktur naik utuh (harga > EMA20 > EMA50) dan stop 1,5×ATR (${rapih(stop)}) belum tersentuh — belum ada alasan keluar; patuhi stop`
      }
    } else {
      vonis = 'SIAP-KELUAR'
      alasan = `struktur naik MELEMAH (EMA patah/momentum mundur) sementara posisi ${bruto >= 0 ? '+' : ''}${bruto.toFixed(2)}% — siapkan keluar bila EMA20 ditembus berikutnya`
    }
  } else {
    const stopS = entry + 1.5 * atr
    if (now >= stopS) {
      vonis = 'CUT-LOSS'
      alasan = `harga ${rapih(now)} menembus stop short 1,5×ATR (${rapih(stopS)}) — hipotesis short TERBUKTI patah; tutup posisi, harga naik bukan alasan menambah`
    } else if (strukturTurun) {
      vonis = 'TAHAN'
      alasan = `struktur turun masih utuh (harga < EMA20 < EMA50) dan stop short (${rapih(stopS)}) belum tersentuh — patuhi stop`
    } else {
      vonis = 'SIAP-KELUAR'
      alasan = `struktur turun MELEMAH sementara harga melawan posisi (${bruto >= 0 ? '+' : ''}${bruto.toFixed(2)}%) — kuncian kecil lebih murah daripada harapan`
    }
  }
  return { arah, entry, pnlBrutoPct: rapih(bruto), pnlNetPct: rapih(net), stopSaran: rapih(stop), vonis, alasan }
}

// Kata yang TIDAK boleh dianggap ticker koin (bahasa sehari-hari /
// stablecoin yang ditanyakan sebagai kata, bukan sebagai koin).
const BUKAN_KOIN = new Set([
  'USDT', 'USDC', 'USD', 'BUSD', 'TUSD', 'FDUSD', 'DAI', 'USDE', 'EUR',
  'KOIN', 'COIN', 'TOKEN', 'TICKER', 'SIMBOL', 'PAIR', 'HARGA', 'PASAR',
  'DAN', 'YANG', 'APA', 'ITU', 'INI', 'DIA', 'BAGAIMANA', 'GIMANA',
  'SEKARANG', 'HARI', 'LAGI', 'SUDAH', 'BELUM', 'PERIKSA', 'CEK',
  'ANALISA', 'ANALISIS', 'BEDAH', 'LAPORAN', 'PROFIT', 'RUGI', 'BUY', 'SELL',
  // kata sehari-hari yang sering berdampingan dengan angka harga
  'BAWAH', 'ATAS', 'SEKITAR', 'DEKAT', 'DARI', 'SAMPAI', 'DENGAN', 'UNTUK',
  'SAJA', 'AJA', 'DULU', 'NANTI', 'BESOK', 'KEMARIN', 'PAGI', 'SIANG',
  'SORE', 'MALAM', 'JAM', 'MENIT', 'DETIK', 'LEVEL', 'ZONA', 'SUPPORT',
  'RESISTEN', 'KALAU', 'KALO', 'BILA', 'JIKA', 'TAPI', 'OKE', 'OK', 'YA',
  'GAK', 'NGGAK', 'TIDAK', 'BUKAN', 'JANGAN', 'HARUS', 'BISA', 'BAKAL',
  'MAU', 'MAKIN', 'JADI', 'KE', 'BANYAK', 'SEDIKIT', 'MASUK', 'KELUAR',
  'POSISI', 'LONG', 'SHORT', 'CUT', 'CUTLOSS', 'HOLD', 'TAHAN', 'PEGANG',
  'ENTRY', 'MENAMBAH', 'HARAPAN', 'STRUKTUR', 'REZIM', 'MOMENTUM',
])

/**
 * Kandidat ticker dari pertanyaan bebas — berjenjang keyakinannya.
 * TINGGI: "koin opg", "OPG" kapital, "di opg 0.1475", "opgusdt".
 * RENDAH : kata kecil lain (hanya dipakai bila BENAR-BENAR terbukti di Binance).
 */
export function kandidatTicker(q: string): { tinggi: string[]; rendah: string[] } {
  const s = q || ''
  const tinggi: string[] = []
  const rendah: string[] = []
  const push = (arr: string[], t: string | undefined | null) => {
    if (!t) return
    const u = t.toUpperCase()
    if (u.length < 2 || u.length > 12 || BUKAN_KOIN.has(u)) return
    if (!tinggi.includes(u) && !rendah.includes(u)) arr.push(u)
  }
  const m1 = s.match(/(?:koin|coin|token|ticker|simbol|pair)\s+(?:bernama\s+)?([a-z0-9]{2,12})/i)
  if (m1) push(tinggi, m1[1])
  const m2 = s.match(/\b([A-Z]{2,12})\b/)
  if (m2) push(tinggi, m2[1])
  // ticker terjepit antara penanda harga dan angka: "di opg 0.1475", "@sol 150", "entry btc 95000"
  const re3 = /(?:di|@|entry|masuk|buy|beli|short|jual)\s+([a-z]{2,10})\s+(?=\d)/gi
  let m3: RegExpExecArray | null
  while ((m3 = re3.exec(s)) !== null) push(tinggi, m3[1])
  // pasangan eksplisit ditulis lengkap: "opgusdt"
  const m4 = s.match(/\b([a-z]{2,10}usdt)\b/i)
  if (m4) push(tinggi, m4[1])
  // keyakinan rendah: kata kecil lain (hanya dipakai bila terbukti terdaftar)
  const re5 = /\b([a-z]{3,10})\b/gi
  let m5: RegExpExecArray | null
  while ((m5 = re5.exec(s)) !== null) push(rendah, m5[1])
  return { tinggi, rendah }
}

/** Ambil kandidat ticker koin dari pertanyaan bebas (paling yakin pertama). */
export function ekstrakTicker(q: string): string | null {
  const { tinggi } = kandidatTicker(q)
  return tinggi[0] ?? null
}

// ---- daftar simbol Binance (cache 10 menit, untuk validasi + saran) ----
let syCache: { at: number; set: Set<string> } | null = null

async function daftarSimbol(): Promise<Set<string>> {
  if (syCache && Date.now() - syCache.at < 10 * 60_000) return syCache.set
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 15_000)
  try {
    const r = await fetch('https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT', {
      cache: 'no-store',
      signal: ctl.signal,
    })
    if (!r.ok) throw new Error(`exchangeInfo HTTP ${r.status}`)
    const d = (await r.json()) as { symbols?: { symbol: string; status: string }[] }
    const set = new Set((d.symbols ?? []).filter((s) => s.status === 'TRADING').map((s) => s.symbol))
    if (set.size > 100) syCache = { at: Date.now(), set }
    return set
  } finally {
    clearTimeout(t)
  }
}

/** Verifikasi keberadaan pasangan lewat ticker kecil (fallback bila daftar simbol flake). */
async function tickerAda(simbol: string): Promise<boolean> {
  try {
    const ctl = new AbortController()
    const tm = setTimeout(() => ctl.abort(), 8000)
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${simbol}`, {
      cache: 'no-store',
      signal: ctl.signal,
    })
    clearTimeout(tm)
    return r.ok
  } catch {
    return false
  }
}

async function resolveSimbol(t: string): Promise<{ simbol: string | null; saran: string[]; listOk: boolean }> {
  let set: Set<string>
  try {
    set = await daftarSimbol()
  } catch {
    // daftar simbol tak terjangkau → verifikasi LANGSUNG lewat ticker kecil
    // (jangan pernah mengklaim "tidak terdaftar" tanpa bukti)
    const pas = `${t}USDT`
    if (await tickerAda(pas)) return { simbol: pas, saran: [], listOk: false }
    if (t.endsWith('USDT') && (await tickerAda(t))) return { simbol: t, saran: [], listOk: false }
    return { simbol: null, saran: [], listOk: false }
  }
  if (set.has(t)) return { simbol: t, saran: [], listOk: true } // pengguna sudah menulis pasangan penuh
  const pas = `${t}USDT`
  if (set.has(pas)) return { simbol: pas, saran: [], listOk: true }
  // tak terdaftar → kumpulkan ticker mirip agar jawaban tetap membantu
  const semua = [...set].filter((s) => s.endsWith('USDT'))
  const mulai = semua.filter((s) => s.startsWith(t)).slice(0, 3)
  const mengandung = semua.filter((s) => !mulai.includes(s) && s.includes(t)).slice(0, 2)
  return { simbol: null, saran: [...mulai, ...mengandung], listOk: true }
}
/** Vonis arah biner dari skor transparan (filosofi sama dengan arena). */
function vonisKoin(f: CoinFactors, qv: number): { arah: 'BUY' | 'SELL' | 'TUNGGU'; keyakinan: number; alasan: string } {
  let s = 0
  s += f.emaAlign >= 1 ? 1.5 : f.emaAlign > 0 ? 0.5 : -1.5
  s += f.mom7 > 0 ? 1 : -1
  s += f.mom30 > 0 ? 0.5 : -0.5
  s += f.rsi >= 48 && f.rsi <= 68 ? 1 : f.rsi > 78 ? -1.5 : f.rsi < 30 ? -0.5 : 0
  s += f.distHigh > -5 ? 0.5 : f.distHigh < -25 ? -0.5 : 0
  const likuid = qv >= 5_000_000
  const arah: 'BUY' | 'SELL' | 'TUNGGU' = s >= 2 ? 'BUY' : s <= -1.5 ? 'SELL' : 'TUNGGU'
  const keyakinan = Math.max(20, Math.min(85, Math.round(40 + s * 8 + (likuid ? 4 : -10) + (f.volSurge > 1.3 ? 3 : 0))))
  const alasan =
    `EMA ${f.emaAlign >= 1 ? 'tersusun naik' : f.emaAlign > 0 ? 'setengah tersusun' : 'patah'}, ` +
    `mom7 ${f.mom7 >= 0 ? '+' : ''}${f.mom7.toFixed(1)}%, mom30 ${f.mom30 >= 0 ? '+' : ''}${f.mom30.toFixed(1)}%, ` +
    `RSI ${f.rsi.toFixed(0)}, jarak puncak60 ${f.distHigh.toFixed(1)}%, ` +
    `vol ${qv >= 1e6 ? (qv / 1e6).toFixed(0) + ' jt' : qv.toFixed(0)} USDT${likuid ? ' (likuid)' : ' (LIKUIDITAS TIPIS — hati-hati)'}.`
  return { arah, keyakinan, alasan }
}

// ---- klines BTC untuk korelasi (cache 10 menit — hemat weight Binance) ----
let btcCache: { at: number; data: Awaited<ReturnType<typeof getKlines>> } | null = null
async function btcKlines(): Promise<Awaited<ReturnType<typeof getKlines>>> {
  if (btcCache && Date.now() - btcCache.at < 10 * 60_000) return btcCache.data
  const d = await getKlines('BTCUSDT')
  btcCache = { at: Date.now(), data: d }
  return d
}

/**
 * Bedah koin dari pertanyaan bebas. Return null bila pertanyaan
 * tidak memuat kandidat ticker sama sekali.
 */
export async function bedahKoin(q: string): Promise<BedahKoin | null> {
  const { tinggi, rendah } = kandidatTicker(q)
  if (!tinggi.length && !rendah.length) return null
  const dasar: BedahKoin = {
    ditanya: tinggi[0] ?? rendah[0],
    simbol: null,
    terdaftar: false,
    saran: [],
    harga: null,
    ubah24Pct: null,
    tinggi24: null,
    rendah24: null,
    volQv: null,
    faktor: null,
    vonis: null,
    proyeksi: null,
    posisi: null,
    mintaEntry: false,
    yakinTakTerdaftar: false,
    pnlKasar: null,
    sumber: 'Binance spot (real-time)',
    waktu: new Date().toISOString(),
  }

  // Uji kandidat BERURUTAN ke Binance — yang pertama terbukti terdaftar dipakai.
  // Kandidat keyakinan-rendah hanya boleh menang bila TERBUKTI terdaftar.
  let simbol: string | null = null
  let saran: string[] = []
  let listOk = false
  let dipakai = tinggi[0] ?? rendah[0]
  const adaKandidatTinggi = tinggi.length > 0
  for (const k of [...tinggi, ...rendah].slice(0, 5)) {
    const r = await resolveSimbol(k)
    if (r.simbol) {
      simbol = r.simbol
      saran = r.saran
      listOk = r.listOk
      dipakai = k
      break
    }
    if (r.listOk) listOk = true // pemeriksa keanggotaan benar-benar menjawab: kandidat ini memang tak terdaftar
    if (!saran.length) saran = r.saran
  }
  if (!simbol) {
    // tidak ada kandidat yang terbukti — laporkan jujur HANYA bila ada
    // kandidat keyakinan-tinggi; kandidat rendah dibiarkan lewat tanpa bedah
    if (!adaKandidatTinggi) return null
    return { ...dasar, ditanya: dipakai, saran, yakinTakTerdaftar: listOk }
  }

  try {
    // 1) TICKER — 2 percobaan (flake/rate-limit sesekali terjadi)
    type Tk = { lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }
    let tk: Tk | null = null
    for (const w of [0, 2000]) {
      if (w) await new Promise((r) => setTimeout(r, w))
      try {
        const ctl = new AbortController()
        const tm = setTimeout(() => ctl.abort(), 12_000)
        const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${simbol}`, {
          cache: 'no-store',
          signal: ctl.signal,
        })
        clearTimeout(tm)
        if (!r.ok) throw new Error(`ticker HTTP ${r.status}`)
        tk = (await r.json()) as Tk
        break
      } catch {
        tk = null
      }
    }
    if (!tk) {
      // harga pun tak terjangkau — jangan mengarang apa pun
      const mintaPos = /cutloss|cut loss|cut-loss|posisi|tahan|pegang|hold/i.test(q)
      return { ...dasar, simbol, terdaftar: true, yakinTakTerdaftar: true, mintaEntry: mintaPos }
    }
    const harga = Number(tk.lastPrice)
    const qv = Number(tk.quoteVolume)

    // 2) KLINES — 2 percobaan; BTC ter-cache
    let candles: Awaited<ReturnType<typeof getKlines>> = []
    try {
      for (const w of [0, 2000]) {
        if (w) await new Promise((r) => setTimeout(r, w))
        try {
          candles = await getKlines(simbol)
          if (candles.length) break
        } catch {
          candles = []
        }
      }
    } catch {
      candles = []
    }
    if (!candles.length) {
      // DEGRADED-TAPI-JUJUR: harga nyata ada → PnL kasar tetap dihitung;
      // vonis arah TIDAK diberikan tanpa data pendalam
      const { arah, entry } = ekstrakPosisi(q)
      let pnlKasar: string | null = null
      if (entry !== null && arah && harga > 0) {
        const bruto = arah === 'LONG' ? ((harga - entry) / entry) * 100 : ((entry - harga) / entry) * 100
        pnlKasar = `${arah} entry ${entry}: PnL bruto ${bruto >= 0 ? '+' : ''}${bruto.toFixed(2)}% (harga sekarang ${harga})`
      }
      const mintaPos = /cutloss|cut loss|cut-loss|posisi|tahan|pegang|hold/i.test(q)
      return {
        ...dasar,
        simbol,
        terdaftar: true,
        harga,
        ubah24Pct: Number(tk.priceChangePercent),
        tinggi24: Number(tk.highPrice),
        rendah24: Number(tk.lowPrice),
        volQv: qv,
        pnlKasar,
        mintaEntry: mintaPos && entry === null,
      }
    }

    const btcCandles = await btcKlines().catch(() => [] as Awaited<ReturnType<typeof getKlines>>)
    const faktor = computeFactors(simbol, candles, btcCandles)

    // V297b: proyeksi hari ini + vonis posisi pemilik (bila ditanya)
    let proyeksi: ProyeksiInfo | null = null
    let posisi: PosisiInfo | null = null
    const mintaRange = /naik|range|target|proyeksi|prediksi|low|high|tinggi|hari ini/i.test(q)
    const mintaPos = /cutloss|cut loss|cut-loss|posisi|tahan|pegang|hold/i.test(q)
    const { arah, entry } = ekstrakPosisi(q)
    if (candles.length >= 15 && harga > 0 && (mintaRange || mintaPos || entry !== null)) {
      proyeksi = hitungProyeksi(candles, harga)
      if (entry !== null && arah) {
        const closes = candles.map((c) => c.close)
        const e20 = ema(closes, 20)
        const e50 = ema(closes, 50)
        const last = closes[closes.length - 1]
        posisi = hitungPosisi(
          arah,
          entry,
          harga,
          proyeksi.atrAbs,
          proyeksi,
          last > e20 && e20 > e50,
          last < e20 && e20 < e50,
        )
      }
    }

    return {
      ...dasar,
      simbol,
      terdaftar: true,
      harga,
      ubah24Pct: Number(tk.priceChangePercent),
      tinggi24: Number(tk.highPrice),
      rendah24: Number(tk.lowPrice),
      volQv: qv,
      faktor,
      vonis: faktor ? vonisKoin(faktor, qv) : null,
      proyeksi,
      posisi,
      mintaEntry: mintaPos && posisi === null,
    }
  } catch {
    // koin terdaftar tapi data lewat gagal diambil — jujur, jangan mengarang
    return { ...dasar, simbol, terdaftar: true }
  }
}

/** Blok teks untuk prompt LLM — angka nyata + larangan keras salah sasaran. */
export function blokBedaKoin(b: BedahKoin): string {
  if (!b.terdaftar) {
    if (!b.yakinTakTerdaftar) {
      return `KOIN YANG DITANYAKAN PEMILIK: "${b.ditanya}" — pemeriksa keanggotaan Binance SEDANG TAK TERJANGKAU (bukan berarti koin tidak ada). Katakan jujur bahwa data pemeriksaan sedang bermasalah, sarankan mencoba lagi sebentar. DILARANG mengarang data koin ini atau menjawab dengan koin lain.`
    }
    return `KOIN YANG DITANYAKAN PEMILIK: "${b.ditanya}" — TIDAK TERDAFTAR sebagai pasangan spot aktif di Binance (pemeriksa keanggotaan sudah benar-benar menjawab).
WAJIB: katakan jujur bahwa koin ini tidak kamu temukan di Binance spot. DILARANG mengarang ticker pengganti atau menjawab dengan koin lain yang mirip (ini kesalahan fatal yang pernah terjadi).${b.saran.length ? ` Ticker mirip yang sah: ${b.saran.join(', ')} — boleh disebut SEBAGAI SARAN saja.` : ''}`
  }
  if (!b.vonis || !b.faktor) {
    return `KOIN YANG DITANYAKAN: ${b.simbol ?? b.ditanya} — terdaftar di Binance tapi data pendalamnya SEDANG TAK TERJANGKAU.${b.pnlKasar ? ` Yang masih bisa disampaikan dari harga nyata: ${b.pnlKasar}.` : ''}
WAJIB: katakan jujur bahwa analisis dalam sedang bermasalah dan sarankan coba lagi sebentar. DILARANG KERAS memberi vonis BUY/SELL/CUT-LOSS/TAHAN tanpa data lengkap — vonis tanpa data adalah karangan; jangan mengarang angka.`
  }
  const f = b.faktor
  const posisiTeks = b.posisi
    ? `
- VONIS MESIN POSISI = KEPUTUSAN FINAL YANG WAJIB KUSAMPAIKAN APA ADANYA (dilarang membalik/mengganti/menghaluskannya; boleh menambah nuansa risiko): ${b.posisi.vonis} — entry ${b.posisi.entry} ${b.posisi.arah} | PnL bruto ${b.posisi.pnlBrutoPct >= 0 ? '+' : ''}${b.posisi.pnlBrutoPct}% (net ≈ ${b.posisi.pnlNetPct}% setelah ±0,29% fee+slip) | stop disiplin 1,5×ATR: ${b.posisi.stopSaran} | alasan mesin: ${b.posisi.alasan}
- Hukum arena: cut-loss hanya untuk saat hipotesis masuk PATAH (bukan karena harga goyah); bila vonis TAHAN-KUNCI-UNTUNG, sampaikan level stop baru dengan jelas.`
    : b.mintaEntry
      ? `
- PEMILIK menyebut posisi/cut-loss TANPA harga entry — minta harga entry & arah posisinya dengan sopan; JANGAN mengarang angka posisi.`
      : ''
  const proyeksiTeks = b.proyeksi
    ? `
- PROYEKSI HARI INI (probabilistik dari ATR ${b.proyeksi.atrAbs} ≈ ${b.proyeksi.atrPct}% — WAJIB disebut "proyeksi, bukan jaminan"): open ${b.proyeksi.openHariIni} | high sejauh ini ${b.proyeksi.highSejauhIni} | low sejauh ini ${b.proyeksi.lowSejauhIni} | wilayah wajar (open±1×ATR): ${b.proyeksi.bandBawah}–${b.proyeksi.bandAtas} | perpanjangan bila breakout: ${b.proyeksi.bandAtas2} | dukungan: ${b.proyeksi.dukungan.join(' → ')} | resistensi: ${b.proyeksi.resistensi.join(' → ')}`
    : ''
  return `BEDAH KOIN YANG DITANYAKAN PEMILIK: ${b.simbol} — TICKER SAH-SATUNYA YANG BOLEH KAMU TULIS ADALAH "${b.simbol}" PERSIS BEGITU (menulis ticker lain apalagi yang mirip = pelanggaran fatal). SEMUA angka tentang koin ini WAJIB dari blok ini (Binance spot, dihitung detik ini).
- Harga sekarang: ${b.harga} USDT | 24 jam: ${b.ubah24Pct !== null ? (b.ubah24Pct >= 0 ? '+' : '') + b.ubah24Pct.toFixed(2) + '%' : '?'} | puncak/pen dalam 24 jam: ${b.tinggi24}/${b.rendah24}
- Volume 24 jam: ${b.volQv !== null ? (b.volQv / 1e6).toFixed(1) + ' jt USDT' : '?'}
- Faktor arena (matematika sama dengan pick harian): mom7 ${f.mom7 >= 0 ? '+' : ''}${f.mom7.toFixed(1)}% | mom30 ${f.mom30 >= 0 ? '+' : ''}${f.mom30.toFixed(1)}% | RSI-14 ${f.rsi.toFixed(0)} | emaAlign ${f.emaAlign.toFixed(2)} | ATR ${f.atrPct.toFixed(1)}% | lonjakan vol ${f.volSurge.toFixed(2)}x | jarak puncak60 ${f.distHigh.toFixed(1)}% | korelasi BTC ${f.btcCorr.toFixed(2)}${proyeksiTeks}${posisiTeks}
- VONIS mesin (sudah dihitung, jangan diubah arahnya): ${b.vonis.arah} keyakinan ${b.vonis.keyakinan}% — ${b.vonis.alasan}
Narasikan laporan ini dengan strukturm (keputusan → bukti → risiko); angka tetap persis blok ini. Untuk pertanyaan posisi pribadi, VONIS MESIN POSISI yang berbicara sebagai keputusanmu — kamu boleh membingkai dan menambah risiko, TIDAK boleh membalik atau menggantinya.`
}
