// Uji logika V298-SASARAN-LIMA dengan data Binance nyata (node, tanpa browser)
import https from 'https';
function ambil(url, timeoutMs = 15000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), timeoutMs);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let d = ''; r.on('data', (c) => (d += c));
      r.on('end', () => { clearTimeout(t); if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode)); try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', (e) => { clearTimeout(t); rej(e); });
  });
}
function emaLokal(v, period) { if (!v.length) return NaN; const k = 2 / (period + 1); let e = v[0]; for (let i = 1; i < v.length; i++) e = v[i] * k + e * (1 - k); return e; }
function rsiLokal(closes, period) {
  if (closes.length < period + 1) return 50;
  let gain = 0, loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) gain += d; else loss -= d; }
  if (loss === 0) return 100;
  const rs = (gain / period) / (loss / period);
  return 100 - 100 / (1 + rs);
}
function atrLokal(kl, period) {
  const n = Math.min(period + 1, kl.length); if (kl.length < 2) return 0;
  let sum = 0; const start = Math.max(1, kl.length - n + 1);
  for (let i = start; i < kl.length; i++) { const c = kl[i], p = kl[i - 1] || c; const tr = Math.max(c[2] - c[3], Math.abs(c[2] - p[4]), Math.abs(c[3] - p[4])); sum += tr; }
  const last = kl[kl.length - 1];
  return last[4] > 0 ? (sum / (kl.length - start) / last[4]) * 100 : 0;
}
function pctLokal(closes, n) { if (closes.length < n + 1) return 0; const now = closes[closes.length - 1], then = closes[closes.length - 1 - n]; return then > 0 ? ((now - then) / then) * 100 : 0; }
function s5faktor(kl, qv) {
  const closes = kl.map((r) => +r[4]);
  const vols = kl.map((r) => +r[7]);
  const last = closes[closes.length - 1];
  const e20 = emaLokal(closes, 20), e50 = emaLokal(closes, 50);
  const emaAlign = e20 > e50 ? (last > e20 ? 1 : 0.4) : (last < e20 ? -1 : -0.4);
  const mom7 = pctLokal(closes, 7), mom30 = pctLokal(closes, 30);
  const rsiV = rsiLokal(closes, 14);
  const atrV = atrLokal(kl, 14);
  let high60 = 0; for (const r of kl.slice(-60)) high60 = Math.max(high60, +r[2]);
  const distHigh = high60 > 0 ? ((last - high60) / high60) * 100 : 0;
  const volAvg20 = vols.slice(-21, -1).reduce((s, v) => s + v, 0) / 20 || 1;
  const volSurge = vols[vols.length - 1] / volAvg20;
  let s = 0;
  s += emaAlign >= 1 ? 1.5 : emaAlign > 0 ? 0.5 : -1.5;
  s += mom7 > 0 ? 1 : -1; s += mom30 > 0 ? 0.5 : -0.5;
  s += (rsiV >= 48 && rsiV <= 68) ? 1 : rsiV > 78 ? -1.5 : rsiV < 30 ? -0.5 : 0;
  s += distHigh > -5 ? 0.5 : distHigh < -25 ? -0.5 : 0;
  const likuid = qv >= 5e6;
  const arah = s >= 2 ? 'BUY' : s <= -1.5 ? 'SELL' : 'TUNGGU';
  const key = Math.max(20, Math.min(85, Math.round(40 + s * 8 + (likuid ? 4 : -10) + (volSurge > 1.3 ? 3 : 0))));
  let atrAbs = 0; const nA = Math.min(14, kl.length - 1);
  for (let i = kl.length - nA; i < kl.length; i++) { const c = kl[i], p = kl[i - 1] || c; atrAbs += Math.max(c[2] - c[3], Math.abs(c[2] - p[4]), Math.abs(c[3] - p[4])); }
  atrAbs /= nA;
  return { last, s, arah, key, mom7, mom30, rsiV, atrV, atrAbs, distHigh, volSurge, emaAlign, likuid };
}
const STABLE = new Set(['USDCUSDT','TUSDUSDT','FDUSDUSDT','USDPUSDT','DAIUSDT','EURUSDT','AEURUSDT','BUSDUSDT','USTUSDT','PAXGUSDT','EURIUSDT','XUSDUSDT','USD1USDT']);
(async () => {
  const semua = await ambil('https://api.binance.com/api/v3/ticker/24hr', 30000);
  const pool = semua.filter((t) => /USDT$/.test(t.symbol) && !/(UP|DOWN|BULL|BEAR)USDT$/.test(t.symbol)
    && !STABLE.has(t.symbol) && +t.quoteVolume >= 5e6 && +t.lastPrice > 0)
    .sort((a, b) => +b.quoteVolume - +a.quoteVolume).slice(0, 40);
  console.log('pool 40 terlikuid:', pool.length, '| contoh:', pool.slice(0, 6).map((t) => t.symbol).join(', '));
  const hasil = [];
  for (const t of pool.slice(0, 40)) {
    try {
      const kl = await ambil('https://api.binance.com/api/v3/klines?symbol=' + t.symbol + '&interval=1d&limit=70', 15000);
      if (!kl || kl.length < 25) continue;
      const f = s5faktor(kl, +t.quoteVolume);
      f.symbol = t.symbol; f.chg = +t.priceChangePercent;
      hasil.push(f);
    } catch (e) { /* jaring — biarkan */ }
  }
  console.log('terbedah:', hasil.length + '/40');
  const skorDesc = (a, b) => (b.s * b.s) - (a.s * a.s);
  const kunci = hasil.filter((f) => f.arah !== 'TUNGGU').sort(skorDesc);
  const sisa = hasil.filter((f) => f.arah === 'TUNGGU').sort(skorDesc);
  const butuh = 5 - Math.min(5, kunci.length);
  const lima = kunci.slice(0, 5).concat(butuh > 0 ? sisa.slice(0, butuh) : []);
  console.log('kandidat ber-arah:', kunci.length, '| TUNGGU:', sisa.length, '| lima final:', lima.length);
  lima.forEach((f, i) => {
    const ent = f.last;
    const tK = f.arah === 'SELL' ? ent - f.atrAbs : ent + f.atrAbs;
    const sK = f.arah === 'SELL' ? ent + Math.max(1.5 * f.atrAbs, ent * 0.015) : ent - Math.max(1.5 * f.atrAbs, ent * 0.015);
    console.log(`#${i + 1} ${f.arah.padEnd(4)} ${f.symbol.padEnd(13)} key ${String(f.key).padStart(3)}% skor ${(f.s >= 0 ? '+' : '') + f.s.toFixed(1).padStart(5)} | E ${ent.toPrecision(5)} → T ${tK.toPrecision(5)} → S ${sK.toPrecision(5)} | RSI ${f.rsiV.toFixed(0)} mom7 ${(f.mom7 >= 0 ? '+' : '') + f.mom7.toFixed(1)}%`);
  });
})().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
