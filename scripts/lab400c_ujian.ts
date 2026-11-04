// ============================================================
// LAB TEMPa PUTARAN-3 — MANAJEMEN ARAH (400+ UJIAN)
// Pelajaran putaran-1&2 (2.499 soal): pemilihan kandidat bukan akarnya.
// Era akhir = altcoin turun massal; mesin BUY-only tak mungkin menang.
// Putaran-3 menguji: SELL slot adaptif saat breadth sempit/rezim turun.
//   ret SELL = (exit-entry)/entry × (-1) — untung saat harga turun.
// Semua varian tetap MIN-3 koin (mandat pemilik).
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

interface CtxLab { day: string; regime: { regime: string; breadth: number } & Awaited<ReturnType<typeof getRegime>>; factors: CoinFactors[]; norm: Map<string, Record<FactorId, number>>; closes: Map<string, number[]>; m4h: Map<string, number> }

interface Varian {
  id: string; desc: string;
  buyFilter?: (f: CoinFactors) => string | null;
  sellN: (breadth: number, regime: string, m4hMed: number) => number; // jumlah slot SELL
}

const VARIIAN: Varian[] = [
  { id: "C0-BUY3", desc: "baseline BUY-3 (pembanding)", sellN: () => 0 },
  { id: "C1-SELL2-TURUN", desc: "breadth<40/rezim turun → 1 BUY + 2 SELL terlemah", sellN: (br, rg) => (br < 40 || rg === "TREND_TURUN" || rg === "JATUH" ? 2 : 0) },
  { id: "C2-SELL-KETAT", desc: "SELL wajib m4h<0 & emaAlign=-1 & mom7<0", sellN: (br, rg) => (br < 42 || rg === "TREND_TURUN" || rg === "JATUH" ? 2 : 0), },
  { id: "C3-ADAPTIF", desc: "br>=50:3 BUY · 40-50:2B+1S · <40:1B+2S", sellN: (br) => (br >= 50 ? 0 : br >= 40 ? 1 : 2) },
  { id: "C4-ADAPTIF+SEHAT", desc: "C3 + BUY wajib struktur sehat", sellN: (br) => (br >= 50 ? 0 : br >= 40 ? 1 : 2), buyFilter: (f) => (f.emaAlign < 0 || f.mom30 < -3 || f.distHigh >= -2 ? "struktur tidak sehat" : null) },
  { id: "C5-SELL-KETAT+SEHAT", desc: "C2 + BUY wajib struktur sehat", sellN: (br, rg) => (br < 42 || rg === "TREND_TURUN" || rg === "JATUH" ? 2 : 0), buyFilter: (f) => (f.emaAlign < 0 || f.mom30 < -3 || f.distHigh >= -2 ? "struktur tidak sehat" : null) },
];

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
  console.log("=== LAB TEMPa PUTARAN-3 — MANAJEMEN ARAH ===");
  const t0 = Date.now();

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
  const symbols = [...poolSet];
  const klines = await getKlinesBulk(symbols);
  const btcAll = klines.get("BTCUSDT") ?? [];
  const klines4h = await getKlines4hBulk(symbols);
  const live = btcAll[btcAll.length - 1];
  const allDays = btcAll.filter((c) => c.openTime < live.openTime).map((c) => dayOfTs(c.openTime)).filter((d) => d >= "2026-08-29");
  console.log(`hari diadili: ${allDays.length} (${allDays[0]}..${allDays[allDays.length-1]})`);

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

  const hasil = new Map<string, { vonis: Vonis[]; mem: ReturnType<typeof buatMemori> }>();
  for (const v of VARIIAN) hasil.set(v.id, { vonis: [], mem: buatMemori() });

  let soal = 0;
  const dayIdxList = [...ctxByDay.keys()];
  for (let di = 0; di < dayIdxList.length; di++) {
    const d = dayIdxList[di];
    const ctx = ctxByDay.get(d)!;
    const era: "AWAL" | "AKHIR" = di >= batasEraAkhir ? "AKHIR" : "AWAL";
    const W: Weights = weightsPerRegime[ctx.regime.regime] ?? { mom7: 1.4, mom30: 0.6, emaAlign: 1.0, rsi: 0.4, volSurge: 0.9, atrInv: 0.35, distHigh: 0.8, btcCorr: 0.2 };
    const G: GenomeV2 = genome ?? { kBase: 3, paraK: 60, breadthK2: 45, breadthK1: 32, atrCap: 16, corrCap: 0.95, sellOn: false, anchorOn: true, minNorm: 0.5, m4hReject: 0, memVetoOn: true };
    const breadth = ctx.regime.breadth;
    const m4vals = [...ctx.m4h.values()].sort((a, b) => a - b);
    const m4hMed = m4vals.length ? m4vals[Math.floor(m4vals.length / 2)] : 0;

    for (const v of VARIIAN) {
      const mem = hasil.get(v.id)!.mem;
      const factorsBuy: CoinFactors[] = [];
      for (const f of ctx.factors) {
        const alasan = v.buyFilter?.(f);
        if (!alasan) factorsBuy.push(f);
      }
      const out = decidePredator({
        factors: factorsBuy, norm: ctx.norm, universeCloses: ctx.closes, regime: ctx.regime,
        generation: 3, genome: G, weights: W, m4h: ctx.m4h, memory: mem,
      });
      const picked = new Set(out.picks.map((p) => p.symbol));
      const picks: { symbol: string; direction: "BUY" | "SELL"; confidence: number; viaIsi: boolean }[] =
        out.picks.map((p) => ({ symbol: p.symbol, direction: p.direction, confidence: p.confidence, viaIsi: false }));

      // pengisi BUY MIN-3-kurangi-SLOT-SELL
      const target = 3;
      const nSell = v.sellN(breadth, ctx.regime.regime, m4hMed);
      if (picks.length < target) {
        const urut = factorsBuy.filter((f) => !picked.has(f.symbol)).sort((a, b) => b.mom7 - a.mom7);
        for (const f of urut) {
          if (picks.length >= target - nSell) break;
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
          picks.push({ symbol: f.symbol, direction: "BUY", confidence: Math.max(35, Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4 >= 0 ? 4 : -6)))), viaIsi: true });
          picked.add(f.symbol);
        }
      }

      // slot SELL — kandidat terlemah: mom7 paling negatif, struktur rusak
      if (nSell > 0) {
        const lemah = ctx.factors
          .filter((f) => !picked.has(f.symbol) && f.atrPct <= G.atrCap + 2)
          .filter((f) => (v.id === "C2-SELL-KETAT" || v.id === "C5-SELL-KETAT+SEHAT")
            ? (f.emaAlign === -1 && f.mom7 < 0 && (ctx.m4h.get(f.symbol) ?? 0) < 0)
            : (f.mom7 < 0 && f.emaAlign === -1))
          .sort((a, b) => a.mom7 - b.mom7)
          .slice(0, nSell);
        for (const f of lemah) {
          picks.push({ symbol: f.symbol, direction: "SELL", confidence: Math.max(40, Math.round(52 - f.mom7 * 1.2)), viaIsi: false });
          picked.add(f.symbol);
        }
      }

      for (const p of picks) {
        const closesS = ctx.closes.get(p.symbol) ?? [];
        const entry = closesS[closesS.length - 1];
        const exit = candleForDay(klines.get(p.symbol) ?? [], d)?.close ?? null;
        if (!Number.isFinite(entry) || exit === null) continue;
        const raw = (exit - entry) / entry;
        const ret = p.direction === "SELL" ? -raw : raw;
        soal++;
        hasil.get(v.id)!.vonis.push({ day: d, symbol: p.symbol, dir: p.direction, conf: p.confidence, ret, hit: ret > 0, era });
        const b3 = coarseBucket(ctx.norm.get(p.symbol) ?? ({} as Record<FactorId, number>));
        mem.panen(ctx.regime.regime, p.symbol, b3, p.direction, ret, ret > 0);
      }
    }
  }

  console.log(`\nTOTAL SOAL VONIS: ${soal} (${VARIIAN.length} varian × ${dayIdxList.length} hari)`);
  console.log("varian                  n   hit%   ret%   hitAKHIR%  retAKHIR%  streak  n>=3%");
  for (const v of VARIIAN) {
    const vs = hasil.get(v.id)!.vonis;
    const n = vs.length, hit = vs.filter((x) => x.hit).length;
    const ret = vs.reduce((a, x) => a + x.ret, 0) * 100;
    const akhir = vs.filter((x) => x.era === "AKHIR");
    const hitA = akhir.length ? akhir.filter((x) => x.hit).length / akhir.length * 100 : NaN;
    const retA = akhir.reduce((a, x) => a + x.ret, 0) * 100;
    const perDay = new Map<string, boolean>();
    for (const x of vs) perDay.set(x.day, (perDay.get(x.day) ?? false) || x.hit);
    let streak = 0, maxStreak = 0;
    for (const dd of [...perDay.keys()].sort()) { if (perDay.get(dd)) streak = 0; else { streak++; maxStreak = Math.max(maxStreak, streak); } }
    const cnt = new Map<string, number>();
    for (const x of vs) cnt.set(x.day, (cnt.get(x.day) ?? 0) + 1);
    const min3ok = [...cnt.values()].filter((n2) => n2 >= 3).length / cnt.size * 100;
    console.log(`${v.id.padEnd(23)} ${String(n).padStart(3)} ${(hit/n*100).toFixed(1).padStart(6)} ${ret.toFixed(0).padStart(7)} ${hitA.toFixed(1).padStart(9)} ${retA.toFixed(1).padStart(9)} ${String(maxStreak).padStart(6)} ${min3ok.toFixed(0).padStart(6)}`);
  }

  // detail era akhir varian terbaik
  const skorHitA = VARIIAN.map((v) => {
    const vs = hasil.get(v.id)!.vonis.filter((x) => x.era === "AKHIR");
    return { id: v.id, hitA: vs.filter((x) => x.hit).length / Math.max(1, vs.length) * 100, retA: vs.reduce((a, x) => a + x.ret, 0) * 100 };
  }).sort((a, b) => (b.hitA * 2 + Math.min(2, b.retA / 100)) - (a.hitA * 2 + Math.min(2, a.retA / 100)));
  const juara = skorHitA[0];
  console.log(`\nJUARA PUTARAN-3 (era akhir): ${juara.id} hitAkhir=${juara.hitA.toFixed(1)}% retAkhir=${juara.retA.toFixed(1)}%`);
  console.log("\n=== VONIS HARI 11-14 (juara) ===");
  for (const x of hasil.get(juara.id)!.vonis.filter((x) => x.day >= "2026-10-11"))
    console.log(`${x.day} ${x.symbol.replace("USDT","")} ${x.dir} conf=${x.conf} ret=${(x.ret*100).toFixed(1)}% ${x.hit ? "MENANG" : "KALAH"}`);

  const { writeFileSync } = await import("node:fs");
  writeFileSync("/home/z/my-project/scripts/lab400c_hasil.json", JSON.stringify(VARIIAN.map((v) => ({ id: v.id, desc: v.desc, vonis: hasil.get(v.id)!.vonis }))));
  console.log(`\nselesai ${((Date.now()-t0)/1000).toFixed(0)} dtk → scripts/lab400c_hasil.json`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
