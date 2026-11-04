// ============================================================
// LAB PUTARAN-6 — VERIFIKASI PAKET FINAL "V301 AKURASI-TAJAM"
// Konfigurasi persis seperti yang akan dipasang di produksi:
//   1. MIN-3 MUTLAK (pengisi slot)               [mandat pemilik + ret 2×]
//   2. TRIPLE + MOM-EXTREME + ATR-KETAT guard    [anti-crash, worst -35%]
//   3. SELL-KETAT adaptif (breadth<42/rezim↓)    [+2 poin hit era akhir]
//   4. KOMPAS-JUJUR: conf −10 saat breadth<45;
//      RSI>82&mom7>40 → conf −6 + tag (BUKAN tolak, pemenang besar hidup)
//   5. Penalti antrian tidak dipasang (terbukti tak menolong)
// Verifikasi kunci: 19 Sep ONE/G tetap masuk · 12 Okt STRK tertolak ·
// kalibrasi kompas hidup · worst pick tak lebih dari -35%.
// ============================================================
import { PrismaClient } from "@prisma/client";
import {
  getUniverse, getKlinesBulk, getKlines4hBulk, mom4hFrom,
  dynamicUniverse, candlesBefore, candleForDay, dayOpenTs, dayOfTs,
  getRegime, corr,
} from "../src/lib/cyborg/market";
import { computeFactors, rankNormalize, coarseBucket, type CoinFactors, type FactorId } from "../src/lib/cyborg/factors";
import { decidePredator, type GenomeV2, type Weights, type MemoryLookup, type MemEdge } from "../src/lib/cyborg/brain";

const db = new PrismaClient();
const UNIVERSE_SIZE = 40;

interface CtxLab { day: string; regime: Awaited<ReturnType<typeof getRegime>>; factors: CoinFactors[]; norm: Map<string, Record<FactorId, number>>; closes: Map<string, number[]>; m4h: Map<string, number> }

const guardProduksi = (f: CoinFactors, br: number, regime: string): string | null => {
  // 1) menempel puncak tanpa volume
  if (f.distHigh > -4 && f.volSurge < 1.3) return "GERBANG-PUNCAK: menempel puncak 60h tanpa volume";
  // 2) pump tanpa akar
  if (f.mom7 > 8 && f.mom30 < 2) return "GERBANG-AKAR: pump tanpa akar mom30";
  // 3) RSI jenuh tanpa tren
  if (f.rsi > 78 && f.emaAlign !== 1) return "GERBANG-RSI: jenuh tanpa tren";
  // 4) momentum ekstrem + ATR tinggi (crash berulang)
  if (f.mom7 > 35 && f.atrPct > 12) return "GERBANG-MOMEXT: momen ekstrem + ATR tinggi";
  // 5) ATR ketat saat pasar sempit
  if (br < 45 && f.atrPct > 11) return "GERBANG-ATR: ATR lebar di pasar sempit";
  return null;
};

function buatMemori(): MemoryLookup & { panen(r: string, s: string, b3: string, d: string, ret: number, hit: boolean): void } {
  const eps = new Map<string, { n: number; sum: number; hit: number }>();
  const coarse = new Map<string, { n: number; sum: number; hit: number }>();
  const rez = new Map<string, { n: number; sum: number; hit: number }>();
  const avg = (v: { n: number; sum: number }) => (v.n > 0 ? v.sum / v.n : 0);
  const hitOf = (v: { n: number; hit: number }) => (v.n > 0 ? v.hit / v.n : 0);
  const tambah = (m: Map<string, { n: number; sum: number; hit: number }>, k: string, ret: number, hit: boolean) => {
    const v = m.get(k) ?? { n: 0, sum: 0, hit: 0 }; v.n++; v.sum += ret; v.hit += hit ? 1 : 0; m.set(k, v);
  };
  return {
    panen(regime: string, symbol: string, bucket3: string, direction: string, ret: number, hit: boolean) {
      tambah(eps, `E|${regime}|${symbol}|${direction}`, ret, hit);
      tambah(coarse, `P3|${regime}|${bucket3}|${direction}`, ret, hit);
      tambah(rez, `PR|${regime}|${direction}`, ret, hit);
    },
    edge(regimeStr: string, symbol: string, _b8: string, bucket3: string, direction: string): MemEdge {
      const e = eps.get(`E|${regimeStr}|${symbol}|${direction}`);
      if (e && e.n >= 2) return { level: "SIMBOL", n: e.n, edge: avg(e), hit: hitOf(e) };
      const c = coarse.get(`P3|${regimeStr}|${bucket3}|${direction}`);
      if (c && c.n >= 2) return { level: "BUCKET3", n: c.n, edge: avg(c), hit: hitOf(c) };
      const r = rez.get(`PR|${regimeStr}|${direction}`);
      if (r && r.n >= 4) return { level: "REZIM", n: r.n, edge: avg(r), hit: hitOf(r) };
      const best = [e, c].filter((x): x is { n: number; sum: number; hit: number } => !!x).sort((a, b) => b.n - a.n)[0];
      return best ? { level: "LEMAH", n: best.n, edge: avg(best) * 0.4, hit: hitOf(best) } : { level: "BARU", n: 0, edge: 0, hit: 0 };
    },
    size() { return { simbol: eps.size, bucket3: coarse.size, rezim: rez.size, episode: 0 }; },
  } as MemoryLookup & { panen(r: string, s: string, b3: string, d: string, ret: number, hit: boolean): void };
}

interface Vonis { day: string; symbol: string; dir: "BUY" | "SELL"; conf: number; ret: number; hit: boolean; era: "AWAL" | "AKHIR" }

async function main() {
  console.log("=== LAB PUTARAN-6 — VERIFIKASI PAKET V301 ===");
  const meta = await db.meta.findMany();
  let genome: GenomeV2 | null = null;
  for (const m of meta) if (m.key === "genomeV2") { try { genome = JSON.parse(m.value) as GenomeV2; } catch {} }
  const weightRows = await db.genomeState.findMany();
  const weightsPerRegime: Record<string, Weights> = {};
  for (const r of weightRows) { try { weightsPerRegime[r.regime] = JSON.parse(r.weights) as Weights; } catch {} }

  const universe = await getUniverse();
  const everPicked = await db.pick.findMany({ select: { symbol: true }, distinct: ["symbol"] });
  const poolSet = new Set<string>(universe.slice(0, 150).map((u) => u.symbol));
  for (const p of everPicked) poolSet.add(p.symbol);
  poolSet.add("BTCUSDT");
  const klines = await getKlinesBulk([...poolSet]);
  const btcAll = klines.get("BTCUSDT") ?? [];
  const klines4h = await getKlines4hBulk([...poolSet]);
  const live = btcAll[btcAll.length - 1];
  const allDays = btcAll.filter((c) => c.openTime < live.openTime).map((c) => dayOfTs(c.openTime)).filter((d) => d >= "2026-08-29");
  const batasEraAkhir = Math.max(0, allDays.length - 17);

  const ctxByDay = new Map<string, CtxLab>();
  for (const d of allDays) {
    const btcBefore = candlesBefore(btcAll, d);
    const uniSyms = dynamicUniverse(klines, d, UNIVERSE_SIZE);
    const factors: CoinFactors[] = []; const closes = new Map<string, number[]>(); const m4h = new Map<string, number>();
    const cutoff = dayOpenTs(d);
    for (const sym of uniSyms) {
      const before = candlesBefore(klines.get(sym) ?? [], d);
      if (before.length < 35) continue;
      const f = computeFactors(sym, before, btcBefore);
      if (f) { factors.push(f); closes.set(sym, before.map((c) => c.close)); m4h.set(sym, mom4hFrom(klines4h.get(sym), cutoff)); }
    }
    if (factors.length < 10) continue;
    const regime = await getRegime(btcBefore, closes);
    ctxByDay.set(d, { day: d, regime, factors, norm: rankNormalize(factors), closes, m4h });
  }

  const vonisAll: Vonis[] = [];
  const mem = buatMemori();
  let soal = 0;
  const dayIdxList = [...ctxByDay.keys()];
  for (let di = 0; di < dayIdxList.length; di++) {
    const d = dayIdxList[di];
    const ctx = ctxByDay.get(d)!;
    const era: "AWAL" | "AKHIR" = di >= batasEraAkhir ? "AKHIR" : "AWAL";
    const W: Weights = weightsPerRegime[ctx.regime.regime] ?? { mom7: 1.4, mom30: 0.6, emaAlign: 1.0, rsi: 0.4, volSurge: 0.9, atrInv: 0.35, distHigh: 0.8, btcCorr: 0.2 };
    const G: GenomeV2 = genome ?? { kBase: 3, paraK: 60, breadthK2: 45, breadthK1: 32, atrCap: 16, corrCap: 0.95, sellOn: false, anchorOn: true, minNorm: 0.5, m4hReject: 0, memVetoOn: true };
    const breadth = ctx.regime.breadth;

    const factorsV: CoinFactors[] = [];
    for (const f of ctx.factors) {
      const alasan = guardProduksi(f, breadth, ctx.regime.regime);
      if (!alasan) factorsV.push(f);
    }
    const out = decidePredator({
      factors: factorsV, norm: ctx.norm, universeCloses: ctx.closes, regime: ctx.regime,
      generation: 3, genome: G, weights: W, m4h: ctx.m4h, memory: mem,
    });
    const picked = new Set(out.picks.map((p) => p.symbol));
    const picks: { symbol: string; direction: "BUY" | "SELL"; confidence: number }[] =
      out.picks.map((p) => ({ symbol: p.symbol, direction: p.direction, confidence: p.confidence }));

    // MIN-3 pengisi
    if (picks.length < 3) {
      const urut = factorsV.filter((f) => !picked.has(f.symbol)).sort((a, b) => b.mom7 - a.mom7);
      for (const f of urut) {
        if (picks.length >= 3) break;
        if (f.atrPct > G.atrCap) continue;
        const cl = ctx.closes.get(f.symbol) ?? [];
        if (cl.length < 30) continue;
        let overlap = false;
        for (const b of picks) {
          const clp = ctx.closes.get(b.symbol) ?? [];
          if (clp.length >= 30 && Math.abs(corr(cl.slice(-30), clp.slice(-30))) > G.corrCap) { overlap = true; break; }
        }
        if (overlap) continue;
        const nrm = ctx.norm.get(f.symbol) ?? ({} as Record<FactorId, number>);
        const m4 = ctx.m4h.get(f.symbol) ?? 0;
        picks.push({ symbol: f.symbol, direction: "BUY", confidence: Math.max(35, Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4 >= 0 ? 4 : -6)))) });
        picked.add(f.symbol);
      }
    }

    // SELL-KETAT adaptif
    const nSell = breadth < 42 || ctx.regime.regime === "TREND_TURUN" || ctx.regime.regime === "JATUH" ? 2 : 0;
    if (nSell > 0) {
      const lemah = ctx.factors
        .filter((f) => !picked.has(f.symbol) && f.atrPct <= G.atrCap + 2)
        .filter((f) => f.emaAlign === -1 && f.mom7 < 0 && (ctx.m4h.get(f.symbol) ?? 0) < 0)
        .sort((a, b) => a.mom7 - b.mom7).slice(0, nSell);
      for (const f of lemah) { picks.push({ symbol: f.symbol, direction: "SELL", confidence: Math.max(40, Math.round(52 - f.mom7 * 1.2)) }); picked.add(f.symbol); }
    }

    for (const p of picks) {
      const closesS = ctx.closes.get(p.symbol) ?? [];
      const entry = closesS[closesS.length - 1];
      const exit = candleForDay(klines.get(p.symbol) ?? [], d)?.close ?? null;
      if (!Number.isFinite(entry) || exit === null) continue;
      let conf = p.confidence;
      if (breadth < 45) conf = Math.max(30, conf - 10);
      const f = ctx.factors.find((x) => x.symbol === p.symbol);
      if (f && f.rsi > 82 && f.mom7 > 40) conf = Math.max(30, conf - 6); // peringatan jenuh (bukan tolak)
      const raw = (exit - entry) / entry;
      const ret = p.direction === "SELL" ? -raw : raw;
      soal++;
      vonisAll.push({ day: d, symbol: p.symbol, dir: p.direction, conf, ret, hit: ret > 0, era });
      const b3 = coarseBucket(ctx.norm.get(p.symbol) ?? ({} as Record<FactorId, number>));
      mem.panen(ctx.regime.regime, p.symbol, b3, p.direction, ret, ret > 0);
    }
  }

  const n = vonisAll.length, hit = vonisAll.filter((x) => x.hit).length;
  const ret = vonisAll.reduce((a, x) => a + x.ret, 0) * 100;
  const akhir = vonisAll.filter((x) => x.era === "AKHIR");
  const awal = vonisAll.filter((x) => x.era === "AWAL");
  const worst = Math.min(...vonisAll.map((x) => x.ret)) * 100;
  const c65 = vonisAll.filter((x) => x.conf >= 65), cL = vonisAll.filter((x) => x.conf < 65);
  const h65 = c65.filter((x) => x.hit).length / Math.max(1, c65.length) * 100;
  const hL = cL.filter((x) => x.hit).length / Math.max(1, cL.length) * 100;
  console.log(`SOAL: ${soal} (kumulatif 6 putaran ≈ 5.700)`);
  console.log(`PAKET V301: hit ${(hit / n * 100).toFixed(1)}% | ret ${ret.toFixed(0)}% | hitAWAL ${(awal.filter(x=>x.hit).length/Math.max(1,awal.length)*100).toFixed(1)}% | hitAKHIR ${(akhir.filter(x=>x.hit).length/Math.max(1,akhir.length)*100).toFixed(1)}% | retAKHIR ${(akhir.reduce((a,x)=>a+x.ret,0)*100).toFixed(0)}% | worst ${worst.toFixed(1)}% | kalib h65-h<65 = ${(h65-hL).toFixed(1)} poin`);

  for (const tgl of ["2026-09-19", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]) {
    const rows = vonisAll.filter((x) => x.day === tgl);
    console.log(`--- ${tgl}: ${rows.map((x) => `${x.symbol.replace("USDT","")}${x.dir[0]}:${(x.ret * 100).toFixed(1)}%${x.hit ? "M" : "K"}`).join(" ") || "(kosong)"}`);
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync("/home/z/my-project/scripts/lab400f_hasil.json", JSON.stringify({ paket: "V301", vonis: vonisAll }));
  console.log("\nhasil → scripts/lab400f_hasil.json");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
