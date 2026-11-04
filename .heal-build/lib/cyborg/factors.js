"use strict";
// ============================================================
// FAKTOR — 8 sinyal terukur dari candle REAL per koin.
// Semua faktor dinormalisasi ke skala komparatif ~[-1, +1]
// via peringkat lintas-universe (ranking z-style).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.FACTOR_LABEL = exports.FACTOR_IDS = void 0;
exports.computeFactors = computeFactors;
exports.rankNormalize = rankNormalize;
exports.factorBucket = factorBucket;
exports.coarseBucket = coarseBucket;
const market_1 = require("./market");
exports.FACTOR_IDS = ['mom7', 'mom30', 'emaAlign', 'rsi', 'volSurge', 'atrInv', 'distHigh', 'btcCorr'];
exports.FACTOR_LABEL = {
    mom7: 'Momentum 7h',
    mom30: 'Momentum 30h',
    emaAlign: 'Struktur EMA20/50',
    rsi: 'RSI-14',
    volSurge: 'Lonjakan Volume',
    atrInv: 'Volatilitas Terkendali',
    distHigh: 'Jarak dari Puncak 60h',
    btcCorr: 'Korelasi BTC',
};
function computeFactors(symbol, candles, btcCandles) {
    if (candles.length < 35)
        return null;
    const closes = candles.map((c) => c.close);
    const last = closes[closes.length - 1];
    const e20 = (0, market_1.ema)(closes, 20);
    const e50 = (0, market_1.ema)(closes, 50);
    const vols = candles.map((c) => c.quoteVolume);
    const volAvg20 = vols.slice(-21, -1).reduce((s, v) => s + v, 0) / 20;
    const volLast = vols[vols.length - 1];
    let high60 = 0;
    for (const c of candles.slice(-60))
        high60 = Math.max(high60, c.high);
    const btcRet = btcCandles.map((c) => c.close);
    const coinRets = [];
    for (let i = 1; i < closes.length; i++)
        coinRets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    const btcRets = [];
    for (let i = 1; i < btcRet.length; i++)
        btcRets.push((btcRet[i] - btcRet[i - 1]) / btcRet[i - 1]);
    return {
        symbol,
        mom7: (0, market_1.pctChange)(closes, 7),
        mom30: (0, market_1.pctChange)(closes, 30),
        emaAlign: e20 > e50 ? (last > e20 ? 1 : 0.4) : last < e20 ? -1 : -0.4,
        rsi: (0, market_1.rsi)(closes, 14),
        volSurge: volAvg20 > 0 ? volLast / volAvg20 : 1,
        atrPct: (0, market_1.atrPct)(candles, 14),
        distHigh: high60 > 0 ? ((last - high60) / high60) * 100 : 0,
        btcCorr: (0, market_1.corr)(coinRets, btcRets),
        close: last,
    };
}
/**
 * Normalisasi lintas koin: peringkat persentil ke [-1, +1].
 * Arah "bagus" konsisten: nilai tinggi = potensi BUY kuat,
 * KECUALI rsi (ekstrem atas = jenuh beli → skor turun) — ditangani
 * lewat transformasi berbentuk kubah (dome).
 */
function rankNormalize(factors) {
    const out = new Map();
    if (factors.length < 4)
        return out;
    const rankToScore = (values) => {
        const sorted = [...values.entries()].sort((a, b) => a[1] - b[1]);
        const pos = new Map();
        sorted.forEach(([sym], i) => pos.set(sym, i));
        const n = sorted.length;
        const res = new Map();
        for (const [sym, p] of pos)
            res.set(sym, n <= 1 ? 0 : (p / (n - 1)) * 2 - 1);
        return res;
    };
    const mk = (get) => {
        const m = new Map();
        for (const f of factors)
            m.set(f.symbol, get(f));
        return rankToScore(m);
    };
    const mom7 = mk((f) => f.mom7);
    const mom30 = mk((f) => f.mom30);
    const emaAlign = mk((f) => f.emaAlign);
    const volSurge = mk((f) => Math.min(f.volSurge, 4));
    const atrInv = mk((f) => -f.atrPct); // volatilitas rendah = lebih baik
    const distHigh = mk((f) => f.distHigh); // makin dekat puncak = kekuatan
    const btcCorr = mk((f) => -Math.abs(f.btcCorr)); // korelasi rendah = portofolio sehat
    // RSI: kubah — sweet spot 55-70 untuk trend, penalty ekstrem
    const rsiRaw = new Map();
    for (const f of factors) {
        const dome = 1 - Math.abs(f.rsi - 62) / 45; // puncak di RSI=62
        rsiRaw.set(f.symbol, Math.max(-1, dome));
    }
    const rsiScore = rankToScore(rsiRaw);
    for (const f of factors) {
        out.set(f.symbol, {
            mom7: mom7.get(f.symbol) ?? 0,
            mom30: mom30.get(f.symbol) ?? 0,
            emaAlign: emaAlign.get(f.symbol) ?? 0,
            rsi: rsiScore.get(f.symbol) ?? 0,
            volSurge: volSurge.get(f.symbol) ?? 0,
            atrInv: atrInv.get(f.symbol) ?? 0,
            distHigh: distHigh.get(f.symbol) ?? 0,
            btcCorr: btcCorr.get(f.symbol) ?? 0,
        });
    }
    return out;
}
/** Bucket kuantisasi faktor untuk sidik jari memori (anti-overlap). */
function factorBucket(norm) {
    return exports.FACTOR_IDS.map((id) => {
        const v = norm[id];
        return v > 0.33 ? 'P' : v < -0.33 ? 'N' : 'Z';
    }).join('');
}
/**
 * BUCKET KASAR (UPGRADE V4 — memori berjenjang): hanya 3 faktor penggerak
 * (momentum, volume, struktur). 27 kombinasi vs 6561 bucket halus — ingatan
 * terisi cepat sehingga bisa DIBACA saat keputusan, bukan sekadar disimpan.
 */
function coarseBucket(norm) {
    if (!norm)
        return 'ZZZ';
    const s = (id) => ((norm[id] ?? 0) > 0.2 ? 'P' : (norm[id] ?? 0) < -0.2 ? 'N' : 'Z');
    return `${s('mom7')}${s('volSurge')}${s('emaAlign')}`;
}
