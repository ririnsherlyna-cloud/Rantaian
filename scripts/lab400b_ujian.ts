// ============================================================
// LAB TEMPa PUTARAN-2 — 400+ UJIAN KEDALAMAN
// Pelajaran putaran-1: guard permukaan TIDAK menyembuhkan era akhir (35.3%).
// Akar: antrian mom7 murni mengejar leader parabolik yang berbalik di pasar
// chop. Putaran-2 menguji PERUBAHAN CARA MEMILIH (bukan sekadar menolak):
//   • SWEETSPOT   — momentum kuat tapi TIDAK ekstrem (anti-chase parabolik)
//   • SEHAT       — wajib struktur EMA tidak rusak + mom30 tidak runtuh
//   • BELI-DIP    — antrian menghukum yang menempel puncak 60h (jarak dihitung)
//   • REZIM-CHILL — breadth sempit → wajib kualitas (RSI tidak jenuh, mom30 hidup)
//   • KOMBINASI   — lapisan penuh
// Semua varian MIN-3 (terbukti menaikkan ret 106% → 204%).
// ============================================================
import { PrismaClient } from "@prisma/client";
import {
  getUniverse, getKlinesBulk, getKlines4hBulk, mom4hFrom,
  dynamicUniverse, candlesBefore, candleForDay, dayOpenTs, dayOfTs,
  getRegime, corr,
  type Candle, type RegimeInfo,
} from "../src/lib/cyborg/market";
import { computeFactors, rankNormalize, coarseBucket, type CoinFactors, type FactorId } from "../src/lib/cyborg/factors";
import { decidePredator, type GenomeV2, type Weights, type MemoryLookup, type MemEdge } from "../src/lib/cyborg/brain";

const db = new PrismaClient();
const UNIVERSE_SIZE = 40;

interface CtxLab {
  day: string; regime: RegimeInfo; factors: CoinFactors[];
  norm: Map<string, Record<FactorId, number>>; closes: Map<string, number[]>; m4h: Map<string, number>;
}

interface Varian {
  id: string; desc: string;
  praFilter?: (f: CoinFactors, rg: RegimeInfo, breadth: number) => string | null;
  mom7Efektif?: (f: CoinFactors) => number;
}

// skor antrian sweet-spot: mom7≤cap → utuh; di atas cap → dilelehkan halus
const sweet = (cap: number, leleh: number) => (f: CoinFactors) =>
  f.mom7 <= cap ? f.mom7 : cap - (f.mom7 - cap) * leleh;

const VARIIAN: Varian[] = [
  { id: "B0-MIN3", desc: "baseline putaran-2 (= V1-MIN3 putaran-1)", },
  { id: "B1-SWEET40", desc: "antrian sweet-spot cap 40% (leleh 0.15)", mom7Efektif: sweet(40, 0.15) },
  { id: "B2-SWEET25", desc: "antrian sweet-spot cap 25% (leleh 0.25)", mom7Efektif: sweet(25, 0.25) },
  { id: "B3-SEHAT", desc: "wajib struktur sehat (emaAlign>=0 & mom30>-3 & distHigh<-2)", praFilter: (f) => (f.emaAlign < 0 || f.mom30 < -3 || f.distHigh >= -2 ? "struktur tidak sehat" : null) },
  { id: "B4-SWEET25+SEHAT", desc: "sweet-spot 25 + struktur sehat", mom7Efektif: sweet(25, 0.25), praFilter: (f) => (f.emaAlign < 0 || f.mom30 < -3 || f.distHigh >= -2 ? "struktur tidak sehat" : null) },
  { id: "B5-BELIDIP", desc: "antrian menghukum dekat puncak: mom7 - max(0,distHigh+12)*0.55", mom7Efektif: (f) => f.mom7 - Math.max(0, f.distHigh + 12) * 0.55 },
  { id: "B6-SWEET+SEHAT+CHILL", desc: "B4 + breadth<45 wajib RSI 35-70 & mom30>0", mom7Efektif: sweet(25, 0.25), praFilter: (f, _rg, br) => {
      if (f.emaAlign < 0 || f.mom30 < -3 || f.distHigh >= -2) return "struktur tidak sehat";
      if (br < 45 && !(f.rsi >= 35 && f.rsi <= 70 && f.mom30 > 0)) return "pasar sempit, wajib kualitas";
      return null; } },
  { id: "B7-SWEET+SEHAT+CHILL+BTC", desc: "B6 + rezim BTC turun wajib mom7>=0", mom7Efektif: sweet(25, 0.25), praFilter: (f, rg, br) => {
      if (f.emaAlign < 0 || f.mom30 < -3 || f.distHigh >= -2) return "struktur tidak sehat";
      if (br < 45 && !(f.rsi >= 35 && f.rsi <= 70 && f.mom30 > 0)) return "pasar sempit, wajib kualitas";
      if ((rg.regime === "TREND_TURUN" || rg.regime === "JATUH") && f.mom7 < 0) return "BTC turun, wajib momentum positif";
      return null; } },
];

function buatMemori(): MemoryLookup & { panen(r: string, s: string, b3: string, d: string, ret: number, hit: boolean): void } {
  const eps = new Map<string, { n: number; sum: number; hit: number }>();
  const coarse = new Map<string, { n: number; sum: number; hit: number }>();
  const rez = new Map<string, { n: number; sum: number; hit: number }>();
  const avg = (v: { n: number; sum: number }) => (v.n > 0 ? v.sum / v.n : 0);
  const hitOf = (v: { n: number; hit: number }) => (v.n > 0 ? v.hit / v.n : 0);
  const tambah = (m: Map<string, { n: number; sum: number; hit: number }>, k: string, ret: number, hit: boolean) => {
    const v = m.get(k) ?? { n: 0, sum: 0, hit: 0 };
    v.n++; v.sum += ret; v.hit += hit ? 1 : 0; m.set(k, v);
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

interface Vonis { day: string; symbol: string; dir: "BUY" | "SELL"; conf: number; ret: number; hit: boolean; era: "AWAL" | "AKHIR"; viaIsi: boolean }

async function main() {
  console.log("=== LAB TEMPa PUTARAN-2 — KEDALAMAN (400+ UJIAN) ===");
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
  console.log(`pool ${symbols.length} simbol...`);
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

    for (const v of VARIIAN) {
      const mem = hasil.get(v.id)!.mem;
      const factorsV: CoinFactors[] = [];
      for (const f of ctx.factors) {
        const alasan = v.praFilter?.(f, ctx.regime, breadth);
        if (!alasan) factorsV.push(f);
      }
      const factorsForBrain = v.mom7Efektif ? factorsV.map((f) => ({ ...f, mom7: v.mom7Efektif!(f) })) : factorsV;
      const out = decidePredator({
        factors: factorsForBrain, norm: ctx.norm, universeCloses: ctx.closes, regime: ctx.regime,
        generation: 3, genome: G, weights: W, m4h: ctx.m4h, memory: mem,
      });
      const picked = new Set(out.picks.map((p) => p.symbol));
      const picks = [...out.picks.map((p) => ({ ...p, viaIsi: false }))];

      // pengisi MIN-3 dari antrian ASLI (bukan mom7 efektif) yang lolos pra-filter
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
          picks.push({
            symbol: f.symbol, direction: "BUY",
            confidence: Math.max(35, Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4 >= 0 ? 4 : -6)))),
            score: 0, viaIsi: true,
            evidence: { factors: nrm as unknown as Record<string, number>, topReasons: ["PENGISI SLOT MIN-3"], duties: [], policy: [], regime: ctx.regime.regime, genomeGeneration: 3 },
          });
          picked.add(f.symbol);
        }
      }

      for (const p of picks) {
        const closesS = ctx.closes.get(p.symbol) ?? [];
        const entry = closesS[closesS.length - 1];
        const exit = candleForDay(klines.get(p.symbol) ?? [], d)?.close ?? null;
        if (!Number.isFinite(entry) || exit === null) continue;
        const ret = (exit - entry) / entry;
        soal++;
        hasil.get(v.id)!.vonis.push({ day: d, symbol: p.symbol, dir: p.direction, conf: p.confidence, ret, hit: ret > 0, era, viaIsi: p.viaIsi });
        const b3 = coarseBucket(ctx.norm.get(p.symbol) ?? ({} as Record<FactorId, number>));
        mem.panen(ctx.regime.regime, p.symbol, b3, p.direction, ret, ret > 0);
      }
    }
  }

  console.log(`\nTOTAL SOAL VONIS: ${soal} (${VARIIAN.length} varian × ${dayIdxList.length} hari)`);
  console.log("varian                     n   hit%   ret%   hitAKHIR%  retAKHIR%  hitAWAL%  streak  conf65%  conf<65%  n>=3%");
  const skor = [];
  for (const v of VARIIAN) {
    const vs = hasil.get(v.id)!.vonis;
    const n = vs.length, hit = vs.filter((x) => x.hit).length;
    const ret = vs.reduce((a, x) => a + x.ret, 0) * 100;
    const akhir = vs.filter((x) => x.era === "AKHIR"), awal = vs.filter((x) => x.era === "AWAL");
    const hitA = akhir.length ? akhir.filter((x) => x.hit).length / akhir.length * 100 : NaN;
    const retA = akhir.reduce((a, x) => a + x.ret, 0) * 100;
    const hitW = awal.length ? awal.filter((x) => x.hit).length / awal.length * 100 : NaN;
    const perDay = new Map<string, boolean>();
    for (const x of vs) perDay.set(x.day, (perDay.get(x.day) ?? false) || x.hit);
    let streak = 0, maxStreak = 0;
    for (const dd of [...perDay.keys()].sort()) { if (perDay.get(dd)) streak = 0; else { streak++; maxStreak = Math.max(maxStreak, streak); } }
    const c65 = vs.filter((x) => x.conf >= 65), cL = vs.filter((x) => x.conf < 65);
    const h65 = c65.length ? c65.filter((x) => x.hit).length / c65.length * 100 : NaN;
    const hL = cL.length ? cL.filter((x) => x.hit).length / cL.length * 100 : NaN;
    const cnt = new Map<string, number>();
    for (const x of vs) cnt.set(x.day, (cnt.get(x.day) ?? 0) + 1);
    const min3ok = [...cnt.values()].filter((n2) => n2 >= 3).length / cnt.size * 100;
    console.log(`${v.id.padEnd(26)} ${String(n).padStart(3)} ${(hit/n*100).toFixed(1).padStart(6)} ${ret.toFixed(0).padStart(7)} ${hitA.toFixed(1).padStart(9)} ${retA.toFixed(1).padStart(9)} ${hitW.toFixed(1).padStart(9)} ${String(maxStreak).padStart(6)} ${h65.toFixed(1).padStart(7)} ${hL.toFixed(1).padStart(9)} ${min3ok.toFixed(0).padStart(6)}`);
    skor.push({ id: v.id, hitA, retA, total: hit / n, ret, kal: (h65 ?? 0) - (hL ?? 100), n });
  }

  // vonis era akhir varian terbaik
  const juara = [...skor].sort((a, b) => (b.hitA * 2 + b.total + Math.min(2, b.retA / 100)) - (a.hitA * 2 + a.total + Math.min(2, a.retA / 100)))[0];
  console.log(`\nJUARA PUTARAN-2: ${juara.id} (hitAkhir ${juara.hitA.toFixed(1)}%, retAkhir ${juara.retA.toFixed(1)}%)`);
  console.log("\n=== VONIS HARI 11-14 (juara) — pembanding tragedi ===");
  for (const x of hasil.get(juara.id)!.vonis.filter((x) => x.day >= "2026-10-11"))
    console.log(`${x.day} ${x.symbol.replace("USDT","")} ${x.dir} conf=${x.conf} ret=${(x.ret*100).toFixed(1)}% ${x.hit ? "MENANG" : "KALAH"}${x.viaIsi ? " [isi]" : ""}`);

  const { writeFileSync } = await import("node:fs");
  const dump = VARIIAN.map((v) => ({ id: v.id, desc: v.desc, vonis: hasil.get(v.id)!.vonis }));
  writeFileSync("/home/z/my-project/scripts/lab400b_hasil.json", JSON.stringify(dump));
  console.log(`\nselesai ${((Date.now()-t0)/1000).toFixed(0)} dtk → scripts/lab400b_hasil.json`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
