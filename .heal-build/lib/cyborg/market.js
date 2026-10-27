"use strict";
// ============================================================
// V240 NAFAS-ARENA — Uplink data pasar REAL (Binance public API)
// Gratis tanpa key. Cache + TTL + circuit breaker.
// Semua waktu dalam UTC. Candle harian = openTime 00:00 UTC.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.tanpaSpot = tanpaSpot;
exports.getUniverse = getUniverse;
exports.getUniverseFutures = getUniverseFutures;
exports.getKlines = getKlines;
exports.getKlinesFutures = getKlinesFutures;
exports.getKlinesFuturesBulk = getKlinesFuturesBulk;
exports.getKlinesBulk = getKlinesBulk;
exports.getKlines4h = getKlines4h;
exports.getKlines4hBulk = getKlines4hBulk;
exports.mom4hFrom = mom4hFrom;
exports.getKlines1h = getKlines1h;
exports.getKlines1hDeep = getKlines1hDeep;
exports.getKlines1hDeepFutures = getKlines1hDeepFutures;
exports.getClimate = getClimate;
exports.getFundingRates = getFundingRates;
exports.ema = ema;
exports.rsi = rsi;
exports.atrPct = atrPct;
exports.pctChange = pctChange;
exports.corr = corr;
exports.dayOpenTs = dayOpenTs;
exports.dayOfTs = dayOfTs;
exports.todayUTC = todayUTC;
exports.addDays = addDays;
exports.candleForDay = candleForDay;
exports.candlesBefore = candlesBefore;
exports.dynamicUniverse = dynamicUniverse;
exports.getRegime = getRegime;
const FAPI = 'https://fapi.binance.com'; // futures: funding rate (info posisi massa)
// RANTAI HOST SPOT (hasil audit real-time r45): Binance mem-ban IP per-host
// sementara (HTTP 418, pulih ~90 dtk) — audit hidup 2026-09-23 membuktikan
// api1/api-gcp tetap sehat saat api.binance.com ter-ban. Sticky last-good:
// host sehat diingat agar tanpa latensi coba-coba; breaker terbuka hanya bila
// SEMUA host gagal.
const SPOT_HOSTS = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api-gcp.binance.com',
    'https://data-api.binance.vision',
];
const gSpot = globalThis;
function spotHostsUrut() {
    const last = gSpot.__arenaSpotHost;
    if (!last || !SPOT_HOSTS.includes(last))
        return [...SPOT_HOSTS];
    return [last, ...SPOT_HOSTS.filter((h) => h !== last)];
}
const KLINES_TTL = 30 * 60 * 1000; // 30 menit
const TICKER_TTL = 10 * 60 * 1000; // 10 menit
const HISTORY_DAYS = 140; // candle harian yang diambil
// Stablecoin / token leveraged yang tidak boleh masuk universe
const BLACKLIST_BASE = new Set([
    'USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'BUSD', 'EURI', 'EUR', 'AEUR',
    'USD1', 'USDE', 'USDS', 'PYUSD', 'PAXG', 'XUSD', 'USTC', 'BSCUSD',
]);
const g = globalThis;
function cacheMaps() {
    if (!g.__arenaKlineCache)
        g.__arenaKlineCache = new Map();
    if (!g.__arenaKline4hCache)
        g.__arenaKline4hCache = new Map();
    if (!g.__arenaKline1hCache)
        g.__arenaKline1hCache = new Map();
    if (!g.__arenaKline1hDeepCache)
        g.__arenaKline1hDeepCache = new Map();
    if (!g.__arenaKlineFutCache)
        g.__arenaKlineFutCache = new Map();
    if (!g.__arenaBreaker)
        g.__arenaBreaker = { openUntil: 0, fails: 0 };
    if (!g.__arenaBreakerFapi)
        g.__arenaBreakerFapi = { openUntil: 0, fails: 0 };
    if (!g.__arenaSimbolTanpaSpot)
        g.__arenaSimbolTanpaSpot = new Set();
    return g;
}
/** V301 — true bila simbol terbukti khusus-futures (spot 400). */
function tanpaSpot(sym) {
    return cacheMaps().__arenaSimbolTanpaSpot.has(sym);
}
async function bfetch(path, timeoutMs = 15000) {
    const c = cacheMaps();
    const breaker = c.__arenaBreaker;
    if (Date.now() < breaker.openUntil)
        throw new Error('circuit-open');
    // V301 — 400/404 = simbol tak ada (data-missing, BUKAN host rusak): catat
    // simbolnya jangan-hukum-breaker, agar koin khusus futures tidak membunuh
    // seluruh pipeline (pelajaran: AKEUSDT dkk membuka breaker → semua mati).
    const symDiPath = path.match(/[?&]symbol=([A-Z0-9]+)/)?.[1] ?? null;
    let errTerakhir;
    for (const host of spotHostsUrut()) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetch(host + path, { signal: ctrl.signal, cache: 'no-store' });
            clearTimeout(t);
            if (!res.ok) {
                if ((res.status === 400 || res.status === 404) && symDiPath) {
                    c.__arenaSimbolTanpaSpot.add(symDiPath);
                    throw new Error(`tanpa-spot ${symDiPath}`);
                }
                throw new Error(`binance ${res.status} ${path} @ ${host}`);
            }
            if (gSpot.__arenaSpotHost !== host)
                gSpot.__arenaSpotHost = host;
            breaker.fails = 0;
            return res;
        }
        catch (e) {
            clearTimeout(t);
            errTerakhir = e;
            const msg = String(e);
            if (msg.includes('tanpa-spot'))
                throw e; // deterministik — jangan coba host lain
            // 418/429 = ban/rate-limit host ini saja -> lompat ke host berikutnya
        }
    }
    // tanpa-spot = data-missing deterministik — TIDAK menghukum breaker
    if (String(errTerakhir).includes('tanpa-spot'))
        throw errTerakhir;
    const b = c.__arenaBreaker;
    b.fails++;
    if (b.fails >= 3)
        b.openUntil = Date.now() + 60_000;
    // V301 DIAGNOSA — jangan biarkan kegagalan semua host sunyi: catat penyebab
    // terakhir (418 ban / 429 limit / timeout / jaring) supaya bisa dibedah.
    console.warn(`[market] semua host spot gagal ${path}: ${String(errTerakhir).slice(0, 160)}`);
    throw errTerakhir;
}
// ---------- Ticker: universe koin USDT paling likuid ----------
async function getUniverse() {
    const c = cacheMaps();
    const hit = c.__arenaTickerCache;
    if (hit && Date.now() - hit.at < TICKER_TTL && hit.ok)
        return hit.data;
    const res = await bfetch('/api/v3/ticker/24hr');
    const raw = (await res.json());
    const items = [];
    for (const t of raw) {
        if (!t.symbol.endsWith('USDT'))
            continue;
        const base = t.symbol.slice(0, -4);
        if (/(UP|DOWN|BULL|BEAR)USDT$/.test(t.symbol))
            continue;
        if (BLACKLIST_BASE.has(base))
            continue;
        const qv = parseFloat(t.quoteVolume);
        if (!Number.isFinite(qv) || qv < 15_000_000)
            continue; // kewajiban likuiditas
        items.push({
            symbol: t.symbol,
            base,
            quoteVolume: qv,
            lastPrice: parseFloat(t.lastPrice),
            changePct: parseFloat(t.priceChangePercent),
        });
    }
    items.sort((a, b) => b.quoteVolume - a.quoteVolume);
    // pool lebar (150) — pumper yang sedang naik daun tidak boleh lolos dari radar;
    // universe dinamis top-40 dihitung per hari dari pool ini
    const top = items.slice(0, 150);
    c.__arenaTickerCache = { data: top, at: Date.now(), ok: true };
    return top;
}
// ---------- V301 — PINDAIAN FUTURES PENUH (hukum pemilik: "dari ribuan koin
// Binance Futures") ----------
// Seluruh pasang USDT-M PERPETUAL berstatus TRADING dipindai (tanpa saring
// likuiditas di tahap ini — angka "dipindai" = pindaian jujur). Stablecoin &
// token leveraged tetap dikeluarkan. Sumber: fapi exchangeInfo + ticker 24jam.
const FUT_UNIVERSE_TTL = 10 * 60 * 1000;
async function getUniverseFutures() {
    const c = cacheMaps();
    const hit = c.__arenaFutUniverseCache;
    if (hit && Date.now() - hit.at < FUT_UNIVERSE_TTL && hit.ok)
        return hit.data;
    const breaker = c.__arenaBreakerFapi;
    if (Date.now() < breaker.openUntil)
        throw new Error('circuit-open-fapi');
    // TAHAN-BANTING: 418/429 fapi = ban sementara (~90 dtk, bukti r45) —
    // coba ulang dengan jeda sebelum menyerah; dipindai terlalu penting
    // untuk hilang hanya karena satu denyut kena limit.
    let errTerakhir = null;
    for (let percobaan = 0; percobaan < 3; percobaan++) {
        if (percobaan > 0)
            await new Promise((r) => setTimeout(r, percobaan === 1 ? 3_000 : 8_000));
        try {
            const items = await ambilUniverseFutures();
            breaker.fails = 0;
            c.__arenaFutUniverseCache = { data: items, at: Date.now(), ok: true };
            return items;
        }
        catch (e) {
            errTerakhir = e;
        }
    }
    breaker.fails++;
    if (breaker.fails >= 3)
        breaker.openUntil = Date.now() + 60_000;
    throw errTerakhir;
}
async function ambilUniverseFutures() {
    const ambil = async (path) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15_000);
        try {
            const res = await fetch(FAPI + path, { signal: ctrl.signal, cache: 'no-store' });
            clearTimeout(t);
            if (!res.ok)
                throw new Error(`fapi ${res.status} ${path}`);
            return res.json();
        }
        catch (e) {
            clearTimeout(t);
            throw e;
        }
    };
    const [info, tickers] = await Promise.all([
        ambil('/fapi/v1/exchangeInfo'),
        ambil('/fapi/v1/ticker/24hr'),
    ]);
    const live = new Set();
    for (const s of info.symbols ?? []) {
        if (s.quoteAsset !== 'USDT')
            continue;
        if (s.status !== 'TRADING')
            continue;
        if (s.contractType !== 'PERPETUAL')
            continue;
        if (/(UP|DOWN|BULL|BEAR)USDT$/.test(s.symbol))
            continue;
        if (BLACKLIST_BASE.has(s.baseAsset))
            continue;
        live.add(s.symbol);
    }
    const items = [];
    for (const t of tickers) {
        if (!live.has(t.symbol))
            continue;
        const qv = parseFloat(t.quoteVolume);
        if (!Number.isFinite(qv))
            continue;
        items.push({
            symbol: t.symbol,
            base: t.symbol.slice(0, -4),
            quoteVolume: qv,
            lastPrice: parseFloat(t.lastPrice),
            changePct: parseFloat(t.priceChangePercent),
        });
    }
    items.sort((a, b) => b.quoteVolume - a.quoteVolume);
    return items;
}
// ---------- Klines harian per simbol (cache 30 menit) ----------
async function getKlines(symbol) {
    if (tanpaSpot(symbol))
        throw new Error(`tanpa-spot ${symbol}`);
    const c = cacheMaps();
    const hit = c.__arenaKlineCache.get(symbol);
    if (hit && Date.now() - hit.at < KLINES_TTL && hit.ok)
        return hit.data;
    const res = await bfetch(`/api/v3/klines?symbol=${symbol}&interval=1d&limit=${HISTORY_DAYS}`);
    const raw = (await res.json());
    const candles = raw.map((k) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        quoteVolume: parseFloat(k[7]),
    }));
    c.__arenaKlineCache.set(symbol, { data: candles, at: Date.now(), ok: true });
    return candles;
}
// ---------- V301 — Klines FUTURES (fallback utk simbol yang hanya ada di
// futures, tidak di spot) — format candle identik, cache terpisah ----------
async function getKlinesFutures(symbol) {
    const c = cacheMaps();
    const hit = c.__arenaKlineFutCache.get(symbol);
    if (hit && Date.now() - hit.at < KLINES_TTL && hit.ok)
        return hit.data;
    const breaker = c.__arenaBreakerFapi;
    if (Date.now() < breaker.openUntil)
        throw new Error('circuit-open-fapi');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    try {
        const res = await fetch(`${FAPI}/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=${HISTORY_DAYS}`, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(t);
        if (!res.ok)
            throw new Error(`fapi klines ${res.status} ${symbol}`);
        const raw = (await res.json());
        const candles = raw.map((k) => ({
            openTime: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            quoteVolume: parseFloat(k[7]),
        }));
        breaker.fails = 0;
        c.__arenaKlineFutCache.set(symbol, { data: candles, at: Date.now(), ok: true });
        return candles;
    }
    catch (e) {
        clearTimeout(t);
        breaker.fails++;
        if (breaker.fails >= 5)
            breaker.openUntil = Date.now() + 60_000;
        throw e;
    }
}
async function getKlinesFuturesBulk(symbols) {
    const out = new Map();
    const CONC = 5;
    const attempt = async (list) => {
        for (let i = 0; i < list.length; i += CONC) {
            const batch = list.slice(i, i + CONC);
            const results = await Promise.allSettled(batch.map((s) => getKlinesFutures(s)));
            batch.forEach((s, j) => {
                if (results[j].status === 'fulfilled')
                    out.set(s, results[j].value);
            });
        }
    };
    await attempt(symbols);
    const missing = symbols.filter((s) => !out.has(s));
    if (missing.length > 0) {
        await new Promise((r) => setTimeout(r, 1500));
        await attempt(missing);
    }
    return out;
}
async function getKlinesBulk(symbols) {
    const out = new Map();
    const CONC = 6;
    const attempt = async (list) => {
        for (let i = 0; i < list.length; i += CONC) {
            const batch = list.slice(i, i + CONC);
            const results = await Promise.allSettled(batch.map((s) => getKlines(s)));
            batch.forEach((s, j) => {
                if (results[j].status === 'fulfilled')
                    out.set(s, results[j].value);
            });
        }
    };
    await attempt(symbols);
    const missing = symbols.filter((s) => !out.has(s));
    if (missing.length > 0) {
        // circuit breaker bisa terbuka saat burst — beri napas, coba sekali lagi
        await new Promise((r) => setTimeout(r, 2000));
        await attempt(missing);
    }
    return out;
}
// ---------- Klines 4 JAM (UPGRADE V3 — sumber informasi intraday) ----------
// Bukti UJIAN #7: pick dengan momentum-24jam (4h) melemah (-5..0%) rata-rata
// -2.7% hit 38%, sedangkan 4h tenang/akselerasi +9-10% hit 58%. Data 4h
// memberi cyborg radar "leader mati intraday" yang tak terlihat dari 1d.
const KLINES4H_TTL = 15 * 60 * 1000; // 15 menit
const HISTORY_4H = 180; // 30 hari × 6 candle/hari
async function getKlines4h(symbol) {
    if (tanpaSpot(symbol))
        throw new Error(`tanpa-spot ${symbol}`);
    const c = cacheMaps();
    const hit = c.__arenaKline4hCache.get(symbol);
    if (hit && Date.now() - hit.at < KLINES4H_TTL && hit.ok)
        return hit.data;
    const res = await bfetch(`/api/v3/klines?symbol=${symbol}&interval=4h&limit=${HISTORY_4H}`);
    const raw = (await res.json());
    const candles = raw.map((k) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        quoteVolume: parseFloat(k[7]),
    }));
    c.__arenaKline4hCache.set(symbol, { data: candles, at: Date.now(), ok: true });
    return candles;
}
async function getKlines4hBulk(symbols) {
    const out = new Map();
    const CONC = 6;
    const todo = symbols;
    for (let i = 0; i < todo.length; i += CONC) {
        const batch = todo.slice(i, i + CONC);
        const results = await Promise.allSettled(batch.map((s) => getKlines4h(s)));
        batch.forEach((s, j) => {
            if (results[j].status === 'fulfilled')
                out.set(s, results[j].value);
        });
    }
    const missing = symbols.filter((s) => !out.has(s));
    if (missing.length > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        for (let i = 0; i < missing.length; i += CONC) {
            const batch = missing.slice(i, i + CONC);
            const results = await Promise.allSettled(batch.map((s) => getKlines4h(s)));
            batch.forEach((s, j) => {
                if (results[j].status === 'fulfilled')
                    out.set(s, results[j].value);
            });
        }
    }
    return out;
}
/**
 * Momentum 4 jam (24 jam) dari candle 4h yang SUDAH SELESAI sebelum titik
 * keputusan. Bebas kebocoran: candle yang masih berjalan (openTime >= cutoff)
 * tidak pernah ikut. Untuk hari historis cutoff = buka hari-D; untuk hari
 * hidup cutoff = buka candle 4h yang sedang berjalan.
 */
function mom4hFrom(candles4h, cutoffTs) {
    if (!candles4h)
        return 0;
    const done = candles4h.filter((c) => c.openTime < cutoffTs);
    if (done.length < 7)
        return 0;
    const cl = done.map((c) => c.close);
    const now = cl[cl.length - 1];
    const then = cl[cl.length - 7];
    return then > 0 ? ((now - then) / then) * 100 : 0;
}
// ---------- Klines 1 JAM (UPGRADE V4 — sparkline NADIR & radar halus) ----------
const KLINES1H_TTL = 15 * 60 * 1000; // 15 menit
const HISTORY_1H = 48; // 48 jam terakhir
async function getKlines1h(symbol) {
    if (tanpaSpot(symbol))
        throw new Error(`tanpa-spot ${symbol}`);
    const c = cacheMaps();
    const hit = c.__arenaKline1hCache.get(symbol);
    if (hit && Date.now() - hit.at < KLINES1H_TTL && hit.ok)
        return hit.data;
    const res = await bfetch(`/api/v3/klines?symbol=${symbol}&interval=1h&limit=${HISTORY_1H}`);
    const raw = (await res.json());
    const candles = raw.map((k) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        quoteVolume: parseFloat(k[7]),
    }));
    c.__arenaKline1hCache.set(symbol, { data: candles, at: Date.now(), ok: true });
    return candles;
}
// ---------- Klines 1 JAM DALAM (V250 WARISAN — GARCH/MC/VP butuh >= 130 jam) ----------
// 260 jam terakhir (≈ 11 hari) untuk mesin warisan organ besar. Cache terpisah
// dari sparkline 48 jam karena pemakaian & kedalaman berbeda.
const HISTORY_1H_DEEP = 260;
async function getKlines1hDeep(symbol) {
    if (tanpaSpot(symbol))
        throw new Error(`tanpa-spot ${symbol}`);
    const c = cacheMaps();
    const hit = c.__arenaKline1hDeepCache.get(symbol);
    if (hit && Date.now() - hit.at < KLINES1H_TTL && hit.ok)
        return hit.data;
    const res = await bfetch(`/api/v3/klines?symbol=${symbol}&interval=1h&limit=${HISTORY_1H_DEEP}`);
    const raw = (await res.json());
    const candles = raw.map((k) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        quoteVolume: parseFloat(k[7]),
    }));
    c.__arenaKline1hDeepCache.set(symbol, { data: candles, at: Date.now(), ok: true });
    return candles;
}
// V301 — 1h DALAM versi FUTURES untuk koin khusus-futures (warisan organ butuh
// 130+ lilin; tanpa ini koin futures-only tak pernah punya rencana pra-registrasi)
async function getKlines1hDeepFutures(symbol) {
    const c = cacheMaps();
    const hit = c.__arenaKlineFutCache.get('1h|' + symbol);
    if (hit && Date.now() - hit.at < KLINES1H_TTL && hit.ok)
        return hit.data;
    const breaker = c.__arenaBreakerFapi;
    // TAHAN-BANTING — ban fapi ~90 dtk: tunggu maksimal 2x sebelum menyerah,
    // agar koin khusus-futures tak menunggu denyut berikutnya hanya karena jendela.
    let errTerakhir = null;
    for (let i = 0; i < 2; i++) {
        if (Date.now() < breaker.openUntil)
            await new Promise((r) => setTimeout(r, Math.min(65_000, breaker.openUntil - Date.now() + 1_000)));
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15_000);
        try {
            const res = await fetch(`${FAPI}/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=${HISTORY_1H_DEEP}`, { signal: ctrl.signal, cache: 'no-store' });
            clearTimeout(t);
            if (!res.ok)
                throw new Error(`fapi klines ${res.status} ${symbol}`);
            const raw = (await res.json());
            const candles = raw.map((k) => ({
                openTime: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                quoteVolume: parseFloat(k[7]),
            }));
            breaker.fails = 0;
            c.__arenaKlineFutCache.set('1h|' + symbol, { data: candles, at: Date.now(), ok: true });
            return candles;
        }
        catch (e) {
            clearTimeout(t);
            errTerakhir = e;
            if (i === 0)
                await new Promise((r) => setTimeout(r, 20_000));
        }
    }
    breaker.fails++;
    if (breaker.fails >= 5)
        breaker.openUntil = Date.now() + 60_000;
    throw errTerakhir;
}
async function getClimate() {
    const c = cacheMaps();
    const hit = c.__arenaClimateCache;
    if (hit && Date.now() - hit.at < 30 * 60 * 1000 && hit.ok)
        return hit.data;
    const out = { fng: null, fngClass: null, mcapChange24h: null, btcDominance: null, at: new Date().toISOString() };
    const [fngRes, cgRes] = await Promise.allSettled([
        fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store', signal: AbortSignal.timeout(8000) }),
        fetch('https://api.coingecko.com/api/v3/global', { cache: 'no-store', signal: AbortSignal.timeout(8000) }),
    ]);
    if (fngRes.status === 'fulfilled' && fngRes.value.ok) {
        try {
            const j = (await fngRes.value.json());
            const d = j.data?.[0];
            if (d?.value) {
                out.fng = parseInt(d.value, 10) || null;
                out.fngClass = d.value_classification ?? null;
            }
        }
        catch { /* null-safe */ }
    }
    if (cgRes.status === 'fulfilled' && cgRes.value.ok) {
        try {
            const j = (await cgRes.value.json());
            out.mcapChange24h = j.data?.market_cap_change_percentage_24h_usd ?? null;
            out.btcDominance = j.data?.market_cap_percentage?.btc ?? null;
        }
        catch { /* null-safe */ }
    }
    c.__arenaClimateCache = { data: out, at: Date.now(), ok: out.fng !== null || out.mcapChange24h !== null };
    return out;
}
async function getFundingRates(symbols) {
    const c = cacheMaps();
    const hit = c.__arenaFundingCache;
    if (hit && Date.now() - hit.at < 15 * 60 * 1000 && hit.ok) {
        const filtered = new Map();
        for (const s of symbols) {
            const f = hit.data.get(s);
            if (f)
                filtered.set(s, f);
        }
        return filtered;
    }
    const breaker = c.__arenaBreakerFapi;
    if (Date.now() < breaker.openUntil)
        return new Map();
    const out = new Map();
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(`${FAPI}/fapi/v1/premiumIndex`, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(t);
        if (!res.ok)
            throw new Error(`fapi ${res.status}`);
        const raw = (await res.json());
        const want = new Set(symbols);
        for (const r of raw) {
            if (!r.symbol || !want.has(r.symbol))
                continue;
            const rate = parseFloat(r.lastFundingRate ?? '0');
            const markPrice = parseFloat(r.markPrice ?? '0');
            if (Number.isFinite(rate))
                out.set(r.symbol, { rate, markPrice });
        }
        breaker.fails = 0;
        c.__arenaFundingCache = { data: out, at: Date.now(), ok: true };
    }
    catch {
        breaker.fails++;
        if (breaker.fails >= 3)
            breaker.openUntil = Date.now() + 60_000;
    }
    return out;
}
function ema(values, period) {
    if (values.length === 0)
        return NaN;
    const k = 2 / (period + 1);
    let e = values[0];
    for (let i = 1; i < values.length; i++)
        e = values[i] * k + e * (1 - k);
    return e;
}
function rsi(closes, period = 14) {
    if (closes.length < period + 1)
        return 50;
    let gain = 0, loss = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        if (d >= 0)
            gain += d;
        else
            loss -= d;
    }
    if (loss === 0)
        return 100;
    const rs = gain / period / (loss / period);
    return 100 - 100 / (1 + rs);
}
function atrPct(candles, period = 14) {
    const n = Math.min(period + 1, candles.length);
    if (candles.length < 2)
        return 0;
    let sum = 0;
    const start = Math.max(1, candles.length - n + 1);
    for (let i = start; i < candles.length; i++) {
        const c = candles[i], p = candles[i - 1] ?? c;
        const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
        sum += tr;
    }
    const last = candles[candles.length - 1];
    return last.close > 0 ? (sum / (candles.length - start) / last.close) * 100 : 0;
}
function pctChange(closes, n) {
    if (closes.length < n + 1)
        return 0;
    const now = closes[closes.length - 1];
    const then = closes[closes.length - 1 - n];
    return then > 0 ? ((now - then) / then) * 100 : 0;
}
function corr(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 10)
        return 0;
    const x = a.slice(-n), y = b.slice(-n);
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - mx, dy = y[i] - my;
        sxy += dx * dy;
        sxx += dx * dx;
        syy += dy * dy;
    }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}
// candle openTime pada tanggal UTC tertentu
function dayOpenTs(day) {
    return Date.parse(`${day}T00:00:00.000Z`);
}
function dayOfTs(ts) {
    return new Date(ts).toISOString().slice(0, 10);
}
function todayUTC() {
    return new Date().toISOString().slice(0, 10);
}
function addDays(day, delta) {
    return dayOfTs(Date.parse(`${day}T00:00:00.000Z`) + delta * 86400000);
}
/**
 * Candle lengkap pada tanggal D (butuh close real: hanya valid jika
 * candle D sudah tutup, yaitu D < hari ini UTC).
 */
function candleForDay(candles, day) {
    const ts = dayOpenTs(day);
    return candles.find((c) => c.openTime === ts);
}
/** Candle-candle LENGKAP yang boleh dipakai untuk memutuskan hari D (openTime < D). */
function candlesBefore(candles, day) {
    const ts = dayOpenTs(day);
    return candles.filter((c) => c.openTime < ts);
}
/**
 * UNIVERSE DINAMIS per hari — inti UPGRADE V2 (bukti lab +90% → +146%).
 * Koin masuk sorotan tepat saat volumenya meledak; pumper baru tidak
 * lagi terlewat karena universe beku. Bebas kebocoran: memakai
 * quoteVolume candle TERAKHIR SEBELUM hari-D.
 */
function dynamicUniverse(klines, day, n) {
    const volRanked = [];
    for (const [sym, ks] of klines) {
        const before = candlesBefore(ks, day);
        if (before.length < 35)
            continue;
        volRanked.push({ sym, qv: before[before.length - 1].quoteVolume });
    }
    volRanked.sort((a, b) => b.qv - a.qv);
    const out = volRanked.slice(0, n).map((x) => x.sym);
    if (!out.includes('BTCUSDT'))
        out.unshift('BTCUSDT');
    return out;
}
// ---------- Rezim makro dari BTC + breadth ----------
async function getRegime(btcCandles, universeCloses) {
    const closes = btcCandles.map((c) => c.close);
    const e20 = ema(closes, 20);
    const e50 = ema(closes, 50);
    const atr = atrPct(btcCandles, 14);
    const mom7 = pctChange(closes, 7);
    let above = 0, counted = 0;
    for (const [, cl] of universeCloses) {
        if (cl.length < 20)
            continue;
        counted++;
        if (cl[cl.length - 1] > ema(cl, 20))
            above++;
    }
    const breadth = counted > 0 ? (above / counted) * 100 : 50;
    let regime;
    let note;
    if (mom7 < -7 && e20 < e50) {
        regime = 'JATUH';
        note = 'BTC jatuh tajam di bawah EMA50 — mode bertahan, BUY dibekukan.';
    }
    else if (e20 > e50 && mom7 > -1) {
        regime = 'TREND_NAIK';
        note = 'EMA20 > EMA50, momentum positif — mode ofensif terukur.';
    }
    else if (e20 < e50 && mom7 < -1) {
        regime = 'TREND_TURUN';
        note = 'Struktur turun — SELL/short bias, BUY selektif ketat.';
    }
    else {
        regime = 'SIDEWAYS';
        note = 'Konsolidasi — rotasi & mean-reversion dominan.';
    }
    return { regime, btcEma20: e20, btcEma50: e50, btcAtrPct: atr, btcMom7: mom7, breadth, note };
}
